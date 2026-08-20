import { prisma } from '../prisma/client';
import { PERMISSION_BY_KEY } from './permissionCatalog';

export type PermissionScope = 'own' | 'team' | 'department' | 'organization' | 'global';

export interface EffectivePermission {
  key: string;
  granted: boolean;
  scope: PermissionScope;
  source: 'role' | 'group' | 'user' | 'deny';
}

const SCOPE_RANK: Record<PermissionScope, number> = { own: 0, team: 1, department: 1, organization: 2, global: 3 };

/**
 * Resolves everything a user can do right now, straight from the database — deliberately
 * never cached in the JWT or any cross-request cache, so a permission change (grant, deny,
 * role change, group membership change) takes effect on the user's very next request. This
 * is what closes the exact class of staleness bug hit earlier today (a role change not
 * taking effect until re-login) for anything routed through this engine.
 */
export async function resolveEffectivePermissions(userId: string): Promise<Map<string, EffectivePermission>> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return new Map();

  const [rolePerms, groupMemberships, userPerms] = await Promise.all([
    prisma.rolePermission.findMany({ where: { role: user.role } }),
    prisma.userPermissionGroup.findMany({ where: { userId }, include: { group: { include: { permissions: true } } } }),
    prisma.userPermission.findMany({ where: { userId } }),
  ]);

  const effective = new Map<string, EffectivePermission>();

  for (const rp of rolePerms) {
    effective.set(rp.permissionKey, { key: rp.permissionKey, granted: true, scope: rp.scope as PermissionScope, source: 'role' });
  }

  for (const membership of groupMemberships) {
    for (const gp of membership.group.permissions) {
      const existing = effective.get(gp.permissionKey);
      const scope = gp.scope as PermissionScope;
      if (!existing || SCOPE_RANK[scope] > SCOPE_RANK[existing.scope]) {
        effective.set(gp.permissionKey, { key: gp.permissionKey, granted: true, scope, source: 'group' });
      }
    }
  }

  // Individual grants take priority over role/group scope (most specific wins), individual
  // denies always win outright regardless of what role/group would otherwise allow.
  for (const up of userPerms) {
    if (up.type === 'deny') {
      effective.set(up.permissionKey, { key: up.permissionKey, granted: false, scope: up.scope as PermissionScope, source: 'deny' });
    } else {
      effective.set(up.permissionKey, { key: up.permissionKey, granted: true, scope: up.scope as PermissionScope, source: 'user' });
    }
  }

  return effective;
}

export async function hasPermission(userId: string, key: string): Promise<{ granted: boolean; scope: PermissionScope | null }> {
  const effective = await resolveEffectivePermissions(userId);
  const entry = effective.get(key);
  if (!entry || !entry.granted) return { granted: false, scope: null };
  return { granted: true, scope: entry.scope };
}

/**
 * Escalation-ceiling check used by the permission-assignment endpoints: an actor can only
 * grant a permission they themselves currently hold (super_admin bypasses this — they can
 * grant anything catalogued), and only a super_admin can grant a superAdminOnly-tagged
 * permission at all. Never touches self-assignment — callers must block that separately.
 */
export async function canGrant(actorId: string, actorRole: string, permissionKey: string): Promise<{ allowed: boolean; reason?: string }> {
  const def = PERMISSION_BY_KEY.get(permissionKey);
  if (!def) return { allowed: false, reason: 'Unknown permission key' };
  if (def.superAdminOnly && actorRole !== 'super_admin') {
    return { allowed: false, reason: 'Only a Super Admin can grant this permission' };
  }
  if (actorRole === 'super_admin') return { allowed: true };
  const { granted } = await hasPermission(actorId, permissionKey);
  if (!granted) return { allowed: false, reason: 'You cannot grant a permission you do not have yourself' };
  return { allowed: true };
}
