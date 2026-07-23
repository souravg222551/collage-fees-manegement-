-- CreateEnum
CREATE TYPE "FeeFrequency" AS ENUM ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FeeType" ADD VALUE 'REGISTRATION';
ALTER TYPE "FeeType" ADD VALUE 'CAUTION_MONEY';
ALTER TYPE "FeeType" ADD VALUE 'ANNUAL_CHARGE';
ALTER TYPE "FeeType" ADD VALUE 'DEVELOPMENT';
ALTER TYPE "FeeType" ADD VALUE 'SMART_CLASS';
ALTER TYPE "FeeType" ADD VALUE 'ACTIVITY';
ALTER TYPE "FeeType" ADD VALUE 'IT_FEE';

-- DropIndex
DROP INDEX "fee_structure_items_academicSession_groupLabel_feeType_key";

-- AlterTable
ALTER TABLE "fee_payments" ADD COLUMN     "label" TEXT,
ADD COLUMN     "structureItemId" TEXT,
ADD COLUMN     "studentFeeItemId" TEXT,
ADD COLUMN     "transactionGroupId" TEXT;

-- AlterTable
ALTER TABLE "fee_structure_items" ADD COLUMN     "frequency" "FeeFrequency" NOT NULL DEFAULT 'ANNUAL',
ADD COLUMN     "isOptional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "label" TEXT;

-- CreateTable
CREATE TABLE "student_fee_items" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "feeType" "FeeType" NOT NULL DEFAULT 'OTHER',
    "label" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "frequency" "FeeFrequency" NOT NULL DEFAULT 'ANNUAL',
    "academicSession" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_fee_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_fee_items_studentId_idx" ON "student_fee_items"("studentId");

-- CreateIndex
CREATE INDEX "fee_payments_transactionGroupId_idx" ON "fee_payments"("transactionGroupId");

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_structureItemId_fkey" FOREIGN KEY ("structureItemId") REFERENCES "fee_structure_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_studentFeeItemId_fkey" FOREIGN KEY ("studentFeeItemId") REFERENCES "student_fee_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fee_items" ADD CONSTRAINT "student_fee_items_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
