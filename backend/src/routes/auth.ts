import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sysLog } from '../services/logger';

const router = Router();

export const ALL_ROLES = [
  'reporter','sponsor','field_agent','office_staff',
  'program_manager','project_manager','partner','admin','super_admin',
] as const;
export type AppRole = typeof ALL_ROLES[number];

// Roles that require admin approval before accessing the system
const APPROVAL_REQUIRED_ROLES = new Set([
  'field_agent','office_staff','program_manager','project_manager','partner',
]);

const RegisterSchema = z.object({
  name:              z.string().min(2).max(100),
  email:             z.string().email(),
  password:          z.string().min(8),
  phone:             z.string().max(20).optional(),
  country:           z.string().max(100).optional(),
  city:              z.string().max(100).optional(),
  organization:      z.string().max(200).optional(),
  preferredLanguage: z.enum(['en','so','ar','fr','es','tr']).default('en'),
  role:              z.enum(ALL_ROLES).default('reporter'),
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

    const requiresApproval = APPROVAL_REQUIRED_ROLES.has(data.role);
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name, email: data.email, password: hashedPassword, role: data.role,
        phone: data.phone, country: data.country, city: data.city,
        organization: data.organization, preferredLanguage: data.preferredLanguage,
        isApproved: !requiresApproval,
      },
      select: {
        id: true, name: true, email: true, role: true,
        preferredLanguage: true, isApproved: true,
      },
    });

    // For approved roles, issue a JWT immediately
    if (!requiresApproval) {
      const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '7d' });
      sysLog.info(`✅ New user registered: ${user.email} [${user.role}]`);
      return res.status(201).json({ user, token });
    }

    // Staff/agent: account created but pending approval — no token issued
    sysLog.info(`✅ New staff registration (pending approval): ${user.email} [${user.role}]`);
    res.status(201).json({
      user,
      token: null,
      pendingApproval: true,
      message: 'Account created. An admin will review and approve your account within 24 hours.',
    });
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
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials or account suspended' });

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Staff/agent account awaiting admin approval
    if (!user.isApproved) {
      return res.status(403).json({
        error: 'Your account is pending admin approval. You will be notified when access is granted.',
        code: 'PENDING_APPROVAL',
        role: user.role,
      });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    sysLog.info(`🔐 User login: ${user.email} [${user.role}]`);
    res.json({
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        preferredLanguage: user.preferredLanguage, isApproved: user.isApproved,
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
        isApproved: true, createdAt: true, lastLoginAt: true,
        _count: { select: { reportedCases: true, donations: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch { res.status(500).json({ error: 'Failed to retrieve profile' }); }
});

// PATCH /api/auth/profile
router.patch('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      name:         z.string().min(2).max(100).optional(),
      phone:        z.string().max(20).optional(),
      city:         z.string().max(100).optional(),
      organization: z.string().max(200).optional(),
    });
    const data = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: { id: true, name: true, email: true, phone: true, role: true, city: true, organization: true, preferredLanguage: true },
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
      select: { id: true, name: true, email: true, role: true, isApproved: true },
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
    res.json({ message: 'Password changed successfully.' });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.issues });
    res.status(500).json({ error: 'Password change failed' });
  }
});

export default router;
