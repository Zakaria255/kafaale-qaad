import { Router, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import archiver from 'archiver';
import { prisma } from '../prisma/client';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { requirePermission, PermissionRequest } from '../middleware/permissions';
import { safeError } from '../middleware/errors';
import { previewOnly, scoreAndAttach, MotherDraft, CONFIRMATION_THRESHOLD } from '../services/motherDuplicateService';
import { generateRegNumber } from '../services/motherRegNumberService';
import { uploadMothersFile, parseImportFile, buildTemplateBuffer, ImportRow } from '../services/motherImportService';
import { uploadMothers, uploadToPrivateStorage, resolveDocDownload } from '../middleware/upload';
import { generateMotherPdf } from '../services/motherPdfService';

const DOC_FIELDS = ['national_id', 'family_doc', 'supporting_doc', 'photo', 'other'] as const;

const router = Router();
router.use(authenticate, requireRole(['admin', 'super_admin', 'registration_staff', 'verification_staff']));

const STAFF_TIER = ['admin', 'super_admin'];

const MotherInputSchema = z.object({
  fullName:              z.string().min(2).max(150),
  age:                   z.coerce.number().int().min(0).max(120).optional(),
  dateOfBirth:           z.coerce.date().optional(),
  gender:                z.string().max(20).optional(),
  phone:                 z.string().min(6).max(20),
  altPhone:              z.string().max(20).optional(),
  maritalStatus:         z.string().max(50).optional(),
  nationalId:            z.string().max(50).optional(),
  region:                z.string().min(1).max(100),
  district:              z.string().min(1).max(100),
  village:               z.string().max(100).optional(),
  address:               z.string().max(500).optional(),
  childrenCount:         z.coerce.number().int().min(0).max(50).optional(),
  childrenLivingWithHer: z.coerce.number().int().min(0).max(50).optional(),
  orphansUnderCare:      z.coerce.number().int().min(0).max(50).optional(),
  otherDependents:       z.coerce.number().int().min(0).max(50).optional(),
  childrenAgeRange:      z.string().max(100).optional(),
  familySituation:       z.string().max(2000).optional(),
  incomeSource:          z.string().max(200).optional(),
  vulnerabilityReasons:  z.array(z.string()).optional(),
  otherReasonText:       z.string().max(500).optional(),
  additionalInfo:        z.string().max(3000).optional(),
});

function serializeMother(m: any) {
  return { ...m, vulnerabilityReasons: JSON.parse(m.vulnerabilityReasons || '[]') };
}

// POST /api/mothers/check-duplicates — Preview only, no persistence. Powers the
// pre-submit "possible duplicate" confirmation step (spec §10 — never a hard block).
router.post('/check-duplicates', requirePermission('mother.create'), async (req: PermissionRequest, res: Response) => {
  try {
    const draft = req.body as MotherDraft;
    if (!draft.phone || !draft.fullName) return res.json({ matches: [] });
    const matches = await previewOnly(draft);
    res.json({ matches });
  } catch (e: any) { safeError(res, 500, 'Failed to check for duplicates', e); }
});

// POST /api/mothers — Register a new mother
router.post('/', requirePermission('mother.create'), async (req: PermissionRequest, res: Response) => {
  try {
    const data = MotherInputSchema.parse(req.body);
    const { vulnerabilityReasons, ...rest } = data;

    let mother: Awaited<ReturnType<typeof prisma.mother.create>>;
    let attempts = 0;
    while (true) {
      const regNumber = await generateRegNumber();
      try {
        mother = await prisma.mother.create({
          data: {
            ...rest,
            regNumber,
            vulnerabilityReasons: JSON.stringify(vulnerabilityReasons || []),
            registeredBy: { connect: { id: req.user!.id } },
            status: 'pending_verification',
          },
        });
        break;
      } catch (createErr: any) {
        if (createErr.code === 'P2002' && ++attempts < 5) continue;
        throw createErr;
      }
    }

    // Duplicate scoring runs synchronously after create (never blocks the save — spec
    // §10 requires a confirmation step, not a hard stop) and is denormalized onto the
    // row so the list/detail views can surface it without a second query.
    const duplicateMatches = await scoreAndAttach(mother.id, {
      fullName: mother.fullName, phone: mother.phone, nationalId: mother.nationalId,
      dateOfBirth: mother.dateOfBirth, region: mother.region, district: mother.district, village: mother.village,
    });

    await prisma.motherAuditLog.create({
      data: { actorId: req.user!.id, motherId: mother.id, action: 'registered', notes: `Registered ${mother.fullName} (${mother.regNumber})` },
    });

    const fresh = await prisma.mother.findUnique({ where: { id: mother.id } });
    res.status(201).json({ ...serializeMother(fresh), duplicateWarning: duplicateMatches.length > 0 ? duplicateMatches : null });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: e.issues });
    safeError(res, 500, 'Failed to register mother', e);
  }
});

