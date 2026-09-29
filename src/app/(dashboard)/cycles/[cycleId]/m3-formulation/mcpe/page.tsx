"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Check, ChevronRight, Info, ArrowLeft, ArrowRight, AlertTriangle,
  Sparkles, Trophy, Medal, ArrowRightCircle, BarChart3,
} from "lucide-react";

type FactorType = "F" | "D" | "O" | "A";
interface FactorOut { id: string; code: string; type: FactorType; text: string; weight: number }
interface StrategyOut {
  id: string; eCode: string; text: string;
  totalAppearances: number;
  olpLinks: Array<{ olpId: string }>;
}
interface RatingOut { factorId: string; consolidatedId: string; pa: number | null; pta: number | null; origin: string; justification: string | null }
interface McpeSetup {
  analysisId: string | null;
  progress: number;
  ratedCells: number;
  totalCells: number;
  factors: { fortalezas: FactorOut[]; oportunidades: FactorOut[]; debilidades: FactorOut[]; amenazas: FactorOut[]; all: FactorOut[] };
  strategies: StrategyOut[];
  ratings: RatingOut[];
  ptaByStrategy: Record<string, number>;
}

const TYPE_INFO: Record<FactorType, { label: string; color: string; bg: string; border: string }> = {
  F: { label: "Fortalezas", color: "#4ade80", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.35)" },
  D: { label: "Debilidades", color: "#F43F5E", bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.35)" },
  O: { label: "Oportunidades", color: "#2563EB", bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.35)" },
  A: { label: "Amenazas", color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.35)" },
};

const PA_COLOR: Record<string, { bg: string; text: string }> = {
  "1": { bg: "transparent", text: "#ee9c9c" },
  "2": { bg: "transparent", text: "#f0c283" },
  "3": { bg: "transparent", text: "#a8cc8d" },
  "4": { bg: "transparent", text: "#85c9a8" },
};

// ───────────────────────────────────────────────────────────────────────
// MAIN
// ───────────────────────────────────────────────────────────────────────

