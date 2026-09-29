"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  PRINCIPLES, BLOCK_INFO, VERDICT_INFO, principlesByBlock,
  type EthicsBlock, type EthicsRating, type EthicsVerdict,
} from "@/lib/ethics-catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Check, ChevronDown, ChevronRight, Info, ArrowLeft, ArrowRight, AlertTriangle,
  Save, X, HandMetal, Scale, Activity, Shield, ArrowRightCircle, Sparkles,
  Leaf,
} from "lucide-react";

const BLOCK_ICONS: Record<EthicsBlock, React.ElementType> = {
  derechos: HandMetal,
  justicia: Scale,
  utilitarismo: Activity,
};

const BLOCK_ORDER: EthicsBlock[] = ["derechos", "justicia", "utilitarismo"];

interface PrincipleEval { id: string; block: string; principleKey: string; rating: string; justification: string | null }
interface MitigantItem {
  id: string; principleId: string; text: string; responsible: string;
  deadline: string; indicator: string; postSeverity: string;
}
interface EthicsEval { id: string; status: string; autoVerdict: string | null; finalVerdict: string | null; principles: PrincipleEval[]; mitigants: MitigantItem[] }
interface StrategyOut { id: string; eCode: string; text: string }
interface ValueOut { id: string; text: string; name: string }
interface EthicsSetup {
  strategies: StrategyOut[];
  values: ValueOut[];
  evalsMap: Record<string, EthicsEval>;
  rumeltApprovedCount: number;
  totalConsolidated: number;
}

// ───────────────────────────────────────────────────────────────────────
// MAIN
// ───────────────────────────────────────────────────────────────────────

