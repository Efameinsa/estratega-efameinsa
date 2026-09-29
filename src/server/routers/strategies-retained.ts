import { z } from "zod";
import { router, protectedProcedure, editorProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import { inferDalessioType, DALESSIO_TYPES, type DalessioType } from "@/lib/dalessio-types";

const DalessioTypeSchema = z.enum(DALESSIO_TYPES.map((t) => t.key) as [DalessioType, ...DalessioType[]]);

export const strategiesRetainedRouter = router({
  // getSetup: estrategias aprobadas en Auditoria Etica + OLPs + contingencia
  getSetup: protectedProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const cycleId = input.cycleId;
      const [consolidated, ethicsEvals, rumeltEvals, olps, mcpe] = await Promise.all([
        db.consolidatedStrategy.findMany({
          where: { cycleId },
          orderBy: { sortOrder: "asc" },
          include: { olpLinks: true, origins: true },
        }),
        db.ethicsEvaluation.findMany({ where: { cycleId }, include: { principles: true, mitigants: true } }),
        db.rumeltEvaluation.findMany({ where: { cycleId } }),
        db.olp.findMany({ where: { cycleId }, orderBy: { sortOrder: "asc" } }),
        db.mcpeAnalysis.findUnique({ where: { cycleId }, include: { ratings: true } }),
      ]);

      const ethicsMap = new Map(ethicsEvals.map((e) => [e.consolidatedId, e]));
      const rumeltMap = new Map(rumeltEvals.map((e) => [e.consolidatedId, e]));

      // PTA por estrategia (MCPE)
      const ptaByStrategy = new Map<string, number>();
      if (mcpe) {
        for (const r of mcpe.ratings) {
          if (r.pa !== null && r.pta !== null) {
            ptaByStrategy.set(r.consolidatedId, (ptaByStrategy.get(r.consolidatedId) ?? 0) + r.pta);
          }
        }
      }
      const sortedByPta = [...consolidated].sort((a, b) => (ptaByStrategy.get(b.id) ?? 0) - (ptaByStrategy.get(a.id) ?? 0));
      const rankingMap = new Map<string, number>();
      sortedByPta.forEach((s, i) => rankingMap.set(s.id, i + 1));

      // Clasificar segun pasaron los filtros
      type ItemKind = { kind: "retained" } | { kind: "contingency"; reason: string };
      const items = consolidated.map((c, i) => {
        const ethics = ethicsMap.get(c.id);
        const rumelt = rumeltMap.get(c.id);
        const isEthicsApproved = ethics && (ethics.finalVerdict === "aprobada" || ethics.finalVerdict === "aprobada_con_mitigantes");
        const isRumeltApproved = rumelt && (rumelt.status === "aprobada" || rumelt.status === "aprobada_manual");
        const ethicsMitigants = ethics?.mitigants ?? [];
        const ethicsPromueve = ethics?.principles.filter((p) => p.rating === "promueve").length ?? 0;
        const ethicsViolaciones = ethics?.principles.filter((p) => p.rating === "viola").length ?? 0;
        const isEjemplar = ethicsPromueve >= 3 && ethicsViolaciones === 0;
        const isReformulated = c.code?.endsWith("r");

        let kind: ItemKind;
        if (c.status === "descartada") {
          kind = { kind: "contingency", reason: "Descartada en MD" };
        } else if (!rumelt) {
          kind = { kind: "contingency", reason: "No evaluada en Rumelt" };
        } else if (rumelt.status === "rechazada") {
          kind = { kind: "contingency", reason: "Rechazada en Rumelt" };
        } else if (rumelt.status === "reformulada") {
          kind = { kind: "contingency", reason: "Reformulada (existe version mejorada)" };
        } else if (rumelt.status === "en_revision") {
          kind = { kind: "contingency", reason: "En revision en Rumelt (no aprobada)" };
        } else if (!isRumeltApproved) {
          kind = { kind: "contingency", reason: "Sin aprobacion final en Rumelt" };
        } else if (!ethics || ethics.status === "pendiente") {
          kind = { kind: "contingency", reason: "No evaluada en Auditoria Etica" };
        } else if (ethics.finalVerdict === "rechazada") {
          kind = { kind: "contingency", reason: "Rechazada en Auditoria Etica" };
        } else if (ethics.status === "requiere_mitigacion") {
          kind = { kind: "contingency", reason: "Requiere mitigantes (no completados)" };
        } else if (!isEthicsApproved) {
          kind = { kind: "contingency", reason: "Sin aprobacion etica final" };
        } else {
          kind = { kind: "retained" };
        }

        // Inferir tipo D'Alessio si no esta seteado
        const dalessioInferred = c.dalessioType ? null : inferDalessioType(c.text, c.type);

        return {
          ...c,
          eCode: c.code ?? `E${i + 1}`,
          ptaTotal: ptaByStrategy.get(c.id) ?? 0,
          mcpeRanking: rankingMap.get(c.id) ?? null,
          rumeltStatus: rumelt?.status ?? null,
          ethicsStatus: ethics?.status ?? null,
          ethicsMitigantsCount: ethicsMitigants.length,
          ethicsPromueveCount: ethicsPromueve,
          isEjemplar,
          isReformulated,
          dalessioInferred,
          itemKind: kind,
        };
      });

      const retained = items.filter((i) => i.itemKind.kind === "retained");
      const contingency = items.filter((i) => i.itemKind.kind === "contingency");

      // Conteos del embudo
      const funnelCounts = {
        brutas: 0, // se aproxima sumando origins
        md: consolidated.length,
        rumeltApproved: items.filter((i) => i.rumeltStatus === "aprobada" || i.rumeltStatus === "aprobada_manual").length,
        ethicsApproved: items.filter((i) => i.ethicsStatus === "aprobada" || i.ethicsStatus === "aprobada_con_mitigantes").length,
        retained: retained.length,
      };
      funnelCounts.brutas = consolidated.reduce((s, c) => s + c.origins.length, 0);

      const olpsEnriched = olps.map((o, i) => ({ ...o, olpCode: `OLP${i + 1}` }));

      return {
        retained,
        contingency,
        olps: olpsEnriched,
        funnelCounts,
      };
    }),

  // Clasificar (dalessioType, responsible, priority)
  classify: editorProcedure
    .input(z.object({
      id: z.string(),
      dalessioType: DalessioTypeSchema.optional(),
      responsible: z.string().optional(),
      priority: z.enum(["alta", "media", "baja"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.consolidatedStrategy.update({ where: { id }, data });
    }),

  // Reactivar desde contingencia (con justificacion)
  reactivate: editorProcedure
    .input(z.object({ id: z.string(), justification: z.string().min(10) }))
    .mutation(async ({ input }) => {
      // Marcar como retenida y agregar justificacion
      return db.consolidatedStrategy.update({
        where: { id: input.id },
        data: {
          status: "reactivada",
          justification: input.justification,
        },
      });
    }),

  // Mover a contingencia manualmente
  moveToContingency: editorProcedure
    .input(z.object({ id: z.string(), reason: z.string().min(5) }))
    .mutation(async ({ input }) => {
      return db.consolidatedStrategy.update({
        where: { id: input.id },
        data: {
          status: "descartada",
          contingencyReason: input.reason,
        },
      });
    }),

  // Marcar como retenida final (preparado para PEI)
  markFinal: editorProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ input }) => {
      // Solo cambia el status de las que ya estan retenida o reactivada a retenida_final
      return db.consolidatedStrategy.updateMany({
        where: { cycleId: input.cycleId, status: { in: ["retenida", "reactivada"] } },
        data: { status: "retenida_final" },
      });
    }),

  // Vinculacion con OLP (reutiliza el endpoint de MD)
  setOlpLink: editorProcedure
    .input(z.object({
      consolidatedId: z.string(),
      olpId: z.string(),
      linked: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      if (input.linked) {
        await db.consolidatedStrategyOlp.upsert({
          where: { consolidatedId_olpId: { consolidatedId: input.consolidatedId, olpId: input.olpId } },
          create: { consolidatedId: input.consolidatedId, olpId: input.olpId, origin: "user" },
          update: { origin: "user" },
        });
      } else {
        await db.consolidatedStrategyOlp.deleteMany({
          where: { consolidatedId: input.consolidatedId, olpId: input.olpId },
        });
      }
      return { ok: true };
    }),
});
