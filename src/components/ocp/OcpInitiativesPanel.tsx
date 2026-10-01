"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Briefcase, Send, CheckCircle2, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIAS: { value: string; label: string }[] = [
  { value: "WEBINAR", label: "Webinar" },
  { value: "CAMPANA_MARKETING", label: "Campaña de marketing" },
  { value: "LANZAMIENTO_CURSO", label: "Lanzamiento de curso" },
  { value: "EVENTO_PRESENCIAL", label: "Evento presencial" },
];

function generarKey(nombre: string): string {
  const palabras = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter((p) => p.length > 0);
  const key = palabras.map((p) => p[0]).join("").slice(0, 5);
  return key || "INI";
}

/**
 * Panel de iniciativas asociadas a un OCP. Muestra los Project que cuelgan
 * del OCP, permite crear nuevas iniciativas y enviarlas a Educanet directamente
 * sin pasar por /projects.
 */
export function OcpInitiativesPanel({
  ocpId,
  ocpCode,
  ocpDescription,
}: {
  ocpId: string;
  ocpCode?: string;
  ocpDescription?: string;
}) {
  const utils = trpc.useUtils();
  const { data: initiatives, isLoading } = trpc.project.listByOcp.useQuery({ ocpId });
  const { data: usuarios } = trpc.user.list.useQuery();

  const createProject = trpc.project.create.useMutation({
    onSuccess: () => {
      utils.project.listByOcp.invalidate({ ocpId });
      toast.success("Iniciativa creada");
      setShowDialog(false);
      setName("");
      setDescription("");
      setOwnerId("");
      setStartDate("");
      setEndDate("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteProject = trpc.project.delete.useMutation({
    onSuccess: () => {
      utils.project.listByOcp.invalidate({ ocpId });
      toast.success("Iniciativa eliminada");
    },
    onError: (e) => toast.error(e.message),
  });

  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [categoria, setCategoria] = useState("WEBINAR");
  const [orgSlug, setOrgSlug] = useState("semco");
  const [sendDialog, setSendDialog] = useState<{ id: string; name: string } | null>(null);

  function handleCreate() {
    if (!name.trim() || !ownerId) {
      toast.error("Nombre y responsable son obligatorios");
      return;
    }
    createProject.mutate({
      ocpId,
      key: generarKey(name),
      name: name.trim(),
      description: description.trim() || undefined,
      ownerId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  async function handleSend(projectId: string) {
    setSendingId(projectId);
    try {
      const res = await fetch("/api/external/educanet/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, categoria, orgSlug: orgSlug.trim() }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        duplicate?: boolean;
        tareasCreadas?: number;
      };
      if (data.success) {
        toast.success(
          data.duplicate
            ? "Ya estaba sincronizado"
            : `Enviado: ${data.tareasCreadas ?? 0} tareas en Educanet`,
        );
        utils.project.listByOcp.invalidate({ ocpId });
        setSendDialog(null);
      } else {
        toast.error(data.error ?? "Error al enviar");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSendingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="size-4" />
              Iniciativas del OCP {ocpCode ? `· ${ocpCode}` : ""}
            </CardTitle>
            <CardDescription className="mt-1">
              {ocpDescription
                ? `Proyectos que ejecutan: ${ocpDescription.slice(0, 100)}${ocpDescription.length > 100 ? "…" : ""}`
                : "Proyectos que ejecutan este OCP. Defínelos aquí y envíalos a Educanet para operación."}
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="size-4" />
            Nueva iniciativa
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Cargando...
          </p>
        )}

        {!isLoading && initiatives && initiatives.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Briefcase className="size-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aún no hay iniciativas para este OCP.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {initiatives?.map((p) => {
            const sincronizado = !!p.educanetWorkflowInstanciaId;
            const educanetUrl = sincronizado
              ? `${process.env.NEXT_PUBLIC_EDUCANET_URL ?? "https://educanet-ten.vercel.app"}/proyectos/${p.educanetWorkflowInstanciaId}`
              : null;
            return (
              <div
                key={p.id}
                className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="font-mono text-xs text-muted-foreground">{p.key}</span>
                <Link
                  href={`/projects/${p.id}/overview`}
                  className="flex-1 text-sm font-medium hover:underline"
                >
                  {p.name}
                </Link>
                {p.endDate && (
                  <Badge variant="outline" className="text-xs">
                    {new Date(p.endDate).toLocaleDateString()}
                  </Badge>
                )}
                {sincronizado ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1 text-xs">
                      <CheckCircle2 className="size-3 text-green-700" />
                      En Educanet
                    </Badge>
                    {educanetUrl && (
                      <a
                        href={educanetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        title="Ver en Educanet"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSendDialog({ id: p.id, name: p.name })}
                  >
                    <Send className="size-3.5" />
                    Enviar a Educanet
                  </Button>
                )}
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`¿Eliminar iniciativa "${p.name}"?`)) {
                      deleteProject.mutate({ id: p.id });
                    }
                  }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Dialog crear iniciativa */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva iniciativa del OCP</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Webinar Q2 Ansys"
              />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Qué entrega esta iniciativa"
              />
            </div>
            <div className="space-y-1">
              <Label>Responsable</Label>
              <Select value={ownerId} onValueChange={(v) => setOwnerId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {usuarios?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Inicio</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Fin (hito)</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !ownerId || createProject.isPending}
            >
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog enviar a Educanet */}
      <Dialog open={!!sendDialog} onOpenChange={(o) => !o && setSendDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar a Educanet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Iniciativa: <span className="font-medium text-foreground">{sendDialog?.name}</span>
            </p>
            <div className="space-y-1">
              <Label>Categoría (plantilla en Educanet)</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v ?? "WEBINAR")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Slug de la org en Educanet</Label>
              <Input
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                placeholder="semco"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => sendDialog && handleSend(sendDialog.id)}
              disabled={!!sendingId || !orgSlug.trim()}
            >
              <Send className="size-4" />
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
