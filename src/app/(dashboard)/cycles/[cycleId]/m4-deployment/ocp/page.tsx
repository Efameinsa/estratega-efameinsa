"use client";

import { useEffect, useState } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Target,
  Flag,
  ChevronRight,
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowLeft,
  Map as MapIcon,
  Building2,
  Layers,
  GripVertical,
  Briefcase,
} from "lucide-react";
import {
  FREQUENCY_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  QUARTERS,
  distribute,
  type DistributionMode,
  type Quarter,
} from "@/lib/ocp-areas";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type SetupData = RouterOutputs["ocp"]["setupOverview"];
type OlpDetail = RouterOutputs["ocp"]["getByOlp"];
type RoadmapData = RouterOutputs["ocp"]["roadmap"];
type Step = 1 | 2 | 3;

interface OcpForm {
  description: string;
  year: number;
  metaValue: string;
  metaText: string;
  unit: string;
  responsibleAreaId: string;
  indicator: string;
  frequency: string;
  priority: string;
  status: "borrador" | "definido" | "en_ejecucion" | "cumplido" | "no_cumplido";
}

function emptyOcpForm(year: number): OcpForm {
  return {
    description: "",
    year,
    metaValue: "",
    metaText: "",
    unit: "",
    responsibleAreaId: "",
    indicator: "",
    frequency: "",
    priority: "",
    status: "borrador",
  };
}

