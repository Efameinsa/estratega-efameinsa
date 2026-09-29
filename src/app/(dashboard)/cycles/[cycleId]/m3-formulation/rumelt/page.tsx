"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { CRITERION_INFO, type RumeltCriterion } from "@/lib/rumelt-suggestions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Check, ChevronRight, Info, ArrowLeft, ArrowRight, AlertTriangle,
  Save, X, Sparkles, Puzzle, Wind, Trophy, Wrench, Shield, ArrowRightCircle,
  RefreshCw,
} from "lucide-react";

const CRITERION_ICONS: Record<RumeltCriterion, React.ElementType> = {
  consistencia: Puzzle, consonancia: Wind, ventaja: Trophy, factibilidad: Wrench,
};

const CRITERION_ORDER: RumeltCriterion[] = ["consistencia", "consonancia", "ventaja", "factibilidad"];

const VERDICT_INFO = {
  aprobada: { label: "Aprobada", color: "#4ade80", bg: "rgba(22,163,74,0.10)", border: "rgba(22,163,74,0.40)", icon: "✓" },
  en_revision: { label: "En revision", color: "#F59E0B", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.40)", icon: "!" },
  rechazada: { label: "Rechazada", color: "#f87171", bg: "rgba(220,38,38,0.10)", border: "rgba(220,38,38,0.40)", icon: "✗" },
  pendiente: { label: "Pendiente", color: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.30)", icon: "—" },
  reformulada: { label: "Reformulada", color: "#8B5CF6", bg: "rgba(139,92,246,0.10)", border: "rgba(139,92,246,0.40)", icon: "↻" },
  aprobada_manual: { label: "Aprobada manual", color: "#4ade80", bg: "rgba(22,163,74,0.10)", border: "rgba(22,163,74,0.40)", icon: "✓" },
} as const;

type VerdictKey = keyof typeof VERDICT_INFO;

interface CriterionEval { criterion: string; passes: boolean | null; justification: string | null; suggestion: string | null }
interface RumeltEval { id: string; status: string; autoVerdict: string | null; finalVerdict: string | null; criteria: CriterionEval[] }
interface StrategyOut {
  id: string; eCode: string; text: string;
  totalAppearances: number; ptaTotal: number; mcpeRanking: number | null;
  olpLinks: Array<{ olpId: string }>;
}
interface OlpItem { id: string; olpCode: string; description: string }
interface RumeltSetup {
  strategies: StrategyOut[];
  olps: OlpItem[];
  evaluations: Array<{ id: string; consolidatedId: string; status: string; autoVerdict: string | null; finalVerdict: string | null; criteria: CriterionEval[] }>;
  evalsMap: Record<string, RumeltEval>;
}

// ───────────────────────────────────────────────────────────────────────
// MAIN
// ───────────────────────────────────────────────────────────────────────

