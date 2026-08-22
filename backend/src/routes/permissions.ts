import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { safeError } from '../middleware/errors';
import { PERMISSION_CATALOG, PERMISSION_MODULES, PERMISSION_BY_KEY } from '../services/permissionCatalog';
import { resolveEffectivePermissions, canGrant } from '../services/permissionService';
import { requirePermission } from '../middleware/permissions';

const router = Router();
router.use(authenticate, requireRole(['admin', 'super_admin']));

async function logChange(req: AuthRequest, targetUserId: string, action: string, permissionKey: string | null, previousValue: string | null, newValue: string | null, reason?: string) {
  await prisma.permissionAuditLog.create({
    data: {
      actorId: req.user!.id,
      targetUserId,
      action,
      permissionKey,
      previousValue,
      newValue,
      reason: reason || null,
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent']?.toString().slice(0, 255) || null,
    },
  });
}

// GET /api/admin/permissions/catalog
router.get('/catalog', async (_req: AuthRequest, res: Response) => {
  res.json({ permissions: PERMISSION_CATALOG, modules: PERMISSION_MODULES });
});

// GET /api/admin/permissions/stats
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [totalUsers, usersWithCustom, groupCount, recentlyUpdated, suspended] = await Promise.all([
      prisma.user.count(),
      prisma.userPermission.findMany({ distinct: ['userId'], select: { userId: true } }).then(r => r.length),
      prisma.permissionGroup.count(),
      prisma.permissionAuditLog.findMany({ where: { createdAt: { gte: weekAgo } }, distinct: ['targetUserId'], select: { targetUserId: true } }).then(r => r.length),
      prisma.user.count({ where: { isActive: false } }),
    ]);
    res.json({ totalUsers, usersWithCustomPermissions: usersWithCustom, permissionGroups: groupCount, recentlyUpdated, suspendedAccess: suspended });
  } catch (e: any) { return safeError(res, 500, 'Failed to load stats', e); }
});

// GET /api/admin/permissions/users?search=&role=&department=&active=
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { search, role, department, active } = req.query as Record<string, string>;
    const where: any = {};
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }];
    if (role) where.role = role;
    if (department) where.department = department;
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, department: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { name: 'asc' },
      take: 100,
    });
    const customCounts = await prisma.userPermission.groupBy({ by: ['userId'], _count: { id: true } });
    const countMap = new Map(customCounts.map(c => [c.userId, c._count.id]));
    res.json({ users: users.map(u => ({ ...u, customPermissionCount: countMap.get(u.id) || 0 })) });
  } catch (e: any) { return safeError(res, 500, 'Failed to search users', e); }
});

// GET /api/admin/permissions/users/:id
router.get('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, email: true, role: true, department: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [groups, individual, effective] = await Promise.all([
      prisma.userPermissionGroup.findMany({ where: { userId: user.id }, include: { group: true } }),
      prisma.userPermission.findMany({ where: { userId: user.id } }),
      resolveEffectivePermissions(user.id),
    ]);

    res.json({
      user,
      groups: groups.map(g => g.group),
      individual,
      effective: Array.from(effective.values()),
      inheritedCount: Array.from(effective.values()).filter(e => e.granted && e.source !== 'user').length,
      additionalCount: individual.filter(p => p.type === 'grant').length,
      deniedCount: individual.filter(p => p.type === 'deny').length,
      effectiveCount: Array.from(effective.values()).filter(e => e.granted).length,
    });
  } catch (e: any) { return safeError(res, 500, 'Failed to load user', e); }
});

const AssignSchema = z.object({
  permissionKey: z.string(),
  type: z.enum(['grant', 'deny']),
  scope: z.enum(['own', 'team', 'department', 'organization', 'global']).default('own'),
  reason: z.string().max(500).optional(),
});

