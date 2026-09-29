"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/router";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  TrendingDown,
  Clock,
  Target,
  XCircle,
  ChevronRight,
  RefreshCw,
  Inbox,
  Settings,
  History,
  CheckCircle2,
  X,
  MessageCircle,
  Send,
  FileDown,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  ALERT_TYPES,
  PRIORITY_COLORS,
  STATUS_COLORS,
  getAlertTypeDef,
  type AlertType,
  type Priority,
  type AlertStatus,
} from "@/lib/alerts-catalog";
import {
  exportAlertsExcel,
  type AlertsExportContext,
  type ExportAlert,
} from "@/lib/alerts-export";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type SetupData = RouterOutputs["alerts"]["setup"];
type ActiveAlert = SetupData["activeAlerts"][number];
type AlertRule = SetupData["rules"][number];

type View = "bandeja" | "reglas" | "historico";

const TYPE_ICONS: Record<string, LucideIcon> = {
  semaforo_critico: AlertCircle,
  tendencia_negativa: TrendingDown,
  datos_atrasados: Clock,
  olp_en_riesgo: Target,
  hito_incumplido: XCircle,
};

export default function AlertasPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const utils = trpc.useUtils();
  const [view, setView] = useState<View>("bandeja");
  const [detailId, setDetailId] = useState<string | null>(null);

  const setupQuery = trpc.alerts.setup.useQuery(
    { cycleId },
    { refetchInterval: 60_000 },
  );

  const evaluateNow = trpc.alerts.evaluateNow.useMutation({
    onSuccess: (res) => {
      utils.alerts.setup.invalidate({ cycleId });
      if (res.generated > 0) toast.success(`${res.generated} alertas generadas`);
      else toast.info("Sin alertas nuevas que generar");
    },
    onError: (e) => toast.error(e.message),
  });

  const setup = setupQuery.data;
  if (setupQuery.isLoading) {
    return <div className="animate-pulse text-muted-foreground">Cargando alertas...</div>;
  }
  if (!setup) {
    return <div className="text-muted-foreground">No se pudo cargar el ciclo.</div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader />
      <ViewSwitcher
        view={view}
        setView={setView}
        activeCount={setup.activeAlerts.length}
        onEvaluate={() => evaluateNow.mutate({ cycleId })}
        evaluating={evaluateNow.isPending}
      />

      {view === "bandeja" && (
        <InboxView setup={setup} onSelect={setDetailId} cycleId={cycleId} />
      )}

      {view === "reglas" && <RulesView setup={setup} cycleId={cycleId} />}

      {view === "historico" && <HistoryView cycleId={cycleId} />}

      <Dialog
        open={!!detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle de alerta</DialogTitle>
          </DialogHeader>
          {detailId && (
            <AlertDetail alertId={detailId} cycleId={cycleId} onClose={() => setDetailId(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="space-y-1 text-left">
      <h2 className="text-lg font-semibold">Alertas Estratégicas</h2>
      <p className="text-sm text-muted-foreground">
        Notificaciones automáticas cuando el plan estratégico requiere atención. Configura
        reglas, gestiona la bandeja y mantén el histórico para auditoría.
      </p>
    </div>
  );
}

function ViewSwitcher({
  view,
  setView,
  activeCount,
  onEvaluate,
  evaluating,
}: {
  view: View;
  setView: (v: View) => void;
  activeCount: number;
  onEvaluate: () => void;
  evaluating: boolean;
}) {
  const views: { id: View; label: string; icon: LucideIcon; count?: number }[] = [
    { id: "bandeja", label: "Bandeja activa", icon: Inbox, count: activeCount },
    { id: "reglas", label: "Reglas", icon: Settings },
    { id: "historico", label: "Histórico", icon: History },
  ];
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex gap-1">
        {views.map((v) => {
          const Icon = v.icon;
          const active = view === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition",
                active
                  ? "border-2 border-primary bg-primary/5 font-medium text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/30",
              )}
            >
              <Icon className="size-4" />
              {v.label}
              {v.count != null && v.count > 0 && (
                <Badge className="bg-transparent0 text-[10px]">{v.count}</Badge>
              )}
            </button>
          );
        })}
      </div>
      <Button size="sm" variant="outline" onClick={onEvaluate} disabled={evaluating}>
        <RefreshCw className={cn("mr-1 size-3.5", evaluating && "animate-spin")} />
        Evaluar ahora
      </Button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Vista 1: Bandeja activa
// ────────────────────────────────────────────────────────────────────

function InboxView({
  setup,
  onSelect,
  cycleId,
}: {
  setup: SetupData;
  onSelect: (id: string) => void;
  cycleId: string;
}) {
  void cycleId;
  const alerts = setup.activeAlerts;
  const [filter, setFilter] = useState<"all" | "critica" | "importante" | "sin_asignar">("all");
  const [typeFilter, setTypeFilter] = useState<AlertType | "all">("all");

  const counts = {
    total: alerts.length,
    critica: alerts.filter((a) => a.priority === "alta").length,
    importante: alerts.filter((a) => a.priority === "media").length,
    sinAsignar: alerts.filter((a) => !a.assigneeId).length,
  };

  let filtered = alerts;
  if (filter === "critica") filtered = filtered.filter((a) => a.priority === "alta");
  if (filter === "importante") filtered = filtered.filter((a) => a.priority === "media");
  if (filter === "sin_asignar") filtered = filtered.filter((a) => !a.assigneeId);
  if (typeFilter !== "all") filtered = filtered.filter((a) => a.type === typeFilter);

  const critical = alerts.filter((a) => a.priority === "alta");

  return (
    <div className="space-y-4">
      {critical.length > 0 && (
        <Card className="border-red-300 bg-transparent">
          <CardContent className="flex items-start gap-2 py-3 text-sm text-red-900">
            <AlertCircle className="mt-0.5 size-5" />
            <div>
              <strong>Tienes {critical.length} alertas críticas que requieren atención inmediata.</strong>
              {critical.slice(0, 3).map((a) => (
                <div key={a.id} className="mt-1 text-xs">
                  {a.title}
                  {a.assignee && <> · Responsable: {a.assignee.name}</>}
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto border-red-300"
              onClick={() => setFilter("critica")}
            >
              Ver críticas
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total activas" value={counts.total} />
        <MetricCard label="Críticas" value={counts.critica} color="#f87171" />
        <MetricCard label="Importantes" value={counts.importante} color="#fbbf24" />
        <MetricCard label="Sin asignar" value={counts.sinAsignar} color="#A8A29E" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterPill active={filter === "all"} label={`Todas (${counts.total})`} onClick={() => setFilter("all")} />
        <FilterPill
          active={filter === "critica"}
          label={`Críticas (${counts.critica})`}
          color="#f87171"
          onClick={() => setFilter("critica")}
        />
        <FilterPill
          active={filter === "importante"}
          label={`Importantes (${counts.importante})`}
          color="#fbbf24"
          onClick={() => setFilter("importante")}
        />
        <FilterPill
          active={filter === "sin_asignar"}
          label={`Sin asignar (${counts.sinAsignar})`}
          color="#A8A29E"
          onClick={() => setFilter("sin_asignar")}
        />
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter((v ?? "all") as AlertType | "all")}
        >
          <SelectTrigger className="h-8 w-48 text-xs">
            <SelectValue placeholder="Tipo de alerta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {ALERT_TYPES.filter((t) => t.key !== "personalizada").map((t) => (
              <SelectItem key={t.key} value={t.key}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <CheckCircle2 className="mb-3 size-10 text-emerald-500" />
              <p className="text-sm font-medium">Sin alertas pendientes con esos filtros</p>
              <p className="text-xs text-muted-foreground">
                Si no se han generado alertas, prueba "Evaluar ahora" arriba para forzar una revisión.
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((alert) => (
            <AlertCardInbox key={alert.id} alert={alert} onSelect={() => onSelect(alert.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="py-3 text-left">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold" style={color ? { color } : undefined}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function FilterPill({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active ? "text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
      style={{
        borderColor: active ? color ?? "#475569" : "transparent",
        backgroundColor: active ? color ?? "#475569" : "rgba(0,0,0,0.04)",
      }}
    >
      {label}
    </button>
  );
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `hace ${days} d`;
  return new Date(date).toLocaleDateString("es-PE");
}

function AlertCardInbox({
  alert,
  onSelect,
}: {
  alert: ActiveAlert;
  onSelect: () => void;
}) {
  const def = getAlertTypeDef(alert.type);
  const Icon = TYPE_ICONS[alert.type] ?? AlertCircle;
  const prio = PRIORITY_COLORS[alert.priority as Priority];
  const status = STATUS_COLORS[alert.status as AlertStatus];
  const borderColor = alert.priority === "alta" ? "#f87171" : "rgba(0,0,0,0.08)";

  return (
    <Card style={{ borderLeftColor: borderColor, borderLeftWidth: 4 }}>
      <CardContent className="space-y-2 py-3 text-left">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Icon className="mt-0.5 size-5" style={{ color: def?.color }} />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  className="border-0 text-[10px]"
                  style={{ backgroundColor: def?.color, color: "white" }}
                >
                  {def?.label}
                </Badge>
                <Badge
                  className="border-0 text-[10px]"
                  style={{ backgroundColor: prio.color, color: "white" }}
                >
                  {prio.label}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-0 text-[10px]"
                  style={{ backgroundColor: status.bg, color: status.color }}
                >
                  {status.label}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {timeAgo(alert.generatedAt)}
                </span>
              </div>
              <h4 className="text-sm font-semibold">{alert.title}</h4>
              <p className="text-xs text-muted-foreground">{alert.description}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onSelect}>
            Ver detalle <ChevronRight className="ml-1 size-3" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          {alert.assignee ? (
            <div className="flex items-center gap-1">
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {alert.assignee.name.charAt(0)}
              </span>
              <span>{alert.assignee.name}</span>
            </div>
          ) : (
            <Badge variant="outline" className="border-amber-400 text-[10px] text-amber-700">
              Sin asignar
            </Badge>
          )}
          {alert._count.comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageCircle className="size-3" />
              {alert._count.comments}
            </span>
          )}
          {alert._count.correctiveActions > 0 && (
            <span className="flex items-center gap-1">
              <Target className="size-3" />
              {alert._count.correctiveActions} acción(es)
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Vista 2: Reglas
// ────────────────────────────────────────────────────────────────────

function RulesView({ setup, cycleId }: { setup: SetupData; cycleId: string }) {
  const utils = trpc.useUtils();
  const toggleMut = trpc.alerts.toggleRule.useMutation({
    onSuccess: () => utils.alerts.setup.invalidate({ cycleId }),
    onError: (e) => toast.error(e.message),
  });
  const upsertMut = trpc.alerts.upsertRule.useMutation({
    onSuccess: () => {
      utils.alerts.setup.invalidate({ cycleId });
      toast.success("Regla actualizada");
    },
    onError: (e) => toast.error(e.message),
  });
  const resetMut = trpc.alerts.resetDefaultRules.useMutation({
    onSuccess: () => {
      utils.alerts.setup.invalidate({ cycleId });
      toast.success("Reglas por defecto restablecidas");
    },
    onError: (e) => toast.error(e.message),
  });

  const totalActive = setup.rules.filter((r) => r.active).length;
  const totalRules = setup.rules.length;

  return (
    <div className="space-y-4">
      <Card className="border-primary/25 bg-primary/10/40">
        <CardContent className="py-3 text-left text-sm text-primary">
          Las reglas vienen pre-configuradas con buenas prácticas. Ajusta umbrales o desactiva
          las que no necesites.
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
          <div>
            <strong>{totalActive}</strong> de {totalRules} reglas activas
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (confirm("Esto recreará las 5 reglas por defecto. ¿Continuar?")) {
                resetMut.mutate({ cycleId });
              }
            }}
          >
            Restablecer reglas por defecto
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {ALERT_TYPES.filter((t) => t.key !== "personalizada").map((typeDef) => {
          const rule = setup.rules.find((r) => r.type === typeDef.key && r.isDefault);
          return (
            <RuleCard
              key={typeDef.key}
              typeDef={typeDef}
              rule={rule}
              onToggle={(active) => rule && toggleMut.mutate({ id: rule.id, active })}
              onSave={(config) => {
                if (!rule) return;
                upsertMut.mutate({
                  id: rule.id,
                  cycleId,
                  type: typeDef.key,
                  name: rule.name,
                  active: rule.active,
                  configuration: config,
                  defaultPriority: rule.defaultPriority as Priority,
                  channels: JSON.parse(rule.channels) as string[],
                  notifyTo: JSON.parse(rule.notifyTo) as string[],
                });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function RuleCard({
  typeDef,
  rule,
  onToggle,
  onSave,
}: {
  typeDef: (typeof ALERT_TYPES)[number];
  rule: AlertRule | undefined;
  onToggle: (active: boolean) => void;
  onSave: (config: Record<string, unknown>) => void;
}) {
  const Icon = TYPE_ICONS[typeDef.key] ?? AlertCircle;
  const config = useMemo(
    () => (rule ? (JSON.parse(rule.configuration) as Record<string, unknown>) : {}),
    [rule],
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>(config);

  return (
    <Card style={{ borderLeftColor: typeDef.color, borderLeftWidth: 4 }}>
      <CardContent className="space-y-3 py-3 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div
              className="flex size-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: typeDef.bg, color: typeDef.color }}
            >
              <Icon className="size-5" />
            </div>
            <div>
              <h4 className="font-semibold">{typeDef.label}</h4>
              <p className="text-xs text-muted-foreground">{typeDef.description}</p>
              {rule && (
                <div className="mt-1 text-[10px] text-muted-foreground">
                  Disparada {rule.triggerCount} veces
                  {rule.lastTriggeredAt && (
                    <> · última vez: {new Date(rule.lastTriggeredAt).toLocaleDateString("es-PE")}</>
                  )}
                </div>
              )}
            </div>
          </div>
          {rule && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                {rule.active ? "Activa" : "Inactiva"}
              </span>
              <button
                type="button"
                onClick={() => onToggle(!rule.active)}
                className={cn(
                  "relative inline-block h-5 w-9 rounded-full transition",
                  rule.active ? "bg-transparent0" : "bg-muted-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-4 rounded-full bg-white transition",
                    rule.active ? "left-[18px]" : "left-0.5",
                  )}
                />
              </button>
            </div>
          )}
        </div>

        {rule && rule.active && (
          <>
            {!editing ? (
              <div className="flex items-center justify-between rounded bg-muted/30 px-3 py-2 text-xs">
                <div className="space-x-2">
                  {typeDef.key === "tendencia_negativa" && (
                    <span>
                      <strong>Períodos consecutivos:</strong> {String(config.consecutivePeriods ?? 3)}
                    </span>
                  )}
                  {typeDef.key === "datos_atrasados" && (
                    <span>
                      <strong>Múltiplo de frecuencia:</strong> {String(config.delayMultiplier ?? 1.5)}x
                    </span>
                  )}
                  {typeDef.key === "olp_en_riesgo" && (
                    <span>
                      <strong>Umbral de riesgo:</strong> {String(config.riskThresholdPct ?? 10)}%
                    </span>
                  )}
                  {typeDef.key === "hito_incumplido" && (
                    <span>
                      <strong>Tolerancia:</strong> {String(config.tolerancePct ?? 0)}%
                    </span>
                  )}
                  {typeDef.key === "semaforo_critico" && (
                    <span>Aplica a todos los KPIs sin configuración adicional</span>
                  )}
                </div>
                {typeDef.key !== "semaforo_critico" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDraft(config);
                      setEditing(true);
                    }}
                  >
                    Editar
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2 rounded border bg-muted/10 p-3">
                {typeDef.key === "tendencia_negativa" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Períodos consecutivos para disparar</Label>
                    <Input
                      type="number"
                      min={2}
                      max={12}
                      value={(draft.consecutivePeriods as number) ?? 3}
                      onChange={(e) =>
                        setDraft({ ...draft, consecutivePeriods: Number(e.target.value) })
                      }
                    />
                  </div>
                )}
                {typeDef.key === "datos_atrasados" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Múltiplo de frecuencia</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min={1}
                        max={5}
                        value={(draft.delayMultiplier as number) ?? 1.5}
                        onChange={(e) =>
                          setDraft({ ...draft, delayMultiplier: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Escalar a alta después de días</Label>
                      <Input
                        type="number"
                        min={1}
                        value={(draft.escalateAfterDays as number) ?? 21}
                        onChange={(e) =>
                          setDraft({ ...draft, escalateAfterDays: Number(e.target.value) })
                        }
                      />
                    </div>
                  </>
                )}
                {typeDef.key === "olp_en_riesgo" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Umbral de riesgo (% desviación)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={(draft.riskThresholdPct as number) ?? 10}
                      onChange={(e) =>
                        setDraft({ ...draft, riskThresholdPct: Number(e.target.value) })
                      }
                    />
                  </div>
                )}
                {typeDef.key === "hito_incumplido" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Tolerancia (% desviación aceptable)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={(draft.tolerancePct as number) ?? 0}
                      onChange={(e) =>
                        setDraft({ ...draft, tolerancePct: Number(e.target.value) })
                      }
                    />
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => {
                      onSave(draft);
                      setEditing(false);
                    }}
                  >
                    Guardar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Vista 3: Histórico
// ────────────────────────────────────────────────────────────────────

function HistoryView({ cycleId }: { cycleId: string }) {
  const utils = trpc.useUtils();
  const statsQuery = trpc.alerts.stats.useQuery({ cycleId });
  const historyQuery = trpc.alerts.listHistory.useQuery({
    cycleId,
    statuses: ["resuelta", "ignorada", "reactivada"],
    limit: 100,
  });

  async function handleExport() {
    const data = await utils.alerts.getExportData.fetch({ cycleId });
    const ctx: AlertsExportContext = {
      cycle: data.cycle,
      organization: data.organization,
      alerts: data.alerts as unknown as ExportAlert[],
    };
    if (ctx.alerts.length === 0) {
      toast.error("Sin alertas para exportar");
      return;
    }
    exportAlertsExcel(ctx);
    toast.success("Excel generado");
  }

  if (historyQuery.isLoading || !statsQuery.data) {
    return <div className="animate-pulse text-muted-foreground">Cargando histórico...</div>;
  }

  const stats = statsQuery.data;
  const history = historyQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Total" value={Object.values(stats.byStatus).reduce((s, v) => s + v, 0)} />
        <MetricCard
          label="Resueltas"
          value={stats.byStatus["resuelta"] ?? 0}
          color="#4ade80"
        />
        <MetricCard
          label="Ignoradas"
          value={stats.byStatus["ignorada"] ?? 0}
          color="#a8a29e"
        />
        <MetricCard label="Reactivadas" value={stats.reactivatedCount} color="#c084fc" />
        <MetricCard
          label="Tiempo prom. resol."
          value={stats.avgResolutionDays}
          color="#38bdf8"
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 py-3">
          <CardTitle className="text-left text-base">Alertas históricas</CardTitle>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <FileDown className="mr-1 size-3.5" /> Exportar Excel
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-3 py-2 font-medium">Generada</th>
                <th className="px-2 py-2 font-medium">Tipo</th>
                <th className="px-2 py-2 font-medium">Título</th>
                <th className="px-2 py-2 font-medium">Estado</th>
                <th className="px-2 py-2 font-medium">Días resol.</th>
                <th className="px-2 py-2 font-medium">Asignada a</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    Sin alertas en el histórico.
                  </td>
                </tr>
              ) : (
                history.map((a) => {
                  const def = getAlertTypeDef(a.type);
                  const stat = STATUS_COLORS[a.status as AlertStatus];
                  const days = a.resolvedAt
                    ? Math.round(
                        (new Date(a.resolvedAt).getTime() - new Date(a.generatedAt).getTime()) /
                          (1000 * 60 * 60 * 24),
                      )
                    : null;
                  return (
                    <tr key={a.id} className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(a.generatedAt).toLocaleDateString("es-PE")}
                      </td>
                      <td className="px-2 py-2">
                        <span style={{ color: def?.color }}>{def?.label}</span>
                      </td>
                      <td className="px-2 py-2 font-medium">{a.title}</td>
                      <td className="px-2 py-2">
                        <Badge
                          className="border-0 text-[10px]"
                          style={{ backgroundColor: stat.bg, color: stat.color }}
                        >
                          {stat.label}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-center">{days ?? "—"}</td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {a.assignee?.name ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {Object.keys(stats.byType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-left text-base">Análisis por tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.byType).map(([type, count]) => {
              const def = getAlertTypeDef(type);
              return (
                <div key={type} className="flex items-center justify-between text-xs">
                  <span style={{ color: def?.color }}>{def?.label ?? type}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Detalle de alerta
// ────────────────────────────────────────────────────────────────────

function AlertDetail({
  alertId,
  cycleId,
  onClose,
}: {
  alertId: string;
  cycleId: string;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const detailQuery = trpc.alerts.alertDetail.useQuery({ id: alertId });
  const [comment, setComment] = useState("");
  const [resolveReason, setResolveReason] = useState("");
  const [showResolve, setShowResolve] = useState(false);
  const [caDesc, setCaDesc] = useState("");
  const [caResponsible, setCaResponsible] = useState("");

  const setStatusMut = trpc.alerts.setStatus.useMutation({
    onSuccess: () => {
      utils.alerts.setup.invalidate({ cycleId });
      utils.alerts.alertDetail.invalidate({ id: alertId });
      toast.success("Estado actualizado");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });
  const setPriorityMut = trpc.alerts.setPriority.useMutation({
    onSuccess: () => {
      utils.alerts.setup.invalidate({ cycleId });
      utils.alerts.alertDetail.invalidate({ id: alertId });
    },
    onError: (e) => toast.error(e.message),
  });
  const postComment = trpc.alerts.postComment.useMutation({
    onSuccess: () => {
      utils.alerts.alertDetail.invalidate({ id: alertId });
      setComment("");
      toast.success("Comentario agregado");
    },
    onError: (e) => toast.error(e.message),
  });
  const createCa = trpc.alerts.createCorrectiveAction.useMutation({
    onSuccess: () => {
      utils.alerts.alertDetail.invalidate({ id: alertId });
      setCaDesc("");
      setCaResponsible("");
      toast.success("Acción correctiva creada");
    },
    onError: (e) => toast.error(e.message),
  });

  if (detailQuery.isLoading || !detailQuery.data) {
    return <div className="animate-pulse text-muted-foreground">Cargando detalle...</div>;
  }
  const { alert, actions, comments, correctiveActions } = detailQuery.data;
  const def = getAlertTypeDef(alert.type);
  const prio = PRIORITY_COLORS[alert.priority as Priority];
  const Icon = TYPE_ICONS[alert.type] ?? AlertCircle;

  return (
    <div className="space-y-4 text-left">
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 size-6" style={{ color: def?.color }} />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              className="border-0 text-[10px]"
              style={{ backgroundColor: def?.color, color: "white" }}
            >
              {def?.label}
            </Badge>
            <Badge
              className="border-0 text-[10px]"
              style={{ backgroundColor: prio.color, color: "white" }}
            >
              {prio.label}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px]"
              style={{
                backgroundColor: STATUS_COLORS[alert.status as AlertStatus].bg,
                color: STATUS_COLORS[alert.status as AlertStatus].color,
              }}
            >
              {STATUS_COLORS[alert.status as AlertStatus].label}
            </Badge>
          </div>
          <h3 className="mt-1 text-base font-semibold">{alert.title}</h3>
          <p className="text-sm text-muted-foreground">{alert.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-3">
        {alert.status !== "resuelta" && alert.status !== "ignorada" && (
          <>
            <Button
              size="sm"
              onClick={() => {
                setShowResolve(true);
                setResolveReason("");
              }}
            >
              <CheckCircle2 className="mr-1 size-3.5" /> Resolver
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const reason = prompt("Razón para ignorar:");
                if (reason) {
                  setStatusMut.mutate({ id: alert.id, status: "ignorada", reason });
                }
              }}
            >
              <X className="mr-1 size-3.5" /> Ignorar
            </Button>
            {alert.priority !== "alta" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPriorityMut.mutate({ id: alert.id, priority: "alta" })}
              >
                <Sparkles className="mr-1 size-3.5" /> Escalar a alta
              </Button>
            )}
          </>
        )}
      </div>

      {showResolve && (
        <div className="space-y-2 rounded border bg-transparent p-3">
          <Label className="text-xs">¿Cómo se resolvió?</Label>
          <Textarea
            value={resolveReason}
            onChange={(e) => setResolveReason(e.target.value)}
            placeholder="Describe brevemente la acción tomada..."
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!resolveReason.trim()}
              onClick={() =>
                setStatusMut.mutate({
                  id: alert.id,
                  status: "resuelta",
                  reason: resolveReason.trim(),
                })
              }
            >
              Confirmar resolución
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowResolve(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Acciones correctivas */}
      <div className="space-y-2 border-t pt-3">
        <h4 className="text-sm font-semibold">Acciones correctivas</h4>
        {correctiveActions.length > 0 && (
          <div className="space-y-1.5">
            {correctiveActions.map((ca) => (
              <div
                key={ca.id}
                className="rounded border bg-muted/10 p-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <strong>{ca.description}</strong>
                  <Badge variant="outline" className="text-[10px]">
                    {ca.status}
                  </Badge>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Responsable: {ca.responsibleName}
                  {ca.dueDate && (
                    <> · vence {new Date(ca.dueDate).toLocaleDateString("es-PE")}</>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
          <Input
            value={caDesc}
            onChange={(e) => setCaDesc(e.target.value)}
            placeholder="Describir acción correctiva..."
            className="h-8 text-xs"
          />
          <Input
            value={caResponsible}
            onChange={(e) => setCaResponsible(e.target.value)}
            placeholder="Responsable"
            className="h-8 text-xs"
          />
          <Button
            size="sm"
            disabled={!caDesc.trim() || !caResponsible.trim()}
            onClick={() =>
              createCa.mutate({
                alertId: alert.id,
                description: caDesc.trim(),
                responsibleName: caResponsible.trim(),
              })
            }
          >
            Crear
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2 border-t pt-3">
        <h4 className="text-sm font-semibold">Timeline</h4>
        <div className="space-y-1.5">
          {actions.map((a) => (
            <div key={a.id} className="flex items-start gap-2 text-xs">
              <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
              <div className="flex-1">
                <strong>{a.actionType.replace(/_/g, " ")}</strong>
                {a.user && <span className="text-muted-foreground"> · {a.user.name}</span>}
                <div className="text-[10px] text-muted-foreground">
                  {new Date(a.createdAt).toLocaleString("es-PE")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comentarios */}
      <div className="space-y-2 border-t pt-3">
        <h4 className="text-sm font-semibold">
          Comentarios ({comments.length})
        </h4>
        <div className="max-h-48 space-y-1.5 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Sin comentarios aún.</p>
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
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentar..."
            className="h-8 text-xs"
          />
          <Button
            size="sm"
            disabled={!comment.trim() || postComment.isPending}
            onClick={() => postComment.mutate({ alertId: alert.id, text: comment })}
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
