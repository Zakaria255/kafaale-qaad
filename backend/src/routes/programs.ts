import { Router, Response, Request } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const isAdmin = (role: string) => ['admin','super_admin','program_manager','office_staff'].includes(role);
const isField = (role: string) => ['field_agent','program_manager','office_staff'].includes(role);

// ── Programs ─────────────────────────────────────────────────────────────────

// GET /api/programs — Public list
router.get('/', async (_req: Request, res: Response) => {
  try {
    const programs = await prisma.program.findMany({
      where: { isActive: true },
      include: { _count: { select: { beneficiaries: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(programs);
  } catch { res.status(500).json({ error: 'Failed to fetch programs' }); }
});

// POST /api/programs — Admin create
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  const schema = z.object({
    name: z.string().min(2).max(100),
    type: z.enum(['child_sponsorship','education','medical','family_care','nutrition','emergency_relief']),
    description: z.string().min(10).max(10000),
    icon: z.string().optional(),
    color: z.string().optional(),
    monthlyBudget: z.number().optional(),
  });
  try {
    const data = schema.parse(req.body);
    const program = await prisma.program.create({ data: { ...data } });
    res.status(201).json(program);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ── Beneficiaries ─────────────────────────────────────────────────────────────

// GET /api/programs/beneficiaries — Public list (sanitized)
router.get('/beneficiaries', async (req: Request, res: Response) => {
  try {
    const { status, programType, page = '1', limit = '12' } = req.query as Record<string,string>;
    const where: any = { status: status || 'seeking_sponsor' };
    if (programType) where.programType = programType;
    const skip = (parseInt(page)-1) * parseInt(limit);

    const [beneficiaries, total] = await Promise.all([
      prisma.beneficiary.findMany({
        where,
        skip, take: parseInt(limit),
        orderBy: { enrolledAt: 'desc' },
        select: {
          id: true, publicId: true, publicAge: true, publicGender: true,
          publicRegion: true, publicCity: true, publicCountry: true,
          publicNeedsDesc: true, publicStory: true, publicPhotoUrl: true,
          programType: true, monthlyNeed: true, status: true, enrolledAt: true,
          program: { select: { id: true, name: true, type: true, icon: true, color: true } },
          _count: { select: { sponsorships: true } },
        },
      }),
      prisma.beneficiary.count({ where }),
    ]);
    res.json({ beneficiaries, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total/parseInt(limit)) } });
  } catch { res.status(500).json({ error: 'Failed to fetch beneficiaries' }); }
});

// GET /api/programs/beneficiaries/admin — Admin full list (private data)
router.get('/beneficiaries/admin', authenticate, async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { status, programType } = req.query as Record<string,string>;
    const where: any = {};
    if (status) where.status = status;
    if (programType) where.programType = programType;

    const beneficiaries = await prisma.beneficiary.findMany({
      where,
      orderBy: { enrolledAt: 'desc' },
      include: {
        program: true,
        _count: { select: { sponsorships: true, monthlyUpdates: true } },
        sponsorships: { where: { status: 'active' }, select: { id: true, monthlyAmount: true, type: true, sponsorId: true } },
      },
    });
    res.json(beneficiaries);
  } catch { res.status(500).json({ error: 'Failed to fetch beneficiaries' }); }
});

// GET /api/programs/beneficiaries/:id — Single beneficiary detail
router.get('/beneficiaries/:id', async (req: Request, res: Response) => {
  try {
    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id: String(req.params.id) },
      include: {
        program: { select: { id: true, name: true, type: true, icon: true, color: true } },
        monthlyUpdates: { where: { isPublished: true }, orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 6 },
        _count: { select: { sponsorships: true, monthlyUpdates: true } },
      },
    });
    if (!beneficiary) return res.status(404).json({ error: 'Beneficiary not found' });
    res.json({ beneficiary });
  } catch { res.status(500).json({ error: 'Failed to fetch beneficiary' }); }
});

