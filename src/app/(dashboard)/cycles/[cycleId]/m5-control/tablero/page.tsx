"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/router";
import { trpc } from "@/lib/trpc";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChartPie,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Minus,
  Maximize2,
  Minimize2,
  RefreshCw,
  FileText,
  FileDown,
  FileImage,
  Plug,
  HandMetal,
  MessageCircle,
  Send,
  Search,
  Filter,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  BSC_DIMENSIONS,
  getDimensionDef,
  type BscDimension,
} from "@/lib/kpi-suggestions";
import {
  SEMAFORO_COLORS,
  buildKpiSnapshot,
  computeGlobalCompliance,
  getDefaultPeriod,
  buildSparklinePath,
  formatKpiValue,
  buildKpiNarrative,
  type KpiSnapshot,
  type Semaforo,
} from "@/lib/bsc-dashboard";
import { exportDashboardPdf, exportDashboardExcel, exportDashboardPng } from "@/lib/lazy-exports";
import type { DashboardExportContext } from "@/lib/dashboard-export";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type SetupData = RouterOutputs["dashboard"]["setup"];
type KpiDetail = NonNullable<ReturnType<typeof trpc.dashboard.kpiDetail.useQuery>["data"]>;

type Mode = "dimensiones" | "mapa" | "lista";

export default function TableroBscPage() {
  return (
    <ReactFlowProvider>
      <TableroInner />
    </ReactFlowProvider>
  );
}