// GET /api/mothers — Paginated list with search/filter/sort
router.get('/', requirePermission('mother.view'), async (req: PermissionRequest, res: Response) => {
  try {
    const {
      page = '1', limit = '20', search, status, region, district, registeredBy,
      dateFrom, dateTo, sort = 'newest',
    } = req.query as Record<string, string>;

    const where: any = {};
    if (status) where.status = status;
    if (region) where.region = region;
    if (district) where.district = district;
    if (registeredBy) where.registeredById = registeredBy;
    if (dateFrom || dateTo) {
      where.registeredAt = {};
      if (dateFrom) where.registeredAt.gte = new Date(dateFrom);
      if (dateTo) where.registeredAt.lte = new Date(dateTo);
    }
    if (search) {
      where.OR = [
        { regNumber:  { contains: search, mode: 'insensitive' } },
        { fullName:   { contains: search, mode: 'insensitive' } },
        { phone:      { contains: search } },
        { nationalId: { contains: search } },
      ];
    }
    // Registration Staff only see their own registrations, unless staff-tier.
    if (!STAFF_TIER.includes(req.user!.role) && req.user!.role === 'registration_staff') {
      where.registeredById = req.user!.id;
    }

    const orderBy: any =
      sort === 'oldest'  ? { registeredAt: 'asc' } :
      sort === 'name_az' ? { fullName: 'asc' } :
      sort === 'name_za' ? { fullName: 'desc' } :
      { registeredAt: 'desc' };

    const take = Math.min(parseInt(limit) || 20, 100);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

    const [mothers, total] = await Promise.all([
      prisma.mother.findMany({
        where, orderBy, skip, take,
        include: {
          registeredBy: { select: { id: true, name: true } },
          verifiedBy:   { select: { id: true, name: true } },
          _count: { select: { documents: true } },
        },
      }),
      prisma.mother.count({ where }),
    ]);

    res.json({
      mothers: mothers.map(serializeMother),
      pagination: { total, page: parseInt(page) || 1, limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (e: any) { safeError(res, 500, 'Failed to retrieve registrations', e); }
});

// GET /api/mothers/dashboard/stats — must be declared before GET /:id
router.get('/dashboard/stats', requirePermission('mother.view'), async (_req: PermissionRequest, res: Response) => {
  try {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    // Bucket keys below are built and matched entirely in UTC-calendar-day terms
    // (Date#toISOString always renders UTC) — anchoring the loop on local midnight
    // instead would silently roll the last bucket back a day in any positive-UTC-
    // offset timezone, dropping "today" from the trend whenever any records exist.
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const fourteenDaysAgoUTC = new Date(todayUTC.getTime() - 13 * 86400000);
    const [total, pending, completed, rejected, today, byRegionRaw, recent] = await Promise.all([
      prisma.mother.count(),
      prisma.mother.count({ where: { status: 'pending_verification' } }),
      prisma.mother.count({ where: { status: 'completed' } }),
      prisma.mother.count({ where: { status: 'rejected' } }),
      prisma.mother.count({ where: { registeredAt: { gte: startOfToday } } }),
      prisma.mother.groupBy({ by: ['region'], _count: { _all: true } }),
      prisma.mother.findMany({ where: { registeredAt: { gte: fourteenDaysAgoUTC } }, select: { registeredAt: true } }),
    ]);

    // Simple last-14-days trend — kept as plain day buckets, not a real analytics
    // engine (spec explicitly says not to overbuild the dashboard).
    const byDay: Record<string, number> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(fourteenDaysAgoUTC.getTime() + i * 86400000);
      byDay[d.toISOString().slice(0, 10)] = 0;
    }
    recent.forEach(r => { const k = r.registeredAt.toISOString().slice(0, 10); if (k in byDay) byDay[k]++; });

    res.json({
      total, pending, completed, rejected, today,
      byRegion: byRegionRaw.map(r => ({ region: r.region, count: r._count._all })),
      last14Days: Object.entries(byDay).map(([date, count]) => ({ date, count })),
    });
  } catch (e: any) { safeError(res, 500, 'Failed to load dashboard stats', e); }
});

// GET /api/mothers/bulk-import/template — downloadable .xlsx template
router.get('/bulk-import/template', requirePermission('mother.create'), async (_req: PermissionRequest, res: Response) => {
  try {
    const buf = await buildTemplateBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Mother_Registration_Template.xlsx"');
    res.send(buf);
  } catch (e: any) { safeError(res, 500, 'Failed to build template', e); }
});

const MAX_IMPORT_ROWS = 500;

// POST /api/mothers/bulk-import — parse .xlsx/.csv, validate + dedupe every row,
// insert only clean rows, return a full summary. Never partially import silently
// (spec §11) — ambiguous rows are held back as needsReview, not force-created.
router.post('/bulk-import', requirePermission('mother.bulk_import'), uploadMothersFile.single('file'), async (req: PermissionRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    let rows: ImportRow[];
    try {
      rows = await parseImportFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    } catch (parseErr: any) {
      return res.status(400).json({ error: 'Could not read the file — make sure it matches the template', detail: parseErr.message });
    }
    if (rows.length === 0) return res.status(400).json({ error: 'No data rows found in the file' });
    if (rows.length > MAX_IMPORT_ROWS) return res.status(400).json({ error: `Maximum ${MAX_IMPORT_ROWS} rows per import (found ${rows.length})` });

    const inserted: string[] = [];
    const needsReview: any[] = [];
    const invalid: { row: number; field: string; message: string }[] = [];

    for (const row of rows) {
      if (!row.fullName) { invalid.push({ row: row.rowNumber, field: 'Full Name', message: 'Required' }); continue; }
      if (!row.phone) { invalid.push({ row: row.rowNumber, field: 'Phone', message: 'Required' }); continue; }
      if (!row.region) { invalid.push({ row: row.rowNumber, field: 'Region', message: 'Required' }); continue; }
      if (!row.district) { invalid.push({ row: row.rowNumber, field: 'District', message: 'Required' }); continue; }
      if (row.age !== undefined && (isNaN(row.age) || row.age < 0)) { invalid.push({ row: row.rowNumber, field: 'Age', message: 'Must be a valid number' }); continue; }
      if (row.orphansUnderCare !== undefined && isNaN(row.orphansUnderCare)) { invalid.push({ row: row.rowNumber, field: 'Orphans Under Care', message: 'Must be a valid number' }); continue; }

      const draft: MotherDraft = {
        fullName: row.fullName, phone: row.phone, nationalId: row.nationalId,
        dateOfBirth: row.dateOfBirth, region: row.region, district: row.district, village: row.village,
      };
      const matches = await previewOnly(draft);
      if (matches.length > 0 && matches[0].score >= CONFIRMATION_THRESHOLD) {
        needsReview.push({ row: row.rowNumber, fullName: row.fullName, matches });
        continue;
      }

      let created: Awaited<ReturnType<typeof prisma.mother.create>> | undefined;
      let attempts = 0;
      while (!created) {
        const regNumber = await generateRegNumber();
        try {
          created = await prisma.mother.create({
            data: {
              fullName: row.fullName, age: row.age, dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : undefined,
              phone: row.phone, altPhone: row.altPhone, maritalStatus: row.maritalStatus, nationalId: row.nationalId,
              region: row.region, district: row.district, village: row.village, address: row.address,
              childrenCount: row.childrenCount, childrenLivingWithHer: row.childrenLivingWithHer,
              orphansUnderCare: row.orphansUnderCare, otherDependents: row.otherDependents,
              childrenAgeRange: row.childrenAgeRange, familySituation: row.familySituation, incomeSource: row.incomeSource,
              vulnerabilityReasons: JSON.stringify(row.vulnerabilityReasons || []), otherReasonText: row.otherReasonText,
              regNumber, status: 'pending_verification', registeredById: req.user!.id,
            },
          });
        } catch (createErr: any) {
          if (createErr.code === 'P2002' && ++attempts < 5) continue;
          invalid.push({ row: row.rowNumber, field: '—', message: 'Failed to save this row' });
          break;
        }
      }
      if (created) inserted.push(created.id);
    }

    await prisma.motherAuditLog.create({
      data: {
        actorId: req.user!.id, action: 'bulk_imported',
        notes: `Imported ${inserted.length} of ${rows.length} rows — ${needsReview.length} flagged as possible duplicates, ${invalid.length} invalid`,
        metadata: JSON.stringify({ total: rows.length, inserted: inserted.length, needsReview: needsReview.length, invalid: invalid.length }),
      },
    });

    res.status(201).json({
      total: rows.length, insertedCount: inserted.length, motherIds: inserted,
      needsReview, invalid,
    });
  } catch (e: any) { safeError(res, 500, 'Bulk import failed', e); }
});

// GET /api/mothers/audit-logs — Admin-only, most recent 100. Must be declared
// before GET /:id — Express matches route patterns in registration order, and
// /:id would otherwise swallow this as id="audit-logs".
router.get('/audit-logs', requirePermission('audit.view'), requireRole(['admin', 'super_admin']), async (req: PermissionRequest, res: Response) => {
  try {
    const logs = await prisma.motherAuditLog.findMany({
      take: 100,
      orderBy: { timestamp: 'desc' },
      include: {
        actor: { select: { id: true, name: true, email: true } },
        mother: { select: { id: true, regNumber: true, fullName: true } },
      },
    });
    res.json(logs);
  } catch (e: any) { safeError(res, 500, 'Failed to load audit logs', e); }
});

// GET /api/mothers/:id — Full detail
router.get('/:id', requirePermission('mother.view'), async (req: PermissionRequest, res: Response) => {
  try {
    const mother = await prisma.mother.findUnique({
      where: { id: req.params.id },
      include: {
        registeredBy: { select: { id: true, name: true, email: true } },
        verifiedBy:   { select: { id: true, name: true, email: true } },
        rejectedBy:   { select: { id: true, name: true, email: true } },
        documents: true,
        auditLogs: { include: { actor: { select: { id: true, name: true } } }, orderBy: { timestamp: 'desc' } },
      },
    });
    if (!mother) return res.status(404).json({ error: 'Registration not found' });
    if (req.user!.role === 'registration_staff' && mother.registeredById !== req.user!.id) {
      return res.status(403).json({ error: 'You can only view registrations you created' });
    }
    res.json(serializeMother(mother));
  } catch (e: any) { safeError(res, 500, 'Failed to retrieve registration', e); }
});

// PUT /api/mothers/:id — Edit (locked once completed)
router.put('/:id', requirePermission('mother.edit'), async (req: PermissionRequest, res: Response) => {
  try {
    const existing = await prisma.mother.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Registration not found' });
    if (existing.status === 'completed' && !STAFF_TIER.includes(req.user!.role)) {
      return res.status(403).json({ error: 'Completed registrations can only be corrected by an administrator' });
    }
    if (req.user!.role === 'registration_staff' && existing.registeredById !== req.user!.id) {
      return res.status(403).json({ error: 'You can only edit registrations you created' });
    }

    const data = MotherInputSchema.partial().parse(req.body);
    const { vulnerabilityReasons, ...rest } = data;

    const updated = await prisma.mother.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(vulnerabilityReasons !== undefined && { vulnerabilityReasons: JSON.stringify(vulnerabilityReasons) }),
      },
    });

    await prisma.motherAuditLog.create({
      data: { actorId: req.user!.id, motherId: updated.id, action: 'edited', notes: `Edited ${updated.fullName} (${updated.regNumber})` },
    });

    res.json(serializeMother(updated));
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: e.issues });
    safeError(res, 500, 'Failed to update registration', e);
  }
});

