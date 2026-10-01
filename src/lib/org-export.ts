import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { toPng, toSvg } from "html-to-image";
import { getNodeTypeDef } from "./org-structure";

export interface ExportOrgContext {
  cycle: { name: string; yearStart: number; yearEnd: number };
  organization: { name: string; sector: string | null; color: string };
  structure: {
    id: string;
    type: string;
    name: string;
    status: string;
    nodes: ExportNode[];
    relations: { parentNodeId: string; childNodeId: string; relationType: string }[];
  } | null;
  ocps: { id: string; code: string; description: string; year: number }[];
  policies: { id: string; code: string; name: string; category: string; mandatory: boolean }[];
}

export interface ExportNode {
  id: string;
  code: string;
  name: string;
  nodeType: string;
  hierarchyLevel: number;
  responsibleRole: string | null;
  ftesEstimated: number | null;
  origin: string;
  ocpLinks: { ocpId: string; raciRole: string; ocp: { id: string; code: string; description: string } }[];
  policyLinks: { politicaId: string; applies: string; politica: { id: string; code: string; name: string } }[];
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
// PNG / SVG del canvas (usa el wrapper de React Flow)
// ───────────────────────────────────────────────────────────────────────

export async function exportCanvasPng(element: HTMLElement, name: string) {
  const dataUrl = await toPng(element, {
    backgroundColor: "rgba(139, 21, 16, 0.08)",
    pixelRatio: 2,
    filter: (node) => {
      // Excluir controles, minimap, panel y nodos colapsados
      const cls = (node as HTMLElement).className ?? "";
      if (typeof cls === "string") {
        if (
          cls.includes("react-flow__panel") ||
          cls.includes("react-flow__minimap") ||
          cls.includes("react-flow__controls") ||
          cls.includes("react-flow__attribution")
        ) {
          return false;
        }
      }
      return true;
    },
  });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  downloadBlob(blob, `${name}.png`);
}

export async function exportCanvasSvg(element: HTMLElement, name: string) {
  const dataUrl = await toSvg(element, {
    backgroundColor: "rgba(139, 21, 16, 0.08)",
    filter: (node) => {
      const cls = (node as HTMLElement).className ?? "";
      if (typeof cls === "string") {
        if (
          cls.includes("react-flow__panel") ||
          cls.includes("react-flow__minimap") ||
          cls.includes("react-flow__controls") ||
          cls.includes("react-flow__attribution")
        ) {
          return false;
        }
      }
      return true;
    },
  });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  downloadBlob(blob, `${name}.svg`);
}

// ───────────────────────────────────────────────────────────────────────
// Excel: hojas Áreas, Matriz RACI, Comités
// ───────────────────────────────────────────────────────────────────────

export function exportOrgExcel(ctx: ExportOrgContext) {
  if (!ctx.structure) return;
  const wb = XLSX.utils.book_new();

  // Hoja Áreas
  const areasRows = ctx.structure.nodes.map((n) => ({
    Código: n.code,
    Nombre: n.name,
    Tipo: getNodeTypeDef(n.nodeType)?.label ?? n.nodeType,
    Nivel: n.hierarchyLevel,
    Responsable: n.responsibleRole ?? "",
    FTEs: n.ftesEstimated ?? "",
    Origen: n.origin,
    "OCPs vinculados": n.ocpLinks.map((l) => `${l.ocp.code} (${l.raciRole})`).join("; "),
    "Políticas vinculadas": n.policyLinks.map((p) => p.politica.code).join("; "),
  }));
  const wsAreas = XLSX.utils.json_to_sheet(areasRows);
  XLSX.utils.book_append_sheet(wb, wsAreas, "Áreas");

  // Hoja Matriz RACI
  const ocpHeaders = ctx.ocps.map((o) => o.code);
  const raciHeader = ["Área", ...ocpHeaders];
  const raciRows = [raciHeader];
  for (const node of ctx.structure.nodes) {
    const row: string[] = [`${node.code} · ${node.name}`];
    for (const ocp of ctx.ocps) {
      const link = node.ocpLinks.find((l) => l.ocpId === ocp.id);
      row.push(link?.raciRole ?? "");
    }
    raciRows.push(row);
  }
  const wsRaci = XLSX.utils.aoa_to_sheet(raciRows);
  XLSX.utils.book_append_sheet(wb, wsRaci, "Matriz RACI");

  // Hoja Comités
  const committees = ctx.structure.nodes.filter((n) => n.nodeType === "comite" || n.nodeType === "auditoria");
  if (committees.length > 0) {
    const comRows = committees.map((c) => ({
      Código: c.code,
      Nombre: c.name,
      Tipo: getNodeTypeDef(c.nodeType)?.label ?? c.nodeType,
      Responsable: c.responsibleRole ?? "",
      "OCPs supervisados": c.ocpLinks.map((l) => `${l.ocp.code} (${l.raciRole})`).join("; "),
      "Políticas que aplica": c.policyLinks.map((p) => p.politica.code).join("; "),
    }));
    const wsCom = XLSX.utils.json_to_sheet(comRows);
    XLSX.utils.book_append_sheet(wb, wsCom, "Comités");
  }

  XLSX.writeFile(
    wb,
    `estructura-${ctx.cycle.name.replace(/\s+/g, "-")}-${ctx.structure.type}.xlsx`,
  );
}

// ───────────────────────────────────────────────────────────────────────
// PDF profesional con portada + diagrama + RACI + áreas + comités
// ───────────────────────────────────────────────────────────────────────

export async function exportOrgPdf(ctx: ExportOrgContext, canvasElement: HTMLElement | null) {
  if (!ctx.structure) return;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
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
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    const c = opts.color ?? [40, 40, 50];
    doc.setTextColor(c[0], c[1], c[2]);
    const lines = doc.splitTextToSize(text, pageW - margin * 2);
    ensureSpace(lines.length * (size + 4));
    doc.text(lines, margin, y);
    y += lines.length * (size + 4) + (opts.spacing ?? 4);
  }
  function divider() {
    ensureSpace(16);
    doc.setDrawColor(220, 220, 230);
    doc.line(margin, y, pageW - margin, y);
    y += 12;
  }

