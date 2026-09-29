"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit2, Plus, Trash2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Values Section                                                     */
/* ------------------------------------------------------------------ */

interface ValueForm {
  name: string;
  description: string;
  behaviors: string;
}

const emptyValue: ValueForm = { name: "", description: "", behaviors: "" };

function ValuesSection({ cycleId }: { cycleId: string }) {
  const utils = trpc.useUtils();
  const { data: values, isLoading } = trpc.values.list.useQuery({ cycleId });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ValueForm>({ ...emptyValue });

  const createValue = trpc.values.create.useMutation({
    onSuccess: () => {
      utils.values.list.invalidate({ cycleId });
      resetForm();
      toast.success("Valor creado");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateValue = trpc.values.update.useMutation({
    onSuccess: () => {
      utils.values.list.invalidate({ cycleId });
      resetForm();
      toast.success("Valor actualizado");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteValue = trpc.values.delete.useMutation({
    onSuccess: () => {
      utils.values.list.invalidate({ cycleId });
      toast.success("Valor eliminado");
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setForm({ ...emptyValue });
    setEditingId(null);
    setOpen(false);
  }

  function startCreate() {
    setForm({ ...emptyValue });
    setEditingId(null);
    setOpen(true);
  }

  function startEdit(v: {
    id: string;
    name: string;
    description: string | null;
    behaviors: string | null;
  }) {
    setEditingId(v.id);
    setForm({
      name: v.name,
      description: v.description ?? "",
      behaviors: v.behaviors ?? "",
    });
    setOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    if (editingId) {
      updateValue.mutate({
        id: editingId,
        name: form.name.trim(),
        description: form.description || undefined,
        behaviors: form.behaviors || undefined,
      });
    } else {
      createValue.mutate({
        cycleId,
        name: form.name.trim(),
        description: form.description || undefined,
        behaviors: form.behaviors || undefined,
      });
    }
  }

  const isPending = createValue.isPending || updateValue.isPending;

  if (isLoading) {
    return (
      <div className="animate-pulse text-muted-foreground">
        Cargando valores...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Valores Organizacionales</h3>
        <Button size="sm" onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Valor
        </Button>
      </div>

      {values && values.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {values.map((v) => (
            <Card key={v.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold">{v.name}</h4>
                  <div className="flex gap-1">
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
                      onClick={() => deleteValue.mutate({ id: v.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {v.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {v.description}
                  </p>
                )}
                {v.behaviors && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Comportamientos:
                    </p>
                    <p className="text-sm">{v.behaviors}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start py-8">
            <p className="text-sm text-muted-foreground">
              No hay valores definidos
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) resetForm();
          setOpen(o);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Valor" : "Nuevo Valor"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ej: Integridad"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="¿Qué significa este valor para la organización?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Comportamientos observables</Label>
              <Textarea
                value={form.behaviors}
                onChange={(e) =>
                  setForm((f) => ({ ...f, behaviors: e.target.value }))
                }
                placeholder="Comportamientos concretos que reflejan este valor"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !form.name.trim()}
            >
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ethics Section                                                     */
/* ------------------------------------------------------------------ */

interface EthicForm {
  category: string;
  description: string;
}

const emptyEthic: EthicForm = { category: "", description: "" };

function EthicsSection({ cycleId }: { cycleId: string }) {
  const utils = trpc.useUtils();
  const { data: ethics, isLoading } = trpc.ethics.list.useQuery({ cycleId });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EthicForm>({ ...emptyEthic });

  const createEthic = trpc.ethics.create.useMutation({
    onSuccess: () => {
      utils.ethics.list.invalidate({ cycleId });
      resetForm();
      toast.success("Regla ética creada");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateEthic = trpc.ethics.update.useMutation({
    onSuccess: () => {
      utils.ethics.list.invalidate({ cycleId });
      resetForm();
      toast.success("Regla ética actualizada");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteEthic = trpc.ethics.delete.useMutation({
    onSuccess: () => {
      utils.ethics.list.invalidate({ cycleId });
      toast.success("Regla ética eliminada");
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setForm({ ...emptyEthic });
    setEditingId(null);
    setOpen(false);
  }

  function startCreate() {
    setForm({ ...emptyEthic });
    setEditingId(null);
    setOpen(true);
  }

  function startEdit(e: {
    id: string;
    category: string;
    description: string;
  }) {
    setEditingId(e.id);
    setForm({ category: e.category, description: e.description });
    setOpen(true);
  }

  function handleSave() {
    if (!form.category.trim() || !form.description.trim()) return;
    if (editingId) {
      updateEthic.mutate({
        id: editingId,
        category: form.category.trim(),
        description: form.description.trim(),
      });
    } else {
      createEthic.mutate({
        cycleId,
        category: form.category.trim(),
        description: form.description.trim(),
      });
    }
  }

  const isPending = createEthic.isPending || updateEthic.isPending;

  if (isLoading) {
    return (
      <div className="animate-pulse text-muted-foreground">
        Cargando código de ética...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Código de Ética</h3>
        <Button size="sm" onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Regla
        </Button>
      </div>

      {ethics && ethics.length > 0 ? (
        <div className="space-y-3">
          {ethics.map((e) => (
            <Card key={e.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{e.category}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {e.description}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => startEdit(e)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => deleteEthic.mutate({ id: e.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start py-8">
            <p className="text-sm text-muted-foreground">
              No hay reglas éticas definidas
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) resetForm();
          setOpen(o);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Regla Ética" : "Nueva Regla Ética"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Input
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                placeholder="Ej: Conflicto de intereses"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Descripción de la regla ética"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isPending ||
                !form.category.trim() ||
                !form.description.trim()
              }
            >
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ValuesPage() {
  const { cycleId } = useParams<{ cycleId: string }>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Valores y Código de Ética</h2>
        <p className="text-sm text-muted-foreground">
          Principios fundamentales y normas éticas que rigen la organización
        </p>
      </div>

      <ValuesSection cycleId={cycleId} />

      <Separator />

      <EthicsSection cycleId={cycleId} />
    </div>
  );
}
