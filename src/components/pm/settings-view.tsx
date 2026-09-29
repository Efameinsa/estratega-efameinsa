"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PROJECT_COLORS, PROJECT_STATUS } from "@/lib/pm";
import { useWorkspace } from "./workspace-context";
import { dateToDay, dayToDate } from "./primitives";
import { EducanetTab } from "@/app/(dashboard)/projects/[projectId]/settings/educanet-tab";

const CATS = [
  { value: "TODO", label: "Pendiente" },
  { value: "IN_PROGRESS", label: "En curso" },
  { value: "DONE", label: "Terminado" },
] as const;

export function SettingsView() {
  const { ws } = useWorkspace();
  // Remonta el formulario cuando el proyecto cambia en el servidor.
  return <SettingsForm key={String(ws.project.updatedAt)} />;
}

function SettingsForm() {
  const { projectId, ws } = useWorkspace();
  const router = useRouter();
  const utils = trpc.useUtils();
  const p = ws.project;
  const inval = () => {
    utils.pm.workspace.invalidate({ projectId });
    utils.pm.tasks.invalidate({ projectId });
  };
  const upd = trpc.pm.updateProject.useMutation({ onSuccess: () => { inval(); toast.success("Proyecto actualizado"); }, onError: (e) => toast.error(e.message) });
  const del = trpc.project.delete.useMutation({ onSuccess: () => { toast.success("Proyecto eliminado"); router.push("/portfolio"); }, onError: (e) => toast.error(e.message) });
  const createSt = trpc.projectConfig.createWorkflowStatus.useMutation({ onSuccess: inval, onError: (e) => toast.error(e.message) });
  const updSt = trpc.projectConfig.updateWorkflowStatus.useMutation({ onSuccess: inval, onError: (e) => toast.error(e.message) });
  const delSt = trpc.projectConfig.deleteWorkflowStatus.useMutation({ onSuccess: inval, onError: (e) => toast.error(e.message) });
  const { data: portfolios = [] } = trpc.portfolio.listAll.useQuery();

  const [form, setForm] = useState({
    name: p.name,
    description: p.description ?? "",
    status: p.status,
    color: p.color ?? "#a78bfa",
    start: dateToDay(p.startDate),
    end: dateToDay(p.endDate),
    portfolioId: p.portfolioId ?? "",
    programId: p.programId ?? "",
  });
  const [confirmDel, setConfirmDel] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const programs = portfolios.find((x) => x.id === form.portfolioId)?.programs ?? [];

  const field = "h-9 w-full rounded-md border bg-transparent px-2.5 text-sm outline-none focus:border-primary/50";

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
        <section className="space-y-4 rounded-xl border bg-card p-5">
          <h3 className="font-medium">General</h3>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Nombre</span>
            <input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Descripción</span>
            <textarea
              rows={4}
              className="w-full rounded-md border bg-transparent p-2.5 text-sm outline-none focus:border-primary/50"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Estado</span>
              <select className={cn(field, "bg-popover")} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(PROJECT_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Inicio</span>
              <input type="date" className={cn(field, "[color-scheme:dark]")} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Fin</span>
              <input type="date" className={cn(field, "[color-scheme:dark]")} value={form.end} min={form.start || undefined} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Portafolio</span>
              <select className={cn(field, "bg-popover")} value={form.portfolioId} onChange={(e) => setForm({ ...form, portfolioId: e.target.value, programId: "" })}>
                <option value="">Sin portafolio</option>
                {portfolios.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Programa</span>
              <select className={cn(field, "bg-popover")} value={form.programId} onChange={(e) => setForm({ ...form, programId: e.target.value })} disabled={!form.portfolioId}>
                <option value="">Sin programa</option>
                {programs.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Color</span>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={cn("size-7 rounded-full ring-offset-2 ring-offset-background", form.color === c && "ring-2 ring-foreground")}
                  style={{ background: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              disabled={!form.name.trim() || upd.isPending}
              onClick={() =>
                upd.mutate({
                  projectId,
                  name: form.name.trim(),
                  description: form.description || null,
                  status: form.status as "ACTIVE",
                  color: form.color,
                  startDate: dayToDate(form.start),
                  endDate: dayToDate(form.end),
                  portfolioId: form.portfolioId || null,
                  programId: form.programId || null,
                })
              }
            >
              Guardar cambios
            </Button>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border bg-card p-5">
          <div>
            <h3 className="font-medium">Estados del flujo de trabajo</h3>
            <p className="text-xs text-muted-foreground">Son las columnas del tablero. La categoría define si una tarea cuenta como pendiente, en curso o terminada.</p>
          </div>
          <div className="space-y-2">
            {p.workflows.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <input
                  type="color"
                  defaultValue={s.color ?? "#94a3b8"}
                  onBlur={(e) => e.target.value !== s.color && updSt.mutate({ id: s.id, color: e.target.value })}
                  className="h-8 w-9 cursor-pointer rounded border bg-transparent"
                  aria-label="Color del estado"
                />
                <input
                  defaultValue={s.name}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== s.name && updSt.mutate({ id: s.id, name: e.target.value.trim() })}
                  className={cn(field, "flex-1")}
                />
                <select
                  value={s.category}
                  onChange={(e) => updSt.mutate({ id: s.id, category: e.target.value as "TODO" })}
                  className={cn(field, "w-36 bg-popover")}
                >
                  {CATS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={p.workflows.length <= 2}
                  onClick={() => delSt.mutate({ id: s.id })}
                  className="rounded p-2 text-muted-foreground hover:text-red-400 disabled:opacity-30"
                  aria-label="Eliminar estado"
                  title="Las tareas de este estado quedarán sin estado"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input value={newStatus} onChange={(e) => setNewStatus(e.target.value)} placeholder="Nuevo estado, p. ej. «Bloqueado»" className={cn(field, "flex-1")} />
              <Button
                variant="outline"
                disabled={!newStatus.trim()}
                onClick={() => {
                  createSt.mutate({ projectId, name: newStatus.trim(), category: "IN_PROGRESS", color: "#f472b6", sortOrder: p.workflows.length });
                  setNewStatus("");
                }}
              >
                <Plus className="size-4" /> Agregar
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h3 className="mb-1 font-medium">Integración con Educanet (opcional)</h3>
          <p className="mb-4 text-xs text-muted-foreground">Si prefieres ejecutar este proyecto en Educanet, puedes enviarlo desde aquí.</p>
          <EducanetTab projectId={projectId} />
        </section>

        <section className="space-y-3 rounded-xl border border-red-500/30 bg-card p-5">
          <h3 className="font-medium text-red-400">Eliminar proyecto</h3>
          <p className="text-xs text-muted-foreground">
            Se borran sus tareas, subtareas, evidencias, comentarios y horas. Escribe <span className="font-mono text-foreground">{p.key}</span> para confirmar.
          </p>
          <div className="flex gap-2">
            <input value={confirmDel} onChange={(e) => setConfirmDel(e.target.value)} className={cn(field, "w-40")} placeholder={p.key} />
            <Button variant="destructive" disabled={confirmDel !== p.key || del.isPending} onClick={() => del.mutate({ id: projectId })}>
              Eliminar definitivamente
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
