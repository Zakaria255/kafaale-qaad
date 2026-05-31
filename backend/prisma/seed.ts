import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Kafaale database…');
  const pw = await bcrypt.hash('Kafaale123!', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@kafaale.org' },
    update: {},
    create: { name: 'Super Admin', email: 'superadmin@kafaale.org', password: pw, role: 'super_admin', phone: '+252612000001', country: 'Somalia', city: 'Mogadishu' },
  });
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kafaale.org' },
    update: {},
    create: { name: 'Ahmed Kafaale', email: 'admin@kafaale.org', password: pw, role: 'admin', phone: '+252612000002', country: 'Somalia', city: 'Mogadishu' },
  });
  const agent = await prisma.user.upsert({
    where: { email: 'agent@kafaale.org' },
    update: {},
    create: { name: 'Abdi Yusuf', email: 'agent@kafaale.org', password: pw, role: 'field_agent', phone: '+252612000003', country: 'Somalia', city: 'Garowe' },
  });
  const donor = await prisma.user.upsert({
    where: { email: 'donor@kafaale.org' },
    update: {},
    create: { name: 'Fatima Al-Thani', email: 'donor@kafaale.org', password: pw, role: 'donor', phone: '+97450000001', country: 'Qatar', city: 'Doha' },
  });
  const reporter = await prisma.user.upsert({
    where: { email: 'reporter@kafaale.org' },
    update: {},
    create: { name: 'Hodan Farah', email: 'reporter@kafaale.org', password: pw, role: 'reporter', phone: '+252612000005', country: 'Somalia', city: 'Mogadishu' },
  });
  console.log('✅ 5 users created');

  // Case A — published, waiting for sponsor
  const caseA = await prisma.case.create({
    data: {
      caseRef: 'KQ-2026-0001',
      reporterId: reporter.id,
      category: 'medical', emergencyLevel: 'critical', status: 'waiting_for_sponsor',
      privateVictimName: 'Faadumo Hassan', privateVictimPhone: '+252612999888',
      privateAddress: 'Hodan District, House 47, Near Makka Al-Mukarama Road',
      privateGpsLat: 2.0469, privateGpsLng: 45.3182, privateFamilySize: 7,
      privateVictimAge: 38, privateVictimGender: 'female',
      privateDescription: 'Mother of 5 with stage-3 kidney disease. Family cannot afford dialysis. Husband lost job after flood. Children malnourished.',
      publicTitle: 'Urgent Medical Support for a Family in Mogadishu',
      publicStory: 'A mother of five children in Mogadishu is facing a critical medical emergency. She requires life-saving dialysis treatment three times per week but her family cannot cover the costs. Her husband recently lost his livelihood due to floods. Your support will fund essential medical treatments.',
      publicCity: 'Mogadishu', publicCountry: 'Somalia', publicMediaUrls: [],
      targetGoal: 5400, totalRaised: 1200,
      aiSanitizedAt: new Date(), adminPublishedAt: new Date(),
      teamAssignedAt: new Date(Date.now() - 5*86400000),
      investigationCompletedAt: new Date(Date.now() - 3*86400000),
      assignedAgentId: agent.id,
    },
  });

  await prisma.fieldInvestigation.create({
    data: {
      caseId: caseA.id, agentId: agent.id,
      victimVerified: true, situationAccurate: true,
      situationNotes: 'Visited home. Medical documents confirmed. Hospital referral letter verified.',
      gpsVerificationLat: 2.0470, gpsVerificationLng: 45.3180,
      estimatedAmountNeeded: 5400, urgencyConfirmed: 'critical',
      deliveryFeasible: true, deliveryMethod: 'Direct payment to hospital dialysis unit',
      fraudRiskScore: 5, fraudRiskLevel: 'low',
      fraudRiskNotes: 'All documents verified. GPS matches. No inconsistencies found.',
      verificationStatus: 'verified',
      officialNotes: 'Urgent case. Medical documentation solid. Recommend immediate publication.',
    },
  });

  await prisma.aiPublicData.create({
    data: {
      caseId: caseA.id,
      generatedTitle: 'Urgent Medical Support for a Family in Mogadishu',
      generatedStory: 'A mother of five children in Mogadishu is facing a critical medical emergency requiring life-saving dialysis treatment. Your support will fund essential medical treatments.',
      generatedCategory: 'medical', generatedCity: 'Mogadishu, Somalia', generatedUrgency: 'critical',
      safeMediaUrls: [], piiDetected: true,
      piiRemoved: ['victim full name', 'victim phone', 'exact home address', 'GPS coords'],
      mediaFlagged: [], confidenceScore: 94, model: 'claude-sonnet-4-6',
    },
  });

  await prisma.donation.create({
    data: {
      donorId: donor.id, caseId: caseA.id,
      amount: 1200, currency: 'USD', method: 'card',
      status: 'confirmed', transactionRef: 'TXN-DEMO-001',
      confirmedAt: new Date(Date.now() - 2*86400000),
      donorMessage: 'May Allah make it easy for this family.',
    },
  });

  // Case B — food, pending review
  await prisma.case.create({
    data: {
      caseRef: 'KQ-2026-0002',
      reporterId: reporter.id, category: 'food', emergencyLevel: 'high', status: 'pending_review',
      privateVictimName: 'Ibrahim Warsame', privateVictimPhone: '+252615000222',
      privateAddress: 'Aato IDP Camp, North-East Garowe, Puntland',
      privateGpsLat: 8.4064, privateGpsLng: 48.4821, privateFamilySize: 12,
      privateDescription: 'Displaced farmer family. Drought wiped out crops. Children showing signs of acute malnutrition.',
      targetGoal: 7500, totalRaised: 0,
    },
  });

  // Case C — shelter, team assigned
  const caseC = await prisma.case.create({
    data: {
      caseRef: 'KQ-2026-0003',
      reporterId: reporter.id, category: 'shelter', emergencyLevel: 'high', status: 'team_assigned',
      privateVictimName: 'Halima Nur', privateVictimPhone: '+252618000333',
      privateAddress: 'Daynile District Flood Zone, Mogadishu',
      privateGpsLat: 2.0628, privateGpsLng: 45.2974, privateFamilySize: 30,
      privateDescription: 'Flash floods destroyed 30 IDP family shelters. Families sleeping in the open. Need urgent shelter materials.',
      targetGoal: 6200, totalRaised: 0,
      teamAssignedAt: new Date(), assignedAgentId: agent.id,
    },
  });

  // Case D — completed
  await prisma.case.create({
    data: {
      caseRef: 'KQ-2026-0004',
      reporterId: reporter.id, category: 'orphan', emergencyLevel: 'critical', status: 'completed',
      privateVictimName: 'Mahad Jimcaale', privateVictimPhone: '+252617000444',
      privateAddress: 'Baidoa, Bay Region',
      privateFamilySize: 1, privateVictimAge: 8, privateVictimGender: 'male',
      privateDescription: 'Orphan child, severe malnutrition, needs immediate nutrition support and shelter.',
      publicTitle: 'Nutrition Support for Orphan Child in Baidoa',
      publicStory: 'An 8-year-old orphan in Baidoa required urgent nutrition and medical support. Thanks to your donations, this child has been fully supported.',
      publicCity: 'Baidoa', publicCountry: 'Somalia', publicMediaUrls: [],
      targetGoal: 1200, totalRaised: 1200,
      aiSanitizedAt: new Date(Date.now() - 20*86400000),
      adminPublishedAt: new Date(Date.now() - 18*86400000),
      completedAt: new Date(Date.now() - 5*86400000),
      assignedAgentId: agent.id,
    },
  });

  await prisma.notification.createMany({
    data: [
      { userId: admin.id, caseId: caseA.id, type: 'investigation_completed', title: '📋 Investigation Report Submitted', message: 'Field investigation complete. Ready for AI sanitization.', isRead: true },
      { userId: admin.id, type: 'case_submitted', title: '📥 New Emergency Report', message: 'A new food emergency case has been submitted and requires your review.', isRead: false },
      { userId: reporter.id, caseId: caseA.id, type: 'case_published', title: '✅ Your Case is Now Live', message: 'Your submitted case has been verified and published to the donor portal.', isRead: false },
      { userId: donor.id, caseId: caseA.id, type: 'payment_confirmed', title: '💳 Payment Confirmed', message: 'Your donation of $1,200 has been confirmed and is now in escrow.', isRead: false },
      { userId: agent.id, caseId: caseC.id, type: 'case_assigned', title: '🗂️ New Investigation Assigned', message: 'A high-priority shelter case in Mogadishu has been assigned to you.', isRead: true },
    ],
  });

  await prisma.adminAuditLog.createMany({
    data: [
      { adminId: admin.id, caseId: caseA.id, action: 'assigned_team', notes: 'Assigned Abdi Yusuf to investigate this medical emergency.' },
      { adminId: admin.id, caseId: caseA.id, action: 'triggered_ai', notes: 'Triggered AI sanitization after field report submitted.' },
      { adminId: admin.id, caseId: caseA.id, action: 'published', notes: 'Approved AI output and published to donor portal.' },
    ],
  });

  // ── Program Manager user ─────────────────────────────────────────────────
  const programManager = await prisma.user.upsert({
    where: { email: 'programs@kafaale.org' },
    update: {},
    create: { name: 'Sahra Programs', email: 'programs@kafaale.org', password: pw, role: 'program_manager', phone: '+252612000006', country: 'Somalia', city: 'Mogadishu' },
  });
  console.log('✅ Program Manager user created');

  // ── Humanitarian Programs ─────────────────────────────────────────────────
  const progChild = await prisma.program.upsert({
    where: { id: 'prog-child-001' },
    update: {},
    create: {
      id: 'prog-child-001',
      name: 'Child Sponsorship Program', type: 'child_sponsorship',
      description: 'Long-term sponsorship for orphans and vulnerable children covering education, food, medical care and clothing. Each child is matched with a dedicated sponsor who receives monthly progress updates.',
      icon: '👶', color: '#EC4899', isActive: true, totalBeneficiaries: 3, activeSponsorships: 1,
    },
  });

  const progEducation = await prisma.program.upsert({
    where: { id: 'prog-edu-001' },
    update: {},
    create: {
      id: 'prog-edu-001',
      name: 'Education Support Program', type: 'education',
      description: 'Sponsoring school fees, books, uniforms and supplies for children who cannot attend school due to financial hardship. Track attendance, grades and graduation.',
      icon: '🎓', color: '#3B82F6', isActive: true, totalBeneficiaries: 2, activeSponsorships: 0,
    },
  });

  const progMedical = await prisma.program.upsert({
    where: { id: 'prog-med-001' },
    update: {},
    create: {
      id: 'prog-med-001',
      name: 'Medical Continuity Program', type: 'medical',
      description: 'Continuous medical support for patients with chronic conditions — dialysis, cancer treatment, disability support. Care continues until professional discharge.',
      icon: '🩺', color: '#EF4444', isActive: true, totalBeneficiaries: 2, activeSponsorships: 1,
    },
  });

  const progFamily = await prisma.program.upsert({
    where: { id: 'prog-fam-001' },
    update: {},
    create: {
      id: 'prog-fam-001',
      name: 'Family Care Program', type: 'family_care',
      description: 'Monthly support for vulnerable families covering food, rent, medical care and education. Quarterly reviews track progress toward self-sufficiency.',
      icon: '🏠', color: '#F59E0B', isActive: true, totalBeneficiaries: 2, activeSponsorships: 0,
    },
  });
  console.log('✅ 4 Programs created');

  // ── Beneficiaries ─────────────────────────────────────────────────────────
  const ben1 = await prisma.beneficiary.upsert({
    where: { publicId: 'CSP-2026-001' },
    update: {},
    create: {
      publicId: 'CSP-2026-001', programId: progChild.id, programType: 'child_sponsorship',
      privateFullName: 'Amina Cabdullaahi Hassan', privateGuardianName: 'Caasha Hassan (Aunt)',
      privateGuardianPhone: '+252615111222', privateSchoolName: 'Al-Nuur Primary School, Hodan',
      privateAddress: 'Hodan District, Street 12, House 5, Mogadishu',
      privateMedicalNotes: 'Healthy. Routine checkup every 3 months.',
      publicAge: 10, publicGender: 'female', publicRegion: 'Banaadir', publicCity: 'Mogadishu', publicCountry: 'Somalia',
      publicNeedsDesc: 'School fees + food + clothing',
      publicStory: 'A 10-year-old orphan girl in Mogadishu lost both parents to illness. She lives with her aunt\'s family and dreams of becoming a doctor. Without monthly support she cannot attend school.',
      monthlyNeed: 35, status: 'sponsored',
      verifiedAt: new Date(Date.now() - 30*86400000), verifiedById: programManager.id,
      enrolledBy: programManager.id,
    },
  });

  const ben2 = await prisma.beneficiary.upsert({
    where: { publicId: 'CSP-2026-002' },
    update: {},
    create: {
      publicId: 'CSP-2026-002', programId: progChild.id, programType: 'child_sponsorship',
      privateFullName: 'Mahad Xasan Warsame', privateGuardianName: 'Maryan Warsame (Mother)',
      privateGuardianPhone: '+252618333444', privateSchoolName: 'Damal Academy, Wadajir',
      privateAddress: 'Wadajir District, Mogadishu',
      publicAge: 8, publicGender: 'male', publicRegion: 'Banaadir', publicCity: 'Mogadishu',
      publicNeedsDesc: 'School fees + food support + uniform',
      publicStory: 'An 8-year-old boy from a single-parent family. His father passed away and his mother works as a cleaner. Monthly sponsorship will keep him in school and fed.',
      monthlyNeed: 30, status: 'seeking_sponsor',
      verifiedAt: new Date(Date.now() - 10*86400000), verifiedById: programManager.id,
      enrolledBy: programManager.id,
    },
  });

  const ben3 = await prisma.beneficiary.upsert({
    where: { publicId: 'CSP-2026-003' },
    update: {},
    create: {
      publicId: 'CSP-2026-003', programId: progChild.id, programType: 'child_sponsorship',
      privateFullName: 'Fadumo Ali Mohamud', privateGuardianName: 'Ali Mohamud (Father)',
      privateGuardianPhone: '+252617555666', privateSchoolName: 'None — out of school',
      privateAddress: 'Daynile District, Mogadishu',
      publicAge: 12, publicGender: 'female', publicRegion: 'Banaadir', publicCity: 'Mogadishu',
      publicNeedsDesc: 'Education enrolment + school fees + food',
      publicStory: 'A 12-year-old girl who has never been to school due to poverty. Her family of 9 relies on daily labour. A sponsor will change the trajectory of her entire life.',
      monthlyNeed: 40, status: 'seeking_sponsor',
      verifiedAt: new Date(Date.now() - 5*86400000), verifiedById: programManager.id,
      enrolledBy: programManager.id,
    },
  });

  const ben4 = await prisma.beneficiary.upsert({
    where: { publicId: 'EDU-2026-001' },
    update: {},
    create: {
      publicId: 'EDU-2026-001', programId: progEducation.id, programType: 'education',
      privateFullName: 'Ismail Daud Ibrahim', privateGuardianName: 'Daud Ibrahim (Father)',
      privateGuardianPhone: '+252611777888', privateSchoolName: 'Horseed Secondary School, Garowe',
      privateAddress: 'Garowe, Nugal Region, Puntland',
      publicAge: 16, publicGender: 'male', publicRegion: 'Nugal', publicCity: 'Garowe',
      publicNeedsDesc: 'Secondary school fees + textbooks + exam fees',
      publicStory: 'A bright 16-year-old student in Garowe who scores top of his class but is at risk of dropping out. His school fees for the year total $420. A sponsor will secure his secondary education.',
      monthlyNeed: 45, status: 'seeking_sponsor',
      verifiedAt: new Date(Date.now() - 7*86400000), verifiedById: programManager.id,
      enrolledBy: programManager.id,
    },
  });

  const ben5 = await prisma.beneficiary.upsert({
    where: { publicId: 'EDU-2026-002' },
    update: {},
    create: {
      publicId: 'EDU-2026-002', programId: progEducation.id, programType: 'education',
      privateFullName: 'Hodan Abdirashid Osman', privateGuardianName: 'Abdirashid Osman (Father)',
      privateGuardianPhone: '+252613999000',
      privateSchoolName: 'Hiiraan Girls School, Beledweyne',
      privateAddress: 'Beledweyne, Hiiraan Region',
      publicAge: 14, publicGender: 'female', publicRegion: 'Hiiraan', publicCity: 'Beledweyne',
      publicNeedsDesc: 'Girls school fees + uniform + sanitary supplies',
      publicStory: 'A 14-year-old girl in Beledweyne whose education is at risk. With targeted sponsorship she can complete her middle school education and continue to high school.',
      monthlyNeed: 25, status: 'pending_verification',
      enrolledBy: programManager.id,
    },
  });

  const ben6 = await prisma.beneficiary.upsert({
    where: { publicId: 'MED-2026-001' },
    update: {},
    create: {
      publicId: 'MED-2026-001', programId: progMedical.id, programType: 'medical',
      privateFullName: 'Xirsi Mukhtar Jama', privateGuardianName: 'Mukhtar Jama (Son)',
      privateGuardianPhone: '+252614222333',
      privateSchoolName: 'N/A', privateAddress: 'Hodan District, Mogadishu',
      privateMedicalNotes: 'Chronic kidney failure. Requires dialysis 3x/week at Banadir Hospital.',
      publicAge: 62, publicGender: 'male', publicRegion: 'Banaadir', publicCity: 'Mogadishu',
      publicNeedsDesc: 'Dialysis 3x/week + medication + transport',
      publicStory: 'A 62-year-old man with chronic kidney failure requiring dialysis three times per week. Without continuous sponsorship, treatment will stop. Monthly support covers all dialysis sessions and medication.',
      monthlyNeed: 180, status: 'sponsored',
      verifiedAt: new Date(Date.now() - 45*86400000), verifiedById: programManager.id,
      enrolledBy: programManager.id,
    },
  });

  const ben7 = await prisma.beneficiary.upsert({
    where: { publicId: 'MED-2026-002' },
    update: {},
    create: {
      publicId: 'MED-2026-002', programId: progMedical.id, programType: 'medical',
      privateFullName: 'Nimco Abdi Farah', privateGuardianName: 'Abdi Farah (Husband)',
      privateGuardianPhone: '+252616444555',
      privateAddress: 'Karan District, Mogadishu',
      privateMedicalNotes: 'Type-1 diabetes. Requires daily insulin and monthly labs.',
      publicAge: 34, publicGender: 'female', publicRegion: 'Banaadir', publicCity: 'Mogadishu',
      publicNeedsDesc: 'Monthly insulin + lab tests + medical supplies',
      publicStory: 'A mother of three living with Type-1 diabetes. She depends on monthly insulin supplies to survive. Sponsorship covers all her medication and regular checkups.',
      monthlyNeed: 75, status: 'seeking_sponsor',
      verifiedAt: new Date(Date.now() - 12*86400000), verifiedById: programManager.id,
      enrolledBy: programManager.id,
    },
  });

  const ben8 = await prisma.beneficiary.upsert({
    where: { publicId: 'FAM-2026-001' },
    update: {},
    create: {
      publicId: 'FAM-2026-001', programId: progFamily.id, programType: 'family_care',
      privateFullName: 'Khadija Nur Ali (Head of Family)', privateGuardianName: 'N/A',
      privateGuardianPhone: '+252619888777',
      privateAddress: 'Dharkenley District, Mogadishu',
      privateNotes: 'Widow with 6 children. No income. Husband died in 2024.',
      publicAge: 42, publicGender: 'female', publicRegion: 'Banaadir', publicCity: 'Mogadishu',
      publicNeedsDesc: 'Monthly food + rent + children\'s school fees',
      publicStory: 'A widow with six children who lost her husband and sole provider in 2024. Monthly family sponsorship will cover food, rent and the children\'s education until she regains stability.',
      monthlyNeed: 120, status: 'seeking_sponsor',
      verifiedAt: new Date(Date.now() - 8*86400000), verifiedById: programManager.id,
      enrolledBy: programManager.id,
    },
  });

  const ben9 = await prisma.beneficiary.upsert({
    where: { publicId: 'FAM-2026-002' },
    update: {},
    create: {
      publicId: 'FAM-2026-002', programId: progFamily.id, programType: 'family_care',
      privateFullName: 'Abdulle Sheikh Hassan (Head of Family)',
      privateGuardianPhone: '+252613000111',
      privateAddress: 'Afgooye, Lower Shabelle',
      privateNotes: 'Displaced IDP family. 8 members. Father disabled after accident.',
      publicAge: 48, publicGender: 'male', publicRegion: 'Lower Shabelle', publicCity: 'Afgooye',
      publicNeedsDesc: 'Monthly food basket + medical support for disability',
      publicStory: 'A displaced family of 8 from a rural area. The father became disabled after a farming accident and can no longer work. Monthly sponsorship provides food and basic medical support.',
      monthlyNeed: 90, status: 'pending_verification',
      enrolledBy: programManager.id,
    },
  });
  console.log('✅ 9 Beneficiaries enrolled');

  // ── Sample Sponsorship (donor → ben1 child) ───────────────────────────────
  await prisma.sponsorship.upsert({
    where: { id: 'spons-demo-001' },
    update: {},
    create: {
      id: 'spons-demo-001',
      beneficiaryId: ben1.id, sponsorId: donor.id,
      type: 'full', monthlyAmount: 35, currency: 'USD',
      status: 'active', paymentMethod: 'bank_transfer',
      totalPaid: 105, monthsCompleted: 3,
      nextPaymentDate: new Date(Date.now() + 7*86400000),
    },
  });

  await prisma.sponsorship.upsert({
    where: { id: 'spons-demo-002' },
    update: {},
    create: {
      id: 'spons-demo-002',
      beneficiaryId: ben6.id, sponsorId: donor.id,
      type: 'medical', monthlyAmount: 180, currency: 'USD',
      status: 'active', paymentMethod: 'bank_transfer',
      totalPaid: 360, monthsCompleted: 2,
      nextPaymentDate: new Date(Date.now() + 14*86400000),
    },
  });
  console.log('✅ 2 Sponsorships created');

  // ── Monthly Updates for ben1 (3 months) ──────────────────────────────────
  const months = [
    { month: 3, year: 2026, schoolAttendance: 92, healthStatus: 'good', progressNotes: 'Amina had an excellent month. She attended school every day except two days due to a minor cold. Her teacher reports she is one of the top students in her class. Food package delivered successfully.', deliveriesMade: ['School fees paid', 'Food package delivered', 'Uniform purchased'] },
    { month: 4, year: 2026, schoolAttendance: 96, healthStatus: 'good', progressNotes: 'Outstanding progress. Amina scored 94% in her monthly exams. She has made new friends and her confidence has grown. Books and supplies were delivered. Medical checkup completed — all clear.', deliveriesMade: ['School fees paid', 'Books & supplies delivered', 'Medical checkup completed'] },
    { month: 5, year: 2026, schoolAttendance: 88, healthStatus: 'good', progressNotes: 'Good month overall. Attendance slightly lower due to school holidays mid-month. The teacher confirmed Amina is preparing for end-of-year exams. Her aunt reports she is eating well and happy. Food support delivered.', deliveriesMade: ['School fees paid', 'Monthly food basket delivered', 'Exam preparation materials provided'] },
  ];

  for (const m of months) {
    await prisma.monthlyUpdate.upsert({
      where: { beneficiaryId_month_year: { beneficiaryId: ben1.id, month: m.month, year: m.year } },
      update: {},
      create: {
        beneficiaryId: ben1.id, submittedById: programManager.id,
        ...m, isPublished: true, publishedAt: new Date(),
        photoUrls: [], needsAssessment: 'No urgent needs at this time.',
      },
    });
  }
  console.log('✅ 3 Monthly updates created for CSP-2026-001');

  // ── Community Projects ────────────────────────────────────────────────────
  await prisma.communityProject.upsert({
    where: { publicId: 'CP-2026-001' },
    update: {},
    create: {
      publicId: 'CP-2026-001',
      title: 'Solar Water Well — Daryeel Village', category: 'water',
      description: 'Construction of a solar-powered water well to serve 850 residents of Daryeel village who currently walk 8km daily to access contaminated water sources.',
      location: 'Daryeel Village', region: 'Lower Shabelle', country: 'Somalia',
      populationSize: 850,
      problemDesc: 'Residents walk 8km daily to the nearest water source which is shared with livestock and frequently contaminated, causing recurring waterborne diseases.',
      solutionDesc: 'A solar-powered borehole well with a hand pump and storage tank. Low maintenance, sustainable, and provides clean water to all households within walking distance.',
      fundingGoal: 12000, totalRaised: 8700,
      status: 'seeking_funding', createdById: programManager.id,
      phases: [
        { name: 'Site Preparation', status: 'pending' },
        { name: 'Drilling', status: 'pending' },
        { name: 'Pump Installation', status: 'pending' },
        { name: 'Water Testing', status: 'pending' },
        { name: 'Project Completion', status: 'pending' },
      ],
      photoUrls: [],
    },
  });

  await prisma.communityProject.upsert({
    where: { publicId: 'CP-2026-002' },
    update: {},
    create: {
      publicId: 'CP-2026-002',
      title: 'Classroom Renovation — Horseed Primary School', category: 'school',
      description: 'Renovation of 4 damaged classrooms and supply of 120 desks and chairs for Horseed Primary School serving 320 students in Kismayo.',
      location: 'Kismayo', region: 'Jubaland', country: 'Somalia',
      populationSize: 320,
      problemDesc: '4 classrooms have collapsed roofs and broken walls. 320 students have no desks and sit on the floor. The school risks closure.',
      solutionDesc: 'Full renovation of 4 classrooms with new roofing, walls, windows, and 120 desks and chairs. Will restore a safe learning environment for all 320 students.',
      fundingGoal: 18000, totalRaised: 4200,
      status: 'seeking_funding', createdById: programManager.id,
      phases: [
        { name: 'Materials Procurement', status: 'pending' },
        { name: 'Construction', status: 'pending' },
        { name: 'Furniture Delivery', status: 'pending' },
        { name: 'Handover & Opening', status: 'pending' },
      ],
      photoUrls: [],
    },
  });

  await prisma.communityProject.upsert({
    where: { publicId: 'CP-2026-003' },
    update: {},
    create: {
      publicId: 'CP-2026-003',
      title: 'Rural Health Clinic — Bulo Burde', category: 'health',
      description: 'Equipping a new rural health clinic in Bulo Burde with essential medical equipment, solar power and a 3-month medicine supply to serve 1,200 people with no current health access.',
      location: 'Bulo Burde', region: 'Hiiraan', country: 'Somalia',
      populationSize: 1200,
      problemDesc: 'Nearest clinic is 45km away. Residents travel to receive any medical care. Women give birth at home without any support. Child and maternal mortality are high.',
      solutionDesc: 'Equip an existing building as a functional health clinic with solar power, medical equipment, medicine stock and a trained community health worker for 12 months.',
      fundingGoal: 25000, totalRaised: 25000,
      status: 'funded', createdById: programManager.id,
      verifiedAt: new Date(Date.now() - 15*86400000),
      phases: [
        { name: 'Equipment Procurement', status: 'in_progress' },
        { name: 'Solar Installation', status: 'pending' },
        { name: 'Medicine Delivery', status: 'pending' },
        { name: 'Staff Training', status: 'pending' },
        { name: 'Clinic Opening', status: 'pending' },
      ],
      photoUrls: [],
    },
  });

  await prisma.communityProject.upsert({
    where: { publicId: 'CP-2026-004' },
    update: {},
    create: {
      publicId: 'CP-2026-004',
      title: 'Community Farming Program — Afgooye District', category: 'agriculture',
      description: 'Seeds, irrigation tools and training for 120 farming families in Afgooye to restore agricultural livelihoods after two consecutive drought years.',
      location: 'Afgooye', region: 'Lower Shabelle', country: 'Somalia',
      populationSize: 600,
      problemDesc: 'Two consecutive droughts have wiped out crops for 120 families. Families have no seeds for next season and no tools. Famine risk is high in this area.',
      solutionDesc: 'Seed packages, irrigation tools and 2-day farming training for 120 families. Expected to restore food self-sufficiency within one growing season.',
      fundingGoal: 9500, totalRaised: 9500,
      status: 'completed', createdById: programManager.id,
      verifiedAt: new Date(Date.now() - 60*86400000),
      startedAt: new Date(Date.now() - 45*86400000),
      completedAt: new Date(Date.now() - 10*86400000),
      completionReport: 'All 120 families received seed packages and tools. 2-day training completed with 95% attendance. First harvest expected in 8 weeks. Families report significant improvement in food security.',
      phases: [
        { name: 'Seed Procurement', status: 'completed', completedAt: new Date(Date.now() - 40*86400000) },
        { name: 'Tool Distribution', status: 'completed', completedAt: new Date(Date.now() - 35*86400000) },
        { name: 'Farmer Training', status: 'completed', completedAt: new Date(Date.now() - 30*86400000) },
        { name: 'First Harvest', status: 'completed', completedAt: new Date(Date.now() - 10*86400000) },
      ],
      photoUrls: [],
    },
  });
  console.log('✅ 4 Community Projects created');

  // ── Sample project contribution ───────────────────────────────────────────
  const proj1 = await prisma.communityProject.findUnique({ where: { publicId: 'CP-2026-001' } });
  if (proj1) {
    await prisma.projectContribution.upsert({
      where: { id: 'contrib-demo-001' },
      update: {},
      create: {
        id: 'contrib-demo-001',
        projectId: proj1.id, donorId: donor.id,
        amount: 1000, currency: 'USD', type: 'partial', status: 'confirmed',
      },
    });
  }
  console.log('✅ Sample project contribution created');

  // ── Impact Partners seed ──────────────────────────────────────────────────
  const partnerData = [
    // Featured
    { slug: 'al-khair-foundation',     tier: 'featured',      name: 'Al-Khair Foundation',       avatar: '🏛️', type: 'ngo',          country: 'United Kingdom', countryFlag: '🇬🇧', color: '#3B82F6', isVerified: true, casesSupported: 312, familiesImpacted: 840, totalDonated: 124000, description: 'Providing emergency food and medical support across East Africa since 2019.', focus: ['Food Aid','Medical','Shelter'],      impactStory: 'Family of 7 Receives Emergency Shelter', impactBefore: 'A mother and six children were sleeping in an open field after their home was destroyed by flooding.', impactAfter: 'Within 18 days of verification, shelter materials were delivered. The family now has a safe, weatherproof home.', caseRef: 'Case #KQ-2024-0441', featuredOrder: 1 },
    { slug: 'somali-medical-relief',   tier: 'featured',      name: 'Somali Medical Relief',     avatar: '🏥', type: 'organization', country: 'Somalia',        countryFlag: '🇸🇴', color: '#10B981', isVerified: true, casesSupported: 198, familiesImpacted: 540, totalDonated: 78000,  description: 'Mobile medical units delivering care to remote communities and displaced families.',focus: ['Medical','Emergency Care'],         impactStory: 'Child Malnutrition Case Fully Resolved', impactBefore: 'A 4-year-old boy was referred for severe acute malnutrition. His family had no income and could not afford therapeutic food.', impactAfter: 'Medical aid partner sponsored 3 months of therapeutic nutrition support. The child recovered to healthy weight and was discharged.', caseRef: 'Case #KQ-2024-0189', featuredOrder: 2 },
    { slug: 'hope-bridge-initiative',  tier: 'featured',      name: 'Hope Bridge Initiative',    avatar: '🌱', type: 'ngo',          country: 'United States',  countryFlag: '🇺🇸', color: '#8B5CF6', isVerified: true, casesSupported: 241, familiesImpacted: 610, totalDonated: 95000,  description: 'Sponsoring orphan education programs and long-term family resilience projects.', focus: ['Education','Orphan Support'],       impactStory: '12 Orphaned Children Back in School', impactBefore: '12 children aged 6–14 had dropped out of school after losing their parents. No funds for supplies, uniforms, or school fees.', impactAfter: 'Education Without Borders sponsored a full academic year for all 12 children including materials, uniforms, and teacher support.', caseRef: 'Case #KQ-2024-0312', featuredOrder: 3 },
    { slug: 'gulf-humanitarian-council', tier: 'featured',    name: 'Gulf Humanitarian Council', avatar: '🤝', type: 'organization', country: 'UAE',            countryFlag: '🇦🇪', color: '#F59E0B', isVerified: true, casesSupported: 175, familiesImpacted: 490, totalDonated: 67000,  description: 'Coordinating large-scale disaster response and shelter rebuilding efforts.',     focus: ['Disaster Relief','Shelter'],        featuredOrder: 4 },
    { slug: 'education-without-borders', tier: 'featured',    name: 'Education Without Borders', avatar: '📚', type: 'ngo',          country: 'Canada',         countryFlag: '🇨🇦', color: '#EC4899', isVerified: true, casesSupported: 133, familiesImpacted: 320, totalDonated: 44000,  description: 'Funding school supplies, teachers, and learning spaces for conflict-affected children.', focus: ['Education','Children'],          featuredOrder: 5 },
    { slug: 'diakonia-relief',         tier: 'featured',      name: 'Diakonia Relief Services',  avatar: '⛪', type: 'ngo',          country: 'Sweden',         countryFlag: '🇸🇪', color: '#06B6D4', isVerified: true, casesSupported: 89,  familiesImpacted: 220, totalDonated: 31000,  description: 'Long-term partnership for food security and livelihoods in southern Somalia.',  focus: ['Food Security','Livelihoods'],      featuredOrder: 6 },
    // Community supporters
    { slug: 'anonymous-supporter-1',   tier: 'community',     name: 'Anonymous Supporter',       avatar: '👤', type: 'individual',   country: 'Global',         countryFlag: '🌍', color: '#5A6E8A', isAnonymous: true,  casesSupported: 14 },
    { slug: 'medical-aid-partner-de',  tier: 'community',     name: 'Medical Aid Partner',       avatar: '💊', type: 'individual',   country: 'Germany',        countryFlag: '🇩🇪', color: '#10B981', isVerified: true,   casesSupported: 7  },
    { slug: 'education-sponsor-nl',    tier: 'community',     name: 'Education Sponsor',         avatar: '📖', type: 'individual',   country: 'Netherlands',    countryFlag: '🇳🇱', color: '#8B5CF6', casesSupported: 11 },
    { slug: 'community-donor-global',  tier: 'community',     name: 'Community Donor',           avatar: '🌾', type: 'individual',   country: 'Global',         countryFlag: '🌍', color: '#F59E0B', isAnonymous: true,  casesSupported: 5  },
    { slug: 'shelter-aid-tr',          tier: 'community',     name: 'Shelter Aid Friend',        avatar: '🏗️', type: 'individual',   country: 'Turkey',         countryFlag: '🇹🇷', color: '#3B82F6', casesSupported: 9  },
    { slug: 'water-wash-fr',           tier: 'community',     name: 'Water & WASH Sponsor',      avatar: '💧', type: 'individual',   country: 'France',         countryFlag: '🇫🇷', color: '#06B6D4', casesSupported: 6  },
    { slug: 'orphan-care-sa',          tier: 'community',     name: 'Orphan Care Supporter',     avatar: '👶', type: 'individual',   country: 'Saudi Arabia',   countryFlag: '🇸🇦', color: '#EC4899', casesSupported: 18 },
    { slug: 'emergency-responder-no',  tier: 'community',     name: 'Emergency Responder',       avatar: '🚑', type: 'individual',   country: 'Norway',         countryFlag: '🇳🇴', color: '#C0392B', casesSupported: 4  },
    // Verified organizations
    { slug: 'banadir-hospital',        tier: 'verified_org',  name: 'Banadir Regional Hospital', avatar: '🏥', type: 'organization', country: 'Somalia',        countryFlag: '🇸🇴', color: '#10B981', isVerified: true, description: 'Public Hospital' },
    { slug: 'mogadishu-ngo-consortium',tier: 'verified_org',  name: 'Mogadishu NGO Consortium',  avatar: '🌿', type: 'ngo',          country: 'Somalia',        countryFlag: '🇸🇴', color: '#3B82F6', isVerified: true, description: 'NGO Network' },
    { slug: 'fao-somalia',             tier: 'verified_org',  name: 'FAO Somalia Field Office',  avatar: '🚜', type: 'government',   country: 'Somalia',        countryFlag: '🇸🇴', color: '#F59E0B', isVerified: true, description: 'UN Agency Partner' },
    { slug: 'wfp-distribution-hub',   tier: 'verified_org',  name: 'WFP Local Distribution Hub',avatar: '📦', type: 'organization', country: 'Somalia',        countryFlag: '🇸🇴', color: '#8B5CF6', isVerified: true, description: 'Food Distribution' },
    { slug: 'unicef-child-aid',        tier: 'verified_org',  name: 'UNICEF Child Aid Programme',avatar: '🧒', type: 'government',   country: 'Regional',       countryFlag: '🌍', color: '#EC4899', isVerified: true, description: 'Child Welfare Agency' },
    { slug: 'shelter-cluster',         tier: 'verified_org',  name: 'Shelter Cluster Somalia',   avatar: '🏗️', type: 'organization', country: 'Somalia',        countryFlag: '🇸🇴', color: '#06B6D4', isVerified: true, description: 'Shelter Coordination' },
    { slug: 'who-immunization',        tier: 'verified_org',  name: 'WHO Immunization Partners', avatar: '💉', type: 'government',   country: 'Regional',       countryFlag: '🌍', color: '#C0392B', isVerified: true, description: 'Health Partner' },
    { slug: 'unhcr-education',         tier: 'verified_org',  name: 'UNHCR Education Initiative',avatar: '📚', type: 'government',   country: 'Regional',       countryFlag: '🌍', color: '#E0AB21', isVerified: true, description: 'Refugee Education' },
  ];

  for (const p of partnerData) {
    await prisma.partner.upsert({
      where:  { slug: p.slug },
      update: p,
      create: p,
    });
  }
  console.log(`✅ ${partnerData.length} Impact Partners seeded`);

  console.log(`
╔══════════════════════════════════════════════════════════╗
║           🌍 KAFAALE DATABASE SEEDED ✅                  ║
╠══════════════════════════════════════════════════════════╣
║  Password for all accounts: Kafaale123!                  ║
╠══════════════════════════════════════════════════════════╣
║  superadmin@kafaale.org   → Super Admin                  ║
║  admin@kafaale.org        → Admin / Office               ║
║  programs@kafaale.org     → Program Manager              ║
║  agent@kafaale.org        → Field Agent                  ║
║  donor@kafaale.org        → Sponsor / Donor              ║
║  reporter@kafaale.org     → Reporter                     ║
╠══════════════════════════════════════════════════════════╣
║  🚨 Emergency Engine                                     ║
║     4 cases (medical, food, shelter, orphan)             ║
║  🌱 Humanitarian Programs Engine                         ║
║     4 programs created                                   ║
║     9 beneficiaries enrolled (child, edu, medical, fam)  ║
║     2 active sponsorships                                ║
║     3 monthly updates (CSP-2026-001)                     ║
║  🏗️  Community Projects                                  ║
║     4 projects (water, school, health, agriculture)      ║
║  🤝 Impact Partners: 22 seeded                           ║
╚══════════════════════════════════════════════════════════╝
  `);
}

main().catch(e => { console.error('❌ Seed error:', e); process.exit(1); }).finally(() => prisma.$disconnect());
