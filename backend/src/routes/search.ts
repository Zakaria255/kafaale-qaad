import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';

const router = Router();

// GET /api/search?q=...
router.get('/', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      return res.json({ cases: [], programs: [], projects: [], beneficiaries: [] });
    }

    const term = { contains: q, mode: 'insensitive' as const };

    const [cases, programs, projects, beneficiaries] = await Promise.all([
      prisma.case.findMany({
        where: {
          AND: [
            { OR: [{ status: 'waiting_for_sponsor' }, { status: 'sponsored' }, { status: 'completed' }] },
            { OR: [{ publicTitle: term }, { publicStory: term }, { publicCity: term }, { category: term }] },
          ],
        },
        take: 10,
        orderBy: { adminPublishedAt: 'desc' },
        select: {
          id: true, caseRef: true, publicTitle: true, publicCity: true,
          category: true, emergencyLevel: true, status: true,
          targetGoal: true, totalRaised: true,
        },
      }),

      prisma.program.findMany({
        where: {
          isActive: true,
          OR: [{ name: term }, { description: term }, { type: term }],
        },
        take: 10,
        select: {
          id: true, name: true, type: true, icon: true, color: true,
          _count: { select: { beneficiaries: true } },
        },
      }),

      prisma.communityProject.findMany({
        where: {
          OR: [{ title: term }, { description: term }, { category: term }, { location: term }],
        },
        take: 10,
        select: {
          id: true, publicId: true, title: true, category: true,
          location: true, region: true, status: true,
          targetAmount: true, raisedAmount: true,
        },
      }),

      prisma.beneficiary.findMany({
        where: {
          OR: [
            { publicId: term },
            { publicNeedsDesc: term },
            { publicCity: term },
            { publicRegion: term },
            { programType: term },
          ],
        },
        take: 10,
        select: {
          id: true, publicId: true, publicAge: true, publicGender: true,
          publicRegion: true, publicCity: true, programType: true,
          status: true,
          program: { select: { id: true, name: true, icon: true } },
        },
      }),
    ]);

    res.json({ cases, programs, projects, beneficiaries });
  } catch (err: any) {
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
