"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock, Edit2, Plus, Star, Trash2 } from "lucide-react";

interface VisionForm {
  text: string;
  timeHorizon: number | undefined;
}

const emptyForm: VisionForm = { text: "", timeHorizon: undefined };

export default function VisionPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const utils = trpc.useUtils();

  const { data: visions, isLoading } = trpc.vision.list.useQuery({ cycleId });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VisionForm>({ ...emptyForm });

  const createVision = trpc.vision.create.useMutation({
    onSuccess: () => {
      utils.vision.list.invalidate({ cycleId });
      utils.vision.getActive.invalidate({ cycleId });
      resetForm();
      toast.success("Visión creada");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateVision = trpc.vision.update.useMutation({
    onMutate: async (vars) => {
      if (vars.isActive === undefined) return;
      await utils.vision.list.cancel({ cycleId });
      await utils.vision.getActive.cancel({ cycleId });
      const prevList = utils.vision.list.getData({ cycleId });
      const prevActive = utils.vision.getActive.getData({ cycleId });
      utils.vision.list.setData({ cycleId }, (old) =>
        old?.map((v) => (v.id === vars.id ? { ...v, isActive: vars.isActive! } : v)) ?? old,
      );
      utils.vision.getActive.setData({ cycleId }, (old) => {
        if (vars.isActive === true) {
          return prevList?.find((v) => v.id === vars.id) ?? old ?? null;
        }
        return old?.id === vars.id ? null : old;
      });
      return { prevList, prevActive };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prevList) utils.vision.list.setData({ cycleId }, ctx.prevList);
      if (ctx?.prevActive !== undefined) utils.vision.getActive.setData({ cycleId }, ctx.prevActive);
      toast.error(err.message);
    },
    onSuccess: (_data, vars) => {
      if (vars.isActive === undefined) {
        resetForm();
        toast.success("Visión actualizada");
      }
    },
    onSettled: () => {
      utils.vision.list.invalidate({ cycleId });
      utils.vision.getActive.invalidate({ cycleId });
    },
  });

  const deleteVision = trpc.vision.delete.useMutation({
    onSuccess: () => {
      utils.vision.list.invalidate({ cycleId });
      utils.vision.getActive.invalidate({ cycleId });
      toast.success("Visión eliminada");
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setDialogOpen(false);
  }

  function startCreate() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setDialogOpen(true);
  }

  function startEdit(v: {
    id: string;
    text: string;
    timeHorizon: number | null;
  }) {
    setEditingId(v.id);
    setForm({
      text: v.text,
      timeHorizon: v.timeHorizon ?? undefined,
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.text.trim()) return;
    if (editingId) {
      updateVision.mutate({
        id: editingId,
        text: form.text.trim(),
      });
    } else {
      createVision.mutate({
        cycleId,
        text: form.text.trim(),
        timeHorizon: form.timeHorizon,
      });
    }
  }

  function toggleActive(id: string, currentlyActive: boolean) {
    updateVision.mutate({ id, isActive: !currentlyActive });
  }

  const isPending = createVision.isPending || updateVision.isPending;

  if (isLoading) {
    return (
      <div className="animate-pulse text-muted-foreground">Cargando...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Visión Organizacional</h2>
          <p className="text-sm text-muted-foreground">
            Declaración de la posición futura deseada para la organización
          </p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Visión
        </Button>
      </div>

      {visions && visions.length > 0 ? (
        <div className="space-y-3">
          {visions.map((v) => (
            <Card
              key={v.id}
              className={v.isActive ? "border-primary bg-primary/5" : ""}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {v.isActive && (
                    <Badge variant="default">
                      <Star className="mr-1 h-3 w-3" />
                      Activa
                    </Badge>
                  )}
                  {v.timeHorizon != null && (
                    <Badge variant="secondary">
                      <Clock className="mr-1 h-3 w-3" />
                      {v.timeHorizon} años
                    </Badge>
                  )}
                </CardTitle>
                <CardAction>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={v.isActive ? "secondary" : "outline"}
                      onClick={() => toggleActive(v.id, !!v.isActive)}
                    >
                      <Star className="mr-1 h-3.5 w-3.5" />
                      {v.isActive ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => startEdit(v)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => deleteVision.mutate({ id: v.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{v.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start py-8">
            <p className="text-sm text-muted-foreground">
              Aún no se ha definido ninguna visión para este ciclo.
            </p>
            <Button className="mt-4" onClick={startCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Visión
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Visión" : "Nueva Visión"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Declaración de Visión</Label>
              <Textarea
                value={form.text}
                onChange={(e) =>
                  setForm((f) => ({ ...f, text: e.target.value }))
                }
                placeholder="Para el año 2030, ser la empresa líder en..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Horizonte temporal (años, opcional)</Label>
              <Input
                type="number"
                value={form.timeHorizon ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    timeHorizon: e.target.value
                      ? parseInt(e.target.value, 10)
                      : undefined,
                  }))
                }
                min={1}
                max={50}
                className="w-32"
                placeholder="Ej: 5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !form.text.trim()}
            >
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
