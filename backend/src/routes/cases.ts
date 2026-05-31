import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sysLog } from '../services/logger';

const router = Router();

const CreateCaseSchema = z.object({
  privateVictimName:   z.string().min(2).max(100).optional(),
  privateVictimPhone:  z.string().max(20).optional(),
  privateAddress:      z.string().max(500).optional(),
  privateGpsLat:       z.number().min(-90).max(90).optional(),
  privateGpsLng:       z.number().min(-180).max(180).optional(),
  privateFamilySize:   z.number().int().min(1).max(50).optional(),
  privateVictimAge:    z.number().int().min(0).max(120).optional(),
  privateVictimGender: z.enum(['male','female','other']).optional(),
  privateDescription:  z.string().min(20).max(3000),
  privateNotes:        z.string().max(1000).optional(),
  category:            z.enum(['food','medical','shelter','orphan','disaster','education','other']),
  emergencyLevel:      z.enum(['low','medium','high','critical']),
  targetGoal:          z.number().positive().max(1000000).optional(),
});

// GET /api/cases — Public cases feed (waiting_for_sponsor + completed)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, urgency, page = '1', limit = '12' } = req.query as Record<string,string>;
    const where: any = { OR: [{ status: 'waiting_for_sponsor' }, { status: 'sponsored' }, { status: 'completed' }] };
    if (category) where.category = category;
    if (urgency) where.emergencyLevel = urgency;
    const skip = (parseInt(page)-1) * parseInt(limit);
    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip, take: parseInt(limit),
        select: {
          id: true, caseRef: true, publicTitle: true, publicStory: true, publicCity: true, publicCountry: true,
          category: true, emergencyLevel: true, status: true,
          targetGoal: true, totalRaised: true, adminPublishedAt: true,
          _count: { select: { donations: true } },
        },
      }),
      prisma.case.count({ where }),
    ]);
    res.json({ cases, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total/parseInt(limit)) } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve cases' });
  }
});

// GET /api/cases/my — Reporter's own cases
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cases = await prisma.case.findMany({
      where: { reporterId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, caseRef: true, category: true, emergencyLevel: true, status: true, publicTitle: true, privateDescription: true, targetGoal: true, totalRaised: true, createdAt: true, rejectionReason: true },
    });
    res.json(cases);
  } catch { res.status(500).json({ error: 'Failed to retrieve your cases' }); }
});

// GET /api/cases/:id — Public case detail
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const kase = await prisma.case.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, publicTitle: true, publicStory: true, publicCity: true, publicCountry: true,
        category: true, emergencyLevel: true, status: true,
        targetGoal: true, totalRaised: true, adminPublishedAt: true, completedAt: true,
        fieldInvestigation: { select: { verificationStatus: true, deliveryFeasible: true, createdAt: true } },
        aiPublicData: { select: { generatedTitle: true, generatedStory: true, generatedUrgency: true, generatedCity: true, confidenceScore: true } },
        mediaFiles: { where: { isPublic: true }, select: { id: true, url: true, type: true } },
        deliveryProof: { select: { deliveryDate: true, deliveryMethod: true, amountDelivered: true, adminConfirmed: true } },
        _count: { select: { donations: true } },
      },
    });
    if (!kase) return res.status(404).json({ error: 'Case not found' });
    const allowed = ['waiting_for_sponsor','sponsored','delivering','proof_uploaded','completed'];
    if (!allowed.includes(kase.status)) return res.status(404).json({ error: 'Case not found' });
    res.json(kase);
  } catch { res.status(500).json({ error: 'Failed to retrieve case' }); }
});

// POST /api/cases — Submit new case
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = CreateCaseSchema.parse(req.body);
    const year = new Date().getFullYear();
    const count = await prisma.case.count();
    const caseRef = `KQ-${year}-${String(count + 1).padStart(4, '0')}`;
    const kase = await prisma.case.create({
      data: { reporterId: req.user!.id, ...data, status: 'pending_review', caseRef },
    });
    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: { in: ['admin','super_admin'] }, isActive: true }, select: { id: true } });
    await prisma.notification.createMany({
      data: admins.map(a => ({
        userId: a.id, caseId: kase.id, type: 'case_submitted',
        title: '🚨 New Emergency Report',
        message: `New ${data.emergencyLevel.toUpperCase()} priority ${data.category} case requires review.`,
      })),
    });
    sysLog.info(`📝 Case submitted: ${kase.id} by ${req.user!.id}`);
    res.status(201).json({ message: 'Case submitted successfully', caseId: kase.id, status: kase.status });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    res.status(500).json({ error: 'Failed to submit case' });
  }
});

export default router;
