-- Estratega Fase B: conectar Project con Ocp como "iniciativa"
-- Idempotente. Aplicar contra DATABASE_URL.

BEGIN;

DO $$ BEGIN
  ALTER TABLE "Project" ADD COLUMN "ocpId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Project" ADD CONSTRAINT "Project_ocpId_fkey"
    FOREIGN KEY ("ocpId") REFERENCES "Ocp"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Project_ocpId_idx" ON "Project"("ocpId");

COMMIT;
