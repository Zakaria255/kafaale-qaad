import { Router, Response, Request } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { uploadCases, processUploads, getMediaType } from '../middleware/upload';
import { sysLog } from '../services/logger';

const router = Router();

const CreateCaseSchema = z.object({
  privateVictimName:   z.string().min(2).max(100).optional(),
  privateVictimPhone:  z.string().max(20).optional(),
  privateAddress:      z.string().max(500).optional(),
  privateDistrict:     z.string().max(100).optional(),
  privateGpsLat:       z.coerce.number().min(-90).max(90).optional(),
  privateGpsLng:       z.coerce.number().min(-180).max(180).optional(),
  privateFamilySize:   z.coerce.number().int().min(1).max(50).optional(),
  privateVictimAge:    z.coerce.number().int().min(0).max(120).optional(),
  privateVictimGender: z.enum(['male','female','other']).optional(),
  privateDescription:  z.string().min(10).max(3000),
  privateNotes:        z.string().max(1000).optional(),
  privateGuardianName: z.string().max(100).optional(),
  category:            z.enum(['food','medical','shelter','orphan','disaster','education','child_support','family_support','emergency','water_project','school_project','community_project','other']),
  emergencyLevel:      z.enum(['low','medium','high','critical']),
  targetGoal:          z.number().positive().max(1000000).optional(),
  caseType:            z.enum(['emergency','child_support','community_report']).optional(),
  needsChecklist:      z.array(z.string()).optional(),
  communityVillageName: z.string().max(200).optional(),
  communityChildCount:  z.number().int().min(1).max(10000).optional(),
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

// GET /api/cases/my — Reporter's own cases list
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cases = await prisma.case.findMany({
      where: { reporterId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, caseRef: true, category: true, caseType: true, emergencyLevel: true, status: true, publicTitle: true, privateDescription: true, privateDistrict: true, publicCity: true, targetGoal: true, totalRaised: true, createdAt: true, rejectionReason: true },
    });
    res.json({ cases });
  } catch { res.status(500).json({ error: 'Failed to retrieve your cases' }); }
});

// GET /api/cases/my/:id — Reporter's own case detail (private data)
router.get('/my/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const kase = await prisma.case.findFirst({
      where: { id: req.params.id, reporterId: req.user!.id },
      select: {
        id: true, caseRef: true, category: true, caseType: true, emergencyLevel: true, status: true,
        privateVictimName: true, privateDistrict: true, privateFamilySize: true, privateDescription: true,
        needsChecklist: true, publicTitle: true, publicCity: true, publicCountry: true,
        targetGoal: true, totalRaised: true, rejectionReason: true,
        createdAt: true, updatedAt: true, teamAssignedAt: true, sponsoredAt: true, completedAt: true,
        mediaFiles: { select: { id: true, url: true, type: true, isPublic: true } },
        fieldInvestigation: { select: { verificationStatus: true, createdAt: true, deliveryFeasible: true } },
        deliveryProof: { select: { deliveryDate: true, deliveryMethod: true, amountDelivered: true, adminConfirmed: true } },
      },
    });
    if (!kase) return res.status(404).json({ error: 'Case not found' });
    res.json({ case: kase });
  } catch { res.status(500).json({ error: 'Failed to retrieve case' }); }
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

// POST /api/cases — Submit new case (multipart/form-data supported)
router.post('/',
  authenticate,
  uploadCases.fields([{ name: 'media', maxCount: 8 }, { name: 'documents', maxCount: 5 }]),
  async (req: AuthRequest, res: Response) => {
    // Upload files first
    await new Promise<void>((resolve, reject) => {
      processUploads('cases', ['media','documents'], req, res, (err) => err ? reject(err) : resolve());
    }).catch((err) => { throw err; });

    try {
      // needsChecklist arrives as JSON string from multipart; coerce it
      if (typeof req.body.needsChecklist === 'string') {
        try { req.body.needsChecklist = JSON.parse(req.body.needsChecklist); } catch { req.body.needsChecklist = []; }
      }

      const data = CreateCaseSchema.parse(req.body);
      const year = new Date().getFullYear();

      // Generate a collision-resistant caseRef using a crypto random suffix.
      // This replaces the COUNT()-based approach which had TOCTOU race conditions.
      let kase: Awaited<ReturnType<typeof prisma.case.create>>;
      let attempts = 0;
      while (true) {
        const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        const caseRef = `KQ-${year}-${randomSuffix}`;
        try {
          kase = await prisma.case.create({
            data: {
              reporterId:     req.user!.id,
              ...data,
              needsChecklist: data.needsChecklist || [],
              caseType:       data.caseType || 'emergency',
              status:         'pending_review',
              caseRef,
            },
          });
          break;
        } catch (createErr: any) {
          if (createErr.code === 'P2002' && ++attempts < 5) continue; // collision — retry (extremely rare)
          throw createErr;
        }
      }

      // Store uploaded file URLs in CaseMedia
      const uploaded = (req as any).uploadedByField || {};
      const mediaUrls: string[] = [...(uploaded.media || []), ...(uploaded.documents || [])];
      if (mediaUrls.length > 0) {
        const files = (req.files as any) || {};
        const allFiles: any[] = [
          ...(files.media || []),
          ...(files.documents || []),
        ];
        await prisma.caseMedia.createMany({
          data: mediaUrls.map((url, i) => ({
            caseId:     kase.id,
            url,
            filename:   allFiles[i]?.originalname || 'upload',
            mimeType:   allFiles[i]?.mimetype || 'application/octet-stream',
            sizeBytes:  allFiles[i]?.size,
            type:       getMediaType(allFiles[i]?.mimetype || ''),
            uploadedBy: req.user!.id,
          })),
        });
      }

      // Notify office staff + admins
      const notifyRoles = ['admin','super_admin','office_staff'];
      const notifyUsers = await prisma.user.findMany({ where: { role: { in: notifyRoles }, isActive: true }, select: { id: true } });
      await prisma.notification.createMany({
        data: notifyUsers.map(u => ({
          userId: u.id, caseId: kase.id, type: 'case_submitted',
          title: '🚨 New Emergency Report',
          message: `New ${data.emergencyLevel.toUpperCase()} priority ${data.category} case requires review.`,
        })),
      });
      sysLog.info(`📝 Case submitted: ${kase.id} by ${req.user!.id} — ${mediaUrls.length} files`);
      res.status(201).json({ message: 'Case submitted successfully', caseId: kase.id, status: kase.status, filesUploaded: mediaUrls.length });
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
      res.status(500).json({ error: 'Failed to submit case' });
    }
  }
);

export default router;
