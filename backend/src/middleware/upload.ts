import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';

// ── Supabase Storage (production) ───────────────────────
// Real service keys are either legacy JWTs ("eyJ…") or new-style "sb_secret_…" keys.
// Anything else (empty, "REPLACE_WITH_…" placeholder) means storage isn't configured —
// fall back to local disk instead of failing every upload with an invalid-JWT error.
function isRealServiceKey(k?: string): boolean {
  return !!k && (k.startsWith('eyJ') || k.startsWith('sb_secret_'));
}
let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase && process.env.SUPABASE_URL && isRealServiceKey(process.env.SUPABASE_SERVICE_KEY)) {
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY!);
  }
  return _supabase;
}

export async function uploadToStorage(buffer: Buffer, originalName: string, mimeType: string, folder: string): Promise<string> {
  const ext  = path.extname(originalName).toLowerCase() || '.bin';
  const name = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.storage.from('kafaale-media').upload(name, buffer, { contentType: mimeType });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    return sb.storage.from('kafaale-media').getPublicUrl(name).data.publicUrl;
  }

  // Fallback: local disk for development
  const localPath = path.join(process.cwd(), 'uploads', name);
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, buffer);
  const base = process.env.BASE_URL || 'http://localhost:4000';
  return `${base}/uploads/${name}`;
}

// ── Multer — memory storage so we can pipe to Supabase ─
const ALLOWED = new Set([
  'image/jpeg','image/jpg','image/png','image/webp',
  'video/mp4','video/quicktime','video/avi','video/webm',
  'application/pdf','application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const fileFilter = (_req: Request, file: any, cb: multer.FileFilterCallback) => {
  ALLOWED.has(file.mimetype) ? cb(null, true) : cb(new Error(`File type not allowed: ${file.mimetype}`));
};

const limits = { fileSize: 50 * 1024 * 1024, files: 15 };

export const uploadCases    = multer({ storage: multer.memoryStorage(), fileFilter, limits });
export const uploadField    = multer({ storage: multer.memoryStorage(), fileFilter, limits });
export const uploadDelivery = multer({ storage: multer.memoryStorage(), fileFilter, limits });
export const uploadProfiles = multer({ storage: multer.memoryStorage(), fileFilter, limits });

/** Process in-memory multer files → upload to storage → attach URLs to req */
export async function processUploads(folder: string, fields: string[], req: Request, _res: Response, next: NextFunction) {
  try {
    // req.files is a dict when using .fields(), flat array when using .array()
    const raw = (req as any).files;
    const files: any[] = Array.isArray(raw)
      ? raw
      : raw ? Object.values(raw as Record<string, any[]>).flat() : [];
    if (files.length === 0) return next();

    const byField: Record<string, string[]> = {};
    for (const f of files) {
      if (!fields.includes(f.fieldname)) continue;
      const url = await uploadToStorage(f.buffer, f.originalname, f.mimetype, folder);
      (byField[f.fieldname] = byField[f.fieldname] || []).push(url);
    }
    (req as any).uploadedByField = byField;
    (req as any).uploadedUrls    = Object.values(byField).flat();
    next();
  } catch (err) { next(err); }
}

export function getMediaType(mimetype: string): 'image' | 'video' | 'document' {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  return 'document';
}
