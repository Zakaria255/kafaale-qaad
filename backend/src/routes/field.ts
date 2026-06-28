import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { uploadField, uploadDelivery, processUploads } from '../middleware/upload';
import { fraudDetectionService } from '../services/fraudDetectionService';
import { sysLog } from '../services/logger';
const router = Router();
router.use(authenticate, requireRole(['field_agent','admin','super_admin','office_staff']));

router.get('/assignments', async (req: AuthRequest, res: Response) => {
  try {
    const assignments = await prisma.case.findMany({
      where: {
        assignedAgentId: req.user!.id,
        // Include all active workload statuses for this agent
        status: { in: [
          'team_assigned',
          'investigating',
          'investigation_completed',
          'ai_sanitized',
          'waiting_for_sponsor',
          'sponsored',
          'delivering',
          'proof_uploaded',
        ]},
      },
      include: {
        reporter:          { select: { name: true, phone: true } },
        fieldInvestigation: true,
        deliveryProof:     { select: { adminConfirmed: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ assignments });
  } catch { res.status(500).json({ error: 'Failed to load assignments' }); }
});

const InvestigationSchema = z.object({
  caseId:                z.string(),
  victimVerified:        z.coerce.boolean(),
  situationAccurate:     z.coerce.boolean(),
  situationNotes:        z.string().max(2000).optional(),
  estimatedAmountNeeded: z.coerce.number().positive(),
  urgencyConfirmed:      z.enum(['low','medium','high','critical']),
  deliveryFeasible:      z.coerce.boolean().default(true),
  deliveryMethod:        z.string().max(200).optional(),
  deliveryNotes:         z.string().max(1000).optional(),
  fraudRiskScore:        z.coerce.number().int().min(0).max(100).default(0),
  fraudRiskLevel:        z.enum(['low','medium','high']).default('low'),
  fraudRiskNotes:        z.string().max(500).optional(),
  verificationStatus:    z.enum(['verified','rejected','needs_review']),
  officialNotes:         z.string().max(2000).optional(),
  programRecommendation: z.enum(['child_sponsorship','education','medical','family_care','emergency']).optional(),
});

router.post('/investigate',
  uploadField.fields([{ name: 'photos', maxCount: 10 }, { name: 'videos', maxCount: 3 }]),
  async (req: AuthRequest, res: Response) => {
    try {
      await new Promise<void>((resolve, reject) => {
        processUploads('field', ['photos','videos'], req, res, (err) => err ? reject(err) : resolve());
      });
    } catch (uploadErr: any) {
      sysLog.warn('Field investigation upload error (non-blocking)', { error: uploadErr.message });
      // Upload failure is non-blocking — investigation still proceeds without files
    }
    return investigateHandler(req, res);
  }
);

async function investigateHandler(req: AuthRequest, res: Response) {
  try {
    const data = InvestigationSchema.parse(req.body);
    const kase = await prisma.case.findUnique({ where: { id: data.caseId } });
    if (!kase) return res.status(404).json({ error: 'Case not found' });
    if (kase.assignedAgentId !== req.user!.id) return res.status(403).json({ error: 'Not assigned to this case' });

    // Strip fields not in FieldInvestigation model before passing to Prisma
    const { caseId, programRecommendation, ...investigationFields } = data;

    const investigation = await prisma.fieldInvestigation.upsert({
      where:  { caseId },
      update: { ...investigationFields, updatedAt: new Date() },
      create: { caseId, agentId: req.user!.id, ...investigationFields },
    });
    await prisma.case.update({
      where: { id: caseId },
      data: { status: 'investigation_completed', investigationCompletedAt: new Date() },
    });
    // Auto-trigger fraud scoring (non-blocking)
    fraudDetectionService.scoreCaseRisk(data.caseId).catch(() => {});

    // Auto-trigger AI sanitization if ANTHROPIC_API_KEY is set (non-blocking)
    if (process.env.ANTHROPIC_API_KEY) {
      setImmediate(async () => {
        try {
          const { sanitizeCaseWithAI } = await import('../services/aiSanitizationService');
          const fullCase = await prisma.case.findUnique({ where: { id: data.caseId }, include: { fieldInvestigation: true } }) as any;
          if (!fullCase) return;
          const result = await sanitizeCaseWithAI({
            caseId: fullCase.id,
            victimDescription: fullCase.privateDescription || '',
            victimLocation: fullCase.privateAddress || fullCase.privateDistrict || 'Somalia',
            victimSituation: fullCase.privateDescription || '',
            category: fullCase.category,
            emergencyLevel: fullCase.emergencyLevel,
            estimatedAmount: fullCase.fieldInvestigation?.estimatedAmountNeeded || 0,
            agentNotes: fullCase.fieldInvestigation?.officialNotes || '',
          });
          // Only auto-publish if confidence >= 70
          if (result.confidenceScore >= 70) {
            const aiPayload = {
              generatedTitle:    result.generatedTitle,
              generatedStory:    result.generatedStory,
              generatedCategory: fullCase.category,
              generatedCity:     result.generatedCity,
              generatedUrgency:  result.generatedUrgency,
              safeMediaUrls:     JSON.stringify(result.safeMediaUrls || []),
              piiDetected:       result.piiDetected,
              piiRemoved:        JSON.stringify(result.piiRemoved || []),
              mediaFlagged:      JSON.stringify(result.mediaFlagged || []),   // was missing — caused silent data loss
              confidenceScore:   result.confidenceScore,
              tokensUsed:        result.tokensUsed,
            };
            await prisma.aiPublicData.upsert({
              where:  { caseId: fullCase.id },
              update: { ...aiPayload, updatedAt: new Date() },
              create: { caseId: fullCase.id, ...aiPayload },
            });
            await prisma.case.update({ where: { id: fullCase.id }, data: { status: 'ai_sanitized', aiSanitizedAt: new Date() } });
          }
          // Notify office + admins regardless
          const notifyRoles = ['admin','super_admin','office_staff','verification_office'];
          const staff = await prisma.user.findMany({ where: { role: { in: notifyRoles }, isActive: true }, select: { id: true } });
          await prisma.notification.createMany({
            data: staff.map(s => ({ userId: s.id, caseId: fullCase.id, type: 'investigation_completed' as const, title: result.confidenceScore >= 70 ? '🤖 AI Sanitized — Ready for Review' : '📋 Investigation Complete — Manual AI Needed', message: result.confidenceScore >= 70 ? `AI processed case (confidence: ${result.confidenceScore}%). Please review before publishing.` : `AI confidence too low (${result.confidenceScore}%). Manual sanitization required.` })),
          });
        } catch (e: any) {
          // AI failure — notify admins to manually sanitize
          const staff = await prisma.user.findMany({ where: { role: { in: ['admin','super_admin'] }, isActive: true }, select: { id: true } }).catch(() => []);
          await prisma.notification.createMany({ data: staff.map(s => ({ userId: s.id, caseId: data.caseId, type: 'investigation_completed' as const, title: '⚠️ AI Unavailable — Manual Review Needed', message: `AI sanitization failed: ${e.message}. Please sanitize this case manually before publishing.` })) }).catch(() => {});
        }
      });
    } else {
      // No AI key — just notify office/admins
      const notifyRoles = ['admin','super_admin','office_staff','verification_office'];
      const staff = await prisma.user.findMany({ where: { role: { in: notifyRoles }, isActive: true }, select: { id: true } });
      await prisma.notification.createMany({
        data: staff.map(s => ({ userId: s.id, caseId: kase.id, type: 'investigation_completed' as const, title: '📋 Investigation Complete', message: `Field investigation submitted. Manual AI sanitization required before publishing.` })),
      });
    }

    res.status(201).json({ message: 'Investigation submitted', investigationId: investigation.id });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    res.status(500).json({ error: 'Failed to submit investigation' });
  }
}

// ── Delivery Proof Schema ───────────────────────────────────────────────────
const DeliverySchema = z.object({
  caseId:          z.string(),
  deliveryMethod:  z.enum(['cash','food_package','medical_supplies','clothing','goods','mixed']),
  amountDelivered: z.coerce.number().positive(),  // coerce: multipart/form-data sends strings
  recipientName:   z.string().max(200).optional(),
  deliveryNotes:   z.string().max(2000),
  deliveryDate:    z.string().datetime().optional(),
});

// POST /api/field/delivery — Field agent submits delivery proof
router.post('/delivery',
  uploadDelivery.fields([{ name: 'photos', maxCount: 8 }, { name: 'videos', maxCount: 4 }]),
  async (req: AuthRequest, res: Response) => {
    try {
      await new Promise<void>((resolve, reject) => {
        processUploads('delivery', ['photos'], req, res, (err) => err ? reject(err) : resolve());
      });
    } catch (uploadErr: any) {
      sysLog.warn('Delivery proof upload error (non-blocking)', { error: uploadErr.message });
    }
    return deliveryHandler(req, res);
  }
);

async function deliveryHandler(req: AuthRequest, res: Response) {
  try {
    const data = DeliverySchema.parse(req.body);
    const kase = await prisma.case.findUnique({ where: { id: data.caseId } });
    if (!kase) return res.status(404).json({ error: 'Case not found' });
    if (kase.assignedAgentId !== req.user!.id) return res.status(403).json({ error: 'Not assigned to this case' });
    if (!['sponsored','delivering'].includes(kase.status)) {
      return res.status(400).json({ error: 'Case is not in a deliverable state' });
    }

    // Create or update delivery proof record
    const photoUrls: string[]  = (req as any).uploadedByField?.photos || [];
    const videoUrls: string[]  = (req as any).uploadedByField?.videos || [];
    const allMediaUrls = JSON.stringify([...photoUrls, ...videoUrls]);
    const proof = await prisma.deliveryProof.upsert({
      where:  { caseId: data.caseId },
      update: {
        deliveredBy:     req.user!.id,
        deliveryDate:    data.deliveryDate ? new Date(data.deliveryDate) : new Date(),
        deliveryMethod:  data.deliveryMethod,
        amountDelivered: data.amountDelivered,
        recipientName:   data.recipientName,
        deliveryNotes:   data.deliveryNotes,
        photoUrls:       allMediaUrls,
        updatedAt:       new Date(),
      },
      create: {
        caseId:          data.caseId,
        deliveredBy:     req.user!.id,
        deliveryDate:    data.deliveryDate ? new Date(data.deliveryDate) : new Date(),
        deliveryMethod:  data.deliveryMethod,
        amountDelivered: data.amountDelivered,
        recipientName:   data.recipientName,
        deliveryNotes:   data.deliveryNotes,
        photoUrls:       allMediaUrls,
      },
    });

    // Move case to proof_uploaded
    await prisma.case.update({
      where: { id: data.caseId },
      data:  { status: 'proof_uploaded' },
    });

    // Notify all admins
    const admins = await prisma.user.findMany({ where: { role: { in: ['admin','super_admin'] } }, select: { id: true } });
    await prisma.notification.createMany({
      data: admins.map(a => ({
        userId:  a.id,
        caseId:  kase.id,
        type:    'delivery_proof_submitted',
        title:   '📦 Delivery Proof Submitted',
        message: `Field agent submitted delivery proof for case. ${data.amountDelivered} delivered via ${data.deliveryMethod}. Please review and mark complete.`,
      })),
    });

    // Notify reporter that aid was delivered
    if (kase.reporterId) {
      await prisma.notification.create({
        data: {
          userId:  kase.reporterId,
          caseId:  kase.id,
          type:    'aid_delivered',
          title:   '📦 Aid Has Been Delivered',
          message: `The aid for your reported case has been delivered by our field team. Awaiting final admin confirmation.`,
        },
      });
    }

    res.status(201).json({ message: 'Delivery proof submitted', proofId: proof.id });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    res.status(500).json({ error: 'Failed to submit delivery proof' });
  }
}

export default router;
