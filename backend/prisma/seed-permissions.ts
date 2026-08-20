// One-time (idempotent) seed for the permission system: the full Permission catalog,
// default RolePermission grants, and starter PermissionGroup templates.
//
// Run manually: cd backend && npx ts-node --transpile-only prisma/seed-permissions.ts
//
// The 12 ENFORCED permissions (see permissionCatalog.ts) are seeded to *exactly* match
// today's existing role checks on their routes — verified against the live route code,
// not guessed — so turning on requirePermission() cannot silently narrow anyone's access.
// The remaining ~238 catalogued-but-not-yet-enforced permissions get sensible per-role
// defaults by module (lower stakes: nothing reads them until a route is migrated to
// requirePermission() later).
import { PrismaClient } from '@prisma/client';
import { PERMISSION_CATALOG, PermissionDef } from '../src/services/permissionCatalog';

const prisma = new PrismaClient();

const ALL_ROLES = ['super_admin', 'admin', 'verification_office', 'office_staff', 'program_manager', 'project_manager', 'field_agent', 'field_team', 'reporter', 'donor', 'user'];

// Ground truth for the 12 permissions that actually gate a route today — copied from the
// verified route code, not inferred. role -> scope.
const ENFORCED_DEFAULTS: Record<string, Record<string, string>> = {
  'donation.confirm':      { admin: 'global', super_admin: 'global', verification_office: 'global', office_staff: 'global', program_manager: 'global', project_manager: 'global' },
  'donation.refund':       { admin: 'global', super_admin: 'global' },
  'case.approve':          { admin: 'global', super_admin: 'global', verification_office: 'global', office_staff: 'global', program_manager: 'global', project_manager: 'global' },
  'case.reject':           { admin: 'global', super_admin: 'global', verification_office: 'global', office_staff: 'global', program_manager: 'global', project_manager: 'global' },
  'case.publish':          { admin: 'global', super_admin: 'global', verification_office: 'global', office_staff: 'global', program_manager: 'global', project_manager: 'global' },
  'case.archive':          { admin: 'global', super_admin: 'global' },
  'case.view_private':     { admin: 'global', super_admin: 'global', verification_office: 'global', office_staff: 'global', program_manager: 'global', project_manager: 'global' },
  'case.view':             { admin: 'global', super_admin: 'global', verification_office: 'global', office_staff: 'global', program_manager: 'global', project_manager: 'global', reporter: 'own' },
  'user.delete':           { super_admin: 'global' },
  'user.role_change':      { super_admin: 'global' },
  'user.permission_assign':{ admin: 'global', super_admin: 'global' },
  'system.manage':         { admin: 'global', super_admin: 'global' },
  'audit.view':            { admin: 'global', super_admin: 'global', verification_office: 'global', office_staff: 'global', program_manager: 'global', project_manager: 'global' },
};

// Heuristic defaults for the rest of the catalog, by module. 'full' = every level in that
// module (view/create/edit/etc, minus superAdminOnly); 'view' = view-level entries only.
const ROLE_MODULE_ACCESS: Record<string, { full?: string[]; view?: string[] }> = {
  super_admin:          { full: ['*'] },
  admin:                { full: ['*'] }, // superAdminOnly entries filtered out below regardless
  verification_office:  { full: ['CASE_MANAGEMENT', 'CASE_REPORTING', 'FIELD_OPERATIONS', 'AUDIT_SECURITY', 'AI', 'REPORTS', 'COMMUNICATION'], view: ['DASHBOARD', 'DONORS', 'FINANCE', 'PROGRAMS', 'PROJECTS', 'MEDIA', 'USERS', 'NOTIFICATIONS'] },
  office_staff:         { full: ['PROGRAMS', 'COMMUNICATION', 'CASE_REPORTING'], view: ['DASHBOARD', 'CASE_MANAGEMENT', 'FIELD_OPERATIONS', 'DONORS', 'FINANCE', 'PROJECTS', 'MEDIA', 'REPORTS'] },
  program_manager:      { full: ['PROGRAMS', 'COMMUNICATION'], view: ['DASHBOARD', 'CASE_MANAGEMENT', 'PROJECTS', 'DONORS', 'REPORTS'] },
  project_manager:      { full: ['PROJECTS', 'COMMUNICATION'], view: ['DASHBOARD', 'CASE_MANAGEMENT', 'PROGRAMS', 'DONORS', 'REPORTS'] },
  field_agent:          { full: ['FIELD_OPERATIONS'], view: ['DASHBOARD', 'CASE_REPORTING', 'MEDIA', 'COMMUNICATION'] },
  field_team:           { full: ['FIELD_OPERATIONS'], view: ['DASHBOARD', 'CASE_REPORTING', 'MEDIA', 'COMMUNICATION'] },
  reporter:             { full: ['CASE_REPORTING'], view: ['DASHBOARD', 'NOTIFICATIONS', 'COMMUNICATION'] },
  donor:                { view: ['DASHBOARD', 'NOTIFICATIONS', 'COMMUNICATION'] },
  user:                 { view: ['DASHBOARD', 'NOTIFICATIONS'] },
};

