"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Plus, Trash2, Pencil, Check, ChevronDown, ChevronRight, Info,
  ArrowLeft, ArrowRight, AlertTriangle, Save, Coins, Users, Settings,
  GraduationCap, BookOpen, Search, X, Copy, ArrowRightCircle,
} from "lucide-react";

type Dimension = "FIN" | "CLI" | "INT" | "APR";

interface FodaItem { id: string; code: string; text: string; weight: number }
interface OlpRef { refType: string; refId: string; refCode: string | null; refText: string | null; manual: boolean }
interface OlpItem {
  id: string;
  olpCode: string;
  description: string;
  metric: string | null;
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
  bscPerspective: string | null;
  responsible: string | null;
  priority: string | null;
  targetYear: number | null;
  references: OlpRef[];
}
interface StrategyItem {
  id: string; eCode: string; description: string;
  swotQuadrant: string; type: string | null;
}
interface OlpSetup {
  vision: { text: string; year: number | null } | null;
  foda: { fortalezas: FodaItem[]; oportunidades: FodaItem[]; debilidades: FodaItem[]; amenazas: FodaItem[] };
  strategies: StrategyItem[];
  olps: OlpItem[];
}

const DIMENSION_INFO: Record<Dimension, { label: string; question: string; icon: React.ElementType; color: string; bg: string; border: string; placeholder: string }> = {
  FIN: { label: "Resultados economicos", question: "¿Cuanto quieres facturar o ganar?", icon: Coins, color: "#4ade80", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.35)", placeholder: "Al 2030, alcanzar ingresos anuales de USD X millones." },
  CLI: { label: "Posicion en el mercado", question: "¿Que cuota o reconocimiento quieres tener?", icon: Users, color: "#2563EB", bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.35)", placeholder: "Al 2030, alcanzar el X% de cuota de mercado en [region o segmento]." },
  INT: { label: "Como opera la empresa", question: "¿Que procesos o certificaciones quieres lograr?", icon: Settings, color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.35)", placeholder: "Al 2028, contar con X plantas certificadas en [norma]." },
  APR: { label: "Las personas y la cultura", question: "¿Que quieres construir en talento y cultura?", icon: GraduationCap, color: "#8B5CF6", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.35)", placeholder: "Al 2030, ser una de las X mejores empresas para trabajar en el sector." },
};

const PRIORITY_INFO: Record<string, { label: string; color: string; bg: string; border: string }> = {
  alta:  { label: "Alta",  color: "#f87171", bg: "rgba(244,63,94,0.1)",   border: "rgba(244,63,94,0.4)" },
  media: { label: "Media", color: "#B45309", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.4)" },
  baja:  { label: "Baja",  color: "#15803D", bg: "rgba(22,163,74,0.1)",  border: "rgba(22,163,74,0.4)" },
};

// ───────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ───────────────────────────────────────────────────────────────────────

