import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { hasPermission, PermissionScope } from '../services/permissionService';

export interface PermissionRequest extends AuthRequest {
  permissionScope?: PermissionScope;
}

/**
 * Same shape as requireRole() in middleware/auth.ts — mount alongside authenticate() on
 * any route. Resolves the caller's effective permission fresh from the DB on every request
 * (see permissionService.resolveEffectivePermissions), so grants/denies/role changes take
 * effect immediately, no re-login needed. On success, attaches the resolved scope to
 * req.permissionScope so the route handler can narrow its query (own/department/etc.).
 */
export function requirePermission(key: string) {
  return async (req: PermissionRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    try {
      const { granted, scope } = await hasPermission(req.user.id, key);
      if (!granted) return res.status(403).json({ error: 'Insufficient permissions', required: key });
      req.permissionScope = scope || undefined;
      next();
    } catch {
      res.status(500).json({ error: 'Failed to verify permissions' });
    }
  };
}
