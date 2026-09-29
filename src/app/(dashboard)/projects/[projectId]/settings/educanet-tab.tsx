"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ExternalLink, Send } from "lucide-react";

type Categoria =
  | "WEBINAR"
  | "CAMPANA_MARKETING"
  | "LANZAMIENTO_CURSO"
  | "EVENTO_PRESENCIAL";

type Negocio =
  | "ANSYS"
  | "AUTODESK_MFG"
  | "AUTODESK_AEC"
  | "ORACLE"
  | "INGE3D"
  | "LYRACODE"
  | "CURSOS"
  | "";

const CATEGORIA_OPTIONS: { value: Categoria; label: string }[] = [
  { value: "WEBINAR", label: "Webinar" },
  { value: "CAMPANA_MARKETING", label: "Campaña de marketing" },
  { value: "LANZAMIENTO_CURSO", label: "Lanzamiento de curso" },
  { value: "EVENTO_PRESENCIAL", label: "Evento presencial" },
];

const NEGOCIO_OPTIONS: { value: Negocio; label: string }[] = [
  { value: "", label: "Sin negocio específico" },
  { value: "ANSYS", label: "Ansys" },
  { value: "AUTODESK_MFG", label: "Autodesk MFG" },
  { value: "AUTODESK_AEC", label: "Autodesk AEC" },
  { value: "ORACLE", label: "Oracle" },
  { value: "INGE3D", label: "Inge3D" },
  { value: "LYRACODE", label: "Lyracode" },
  { value: "CURSOS", label: "Cursos" },
];

export function EducanetTab({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const { data: project } = trpc.project.getById.useQuery({ id: projectId });

  const proj = project as
    | (NonNullable<typeof project> & {
        educanetCategoria?: string | null;
        educanetWorkflowInstanciaId?: string | null;
        educanetSyncedAt?: string | Date | null;
        educanetOrgSlug?: string | null;
      })
    | undefined;

  const [categoria, setCategoria] = useState<Categoria>(
    (proj?.educanetCategoria as Categoria) ?? "WEBINAR",
  );
  const [orgSlug, setOrgSlug] = useState(proj?.educanetOrgSlug ?? "semco");
  const [negocio, setNegocio] = useState<Negocio>("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    url?: string;
  } | null>(null);

  if (!proj) return null;

  const syncedAt = proj.educanetSyncedAt ? new Date(proj.educanetSyncedAt) : null;
  const yaSincronizado = !!proj.educanetWorkflowInstanciaId;

  async function handleSend() {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/external/educanet/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          categoria,
          orgSlug: orgSlug.trim(),
          negocio: negocio || undefined,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        educanetUrl?: string;
        workflowInstanciaId?: string;
        duplicate?: boolean;
        tareasCreadas?: number;
      };
      if (data.success) {
        setResult({
          ok: true,
          message: data.duplicate
            ? "Ya estaba sincronizado. Referencia actualizada."
            : `Enviado: ${data.tareasCreadas ?? 0} tareas creadas en Educanet`,
          url: data.educanetUrl,
        });
        utils.project.getById.invalidate({ id: projectId });
      } else {
        setResult({
          ok: false,
          message: data.error ?? "Error al enviar",
        });
      }
    } catch (err) {
      setResult({
        ok: false,
        message: (err as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Educanet</CardTitle>
        <CardDescription>
          Envía este proyecto a Educanet para que el equipo lo ejecute como flujo
          de trabajo operativo (tareas con responsables, fechas y Gantt).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {yaSincronizado && (
          <div className="rounded-md border bg-transparent dark:bg-transparent p-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="size-4 text-green-400 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-green-300 dark:text-green-100">
                  Sincronizado con Educanet
                </p>
                <p className="text-xs text-green-300 dark:text-green-300 mt-1">
                  Última sincronización:{" "}
                  {syncedAt ? syncedAt.toLocaleString() : "—"}
                </p>
                {proj.educanetCategoria && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {proj.educanetCategoria}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <Label>Categoría (debe coincidir con una WorkflowPlantilla en Educanet)</Label>
          <Select
            value={categoria}
            onValueChange={(v) => setCategoria((v as Categoria) ?? "WEBINAR")}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIA_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Slug de la organización en Educanet</Label>
          <Input
            value={orgSlug}
            onChange={(e) => setOrgSlug(e.target.value)}
            placeholder="semco"
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground">
            Cada cliente tiene su propia org en Educanet identificada por slug.
          </p>
        </div>

        <div className="space-y-1">
          <Label>Negocio / marca (opcional)</Label>
          <Select
            value={negocio || "__none__"}
            onValueChange={(v) => setNegocio(v === "__none__" ? "" : ((v as Negocio) ?? ""))}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin negocio específico</SelectItem>
              {NEGOCIO_OPTIONS.filter((o) => o.value !== "").map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={handleSend}
            disabled={isLoading || !orgSlug.trim()}
          >
            <Send className="size-4" />
            {yaSincronizado ? "Reenviar a Educanet" : "Enviar a Educanet"}
          </Button>
          {result?.url && (
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Ver en Educanet <ExternalLink className="size-3" />
            </a>
          )}
        </div>

        {result && (
          <div
            className={`rounded-md border p-3 text-sm ${
              result.ok
                ? "border-green-500/30 bg-transparent text-green-300 dark:border-green-900 dark:bg-transparent dark:text-green-100"
                : "border-red-500/30 bg-transparent text-red-300 dark:border-red-900 dark:bg-transparent dark:text-red-100"
            }`}
          >
            {result.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
