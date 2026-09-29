"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type Intensity = "vital" | "importante" | "periférico";

const INTENSITY_LABELS: Record<Intensity, string> = {
  vital: "Vital",
  importante: "Importante",
  "periférico": "Periférico",
};

const INTENSITY_VARIANT: Record<Intensity, "destructive" | "secondary" | "outline"> = {
  vital: "destructive",
  importante: "secondary",
  "periférico": "outline",
};

type CardinalType =
  | "influencia_terceras_partes"
  | "lazos_pasados_presentes"
  | "contrabalance_intereses"
  | "conservacion_enemigos";

const CARDINAL_OPTIONS: { value: CardinalType; label: string }[] = [
  {
    value: "influencia_terceras_partes",
    label: "Influencia de terceras partes",
  },
  { value: "lazos_pasados_presentes", label: "Lazos pasados y presentes" },
  { value: "contrabalance_intereses", label: "Contrabalance de intereses" },
  { value: "conservacion_enemigos", label: "Conservación de los enemigos" },
];

const CARDINAL_LABELS: Record<CardinalType, string> = Object.fromEntries(
  CARDINAL_OPTIONS.map((o) => [o.value, o.label])
) as Record<CardinalType, string>;

/* ------------------------------------------------------------------ */
/*  Interests Section                                                  */
/* ------------------------------------------------------------------ */

interface InterestForm {
  description: string;
  intensity: Intensity;
  allies: string;
  neutrals: string;
  adversaries: string;
}

const emptyInterest: InterestForm = {
  description: "",
  intensity: "importante",
  allies: "",
  neutrals: "",
  adversaries: "",
};

