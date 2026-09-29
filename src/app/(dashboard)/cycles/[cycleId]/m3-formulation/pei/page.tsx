"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  FileText, Target, BarChart3, Layers, Shield, Settings, TrendingUp,
  ClipboardList, Download, Presentation, ChevronLeft, ChevronRight,
  ArrowRight, Pencil, Check, X, Lock,
} from "lucide-react";
import { getTypeDef, GROUP_INFO } from "@/lib/dalessio-types";

type SectionId = "executive" | "identity" | "diagnosis" | "olps" | "strategies" | "mitigants" | "implementation" | "control";

const SECTIONS: Array<{ id: SectionId; icon: React.ElementType; label: string; emoji: string }> = [
  { id: "executive",      icon: ClipboardList, label: "Resumen ejecutivo", emoji: "📋" },
  { id: "identity",       icon: Target,        label: "Identidad", emoji: "🎯" },
  { id: "diagnosis",      icon: BarChart3,     label: "Diagnostico", emoji: "📊" },
  { id: "olps",           icon: Target,        label: "Objetivos de Largo Plazo", emoji: "🎯" },
  { id: "strategies",     icon: Layers,        label: "Estrategias", emoji: "⚡" },
  { id: "mitigants",      icon: Shield,        label: "Mitigantes eticos", emoji: "🛡️" },
  { id: "implementation", icon: Settings,      label: "Implementacion", emoji: "🔧" },
  { id: "control",        icon: TrendingUp,    label: "Control y seguimiento", emoji: "📈" },
];

// ───────────────────────────────────────────────────────────────────────
// MAIN
// ───────────────────────────────────────────────────────────────────────

