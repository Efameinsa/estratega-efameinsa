"use client";

import { useState } from "react";
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
  Lock,
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
    name: "M4 · Despliegue",
    Icon: Rocket,
    pathSuffix: "m4-deployment",
    requires: "Requiere M3",
  },
  {
    id: "M5",
    name: "M5 · Control BSC",
    Icon: BarChart3,
    pathSuffix: "m5-control",
    requires: "Requiere proyectos",
  },
];

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { data: cycles, isLoading } = trpc.cycle.list.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
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

function WorkDashboard({ cycle }: { cycle: CycleData }) {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as Record<string, unknown> | undefined;
  const orgName = (user?.organizationName as string) ?? "";

  const { data: members } = trpc.user.list.useQuery();
  const { data: cycleProgress } = trpc.cycle.getProgress.useQuery({
    cycleId: cycle.id,
  });
  const { data: recentActivity } = trpc.cycle.getActivity.useQuery({
    cycleId: cycle.id,
  });
  const { data: pendingItems } = trpc.cycle.getPending.useQuery({
    cycleId: cycle.id,
  });
  const { data: nextStep } = trpc.cycle.getNextStep.useQuery({
    cycleId: cycle.id,
  });

  const [showCreateCycle, setShowCreateCycle] = useState(false);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-medium text-foreground mb-1">
            {cycle.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {orgName} · {cycle.yearStart}–{cycle.yearEnd} · Ciclo en progreso
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowCreateCycle(true)}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Nuevo ciclo
        </Button>
      </div>

      {/* 4 métricas */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "Progreso general",
            value: `${cycleProgress?.percentage ?? 0}%`,
            sub: `${cycleProgress?.activeModuleName ?? "M1"} en curso`,
            fill: cycleProgress?.percentage ?? 0,
            color: "#7aa8e0",
          },
          {
            label: "Módulos completados",
            value: `${cycleProgress?.modulesCompleted ?? 0} / 5`,
            sub: `${cycleProgress?.modulesCompleted ?? 0} completado(s)`,
            fill: ((cycleProgress?.modulesCompleted ?? 0) / 5) * 100,
            color: "#7aa8e0",
          },
          {
            label: "Proyectos activos",
            value: String(cycleProgress?.activeProjects ?? 0),
            sub: `${cycleProgress?.inProgress ?? 0} en progreso`,
            fill: cycleProgress?.activeProjects ? 60 : 0,
            color: "#34d399",
          },
          {
            label: "Miembros del equipo",
            value: String(members?.length ?? 0),
            sub: "Usuarios activos",
            fill: 70,
            color: "#7F77DD",
          },
        ].map((m) => (
          <div
            key={m.label}
            className="bg-background border border-border/50 rounded-xl p-4"
          >
            <p className="text-[11px] text-muted-foreground mb-1.5">
              {m.label}
            </p>
            <p className="text-[22px] font-medium text-foreground mb-0.5">
              {m.value}
            </p>
            <p className="text-[11px] text-muted-foreground">{m.sub}</p>
            <div className="h-[3px] bg-muted rounded-full mt-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${m.fill}%`, background: m.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Módulos del ciclo */}
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">
          Planeamiento estratégico
        </p>
        <div className="grid grid-cols-5 gap-2.5">
          {MODULES.map((mod) => {
            const status = cycleProgress?.modules?.[mod.id];
            const isLocked = status?.status === "BLOQUEADO";
            const isDone = status?.status === "COMPLETADO";
            const isActive = status?.status === "EN_CURSO";
            const progress = status?.progress ?? 0;

            return (
              <div
                key={mod.id}
                onClick={() =>
                  !isLocked &&
                  router.push(`/cycles/${cycle.id}/${mod.pathSuffix}`)
                }
                className={cn(
                  "bg-background border rounded-xl p-3 relative transition-all",
                  isLocked
                    ? "opacity-50 cursor-not-allowed border-border/50"
                    : "cursor-pointer hover:border-border border-border/50",
                  isActive && "border-primary"
                )}
              >
                {isLocked && (
                  <Lock className="w-3 h-3 text-muted-foreground absolute top-2.5 right-2.5" />
                )}
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
                    isDone
                      ? "bg-transparent"
                      : isActive
                        ? "bg-primary/10"
                        : "bg-muted/50"
                  )}
                >
                  <mod.Icon
                    className={cn(
                      "w-4 h-4",
                      isDone
                        ? "text-emerald-600"
                        : isActive
                          ? "text-primary"
                          : "text-muted-foreground"
                    )}
                  />
                </div>
                <p className="text-[11px] font-medium text-foreground leading-tight mb-1">
                  {mod.name}
                </p>
                <p
                  className={cn(
                    "text-[10px]",
                    isDone
                      ? "text-emerald-600"
                      : isActive
                        ? "text-primary"
                        : "text-muted-foreground"
                  )}
                >
                  {isDone
                    ? "Completado"
                    : isActive
                      ? `En curso · ${progress}%`
                      : mod.requires}
                </p>
                <div className="h-[2px] bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: isDone
                        ? "100%"
                        : isActive
                          ? `${progress}%`
                          : "0%",
                      background: isDone ? "#34d399" : "#7aa8e0",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Banner siguiente paso */}
      {nextStep && (
        <div className="glass rounded-xl px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0 shadow-[0_0_12px_rgb(167_139_250_/_0.8)]" />
            <div>
              <p className="text-[13px] font-medium text-foreground">
                Siguiente paso — {nextStep.title}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {nextStep.description}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="flex-shrink-0 ml-4"
            onClick={() => router.push(nextStep.path)}
          >
            Ir ahora →
          </Button>
        </div>
      )}

      {/* Actividad reciente + Pendientes */}
      <div className="grid grid-cols-2 gap-4">
        {/* Actividad reciente */}
        <div className="bg-background border border-border/50 rounded-xl p-4">
          <h3 className="text-[13px] font-medium text-foreground mb-3">
            Actividad reciente
          </h3>
          <div className="space-y-0">
            {recentActivity?.slice(0, 5).map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 py-2 border-b border-border/40 last:border-b-0"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-medium flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.userInitials}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] text-muted-foreground leading-snug">
                    <span className="text-foreground font-medium">
                      {item.userName}
                    </span>{" "}
                    {item.action}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {item.timeAgo}
                  </p>
                </div>
              </div>
            ))}
            {(!recentActivity || recentActivity.length === 0) && (
              <p className="text-[12px] text-muted-foreground py-4 text-center">
                Sin actividad reciente
              </p>
            )}
          </div>
        </div>

        {/* Pendientes del módulo activo */}
        <div className="bg-background border border-border/50 rounded-xl p-4">
          <h3 className="text-[13px] font-medium text-foreground mb-3">
            Pendiente en {cycleProgress?.activeModuleName ?? "M1"}
          </h3>
          <div className="space-y-0">
            {pendingItems?.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 py-2.5 border-b border-border/40 last:border-b-0 cursor-pointer hover:bg-muted/30 rounded -mx-1 px-1 transition-colors"
                onClick={() => router.push(item.path)}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                  style={{ background: item.color }}
                />
                <div className="min-w-0">
                  <p className="text-[12px] text-foreground font-medium truncate">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            ))}
            {(!pendingItems || pendingItems.length === 0) && (
              <p className="text-[12px] text-muted-foreground py-4 text-center">
                Todo al día ✓
              </p>
            )}
          </div>
        </div>
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
