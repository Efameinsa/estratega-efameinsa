"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import {
  ATTRACTIVENESS_FACTORS,
  getInterpretacion,
  getFceForValue,
  getNivelColor,
  type CriterioDef,
} from "@/lib/competitive-analysis-data";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  BarChart3,
  TrendingUp,
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
        {/* Header */}
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
              {value}
            </span>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors duration-200"
              style={{ backgroundColor: color.bg, color: color.text }}
            >
              {interp.label}
            </span>
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
            <span>{criterio.extremoIzquierdo}</span>
            <span>{criterio.extremoDerecho}</span>
          </div>
          <input
            type="range"
            min={criterio.min} max={criterio.max} step={criterio.step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: color.text }}
          />
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

        {/* Implicancia */}
        <div
          className="rounded-lg px-3 py-2.5 text-[12px] leading-relaxed transition-all duration-300"
          style={{ backgroundColor: color.bg, color: color.text, borderLeft: `3px solid ${color.border}` }}
        >
          {interp.texto}
        </div>

        {/* FCE */}
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
// Main Page
// ---------------------------------------------------------------------------

export default function IndustryAttractivenessPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const utils = trpc.useUtils();

  const { data: attrRecord } = trpc.industryAttractiveness.get.useQuery({ cycleId });
  const attrUpsert = trpc.industryAttractiveness.upsert.useMutation({
    onSuccess: () => { utils.industryAttractiveness.get.invalidate({ cycleId }); toast.success("Analisis de atractividad guardado"); },
  });

  const [attrValues, setAttrValues] = useState<Record<string, number>>({});

  const [synced, setSynced] = useState(false);
  if (!synced && attrRecord) {
    if (attrRecord.data) {
      const map: Record<string, number> = {};
      (attrRecord.data as Array<{ id: number; score: number }>).forEach((d) => {
        const f = ATTRACTIVENESS_FACTORS[d.id - 1];
        if (f) map[f.id] = d.score;
      });
      if (Object.keys(map).length > 0) setAttrValues(map);
    }
    setSynced(true);
  }

  function handleSave() {
    const data = ATTRACTIVENESS_FACTORS.map((f, i) => ({
      id: i + 1,
      factor: f.nombre,
      impulsor: f.impulsor,
      score: attrValues[f.id] ?? f.defaultVal,
    }));
    attrUpsert.mutate({ cycleId, data });
  }

  // Build FCE list
  const fceList = ATTRACTIVENESS_FACTORS
    .map((c) => {
      const val = attrValues[c.id] ?? c.defaultVal;
      const fce = getFceForValue(c, val);
      if (!fce) return null;
      const intensity = (val - c.min) / (c.max - c.min);
      const adjustedWeight = Math.round(fce.pesoBase * (0.8 + intensity * 0.4) * 100) / 100;
      return { criterioId: c.id, criterioNombre: c.nombre, valor: val, fce, adjustedWeight };
    })
    .filter(Boolean) as Array<{ criterioId: string; criterioNombre: string; valor: number; fce: { nombre: string; pesoBase: number }; adjustedWeight: number }>;
  const fceCount = fceList.length;

  // Score and progress
  const totalScore = ATTRACTIVENESS_FACTORS.reduce((sum, c) => sum + (attrValues[c.id] ?? c.defaultVal), 0);
  const maxScore = ATTRACTIVENESS_FACTORS.reduce((sum, c) => sum + c.max, 0);
  const progressPct = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const barColor = progressPct < 40 ? "#fca5a5" : progressPct < 70 ? "#a78bfa" : "#34d399";
  const barLabel = progressPct < 40 ? "Bajo" : progressPct < 70 ? "Moderado" : "Alto";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      {/* Hero */}
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "transparent" }}>
          <TrendingUp className="size-6" style={{ color: "#7aa8e0" }} />
        </div>
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Atractividad de la Industria</h1>
          <p className="text-sm text-muted-foreground">
            15 factores que miden que tan atractivo es el sector para competir
          </p>
        </div>
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
        {ATTRACTIVENESS_FACTORS.map((criterio, i) => (
          <CriterionCard
            key={criterio.id}
            criterio={criterio}
            value={attrValues[criterio.id] ?? criterio.defaultVal}
            onChange={(val) => setAttrValues((prev) => ({ ...prev, [criterio.id]: val }))}
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
        <button type="button" onClick={handleSave} disabled={attrUpsert.isPending}
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
