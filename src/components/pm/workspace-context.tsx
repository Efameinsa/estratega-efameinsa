"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { RouterOutputs } from "./types";

export type Workspace = RouterOutputs["pm"]["workspace"];
export type Task = RouterOutputs["pm"]["tasks"][number];
export type Status = Workspace["project"]["workflows"][number];
export type WsUser = Workspace["users"][number];

export type Filters = {
  search: string;
  assigneeIds: string[];
  priorities: string[];
  hideDone: boolean;
  onlyMine: boolean;
};

const EMPTY_FILTERS: Filters = { search: "", assigneeIds: [], priorities: [], hideDone: false, onlyMine: false };

type Ctx = {
  projectId: string;
  ws: Workspace;
  tasks: Task[];
  /** Tareas principales (sin padre) que pasan los filtros. */
  visibleTopTasks: Task[];
  childrenOf: (id: string) => Task[];
  statusById: Map<string, Status>;
  userById: Map<string, WsUser>;
  isDone: (t: Pick<Task, "statusId">) => boolean;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  activeFilterCount: number;
  meId: string | null;
  openTask: (id: string | null) => void;
  openTaskId: string | null;
  updateTask: (id: string, patch: TaskPatch) => void;
  setDone: (id: string, done: boolean) => void;
  isBlocked: (id: string) => boolean;
  refresh: () => void;
};

export type TaskPatch = Partial<{
  summary: string;
  description: string | null;
  statusId: string | null;
  priority: string;
  assigneeId: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  estimateHours: number | null;
  parentId: string | null;
}>;

const WorkspaceCtx = createContext<Ctx | null>(null);

export function useWorkspace() {
  const v = useContext(WorkspaceCtx);
  if (!v) throw new Error("useWorkspace fuera de WorkspaceProvider");
  return v;
}

export function WorkspaceProvider({
  projectId,
  ws,
  meId,
  children,
}: {
  projectId: string;
  ws: Workspace;
  meId: string | null;
  children: React.ReactNode;
}) {
  const utils = trpc.useUtils();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openTaskId = searchParams.get("task");

  const { data: tasks = [] } = trpc.pm.tasks.useQuery({ projectId });
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const statusById = useMemo(() => new Map(ws.project.workflows.map((s) => [s.id, s])), [ws.project.workflows]);
  const userById = useMemo(() => new Map(ws.users.map((u) => [u.id, u])), [ws.users]);
  const isDone = useCallback(
    (t: Pick<Task, "statusId">) => (t.statusId ? statusById.get(t.statusId)?.category === "DONE" : false),
    [statusById],
  );

  const childrenMap = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.parentId) continue;
      const arr = m.get(t.parentId) ?? [];
      arr.push(t);
      m.set(t.parentId, arr);
    }
    return m;
  }, [tasks]);
  const childrenOf = useCallback((id: string) => childrenMap.get(id) ?? [], [childrenMap]);

  const matches = useCallback(
    (t: Task) => {
      if (filters.hideDone && isDone(t)) return false;
      if (filters.onlyMine && t.assigneeId !== meId) return false;
      if (filters.assigneeIds.length && !filters.assigneeIds.includes(t.assigneeId ?? "none")) return false;
      if (filters.priorities.length && !filters.priorities.includes(t.priority)) return false;
      if (filters.search && !`${t.summary} ${ws.project.key}-${t.number}`.toLowerCase().includes(filters.search.toLowerCase()))
        return false;
      return true;
    },
    [filters, isDone, meId, ws.project.key],
  );

  const visibleTopTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (t.parentId) return false;
        if (matches(t)) return true;
        // Si una subtarea coincide, mostramos a su padre.
        return (childrenMap.get(t.id) ?? []).some(matches);
      }),
    [tasks, matches, childrenMap],
  );

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    filters.assigneeIds.length +
    filters.priorities.length +
    (filters.hideDone ? 1 : 0) +
    (filters.onlyMine ? 1 : 0);

  const openTask = useCallback(
    (id: string | null) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (id) sp.set("task", id);
      else sp.delete("task");
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const refresh = useCallback(() => {
    utils.pm.tasks.invalidate({ projectId });
    utils.pm.summary.invalidate({ projectId });
    utils.pm.projectEvidence.invalidate({ projectId });
  }, [utils, projectId]);

  const updateMut = trpc.issue.update.useMutation({
    onError: (e) => {
      toast.error(e.message);
      refresh();
    },
    onSettled: (_d, _e, vars) => {
      // La lista ya se actualizó de forma optimista; solo se refresca lo que depende del cambio.
      utils.pm.tasks.invalidate({ projectId });
      utils.pm.taskDetail.invalidate({ id: vars.id });
      if (vars.statusId !== undefined || vars.assigneeId !== undefined || vars.dueDate !== undefined || vars.estimateHours !== undefined) {
        utils.pm.summary.invalidate({ projectId });
      }
      if (vars.assigneeId) utils.pm.workspace.invalidate({ projectId });
    },
  });

  const updateTask = useCallback(
    (id: string, patch: TaskPatch) => {
      // Actualización optimista: la UI responde al instante (drag & drop, pickers).
      utils.pm.tasks.setData({ projectId }, (old) =>
        old?.map((t) => (t.id === id ? ({ ...t, ...patch } as Task) : t)),
      );
      updateMut.mutate({ id, ...patch });
    },
    [utils, projectId, updateMut],
  );

  const toggleMut = trpc.pm.toggleComplete.useMutation({
    onError: (e) => toast.error(e.message),
    onSettled: (_d, _e, vars) => {
      refresh();
      utils.pm.taskDetail.invalidate({ id: vars.id });
    },
  });
  const setDone = useCallback(
    (id: string, done: boolean) => {
      const target = ws.project.workflows.find((s) => s.category === (done ? "DONE" : "TODO"));
      if (target) {
        utils.pm.tasks.setData({ projectId }, (old) => old?.map((t) => (t.id === id ? { ...t, statusId: target.id } : t)));
      }
      toggleMut.mutate({ id, done });
    },
    [ws.project.workflows, utils, projectId, toggleMut],
  );

  const isBlocked = useCallback(
    (id: string) => tasks.some((o) => !isDone(o) && o.linksFrom.some((l) => l.toIssueId === id)),
    [tasks, isDone],
  );

  const value: Ctx = {
    projectId,
    ws,
    tasks,
    visibleTopTasks,
    childrenOf,
    statusById,
    userById,
    isDone,
    filters,
    setFilters,
    activeFilterCount,
    meId,
    openTask,
    openTaskId,
    updateTask,
    setDone,
    isBlocked,
    refresh,
  };
  return <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>;
}