const STARTER_GROUPS: { name: string; description: string; permissions: string[] }[] = [
  { name: 'Reporter', description: 'Field reporters submitting new cases', permissions: ['reporting.create_case', 'reporting.upload_photos', 'reporting.upload_videos', 'reporting.upload_documents', 'reporting.view_own_cases', 'reporting.receive_notifications'] },
  { name: 'Field Agent', description: 'Field verification and delivery staff', permissions: ['field.view_assignments', 'field.start_investigation', 'field.upload_investigation_photos', 'field.capture_gps', 'field.submit_delivery_proof'] },
  { name: 'Verification Officer', description: 'Reviews and approves incoming cases', permissions: ['case.view', 'case.approve', 'case.reject', 'case.assign', 'case.request_info', 'field.view_fraud_alerts'] },
  { name: 'Program Manager', description: 'Manages beneficiaries and sponsorships', permissions: ['program.enroll_beneficiary', 'program.edit_beneficiary', 'program.manage_sponsorship', 'program.submit_monthly_update'] },
  { name: 'Project Manager', description: 'Manages community projects and milestones', permissions: ['project.manage_milestones', 'project.update_status', 'project.submit_progress_report', 'project.mark_completed'] },
  { name: 'Donor Support', description: 'Handles donor communication and receipts', permissions: ['donor.view', 'donor.view_history', 'donation.view', 'donation.generate_receipts', 'message.communicate_donors'] },
  { name: 'Finance Officer', description: 'Confirms and reconciles payments', permissions: ['finance.view_transactions', 'finance.confirm_payment', 'donation.confirm', 'finance.view_reports'] },
];

async function main() {
  console.log('Seeding permission catalog...');
  for (const def of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: def.key },
      update: { module: def.module, label: def.label, level: def.level, sensitive: def.sensitive, superAdminOnly: def.superAdminOnly },
      create: { key: def.key, module: def.module, label: def.label, level: def.level, sensitive: !!def.sensitive, superAdminOnly: !!def.superAdminOnly },
    });
  }
  console.log(`  ${PERMISSION_CATALOG.length} permissions upserted.`);

  console.log('Seeding role defaults...');
  let roleRows = 0;
  const byModule = new Map<string, PermissionDef[]>();
  for (const def of PERMISSION_CATALOG) {
    if (!byModule.has(def.module)) byModule.set(def.module, []);
    byModule.get(def.module)!.push(def);
  }

  for (const role of ALL_ROLES) {
    const grants = new Map<string, string>(); // key -> scope

    const access = ROLE_MODULE_ACCESS[role];
    if (access) {
      const fullModules = access.full?.includes('*') ? Array.from(byModule.keys()) : (access.full || []);
      for (const mod of fullModules) {
        for (const def of byModule.get(mod) || []) {
          if (def.superAdminOnly && role !== 'super_admin') continue;
          grants.set(def.key, 'global');
        }
      }
      for (const mod of access.view || []) {
        for (const def of byModule.get(mod) || []) {
          if (def.level !== 'view' || (def.superAdminOnly && role !== 'super_admin')) continue;
          grants.set(def.key, 'global');
        }
      }
    }

    // Ground-truth overrides for enforced permissions always win, exactly matching route code.
    for (const [key, roleScopes] of Object.entries(ENFORCED_DEFAULTS)) {
      if (roleScopes[role]) grants.set(key, roleScopes[role]);
      else grants.delete(key); // this role does NOT have this enforced permission today — don't over-grant
    }

    for (const [key, scope] of grants) {
      await prisma.rolePermission.upsert({
        where: { role_permissionKey: { role, permissionKey: key } },
        update: { scope },
        create: { role, permissionKey: key, scope },
      });
      roleRows++;
    }
  }
  console.log(`  ${roleRows} role-permission rows upserted.`);

  console.log('Seeding starter permission groups...');
  for (const g of STARTER_GROUPS) {
    const group = await prisma.permissionGroup.upsert({
      where: { name: g.name },
      update: { description: g.description },
      create: { name: g.name, description: g.description, createdBy: 'system-seed' },
    });
    for (const key of g.permissions) {
      await prisma.groupPermission.upsert({
        where: { groupId_permissionKey: { groupId: group.id, permissionKey: key } },
        update: {},
        create: { groupId: group.id, permissionKey: key, scope: 'own' },
      });
    }
  }
  console.log(`  ${STARTER_GROUPS.length} starter groups upserted.`);

  console.log('Done.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
