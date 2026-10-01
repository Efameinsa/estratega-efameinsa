import jsPDF from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  AlignmentType,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import { POLICY_CATEGORIES, getCategoryDef } from "./policy-suggestions";

export interface ExportPolicy {
  id: string;
  code: string;
  category: string;
  name: string;
  enunciado: string;
  justification: string | null;
  origin: string;
  mandatory: boolean;
  scope: string | null;
  scopeDetail: string | null;
  responsible: string | null;
  indicator: string | null;
  reviewFrequency: string | null;
  exceptions: string | null;
  validFrom: Date | string | null;
  nextReview: Date | string | null;
  strategies: { strategy: { code: string | null; description: string } }[];
  consolidatedStrategies: { consolidatedStrategy: { code: string; text: string } }[];
  valueLinks: { value: { name: string } }[];
  ethicsMitigant: { text: string; responsible: string; indicator: string } | null;
}

export interface ExportContext {
  cycle: { name: string; yearStart: number; yearEnd: number };
  organization: { name: string; sector: string | null; color: string };
  policies: ExportPolicy[];
  strategies: { id: string; code: string | null; description: string }[];
}

function fmtDate(d: Date | string | null): string {
  if (!d) return "Permanente, revisión anual";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" });
}

function fmtScope(scope: string | null, detail: string | null): string {
  if (!scope) return "Toda la organización";
  const labels: Record<string, string> = {
    toda_organizacion: "Toda la organización",
    area: "Área específica",
    producto: "Producto específico",
    mercado: "Mercado específico",
    situacion: "Situación específica",
  };
  return labels[scope] + (detail ? ` — ${detail}` : "");
}

