"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Diamond, Crosshair } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useWorkspace, type Task } from "./workspace-context";
import { UserAvatar } from "./primitives";

// Gantt interactivo: arrastrar para mover, bordes para cambiar duración,
// punto derecho para crear dependencias (fin → inicio), clic en fila vacía para programar.

const DAY = 86_400_000;
const ROW = 38;
const HEADER = 52;
const LEFT = 360;

type Zoom = "day" | "week" | "month" | "quarter";
const ZOOMS: { key: Zoom; label: string; px: number }[] = [
  { key: "day", label: "Días", px: 34 },
  { key: "week", label: "Semanas", px: 13 },
  { key: "month", label: "Meses", px: 4 },
  { key: "quarter", label: "Trimestres", px: 1.6 },
];

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];

/** Día absoluto (UTC) de una fecha guardada. */
function dayNum(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const x = d instanceof Date ? d : new Date(d);
  if (isNaN(x.getTime())) return null;
  return Math.floor(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()) / DAY);
}
function fromDayNum(n: number): Date {
  const d = new Date(n * DAY);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));
}
function todayNum() {
  const t = new Date();
  return Math.floor(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / DAY);
}

type Row = { task: Task; depth: number; hasKids: boolean };
type DragState =
  | { kind: "move" | "start" | "end"; id: string; originX: number; s0: number; e0: number; ds: number; de: number }
  | { kind: "link"; id: string; x: number; y: number; x0: number; y0: number }
  | null;

