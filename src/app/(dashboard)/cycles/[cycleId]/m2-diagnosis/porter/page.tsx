"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import {
  PORTER_FORCES,
  getIntensidad,
  getAtractividad,
  getIntensidadColor,
  getValueColor,
  generarAnalisisFuerza,
  generarFactoresMEFE,
  type FuerzaDef,
  type MefeSuggestion,
} from "@/lib/porter-forces-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Swords,
  LogIn,
  Repeat,
  ShoppingCart,
  Truck,
  Shield,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Info,
  Save,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const FORCE_ICONS: Record<string, React.ElementType> = {
  rivalidad: Swords, entrantes: LogIn, sustitutos: Repeat,
  compradores: ShoppingCart, proveedores: Truck,
};

const FORCE_STYLES: Record<string, {
  color: string; bg: string; border: string; badgeBg: string; colorHex: string;
}> = {
  rivalidad:   { color: "text-rose-400 dark:text-rose-400",   bg: "bg-transparent0/10",   border: "border-rose-500/20 hover:border-rose-500/40",   badgeBg: "bg-transparent0",   colorHex: "#E11D48" },
  entrantes:   { color: "text-amber-400 dark:text-amber-400", bg: "bg-transparent0/10",  border: "border-amber-500/20 hover:border-amber-500/40", badgeBg: "bg-transparent0",  colorHex: "#fbbf24" },
  sustitutos:  { color: "text-purple-400 dark:text-purple-400", bg: "bg-transparent0/10", border: "border-purple-500/20 hover:border-purple-500/40", badgeBg: "bg-transparent0", colorHex: "#a78bfa" },
  compradores: { color: "text-primary dark:text-primary",   bg: "bg-primary/100/10",   border: "border-primary/150/20 hover:border-primary/150/40",   badgeBg: "bg-primary/100",   colorHex: "#a78bfa" },
  proveedores: { color: "text-teal-400 dark:text-teal-400",   bg: "bg-transparent0/10",   border: "border-teal-500/20 hover:border-teal-500/40",   badgeBg: "bg-transparent0",   colorHex: "#22d3ee" },
};

// ---------------------------------------------------------------------------
// Scroll reveal hook (same as AMOFHIT)
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
// Types
// ---------------------------------------------------------------------------

interface PorterData {
  forces: Record<string, {
    values: Record<string, number>;
    saved: boolean;
  }>;
}

