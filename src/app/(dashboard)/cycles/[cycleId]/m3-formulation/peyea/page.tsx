"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import {
  PEYEA_CATALOG,
  computeVector,
  STRATEGIES_BY_QUADRANT,
  QUADRANT_INFO,
  DIMENSION_INFO,
  ORIGIN_LABEL,
  variablesByDimension,
  type PeyeaDimension,
  type PeyeaOrigin,
} from "@/lib/peyea-catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip as RTooltip,
  ReferenceLine,
  ReferenceArea,
  Cell,
} from "recharts";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Link as LinkIcon,
  Pencil,
  AlertTriangle,
  PlayCircle,
  ArrowLeft,
  ArrowRight,
  Save,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface PeyeaItem {
  key: string;
  dimension: PeyeaDimension;
  name: string;
  origin: PeyeaOrigin;
  hint?: string;
  suggestedScore: number | null;
  userScore: number | null;
  modified: boolean;
  isLinked: boolean;
}

type ScoresMap = Record<string, number>;

// ───────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ───────────────────────────────────────────────────────────────────────

export default function PeyeaPage() {
  const params = useParams();
  const cycleId = params.cycleId as string;
  const utils = trpc.useUtils();

  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [scores, setScores] = useState<ScoresMap>({});
  const [modified, setModified] = useState<Set<string>>(new Set());
  const [retained, setRetained] = useState<Set<string>>(new Set());
  const [hidratado, setHidratado] = useState(false);

  const { data: setup, isLoading } = trpc.peyea.getSetup.useQuery({ cycleId });

  const upsert = trpc.peyea.upsert.useMutation();
  const saveStrategies = trpc.peyea.saveRetainedStrategies.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.count} estrategia(s) retenida(s) guardadas`);
    },
  });

  // Hidratar scores con valor del usuario (si guardado) o sugerido (si vinculado)
  useEffect(() => {
    if (!setup || hidratado) return;
    const initial: ScoresMap = {};
    const mods = new Set<string>();
    for (const it of setup.items as PeyeaItem[]) {
      if (it.userScore !== null) {
        initial[it.key] = it.userScore;
        if (it.modified) mods.add(it.key);
      } else if (it.suggestedScore !== null) {
        initial[it.key] = Math.round(it.suggestedScore * 10) / 10;
      } else {
        initial[it.key] = 3.5; // neutral default
      }
    }
    setScores(initial);
    setModified(mods);
    setHidratado(true);
  }, [setup, hidratado]);

  // Auto-guardado debounced (1.5s tras ultimo cambio)
  const persistDebouncedRef = useState<{ timer: ReturnType<typeof setTimeout> | null }>(
    { timer: null },
  )[0];
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const persist = useCallback(
    (scoresToSave: ScoresMap, modsToSave: Set<string>) => {
      const buildArr = (dim: PeyeaDimension) =>
        variablesByDimension(dim).map((v) => ({
          key: v.key,
          factor: v.name,
          score: scoresToSave[v.key] ?? 3.5,
          modified: modsToSave.has(v.key),
        }));
      const ff = buildArr("FF").map((x) => x.score);
      const vc = buildArr("VC").map((x) => x.score);
      const ee = buildArr("EE").map((x) => x.score);
      const fi = buildArr("FI").map((x) => x.score);
      const vector = computeVector({ FF: ff, VC: vc, EE: ee, FI: fi });

      upsert.mutate(
        {
          cycleId,
          financialStrength: buildArr("FF"),
          competitiveAdvantage: buildArr("VC"),
          environmentalStability: buildArr("EE"),
          industryStrength: buildArr("FI"),
          vectorX: vector.x,
          vectorY: vector.y,
          quadrant: vector.quadrant,
        },
        {
          onSuccess: () => setSavedAt(new Date()),
        },
      );
    },
    [cycleId, upsert],
  );

  function setScore(key: string, value: number, isModification: boolean) {
    setScores((prev) => {
      const next = { ...prev, [key]: value };
      const newMods = new Set(modified);
      if (isModification) newMods.add(key);
      setModified(newMods);

      // Debounce persistencia
      if (persistDebouncedRef.timer) clearTimeout(persistDebouncedRef.timer);
      persistDebouncedRef.timer = setTimeout(() => {
        persist(next, newMods);
      }, 1500);

      return next;
    });
  }

  // Calcular vector en tiempo real
  const vector = useMemo(() => {
    if (!setup) return null;
    const get = (dim: PeyeaDimension) =>
      variablesByDimension(dim).map((v) => scores[v.key] ?? 3.5);
    return computeVector({
      FF: get("FF"),
      VC: get("VC"),
      EE: get("EE"),
      FI: get("FI"),
    });
  }, [scores, setup]);

  function loadDemo() {
    const demo: ScoresMap = {};
    for (const v of PEYEA_CATALOG) {
      // Demo: empresa AgroValle — perfil agresivo
      const demoMap: Record<PeyeaDimension, number> = {
        FF: 5,
        VC: 5, // ventaja competitiva alta = score alto positivo
        EE: 4,
        FI: 5,
      };
      demo[v.key] = demoMap[v.dimension];
    }
    setScores(demo);
    setModified(new Set(PEYEA_CATALOG.map((v) => v.key)));
    persist(demo, new Set(PEYEA_CATALOG.map((v) => v.key)));
    toast.success("Datos demo cargados (empresa AgroValle - perfil agresivo)");
  }

  function continuarConRetenidas() {
    if (!vector) return;
    const all = STRATEGIES_BY_QUADRANT[vector.quadrant];
    const sel = all.filter((s) => retained.has(s.code));
    saveStrategies.mutate({ cycleId, strategies: sel });
  }

  if (isLoading || !setup) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando PEYEA...</div>;
  }

  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Matriz PEYEA</h1>
        <p className="text-sm text-muted-foreground">
          Posicion Estrategica y Evaluacion de la Accion — determina la postura
          estrategica de tu empresa cruzando 4 dimensiones.
        </p>
      </header>

      <Stepper paso={paso} setPaso={setPaso} />

      {paso === 1 && (
        <Paso1
          items={setup.items as PeyeaItem[]}
          scores={scores}
          modified={modified}
          setScore={setScore}
          vector={vector}
          availableSources={setup.availableSources}
          savedAt={savedAt}
          onLoadDemo={loadDemo}
          onNext={() => setPaso(2)}
        />
      )}
      {paso === 2 && vector && (
        <Paso2
          vector={vector}
          onBack={() => setPaso(1)}
          onNext={() => setPaso(3)}
        />
      )}
      {paso === 3 && vector && (
        <Paso3
          vector={vector}
          retained={retained}
          setRetained={setRetained}
          onBack={() => setPaso(2)}
          onSave={continuarConRetenidas}
          isSaving={saveStrategies.isPending}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// STEPPER
// ───────────────────────────────────────────────────────────────────────

function Stepper({ paso, setPaso }: { paso: 1 | 2 | 3; setPaso: (p: 1 | 2 | 3) => void }) {
  const steps = [
    { id: 1, label: "Calificar dimensiones" },
    { id: 2, label: "Ver matriz y vector" },
    { id: 3, label: "Estrategias recomendadas" },
  ] as const;
  return (
    <nav aria-label="Progreso" className="print:hidden">
      <ol className="flex items-center justify-between gap-2 max-w-3xl mx-auto">
        {steps.map((s, i) => {
          const active = paso === s.id;
          const done = paso > s.id;
          const clickable = s.id <= paso;
          return (
            <li key={s.id} className="flex items-center gap-2 flex-1">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && setPaso(s.id)}
                className={`flex items-center gap-2 group ${clickable ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
              >
                <span
                  className={`flex items-center justify-center size-8 rounded-full text-xs font-semibold transition-colors ${
                    active
                      ? "bg-primary text-white"
                      : done
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-muted text-muted-foreground border"
                  }`}
                >
                  {done ? <Check className="size-4" /> : s.id}
                </span>
                <span
                  className={`text-sm hidden sm:inline ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}
                >
                  {s.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px ${paso > s.id ? "bg-primary/30" : "bg-border"}`} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 1 — CALIFICAR DIMENSIONES
// ───────────────────────────────────────────────────────────────────────

function Paso1({
  items,
  scores,
  modified,
  setScore,
  vector,
  availableSources,
  savedAt,
  onLoadDemo,
  onNext,
}: {
  items: PeyeaItem[];
  scores: ScoresMap;
  modified: Set<string>;
  setScore: (key: string, value: number, isMod: boolean) => void;
  vector: ReturnType<typeof computeVector> | null;
  availableSources: Record<string, boolean>;
  savedAt: Date | null;
  onLoadDemo: () => void;
  onNext: () => void;
}) {
  const [openDim, setOpenDim] = useState<PeyeaDimension>("FF");

  const itemsByDim = useMemo(() => {
    const map: Record<PeyeaDimension, PeyeaItem[]> = { FF: [], VC: [], EE: [], FI: [] };
    items.forEach((it) => map[it.dimension].push(it));
    return map;
  }, [items]);

  const dimAvg = (dim: PeyeaDimension) => {
    const arr = itemsByDim[dim].map((i) => scores[i.key] ?? 3.5);
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {/* Caja informativa azul */}
        <div className="rounded-xl border border-primary/25/60 bg-primary/10/60 dark:border-primary/40 dark:bg-primary/90/30 p-4">
          <div className="flex gap-3">
            <Info className="size-5 shrink-0 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">Como funciona PEYEA</p>
              <p className="text-muted-foreground">
                Vas a calificar 4 dimensiones de tu empresa. Dos son internas
                (como esta tu negocio) y dos son externas (como esta el sector).
                La matriz cruza estas dimensiones y te dice que postura estrategica
                te conviene. <strong>Califica del 1 al 6 — cuanto mas alto, mejor.</strong>{" "}
                El sistema invierte signos internamente cuando hace falta.
              </p>
            </div>
          </div>
        </div>

        {/* 4 tarjetas de dimensiones */}
        {(Object.keys(DIMENSION_INFO) as PeyeaDimension[]).map((dim) => (
          <DimensionCard
            key={dim}
            dim={dim}
            items={itemsByDim[dim]}
            scores={scores}
            modified={modified}
            setScore={setScore}
            avg={dimAvg(dim)}
            isOpen={openDim === dim}
            onToggle={() => setOpenDim((cur) => (cur === dim ? dim : dim))}
            forceOpen={openDim === dim}
            onClickHeader={() => setOpenDim(openDim === dim ? ("" as PeyeaDimension) : dim)}
            availableSources={availableSources}
          />
        ))}

        {/* Auto-guardado */}
        {savedAt && (
          <p className="text-xs text-muted-foreground text-right">
            <Save className="inline size-3 mr-1" />
            Guardado hace {Math.max(1, Math.round((Date.now() - savedAt.getTime()) / 1000))}{" "}
            segundos
          </p>
        )}

        {/* Botonera inferior */}
        <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
          <Button variant="outline" size="sm" onClick={onLoadDemo}>
            <PlayCircle className="size-4 mr-1.5" /> Cargar ejemplo demo
          </Button>
          <Button size="sm" onClick={onNext} className="ml-auto">
            Ver matriz completa
            <ArrowRight className="size-4 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* Vista previa lateral */}
      <div className="lg:sticky lg:top-4 lg:self-start">
        <VectorPreview vector={vector} />
      </div>
    </div>
  );
}

function DimensionCard({
  dim,
  items,
  scores,
  modified,
  setScore,
  avg,
  forceOpen,
  onClickHeader,
  availableSources,
}: {
  dim: PeyeaDimension;
  items: PeyeaItem[];
  scores: ScoresMap;
  modified: Set<string>;
  setScore: (key: string, value: number, isMod: boolean) => void;
  avg: number;
  isOpen: boolean;
  onToggle: () => void;
  forceOpen: boolean;
  onClickHeader: () => void;
  availableSources: Record<string, boolean>;
}) {
  const info = DIMENSION_INFO[dim];
  const calificadas = items.filter((i) => scores[i.key] !== undefined).length;
  const total = items.length;

  return (
    <Card style={{ borderColor: info.border }}>
      <button
        type="button"
        onClick={onClickHeader}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-lg font-bold text-white text-sm"
            style={{ backgroundColor: info.color }}
          >
            {dim}
          </div>
          <div>
            <div className="font-medium">{info.label}</div>
            <div className="text-xs text-muted-foreground">{info.question}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {calificadas}/{total}
          </span>
          <Badge
            variant="outline"
            className="font-semibold tabular-nums"
            style={{
              color: info.color,
              borderColor: info.border,
              backgroundColor: info.bg,
            }}
          >
            {avg.toFixed(2)}
          </Badge>
          {forceOpen ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {forceOpen && (
        <CardContent className="space-y-3 pt-0">
          {items.map((item) => (
            <VariableRow
              key={item.key}
              item={item}
              score={scores[item.key] ?? 3.5}
              isModified={modified.has(item.key)}
              onChange={(v, isMod) => setScore(item.key, v, isMod)}
              availableSources={availableSources}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function VariableRow({
  item,
  score,
  isModified,
  onChange,
  availableSources,
}: {
  item: PeyeaItem;
  score: number;
  isModified: boolean;
  onChange: (value: number, isMod: boolean) => void;
  availableSources: Record<string, boolean>;
}) {
  // Determinar si la fuente esta disponible
  const sourceKey: string | null = (() => {
    if (item.origin.startsWith("amofhit")) return "amofhit";
    if (item.origin === "mpc") return "mpc";
    if (item.origin === "porter") return "porter";
    if (item.origin === "atractividad") return "attractiveness";
    if (item.origin === "pestec") return "pestec";
    return null;
  })();
  const sourceAvailable = sourceKey ? availableSources[sourceKey] : true;
  const isLinked = item.origin !== "peyea";

  // Estado del badge
  let badgeText: string;
  let badgeColor: { color: string; bg: string; border: string };
  if (item.origin === "peyea") {
    badgeText = "Especifica de PEYEA";
    badgeColor = { color: "#9a91b8", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.3)" };
  } else if (isModified) {
    badgeText = "Modificada manualmente";
    badgeColor = { color: "#B45309", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.4)" };
  } else if (item.suggestedScore !== null) {
    badgeText = `Vinculada desde ${ORIGIN_LABEL[item.origin]}`;
    badgeColor = { color: "#1D4ED8", bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.35)" };
  } else if (!sourceAvailable) {
    badgeText = `${ORIGIN_LABEL[item.origin]} sin completar`;
    badgeColor = { color: "#B45309", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)" };
  } else {
    badgeText = "Pendiente";
    badgeColor = { color: "#9a91b8", bg: "transparent", border: "rgba(107,114,128,0.3)" };
  }

  return (
    <div className="rounded-lg border bg-background p-3 space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{item.name}</span>
            {isLinked && <LinkIcon className="size-3 text-primary" />}
            {isModified && <Pencil className="size-3 text-amber-400" />}
          </div>
          {item.hint && (
            <div className="text-[11px] text-muted-foreground mt-0.5">{item.hint}</div>
          )}
        </div>
        <Badge
          variant="outline"
          className="text-[10px]"
          style={{
            color: badgeColor.color,
            borderColor: badgeColor.border,
            backgroundColor: badgeColor.bg,
          }}
        >
          {badgeText}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min="1"
          max="6"
          step="0.5"
          value={score}
          onChange={(e) => onChange(parseFloat(e.target.value), true)}
          className="flex-1 accent-blue-600 h-2"
          aria-label={item.name}
        />
        <span className="text-sm font-bold tabular-nums w-14 text-right">
          {score.toFixed(1)} <span className="text-muted-foreground font-normal text-xs">/ 6</span>
        </span>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>1 muy bajo</span>
        <span>6 excelente</span>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// VECTOR PREVIEW (lateral en Paso 1)
// ───────────────────────────────────────────────────────────────────────

function VectorPreview({ vector }: { vector: ReturnType<typeof computeVector> | null }) {
  if (!vector) return null;
  const info = QUADRANT_INFO[vector.quadrant];
  return (
    <Card className="border-primary/25/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="size-4 text-primary" />
          Vista previa del vector
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-md border p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Eje X</div>
            <div className="text-lg font-bold tabular-nums">
              {vector.x >= 0 ? "+" : ""}{vector.x.toFixed(2)}
            </div>
            <div className="text-[10px] text-muted-foreground">VC + FI</div>
          </div>
          <div className="rounded-md border p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Eje Y</div>
            <div className="text-lg font-bold tabular-nums">
              {vector.y >= 0 ? "+" : ""}{vector.y.toFixed(2)}
            </div>
            <div className="text-[10px] text-muted-foreground">FF + EE</div>
          </div>
        </div>
        <div
          className="rounded-md p-3 text-center"
          style={{ backgroundColor: info.bg, borderColor: info.border, borderWidth: 1 }}
        >
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Perfil</div>
          <div className="text-base font-semibold" style={{ color: info.color }}>
            {info.label}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Magnitud {vector.magnitude.toFixed(2)} · {vector.angleDeg.toFixed(0)}°
          </div>
        </div>
        <MiniMatrix vector={vector} />
      </CardContent>
    </Card>
  );
}

function MiniMatrix({ vector }: { vector: ReturnType<typeof computeVector> }) {
  // Simple mini matrix as SVG for the side preview
  const size = 160;
  const half = size / 2;
  const max = 12; // x and y can range -12 to +12 (sum of two scores 1-6 with sign)
  const px = half + (vector.x / max) * (half - 10);
  const py = half - (vector.y / max) * (half - 10);
  const info = QUADRANT_INFO[vector.quadrant];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto border rounded-md bg-muted/10">
      {/* fondos cuadrante */}
      <rect x={half} y="0" width={half} height={half} fill={QUADRANT_INFO.agresivo.bg} />
      <rect x="0" y="0" width={half} height={half} fill={QUADRANT_INFO.conservador.bg} />
      <rect x="0" y={half} width={half} height={half} fill={QUADRANT_INFO.defensivo.bg} />
      <rect x={half} y={half} width={half} height={half} fill={QUADRANT_INFO.competitivo.bg} />
      {/* ejes */}
      <line x1="0" y1={half} x2={size} y2={half} stroke="rgba(167,139,250,0.14)" strokeWidth="1" />
      <line x1={half} y1="0" x2={half} y2={size} stroke="rgba(167,139,250,0.14)" strokeWidth="1" />
      {/* vector */}
      <line x1={half} y1={half} x2={px} y2={py} stroke={info.color} strokeWidth="2.5" />
      <circle cx={px} cy={py} r="4" fill={info.color} />
    </svg>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 2 — MATRIZ COMPLETA
// ───────────────────────────────────────────────────────────────────────

function Paso2({
  vector,
  onBack,
  onNext,
}: {
  vector: ReturnType<typeof computeVector>;
  onBack: () => void;
  onNext: () => void;
}) {
  const info = QUADRANT_INFO[vector.quadrant];
  const showAlerts = vector.magnitude < 1.0 || Math.abs(vector.x) < 0.5 || Math.abs(vector.y) < 0.5;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Matriz PEYEA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[480px] md:h-[560px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 30, right: 40, bottom: 36, left: 32 }}>
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={[-12, 12]}
                    ticks={[-12, -8, -4, 0, 4, 8, 12]}
                    tick={{ fontSize: 11, fill: "#9a91b8" }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(167,139,250,0.14)" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    domain={[-12, 12]}
                    ticks={[-12, -8, -4, 0, 4, 8, 12]}
                    tick={{ fontSize: 11, fill: "#9a91b8" }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(167,139,250,0.14)" }}
                  />
                  <ZAxis range={[200, 200]} />

                  {/* Cuadrantes coloreados */}
                  <ReferenceArea x1={0} x2={12} y1={0} y2={12} fill={QUADRANT_INFO.agresivo.color} fillOpacity={0.08} stroke="none" label={{ value: "AGRESIVO", position: "insideTopRight", fill: QUADRANT_INFO.agresivo.color, fontSize: 13, fontWeight: 600, offset: 12 }} />
                  <ReferenceArea x1={-12} x2={0} y1={0} y2={12} fill={QUADRANT_INFO.conservador.color} fillOpacity={0.08} stroke="none" label={{ value: "CONSERVADOR", position: "insideTopLeft", fill: QUADRANT_INFO.conservador.color, fontSize: 13, fontWeight: 600, offset: 12 }} />
                  <ReferenceArea x1={0} x2={12} y1={-12} y2={0} fill={QUADRANT_INFO.competitivo.color} fillOpacity={0.08} stroke="none" label={{ value: "COMPETITIVO", position: "insideBottomRight", fill: QUADRANT_INFO.competitivo.color, fontSize: 13, fontWeight: 600, offset: 12 }} />
                  <ReferenceArea x1={-12} x2={0} y1={-12} y2={0} fill={QUADRANT_INFO.defensivo.color} fillOpacity={0.08} stroke="none" label={{ value: "DEFENSIVO", position: "insideBottomLeft", fill: QUADRANT_INFO.defensivo.color, fontSize: 13, fontWeight: 600, offset: 12 }} />

                  {/* Etiquetas de ejes */}
                  <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                  <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1.5} />

                  {/* Vector como linea desde origen al punto */}
                  <ReferenceLine
                    segment={[{ x: 0, y: 0 }, { x: vector.x, y: vector.y }]}
                    stroke={info.color}
                    strokeWidth={3}
                    ifOverflow="hidden"
                  />

                  <RTooltip
                    cursor={false}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="rounded-md border bg-background p-2 text-xs shadow">
                          <div className="font-semibold">Tu vector</div>
                          <div>X = {vector.x.toFixed(2)}</div>
                          <div>Y = {vector.y.toFixed(2)}</div>
                        </div>
                      ) : null
                    }
                  />

                  <Scatter data={[{ x: vector.x, y: vector.y }]} fill={info.color}>
                    <Cell key="0" />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card style={{ borderColor: info.border, backgroundColor: info.bg }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1" style={{ color: info.color }}>
              {info.label}
            </div>
            <div className="text-xs text-muted-foreground mb-3">
              ({vector.x >= 0 ? "+" : ""}{vector.x.toFixed(2)}, {vector.y >= 0 ? "+" : ""}{vector.y.toFixed(2)})
            </div>
            <Separator className="my-2" />
            <Row label="Eje X (VC + FI)" value={vector.x.toFixed(2)} />
            <Row label="Eje Y (FF + EE)" value={vector.y.toFixed(2)} />
            <Row label="Magnitud" value={vector.magnitude.toFixed(2)} />
            <Row label="Angulo" value={`${vector.angleDeg.toFixed(0)}°`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Promedios por dimension</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label="FF" value={vector.ffAvg.toFixed(2)} color={DIMENSION_INFO.FF.color} />
            <Row label="VC" value={vector.vcAvg.toFixed(2)} color={DIMENSION_INFO.VC.color} />
            <Row label="EE" value={vector.eeAvg.toFixed(2)} color={DIMENSION_INFO.EE.color} />
            <Row label="FI" value={vector.fiAvg.toFixed(2)} color={DIMENSION_INFO.FI.color} />
          </CardContent>
        </Card>

        {showAlerts && (
          <div className="rounded-md border border-amber-200/60 bg-transparent dark:border-amber-900/30 dark:bg-transparent p-3 text-xs flex gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              {vector.magnitude < 1.0 && (
                <p>Tu vector esta cerca del centro. La postura recomendada es debil. Considera reforzar tu posicion antes de movimientos arriesgados.</p>
              )}
              {Math.abs(vector.x) < 0.5 && vector.magnitude >= 1.0 && (
                <p>Tu eje X esta cerca de cero. Considera que el resultado podria cambiar facilmente entre cuadrantes.</p>
              )}
              {Math.abs(vector.y) < 0.5 && vector.magnitude >= 1.0 && (
                <p>Tu eje Y esta cerca de cero. Considera que el resultado podria cambiar facilmente entre cuadrantes.</p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onBack} className="flex-1">
            <ArrowLeft className="size-4 mr-1.5" /> Editar
          </Button>
          <Button size="sm" onClick={onNext} className="flex-1">
            Estrategias <ArrowRight className="size-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground" style={color ? { color } : undefined}>
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 3 — ESTRATEGIAS
// ───────────────────────────────────────────────────────────────────────

function Paso3({
  vector,
  retained,
  setRetained,
  onBack,
  onSave,
  isSaving,
}: {
  vector: ReturnType<typeof computeVector>;
  retained: Set<string>;
  setRetained: (s: Set<string>) => void;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const info = QUADRANT_INFO[vector.quadrant];
  const strategies = STRATEGIES_BY_QUADRANT[vector.quadrant];

  function toggle(code: string) {
    const next = new Set(retained);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setRetained(next);
  }

  return (
    <div className="space-y-6">
      {/* Identidad del perfil */}
      <Card style={{ borderColor: info.border, backgroundColor: info.bg }}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div
              className="flex size-16 items-center justify-center rounded-full"
              style={{ backgroundColor: info.color }}
            >
              <Target className="size-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: info.color }}>
                Perfil {info.label}
              </h2>
              <p className="text-sm text-muted-foreground">
                Vector ({vector.x >= 0 ? "+" : ""}{vector.x.toFixed(2)}, {vector.y >= 0 ? "+" : ""}{vector.y.toFixed(2)}) · Magnitud {vector.magnitude.toFixed(2)}
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed mt-4 text-foreground/85">
            {info.description}
          </p>
        </CardContent>
      </Card>

      {/* Estrategias recomendadas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Estrategias recomendadas
            <span className="text-xs text-muted-foreground font-normal ml-2">
              Marca las que quieras retener para el FODA Cruzado y MD/MCPE
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {strategies.map((s) => {
              const isRetained = retained.has(s.code);
              return (
                <label
                  key={s.code}
                  className={`rounded-lg border p-3 cursor-pointer transition-all ${
                    isRetained
                      ? "border-primary/40 bg-primary/10/40 dark:bg-primary/90/20"
                      : "hover:border-foreground/30"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={isRetained}
                      onChange={() => toggle(s.code)}
                      className="mt-1 accent-blue-600 size-4 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <TrendingUp className="size-4" style={{ color: info.color }} />
                        <span className="text-sm font-semibold">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {s.code}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4 mr-1.5" /> Editar calificaciones
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {retained.size} estrategia(s) retenida(s)
          </span>
          <Button size="sm" onClick={onSave} disabled={isSaving || retained.size === 0}>
            <Save className="size-4 mr-1.5" />
            {isSaving ? "Guardando..." : "Guardar y continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
