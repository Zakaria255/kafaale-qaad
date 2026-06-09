import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { sysLog } from '../services/logger';
import { fraudDetectionService } from '../services/fraudDetectionService';

const router = Router();
router.use(authenticate, requireRole([
  'admin','super_admin','office_staff','program_manager','project_manager',
]));

// GET /api/admin/cases — All cases with full details
router.get('/cases', async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query as Record<string,string>;
    const where: any = {};
    if (status) where.status = status;
    const skip = (parseInt(page)-1) * parseInt(limit);
    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit),
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          assignedAgent: { select: { id: true, name: true, email: true } },
          fieldInvestigation: { select: { verificationStatus: true, estimatedAmountNeeded: true, fraudRiskLevel: true } },
          aiPublicData: { select: { generatedTitle: true, confidenceScore: true } },
          deliveryProof: true,
          _count: { select: { donations: true, mediaFiles: true } },
        },
      }),
      prisma.case.count({ where }),
    ]);
    res.json({ cases, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total/parseInt(limit)) } });
  } catch { res.status(500).json({ error: 'Failed to retrieve cases' }); }
});

// GET /api/admin/cases/:id — Full private case detail
router.get('/cases/:id', async (req: AuthRequest, res: Response) => {
  try {
    const kase = await prisma.case.findUnique({
      where: { id: req.params.id },
      include: {
        reporter: { select: { id: true, name: true, email: true, phone: true } },
        assignedAgent: { select: { id: true, name: true, email: true, phone: true } },
        fieldInvestigation: true,
        aiPublicData: true,
        deliveryProof: true,
        mediaFiles: true,
        donations: { include: { donor: { select: { id: true, name: true, email: true } } } },
        auditLogs: { include: { admin: { select: { id: true, name: true } } }, orderBy: { timestamp: 'desc' } },
      },
    });
    if (!kase) return res.status(404).json({ error: 'Case not found' });
    res.json(kase);
  } catch { res.status(500).json({ error: 'Failed to retrieve case' }); }
});

// PATCH /api/admin/cases/:id/status — Update case status
router.patch('/cases/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status, notes, rejectionReason } = req.body;
    const validStatuses = ['pending_review','team_assigned','investigating','investigation_completed','ai_sanitized','waiting_for_sponsor','sponsored','delivering','proof_uploaded','completed','rejected'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    
    const updateData: any = { status };
    if (status === 'rejected') { updateData.rejectedAt = new Date(); updateData.rejectionReason = rejectionReason; }
    if (status === 'waiting_for_sponsor') updateData.adminPublishedAt = new Date();
    if (status === 'completed') updateData.completedAt = new Date();

    const kase = await prisma.case.update({ where: { id: req.params.id }, data: updateData });
    await prisma.adminAuditLog.create({
      data: { adminId: req.user!.id, caseId: kase.id, action: status === 'rejected' ? 'rejected' : 'approved', notes },
    });
    sysLog.info(`Admin ${req.user!.email} updated case ${kase.id} → ${status}`);
    res.json({ message: 'Status updated', caseId: kase.id, status });
  } catch { res.status(500).json({ error: 'Failed to update status' }); }
});

// PATCH /api/admin/cases/:id/assign — Assign field agent
router.patch('/cases/:id/assign', async (req: AuthRequest, res: Response) => {
  try {
    const { agentId } = req.body;
    const agent = await prisma.user.findUnique({ where: { id: agentId } });
    if (!agent || agent.role !== 'field_agent') return res.status(400).json({ error: 'Invalid field agent' });
    
    const kase = await prisma.case.update({
      where: { id: req.params.id },
      data: { assignedAgentId: agentId, status: 'team_assigned', teamAssignedAt: new Date() },
    });
    await prisma.notification.create({
      data: { userId: agentId, caseId: kase.id, type: 'case_assigned', title: '🗂️ New Case Assigned', message: `A ${kase.emergencyLevel} priority ${kase.category} case has been assigned to you for field investigation.` },
    });
    await prisma.adminAuditLog.create({ data: { adminId: req.user!.id, caseId: kase.id, action: 'assigned_team', notes: `Assigned to agent ${agent.name}` } });
    res.json({ message: 'Agent assigned', caseId: kase.id });
  } catch { res.status(500).json({ error: 'Failed to assign agent' }); }
});

