"use client";

import React, { useEffect, useRef, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CheckCircle2, Circle, Clock, Diamond, FileText, Link2, MessageSquare, Paperclip, Pause, Play, Plus,
  Trash2, Upload, X, History, ListTree, ChevronRight, Download, Lock, Timer, CornerDownRight,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./workspace-context";
import {
  AssigneePicker, DateRangePicker, PriorityPicker, StatusPicker, UserAvatar, dayToDate, dateToDay, friendlyDate, ProgressBar,
} from "./primitives";
import { formatBytes, isImage, uploadFile } from "./upload";
import { PRIORITY_MAP } from "@/lib/pm";
import type { RouterOutputs } from "./types";

const FIELD_LABELS: Record<string, string> = {
  statusId: "cambió el estado",
  assigneeId: "cambió el responsable",
  priority: "cambió la prioridad",
  dueDate: "cambió el vencimiento",
  startDate: "cambió el inicio",
  summary: "renombró la tarea",
  description: "editó la descripción",
  estimateHours: "cambió la estimación",
  parentId: "movió la tarea",
  created: "creó la tarea",
  evidence: "subió la evidencia",
  sortOrder: "reordenó",
};

function hoursLabel(h: number | null | undefined) {
  const v = h ?? 0;
  const hh = Math.floor(v);
  const mm = Math.round((v - hh) * 60);
  if (hh === 0 && mm === 0) return "0 h";
  return mm ? `${hh} h ${mm} min` : `${hh} h`;
}

export function TaskPanel() {
  const { openTaskId, openTask } = useWorkspace();
  // Panel lateral no modal (como Asana/ClickUp): la vista sigue visible y se puede
  // saltar de una tarea a otra sin cerrarlo. Esc lo cierra.
  useEffect(() => {
    if (!openTaskId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [data-slot=popover-content], [role=dialog]")) return;
      openTask(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openTaskId, openTask]);

  if (!openTaskId) return null;
  return (
    <aside
      aria-label="Detalle de la tarea"
      className="fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l bg-popover shadow-2xl shadow-black/60 animate-in slide-in-from-right-8 fade-in-0 duration-200 sm:w-[min(720px,calc(100vw-80px))]"
    >
      <TaskPanelBody key={openTaskId} taskId={openTaskId} />
    </aside>
  );
}

function TaskPanelBody({ taskId }: { taskId: string }) {
  const { ws, openTask, updateTask, refresh, statusById } = useWorkspace();
  const utils = trpc.useUtils();
  const { data: task, isLoading } = trpc.pm.taskDetail.useQuery({ id: taskId });
  const statuses = ws.project.workflows;

  const invalidate = () => {
    utils.pm.taskDetail.invalidate({ id: taskId });
    refresh();
  };

  const toggle = trpc.pm.toggleComplete.useMutation({ onSuccess: invalidate, onError: (e) => toast.error(e.message) });
  const del = trpc.issue.delete.useMutation({
    onSuccess: () => {
      toast.success("Tarea eliminada");
      openTask(null);
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const [title, setTitle] = useState<string | null>(null);
  const [desc, setDesc] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading || !task) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  const done = task.status?.category === "DONE";
  const milestone = task.type === "MILESTONE";
  const patch = (p: Parameters<typeof updateTask>[1]) => {
    updateTask(task.id, p);
    // refleja el cambio en el panel sin esperar al servidor
    utils.pm.taskDetail.setData({ id: task.id }, (old) =>
      old ? ({ ...old, ...p, status: p.statusId !== undefined ? (statusById.get(p.statusId ?? "") ?? null) : old.status } as typeof old) : old,
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Barra superior */}
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5">
        <Button
          size="sm"
          variant={done ? "secondary" : "outline"}
          onClick={() => toggle.mutate({ id: task.id, done: !done })}
          className={cn(done && "text-green-400")}
        >
          <CheckCircle2 className="size-4" />
          {done ? "Completada" : "Marcar como completada"}
        </Button>
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <span className="font-mono">
            {ws.project.key}-{task.number}
          </span>
          {confirmDelete ? (
            <span className="ml-2 flex items-center gap-1">
              ¿Eliminar?
              <Button size="xs" variant="destructive" onClick={() => del.mutate({ id: task.id })}>
                Sí, eliminar
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setConfirmDelete(false)}>
                No
              </Button>
            </span>
          ) : (
            <Button size="icon-sm" variant="ghost" onClick={() => setConfirmDelete(true)} aria-label="Eliminar tarea">
              <Trash2 className="size-4" />
            </Button>
          )}
          <Button size="icon-sm" variant="ghost" onClick={() => openTask(null)} aria-label="Cerrar">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 px-6 py-5">
          {task.parent && (
            <button
              type="button"
              onClick={() => openTask(task.parent!.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CornerDownRight className="size-3.5" />
              Subtarea de <span className="font-medium text-foreground">{task.parent.summary}</span>
            </button>
          )}

          {/* Título */}
          <div className="flex items-start gap-2">
            {milestone && <Diamond className="mt-2 size-5 shrink-0 text-amber-300" fill="currentColor" />}
            <textarea
              value={title ?? task.summary}
              rows={1}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (title !== null && title.trim() && title.trim() !== task.summary) patch({ summary: title.trim() });
                setTitle(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (e.target as HTMLTextAreaElement).blur();
                }
              }}
              className={cn(
                "field-sizing-content w-full resize-none rounded-md bg-transparent px-1 text-xl font-semibold leading-snug outline-none hover:bg-accent/40 focus:bg-accent/40",
                done && "text-muted-foreground line-through",
              )}
            />
          </div>

          {/* Campos */}
          <dl className="grid grid-cols-[120px_1fr] items-center gap-x-4 gap-y-2.5 text-sm">
            <dt className="text-muted-foreground">Estado</dt>
            <dd>
              <StatusPicker statuses={statuses} value={task.statusId} onChange={(id) => patch({ statusId: id })} />
            </dd>
            <dt className="text-muted-foreground">Responsable</dt>
            <dd>
              <AssigneePicker users={ws.users} value={task.assigneeId} onChange={(id) => patch({ assigneeId: id })} showName />
            </dd>
            <dt className="text-muted-foreground">{milestone ? "Fecha del hito" : "Fechas"}</dt>
            <dd>
              <DateRangePicker
                start={task.startDate}
                due={task.dueDate}
                done={done}
                milestone={milestone}
                onChange={(v) => patch(v)}
                placeholder="Sin fechas"
              />
            </dd>
            <dt className="text-muted-foreground">Prioridad</dt>
            <dd>
              <PriorityPicker value={task.priority} onChange={(v) => patch({ priority: v })} showLabel />
            </dd>
            <dt className="text-muted-foreground">Estimación</dt>
            <dd>
              <EstimateInput key={String(task.estimateHours)} value={task.estimateHours} onSave={(v) => patch({ estimateHours: v })} />
            </dd>
            <dt className="text-muted-foreground">Tiempo</dt>
            <dd className="flex items-center gap-3">
              <span>{hoursLabel(task.timeSpent)}</span>
              {task.estimateHours ? (
                <div className="flex w-40 items-center gap-2">
                  <ProgressBar
                    value={((task.timeSpent ?? 0) / task.estimateHours) * 100}
                    color={(task.timeSpent ?? 0) > task.estimateHours ? "#f87171" : undefined}
                  />
                  <span className="text-xs text-muted-foreground">
                    {Math.round(((task.timeSpent ?? 0) / task.estimateHours) * 100)}%
                  </span>
                </div>
              ) : null}
            </dd>
          </dl>

          {/* Descripción */}
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Descripción</h3>
            <textarea
              value={desc ?? task.description ?? ""}
              onChange={(e) => setDesc(e.target.value)}
              onBlur={() => {
                if (desc !== null && desc !== (task.description ?? "")) patch({ description: desc || null });
                setDesc(null);
              }}
              placeholder="¿De qué trata esta tarea? Agrega contexto, criterios de aceptación, enlaces…"
              className="field-sizing-content min-h-20 w-full resize-none rounded-lg border bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary/50"
            />
          </section>

          {!task.parentId && <Subtasks task={task} onChanged={invalidate} />}

          <Dependencies task={task} onChanged={invalidate} />

          <Evidence task={task} onChanged={invalidate} />

          <TimeTracking task={task} onChanged={invalidate} />

          <Conversation task={task} onChanged={invalidate} />
        </div>
      </div>
    </div>
  );
}

type Detail = RouterOutputs["pm"]["taskDetail"];

function EstimateInput({ value, onSave }: { value: number | null; onSave: (v: number | null) => void }) {
  const [v, setV] = useState(value != null ? String(value) : "");
  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        step={0.5}
        value={v}
        placeholder="—"
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const n = v === "" ? null : Math.max(0, Number(v));
          if (n !== value) onSave(Number.isNaN(n) ? null : n);
        }}
        className="h-7 w-20 rounded-md border bg-transparent px-2 text-sm outline-none focus:border-primary/50"
      />
      <span className="text-xs text-muted-foreground">horas</span>
    </span>
  );
}

// ---------------------------------------------------------------- Subtareas

function Subtasks({ task, onChanged }: { task: Detail; onChanged: () => void }) {
  const { ws, projectId, openTask, updateTask } = useWorkspace();
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const create = trpc.pm.createTask.useMutation({ onSuccess: onChanged, onError: (e) => toast.error(e.message) });
  const toggle = trpc.pm.toggleComplete.useMutation({ onSuccess: onChanged, onError: (e) => toast.error(e.message) });
  const doneCount = task.children.filter((c) => c.status?.category === "DONE").length;

  const submit = () => {
    const s = text.trim();
    if (!s) return;
    create.mutate({ projectId, summary: s, parentId: task.id });
    setText("");
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-3">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <ListTree className="size-4 text-muted-foreground" /> Subtareas
        </h3>
        {task.children.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground">
              {doneCount}/{task.children.length}
            </span>
            <ProgressBar value={(doneCount / task.children.length) * 100} className="max-w-32" color="#4ade80" />
          </>
        )}
      </div>
      <div className="divide-y rounded-lg border">
        {task.children.map((c) => {
          const cDone = c.status?.category === "DONE";
          return (
            <div key={c.id} className="group flex items-center gap-2 px-3 py-1.5 hover:bg-accent/30">
              <button
                type="button"
                onClick={() => toggle.mutate({ id: c.id, done: !cDone })}
                className={cn("shrink-0", cDone ? "text-green-400" : "text-muted-foreground hover:text-foreground")}
                aria-label={cDone ? "Reabrir subtarea" : "Completar subtarea"}
              >
                {cDone ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
              </button>
              <button
                type="button"
                onClick={() => openTask(c.id)}
                className={cn("min-w-0 flex-1 truncate text-left text-sm", cDone && "text-muted-foreground line-through")}
              >
                {c.summary}
              </button>
              <DateRangePicker
                start={null}
                due={c.dueDate}
                done={cDone}
                milestone
                placeholder=""
                onChange={(v) => {
                  updateTask(c.id, { dueDate: v.dueDate });
                  setTimeout(onChanged, 300);
                }}
              />
              <AssigneePicker
                users={ws.users}
                value={c.assigneeId}
                size={22}
                onChange={(id) => {
                  updateTask(c.id, { assigneeId: id });
                  setTimeout(onChanged, 300);
                }}
              />
              <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </div>
          );
        })}
        {adding || task.children.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-1.5">
            <Plus className="size-4 text-muted-foreground" />
            <input
              autoFocus={adding}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") setAdding(false);
              }}
              onBlur={() => {
                submit();
                setAdding(false);
              }}
              placeholder="Agregar subtarea y pulsar Enter"
              className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent/30 hover:text-foreground"
          >
            <Plus className="size-4" /> Agregar subtarea
          </button>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Dependencias

function Dependencies({ task, onChanged }: { task: Detail; onChanged: () => void }) {
  const { tasks, ws, openTask } = useWorkspace();
  const [picking, setPicking] = useState<"blockedBy" | "blocks" | null>(null);
  const add = trpc.pm.addDependency.useMutation({ onSuccess: onChanged, onError: (e) => toast.error(e.message) });
  const remove = trpc.issue.removeLink.useMutation({ onSuccess: onChanged, onError: (e) => toast.error(e.message) });

  const blockedBy = task.linksTo.filter((l) => l.type === "BLOCKS");
  const blocks = task.linksFrom.filter((l) => l.type === "BLOCKS");
  const linkedIds = new Set([task.id, ...blockedBy.map((l) => l.fromIssue.id), ...blocks.map((l) => l.toIssue.id)]);
  const candidates = tasks.filter((t) => !linkedIds.has(t.id) && !t.parentId);

  const Row = ({ id, linkId, number, summary, doneCat }: { id: string; linkId: string; number: number; summary: string; doneCat: boolean }) => (
    <div className="group flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent/30">
      {doneCat ? <CheckCircle2 className="size-4 text-green-400" /> : <Lock className="size-3.5 text-amber-300" />}
      <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => openTask(id)}>
        <span className="mr-1.5 font-mono text-xs text-muted-foreground">
          {ws.project.key}-{number}
        </span>
        {summary}
      </button>
      <button
        type="button"
        onClick={() => remove.mutate({ id: linkId })}
        className="text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
        aria-label="Quitar dependencia"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Link2 className="size-4 text-muted-foreground" /> Dependencias
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["blockedBy", "blocks"] as const).map((kind) => {
          const list = kind === "blockedBy" ? blockedBy : blocks;
          return (
            <div key={kind} className="rounded-lg border">
              <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs text-muted-foreground">
                {kind === "blockedBy" ? "Esperando a (antes de empezar)" : "Bloquea a"}
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={() => setPicking(picking === kind ? null : kind)}
                >
                  <Plus className="size-3.5" /> Agregar
                </button>
              </div>
              {list.length === 0 && picking !== kind && <p className="px-3 py-2 text-xs text-muted-foreground/70">Ninguna</p>}
              {kind === "blockedBy"
                ? blockedBy.map((l) => (
                    <Row key={l.id} id={l.fromIssue.id} linkId={l.id} number={l.fromIssue.number} summary={l.fromIssue.summary} doneCat={l.fromIssue.status?.category === "DONE"} />
                  ))
                : blocks.map((l) => (
                    <Row key={l.id} id={l.toIssue.id} linkId={l.id} number={l.toIssue.number} summary={l.toIssue.summary} doneCat={l.toIssue.status?.category === "DONE"} />
                  ))}
              {picking === kind && (
                <select
                  autoFocus
                  className="m-2 h-8 w-[calc(100%-1rem)] rounded-md border bg-popover px-2 text-sm"
                  defaultValue=""
                  onChange={(e) => {
                    const other = e.target.value;
                    if (!other) return;
                    add.mutate(kind === "blockedBy" ? { fromIssueId: other, toIssueId: task.id } : { fromIssueId: task.id, toIssueId: other });
                    setPicking(null);
                  }}
                >
                  <option value="">Elegir tarea…</option>
                  {candidates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {ws.project.key}-{t.number} · {t.summary}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Evidencias

export function EvidenceDropzone({ issueId, onUploaded, compact = false }: { issueId: string; onUploaded: () => void; compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [uploads, setUploads] = useState<{ name: string; pct: number }[]>([]);
  const addEvidence = trpc.pm.addEvidence.useMutation();

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    for (const f of arr) {
      setUploads((u) => [...u, { name: f.name, pct: 0 }]);
      try {
        const up = await uploadFile(f, (pct) => setUploads((u) => u.map((x) => (x.name === f.name ? { ...x, pct } : x))));
        await addEvidence.mutateAsync({ issueId, name: up.name, url: up.url, size: up.size, mimeType: up.mimeType });
        toast.success(`Evidencia subida: ${f.name}`);
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message}`);
      } finally {
        setUploads((u) => u.filter((x) => x.name !== f.name));
      }
    }
    onUploaded();
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-center transition-colors",
        compact ? "px-3 py-3" : "px-4 py-6",
        drag ? "border-primary bg-primary/10" : "hover:border-primary/50 hover:bg-accent/30",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <Upload className="size-5 text-muted-foreground" />
      <p className="text-sm">
        <span className="font-medium text-primary">Sube archivos</span> o arrástralos aquí
      </p>
      {!compact && <p className="text-xs text-muted-foreground">Fotos, actas, informes, PDF, Excel…</p>}
      {uploads.map((u) => (
        <div key={u.name} className="mt-2 w-full max-w-xs space-y-1 text-left">
          <p className="truncate text-xs text-muted-foreground">{u.name}</p>
          <ProgressBar value={u.pct || 15} />
        </div>
      ))}
    </div>
  );
}

export function EvidenceCard({
  att,
  onRemove,
  onNote,
  subtitle,
  onOpenTask,
}: {
  att: { id: string; name: string; url: string; size: number | null; mimeType: string | null; note: string | null; createdAt: Date; uploadedBy: string | null };
  onRemove?: () => void;
  onNote?: (note: string | null) => void;
  subtitle?: React.ReactNode;
  onOpenTask?: () => void;
}) {
  const { userById } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(att.note ?? "");
  const img = isImage(att.mimeType, att.name);
  const uploader = att.uploadedBy ? userById.get(att.uploadedBy) : null;
  return (
    <div className="group overflow-hidden rounded-lg border bg-card">
      <a href={att.url} target="_blank" rel="noopener noreferrer" className="block">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={att.url} alt={att.name} className="h-32 w-full object-cover" />
        ) : (
          <div className="flex h-32 w-full flex-col items-center justify-center gap-1 bg-muted/50">
            <FileText className="size-8 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">
              {att.name.split(".").pop()?.slice(0, 5)}
            </span>
          </div>
        )}
      </a>
      <div className="space-y-1 p-2.5">
        <div className="flex items-start gap-1">
          <a href={att.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium hover:underline" title={att.name}>
            {att.name}
          </a>
          <a href={att.url} download={att.name} className="text-muted-foreground hover:text-foreground" aria-label="Descargar">
            <Download className="size-3.5" />
          </a>
          {onRemove && (
            <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-red-400" aria-label="Eliminar evidencia">
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
        {subtitle && (
          <button type="button" onClick={onOpenTask} className="block w-full truncate text-left text-xs text-primary hover:underline">
            {subtitle}
          </button>
        )}
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {uploader && <UserAvatar user={uploader} size={16} />}
          {uploader?.name ?? "—"} · {formatDistanceToNow(new Date(att.createdAt), { locale: es, addSuffix: true })}
          {att.size ? ` · ${formatBytes(att.size)}` : ""}
        </p>
        {onNote &&
          (editing ? (
            <textarea
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => {
                setEditing(false);
                if (note !== (att.note ?? "")) onNote(note || null);
              }}
              rows={2}
              placeholder="¿Qué demuestra esta evidencia?"
              className="w-full resize-none rounded border bg-transparent p-1.5 text-xs outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={cn("block w-full text-left text-xs", att.note ? "text-foreground/80" : "text-muted-foreground/60 hover:text-muted-foreground")}
            >
              {att.note || "+ Agregar nota"}
            </button>
          ))}
      </div>
    </div>
  );
}

function Evidence({ task, onChanged }: { task: Detail; onChanged: () => void }) {
  const remove = trpc.issue.removeAttachment.useMutation({ onSuccess: onChanged, onError: (e) => toast.error(e.message) });
  const note = trpc.pm.updateEvidence.useMutation({ onSuccess: onChanged, onError: (e) => toast.error(e.message) });
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Paperclip className="size-4 text-muted-foreground" /> Evidencias
        {task.attachments.length > 0 && <span className="text-xs font-normal text-muted-foreground">{task.attachments.length}</span>}
      </h3>
      {task.attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {task.attachments.map((a) => (
            <EvidenceCard
              key={a.id}
              att={a}
              onRemove={() => remove.mutate({ id: a.id })}
              onNote={(n) => note.mutate({ id: a.id, note: n })}
            />
          ))}
        </div>
      )}
      <EvidenceDropzone issueId={task.id} onUploaded={onChanged} compact={task.attachments.length > 0} />
    </section>
  );
}

// ---------------------------------------------------------------- Tiempo

const TIMER_KEY = "estratega-timer";
type TimerState = { issueId: string; startedAt: number } | null;
function readTimer(): TimerState {
  try {
    return JSON.parse(localStorage.getItem(TIMER_KEY) || "null");
  } catch {
    return null;
  }
}
function writeTimer(t: TimerState) {
  try {
    if (t) localStorage.setItem(TIMER_KEY, JSON.stringify(t));
    else localStorage.removeItem(TIMER_KEY);
  } catch {}
}

function TimeTracking({ task, onChanged }: { task: Detail; onChanged: () => void }) {
  const { userById, meId } = useWorkspace();
  const log = trpc.issue.logTime.useMutation({ onSuccess: onChanged, onError: (e) => toast.error(e.message) });
  const del = trpc.pm.deleteTimeEntry.useMutation({ onSuccess: onChanged, onError: (e) => toast.error(e.message) });
  const [timer, setTimer] = useState<TimerState>(null);
  const [now, setNow] = useState(Date.now());
  const [showManual, setShowManual] = useState(false);
  const [hours, setHours] = useState("1");
  const [day, setDay] = useState(dateToDay(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12))));
  const [notes, setNotes] = useState("");

  useEffect(() => setTimer(readTimer()), []);
  useEffect(() => {
    if (!timer) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [timer]);

  const runningHere = timer?.issueId === task.id;
  const elapsed = runningHere ? Math.floor((now - timer!.startedAt) / 1000) : 0;
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const start = () => {
    const t = { issueId: task.id, startedAt: Date.now() };
    writeTimer(t);
    setTimer(t);
    setNow(Date.now());
  };
  const stop = () => {
    const h = Math.max(1 / 60, (Date.now() - (timer?.startedAt ?? Date.now())) / 3_600_000);
    writeTimer(null);
    setTimer(null);
    log.mutate({ issueId: task.id, hours: Math.round(h * 100) / 100, date: new Date(), notes: "Cronómetro" });
  };

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Clock className="size-4 text-muted-foreground" /> Registro de tiempo
        <span className="text-xs font-normal text-muted-foreground">
          {hoursLabel(task.timeSpent)}
          {task.estimateHours ? ` de ${hoursLabel(task.estimateHours)} estimadas` : ""}
        </span>
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {runningHere ? (
          <Button size="sm" variant="destructive" onClick={stop}>
            <Pause className="size-4" /> Detener · <span className="font-mono">{hh}:{mm}:{ss}</span>
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={start} disabled={!!timer && !runningHere} title={timer ? "Hay un cronómetro activo en otra tarea" : undefined}>
            <Play className="size-4" /> Iniciar cronómetro
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setShowManual((v) => !v)}>
          <Timer className="size-4" /> Registrar manualmente
        </Button>
        {timer && !runningHere && <span className="text-xs text-amber-300">Hay un cronómetro corriendo en otra tarea</span>}
      </div>
      {showManual && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">Horas</span>
            <input type="number" min={0.25} step={0.25} value={hours} onChange={(e) => setHours(e.target.value)} className="h-8 w-20 rounded-md border bg-transparent px-2 text-sm" />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">Fecha</span>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="h-8 rounded-md border bg-transparent px-2 text-sm [color-scheme:dark]" />
          </label>
          <label className="min-w-40 flex-1 space-y-1">
            <span className="block text-xs text-muted-foreground">¿Qué hiciste?</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" className="h-8 w-full rounded-md border bg-transparent px-2 text-sm" />
          </label>
          <Button
            size="sm"
            onClick={() => {
              const h = Number(hours);
              if (!h || h <= 0) return toast.error("Ingresa las horas");
              log.mutate({ issueId: task.id, hours: h, date: dayToDate(day) ?? new Date(), notes: notes || undefined });
              setNotes("");
              setShowManual(false);
            }}
          >
            Guardar
          </Button>
        </div>
      )}
      {task.timeEntries.length > 0 && (
        <div className="divide-y rounded-lg border text-sm">
          {task.timeEntries.map((t) => {
            const u = userById.get(t.userId);
            return (
              <div key={t.id} className="group flex items-center gap-2 px-3 py-1.5">
                <UserAvatar user={u ?? null} size={20} />
                <span className="w-28 truncate">{u?.name ?? "—"}</span>
                <span className="w-20 font-medium">{hoursLabel(t.hours)}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{t.notes}</span>
                <span className="text-xs text-muted-foreground">{friendlyDate(t.date)}</span>
                {t.userId === meId && (
                  <button type="button" onClick={() => del.mutate({ id: t.id })} className="text-muted-foreground opacity-0 hover:text-red-400 group-hover:opacity-100" aria-label="Borrar registro">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Comentarios + actividad

function Conversation({ task, onChanged }: { task: Detail; onChanged: () => void }) {
  const { userById, statusById, meId } = useWorkspace();
  const [tab, setTab] = useState<"comments" | "activity">("comments");
  const [body, setBody] = useState("");
  const add = trpc.issue.addComment.useMutation({ onSuccess: onChanged, onError: (e) => toast.error(e.message) });
  const del = trpc.issue.deleteComment.useMutation({ onSuccess: onChanged, onError: (e) => toast.error(e.message) });
  const me = meId ? userById.get(meId) : null;

  const describe = (h: Detail["history"][number]) => {
    const who = h.userId ? userById.get(h.userId)?.name ?? "Alguien" : "Alguien";
    const label = FIELD_LABELS[h.field] ?? `cambió ${h.field}`;
    let detail = "";
    if (h.field === "statusId") detail = `→ ${statusById.get(h.newValue ?? "")?.name ?? "—"}`;
    else if (h.field === "assigneeId") detail = `→ ${h.newValue ? userById.get(h.newValue)?.name ?? "—" : "sin asignar"}`;
    else if (h.field === "priority") detail = `→ ${PRIORITY_MAP[h.newValue ?? ""]?.label ?? h.newValue}`;
    else if (h.field === "dueDate" || h.field === "startDate") detail = h.newValue ? `→ ${friendlyDate(h.newValue)}` : "→ sin fecha";
    else if (h.field === "evidence") detail = `«${h.newValue}»`;
    else if (h.field === "estimateHours") detail = h.newValue ? `→ ${h.newValue} h` : "";
    return { who, label, detail };
  };

  const activity = task.history.filter((h) => h.field !== "sortOrder" && h.field !== "description");

  return (
    <section className="space-y-3 border-t pt-4">
      <div className="flex gap-1">
        {(
          [
            ["comments", `Comentarios${task.comments.length ? ` (${task.comments.length})` : ""}`, MessageSquare],
            ["activity", "Actividad", History],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm",
              tab === k ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "comments" ? (
        <div className="space-y-3">
          {task.comments.length === 0 && <p className="text-xs text-muted-foreground">Aún no hay comentarios. Usa este espacio para coordinar con el equipo.</p>}
          {task.comments.map((c) => {
            const u = userById.get(c.authorId);
            return (
              <div key={c.id} className="group flex gap-2.5">
                <UserAvatar user={u ?? null} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs">
                    <span className="font-medium">{u?.name ?? "Usuario"}</span>{" "}
                    <span className="text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { locale: es, addSuffix: true })}</span>
                    {c.authorId === meId && (
                      <button type="button" onClick={() => del.mutate({ id: c.id })} className="ml-2 text-muted-foreground opacity-0 hover:text-red-400 group-hover:opacity-100">
                        Eliminar
                      </button>
                    )}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap rounded-lg bg-muted/60 px-3 py-2 text-sm">{c.body}</p>
                </div>
              </div>
            );
          })}
          <div className="flex gap-2.5">
            <UserAvatar user={me ?? null} size={28} />
            <div className="flex-1 space-y-2">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && body.trim()) {
                    add.mutate({ issueId: task.id, body: body.trim() });
                    setBody("");
                  }
                }}
                placeholder="Escribe un comentario… (Ctrl + Enter para enviar)"
                className="field-sizing-content min-h-16 w-full resize-none rounded-lg border bg-transparent p-2.5 text-sm outline-none focus:border-primary/50"
              />
              {body.trim() && (
                <Button
                  size="sm"
                  onClick={() => {
                    add.mutate({ issueId: task.id, body: body.trim() });
                    setBody("");
                  }}
                >
                  Comentar
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <ol className="space-y-2.5 border-l pl-4">
          {activity.map((h) => {
            const d = describe(h);
            return (
              <li key={h.id} className="relative text-xs">
                <span className="absolute top-1 -left-[21px] size-2 rounded-full bg-muted-foreground/50" />
                <span className="font-medium text-foreground">{d.who}</span> <span className="text-muted-foreground">{d.label}</span>{" "}
                <span className="text-foreground/80">{d.detail}</span>
                <span className="ml-2 text-muted-foreground/70" title={format(new Date(h.createdAt), "PPpp", { locale: es })}>
                  {formatDistanceToNow(new Date(h.createdAt), { locale: es, addSuffix: true })}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