// POST /api/admin/permissions/users/:id/permissions
router.post('/users/:id/permissions', requirePermission('user.permission_assign'), async (req: AuthRequest, res: Response) => {
  try {
    if (req.params.id === req.user!.id) return res.status(403).json({ error: 'You cannot assign permissions to yourself' });
    const data = AssignSchema.parse(req.body);
    if (!PERMISSION_BY_KEY.has(data.permissionKey)) return res.status(400).json({ error: 'Unknown permission key' });

    const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (data.type === 'grant') {
      const check = await canGrant(req.user!.id, req.user!.role, data.permissionKey);
      if (!check.allowed) return res.status(403).json({ error: check.reason });
    } else if (PERMISSION_BY_KEY.get(data.permissionKey)?.superAdminOnly && req.user!.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only a Super Admin can modify this permission' });
    }

    const previous = await prisma.userPermission.findUnique({ where: { userId_permissionKey: { userId: target.id, permissionKey: data.permissionKey } } });

    const updated = await prisma.userPermission.upsert({
      where: { userId_permissionKey: { userId: target.id, permissionKey: data.permissionKey } },
      update: { type: data.type, scope: data.scope, assignedBy: req.user!.id, reason: data.reason },
      create: { userId: target.id, permissionKey: data.permissionKey, type: data.type, scope: data.scope, assignedBy: req.user!.id, reason: data.reason },
    });

    await logChange(req, target.id, data.type, data.permissionKey, previous ? `${previous.type}:${previous.scope}` : null, `${data.type}:${data.scope}`, data.reason);
    res.status(201).json(updated);
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: e.issues });
    return safeError(res, 500, 'Failed to assign permission', e);
  }
});

// DELETE /api/admin/permissions/users/:id/permissions/:key
router.delete('/users/:id/permissions/:key', requirePermission('user.permission_assign'), async (req: AuthRequest, res: Response) => {
  try {
    if (req.params.id === req.user!.id) return res.status(403).json({ error: 'You cannot modify your own permissions' });
    const existing = await prisma.userPermission.findUnique({ where: { userId_permissionKey: { userId: req.params.id, permissionKey: req.params.key } } });
    if (!existing) return res.status(404).json({ error: 'No custom permission to remove' });

    await prisma.userPermission.delete({ where: { userId_permissionKey: { userId: req.params.id, permissionKey: req.params.key } } });
    await logChange(req, req.params.id, 'revoke', req.params.key, `${existing.type}:${existing.scope}`, null);
    res.json({ message: 'Custom permission removed — user now falls back to their role/group defaults' });
  } catch (e: any) { return safeError(res, 500, 'Failed to remove permission', e); }
});

// POST /api/admin/permissions/users/:id/copy-permissions/:fromUserId
router.post('/users/:id/copy-permissions/:fromUserId', async (req: AuthRequest, res: Response) => {
  try {
    if (req.params.id === req.user!.id) return res.status(403).json({ error: 'You cannot assign permissions to yourself' });
    const source = await prisma.userPermission.findMany({ where: { userId: req.params.fromUserId } });
    let copied = 0;
    for (const perm of source) {
      if (perm.type === 'grant') {
        const check = await canGrant(req.user!.id, req.user!.role, perm.permissionKey);
        if (!check.allowed) continue; // skip anything the actor isn't authorized to grant themselves
      }
      await prisma.userPermission.upsert({
        where: { userId_permissionKey: { userId: req.params.id, permissionKey: perm.permissionKey } },
        update: { type: perm.type, scope: perm.scope, assignedBy: req.user!.id, reason: `Copied from another user` },
        create: { userId: req.params.id, permissionKey: perm.permissionKey, type: perm.type, scope: perm.scope, assignedBy: req.user!.id, reason: `Copied from another user` },
      });
      await logChange(req, req.params.id, perm.type, perm.permissionKey, null, `${perm.type}:${perm.scope}`, `Copied from user ${req.params.fromUserId}`);
      copied++;
    }
    res.json({ message: `${copied} permission(s) copied`, copied });
  } catch (e: any) { return safeError(res, 500, 'Failed to copy permissions', e); }
});

// ── Permission groups ─────────────────────────────────────────────────────
router.get('/groups', async (_req: AuthRequest, res: Response) => {
  try {
    const groups = await prisma.permissionGroup.findMany({ include: { permissions: true, _count: { select: { members: true } } }, orderBy: { name: 'asc' } });
    res.json({ groups });
  } catch (e: any) { return safeError(res, 500, 'Failed to load groups', e); }
});

router.post('/groups', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = z.object({ name: z.string().min(2).max(80), description: z.string().max(300).optional() }).parse(req.body);
    const group = await prisma.permissionGroup.create({ data: { name, description, createdBy: req.user!.id } });
    res.status(201).json(group);
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: e.issues });
    return safeError(res, 500, 'Failed to create group', e);
  }
});

