import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure, editorProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

const RefTypeSchema = z.enum(["F", "O", "D", "A", "strategy"]);
const DimensionSchema = z.enum(["FIN", "CLI", "INT", "APR"]);

export const olpRouter = router({
  // getSetup — devuelve OLPs + vision + FODA + estrategias retenidas
  getSetup: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const cycleId = input.cycleId;
      const [olps, visions, mefi, mefe, strategies] = await Promise.all([
        db.olp.findMany({
          where: { cycleId },
          orderBy: { sortOrder: "asc" },
          include: { references: true },
        }),
        db.vision.findMany({
          where: { cycleId },
          orderBy: { createdAt: "desc" },
          take: 1,
        }),
        db.mefiFactor.findMany({
          where: { cycleId },
          orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
        }),
        db.mefeFactor.findMany({
          where: { cycleId },
          orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
        }),
        db.strategy.findMany({
          where: { cycleId },
          orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
        }),
      ]);

      let fIdx = 0, dIdx = 0;
      const fortalezas = mefi.filter((f) => f.type === "F").map((f) => ({ id: f.id, code: `F${++fIdx}`, text: f.description, weight: f.weight }));
      const debilidades = mefi.filter((f) => f.type === "D").map((f) => ({ id: f.id, code: `D${++dIdx}`, text: f.description, weight: f.weight }));
      let oIdx = 0, aIdx = 0;
      const oportunidades = mefe.filter((f) => f.type === "O").map((f) => ({ id: f.id, code: `O${++oIdx}`, text: f.description, weight: f.weight }));
      const amenazas = mefe.filter((f) => f.type === "A").map((f) => ({ id: f.id, code: `A${++aIdx}`, text: f.description, weight: f.weight }));

      const strategiesEnriched = strategies.map((s, i) => ({
        ...s,
        eCode: s.code ?? `E${i + 1}`,
      }));

      const olpsEnriched = olps.map((o, i) => ({
        ...o,
        olpCode: `OLP${i + 1}`,
      }));

      return {
        vision: visions[0]
          ? { text: visions[0].text, year: visions[0].timeHorizon ?? null }
          : null,
        foda: { fortalezas, oportunidades, debilidades, amenazas },
        strategies: strategiesEnriched,
        olps: olpsEnriched,
      };
    }),

  list: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.olp.findMany({
        where: { cycleId: input.cycleId },
        orderBy: { sortOrder: "asc" },
        include: { references: true },
      });
    }),

  create: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        description: z.string().min(1),
        metric: z.string().optional(),
        currentValue: z.number().optional(),
        targetValue: z.number().optional(),
        unit: z.string().optional(),
        bscPerspective: DimensionSchema.optional(),
        responsible: z.string().optional(),
        priority: z.enum(["alta", "media", "baja"]).optional(),
        targetYear: z.number().int().optional(),
        references: z
          .array(
            z.object({
              refType: RefTypeSchema,
              refId: z.string(),
              refCode: z.string().optional(),
              refText: z.string().optional(),
              manual: z.boolean().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const count = await db.olp.count({ where: { cycleId: input.cycleId } });
      const { references, ...olpData } = input;
      const olp = await db.olp.create({
        data: { ...olpData, sortOrder: count, organizationId: ctx.organizationId },
      });
      if (references && references.length > 0) {
        await db.olpReference.createMany({
          data: references.map((r) => ({
            olpId: olp.id,
            refType: r.refType,
            refId: r.refId,
            refCode: r.refCode,
            refText: r.refText,
            manual: r.manual ?? true,
          })),
        });
      }
      return olp;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1).optional(),
        metric: z.string().optional(),
        currentValue: z.number().optional().nullable(),
        targetValue: z.number().optional().nullable(),
        unit: z.string().optional(),
        bscPerspective: DimensionSchema.optional(),
        responsible: z.string().optional(),
        priority: z.enum(["alta", "media", "baja"]).optional(),
        targetYear: z.number().int().optional().nullable(),
        references: z
          .array(
            z.object({
              refType: RefTypeSchema,
              refId: z.string(),
              refCode: z.string().optional(),
              refText: z.string().optional(),
              manual: z.boolean().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const record = await db.olp.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { id, references, ...data } = input;
      const olp = await db.olp.update({ where: { id }, data });
      if (references) {
        await db.olpReference.deleteMany({ where: { olpId: id } });
        if (references.length > 0) {
          await db.olpReference.createMany({
            data: references.map((r) => ({
              olpId: id,
              refType: r.refType,
              refId: r.refId,
              refCode: r.refCode,
              refText: r.refText,
              manual: r.manual ?? true,
            })),
          });
        }
      }
      return olp;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await db.olp.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.olp.delete({ where: { id: input.id } });
    }),

  duplicate: editorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const original = await db.olp.findUniqueOrThrow({
        where: { id: input.id },
        include: { references: true },
      });
      const count = await db.olp.count({ where: { cycleId: original.cycleId } });
      const { id: _id, references, createdAt, updatedAt, ...rest } = original;
      void _id; void createdAt; void updatedAt;
      const copy = await db.olp.create({
        data: {
          ...rest,
          description: `${rest.description} (copia)`,
          sortOrder: count,
        },
      });
      if (references.length > 0) {
        await db.olpReference.createMany({
          data: references.map((r) => ({
            olpId: copy.id,
            refType: r.refType,
            refId: r.refId,
            refCode: r.refCode,
            refText: r.refText,
            manual: r.manual,
          })),
        });
      }
      return copy;
    }),
});
