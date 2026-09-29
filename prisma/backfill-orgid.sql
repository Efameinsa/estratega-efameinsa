-- Backfill organizationId desde StrategicCycle a 20 tablas hijas.
-- Patrón por tabla: ADD nullable -> UPDATE backfill -> SET NOT NULL -> ADD FK.

BEGIN;

-- AmofhitArea
ALTER TABLE "AmofhitArea" ADD COLUMN "organizationId" TEXT;
UPDATE "AmofhitArea" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "AmofhitArea" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "AmofhitArea" ADD CONSTRAINT "AmofhitArea_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CardinalPrinciple
ALTER TABLE "CardinalPrinciple" ADD COLUMN "organizationId" TEXT;
UPDATE "CardinalPrinciple" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "CardinalPrinciple" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "CardinalPrinciple" ADD CONSTRAINT "CardinalPrinciple_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CompetitiveAnalysis
ALTER TABLE "CompetitiveAnalysis" ADD COLUMN "organizationId" TEXT;
UPDATE "CompetitiveAnalysis" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "CompetitiveAnalysis" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "CompetitiveAnalysis" ADD CONSTRAINT "CompetitiveAnalysis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EthicsCode
ALTER TABLE "EthicsCode" ADD COLUMN "organizationId" TEXT;
UPDATE "EthicsCode" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "EthicsCode" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "EthicsCode" ADD CONSTRAINT "EthicsCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- IndustryAttractiveness
ALTER TABLE "IndustryAttractiveness" ADD COLUMN "organizationId" TEXT;
UPDATE "IndustryAttractiveness" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "IndustryAttractiveness" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "IndustryAttractiveness" ADD CONSTRAINT "IndustryAttractiveness_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Interest
ALTER TABLE "Interest" ADD COLUMN "organizationId" TEXT;
UPDATE "Interest" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "Interest" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- MefeFactor
ALTER TABLE "MefeFactor" ADD COLUMN "organizationId" TEXT;
UPDATE "MefeFactor" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "MefeFactor" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "MefeFactor" ADD CONSTRAINT "MefeFactor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- MefeState
ALTER TABLE "MefeState" ADD COLUMN "organizationId" TEXT;
UPDATE "MefeState" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "MefeState" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "MefeState" ADD CONSTRAINT "MefeState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- MefiFactor
ALTER TABLE "MefiFactor" ADD COLUMN "organizationId" TEXT;
UPDATE "MefiFactor" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "MefiFactor" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "MefiFactor" ADD CONSTRAINT "MefiFactor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- MefiState
ALTER TABLE "MefiState" ADD COLUMN "organizationId" TEXT;
UPDATE "MefiState" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "MefiState" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "MefiState" ADD CONSTRAINT "MefiState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Mission
ALTER TABLE "Mission" ADD COLUMN "organizationId" TEXT;
UPDATE "Mission" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "Mission" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- MpcCompetitor
ALTER TABLE "MpcCompetitor" ADD COLUMN "organizationId" TEXT;
UPDATE "MpcCompetitor" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "MpcCompetitor" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "MpcCompetitor" ADD CONSTRAINT "MpcCompetitor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- MpcFactorDef
ALTER TABLE "MpcFactorDef" ADD COLUMN "organizationId" TEXT;
UPDATE "MpcFactorDef" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "MpcFactorDef" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "MpcFactorDef" ADD CONSTRAINT "MpcFactorDef_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PestecFactor
ALTER TABLE "PestecFactor" ADD COLUMN "organizationId" TEXT;
UPDATE "PestecFactor" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "PestecFactor" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "PestecFactor" ADD CONSTRAINT "PestecFactor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PeyeaAnalysis
ALTER TABLE "PeyeaAnalysis" ADD COLUMN "organizationId" TEXT;
UPDATE "PeyeaAnalysis" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "PeyeaAnalysis" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "PeyeaAnalysis" ADD CONSTRAINT "PeyeaAnalysis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PorterAnalysis
ALTER TABLE "PorterAnalysis" ADD COLUMN "organizationId" TEXT;
UPDATE "PorterAnalysis" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "PorterAnalysis" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "PorterAnalysis" ADD CONSTRAINT "PorterAnalysis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- StrategicAxis
ALTER TABLE "StrategicAxis" ADD COLUMN "organizationId" TEXT;
UPDATE "StrategicAxis" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "StrategicAxis" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "StrategicAxis" ADD CONSTRAINT "StrategicAxis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Strategy
ALTER TABLE "Strategy" ADD COLUMN "organizationId" TEXT;
UPDATE "Strategy" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "Strategy" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Value
ALTER TABLE "Value" ADD COLUMN "organizationId" TEXT;
UPDATE "Value" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "Value" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Value" ADD CONSTRAINT "Value_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Vision
ALTER TABLE "Vision" ADD COLUMN "organizationId" TEXT;
UPDATE "Vision" t SET "organizationId" = c."organizationId" FROM "StrategicCycle" c WHERE c.id = t."cycleId";
ALTER TABLE "Vision" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Vision" ADD CONSTRAINT "Vision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
