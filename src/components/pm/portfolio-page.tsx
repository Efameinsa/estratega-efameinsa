"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Briefcase, ChevronDown, ChevronRight, FolderKanban, Layers, Plus, Sparkles, Target, AlertTriangle, CheckCircle2,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { BSC_PERSPECTIVES, PROJECT_COLORS, toBscCode, projectInitials, plural, colorDeMarca } from "@/lib/pm";
import type { RouterOutputs } from "./types";
import { HealthBadge, ProgressBar, UserAvatar, dayToDate, friendlyDate } from "./primitives";

type TreeData = RouterOutputs["pm"]["portfolioTree"];
type ProjectRow = TreeData["unassigned"][number];

export function PortfolioPage() {
  const { data: cycles } = trpc.cycle.list.useQuery();
  const [pickedCycle, setCycleId] = useState<string>("");
  const cycleId = pickedCycle || (cycles?.find((c) => c.status === "IN_PROGRESS") ?? cycles?.[0])?.id || "";

  const { data, isLoading } = trpc.pm.portfolioTree.useQuery(cycleId ? { cycleId } : undefined, { enabled: !!cycles });
  const [genOpen, setGenOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const empty = !isLoading && data && data.tree.length === 0 && data.unassigned.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Ejecución de la estrategia</p>
          <h1 className="text-2xl font-semibold tracking-tight">Portafolio de proyectos</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Del Balanced Scorecard a la acción: cada perspectiva es un portafolio, cada objetivo de largo plazo un programa y cada objetivo de corto plazo un proyecto con sus tareas.
          </p>
        </div>
        {cycles && cycles.length > 1 && (
          <select value={cycleId} onChange={(e) => setCycleId(e.target.value)} className="h-9 rounded-md border bg-popover px-2 text-sm">
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <Button variant="outline" onClick={() => setNewOpen(true)}>
          <Plus className="size-4" /> Nuevo proyecto
        </Button>
        <Button onClick={() => setGenOpen(true)} disabled={!cycleId}>
          <Sparkles className="size-4" /> Generar desde el plan
        </Button>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-xl bg-muted/40" />}

      {data && !empty && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi icon={FolderKanban} label="Proyectos" value={data.totals.projects} />
          <Kpi icon={CheckCircle2} label="Avance global" value={`${data.totals.progress}%`} bar={data.totals.progress} />
          <Kpi icon={AlertTriangle} label="Proyectos en riesgo" value={data.totals.atRisk} tone={data.totals.atRisk ? "#b3261e" : undefined} />
          <Kpi icon={ListChecks} label="Tareas vencidas" value={data.totals.overdue} tone={data.totals.overdue ? "#b45309" : undefined} />
        </div>
      )}

      {empty && <EmptyPortfolio onGenerate={() => setGenOpen(true)} onNew={() => setNewOpen(true)} />}

      {data?.tree.map((pf) => <PortfolioCard key={pf.id} pf={pf} />)}

      {data && data.unassigned.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Proyectos fuera de un portafolio</h2>
          <div className="overflow-hidden rounded-xl border bg-card">
            {data.unassigned.map((p) => (
              <ProjectLine key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {cycleId && <GenerateDialog open={genOpen} onOpenChange={setGenOpen} cycleId={cycleId} />}
      <NewProjectDialog open={newOpen} onOpenChange={setNewOpen} portfolios={data?.tree ?? []} />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, bar, tone }: { icon: React.ElementType; label: string; value: React.ReactNode; bar?: number; tone?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-4" style={{ color: tone }} /> {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums" style={{ color: tone }}>
        {value}
      </p>
      {bar != null && <ProgressBar value={bar} className="mt-2" />}
    </div>
  );
}

function EmptyPortfolio({ onGenerate, onNew }: { onGenerate: () => void; onNew: () => void }) {
  const steps = [
    { icon: Target, title: "Perspectiva BSC", sub: "Portafolio" },
    { icon: Layers, title: "Objetivo de largo plazo", sub: "Programa" },
    { icon: Briefcase, title: "Objetivo de corto plazo", sub: "Proyecto" },
    { icon: ListChecks, title: "Acciones trimestrales", sub: "Tareas e hitos" },
  ];
  return (
    <div className="rounded-2xl border bg-card p-8 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Sparkles className="size-7" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">Convierte tu plan en proyectos ejecutables</h2>
      <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
        Estratega lee los OLP, OCP y acciones que definiste en los módulos 3 y 4 y arma el portafolio completo, listo para asignar responsables, fechas y evidencias.
      </p>
      <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s.title}>
            <div className="w-40 rounded-xl border bg-background/50 p-3">
              <s.icon className="mx-auto size-5 text-primary" />
              <p className="mt-1.5 text-xs font-medium">{s.title}</p>
              <p className="text-[11px] text-muted-foreground">→ {s.sub}</p>
            </div>
            {i < steps.length - 1 && <ArrowRight className="size-4 text-muted-foreground" />}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={onGenerate}>
          <Sparkles className="size-4" /> Generar desde el plan
        </Button>
        <Button variant="outline" onClick={onNew}>
          Crear un proyecto en blanco
        </Button>
      </div>
    </div>
  );
}

function PortfolioCard({ pf }: { pf: TreeData["tree"][number] }) {
  const [open, setOpen] = useState(true);
  const persp = pf.bscPerspective ? BSC_PERSPECTIVES[toBscCode(pf.bscPerspective)] : null;
  const color = persp?.color ?? colorDeMarca(pf.axis?.color) ?? "#8B1510";
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-accent/20">
        <span className="h-10 w-1.5 rounded-full" style={{ background: color }} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color }}>
            {persp ? `Perspectiva ${persp.short}` : pf.axis?.name ?? "Portafolio"}
          </p>
          <h2 className="truncate text-base font-semibold">{pf.name}</h2>
        </div>
        <div className="hidden w-48 space-y-1 sm:block">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{plural(pf.stats.projects, "proyecto", "proyectos")}</span>
            <span className="font-medium text-foreground">{pf.stats.progress}%</span>
          </div>
          <ProgressBar value={pf.stats.progress} color={color} />
        </div>
        {pf.stats.atRisk > 0 && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-700">{pf.stats.atRisk} en riesgo</span>}
        {open ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t">
          {pf.programs.map((pg) => (
            <ProgramBlock key={pg.id} pg={pg} color={color} />
          ))}
          {pf.directProjects.map((p) => (
            <ProjectLine key={p.id} p={p} />
          ))}
          {pf.programs.length === 0 && pf.directProjects.length === 0 && (
            <p className="px-5 py-4 text-sm text-muted-foreground">Este portafolio aún no tiene proyectos.</p>
          )}
        </div>
      )}
    </section>
  );
}

function ProgramBlock({ pg, color }: { pg: TreeData["tree"][number]["programs"][number]; color: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b last:border-b-0">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 bg-muted/20 px-5 py-2 text-left text-sm hover:bg-muted/40">
        {open ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
        <Layers className="size-4" style={{ color }} />
        <span className="min-w-0 flex-1 truncate font-medium" title={pg.description ?? pg.name}>
          {pg.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {plural(pg.stats.projects, "proyecto", "proyectos")} · {pg.stats.progress}%
        </span>
      </button>
      {open && (
        <div className="divide-y">
          {pg.projects.map((p) => (
            <ProjectLine key={p.id} p={p} indent />
          ))}
          {pg.projects.length === 0 && <p className="px-12 py-2.5 text-xs text-muted-foreground">Sin proyectos</p>}
        </div>
      )}
    </div>
  );
}

function ProjectLine({ p, indent = false }: { p: ProjectRow; indent?: boolean }) {
  return (
    <Link
      href={`/projects/${p.id}/overview`}
      className={cn(
        "grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3 text-sm hover:bg-accent/30 md:grid-cols-[1fr_130px_170px_130px_24px]",
        indent && "pl-12",
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ background: colorDeMarca(p.color) ?? "#8B1510" }}>
          {projectInitials(p)}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{p.name}</span>
          <span className="block text-xs text-muted-foreground">
            {p.stats.done}/{p.stats.total} tareas
            {p.stats.overdue > 0 && <span className="text-red-700"> · {p.stats.overdue} vencidas</span>}
            {(p.startDate || p.endDate) && <> · {friendlyDate(p.startDate)} → {friendlyDate(p.endDate)}</>}
          </span>
        </span>
      </span>
      <span className="hidden md:block">
        <HealthBadge health={p.health} />
      </span>
      <span className="hidden items-center gap-2 md:flex">
        <ProgressBar value={p.stats.progress} color={colorDeMarca(p.color) ?? undefined} />
        <span className="w-9 text-right text-xs tabular-nums">{p.stats.progress}%</span>
      </span>
      <span className="hidden items-center gap-1.5 truncate text-xs text-muted-foreground md:flex">
        <UserAvatar user={p.owner} size={20} />
        <span className="truncate">{p.owner?.name ?? "Sin responsable"}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

function GenerateDialog({ open, onOpenChange, cycleId }: { open: boolean; onOpenChange: (o: boolean) => void; cycleId: string }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.pm.planPreview.useQuery({ cycleId }, { enabled: open });
  const gen = trpc.pm.generateFromPlan.useMutation({
    onSuccess: (s) => {
      toast.success(
        s.projects || s.portfolios || s.programs
          ? `Listo: ${s.portfolios} portafolios, ${s.programs} programas, ${s.projects} proyectos y ${s.tasks} tareas creadas`
          : "El portafolio ya estaba al día con el plan",
      );
      utils.pm.portfolioTree.invalidate();
      utils.pm.planPreview.invalidate({ cycleId });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const counts = useMemo(() => {
    const c = { pf: 0, pg: 0, pr: 0, t: 0, existing: 0 };
    for (const n of data?.tree ?? []) {
      if (!n.exists) c.pf++;
      for (const pg of n.programs) {
        if (!pg.exists) c.pg++;
        for (const pr of pg.projects) {
          if (pr.exists) c.existing++;
          else {
            c.pr++;
            c.t += pr.tasks;
          }
        }
      }
    }
    return c;
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" /> Generar portafolio desde el plan
          </DialogTitle>
          <DialogDescription>
            Revisa lo que se va a crear. Lo que ya existe no se duplica: puedes volver a generar cuando agregues OCP nuevos.
          </DialogDescription>
        </DialogHeader>
        {isLoading && <div className="h-40 animate-pulse rounded-lg bg-muted/40" />}
        {data && !data.hasPlan && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
            Este ciclo todavía no tiene objetivos de largo plazo (OLP). Defínelos en <b>M3 · Formulación → OLP</b> y sus OCP en <b>M4 · Implementación → OCP</b>.
          </div>
        )}
        {data && data.hasPlan && data.ocpCount === 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
            Hay OLP pero ningún OCP. Sin OCP solo se crearán los portafolios y programas; define los OCP en <b>M4 → OCP</b> para obtener proyectos.
          </div>
        )}
        {data && data.tree.length > 0 && (
          <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {data.tree.map((n) => {
              const persp = BSC_PERSPECTIVES[n.code];
              return (
                <div key={n.code} className="rounded-lg border">
                  <div className="flex items-center gap-2 border-b px-3 py-2 text-sm font-medium">
                    <span className="size-2.5 rounded-full" style={{ background: persp.color }} />
                    Portafolio · {n.label}
                    <Chip exists={n.exists} />
                  </div>
                  {n.programs.map((pg) => (
                    <div key={pg.olpCode} className="border-b px-3 py-2 last:border-b-0">
                      <p className="flex items-center gap-2 text-sm">
                        <Layers className="size-3.5 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{pg.name}</span>
                        <Chip exists={pg.exists} />
                      </p>
                      <ul className="mt-1.5 space-y-1 pl-6">
                        {pg.projects.map((pr) => (
                          <li key={pr.ocpCode + pr.year} className="flex items-center gap-2 text-xs">
                            <Briefcase className="size-3.5 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate">{pr.name}</span>
                            {pr.area && <span className="text-muted-foreground">{pr.area}</span>}
                            <span className="shrink-0 text-muted-foreground">
                              {pr.tasks - 1} tareas + 1 hito
                            </span>
                            <Chip exists={pr.exists} />
                          </li>
                        ))}
                        {pg.projects.length === 0 && <li className="text-xs text-muted-foreground">Sin OCP definidos</li>}
                      </ul>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Se crearán {counts.pf} portafolios, {counts.pg} programas, {counts.pr} proyectos y {counts.t} tareas
            {counts.existing > 0 && ` · ${counts.existing} OCP ya tienen proyecto`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button disabled={!data?.tree.length || gen.isPending} onClick={() => gen.mutate({ cycleId })}>
              {gen.isPending ? "Generando…" : "Generar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Chip({ exists }: { exists: boolean }) {
  return exists ? (
    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">ya existe</span>
  ) : (
    <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">nuevo</span>
  );
}

export function NewProjectDialog({
  open,
  onOpenChange,
  portfolios,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  portfolios: { id: string; name: string; programs: { id: string; name: string }[] }[];
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [portfolioId, setPortfolioId] = useState("");
  const [programId, setProgramId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const create = trpc.pm.createProject.useMutation({
    onSuccess: (p) => {
      utils.pm.portfolioTree.invalidate();
      toast.success("Proyecto creado");
      onOpenChange(false);
      router.push(`/projects/${p.id}/list`);
    },
    onError: (e) => toast.error(e.message),
  });
  const programs = portfolios.find((p) => p.id === portfolioId)?.programs ?? [];
  const field = "h-9 w-full rounded-md border bg-transparent px-2.5 text-sm outline-none focus:border-primary/50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del proyecto" className={cn(field, "h-10")} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Objetivo y alcance (opcional)" className="w-full rounded-md border bg-transparent p-2.5 text-sm outline-none focus:border-primary/50" />
          <div className="grid grid-cols-2 gap-3">
            <select value={portfolioId} onChange={(e) => { setPortfolioId(e.target.value); setProgramId(""); }} className={cn(field, "bg-popover")}>
              <option value="">Sin portafolio</option>
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select value={programId} onChange={(e) => setProgramId(e.target.value)} disabled={!portfolioId} className={cn(field, "bg-popover")}>
              <option value="">Sin programa</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Inicio</span>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={cn(field, "[color-scheme:dark]")} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Fin</span>
              <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className={cn(field, "[color-scheme:dark]")} />
            </label>
          </div>
          <div className="flex gap-2">
            {PROJECT_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} className={cn("size-6 rounded-full ring-offset-2 ring-offset-background", color === c && "ring-2 ring-foreground")} style={{ background: c }} aria-label={`Color ${c}`} />
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!name.trim() || create.isPending}
            onClick={() =>
              create.mutate({
                name: name.trim(),
                description: description || undefined,
                portfolioId: portfolioId || null,
                programId: programId || null,
                startDate: dayToDate(start),
                endDate: dayToDate(end),
                color,
              })
            }
          >
            Crear proyecto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
