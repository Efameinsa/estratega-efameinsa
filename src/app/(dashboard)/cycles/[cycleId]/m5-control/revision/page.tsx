"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
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
  Calendar,
  CalendarRange,
  CalendarClock,
  CalendarHeart,
  AlertCircle,
  Play,
  Square,
  CheckCircle2,
  Pencil,
  Trash2,
  Plus,
  ChevronRight,
  ArrowLeft,
  FileText,
  FileDown,
  History,
  Inbox,
  Send,
  Sparkles,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import {
  REVIEW_TYPES,
  STATUS_COLORS,
  PRIORITY_COLORS,
  ACTION_STATUS_COLORS,
  getReviewTypeDef,
  defaultTitle,
  periodLabel,
  type ReviewType,
  type ReviewStatus,
} from "@/lib/review-catalog";
import {
  exportReviewPdf,
  exportReviewDocx,
  type ExportReviewData,
} from "@/lib/review-export";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type SetupData = RouterOutputs["reviews"]["setup"];
type UpcomingReview = SetupData["upcoming"][number];

type View = "calendario" | "sala" | "historico";

const ICONS: Record<string, LucideIcon> = {
  Calendar,
  CalendarRange,
  CalendarClock,
  CalendarHeart,
  AlertCircle,
};

export default function RevisionPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const utils = trpc.useUtils();
  const [view, setView] = useState<View>("calendario");
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showCalendarConfig, setShowCalendarConfig] = useState(false);

  const setupQuery = trpc.reviews.setup.useQuery({ cycleId });
  const setup = setupQuery.data;

  if (setupQuery.isLoading) {
    return <div className="animate-pulse text-muted-foreground">Cargando revisiones...</div>;
  }
  if (!setup) {
    return <div className="text-muted-foreground">No se pudo cargar el ciclo.</div>;
  }

  if (activeReviewId) {
    return (
      <ReviewRoom
        reviewId={activeReviewId}
        cycleId={cycleId}
        onBack={() => setActiveReviewId(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader />
      <ViewSwitcher view={view} setView={setView} upcomingCount={setup.upcoming.length} />

      {view === "calendario" && (
        <CalendarView
          setup={setup}
          onOpenReview={(id) => setActiveReviewId(id)}
          onSchedule={() => setShowSchedule(true)}
          onConfig={() => setShowCalendarConfig(true)}
        />
      )}

      {view === "sala" && (
        <RoomListView setup={setup} onOpenReview={(id) => setActiveReviewId(id)} />
      )}

      {view === "historico" && (
        <HistoryView cycleId={cycleId} onOpenReview={(id) => setActiveReviewId(id)} />
      )}

      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Programar revisión</DialogTitle>
          </DialogHeader>
          <ScheduleForm
            cycleId={cycleId}
            onCreated={(id) => {
              setShowSchedule(false);
              utils.reviews.setup.invalidate({ cycleId });
              toast.success("Revisión programada");
              setActiveReviewId(id);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showCalendarConfig} onOpenChange={setShowCalendarConfig}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Configurar calendario anual</DialogTitle>
          </DialogHeader>
          <CalendarConfigForm cycleId={cycleId} setup={setup} onClose={() => setShowCalendarConfig(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="space-y-1 text-left">
      <h2 className="text-lg font-semibold">Revisión Estratégica</h2>
      <p className="text-sm text-muted-foreground">
        Calendario formal, agenda auto-generada y captura de decisiones del directorio.
        Es el motor de la continuidad estratégica.
      </p>
    </div>
  );
}

function ViewSwitcher({
  view,
  setView,
  upcomingCount,
}: {
  view: View;
  setView: (v: View) => void;
  upcomingCount: number;
}) {
  const views: { id: View; label: string; icon: LucideIcon; badge?: number }[] = [
    { id: "calendario", label: "Calendario", icon: Calendar, badge: upcomingCount },
    { id: "sala", label: "Sala de revisión", icon: Inbox },
    { id: "historico", label: "Histórico", icon: History },
  ];
  return (
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
            {v.badge != null && v.badge > 0 && (
              <Badge className="bg-primary text-[10px]">{v.badge}</Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Vista 1: Calendario
// ────────────────────────────────────────────────────────────────────

function CalendarView({
  setup,
  onOpenReview,
  onSchedule,
  onConfig,
}: {
  setup: SetupData;
  onOpenReview: (id: string) => void;
  onSchedule: () => void;
  onConfig: () => void;
}) {
  const today = new Date();
  const upcoming = setup.upcoming;
  const nextReview = upcoming[0];
  const completed = setup.completed;
  const totalPlanned = upcoming.length + completed;
  const compliancePct = totalPlanned > 0 ? Math.round((completed / totalPlanned) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card className="border-primary/25 bg-primary/10/40">
        <CardContent className="py-3 text-left text-sm text-primary">
          <strong>Calendario formal de revisiones.</strong> Las revisiones periódicas son
          lo que mantiene vivo el plan. Cada tipo tiene su enfoque y participantes.
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Próxima revisión"
          value={
            nextReview
              ? daysUntil(nextReview.scheduledAt)
              : "—"
          }
        />
        <MetricCard label="Programadas" value={upcoming.length} />
        <MetricCard label="Acciones pendientes" value={setup.pendingActions} />
        <MetricCard label="Cumplimiento" value={`${compliancePct}%`} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onConfig}>
          <Calendar className="mr-1 size-3.5" /> Configurar calendario
        </Button>
        <Button size="sm" onClick={onSchedule}>
          <Plus className="mr-1 size-3.5" /> Programar revisión
        </Button>
      </div>

      {/* Banners */}
      {nextReview && isSameDay(nextReview.scheduledAt, today) && (
        <Card className="border-amber-300 bg-transparent">
          <CardContent className="flex items-center justify-between gap-3 py-3 text-sm text-amber-900">
            <div>
              <strong>Revisión programada para hoy:</strong> {nextReview.title}
            </div>
            <Button size="sm" onClick={() => onOpenReview(nextReview.id)}>
              <Play className="mr-1 size-3.5" /> Iniciar ahora
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Timeline visual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base">Línea de tiempo del año</CardTitle>
        </CardHeader>
        <CardContent>
          <YearTimeline reviews={upcoming} onOpen={onOpenReview} />
        </CardContent>
      </Card>

      {/* Próximas revisiones */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Próximas revisiones</h4>
        {upcoming.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No hay revisiones programadas. Configura el calendario o programa una manualmente.
            </CardContent>
          </Card>
        ) : (
          upcoming.slice(0, 6).map((r) => (
            <UpcomingReviewCard key={r.id} review={r} onOpen={() => onOpenReview(r.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="py-3 text-left">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function daysUntil(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = d.getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return "vencida";
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  if (days < 14) return `en ${days} días`;
  if (days < 60) return `en ${Math.ceil(days / 7)} sem.`;
  return new Date(d).toLocaleDateString("es-PE");
}

function isSameDay(a: Date | string, b: Date): boolean {
  const da = typeof a === "string" ? new Date(a) : a;
  return (
    da.getFullYear() === b.getFullYear() &&
    da.getMonth() === b.getMonth() &&
    da.getDate() === b.getDate()
  );
}

function YearTimeline({
  reviews,
  onOpen,
}: {
  reviews: UpcomingReview[];
  onOpen: (id: string) => void;
}) {
  const year = new Date().getFullYear();
  const months = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-1 text-center text-[10px] text-muted-foreground">
        {months.map((m, i) => (
          <div key={i}>{m}</div>
        ))}
      </div>
      <div className="grid grid-cols-12 gap-1">
        {months.map((_, monthIdx) => {
          const inMonth = reviews.filter((r) => {
            const d = new Date(r.scheduledAt);
            return d.getFullYear() === year && d.getMonth() === monthIdx;
          });
          return (
            <div
              key={monthIdx}
              className="flex min-h-[60px] flex-col gap-0.5 rounded border p-1"
            >
              {inMonth.map((r) => {
                const def = getReviewTypeDef(r.type);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onOpen(r.id)}
                    className="truncate rounded px-1 py-0.5 text-left text-[9px] font-medium text-white"
                    style={{ backgroundColor: def?.color }}
                    title={r.title}
                  >
                    {def?.shortLabel}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingReviewCard({
  review,
  onOpen,
}: {
  review: UpcomingReview;
  onOpen: () => void;
}) {
  const def = getReviewTypeDef(review.type);
  const stat = STATUS_COLORS[review.status as ReviewStatus];
  const Icon = ICONS[def?.icon ?? "Calendar"] ?? Calendar;
  const today = new Date();
  const isToday = isSameDay(review.scheduledAt, today);
  return (
    <Card style={{ borderLeftColor: def?.color, borderLeftWidth: 4 }}>
      <CardContent className="space-y-2 py-3 text-left">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Icon className="mt-0.5 size-5" style={{ color: def?.color }} />
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  className="border-0 text-[10px]"
                  style={{ backgroundColor: def?.color, color: "white" }}
                >
                  {def?.shortLabel}
                </Badge>
                <Badge
                  className="border-0 text-[10px]"
                  style={{ backgroundColor: stat.bg, color: stat.color }}
                >
                  {stat.label}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {daysUntil(review.scheduledAt)}
                </span>
              </div>
              <h4 className="text-sm font-semibold">{review.title}</h4>
              <p className="text-xs text-muted-foreground">
                {new Date(review.scheduledAt).toLocaleString("es-PE")} ·{" "}
                {review.location ?? "Por definir"}
              </p>
              <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                <span>Presidente: {review.president?.name ?? "—"}</span>
                <span>Secretario: {review.secretary?.name ?? "—"}</span>
                <span>{review.attendees.length} asistentes invitados</span>
                <span>{review._count.agendaItems} items de agenda</span>
              </div>
            </div>
          </div>
          <Button size="sm" onClick={onOpen} variant={isToday ? "default" : "outline"}>
            {review.status === "en_curso" ? (
              <>
                <Play className="mr-1 size-3.5" /> Continuar
              </>
            ) : isToday ? (
              <>
                <Play className="mr-1 size-3.5" /> Iniciar
              </>
            ) : (
              <>
                Ver agenda <ChevronRight className="ml-1 size-3" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RoomListView({
  setup,
  onOpenReview,
}: {
  setup: SetupData;
  onOpenReview: (id: string) => void;
}) {
  const inProgress = setup.upcoming.filter((r) => r.status === "en_curso");
  const programmed = setup.upcoming.filter((r) => r.status === "programada");
  return (
    <div className="space-y-4">
      {inProgress.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">En curso</h4>
          {inProgress.map((r) => (
            <UpcomingReviewCard key={r.id} review={r} onOpen={() => onOpenReview(r.id)} />
          ))}
        </div>
      )}
      <div>
        <h4 className="mb-2 text-sm font-semibold">Programadas</h4>
        {programmed.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Sin revisiones programadas. Ve al calendario para crear una.
            </CardContent>
          </Card>
        ) : (
          programmed.map((r) => (
            <UpcomingReviewCard key={r.id} review={r} onOpen={() => onOpenReview(r.id)} />
          ))
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Schedule form
// ────────────────────────────────────────────────────────────────────

function ScheduleForm({
  cycleId,
  onCreated,
}: {
  cycleId: string;
  onCreated: (id: string) => void;
}) {
  const [type, setType] = useState<ReviewType>("trimestral");
  const [scheduledAt, setScheduledAt] = useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  );
  const [location, setLocation] = useState("Sala de directorio");
  const [extraReason, setExtraReason] = useState("");
  const date = new Date(scheduledAt);
  const title = defaultTitle(type, date);
  const period = periodLabel(type, date);

  const scheduleMut = trpc.reviews.scheduleReview.useMutation({
    onSuccess: (review) => onCreated(review.id),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-3 text-left">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Tipo de revisión</Label>
          <Select value={type} onValueChange={(v) => setType((v ?? "trimestral") as ReviewType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REVIEW_TYPES.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Fecha y hora</Label>
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Título</Label>
        <Input value={title} disabled />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Período</Label>
          <Input value={period} disabled />
        </div>
        <div className="space-y-1">
          <Label>Lugar</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
      </div>
      {type === "extraordinaria" && (
        <div className="space-y-1">
          <Label>Razón extraordinaria</Label>
          <Textarea
            value={extraReason}
            onChange={(e) => setExtraReason(e.target.value)}
            placeholder="Motivo de la convocatoria fuera del calendario regular..."
          />
        </div>
      )}
      <Button
        onClick={() =>
          scheduleMut.mutate({
            cycleId,
            type,
            title,
            period,
            scheduledAt: new Date(scheduledAt),
            location,
            extraordinaryReason: type === "extraordinaria" ? extraReason : null,
            attendeeUserIds: [],
            autoGenerateAgendaNow: true,
          })
        }
        disabled={scheduleMut.isPending}
      >
        Programar y generar agenda
      </Button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Calendar config
// ────────────────────────────────────────────────────────────────────

function CalendarConfigForm({
  cycleId,
  setup,
  onClose,
}: {
  cycleId: string;
  setup: SetupData;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [year, setYear] = useState(new Date().getFullYear());

  const upsertMut = trpc.reviews.upsertCalendarConfig.useMutation({
    onSuccess: () => {
      utils.reviews.setup.invalidate({ cycleId });
      toast.success("Configuración guardada");
    },
    onError: (e) => toast.error(e.message),
  });
  const generateMut = trpc.reviews.generateYear.useMutation({
    onSuccess: (res) => {
      utils.reviews.setup.invalidate({ cycleId });
      toast.success(`${res.created} revisiones creadas para ${year}`);
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 text-left">
      <p className="text-xs text-muted-foreground">
        Configura qué tipos de revisión están activos y sus parámetros default. Luego genera
        el calendario completo del año seleccionado.
      </p>
      {(["mensual", "trimestral", "semestral", "anual"] as const).map((type) => {
        const def = getReviewTypeDef(type);
        const cfg = setup.calendarConfig.find((c) => c.type === type);
        return (
          <Card key={type} style={{ borderLeftColor: def?.color, borderLeftWidth: 4 }}>
            <CardContent className="space-y-2 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <strong className="text-sm" style={{ color: def?.color }}>
                    {def?.label}
                  </strong>
                  <div className="text-[10px] text-muted-foreground">
                    {def?.description}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    upsertMut.mutate({
                      cycleId,
                      type,
                      active: !cfg?.active,
                      dayOfPeriod: cfg?.dayOfPeriod ?? 15,
                      defaultHour: cfg?.defaultHour ?? "10:00",
                      defaultDurationMin: cfg?.defaultDurationMin ?? 120,
                      defaultAttendees: cfg ? (JSON.parse(cfg.defaultAttendees) as string[]) : [],
                      defaultPresidentId: cfg?.defaultPresidentId,
                      defaultSecretaryId: cfg?.defaultSecretaryId,
                    })
                  }
                  className={cn(
                    "relative inline-block h-5 w-9 rounded-full transition",
                    cfg?.active ? "bg-transparent0" : "bg-muted-foreground/30",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 size-4 rounded-full bg-white transition",
                      cfg?.active ? "left-[18px]" : "left-0.5",
                    )}
                  />
                </button>
              </div>
              {cfg?.active && (
                <div className="grid gap-2 text-xs sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Día del período</Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      className="h-7"
                      defaultValue={cfg.dayOfPeriod ?? 15}
                      onBlur={(e) =>
                        upsertMut.mutate({
                          cycleId,
                          type,
                          active: cfg.active,
                          dayOfPeriod: Number(e.target.value),
                          defaultHour: cfg.defaultHour ?? "10:00",
                          defaultDurationMin: cfg.defaultDurationMin,
                          defaultAttendees: JSON.parse(cfg.defaultAttendees) as string[],
                          defaultPresidentId: cfg.defaultPresidentId,
                          defaultSecretaryId: cfg.defaultSecretaryId,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Hora</Label>
                    <Input
                      type="time"
                      className="h-7"
                      defaultValue={cfg.defaultHour ?? "10:00"}
                      onBlur={(e) =>
                        upsertMut.mutate({
                          cycleId,
                          type,
                          active: cfg.active,
                          dayOfPeriod: cfg.dayOfPeriod ?? 15,
                          defaultHour: e.target.value,
                          defaultDurationMin: cfg.defaultDurationMin,
                          defaultAttendees: JSON.parse(cfg.defaultAttendees) as string[],
                          defaultPresidentId: cfg.defaultPresidentId,
                          defaultSecretaryId: cfg.defaultSecretaryId,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Duración (min)</Label>
                    <Input
                      type="number"
                      className="h-7"
                      defaultValue={cfg.defaultDurationMin}
                      onBlur={(e) =>
                        upsertMut.mutate({
                          cycleId,
                          type,
                          active: cfg.active,
                          dayOfPeriod: cfg.dayOfPeriod ?? 15,
                          defaultHour: cfg.defaultHour ?? "10:00",
                          defaultDurationMin: Number(e.target.value),
                          defaultAttendees: JSON.parse(cfg.defaultAttendees) as string[],
                          defaultPresidentId: cfg.defaultPresidentId,
                          defaultSecretaryId: cfg.defaultSecretaryId,
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <div className="flex items-end gap-2 border-t pt-3">
        <div className="space-y-1">
          <Label className="text-xs">Generar revisiones para el año</Label>
          <Input
            type="number"
            min={2024}
            max={2040}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
        <Button
          onClick={() => generateMut.mutate({ cycleId, year })}
          disabled={generateMut.isPending}
        >
          <Sparkles className="mr-1 size-3.5" /> Generar calendario
        </Button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Vista 3: Histórico
// ────────────────────────────────────────────────────────────────────

function HistoryView({
  cycleId,
  onOpenReview,
}: {
  cycleId: string;
  onOpenReview: (id: string) => void;
}) {
  const listQuery = trpc.reviews.list.useQuery({
    cycleId,
    statuses: ["completada", "cancelada", "reprogramada"],
    limit: 100,
  });
  const statsQuery = trpc.reviews.stats.useQuery({ cycleId });

  if (listQuery.isLoading || !statsQuery.data) {
    return <div className="animate-pulse text-muted-foreground">Cargando histórico...</div>;
  }
  const reviews = listQuery.data ?? [];
  const stats = statsQuery.data;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Realizadas" value={stats.byStatus["completada"] ?? 0} />
        <MetricCard
          label="Acciones generadas"
          value={stats.totalActions}
        />
        <MetricCard
          label="Acciones cerradas"
          value={`${stats.completedActions}/${stats.totalActions}`}
        />
        <MetricCard label="Duración prom." value={`${stats.avgDurationMinutes} min`} />
      </div>

      <div className="space-y-2">
        {reviews.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Sin revisiones en el histórico aún.
            </CardContent>
          </Card>
        ) : (
          reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3 text-left">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className="border-0 text-[10px]"
                      style={{
                        backgroundColor: getReviewTypeDef(r.type)?.color,
                        color: "white",
                      }}
                    >
                      {getReviewTypeDef(r.type)?.shortLabel}
                    </Badge>
                    <Badge
                      className="border-0 text-[10px]"
                      style={{
                        backgroundColor: STATUS_COLORS[r.status as ReviewStatus].bg,
                        color: STATUS_COLORS[r.status as ReviewStatus].color,
                      }}
                    >
                      {STATUS_COLORS[r.status as ReviewStatus].label}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-semibold">{r.title}</h4>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(r.scheduledAt).toLocaleDateString("es-PE")} ·{" "}
                    {r.durationMinutes ?? "—"} min · {r._count.decisions} decisiones ·{" "}
                    {r._count.correctiveActions} acciones · {r._count.attendees} asistentes
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onOpenReview(r.id)}>
                  Ver acta <ChevronRight className="ml-1 size-3" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Sala de revisión
// ────────────────────────────────────────────────────────────────────

function ReviewRoom({
  reviewId,
  cycleId,
  onBack,
}: {
  reviewId: string;
  cycleId: string;
  onBack: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: session } = useSession();
  const detailQuery = trpc.reviews.detail.useQuery({ id: reviewId });
  const [showSignModal, setShowSignModal] = useState<"president" | "secretary" | null>(null);
  const [executiveSummary, setExecutiveSummary] = useState("");

  const openMut = trpc.reviews.openSession.useMutation({
    onSuccess: () => utils.reviews.detail.invalidate({ id: reviewId }),
    onError: (e) => toast.error(e.message),
  });
  const closeMut = trpc.reviews.closeSession.useMutation({
    onSuccess: () => {
      utils.reviews.detail.invalidate({ id: reviewId });
      utils.reviews.setup.invalidate({ cycleId });
      toast.success("Revisión cerrada");
    },
    onError: (e) => toast.error(e.message),
  });
  const regenAgenda = trpc.reviews.regenerateAgenda.useMutation({
    onSuccess: () => {
      utils.reviews.detail.invalidate({ id: reviewId });
      toast.success("Agenda regenerada");
    },
    onError: (e) => toast.error(e.message),
  });
  const toggleItem = trpc.reviews.toggleAgendaItem.useMutation({
    onMutate: async (vars) => {
      await utils.reviews.detail.cancel({ id: reviewId });
      const prev = utils.reviews.detail.getData({ id: reviewId });
      utils.reviews.detail.setData({ id: reviewId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          agendaItems: old.agendaItems.map((it) =>
            it.id === vars.id ? { ...it, covered: vars.covered } : it,
          ),
        };
      });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) utils.reviews.detail.setData({ id: reviewId }, ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => utils.reviews.detail.invalidate({ id: reviewId }),
  });
  const addDecisionMut = trpc.reviews.addDecision.useMutation({
    onSuccess: () => utils.reviews.detail.invalidate({ id: reviewId }),
    onError: (e) => toast.error(e.message),
  });
  const addActionMut = trpc.reviews.addCorrectiveAction.useMutation({
    onSuccess: () => utils.reviews.detail.invalidate({ id: reviewId }),
    onError: (e) => toast.error(e.message),
  });
  const signMut = trpc.reviews.signAct.useMutation({
    onSuccess: () => {
      utils.reviews.detail.invalidate({ id: reviewId });
      toast.success("Acta firmada");
      setShowSignModal(null);
    },
    onError: (e) => toast.error(e.message),
  });

  if (detailQuery.isLoading || !detailQuery.data) {
    return <div className="animate-pulse text-muted-foreground">Cargando sala...</div>;
  }
  const review = detailQuery.data;
  const def = getReviewTypeDef(review.type);
  const stat = STATUS_COLORS[review.status as ReviewStatus];
  const Icon = ICONS[def?.icon ?? "Calendar"] ?? Calendar;
  const inProgress = review.status === "en_curso";
  const completed = review.status === "completada";

  async function handleExportPdf() {
    const data = await utils.reviews.getExportData.fetch({ id: reviewId });
    exportReviewPdf(data as unknown as ExportReviewData);
    toast.success("PDF generado");
  }

  async function handleExportDocx() {
    const data = await utils.reviews.getExportData.fetch({ id: reviewId });
    await exportReviewDocx(data as unknown as ExportReviewData);
    toast.success("Word generado");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 size-4" /> Volver
        </Button>
        <div className="flex gap-2">
          {review.status === "programada" && (
            <Button size="sm" onClick={() => openMut.mutate({ id: reviewId })}>
              <Play className="mr-1 size-3.5" /> Iniciar revisión
            </Button>
          )}
          {inProgress && (
            <Button
              size="sm"
              onClick={() => {
                if (confirm("¿Cerrar revisión y generar acta?")) {
                  closeMut.mutate({ id: reviewId, executiveSummary });
                }
              }}
            >
              <Square className="mr-1 size-3.5" /> Cerrar revisión
            </Button>
          )}
          {completed && (
            <>
              <Button size="sm" variant="outline" onClick={handleExportPdf}>
                <FileText className="mr-1 size-3.5" /> PDF
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportDocx}>
                <FileDown className="mr-1 size-3.5" /> Word
              </Button>
            </>
          )}
        </div>
      </div>

      <Card style={{ borderLeftColor: def?.color, borderLeftWidth: 6 }}>
        <CardContent className="py-4 text-left">
          <div className="flex items-start gap-3">
            <Icon className="mt-1 size-7" style={{ color: def?.color }} />
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
                  style={{ backgroundColor: stat.bg, color: stat.color }}
                >
                  {stat.label}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(review.scheduledAt).toLocaleString("es-PE")} ·{" "}
                  {review.location ?? "—"}
                </span>
              </div>
              <h3 className="text-lg font-semibold">{review.title}</h3>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Presidente: {review.president?.name ?? "—"}</span>
                <span>Secretario: {review.secretary?.name ?? "—"}</span>
                <span>{review.attendees.length} asistentes</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {review.status === "programada" && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-left text-base">Agenda preparada</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => regenAgenda.mutate({ reviewId })}
            >
              <RefreshCw className="mr-1 size-3.5" /> Regenerar
            </Button>
          </CardHeader>
          <CardContent>
            <AgendaList
              items={review.agendaItems}
              inProgress={false}
              onToggle={() => {}}
            />
          </CardContent>
        </Card>
      )}

      {inProgress && (
        <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-left text-base">Agenda</CardTitle>
            </CardHeader>
            <CardContent>
              <AgendaList
                items={review.agendaItems}
                inProgress
                onToggle={(id, covered) => toggleItem.mutate({ id, covered })}
              />
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-left text-sm">Capturar decisión</CardTitle>
              </CardHeader>
              <CardContent>
                <DecisionForm onAdd={(text) => addDecisionMut.mutate({ reviewId, text })} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-left text-sm">Capturar acción correctiva</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionForm
                  onAdd={(desc, resp, due) =>
                    addActionMut.mutate({
                      reviewId,
                      description: desc,
                      responsibleName: resp,
                      dueDate: due,
                    })
                  }
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-left text-sm">Resumen ejecutivo</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={4}
                  value={executiveSummary}
                  onChange={(e) => setExecutiveSummary(e.target.value)}
                  placeholder="Notas finales para el acta..."
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {review.decisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-left text-base">
              Decisiones tomadas ({review.decisions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-left">
            {review.decisions.map((d) => (
              <div key={d.id} className="rounded border bg-muted/10 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <strong>Decisión {d.number}</strong>
                  <Badge variant="outline" className="text-[10px]">
                    {d.decisionType}
                  </Badge>
                </div>
                <p className="mt-1">{d.text}</p>
                {d.justification && (
                  <p className="mt-1 text-xs text-muted-foreground italic">{d.justification}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {review.correctiveActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-left text-base">
              Acciones correctivas ({review.correctiveActions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-left">
            {review.correctiveActions.map((a) => {
              const ps = ACTION_STATUS_COLORS[a.status as keyof typeof ACTION_STATUS_COLORS];
              const pp = PRIORITY_COLORS[a.priority as keyof typeof PRIORITY_COLORS];
              return (
                <div key={a.id} className="rounded border bg-muted/10 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <strong>Acción {a.number}</strong>
                    <div className="flex gap-1">
                      <Badge
                        className="border-0 text-[10px]"
                        style={{ backgroundColor: pp?.bg, color: pp?.color }}
                      >
                        {pp?.label}
                      </Badge>
                      <Badge
                        className="border-0 text-[10px]"
                        style={{ backgroundColor: ps?.bg, color: ps?.color }}
                      >
                        {ps?.label}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-1">{a.description}</p>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    Responsable: {a.responsible?.name ?? a.responsibleName ?? "—"}
                    {a.dueDate && (
                      <> · vence {new Date(a.dueDate).toLocaleDateString("es-PE")}</>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {completed && (
        <Card
          className={cn(
            "border-2",
            review.actSigned ? "border-emerald-300 bg-transparent" : "border-amber-300 bg-transparent",
          )}
        >
          <CardHeader>
            <CardTitle className="text-left text-base">
              {review.actSigned ? "Acta firmada" : "Firmar acta"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-left text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <strong>Presidente</strong>
                {review.presidentSignedAt && review.presidentSignedName ? (
                  <div className="text-xs">
                    <CheckCircle2 className="mr-1 inline size-3.5 text-emerald-600" />
                    Firmado por {review.presidentSignedName}
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(review.presidentSignedAt).toLocaleString("es-PE")}
                    </div>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => setShowSignModal("president")}>
                    Firmar como presidente
                  </Button>
                )}
              </div>
              <div>
                <strong>Secretario</strong>
                {review.secretarySignedAt && review.secretarySignedName ? (
                  <div className="text-xs">
                    <CheckCircle2 className="mr-1 inline size-3.5 text-emerald-600" />
                    Firmado por {review.secretarySignedName}
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(review.secretarySignedAt).toLocaleString("es-PE")}
                    </div>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => setShowSignModal("secretary")}>
                    Firmar como secretario
                  </Button>
                )}
              </div>
            </div>
            {review.actSigned && (
              <p className="text-xs text-emerald-700">
                Acta inmutable. Para modificar se requiere acta complementaria.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!showSignModal} onOpenChange={() => setShowSignModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Firmar como {showSignModal === "president" ? "presidente" : "secretario"}
            </DialogTitle>
          </DialogHeader>
          <SignForm
            defaultName={(session?.user as { name?: string })?.name ?? ""}
            onConfirm={(name) =>
              signMut.mutate({
                id: reviewId,
                role: showSignModal!,
                signerName: name,
              })
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AgendaList({
  items,
  inProgress,
  onToggle,
}: {
  items: { id: string; order: number; title: string; description: string | null; covered: boolean; parentItemId: string | null }[];
  inProgress: boolean;
  onToggle: (id: string, covered: boolean) => void;
}) {
  const topLevel = items.filter((i) => !i.parentItemId).sort((a, b) => a.order - b.order);
  return (
    <ol className="space-y-1.5 text-sm">
      {topLevel.map((item) => {
        const children = items
          .filter((c) => c.parentItemId === item.id)
          .sort((a, b) => a.order - b.order);
        return (
          <li key={item.id} className="rounded border bg-muted/10 p-2">
            <div className="flex items-start gap-2">
              {inProgress ? (
                <input
                  type="checkbox"
                  checked={item.covered}
                  onChange={(e) => onToggle(item.id, e.target.checked)}
                  className="mt-1"
                />
              ) : (
                <span className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {item.order + 1}.
                </span>
              )}
              <div className="flex-1">
                <div className={cn("font-medium", item.covered && "line-through text-muted-foreground")}>
                  {item.title}
                </div>
                {item.description && (
                  <div className="text-[10px] text-muted-foreground">{item.description}</div>
                )}
                {children.length > 0 && (
                  <ul className="mt-1 ml-3 space-y-1 text-xs">
                    {children.map((c) => (
                      <li key={c.id} className="flex items-start gap-1">
                        {inProgress ? (
                          <input
                            type="checkbox"
                            checked={c.covered}
                            onChange={(e) => onToggle(c.id, e.target.checked)}
                          />
                        ) : (
                          <span className="text-muted-foreground">▸</span>
                        )}
                        <span className={cn(c.covered && "line-through text-muted-foreground")}>
                          {c.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DecisionForm({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-2">
      <Textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Texto de la decisión..."
      />
      <Button
        size="sm"
        disabled={!text.trim()}
        onClick={() => {
          onAdd(text.trim());
          setText("");
        }}
      >
        <Plus className="mr-1 size-3.5" /> Agregar decisión
      </Button>
    </div>
  );
}

function ActionForm({
  onAdd,
}: {
  onAdd: (description: string, responsible: string, dueDate?: Date) => void;
}) {
  const [desc, setDesc] = useState("");
  const [resp, setResp] = useState("");
  const [due, setDue] = useState("");
  return (
    <div className="space-y-2">
      <Textarea
        rows={2}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Descripción..."
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={resp}
          onChange={(e) => setResp(e.target.value)}
          placeholder="Responsable"
        />
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      </div>
      <Button
        size="sm"
        disabled={!desc.trim() || !resp.trim()}
        onClick={() => {
          onAdd(desc.trim(), resp.trim(), due ? new Date(due) : undefined);
          setDesc("");
          setResp("");
          setDue("");
        }}
      >
        <Plus className="mr-1 size-3.5" /> Agregar acción
      </Button>
    </div>
  );
}

function SignForm({
  defaultName,
  onConfirm,
}: {
  defaultName: string;
  onConfirm: (name: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  return (
    <div className="space-y-3 text-left">
      <div className="space-y-1">
        <Label>Nombre del firmante</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <p className="text-xs text-muted-foreground">
        Al firmar confirmas el contenido del acta. Tras la firma del presidente y secretario,
        el acta queda inmutable.
      </p>
      <Button onClick={() => onConfirm(name)} disabled={!name.trim()}>
        <Send className="mr-1 size-3.5" /> Confirmar firma
      </Button>
    </div>
  );
}
