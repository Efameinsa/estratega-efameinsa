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
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cycle = await db.strategicCycle.findUnique({
    where: { id: cycleId },
    select: { id: true, organizationId: true, name: true, yearStart: true, yearEnd: true },
  });
  if (!cycle || cycle.organizationId !== auth.organizationId) {
    return NextResponse.json({ error: "ciclo_no_encontrado" }, { status: 404 });
  }

  const ocps = await db.ocp.findMany({
    where: { cycleId },
    orderBy: [{ year: "asc" }],
    select: {
      id: true,
      code: true,
      description: true,
      year: true,
      metaValue: true,
      metaText: true,
      unit: true,
      olp: { select: { id: true, description: true } },
      responsibleArea: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    cycle: {
      id: cycle.id,
      name: cycle.name,
      year_start: cycle.yearStart,
      year_end: cycle.yearEnd,
    },
    ocps: ocps.map((o) => ({
      id: o.id,
      codigo: o.code,
      descripcion: o.description,
      año: o.year,
      meta_valor: o.metaValue,
      meta_texto: o.metaText,
      unidad: o.unit,
      olp: o.olp,
      area_responsable: o.responsibleArea,
    })),
  });
}
