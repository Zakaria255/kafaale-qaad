import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticate, AuthRequest, tokenBlacklist } from '../middleware/auth';
import { sysLog } from '../services/logger';

const router = Router();

export const ALL_ROLES = [
  'user',
  'reporter','donor','field_agent','verification_office',
  'program_manager','project_manager','admin','super_admin',
  // backward-compat aliases kept for any legacy data
  'sponsor','office_staff','field_team','partner','observer',
] as const;
export type AppRole = typeof ALL_ROLES[number];

// Roles where registration is open (immediate access)
const OPEN_ROLES = new Set(['user','reporter','donor','sponsor']);
// All other roles require admin to set isActive=true before they can login

// Roles a user may self-select at registration. admin/super_admin are NEVER
// self-registerable (prevents privilege escalation via the approvals queue) —
// they can only be assigned by a super_admin via the role-change endpoint.
export const REGISTERABLE_ROLES = [
  'reporter','donor','sponsor','field_agent','verification_office',
  'program_manager','project_manager',
] as const;

const RegisterSchema = z.object({
  name:              z.string().min(2).max(100),
  email:             z.string().email(),
  password:          z.string().min(8),
  phone:             z.string().max(20).optional(),
  country:           z.string().max(100).optional(),
  city:              z.string().max(100).optional(),
  organization:      z.string().max(200).optional(),
  preferredLanguage: z.enum(['en','so','ar','fr','es','tr']).default('en'),
  // No self-selected role: everyone registers as a normal "user". Elevated
  // roles are granted only by a super admin afterwards.
});

