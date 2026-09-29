"use client";

import React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, Clock, Paperclip, Target, TrendingUp, CalendarClock, Diamond, Activity } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { BSC_PERSPECTIVES, toBscCode } from "@/lib/pm";
import { useWorkspace } from "./workspace-context";
import { HealthBadge, ProgressBar, UserAvatar, friendlyDate, dueTone } from "./primitives";

function Ring({ value, size = 96 }: { value: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--muted)" strokeWidth={9} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="var(--primary)"
        strokeWidth={9}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
        className="transition-all duration-700"
      />
    </svg>
  );
}

function Stat({ icon: Icon, label, value, hint, tone }: { icon: React.ElementType; label: string; value: React.ReactNode; hint?: string; tone?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-4" style={{ color: tone }} />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Overview() {
  const { projectId, ws, userById, openTask } = useWorkspace();
  const { data, isLoading } = trpc.pm.summary.useQuery({ projectId });
  const p = ws.project;

  if (isLoading || !data) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando resumen…</div>;
  }
  const s = data.stats;
  const totalByStatus = data.byStatus.reduce((a, b) => a + b.count, 0) || 1;
  const persp = p.ocp?.olp?.bscPerspective ? BSC_PERSPECTIVES[toBscCode(p.ocp.olp.bscPerspective)] : null;
  const meta = p.ocp ? (p.ocp.metaValue != null ? `${p.ocp.metaValue}${p.ocp.unit ? " " + p.ocp.unit : ""}` : p.ocp.metaText) : null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        {/* Avance general */}
        <div className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
          <div className="flex items-center gap-5 rounded-xl border bg-card p-5">
            <div className="relative">
              <Ring value={s.progress} />
              <span className="absolute inset-0 flex items-center justify-center text-xl font-bold tabular-nums">{s.progress}%</span>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Avance del proyecto</p>
              <HealthBadge health={data.health} />
              <p className="text-xs text-muted-foreground">
                {s.done} de {s.total} tareas completadas
                {p.endDate && <> · cierra {friendlyDate(p.endDate)}</>}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat icon={CheckCircle2} label="Completadas" value={s.done} hint={`${s.inProgress} en progreso`} tone="#4ade80" />
            <Stat icon={AlertTriangle} label="Vencidas" value={s.overdue} hint={s.overdue ? "Requieren acción" : "Todo al día"} tone={s.overdue ? "#f87171" : "#94a3b8"} />
            <Stat
              icon={Clock}
              label="Horas registradas"
              value={`${Math.round(s.spent * 10) / 10} h`}
              hint={s.estimate ? `de ${Math.round(s.estimate)} h estimadas` : "Sin estimación"}
              tone="#60a5fa"
            />
            <Stat icon={Paperclip} label="Evidencias" value={data.evidenceCount} hint="archivos adjuntos" tone="#a78bfa" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Estados */}
            <section className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="size-4 text-muted-foreground" /> Tareas por estado
              </h3>
              <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                {data.byStatus.map((b, i) => (
                  <div key={i} style={{ width: `${(b.count / totalByStatus) * 100}%`, background: b.color ?? "#94a3b8" }} title={`${b.name}: ${b.count}`} />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs">
                {data.byStatus.map((b, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm" style={{ background: b.color ?? "#94a3b8" }} />
                    {b.name} <span className="text-muted-foreground">{b.count}</span>
                  </span>
                ))}
              </div>
            </section>

            {/* Carga */}
            <section className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">Carga del equipo</h3>
              {data.byAssignee.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay tareas.</p>}
              <div className="space-y-3">
                {data.byAssignee.map((a) => {
                  const u = a.assigneeId ? userById.get(a.assigneeId) : null;
                  const pct = a.total ? (a.done / a.total) * 100 : 0;
                  return (
                    <div key={a.assigneeId ?? "none"} className="grid grid-cols-[180px_1fr_150px] items-center gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <UserAvatar user={u ?? null} size={24} />
                        <span className="truncate">{u?.name ?? "Sin asignar"}</span>
                      </span>
                      <ProgressBar value={pct} color="#4ade80" />
                      <span className="text-right text-xs text-muted-foreground">
                        {a.done}/{a.total} tareas
                        {a.overdue > 0 && <span className="ml-1 text-red-400">· {a.overdue} vencidas</span>}
                        <br />
                        {Math.round(a.spent * 10) / 10} h{a.estimate ? ` / ${Math.round(a.estimate)} h` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Actividad */}
            <section className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Activity className="size-4 text-muted-foreground" /> Actividad reciente
              </h3>
              {data.activity.length === 0 && <p className="text-sm text-muted-foreground">Sin actividad todavía.</p>}
              <ul className="space-y-2">
                {data.activity.map((h) => {
                  const u = h.userId ? userById.get(h.userId) : null;
                  return (
                    <li key={h.id} className="flex items-center gap-2 text-sm">
                      <UserAvatar user={u ?? null} size={20} />
                      <span className="font-medium">{u?.name ?? "Alguien"}</span>
                      <span className="text-muted-foreground">
                        {h.field === "created" ? "creó" : h.field === "evidence" ? "subió evidencia a" : h.field === "statusId" ? "cambió el estado de" : "actualizó"}
                      </span>
                      <button type="button" onClick={() => openTask(h.issue.id)} className="min-w-0 flex-1 truncate text-left hover:underline">
                        {h.issue.summary}
                      </button>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDistanceToNow(new Date(h.createdAt), { locale: es, addSuffix: true })}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <div className="space-y-6">
            {/* Plan */}
            <section className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Target className="size-4 text-primary" /> Vínculo con el plan estratégico
              </h3>
              {p.ocp ? (
                <dl className="space-y-3 text-sm">
                  {persp && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Perspectiva BSC</dt>
                      <dd className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ background: persp.color }} />
                        {persp.label}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-muted-foreground">Objetivo de largo plazo</dt>
                    <dd className="line-clamp-3">{p.ocp.olp.description}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Objetivo de corto plazo · {p.ocp.code}</dt>
                    <dd className="line-clamp-4">{p.ocp.description}</dd>
                  </div>
                  {meta && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Meta {p.ocp.year}</dt>
                      <dd className="font-medium">{meta}</dd>
                    </div>
                  )}
                  {p.ocp.kpiLinks.length > 0 && (
                    <div>
                      <dt className="text-xs text-muted-foreground">KPIs del Balanced Scorecard</dt>
                      <dd className="mt-1 flex flex-wrap gap-1">
                        {p.ocp.kpiLinks.map((k) => (
                          <Link
                            key={k.kpi.id}
                            href={`/cycles/${p.ocp!.cycleId}/m5-control/kpis`}
                            className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs text-primary hover:bg-primary/20"
                            title={k.kpi.name}
                          >
                            {k.kpi.code}
                          </Link>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Este proyecto no está enlazado a un OCP. Genera los proyectos desde el plan en{" "}
                  <Link href="/portfolio" className="text-primary hover:underline">
                    Portafolio
                  </Link>{" "}
                  para mantener la trazabilidad con el BSC.
                </p>
              )}
            </section>

            {/* Próximos */}
            <section className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <CalendarClock className="size-4 text-muted-foreground" /> Próximos vencimientos
              </h3>
              {data.upcoming.length === 0 && <p className="text-sm text-muted-foreground">No hay tareas pendientes con fecha.</p>}
              <ul className="space-y-1.5">
                {data.upcoming.map((t) => {
                  const u = t.assigneeId ? userById.get(t.assigneeId) : null;
                  return (
                    <li key={t.id}>
                      <button type="button" onClick={() => openTask(t.id)} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-accent/40">
                        {t.type === "MILESTONE" ? <Diamond className="size-3.5 shrink-0 text-amber-300" fill="currentColor" /> : <span className="size-2 shrink-0 rounded-full" style={{ background: t.status?.color ?? "#94a3b8" }} />}
                        <span className="min-w-0 flex-1 truncate">{t.summary}</span>
                        <span className={`shrink-0 text-xs ${dueTone(t.dueDate, false)}`}>{friendlyDate(t.dueDate)}</span>
                        <UserAvatar user={u ?? null} size={18} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            {p.description && (
              <section className="rounded-xl border bg-card p-5">
                <h3 className="mb-2 text-sm font-medium">Descripción</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{p.description}</p>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
