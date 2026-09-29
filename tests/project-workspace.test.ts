import { beforeAll, describe, expect, it } from "vitest";
import { callerFor, db, makeOrg } from "./helpers";

// Espacio de trabajo del proyecto: tareas, subtareas, tablero, dependencias,
// evidencias, horas, equipo y resumen.
describe("gestión del proyecto", () => {
  let ctx: Awaited<ReturnType<typeof makeOrg>>;
  let api: ReturnType<typeof callerFor>;
  let projectId: string;
  let statuses: { id: string; category: string }[];

  beforeAll(async () => {
    ctx = await makeOrg({ members: 1 });
    api = callerFor(ctx.owner);
    const p = await api.pm.createProject({ name: "Campaña de captación", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") });
    projectId = p.id;
    const ws = await api.pm.workspace({ projectId });
    statuses = ws.project.workflows;
  });

  it("crea el proyecto con flujo por defecto y al creador como administrador", async () => {
    const ws = await api.pm.workspace({ projectId });
    expect(ws.project.workflows.map((s) => s.category)).toEqual(["TODO", "IN_PROGRESS", "IN_PROGRESS", "DONE"]);
    expect(ws.project.members[0]).toMatchObject({ userId: ctx.owner.id, role: "ADMIN" });
    expect(ws.users.map((u) => u.id)).toEqual(expect.arrayContaining([ctx.owner.id, ctx.others[0].id]));
  });

  it("numera tareas, crea subtareas y asignar suma a la persona al equipo", async () => {
    const t1 = await api.pm.createTask({ projectId, summary: "Diseñar piezas" });
    const t2 = await api.pm.createTask({ projectId, summary: "Publicar anuncios", assigneeId: ctx.others[0].id });
    const sub = await api.pm.createTask({ projectId, summary: "Boceto", parentId: t1.id });
    expect([t1.number, t2.number, sub.number]).toEqual([1, 2, 3]);
    expect(sub.type).toBe("SUBTASK");
    const members = await db.projectMember.findMany({ where: { projectId } });
    expect(members.map((m) => m.userId)).toContain(ctx.others[0].id);
  });

  it("mover en el tablero cambia estado, orden, fecha de cierre e historial", async () => {
    const tasks = await api.pm.tasks({ projectId });
    const t = tasks.find((x) => x.summary === "Publicar anuncios")!;
    const done = statuses.find((s) => s.category === "DONE")!;
    await api.pm.moveTasks({ projectId, moves: [{ id: t.id, statusId: done.id, sortOrder: 0 }] });
    const after = await db.issue.findUniqueOrThrow({ where: { id: t.id } });
    expect(after.statusId).toBe(done.id);
    expect(after.resolvedAt).not.toBeNull();
    expect(await db.issueHistory.count({ where: { issueId: t.id, field: "statusId" } })).toBe(1);
  });

  it("completar y reabrir subtareas con el checkbox", async () => {
    const sub = (await api.pm.tasks({ projectId })).find((x) => x.summary === "Boceto")!;
    await api.pm.toggleComplete({ id: sub.id, done: true });
    const d = await api.pm.taskDetail({ id: sub.id });
    expect(d.status?.category).toBe("DONE");
    await api.pm.toggleComplete({ id: sub.id, done: false });
    expect((await api.pm.taskDetail({ id: sub.id })).status?.category).toBe("TODO");
  });

  it("dependencias: crea la relación y rechaza ciclos", async () => {
    const tasks = await api.pm.tasks({ projectId });
    const a = tasks.find((x) => x.summary === "Diseñar piezas")!;
    const b = tasks.find((x) => x.summary === "Publicar anuncios")!;
    await api.pm.addDependency({ fromIssueId: a.id, toIssueId: b.id });
    await expect(api.pm.addDependency({ fromIssueId: b.id, toIssueId: a.id })).rejects.toThrow(/ciclo/);
    await expect(api.pm.addDependency({ fromIssueId: a.id, toIssueId: a.id })).rejects.toThrow(/sí misma/);
    const refreshed = await api.pm.tasks({ projectId });
    expect(refreshed.find((x) => x.id === a.id)!.linksFrom.map((l) => l.toIssueId)).toEqual([b.id]);
  });

  it("evidencias y horas quedan registradas y suman al resumen", async () => {
    const a = (await api.pm.tasks({ projectId })).find((x) => x.summary === "Diseñar piezas")!;
    await api.pm.addEvidence({ issueId: a.id, name: "acta.pdf", url: "https://example.com/acta.pdf", size: 1200, mimeType: "application/pdf" });
    await api.issue.logTime({ issueId: a.id, hours: 2.5, date: new Date() });
    const entry = await api.issue.logTime({ issueId: a.id, hours: 1, date: new Date() });
    expect((await db.issue.findUniqueOrThrow({ where: { id: a.id } })).timeSpent).toBe(3.5);
    await api.pm.deleteTimeEntry({ id: entry.id });
    expect((await db.issue.findUniqueOrThrow({ where: { id: a.id } })).timeSpent).toBe(2.5);

    const ev = await api.pm.projectEvidence({ projectId });
    expect(ev).toHaveLength(1);
    expect(ev[0].issue.summary).toBe("Diseñar piezas");

    const s = await api.pm.summary({ projectId });
    expect(s.stats.total).toBe(2);
    expect(s.stats.done).toBe(1);
    expect(s.stats.progress).toBe(50);
    expect(s.stats.spent).toBe(2.5);
    expect(s.evidenceCount).toBe(1);
  });

  it("solo quien registró horas puede borrarlas", async () => {
    const a = (await api.pm.tasks({ projectId })).find((x) => x.summary === "Diseñar piezas")!;
    const entry = await api.issue.logTime({ issueId: a.id, hours: 1, date: new Date() });
    const other = callerFor(ctx.others[0]);
    await expect(other.pm.deleteTimeEntry({ id: entry.id })).rejects.toThrow(/propios/);
  });

  it("'Mis tareas' devuelve lo asignado y pendiente de la persona", async () => {
    const t = await api.pm.createTask({ projectId, summary: "Revisar métricas", assigneeId: ctx.owner.id, dueDate: new Date("2026-03-01") });
    const mine = await api.pm.myTasks();
    expect(mine.map((x) => x.id)).toContain(t.id);
    await api.pm.toggleComplete({ id: t.id, done: true });
    expect((await api.pm.myTasks()).map((x) => x.id)).not.toContain(t.id);
  });
});
