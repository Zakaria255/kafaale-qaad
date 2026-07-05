import { Response } from 'express';
import { sysLog } from '../services/logger';

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Send a safe error response. The real error is logged server-side; the client
 * gets a generic message in production (never internal/Prisma/DB details, which
 * can leak infrastructure info). In development the real message is returned to
 * aid debugging.
 */
export function safeError(res: Response, status: number, publicMessage: string, err?: any) {
  if (err) {
    sysLog.error(publicMessage, { error: err?.message, stack: IS_PROD ? undefined : err?.stack });
  }
  return res.status(status).json({ error: IS_PROD ? publicMessage : (err?.message || publicMessage) });
}
