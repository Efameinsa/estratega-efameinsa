"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Diamond, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusColor } from "@/lib/pm";
import { useWorkspace, type Task } from "./workspace-context";
import { UserAvatar, dateToDay, dayToDate } from "./primitives";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

function key(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function CalendarView() {
  const { tasks, visibleTopTasks, childrenOf, isDone, openTask, updateTask, ws, userById } = useWorkspace();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Tareas visibles (incluye subtareas de tareas visibles)
  const visible = useMemo(() => {
    const out: Task[] = [];
    for (const t of visibleTopTasks) {
      out.push(t);
      out.push(...childrenOf(t.id));
    }
    return out;
  }, [visibleTopTasks, childrenOf]);

  const byDay = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of visible) {
      const k = dateToDay(t.dueDate ?? t.startDate);
      if (!k) continue;
      const arr = m.get(k) ?? [];
      arr.push(t);
      m.set(k, arr);
    }
    return m;
  }, [visible]);
  const unscheduled = visible.filter((t) => !t.dueDate && !t.startDate && !t.parentId);

  const first = new Date(cursor.y, cursor.m, 1);
  const offset = (first.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: { y: number; m: number; d: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(cursor.y, cursor.m, 1 - offset + i);
    cells.push({ y: date.getFullYear(), m: date.getMonth(), d: date.getDate(), inMonth: date.getMonth() === cursor.m });
  }
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const todayKey = key(now.getFullYear(), now.getMonth(), now.getDate());

  const drop = (dayKey: string, id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const target = dayToDate(dayKey)!;
    const due = t.dueDate ? new Date(t.dueDate) : null;
    const start = t.startDate ? new Date(t.startDate) : null;
    if (due) {
      const delta = target.getTime() - due.getTime();
      updateTask(id, { dueDate: target, startDate: start ? new Date(start.getTime() + delta) : null });
    } else if (start) {
      updateTask(id, { startDate: target, dueDate: target });
    } else {
      updateTask(id, { dueDate: target, startDate: t.type === "MILESTONE" ? target : null });
    }
  };

  const Chip = ({ t }: { t: Task }) => {
    const done = isDone(t);
    const st = ws.project.workflows.find((s) => s.id === t.statusId);
    const c = done ? "#4ade80" : statusColor(st);
    const u = t.assigneeId ? userById.get(t.assigneeId) : null;
    return (
      <button
        type="button"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/task", t.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={() => openTask(t.id)}
        className={cn("flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] hover:brightness-125", done && "line-through opacity-60")}
        style={{ background: `${c}26`, borderLeft: `3px solid ${c}` }}
        title={t.summary}
      >
        {t.type === "MILESTONE" && <Diamond className="size-3 shrink-0 text-amber-300" fill="currentColor" />}
        <span className="min-w-0 flex-1 truncate">{t.summary}</span>
        {u && <UserAvatar user={u} size={14} className="ring-0" />}
      </button>
    );
  };

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col px-6 py-3">
        <div className="mb-3 flex items-center gap-2">
          <button type="button" onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))} className="rounded-md border p-1.5 hover:bg-accent" aria-label="Mes anterior">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))} className="rounded-md border p-1.5 hover:bg-accent" aria-label="Mes siguiente">
            <ChevronRight className="size-4" />
          </button>
          <h2 className="text-lg font-semibold">
            {MONTHS[cursor.m]} {cursor.y}
          </h2>
          <button type="button" onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })} className="ml-2 rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">
            Hoy
          </button>
          <span className="ml-auto text-xs text-muted-foreground">Arrastra las tareas para cambiar su fecha</span>
        </div>
        <div className="grid grid-cols-7 border-b text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-1.5">
              {w}
            </div>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-7" style={{ gridTemplateRows: `repeat(${weeks}, minmax(110px, 1fr))` }}>
          {cells.slice(0, weeks * 7).map((c) => {
            const k = key(c.y, c.m, c.d);
            const items = byDay.get(k) ?? [];
            return (
              <div
                key={k}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(k);
                }}
                onDragLeave={() => setDragOver((d) => (d === k ? null : d))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  const id = e.dataTransfer.getData("text/task");
                  if (id) drop(k, id);
                }}
                className={cn(
                  "min-h-0 space-y-1 overflow-hidden border-r border-b p-1.5 transition-colors",
                  !c.inMonth && "bg-muted/20 text-muted-foreground/60",
                  dragOver === k && "bg-primary/10",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs",
                    k === todayKey && "bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {c.d}
                </span>
                {items.slice(0, 4).map((t) => (
                  <Chip key={t.id} t={t} />
                ))}
                {items.length > 4 && <p className="px-1 text-[10px] text-muted-foreground">+{items.length - 4} más</p>}
              </div>
            );
          })}
        </div>
      </div>
      <aside className="hidden w-64 shrink-0 border-l p-3 xl:block">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Inbox className="size-4 text-muted-foreground" /> Sin programar
          <span className="text-xs text-muted-foreground">{unscheduled.length}</span>
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">Arrastra estas tareas a un día del calendario.</p>
        <div className="space-y-1.5">
          {unscheduled.map((t) => (
            <Chip key={t.id} t={t} />
          ))}
          {unscheduled.length === 0 && <p className="text-xs text-muted-foreground/70">Todo está programado.</p>}
        </div>
      </aside>
    </div>
  );
}
