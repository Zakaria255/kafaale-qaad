import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
const router = Router();

// GET /api/impact — Full M&E KPI dashboard
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [
      totalCases, completedCases, activeCases,
      donationStats, deliveryStats,
      activeSponsorships, childrenSponsored,
      projectStats, beneficiaryStats,
      medicalCases, waterProjects,
      totalInvestigations, verifiedInvestigations,
      countriesRows,
    ] = await Promise.all([
      prisma.case.count({ where: { status: { in: ['waiting_for_sponsor','sponsored','delivering','completed'] } } }),
      prisma.case.count({ where: { status: 'completed' } }),
      prisma.case.count({ where: { status: { in: ['waiting_for_sponsor','sponsored','delivering'] } } }),
      prisma.donation.aggregate({ where: { status: 'confirmed' }, _sum: { amount: true }, _count: true }),
      prisma.deliveryProof.aggregate({ _sum: { amountDelivered: true }, _count: true }),
      prisma.sponsorship.count({ where: { status: 'active' } }),
      prisma.beneficiary.count({ where: { programType: 'child_sponsorship', status: 'sponsored' } }),
      prisma.communityProject.aggregate({ _count: true, _sum: { totalRaised: true } }),
      prisma.beneficiary.count({ where: { status: { in: ['sponsored','completed','verified'] } } }),
      prisma.case.count({ where: { category: 'medical', status: 'completed' } }),
      prisma.communityProject.count({ where: { category: 'water', status: { in: ['in_progress','completed'] } } }),
      // Real verification rate: share of completed field investigations that came back "verified"
      prisma.fieldInvestigation.count({ where: { verificationStatus: { in: ['verified', 'rejected'] } } }),
      prisma.fieldInvestigation.count({ where: { verificationStatus: 'verified' } }),
      // Real country count: distinct non-null public countries across published cases
      prisma.case.findMany({ where: { publicCountry: { not: null } }, distinct: ['publicCountry'], select: { publicCountry: true } }),
    ]);

    const verificationRate = totalInvestigations > 0
      ? Math.round((verifiedInvestigations / totalInvestigations) * 100)
      : 0;
    const countriesReached = countriesRows.length;

    res.json({
      // Cases
      totalCasesPublished:    totalCases,
      casesCompleted:         completedCases,
      casesActive:            activeCases,
      verificationRate,
      familiesHelped:         completedCases,

      // Financial
      totalRaised:            Number(donationStats._sum.amount || 0),
      totalDonations:         donationStats._count,
      totalDelivered:         Number(deliveryStats._sum.amountDelivered || 0),
      deliveriesCompleted:    deliveryStats._count,

      // Programs
      activeSponsorships,
      childrenSponsored,
      beneficiariesSupported: beneficiaryStats,

      // Projects
      totalProjects:          projectStats._count,
      projectFunding:         Number(projectStats._sum.totalRaised || 0),
      waterProjectsActive:    waterProjects,

      // Medical
      medicalCasesCompleted:  medicalCases,
      countriesReached,
    });
  } catch { res.status(500).json({ error: 'Failed to retrieve impact stats' }); }
});

export default router;
