"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronDown, ChevronRight, Circle, CheckCircle2, Diamond, MessageSquare, Paperclip, Plus, ListTree, Clock, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { PRIORITIES, statusColor } from "@/lib/pm";
import { useWorkspace, type Task } from "./workspace-context";
import { AssigneePicker, DateRangePicker, PriorityPicker, StatusIcon, StatusPicker, UserAvatar } from "./primitives";

type GroupBy = "status" | "assignee" | "priority";

const GRID = "grid grid-cols-[minmax(260px,1fr)_130px_150px_110px_90px_92px] items-center";

export function TaskList() {
  const { ws, visibleTopTasks, tasks } = useWorkspace();
  const [groupBy, setGroupBy] = useState<GroupBy>("status");

  const groups = useMemo(() => {
    if (groupBy === "status") {
      return ws.project.workflows.map((s) => ({
        key: s.id,
        label: s.name,
        color: statusColor(s),
        icon: <StatusIcon category={s.category} color={statusColor(s)} />,
        defaults: { statusId: s.id },
        tasks: visibleTopTasks.filter((t) => t.statusId === s.id),
      }));
    }
    if (groupBy === "priority") {
      return PRIORITIES.map((p) => ({
        key: p.value,
        label: p.label,
        color: p.color,
        icon: null,
        defaults: { priority: p.value },
        tasks: visibleTopTasks.filter((t) => t.priority === p.value),
      }));
    }
    const ids = Array.from(new Set(visibleTopTasks.map((t) => t.assigneeId ?? "none")));
    return ids.map((id) => {
      const u = ws.users.find((x) => x.id === id);
      return {
        key: id,
        label: u?.name ?? "Sin asignar",
        color: "#a78bfa",
        icon: <UserAvatar user={u ?? null} size={20} />,
        defaults: { assigneeId: id === "none" ? null : id },
        tasks: visibleTopTasks.filter((t) => (t.assigneeId ?? "none") === id),
      };
    });
  }, [groupBy, ws, visibleTopTasks]);

  return (
    <div className="h-full overflow-auto">
      <div className="min-w-[900px] px-6 pb-16">
        <div className="sticky top-0 z-10 -mx-6 flex items-center gap-2 bg-background/90 px-6 py-2 backdrop-blur">
          <span className="text-xs text-muted-foreground">Agrupar por</span>
          {(
            [
              ["status", "Estado"],
              ["assignee", "Responsable"],
              ["priority", "Prioridad"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setGroupBy(k)}
              className={cn(
                "rounded-md px-2 py-0.5 text-xs",
                groupBy === k ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{tasks.filter((t) => !t.parentId).length} tareas</span>
        </div>
        <div className={cn(GRID, "border-b py-1.5 text-xs font-medium text-muted-foreground")}>
          <span className="pl-9">Tarea</span>
          <span>Responsable</span>
          <span>Fechas</span>
          <span>Prioridad</span>
          <span>Tiempo</span>
          <span className="text-right">Estado</span>
        </div>
        {groups.map((g) => (
          <Group key={g.key} group={g} />
        ))}
      </div>
    </div>
  );
}

function Group({
  group,
}: {
  group: { key: string; label: string; color: string; icon: React.ReactNode; defaults: Record<string, string | null>; tasks: Task[] };
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <section className="mt-4">
      <button type="button" onClick={() => setCollapsed((c) => !c)} className="group flex items-center gap-2 py-1.5 text-sm font-semibold">
        {collapsed ? <ChevronRight className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        {group.icon}
        <span style={{ color: group.color }}>{group.label}</span>
        <span className="rounded-full bg-muted px-1.5 text-xs font-normal text-muted-foreground">{group.tasks.length}</span>
      </button>
      {!collapsed && (
        <div className="rounded-lg border">
          {group.tasks.map((t) => (
            <Row key={t.id} task={t} />
          ))}
          <QuickAdd defaults={group.defaults} />
        </div>
      )}
    </section>
  );
}

function QuickAdd({ defaults, parentId, indent = false }: { defaults?: Record<string, string | null>; parentId?: string; indent?: boolean }) {
  const { projectId, refresh } = useWorkspace();
  const [active, setActive] = useState(false);
  const [text, setText] = useState("");
  const create = trpc.pm.createTask.useMutation({ onSuccess: refresh, onError: (e) => toast.error(e.message) });
  const submit = () => {
    const s = text.trim();
    if (!s) return;
    create.mutate({
      projectId,
      summary: s,
      parentId: parentId ?? null,
      statusId: defaults?.statusId ?? undefined,
      assigneeId: defaults?.assigneeId ?? undefined,
      priority: defaults?.priority ?? undefined,
    });
    setText("");
  };
  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent/30 hover:text-foreground",
          indent && "pl-14",
        )}
      >
        <Plus className="size-4" /> {parentId ? "Agregar subtarea" : "Agregar tarea"}
      </button>
    );
  }
  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5", indent && "pl-14")}>
      <Circle className="size-4 text-muted-foreground" />
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setText("");
            setActive(false);
          }
        }}
        onBlur={() => {
          submit();
          setActive(false);
        }}
        placeholder="Nombre de la tarea · Enter para guardar, Esc para cancelar"
        className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
      />
    </div>
  );
}

