import { beforeAll, describe, expect, it } from "vitest";
import { callerFor, db, makeOrg } from "./helpers";

// Recorrido del plan: cómo avanza cada estadío y cómo llega al BSC.
describe("recorrido del ciclo estratégico", () => {
  let ctx: Awaited<ReturnType<typeof makeOrg>>;
  // Un caller nuevo por llamada = una petición HTTP nueva (el avance se memoiza por petición).
  let owner: Awaited<ReturnType<typeof makeOrg>>["owner"];
  const api = () => callerFor(owner);
  const base = () => ({ organizationId: ctx.org.id, cycleId: ctx.cycle.id });

  beforeAll(async () => {
    ctx = await makeOrg();
    owner = ctx.owner;
  });

  it("un ciclo vacío empieza por la Visión y todo está pendiente", async () => {
    const { sections, modules } = await api().cycle.sections({ cycleId: ctx.cycle.id });
    expect(sections.every((s) => !s.done)).toBe(true);
    expect(modules.M1).toMatchObject({ status: "EN_CURSO", progress: 0 });
    expect(modules.M2.status).toBe("BLOQUEADO");
    const next = await api().cycle.getNextStep({ cycleId: ctx.cycle.id });
    expect(next?.title).toBe("Visión");
    expect(next?.path).toBe(`/cycles/${ctx.cycle.id}/m1-identity/vision`);
  });

  it("completar M1 habilita M2 y el siguiente paso pasa a PESTEC", async () => {
    await db.vision.create({ data: { ...base(), text: "Ser líderes en servicios integrales del Perú al 2030." } });
    await db.mission.create({ data: { ...base(), text: "Brindamos servicios confiables." } });
    await db.value.create({ data: { ...base(), name: "Integridad" } });
    await db.interest.create({ data: { ...base(), description: "Crecer en regiones", intensity: "vital" } });
    const p = await api().cycle.getProgress({ cycleId: ctx.cycle.id });
    expect(p.modules.M1).toMatchObject({ status: "COMPLETADO", progress: 100 });
    expect(p.modules.M2.status).toBe("EN_CURSO");
    expect(p.modulesCompleted).toBe(1);
    expect((await api().cycle.getNextStep({ cycleId: ctx.cycle.id }))?.title).toBe("PESTEC");
    const pending = await api().cycle.getPending({ cycleId: ctx.cycle.id });
    expect(pending[0]).toMatchObject({ title: "PESTEC", subtitle: "M2 · Diagnóstico" });
  });

  it("el semáforo del BSC se calcula con metas y valores reales por perspectiva", async () => {
    const mk = async (code: string, dim: string, meta: number, real: number, direction = "mayor_mejor") => {
      await db.kpi.create({
        data: {
          ...base(), code, name: code, dimensionBsc: dim, status: "confirmado", frequency: "trimestral", direction,
          periods: {
            create: [
              { period: "2026-Q1", metaGreen: meta, metaAmber: meta * 0.85, metaRed: meta * 0.7, realValue: real * 0.9 },
              { period: "2026-Q2", metaGreen: meta, metaAmber: meta * 0.85, metaRed: meta * 0.7, realValue: real },
            ],
          },
        },
      });
    };
    await mk("KPI-RE-01", "resultados_economicos", 100, 105); // verde
    await mk("KPI-RE-02", "resultados_economicos", 100, 90); // ámbar (85 %–100 % de la meta)
    await mk("KPI-PM-01", "posicion_mercado", 50, 20); // rojo (bajo el 85 %)
    await mk("KPI-OP-01", "como_opera_empresa", 10, 8, "menor_mejor"); // verde (menos es mejor)

    const c = await api().cycle.cockpit({ cycleId: ctx.cycle.id });
    expect(c.bsc.period).toBe("2026-Q2");
    expect(c.bsc.kpis).toBe(4);
    expect(c.bsc.counts).toMatchObject({ verde: 2, ambar: 1, rojo: 1 });
    const fin = c.bsc.byDim.find((d) => d.dimension === "resultados_economicos")!;
    expect(fin).toMatchObject({ total: 2, verde: 1, ambar: 1 });
    expect(c.bsc.byDim.find((d) => d.dimension === "posicion_mercado")!.rojo).toBe(1);
    // la sección "Tablero BSC" se marca hecha cuando hay valores reales
    const { sections } = await api().cycle.sections({ cycleId: ctx.cycle.id });
    expect(sections.find((s) => s.key === "tablero")?.done).toBe(true);
  });

  it("M5 se completa cuando existe el portafolio (antes nunca llegaba al 100 %)", async () => {
    await db.review.create({
      data: { ...base(), type: "trimestral", period: "2026-Q2", scheduledAt: new Date("2026-07-10"), title: "Revisión Q2" } as never,
    }).catch(async () => {
      // si el modelo exige más campos, basta con que exista una revisión cualquiera
    });
    await db.portfolio.create({ data: { ...base(), name: "Portafolio · Resultados económicos", bscPerspective: "FIN" } });
    const { sections } = await api().cycle.sections({ cycleId: ctx.cycle.id });
    expect(sections.find((s) => s.key === "portfolio")?.done).toBe(true);
  });

  it("las herramientas de M3 rechazan ciclos de otra organización", async () => {
    const other = await makeOrg();
    const intruder = callerFor(other.owner);
    await expect(intruder.pei.getDocument({ cycleId: ctx.cycle.id })).rejects.toThrow(/acceso/);
    await expect(intruder.mcpe.getSetup({ cycleId: ctx.cycle.id })).rejects.toThrow(/acceso/);
    await expect(intruder.rumelt.getSetup({ cycleId: ctx.cycle.id })).rejects.toThrow(/acceso/);
    await expect(intruder.cycle.cockpit({ cycleId: ctx.cycle.id })).rejects.toThrow(/acceso/);
  });
});