export default function McpePage() {
  const params = useParams();
  const cycleId = params.cycleId as string;
  const [paso, setPaso] = useState<1 | 2 | 3>(1);

  const { data: setup, isLoading } = trpc.mcpe.getSetup.useQuery({ cycleId });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Cargando MCPE...</div>;
  if (!setup) return <div className="p-6 text-sm text-muted-foreground">Sin datos</div>;

  const fodaTotal = setup.factors.all.length;

  if (fodaTotal === 0 || setup.strategies.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">MCPE</h1>
          <p className="text-sm text-muted-foreground">Matriz Cuantitativa de Planeamiento Estrategico</p>
        </div>
        <div className="rounded-xl border border-amber-200/60 bg-transparent p-5">
          <div className="flex gap-3">
            <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Antes de usar la MCPE necesitas:</p>
              <ul className="text-sm text-muted-foreground mb-3 space-y-1 list-disc pl-4">
                {fodaTotal === 0 && <li>Completar el FODA Consolidado en M2 · Diagnostico</li>}
                {setup.strategies.length === 0 && <li>Retener estrategias en la Matriz de Decision (MD)</li>}
              </ul>
              <div className="flex gap-2">
                {fodaTotal === 0 && <Link href={`/cycles/${cycleId}/m2-diagnosis/foda`}><Button size="sm">Ir a FODA</Button></Link>}
                {setup.strategies.length === 0 && <Link href={`/cycles/${cycleId}/m3-formulation/md`}><Button size="sm" variant={fodaTotal === 0 ? "outline" : "default"}>Ir a MD</Button></Link>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">MCPE — Matriz Cuantitativa</h1>
        <p className="text-sm text-muted-foreground">
          Prioriza estrategias calificando que tan atractiva es cada una frente a tus factores FODA.
        </p>
      </header>

      <Stepper paso={paso} setPaso={setPaso} />

      {paso === 1 && <Paso1 setup={setup} cycleId={cycleId} onNext={() => setPaso(2)} />}
      {paso === 2 && <Paso2 setup={setup} cycleId={cycleId} onBack={() => setPaso(1)} onNext={() => setPaso(3)} />}
      {paso === 3 && <Paso3 setup={setup} cycleId={cycleId} onBack={() => setPaso(2)} />}
    </div>
  );
}

function Stepper({ paso, setPaso }: { paso: 1 | 2 | 3; setPaso: (p: 1 | 2 | 3) => void }) {
  const steps = [{ id: 1, label: "Preparar" }, { id: 2, label: "Calificar" }, { id: 3, label: "Resultados" }] as const;
  return (
    <nav aria-label="Progreso" className="print:hidden">
      <ol className="flex items-center justify-between gap-2 max-w-3xl mx-auto">
        {steps.map((s, i) => {
          const active = paso === s.id;
          const done = paso > s.id;
          const clickable = s.id <= paso;
          return (
            <li key={s.id} className="flex items-center gap-2 flex-1">
              <button type="button" disabled={!clickable} onClick={() => clickable && setPaso(s.id)} className={`flex items-center gap-2 group ${clickable ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
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

function Paso1({ setup, cycleId, onNext }: { setup: McpeSetup; cycleId: string; onNext: () => void }) {
  const internalWeight = [...setup.factors.fortalezas, ...setup.factors.debilidades].reduce((s, f) => s + f.weight, 0);
  const externalWeight = [...setup.factors.oportunidades, ...setup.factors.amenazas].reduce((s, f) => s + f.weight, 0);
  const totalCells = setup.totalCells;
  const estimatedMin = Math.ceil(totalCells * 0.15); // ~9 segundos por celda

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/25/60 bg-primary/10/60 p-4">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Como funciona la MCPE</p>
            <p className="text-muted-foreground">
              Vas a priorizar tus estrategias calificando que tan atractiva es cada una frente a los factores
              de tu FODA. Usa una escala 1-4. Las estrategias con mayor puntaje son las que debes ejecutar primero.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Factores del FODA Consolidado</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="text-2xl font-bold">{setup.factors.all.length}</div>
            <div className="text-xs text-muted-foreground">factores entrarán al análisis</div>
            <Separator className="my-2" />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1"><span className="size-2 rounded-full bg-transparent0" /> {setup.factors.fortalezas.length} Fortalezas</div>
              <div className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary/100" /> {setup.factors.oportunidades.length} Oportunidades</div>
              <div className="flex items-center gap-1"><span className="size-2 rounded-full bg-transparent0" /> {setup.factors.debilidades.length} Debilidades</div>
              <div className="flex items-center gap-1"><span className="size-2 rounded-full bg-transparent0" /> {setup.factors.amenazas.length} Amenazas</div>
            </div>
            <div className="text-xs text-muted-foreground pt-2">
              Suma pesos internos: {internalWeight.toFixed(2)} · externos: {externalWeight.toFixed(2)}
            </div>
            <Link href={`/cycles/${cycleId}/m2-diagnosis/foda`}><Button variant="outline" size="sm" className="mt-2">Editar FODA</Button></Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Estrategias retenidas (de la MD)</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="text-2xl font-bold">{setup.strategies.length}</div>
            <div className="text-xs text-muted-foreground">estrategias se calificarán</div>
            <Separator className="my-2" />
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {setup.strategies.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-start gap-2 text-xs">
                  <Badge variant="outline" className="font-mono text-[10px] shrink-0">{s.eCode}</Badge>
                  <span className="leading-snug truncate">{s.text}</span>
                </li>
              ))}
              {setup.strategies.length > 5 && <li className="text-[10px] text-muted-foreground">+{setup.strategies.length - 5} mas</li>}
            </ul>
            <Link href={`/cycles/${cycleId}/m3-formulation/md`}><Button variant="outline" size="sm" className="mt-2">Editar seleccion</Button></Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Lo que vas a hacer</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded border p-3">
              <div className="text-2xl font-bold">{totalCells}</div>
              <div className="text-xs text-muted-foreground">celdas a calificar</div>
            </div>
            <div className="rounded border p-3">
              <div className="text-2xl font-bold">~{estimatedMin} min</div>
              <div className="text-xs text-muted-foreground">tiempo estimado</div>
            </div>
          </div>
          <div className="rounded-md border border-primary/25/60 bg-primary/10/40 p-2 text-xs flex gap-2">
            <Sparkles className="size-3.5 shrink-0 text-primary mt-0.5" />
            <span>Tip: en el siguiente paso puedes pedir <strong>sugerencias automaticas</strong> al sistema para acelerar la calificacion.</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex pt-2">
        <Button size="sm" onClick={onNext} className="ml-auto">
          Continuar a calificar <ArrowRight className="size-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 2
// ───────────────────────────────────────────────────────────────────────

function Paso2({ setup, cycleId, onBack, onNext }: { setup: McpeSetup; cycleId: string; onBack: () => void; onNext: () => void }) {
  const utils = trpc.useUtils();
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [hideNA, setHideNA] = useState(false);

  const setRating = trpc.mcpe.setRating.useMutation({
    onSuccess: () => utils.mcpe.getSetup.invalidate({ cycleId }),
  });
  const setBulk = trpc.mcpe.setRatingsBulk.useMutation({
    onSuccess: (r) => { utils.mcpe.getSetup.invalidate({ cycleId }); toast.success(`${r.count} sugerencias aplicadas`); },
  });
  const { data: suggestions, refetch: refetchSuggestions } = trpc.mcpe.suggestRatings.useQuery(
    { cycleId },
    { enabled: false },
  );

  const ratingsMap = useMemo(() => {
    const m = new Map<string, RatingOut>();
    for (const r of setup.ratings) m.set(`${r.factorId}|${r.consolidatedId}`, r);
    return m;
  }, [setup.ratings]);

  function handleSet(factor: FactorOut, strategy: StrategyOut, pa: number | null) {
    setRating.mutate({
      cycleId,
      factorId: factor.id,
      factorType: factor.type,
      consolidatedId: strategy.id,
      pa,
      weight: factor.weight,
    });
  }

  async function handleSuggestAll() {
    const result = await refetchSuggestions();
    if (!result.data || result.data.length === 0) {
      toast.info("No hay sugerencias nuevas — ya calificaste todo");
      return;
    }
    setBulk.mutate({
      cycleId,
      ratings: result.data.map((s) => ({
        factorId: s.factorId,
        factorType: s.factorType,
        consolidatedId: s.consolidatedId,
        pa: s.pa,
        weight: s.weight,
        origin: "suggested",
      })),
    });
  }

  // Filas filtradas
  const groupOrder: FactorType[] = ["F", "O", "D", "A"];
  const groupedFactors: Record<FactorType, FactorOut[]> = {
    F: setup.factors.fortalezas,
    O: setup.factors.oportunidades,
    D: setup.factors.debilidades,
    A: setup.factors.amenazas,
  };

  return (
    <div className="space-y-4">
      {/* Cards de progreso */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
        <Card><CardContent className="p-3"><div className="text-xl font-bold">{setup.factors.all.length}</div><div className="text-[10px] text-muted-foreground">factores</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xl font-bold">{setup.strategies.length}</div><div className="text-[10px] text-muted-foreground">estrategias</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xl font-bold">{setup.totalCells - setup.ratedCells}</div><div className="text-[10px] text-muted-foreground">por calificar</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xl font-bold text-emerald-600">{setup.progress.toFixed(0)}%</div><div className="text-[10px] text-muted-foreground">progreso</div></CardContent></Card>
      </div>

      {/* Barra de acciones */}
      <Card>
        <CardContent className="p-3 flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={handleSuggestAll} disabled={setBulk.isPending}>
            <Sparkles className="size-4 mr-1.5" />
            {setBulk.isPending ? "Aplicando..." : "Sugerir con IA"}
          </Button>
          <button onClick={() => setShowOnlyPending(!showOnlyPending)} className={`text-xs px-2 py-1 rounded border ${showOnlyPending ? "bg-primary text-white border-primary" : ""}`}>
            Solo pendientes
          </button>
          <button onClick={() => setHideNA(!hideNA)} className={`text-xs px-2 py-1 rounded border ${hideNA ? "bg-primary text-white border-primary" : ""}`}>
            Ocultar N/A
          </button>
          <div className="ml-auto flex items-center gap-2 text-[10px]">
            <span>Escala:</span>
            {[1, 2, 3, 4].map((v) => (
              <span key={v} className="inline-block px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: PA_COLOR[String(v)].bg, color: PA_COLOR[String(v)].text }}>{v}</span>
            ))}
            <span>—</span>
            <span className="text-muted-foreground">N/A</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabla principal */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs">
                <th className="text-left p-2 sticky left-0 bg-muted/30 min-w-[280px]">Factor</th>
                <th className="text-center p-2 w-16">Peso</th>
                {setup.strategies.map((s) => (
                  <th key={s.id} className="text-left p-2 min-w-[140px]" title={s.text}>
                    <div className="font-mono text-[10px]">{s.eCode}</div>
                    <div className="text-[10px] text-muted-foreground line-clamp-2">{s.text}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupOrder.map((type) => {
                const factors = groupedFactors[type];
                if (factors.length === 0) return null;
                const ti = TYPE_INFO[type];
                return (
                  <>
                    <tr key={`group-${type}`} style={{ backgroundColor: ti.bg }}>
                      <td colSpan={2 + setup.strategies.length} className="p-2 text-xs font-semibold sticky left-0" style={{ backgroundColor: ti.bg, color: ti.color }}>
                        {ti.label} ({factors.length})
                      </td>
                    </tr>
                    {factors.map((f) => (
                      <tr key={f.id} className="border-b hover:bg-muted/10">
                        <td className="p-2 sticky left-0 bg-background">
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="font-mono text-[10px] shrink-0" style={{ color: ti.color, borderColor: ti.border }}>{f.code}</Badge>
                            <span className="text-xs leading-snug">{f.text}</span>
                          </div>
                        </td>
                        <td className="p-2 text-center text-xs tabular-nums">{f.weight.toFixed(2)}</td>
                        {setup.strategies.map((s) => {
                          const r = ratingsMap.get(`${f.id}|${s.id}`);
                          const isPending = !r;
                          if (showOnlyPending && !isPending) {
                            return <td key={s.id} className="p-2 opacity-30"><span className="text-[10px] text-muted-foreground">—</span></td>;
                          }
                          if (hideNA && r && r.pa === null) {
                            return <td key={s.id} className="p-2 opacity-30"><span className="text-[10px] text-muted-foreground">N/A</span></td>;
                          }
                          return (
                            <RatingCell
                              key={s.id}
                              rating={r}
                              onChange={(pa) => handleSet(f, s, pa)}
                              isSuggested={r?.origin === "suggested"}
                            />
                          );
                        })}
                      </tr>
                    ))}
                  </>
                );
              })}
              {/* Totales */}
              <tr className="border-t-2 bg-primary/10 dark:bg-primary/90/30">
                <td className="p-2 sticky left-0 bg-primary/10 dark:bg-primary/90/30 font-semibold text-sm">PTA Total</td>
                <td />
                {setup.strategies.map((s) => {
                  const total = setup.ptaByStrategy[s.id] ?? 0;
                  const isLeader = total === Math.max(...Object.values(setup.ptaByStrategy));
                  return (
                    <td key={s.id} className="p-2 text-center">
                      <div className={`font-bold tabular-nums text-base ${isLeader && total > 0 ? "text-emerald-700" : ""}`}>
                        {total.toFixed(2)}
                        {isLeader && total > 0 && <Trophy className="inline size-3.5 ml-1 text-amber-500" />}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="size-4 mr-1.5" /> Atras</Button>
        <Button size="sm" onClick={onNext} className="ml-auto">Ver resultados <ArrowRight className="size-4 ml-1.5" /></Button>
      </div>
    </div>
  );
}

function RatingCell({
  rating, onChange, isSuggested,
}: {
  rating: RatingOut | undefined;
  onChange: (pa: number | null) => void;
  isSuggested: boolean;
}) {
  const pa = rating?.pa;
  const isNa = rating !== undefined && rating.pa === null;
  const isPending = !rating;

  let bg = "transparent";
  let text = "var(--color-text-secondary)";
  if (pa !== undefined && pa !== null) {
    bg = PA_COLOR[String(pa)].bg;
    text = PA_COLOR[String(pa)].text;
  }

  return (
    <td className="p-1.5">
      <div className="space-y-0.5">
        <select
          value={pa === undefined ? "" : pa === null ? "NA" : String(pa)}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") return;
            if (v === "NA") onChange(null);
            else onChange(parseInt(v, 10));
          }}
          className="w-full rounded-md text-sm font-bold text-center border-2 px-1 py-1"
          style={{
            backgroundColor: bg, color: text,
            borderColor: isSuggested ? "#3B82F6" : isPending ? "#F59E0B" : "transparent",
            borderStyle: isPending ? "dashed" : "solid",
          }}
        >
          <option value="" disabled>—</option>
          <option value="NA">—</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
        <div className="text-center text-[9px]">
          {isSuggested && <span className="text-primary">✨ Sugerido</span>}
          {!isSuggested && isPending && <span className="text-amber-600">Pendiente</span>}
          {!isPending && !isSuggested && rating?.pta && (
            <span className="text-muted-foreground tabular-nums">PTA: {rating.pta.toFixed(2)}</span>
          )}
          {isNa && !isSuggested && <span className="text-muted-foreground">N/A</span>}
        </div>
      </div>
    </td>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 3
// ───────────────────────────────────────────────────────────────────────

function Paso3({ setup, cycleId, onBack }: { setup: McpeSetup; cycleId: string; onBack: () => void }) {
  const ranking = useMemo(() => {
    return [...setup.strategies]
      .map((s) => ({
        ...s,
        ptaTotal: setup.ptaByStrategy[s.id] ?? 0,
      }))
      .sort((a, b) => b.ptaTotal - a.ptaTotal);
  }, [setup.strategies, setup.ptaByStrategy]);

  const maxPta = ranking[0]?.ptaTotal ?? 1;

  // Sensibilidad: simular cambio de peso en un factor
  const [sensitivityFactorId, setSensitivityFactorId] = useState<string>(setup.factors.all[0]?.id ?? "");
  const [simulatedWeight, setSimulatedWeight] = useState<number>(setup.factors.all[0]?.weight ?? 0.05);
  const sensitivityFactor = setup.factors.all.find((f) => f.id === sensitivityFactorId);

  const simulatedRanking = useMemo(() => {
    if (!sensitivityFactor) return ranking;
    const delta = simulatedWeight - sensitivityFactor.weight;
    if (Math.abs(delta) < 0.001) return ranking;
    // Recalcular PTA: para cada estrategia, ajustar la contribucion del factor cambiado
    return ranking.map((s) => {
      const r = setup.ratings.find((x) => x.factorId === sensitivityFactor.id && x.consolidatedId === s.id);
      const oldContrib = r?.pa !== null && r?.pa !== undefined ? sensitivityFactor.weight * r.pa : 0;
      const newContrib = r?.pa !== null && r?.pa !== undefined ? simulatedWeight * r.pa : 0;
      return { ...s, ptaTotal: s.ptaTotal - oldContrib + newContrib };
    }).sort((a, b) => b.ptaTotal - a.ptaTotal);
  }, [ranking, simulatedWeight, sensitivityFactor, setup.ratings]);

  // Recomendacion narrativa
  const recommendation = useMemo(() => {
    if (ranking.length === 0) return "Aun no hay estrategias para recomendar.";
    const top = ranking[0];
    const second = ranking[1];
    const last = ranking[ranking.length - 1];
    const lowAttract = ranking.filter((r) => r.ptaTotal < maxPta * 0.6);

    let text = `Empieza con ${top.eCode}`;
    if (second && Math.abs(top.ptaTotal - second.ptaTotal) < 0.3) {
      text += ` y ${second.eCode}. Tienen puntajes muy cercanos (${top.ptaTotal.toFixed(2)} vs ${second.ptaTotal.toFixed(2)}) y son las prioridades claras.`;
    } else {
      text += `. Lidera el ranking con PTA ${top.ptaTotal.toFixed(2)}.`;
    }
    if (lowAttract.length > 0) {
      text += ` Considera posponer o reformular ${lowAttract.map((r) => r.eCode).join(", ")} — su atractivo es bajo (PTA < ${(maxPta * 0.6).toFixed(2)}).`;
    }
    if (ranking.length > 5) {
      text += ` Hay ${ranking.length - 3} estrategias con prioridad media-baja que podrias archivar para revisar mas adelante. La ultima del ranking es ${last.eCode} (${last.ptaTotal.toFixed(2)}).`;
    }
    return text;
  }, [ranking, maxPta]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/25/60 bg-primary/10/60 p-4">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Tus estrategias estan priorizadas</p>
            <p className="text-muted-foreground">
              El puntaje total (PTA) refleja que tan bien cada estrategia aprovecha tus factores FODA.
              Las de mayor puntaje son las que debes ejecutar primero.
            </p>
          </div>
        </div>
      </div>

      {/* Ranking */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Ranking de estrategias</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {ranking.map((s, i) => {
            const pct = maxPta > 0 ? (s.ptaTotal / maxPta) * 100 : 0;
            const lowAttract = s.ptaTotal < maxPta * 0.6;
            const isTop3 = i < 3;
            const medalColor = i === 0 ? "#F59E0B" : i === 1 ? "#94A3B8" : "#fbbf24";
            return (
              <div key={s.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="flex size-9 items-center justify-center rounded-full font-bold text-sm shrink-0" style={isTop3 ? { backgroundColor: medalColor, color: "white" } : { backgroundColor: "transparent", color: "#4B5563" }}>
                  {isTop3 ? <Medal className="size-4" /> : i + 1}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-[10px]">{s.eCode}</Badge>
                    {lowAttract && <Badge variant="outline" className="text-[10px] bg-transparent text-amber-700 border-amber-300">Bajo atractivo</Badge>}
                    <span className="text-xs text-muted-foreground ml-auto">Aparece en {s.totalAppearances} matrices · {s.olpLinks.length} OLP(s)</span>
                  </div>
                  <p className="text-sm leading-snug">{s.text}</p>
                  <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 left-0 transition-all duration-700 rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(to right, #16A34A, #F59E0B)`,
                      }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-bold tabular-nums">{s.ptaTotal.toFixed(2)}</div>
                  <div className="text-[10px] text-muted-foreground">PTA</div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sensibilidad */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Analisis de sensibilidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">Simula cambiar el peso de un factor para ver como afecta el ranking.</p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Factor a simular</label>
              <select value={sensitivityFactorId} onChange={(e) => {
                setSensitivityFactorId(e.target.value);
                const f = setup.factors.all.find((x) => x.id === e.target.value);
                if (f) setSimulatedWeight(f.weight);
              }} className="w-full rounded-md border bg-card px-2 py-1.5 text-sm">
                {setup.factors.all.map((f) => (
                  <option key={f.id} value={f.id}>{f.code} — {f.text.slice(0, 40)} (peso {f.weight.toFixed(2)})</option>
                ))}
              </select>
            </div>
            {sensitivityFactor && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nuevo peso (actual {sensitivityFactor.weight.toFixed(2)})</label>
                <input
                  type="range" min="0.01" max="0.30" step="0.01"
                  value={simulatedWeight}
                  onChange={(e) => setSimulatedWeight(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="text-xs tabular-nums text-center">{simulatedWeight.toFixed(2)}</div>
              </div>
            )}
            <Separator />
            <p className="text-xs text-muted-foreground">Ranking simulado (top 3):</p>
            <ol className="text-xs space-y-1">
              {simulatedRanking.slice(0, 3).map((s, i) => {
                const originalIdx = ranking.findIndex((r) => r.id === s.id);
                const moved = originalIdx !== i;
                return (
                  <li key={s.id} className="flex items-center gap-2">
                    <span className="font-bold">{i + 1}.</span>
                    <Badge variant="outline" className="font-mono text-[10px]">{s.eCode}</Badge>
                    <span className="tabular-nums">{s.ptaTotal.toFixed(2)}</span>
                    {moved && <span className="text-[10px] text-amber-600">(antes #{originalIdx + 1})</span>}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        {/* Recomendacion */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recomendacion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{recommendation}</p>
          </CardContent>
        </Card>
      </div>

      {/* Puente didactico */}
      <Card className="border-2 border-primary/30">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <ArrowRightCircle className="size-5 shrink-0 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">¿Que sigue?</p>
              <p className="text-muted-foreground">
                En el proximo modulo (<strong>Filtro de Rumelt</strong>) validaras que tus estrategias top
                sean coherentes, factibles y consistentes con tu vision.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="size-4 mr-1.5" /> Volver a calificar</Button>
        <Link href={`/cycles/${cycleId}/m3-formulation`} className="ml-auto">
          <Button size="sm">Continuar a Filtro de Rumelt <ArrowRight className="size-4 ml-1.5" /></Button>
        </Link>
      </div>
    </div>
  );
}
