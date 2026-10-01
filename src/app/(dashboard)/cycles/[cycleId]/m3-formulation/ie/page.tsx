"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  REGION_INFO,
  STRATEGIES_BY_REGION,
  CELL_TOOLTIPS,
  celdaFromScores,
  regionFromCell,
  cellMeaning,
  tramo,
  tramoLabel,
  type IeCell,
  type IeRegion,
} from "@/lib/ie-catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  Tooltip as RTooltip, ReferenceLine, ReferenceArea, Cell, LabelList,
} from "recharts";
import {
  Check, ChevronRight, ArrowLeft, ArrowRight, AlertTriangle, Info,
  Save, Target, TrendingUp, Grid3X3,
} from "lucide-react";
import { toast } from "sonner";

export default function IePage() {
  const params = useParams();
  const cycleId = params.cycleId as string;
  const [paso, setPaso] = useState<1 | 2 | 3>(1);

  const { data: mefi, isLoading: lMefi } = trpc.mefi.getSummary.useQuery({ cycleId });
  const { data: mefe, isLoading: lMefe } = trpc.mefe.getSummary.useQuery({ cycleId });
  const { data: peyea } = trpc.peyea.get.useQuery({ cycleId });
  const { data: allStrategies } = trpc.strategy.list.useQuery({ cycleId });

  if (lMefi || lMefe) return <div className="p-6 text-sm text-muted-foreground">Cargando Matriz IE...</div>;

  // Decidir si esta lista para usar (necesita al menos 1 factor en cada lado)
  const mefiOk = !!mefi && mefi.count > 0;
  const mefeOk = !!mefe && mefe.count > 0;

  if (!mefiOk || !mefeOk) {
    return (
      <div className="container mx-auto max-w-3xl p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Matriz IE (Interna-Externa)</h1>
          <p className="text-sm text-muted-foreground">Posiciona tu empresa cruzando MEFI y MEFE</p>
        </div>
        <div className="rounded-xl border border-amber-200/60 bg-transparent dark:border-amber-900/40 dark:bg-transparent p-5">
          <div className="flex gap-3">
            <AlertTriangle className="size-5 shrink-0 text-amber-700 mt-0.5" />
            <div>
              <p className="font-medium mb-1">MEFI o MEFE incompletas</p>
              <p className="text-sm text-muted-foreground mb-3">
                Para usar la Matriz IE necesitas completar primero la MEFI y la MEFE en M2 · Diagnostico.
              </p>
              <div className="flex gap-2">
                {!mefiOk && (
                  <Link href={`/cycles/${cycleId}/m2-diagnosis/mefi`}>
                    <Button size="sm">Ir a MEFI</Button>
                  </Link>
                )}
                {!mefeOk && (
                  <Link href={`/cycles/${cycleId}/m2-diagnosis/mefe`}>
                    <Button size="sm" variant={mefiOk ? "default" : "outline"}>Ir a MEFE</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mefiScore = clamp(mefi.ppt || mefi.pptFinal || 2.5, 1, 4);
  const mefeScore = clamp(mefe.ppt || mefe.pptFinal || 2.5, 1, 4);
  const cell = celdaFromScores(mefiScore, mefeScore);
  const region = regionFromCell(cell);

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Matriz IE (Interna-Externa)</h1>
        <p className="text-sm text-muted-foreground">
          Cruce de MEFI y MEFE en cuadricula 3x3 con prescripcion de estrategias por region.
        </p>
      </header>

      <Stepper paso={paso} setPaso={setPaso} />

      {paso === 1 && (
        <Paso1
          mefi={{ score: mefiScore, fortalezas: mefi.fortalezas, debilidades: mefi.debilidades, count: mefi.count }}
          mefe={{ score: mefeScore, oportunidades: mefe.oportunidades, amenazas: mefe.amenazas, count: mefe.count }}
          cycleId={cycleId}
          onNext={() => setPaso(2)}
        />
      )}
      {paso === 2 && (
        <Paso2
          mefiScore={mefiScore}
          mefeScore={mefeScore}
          cell={cell}
          region={region}
          cycleId={cycleId}
          onBack={() => setPaso(1)}
          onNext={() => setPaso(3)}
        />
      )}
      {paso === 3 && (
        <Paso3
          mefiScore={mefiScore}
          mefeScore={mefeScore}
          cell={cell}
          region={region}
          cycleId={cycleId}
          peyeaQuadrant={peyea?.quadrant ?? null}
          allStrategies={(allStrategies ?? []) as Array<{ description: string; type: string | null }>}
          onBack={() => setPaso(2)}
        />
      )}
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ───────────────────────────────────────────────────────────────────────
// STEPPER
// ───────────────────────────────────────────────────────────────────────

function Stepper({ paso, setPaso }: { paso: 1 | 2 | 3; setPaso: (p: 1 | 2 | 3) => void }) {
  const steps = [
    { id: 1, label: "Revisar puntajes" },
    { id: 2, label: "Ver matriz IE" },
    { id: 3, label: "Estrategias" },
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
// PASO 1 — REVISAR PUNTAJES
// ───────────────────────────────────────────────────────────────────────

function Paso1({
  mefi, mefe, cycleId, onNext,
}: {
  mefi: { score: number; fortalezas: number; debilidades: number; count: number };
  mefe: { score: number; oportunidades: number; amenazas: number; count: number };
  cycleId: string;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/15 bg-primary/5 dark:border-primary/40 dark:bg-primary/10 p-4">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Como funciona la Matriz IE</p>
            <p className="text-muted-foreground">
              La Matriz IE se construye automaticamente con los puntajes de tu MEFI (analisis interno) y
              MEFE (analisis externo). Aqui solo revisas que los datos sean correctos antes de ver el resultado.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScoreCard
          title="MEFI · Factores Internos"
          score={mefi.score}
          interpretation={interpretMefi(mefi.score)}
          color="#1e7f4f"
          desglose={`${mefi.fortalezas} fortalezas · ${mefi.debilidades} debilidades · ${mefi.count} factores`}
          link={`/cycles/${cycleId}/m2-diagnosis/mefi`}
        />
        <ScoreCard
          title="MEFE · Factores Externos"
          score={mefe.score}
          interpretation={interpretMefe(mefe.score)}
          color="#185fa5"
          desglose={`${mefe.oportunidades} oportunidades · ${mefe.amenazas} amenazas · ${mefe.count} factores`}
          link={`/cycles/${cycleId}/m2-diagnosis/mefe`}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={onNext} className="ml-auto">
          Continuar a la matriz <ArrowRight className="size-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

function interpretMefi(score: number): string {
  if (score < 2) return "Posicion interna debil";
  if (score < 3) return "Posicion interna media";
  return "Posicion interna fuerte";
}

function interpretMefe(score: number): string {
  if (score < 2) return "Entorno externo desfavorable";
  if (score < 3) return "Entorno externo neutro";
  return "Entorno externo favorable";
}

function ScoreCard({
  title, score, interpretation, color, desglose, link,
}: {
  title: string;
  score: number;
  interpretation: string;
  color: string;
  desglose: string;
  link: string;
}) {
  // marcador en la barra (1-4 → 0-100%)
  const pct = ((score - 1) / 3) * 100;
  return (
    <Card style={{ borderColor: `${color}55` }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="outline" className="text-[10px] font-normal">Heredado de M2</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-3">
          <div className="text-4xl font-bold tabular-nums" style={{ color }}>
            {score.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">/ 4.00</div>
        </div>
        <div className="text-sm text-muted-foreground">{interpretation}</div>
        <div className="relative h-2 rounded-full bg-muted">
          <div className="absolute top-0 bottom-0 left-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.3 }} />
          <div className="absolute top-1/2 -translate-y-1/2 size-4 rounded-full border-2 bg-background" style={{ left: `calc(${pct}% - 8px)`, borderColor: color }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>1.0 Bajo</span><span>2.0</span><span>3.0</span><span>4.0 Alto</span>
        </div>
        <p className="text-xs text-muted-foreground">{desglose}</p>
        <Link href={link}>
          <Button variant="outline" size="sm" className="w-full">
            Ver detalle <ChevronRight className="size-3.5 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 2 — VER MATRIZ IE
// ───────────────────────────────────────────────────────────────────────

function Paso2({
  mefiScore, mefeScore, cell, region, cycleId, onBack, onNext,
}: {
  mefiScore: number;
  mefeScore: number;
  cell: IeCell;
  region: IeRegion;
  cycleId: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const regionInfo = REGION_INFO[region];

  // Detectar si esta cerca de una frontera
  const nearBorder =
    Math.abs(mefiScore - 2) < 0.1 || Math.abs(mefiScore - 3) < 0.1 ||
    Math.abs(mefeScore - 2) < 0.1 || Math.abs(mefeScore - 3) < 0.1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Grid3X3 className="size-4" />
              Cuadricula IE 3x3
            </CardTitle>
          </CardHeader>
          <CardContent>
            <IeChart mefiScore={mefiScore} mefeScore={mefeScore} cell={cell} />
            <div className="mt-3 text-[11px] text-muted-foreground text-center">
              Eje X = MEFI (interno) · Eje Y = MEFE (externo) · El punto marca tu posición
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-3">
        <Card style={{ borderColor: regionInfo.border, backgroundColor: regionInfo.bg }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1" style={{ color: regionInfo.color }}>
              Celda {cell}
            </div>
            <div className="text-sm font-medium mb-2" style={{ color: regionInfo.color }}>
              Region · {regionInfo.label}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{cellMeaning(cell)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Desglose</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label={`MEFI ${mefiScore.toFixed(2)}`} value={`tramo ${tramo(mefiScore)}`} sub={tramoLabel(tramo(mefiScore))} />
            <Row label={`MEFE ${mefeScore.toFixed(2)}`} value={`tramo ${tramo(mefeScore)}`} sub={tramoLabel(tramo(mefeScore))} />
            <Separator className="my-2" />
            <Row label="Interseccion" value={`Celda ${cell}`} />
            <Row label="Region" value={regionInfo.label} color={regionInfo.color} />
          </CardContent>
        </Card>

        {nearBorder && (
          <div className="rounded-md border border-amber-200/60 bg-transparent dark:border-amber-900/30 dark:bg-transparent p-3 text-xs flex gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-700 mt-0.5" />
            <span>Tu puntaje esta cerca de la frontera entre tramos. Considera revisar las calificaciones para confirmar la celda.</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Link href={`/cycles/${cycleId}/m2-diagnosis/mefi`}>
            <Button variant="outline" size="sm">Editar MEFI</Button>
          </Link>
          <Link href={`/cycles/${cycleId}/m2-diagnosis/mefe`}>
            <Button variant="outline" size="sm">Editar MEFE</Button>
          </Link>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onBack} className="flex-1">
            <ArrowLeft className="size-4 mr-1.5" /> Atras
          </Button>
          <Button size="sm" onClick={onNext} className="flex-1">
            Estrategias <ArrowRight className="size-4 ml-1.5" />
          </Button>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="font-medium" style={color ? { color } : undefined}>{value}</span>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// IE CHART
// ───────────────────────────────────────────────────────────────────────

function IeChart({ mefiScore, mefeScore, cell }: { mefiScore: number; mefeScore: number; cell: IeCell }) {
  const userInfo = REGION_INFO[regionFromCell(cell)];
  return (
    <div className="w-full h-[460px] md:h-[520px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 30, right: 30, bottom: 36, left: 32 }}>
          <XAxis
            type="number" dataKey="x" domain={[1, 4]}
            ticks={[1, 2, 3, 4]}
            tickFormatter={(v) => v === 1 ? "1.0 Debil" : v === 2 ? "2.0" : v === 3 ? "3.0" : "4.0 Fuerte"}
            tick={{ fontSize: 11, fill: "#6b6b6b" }} tickLine={false} axisLine={{ stroke: "rgba(139, 21, 16,0.14)" }}
            reversed
            label={{ value: "MEFI (interno)", position: "insideBottom", offset: -14, style: { fontSize: 11, fill: "#6b6b6b", textAnchor: "middle" } }}
          />
          <YAxis
            type="number" dataKey="y" domain={[1, 4]}
            ticks={[1, 2, 3, 4]}
            tickFormatter={(v) => v === 1 ? "1.0 Bajo" : v === 2 ? "2.0" : v === 3 ? "3.0" : "4.0 Alto"}
            tick={{ fontSize: 11, fill: "#6b6b6b" }} tickLine={false} axisLine={{ stroke: "rgba(139, 21, 16,0.14)" }}
            label={{ value: "MEFE (externo)", angle: -90, position: "insideLeft", offset: 0, style: { fontSize: 11, fill: "#6b6b6b", textAnchor: "middle" } }}
          />
          <ZAxis range={[400, 400]} />

          {/* 9 cuadrantes coloreados segun region */}
          {/* Region I (crecer): celdas I, II, IV */}
          <ReferenceArea x1={3} x2={4} y1={3} y2={4} fill={REGION_INFO.crecer.color} fillOpacity={0.10} stroke="none" label={{ value: "I", position: "center", fill: REGION_INFO.crecer.color, fontSize: 28, fontWeight: 700, opacity: 0.4 }} />
          <ReferenceArea x1={2} x2={3} y1={3} y2={4} fill={REGION_INFO.crecer.color} fillOpacity={0.10} stroke="none" label={{ value: "II", position: "center", fill: REGION_INFO.crecer.color, fontSize: 28, fontWeight: 700, opacity: 0.4 }} />
          <ReferenceArea x1={3} x2={4} y1={2} y2={3} fill={REGION_INFO.crecer.color} fillOpacity={0.10} stroke="none" label={{ value: "IV", position: "center", fill: REGION_INFO.crecer.color, fontSize: 28, fontWeight: 700, opacity: 0.4 }} />

          {/* Region II (conservar): celdas III, V, VII */}
          <ReferenceArea x1={1} x2={2} y1={3} y2={4} fill={REGION_INFO.conservar.color} fillOpacity={0.10} stroke="none" label={{ value: "III", position: "center", fill: REGION_INFO.conservar.color, fontSize: 28, fontWeight: 700, opacity: 0.4 }} />
          <ReferenceArea x1={2} x2={3} y1={2} y2={3} fill={REGION_INFO.conservar.color} fillOpacity={0.10} stroke="none" label={{ value: "V", position: "center", fill: REGION_INFO.conservar.color, fontSize: 28, fontWeight: 700, opacity: 0.4 }} />
          <ReferenceArea x1={3} x2={4} y1={1} y2={2} fill={REGION_INFO.conservar.color} fillOpacity={0.10} stroke="none" label={{ value: "VII", position: "center", fill: REGION_INFO.conservar.color, fontSize: 28, fontWeight: 700, opacity: 0.4 }} />

          {/* Region III (cosechar): celdas VI, VIII, IX */}
          <ReferenceArea x1={1} x2={2} y1={2} y2={3} fill={REGION_INFO.cosechar.color} fillOpacity={0.10} stroke="none" label={{ value: "VI", position: "center", fill: REGION_INFO.cosechar.color, fontSize: 28, fontWeight: 700, opacity: 0.4 }} />
          <ReferenceArea x1={2} x2={3} y1={1} y2={2} fill={REGION_INFO.cosechar.color} fillOpacity={0.10} stroke="none" label={{ value: "VIII", position: "center", fill: REGION_INFO.cosechar.color, fontSize: 28, fontWeight: 700, opacity: 0.4 }} />
          <ReferenceArea x1={1} x2={2} y1={1} y2={2} fill={REGION_INFO.cosechar.color} fillOpacity={0.10} stroke="none" label={{ value: "IX", position: "center", fill: REGION_INFO.cosechar.color, fontSize: 28, fontWeight: 700, opacity: 0.4 }} />

          {/* Lineas divisorias */}
          <ReferenceLine x={2} stroke="#64748b" strokeWidth={1.5} />
          <ReferenceLine x={3} stroke="#64748b" strokeWidth={1.5} />
          <ReferenceLine y={2} stroke="#64748b" strokeWidth={1.5} />
          <ReferenceLine y={3} stroke="#64748b" strokeWidth={1.5} />

          <RTooltip
            cursor={false}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-md border bg-background p-2 text-xs shadow">
                  <div className="font-semibold">Tu posicion</div>
                  <div>MEFI = {mefiScore.toFixed(2)}</div>
                  <div>MEFE = {mefeScore.toFixed(2)}</div>
                  <div className="text-muted-foreground mt-1">{CELL_TOOLTIPS[cell].meaning}</div>
                </div>
              ) : null
            }
          />

          <Scatter data={[{ x: mefiScore, y: mefeScore, label: `Tu posición (MEFI ${mefiScore.toFixed(2)} · MEFE ${mefeScore.toFixed(2)})` }]} fill={userInfo.color} stroke="#ffffff" strokeWidth={2} shape="circle">
            <Cell key="0" />
            <LabelList dataKey="label" content={(p: { x?: number | string; y?: number | string; width?: number | string; value?: unknown }) => (
              <text x={Number(p.x) + Number(p.width ?? 0) / 2} y={Number(p.y) - 10} textAnchor="middle" fill="#2c2e35" fontSize={12} fontWeight={600}>
                {String(p.value ?? "")}
              </text>
            )} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 3 — ESTRATEGIAS
// ───────────────────────────────────────────────────────────────────────

function Paso3({
  mefiScore, mefeScore, cell, region, cycleId, peyeaQuadrant, allStrategies, onBack,
}: {
  mefiScore: number;
  mefeScore: number;
  cell: IeCell;
  region: IeRegion;
  cycleId: string;
  peyeaQuadrant: string | null;
  allStrategies: Array<{ description: string; type: string | null }>;
  onBack: () => void;
}) {
  const info = REGION_INFO[region];
  const strategies = STRATEGIES_BY_REGION[region];
  const [retained, setRetained] = useState<Set<string>>(new Set(strategies.map((s) => s.code))); // todas marcadas por defecto

  const save = trpc.ie.saveRetainedStrategies.useMutation({
    onSuccess: (r) => toast.success(`${r.count} estrategia(s) IE guardadas`),
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

  // Alertas contextuales
  const alertas: string[] = [];
  if (cell === "I") alertas.push("Estas en el escenario mas favorable (Celda I). Aprovecha esta ventana de oportunidad para invertir y crecer agresivamente.");
  if (region === "cosechar") alertas.push("Las estrategias defensivas no significan fracaso. Bien ejecutadas, pueden generar valor en el corto plazo y financiar la transicion hacia nuevos negocios.");

  // Comparacion con otras matrices
  const peyeaStrategies = allStrategies.filter((s) => s.type === "PEYEA");
  const fodaStrategies = allStrategies.filter((s) => ["FO", "FA", "DO", "DA"].includes(s.type ?? "") || ["FO", "FA", "DO", "DA"].includes(s.type ?? ""));

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
                Celda {cell} · MEFI {mefiScore.toFixed(2)} · MEFE {mefeScore.toFixed(2)} · {info.subtitle}
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed mt-4 text-foreground/85">{info.description}</p>
        </CardContent>
      </Card>

      {/* Alertas */}
      {alertas.map((a, i) => (
        <div key={i} className="rounded-md border border-amber-200/60 bg-transparent dark:border-amber-900/30 dark:bg-transparent p-3 text-sm flex gap-2">
          <Info className="size-4 shrink-0 text-amber-700 mt-0.5" />
          <span className="leading-relaxed">{a}</span>
        </div>
      ))}

      {/* Estrategias */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Estrategias recomendadas
            <span className="text-xs text-muted-foreground font-normal ml-2">
              {retained.size} de {strategies.length} retenidas
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {strategies.map((s) => {
              const isRetained = retained.has(s.code);
              const priColor = s.priority === "alta" ? "#b3261e" : s.priority === "media" ? "#b45309" : "#1e7f4f";
              return (
                <label key={s.code} className={`rounded-lg border p-3 cursor-pointer transition-all ${isRetained ? "border-primary/40 bg-primary/5 dark:bg-primary/10" : "hover:border-foreground/30"}`}>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={isRetained} onChange={() => toggle(s.code)} className="mt-1 accent-blue-600 size-4 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <TrendingUp className="size-4" style={{ color: info.color }} />
                        <span className="text-sm font-semibold">{s.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{s.code}</span>
                        <Badge variant="outline" className="text-[10px]" style={{ color: priColor, borderColor: priColor }}>
                          Prioridad {s.priority}
                        </Badge>
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
          <CardTitle className="text-sm">Coherencia con otras matrices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {peyeaQuadrant ? (
            <p className="text-muted-foreground">PEYEA sugirio postura: <strong className="text-foreground capitalize">{peyeaQuadrant}</strong></p>
          ) : (
            <p className="text-muted-foreground italic text-xs">PEYEA aun no calculado.</p>
          )}
          <p className="text-muted-foreground">Esta matriz IE sugiere region: <strong className="text-foreground">{info.label}</strong></p>
          <p className="text-muted-foreground">Estrategias generadas en FODA Cruzado: <strong className="text-foreground">{fodaStrategies.length}</strong></p>
          <p className="text-muted-foreground">Estrategias retenidas en PEYEA: <strong className="text-foreground">{peyeaStrategies.length}</strong></p>
          <Separator className="my-2" />
          <p className="text-xs text-muted-foreground italic">
            Las estrategias que coincidan en multiples matrices (FODA + PEYEA + IE) ganan solidez en la Matriz de Decision.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4 mr-1.5" /> Atras
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
