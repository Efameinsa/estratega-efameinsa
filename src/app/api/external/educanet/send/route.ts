import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { auth } from "@/server/auth";
import {
  enviarProyectoAEducanet,
  type EducanetCategoria,
  type EducanetNegocio,
} from "@/lib/educanet-sync";

export const runtime = "nodejs";

const CATEGORIAS_VALIDAS: EducanetCategoria[] = [
  "WEBINAR",
  "CAMPANA_MARKETING",
  "LANZAMIENTO_CURSO",
  "EVENTO_PRESENCIAL",
];

const NEGOCIOS_VALIDOS: EducanetNegocio[] = [
  "ANSYS",
  "AUTODESK_MFG",
  "AUTODESK_AEC",
  "ORACLE",
  "INGE3D",
  "LYRACODE",
  "CURSOS",
];

/**
 * POST /api/external/educanet/send
 * Body: { projectId, categoria, orgSlug, negocio? }
 * Toma un Project de Estratega y lo envía a Educanet vía webhook firmado.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    projectId?: string;
    categoria?: string;
    orgSlug?: string;
    negocio?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.projectId || !body.categoria || !body.orgSlug) {
    return NextResponse.json(
      { error: "projectId, categoria y orgSlug son obligatorios" },
      { status: 400 },
    );
  }
  if (!CATEGORIAS_VALIDAS.includes(body.categoria as EducanetCategoria)) {
    return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
  }
  if (body.negocio && !NEGOCIOS_VALIDOS.includes(body.negocio as EducanetNegocio)) {
    return NextResponse.json({ error: "Negocio inválido" }, { status: 400 });
  }

  const project = await db.project.findUnique({
    where: { id: body.projectId },
    include: {
      issues: {
        select: {
          id: true,
          summary: true,
          description: true,
          dueDate: true,
          estimateHours: true,
          assigneeId: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  const assigneeIds = Array.from(
    new Set(project.issues.map((i) => i.assigneeId).filter((id): id is string => !!id)),
  );
  const assignees = assigneeIds.length
    ? await db.user.findMany({
        where: { id: { in: assigneeIds } },
        select: { id: true, email: true },
      })
    : [];
  const emailById = new Map(assignees.map((u) => [u.id, u.email]));

  const membership = await db.organizationMember.findUnique({
    where: {
      userId_organizationId: { userId, organizationId: project.orgId },
    },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "No perteneces a la organización del proyecto" },
      { status: 403 },
    );
  }

  const owner = project.ownerId
    ? await db.user.findUnique({
        where: { id: project.ownerId },
        select: { email: true },
      })
    : null;
  if (!owner?.email) {
    return NextResponse.json(
      { error: "El proyecto no tiene owner con email" },
      { status: 422 },
    );
  }

  const fechaHito = project.endDate ?? project.startDate ?? new Date();

  const result = await enviarProyectoAEducanet(
    {
      sourceApp: "estratega",
      sourceProjectId: project.id,
      nombre: project.name,
      descripcion: project.description ?? null,
      categoria: body.categoria as EducanetCategoria,
      fechaHito: fechaHito.toISOString(),
      negocio: (body.negocio as EducanetNegocio | undefined) ?? null,
      ownerEmail: owner.email,
      issues: project.issues.map((i) => ({
        externalId: i.id,
        title: i.summary,
        description: i.description ?? null,
        ownerEmail: (i.assigneeId && emailById.get(i.assigneeId)) ?? null,
        dueDate: i.dueDate ? i.dueDate.toISOString() : null,
        estimateMinutes: i.estimateHours ? Math.round(i.estimateHours * 60) : null,
        isMilestone: false,
      })),
    },
    body.orgSlug,
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, status: result.status },
      { status: result.status >= 400 ? result.status : 500 },
    );
  }

  await db.project.update({
    where: { id: project.id },
    data: {
      educanetCategoria: body.categoria,
      educanetWorkflowInstanciaId: result.workflowInstanciaId,
      educanetSyncedAt: new Date(),
      educanetOrgSlug: body.orgSlug,
    },
  });

  return NextResponse.json({
    success: true,
    duplicate: result.duplicate ?? false,
    workflowInstanciaId: result.workflowInstanciaId,
    educanetUrl: (process.env.EDUCANET_WEBHOOK_URL ?? "") + result.url,
    tareasCreadas: result.tareasCreadas ?? 0,
  });
}
