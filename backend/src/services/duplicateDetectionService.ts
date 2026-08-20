import { prisma } from '../prisma/client';
import { sysLog } from './logger';
import { hammingDistance } from './imageHashService';

// ── Configurable thresholds ──────────────────────────────────────────────
const MATCH_STORE_FLOOR = 25;      // don't persist matches scoring below this — avoids table bloat
const STAFF_REVIEW_THRESHOLD = 50; // notify verification staff
const REPORTER_DISCLOSURE_THRESHOLD = 40; // show the reporter a safe disclosure panel
const CANDIDATE_LIMIT = 25;        // bound the pre-filter candidate set
const GPS_BOX_DEGREES = 0.045;     // ~5km bounding box for the cheap pre-filter (haversine narrows it after)

export interface MediaHashInput {
  caseMediaId: string;
  type: string; // 'image' | 'document' | ...
  sha256: string;
  perceptualHash: string | null;
}

export interface MatchReason { signal: string; points: number; detail: string }

export interface CandidateCase {
  id: string; caseRef: string | null; reporterId: string | null; category: string;
  privateVictimPhone: string | null; privateGpsLat: number | null; privateGpsLng: number | null;
  privateFamilySize: number | null; privateDescription: string | null; createdAt: Date;
  status: string; publicCity: string | null;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/** Deterministic fallback: token-overlap cosine similarity, 0-100. No dependency, always available. */
function deterministicTextSimilarity(a: string, b: string): number {
  const tokenize = (s: string) => (s.toLowerCase().match(/[a-z0-9]+/g) || []);
  const freq = (tokens: string[]) => {
    const m = new Map<string, number>();
    for (const t of tokens) m.set(t, (m.get(t) || 0) + 1);
    return m;
  };
  const fa = freq(tokenize(a));
  const fb = freq(tokenize(b));
  if (fa.size === 0 || fb.size === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (const [tok, count] of fa) { magA += count * count; if (fb.has(tok)) dot += count * (fb.get(tok) as number); }
  for (const count of fb.values()) magB += count * count;
  if (magA === 0 || magB === 0) return 0;
  return Math.round((dot / (Math.sqrt(magA) * Math.sqrt(magB))) * 100);
}

/**
 * Claude-assisted description similarity for a batch of candidates in one call (bounded —
 * only called for candidates that already scored structural points, never the whole table).
 * Falls back to the deterministic method per-candidate on missing key / any failure, so a
 * case submission is never blocked or slowed by an AI outage.
 */
async function scoreDescriptionSimilarity(
  newDescription: string,
  candidates: { id: string; description: string }[]
): Promise<Map<string, number>> {
  const results = new Map<string, number>();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const usable = candidates.filter(c => c.description && c.description.trim().length > 0);
  if (!newDescription?.trim() || usable.length === 0) return results;

  if (!apiKey) {
    for (const c of usable) results.set(c.id, deterministicTextSimilarity(newDescription, c.description));
    return results;
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });
    const prompt = `You compare humanitarian aid case descriptions to flag likely duplicates for a verification team (not the public). Two reports can describe the SAME situation using completely different wording.

NEW REPORT:
"${newDescription}"

CANDIDATE REPORTS (id: text):
${usable.map(c => `${c.id}: "${c.description}"`).join('\n')}

For each candidate id, score 0-100 how likely it describes the SAME situation/beneficiary as the new report (not just the same topic/category — e.g. two unrelated food-aid requests should score low).

Respond with ONLY valid JSON, no markdown: { "scores": { "<id>": <0-100>, ... } }`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI returned no JSON');
    const parsed = JSON.parse(match[0]);
    for (const c of usable) {
      const score = Number(parsed.scores?.[c.id]);
      results.set(c.id, Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : deterministicTextSimilarity(newDescription, c.description));
    }
    return results;
  } catch (err: any) {
    sysLog.warn(`Description similarity: Claude call failed, using deterministic fallback — ${err.message}`);
    for (const c of usable) results.set(c.id, deterministicTextSimilarity(newDescription, c.description));
    return results;
  }
}

class DuplicateDetectionService {
  /**
   * Run duplicate detection for a just-created case against all prior cases (any status —
   * a completed or rejected case can still be the same situation resurfacing). Persists
   * DuplicateCaseMatch rows for anything scoring >= MATCH_STORE_FLOOR, updates the new
   * case's denormalized duplicateScore, and notifies staff/reporter as appropriate.
   * Runs synchronously inside the POST /api/cases request — bounded candidate set keeps
   * it fast (no background queue; see plan for why that's the right call on Vercel).
   */
  async detect(newCase: CandidateCase, media: MediaHashInput[]): Promise<{ topScore: number; disclosure: any | null }> {
    return this.run(newCase, media, true);
  }

