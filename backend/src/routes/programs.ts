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
    // Default: show all published beneficiaries (seeking sponsor + under sponsor — both visible publicly)
    const where: any = status
      ? { status }
      : { status: { in: ['seeking_sponsor', 'under_sponsor', 'sponsored'] } };
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
        sponsorships: { where: { status: 'active' }, select: { id: true, monthlyAmount: true, type: true, sponsorId: true, monthsCompleted: true, endDate: true, sponsor: { select: { id: true, name: true, email: true, phone: true } } } },
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

// POST /api/programs/beneficiaries/bulk — Register many children at once
router.post('/beneficiaries/bulk', authenticate, async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  const ChildSchema = z.object({
    programId:           z.string(),
    privateFullName:     z.string().min(2).max(100),
    privateGuardianName: z.string().max(100).optional(),
    privateGuardianPhone:z.string().max(20).optional(),
    privateAddress:      z.string().max(300).optional(),
    privateSchoolName:   z.string().max(200).optional(),
    privateMedicalNotes: z.string().max(500).optional(),
    privateNotes:        z.string().max(500).optional(),
    publicAge:           z.number().int().min(0).max(25).optional(),
    publicGender:        z.string().optional(),
    publicRegion:        z.string().max(100).optional(),
    publicCity:          z.string().max(100).optional(),
    publicNeedsDesc:     z.string().max(500).optional(),
    publicStory:         z.string().max(1000).optional(),
    publicPhotoUrl:      z.string().url().optional(),
    programType:         z.string().optional(),
    monthlyNeed:         z.number().min(0).optional(),
  });
  const schema = z.object({ children: z.array(ChildSchema).min(1).max(200) });
  try {
    const { children } = schema.parse(req.body);
    const program = await prisma.program.findUnique({ where: { id: children[0].programId } });
    if (!program) return res.status(404).json({ error: 'Program not found' });

    const results = [];
    for (const child of children) {
      const publicId = `BEN-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const ben = await prisma.beneficiary.create({
        data: {
          publicId,
          programId:           child.programId,
          privateFullName:     child.privateFullName,
          privateGuardianName: child.privateGuardianName,
          privateGuardianPhone:child.privateGuardianPhone,
          privateAddress:      child.privateAddress,
          privateSchoolName:   child.privateSchoolName,
          privateMedicalNotes: child.privateMedicalNotes,
          privateNotes:        child.privateNotes,
          publicAge:           child.publicAge,
          publicGender:        child.publicGender,
          publicRegion:        child.publicRegion,
          publicCity:          child.publicCity,
          publicNeedsDesc:     child.publicNeedsDesc,
          publicStory:         child.publicStory,
          publicPhotoUrl:      child.publicPhotoUrl,
          programType:         child.programType || program.type,
          monthlyNeed:         child.monthlyNeed || 0,
          enrolledBy:          req.user!.id,
          status:              'pending_verification',
        },
      });
      results.push(ben);
    }
    res.status(201).json({ message: `${results.length} children enrolled`, count: results.length, beneficiaries: results });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation error', details: e.issues });
    res.status(500).json({ error: 'Bulk enrollment failed' });
  }
});

// POST /api/programs/beneficiaries/assign-donor — Assign children to a specific donor
router.post('/beneficiaries/assign-donor', authenticate, async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  const schema = z.object({
    donorId:          z.string(),
    beneficiaryIds:   z.array(z.string()).min(1).max(20),
    monthlyAmount:    z.number().positive(),
    paymentMethod:    z.string().optional(),
    type:             z.string().optional(),
    commitmentMonths: z.number().int().min(12).max(120).default(12), // minimum 1 year contract
  });
  try {
    const data = schema.parse(req.body);
    const donor = await prisma.user.findUnique({ where: { id: data.donorId } });
    if (!donor) return res.status(404).json({ error: 'Donor not found' });

    // Calculate endDate from commitmentMonths (always set — minimum 12 months)
    const endDate = new Date(Date.now() + data.commitmentMonths * 30 * 24 * 60 * 60 * 1000);

    const sponsorships = [];
    for (const benId of data.beneficiaryIds) {
      const existing = await prisma.sponsorship.findFirst({ where: { beneficiaryId: benId, sponsorId: data.donorId, status: 'active' } });
      if (existing) { sponsorships.push(existing); continue; }
      const sp = await prisma.sponsorship.create({
        data: {
          beneficiaryId:   benId,
          sponsorId:       data.donorId,
          monthlyAmount:   data.monthlyAmount,
          type:            data.type || 'custom',
          paymentMethod:   data.paymentMethod || 'bank_transfer',
          nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          endDate,
        },
      });
      // Only promote to under_sponsor when a 12-month (or longer) contract is signed
      if (data.commitmentMonths >= 12) {
        await prisma.beneficiary.update({ where: { id: benId }, data: { status: 'under_sponsor' } });
      }
      // If < 12 months, child stays seeking_sponsor (visible publicly)
      sponsorships.push(sp);
    }

    const commitMsg = ` for ${data.commitmentMonths} month${data.commitmentMonths > 1 ? 's' : ''}`;
    await prisma.notification.create({
      data: {
        userId: data.donorId, type: 'sponsorship_assigned',
        title: '🌱 You Have Been Assigned Beneficiaries',
        message: `You have been assigned ${data.beneficiaryIds.length} beneficiar${data.beneficiaryIds.length > 1 ? 'ies' : 'y'} to sponsor at $${data.monthlyAmount}/month${commitMsg}. Check your dashboard for details.`,
      },
    });

    res.status(201).json({ message: 'Donor assigned', count: sponsorships.length, sponsorships });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation error', details: e.issues });
    res.status(500).json({ error: 'Assignment failed' });
  }
});

// PATCH /api/programs/sponsorships/:id/end — Admin ends a sponsorship early or on completion
router.patch('/sponsorships/:id/end', authenticate, async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { reason } = req.body;
    const sp = await prisma.sponsorship.findUnique({ where: { id: req.params.id }, include: { beneficiary: true, sponsor: { select: { id: true, name: true } } } });
    if (!sp) return res.status(404).json({ error: 'Sponsorship not found' });

    // End the sponsorship
    await prisma.sponsorship.update({ where: { id: req.params.id }, data: { status: 'ended', endDate: new Date() } });

    // Move beneficiary back to seeking_sponsor if no other active sponsorships
    const remaining = await prisma.sponsorship.count({ where: { beneficiaryId: sp.beneficiaryId, status: 'active', id: { not: req.params.id } } });
    if (remaining === 0) {
      await prisma.beneficiary.update({ where: { id: sp.beneficiaryId }, data: { status: 'seeking_sponsor' } });
    }

    // Notify the donor
    await prisma.notification.create({
      data: {
        userId: sp.sponsorId, type: 'sponsorship_ended',
        title: '📋 Sponsorship Ended',
        message: `Your sponsorship for beneficiary ${sp.beneficiary.publicId} has been ended by the admin${reason ? ': ' + reason : ''}. Thank you for your contribution of ${sp.monthsCompleted} month${sp.monthsCompleted !== 1 ? 's' : ''}.`,
      },
    });

    res.json({ message: 'Sponsorship ended', beneficiaryStatus: remaining === 0 ? 'seeking_sponsor' : 'sponsored' });
  } catch { res.status(500).json({ error: 'Failed to end sponsorship' }); }
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
      create: { ...data, beneficiaryId: req.params.id, submittedById: req.user!.id, deliveriesMade: JSON.stringify(data.deliveriesMade || []), photoUrls: JSON.stringify(data.photoUrls || []) },
      update: { ...data, submittedById: req.user!.id, deliveriesMade: JSON.stringify(data.deliveriesMade || []), photoUrls: JSON.stringify(data.photoUrls || []) },
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

// POST /api/programs/sponsorships — Create sponsorship (donor self-service)
// NOTE: This creates a pending intent. Status only changes to under_sponsor when admin confirms 12-month contract via assign-donor.
router.post('/sponsorships', authenticate, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    beneficiaryId:   z.string(),
    type:            z.enum(['full','education','medical','food','clothing','custom']).optional(),
    monthlyAmount:   z.number().min(5).max(100000),
    paymentMethod:   z.string().optional(),
    commitmentMonths: z.number().int().min(1).max(120).optional(),
  });
  try {
    const data = schema.parse(req.body);
    const beneficiary = await prisma.beneficiary.findUnique({ where: { id: data.beneficiaryId } });
    if (!beneficiary) return res.status(404).json({ error: 'Beneficiary not found' });
    if (!['seeking_sponsor', 'sponsored', 'under_sponsor'].includes(beneficiary.status)) {
      return res.status(400).json({ error: 'Beneficiary is not available for sponsorship' });
    }

    const endDate = data.commitmentMonths
      ? new Date(Date.now() + data.commitmentMonths * 30 * 24 * 60 * 60 * 1000)
      : undefined;

    const sponsorship = await prisma.sponsorship.create({
      data: {
        beneficiaryId: data.beneficiaryId,
        sponsorId: req.user!.id,
        type: data.type || 'custom',
        monthlyAmount: data.monthlyAmount,
        paymentMethod: data.paymentMethod || 'bank_transfer',
        nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        ...(endDate && { endDate }),
      },
    });

    // Only move to under_sponsor when a full 12-month contract is committed
    // Anything less stays seeking_sponsor — child remains visible on public page
    if (data.commitmentMonths && data.commitmentMonths >= 12) {
      await prisma.beneficiary.update({
        where: { id: data.beneficiaryId },
        data: { status: 'under_sponsor' },
      });
    }

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

// PATCH /api/programs/beneficiaries/:id/release — Admin moves beneficiary back to seeking_sponsor
router.patch('/beneficiaries/:id/release', authenticate, async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    // End all active sponsorships for this beneficiary
    await prisma.sponsorship.updateMany({ where: { beneficiaryId: req.params.id, status: 'active' }, data: { status: 'ended', endDate: new Date() } });
    await prisma.beneficiary.update({ where: { id: req.params.id }, data: { status: 'seeking_sponsor' } });
    res.json({ message: 'Beneficiary released — now seeking a new sponsor' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/programs/sponsorships/:id/mark-paid — Admin manually marks a month as paid and sends receipt
router.post('/sponsorships/:id/mark-paid', authenticate, async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const sp = await prisma.sponsorship.findUnique({
      where: { id: req.params.id },
      include: {
        beneficiary: { select: { publicId: true, privateFullName: true, publicStory: true, status: true } },
        sponsor:     { select: { id: true, name: true, email: true } },
      },
    });
    if (!sp) return res.status(404).json({ error: 'Sponsorship not found' });

    const now = new Date();
    const month = req.body.month || now.getMonth() + 1;
    const year  = req.body.year  || now.getFullYear();
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthName = MONTHS[month - 1];

    // Create confirmed payment record (receiptNo stored in notification, not in DB)
    const receiptNo = `KQ-RCP-${Date.now().toString(36).toUpperCase().slice(-6)}-${year}${String(month).padStart(2,'0')}`;
    const payment = await prisma.sponsorshipPayment.create({
      data: {
        sponsorshipId: sp.id,
        amount:        sp.monthlyAmount,
        currency:      sp.currency,
        month,
        year,
        status:        'confirmed',
        confirmedAt:   new Date(),
      },
    });

    // Advance nextPaymentDate and increment totals
    const updatedSp = await prisma.sponsorship.update({
      where: { id: sp.id },
      data: {
        totalPaid:       { increment: sp.monthlyAmount },
        monthsCompleted: { increment: 1 },
        nextPaymentDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Auto-promote to under_sponsor once 12 months of payments are confirmed
    if (updatedSp.monthsCompleted >= 12 && !['under_sponsor','completed'].includes(sp.beneficiary.status)) {
      await prisma.beneficiary.update({ where: { id: sp.beneficiaryId }, data: { status: 'under_sponsor' } });
    }

    const childName = sp.beneficiary.privateFullName || sp.beneficiary.publicId;
    const donorName = sp.sponsor.name || 'Dear Donor';

    // Beautiful receipt notification
    await prisma.notification.create({
      data: {
        userId:  sp.sponsorId,
        type:    'payment_receipt',
        title:   `💙 Payment Confirmed — ${monthName} ${year}`,
        message: [
          `Dear ${donorName},`,
          ``,
          `Thank you from the bottom of our hearts. Your sponsorship payment for ${monthName} ${year} has been received and recorded.`,
          ``,
          `📋 Receipt No: ${receiptNo}`,
          `👶 Beneficiary: ${childName} (${sp.beneficiary.publicId})`,
          `💵 Amount: $${sp.monthlyAmount.toFixed(2)} ${sp.currency}`,
          `📅 Period: ${monthName} ${year}`,
          `✅ Status: Confirmed`,
          ``,
          `Your generosity is making a real difference in this child's life every single day. Because of you, ${childName} has access to education, health care, and a safer future.`,
          ``,
          `"The best of people are those who bring most benefit to others." — Your kindness embodies this.`,
          ``,
          `With deep gratitude,`,
          `Kafaale Qaad Hope Society 🌱`,
        ].join('\n'),
      },
    });

    res.json({ message: 'Payment marked as paid', receiptNo, payment });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to mark payment: ' + e.message });
  }
});

