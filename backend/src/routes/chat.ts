import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { safeError } from '../middleware/errors';

const router = Router();
router.use(authenticate);

// Internal chat is staff-only (Phase 1). Reporters/donors/normal users excluded.
const STAFF_ROLES = ['admin', 'super_admin', 'field_agent', 'field_team', 'verification_office', 'office_staff', 'program_manager', 'project_manager'];
const ADMIN_ROLES = ['admin', 'super_admin'];
const isStaff = (r: string) => STAFF_ROLES.includes(r);
const isAdmin = (r: string) => ADMIN_ROLES.includes(r);

// Seeded, always-present department / announcement channels (open to all staff).
const DEFAULT_CHANNELS = [
  { slug: 'general',       name: '# general',       type: 'department',   postPolicy: 'members', description: 'Whole-team channel' },
  { slug: 'office',        name: '# office',        type: 'department',   postPolicy: 'members', description: 'Daily operations & case approvals' },
  { slug: 'field',         name: '# field',         type: 'department',   postPolicy: 'members', description: 'Field investigation & delivery' },
  { slug: 'programs',      name: '# programs',      type: 'department',   postPolicy: 'members', description: 'Child sponsorship programs' },
  { slug: 'projects',      name: '# projects',      type: 'department',   postPolicy: 'members', description: 'Community projects' },
  { slug: 'finance',       name: '# finance',       type: 'department',   postPolicy: 'members', description: 'Finance & donations' },
  { slug: 'emergency',     name: '# emergency',     type: 'emergency',    postPolicy: 'members', description: 'Urgent response — high priority' },
  { slug: 'it-support',    name: '# it-support',    type: 'department',   postPolicy: 'members', description: 'System & technical help' },
  { slug: 'announcements', name: '# announcements', type: 'announcement', postPolicy: 'admins',  description: 'Official notices (admins post)' },
];

async function ensureDefaults() {
  const slugs = DEFAULT_CHANNELS.map(c => c.slug);
  const have = await prisma.channel.count({ where: { slug: { in: slugs } } });
  if (have >= DEFAULT_CHANNELS.length) return;
  for (const c of DEFAULT_CHANNELS) {
    await prisma.channel.upsert({
      where: { slug: c.slug },
      update: {},
      create: { slug: c.slug, name: c.name, type: c.type, isOpen: true, postPolicy: c.postPolicy, description: c.description },
    });
  }
}

const memberSel = { user: { select: { id: true, name: true, role: true } } };
const msgInclude = {
  sender:  { select: { id: true, name: true, role: true } },
  replyTo: { select: { id: true, text: true, sender: { select: { name: true } } } },
};

// GET /api/chat/channels — channels the current staff user can see (+ unread).
router.get('/channels', async (req: AuthRequest, res: Response) => {
  if (!isStaff(req.user!.role)) return res.status(403).json({ error: 'Internal chat is staff-only' });
  try {
    await ensureDefaults();
    const uid = req.user!.id;
    const channels = await prisma.channel.findMany({
      where: { OR: [{ isOpen: true }, { members: { some: { userId: uid } } }] },
      orderBy: { lastAt: 'desc' },
      include: { members: { select: { userId: true, lastReadAt: true } } },
    });
    const out = await Promise.all(channels.map(async (ch) => {
      const mine = ch.members.find(m => m.userId === uid);
      const since = mine?.lastReadAt ?? new Date(0);
      const unread = await prisma.chatMessage.count({ where: { channelId: ch.id, createdAt: { gt: since }, NOT: { senderId: uid } } });
      return {
        id: ch.id, name: ch.name, slug: ch.slug, type: ch.type, description: ch.description,
        isOpen: ch.isOpen, postPolicy: ch.postPolicy, lastMessage: ch.lastMessage, lastAt: ch.lastAt,
        memberCount: ch.members.length, unread,
      };
    }));
    res.json({ channels: out });
  } catch (e: any) { return safeError(res, 500, 'Failed to load channels', e); }
});

