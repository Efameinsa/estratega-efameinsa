import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import {
  STRUCTURE_TEMPLATES,
  STRUCTURE_TYPES,
  NODE_TYPES,
  recommendStructure,
  extractMarkets,
  extractCommittees,
  extractAreasFromOcps,
  defaultPositionForLevel,
  type StructureType,
  type NodeType,
} from "@/lib/org-structure";

const StructureTypeEnum = z.enum([
  "funcional",
  "divisional",
  "matricial",
  "por_procesos",
  "en_red",
  "hibrida",
]);
const NodeTypeEnum = z.enum([
  "directorio",
  "ceo",
  "division",
  "gerencia",
  "jefatura",
  "comite",
  "auditoria",
  "otro",
]);
const RaciEnum = z.enum(["R", "A", "C", "I", "S"]);

async function assertStructureAccess(
  structureId: string,
  organizationId: string,
) {
  const structure = await db.orgStructure.findUniqueOrThrow({
    where: { id: structureId },
    select: { id: true, organizationId: true, cycleId: true },
  });
  if (structure.organizationId !== organizationId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return structure;
}

async function assertNodeAccess(nodeId: string, organizationId: string) {
  const node = await db.orgNode.findUniqueOrThrow({
    where: { id: nodeId },
    include: { structure: { select: { organizationId: true, cycleId: true } } },
  });
  if (node.structure.organizationId !== organizationId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return node;
}

export const orgStructureRouter = router({
  // Setup: trae todo lo necesario para los pasos 1-3
  setup: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const [
        cycle,
        strategies,
        consolidated,
        ocps,
        ocpAreas,
        policies,
        mitigants,
        values,
        existingStructure,
      ] = await Promise.all([
        db.strategicCycle.findUniqueOrThrow({
          where: { id: input.cycleId },
          select: { id: true, name: true, yearStart: true, yearEnd: true },
        }),
        db.strategy.findMany({
          where: { cycleId: input.cycleId },
          orderBy: { sortOrder: "asc" },
          select: { id: true, code: true, description: true, type: true },
        }),
        db.consolidatedStrategy.findMany({
          where: { cycleId: input.cycleId },
          orderBy: { sortOrder: "asc" },
          select: { id: true, code: true, text: true, dalessioType: true },
        }),
        db.ocp.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ year: "asc" }],
          select: {
            id: true,
            code: true,
            description: true,
            year: true,
            responsibleArea: { select: { id: true, name: true } },
            supportAreas: { include: { area: { select: { id: true, name: true } } } },
          },
        }),
        db.ocpArea.findMany({
          where: { cycleId: input.cycleId },
          orderBy: { sortOrder: "asc" },
        }),
        db.politica.findMany({
          where: { cycleId: input.cycleId, status: { not: "descartada" } },
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            responsible: true,
            mandatory: true,
          },
        }),
        db.ethicsMitigant.findMany({
          where: { evaluation: { cycleId: input.cycleId } },
          select: { id: true, text: true, responsible: true, indicator: true },
        }),
        db.value.findMany({
          where: { cycleId: input.cycleId },
          select: { id: true, name: true },
        }),
        db.orgStructure.findUnique({
          where: { cycleId: input.cycleId },
          include: {
            nodes: { include: { ocpLinks: true, policyLinks: true } },
            relations: true,
          },
        }),
      ]);

      return {
        cycle,
        strategies,
        consolidated,
        ocps,
        ocpAreas,
        policies,
        mitigants,
        values,
        structure: existingStructure,
      };
    }),

  // Recomendación de tipo de estructura
  recommendType: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const strategies = await db.strategy.findMany({
        where: { cycleId: input.cycleId },
        select: { id: true, code: true, description: true, type: true },
      });
      const consolidated = await db.consolidatedStrategy.findMany({
        where: { cycleId: input.cycleId },
        select: { id: true, code: true, text: true, dalessioType: true },
      });
      const all = [
        ...strategies.map((s) => ({
          description: s.description,
          type: s.type,
          code: s.code,
        })),
        ...consolidated.map((c) => ({
          description: c.text,
          type: c.dalessioType,
          code: c.code,
        })),
      ];
      const recommendation = recommendStructure(all);
      const markets = extractMarkets(all);
      return { recommendation, markets };
    }),

  // Crea estructura (idempotente: si existe la actualiza)
  createOrUpdateStructure: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        type: StructureTypeEnum,
        name: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.orgStructure.findUnique({
        where: { cycleId: input.cycleId },
      });
      if (existing) {
        return db.orgStructure.update({
          where: { id: existing.id },
          data: {
            type: input.type,
            name: input.name ?? existing.name,
          },
        });
      }
      const cycle = await db.strategicCycle.findUniqueOrThrow({
        where: { id: input.cycleId },
        select: { name: true },
      });
      return db.orgStructure.create({
        data: {
          organizationId: ctx.organizationId,
          cycleId: input.cycleId,
          type: input.type,
          name: input.name ?? `Estructura ${cycle.name}`,
        },
      });
    }),

  // Auto-genera el organigrama base a partir de plantilla + datos heredados
  autoGenerate: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        type: StructureTypeEnum,
        replaceExisting: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.orgStructure.findUnique({
        where: { cycleId: input.cycleId },
        include: { nodes: true },
      });

      // Crear estructura si no existe
      let structureId: string;
      if (existing) {
        structureId = existing.id;
        if (input.replaceExisting) {
          await db.orgNode.deleteMany({ where: { structureId } });
        }
        await db.orgStructure.update({
          where: { id: structureId },
          data: { type: input.type },
        });
      } else {
        const cycle = await db.strategicCycle.findUniqueOrThrow({
          where: { id: input.cycleId },
          select: { name: true },
        });
        const created = await db.orgStructure.create({
          data: {
            organizationId: ctx.organizationId,
            cycleId: input.cycleId,
            type: input.type,
            name: `Estructura ${cycle.name}`,
          },
        });
        structureId = created.id;
      }

      // Skip generation if not replacing and already has nodes
      if (existing && !input.replaceExisting && existing.nodes.length > 0) {
        return { structureId, created: 0, message: "Estructura existente conservada" };
      }

      // Cargar fuentes
      const [ocps, strategies, consolidated, mitigants, policies] = await Promise.all([
        db.ocp.findMany({
          where: { cycleId: input.cycleId },
          select: {
            id: true,
            code: true,
            description: true,
            responsibleArea: { select: { id: true, name: true } },
            supportAreas: { include: { area: { select: { id: true, name: true } } } },
          },
        }),
        db.strategy.findMany({
          where: { cycleId: input.cycleId },
          select: { id: true, code: true, description: true },
        }),
        db.consolidatedStrategy.findMany({
          where: { cycleId: input.cycleId },
          select: { id: true, code: true, text: true },
        }),
        db.ethicsMitigant.findMany({
          where: { evaluation: { cycleId: input.cycleId } },
          select: { id: true, text: true, responsible: true },
        }),
        db.politica.findMany({
          where: { cycleId: input.cycleId, status: { not: "descartada" } },
          select: { id: true, code: true, name: true, responsible: true, mandatory: true },
        }),
      ]);

      // 1. Aplicar plantilla
      const template = STRUCTURE_TEMPLATES[input.type];
      const codeToNodeId = new Map<string, string>();

      for (let i = 0; i < template.length; i++) {
        const t = template[i];
        const nodeTypeDef = NODE_TYPES.find((n) => n.key === t.nodeType)!;
        const sameLevel = template.filter((x) => x.parent === t.parent);
        const indexInLevel = sameLevel.findIndex((x) => x.code === t.code);
        const pos = defaultPositionForLevel(
          nodeTypeDef.hierarchyLevel,
          indexInLevel,
          sameLevel.length,
        );
        const created = await db.orgNode.create({
          data: {
            structureId,
            code: t.code,
            name: t.name,
            nodeType: t.nodeType,
            hierarchyLevel: nodeTypeDef.hierarchyLevel,
            positionX: pos.x,
            positionY: pos.y,
            origin: "template",
            originReference: JSON.stringify({ source: "template", type: input.type }),
          },
        });
        codeToNodeId.set(t.code, created.id);
      }

      // Crear relaciones de plantilla
      for (const t of template) {
        if (!t.parent) continue;
        const parentId = codeToNodeId.get(t.parent);
        const childId = codeToNodeId.get(t.code);
        if (!parentId || !childId) continue;
        await db.orgRelation.create({
          data: {
            structureId,
            parentNodeId: parentId,
            childNodeId: childId,
            relationType: "reporta_directo",
          },
        });
      }

      // 2. Áreas detectadas de OCPs
      const detectedAreas = extractAreasFromOcps(ocps);
      const ceoId = codeToNodeId.get("CEO");
      const areaNodeMap = new Map<string, string>(); // ocpAreaId -> nodeId

      for (let i = 0; i < detectedAreas.length; i++) {
        const area = detectedAreas[i];
        // Skip if there's already a template node with similar name
        const existsInTemplate = template.some(
          (t) => t.name.toLowerCase().includes(area.name.toLowerCase()) ||
                  area.name.toLowerCase().includes(t.name.toLowerCase()),
        );
        if (existsInTemplate) {
          // map area to existing template node by best-effort name match
          const match = template.find(
            (t) =>
              t.name.toLowerCase().includes(area.name.toLowerCase()) ||
              area.name.toLowerCase().includes(t.name.toLowerCase()),
          );
          if (match) {
            const nodeId = codeToNodeId.get(match.code);
            if (nodeId) areaNodeMap.set(area.id, nodeId);
          }
          continue;
        }
        const pos = defaultPositionForLevel(2, template.length + i, detectedAreas.length + template.length);
        const node = await db.orgNode.create({
          data: {
            structureId,
            code: area.name.slice(0, 12).toUpperCase().replace(/\s+/g, "-"),
            name: area.name,
            nodeType: "gerencia",
            hierarchyLevel: 2,
            positionX: pos.x,
            positionY: pos.y,
            origin: "auto_generated",
            originReference: JSON.stringify({ source: "ocp_area", id: area.id, label: area.name }),
          },
        });
        areaNodeMap.set(area.id, node.id);
        if (ceoId) {
          await db.orgRelation.create({
            data: {
              structureId,
              parentNodeId: ceoId,
              childNodeId: node.id,
              relationType: "reporta_directo",
            },
          });
        }
      }

      // 3. Divisiones por mercado si estructura es divisional
      if (input.type === "divisional") {
        const allStrategies = [
          ...strategies.map((s) => ({ description: s.description })),
          ...consolidated.map((c) => ({ description: c.text })),
        ];
        const markets = extractMarkets(allStrategies);
        for (let i = 0; i < markets.length; i++) {
          const m = markets[i];
          const pos = defaultPositionForLevel(2, i, markets.length);
          const node = await db.orgNode.create({
            data: {
              structureId,
              code: `DIV-${m.key}`,
              name: `División ${m.label}`,
              nodeType: "division",
              hierarchyLevel: 2,
              positionX: pos.x,
              positionY: pos.y - 80,
              origin: "auto_generated",
              originReference: JSON.stringify({ source: "market", key: m.key, label: m.label }),
            },
          });
          if (ceoId) {
            await db.orgRelation.create({
              data: {
                structureId,
                parentNodeId: ceoId,
                childNodeId: node.id,
                relationType: "reporta_directo",
              },
            });
          }
        }
      }

      // 4. Comités detectados de mitigantes
      const committees = extractCommittees(mitigants);
      const dirId = codeToNodeId.get("DIR");
      for (let i = 0; i < committees.length; i++) {
        const c = committees[i];
        const pos = defaultPositionForLevel(1, i + 1, committees.length + 2);
        const node = await db.orgNode.create({
          data: {
            structureId,
            code: `COM-${i + 1}`,
            name: c.name,
            nodeType: "comite",
            hierarchyLevel: 1,
            positionX: pos.x + 300,
            positionY: pos.y,
            origin: "auto_generated",
            originReference: JSON.stringify({
              source: "mitigant_committee",
              reference: c.source.reference,
              label: c.name,
            }),
          },
        });
        if (dirId) {
          await db.orgRelation.create({
            data: {
              structureId,
              parentNodeId: dirId,
              childNodeId: node.id,
              relationType: "transversal",
            },
          });
        }
      }

      // 5. Vincular OCPs a sus áreas correspondientes (auto)
      for (const ocp of ocps) {
        if (ocp.responsibleArea) {
          const nodeId = areaNodeMap.get(ocp.responsibleArea.id);
          if (nodeId) {
            await db.orgNodeOcp.upsert({
              where: { nodeId_ocpId: { nodeId, ocpId: ocp.id } },
              create: { nodeId, ocpId: ocp.id, raciRole: "R", origin: "auto_linked" },
              update: {},
            });
          }
        }
        for (const sup of ocp.supportAreas) {
          const nodeId = areaNodeMap.get(sup.area.id);
          if (nodeId) {
            await db.orgNodeOcp.upsert({
              where: { nodeId_ocpId: { nodeId, ocpId: ocp.id } },
              create: { nodeId, ocpId: ocp.id, raciRole: "S", origin: "auto_linked" },
              update: {},
            });
          }
        }
      }

      // 6. Pre-vincular políticas con áreas (heurística simple por nombre del responsable)
      const allNodes = await db.orgNode.findMany({ where: { structureId }, select: { id: true, name: true } });
      for (const p of policies) {
        if (!p.responsible) continue;
        const respLower = p.responsible.toLowerCase();
        const matchedNode = allNodes.find(
          (n) =>
            respLower.includes(n.name.toLowerCase()) ||
            n.name.toLowerCase().includes(respLower),
        );
        if (matchedNode) {
          await db.orgNodePolicy.upsert({
            where: { nodeId_politicaId: { nodeId: matchedNode.id, politicaId: p.id } },
            create: { nodeId: matchedNode.id, politicaId: p.id, applies: "completamente" },
            update: {},
          });
        }
      }

      const totalNodes = await db.orgNode.count({ where: { structureId } });
      return {
        structureId,
        created: totalNodes,
        message: `Estructura ${input.type} generada con ${totalNodes} nodos`,
      };
    }),

  // Crear nodo manual
  addNode: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        structureId: z.string(),
        code: z.string().min(1).max(20),
        name: z.string().min(1).max(140),
        nodeType: NodeTypeEnum,
        positionX: z.number().default(0),
        positionY: z.number().default(0),
        responsibleRole: z.string().optional(),
        ftesEstimated: z.number().optional(),
        parentNodeId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertStructureAccess(input.structureId, ctx.organizationId);
      const nodeTypeDef = NODE_TYPES.find((n) => n.key === input.nodeType)!;
      const node = await db.orgNode.create({
        data: {
          structureId: input.structureId,
          code: input.code,
          name: input.name,
          nodeType: input.nodeType,
          hierarchyLevel: nodeTypeDef.hierarchyLevel,
          positionX: input.positionX,
          positionY: input.positionY,
          responsibleRole: input.responsibleRole ?? null,
          ftesEstimated: input.ftesEstimated ?? null,
          origin: "manual",
        },
      });
      if (input.parentNodeId) {
        await db.orgRelation.create({
          data: {
            structureId: input.structureId,
            parentNodeId: input.parentNodeId,
            childNodeId: node.id,
            relationType: "reporta_directo",
          },
        });
      }
      return node;
    }),

  updateNode: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        code: z.string().min(1).max(20).optional(),
        name: z.string().min(1).max(140).optional(),
        nodeType: NodeTypeEnum.optional(),
        positionX: z.number().optional(),
        positionY: z.number().optional(),
        responsibleRole: z.string().nullable().optional(),
        ftesEstimated: z.number().nullable().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertNodeAccess(input.id, ctx.organizationId!);
      const { id, nodeType, ...data } = input;
      const updateData: Record<string, unknown> = { ...data };
      if (nodeType) {
        const ndef = NODE_TYPES.find((n) => n.key === nodeType)!;
        updateData.nodeType = nodeType;
        updateData.hierarchyLevel = ndef.hierarchyLevel;
      }
      return db.orgNode.update({ where: { id }, data: updateData });
    }),

  deleteNode: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertNodeAccess(input.id, ctx.organizationId!);
      return db.orgNode.delete({ where: { id: input.id } });
    }),

  // Bulk position update (después de drag-and-drop)
  updatePositions: protectedProcedure
    .input(
      z.object({
        structureId: z.string(),
        positions: z.array(
          z.object({ id: z.string(), x: z.number(), y: z.number() }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertStructureAccess(input.structureId, ctx.organizationId!);
      await db.$transaction(
        input.positions.map((p) =>
          db.orgNode.update({
            where: { id: p.id },
            data: { positionX: p.x, positionY: p.y },
          }),
        ),
      );
      return { count: input.positions.length };
    }),

  setRelations: protectedProcedure
    .input(
      z.object({
        structureId: z.string(),
        relations: z.array(
          z.object({
            parentNodeId: z.string(),
            childNodeId: z.string(),
            relationType: z
              .enum(["reporta_directo", "reporta_funcional", "coordinacion", "transversal"])
              .default("reporta_directo"),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertStructureAccess(input.structureId, ctx.organizationId!);
      await db.orgRelation.deleteMany({ where: { structureId: input.structureId } });
      if (input.relations.length > 0) {
        await db.orgRelation.createMany({
          data: input.relations.map((r) => ({
            structureId: input.structureId,
            ...r,
          })),
        });
      }
      return { count: input.relations.length };
    }),

  setNodeOcps: protectedProcedure
    .input(
      z.object({
        nodeId: z.string(),
        items: z.array(z.object({ ocpId: z.string(), raciRole: RaciEnum })),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertNodeAccess(input.nodeId, ctx.organizationId!);
      await db.orgNodeOcp.deleteMany({ where: { nodeId: input.nodeId } });
      if (input.items.length > 0) {
        await db.orgNodeOcp.createMany({
          data: input.items.map((it) => ({
            nodeId: input.nodeId,
            ocpId: it.ocpId,
            raciRole: it.raciRole,
            origin: "manual",
          })),
        });
      }
      return { count: input.items.length };
    }),

  setNodePolicies: protectedProcedure
    .input(
      z.object({
        nodeId: z.string(),
        items: z.array(
          z.object({
            politicaId: z.string(),
            applies: z.enum(["completamente", "parcialmente"]).default("completamente"),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertNodeAccess(input.nodeId, ctx.organizationId!);
      await db.orgNodePolicy.deleteMany({ where: { nodeId: input.nodeId } });
      if (input.items.length > 0) {
        await db.orgNodePolicy.createMany({
          data: input.items.map((it) => ({
            nodeId: input.nodeId,
            politicaId: it.politicaId,
            applies: it.applies,
          })),
        });
      }
      return { count: input.items.length };
    }),

  confirmStructure: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const structure = await db.orgStructure.findUnique({
        where: { cycleId: input.cycleId },
      });
      if (!structure) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (structure.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.orgStructure.update({
        where: { id: structure.id },
        data: { status: "confirmada" },
      });
    }),

  // Datos consolidados para exportar
  getExportData: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const [cycle, org, structure, ocps, policies] = await Promise.all([
        db.strategicCycle.findUniqueOrThrow({
          where: { id: input.cycleId },
          select: { name: true, yearStart: true, yearEnd: true, organizationId: true },
        }),
        db.organization.findFirstOrThrow({
          where: { cycles: { some: { id: input.cycleId } } },
          select: { name: true, sector: true, color: true },
        }),
        db.orgStructure.findUnique({
          where: { cycleId: input.cycleId },
          include: {
            nodes: {
              include: {
                ocpLinks: { include: { ocp: { select: { id: true, code: true, description: true } } } },
                policyLinks: { include: { politica: { select: { id: true, code: true, name: true } } } },
              },
            },
            relations: true,
          },
        }),
        db.ocp.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ year: "asc" }],
          select: { id: true, code: true, description: true, year: true },
        }),
        db.politica.findMany({
          where: { cycleId: input.cycleId, status: { not: "descartada" } },
          select: { id: true, code: true, name: true, category: true, mandatory: true },
        }),
      ]);
      return { cycle, organization: org, structure, ocps, policies };
    }),
});
