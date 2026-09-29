import { db } from "@/server/db";
import {
  AGENDA_TEMPLATES,
  type ReviewType,
  type AgendaTemplateItem,
} from "./review-catalog";

// ───────────────────────────────────────────────────────────────────────
// Auto-generación de agenda al crear una revisión
// ───────────────────────────────────────────────────────────────────────

interface AgendaContext {
  reviewId: string;
  cycleId: string;
  type: ReviewType;
  period: string;
}

async function insertItem(
  ctx: AgendaContext,
  parent: string | null,
  order: number,
  template: AgendaTemplateItem,
  origin: "plantilla" | "auto_generado" | "manual",
  contextData?: Record<string, unknown>,
): Promise<string> {
  const created = await db.reviewAgendaItem.create({
    data: {
      reviewId: ctx.reviewId,
      parentItemId: parent,
      order,
      title: template.title,
      description: template.description ?? null,
      assignedMinutes: template.assignedMinutes,
      origin,
      itemType: template.itemType,
      contextData: contextData ? JSON.stringify(contextData) : "{}",
    },
  });
  if (template.children) {
    for (let i = 0; i < template.children.length; i++) {
      await insertItem(ctx, created.id, i, template.children[i], origin);
    }
  }
  return created.id;
}

export async function autoGenerateAgenda(
  reviewId: string,
): Promise<{ generated: number; bscSnapshot: object | null }> {
  const review = await db.review.findUniqueOrThrow({
    where: { id: reviewId },
    select: { id: true, cycleId: true, type: true, period: true },
  });
  const type = review.type as ReviewType;
  const ctx: AgendaContext = {
    reviewId,
    cycleId: review.cycleId,
    type,
    period: review.period,
  };

  // Limpiar agenda existente (si re-generamos)
  await db.reviewAgendaItem.deleteMany({ where: { reviewId } });

  if (type === "extraordinaria") {
    // Plantilla mínima para extraordinaria
    await insertItem(
      ctx,
      null,
      0,
      { title: "Apertura y motivo de la convocatoria", assignedMinutes: 10, itemType: "bienvenida" },
      "plantilla",
    );
    await insertItem(
      ctx,
      null,
      1,
      { title: "Discusión del tema central", assignedMinutes: 60, itemType: "otros" },
      "plantilla",
    );
    await insertItem(
      ctx,
      null,
      2,
      { title: "Decisiones tomadas", assignedMinutes: 20, itemType: "decision" },
      "plantilla",
    );
    await insertItem(
      ctx,
      null,
      3,
      { title: "Acciones correctivas", assignedMinutes: 10, itemType: "accion" },
      "plantilla",
    );
    return { generated: 4, bscSnapshot: null };
  }

  const template = AGENDA_TEMPLATES[type];
  let order = 0;
  let generated = 0;
  for (const item of template) {
    await insertItem(ctx, null, order++, item, "plantilla");
    generated++;
  }

  // Cargar contexto dinámico según tipo
  const bscSnapshot = await buildBscSnapshot(review.cycleId);
  if (type === "trimestral" || type === "anual" || type === "semestral") {
    // Asociar snapshot al item snapshot_bsc o al primer item de bscData
    const snapshotItem = await db.reviewAgendaItem.findFirst({
      where: { reviewId, itemType: "snapshot_bsc" },
    });
    if (snapshotItem) {
      await db.reviewAgendaItem.update({
        where: { id: snapshotItem.id },
        data: { contextData: JSON.stringify({ snapshot: bscSnapshot }) },
      });
    }
  }

  // Para trimestral: cargar alertas activas críticas/importantes
  if (type === "trimestral" || type === "semestral") {
    const criticalAlerts = await db.alert.findMany({
      where: {
        cycleId: review.cycleId,
        status: { in: ["activa", "en_seguimiento", "reactivada"] },
        priority: { in: ["alta", "media"] },
      },
      select: { id: true, title: true, type: true, priority: true, generatedAt: true },
      take: 30,
    });
    const alertItem = await db.reviewAgendaItem.findFirst({
      where: { reviewId, itemType: "alertas" },
    });
    if (alertItem) {
      await db.reviewAgendaItem.update({
        where: { id: alertItem.id },
        data: {
          contextData: JSON.stringify({ alerts: criticalAlerts }),
          description: `${criticalAlerts.length} alertas activas a revisar`,
        },
      });
    }
  }

  // Acciones pendientes de revisiones anteriores del mismo tipo
  const previousActions = await db.reviewCorrectiveAction.findMany({
    where: {
      review: { cycleId: review.cycleId, type, status: "completada" },
      status: { in: ["pendiente", "en_curso"] },
    },
    select: {
      id: true,
      description: true,
      status: true,
      dueDate: true,
      responsibleName: true,
      review: { select: { title: true, period: true } },
    },
    take: 30,
  });
  if (previousActions.length > 0) {
    const accionItems = await db.reviewAgendaItem.findMany({
      where: { reviewId, itemType: "accion" },
    });
    if (accionItems.length > 0) {
      await db.reviewAgendaItem.update({
        where: { id: accionItems[0].id },
        data: {
          contextData: JSON.stringify({ pendingActions: previousActions }),
          description: `${previousActions.length} acciones pendientes de revisiones anteriores`,
        },
      });
    }
  }

  // Para semestral/anual: cargar estrategias retenidas con cumplimiento aproximado
  if (type === "semestral" || type === "anual") {
    const strategies = await db.strategy.findMany({
      where: {
        cycleId: review.cycleId,
        status: "retenida",
      },
      select: { id: true, code: true, description: true },
    });
    const consolidated = await db.consolidatedStrategy.findMany({
      where: { cycleId: review.cycleId, status: "retenida" },
      select: { id: true, code: true, text: true },
    });
    const allStrats = [
      ...strategies.map((s) => ({ id: s.id, code: s.code, text: s.description, source: "strategy" })),
      ...consolidated.map((c) => ({ id: c.id, code: c.code, text: c.text, source: "consolidated" })),
    ];
    const stratItem = await db.reviewAgendaItem.findFirst({
      where: { reviewId, itemType: "estrategia" },
    });
    if (stratItem && allStrats.length > 0) {
      await db.reviewAgendaItem.update({
        where: { id: stratItem.id },
        data: {
          contextData: JSON.stringify({ strategies: allStrats }),
          description: `${allStrats.length} estrategias retenidas a evaluar`,
        },
      });
    }
  }

  // Guardar snapshot completo en el Review para histórico
  await db.review.update({
    where: { id: reviewId },
    data: { bscSnapshot: JSON.stringify(bscSnapshot) },
  });

  return { generated, bscSnapshot };
}

