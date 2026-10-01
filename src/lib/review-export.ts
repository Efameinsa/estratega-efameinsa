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
import { getReviewTypeDef } from "./review-catalog";

export interface ExportReviewData {
  id: string;
  type: string;
  title: string;
  period: string;
  scheduledAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationMinutes: number | null;
  location: string | null;
  status: string;
  actSigned: boolean;
  presidentSignedAt: Date | null;
  presidentSignedName: string | null;
  secretarySignedAt: Date | null;
  secretarySignedName: string | null;
  executiveSummary: string | null;
  extraordinaryReason: string | null;
  organization: { name: string; sector: string | null; color: string };
  cycle: { name: string; yearStart: number; yearEnd: number };
  president: { name: string; role: string | null } | null;
  secretary: { name: string; role: string | null } | null;
  attendees: {
    attendanceStatus: string;
    roleInReview: string | null;
    user: { name: string; role: string | null };
  }[];
  agendaItems: {
    order: number;
    title: string;
    description: string | null;
    covered: boolean;
    discussionNotes: string | null;
    parentItemId: string | null;
  }[];
  decisions: {
    number: number;
    text: string;
    decisionType: string;
    justification: string | null;
    approved: boolean;
  }[];
  correctiveActions: {
    number: number;
    description: string;
    responsibleName: string | null;
    responsible: { name: string } | null;
    dueDate: Date | null;
    priority: string;
    status: string;
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

function formatDateTime(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-PE");
}
function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-PE");
}

// ───────────────────────────────────────────────────────────────────────
// PDF — Acta oficial
// ───────────────────────────────────────────────────────────────────────

export function exportReviewPdf(r: ExportReviewData) {
  const def = getReviewTypeDef(r.type);
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
      align?: "left" | "center";
    } = {},
  ) {
    const size = opts.size ?? 11;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    const c = opts.color ?? [40, 40, 50];
    doc.setTextColor(c[0], c[1], c[2]);
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    ensure(lines.length * (size + 4));
    if (opts.align === "center") {
      doc.text(lines, pageW / 2, y, { align: "center" });
    } else {
      doc.text(lines, margin, y);
    }
    y += lines.length * (size + 4) + (opts.spacing ?? 4);
  }
  function divider() {
    ensure(14);
    doc.setDrawColor(220, 220, 230);
    doc.line(margin, y, pageW - margin, y);
    y += 12;
  }

  // PORTADA
  const rgb = hexToRgb(def?.color ?? "#185fa5");
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("Acta de", margin, 200);
  doc.text(def?.label ?? "Revisión", margin, 240);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text(r.organization.name, margin, 280);
  doc.setFontSize(11);
  doc.setTextColor(230, 240, 255);
  doc.text(`Ciclo: ${r.cycle.name}`, margin, 310);
  doc.text(`Período: ${r.period}`, margin, 330);
  doc.text(`Fecha programada: ${formatDateTime(r.scheduledAt)}`, margin, 350);
  if (r.actSigned) {
    doc.setTextColor(255, 255, 255);
    doc.text("✓ Acta firmada", margin, 380);
  }
  doc.setFontSize(8);
  doc.setTextColor(200, 220, 240);
  doc.text(`Generada el ${new Date().toLocaleString("es-PE")}`, margin, pageH - 40);

  // Datos generales
  doc.addPage();
  y = margin;
  p("Acta oficial de revisión estratégica", { size: 18, bold: true, spacing: 6 });
  p(r.title, { size: 14, bold: true, color: [80, 80, 100], spacing: 10 });
  divider();
  p("Datos generales", { size: 14, bold: true, spacing: 4 });
  p(`Tipo: ${def?.label ?? r.type}`, { size: 11, spacing: 2 });
  p(`Período: ${r.period}`, { size: 11, spacing: 2 });
  p(`Lugar: ${r.location ?? "—"}`, { size: 11, spacing: 2 });
  p(`Inicio: ${formatDateTime(r.startedAt)}`, { size: 11, spacing: 2 });
  p(`Cierre: ${formatDateTime(r.finishedAt)}`, { size: 11, spacing: 2 });
  p(`Duración: ${r.durationMinutes ?? "—"} min`, { size: 11, spacing: 2 });
  if (r.extraordinaryReason) {
    p(`Motivo extraordinario: ${r.extraordinaryReason}`, { size: 11, spacing: 2 });
  }
  p(`Presidente: ${r.president?.name ?? "—"}`, { size: 11, spacing: 2 });
  p(`Secretario: ${r.secretary?.name ?? "—"}`, { size: 11, spacing: 8 });

  // Asistentes
  divider();
  p("Asistentes", { size: 14, bold: true, spacing: 4 });
  if (r.attendees.length === 0) {
    p("Sin asistentes registrados.", { size: 11, color: [120, 120, 130], spacing: 6 });
  } else {
    for (const a of r.attendees) {
      p(
        `• ${a.user.name}${a.roleInReview ? ` — ${a.roleInReview}` : a.user.role ? ` — ${a.user.role}` : ""} (${a.attendanceStatus})`,
        { size: 10, spacing: 2 },
      );
    }
    y += 4;
  }

  // Resumen ejecutivo
  if (r.executiveSummary) {
    divider();
    p("Resumen ejecutivo", { size: 14, bold: true, spacing: 4 });
    p(r.executiveSummary, { size: 11, spacing: 8 });
  }

  // Agenda
  doc.addPage();
  y = margin;
  p("Agenda de la revisión", { size: 16, bold: true, spacing: 10 });
  const topLevel = r.agendaItems.filter((i) => !i.parentItemId);
  for (const item of topLevel) {
    ensure(40);
    p(`${item.order + 1}. ${item.title}${item.covered ? " ✓" : ""}`, {
      size: 12,
      bold: true,
      spacing: 2,
    });
    if (item.description) {
      p(item.description, { size: 10, color: [110, 110, 120], spacing: 4 });
    }
    if (item.discussionNotes) {
      p(`Notas: ${item.discussionNotes}`, { size: 10, color: [60, 60, 80], spacing: 6 });
    }
  }

  // Decisiones
  if (r.decisions.length > 0) {
    doc.addPage();
    y = margin;
    p("Decisiones tomadas", { size: 16, bold: true, spacing: 10 });
    for (const d of r.decisions) {
      ensure(40);
      p(`Decisión ${d.number}${d.approved ? " (aprobada)" : " (rechazada)"}`, {
        size: 12,
        bold: true,
        spacing: 2,
      });
      p(d.text, { size: 11, spacing: 4 });
      if (d.justification) {
        p(`Justificación: ${d.justification}`, {
          size: 10,
          color: [120, 120, 130],
          spacing: 6,
        });
      }
    }
  }

  // Acciones correctivas
  if (r.correctiveActions.length > 0) {
    doc.addPage();
    y = margin;
    p("Acciones correctivas", { size: 16, bold: true, spacing: 10 });
    for (const a of r.correctiveActions) {
      ensure(40);
      p(`Acción ${a.number} · Prioridad ${a.priority}`, {
        size: 12,
        bold: true,
        spacing: 2,
      });
      p(a.description, { size: 11, spacing: 4 });
      p(
        `Responsable: ${a.responsible?.name ?? a.responsibleName ?? "—"} · Vence: ${formatDate(a.dueDate)} · Estado: ${a.status}`,
        { size: 9, color: [120, 120, 130], spacing: 6 },
      );
    }
  }

  // Firmas
  doc.addPage();
  y = margin;
  p("Firmas", { size: 16, bold: true, spacing: 14 });
  p("Presidente:", { size: 11, bold: true, spacing: 4 });
  if (r.presidentSignedAt && r.presidentSignedName) {
    p(`Firmado por ${r.presidentSignedName}`, { size: 11, spacing: 2 });
    p(formatDateTime(r.presidentSignedAt), { size: 9, color: [120, 120, 130], spacing: 12 });
  } else {
    p("_______________________________________", { size: 11, spacing: 12 });
  }
  p("Secretario:", { size: 11, bold: true, spacing: 4 });
  if (r.secretarySignedAt && r.secretarySignedName) {
    p(`Firmado por ${r.secretarySignedName}`, { size: 11, spacing: 2 });
    p(formatDateTime(r.secretarySignedAt), { size: 9, color: [120, 120, 130], spacing: 8 });
  } else {
    p("_______________________________________", { size: 11, spacing: 8 });
  }

  doc.save(`acta-${r.type}-${r.period}-${r.organization.name.replace(/\s+/g, "-")}.pdf`);
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return [24, 95, 165];
  return [parseInt(m[0], 16), parseInt(m[1], 16), parseInt(m[2], 16)];
}

