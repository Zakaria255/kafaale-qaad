import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
const router = Router();
router.use(authenticate, requireRole(['field_agent','admin','super_admin']));

router.get('/assignments', async (req: AuthRequest, res: Response) => {
  try {
    const cases = await prisma.case.findMany({
      where: { assignedAgentId: req.user!.id, status: { in: ['team_assigned','investigating','investigation_completed','ai_sanitized','sponsored','delivering','proof_uploaded'] } },
      include: { reporter: { select: { name: true, phone: true } }, fieldInvestigation: true },
    });
    res.json(cases);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

const InvestigationSchema = z.object({
  caseId: z.string(),
  victimVerified: z.boolean(),
  situationAccurate: z.boolean(),
  situationNotes: z.string().max(2000).optional(),
  estimatedAmountNeeded: z.number().positive(),
  urgencyConfirmed: z.enum(['low','medium','high','critical']),
  deliveryFeasible: z.boolean().default(true),
  deliveryMethod: z.string().max(200).optional(),
  deliveryNotes: z.string().max(1000).optional(),
  fraudRiskScore: z.number().int().min(0).max(100).default(0),
  fraudRiskLevel: z.enum(['low','medium','high']).default('low'),
  fraudRiskNotes: z.string().max(500).optional(),
  verificationStatus: z.enum(['verified','rejected','needs_review']),
  officialNotes: z.string().max(2000).optional(),
});

router.post('/investigate', async (req: AuthRequest, res: Response) => {
  try {
    const data = InvestigationSchema.parse(req.body);
    const kase = await prisma.case.findUnique({ where: { id: data.caseId } });
    if (!kase) return res.status(404).json({ error: 'Case not found' });
    if (kase.assignedAgentId !== req.user!.id) return res.status(403).json({ error: 'Not assigned to this case' });

    const investigation = await prisma.fieldInvestigation.upsert({
      where: { caseId: data.caseId },
      update: { ...data, updatedAt: new Date() },
      create: { ...data, agentId: req.user!.id },
    });
    await prisma.case.update({
      where: { id: data.caseId },
      data: { status: 'investigation_completed', investigationCompletedAt: new Date() },
    });
    const admins = await prisma.user.findMany({ where: { role: { in: ['admin','super_admin'] } }, select: { id: true } });
    await prisma.notification.createMany({
      data: admins.map(a => ({ userId: a.id, caseId: kase.id, type: 'investigation_completed', title: '📋 Investigation Complete', message: `Field investigation submitted for case. Ready for AI sanitization.` })),
    });
    res.status(201).json({ message: 'Investigation submitted', investigationId: investigation.id });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    res.status(500).json({ error: 'Failed to submit investigation' });
  }
});

export default router;