// PATCH /api/admin/cases/:id/assign-delivery — Assign field agent for aid delivery
router.patch('/cases/:id/assign-delivery', async (req: AuthRequest, res: Response) => {
  try {
    const { agentId } = req.body;
    const agent = await prisma.user.findUnique({ where: { id: agentId } });
    if (!agent || agent.role !== 'field_agent') return res.status(400).json({ error: 'Invalid field agent' });

    const existing = await prisma.case.findUnique({ where: { id: req.params.id }, select: { status: true } });
    if (!existing) return res.status(404).json({ error: 'Case not found' });
    const assignableStatuses = ['sponsored', 'delivering'];
    if (!assignableStatuses.includes(existing.status)) {
      return res.status(400).json({ error: `Cannot assign delivery — case is in '${existing.status}' status` });
    }

    const kase = await prisma.case.update({
      where: { id: req.params.id },
      data:  { assignedAgentId: agentId, status: 'delivering' },
    });
    await prisma.notification.create({
      data: {
        userId:  agentId,
        caseId:  kase.id,
        type:    'delivery_assigned',
        title:   '🚚 Aid Delivery Assignment',
        message: `You have been assigned to deliver aid for case ${kase.id}. Please proceed to the location and submit delivery proof when done.`,
      },
    });
    await prisma.adminAuditLog.create({
      data: { adminId: req.user!.id, caseId: kase.id, action: 'delivery_assigned', notes: `Delivery assigned to agent ${agent.name}` },
    });
    sysLog.info(`Admin ${req.user!.email} assigned delivery of case ${kase.id} to ${agent.name}`);
    res.json({ message: 'Delivery agent assigned', caseId: kase.id });
  } catch { res.status(500).json({ error: 'Failed to assign delivery agent' }); }
});

// PATCH /api/admin/cases/:id/publish — Publish case after AI sanitization
router.patch('/cases/:id/publish', async (req: AuthRequest, res: Response) => {
  try {
    const { publicTitle, publicStory, publicCity, targetGoal } = req.body;
    const kase = await prisma.case.update({
      where: { id: req.params.id },
      data: { status: 'waiting_for_sponsor', publicTitle, publicStory, publicCity, targetGoal, adminPublishedAt: new Date() },
    });
    if (kase.reporterId) {
      await prisma.notification.create({
        data: { userId: kase.reporterId, caseId: kase.id, type: 'case_published', title: '✅ Your Case is Now Live', message: 'Your case has been verified and published to the donor portal.' },
      });
    }
    await prisma.adminAuditLog.create({ data: { adminId: req.user!.id, caseId: kase.id, action: 'published', notes: 'Case published to donor portal' } });
    res.json({ message: 'Case published', caseId: kase.id });
  } catch { res.status(500).json({ error: 'Failed to publish case' }); }
});

// GET /api/admin/stats — Dashboard stats
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [totalCases, pendingCases, activeCases, completedCases, totalUsers, totalDonations] = await Promise.all([
      prisma.case.count(),
      prisma.case.count({ where: { status: 'pending_review' } }),
      prisma.case.count({ where: { status: { in: ['waiting_for_sponsor','sponsored','delivering'] } } }),
      prisma.case.count({ where: { status: 'completed' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.donation.aggregate({ where: { status: 'confirmed' }, _sum: { amount: true }, _count: true }),
    ]);
    res.json({ totalCases, pendingCases, activeCases, completedCases, totalUsers, totalDonationsAmount: totalDonations._sum.amount || 0, totalDonationsCount: totalDonations._count });
  } catch { res.status(500).json({ error: 'Failed to retrieve stats' }); }
});

// GET /api/admin/users — All users (admin/super_admin only)
router.get('/users', async (req: AuthRequest, res: Response) => {
  if (!['admin','super_admin'].includes(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { status } = req.query as Record<string, string>;
    const where: any = {};
    if (status === 'pending') where.isApproved = false;
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, role: true, phone: true,
        country: true, city: true, organization: true,
        isActive: true, isApproved: true, createdAt: true, lastLoginAt: true,
        _count: { select: { reportedCases: true, donations: true } },
      },
    });
    res.json(users);
  } catch { res.status(500).json({ error: 'Failed to retrieve users' }); }
});

