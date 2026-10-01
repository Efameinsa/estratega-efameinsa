"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, Plus, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PROJECT_STATUS, colorDeMarca, projectInitials } from "@/lib/pm";
import { EmptyState, HealthBadge, ProgressBar, UserAvatar, friendlyDate } from "@/components/pm/primitives";
import { NewProjectDialog } from "@/components/pm/portfolio-page";

export default function ProjectsPage() {
  const { data, isLoading } = trpc.pm.portfolioTree.useQuery();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("ACTIVE");
  const [open, setOpen] = useState(false);

  const projects = useMemo(() => {
    if (!data) return [];
    const all = [
      ...data.tree.flatMap((pf) => [...pf.programs.flatMap((pg) => pg.projects), ...pf.directProjects].map((p) => ({ ...p, portfolioName: pf.name }))),
      ...data.unassigned.map((p) => ({ ...p, portfolioName: null as string | null })),
    ];
    return all.filter((p) => (status === "ALL" || p.status === status) && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
  }, [data, q, status]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Proyectos</h1>
          <p className="text-sm text-muted-foreground">Todos los proyectos de la organización y su avance.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Nuevo proyecto
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-9 w-64 items-center gap-2 rounded-md border px-2">
          <Search className="size-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar proyecto…" className="w-full bg-transparent text-sm outline-none" />
        </div>
        {[["ACTIVE", "En curso"], ["ON_HOLD", "En pausa"], ["COMPLETED", "Completados"], ["ALL", "Todos"]].map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setStatus(k)}
            className={cn("h-9 rounded-md border px-3 text-sm", status === k ? "border-primary/60 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            {l}
          </button>
        ))}
      </div>
      {isLoading && <div className="h-40 animate-pulse rounded-xl bg-muted/40" />}
      {!isLoading && projects.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title="No hay proyectos aquí"
          description="Genera los proyectos desde el plan estratégico en Portafolio o crea uno en blanco."
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(true)}>
                Nuevo proyecto
              </Button>
              <Link href="/portfolio" className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
                Ir a Portafolio
              </Link>
            </div>
          }
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}/overview`} className="group space-y-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: colorDeMarca(p.color) ?? "#8B1510" }}>
                {projectInitials(p)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium group-hover:text-primary">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">{p.portfolioName ?? "Sin portafolio"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ProgressBar value={p.stats.progress} color={colorDeMarca(p.color) ?? undefined} />
              <span className="text-xs tabular-nums">{p.stats.progress}%</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HealthBadge health={p.health} />
              <span>
                {p.stats.done}/{p.stats.total} tareas
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                {p.endDate && <span>{friendlyDate(p.endDate)}</span>}
                <UserAvatar user={p.owner} size={20} />
              </span>
            </div>
            {p.status !== "ACTIVE" && <span className="text-xs text-muted-foreground">{PROJECT_STATUS[p.status]?.label}</span>}
          </Link>
        ))}
      </div>
      <NewProjectDialog open={open} onOpenChange={setOpen} portfolios={data?.tree ?? []} />
    </div>
  );
}