// POST /api/programs/beneficiaries — Enroll beneficiary
router.post('/beneficiaries', authenticate, async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  const schema = z.object({
    programId: z.string(),
    programType: z.enum(['child_sponsorship','education','medical','family_care']),
    privateFullName: z.string().min(2).max(100),
    privateGuardianName: z.string().max(100).optional(),
    privateGuardianPhone: z.string().max(20).optional(),
    privateSchoolName: z.string().max(200).optional(),
    privateAddress: z.string().max(500).optional(),
    privateMedicalNotes: z.string().max(2000).optional(),
    privateNotes: z.string().max(1000).optional(),
    publicAge: z.number().int().min(0).max(100).optional(),
    publicGender: z.enum(['male','female','other']).optional(),
    publicRegion: z.string().max(100).optional(),
    publicCity: z.string().max(100).optional(),
    publicNeedsDesc: z.string().max(200).optional(),
    publicStory: z.string().max(10000).optional(),
    monthlyNeed: z.number().min(1).max(100000),
  });
  try {
    const data = schema.parse(req.body);
    const year = new Date().getFullYear();
    const prefix = data.programType === 'child_sponsorship' ? 'CSP' : data.programType === 'education' ? 'EDU' : data.programType === 'medical' ? 'MED' : 'FAM';

    let beneficiary: any;
    let attempts = 0;
    while (true) {
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const publicId = `${prefix}-${year}-${randomSuffix}`;
      try {
        beneficiary = await prisma.beneficiary.create({
          data: { ...data, publicId, enrolledBy: req.user!.id, status: 'pending_verification' },
          include: { program: true },
        });
        break;
      } catch (createErr: any) {
        if (createErr.code === 'P2002' && ++attempts < 5) continue;
        throw createErr;
      }
    }
    res.status(201).json(beneficiary);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /api/programs/beneficiaries/:id/verify — Admin verify
router.patch('/beneficiaries/:id/verify', authenticate, async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { status, publicStory } = req.body;
    const validStatuses = ['verified','seeking_sponsor','rejected','on_hold'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const updated = await prisma.beneficiary.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(publicStory && { publicStory }),
        ...(status === 'verified' && { verifiedAt: new Date(), verifiedById: req.user!.id }),
      },
    });
    res.json(updated);
  } catch { res.status(500).json({ error: 'Failed to update beneficiary' }); }
});

// GET /api/programs/beneficiaries/:id/updates — Monthly updates for a beneficiary
router.get('/beneficiaries/:id/updates', async (req: Request, res: Response) => {
  try {
    const updates = await prisma.monthlyUpdate.findMany({
      where: { beneficiaryId: String(req.params.id), isPublished: { equals: true } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: {
        id: true, month: true, year: true,
        schoolAttendance: true, healthStatus: true, progressNotes: true,
        deliveriesMade: true, photoUrls: true, publishedAt: true,
      },
    });
    res.json(updates);
  } catch { res.status(500).json({ error: 'Failed to fetch updates' }); }
});

// POST /api/programs/beneficiaries/:id/updates — Field team submits monthly update
router.post('/beneficiaries/:id/updates', authenticate, async (req: AuthRequest, res: Response) => {
  if (!isField(req.user!.role) && !isAdmin(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });

  // Verify beneficiary exists and is in an updatable state
  const beneficiary = await prisma.beneficiary.findUnique({
    where: { id: req.params.id },
    select: { id: true, status: true, programId: true },
  });
  if (!beneficiary) return res.status(404).json({ error: 'Beneficiary not found' });
  if (!['seeking_sponsor','sponsored','active'].includes(beneficiary.status)) {
    return res.status(400).json({ error: 'Updates cannot be submitted for a graduated or inactive beneficiary' });
  }

  const schema = z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2024).max(2100),
    schoolAttendance: z.number().int().min(0).max(100).optional(),
    healthStatus: z.enum(['good','fair','poor']).optional(),
    progressNotes: z.string().min(10).max(3000),
    needsAssessment: z.string().max(1000).optional(),
    deliveriesMade: z.array(z.string()).optional(),
    photoUrls: z.array(z.string()).optional(),
  });
  try {
    const data = schema.parse(req.body);
    const update = await prisma.monthlyUpdate.upsert({
      where: { beneficiaryId_month_year: { beneficiaryId: req.params.id, month: data.month, year: data.year } },
      create: { ...data, beneficiaryId: req.params.id, submittedById: req.user!.id, deliveriesMade: data.deliveriesMade || [], photoUrls: data.photoUrls || [] },
      update: { ...data, submittedById: req.user!.id, deliveriesMade: data.deliveriesMade || [], photoUrls: data.photoUrls || [] },
    });
    res.json(update);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /api/programs/updates/:id/publish — Admin publishes update
router.patch('/updates/:id/publish', authenticate, async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const update = await prisma.monthlyUpdate.update({
      where: { id: req.params.id },
      data: { isPublished: true, publishedAt: new Date() },
    });
    res.json(update);
  } catch { res.status(500).json({ error: 'Failed to publish update' }); }
});

