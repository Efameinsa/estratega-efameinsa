"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
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
  ArrowLeft, ArrowRight, AlertTriangle, X, Save, Filter, Download,
} from "lucide-react";
import Link from "next/link";

type CrossType = "FO" | "FA" | "DO" | "DA";
type FactorType = "F" | "O" | "D" | "A";

interface FodaItem {
  id: string;
  code: string;
  text: string;
  weight: number;
  rating: number;
}

interface OriginItem {
  id: string;
  factorType: string;
  factorId: string;
  factorCode: string | null;
  factorText: string | null;
}

interface Strategy {
  id: string;
  eCode: string;
  description: string;
  swotQuadrant: string;
  crossType: string | null;
  type: string | null;
  horizon: string | null;
  priority: string | null;
  justification: string | null;
  status: string;
  origins: OriginItem[];
}

interface FodaSetup {
  fortalezas: FodaItem[];
  oportunidades: FodaItem[];
  debilidades: FodaItem[];
  amenazas: FodaItem[];
  strategies: Strategy[];
}

const CROSS_INFO: Record<CrossType, { label: string; color: string; bg: string; border: string; subtitle: string; placeholder: string }> = {
  FO: { label: "Estrategias FO · Ofensivas", color: "#1e7f4f", bg: "rgba(22,163,74,0.06)", border: "rgba(22,163,74,0.35)", subtitle: "Usar fortalezas para aprovechar oportunidades", placeholder: "Ej. Aprovechar nuestra red logistica (F2) para entrar al canal moderno (O3)..." },
  FA: { label: "Estrategias FA · Defensivas", color: "#b45309", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.35)", subtitle: "Usar fortalezas para neutralizar amenazas", placeholder: "Ej. Usar nuestra solidez financiera (F1) para resistir la guerra de precios (A2)..." },
  DO: { label: "Estrategias DO · Adaptativas", color: "#185fa5", bg: "rgba(37,99,235,0.06)", border: "rgba(37,99,235,0.35)", subtitle: "Superar debilidades aprovechando oportunidades", placeholder: "Ej. Tercerizar fabricacion (D1) aprovechando proveedores especializados emergentes (O2)..." },
  DA: { label: "Estrategias DA · Supervivencia", color: "#F43F5E", bg: "rgba(244,63,94,0.06)", border: "rgba(244,63,94,0.35)", subtitle: "Minimizar debilidades ante amenazas", placeholder: "Ej. Reducir SKU de baja rotacion (D3) ante caida de la demanda (A4)..." },
};

const STRATEGY_TYPES = [
  "Penetracion de mercado", "Desarrollo de mercado", "Desarrollo de producto",
  "Integracion hacia adelante", "Integracion hacia atras", "Integracion horizontal",
  "Diversificacion concentrica", "Diversificacion conglomerada",
  "Reduccion / atrincheramiento", "Desinversion", "Liquidacion",
  "Alianzas estrategicas", "Joint venture", "Reestructuracion",
];

const HORIZON_LABEL: Record<string, string> = { corto: "Corto plazo", mediano: "Mediano plazo", largo: "Largo plazo" };
const PRIORITY_INFO: Record<string, { label: string; color: string; bg: string; border: string }> = {
  alta:  { label: "Alta",  color: "#b3261e", bg: "rgba(244,63,94,0.1)",   border: "rgba(244,63,94,0.4)" },
  media: { label: "Media", color: "#B45309", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.4)" },
  baja:  { label: "Baja",  color: "#15803D", bg: "rgba(22,163,74,0.1)",  border: "rgba(22,163,74,0.4)" },
};

// ───────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ───────────────────────────────────────────────────────────────────────