// ───────────────────────────────────────────────────────────────────────
// Word
// ───────────────────────────────────────────────────────────────────────

export async function exportReviewDocx(r: ExportReviewData) {
  const def = getReviewTypeDef(r.type);
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Acta · ${def?.label ?? r.type}`, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: r.organization.name, size: 26 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Ciclo: ${r.cycle.name} · Período: ${r.period}`,
          italics: true,
        }),
      ],
    }),
    new Paragraph({ children: [new TextRun("")] }),
  );

  // Datos generales
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Datos generales" })],
    }),
    new Paragraph({ children: [new TextRun(`Tipo: ${def?.label ?? r.type}`)] }),
    new Paragraph({ children: [new TextRun(`Lugar: ${r.location ?? "—"}`)] }),
    new Paragraph({ children: [new TextRun(`Inicio: ${formatDateTime(r.startedAt)}`)] }),
    new Paragraph({ children: [new TextRun(`Cierre: ${formatDateTime(r.finishedAt)}`)] }),
    new Paragraph({ children: [new TextRun(`Presidente: ${r.president?.name ?? "—"}`)] }),
    new Paragraph({ children: [new TextRun(`Secretario: ${r.secretary?.name ?? "—"}`)] }),
  );

  // Asistentes
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Asistentes" })],
    }),
  );
  for (const a of r.attendees) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `• ${a.user.name}${a.roleInReview ? ` — ${a.roleInReview}` : ""} (${a.attendanceStatus})`,
          }),
        ],
      }),
    );
  }

  if (r.executiveSummary) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: "Resumen ejecutivo" })],
      }),
      new Paragraph({ children: [new TextRun(r.executiveSummary)] }),
    );
  }

  // Agenda
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Agenda" })],
    }),
  );
  const topLevel = r.agendaItems.filter((i) => !i.parentItemId);
  for (const item of topLevel) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({ text: `${item.order + 1}. ${item.title}${item.covered ? " ✓" : ""}` }),
        ],
      }),
    );
    if (item.description) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: item.description, italics: true })] }),
      );
    }
    if (item.discussionNotes) {
      children.push(new Paragraph({ children: [new TextRun({ text: item.discussionNotes })] }));
    }
  }

  // Decisiones
  if (r.decisions.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: "Decisiones tomadas" })],
      }),
    );
    for (const d of r.decisions) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: `Decisión ${d.number}` })],
        }),
        new Paragraph({ children: [new TextRun(d.text)] }),
      );
      if (d.justification) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `Justificación: ${d.justification}`, italics: true })],
          }),
        );
      }
    }
  }

  // Acciones correctivas — como tabla
  if (r.correctiveActions.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: "Acciones correctivas" })],
      }),
    );
    const headerCells = ["#", "Descripción", "Responsable", "Vence", "Prioridad", "Estado"].map(
      (h) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
        }),
    );
    const rows = [
      new TableRow({ children: headerCells, tableHeader: true }),
      ...r.correctiveActions.map(
        (a) =>
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun(String(a.number))] })],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun(a.description)] })],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun(a.responsible?.name ?? a.responsibleName ?? "—"),
                    ],
                  }),
                ],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun(formatDate(a.dueDate))] })],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun(a.priority)] })],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun(a.status)] })],
              }),
            ],
          }),
      ),
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
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
    );
  }

  // Firmas
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Firmas" })],
    }),
    new Paragraph({ children: [new TextRun({ text: "Presidente:", bold: true })] }),
    new Paragraph({
      children: [
        new TextRun(
          r.presidentSignedAt && r.presidentSignedName
            ? `Firmado por ${r.presidentSignedName} — ${formatDateTime(r.presidentSignedAt)}`
            : "________________________________________________",
        ),
      ],
    }),
    new Paragraph({ children: [new TextRun("")] }),
    new Paragraph({ children: [new TextRun({ text: "Secretario:", bold: true })] }),
    new Paragraph({
      children: [
        new TextRun(
          r.secretarySignedAt && r.secretarySignedName
            ? `Firmado por ${r.secretarySignedName} — ${formatDateTime(r.secretarySignedAt)}`
            : "________________________________________________",
        ),
      ],
    }),
  );

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(
    blob,
    `acta-${r.type}-${r.period}-${r.organization.name.replace(/\s+/g, "-")}.docx`,
  );
}
