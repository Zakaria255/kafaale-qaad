import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';

/**
 * Postgres-backed fixed-window rate limiter.
 *
 * Unlike express-rate-limit's default in-memory store — which resets on every
 * new serverless function instance and therefore barely limits anything on
 * Vercel — this counts hits in a shared table, so the limit holds across all
 * instances. Fails OPEN on any DB error (never lock the whole app over a hiccup).
 */
export function dbRateLimit(bucket: string, max: number, windowMs: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fwd = (req.headers['x-forwarded-for'] as string) || '';
      const ip = fwd.split(',')[0].trim() || req.ip || 'unknown';
      const now = Date.now();
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const key = `${bucket}:${ip}:${windowStart}`;

      const row = await prisma.rateCounter.upsert({
        where: { key },
        update: { count: { increment: 1 } },
        create: { key, count: 1, expiresAt: new Date(windowStart + windowMs) },
      });

      // Opportunistic cleanup of expired rows (~2% of requests).
      if (Math.random() < 0.02) {
        prisma.rateCounter.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
      }

      if (row.count > max) {
        const retryS = Math.ceil((windowStart + windowMs - now) / 1000);
        res.setHeader('Retry-After', String(retryS));
        return res.status(429).json({ error: `Too many attempts. Please try again in ${Math.ceil(retryS / 60)} minute(s).` });
      }
      return next();
    } catch {
      return next(); // fail open
    }
  };
}
