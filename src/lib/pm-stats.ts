// Métricas de avance y salud de proyectos (lógica pura, probada en tests/).

export type IssueLite = {
  projectId: string;
  parentId: string | null;
  dueDate: Date | null;
  estimateHours: number | null;
  timeSpent: number | null;
  status: { category: string } | null;
};

export function computeStats(issues: IssueLite[], now = Date.now()) {
  // El avance se mide sobre tareas principales; las subtareas pesan dentro de su padre.
  const top = issues.filter((i) => !i.parentId);
  const total = top.length;
  const done = top.filter((i) => i.status?.category === "DONE").length;
  const inProgress = top.filter((i) => i.status?.category === "IN_PROGRESS").length;
  const overdue = issues.filter(
    (i) => i.dueDate && i.dueDate.getTime() < now && i.status?.category !== "DONE",
  ).length;
  const estimate = issues.reduce((a, i) => a + (i.estimateHours ?? 0), 0);
  const spent = issues.reduce((a, i) => a + (i.timeSpent ?? 0), 0);
  return {
    total,
    done,
    inProgress,
    todo: total - done - inProgress,
    overdue,
    progress: total ? Math.round((done / total) * 100) : 0,
    estimate,
    spent,
  };
}

export function projectHealth(stats: ReturnType<typeof computeStats>, endDate: Date | null, startDate: Date | null, now = Date.now()) {
  if (stats.total === 0) return "SIN_TAREAS" as const;
  if (stats.progress === 100) return "COMPLETADO" as const;
  // Avance esperado según el tiempo transcurrido del proyecto.
  if (startDate && endDate && endDate > startDate) {
    const elapsed = (now - startDate.getTime()) / (endDate.getTime() - startDate.getTime());
    const expected = Math.min(100, Math.max(0, elapsed * 100));
    if (stats.progress + 25 < expected || (endDate.getTime() < now && stats.progress < 100)) return "EN_RIESGO" as const;
    if (stats.progress + 10 < expected || stats.overdue > 0) return "ATENCION" as const;
  } else if (stats.overdue > 0) {
    return "ATENCION" as const;
  }
  return "EN_CAMINO" as const;
}

export type Stats = ReturnType<typeof computeStats>;

/** Construye las métricas a partir de conteos ya agregados (p. ej. en SQL). */
export function statsFromCounts(c: { total: number; done: number; inProgress: number; overdue: number; estimate: number; spent: number }): Stats {
  return {
    ...c,
    todo: c.total - c.done - c.inProgress,
    progress: c.total ? Math.round((c.done / c.total) * 100) : 0,
  };
}

/** Suma métricas de varios proyectos (portafolio, programa, total). */
export function sumStats(list: Stats[]): Stats {
  const z = { total: 0, done: 0, inProgress: 0, overdue: 0, estimate: 0, spent: 0 };
  for (const s of list) {
    z.total += s.total;
    z.done += s.done;
    z.inProgress += s.inProgress;
    z.overdue += s.overdue;
    z.estimate += s.estimate;
    z.spent += s.spent;
  }
  return statsFromCounts(z);
}