// POST /api/mothers/:id/verify — pending_verification | correction_requested → completed
router.post('/:id/verify', requirePermission('mother.verify'), async (req: PermissionRequest, res: Response) => {
  try {
    const { notes } = req.body as { notes?: string };
    const existing = await prisma.mother.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Registration not found' });
    if (existing.status === 'completed' || existing.status === 'rejected') {
      return res.status(400).json({ error: `Cannot verify a registration that is already ${existing.status}` });
    }

    const updated = await prisma.mother.update({
      where: { id: req.params.id },
      data: {
        status: 'completed',
        verifiedById: req.user!.id,
        verifiedAt: new Date(),
        verificationNotes: notes || null,
      },
    });

    await prisma.motherAuditLog.create({
      data: { actorId: req.user!.id, motherId: updated.id, action: 'verified', notes: notes || `Verified ${updated.fullName} (${updated.regNumber}) — marked Completed` },
    });

    res.json(serializeMother(updated));
  } catch (e: any) { safeError(res, 500, 'Failed to verify registration', e); }
});

// POST /api/mothers/:id/reject — requires a reason
router.post('/:id/reject', requirePermission('mother.reject'), async (req: PermissionRequest, res: Response) => {
  try {
    const { reason } = req.body as { reason?: string };
    if (!reason || !reason.trim()) return res.status(400).json({ error: 'A rejection reason is required' });

    const existing = await prisma.mother.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Registration not found' });
    if (existing.status === 'completed' || existing.status === 'rejected') {
      return res.status(400).json({ error: `Cannot reject a registration that is already ${existing.status}` });
    }

    const updated = await prisma.mother.update({
      where: { id: req.params.id },
      data: { status: 'rejected', rejectedById: req.user!.id, rejectedAt: new Date(), rejectionReason: reason.trim() },
    });

    await prisma.motherAuditLog.create({
      data: { actorId: req.user!.id, motherId: updated.id, action: 'rejected', notes: reason.trim() },
    });

    res.json(serializeMother(updated));
  } catch (e: any) { safeError(res, 500, 'Failed to reject registration', e); }
});