// PATCH /api/programs/sponsorships/:id/renew — Donor or admin renews contract for another period
router.patch('/sponsorships/:id/renew', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sp = await prisma.sponsorship.findUnique({
      where: { id: req.params.id },
      include: { beneficiary: { select: { publicId: true, privateFullName: true } }, sponsor: { select: { id: true, name: true } } },
    });
    if (!sp) return res.status(404).json({ error: 'Sponsorship not found' });

    // Only admin or the sponsor themselves can renew
    if (!isAdmin(req.user!.role) && req.user!.id !== sp.sponsorId) return res.status(403).json({ error: 'Forbidden' });

    const renewMonths = req.body.months || 12;
    const newEndDate = new Date((sp.endDate || new Date()).getTime() + renewMonths * 30 * 24 * 60 * 60 * 1000);

    await prisma.sponsorship.update({ where: { id: sp.id }, data: { endDate: newEndDate, status: 'active' } });
    await prisma.beneficiary.update({ where: { id: sp.beneficiaryId }, data: { status: 'under_sponsor' } });

    // Notify donor of renewal
    await prisma.notification.create({
      data: {
        userId:  sp.sponsorId,
        type:    'contract_renewed',
        title:   '🌱 Sponsorship Contract Renewed',
        message: `Your sponsorship contract for ${sp.beneficiary.privateFullName || sp.beneficiary.publicId} has been renewed for ${renewMonths} more months (until ${newEndDate.toLocaleDateString()}). Thank you for your continued support!`,
      },
    });

    res.json({ message: 'Contract renewed', newEndDate });
  } catch { res.status(500).json({ error: 'Failed to renew contract' }); }
});

