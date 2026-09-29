import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { BSC_DIMENSIONS, getDimensionDef } from "./kpi-suggestions";

export interface ExportKpi {
  id: string;
  code: string;
  name: string;
  description: string | null;
  formula: string | null;
  dimensionBsc: string;
  unit: string | null;
  frequency: string;
  direction: string;
  source: string;
  educanetLinkId: string | null;
  educanetSendMode: string | null;
  responsibleRole: string | null;
  responsibleArea: { name: string } | null;
  olps: { olp: { description: string } }[];
  ocps: { ocp: { code: string } }[];
  periods: {
    period: string;
    metaGreen: number | null;
    metaAmber: number | null;
    metaRed: number | null;
    realValue: number | null;
    semaforoActual: string | null;
  }[];
}

export interface ExportKpiContext {
  cycle: { name: string; yearStart: number; yearEnd: number };
  organization: { name: string; sector: string | null; color: string };
  kpis: ExportKpi[];
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
// Excel
// ───────────────────────────────────────────────────────────────────────

export function exportKpiExcel(ctx: ExportKpiContext) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Diccionario completo
  const allRows = ctx.kpis.map((k) => ({
    Código: k.code,
    Nombre: k.name,
    Dimensión: getDimensionDef(k.dimensionBsc)?.label ?? k.dimensionBsc,
    Descripción: k.description ?? "",
    Fórmula: k.formula ?? "",
    Unidad: k.unit ?? "",
    Frecuencia: k.frequency,
    Sentido: k.direction,
    Fuente: k.source,
    "ID EduCaNet": k.educanetLinkId ?? "",
    "Modo envío": k.educanetSendMode ?? "",
    "Área responsable": k.responsibleArea?.name ?? "",
    Responsable: k.responsibleRole ?? "",
    "OLPs vinculados": k.olps.map((o) => o.olp.description.slice(0, 60)).join(" | "),
    "OCPs vinculados": k.ocps.map((o) => o.ocp.code).join(", "),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allRows), "Diccionario completo");

  // Hoja por dimensión
  for (const dim of BSC_DIMENSIONS) {
    const items = ctx.kpis.filter((k) => k.dimensionBsc === dim.key);
    if (items.length === 0) continue;
    const rows = items.map((k) => ({
      Código: k.code,
      Nombre: k.name,
      Descripción: k.description ?? "",
      Fórmula: k.formula ?? "",
      Unidad: k.unit ?? "",
      Frecuencia: k.frequency,
      Sentido: k.direction,
      Fuente: k.source,
      "ID EduCaNet": k.educanetLinkId ?? "",
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(rows),
      dim.shortLabel,
    );
  }

  // Hoja Metas por período
  const periodRows: Record<string, string | number>[] = [];
  for (const k of ctx.kpis) {
    for (const p of k.periods) {
      periodRows.push({
        Código: k.code,
        Indicador: k.name,
        Período: p.period,
        "Meta (verde)": p.metaGreen ?? "",
        "Aceptable (ámbar)": p.metaAmber ?? "",
        "Crítico (rojo)": p.metaRed ?? "",
        "Valor real": p.realValue ?? "",
        Semáforo: p.semaforoActual ?? "",
      });
    }
  }
  if (periodRows.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(periodRows),
      "Metas por período",
    );
  }

  // Hoja Conexión EduCaNet
  const educanetItems = ctx.kpis.filter((k) => k.source === "educanet");
  if (educanetItems.length > 0) {
    const rows = educanetItems.map((k) => ({
      Código: k.code,
      Indicador: k.name,
      "ID de vinculación": k.educanetLinkId ?? "",
      "Modo envío": k.educanetSendMode ?? "",
      Dimensión: getDimensionDef(k.dimensionBsc)?.label ?? k.dimensionBsc,
      Frecuencia: k.frequency,
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(rows),
      "Conexión EduCaNet",
    );
  }

  XLSX.writeFile(wb, `diccionario-kpis-${ctx.cycle.name.replace(/\s+/g, "-")}.xlsx`);
}

// ───────────────────────────────────────────────────────────────────────
// PDF
// ───────────────────────────────────────────────────────────────────────

export function exportKpiPdf(ctx: ExportKpiContext) {
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
  doc.text("Diccionario de KPIs", margin, 200);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(15);
  doc.text(ctx.organization.name, margin, 240);
  doc.setFontSize(11);
  doc.setTextColor(220, 230, 245);
  doc.text(
    `Ciclo: ${ctx.cycle.name} · ${ctx.cycle.yearStart}–${ctx.cycle.yearEnd}`,
    margin,
    270,
  );
  doc.text(`Indicadores confirmados: ${ctx.kpis.length}`, margin, 290);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-PE")}`, margin, 310);

  // TOC
  doc.addPage();
  y = margin;
  p("Tabla de contenidos por dimensión BSC", { size: 20, bold: true, spacing: 12 });
  divider();
  for (const dim of BSC_DIMENSIONS) {
    const items = ctx.kpis.filter((k) => k.dimensionBsc === dim.key);
    if (items.length === 0) continue;
    p(`${dim.label} (${items.length})`, { size: 12, bold: true, spacing: 4 });
    for (const k of items) {
      p(`  ${k.code} — ${k.name}`, { size: 10, spacing: 2 });
    }
    y += 4;
  }

  // Detalle por dimensión
  for (const dim of BSC_DIMENSIONS) {
    const items = ctx.kpis.filter((k) => k.dimensionBsc === dim.key);
    if (items.length === 0) continue;
    doc.addPage();
    y = margin;
    p(dim.label, { size: 20, bold: true, spacing: 4 });
    p(dim.description, { size: 10, color: [110, 110, 120], spacing: 10 });
    divider();

    for (const k of items) {
      ensure(80);
      p(`${k.code} · ${k.name}`, { size: 13, bold: true, spacing: 4 });
      if (k.description) p(`Descripción: ${k.description}`, { size: 10, spacing: 2 });
      if (k.formula) p(`Fórmula: ${k.formula}`, { size: 10, spacing: 2 });
      p(
        `Unidad: ${k.unit ?? "—"} · Frecuencia: ${k.frequency} · Sentido: ${k.direction}`,
        { size: 10, spacing: 2 },
      );
      p(
        `Fuente: ${k.source === "educanet" ? `EduCaNet (ID: ${k.educanetLinkId})` : "Carga manual"}`,
        { size: 10, spacing: 2 },
      );
      if (k.responsibleArea || k.responsibleRole) {
        p(
          `Responsable: ${k.responsibleArea?.name ?? ""}${k.responsibleArea && k.responsibleRole ? " · " : ""}${k.responsibleRole ?? ""}`,
          { size: 10, spacing: 2 },
        );
      }
      if (k.olps.length > 0) {
        p(
          `OLPs: ${k.olps.map((o) => o.olp.description.slice(0, 80)).join(", ")}`,
          { size: 10, spacing: 2 },
        );
      }
      if (k.ocps.length > 0) {
        p(`OCPs: ${k.ocps.map((o) => o.ocp.code).join(", ")}`, { size: 10, spacing: 2 });
      }
      if (k.periods.length > 0) {
        const periodSummary = k.periods
          .slice(0, 6)
          .map(
            (p) =>
              `${p.period}: meta=${p.metaGreen ?? "—"} real=${p.realValue ?? "—"}`,
          )
          .join(" | ");
        p(`Metas: ${periodSummary}${k.periods.length > 6 ? " …" : ""}`, {
          size: 9,
          color: [120, 120, 130],
          spacing: 2,
        });
      }
      divider();
    }
  }

  doc.save(`diccionario-kpis-${ctx.cycle.name.replace(/\s+/g, "-")}.pdf`);
}