export default function OcpPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const utils = trpc.useUtils();

  const [step, setStep] = useState<Step>(1);
  const [selectedOlpId, setSelectedOlpId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [distMode, setDistMode] = useState<DistributionMode>("lineal");
  const [form, setForm] = useState<OcpForm>(emptyOcpForm(0));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [supportAreaIds, setSupportAreaIds] = useState<string[]>([]);
  const [linkedStrategyIds, setLinkedStrategyIds] = useState<string[]>([]);
  const [showResource, setShowResource] = useState(false);
  const [actionDraft, setActionDraft] = useState<{ quarter: Quarter; description: string }>({
    quarter: "Q1",
    description: "",
  });

  const setupQuery = trpc.ocp.setupOverview.useQuery({ cycleId });
  const roadmapQuery = trpc.ocp.roadmap.useQuery({ cycleId }, { enabled: step === 3 });
  const olpDetailQuery = trpc.ocp.getByOlp.useQuery(
    { olpId: selectedOlpId ?? "" },
    { enabled: !!selectedOlpId },
  );

  const ensureSeed = trpc.ocp.ensureSeedAreas.useMutation({
    onSuccess: () => utils.ocp.setupOverview.invalidate({ cycleId }),
  });

  useEffect(() => {
    if (setupQuery.data && setupQuery.data.areas.length === 0) {
      ensureSeed.mutate({ cycleId });
    }
  }, [setupQuery.data?.areas.length, cycleId]);

  const upsertOcp = trpc.ocp.upsertOcp.useMutation({
    onSuccess: (saved) => {
      utils.ocp.setupOverview.invalidate({ cycleId });
      if (selectedOlpId) utils.ocp.getByOlp.invalidate({ olpId: selectedOlpId });
      utils.ocp.roadmap.invalidate({ cycleId });
      toast.success("OCP guardado");
      setEditingId(saved.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteOcp = trpc.ocp.deleteOcp.useMutation({
    onSuccess: () => {
      utils.ocp.setupOverview.invalidate({ cycleId });
      if (selectedOlpId) utils.ocp.getByOlp.invalidate({ olpId: selectedOlpId });
      utils.ocp.roadmap.invalidate({ cycleId });
      toast.success("OCP eliminado");
      resetEditor();
    },
    onError: (e) => toast.error(e.message),
  });

  const setLinkedStrategiesMut = trpc.ocp.setLinkedStrategies.useMutation({
    onSuccess: () => {
      if (selectedOlpId) utils.ocp.getByOlp.invalidate({ olpId: selectedOlpId });
    },
    onError: (e) => toast.error(e.message),
  });

  const setSupportAreasMut = trpc.ocp.setSupportAreas.useMutation({
    onSuccess: () => {
      if (selectedOlpId) utils.ocp.getByOlp.invalidate({ olpId: selectedOlpId });
    },
    onError: (e) => toast.error(e.message),
  });

  const upsertAction = trpc.ocp.upsertAction.useMutation({
    onSuccess: () => {
      if (selectedOlpId) utils.ocp.getByOlp.invalidate({ olpId: selectedOlpId });
      setActionDraft({ quarter: actionDraft.quarter, description: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteAction = trpc.ocp.deleteAction.useMutation({
    onSuccess: () => {
      if (selectedOlpId) utils.ocp.getByOlp.invalidate({ olpId: selectedOlpId });
    },
    onError: (e) => toast.error(e.message),
  });

  const upsertResource = trpc.ocp.upsertResource.useMutation({
    onSuccess: () => {
      if (selectedOlpId) utils.ocp.getByOlp.invalidate({ olpId: selectedOlpId });
      toast.success("Recursos guardados");
    },
    onError: (e) => toast.error(e.message),
  });

  const setup = setupQuery.data;
  const olpDetail = olpDetailQuery.data;
  const selectedOlp = setup?.olps.find((o) => o.id === selectedOlpId) ?? null;
  const horizonYears = setup?.horizonYears ?? [];

  function goToStep2(olpId: string) {
    setSelectedOlpId(olpId);
    setStep(2);
    setSelectedYear(null);
    resetEditor();
  }

  function resetEditor() {
    setEditingId(null);
    setSupportAreaIds([]);
    setLinkedStrategyIds([]);
    setShowResource(false);
  }

  function startCreateForYear(year: number) {
    if (!selectedOlp) return;
    setSelectedYear(year);
    const existing = olpDetail?.ocps.find((o) => o.year === year);
    if (existing) {
      setEditingId(existing.id);
      setForm({
        description: existing.description,
        year: existing.year,
        metaValue: existing.metaValue != null ? String(existing.metaValue) : "",
        metaText: existing.metaText ?? "",
        unit: existing.unit ?? selectedOlp.unit ?? "",
        responsibleAreaId: existing.responsibleAreaId ?? "",
        indicator: existing.indicator ?? selectedOlp.metric ?? "",
        frequency: existing.frequency ?? "",
        priority: existing.priority ?? "",
        status: (existing.status as OcpForm["status"]) ?? "borrador",
      });
      setSupportAreaIds(existing.supportAreas.map((s) => s.areaId));
      setLinkedStrategyIds(existing.linkedStrategies.map((s) => s.strategyId));
      setShowResource(!!existing.resource);
    } else {
      const suggestedValue = computeSuggestedValue(year);
      setEditingId(null);
      setForm({
        ...emptyOcpForm(year),
        description: selectedOlp.description
          ? `${selectedOlp.description} — meta ${year}`
          : "",
        unit: selectedOlp.unit ?? "",
        indicator: selectedOlp.metric ?? "",
        metaValue: suggestedValue != null ? String(roundFor(suggestedValue)) : "",
      });
      const olpStrategyIds = selectedOlp.strategyIds ?? [];
      setLinkedStrategyIds(olpStrategyIds);
      setSupportAreaIds([]);
    }
  }

  function computeSuggestedValue(year: number): number | null {
    if (!selectedOlp || !setup) return null;
    const start = selectedOlp.currentValue;
    const end = selectedOlp.targetValue;
    if (start == null || end == null) return null;
    const cycleYearStart = setup.cycle.yearStart;
    const cycleYearEnd = setup.cycle.yearEnd;
    const totalSteps = cycleYearEnd - cycleYearStart;
    if (totalSteps <= 0) return end;
    const values = distribute(distMode, start, end, totalSteps);
    const idx = year - cycleYearStart - 1;
    return values[idx] ?? end;
  }

  function handleSaveOcp() {
    if (!selectedOlp || !selectedYear) {
      toast.error("Selecciona un año primero");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Describe el OCP");
      return;
    }
    upsertOcp.mutate({
      cycleId,
      id: editingId ?? undefined,
      olpId: selectedOlp.id,
      description: form.description.trim(),
      year: form.year,
      metaValue: form.metaValue ? Number(form.metaValue) : null,
      metaText: form.metaText || null,
      unit: form.unit || null,
      responsibleAreaId: form.responsibleAreaId || null,
      indicator: form.indicator || null,
      frequency: (form.frequency || null) as "mensual" | "trimestral" | "semestral" | "anual" | null,
      priority: (form.priority || null) as "alta" | "media" | "baja" | null,
      status: form.status,
    });
  }

  useEffect(() => {
    if (!editingId) return;
    setLinkedStrategiesMut.mutate({ ocpId: editingId, strategyIds: linkedStrategyIds });
  }, [editingId, linkedStrategyIds.join(",")]);

  useEffect(() => {
    if (!editingId) return;
    setSupportAreasMut.mutate({ ocpId: editingId, areaIds: supportAreaIds });
  }, [editingId, supportAreaIds.join(",")]);

  if (setupQuery.isLoading) {
    return <div className="animate-pulse text-muted-foreground">Cargando módulo OCP...</div>;
  }
  if (!setup) {
    return (
      <div className="text-muted-foreground">No se pudo cargar la información del ciclo.</div>
    );
  }

  if (setup.olps.length === 0) {
    return (
      <Card className="border-amber-500/30 bg-transparent">
        <CardContent className="flex flex-col items-start gap-3 py-8 text-left">
          <AlertTriangle className="h-6 w-6 text-amber-400" />
          <div>
            <p className="font-semibold">No hay OLPs definidos en este ciclo</p>
            <p className="text-sm text-muted-foreground">
              Para desagregar en OCPs primero necesitas definir los Objetivos de Largo Plazo en
              M3 · OLP.
            </p>
          </div>
          <Link
            href={`/cycles/${cycleId}/m3-formulation/olp`}
            className="inline-flex h-7 items-center rounded-md bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Ir a M3 · OLP
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />
      <Stepper step={step} onChange={setStep} canGoStep2={!!selectedOlpId} />

      {step === 1 && (
        <Step1
          setup={setup}
          horizonYears={horizonYears}
          onSelect={(id) => goToStep2(id)}
        />
      )}

      {step === 2 && selectedOlp && (
        <Step2
          cycleId={cycleId}
          setup={setup}
          selectedOlp={selectedOlp}
          olpDetail={olpDetail}
          horizonYears={horizonYears}
          selectedYear={selectedYear}
          onSelectYear={startCreateForYear}
          distMode={distMode}
          setDistMode={setDistMode}
          form={form}
          setForm={setForm}
          editingId={editingId}
          onSave={handleSaveOcp}
          onDelete={(id) => deleteOcp.mutate({ ocpId: id })}
          isSaving={upsertOcp.isPending}
          supportAreaIds={supportAreaIds}
          setSupportAreaIds={setSupportAreaIds}
          linkedStrategyIds={linkedStrategyIds}
          setLinkedStrategyIds={setLinkedStrategyIds}
          showResource={showResource}
          setShowResource={setShowResource}
          actionDraft={actionDraft}
          setActionDraft={setActionDraft}
          onAddAction={(quarter, description) =>
            editingId &&
            upsertAction.mutate({ ocpId: editingId, quarter, description })
          }
          onDeleteAction={(id) => deleteAction.mutate({ actionId: id })}
          onSaveResource={(data) =>
            editingId && upsertResource.mutate({ ocpId: editingId, ...data })
          }
          onBack={() => setStep(1)}
          onGoRoadmap={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <Step3
          cycleId={cycleId}
          roadmap={roadmapQuery.data}
          isLoading={roadmapQuery.isLoading}
          onBack={() => setStep(2)}
          onEditCell={(olpId, year) => {
            setSelectedOlpId(olpId);
            setStep(2);
            setTimeout(() => startCreateForYear(year), 0);
          }}
        />
      )}
    </div>
  );
}

function roundFor(value: number): number {
  if (Math.abs(value) >= 100) return Math.round(value);
  if (Math.abs(value) >= 10) return Math.round(value * 10) / 10;
  return Math.round(value * 100) / 100;
}

function PageHeader() {
  return (
    <div className="space-y-3">
      <div className="text-left">
        <h2 className="text-lg font-semibold">OCP por Área · Objetivos de Corto Plazo</h2>
        <p className="text-sm text-muted-foreground">
          Convierte tus OLPs en metas anuales por área. Cada OLP se desagrega año a año en OCPs
          con responsable, acciones y recursos. Es donde la estrategia se vuelve ejecutable.
        </p>
      </div>
    </div>
  );
}

function Stepper({
  step,
  onChange,
  canGoStep2,
}: {
  step: Step;
  onChange: (s: Step) => void;
  canGoStep2: boolean;
}) {
  const steps: { id: Step; label: string; description: string }[] = [
    { id: 1, label: "1 · Seleccionar OLP", description: "Elige el OLP a desagregar" },
    { id: 2, label: "2 · Desagregar", description: "Define los OCPs año a año" },
    { id: 3, label: "3 · Roadmap", description: "Vista consolidada de todos los OCPs" },
  ];
  return (
    <div className="flex items-stretch gap-2">
      {steps.map((s) => {
        const active = s.id === step;
        const disabled = s.id === 2 && !canGoStep2;
        return (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s.id)}
            className={cn(
              "flex flex-1 flex-col items-start rounded-lg border px-4 py-3 text-left transition",
              active
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:bg-muted/30",
              disabled && "opacity-50 cursor-not-allowed",
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

function Step1({
  setup,
  horizonYears,
  onSelect,
}: {
  setup: SetupData;
  horizonYears: number[];
  onSelect: (olpId: string) => void;
}) {
  const { metrics, olps } = setup;
  return (
    <div className="space-y-6">
      <Card className="border-primary/25 bg-primary/10/40">
        <CardContent className="py-4 text-left text-sm text-primary">
          <strong className="block">¿Qué es un OCP?</strong>
          <span className="text-primary/80">
            Un Objetivo de Corto Plazo es la meta anual que aporta al cumplimiento de un OLP.
            Cada OCP tiene un área responsable, estrategias vinculadas y acciones concretas
            trimestrales.
          </span>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="OLPs heredados" value={metrics.totalOlps} icon={Target} />
        <MetricCard label="OCPs definidos" value={metrics.totalOcps} icon={Flag} />
        <MetricCard label="Áreas activas" value={metrics.activeAreas} icon={Building2} />
        <MetricCard
          label="Progreso"
          value={`${metrics.progressPct}%`}
          icon={CheckCircle2}
        />
      </div>

      <div className="space-y-3">
        {olps.map((olp) => (
          <OlpCard
            key={olp.id}
            olp={olp}
            horizonYears={horizonYears}
            onSelect={() => onSelect(olp.id)}
          />
        ))}
      </div>

      <Card className="border-dashed bg-muted/20">
        <CardContent className="py-3 text-xs text-muted-foreground text-left">
          <span className="font-medium">Recomendación:</span> trabaja un OLP a la vez para evitar
          dispersión. Lo ideal es desagregar todos antes de pasar a Políticas, Estructura y
          Recursos.
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-left">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function OlpCard({
  olp,
  horizonYears,
  onSelect,
}: {
  olp: SetupData["olps"][number];
  horizonYears: number[];
  onSelect: () => void;
}) {
  const statusColor =
    olp.status === "completo"
      ? "border-emerald-500/30 bg-transparent"
      : olp.status === "parcial"
      ? "border-amber-500/30 bg-transparent"
      : "border-dashed bg-muted/10";

  const statusBadge =
    olp.status === "completo" ? (
      <Badge className="bg-transparent0 hover:bg-transparent0">Completo</Badge>
    ) : olp.status === "parcial" ? (
      <Badge className="bg-transparent0 hover:bg-transparent0">Parcial</Badge>
    ) : (
      <Badge variant="outline">Pendiente</Badge>
    );

  const yearsCoveredSet = new Set<number>(olp.ocps.map((o) => o.year));
  const hasStrategies = olp.strategyIds.length > 0;

  return (
    <Card className={statusColor}>
      <CardContent className="py-4 space-y-3 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{olp.code}</Badge>
              {statusBadge}
              <span className="text-xs text-muted-foreground">
                {olp.strategyIds.length} estrategia{olp.strategyIds.length === 1 ? "" : "s"}{" "}
                vinculada{olp.strategyIds.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-sm font-medium">{olp.description}</p>
            {olp.metric || olp.targetValue != null ? (
              <p className="text-xs text-muted-foreground">
                {olp.metric ? `${olp.metric}: ` : ""}
                {olp.currentValue != null ? olp.currentValue : "—"}
                {" → "}
                {olp.targetValue != null ? olp.targetValue : "—"}
                {olp.unit ? ` ${olp.unit}` : ""}
              </p>
            ) : null}
          </div>
          <Button size="sm" onClick={onSelect}>
            Desagregar <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        <Timeline years={horizonYears} covered={yearsCoveredSet} />

        {!hasStrategies && (
          <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-transparent px-3 py-2 text-xs text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Este OLP no tiene estrategias vinculadas. Considera revisarlo en M3 · Estrategias
            antes de desagregar.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Timeline({
  years,
  covered,
  selectedYear,
  onClickYear,
}: {
  years: number[];
  covered: Set<number>;
  selectedYear?: number | null;
  onClickYear?: (y: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {years.map((y, i) => {
        const isCovered = covered.has(y);
        const isSelected = selectedYear === y;
        const isLast = i === years.length - 1;
        return (
          <button
            key={y}
            type="button"
            onClick={() => onClickYear?.(y)}
            disabled={!onClickYear}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-1 rounded transition",
              onClickYear ? "hover:bg-muted/50 cursor-pointer" : "cursor-default",
              isSelected && "ring-2 ring-primary bg-primary/5",
            )}
          >
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-medium",
                isCovered
                  ? "border-emerald-500 bg-transparent0 text-white"
                  : "border-dashed border-muted-foreground/40 text-muted-foreground",
              )}
            >
              {isLast ? <Flag className="h-3 w-3" /> : isCovered ? "✓" : ""}
            </div>
            <span className="text-[10px] text-muted-foreground">{y}</span>
          </button>
        );
      })}
    </div>
  );
}

function Step2({
  cycleId,
  setup,
  selectedOlp,
  olpDetail,
  horizonYears,
  selectedYear,
  onSelectYear,
  distMode,
  setDistMode,
  form,
  setForm,
  editingId,
  onSave,
  onDelete,
  isSaving,
  supportAreaIds,
  setSupportAreaIds,
  linkedStrategyIds,
  setLinkedStrategyIds,
  showResource,
  setShowResource,
  actionDraft,
  setActionDraft,
  onAddAction,
  onDeleteAction,
  onSaveResource,
  onBack,
  onGoRoadmap,
}: {
  cycleId: string;
  setup: SetupData;
  selectedOlp: SetupData["olps"][number];
  olpDetail: OlpDetail | undefined;
  horizonYears: number[];
  selectedYear: number | null;
  onSelectYear: (y: number) => void;
  distMode: DistributionMode;
  setDistMode: (m: DistributionMode) => void;
  form: OcpForm;
  setForm: (f: OcpForm) => void;
  editingId: string | null;
  onSave: () => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
  supportAreaIds: string[];
  setSupportAreaIds: (ids: string[]) => void;
  linkedStrategyIds: string[];
  setLinkedStrategyIds: (ids: string[]) => void;
  showResource: boolean;
  setShowResource: (v: boolean) => void;
  actionDraft: { quarter: Quarter; description: string };
  setActionDraft: (d: { quarter: Quarter; description: string }) => void;
  onAddAction: (quarter: Quarter, description: string) => void;
  onDeleteAction: (id: string) => void;
  onSaveResource: (data: {
    budgetEstimate: number | null;
    budgetCurrency: string | null;
    ftesRequired: number | null;
    techRequired: string | null;
    otherDependencies: string | null;
  }) => void;
  onBack: () => void;
  onGoRoadmap: () => void;
}) {
  const ocpsOfOlp = olpDetail?.ocps ?? [];
  const yearsCovered = new Set<number>(ocpsOfOlp.map((o) => o.year));

  const currentOcp = editingId ? ocpsOfOlp.find((o) => o.id === editingId) : null;

  const sumOfMetas = ocpsOfOlp.reduce((acc, o) => acc + (o.metaValue ?? 0), 0);
  const targetGap =
    selectedOlp.targetValue != null && selectedOlp.currentValue != null
      ? selectedOlp.targetValue - selectedOlp.currentValue
      : null;

  const lastOcp = ocpsOfOlp.length > 0 ? ocpsOfOlp[ocpsOfOlp.length - 1] : null;
  const closesWithTarget =
    selectedOlp.targetValue != null &&
    lastOcp?.metaValue != null &&
    Math.abs(lastOcp.metaValue - selectedOlp.targetValue) < 0.01;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Volver a OLPs
        </Button>
        <Button variant="ghost" size="sm" onClick={onGoRoadmap}>
          Ver roadmap completo <MapIcon className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedOlp.code}</Badge>
                <CardTitle className="text-base">{selectedOlp.description}</CardTitle>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {selectedOlp.metric && <span>Indicador: {selectedOlp.metric}</span>}
                <span>
                  Punto de partida: {selectedOlp.currentValue ?? "—"}
                  {selectedOlp.unit ? ` ${selectedOlp.unit}` : ""} ({setup.cycle.yearStart})
                </span>
                <span>
                  Meta: {selectedOlp.targetValue ?? "—"}
                  {selectedOlp.unit ? ` ${selectedOlp.unit}` : ""} ({setup.cycle.yearEnd})
                </span>
                {targetGap != null && <span>Brecha: {roundFor(targetGap)}</span>}
                <span>Horizonte: {horizonYears.length} años</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-left">
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/25 bg-primary/10/40 px-3 py-2 text-xs">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span className="text-primary">
              Sugerencia automática: distribución{" "}
              <strong>{distMode}</strong> del crecimiento.
            </span>
            <Select value={distMode} onValueChange={(v) => setDistMode(v as DistributionMode)}>
              <SelectTrigger className="h-7 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lineal">Lineal (default)</SelectItem>
                <SelectItem value="exponencial">Exponencial</SelectItem>
                <SelectItem value="frontal">Frontal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Timeline
            years={horizonYears}
            covered={yearsCovered}
            selectedYear={selectedYear}
            onClickYear={onSelectYear}
          />

          {closesWithTarget && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-transparent px-3 py-2 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Progresión coherente: el último OCP cierra exactamente con el OLP en{" "}
              {setup.cycle.yearEnd}.
            </div>
          )}
          {selectedOlp.targetValue != null && sumOfMetas > 0 && !closesWithTarget && lastOcp && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-transparent px-3 py-2 text-xs text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              El último OCP marca {lastOcp.metaValue} pero la meta del OLP es{" "}
              {selectedOlp.targetValue}. Ajusta valores para que la progresión cierre.
            </div>
          )}
        </CardContent>
      </Card>

      {selectedYear ? (
        <Card className={cn(editingId ? "ring-1 ring-primary/40" : "border-primary/25")}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {currentOcp && <Badge variant="secondary">{currentOcp.code}</Badge>}
                <CardTitle className="text-base">
                  {editingId ? "Editar OCP" : "Nuevo OCP"} · año {selectedYear}
                </CardTitle>
                {editingId && (
                  <Badge variant="outline" className="text-xs">
                    Editando
                  </Badge>
                )}
              </div>
              {editingId && (
                <div className="flex items-center gap-1">
                  <Link
                    href={`/cycles/${cycleId}/m4-deployment/ocp/${editingId}/initiatives`}
                  >
                    <Button variant="outline" size="sm">
                      <Briefcase className="mr-1 h-4 w-4" /> Iniciativas
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(editingId)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Eliminar OCP
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-left">
            <div className="space-y-2">
              <Label>Enunciado del OCP</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Alcanzar USD 22M en ventas durante 2026..."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Año</Label>
                <Input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Meta del año</Label>
                <Input
                  type="number"
                  value={form.metaValue}
                  onChange={(e) => setForm({ ...form, metaValue: e.target.value })}
                  placeholder={
                    computeSuggestedHint(selectedOlp, setup.cycle.yearStart, setup.cycle.yearEnd, form.year, distMode)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  placeholder={selectedOlp.unit ?? "%"}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Área responsable</Label>
                <Select
                  value={form.responsibleAreaId}
                  onValueChange={(v) => setForm({ ...form, responsibleAreaId: v ?? "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar área..." />
                  </SelectTrigger>
                  <SelectContent>
                    {setup.areas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Áreas de apoyo</Label>
                <MultiToggleList
                  options={setup.areas
                    .filter((a) => a.id !== form.responsibleAreaId)
                    .map((a) => ({ id: a.id, label: a.name }))}
                  selected={supportAreaIds}
                  onChange={setSupportAreaIds}
                  emptyText="Sin áreas de apoyo"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estrategias vinculadas</Label>
              <MultiToggleList
                options={setup.strategies.map((s) => ({
                  id: s.id,
                  label: s.code ? `${s.code} — ${s.description}` : s.description,
                }))}
                selected={linkedStrategyIds}
                onChange={setLinkedStrategyIds}
                emptyText="Sin estrategias vinculadas"
                hintForOlpStrategies={selectedOlp.strategyIds}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Indicador</Label>
                <Input
                  value={form.indicator}
                  onChange={(e) => setForm({ ...form, indicator: e.target.value })}
                  placeholder={selectedOlp.metric ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <Select
                  value={form.frequency}
                  onValueChange={(v) => setForm({ ...form, frequency: v ?? "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
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
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v ?? "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as OcpForm["status"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {linkedStrategyIds.length === 0 && (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-transparent px-3 py-2 text-xs text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                Este OCP no se conecta con ninguna estrategia. ¿Cómo lo lograrás?
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button onClick={onSave} disabled={isSaving || !form.description.trim()}>
                {editingId ? "Actualizar OCP" : "Guardar OCP"}
              </Button>
              <Button variant="outline" onClick={() => setShowResource(!showResource)}>
                {showResource ? "Ocultar recursos" : "Configurar recursos"}
              </Button>
            </div>

            {showResource && editingId && currentOcp && (
              <ResourcePanel
                ocpId={editingId}
                initial={currentOcp.resource}
                onSave={onSaveResource}
              />
            )}

            {editingId && currentOcp && (
              <ActionsPanel
                ocpId={editingId}
                actions={currentOcp.actions}
                draft={actionDraft}
                setDraft={setActionDraft}
                onAdd={onAddAction}
                onDelete={onDeleteAction}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Haz click en un año de la línea de tiempo para empezar a definir un OCP.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function computeSuggestedHint(
  olp: SetupData["olps"][number],
  yearStart: number,
  yearEnd: number,
  year: number,
  mode: DistributionMode,
): string {
  if (olp.currentValue == null || olp.targetValue == null) return "Meta";
  const steps = yearEnd - yearStart;
  if (steps <= 0) return String(olp.targetValue);
  const values = distribute(mode, olp.currentValue, olp.targetValue, steps);
  const idx = year - yearStart - 1;
  const v = values[idx];
  return v != null ? `Sugerencia ${roundFor(v)}` : "Meta";
}

function MultiToggleList({
  options,
  selected,
  onChange,
  emptyText,
  hintForOlpStrategies,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  emptyText?: string;
  hintForOlpStrategies?: string[];
}) {
  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyText ?? "Sin opciones"}</p>;
  }
  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isOn = selected.includes(opt.id);
        const isSuggested = hintForOlpStrategies?.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition",
              isOn
                ? "border-primary bg-primary text-primary-foreground"
                : isSuggested
                ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                : "border-border bg-muted/30 hover:bg-muted",
            )}
          >
            {opt.label.length > 80 ? opt.label.slice(0, 80) + "…" : opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ActionsPanel({
  ocpId,
  actions,
  draft,
  setDraft,
  onAdd,
  onDelete,
}: {
  ocpId: string;
  actions: { id: string; quarter: string; description: string; sortOrder: number }[];
  draft: { quarter: Quarter; description: string };
  setDraft: (d: { quarter: Quarter; description: string }) => void;
  onAdd: (quarter: Quarter, description: string) => void;
  onDelete: (id: string) => void;
}) {
  const grouped = QUARTERS.map((q) => ({
    quarter: q,
    items: actions.filter((a) => a.quarter === q).sort((a, b) => a.sortOrder - b.sortOrder),
  }));

  return (
    <div className="space-y-3 rounded-md border bg-muted/10 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Acciones concretas por trimestre</Label>
        <span className="text-xs text-muted-foreground">
          {actions.length}/10 acciones
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {grouped.map((g) => (
          <div key={g.quarter} className="space-y-2">
            <Badge variant="secondary" className="font-mono">
              {g.quarter}
            </Badge>
            <div className="space-y-1">
              {g.items.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Sin acciones</p>
              )}
              {g.items.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-1 rounded border bg-background px-2 py-1 text-xs"
                >
                  <GripVertical className="mt-0.5 h-3 w-3 text-muted-foreground/40 shrink-0" />
                  <span className="flex-1">{a.description}</span>
                  <button
                    type="button"
                    onClick={() => onDelete(a.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2 pt-2 border-t">
        <div className="space-y-1">
          <Label className="text-xs">Trimestre</Label>
          <Select
            value={draft.quarter}
            onValueChange={(v) => setDraft({ ...draft, quarter: v as Quarter })}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUARTERS.map((q) => (
                <SelectItem key={q} value={q}>
                  {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs">Descripción de la acción</Label>
          <Input
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Lanzar campaña digital en redes sociales..."
          />
        </div>
        <Button
          size="sm"
          disabled={!draft.description.trim() || actions.length >= 10}
          onClick={() => {
            if (!draft.description.trim()) return;
            onAdd(draft.quarter, draft.description.trim());
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Agregar
        </Button>
      </div>
    </div>
  );
}

function ResourcePanel({
  ocpId,
  initial,
  onSave,
}: {
  ocpId: string;
  initial:
    | {
        budgetEstimate: number | null;
        budgetCurrency: string | null;
        ftesRequired: number | null;
        techRequired: string | null;
        otherDependencies: string | null;
      }
    | null
    | undefined;
  onSave: (data: {
    budgetEstimate: number | null;
    budgetCurrency: string | null;
    ftesRequired: number | null;
    techRequired: string | null;
    otherDependencies: string | null;
  }) => void;
}) {
  const [budget, setBudget] = useState(
    initial?.budgetEstimate != null ? String(initial.budgetEstimate) : "",
  );
  const [currency, setCurrency] = useState(initial?.budgetCurrency ?? "USD");
  const [ftes, setFtes] = useState(initial?.ftesRequired != null ? String(initial.ftesRequired) : "");
  const [tech, setTech] = useState(initial?.techRequired ?? "");
  const [other, setOther] = useState(initial?.otherDependencies ?? "");

  return (
    <div className="space-y-3 rounded-md border bg-muted/10 p-3">
      <Label className="text-sm">Recursos requeridos (opcional)</Label>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Presupuesto estimado</Label>
          <Input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="50000"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Moneda</Label>
          <Input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="USD"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">FTEs requeridos</Label>
          <Input
            type="number"
            value={ftes}
            onChange={(e) => setFtes(e.target.value)}
            placeholder="2.5"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Tecnología requerida</Label>
        <Textarea
          rows={2}
          value={tech}
          onChange={(e) => setTech(e.target.value)}
          placeholder="CRM, herramientas de analytics..."
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Otras dependencias</Label>
        <Textarea
          rows={2}
          value={other}
          onChange={(e) => setOther(e.target.value)}
          placeholder="Aprobaciones de directorio, contratos clave..."
        />
      </div>
      <Button
        size="sm"
        onClick={() =>
          onSave({
            budgetEstimate: budget ? Number(budget) : null,
            budgetCurrency: currency || null,
            ftesRequired: ftes ? Number(ftes) : null,
            techRequired: tech || null,
            otherDependencies: other || null,
          })
        }
      >
        Guardar recursos
      </Button>
    </div>
  );
}

function Step3({
  cycleId,
  roadmap,
  isLoading,
  onBack,
  onEditCell,
}: {
  cycleId: string;
  roadmap: RoadmapData | undefined;
  isLoading: boolean;
  onBack: () => void;
  onEditCell: (olpId: string, year: number) => void;
}) {
  const [view, setView] = useState<"olp" | "area" | "strategy">("olp");

  if (isLoading || !roadmap) {
    return <div className="animate-pulse text-muted-foreground">Cargando roadmap...</div>;
  }

  const ocpsByOlpYear = new Map<string, RoadmapData["ocps"][number]>();
  for (const o of roadmap.ocps) {
    ocpsByOlpYear.set(`${o.olpId}|${o.year}`, o);
  }

  const ocpsByAreaYear = new Map<string, RoadmapData["ocps"][number][]>();
  for (const o of roadmap.ocps) {
    const key = `${o.responsibleAreaId ?? "_none"}|${o.year}`;
    const list = ocpsByAreaYear.get(key) ?? [];
    list.push(o);
    ocpsByAreaYear.set(key, list);
  }

  const ocpsByStratYear = new Map<string, RoadmapData["ocps"][number][]>();
  for (const o of roadmap.ocps) {
    for (const link of o.linkedStrategies) {
      const key = `${link.strategyId}|${o.year}`;
      const list = ocpsByStratYear.get(key) ?? [];
      list.push(o);
      ocpsByStratYear.set(key, list);
    }
  }

  const olpsWithoutOcps = roadmap.olps.filter(
    (olp) => !roadmap.ocps.some((o) => o.olpId === olp.id),
  );
  const areasWithoutOcps = roadmap.areaLoad.filter((a) => a.ocpCount === 0);
  const maxLoad = Math.max(1, ...roadmap.areaLoad.map((a) => a.ocpCount));
  const overloadedAreas = roadmap.areaLoad.filter((a) => a.ocpCount >= maxLoad && maxLoad >= 5);

  const narrative = buildNarrative(roadmap, olpsWithoutOcps.length);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Volver a desagregar
        </Button>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList>
          <TabsTrigger value="olp">Por OLP</TabsTrigger>
          <TabsTrigger value="area">Por Área</TabsTrigger>
          <TabsTrigger value="strategy">Por Estrategia</TabsTrigger>
        </TabsList>

        <TabsContent value="olp" className="space-y-3">
          <RoadmapMatrix
            rows={roadmap.olps.map((olp) => ({
              id: olp.id,
              label: olp.code,
              sublabel: olp.description,
            }))}
            years={roadmap.horizonYears}
            cellFor={(rowId, year) => {
              const ocp = ocpsByOlpYear.get(`${rowId}|${year}`);
              return ocp
                ? {
                    code: ocp.code,
                    label: formatMeta(ocp),
                    sublabel: ocp.responsibleArea?.name ?? "—",
                  }
                : null;
            }}
            onCellClick={(rowId, year) => onEditCell(rowId, year)}
          />
        </TabsContent>

        <TabsContent value="area" className="space-y-3">
          <RoadmapMatrix
            rows={roadmap.areas.map((a) => ({ id: a.id, label: a.name, sublabel: "" }))}
            years={roadmap.horizonYears}
            cellFor={(areaId, year) => {
              const items = ocpsByAreaYear.get(`${areaId}|${year}`) ?? [];
              if (items.length === 0) return null;
              return {
                code: `${items.length} OCP${items.length === 1 ? "" : "s"}`,
                label: items.map((i) => i.code).join(", "),
                sublabel: items[0].description.slice(0, 40),
              };
            }}
          />
        </TabsContent>

        <TabsContent value="strategy" className="space-y-3">
          <RoadmapMatrix
            rows={roadmap.strategies.map((s) => ({
              id: s.id,
              label: s.code ?? "—",
              sublabel: s.description,
            }))}
            years={roadmap.horizonYears}
            cellFor={(stratId, year) => {
              const items = ocpsByStratYear.get(`${stratId}|${year}`) ?? [];
              if (items.length === 0) return null;
              return {
                code: items[0].code,
                label: items.map((i) => i.code).join(", "),
                sublabel: items[0].responsibleArea?.name ?? "—",
              };
            }}
          />
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-left">Carga por área</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-left">
            {roadmap.areaLoad.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin áreas configuradas.</p>
            ) : (
              roadmap.areaLoad.map((a) => {
                const pct = Math.round((a.ocpCount / maxLoad) * 100);
                return (
                  <div key={a.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn(a.ocpCount === 0 && "text-muted-foreground/60")}>
                        {a.name}
                      </span>
                      <span className="font-medium">
                        {a.ocpCount} OCP{a.ocpCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          a.ocpCount === 0
                            ? "bg-muted-foreground/20"
                            : pct >= 80
                            ? "bg-transparent0"
                            : "bg-primary",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-transparent">
          <CardHeader>
            <CardTitle className="text-base text-left text-amber-300">
              Observaciones automáticas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-left">
            {olpsWithoutOcps.length > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3 w-3 text-amber-400 shrink-0" />
                <span>
                  {olpsWithoutOcps.length} OLP{olpsWithoutOcps.length === 1 ? "" : "s"} sin OCPs
                  definidos:{" "}
                  <strong>{olpsWithoutOcps.map((o) => o.code).join(", ")}</strong>
                </span>
              </div>
            )}
            {areasWithoutOcps.length > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3 w-3 text-amber-400 shrink-0" />
                <span>
                  {areasWithoutOcps.length} área
                  {areasWithoutOcps.length === 1 ? "" : "s"} sin OCPs asignados:{" "}
                  <strong>{areasWithoutOcps.map((a) => a.name).join(", ")}</strong>
                </span>
              </div>
            )}
            {overloadedAreas.length > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3 w-3 text-amber-400 shrink-0" />
                <span>
                  Áreas con carga alta ({maxLoad} OCPs):{" "}
                  <strong>{overloadedAreas.map((a) => a.name).join(", ")}</strong>
                </span>
              </div>
            )}
            {olpsWithoutOcps.length === 0 &&
              areasWithoutOcps.length === 0 &&
              overloadedAreas.length === 0 && (
                <div className="flex items-start gap-2 text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>Sin observaciones críticas. Buen trabajo.</span>
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-left">Análisis</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-left text-muted-foreground">
          {narrative}
        </CardContent>
      </Card>

      <Card className="border-primary/25 bg-primary/10/30">
        <CardContent className="py-4 text-sm text-left text-primary">
          <strong className="block">¿Qué sigue?</strong>
          Con tus OCPs definidos, el próximo módulo (Políticas Organizacionales) te ayudará a
          establecer las reglas y lineamientos que guiarán a las áreas en la ejecución.
        </CardContent>
      </Card>
    </div>
  );
}

function formatMeta(ocp: RoadmapData["ocps"][number]): string {
  if (ocp.metaValue != null) {
    return `${roundFor(ocp.metaValue)}${ocp.unit ? ` ${ocp.unit}` : ""}`;
  }
  return ocp.metaText ?? "—";
}

function buildNarrative(roadmap: RoadmapData, missingOlps: number): string {
  const total = roadmap.ocps.length;
  const estimated = roadmap.olps.length * roadmap.horizonYears.length;
  if (total === 0) {
    return "Aún no has definido ningún OCP. Empieza desagregando tu primer OLP para construir el plan operativo.";
  }
  const topOlp = [...roadmap.olps]
    .map((olp) => ({
      olp,
      count: roadmap.ocps.filter((o) => o.olpId === olp.id).length,
    }))
    .sort((a, b) => b.count - a.count)[0];

  const fragments: string[] = [];
  fragments.push(`Tu plan tiene ${total} OCPs definidos de ${estimated} estimados.`);
  if (topOlp && topOlp.count > 0) {
    fragments.push(
      `El ${topOlp.olp.code} está más consolidado con ${topOlp.count} OCPs definidos.`,
    );
  }
  if (missingOlps > 0) {
    fragments.push(`Quedan ${missingOlps} OLPs sin desagregar; completa primero los más urgentes.`);
  } else {
    fragments.push(`Todos los OLPs tienen al menos un OCP. Revisa los años faltantes en el roadmap.`);
  }
  return fragments.join(" ");
}

function RoadmapMatrix({
  rows,
  years,
  cellFor,
  onCellClick,
}: {
  rows: { id: string; label: string; sublabel: string }[];
  years: number[];
  cellFor: (
    rowId: string,
    year: number,
  ) => { code: string; label: string; sublabel: string } | null;
  onCellClick?: (rowId: string, year: number) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-3 py-2 font-medium w-48">Fila</th>
              {years.map((y) => (
                <th key={y} className="px-3 py-2 font-medium">
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-b-0">
                <td className="px-3 py-2 align-top">
                  <div className="font-semibold">{row.label}</div>
                  {row.sublabel && (
                    <div className="text-[10px] text-muted-foreground line-clamp-2">
                      {row.sublabel}
                    </div>
                  )}
                </td>
                {years.map((y) => {
                  const cell = cellFor(row.id, y);
                  return (
                    <td key={y} className="px-2 py-2 align-top">
                      {cell ? (
                        <button
                          type="button"
                          disabled={!onCellClick}
                          onClick={() => onCellClick?.(row.id, y)}
                          className={cn(
                            "rounded-md border bg-transparent border-emerald-500/30 px-2 py-1 text-left w-full",
                            onCellClick && "hover:bg-transparent cursor-pointer",
                          )}
                        >
                          <div className="font-mono text-[10px] text-emerald-300">
                            {cell.code}
                          </div>
                          <div className="font-medium">{cell.label}</div>
                          {cell.sublabel && (
                            <div className="text-[10px] text-muted-foreground line-clamp-1">
                              {cell.sublabel}
                            </div>
                          )}
                        </button>
                      ) : onCellClick ? (
                        <button
                          type="button"
                          onClick={() => onCellClick(row.id, y)}
                          className="rounded-md border border-dashed border-muted-foreground/30 px-2 py-1 text-muted-foreground/60 hover:bg-muted/30 w-full"
                        >
                          <Plus className="h-3 w-3 mx-auto" />
                        </button>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