function getAvg(fuerza: FuerzaDef, values: Record<string, number>): number {
  const vals = fuerza.subfactores.map((sf) => values[sf.id] ?? 3);
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

// ---------------------------------------------------------------------------
// Force Header Card (top bar)
// ---------------------------------------------------------------------------

function ForceCard({
  fuerza,
  index,
  values,
  saved,
  isActive,
  onClick,
}: {
  fuerza: FuerzaDef;
  index: number;
  values: Record<string, number>;
  saved: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  const { ref, visible } = useReveal();
  const Icon = FORCE_ICONS[fuerza.id] ?? Shield;
  const style = FORCE_STYLES[fuerza.id];
  const avg = getAvg(fuerza, values);
  const intensidad = getIntensidad(avg);
  const intColor = getIntensidadColor(avg);
  const hasValues = Object.keys(values).length > 0;
  const subfactorCount = fuerza.subfactores.length;
  const evaluatedCount = hasValues ? Object.keys(values).length : 0;
  const progressPct = subfactorCount > 0 ? Math.round((evaluatedCount / subfactorCount) * 100) : 0;

  return (
    <div
      ref={ref}
      className={`transform transition-all duration-500 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
      style={{ transitionDelay: `${index * 75}ms` }}
    >
      <button
        type="button"
        onClick={onClick}
        className={`group block w-full rounded-2xl border p-5 text-left shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${style.border} ${
          isActive
            ? "ring-2 ring-primary/30 ring-offset-2 bg-card shadow-md"
            : "bg-card"
        }`}
      >
        <div className="flex items-start justify-between">
          <div className={`inline-flex items-center justify-center rounded-xl ${style.bg} p-2.5`}>
            <Icon className={`size-5 ${style.color}`} />
          </div>
          {hasValues && (
            <div className="text-right">
              <span className="text-lg font-medium block" style={{ color: intColor.text }}>{avg.toFixed(1)}</span>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: intColor.bg, color: intColor.text }}
              >
                {intensidad}
              </span>
            </div>
          )}
        </div>
        <h3 className="mt-3 text-sm font-medium">{fuerza.nombreCorto}</h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">{fuerza.descripcion}</p>

        {/* Mini progress */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {evaluatedCount}/{subfactorCount} subfactores
            </span>
            {saved && (
              <span className="text-[11px] font-medium text-green-400 dark:text-green-400">
                Guardada
              </span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, backgroundColor: style.colorHex }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1 text-xs font-medium transition-colors group-hover:text-primary">
          {isActive ? (
            <><ChevronUp className="size-3.5" /> Cerrar</>
          ) : (
            <><ChevronDown className="size-3.5" /> Evaluar</>
          )}
        </div>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subfactor Slider Row
// ---------------------------------------------------------------------------

function SubfactorRow({
  subfactor,
  value,
  onChange,
}: {
  subfactor: FuerzaDef["subfactores"][0];
  value: number;
  onChange: (val: number) => void;
}) {
  const color = getValueColor(value);
  const implicancia = subfactor.implicancias[value as 1 | 2 | 3 | 4 | 5];

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--color-border-tertiary)" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium block">{subfactor.nombre}</span>
          <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>{subfactor.descripcion}</span>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xl font-medium block" style={{ color: color.text }}>{value}</span>
          <span className="text-[10px] font-medium" style={{ color: color.text }}>
            {value <= 2 ? "Favorable" : value === 3 ? "Moderada" : "Presion alta"}
          </span>
        </div>
      </div>

      {/* Slider */}
      <div className="space-y-1">
        <input
          type="range"
          min={1} max={5} step={1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="w-full"
          style={{ accentColor: color.text }}
        />
        <div className="flex justify-between text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
          <span>{subfactor.extremoIzquierdo}</span>
          <span>{subfactor.extremoDerecho}</span>
        </div>
      </div>

      {/* Implicancia chip */}
      <div className="rounded-lg px-3 py-2 text-[12px]" style={{ backgroundColor: color.bg, color: color.text }}>
        {implicancia}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Force Evaluation Panel
// ---------------------------------------------------------------------------

function ForcePanel({
  fuerza,
  values,
  onChangeValue,
  onSave,
  saving,
  cycleId,
  acceptedFactors,
  rejectedFactors,
  onAcceptFactor,
  onRejectFactor,
  onReactivateFactor,
}: {
  fuerza: FuerzaDef;
  values: Record<string, number>;
  onChangeValue: (subfactorId: string, val: number) => void;
  onSave: () => void;
  saving: boolean;
  cycleId: string;
  acceptedFactors: Set<string>;
  rejectedFactors: Set<string>;
  onAcceptFactor: (suggestion: MefeSuggestion) => void;
  onRejectFactor: (subfactorId: string) => void;
  onReactivateFactor: (subfactorId: string) => void;
}) {
  const avg = getAvg(fuerza, values);
  const intensidad = getIntensidad(avg);
  const atractividad = getAtractividad(avg);
  const color = getIntensidadColor(avg);
  const analisis = generarAnalisisFuerza(fuerza, values);
  const mefeSuggestions = generarFactoresMEFE(fuerza, values);

  return (
    <div className="space-y-5">
      {/* Force header */}
      <div>
        <h3 className="text-[14px] font-medium">{fuerza.nombre}</h3>
        <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>{fuerza.descripcion}</p>
      </div>

      {/* Methodological note */}
      <div className="flex items-start gap-2 rounded-lg border p-3"
        style={{ borderColor: "#fbbf24", backgroundColor: "transparent" }}
      >
        <Info className="size-4 shrink-0 mt-0.5" style={{ color: "#fbbf24" }} />
        <p className="text-[12px]" style={{ color: "#f0c283" }}>
          Desliza hacia la derecha para indicar <strong>mayor presion</strong> sobre el sector.
          Mayor presion = menor atractividad = tiende a generar Amenazas en la MEFE.
        </p>
      </div>

      {/* Subfactor sliders */}
      <div className="space-y-3">
        {fuerza.subfactores.map((sf) => (
          <SubfactorRow
            key={sf.id}
            subfactor={sf}
            value={values[sf.id] ?? 3}
            onChange={(val) => onChangeValue(sf.id, val)}
          />
        ))}
      </div>

      {/* Force summary */}
      <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: color.border, backgroundColor: color.bg }}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[12px] font-medium" style={{ color: color.text }}>
              Intensidad de {fuerza.nombreCorto.toLowerCase()}
            </span>
            <p className="text-[11px]" style={{ color: color.text }}>
              Promedio de {fuerza.subfactores.length} subfactores evaluados
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-medium" style={{ color: color.text }}>{avg.toFixed(1)}</span>
            <span className="block text-[11px] font-medium" style={{ color: color.text }}>
              {intensidad} — {atractividad}
            </span>
          </div>
        </div>

        {/* Auto analysis */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest mb-1.5" style={{ color: color.text }}>
            Analisis generado automaticamente
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: color.text }}>{analisis}</p>
        </div>

      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={onSave} disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium text-white transition-all cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: "#a78bfa" }}
        >
          <Save className="size-3.5" />
          Guardar fuerza
        </button>
        <button type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-[13px] font-medium transition-all cursor-pointer"
          style={{ borderColor: "#a78bfa", color: "#a78bfa" }}
          onClick={() => toast.info("La asistencia de IA estara disponible proximamente.")}
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full opacity-75" style={{ backgroundColor: "#a78bfa" }} />
            <span className="relative inline-flex size-2 rounded-full" style={{ backgroundColor: "#a78bfa" }} />
          </span>
          <Sparkles className="size-3.5" />
          Profundizar con IA
        </button>
      </div>

      {/* ── MEFE Factors Section ── */}
      {mefeSuggestions.length > 0 && (
        <div className="space-y-4">
          <Separator />
          <div>
            <h4 className="text-[14px] font-medium">Factores del microentorno → MEFE</h4>
            <p className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
              El sistema sugiere los factores de esta fuerza que deberian ir a la MEFE. Acepta o rechaza cada uno.
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-lg border p-3"
            style={{ borderColor: "#a78bfa", backgroundColor: "transparent" }}
          >
            <Info className="size-4 shrink-0 mt-0.5" style={{ color: "#a78bfa" }} />
            <p className="text-[12px]" style={{ color: "#9ec2ec" }}>
              Estos factores se agregan a la variable C (Competitivo) del PESTEC y luego a la MEFE.
              Solo deberas asignar el peso cuando estes en la pantalla de MEFE.
            </p>
          </div>

          <div className="space-y-2">
            {mefeSuggestions.map((s) => {
              const isO = s.tipo === "O";
              const isAccepted = acceptedFactors.has(s.subfactorId);
              const isRejected = rejectedFactors.has(s.subfactorId);

              return (
                <div key={s.subfactorId}
                  className="rounded-xl border p-3.5 transition-all"
                  style={{
                    borderColor: isAccepted ? "#34d399" : isRejected ? "var(--color-border-tertiary)" : (isO ? "#a78bfa" : "#fca5a5"),
                    backgroundColor: isAccepted ? "transparent" : "transparent",
                    opacity: isRejected ? 0.4 : 1,
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white shrink-0 mt-0.5"
                      style={{ backgroundColor: isO ? "#a78bfa" : "#fca5a5" }}
                    >
                      {isO ? "Oportunidad" : "Amenaza"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-medium block">{s.nombre}</span>
                      <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                        {s.justificacion}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {isAccepted ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: "#34d399" }}>
                        <Check className="size-3.5" /> Aceptado — ira a la MEFE
                      </span>
                    ) : isRejected ? (
                      <button type="button"
                        onClick={() => onReactivateFactor(s.subfactorId)}
                        className="text-[12px] font-medium cursor-pointer"
                        style={{ color: "#a78bfa" }}
                      >
                        Reactivar
                      </button>
                    ) : (
                      <>
                        <button type="button"
                          onClick={() => onAcceptFactor(s)}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white cursor-pointer"
                          style={{ backgroundColor: "#a78bfa" }}
                        >
                          <Check className="size-3" /> Aceptar → MEFE
                        </button>
                        <button type="button"
                          onClick={() => onRejectFactor(s.subfactorId)}
                          className="inline-flex items-center rounded-lg border px-3 py-1.5 text-[12px] font-medium cursor-pointer"
                          style={{ borderColor: "var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}
                        >
                          Descartar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PorterPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const utils = trpc.useUtils();

  const { data: porterRecord } = trpc.porter.get.useQuery({ cycleId });
  const upsertMutation = trpc.porter.upsert.useMutation({
    onSuccess: () => utils.porter.get.invalidate({ cycleId }),
  });

  // Create factor in PESTEC variable C when accepted
  const createFactorMutation = trpc.porter.createFactor.useMutation({
    onSuccess: () => {
      utils.pestec.list.invalidate({ cycleId });
    },
  });

  const [activeForce, setActiveForce] = useState(PORTER_FORCES[0].id);
  const [acceptedFactors, setAcceptedFactors] = useState<Set<string>>(new Set());
  const [rejectedFactors, setRejectedFactors] = useState<Set<string>>(new Set());

  function handleAcceptFactor(suggestion: MefeSuggestion) {
    setAcceptedFactors((prev) => new Set(prev).add(suggestion.subfactorId));
    setRejectedFactors((prev) => { const n = new Set(prev); n.delete(suggestion.subfactorId); return n; });
    // Create as PESTEC factor in variable C (competitivo)
    createFactorMutation.mutate({
      cycleId,
      description: suggestion.nombre,
      type: suggestion.tipo,
      impact: 3,
      probability: 3,
    });
    toast.success(`"${suggestion.nombre}" aceptado → MEFE`);
  }

  function handleRejectFactor(subfactorId: string) {
    setRejectedFactors((prev) => new Set(prev).add(subfactorId));
    setAcceptedFactors((prev) => { const n = new Set(prev); n.delete(subfactorId); return n; });
  }

  function handleReactivateFactor(subfactorId: string) {
    setRejectedFactors((prev) => { const n = new Set(prev); n.delete(subfactorId); return n; });
  }

  // Parse stored data
  const porterData: PorterData = porterRecord?.data
    ? (porterRecord.data as unknown as PorterData)
    : { forces: {} };

  // Local state for current editing
  const [localValues, setLocalValues] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {};
    PORTER_FORCES.forEach((f) => {
      init[f.id] = porterData.forces?.[f.id]?.values ?? {};
    });
    return init;
  });

  // Sync from server when data loads
  const [synced, setSynced] = useState(false);
  if (porterRecord && !synced) {
    const parsed = porterRecord.data as unknown as PorterData;
    if (parsed?.forces) {
      const newLocal: Record<string, Record<string, number>> = {};
      PORTER_FORCES.forEach((f) => {
        newLocal[f.id] = parsed.forces?.[f.id]?.values ?? localValues[f.id] ?? {};
      });
      setLocalValues(newLocal);
      setSynced(true);
    }
  }

  function handleChangeValue(forceId: string, subfactorId: string, val: number) {
    setLocalValues((prev) => ({
      ...prev,
      [forceId]: { ...prev[forceId], [subfactorId]: val },
    }));
  }

  function handleSaveForce(forceId: string) {
    const newForces = { ...porterData.forces };
    newForces[forceId] = {
      values: localValues[forceId] ?? {},
      saved: true,
    };

    // Calculate overall score from saved forces
    const savedForces = PORTER_FORCES.filter((f) => newForces[f.id]?.saved);
    const overallScore = savedForces.length > 0
      ? savedForces.reduce((sum, f) => sum + getAvg(f, newForces[f.id].values), 0) / savedForces.length
      : undefined;

    upsertMutation.mutate(
      { cycleId, data: { forces: newForces } as unknown as Record<string, unknown>, overallScore },
      { onSuccess: () => toast.success(`"${PORTER_FORCES.find((f) => f.id === forceId)?.nombreCorto}" guardada`) },
    );
  }

  // Global stats
  const savedForces = PORTER_FORCES.filter((f) => porterData.forces?.[f.id]?.saved);
  const globalAvg = savedForces.length > 0
    ? savedForces.reduce((sum, f) => sum + getAvg(f, porterData.forces[f.id].values), 0) / savedForces.length
    : null;
  const remaining = 5 - savedForces.length;

  const activeFuerza = PORTER_FORCES.find((f) => f.id === activeForce);
  const activeStyle = activeFuerza ? FORCE_STYLES[activeFuerza.id] : null;
  const panelRef = useRef<HTMLDivElement>(null);

  function handleForceClick(forceId: string) {
    const next = activeForce === forceId ? null : forceId;
    setActiveForce(next as string);
    if (next) {
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      {/* Hero */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "transparent" }}>
            <Shield className="size-6" style={{ color: "#f0abfc" }} />
          </div>
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Cinco Fuerzas de Porter</h1>
            <p className="text-sm text-muted-foreground">
              Analisis de atractividad del microentorno sectorial
            </p>
          </div>
        </div>
      </div>

      {/* Global attractiveness indicator */}
      {globalAvg !== null && (
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border-tertiary)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Atractividad general de la industria
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium" style={{ color: getIntensidadColor(globalAvg).text }}>
                {globalAvg.toFixed(1)}/5
              </span>
              <span
                className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
                style={{
                  borderColor: getIntensidadColor(globalAvg).border,
                  backgroundColor: getIntensidadColor(globalAvg).bg,
                  color: getIntensidadColor(globalAvg).text,
                }}
              >
                {getAtractividad(globalAvg)}
              </span>
            </div>
          </div>
          {remaining > 0 && (
            <p className="mt-1 text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
              Completa {remaining} fuerza{remaining !== 1 ? "s" : ""} restante{remaining !== 1 ? "s" : ""} para el diagnostico final
            </p>
          )}
        </div>
      )}

      {/* Force cards grid (AMOFHIT style) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PORTER_FORCES.map((f, i) => (
          <ForceCard
            key={f.id}
            fuerza={f}
            index={i}
            values={localValues[f.id] ?? {}}
            saved={!!porterData.forces?.[f.id]?.saved}
            isActive={activeForce === f.id}
            onClick={() => handleForceClick(f.id)}
          />
        ))}
      </div>

      {/* Active force panel */}
      {activeFuerza && activeStyle && (
        <div ref={panelRef} className="space-y-6 scroll-mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3">
            {(() => {
              const Icon = FORCE_ICONS[activeFuerza.id] ?? Shield;
              return (
                <>
                  <div className={`flex size-10 items-center justify-center rounded-xl ${activeStyle.bg}`}>
                    <Icon className={`size-5 ${activeStyle.color}`} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-medium">{activeFuerza.nombre}</h2>
                    <p className="text-xs text-muted-foreground">{activeFuerza.descripcion}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveForce("")}
                    className="text-muted-foreground"
                  >
                    <ChevronUp className="size-4" />
                    Cerrar
                  </Button>
                </>
              );
            })()}
          </div>

          <div className="h-px w-full"
            style={{ background: `linear-gradient(to right, ${activeStyle.colorHex}99, transparent)` }}
          />

          <ForcePanel
            fuerza={activeFuerza}
            values={localValues[activeFuerza.id] ?? {}}
            onChangeValue={(sfId, val) => handleChangeValue(activeFuerza.id, sfId, val)}
            onSave={() => handleSaveForce(activeFuerza.id)}
            saving={upsertMutation.isPending}
            cycleId={cycleId}
            acceptedFactors={acceptedFactors}
            rejectedFactors={rejectedFactors}
            onAcceptFactor={handleAcceptFactor}
            onRejectFactor={handleRejectFactor}
            onReactivateFactor={handleReactivateFactor}
          />
        </div>
      )}
    </div>
  );
}
