import * as XLSX from "xlsx";
import { getAlertTypeDef, PRIORITY_COLORS } from "./alerts-catalog";

export interface ExportAlert {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  objectType: string;
  generatedAt: Date;
  resolvedAt: Date | null;
  resolutionReason: string | null;
  assignee: { name: string } | null;
  rule: { name: string } | null;
}

export interface AlertsExportContext {
  cycle: { name: string; yearStart: number; yearEnd: number };
  organization: { name: string; sector: string | null; color: string };
  alerts: ExportAlert[];
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function exportAlertsExcel(ctx: AlertsExportContext) {
  const wb = XLSX.utils.book_new();

  // Resumen
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const a of ctx.alerts) {
    byType[a.type] = (byType[a.type] ?? 0) + 1;
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
  }
  const summaryRows: Record<string, string | number>[] = [
    { Métrica: "Total alertas", Valor: ctx.alerts.length },
    { Métrica: "Activas", Valor: byStatus["activa"] ?? 0 },
    { Métrica: "En seguimiento", Valor: byStatus["en_seguimiento"] ?? 0 },
    { Métrica: "Resueltas", Valor: byStatus["resuelta"] ?? 0 },
    { Métrica: "Ignoradas", Valor: byStatus["ignorada"] ?? 0 },
    { Métrica: "Reactivadas", Valor: byStatus["reactivada"] ?? 0 },
    { Métrica: "—", Valor: "—" },
  ];
  for (const [type, count] of Object.entries(byType)) {
    summaryRows.push({
      Métrica: getAlertTypeDef(type)?.label ?? type,
      Valor: count,
    });
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Resumen");

  // Detallado
  const detailRows = ctx.alerts.map((a) => {
    const days = a.resolvedAt
      ? Math.round(
          (a.resolvedAt.getTime() - a.generatedAt.getTime()) / (1000 * 60 * 60 * 24),
        )
      : null;
    return {
      Tipo: getAlertTypeDef(a.type)?.label ?? a.type,
      Título: a.title,
      Descripción: a.description,
      Prioridad: PRIORITY_COLORS[a.priority as keyof typeof PRIORITY_COLORS]?.label ?? a.priority,
      Estado: a.status,
      "Objeto afectado": `${a.objectType}`,
      Generada: a.generatedAt.toLocaleString("es-PE"),
      Resuelta: a.resolvedAt ? a.resolvedAt.toLocaleString("es-PE") : "",
      "Días resolución": days ?? "",
      "Razón resolución": a.resolutionReason ?? "",
      Asignada: a.assignee?.name ?? "",
      Regla: a.rule?.name ?? "",
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), "Alertas detalladas");

  // Análisis por tipo
  const analysisRows = Object.entries(byType).map(([type, count]) => {
    const ofType = ctx.alerts.filter((a) => a.type === type);
    const resolved = ofType.filter((a) => a.status === "resuelta");
    const avg =
      resolved.length > 0
        ? resolved.reduce((s, a) => {
            if (!a.resolvedAt) return s;
            return (
              s +
              (a.resolvedAt.getTime() - a.generatedAt.getTime()) / (1000 * 60 * 60 * 24)
            );
          }, 0) / resolved.length
        : null;
    return {
      Tipo: getAlertTypeDef(type)?.label ?? type,
      Total: count,
      Resueltas: resolved.length,
      Activas: ofType.filter((a) => a.status === "activa").length,
      "Días promedio resolución": avg != null ? Math.round(avg * 10) / 10 : "",
    };
  });
  if (analysisRows.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(analysisRows),
      "Análisis por tipo",
    );
  }

  XLSX.writeFile(wb, `alertas-${ctx.cycle.name.replace(/\s+/g, "-")}.xlsx`);
}
