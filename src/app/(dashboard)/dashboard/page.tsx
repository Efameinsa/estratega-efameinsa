"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  ArrowRight,
  Layers,
  Compass,
  Search,
  Lightbulb,
  Rocket,
  BarChart3,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Module definitions
// ---------------------------------------------------------------------------

interface ModuleDef {
  id: string;
  name: string;
  Icon: LucideIcon;
  pathSuffix: string;
  requires: string;
}

const MODULES: ModuleDef[] = [
  {
    id: "M1",
    name: "M1 · Identidad",
    Icon: Compass,
    pathSuffix: "m1-identity",
    requires: "Siempre disponible",
  },
  {
    id: "M2",
    name: "M2 · Diagnóstico",
    Icon: Search,
    pathSuffix: "m2-diagnosis",
    requires: "Requiere M1",
  },
  {
    id: "M3",
    name: "M3 · Formulación",
    Icon: Lightbulb,
    pathSuffix: "m3-formulation",
    requires: "Requiere M2",
  },
  {
    id: "M4",
    name: "M4 · Implementación",
    Icon: Rocket,
    pathSuffix: "m4-deployment",
    requires: "Requiere M3",
  },
  {
    id: "M5",
    name: "M5 · Control BSC",
    Icon: BarChart3,
    pathSuffix: "m5-control",
    requires: "Requiere M4",
  },
];

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { data: cycles, isLoading } = trpc.cycle.list.useQuery();

  if (isLoading) {
    return <div className="mx-auto h-40 max-w-7xl animate-pulse rounded-xl bg-muted/40" />;
  }

  const isNewUser = !cycles || cycles.length === 0;
  const activeCycle =
    cycles?.find((c) => c.status === "IN_PROGRESS") ?? cycles?.[0];

  return isNewUser ? (
    <WelcomeDashboard />
  ) : (
    <WorkDashboard cycle={activeCycle!} />
  );
}

// ---------------------------------------------------------------------------
// Estado A — Usuario nuevo (sin ciclos)
// ---------------------------------------------------------------------------

function WelcomeDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as Record<string, unknown> | undefined;
  const userName = ((user?.name as string) ?? "").split(" ")[0] || "Usuario";
  const orgName = (user?.organizationName as string) ?? "tu organización";

  const [showCreateCycle, setShowCreateCycle] = useState(false);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Saludo */}
      <div className="mb-6">
        <h1 className="text-xl font-medium text-foreground mb-1">
          Bienvenido, {userName} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Estás en {orgName}
        </p>
      </div>

      {/* Hero card */}
      <div className="bg-background border border-border/50 rounded-xl p-8 text-center mb-5">
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Layers className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-[17px] font-medium text-foreground mb-2">
          Tu sistema de planeamiento estratégico está listo
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
          El SEI te guía paso a paso desde el diagnóstico hasta la ejecución de
          proyectos, siguiendo la metodología de D&apos;Alessio. Empieza creando
          tu primer ciclo estratégico.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => setShowCreateCycle(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Crear ciclo estratégico
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              window.open("https://estratega-v2.vercel.app", "_blank")
            }
          >
            Ver demo
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* 3 pasos guía */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          {
            num: 1,
            title: "Crea tu ciclo",
            desc: "Define el horizonte estratégico: 3 o 5 años. El ciclo contiene todo tu planeamiento.",
          },
          {
            num: 2,
            title: "Completa M1 y M2",
            desc: "Define la identidad de tu organización y realiza el diagnóstico estratégico completo.",
          },
          {
            num: 3,
            title: "Formula y ejecuta",
            desc: "Genera estrategias, define OLP y OCP, y conéctalos a proyectos reales.",
          },
        ].map((step) => (
          <div
            key={step.num}
            className="bg-background border border-border/50 rounded-xl p-4"
          >
            <div className="w-6 h-6 rounded-md bg-primary/10 text-primary text-[11px] font-medium flex items-center justify-center mb-3">
              {step.num}
            </div>
            <h3 className="text-[13px] font-medium text-foreground mb-1.5">
              {step.title}
            </h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {step.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Banner invitar equipo */}
      <div className="bg-background border border-border/50 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-foreground mb-0.5">
            Invita a tu equipo
          </p>
          <p className="text-[12px] text-muted-foreground">
            El planeamiento estratégico es un trabajo en equipo.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/users")}
        >
          Invitar miembros
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>

      {/* Modal crear ciclo */}
      <CreateCycleDialog
        open={showCreateCycle}
        onOpenChange={setShowCreateCycle}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estado B — Ciclo activo
// ---------------------------------------------------------------------------

interface CycleData {
  id: string;
  name: string;
  yearStart: number;
  yearEnd: number;
  status: string;
}

const DIM_META: Record<string, { label: string; color: string }> = {
  resultados_economicos: { label: "Financiera", color: "#4ade80" },
  posicion_mercado: { label: "Clientes", color: "#60a5fa" },
  como_opera_empresa: { label: "Procesos", color: "#fbbf24" },
  personas_cultura: { label: "Aprendizaje", color: "#a78bfa" },
};

const CYCLE_STATUS: Record<string, string> = {
  DRAFT: "Borrador",
  IN_PROGRESS: "En ejecución",
  REVIEW: "En revisión",
  APPROVED: "Aprobado",
  ARCHIVED: "Archivado",
};

function Ring({ value, color, size = 64 }: { value: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--muted)" strokeWidth={7} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={7}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
        className="transition-all duration-700"
      />
    </svg>
  );
}

function StatCard({ label, value, hint, ring, color }: { label: string; value: string; hint: string; ring: number; color: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <Ring value={Math.max(0, Math.min(100, ring))} color={color} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function WorkDashboard({ cycle }: { cycle: CycleData }) {
  const { data: session } = useSession();
  const user = session?.user as Record<string, unknown> | undefined;
  const orgName = (user?.organizationName as string) ?? "";
  const firstName = ((user?.name as string) ?? "").split(" ")[0];
  const { data, isLoading } = trpc.cycle.cockpit.useQuery({ cycleId: cycle.id });
  const [showCreateCycle, setShowCreateCycle] = useState(false);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            {firstName ? `Hola, ${firstName}` : "Bienvenido"}
            {orgName ? ` · ${orgName}` : ""}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{cycle.name}</h1>
          <p className="text-sm text-muted-foreground">
            Horizonte {cycle.yearStart}–{cycle.yearEnd} · {CYCLE_STATUS[cycle.status] ?? cycle.status}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowCreateCycle(true)}>
          <Plus className="size-3.5" /> Nuevo ciclo
        </Button>
      </div>

      {isLoading || !data ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Avance del plan"
              value={`${data.plan.percentage}%`}
              hint={`${Object.values(data.plan.modules).filter((m) => m.status === "COMPLETADO").length} de 5 módulos completos`}
              ring={data.plan.percentage}
              color="#a78bfa"
            />
            <StatCard
              label="Cumplimiento BSC"
              value={data.bsc.kpis ? `${data.bsc.globalPct}%` : "—"}
              hint={data.bsc.kpis ? `${data.bsc.kpis} KPIs · periodo ${data.bsc.period}` : "Aún sin KPIs"}
              ring={data.bsc.globalPct}
              color="#4ade80"
            />
            <StatCard
              label="Ejecución del portafolio"
              value={`${data.portfolio.progress}%`}
              hint={`${data.portfolio.projects} proyectos · ${data.portfolio.done}/${data.portfolio.tasks} tareas`}
              ring={data.portfolio.progress}
              color="#60a5fa"
            />
            <StatCard
              label="Tareas vencidas"
              value={String(data.portfolio.overdue)}
              hint={data.portfolio.overdue ? "Requieren atención" : "Todo al día"}
              ring={data.portfolio.tasks ? Math.round((data.portfolio.overdue / data.portfolio.tasks) * 100) : 0}
              color={data.portfolio.overdue ? "#f87171" : "#94a3b8"}
            />
          </div>

          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recorrido del plan estratégico</h2>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {MODULES.map((mod, i) => {
                const st = data.plan.modules[mod.id as keyof typeof data.plan.modules];
                const done = st?.status === "COMPLETADO";
                return (
                  <li key={mod.id}>
                    <Link
                      href={`/cycles/${cycle.id}/${mod.pathSuffix}`}
                      className={cn(
                        "group flex h-full flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50",
                        data.plan.next?.module === mod.id && "border-primary/60 ring-1 ring-primary/30",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn("flex size-8 items-center justify-center rounded-lg", done ? "bg-success/15 text-success" : "bg-primary/10 text-primary")}>
                          <mod.Icon className="size-4" />
                        </span>
                        <span className="text-xs text-muted-foreground">Paso {i + 1}</span>
                        {done && <CheckCircle2 className="ml-auto size-4 text-success" aria-label="Completado" />}
                      </div>
                      <p className="text-sm font-medium group-hover:text-primary">{mod.name}</p>
                      <div className="mt-auto space-y-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${st?.progress ?? 0}%`, background: done ? "var(--success)" : "var(--primary)" }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{st ? `${st.done}/${st.total} herramientas` : ""}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>

          {data.plan.next && (
            <Link href={data.plan.next.path} className="glass flex items-center gap-4 rounded-xl px-5 py-4">
              <span className="size-2 shrink-0 animate-pulse rounded-full bg-primary shadow-[0_0_12px_rgb(167_139_250_/_0.8)]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Siguiente paso · {data.plan.next.label}</p>
                <p className="text-xs text-muted-foreground">{data.plan.next.description}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                Ir ahora <ArrowRight className="size-4" />
              </span>
            </Link>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="rounded-xl border bg-card p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-medium">Balanced Scorecard por perspectiva</h2>
                <Link href={`/cycles/${cycle.id}/m5-control/tablero`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Ver tablero <ArrowRight className="size-3.5" />
                </Link>
              </div>
              {data.bsc.kpis === 0 ? (
                <p className="text-sm text-muted-foreground">Define tus KPIs en M5 para ver el semáforo por perspectiva.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {data.bsc.byDim.map((d) => {
                    const meta = DIM_META[d.dimension];
                    return (
                      <div key={d.dimension} className="rounded-lg border bg-background/40 p-4">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ background: meta.color }} />
                          <span className="text-sm font-medium">{meta.label}</span>
                          <span className="ml-auto text-lg font-semibold tabular-nums">{d.total ? `${d.pct}%` : "—"}</span>
                        </div>
                        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted" aria-label="Semáforo de KPIs">
                          {d.verde > 0 && <div style={{ flex: d.verde, background: "var(--semaforo-verde)" }} />}
                          {d.ambar > 0 && <div style={{ flex: d.ambar, background: "var(--semaforo-ambar)" }} />}
                          {d.rojo > 0 && <div style={{ flex: d.rojo, background: "var(--semaforo-rojo)" }} />}
                          {d.sinDato > 0 && <div style={{ flex: d.sinDato, background: "var(--semaforo-sin-dato)" }} />}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {d.total} KPIs · <span className="text-success">{d.verde} en meta</span> · <span className="text-warning">{d.ambar} en alerta</span> ·{" "}
                          <span className="text-danger">{d.rojo} críticos</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-xl border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-medium">Mis próximas tareas</h2>
                <Link href="/my-tasks" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Ver todas <ArrowRight className="size-3.5" />
                </Link>
              </div>
              {data.myTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tienes tareas pendientes con fecha.</p>
              ) : (
                <ul className="space-y-1">
                  {data.myTasks.map((t) => {
                    const due = t.dueDate ? new Date(t.dueDate) : null;
                    const late = due ? due.getTime() < new Date(data.today).getTime() : false;
                    return (
                      <li key={t.id}>
                        <Link href={`/projects/${t.project.id}/list?task=${t.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/40">
                          <span className="size-2 shrink-0 rounded-full" style={{ background: t.project.color ?? "#a78bfa" }} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{t.summary}</span>
                            <span className="block truncate text-xs text-muted-foreground">{t.project.name}</span>
                          </span>
                          {due && (
                            <span className={cn("shrink-0 text-xs", late ? "text-danger" : "text-muted-foreground")}>
                              {due.toLocaleDateString("es-PE", { day: "numeric", month: "short", timeZone: "UTC" })}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <span>{data.members} personas en la organización</span>
                <Link href="/portfolio" className="text-primary hover:underline">
                  Ir al portafolio
                </Link>
              </div>
            </section>
          </div>
        </>
      )}

      <CreateCycleDialog open={showCreateCycle} onOpenChange={setShowCreateCycle} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialog para crear ciclo (compartido)
// ---------------------------------------------------------------------------

function CreateCycleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const currentYear = new Date().getFullYear();
  const [cycleName, setCycleName] = useState("");
  const [duration, setDuration] = useState(5);
  const [startYear, setStartYear] = useState(currentYear);

  const createCycle = trpc.cycle.create.useMutation({
    onSuccess: (cycle) => {
      utils.cycle.list.invalidate();
      onOpenChange(false);
      setCycleName("");
      toast.success("Ciclo estratégico creado");
      router.push(`/cycles/${cycle.id}/m1-identity`);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo ciclo estratégico</DialogTitle>
          <DialogDescription>
            Define el horizonte de tu planeamiento. Puedes cambiarlo después.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Nombre del ciclo
            </Label>
            <Input
              value={cycleName}
              onChange={(e) => setCycleName(e.target.value)}
              placeholder="Ej: Plan Estratégico 2025–2030"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Duración
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {[3, 5].map((years) => (
                <button
                  key={years}
                  type="button"
                  onClick={() => setDuration(years)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    duration === years
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <div
                    className={cn(
                      "text-[13px] font-medium",
                      duration === years ? "text-primary" : "text-foreground"
                    )}
                  >
                    {years} años
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {startYear} – {startYear + years - 1}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Año de inicio
              </Label>
              <select
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value))}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background"
              >
                {[
                  currentYear - 1,
                  currentYear,
                  currentYear + 1,
                  currentYear + 2,
                ].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Año de fin
              </Label>
              <Input
                value={startYear + duration - 1}
                readOnly
                className="bg-muted/50 text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!cycleName.trim() || createCycle.isPending}
            onClick={() =>
              createCycle.mutate({
                name: cycleName.trim(),
                yearStart: startYear,
                yearEnd: startYear + duration - 1,
              })
            }
          >
            {createCycle.isPending ? "Creando..." : "Crear ciclo →"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
