import { Router, Response, Request } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const isAdmin = (role: string) => ['admin','super_admin','program_manager','project_manager','verification_office'].includes(role);

// GET /api/projects — Public list
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, status, page = '1', limit = '12' } = req.query as Record<string,string>;
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    else where.status = { in: ['seeking_funding','funded','in_progress','completed'] };

    const skip = (parseInt(page)-1) * parseInt(limit);
    const [projects, total] = await Promise.all([
      prisma.communityProject.findMany({
        where,
        skip, take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, publicId: true, title: true, description: true, category: true,
          location: true, region: true, country: true, populationSize: true,
          problemDesc: true, solutionDesc: true, fundingGoal: true, totalRaised: true,
          status: true, photoUrls: true, phases: true, startedAt: true, completedAt: true,
          _count: { select: { contributions: true } },
        },
      }),
      prisma.communityProject.count({ where }),
    ]);
    res.json({ projects, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total/parseInt(limit)) } });
  } catch { res.status(500).json({ error: 'Failed to fetch projects' }); }
});

// GET /api/projects/:id — Project detail
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await prisma.communityProject.findFirst({
      where: { OR: [{ id: String(req.params.id) }, { publicId: String(req.params.id) }] },
      include: {
        contributions: {
          where: { status: 'confirmed' },
          orderBy: { createdAt: 'desc' },
          select: { id: true, amount: true, type: true, createdAt: true, isAnonymous: true, donor: { select: { name: true } } },
        },
      },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const safe = {
      ...project,
      contributions: project.contributions.map(c => ({
        ...c,
        donor: c.isAnonymous ? { name: 'Anonymous' } : c.donor,
      })),
    };
    res.json(safe);
  } catch { res.status(500).json({ error: 'Failed to fetch project' }); }
});

// POST /api/projects — Admin create
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  const schema = z.object({
    title: z.string().min(5).max(200),
    description: z.string().min(20).max(3000),
    category: z.enum(['water','school','health','agriculture','shelter','energy']),
    location: z.string().min(2).max(200),
    region: z.string().min(2).max(100),
    country: z.string().optional(),
    populationSize: z.number().int().min(1).optional(),
    problemDesc: z.string().min(10).max(1000),
    solutionDesc: z.string().min(10).max(1000),
    fundingGoal: z.number().min(100).max(10000000),
  });
  try {
    const data = schema.parse(req.body);
    const year = new Date().getFullYear();

    let project: any;
    let attempts = 0;
    while (true) {
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const publicId = `CP-${year}-${randomSuffix}`;
      try {
        project = await prisma.communityProject.create({
          data: { ...data, publicId, createdById: req.user!.id, status: 'seeking_funding' },
        });
        break;
      } catch (createErr: any) {
        if (createErr.code === 'P2002' && ++attempts < 5) continue;
        throw createErr;
      }
    }
    res.status(201).json(project);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/projects/:id/contribute — Donor contributes
router.post('/:id/contribute', authenticate, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    amount: z.number().min(5).max(1000000),
    type: z.enum(['full','partial','custom']).optional(),
  });
  try {
    const data = schema.parse(req.body);
    const project = await prisma.communityProject.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.status !== 'seeking_funding') {
      return res.status(400).json({ error: 'This project is not currently accepting contributions' });
    }

    const contribution = await prisma.projectContribution.create({
      data: {
        projectId: req.params.id,
        donorId: req.user!.id,
        amount: data.amount,
        type: data.type || 'partial',
        status: 'pending',
      },
    });

    // totalRaised is incremented only when admin confirms the contribution — not here

    res.status(201).json(contribution);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /api/projects/contributions/:contributionId/confirm — Admin confirms a contribution
router.patch('/contributions/:contributionId/confirm', authenticate, async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const contribution = await prisma.projectContribution.update({
      where: { id: req.params.contributionId },
      data:  { status: 'confirmed' },
    });
    await prisma.communityProject.update({
      where: { id: contribution.projectId },
      data:  { totalRaised: { increment: contribution.amount } },
    });
    res.json({ message: 'Contribution confirmed', contributionId: contribution.id });
  } catch { res.status(500).json({ error: 'Failed to confirm contribution' }); }
});

// PATCH /api/projects/:id/status — Admin update project status/phases
router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { status, phases, completionReport } = req.body;
    const project = await prisma.communityProject.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(phases && { phases }),
        ...(completionReport && { completionReport }),
        ...(status === 'in_progress' && { startedAt: new Date() }),
        ...(status === 'completed' && { completedAt: new Date() }),
      },
    });
    res.json(project);
  } catch { res.status(500).json({ error: 'Failed to update project' }); }
});

export default router;
