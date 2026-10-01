"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import {
  PESTEC_VARIABLES,
  OA_CONFIG,
  MEFE_RESPONSE_LABELS,
  type PestecVariableData,
} from "@/lib/pestec-evaluation-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Landmark,
  TrendingUp,
  Users,
  Cpu,
  Leaf,
  Swords,
  ChevronDown,
  Check,
  Plus,
  Trash2,
  Sparkles,
  X,
  Paperclip,
  Globe,
  Info,
  Pencil,
  AlertTriangle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const VAR_ICONS: Record<string, React.ElementType> = {
  politico: Landmark, economico: TrendingUp, social: Users,
  tecnologico: Cpu, ecologico: Leaf, competitivo: Swords,
};

// ---------------------------------------------------------------------------
// Source evidence chips for PESTEC
// ---------------------------------------------------------------------------

const SOURCE_CHIPS = [
  "Informe sectorial",
  "Reporte de gobierno",
  "Analisis propio",
  "Fuente internacional",
  "Prensa especializada",
  "Consultoria externa",
  "Base de datos estadistica",
  "No tenemos evidencia",
];

// ---------------------------------------------------------------------------
// Hallazgo generation (deterministic, no AI)
// ---------------------------------------------------------------------------

function generarHallazgo(
  nombre: string,
  tipo: "O" | "A",
  calificacion: 1 | 2 | 3 | 4,
  peso: number,
): string {
  const tipoTexto = tipo === "O" ? "oportunidad" : "amenaza";
  const respuestas: Record<number, string> = {
    1: "La organizacion responde de manera deficiente a este factor, sin aprovechar su potencial o sin capacidad de defensa efectiva.",
    2: "La organizacion responde por debajo del promedio sectorial, con capacidad limitada de adaptacion.",
    3: "La organizacion responde por encima del promedio sectorial, con capacidad moderada de aprovechamiento.",
    4: "La organizacion responde de manera superior, explotando al maximo este factor como ventaja competitiva.",
  };
  const pp = (peso * calificacion).toFixed(2);
  return `${nombre} representa una ${tipoTexto} para el sector. ${respuestas[calificacion]} Calificacion MEFE: ${calificacion} · Peso: ${peso.toFixed(2)} · Puntaje ponderado: ${pp}`;
}

