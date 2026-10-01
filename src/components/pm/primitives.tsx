"use client";

import React, { useState } from "react";
import { format, isToday, isTomorrow, isYesterday, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { Check, CalendarDays, Flag, Search, UserPlus, X, Circle, CircleDashed, CircleDot, CheckCircle2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { avatarColor, initials, PRIORITIES, PRIORITY_MAP, statusColor } from "@/lib/pm";
import type { Status, WsUser } from "./workspace-context";

// ---------------------------------------------------------------- fechas

export function toDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  const x = d instanceof Date ? d : new Date(d);
  return isNaN(x.getTime()) ? null : x;
}

/** Fechas "de calendario": se guardan a mediodía UTC para que no salten de día por la zona horaria. */
export function dayToDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}
export function dateToDay(d: Date | string | null | undefined): string {
  const x = toDate(d);
  if (!x) return "";
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
}
/** Convierte la fecha guardada (mediodía UTC) a una fecha local equivalente para mostrar. */
export function localDay(d: Date | string | null | undefined): Date | null {
  const x = toDate(d);
  if (!x) return null;
  return new Date(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
}

export function friendlyDate(d: Date | string | null | undefined): string {
  const x = localDay(d);
  if (!x) return "";
  if (isToday(x)) return "Hoy";
  if (isTomorrow(x)) return "Mañana";
  if (isYesterday(x)) return "Ayer";
  const sameYear = x.getFullYear() === new Date().getFullYear();
  return format(x, sameYear ? "d MMM" : "d MMM yyyy", { locale: es });
}

export function dueTone(d: Date | string | null | undefined, done: boolean): string {
  const x = localDay(d);
  if (!x || done) return "text-muted-foreground";
  const diff = differenceInCalendarDays(x, new Date());
  if (diff < 0) return "text-red-700";
  if (diff <= 2) return "text-amber-700";
  return "text-muted-foreground";
}

// ---------------------------------------------------------------- avatar

export function UserAvatar({
  user,
  size = 24,
  className,
}: {
  user: { id: string; name: string } | null | undefined;
  size?: number;
  className?: string;
}) {
  if (!user) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground", className)}
        style={{ width: size, height: size }}
        title="Sin asignar"
      >
        <UserPlus style={{ width: size * 0.5, height: size * 0.5 }} />
      </span>
    );
  }
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-background", className)}
      style={{ width: size, height: size, background: avatarColor(user.id), fontSize: Math.max(9, size * 0.4) }}
      title={user.name}
    >
      {initials(user.name)}
    </span>
  );
}