export default function PeiPage() {
  const params = useParams();
  const cycleId = params.cycleId as string;
  const [activeSection, setActiveSection] = useState<SectionId>("executive");
  const [presentationMode, setPresentationMode] = useState(false);

  const { data, isLoading } = trpc.pei.getDocument.useQuery({ cycleId });

  // Navegacion por teclado en modo presentacion
  useEffect(() => {
    if (!presentationMode) return;
    function onKey(e: KeyboardEvent) {
      const idx = SECTIONS.findIndex((s) => s.id === activeSection);
      if (e.key === "ArrowRight" && idx < SECTIONS.length - 1) setActiveSection(SECTIONS[idx + 1].id);
      else if (e.key === "ArrowLeft" && idx > 0) setActiveSection(SECTIONS[idx - 1].id);
      else if (e.key === "Escape") setPresentationMode(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentationMode, activeSection]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Cargando Plan Estrategico Integral...</div>;
  if (!data) return <div className="p-6 text-sm text-muted-foreground">Sin datos</div>;

  if (presentationMode) {
    return <PresentationView data={data} cycleId={cycleId} active={activeSection} setActive={setActiveSection} onExit={() => setPresentationMode(false)} />;
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-6 space-y-6 print:p-0 print:max-w-none">
      <PrintStyles />

      <Header data={data} cycleId={cycleId} onPresent={() => setPresentationMode(true)} />

      {/* Tabs (desktop) / acordeón (móvil) */}
      <div className="hidden md:flex flex-wrap gap-1 border-b print:hidden">
        {SECTIONS.map((s) => {
          const isActive = activeSection === s.id;
          const Icon = s.icon;
          const isPlaceholder = s.id === "implementation" || s.id === "control";
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-b-2 ${isActive ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground hover:border-foreground/30"}`}
            >
              <Icon className="size-4" />
              {s.label}
              {isPlaceholder && <Lock className="size-3 opacity-60" />}
            </button>
          );
        })}
      </div>

      {/* Mensaje de cierre M3 si todo OK */}
      {data.completionPct >= 60 && (
        <Card className="border-2 border-primary/30 print:hidden">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 flex-wrap">
              <ArrowRight className="size-5 shrink-0 text-primary mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium mb-1">Has completado la formulación estratégica.</p>
                <p className="text-muted-foreground">
                  Tu Plan Estratégico Integral está listo para presentar al directorio. Para hacerlo realidad,
                  el siguiente paso es la implementación: definir objetivos anuales, políticas, estructura y recursos.
                </p>
              </div>
              <Link href={`/cycles/${cycleId}/m4-deployment/ocp`}>
                <Button size="sm">
                  Continuar a M4 · Implementación <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Render por seccion (desktop) */}
      <div className="hidden md:block print:block">
        <SectionContent id={activeSection} data={data} cycleId={cycleId} />
      </div>

      {/* Mobile: acordeón */}
      <div className="md:hidden space-y-3">
        {SECTIONS.map((s) => (
          <MobileSection key={s.id} section={s} data={data} cycleId={cycleId} />
        ))}
      </div>

      {/* Print: render todas las secciones */}
      <div className="hidden print:block space-y-8">
        {SECTIONS.map((s) => (
          <div key={s.id}>
            <h2 className="text-xl font-bold mb-3 border-b pb-1">{s.label}</h2>
            <SectionContent id={s.id} data={data} cycleId={cycleId} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// HEADER
// ───────────────────────────────────────────────────────────────────────

interface PeiData {
  cycle: { id: string; name: string; yearStart: number; yearEnd: number; orgName: string; sector: string | null } | null;
  peiDoc: { customExecutiveSummary: string | null; lastExportedAt: Date | null } | null;
  executiveSummary: string;
  autoSummary: string;
  completionPct: number;
  m1: {
    vision: { text: string; timeHorizon: number | null } | null;
    mission: { text: string } | null;
    values: Array<{ id: string; name: string; description: string | null }>;
    interests: Array<{ id: string; description: string }>;
  };
  m2: {
    pestec: Array<{ id: string; variable: string; type: string; rating: number; hallazgo: string | null }>;
    porter: { overallScore: number | null; data: string } | null;
    mpc: Array<{ id: string; name: string; isOwnOrg: boolean; totalScore: number | null }>;
    attractiveness: { data: string } | null;
    amofhit: Array<{ id: string; area: string; score: number | null; findings: string }>;
    mefiPpt: number;
    mefePpt: number;
    foda: {
      fortalezas: Array<{ id: string; code: string; text: string; weight: number; rating: number; score: number }>;
      oportunidades: Array<{ id: string; code: string; text: string; weight: number; rating: number; score: number }>;
      debilidades: Array<{ id: string; code: string; text: string; weight: number; rating: number; score: number }>;
      amenazas: Array<{ id: string; code: string; text: string; weight: number; rating: number; score: number }>;
    };
  };
  m3: {
    olps: Array<{
      id: string; olpCode: string; description: string; bscPerspective: string | null;
      currentValue: number | null; targetValue: number | null; unit: string | null;
      metric: string | null; responsible: string | null; targetYear: number | null;
      coverage: number;
    }>;
    retained: Array<{
      id: string; eCode: string; text: string;
      dalessioType: string | null; responsible: string | null;
      ethicsStatus: string | null; isEjemplar: boolean;
      olpLinks: Array<{ id: string; olpId: string }>;
    }>;
    mitigants: Array<{
      strategyCode: string; strategyId: string; principleLabel: string;
      text: string; responsible: string; deadline: string; indicator: string;
    }>;
  };
}

function Header({ data, cycleId, onPresent }: { data: PeiData; cycleId: string; onPresent: () => void }) {
  const utils = trpc.useUtils();
  const markExported = trpc.pei.markExported.useMutation({
    onSuccess: () => utils.pei.getDocument.invalidate({ cycleId }),
  });

  function handlePrint() {
    markExported.mutate({ cycleId });
    setTimeout(() => window.print(), 200);
  }

  return (
    <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b -mx-4 px-4 md:-mx-6 md:px-6 py-3 print:static print:border-0 print:py-1">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-white shrink-0">
            <FileText className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight leading-tight">Plan Estratégico Integral</h1>
            <p className="text-xs text-muted-foreground">
              {data.cycle?.orgName} · Ciclo {data.cycle?.yearStart}-{data.cycle?.yearEnd}
              {data.peiDoc?.lastExportedAt && <> · Ultima exportacion {new Date(data.peiDoc.lastExportedAt).toLocaleDateString("es-PE")}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button size="sm" variant="outline" onClick={handlePrint}><Download className="size-4 mr-1.5" /> Exportar PDF</Button>
          <Button size="sm" variant="outline" onClick={onPresent}><Presentation className="size-4 mr-1.5" /> Presentar</Button>
        </div>
      </div>

      {/* Barra de completitud */}
      <div className="mt-3 print:hidden">
        <div className="flex items-center gap-2 text-xs mb-1">
          <span className="text-muted-foreground">Completitud del documento</span>
          <span className="font-semibold tabular-nums">{data.completionPct}%</span>
          <span className="text-muted-foreground italic ml-auto">
            {data.completionPct >= 60 && data.completionPct < 100 && "Formulacion completa. Pendiente: Implementacion (M4) y Control (M5)."}
            {data.completionPct >= 100 && "Plan completo."}
            {data.completionPct < 60 && "Termina M1, M2 y M3 para alcanzar el 60-70%."}
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 to-primary transition-all duration-500" style={{ width: `${data.completionPct}%` }} />
        </div>
      </div>
    </header>
  );
}

// ───────────────────────────────────────────────────────────────────────
// SECTION CONTENT (switch)
// ───────────────────────────────────────────────────────────────────────

function SectionContent({ id, data, cycleId }: { id: SectionId; data: PeiData; cycleId: string }) {
  switch (id) {
    case "executive": return <ExecutiveSection data={data} cycleId={cycleId} />;
    case "identity": return <IdentitySection data={data} cycleId={cycleId} />;
    case "diagnosis": return <DiagnosisSection data={data} cycleId={cycleId} />;
    case "olps": return <OlpsSection data={data} cycleId={cycleId} />;
    case "strategies": return <StrategiesSection data={data} cycleId={cycleId} />;
    case "mitigants": return <MitigantsSection data={data} />;
    case "implementation": return <PlaceholderSection module="M4" cycleId={cycleId} />;
    case "control": return <PlaceholderSection module="M5" cycleId={cycleId} />;
  }
}

function SourceBadge({ source }: { source: string }) {
  return <Badge variant="outline" className="text-[10px] font-normal">De {source}</Badge>;
}

// ───────────────────────────────────────────────────────────────────────
// SECCIONES
// ───────────────────────────────────────────────────────────────────────

function ExecutiveSection({ data, cycleId }: { data: PeiData; cycleId: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data.executiveSummary);
  const utils = trpc.useUtils();
  const updateSummary = trpc.pei.updateSummary.useMutation({
    onSuccess: () => { utils.pei.getDocument.invalidate({ cycleId }); toast.success("Resumen actualizado"); setEditing(false); },
  });

  // Metricas clave
  const olpsCovered = data.m3.olps.filter((o) => o.coverage > 0).length;
  const horizonText = data.cycle ? `${data.cycle.yearStart}-${data.cycle.yearEnd}` : "—";

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Resumen ejecutivo</CardTitle>
            {!editing && (
              <Button size="sm" variant="ghost" onClick={() => { setText(data.executiveSummary); setEditing(true); }}>
                <Pencil className="size-3.5 mr-1" /> Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-2">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="text-sm leading-relaxed" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateSummary.mutate({ cycleId, customSummary: text })}><Check className="size-3.5 mr-1" /> Guardar</Button>
                <Button size="sm" variant="outline" onClick={() => { setText(data.autoSummary); updateSummary.mutate({ cycleId, customSummary: null }); }}>Restaurar autogenerado</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}><X className="size-3.5 mr-1" /> Cancelar</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-foreground/90">{data.executiveSummary}</p>
          )}
        </CardContent>
      </Card>

      {/* Metricas clave */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="OLPs definidos" value={data.m3.olps.length} subtitle={`${olpsCovered} con cobertura`} />
        <MetricCard label="Estrategias finales" value={data.m3.retained.length} subtitle="aprobadas en todos los filtros" />
        <MetricCard label="Horizonte" value={horizonText} subtitle="del plan" />
        <MetricCard label="Mitigantes" value={data.m3.mitigants.length} subtitle="compromisos eticos" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, subtitle }: { label: string; value: string | number; subtitle: string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className="text-3xl font-bold tabular-nums">{value}</div>
        <div className="text-xs font-medium mt-1">{label}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

function IdentitySection({ data, cycleId }: { data: PeiData; cycleId: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Identidad organizacional</CardTitle>
          <SourceBadge source="M1" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.m1.vision ? (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Vision</h3>
            <blockquote className="text-base italic border-l-4 border-primary/150 pl-3 py-1 text-foreground/90">
              "{data.m1.vision.text}"
              {data.m1.vision.timeHorizon && <span className="text-xs text-muted-foreground not-italic block mt-1">Horizonte: {data.m1.vision.timeHorizon}</span>}
            </blockquote>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Sin vision definida.</p>
        )}

        {data.m1.mission && (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Mision</h3>
            <p className="text-sm leading-relaxed">{data.m1.mission.text}</p>
          </div>
        )}

        {data.m1.values.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Valores</h3>
            <div className="flex flex-wrap gap-1.5">
              {data.m1.values.map((v) => (
                <Badge key={v.id} variant="outline" className="text-xs" title={v.description ?? ""}>
                  {v.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.m1.interests.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Intereses organizacionales</h3>
            <ul className="text-sm space-y-1 pl-4 list-disc">
              {data.m1.interests.map((i) => <li key={i.id}>{i.description}</li>)}
            </ul>
          </div>
        )}

        <Link href={`/cycles/${cycleId}/m1-identity`} className="print:hidden">
          <Button variant="outline" size="sm">Editar identidad</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function DiagnosisSection({ data, cycleId: _cycleId }: { data: PeiData; cycleId: string }) {
  // Top PESTEC por dimension
  const pestecByDim: Record<string, typeof data.m2.pestec> = {};
  for (const p of data.m2.pestec) {
    if (!pestecByDim[p.variable]) pestecByDim[p.variable] = [];
    pestecByDim[p.variable].push(p);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Sintesis diagnostica</CardTitle>
            <SourceBadge source="M2" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Puntajes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="MEFE" value={data.m2.mefePpt.toFixed(2)} subtitle="puntaje externo" />
            <MetricCard label="MEFI" value={data.m2.mefiPpt.toFixed(2)} subtitle="puntaje interno" />
            {data.m2.porter && <MetricCard label="Porter" value={data.m2.porter.overallScore?.toFixed(2) ?? "—"} subtitle="atractivo industria" />}
            <MetricCard label="Factores FODA" value={data.m2.foda.fortalezas.length + data.m2.foda.debilidades.length + data.m2.foda.oportunidades.length + data.m2.foda.amenazas.length} subtitle="consolidados" />
          </div>

          {/* PESTEC top 3 por dim */}
          {Object.keys(pestecByDim).length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">PESTEC · top factores</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(pestecByDim).slice(0, 6).map(([dim, items]) => (
                  <div key={dim} className="text-xs">
                    <strong>{dim}:</strong> {items.slice(0, 3).map((i) => i.hallazgo ?? i.type).filter(Boolean).join("; ") || "—"}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MPC */}
          {data.m2.mpc.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">MPC · competidores</h3>
              <ul className="text-xs space-y-1">
                {data.m2.mpc.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex justify-between">
                    <span>{c.isOwnOrg && "📍 "} {c.name}</span>
                    <span className="tabular-nums">{c.totalScore?.toFixed(2) ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FODA */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">FODA Consolidado</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <FodaPreview title="Fortalezas" items={data.m2.foda.fortalezas.slice(0, 5)} color="#4ade80" />
          <FodaPreview title="Oportunidades" items={data.m2.foda.oportunidades.slice(0, 5)} color="#60a5fa" />
          <FodaPreview title="Debilidades" items={data.m2.foda.debilidades.slice(0, 5)} color="#F43F5E" />
          <FodaPreview title="Amenazas" items={data.m2.foda.amenazas.slice(0, 5)} color="#F59E0B" />
        </CardContent>
      </Card>
    </div>
  );
}

function FodaPreview({ title, items, color }: { title: string; items: Array<{ id: string; code: string; text: string; weight: number }>; color: string }) {
  return (
    <div className="rounded-md border p-2" style={{ borderColor: `${color}55` }}>
      <div className="text-xs font-semibold mb-1" style={{ color }}>{title}</div>
      {items.length === 0 ? <p className="text-[10px] text-muted-foreground italic">Sin elementos</p> : items.map((it) => (
        <div key={it.id} className="flex items-start gap-1.5 text-[11px] mb-0.5">
          <Badge variant="outline" className="font-mono text-[9px] shrink-0" style={{ color, borderColor: `${color}55` }}>{it.code}</Badge>
          <span className="leading-snug">{it.text}</span>
        </div>
      ))}
    </div>
  );
}

function OlpsSection({ data, cycleId: _cycleId }: { data: PeiData; cycleId: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Objetivos de Largo Plazo ({data.m3.olps.length})</CardTitle>
          <SourceBadge source="M3 · OLP" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.m3.olps.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Sin OLPs definidos.</p>
        ) : data.m3.olps.map((o) => (
          <div key={o.id} className={`rounded-md border p-3 ${o.coverage === 0 ? "border-amber-500/30 bg-transparent" : ""}`}>
            <div className="flex items-start gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="font-mono text-[10px] shrink-0">{o.olpCode}</Badge>
              {o.bscPerspective && <Badge variant="outline" className="text-[10px]">{o.bscPerspective}</Badge>}
              <span className="text-[10px] text-muted-foreground ml-auto">
                Cobertura: <strong className={o.coverage === 0 ? "text-amber-300" : "text-foreground"}>{o.coverage} estrategia(s)</strong>
              </span>
            </div>
            <p className="text-sm leading-snug">{o.description}</p>
            <div className="text-[11px] text-muted-foreground mt-1">
              {o.currentValue !== null && o.targetValue !== null ? `${o.currentValue} → ${o.targetValue} ${o.unit ?? ""}` : "Sin metricas"}
              {o.metric && ` · ${o.metric}`}
              {o.responsible && ` · ${o.responsible}`}
              {o.targetYear && ` · ${o.targetYear}`}
            </div>
            {o.coverage === 0 && (
              <p className="text-[11px] text-amber-300 italic mt-1">⚠ OLP huerfano (sin estrategias)</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function StrategiesSection({ data, cycleId: _cycleId }: { data: PeiData; cycleId: string }) {
  // Agrupar por grupo D'Alessio
  const grouped: Record<string, typeof data.m3.retained> = {};
  for (const s of data.m3.retained) {
    const def = getTypeDef(s.dalessioType);
    const groupKey = def ? def.group : "sin_clasificar";
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(s);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Estrategias retenidas ({data.m3.retained.length})</CardTitle>
          <SourceBadge source="M3 · Estrategias retenidas" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.m3.retained.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Sin estrategias retenidas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs bg-muted/30">
                <th className="text-left p-2">Cod</th>
                <th className="text-left p-2">Estrategia</th>
                <th className="text-left p-2">Tipo</th>
                <th className="text-left p-2">OLPs</th>
                <th className="text-left p-2">Responsable</th>
              </tr>
            </thead>
            <tbody>
              {data.m3.retained.map((s) => {
                const def = getTypeDef(s.dalessioType);
                return (
                  <tr key={s.id} className="border-b">
                    <td className="p-2 font-mono text-[10px]">{s.eCode}</td>
                    <td className="p-2 text-xs leading-snug">
                      {s.text}
                      <div className="flex gap-1 flex-wrap mt-1">
                        {s.isEjemplar && <Badge variant="outline" className="text-[9px] bg-transparent text-emerald-300 border-emerald-500/30">🍃 Promueve valores</Badge>}
                        {s.ethicsStatus === "aprobada_con_mitigantes" && <Badge variant="outline" className="text-[9px] bg-transparent text-amber-300 border-amber-500/30">🛡 Con mitigante</Badge>}
                      </div>
                    </td>
                    <td className="p-2 text-xs">
                      {def ? <Badge variant="outline" className="text-[10px]" style={{ color: GROUP_INFO[def.group].color, borderColor: GROUP_INFO[def.group].border }}>{def.label}</Badge> : <span className="text-muted-foreground italic">—</span>}
                    </td>
                    <td className="p-2 text-[10px]">
                      {s.olpLinks.length === 0 ? <span className="text-amber-400">—</span> : s.olpLinks.map((l, i) => {
                        const olp = data.m3.olps.find((o) => o.id === l.olpId);
                        return olp ? <span key={l.id} className="inline-block font-mono px-1 py-0.5 rounded bg-primary/10 text-primary mr-0.5">{olp.olpCode}</span> : null;
                      })}
                    </td>
                    <td className="p-2 text-xs">{s.responsible ?? <span className="text-muted-foreground italic">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function MitigantsSection({ data }: { data: PeiData }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Mitigantes eticos comprometidos ({data.m3.mitigants.length})</CardTitle>
          <SourceBadge source="Auditoría Ética" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.m3.mitigants.length === 0 ? (
          <div className="rounded-md border border-emerald-200/60 bg-transparent p-3 text-sm">
            <Check className="inline size-4 mr-1 text-emerald-400" />
            Ninguna estrategia requirio mitigantes eticos. Tu portafolio paso los filtros sin observaciones.
          </div>
        ) : data.m3.mitigants.map((m, i) => (
          <div key={i} className="rounded-md border bg-transparent p-3 text-xs space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono text-[10px]">{m.strategyCode}</Badge>
              <span className="font-semibold">{m.principleLabel}</span>
            </div>
            <p>{m.text}</p>
            <p className="text-muted-foreground">
              Responsable: <strong>{m.responsible}</strong> · Plazo: {m.deadline.replace(/_/g, " ")} · KPI: {m.indicator}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PlaceholderSection({ module: mod, cycleId: _cycleId }: { module: "M4" | "M5"; cycleId: string }) {
  const info = mod === "M4"
    ? { title: "Implementacion", desc: "Esta seccion se completara automaticamente con los Objetivos de Corto Plazo, politicas organizacionales, estructura y recursos asignados, una vez que avances en el Modulo 4.", items: ["OCP por area", "Politicas", "Estructura", "Recursos (7M)"] }
    : { title: "Control y seguimiento", desc: "Esta seccion incluira el tablero de control con indicadores, metas, alertas estrategicas y proceso de revision periodica, una vez completes M4 e ingreses al Modulo 5.", items: ["Tablero de control", "Indicadores", "Alertas", "Revision periodica"] };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base text-muted-foreground">{info.title}</CardTitle>
          <Badge variant="outline" className="text-[10px] bg-muted/40">
            <Lock className="size-3 mr-1" /> Pendiente · {mod}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">{info.desc}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {info.items.map((item) => (
            <div key={item} className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground bg-muted/10">
              {item}
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" disabled>
          Comenzar {mod} · {info.title} <Lock className="size-3 ml-1.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

// ───────────────────────────────────────────────────────────────────────
// MOBILE ACCORDION
// ───────────────────────────────────────────────────────────────────────

function MobileSection({ section, data, cycleId }: { section: typeof SECTIONS[number]; data: PeiData; cycleId: string }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;
  return (
    <Card>
      <button type="button" onClick={() => setOpen(!open)} className="w-full p-3 flex items-center gap-2 text-left">
        <Icon className="size-4" />
        <span className="text-sm font-medium flex-1">{section.label}</span>
        {open ? <ChevronLeft className="size-4 rotate-90" /> : <ChevronRight className="size-4" />}
      </button>
      {open && (
        <CardContent className="border-t pt-3">
          <SectionContent id={section.id} data={data} cycleId={cycleId} />
        </CardContent>
      )}
    </Card>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PRESENTATION MODE
// ───────────────────────────────────────────────────────────────────────

function PresentationView({ data, cycleId, active, setActive, onExit }: { data: PeiData; cycleId: string; active: SectionId; setActive: (s: SectionId) => void; onExit: () => void }) {
  const idx = SECTIONS.findIndex((s) => s.id === active);
  const section = SECTIONS[idx];

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-background/95 backdrop-blur py-3 border-b">
          <div>
            <h1 className="text-2xl font-bold">{section.label}</h1>
            <p className="text-xs text-muted-foreground">{data.cycle?.orgName} · {idx + 1} de {SECTIONS.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => idx > 0 && setActive(SECTIONS[idx - 1].id)} disabled={idx === 0}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => idx < SECTIONS.length - 1 && setActive(SECTIONS[idx + 1].id)} disabled={idx === SECTIONS.length - 1}>
              <ChevronRight className="size-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={onExit}>Salir</Button>
          </div>
        </div>
        <SectionContent id={active} data={data} cycleId={cycleId} />
        <p className="text-xs text-muted-foreground text-center mt-6">
          ← → para navegar · Esc para salir
        </p>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// PRINT STYLES
// ───────────────────────────────────────────────────────────────────────

function PrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        body { background: white; font-size: 11pt; }
        nav, aside, [role="navigation"], .print\\:hidden { display: none !important; }
        main, .container { max-width: 100% !important; padding: 0 !important; }
        @page { margin: 1.5cm; }
        h1, h2 { page-break-after: avoid; }
        .card, [class*="rounded-lg"][class*="border"] { break-inside: avoid; }
      }
    `}</style>
  );
}
