import { createHmac } from "node:crypto";

/**
 * Cliente para enviar proyectos aprobados a Educanet.
 * Configurable via env:
 *   - EDUCANET_WEBHOOK_URL  (ej: https://educanet-ten.vercel.app)
 *   - EDUCANET_WEBHOOK_SECRET
 */

export type EducanetCategoria =
  | "WEBINAR"
  | "CAMPANA_MARKETING"
  | "LANZAMIENTO_CURSO"
  | "EVENTO_PRESENCIAL";

export type EducanetNegocio =
  | "ANSYS"
  | "AUTODESK_MFG"
  | "AUTODESK_AEC"
  | "ORACLE"
  | "INGE3D"
  | "LYRACODE"
  | "CURSOS";

export type EducanetSyncIssue = {
  externalId: string;
  title: string;
  description?: string | null;
  ownerEmail?: string | null;
  dueDate?: string | null; // ISO
  estimateMinutes?: number | null;
  isMilestone?: boolean;
};

export type EducanetSyncPayload = {
  sourceApp: "estratega";
  sourceProjectId: string;
  nombre: string;
  descripcion?: string | null;
  categoria: EducanetCategoria;
  fechaHito: string; // ISO
  negocio?: EducanetNegocio | null;
  ownerEmail: string;
  issues: EducanetSyncIssue[];
};

export type EducanetSyncResult =
  | {
      ok: true;
      duplicate?: boolean;
      workflowInstanciaId: string;
      url: string;
      tareasCreadas?: number;
    }
  | { ok: false; status: number; error: string };

export async function enviarProyectoAEducanet(
  payload: EducanetSyncPayload,
  orgSlug: string,
): Promise<EducanetSyncResult> {
  const baseUrl = process.env.EDUCANET_WEBHOOK_URL;
  const secret = process.env.EDUCANET_WEBHOOK_SECRET;

  if (!baseUrl || !secret) {
    return {
      ok: false,
      status: 500,
      error: "Falta configurar EDUCANET_WEBHOOK_URL o EDUCANET_WEBHOOK_SECRET",
    };
  }

  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  const res = await fetch(`${baseUrl}/api/sync/from-estratega`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Org-Slug": orgSlug,
      "X-Estratega-Signature": `sha256=${signature}`,
    },
    body,
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, status: res.status, error: text || "Respuesta no JSON" };
  }

  if (!res.ok) {
    const errMsg =
      (json as { error?: string })?.error ?? `HTTP ${res.status}`;
    return { ok: false, status: res.status, error: errMsg };
  }

  const data = json as {
    workflowInstanciaId: string;
    url: string;
    duplicate?: boolean;
    tareasCreadas?: number;
  };
  return {
    ok: true,
    duplicate: data.duplicate,
    workflowInstanciaId: data.workflowInstanciaId,
    url: data.url,
    tareasCreadas: data.tareasCreadas,
  };
}
