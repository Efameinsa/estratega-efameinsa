"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/router";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  FileText,
  FileDown,
  RefreshCw,
  Coins,
  Users,
  Box,
  Settings,
  ListChecks,
  Brain,
  Building,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import {
  CATEGORIES,
  PROVISION_STATUSES,
  RISK_LEVELS,
  getCategoryDef,
  computeRiskLevel,
  formatMoney,
  formatMoneyShort,
  type ResourceCategory,
} from "@/lib/resources-7m";
import { exportResourcesPdf, exportResourcesExcel } from "@/lib/lazy-exports";
import type { ExportResourcesContext, ExportNeed, ExportManpowerProfile, ExportMoneySource } from "@/lib/resources-export";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type SetupData = RouterOutputs["resources"]["setup"];
type Need = SetupData["needs"][number];
type Step = 1 | 2 | 3;

const ICONS: Record<string, LucideIcon> = {
  Coins,
  Users,
  Box,
  Settings,
  ListChecks,
  Brain,
  Building,
};

export default function ResourcesPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const utils = trpc.useUtils();

  const [step, setStep] = useState<Step>(1);
  const [activeCat, setActiveCat] = useState<ResourceCategory>("money");
  const [expandedCat, setExpandedCat] = useState<ResourceCategory | null>(null);
  const [presentationMode, setPresentationMode] = useState(false);

  const setupQuery = trpc.resources.setup.useQuery({ cycleId });

  const autoDetect = trpc.resources.autoDetect.useMutation({
    onSuccess: (res) => {
      utils.resources.setup.invalidate({ cycleId });
      if (res.created > 0) {
        toast.success(`${res.created} necesidades detectadas automáticamente`);
      } else {
        toast.info("Sin nuevas necesidades para detectar");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const upsertNeed = trpc.resources.upsertNeed.useMutation({
    onSuccess: () => utils.resources.setup.invalidate({ cycleId }),
    onError: (e) => toast.error(e.message),
  });

  const deleteNeed = trpc.resources.deleteNeed.useMutation({
    onSuccess: () => utils.resources.setup.invalidate({ cycleId }),
    onError: (e) => toast.error(e.message),
  });

  const confirmPlan = trpc.resources.confirmPlan.useMutation({
    onSuccess: () => {
      utils.resources.setup.invalidate({ cycleId });
      toast.success("Plan de recursos confirmado");
    },
    onError: (e) => toast.error(e.message),
  });

  const setup = setupQuery.data;

  // Auto-detect en primer load si no hay needs
  useEffect(() => {
    if (setup && setup.needs.length === 0) {
      autoDetect.mutate({ cycleId, replaceAuto: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup?.needs.length, cycleId]);

  if (setupQuery.isLoading) {
    return <div className="animate-pulse text-muted-foreground">Cargando módulo de Recursos 7M...</div>;
  }
  if (!setup) {
    return <div className="text-muted-foreground">No se pudo cargar la información del ciclo.</div>;
  }

  function handleRegen() {
    if (!confirm("Esto regenerará las necesidades auto-detectadas. ¿Continuar?")) return;
    autoDetect.mutate({ cycleId, replaceAuto: true });
  }

  return (
    <div className={cn("space-y-6", presentationMode && "fixed inset-0 z-50 overflow-auto bg-background p-8")}>
      {!presentationMode && (
        <>
          <PageHeader />
          <Stepper step={step} onChange={setStep} />
        </>
      )}

      {step === 1 && !presentationMode && (
        <Step1
          setup={setup}
          expandedCat={expandedCat}
          setExpandedCat={setExpandedCat}
          onRegenerate={handleRegen}
          isGenerating={autoDetect.isPending}
          onContinue={() => setStep(2)}
          onDeleteNeed={(id) => deleteNeed.mutate({ id })}
          onJumpToEdit={(cat) => {
            setActiveCat(cat);
            setStep(2);
          }}
        />
      )}

      {step === 2 && !presentationMode && (
        <Step2
          cycleId={cycleId}
          setup={setup}
          activeCat={activeCat}
          setActiveCat={setActiveCat}
          onUpsert={(args) => upsertNeed.mutate({ cycleId, ...args })}
          onDelete={(id) => deleteNeed.mutate({ id })}
          onBack={() => setStep(1)}
          onContinue={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <Step3
          cycleId={cycleId}
          setup={setup}
          onBack={() => setStep(2)}
          onConfirm={() => confirmPlan.mutate({ cycleId })}
          presentationMode={presentationMode}
          setPresentationMode={setPresentationMode}
        />
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div className="space-y-1 text-left">
      <h2 className="text-lg font-semibold">Recursos · 7M</h2>
      <p className="text-sm text-muted-foreground">
        Capital, personas, insumos, equipos, procesos, cultura y entorno necesarios para
        ejecutar el plan. Donde la estrategia se vuelve compromiso operativo.
      </p>
    </div>
  );
}

function Stepper({ step, onChange }: { step: Step; onChange: (s: Step) => void }) {
  const steps: { id: Step; label: string; description: string }[] = [
    { id: 1, label: "1 · Identificar", description: "Necesidades pre-calculadas en las 7M" },
    { id: 2, label: "2 · Cuantificar", description: "Plan operativo por categoría" },
    { id: 3, label: "3 · Consolidar", description: "Flujo de inversión y brechas" },
  ];
  return (
    <div className="flex items-stretch gap-2">
      {steps.map((s) => {
        const active = s.id === step;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={cn(
              "flex flex-1 flex-col items-start rounded-lg border px-4 py-3 text-left transition",
              active
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:bg-muted/30",
            )}
          >
            <span className="text-sm font-medium">{s.label}</span>
            <span className="text-xs text-muted-foreground">{s.description}</span>
          </button>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// STEP 1 · Identificar
// ────────────────────────────────────────────────────────────────────

function Step1({
  setup,
  expandedCat,
  setExpandedCat,
  onRegenerate,
  isGenerating,
  onContinue,
  onDeleteNeed,
  onJumpToEdit,
}: {
  setup: SetupData;
  expandedCat: ResourceCategory | null;
  setExpandedCat: (c: ResourceCategory | null) => void;
  onRegenerate: () => void;
  isGenerating: boolean;
  onContinue: () => void;
  onDeleteNeed: (id: string) => void;
  onJumpToEdit: (c: ResourceCategory) => void;
}) {
  const needsByCat = useMemo(() => {
    const map = new Map<ResourceCategory, Need[]>();
    for (const cat of CATEGORIES) map.set(cat.key, []);
    for (const n of setup.needs) {
      const list = map.get(n.category as ResourceCategory);
      if (list) list.push(n);
    }
    return map;
  }, [setup.needs]);

  const totalInvestment = setup.needs.reduce(
    (s, n) => s + (n.amountEstimated ?? 0),
    0,
  );
  const totalSecured = setup.needs.reduce((s, n) => s + n.amountSecured, 0);
  const coverage =
    totalInvestment > 0 ? Math.round((totalSecured / totalInvestment) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="border-primary/25 bg-primary/5">
        <CardContent className="py-4 text-left text-sm text-primary">
          <strong className="block">Identifica los recursos para ejecutar tu plan.</strong>
          <span className="text-primary/80">
            El sistema analizó tus OCPs, estructura y estrategias para pre-calcular los
            recursos necesarios en cada una de las 7 categorías. Revisa, ajusta y completa.
          </span>
        </CardContent>
      </Card>

      <Card className="border-emerald-500/30 bg-transparent">
        <CardContent className="py-4 text-left text-sm text-emerald-700">
          <strong>Necesidades pre-calculadas automáticamente.</strong> Origen:{" "}
          {setup.ocps.length} OCPs, {setup.structure?.nodes.length ?? 0} áreas en la
          estructura, {setup.strategies.length + setup.consolidated.length} estrategias.
          Total estimado preliminar: <strong>{formatMoneyShort(totalInvestment)} USD</strong>{" "}
          en inversión.
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.slice(0, 4).map((cat) => (
          <CategoryCard
            key={cat.key}
            cat={cat}
            needs={needsByCat.get(cat.key) ?? []}
            onClick={() => onJumpToEdit(cat.key)}
          />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {CATEGORIES.slice(4).map((cat) => (
          <CategoryCard
            key={cat.key}
            cat={cat}
            needs={needsByCat.get(cat.key) ?? []}
            onClick={() => onJumpToEdit(cat.key)}
          />
        ))}
      </div>

      <div className="space-y-3">
        {CATEGORIES.map((cat) => {
          const items = needsByCat.get(cat.key) ?? [];
          const isExpanded = expandedCat === cat.key;
          const Icon = ICONS[cat.icon] ?? Coins;
          const total = items.reduce((s, n) => s + (n.amountEstimated ?? 0), 0);
          return (
            <Card key={cat.key} className="border" style={{ borderLeftColor: cat.color, borderLeftWidth: 4 }}>
              <button
                type="button"
                onClick={() => setExpandedCat(isExpanded ? null : cat.key)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-muted/20"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: cat.bgPastel, color: cat.color }}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <div className="font-semibold">
                      {cat.label} · {cat.subtitle}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {items.length} necesidades · {formatMoneyShort(total)} USD estimado
                    </div>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    isExpanded && "rotate-180",
                  )}
                />
              </button>
              {isExpanded && (
                <CardContent className="border-t bg-muted/10 p-0">
                  {items.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-muted-foreground">
                      Sin necesidades detectadas en esta categoría aún.
                    </p>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="px-3 py-2 font-medium">Descripción</th>
                          <th className="px-2 py-2 font-medium">Monto</th>
                          <th className="px-2 py-2 font-medium">Cant/Unidad</th>
                          <th className="px-2 py-2 font-medium">Años</th>
                          <th className="px-2 py-2 font-medium">Vinculado</th>
                          <th className="px-2 py-2 font-medium">Origen</th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((n) => (
                          <tr key={n.id} className="border-t">
                            <td className="px-3 py-2">{n.description}</td>
                            <td className="px-2 py-2">
                              {n.amountEstimated != null
                                ? formatMoneyShort(n.amountEstimated)
                                : "—"}
                            </td>
                            <td className="px-2 py-2">
                              {n.quantity != null
                                ? `${n.quantity} ${n.unit ?? ""}`
                                : "—"}
                            </td>
                            <td className="px-2 py-2">
                              {n.yearStart === n.yearEnd
                                ? n.yearStart
                                : `${n.yearStart}–${n.yearEnd}`}
                            </td>
                            <td className="px-2 py-2 text-[10px] text-muted-foreground">
                              {n.links
                                .map((l) => `${l.linkType}:${l.referenceLabel ?? ""}`)
                                .join(", ") || "—"}
                            </td>
                            <td className="px-2 py-2 text-[10px]">
                              {n.origin === "auto_detected" ? (
                                <span className="text-emerald-700">⚡ Auto</span>
                              ) : (
                                <span className="text-muted-foreground">Manual</span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => onDeleteNeed(n.id)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Las necesidades marcadas con <span className="text-emerald-700">⚡ Auto</span> vienen del
        análisis de tus OCPs y estrategias. Puedes editar montos, agregar necesidades manuales o
        eliminar las que no apliquen.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={isGenerating}
        >
          <RefreshCw className={cn("mr-2 size-4", isGenerating && "animate-spin")} /> Re-detectar
        </Button>
        <Button onClick={onContinue}>
          Continuar a cuantificar <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>
    </div>
  );
}

function CategoryCard({
  cat,
  needs,
  onClick,
}: {
  cat: (typeof CATEGORIES)[number];
  needs: Need[];
  onClick: () => void;
}) {
  const Icon = ICONS[cat.icon] ?? Coins;
  const total = needs.reduce((s, n) => s + (n.amountEstimated ?? 0), 0);
  const secured = needs.reduce((s, n) => s + n.amountSecured, 0);
  const coverage = total > 0 ? Math.round((secured / total) * 100) : 0;

  const mainMetric =
    cat.key === "manpower"
      ? `${needs.reduce((s, n) => s + (n.quantity ?? 0), 0).toFixed(0)} ${cat.unit}`
      : cat.key === "materials" || cat.key === "methods" || cat.key === "mentality"
      ? `${needs.length} ${cat.unit}`
      : formatMoneyShort(total);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
      style={{ backgroundColor: cat.bgPastel }}
    >
      <div className="mb-2 flex items-center gap-2">
        <div
          className="flex size-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: cat.color, color: "white" }}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: cat.color }}>
            {cat.label}
          </div>
          <div className="text-[10px] text-muted-foreground">{cat.subtitle}</div>
        </div>
      </div>
      <div className="mt-1 text-xl font-bold" style={{ color: cat.color }}>
        {mainMetric}
      </div>
      <div className="text-[10px] text-muted-foreground">{cat.metricLabel}</div>
      <div className="mt-3 w-full">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/60">
          <div
            className="h-full rounded-full"
            style={{ width: `${coverage}%`, backgroundColor: cat.color }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">
            {needs.length} necesidad{needs.length !== 1 ? "es" : ""}
          </span>
          <span className="font-semibold" style={{ color: cat.color }}>
            {coverage}% asegurado
          </span>
        </div>
      </div>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────
// STEP 2 · Cuantificar
// ────────────────────────────────────────────────────────────────────

function Step2({
  cycleId,
  setup,
  activeCat,
  setActiveCat,
  onUpsert,
  onDelete,
  onBack,
  onContinue,
}: {
  cycleId: string;
  setup: SetupData;
  activeCat: ResourceCategory;
  setActiveCat: (c: ResourceCategory) => void;
  onUpsert: (args: {
    id?: string;
    category: ResourceCategory;
    description: string;
    yearStart: number;
    yearEnd: number;
    amountEstimated?: number | null;
    quantity?: number | null;
    unit?: string | null;
    amountSecured?: number;
    provisionStatus?: "planeada" | "comprometida" | "en_gestion" | "asegurada" | "faltante";
    riskLevel?: "bajo" | "medio" | "alto";
    notes?: string | null;
  }) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const cat = getCategoryDef(activeCat)!;
  const Icon = ICONS[cat.icon] ?? Coins;
  const needs = setup.needs.filter((n) => n.category === activeCat);

  const totalEstimated = needs.reduce((s, n) => s + (n.amountEstimated ?? 0), 0);
  const totalSecured = needs.reduce((s, n) => s + n.amountSecured, 0);
  const totalGap = totalEstimated - totalSecured;
  const totalQty = needs.reduce((s, n) => s + (n.quantity ?? 0), 0);

  const yearStart = setup.cycle.yearStart;
  const yearEnd = setup.cycle.yearEnd;
  const years: number[] = [];
  for (let y = yearStart; y <= yearEnd; y++) years.push(y);

  // Distribución por año (para visualización)
  const byYear = new Map<number, number>();
  for (const y of years) byYear.set(y, 0);
  for (const n of needs) {
    if (n.amountEstimated == null) continue;
    const span = Math.max(1, n.yearEnd - n.yearStart + 1);
    const per = n.amountEstimated / span;
    for (let y = n.yearStart; y <= n.yearEnd; y++) {
      byYear.set(y, (byYear.get(y) ?? 0) + per);
    }
  }
  const maxYearAmount = Math.max(1, ...Array.from(byYear.values()));

  const catIndex = CATEGORIES.findIndex((c) => c.key === activeCat);
  const nextCat = CATEGORIES[catIndex + 1];

  // Alertas por categoría
  const alerts: string[] = [];
  if (activeCat === "manpower") {
    const yearAcc = new Map<number, number>();
    for (const n of needs) {
      if (n.quantity == null) continue;
      yearAcc.set(n.yearStart, (yearAcc.get(n.yearStart) ?? 0) + n.quantity);
    }
    const totalFtes = Array.from(yearAcc.values()).reduce((s, v) => s + v, 0);
    if (totalFtes > 0) {
      const firstYear = yearAcc.get(yearStart) ?? 0;
      if (firstYear / totalFtes > 0.5) {
        alerts.push(
          `Concentración en año ${yearStart}: ${Math.round((firstYear / totalFtes) * 100)}% de las contrataciones. Verifica capacidad de RR.HH.`,
        );
      }
    }
  }
  if (activeCat === "money") {
    const yearAcc = new Map<number, number>();
    for (const n of needs) {
      if (n.amountEstimated == null) continue;
      yearAcc.set(n.yearStart, (yearAcc.get(n.yearStart) ?? 0) + n.amountEstimated);
    }
    const max = Math.max(...Array.from(yearAcc.values()));
    if (max > totalEstimated * 0.5 && totalEstimated > 0) {
      const maxYear = Array.from(yearAcc.entries()).find(([, v]) => v === max)?.[0];
      alerts.push(
        `Concentración de CAPEX en año ${maxYear}. Considera financiamiento escalonado.`,
      );
    }
  }
  if (activeCat === "methods") {
    for (const n of needs) {
      if (n.description.toLowerCase().includes("iso") || n.description.toLowerCase().includes("certif")) {
        const span = n.yearEnd - new Date().getFullYear();
        if (span <= 1) {
          alerts.push(`Certificación "${n.description}" tiene plazo corto. Iniciar pronto.`);
        }
      }
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 size-4" /> Atrás
        </Button>
      </div>

      {/* Tabs sticky */}
      <div className="sticky top-0 z-10 -mx-2 flex flex-wrap gap-1 bg-background/80 px-2 py-2 backdrop-blur">
        {CATEGORIES.map((c) => {
          const I = ICONS[c.icon] ?? Coins;
          const isActive = activeCat === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setActiveCat(c.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                isActive
                  ? "border-2"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted",
              )}
              style={
                isActive
                  ? { borderColor: c.color, backgroundColor: c.bgPastel, color: c.color }
                  : undefined
              }
            >
              <I className="size-3.5" />
              <span>{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Header categoría */}
      <Card style={{ backgroundColor: cat.bgPastel }}>
        <CardContent className="flex items-center gap-4 py-5">
          <div
            className="flex size-14 items-center justify-center rounded-xl"
            style={{ backgroundColor: cat.color, color: "white" }}
          >
            <Icon className="size-7" />
          </div>
          <div>
            <h3 className="text-xl font-semibold" style={{ color: cat.color }}>
              {cat.label} · {cat.subtitle}
            </h3>
            <p className="text-sm" style={{ color: cat.color, opacity: 0.85 }}>
              {cat.description}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Métricas resumen */}
      <div className="grid gap-3 sm:grid-cols-4">
        <MetricBlock label="Total estimado" value={formatMoneyShort(totalEstimated) + " USD"} />
        <MetricBlock label="Asegurado" value={formatMoneyShort(totalSecured) + " USD"} tone="ok" />
        <MetricBlock label="Brecha" value={formatMoneyShort(totalGap) + " USD"} tone="warn" />
        <MetricBlock
          label={cat.key === "manpower" ? "Total FTEs" : "Necesidades"}
          value={cat.key === "manpower" ? `${totalQty.toFixed(0)}` : `${needs.length}`}
        />
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <Card className="border-amber-500/30 bg-transparent">
          <CardContent className="space-y-1 py-3 text-xs text-amber-700">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>{a}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabla operativa */}
      <NeedsTable
        category={activeCat}
        needs={needs}
        setup={setup}
        onUpsert={onUpsert}
        onDelete={onDelete}
      />

      {/* Distribución por año */}
      {totalEstimated > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-left text-sm">
              Distribución por año (estimado)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {years.map((y) => {
              const amt = byYear.get(y) ?? 0;
              const pct = (amt / maxYearAmount) * 100;
              return (
                <div key={y} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{y}</span>
                    <span className="font-medium">{formatMoneyShort(amt)} USD</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 size-4" /> Atrás
        </Button>
        {nextCat ? (
          <Button onClick={() => setActiveCat(nextCat.key)}>
            Siguiente: {nextCat.label} <ChevronRight className="ml-1 size-4" />
          </Button>
        ) : (
          <Button onClick={onContinue}>
            Consolidar plan <ChevronRight className="ml-1 size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "ok" | "warn";
}) {
  return (
    <Card>
      <CardContent className="py-3 text-left">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={cn(
            "mt-1 text-xl font-semibold",
            tone === "ok" && "text-emerald-700",
            tone === "warn" && "text-amber-700",
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function NeedsTable({
  category,
  needs,
  setup,
  onUpsert,
  onDelete,
}: {
  category: ResourceCategory;
  needs: Need[];
  setup: SetupData;
  onUpsert: (args: {
    id?: string;
    category: ResourceCategory;
    description: string;
    yearStart: number;
    yearEnd: number;
    amountEstimated?: number | null;
    quantity?: number | null;
    unit?: string | null;
    amountSecured?: number;
    provisionStatus?: "planeada" | "comprometida" | "en_gestion" | "asegurada" | "faltante";
    riskLevel?: "bajo" | "medio" | "alto";
    notes?: string | null;
  }) => void;
  onDelete: (id: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, Partial<Need>>>({});

  function getValue(n: Need, field: keyof Need): string | number {
    const draft = drafts[n.id];
    const v = draft && field in draft ? (draft as Record<string, unknown>)[field as string] : n[field];
    if (v == null) return "";
    return v as string | number;
  }

  function update(n: Need, field: keyof Need, value: string) {
    setDrafts((d) => ({ ...d, [n.id]: { ...d[n.id], [field]: value } }));
  }

  function commit(n: Need) {
    const draft = drafts[n.id];
    if (!draft) return;
    const description = (draft.description as string) ?? n.description;
    const yearStart = Number(draft.yearStart ?? n.yearStart);
    const yearEnd = Number(draft.yearEnd ?? n.yearEnd);
    const amountRaw = draft.amountEstimated as unknown as string | number | null | undefined;
    const amountEstimated = amountRaw != null && amountRaw !== "" ? Number(amountRaw) : n.amountEstimated;
    const qtyRaw = draft.quantity as unknown as string | number | null | undefined;
    const quantity = qtyRaw != null && qtyRaw !== "" ? Number(qtyRaw) : n.quantity;
    const securedRaw = draft.amountSecured as unknown as string | number | null | undefined;
    const amountSecured = securedRaw != null && securedRaw !== "" ? Number(securedRaw) : n.amountSecured;
    onUpsert({
      id: n.id,
      category,
      description,
      yearStart,
      yearEnd,
      amountEstimated,
      quantity,
      unit: (draft.unit as string | undefined) ?? n.unit,
      amountSecured,
      provisionStatus: (draft.provisionStatus as "planeada" | "comprometida" | "en_gestion" | "asegurada" | "faltante" | undefined) ?? n.provisionStatus as "planeada" | "comprometida" | "en_gestion" | "asegurada" | "faltante",
      riskLevel: computeRiskLevel(amountEstimated ?? null, amountSecured ?? 0),
      notes: (draft.notes as string | undefined) ?? n.notes,
    });
    setDrafts((d) => {
      const { [n.id]: _, ...rest } = d;
      void _;
      return rest;
    });
  }

  function handleAdd() {
    onUpsert({
      category,
      description: "Nueva necesidad",
      yearStart: setup.cycle.yearStart,
      yearEnd: setup.cycle.yearEnd,
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-left text-sm">Plan operativo</CardTitle>
          <Button size="sm" variant="outline" onClick={handleAdd}>
            <Plus className="mr-1 size-4" /> Agregar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-3 py-2 font-medium">Descripción</th>
              <th className="px-2 py-2 font-medium">Cantidad</th>
              <th className="px-2 py-2 font-medium">Unidad</th>
              <th className="px-2 py-2 font-medium">Monto USD</th>
              <th className="px-2 py-2 font-medium">Asegurado</th>
              <th className="px-2 py-2 font-medium">Año inicio</th>
              <th className="px-2 py-2 font-medium">Año fin</th>
              <th className="px-2 py-2 font-medium">Estado</th>
              <th className="px-2 py-2 font-medium">Riesgo</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {needs.map((n) => {
              const risk = RISK_LEVELS.find((r) => r.value === n.riskLevel);
              return (
                <tr key={n.id} className="border-t">
                  <td className="px-2 py-1">
                    <Input
                      className="h-8 text-xs"
                      value={getValue(n, "description") as string}
                      onChange={(e) => update(n, "description", e.target.value)}
                      onBlur={() => commit(n)}
                    />
                  </td>
                  <td className="px-2 py-1 w-24">
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={getValue(n, "quantity") as string}
                      onChange={(e) => update(n, "quantity", e.target.value)}
                      onBlur={() => commit(n)}
                    />
                  </td>
                  <td className="px-2 py-1 w-24">
                    <Input
                      className="h-8 text-xs"
                      value={getValue(n, "unit") as string}
                      onChange={(e) => update(n, "unit", e.target.value)}
                      onBlur={() => commit(n)}
                      placeholder="FTEs, m²"
                    />
                  </td>
                  <td className="px-2 py-1 w-28">
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={getValue(n, "amountEstimated") as string}
                      onChange={(e) => update(n, "amountEstimated", e.target.value)}
                      onBlur={() => commit(n)}
                    />
                  </td>
                  <td className="px-2 py-1 w-28">
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={getValue(n, "amountSecured") as string}
                      onChange={(e) => update(n, "amountSecured", e.target.value)}
                      onBlur={() => commit(n)}
                    />
                  </td>
                  <td className="px-2 py-1 w-20">
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={getValue(n, "yearStart") as string}
                      onChange={(e) => update(n, "yearStart", e.target.value)}
                      onBlur={() => commit(n)}
                    />
                  </td>
                  <td className="px-2 py-1 w-20">
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={getValue(n, "yearEnd") as string}
                      onChange={(e) => update(n, "yearEnd", e.target.value)}
                      onBlur={() => commit(n)}
                    />
                  </td>
                  <td className="px-2 py-1 w-32">
                    <Select
                      value={n.provisionStatus}
                      onValueChange={(v) =>
                        onUpsert({
                          id: n.id,
                          category,
                          description: n.description,
                          yearStart: n.yearStart,
                          yearEnd: n.yearEnd,
                          amountEstimated: n.amountEstimated,
                          quantity: n.quantity,
                          unit: n.unit,
                          amountSecured: n.amountSecured,
                          provisionStatus: v as "planeada" | "comprometida" | "en_gestion" | "asegurada" | "faltante",
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVISION_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1 text-center">
                    {risk && (
                      <Badge
                        className="border-0 text-[10px]"
                        style={{ backgroundColor: risk.bg, color: risk.color }}
                      >
                        {risk.label}
                      </Badge>
                    )}
                  </td>
                  <td className="px-2 py-1 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(n.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {needs.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Sin necesidades en esta categoría. Agrega o re-detecta.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// STEP 3 · Consolidar
// ────────────────────────────────────────────────────────────────────

function Step3({
  cycleId,
  setup,
  onBack,
  onConfirm,
  presentationMode,
  setPresentationMode,
}: {
  cycleId: string;
  setup: SetupData;
  onBack: () => void;
  onConfirm: () => void;
  presentationMode: boolean;
  setPresentationMode: (v: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const totalEstimated = setup.needs.reduce(
    (s, n) => s + (n.amountEstimated ?? 0),
    0,
  );
  const totalSecured = setup.needs.reduce((s, n) => s + n.amountSecured, 0);
  const totalGap = totalEstimated - totalSecured;
  const totalFtes = setup.needs
    .filter((n) => n.category === "manpower")
    .reduce((s, n) => s + (n.quantity ?? 0), 0);

  const years: number[] = [];
  for (let y = setup.cycle.yearStart; y <= setup.cycle.yearEnd; y++) years.push(y);

  // Stacked: por año por categoría
  const byYearByCat = new Map<number, Map<ResourceCategory, number>>();
  for (const y of years) {
    const m = new Map<ResourceCategory, number>();
    for (const c of CATEGORIES) m.set(c.key, 0);
    byYearByCat.set(y, m);
  }
  for (const n of setup.needs) {
    if (n.amountEstimated == null) continue;
    const span = Math.max(1, n.yearEnd - n.yearStart + 1);
    const perYear = n.amountEstimated / span;
    for (let y = n.yearStart; y <= n.yearEnd; y++) {
      const m = byYearByCat.get(y);
      if (!m) continue;
      m.set(n.category as ResourceCategory, (m.get(n.category as ResourceCategory) ?? 0) + perYear);
    }
  }
  const yearTotals = years.map((y) =>
    Array.from(byYearByCat.get(y)?.values() ?? []).reduce((s, v) => s + v, 0),
  );
  const maxYearTotal = Math.max(1, ...yearTotals);

  // Resumen por categoría
  const byCat = CATEGORIES.map((cat) => {
    const items = setup.needs.filter((n) => n.category === cat.key);
    const total = items.reduce((s, n) => s + (n.amountEstimated ?? 0), 0);
    const secured = items.reduce((s, n) => s + n.amountSecured, 0);
    const gap = total - secured;
    const risk = items.some((n) => n.riskLevel === "alto")
      ? "alto"
      : items.some((n) => n.riskLevel === "medio")
      ? "medio"
      : "bajo";
    return { cat, count: items.length, total, secured, gap, risk: risk as "bajo" | "medio" | "alto" };
  });

  // Brechas críticas
  const criticalGaps = setup.needs
    .filter((n) => n.riskLevel === "alto")
    .map((n) => ({
      ...n,
      gap: (n.amountEstimated ?? 0) - n.amountSecured,
    }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 8);

  const narrative = useMemo(() => {
    if (setup.needs.length === 0) {
      return "Sin necesidades aún. Vuelve al paso 1 y re-detecta para empezar.";
    }
    const concentratedYears = years
      .map((y, i) => ({ y, t: yearTotals[i] }))
      .filter((x) => x.t > totalEstimated * 0.25);
    const concentratedText =
      concentratedYears.length > 0
        ? `con concentración en ${concentratedYears.map((c) => c.y).join(", ")}`
        : "con distribución relativamente equilibrada";
    const topCritical = byCat
      .filter((c) => c.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 2)
      .map((c) => c.cat.label);
    return `Tu plan requiere ${formatMoneyShort(totalEstimated)} USD ${concentratedText} en ${setup.cycle.yearEnd - setup.cycle.yearStart} años. ${
      topCritical.length > 0
        ? `Las brechas más críticas están en ${topCritical.join(" y ")}. `
        : ""
    }Prioridad: asegurar ${formatMoneyShort(totalGap)} USD de capital antes de ${setup.cycle.yearStart + 2}.`;
  }, [setup.needs, setup.cycle, years, yearTotals, totalEstimated, totalGap, byCat]);

  async function handleExportPdf() {
    const data = await utils.resources.getExportData.fetch({ cycleId });
    const ctx: ExportResourcesContext = {
      cycle: data.cycle,
      organization: data.organization,
      plan: {
        id: data.plan.id,
        horizonStart: data.plan.horizonStart,
        horizonEnd: data.plan.horizonEnd,
        totalInvestment: data.plan.totalInvestment,
        currency: data.plan.currency,
        status: data.plan.status,
      },
      needs: data.needs as unknown as ExportNeed[],
      manpowerProfiles: data.manpowerProfiles as unknown as ExportManpowerProfile[],
      moneySources: data.moneySources as unknown as ExportMoneySource[],
    };
    exportResourcesPdf(ctx);
    toast.success("PDF generado");
  }

  async function handleExportExcel() {
    const data = await utils.resources.getExportData.fetch({ cycleId });
    const ctx: ExportResourcesContext = {
      cycle: data.cycle,
      organization: data.organization,
      plan: {
        id: data.plan.id,
        horizonStart: data.plan.horizonStart,
        horizonEnd: data.plan.horizonEnd,
        totalInvestment: data.plan.totalInvestment,
        currency: data.plan.currency,
        status: data.plan.status,
      },
      needs: data.needs as unknown as ExportNeed[],
      manpowerProfiles: data.manpowerProfiles as unknown as ExportManpowerProfile[],
      moneySources: data.moneySources as unknown as ExportMoneySource[],
    };
    exportResourcesExcel(ctx);
    toast.success("Excel generado");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 size-4" /> Atrás
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPresentationMode(!presentationMode)}
          >
            {presentationMode ? (
              <>
                <Minimize2 className="mr-1 size-4" /> Salir
              </>
            ) : (
              <>
                <Maximize2 className="mr-1 size-4" /> Presentación
              </>
            )}
          </Button>
          <Button onClick={onConfirm}>
            <CheckCircle2 className="mr-1 size-4" /> Confirmar plan
          </Button>
        </div>
      </div>

      <Card className="border-primary/25 bg-primary/5">
        <CardContent className="py-4 text-left text-sm text-primary">
          <strong>Plan integral de recursos listo.</strong> Tu organización requiere{" "}
          <strong>{formatMoneyShort(totalEstimated)} USD</strong> de inversión y{" "}
          <strong>+{totalFtes.toFixed(0)} FTEs</strong> en los próximos{" "}
          {setup.cycle.yearEnd - setup.cycle.yearStart} años para ejecutar el plan
          estratégico.
        </CardContent>
      </Card>

      {/* Flujo de inversión */}
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base">
            Flujo de inversión por año (USD)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2 text-[10px]">
            {CATEGORIES.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1">
                <span
                  className="inline-block size-2.5 rounded-sm"
                  style={{ backgroundColor: c.color }}
                />
                {c.label}
              </span>
            ))}
          </div>
          <div className="flex h-72 items-end gap-2">
            {years.map((y, i) => {
              const total = yearTotals[i];
              const pct = (total / maxYearTotal) * 100;
              const m = byYearByCat.get(y)!;
              return (
                <div key={y} className="flex flex-1 flex-col items-center gap-1">
                  <div className="text-[10px] font-semibold">
                    {formatMoneyShort(total)}
                  </div>
                  <div className="relative flex w-full flex-col justify-end" style={{ height: `${pct}%`, minHeight: total > 0 ? 8 : 0 }}>
                    {CATEGORIES.map((cat) => {
                      const v = m.get(cat.key) ?? 0;
                      if (v === 0) return null;
                      const segPct = (v / total) * 100;
                      return (
                        <div
                          key={cat.key}
                          style={{
                            height: `${segPct}%`,
                            backgroundColor: cat.color,
                          }}
                          title={`${cat.label}: ${formatMoneyShort(v)} USD`}
                        />
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{y}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabla resumen 7M */}
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base">Resumen por categoría 7M</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-3 py-2 font-medium">Categoría</th>
                <th className="px-2 py-2 font-medium text-right">Necesidades</th>
                <th className="px-2 py-2 font-medium text-right">Estimado</th>
                <th className="px-2 py-2 font-medium text-right">Asegurado</th>
                <th className="px-2 py-2 font-medium text-right">Brecha</th>
                <th className="px-2 py-2 font-medium text-center">Riesgo</th>
              </tr>
            </thead>
            <tbody>
              {byCat.map(({ cat, count, total, secured, gap, risk }) => {
                const riskDef = RISK_LEVELS.find((r) => r.value === risk);
                return (
                  <tr
                    key={cat.key}
                    className={cn("border-t", risk === "alto" && "bg-transparent")}
                  >
                    <td className="px-3 py-2">
                      <span
                        className="font-semibold"
                        style={{ color: cat.color }}
                      >
                        {cat.label}
                      </span>{" "}
                      <span className="text-muted-foreground">· {cat.subtitle}</span>
                    </td>
                    <td className="px-2 py-2 text-right">{count}</td>
                    <td className="px-2 py-2 text-right">
                      {formatMoneyShort(total)}
                    </td>
                    <td className="px-2 py-2 text-right text-emerald-700">
                      {formatMoneyShort(secured)}
                    </td>
                    <td className="px-2 py-2 text-right text-amber-700">
                      {formatMoneyShort(gap)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {riskDef && (
                        <Badge
                          className="border-0 text-[10px]"
                          style={{ backgroundColor: riskDef.bg, color: riskDef.color }}
                        >
                          {riskDef.label}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t bg-muted/20 font-semibold">
                <td className="px-3 py-2">TOTAL</td>
                <td className="px-2 py-2 text-right">{setup.needs.length}</td>
                <td className="px-2 py-2 text-right">{formatMoneyShort(totalEstimated)}</td>
                <td className="px-2 py-2 text-right text-emerald-700">
                  {formatMoneyShort(totalSecured)}
                </td>
                <td className="px-2 py-2 text-right text-amber-700">
                  {formatMoneyShort(totalGap)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Brechas críticas */}
      {criticalGaps.length > 0 && (
        <Card className="border-rose-500/30 bg-transparent">
          <CardHeader>
            <CardTitle className="text-left text-base text-rose-700">
              Brechas críticas ({criticalGaps.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            {criticalGaps.map((g) => {
              const cat = getCategoryDef(g.category);
              return (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-md border border-rose-500/30 bg-white/60 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      className="text-[10px]"
                      style={{ backgroundColor: cat?.color, color: "white" }}
                    >
                      {cat?.label}
                    </Badge>
                    <span>{g.description}</span>
                  </div>
                  <span className="font-semibold text-rose-700">
                    Brecha: {formatMoneyShort(g.gap)} USD
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Análisis narrativo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base">Análisis del plan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-left text-muted-foreground">
          {narrative}
        </CardContent>
      </Card>

      <Card
        className={cn(
          "border-2",
          totalGap === 0 && setup.needs.length > 0
            ? "border-emerald-500/30 bg-transparent"
            : "border-amber-500/30 bg-transparent",
        )}
      >
        <CardContent className="flex items-start gap-3 py-4 text-left text-sm">
          {totalGap === 0 && setup.needs.length > 0 ? (
            <>
              <CheckCircle2 className="mt-0.5 size-5 text-emerald-700" />
              <span className="text-emerald-700">
                <strong>Plan de recursos completo.</strong> Todas las necesidades están
                aseguradas. Listo para presentar al directorio e integrarse al Plan Estratégico
                Integral.
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="mt-0.5 size-5 text-amber-700" />
              <span className="text-amber-700">
                <strong>Plan con brechas pendientes.</strong> Revisa las brechas críticas y
                asegura financiamiento antes de cerrar M4.
              </span>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base">Exportar plan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportPdf}>
            <FileText className="mr-1 size-4" /> PDF ejecutivo
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileDown className="mr-1 size-4" /> Excel financiero
          </Button>
        </CardContent>
      </Card>

      <Card className="border-primary/25 bg-primary/5">
        <CardContent className="py-4 text-sm text-left text-primary">
          <strong className="block">¿Qué sigue?</strong>
          Con tus recursos definidos, has completado M4 · Implementación. El siguiente paso
          es M5 · Control, donde definirás cómo medir el avance de tu plan con un sistema de
          indicadores y tablero ejecutivo.
        </CardContent>
      </Card>
    </div>
  );
}