router.patch('/groups/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = z.object({ name: z.string().min(2).max(80).optional(), description: z.string().max(300).optional() }).parse(req.body);
    const group = await prisma.permissionGroup.update({ where: { id: req.params.id }, data: { name, description } });
    res.json(group);
  } catch (e: any) { return safeError(res, 500, 'Failed to update group', e); }
});

router.post('/groups/:id/permissions', async (req: AuthRequest, res: Response) => {
  try {
    const { permissionKey, scope } = z.object({ permissionKey: z.string(), scope: z.enum(['own', 'team', 'department', 'organization', 'global']).default('own') }).parse(req.body);
    if (!PERMISSION_BY_KEY.has(permissionKey)) return res.status(400).json({ error: 'Unknown permission key' });
    const check = await canGrant(req.user!.id, req.user!.role, permissionKey);
    if (!check.allowed) return res.status(403).json({ error: check.reason });

    const gp = await prisma.groupPermission.upsert({
      where: { groupId_permissionKey: { groupId: req.params.id, permissionKey } },
      update: { scope },
      create: { groupId: req.params.id, permissionKey, scope },
    });
    res.status(201).json(gp);
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: e.issues });
    return safeError(res, 500, 'Failed to add permission to group', e);
  }
});

router.post('/groups/:id/members', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = z.object({ userId: z.string() }).parse(req.body);
    if (userId === req.user!.id) return res.status(403).json({ error: 'You cannot add yourself to a permission group' });

    // Membership grants every permission the group holds — so joining a group must be
    // held to the same authority-ceiling rule as a direct grant, or it's a bypass of it.
    const groupPerms = await prisma.groupPermission.findMany({ where: { groupId: req.params.id } });
    for (const gp of groupPerms) {
      const check = await canGrant(req.user!.id, req.user!.role, gp.permissionKey);
      if (!check.allowed) return res.status(403).json({ error: `Cannot add member: this group includes "${gp.permissionKey}" — ${check.reason}` });
    }

    const membership = await prisma.userPermissionGroup.upsert({
      where: { userId_groupId: { userId, groupId: req.params.id } },
      update: {},
      create: { userId, groupId: req.params.id, assignedBy: req.user!.id },
    });
    await logChange(req, userId, 'group_assigned', null, null, req.params.id);
    res.status(201).json(membership);
  } catch (e: any) { return safeError(res, 500, 'Failed to add member', e); }
});

router.delete('/groups/:id/members/:userId', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.userPermissionGroup.delete({ where: { userId_groupId: { userId: req.params.userId, groupId: req.params.id } } });
    await logChange(req, req.params.userId, 'group_removed', null, req.params.id, null);
    res.json({ message: 'Member removed from group' });
  } catch (e: any) { return safeError(res, 500, 'Failed to remove member', e); }
});

// GET /api/admin/permissions/audit?userId=&actorId=&page=
router.get('/audit', async (req: AuthRequest, res: Response) => {
  try {
    const { userId, actorId, page = '1' } = req.query as Record<string, string>;
    const where: any = {};
    if (userId) where.targetUserId = userId;
    if (actorId) where.actorId = actorId;
    const take = 50;
    const skip = (parseInt(page) - 1) * take;

    const [logs, total] = await Promise.all([
      prisma.permissionAuditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.permissionAuditLog.count({ where }),
    ]);
    const userIds = Array.from(new Set(logs.flatMap(l => [l.actorId, l.targetUserId])));
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } });
    const userMap = new Map(users.map(u => [u.id, u]));

    res.json({
      logs: logs.map(l => ({ ...l, actor: userMap.get(l.actorId), targetUser: userMap.get(l.targetUserId) })),
      pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / take) },
    });
  } catch (e: any) { return safeError(res, 500, 'Failed to load audit log', e); }
});

// GET /api/admin/permissions/matrix — Permission x Role grid (role defaults only)
router.get('/matrix', async (_req: AuthRequest, res: Response) => {
  try {
    const rolePerms = await prisma.rolePermission.findMany();
    res.json({ rolePermissions: rolePerms });
  } catch (e: any) { return safeError(res, 500, 'Failed to load matrix', e); }
});

export default router;
