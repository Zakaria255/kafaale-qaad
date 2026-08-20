-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "duplicateScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fraudRiskLevel" TEXT NOT NULL DEFAULT 'low',
ADD COLUMN     "fraudRiskScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mergedIntoId" TEXT;

-- CreateTable
CREATE TABLE "MediaFingerprint" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "perceptualHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicateCaseMatch" (
    "id" TEXT NOT NULL,
    "newCaseId" TEXT NOT NULL,
    "existingCaseId" TEXT NOT NULL,
    "similarityScore" INTEGER NOT NULL,
    "matchReasons" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewerReason" TEXT,
    "reporterOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuplicateCaseMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseRelationship" (
    "id" TEXT NOT NULL,
    "caseAId" TEXT NOT NULL,
    "caseBId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "tag" TEXT NOT NULL DEFAULT '',
    "videoUrl" TEXT,
    "likes" TEXT NOT NULL DEFAULT '[]',
    "comments" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaPostImage" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MediaPostImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaFingerprint_mediaId_key" ON "MediaFingerprint"("mediaId");

-- CreateIndex
CREATE INDEX "MediaFingerprint_sha256_idx" ON "MediaFingerprint"("sha256");

-- CreateIndex
CREATE INDEX "MediaFingerprint_perceptualHash_idx" ON "MediaFingerprint"("perceptualHash");

-- CreateIndex
CREATE INDEX "DuplicateCaseMatch_newCaseId_idx" ON "DuplicateCaseMatch"("newCaseId");

-- CreateIndex
CREATE INDEX "DuplicateCaseMatch_existingCaseId_idx" ON "DuplicateCaseMatch"("existingCaseId");

-- CreateIndex
CREATE INDEX "DuplicateCaseMatch_status_idx" ON "DuplicateCaseMatch"("status");

-- CreateIndex
CREATE INDEX "DuplicateCaseMatch_similarityScore_idx" ON "DuplicateCaseMatch"("similarityScore");

-- CreateIndex
CREATE INDEX "CaseRelationship_caseAId_idx" ON "CaseRelationship"("caseAId");

-- CreateIndex
CREATE INDEX "CaseRelationship_caseBId_idx" ON "CaseRelationship"("caseBId");

-- CreateIndex
CREATE INDEX "CaseRelationship_relationshipType_idx" ON "CaseRelationship"("relationshipType");

-- CreateIndex
CREATE INDEX "MediaPost_createdAt_idx" ON "MediaPost"("createdAt");

-- CreateIndex
CREATE INDEX "MediaPostImage_postId_idx" ON "MediaPostImage"("postId");

-- CreateIndex
CREATE INDEX "Case_category_idx" ON "Case"("category");

-- CreateIndex
CREATE INDEX "Case_privateGpsLat_privateGpsLng_idx" ON "Case"("privateGpsLat", "privateGpsLng");

-- CreateIndex
CREATE INDEX "Case_privateVictimPhone_idx" ON "Case"("privateVictimPhone");

-- CreateIndex
CREATE INDEX "Case_duplicateScore_idx" ON "Case"("duplicateScore");

-- CreateIndex
CREATE INDEX "Case_fraudRiskScore_idx" ON "Case"("fraudRiskScore");

-- AddForeignKey
ALTER TABLE "MediaFingerprint" ADD CONSTRAINT "MediaFingerprint_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "CaseMedia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCaseMatch" ADD CONSTRAINT "DuplicateCaseMatch_newCaseId_fkey" FOREIGN KEY ("newCaseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCaseMatch" ADD CONSTRAINT "DuplicateCaseMatch_existingCaseId_fkey" FOREIGN KEY ("existingCaseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPostImage" ADD CONSTRAINT "MediaPostImage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "MediaPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