async function sendEmail(to: string, subject: string, text: string) {
  if (process.env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({ from: process.env.EMAIL_FROM || 'noreply@kafaaleqaad.org', to, subject, text });
  } else {
    sysLog.info(`[EMAIL] To: ${to} | Subject: ${subject} | Body: ${text}`);
  }
}

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = RegisterSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Everyone registers as a normal "user" — immediate access, can both
    // report cases and make donations. Elevated roles come only from a super admin.
    const user = await prisma.user.create({
      data: {
        name: data.name, email: data.email, password: hashedPassword, role: 'user',
        phone: data.phone, country: data.country, city: data.city,
        organization: data.organization, preferredLanguage: data.preferredLanguage,
        isActive: true,
      },
      select: {
        id: true, name: true, email: true, role: true,
        preferredLanguage: true, isActive: true,
      },
    });

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    sysLog.info(`New user registered: ${user.email}`);
    return res.status(201).json({ user, token });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = LoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // isActive=false means account is pending admin approval or has been suspended
    if (!user.isActive) {
      const isOpenRole = OPEN_ROLES.has(user.role);
      return res.status(403).json({
        error: isOpenRole
          ? 'Your account has been suspended. Contact support.'
          : 'Your account is pending admin approval. You will be notified when access is granted.',
        code: isOpenRole ? 'ACCOUNT_SUSPENDED' : 'PENDING_APPROVAL',
        role: user.role,
      });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    sysLog.info(`🔐 User login: ${user.email} [${user.role}]`);
    res.json({
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        preferredLanguage: user.preferredLanguage,
      },
      token,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/push-token
router.post('/push-token', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') return res.status(400).json({ error: 'Token required' });
    await prisma.user.update({ where: { id: req.user!.id }, data: { expoPushToken: token } });
    res.json({ message: 'Push token saved' });
  } catch { res.status(500).json({ error: 'Failed to save push token' }); }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        country: true, city: true, organization: true, preferredLanguage: true,
        isActive: true, createdAt: true, lastLoginAt: true,
        _count: { select: { reportedCases: true, donations: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch { res.status(500).json({ error: 'Failed to retrieve profile' }); }
});

// PATCH /api/auth/profile — any logged-in user may edit their OWN profile (all profile fields)
router.patch('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      name:              z.string().min(2).max(100).optional(),
      email:             z.string().email().optional(),
      phone:             z.string().max(20).optional(),
      city:              z.string().max(100).optional(),
      country:           z.string().max(100).optional(),
      organization:      z.string().max(200).optional(),
      preferredLanguage: z.string().max(10).optional(),
    });
    const data = schema.parse(req.body);
    // If the user is changing their email, keep it unique (it's their login identity).
    if (data.email) {
      data.email = data.email.toLowerCase().trim();
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing && existing.id !== req.user!.id) {
        return res.status(409).json({ error: 'That email is already in use by another account' });
      }
    }
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: { id: true, name: true, email: true, phone: true, role: true, city: true, country: true, organization: true, preferredLanguage: true },
    });
    res.json({ user });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ message: 'If that email exists, a code has been sent.' });

    const code      = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.otpRecord.create({ data: { email, code, expiresAt } });
    await sendEmail(email, 'Kafaale Qaad — Password Reset Code', `Your password reset code is: ${code}\n\nThis code expires in 15 minutes. Do not share it with anyone.`);

    sysLog.info(`OTP generated for ${email}`);
    res.json({ message: 'If that email exists, a code has been sent.' });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid email' });
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req: Request, res: Response) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ message: 'If that email exists, a new code has been sent.' });

    const code      = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.otpRecord.create({ data: { email, code, expiresAt } });
    await sendEmail(email, 'Kafaale Qaad — New Verification Code', `Your new code is: ${code}\n\nExpires in 15 minutes.`);

    res.json({ message: 'If that email exists, a new code has been sent.' });
  } catch { res.status(500).json({ error: 'Failed to resend OTP' }); }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = z.object({ email: z.string().email(), otp: z.string().length(6) }).parse(req.body);
    const record = await prisma.otpRecord.findFirst({
      where: { email, code: otp, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return res.status(400).json({ error: 'Invalid or expired code' });

    await prisma.otpRecord.update({ where: { id: record.id }, data: { used: true } });
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input' });
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = z.object({
      email:       z.string().email(),
      otp:         z.string().length(6),
      newPassword: z.string().min(8),
    }).parse(req.body);

    const record = await prisma.otpRecord.findFirst({
      where: { email, code: otp, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return res.status(400).json({ error: 'Invalid or expired code' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { email }, data: { password: hashed } });
    await prisma.otpRecord.update({ where: { id: record.id }, data: { used: true } });

    sysLog.info(`Password reset for ${email}`);
    res.json({ message: 'Password reset successfully. Please log in.' });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// PATCH /api/auth/change-password
router.patch('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string().min(1),
      newPassword:     z.string().min(8),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user!.id }, data: { password: hashed } });

    sysLog.info(`Password changed for user ${req.user!.id}`);

    // Invalidate current token so user must re-login with new password
    const oldToken = req.headers.authorization?.split(' ')[1];
    if (oldToken) {
      const decoded = jwt.decode(oldToken) as any;
      if (decoded?.exp) tokenBlacklist.set(oldToken, decoded.exp * 1000);
    }

    res.json({ message: 'Password changed successfully. Please log in again.' });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    res.status(500).json({ error: 'Password change failed' });
  }
});

// GET /api/auth/approval-status?email=... — lets pending users poll without storing their password
router.get('/approval-status', async (req: Request, res: Response) => {
  try {
    const email = String(req.query.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ error: 'email required' });
    const user = await prisma.user.findUnique({
      where:  { email },
      select: { isActive: true, role: true },
    });
    if (!user) return res.json({ status: 'pending' });
    if (!user.isActive) return res.json({ status: 'pending' });
    return res.json({ status: 'approved', role: user.role });
  } catch { res.status(500).json({ error: 'Failed to check status' }); }
});

// POST /api/auth/refresh — issue a fresh 7-day token (rotates the old one out)
router.post('/refresh', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, role: true, email: true, isActive: true },
    });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Account is inactive or pending approval' });

    // Blacklist the old token so it cannot be reused
    const oldToken = req.headers.authorization?.split(' ')[1];
    if (oldToken) {
      const decoded = jwt.decode(oldToken) as any;
      if (decoded?.exp) tokenBlacklist.set(oldToken, decoded.exp * 1000);
    }

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    sysLog.info(`🔄 Token refreshed for user ${user.email}`);
    res.json({ token });
  } catch { res.status(500).json({ error: 'Token refresh failed' }); }
});

// POST /api/auth/logout — server-side token revocation + clears push token
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Blacklist the current token
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.decode(token) as any;
      if (decoded?.exp) tokenBlacklist.set(token, decoded.exp * 1000);
    }

    // Stop push notifications after logout
    await prisma.user.update({
      where: { id: req.user!.id },
      data:  { expoPushToken: null },
    }).catch(() => {});

    sysLog.info(`👋 User ${req.user!.email} logged out`);
    res.json({ message: 'Logged out successfully' });
  } catch { res.status(500).json({ error: 'Logout failed' }); }
});

export default router;
