import { Router, Response } from 'express';
import { prisma } from '../prisma/client';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { safeError } from '../middleware/errors';

const router = Router();
// Narrower than admin.ts's router-level 6-role gate — duplicate/fraud evidence is
// restricted to admin/super_admin/verification_office per the privacy requirements.
router.use(authenticate, requireRole(['admin', 'super_admin', 'verification_office']));

const CASE_SUMMARY_SELECT = {
  id: true, caseRef: true, category: true, status: true, createdAt: true,
  publicCity: true, privateVictimName: true, privateVictimPhone: true,
  privateGpsLat: true, privateGpsLng: true, privateDescription: true, privateFamilySize: true,
  reporterId: true, reporter: { select: { id: true, name: true, email: true } },
  duplicateScore: true, fraudRiskScore: true, fraudRiskLevel: true,
  mediaFiles: { select: { id: true, url: true, type: true }, take: 6 },
} as const;

// GET /api/admin/duplicates — Duplicate & Risk Center list, with filters
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, minScore, category, region, reporterId, matchType, page = '1', limit = '25' } = req.query as Record<string, string>;
    const where: any = {};
    if (status) where.status = status;
    if (minScore) where.similarityScore = { gte: parseInt(minScore) };
    if (category) where.newCase = { category };
    if (region) where.newCase = { ...(where.newCase || {}), publicCity: { contains: region, mode: 'insensitive' } };
    if (reporterId) where.newCase = { ...(where.newCase || {}), reporterId };
    if (matchType) where.matchReasons = { contains: `"signal":"${matchType}"` };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [matches, total, cards] = await Promise.all([
      prisma.duplicateCaseMatch.findMany({
        where,
        include: {
          newCase: { select: CASE_SUMMARY_SELECT },
          existingCase: { select: CASE_SUMMARY_SELECT },
        },
        orderBy: { similarityScore: 'desc' },
        skip, take: parseInt(limit),
      }),
      prisma.duplicateCaseMatch.count({ where }),
      Promise.all([
        prisma.duplicateCaseMatch.count({ where: { status: 'pending_review' } }),
        prisma.duplicateCaseMatch.count({ where: { status: 'confirmed_duplicate' } }),
        prisma.caseRelationship.count({ where: { relationshipType: { in: ['related', 'same_beneficiary', 'same_household', 'same_incident'] } } }),
        prisma.case.count({ where: { fraudRiskLevel: 'high' } }),
        prisma.case.count({ where: { fraudRiskLevel: 'critical' } }),
        prisma.duplicateCaseMatch.count({ where: { matchReasons: { contains: '"signal":"image"' } } }),
        prisma.duplicateCaseMatch.count({ where: { matchReasons: { contains: '"signal":"document"' } } }),
        prisma.case.count({ where: { duplicateScore: { gte: 25 } } }),
      ]),
    ]);
    const [potentialDuplicates, confirmedDuplicates, relatedCases, highRisk, criticalRisk, imageMatches, documentMatches, awaitingReview] = cards;

    res.json({
      matches,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
      cards: { potentialDuplicates, confirmedDuplicates, relatedCases, highRisk, criticalRisk, imageMatches, documentMatches, awaitingReview },
    });
  } catch (e: any) { return safeError(res, 500, 'Failed to load duplicate matches', e); }
});

// GET /api/admin/duplicates/:id — Full evidence detail for one match
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const match = await prisma.duplicateCaseMatch.findUnique({
      where: { id: req.params.id },
      include: {
        newCase: { select: CASE_SUMMARY_SELECT },
        existingCase: { select: CASE_SUMMARY_SELECT },
      },
    });
    if (!match) return res.status(404).json({ error: 'Match not found' });

    let gpsDistanceMeters: number | null = null;
    const a = match.newCase, b = match.existingCase;
    if (a.privateGpsLat != null && a.privateGpsLng != null && b.privateGpsLat != null && b.privateGpsLng != null) {
      const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(b.privateGpsLat - a.privateGpsLat), dLng = toRad(b.privateGpsLng - a.privateGpsLng);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.privateGpsLat)) * Math.cos(toRad(b.privateGpsLat)) * Math.sin(dLng / 2) ** 2;
      gpsDistanceMeters = Math.round(R * 2 * Math.asin(Math.sqrt(h)));
    }

    res.json({ match: { ...match, matchReasons: JSON.parse(match.matchReasons) }, gpsDistanceMeters });
  } catch (e: any) { return safeError(res, 500, 'Failed to load match detail', e); }
});

// PATCH /api/admin/duplicates/:id/review — Confirm duplicate / not a duplicate
router.patch('/:id/review', async (req: AuthRequest, res: Response) => {
  try {
    const { decision, reason } = req.body as { decision?: 'confirmed_duplicate' | 'not_duplicate'; reason?: string };
    if (!['confirmed_duplicate', 'not_duplicate'].includes(decision || '')) {
      return res.status(400).json({ error: 'decision must be "confirmed_duplicate" or "not_duplicate"' });
    }
    const match = await prisma.duplicateCaseMatch.findUnique({ where: { id: req.params.id }, include: { newCase: true } });
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.status !== 'pending_review') return res.status(400).json({ error: `Match already reviewed (status: ${match.status})` });

    await prisma.$transaction([
      prisma.duplicateCaseMatch.update({
        where: { id: match.id },
        data: { status: decision, reviewedBy: req.user!.id, reviewedAt: new Date(), reviewerReason: reason || null },
      }),
      ...(decision === 'confirmed_duplicate' ? [
        prisma.caseRelationship.create({ data: { caseAId: match.newCaseId, caseBId: match.existingCaseId, relationshipType: 'duplicate', confidence: match.similarityScore / 100, createdBy: req.user!.id } }),
      ] : [
        prisma.caseRelationship.create({ data: { caseAId: match.newCaseId, caseBId: match.existingCaseId, relationshipType: 'false_positive', confidence: 0, createdBy: req.user!.id } }),
      ]),
      prisma.adminAuditLog.create({
        data: {
          adminId: req.user!.id, caseId: match.newCaseId,
          action: decision === 'confirmed_duplicate' ? 'duplicate_confirmed' : 'duplicate_dismissed',
          notes: `Match vs ${match.existingCaseId} (score ${match.similarityScore}) → ${decision}${reason ? `: ${reason}` : ''}`,
        },
      }),
    ]);

    if (match.newCase.reporterId) {
      await prisma.notification.create({
        data: {
          userId: match.newCase.reporterId, caseId: match.newCaseId,
          type: decision === 'confirmed_duplicate' ? 'duplicate_confirmed' : 'duplicate_dismissed',
          title: decision === 'confirmed_duplicate' ? 'Report Matched to Existing Case' : 'Report Confirmed as Separate Case',
          message: decision === 'confirmed_duplicate'
            ? 'Our verification team confirmed your report matches an existing case. We\'ll keep you updated on that case\'s progress.'
            : 'Our verification team reviewed your report and confirmed it describes a separate, distinct situation. It will continue through normal verification.',
        },
      });
    }

    res.json({ message: 'Review recorded', matchId: match.id, decision });
  } catch (e: any) { return safeError(res, 500, 'Failed to record review', e); }
});

export default router;