export function Gantt() {
  const { ws, visibleTopTasks, childrenOf, isDone, openTask, updateTask, userById, tasks, refresh } = useWorkspace();
  const [zoom, setZoom] = useState<Zoom>(() => {
    const s = dayNum(ws.project.startDate);
    const e = dayNum(ws.project.endDate);
    return s != null && e != null && e - s > 150 ? "month" : "week";
  });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<DragState>(null);
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const px = ZOOMS.find((z) => z.key === zoom)!.px;
  const addDep = trpc.pm.addDependency.useMutation({
    onSuccess: () => {
      toast.success("Dependencia creada");
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    const sorted = [...visibleTopTasks].sort((a, b) => {
      const da = dayNum(a.startDate ?? a.dueDate) ?? Infinity;
      const db = dayNum(b.startDate ?? b.dueDate) ?? Infinity;
      return da - db || a.sortOrder - b.sortOrder;
    });
    for (const t of sorted) {
      const kids = childrenOf(t.id);
      out.push({ task: t, depth: 0, hasKids: kids.length > 0 });
      if (kids.length && !collapsed.has(t.id)) for (const k of kids) out.push({ task: k, depth: 1, hasKids: false });
    }
    return out;
  }, [visibleTopTasks, childrenOf, collapsed]);

  // Rango visible
  const { start, end } = useMemo(() => {
    const nums: number[] = [todayNum()];
    const p = ws.project;
    for (const d of [p.startDate, p.endDate]) {
      const n = dayNum(d);
      if (n != null) nums.push(n);
    }
    for (const t of tasks) {
      const a = dayNum(t.startDate);
      const b = dayNum(t.dueDate);
      if (a != null) nums.push(a);
      if (b != null) nums.push(b);
    }
    const pad = zoom === "day" ? 7 : zoom === "week" ? 21 : 45;
    let s = Math.min(...nums) - pad;
    let e = Math.max(...nums) + pad;
    // Alinea a inicio de mes para cabeceras limpias.
    const sd = new Date(s * DAY);
    s = Math.floor(Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth(), 1) / DAY);
    const ed = new Date(e * DAY);
    e = Math.floor(Date.UTC(ed.getUTCFullYear(), ed.getUTCMonth() + 1, 0) / DAY);
    return { start: s, end: e };
  }, [ws.project, tasks, zoom]);

  const days = end - start + 1;
  const width = days * px;
  const xOf = useCallback((n: number) => (n - start) * px, [start, px]);

  // Cabeceras
  const header = useMemo(() => {
    const top: { label: string; x: number; w: number }[] = [];
    const bottom: { label: string; x: number; w: number; weekend?: boolean }[] = [];
    const d0 = new Date(start * DAY);
    if (zoom === "day" || zoom === "week") {
      let y = d0.getUTCFullYear();
      let m = d0.getUTCMonth();
      while (true) {
        const ms = Math.floor(Date.UTC(y, m, 1) / DAY);
        if (ms > end) break;
        const me = Math.floor(Date.UTC(y, m + 1, 0) / DAY);
        top.push({ label: `${MONTHS[m]} ${y}`, x: xOf(Math.max(ms, start)), w: (Math.min(me, end) - Math.max(ms, start) + 1) * px });
        m++;
        if (m > 11) {
          m = 0;
          y++;
        }
      }
      if (zoom === "day") {
        for (let n = start; n <= end; n++) {
          const d = new Date(n * DAY);
          const wd = d.getUTCDay();
          bottom.push({ label: String(d.getUTCDate()), x: xOf(n), w: px, weekend: wd === 0 || wd === 6 });
        }
      } else {
        // semanas que empiezan en lunes
        let n = start;
        while (new Date(n * DAY).getUTCDay() !== 1) n++;
        for (; n <= end; n += 7) {
          const d = new Date(n * DAY);
          bottom.push({ label: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].toLowerCase()}`, x: xOf(n), w: 7 * px });
        }
      }
    } else {
      let y = d0.getUTCFullYear();
      while (Math.floor(Date.UTC(y, 0, 1) / DAY) <= end) {
        const ys = Math.floor(Date.UTC(y, 0, 1) / DAY);
        const ye = Math.floor(Date.UTC(y, 11, 31) / DAY);
        top.push({ label: String(y), x: xOf(Math.max(ys, start)), w: (Math.min(ye, end) - Math.max(ys, start) + 1) * px });
        const step = zoom === "month" ? 1 : 3;
        for (let m = 0; m < 12; m += step) {
          const ms = Math.floor(Date.UTC(y, m, 1) / DAY);
          const me = Math.floor(Date.UTC(y, m + step, 0) / DAY);
          if (me < start || ms > end) continue;
          bottom.push({
            label: zoom === "month" ? MONTHS[m] : `T${m / 3 + 1}`,
            x: xOf(Math.max(ms, start)),
            w: (Math.min(me, end) - Math.max(ms, start) + 1) * px,
          });
        }
        y++;
      }
    }
    return { top, bottom };
  }, [start, end, zoom, px, xOf]);

  const today = todayNum();
  const scrollToToday = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: Math.max(0, xOf(today) - (el.clientWidth - LEFT) / 3), behavior: "smooth" });
  }, [xOf, today]);
  useEffect(() => {
    const el = scrollRef.current;
    const ps = dayNum(ws.project.startDate);
    const pe = dayNum(ws.project.endDate);
    // Si todo el proyecto cabe en pantalla, se muestra completo; si no, se centra en hoy.
    if (el && ps != null && pe != null && (pe - ps) * px < el.clientWidth - LEFT - 40) {
      el.scrollTo({ left: Math.max(0, xOf(ps) - 24) });
    } else scrollToToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // Posiciones de barras (con arrastre aplicado)
  const barOf = (t: Task) => {
    let s = dayNum(t.startDate);
    let e = dayNum(t.dueDate);
    if (s == null && e == null) return null;
    if (s == null) s = e!;
    if (e == null) e = s;
    if (drag && drag.kind !== "link" && drag.id === t.id) {
      s = drag.ds;
      e = drag.de;
    }
    return { s, e, x: xOf(s), w: Math.max(px, (e - s + 1) * px) };
  };

  const rowIndex = useMemo(() => new Map(rows.map((r, i) => [r.task.id, i])), [rows]);

  // --- arrastre
  useEffect(() => {
    if (!drag) return;
    const onMove = (ev: PointerEvent) => {
      if (drag.kind === "link") {
        const rect = scrollRef.current!.getBoundingClientRect();
        setDrag({ ...drag, x: ev.clientX - rect.left + scrollRef.current!.scrollLeft - LEFT, y: ev.clientY - rect.top + scrollRef.current!.scrollTop - HEADER });
        return;
      }
      const delta = Math.round((ev.clientX - drag.originX) / px);
      let ds = drag.s0;
      let de = drag.e0;
      if (drag.kind === "move") {
        ds += delta;
        de += delta;
      } else if (drag.kind === "start") {
        ds = Math.min(drag.e0, drag.s0 + delta);
      } else {
        de = Math.max(drag.s0, drag.e0 + delta);
      }
      if (ds !== drag.ds || de !== drag.de) setDrag({ ...drag, ds, de });
    };
    const onUp = (ev: PointerEvent) => {
      if (drag.kind === "link") {
        const target = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-bar-id]");
        const toId = target?.dataset.barId;
        if (toId && toId !== drag.id) addDep.mutate({ fromIssueId: drag.id, toIssueId: toId });
      } else if (drag.ds !== drag.s0 || drag.de !== drag.e0) {
        const t = tasks.find((x) => x.id === drag.id);
        const milestone = t?.type === "MILESTONE";
        updateTask(drag.id, milestone ? { startDate: fromDayNum(drag.de), dueDate: fromDayNum(drag.de) } : { startDate: fromDayNum(drag.ds), dueDate: fromDayNum(drag.de) });
      } else if (drag.kind === "move") {
        openTask(drag.id);
      }
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, px, tasks, updateTask, openTask, addDep]);

  const beginDrag = (e: React.PointerEvent, t: Task, kind: "move" | "start" | "end") => {
    e.stopPropagation();
    e.preventDefault();
    const b = barOf(t);
    if (!b) return;
    setDrag({ kind, id: t.id, originX: e.clientX, s0: b.s, e0: b.e, ds: b.s, de: b.e });
  };

  const beginLink = (e: React.PointerEvent, t: Task, idx: number) => {
    e.stopPropagation();
    e.preventDefault();
    const b = barOf(t);
    if (!b) return;
    const x0 = b.x + b.w;
    const y0 = idx * ROW + ROW / 2;
    setDrag({ kind: "link", id: t.id, x: x0, y: y0, x0, y0 });
  };

  // Clic en fila sin fechas → programa desde ese día
  const scheduleAt = (e: React.MouseEvent, t: Task) => {
    if (dayNum(t.startDate) != null || dayNum(t.dueDate) != null) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const n = start + Math.floor((e.clientX - rect.left) / px);
    const len = t.type === "MILESTONE" ? 0 : zoom === "day" ? 2 : zoom === "week" ? 6 : 13;
    updateTask(t.id, { startDate: fromDayNum(n), dueDate: fromDayNum(n + len) });
  };

  // Dependencias visibles
  const deps = useMemo(() => {
    const out: { from: string; to: string; id: string }[] = [];
    for (const t of tasks) for (const l of t.linksFrom) out.push({ from: t.id, to: l.toIssueId, id: l.id });
    return out.filter((d) => rowIndex.has(d.from) && rowIndex.has(d.to));
  }, [tasks, rowIndex]);

  const progressOf = (t: Task) => {
    if (isDone(t)) return 100;
    const kids = childrenOf(t.id);
    if (kids.length) return Math.round((kids.filter(isDone).length / kids.length) * 100);
    return 0;
  };

  const unscheduled = rows.filter((r) => barOf(r.task) == null).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-6 py-2">
        <div className="flex rounded-lg border p-0.5">
          {ZOOMS.map((z) => (
            <button
              key={z.key}
              type="button"
              onClick={() => setZoom(z.key)}
              className={cn("rounded-md px-2.5 py-1 text-xs", zoom === z.key ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {z.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={scrollToToday} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">
          <Crosshair className="size-3.5" /> Hoy
        </button>
        <p className="ml-auto hidden truncate text-xs text-muted-foreground xl:block">
          Arrastra para mover · jala los bordes para cambiar la duración · punto derecho → dependencia
        </p>
        {unscheduled > 0 && <span className="shrink-0 text-xs text-amber-300">{unscheduled} sin fechas: clic en su fila para programar</span>}
      </div>

      <div ref={scrollRef} className={cn("relative flex-1 overflow-auto border-t", drag && "select-none")}>
        <div className="relative" style={{ width: LEFT + width, height: HEADER + rows.length * ROW + 80 }}>
          {/* Cabecera */}
          <div className="sticky top-0 z-30 flex" style={{ height: HEADER }}>
            <div className="sticky left-0 z-40 flex shrink-0 items-end border-r border-b bg-background px-4 pb-2 text-xs font-medium text-muted-foreground" style={{ width: LEFT }}>
              <span className="flex-1">Tarea</span>
              <span>Responsable</span>
            </div>
            <div className="relative shrink-0 border-b bg-background" style={{ width }}>
              {header.top.map((h, i) => (
                <div key={i} className="absolute top-0 truncate border-l px-2 pt-1.5 text-xs font-semibold" style={{ left: h.x, width: h.w, height: HEADER / 2 }}>
                  {h.label}
                </div>
              ))}
              {header.bottom.map((h, i) => (
                <div
                  key={i}
                  className={cn("absolute truncate border-l text-center text-[11px] text-muted-foreground", h.weekend && "text-muted-foreground/50")}
                  style={{ left: h.x, width: h.w, top: HEADER / 2, height: HEADER / 2, lineHeight: `${HEADER / 2}px` }}
                >
                  {h.w >= 14 ? h.label : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Cuerpo */}
          <div className="relative flex">
            {/* Columna izquierda */}
            <div className="sticky left-0 z-20 shrink-0 border-r bg-background" style={{ width: LEFT }}>
              {rows.map((r) => {
                const u = r.task.assigneeId ? userById.get(r.task.assigneeId) : null;
                const done = isDone(r.task);
                return (
                  <div
                    key={r.task.id}
                    onMouseEnter={() => setHoverRow(r.task.id)}
                    onMouseLeave={() => setHoverRow(null)}
                    className={cn("flex items-center gap-1.5 border-b pr-3 text-sm", hoverRow === r.task.id && "bg-accent/40")}
                    style={{ height: ROW, paddingLeft: 12 + r.depth * 22 }}
                  >
                    <button
                      type="button"
                      className={cn("flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent", !r.hasKids && "invisible")}
                      onClick={() =>
                        setCollapsed((c) => {
                          const n = new Set(c);
                          if (n.has(r.task.id)) n.delete(r.task.id);
                          else n.add(r.task.id);
                          return n;
                        })
                      }
                      aria-label="Expandir"
                    >
                      {collapsed.has(r.task.id) ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    </button>
                    {r.task.type === "MILESTONE" && <Diamond className="size-3.5 shrink-0 text-amber-300" fill="currentColor" />}
                    <button
                      type="button"
                      onClick={() => openTask(r.task.id)}
                      className={cn("min-w-0 flex-1 truncate text-left hover:underline", r.depth > 0 && "text-muted-foreground", done && "line-through opacity-70")}
                      title={r.task.summary}
                    >
                      {r.task.summary}
                    </button>
                    <UserAvatar user={u ?? null} size={22} />
                  </div>
                );
              })}
            </div>

            {/* Línea de tiempo */}
            <div className="relative shrink-0" style={{ width, height: rows.length * ROW }}>
              {/* rejilla */}
              {zoom === "day" &&
                header.bottom.map((h, i) =>
                  h.weekend ? <div key={i} className="absolute top-0 bottom-0 bg-muted/30" style={{ left: h.x, width: h.w }} /> : null,
                )}
              {header.bottom.map((h, i) => (
                <div key={`g${i}`} className="absolute top-0 bottom-0 border-l border-border/50" style={{ left: h.x }} />
              ))}
              {/* proyecto */}
              {ws.project.startDate && (
                <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-primary/30" style={{ left: xOf(dayNum(ws.project.startDate)!) }} />
              )}
              {ws.project.endDate && (
                <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-primary/30" style={{ left: xOf(dayNum(ws.project.endDate)! + 1) }} title="Fin del proyecto" />
              )}
              {/* hoy */}
              <div className="absolute top-0 bottom-0 z-10 w-0.5 bg-red-400/80" style={{ left: xOf(today) + px / 2 }}>
                <span className="absolute -top-0 -translate-x-1/2 rounded bg-red-400 px-1 text-[9px] font-semibold text-white">HOY</span>
              </div>

              {rows.map((r, idx) => {
                const t = r.task;
                const b = barOf(t);
                const done = isDone(t);
                const overdue = !done && dayNum(t.dueDate) != null && dayNum(t.dueDate)! < today;
                const color = done ? "#4ade80" : overdue ? "#f87171" : (ws.project.color ?? "#a78bfa");
                const milestone = t.type === "MILESTONE";
                const prog = progressOf(t);
                return (
                  <div
                    key={t.id}
                    onMouseEnter={() => setHoverRow(t.id)}
                    onMouseLeave={() => setHoverRow(null)}
                    onClick={(e) => scheduleAt(e, t)}
                    className={cn("absolute right-0 left-0 border-b border-border/40", hoverRow === t.id && "bg-accent/30", !b && "cursor-copy")}
                    style={{ top: idx * ROW, height: ROW }}
                  >
                    {!b && hoverRow === t.id && (
                      <span className="pointer-events-none absolute top-2.5 text-[11px] text-muted-foreground" style={{ left: 8 + (scrollRef.current?.scrollLeft ?? 0) }}>
                        Haz clic en un día para programar esta tarea
                      </span>
                    )}
                    {b && milestone && (
                      <div
                        data-bar-id={t.id}
                        onPointerDown={(e) => beginDrag(e, t, "end")}
                        className="absolute top-1/2 z-10 flex -translate-y-1/2 cursor-grab items-center gap-2"
                        style={{ left: b.x + px / 2 - 9 }}
                        title={t.summary}
                      >
                        <Diamond className="size-[18px] drop-shadow" style={{ color: done ? "#4ade80" : "#fbbf24" }} fill="currentColor" />
                        <span className="pointer-events-none whitespace-nowrap text-xs font-medium">{t.summary}</span>
                      </div>
                    )}
                    {b && !milestone && (
                      <div
                        data-bar-id={t.id}
                        className={cn(
                          "group absolute top-1/2 z-10 -translate-y-1/2 rounded-md shadow-sm",
                          drag && drag.kind !== "link" && drag.id === t.id ? "ring-2 ring-primary" : "",
                          r.depth > 0 ? "h-4" : "h-6",
                        )}
                        style={{ left: b.x, width: b.w, background: `${color}40`, border: `1px solid ${color}` }}
                        title={`${t.summary}`}
                      >
                        <div className="pointer-events-none absolute inset-y-0 left-0 rounded-l-md" style={{ width: `${prog}%`, background: `${color}aa` }} />
                        <div
                          onPointerDown={(e) => beginDrag(e, t, "move")}
                          className="absolute inset-0 cursor-grab active:cursor-grabbing"
                        />
                        <div onPointerDown={(e) => beginDrag(e, t, "start")} className="absolute inset-y-0 -left-1 w-2.5 cursor-ew-resize rounded-l-md opacity-0 group-hover:bg-white/40 group-hover:opacity-100" />
                        <div onPointerDown={(e) => beginDrag(e, t, "end")} className="absolute inset-y-0 -right-1 w-2.5 cursor-ew-resize rounded-r-md opacity-0 group-hover:bg-white/40 group-hover:opacity-100" />
                        <button
                          type="button"
                          onPointerDown={(e) => beginLink(e, t, idx)}
                          className="absolute top-1/2 -right-4 size-3 -translate-y-1/2 cursor-crosshair rounded-full border-2 bg-background opacity-0 group-hover:opacity-100"
                          style={{ borderColor: color }}
                          aria-label="Crear dependencia"
                          title="Arrastra hasta otra tarea para crear una dependencia"
                        />
                        <span
                          className="pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-medium"
                          style={b.w > 140 ? { left: 8, right: 8, overflow: "hidden", textOverflow: "ellipsis" } : { left: b.w + 18 }}
                        >
                          {t.summary}
                          {prog > 0 && prog < 100 && <span className="ml-1 text-muted-foreground">{prog}%</span>}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* dependencias */}
              <svg className="pointer-events-none absolute inset-0 z-[15] overflow-visible" width={width} height={rows.length * ROW}>
                <defs>
                  <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0,0 L8,4 L0,8 z" fill="#a78bfa" />
                  </marker>
                </defs>
                {deps.map((d) => {
                  const a = tasks.find((x) => x.id === d.from)!;
                  const c = tasks.find((x) => x.id === d.to)!;
                  const ba = barOf(a);
                  const bc = barOf(c);
                  if (!ba || !bc) return null;
                  const x1 = ba.x + ba.w;
                  const y1 = rowIndex.get(d.from)! * ROW + ROW / 2;
                  const x2 = bc.x;
                  const y2 = rowIndex.get(d.to)! * ROW + ROW / 2;
                  const late = bc.s <= ba.e;
                  const midX = x1 + 10;
                  const path =
                    x2 - 16 > x1
                      ? `M${x1},${y1} H${midX} V${y2} H${x2 - 2}`
                      : `M${x1},${y1} H${midX} V${y1 + (y2 > y1 ? ROW / 2 : -ROW / 2)} H${x2 - 12} V${y2} H${x2 - 2}`;
                  return <path key={d.id} d={path} fill="none" stroke={late ? "#f87171" : "#a78bfa"} strokeWidth={1.5} markerEnd="url(#arrow)" opacity={0.85} />;
                })}
                {drag?.kind === "link" && (
                  <path d={`M${drag.x0},${drag.y0} L${drag.x},${drag.y}`} stroke="#a78bfa" strokeWidth={2} strokeDasharray="4 3" fill="none" markerEnd="url(#arrow)" />
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
