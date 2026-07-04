import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sysLog } from '../services/logger';

const router = Router();
router.use(authenticate);

const ADMIN_ROLES = ['admin', 'super_admin'];
const isAdmin = (req: AuthRequest) => ADMIN_ROLES.includes(req.user!.role);

const noteSelect = {
  id: true, title: true, body: true, status: true, priority: true, dueDate: true,
  createdAt: true, updatedAt: true, authorId: true, assigneeId: true,
  author:   { select: { id: true, name: true, role: true } },
  assignee: { select: { id: true, name: true, role: true } },
};

// GET /api/notes/mine — any authenticated user: notes assigned to them.
router.get('/mine', async (req: AuthRequest, res: Response) => {
  try {
    const notes = await prisma.note.findMany({
      where: { assigneeId: req.user!.id },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: noteSelect,
    });
    res.json({ notes });
  } catch { res.status(500).json({ error: 'Failed to load notes' }); }
});

// GET /api/notes — admin/super_admin: the shared notebook.
router.get('/', async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Only admins can access the notebook' });
  try {
    const notes = await prisma.note.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: noteSelect,
    });
    res.json({ notes });
  } catch { res.status(500).json({ error: 'Failed to load notes' }); }
});

// POST /api/notes — create a note / assign a task.
router.post('/', async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Only admins can create notes' });
  try {
    const data = z.object({
      title:      z.string().min(1).max(200),
      body:       z.string().max(5000).optional(),
      status:     z.enum(['todo', 'doing', 'done']).optional(),
      priority:   z.enum(['low', 'normal', 'high']).optional(),
      assigneeId: z.string().optional().nullable(),
      dueDate:    z.string().datetime().optional().nullable(),
    }).parse(req.body);

    if (data.assigneeId) {
      const exists = await prisma.user.findUnique({ where: { id: data.assigneeId } });
      if (!exists) return res.status(400).json({ error: 'Assignee not found' });
    }

    const note = await prisma.note.create({
      data: {
        title: data.title,
        body: data.body || '',
        status: data.status || 'todo',
        priority: data.priority || 'normal',
        authorId: req.user!.id,
        assigneeId: data.assigneeId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      select: noteSelect,
    });

    // Notify the assignee, if any.
    if (note.assigneeId && note.assigneeId !== req.user!.id) {
      await prisma.notification.create({
        data: {
          userId: note.assigneeId,
          type: 'task_assigned',
          title: '📓 New task assigned',
          message: `You have been assigned: "${note.title}"`,
        },
      }).catch(() => {});
    }
    sysLog.info(`Note created by ${req.user!.email}: ${note.title}`);
    res.status(201).json({ note });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PATCH /api/notes/:id — update. Admins can edit any; an assignee may update the status of their own task.
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const admin = isAdmin(req);
    const isAssignee = note.assigneeId === req.user!.id;
    if (!admin && !isAssignee) return res.status(403).json({ error: 'Not allowed to edit this note' });

    const data = z.object({
      title:      z.string().min(1).max(200).optional(),
      body:       z.string().max(5000).optional(),
      status:     z.enum(['todo', 'doing', 'done']).optional(),
      priority:   z.enum(['low', 'normal', 'high']).optional(),
      assigneeId: z.string().optional().nullable(),
      dueDate:    z.string().datetime().optional().nullable(),
    }).parse(req.body);

    // A non-admin assignee may only change the status.
    const patch: any = admin ? { ...data } : {};
    if (!admin && data.status) patch.status = data.status;
    if (admin && data.dueDate !== undefined) patch.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (admin && data.assigneeId !== undefined) patch.assigneeId = data.assigneeId || null;
    if ('dueDate' in patch && typeof patch.dueDate === 'string') patch.dueDate = new Date(patch.dueDate);

    const updated = await prisma.note.update({ where: { id: req.params.id }, data: patch, select: noteSelect });
    res.json({ note: updated });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE /api/notes/:id — admin/super_admin only.
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Only admins can delete notes' });
  try {
    await prisma.note.delete({ where: { id: req.params.id } });
    res.json({ message: 'Note deleted' });
  } catch { res.status(500).json({ error: 'Failed to delete note' }); }
});

export default router;
