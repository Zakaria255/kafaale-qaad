import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../prisma/client';

// Express 5 types params as Record<string, string | string[]>.
// We override params to string-only for cleaner route code.
export interface AuthRequest extends Request {
  user?: { id: string; role: string; email: string };
  params: Record<string, string>;
  file?: any;
  files?: any;
}

// L1 per-instance cache of revoked token hashes. The AUTHORITATIVE store is the
// RevokedToken table in Postgres — that's what makes logout work across the many
// short-lived serverless function instances (an in-memory map alone would not).
export const tokenBlacklist = new Map<string, number>();

// Evict expired L1 entries every 30 minutes so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [h, exp] of tokenBlacklist) if (exp < now) tokenBlacklist.delete(h);
}, 30 * 60 * 1000);

const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex');

// Revoke a token (server-side logout / password change). Persisted to the DB so
// every serverless instance honours it; also cached in L1 for the current instance.
export async function revokeToken(token: string, expiresAtMs: number) {
  const tokenHash = hashToken(token);
  tokenBlacklist.set(tokenHash, expiresAtMs);
  try {
    const expiresAt = new Date(expiresAtMs);
    await prisma.revokedToken.upsert({
      where: { tokenHash },
      update: { expiresAt },
      create: { tokenHash, expiresAt },
    });
  } catch {
    // Best-effort: if the DB write fails the L1 cache still covers this instance.
  }
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    const token = header.split(' ')[1];
    if (!token || token.length < 20) return res.status(401).json({ error: 'Invalid token format' });

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string; email: string; exp?: number };

    // Revocation check — L1 cache first (fast), then the DB (authoritative).
    const tokenHash = hashToken(token);
    const revokedMsg = { error: 'Session has been revoked — please log in again', code: 'TOKEN_REVOKED' };
    if (tokenBlacklist.has(tokenHash)) return res.status(401).json(revokedMsg);
    try {
      const revoked = await prisma.revokedToken.findUnique({ where: { tokenHash } });
      if (revoked) {
        tokenBlacklist.set(tokenHash, revoked.expiresAt.getTime());
        return res.status(401).json(revokedMsg);
      }
    } catch {
      // DB hiccup → fail OPEN (don't lock everyone out over a transient error).
      // A valid, unexpired JWT still authenticates; recent revocations in L1 are still enforced.
    }

    req.user = { id: payload.id, role: payload.role, email: payload.email };
    next();
  } catch (err: any) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Session expired — please log in again'
      : 'Authentication failed';
    res.status(401).json({ error: msg });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}
