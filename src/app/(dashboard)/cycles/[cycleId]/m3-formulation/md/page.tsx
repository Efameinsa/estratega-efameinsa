"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { compareStrategies } from "@/lib/strategy-similarity";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Check, ChevronDown, ChevronRight, Info, ArrowLeft, ArrowRight,
  AlertTriangle, Save, X, Layers, Pencil, Trash2, Sparkles,
  ArrowRightCircle,
} from "lucide-react";

const MATRIX_INFO = {
  foda_cruzado: { label: "FODA", color: "#2563EB" },
  peyea: { label: "PEYEA", color: "#8B5CF6" },
  bcg: { label: "BCG", color: "#F59E0B" },
  ie: { label: "IE", color: "#4ade80" },
  ge: { label: "GE", color: "#F43F5E" },
} as const;

type SourceMatrix = keyof typeof MATRIX_INFO;

interface SourceStrategy {
  id: string; eCode: string; description: string;
  swotQuadrant: string; type: string | null;
  sourceMatrix: SourceMatrix;
}
interface OlpItem { id: string; olpCode: string; description: string; bscPerspective: string | null }
interface OriginItem {
  id: string;
  sourceStrategyId: string;
  sourceMatrix: string;
  sourceText: string;
  sourceCode: string | null;
}
interface OlpLinkItem { id: string; olpId: string; origin: string }
interface ConsolidatedItem {
  id: string;
  eCode: string;
  text: string;
  type: string | null;
  status: string;
  totalAppearances: number;
  origins: OriginItem[];
  olpLinks: OlpLinkItem[];
}
interface MdSetup {
  strategies: SourceStrategy[];
  olps: OlpItem[];
  consolidated: ConsolidatedItem[];
  proposedConsolidation: Array<{ text: string; members: SourceStrategy[] }> | null;
  matricesCompleted: Record<SourceMatrix, boolean>;
}

// ───────────────────────────────────────────────────────────────────────
// MAIN
// ───────────────────────────────────────────────────────────────────────