function fmtFrequency(freq: string | null): string {
  if (!freq) return "Anual";
  const labels: Record<string, string> = {
    mensual: "Mensual",
    trimestral: "Trimestral",
    semestral: "Semestral",
    anual: "Anual",
  };
  return labels[freq] ?? freq;
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
// PDF — Manual de políticas
// ───────────────────────────────────────────────────────────────────────

export function exportPolicyManualPdf(ctx: ExportContext) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  let y = margin;

  function ensureSpace(needed: number) {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function paragraph(text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; spacing?: number } = {}) {
    const size = opts.size ?? 11;
    const bold = opts.bold ?? false;
    const color = opts.color ?? [40, 40, 50];
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    ensureSpace(lines.length * (size + 4));
    doc.text(lines, margin, y);
    y += lines.length * (size + 4) + (opts.spacing ?? 4);
  }

  function divider() {
    ensureSpace(20);
    doc.setDrawColor(220, 220, 230);
    doc.line(margin, y, pageW - margin, y);
    y += 16;
  }

  // 1. PORTADA
  doc.setFillColor(24, 95, 165); // #185fa5
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.text("Manual de", margin, 220);
  doc.text("Políticas Organizacionales", margin, 270);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.text(ctx.organization.name, margin, 320);
  if (ctx.organization.sector) {
    doc.setFontSize(12);
    doc.setTextColor(220, 230, 245);
    doc.text(ctx.organization.sector, margin, 342);
  }
  doc.setFontSize(13);
  doc.setTextColor(220, 230, 245);
  doc.text(`Ciclo estratégico: ${ctx.cycle.name}`, margin, 380);
  doc.text(`Horizonte: ${ctx.cycle.yearStart}–${ctx.cycle.yearEnd}`, margin, 400);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-PE")}`, margin, 420);

  doc.setFontSize(9);
  doc.setTextColor(180, 200, 230);
  doc.text("Estratega · Plataforma de planeamiento estratégico", margin, pageH - 40);

  // 2. TABLA DE CONTENIDOS
  doc.addPage();
  y = margin;
  paragraph("Tabla de contenidos", { size: 22, bold: true, spacing: 12 });
  divider();
  const policiesByCategory = new Map<string, ExportPolicy[]>();
  for (const p of ctx.policies) {
    const list = policiesByCategory.get(p.category) ?? [];
    list.push(p);
    policiesByCategory.set(p.category, list);
  }
  for (const cat of POLICY_CATEGORIES) {
    const list = policiesByCategory.get(cat.key) ?? [];
    if (list.length === 0) continue;
    paragraph(cat.label, { size: 13, bold: true, spacing: 4 });
    for (const p of list) {
      paragraph(`  ${p.code} — ${p.name}`, { size: 11, spacing: 2 });
    }
    y += 4;
  }

  // 3. POLÍTICAS POR CATEGORÍA
  for (const cat of POLICY_CATEGORIES) {
    const list = policiesByCategory.get(cat.key) ?? [];
    if (list.length === 0) continue;
    doc.addPage();
    y = margin;
    paragraph(cat.label, { size: 20, bold: true, spacing: 4 });
    paragraph(cat.description, { size: 10, color: [110, 110, 120], spacing: 10 });
    divider();

    for (const p of list) {
      ensureSpace(120);
      paragraph(`${p.code} · ${p.name}`, { size: 14, bold: true, spacing: 4 });
      if (p.mandatory) {
        paragraph("Política obligatoria · derivada de mitigante ético", {
          size: 9,
          bold: true,
          color: [217, 119, 6],
          spacing: 8,
        });
      }
      paragraph("Enunciado", { size: 10, bold: true, spacing: 2 });
      paragraph(p.enunciado, { size: 11, spacing: 8 });

      if (p.justification) {
        paragraph("Justificación", { size: 10, bold: true, spacing: 2 });
        paragraph(p.justification, { size: 11, spacing: 8 });
      }

      paragraph("Alcance", { size: 10, bold: true, spacing: 2 });
      paragraph(fmtScope(p.scope, p.scopeDetail), { size: 11, spacing: 6 });

      if (p.responsible) {
        paragraph("Responsable", { size: 10, bold: true, spacing: 2 });
        paragraph(p.responsible, { size: 11, spacing: 6 });
      }

      if (p.indicator) {
        paragraph("Indicador de cumplimiento", { size: 10, bold: true, spacing: 2 });
        paragraph(p.indicator, { size: 11, spacing: 6 });
      }

      paragraph("Frecuencia de revisión", { size: 10, bold: true, spacing: 2 });
      paragraph(fmtFrequency(p.reviewFrequency), { size: 11, spacing: 6 });

      if (p.exceptions) {
        paragraph("Excepciones permitidas", { size: 10, bold: true, spacing: 2 });
        paragraph(p.exceptions, { size: 11, spacing: 6 });
      }

      paragraph("Vigencia", { size: 10, bold: true, spacing: 2 });
      paragraph(
        `Desde: ${fmtDate(p.validFrom)} · Próxima revisión: ${fmtDate(p.nextReview)}`,
        { size: 11, spacing: 8 },
      );

      const linkedStrats = [
        ...p.strategies.map((s) => `${s.strategy.code ?? "—"} ${s.strategy.description}`),
        ...p.consolidatedStrategies.map(
          (c) => `${c.consolidatedStrategy.code} ${c.consolidatedStrategy.text}`,
        ),
      ];
      if (linkedStrats.length > 0) {
        paragraph("Estrategias vinculadas", { size: 10, bold: true, spacing: 2 });
        for (const s of linkedStrats) {
          paragraph(`  • ${s}`, { size: 10, spacing: 2 });
        }
        y += 4;
      }
      if (p.valueLinks.length > 0) {
        paragraph("Valores que protege", { size: 10, bold: true, spacing: 2 });
        paragraph(p.valueLinks.map((v) => v.value.name).join(" · "), {
          size: 11,
          spacing: 6,
        });
      }
      divider();
    }
  }

  // 4. ANEXO: matriz Políticas × Estrategias
  doc.addPage();
  y = margin;
  paragraph("Anexo · Matriz Políticas × Estrategias", { size: 18, bold: true, spacing: 10 });
  if (ctx.strategies.length === 0) {
    paragraph("Sin estrategias retenidas en este ciclo.", { size: 11 });
  } else {
    const headerRow = ["Política", ...ctx.strategies.map((s) => s.code ?? "—")];
    paragraph(headerRow.join("  |  "), { size: 9, bold: true, spacing: 6 });
    for (const p of ctx.policies) {
      const linkedIds = new Set(p.strategies.map((s) => s.strategy.code ?? ""));
      const row = [
        p.code,
        ...ctx.strategies.map((s) => (linkedIds.has(s.code ?? "") ? "✓" : "·")),
      ];
      paragraph(row.join("  |  "), { size: 9, spacing: 3 });
    }
  }

  downloadBlob(doc.output("blob"), `manual-politicas-${ctx.cycle.name.replace(/\s+/g, "-")}.pdf`);
}

