"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Factor {
  id: string;
  description: string;
  type: string;
  weight: number;
  rating: number;
  score: number;
}

type Origin = "mefi" | "mefe";

function QuadrantCard({
  title,
  color,
  factors,
  origin,
  cycleId,
}: {
  title: string;
  color: "green" | "blue" | "yellow" | "red";
  factors: Factor[];
  origin: Origin;
  cycleId: string;
}) {
  const colorStyles: Record<string, { border: string; bg: string; badge: string }> = {
    green: {
      border: "border-green-500/30 dark:border-green-900",
      bg: "bg-transparent dark:bg-transparent",
      badge: "bg-transparent text-green-300 dark:bg-transparent dark:text-green-200",
    },
    blue: {
      border: "border-primary/25 dark:border-primary",
      bg: "bg-primary/10/50 dark:bg-primary/90/20",
      badge: "bg-primary/15 text-primary dark:bg-primary/80 dark:text-primary/80",
    },
    yellow: {
      border: "border-yellow-500/30 dark:border-yellow-900",
      bg: "bg-transparent dark:bg-transparent",
      badge: "bg-transparent text-yellow-300 dark:bg-transparent dark:text-yellow-200",
    },
    red: {
      border: "border-red-500/30 dark:border-red-900",
      bg: "bg-transparent dark:bg-transparent",
      badge: "bg-transparent text-red-300 dark:bg-transparent dark:text-red-200",
    },
  };

  const style = colorStyles[color];
  const sorted = [...factors].sort((a, b) => b.score - a.score);

  return (
    <Card className={`${style.border} ${style.bg}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {title}
          <span className={`inline-flex h-5 items-center justify-center rounded-full px-2 text-xs font-medium ${style.badge}`}>
            {factors.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin factores registrados.</p>
        ) : (
          <ol className="space-y-2">
            {sorted.map((f, i) => (
              <FactorRow
                key={f.id}
                factor={f}
                index={i + 1}
                origin={origin}
                cycleId={cycleId}
              />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function FactorRow({
  factor,
  index,
  origin,
  cycleId,
}: {
  factor: Factor;
  index: number;
  origin: Origin;
  cycleId: string;
}) {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(factor.description);
  const [weight, setWeight] = useState(String(factor.weight));
  const [rating, setRating] = useState<number>(factor.rating);

  const mefiUpdate = trpc.mefi.update.useMutation({
    onSuccess: () => {
      utils.mefi.list.invalidate({ cycleId });
      toast.success("Factor actualizado");
      setEditing(false);
    },
  });
  const mefiDelete = trpc.mefi.delete.useMutation({
    onSuccess: () => {
      utils.mefi.list.invalidate({ cycleId });
      toast.success("Factor eliminado");
    },
  });
  const mefeUpdate = trpc.mefe.update.useMutation({
    onSuccess: () => {
      utils.mefe.list.invalidate({ cycleId });
      toast.success("Factor actualizado");
      setEditing(false);
    },
  });
  const mefeDelete = trpc.mefe.delete.useMutation({
    onSuccess: () => {
      utils.mefe.list.invalidate({ cycleId });
      toast.success("Factor eliminado");
    },
  });

  const updating = mefiUpdate.isPending || mefeUpdate.isPending;
  const deleting = mefiDelete.isPending || mefeDelete.isPending;

  function handleSave() {
    const w = parseFloat(weight);
    if (!description.trim()) {
      toast.error("La descripcion no puede estar vacia");
      return;
    }
    if (isNaN(w) || w < 0.01 || w > 0.30) {
      toast.error("El peso debe estar entre 0.01 y 0.30");
      return;
    }
    if (![1, 2, 3, 4].includes(rating)) {
      toast.error("La calificacion debe ser 1, 2, 3 o 4");
      return;
    }
    const payload = {
      id: factor.id,
      description: description.trim(),
      weight: w,
      rating,
    };
    if (origin === "mefi") {
      mefiUpdate.mutate(payload as Parameters<typeof mefiUpdate.mutate>[0]);
    } else {
      mefeUpdate.mutate(payload as Parameters<typeof mefeUpdate.mutate>[0]);
    }
  }

  function handleCancel() {
    setDescription(factor.description);
    setWeight(String(factor.weight));
    setRating(factor.rating);
    setEditing(false);
  }

  function handleDelete() {
    const confirmed = confirm(
      `Eliminar este factor?\n\n"${factor.description}"\n\nEsta accion no se puede deshacer.`,
    );
    if (!confirmed) return;
    if (origin === "mefi") {
      mefiDelete.mutate({ id: factor.id });
    } else {
      mefeDelete.mutate({ id: factor.id });
    }
  }

  if (editing) {
    return (
      <li className="rounded-md border bg-background p-3 space-y-2">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripcion del factor"
          className="text-sm"
        />
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Peso (0.01 - 0.30)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max="0.30"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-24 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Calificacion
            </label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value={1}>1 - Debilidad/Amenaza mayor</option>
              <option value={2}>2 - Debilidad/Amenaza menor</option>
              <option value={3}>3 - Fortaleza/Oportunidad menor</option>
              <option value={4}>4 - Fortaleza/Oportunidad mayor</option>
            </select>
          </div>
          <div className="ml-auto flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={updating}
            >
              <X className="size-3.5 mr-1" /> Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updating}>
              <Check className="size-3.5 mr-1" /> Guardar
            </Button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="group flex items-start gap-2 text-sm rounded-md p-2 -mx-2 hover:bg-foreground/5 transition-colors">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {index}
      </span>
      <div className="flex-1 min-w-0">
        <p>{factor.description}</p>
        <p className="text-xs text-muted-foreground">
          Peso: {factor.weight.toFixed(2)} | Calif: {factor.rating} | Puntaje: {factor.score.toFixed(2)}
        </p>
      </div>
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="size-7 inline-flex items-center justify-center rounded-md hover:bg-foreground/10 text-muted-foreground hover:text-foreground"
          title="Editar"
          disabled={deleting}
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="size-7 inline-flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          title="Eliminar"
          disabled={deleting}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

export default function FodaPage() {
  const params = useParams();
  const cycleId = params.cycleId as string;

  const { data: mefeFactors = [] } = trpc.mefe.list.useQuery({ cycleId }) as { data: Factor[] };
  const { data: mefiFactors = [] } = trpc.mefi.list.useQuery({ cycleId }) as { data: Factor[] };

  const fortalezas = mefiFactors.filter((f) => f.type === "F");
  const debilidades = mefiFactors.filter((f) => f.type === "D");
  const oportunidades = mefeFactors.filter((f) => f.type === "O");
  const amenazas = mefeFactors.filter((f) => f.type === "A");

  const totalFactors = fortalezas.length + oportunidades.length + debilidades.length + amenazas.length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">FODA - Analisis Consolidado</h1>
        <p className="text-muted-foreground">
          Vista consolidada de Fortalezas, Oportunidades, Debilidades y Amenazas.
          <Badge variant="secondary" className="ml-2">{totalFactors} factores</Badge>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Pasa el cursor sobre cada factor para editarlo o eliminarlo. Los cambios se reflejan en MEFI/MEFE.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <QuadrantCard title="Fortalezas" color="green" factors={fortalezas} origin="mefi" cycleId={cycleId} />
        <QuadrantCard title="Oportunidades" color="blue" factors={oportunidades} origin="mefe" cycleId={cycleId} />
        <QuadrantCard title="Debilidades" color="yellow" factors={debilidades} origin="mefi" cycleId={cycleId} />
        <QuadrantCard title="Amenazas" color="red" factors={amenazas} origin="mefe" cycleId={cycleId} />
      </div>
    </div>
  );
}