// GET /api/chat/staff — staff directory for starting DMs.
router.get('/staff', async (req: AuthRequest, res: Response) => {
  if (!isStaff(req.user!.role)) return res.status(403).json({ error: 'Staff only' });
  try {
    const staff = await prisma.user.findMany({
      where: { role: { in: STAFF_ROLES }, isActive: true, id: { not: req.user!.id } },
      select: { id: true, name: true, role: true }, orderBy: { name: 'asc' },
    });
    res.json({ staff });
  } catch (e: any) { return safeError(res, 500, 'Failed to load staff', e); }
});

// Load a channel + whether the current user may access / post.
async function loadAccess(req: AuthRequest, channelId: string) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId }, include: { members: true } });
  if (!channel) return { channel: null as any, canAccess: false, canPost: false, isMember: false };
  const uid = req.user!.id, role = req.user!.role;
  const isMember = channel.members.some(m => m.userId === uid);
  const canAccess = isStaff(role) && (channel.isOpen || isMember);
  const canPost = canAccess && (channel.postPolicy === 'admins' ? isAdmin(role) : true);
  return { channel, canAccess, canPost, isMember };
}

// GET /api/chat/channels/:id/messages
router.get('/channels/:id/messages', async (req: AuthRequest, res: Response) => {
  try {
    const { channel, canAccess } = await loadAccess(req, req.params.id);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    if (!canAccess) return res.status(403).json({ error: 'No access to this channel' });
    const limit = Math.min(parseInt(String(req.query.limit || '50')), 100);
    const messages = await prisma.chatMessage.findMany({
      where: { channelId: channel.id },
      orderBy: { createdAt: 'desc' }, take: limit,
      include: msgInclude,
    });
    res.json({ messages: messages.reverse(), channel: { id: channel.id, name: channel.name, type: channel.type, memberCount: channel.members.length } });
  } catch (e: any) { return safeError(res, 500, 'Failed to load messages', e); }
});

// POST /api/chat/channels/:id/messages
router.post('/channels/:id/messages', async (req: AuthRequest, res: Response) => {
  try {
    const { channel, canPost } = await loadAccess(req, req.params.id);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    if (!canPost) return res.status(403).json({ error: 'You cannot post in this channel' });
    const data = z.object({
      text: z.string().max(5000).optional(),
      attachments: z.array(z.object({ url: z.string(), name: z.string().optional(), type: z.string().optional() })).optional(),
      replyToId: z.string().optional().nullable(),
    }).parse(req.body);
    if (!data.text?.trim() && !(data.attachments?.length)) return res.status(400).json({ error: 'Empty message' });

    const msg = await prisma.chatMessage.create({
      data: {
        channelId: channel.id, senderId: req.user!.id,
        text: data.text?.trim() || '', attachments: JSON.stringify(data.attachments || []),
        replyToId: data.replyToId || null,
      },
      include: msgInclude,
    });
    const preview = (data.text?.trim() || '📎 attachment').slice(0, 120);
    await prisma.channel.update({ where: { id: channel.id }, data: { lastMessage: preview, lastAt: new Date() } });
    // Keep the sender's read cursor current.
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: channel.id, userId: req.user!.id } },
      update: { lastReadAt: new Date() },
      create: { channelId: channel.id, userId: req.user!.id, lastReadAt: new Date() },
    });
    res.status(201).json({ message: msg });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: e.issues });
    return safeError(res, 500, 'Failed to send message', e);
  }
});

// POST /api/chat/channels/:id/read — mark channel read.
router.post('/channels/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const { channel, canAccess } = await loadAccess(req, req.params.id);
    if (!channel || !canAccess) return res.status(404).json({ error: 'Channel not found' });
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: channel.id, userId: req.user!.id } },
      update: { lastReadAt: new Date() },
      create: { channelId: channel.id, userId: req.user!.id, lastReadAt: new Date() },
    });
    res.json({ ok: true });
  } catch (e: any) { return safeError(res, 500, 'Failed to mark read', e); }
});

