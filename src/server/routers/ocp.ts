import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import { PREDEFINED_AREAS } from "@/lib/ocp-areas";

const FrequencyEnum = z.enum(["mensual", "trimestral", "semestral", "anual"]);
const PriorityEnum = z.enum(["alta", "media", "baja"]);
const QuarterEnum = z.enum(["Q1", "Q2", "Q3", "Q4"]);
const ActionStatusEnum = z.enum(["pendiente", "en_curso", "completada"]);

async function assertOcpOwnership(ocpId: string, organizationId: string) {
  const ocp = await db.ocp.findUniqueOrThrow({
    where: { id: ocpId },
    select: { id: true, organizationId: true, olpId: true, cycleId: true, year: true },
  });
  if (ocp.organizationId !== organizationId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return ocp;
}

async function generateOcpCode(olpId: string, year: number): Promise<string> {
  const olp = await db.olp.findUniqueOrThrow({
    where: { id: olpId },
    select: { cycleId: true, sortOrder: true },
  });
  const siblings = await db.olp.findMany({
    where: { cycleId: olp.cycleId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const olpIndex = siblings.findIndex((o) => o.id === olpId);
  const olpNum = olpIndex >= 0 ? olpIndex + 1 : (olp.sortOrder ?? 0) + 1;
  const cycle = await db.strategicCycle.findUniqueOrThrow({
    where: { id: olp.cycleId },
    select: { yearStart: true },
  });
  const seq = Math.max(1, year - cycle.yearStart + 1);
  return `OCP${olpNum}.${seq}`;
}

export const ocpRouter = router({
  setupOverview: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const cycle = await db.strategicCycle.findUniqueOrThrow({
        where: { id: input.cycleId },
        select: { id: true, name: true, yearStart: true, yearEnd: true },
      });

      const [olps, strategies, areas, ocps] = await Promise.all([
        db.olp.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: { strategies: { select: { strategyId: true } } },
        }),
        db.strategy.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            code: true,
            description: true,
            type: true,
            swotQuadrant: true,
            status: true,
            olps: { select: { olpId: true } },
          },
        }),
        db.ocpArea.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        }),
        db.ocp.findMany({
          where: { cycleId: input.cycleId },
          select: { id: true, olpId: true, year: true, responsibleAreaId: true },
        }),
      ]);

      const ocpsByOlp = new Map<string, { year: number; areaId: string | null }[]>();
      for (const o of ocps) {
        const list = ocpsByOlp.get(o.olpId) ?? [];
        list.push({ year: o.year, areaId: o.responsibleAreaId });
        ocpsByOlp.set(o.olpId, list);
      }

      const horizonYears: number[] = [];
      for (let y = cycle.yearStart + 1; y <= cycle.yearEnd; y++) horizonYears.push(y);

      const olpsEnriched = olps.map((olp, idx) => {
        const ocpsOfOlp = ocpsByOlp.get(olp.id) ?? [];
        const yearsCovered = new Set(ocpsOfOlp.map((o) => o.year));
        const yearsCoveredCount = horizonYears.filter((y) => yearsCovered.has(y)).length;
        const status: "completo" | "parcial" | "pendiente" =
          ocpsOfOlp.length === 0
            ? "pendiente"
            : yearsCoveredCount >= horizonYears.length
            ? "completo"
            : "parcial";
        return {
          id: olp.id,
          code: `OLP${idx + 1}`,
          description: olp.description,
          metric: olp.metric,
          currentValue: olp.currentValue,
          targetValue: olp.targetValue,
          unit: olp.unit,
          bscPerspective: olp.bscPerspective,
          strategyIds: olp.strategies.map((s) => s.strategyId),
          ocps: ocpsOfOlp,
          yearsCovered: Array.from(yearsCovered).sort((a, b) => a - b),
          yearsCoveredCount,
          status,
        };
      });

      const areasWithOcps = new Set(
        ocps.map((o) => o.responsibleAreaId).filter((id): id is string => !!id),
      );
      const completedOlps = olpsEnriched.filter((o) => o.status === "completo").length;

      return {
        cycle,
        horizonYears,
        olps: olpsEnriched,
        strategies,
        areas,
        metrics: {
          totalOlps: olps.length,
          totalOcps: ocps.length,
          activeAreas: areasWithOcps.size,
          progressPct:
            olps.length === 0 ? 0 : Math.round((completedOlps / olps.length) * 100),
        },
      };
    }),

  ensureSeedAreas: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await db.ocpArea.findMany({
        where: { cycleId: input.cycleId },
        select: { key: true },
      });
      const existingKeys = new Set(existing.map((a) => a.key));
      const toCreate = PREDEFINED_AREAS.filter((a) => !existingKeys.has(a.key));
      if (toCreate.length > 0) {
        await db.ocpArea.createMany({
          data: toCreate.map((a, i) => ({
            organizationId: ctx.organizationId,
            cycleId: input.cycleId,
            key: a.key,
            name: a.name,
            icon: a.icon,
            kind: "predefined",
            sortOrder: PREDEFINED_AREAS.findIndex((p) => p.key === a.key),
          })),
        });
      }
      return { created: toCreate.length };
    }),

  listAreas: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.ocpArea.findMany({
        where: { cycleId: input.cycleId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    }),

  createArea: cycleProcedure
    .input(z.object({ cycleId: z.string(), name: z.string().min(1).max(60) }))
    .mutation(async ({ input, ctx }) => {
      const key = `custom-${Date.now().toString(36)}`;
      const count = await db.ocpArea.count({ where: { cycleId: input.cycleId } });
      return db.ocpArea.create({
        data: {
          organizationId: ctx.organizationId,
          cycleId: input.cycleId,
          key,
          name: input.name.trim(),
          kind: "custom",
          sortOrder: count,
        },
      });
    }),

  deleteArea: protectedProcedure
    .input(z.object({ areaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const area = await db.ocpArea.findUniqueOrThrow({
        where: { id: input.areaId },
        select: { id: true, organizationId: true, kind: true },
      });
      if (area.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (area.kind !== "custom") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solo puedes eliminar áreas personalizadas",
        });
      }
      return db.ocpArea.delete({ where: { id: input.areaId } });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const ocp = await db.ocp.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          responsibleArea: true,
          cycle: { select: { organizationId: true } },
        },
      });
      if (ocp.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ocp;
    }),

  getByOlp: protectedProcedure
    .input(z.object({ olpId: z.string() }))
    .query(async ({ ctx, input }) => {
      const olp = await db.olp.findUniqueOrThrow({
        where: { id: input.olpId },
        include: { cycle: { select: { organizationId: true, yearStart: true, yearEnd: true } } },
      });
      if (olp.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const ocps = await db.ocp.findMany({
        where: { olpId: input.olpId },
        orderBy: [{ year: "asc" }],
        include: {
          responsibleArea: true,
          supportAreas: { include: { area: true } },
          linkedStrategies: { include: { strategy: true } },
          actions: { orderBy: [{ quarter: "asc" }, { sortOrder: "asc" }] },
          resource: true,
        },
      });
      return {
        olp: {
          id: olp.id,
          description: olp.description,
          metric: olp.metric,
          currentValue: olp.currentValue,
          targetValue: olp.targetValue,
          unit: olp.unit,
          bscPerspective: olp.bscPerspective,
          yearStart: olp.cycle.yearStart,
          yearEnd: olp.cycle.yearEnd,
        },
        ocps,
      };
    }),

  upsertOcp: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        id: z.string().optional(),
        olpId: z.string(),
        description: z.string().min(1),
        year: z.number().int(),
        metaValue: z.number().optional().nullable(),
        metaText: z.string().optional().nullable(),
        unit: z.string().optional().nullable(),
        responsibleAreaId: z.string().optional().nullable(),
        indicator: z.string().optional().nullable(),
        frequency: FrequencyEnum.optional().nullable(),
        priority: PriorityEnum.optional().nullable(),
        status: z
          .enum(["borrador", "definido", "en_ejecucion", "cumplido", "no_cumplido"])
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const olp = await db.olp.findUniqueOrThrow({
        where: { id: input.olpId },
        select: { id: true, cycleId: true, organizationId: true },
      });
      if (olp.cycleId !== input.cycleId || olp.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const data = {
        description: input.description.trim(),
        year: input.year,
        metaValue: input.metaValue ?? null,
        metaText: input.metaText ?? null,
        unit: input.unit ?? null,
        responsibleAreaId: input.responsibleAreaId ?? null,
        indicator: input.indicator ?? null,
        frequency: input.frequency ?? null,
        priority: input.priority ?? null,
        status: input.status ?? "borrador",
      };

      if (input.id) {
        const existing = await assertOcpOwnership(input.id, ctx.organizationId);
        if (existing.olpId !== input.olpId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "OCP no pertenece al OLP" });
        }
        const code = await generateOcpCode(input.olpId, input.year);
        return db.ocp.update({
          where: { id: input.id },
          data: { ...data, code },
        });
      }

      const code = await generateOcpCode(input.olpId, input.year);
      const count = await db.ocp.count({ where: { olpId: input.olpId } });
      return db.ocp.create({
        data: {
          ...data,
          code,
          olpId: input.olpId,
          cycleId: input.cycleId,
          organizationId: ctx.organizationId,
          sortOrder: count,
        },
      });
    }),

  deleteOcp: protectedProcedure
    .input(z.object({ ocpId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOcpOwnership(input.ocpId, ctx.organizationId);
      return db.ocp.delete({ where: { id: input.ocpId } });
    }),

  setLinkedStrategies: protectedProcedure
    .input(z.object({ ocpId: z.string(), strategyIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const ocp = await assertOcpOwnership(input.ocpId, ctx.organizationId);
      if (input.strategyIds.length > 0) {
        const strategies = await db.strategy.findMany({
          where: { id: { in: input.strategyIds } },
          select: { id: true, organizationId: true, cycleId: true },
        });
        const invalid = strategies.find(
          (s) => s.organizationId !== ctx.organizationId || s.cycleId !== ocp.cycleId,
        );
        if (invalid || strategies.length !== input.strategyIds.length) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      await db.ocpStrategy.deleteMany({ where: { ocpId: input.ocpId } });
      if (input.strategyIds.length > 0) {
        await db.ocpStrategy.createMany({
          data: input.strategyIds.map((sid) => ({ ocpId: input.ocpId, strategyId: sid })),
        });
      }
      return { count: input.strategyIds.length };
    }),

  setSupportAreas: protectedProcedure
    .input(z.object({ ocpId: z.string(), areaIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const ocp = await assertOcpOwnership(input.ocpId, ctx.organizationId);
      if (input.areaIds.length > 0) {
        const areas = await db.ocpArea.findMany({
          where: { id: { in: input.areaIds } },
          select: { id: true, organizationId: true, cycleId: true },
        });
        const invalid = areas.find(
          (a) => a.organizationId !== ctx.organizationId || a.cycleId !== ocp.cycleId,
        );
        if (invalid || areas.length !== input.areaIds.length) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      await db.ocpAreaSupport.deleteMany({ where: { ocpId: input.ocpId } });
      if (input.areaIds.length > 0) {
        await db.ocpAreaSupport.createMany({
          data: input.areaIds.map((aid) => ({ ocpId: input.ocpId, areaId: aid })),
        });
      }
      return { count: input.areaIds.length };
    }),

  upsertAction: protectedProcedure
    .input(
      z.object({
        ocpId: z.string(),
        id: z.string().optional(),
        quarter: QuarterEnum,
        description: z.string().min(1).max(280),
        status: ActionStatusEnum.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOcpOwnership(input.ocpId, ctx.organizationId);
      if (input.id) {
        const existing = await db.ocpAction.findUniqueOrThrow({
          where: { id: input.id },
          select: { ocpId: true },
        });
        if (existing.ocpId !== input.ocpId) {
          throw new TRPCError({ code: "BAD_REQUEST" });
        }
        return db.ocpAction.update({
          where: { id: input.id },
          data: {
            quarter: input.quarter,
            description: input.description.trim(),
            status: input.status,
          },
        });
      }
      const count = await db.ocpAction.count({ where: { ocpId: input.ocpId } });
      if (count >= 10) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Máximo 10 acciones por OCP",
        });
      }
      return db.ocpAction.create({
        data: {
          ocpId: input.ocpId,
          quarter: input.quarter,
          description: input.description.trim(),
          status: input.status ?? "pendiente",
          sortOrder: count,
        },
      });
    }),

  deleteAction: protectedProcedure
    .input(z.object({ actionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const action = await db.ocpAction.findUniqueOrThrow({
        where: { id: input.actionId },
        include: { ocp: { select: { organizationId: true } } },
      });
      if (action.ocp.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.ocpAction.delete({ where: { id: input.actionId } });
    }),

  reorderActions: protectedProcedure
    .input(z.object({ ocpId: z.string(), actionIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await assertOcpOwnership(input.ocpId, ctx.organizationId);
      await db.$transaction(
        input.actionIds.map((id, idx) =>
          db.ocpAction.update({
            where: { id },
            data: { sortOrder: idx },
          }),
        ),
      );
      return { count: input.actionIds.length };
    }),

  upsertResource: protectedProcedure
    .input(
      z.object({
        ocpId: z.string(),
        budgetEstimate: z.number().optional().nullable(),
        budgetCurrency: z.string().optional().nullable(),
        ftesRequired: z.number().optional().nullable(),
        techRequired: z.string().optional().nullable(),
        otherDependencies: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOcpOwnership(input.ocpId, ctx.organizationId);
      const { ocpId, ...rest } = input;
      return db.ocpResource.upsert({
        where: { ocpId },
        create: { ocpId, ...rest },
        update: rest,
      });
    }),

  roadmap: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const cycle = await db.strategicCycle.findUniqueOrThrow({
        where: { id: input.cycleId },
        select: { yearStart: true, yearEnd: true },
      });

      const [olps, ocps, areas, strategies] = await Promise.all([
        db.olp.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true, description: true, targetValue: true, unit: true },
        }),
        db.ocp.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ year: "asc" }],
          include: {
            responsibleArea: true,
            linkedStrategies: { select: { strategyId: true } },
          },
        }),
        db.ocpArea.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ sortOrder: "asc" }],
        }),
        db.strategy.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ sortOrder: "asc" }],
          select: { id: true, code: true, description: true },
        }),
      ]);

      const horizonYears: number[] = [];
      for (let y = cycle.yearStart + 1; y <= cycle.yearEnd; y++) horizonYears.push(y);

      const olpsWithCode = olps.map((olp, idx) => ({
        ...olp,
        code: `OLP${idx + 1}`,
      }));

      const areaLoad = areas.map((area) => ({
        ...area,
        ocpCount: ocps.filter((o) => o.responsibleAreaId === area.id).length,
      }));

      return {
        horizonYears,
        olps: olpsWithCode,
        ocps,
        areas,
        strategies,
        areaLoad,
      };
    }),
});