// ── Sponsorships ─────────────────────────────────────────────────────────────

// GET /api/programs/sponsorships/my — Donor's sponsorships
router.get('/sponsorships/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sponsorships = await prisma.sponsorship.findMany({
      where: { sponsorId: req.user!.id },
      include: {
        beneficiary: {
          select: {
            id: true, publicId: true, publicAge: true, publicGender: true,
            publicRegion: true, programType: true, monthlyNeed: true, status: true, publicPhotoUrl: true,
            program: { select: { name: true, icon: true } },
            monthlyUpdates: {
              where: { isPublished: true },
              orderBy: [{ year: 'desc' }, { month: 'desc' }],
              take: 6,
              select: { id: true, month: true, year: true, schoolAttendance: true, healthStatus: true, progressNotes: true, deliveriesMade: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sponsorships);
  } catch { res.status(500).json({ error: 'Failed to fetch sponsorships' }); }
});

// POST /api/programs/sponsorships — Create sponsorship
router.post('/sponsorships', authenticate, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    beneficiaryId: z.string(),
    type: z.enum(['full','education','medical','food','clothing','custom']).optional(),
    monthlyAmount: z.number().min(5).max(100000),
    paymentMethod: z.string().optional(),
  });
  try {
    const data = schema.parse(req.body);
    const beneficiary = await prisma.beneficiary.findUnique({ where: { id: data.beneficiaryId } });
    if (!beneficiary) return res.status(404).json({ error: 'Beneficiary not found' });
    if (!['seeking_sponsor','sponsored'].includes(beneficiary.status)) {
      return res.status(400).json({ error: 'Beneficiary is not available for sponsorship' });
    }

    const sponsorship = await prisma.sponsorship.create({
      data: {
        beneficiaryId: data.beneficiaryId,
        sponsorId: req.user!.id,
        type: data.type || 'custom',
        monthlyAmount: data.monthlyAmount,
        paymentMethod: data.paymentMethod || 'bank_transfer',
        nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Update beneficiary status to sponsored
    await prisma.beneficiary.update({
      where: { id: data.beneficiaryId },
      data: { status: 'sponsored' },
    });

    res.status(201).json(sponsorship);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/programs/stats — Program statistics
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [programs, totalBeneficiaries, activeSponsorships, totalProjects] = await Promise.all([
      prisma.program.findMany({ where: { isActive: true }, select: { id: true, name: true, type: true, icon: true, color: true, _count: { select: { beneficiaries: true } } } }),
      prisma.beneficiary.count(),
      prisma.sponsorship.count({ where: { status: 'active' } }),
      prisma.communityProject.count(),
    ]);
    res.json({ programs, totalBeneficiaries, activeSponsorships, totalProjects });
  } catch { res.status(500).json({ error: 'Failed to fetch stats' }); }
});

// PATCH /api/programs/beneficiaries/:id/transfer — Move beneficiary to a different program type
router.patch('/beneficiaries/:id/transfer', authenticate, async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { toProgramType, reason } = z.object({
      toProgramType: z.string().min(1),
      reason:        z.string().max(500).optional(),
    }).parse(req.body);

    const beneficiary = await prisma.beneficiary.findUnique({ where: { id: req.params.id } });
    if (!beneficiary) return res.status(404).json({ error: 'Beneficiary not found' });
    if (beneficiary.programType === toProgramType) return res.status(400).json({ error: 'Beneficiary is already in that program type' });

    const updated = await prisma.beneficiary.update({
      where: { id: req.params.id },
      data: {
        programType: toProgramType,
        privateNotes: reason
          ? `[Transferred from ${beneficiary.programType} to ${toProgramType}] ${reason}`
          : `[Transferred from ${beneficiary.programType} to ${toProgramType}]`,
      },
    });
    res.json({ message: 'Beneficiary transferred successfully', beneficiary: updated });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    res.status(500).json({ error: 'Transfer failed' });
  }
});

export default router;