// PATCH /api/admin/users/:id/approve — Approve a pending staff account
router.patch('/users/:id/approve', async (req: AuthRequest, res: Response) => {
  if (!['admin','super_admin'].includes(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data:  { isApproved: true },
      select: { id: true, name: true, email: true, role: true },
    });
    await prisma.notification.create({
      data: {
        userId:  user.id,
        type:    'account_approved',
        title:   '✅ Account Approved',
        message: `Your ${user.role.replace(/_/g,' ')} account has been approved. You can now sign in to Kafaale Qaad.`,
      },
    }).catch(() => {});
    sysLog.info(`Admin ${req.user!.email} approved user ${user.email} [${user.role}]`);
    res.json({ message: 'User approved', user });
  } catch { res.status(500).json({ error: 'Failed to approve user' }); }
});

// PATCH /api/admin/users/:id/reject — Reject and deactivate a pending account
router.patch('/users/:id/reject', async (req: AuthRequest, res: Response) => {
  if (!['admin','super_admin'].includes(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const { reason } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data:  { isApproved: false, isActive: false },
      select: { id: true, name: true, email: true, role: true },
    });
    sysLog.info(`Admin ${req.user!.email} rejected user ${user.email} [${user.role}] — reason: ${reason || 'not provided'}`);
    res.json({ message: 'User rejected', user });
  } catch { res.status(500).json({ error: 'Failed to reject user' }); }
});

// GET /api/admin/donations — All donations with full details (admin/super_admin only)
router.get('/donations', async (req: AuthRequest, res: Response) => {
  if (!['admin','super_admin'].includes(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [donationList, totals] = await Promise.all([
      prisma.donation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          donor: { select: { id: true, name: true, email: true } },
          case:  { select: { id: true, publicTitle: true, publicCity: true, status: true, targetGoal: true, totalRaised: true, emergencyLevel: true } },
        },
      }),
      prisma.donation.groupBy({ by: ['status'], _sum: { amount: true }, _count: true }),
    ]);
    const summary = { total: 0, confirmed: 0, pending: 0, count: 0 };
    totals.forEach(t => {
      summary.total += t._sum.amount || 0;
      summary.count += t._count;
      if (t.status === 'confirmed') summary.confirmed += t._sum.amount || 0;
      if (t.status === 'pending')   summary.pending   += t._sum.amount || 0;
    });
    res.json({ donations: donationList, summary });
  } catch { res.status(500).json({ error: 'Failed to retrieve donations' }); }
});

// PATCH /api/admin/donations/:id/confirm — Confirm a pending donation (atomic)
router.patch('/donations/:id/confirm', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.donation.findUnique({
      where: { id: req.params.id },
      include: { case: { select: { id: true, status: true, totalRaised: true } } },
    }) as any;
    if (!existing) return res.status(404).json({ error: 'Donation not found' });
    if (existing.status === 'confirmed') return res.status(400).json({ error: 'Donation already confirmed' });
    if (existing.status === 'refunded')  return res.status(400).json({ error: 'Donation was refunded — cannot confirm' });

    const wasWaiting = existing.case?.status === 'waiting_for_sponsor';

    // Atomic: update donation + increment totalRaised + optionally update case status
    await prisma.$transaction([
      prisma.donation.update({ where: { id: req.params.id }, data: { status: 'confirmed', confirmedAt: new Date() } }),
      prisma.case.update({ where: { id: existing.caseId }, data: { totalRaised: { increment: existing.amount }, ...(wasWaiting && { status: 'sponsored', sponsoredAt: new Date() }) } }),
      prisma.adminAuditLog.create({ data: { adminId: req.user!.id, caseId: existing.caseId, action: 'donation_confirmed', notes: `Confirmed $${existing.amount} donation from donor ${existing.donorId}` } }),
    ]);
    await prisma.notification.create({ data: { userId: existing.donorId, caseId: existing.caseId, type: 'donation_confirmed', title: '✅ Donation Confirmed', message: `Your donation of $${existing.amount} has been confirmed. The field team will deliver aid shortly.` } });
    res.json({ message: 'Donation confirmed', donationId: existing.id });
  } catch { res.status(500).json({ error: 'Failed to confirm donation' }); }
});

