import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { verifyWorkspaceToken } from "@/lib/workspace-token-auth";
import {
  computeSemaforo,
  computePercentCompletion,
  computeThresholds,
  isValidPeriodForFrequency,
} from "@/lib/kpi-suggestions";
import { evaluateForKpi } from "@/lib/alerts-engine";

const BodySchema = z.object({
  valor: z.number(),
  periodo: z.string().min(1),
  fecha_dato: z.string().optional(),
  fuente: z.enum(["educanet", "manual"]).default("educanet"),
  proyecto_origen: z.string().optional(),
  metadatos: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: kpiId } = await params;

  // 1. Auth
  const auth = await verifyWorkspaceToken(request.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json(
      { error: "unauthorized", mensaje: "Token de workspace inválido o ausente" },
      { status: 401 },
    );
  }
  if (auth.permissions === "read") {
    return NextResponse.json(
      { error: "forbidden", mensaje: "Este token no tiene permisos de escritura" },
      { status: 403 },
    );
  }

  // 2. Idempotency key (obligatorio para escritura)
  const idempotencyKey = request.headers.get("x-idempotency-key");
  if (!idempotencyKey) {
    return NextResponse.json(
      {
        error: "missing_idempotency_key",
        mensaje: "Header X-Idempotency-Key es obligatorio",
      },
      { status: 400 },
    );
  }

  // 3. Body
  let parsed;
  try {
    const body = await request.json();
    parsed = BodySchema.parse(body);
  } catch (err) {
    return NextResponse.json(
      {
        error: "invalid_body",
        mensaje: "Cuerpo de la solicitud inválido",
        detalle: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }

  // 4. Buscar KPI por educanetLinkId (el "id" en la URL es el est_kpi_xxx)
  const kpi = await db.kpi.findUnique({
    where: { educanetLinkId: kpiId },
    select: {
      id: true,
      organizationId: true,
      frequency: true,
      direction: true,
      status: true,
    },
  });
  if (!kpi) {
    return NextResponse.json(
      {
        error: "indicador_no_encontrado",
        mensaje: `El ID ${kpiId} no existe o fue eliminado`,
      },
      { status: 404 },
    );
  }
  if (kpi.organizationId !== auth.organizationId) {
    return NextResponse.json(
      { error: "forbidden", mensaje: "El indicador no pertenece a este workspace" },
      { status: 403 },
    );
  }
  if (kpi.status === "descartado") {
    return NextResponse.json(
      { error: "indicador_descartado", mensaje: "El indicador fue descartado" },
      { status: 410 },
    );
  }

  // 5. Validar periodo según frecuencia
  if (
    !isValidPeriodForFrequency(
      parsed.periodo,
      kpi.frequency as "mensual" | "trimestral" | "semestral" | "anual",
    )
  ) {
    return NextResponse.json(
      {
        error: "periodo_invalido",
        mensaje: `El período "${parsed.periodo}" no coincide con la frecuencia ${kpi.frequency}`,
      },
      { status: 400 },
    );
  }

  // 6. Idempotencia
  const existingEvent = await db.kpiValueHistory.findUnique({
    where: { idempotencyKey },
    select: { kpiId: true, period: true, value: true },
  });
  if (existingEvent) {
    return NextResponse.json(
      {
        id_kpi: kpiId,
        valor_recibido: existingEvent.value,
        periodo: existingEvent.period,
        idempotente: true,
        mensaje: "Evento ya procesado anteriormente",
      },
      { status: 200 },
    );
  }

  // 7. Guardar histórico + actualizar período
  const direction = kpi.direction as
    | "mayor_mejor"
    | "menor_mejor"
    | "objetivo_puntual";

  await db.kpiValueHistory.create({
    data: {
      kpiId: kpi.id,
      period: parsed.periodo,
      value: parsed.valor,
      receivedAt: parsed.fecha_dato ? new Date(parsed.fecha_dato) : new Date(),
      source: parsed.fuente,
      educanetProjectSource: parsed.proyecto_origen ?? null,
      idempotencyKey,
      metadata: parsed.metadatos ? JSON.stringify(parsed.metadatos) : null,
    },
  });

  // Upsert KpiPeriod con cálculo de semáforo y porcentaje
  const existingPeriod = await db.kpiPeriod.findUnique({
    where: { kpiId_period: { kpiId: kpi.id, period: parsed.periodo } },
  });

  let semaforo: "verde" | "ambar" | "rojo" | "sin_dato" = "sin_dato";
  let percent: number | null = null;

  if (existingPeriod?.metaGreen != null) {
    const thresholds = {
      green: existingPeriod.metaGreen,
      amber: existingPeriod.metaAmber ?? existingPeriod.metaGreen * 0.85,
      red: existingPeriod.metaRed ?? existingPeriod.metaGreen * 0.7,
    };
    semaforo = computeSemaforo(parsed.valor, thresholds, direction);
    percent = computePercentCompletion(parsed.valor, existingPeriod.metaGreen, direction);
  }

  const periodRecord = existingPeriod
    ? await db.kpiPeriod.update({
        where: { kpiId_period: { kpiId: kpi.id, period: parsed.periodo } },
        data: {
          realValue: parsed.valor,
          semaforoActual: semaforo,
          percentCompletion: percent,
          dataReceivedAt: new Date(),
          periodDataSource: parsed.fuente,
        },
      })
    : await db.kpiPeriod.create({
        data: {
          kpiId: kpi.id,
          period: parsed.periodo,
          realValue: parsed.valor,
          semaforoActual: semaforo,
          percentCompletion: percent,
          dataReceivedAt: new Date(),
          periodDataSource: parsed.fuente,
        },
      });

  // Actualizar timestamp de última recepción en KPI
  await db.kpi.update({
    where: { id: kpi.id },
    data: {
      educanetLastReceivedAt: parsed.fuente === "educanet" ? new Date() : undefined,
      educanetProjectId: parsed.proyecto_origen ?? undefined,
    },
  });

  // Disparar evaluación de alertas para este KPI (no bloquea la respuesta)
  evaluateForKpi(kpi.id, parsed.periodo).catch((err) => {
    console.error("[alerts-engine] evaluation failed:", err);
  });

  return NextResponse.json(
    {
      id_kpi: kpiId,
      valor_recibido: parsed.valor,
      periodo: parsed.periodo,
      nuevo_estado_semaforo: semaforo,
      porcentaje_cumplimiento: percent,
      actualizado_en: periodRecord.updatedAt,
    },
    { status: 200 },
  );
}
