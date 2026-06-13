/*
  Warnings:

  - You are about to drop the column `central_id` on the `VerificationData` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `VerificationData` table. All the data in the column will be lost.
  - You are about to drop the column `residence_address_line1` on the `VerificationData` table. All the data in the column will be lost.
  - You are about to drop the column `residence_town` on the `VerificationData` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `VerificationData` table. All the data in the column will be lost.
  - You are about to alter the column `registration_id` on the `VerificationData` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to drop the column `verification_id` on the `employees` table. All the data in the column will be lost.
  - The primary key for the `registrations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `department` on table `employees` required. This step will fail if there are existing NULL values in that column.
  - Made the column `position` on table `employees` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."VerificationData" DROP CONSTRAINT "VerificationData_registration_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."employee_promotions" DROP CONSTRAINT "employee_promotions_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."employees" DROP CONSTRAINT "employees_verification_id_fkey";

-- AlterTable
ALTER TABLE "VerificationData" DROP COLUMN "central_id",
DROP COLUMN "created_at",
DROP COLUMN "residence_address_line1",
DROP COLUMN "residence_town",
DROP COLUMN "updated_at",
ADD COLUMN     "central_iD" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "residence_AdressLine1" TEXT,
ADD COLUMN     "residence_Town" TEXT,
ADD COLUMN     "residence_lga" TEXT,
ADD COLUMN     "self_origin_lga" TEXT,
ADD COLUMN     "self_origin_place" TEXT,
ADD COLUMN     "self_origin_state" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "birthdate" SET DATA TYPE TEXT,
ALTER COLUMN "photo" SET DATA TYPE TEXT,
ALTER COLUMN "signature" SET DATA TYPE TEXT,
ALTER COLUMN "registration_id" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "employee_promotions" ALTER COLUMN "created_at" DROP NOT NULL,
ALTER COLUMN "updated_at" DROP NOT NULL;

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "verification_id",
ADD COLUMN     "account_number" VARCHAR(50),
ADD COLUMN     "assignment_start_date" DATE,
ADD COLUMN     "assignment_status" VARCHAR(50),
ADD COLUMN     "bank_name" VARCHAR(150),
ADD COLUMN     "bvn" VARCHAR(50),
ADD COLUMN     "command" VARCHAR(100),
ADD COLUMN     "contact_address" TEXT,
ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "date_of_last_promotion" DATE,
ADD COLUMN     "date_terminated" DATE,
ADD COLUMN     "employee_type" VARCHAR(50),
ADD COLUMN     "gender" VARCHAR(20),
ADD COLUMN     "grade" VARCHAR(50),
ADD COLUMN     "grade_category" VARCHAR(100),
ADD COLUMN     "hire_date" DATE,
ADD COLUMN     "job_title" VARCHAR(150),
ADD COLUMN     "legacy_id" VARCHAR(50),
ADD COLUMN     "lga_origin" VARCHAR(100),
ADD COLUMN     "location" VARCHAR(100),
ADD COLUMN     "marital_status" VARCHAR(50),
ADD COLUMN     "nationality" VARCHAR(100),
ADD COLUMN     "organization_name" VARCHAR(200),
ADD COLUMN     "payroll_group" VARCHAR(100),
ADD COLUMN     "person_start_date" DATE,
ADD COLUMN     "pfa_name" VARCHAR(150),
ADD COLUMN     "pin_number" VARCHAR(100),
ADD COLUMN     "registration_id" TEXT,
ADD COLUMN     "residence_address" TEXT,
ADD COLUMN     "salary" DECIMAL(12,2),
ADD COLUMN     "sort_code" VARCHAR(50),
ADD COLUMN     "staff_category" VARCHAR(100),
ADD COLUMN     "state_of_origin" VARCHAR(100),
ADD COLUMN     "step" VARCHAR(50),
ADD COLUMN     "supervisor" VARCHAR(150),
ADD COLUMN     "tax_id" VARCHAR(50),
ADD COLUMN     "telephone_number" VARCHAR(50),
ADD COLUMN     "unit" VARCHAR(100),
ADD COLUMN     "zone" VARCHAR(100),
ALTER COLUMN "department" SET NOT NULL,
ALTER COLUMN "position" SET NOT NULL;

-- AlterTable
ALTER TABLE "registrations" DROP CONSTRAINT "registrations_pkey",
ALTER COLUMN "id" SET DEFAULT nextval('registrations_id_seq'::regclass),
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(20),
ADD CONSTRAINT "registrations_pkey" PRIMARY KEY ("id");


-- CreateTable
CREATE TABLE "employee_awards" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "employee_name" VARCHAR(255) NOT NULL,
    "department" VARCHAR(100) NOT NULL,
    "award_type" VARCHAR(100) NOT NULL,
    "gift_item" VARCHAR(150) NOT NULL,
    "cash_prize" DECIMAL(12,2) NOT NULL,
    "award_date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "status" VARCHAR(30) DEFAULT 'active',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_travel" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(50) NOT NULL,
    "employee_name" VARCHAR(100) NOT NULL,
    "department" VARCHAR(100),
    "purpose" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "destination" VARCHAR(255),
    "travel_mode" VARCHAR(50),
    "accommodation" VARCHAR(255),
    "estimated_cost" DECIMAL(12,2),
    "advance_amount" DECIMAL(12,2),
    "status" VARCHAR(50) DEFAULT 'pending',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_travel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_transfers" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "employee_name" VARCHAR(255) NOT NULL,
    "from_department" VARCHAR(100),
    "to_department" VARCHAR(100),
    "from_position" VARCHAR(150),
    "to_position" VARCHAR(150),
    "from_location" VARCHAR(100),
    "to_location" VARCHAR(100),
    "effective_date" DATE NOT NULL,
    "reason" VARCHAR(500),
    "status" VARCHAR(30) DEFAULT 'pending',
    "approved_by" VARCHAR(100),
    "approved_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_resignations" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "employee_name" VARCHAR(255) NOT NULL,
    "department" VARCHAR(100) NOT NULL,
    "position" VARCHAR(150) NOT NULL,
    "notice_date" DATE NOT NULL,
    "resignation_date" DATE NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "exit_interview" TEXT NOT NULL,
    "notes" TEXT,
    "status" VARCHAR(30) DEFAULT 'pending',
    "approved_by" VARCHAR(100),
    "approved_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "disapproved_by" VARCHAR(100),
    "disapproved_at" TIMESTAMP(6),
    "disapproval_reason" TEXT,

    CONSTRAINT "employee_resignations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_complaints" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(50) NOT NULL,
    "employee_name" VARCHAR(150) NOT NULL,
    "complaint" TEXT NOT NULL,
    "department" VARCHAR(100),
    "status" VARCHAR(50) DEFAULT 'pending',
    "priority" VARCHAR(50) DEFAULT 'medium',
    "assigned_to" VARCHAR(150),
    "submitted_on" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_leaves" (
    "id" SERIAL NOT NULL,
    "employee_name" TEXT NOT NULL,
    "leave_type" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "emergency_contact" TEXT,
    "status" TEXT DEFAULT 'pending',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "employee_id" TEXT,

    CONSTRAINT "employee_leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_projects" (
    "id" SERIAL NOT NULL,
    "project_title" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "project_manager_id" TEXT NOT NULL,
    "team_member_ids" TEXT[],
    "project_description" TEXT,
    "project_status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "budget" DECIMAL(12,2) DEFAULT 0,
    "completion_percentage" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_terminations" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(50) NOT NULL,
    "employee_name" VARCHAR(255) NOT NULL,
    "position" VARCHAR(255),
    "department" VARCHAR(255),
    "termination_type" VARCHAR(50) NOT NULL,
    "termination_reason" TEXT NOT NULL,
    "termination_date" DATE NOT NULL,
    "status" VARCHAR(50) DEFAULT 'active',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_terminations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_warnings" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(50) NOT NULL,
    "employee_name" VARCHAR(150) NOT NULL,
    "department" VARCHAR(100),
    "warning_subject" VARCHAR(200) NOT NULL,
    "warning_description" TEXT NOT NULL,
    "warning_type" VARCHAR(50) NOT NULL,
    "warning_date" DATE NOT NULL,
    "expiry_date" DATE,
    "issued_by" VARCHAR(150) NOT NULL,
    "supporting_documents" TEXT,
    "status" VARCHAR(50) DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_warnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_types" (
    "id" SERIAL NOT NULL,
    "goal_type" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "created_date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_events" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "all_day" BOOLEAN DEFAULT false,
    "department" VARCHAR(100),
    "location" VARCHAR(255),
    "description" TEXT,
    "attendees" TEXT[],
    "status" VARCHAR(50) DEFAULT 'active',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_otps" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER,
    "otp_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" SERIAL NOT NULL,
    "company_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "audience" TEXT DEFAULT 'all',
    "status" TEXT DEFAULT 'draft',
    "publish_date" TIMESTAMP(6),
    "expiry_date" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "address" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "company_code" TEXT,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_policies" (
    "id" SERIAL NOT NULL,
    "company_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publish_date" TIMESTAMP(6),
    "expiry_date" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designations" (
    "id" SERIAL NOT NULL,
    "company_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT DEFAULT 'active',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "designations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(50) NOT NULL,
    "goal_type_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) DEFAULT 'pending',
    "target_date" DATE,
    "achieved" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100),
    "status" VARCHAR(20) DEFAULT 'active',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "company_code" TEXT,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_appraisers" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(50) NOT NULL,
    "department_id" INTEGER NOT NULL,
    "designation_id" INTEGER NOT NULL,
    "appraisal_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    "rating" INTEGER,
    "remarks" TEXT,
    "added_by" VARCHAR(50),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_appraisers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_indicators" (
    "id" SERIAL NOT NULL,
    "indicator_name" VARCHAR(150) NOT NULL,
    "department_id" INTEGER NOT NULL,
    "designation_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "added_by" VARCHAR(100),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_employee_awards_employee_id" ON "employee_awards"("employee_id");

-- CreateIndex
CREATE INDEX "idx_employee_travel_employee_id" ON "employee_travel"("employee_id");

-- CreateIndex
CREATE INDEX "idx_employee_transfers_employee_id" ON "employee_transfers"("employee_id");

-- CreateIndex
CREATE INDEX "idx_employee_resignations_employee_id" ON "employee_resignations"("employee_id");

-- CreateIndex
CREATE INDEX "idx_employee_complaints_employee_id" ON "employee_complaints"("employee_id");

-- CreateIndex
CREATE INDEX "idx_employee_complaints_priority" ON "employee_complaints"("priority");

-- CreateIndex
CREATE INDEX "idx_employee_complaints_status" ON "employee_complaints"("status");

-- CreateIndex
CREATE INDEX "idx_employee_warnings_employee_id" ON "employee_warnings"("employee_id");

-- CreateIndex
CREATE INDEX "idx_employee_warnings_status" ON "employee_warnings"("status");

-- CreateIndex
CREATE INDEX "idx_employee_warnings_warning_type" ON "employee_warnings"("warning_type");

-- CreateIndex
CREATE UNIQUE INDEX "companies_company_code_key" ON "companies"("company_code");

-- AddForeignKey
ALTER TABLE "VerificationData" ADD CONSTRAINT "fk_verification_registration_id" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employee_awards" ADD CONSTRAINT "fk_employee_award" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employee_promotions" ADD CONSTRAINT "fk_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employee_transfers" ADD CONSTRAINT "fk_employee_transfer_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "employee_resignations" ADD CONSTRAINT "fk_employee_resignation_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_otps" ADD CONSTRAINT "admin_otps_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "fk_announcement_company" FOREIGN KEY ("company_code") REFERENCES "companies"("company_code") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_policies" ADD CONSTRAINT "company_policies_company_code_fkey" FOREIGN KEY ("company_code") REFERENCES "companies"("company_code") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "designations" ADD CONSTRAINT "fk_designation_company" FOREIGN KEY ("company_code") REFERENCES "companies"("company_code") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_goal_type_id_fkey" FOREIGN KEY ("goal_type_id") REFERENCES "goal_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "fk_company_code" FOREIGN KEY ("company_code") REFERENCES "companies"("company_code") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "performance_appraisers" ADD CONSTRAINT "performance_appraisers_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "performance_appraisers" ADD CONSTRAINT "performance_appraisers_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "performance_indicators" ADD CONSTRAINT "performance_indicators_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "performance_indicators" ADD CONSTRAINT "performance_indicators_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
