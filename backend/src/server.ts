import * as Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import rateLimit from 'express-rate-limit';

// Load .env only in development — in production the host injects all env vars directly
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Fail fast at boot if critical secrets are missing — better a clear crash on
// startup than every auth request 500-ing or the DB silently misbehaving.
{
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter((k) => !process.env[k] || !process.env[k]!.trim());
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.error(`[FATAL] Missing required environment variable(s): ${missing.join(', ')}. Set them and restart.`);
    process.exit(1);
  }
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
import settingsRoutes from './routes/settings';
import notesRoutes from './routes/notes';
import { getSettings } from './routes/settings';
import cron from 'node-cron';
import { sysLog } from './services/logger';
import { socketService } from './services/socketService';
import { prisma } from './prisma/client';

// ── Invoice reminder job — runs daily at 8 AM, notifies sponsors 5 days before payment due ──
async function sendPaymentReminders() {
  try {
    const now = new Date();
    const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const in6Days = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);

    // Find sponsorships where nextPaymentDate is between 5 and 6 days from now
    const due = await prisma.sponsorship.findMany({
      where: {
        status: 'active',
        nextPaymentDate: { gte: in5Days, lt: in6Days },
      },
      include: {
        beneficiary: { select: { publicId: true, privateFullName: true } },
        sponsor:     { select: { id: true, name: true, email: true } },
      },
    });

    if (due.length === 0) return;

    const tmpl = await getSettings(['reminder.title', 'reminder.body']);
    const byDonor = new Map<string, typeof due>();
    for (const sp of due) {
      const list = byDonor.get(sp.sponsorId) || [];
      list.push(sp);
      byDonor.set(sp.sponsorId, list);
    }

    for (const [sponsorId, sps] of byDonor) {
      const names = sps.map(s => s.beneficiary.privateFullName || s.beneficiary.publicId).join(', ');
      const total = sps.reduce((sum, s) => sum + s.monthlyAmount, 0);
      await prisma.notification.create({
        data: {
          userId:  sponsorId,
          type:    'payment_reminder',
          title:   tmpl['reminder.title'],
          message: tmpl['reminder.body']
            .replace('{total}', `${total.toFixed(2)}`)
            .replace('{children}', names),
        },
      });
    }

    sysLog.info(`📬 Payment reminders sent to ${byDonor.size} donor(s) for ${due.length} sponsorship(s)`);
  } catch (e: any) {
    sysLog.warn('Payment reminder job failed', { error: e.message });
  }
}

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

// Auth: 20 login/register attempts per 15 min per IP (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes before trying again. If you forgot your password, contact your administrator.' },
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
app.use('/api/cases',         casesRoutes);   // globalLimiter covers GETs; upload routes inside use their own check
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
app.use('/api/settings',     settingsRoutes);
app.use('/api/notes',        notesRoutes);

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

    // Daily invoice reminders — 8 AM every day, notifies sponsors 5 days before payment due
    cron.schedule('0 8 * * *', sendPaymentReminders);
    sysLog.info('⏰ Invoice reminder cron scheduled (daily 8 AM)');

    // Contract renewal reminders — 9 AM every day, notifies sponsors 30 days before contract end
    cron.schedule('0 9 * * *', async () => {
      try {
        const now = new Date();
        const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const in31 = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
        const expiring = await prisma.sponsorship.findMany({
          where: { status: 'active', endDate: { gte: in30, lt: in31 } },
          include: {
            beneficiary: { select: { publicId: true, privateFullName: true } },
            sponsor:     { select: { id: true, name: true } },
          },
        });
        const renewTmpl = await getSettings(['renewal.title', 'renewal.body']);
        for (const sp of expiring) {
          const childName = sp.beneficiary.privateFullName || sp.beneficiary.publicId;
          const endFmt = new Date(sp.endDate!).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
          await prisma.notification.create({
            data: {
              userId:  sp.sponsorId,
              type:    'contract_renewal_reminder',
              title:   renewTmpl['renewal.title'],
              message: renewTmpl['renewal.body']
                .replace(/{donorName}/g, sp.sponsor.name || 'Sponsor')
                .replace(/{childName}/g, childName)
                .replace(/{endDate}/g, endFmt),
            },
          });
        }
        if (expiring.length > 0) sysLog.info(`🔔 Contract renewal reminders sent for ${expiring.length} sponsorship(s)`);
      } catch (e: any) {
        sysLog.warn('Contract renewal reminder job failed', { error: e.message });
      }
    });
    sysLog.info('⏰ Contract renewal cron scheduled (daily 9 AM)');

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
