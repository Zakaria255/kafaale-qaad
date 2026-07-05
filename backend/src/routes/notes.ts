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
  id: true, title: true, body: true, status: true, priority: true, category: true, dueDate: true,
  createdAt: true, updatedAt: true, authorId: true, assigneeId: true,
  author:   { select: { id: true, name: true, role: true } },
  assignee: { select: { id: true, name: true, role: true } },
};

// ── Note categories (admin-managed, stored in the Setting table) ─────────────
const DEFAULT_NOTE_CATEGORIES = ['General', 'Task', 'Reminder', 'Idea', 'Follow-up', 'Urgent'];
async function getNoteCategories(): Promise<string[]> {
  const row = await prisma.setting.findUnique({ where: { key: 'notes.categories' } });
  if (!row) return DEFAULT_NOTE_CATEGORIES;
  try { const a = JSON.parse(row.value); return Array.isArray(a) && a.length ? a : DEFAULT_NOTE_CATEGORIES; }
  catch { return DEFAULT_NOTE_CATEGORIES; }
}
async function saveNoteCategories(cats: string[]) {
  await prisma.setting.upsert({
    where: { key: 'notes.categories' },
    update: { value: JSON.stringify(cats) },
    create: { key: 'notes.categories', value: JSON.stringify(cats) },
  });
}

// GET /api/notes/categories — list categories (admin).
router.get('/categories', async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Only admins' });
  res.json({ categories: await getNoteCategories() });
});

// POST /api/notes/categories { name } — add a category (admin).
router.post('/categories', async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Only admins' });
  const name = String(req.body?.name || '').trim();
  if (!name || name.length > 40) return res.status(400).json({ error: 'Category name must be 1–40 characters' });
  const cats = await getNoteCategories();
  if (!cats.some(c => c.toLowerCase() === name.toLowerCase())) cats.push(name);
  await saveNoteCategories(cats);
  res.json({ categories: cats });
});

// DELETE /api/notes/categories/:name — delete a category (admin).
router.delete('/categories/:name', async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Only admins' });
  const name = decodeURIComponent(req.params.name);
  const cats = (await getNoteCategories()).filter(c => c.toLowerCase() !== name.toLowerCase());
  await saveNoteCategories(cats.length ? cats : DEFAULT_NOTE_CATEGORIES);
  res.json({ categories: cats.length ? cats : DEFAULT_NOTE_CATEGORIES });
});

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

// GET /api/notes — super_admin sees ALL notes; admin sees only their OWN
// (notes they created or are assigned to).
router.get('/', async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Only admins can access the notebook' });
  try {
    const where = req.user!.role === 'super_admin'
      ? {}
      : { OR: [{ authorId: req.user!.id }, { assigneeId: req.user!.id }] };
    const notes = await prisma.note.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: noteSelect,
    });
    res.json({ notes, scope: req.user!.role === 'super_admin' ? 'all' : 'own' });
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
      category:   z.string().max(40).optional(),
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
        category: data.category || 'General',
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
      category:   z.string().max(40).optional(),
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
