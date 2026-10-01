"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Circle, Compass, Search, Lightbulb, Rocket, BarChart3, type LucideIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type ModuleId = "M1" | "M2" | "M3" | "M4" | "M5";

const MODULES: Record<ModuleId, { title: string; subtitle: string; icon: LucideIcon; color: string; next?: { label: string; href: string } }> = {
  M1: { title: "Identidad estratégica", subtitle: "Visión, misión, valores e intereses: el norte de la organización.", icon: Compass, color: "#185fa5", next: { label: "M2 · Diagnóstico", href: "m2-diagnosis" } },
  M2: { title: "Diagnóstico", subtitle: "Análisis externo (PESTEC, Porter, MEFE, MPC) e interno (AMOFHIT, MEFI).", icon: Search, color: "#b45309", next: { label: "M3 · Formulación", href: "m3-formulation" } },
  M3: { title: "Formulación", subtitle: "De las matrices a las estrategias retenidas y los objetivos de largo plazo.", icon: Lightbulb, color: "#8B1510", next: { label: "M4 · Implementación", href: "m4-deployment" } },
  M4: { title: "Implementación", subtitle: "Objetivos de corto plazo, políticas, estructura y recursos.", icon: Rocket, color: "#be185d", next: { label: "M5 · Control (BSC)", href: "m5-control" } },
  M5: { title: "Control · Balanced Scorecard", subtitle: "KPIs, tablero, alertas, revisiones y el portafolio que ejecuta el plan.", icon: BarChart3, color: "#1e7f4f", next: { label: "Portafolio de proyectos", href: "/portfolio" } },
};

/** Índice de módulo: herramientas en orden, estado de cada una y paso siguiente. */
export function ModuleOverview({ module }: { module: ModuleId }) {
  const { cycleId } = useParams<{ cycleId: string }>();
  const { data, isLoading } = trpc.cycle.sections.useQuery({ cycleId });
  const meta = MODULES[module];
  const Icon = meta.icon;
  const sections = data?.sections.filter((s) => s.module === module) ?? [];
  const status = data?.modules[module];
  const firstOpen = sections.find((s) => !s.done);
  const hrefOf = (path: string) => (path.startsWith("/") ? path : `/cycles/${cycleId}/${path}`);
  const nextHref = meta.next ? (meta.next.href.startsWith("/") ? meta.next.href : `/cycles/${cycleId}/${meta.next.href}`) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <span className="flex size-12 items-center justify-center rounded-2xl" style={{ background: `${meta.color}1f`, color: meta.color }}>
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
            Módulo {module.slice(1)}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{meta.title}</h1>
          <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
        </div>
        {status && (
          <div className="w-56 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {status.done} de {status.total} herramientas
              </span>
              <span className="font-semibold">{status.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${status.progress}%`, background: meta.color }} />
            </div>
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : (
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s, i) => {
            const isNext = firstOpen?.key === s.key;
            return (
              <li key={s.key}>
                <Link
                  href={hrefOf(s.path)}
                  className={cn(
                    "group flex h-full flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50",
                    isNext && "border-primary/60 ring-1 ring-primary/30",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{i + 1}</span>
                    <span className="flex-1 font-medium group-hover:text-primary">{s.label}</span>
                    {s.done ? (
                      <CheckCircle2 className="size-5 text-success" aria-label="Completado" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground/50" aria-label="Pendiente" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                  <span className={cn("mt-auto inline-flex items-center gap-1 text-xs font-medium", isNext ? "text-primary" : "text-muted-foreground")}>
                    {s.done ? "Revisar" : isNext ? "Continuar aquí" : "Abrir"} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      {meta.next && nextHref && (
        <Link
          href={nextHref}
          className="flex items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5 transition-colors hover:border-primary/60 hover:bg-primary/10"
        >
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Siguiente paso</p>
            <p className="font-semibold">{meta.next.label}</p>
            <p className="text-sm text-muted-foreground">
              {status?.status === "COMPLETADO"
                ? "Este módulo está completo. Continúa con el siguiente."
                : "Puedes avanzar cuando termines las herramientas de este módulo."}
            </p>
          </div>
          <ArrowRight className="size-5 text-primary" />
        </Link>
      )}
    </div>
  );
}
