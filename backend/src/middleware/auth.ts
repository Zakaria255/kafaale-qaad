import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Express 5 types params as Record<string, string | string[]>.
// We override params to string-only for cleaner route code.
export interface AuthRequest extends Request {
  user?: { id: string; role: string; email: string };
  params: Record<string, string>;
  file?: any;
  files?: any;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    const token = header.split(' ')[1];
    if (!token || token.length < 20) return res.status(401).json({ error: 'Invalid token format' });
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string; email: string };
    req.user = payload;
    next();
  } catch (err: any) {
    // Differentiate expired vs tampered — helps frontend know to re-login vs report error
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
