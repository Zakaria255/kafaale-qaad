// ─── /api/updates — field updates / disaster alerts shown on the public /updates page ─
// Stored as a single JSON blob in the generic Setting table (key SETTING_KEY) rather
// than its own model — the whole list is always read/written together from the admin
// panel, so a key/value row is simpler than a migration.
import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import { safeError } from '../middleware/errors';

const router = Router();
const SETTING_KEY = 'site.fieldUpdates';

// GET /api/updates — public, returns every update (admin filters by `published` client-side).
// No fake fallback: an unconfigured list is genuinely empty until an admin saves one.
router.get('/', async (_req: Request, res: Response) => {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
    if (!row) return res.json({ updates: [] });
    const parsed = JSON.parse(row.value);
    res.json({ updates: Array.isArray(parsed) ? parsed : [] });
  } catch (e: any) {
    return safeError(res, 500, 'Failed to load updates', e);
  }
});

// PUT /api/updates — admin/super_admin only, replaces the whole list
router.put('/', authenticate, requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'Body must be { updates: [...] }' });
    await prisma.setting.upsert({
      where:  { key: SETTING_KEY },
      update: { value: JSON.stringify(updates) },
      create: { key: SETTING_KEY, value: JSON.stringify(updates) },
    });
    res.json({ success: true, updates });
  } catch (e: any) {
    return safeError(res, 500, 'Failed to save updates', e);
  }
});

export default router;
