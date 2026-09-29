"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, closestCorners, useSensor, useSensors, useDroppable,
  type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Diamond, ListTree, Lock, MessageSquare, Paperclip, Plus, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { statusColor } from "@/lib/pm";
import { useWorkspace, type Task } from "./workspace-context";
import { PriorityFlag, StatusIcon, UserAvatar, friendlyDate, dueTone } from "./primitives";

type Columns = Record<string, string[]>;

export function Board() {
  const { ws, visibleTopTasks, projectId, refresh, statusById, isDone } = useWorkspace();
  const utils = trpc.useUtils();
  const statuses = ws.project.workflows;
  const byId = useMemo(() => new Map(visibleTopTasks.map((t) => [t.id, t])), [visibleTopTasks]);

  const buildColumns = (): Columns => {
    const cols: Columns = Object.fromEntries(statuses.map((s) => [s.id, [] as string[]]));
    const fallback = statuses[0]?.id;
    const ordered = [...visibleTopTasks].sort((a, b) => a.sortOrder - b.sortOrder || a.number - b.number);
    for (const t of ordered) {
      const k = t.statusId && cols[t.statusId] ? t.statusId : fallback;
      if (k) cols[k].push(t.id);
    }
    return cols;
  };

  const [columns, setColumns] = useState<Columns>(buildColumns);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Resincroniza cuando cambian los datos (y no estamos arrastrando).
  useEffect(() => {
    if (!activeId) setColumns(buildColumns());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTopTasks, statuses]);

  const move = trpc.pm.moveTasks.useMutation({
    onError: (e) => {
      toast.error(e.message);
      refresh();
    },
    onSettled: refresh,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findCol = (id: string) => (columns[id] ? id : Object.keys(columns).find((k) => columns[k].includes(id)));

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const from = findCol(String(active.id));
    const to = findCol(String(over.id));
    if (!from || !to || from === to) return;
    setColumns((prev) => {
      const fromItems = prev[from].filter((x) => x !== active.id);
      const toItems = [...prev[to]];
      const overIdx = toItems.indexOf(String(over.id));
      const idx = overIdx >= 0 ? overIdx : toItems.length;
      toItems.splice(idx, 0, String(active.id));
      return { ...prev, [from]: fromItems, [to]: toItems };
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const col = findCol(String(active.id));
    if (!col) return;
    let items = columns[col];
    const oldIdx = items.indexOf(String(active.id));
    const newIdx = items.indexOf(String(over.id));
    if (oldIdx >= 0 && newIdx >= 0 && oldIdx !== newIdx) items = arrayMove(items, oldIdx, newIdx);
    const next = { ...columns, [col]: items };
    setColumns(next);

    const original = byId.get(String(active.id));
    const statusChanged = original?.statusId !== col;
    const newStatus = statusById.get(col);
    // Optimista: la tarjeta queda donde se soltó.
    utils.pm.tasks.setData({ projectId }, (old) =>
      old?.map((t) => {
        const i = items.indexOf(t.id);
        return i >= 0 ? { ...t, statusId: col, sortOrder: i } : t;
      }),
    );
    // Solo viajan las tarjetas que realmente cambiaron de columna u orden.
    const changed = items
      .map((id, i) => ({ id, statusId: col, sortOrder: i }))
      .filter((m) => {
        const t = byId.get(m.id);
        return !t || t.statusId !== m.statusId || t.sortOrder !== m.sortOrder;
      });
    if (changed.length) move.mutate({ projectId, moves: changed });
    if (statusChanged && newStatus?.category === "DONE") toast.success("¡Tarea completada!");
  };

  const active = activeId ? byId.get(activeId) : null;

  return (
    <div className="h-full overflow-x-auto overflow-y-hidden">
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => { setActiveId(null); setColumns(buildColumns()); }}>
        <div className="flex h-full w-max min-w-full gap-4 px-6 py-4 pr-10">
          {statuses.map((s) => (
            <Column key={s.id} status={s} ids={columns[s.id] ?? []} byId={byId} doneCol={s.category === "DONE"} />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
          {active ? <Card task={active} overlay done={isDone(active)} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({ status, ids, byId, doneCol }: { status: ReturnType<typeof useWorkspace>["ws"]["project"]["workflows"][number]; ids: string[]; byId: Map<string, Task>; doneCol: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  const { projectId, refresh } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const create = trpc.pm.createTask.useMutation({ onSuccess: refresh, onError: (e) => toast.error(e.message) });
  const color = statusColor(status);
  const submit = () => {
    if (text.trim()) create.mutate({ projectId, summary: text.trim(), statusId: status.id });
    setText("");
  };

  return (
    <div className="flex h-full min-w-[260px] max-w-[360px] flex-1 flex-col rounded-xl bg-muted/40">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="h-4 w-1 rounded-full" style={{ background: color }} />
        <StatusIcon category={status.category} color={color} />
        <span className="text-sm font-semibold">{status.name}</span>
        <span className="rounded-full bg-background/60 px-1.5 text-xs text-muted-foreground">{ids.length}</span>
        <button type="button" onClick={() => setAdding(true)} className="ml-auto rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={`Agregar tarea en ${status.name}`}>
          <Plus className="size-4" />
        </button>
      </div>
      <div ref={setNodeRef} className={cn("flex-1 space-y-2 overflow-y-auto px-2 pb-2 transition-colors", isOver && "rounded-lg bg-primary/5")}>
        {adding && (
          <div className="rounded-lg border border-primary/50 bg-card p-2">
            <textarea
              autoFocus
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
                if (e.key === "Escape") setAdding(false);
              }}
              onBlur={() => {
                submit();
                setAdding(false);
              }}
              placeholder="¿Qué hay que hacer?"
              className="w-full resize-none bg-transparent text-sm outline-none"
            />
          </div>
        )}
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {ids.map((id) => {
            const t = byId.get(id);
            return t ? <SortableCard key={id} task={t} done={doneCol} /> : null;
          })}
        </SortableContext>
        {ids.length === 0 && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center rounded-lg border border-dashed py-6 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            Suelta aquí o agrega una tarea
          </button>
        )}
      </div>
    </div>
  );
}

function SortableCard({ task, done }: { task: Task; done: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-30")}
      {...attributes}
      {...listeners}
    >
      <Card task={task} done={done} />
    </div>
  );
}

function Card({ task, overlay = false, done }: { task: Task; overlay?: boolean; done: boolean }) {
  const { ws, openTask, childrenOf, isDone, userById, isBlocked } = useWorkspace();
  const kids = childrenOf(task.id);
  const kidsDone = kids.filter(isDone).length;
  const assignee = task.assigneeId ? userById.get(task.assigneeId) : null;
  const milestone = task.type === "MILESTONE";
  const blocked = !done && isBlocked(task.id);
  return (
    <div
      onClick={() => !overlay && openTask(task.id)}
      className={cn(
        "cursor-grab space-y-2 rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:border-primary/40 hover:shadow-md active:cursor-grabbing",
        overlay && "rotate-2 cursor-grabbing border-primary/60 shadow-xl",
      )}
    >
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.labels.map(({ label }) => (
            <span key={label.id} className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${label.color}33`, color: label.color }}>
              {label.name}
            </span>
          ))}
        </div>
      )}
      <p className={cn("flex items-start gap-1.5 text-sm leading-snug", done && "text-muted-foreground line-through")}>
        {milestone && <Diamond className="mt-0.5 size-3.5 shrink-0 text-amber-300" fill="currentColor" />}
        {blocked && (
          <span title="Esperando a otra tarea">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
          </span>
        )}
        {task.summary}
      </p>
      {kids.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-green-400" style={{ width: `${(kidsDone / kids.length) * 100}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground">
            {kidsDone}/{kids.length}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 whitespace-nowrap text-[11px] text-muted-foreground">
        <span className="shrink-0 font-mono">
          {ws.project.key}-{task.number}
        </span>
        <PriorityFlag priority={task.priority} />
        {task.dueDate && (
          <span className={cn("flex shrink-0 items-center gap-0.5", dueTone(task.dueDate, done))}>
            <CalendarDays className="size-3" />
            {friendlyDate(task.dueDate)}
          </span>
        )}
        {kids.length > 0 && (
          <span className="flex items-center gap-0.5">
            <ListTree className="size-3" />
            {kids.length}
          </span>
        )}
        {task._count.comments > 0 && (
          <span className="flex items-center gap-0.5">
            <MessageSquare className="size-3" />
            {task._count.comments}
          </span>
        )}
        {task._count.attachments > 0 && (
          <span className="flex items-center gap-0.5">
            <Paperclip className="size-3" />
            {task._count.attachments}
          </span>
        )}
        <span className="ml-auto">
          <UserAvatar user={assignee ?? null} size={22} />
        </span>
      </div>
    </div>
  );
}
