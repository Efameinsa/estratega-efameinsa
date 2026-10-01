"use client";

import React, { useMemo, useState } from "react";
import { FileImage, FileText, Paperclip, Search } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./workspace-context";
import { EmptyState } from "./primitives";
import { EvidenceCard, EvidenceDropzone } from "./task-panel";
import { isImage } from "./upload";

export function EvidenceView() {
  const { projectId, ws, tasks, openTask, refresh } = useWorkspace();
  const { data = [], isLoading } = trpc.pm.projectEvidence.useQuery({ projectId });
  const remove = trpc.issue.removeAttachment.useMutation({ onSuccess: refresh, onError: (e) => toast.error(e.message) });
  const note = trpc.pm.updateEvidence.useMutation({ onSuccess: refresh, onError: (e) => toast.error(e.message) });
  const [kind, setKind] = useState<"all" | "img" | "doc">("all");
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<string>("");

  const list = useMemo(
    () =>
      data.filter((a) => {
        const img = isImage(a.mimeType, a.name);
        if (kind === "img" && !img) return false;
        if (kind === "doc" && img) return false;
        if (q && !`${a.name} ${a.note ?? ""} ${a.issue.summary}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [data, kind, q],
  );

  const withoutEvidence = tasks.filter((t) => !t.parentId && t._count.attachments === 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-5 px-6 py-5">
        <div className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-[1fr_1.4fr]">
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <Paperclip className="size-4 text-primary" /> Subir evidencia
            </h3>
            <p className="text-xs text-muted-foreground">
              Cada evidencia queda asociada a una tarea o hito, con su autor y fecha, para sustentar el avance del OCP.
            </p>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="h-9 w-full rounded-md border bg-popover px-2 text-sm"
            >
              <option value="">¿A qué tarea pertenece?</option>
              {tasks
                .filter((t) => !t.parentId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {ws.project.key}-{t.number} · {t.summary}
                  </option>
                ))}
            </select>
            {withoutEvidence.length > 0 && (
              <p className="text-xs text-amber-700">{withoutEvidence.length} tareas aún no tienen evidencia.</p>
            )}
          </div>
          {target ? (
            <EvidenceDropzone issueId={target} onUploaded={refresh} />
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Elige primero la tarea
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-8 w-64 items-center gap-2 rounded-md border px-2">
            <Search className="size-3.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar evidencias…" className="w-full bg-transparent text-sm outline-none" />
          </div>
          {(
            [
              ["all", "Todas", Paperclip],
              ["img", "Imágenes", FileImage],
              ["doc", "Documentos", FileText],
            ] as const
          ).map(([k, l, Icon]) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn("inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm", kind === k ? "border-primary/60 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <Icon className="size-3.5" /> {l}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{list.length} archivos</span>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : list.length === 0 ? (
          <EmptyState
            icon={Paperclip}
            title={data.length ? "Ninguna evidencia coincide" : "Aún no hay evidencias"}
            description="Sube fotos, actas, informes o reportes para demostrar el avance de cada tarea."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((a) => (
              <EvidenceCard
                key={a.id}
                att={a}
                subtitle={`${ws.project.key}-${a.issue.number} · ${a.issue.summary}`}
                onOpenTask={() => openTask(a.issue.id)}
                onRemove={() => remove.mutate({ id: a.id })}
                onNote={(n) => note.mutate({ id: a.id, note: n })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
