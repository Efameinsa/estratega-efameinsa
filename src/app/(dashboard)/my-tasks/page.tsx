"use client";

import React, { useMemo } from "react";
import { colorDeMarca } from "@/lib/pm";
import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { CheckCircle2, Diamond, Inbox } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { EmptyState, PriorityFlag, StatusPill, friendlyDate, dueTone, localDay } from "@/components/pm/primitives";

const BUCKETS = [
  { key: "overdue", label: "Vencidas", tone: "#b3261e" },
  { key: "today", label: "Hoy", tone: "#b45309" },
  { key: "week", label: "Próximos 7 días", tone: "#185fa5" },
  { key: "later", label: "Más adelante", tone: "#8B1510" },
  { key: "none", label: "Sin fecha", tone: "#64748b" },
] as const;

export default function MyTasksPage() {
  const { data = [], isLoading } = trpc.pm.myTasks.useQuery();

  const grouped = useMemo(() => {
    const g: Record<string, typeof data> = { overdue: [], today: [], week: [], later: [], none: [] };
    for (const t of data) {
      const d = localDay(t.dueDate);
      if (!d) g.none.push(t);
      else {
        const diff = differenceInCalendarDays(d, new Date());
        if (diff < 0) g.overdue.push(t);
        else if (diff === 0) g.today.push(t);
        else if (diff <= 7) g.week.push(t);
        else g.later.push(t);
      }
    }
    return g;
  }, [data]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mis tareas</h1>
        <p className="text-sm text-muted-foreground">Todo lo que tienes asignado en los proyectos activos, ordenado por urgencia.</p>
      </div>
      {isLoading && <div className="h-40 animate-pulse rounded-xl bg-muted/40" />}
      {!isLoading && data.length === 0 && (
        <EmptyState icon={CheckCircle2} title="No tienes tareas pendientes" description="Cuando te asignen tareas en un proyecto aparecerán aquí." />
      )}
      {BUCKETS.map((b) =>
        grouped[b.key].length ? (
          <section key={b.key} className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: b.tone }}>
              {b.label}
              <span className="rounded-full bg-muted px-1.5 text-xs font-normal text-muted-foreground">{grouped[b.key].length}</span>
            </h2>
            <div className="overflow-hidden rounded-xl border bg-card">
              {grouped[b.key].map((t) => (
                <Link
                  key={t.id}
                  href={`/projects/${t.project.id}/list?task=${t.id}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 border-b px-4 py-2.5 text-sm last:border-b-0 hover:bg-accent/30 md:grid-cols-[1fr_180px_110px_90px_80px]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {t.type === "MILESTONE" && <Diamond className="size-3.5 shrink-0 text-amber-700" fill="currentColor" />}
                    <span className="min-w-0">
                      <span className="block truncate">{t.summary}</span>
                      {t.parent && <span className="block truncate text-xs text-muted-foreground">en {t.parent.summary}</span>}
                    </span>
                  </span>
                  <span className="hidden min-w-0 items-center gap-1.5 text-xs text-muted-foreground md:flex">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: colorDeMarca(t.project.color) ?? "#8B1510" }} />
                    <span className="truncate">{t.project.name}</span>
                  </span>
                  <span className="hidden md:block">
                    <StatusPill status={t.status as never} />
                  </span>
                  <span className="hidden md:block">
                    <PriorityFlag priority={t.priority} showLabel />
                  </span>
                  <span className={`text-right text-xs ${dueTone(t.dueDate, false)}`}>{t.dueDate ? friendlyDate(t.dueDate) : "—"}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null,
      )}
      {!isLoading && data.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Inbox className="size-3.5" /> Las tareas completadas desaparecen de esta vista.
        </p>
      )}
    </div>
  );
}
