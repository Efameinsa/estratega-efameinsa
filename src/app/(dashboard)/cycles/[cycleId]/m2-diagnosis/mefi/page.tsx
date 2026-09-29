"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { MEFI_RATING_LABELS, AMOFHIT_AREAS } from "@/lib/constants";
import { RATING_CONFIG } from "@/lib/amofhit-evaluation-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Check,
  Lock,
  Unlock,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MefiFactor {
  id: string;
  description: string;
  originalDescription?: string | null;
  sourceVariableId?: string | null;
  type: string;
  weight: number;
  rating: number;
  score: number;
  area?: string | null;
  sortOrder: number;
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function MefiStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; border: string; text: string }> = {
    en_construccion: { label: "En construccion", bg: "transparent", border: "#fbbf24", text: "#f0c283" },
    lista_para_ajuste: { label: "Lista para ajuste", bg: "transparent", border: "#a78bfa", text: "#9ec2ec" },
    finalizada: { label: "Finalizada", bg: "transparent", border: "#34d399", text: "#85c9a8" },
  };
  const c = config[status] ?? config.en_construccion;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium"
      style={{ borderColor: c.border, backgroundColor: c.bg, color: c.text }}
    >
      {status === "finalizada" && <Lock className="size-3" />}
      {c.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Add Factor Modal (inline)
// ---------------------------------------------------------------------------

function AddFactorForm({
  cycleId,
  onClose,
}: {
  cycleId: string;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const createMutation = trpc.mefi.create.useMutation({
    onSuccess: () => {
      utils.mefi.list.invalidate({ cycleId });
      utils.mefi.getSummary.invalidate({ cycleId });
      toast.success("Factor agregado manualmente");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const [description, setDescription] = useState("");
  const [type, setType] = useState<"F" | "D">("F");
  const [weight, setWeight] = useState("0.05");
  const [rating, setRating] = useState("3");
  const [area, setArea] = useState("");

  function handleSubmit() {
    if (!description.trim()) return;
    createMutation.mutate({
      cycleId,
      description: description.trim(),
      type,
      weight: parseFloat(weight),
      rating: parseInt(rating, 10),
      area: area || undefined,
    });
  }

  return (
    <Card className="border-2" style={{ borderColor: "#a78bfa" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[14px]">Agregar factor manualmente</CardTitle>
          <button type="button" onClick={onClose} className="cursor-pointer">
            <X className="size-4" style={{ color: "var(--color-text-tertiary)" }} />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-[12px]">Descripcion del factor</Label>
            <Input
              placeholder="Describa el factor..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-[13px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Tipo</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as "F" | "D")}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="F">Fortaleza</SelectItem>
                <SelectItem value="D">Debilidad</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Peso (0.01-0.30)</Label>
            <Input
              type="number" step="0.01" min="0.01" max="0.30"
              value={weight} onChange={(e) => setWeight(e.target.value)}
              className="text-[13px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Calificacion (1-4)</Label>
            <Select value={rating} onValueChange={(v) => v && setRating(v)}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map((r) => (
                  <SelectItem key={r} value={r.toString()}>
                    {r} - {MEFI_RATING_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Area (opcional)</Label>
            <Select value={area} onValueChange={(v) => v && setArea(v)}>
              <SelectTrigger className="w-48 text-[13px]">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {AMOFHIT_AREAS.map((a) => (
                  <SelectItem key={a.key} value={a.key}>{a.key} - {a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 pt-5">
            <Button size="sm" onClick={handleSubmit} disabled={!description.trim() || createMutation.isPending}>
              <Plus className="size-3.5" /> Agregar
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MefiPage() {
  const params = useParams();
  const cycleId = params.cycleId as string;
  const utils = trpc.useUtils();

  const { data: factors = [] } = trpc.mefi.list.useQuery({ cycleId }) as { data: MefiFactor[] };
  const { data: summary } = trpc.mefi.getSummary.useQuery({ cycleId });

  const updateMutation = trpc.mefi.update.useMutation({
    onSuccess: () => {
      utils.mefi.list.invalidate({ cycleId });
      utils.mefi.getSummary.invalidate({ cycleId });
    },
  });
  const deleteMutation = trpc.mefi.delete.useMutation({
    onSuccess: () => {
      utils.mefi.list.invalidate({ cycleId });
      utils.mefi.getSummary.invalidate({ cycleId });
      toast.success("Factor eliminado de la MEFI");
    },
  });
  const syncMutation = trpc.mefi.syncFromAmofhit.useMutation({
    onSuccess: (data) => {
      utils.mefi.list.invalidate({ cycleId });
      utils.mefi.getSummary.invalidate({ cycleId });
      toast.success(`Sincronizados ${data.imported} factores desde AMOFHIT`);
    },
  });
  const finalizeMutation = trpc.mefi.finalize.useMutation({
    onSuccess: (data) => {
      utils.mefi.list.invalidate({ cycleId });
      utils.mefi.getSummary.invalidate({ cycleId });
      toast.success(`MEFI finalizada con PPT = ${data.ppt.toFixed(2)}`);
    },
    onError: (e) => toast.error(e.message),
  });
  const unlockMutation = trpc.mefi.unlock.useMutation({
    onSuccess: () => {
      utils.mefi.getSummary.invalidate({ cycleId });
      toast.info("MEFI desbloqueada para edicion");
    },
  });

  const [showAddForm, setShowAddForm] = useState(false);

  // Computed
  const totalWeight = summary?.totalWeight ?? 0;
  const ppt = summary?.ppt ?? 0;
  const isWeightValid = summary?.isWeightValid ?? false;
  const weightDiff = summary?.weightDiff ?? 1;
  const status = summary?.status ?? "en_construccion";
  const isFinalized = status === "finalizada";
  const factorCount = factors.length;

  // Warnings
  const hasWeightWarning = factorCount > 0 && !isWeightValid;
  const hasTooManyWarning = factorCount > 15;
  const hasTooFew = factorCount < 5;

  function handleWeightChange(id: string, newWeight: string) {
    const w = parseFloat(newWeight);
    if (isNaN(w) || w < 0.01 || w > 0.30) return;
    updateMutation.mutate({ id, weight: w });
  }

  function handleRatingChange(id: string, newRating: string) {
    const r = parseInt(newRating, 10);
    if (isNaN(r)) return;
    updateMutation.mutate({ id, rating: r });
  }

  function handleDescriptionChange(id: string, newDesc: string) {
    if (!newDesc.trim()) return;
    updateMutation.mutate({ id, description: newDesc.trim() });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "transparent" }}>
            <TrendingUp className="size-6" style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Matriz MEFI</h1>
            <p className="text-sm text-muted-foreground">
              Evaluacion de Factores Internos — D&apos;Alessio
            </p>
          </div>
        </div>
        <MefiStatusBadge status={status} />
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => syncMutation.mutate({ cycleId })}
          disabled={syncMutation.isPending || isFinalized}
          className="gap-1.5"
        >
          <RefreshCw className={`size-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          Sincronizar desde AMOFHIT
        </Button>
        {!isFinalized && (
          <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)} className="gap-1.5">
            <Plus className="size-3.5" /> Agregar factor manualmente
          </Button>
        )}
        {isFinalized ? (
          <Button size="sm" variant="outline" onClick={() => unlockMutation.mutate({ cycleId })} className="gap-1.5">
            <Unlock className="size-3.5" /> Desbloquear para edicion
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={!isWeightValid || hasTooFew || factorCount > 20 || finalizeMutation.isPending}
            onClick={() => finalizeMutation.mutate({ cycleId })}
            className="gap-1.5 text-white"
            style={{ backgroundColor: "#a78bfa" }}
          >
            <Lock className="size-3.5" /> Finalizar MEFI
          </Button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && !isFinalized && (
        <AddFactorForm cycleId={cycleId} onClose={() => setShowAddForm(false)} />
      )}

      {/* Weight validation bar */}
      {factorCount > 0 && (
        <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--color-border-tertiary)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Suma de pesos
            </span>
            <div className="flex items-center gap-3">
              {isWeightValid ? (
                <span className="inline-flex items-center gap-1 text-[13px] font-medium" style={{ color: "#34d399" }}>
                  <Check className="size-4" /> Validado (1.00)
                </span>
              ) : totalWeight > 1 ? (
                <span className="text-[13px] font-medium" style={{ color: "#fca5a5" }}>
                  {totalWeight.toFixed(2)} / 1.00 — Excede por {(totalWeight - 1).toFixed(2)}
                </span>
              ) : (
                <span className="text-[13px] font-medium" style={{ color: "#fbbf24" }}>
                  {totalWeight.toFixed(2)} / 1.00 — Faltan {(1 - totalWeight).toFixed(2)}
                </span>
              )}
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: "var(--color-border-tertiary, rgba(167,139,250,0.14))" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(totalWeight * 100, 100)}%`,
                backgroundColor: isWeightValid ? "#34d399" : totalWeight > 1 ? "#fca5a5" : "#a78bfa",
              }}
            />
          </div>

          {/* Factor count warnings */}
          <div className="flex items-center gap-4 text-[12px]">
            <span style={{ color: "var(--color-text-tertiary)" }}>
              {factorCount} factores ({summary?.fortalezas ?? 0} F · {summary?.debilidades ?? 0} D)
            </span>
            {hasTooManyWarning && factorCount <= 20 && (
              <span className="inline-flex items-center gap-1" style={{ color: "#fbbf24" }}>
                <AlertTriangle className="size-3" /> Se recomienda maximo 15 factores
              </span>
            )}
            {factorCount > 20 && (
              <span className="inline-flex items-center gap-1" style={{ color: "#fca5a5" }}>
                <AlertTriangle className="size-3" /> Maximo 20 factores permitidos
              </span>
            )}
          </div>
        </div>
      )}

      {/* Factors table */}
      {factorCount > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-[12px]">#</TableHead>
                <TableHead className="text-[12px]">Factor</TableHead>
                <TableHead className="w-14 text-[12px]">Area</TableHead>
                <TableHead className="w-20 text-[12px]">Tipo</TableHead>
                <TableHead className="w-24 text-[12px]">Peso</TableHead>
                <TableHead className="w-40 text-[12px]">Calificacion</TableHead>
                <TableHead className="w-20 text-[12px] text-right">Puntaje</TableHead>
                {!isFinalized && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {factors.map((f: MefiFactor, i: number) => {
                const ratingCfg = RATING_CONFIG[f.rating as 1 | 2 | 3 | 4];
                const isStrength = f.type === "F";
                return (
                  <TableRow
                    key={f.id}
                    style={{
                      borderLeftWidth: "3px",
                      borderLeftColor: isStrength
                        ? "var(--color-border-success, #22c55e)"
                        : "var(--color-border-danger, #ef4444)",
                    }}
                  >
                    <TableCell className="text-[12px] text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      {isFinalized ? (
                        <span className="text-[13px]">{f.description}</span>
                      ) : (
                        <input
                          className="w-full bg-transparent text-[13px] outline-none focus:underline"
                          defaultValue={f.description}
                          onBlur={(e) => {
                            if (e.target.value !== f.description) {
                              handleDescriptionChange(f.id, e.target.value);
                            }
                          }}
                        />
                      )}
                      {f.sourceVariableId && (
                        <span className="text-[10px] text-muted-foreground ml-1">({f.sourceVariableId})</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {f.area ? (
                        <span
                          className="inline-flex size-6 items-center justify-center rounded text-[10px] font-medium text-white"
                          style={{ backgroundColor: "#a78bfa" }}
                        >
                          {f.area}
                        </span>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          backgroundColor: "transparent",
                          color: isStrength ? "#a8cc8d" : "#ee9c9c",
                        }}
                      >
                        {isStrength ? "Fortaleza" : "Debilidad"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isFinalized ? (
                        <span className="text-[13px]">{f.weight.toFixed(2)}</span>
                      ) : (
                        <Input
                          type="number" step="0.01" min="0.01" max="0.30"
                          className="h-7 w-20 text-[12px]"
                          defaultValue={f.weight.toFixed(2)}
                          onBlur={(e) => handleWeightChange(f.id, e.target.value)}
                        />
                      )}
                      {f.weight > 0.20 && (
                        <span className="text-[10px]" style={{ color: "#fbbf24" }}>alto</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isFinalized ? (
                        <span className="text-[13px]">{f.rating} - {MEFI_RATING_LABELS[f.rating]}</span>
                      ) : (
                        <Select
                          defaultValue={f.rating.toString()}
                          onValueChange={(v) => v && handleRatingChange(f.id, v)}
                        >
                          <SelectTrigger className="w-full text-[12px] h-7">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4].map((r) => (
                              <SelectItem key={r} value={r.toString()}>
                                {r} - {MEFI_RATING_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-[13px] font-medium">
                      {f.score.toFixed(2)}
                    </TableCell>
                    {!isFinalized && (
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate({ id: f.id })}
                          className="rounded p-1 transition-colors hover:bg-muted cursor-pointer"
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="font-medium">
                <TableCell />
                <TableCell className="text-[13px]">TOTAL</TableCell>
                <TableCell />
                <TableCell />
                <TableCell>
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: isWeightValid ? "#34d399" : "#fca5a5" }}
                  >
                    {totalWeight.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-[12px] text-muted-foreground">—</TableCell>
                <TableCell className="text-right">
                  <span className="text-[15px] font-medium" style={{ color: "#a78bfa" }}>
                    {ppt.toFixed(2)}
                  </span>
                </TableCell>
                {!isFinalized && <TableCell />}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      {/* PPT interpretation */}
      {factorCount > 0 && (
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: ppt >= 2.5 ? "#34d399" : "#fca5a5",
            backgroundColor: "transparent",
          }}
        >
          <p className="text-[13px] font-medium" style={{ color: ppt >= 2.5 ? "#85c9a8" : "#ee9c9c" }}>
            PPT = {ppt.toFixed(2)} — {ppt >= 2.5
              ? "La organizacion tiene una posicion interna relativamente fuerte."
              : "La organizacion responde debilmente a sus factores internos. Predominan las debilidades."
            }
          </p>
        </div>
      )}

      {/* Empty state */}
      {factorCount === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center space-y-3">
          <TrendingUp className="size-8 mx-auto" style={{ color: "var(--color-text-tertiary)" }} />
          <p className="text-[14px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
            La MEFI aun no tiene factores
          </p>
          <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
            Evalua variables en el AMOFHIT y luego haz clic en &quot;Sincronizar desde AMOFHIT&quot; para poblar la matriz automaticamente.
          </p>
        </div>
      )}
    </div>
  );
}