function Row({ task, depth = 0 }: { task: Task; depth?: number }) {
  const { ws, childrenOf, isDone, openTask, updateTask, setDone, isBlocked, openTaskId, statusById } = useWorkspace();
  const [expanded, setExpanded] = useState(false);
  const kids = childrenOf(task.id);
  const done = isDone(task);
  const milestone = task.type === "MILESTONE";
  const kidsDone = kids.filter(isDone).length;
  const blocked = !done && isBlocked(task.id);

  return (
    <>
      <div
        onClick={() => openTask(task.id)}
        className={cn(
          GRID,
          "group cursor-pointer border-b py-1 text-sm last:border-b-0 hover:bg-accent/30",
          openTaskId === task.id && "bg-primary/10",
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: depth * 28 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((x) => !x);
            }}
            className={cn("flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent", !kids.length && "invisible")}
            aria-label={expanded ? "Ocultar subtareas" : "Ver subtareas"}
          >
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
          {milestone ? (
            <Diamond className={cn("size-4 shrink-0", done ? "text-green-400" : "text-amber-300")} fill="currentColor" />
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDone(task.id, !done);
              }}
              className={cn("shrink-0", done ? "text-green-400" : "text-muted-foreground hover:text-green-400")}
              aria-label={done ? "Reabrir" : "Completar"}
            >
              {done ? <CheckCircle2 className="size-[18px]" /> : <Circle className="size-[18px]" />}
            </button>
          )}
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {ws.project.key}-{task.number}
          </span>
          <span className={cn("truncate", done && "text-muted-foreground line-through")}>{task.summary}</span>
          {blocked && (
            <span title="Esperando a otra tarea">
              <Lock className="size-3.5 shrink-0 text-amber-300" />
            </span>
          )}
          <span className="ml-1 flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
            {kids.length > 0 && (
              <span className="flex items-center gap-0.5" title="Subtareas">
                <ListTree className="size-3.5" />
                {kidsDone}/{kids.length}
              </span>
            )}
            {task._count.comments > 0 && (
              <span className="flex items-center gap-0.5" title="Comentarios">
                <MessageSquare className="size-3.5" />
                {task._count.comments}
              </span>
            )}
            {task._count.attachments > 0 && (
              <span className="flex items-center gap-0.5" title="Evidencias">
                <Paperclip className="size-3.5" />
                {task._count.attachments}
              </span>
            )}
          </span>
          {depth === 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
              }}
              className="ml-auto mr-2 hidden shrink-0 rounded px-1.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground group-hover:inline"
              title="Agregar subtarea"
            >
              + subtarea
            </button>
          )}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <AssigneePicker users={ws.users} value={task.assigneeId} onChange={(id) => updateTask(task.id, { assigneeId: id })} showName className="max-w-[125px]" />
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <DateRangePicker
            start={task.startDate}
            due={task.dueDate}
            done={done}
            milestone={milestone}
            onChange={(v) => updateTask(task.id, v)}
            placeholder="—"
          />
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <PriorityPicker value={task.priority} onChange={(v) => updateTask(task.id, { priority: v })} showLabel />
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {(task.timeSpent ?? 0) > 0 || task.estimateHours ? (
            <>
              <Clock className="size-3.5" />
              {Math.round((task.timeSpent ?? 0) * 10) / 10}
              {task.estimateHours ? `/${task.estimateHours}` : ""} h
            </>
          ) : (
            "—"
          )}
        </span>
        <div className="flex justify-end pr-2" onClick={(e) => e.stopPropagation()}>
          <StatusPicker statuses={ws.project.workflows} value={task.statusId} onChange={(id) => updateTask(task.id, { statusId: id })} compact />
          <span className="sr-only">{statusById.get(task.statusId ?? "")?.name}</span>
        </div>
      </div>
      {expanded && (
        <>
          {kids.map((k) => (
            <Row key={k.id} task={k} depth={depth + 1} />
          ))}
          <div className="border-b">
            <QuickAdd parentId={task.id} indent />
          </div>
        </>
      )}
    </>
  );
}
