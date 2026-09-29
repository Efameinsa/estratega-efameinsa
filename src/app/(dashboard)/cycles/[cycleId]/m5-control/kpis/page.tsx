"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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
  FileText,
  FileDown,
  RefreshCw,
  Copy,
  Plug,
  HandMetal,
  Coins,
  Target,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  BSC_DIMENSIONS,
  FREQUENCY_OPTIONS,
  DIRECTION_OPTIONS,
  getDimensionDef,
  generatePeriods,
  computeThresholds,
  type BscDimension,
} from "@/lib/kpi-suggestions";
import { exportKpiPdf, exportKpiExcel } from "@/lib/lazy-exports";
import type { ExportKpiContext, ExportKpi } from "@/lib/kpi-export";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type SetupData = RouterOutputs["kpis"]["setup"];
type Kpi = SetupData["kpis"][number];
type Step = 1 | 2 | 3;

const ICONS: Record<string, LucideIcon> = {
  Coins,
  Target,
  Settings2,
  Users,
};

export default function KpisPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const utils = trpc.useUtils();

  const [step, setStep] = useState<Step>(1);
  const [filterDim, setFilterDim] = useState<BscDimension | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const setupQuery = trpc.kpis.setup.useQuery({ cycleId });
  const coverageQuery = trpc.kpis.coverage.useQuery({ cycleId }, { enabled: step === 3 });

  const autoDetect = trpc.kpis.autoDetect.useMutation({
    onSuccess: (res) => {
      utils.kpis.setup.invalidate({ cycleId });
      if (res.created > 0) toast.success(`${res.created} indicadores sugeridos`);
      else toast.info("Sin nuevas sugerencias");
    },
    onError: (e) => toast.error(e.message),
  });

  const setStatusMut = trpc.kpis.setStatus.useMutation({
    onSuccess: () => utils.kpis.setup.invalidate({ cycleId }),
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.kpis.delete.useMutation({
    onSuccess: () => {
      utils.kpis.setup.invalidate({ cycleId });
      toast.success("Indicador eliminado");
    },
    onError: (e) => toast.error(e.message),
  });

  const setup = setupQuery.data;

  useEffect(() => {
    if (setup && setup.kpis.length === 0) {
      autoDetect.mutate({ cycleId, replaceAuto: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup?.kpis.length, cycleId]);

  if (setupQuery.isLoading) {
    return (
      <div className="animate-pulse text-muted-foreground">Cargando KPIs y Metas...</div>
    );
  }
  if (!setup) {
    return (
      <div className="text-muted-foreground">No se pudo cargar la información del ciclo.</div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />
      <Stepper step={step} onChange={setStep} />

      {step === 1 && (
        <Step1
          setup={setup}
          filterDim={filterDim}
          setFilterDim={setFilterDim}
          onAccept={(id) => setStatusMut.mutate({ id, status: "aceptado" })}
          onDiscard={(id) => setStatusMut.mutate({ id, status: "descartado" })}
          onEdit={(k) => {
            setEditingId(k.id);
            setStep(2);
          }}
          onRegen={() => autoDetect.mutate({ cycleId, replaceAuto: false })}
          isGen={autoDetect.isPending}
          onContinue={() => setStep(2)}
          onCreateCustom={() => {
            setEditingId(null);
            setStep(2);
          }}
          onDelete={(id) => deleteMut.mutate({ id })}
        />
      )}

      {step === 2 && (
        <Step2
          cycleId={cycleId}
          setup={setup}
          editingId={editingId}
          setEditingId={setEditingId}
          onBack={() => setStep(1)}
          onContinue={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <Step3
          cycleId={cycleId}
          setup={setup}
          coverage={coverageQuery.data}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div className="space-y-1 text-left">
      <h2 className="text-lg font-semibold">KPIs y Metas</h2>
      <p className="text-sm text-muted-foreground">
        Diseña los indicadores estratégicos del BSC. Cada KPI vinculado con OLPs, OCPs, con
        umbrales semáforo y fuente de datos (EduCaNet o manual).
      </p>
    </div>
  );
}

function Stepper({ step, onChange }: { step: Step; onChange: (s: Step) => void }) {
  const steps: { id: Step; label: string; description: string }[] = [
    { id: 1, label: "1 · Identificar", description: "Sugerencias por OLPs y OCPs" },
    { id: 2, label: "2 · Diseñar", description: "Detalle, fuente, metas, vínculos" },
    { id: 3, label: "3 · Validar", description: "Cobertura BSC y exportación" },
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
// STEP 1
// ────────────────────────────────────────────────────────────────────

function Step1({
  setup,
  filterDim,
  setFilterDim,
  onAccept,
  onDiscard,
  onEdit,
  onRegen,
  isGen,
  onContinue,
  onCreateCustom,
  onDelete,
}: {
  setup: SetupData;
  filterDim: BscDimension | "all";
  setFilterDim: (d: BscDimension | "all") => void;
  onAccept: (id: string) => void;
  onDiscard: (id: string) => void;
  onEdit: (k: Kpi) => void;
  onRegen: () => void;
  isGen: boolean;
  onContinue: () => void;
  onCreateCustom: () => void;
  onDelete: (id: string) => void;
}) {
  const active = setup.kpis.filter((k) => k.status !== "descartado");
  const filtered =
    filterDim === "all" ? active : active.filter((k) => k.dimensionBsc === filterDim);

  const acceptedStatuses = new Set(["aceptado", "en_edicion", "confirmado"]);
  const metrics = {
    suggested: active.length,
    accepted: active.filter((k) => acceptedStatuses.has(k.status)).length,
    educanet: active.filter((k) => k.source === "educanet").length,
    dimensionsCovered: new Set(active.map((k) => k.dimensionBsc)).size,
  };

  const countByDim = new Map<string, number>();
  for (const k of active) {
    countByDim.set(k.dimensionBsc, (countByDim.get(k.dimensionBsc) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/25 bg-primary/10/40">
        <CardContent className="py-4 text-left text-sm text-primary">
          <strong className="block">Define cómo medirás tu plan.</strong>
          <span className="text-primary/80">
            El sistema analizó tus OLPs y OCPs para sugerirte indicadores iniciales en las 4
            dimensiones del Balanced Scorecard. Revisa, acepta o agrega los que necesites.
          </span>
        </CardContent>
      </Card>

      <Card className="border-emerald-500/30 bg-transparent">
        <CardContent className="py-4 text-left text-sm text-emerald-300">
          <strong>{metrics.suggested} indicadores sugeridos.</strong> Origen:{" "}
          {setup.olps.length} OLPs y {setup.ocps.length} OCPs. Cobertura:{" "}
          {metrics.dimensionsCovered}/4 dimensiones BSC. {metrics.educanet} se conectarán con
          EduCaNet para recibir datos automáticamente.
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Sugeridos" value={metrics.suggested} />
        <MetricCard label="Aceptados" value={metrics.accepted} />
        <MetricCard label="Desde EduCaNet" value={metrics.educanet} />
        <MetricCard
          label="Cobertura BSC"
          value={`${metrics.dimensionsCovered}/4`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill
          active={filterDim === "all"}
          label={`Todos (${active.length})`}
          color="#94a3b8"
          onClick={() => setFilterDim("all")}
        />
        {BSC_DIMENSIONS.map((d) => (
          <FilterPill
            key={d.key}
            active={filterDim === d.key}
            label={`${d.shortLabel} (${countByDim.get(d.key) ?? 0})`}
            color={d.color}
            onClick={() => setFilterDim(d.key)}
          />
        ))}
      </div>

      <div className="space-y-3">
        {BSC_DIMENSIONS.map((dim) => {
          if (filterDim !== "all" && filterDim !== dim.key) return null;
          const items = filtered.filter((k) => k.dimensionBsc === dim.key);
          if (items.length === 0 && filterDim !== "all") return null;
          const Icon = ICONS[dim.icon] ?? Coins;
          return (
            <Card key={dim.key} style={{ borderLeftColor: dim.color, borderLeftWidth: 4 }}>
              <CardHeader className="flex-row items-center gap-3 py-3">
                <div
                  className="flex size-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: dim.bg, color: dim.color }}
                >
                  <Icon className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-left text-base" style={{ color: dim.color }}>
                    {dim.label}
                  </CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {items.length} indicadores
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Sin indicadores en esta dimensión.
                  </p>
                ) : (
                  items.map((k) => (
                    <KpiCardStep1
                      key={k.id}
                      kpi={k}
                      onAccept={() => onAccept(k.id)}
                      onDiscard={() => onDiscard(k.id)}
                      onEdit={() => onEdit(k)}
                      onDelete={() => onDelete(k.id)}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}

        <Card
          className="cursor-pointer border-dashed bg-muted/10 transition hover:bg-muted/30"
          onClick={onCreateCustom}
        >
          <CardContent className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Plus className="size-4" /> Crear indicador personalizado
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onRegen} disabled={isGen}>
          <RefreshCw className={cn("mr-2 size-4", isGen && "animate-spin")} /> Regenerar
          sugerencias
        </Button>
        <Button onClick={onContinue}>
          Continuar a diseñar <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="py-3 text-left">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function FilterPill({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active ? "text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
      style={{
        borderColor: active ? color : "transparent",
        backgroundColor: active ? color : "rgba(0,0,0,0.04)",
      }}
    >
      {label}
    </button>
  );
}

function KpiCardStep1({
  kpi,
  onAccept,
  onDiscard,
  onEdit,
  onDelete,
}: {
  kpi: Kpi;
  onAccept: () => void;
  onDiscard: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isAccepted = kpi.status !== "sugerido";
  return (
    <div
      className={cn(
        "rounded-md border bg-background p-3 transition",
        isAccepted && "border-emerald-500/30",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">{kpi.code}</span>
            {isAccepted ? (
              <Badge variant="outline" className="border-emerald-400 text-[10px] text-emerald-300">
                <CheckCircle2 className="mr-1 size-3" /> Aceptado
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                <Sparkles className="mr-1 size-3" /> Sugerido
              </Badge>
            )}
            {kpi.source === "educanet" ? (
              <Badge className="border-primary/30 bg-primary/15 text-[10px] text-primary">
                <Plug className="mr-1 size-3" /> EduCaNet
              </Badge>
            ) : (
              <Badge className="border-amber-500/30 bg-transparent text-[10px] text-amber-300">
                <HandMetal className="mr-1 size-3" /> Manual
              </Badge>
            )}
          </div>
          <h4 className="text-sm font-semibold">{kpi.name}</h4>
          {kpi.description && (
            <p className="text-xs text-muted-foreground">{kpi.description}</p>
          )}
          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            {kpi.olps.length > 0 && (
              <span>
                <strong>OLPs:</strong> {kpi.olps.length}
              </span>
            )}
            {kpi.ocps.length > 0 && (
              <span>
                <strong>OCPs:</strong> {kpi.ocps.length}
              </span>
            )}
            <span>
              <strong>{kpi.unit ?? "—"}</strong> · {kpi.frequency} · {kpi.direction}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {!isAccepted && (
            <Button size="sm" onClick={onAccept}>
              Aceptar y diseñar
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onEdit}>
            Editar
          </Button>
          <Button size="sm" variant="ghost" onClick={onDiscard}>
            Descartar
          </Button>
          <button
            type="button"
            onClick={onDelete}
            className="ml-1 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// STEP 2 · Diseñar
// ────────────────────────────────────────────────────────────────────

function Step2({
  cycleId,
  setup,
  editingId,
  setEditingId,
  onBack,
  onContinue,
}: {
  cycleId: string;
  setup: SetupData;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const utils = trpc.useUtils();
  const editable = setup.kpis.filter(
    (k) => k.status === "aceptado" || k.status === "en_edicion" || k.status === "confirmado",
  );
  const current = editingId ? setup.kpis.find((k) => k.id === editingId) : null;

  const upsert = trpc.kpis.upsert.useMutation({
    onSuccess: (saved) => {
      utils.kpis.setup.invalidate({ cycleId });
      setEditingId(saved.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const setOlpsMut = trpc.kpis.setOlps.useMutation({
    onSuccess: () => utils.kpis.setup.invalidate({ cycleId }),
    onError: (e) => toast.error(e.message),
  });
  const setOcpsMut = trpc.kpis.setOcps.useMutation({
    onSuccess: () => utils.kpis.setup.invalidate({ cycleId }),
    onError: (e) => toast.error(e.message),
  });

  const upsertPeriod = trpc.kpis.upsertPeriod.useMutation({
    onSuccess: () => utils.kpis.setup.invalidate({ cycleId }),
    onError: (e) => toast.error(e.message),
  });

  const regenEducanet = trpc.kpis.regenerateEducanetId.useMutation({
    onSuccess: () => {
      utils.kpis.setup.invalidate({ cycleId });
      toast.success("ID EduCaNet regenerado");
    },
    onError: (e) => toast.error(e.message),
  });

  const setStatusMut = trpc.kpis.setStatus.useMutation({
    onSuccess: () => utils.kpis.setup.invalidate({ cycleId }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 size-4" /> Volver
        </Button>
        <Button variant="ghost" size="sm" onClick={onContinue}>
          Ver validación <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>

      <div className="sticky top-0 z-10 -mx-2 bg-background/85 px-2 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {editable.length} indicadores
          </span>
          {editable.map((k) => {
            const isCurrent = editingId === k.id;
            const isConfirmed = k.status === "confirmado";
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => setEditingId(k.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
                  isCurrent
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : isConfirmed
                    ? "border-emerald-500/30 bg-transparent text-emerald-300"
                    : "border-border bg-muted/30 hover:bg-muted/60",
                )}
              >
                {isConfirmed && <CheckCircle2 className="size-3" />}
                <span className="font-mono">{k.code}</span>
                <span className="max-w-[180px] truncate">{k.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {current ? (
        <KpiEditor
          kpi={current}
          setup={setup}
          onUpsert={(data) => upsert.mutate({ cycleId, id: current.id, ...data })}
          onSetOlps={(ids) => setOlpsMut.mutate({ kpiId: current.id, olpIds: ids })}
          onSetOcps={(ids) => setOcpsMut.mutate({ kpiId: current.id, ocpIds: ids })}
          onUpsertPeriod={(args) => upsertPeriod.mutate({ kpiId: current.id, ...args })}
          onRegenEducanet={() => regenEducanet.mutate({ kpiId: current.id })}
          onConfirm={() => {
            setStatusMut.mutate({ id: current.id, status: "confirmado" });
            toast.success("Indicador confirmado");
          }}
        />
      ) : (
        <KpiEditorNew
          setup={setup}
          onCreate={(data) =>
            upsert.mutate(
              { cycleId, ...data },
              {
                onSuccess: (saved) => {
                  setEditingId(saved.id);
                },
              },
            )
          }
        />
      )}
    </div>
  );
}

function KpiEditorNew({
  setup,
  onCreate,
}: {
  setup: SetupData;
  onCreate: (data: {
    name: string;
    description: string;
    formula: string;
    dimensionBsc: BscDimension;
    unit: string;
    frequency: "mensual" | "trimestral" | "semestral" | "anual";
    direction: "mayor_mejor" | "menor_mejor" | "objetivo_puntual";
    source: "educanet" | "manual";
    status: "aceptado";
  }) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [dim, setDim] = useState<BscDimension>("resultados_economicos");
  const [unit, setUnit] = useState("USD");
  const [source, setSource] = useState<"educanet" | "manual">("educanet");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-left text-base">Crear indicador personalizado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-left">
        <div className="space-y-2">
          <Label>Nombre del indicador</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ventas totales" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Dimensión BSC</Label>
            <Select value={dim} onValueChange={(v) => setDim(v as BscDimension)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BSC_DIMENSIONS.map((d) => (
                  <SelectItem key={d.key} value={d.key}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Unidad</Label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Descripción</Label>
          <Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Fuente de datos</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <SourceCard
              active={source === "educanet"}
              icon={Plug}
              title="EduCaNet"
              description="Recibe datos automáticamente"
              onClick={() => setSource("educanet")}
            />
            <SourceCard
              active={source === "manual"}
              icon={HandMetal}
              title="Manual"
              description="Tú ingresas el valor periódicamente"
              onClick={() => setSource("manual")}
            />
          </div>
        </div>
        <Button
          onClick={() =>
            onCreate({
              name,
              description: desc,
              formula: "",
              dimensionBsc: dim,
              unit,
              frequency: "trimestral",
              direction: "mayor_mejor",
              source,
              status: "aceptado",
            })
          }
          disabled={!name.trim()}
        >
          Crear indicador
        </Button>
      </CardContent>
    </Card>
  );
}

function SourceCard({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start rounded-lg border p-4 text-left transition",
        active
          ? "border-2 border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border hover:bg-muted/30",
      )}
    >
      <Icon className={cn("mb-2 size-5", active && "text-primary")} />
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </button>
  );
}

function KpiEditor({
  kpi,
  setup,
  onUpsert,
  onSetOlps,
  onSetOcps,
  onUpsertPeriod,
  onRegenEducanet,
  onConfirm,
}: {
  kpi: Kpi;
  setup: SetupData;
  onUpsert: (data: {
    name: string;
    description: string;
    formula: string;
    dimensionBsc: BscDimension;
    unit: string;
    frequency: "mensual" | "trimestral" | "semestral" | "anual";
    direction: "mayor_mejor" | "menor_mejor" | "objetivo_puntual";
    source: "educanet" | "manual";
    educanetSendMode?: "manual" | "automatico" | null;
    manualResponsible?: string | null;
    responsibleAreaId?: string | null;
    responsibleRole?: string | null;
  }) => void;
  onSetOlps: (ids: string[]) => void;
  onSetOcps: (ids: string[]) => void;
  onUpsertPeriod: (args: {
    period: string;
    metaGreen?: number | null;
    metaAmber?: number | null;
    metaRed?: number | null;
    realValue?: number | null;
  }) => void;
  onRegenEducanet: () => void;
  onConfirm: () => void;
}) {
  const [form, setForm] = useState({
    name: kpi.name,
    description: kpi.description ?? "",
    formula: kpi.formula ?? "",
    dimensionBsc: kpi.dimensionBsc as BscDimension,
    unit: kpi.unit ?? "",
    frequency: kpi.frequency as "mensual" | "trimestral" | "semestral" | "anual",
    direction: kpi.direction as "mayor_mejor" | "menor_mejor" | "objetivo_puntual",
    source: kpi.source as "educanet" | "manual",
    educanetSendMode: (kpi.educanetSendMode ?? "manual") as "manual" | "automatico",
    manualResponsible: kpi.manualResponsible ?? "",
    responsibleAreaId: kpi.responsibleAreaId ?? "",
    responsibleRole: kpi.responsibleRole ?? "",
  });

  useEffect(() => {
    setForm({
      name: kpi.name,
      description: kpi.description ?? "",
      formula: kpi.formula ?? "",
      dimensionBsc: kpi.dimensionBsc as BscDimension,
      unit: kpi.unit ?? "",
      frequency: kpi.frequency as "mensual" | "trimestral" | "semestral" | "anual",
      direction: kpi.direction as "mayor_mejor" | "menor_mejor" | "objetivo_puntual",
      source: kpi.source as "educanet" | "manual",
      educanetSendMode: (kpi.educanetSendMode ?? "manual") as "manual" | "automatico",
      manualResponsible: kpi.manualResponsible ?? "",
      responsibleAreaId: kpi.responsibleAreaId ?? "",
      responsibleRole: kpi.responsibleRole ?? "",
    });
  }, [kpi.id]);

  function save() {
    onUpsert({
      name: form.name,
      description: form.description,
      formula: form.formula,
      dimensionBsc: form.dimensionBsc,
      unit: form.unit,
      frequency: form.frequency,
      direction: form.direction,
      source: form.source,
      educanetSendMode: form.source === "educanet" ? form.educanetSendMode : null,
      manualResponsible: form.source === "manual" ? form.manualResponsible || null : null,
      responsibleAreaId: form.responsibleAreaId || null,
      responsibleRole: form.responsibleRole || null,
    });
  }

  const periods = useMemo(
    () => generatePeriods(form.frequency, setup.cycle.yearStart, setup.cycle.yearEnd),
    [form.frequency, setup.cycle.yearStart, setup.cycle.yearEnd],
  );
  const periodMap = new Map(kpi.periods.map((p) => [p.period, p]));

  const olpIds = kpi.olps.map((o) => o.olpId);
  const ocpIds = kpi.ocps.map((o) => o.ocpId);

  const ready =
    form.name.trim() &&
    olpIds.length > 0 &&
    (form.source === "manual" || kpi.educanetLinkId);

  return (
    <div className="space-y-4">
      {/* BLOQUE 1: Identidad */}
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-sm">Identidad del indicador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-left">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Código</Label>
              <Input value={kpi.code} disabled />
            </div>
            <div className="space-y-1">
              <Label>Dimensión BSC</Label>
              <Select
                value={form.dimensionBsc}
                onValueChange={(v) =>
                  setForm({ ...form, dimensionBsc: v as BscDimension })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BSC_DIMENSIONS.map((d) => (
                    <SelectItem key={d.key} value={d.key}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Unidad</Label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="USD, %, días"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label>Descripción</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label>Fórmula de cálculo</Label>
            <Textarea
              rows={2}
              className="font-mono text-xs"
              value={form.formula}
              onChange={(e) => setForm({ ...form, formula: e.target.value })}
              placeholder="(Ventas - Costos) / Ventas × 100"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Frecuencia</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    frequency: v as "mensual" | "trimestral" | "semestral" | "anual",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Sentido</Label>
              <Select
                value={form.direction}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    direction: v as "mayor_mejor" | "menor_mejor" | "objetivo_puntual",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTION_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BLOQUE 2: Fuente de datos */}
      <Card className="border-2 border-primary/25">
        <CardHeader>
          <CardTitle className="text-left text-sm">Fuente de datos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-left">
          <div className="grid gap-3 sm:grid-cols-2">
            <SourceCard
              active={form.source === "educanet"}
              icon={Plug}
              title="EduCaNet"
              description="Recibe datos automáticamente"
              onClick={() => setForm({ ...form, source: "educanet" })}
            />
            <SourceCard
              active={form.source === "manual"}
              icon={HandMetal}
              title="Manual"
              description="Tú ingresas el valor periódicamente"
              onClick={() => setForm({ ...form, source: "manual" })}
            />
          </div>

          {form.source === "educanet" && (
            <div className="space-y-3 rounded-lg border bg-primary/10/30 p-4">
              <div className="space-y-1.5">
                <Label className="text-xs">ID de vinculación EduCaNet</Label>
                {kpi.educanetLinkId ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-muted px-3 py-1.5 font-mono text-xs">
                      {kpi.educanetLinkId}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(kpi.educanetLinkId!);
                        toast.success("ID copiado");
                      }}
                    >
                      <Copy className="mr-1 size-3.5" /> Copiar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (
                          confirm(
                            "Regenerar romperá el vínculo actual con EduCaNet. ¿Continuar?",
                          )
                        ) {
                          onRegenEducanet();
                        }
                      }}
                    >
                      <RefreshCw className="mr-1 size-3.5" /> Regenerar
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Guarda el indicador para generar el ID.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Copia este ID y pégalo en EduCaNet al configurar la métrica del proyecto.
                </p>
              </div>

              {kpi.educanetProjectId ? (
                <div className="rounded-md border border-emerald-500/30 bg-transparent p-3 text-xs">
                  <strong className="block text-emerald-300">Proyecto conectado</strong>
                  <span className="text-emerald-300">
                    Proyecto: {kpi.educanetProjectId}
                    {kpi.educanetLastReceivedAt && (
                      <>
                        {" "}· Última actualización:{" "}
                        {new Date(kpi.educanetLastReceivedAt).toLocaleString("es-PE")}
                      </>
                    )}
                  </span>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-primary/30 bg-muted/40 p-3 text-xs text-muted-foreground">
                  No hay proyecto vinculado aún. Configura desde EduCaNet usando el ID anterior.
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Modo de envío desde EduCaNet</Label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="sendMode"
                      checked={form.educanetSendMode === "manual"}
                      onChange={() => setForm({ ...form, educanetSendMode: "manual" })}
                    />
                    <span>
                      <strong>Manual</strong> — el usuario en EduCaNet presiona "Enviar a BSC"
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="sendMode"
                      checked={form.educanetSendMode === "automatico"}
                      onChange={() =>
                        setForm({ ...form, educanetSendMode: "automatico" })
                      }
                    />
                    <span>
                      <strong>Automático</strong> — al cierre de cada período según frecuencia
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {form.source === "manual" && (
            <div className="space-y-3 rounded-lg border bg-transparent p-4">
              <div className="space-y-1">
                <Label className="text-xs">Responsable de carga</Label>
                <Input
                  value={form.manualResponsible}
                  onChange={(e) =>
                    setForm({ ...form, manualResponsible: e.target.value })
                  }
                  placeholder="Nombre o área que carga el valor periódicamente"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                El sistema notificará cuando toque cargar, según la frecuencia del indicador.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BLOQUE 3: Vinculaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-sm">Vinculaciones estratégicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-left">
          <div className="space-y-2">
            <Label>OLPs que mide (al menos uno)</Label>
            <div className="flex flex-wrap gap-1.5">
              {setup.olps.map((olp, i) => {
                const isOn = olpIds.includes(olp.id);
                return (
                  <button
                    key={olp.id}
                    type="button"
                    onClick={() => {
                      const next = isOn
                        ? olpIds.filter((x) => x !== olp.id)
                        : [...olpIds, olp.id];
                      onSetOlps(next);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition",
                      isOn
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted/30 hover:bg-muted",
                    )}
                  >
                    OLP{i + 1} · {olp.description.slice(0, 50)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>OCPs que mide</Label>
            <div className="flex flex-wrap gap-1.5">
              {setup.ocps.map((ocp) => {
                const isOn = ocpIds.includes(ocp.id);
                return (
                  <button
                    key={ocp.id}
                    type="button"
                    onClick={() => {
                      const next = isOn
                        ? ocpIds.filter((x) => x !== ocp.id)
                        : [...ocpIds, ocp.id];
                      onSetOcps(next);
                    }}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs transition",
                      isOn
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted/30 hover:bg-muted",
                    )}
                  >
                    {ocp.code} ({ocp.year})
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BLOQUE 4: Metas y umbrales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-sm">Metas y umbrales por período</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-3 py-2 font-medium">Umbral</th>
                {periods.slice(0, 12).map((p) => (
                  <th key={p} className="px-2 py-2 font-mono text-[10px] font-medium">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["metaGreen", "metaAmber", "metaRed"] as const).map((field, idx) => {
                const labels = ["Meta (verde)", "Aceptable (ámbar)", "Crítico (rojo)"];
                const colors = ["text-emerald-400", "text-amber-400", "text-rose-400"];
                return (
                  <tr key={field} className="border-t">
                    <td className={cn("px-3 py-2 font-medium", colors[idx])}>
                      {labels[idx]}
                    </td>
                    {periods.slice(0, 12).map((p) => {
                      const row = periodMap.get(p);
                      const value = row?.[field] ?? "";
                      return (
                        <td key={p} className="px-1 py-1">
                          <Input
                            type="number"
                            className="h-7 text-xs"
                            defaultValue={value ?? ""}
                            onBlur={(e) => {
                              const v = e.target.value === "" ? null : Number(e.target.value);
                              onUpsertPeriod({ period: p, [field]: v });
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {periods.length > 12 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Mostrando primeros 12 períodos. Total: {periods.length}.
            </p>
          )}
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Las metas se cargan automáticamente de tus OCPs. Aceptable y Crítico se calculan
            ±15% sobre la meta. Puedes ajustar cualquier valor.
          </p>
        </CardContent>
      </Card>

      {/* BLOQUE 5: Responsabilidad */}
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-sm">Responsabilidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-left">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Área responsable</Label>
              <Select
                value={form.responsibleAreaId}
                onValueChange={(v) => setForm({ ...form, responsibleAreaId: v ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar área..." />
                </SelectTrigger>
                <SelectContent>
                  {(setup.structure?.nodes ?? []).map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.code} · {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Responsable directo</Label>
              <Input
                value={form.responsibleRole}
                onChange={(e) => setForm({ ...form, responsibleRole: e.target.value })}
                placeholder="Cargo específico"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {olpIds.length === 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-transparent px-3 py-2 text-xs text-amber-300">
          <AlertTriangle className="size-4" />
          Este indicador debe medir al menos un OLP.
        </div>
      )}

      {ready && (
        <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-transparent px-3 py-2 text-xs text-emerald-300">
          <CheckCircle2 className="mt-0.5 size-4" />
          <span>
            Indicador completo y conectado. Vinculado con {olpIds.length} OLP/s y{" "}
            {ocpIds.length} OCPs. Fuente {form.source} configurada. Listo para validar.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button onClick={save}>Guardar cambios</Button>
        {kpi.status !== "confirmado" && (
          <Button onClick={onConfirm} variant="default">
            <CheckCircle2 className="mr-1 size-4" /> Confirmar indicador
          </Button>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// STEP 3 · Validar
// ────────────────────────────────────────────────────────────────────

function Step3({
  cycleId,
  setup,
  coverage,
  onBack,
}: {
  cycleId: string;
  setup: SetupData;
  coverage: RouterOutputs["kpis"]["coverage"] | undefined;
  onBack: () => void;
}) {
  const utils = trpc.useUtils();
  const active = setup.kpis.filter((k) => k.status !== "descartado");
  const confirmed = active.filter((k) => k.status === "confirmado");
  const educanetCount = active.filter((k) => k.source === "educanet").length;
  const manualCount = active.filter((k) => k.source === "manual").length;
  const dimensionsCovered = new Set(active.map((k) => k.dimensionBsc)).size;

  async function handleExportPdf() {
    const data = await utils.kpis.getExportData.fetch({ cycleId });
    const ctx: ExportKpiContext = {
      cycle: data.cycle,
      organization: data.organization,
      kpis: data.kpis as unknown as ExportKpi[],
    };
    if (ctx.kpis.length === 0) {
      toast.error("Sin indicadores confirmados para exportar");
      return;
    }
    exportKpiPdf(ctx);
    toast.success("PDF generado");
  }

  async function handleExportExcel() {
    const data = await utils.kpis.getExportData.fetch({ cycleId });
    const ctx: ExportKpiContext = {
      cycle: data.cycle,
      organization: data.organization,
      kpis: data.kpis as unknown as ExportKpi[],
    };
    if (ctx.kpis.length === 0) {
      toast.error("Sin indicadores confirmados para exportar");
      return;
    }
    exportKpiExcel(ctx);
    toast.success("Excel generado");
  }

  const narrative = useMemo(() => {
    if (active.length === 0) return "Sin indicadores definidos.";
    const educanetPct = Math.round((educanetCount / active.length) * 100);
    const parts: string[] = [];
    parts.push(
      `Tu sistema BSC tiene ${confirmed.length} indicadores confirmados de ${active.length} totales.`,
    );
    parts.push(
      `La conexión con EduCaNet permitirá actualizar automáticamente ${educanetCount} indicadores (${educanetPct}% del total).`,
    );
    if (manualCount > 0) {
      parts.push(
        `Los ${manualCount} indicadores manuales deberán cargarse periódicamente.`,
      );
    }
    const dimsLow = coverage?.byDimension.filter((d) => d.count < 2) ?? [];
    if (dimsLow.length > 0) {
      parts.push(
        `Considera reforzar: ${dimsLow.map((d) => d.label).join(", ")}.`,
      );
    }
    return parts.join(" ");
  }, [active, confirmed, educanetCount, manualCount, coverage]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 size-4" /> Volver
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Confirmados" value={confirmed.length} />
        <MetricCard label="Desde EduCaNet" value={educanetCount} />
        <MetricCard label="Manuales" value={manualCount} />
        <MetricCard label="Cobertura BSC" value={`${dimensionsCovered}/4`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base">Cobertura por dimensión BSC</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {(coverage?.byDimension ?? []).map((d) => {
            const def = getDimensionDef(d.key)!;
            const Icon = ICONS[def.icon] ?? Coins;
            const isLow = d.count < 2;
            return (
              <div
                key={d.key}
                className={cn(
                  "rounded-lg border p-4 text-left",
                  isLow && "border-amber-500/30 bg-transparent",
                )}
                style={{ borderLeftColor: def.color, borderLeftWidth: 4 }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: def.bg, color: def.color }}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: def.color }}>
                      {def.label}
                    </div>
                    <div className={cn("text-xs", isLow && "text-amber-300")}>
                      {d.count} indicadores · {d.confirmed} confirmados
                    </div>
                  </div>
                </div>
                {isLow && (
                  <p className="mt-2 text-xs text-amber-300">
                    Cobertura baja. Considera agregar más indicadores en esta dimensión.
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base">Cobertura OLPs × Indicadores</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-3 py-2 font-medium">OLP</th>
                <th className="px-2 py-2 font-medium text-center">KPIs</th>
                <th className="px-2 py-2 font-medium text-center">EduCaNet</th>
                <th className="px-2 py-2 font-medium text-center">Manual</th>
                <th className="px-2 py-2 font-medium text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {(coverage?.olpCoverage ?? []).map((o) => (
                <tr key={o.olpId} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {o.olpCode}
                    </div>
                    <div>{o.description.slice(0, 100)}</div>
                  </td>
                  <td className="px-2 py-2 text-center font-semibold">{o.kpiCount}</td>
                  <td className="px-2 py-2 text-center">
                    {o.hasEducanet ? <Plug className="mx-auto size-4 text-primary" /> : "—"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {o.hasManual ? <HandMetal className="mx-auto size-4 text-amber-400" /> : "—"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {o.kpiCount > 0 ? (
                      <Badge className="bg-transparent0 text-[10px] hover:bg-transparent0">
                        OK
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">
                        Faltante
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base">Análisis del sistema de medición</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-left text-muted-foreground">
          {narrative}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base">Exportar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportPdf}>
            <FileText className="mr-1 size-4" /> PDF · Diccionario KPI
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileDown className="mr-1 size-4" /> Excel
          </Button>
        </CardContent>
      </Card>

      <Card className="border-primary/25 bg-primary/10/30">
        <CardContent className="py-4 text-sm text-left text-primary">
          <strong className="block">¿Qué sigue?</strong>
          Con tus indicadores definidos, ahora puedes ir al Tablero BSC para ver el estado
          actual de tu plan. Conforme EduCaNet envíe datos, el tablero se actualizará
          automáticamente.
        </CardContent>
      </Card>
    </div>
  );
}