// ───────────────────────────────────────────────────────────────────────
// Word (docx)
// ───────────────────────────────────────────────────────────────────────

export async function exportPolicyManualDocx(ctx: ExportContext) {
  const children: (Paragraph | Table)[] = [];

  // Portada
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Manual de Políticas Organizacionales", bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: ctx.organization.name, size: 28 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Ciclo: ${ctx.cycle.name} · ${ctx.cycle.yearStart}–${ctx.cycle.yearEnd}`,
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Generado el ${new Date().toLocaleDateString("es-PE")}`,
          color: "888888",
        }),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: "" })] }),
  );

  // Políticas por categoría
  const policiesByCategory = new Map<string, ExportPolicy[]>();
  for (const p of ctx.policies) {
    const list = policiesByCategory.get(p.category) ?? [];
    list.push(p);
    policiesByCategory.set(p.category, list);
  }

  for (const cat of POLICY_CATEGORIES) {
    const list = policiesByCategory.get(cat.key) ?? [];
    if (list.length === 0) continue;
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: cat.label, bold: true })],
      }),
      new Paragraph({
        children: [new TextRun({ text: cat.description, italics: true, color: "666666" })],
      }),
    );

    for (const p of list) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: `${p.code} · ${p.name}` })],
        }),
      );
      if (p.mandatory) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "POLÍTICA OBLIGATORIA · derivada de mitigante ético",
                bold: true,
                color: "D97706",
              }),
            ],
          }),
        );
      }
      children.push(
        new Paragraph({ children: [new TextRun({ text: "Enunciado", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: p.enunciado })] }),
      );
      if (p.justification) {
        children.push(
          new Paragraph({ children: [new TextRun({ text: "Justificación", bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: p.justification })] }),
        );
      }
      children.push(
        new Paragraph({ children: [new TextRun({ text: "Alcance", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: fmtScope(p.scope, p.scopeDetail) })] }),
      );
      if (p.responsible) {
        children.push(
          new Paragraph({ children: [new TextRun({ text: "Responsable", bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: p.responsible })] }),
        );
      }
      if (p.indicator) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Indicador de cumplimiento", bold: true })],
          }),
          new Paragraph({ children: [new TextRun({ text: p.indicator })] }),
        );
      }
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Frecuencia de revisión", bold: true })],
        }),
        new Paragraph({ children: [new TextRun({ text: fmtFrequency(p.reviewFrequency) })] }),
      );
      if (p.exceptions) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Excepciones permitidas", bold: true })],
          }),
          new Paragraph({ children: [new TextRun({ text: p.exceptions })] }),
        );
      }
      children.push(
        new Paragraph({ children: [new TextRun({ text: "Vigencia", bold: true })] }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Desde: ${fmtDate(p.validFrom)} · Próxima revisión: ${fmtDate(p.nextReview)}`,
            }),
          ],
        }),
        new Paragraph({ children: [new TextRun({ text: "" })] }),
      );
    }
  }

  // Anexo matriz
  if (ctx.strategies.length > 0 && ctx.policies.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: "Anexo · Matriz Políticas × Estrategias" })],
      }),
    );
    const headerCells = [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: "Política", bold: true })] })],
        width: { size: 30, type: WidthType.PERCENTAGE },
      }),
      ...ctx.strategies.map(
        (s) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: s.code ?? "—", bold: true })],
              }),
            ],
          }),
      ),
    ];
    const rows = [
      new TableRow({ children: headerCells, tableHeader: true }),
      ...ctx.policies.map((p) => {
        const linkedCodes = new Set(p.strategies.map((s) => s.strategy.code ?? ""));
        return new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: p.code })] })],
            }),
            ...ctx.strategies.map(
              (s) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({ text: linkedCodes.has(s.code ?? "") ? "✓" : "·" }),
                      ],
                    }),
                  ],
                }),
            ),
          ],
        });
      }),
    ];
    children.push(
      new Table({
        rows,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
          left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
          right: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "EEEEEE" },
          insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "EEEEEE" },
        },
      }),
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `manual-politicas-${ctx.cycle.name.replace(/\s+/g, "-")}.docx`);
}

// ───────────────────────────────────────────────────────────────────────
// HTML (publicación interna)
// ───────────────────────────────────────────────────────────────────────

