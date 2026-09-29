import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { verifyWorkspaceToken } from "@/lib/workspace-token-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cycleId: string }> },
) {
  const { cycleId } = await params;
  const auth = await verifyWorkspaceToken(request.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 },
    );
  }

  const cycle = await db.strategicCycle.findUnique({
    where: { id: cycleId },
    select: { id: true, organizationId: true, name: true },
  });
  if (!cycle || cycle.organizationId !== auth.organizationId) {
    return NextResponse.json({ error: "ciclo_no_encontrado" }, { status: 404 });
  }

  const kpis = await db.kpi.findMany({
    where: {
      cycleId,
      source: "educanet",
      status: { not: "descartado" },
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      dimensionBsc: true,
      unit: true,
      frequency: true,
      direction: true,
      educanetLinkId: true,
      educanetSendMode: true,
      educanetProjectId: true,
      olps: { select: { olp: { select: { id: true, description: true } } } },
      ocps: { select: { ocp: { select: { id: true, code: true, year: true } } } },
    },
    orderBy: [{ dimensionBsc: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json({
    cycle: { id: cycle.id, name: cycle.name },
    indicadores: kpis.map((k) => ({
      id: k.educanetLinkId,
      kpi_id_interno: k.id,
      codigo: k.code,
      nombre: k.name,
      descripcion: k.description,
      dimension_bsc: k.dimensionBsc,
      unidad: k.unit,
      frecuencia: k.frequency,
      sentido: k.direction,
      modo_envio: k.educanetSendMode,
      proyecto_vinculado: k.educanetProjectId,
      olps_vinculados: k.olps.map((o) => o.olp),
      ocps_vinculados: k.ocps.map((o) => o.ocp),
    })),
  });
}
