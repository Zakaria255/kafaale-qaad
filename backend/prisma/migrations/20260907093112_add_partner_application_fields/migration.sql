-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "annualBudget" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "contactTitle" TEXT,
ADD COLUMN     "operatingRegions" TEXT,
ADD COLUMN     "regNumber" TEXT,
ADD COLUMN     "staffCount" INTEGER,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'approved',
ADD COLUMN     "yearFounded" INTEGER;

-- CreateIndex
CREATE INDEX "Partner_status_idx" ON "Partner"("status");
