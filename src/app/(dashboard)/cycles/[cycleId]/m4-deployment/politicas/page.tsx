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
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  FileText,
  FileDown,
  FileCode,
  RefreshCw,
  Lock,
} from "lucide-react";
import {
  POLICY_CATEGORIES,
  getCategoryDef,
  FREQUENCY_OPTIONS,
  SCOPE_OPTIONS,
  isVagueEnunciado,
  isGenericIndicator,
  type PolicyCategory,
} from "@/lib/policy-suggestions";
import { exportPolicyManualPdf, exportPolicyManualDocx, exportPolicyManualHtml } from "@/lib/lazy-exports";
import type { ExportPolicy, ExportContext } from "@/lib/policy-export";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type SetupData = RouterOutputs["policies"]["setup"];
type PolicyItem = SetupData["policies"][number];
type Step = 1 | 2 | 3;

interface PolicyForm {
  category: PolicyCategory;
  name: string;
  enunciado: string;
  justification: string;
  scope: string;
  scopeDetail: string;
  responsible: string;
  indicator: string;
  reviewFrequency: string;
  exceptions: string;
  validFrom: string;
  nextReview: string;
  status: "sugerida" | "aceptada" | "en_edicion" | "confirmada" | "descartada";
}

function emptyForm(): PolicyForm {
  return {
    category: "general",
    name: "",
    enunciado: "",
    justification: "",
    scope: "toda_organizacion",
    scopeDetail: "",
    responsible: "",
    indicator: "",
    reviewFrequency: "anual",
    exceptions: "",
    validFrom: "",
    nextReview: "",
    status: "aceptada",
  };
}

function policyToForm(p: PolicyItem): PolicyForm {
  return {
    category: p.category as PolicyCategory,
    name: p.name,
    enunciado: p.enunciado,
    justification: p.justification ?? "",
    scope: p.scope ?? "toda_organizacion",
    scopeDetail: p.scopeDetail ?? "",
    responsible: p.responsible ?? "",
    indicator: p.indicator ?? "",
    reviewFrequency: p.reviewFrequency ?? "anual",
    exceptions: p.exceptions ?? "",
    validFrom: p.validFrom ? new Date(p.validFrom).toISOString().slice(0, 10) : "",
    nextReview: p.nextReview ? new Date(p.nextReview).toISOString().slice(0, 10) : "",
    status: p.status as PolicyForm["status"],
  };
}