// POST /api/chat/dm { userId } — get or create a 1:1 channel with another staff member.
router.post('/dm', async (req: AuthRequest, res: Response) => {
  if (!isStaff(req.user!.role)) return res.status(403).json({ error: 'Staff only' });
  try {
    const otherId = String(req.body?.userId || '');
    const other = await prisma.user.findUnique({ where: { id: otherId } });
    if (!other || !isStaff(other.role)) return res.status(400).json({ error: 'Invalid staff user' });

    // Find an existing DM channel that has exactly these two members.
    const existing = await prisma.channel.findFirst({
      where: { type: 'dm', AND: [{ members: { some: { userId: req.user!.id } } }, { members: { some: { userId: otherId } } }] },
    });
    if (existing) return res.json({ channel: existing });

    const channel = await prisma.channel.create({
      data: {
        name: other.name, type: 'dm', isOpen: false, postPolicy: 'members', createdBy: req.user!.id,
        members: { create: [{ userId: req.user!.id, role: 'owner' }, { userId: otherId }] },
      },
    });
    res.status(201).json({ channel });
  } catch (e: any) { return safeError(res, 500, 'Failed to open DM', e); }
});

// Load a message + whether the current user may access its channel.
async function loadMsg(req: AuthRequest, msgId: string) {
  const msg = await prisma.chatMessage.findUnique({ where: { id: msgId }, include: { channel: { include: { members: true } } } });
  if (!msg) return { msg: null as any, access: false };
  const uid = req.user!.id, role = req.user!.role;
  const isMember = msg.channel.members.some(m => m.userId === uid);
  const access = isStaff(role) && (msg.channel.isOpen || isMember);
  return { msg, access };
}

// PATCH /api/chat/messages/:id — edit your own message.
router.patch('/messages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { msg, access } = await loadMsg(req, req.params.id);
    if (!msg || !access) return res.status(404).json({ error: 'Message not found' });
    if (msg.senderId !== req.user!.id) return res.status(403).json({ error: 'You can only edit your own messages' });
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Message cannot be empty' });
    const updated = await prisma.chatMessage.update({ where: { id: msg.id }, data: { text, editedAt: new Date() }, include: msgInclude });
    res.json({ message: updated });
  } catch (e: any) { return safeError(res, 500, 'Failed to edit message', e); }
});

// DELETE /api/chat/messages/:id — delete your own message (admins can delete any).
router.delete('/messages/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { msg, access } = await loadMsg(req, req.params.id);
    if (!msg || !access) return res.status(404).json({ error: 'Message not found' });
    if (msg.senderId !== req.user!.id && !isAdmin(req.user!.role)) return res.status(403).json({ error: 'Not allowed to delete this message' });
    await prisma.chatMessage.updateMany({ where: { replyToId: msg.id }, data: { replyToId: null } });
    await prisma.chatMessage.delete({ where: { id: msg.id } });
    res.json({ ok: true });
  } catch (e: any) { return safeError(res, 500, 'Failed to delete message', e); }
});

// POST /api/chat/messages/:id/pin { pinned } — pin/unpin a message (any channel member).
router.post('/messages/:id/pin', async (req: AuthRequest, res: Response) => {
  try {
    const { msg, access } = await loadMsg(req, req.params.id);
    if (!msg || !access) return res.status(404).json({ error: 'Message not found' });
    const pinned = req.body?.pinned !== false;
    const updated = await prisma.chatMessage.update({ where: { id: msg.id }, data: { pinned }, include: msgInclude });
    res.json({ message: updated });
  } catch (e: any) { return safeError(res, 500, 'Failed to pin message', e); }
});

// POST /api/chat/channels — admin creates a group channel with members.
router.post('/channels', async (req: AuthRequest, res: Response) => {
  if (!isAdmin(req.user!.role)) return res.status(403).json({ error: 'Only admins can create channels' });
  try {
    const data = z.object({
      name: z.string().min(1).max(80),
      description: z.string().max(300).optional(),
      memberIds: z.array(z.string()).optional(),
    }).parse(req.body);
    const ids = Array.from(new Set([req.user!.id, ...(data.memberIds || [])]));
    const channel = await prisma.channel.create({
      data: {
        name: data.name, description: data.description || '', type: 'group', isOpen: false, postPolicy: 'members',
        createdBy: req.user!.id,
        members: { create: ids.map(id => ({ userId: id, role: id === req.user!.id ? 'owner' : 'member' })) },
      },
    });
    res.status(201).json({ channel });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: e.issues });
    return safeError(res, 500, 'Failed to create channel', e);
  }
});

export default router;
