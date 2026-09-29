import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { toPng } from "html-to-image";
import { BSC_DIMENSIONS, getDimensionDef } from "./kpi-suggestions";
import {
  SEMAFORO_COLORS,
  formatKpiValue,
  type KpiSnapshot,
} from "./bsc-dashboard";

export interface DashboardExportContext {
  cycle: { name: string; yearStart: number; yearEnd: number };
  organization: { name: string; sector: string | null; color: string };
  snapshots: KpiSnapshot[];
  globalPct: number;
  counts: { verde: number; ambar: number; rojo: number; sin_dato: number };
  rawKpis: {
    id: string;
    code: string;
    name: string;
    dimensionBsc: string;
    periods: {
      period: string;
      metaGreen: number | null;
      realValue: number | null;
      semaforoActual: string | null;
    }[];
    comments: { user: { name: string; role: string | null }; text: string; createdAt: Date }[];
  }[];
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ───────────────────────────────────────────────────────────────────────
// Excel: resumen + por dimensión + histórico + comentarios
// ───────────────────────────────────────────────────────────────────────

export function exportDashboardExcel(ctx: DashboardExportContext) {
  const wb = XLSX.utils.book_new();

  const summaryRows = ctx.snapshots.map((k) => ({
    Código: k.code,
    Nombre: k.name,
    Dimensión: getDimensionDef(k.dimensionBsc)?.label ?? k.dimensionBsc,
    Fuente: k.source,
    "Valor actual": k.currentValue ?? "",
    Meta: k.metaGreen ?? "",
    Cumplimiento: k.percentCompletion != null ? `${k.percentCompletion}%` : "",
    Semáforo: SEMAFORO_COLORS[k.semaforo].label,
    "Tendencia": k.trendDirection ?? "—",
    Responsable: k.responsibleAreaName ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Resumen");

  for (const dim of BSC_DIMENSIONS) {
    const items = ctx.snapshots.filter((k) => k.dimensionBsc === dim.key);
    if (items.length === 0) continue;
    const rows = items.map((k) => ({
      Código: k.code,
      Nombre: k.name,
      "Valor actual": k.currentValue ?? "",
      Meta: k.metaGreen ?? "",
      Semáforo: SEMAFORO_COLORS[k.semaforo].label,
      Fuente: k.source,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), dim.shortLabel);
  }

  // Hoja Histórico
  const historicoRows: Record<string, string | number>[] = [];
  for (const k of ctx.rawKpis) {
    for (const p of k.periods) {
      historicoRows.push({
        Código: k.code,
        Nombre: k.name,
        Período: p.period,
        Meta: p.metaGreen ?? "",
        "Valor real": p.realValue ?? "",
        Semáforo: p.semaforoActual ?? "",
      });
    }
  }
  if (historicoRows.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historicoRows), "Histórico");
  }

  // Hoja Comentarios
  const commentRows: Record<string, string>[] = [];
  for (const k of ctx.rawKpis) {
    for (const c of k.comments) {
      commentRows.push({
        Código: k.code,
        Indicador: k.name,
        Autor: c.user.name,
        Cargo: c.user.role ?? "",
        Fecha: new Date(c.createdAt).toLocaleString("es-PE"),
        Comentario: c.text,
      });
    }
  }
  if (commentRows.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(commentRows), "Comentarios");
  }

  XLSX.writeFile(wb, `tablero-bsc-${ctx.cycle.name.replace(/\s+/g, "-")}.xlsx`);
}

// ───────────────────────────────────────────────────────────────────────
// PNG del modo actual (snapshot del DOM)
// ───────────────────────────────────────────────────────────────────────

export async function exportDashboardPng(element: HTMLElement, name: string) {
  const dataUrl = await toPng(element, {
    backgroundColor: "rgba(167, 139, 250, 0.08)",
    pixelRatio: 2,
  });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  downloadBlob(blob, `${name}.png`);
}

// ───────────────────────────────────────────────────────────────────────
// PDF ejecutivo
// ───────────────────────────────────────────────────────────────────────

export function exportDashboardPdf(ctx: DashboardExportContext) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  let y = margin;

  function ensure(n: number) {
    if (y + n > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }
  function p(
    text: string,
    opts: {
      size?: number;
      bold?: boolean;
      color?: [number, number, number];
      spacing?: number;
    } = {},
  ) {
    const size = opts.size ?? 11;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    const c = opts.color ?? [40, 40, 50];
    doc.setTextColor(c[0], c[1], c[2]);
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    ensure(lines.length * (size + 4));
    doc.text(lines, margin, y);
    y += lines.length * (size + 4) + (opts.spacing ?? 4);
  }
  function divider() {
    ensure(14);
    doc.setDrawColor(220, 220, 230);
    doc.line(margin, y, pageW - margin, y);
    y += 12;
  }

  // Portada
  doc.setFillColor(24, 95, 165);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text("Tablero BSC", margin, 200);
  doc.text("Ejecutivo", margin, 240);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(15);
  doc.text(ctx.organization.name, margin, 280);
  doc.setFontSize(11);
  doc.setTextColor(220, 230, 245);
  doc.text(`Ciclo: ${ctx.cycle.name} · ${ctx.cycle.yearStart}–${ctx.cycle.yearEnd}`, margin, 310);
  doc.text(`Cumplimiento global: ${ctx.globalPct}%`, margin, 330);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-PE")}`, margin, 350);

  // Página 1: Resumen ejecutivo
  doc.addPage();
  y = margin;
  p("Resumen ejecutivo", { size: 22, bold: true, spacing: 12 });
  divider();
  p(`Cumplimiento global: ${ctx.globalPct}%`, { size: 14, bold: true, spacing: 8 });
  p(`KPIs en meta (verde): ${ctx.counts.verde}`, {
    size: 11,
    color: [22, 163, 74],
    spacing: 2,
  });
  p(`KPIs en alerta (ámbar): ${ctx.counts.ambar}`, {
    size: 11,
    color: [217, 119, 6],
    spacing: 2,
  });
  p(`KPIs críticos (rojo): ${ctx.counts.rojo}`, {
    size: 11,
    color: [220, 38, 38],
    spacing: 2,
  });
  p(`Sin dato: ${ctx.counts.sin_dato}`, { size: 11, color: [120, 120, 130], spacing: 12 });

  // Por dimensión
  for (const dim of BSC_DIMENSIONS) {
    const items = ctx.snapshots.filter((k) => k.dimensionBsc === dim.key);
    if (items.length === 0) continue;
    ensure(50);
    p(dim.label, { size: 14, bold: true, spacing: 4 });
    p(`${items.length} indicadores`, {
      size: 9,
      color: [120, 120, 130],
      spacing: 6,
    });
    for (const k of items) {
      ensure(20);
      const label = SEMAFORO_COLORS[k.semaforo].label;
      p(
        `[${label}] ${k.code} · ${k.name} — ${formatKpiValue(k.currentValue, k.unit)} (meta ${formatKpiValue(k.metaGreen, k.unit)})`,
        { size: 10, spacing: 2 },
      );
    }
    y += 4;
  }

  // KPIs en alerta/críticos
  const critical = ctx.snapshots.filter(
    (k) => k.semaforo === "rojo" || k.semaforo === "ambar",
  );
  if (critical.length > 0) {
    doc.addPage();
    y = margin;
    p(`KPIs en atención (${critical.length})`, { size: 18, bold: true, spacing: 10 });
    for (const k of critical) {
      ensure(50);
      p(`${k.code} · ${k.name}`, { size: 12, bold: true, spacing: 2 });
      p(
        `Valor actual: ${formatKpiValue(k.currentValue, k.unit)} · Meta: ${formatKpiValue(k.metaGreen, k.unit)} · Cumplimiento: ${k.percentCompletion ?? "—"}%`,
        { size: 10, color: [110, 110, 120], spacing: 2 },
      );
      p(
        `Responsable: ${k.responsibleAreaName ?? "—"}${k.responsibleRole ? ` · ${k.responsibleRole}` : ""}`,
        { size: 9, color: [120, 120, 130], spacing: 8 },
      );
      divider();
    }
  }

  doc.save(`tablero-bsc-${ctx.cycle.name.replace(/\s+/g, "-")}.pdf`);
}
