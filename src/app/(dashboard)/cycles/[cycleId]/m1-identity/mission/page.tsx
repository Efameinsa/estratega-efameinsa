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
import { Edit2, Plus, Star, Trash2 } from "lucide-react";

interface MissionForm {
  text: string;
}

const emptyForm: MissionForm = { text: "" };

export default function MissionPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const utils = trpc.useUtils();

  const { data: missions, isLoading } = trpc.mission.list.useQuery({ cycleId });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MissionForm>({ ...emptyForm });

  const createMission = trpc.mission.create.useMutation({
    onSuccess: () => {
      utils.mission.list.invalidate({ cycleId });
      utils.mission.getActive.invalidate({ cycleId });
      resetForm();
      toast.success("Misión creada");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMission = trpc.mission.update.useMutation({
    onMutate: async (vars) => {
      if (vars.isActive === undefined) return;
      await utils.mission.list.cancel({ cycleId });
      await utils.mission.getActive.cancel({ cycleId });
      const prevList = utils.mission.list.getData({ cycleId });
      const prevActive = utils.mission.getActive.getData({ cycleId });
      utils.mission.list.setData({ cycleId }, (old) =>
        old?.map((m) => (m.id === vars.id ? { ...m, isActive: vars.isActive! } : m)) ?? old,
      );
      utils.mission.getActive.setData(
        { cycleId },
        (old) => {
          if (vars.isActive === true) {
            return prevList?.find((m) => m.id === vars.id) ?? old ?? null;
          }
          return old?.id === vars.id ? null : old;
        },
      );
      return { prevList, prevActive };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prevList) utils.mission.list.setData({ cycleId }, ctx.prevList);
      if (ctx?.prevActive !== undefined) utils.mission.getActive.setData({ cycleId }, ctx.prevActive);
      toast.error(err.message);
    },
    onSuccess: (_data, vars) => {
      if (vars.isActive === undefined) {
        resetForm();
        toast.success("Misión actualizada");
      }
    },
    onSettled: () => {
      utils.mission.list.invalidate({ cycleId });
      utils.mission.getActive.invalidate({ cycleId });
    },
  });

  const deleteMission = trpc.mission.delete.useMutation({
    onSuccess: () => {
      utils.mission.list.invalidate({ cycleId });
      utils.mission.getActive.invalidate({ cycleId });
      toast.success("Misión eliminada");
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

  function startEdit(m: { id: string; text: string }) {
    setEditingId(m.id);
    setForm({ text: m.text });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.text.trim()) return;
    if (editingId) {
      updateMission.mutate({
        id: editingId,
        text: form.text.trim(),
      });
    } else {
      createMission.mutate({
        cycleId,
        text: form.text.trim(),
      });
    }
  }

  function toggleActive(id: string, currentlyActive: boolean) {
    updateMission.mutate({ id, isActive: !currentlyActive });
  }

  const isPending = createMission.isPending || updateMission.isPending;

  if (isLoading) {
    return (
      <div className="animate-pulse text-muted-foreground">Cargando...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Misión Organizacional</h2>
          <p className="text-sm text-muted-foreground">
            Declaración del propósito de la organización
          </p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Misión
        </Button>
      </div>

      {missions && missions.length > 0 ? (
        <div className="space-y-3">
          {missions.map((m) => (
            <Card
              key={m.id}
              className={m.isActive ? "border-primary bg-primary/5" : ""}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {m.isActive && (
                    <Badge variant="default">
                      <Star className="mr-1 h-3 w-3" />
                      Activa
                    </Badge>
                  )}
                </CardTitle>
                <CardAction>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={m.isActive ? "secondary" : "outline"}
                      onClick={() => toggleActive(m.id, !!m.isActive)}
                    >
                      <Star className="mr-1 h-3.5 w-3.5" />
                      {m.isActive ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => startEdit(m)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => deleteMission.mutate({ id: m.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{m.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start py-8">
            <p className="text-sm text-muted-foreground">
              Aún no se ha definido ninguna misión para este ciclo.
            </p>
            <Button className="mt-4" onClick={startCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Misión
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
              {editingId ? "Editar Misión" : "Nueva Misión"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Declaración de Misión</Label>
              <Textarea
                value={form.text}
                onChange={(e) =>
                  setForm((f) => ({ ...f, text: e.target.value }))
                }
                placeholder="Somos una organización que..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Una buena misión responde: ¿quiénes somos?, ¿qué hacemos?, ¿por
                qué lo hacemos?
              </p>
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
