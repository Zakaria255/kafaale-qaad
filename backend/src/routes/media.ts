// ─── /api/media — Community Media feed (/media page) ──────────────────────────
// Posts are shared across every visitor (stored in Postgres), and files go
// through the same multer → Supabase Storage pipeline as case photos, so
// there's no hardcoded post-body size cap beyond the platform's own limits.
import { Router, Response } from 'express';
import { prisma } from '../prisma/client';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { safeError } from '../middleware/errors';
import { uploadMedia, processUploads } from '../middleware/upload';

const router = Router();
const MANAGE_ROLES = ['admin', 'super_admin', 'verification_office'];

function serialize(post: any) {
  return {
    id:         post.id,
    authorId:   post.authorId,
    authorName: post.authorName,
    title:      post.title,
    body:       post.body,
    tag:        post.tag,
    videoUrl:   post.videoUrl,
    images:     [...post.images].sort((a: any, b: any) => a.order - b.order).map((i: any) => i.url),
    likes:      JSON.parse(post.likes || '[]'),
    comments:   JSON.parse(post.comments || '[]'),
    createdAt:  post.createdAt,
  };
}

// GET /api/media — public feed
router.get('/', async (_req, res: Response) => {
  try {
    const posts = await prisma.mediaPost.findMany({
      include: { images: true },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    res.json({ posts: posts.map(serialize) });
  } catch (e: any) {
    return safeError(res, 500, 'Failed to load media posts', e);
  }
});

const uploadFields = uploadMedia.fields([{ name: 'images', maxCount: 10 }, { name: 'video', maxCount: 1 }]);

// POST /api/media — create a post (multipart: title, body, tag, images[], video)
router.post('/', authenticate, requireRole(MANAGE_ROLES), uploadFields,
  (req, res, next) => processUploads('media', ['images', 'video'], req, res, next),
  async (req: AuthRequest, res: Response) => {
    try {
      const { title = '', body = '', tag = '' } = req.body;
      const imageUrls: string[] = (req as any).uploadedByField?.images || [];
      // A video is either an uploaded file (goes through Supabase Storage above)
      // or a plain YouTube/direct-link URL submitted as a text field — never both.
      const videoUrl: string | null = (req as any).uploadedByField?.video?.[0] || (req.body.videoUrl ? String(req.body.videoUrl).trim() : null) || null;
      if (!String(body).trim() && imageUrls.length === 0 && !videoUrl) {
        return res.status(400).json({ error: 'Post needs text, an image, or a video' });
      }
      const author = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });
      const post = await prisma.mediaPost.create({
        data: {
          authorId:   req.user!.id,
          authorName: author?.name || 'Kafaala Qaad',
          title, body, tag, videoUrl,
          images: { create: imageUrls.map((url, i) => ({ url, order: i })) },
        },
        include: { images: true },
      });
      res.status(201).json({ post: serialize(post) });
    } catch (e: any) {
      return safeError(res, 500, 'Failed to create post', e);
    }
  }
);

// PATCH /api/media/:id — edit text fields, add/remove images, replace/remove video
router.patch('/:id', authenticate, requireRole(MANAGE_ROLES), uploadFields,
  (req, res, next) => processUploads('media', ['images', 'video'], req, res, next),
  async (req: AuthRequest, res: Response) => {
    try {
      const existing = await prisma.mediaPost.findUnique({ where: { id: req.params.id }, include: { images: true } });
      if (!existing) return res.status(404).json({ error: 'Post not found' });

      const { title, body, tag, removeVideo, removeImageUrls } = req.body;
      const newImageUrls: string[] = (req as any).uploadedByField?.images || [];
      const newVideoUrl: string | undefined = (req as any).uploadedByField?.video?.[0] || (req.body.videoUrl ? String(req.body.videoUrl).trim() : undefined);
      let removeUrls: string[] = [];
      try { removeUrls = removeImageUrls ? JSON.parse(removeImageUrls) : []; } catch { /* ignore malformed input */ }

      if (removeUrls.length) {
        await prisma.mediaPostImage.deleteMany({ where: { url: { in: removeUrls }, postId: existing.id } });
      }
      const nextOrder = existing.images.filter(i => !removeUrls.includes(i.url)).length;

      const post = await prisma.mediaPost.update({
        where: { id: existing.id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(body  !== undefined ? { body }  : {}),
          ...(tag   !== undefined ? { tag }   : {}),
          ...(newVideoUrl ? { videoUrl: newVideoUrl } : {}),
          ...(removeVideo === 'true' && !newVideoUrl ? { videoUrl: null } : {}),
          ...(newImageUrls.length ? { images: { create: newImageUrls.map((url, i) => ({ url, order: nextOrder + i })) } } : {}),
        },
        include: { images: true },
      });
      res.json({ post: serialize(post) });
    } catch (e: any) {
      return safeError(res, 500, 'Failed to update post', e);
    }
  }
);

// DELETE /api/media/:id
router.delete('/:id', authenticate, requireRole(MANAGE_ROLES), async (req, res: Response) => {
  try {
    await prisma.mediaPost.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    return safeError(res, 500, 'Failed to delete post', e);
  }
});

// POST /api/media/:id/like — toggle the current user's like
router.post('/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const post = await prisma.mediaPost.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const likes: string[] = JSON.parse(post.likes || '[]');
    const uid = req.user!.id;
    const nextLikes = likes.includes(uid) ? likes.filter(id => id !== uid) : [...likes, uid];
    await prisma.mediaPost.update({ where: { id: post.id }, data: { likes: JSON.stringify(nextLikes) } });
    res.json({ likes: nextLikes });
  } catch (e: any) {
    return safeError(res, 500, 'Failed to update like', e);
  }
});

// POST /api/media/:id/comment — add a comment
router.post('/:id/comment', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const text = String(req.body?.body || '').trim();
    if (!text) return res.status(400).json({ error: 'Comment body is required' });
    const post = await prisma.mediaPost.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const author = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });
    const comments = JSON.parse(post.comments || '[]');
    comments.push({ authorId: req.user!.id, authorName: author?.name || 'User', body: text, createdAt: new Date().toISOString() });
    await prisma.mediaPost.update({ where: { id: post.id }, data: { comments: JSON.stringify(comments) } });
    res.status(201).json({ comments });
  } catch (e: any) {
    return safeError(res, 500, 'Failed to add comment', e);
  }
});

export default router;