  // PORTADA
  doc.setFillColor(4, 44, 83);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.text("Estructura Organizacional", margin, 180);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(15);
  doc.text(ctx.organization.name, margin, 220);
  doc.setFontSize(11);
  doc.setTextColor(200, 220, 240);
  doc.text(`Tipo: ${ctx.structure.type.replace("_", " ").toUpperCase()}`, margin, 250);
  doc.text(`Ciclo: ${ctx.cycle.name} · ${ctx.cycle.yearStart}–${ctx.cycle.yearEnd}`, margin, 270);
  doc.text(`Generado: ${new Date().toLocaleDateString("es-PE")}`, margin, 290);
  doc.setFontSize(8);
  doc.setTextColor(160, 180, 210);
  doc.text("Estratega · Plataforma de planeamiento estratégico", margin, pageH - 30);

  // DIAGRAMA DEL ORGANIGRAMA
  if (canvasElement) {
    try {
      const png = await toPng(canvasElement, {
        backgroundColor: "rgba(139, 21, 16, 0.08)",
        pixelRatio: 2,
        filter: (node) => {
          const cls = (node as HTMLElement).className ?? "";
          if (typeof cls === "string") {
            return !cls.includes("react-flow__panel") &&
              !cls.includes("react-flow__minimap") &&
              !cls.includes("react-flow__controls") &&
              !cls.includes("react-flow__attribution");
          }
          return true;
        },
      });
      doc.addPage();
      y = margin;
      paragraph("Diagrama del organigrama", { size: 18, bold: true, spacing: 12 });
      const imgW = pageW - margin * 2;
      const imgH = (canvasElement.clientHeight / canvasElement.clientWidth) * imgW;
      const finalH = Math.min(imgH, pageH - y - margin);
      doc.addImage(png, "PNG", margin, y, imgW, finalH);
      y += finalH + 12;
    } catch {}
  }

