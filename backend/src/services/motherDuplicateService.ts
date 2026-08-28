import { prisma } from '../prisma/client';

// Lightweight duplicate scoring for mother registrations — deliberately no AI call and
// no image fingerprinting (unlike duplicateDetectionService.ts for Cases): the signals
// available here (National ID, phone, name, DOB, location) are strong enough on their
// own, and this workflow doesn't have photo evidence to fingerprint at submission time.
// Always a confirmation step, never a hard block — see spec §10.

export interface MotherDraft {
  fullName: string;
  phone: string;
  nationalId?: string | null;
  dateOfBirth?: string | Date | null;
  region: string;
  district: string;
  village?: string | null;
}

export interface DuplicateMatch {
  motherId: string;
  regNumber: string;
  fullName: string;
  score: number;
  reasons: string[];
}

const CANDIDATE_LIMIT = 25;
export const MATCH_STORE_FLOOR = 20;
export const CONFIRMATION_THRESHOLD = 35;
export const STRONG_MATCH_THRESHOLD = 60;

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function tokenSetSimilarity(a: string, b: string): number {
  const ta = new Set(normalizeName(a).split(/\s+/).filter(Boolean));
  const tb = new Set(normalizeName(b).split(/\s+/).filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  return overlap / Math.max(ta.size, tb.size);
}

function sameDay(a?: string | Date | null, b?: string | Date | null): boolean {
  if (!a || !b) return false;
  const da = new Date(a), db = new Date(b);
  return da.toISOString().slice(0, 10) === db.toISOString().slice(0, 10);
}

async function findCandidates(draft: MotherDraft, excludeId?: string) {
  const or: any[] = [{ phone: draft.phone }];
  if (draft.nationalId) or.push({ nationalId: draft.nationalId });
  if (draft.region && draft.district) or.push({ region: draft.region, district: draft.district });

  return prisma.mother.findMany({
    where: { OR: or, ...(excludeId && { id: { not: excludeId } }) },
    take: CANDIDATE_LIMIT,
    orderBy: { createdAt: 'desc' },
  });
}

function score(draft: MotherDraft, candidate: any): { score: number; reasons: string[] } {
  let s = 0;
  const reasons: string[] = [];

  if (draft.nationalId && candidate.nationalId && draft.nationalId === candidate.nationalId) {
    s += 50; reasons.push('Matching National ID');
  }
  if (draft.phone && candidate.phone && draft.phone === candidate.phone) {
    s += 30; reasons.push('Matching phone number');
  }

  const nameSim = tokenSetSimilarity(draft.fullName, candidate.fullName);
  const dobMatch = sameDay(draft.dateOfBirth, candidate.dateOfBirth);
  if (nameSim >= 0.8 && dobMatch) {
    s += 25; reasons.push('Matching name and date of birth');
  } else if (nameSim >= 0.8) {
    s += 15; reasons.push('Similar full name');
  } else if (dobMatch) {
    s += 10; reasons.push('Matching date of birth');
  }

  if (draft.region && draft.district && draft.village &&
      draft.region === candidate.region && draft.district === candidate.district && draft.village === candidate.village) {
    s += 10; reasons.push('Same region, district and village');
  }

  const daysSince = (Date.now() - new Date(candidate.createdAt).getTime()) / 86400000;
  if (daysSince <= 30) { s += 5; reasons.push('Registered within the last 30 days'); }

  return { score: Math.min(s, 100), reasons };
}

async function run(draft: MotherDraft, excludeId?: string): Promise<DuplicateMatch[]> {
  const candidates = await findCandidates(draft, excludeId);
  const matches: DuplicateMatch[] = [];
  for (const c of candidates) {
    const { score: sc, reasons } = score(draft, c);
    if (sc >= MATCH_STORE_FLOOR) {
      matches.push({ motherId: c.id, regNumber: c.regNumber, fullName: c.fullName, score: sc, reasons });
    }
  }
  return matches.sort((a, b) => b.score - a.score);
}

// Preview only — no persistence. Powers the pre-submit "possible duplicate" check.
export async function previewOnly(draft: MotherDraft): Promise<DuplicateMatch[]> {
  return run(draft);
}

// Scores against existing records and writes the result onto the just-created row.
export async function scoreAndAttach(motherId: string, draft: MotherDraft): Promise<DuplicateMatch[]> {
  const matches = await run(draft, motherId);
  const topScore = matches.length ? matches[0].score : 0;
  await prisma.mother.update({
    where: { id: motherId },
    data: { duplicateScore: topScore, duplicateMatchesJson: JSON.stringify(matches) },
  });
  return matches;
}