function TableroInner() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const utils = trpc.useUtils();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<Mode>("dimensiones");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [drillId, setDrillId] = useState<string | null>(null);
  const [presentation, setPresentation] = useState(false);

  // Polling cada 30s para que llegue lo nuevo de EduCaNet
  const setupQuery = trpc.dashboard.setup.useQuery(
    { cycleId },
    { refetchInterval: 120_000, refetchIntervalInBackground: false },
  );

  const inferRelMut = trpc.dashboard.inferRelations.useMutation({
    onSuccess: (res) => {
      utils.dashboard.setup.invalidate({ cycleId });
      if (res.created > 0) toast.success(`${res.created} relaciones inferidas`);
    },
    onError: (e) => toast.error(e.message),
  });

  const setup = setupQuery.data;

  // Default period
  useEffect(() => {
    if (setup && !selectedPeriod) {
      const def = getDefaultPeriod(setup.kpis, setup.cycle.yearStart, setup.cycle.yearEnd);
      setSelectedPeriod(def);
    }
  }, [setup, selectedPeriod]);

  // Si no hay relaciones aún, intentar inferir automáticamente al primer load
  useEffect(() => {
    if (setup && setup.relations.length === 0 && setup.kpis.length >= 2) {
      inferRelMut.mutate({ cycleId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setup?.relations.length, setup?.kpis.length, cycleId]);

  // Período listado
  const availablePeriods = useMemo(() => {
    if (!setup) return [];
    const set = new Set<string>();
    for (const k of setup.kpis) for (const p of k.periods) set.add(p.period);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [setup]);

  const snapshots = useMemo<KpiSnapshot[]>(() => {
    if (!setup || !selectedPeriod) return [];
    return setup.kpis.map((k) =>
      buildKpiSnapshot(
        {
          id: k.id,
          code: k.code,
          name: k.name,
          description: k.description,
          dimensionBsc: k.dimensionBsc,
          unit: k.unit,
          frequency: k.frequency,
          direction: k.direction,
          source: k.source,
          educanetLinkId: k.educanetLinkId,
          educanetLastReceivedAt: k.educanetLastReceivedAt,
          responsibleArea: k.responsibleArea,
          responsibleRole: k.responsibleRole,
          periods: k.periods,
        },
        selectedPeriod,
      ),
    );
  }, [setup, selectedPeriod]);

  const stats = useMemo(() => computeGlobalCompliance(snapshots), [snapshots]);

  // Keyboard navigation in presentation mode
  useEffect(() => {
    if (!presentation) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setPresentation(false);
      if (e.key === "ArrowRight") {
        const modes: Mode[] = ["dimensiones", "mapa", "lista"];
        const idx = modes.indexOf(mode);
        setMode(modes[(idx + 1) % modes.length]);
      }
      if (e.key === "ArrowLeft") {
        const modes: Mode[] = ["dimensiones", "mapa", "lista"];
        const idx = modes.indexOf(mode);
        setMode(modes[(idx - 1 + modes.length) % modes.length]);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [presentation, mode]);

  if (setupQuery.isLoading) {
    return <div className="animate-pulse text-muted-foreground">Cargando Tablero BSC...</div>;
  }
  if (!setup) {
    return <div className="text-muted-foreground">No se pudo cargar el ciclo.</div>;
  }
  if (setup.kpis.length === 0) {
    return (
      <Card className="border-amber-500/30 bg-transparent">
        <CardContent className="flex flex-col items-start gap-3 py-8 text-left">
          <AlertTriangle className="h-6 w-6 text-amber-400" />
          <div>
            <p className="font-semibold">Aún no has diseñado tus indicadores</p>
            <p className="text-sm text-muted-foreground">
              Ve a KPIs y metas para comenzar a definir los indicadores que se mostrarán aquí.
            </p>
          </div>
          <Link
            href={`/cycles/${cycleId}/m5-control/kpis`}
            className="inline-flex h-7 items-center rounded-md bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Ir a KPIs y metas
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (drillId) {
    return (
      <KpiDrillDown
        kpiId={drillId}
        cycleId={cycleId}
        onBack={() => setDrillId(null)}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "space-y-5",
        presentation && "fixed inset-0 z-50 overflow-auto bg-background p-8",
      )}
    >
      <GlobalHeader
        setup={setup}
        stats={stats}
        availablePeriods={availablePeriods}
        selectedPeriod={selectedPeriod ?? ""}
        setSelectedPeriod={setSelectedPeriod}
        mode={mode}
        setMode={setMode}
        onRefresh={() => utils.dashboard.setup.invalidate({ cycleId })}
        presentation={presentation}
        setPresentation={setPresentation}
        snapshots={snapshots}
        containerRef={containerRef}
        cycleId={cycleId}
      />

      {mode === "dimensiones" && (
        <ModeDimensions
          snapshots={snapshots}
          onSelectKpi={setDrillId}
        />
      )}

      {mode === "mapa" && (
        <ModeMap
          snapshots={snapshots}
          relations={setup.relations}
          onSelectKpi={setDrillId}
          onInfer={() => inferRelMut.mutate({ cycleId })}
        />
      )}

      {mode === "lista" && (
        <ModeList snapshots={snapshots} onSelectKpi={setDrillId} />
      )}

      {!presentation && (
        <SyncFooter
          snapshots={snapshots}
          lastSync={setupQuery.dataUpdatedAt ? new Date(setupQuery.dataUpdatedAt) : null}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Header global
// ────────────────────────────────────────────────────────────────────

function GlobalHeader({
  setup,
  stats,
  availablePeriods,
  selectedPeriod,
  setSelectedPeriod,
  mode,
  setMode,
  onRefresh,
  presentation,
  setPresentation,
  snapshots,
  containerRef,
  cycleId,
}: {
  setup: SetupData;
  stats: ReturnType<typeof computeGlobalCompliance>;
  availablePeriods: string[];
  selectedPeriod: string;
  setSelectedPeriod: (p: string) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  onRefresh: () => void;
  presentation: boolean;
  setPresentation: (v: boolean) => void;
  snapshots: KpiSnapshot[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  cycleId: string;
}) {
  const utils = trpc.useUtils();
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  async function handleExportPdf() {
    const data = await utils.dashboard.getExportData.fetch({ cycleId });
    const ctx: DashboardExportContext = {
      cycle: data.cycle,
      organization: data.organization,
      snapshots,
      globalPct: stats.globalPct,
      counts: stats.counts,
      rawKpis: data.kpis.map((k) => ({
        id: k.id,
        code: k.code,
        name: k.name,
        dimensionBsc: k.dimensionBsc,
        periods: k.periods.map((p) => ({
          period: p.period,
          metaGreen: p.metaGreen,
          realValue: p.realValue,
          semaforoActual: p.semaforoActual,
        })),
        comments: k.comments.map((c) => ({
          user: { name: c.user.name, role: c.user.role },
          text: c.text,
          createdAt: c.createdAt,
        })),
      })),
    };
    exportDashboardPdf(ctx);
    toast.success("PDF generado");
    setExportMenuOpen(false);
  }

  async function handleExportExcel() {
    const data = await utils.dashboard.getExportData.fetch({ cycleId });
    const ctx: DashboardExportContext = {
      cycle: data.cycle,
      organization: data.organization,
      snapshots,
      globalPct: stats.globalPct,
      counts: stats.counts,
      rawKpis: data.kpis.map((k) => ({
        id: k.id,
        code: k.code,
        name: k.name,
        dimensionBsc: k.dimensionBsc,
        periods: k.periods.map((p) => ({
          period: p.period,
          metaGreen: p.metaGreen,
          realValue: p.realValue,
          semaforoActual: p.semaforoActual,
        })),
        comments: k.comments.map((c) => ({
          user: { name: c.user.name, role: c.user.role },
          text: c.text,
          createdAt: c.createdAt,
        })),
      })),
    };
    exportDashboardExcel(ctx);
    toast.success("Excel generado");
    setExportMenuOpen(false);
  }

  async function handleExportPng() {
    if (!containerRef.current) return;
    await exportDashboardPng(containerRef.current, `tablero-bsc-${selectedPeriod}`);
    toast.success("PNG generado");
    setExportMenuOpen(false);
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-4 text-left">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <ChartPie className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                Tablero BSC · {setup.organization.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                Ciclo {setup.cycle.yearStart}–{setup.cycle.yearEnd} · Período actual:{" "}
                <strong>{selectedPeriod}</strong>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v ?? "")}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availablePeriods.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={onRefresh}>
              <RefreshCw className="mr-1 size-3.5" /> Actualizar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPresentation(!presentation)}
            >
              {presentation ? (
                <>
                  <Minimize2 className="mr-1 size-3.5" /> Salir
                </>
              ) : (
                <>
                  <Maximize2 className="mr-1 size-3.5" /> Presentar
                </>
              )}
            </Button>
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
              >
                <FileDown className="mr-1 size-3.5" /> Exportar
              </Button>
              {exportMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-md border bg-background p-1 shadow-md">
                  <button
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={handleExportPdf}
                  >
                    <FileText className="size-3.5" /> PDF ejecutivo
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={handleExportExcel}
                  >
                    <FileDown className="size-3.5" /> Excel completo
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={handleExportPng}
                  >
                    <FileImage className="size-3.5" /> PNG snapshot
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <GlobalMetric
            label="Cumplimiento global"
            value={`${stats.globalPct}%`}
            highlight
            subtext={`${snapshots.length} indicadores · 4 dimensiones`}
          />
          <SemaforoMetric label="En meta" count={stats.counts.verde} semaforo="verde" />
          <SemaforoMetric label="Alerta" count={stats.counts.ambar} semaforo="ambar" />
          <SemaforoMetric label="Crítico" count={stats.counts.rojo} semaforo="rojo" />
          <SemaforoMetric label="Sin dato" count={stats.counts.sin_dato} semaforo="sin_dato" />
        </div>

        <div className="flex flex-wrap gap-1">
          {(["dimensiones", "mapa", "lista"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition",
                mode === m
                  ? "border-2 border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/30",
              )}
            >
              {m === "dimensiones"
                ? "Por dimensiones"
                : m === "mapa"
                ? "Mapa estratégico"
                : "Lista completa"}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GlobalMetric({
  label,
  value,
  highlight,
  subtext,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  subtext?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        highlight && "border-primary/25 bg-primary/10/40",
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-3xl font-bold",
          highlight && "text-primary",
        )}
      >
        {value}
      </div>
      {subtext && <div className="text-[10px] text-muted-foreground">{subtext}</div>}
    </div>
  );
}

function SemaforoMetric({
  label,
  count,
  semaforo,
}: {
  label: string;
  count: number;
  semaforo: Semaforo;
}) {
  const c = SEMAFORO_COLORS[semaforo];
  return (
    <div className="rounded-lg border px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-block size-2 rounded-full" style={{ backgroundColor: c.color }} />
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold" style={{ color: c.color }}>
        {count}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Modo 1 · Por dimensiones
// ────────────────────────────────────────────────────────────────────

function ModeDimensions({
  snapshots,
  onSelectKpi,
}: {
  snapshots: KpiSnapshot[];
  onSelectKpi: (id: string) => void;
}) {
  const byDim = new Map<BscDimension, KpiSnapshot[]>();
  for (const d of BSC_DIMENSIONS) byDim.set(d.key, []);
  for (const k of snapshots) byDim.get(k.dimensionBsc)?.push(k);

  const critical = snapshots.filter((k) => k.semaforo === "rojo");
  const topCritical = critical.sort((a, b) => {
    const pa = a.percentCompletion ?? 999;
    const pb = b.percentCompletion ?? 999;
    return pa - pb;
  })[0];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {BSC_DIMENSIONS.map((dim) => (
          <DimensionQuadrant
            key={dim.key}
            dim={dim}
            kpis={byDim.get(dim.key) ?? []}
            onSelectKpi={onSelectKpi}
          />
        ))}
      </div>

      {topCritical && (
        <Card className="border-red-500/30 bg-transparent">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm text-red-300">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-5 text-red-400" />
              <div>
                <strong>1 KPI crítico requiere acción inmediata:</strong>{" "}
                {topCritical.code} — {topCritical.name}.{" "}
                {topCritical.responsibleAreaName && (
                  <>Responsable: {topCritical.responsibleAreaName}.</>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/30"
              onClick={() => onSelectKpi(topCritical.id)}
            >
              Ver detalle <ChevronRight className="ml-1 size-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DimensionQuadrant({
  dim,
  kpis,
  onSelectKpi,
}: {
  dim: (typeof BSC_DIMENSIONS)[number];
  kpis: KpiSnapshot[];
  onSelectKpi: (id: string) => void;
}) {
  const counts = {
    verde: kpis.filter((k) => k.semaforo === "verde").length,
    ambar: kpis.filter((k) => k.semaforo === "ambar").length,
    rojo: kpis.filter((k) => k.semaforo === "rojo").length,
  };
  return (
    <Card style={{ borderColor: dim.color, borderWidth: 1 }}>
      <CardHeader className="py-3" style={{ backgroundColor: dim.bg }}>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-left text-base" style={{ color: dim.color }}>
            {dim.label}
          </CardTitle>
          <div className="flex items-center gap-1 text-xs">
            <span className="inline-block size-2 rounded-full bg-transparent0" />
            <span style={{ color: dim.color }}>{counts.verde}</span>
            <span className="ml-2 inline-block size-2 rounded-full bg-transparent0" />
            <span style={{ color: dim.color }}>{counts.ambar}</span>
            <span className="ml-2 inline-block size-2 rounded-full bg-transparent0" />
            <span style={{ color: dim.color }}>{counts.rojo}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-3">
        {kpis.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground italic">
            Sin indicadores en esta dimensión
          </p>
        ) : (
          kpis.map((k) => (
            <KpiMiniCard key={k.id} kpi={k} dimColor={dim.color} onClick={() => onSelectKpi(k.id)} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function KpiMiniCard({
  kpi,
  dimColor,
  onClick,
}: {
  kpi: KpiSnapshot;
  dimColor: string;
  onClick: () => void;
}) {
  const sem = SEMAFORO_COLORS[kpi.semaforo];
  const path = buildSparklinePath(kpi.sparkline, 60, 20);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-wrap items-start justify-between gap-2 rounded-md border p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
      )}
      style={{
        backgroundColor: sem.bg,
        borderColor: kpi.semaforo === "verde" ? "rgba(0,0,0,0.08)" : sem.color,
      }}
    >
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            className="border-0 font-mono text-[10px]"
            style={{ backgroundColor: dimColor, color: "white" }}
          >
            {kpi.code}
          </Badge>
          {kpi.source === "educanet" ? (
            <Badge className="border-primary/30 bg-primary/15 text-[10px] text-primary">
              <Plug className="mr-0.5 size-2.5" />
            </Badge>
          ) : (
            <Badge className="border-amber-500/30 bg-transparent text-[10px] text-amber-300">
              <HandMetal className="mr-0.5 size-2.5" />
            </Badge>
          )}
          <Badge
            className="border-0 text-[10px] font-bold"
            style={{ backgroundColor: sem.color, color: "white" }}
          >
            {sem.label}
          </Badge>
        </div>
        <div className="text-sm font-semibold leading-tight">{kpi.name}</div>
        <div className="text-[10px] text-muted-foreground">
          <strong style={{ color: dimColor }}>
            {formatKpiValue(kpi.currentValue, kpi.unit)}
          </strong>
          {" · Meta: "}
          {formatKpiValue(kpi.metaGreen, kpi.unit)}
          {kpi.percentCompletion != null && ` · ${kpi.percentCompletion}%`}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        {kpi.sparkline.length >= 2 && (
          <svg width="60" height="20" className="overflow-visible">
            <path
              d={path}
              fill="none"
              stroke={sem.color}
              strokeWidth="1.5"
            />
          </svg>
        )}
        {kpi.trendDirection && (
          <div className="flex items-center gap-0.5 text-[10px]">
            {kpi.trendDirection === "up" ? (
              <ArrowUp className="size-3 text-emerald-400" />
            ) : kpi.trendDirection === "down" ? (
              <ArrowDown className="size-3 text-rose-400" />
            ) : (
              <Minus className="size-3 text-muted-foreground" />
            )}
            {kpi.trendDelta != null && (
              <span className="text-muted-foreground">
                {kpi.trendDelta > 0 ? "+" : ""}
                {formatKpiValue(kpi.trendDelta, kpi.unit)}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────
// Modo 2 · Mapa estratégico (React Flow)
// ────────────────────────────────────────────────────────────────────

function MapNode({ data }: NodeProps) {
  const d = data as {
    code: string;
    name: string;
    semaforo: Semaforo;
    currentValue: string;
    meta: string;
    percent: number | null;
    dimColor: string;
  };
  const sem = SEMAFORO_COLORS[d.semaforo];
  return (
    <div
      className="rounded-lg border-2 px-3 py-2 text-left shadow-sm"
      style={{
        backgroundColor: "transparent",
        borderColor: sem.color,
        minWidth: 180,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-transparent" />
      <div className="flex items-center gap-1.5">
        <span className="inline-block size-2 rounded-full" style={{ backgroundColor: sem.color }} />
        <span className="font-mono text-[10px]" style={{ color: d.dimColor }}>
          {d.code}
        </span>
      </div>
      <div className="mt-1 text-xs font-semibold leading-tight">{d.name}</div>
      <div className="mt-1 text-lg font-bold" style={{ color: sem.color }}>
        {d.currentValue}
      </div>
      <div className="text-[10px] text-muted-foreground">
        Meta: {d.meta}
        {d.percent != null && <> · {d.percent}%</>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-transparent" />
    </div>
  );
}

const mapNodeTypes = { mapNode: MapNode };

function ModeMap({
  snapshots,
  relations,
  onSelectKpi,
  onInfer,
}: {
  snapshots: KpiSnapshot[];
  relations: SetupData["relations"];
  onSelectKpi: (id: string) => void;
  onInfer: () => void;
}) {
  // Bandas horizontales: orden Kaplan-Norton (arriba = económicos)
  const bandOrder: BscDimension[] = [
    "resultados_economicos",
    "posicion_mercado",
    "como_opera_empresa",
    "personas_cultura",
  ];
  const bandHeight = 180;

  const nodes: Node[] = [];
  for (let i = 0; i < bandOrder.length; i++) {
    const dim = bandOrder[i];
    const dimDef = getDimensionDef(dim)!;
    const items = snapshots.filter((s) => s.dimensionBsc === dim);
    items.forEach((k, idx) => {
      nodes.push({
        id: k.id,
        type: "mapNode",
        position: {
          x: 80 + idx * 220,
          y: 40 + i * bandHeight,
        },
        data: {
          code: k.code,
          name: k.name,
          semaforo: k.semaforo,
          currentValue: formatKpiValue(k.currentValue, k.unit),
          meta: formatKpiValue(k.metaGreen, k.unit),
          percent: k.percentCompletion,
          dimColor: dimDef.color,
        },
        draggable: true,
      });
    });
  }

  const snapMap = new Map(snapshots.map((s) => [s.id, s]));
  const edges: Edge[] = relations.map((r) => {
    const src = snapMap.get(r.sourceKpiId);
    const sem = src?.semaforo ?? "sin_dato";
    const strokeColor =
      sem === "rojo"
        ? "#f87171"
        : sem === "ambar"
        ? "#F59E0B"
        : sem === "verde"
        ? "#4ade80"
        : "#94A3B8";
    return {
      id: r.id,
      source: r.sourceKpiId,
      target: r.targetKpiId,
      type: "smoothstep",
      animated: r.intensity === "alta",
      style: {
        stroke: strokeColor,
        strokeWidth: sem === "rojo" ? 2.5 : 1.5,
      },
    };
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 py-3">
          <CardTitle className="text-left text-base">Mapa estratégico</CardTitle>
          <Button size="sm" variant="outline" onClick={onInfer}>
            <Sparkles className="mr-1 size-3.5" /> Inferir relaciones
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div
            className="relative"
            style={{ height: bandOrder.length * bandHeight + 60 }}
          >
            {/* Bandas de fondo */}
            <div className="pointer-events-none absolute inset-0">
              {bandOrder.map((dim, i) => {
                const def = getDimensionDef(dim)!;
                return (
                  <div
                    key={dim}
                    className="absolute left-0 right-0 flex items-center px-4"
                    style={{
                      top: 40 + i * bandHeight - 20,
                      height: bandHeight,
                      backgroundColor: def.bg,
                      borderTop: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <div className="text-xs font-semibold" style={{ color: def.color }}>
                      {def.label}
                    </div>
                  </div>
                );
              })}
            </div>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={mapNodeTypes}
              onNodeClick={(_e, n) => onSelectKpi(n.id)}
              fitView
              proOptions={{ hideAttribution: true }}
              nodesDraggable
              panOnDrag
              zoomOnScroll
              zoomOnPinch
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(167,139,250,0.14)" />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardContent className="py-3 text-left text-xs">
            <strong className="block">Lectura del mapa</strong>
            De abajo hacia arriba: <em>Personas y cultura</em> habilitan{" "}
            <em>Cómo opera la empresa</em>, que mejora la <em>Posición de mercado</em>,
            traduciéndose en <em>Resultados económicos</em>.
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-left text-xs">
            <strong className="block">Flechas e impacto</strong>
            Verdes: flujo positivo. Ámbar: alerta. <span className="text-rose-400 font-semibold">Rojas: flujo bloqueado</span>{" "}
            por problema upstream.
          </CardContent>
        </Card>
        <Card className="border-rose-500/30 bg-transparent">
          <CardContent className="py-3 text-left text-xs">
            <strong className="block text-rose-300">Punto crítico</strong>
            {snapshots.some((s) => s.semaforo === "rojo")
              ? `${snapshots.filter((s) => s.semaforo === "rojo").length} KPIs en rojo están bloqueando el flujo hacia las dimensiones superiores.`
              : "Sin puntos críticos identificados."}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Modo 3 · Lista
// ────────────────────────────────────────────────────────────────────

function ModeList({
  snapshots,
  onSelectKpi,
}: {
  snapshots: KpiSnapshot[];
  onSelectKpi: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterDim, setFilterDim] = useState<BscDimension | "all">("all");
  const [filterSem, setFilterSem] = useState<Semaforo | "all">("all");
  const [sortBy, setSortBy] = useState<"code" | "name" | "percent" | "trend">("code");

  const filtered = useMemo(() => {
    let result = snapshots;
    if (filterDim !== "all") result = result.filter((k) => k.dimensionBsc === filterDim);
    if (filterSem !== "all") result = result.filter((k) => k.semaforo === filterSem);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (k) => k.name.toLowerCase().includes(q) || k.code.toLowerCase().includes(q),
      );
    }
    if (sortBy === "percent") {
      result = [...result].sort(
        (a, b) => (a.percentCompletion ?? 0) - (b.percentCompletion ?? 0),
      );
    } else if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      result = [...result].sort((a, b) => a.code.localeCompare(b.code));
    }
    return result;
  }, [snapshots, search, filterDim, filterSem, sortBy]);

  return (
    <Card>
      <CardContent className="space-y-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-7 text-xs"
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={filterDim}
            onValueChange={(v) => setFilterDim(v as BscDimension | "all")}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Dimensión" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las dimensiones</SelectItem>
              {BSC_DIMENSIONS.map((d) => (
                <SelectItem key={d.key} value={d.key}>
                  {d.shortLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterSem}
            onValueChange={(v) => setFilterSem(v as Semaforo | "all")}
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Semáforo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="verde">En meta</SelectItem>
              <SelectItem value="ambar">Alerta</SelectItem>
              <SelectItem value="rojo">Crítico</SelectItem>
              <SelectItem value="sin_dato">Sin dato</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "code" | "name" | "percent" | "trend")}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="code">Código</SelectItem>
              <SelectItem value="name">Nombre</SelectItem>
              <SelectItem value="percent">% cumplimiento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-2 py-2 font-medium">Código</th>
                <th className="px-2 py-2 font-medium">Dimensión</th>
                <th className="px-2 py-2 font-medium">Nombre</th>
                <th className="px-2 py-2 font-medium text-center">Fuente</th>
                <th className="px-2 py-2 font-medium text-right">Valor</th>
                <th className="px-2 py-2 font-medium text-right">Meta</th>
                <th className="px-2 py-2 font-medium text-center">%</th>
                <th className="px-2 py-2 font-medium text-center">Semáforo</th>
                <th className="px-2 py-2 font-medium text-center">Tend</th>
                <th className="px-2 py-2 font-medium">Responsable</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((k) => {
                const dim = getDimensionDef(k.dimensionBsc);
                const sem = SEMAFORO_COLORS[k.semaforo];
                return (
                  <tr
                    key={k.id}
                    className="border-b cursor-pointer hover:bg-muted/20"
                    onClick={() => onSelectKpi(k.id)}
                  >
                    <td className="px-2 py-2 font-mono">{k.code}</td>
                    <td className="px-2 py-2">
                      <span style={{ color: dim?.color }}>{dim?.shortLabel}</span>
                    </td>
                    <td className="px-2 py-2 font-medium">{k.name}</td>
                    <td className="px-2 py-2 text-center">
                      {k.source === "educanet" ? (
                        <Plug className="mx-auto size-3.5 text-primary" />
                      ) : (
                        <HandMetal className="mx-auto size-3.5 text-amber-400" />
                      )}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold">
                      {formatKpiValue(k.currentValue, k.unit)}
                    </td>
                    <td className="px-2 py-2 text-right">{formatKpiValue(k.metaGreen, k.unit)}</td>
                    <td className="px-2 py-2 text-center">
                      {k.percentCompletion != null ? `${k.percentCompletion}%` : "—"}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span
                        className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: sem.color, color: "white" }}
                      >
                        {sem.label}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      {k.trendDirection === "up" ? (
                        <ArrowUp className="mx-auto size-3.5 text-emerald-400" />
                      ) : k.trendDirection === "down" ? (
                        <ArrowDown className="mx-auto size-3.5 text-rose-400" />
                      ) : (
                        <Minus className="mx-auto size-3 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-2 py-2 text-[10px] text-muted-foreground">
                      {k.responsibleAreaName ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                    Sin indicadores con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Sync footer
// ────────────────────────────────────────────────────────────────────

function SyncFooter({
  snapshots,
  lastSync,
}: {
  snapshots: KpiSnapshot[];
  lastSync: Date | null;
}) {
  const educanet = snapshots.filter((s) => s.source === "educanet").length;
  const manual = snapshots.filter((s) => s.source === "manual").length;
  const minutesAgo = lastSync
    ? Math.floor((Date.now() - lastSync.getTime()) / 60000)
    : null;
  return (
    <Card className="bg-muted/10">
      <CardContent className="flex flex-wrap items-center gap-4 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Plug className="size-3 text-primary" />
          <span>{educanet} sincronizados desde EduCaNet</span>
        </div>
        <div className="flex items-center gap-1">
          <HandMetal className="size-3 text-amber-400" />
          <span>{manual} de carga manual</span>
        </div>
        {minutesAgo != null && (
          <div>
            Última sync: hace {minutesAgo === 0 ? "menos de 1" : minutesAgo} min · próxima en{" "}
            {Math.max(0, 30 - ((Date.now() / 1000) % 30) | 0)} s (polling 30s)
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Drill-down KPI
// ────────────────────────────────────────────────────────────────────

function KpiDrillDown({
  kpiId,
  cycleId,
  onBack,
}: {
  kpiId: string;
  cycleId: string;
  onBack: () => void;
}) {
  const utils = trpc.useUtils();
  const [commentText, setCommentText] = useState("");
  const detailQuery = trpc.dashboard.kpiDetail.useQuery({ kpiId });
  const postComment = trpc.dashboard.postComment.useMutation({
    onSuccess: () => {
      utils.dashboard.kpiDetail.invalidate({ kpiId });
      setCommentText("");
      toast.success("Comentario agregado");
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteComment = trpc.dashboard.deleteComment.useMutation({
    onSuccess: () => utils.dashboard.kpiDetail.invalidate({ kpiId }),
    onError: (e) => toast.error(e.message),
  });

  if (detailQuery.isLoading || !detailQuery.data) {
    return <div className="animate-pulse text-muted-foreground">Cargando detalle...</div>;
  }
  const { kpi, history, comments } = detailQuery.data;
  const direction = kpi.direction as "mayor_mejor" | "menor_mejor" | "objetivo_puntual";
  const snapshot = buildKpiSnapshot(
    {
      id: kpi.id,
      code: kpi.code,
      name: kpi.name,
      description: kpi.description,
      dimensionBsc: kpi.dimensionBsc,
      unit: kpi.unit,
      frequency: kpi.frequency,
      direction: kpi.direction,
      source: kpi.source,
      educanetLinkId: kpi.educanetLinkId,
      educanetLastReceivedAt: kpi.educanetLastReceivedAt,
      responsibleArea: kpi.responsibleArea,
      responsibleRole: kpi.responsibleRole,
      periods: kpi.periods,
    },
    getDefaultPeriod([{ ...kpi }] as Parameters<typeof getDefaultPeriod>[0], 2025, 2030),
  );
  const sem = SEMAFORO_COLORS[snapshot.semaforo];
  const dim = getDimensionDef(snapshot.dimensionBsc);

  const chartData = kpi.periods.map((p) => ({
    period: p.period,
    real: p.realValue,
    meta: p.metaGreen,
    aceptable: p.metaAmber,
    critico: p.metaRed,
  }));
  const sparkValues = kpi.periods
    .filter((p) => p.realValue != null)
    .slice(-12)
    .map((p) => p.realValue!);
  const narrative = buildKpiNarrative(snapshot, sparkValues);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2">
          <ArrowLeft className="mr-1 size-3.5" /> Tablero BSC
        </Button>
        <ChevronRight className="size-3" />
        <span style={{ color: dim?.color }}>{dim?.label}</span>
        <ChevronRight className="size-3" />
        <span className="font-medium text-foreground">{kpi.name}</span>
      </div>

      <Card style={{ borderColor: sem.color, borderWidth: 2 }}>
        <CardContent className="space-y-3 py-4 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="font-mono">{kpi.code}</Badge>
            <Badge
              className="border-0 font-bold"
              style={{ backgroundColor: sem.color, color: "white" }}
            >
              {sem.label}
            </Badge>
            <Badge
              className="border-0"
              style={{ backgroundColor: dim?.bg, color: dim?.color }}
            >
              {dim?.label}
            </Badge>
            <Badge
              className={cn(
                "border-0",
                kpi.source === "educanet"
                  ? "bg-primary/15 text-primary"
                  : "bg-transparent text-amber-300",
              )}
            >
              {kpi.source === "educanet" ? (
                <>
                  <Plug className="mr-1 size-3" /> EduCaNet
                </>
              ) : (
                <>
                  <HandMetal className="mr-1 size-3" /> Manual
                </>
              )}
            </Badge>
          </div>
          <h3 className="text-xl font-semibold">{kpi.name}</h3>
          {kpi.description && (
            <p className="text-sm text-muted-foreground">{kpi.description}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <DetailMetric
          label="Valor actual"
          value={formatKpiValue(snapshot.currentValue, snapshot.unit)}
          bg={sem.bg}
          color={sem.color}
        />
        <DetailMetric label="Meta" value={formatKpiValue(snapshot.metaGreen, snapshot.unit)} />
        <DetailMetric
          label="Cumplimiento"
          value={snapshot.percentCompletion != null ? `${snapshot.percentCompletion}%` : "—"}
        />
        <DetailMetric
          label="Tendencia"
          value={
            snapshot.trendDirection === "up"
              ? "↑ Mejorando"
              : snapshot.trendDirection === "down"
              ? "↓ Empeorando"
              : "→ Estable"
          }
        />
        <DetailMetric
          label="Última act."
          value={
            snapshot.lastReceivedAt
              ? new Date(snapshot.lastReceivedAt).toLocaleDateString("es-PE")
              : "—"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-left text-base">Evolución histórica</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {chartData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Sin datos suficientes para graficar
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="period" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  {kpi.periods[0]?.metaGreen != null && (
                    <ReferenceLine
                      y={kpi.periods[0].metaGreen}
                      stroke="#4ade80"
                      strokeDasharray="3 3"
                      label={{ value: "Meta", position: "right", fontSize: 10 }}
                    />
                  )}
                  {kpi.periods[0]?.metaAmber != null && (
                    <ReferenceLine
                      y={kpi.periods[0].metaAmber}
                      stroke="#F59E0B"
                      strokeDasharray="3 3"
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="real"
                    stroke={sem.color}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-left text-base">Contexto estratégico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-left text-xs">
            {kpi.olps.length > 0 && (
              <div>
                <strong className="block mb-1">Mide los OLPs:</strong>
                <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
                  {kpi.olps.map((o) => (
                    <li key={o.olpId}>{o.olp.description.slice(0, 120)}</li>
                  ))}
                </ul>
              </div>
            )}
            {kpi.ocps.length > 0 && (
              <div>
                <strong className="block mb-1">OCPs vinculados:</strong>
                <div className="flex flex-wrap gap-1">
                  {kpi.ocps.map((o) => (
                    <Badge key={o.ocpId} variant="outline" className="text-[10px]">
                      {o.ocp.code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {kpi.responsibleArea && (
              <div>
                <strong className="block mb-1">Responsable:</strong>
                <div className="text-muted-foreground">
                  {kpi.responsibleArea.name}
                  {kpi.responsibleRole && ` · ${kpi.responsibleRole}`}
                </div>
              </div>
            )}
            {kpi.source === "educanet" && (
              <div className="rounded-md border bg-muted/30 p-2">
                <strong className="block text-[10px]">Origen del dato</strong>
                <div className="font-mono text-[10px]">{kpi.educanetLinkId}</div>
                <div className="text-[10px] text-muted-foreground">
                  Modo: {kpi.educanetSendMode ?? "manual"}
                  {kpi.educanetProjectId && <> · Proyecto: {kpi.educanetProjectId}</>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-left text-base">Histórico de valores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-left">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Sin valores recibidos aún.</p>
            ) : (
              history.slice(0, 8).map((h) => (
                <div key={h.id} className="flex items-center justify-between text-xs">
                  <div>
                    <strong>{h.period}</strong> · {formatKpiValue(h.value, kpi.unit)}
                  </div>
                  <div className="text-muted-foreground">
                    {new Date(h.receivedAt).toLocaleString("es-PE")} ·{" "}
                    {h.source === "educanet" ? "EduCaNet" : "Manual"}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-left text-base flex items-center gap-2">
              <MessageCircle className="size-4" /> Comentarios ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-left">
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Sin comentarios. Sé el primero en aportar contexto.
                </p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "rounded-md border-l-2 bg-muted/20 p-2 text-xs",
                      c.user.role === "ADMIN" || c.user.role === "ALTA_DIRECCION"
                        ? "border-l-rose-500"
                        : "border-l-muted-foreground/30",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <strong>{c.user.name}</strong>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(c.createdAt).toLocaleString("es-PE")}
                      </span>
                    </div>
                    <p className="mt-1">{c.text}</p>
                    <button
                      type="button"
                      className="mt-1 text-[10px] text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm("Eliminar este comentario?")) {
                          deleteComment.mutate({ id: c.id });
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2 border-t pt-2">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Escribe un comentario..."
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!commentText.trim()) return;
                  postComment.mutate({ kpiId, text: commentText });
                }}
                disabled={!commentText.trim() || postComment.isPending}
              >
                <Send className="size-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base flex items-center gap-2">
            <Sparkles className="size-4" /> Análisis automático
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground text-left">
          {narrative}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  bg,
  color,
}: {
  label: string;
  value: string;
  bg?: string;
  color?: string;
}) {
  return (
    <Card style={bg ? { backgroundColor: bg } : undefined}>
      <CardContent className="py-3 text-left">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className="mt-1 text-xl font-bold"
          style={color ? { color } : undefined}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