// PATCH /api/admin/donations/:id/refund — Refund a donation (super_admin only)
router.patch('/donations/:id/refund', async (req: AuthRequest, res: Response) => {
  try {
    if (!['admin','super_admin'].includes(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ error: 'Refund reason required' });

    const donation = await prisma.donation.findUnique({ where: { id: req.params.id } });
    if (!donation) return res.status(404).json({ error: 'Donation not found' });
    if (donation.status === 'refunded') return res.status(400).json({ error: 'Already refunded' });

    const wasConfirmed = donation.status === 'confirmed';
    await prisma.$transaction([
      prisma.donation.update({ where: { id: req.params.id }, data: { status: 'refunded' } }),
      ...(wasConfirmed ? [prisma.case.update({ where: { id: donation.caseId }, data: { totalRaised: { decrement: donation.amount } } })] : []),
      prisma.adminAuditLog.create({ data: { adminId: req.user!.id, caseId: donation.caseId, action: 'donation_confirmed', notes: `REFUND: $${donation.amount} — reason: ${reason}` } }),
    ]);
    await prisma.notification.create({ data: { userId: donation.donorId, caseId: donation.caseId, type: 'donation_confirmed', title: '↩️ Donation Refunded', message: `Your donation of $${donation.amount} has been marked for refund. Reason: ${reason}` } });
    res.json({ message: 'Refund processed', donationId: donation.id });
  } catch { res.status(500).json({ error: 'Failed to process refund' }); }
});

// PATCH /api/admin/cases/:id/complete — Mark case complete after delivery proof reviewed
router.patch('/cases/:id/complete', async (req: AuthRequest, res: Response) => {
  try {
    const { adminNotes } = req.body;
    const kase = await prisma.case.findUnique({
      where: { id: req.params.id },
      include: { deliveryProof: true },
    }) as any;
    if (!kase) return res.status(404).json({ error: 'Case not found' });
    if (kase.status !== 'proof_uploaded') {
      return res.status(400).json({ error: 'Case must be in proof_uploaded status to complete' });
    }

    // Mark delivery proof as admin-confirmed
    if (kase.deliveryProof) {
      await prisma.deliveryProof.update({
        where:  { caseId: kase.id },
        data:   { adminConfirmed: true, adminConfirmedAt: new Date(), adminNotes: adminNotes || null },
      });
    }

    // Move case to completed
    await prisma.case.update({
      where: { id: kase.id },
      data:  { status: 'completed', completedAt: new Date() },
    });

    await prisma.adminAuditLog.create({
      data: { adminId: req.user!.id, caseId: kase.id, action: 'completed', notes: adminNotes || 'Case marked complete after delivery proof review' },
    });

    // Notify reporter — case is fully done
    if (kase.reporterId) {
      await prisma.notification.create({
        data: {
          userId:  kase.reporterId,
          caseId:  kase.id,
          type:    'case_completed',
          title:   '🏁 Case Completed',
          message: 'Your reported case has been fully completed. Aid was delivered and confirmed by admin. Thank you for helping Kafaale reach those in need.',
        },
      });
    }

    // Notify donors on this case
    const caseDonors = await prisma.donation.findMany({
      where:  { caseId: kase.id, status: 'confirmed' },
      select: { donorId: true, amount: true },
    });
    await prisma.notification.createMany({
      data: caseDonors.map(d => ({
        userId:  d.donorId,
        caseId:  kase.id,
        type:    'case_completed',
        title:   '🏁 Aid Delivered — Case Complete',
        message: `The case you donated $${d.amount} to has been fully completed. The aid has been delivered and confirmed. Thank you for your generosity!`,
      })),
    });

    sysLog.info(`Admin ${req.user!.email} completed case ${kase.id}`);
    res.json({ message: 'Case completed', caseId: kase.id });
  } catch { res.status(500).json({ error: 'Failed to complete case' }); }
});

