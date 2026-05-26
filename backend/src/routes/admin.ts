import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { sysLog } from '../services/logger';

const router = Router();
router.use(authenticate, requireRole(['admin','super_admin']));

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

// GET /api/admin/users — All users
router.get('/users', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, phone: true, country: true, city: true, isActive: true, createdAt: true, lastLoginAt: true, _count: { select: { reportedCases: true, donations: true } } },
    });
    res.json(users);
  } catch { res.status(500).json({ error: 'Failed to retrieve users' }); }
});

// GET /api/admin/donations — All donations with full details
router.get('/donations', async (_req: AuthRequest, res: Response) => {
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

// PATCH /api/admin/donations/:id/confirm — Confirm a pending donation
router.patch('/donations/:id/confirm', async (req: AuthRequest, res: Response) => {
  try {
    const donation = await prisma.donation.update({
      where: { id: req.params.id },
      data:  { status: 'confirmed' },
      include: { case: { select: { id: true, status: true, targetGoal: true, totalRaised: true } } },
    }) as any;
    // Update case totalRaised
    const newTotal = (donation.case?.totalRaised || 0) + donation.amount;
    await prisma.case.update({ where: { id: donation.caseId }, data: { totalRaised: newTotal } });
    // Update case status to 'sponsored' if it was waiting
    if (donation.case?.status === 'waiting_for_sponsor') {
      await prisma.case.update({ where: { id: donation.caseId }, data: { status: 'sponsored' } });
    }
    await prisma.adminAuditLog.create({ data: { adminId: req.user!.id, caseId: donation.caseId, action: 'donation_confirmed', notes: `Confirmed $${donation.amount} donation` } });
    // Notify donor
    await prisma.notification.create({ data: { userId: donation.donorId, caseId: donation.caseId, type: 'donation_confirmed', title: '✅ Donation Confirmed', message: `Your donation of $${donation.amount} has been confirmed. The field team will deliver aid shortly.` } });
    res.json({ message: 'Donation confirmed', donationId: donation.id, newCaseTotal: newTotal });
  } catch { res.status(500).json({ error: 'Failed to confirm donation' }); }
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
router.get('/audit', async (_req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: { admin: { select: { name: true, email: true } }, case: { select: { id: true, category: true, emergencyLevel: true } } },
    });
    res.json(logs);
  } catch { res.status(500).json({ error: 'Failed to retrieve audit log' }); }
});

export default router;