export default function EthicsPage() {
  const params = useParams();
  const cycleId = params.cycleId as string;
  const [paso, setPaso] = useState<1 | 2 | 3>(1);

  const { data: setup, isLoading } = trpc.ethicsAudit.getSetup.useQuery({ cycleId });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Cargando Auditoria Etica...</div>;
  if (!setup) return <div className="p-6 text-sm text-muted-foreground">Sin datos</div>;

  if (setup.strategies.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Auditoria Etica</h1>
          <p className="text-sm text-muted-foreground">Validacion final etica del proceso estrategico</p>
        </div>
        <div className="rounded-xl border border-amber-200/60 bg-transparent p-5">
          <div className="flex gap-3">
            <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Sin estrategias para auditar</p>
              <p className="text-sm text-muted-foreground mb-3">
                Para usar la Auditoria Etica necesitas tener estrategias aprobadas en el Filtro de Rumelt.
                {setup.totalConsolidated > 0 && setup.rumeltApprovedCount === 0 && " Ninguna estrategia paso Rumelt aun."}
              </p>
              <Link href={`/cycles/${cycleId}/m3-formulation/rumelt`}><Button size="sm">Ir a Rumelt</Button></Link>
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
          <Shield className="size-6" /> Auditoria Etica
        </h1>
        <p className="text-sm text-muted-foreground">
          Valida que tus estrategias respeten derechos, sean justas y generen mas beneficios que daños.
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
  const steps = [{ id: 1, label: "Evaluar" }, { id: 2, label: "Mitigar" }, { id: 3, label: "Aprobar" }] as const;
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

function getVerdictKey(strategy: StrategyOut, evalsMap: Record<string, EthicsEval>): EthicsVerdict | "pendiente" {
  const e = evalsMap[strategy.id];
  if (!e) return "pendiente";
  const v = (e.finalVerdict ?? e.autoVerdict) as EthicsVerdict | null;
  return v ?? "pendiente";
}

function countViolations(e: EthicsEval | undefined): number {
  return e?.principles.filter((p) => p.rating === "viola").length ?? 0;
}

function countPromueve(e: EthicsEval | undefined): number {
  return e?.principles.filter((p) => p.rating === "promueve").length ?? 0;
}

// ───────────────────────────────────────────────────────────────────────
// PASO 1
// ───────────────────────────────────────────────────────────────────────

function Paso1({ setup, cycleId, onNext }: { setup: EthicsSetup; cycleId: string; onNext: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [showMitigantModal, setShowMitigantModal] = useState<{ principleKey: string; principleLabel: string } | null>(null);
  const active = setup.strategies[activeIdx];
  const activeEval = active ? setup.evalsMap[active.id] : undefined;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/25/60 bg-primary/10/60 p-4">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Como funciona la Auditoria Etica</p>
            <p className="text-muted-foreground">
              Valida tus estrategias aprobadas en el Filtro de Rumelt contra 3 bloques: respeto a derechos,
              justicia y balance de beneficios vs daños. Es el ultimo filtro antes del plan final.
            </p>
          </div>
        </div>
      </div>

      {/* Navegador de estrategias */}
      <div className="sticky top-0 bg-background/95 backdrop-blur z-10 -mx-4 px-4 md:-mx-6 md:px-6 py-2 border-b">
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          {setup.strategies.map((s, i) => {
            const verdict = getVerdictKey(s, setup.evalsMap);
            const vi = verdict === "pendiente"
              ? { color: "#6b7280", border: "rgba(107,114,128,0.30)", bg: "rgba(107,114,128,0.08)", icon: "—" }
              : VERDICT_INFO[verdict];
            const isActive = i === activeIdx;
            const e = setup.evalsMap[s.id];
            const promueve = countPromueve(e);
            const isEjemplar = promueve >= 3 && countViolations(e) === 0;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveIdx(i)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono border transition-all ${isActive ? "border-primary bg-primary/10 dark:bg-primary/90/30" : "border-border hover:border-foreground/30"}`}
                style={!isActive ? { color: vi.color, borderColor: vi.border, backgroundColor: vi.bg } : undefined}
                title={s.text}
              >
                <span>{vi.icon}</span>
                <span className="font-bold">{s.eCode}</span>
                {isEjemplar && <Leaf className="size-3 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {active && (
        <StrategyEvaluator
          strategy={active}
          evaluation={activeEval}
          values={setup.values}
          cycleId={cycleId}
          onOpenMitigant={(pk, pl) => setShowMitigantModal({ principleKey: pk, principleLabel: pl })}
        />
      )}

      {showMitigantModal && active && (
        <MitigantModal
          strategy={active}
          evaluation={activeEval}
          principleKey={showMitigantModal.principleKey}
          principleLabel={showMitigantModal.principleLabel}
          cycleId={cycleId}
          onClose={() => setShowMitigantModal(null)}
        />
      )}

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button variant="outline" size="sm" onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))} disabled={activeIdx === 0}>
          <ArrowLeft className="size-4 mr-1.5" /> Anterior
        </Button>
        <Button size="sm" onClick={() => activeIdx < setup.strategies.length - 1 ? setActiveIdx(activeIdx + 1) : onNext()}>
          {activeIdx < setup.strategies.length - 1 ? "Siguiente estrategia" : "Ver matriz etica"}
          <ArrowRight className="size-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

function StrategyEvaluator({
  strategy, evaluation, values, cycleId, onOpenMitigant,
}: {
  strategy: StrategyOut;
  evaluation: EthicsEval | undefined;
  values: ValueOut[];
  cycleId: string;
  onOpenMitigant: (principleKey: string, principleLabel: string) => void;
}) {
  const utils = trpc.useUtils();
  const setPrinciple = trpc.ethicsAudit.setPrinciple.useMutation({
    onSuccess: () => utils.ethicsAudit.getSetup.invalidate({ cycleId }),
    onError: (e) => toast.error(e.message),
  });

  const principlesMap = new Map(evaluation?.principles.map((p) => [p.principleKey, p]) ?? []);
  const mitigantsByPrinciple = new Map<string, MitigantItem>();
  if (evaluation) {
    for (const m of evaluation.mitigants) {
      const p = evaluation.principles.find((pp) => pp.id === m.principleId);
      if (p) mitigantsByPrinciple.set(p.principleKey, m);
    }
  }

  const verdict = getVerdictKey(strategy, { [strategy.id]: evaluation! });
  const vi = verdict === "pendiente"
    ? { color: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.30)", label: "Pendiente", icon: "—" }
    : VERDICT_INFO[verdict];

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3 flex-wrap">
            <Badge variant="outline" className="font-mono text-sm">{strategy.eCode}</Badge>
            <p className="text-sm leading-relaxed flex-1 min-w-[280px]">{strategy.text}</p>
          </div>
          {values.length > 0 && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-primary hover:underline">Revisar valores corporativos para el contraste</summary>
              <ul className="mt-2 space-y-1 pl-4">
                {values.map((v) => (
                  <li key={v.id} className="text-muted-foreground"><strong className="text-foreground">{v.name}:</strong> {v.text}</li>
                ))}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>

      {BLOCK_ORDER.map((block) => {
        const bi = BLOCK_INFO[block];
        const Icon = BLOCK_ICONS[block];
        const principles = principlesByBlock(block);
        const ratings = principles.map((p) => ({ principle: p, rating: (principlesMap.get(p.key)?.rating ?? "neutral") as EthicsRating, justification: principlesMap.get(p.key)?.justification ?? null }));
        const violations = ratings.filter((r) => r.rating === "viola").length;
        const promociones = ratings.filter((r) => r.rating === "promueve").length;
        const allEvaluated = ratings.every((r) => principlesMap.has(r.principle.key));
        const blockBg = violations > 0 ? "rgba(220,38,38,0.04)" : promociones > 0 ? "rgba(22,163,74,0.04)" : "transparent";
        const blockBorder = violations > 0 ? "rgba(220,38,38,0.5)" : promociones > 0 ? "rgba(22,163,74,0.5)" : bi.border;

        return (
          <Card key={block} style={{ borderColor: blockBorder, backgroundColor: blockBg, borderWidth: violations > 0 || promociones > 0 ? 2 : 1 }}>
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: bi.bg, color: bi.color }}>
                  <Icon className="size-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {bi.label} <span className="text-xs text-muted-foreground font-normal">({ratings.filter((r) => principlesMap.has(r.principle.key)).length} de {principles.length})</span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{bi.question}</p>
                </div>
                {violations > 0 ? (
                  <Badge variant="outline" className="text-[10px] bg-transparent text-rose-700 border-rose-300">{violations} violacion(es)</Badge>
                ) : allEvaluated && promociones > 0 ? (
                  <Badge variant="outline" className="text-[10px] bg-transparent text-emerald-700 border-emerald-300">{promociones} promueve</Badge>
                ) : allEvaluated ? (
                  <Badge variant="outline" className="text-[10px] bg-transparent text-emerald-700 border-emerald-200">Aprobado</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs">
                    <th className="text-left p-1.5">Principio</th>
                    <th className="text-center p-1.5 w-16">Viola</th>
                    <th className="text-center p-1.5 w-16">Neutral</th>
                    <th className="text-center p-1.5 w-20">Promueve</th>
                  </tr>
                </thead>
                <tbody>
                  {principles.map((p) => {
                    const r = (principlesMap.get(p.key)?.rating ?? "neutral") as EthicsRating;
                    const justification = principlesMap.get(p.key)?.justification ?? "";
                    const hasMitigant = mitigantsByPrinciple.has(p.key);
                    return (
                      <PrincipleRow
                        key={p.key}
                        principle={p}
                        block={block}
                        rating={r}
                        justification={justification}
                        hasMitigant={hasMitigant}
                        onChange={(newRating, newJustification) => {
                          setPrinciple.mutate({
                            cycleId, consolidatedId: strategy.id,
                            block, principleKey: p.key,
                            rating: newRating, justification: newJustification,
                          });
                        }}
                        onOpenMitigant={() => onOpenMitigant(p.key, p.label)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}

      {/* Veredicto provisional */}
      <Card style={{ borderColor: vi.border, backgroundColor: vi.bg, borderWidth: 2 }}>
        <CardContent className="p-4 flex items-center gap-3">
          <span className="text-3xl font-bold" style={{ color: vi.color }}>{vi.icon}</span>
          <div>
            <p className="font-semibold" style={{ color: vi.color }}>{vi.label}</p>
            <p className="text-xs text-muted-foreground">
              {evaluation ? (
                <>
                  {evaluation.principles.filter((p) => p.rating === "viola").length} violacion(es) · {evaluation.mitigants.length} mitigante(s) registrado(s)
                </>
              ) : (
                "Aun no se ha calificado ningun principio"
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function PrincipleRow({
  principle, block, rating, justification, hasMitigant, onChange, onOpenMitigant,
}: {
  principle: { key: string; label: string; description: string };
  block: EthicsBlock;
  rating: EthicsRating;
  justification: string;
  hasMitigant: boolean;
  onChange: (rating: EthicsRating, justification: string) => void;
  onOpenMitigant: () => void;
}) {
  const [text, setText] = useState(justification);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const bgColor = rating === "viola" ? "rgba(220,38,38,0.06)" : rating === "promueve" ? "rgba(22,163,74,0.06)" : "transparent";

  function handleRatingChange(newRating: EthicsRating) {
    if (newRating === "viola" && text.length < 30) {
      // No actualizar aun, solo expandir para que escriba
      onChange("viola", text);
      return;
    }
    onChange(newRating, text);
  }

  return (
    <>
      <tr className="border-b" style={{ backgroundColor: bgColor }}>
        <td className="p-1.5">
          <div className="text-sm font-medium" style={{ color: rating === "viola" ? "#f87171" : rating === "promueve" ? "#15803D" : "inherit" }} title={principle.description}>
            {principle.label}
          </div>
          {rating === "viola" && <div className="text-[10px] text-rose-700">⚠ Calificado como Viola</div>}
        </td>
        {(["viola", "neutral", "promueve"] as EthicsRating[]).map((r) => (
          <td key={r} className="p-1.5 text-center">
            <input
              type="radio"
              name={`${block}-${principle.key}`}
              checked={rating === r}
              onChange={() => handleRatingChange(r)}
              className="size-4 cursor-pointer"
              style={{ accentColor: r === "viola" ? "#f87171" : r === "promueve" ? "#4ade80" : "#6b7280" }}
            />
          </td>
        ))}
      </tr>
      {(rating === "viola" || rating === "promueve") && (
        <tr className="border-b" style={{ backgroundColor: bgColor }}>
          <td colSpan={4} className="p-2 space-y-2">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {rating === "viola" ? "Justificacion (obligatoria, min 30 caracteres)" : "Como promueve este principio (opcional)"}
              </label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={() => {
                  if (rating === "viola" && text.length < 30) return;
                  onChange(rating, text);
                }}
                rows={2}
                className="text-sm"
                placeholder={rating === "viola" ? "Describe por que esta estrategia viola este principio..." : "Describe como esta estrategia promueve este principio..."}
              />
              {rating === "viola" && text.length > 0 && text.length < 30 && (
                <p className="text-[11px] text-rose-600 mt-1">Faltan {30 - text.length} caracteres</p>
              )}
            </div>
            {rating === "viola" && (
              <div className="flex flex-wrap gap-2 items-center">
                {hasMitigant ? (
                  <Badge variant="outline" className="text-[10px] bg-transparent text-amber-700 border-amber-300">🛡 Mitigante registrado</Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={onOpenMitigant}>
                    <Shield className="size-3.5 mr-1.5" /> Definir mitigante
                  </Button>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────
// MODAL DE MITIGANTE
// ───────────────────────────────────────────────────────────────────────

function MitigantModal({
  strategy, evaluation, principleKey, principleLabel, cycleId, onClose,
}: {
  strategy: StrategyOut;
  evaluation: EthicsEval | undefined;
  principleKey: string;
  principleLabel: string;
  cycleId: string;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const principleData = evaluation?.principles.find((p) => p.principleKey === principleKey);
  const existing = evaluation?.mitigants.find((m) => {
    const p = evaluation.principles.find((pp) => pp.id === m.principleId);
    return p?.principleKey === principleKey;
  });

  const [text, setText] = useState(existing?.text ?? "");
  const [responsible, setResponsible] = useState(existing?.responsible ?? "");
  const [deadline, setDeadline] = useState<"previo_lanzamiento" | "primer_trimestre" | "primer_año" | "continuo">((existing?.deadline as "previo_lanzamiento" | "primer_trimestre" | "primer_año" | "continuo") ?? "primer_trimestre");
  const [indicator, setIndicator] = useState(existing?.indicator ?? "");
  const [postSeverity, setPostSeverity] = useState<"mantiene" | "neutral" | "promueve">((existing?.postSeverity as "mantiene" | "neutral" | "promueve") ?? "neutral");

  const save = trpc.ethicsAudit.saveMitigant.useMutation({
    onSuccess: () => { utils.ethicsAudit.getSetup.invalidate({ cycleId }); toast.success("Mitigante guardado"); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  function handleSave() {
    if (text.length < 30) { toast.error("El mitigante debe tener al menos 30 caracteres"); return; }
    if (!responsible.trim()) { toast.error("Asigna un responsable"); return; }
    if (!indicator.trim()) { toast.error("Define un indicador de cumplimiento"); return; }
    save.mutate({
      cycleId, consolidatedId: strategy.id, principleKey,
      text: text.trim(), responsible: responsible.trim(),
      deadline, indicator: indicator.trim(), postSeverity,
    });
  }

  const prediction = postSeverity === "mantiene"
    ? { msg: "Esta mitigacion no resuelve la violacion. Considera replantear o descartar la estrategia.", color: "#f87171", bg: "rgba(220,38,38,0.08)", border: "rgba(220,38,38,0.40)" }
    : postSeverity === "neutral"
      ? { msg: "Con esta mitigacion, la estrategia quedaria aprobada eticamente.", color: "#4ade80", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.40)" }
      : { msg: `Con esta mitigacion, la estrategia no solo se aprueba sino que promueve activamente el principio "${principleLabel}".`, color: "#15803D", bg: "rgba(22,163,74,0.15)", border: "rgba(22,163,74,0.50)" };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full my-8 border-2 border-amber-300">
        <div className="flex items-center justify-between p-4 border-b bg-transparent">
          <h2 className="font-semibold flex items-center gap-2">
            <Shield className="size-5 text-amber-600" /> Definir mitigante
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Recordatorio de la violacion */}
          <div className="rounded-md border border-rose-200/60 bg-transparent p-3 space-y-1 text-xs">
            <p className="font-semibold text-rose-700">Violacion detectada</p>
            <p><strong>Estrategia:</strong> <span className="font-mono">{strategy.eCode}</span> — {strategy.text}</p>
            <p><strong>Principio:</strong> {principleLabel}</p>
            {principleData?.justification && (
              <p className="text-muted-foreground italic">"{principleData.justification}"</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium block mb-1">Mitigante propuesto <span className="text-rose-600">*</span></label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Describe la medida concreta que neutralizara esta violacion..." className="text-sm" />
            <p className="text-[10px] text-muted-foreground mt-1">{text.length} / 30 caracteres mínimo</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">Responsable <span className="text-rose-600">*</span></label>
              <select value={responsible} onChange={(e) => setResponsible(e.target.value)} className="w-full rounded-md border bg-card px-2 py-1.5 text-sm">
                <option value="">— Seleccionar —</option>
                <option>Gerencia General</option>
                <option>RR.HH.</option>
                <option>Comercial</option>
                <option>Operaciones</option>
                <option>Legal</option>
                <option>Finanzas</option>
                <option>Tecnologia</option>
                <option>Comite de Etica</option>
                <option>Otro (especificar abajo)</option>
              </select>
              {responsible === "Otro (especificar abajo)" && (
                <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Especifica" className="mt-1 text-sm" />
              )}
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Plazo <span className="text-rose-600">*</span></label>
              <select value={deadline} onChange={(e) => setDeadline(e.target.value as typeof deadline)} className="w-full rounded-md border bg-card px-2 py-1.5 text-sm">
                <option value="previo_lanzamiento">Previo al lanzamiento</option>
                <option value="primer_trimestre">Primer trimestre de ejecucion</option>
                <option value="primer_año">Primer año</option>
                <option value="continuo">En desarrollo continuo</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Indicador de cumplimiento <span className="text-rose-600">*</span></label>
              <Input value={indicator} onChange={(e) => setIndicator(e.target.value)} placeholder="Ej. auditoria anual externa" className="text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-2">Severidad despues de mitigacion</label>
            <div className="grid grid-cols-3 gap-2">
              {(["mantiene", "neutral", "promueve"] as const).map((s) => {
                const colors = s === "mantiene"
                  ? { active: "bg-transparent text-rose-700 border-rose-500", inactive: "border-input text-muted-foreground" }
                  : s === "neutral"
                    ? { active: "bg-transparent text-amber-700 border-amber-500", inactive: "border-input text-muted-foreground" }
                    : { active: "bg-transparent text-emerald-700 border-emerald-500", inactive: "border-input text-muted-foreground" };
                const labels = { mantiene: "Mantiene violacion", neutral: "Reduce a neutral", promueve: "Convierte en promueve" };
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPostSeverity(s)}
                    className={`rounded-md border-2 py-2 px-2 text-xs font-medium transition-all ${postSeverity === s ? colors.active : colors.inactive}`}
                  >
                    {labels[s]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border p-3 text-xs" style={{ borderColor: prediction.border, backgroundColor: prediction.bg }}>
            <p style={{ color: prediction.color }}>{prediction.msg}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={save.isPending}>
            <Save className="size-4 mr-1.5" />
            {save.isPending ? "Guardando..." : "Guardar mitigante y aprobar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 2 — MITIGAR (vista informativa, los modales se invocan desde Paso 1)
// ───────────────────────────────────────────────────────────────────────

function Paso2({ setup, cycleId: _cycleId, onBack, onNext }: { setup: EthicsSetup; cycleId: string; onBack: () => void; onNext: () => void }) {
  // Listar todas las violaciones pendientes de mitigar
  const pendingMitigants: Array<{ strategy: StrategyOut; principleKey: string; principleLabel: string; justification: string }> = [];
  for (const s of setup.strategies) {
    const e = setup.evalsMap[s.id];
    if (!e) continue;
    for (const p of e.principles) {
      if (p.rating === "viola") {
        const hasMitigant = e.mitigants.some((m) => m.principleId === p.id);
        if (!hasMitigant) {
          const pdef = PRINCIPLES.find((pp) => pp.key === p.principleKey);
          pendingMitigants.push({
            strategy: s,
            principleKey: p.principleKey,
            principleLabel: pdef?.label ?? p.principleKey,
            justification: p.justification ?? "",
          });
        }
      }
    }
  }

  // Mitigantes registrados
  const registered: Array<{ strategy: StrategyOut; mitigant: MitigantItem; principleLabel: string }> = [];
  for (const s of setup.strategies) {
    const e = setup.evalsMap[s.id];
    if (!e) continue;
    for (const m of e.mitigants) {
      const p = e.principles.find((pp) => pp.id === m.principleId);
      if (p) {
        const pdef = PRINCIPLES.find((pp) => pp.key === p.principleKey);
        registered.push({ strategy: s, mitigant: m, principleLabel: pdef?.label ?? p.principleKey });
      }
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/25/60 bg-primary/10/60 p-4">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Estado de los mitigantes</p>
            <p className="text-muted-foreground">
              Revisa las violaciones detectadas. Para definir o editar un mitigante, vuelve al Paso 1 y abre el modal desde la violacion correspondiente.
            </p>
          </div>
        </div>
      </div>

      {pendingMitigants.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-rose-700">Pendientes de mitigar ({pendingMitigants.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pendingMitigants.map((pm, i) => (
              <div key={i} className="rounded-md border border-rose-200/60 bg-transparent p-3 text-xs">
                <p><Badge variant="outline" className="font-mono text-[10px]">{pm.strategy.eCode}</Badge> <strong>{pm.principleLabel}</strong></p>
                <p className="text-muted-foreground italic mt-1">"{pm.justification}"</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {registered.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Mitigantes registrados ({registered.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {registered.map((rm) => (
              <div key={rm.mitigant.id} className="rounded-md border bg-transparent p-3 text-xs space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-[10px]">{rm.strategy.eCode}</Badge>
                  <span className="font-semibold">{rm.principleLabel}</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">{rm.mitigant.postSeverity}</Badge>
                </div>
                <p>{rm.mitigant.text}</p>
                <p className="text-muted-foreground">Responsable: <strong>{rm.mitigant.responsible}</strong> · Plazo: {rm.mitigant.deadline.replace(/_/g, " ")} · KPI: {rm.mitigant.indicator}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {pendingMitigants.length === 0 && registered.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No hay violaciones detectadas ni mitigantes registrados. Continua al Paso 3.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="size-4 mr-1.5" /> Volver a evaluar</Button>
        <Button size="sm" onClick={onNext} className="ml-auto">Continuar al resumen <ArrowRight className="size-4 ml-1.5" /></Button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 3 — APROBAR
// ───────────────────────────────────────────────────────────────────────

function Paso3({ setup, cycleId: _cycleId, onBack }: { setup: EthicsSetup; cycleId: string; onBack: () => void }) {
  const counts = { aprobada: 0, aprobada_con_mitigantes: 0, requiere_mitigacion: 0, rechazada: 0, pendiente: 0 };
  for (const s of setup.strategies) {
    const v = getVerdictKey(s, setup.evalsMap);
    if (v in counts) (counts as Record<string, number>)[v]++;
  }

  // Análisis narrativo
  const narrative = useMemo(() => {
    const parts: string[] = [];
    if (counts.aprobada > 0 && counts.rechazada === 0) {
      parts.push(`Tu portafolio estrategico tiene un perfil etico solido: ninguna estrategia fue rechazada eticamente.`);
    }
    if (counts.aprobada_con_mitigantes > 0) {
      parts.push(`${counts.aprobada_con_mitigantes} estrategia(s) quedaron aprobadas con mitigantes registrados.`);
    }
    const ejemplares = setup.strategies.filter((s) => {
      const e = setup.evalsMap[s.id];
      return countPromueve(e) >= 3 && countViolations(e) === 0;
    });
    if (ejemplares.length > 0) {
      parts.push(`Las estrategias ${ejemplares.map((s) => s.eCode).join(", ")} sobresalen por promover activamente principios eticos. Considera destacar esta dimension etica en la comunicacion del plan estrategico.`);
    }
    if (counts.rechazada > 0) {
      parts.push(`${counts.rechazada} estrategia(s) fueron rechazadas y no formaran parte del plan final.`);
    }
    return parts.length > 0 ? parts.join(" ") : "Aun no se han evaluado todas las estrategias. Termina el Paso 1.";
  }, [counts, setup]);

  // Mitigantes registrados
  const allMitigants: Array<{ strategy: StrategyOut; mitigant: MitigantItem; principleLabel: string }> = [];
  for (const s of setup.strategies) {
    const e = setup.evalsMap[s.id];
    if (!e) continue;
    for (const m of e.mitigants) {
      const p = e.principles.find((pp) => pp.id === m.principleId);
      if (p) {
        const pdef = PRINCIPLES.find((pp) => pp.key === p.principleKey);
        allMitigants.push({ strategy: s, mitigant: m, principleLabel: pdef?.label ?? p.principleKey });
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard label="Aprobadas" count={counts.aprobada} info={VERDICT_INFO.aprobada} subtitle="pasan al Plan Integral" />
        <SummaryCard label="Con mitigantes" count={counts.aprobada_con_mitigantes} info={VERDICT_INFO.aprobada_con_mitigantes} subtitle="aprobadas con compromisos" />
        <SummaryCard label="Rechazadas" count={counts.rechazada} info={VERDICT_INFO.rechazada} subtitle="descartadas por etica" />
      </div>

      {/* Matriz etica */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Matriz etica</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs">
                <th className="text-left p-2">Estrategia</th>
                {BLOCK_ORDER.map((b) => (
                  <th key={b} className="text-center p-2" style={{ color: BLOCK_INFO[b].color }}>{BLOCK_INFO[b].label}</th>
                ))}
                <th className="text-center p-2">Veredicto</th>
              </tr>
            </thead>
            <tbody>
              {setup.strategies.map((s) => {
                const e = setup.evalsMap[s.id];
                const verdict = getVerdictKey(s, setup.evalsMap);
                const vi = verdict === "pendiente"
                  ? { color: "#6b7280", bg: "transparent", border: "#e5e7eb", label: "Pendiente", icon: "—" }
                  : VERDICT_INFO[verdict];
                const promueveTotal = countPromueve(e);
                const isEjemplar = promueveTotal >= 3 && countViolations(e) === 0;
                return (
                  <tr key={s.id} className="border-b" style={{ backgroundColor: vi.bg }}>
                    <td className="p-2">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="font-mono text-[10px] shrink-0">{s.eCode}</Badge>
                        <span className="text-xs leading-snug">{s.text}</span>
                        {isEjemplar && <Badge variant="outline" className="text-[9px] bg-transparent text-emerald-700 border-emerald-300 shrink-0"><Leaf className="size-2.5 mr-0.5" />Ejemplar</Badge>}
                      </div>
                    </td>
                    {BLOCK_ORDER.map((b) => {
                      const blockPrinciples = e?.principles.filter((p) => p.block === b) ?? [];
                      const violations = blockPrinciples.filter((p) => p.rating === "viola");
                      const promueve = blockPrinciples.filter((p) => p.rating === "promueve").length;
                      const mitigated = violations.every((v) => e?.mitigants.some((m) => m.principleId === v.id));
                      let stateLabel = "—";
                      let stateColor = "#6b7280";
                      let stateBg = "transparent";
                      if (violations.length > 0 && !mitigated) { stateLabel = "Viola"; stateColor = "#f87171"; stateBg = "rgba(220,38,38,0.1)"; }
                      else if (violations.length > 0 && mitigated) { stateLabel = "Mitigado"; stateColor = "#F59E0B"; stateBg = "rgba(245,158,11,0.1)"; }
                      else if (promueve > 0) { stateLabel = "Promueve"; stateColor = "#4ade80"; stateBg = "rgba(22,163,74,0.1)"; }
                      else if (blockPrinciples.length > 0) { stateLabel = "Limpio"; stateColor = "#4ade80"; stateBg = "rgba(22,163,74,0.04)"; }
                      return (
                        <td key={b} className="p-2 text-center">
                          <Badge variant="outline" className="text-[10px]" style={{ color: stateColor, backgroundColor: stateBg, borderColor: stateColor }}>
                            {stateLabel}
                          </Badge>
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
        <CardHeader className="pb-2"><CardTitle className="text-sm">Analisis etico del portafolio</CardTitle></CardHeader>
        <CardContent><p className="text-sm leading-relaxed text-foreground/85">{narrative}</p></CardContent>
      </Card>

      {/* Lista de mitigantes para M4 */}
      {allMitigants.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Mitigantes registrados ({allMitigants.length}) · compromisos para M4</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {allMitigants.map((rm) => (
              <div key={rm.mitigant.id} className="rounded-md border bg-transparent p-3 text-xs space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-[10px]">{rm.strategy.eCode}</Badge>
                  <span className="font-semibold">{rm.principleLabel}</span>
                </div>
                <p>{rm.mitigant.text}</p>
                <p className="text-muted-foreground">
                  Resp: <strong>{rm.mitigant.responsible}</strong> · Plazo: {rm.mitigant.deadline.replace(/_/g, " ")} · KPI: {rm.mitigant.indicator}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Puente didactico */}
      <Card className="border-2 border-primary/30">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <ArrowRightCircle className="size-5 shrink-0 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">¿Que sigue?</p>
              <p className="text-muted-foreground">
                En el proximo modulo (<strong>Plan Estrategico Integral</strong>) se consolidara todo tu trabajo
                en un documento final con las estrategias aprobadas y los mitigantes incluidos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="size-4 mr-1.5" /> Volver a evaluar</Button>
        <Link href={`/cycles/${_cycleId}/m3-formulation`} className="ml-auto">
          <Button size="sm">Continuar al Plan Integral <ArrowRight className="size-4 ml-1.5" /></Button>
        </Link>
      </div>
    </div>
  );
}

function SummaryCard({ label, count, info, subtitle }: { label: string; count: number; info: { color: string; bg: string; border: string }; subtitle: string }) {
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
