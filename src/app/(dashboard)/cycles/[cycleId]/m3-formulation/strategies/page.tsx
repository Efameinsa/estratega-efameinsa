"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  DALESSIO_TYPES, GROUP_INFO, getTypeDef, typesByGroup,
  type DalessioType, type DalessioGroup,
} from "@/lib/dalessio-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Check, ChevronDown, ChevronRight, Info, ArrowLeft, ArrowRight, AlertTriangle,
  Save, Layers, Filter, ArrowRightCircle, Leaf, Shield, RefreshCw, Trash2,
  Sparkles, Trophy, Target, MoreVertical,
} from "lucide-react";

interface OriginItem { id: string; sourceMatrix: string; sourceText: string; sourceCode: string | null }
interface OlpLinkItem { id: string; olpId: string }
interface RetainedItem {
  id: string; eCode: string; text: string; type: string | null;
  dalessioType: string | null;
  responsible: string | null;
  priority: string | null;
  status: string;
  totalAppearances: number;
  ptaTotal: number;
  mcpeRanking: number | null;
  rumeltStatus: string | null;
  ethicsStatus: string | null;
  ethicsMitigantsCount: number;
  ethicsPromueveCount: number;
  isEjemplar: boolean;
  isReformulated: boolean;
  dalessioInferred: string | null;
  itemKind: { kind: "retained" } | { kind: "contingency"; reason: string };
  origins: OriginItem[];
  olpLinks: OlpLinkItem[];
}
interface OlpItem { id: string; olpCode: string; description: string }
interface RetainedSetup {
  retained: RetainedItem[];
  contingency: RetainedItem[];
  olps: OlpItem[];
  funnelCounts: { brutas: number; md: number; rumeltApproved: number; ethicsApproved: number; retained: number };
}

const RESPONSIBLES = [
  "Gerencia General", "Gerencia Comercial", "Gerencia de Operaciones", "Gerencia Financiera",
  "Gerencia de RR.HH.", "Gerencia de Marketing", "Gerencia de Tecnologia", "Comite Estrategico",
];
const PRIORITY_INFO: Record<string, { label: string; color: string; bg: string; border: string }> = {
  alta:  { label: "Alta",  color: "#b3261e", bg: "rgba(244,63,94,0.1)",   border: "rgba(244,63,94,0.4)" },
  media: { label: "Media", color: "#B45309", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.4)" },
  baja:  { label: "Baja",  color: "#15803D", bg: "rgba(22,163,74,0.1)",  border: "rgba(22,163,74,0.4)" },
};

// ───────────────────────────────────────────────────────────────────────
// MAIN
// ───────────────────────────────────────────────────────────────────────

