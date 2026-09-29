"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import {
  COMPETITIVE_CRITERIA,
  getInterpretacion,
  getFceForValue,
  getNivelColor,
  type CriterioDef,
} from "@/lib/competitive-analysis-data";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  BarChart3,
  Save,
  Target,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Scroll reveal hook
// ---------------------------------------------------------------------------

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ---------------------------------------------------------------------------
// Criterion Slider Card
// ---------------------------------------------------------------------------

// Percentage pills for comp-1
const GROWTH_PILLS = [
  { valor: -5, label: "-5% declive" },
  { valor: 0, label: "0% estancado" },
  { valor: 6, label: "6% moderado" },
  { valor: 15, label: "15% alto" },
  { valor: 30, label: "30%+ explosivo" },
];

function CriterionCard({
  criterio,
  value,
  onChange,
  index,
}: {
  criterio: CriterioDef;
  value: number;
  onChange: (val: number) => void;
  index: number;
}) {
  const { ref, visible } = useReveal();
  const interp = getInterpretacion(criterio, value);
  const color = getNivelColor(interp.nivel);
  const fce = getFceForValue(criterio, value);
  const isPercentage = criterio.id === "comp-1";

  // Adjusted weight calculation
  const adjustedWeight = fce
    ? Math.round(fce.pesoBase * (0.8 + ((value - criterio.min) / (criterio.max - criterio.min)) * 0.4) * 100) / 100
    : 0;

  return (
    <div
      ref={ref}
      className={`transform transition-all duration-500 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
      style={{ transitionDelay: `${index * 50}ms` }}
    >
      <div
        className="rounded-xl border p-5 space-y-4 transition-all duration-200"
        style={{
          borderColor: "var(--color-border-tertiary)",
          borderLeftWidth: "3px",
          borderLeftColor: color.border,
        }}
      >
        {/* 1. Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex size-6 items-center justify-center rounded-lg text-[10px] font-medium text-white"
                style={{ backgroundColor: "#7aa8e0" }}
              >
                {index + 1}
              </span>
              <span className="text-[13px] font-medium">{criterio.nombre}</span>
            </div>
            <p className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
              {criterio.impulsor}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-2xl font-medium block transition-colors duration-200" style={{ color: color.text }}>
              {isPercentage ? `${value}%` : value}
            </span>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors duration-200"
              style={{ backgroundColor: color.bg, color: color.text }}
            >
              {interp.label}
            </span>
          </div>
        </div>

        {/* 2. Control */}
        {isPercentage ? (
          <div className="space-y-3">
            {/* Percentage input */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={criterio.min} max={criterio.max} step={0.5}
                value={value}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v) && v >= criterio.min && v <= criterio.max) onChange(v);
                }}
                className="w-24 rounded-lg border bg-transparent px-3 py-2 text-[14px] font-medium text-right outline-none focus:border-[#185FA5]"
              />
              <span className="text-[14px] font-medium" style={{ color: "var(--color-text-secondary)" }}>%</span>
            </div>
            {/* Quick pills */}
            <div className="flex flex-wrap gap-1.5">
              {GROWTH_PILLS.map((p) => (
                <button key={p.valor} type="button" onClick={() => onChange(p.valor)}
                  className="rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer"
                  style={{
                    borderColor: value === p.valor ? "#7aa8e0" : "var(--color-border-tertiary)",
                    backgroundColor: value === p.valor ? "transparent" : "transparent",
                    color: value === p.valor ? "#7aa8e0" : "var(--color-text-secondary)",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {/* Extremes labels */}
            <div className="flex justify-between text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
              <span>{criterio.extremoIzquierdo}</span>
              <span>{criterio.extremoDerecho}</span>
            </div>
            {/* Slider */}
            <input
              type="range"
              min={criterio.min} max={criterio.max} step={criterio.step}
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: color.text }}
            />
            {/* Ticks 1-10 */}
            <div className="flex justify-between px-0.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((tick) => (
                <span key={tick}
                  className="text-[9px] w-4 text-center transition-all duration-150"
                  style={{
                    color: tick === value ? color.text : "var(--color-text-tertiary)",
                    fontWeight: tick === value ? 600 : 400,
                    transform: tick === value ? "scale(1.3)" : "scale(1)",
                  }}
                >
                  {tick}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 3. Implicancia chip */}
        <div
          className="rounded-lg px-3 py-2.5 text-[12px] leading-relaxed transition-all duration-300"
          style={{ backgroundColor: color.bg, color: color.text, borderLeft: `3px solid ${color.border}` }}
        >
          {interp.texto}
        </div>

        {/* 4. FCE generated or "no FCE" */}
        {fce ? (
          <div className="flex items-start gap-2 rounded-lg border px-3 py-2.5 animate-in fade-in duration-300"
            style={{ borderColor: "#7aa8e0", backgroundColor: "transparent" }}
          >
            <Target className="size-3.5 shrink-0 mt-0.5" style={{ color: "#7aa8e0" }} />
            <div>
              <span className="text-[12px] font-medium" style={{ color: "#9ec2ec" }}>
                FCE → {fce.nombre}
              </span>
              <span className="text-[11px] block" style={{ color: "#7aa8e0" }}>
                Peso sugerido: {adjustedWeight.toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
            Este criterio no genera FCE principal con el valor actual
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Questionnaire Panel
// ---------------------------------------------------------------------------

function QuestionnairePanel({
  title,
  description,
  criteria,
  values,
  onChange,
  onSave,
  saving,
}: {
  title: string;
  description: string;
  criteria: CriterioDef[];
  values: Record<string, number>;
  onChange: (criterioId: string, val: number) => void;
  onSave: () => void;
  saving: boolean;
}) {
  // Build FCE list with adjusted weights
  const fceList = criteria
    .map((c) => {
      const val = values[c.id] ?? c.defaultVal;
      const fce = getFceForValue(c, val);
      if (!fce) return null;
      const intensity = (val - c.min) / (c.max - c.min);
      const adjustedWeight = Math.round(fce.pesoBase * (0.8 + intensity * 0.4) * 100) / 100;
      return { criterioId: c.id, criterioNombre: c.nombre, valor: val, fce, adjustedWeight };
    })
    .filter(Boolean) as Array<{ criterioId: string; criterioNombre: string; valor: number; fce: { nombre: string; pesoBase: number }; adjustedWeight: number }>;
  const fceCount = fceList.length;

  // Total score and progress
  const totalScore = criteria.reduce((sum, c) => sum + (values[c.id] ?? c.defaultVal), 0);
  const maxScore = criteria.reduce((sum, c) => sum + c.max, 0);
  const progressPct = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  // Bar color based on percentage
  const barColor = progressPct < 40 ? "#fca5a5" : progressPct < 70 ? "#a78bfa" : "#34d399";
  const barLabel = progressPct < 40 ? "Bajo" : progressPct < 70 ? "Moderado" : "Alto";

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[14px] font-medium">{title}</h3>
        <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>{description}</p>
      </div>

      {/* Score + progress bar */}
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--color-border-tertiary)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="size-4" style={{ color: "#7aa8e0" }} />
              <span className="text-[13px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Puntaje total
              </span>
            </div>
            <span className="text-lg font-medium" style={{ color: barColor }}>
              {totalScore}
            </span>
            <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
              / {maxScore} ({progressPct.toFixed(0)}%)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: barColor + "20", color: barColor }}
            >
              {barLabel}
            </span>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5">
              <Target className="size-3.5" style={{ color: "#7aa8e0" }} />
              <span className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
                {fceCount} FCE
              </span>
            </div>
          </div>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "var(--color-border-tertiary, #e5e7eb)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%`, backgroundColor: barColor }}
          />
        </div>
      </div>

      {/* Criteria cards */}
      <div className="space-y-3">
        {criteria.map((criterio, i) => (
          <CriterionCard
            key={criterio.id}
            criterio={criterio}
            value={values[criterio.id] ?? criterio.defaultVal}
            onChange={(val) => onChange(criterio.id, val)}
            index={i}
          />
        ))}
      </div>

      {/* FCE Summary Panel */}
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "#7aa8e0", backgroundColor: "transparent" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="size-4" style={{ color: "#7aa8e0" }} />
            <span className="text-[13px] font-medium" style={{ color: "#9ec2ec" }}>
              Factores Clave de Exito generados
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px]" style={{ color: "#9ec2ec" }}>
            <span>{fceCount} FCE</span>
            <span>·</span>
            <span>{fceList.filter((f) => f.adjustedWeight >= 0.09).length} de alto peso</span>
            <span>·</span>
            <span>{fceList.filter((f) => f.adjustedWeight > 0 && f.adjustedWeight < 0.09).length} de peso medio</span>
          </div>
        </div>

        {fceCount > 0 ? (
          <div className="space-y-1.5">
            {fceList.map((item) => (
              <div key={item.criterioId}
                className="flex items-center gap-3 rounded-lg bg-white/60 px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-medium block" style={{ color: "#9ec2ec" }}>
                    {item.fce.nombre}
                  </span>
                  <span className="text-[10px]" style={{ color: "#7aa8e0" }}>
                    Desde: {item.criterioNombre} ({item.valor}) · Peso: {item.adjustedWeight.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: "#9ec2ec" }}>
            Mueve los sliders a valores extremos para generar FCE automaticamente.
          </p>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={onSave} disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium text-white cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: "#7aa8e0" }}
        >
          <Save className="size-3.5" />
          Guardar evaluacion
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CompetitiveAnalysisPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const utils = trpc.useUtils();

  // Competitive analysis data
  const { data: compRecord } = trpc.competitiveAnalysis.get.useQuery({ cycleId });
  const compUpsert = trpc.competitiveAnalysis.upsert.useMutation({
    onSuccess: () => { utils.competitiveAnalysis.get.invalidate({ cycleId }); toast.success("Analisis competitivo guardado"); },
  });

  // Local state
  const [compValues, setCompValues] = useState<Record<string, number>>({});

  // Sync from server
  const [synced, setSynced] = useState(false);
  if (!synced && compRecord) {
    if (compRecord.data) {
      const map: Record<string, number> = {};
      (compRecord.data as Array<{ id: number; value: number }>).forEach((d) => {
        const c = COMPETITIVE_CRITERIA[d.id - 1];
        if (c) map[c.id] = d.value;
      });
      if (Object.keys(map).length > 0) setCompValues(map);
    }
    setSynced(true);
  }

  function handleSaveCompetitive() {
    const data = COMPETITIVE_CRITERIA.map((c, i) => ({
      id: i + 1,
      label: c.nombre,
      value: compValues[c.id] ?? c.defaultVal,
    }));
    compUpsert.mutate({ cycleId, data });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      {/* Hero */}
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "transparent" }}>
          <BarChart3 className="size-6" style={{ color: "#7aa8e0" }} />
        </div>
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Analisis Competitivo</h1>
          <p className="text-sm text-muted-foreground">
            10 criterios que evaluan la estructura competitiva del sector y generan FCE para el MPC
          </p>
        </div>
      </div>

      <div className="h-px w-full" style={{ background: "linear-gradient(to right, #185FA599, transparent)" }} />

      <QuestionnairePanel
        title="Analisis competitivo de la industria"
        description="10 criterios que evaluan la estructura competitiva del sector. Los criterios con valores extremos generan FCE candidatos para el MPC."
        criteria={COMPETITIVE_CRITERIA}
        values={compValues}
        onChange={(id, val) => setCompValues((prev) => ({ ...prev, [id]: val }))}
        onSave={handleSaveCompetitive}
        saving={compUpsert.isPending}
      />
    </div>
  );
}