// POST /api/programs/send-reminders — Admin manually triggers invoice reminders for a specific sponsorship or all due
router.post('/send-reminders', authenticate, async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { sponsorshipId, daysAhead = 5 } = req.body;

    // If a specific sponsorship is given, send to just that donor
    if (sponsorshipId) {
      const sp = await prisma.sponsorship.findUnique({
        where: { id: sponsorshipId },
        include: {
          beneficiary: { select: { publicId: true, privateFullName: true } },
          sponsor:     { select: { id: true, name: true } },
        },
      });
      if (!sp) return res.status(404).json({ error: 'Sponsorship not found' });

      const dueDate = sp.nextPaymentDate
        ? new Date(sp.nextPaymentDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'soon';

      await prisma.notification.create({
        data: {
          userId:  sp.sponsorId,
          type:    'payment_reminder',
          title:   '📋 Payment Invoice — Action Required',
          message: `Your monthly sponsorship payment of $${sp.monthlyAmount} for ${sp.beneficiary.privateFullName || sp.beneficiary.publicId} is due on ${dueDate}. Please log in to view and print your invoice letter, then transfer the amount via your registered payment method.`,
        },
      });

      return res.json({ sent: 1, message: `Invoice reminder sent to ${sp.sponsor.name}` });
    }

    // Otherwise send to all with payment due within daysAhead
    const cutoff = new Date(Date.now() + Number(daysAhead) * 24 * 60 * 60 * 1000);
    const due = await prisma.sponsorship.findMany({
      where: { status: 'active', nextPaymentDate: { lte: cutoff } },
      include: {
        beneficiary: { select: { publicId: true, privateFullName: true } },
        sponsor:     { select: { id: true, name: true } },
      },
    });

    const byDonor = new Map<string, typeof due>();
    for (const s of due) {
      const list = byDonor.get(s.sponsorId) || [];
      list.push(s);
      byDonor.set(s.sponsorId, list);
    }

    let sent = 0;
    for (const [sponsorId, sps] of byDonor) {
      const names = sps.map(s => s.beneficiary.privateFullName || s.beneficiary.publicId).join(', ');
      const total = sps.reduce((sum, s) => sum + s.monthlyAmount, 0);
      await prisma.notification.create({
        data: {
          userId:  sponsorId,
          type:    'payment_reminder',
          title:   '📋 Payment Due',
          message: `Your sponsorship payment of $${total.toFixed(2)} for ${names} is due within ${daysAhead} days. Log in to view your invoice and submit payment.`,
        },
      });
      sent++;
    }

    res.json({ sent, message: `Reminders sent to ${sent} donor(s) covering ${due.length} sponsorship(s)` });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

export default router;
