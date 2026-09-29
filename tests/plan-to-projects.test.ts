import { beforeAll, describe, expect, it } from "vitest";
import { callerFor, db, makeOrg } from "./helpers";

// Flujo completo: OLP/OCP del plan → portafolio → proyecto → tareas → avance.
describe("del plan estratégico al portafolio de proyectos", () => {
  let ctx: Awaited<ReturnType<typeof makeOrg>>;
  let api: ReturnType<typeof callerFor>;

  beforeAll(async () => {
    ctx = await makeOrg({ members: 2 });
    api = callerFor(ctx.owner);
    const area = await db.ocpArea.create({
      data: { organizationId: ctx.org.id, cycleId: ctx.cycle.id, key: "comercial", name: "Comercial" },
    });
    const dims = ["FIN", "CLI", "INT"] as const;
    for (const [i, dim] of dims.entries()) {
      const olp = await db.olp.create({
        data: { organizationId: ctx.org.id, cycleId: ctx.cycle.id, description: `OLP ${dim}`, bscPerspective: dim, targetYear: 2030, sortOrder: i },
      });
      // Dos OCP (2026 y 2027) para el primer OLP, uno para los demás.
      const years = i === 0 ? [2026, 2027] : [2026];
      for (const year of years) {
        const ocp = await db.ocp.create({
          data: {
            organizationId: ctx.org.id, cycleId: ctx.cycle.id, olpId: olp.id, code: `OCP${i + 1}.${year - 2025}`,
            description: `Meta ${dim} ${year}`, year, metaValue: 10, unit: "%", responsibleAreaId: area.id, priority: "alta",
            actions: {
              create: [
                { quarter: "Q1", description: "Acción 1", status: "completada" },
                { quarter: "Q3", description: "Acción 2", status: "en_curso" },
              ],
            },
          },
        });
        const kpi = await db.kpi.create({
          data: { organizationId: ctx.org.id, cycleId: ctx.cycle.id, code: `KPI-${dim}-${year}`, name: "Indicador", dimensionBsc: "resultados_economicos" },
        });
        await db.kpiOcp.create({ data: { kpiId: kpi.id, ocpId: ocp.id } });
      }
    }
  });

  it("la vista previa muestra lo que se creará sin crear nada", async () => {
    const preview = await api.pm.planPreview({ cycleId: ctx.cycle.id });
    expect(preview.hasPlan).toBe(true);
    expect(preview.ocpCount).toBe(4);
    expect(preview.tree.map((n) => n.code)).toEqual(["FIN", "CLI", "INT"]);
    expect(preview.tree.every((n) => !n.exists)).toBe(true);
    expect(await db.portfolio.count({ where: { cycleId: ctx.cycle.id } })).toBe(0);
  });

  it("genera portafolios por perspectiva, programas por OLP y proyectos por OCP", async () => {
    const s = await api.pm.generateFromPlan({ cycleId: ctx.cycle.id });
    expect(s).toMatchObject({ portfolios: 3, programs: 3, projects: 4 });
    // 2 acciones + 1 hito por proyecto
    expect(s.tasks).toBe(12);

    const projects = await db.project.findMany({
      where: { orgId: ctx.org.id },
      include: { issues: { include: { status: true } }, portfolio: true, program: true, members: true },
    });
    expect(projects).toHaveLength(4);
    for (const p of projects) {
      expect(p.portfolio?.bscPerspective).toBeTruthy();
      expect(p.program?.olpId).toBeTruthy();
      expect(p.ocpId).toBeTruthy();
      expect(p.members.map((m) => m.userId)).toContain(ctx.owner.id);
      const milestone = p.issues.find((i) => i.type === "MILESTONE");
      expect(milestone?.dueDate?.toISOString().slice(5, 10)).toBe("12-31");
      // el estado de la acción del OCP se traslada a la tarea
      expect(p.issues.find((i) => i.summary === "Acción 1")?.status?.category).toBe("DONE");
      expect(p.issues.find((i) => i.summary === "Acción 2")?.status?.category).toBe("IN_PROGRESS");
      // la trazabilidad con el KPI del BSC queda en la descripción
      expect(p.description).toContain("KPIs del BSC");
    }
  });

  it("volver a generar no duplica nada", async () => {
    const again = await api.pm.generateFromPlan({ cycleId: ctx.cycle.id });
    expect(again).toMatchObject({ portfolios: 0, programs: 0, projects: 0, tasks: 0, skipped: 4 });
    expect(await db.project.count({ where: { orgId: ctx.org.id } })).toBe(4);
  });

  it("el árbol del portafolio agrega avance por nivel", async () => {
    const tree = await api.pm.portfolioTree({ cycleId: ctx.cycle.id });
    expect(tree.totals.projects).toBe(4);
    // 1 de 3 tareas principales hechas por proyecto → 33 %
    expect(tree.totals.progress).toBe(33);
    const fin = tree.tree.find((p) => p.bscPerspective === "FIN")!;
    expect(fin.programs[0].projects).toHaveLength(2);
    expect(fin.stats.projects).toBe(2);
  });

  it("otra organización no puede leer ni generar sobre este ciclo", async () => {
    const other = await makeOrg();
    const intruder = callerFor(other.owner);
    await expect(intruder.pm.planPreview({ cycleId: ctx.cycle.id })).rejects.toThrow(/acceso/);
    const p = await db.project.findFirstOrThrow({ where: { orgId: ctx.org.id } });
    await expect(intruder.pm.tasks({ projectId: p.id })).rejects.toThrow(/acceso/);
  });
});