  // MATRIZ RACI
  doc.addPage();
  y = margin;
  paragraph("Matriz de responsabilidades (RACI)", { size: 18, bold: true, spacing: 8 });
  paragraph("R Responsable · A Accountable · C Consultado · I Informado · S Apoyo", {
    size: 9,
    color: [120, 120, 130],
    spacing: 10,
  });

  const cellW = Math.max(24, Math.min(60, (pageW - margin * 2 - 200) / Math.max(1, ctx.ocps.length)));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 90);
  let x = margin + 200;
  doc.text("Área", margin, y);
  for (const ocp of ctx.ocps) {
    doc.text(ocp.code, x, y, { maxWidth: cellW });
    x += cellW;
  }
  y += 14;
  doc.setDrawColor(220, 220, 230);
  doc.line(margin, y - 6, pageW - margin, y - 6);

  for (const node of ctx.structure.nodes) {
    ensureSpace(16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 50);
    doc.text(`${node.code} · ${node.name}`.slice(0, 28), margin, y, { maxWidth: 195 });
    x = margin + 200;
    for (const ocp of ctx.ocps) {
      const link = node.ocpLinks.find((l) => l.ocpId === ocp.id);
      if (link) {
        doc.setFont("helvetica", "bold");
        doc.text(link.raciRole, x, y);
        doc.setFont("helvetica", "normal");
      } else {
        doc.setTextColor(180, 180, 190);
        doc.text("·", x, y);
        doc.setTextColor(40, 40, 50);
      }
      x += cellW;
    }
    y += 14;
  }

  // LISTADO DE ÁREAS
  doc.addPage();
  y = margin;
  paragraph("Listado de áreas", { size: 18, bold: true, spacing: 10 });
  for (const node of ctx.structure.nodes) {
    ensureSpace(60);
    paragraph(`${node.code} · ${node.name}`, { size: 13, bold: true, spacing: 4 });
    paragraph(`Tipo: ${getNodeTypeDef(node.nodeType)?.label ?? node.nodeType} · Origen: ${node.origin}`, {
      size: 9,
      color: [110, 110, 120],
      spacing: 4,
    });
    if (node.responsibleRole) paragraph(`Responsable: ${node.responsibleRole}`, { size: 10, spacing: 2 });
    if (node.ftesEstimated != null) paragraph(`FTEs: ${node.ftesEstimated}`, { size: 10, spacing: 2 });
    if (node.ocpLinks.length > 0) {
      paragraph(
        `OCPs: ${node.ocpLinks.map((l) => `${l.ocp.code} (${l.raciRole})`).join(", ")}`,
        { size: 10, spacing: 2 },
      );
    }
    if (node.policyLinks.length > 0) {
      paragraph(
        `Políticas: ${node.policyLinks.map((p) => p.politica.code).join(", ")}`,
        { size: 10, spacing: 2 },
      );
    }
    divider();
  }

  // COMITÉS
  const committees = ctx.structure.nodes.filter((n) => n.nodeType === "comite" || n.nodeType === "auditoria");
  if (committees.length > 0) {
    doc.addPage();
    y = margin;
    paragraph("Comités y órganos transversales", { size: 18, bold: true, spacing: 10 });
    for (const c of committees) {
      ensureSpace(40);
      paragraph(`${c.code} · ${c.name}`, { size: 13, bold: true, spacing: 4 });
      if (c.responsibleRole) paragraph(`Responsable: ${c.responsibleRole}`, { size: 10, spacing: 2 });
      if (c.ocpLinks.length > 0) {
        paragraph(`OCPs supervisados: ${c.ocpLinks.map((l) => `${l.ocp.code} (${l.raciRole})`).join(", ")}`, {
          size: 10,
          spacing: 2,
        });
      }
      divider();
    }
  }

  doc.save(`estructura-${ctx.cycle.name.replace(/\s+/g, "-")}-${ctx.structure.type}.pdf`);
}