  /**
   * Lightweight preview for POST /cases/check-duplicates — same structural + description
   * scoring, but against a draft that isn't a real Case row yet, so nothing is persisted
   * (no DuplicateCaseMatch rows, no notifications, no Case.duplicateScore update).
   */
  async previewOnly(draftCase: CandidateCase): Promise<{ topScore: number; disclosure: any | null }> {
    return this.run(draftCase, [], false);
  }

  private async run(newCase: CandidateCase, media: MediaHashInput[], persist: boolean): Promise<{ topScore: number; disclosure: any | null }> {
    const imageHashes = media.filter(m => m.type === 'image');
    const docHashes = media.filter(m => m.type !== 'image');

    // ── Candidate pre-filter (cheap, indexed OR'd conditions) ──
    const gpsBox = (newCase.privateGpsLat != null && newCase.privateGpsLng != null) ? {
      privateGpsLat: { gte: newCase.privateGpsLat - GPS_BOX_DEGREES, lte: newCase.privateGpsLat + GPS_BOX_DEGREES },
      privateGpsLng: { gte: newCase.privateGpsLng - GPS_BOX_DEGREES, lte: newCase.privateGpsLng + GPS_BOX_DEGREES },
    } : undefined;

    const mediaMatchIds = imageHashes.length || docHashes.length
      ? (await prisma.mediaFingerprint.findMany({
          where: {
            OR: [
              ...(media.map(m => ({ sha256: m.sha256 }))),
              ...(imageHashes.filter(m => m.perceptualHash).map(m => ({ perceptualHash: m.perceptualHash as string }))),
            ],
          },
          select: { media: { select: { caseId: true } } },
        })).map(f => f.media.caseId)
      : [];

    const orConditions: any[] = [
      newCase.reporterId ? { reporterId: newCase.reporterId } : undefined,
      newCase.privateVictimPhone ? { privateVictimPhone: newCase.privateVictimPhone } : undefined,
      gpsBox,
      { category: newCase.category, createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
      mediaMatchIds.length ? { id: { in: mediaMatchIds } } : undefined,
    ].filter(Boolean);

    const candidates = orConditions.length === 0 ? [] : await prisma.case.findMany({
      where: { id: { not: newCase.id }, OR: orConditions },
      select: {
        id: true, caseRef: true, reporterId: true, category: true, privateVictimPhone: true,
        privateGpsLat: true, privateGpsLng: true, privateFamilySize: true, privateDescription: true,
        createdAt: true, status: true, publicCity: true,
      },
      orderBy: { createdAt: 'desc' },
      take: CANDIDATE_LIMIT,
    });

    if (candidates.length === 0) return { topScore: 0, disclosure: null };

    // Description similarity for all candidates (structural pre-filter already narrowed the set)
    const descScores = newCase.privateDescription
      ? await scoreDescriptionSimilarity(newCase.privateDescription, candidates.map(c => ({ id: c.id, description: c.privateDescription || '' })))
      : new Map<string, number>();

    // Pull media fingerprints for candidates (for image/document match scoring)
    const candidateMedia = await prisma.mediaFingerprint.findMany({
      where: { media: { caseId: { in: candidates.map(c => c.id) } } },
      select: { sha256: true, perceptualHash: true, media: { select: { caseId: true, type: true } } },
    });

    let topScore = 0;
    let topMatch: { caseRef: string | null; category: string; publicCity: string | null; status: string; createdAt: Date; score: number } | null = null;

    for (const cand of candidates) {
      const reasons: MatchReason[] = [];
      let score = 0;

      if (newCase.reporterId && cand.reporterId === newCase.reporterId) {
        score += 15; reasons.push({ signal: 'reporter', points: 15, detail: 'Same reporter account' });
      }
      if (newCase.privateVictimPhone && cand.privateVictimPhone === newCase.privateVictimPhone) {
        score += 20; reasons.push({ signal: 'phone', points: 20, detail: 'Same beneficiary phone number' });
      }
      if (newCase.privateGpsLat != null && newCase.privateGpsLng != null && cand.privateGpsLat != null && cand.privateGpsLng != null) {
        const dist = haversineMeters(newCase.privateGpsLat, newCase.privateGpsLng, cand.privateGpsLat, cand.privateGpsLng);
        if (dist <= 50) { score += 15; reasons.push({ signal: 'gps', points: 15, detail: `GPS within ${Math.round(dist)}m` }); }
        else if (dist <= 200) { score += 10; reasons.push({ signal: 'gps', points: 10, detail: `GPS within ${Math.round(dist)}m` }); }
        else if (dist <= 1000) { score += 5; reasons.push({ signal: 'gps', points: 5, detail: `GPS within ${Math.round(dist)}m` }); }
      }
      if (cand.category === newCase.category) {
        score += 5; reasons.push({ signal: 'category', points: 5, detail: `Same category: ${newCase.category}` });
      }
      const descScore = descScores.get(cand.id) || 0;
      if (descScore > 0) {
        const pts = Math.round((descScore / 100) * 15);
        if (pts > 0) { score += pts; reasons.push({ signal: 'description', points: pts, detail: `Description similarity: ${descScore}%` }); }
      }
      if (newCase.privateFamilySize != null && cand.privateFamilySize === newCase.privateFamilySize) {
        score += 5; reasons.push({ signal: 'household', points: 5, detail: `Same family size: ${newCase.privateFamilySize}` });
      }

      // Image / document fingerprint matches for this candidate
      const candFiles = candidateMedia.filter(f => f.media.caseId === cand.id);
      let bestImagePts = 0, bestImageDetail = '';
      let bestDocPts = 0, bestDocDetail = '';
      for (const newFile of media) {
        for (const candFile of candFiles) {
          if (newFile.sha256 === candFile.sha256) {
            if (newFile.type === 'image' && 20 > bestImagePts) { bestImagePts = 20; bestImageDetail = 'Exact image match (identical file)'; }
            if (newFile.type !== 'image' && 10 > bestDocPts) { bestDocPts = 10; bestDocDetail = 'Exact document match (identical file)'; }
          } else if (newFile.type === 'image' && newFile.perceptualHash && candFile.perceptualHash) {
            const dist = hammingDistance(newFile.perceptualHash, candFile.perceptualHash);
            if (dist <= 0.10 && 10 > bestImagePts) { bestImagePts = 10; bestImageDetail = `Likely image match (${Math.round((1 - dist) * 100)}% visually similar)`; }
            else if (dist <= 0.20 && 5 > bestImagePts) { bestImagePts = 5; bestImageDetail = `Possible image similarity (${Math.round((1 - dist) * 100)}% visually similar)`; }
          }
        }
      }
      if (bestImagePts) { score += bestImagePts; reasons.push({ signal: 'image', points: bestImagePts, detail: bestImageDetail }); }
      if (bestDocPts) { score += bestDocPts; reasons.push({ signal: 'document', points: bestDocPts, detail: bestDocDetail }); }

      const daysApart = Math.abs(newCase.createdAt.getTime() - cand.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysApart <= 7) { score += 5; reasons.push({ signal: 'date', points: 5, detail: 'Submitted within 7 days of each other' }); }
      else if (daysApart <= 30) { score += 3; reasons.push({ signal: 'date', points: 3, detail: 'Submitted within 30 days of each other' }); }
      else if (daysApart <= 90) { score += 1; reasons.push({ signal: 'date', points: 1, detail: 'Submitted within 90 days of each other' }); }

      score = Math.min(100, score);
      if (score < MATCH_STORE_FLOOR) continue;

      if (persist) {
        await prisma.duplicateCaseMatch.create({
          data: {
            newCaseId: newCase.id,
            existingCaseId: cand.id,
            similarityScore: score,
            matchReasons: JSON.stringify(reasons),
          },
        });
      }

      if (score > topScore) {
        topScore = score;
        topMatch = { caseRef: cand.caseRef, category: cand.category, publicCity: cand.publicCity, status: cand.status, createdAt: cand.createdAt, score };
      }
    }

    if (persist && topScore > 0) {
      await prisma.case.update({ where: { id: newCase.id }, data: { duplicateScore: topScore } });
    }

    if (persist && topScore >= STAFF_REVIEW_THRESHOLD) {
      const staff = await prisma.user.findMany({ where: { role: { in: ['admin', 'super_admin', 'verification_office'] }, isActive: true }, select: { id: true } });
      await prisma.notification.createMany({
        data: staff.map(u => ({
          userId: u.id, caseId: newCase.id, type: 'duplicate_review_needed',
          title: '⚠️ Possible Duplicate Case',
          message: `New case ${newCase.caseRef || newCase.id} scored ${topScore}% similar to an existing case${topMatch?.caseRef ? ` (${topMatch.caseRef})` : ''}. Review in the Duplicate & Risk Center.`,
        })),
      });
      sysLog.info(`⚠️ Duplicate detected: case ${newCase.id} scored ${topScore}% against ${topMatch?.caseRef || 'existing case'}`);
    }

    const disclosure = topScore >= REPORTER_DISCLOSURE_THRESHOLD && topMatch ? {
      score: topScore,
      category: topMatch.category,
      approxArea: topMatch.publicCity || 'Somalia',
      approxDate: topMatch.createdAt.toISOString().slice(0, 10),
      status: topMatch.status,
    } : null;

    return { topScore, disclosure };
  }
}

export const duplicateDetectionService = new DuplicateDetectionService();
