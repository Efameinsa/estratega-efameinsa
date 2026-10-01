import { describe, expect, it } from "vitest";
import { projectInitials, quarterRange, toBscCode, statusColor, plural } from "@/lib/pm";
import { computeStats, projectHealth } from "@/lib/pm-stats";
import { computeVector } from "@/lib/peyea-catalog";

const d = (s: string) => new Date(`${s}T12:00:00Z`);
const issue = (p: Partial<Parameters<typeof computeStats>[0][number]>) => ({
  projectId: "p1",
  parentId: null,
  dueDate: null,
  estimateHours: null,
  timeSpent: null,
  status: { category: "TODO" },
  ...p,
});

describe("lib/pm", () => {
  it("convierte perspectivas BSC de distintos formatos", () => {
    expect(toBscCode("FIN")).toBe("FIN");
    expect(toBscCode("cliente")).toBe("CLI");
    expect(toBscCode("procesos_internos")).toBe("INT");
    expect(toBscCode("aprendizaje_crecimiento")).toBe("APR");
    expect(toBscCode(null)).toBe("FIN");
  });

  it("calcula el rango de cada trimestre", () => {
    const q2 = quarterRange(2026, "Q2");
    expect(q2.start.toISOString().slice(0, 10)).toBe("2026-04-01");
    expect(q2.end.toISOString().slice(0, 10)).toBe("2026-06-30");
    const q4 = quarterRange(2026, "Q4");
    expect(q4.end.toISOString().slice(0, 10)).toBe("2026-12-31");
  });

  it("genera iniciales legibles ignorando el prefijo del OCP", () => {
    expect(projectInitials({ name: "OCP1.1 · Incrementar las ventas anuales", key: "OCP1-26" })).toBe("IV");
    expect(projectInitials({ name: "Plan de marketing digital", key: "PMD" })).toBe("PM");
  });

  it("usa el color del estado o el de su categoría", () => {
    expect(statusColor({ color: "#123456", category: "TODO" })).toBe("#123456");
    // 29-09-2026: paleta del CRM (verde de «terminado» = #1e7f4f, el de PROJECT_COLORS).
    expect(statusColor({ color: null, category: "DONE" })).toBe("#1e7f4f");
    expect(plural(1, "proyecto", "proyectos")).toBe("1 proyecto");
    expect(plural(3, "proyecto", "proyectos")).toBe("3 proyectos");
  });
});

describe("lib/pm-stats", () => {
  const now = d("2026-07-01").getTime();

  it("mide el avance solo con tareas principales y cuenta vencidas", () => {
    const s = computeStats(
      [
        issue({ status: { category: "DONE" } }),
        issue({ status: { category: "IN_PROGRESS" }, dueDate: d("2026-06-01"), estimateHours: 4, timeSpent: 5 }),
        issue({ dueDate: d("2026-08-01") }),
        issue({ parentId: "x", status: { category: "DONE" } }),
        issue({ parentId: "x", dueDate: d("2026-06-15") }),
      ],
      now,
    );
    expect(s.total).toBe(3);
    expect(s.done).toBe(1);
    expect(s.progress).toBe(33);
    expect(s.overdue).toBe(2);
    expect(s.estimate).toBe(4);
    expect(s.spent).toBe(5);
  });

  it("clasifica la salud según el tiempo transcurrido", () => {
    const start = d("2026-01-01");
    const end = d("2026-12-31");
    const stats = (progress: number, overdue = 0) => ({ total: 10, done: progress / 10, inProgress: 0, todo: 0, overdue, progress, estimate: 0, spent: 0 });
    // A mitad de año se esperaría ~50 %
    expect(projectHealth(stats(50), end, start, now)).toBe("EN_CAMINO");
    expect(projectHealth(stats(35), end, start, now)).toBe("ATENCION");
    expect(projectHealth(stats(10), end, start, now)).toBe("EN_RIESGO");
    expect(projectHealth(stats(100), end, start, now)).toBe("COMPLETADO");
    expect(projectHealth({ ...stats(0), total: 0 }, end, start, now)).toBe("SIN_TAREAS");
    // Proyecto vencido sin terminar
    expect(projectHealth(stats(90), d("2026-06-01"), start, now)).toBe("EN_RIESGO");
  });
});


describe("PEYEA", () => {
  it("ubica el vector en el cuadrante correcto", () => {
    const agresivo = computeVector({ FF: [6, 6], VC: [6, 6], EE: [6, 6], FI: [6, 6] });
    expect(agresivo.quadrant).toBe("agresivo");
    expect(agresivo.x).toBeCloseTo(5); // FI 6 + VC −1
    expect(agresivo.y).toBeCloseTo(5); // FF 6 + EE −1
    const defensivo = computeVector({ FF: [1], VC: [1], EE: [1], FI: [1] });
    expect(defensivo.quadrant).toBe("defensivo");
    expect(defensivo.x).toBeCloseTo(-5);
    // los valores reales nunca salen de ±5: el gráfico no necesita escala ±12
    for (const v of [agresivo, defensivo]) expect(Math.max(Math.abs(v.x), Math.abs(v.y))).toBeLessThanOrEqual(5);
  });
});
