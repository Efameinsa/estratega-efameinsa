"use client";

// Envoltorios que cargan las librerías de exportación (jspdf, xlsx, docx,
// html-to-image) solo cuando el usuario exporta, fuera del bundle inicial.

export async function exportResourcesPdf(...args: Parameters<typeof import("./resources-export")["exportResourcesPdf"]>) {
  return (await import("./resources-export")).exportResourcesPdf(...args);
}
export async function exportResourcesExcel(...args: Parameters<typeof import("./resources-export")["exportResourcesExcel"]>) {
  return (await import("./resources-export")).exportResourcesExcel(...args);
}
export async function exportOrgPdf(...args: Parameters<typeof import("./org-export")["exportOrgPdf"]>) {
  return (await import("./org-export")).exportOrgPdf(...args);
}
export async function exportOrgExcel(...args: Parameters<typeof import("./org-export")["exportOrgExcel"]>) {
  return (await import("./org-export")).exportOrgExcel(...args);
}
export async function exportCanvasPng(...args: Parameters<typeof import("./org-export")["exportCanvasPng"]>) {
  return (await import("./org-export")).exportCanvasPng(...args);
}
export async function exportCanvasSvg(...args: Parameters<typeof import("./org-export")["exportCanvasSvg"]>) {
  return (await import("./org-export")).exportCanvasSvg(...args);
}
export async function exportPolicyManualPdf(...args: Parameters<typeof import("./policy-export")["exportPolicyManualPdf"]>) {
  return (await import("./policy-export")).exportPolicyManualPdf(...args);
}
export async function exportPolicyManualDocx(...args: Parameters<typeof import("./policy-export")["exportPolicyManualDocx"]>) {
  return (await import("./policy-export")).exportPolicyManualDocx(...args);
}
export async function exportPolicyManualHtml(...args: Parameters<typeof import("./policy-export")["exportPolicyManualHtml"]>) {
  return (await import("./policy-export")).exportPolicyManualHtml(...args);
}
export async function exportAlertsExcel(...args: Parameters<typeof import("./alerts-export")["exportAlertsExcel"]>) {
  return (await import("./alerts-export")).exportAlertsExcel(...args);
}
export async function exportKpiPdf(...args: Parameters<typeof import("./kpi-export")["exportKpiPdf"]>) {
  return (await import("./kpi-export")).exportKpiPdf(...args);
}
export async function exportKpiExcel(...args: Parameters<typeof import("./kpi-export")["exportKpiExcel"]>) {
  return (await import("./kpi-export")).exportKpiExcel(...args);
}
export async function exportReviewPdf(...args: Parameters<typeof import("./review-export")["exportReviewPdf"]>) {
  return (await import("./review-export")).exportReviewPdf(...args);
}
export async function exportReviewDocx(...args: Parameters<typeof import("./review-export")["exportReviewDocx"]>) {
  return (await import("./review-export")).exportReviewDocx(...args);
}
export async function exportDashboardPdf(...args: Parameters<typeof import("./dashboard-export")["exportDashboardPdf"]>) {
  return (await import("./dashboard-export")).exportDashboardPdf(...args);
}
export async function exportDashboardExcel(...args: Parameters<typeof import("./dashboard-export")["exportDashboardExcel"]>) {
  return (await import("./dashboard-export")).exportDashboardExcel(...args);
}
export async function exportDashboardPng(...args: Parameters<typeof import("./dashboard-export")["exportDashboardPng"]>) {
  return (await import("./dashboard-export")).exportDashboardPng(...args);
}