export default function StrategiesRetainedPage() {
  const params = useParams();
  const cycleId = params.cycleId as string;
  const [paso, setPaso] = useState<1 | 2 | 3>(1);

  const { data: setup, isLoading } = trpc.strategiesRetained.getSetup.useQuery({ cycleId });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Cargando estrategias retenidas...</div>;
  if (!setup) return <div className="p-6 text-sm text-muted-foreground">Sin datos</div>;

  if (setup.retained.length === 0 && setup.contingency.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Estrategias Retenidas</h1>
          <p className="text-sm text-muted-foreground">Cierre del analisis estrategico de M3</p>
        </div>
        <div className="rounded-xl border border-amber-200/60 bg-transparent p-5">
          <div className="flex gap-3">
            <AlertTriangle className="size-5 shrink-0 text-amber-700 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Sin estrategias para clasificar</p>
              <p className="text-sm text-muted-foreground mb-3">
                Necesitas tener estrategias procesadas en MD, MCPE, Rumelt y Auditoria Etica.
              </p>
              <Link href={`/cycles/${cycleId}/m3-formulation/md`}><Button size="sm">Ir a MD</Button></Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Estrategias Retenidas</h1>
        <p className="text-sm text-muted-foreground">
          Cierre del analisis estrategico: clasifica, vincula con OLPs y prepara para el Plan Integral.
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
  const steps = [{ id: 1, label: "Clasificar" }, { id: 2, label: "Vincular OLPs" }, { id: 3, label: "Confirmar" }] as const;
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
// PASO 1 — CLASIFICAR
// ───────────────────────────────────────────────────────────────────────

function Paso1({ setup, cycleId, onNext }: { setup: RetainedSetup; cycleId: string; onNext: () => void }) {
  const utils = trpc.useUtils();
  const [showContingency, setShowContingency] = useState(false);

  const classify = trpc.strategiesRetained.classify.useMutation({
    onSuccess: () => utils.strategiesRetained.getSetup.invalidate({ cycleId }),
  });
  const reactivate = trpc.strategiesRetained.reactivate.useMutation({
    onSuccess: () => { utils.strategiesRetained.getSetup.invalidate({ cycleId }); toast.success("Estrategia reactivada"); },
  });
  const moveToContingency = trpc.strategiesRetained.moveToContingency.useMutation({
    onSuccess: () => { utils.strategiesRetained.getSetup.invalidate({ cycleId }); toast.success("Movida a contingencia"); },
  });

  // Agrupar por dalessio group
  const grouped: Record<DalessioGroup, RetainedItem[]> = useMemo(() => {
    const map: Record<DalessioGroup, RetainedItem[]> = { intensivas: [], integracion: [], diversificacion: [], defensivas: [] };
    for (const item of setup.retained) {
      const t = item.dalessioType ?? item.dalessioInferred;
      const def = getTypeDef(t);
      if (def) map[def.group].push(item);
      else map.intensivas.push(item); // default cuando no se infiere
    }
    return map;
  }, [setup.retained]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Tus estrategias finales estan listas</p>
            <p className="text-muted-foreground">
              Clasifica por tipo D'Alessio, asigna responsables y prioridad, y confirma cuales entran al Plan Estrategico Integral.
            </p>
          </div>
        </div>
      </div>

      {/* Embudo de filtrado */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Embudo de filtrado del M3</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <FunnelCard label="Brutas" count={setup.funnelCounts.brutas} />
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            <FunnelCard label="MD" count={setup.funnelCounts.md} />
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            <FunnelCard label="Rumelt" count={setup.funnelCounts.rumeltApproved} />
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            <FunnelCard label="Etica" count={setup.funnelCounts.ethicsApproved} />
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            <FunnelCard label="Retenidas" count={setup.funnelCounts.retained} highlight />
          </div>
        </CardContent>
      </Card>

      {/* Listado agrupado */}
      {(Object.keys(GROUP_INFO) as DalessioGroup[]).map((group) => {
        const items = grouped[group];
        const gi = GROUP_INFO[group];
        if (items.length === 0) return null;
        return (
          <div key={group}>
            <div className="flex items-center gap-2 mb-2">
              <span className="size-3 rounded-full" style={{ backgroundColor: gi.color }} />
              <h3 className="text-sm font-semibold" style={{ color: gi.color }}>{gi.label}</h3>
              <Badge variant="outline" className="text-xs">{items.length}</Badge>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <RetainedCard
                  key={item.id} item={item}
                  onClassify={(data) => classify.mutate({ id: item.id, ...data })}
                  onMoveContingency={() => {
                    const reason = prompt(`Razon para mover ${item.eCode} a contingencia:`);
                    if (!reason || reason.length < 5) return;
                    moveToContingency.mutate({ id: item.id, reason });
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Contingencia */}
      {setup.contingency.length > 0 && (
        <Card>
          <button type="button" onClick={() => setShowContingency(!showContingency)} className="w-full p-3 flex items-center justify-between hover:bg-accent/30">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Estrategias en contingencia</span>
              <Badge variant="outline">{setup.contingency.length}</Badge>
            </div>
            {showContingency ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
          {showContingency && (
            <CardContent className="space-y-2 pt-0">
              {setup.contingency.map((item) => (
                <div key={item.id} className="rounded-md border bg-muted/20 p-3 opacity-80">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="font-mono text-[10px] shrink-0">{item.eCode}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">{item.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Razon: {item.itemKind.kind === "contingency" ? item.itemKind.reason : "—"}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => {
                      const j = prompt(`Justifica la reactivacion de ${item.eCode}:`);
                      if (!j || j.length < 10) return;
                      reactivate.mutate({ id: item.id, justification: j });
                    }}>
                      <RefreshCw className="size-3 mr-1" /> Reactivar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button size="sm" onClick={onNext} className="ml-auto">
          Continuar a vincular OLPs <ArrowRight className="size-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

function FunnelCard({ label, count, highlight }: { label: string; count: number; highlight?: boolean }) {
  return (
    <div className={`shrink-0 rounded-md border px-4 py-2 text-center min-w-[80px] ${highlight ? "border-emerald-400 bg-transparent" : ""}`}>
      <div className={`text-2xl font-bold tabular-nums ${highlight ? "text-emerald-700" : ""}`}>{count}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function RetainedCard({
  item, onClassify, onMoveContingency,
}: {
  item: RetainedItem;
  onClassify: (data: { dalessioType?: DalessioType; responsible?: string; priority?: "alta" | "media" | "baja" }) => void;
  onMoveContingency: () => void;
}) {
  const currentType = (item.dalessioType ?? item.dalessioInferred) as DalessioType | null;
  const currentTypeDef = getTypeDef(currentType);
  const groupColor = currentTypeDef ? GROUP_INFO[currentTypeDef.group].color : "#6b6b6b";

  return (
    <div className="rounded-lg border bg-card p-3" style={{ borderLeftWidth: 4, borderLeftColor: groupColor }}>
      <div className="flex items-start gap-2 mb-2">
        <Badge variant="outline" className="font-mono text-[10px] shrink-0">{item.eCode}</Badge>
        <p className="text-sm flex-1 leading-snug">{item.text}</p>
        <Button size="sm" variant="ghost" onClick={onMoveContingency} className="size-7 p-0" title="Mover a contingencia">
          <MoreVertical className="size-3.5" />
        </Button>
      </div>

      {/* Badges de validacion */}
      <div className="flex flex-wrap gap-1 mb-2">
        {item.mcpeRanking && (
          <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/25">
            <Trophy className="size-2.5 mr-0.5" /> MCPE #{item.mcpeRanking}
          </Badge>
        )}
        {(item.rumeltStatus === "aprobada" || item.rumeltStatus === "aprobada_manual") && (
          <Badge variant="outline" className="text-[9px] bg-transparent text-emerald-700 border-emerald-500/30">
            <Check className="size-2.5 mr-0.5" /> Rumelt OK
          </Badge>
        )}
        {item.ethicsStatus === "aprobada" && (
          <Badge variant="outline" className="text-[9px] bg-transparent text-emerald-700 border-emerald-500/30">
            <Shield className="size-2.5 mr-0.5" /> Etica OK
          </Badge>
        )}
        {item.ethicsStatus === "aprobada_con_mitigantes" && (
          <Badge variant="outline" className="text-[9px] bg-transparent text-amber-700 border-amber-500/30">
            <Shield className="size-2.5 mr-0.5" /> Con mitigante ({item.ethicsMitigantsCount})
          </Badge>
        )}
        {item.isEjemplar && (
          <Badge variant="outline" className="text-[9px] bg-transparent text-emerald-700 border-emerald-500/30">
            <Leaf className="size-2.5 mr-0.5" /> Promueve valores
          </Badge>
        )}
        {item.isReformulated && (
          <Badge variant="outline" className="text-[9px] bg-transparent text-rose-700 border-rose-500/30">
            <RefreshCw className="size-2.5 mr-0.5" /> Reformulada
          </Badge>
        )}
        {item.dalessioInferred && !item.dalessioType && (
          <Badge variant="outline" className="text-[9px] bg-transparent text-yellow-700 border-yellow-500/30">
            <Sparkles className="size-2.5 mr-0.5" /> Tipo inferido
          </Badge>
        )}
      </div>

      {/* Selectores editables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-0.5">Tipo D'Alessio</label>
          <select
            value={currentType ?? ""}
            onChange={(e) => onClassify({ dalessioType: e.target.value as DalessioType })}
            className="w-full rounded-md border bg-card px-2 py-1 text-xs"
          >
            <option value="">— Seleccionar —</option>
            {(Object.keys(GROUP_INFO) as DalessioGroup[]).map((g) => (
              <optgroup key={g} label={GROUP_INFO[g].label}>
                {typesByGroup(g).map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-0.5">Responsable</label>
          <select
            value={item.responsible ?? ""}
            onChange={(e) => onClassify({ responsible: e.target.value })}
            className="w-full rounded-md border bg-card px-2 py-1 text-xs"
          >
            <option value="">— Seleccionar —</option>
            {RESPONSIBLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-0.5">Prioridad</label>
          <select
            value={item.priority ?? "media"}
            onChange={(e) => onClassify({ priority: e.target.value as "alta" | "media" | "baja" })}
            className="w-full rounded-md border bg-card px-2 py-1 text-xs"
          >
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 2 — VINCULAR OLPS
// ───────────────────────────────────────────────────────────────────────

function Paso2({ setup, cycleId, onBack, onNext }: { setup: RetainedSetup; cycleId: string; onBack: () => void; onNext: () => void }) {
  const utils = trpc.useUtils();
  const setLink = trpc.strategiesRetained.setOlpLink.useMutation({
    onSuccess: () => utils.strategiesRetained.getSetup.invalidate({ cycleId }),
  });

  function isLinked(item: RetainedItem, olpId: string): boolean {
    return item.olpLinks.some((l) => l.olpId === olpId);
  }

  // Cobertura por OLP
  const coverageByOlp: Record<string, number> = {};
  for (const item of setup.retained) {
    for (const l of item.olpLinks) coverageByOlp[l.olpId] = (coverageByOlp[l.olpId] ?? 0) + 1;
  }

  if (setup.olps.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-amber-200/60 bg-transparent p-4 text-sm flex gap-2">
          <AlertTriangle className="size-4 shrink-0 text-amber-700 mt-0.5" />
          <div>
            <p>No hay OLPs definidos. Define OLPs antes de vincular.</p>
            <Link href={`/cycles/${cycleId}/m3-formulation/olp`}><Button size="sm" className="mt-2">Ir a OLP</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
        <div className="flex gap-3">
          <Info className="size-5 shrink-0 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Vinculacion final con OLPs</p>
            <p className="text-muted-foreground">
              Las vinculaciones de la MD se mantienen aqui pero pueden editarse. Cada OLP debe tener al menos una estrategia que lo soporte.
            </p>
          </div>
        </div>
      </div>

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
            {setup.retained.map((item) => (
              <tr key={item.id} className="border-b hover:bg-muted/20">
                <td className="p-2 sticky left-0 bg-background">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="font-mono text-[10px] shrink-0">{item.eCode}</Badge>
                    <span className="text-xs leading-snug">{item.text}</span>
                  </div>
                </td>
                {setup.olps.map((o) => {
                  const linked = isLinked(item, o.id);
                  return (
                    <td key={o.id} className="p-2 text-center">
                      <button
                        onClick={() => setLink.mutate({ consolidatedId: item.id, olpId: o.id, linked: !linked })}
                        className={`size-5 rounded border-2 flex items-center justify-center mx-auto transition-colors ${linked ? "bg-primary border-primary text-white" : "border-input hover:border-foreground/40"}`}
                      >
                        {linked && <Check className="size-3.5" />}
                      </button>
                    </td>
                  );
                })}
                <td className="p-2 text-center text-xs font-bold tabular-nums">
                  {item.olpLinks.length}
                </td>
              </tr>
            ))}
            <tr className="bg-muted/30 text-xs">
              <td className="p-2 font-medium sticky left-0 bg-muted/30">Cobertura por OLP</td>
              {setup.olps.map((o) => {
                const n = coverageByOlp[o.id] ?? 0;
                const total = setup.retained.length;
                const isOrphan = n === 0;
                return (
                  <td key={o.id} className="p-2 text-center">
                    <span className={`font-bold tabular-nums ${isOrphan ? "text-rose-700" : "text-emerald-700"}`}>
                      {n}/{total}
                    </span>
                  </td>
                );
              })}
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Alertas */}
      <div className="space-y-1">
        {setup.retained.filter((s) => s.olpLinks.length === 0).map((s) => (
          <div key={s.id} className="rounded-md border border-amber-200/60 bg-transparent p-2 text-xs flex gap-2">
            <AlertTriangle className="size-3.5 shrink-0 text-amber-700 mt-0.5" />
            <span><strong>{s.eCode}</strong> no aporta a ningun OLP. ¿Es relevante?</span>
          </div>
        ))}
        {setup.olps.filter((o) => !coverageByOlp[o.id]).map((o) => (
          <div key={o.id} className="rounded-md border border-amber-200/60 bg-transparent p-2 text-xs flex gap-2">
            <AlertTriangle className="size-3.5 shrink-0 text-amber-700 mt-0.5" />
            <span><strong>{o.olpCode}</strong> sin cobertura. Considera revisar o reactivar contingencia.</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="size-4 mr-1.5" /> Atras</Button>
        <Button size="sm" onClick={onNext} className="ml-auto">Continuar a confirmar <ArrowRight className="size-4 ml-1.5" /></Button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PASO 3 — CONFIRMAR
// ───────────────────────────────────────────────────────────────────────

function Paso3({ setup, cycleId, onBack }: { setup: RetainedSetup; cycleId: string; onBack: () => void }) {
  const utils = trpc.useUtils();
  const markFinal = trpc.strategiesRetained.markFinal.useMutation({
    onSuccess: () => { utils.strategiesRetained.getSetup.invalidate({ cycleId }); toast.success("Estrategias marcadas como retenida final"); },
  });

  const orphanOlps = setup.olps.filter((o) => !setup.retained.some((s) => s.olpLinks.some((l) => l.olpId === o.id)));
  const orphanStrategies = setup.retained.filter((s) => s.olpLinks.length === 0);
  const unclassified = setup.retained.filter((s) => !s.dalessioType);
  const noResponsible = setup.retained.filter((s) => !s.responsible);

  const allOk = orphanOlps.length === 0 && orphanStrategies.length === 0 && unclassified.length === 0 && noResponsible.length === 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Resumen ejecutivo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="rounded border p-3 bg-transparent">
            <div className="text-3xl font-bold text-emerald-700">{setup.retained.length}</div>
            <div className="text-xs text-muted-foreground">retenidas finales</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-3xl font-bold">{setup.olps.length - orphanOlps.length}</div>
            <div className="text-xs text-muted-foreground">de {setup.olps.length} OLPs cubiertos</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-3xl font-bold text-muted-foreground">{setup.contingency.length}</div>
            <div className="text-xs text-muted-foreground">en contingencia</div>
          </div>
          <div className="rounded border p-3">
            <div className="text-3xl font-bold">{setup.retained.filter((s) => s.priority === "alta").length}</div>
            <div className="text-xs text-muted-foreground">prioridad alta</div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla resumen */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Tabla resumen</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs">
                <th className="text-left p-2">Codigo</th>
                <th className="text-left p-2">Estrategia</th>
                <th className="text-left p-2">Tipo D'Alessio</th>
                <th className="text-left p-2">Responsable</th>
                <th className="text-center p-2">Prioridad</th>
                <th className="text-left p-2">OLPs</th>
                <th className="text-center p-2">Filtros</th>
              </tr>
            </thead>
            <tbody>
              {setup.retained.map((item) => {
                const def = getTypeDef(item.dalessioType ?? item.dalessioInferred);
                const pi = item.priority ? PRIORITY_INFO[item.priority] : null;
                return (
                  <tr key={item.id} className="border-b">
                    <td className="p-2 font-mono text-[10px]">{item.eCode}</td>
                    <td className="p-2 text-xs leading-snug max-w-[300px]">{item.text}</td>
                    <td className="p-2 text-xs">
                      {def ? (
                        <Badge variant="outline" className="text-[10px]" style={{ color: GROUP_INFO[def.group].color, borderColor: GROUP_INFO[def.group].border }}>
                          {def.label}
                        </Badge>
                      ) : <span className="text-muted-foreground italic">Sin clasificar</span>}
                    </td>
                    <td className="p-2 text-xs">{item.responsible ?? <span className="text-muted-foreground italic">—</span>}</td>
                    <td className="p-2 text-center">
                      {pi && <Badge variant="outline" className="text-[10px]" style={pi}>{pi.label}</Badge>}
                    </td>
                    <td className="p-2 text-[10px]">
                      {item.olpLinks.length === 0
                        ? <span className="text-rose-700 italic">Sin OLPs</span>
                        : item.olpLinks.map((l) => {
                            const olp = setup.olps.find((o) => o.id === l.olpId);
                            return olp ? <span key={l.id} className="inline-block font-mono px-1 py-0.5 rounded bg-primary/10 text-primary mr-0.5">{olp.olpCode}</span> : null;
                          })
                      }
                    </td>
                    <td className="p-2 text-center text-[10px]">
                      <span title="MCPE">📊</span>
                      <span title="Rumelt"> 🛡</span>
                      <span title="Etica"> ⚖</span>
                      {item.isEjemplar && <span title="Promueve valores"> 🍃</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Diagnostico */}
      {allOk ? (
        <div className="rounded-md border border-emerald-200/60 bg-transparent p-3 text-sm">
          <Check className="inline size-4 mr-1 text-emerald-700" />
          <strong>Tu set de estrategias retenidas esta completo:</strong> todas clasificadas, con responsable, prioridad y al menos un OLP. Listo para el PEI.
        </div>
      ) : (
        <div className="rounded-md border border-amber-200/60 bg-transparent p-3 text-sm">
          <AlertTriangle className="inline size-4 mr-1 text-amber-700" />
          <strong>Observaciones:</strong>
          <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 pl-4 list-disc">
            {orphanOlps.length > 0 && <li>{orphanOlps.length} OLP(s) sin estrategias: {orphanOlps.map((o) => o.olpCode).join(", ")}</li>}
            {orphanStrategies.length > 0 && <li>{orphanStrategies.length} estrategia(s) sin OLPs: {orphanStrategies.map((s) => s.eCode).join(", ")}</li>}
            {unclassified.length > 0 && <li>{unclassified.length} estrategia(s) sin clasificar: {unclassified.map((s) => s.eCode).join(", ")}</li>}
            {noResponsible.length > 0 && <li>{noResponsible.length} estrategia(s) sin responsable: {noResponsible.map((s) => s.eCode).join(", ")}</li>}
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
                En el proximo modulo (<strong>Plan Estratégico Integral</strong>) veras el documento maestro
                que consolida todo tu ciclo estrategico (M1, M2, M3) en una sola vista exportable.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-4 px-4 md:-mx-6 md:px-6">
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="size-4 mr-1.5" /> Atras</Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => markFinal.mutate({ cycleId })} disabled={markFinal.isPending}>
            <Save className="size-4 mr-1.5" /> Marcar como retenida final
          </Button>
          <Link href={`/cycles/${cycleId}/m3-formulation`}>
            <Button size="sm">Continuar al PEI <ArrowRight className="size-4 ml-1.5" /></Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
