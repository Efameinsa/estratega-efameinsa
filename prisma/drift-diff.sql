-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('PROPIETARIO', 'ADMINISTRADOR', 'MIEMBRO');

-- DropForeignKey
ALTER TABLE "CompanyMetric" DROP CONSTRAINT "CompanyMetric_cycleId_fkey";

-- DropForeignKey
ALTER TABLE "CompanyMetric" DROP CONSTRAINT "CompanyMetric_ratioKey_fkey";

-- DropForeignKey
ALTER TABLE "ConsolidatedStrategy" DROP CONSTRAINT "ConsolidatedStrategy_cycleId_fkey";

-- DropForeignKey
ALTER TABLE "ConsolidatedStrategyOlp" DROP CONSTRAINT "ConsolidatedStrategyOlp_consolidatedId_fkey";

-- DropForeignKey
ALTER TABLE "ConsolidatedStrategyOlp" DROP CONSTRAINT "ConsolidatedStrategyOlp_olpId_fkey";

-- DropForeignKey
ALTER TABLE "ConsolidatedStrategyOrigin" DROP CONSTRAINT "ConsolidatedStrategyOrigin_consolidatedId_fkey";

-- DropForeignKey
ALTER TABLE "EthicsEvaluation" DROP CONSTRAINT "EthicsEvaluation_cycleId_fkey";

-- DropForeignKey
ALTER TABLE "EthicsMitigant" DROP CONSTRAINT "EthicsMitigant_evaluationId_fkey";

-- DropForeignKey
ALTER TABLE "EthicsMitigant" DROP CONSTRAINT "EthicsMitigant_principleId_fkey";

-- DropForeignKey
ALTER TABLE "EthicsPrinciple" DROP CONSTRAINT "EthicsPrinciple_evaluationId_fkey";

-- DropForeignKey
ALTER TABLE "McpeAnalysis" DROP CONSTRAINT "McpeAnalysis_cycleId_fkey";

-- DropForeignKey
ALTER TABLE "McpeRating" DROP CONSTRAINT "McpeRating_analysisId_fkey";

-- DropForeignKey
ALTER TABLE "OlpReference" DROP CONSTRAINT "OlpReference_olpId_fkey";

-- DropForeignKey
ALTER TABLE "PeiDocument" DROP CONSTRAINT "PeiDocument_cycleId_fkey";

-- DropForeignKey
ALTER TABLE "RatioIndustria" DROP CONSTRAINT "RatioIndustria_ratioKey_fkey";

-- DropForeignKey
ALTER TABLE "RumeltCriterion" DROP CONSTRAINT "RumeltCriterion_evaluationId_fkey";

-- DropForeignKey
ALTER TABLE "RumeltEvaluation" DROP CONSTRAINT "RumeltEvaluation_cycleId_fkey";

-- DropForeignKey
ALTER TABLE "StrategyOrigin" DROP CONSTRAINT "StrategyOrigin_strategyId_fkey";

-- AlterTable
ALTER TABLE "AmofhitArea" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AreaSynthesis" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CardinalPrinciple" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CompetitiveAnalysis" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "EthicsCode" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FinancialRatio" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "IndustryAttractiveness" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Interest" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "InternalReport" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "McpeEvaluation" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MefeFactor" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MefeState" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MefiFactor" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MefiState" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MpcCompetitor" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MpcFactorDef" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Olp" DROP COLUMN "priority",
DROP COLUMN "responsible",
DROP COLUMN "targetYear",
ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#185FA5';

-- AlterTable
ALTER TABLE "PestecFactor" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PeyeaAnalysis" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PorterAnalysis" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Portfolio" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StrategicAxis" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Strategy" DROP COLUMN "crossType",
DROP COLUMN "horizon",
DROP COLUMN "justification",
DROP COLUMN "priority",
ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeOrganizationId" TEXT,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingStep" TEXT;

-- AlterTable
ALTER TABLE "Value" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Vision" ADD COLUMN     "organizationId" TEXT NOT NULL;

-- DropTable
DROP TABLE "CompanyMetric";

-- DropTable
DROP TABLE "ConsolidatedStrategy";

-- DropTable
DROP TABLE "ConsolidatedStrategyOlp";

-- DropTable
DROP TABLE "ConsolidatedStrategyOrigin";

-- DropTable
DROP TABLE "EthicsEvaluation";

-- DropTable
DROP TABLE "EthicsMitigant";

-- DropTable
DROP TABLE "EthicsPrinciple";

-- DropTable
DROP TABLE "McpeAnalysis";

-- DropTable
DROP TABLE "McpeRating";

-- DropTable
DROP TABLE "OlpReference";

-- DropTable
DROP TABLE "PeiDocument";

-- DropTable
DROP TABLE "RatioIndustria";

-- DropTable
DROP TABLE "RatioMaster";

-- DropTable
DROP TABLE "RumeltCriterion";

-- DropTable
DROP TABLE "RumeltEvaluation";

-- DropTable
DROP TABLE "StrategyOrigin";

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orgRole" "OrgRole" NOT NULL DEFAULT 'MIEMBRO',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 0,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleStatus" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_userId_organizationId_key" ON "OrganizationMember"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_token_key" ON "OrganizationInvitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_code_key" ON "OrganizationInvitation"("code");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_organizationId_idx" ON "OrganizationInvitation"("organizationId");

-- CreateIndex
CREATE INDEX "ModuleStatus_cycleId_idx" ON "ModuleStatus"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleStatus_cycleId_moduleId_key" ON "ModuleStatus"("cycleId", "moduleId");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeOrganizationId_fkey" FOREIGN KEY ("activeOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleStatus" ADD CONSTRAINT "ModuleStatus_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vision" ADD CONSTRAINT "Vision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Value" ADD CONSTRAINT "Value_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EthicsCode" ADD CONSTRAINT "EthicsCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardinalPrinciple" ADD CONSTRAINT "CardinalPrinciple_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PestecFactor" ADD CONSTRAINT "PestecFactor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MefeFactor" ADD CONSTRAINT "MefeFactor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MefeState" ADD CONSTRAINT "MefeState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveAnalysis" ADD CONSTRAINT "CompetitiveAnalysis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndustryAttractiveness" ADD CONSTRAINT "IndustryAttractiveness_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MpcFactorDef" ADD CONSTRAINT "MpcFactorDef_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MpcCompetitor" ADD CONSTRAINT "MpcCompetitor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PorterAnalysis" ADD CONSTRAINT "PorterAnalysis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmofhitArea" ADD CONSTRAINT "AmofhitArea_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MefiFactor" ADD CONSTRAINT "MefiFactor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MefiState" ADD CONSTRAINT "MefiState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaSynthesis" ADD CONSTRAINT "AreaSynthesis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalReport" ADD CONSTRAINT "InternalReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialRatio" ADD CONSTRAINT "FinancialRatio_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Olp" ADD CONSTRAINT "Olp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeyeaAnalysis" ADD CONSTRAINT "PeyeaAnalysis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpeEvaluation" ADD CONSTRAINT "McpeEvaluation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicAxis" ADD CONSTRAINT "StrategicAxis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
