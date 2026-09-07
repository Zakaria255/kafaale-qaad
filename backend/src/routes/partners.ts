// ─── /api/partners ───────────────────────────────────────────────────────────
// Public endpoints (no auth) + admin CRUD + public application intake.
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { safeError } from '../middleware/errors';

const router = Router();

const isAdminRole = requireRole(['admin', 'super_admin']);

function slugify(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'partner';
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let n = 1;
  while (await prisma.partner.findUnique({ where: { slug } })) {
    slug = `${base}-${++n}`;
  }
  return slug;
}

// GET /api/partners — all active partners grouped by tier
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [featured, community, orgs, stats] = await Promise.all([
      prisma.partner.findMany({
        where: { tier: 'featured', isActive: true },
        orderBy: [{ featuredOrder: 'asc' }, { casesSupported: 'desc' }],
      }),
      prisma.partner.findMany({
        where: { tier: 'community', isActive: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.partner.findMany({
        where: { tier: 'verified_org', isActive: true },
        orderBy: { name: 'asc' },
      }),
      // aggregate totals for the impact stats strip
      prisma.partner.aggregate({
        where: { isActive: true },
        _sum:   { casesSupported: true, familiesImpacted: true, totalDonated: true },
        _count: { id: true },
      }),
    ]);

    res.json({
      featured,
      community,
      organizations: orgs,
      totals: {
        activePartners:   stats._count.id,
        casesSupported:   stats._sum.casesSupported   ?? 0,
        familiesImpacted: stats._sum.familiesImpacted ?? 0,
        totalDonated:     stats._sum.totalDonated     ?? 0,
      },
    });
  } catch (err) {
    console.error('partners error', err);
    res.status(500).json({ error: 'Failed to load partners' });
  }
});

// GET /api/partners/stories — impact stories (partners with impactBefore/After)
router.get('/stories', async (_req: Request, res: Response) => {
  try {
    const stories = await prisma.partner.findMany({
      where: {
        isActive: true,
        impactBefore: { not: null },
        impactAfter:  { not: null },
      },
      select: {
        id: true, name: true, avatar: true, color: true,
        impactStory: true, impactBefore: true, impactAfter: true,
        caseRef: true, country: true, countryFlag: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });
    res.json({ stories });
  } catch {
    res.status(500).json({ error: 'Failed to load stories' });
  }
});

// ── Public: submit a partnership application ──────────────────────────────
const ApplySchema = z.object({
  orgName: z.string().min(2).max(200),
  type: z.string().min(1),
  country: z.string().min(1),
  website: z.string().max(300).optional(),
  regNumber: z.string().max(100).optional(),
  yearFounded: z.coerce.number().int().optional(),
  contactName: z.string().min(1).max(200),
  contactTitle: z.string().max(200).optional(),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(1).max(50),
  focusAreas: z.array(z.string()).default([]),
  operatingRegions: z.string().max(500).optional(),
  description: z.string().min(1).max(3000),
  annualBudget: z.string().max(100).optional(),
  staffCount: z.coerce.number().int().optional(),
  logoUrl: z.string().max(2_000_000).optional(), // may be a data: URL from the upload widget
});

router.post('/apply', async (req: Request, res: Response) => {
  try {
    const data = ApplySchema.parse(req.body);
    const slug = await uniqueSlug(data.orgName);
    const partner = await prisma.partner.create({
      data: {
        slug, name: data.orgName, type: data.type, country: data.country,
        website: data.website, description: data.description,
        focus: JSON.stringify(data.focusAreas),
        logoUrl: data.logoUrl,
        tier: 'community', status: 'pending', isActive: false, isVerified: false,
        contactName: data.contactName, contactTitle: data.contactTitle,
        contactEmail: data.contactEmail, contactPhone: data.contactPhone,
        regNumber: data.regNumber, yearFounded: data.yearFounded,
        annualBudget: data.annualBudget, staffCount: data.staffCount,
        operatingRegions: data.operatingRegions,
      },
    });
    res.status(201).json({ id: partner.id, status: partner.status });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    safeError(res, 400, 'Application failed', err);
  }
});

// ── Admin: manage all partners (any status/tier, incl. drafts) ────────────
router.get('/admin/list', authenticate, isAdminRole, async (_req: AuthRequest, res: Response) => {
  try {
    const partners = await prisma.partner.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ partners });
  } catch (err) {
    safeError(res, 500, 'Failed to load partners', err);
  }
});

const AdminPartnerSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.string().min(1),
  tier: z.enum(['featured', 'community', 'verified_org']).default('community'),
  country: z.string().optional(),
  website: z.string().max(300).optional(),
  description: z.string().max(3000).optional(),
  focus: z.array(z.string()).default([]),
  color: z.string().max(20).optional(),
  logoUrl: z.string().max(2_000_000).optional(),
  casesSupported: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(false),
});

router.post('/admin', authenticate, isAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const data = AdminPartnerSchema.parse(req.body);
    const slug = await uniqueSlug(data.name);
    const partner = await prisma.partner.create({
      data: {
        slug, name: data.name, type: data.type, tier: data.tier,
        country: data.country, website: data.website, description: data.description,
        focus: JSON.stringify(data.focus), color: data.color, logoUrl: data.logoUrl,
        casesSupported: data.casesSupported, isActive: data.isActive,
        isVerified: true, status: 'approved', addedByAdmin: req.user!.id,
      },
    });
    res.status(201).json(partner);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    safeError(res, 400, 'Failed to create partner', err);
  }
});

router.patch('/admin/:id', authenticate, isAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const data = AdminPartnerSchema.partial().parse(req.body);
    const { focus, ...rest } = data;
    const partner = await prisma.partner.update({
      where: { id: req.params.id },
      data: { ...rest, ...(focus ? { focus: JSON.stringify(focus) } : {}) },
    });
    res.json(partner);
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    safeError(res, 400, 'Failed to update partner', err);
  }
});

router.patch('/admin/:id/approve', authenticate, isAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const partner = await prisma.partner.update({
      where: { id: req.params.id },
      data: { status: 'approved', isActive: true, isVerified: true },
    });
    res.json(partner);
  } catch (err) {
    safeError(res, 400, 'Failed to approve partner', err);
  }
});

router.patch('/admin/:id/reject', authenticate, isAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const partner = await prisma.partner.update({
      where: { id: req.params.id },
      data: { status: 'rejected', isActive: false },
    });
    res.json(partner);
  } catch (err) {
    safeError(res, 400, 'Failed to reject partner', err);
  }
});

router.delete('/admin/:id', authenticate, isAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.partner.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    safeError(res, 400, 'Failed to delete partner', err);
  }
});

export default router;
