-- OCP por Área (M4) — migration aditiva
-- Crea 6 tablas nuevas sin tocar las existentes.

CREATE TABLE "OcpArea" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'predefined',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OcpArea_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OcpArea_cycleId_key_key" ON "OcpArea"("cycleId", "key");
CREATE INDEX "OcpArea_cycleId_idx" ON "OcpArea"("cycleId");

ALTER TABLE "OcpArea" ADD CONSTRAINT "OcpArea_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OcpArea" ADD CONSTRAINT "OcpArea_cycleId_fkey"
    FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Ocp" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "olpId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "metaValue" DOUBLE PRECISION,
    "metaText" TEXT,
    "unit" TEXT,
    "responsibleAreaId" TEXT,
    "indicator" TEXT,
    "frequency" TEXT,
    "priority" TEXT,
    "status" TEXT NOT NULL DEFAULT 'borrador',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Ocp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Ocp_olpId_year_key" ON "Ocp"("olpId", "year");
CREATE INDEX "Ocp_cycleId_idx" ON "Ocp"("cycleId");
CREATE INDEX "Ocp_olpId_idx" ON "Ocp"("olpId");
CREATE INDEX "Ocp_responsibleAreaId_idx" ON "Ocp"("responsibleAreaId");

ALTER TABLE "Ocp" ADD CONSTRAINT "Ocp_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ocp" ADD CONSTRAINT "Ocp_cycleId_fkey"
    FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ocp" ADD CONSTRAINT "Ocp_olpId_fkey"
    FOREIGN KEY ("olpId") REFERENCES "Olp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ocp" ADD CONSTRAINT "Ocp_responsibleAreaId_fkey"
    FOREIGN KEY ("responsibleAreaId") REFERENCES "OcpArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "OcpAreaSupport" (
    "ocpId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    CONSTRAINT "OcpAreaSupport_pkey" PRIMARY KEY ("ocpId", "areaId")
);

CREATE INDEX "OcpAreaSupport_areaId_idx" ON "OcpAreaSupport"("areaId");

ALTER TABLE "OcpAreaSupport" ADD CONSTRAINT "OcpAreaSupport_ocpId_fkey"
    FOREIGN KEY ("ocpId") REFERENCES "Ocp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OcpAreaSupport" ADD CONSTRAINT "OcpAreaSupport_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "OcpArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OcpStrategy" (
    "ocpId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    CONSTRAINT "OcpStrategy_pkey" PRIMARY KEY ("ocpId", "strategyId")
);

CREATE INDEX "OcpStrategy_strategyId_idx" ON "OcpStrategy"("strategyId");

ALTER TABLE "OcpStrategy" ADD CONSTRAINT "OcpStrategy_ocpId_fkey"
    FOREIGN KEY ("ocpId") REFERENCES "Ocp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OcpStrategy" ADD CONSTRAINT "OcpStrategy_strategyId_fkey"
    FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OcpAction" (
    "id" TEXT NOT NULL,
    "ocpId" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OcpAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OcpAction_ocpId_idx" ON "OcpAction"("ocpId");

ALTER TABLE "OcpAction" ADD CONSTRAINT "OcpAction_ocpId_fkey"
    FOREIGN KEY ("ocpId") REFERENCES "Ocp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OcpResource" (
    "ocpId" TEXT NOT NULL,
    "budgetEstimate" DOUBLE PRECISION,
    "budgetCurrency" TEXT DEFAULT 'USD',
    "ftesRequired" DOUBLE PRECISION,
    "techRequired" TEXT,
    "otherDependencies" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OcpResource_pkey" PRIMARY KEY ("ocpId")
);

ALTER TABLE "OcpResource" ADD CONSTRAINT "OcpResource_ocpId_fkey"
    FOREIGN KEY ("ocpId") REFERENCES "Ocp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
