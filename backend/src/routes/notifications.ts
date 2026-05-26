import { Router, Response } from 'express';
import { prisma } from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const notifs = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifs);
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// IMPORTANT: /read-all must come BEFORE /:id to avoid route conflict
router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true, readAt: new Date() } });
    res.json({ message: 'All marked as read' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user!.id }, data: { isRead: true, readAt: new Date() } });
    res.json({ message: 'Marked as read' });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

export default router;