export function AvatarStack({ users, max = 4, size = 24 }: { users: { id: string; name: string }[]; max?: number; size?: number }) {
  const shown = users.slice(0, max);
  return (
    <div className="flex -space-x-1.5">
      {shown.map((u) => (
        <UserAvatar key={u.id} user={u} size={size} />
      ))}
      {users.length > max && (
        <span
          className="inline-flex items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-background"
          style={{ width: size, height: size }}
        >
          +{users.length - max}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- selectores

function PickerList<T>({
  items,
  selected,
  onPick,
  render,
  getKey,
  getText,
  placeholder,
  searchable = true,
}: {
  items: T[];
  selected: (item: T) => boolean;
  onPick: (item: T) => void;
  render: (item: T) => React.ReactNode;
  getKey: (item: T) => string;
  getText: (item: T) => string;
  placeholder?: string;
  searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const list = q ? items.filter((i) => getText(i).toLowerCase().includes(q.toLowerCase())) : items;
  return (
    <div className="flex flex-col gap-1">
      {searchable && (
        <div className="flex items-center gap-2 rounded-md border px-2">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder ?? "Buscar…"}
            className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      )}
      <div className="max-h-64 overflow-y-auto">
        {list.map((item) => (
          <button
            key={getKey(item)}
            type="button"
            onClick={() => onPick(item)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">{render(item)}</span>
            {selected(item) && <Check className="size-4 text-primary" />}
          </button>
        ))}
        {list.length === 0 && <p className="px-2 py-3 text-center text-xs text-muted-foreground">Sin resultados</p>}
      </div>
    </div>
  );
}

export function AssigneePicker({
  users,
  value,
  onChange,
  size = 24,
  showName = false,
  className,
}: {
  users: WsUser[];
  value: string | null;
  onChange: (id: string | null) => void;
  size?: number;
  showName?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = users.find((u) => u.id === value) ?? null;
  const items: (WsUser | null)[] = [null, ...users];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        className={cn("inline-flex items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-accent", className)}
        aria-label="Cambiar responsable"
      >
        <UserAvatar user={current} size={size} />
        {showName && <span className={cn("truncate", !current && "text-muted-foreground")}>{current?.name ?? "Sin asignar"}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start" onClick={(e) => e.stopPropagation()}>
        <PickerList
          items={items}
          getKey={(u) => u?.id ?? "none"}
          getText={(u) => (u ? `${u.name} ${u.email}` : "sin asignar")}
          selected={(u) => (u?.id ?? null) === value}
          placeholder="Buscar persona…"
          onPick={(u) => {
            onChange(u?.id ?? null);
            setOpen(false);
          }}
          render={(u) =>
            u ? (
              <>
                <UserAvatar user={u} size={22} />
                <span className="min-w-0">
                  <span className="block truncate">{u.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{u.area ?? u.email}</span>
                </span>
              </>
            ) : (
              <>
                <UserAvatar user={null} size={22} />
                <span className="text-muted-foreground">Sin asignar</span>
              </>
            )
          }
        />
      </PopoverContent>
    </Popover>
  );
}

export function StatusIcon({ category, color, className }: { category?: string | null; color?: string; className?: string }) {
  const style = { color };
  if (category === "DONE") return <CheckCircle2 className={cn("size-4", className)} style={style} />;
  if (category === "IN_PROGRESS") return <CircleDot className={cn("size-4", className)} style={style} />;
  if (category === "TODO") return <Circle className={cn("size-4", className)} style={style} />;
  return <CircleDashed className={cn("size-4", className)} style={style} />;
}

export function StatusPill({ status, className }: { status: Status | null | undefined; className?: string }) {
  const c = statusColor(status);
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", className)}
      style={{ background: `${c}22`, color: c }}
    >
      <StatusIcon category={status?.category} className="size-3.5" />
      {status?.name ?? "Sin estado"}
    </span>
  );
}

export function StatusPicker({
  statuses,
  value,
  onChange,
  compact = false,
}: {
  statuses: Status[];
  value: string | null;
  onChange: (id: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = statuses.find((s) => s.id === value) ?? null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger onClick={(e) => e.stopPropagation()} className="inline-flex rounded-full" aria-label="Cambiar estado">
        {compact ? <StatusIcon category={current?.category} color={statusColor(current)} /> : <StatusPill status={current} />}
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1.5" align="start" onClick={(e) => e.stopPropagation()}>
        <PickerList
          items={statuses}
          searchable={false}
          getKey={(s) => s.id}
          getText={(s) => s.name}
          selected={(s) => s.id === value}
          onPick={(s) => {
            onChange(s.id);
            setOpen(false);
          }}
          render={(s) => <StatusPill status={s} />}
        />
      </PopoverContent>
    </Popover>
  );
}

export function PriorityFlag({ priority, showLabel = false }: { priority: string; showLabel?: boolean }) {
  const p = PRIORITY_MAP[priority] ?? PRIORITY_MAP.MEDIUM;
  return (
    <span className="inline-flex items-center gap-1 text-xs" style={{ color: p.color }}>
      <Flag className="size-3.5" fill={priority === "CRITICAL" || priority === "HIGH" ? p.color : "none"} />
      {showLabel && <span>{p.label}</span>}
    </span>
  );
}

export function PriorityPicker({
  value,
  onChange,
  showLabel = false,
}: {
  value: string;
  onChange: (v: string) => void;
  showLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center rounded-md px-1 py-0.5 hover:bg-accent"
        aria-label="Cambiar prioridad"
      >
        <PriorityFlag priority={value} showLabel={showLabel} />
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1.5" align="start" onClick={(e) => e.stopPropagation()}>
        <PickerList
          items={[...PRIORITIES]}
          searchable={false}
          getKey={(p) => p.value}
          getText={(p) => p.label}
          selected={(p) => p.value === value}
          onPick={(p) => {
            onChange(p.value);
            setOpen(false);
          }}
          render={(p) => <PriorityFlag priority={p.value} showLabel />}
        />
      </PopoverContent>
    </Popover>
  );
}

export function DateRangePicker({
  start,
  due,
  onChange,
  done = false,
  milestone = false,
  placeholder = "Fechas",
}: {
  start: Date | string | null;
  due: Date | string | null;
  onChange: (v: { startDate: Date | null; dueDate: Date | null }) => void;
  done?: boolean;
  milestone?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState(dateToDay(start));
  const [d, setD] = useState(dateToDay(due));
  const label =
    start && due && !milestone && dateToDay(start) !== dateToDay(due)
      ? `${friendlyDate(start)} → ${friendlyDate(due)}`
      : due
        ? friendlyDate(due)
        : start
          ? `Desde ${friendlyDate(start)}`
          : null;

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setS(dateToDay(start));
          setD(dateToDay(due));
        }
      }}
    >
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs whitespace-nowrap hover:bg-accent",
          label ? dueTone(due, done) : "text-muted-foreground/70",
        )}
        aria-label="Cambiar fechas"
      >
        <CalendarDays className="size-3.5" />
        {label ?? placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          {!milestone && (
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Inicio</span>
              <input
                type="date"
                value={s}
                onChange={(e) => setS(e.target.value)}
                className="h-8 w-full rounded-md border bg-transparent px-2 text-sm [color-scheme:dark]"
              />
            </label>
          )}
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">{milestone ? "Fecha del hito" : "Vencimiento"}</span>
            <input
              type="date"
              value={d}
              min={milestone ? undefined : s || undefined}
              onChange={(e) => setD(e.target.value)}
              className="h-8 w-full rounded-md border bg-transparent px-2 text-sm [color-scheme:dark]"
            />
          </label>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                onChange({ startDate: null, dueDate: null });
                setOpen(false);
              }}
            >
              <X className="size-3" /> Quitar
            </button>
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
              onClick={() => {
                let sd = milestone ? dayToDate(d) : dayToDate(s);
                const dd = dayToDate(d);
                if (sd && dd && sd > dd) sd = dd;
                onChange({ startDate: sd, dueDate: dd });
                setOpen(false);
              }}
            >
              Aplicar
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ProgressBar({ value, className, color }: { value: number; className?: string; color?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color ?? "var(--primary)" }}
      />
    </div>
  );
}

export const HEALTH_INFO: Record<string, { label: string; color: string }> = {
  EN_CAMINO: { label: "En camino", color: "#1e7f4f" },
  ATENCION: { label: "Requiere atención", color: "#b45309" },
  EN_RIESGO: { label: "En riesgo", color: "#b3261e" },
  COMPLETADO: { label: "Completado", color: "#8B1510" },
  SIN_TAREAS: { label: "Sin tareas", color: "#64748b" },
};

export function HealthBadge({ health }: { health: string }) {
  const h = HEALTH_INFO[health] ?? HEALTH_INFO.SIN_TAREAS;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ background: `${h.color}1f`, color: h.color }}
    >
      <span className="size-1.5 rounded-full" style={{ background: h.color }} />
      {h.label}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-6" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