function InterestsSection({ cycleId }: { cycleId: string }) {
  const utils = trpc.useUtils();
  const { data: interests, isLoading } = trpc.interests.list.useQuery({
    cycleId,
  });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InterestForm>({ ...emptyInterest });

  const createInterest = trpc.interests.create.useMutation({
    onSuccess: () => {
      utils.interests.list.invalidate({ cycleId });
      resetForm();
      toast.success("Interés creado");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateInterest = trpc.interests.update.useMutation({
    onSuccess: () => {
      utils.interests.list.invalidate({ cycleId });
      resetForm();
      toast.success("Interés actualizado");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteInterest = trpc.interests.delete.useMutation({
    onSuccess: () => {
      utils.interests.list.invalidate({ cycleId });
      toast.success("Interés eliminado");
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setForm({ ...emptyInterest });
    setEditingId(null);
    setOpen(false);
  }

  function startCreate() {
    setForm({ ...emptyInterest });
    setEditingId(null);
    setOpen(true);
  }

  function startEdit(item: {
    id: string;
    description: string;
    intensity: string;
    allies: string | null;
    neutrals: string | null;
    adversaries: string | null;
  }) {
    setEditingId(item.id);
    setForm({
      description: item.description,
      intensity: item.intensity as Intensity,
      allies: item.allies ?? "",
      neutrals: item.neutrals ?? "",
      adversaries: item.adversaries ?? "",
    });
    setOpen(true);
  }

  function handleSave() {
    if (!form.description.trim()) return;
    if (editingId) {
      updateInterest.mutate({
        id: editingId,
        description: form.description.trim(),
        intensity: form.intensity,
        allies: form.allies || undefined,
        neutrals: form.neutrals || undefined,
        adversaries: form.adversaries || undefined,
      });
    } else {
      createInterest.mutate({
        cycleId,
        description: form.description.trim(),
        intensity: form.intensity,
        allies: form.allies || undefined,
        neutrals: form.neutrals || undefined,
        adversaries: form.adversaries || undefined,
      });
    }
  }

  const isPending = createInterest.isPending || updateInterest.isPending;

  if (isLoading) {
    return (
      <div className="animate-pulse text-muted-foreground">
        Cargando intereses...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Intereses Organizacionales</h3>
        <Button size="sm" onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Interés
        </Button>
      </div>

      {interests && interests.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-[120px]">Intensidad</TableHead>
                <TableHead>Aliados</TableHead>
                <TableHead>Neutros</TableHead>
                <TableHead>Adversarios</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {interests.map((item) => {
                const intensity = item.intensity as Intensity;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant={INTENSITY_VARIANT[intensity] ?? "secondary"}>
                        {INTENSITY_LABELS[intensity] ?? item.intensity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.allies || "\u2014"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.neutrals || "\u2014"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.adversaries || "\u2014"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => startEdit(item)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() =>
                            deleteInterest.mutate({ id: item.id })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start py-8">
            <p className="text-sm text-muted-foreground">
              No hay intereses definidos
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Interés" : "Nuevo Interés"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Descripción del interés organizacional"
              />
            </div>
            <div className="space-y-2">
              <Label>Intensidad</Label>
              <Select
                value={form.intensity}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    intensity: (v ?? "importante") as Intensity,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vital">Vital</SelectItem>
                  <SelectItem value="importante">Importante</SelectItem>
                  <SelectItem value="periférico">Periférico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Aliados</Label>
              <Input
                value={form.allies}
                onChange={(e) =>
                  setForm((f) => ({ ...f, allies: e.target.value }))
                }
                placeholder="Actores que comparten este interés"
              />
            </div>
            <div className="space-y-2">
              <Label>Neutros</Label>
              <Input
                value={form.neutrals}
                onChange={(e) =>
                  setForm((f) => ({ ...f, neutrals: e.target.value }))
                }
                placeholder="Actores neutrales respecto a este interés"
              />
            </div>
            <div className="space-y-2">
              <Label>Adversarios</Label>
              <Input
                value={form.adversaries}
                onChange={(e) =>
                  setForm((f) => ({ ...f, adversaries: e.target.value }))
                }
                placeholder="Actores contrarios a este interés"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !form.description.trim()}
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
/*  Cardinal Principles Section                                        */
/* ------------------------------------------------------------------ */

interface CardinalForm {
  type: CardinalType;
  description: string;
}

const emptyCardinal: CardinalForm = {
  type: "influencia_terceras_partes",
  description: "",
};

function CardinalSection({ cycleId }: { cycleId: string }) {
  const utils = trpc.useUtils();
  const { data: principles, isLoading } = trpc.cardinal.list.useQuery({
    cycleId,
  });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CardinalForm>({ ...emptyCardinal });

  const createCardinal = trpc.cardinal.create.useMutation({
    onSuccess: () => {
      utils.cardinal.list.invalidate({ cycleId });
      resetForm();
      toast.success("Principio cardinal creado");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateCardinal = trpc.cardinal.update.useMutation({
    onSuccess: () => {
      utils.cardinal.list.invalidate({ cycleId });
      resetForm();
      toast.success("Principio cardinal actualizado");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteCardinal = trpc.cardinal.delete.useMutation({
    onSuccess: () => {
      utils.cardinal.list.invalidate({ cycleId });
      toast.success("Principio cardinal eliminado");
    },
    onError: (err) => toast.error(err.message),
  });

  function resetForm() {
    setForm({ ...emptyCardinal });
    setEditingId(null);
    setOpen(false);
  }

  function startCreate() {
    setForm({ ...emptyCardinal });
    setEditingId(null);
    setOpen(true);
  }

  function startEdit(p: { id: string; type: string; description: string }) {
    setEditingId(p.id);
    setForm({
      type: p.type as CardinalType,
      description: p.description,
    });
    setOpen(true);
  }

  function handleSave() {
    if (!form.description.trim()) return;
    if (editingId) {
      updateCardinal.mutate({
        id: editingId,
        type: form.type,
        description: form.description.trim(),
      });
    } else {
      createCardinal.mutate({
        cycleId,
        type: form.type,
        description: form.description.trim(),
      });
    }
  }

  const isPending = createCardinal.isPending || updateCardinal.isPending;

  if (isLoading) {
    return (
      <div className="animate-pulse text-muted-foreground">
        Cargando principios cardinales...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Principios Cardinales</h3>
          <p className="text-sm text-muted-foreground">
            Los cuatro principios cardinales que permiten reconocer oportunidades
            y amenazas
          </p>
        </div>
        <Button size="sm" onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Principio
        </Button>
      </div>

      {principles && principles.length > 0 ? (
        <div className="space-y-3">
          {principles.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      {CARDINAL_LABELS[p.type as CardinalType] ?? p.type}
                    </Badge>
                    <p className="text-sm">{p.description}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => startEdit(p)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => deleteCardinal.mutate({ id: p.id })}
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
              No hay principios cardinales definidos
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
              {editingId
                ? "Editar Principio Cardinal"
                : "Nuevo Principio Cardinal"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    type: (v ?? "influencia_terceras_partes") as CardinalType,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARDINAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Análisis del principio cardinal"
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
              disabled={isPending || !form.description.trim()}
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

export default function InterestsPage() {
  const { cycleId } = useParams<{ cycleId: string }>();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">
          Intereses Organizacionales y Principios Cardinales
        </h2>
        <p className="text-sm text-muted-foreground">
          Matriz de intereses organizacionales y los cuatro principios
          cardinales de Hartmann
        </p>
      </div>

      <InterestsSection cycleId={cycleId} />

      <Separator />

      <CardinalSection cycleId={cycleId} />
    </div>
  );
}
