import { Router, Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { authenticate, AuthRequest } from '../middleware/auth';
import { safeError } from '../middleware/errors';
import { uploadToStorage } from '../middleware/upload';
import { prisma } from '../prisma/client';

const router = Router();
const VAULT_ALLOWED = new Set([
  'image/jpeg','image/jpg','image/png','image/webp',
  'application/pdf','application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);
const vaultFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  VAULT_ALLOWED.has(file.mimetype) ? cb(null, true) : cb(new Error(`File type not allowed: ${file.mimetype}`));
};
const upload = multer({ storage: multer.memoryStorage(), fileFilter: vaultFilter, limits: { fileSize: 25 * 1024 * 1024 } });

// GET /api/vault — list authenticated user's documents
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const docs = await prisma.vaultDocument.findMany({
      where:   { ownerId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ documents: docs });
  } catch (err: any) {
    return safeError(res, 500, 'Vault request failed', err);
  }
});

// POST /api/vault — upload a document
router.post('/', authenticate, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const { title, type, caseRef } = req.body as { title?: string; type?: string; caseRef?: string };
    const url = await uploadToStorage(req.file.buffer, req.file.originalname, req.file.mimetype, 'vault');

    const doc = await prisma.vaultDocument.create({
      data: {
        ownerId:   req.user!.id,
        title:     title || req.file.originalname,
        filename:  req.file.originalname,
        url,
        type:      type || 'other',
        mimeType:  req.file.mimetype,
        sizeBytes: req.file.size,
        caseRef:   caseRef || null,
      },
    });
    res.status(201).json({ document: doc });
  } catch (err: any) {
    return safeError(res, 500, 'Vault request failed', err);
  }
});

// DELETE /api/vault/:id — delete a document (owner only)
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const doc = await prisma.vaultDocument.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.ownerId !== req.user!.id) return res.status(403).json({ error: 'Not your document' });

    await prisma.vaultDocument.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err: any) {
    return safeError(res, 500, 'Vault request failed', err);
  }
});

export default router;
