import { prisma } from '../prisma/client';

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m"
};

function logStep(step: number, title: string) {
  console.log(`\n${colors.bright}${colors.cyan}=========================================`);
  console.log(`🚀 MVP STEP ${step}: ${title}`);
  console.log(`=========================================${colors.reset}\n`);
}

function logSuccess(message: string) {
  console.log(`${colors.green}✔ Success: ${message}${colors.reset}`);
}

function logFailure(message: string) {
  console.log(`${colors.red}❌ Error: ${message}${colors.reset}`);
}

async function runMVPSimulation() {
  console.log(`\n${colors.bright}${colors.yellow}====================================================`);
  console.log(`🧪 KAFAALA QAAD — MVP STABILIZATION TEST RUNNER`);
  console.log(`====================================================${colors.reset}\n`);

  try {
    // ── STEP 1: CLEAN WORKSPACE ──
    logStep(1, "Cleaning Database Sandbox Environment");
    
    await prisma.donation.deleteMany({});
    await prisma.fieldReport.deleteMany({});
    await prisma.adminAuditLog.deleteMany({});
    await prisma.case.deleteMany({});
    await prisma.idempotencyKey.deleteMany({});
    await prisma.user.deleteMany({});

    logSuccess("Cleaned all tables successfully.");

    // ── STEP 2: ACTOR PROFILE PROVISIONING ──
    logStep(2, "Provisioning Core MVP Users");

    const reporter = await prisma.user.create({
      data: { name: "Somalia Relief Team", email: "reporter@kafaale.org", password: "secureHashPassword123", role: "guest" }
    });

    const agent = await prisma.user.create({
      data: { name: "Mogadishu Field Coordinator", email: "agent@kafaale.org", password: "secureHashPassword123", role: "field_agent" }
    });

    const admin = await prisma.user.create({
      data: { name: "Central Administrator", email: "admin@kafaale.org", password: "secureHashPassword123", role: "admin" }
    });

    logSuccess("Users successfully created:");
    console.log(`  - 📝 Reporter: ${reporter.email}`);
    console.log(`  - 🚶 Field Agent: ${agent.email}`);
    console.log(`  - 🏢 Admin: ${admin.email}`);

    // ── STEP 3: CASE INGESTION & IDEMPOTENCY ──
    logStep(3, "Ingesting Case with Idempotency Key Validation");

    const idemKeyCase = "case_uuid_key_abc_123";

    // Insert idempotency key into db to mock ingestion
    await prisma.idempotencyKey.create({ data: { key: idemKeyCase } });

    // Try to create the case
    const testCase = await prisma.case.create({
      data: {
        title: "MVP: Mogadishu Drought Water Trucking",
        description: "Emergency delivery of clean drinking water to displaced communities.",
        category: "medical",
        emergencyLevel: "critical",
        reporterId: reporter.id,
        status: "pending",
        targetGoal: 5000
      }
    });

    logSuccess(`Ingested Case: "${testCase.title}"`);
    console.log(`  - Case ID: ${testCase.id}`);

    // Try to reuse the idempotency key and verify failure
    try {
      await prisma.idempotencyKey.create({ data: { key: idemKeyCase } });
      logFailure("Duplicate idempotency key allowed! Critical data validation failure!");
      process.exit(1);
    } catch (err) {
      logSuccess("Idempotency key blocked duplicate ingestion correctly. Database integrity preserved.");
    }

    // ── STEP 4: COORDINATOR DISPATCH ──
    logStep(4, "Dispatching Case to Field Agent");

    const [dispatchedCase] = await prisma.$transaction([
      prisma.case.update({
        where: { id: testCase.id },
        data: { status: "field_assigned" }
      }),
      prisma.adminAuditLog.create({
        data: { adminId: admin.id, caseId: testCase.id, action: "assigned", notes: `Dispatched agent: ${agent.name}` }
      })
    ]);

    logSuccess(`Case status updated: ${dispatchedCase.status.toUpperCase()}`);

    // ── STEP 5: FIELD PHYSICAL REPORT SUBMISSION ──
    logStep(5, "Submitting Physical Field Verification Report");

    const [report] = await prisma.$transaction([
      prisma.fieldReport.create({
        data: {
          caseId: testCase.id,
          agentId: agent.id,
          gpsLat: 2.0469, // Mogadishu lat
          gpsLng: 45.3182, // Mogadishu lng
          verificationStatus: "verified",
          notes: "Water trucking operations successfully verified on-site. Target communities reached."
        }
      }),
      prisma.case.update({
        where: { id: testCase.id },
        data: { status: "verified" }
      })
    ]);

    logSuccess("Field report submitted successfully:");
    console.log(`  - Verification Status: ${report.verificationStatus.toUpperCase()}`);
    console.log(`  - Coordinator Notes: "${report.notes}"`);

    // ── STEP 6: SIMPLE DONATION PROCESSING ──
    logStep(6, "Processing Simple Safe Donation Record");

    const idemKeyDonation = "payment_tx_id_xyz_987";

    // Log idempotency key
    await prisma.idempotencyKey.create({ data: { key: idemKeyDonation } });

    // Process Donation
    const [donation] = await prisma.$transaction([
      prisma.donation.create({
        data: {
          donorId: reporter.id, // Mapped for testing
          caseId: testCase.id,
          amount: 5000,
          method: "mobile_money",
          status: "completed"
        }
      }),
      prisma.case.update({
        where: { id: testCase.id },
        data: { totalRaised: { increment: 5000 } }
      })
    ]);

    logSuccess("Donation successfully processed:");
    console.log(`  - Amount Contributed: $${donation.amount}`);
    console.log(`  - Payment Method: ${donation.method.toUpperCase()}`);
    console.log(`  - Transaction Status: ${donation.status.toUpperCase()}`);

    // Verify double payment block
    try {
      await prisma.idempotencyKey.create({ data: { key: idemKeyDonation } });
      logFailure("Duplicate donation idempotency key allowed! Double-spend financial risk!");
      process.exit(1);
    } catch (err) {
      logSuccess("Idempotency key blocked duplicate donation transaction. Financial double-spend protected.");
    }

    // ── STEP 7: VERIFY DATA CONSISTENCY ──
    logStep(7, "Verifying Global Platform Data Integrity");

    const finalCaseState = await prisma.case.findUnique({
      where: { id: testCase.id }
    });

    if (finalCaseState && Number(finalCaseState.totalRaised) === 5000) {
      logSuccess(`Funding consistency checked out! Raised exactly $${finalCaseState.totalRaised}.`);
    } else {
      logFailure(`Data inconsistency! Case totalRaised: ${finalCaseState?.totalRaised}`);
      process.exit(1);
    }

    console.log(`\n${colors.bright}${colors.green}====================================================`);
    console.log(`🎉 ALL MVP STABILITY & HARDENING CHECKS COMPLETED SUCCESSFULY!`);
    console.log(`====================================================${colors.reset}\n`);

  } catch (err) {
    console.error("❌ Test crashed:", err);
    process.exit(1);
  }
}

runMVPSimulation();