// ───────────────────────────────────────────────────────────────────────
// Snapshot del Tablero BSC al momento de la revisión
// ───────────────────────────────────────────────────────────────────────

async function buildBscSnapshot(cycleId: string): Promise<object> {
  const kpis = await db.kpi.findMany({
    where: {
      cycleId,
      status: { in: ["aceptado", "en_edicion", "confirmado"] },
    },
    select: {
      id: true,
      code: true,
      name: true,
      dimensionBsc: true,
      unit: true,
      direction: true,
      periods: {
        orderBy: { period: "asc" },
        select: {
          period: true,
          realValue: true,
          metaGreen: true,
          semaforoActual: true,
          percentCompletion: true,
        },
      },
    },
  });

  const summary = {
    total: kpis.length,
    verde: 0,
    ambar: 0,
    rojo: 0,
    sin_dato: 0,
    byDimension: {} as Record<string, { count: number; verde: number; ambar: number; rojo: number }>,
  };

  const detailed: object[] = [];

  for (const k of kpis) {
    const latestWithData = [...k.periods]
      .filter((p) => p.realValue != null)
      .sort((a, b) => b.period.localeCompare(a.period))[0];
    const semaforo = (latestWithData?.semaforoActual as
      | "verde"
      | "ambar"
      | "rojo"
      | "sin_dato"
      | undefined) ?? "sin_dato";

    if (semaforo === "verde") summary.verde++;
    else if (semaforo === "ambar") summary.ambar++;
    else if (semaforo === "rojo") summary.rojo++;
    else summary.sin_dato++;

    if (!summary.byDimension[k.dimensionBsc]) {
      summary.byDimension[k.dimensionBsc] = { count: 0, verde: 0, ambar: 0, rojo: 0 };
    }
    summary.byDimension[k.dimensionBsc].count++;
    if (semaforo === "verde") summary.byDimension[k.dimensionBsc].verde++;
    else if (semaforo === "ambar") summary.byDimension[k.dimensionBsc].ambar++;
    else if (semaforo === "rojo") summary.byDimension[k.dimensionBsc].rojo++;

    detailed.push({
      id: k.id,
      code: k.code,
      name: k.name,
      dimensionBsc: k.dimensionBsc,
      unit: k.unit,
      latestPeriod: latestWithData?.period ?? null,
      currentValue: latestWithData?.realValue ?? null,
      metaGreen: latestWithData?.metaGreen ?? null,
      semaforo,
      percentCompletion: latestWithData?.percentCompletion ?? null,
    });
  }

  return { summary, kpis: detailed, capturedAt: new Date().toISOString() };
}

// ───────────────────────────────────────────────────────────────────────
// Generar todas las revisiones del año según configuración
// ───────────────────────────────────────────────────────────────────────

import { defaultTitle, periodLabel, type ReviewType as RT } from "./review-catalog";

export async function generateYearCalendar(
  cycleId: string,
  organizationId: string,
  year: number,
): Promise<{ created: number }> {
  const configs = await db.reviewCalendarConfig.findMany({
    where: { cycleId, active: true },
  });
  if (configs.length === 0) return { created: 0 };

  let created = 0;
  for (const cfg of configs) {
    const type = cfg.type as RT;
    const dates = computeDatesForYear(type, year, cfg.dayOfPeriod ?? 15);

    for (const date of dates) {
      // Evitar duplicados: mismo cycle + type + period
      const period = periodLabel(type, date);
      const existing = await db.review.findFirst({
        where: { cycleId, type, period },
      });
      if (existing) continue;

      const [hour, minute] = (cfg.defaultHour ?? "10:00").split(":").map(Number);
      const scheduledAt = new Date(date);
      scheduledAt.setHours(hour, minute, 0, 0);

      await db.review.create({
        data: {
          organizationId,
          cycleId,
          type,
          title: defaultTitle(type, date),
          period,
          scheduledAt,
          location: "Por definir",
          status: "programada",
          presidentId: cfg.defaultPresidentId,
          secretaryId: cfg.defaultSecretaryId,
        },
      });
      created++;
    }
  }
  return { created };
}

function computeDatesForYear(type: RT, year: number, dayOfPeriod: number): Date[] {
  const dates: Date[] = [];
  if (type === "mensual") {
    for (let m = 0; m < 12; m++) {
      dates.push(new Date(year, m, dayOfPeriod));
    }
  } else if (type === "trimestral") {
    // Al cierre de cada trimestre: marzo, junio, septiembre, diciembre
    [2, 5, 8, 11].forEach((m) => dates.push(new Date(year, m, dayOfPeriod)));
  } else if (type === "semestral") {
    [5, 11].forEach((m) => dates.push(new Date(year, m, dayOfPeriod)));
  } else if (type === "anual") {
    dates.push(new Date(year, 11, dayOfPeriod));
  }
  return dates;
}