export default function PoliciesPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const utils = trpc.useUtils();

  const [step, setStep] = useState<Step>(1);
  const [filterCategory, setFilterCategory] = useState<PolicyCategory | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PolicyForm>(emptyForm());
  const [strategyIds, setStrategyIds] = useState<string[]>([]);
  const [consolidatedIds, setConsolidatedIds] = useState<string[]>([]);
  const [ocpIds, setOcpIds] = useState<string[]>([]);
  const [valueIds, setValueIds] = useState<string[]>([]);

  const setupQuery = trpc.policies.setup.useQuery({ cycleId });
  const analyzeQuery = trpc.policies.analyze.useQuery(
    { cycleId },
    { enabled: step === 3 },
  );

  const generateMut = trpc.policies.generateSuggestions.useMutation({
    onSuccess: (res) => {
      utils.policies.setup.invalidate({ cycleId });
      const total = res.createdMitigant + res.createdSuggested;
      if (total > 0) {
        toast.success(
          `${total} políticas sugeridas (${res.createdMitigant} obligatorias, ${res.createdSuggested} sugeridas)`,
        );
      } else {
        toast.info("Sin nuevas sugerencias para generar");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const createMut = trpc.policies.create.useMutation({
    onSuccess: () => {
      utils.policies.setup.invalidate({ cycleId });
      toast.success("Política creada");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.policies.update.useMutation({
    onSuccess: () => {
      utils.policies.setup.invalidate({ cycleId });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.policies.delete.useMutation({
    onSuccess: () => {
      utils.policies.setup.invalidate({ cycleId });
      toast.success("Política eliminada");
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const setStrategiesMut = trpc.policies.setStrategies.useMutation({
    onSuccess: () => utils.policies.setup.invalidate({ cycleId }),
    onError: (e) => toast.error(e.message),
  });
  const setConsolidatedMut = trpc.policies.setConsolidatedStrategies.useMutation({
    onSuccess: () => utils.policies.setup.invalidate({ cycleId }),
    onError: (e) => toast.error(e.message),
  });
  const setOcpsMut = trpc.policies.setOcps.useMutation({
    onSuccess: () => utils.policies.setup.invalidate({ cycleId }),
    onError: (e) => toast.error(e.message),
  });
  const setValuesMut = trpc.policies.setValues.useMutation({
    onSuccess: () => utils.policies.setup.invalidate({ cycleId }),
    onError: (e) => toast.error(e.message),
  });

  // Auto-generate on first load if no policies exist yet
  useEffect(() => {
    if (
      setupQuery.data &&
      setupQuery.data.policies.length === 0 &&
      (setupQuery.data.strategies.length > 0 ||
        setupQuery.data.consolidated.length > 0 ||
        setupQuery.data.mitigants.length > 0)
    ) {
      generateMut.mutate({ cycleId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupQuery.data?.policies.length, cycleId]);

  const setup = setupQuery.data;

  function startEdit(p: PolicyItem) {
    setEditingId(p.id);
    setForm(policyToForm(p));
    setStrategyIds(p.strategies.map((s) => s.strategyId));
    setConsolidatedIds(p.consolidatedStrategies.map((c) => c.consolidatedStrategyId));
    setOcpIds(p.ocps.map((o) => o.ocpId));
    setValueIds(p.valueLinks.map((v) => v.valueId));
    setStep(2);
  }

  function handleSaveEdit() {
    if (!editingId) return;
    if (!form.name.trim() || !form.enunciado.trim()) {
      toast.error("Nombre y enunciado son obligatorios");
      return;
    }
    updateMut.mutate({
      id: editingId,
      category: form.category,
      name: form.name.trim(),
      enunciado: form.enunciado.trim(),
      justification: form.justification || null,
      scope: (form.scope || null) as
        | "toda_organizacion"
        | "area"
        | "producto"
        | "mercado"
        | "situacion"
        | null,
      scopeDetail: form.scopeDetail || null,
      responsible: form.responsible || null,
      indicator: form.indicator || null,
      reviewFrequency:
        (form.reviewFrequency || null) as "mensual" | "trimestral" | "semestral" | "anual" | null,
      exceptions: form.exceptions || null,
      validFrom: form.validFrom ? new Date(form.validFrom) : null,
      nextReview: form.nextReview ? new Date(form.nextReview) : null,
      status: form.status,
    });
    setStrategiesMut.mutate({ politicaId: editingId, strategyIds });
    setConsolidatedMut.mutate({ politicaId: editingId, consolidatedIds });
    setOcpsMut.mutate({ politicaId: editingId, ocpIds });
    setValuesMut.mutate({ politicaId: editingId, valueIds });
    toast.success("Política guardada");
  }

  function handleAcceptSuggestion(id: string) {
    updateMut.mutate({ id, status: "aceptada" });
  }

  function handleDiscard(id: string) {
    updateMut.mutate({ id, status: "descartada" });
  }

  function handleConfirm(id: string) {
    updateMut.mutate({ id, status: "confirmada" });
    toast.success("Política confirmada");
  }

  if (setupQuery.isLoading) {
    return <div className="animate-pulse text-muted-foreground">Cargando módulo de Políticas...</div>;
  }
  if (!setup) {
    return (
      <div className="text-muted-foreground">No se pudo cargar la información del ciclo.</div>
    );
  }

  const noStrategies =
    setup.strategies.length === 0 && setup.consolidated.length === 0;
  const noMitigants = setup.mitigants.length === 0;
  const noOcps = setup.ocps.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader />
      <Stepper step={step} onChange={setStep} />

      {noStrategies && noMitigants && (
        <Card className="border-amber-500/30 bg-transparent">
          <CardContent className="flex items-start gap-3 py-4 text-left">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
            <div className="text-sm">
              <strong>Sin estrategias retenidas ni mitigantes éticos.</strong> Para generar
              sugerencias automáticas primero define estrategias en M3 · Estrategias y
              opcionalmente registra mitigantes en M3 · Auditoría Ética.
            </div>
          </CardContent>
        </Card>
      )}

      {noOcps && (
        <Card className="border-primary/25 bg-primary/5">
          <CardContent className="py-3 text-left text-xs text-primary">
            <strong>Sugerencia:</strong> aún no defines OCPs en M4 · OCP por Área. Las políticas
            funcionarán sin ellos, pero la vinculación con objetivos anuales será más rica si
            primero completas ese módulo.
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Step1
          setup={setup}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          onAccept={handleAcceptSuggestion}
          onDiscard={handleDiscard}
          onEdit={startEdit}
          onRegenerate={() => generateMut.mutate({ cycleId })}
          isGenerating={generateMut.isPending}
          onContinue={() => setStep(2)}
          onCreateCustom={() => {
            setEditingId(null);
            setForm(emptyForm());
            setStrategyIds([]);
            setConsolidatedIds([]);
            setOcpIds([]);
            setValueIds([]);
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <Step2
          cycleId={cycleId}
          setup={setup}
          editingId={editingId}
          form={form}
          setForm={setForm}
          strategyIds={strategyIds}
          setStrategyIds={setStrategyIds}
          consolidatedIds={consolidatedIds}
          setConsolidatedIds={setConsolidatedIds}
          ocpIds={ocpIds}
          setOcpIds={setOcpIds}
          valueIds={valueIds}
          setValueIds={setValueIds}
          onPickPolicy={startEdit}
          onSave={handleSaveEdit}
          onConfirm={() => editingId && handleConfirm(editingId)}
          onDelete={() => editingId && deleteMut.mutate({ id: editingId })}
          onCreateCustom={(category, payload) => {
            createMut.mutate(
              {
                cycleId,
                category,
                name: payload.name.trim(),
                enunciado: payload.enunciado.trim(),
                justification: payload.justification || null,
                scope:
                  (payload.scope || null) as
                    | "toda_organizacion"
                    | "area"
                    | "producto"
                    | "mercado"
                    | "situacion"
                    | null,
                scopeDetail: payload.scopeDetail || null,
                responsible: payload.responsible || null,
                indicator: payload.indicator || null,
                reviewFrequency:
                  (payload.reviewFrequency || null) as
                    | "mensual"
                    | "trimestral"
                    | "semestral"
                    | "anual"
                    | null,
                exceptions: payload.exceptions || null,
              },
              {
                onSuccess: (created) => {
                  setEditingId(created.id);
                  setForm(policyToForm(created as unknown as PolicyItem));
                  setStrategyIds([]);
                  setConsolidatedIds([]);
                  setOcpIds([]);
                  setValueIds([]);
                },
              },
            );
          }}
          onBack={() => setStep(1)}
          onGoValidate={() => setStep(3)}
          isSaving={updateMut.isPending}
        />
      )}

      {step === 3 && (
        <Step3
          setup={setup}
          contradictions={analyzeQuery.data?.contradictions ?? []}
          onBack={() => setStep(2)}
          cycleId={cycleId}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Page header + stepper
// ────────────────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <div className="space-y-1 text-left">
      <h2 className="text-lg font-semibold">Políticas Organizacionales</h2>
      <p className="text-sm text-muted-foreground">
        Las reglas y lineamientos que guían las decisiones cotidianas. Traducción operativa de
        los valores y condición previa para que la estrategia se ejecute con consistencia.
      </p>
    </div>
  );
}

function Stepper({ step, onChange }: { step: Step; onChange: (s: Step) => void }) {
  const steps: { id: Step; label: string; description: string }[] = [
    { id: 1, label: "1 · Generar", description: "Sugerencias automáticas y aceptación" },
    { id: 2, label: "2 · Refinar", description: "Detalle completo por política" },
    { id: 3, label: "3 · Validar", description: "Cobertura, matriz y exportación" },
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
// STEP 1 · Generar
// ────────────────────────────────────────────────────────────────────

function Step1({
  setup,
  filterCategory,
  setFilterCategory,
  onAccept,
  onDiscard,
  onEdit,
  onRegenerate,
  isGenerating,
  onContinue,
  onCreateCustom,
}: {
  setup: SetupData;
  filterCategory: PolicyCategory | "all";
  setFilterCategory: (c: PolicyCategory | "all") => void;
  onAccept: (id: string) => void;
  onDiscard: (id: string) => void;
  onEdit: (p: PolicyItem) => void;
  onRegenerate: () => void;
  isGenerating: boolean;
  onContinue: () => void;
  onCreateCustom: () => void;
}) {
  const policies = setup.policies.filter((p) => p.status !== "descartada");
  const filtered =
    filterCategory === "all"
      ? policies
      : policies.filter((p) => p.category === filterCategory);

  const countsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of policies) {
      map.set(p.category, (map.get(p.category) ?? 0) + 1);
    }
    return map;
  }, [policies]);

  return (
    <div className="space-y-6">
      <Card className="border-primary/25 bg-primary/5">
        <CardContent className="py-4 text-left text-sm text-primary">
          <strong className="block">Define las reglas que guiarán la ejecución.</strong>
          <span className="text-primary/80">
            El sistema analizó tus estrategias y mitigantes éticos, y te sugiere políticas
            iniciales. Tú decides cuáles aceptar, modificar o descartar.
          </span>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Sugeridas" value={setup.metrics.totalSuggested} />
        <MetricCard label="De mitigantes" value={setup.metrics.fromMitigant} />
        <MetricCard
          label="Categorías cubiertas"
          value={`${setup.metrics.categoriesCovered}/${setup.metrics.totalCategories}`}
        />
        <MetricCard label="Aceptadas" value={setup.metrics.accepted} />
      </div>

      <div className="flex flex-wrap gap-2">
        <CategoryPill
          active={filterCategory === "all"}
          label={`Todas (${policies.length})`}
          color="#64748b"
          onClick={() => setFilterCategory("all")}
        />
        {POLICY_CATEGORIES.map((c) => (
          <CategoryPill
            key={c.key}
            active={filterCategory === c.key}
            label={`${c.shortLabel} (${countsByCategory.get(c.key) ?? 0})`}
            color={c.color}
            bg={c.bg}
            onClick={() => setFilterCategory(c.key)}
          />
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Sin políticas en esta categoría aún. Genera sugerencias o crea una personalizada.
            </CardContent>
          </Card>
        ) : (
          filtered.map((p) => (
            <PolicyCardStep1
              key={p.id}
              policy={p}
              onAccept={() => onAccept(p.id)}
              onDiscard={() => onDiscard(p.id)}
              onEdit={() => onEdit(p)}
            />
          ))
        )}

        <Card
          className="cursor-pointer border-dashed bg-muted/10 transition hover:bg-muted/30"
          onClick={onCreateCustom}
        >
          <CardContent className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Plus className="size-4" />
            <span>Crear política personalizada</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={isGenerating}
        >
          <RefreshCw className={cn("mr-2 size-4", isGenerating && "animate-spin")} />
          Regenerar sugerencias
        </Button>
        <Button onClick={onContinue}>
          Continuar a refinar <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="py-4 text-left">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function CategoryPill({
  active,
  label,
  color,
  bg,
  onClick,
}: {
  active: boolean;
  label: string;
  color: string;
  bg?: string;
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
        backgroundColor: active ? color : bg ?? "rgba(0,0,0,0.04)",
      }}
    >
      {label}
    </button>
  );
}

function PolicyCardStep1({
  policy,
  onAccept,
  onDiscard,
  onEdit,
}: {
  policy: PolicyItem;
  onAccept: () => void;
  onDiscard: () => void;
  onEdit: () => void;
}) {
  const cat = getCategoryDef(policy.category);
  const isAccepted = policy.status !== "sugerida";
  const isMandatory = policy.mandatory;

  return (
    <Card
      className={cn(
        "transition",
        isMandatory && "border-amber-400 border-2",
        isAccepted && !isMandatory && "border-emerald-500/30",
      )}
      style={{ borderLeftColor: cat?.color, borderLeftWidth: 4 }}
    >
      <CardContent className="space-y-3 py-4 text-left">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{policy.code}</span>
              {isMandatory ? (
                <Badge className="border-amber-500 bg-transparent text-amber-700">
                  <Lock className="mr-1 size-3" /> Obligatoria · mitigante ético
                </Badge>
              ) : policy.origin === "suggested" ? (
                <Badge variant="secondary">
                  <Sparkles className="mr-1 size-3" /> Sugerida
                </Badge>
              ) : (
                <Badge variant="outline">Personalizada</Badge>
              )}
              {cat && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: cat.bg, color: cat.color }}
                >
                  {cat.shortLabel}
                </span>
              )}
              {isAccepted && (
                <Badge variant="outline" className="border-emerald-400 text-emerald-700">
                  <CheckCircle2 className="mr-1 size-3" /> Aceptada
                </Badge>
              )}
            </div>
            <h3 className="text-sm font-semibold leading-snug">{policy.name}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {!isAccepted && (
              <Button size="sm" onClick={onAccept}>
                Aceptar y refinar
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="mr-1 size-3.5" /> Editar
            </Button>
            {isMandatory ? (
              <Button
                size="sm"
                variant="ghost"
                disabled
                title="No se puede descartar una política obligatoria"
              >
                <Lock className="mr-1 size-3.5" /> Descartar
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={onDiscard}>
                Descartar
              </Button>
            )}
          </div>
        </div>

        <p className="text-sm leading-relaxed">{policy.enunciado}</p>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {policy.responsible && (
            <span>
              <strong>Responsable:</strong> {policy.responsible}
            </span>
          )}
          {policy.indicator && (
            <span>
              <strong>Indicador:</strong> {policy.indicator.slice(0, 70)}
              {policy.indicator.length > 70 ? "…" : ""}
            </span>
          )}
        </div>

        {policy.ethicsMitigant && (
          <div className="rounded-md border border-amber-500/30 bg-transparent px-3 py-2 text-xs text-amber-700">
            <strong>Mitigante ético origen:</strong> {policy.ethicsMitigant.text.slice(0, 200)}
            {policy.ethicsMitigant.text.length > 200 ? "…" : ""}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// STEP 2 · Refinar
// ────────────────────────────────────────────────────────────────────

function Step2({
  cycleId,
  setup,
  editingId,
  form,
  setForm,
  strategyIds,
  setStrategyIds,
  consolidatedIds,
  setConsolidatedIds,
  ocpIds,
  setOcpIds,
  valueIds,
  setValueIds,
  onPickPolicy,
  onSave,
  onConfirm,
  onDelete,
  onCreateCustom,
  onBack,
  onGoValidate,
  isSaving,
}: {
  cycleId: string;
  setup: SetupData;
  editingId: string | null;
  form: PolicyForm;
  setForm: (f: PolicyForm) => void;
  strategyIds: string[];
  setStrategyIds: (ids: string[]) => void;
  consolidatedIds: string[];
  setConsolidatedIds: (ids: string[]) => void;
  ocpIds: string[];
  setOcpIds: (ids: string[]) => void;
  valueIds: string[];
  setValueIds: (ids: string[]) => void;
  onPickPolicy: (p: PolicyItem) => void;
  onSave: () => void;
  onConfirm: () => void;
  onDelete: () => void;
  onCreateCustom: (category: PolicyCategory, payload: PolicyForm) => void;
  onBack: () => void;
  onGoValidate: () => void;
  isSaving: boolean;
}) {
  const editable = setup.policies.filter(
    (p) => p.status === "aceptada" || p.status === "en_edicion" || p.status === "confirmada",
  );
  const current = editingId ? setup.policies.find((p) => p.id === editingId) : null;
  const isMandatory = current?.mandatory ?? false;

  const vague = isVagueEnunciado(form.enunciado);
  const genericIndicator = isGenericIndicator(form.indicator);
  const hasLinks =
    strategyIds.length + consolidatedIds.length + ocpIds.length + valueIds.length > 0;

  // detectar duplicados
  const possibleDuplicates = setup.policies
    .filter(
      (p) =>
        p.id !== editingId &&
        p.status !== "descartada" &&
        p.name.toLowerCase().trim() === form.name.toLowerCase().trim() &&
        form.name.trim().length > 0,
    )
    .map((p) => p.code);

  function handleCreateCustom() {
    if (!editingId) {
      if (!form.name.trim() || !form.enunciado.trim()) {
        toast.error("Nombre y enunciado son obligatorios");
        return;
      }
      onCreateCustom(form.category, form);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 size-4" /> Volver a generar
        </Button>
        <Button variant="ghost" size="sm" onClick={onGoValidate}>
          Ver validación <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>

      <div className="sticky top-0 z-10 -mx-2 bg-background/85 px-2 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {editable.length} políticas para refinar
          </span>
          {editable.map((p) => {
            const isCurrent = editingId === p.id;
            const isConfirmed = p.status === "confirmada";
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPickPolicy(p)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
                  isCurrent
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : isConfirmed
                    ? "border-emerald-500/30 bg-transparent text-emerald-700"
                    : "border-border bg-muted/30 hover:bg-muted/60",
                )}
              >
                {isConfirmed && <CheckCircle2 className="size-3" />}
                <span className="font-mono">{p.code}</span>
                <span className="max-w-[180px] truncate">{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!editingId && (
        <Card className="border-primary/25 bg-primary/5">
          <CardContent className="py-3 text-left text-sm text-primary">
            Estás creando una política personalizada. Completa los campos y guarda para
            empezar a vincularla con estrategias, OCPs y valores.
          </CardContent>
        </Card>
      )}

      {isMandatory && (
        <Card className="border-amber-400 bg-transparent">
          <CardContent className="flex items-start gap-2 py-3 text-xs text-amber-700">
            <Lock className="mt-0.5 size-4" />
            <span>
              Esta política es <strong>obligatoria</strong> porque deriva de un mitigante
              ético. Puedes editarla pero no descartarla.
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base">
            {editingId ? "Editar política" : "Crear política personalizada"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-left">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input value={current?.code ?? "(se genera al guardar)"} disabled />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v as PolicyCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nombre de la política</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Política de precios y descuentos"
            />
            {possibleDuplicates.length > 0 && (
              <p className="text-xs text-amber-700">
                ⚠️ Posible duplicado con: {possibleDuplicates.join(", ")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Enunciado · la regla</Label>
            <Textarea
              rows={3}
              value={form.enunciado}
              onChange={(e) => setForm({ ...form, enunciado: e.target.value })}
              placeholder="Mantener una estructura de precios que preserve el margen objetivo..."
            />
            {vague && (
              <p className="text-xs text-amber-700">
                ⚠️ Considera verbos imperativos: "Mantener", "Garantizar", "Requerir" en lugar
                de "tratar de" o "intentar".
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Justificación · por qué existe</Label>
            <Textarea
              rows={2}
              value={form.justification}
              onChange={(e) => setForm({ ...form, justification: e.target.value })}
              placeholder="Esta política protege el valor de marca y asegura márgenes sostenibles..."
            />
          </div>

          <LinkSection
            title="Estrategias retenidas (Strategy)"
            options={setup.strategies.map((s) => ({
              id: s.id,
              label: `${s.code ?? "—"} · ${s.description}`,
            }))}
            selected={strategyIds}
            onChange={setStrategyIds}
          />
          {setup.consolidated.length > 0 && (
            <LinkSection
              title="Estrategias consolidadas (M3 · MD)"
              options={setup.consolidated.map((c) => ({
                id: c.id,
                label: `${c.code} · ${c.text}`,
              }))}
              selected={consolidatedIds}
              onChange={setConsolidatedIds}
            />
          )}
          <LinkSection
            title="OCPs que apoya"
            options={setup.ocps.map((o) => ({
              id: o.id,
              label: `${o.code} (${o.year}) · ${o.description}`,
            }))}
            selected={ocpIds}
            onChange={setOcpIds}
            emptyText="Aún no defines OCPs en M4 · OCP por Área"
          />
          <LinkSection
            title="Valores corporativos relacionados"
            options={setup.values.map((v) => ({ id: v.id, label: v.name }))}
            selected={valueIds}
            onChange={setValueIds}
            emptyText="Aún no defines valores en M1 · Valores"
          />

          {current?.ethicsMitigant && (
            <Card className="border-amber-500/30 bg-transparent">
              <CardContent className="py-3 text-left text-xs">
                <strong className="block">Mitigante ético origen</strong>
                <p className="mt-1 text-amber-700">{current.ethicsMitigant.text}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Alcance</Label>
              <Select
                value={form.scope}
                onValueChange={(v) => setForm({ ...form, scope: v ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Input
                value={form.responsible}
                onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                placeholder="Gerencia Comercial"
              />
            </div>
          </div>

          {form.scope !== "toda_organizacion" && (
            <div className="space-y-2">
              <Label>Detalle del alcance</Label>
              <Input
                value={form.scopeDetail}
                onChange={(e) => setForm({ ...form, scopeDetail: e.target.value })}
                placeholder="Ej. Solo para el área de Ventas"
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Indicador de cumplimiento</Label>
              <Input
                value={form.indicator}
                onChange={(e) => setForm({ ...form, indicator: e.target.value })}
                placeholder="Porcentaje de campañas alineadas al posicionamiento"
              />
              {genericIndicator && (
                <p className="text-xs text-amber-700">
                  ⚠️ Considera un indicador medible: porcentaje, número o frecuencia.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Frecuencia de revisión</Label>
              <Select
                value={form.reviewFrequency}
                onValueChange={(v) => setForm({ ...form, reviewFrequency: v ?? "" })}
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
          </div>

          <div className="space-y-2">
            <Label>Excepciones permitidas (opcional)</Label>
            <Textarea
              rows={2}
              value={form.exceptions}
              onChange={(e) => setForm({ ...form, exceptions: e.target.value })}
              placeholder="Descuentos mayores a 10% requieren aprobación de gerencia comercial..."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Vigencia desde</Label>
              <Input
                type="date"
                value={form.validFrom}
                onChange={(e) => {
                  const v = e.target.value;
                  // Auto-suggest nextReview = +1 year
                  let next = form.nextReview;
                  if (v && !form.nextReview) {
                    const d = new Date(v);
                    d.setFullYear(d.getFullYear() + 1);
                    next = d.toISOString().slice(0, 10);
                  }
                  setForm({ ...form, validFrom: v, nextReview: next });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Próxima revisión</Label>
              <Input
                type="date"
                value={form.nextReview}
                onChange={(e) => setForm({ ...form, nextReview: e.target.value })}
              />
            </div>
          </div>

          {hasLinks &&
            form.name &&
            form.enunciado &&
            form.indicator &&
            !vague &&
            !genericIndicator && (
              <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-transparent px-3 py-2 text-xs text-emerald-700">
                <CheckCircle2 className="mt-0.5 size-4" />
                <span>
                  Política coherente: vinculada con{" "}
                  {strategyIds.length + consolidatedIds.length} estrategias,{" "}
                  {ocpIds.length} OCPs y refuerza {valueIds.length} valor(es). Tiene indicador
                  claro de cumplimiento.
                </span>
              </div>
            )}

          {!hasLinks && form.name && form.enunciado && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-transparent px-3 py-2 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 size-4" />
              <span>
                Esta política no está vinculada con ninguna estrategia, OCP o valor. ¿Para qué
                existe?
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            {editingId ? (
              <>
                <Button onClick={onSave} disabled={isSaving}>
                  Guardar cambios
                </Button>
                {current?.status !== "confirmada" && (
                  <Button variant="default" onClick={onConfirm}>
                    <CheckCircle2 className="mr-1 size-4" /> Confirmar política
                  </Button>
                )}
                {!isMandatory && (
                  <Button variant="ghost" className="ml-auto text-destructive" onClick={onDelete}>
                    <Trash2 className="mr-1 size-4" /> Eliminar
                  </Button>
                )}
              </>
            ) : (
              <Button onClick={handleCreateCustom}>Crear política</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LinkSection({
  title,
  options,
  selected,
  onChange,
  emptyText,
}: {
  title: string;
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  emptyText?: string;
}) {
  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm">{title}</Label>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{emptyText ?? "Sin opciones"}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => {
            const isOn = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggle(opt.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition",
                  isOn
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/30 hover:bg-muted",
                )}
              >
                {opt.label.length > 90 ? opt.label.slice(0, 90) + "…" : opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// STEP 3 · Validar
// ────────────────────────────────────────────────────────────────────

function Step3({
  setup,
  contradictions,
  onBack,
  cycleId,
}: {
  setup: SetupData;
  contradictions: { politicaAId: string; politicaBId: string; description: string }[];
  onBack: () => void;
  cycleId: string;
}) {
  const utils = trpc.useUtils();
  const exportQuery = trpc.policies.getExportData.useQuery({ cycleId }, { enabled: false });

  const confirmed = setup.policies.filter((p) => p.status === "confirmada");
  const drafts = setup.policies.filter(
    (p) => p.status === "aceptada" || p.status === "en_edicion",
  );
  const discarded = setup.policies.filter((p) => p.status === "descartada");

  const coverageByCategory = POLICY_CATEGORIES.map((cat) => ({
    ...cat,
    count: setup.policies.filter((p) => p.category === cat.key && p.status !== "descartada")
      .length,
    confirmedCount: confirmed.filter((p) => p.category === cat.key).length,
  }));
  const maxCount = Math.max(1, ...coverageByCategory.map((c) => c.count));
  const emptyCategories = coverageByCategory.filter((c) => c.count === 0);

  // Matriz Policies × Strategies
  const allStrategies = setup.strategies;
  const matrixData = confirmed.map((p) => {
    const strategySet = new Set(p.strategies.map((s) => s.strategyId));
    return {
      politica: p,
      cells: allStrategies.map((s) => strategySet.has(s.id)),
    };
  });

  const narrative = useMemo(() => {
    const total = confirmed.length;
    if (total === 0) {
      return "Aún no has confirmado ninguna política. Vuelve al paso de refinar para cerrar al menos las obligatorias.";
    }
    const categoriesWithPolicies = new Set(confirmed.map((p) => p.category)).size;
    const mostCoverage = matrixData
      .map((m) => ({
        code: m.politica.code,
        name: m.politica.name,
        cnt: m.cells.filter(Boolean).length,
      }))
      .sort((a, b) => b.cnt - a.cnt)[0];
    const parts: string[] = [];
    parts.push(
      `Tu marco normativo tiene ${total} políticas confirmadas que cubren ${categoriesWithPolicies} de las ${POLICY_CATEGORIES.length} categorías clave.`,
    );
    if (allStrategies.length > 0 && mostCoverage && mostCoverage.cnt > 0) {
      parts.push(
        `La política más transversal es ${mostCoverage.code} ("${mostCoverage.name}") que aplica a ${mostCoverage.cnt} estrategias.`,
      );
    }
    if (contradictions.length > 0) {
      parts.push(`Se detectaron ${contradictions.length} posibles contradicciones para revisar.`);
    } else {
      parts.push("No se detectaron contradicciones evidentes entre políticas.");
    }
    if (emptyCategories.length > 0) {
      parts.push(
        `Categorías sin políticas: ${emptyCategories.map((c) => c.shortLabel).join(", ")}.`,
      );
    }
    return parts.join(" ");
  }, [confirmed, contradictions, emptyCategories, allStrategies.length, matrixData]);

  async function handleExport(format: "pdf" | "docx" | "html") {
    const result = await utils.policies.getExportData.fetch({ cycleId });
    const ctx: ExportContext = {
      cycle: result.cycle,
      organization: result.organization,
      policies: result.policies as unknown as ExportPolicy[],
      strategies: result.strategies,
    };
    if (ctx.policies.length === 0) {
      toast.error("Aún no hay políticas confirmadas para exportar");
      return;
    }
    if (format === "pdf") exportPolicyManualPdf(ctx);
    if (format === "docx") await exportPolicyManualDocx(ctx);
    if (format === "html") exportPolicyManualHtml(ctx);
    toast.success(`Manual ${format.toUpperCase()} generado`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 size-4" /> Volver a refinar
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Confirmadas (al PEI)" value={confirmed.length} />
        <MetricCard label="Borradores pendientes" value={drafts.length} />
        <MetricCard label="Descartadas" value={discarded.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base">Cobertura por categoría</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-left">
          {coverageByCategory.map((c) => {
            const pct = Math.round((c.count / maxCount) * 100);
            return (
              <div key={c.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={cn(c.count === 0 && "text-muted-foreground")}>
                    {c.label}
                  </span>
                  <span className="font-medium">
                    {c.count} ({c.confirmedCount} confirmadas)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: c.count === 0 ? "rgba(0,0,0,0.1)" : c.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {emptyCategories.length > 0 && (
        <Card className="border-amber-500/30 bg-transparent">
          <CardContent className="space-y-2 py-4 text-xs text-amber-700 text-left">
            <strong>Categorías sin políticas:</strong>
            <ul className="ml-4 list-disc space-y-1">
              {emptyCategories.map((c) => (
                <li key={c.key}>
                  {c.label}. Considera agregar al menos una si tu plan contempla iniciativas
                  relacionadas.
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {contradictions.length > 0 && (
        <Card className="border-amber-500/30 bg-transparent">
          <CardHeader>
            <CardTitle className="text-left text-base text-amber-700">
              Posibles contradicciones detectadas ({contradictions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-left">
            {contradictions.map((c, i) => {
              const a = setup.policies.find((p) => p.id === c.politicaAId);
              const b = setup.policies.find((p) => p.id === c.politicaBId);
              if (!a || !b) return null;
              return (
                <div
                  key={i}
                  className="rounded-md border border-amber-500/30 bg-white/50 px-3 py-2"
                >
                  <div className="font-medium">
                    {a.code} ↔ {b.code}
                  </div>
                  <p className="mt-1 text-amber-700">{c.description}</p>
                  <p className="mt-1 text-muted-foreground">
                    "{a.name}" ↔ "{b.name}"
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {confirmed.length > 0 && allStrategies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-left text-base">
              Matriz Políticas × Estrategias
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-3 py-2 font-medium">Política</th>
                  {allStrategies.map((s) => (
                    <th key={s.id} className="px-2 py-2 text-center font-medium">
                      {s.code ?? "—"}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-medium">Cobertura</th>
                </tr>
              </thead>
              <tbody>
                {matrixData.map((row) => {
                  const linked = row.cells.filter(Boolean).length;
                  return (
                    <tr key={row.politica.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {row.politica.code}
                        </div>
                        <div className="font-medium">{row.politica.name}</div>
                      </td>
                      {row.cells.map((on, i) => (
                        <td key={i} className="px-2 py-2 text-center">
                          {on ? (
                            <CheckCircle2 className="mx-auto size-3.5 text-emerald-700" />
                          ) : (
                            <span className="text-muted-foreground/40">·</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center font-semibold">{linked}</td>
                    </tr>
                  );
                })}
                <tr className="border-t bg-muted/20">
                  <td className="px-3 py-2 font-semibold">Cobertura por estrategia</td>
                  {allStrategies.map((s, i) => {
                    const cnt = matrixData.filter((r) => r.cells[i]).length;
                    return (
                      <td key={s.id} className="px-2 py-2 text-center font-semibold">
                        {cnt}
                      </td>
                    );
                  })}
                  <td />
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base">Análisis del marco</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-left text-muted-foreground">
          {narrative}
        </CardContent>
      </Card>

      <Card
        className={cn(
          "border-2",
          contradictions.length === 0 && confirmed.length > 0
            ? "border-emerald-500/30 bg-transparent"
            : "border-amber-500/30 bg-transparent",
        )}
      >
        <CardContent className="flex items-start gap-3 py-4 text-left text-sm">
          {contradictions.length === 0 && confirmed.length > 0 ? (
            <>
              <CheckCircle2 className="mt-0.5 size-5 text-emerald-700" />
              <span className="text-emerald-700">
                <strong>Marco normativo coherente.</strong> No se detectaron contradicciones
                entre políticas. Listo para integrarse al Plan Estratégico Integral.
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="mt-0.5 size-5 text-amber-700" />
              <span className="text-amber-700">
                <strong>Marco con observaciones.</strong> Revisa los puntos detectados antes
                de exportar.
              </span>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base">Exportar manual de políticas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => handleExport("pdf")}>
            <FileText className="mr-1 size-4" /> PDF profesional
          </Button>
          <Button variant="outline" onClick={() => handleExport("docx")}>
            <FileDown className="mr-1 size-4" /> Word editable
          </Button>
          <Button variant="outline" onClick={() => handleExport("html")}>
            <FileCode className="mr-1 size-4" /> HTML publicación
          </Button>
        </CardContent>
      </Card>

      <Card className="border-primary/25 bg-primary/5">
        <CardContent className="py-4 text-sm text-left text-primary">
          <strong className="block">¿Qué sigue?</strong>
          En el próximo módulo (Estructura Organizacional) definirás cómo se organizan las
          áreas y equipos para ejecutar tu plan bajo este marco de políticas.
        </CardContent>
      </Card>
    </div>
  );
}