export default function RumeltPage() {
  const params = useParams();
  const cycleId = params.cycleId as string;
  const [paso, setPaso] = useState<1 | 2 | 3>(1);

  const { data: setup, isLoading } = trpc.rumelt.getSetup.useQuery({ cycleId });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Cargando Filtro de Rumelt...</div>;
  if (!setup) return <div className="p-6 text-sm text-muted-foreground">Sin datos</div>;

  if (setup.strategies.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Filtro de Rumelt</h1>
          <p className="text-sm text-muted-foreground">Validacion final de estrategias</p>
        </div>
        <div className="rounded-xl border border-amber-200/60 bg-transparent p-5">
          <div className="flex gap-3">
            <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Sin estrategias para evaluar</p>
              <p className="text-sm text-muted-foreground mb-3">
                Para usar el Filtro de Rumelt necesitas tener estrategias priorizadas en MCPE.
              </p>
              <Link href={`/cycles/${cycleId}/m3-formulation/mcpe`}><Button size="sm">Ir a MCPE</Button></Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Shield className="size-6" /> Filtro de Rumelt
        </h1>
        <p className="text-sm text-muted-foreground">
          Valida tus estrategias contra los 4 criterios de Rumelt: consistencia, consonancia, ventaja y factibilidad.
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
  const steps = [{ id: 1, label: "Evaluar" }, { id: 2, label: "Resultados" }, { id: 3, label: "Decidir" }] as const;
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

function getVerdictKey(strategy: StrategyOut, evalMap: Record<string, RumeltEval>): VerdictKey {
  const e = evalMap[strategy.id];
  if (!e) return "pendiente";
  if (e.status === "reformulada") return "reformulada";
  if (e.status === "aprobada_manual") return "aprobada_manual";
  if (e.finalVerdict === "aprobada") return "aprobada";
  if (e.finalVerdict === "en_revision") return "en_revision";
  if (e.finalVerdict === "rechazada") return "rechazada";
  return "pendiente";
}

// ───────────────────────────────────────────────────────────────────────
// PASO 1 — EVALUAR
// ───────────────────────────────────────────────────────────────────────

function Paso1({ setup, cycleId, onNext }: { setup: RumeltSetup; cycleId: string; onNext: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = setup.strategies[activeIdx];
  const activeEval = active ? setup.evalsMap[active.id] ?? null : null;

  // Conteo
  const evaluatedCount = setup.strategies.filter((s) => {
    const e = setup.evalsMap[s.id];
    return e && e.criteria.filter((c) => c.passes !== null).length === 4;
  }).length;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/25/60 bg-primary/10/60 p-4">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Como funciona el Filtro de Rumelt</p>
            <p className="text-muted-foreground">
              Valida cada estrategia contra los 4 criterios de Richard Rumelt. Una buena estrategia debe ser
              internamente coherente, sintonizar con el entorno, crear ventaja competitiva y ser ejecutable
              con tus recursos.
            </p>
          </div>
        </div>
      </div>

      {/* Navegador de estrategias */}
      <div className="sticky top-0 bg-background/95 backdrop-blur z-10 -mx-4 px-4 md:-mx-6 md:px-6 py-2 border-b">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs text-muted-foreground">{evaluatedCount} de {setup.strategies.length} evaluadas</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          {setup.strategies.map((s, i) => {
            const verdict = getVerdictKey(s, setup.evalsMap);
            const vi = VERDICT_INFO[verdict];
            const isActive = i === activeIdx;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveIdx(i)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono border transition-all ${isActive ? "border-primary bg-primary/10 dark:bg-primary/90/30" : "border-border hover:border-foreground/30"}`}
                style={!isActive ? { color: vi.color, borderColor: vi.border, backgroundColor: vi.bg } : undefined}
                title={s.text}
              >
                <span className="font-bold">{vi.icon}</span>
                <span className="font-bold">{s.eCode}</span>
              </button>
            );
          })}
        </div>
      </div>

      {active && (
        <StrategyEvaluator
          strategy={active}
          evaluation={activeEval}
          olps={setup.olps}
          cycleId={cycleId}
          onPrev={() => setActiveIdx(Math.max(0, activeIdx - 1))}
          onNext={() => setActiveIdx(Math.min(setup.strategies.length - 1, activeIdx + 1))}
          isFirst={activeIdx === 0}
          isLast={activeIdx === setup.strategies.length - 1}
        />
      )}

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button size="sm" onClick={onNext} className="ml-auto">
          Ver resultados <ArrowRight className="size-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

function StrategyEvaluator({
  strategy, evaluation, olps, cycleId, onPrev, onNext, isFirst, isLast,
}: {
  strategy: StrategyOut;
  evaluation: RumeltEval | null;
  olps: OlpItem[];
  cycleId: string;
  onPrev: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const utils = trpc.useUtils();
  const [reformulating, setReformulating] = useState(false);
  const [newText, setNewText] = useState(strategy.text);

  const setCriterion = trpc.rumelt.setCriterion.useMutation({
    onSuccess: () => utils.rumelt.getSetup.invalidate({ cycleId }),
  });
  const reformulate = trpc.rumelt.reformulate.useMutation({
    onSuccess: () => { utils.rumelt.getSetup.invalidate({ cycleId }); toast.success("Estrategia reformulada"); setReformulating(false); },
  });

  const passedCount = evaluation?.criteria.filter((c) => c.passes === true).length ?? 0;
  const evaluatedCount = evaluation?.criteria.filter((c) => c.passes !== null).length ?? 0;
  const verdict = evaluation?.finalVerdict ?? "pendiente";
  const vi = VERDICT_INFO[verdict as VerdictKey];

  const linkedOlps = olps.filter((o) => strategy.olpLinks.some((l) => l.olpId === o.id));

  return (
    <>
      {/* Identidad de la estrategia */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3 flex-wrap">
            <Badge variant="outline" className="font-mono text-sm shrink-0">{strategy.eCode}</Badge>
            <div className="flex-1 min-w-[280px]">
              <p className="text-sm leading-relaxed">{strategy.text}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                {strategy.mcpeRanking && <span>MCPE ranking #{strategy.mcpeRanking} · PTA {strategy.ptaTotal.toFixed(2)}</span>}
                <span>Aparece en {strategy.totalAppearances} matrices</span>
                {linkedOlps.length > 0 && <span>OLPs: {linkedOlps.map((o) => o.olpCode).join(", ")}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4 criterios */}
      {CRITERION_ORDER.map((c, i) => {
        const ci = CRITERION_INFO[c];
        const Icon = CRITERION_ICONS[c];
        const cri = evaluation?.criteria.find((cc) => cc.criterion === c);
        return (
          <CriterionCard
            key={c}
            criterion={c}
            index={i + 1}
            ci={ci}
            Icon={Icon}
            criterionEval={cri ?? null}
            onPass={(j) => setCriterion.mutate({ cycleId, consolidatedId: strategy.id, criterion: c, passes: true, justification: j })}
            onFail={(j) => setCriterion.mutate({ cycleId, consolidatedId: strategy.id, criterion: c, passes: false, justification: j })}
          />
        );
      })}

      {/* Veredicto provisional */}
      <Card style={{ borderColor: vi.border, backgroundColor: vi.bg, borderWidth: 2 }}>
        <CardContent className="p-4 flex items-center gap-3">
          <span className="text-3xl font-bold" style={{ color: vi.color }}>{vi.icon}</span>
          <div>
            <p className="font-semibold" style={{ color: vi.color }}>{vi.label}</p>
            <p className="text-xs text-muted-foreground">{passedCount} de {evaluatedCount}/4 criterios aprobados</p>
          </div>
        </CardContent>
      </Card>

      {/* Reformulacion */}
      {(verdict === "en_revision" || verdict === "rechazada") && (
        <>
          {!reformulating ? (
            <Button variant="outline" size="sm" onClick={() => setReformulating(true)}>
              <RefreshCw className="size-4 mr-1.5" /> Reformular {strategy.eCode}
            </Button>
          ) : (
            <Card className="border-2 border-purple-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Reformular {strategy.eCode}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">Texto original:</div>
                <div className="rounded-md bg-muted/30 p-2 text-xs italic">{strategy.text}</div>
                <Textarea value={newText} onChange={(e) => setNewText(e.target.value)} rows={4} className="text-sm" />
                <p className="text-[11px] text-muted-foreground italic">
                  Esta estrategia se evaluara nuevamente con los 4 criterios. La version original queda archivada con trazabilidad.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => reformulate.mutate({ cycleId, consolidatedId: strategy.id, newText })} disabled={reformulate.isPending || newText.length < 10}>
                    Confirmar reformulacion
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setReformulating(false)}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Navegacion entre estrategias */}
      <div className="flex justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={isFirst}>
          <ArrowLeft className="size-4 mr-1.5" /> Estrategia anterior
        </Button>
        <Button size="sm" onClick={onNext} disabled={isLast}>
          Siguiente estrategia <ArrowRight className="size-4 ml-1.5" />
        </Button>
      </div>
    </>
  );
}

function CriterionCard({
  criterion, index, ci, Icon, criterionEval, onPass, onFail,
}: {
  criterion: RumeltCriterion;
  index: number;
  ci: typeof CRITERION_INFO[RumeltCriterion];
  Icon: React.ElementType;
  criterionEval: CriterionEval | null;
  onPass: (justification: string) => void;
  onFail: (justification: string) => void;
}) {
  const passes = criterionEval?.passes ?? null;
  const [justification, setJustification] = useState(criterionEval?.justification ?? "");

  const placeholder = {
    consistencia: "Ej. Coherente con los valores de innovacion responsable y con el OLP1 de crecimiento sostenible.",
    consonancia: "Ej. Sintoniza con la transformacion digital del sector y la nueva regulacion ambiental.",
    ventaja: "Ej. Aprovecha nuestra red de proveedores exclusivos (F3) que es dificil de replicar.",
    factibilidad: "Ej. Tenemos la caja para 6 meses y el equipo se puede reforzar con dos contrataciones clave.",
  }[criterion];

  const borderColor = passes === true ? "rgba(22,163,74,0.5)" : passes === false ? "rgba(220,38,38,0.5)" : ci.border;
  const bgColor = passes === true ? "rgba(22,163,74,0.04)" : passes === false ? "rgba(220,38,38,0.04)" : "transparent";

  return (
    <Card style={{ borderColor, backgroundColor: bgColor, borderWidth: passes !== null ? 2 : 1 }}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: ci.bg, color: ci.color }}>
            <Icon className="size-5" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {ci.label} <span className="text-xs text-muted-foreground font-normal">({index} de 4)</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{ci.question}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPass(justification)}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-all border-2 ${passes === true ? "bg-transparent text-emerald-700 border-emerald-500" : "border-input hover:border-emerald-400 text-muted-foreground"}`}
          >
            ✓ Pasa
          </button>
          <button
            type="button"
            onClick={() => onFail(justification)}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-all border-2 ${passes === false ? "bg-transparent text-rose-700 border-rose-500" : "border-input hover:border-rose-400 text-muted-foreground"}`}
          >
            ✗ No pasa
          </button>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Evidencia o justificacion (opcional)</label>
          <Textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            onBlur={() => {
              // Persistir justificacion si ya hay decision
              if (passes !== null) {
                if (passes) onPass(justification);
                else onFail(justification);
              }
            }}
            placeholder={placeholder}
            rows={2}
            className="text-sm"
          />
        </div>
        {/* Sugerencia automatica si no pasa */}
        {passes === false && criterionEval?.suggestion && (
          <div className="rounded-md border border-amber-200/60 bg-transparent p-2 text-xs flex gap-2">
            <Sparkles className="size-3.5 shrink-0 text-amber-600 mt-0.5" />
            <span><strong>Sugerencia del sistema:</strong> {criterionEval.suggestion}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 2 — RESULTADOS
// ───────────────────────────────────────────────────────────────────────

function Paso2({ setup, cycleId: _cycleId, onBack, onNext }: { setup: RumeltSetup; cycleId: string; onBack: () => void; onNext: () => void }) {
  // Stats por criterio
  const counts = { aprobada: 0, en_revision: 0, rechazada: 0, pendiente: 0, reformulada: 0, aprobada_manual: 0 };
  for (const s of setup.strategies) {
    const v = getVerdictKey(s, setup.evalsMap);
    counts[v]++;
  }

  // Cuál criterio falla más
  const failByCriterion: Record<RumeltCriterion, number> = { consistencia: 0, consonancia: 0, ventaja: 0, factibilidad: 0 };
  for (const s of setup.strategies) {
    const e = setup.evalsMap[s.id];
    if (!e) continue;
    for (const c of e.criteria) {
      if (c.passes === false) failByCriterion[c.criterion as RumeltCriterion]++;
    }
  }
  const worstCriterion = (Object.entries(failByCriterion).sort((a, b) => b[1] - a[1])[0]) as [RumeltCriterion, number];

  // Análisis narrativo
  const narrative = useMemo(() => {
    const parts: string[] = [];
    if (counts.aprobada + counts.aprobada_manual > setup.strategies.length * 0.6) {
      parts.push(`Tu portafolio tiene un perfil solido: la mayoria de estrategias (${counts.aprobada + counts.aprobada_manual} de ${setup.strategies.length}) pasa los 4 criterios.`);
    }
    if (worstCriterion && worstCriterion[1] > 0) {
      const ci = CRITERION_INFO[worstCriterion[0]];
      parts.push(`El criterio mas exigente fue ${ci.label.toLowerCase()}: ${worstCriterion[1]} estrategia(s) fallaron en este aspecto.`);
    }
    if (counts.rechazada > setup.strategies.length * 0.3) {
      parts.push(`Atencion: muchas estrategias fueron rechazadas. Revisa si el set inicial era realista.`);
    }
    if (counts.aprobada === 0 && counts.aprobada_manual === 0) {
      parts.push(`Ninguna estrategia fue aprobada. Considera reformular las "en revision" o relajar criterios manualmente con justificacion.`);
    }
    return parts.length > 0 ? parts.join(" ") : "Aun no hay suficiente informacion para generar un analisis. Termina de evaluar las estrategias.";
  }, [counts, worstCriterion, setup.strategies.length]);

  return (
    <div className="space-y-5">
      {/* Cards de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard label="Aprobadas" count={counts.aprobada + counts.aprobada_manual} info={VERDICT_INFO.aprobada} subtitle="pasan a Auditoria Etica" />
        <SummaryCard label="En revision" count={counts.en_revision} info={VERDICT_INFO.en_revision} subtitle="requieren reformulacion" />
        <SummaryCard label="Rechazadas" count={counts.rechazada} info={VERDICT_INFO.rechazada} subtitle="van a contingencia" />
      </div>

      {/* Matriz de validacion */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Matriz de validacion</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs">
                <th className="text-left p-2">Estrategia</th>
                {CRITERION_ORDER.map((c) => {
                  const ci = CRITERION_INFO[c];
                  return (
                    <th key={c} className="text-center p-2" style={{ color: ci.color }} title={ci.question}>
                      {ci.label}
                    </th>
                  );
                })}
                <th className="text-center p-2">Veredicto</th>
              </tr>
            </thead>
            <tbody>
              {setup.strategies.map((s) => {
                const e = setup.evalsMap[s.id];
                const verdict = getVerdictKey(s, setup.evalsMap);
                const vi = VERDICT_INFO[verdict];
                return (
                  <tr key={s.id} className="border-b" style={{ backgroundColor: vi.bg }}>
                    <td className="p-2">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="font-mono text-[10px] shrink-0">{s.eCode}</Badge>
                        <span className="text-xs leading-snug">{s.text}</span>
                      </div>
                    </td>
                    {CRITERION_ORDER.map((c) => {
                      const cri = e?.criteria.find((cc) => cc.criterion === c);
                      const passes = cri?.passes;
                      return (
                        <td key={c} className="p-2 text-center">
                          {passes === true && <span className="text-emerald-600 font-bold">✓</span>}
                          {passes === false && <span className="text-rose-600 font-bold">✗</span>}
                          {passes === null && <span className="text-muted-foreground">—</span>}
                          {passes === undefined && <span className="text-muted-foreground">—</span>}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center">
                      <Badge variant="outline" className="text-[10px]" style={{ color: vi.color, borderColor: vi.border }}>
                        {vi.icon} {vi.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Análisis narrativo */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Analisis del portafolio</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground/85">{narrative}</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="size-4 mr-1.5" /> Volver a evaluar</Button>
        <Button size="sm" onClick={onNext} className="ml-auto">Continuar a decidir <ArrowRight className="size-4 ml-1.5" /></Button>
      </div>
    </div>
  );
}

function SummaryCard({ label, count, info, subtitle }: { label: string; count: number; info: typeof VERDICT_INFO[VerdictKey]; subtitle: string }) {
  return (
    <Card style={{ borderColor: info.border, backgroundColor: info.bg }}>
      <CardContent className="p-4 text-center">
        <div className="text-3xl font-bold tabular-nums" style={{ color: info.color }}>{count}</div>
        <div className="text-xs font-medium mt-1">{label}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 3 — DECIDIR
// ───────────────────────────────────────────────────────────────────────

function Paso3({ setup, cycleId, onBack }: { setup: RumeltSetup; cycleId: string; onBack: () => void }) {
  const utils = trpc.useUtils();
  const override = trpc.rumelt.overrideVerdict.useMutation({
    onSuccess: () => { utils.rumelt.getSetup.invalidate({ cycleId }); toast.success("Veredicto sobreescrito"); },
  });

  const aprobadas = setup.strategies.filter((s) => {
    const v = getVerdictKey(s, setup.evalsMap);
    return v === "aprobada" || v === "aprobada_manual";
  });
  const enRevision = setup.strategies.filter((s) => getVerdictKey(s, setup.evalsMap) === "en_revision");
  const rechazadas = setup.strategies.filter((s) => getVerdictKey(s, setup.evalsMap) === "rechazada");

  function handleApproveManual(s: StrategyOut) {
    const j = prompt(`Justifica por que apruebas ${s.eCode} pese a que fallo algun criterio:`);
    if (!j || j.length < 5) return;
    override.mutate({ cycleId, consolidatedId: s.id, newVerdict: "aprobada", justification: j });
  }

  function handleMoveToContingency(s: StrategyOut) {
    if (!confirm(`Mover ${s.eCode} a contingencia?`)) return;
    override.mutate({ cycleId, consolidatedId: s.id, newVerdict: "rechazada", justification: "Movida a contingencia por usuario" });
  }

  return (
    <div className="space-y-6">
      {/* Diagnostico final */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Resultado del filtro</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm">
            <strong>{aprobadas.length} estrategias aprobadas</strong> pasaran a Auditoria Etica.
            {enRevision.length > 0 && ` Si reformulas las ${enRevision.length} en revision, podrias recuperarlas para el plan final.`}
            {rechazadas.length > 0 && ` Las ${rechazadas.length} en contingencia quedan archivadas para uso futuro.`}
          </p>
        </CardContent>
      </Card>

      {/* Aprobadas */}
      {aprobadas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-emerald-700">A · Estrategias aprobadas ({aprobadas.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aprobadas.map((s) => (
              <DecisionCard key={s.id} strategy={s} verdict="aprobada" evaluation={setup.evalsMap[s.id] ?? null} />
            ))}
          </div>
        </div>
      )}

      {/* En revision */}
      {enRevision.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-amber-700">B · En revision ({enRevision.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {enRevision.map((s) => (
              <DecisionCard
                key={s.id} strategy={s} verdict="en_revision"
                evaluation={setup.evalsMap[s.id] ?? null}
                onApproveManual={() => handleApproveManual(s)}
                onMoveContingency={() => handleMoveToContingency(s)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Contingencia */}
      {rechazadas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-rose-700">C · En contingencia ({rechazadas.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {rechazadas.map((s) => {
              const e = setup.evalsMap[s.id];
              const failedCriteria = e?.criteria.filter((c) => c.passes === false).map((c) => CRITERION_INFO[c.criterion as RumeltCriterion].label).join(", ");
              return (
                <div key={s.id} className="rounded border bg-transparent p-3 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-[10px]">{s.eCode}</Badge>
                  </div>
                  <p className="leading-snug">{s.text}</p>
                  {failedCriteria && <p className="text-[10px] text-muted-foreground mt-1">Fallo en: {failedCriteria}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Puente didactico */}
      <Card className="border-2 border-primary/30">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <ArrowRightCircle className="size-5 shrink-0 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">¿Que sigue?</p>
              <p className="text-muted-foreground">
                En el proximo modulo (<strong>Auditoria Etica</strong>) revisaras que tus estrategias aprobadas
                cumplan con tus principios eticos y responsabilidad social.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="size-4 mr-1.5" /> Volver a resultados</Button>
        <Link href={`/cycles/${cycleId}/m3-formulation`} className="ml-auto">
          <Button size="sm">Continuar a Auditoria Etica <ArrowRight className="size-4 ml-1.5" /></Button>
        </Link>
      </div>
    </div>
  );
}

function DecisionCard({
  strategy, verdict, evaluation, onApproveManual, onMoveContingency,
}: {
  strategy: StrategyOut;
  verdict: "aprobada" | "en_revision";
  evaluation: RumeltEval | null;
  onApproveManual?: () => void;
  onMoveContingency?: () => void;
}) {
  const vi = VERDICT_INFO[verdict];
  const failedCriteria = evaluation?.criteria.filter((c) => c.passes === false) ?? [];

  return (
    <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: vi.border, backgroundColor: vi.bg }}>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-[10px]">{strategy.eCode}</Badge>
        <Badge variant="outline" className="text-[10px]" style={{ color: vi.color, borderColor: vi.border }}>
          {vi.icon} {vi.label}
        </Badge>
      </div>
      <p className="text-sm leading-snug">{strategy.text}</p>
      {failedCriteria.length > 0 && (
        <div className="text-xs space-y-1">
          {failedCriteria.map((c) => (
            <div key={c.criterion} className="flex gap-1.5">
              <span className="font-medium" style={{ color: CRITERION_INFO[c.criterion as RumeltCriterion].color }}>
                {CRITERION_INFO[c.criterion as RumeltCriterion].label}:
              </span>
              <span className="text-muted-foreground">{c.justification ?? "Sin justificacion"}</span>
            </div>
          ))}
        </div>
      )}
      {(onApproveManual || onMoveContingency) && (
        <div className="flex gap-2 pt-1">
          {onApproveManual && <Button size="sm" variant="outline" onClick={onApproveManual} className="text-emerald-700">Aprobar manualmente</Button>}
          {onMoveContingency && <Button size="sm" variant="outline" onClick={onMoveContingency} className="text-rose-700">A contingencia</Button>}
        </div>
      )}
    </div>
  );
}
