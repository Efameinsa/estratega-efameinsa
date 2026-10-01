"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  GE_QUADRANT_INFO,
  STRATEGIES_BY_QUADRANT,
  quadrantFromScores,
  compareWithOtherMatrices,
  type GeQuadrant,
} from "@/lib/ge-catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  Tooltip as RTooltip, ReferenceLine, ReferenceArea, Cell, LabelList,
} from "recharts";
import {
  Check, ChevronDown, ChevronRight, ArrowLeft, ArrowRight, AlertTriangle,
  Info, Save, Target, TrendingUp, PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useMatrixState } from "@/components/matrices/use-matrix-state";

const STORAGE_KEY = (cycleId: string) => `ge-${cycleId}`;

interface GeState {
  growth: number | null;          // % anual
  position: number | null;        // 1-4
  growthSource: "atractividad" | "pestec" | "manual";
  positionSource: "mpc" | "peyea" | "mefi" | "manual";
  growthThreshold: number;        // default 5
  positionThreshold: number;      // default 2.5
}

const DEFAULT_STATE: GeState = {
  growth: null,
  position: null,
  growthSource: "manual",
  positionSource: "manual",
  growthThreshold: 5,
  positionThreshold: 2.5,
};

export default function GePage() {
  const params = useParams();
  const cycleId = params.cycleId as string;
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [state, setState] = useState<GeState>(DEFAULT_STATE);
  const [hidratado, setHidratado] = useState(false);

  // Queries para auto-carga
  const { data: peyea } = trpc.peyea.get.useQuery({ cycleId });
  const { data: mefi } = trpc.mefi.getSummary.useQuery({ cycleId });
  const { data: allStrategies } = trpc.strategy.list.useQuery({ cycleId });

  // Hidratar desde localStorage o auto-carga
  const matrix = useMatrixState<GeState>(cycleId, "ge", STORAGE_KEY(cycleId));
  useEffect(() => {
    if (hidratado || !matrix.ready) return;
    const initial: GeState = { ...DEFAULT_STATE, ...(matrix.initial ?? {}) };

    // Auto-carga de posicion competitiva si no hay valor manual guardado
    if (initial.position === null) {
      // Prioridad: PEYEA-VC → MEFI total → manual
      if (peyea && Array.isArray(peyea.competitiveAdvantage)) {
        const arr = peyea.competitiveAdvantage as Array<{ score?: number }>;
        if (arr.length > 0) {
          const avg = arr.reduce((s, x) => s + (x.score ?? 0), 0) / arr.length;
          // Convertir 1-6 (PEYEA) a 1-4 (escala MEFI/MPC)
          initial.position = clamp(((avg - 1) / 5) * 3 + 1, 1, 4);
          initial.positionSource = "peyea";
        }
      }
      if (initial.position === null && mefi && mefi.ppt > 0) {
        initial.position = clamp(mefi.ppt, 1, 4);
        initial.positionSource = "mefi";
      }
    }

    setState(initial);
    setHidratado(true);
  }, [hidratado, matrix.ready, matrix.initial, peyea, mefi]);

  // Persistir en localStorage
  useEffect(() => {
    if (!hidratado) return;
    matrix.persist(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, hidratado]);

  function update(patch: Partial<GeState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  function loadDemo() {
    update({
      growth: 12,
      position: 3.2,
      growthSource: "manual",
      positionSource: "manual",
      growthThreshold: 5,
      positionThreshold: 2.5,
    });
    toast.success("Datos demo cargados (ModaAndes — Cuadrante I)");
  }

  if (!hidratado) return <div className="p-6 text-sm text-muted-foreground">Cargando GE...</div>;

  const ready = state.growth !== null && state.position !== null;
  const quadrant: GeQuadrant | null = ready
    ? quadrantFromScores(state.growth!, state.position!, state.growthThreshold, state.positionThreshold)
    : null;

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Matriz de la Gran Estrategia (GE)</h1>
        <p className="text-sm text-muted-foreground">
          La mas simple y comunicable: cruza crecimiento del mercado vs posicion competitiva.
        </p>
      </header>

      <Stepper paso={paso} setPaso={setPaso} ready={ready} />

      {paso === 1 && (
        <Paso1
          state={state}
          update={update}
          onNext={() => setPaso(2)}
          onLoadDemo={loadDemo}
          ready={ready}
        />
      )}
      {paso === 2 && quadrant && (
        <Paso2
          state={state}
          quadrant={quadrant}
          peyeaQuadrant={peyea?.quadrant ?? null}
          allStrategies={(allStrategies ?? []) as Array<{ type: string | null }>}
          onBack={() => setPaso(1)}
          onNext={() => setPaso(3)}
        />
      )}
      {paso === 3 && quadrant && (
        <Paso3
          state={state}
          quadrant={quadrant}
          cycleId={cycleId}
          peyeaQuadrant={peyea?.quadrant ?? null}
          allStrategies={(allStrategies ?? []) as Array<{ type: string | null }>}
          onBack={() => setPaso(2)}
        />
      )}
    </div>
  );
}

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

// ───────────────────────────────────────────────────────────────────────
// STEPPER
// ───────────────────────────────────────────────────────────────────────

function Stepper({ paso, setPaso, ready }: { paso: 1 | 2 | 3; setPaso: (p: 1 | 2 | 3) => void; ready: boolean }) {
  const steps = [
    { id: 1, label: "Variables heredadas" },
    { id: 2, label: "Matriz y cuadrante" },
    { id: 3, label: "Estrategias" },
  ] as const;
  return (
    <nav aria-label="Progreso" className="print:hidden">
      <ol className="flex items-center justify-between gap-2 max-w-3xl mx-auto">
        {steps.map((s, i) => {
          const active = paso === s.id;
          const done = paso > s.id;
          const clickable = s.id === 1 || (ready && s.id <= paso);
          return (
            <li key={s.id} className="flex items-center gap-2 flex-1">
              <button
                type="button" disabled={!clickable}
                onClick={() => clickable && setPaso(s.id)}
                className={`flex items-center gap-2 group ${clickable ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
              >
                <span className={`flex items-center justify-center size-8 rounded-full text-xs font-semibold transition-colors ${active ? "bg-primary text-white" : done ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted text-muted-foreground border"}`}>
                  {done ? <Check className="size-4" /> : s.id}
                </span>
                <span className={`text-sm hidden sm:inline ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              </button>
              {i < steps.length - 1 && (<div className={`flex-1 h-px ${paso > s.id ? "bg-primary/30" : "bg-border"}`} />)}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 1
// ───────────────────────────────────────────────────────────────────────

function Paso1({
  state, update, onNext, onLoadDemo, ready,
}: {
  state: GeState;
  update: (patch: Partial<GeState>) => void;
  onNext: () => void;
  onLoadDemo: () => void;
  ready: boolean;
}) {
  const [openGrowthTip, setOpenGrowthTip] = useState(false);
  const [openPositionTip, setOpenPositionTip] = useState(false);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/15 bg-primary/5 dark:border-primary/40 dark:bg-primary/10 p-4">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Como funciona la Matriz GE</p>
            <p className="text-muted-foreground">
              Es la mas simple de todas: solo necesita dos cosas para ubicarte. Las hemos calculado
              automaticamente desde tu diagnostico previo cuando estuvo disponible. Revisa y ajusta
              si lo crees necesario.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Crecimiento del mercado */}
        <Card style={{ borderColor: "rgba(37,99,235,0.4)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between flex-wrap gap-1">
              <span className="text-primary dark:text-primary">Crecimiento del mercado</span>
              <Badge variant="outline" className="text-[10px] font-normal">
                {state.growthSource === "manual" ? "Manual" : `Heredado de ${state.growthSource}`}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">¿Que tan rapido crece tu mercado anualmente?</p>
            <div className="flex items-baseline gap-2">
              <input
                type="number" step="0.5" min="0" max="50"
                value={state.growth ?? ""}
                onChange={(e) => update({ growth: e.target.value === "" ? null : parseFloat(e.target.value), growthSource: "manual" })}
                placeholder="—"
                className="w-24 rounded-md border-2 border-input bg-muted/40 dark:bg-input/30 px-3 py-2 text-2xl font-bold text-primary dark:text-primary tabular-nums focus:outline-none focus:bg-background focus:ring-2 focus:ring-ring/30"
              />
              <span className="text-sm text-muted-foreground">% anual</span>
            </div>
            {state.growth !== null && (
              <Badge variant="outline" className="text-[11px]" style={{ color: state.growth >= state.growthThreshold ? "#1e7f4f" : "#b45309", borderColor: state.growth >= state.growthThreshold ? "rgba(22,163,74,0.4)" : "rgba(245,158,11,0.4)" }}>
                {state.growth >= state.growthThreshold ? "Crecimiento rapido" : "Crecimiento lento"}
              </Badge>
            )}
            <Separator />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-2">
                Umbral entre rapido y lento:
                <input
                  type="number" step="0.5" min="0" max="20"
                  value={state.growthThreshold}
                  onChange={(e) => update({ growthThreshold: parseFloat(e.target.value) || 5 })}
                  className="w-16 rounded-md border bg-card px-2 py-0.5 text-xs"
                />
                <span>%</span>
                <Badge variant="outline" className="text-[10px] bg-transparent text-emerald-700 border-emerald-500/30">
                  Recomendado: 5%
                </Badge>
              </label>
              <button
                type="button"
                onClick={() => setOpenGrowthTip(!openGrowthTip)}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                {openGrowthTip ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                ¿Cuando cambiar el umbral?
              </button>
              {openGrowthTip && (
                <ul className="text-[11px] text-muted-foreground space-y-1 pl-4 leading-relaxed">
                  <li className="list-disc">Bajalo a 3% en sectores maduros (alimentos, banca tradicional)</li>
                  <li className="list-disc">Subelo a 10-15% en sectores dinamicos (tecnologia, e-commerce)</li>
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Posicion competitiva */}
        <Card style={{ borderColor: "rgba(22,163,74,0.4)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between flex-wrap gap-1">
              <span className="text-emerald-700 dark:text-emerald-700">Posicion competitiva</span>
              <Badge variant="outline" className="text-[10px] font-normal">
                {state.positionSource === "manual"
                  ? "Manual"
                  : state.positionSource === "peyea"
                    ? "Heredado de PEYEA-VC"
                    : state.positionSource === "mpc"
                      ? "Heredado de MPC"
                      : "Heredado de MEFI"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">¿Que tan fuerte es tu posicion vs competidores? (1.0 = muy debil, 4.0 = muy fuerte)</p>
            <div className="flex items-baseline gap-2">
              <input
                type="number" step="0.1" min="1" max="4"
                value={state.position !== null ? state.position.toFixed(1) : ""}
                onChange={(e) => update({ position: e.target.value === "" ? null : parseFloat(e.target.value), positionSource: "manual" })}
                placeholder="—"
                className="w-24 rounded-md border-2 border-input bg-muted/40 dark:bg-input/30 px-3 py-2 text-2xl font-bold text-emerald-700 dark:text-emerald-700 tabular-nums focus:outline-none focus:bg-background focus:ring-2 focus:ring-ring/30"
              />
              <span className="text-sm text-muted-foreground">/ 4.0</span>
            </div>
            {state.position !== null && (
              <Badge variant="outline" className="text-[11px]" style={{ color: state.position >= state.positionThreshold ? "#1e7f4f" : "#b45309", borderColor: state.position >= state.positionThreshold ? "rgba(22,163,74,0.4)" : "rgba(245,158,11,0.4)" }}>
                {state.position >= state.positionThreshold ? "Posicion fuerte" : "Posicion debil"}
              </Badge>
            )}
            <Separator />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-2">
                Umbral entre debil y fuerte:
                <input
                  type="number" step="0.1" min="1" max="4"
                  value={state.positionThreshold}
                  onChange={(e) => update({ positionThreshold: parseFloat(e.target.value) || 2.5 })}
                  className="w-16 rounded-md border bg-card px-2 py-0.5 text-xs"
                />
                <Badge variant="outline" className="text-[10px] bg-transparent text-emerald-700 border-emerald-500/30">
                  Recomendado: 2.5
                </Badge>
              </label>
              <button
                type="button"
                onClick={() => setOpenPositionTip(!openPositionTip)}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                {openPositionTip ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                ¿Como se calcula esta puntuacion?
              </button>
              {openPositionTip && (
                <p className="text-[11px] text-muted-foreground leading-relaxed pl-4">
                  Combina puntaje MPC vs competidores, MEFI total y promedio VC de PEYEA. La escala 1-4 mide
                  fortaleza relativa: 1 muy debil, 2.5 promedio del sector, 4 muy fuerte.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onLoadDemo}>
          <PlayCircle className="size-4 mr-1.5" /> Cargar ejemplo demo
        </Button>
        <Button size="sm" onClick={onNext} className="ml-auto" disabled={!ready}>
          Continuar a la matriz <ArrowRight className="size-4 ml-1.5" />
        </Button>
      </div>
      {!ready && (
        <p className="text-xs text-muted-foreground text-center">Completa ambos valores para continuar.</p>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 2
// ───────────────────────────────────────────────────────────────────────

function Paso2({
  state, quadrant, peyeaQuadrant, onBack, onNext,
}: {
  state: GeState;
  quadrant: GeQuadrant;
  peyeaQuadrant: string | null;
  allStrategies: Array<{ type: string | null }>;
  onBack: () => void;
  onNext: () => void;
}) {
  const info = GE_QUADRANT_INFO[quadrant];
  const coherence = compareWithOtherMatrices(quadrant, peyeaQuadrant);

  // Detectar zona limite
  const nearCenter =
    Math.abs(state.growth! - state.growthThreshold) < 1 ||
    Math.abs(state.position! - state.positionThreshold) < 0.2;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cuadricula GE — 4 cuadrantes</CardTitle>
          </CardHeader>
          <CardContent>
            <GeChart state={state} quadrant={quadrant} />
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-3">
        <Card style={{ borderColor: info.border, backgroundColor: info.bg }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1" style={{ color: info.color }}>{info.label}</div>
            <p className="text-xs text-muted-foreground mb-3">{info.subtitle}</p>
            <Separator className="my-2" />
            <div className="space-y-1.5 text-sm">
              <Row label="Crecimiento" value={`${state.growth!.toFixed(1)}%`} sub={`Umbral ${state.growthThreshold}%`} />
              <Row label="Posicion" value={state.position!.toFixed(1)} sub={`Umbral ${state.positionThreshold}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Coherencia con PEYEA</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="mb-2" style={{ color: coherence.aligned ? "#1e7f4f" : "#b45309", borderColor: coherence.aligned ? "rgba(22,163,74,0.4)" : "rgba(245,158,11,0.4)" }}>
              {coherence.aligned ? "Coherente" : "Hay diferencias"}
            </Badge>
            <p className="text-xs text-muted-foreground leading-relaxed">{coherence.message}</p>
          </CardContent>
        </Card>

        {nearCenter && (
          <div className="rounded-md border border-amber-200/60 bg-transparent dark:border-amber-900/30 dark:bg-transparent p-3 text-xs flex gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-700 mt-0.5" />
            <span>Tu posicion esta cerca del centro. Los resultados son sensibles a cambios pequeños. Considera revisar las variables.</span>
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
      </aside>
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="font-medium tabular-nums">{value}</span>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// GE CHART
// ───────────────────────────────────────────────────────────────────────

function GeChart({ state, quadrant }: { state: GeState; quadrant: GeQuadrant }) {
  // Dominio: x = posicion (1-4), y = crecimiento (0-25%)
  const xT = state.positionThreshold;
  const yT = state.growthThreshold;
  const yMax = Math.max(25, (state.growth ?? 0) + 5);
  const userInfo = GE_QUADRANT_INFO[quadrant];

  return (
    <div className="w-full h-[460px] md:h-[520px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 30, right: 30, bottom: 36, left: 32 }}>
          <XAxis
            type="number" dataKey="x" domain={[1, 4]} ticks={[1, 2, 2.5, 3, 4]}
            tick={{ fontSize: 11, fill: "#6b6b6b" }} tickLine={false} axisLine={{ stroke: "rgba(139, 21, 16,0.14)" }}
            label={{ value: "Posicion competitiva (debil ← → fuerte)", position: "insideBottom", offset: -14, style: { fontSize: 11, fill: "#6b6b6b", textAnchor: "middle" } }}
          />
          <YAxis
            type="number" dataKey="y" domain={[0, yMax]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: "#6b6b6b" }} tickLine={false} axisLine={{ stroke: "rgba(139, 21, 16,0.14)" }}
            label={{ value: "Crecimiento del mercado (lento ↓ ↑ rapido)", angle: -90, position: "insideLeft", offset: 0, style: { fontSize: 11, fill: "#6b6b6b", textAnchor: "middle" } }}
          />
          <ZAxis range={[400, 400]} />

          {/* Cuadrante II (arriba-izq): debil + rapido */}
          <ReferenceArea x1={1} x2={xT} y1={yT} y2={yMax} fill={GE_QUADRANT_INFO.II.color} fillOpacity={0.12} stroke="none" label={{ value: "II", position: "center", fill: GE_QUADRANT_INFO.II.color, fontSize: 32, fontWeight: 700, opacity: 0.4 }} />
          {/* Cuadrante I (arriba-der): fuerte + rapido */}
          <ReferenceArea x1={xT} x2={4} y1={yT} y2={yMax} fill={GE_QUADRANT_INFO.I.color} fillOpacity={0.12} stroke="none" label={{ value: "I", position: "center", fill: GE_QUADRANT_INFO.I.color, fontSize: 32, fontWeight: 700, opacity: 0.4 }} />
          {/* Cuadrante III (abajo-izq): debil + lento */}
          <ReferenceArea x1={1} x2={xT} y1={0} y2={yT} fill={GE_QUADRANT_INFO.III.color} fillOpacity={0.12} stroke="none" label={{ value: "III", position: "center", fill: GE_QUADRANT_INFO.III.color, fontSize: 32, fontWeight: 700, opacity: 0.4 }} />
          {/* Cuadrante IV (abajo-der): fuerte + lento */}
          <ReferenceArea x1={xT} x2={4} y1={0} y2={yT} fill={GE_QUADRANT_INFO.IV.color} fillOpacity={0.12} stroke="none" label={{ value: "IV", position: "center", fill: GE_QUADRANT_INFO.IV.color, fontSize: 32, fontWeight: 700, opacity: 0.4 }} />

          {/* Lineas divisorias */}
          <ReferenceLine x={xT} stroke="#64748b" strokeWidth={1.5} />
          <ReferenceLine y={yT} stroke="#64748b" strokeWidth={1.5} />

          <RTooltip
            cursor={false}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-md border bg-background p-2 text-xs shadow">
                  <div className="font-semibold">Tu posicion</div>
                  <div>Crecimiento = {state.growth?.toFixed(1)}%</div>
                  <div>Posicion = {state.position?.toFixed(1)}</div>
                  <div className="text-muted-foreground mt-1">Cuadrante {quadrant}</div>
                </div>
              ) : null
            }
          />

          <Scatter data={[{ x: state.position!, y: state.growth!, label: `Tu posición (${state.position?.toFixed(1)} · ${state.growth?.toFixed(1)} %)` }]} fill={userInfo.color} stroke="#ffffff" strokeWidth={2} shape="circle">
            <Cell key="0" />
            <LabelList dataKey="label" content={(p: { x?: number | string; y?: number | string; width?: number | string; value?: unknown }) => (
              <text x={Number(p.x) + Number(p.width ?? 0) / 2} y={Number(p.y) - 10} textAnchor="middle" fill="#2c2e35" fontSize={12} fontWeight={600}>
                {String(p.value ?? "")}
              </text>
            )} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground text-center">
        <div>Debil ←————————————————→ Fuerte</div>
        <div>Lento ↓————————————————↑ Rapido</div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 3
// ───────────────────────────────────────────────────────────────────────

function Paso3({
  state, quadrant, cycleId, peyeaQuadrant, allStrategies, onBack,
}: {
  state: GeState;
  quadrant: GeQuadrant;
  cycleId: string;
  peyeaQuadrant: string | null;
  allStrategies: Array<{ type: string | null }>;
  onBack: () => void;
}) {
  const info = GE_QUADRANT_INFO[quadrant];
  const strategies = STRATEGIES_BY_QUADRANT[quadrant];
  const top3Codes = new Set(strategies.slice(0, 3).map((s) => s.code));
  const [retained, setRetained] = useState<Set<string>>(top3Codes);

  const save = trpc.ge.saveRetainedStrategies.useMutation({
    onSuccess: (r) => toast.success(`${r.count} estrategia(s) GE guardadas`),
  });

  function toggle(code: string) {
    const n = new Set(retained);
    if (n.has(code)) n.delete(code); else n.add(code);
    setRetained(n);
  }

  function handleSave() {
    const sel = strategies
      .filter((s) => retained.has(s.code))
      .map((s) => ({ code: s.code, name: s.name, description: s.description, priority: s.priority }));
    save.mutate({ cycleId, strategies: sel });
  }

  // Conteo de estrategias por matriz
  const matrixCounts = {
    foda: allStrategies.filter((s) => ["FO", "FA", "DO", "DA"].includes(s.type ?? "")).length,
    peyea: allStrategies.filter((s) => s.type === "PEYEA").length,
    ie: allStrategies.filter((s) => s.type === "IE").length,
    ge: retained.size,
  };

  // Alertas
  const alertas: string[] = [];
  if (quadrant === "I") alertas.push("Estas en el cuadrante mas favorable. Aprovecha la ventana de oportunidad — invierte en las estrategias top con confianza.");
  if (quadrant === "III") alertas.push("Las estrategias defensivas no son fracaso. Bien ejecutadas, generan caja para nuevas apuestas.");
  const coherence = compareWithOtherMatrices(quadrant, peyeaQuadrant);
  if (!coherence.aligned && peyeaQuadrant) alertas.push(coherence.message);

  return (
    <div className="space-y-6">
      {/* Identidad */}
      <Card style={{ borderColor: info.border, backgroundColor: info.bg }}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex size-16 items-center justify-center rounded-full" style={{ backgroundColor: info.color }}>
              <Target className="size-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: info.color }}>{info.label}</h2>
              <p className="text-sm text-muted-foreground">
                {info.subtitle} · Crecimiento {state.growth!.toFixed(1)}% · Posicion {state.position!.toFixed(1)}
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed mt-4 text-foreground/85">{info.description}</p>
        </CardContent>
      </Card>

      {/* Alertas */}
      {alertas.map((a, i) => (
        <div key={i} className="rounded-md border border-amber-200/60 bg-transparent dark:border-amber-900/30 dark:bg-transparent p-3 text-sm flex gap-2">
          <AlertTriangle className="size-4 shrink-0 text-amber-700 mt-0.5" />
          <span className="leading-relaxed">{a}</span>
        </div>
      ))}

      {/* Estrategias */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Estrategias recomendadas (ordenadas por prioridad)
            <span className="text-xs text-muted-foreground font-normal ml-2">
              {retained.size} de {strategies.length} retenidas · top 3 marcadas por defecto
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {strategies.map((s) => {
              const isRetained = retained.has(s.code);
              const isTop3 = s.priority <= 3;
              return (
                <label key={s.code} className={`rounded-lg border p-3 cursor-pointer transition-all ${isRetained ? "border-primary/40 bg-primary/5 dark:bg-primary/10" : "hover:border-foreground/30"}`} style={isTop3 ? { borderLeftWidth: 4, borderLeftColor: info.color } : undefined}>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={isRetained} onChange={() => toggle(s.code)} className="mt-1 accent-blue-600 size-4 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: info.color }}>
                          {s.priority}
                        </span>
                        <TrendingUp className="size-4" style={{ color: info.color }} />
                        <span className="text-sm font-semibold">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{s.code}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Comparacion con otras matrices */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resumen del analisis estrategico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <MatrixSummary label="FODA Cruzado" count={matrixCounts.foda} color="#185fa5" />
            <MatrixSummary label="PEYEA" count={matrixCounts.peyea} color="#2c2e35" />
            <MatrixSummary label="IE" count={matrixCounts.ie} color="#1e7f4f" />
            <MatrixSummary label="GE (esta)" count={matrixCounts.ge} color={info.color} />
          </div>
          <Separator className="my-2" />
          {peyeaQuadrant && (
            <p className="text-muted-foreground">PEYEA sugirio postura: <strong className="text-foreground capitalize">{peyeaQuadrant}</strong></p>
          )}
          <p className="text-muted-foreground">Esta matriz GE sugiere: <strong className="text-foreground">{info.label}</strong></p>
          <p className="text-xs text-muted-foreground italic mt-2">
            Las estrategias que coincidan en multiples matrices ganan solidez en la Matriz de Decision (siguiente paso).
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4 mr-1.5" /> Editar variables
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{retained.size} estrategia(s) retenida(s)</span>
          <Button size="sm" onClick={handleSave} disabled={save.isPending || retained.size === 0}>
            <Save className="size-4 mr-1.5" />
            {save.isPending ? "Guardando..." : "Guardar y continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MatrixSummary({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="rounded-md border p-2 text-center" style={{ borderColor: `${color}55`, backgroundColor: `${color}10` }}>
      <div className="text-[10px] font-medium" style={{ color }}>{label}</div>
      <div className="text-xl font-bold tabular-nums">{count}</div>
      <div className="text-[10px] text-muted-foreground">estrategias</div>
    </div>
  );
}
