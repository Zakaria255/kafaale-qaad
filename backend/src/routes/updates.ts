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

const DEFAULT_UPDATES = [
  { id:"upd-1", type:"Flood", published:true, title:"Severe Flooding Displaces 3,000+ Families in Beledweyne", date:"2026-06-15", location:"Beledweyne, Hiran Region", severity:"critical", body:"Unprecedented flooding along the Shabelle River has displaced over 3,000 families in Beledweyne. Access roads are cut off. Emergency food, shelter, and clean water are urgently needed. Kafaala Qaad field teams are on the ground assessing and registering affected families.", img:"https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=700&q=75", needs:["Emergency Shelter Kits","Clean Water","Food Packages"] },
  { id:"upd-2", type:"Drought", published:true, title:"Drought Alert: Bay Region Facing Critical Food Shortage", date:"2026-06-10", location:"Baidoa, Bay Region", severity:"high", body:"Three consecutive failed rainy seasons have pushed Bay Region into a severe food crisis. Over 15,000 people face acute malnutrition. Livestock losses exceed 60%. Our teams are expanding food distribution and opening new cases for the most vulnerable.", img:"https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=700&q=75", needs:["Food Packages","Livestock Feed","Water Trucking"] },
  { id:"upd-3", type:"Emergency", published:true, title:"IDP Camp Medical Emergency — Mogadishu North", date:"2026-06-05", location:"Mogadishu, Benadir", severity:"high", body:"A disease outbreak in Mogadishu North IDP camp is affecting hundreds of families. Medical supplies are critically low. Our partners are requesting immediate support for medicine, oral rehydration kits, and mobile clinic deployment.", img:"https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=700&q=75", needs:["Medicine","ORS Kits","Mobile Clinic"] },
  { id:"upd-4", type:"General", published:true, title:"Kafaala Qaad Expands to Lower Jubba Region", date:"2026-05-28", location:"Kismayo, Lower Jubba", severity:"info", body:"We are proud to announce our expansion into the Lower Jubba region. Local field agents have been trained and onboarded. Case submissions from Kismayo, Jamaame, and Jilib are now accepted through our platform.", img:"https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=700&q=75", needs:[] },
];

// GET /api/updates — public, returns every update (admin filters by `published` client-side)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
    if (!row) return res.json({ updates: DEFAULT_UPDATES });
    const parsed = JSON.parse(row.value);
    res.json({ updates: Array.isArray(parsed) ? parsed : DEFAULT_UPDATES });
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
