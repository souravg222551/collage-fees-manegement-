-- AlterTable
ALTER TABLE "students" ADD COLUMN     "aadharNumber" TEXT,
ADD COLUMN     "institutionType" "InstitutionType" NOT NULL DEFAULT 'COLLEGE';

-- CreateTable
CREATE TABLE "fee_structure_items" (
    "id" TEXT NOT NULL,
    "academicSession" TEXT NOT NULL,
    "groupLabel" TEXT NOT NULL,
    "feeType" "FeeType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_structure_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fee_structure_items_academicSession_groupLabel_idx" ON "fee_structure_items"("academicSession", "groupLabel");

-- CreateIndex
CREATE UNIQUE INDEX "fee_structure_items_academicSession_groupLabel_feeType_key" ON "fee_structure_items"("academicSession", "groupLabel", "feeType");

-- CreateIndex
CREATE INDEX "students_institutionType_idx" ON "students"("institutionType");