export default function OlpPage() {
  const params = useParams();
  const cycleId = params.cycleId as string;
  const [paso, setPaso] = useState<1 | 2 | 3>(1);

  const { data: setup, isLoading } = trpc.olp.getSetup.useQuery({ cycleId });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Cargando OLPs...</div>;
  if (!setup) return <div className="p-6 text-sm text-muted-foreground">Sin datos</div>;

  const fodaTotal =
    setup.foda.fortalezas.length + setup.foda.oportunidades.length +
    setup.foda.debilidades.length + setup.foda.amenazas.length;

  if (!setup.vision || fodaTotal === 0) {
    return (
      <div className="container mx-auto max-w-3xl p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Objetivos de Largo Plazo (OLP)</h1>
          <p className="text-sm text-muted-foreground">Define las metas concretas que debe alcanzar tu empresa</p>
        </div>
        <div className="rounded-xl border border-amber-200/60 bg-transparent dark:border-amber-900/40 dark:bg-transparent p-5">
          <div className="flex gap-3">
            <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Antes de definir OLPs necesitas:</p>
              <ul className="text-sm text-muted-foreground mb-3 space-y-1 list-disc pl-4">
                {!setup.vision && <li>Definir tu Vision en M1 · Identidad</li>}
                {fodaTotal === 0 && <li>Completar el FODA Consolidado en M2 · Diagnostico</li>}
              </ul>
              <div className="flex gap-2">
                {!setup.vision && (<Link href={`/cycles/${cycleId}/m1-identity/vision`}><Button size="sm">Ir a Vision</Button></Link>)}
                {fodaTotal === 0 && (<Link href={`/cycles/${cycleId}/m2-diagnosis/foda`}><Button size="sm" variant={setup.vision ? "default" : "outline"}>Ir a FODA</Button></Link>)}
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
        <h1 className="text-2xl font-semibold tracking-tight">Objetivos de Largo Plazo (OLP)</h1>
        <p className="text-sm text-muted-foreground">
          Define las metas concretas y medibles que tienes que lograr para que tu vision se cumpla.
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
  const steps = [
    { id: 1, label: "Contexto" },
    { id: 2, label: "Definir OLPs" },
    { id: 3, label: "Revisar y continuar" },
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

function Paso1({ setup, cycleId, onNext }: { setup: OlpSetup; cycleId: string; onNext: () => void }) {
  const top3 = (arr: FodaItem[]) => [...arr].sort((a, b) => b.weight - a.weight).slice(0, 3);
  const fodaTotal = setup.foda.fortalezas.length + setup.foda.oportunidades.length + setup.foda.debilidades.length + setup.foda.amenazas.length;
  const strategiesByCross: Record<string, number> = { FO: 0, FA: 0, DO: 0, DA: 0 };
  const strategiesByMatrix: Record<string, number> = { FODA: 0, PEYEA: 0, BCG: 0, IE: 0, GE: 0 };
  for (const s of setup.strategies) {
    const t = s.type ?? "";
    if (["FO", "FA", "DO", "DA"].includes(t)) { strategiesByCross[t]++; strategiesByMatrix.FODA++; }
    else if (t === "PEYEA") strategiesByMatrix.PEYEA++;
    else if (t === "IE") strategiesByMatrix.IE++;
    else if (t === "GE") strategiesByMatrix.GE++;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/25/60 bg-primary/10/60 dark:border-primary/40 dark:bg-primary/90/30 p-4">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Como funciona este modulo</p>
            <p className="text-muted-foreground">
              Antes de definir tus Objetivos de Largo Plazo, revisa el contexto. Estos insumos
              te guiaran para formular metas ambiciosas pero alcanzables.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Vision</span>
            {setup.vision?.year && <Badge variant="outline">Año meta: {setup.vision.year}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm italic leading-relaxed">"{setup.vision?.text}"</p>
          <Link href={`/cycles/${cycleId}/m1-identity/vision`} className="inline-block mt-3">
            <Button variant="outline" size="sm">Editar vision</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>FODA Consolidado</span>
            <Badge variant="outline">
              {setup.foda.fortalezas.length}F · {setup.foda.oportunidades.length}O · {setup.foda.debilidades.length}D · {setup.foda.amenazas.length}A · {fodaTotal} factores
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <FodaPreview title="Fortalezas" items={top3(setup.foda.fortalezas)} color="#4ade80" />
          <FodaPreview title="Oportunidades" items={top3(setup.foda.oportunidades)} color="#2563EB" />
          <FodaPreview title="Debilidades" items={top3(setup.foda.debilidades)} color="#F43F5E" />
          <FodaPreview title="Amenazas" items={top3(setup.foda.amenazas)} color="#F59E0B" />
        </CardContent>
        <CardContent className="pt-0">
          <Link href={`/cycles/${cycleId}/m2-diagnosis/foda`}>
            <Button variant="outline" size="sm">Editar FODA</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Estrategias generadas</span>
            <Badge variant="outline">{setup.strategies.length} en total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="text-[10px]">FODA Cruzado: {strategiesByMatrix.FODA}</Badge>
            <Badge variant="outline" className="text-[10px]">PEYEA: {strategiesByMatrix.PEYEA}</Badge>
            <Badge variant="outline" className="text-[10px]">IE: {strategiesByMatrix.IE}</Badge>
            <Badge variant="outline" className="text-[10px]">GE: {strategiesByMatrix.GE}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Por cruce FODA: FO {strategiesByCross.FO} · FA {strategiesByCross.FA} · DO {strategiesByCross.DO} · DA {strategiesByCross.DA}
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">Top 5 por orden:</p>
          <ul className="space-y-1.5">
            {setup.strategies.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-start gap-2 text-xs">
                <Badge variant="outline" className="font-mono text-[10px] shrink-0">{s.eCode}</Badge>
                <span className="leading-snug">{s.description}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={onNext} className="ml-auto">
          Continuar a definir OLPs <ArrowRight className="size-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

function FodaPreview({ title, items, color }: { title: string; items: FodaItem[]; color: string }) {
  return (
    <div className="rounded-md border p-2" style={{ borderColor: `${color}55` }}>
      <div className="text-[11px] font-semibold mb-1" style={{ color }}>{title}</div>
      {items.length === 0 ? (
        <p className="text-[10px] text-muted-foreground italic">Vacio</p>
      ) : (
        items.map((it) => (
          <div key={it.id} className="flex items-start gap-1.5 text-[11px] mb-0.5">
            <Badge variant="outline" className="font-mono text-[9px] shrink-0" style={{ color, borderColor: `${color}55` }}>{it.code}</Badge>
            <span className="leading-snug truncate">{it.text}</span>
          </div>
        ))
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 2
// ───────────────────────────────────────────────────────────────────────

function Paso2({ setup, cycleId, onBack, onNext }: { setup: OlpSetup; cycleId: string; onBack: () => void; onNext: () => void }) {
  const [editingOlpId, setEditingOlpId] = useState<string | null>(null);
  const [creatingDim, setCreatingDim] = useState<Dimension | null>(null);

  const olpsByDim = useMemo(() => {
    const map: Record<Dimension, OlpItem[]> = { FIN: [], CLI: [], INT: [], APR: [] };
    for (const o of setup.olps) {
      const d = (o.bscPerspective as Dimension) || "FIN";
      if (map[d]) map[d].push(o);
    }
    return map;
  }, [setup.olps]);

  const totalOlps = setup.olps.length;
  const allDimsCovered = (Object.keys(olpsByDim) as Dimension[]).every((d) => olpsByDim[d].length > 0);

  const editingDescription = editingOlpId
    ? setup.olps.find((o) => o.id === editingOlpId)?.description ?? ""
    : "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        <div className="rounded-xl border border-primary/25/60 bg-primary/10/60 dark:border-primary/40 dark:bg-primary/90/30 p-4">
          <div className="flex gap-3">
            <Info className="size-5 shrink-0 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">Define tus OLPs</p>
              <p className="text-muted-foreground">
                Son las metas concretas que tienes que lograr para que tu vision se cumpla.
                Lo recomendable es definir entre 4 y 7 OLPs distribuidos en distintas dimensiones del negocio.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-sm font-medium">Tus OLPs · <strong>{totalOlps}</strong> de 4-7 recomendados</div>
          {setup.vision?.year && (<Badge variant="outline">Horizonte: {setup.vision.year}</Badge>)}
        </div>

        {totalOlps < 4 && totalOlps > 0 && (
          <div className="rounded-md border border-amber-200/60 bg-transparent p-3 text-xs flex gap-2">
            <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
            <span>Tienes {totalOlps} OLPs definidos. Lo recomendable son entre 4 y 7 para tener un conjunto balanceado.</span>
          </div>
        )}
        {allDimsCovered && (
          <div className="rounded-md border border-emerald-200/60 bg-transparent p-3 text-xs flex gap-2">
            <Check className="size-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>Tu conjunto de OLPs cubre las 4 dimensiones del negocio. Analisis balanceado.</span>
          </div>
        )}

        {(Object.keys(DIMENSION_INFO) as Dimension[]).map((dim) => (
          <DimensionSection
            key={dim} dim={dim}
            olps={olpsByDim[dim]}
            isCreating={creatingDim === dim}
            editingOlpId={editingOlpId}
            cycleId={cycleId}
            setup={setup}
            onCreate={() => { setCreatingDim(dim); setEditingOlpId(null); }}
            onCancelCreate={() => setCreatingDim(null)}
            onEdit={(id) => { setEditingOlpId(id); setCreatingDim(null); }}
            onCancelEdit={() => setEditingOlpId(null)}
          />
        ))}

        <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
          <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="size-4 mr-1.5" /> Atras</Button>
          <Button size="sm" onClick={onNext} className="ml-auto">Revisar y continuar <ArrowRight className="size-4 ml-1.5" /></Button>
        </div>
      </div>

      <ContextSidebar setup={setup} editingDescription={editingDescription} />
    </div>
  );
}

function DimensionSection({
  dim, olps, isCreating, editingOlpId, cycleId, setup, onCreate, onCancelCreate, onEdit, onCancelEdit,
}: {
  dim: Dimension;
  olps: OlpItem[];
  isCreating: boolean;
  editingOlpId: string | null;
  cycleId: string;
  setup: OlpSetup;
  onCreate: () => void;
  onCancelCreate: () => void;
  onEdit: (id: string) => void;
  onCancelEdit: () => void;
}) {
  const info = DIMENSION_INFO[dim];
  const Icon = info.icon;
  return (
    <div>
      <div className="flex items-start gap-3 mb-2">
        <div className="flex size-9 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: info.bg, color: info.color }}>
          <Icon className="size-5" />
        </div>
        <div>
          <div className="font-medium text-sm">{info.label}</div>
          <div className="text-xs text-muted-foreground">{info.question}</div>
        </div>
        <Badge variant="outline" className="ml-auto">{olps.length}</Badge>
      </div>
      <div className="space-y-2">
        {olps.map((olp) =>
          editingOlpId === olp.id ? (
            <OlpForm key={olp.id} dim={dim} cycleId={cycleId} setup={setup} initial={olp} onDone={onCancelEdit} />
          ) : (
            <OlpCard key={olp.id} olp={olp} cycleId={cycleId} onEdit={() => onEdit(olp.id)} />
          ),
        )}
        {isCreating && <OlpForm dim={dim} cycleId={cycleId} setup={setup} onDone={onCancelCreate} />}
        {!isCreating && (
          <button
            type="button"
            onClick={onCreate}
            className="w-full rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-foreground/50 text-muted-foreground hover:text-foreground transition-colors p-3 text-sm flex items-center justify-center gap-2"
          >
            <Plus className="size-4" /> Agregar OLP en {info.label.toLowerCase()}
          </button>
        )}
      </div>
    </div>
  );
}

function OlpCard({ olp, cycleId, onEdit }: { olp: OlpItem; cycleId: string; onEdit: () => void }) {
  const utils = trpc.useUtils();
  const dim = (olp.bscPerspective as Dimension) || "FIN";
  const info = DIMENSION_INFO[dim];

  const del = trpc.olp.delete.useMutation({
    onSuccess: () => { utils.olp.getSetup.invalidate({ cycleId }); toast.success("OLP eliminado"); },
  });
  const dup = trpc.olp.duplicate.useMutation({
    onSuccess: () => { utils.olp.getSetup.invalidate({ cycleId }); toast.success("OLP duplicado"); },
  });

  const observations = useMemo(() => smartCheck(olp.description, olp.targetYear, olp.targetValue), [olp.description, olp.targetYear, olp.targetValue]);

  function handleDelete() {
    if (!confirm(`Eliminar ${olp.olpCode}?\n\n"${olp.description}"`)) return;
    del.mutate({ id: olp.id });
  }

  return (
    <div className="rounded-lg border bg-card p-3" style={{ borderColor: info.border }}>
      <div className="flex items-start gap-2 mb-2">
        <Badge variant="outline" className="font-mono text-[10px] shrink-0" style={{ color: info.color, borderColor: info.border }}>{olp.olpCode}</Badge>
        <p className="text-sm flex-1 leading-snug">{olp.description}</p>
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="size-7 inline-flex items-center justify-center rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground" title="Editar"><Pencil className="size-3.5" /></button>
          <button onClick={() => dup.mutate({ id: olp.id })} className="size-7 inline-flex items-center justify-center rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground" title="Duplicar"><Copy className="size-3.5" /></button>
          <button onClick={handleDelete} className="size-7 inline-flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Eliminar"><Trash2 className="size-3.5" /></button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        <DataPoint label="Punto de partida" value={olp.currentValue !== null ? `${olp.currentValue} ${olp.unit ?? ""}`.trim() : "—"} />
        <DataPoint label="Meta" value={olp.targetValue !== null ? `${olp.targetValue} ${olp.unit ?? ""}`.trim() : "—"} />
        <DataPoint label="Indicador" value={olp.metric ?? "—"} />
        <DataPoint label="Responsable" value={olp.responsible ?? "—"} />
      </div>
      {olp.priority && (
        <div className="mt-2">
          <Badge variant="outline" className="text-[10px]" style={PRIORITY_INFO[olp.priority]}>Prioridad {PRIORITY_INFO[olp.priority]?.label}</Badge>
        </div>
      )}
      {olp.references.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Referencias:</span>
          {olp.references.map((r, i) => (
            <span key={i} className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 border" title={r.refText ?? ""}>{r.refCode ?? `${r.refType}?`}</span>
          ))}
        </div>
      )}
      {observations.length > 0 && (
        <div className="mt-2 text-[11px] text-amber-700 flex gap-1.5 items-start">
          <AlertTriangle className="size-3 mt-0.5 shrink-0" />
          <span>{observations.join(" · ")}</span>
        </div>
      )}
    </div>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium truncate">{value}</div>
    </div>
  );
}

function smartCheck(text: string, targetYear: number | null, targetValue: number | null): string[] {
  const obs: string[] = [];
  if (!text || text.length < 20) {
    obs.push("Enunciado muy corto");
    return obs;
  }
  const hasYear = targetYear !== null || /\b(20\d{2}|al \d{4})\b/i.test(text);
  if (!hasYear) obs.push("Falta año meta — agrega 'Al [año],...'");
  const hasNumber = targetValue !== null || /\d/.test(text);
  if (!hasNumber) obs.push("Sin meta cuantitativa — agrega un numero, % o valor");
  if (/\b(mejorar|optimizar|fortalecer)\b/i.test(text) && !hasNumber) {
    obs.push("Verbos vagos — usa 'aumentar a X%', 'reducir a X', 'alcanzar X'");
  }
  return obs;
}

function OlpForm({
  dim, cycleId, setup, initial, onDone,
}: {
  dim: Dimension;
  cycleId: string;
  setup: OlpSetup;
  initial?: OlpItem;
  onDone: () => void;
}) {
  const utils = trpc.useUtils();
  const info = DIMENSION_INFO[dim];

  const [description, setDescription] = useState(initial?.description ?? "");
  const [metric, setMetric] = useState(initial?.metric ?? "");
  const [currentValue, setCurrentValue] = useState(initial?.currentValue?.toString() ?? "");
  const [targetValue, setTargetValue] = useState(initial?.targetValue?.toString() ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [responsible, setResponsible] = useState(initial?.responsible ?? "");
  const [priority, setPriority] = useState<"alta" | "media" | "baja">((initial?.priority as "alta"|"media"|"baja") ?? "media");
  const [targetYear, setTargetYear] = useState(initial?.targetYear?.toString() ?? (setup.vision?.year?.toString() ?? ""));
  const [refs, setRefs] = useState<OlpRef[]>(initial?.references ?? []);

  const create = trpc.olp.create.useMutation({
    onSuccess: () => { utils.olp.getSetup.invalidate({ cycleId }); toast.success("OLP creado"); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.olp.update.useMutation({
    onSuccess: () => { utils.olp.getSetup.invalidate({ cycleId }); toast.success("OLP actualizado"); onDone(); },
    onError: (e) => toast.error(e.message),
  });

  const suggestions = useMemo(() => {
    if (!description || description.length < 15) return [];
    return suggestStrategies(description, setup.strategies, 3);
  }, [description, setup.strategies]);

  function addRef(refType: string, refId: string, refCode: string, refText: string, manual: boolean) {
    setRefs((cur) => {
      if (cur.some((r) => r.refType === refType && r.refId === refId)) return cur;
      return [...cur, { refType, refId, refCode, refText, manual }];
    });
  }
  function removeRef(refType: string, refId: string) {
    setRefs((cur) => cur.filter((r) => !(r.refType === refType && r.refId === refId)));
  }

  function handleSave() {
    if (!description.trim()) {
      toast.error("Escribe el enunciado del OLP"); return;
    }
    const payload = {
      description: description.trim(),
      metric: metric.trim() || undefined,
      currentValue: currentValue ? parseFloat(currentValue) : undefined,
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
      unit: unit.trim() || undefined,
      bscPerspective: dim,
      responsible: responsible.trim() || undefined,
      priority,
      targetYear: targetYear ? parseInt(targetYear, 10) : undefined,
      references: refs.map((r) => ({
        refType: r.refType as "F" | "O" | "D" | "A" | "strategy",
        refId: r.refId,
        refCode: r.refCode ?? undefined,
        refText: r.refText ?? undefined,
        manual: r.manual,
      })),
    };
    if (initial) update.mutate({ id: initial.id, ...payload });
    else create.mutate({ cycleId, ...payload });
  }

  const obs = smartCheck(description, targetYear ? parseInt(targetYear) : null, targetValue ? parseFloat(targetValue) : null);

  return (
    <div className="rounded-lg border-2 bg-card p-4 space-y-3" style={{ borderColor: "#3B82F6" }}>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/25">EDITANDO</Badge>
        <span className="text-xs text-muted-foreground">{info.label}</span>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Enunciado del OLP</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={info.placeholder} rows={3} className="text-sm" />
      </div>

      {suggestions.length > 0 && (
        <div className="rounded-md border border-primary/25/60 bg-primary/10/40 p-3 text-xs">
          <p className="font-medium text-primary mb-1">Sugerencia: {suggestions.length} estrategia(s) relacionada(s)</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => addRef("strategy", s.id, s.eCode, s.description, false)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-background text-[11px] hover:bg-muted/40"
                title={s.description}
              >
                <Plus className="size-2.5" /> {s.eCode}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Punto de partida</label>
          <Input type="number" step="any" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} className="text-sm" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Meta</label>
          <Input type="number" step="any" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="text-sm" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Unidad</label>
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="USD M, %, dias..." className="text-sm" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Año meta</label>
          <Input type="number" value={targetYear} onChange={(e) => setTargetYear(e.target.value)} className="text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="md:col-span-1">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Indicador (como medir)</label>
          <Input value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="Ingresos anuales" className="text-sm" />
        </div>
        <div className="md:col-span-1">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Responsable</label>
          <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Gerencia Comercial" className="text-sm" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Prioridad</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as "alta"|"media"|"baja")} className="w-full h-8 rounded-md border border-input bg-card px-2 text-sm">
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
      </div>

      {refs.length > 0 && (
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Referencias usadas</label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {refs.map((r, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 border">
                {r.refCode ?? r.refType}
                <button type="button" onClick={() => removeRef(r.refType, r.refId)} className="hover:text-destructive">
                  <X className="size-2.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {obs.length > 0 && (
        <div className="rounded-md border border-amber-200/60 bg-transparent p-2 text-[11px] text-amber-700 flex gap-2 items-start">
          <AlertTriangle className="size-3 mt-0.5 shrink-0" />
          <span>{obs.join(" · ")}</span>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onDone}>Cancelar</Button>
        <Button size="sm" onClick={handleSave} disabled={create.isPending || update.isPending}>
          <Save className="size-4 mr-1.5" />
          {create.isPending || update.isPending ? "Guardando..." : "Guardar OLP"}
        </Button>
      </div>
    </div>
  );
}

function suggestStrategies(text: string, strategies: StrategyItem[], limit: number): StrategyItem[] {
  const stop = new Set(["el", "la", "los", "las", "de", "en", "y", "o", "a", "al", "del", "que", "para", "con", "un", "una", "se", "es", "lo", "su", "por", "como"]);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-záéíóúñü\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3 && !stop.has(t));
  const scored: { s: StrategyItem; score: number }[] = strategies.map((s) => {
    const desc = s.description.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (desc.includes(t)) score += 1;
    }
    return { s, score };
  });
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.s);
}

function ContextSidebar({ setup, editingDescription }: { setup: OlpSetup; editingDescription: string }) {
  const [search, setSearch] = useState("");
  const [filterCross, setFilterCross] = useState<"" | "FO" | "FA" | "DO" | "DA">("");
  const [openVision, setOpenVision] = useState(false);
  const [openFoda, setOpenFoda] = useState(false);

  const related = useMemo(() => {
    if (!editingDescription) return [];
    return suggestStrategies(editingDescription, setup.strategies, 5);
  }, [editingDescription, setup.strategies]);

  const filteredStrategies = setup.strategies.filter((s) => {
    if (filterCross && s.type !== filterCross && s.swotQuadrant !== filterCross) return false;
    if (search && !s.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <aside className="lg:sticky lg:top-4 lg:self-start space-y-3 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <BookOpen className="size-4" /> Tu analisis previo
      </div>

      <Card>
        <button type="button" onClick={() => setOpenVision(!openVision)} className="w-full p-3 flex items-center justify-between hover:bg-accent/30 transition-colors text-left">
          <span className="text-sm font-medium">Vision</span>
          {openVision ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
        </button>
        {openVision && setup.vision && (
          <CardContent className="pt-0 text-xs italic leading-relaxed">"{setup.vision.text}"</CardContent>
        )}
      </Card>

      <Card>
        <button type="button" onClick={() => setOpenFoda(!openFoda)} className="w-full p-3 flex items-center justify-between hover:bg-accent/30 transition-colors text-left">
          <span className="text-sm font-medium">FODA Consolidado</span>
          {openFoda ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
        </button>
        {openFoda && (
          <CardContent className="pt-0 grid grid-cols-2 gap-2 text-[11px]">
            <FodaPreview title="F" items={setup.foda.fortalezas.slice(0, 3)} color="#4ade80" />
            <FodaPreview title="O" items={setup.foda.oportunidades.slice(0, 3)} color="#2563EB" />
            <FodaPreview title="D" items={setup.foda.debilidades.slice(0, 3)} color="#F43F5E" />
            <FodaPreview title="A" items={setup.foda.amenazas.slice(0, 3)} color="#F59E0B" />
          </CardContent>
        )}
      </Card>

      <Card className="border-2 border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Estrategias generadas ({setup.strategies.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-7 text-xs h-8" />
          </div>
          <div className="flex flex-wrap gap-1">
            {(["FO", "FA", "DO", "DA"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilterCross(filterCross === c ? "" : c)}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${filterCross === c ? "bg-primary text-white border-primary" : "bg-background text-muted-foreground hover:bg-muted/40"}`}
              >
                {c}
              </button>
            ))}
          </div>
          {related.length > 0 && (
            <div className="rounded-md border border-primary/25 bg-primary/10/40 p-2 text-[11px]">
              <p className="font-medium text-primary mb-1">Relacionadas con OLP en edicion</p>
              <div className="flex flex-wrap gap-1">
                {related.map((s) => (
                  <span key={s.id} className="inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-background border" title={s.description}>{s.eCode}</span>
                ))}
              </div>
            </div>
          )}
          <Separator />
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {filteredStrategies.slice(0, 30).map((s) => (
              <div key={s.id} className="text-[11px] flex items-start gap-1.5 p-1.5 rounded hover:bg-muted/30">
                <Badge variant="outline" className="font-mono text-[9px] shrink-0">{s.eCode}</Badge>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] uppercase text-muted-foreground tracking-wide">{s.type ?? s.swotQuadrant}</span>
                  <p className="leading-snug line-clamp-2">{s.description}</p>
                </div>
              </div>
            ))}
            {filteredStrategies.length > 30 && (
              <p className="text-[10px] text-muted-foreground text-center">+{filteredStrategies.length - 30} mas</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-muted/20 p-2 text-[10px] text-muted-foreground flex gap-1.5">
        <Info className="size-3 shrink-0 mt-0.5" />
        <span>Las estrategias son referencia, no requisito. La vinculacion formal se hara en la Matriz de Decision.</span>
      </div>
    </aside>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 3 — REVISAR
// ───────────────────────────────────────────────────────────────────────

function Paso3({ setup, cycleId, onBack }: { setup: OlpSetup; cycleId: string; onBack: () => void }) {
  const olpsByDim = useMemo(() => {
    const map: Record<Dimension, OlpItem[]> = { FIN: [], CLI: [], INT: [], APR: [] };
    for (const o of setup.olps) {
      const d = (o.bscPerspective as Dimension) || "FIN";
      if (map[d]) map[d].push(o);
    }
    return map;
  }, [setup.olps]);

  const total = setup.olps.length;
  const allDimsCovered = (Object.keys(olpsByDim) as Dimension[]).every((d) => olpsByDim[d].length > 0);
  const dimsMissing = (Object.keys(olpsByDim) as Dimension[]).filter((d) => olpsByDim[d].length === 0);

  const observations: string[] = [];
  if (total < 4) observations.push(`Solo tienes ${total} OLPs. Lo recomendable son entre 4 y 7.`);
  if (total > 7) observations.push(`Tienes ${total} OLPs. Lo recomendable son entre 4 y 7.`);
  for (const dim of dimsMissing) {
    observations.push(`Dimension "${DIMENSION_INFO[dim].label}" sin OLPs.`);
  }
  for (const olp of setup.olps) {
    const obs = smartCheck(olp.description, olp.targetYear, olp.targetValue);
    if (obs.length > 0) observations.push(`${olp.olpCode}: ${obs[0]}.`);
  }

  const isOk = observations.length === 0 && allDimsCovered && total >= 4;
  const totalRefs = setup.olps.reduce((sum, o) => sum + o.references.length, 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold mb-1">Tus Objetivos de Largo Plazo ({total})</h2>
        <p className="text-sm text-muted-foreground">Revisa el conjunto antes de continuar.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {setup.olps.map((olp) => {
          const dim = (olp.bscPerspective as Dimension) || "FIN";
          const info = DIMENSION_INFO[dim];
          return (
            <div key={olp.id} className="rounded-lg border p-3 space-y-1.5" style={{ borderColor: info.border }}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]" style={{ color: info.color, borderColor: info.border }}>{olp.olpCode}</Badge>
                <span className="text-[10px] text-muted-foreground">{info.label}</span>
                {olp.priority && (<Badge variant="outline" className="text-[10px] ml-auto" style={PRIORITY_INFO[olp.priority]}>{PRIORITY_INFO[olp.priority]?.label}</Badge>)}
              </div>
              <p className="text-sm leading-snug">{olp.description}</p>
              <div className="text-[11px] text-muted-foreground">
                {olp.currentValue !== null && olp.targetValue !== null ? `${olp.currentValue} → ${olp.targetValue} ${olp.unit ?? ""}` : "Sin metricas cuantitativas"}
                {olp.responsible && ` · ${olp.responsible}`}
              </div>
              {olp.references.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {olp.references.map((r, i) => (
                    <span key={i} className="inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted/60 border" title={r.refText ?? ""}>{r.refCode ?? r.refType}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isOk ? (
        <div className="rounded-md border border-emerald-200/60 bg-transparent p-3 text-sm">
          <Check className="inline size-4 mr-1 text-emerald-600" />
          <strong>Tu conjunto de OLPs esta completo:</strong>
          <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 pl-4">
            <li className="list-disc">{total} OLPs en total (recomendado 4-7)</li>
            <li className="list-disc">Cubres las 4 dimensiones del negocio</li>
            <li className="list-disc">Cada OLP tiene meta y responsable asignado</li>
            <li className="list-disc">Has consultado {totalRefs} elementos del FODA y estrategias</li>
          </ul>
        </div>
      ) : (
        <div className="rounded-md border border-amber-200/60 bg-transparent p-3 text-sm">
          <AlertTriangle className="inline size-4 mr-1 text-amber-600" />
          <strong>Tu conjunto de OLPs tiene observaciones:</strong>
          <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 pl-4">
            {observations.map((o, i) => <li key={i} className="list-disc">{o}</li>)}
          </ul>
        </div>
      )}

      <Card className="border-2 border-primary/30">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <ArrowRightCircle className="size-5 shrink-0 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">¿Que sigue?</p>
              <p className="text-muted-foreground">
                En el proximo modulo (<strong>Matriz de Decision</strong>) veras como tus estrategias se conectan
                formalmente con cada OLP para identificar cuales aportan mas a tus objetivos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="size-4 mr-1.5" /> Atras</Button>
        <Link href={`/cycles/${cycleId}/m3-formulation/strategies`} className="ml-auto">
          <Button size="sm">Continuar a Matriz de Decision <ArrowRight className="size-4 ml-1.5" /></Button>
        </Link>
      </div>
    </div>
  );
}