// POST /api/mothers/:id/request-correction — reopens editing, requires notes
router.post('/:id/request-correction', requirePermission('mother.verify'), async (req: PermissionRequest, res: Response) => {
  try {
    const { notes } = req.body as { notes?: string };
    if (!notes || !notes.trim()) return res.status(400).json({ error: 'Correction notes are required' });

    const existing = await prisma.mother.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Registration not found' });
    if (existing.status === 'completed' || existing.status === 'rejected') {
      return res.status(400).json({ error: `Cannot request correction on a registration that is already ${existing.status}` });
    }

    const updated = await prisma.mother.update({
      where: { id: req.params.id },
      data: { status: 'correction_requested', correctionRequestedAt: new Date(), correctionRequestedNotes: notes.trim() },
    });

    await prisma.motherAuditLog.create({
      data: { actorId: req.user!.id, motherId: updated.id, action: 'correction_requested', notes: notes.trim() },
    });

    res.json(serializeMother(updated));
  } catch (e: any) { safeError(res, 500, 'Failed to request correction', e); }
});

// POST /api/mothers/:id/documents — attach supporting documents (ID, family docs,
// photo, etc). Uploaded to PRIVATE storage only — never a public URL (spec §22).
router.post('/:id/documents', requirePermission('mother.edit'),
  uploadMothers.fields(DOC_FIELDS.map(name => ({ name, maxCount: 1 }))),
  async (req: PermissionRequest, res: Response) => {
    try {
      const mother = await prisma.mother.findUnique({ where: { id: req.params.id } });
      if (!mother) return res.status(404).json({ error: 'Registration not found' });
      if (mother.status === 'completed' && !STAFF_TIER.includes(req.user!.role)) {
        return res.status(403).json({ error: 'Documents on a completed registration can only be changed by an administrator' });
      }

      const files = (req.files as Record<string, Express.Multer.File[]>) || {};
      const created = [];
      for (const type of DOC_FIELDS) {
        const file = files[type]?.[0];
        if (!file) continue;
        const storagePath = await uploadToPrivateStorage(file.buffer, file.originalname, file.mimetype, `mothers/${mother.id}`);
        const doc = await prisma.motherDocument.create({
          data: {
            motherId: mother.id, type, storagePath, filename: file.originalname,
            mimeType: file.mimetype, sizeBytes: file.size, uploadedById: req.user!.id,
          },
        });
        created.push(doc);
      }
      if (created.length === 0) return res.status(400).json({ error: 'No recognized document fields were provided' });

      await prisma.motherAuditLog.create({
        data: { actorId: req.user!.id, motherId: mother.id, action: 'edited', notes: `Uploaded ${created.length} document(s)` },
      });

      res.status(201).json(created);
    } catch (e: any) { safeError(res, 500, 'Failed to upload documents', e); }
  });