function generarHallazgoCorto(nombre: string, tipo: "O" | "A", calificacion: number): string {
  const tipoTexto = tipo === "O" ? "oportunidad" : "amenaza";
  return `${nombre} — ${tipoTexto} con calificacion ${calificacion}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PestecFactor {
  id: string;
  variable: string;
  description: string;
  subVarType: string;
  subVarId?: string | null;
  type: string;
  impact: number;
  probability: number;
  rating: number;
  hallazgo?: string | null;
  evidenceChips: string;
  evidenceNotes?: string | null;
  confirmed: boolean;
  includeInMefe: boolean;
  trend?: string | null;
  source?: string | null;
}

// ---------------------------------------------------------------------------
// Factor Evaluation Card (Step 2)
// ---------------------------------------------------------------------------

function FactorCard({
  factor,
  varData,
  expanded,
  onToggle,
  onCollapse,
  onUpdate,
  onDelete,
}: {
  factor: PestecFactor;
  varData: PestecVariableData;
  expanded: boolean;
  onToggle: () => void;
  onCollapse: () => void;
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [tipo, setTipo] = useState<"O" | "A">(factor.type as "O" | "A");
  const [rating, setRating] = useState<0 | 1 | 2 | 3 | 4>((factor.rating || 0) as 0 | 1 | 2 | 3 | 4);
  const [sliderVal, setSliderVal] = useState(factor.confirmed ? factor.impact : 5);
  const [chips, setChips] = useState<string[]>(() => {
    try { return JSON.parse(factor.evidenceChips); } catch { return []; }
  });
  const [notes, setNotes] = useState(factor.evidenceNotes || "");
  const [includeInMefe, setIncludeInMefe] = useState(factor.includeInMefe);

  // Re-sync local state when server data changes
  useEffect(() => {
    setTipo(factor.type as "O" | "A");
    setRating((factor.rating || 0) as 0 | 1 | 2 | 3 | 4);
    setSliderVal(factor.confirmed ? factor.impact : 5);
    try { setChips(JSON.parse(factor.evidenceChips)); } catch { setChips([]); }
    setNotes(factor.evidenceNotes || "");
    setIncludeInMefe(factor.includeInMefe);
  }, [factor.type, factor.rating, factor.impact, factor.evidenceChips, factor.evidenceNotes, factor.includeInMefe, factor.confirmed]);

  const isConfirmed = factor.confirmed;
  const hasNoSource = chips.includes("No tenemos evidencia");

  // Peso from slider (slider 1-20 → peso 0.01-0.20)
  const pesoBase = sliderVal / 100;
  const peso = hasNoSource ? Math.max(0.01, pesoBase - 0.01) : pesoBase;
  const puntajePonderado = rating > 0 ? peso * rating : 0;

  // Border color
  let borderColor = "var(--color-border-tertiary)";
  if (isConfirmed) {
    borderColor = tipo === "O" ? "#1e7f4f" : "#b3261e";
  }

  function handleToggleChip(chip: string) {
    if (chip === "No tenemos evidencia") {
      setChips(chips.includes(chip) ? [] : [chip]);
      setNotes("");
      return;
    }
    const without = chips.filter((c) => c !== "No tenemos evidencia");
    setChips(without.includes(chip) ? without.filter((c) => c !== chip) : [...without, chip]);
  }

  function handleConfirm() {
    if (!rating || !tipo) return;
    const hallazgo = generarHallazgo(factor.description, tipo, rating as 1 | 2 | 3 | 4, peso);
    onUpdate({
      type: tipo,
      rating,
      impact: sliderVal,
      hallazgo,
      evidenceChips: JSON.stringify(chips),
      evidenceNotes: notes || null,
      confirmed: true,
      includeInMefe,
    });
    toast.success(`"${factor.description}" confirmado`);
    onCollapse();
  }

  // Badge class label
  const claseLabel = `${factor.subVarType === "primaria" ? "Primaria" : factor.subVarType === "secundaria" ? "Secundaria" : "Personalizada"} · ${varData.nombre}`;

  return (
    <div className="rounded-xl border transition-all duration-200"
      style={{ borderLeftWidth: "3px", borderLeftColor: borderColor }}
    >
      {/* Header */}
      <button type="button" onClick={onToggle}
        className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-muted/30 cursor-pointer"
      >
        <ChevronDown
          className={`size-4 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          style={{ color: varData.color }}
        />
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium block">{factor.description}</span>
          {isConfirmed && factor.hallazgo ? (
            <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
              {generarHallazgoCorto(factor.description, factor.type as "O" | "A", factor.rating)}
            </span>
          ) : (
            <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>{claseLabel}</span>
          )}
        </div>
        {factor.subVarType === "personalizada" && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: "transparent", color: "#8B1510", borderColor: "#8B1510" }}
          >
            Personalizada
          </span>
        )}
        {isConfirmed ? (
          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
            style={{
              borderColor: OA_CONFIG[tipo].border,
              backgroundColor: OA_CONFIG[tipo].bg,
              color: OA_CONFIG[tipo].text,
            }}
          >
            <Pencil className="size-3 opacity-0 group-hover:opacity-100" />
            {OA_CONFIG[tipo].label} ({rating})
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
            style={{ borderColor: "var(--color-border-tertiary)", color: "var(--color-text-tertiary)" }}
          >
            Sin evaluar
          </span>
        )}
      </button>

      {/* Expanded evaluation */}
      {expanded && (
        <div className="border-t px-5 pb-5 pt-4 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">

          {/* ZONA 1 — Tipo O/A */}
          <div className="space-y-2">
            <label className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Tipo de factor
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["O", "A"] as const).map((t) => {
                const cfg = OA_CONFIG[t];
                const selected = tipo === t;
                return (
                  <button key={t} type="button" onClick={() => setTipo(t)}
                    className="flex flex-col items-center gap-1 rounded-xl border-[1.5px] p-3 text-center transition-all cursor-pointer"
                    style={{
                      borderColor: selected ? cfg.border : "var(--color-border-tertiary)",
                      backgroundColor: selected ? cfg.bg : "transparent",
                    }}
                  >
                    <span className="text-[13px] font-medium" style={{ color: selected ? cfg.text : "var(--color-text-secondary)" }}>
                      {cfg.label}
                    </span>
                    <span className="text-[11px]" style={{ color: selected ? cfg.text : "var(--color-text-tertiary)" }}>
                      {t === "O" ? "El factor favorece a la organizacion o al sector" : "El factor representa un riesgo o desventaja"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ZONA 2 — Calificacion + Peso */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Calificacion */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Calificacion — ¿Como responde tu organizacion?
              </label>
              <div className="grid grid-cols-4 gap-2">
                {([1, 2, 3, 4] as const).map((r) => {
                  const selected = rating === r;
                  const labels = ["", "Deficiente", "Por debajo", "Por encima", "Superior"];
                  return (
                    <button key={r} type="button" onClick={() => setRating(r)}
                      className="flex flex-col items-center gap-0.5 rounded-xl border-[1.5px] py-2.5 px-1 text-center transition-all cursor-pointer"
                      style={{
                        borderColor: selected ? varData.color : "var(--color-border-tertiary)",
                        backgroundColor: selected ? `${varData.color}15` : "transparent",
                      }}
                    >
                      <span className="text-lg font-medium" style={{ color: selected ? varData.color : "var(--color-text-secondary)" }}>
                        {r}
                      </span>
                      <span className="text-[10px] leading-tight" style={{ color: selected ? varData.color : "var(--color-text-tertiary)" }}>
                        {labels[r]}
                      </span>
                    </button>
                  );
                })}
              </div>
              {rating > 0 && (
                <p className="text-[11px]" style={{ color: varData.color }}>
                  {MEFE_RESPONSE_LABELS[rating as 1 | 2 | 3 | 4].description}
                </p>
              )}
            </div>

            {/* Peso (slider) */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Peso relativo — Importancia para el sector
              </label>
              <input
                type="range"
                min={1} max={20} step={1}
                value={sliderVal}
                onChange={(e) => setSliderVal(parseInt(e.target.value, 10))}
                className="w-full accent-current"
                style={{ accentColor: varData.color }}
              />
              <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                <span>Peso: {peso.toFixed(2)}</span>
                {rating > 0 && (
                  <span className="font-medium" style={{ color: varData.color }}>
                    Puntaje ponderado: {puntajePonderado.toFixed(2)}
                  </span>
                )}
              </div>
              {hasNoSource && (
                <p className="text-[10px]" style={{ color: "#b45309" }}>
                  Peso ajustado por falta de fuente (-0.01)
                </p>
              )}
            </div>
          </div>

          {/* ZONA 3 — Hallazgo automatico */}
          {tipo && rating > 0 && (
            <div
              className="rounded-lg border p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
              style={{
                borderColor: OA_CONFIG[tipo].border,
                backgroundColor: OA_CONFIG[tipo].bg,
              }}
            >
              <p className="text-[10px] font-medium uppercase tracking-widest mb-2"
                style={{ color: OA_CONFIG[tipo].text }}
              >
                Hallazgo generado automaticamente
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: OA_CONFIG[tipo].text }}>
                {generarHallazgo(factor.description, tipo, rating as 1 | 2 | 3 | 4, peso)}
              </p>
            </div>
          )}

          {/* MEFE inclusion toggle */}
          {tipo && rating > 0 && (
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--color-border-tertiary)" }}
            >
              <TrendingUp className="size-4" style={{ color: "#8B1510" }} />
              <span className="flex-1 text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Incluir en MEFE
              </span>
              <button type="button" onClick={() => setIncludeInMefe(!includeInMefe)}
                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer"
                style={{ backgroundColor: includeInMefe ? "#8B1510" : "var(--color-border-tertiary, rgba(139, 21, 16,0.14))" }}
              >
                <span className="inline-block size-3.5 rounded-full bg-white transition-transform"
                  style={{ transform: includeInMefe ? "translateX(17px)" : "translateX(3px)" }}
                />
              </button>
            </div>
          )}

          {/* ZONA 4 — Fuentes */}
          {tipo && rating > 0 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Fuente de referencia
              </label>
              <div className="flex flex-wrap gap-2">
                {SOURCE_CHIPS.map((chip) => {
                  const active = chips.includes(chip);
                  return (
                    <button key={chip} type="button" onClick={() => handleToggleChip(chip)}
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] transition-all cursor-pointer"
                      style={{
                        borderColor: active ? varData.color : "var(--color-border-tertiary)",
                        backgroundColor: active ? `${varData.color}15` : "transparent",
                        color: active ? varData.color : "var(--color-text-secondary)",
                      }}
                    >
                      {active && <Check className="size-3" />}
                      {chip}
                    </button>
                  );
                })}
              </div>

              {!hasNoSource && (
                <Textarea
                  placeholder="Describe la fuente o contexto adicional... (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[50px] resize-y text-[13px]"
                />
              )}
            </div>
          )}

          {/* ZONA 5 — Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button type="button" disabled={!rating || !tipo} onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium text-white transition-all disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: "#8B1510" }}
            >
              <Check className="size-3.5" />
              {isConfirmed ? "Actualizar factor" : "Confirmar factor"}
            </button>
            <button type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-[13px] font-medium transition-all cursor-pointer"
              style={{ borderColor: varData.color, color: varData.color }}
              onClick={() => toast.info("La asistencia de IA estara disponible proximamente.")}
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full opacity-75" style={{ backgroundColor: varData.color }} />
                <span className="relative inline-flex size-2 rounded-full" style={{ backgroundColor: varData.color }} />
              </span>
              <Sparkles className="size-3.5" />
              Consultar IA
            </button>
            <button type="button"
              onClick={() => {
                setTipo(factor.type as "O" | "A");
                setRating(0);
                setSliderVal(5);
                setChips([]);
                setNotes("");
                setIncludeInMefe(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-[13px] font-medium cursor-pointer"
              style={{ borderColor: "var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}
            >
              Limpiar
            </button>
            <button type="button" onClick={onCollapse}
              className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-[13px] font-medium cursor-pointer"
              style={{ borderColor: "var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}
            >
              Cancelar
            </button>
            <button type="button" onClick={onDelete}
              className="ml-auto rounded-lg p-2 transition-colors hover:bg-muted cursor-pointer"
            >
              <Trash2 className="size-3.5 text-destructive" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Environment Findings Panel (like AreaFindingsPanel in AMOFHIT)
// ---------------------------------------------------------------------------

function EnvironmentFindingsPanel({
  oportunidades,
  amenazas,
  confirmedCount,
  totalCount,
  areaColor,
  variableNombre,
}: {
  oportunidades: PestecFactor[];
  amenazas: PestecFactor[];
  confirmedCount: number;
  totalCount: number;
  areaColor: string;
  variableNombre: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border" style={{ borderColor: "var(--color-border-tertiary)" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 p-4 text-left cursor-pointer"
      >
        <Globe className="size-4" style={{ color: areaColor }} />
        <span className="flex-1 text-[14px] font-medium">Hallazgos del entorno — {variableNombre}</span>
        <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
          {oportunidades.length} oportunidad{oportunidades.length !== 1 ? "es" : ""} · {amenazas.length} amenaza{amenazas.length !== 1 ? "s" : ""} · {confirmedCount} evaluados de {totalCount}
        </span>
        <ChevronDown
          className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--color-text-tertiary)" }}
        />
      </button>

      {open && (
        <div className="border-t px-4 pb-4 pt-3">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Oportunidades */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: "#8B1510" }} />
                <span className="text-[13px] font-medium" style={{ color: "#185fa5" }}>
                  Oportunidades ({oportunidades.length})
                </span>
              </div>
              {oportunidades.length === 0 ? (
                <p className="text-[12px] text-muted-foreground p-3 border border-dashed rounded-lg text-center">
                  Sin oportunidades confirmadas
                </p>
              ) : (
                oportunidades.map((f) => {
                  const hasEvidence = (() => {
                    try {
                      const chips = JSON.parse(f.evidenceChips);
                      return chips.length > 0 && !chips.includes("No tenemos evidencia");
                    } catch { return false; }
                  })();
                  return (
                    <div key={f.id} className="flex items-start gap-2 rounded-lg p-2 text-[12px]"
                      style={{ backgroundColor: "transparent" }}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-medium text-white"
                        style={{ backgroundColor: "#8B1510" }}
                      >
                        {f.rating}
                      </span>
                      <span className="flex-1 leading-snug" style={{ color: "#185fa5" }}>
                        {f.description}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        {f.includeInMefe && <TrendingUp className="size-3" style={{ color: "#8B1510" }} />}
                        {hasEvidence && <Paperclip className="size-3" style={{ color: "var(--color-text-tertiary)" }} />}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Amenazas */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: "transparent" }} />
                <span className="text-[13px] font-medium" style={{ color: "#b3261e" }}>
                  Amenazas ({amenazas.length})
                </span>
              </div>
              {amenazas.length === 0 ? (
                <p className="text-[12px] text-muted-foreground p-3 border border-dashed rounded-lg text-center">
                  Sin amenazas confirmadas
                </p>
              ) : (
                amenazas.map((f) => {
                  const hasEvidence = (() => {
                    try {
                      const chips = JSON.parse(f.evidenceChips);
                      return chips.length > 0 && !chips.includes("No tenemos evidencia");
                    } catch { return false; }
                  })();
                  return (
                    <div key={f.id} className="flex items-start gap-2 rounded-lg p-2 text-[12px]"
                      style={{ backgroundColor: "transparent" }}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-medium text-white"
                        style={{ backgroundColor: "transparent" }}
                      >
                        {f.rating}
                      </span>
                      <span className="flex-1 leading-snug" style={{ color: "#b3261e" }}>
                        {f.description}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        {f.includeInMefe && <TrendingUp className="size-3" style={{ color: "#8B1510" }} />}
                        {hasEvidence && <Paperclip className="size-3" style={{ color: "var(--color-text-tertiary)" }} />}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variable Tab Content
// ---------------------------------------------------------------------------

function VariableTabContent({
  variableKey,
  cycleId,
}: {
  variableKey: string;
  cycleId: string;
}) {
  const utils = trpc.useUtils();
  const varData = PESTEC_VARIABLES.find((v) => v.key === variableKey);

  // All hooks MUST be called before any early return
  const { data: serverFactors = [] } = trpc.pestec.byVariable.useQuery({
    cycleId, variable: variableKey,
  }) as { data: PestecFactor[] };

  const [factors, setFactors] = useState<PestecFactor[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [customVar, setCustomVar] = useState("");
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null);

  const toggleMutation = trpc.pestec.toggle.useMutation({
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.pestec.update.useMutation({
    onSuccess: () => {
      utils.pestec.byVariable.invalidate({ cycleId, variable: variableKey });
      utils.pestec.list.invalidate({ cycleId });
      // Auto-sync side effect created/updated a MefeFactor: refresh MEFE views too.
      utils.mefe.list.invalidate({ cycleId });
      utils.mefe.getSummary.invalidate({ cycleId });
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.pestec.delete.useMutation({
    onSuccess: () => {
      utils.pestec.byVariable.invalidate({ cycleId, variable: variableKey });
      utils.pestec.list.invalidate({ cycleId });
      utils.mefe.list.invalidate({ cycleId });
      utils.mefe.getSummary.invalidate({ cycleId });
    },
    onError: (err) => toast.error(err.message),
  });

  // Initialize local state from server
  useEffect(() => {
    if (serverFactors.length > 0 || !initialized) {
      setFactors(serverFactors);
      setInitialized(true);
    }
  }, [serverFactors]); // eslint-disable-line react-hooks/exhaustive-deps

  // Early return AFTER all hooks
  if (!varData) return null;

  const selectedDescriptions = new Set(factors.map((f) => f.description));
  const primarias = varData.subVariables.filter((v) => v.clase === "primaria");
  const secundarias = varData.subVariables.filter((v) => v.clase === "secundaria");
  const customFactors = factors.filter((f) => f.subVarType === "personalizada");

  const confirmedFactors = factors.filter((f) => f.confirmed);
  const oportunidades = confirmedFactors.filter((f) => f.type === "O");
  const amenazas = confirmedFactors.filter((f) => f.type === "A");

  async function handleToggle(nombre: string, clase: "primaria" | "secundaria", checked: boolean) {
    if (checked) {
      // Call server, get the created factor, add to local state
      try {
        const result = await toggleMutation.mutateAsync({
          cycleId, variable: variableKey,
          description: nombre, subVarType: clase,
          enabled: true,
        });
        if (result) {
          setFactors((prev) => [...prev, result as unknown as PestecFactor]);
        }
      } catch (err: any) {
        toast.error(err?.message || "Error al seleccionar variable");
      }
    } else {
      // Remove from local state immediately, then call server
      setFactors((prev) => prev.filter((f) => f.description !== nombre));
      try {
        await toggleMutation.mutateAsync({
          cycleId, variable: variableKey,
          description: nombre, subVarType: clase,
          enabled: false,
        });
      } catch {
        // Revert on error — refetch from server
        utils.pestec.byVariable.invalidate({ cycleId, variable: variableKey });
      }
    }
    utils.pestec.list.invalidate({ cycleId });
  }

  function handleAddCustom() {
    const trimmed = customVar.trim();
    if (trimmed.length < 3) { toast.error("Minimo 3 caracteres"); return; }
    if (trimmed.length > 80) { toast.error("Maximo 80 caracteres"); return; }
    if (selectedDescriptions.has(trimmed)) { toast.error("Ya existe esta variable"); return; }
    toggleMutation.mutate({
      cycleId, variable: variableKey,
      description: trimmed,
      subVarType: "personalizada",
      enabled: true,
    });
    setCustomVar("");
  }

  return (
    <div className="space-y-6">
      {/* ── STEP 1: Select variables ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-lg text-[10px] font-medium text-white"
            style={{ backgroundColor: varData.color }}
          >
            1
          </span>
          <div className="flex-1">
            <h3 className="text-[14px] font-medium">
              Selecciona las variables relevantes — {varData.nombre}
            </h3>
            <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
              Marca solo las que tienen impacto real en tu organizacion o sector. No tienes que marcarlas todas.
            </p>
          </div>
          {/* AI suggestion button */}
          <button type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all cursor-pointer"
            style={{ borderColor: varData.color, color: varData.color }}
            onClick={() => toast.info("La sugerencia de IA estara disponible proximamente.")}
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full opacity-75" style={{ backgroundColor: varData.color }} />
              <span className="relative inline-flex size-2 rounded-full" style={{ backgroundColor: varData.color }} />
            </span>
            <Sparkles className="size-3" />
            Sugerir con IA
          </button>
        </div>

        {/* Primarias */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-medium uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
            Variables primarias
          </h4>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {primarias.map((sv) => {
              const isSelected = selectedDescriptions.has(sv.nombre);
              return (
                <label key={sv.id}
                  className="flex items-center gap-2.5 rounded-lg p-2.5 text-[13px] cursor-pointer transition-all"
                  style={{
                    border: `1px solid ${isSelected ? varData.color : "var(--color-border-tertiary)"}`,
                    backgroundColor: "transparent",
                    boxShadow: isSelected ? `0 0 0 1px ${varData.color}` : "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleToggle(sv.nombre, "primaria", e.target.checked)}
                    className="size-4 rounded cursor-pointer accent-[var(--color-primary)]"
                  />
                  <span style={{ color: isSelected ? varData.color : "var(--color-text-primary)" }}>
                    {sv.nombre}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Secundarias */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-medium uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
            Variables secundarias
          </h4>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {secundarias.map((sv) => {
              const isSelected = selectedDescriptions.has(sv.nombre);
              return (
                <label key={sv.id}
                  className="flex items-center gap-2.5 rounded-lg p-2.5 text-[13px] cursor-pointer transition-all"
                  style={{
                    border: `1px solid ${isSelected ? varData.color : "var(--color-border-tertiary)"}`,
                    backgroundColor: "transparent",
                    boxShadow: isSelected ? `0 0 0 1px ${varData.color}` : "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleToggle(sv.nombre, "secundaria", e.target.checked)}
                    className="size-4 rounded cursor-pointer accent-[var(--color-primary)]"
                  />
                  <span style={{ color: isSelected ? varData.color : "var(--color-text-primary)" }}>
                    {sv.nombre}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Custom variables */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-medium uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
            Variables personalizadas
          </h4>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Ej: Ley de promocion agraria, Reforma tributaria 2025..."
              value={customVar}
              onChange={(e) => setCustomVar(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddCustom(); }}
              className="text-[13px]"
              maxLength={80}
            />
            <Button size="sm" onClick={handleAddCustom} disabled={customVar.trim().length < 3}>
              <Plus className="size-3.5" /> Agregar
            </Button>
          </div>
          <p className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
            Agrega variables especificas de tu sector que no estan en la lista
          </p>
          {customFactors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {customFactors.map((f) => (
                <span key={f.id}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium"
                  style={{ backgroundColor: "transparent", borderColor: "#8B1510", color: "#8B1510" }}
                >
                  {f.description}
                  <button type="button" onClick={() => deleteMutation.mutate({ id: f.id })} className="cursor-pointer">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {factors.length > 0 && <Separator />}

      {/* ── STEP 2: Evaluate selected factors ── */}
      {factors.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg text-[10px] font-medium text-white"
              style={{ backgroundColor: varData.color }}
            >
              2
            </span>
            <div>
              <h3 className="text-[14px] font-medium">
                Evalua cada variable seleccionada ({factors.length})
              </h3>
              <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
                Para cada variable: define si es oportunidad o amenaza, asigna el peso y la calificacion. El hallazgo se genera automaticamente.
              </p>
            </div>
          </div>

          {/* Methodological note */}
          <div className="flex items-start gap-2 rounded-lg border p-3"
            style={{ borderColor: "#b45309", backgroundColor: "transparent" }}
          >
            <AlertTriangle className="size-4 shrink-0 mt-0.5" style={{ color: "#b45309" }} />
            <p className="text-[12px]" style={{ color: "#b45309" }}>
              <strong>La calificacion (1–4) refleja como responde tu organizacion al factor externo</strong>, no que tan intenso es el factor.
              4 = respuesta superior, 1 = respuesta deficiente.
            </p>
          </div>

          {/* Factor cards */}
          <div className="space-y-2">
            {factors.map((factor) => (
              <FactorCard
                key={factor.id}
                factor={factor}
                varData={varData}
                expanded={expandedFactor === factor.id}
                onToggle={() => setExpandedFactor(expandedFactor === factor.id ? null : factor.id)}
                onCollapse={() => setExpandedFactor(null)}
                onUpdate={(data) => updateMutation.mutate({ id: factor.id, ...data } as any)}
                onDelete={() => deleteMutation.mutate({ id: factor.id })}
              />
            ))}
          </div>

          {/* Hallazgos del entorno — collapsible panel */}
          {confirmedFactors.length >= 1 && (
            <EnvironmentFindingsPanel
              oportunidades={oportunidades}
              amenazas={amenazas}
              confirmedCount={confirmedFactors.length}
              totalCount={factors.length}
              areaColor={varData.color}
              variableNombre={varData.nombre}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PestecPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const [activeTab, setActiveTab] = useState("politico");

  // Fetch counts for tab badges
  const allQueries = PESTEC_VARIABLES.map((v) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    trpc.pestec.byVariable.useQuery({ cycleId, variable: v.key }),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      {/* Hero */}
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "transparent" }}>
          <Globe className="size-6" style={{ color: "#8B1510" }} />
        </div>
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Análisis PESTEC</h1>
          <p className="text-sm text-muted-foreground">
            Evaluacion del macroentorno — 6 variables de D&apos;Alessio
          </p>
        </div>
      </div>

      {/* Tab navigation with counts */}
      <div className="flex flex-wrap gap-2">
        {PESTEC_VARIABLES.map((v, idx) => {
          const Icon = VAR_ICONS[v.key] ?? Globe;
          const isActive = activeTab === v.key;
          const count = allQueries[idx]?.data?.length ?? 0;
          return (
            <button key={v.key} type="button" onClick={() => setActiveTab(v.key)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium transition-all cursor-pointer"
              style={{
                border: `1px solid ${isActive ? v.color : "var(--color-border-tertiary)"}`,
                backgroundColor: "transparent",
                boxShadow: isActive ? `0 0 0 1px ${v.color}` : "none",
                color: isActive ? v.color : "var(--color-text-secondary)",
              }}
            >
              <span className="flex size-6 items-center justify-center rounded-lg text-[10px] font-medium text-white"
                style={{ backgroundColor: v.color }}
              >
                {v.letra}
              </span>
              {v.nombre}
              {count > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full text-[10px] font-medium text-white"
                  style={{ backgroundColor: v.color }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Gradient separator */}
      {(() => {
        const v = PESTEC_VARIABLES.find((vr) => vr.key === activeTab);
        if (!v) return null;
        return <div className="h-px w-full" style={{ background: `linear-gradient(to right, ${v.color}99, transparent)` }} />;
      })()}

      {/* Tab content */}
      <VariableTabContent variableKey={activeTab} cycleId={cycleId} />
    </div>
  );
}
