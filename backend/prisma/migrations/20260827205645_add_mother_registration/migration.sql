-- CreateTable
CREATE TABLE "Mother" (
    "id" TEXT NOT NULL,
    "regNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "age" INTEGER,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT NOT NULL DEFAULT 'female',
    "phone" TEXT NOT NULL,
    "altPhone" TEXT,
    "maritalStatus" TEXT,
    "nationalId" TEXT,
    "region" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "village" TEXT,
    "address" TEXT,
    "childrenCount" INTEGER,
    "childrenLivingWithHer" INTEGER,
    "orphansUnderCare" INTEGER,
    "otherDependents" INTEGER,
    "childrenAgeRange" TEXT,
    "familySituation" TEXT,
    "incomeSource" TEXT,
    "vulnerabilityReasons" TEXT NOT NULL DEFAULT '[]',
    "otherReasonText" TEXT,
    "additionalInfo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_verification',
    "registeredById" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "rejectedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "correctionRequestedAt" TIMESTAMP(3),
    "correctionRequestedNotes" TEXT,
    "duplicateScore" INTEGER NOT NULL DEFAULT 0,
    "duplicateMatchesJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mother_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotherDocument" (
    "id" TEXT NOT NULL,
    "motherId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MotherDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotherAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "motherId" TEXT,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MotherAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mother_regNumber_key" ON "Mother"("regNumber");

-- CreateIndex
CREATE INDEX "Mother_status_idx" ON "Mother"("status");

-- CreateIndex
CREATE INDEX "Mother_region_idx" ON "Mother"("region");

-- CreateIndex
CREATE INDEX "Mother_district_idx" ON "Mother"("district");

-- CreateIndex
CREATE INDEX "Mother_createdAt_idx" ON "Mother"("createdAt");

-- CreateIndex
CREATE INDEX "Mother_status_createdAt_idx" ON "Mother"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Mother_registeredById_idx" ON "Mother"("registeredById");

-- CreateIndex
CREATE INDEX "Mother_verifiedAt_idx" ON "Mother"("verifiedAt");

-- CreateIndex
CREATE INDEX "Mother_nationalId_idx" ON "Mother"("nationalId");

-- CreateIndex
CREATE INDEX "Mother_phone_idx" ON "Mother"("phone");

-- CreateIndex
CREATE INDEX "MotherDocument_motherId_idx" ON "MotherDocument"("motherId");

-- CreateIndex
CREATE INDEX "MotherDocument_type_idx" ON "MotherDocument"("type");

-- CreateIndex
CREATE INDEX "MotherAuditLog_actorId_idx" ON "MotherAuditLog"("actorId");

-- CreateIndex
CREATE INDEX "MotherAuditLog_motherId_idx" ON "MotherAuditLog"("motherId");

-- CreateIndex
CREATE INDEX "MotherAuditLog_action_idx" ON "MotherAuditLog"("action");

-- CreateIndex
CREATE INDEX "MotherAuditLog_timestamp_idx" ON "MotherAuditLog"("timestamp");

-- AddForeignKey
ALTER TABLE "Mother" ADD CONSTRAINT "Mother_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mother" ADD CONSTRAINT "Mother_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mother" ADD CONSTRAINT "Mother_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherDocument" ADD CONSTRAINT "MotherDocument_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Mother"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherDocument" ADD CONSTRAINT "MotherDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherAuditLog" ADD CONSTRAINT "MotherAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherAuditLog" ADD CONSTRAINT "MotherAuditLog_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "Mother"("id") ON DELETE SET NULL ON UPDATE CASCADE;

