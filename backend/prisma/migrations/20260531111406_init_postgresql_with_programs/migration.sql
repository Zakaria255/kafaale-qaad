-- CreateEnum
CREATE TYPE "AdminAction" AS ENUM ('approved', 'rejected', 'assigned_team', 'triggered_ai', 'edited_public_version', 'published', 'confirmed_payment', 'confirmed_delivery', 'completed_case', 'suspended_user', 'reinstated_user', 'delivery_assigned', 'donation_confirmed', 'completed', 'role_changed', 'user_deleted');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('case_submitted', 'case_assigned', 'investigation_completed', 'ai_ready_for_review', 'case_published', 'case_sponsored', 'delivery_started', 'delivery_completed', 'case_rejected', 'fraud_alert', 'payment_confirmed', 'delivery_assigned', 'donation_confirmed', 'case_completed', 'delivery_proof_submitted', 'aid_delivered', 'beneficiary_enrolled', 'beneficiary_verified', 'sponsorship_created', 'monthly_update_published', 'project_funded', 'project_completed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'reporter',
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "country" TEXT,
    "city" TEXT,
    "organization" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT,
    "assignedAgentId" TEXT,
    "privateVictimName" TEXT,
    "privateVictimPhone" TEXT,
    "privateAddress" TEXT,
    "privateGpsLat" DOUBLE PRECISION,
    "privateGpsLng" DOUBLE PRECISION,
    "privateFamilySize" INTEGER,
    "privateVictimAge" INTEGER,
    "privateVictimGender" TEXT,
    "privateDescription" TEXT,
    "privateNotes" TEXT,
    "caseRef" TEXT,
    "category" TEXT NOT NULL DEFAULT 'other',
    "emergencyLevel" TEXT NOT NULL DEFAULT 'medium',
    "supportType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "targetGoal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRaised" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "escrowReleased" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "publicTitle" TEXT,
    "publicStory" TEXT,
    "publicCity" TEXT,
    "publicCountry" TEXT,
    "publicMediaUrls" TEXT[],
    "aiSanitizedAt" TIMESTAMP(3),
    "adminPublishedAt" TIMESTAMP(3),
    "teamAssignedAt" TIMESTAMP(3),
    "investigationCompletedAt" TIMESTAMP(3),
    "sponsoredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseMedia" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'image',
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldInvestigation" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "victimVerified" BOOLEAN NOT NULL DEFAULT false,
    "situationAccurate" BOOLEAN NOT NULL DEFAULT false,
    "situationNotes" TEXT,
    "gpsVerificationLat" DOUBLE PRECISION,
    "gpsVerificationLng" DOUBLE PRECISION,
    "estimatedAmountNeeded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "urgencyConfirmed" TEXT,
    "deliveryFeasible" BOOLEAN NOT NULL DEFAULT true,
    "deliveryMethod" TEXT,
    "deliveryNotes" TEXT,
    "fraudRiskScore" INTEGER NOT NULL DEFAULT 0,
    "fraudRiskLevel" TEXT NOT NULL DEFAULT 'low',
    "fraudRiskNotes" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'needs_review',
    "officialNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldInvestigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPublicData" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "generatedTitle" TEXT NOT NULL,
    "generatedStory" TEXT NOT NULL,
    "generatedCategory" TEXT NOT NULL,
    "generatedCity" TEXT,
    "generatedUrgency" TEXT NOT NULL,
    "safeMediaUrls" TEXT[],
    "piiDetected" BOOLEAN NOT NULL DEFAULT false,
    "piiRemoved" TEXT[],
    "mediaFlagged" TEXT[],
    "confidenceScore" INTEGER NOT NULL DEFAULT 0,
    "adminEdited" BOOLEAN NOT NULL DEFAULT false,
    "adminEditedTitle" TEXT,
    "adminEditedStory" TEXT,
    "model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPublicData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" TEXT NOT NULL DEFAULT 'bank_transfer',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transactionRef" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "donorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryProof" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "deliveredBy" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "deliveryMethod" TEXT NOT NULL,
    "amountDelivered" DOUBLE PRECISION NOT NULL,
    "recipientName" TEXT,
    "deliveryNotes" TEXT,
    "photoUrls" TEXT[],
    "adminConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "adminConfirmedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "caseId" TEXT,
    "action" "AdminAction" NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🌱',
    "color" TEXT NOT NULL DEFAULT '#004B96',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalBeneficiaries" INTEGER NOT NULL DEFAULT 0,
    "activeSponsorships" INTEGER NOT NULL DEFAULT 0,
    "monthlyBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRaised" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Beneficiary" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "privateFullName" TEXT,
    "privateGuardianName" TEXT,
    "privateGuardianPhone" TEXT,
    "privateSchoolName" TEXT,
    "privateAddress" TEXT,
    "privateMedicalNotes" TEXT,
    "privateNotes" TEXT,
    "publicAge" INTEGER,
    "publicGender" TEXT,
    "publicRegion" TEXT,
    "publicCity" TEXT,
    "publicCountry" TEXT NOT NULL DEFAULT 'Somalia',
    "publicNeedsDesc" TEXT,
    "publicStory" TEXT,
    "publicPhotoUrl" TEXT,
    "programType" TEXT NOT NULL,
    "monthlyNeed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending_verification',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "enrolledBy" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsorship" (
    "id" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'full',
    "monthlyAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'active',
    "paymentMethod" TEXT NOT NULL DEFAULT 'bank_transfer',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "nextPaymentDate" TIMESTAMP(3),
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthsCompleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsorship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorshipPayment" (
    "id" TEXT NOT NULL,
    "sponsorshipId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SponsorshipPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyUpdate" (
    "id" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "schoolAttendance" INTEGER,
    "healthStatus" TEXT,
    "progressNotes" TEXT NOT NULL,
    "needsAssessment" TEXT,
    "deliveriesMade" TEXT[],
    "photoUrls" TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityProject" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Somalia',
    "populationSize" INTEGER,
    "problemDesc" TEXT NOT NULL,
    "solutionDesc" TEXT NOT NULL,
    "fundingGoal" DOUBLE PRECISION NOT NULL,
    "totalRaised" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'seeking_funding',
    "phases" JSONB,
    "photoUrls" TEXT[],
    "completionReport" TEXT,
    "createdById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectContribution" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "type" TEXT NOT NULL DEFAULT 'partial',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '🤝',
    "logoUrl" TEXT,
    "type" TEXT NOT NULL DEFAULT 'individual',
    "tier" TEXT NOT NULL DEFAULT 'community',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "country" TEXT,
    "countryFlag" TEXT,
    "city" TEXT,
    "region" TEXT,
    "description" TEXT,
    "website" TEXT,
    "focus" TEXT[],
    "color" TEXT NOT NULL DEFAULT '#004B96',
    "casesSupported" INTEGER NOT NULL DEFAULT 0,
    "totalDonated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "familiesImpacted" INTEGER NOT NULL DEFAULT 0,
    "impactStory" TEXT,
    "impactBefore" TEXT,
    "impactAfter" TEXT,
    "caseRef" TEXT,
    "featuredOrder" INTEGER,
    "addedByAdmin" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Case_caseRef_key" ON "Case"("caseRef");

-- CreateIndex
CREATE INDEX "Case_status_idx" ON "Case"("status");

-- CreateIndex
CREATE INDEX "Case_reporterId_idx" ON "Case"("reporterId");

-- CreateIndex
CREATE INDEX "Case_assignedAgentId_idx" ON "Case"("assignedAgentId");

-- CreateIndex
CREATE INDEX "Case_emergencyLevel_idx" ON "Case"("emergencyLevel");

-- CreateIndex
CREATE INDEX "Case_createdAt_idx" ON "Case"("createdAt");

-- CreateIndex
CREATE INDEX "Case_status_createdAt_idx" ON "Case"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CaseMedia_caseId_idx" ON "CaseMedia"("caseId");

-- CreateIndex
CREATE INDEX "CaseMedia_isPublic_idx" ON "CaseMedia"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "FieldInvestigation_caseId_key" ON "FieldInvestigation"("caseId");

-- CreateIndex
CREATE INDEX "FieldInvestigation_agentId_idx" ON "FieldInvestigation"("agentId");

-- CreateIndex
CREATE INDEX "FieldInvestigation_verificationStatus_idx" ON "FieldInvestigation"("verificationStatus");

-- CreateIndex
CREATE INDEX "FieldInvestigation_fraudRiskLevel_idx" ON "FieldInvestigation"("fraudRiskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "AiPublicData_caseId_key" ON "AiPublicData"("caseId");

-- CreateIndex
CREATE INDEX "Donation_donorId_idx" ON "Donation"("donorId");

-- CreateIndex
CREATE INDEX "Donation_caseId_idx" ON "Donation"("caseId");

-- CreateIndex
CREATE INDEX "Donation_status_idx" ON "Donation"("status");

-- CreateIndex
CREATE INDEX "Donation_donorId_status_idx" ON "Donation"("donorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryProof_caseId_key" ON "DeliveryProof"("caseId");

-- CreateIndex
CREATE INDEX "DeliveryProof_adminConfirmed_idx" ON "DeliveryProof"("adminConfirmed");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_caseId_idx" ON "AdminAuditLog"("caseId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_timestamp_idx" ON "AdminAuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Program_type_idx" ON "Program"("type");

-- CreateIndex
CREATE INDEX "Program_isActive_idx" ON "Program"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Beneficiary_publicId_key" ON "Beneficiary"("publicId");

-- CreateIndex
CREATE INDEX "Beneficiary_status_idx" ON "Beneficiary"("status");

-- CreateIndex
CREATE INDEX "Beneficiary_programId_idx" ON "Beneficiary"("programId");

-- CreateIndex
CREATE INDEX "Beneficiary_programType_idx" ON "Beneficiary"("programType");

-- CreateIndex
CREATE INDEX "Sponsorship_beneficiaryId_idx" ON "Sponsorship"("beneficiaryId");

-- CreateIndex
CREATE INDEX "Sponsorship_sponsorId_idx" ON "Sponsorship"("sponsorId");

-- CreateIndex
CREATE INDEX "Sponsorship_status_idx" ON "Sponsorship"("status");

-- CreateIndex
CREATE INDEX "SponsorshipPayment_sponsorshipId_idx" ON "SponsorshipPayment"("sponsorshipId");

-- CreateIndex
CREATE INDEX "MonthlyUpdate_beneficiaryId_idx" ON "MonthlyUpdate"("beneficiaryId");

-- CreateIndex
CREATE INDEX "MonthlyUpdate_isPublished_idx" ON "MonthlyUpdate"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyUpdate_beneficiaryId_month_year_key" ON "MonthlyUpdate"("beneficiaryId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityProject_publicId_key" ON "CommunityProject"("publicId");

-- CreateIndex
CREATE INDEX "CommunityProject_status_idx" ON "CommunityProject"("status");

-- CreateIndex
CREATE INDEX "CommunityProject_category_idx" ON "CommunityProject"("category");

-- CreateIndex
CREATE INDEX "ProjectContribution_projectId_idx" ON "ProjectContribution"("projectId");

-- CreateIndex
CREATE INDEX "ProjectContribution_donorId_idx" ON "ProjectContribution"("donorId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_slug_key" ON "Partner"("slug");

-- CreateIndex
CREATE INDEX "Partner_tier_idx" ON "Partner"("tier");

-- CreateIndex
CREATE INDEX "Partner_isVerified_isActive_idx" ON "Partner"("isVerified", "isActive");

-- CreateIndex
CREATE INDEX "Partner_type_idx" ON "Partner"("type");

-- CreateIndex
CREATE INDEX "Partner_featuredOrder_idx" ON "Partner"("featuredOrder");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMedia" ADD CONSTRAINT "CaseMedia_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldInvestigation" ADD CONSTRAINT "FieldInvestigation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldInvestigation" ADD CONSTRAINT "FieldInvestigation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPublicData" ADD CONSTRAINT "AiPublicData_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryProof" ADD CONSTRAINT "DeliveryProof_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsorship" ADD CONSTRAINT "Sponsorship_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsorship" ADD CONSTRAINT "Sponsorship_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorshipPayment" ADD CONSTRAINT "SponsorshipPayment_sponsorshipId_fkey" FOREIGN KEY ("sponsorshipId") REFERENCES "Sponsorship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyUpdate" ADD CONSTRAINT "MonthlyUpdate_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyUpdate" ADD CONSTRAINT "MonthlyUpdate_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContribution" ADD CONSTRAINT "ProjectContribution_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "CommunityProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContribution" ADD CONSTRAINT "ProjectContribution_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