export default function MdPage() {
  const params = useParams();
  const cycleId = params.cycleId as string;
  const utils = trpc.useUtils();
  const [paso, setPaso] = useState<1 | 2 | 3>(1);

  const { data: setup, isLoading } = trpc.md.getSetup.useQuery({ cycleId });

  const saveConsolidation = trpc.md.saveConsolidation.useMutation({
    onSuccess: () => { utils.md.getSetup.invalidate({ cycleId }); toast.success("Consolidacion guardada"); },
  });

  // Si hay propuesta y no hay consolidacion, persistir la propuesta automaticamente
  useEffect(() => {
    if (!setup) return;
    if (setup.consolidated.length > 0) return;
    if (!setup.proposedConsolidation || setup.proposedConsolidation.length === 0) return;
    const items = setup.proposedConsolidation.map((cluster) => ({
      text: cluster.text,
      origins: cluster.members.map((m) => ({
        sourceStrategyId: m.id,
        sourceMatrix: m.sourceMatrix,
        sourceText: m.description,
        sourceCode: m.eCode,
      })),
    }));
    saveConsolidation.mutate({ cycleId, items });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup?.consolidated.length, setup?.proposedConsolidation?.length]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Cargando Matriz de Decision...</div>;
  if (!setup) return <div className="p-6 text-sm text-muted-foreground">Sin datos</div>;

  if (setup.strategies.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Matriz de Decision (MD)</h1>
          <p className="text-sm text-muted-foreground">Consolida y filtra estrategias de M3</p>
        </div>
        <div className="rounded-xl border border-amber-200/60 bg-transparent p-5">
          <div className="flex gap-3">
            <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Sin estrategias retenidas</p>
              <p className="text-sm text-muted-foreground mb-3">
                Para usar la Matriz de Decision necesitas haber retenido estrategias en al menos una de las 5 matrices anteriores (FODA Cruzado, PEYEA, BCG, IE, GE).
              </p>
              <Link href={`/cycles/${cycleId}/m3-formulation/foda-cruzado`}>
                <Button size="sm">Ir a FODA Cruzado</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Matriz de Decision (MD)</h1>
        <p className="text-sm text-muted-foreground">
          Consolida estrategias de las 5 matrices, fusiona duplicados y vinculalas con tus OLPs.
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
  const steps = [{ id: 1, label: "Consolidar" }, { id: 2, label: "Vincular OLPs" }, { id: 3, label: "Retener" }] as const;
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
// PASO 1 — CONSOLIDAR
// ───────────────────────────────────────────────────────────────────────

function Paso1({ setup, cycleId, onNext }: { setup: MdSetup; cycleId: string; onNext: () => void }) {
  const [threshold, setThreshold] = useState(3);
  const [editingId, setEditingId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const update = trpc.md.updateConsolidated.useMutation({
    onSuccess: () => { utils.md.getSetup.invalidate({ cycleId }); toast.success("Estrategia actualizada"); setEditingId(null); },
  });
  const del = trpc.md.deleteConsolidated.useMutation({
    onSuccess: () => { utils.md.getSetup.invalidate({ cycleId }); toast.success("Eliminada"); },
  });
  const split = trpc.md.splitConsolidated.useMutation({
    onSuccess: (r) => { utils.md.getSetup.invalidate({ cycleId }); toast.success(`Separada en ${r.count} estrategias`); },
  });

  const total = setup.strategies.length;
  const unique = setup.consolidated.length;
  const fused = total - unique;

  // Sort consolidated by totalAppearances desc
  const sorted = [...setup.consolidated].sort((a, b) => b.totalAppearances - a.totalAppearances);
  const overThreshold = sorted.filter((c) => c.totalAppearances >= threshold);
  const belowThreshold = sorted.filter((c) => c.totalAppearances < threshold);

  // Matrices no completas
  const matricesPending = (Object.keys(setup.matricesCompleted) as SourceMatrix[]).filter(
    (m) => !setup.matricesCompleted[m],
  );

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/25/60 bg-primary/10/60 p-4">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Consolidacion automatica</p>
            <p className="text-muted-foreground">
              El sistema reunio las {total} estrategias de las matrices anteriores, detecto duplicados similares
              (por palabras clave compartidas) y conto en cuantas matrices aparece cada una. Las que aparezcan en mas
              matrices son mas solidas.
            </p>
          </div>
        </div>
      </div>

      {matricesPending.length > 0 && (
        <div className="rounded-md border border-amber-200/60 bg-transparent p-3 text-sm flex gap-2">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p>Estas trabajando con estrategias de algunas matrices. Para un analisis mas completo, considera terminar:</p>
            <div className="flex gap-2 flex-wrap mt-1">
              {matricesPending.map((m) => {
                const slug = m === "foda_cruzado" ? "foda-cruzado" : m;
                return (
                  <Link key={m} href={`/cycles/${cycleId}/m3-formulation/${slug}`}>
                    <Button size="sm" variant="outline">{MATRIX_INFO[m].label}</Button>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Flow numerico */}
      <div className="grid grid-cols-3 gap-3">
        <FlowCard label="Estrategias brutas" value={total} description="De las 5 matrices" />
        <FlowCard label="Unicas tras fusionar" value={unique} description={`${fused} duplicados consolidados`} />
        <FlowCard label="Retenidas" value={overThreshold.length} description={`Convergencia ≥ ${threshold} matrices`} highlight />
      </div>

      {/* Umbral */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm">Umbral de retencion:</span>
          <input
            type="number" min="1" max="5" value={threshold}
            onChange={(e) => setThreshold(Math.max(1, Math.min(5, parseInt(e.target.value) || 3)))}
            className="w-16 rounded-md border-2 border-input bg-muted/40 px-2 py-1 text-sm font-bold text-center focus:bg-background"
          />
          <Badge variant="outline" className="bg-transparent text-emerald-700 border-emerald-200">Recomendado: 3</Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            Minimo de matrices que deben recomendar una estrategia para que pase al siguiente modulo
          </span>
        </CardContent>
      </Card>

      {/* Tabla de retenidas */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-emerald-700">Retenidas ({overThreshold.length})</h3>
        <ConsolidatedTable
          items={overThreshold} threshold={threshold}
          editingId={editingId}
          onEdit={(id) => setEditingId(id)} onCancelEdit={() => setEditingId(null)}
          onUpdate={(id, text) => update.mutate({ id, text })}
          onDelete={(id, code) => { if (confirm(`Eliminar ${code}?`)) del.mutate({ id }); }}
          onSplit={(id) => { if (confirm("Separar esta estrategia en sus origenes?")) split.mutate({ id }); }}
          olps={setup.olps}
          retained
        />
      </div>

      {belowThreshold.length > 0 && (
        <div>
          <Separator className="my-4" />
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
            Bajo el umbral · estrategias de contingencia ({belowThreshold.length})
          </h3>
          <ConsolidatedTable
            items={belowThreshold} threshold={threshold}
            editingId={editingId}
            onEdit={(id) => setEditingId(id)} onCancelEdit={() => setEditingId(null)}
            onUpdate={(id, text) => update.mutate({ id, text })}
            onDelete={(id, code) => { if (confirm(`Eliminar ${code}?`)) del.mutate({ id }); }}
            onSplit={(id) => { if (confirm("Separar?")) split.mutate({ id }); }}
            olps={setup.olps}
            retained={false}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button size="sm" onClick={onNext} className="ml-auto">
          Continuar a vincular OLPs <ArrowRight className="size-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

function FlowCard({ label, value, description, highlight }: { label: string; value: number; description: string; highlight?: boolean }) {
  return (
    <Card style={highlight ? { borderColor: "#4ade80", borderWidth: 2 } : undefined}>
      <CardContent className="p-4 text-center">
        <div className={`text-3xl font-bold tabular-nums ${highlight ? "text-emerald-600" : ""}`}>{value}</div>
        <div className="text-xs font-medium mt-1">{label}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{description}</div>
      </CardContent>
    </Card>
  );
}

function ConsolidatedTable({
  items, threshold, editingId, onEdit, onCancelEdit, onUpdate, onDelete, onSplit, olps, retained,
}: {
  items: ConsolidatedItem[];
  threshold: number;
  editingId: string | null;
  onEdit: (id: string) => void;
  onCancelEdit: () => void;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string, code: string) => void;
  onSplit: (id: string) => void;
  olps: OlpItem[];
  retained: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Sin estrategias en este grupo.</p>;
  }
  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-xs">
            <th className="text-left p-2 w-10">#</th>
            <th className="text-left p-2">Estrategia</th>
            <th className="text-center p-2">FODA</th>
            <th className="text-center p-2">PEYEA</th>
            <th className="text-center p-2">BCG</th>
            <th className="text-center p-2">IE</th>
            <th className="text-center p-2">GE</th>
            <th className="text-center p-2">Total</th>
            <th className="text-left p-2">OLPs</th>
            <th className="text-right p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <ConsolidatedRow
              key={c.id} item={c}
              editing={editingId === c.id}
              onEdit={() => onEdit(c.id)}
              onCancelEdit={onCancelEdit}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onSplit={onSplit}
              olps={olps}
              retained={retained}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConsolidatedRow({
  item, editing, onEdit, onCancelEdit, onUpdate, onDelete, onSplit, olps, retained,
}: {
  item: ConsolidatedItem;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string, code: string) => void;
  onSplit: (id: string) => void;
  olps: OlpItem[];
  retained: boolean;
}) {
  const [text, setText] = useState(item.text);
  const [expanded, setExpanded] = useState(false);

  // Conteo por matriz
  const byMatrix: Record<SourceMatrix, number> = { foda_cruzado: 0, peyea: 0, bcg: 0, ie: 0, ge: 0 };
  for (const o of item.origins) {
    if (o.sourceMatrix in byMatrix) byMatrix[o.sourceMatrix as SourceMatrix]++;
  }

  return (
    <>
      <tr className={`border-b ${retained ? "bg-transparent" : "opacity-70"}`}>
        <td className="p-2 align-top">
          <button onClick={() => setExpanded(!expanded)} className="font-mono text-[11px] text-primary hover:underline">
            {item.eCode}
          </button>
        </td>
        <td className="p-2 align-top">
          {editing ? (
            <div className="space-y-2">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="text-sm" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onUpdate(item.id, text)}><Save className="size-3.5 mr-1" />Guardar</Button>
                <Button size="sm" variant="outline" onClick={() => { setText(item.text); onCancelEdit(); }}><X className="size-3.5 mr-1" />Cancelar</Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm leading-snug">{item.text}</p>
              {item.origins.length > 1 && (
                <Badge variant="outline" className="text-[10px] mt-1 bg-transparent text-amber-700 border-amber-200">
                  {item.origins.length} fusionadas
                </Badge>
              )}
              {!expanded && item.origins.length > 0 && (
                <div className="text-[10px] text-muted-foreground mt-1 truncate">
                  Origenes: {item.origins.map((o) => o.sourceCode).filter(Boolean).join(", ")}
                </div>
              )}
            </>
          )}
        </td>
        {(["foda_cruzado", "peyea", "bcg", "ie", "ge"] as SourceMatrix[]).map((m) => (
          <td key={m} className="p-2 text-center align-top">
            {byMatrix[m] > 0 ? (
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: MATRIX_INFO[m].color }} title={`${byMatrix[m]} estrategia(s) de ${MATRIX_INFO[m].label}`} />
            ) : (
              <span className="text-muted-foreground/40">—</span>
            )}
          </td>
        ))}
        <td className="p-2 text-center align-top">
          <span className={`font-bold tabular-nums ${retained ? "text-emerald-700" : ""}`}>{item.totalAppearances}</span>
        </td>
        <td className="p-2 align-top text-[10px]">
          {item.olpLinks.length > 0
            ? item.olpLinks.map((l) => {
                const olp = olps.find((o) => o.id === l.olpId);
                return olp ? <span key={l.id} className="inline-block font-mono px-1 py-0.5 rounded bg-primary/10 text-primary mr-1">{olp.olpCode}</span> : null;
              })
            : <span className="text-muted-foreground italic">Paso 2</span>
          }
        </td>
        <td className="p-2 text-right align-top">
          {!editing && (
            <div className="flex gap-1 justify-end">
              <button onClick={onEdit} className="size-6 inline-flex items-center justify-center rounded hover:bg-foreground/10 text-muted-foreground hover:text-foreground" title="Editar"><Pencil className="size-3" /></button>
              {item.origins.length > 1 && (
                <button onClick={() => onSplit(item.id)} className="size-6 inline-flex items-center justify-center rounded hover:bg-foreground/10 text-muted-foreground hover:text-foreground" title="Separar"><Layers className="size-3" /></button>
              )}
              <button onClick={() => onDelete(item.id, item.eCode)} className="size-6 inline-flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Eliminar"><Trash2 className="size-3" /></button>
            </div>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b bg-muted/10">
          <td colSpan={10} className="p-3 text-xs space-y-2">
            <p className="font-medium">Textos originales que se consolidaron:</p>
            <ul className="space-y-1">
              {item.origins.map((o) => {
                const mi = MATRIX_INFO[o.sourceMatrix as SourceMatrix];
                return (
                  <li key={o.id} className="flex items-start gap-2">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0" style={{ backgroundColor: `${mi?.color}20`, color: mi?.color }}>
                      {mi?.label ?? o.sourceMatrix}
                    </span>
                    {o.sourceCode && <span className="text-[10px] font-mono shrink-0">{o.sourceCode}:</span>}
                    <span className="text-muted-foreground">{o.sourceText}</span>
                  </li>
                );
              })}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 2 — VINCULAR OLPS
// ───────────────────────────────────────────────────────────────────────

function Paso2({ setup, cycleId, onBack, onNext }: { setup: MdSetup; cycleId: string; onBack: () => void; onNext: () => void }) {
  const utils = trpc.useUtils();
  const setLink = trpc.md.setOlpLink.useMutation({
    onSuccess: () => utils.md.getSetup.invalidate({ cycleId }),
  });

  // Solo mostramos las retenidas (con totalAppearances >= 1, todas si no se descartaron)
  const retained = setup.consolidated.filter((c) => c.status !== "descartada");

  // Sugerencias por similitud entre estrategia y enunciado del OLP
  const suggestions = useMemo(() => {
    const map = new Map<string, Set<string>>(); // consolidatedId -> set olpId sugeridos
    for (const c of retained) {
      const set = new Set<string>();
      for (const o of setup.olps) {
        const sim = compareStrategies(c.text, o.description);
        if (sim >= 0.20) set.add(o.id);
      }
      map.set(c.id, set);
    }
    return map;
  }, [retained, setup.olps]);

  function isLinked(c: ConsolidatedItem, olpId: string): boolean {
    return c.olpLinks.some((l) => l.olpId === olpId);
  }

  function toggle(c: ConsolidatedItem, olpId: string) {
    const linked = !isLinked(c, olpId);
    setLink.mutate({ consolidatedId: c.id, olpId, linked, origin: "user" });
  }

  // Conteos
  const linksByOlp: Record<string, number> = {};
  for (const c of retained) {
    for (const l of c.olpLinks) linksByOlp[l.olpId] = (linksByOlp[l.olpId] ?? 0) + 1;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/25/60 bg-primary/10/60 p-4">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Vincula estrategias con OLPs</p>
            <p className="text-muted-foreground">
              Marca a que OLPs aporta cada estrategia. Las celdas con borde azul claro son
              <Sparkles className="inline size-3 mx-1 text-primary" />
              <strong className="text-primary">sugerencias automaticas</strong> basadas en similitud de texto.
            </p>
          </div>
        </div>
      </div>

      {setup.olps.length === 0 ? (
        <div className="rounded-md border border-amber-200/60 bg-transparent p-4 text-sm flex gap-2">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p>No hay OLPs definidos. Define OLPs antes de vincular.</p>
            <Link href={`/cycles/${cycleId}/m3-formulation/olp`}><Button size="sm" className="mt-2">Ir a OLP</Button></Link>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs">
                <th className="text-left p-2 sticky left-0 bg-muted/30 min-w-[280px]">Estrategia</th>
                {setup.olps.map((o) => (
                  <th key={o.id} className="text-center p-2 min-w-[60px]" title={o.description}>
                    <div className="font-mono text-[10px]">{o.olpCode}</div>
                  </th>
                ))}
                <th className="text-center p-2 min-w-[50px]">Total</th>
              </tr>
            </thead>
            <tbody>
              {retained.map((c) => {
                const sugSet = suggestions.get(c.id) ?? new Set();
                const linkedCount = c.olpLinks.length;
                return (
                  <tr key={c.id} className="border-b hover:bg-muted/20">
                    <td className="p-2 sticky left-0 bg-background">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="font-mono text-[10px] shrink-0">{c.eCode}</Badge>
                        <span className="text-xs leading-snug">{c.text}</span>
                      </div>
                    </td>
                    {setup.olps.map((o) => {
                      const linked = isLinked(c, o.id);
                      const suggested = sugSet.has(o.id) && !linked;
                      return (
                        <td key={o.id} className="p-2 text-center">
                          <button
                            onClick={() => toggle(c, o.id)}
                            className={`size-5 rounded border-2 flex items-center justify-center transition-colors ${
                              linked
                                ? "bg-primary border-primary text-white"
                                : suggested
                                  ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/15"
                                  : "border-input hover:border-foreground/40"
                            }`}
                            title={suggested ? "Sugerencia automatica" : linked ? "Vinculada" : "Sin vincular"}
                          >
                            {linked ? <Check className="size-3.5" /> : suggested ? <Sparkles className="size-2.5" /> : null}
                          </button>
                        </td>
                      );
                    })}
                    <td className="p-2 text-center text-xs font-bold tabular-nums">
                      {linkedCount === 0 ? (
                        <span className="text-amber-600" title="Sin OLPs - revisar relevancia">{linkedCount}</span>
                      ) : linkedCount}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-muted/30 text-xs">
                <td className="p-2 font-medium sticky left-0 bg-muted/30">Total estrategias por OLP</td>
                {setup.olps.map((o) => {
                  const n = linksByOlp[o.id] ?? 0;
                  return (
                    <td key={o.id} className="p-2 text-center">
                      <span className={`font-bold tabular-nums ${n === 0 ? "text-amber-600" : ""}`}>{n}</span>
                    </td>
                  );
                })}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Alertas */}
      <div className="space-y-1">
        {retained.filter((c) => c.olpLinks.length === 0).map((c) => (
          <div key={c.id} className="rounded-md border border-amber-200/60 bg-transparent p-2 text-xs flex gap-2">
            <AlertTriangle className="size-3.5 shrink-0 text-amber-600 mt-0.5" />
            <span><strong>{c.eCode}</strong> no aporta a ningun OLP. ¿Es relevante?</span>
          </div>
        ))}
        {setup.olps.filter((o) => !linksByOlp[o.id]).map((o) => (
          <div key={o.id} className="rounded-md border border-amber-200/60 bg-transparent p-2 text-xs flex gap-2">
            <AlertTriangle className="size-3.5 shrink-0 text-amber-600 mt-0.5" />
            <span><strong>{o.olpCode}</strong> ({o.description}) no recibe contribucion de ninguna estrategia retenida.</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="size-4 mr-1.5" /> Atras</Button>
        <Button size="sm" onClick={onNext} className="ml-auto">Continuar al resumen <ArrowRight className="size-4 ml-1.5" /></Button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 3 — RETENER
// ───────────────────────────────────────────────────────────────────────

function Paso3({ setup, cycleId, onBack }: { setup: MdSetup; cycleId: string; onBack: () => void }) {
  const retained = setup.consolidated.filter((c) => c.status !== "descartada" && c.totalAppearances >= 1);
  const contingencia = setup.consolidated.filter((c) => c.status === "contingencia");
  const olpsCovered = new Set<string>();
  for (const c of retained) for (const l of c.olpLinks) olpsCovered.add(l.olpId);
  const uncovered = setup.olps.filter((o) => !olpsCovered.has(o.id));

  // Diagnostico
  const observations: string[] = [];
  if (retained.length > 10) observations.push(`Tienes ${retained.length} estrategias retenidas (recomendado 4-7). Considera elevar el umbral.`);
  if (retained.length < 3) observations.push(`Solo tienes ${retained.length} estrategias retenidas. Considera bajar el umbral.`);
  for (const o of uncovered) observations.push(`${o.olpCode} sin contribucion de ninguna estrategia.`);
  for (const c of retained) if (c.olpLinks.length === 0) observations.push(`${c.eCode} no aporta a ningun OLP.`);
  const isOk = observations.length === 0;
  const avgConvergence = retained.length > 0
    ? retained.reduce((s, c) => s + c.totalAppearances, 0) / retained.length
    : 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resumen ejecutivo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="rounded border p-3">
            <div className="text-2xl font-bold text-emerald-600">{retained.length}</div>
            <div className="text-xs text-muted-foreground">retenidas para MCPE</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-2xl font-bold text-muted-foreground">{contingencia.length}</div>
            <div className="text-xs text-muted-foreground">en contingencia</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-2xl font-bold text-primary">{olpsCovered.size}</div>
            <div className="text-xs text-muted-foreground">de {setup.olps.length} OLPs cubiertos</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-2xl font-bold">{avgConvergence.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">convergencia promedio</div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de retenidas */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-emerald-700">Estrategias retenidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {retained.map((c) => (
            <div key={c.id} className="rounded-lg border border-emerald-200 bg-transparent p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">{c.eCode}</Badge>
                <Badge variant="outline" className="text-[10px]" style={{ color: "#4ade80", borderColor: "rgba(22,163,74,0.4)" }}>
                  {c.totalAppearances} matrices
                </Badge>
              </div>
              <p className="text-sm leading-snug">{c.text}</p>
              {c.olpLinks.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.olpLinks.map((l) => {
                    const olp = setup.olps.find((o) => o.id === l.olpId);
                    return olp ? (
                      <span key={l.id} className="inline-block font-mono text-[10px] px-1 py-0.5 rounded bg-primary/15 text-primary">{olp.olpCode}</span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Diagnostico */}
      {isOk ? (
        <div className="rounded-md border border-emerald-200/60 bg-transparent p-3 text-sm">
          <Check className="inline size-4 mr-1 text-emerald-600" />
          <strong>Tu conjunto de estrategias retenidas esta balanceado:</strong>
          <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 pl-4 list-disc">
            <li>{retained.length} estrategias seleccionadas (recomendado: 4-7)</li>
            <li>Cubren todos tus OLPs</li>
            <li>Convergencia promedio: {avgConvergence.toFixed(1)} matrices por estrategia</li>
          </ul>
        </div>
      ) : (
        <div className="rounded-md border border-amber-200/60 bg-transparent p-3 text-sm">
          <AlertTriangle className="inline size-4 mr-1 text-amber-600" />
          <strong>Observaciones:</strong>
          <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 pl-4 list-disc">
            {observations.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
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
                En el proximo modulo (<strong>MCPE</strong>) puntuaras cuantitativamente las estrategias retenidas
                contra los factores de tu FODA para priorizarlas por atractivo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="size-4 mr-1.5" /> Atras</Button>
        <Link href={`/cycles/${cycleId}/m3-formulation`} className="ml-auto">
          <Button size="sm">Continuar a MCPE <ArrowRight className="size-4 ml-1.5" /></Button>
        </Link>
      </div>
    </div>
  );
}