export function exportPolicyManualHtml(ctx: ExportContext) {
  const policiesByCategory = new Map<string, ExportPolicy[]>();
  for (const p of ctx.policies) {
    const list = policiesByCategory.get(p.category) ?? [];
    list.push(p);
    policiesByCategory.set(p.category, list);
  }

  const today = new Date().toLocaleDateString("es-PE");
  const escape = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));

  const sections = POLICY_CATEGORIES.map((cat) => {
    const list = policiesByCategory.get(cat.key) ?? [];
    if (list.length === 0) return "";
    const items = list
      .map(
        (p) => `
        <article class="policy ${p.mandatory ? "mandatory" : ""}">
          <header>
            <span class="code">${escape(p.code)}</span>
            <h3>${escape(p.name)}</h3>
            ${p.mandatory ? '<span class="badge">Obligatoria</span>' : ""}
          </header>
          <h4>Enunciado</h4>
          <p>${escape(p.enunciado)}</p>
          ${p.justification ? `<h4>Justificación</h4><p>${escape(p.justification)}</p>` : ""}
          <dl>
            <dt>Alcance</dt><dd>${escape(fmtScope(p.scope, p.scopeDetail))}</dd>
            ${p.responsible ? `<dt>Responsable</dt><dd>${escape(p.responsible)}</dd>` : ""}
            ${p.indicator ? `<dt>Indicador</dt><dd>${escape(p.indicator)}</dd>` : ""}
            <dt>Frecuencia</dt><dd>${escape(fmtFrequency(p.reviewFrequency))}</dd>
            ${p.exceptions ? `<dt>Excepciones</dt><dd>${escape(p.exceptions)}</dd>` : ""}
            <dt>Vigencia</dt><dd>Desde ${escape(fmtDate(p.validFrom))} — próxima revisión ${escape(fmtDate(p.nextReview))}</dd>
          </dl>
        </article>`,
      )
      .join("");
    return `
      <section class="category" style="--cat-color:${cat.color}">
        <h2>${escape(cat.label)}</h2>
        <p class="cat-desc">${escape(cat.description)}</p>
        ${items}
      </section>`;
  }).join("");

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Manual de Políticas · ${escape(ctx.organization.name)}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 24px; color: #1e1f21; line-height: 1.55; }
  header.cover { background: ${ctx.organization.color || "#185fa5"}; color: white; padding: 64px 32px; border-radius: 16px; margin-bottom: 32px; }
  header.cover h1 { font-size: 2.6rem; margin: 0 0 12px; letter-spacing: -0.02em; }
  header.cover .meta { font-size: 0.95rem; opacity: 0.85; margin-top: 16px; }
  section.category { margin: 48px 0; border-left: 4px solid var(--cat-color); padding-left: 20px; }
  section.category h2 { color: var(--cat-color); margin-bottom: 6px; }
  .cat-desc { color: #6b7280; font-size: 0.9rem; margin-top: 0; }
  article.policy { background: #f9fafb; border-radius: 12px; padding: 20px 24px; margin: 16px 0; }
  article.policy.mandatory { background: #fffbeb; border-left: 4px solid #b45309; }
  article.policy header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .code { font-family: ui-monospace, monospace; font-size: 0.8rem; color: #6b7280; }
  article.policy h3 { margin: 0; font-size: 1.15rem; }
  .badge { background: #b45309; color: white; padding: 2px 8px; border-radius: 999px; font-size: 0.7rem; font-weight: 600; }
  article.policy h4 { margin: 16px 0 4px; font-size: 0.85rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 12px 0 0; }
  dt { font-weight: 600; color: #6b7280; font-size: 0.85rem; }
  dd { margin: 0; font-size: 0.9rem; }
  footer { margin-top: 64px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 0.85rem; text-align: center; }
</style>
</head>
<body>
  <header class="cover">
    <h1>Manual de Políticas Organizacionales</h1>
    <p>${escape(ctx.organization.name)}${ctx.organization.sector ? ` · ${escape(ctx.organization.sector)}` : ""}</p>
    <p class="meta">Ciclo: ${escape(ctx.cycle.name)} · ${ctx.cycle.yearStart}–${ctx.cycle.yearEnd} · Generado el ${escape(today)}</p>
  </header>
  ${sections}
  <footer>Estratega · Plataforma de planeamiento estratégico</footer>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  downloadBlob(blob, `manual-politicas-${ctx.cycle.name.replace(/\s+/g, "-")}.html`);
}
