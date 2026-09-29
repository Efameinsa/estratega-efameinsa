"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import {
  COMPETITIVE_CRITERIA,
  ATTRACTIVENESS_FACTORS,
  getFceForValue,
} from "@/lib/competitive-analysis-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Target,
  Users,
  BarChart3,
  TrendingUp,
  Check,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Award,
  AlertTriangle,
  X,
  Building2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FactorDef {
  id: string;
  name: string;
  weight: number;
  source: string;
  sortOrder: number;
}

interface Competitor {
  id: string;
  name: string;
  isOwnOrg: boolean;
  totalScore: number | null;
  sortOrder: number;
  scores: Array<{ factorDefId: string; rating: number; score: number }>;
}

// Rating labels
const RATING_LABELS: Record<number, string> = {
  1: "Debilidad mayor",
  2: "Debilidad menor",
  3: "Fortaleza menor",
  4: "Fortaleza mayor",
};

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

const STEPS = [
  { num: 1, label: "FCE", desc: "Factores Clave", icon: Target },
  { num: 2, label: "Competidores", desc: "Registro", icon: Users },
  { num: 3, label: "Calificaciones", desc: "Matriz", icon: BarChart3 },
  { num: 4, label: "Resultados", desc: "Brechas", icon: Award },
];

function Stepper({ current, onStep, canAdvance }: {
  current: number;
  onStep: (step: number) => void;
  canAdvance: (step: number) => boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isActive = current === s.num;
        const isDone = current > s.num;
        const canGo = canAdvance(s.num);

        return (
          <React.Fragment key={s.num}>
            {i > 0 && (
              <div className="h-px flex-1 mx-1" style={{
                backgroundColor: isDone ? "#34d399" : "var(--color-border-tertiary, rgba(167,139,250,0.14))",
              }} />
            )}
            <button
              type="button"
              onClick={() => canGo && onStep(s.num)}
              disabled={!canGo}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                canGo ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              }`}
              style={{
                borderColor: isActive ? "#a78bfa" : isDone ? "#34d399" : "var(--color-border-tertiary)",
                backgroundColor: isActive ? "transparent" : isDone ? "transparent" : "transparent",
              }}
            >
              <span
                className="flex size-7 items-center justify-center rounded-lg text-[11px] font-medium text-white"
                style={{ backgroundColor: isActive ? "#a78bfa" : isDone ? "#34d399" : "var(--color-text-tertiary)" }}
              >
                {isDone ? <Check className="size-3.5" /> : s.num}
              </span>
              <div className="hidden sm:block">
                <span className="text-[12px] font-medium block" style={{
                  color: isActive ? "#a78bfa" : isDone ? "#34d399" : "var(--color-text-secondary)",
                }}>
                  {s.label}
                </span>
                <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>{s.desc}</span>
              </div>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: FCE Consolidation
// ---------------------------------------------------------------------------

function Step1FCE({
  cycleId,
  factors,
  onNext,
}: {
  cycleId: string;
  factors: FactorDef[];
  onNext: () => void;
}) {
  const utils = trpc.useUtils();
  const createFactor = trpc.mpc.createFactor.useMutation({
    onSuccess: () => utils.mpc.getAll.invalidate({ cycleId }),
  });
  const updateFactor = trpc.mpc.updateFactor.useMutation({
    onSuccess: () => utils.mpc.getAll.invalidate({ cycleId }),
  });
  const deleteFactor = trpc.mpc.deleteFactor.useMutation({
    onSuccess: () => utils.mpc.getAll.invalidate({ cycleId }),
  });
  const importMutation = trpc.mpc.importFromAnalyses.useMutation({
    onSuccess: (d) => {
      utils.mpc.getAll.invalidate({ cycleId });
      toast.success(`${d.count} FCE importados desde los analisis`);
    },
  });

  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState("0.08");

  // Track which factors are selected (included in MPC)
  // By default all imported factors are selected; weight=0 means excluded
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  function toggleFactor(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedFactors = factors.filter((f) => !excluded.has(f.id));
  const totalWeight = selectedFactors.reduce((s, f) => s + f.weight, 0);
  const isWeightValid = Math.abs(totalWeight - 1) < 0.005;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[14px] font-medium">Paso 1 — Factores Clave de Exito</h3>
        <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
          Importa FCE desde los analisis competitivo y de atractividad, o agregalos manualmente. La suma de pesos debe ser 1.00.
        </p>
      </div>

      {/* Import + IA */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => importMutation.mutate({ cycleId })}
          disabled={importMutation.isPending} className="gap-1.5">
          <Target className="size-3.5" /> Importar desde analisis
        </Button>
        {selectedFactors.length >= 3 && (
          <button type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all cursor-pointer"
            style={{ borderColor: "#a78bfa", color: "#a78bfa" }}
            onClick={() => toast.info("La evaluacion de FCE con IA estara disponible proximamente.")}
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full opacity-75" style={{ backgroundColor: "#a78bfa" }} />
              <span className="relative inline-flex size-2 rounded-full" style={{ backgroundColor: "#a78bfa" }} />
            </span>
            Evaluar FCE con IA
          </button>
        )}
      </div>

      {/* Weight validation bar — 3 states */}
      {(() => {
        const barColor = isWeightValid ? "#34d399" : totalWeight > 1 ? "#fca5a5" : "#fbbf24";
        const tooMany = selectedFactors.length > 12;
        const tooFew = selectedFactors.length < 5;
        return (
          <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--color-border-tertiary)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Suma de pesos ({selectedFactors.length} FCE seleccionados)
              </span>
              {isWeightValid ? (
                <span className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: "#34d399" }}>
                  <Check className="size-3.5" /> Lista para continuar
                </span>
              ) : totalWeight > 1 ? (
                <span className="text-[12px] font-medium" style={{ color: "#fca5a5" }}>
                  Excede 1.00 — reduce algun peso
                </span>
              ) : (
                <span className="text-[12px] font-medium" style={{ color: "#fbbf24" }}>
                  Faltan {(1 - totalWeight).toFixed(2)} puntos
                </span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-border-tertiary, rgba(167,139,250,0.14))" }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(totalWeight * 100, 100)}%`, backgroundColor: barColor }} />
            </div>
            {(tooMany || tooFew) && (
              <span className="text-[11px] font-medium" style={{ color: "#fbbf24" }}>
                {tooFew ? `Minimo 5 FCE (${selectedFactors.length}/5)` : `Maximo 12 FCE (${selectedFactors.length}/12)`}
              </span>
            )}
          </div>
        );
      })()}

      {/* Factor list grouped by source */}
      {factors.length > 0 && (() => {
        const SOURCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
          competitivo: { label: "Competitivo", color: "#a78bfa", bg: "transparent" },
          atractividad: { label: "Atractividad", color: "#34d399", bg: "transparent" },
          porter: { label: "Porter", color: "#fbbf24", bg: "transparent" },
          manual: { label: "Manual", color: "#a8a29e", bg: "transparent" },
        };
        const groups = new Map<string, FactorDef[]>();
        factors.forEach((f) => {
          const src = f.source || "manual";
          if (!groups.has(src)) groups.set(src, []);
          groups.get(src)!.push(f);
        });
        let globalIdx = 0;

        return (
          <div className="space-y-4">
            {Array.from(groups.entries()).map(([source, items]) => {
              const cfg = SOURCE_CONFIG[source] ?? SOURCE_CONFIG.manual;
              return (
                <div key={source} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                      {items.filter((f) => !excluded.has(f.id)).length} seleccionados de {items.length}
                    </span>
                  </div>
                  {items.map((f) => {
                    const idx = ++globalIdx;
                    const isSelected = !excluded.has(f.id);
                    return (
                      <div key={f.id}
                        className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all duration-200"
                        style={{
                          borderColor: isSelected ? cfg.color : "var(--color-border-tertiary)",
                          borderLeftWidth: "3px",
                          borderLeftColor: isSelected ? cfg.color : "var(--color-border-tertiary)",
                          backgroundColor: isSelected ? cfg.bg : "transparent",
                          opacity: isSelected ? 1 : 0.4,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleFactor(f.id)}
                          className="rounded cursor-pointer"
                          style={{ accentColor: cfg.color }}
                        />
                        <span className="text-[11px] font-medium w-5 text-muted-foreground">{idx}</span>
                        <input
                          className="flex-1 bg-transparent text-[13px] outline-none focus:underline"
                          defaultValue={f.name}
                          disabled={!isSelected}
                          onBlur={(e) => {
                            if (e.target.value !== f.name) updateFactor.mutate({ id: f.id, name: e.target.value });
                          }}
                        />
                        <Input
                          type="number" step="0.01" min="0.01" max="0.30"
                          className="h-7 w-20 text-[12px]"
                          defaultValue={f.weight.toFixed(2)}
                          disabled={!isSelected}
                          style={{ opacity: isSelected ? 1 : 0.4 }}
                          onBlur={(e) => {
                            const w = parseFloat(e.target.value);
                            if (!isNaN(w) && w !== f.weight) updateFactor.mutate({ id: f.id, weight: w });
                          }}
                        />
                        <button type="button" onClick={() => deleteFactor.mutate({ id: f.id })}
                          className="rounded p-1 hover:bg-muted cursor-pointer">
                          <Trash2 className="size-3.5 text-destructive" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Add manual FCE */}
      <div className="flex items-center gap-2">
        <Input placeholder="Nombre del FCE..." value={newName} onChange={(e) => setNewName(e.target.value)}
          className="text-[13px] flex-1" />
        <Input type="number" step="0.01" min="0.01" max="0.30" value={newWeight}
          onChange={(e) => setNewWeight(e.target.value)} className="w-20 text-[13px]" />
        <Button size="sm" onClick={() => {
          if (!newName.trim()) return;
          createFactor.mutate({ cycleId, name: newName.trim(), weight: parseFloat(newWeight) });
          setNewName(""); setNewWeight("0.08");
        }} disabled={!newName.trim()}>
          <Plus className="size-3.5" />
        </Button>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={onNext}
          disabled={selectedFactors.length < 5 || selectedFactors.length > 12 || !isWeightValid}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium text-white cursor-pointer disabled:opacity-40"
          style={{ backgroundColor: "#a78bfa" }}
        >
          Continuar → Competidores <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Competitors
// ---------------------------------------------------------------------------

const COMP_COLORS = ["#E11D48", "#fbbf24", "#a78bfa", "#22d3ee"];

function Step2Competitors({
  cycleId,
  competitors,
  onNext,
  onBack,
}: {
  cycleId: string;
  competitors: Competitor[];
  onNext: () => void;
  onBack: () => void;
}) {
  const utils = trpc.useUtils();
  const inv = () => utils.mpc.getAll.invalidate({ cycleId });
  const createComp = trpc.mpc.createCompetitor.useMutation({ onSuccess: inv });
  const deleteComp = trpc.mpc.deleteCompetitor.useMutation({ onSuccess: inv });

  const [newName, setNewName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const hasOwnOrg = competitors.some((c) => c.isOwnOrg);
  const ownOrg = competitors.find((c) => c.isOwnOrg);
  const rivals = competitors.filter((c) => !c.isOwnOrg);
  let rivalIdx = 0;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[14px] font-medium">Paso 2 — Registrar Competidores</h3>
        <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
          Tu organizacion siempre aparece en la primera columna. Agrega hasta 3 competidores para comparar.
        </p>
      </div>

      {/* Own org — always first, not deletable */}
      {ownOrg ? (
        <div className="rounded-xl border-2 px-4 py-3.5" style={{ borderColor: "#a78bfa", backgroundColor: "transparent" }}>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl text-[12px] font-medium text-white"
              style={{ backgroundColor: "#a78bfa" }}
            >
              TU
            </span>
            <div className="flex-1">
              <span className="text-[13px] font-medium block">{ownOrg.name}</span>
              <span className="text-[11px]" style={{ color: "#9ec2ec" }}>Siempre incluida · Primera columna del MPC</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border p-3" style={{ borderColor: "#fbbf24", backgroundColor: "transparent" }}>
          <AlertTriangle className="size-4 shrink-0 mt-0.5" style={{ color: "#fbbf24" }} />
          <div>
            <p className="text-[12px] font-medium" style={{ color: "#f0c283" }}>Registra tu organizacion primero</p>
            <div className="flex items-center gap-2 mt-2">
              <Input placeholder="Nombre de tu organizacion..." value={newName}
                onChange={(e) => setNewName(e.target.value)} className="text-[13px] w-64" />
              <Button size="sm" onClick={() => {
                if (!newName.trim()) return;
                createComp.mutate({ cycleId, name: newName.trim(), isOwnOrg: true });
                setNewName("");
              }} disabled={!newName.trim()}>
                Registrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rival cards */}
      <div className="space-y-2">
        {rivals.map((c) => {
          const ci = rivalIdx++;
          const color = COMP_COLORS[ci % COMP_COLORS.length];
          const initials = `C${ci + 1}`;
          const isDeleting = confirmDeleteId === c.id;

          return (
            <div key={c.id}
              className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-all"
              style={{ borderColor: "var(--color-border-tertiary)" }}
            >
              <span className="flex size-9 items-center justify-center rounded-xl text-[12px] font-medium text-white shrink-0"
                style={{ backgroundColor: color }}
              >
                {initials}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-medium block">{c.name}</span>
              </div>

              {isDeleting ? (
                <div className="flex items-center gap-2 text-[12px]">
                  <span style={{ color: "var(--color-text-secondary)" }}>Eliminar {c.name}?</span>
                  <button type="button"
                    onClick={() => { deleteComp.mutate({ id: c.id }); setConfirmDeleteId(null); }}
                    className="rounded px-2 py-0.5 text-white cursor-pointer"
                    style={{ backgroundColor: "transparent" }}
                  >
                    Si
                  </button>
                  <button type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded border px-2 py-0.5 cursor-pointer"
                    style={{ borderColor: "var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}
                  >
                    No
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDeleteId(c.id)}
                  className="rounded-lg p-1.5 transition-colors hover:bg-muted cursor-pointer">
                  <X className="size-4" style={{ color: "var(--color-text-tertiary)" }} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add competitor — dashed border card */}
      {hasOwnOrg && competitors.length < 4 && (
        <div className="space-y-2">
          {newName ? (
            <div className="flex items-center gap-2 rounded-xl border-2 border-dashed px-4 py-3"
              style={{ borderColor: "var(--color-border-tertiary)" }}
            >
              <span className="flex size-9 items-center justify-center rounded-xl text-[12px] font-medium text-white shrink-0"
                style={{ backgroundColor: COMP_COLORS[rivals.length % COMP_COLORS.length] }}
              >
                C{rivals.length + 1}
              </span>
              <Input placeholder="Nombre del competidor..." value={newName}
                onChange={(e) => setNewName(e.target.value)} className="text-[13px] flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) {
                    createComp.mutate({ cycleId, name: newName.trim(), isOwnOrg: false });
                    setNewName("");
                  }
                  if (e.key === "Escape") setNewName("");
                }}
              />
              <Button size="sm" onClick={() => {
                if (!newName.trim()) return;
                createComp.mutate({ cycleId, name: newName.trim(), isOwnOrg: false });
                setNewName("");
              }} disabled={!newName.trim()}>
                <Check className="size-3.5" />
              </Button>
              <button type="button" onClick={() => setNewName("")}
                className="rounded p-1 hover:bg-muted cursor-pointer">
                <X className="size-4" style={{ color: "var(--color-text-tertiary)" }} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setNewName(" ")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-4 text-[13px] font-medium transition-colors hover:bg-muted/30 cursor-pointer"
              style={{ borderColor: "var(--color-border-tertiary)", color: "var(--color-text-tertiary)" }}
            >
              <Plus className="size-4" /> Agregar competidor
            </button>
          )}
        </div>
      )}
      {competitors.length >= 4 && (
        <p className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
          Maximo 4 competidores alcanzado (incluida tu organizacion)
        </p>
      )}

      {/* Methodological note */}
      <div className="flex items-start gap-2 rounded-lg border p-3"
        style={{ borderColor: "var(--color-border-tertiary)" }}
      >
        <AlertTriangle className="size-4 shrink-0 mt-0.5" style={{ color: "var(--color-text-tertiary)" }} />
        <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
          D&apos;Alessio recomienda incluir entre 2 y 4 competidores directos. Incluir demasiados hace la MPC dificil de analizar. Prioriza los mas relevantes estrategicamente.
        </p>
      </div>

      <div className="flex justify-between">
        <button type="button" onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-[13px] font-medium cursor-pointer"
          style={{ borderColor: "var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}
        >
          <ChevronLeft className="size-3.5" /> Anterior
        </button>
        <button type="button" onClick={onNext}
          disabled={competitors.length < 2 || !hasOwnOrg}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium text-white cursor-pointer disabled:opacity-40"
          style={{ backgroundColor: "#a78bfa" }}
        >
          Siguiente: Calificaciones <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Rating Matrix
// ---------------------------------------------------------------------------

const RATING_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: "transparent", text: "#ee9c9c", border: "#fca5a5" },
  2: { bg: "transparent", text: "#f0c283", border: "#fbbf24" },
  3: { bg: "transparent", text: "#a8cc8d", border: "#a3e635" },
  4: { bg: "transparent", text: "#85c9a8", border: "#34d399" },
};

function Step3Ratings({
  cycleId,
  factors,
  competitors,
  onNext,
  onBack,
}: {
  cycleId: string;
  factors: FactorDef[];
  competitors: Competitor[];
  onNext: () => void;
  onBack: () => void;
}) {
  const utils = trpc.useUtils();
  const [saveFlash, setSaveFlash] = useState(false);
  const upsertScore = trpc.mpc.upsertScore.useMutation({
    onSuccess: () => {
      utils.mpc.getAll.invalidate({ cycleId });
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 800);
    },
  });

  function getRating(compId: string, fceId: string): number {
    const comp = competitors.find((c) => c.id === compId);
    return comp?.scores.find((sc) => sc.factorDefId === fceId)?.rating ?? 0;
  }

  function getPP(compId: string, fceId: string): number {
    const comp = competitors.find((c) => c.id === compId);
    return comp?.scores.find((sc) => sc.factorDefId === fceId)?.score ?? 0;
  }

  // Max PP per row (for winner highlighting)
  function getMaxPPForFce(fceId: string): number {
    return Math.max(...competitors.map((c) => getPP(c.id, fceId)), 0);
  }

  // Leader (max total)
  const maxTotal = Math.max(...competitors.map((c) => c.totalScore ?? 0), 0);

  const totalCells = factors.length * competitors.length;
  const filledCells = competitors.reduce((sum, c) => sum + c.scores.length, 0);
  const missingCells = totalCells - filledCells;
  const isComplete = missingCells === 0 && totalCells > 0;

  // Sort: own org first
  const sorted = [...competitors].sort((a, b) => (b.isOwnOrg ? 1 : 0) - (a.isOwnOrg ? 1 : 0));

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[14px] font-medium">Paso 3 — Matriz de Calificaciones</h3>
        <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
          Para cada FCE, califica a cada actor: 1 = Debilidad mayor, 2 = Debilidad menor, 3 = Fortaleza menor, 4 = Fortaleza mayor.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-border-tertiary, rgba(167,139,250,0.14))" }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{ width: `${totalCells > 0 ? (filledCells / totalCells) * 100 : 0}%`, backgroundColor: isComplete ? "#34d399" : "#a78bfa" }} />
        </div>
        <span className="text-[12px] font-medium shrink-0" style={{ color: isComplete ? "#34d399" : "var(--color-text-tertiary)" }}>
          {filledCells}/{totalCells}
          {isComplete && <Check className="size-3 inline ml-1" />}
        </span>
      </div>

      {/* Matrix */}
      <div className="relative overflow-x-auto rounded-xl border">
        {/* Save indicator */}
        {saveFlash && (
          <div className="absolute top-2 right-2 flex items-center gap-1 animate-in fade-in duration-200">
            <span className="size-2 rounded-full" style={{ backgroundColor: "#34d399" }} />
            <span className="text-[10px]" style={{ color: "#34d399" }}>Guardado</span>
          </div>
        )}
        <table className="w-full text-[12px]">
          {/* Header row 1: actor names */}
          <thead>
            <tr className="border-b" style={{ backgroundColor: "var(--color-background-secondary, #f9fafb)" }}>
              <th className="py-2 px-3 text-left font-medium" style={{ color: "var(--color-text-tertiary)", minWidth: 180 }}>
                Factor Clave de Exito
              </th>
              <th className="py-2 px-1 text-center font-medium w-[50px]" style={{ color: "var(--color-text-tertiary)" }}>
                Peso
              </th>
              {sorted.map((c, ci) => (
                <th key={c.id} colSpan={2} className="py-2 px-1 text-center font-medium"
                  style={{ color: c.isOwnOrg ? "#a78bfa" : "var(--color-text-secondary)" }}
                >
                  <div className="flex items-center justify-center gap-1">
                    {c.isOwnOrg ? (
                      <span className="inline-flex size-5 items-center justify-center rounded text-[9px] font-medium text-white"
                        style={{ backgroundColor: "#a78bfa" }}>TU</span>
                    ) : (
                      <span className="inline-flex size-5 items-center justify-center rounded text-[9px] font-medium text-white"
                        style={{ backgroundColor: COMP_COLORS[ci - 1] ?? "#a8a29e" }}>C{ci}</span>
                    )}
                    <span className="truncate max-w-[80px]">{c.name}</span>
                  </div>
                </th>
              ))}
            </tr>
            {/* Header row 2: Cal. / P.P. sub-columns */}
            <tr className="border-b" style={{ backgroundColor: "var(--color-background-secondary, #f9fafb)" }}>
              <th />
              <th />
              {sorted.map((c) => (
                <React.Fragment key={c.id}>
                  <th className="py-1 px-1 text-center text-[10px] font-medium w-[80px]"
                    style={{ color: "var(--color-text-tertiary)" }}>Cal.</th>
                  <th className="py-1 px-1 text-center text-[10px] font-medium w-[52px]"
                    style={{ color: "var(--color-text-tertiary)" }}>P.P.</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {factors.map((f) => (
              <tr key={f.id} className="border-b last:border-0">
                <td className="py-2.5 px-3 text-[12px] font-medium" style={{ minWidth: 180 }}>{f.name}</td>
                <td className="py-2.5 px-1 text-center text-[12px]">{f.weight.toFixed(2)}</td>
                {sorted.map((c) => {
                  const rating = getRating(c.id, f.id);
                  const pp = getPP(c.id, f.id);
                  const maxPP = getMaxPPForFce(f.id);
                  const isRowWinner = pp > 0 && pp >= maxPP;
                  return (
                    <React.Fragment key={c.id}>
                      {/* 4 rating buttons */}
                      <td className="py-1.5 px-1">
                        <div className="flex gap-0.5 justify-center">
                          {([1, 2, 3, 4] as const).map((r) => {
                            const selected = rating === r;
                            const rc = RATING_COLORS[r];
                            return (
                              <button key={r} type="button"
                                onClick={() => upsertScore.mutate({ competitorId: c.id, factorDefId: f.id, rating: r })}
                                className="flex size-7 items-center justify-center rounded text-[11px] font-medium transition-all cursor-pointer"
                                style={{
                                  backgroundColor: selected ? rc.bg : "transparent",
                                  color: selected ? rc.text : "var(--color-text-tertiary)",
                                  border: selected ? `1.5px solid ${rc.border}` : "1px solid var(--color-border-tertiary, rgba(167,139,250,0.14))",
                                }}
                              >
                                {r}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      {/* Puntaje ponderado — green if row winner */}
                      <td className="py-1.5 px-1 text-center">
                        {rating > 0 ? (
                          <span className="text-[11px] font-medium"
                            style={{ color: isRowWinner ? "#34d399" : "var(--color-text-secondary)" }}
                          >
                            {pp.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>—</span>
                        )}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium" style={{ backgroundColor: "var(--color-background-secondary, #f9fafb)" }}>
              <td className="py-3 px-3 text-[12px]">TOTAL PONDERADO</td>
              <td className="py-3 px-1 text-center text-[12px]">
                {factors.reduce((s, f) => s + f.weight, 0).toFixed(2)}
              </td>
              {sorted.map((c) => {
                const total = c.totalScore ?? 0;
                const isLeader = total > 0 && total >= maxTotal;
                return (
                  <td key={c.id} colSpan={2} className="py-3 px-1 text-center">
                    <span className="text-[15px] font-medium" style={{
                      color: isLeader ? "#34d399" : c.isOwnOrg ? "#a78bfa" : "var(--color-text-primary)",
                    }}>
                      {isLeader && "★ "}{total.toFixed(2)}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex justify-between">
        <button type="button" onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-[13px] font-medium cursor-pointer"
          style={{ borderColor: "var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}
        >
          <ChevronLeft className="size-3.5" /> Anterior
        </button>
        <button type="button" onClick={onNext}
          disabled={!isComplete}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium text-white cursor-pointer disabled:opacity-40"
          style={{ backgroundColor: "#a78bfa" }}
        >
          {isComplete ? "Ver resultado MPC →" : `Faltan ${missingCells} celdas por calificar`}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Results & Gap Analysis
// ---------------------------------------------------------------------------

function Step4Results({
  factors,
  competitors,
  onBack,
}: {
  factors: FactorDef[];
  competitors: Competitor[];
  onBack: () => void;
}) {
  // Sort competitors by total score descending
  const ranked = [...competitors].sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0));
  const ownOrg = competitors.find((c) => c.isOwnOrg);
  const bestRival = ranked.find((c) => !c.isOwnOrg);

  // Gap analysis
  const brechas = useMemo(() => {
    if (!ownOrg || !bestRival) return [];
    return factors.map((f) => {
      const ownScore = ownOrg.scores.find((s) => s.factorDefId === f.id);
      const rivalScore = bestRival.scores.find((s) => s.factorDefId === f.id);
      const ppOwn = ownScore?.score ?? 0;
      const ppRival = rivalScore?.score ?? 0;
      const brecha = ppOwn - ppRival;
      return {
        fceId: f.id,
        fceNombre: f.name,
        fcePeso: f.weight,
        ratingOwn: ownScore?.rating ?? 0,
        ratingRival: rivalScore?.rating ?? 0,
        ppOwn,
        ppRival,
        brecha,
        esFavorable: brecha >= 0,
        esCritica: Math.abs(brecha) >= f.weight * 1.5,
      };
    });
  }, [factors, ownOrg, bestRival]);

  const brechasFavorables = brechas.filter((b) => b.esFavorable);
  const brechasDesfavorables = brechas.filter((b) => !b.esFavorable);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[14px] font-medium">Paso 4 — Resultados y Analisis de Brechas</h3>
        <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
          Posicion competitiva de tu organizacion vs. competidores directos.
        </p>
      </div>

      {/* Ranking */}
      <div className="space-y-2">
        <h4 className="text-[12px] font-medium uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
          Ranking competitivo
        </h4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ranked.map((c, i) => {
            const isOwn = c.isOwnOrg;
            const isFirst = i === 0;
            const positions = ["1er lugar", "2do lugar", "3er lugar", "4to lugar"];
            return (
              <div key={c.id} className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center"
                style={{
                  borderColor: isFirst ? "#34d399" : isOwn ? "#a78bfa" : "var(--color-border-tertiary)",
                  borderWidth: isFirst || isOwn ? "2px" : "1px",
                  backgroundColor: isFirst ? "transparent" : isOwn ? "transparent" : "transparent",
                }}
              >
                {isFirst && <Award className="size-5" style={{ color: "#34d399" }} />}
                <span className="text-2xl font-medium" style={{ color: isFirst ? "#34d399" : isOwn ? "#a78bfa" : "var(--color-text-primary)" }}>
                  {(c.totalScore ?? 0).toFixed(2)}
                </span>
                <span className="text-[13px] font-medium">{c.name}</span>
                <span className="text-[11px]" style={{ color: isFirst ? "#34d399" : "var(--color-text-tertiary)" }}>
                  {positions[i] ?? `${i + 1}to lugar`}
                  {isFirst && " · ★ Lider"}
                </span>
                {isOwn && !isFirst && (
                  <span className="text-[10px] font-medium" style={{ color: "#a78bfa" }}>Tu organizacion</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Gap analysis with bars */}
      {ownOrg && bestRival && (
        <div className="space-y-4">
          <h4 className="text-[12px] font-medium uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
            Analisis de brechas — {ownOrg.name} vs. {bestRival.name}
          </h4>

          <div className="space-y-2">
            {[...brechas].sort((a, b) => a.brecha - b.brecha).map((b) => {
              const maxPossible = b.fcePeso * 4;
              const ownPct = maxPossible > 0 ? (b.ppOwn / maxPossible) * 100 : 0;
              const rivalPct = maxPossible > 0 ? (b.ppRival / maxPossible) * 100 : 0;
              const isNeutral = Math.abs(b.brecha) < 0.05;
              const badgeBg = b.esFavorable ? "transparent" : isNeutral ? "transparent" : "transparent";
              const badgeText = b.esFavorable ? "#85c9a8" : isNeutral ? "#a8a29e" : "#ee9c9c";
              const descColor = b.esFavorable ? "#34d399" : isNeutral ? "#a8a29e" : "#fca5a5";

              return (
                <div key={b.fceId} className="rounded-xl border p-3.5 space-y-2"
                  style={{ borderColor: "var(--color-border-tertiary)" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-medium block">{b.fceNombre}</span>
                      <span className="text-[11px]" style={{ color: descColor }}>
                        Peso: {b.fcePeso.toFixed(2)}
                        {b.esFavorable ? " · Tu ventaja" : b.esCritica ? " · Brecha critica" : isNeutral ? "" : " · Brecha a cerrar"}
                      </span>
                    </div>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                      style={{ backgroundColor: badgeBg, color: badgeText }}
                    >
                      {b.brecha >= 0 ? "+" : ""}{b.brecha.toFixed(2)}
                      {b.esCritica && " ⚠"}
                    </span>
                  </div>
                  {/* Bars */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-12 shrink-0 text-right" style={{ color: "#a78bfa" }}>Tu org</span>
                      <div className="flex-1 h-3 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-border-tertiary, rgba(167,139,250,0.14))" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${ownPct}%`, backgroundColor: "#a78bfa" }} />
                      </div>
                      <span className="text-[10px] w-8 shrink-0" style={{ color: "#a78bfa" }}>{b.ppOwn.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] w-12 shrink-0 text-right truncate" style={{ color: "#fca5a5" }}>{bestRival.name.slice(0, 8)}</span>
                      <div className="flex-1 h-3 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-border-tertiary, rgba(167,139,250,0.14))" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${rivalPct}%`, backgroundColor: "transparent" }} />
                      </div>
                      <span className="text-[10px] w-8 shrink-0" style={{ color: "#fca5a5" }}>{b.ppRival.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Narrative analysis */}
      {ownOrg && (
        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: "#a78bfa", backgroundColor: "transparent" }}>
          <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "#9ec2ec" }}>
            Analisis estrategico generado automaticamente
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: "#9ec2ec" }}>
            {(() => {
              const pos = ranked.findIndex((c) => c.isOwnOrg) + 1;
              const totalOwn = ownOrg.totalScore ?? 0;
              const leader = ranked[0];
              const brechasCriticas = brechas.filter((b) => !b.esFavorable && (b.brecha < -0.15 || b.fcePeso >= 0.15));
              const ventajas = brechas.filter((b) => b.esFavorable);

              let texto = `Tu organizacion ocupa el ${pos}° lugar con ${totalOwn.toFixed(2)} puntos`;
              if (pos === 1) {
                texto += ", siendo el lider del sector. ";
              } else {
                texto += `, por detras de ${leader.name} (${(leader.totalScore ?? 0).toFixed(2)}). `;
              }
              if (ventajas.length > 0) {
                texto += `La principal ventaja competitiva esta en ${ventajas.slice(0, 2).map((v) => v.fceNombre).join(" y ")}, donde superas al mejor rival. `;
              }
              if (brechasCriticas.length > 0) {
                texto += `Las brechas criticas que requieren atencion estrategica son: ${brechasCriticas.map((b) => b.fceNombre).join(", ")}. `;
                texto += "Estos FCE deben orientar las estrategias de desarrollo de capacidades en M3.";
              }
              return texto;
            })()}
          </p>

          <button type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium cursor-pointer"
            style={{ borderColor: "#a78bfa", color: "#a78bfa" }}
            onClick={() => toast.info("La profundizacion con IA estara disponible proximamente.")}
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full opacity-75" style={{ backgroundColor: "#a78bfa" }} />
              <span className="relative inline-flex size-2 rounded-full" style={{ backgroundColor: "#a78bfa" }} />
            </span>
            Profundizar con IA
          </button>
        </div>
      )}

      <div className="flex justify-start">
        <button type="button" onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-[13px] font-medium cursor-pointer"
          style={{ borderColor: "var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}
        >
          <ChevronLeft className="size-3.5" /> Anterior
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MpcPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const [step, setStep] = useState(1);

  const { data } = trpc.mpc.getAll.useQuery({ cycleId });
  const factors = (data?.factorDefs ?? []) as FactorDef[];
  const competitors = (data?.competitors ?? []) as Competitor[];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const isWeightValid = Math.abs(totalWeight - 1) < 0.005;
  const hasOwnOrg = competitors.some((c) => c.isOwnOrg);
  const totalCells = factors.length * competitors.length;
  const filledCells = competitors.reduce((sum, c) => sum + c.scores.length, 0);
  const isRatingComplete = filledCells === totalCells && totalCells > 0;

  function canAdvance(s: number): boolean {
    if (s === 1) return true;
    if (s === 2) return factors.length >= 5 && isWeightValid;
    if (s === 3) return factors.length >= 5 && isWeightValid && competitors.length >= 2 && competitors.length <= 4 && hasOwnOrg;
    if (s === 4) return factors.length >= 5 && isWeightValid && competitors.length >= 2 && competitors.length <= 4 && hasOwnOrg && isRatingComplete;
    return false;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      {/* Hero */}
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "transparent" }}>
          <Target className="size-6" style={{ color: "#a78bfa" }} />
        </div>
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Matriz de Perfil Competitivo</h1>
          <p className="text-sm text-muted-foreground">MPC — Comparacion con competidores en FCE del sector</p>
        </div>
      </div>

      {/* Stepper */}
      <Stepper current={step} onStep={setStep} canAdvance={canAdvance} />

      <Separator />

      {/* Step content */}
      {step === 1 && <Step1FCE cycleId={cycleId} factors={factors} onNext={() => setStep(2)} />}
      {step === 2 && <Step2Competitors cycleId={cycleId} competitors={competitors} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && <Step3Ratings cycleId={cycleId} factors={factors} competitors={competitors} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
      {step === 4 && <Step4Results factors={factors} competitors={competitors} onBack={() => setStep(3)} />}
    </div>
  );
}