export default function FodaCruzadoPage() {
  const params = useParams();
  const cycleId = params.cycleId as string;

  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const { data: setup, isLoading } = trpc.fodaCruzado.getSetup.useQuery({ cycleId });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Cargando FODA Cruzado...</div>;
  if (!setup) return <div className="p-6 text-sm text-muted-foreground">Sin datos</div>;

  const fodaCompleto =
    setup.fortalezas.length > 0 ||
    setup.debilidades.length > 0 ||
    setup.oportunidades.length > 0 ||
    setup.amenazas.length > 0;

  if (!fodaCompleto) {
    return (
      <div className="container mx-auto max-w-3xl p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">FODA Cruzado</h1>
          <p className="text-sm text-muted-foreground">Genera estrategias combinando elementos del FODA</p>
        </div>
        <div className="rounded-xl border border-amber-200/60 bg-transparent dark:border-amber-900/40 dark:bg-transparent p-5">
          <div className="flex gap-3">
            <AlertTriangle className="size-5 shrink-0 text-amber-700 mt-0.5" />
            <div>
              <p className="font-medium mb-1">FODA Consolidado vacio</p>
              <p className="text-sm text-muted-foreground mb-3">
                Para usar el FODA Cruzado necesitas completar primero el FODA Consolidado en M2 · Diagnostico → Sintesis. Confirma factores en MEFI (F y D) y MEFE (O y A) y vuelve aqui.
              </p>
              <Link href={`/cycles/${cycleId}/m2-diagnosis/foda`}>
                <Button size="sm">Ir al FODA Consolidado</Button>
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
        <h1 className="text-2xl font-semibold tracking-tight">FODA Cruzado</h1>
        <p className="text-sm text-muted-foreground">
          Combina elementos del FODA para generar estrategias ofensivas, defensivas, adaptativas y de supervivencia.
        </p>
      </header>

      <Stepper paso={paso} setPaso={setPaso} />

      {paso === 1 && (
        <Paso1
          setup={setup}
          onNext={() => setPaso(2)}
          cycleId={cycleId}
        />
      )}
      {paso === 2 && (
        <Paso2 setup={setup} cycleId={cycleId} onBack={() => setPaso(1)} onNext={() => setPaso(3)} />
      )}
      {paso === 3 && (
        <Paso3 setup={setup} cycleId={cycleId} onBack={() => setPaso(2)} />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// STEPPER
// ───────────────────────────────────────────────────────────────────────

function Stepper({ paso, setPaso }: { paso: 1 | 2 | 3; setPaso: (p: 1 | 2 | 3) => void }) {
  const steps = [
    { id: 1, label: "Revisar FODA heredado" },
    { id: 2, label: "Generar estrategias" },
    { id: 3, label: "Consolidar retenidas" },
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
// PASO 1
// ───────────────────────────────────────────────────────────────────────

function Paso1({ setup, onNext, cycleId }: { setup: FodaSetup; onNext: () => void; cycleId: string }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/15 bg-primary/5 dark:border-primary/40 dark:bg-primary/10 p-4">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Como funciona el FODA Cruzado</p>
            <p className="text-muted-foreground">
              Vas a combinar los elementos de tu FODA para generar estrategias. Cada cruce sugiere un tipo:
              <strong className="block mt-2">F + O = Ofensivas</strong>
              <strong className="block">F + A = Defensivas</strong>
              <strong className="block">D + O = Adaptativas</strong>
              <strong className="block">D + A = Supervivencia</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Cargados desde FODA Consolidado:{" "}
        <strong className="text-foreground">{setup.fortalezas.length} Fortalezas</strong> ·{" "}
        <strong className="text-foreground">{setup.oportunidades.length} Oportunidades</strong> ·{" "}
        <strong className="text-foreground">{setup.debilidades.length} Debilidades</strong> ·{" "}
        <strong className="text-foreground">{setup.amenazas.length} Amenazas</strong>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FodaListCard title="Fortalezas (F)" items={setup.fortalezas} color="#1e7f4f" />
        <FodaListCard title="Oportunidades (O)" items={setup.oportunidades} color="#185fa5" />
        <FodaListCard title="Debilidades (D)" items={setup.debilidades} color="#F43F5E" />
        <FodaListCard title="Amenazas (A)" items={setup.amenazas} color="#b45309" />
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Link href={`/cycles/${cycleId}/m2-diagnosis/foda`}>
          <Button variant="outline" size="sm">
            <Pencil className="size-4 mr-1.5" /> Editar FODA Consolidado
          </Button>
        </Link>
        <Button size="sm" onClick={onNext} className="ml-auto">
          Continuar a generar estrategias <ArrowRight className="size-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

function FodaListCard({ title, items, color }: { title: string; items: FodaItem[]; color: string }) {
  return (
    <Card style={{ borderColor: `${color}55` }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: color }} />
          {title}
          <span className="text-xs text-muted-foreground font-normal">({items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1.5">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Sin elementos. Agrega en MEFI/MEFE.</p>
        ) : (
          items.map((it) => (
            <div key={it.id} className="flex items-start gap-2">
              <Badge variant="outline" className="font-mono text-[10px] shrink-0" style={{ color, borderColor: `${color}55` }}>{it.code}</Badge>
              <span className="text-xs leading-snug">{it.text}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 ml-auto">{it.weight.toFixed(2)}</span>
            </div>
          ))
        )}
        <p className="text-[10px] text-muted-foreground italic pt-2">Heredado de FODA Consolidado · solo lectura aqui</p>
      </CardContent>
    </Card>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 2
// ───────────────────────────────────────────────────────────────────────

function Paso2({ setup, cycleId, onBack, onNext }: { setup: FodaSetup; cycleId: string; onBack: () => void; onNext: () => void }) {
  const [openCross, setOpenCross] = useState<CrossType | null>(null);

  const strategiesByType: Record<CrossType, Strategy[]> = useMemo(() => {
    const result: Record<CrossType, Strategy[]> = { FO: [], FA: [], DO: [], DA: [] };
    for (const s of setup.strategies as Strategy[]) {
      const t = (s.crossType ?? s.swotQuadrant) as CrossType;
      if (result[t]) result[t].push(s);
    }
    return result;
  }, [setup.strategies]);

  const totalEstrategias = setup.strategies.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(CROSS_INFO) as CrossType[]).map((ct) => (
          <CuadranteCard
            key={ct}
            crossType={ct}
            strategies={strategiesByType[ct]}
            setup={setup}
            cycleId={cycleId}
            onCreate={() => setOpenCross(ct)}
          />
        ))}
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-center">
              {(Object.keys(CROSS_INFO) as CrossType[]).map((ct) => {
                const info = CROSS_INFO[ct];
                return (
                  <div key={ct} className="rounded-md border p-2" style={{ borderColor: info.border, backgroundColor: info.bg }}>
                    <div className="text-xs font-medium" style={{ color: info.color }}>{ct}</div>
                    <div className="text-xl font-bold tabular-nums">{strategiesByType[ct].length}</div>
                  </div>
                );
              })}
            </div>
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground">
              Total: <strong className="text-foreground">{totalEstrategias} estrategias</strong>. Lo recomendado son entre <strong>10 y 25</strong>.
            </p>
            <Button size="sm" onClick={onNext} className="w-full mt-3">
              Ver todas <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onBack} className="flex-1">
            <ArrowLeft className="size-4 mr-1.5" /> Atras
          </Button>
        </div>
      </aside>

      {openCross && (
        <CreateModal
          crossType={openCross}
          setup={setup}
          cycleId={cycleId}
          onClose={() => setOpenCross(null)}
        />
      )}
    </div>
  );
}

function CuadranteCard({
  crossType, strategies, setup, cycleId, onCreate,
}: {
  crossType: CrossType;
  strategies: Strategy[];
  setup: FodaSetup;
  cycleId: string;
  onCreate: () => void;
}) {
  const info = CROSS_INFO[crossType];
  return (
    <Card style={{ borderColor: info.border, backgroundColor: info.bg }}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm" style={{ color: info.color }}>{info.label}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{info.subtitle}</p>
          </div>
          <Badge variant="outline" className="shrink-0" style={{ color: info.color, borderColor: info.border }}>
            {strategies.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {strategies.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">Aun no has generado estrategias de este tipo. Combina al menos un elemento.</p>
        ) : (
          strategies.map((s) => <StrategyCard key={s.id} strategy={s} cycleId={cycleId} setup={setup} />)
        )}
        <Button size="sm" variant="outline" onClick={onCreate} className="w-full mt-2" style={{ borderColor: info.border, color: info.color }}>
          <Plus className="size-3.5 mr-1.5" /> Generar estrategia
        </Button>
      </CardContent>
    </Card>
  );
}

function StrategyCard({ strategy, cycleId, setup }: { strategy: Strategy; cycleId: string; setup: FodaSetup }) {
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(false);
  const del = trpc.fodaCruzado.delete.useMutation({
    onSuccess: () => { utils.fodaCruzado.getSetup.invalidate({ cycleId }); toast.success("Estrategia eliminada"); },
  });
  const setStatus = trpc.fodaCruzado.setStatus.useMutation({
    onSuccess: () => utils.fodaCruzado.getSetup.invalidate({ cycleId }),
  });

  const isRetained = strategy.status === "retenida" || strategy.status === "proposed";
  const priorityInfo = strategy.priority ? PRIORITY_INFO[strategy.priority] : null;

  function toggleRetained() {
    setStatus.mutate({ id: strategy.id, status: isRetained ? "descartada" : "retenida" });
  }

  function handleDelete() {
    if (!confirm(`Eliminar estrategia ${strategy.eCode}?`)) return;
    del.mutate({ id: strategy.id });
  }

  return (
    <div className={`rounded-md border bg-background p-2.5 space-y-1.5 ${strategy.status === "descartada" ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-2">
        <button onClick={() => setExpanded(!expanded)} className="shrink-0 mt-0.5">
          {expanded ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
        </button>
        <Badge variant="outline" className="font-mono text-[10px] shrink-0">{strategy.eCode}</Badge>
        <p className={`text-xs flex-1 leading-snug ${strategy.status === "descartada" ? "line-through" : ""}`}>{strategy.description}</p>
        <button onClick={handleDelete} className="text-muted-foreground hover:text-destructive shrink-0">
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 pl-6">
        {strategy.origins.map((o) => (
          <span key={o.id} className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 border" title={o.factorText ?? ""}>
            {o.factorCode}
          </span>
        ))}
        {strategy.type && <span className="text-[10px] text-muted-foreground">· {strategy.type}</span>}
        {strategy.horizon && <span className="text-[10px] text-muted-foreground">· {HORIZON_LABEL[strategy.horizon]}</span>}
        {priorityInfo && (
          <Badge variant="outline" className="text-[9px]" style={{ color: priorityInfo.color, borderColor: priorityInfo.border, backgroundColor: priorityInfo.bg }}>
            {priorityInfo.label}
          </Badge>
        )}
        <label className="ml-auto flex items-center gap-1 text-[10px] cursor-pointer">
          <input type="checkbox" checked={isRetained} onChange={toggleRetained} className="size-3 accent-blue-600" />
          Retener
        </label>
      </div>
      {expanded && (
        <div className="pl-6 pt-1 space-y-1">
          <Separator className="my-1" />
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Origenes</p>
          {strategy.origins.map((o) => (
            <div key={o.id} className="text-[11px] flex gap-2">
              <span className="font-mono shrink-0">{o.factorCode}:</span>
              <span className="text-muted-foreground">{o.factorText}</span>
            </div>
          ))}
          {strategy.justification && (
            <>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide pt-1">Justificacion</p>
              <p className="text-[11px] text-muted-foreground italic">{strategy.justification}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// CREATE MODAL
// ───────────────────────────────────────────────────────────────────────

function CreateModal({
  crossType, setup, cycleId, onClose,
}: {
  crossType: CrossType;
  setup: FodaSetup;
  cycleId: string;
  onClose: () => void;
}) {
  const info = CROSS_INFO[crossType];
  const utils = trpc.useUtils();

  const leftType: FactorType = crossType[0] as FactorType;
  const rightType: FactorType = crossType[1] as FactorType;
  const leftItems = leftType === "F" ? setup.fortalezas : setup.debilidades;
  const rightItems = rightType === "O" ? setup.oportunidades : setup.amenazas;

  const [selectedLeft, setSelectedLeft] = useState<Set<string>>(new Set());
  const [selectedRight, setSelectedRight] = useState<Set<string>>(new Set());
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [horizon, setHorizon] = useState<"corto" | "mediano" | "largo">("mediano");
  const [priority, setPriority] = useState<"alta" | "media" | "baja">("media");
  const [justification, setJustification] = useState("");

  const create = trpc.fodaCruzado.createWithOrigins.useMutation({
    onSuccess: () => {
      utils.fodaCruzado.getSetup.invalidate({ cycleId });
      toast.success("Estrategia creada");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  function toggleLeft(id: string) {
    const s = new Set(selectedLeft); s.has(id) ? s.delete(id) : s.add(id); setSelectedLeft(s);
  }
  function toggleRight(id: string) {
    const s = new Set(selectedRight); s.has(id) ? s.delete(id) : s.add(id); setSelectedRight(s);
  }

  function handleSave() {
    if (selectedLeft.size === 0 || selectedRight.size === 0) {
      toast.error(`Selecciona al menos un elemento de cada lado (${leftType} y ${rightType})`);
      return;
    }
    if (!description.trim()) {
      toast.error("Escribe el texto de la estrategia");
      return;
    }
    const origins = [
      ...Array.from(selectedLeft).map((id) => {
        const it = leftItems.find((x) => x.id === id);
        return it ? { factorType: leftType, factorId: id, factorCode: it.code, factorText: it.text } : null;
      }),
      ...Array.from(selectedRight).map((id) => {
        const it = rightItems.find((x) => x.id === id);
        return it ? { factorType: rightType, factorId: id, factorCode: it.code, factorText: it.text } : null;
      }),
    ].filter((x): x is NonNullable<typeof x> => x !== null);

    create.mutate({
      cycleId, crossType, description: description.trim(),
      type: type || undefined,
      horizon, priority,
      justification: justification.trim() || undefined,
      origins,
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-3xl w-full my-8 border" style={{ borderColor: info.border }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ backgroundColor: info.bg }}>
          <div>
            <h2 className="font-semibold" style={{ color: info.color }}>{info.label}</h2>
            <p className="text-xs text-muted-foreground">{info.subtitle}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                {leftType === "F" ? "Fortalezas" : "Debilidades"} a usar
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-md border p-2">
                {leftItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-2">Sin elementos disponibles</p>
                ) : leftItems.map((it) => (
                  <label key={it.id} className="flex items-start gap-2 text-xs cursor-pointer hover:bg-accent/30 p-1.5 rounded">
                    <input type="checkbox" checked={selectedLeft.has(it.id)} onChange={() => toggleLeft(it.id)} className="mt-0.5 size-3.5 accent-blue-600" />
                    <Badge variant="outline" className="font-mono text-[10px] shrink-0">{it.code}</Badge>
                    <span className="leading-snug flex-1">{it.text}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{it.weight.toFixed(2)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                {rightType === "O" ? "Oportunidades" : "Amenazas"} a abordar
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-md border p-2">
                {rightItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-2">Sin elementos disponibles</p>
                ) : rightItems.map((it) => (
                  <label key={it.id} className="flex items-start gap-2 text-xs cursor-pointer hover:bg-accent/30 p-1.5 rounded">
                    <input type="checkbox" checked={selectedRight.has(it.id)} onChange={() => toggleRight(it.id)} className="mt-0.5 size-3.5 accent-blue-600" />
                    <Badge variant="outline" className="font-mono text-[10px] shrink-0">{it.code}</Badge>
                    <span className="leading-snug flex-1">{it.text}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{it.weight.toFixed(2)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
              Texto de la estrategia <span className="text-muted-foreground font-normal lowercase">(100-300 caracteres recomendado)</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={info.placeholder}
              rows={4}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{description.length} caracteres</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Tipo de estrategia</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
                <option value="">— Seleccionar —</option>
                {STRATEGY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Horizonte</label>
              <select value={horizon} onChange={(e) => setHorizon(e.target.value as typeof horizon)} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
                <option value="corto">Corto plazo</option>
                <option value="mediano">Mediano plazo</option>
                <option value="largo">Largo plazo</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Prioridad</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm">
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">Justificacion (opcional)</label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Por que esta estrategia tiene sentido en este contexto..."
              rows={2}
              className="text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t bg-muted/20">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={create.isPending}>
            <Save className="size-4 mr-1.5" />
            {create.isPending ? "Guardando..." : "Guardar estrategia"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 3 — CONSOLIDAR
// ───────────────────────────────────────────────────────────────────────

function Paso3({ setup, cycleId, onBack }: { setup: FodaSetup; cycleId: string; onBack: () => void }) {
  const utils = trpc.useUtils();
  const [filterCross, setFilterCross] = useState<CrossType | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "retenida" | "descartada">("ALL");

  const setStatus = trpc.fodaCruzado.setStatus.useMutation({
    onSuccess: () => utils.fodaCruzado.getSetup.invalidate({ cycleId }),
  });

  const allStrategies = setup.strategies as Strategy[];
  const filtered = allStrategies.filter((s) => {
    if (filterCross !== "ALL" && (s.crossType ?? s.swotQuadrant) !== filterCross) return false;
    if (filterStatus !== "ALL") {
      const isRet = s.status === "retenida" || s.status === "proposed";
      if (filterStatus === "retenida" && !isRet) return false;
      if (filterStatus === "descartada" && isRet) return false;
    }
    return true;
  });

  // Insights automaticos
  const counts: Record<CrossType, number> = { FO: 0, FA: 0, DO: 0, DA: 0 };
  for (const s of allStrategies) {
    const t = (s.crossType ?? s.swotQuadrant) as CrossType;
    if (counts[t] !== undefined) counts[t]++;
  }
  const total = allStrategies.length;
  const tipoFreq: Record<string, number> = {};
  for (const s of allStrategies) {
    if (s.type) tipoFreq[s.type] = (tipoFreq[s.type] ?? 0) + 1;
  }
  const topTipos = Object.entries(tipoFreq).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Detectar elementos no usados
  const usedFactorIds = new Set<string>();
  for (const s of allStrategies) {
    for (const o of s.origins) usedFactorIds.add(o.factorId);
  }
  const unused = [
    ...setup.fortalezas.filter((f) => !usedFactorIds.has(f.id)).map((f) => ({ ...f, type: "F" })),
    ...setup.oportunidades.filter((f) => !usedFactorIds.has(f.id)).map((f) => ({ ...f, type: "O" })),
    ...setup.debilidades.filter((f) => !usedFactorIds.has(f.id)).map((f) => ({ ...f, type: "D" })),
    ...setup.amenazas.filter((f) => !usedFactorIds.has(f.id)).map((f) => ({ ...f, type: "A" })),
  ];

  // Alertas de desbalance
  const alertas: string[] = [];
  if (counts.FO >= 8 && counts.DA <= 1) alertas.push(`Tienes ${counts.FO} estrategias FO pero solo ${counts.DA} DA. Considera fortalecer las estrategias de supervivencia ante amenazas.`);
  if (counts.DA >= 8 && counts.FO <= 1) alertas.push(`Tienes ${counts.DA} estrategias DA pero solo ${counts.FO} FO. Estas en modo supervivencia — falta visión ofensiva.`);
  if (total === 0) alertas.push("Aun no has generado estrategias. Vuelve al Paso 2.");
  if (total > 0 && total < 8) alertas.push(`Tienes ${total} estrategias. Lo recomendado es entre 10 y 25 para tener un buen pool de opciones.`);
  if (total > 25) alertas.push(`Tienes ${total} estrategias. Considera consolidar o descartar algunas para no saturar la siguiente etapa.`);

  function exportCsv() {
    const headers = ["Codigo", "Cruce", "Estrategia", "Tipo", "Horizonte", "Prioridad", "Estado", "Origenes"];
    const rows = allStrategies.map((s) => [
      s.eCode,
      s.crossType ?? s.swotQuadrant ?? "",
      s.description,
      s.type ?? "",
      s.horizon ? HORIZON_LABEL[s.horizon] : "",
      s.priority ? PRIORITY_INFO[s.priority]?.label ?? "" : "",
      s.status === "descartada" ? "Descartada" : "Retenida",
      s.origins.map((o) => o.factorCode).filter(Boolean).join(" + "),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "foda-cruzado.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function bulkSetStatus(status: "retenida" | "descartada") {
    if (!confirm(`Marcar las ${filtered.length} estrategias filtradas como ${status}?`)) return;
    Promise.all(filtered.map((s) => setStatus.mutateAsync({ id: s.id, status }))).then(() => {
      toast.success(`${filtered.length} estrategias actualizadas`);
    });
  }

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Filter className="size-4 text-muted-foreground" />
          <select value={filterCross} onChange={(e) => setFilterCross(e.target.value as CrossType | "ALL")} className="rounded-md border border-input bg-card px-2 py-1 text-sm">
            <option value="ALL">Todos los cruces</option>
            <option value="FO">FO Ofensivas</option>
            <option value="FA">FA Defensivas</option>
            <option value="DO">DO Adaptativas</option>
            <option value="DA">DA Supervivencia</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)} className="rounded-md border border-input bg-card px-2 py-1 text-sm">
            <option value="ALL">Todos los estados</option>
            <option value="retenida">Solo retenidas</option>
            <option value="descartada">Solo descartadas</option>
          </select>
          <span className="text-xs text-muted-foreground">{filtered.length} de {total}</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => bulkSetStatus("retenida")} disabled={filtered.length === 0}>
              Marcar retenidas
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkSetStatus("descartada")} disabled={filtered.length === 0}>
              Descartar
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="size-4 mr-1.5" /> CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla unificada */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Sin estrategias con los filtros actuales.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-2 font-medium text-xs uppercase tracking-wide">Codigo</th>
                  <th className="text-left p-2 font-medium text-xs uppercase tracking-wide">Cruce</th>
                  <th className="text-left p-2 font-medium text-xs uppercase tracking-wide">Estrategia</th>
                  <th className="text-left p-2 font-medium text-xs uppercase tracking-wide">Tipo</th>
                  <th className="text-left p-2 font-medium text-xs uppercase tracking-wide">Horizonte</th>
                  <th className="text-left p-2 font-medium text-xs uppercase tracking-wide">Prioridad</th>
                  <th className="text-left p-2 font-medium text-xs uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const ct = (s.crossType ?? s.swotQuadrant) as CrossType;
                  const cInfo = CROSS_INFO[ct];
                  const pInfo = s.priority ? PRIORITY_INFO[s.priority] : null;
                  const isRet = s.status === "retenida" || s.status === "proposed";
                  return (
                    <tr key={s.id} className={`border-b hover:bg-muted/20 ${!isRet ? "opacity-60" : ""}`}>
                      <td className="p-2 font-mono text-xs">{s.eCode}</td>
                      <td className="p-2"><Badge variant="outline" style={{ color: cInfo.color, borderColor: cInfo.border, backgroundColor: cInfo.bg }}>{ct}</Badge></td>
                      <td className="p-2">
                        <p className={`text-xs leading-snug ${!isRet ? "line-through" : ""}`}>{s.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{s.origins.map((o) => o.factorCode).filter(Boolean).join(" + ")}</p>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{s.type ?? "—"}</td>
                      <td className="p-2 text-xs text-muted-foreground">{s.horizon ? HORIZON_LABEL[s.horizon] : "—"}</td>
                      <td className="p-2">{pInfo ? <Badge variant="outline" style={{ color: pInfo.color, borderColor: pInfo.border }}>{pInfo.label}</Badge> : <span className="text-xs text-muted-foreground">—</span>}</td>
                      <td className="p-2">
                        <button onClick={() => setStatus.mutate({ id: s.id, status: isRet ? "descartada" : "retenida" })} className={`text-xs px-2 py-0.5 rounded ${isRet ? "bg-transparent text-emerald-700 hover:bg-transparent" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                          {isRet ? "Retenida" : "Descartada"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Insights automaticos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Analisis automatico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Generaste <strong className="text-foreground">{total} estrategias</strong>: {counts.FO} FO · {counts.FA} FA · {counts.DO} DO · {counts.DA} DA
          </p>
          {topTipos.length > 0 && (
            <p className="text-muted-foreground">
              Tipos mas frecuentes: {topTipos.map(([t, n]) => `${t} (${n})`).join(" · ")}
            </p>
          )}
          {alertas.map((a, i) => (
            <div key={i} className="flex gap-2 items-start rounded-md border border-amber-200/60 bg-transparent dark:border-amber-900/30 dark:bg-transparent p-2.5">
              <AlertTriangle className="size-4 shrink-0 text-amber-700 mt-0.5" />
              <span className="text-xs leading-relaxed">{a}</span>
            </div>
          ))}
          {unused.length > 0 && (
            <div className="flex gap-2 items-start rounded-md border border-primary/15 bg-primary/10 dark:border-primary/30 dark:bg-primary/10 p-2.5">
              <Info className="size-4 shrink-0 text-primary mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-medium">{unused.length} elemento(s) sin cruzar:</span>{" "}
                {unused.map((u) => u.code).join(", ")}. ¿Falta considerarlos en alguna estrategia?
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4 mr-1.5" /> Atras
        </Button>
        <Link href={`/cycles/${cycleId}/m3-formulation/peyea`} className="ml-auto">
          <Button size="sm">
            Continuar a PEYEA <ArrowRight className="size-4 ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
