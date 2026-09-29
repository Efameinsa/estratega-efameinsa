import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { CATEGORIES, getCategoryDef, formatMoneyShort } from "./resources-7m";

export interface ExportResourcesContext {
  cycle: { name: string; yearStart: number; yearEnd: number };
  organization: { name: string; sector: string | null; color: string };
  plan: {
    id: string;
    horizonStart: number;
    horizonEnd: number;
    totalInvestment: number;
    currency: string;
    status: string;
  };
  needs: ExportNeed[];
  manpowerProfiles: ExportManpowerProfile[];
  moneySources: ExportMoneySource[];
}

export interface ExportNeed {
  id: string;
  category: string;
  description: string;
  yearStart: number;
  yearEnd: number;
  amountEstimated: number | null;
  quantity: number | null;
  unit: string | null;
  amountSecured: number;
  provisionStatus: string;
  riskLevel: string;
  origin: string;
  links: { linkType: string; referenceLabel: string | null }[];
}

export interface ExportManpowerProfile {
  id: string;
  profileName: string;
  ftesCurrent: number;
  ftesTarget: number;
  ftesPerYear: string;
  costPerYear: number | null;
  totalCost: number;
}

export interface ExportMoneySource {
  id: string;
  sourceType: string;
  amount: number;
  year: number;
  status: string;
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
// Excel: 7 hojas (una por M) + Consolidado
// ───────────────────────────────────────────────────────────────────────

export function exportResourcesExcel(ctx: ExportResourcesContext) {
  const wb = XLSX.utils.book_new();

  // Hoja por categoría
  for (const cat of CATEGORIES) {
    const items = ctx.needs.filter((n) => n.category === cat.key);
    if (items.length === 0) continue;
    const rows = items.map((n) => ({
      Descripción: n.description,
      Cantidad: n.quantity ?? "",
      Unidad: n.unit ?? "",
      "Monto estimado USD": n.amountEstimated ?? "",
      "Asegurado USD": n.amountSecured,
      Brecha:
        n.amountEstimated != null ? n.amountEstimated - n.amountSecured : "",
      "Año inicio": n.yearStart,
      "Año fin": n.yearEnd,
      Estado: n.provisionStatus,
      Riesgo: n.riskLevel,
      Origen: n.origin === "auto_detected" ? "Auto" : "Manual",
      Vinculado: n.links.map((l) => `${l.linkType}:${l.referenceLabel ?? ""}`).join("; "),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, cat.label);
  }

  // Hoja Manpower profiles
  if (ctx.manpowerProfiles.length > 0) {
    const rows = ctx.manpowerProfiles.map((p) => {
      const perYear = (() => {
        try {
          return JSON.parse(p.ftesPerYear) as Record<string, number>;
        } catch {
          return {};
        }
      })();
      return {
        Perfil: p.profileName,
        "FTEs actuales": p.ftesCurrent,
        "FTEs meta": p.ftesTarget,
        ...perYear,
        "USD/año": p.costPerYear ?? "",
        "Costo total": p.totalCost,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Manpower profiles");
  }

  // Hoja Money sources
  if (ctx.moneySources.length > 0) {
    const rows = ctx.moneySources.map((s) => ({
      "Fuente": s.sourceType,
      Año: s.year,
      Monto: s.amount,
      Estado: s.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Fuentes de financiamiento");
  }

  // Hoja Consolidado por año
  const years: number[] = [];
  for (let y = ctx.plan.horizonStart; y <= ctx.plan.horizonEnd; y++) years.push(y);
  const consolidated: Record<string, Record<string, number>> = {};
  for (const cat of CATEGORIES) {
    consolidated[cat.label] = {};
    for (const y of years) consolidated[cat.label][y] = 0;
  }
  for (const n of ctx.needs) {
    if (n.amountEstimated == null) continue;
    const span = Math.max(1, n.yearEnd - n.yearStart + 1);
    const perYear = n.amountEstimated / span;
    for (let y = n.yearStart; y <= n.yearEnd; y++) {
      const cat = getCategoryDef(n.category);
      if (cat) consolidated[cat.label][y] = (consolidated[cat.label][y] ?? 0) + perYear;
    }
  }
  const consolidatedRows: Record<string, string | number>[] = [];
  for (const [label, byYear] of Object.entries(consolidated)) {
    const row: Record<string, string | number> = { Categoría: label };
    let total = 0;
    for (const y of years) {
      row[y] = Math.round(byYear[y] ?? 0);
      total += byYear[y] ?? 0;
    }
    row["Total"] = Math.round(total);
    consolidatedRows.push(row);
  }
  // Fila TOTAL global
  const totalRow: Record<string, string | number> = { Categoría: "TOTAL" };
  for (const y of years) {
    totalRow[y] = Math.round(
      Object.values(consolidated).reduce((s, byYear) => s + (byYear[y] ?? 0), 0),
    );
  }
  totalRow["Total"] = Math.round(
    Object.values(consolidated).reduce(
      (s, byYear) => s + Object.values(byYear).reduce((ss, v) => ss + v, 0),
      0,
    ),
  );
  consolidatedRows.push(totalRow);
  const wsCons = XLSX.utils.json_to_sheet(consolidatedRows);
  XLSX.utils.book_append_sheet(wb, wsCons, "Consolidado");

  XLSX.writeFile(
    wb,
    `recursos-7m-${ctx.cycle.name.replace(/\s+/g, "-")}.xlsx`,
  );
}

// ───────────────────────────────────────────────────────────────────────
// PDF ejecutivo
// ───────────────────────────────────────────────────────────────────────

export function exportResourcesPdf(ctx: ExportResourcesContext) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  let y = margin;

  function ensure(needed: number) {
    if (y + needed > pageH - margin) {
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

  // PORTADA
  doc.setFillColor(23, 52, 4);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text("Plan de Recursos 7M", margin, 200);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(15);
  doc.text(ctx.organization.name, margin, 240);
  doc.setFontSize(11);
  doc.setTextColor(220, 240, 220);
  doc.text(`Ciclo: ${ctx.cycle.name} · ${ctx.cycle.yearStart}–${ctx.cycle.yearEnd}`, margin, 270);
  doc.text(
    `Inversión total: ${formatMoneyShort(ctx.plan.totalInvestment)} ${ctx.plan.currency}`,
    margin,
    290,
  );
  doc.text(`Generado: ${new Date().toLocaleDateString("es-PE")}`, margin, 310);
  doc.setFontSize(8);
  doc.setTextColor(180, 220, 180);
  doc.text("Estratega · Marco D'Alessio (Money · Manpower · Materials · Machines · Methods · Mentality · Medio Ambiente)", margin, pageH - 30);

  // RESUMEN EJECUTIVO
  doc.addPage();
  y = margin;
  p("Resumen ejecutivo", { size: 22, bold: true, spacing: 12 });
  divider();
  const totalSecured = ctx.needs.reduce((s, n) => s + n.amountSecured, 0);
  const totalGap = ctx.plan.totalInvestment - totalSecured;
  p(
    `Tu organización requiere ${formatMoneyShort(ctx.plan.totalInvestment)} USD en ${ctx.plan.horizonEnd - ctx.plan.horizonStart} años para ejecutar el plan estratégico.`,
    { size: 12, spacing: 8 },
  );
  p(`Asegurado: ${formatMoneyShort(totalSecured)} USD`, { size: 11, spacing: 2 });
  p(`Brecha: ${formatMoneyShort(totalGap)} USD`, { size: 11, spacing: 2 });
  p(
    `Cobertura: ${ctx.plan.totalInvestment > 0 ? Math.round((totalSecured / ctx.plan.totalInvestment) * 100) : 0}%`,
    { size: 11, spacing: 12 },
  );

  // RESUMEN POR CATEGORÍA
  p("Resumen por categoría 7M", { size: 14, bold: true, spacing: 8 });
  for (const cat of CATEGORIES) {
    const items = ctx.needs.filter((n) => n.category === cat.key);
    if (items.length === 0) continue;
    const total = items.reduce((s, n) => s + (n.amountEstimated ?? 0), 0);
    const secured = items.reduce((s, n) => s + n.amountSecured, 0);
    p(`${cat.label} (${cat.subtitle})`, { size: 12, bold: true, spacing: 2 });
    p(
      `${items.length} necesidades · ${formatMoneyShort(total)} USD estimado · ${formatMoneyShort(secured)} USD asegurado`,
      { size: 10, color: [120, 120, 130], spacing: 8 },
    );
  }

  // DETALLE POR CATEGORÍA
  for (const cat of CATEGORIES) {
    const items = ctx.needs.filter((n) => n.category === cat.key);
    if (items.length === 0) continue;
    doc.addPage();
    y = margin;
    p(`${cat.label} · ${cat.subtitle}`, { size: 20, bold: true, spacing: 4 });
    p(cat.description, { size: 10, color: [110, 110, 120], spacing: 10 });
    divider();

    for (const need of items) {
      ensure(70);
      p(need.description, { size: 12, bold: true, spacing: 2 });
      const meta: string[] = [];
      if (need.amountEstimated != null) {
        meta.push(`Monto: ${formatMoneyShort(need.amountEstimated)} USD`);
      }
      if (need.quantity != null) {
        meta.push(`Cantidad: ${need.quantity} ${need.unit ?? ""}`);
      }
      meta.push(`Años: ${need.yearStart}–${need.yearEnd}`);
      meta.push(`Estado: ${need.provisionStatus}`);
      meta.push(`Riesgo: ${need.riskLevel}`);
      if (need.origin === "auto_detected") meta.push("⚡ Auto");
      p(meta.join(" · "), { size: 9, color: [120, 120, 130], spacing: 4 });
      if (need.links.length > 0) {
        p(
          `Vinculado: ${need.links.map((l) => `${l.linkType}:${l.referenceLabel ?? ""}`).join(", ")}`,
          { size: 9, color: [120, 120, 130], spacing: 4 },
        );
      }
      divider();
    }
  }

  // BRECHAS CRÍTICAS
  const critical = ctx.needs.filter((n) => n.riskLevel === "alto");
  if (critical.length > 0) {
    doc.addPage();
    y = margin;
    p(`Brechas críticas (${critical.length})`, { size: 18, bold: true, spacing: 10 });
    for (const c of critical) {
      ensure(40);
      const cat = getCategoryDef(c.category);
      p(`[${cat?.label}] ${c.description}`, { size: 11, bold: true, spacing: 2 });
      const gap = (c.amountEstimated ?? 0) - c.amountSecured;
      p(
        `Brecha: ${formatMoneyShort(gap)} USD · Riesgo: ${c.riskLevel} · Estado: ${c.provisionStatus}`,
        { size: 9, color: [180, 50, 50], spacing: 8 },
      );
    }
  }

  doc.save(`plan-recursos-7m-${ctx.cycle.name.replace(/\s+/g, "-")}.pdf`);
}
