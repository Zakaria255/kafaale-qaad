import { prisma } from '../prisma/client';
import { sysLog } from './logger';

export interface FraudSignal { signal: string; points: number; detail: string }
export interface FraudRiskResult { score: number; level: 'low' | 'medium' | 'high' | 'critical'; signals: FraudSignal[] }

const toRiskLevel = (score: number): FraudRiskResult['level'] =>
  score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';

/**
 * Submission-stage fraud risk — deliberately separate from duplicateDetectionService's
 * similarity score. A pair of reports can be highly similar (same real family reported
 * twice by mistake) without being fraudulent, and a low-similarity report can still carry
 * fraud signals (e.g. a reporter submitting an unusual volume of unrelated cases). This is
 * an earlier, coarser signal than FieldInvestigation.fraudRiskScore, which is written later
 * by fraudDetectionService.ts once a field agent has actually verified the situation —
 * both are shown side-by-side in the admin case-detail view, not merged into one number.
 */
class FraudRiskService {
  async scoreCase(caseId: string): Promise<FraudRiskResult> {
    const kase = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true, reporterId: true, category: true, privateVictimPhone: true,
        privateGpsLat: true, privateGpsLng: true, privateFamilySize: true,
        privateDescription: true, createdAt: true,
      },
    });
    if (!kase) throw new Error('Case not found');

    const signals: FraudSignal[] = [];
    let score = 0;

    // 1. Identical image reused across DIFFERENT reporters (same reporter reusing their own
    //    photo across their own legitimate multi-case history is normal, not flagged here).
    const myMedia = await prisma.mediaFingerprint.findMany({
      where: { media: { caseId } }, select: { sha256: true },
    });
    if (myMedia.length > 0) {
      const reusedElsewhere = await prisma.mediaFingerprint.findMany({
        where: { sha256: { in: myMedia.map(m => m.sha256) }, media: { caseId: { not: caseId } } },
        select: { media: { select: { caseId: true, case: { select: { reporterId: true } } } } },
      });
      const otherReporters = new Set(reusedElsewhere.map(r => r.media.case.reporterId).filter(id => id && id !== kase.reporterId));
      if (otherReporters.size > 0) {
        score += 30; signals.push({ signal: 'image_reuse', points: 30, detail: `Same photo(s) previously uploaded by ${otherReporters.size} different reporter(s)` });
      }
    }

    // 2. Identical description reused across different reporters
    if (kase.privateDescription && kase.privateDescription.trim().length > 20) {
      const sameDesc = await prisma.case.count({
        where: {
          id: { not: caseId },
          privateDescription: { equals: kase.privateDescription, mode: 'insensitive' },
          reporterId: { not: kase.reporterId ?? undefined },
        },
      });
      if (sameDesc > 0) {
        score += 25; signals.push({ signal: 'description_reuse', points: 25, detail: `Identical description used by ${sameDesc} other reporter(s)` });
      }
    }

    // 3. Unusual submission volume in the last 24h vs. this reporter's own baseline
    if (kase.reporterId) {
      const last24h = await prisma.case.count({ where: { reporterId: kase.reporterId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
      if (last24h >= 5) {
        score += 20; signals.push({ signal: 'submission_volume', points: 20, detail: `${last24h} cases submitted by this reporter in the last 24h` });
      }

      // 4. "Impossible" GPS movement — two submissions far apart in a short window
      if (kase.privateGpsLat != null && kase.privateGpsLng != null) {
        const recent = await prisma.case.findFirst({
          where: {
            reporterId: kase.reporterId, id: { not: caseId },
            createdAt: { gte: new Date(Date.now() - 3 * 60 * 60 * 1000) }, // last 3h
            privateGpsLat: { not: null }, privateGpsLng: { not: null },
          },
          orderBy: { createdAt: 'desc' },
          select: { privateGpsLat: true, privateGpsLng: true, createdAt: true },
        });
        if (recent && recent.privateGpsLat != null && recent.privateGpsLng != null) {
          const R = 6371;
          const toRad = (d: number) => (d * Math.PI) / 180;
          const dLat = toRad(recent.privateGpsLat - kase.privateGpsLat);
          const dLng = toRad(recent.privateGpsLng - kase.privateGpsLng);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(kase.privateGpsLat)) * Math.cos(toRad(recent.privateGpsLat)) * Math.sin(dLng / 2) ** 2;
          const km = R * 2 * Math.asin(Math.sqrt(a));
          if (km > 100) {
            score += 25; signals.push({ signal: 'gps_movement', points: 25, detail: `${Math.round(km)}km from this reporter's other submission within 3 hours` });
          }
        }
      }
    }

    // 5. Repeated resubmission after rejection (own reporter history)
    if (kase.reporterId) {
      const [total, rejected] = await Promise.all([
        prisma.case.count({ where: { reporterId: kase.reporterId } }),
        prisma.case.count({ where: { reporterId: kase.reporterId, status: 'rejected' } }),
      ]);
      if (total > 2 && rejected / total > 0.5) {
        score += 20; signals.push({ signal: 'rejection_rate', points: 20, detail: `${rejected}/${total} of this reporter's cases were rejected` });
      }
    }

    // 6. Conflicting beneficiary info — same phone/GPS but different household details
    if (kase.privateVictimPhone || (kase.privateGpsLat != null && kase.privateGpsLng != null)) {
      const conflicting = await prisma.case.findFirst({
        where: {
          id: { not: caseId },
          OR: [
            kase.privateVictimPhone ? { privateVictimPhone: kase.privateVictimPhone } : undefined,
            (kase.privateGpsLat != null && kase.privateGpsLng != null) ? {
              privateGpsLat: { gte: kase.privateGpsLat - 0.001, lte: kase.privateGpsLat + 0.001 },
              privateGpsLng: { gte: kase.privateGpsLng - 0.001, lte: kase.privateGpsLng + 0.001 },
            } : undefined,
          ].filter(Boolean) as any,
          privateFamilySize: { not: kase.privateFamilySize ?? undefined },
        },
        select: { caseRef: true, privateFamilySize: true },
      });
      if (conflicting) {
        score += 15; signals.push({ signal: 'conflicting_household', points: 15, detail: `Same contact/location but different family size reported vs. ${conflicting.caseRef || 'another case'}` });
      }
    }

    score = Math.min(100, score);
    const level = toRiskLevel(score);

    await prisma.case.update({ where: { id: caseId }, data: { fraudRiskScore: score, fraudRiskLevel: level } });
    sysLog.info(`Fraud risk: case ${caseId} scored ${score} (${level})`, { signals });

    return { score, level, signals };
  }
}

export const fraudRiskService = new FraudRiskService();
