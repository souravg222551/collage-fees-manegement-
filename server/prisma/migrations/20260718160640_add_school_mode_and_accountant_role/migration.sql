-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('COLLEGE', 'SCHOOL');

-- AlterEnum
ALTER TYPE "AdminRole" ADD VALUE 'ACCOUNTANT';

-- DropIndex
DROP INDEX "students_department_course_branch_semester_idx";

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "avatarPublicId" TEXT;

-- AlterTable
ALTER TABLE "fee_payments" ALTER COLUMN "semester" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "institutionType" "InstitutionType" NOT NULL DEFAULT 'COLLEGE',
ADD COLUMN     "logoPublicId" TEXT,
ALTER COLUMN "collegeName" SET DEFAULT 'Your Institution Name';

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "grade" TEXT,
ADD COLUMN     "photoPublicId" TEXT,
ADD COLUMN     "stream" TEXT,
ALTER COLUMN "department" DROP NOT NULL,
ALTER COLUMN "course" DROP NOT NULL,
ALTER COLUMN "branch" DROP NOT NULL,
ALTER COLUMN "semester" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "students_department_course_branch_idx" ON "students"("department", "course", "branch");

-- CreateIndex
CREATE INDEX "students_grade_stream_idx" ON "students"("grade", "stream");
