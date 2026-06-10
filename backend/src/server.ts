import * as Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import rateLimit from 'express-rate-limit';

// Load .env only in development — in production Railway injects all env vars directly
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Sentry must init before anything else
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.2,
  });
}

import authRoutes from './routes/auth';
import casesRoutes from './routes/cases';
import adminRoutes from './routes/admin';
import fieldRoutes from './routes/field';
import donationRoutes from './routes/donations';
import impactRoutes from './routes/impact';
import notificationRoutes from './routes/notifications';
import aiRoutes from './routes/ai';
import partnersRoutes from './routes/partners';
import programsRoutes from './routes/programs';
import projectsRoutes from './routes/projects';
import searchRoutes from './routes/search';
import messagesRoutes from './routes/messages';
import vaultRoutes from './routes/vault';
import { sysLog } from './services/logger';
import { socketService } from './services/socketService';
import { prisma } from './prisma/client';

const app = express();
const PORT = process.env.PORT || 4000;
const IS_PROD = process.env.NODE_ENV === 'production';
const server = http.createServer(app);

// ── Allowed CORS origins ─────────────────────────────────────────────────────
// Whitelist: local dev + your production domains (add more as needed)
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  // Production frontends
  'https://kafaale-qaad.vercel.app',
  'https://kafaale-qaad1.vercel.app',
  'https://kafaaleqaad.org',
  'https://www.kafaaleqaad.org',
  process.env.FRONTEND_URL,
  process.env.CLOUDFLARE_TUNNEL_URL,   // dev tunnel for mobile testing
].filter(Boolean) as string[]);

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: IS_PROD ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.SUPABASE_URL || ''],
    },
  } : false,  // disable CSP in dev (Vite HMR needs it)
}));

// ── CORS — explicit whitelist only ───────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.has(origin)) return callback(null, true);
    // In dev also allow any localhost
    if (!IS_PROD && origin.startsWith('http://localhost:')) return callback(null, true);
    sysLog.warn(`CORS blocked request from: ${origin}`);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Request logging ──────────────────────────────────────────────────────────
app.use(morgan(IS_PROD ? 'combined' : 'dev'));

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));       // reduced from 10mb
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ── Rate limiters ────────────────────────────────────────────────────────────
// Global: 300 requests per 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// Auth: 10 login/register attempts per 15 min per IP (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
});

// Donation: 20 donation attempts per hour per IP (fraud prevention)
const donationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many donation requests. Please try again later.' },
});

// AI: 30 AI requests per hour (cost control)
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: 'AI request limit reached. Please try again in an hour.' },
});

// Upload: 50 uploads per hour (bandwidth protection)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { error: 'Too many uploads. Please try again later.' },
});

app.use(globalLimiter);

// ── Static uploads ───────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',          authLimiter, authRoutes);
app.use('/api/cases',         uploadLimiter, casesRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/field',         uploadLimiter, fieldRoutes);
app.use('/api/donate',        donationLimiter, donationRoutes);
app.use('/api/impact',        impactRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai',            aiLimiter, aiRoutes);
app.use('/api/partners',      partnersRoutes);
app.use('/api/messages',      messagesRoutes);
app.use('/api/programs',      programsRoutes);
app.use('/api/projects',      projectsRoutes);
app.use('/api/search',        searchRoutes);
app.use('/api/vault',         vaultRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: '✅ Kafaale Qaad API Online',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    env: IS_PROD ? 'production' : 'development',
  });
});

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  sysLog.error('Unhandled error', { message: err.message, stack: IS_PROD ? undefined : err.stack });
  if (process.env.SENTRY_DSN) Sentry.captureException(err);
  res.status(500).json({ error: IS_PROD ? 'Internal server error' : err.message });
});

// On Vercel, just export the app — the serverless function handles requests directly.
// On Railway/Node, start the HTTP server.
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`🚀 Kafaale API running → http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🔒 CORS origins: ${[...ALLOWED_ORIGINS].join(', ')}`);

    // Initialize WebSocket gateway (must be after server.listen)
    socketService.init(server);

    // Hourly OTP cleanup — remove expired/used OTP records to prevent unbounded growth
    setInterval(async () => {
      try {
        const cutoff = new Date(Date.now() - 60 * 60 * 1000); // older than 1 hour
        const { count } = await prisma.otpRecord.deleteMany({
          where: { OR: [{ used: true }, { expiresAt: { lt: cutoff } }] },
        });
        if (count > 0) sysLog.info(`🧹 OTP cleanup: removed ${count} expired/used records`);
      } catch (e: any) {
        sysLog.warn('OTP cleanup failed', { error: e.message });
      }
    }, 60 * 60 * 1000);
  });
}

export default app;
