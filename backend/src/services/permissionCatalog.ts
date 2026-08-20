// Single source of truth for every permission in the system. The frontend Permissions
// panel fetches this list via GET /api/admin/permissions/catalog rather than duplicating
// it — add a permission here once and it's immediately assignable, searchable, and
// audit-loggable everywhere. Wiring an entry to an actual requirePermission() check on a
// route is a separate step (see backend/src/middleware/permissions.ts callers) — most
// entries below are catalogued and assignable today even where no route enforces them yet.

export type PermissionLevel = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'publish' | 'export' | 'manage';

export interface PermissionDef {
  key: string;
  module: string;
  label: string;
  level: PermissionLevel;
  sensitive?: boolean;
  superAdminOnly?: boolean;
}

const p = (key: string, module: string, label: string, level: PermissionLevel, opts: { sensitive?: boolean; superAdminOnly?: boolean } = {}): PermissionDef =>
  ({ key, module, label, level, sensitive: !!opts.sensitive, superAdminOnly: !!opts.superAdminOnly });

export const PERMISSION_CATALOG: PermissionDef[] = [
  // ── DASHBOARD ──────────────────────────────────────────────────────────
  p('dashboard.view', 'DASHBOARD', 'View dashboard', 'view'),
  p('dashboard.view_own', 'DASHBOARD', 'View own dashboard', 'view'),
  p('dashboard.view_organization', 'DASHBOARD', 'View organization dashboard', 'view'),
  p('dashboard.view_analytics', 'DASHBOARD', 'View analytics', 'view'),
  p('dashboard.view_financial', 'DASHBOARD', 'View financial dashboard', 'view', { sensitive: true }),
  p('dashboard.view_impact', 'DASHBOARD', 'View humanitarian impact dashboard', 'view'),
  p('dashboard.view_system_stats', 'DASHBOARD', 'View system statistics', 'view'),

  // ── USERS ──────────────────────────────────────────────────────────────
  p('user.view', 'USERS', 'View users', 'view'),
  p('user.search', 'USERS', 'Search users', 'view'),
  p('user.view_profile', 'USERS', 'View user profile', 'view'),
  p('user.edit_profile', 'USERS', 'Edit user profile', 'edit'),
  p('user.create', 'USERS', 'Create users', 'create'),
  p('user.invite', 'USERS', 'Invite users', 'create'),
  p('user.role_change', 'USERS', 'Change user role', 'manage', { sensitive: true }),
  p('user.permission_assign', 'USERS', 'Assign permissions', 'manage', { sensitive: true }),
  p('user.permission_remove', 'USERS', 'Remove permissions', 'manage', { sensitive: true }),
  p('user.suspend', 'USERS', 'Suspend user', 'manage', { sensitive: true }),
  p('user.reactivate', 'USERS', 'Reactivate user', 'manage'),
  p('user.delete', 'USERS', 'Delete user', 'delete', { sensitive: true }),
  p('user.reset_password', 'USERS', 'Reset user password', 'manage', { sensitive: true }),
  p('user.view_activity', 'USERS', 'View user activity', 'view'),
  p('user.view_login_history', 'USERS', 'View login history', 'view'),

  // ── REPORTERS / CASE REPORTING ────────────────────────────────────────
  p('reporting.view', 'CASE_REPORTING', 'View reporting system', 'view'),
  p('reporting.create_case', 'CASE_REPORTING', 'Create case', 'create'),
  p('reporting.edit_own_case', 'CASE_REPORTING', 'Edit own case', 'edit'),
  p('reporting.submit_case', 'CASE_REPORTING', 'Submit case', 'create'),
  p('reporting.save_draft', 'CASE_REPORTING', 'Save draft', 'create'),
  p('reporting.upload_photos', 'CASE_REPORTING', 'Upload photos', 'create'),
  p('reporting.upload_videos', 'CASE_REPORTING', 'Upload videos', 'create'),
  p('reporting.upload_documents', 'CASE_REPORTING', 'Upload documents', 'create'),
  p('reporting.add_gps_evidence', 'CASE_REPORTING', 'Add GPS evidence', 'create'),
  p('reporting.view_own_cases', 'CASE_REPORTING', 'View own cases', 'view'),
  p('reporting.edit_submitted_case', 'CASE_REPORTING', 'Edit submitted case', 'edit'),
  p('reporting.withdraw_case', 'CASE_REPORTING', 'Withdraw case', 'edit'),
  p('reporting.answer_verification_questions', 'CASE_REPORTING', 'Answer verification questions', 'edit'),
  p('reporting.view_case_status', 'CASE_REPORTING', 'View case status', 'view'),
  p('reporting.receive_notifications', 'CASE_REPORTING', 'Receive case notifications', 'view'),

  // ── CASE MANAGEMENT ───────────────────────────────────────────────────
  p('case.view', 'CASE_MANAGEMENT', 'View cases', 'view'),
  p('case.search', 'CASE_MANAGEMENT', 'Search cases', 'view'),
  p('case.filter', 'CASE_MANAGEMENT', 'Filter cases', 'view'),
  p('case.view_details', 'CASE_MANAGEMENT', 'View case details', 'view'),
  p('case.view_private', 'CASE_MANAGEMENT', 'View private case information', 'view', { sensitive: true }),
  p('case.edit', 'CASE_MANAGEMENT', 'Edit case', 'edit'),
  p('case.assign', 'CASE_MANAGEMENT', 'Assign case', 'manage'),
  p('case.reassign', 'CASE_MANAGEMENT', 'Reassign case', 'manage'),
  p('case.change_status', 'CASE_MANAGEMENT', 'Change case status', 'edit'),
  p('case.approve', 'CASE_MANAGEMENT', 'Approve case', 'approve'),
  p('case.reject', 'CASE_MANAGEMENT', 'Reject case', 'approve'),
  p('case.request_info', 'CASE_MANAGEMENT', 'Request more information', 'edit'),
  p('case.publish', 'CASE_MANAGEMENT', 'Publish case', 'publish'),
  p('case.unpublish', 'CASE_MANAGEMENT', 'Unpublish case', 'publish'),
  p('case.archive', 'CASE_MANAGEMENT', 'Archive case', 'delete', { sensitive: true }),
  p('case.restore', 'CASE_MANAGEMENT', 'Restore case', 'manage'),
  p('case.merge_duplicate', 'CASE_MANAGEMENT', 'Merge duplicate cases', 'manage'),
  p('case.mark_duplicate', 'CASE_MANAGEMENT', 'Mark duplicate case', 'manage'),
  p('case.export', 'CASE_MANAGEMENT', 'Export cases', 'export'),

  // ── VERIFICATION / FIELD OPERATIONS ───────────────────────────────────
  p('field.view_assignments', 'FIELD_OPERATIONS', 'View assignments', 'view'),
  p('field.accept_assignment', 'FIELD_OPERATIONS', 'Accept assignment', 'edit'),
  p('field.reject_assignment', 'FIELD_OPERATIONS', 'Reject assignment', 'edit'),
  p('field.start_investigation', 'FIELD_OPERATIONS', 'Start investigation', 'create'),
  p('field.update_investigation', 'FIELD_OPERATIONS', 'Update investigation', 'edit'),
  p('field.upload_investigation_photos', 'FIELD_OPERATIONS', 'Upload investigation photos', 'create'),
  p('field.upload_investigation_videos', 'FIELD_OPERATIONS', 'Upload investigation videos', 'create'),
  p('field.upload_documents', 'FIELD_OPERATIONS', 'Upload documents', 'create'),
  p('field.capture_gps', 'FIELD_OPERATIONS', 'Capture GPS', 'create'),
  p('field.submit_verification', 'FIELD_OPERATIONS', 'Submit verification', 'approve'),
  p('field.flag_fraud', 'FIELD_OPERATIONS', 'Flag fraud', 'manage', { sensitive: true }),
  p('field.view_fraud_alerts', 'FIELD_OPERATIONS', 'View fraud alerts', 'view', { sensitive: true }),
  p('field.submit_delivery_proof', 'FIELD_OPERATIONS', 'Submit delivery proof', 'create'),
  p('field.view_delivery_proof', 'FIELD_OPERATIONS', 'View delivery proof', 'view'),
  p('field.confirm_delivery', 'FIELD_OPERATIONS', 'Confirm delivery', 'approve'),
  p('field.reject_delivery_proof', 'FIELD_OPERATIONS', 'Reject delivery proof', 'approve'),

  // ── DONORS / SPONSORS ─────────────────────────────────────────────────
  p('donor.view', 'DONORS', 'View donors', 'view'),
  p('donor.view_profiles', 'DONORS', 'View donor profiles', 'view'),
  p('donor.view_history', 'DONORS', 'View donor history', 'view'),
  p('donor.search', 'DONORS', 'Search donors', 'view'),
  p('donor.edit', 'DONORS', 'Edit donor information', 'edit'),
  p('donation.view', 'DONORS', 'View donations', 'view'),
  p('donation.confirm', 'DONORS', 'Confirm donations', 'approve', { sensitive: true }),
  p('donation.reject', 'DONORS', 'Reject donations', 'approve'),
  p('donation.refund', 'DONORS', 'Refund donations', 'manage', { sensitive: true }),
  p('donation.view_receipts', 'DONORS', 'View donation receipts', 'view'),
  p('donation.generate_receipts', 'DONORS', 'Generate receipts', 'create'),
  p('donation.download_receipts', 'DONORS', 'Download receipts', 'export'),
  p('donor.view_impact', 'DONORS', 'View donor impact', 'view'),

  // ── PAYMENTS / FINANCE ────────────────────────────────────────────────
  p('finance.view_transactions', 'FINANCE', 'View transactions', 'view', { sensitive: true }),
  p('finance.create_transaction', 'FINANCE', 'Create transaction', 'create', { sensitive: true }),
  p('finance.confirm_payment', 'FINANCE', 'Confirm payment', 'approve', { sensitive: true }),
  p('finance.reject_payment', 'FINANCE', 'Reject payment', 'approve', { sensitive: true }),
  p('finance.refund_payment', 'FINANCE', 'Refund payment', 'manage', { sensitive: true }),
  p('finance.view_reports', 'FINANCE', 'View financial reports', 'view', { sensitive: true }),
  p('finance.export_data', 'FINANCE', 'Export financial data', 'export', { sensitive: true }),
  p('finance.view_donation_totals', 'FINANCE', 'View donation totals', 'view', { sensitive: true }),
  p('finance.view_project_funding', 'FINANCE', 'View project funding', 'view', { sensitive: true }),
  p('finance.view_sponsorship_funding', 'FINANCE', 'View sponsorship funding', 'view', { sensitive: true }),
  p('finance.manage_payment_methods', 'FINANCE', 'Manage payment methods', 'manage', { sensitive: true }),

  // ── PROGRAMS ───────────────────────────────────────────────────────────
  p('program.view', 'PROGRAMS', 'View programs', 'view'),
  p('program.create', 'PROGRAMS', 'Create programs', 'create'),
  p('program.edit', 'PROGRAMS', 'Edit programs', 'edit'),
  p('program.archive', 'PROGRAMS', 'Archive programs', 'delete'),
  p('program.enroll_beneficiary', 'PROGRAMS', 'Enroll beneficiary', 'create'),
  p('program.edit_beneficiary', 'PROGRAMS', 'Edit beneficiary', 'edit'),
  p('program.view_beneficiary', 'PROGRAMS', 'View beneficiary', 'view'),
  p('program.view_sensitive_beneficiary', 'PROGRAMS', 'View sensitive beneficiary information', 'view', { sensitive: true }),
  p('program.submit_monthly_update', 'PROGRAMS', 'Submit monthly update', 'create'),
  p('program.edit_monthly_update', 'PROGRAMS', 'Edit monthly update', 'edit'),
  p('program.graduate_beneficiary', 'PROGRAMS', 'Graduate beneficiary', 'manage'),
  p('program.transfer_beneficiary', 'PROGRAMS', 'Transfer beneficiary', 'manage'),
  p('program.view_sponsorship', 'PROGRAMS', 'View sponsorship', 'view'),
  p('program.manage_sponsorship', 'PROGRAMS', 'Manage sponsorship', 'manage'),

  // ── PROJECTS ───────────────────────────────────────────────────────────
  p('project.view', 'PROJECTS', 'View projects', 'view'),
  p('project.create', 'PROJECTS', 'Create projects', 'create'),
  p('project.edit', 'PROJECTS', 'Edit projects', 'edit'),
  p('project.delete', 'PROJECTS', 'Delete projects', 'delete', { sensitive: true }),
  p('project.archive', 'PROJECTS', 'Archive projects', 'delete'),
  p('project.manage_budget', 'PROJECTS', 'Manage project budget', 'manage', { sensitive: true }),
  p('project.manage_milestones', 'PROJECTS', 'Manage milestones', 'manage'),
  p('project.update_status', 'PROJECTS', 'Update project status', 'edit'),
  p('project.upload_media', 'PROJECTS', 'Upload project media', 'create'),
  p('project.submit_progress_report', 'PROJECTS', 'Submit progress report', 'create'),
  p('project.submit_completion_report', 'PROJECTS', 'Submit completion report', 'create'),
  p('project.mark_completed', 'PROJECTS', 'Mark project completed', 'manage'),
  p('project.view_financial_info', 'PROJECTS', 'View project financial information', 'view', { sensitive: true }),

  // ── MEDIA / CONTENT ────────────────────────────────────────────────────
  p('media.view', 'MEDIA', 'View media', 'view'),
  p('media.upload', 'MEDIA', 'Upload media', 'create'),
  p('media.edit', 'MEDIA', 'Edit media', 'edit'),
  p('media.delete', 'MEDIA', 'Delete media', 'delete'),
  p('media.publish', 'MEDIA', 'Publish media', 'publish'),
  p('media.unpublish', 'MEDIA', 'Unpublish media', 'publish'),
  p('media.manage_events', 'MEDIA', 'Manage events', 'manage'),
  p('media.manage_stories', 'MEDIA', 'Manage stories', 'manage'),
  p('media.manage_announcements', 'MEDIA', 'Manage announcements', 'manage'),
  p('media.manage_homepage', 'MEDIA', 'Manage homepage content', 'manage'),
  p('media.manage_videos', 'MEDIA', 'Manage videos', 'manage'),
  p('media.manage_images', 'MEDIA', 'Manage images', 'manage'),
  p('media.manage_categories', 'MEDIA', 'Manage categories', 'manage'),

  // ── COMMUNICATION ──────────────────────────────────────────────────────
  p('message.view', 'COMMUNICATION', 'View messages', 'view'),
  p('message.start_conversation', 'COMMUNICATION', 'Start conversation', 'create'),
  p('message.send', 'COMMUNICATION', 'Send messages', 'create'),
  p('message.reply', 'COMMUNICATION', 'Reply to messages', 'create'),
  p('message.create_group_chat', 'COMMUNICATION', 'Create group chat', 'create'),
  p('message.manage_group_chats', 'COMMUNICATION', 'Manage group chats', 'manage'),
  p('message.delete', 'COMMUNICATION', 'Delete messages', 'delete'),
  p('message.view_team_conversations', 'COMMUNICATION', 'View team conversations', 'view'),
  p('message.communicate_reporters', 'COMMUNICATION', 'Communicate with reporters', 'create'),
  p('message.communicate_field_teams', 'COMMUNICATION', 'Communicate with field teams', 'create'),
  p('message.communicate_program_managers', 'COMMUNICATION', 'Communicate with program managers', 'create'),
  p('message.communicate_project_managers', 'COMMUNICATION', 'Communicate with project managers', 'create'),
  p('message.communicate_donors', 'COMMUNICATION', 'Communicate with donors', 'create'),

  // ── NOTIFICATIONS ──────────────────────────────────────────────────────
  p('notification.view', 'NOTIFICATIONS', 'View notifications', 'view'),
  p('notification.send', 'NOTIFICATIONS', 'Send notifications', 'create'),
  p('notification.send_broadcast', 'NOTIFICATIONS', 'Send broadcast notifications', 'manage'),
  p('notification.manage_templates', 'NOTIFICATIONS', 'Manage notification templates', 'manage'),
  p('notification.manage_settings', 'NOTIFICATIONS', 'Manage notification settings', 'manage'),

  // ── AI ─────────────────────────────────────────────────────────────────
  p('ai.use_assistant', 'AI', 'Use AI assistant', 'view'),
  p('ai.run_sanitization', 'AI', 'Run case sanitization', 'create'),
  p('ai.review_sanitization', 'AI', 'Review AI sanitization', 'approve'),
  p('ai.edit_content', 'AI', 'Edit AI-generated content', 'edit'),
  p('ai.approve_content', 'AI', 'Approve AI content', 'approve'),
  p('ai.reject_content', 'AI', 'Reject AI content', 'approve'),
  p('ai.view_logs', 'AI', 'View AI logs', 'view'),
  p('ai.view_usage', 'AI', 'View AI usage', 'view'),
  p('ai.manage_settings', 'AI', 'Manage AI settings', 'manage', { superAdminOnly: true }),

  // ── AUDIT / SECURITY ───────────────────────────────────────────────────
  p('audit.view', 'AUDIT_SECURITY', 'View audit logs', 'view', { sensitive: true }),
  p('audit.search', 'AUDIT_SECURITY', 'Search audit logs', 'view'),
  p('audit.export', 'AUDIT_SECURITY', 'Export audit logs', 'export', { sensitive: true }),
  p('security.view_events', 'AUDIT_SECURITY', 'View security events', 'view', { sensitive: true }),
  p('security.view_login_history', 'AUDIT_SECURITY', 'View login history', 'view'),
  p('security.view_failed_logins', 'AUDIT_SECURITY', 'View failed login attempts', 'view', { sensitive: true }),
  p('security.view_suspicious_activity', 'AUDIT_SECURITY', 'View suspicious activity', 'view', { sensitive: true }),
  p('security.view_fraud_alerts', 'AUDIT_SECURITY', 'View fraud alerts', 'view', { sensitive: true }),
  p('security.manage_settings', 'AUDIT_SECURITY', 'Manage security settings', 'manage', { sensitive: true, superAdminOnly: true }),

  // ── REPORTS / ANALYTICS ────────────────────────────────────────────────
  p('report.view', 'REPORTS', 'View reports', 'view'),
  p('report.generate', 'REPORTS', 'Generate reports', 'create'),
  p('report.export_csv', 'REPORTS', 'Export CSV', 'export'),
  p('report.export_excel', 'REPORTS', 'Export Excel', 'export'),
  p('report.export_pdf', 'REPORTS', 'Export PDF', 'export'),
  p('report.view_case_analytics', 'REPORTS', 'View case analytics', 'view'),
  p('report.view_donation_analytics', 'REPORTS', 'View donation analytics', 'view', { sensitive: true }),
  p('report.view_program_analytics', 'REPORTS', 'View program analytics', 'view'),
  p('report.view_project_analytics', 'REPORTS', 'View project analytics', 'view'),
  p('report.view_field_team_analytics', 'REPORTS', 'View field-team analytics', 'view'),
  p('report.view_impact_analytics', 'REPORTS', 'View impact analytics', 'view'),

  // ── SYSTEM SETTINGS ────────────────────────────────────────────────────
  p('system.view_settings', 'SYSTEM', 'View system settings', 'view'),
  p('system.edit_settings', 'SYSTEM', 'Edit system settings', 'edit', { sensitive: true, superAdminOnly: true }),
  p('system.manage', 'SYSTEM', 'Manage system configuration', 'manage', { sensitive: true, superAdminOnly: true }),
  p('system.manage_notification_settings', 'SYSTEM', 'Manage notification settings', 'manage', { superAdminOnly: true }),
  p('system.manage_integrations', 'SYSTEM', 'Manage integrations', 'manage', { sensitive: true, superAdminOnly: true }),
  p('system.manage_api_settings', 'SYSTEM', 'Manage API settings', 'manage', { sensitive: true, superAdminOnly: true }),
  p('system.manage_storage', 'SYSTEM', 'Manage storage settings', 'manage', { sensitive: true, superAdminOnly: true }),
  p('role.manage', 'SYSTEM', 'Manage roles', 'manage', { sensitive: true, superAdminOnly: true }),
  p('permission.manage', 'SYSTEM', 'Manage permissions', 'manage', { sensitive: true, superAdminOnly: true }),
  p('permission.manage_groups', 'SYSTEM', 'Manage permission groups', 'manage', { sensitive: true, superAdminOnly: true }),
];

export const PERMISSION_MODULES = Array.from(new Set(PERMISSION_CATALOG.map(x => x.module)));

export const PERMISSION_BY_KEY = new Map(PERMISSION_CATALOG.map(x => [x.key, x]));

/**
 * The ~12 permissions this rollout actually enforces on real routes (see
 * backend/src/middleware/permissions.ts callers). Everything else in the catalog is
 * fully assignable/auditable today but not yet gating a real endpoint — deliberate,
 * incremental scope (see the plan this was built from).
 */
export const ENFORCED_PERMISSION_KEYS = [
  'donation.confirm',
  'donation.refund',
  'case.approve',
  'case.reject',
  'case.publish',
  'case.archive',
  'case.view_private',
  'case.view',
  'user.delete',
  'user.role_change',
  'user.permission_assign',
  'system.manage',
  'audit.view',
];
