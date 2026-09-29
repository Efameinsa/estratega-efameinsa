"use client";

import React, { useEffect, useState } from "react";
import { Diamond, Plus, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./workspace-context";
import { AssigneePicker, DateRangePicker, PriorityPicker, StatusPicker } from "./primitives";

export function NewTaskButton() {
  const { projectId, ws, refresh, openTask, meId } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [type, setType] = useState<"TASK" | "MILESTONE">("TASK");
  const [statusId, setStatusId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [priority, setPriority] = useState("MEDIUM");
  const [dates, setDates] = useState<{ startDate: Date | null; dueDate: Date | null }>({ startDate: null, dueDate: null });
  const [estimate, setEstimate] = useState("");

  const reset = () => {
    setSummary("");
    setType("TASK");
    setStatusId(ws.project.workflows[0]?.id ?? null);
    setAssigneeId(meId);
    setPriority("MEDIUM");
    setDates({ startDate: null, dueDate: null });
    setEstimate("");
  };

  // Atajo: tecla N abre el formulario (si no se está escribiendo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key.toLowerCase() !== "n" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (el.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      e.preventDefault();
      reset();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.project.workflows, meId]);

  const create = trpc.pm.createTask.useMutation({
    onSuccess: (t, vars) => {
      refresh();
      toast.success(vars.type === "MILESTONE" ? "Hito creado" : "Tarea creada", {
        action: { label: "Abrir", onClick: () => openTask(t.id) },
      });
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = (keepOpen: boolean) => {
    if (!summary.trim()) return;
    create.mutate({
      projectId,
      summary: summary.trim(),
      type,
      statusId,
      assigneeId,
      priority,
      startDate: type === "MILESTONE" ? dates.dueDate : dates.startDate,
      dueDate: dates.dueDate,
      estimateHours: estimate ? Number(estimate) : null,
    });
    if (keepOpen) setSummary("");
    else setOpen(false);
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        title="Nueva tarea (N)"
      >
        <Plus className="size-4" /> Nueva tarea
        <kbd className="ml-1 hidden rounded bg-primary-foreground/15 px-1 text-[10px] sm:inline">N</kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{type === "MILESTONE" ? "Nuevo hito" : "Nueva tarea"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex rounded-lg border p-0.5 text-sm">
              {(
                [
                  ["TASK", "Tarea", CheckSquare],
                  ["MILESTONE", "Hito", Diamond],
                ] as const
              ).map(([k, l, Icon]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setType(k)}
                  className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5", type === k ? "bg-accent text-foreground" : "text-muted-foreground")}
                >
                  <Icon className="size-4" /> {l}
                </button>
              ))}
            </div>
            <input
              autoFocus
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit(e.shiftKey);
              }}
              placeholder={type === "MILESTONE" ? "Ej: Informe trimestral aprobado por gerencia" : "Ej: Diseñar la campaña de captación Q2"}
              className="h-10 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus:border-primary/50"
            />
            <div className="grid grid-cols-[110px_1fr] items-center gap-x-3 gap-y-2.5 text-sm">
              <span className="text-muted-foreground">Estado</span>
              <span>
                <StatusPicker statuses={ws.project.workflows} value={statusId} onChange={setStatusId} />
              </span>
              <span className="text-muted-foreground">Responsable</span>
              <span>
                <AssigneePicker users={ws.users} value={assigneeId} onChange={setAssigneeId} showName />
              </span>
              <span className="text-muted-foreground">{type === "MILESTONE" ? "Fecha" : "Fechas"}</span>
              <span>
                <DateRangePicker start={dates.startDate} due={dates.dueDate} milestone={type === "MILESTONE"} onChange={setDates} placeholder="Elegir fechas" />
              </span>
              <span className="text-muted-foreground">Prioridad</span>
              <span>
                <PriorityPicker value={priority} onChange={setPriority} showLabel />
              </span>
              {type === "TASK" && (
                <>
                  <span className="text-muted-foreground">Estimación</span>
                  <span className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={estimate}
                      onChange={(e) => setEstimate(e.target.value)}
                      placeholder="—"
                      className="h-8 w-20 rounded-md border bg-transparent px-2 text-sm outline-none"
                    />
                    <span className="text-xs text-muted-foreground">horas</span>
                  </span>
                </>
              )}
            </div>
          </div>
          <DialogFooter className="items-center gap-2 sm:justify-between">
            <span className="hidden text-xs text-muted-foreground sm:block">Shift + Enter crea y sigue agregando</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button disabled={!summary.trim() || create.isPending} onClick={() => submit(false)}>
                Crear
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