// GET /api/mothers/:motherId/documents/:docId — private, permission-gated,
// short-lived signed URL only. Every access is logged (spec §22).
router.get('/:motherId/documents/:docId', requirePermission('mother.view'), async (req: PermissionRequest, res: Response) => {
  try {
    const doc = await prisma.motherDocument.findUnique({ where: { id: req.params.docId } });
    if (!doc || doc.motherId !== req.params.motherId) return res.status(404).json({ error: 'Document not found' });

    await prisma.motherAuditLog.create({
      data: { actorId: req.user!.id, motherId: doc.motherId, action: 'document_viewed', notes: doc.filename },
    });

    const resolved = await resolveDocDownload(doc.storagePath);
    if ('signedUrl' in resolved) return res.redirect(302, resolved.signedUrl);
    if (!fs.existsSync(resolved.localPath)) return res.status(404).json({ error: 'File not found on disk' });
    res.setHeader('Content-Type', doc.mimeType);
    res.sendFile(resolved.localPath);
  } catch (e: any) { safeError(res, 500, 'Failed to retrieve document', e); }
});

// GET /api/mothers/:id/pdf — only once completed (spec §16, §17)
router.get('/:id/pdf', requirePermission('mother.export'), async (req: PermissionRequest, res: Response) => {
  try {
    const mother = await prisma.mother.findUnique({
      where: { id: req.params.id },
      include: { registeredBy: { select: { name: true } }, verifiedBy: { select: { name: true } } },
    });
    if (!mother) return res.status(404).json({ error: 'Registration not found' });
    if (mother.status !== 'completed') return res.status(404).json({ error: 'PDF is only available once a registration has been verified and completed' });

    const doc = generateMotherPdf({
      regNumber: mother.regNumber, registeredAt: mother.registeredAt, registeredByName: mother.registeredBy?.name || '—',
      fullName: mother.fullName, age: mother.age, dateOfBirth: mother.dateOfBirth, gender: mother.gender,
      phone: mother.phone, altPhone: mother.altPhone, maritalStatus: mother.maritalStatus, nationalId: mother.nationalId,
      region: mother.region, district: mother.district, village: mother.village, address: mother.address,
      childrenCount: mother.childrenCount, childrenLivingWithHer: mother.childrenLivingWithHer,
      orphansUnderCare: mother.orphansUnderCare, otherDependents: mother.otherDependents,
      childrenAgeRange: mother.childrenAgeRange, familySituation: mother.familySituation, incomeSource: mother.incomeSource,
      vulnerabilityReasons: JSON.parse(mother.vulnerabilityReasons || '[]'), otherReasonText: mother.otherReasonText,
      additionalInfo: mother.additionalInfo, status: mother.status,
      verifiedByName: mother.verifiedBy?.name, verifiedAt: mother.verifiedAt, verificationNotes: mother.verificationNotes,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${mother.regNumber}.pdf"`);
    doc.pipe(res);
    doc.end();

    await prisma.motherAuditLog.create({
      data: { actorId: req.user!.id, motherId: mother.id, action: 'pdf_downloaded' },
    });
  } catch (e: any) { safeError(res, 500, 'Failed to generate PDF', e); }
});

const MAX_BULK_PDF = 300;

// POST /api/mothers/bulk-pdf — ZIP of individual PDFs for selected (or all
// completed) registrations. Always resolves to completed-only server-side,
// regardless of what the client passes (spec §18 — only completed records
// have a PDF at all). Streamed directly to the response — archiver's backpressure
// keeps this from blocking the event loop or freezing the client tab even for a
// few hundred records, with no job queue needed (spec §28's "background
// processing... if necessary" — not necessary at this scale).
router.post('/bulk-pdf', requirePermission('mother.export'), async (req: PermissionRequest, res: Response) => {
  try {
    const { ids, all } = req.body as { ids?: string[]; all?: boolean };
    const where: any = { status: 'completed' };
    if (!all) {
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No registrations selected' });
      where.id = { in: ids };
    }

    const count = await prisma.mother.count({ where });
    if (count === 0) return res.status(404).json({ error: 'No completed registrations match the selection' });
    if (count > MAX_BULK_PDF) return res.status(400).json({ error: `Too many registrations selected (${count}). Narrow your filter or split into multiple exports of at most ${MAX_BULK_PDF}.` });

    const mothers = await prisma.mother.findMany({
      where,
      include: { registeredBy: { select: { name: true } }, verifiedBy: { select: { name: true } } },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="mothers-export-${Date.now()}.zip"`);
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);

    const usedNames = new Set<string>();
    for (const mother of mothers) {
      const doc = generateMotherPdf({
        regNumber: mother.regNumber, registeredAt: mother.registeredAt, registeredByName: mother.registeredBy?.name || '—',
        fullName: mother.fullName, age: mother.age, dateOfBirth: mother.dateOfBirth, gender: mother.gender,
        phone: mother.phone, altPhone: mother.altPhone, maritalStatus: mother.maritalStatus, nationalId: mother.nationalId,
        region: mother.region, district: mother.district, village: mother.village, address: mother.address,
        childrenCount: mother.childrenCount, childrenLivingWithHer: mother.childrenLivingWithHer,
        orphansUnderCare: mother.orphansUnderCare, otherDependents: mother.otherDependents,
        childrenAgeRange: mother.childrenAgeRange, familySituation: mother.familySituation, incomeSource: mother.incomeSource,
        vulnerabilityReasons: JSON.parse(mother.vulnerabilityReasons || '[]'), otherReasonText: mother.otherReasonText,
        additionalInfo: mother.additionalInfo, status: mother.status,
        verifiedByName: mother.verifiedBy?.name, verifiedAt: mother.verifiedAt, verificationNotes: mother.verificationNotes,
      });
      let name = `${mother.regNumber}.pdf`;
      if (usedNames.has(name)) name = `${mother.regNumber}-${mother.id.slice(-6)}.pdf`; // regNumber collisions shouldn't happen, but never overwrite an entry silently
      usedNames.add(name);
      archive.append(doc as any, { name });
      doc.end();
    }

    await archive.finalize();

    await prisma.motherAuditLog.create({
      data: {
        actorId: req.user!.id, action: 'bulk_pdf_downloaded',
        notes: `Exported ${mothers.length} PDF(s)`,
        metadata: JSON.stringify({ count: mothers.length, motherIds: mothers.map(m => m.id) }),
      },
    });
  } catch (e: any) {
    if (!res.headersSent) safeError(res, 500, 'Failed to generate bulk PDF export', e);
    else res.end(); // stream already started — can't send a JSON error now
  }
});

export default router;
