import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
const router = Router();
router.use(authenticate);

// GET /api/messages/threads — All threads for current user
router.get('/threads', async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.user!.id;
    const threads = await prisma.messageThread.findMany({
      where: { OR: [{ participantA: uid }, { participantB: uid }] },
      orderBy: { lastAt: 'desc' },
      include: {
        userA: { select: { id: true, name: true, role: true } },
        userB: { select: { id: true, name: true, role: true } },
        messages: { where: { isRead: false, senderId: { not: uid } }, select: { id: true } },
      },
    });

    const result = threads.map(t => {
      const other = t.participantA === uid ? t.userB : t.userA;
      return {
        id:               t.id,
        participantId:    other.id,
        participantName:  other.name,
        participantRole:  other.role,
        lastMessage:      t.lastMessage,
        lastAt:           t.lastAt,
        caseId:           t.caseId,
        unread:           t.messages.length,
      };
    });

    res.json({ threads: result });
  } catch { res.status(500).json({ error: 'Failed to load threads' }); }
});

// GET /api/messages/threads/:id — Messages in a thread
router.get('/threads/:id', async (req: AuthRequest, res: Response) => {
  try {
    const uid    = req.user!.id;
    const thread = await prisma.messageThread.findUnique({
      where: { id: req.params.id },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { id: true, name: true, role: true } } } },
      },
    });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    if (thread.participantA !== uid && thread.participantB !== uid) return res.status(403).json({ error: 'Access denied' });

    // Mark as read
    await prisma.message.updateMany({ where: { threadId: req.params.id, senderId: { not: uid }, isRead: false }, data: { isRead: true } });

    const messages = thread.messages.map(m => ({
      id:          m.id,
      senderId:    m.senderId,
      senderName:  m.sender.name,
      senderRole:  m.sender.role,
      text:        m.text,
      isRead:      m.isRead,
      createdAt:   m.createdAt,
    }));
    res.json({ messages });
  } catch { res.status(500).json({ error: 'Failed to load messages' }); }
});

// POST /api/messages/threads — Start a new thread
router.post('/threads', async (req: AuthRequest, res: Response) => {
  try {
    const { recipientId, text, caseId } = z.object({
      recipientId: z.string().min(1),
      text:        z.string().min(1).max(2000),
      caseId:      z.string().optional(),
    }).parse(req.body);

    const uid = req.user!.id;
    if (uid === recipientId) return res.status(400).json({ error: 'Cannot message yourself' });

    const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } });
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

    // Find or create thread (order IDs to ensure unique pair)
    const [a, b] = [uid, recipientId].sort();
    let thread = await prisma.messageThread.findUnique({ where: { participantA_participantB: { participantA: a, participantB: b } } });
    if (!thread) {
      thread = await prisma.messageThread.create({ data: { participantA: a, participantB: b, caseId, lastMessage: text, lastAt: new Date() } });
    }

    const message = await prisma.message.create({ data: { threadId: thread.id, senderId: uid, text } });
    await prisma.messageThread.update({ where: { id: thread.id }, data: { lastMessage: text, lastAt: new Date() } });

    // Notify recipient
    await prisma.notification.create({
      data: { userId: recipientId, caseId: caseId || null, type: 'new_message', title: '💬 New Message', message: `You have a new message` },
    }).catch(() => {});

    res.status(201).json({ thread: { id: thread.id }, message: { id: message.id, text } });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// POST /api/messages/threads/:id — Reply in existing thread
router.post('/threads/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { text } = z.object({ text: z.string().min(1).max(2000) }).parse(req.body);
    const uid    = req.user!.id;
    const thread = await prisma.messageThread.findUnique({ where: { id: req.params.id } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    if (thread.participantA !== uid && thread.participantB !== uid) return res.status(403).json({ error: 'Access denied' });

    const message = await prisma.message.create({ data: { threadId: req.params.id, senderId: uid, text } });
    await prisma.messageThread.update({ where: { id: req.params.id }, data: { lastMessage: text, lastAt: new Date() } });

    const recipientId = thread.participantA === uid ? thread.participantB : thread.participantA;
    await prisma.notification.create({
      data: { userId: recipientId, caseId: thread.caseId, type: 'new_message', title: '💬 New Message', message: `You have a new message` },
    }).catch(() => {});

    res.status(201).json({ message: { id: message.id, text, createdAt: message.createdAt } });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