// PATCH /api/admin/users/:id/role — Change user role (super_admin only)
router.patch('/users/:id/role', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only Super Admin can change user roles' });
    }
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = ['reporter','sponsor','field_agent','office_staff','program_manager','project_manager','partner','admin','super_admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }
    if (id === req.user!.id && role !== 'super_admin') {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    await prisma.adminAuditLog.create({
      data: { adminId: req.user!.id, action: 'role_changed', notes: `Changed ${target.email} role: ${target.role} → ${role}` },
    });
    sysLog.info(`Super admin ${req.user!.email} changed ${target.email} role to ${role}`);
    res.json({ message: 'Role updated', user: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/admin/users/:id — Delete a user (super_admin only)
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only Super Admin can delete users' });
    }
    const { id } = req.params;
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'super_admin') {
      return res.status(400).json({ error: 'Cannot delete another Super Admin account' });
    }
    await prisma.user.delete({ where: { id } });
    await prisma.adminAuditLog.create({
      data: { adminId: req.user!.id, action: 'user_deleted', notes: `Deleted user ${target.email} (${target.role})` },
    });
    sysLog.info(`Super admin ${req.user!.email} deleted user ${target.email}`);
    res.json({ message: 'User deleted', userId: id });
  } catch (err: any) {
    sysLog.error('Failed to delete user', { error: err.message });
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/audit — Audit log
// PATCH /api/admin/cases/:id/request-info — Request more information from reporter
router.patch('/cases/:id/request-info', async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

    await prisma.case.update({ where: { id: req.params.id }, data: { status: 'pending_review', privateNotes: `[INFO REQUESTED] ${message}` } });
    await prisma.adminAuditLog.create({ data: { adminId: req.user!.id, caseId: req.params.id, action: 'requested_more_info', notes: message } });

    // Notify reporter
    const kase = await prisma.case.findUnique({ where: { id: req.params.id }, select: { reporterId: true } });
    if (kase?.reporterId) {
      await prisma.notification.create({ data: { userId: kase.reporterId, caseId: req.params.id, type: 'case_submitted', title: '📋 More Information Needed', message: `Admin has requested additional information: ${message}` } });
    }
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed' }); }
});

// POST /api/admin/cases/:id/enroll-beneficiary — Convert verified case to program beneficiary
router.post('/cases/:id/enroll-beneficiary', async (req: AuthRequest, res: Response) => {
  try {
    const { programId, programType, monthlyNeed, publicStory, publicNeedsDesc } = req.body;
    if (!programId || !programType) return res.status(400).json({ error: 'programId and programType required' });

    const kase = await prisma.case.findUnique({ where: { id: req.params.id } });
    if (!kase) return res.status(404).json({ error: 'Case not found' });

    const year = new Date().getFullYear();
    const count = await prisma.beneficiary.count();
    const prefix = programType === 'child_sponsorship' ? 'CSP' : programType === 'education' ? 'EDU' : programType === 'medical' ? 'MED' : 'FAM';
    const publicId = `${prefix}-${year}-${String(count + 1).padStart(3, '0')}`;

    const beneficiary = await prisma.beneficiary.create({
      data: {
        publicId,
        programId,
        programType,
        privateFullName: kase.privateVictimName || undefined,
        privateGuardianName: kase.privateGuardianName || undefined,
        privateGuardianPhone: kase.privateVictimPhone || undefined,
        privateAddress: kase.privateAddress || undefined,
        privateNotes: kase.privateNotes || undefined,
        publicAge: kase.privateVictimAge || undefined,
        publicGender: kase.privateVictimGender || undefined,
        publicRegion: kase.publicCity || kase.privateDistrict || undefined,
        publicCity: kase.publicCity || undefined,
        publicNeedsDesc: publicNeedsDesc || (kase.needsChecklist?.join(', ') || undefined),
        publicStory: publicStory || kase.publicStory || undefined,
        monthlyNeed: monthlyNeed || 0,
        status: 'seeking_sponsor',
        verifiedAt: new Date(),
        verifiedById: req.user!.id,
        enrolledBy: req.user!.id,
      },
    });

    // Update case status
    await prisma.case.update({ where: { id: req.params.id }, data: { status: 'completed', completedAt: new Date() } });
    await prisma.adminAuditLog.create({ data: { adminId: req.user!.id, caseId: req.params.id, action: 'enrolled_as_beneficiary', notes: `Enrolled as ${publicId}` } });

    res.status(201).json({ beneficiary, publicId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/audit', async (_req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: { admin: { select: { name: true, email: true } }, case: { select: { id: true, category: true, emergencyLevel: true } } },
    });
    res.json({ logs });
  } catch { res.status(500).json({ error: 'Failed to retrieve audit log' }); }
});

// GET /api/admin/fraud — Fraud dashboard: high-risk cases + suspicious reporters
router.get('/fraud', async (_req: AuthRequest, res: Response) => {
  try {
    const [highRiskCases, suspiciousReporters, recentFlags] = await Promise.all([
      fraudDetectionService.getFraudAudits(),
      // Reporters with >50% rejection rate and >1 case
      prisma.user.findMany({
        where: { role: 'reporter', isActive: true },
        select: {
          id: true, name: true, email: true, createdAt: true,
          _count: { select: { reportedCases: true } },
        },
      }).then(async (reporters) => {
        const withRates = await Promise.all(reporters.map(async (r) => {
          const rejected = await prisma.case.count({ where: { reporterId: r.id, status: 'rejected' } });
          const total = r._count.reportedCases;
          return { ...r, total, rejected, rejectionRate: total > 1 ? Math.round((rejected / total) * 100) : 0 };
        }));
        return withRates.filter(r => r.total > 1 && r.rejectionRate > 50).sort((a, b) => b.rejectionRate - a.rejectionRate);
      }),
      // Cases near GPS clusters
      prisma.case.findMany({
        where: { status: { in: ['pending_review','under_review','team_assigned'] }, privateGpsLat: { not: null } },
        select: { id: true, caseRef: true, category: true, privateGpsLat: true, privateGpsLng: true, privateDistrict: true, createdAt: true, reporterId: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);
    res.json({ highRiskCases, suspiciousReporters, recentCasesForClusterCheck: recentFlags });
  } catch { res.status(500).json({ error: 'Failed to load fraud dashboard' }); }
});

// PATCH /api/admin/cases/:id/fraud-score — Run fraud analysis on a specific case
router.patch('/cases/:id/fraud-score', async (req: AuthRequest, res: Response) => {
  try {
    const result = await fraudDetectionService.scoreCaseRisk(req.params.id);
    await prisma.adminAuditLog.create({ data: { adminId: req.user!.id, caseId: req.params.id, action: 'approved', notes: `Fraud analysis run: score=${result.riskScore}, level=${result.riskLevel}` } });
    res.json(result);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/admin/users/:id/suspend — Suspend/ban a user (blacklist)
router.patch('/users/:id/suspend', async (req: AuthRequest, res: Response) => {
  try {
    if (!['admin','super_admin'].includes(req.user!.role)) return res.status(403).json({ error: 'Forbidden' });
    const { reason, suspend } = req.body;
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'super_admin') return res.status(400).json({ error: 'Cannot suspend a Super Admin' });
    const updated = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: suspend === false ? false : true } });
    await prisma.adminAuditLog.create({ data: { adminId: req.user!.id, action: suspend === false ? 'suspended_user' : 'reinstated_user', notes: `${suspend === false ? 'Suspended' : 'Reinstated'} user ${target.email}. Reason: ${reason || 'no reason given'}` } });
    sysLog.info(`Admin ${req.user!.email} ${suspend === false ? 'suspended' : 'reinstated'} user ${target.email}`);
    res.json({ message: `User ${suspend === false ? 'suspended' : 'reinstated'}`, userId: updated.id, isActive: updated.isActive });
  } catch { res.status(500).json({ error: 'Failed to update user status' }); }
});

// GET /api/admin/field-agents — All active field agents
router.get('/field-agents', async (_req: AuthRequest, res: Response) => {
  try {
    const agents = await prisma.user.findMany({
      where: { role: 'field_agent', isActive: true },
      select: { id: true, name: true, email: true, phone: true, city: true, organization: true, createdAt: true,
        _count: { select: { assignedCases: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ agents });
  } catch { res.status(500).json({ error: 'Failed to retrieve field agents' }); }
});

export default router;
