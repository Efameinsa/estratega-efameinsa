"use client";

import React, { useState } from "react";
import { Crown, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "./workspace-context";
import { ProgressBar, UserAvatar } from "./primitives";

const ROLES: { value: "ADMIN" | "PM" | "MEMBER" | "VIEWER"; label: string; hint: string }[] = [
  { value: "ADMIN", label: "Administrador", hint: "Configura el proyecto y su equipo" },
  { value: "PM", label: "Jefe de proyecto", hint: "Planifica, asigna y valida" },
  { value: "MEMBER", label: "Miembro", hint: "Ejecuta tareas y sube evidencias" },
  { value: "VIEWER", label: "Observador", hint: "Solo consulta el avance" },
];

export function TeamView() {
  const { projectId, ws, meId } = useWorkspace();
  const utils = trpc.useUtils();
  const { data: summary } = trpc.pm.summary.useQuery({ projectId });
  const inval = () => utils.pm.workspace.invalidate({ projectId });
  const add = trpc.pm.addMember.useMutation({ onSuccess: () => { inval(); toast.success("Miembro agregado"); }, onError: (e) => toast.error(e.message) });
  const remove = trpc.pm.removeMember.useMutation({ onSuccess: inval, onError: (e) => toast.error(e.message) });
  const setOwner = trpc.pm.updateProject.useMutation({ onSuccess: inval, onError: (e) => toast.error(e.message) });
  const [pick, setPick] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("MEMBER");

  const memberIds = new Set(ws.project.members.map((m) => m.userId));
  const candidates = ws.users.filter((u) => !memberIds.has(u.id));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-5 px-6 py-5">
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <UserPlus className="size-4 text-primary" /> Agregar al equipo
          </h3>
          <div className="flex flex-wrap gap-2">
            <select value={pick} onChange={(e) => setPick(e.target.value)} className="h-9 min-w-64 flex-1 rounded-md border bg-popover px-2 text-sm">
              <option value="">Elegir persona de la organización…</option>
              {candidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.email}
                </option>
              ))}
            </select>
            <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="h-9 rounded-md border bg-popover px-2 text-sm">
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <Button
              disabled={!pick || add.isPending}
              onClick={() => {
                add.mutate({ projectId, userId: pick, role });
                setPick("");
              }}
            >
              Agregar
            </Button>
          </div>
          {candidates.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Todas las personas de la organización ya están en el proyecto. Invita a más desde Configuración → Miembros.
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="grid grid-cols-[1fr_170px_200px_40px] gap-3 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
            <span>Persona</span>
            <span>Rol</span>
            <span>Avance de sus tareas</span>
            <span />
          </div>
          {ws.project.members.map((m) => {
            const load = summary?.byAssignee.find((a) => a.assigneeId === m.userId);
            const isOwner = ws.project.ownerId === m.userId;
            return (
              <div key={m.id} className="grid grid-cols-[1fr_170px_200px_40px] items-center gap-3 border-b px-4 py-2.5 text-sm last:border-b-0">
                <span className="flex min-w-0 items-center gap-2.5">
                  <UserAvatar user={m.user} size={32} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 truncate font-medium">
                      {m.user.name}
                      {isOwner && (
                        <span title="Responsable del proyecto">
                          <Crown className="size-3.5 text-amber-700" />
                        </span>
                      )}
                      {m.userId === meId && <span className="text-xs font-normal text-muted-foreground">(tú)</span>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{m.user.area ?? m.user.email}</span>
                  </span>
                </span>
                <select
                  value={m.role}
                  onChange={(e) => add.mutate({ projectId, userId: m.userId, role: e.target.value as typeof role })}
                  className="h-8 rounded-md border bg-popover px-2 text-sm"
                  title={ROLES.find((r) => r.value === m.role)?.hint}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <span className="space-y-1">
                  {load ? (
                    <>
                      <ProgressBar value={(load.done / load.total) * 100} color="#1e7f4f" />
                      <span className="block text-xs text-muted-foreground">
                        {load.done}/{load.total} tareas · {Math.round(load.spent * 10) / 10} h
                        {load.overdue > 0 && <span className="text-red-700"> · {load.overdue} vencidas</span>}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin tareas asignadas</span>
                  )}
                  {!isOwner && (
                    <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setOwner.mutate({ projectId, ownerId: m.userId })}>
                      Hacer responsable
                    </button>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => remove.mutate({ projectId, userId: m.userId })}
                  disabled={isOwner}
                  className="text-muted-foreground hover:text-red-700 disabled:opacity-30"
                  aria-label="Quitar del proyecto"
                  title={isOwner ? "No puedes quitar al responsable" : "Quitar del proyecto"}
                >
                  <X className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
