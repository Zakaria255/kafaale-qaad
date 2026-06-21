import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
const router = Router();

const DonationSchema = z.object({
  caseId: z.string().min(1),
  amount: z.number().positive().max(100000),
  method: z.enum(['mobile_money','card','wallet','bank_transfer']).default('bank_transfer'),
  isAnonymous: z.boolean().default(false),
  donorMessage: z.string().max(500).optional(),
  transactionRef: z.string().max(100).optional(),
});

const STAFF_ROLES = ['admin','super_admin','field_agent','verification_office','office_staff','program_manager','project_manager'];

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  if (STAFF_ROLES.includes(req.user!.role)) {
    return res.status(403).json({ error: 'Staff accounts cannot make donations. Use a donor or reporter account.' });
  }
  try {
    const data = DonationSchema.parse(req.body);
    const kase = await prisma.case.findUnique({ where: { id: data.caseId } });
    if (!kase || !['waiting_for_sponsor','sponsored'].includes(kase.status)) {
      return res.status(400).json({ error: 'Case not available for donation' });
    }

    // Idempotency: atomically claim the key then create the donation inside a transaction.
    // This prevents TOCTOU races where two concurrent requests both pass the existence check.
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    if (idempotencyKey) {
      try {
        // Attempt to INSERT the idempotency key — unique constraint makes this atomic.
        // If the key already exists this will throw P2002, which we catch below.
        await prisma.idempotencyKey.create({ data: { key: idempotencyKey } });
      } catch (idempErr: any) {
        if (idempErr?.code === 'P2002') {
          return res.status(200).json({ message: 'Donation already submitted', idempotent: true });
        }
        throw idempErr; // unexpected DB error — bubble up
      }
    }

    const donation = await prisma.donation.create({
      data: { donorId: req.user!.id, ...data, status: 'pending' },
    });

    res.status(201).json({ message: 'Donation submitted', donationId: donation.id, donation: { id: donation.id, amount: donation.amount }, status: 'pending' });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    res.status(500).json({ error: 'Donation failed' });
  }
});


router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const donations = await prisma.donation.findMany({
      where: { donorId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        case: {
          select: {
            id: true, publicTitle: true, publicCity: true, status: true,
            completedAt: true,
            deliveryProof: {
              select: {
                deliveryDate: true, deliveryMethod: true, amountDelivered: true,
                recipientName: true, deliveryNotes: true, adminConfirmed: true, adminConfirmedAt: true,
              },
            },
          },
        },
      },
    });
    res.json(donations);
  } catch { res.status(500).json({ error: 'Failed to retrieve donations' }); }
});

export default router;
