import { Router } from 'express';
import { prisma } from '../prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import { safeError } from '../middleware/errors';

const router = Router();

// ── Default templates (fallback when no DB value) ────────────────────────────
export const DEFAULT_TEMPLATES: Record<string, string> = {
  // Invoice letter fields
  'invoice.orgName':      'Kafaale Qaad',
  'invoice.orgSub':       'Humanitarian Relief Organization',
  'invoice.orgCountry':   'Somalia · kafaaleqaad.org',
  'invoice.description':  'Monthly Sponsorship Support',
  'invoice.bankName':     'Kafaale Qaad',
  'invoice.bankIBAN':     'SO00 0000 0000 0000 0000',
  'invoice.bankBIC':      'CAFGSO1X',
  'invoice.mobileNumber': '+252 61 200 0000',
  'invoice.mobileName':   'Kafaale Qaad',
  'invoice.footerMsg':    'Thank you for your generous support. Please include the invoice number as your payment reference.',

  // Payment receipt (sent to donor after admin marks paid)
  'receipt.title':   '✅ Payment Received — Thank You!',
  'receipt.body':    'As-salamu alaykum {donorName},\n\nAlhamdulillah! We have received your monthly sponsorship payment of ${amount} {currency} for {childId} in {region}.\n\n🧾 Receipt No: {receiptNo}\n📅 Period: {month} {year}\n\n"Whoever saves a soul, it is as if he has saved all mankind." — Quran 5:32\n\nYour generosity makes a real difference. May Allah reward you abundantly.\n\n— Kafaale Qaad Team',

  // Payment reminder (sent 5 days before due)
  'reminder.title':  '📋 Payment Due in 5 Days',
  'reminder.body':   'Your monthly sponsorship payment of ${total} for {children} is due in 5 days. Please log in to view your invoice and submit payment.',

  // Contract renewal reminder (sent 30 days before contract end)
  'renewal.title':   '🔄 Sponsorship Contract Expiring Soon',
  'renewal.body':    'Dear {donorName},\n\nYour sponsorship contract for {childName} is expiring on {endDate} — in 30 days.\n\n📌 You have two options:\n1. ✅ Renew Contract — continue supporting {childName} for another year\n2. 🔓 Release — allow another donor to take over\n\nPlease log in to your dashboard and choose. Thank you for everything you have done.\n\n— Kafaale Qaad Hope Society',

  // Manual invoice reminder
  'invoiceReminder.title':  '📋 Invoice Reminder — Payment Due Soon',
  'invoiceReminder.body':   'Dear {donorName},\n\nThis is a friendly reminder that your sponsorship payment of ${amount} for {childId} is due on {dueDate}.\n\nPlease log in to view and pay your invoice.\n\n— Kafaale Qaad Team',
};

// Helper — get a single setting value, falling back to default
export async function getSetting(key: string): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? DEFAULT_TEMPLATES[key] ?? '';
}

// Helper — get many settings at once
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return Object.fromEntries(keys.map(k => [k, map[k] ?? DEFAULT_TEMPLATES[k] ?? '']));
}

// GET /api/settings  — returns all settings merged with defaults
router.get('/', authenticate, requireRole(['admin', 'super_admin']), async (_req, res) => {
  try {
    const rows = await prisma.setting.findMany();
    const stored = Object.fromEntries(rows.map(r => [r.key, r.value]));
    const merged = { ...DEFAULT_TEMPLATES, ...stored };
    res.json({ settings: merged });
  } catch (e: any) {
    return safeError(res, 500, 'Settings request failed', e);
  }
});

// PATCH /api/settings  — upsert one or many key/value pairs
router.patch('/', authenticate, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const updates: Record<string, string> = req.body;
    if (!updates || typeof updates !== 'object') return res.status(400).json({ error: 'Body must be { key: value }' });
    await Promise.all(
      Object.entries(updates).map(([key, value]) =>
        prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
      )
    );
    res.json({ success: true });
  } catch (e: any) {
    return safeError(res, 500, 'Settings request failed', e);
  }
});

// DELETE /api/settings/:key  — reset a key back to its default
router.delete('/:key', authenticate, requireRole(['super_admin']), async (req, res) => {
  try {
    await prisma.setting.deleteMany({ where: { key: req.params.key } });
    res.json({ success: true, defaultValue: DEFAULT_TEMPLATES[req.params.key] ?? null });
  } catch (e: any) {
    return safeError(res, 500, 'Settings request failed', e);
  }
});

export default router;
