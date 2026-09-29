-- ════════════════════════════════════════════════════════════════════════════
-- Estratega: agregar campos de sincronización con Educanet al Project
-- Aplicar contra la DB de Estratega (Neon).
-- Idempotente.
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$ BEGIN
  ALTER TABLE "Project" ADD COLUMN "educanetCategoria" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Project" ADD COLUMN "educanetWorkflowInstanciaId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Project" ADD COLUMN "educanetSyncedAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Project" ADD COLUMN "educanetOrgSlug" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

COMMIT;
