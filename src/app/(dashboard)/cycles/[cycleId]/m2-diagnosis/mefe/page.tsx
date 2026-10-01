"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { MEFE_RESPONSE_LABELS, PESTEC_VARIABLES } from "@/lib/pestec-evaluation-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus, Trash2, RefreshCw, Check, Lock, Unlock, Globe, X, Info, AlertTriangle, Shield,
} from "lucide-react";
import { toast } from "sonner";

interface MefeFactor {
  id: string; description: string; originalDescription?: string | null;
  sourceFactorId?: string | null; type: string; weight: number;
  rating: number; score: number; variable?: string | null; sortOrder: number;
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; border: string; text: string }> = {
    en_construccion: { label: "En construccion", bg: "transparent", border: "#b45309", text: "#b45309" },
    lista_para_ajuste: { label: "Lista para ajuste", bg: "transparent", border: "#8B1510", text: "#8B1510" },
    finalizada: { label: "Finalizada", bg: "transparent", border: "#1e7f4f", text: "#1e7f4f" },
  };
  const c = cfg[status] ?? cfg.en_construccion;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium"
      style={{ borderColor: c.border, backgroundColor: c.bg, color: c.text }}>
      {status === "finalizada" && <Lock className="size-3" />}{c.label}
    </span>
  );
}

function AddForm({ cycleId, onClose }: { cycleId: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const mut = trpc.mefe.create.useMutation({
    onSuccess: () => { utils.mefe.list.invalidate({ cycleId }); utils.mefe.getSummary.invalidate({ cycleId }); toast.success("Factor agregado"); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const [desc, setDesc] = useState(""); const [type, setType] = useState<"O"|"A">("O");
  const [weight, setWeight] = useState("0.05"); const [rating, setRating] = useState("3");

  return (
    <Card className="border-2" style={{ borderColor: "#8B1510" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[14px]">Agregar factor manualmente</CardTitle>
          <button type="button" onClick={onClose} className="cursor-pointer"><X className="size-4" style={{ color: "var(--color-text-tertiary)" }} /></button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-[12px]">Descripcion</Label>
            <Input placeholder="Describa el factor..." value={desc} onChange={(e) => setDesc(e.target.value)} className="text-[13px]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Tipo</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as "O"|"A")}>
              <SelectTrigger className="text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="O">Oportunidad</SelectItem><SelectItem value="A">Amenaza</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Peso</Label>
              <Input type="number" step="0.01" min="0.01" max="0.30" value={weight} onChange={(e) => setWeight(e.target.value)} className="text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Calif.</Label>
              <Select value={rating} onValueChange={(v) => v && setRating(v)}>
                <SelectTrigger className="text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>{[1,2,3,4].map((r) => <SelectItem key={r} value={r.toString()}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => { if (!desc.trim()) return; mut.mutate({ cycleId, description: desc.trim(), type, weight: parseFloat(weight), rating: parseInt(rating,10) }); }} disabled={!desc.trim()}>
            <Plus className="size-3.5" /> Agregar
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MefePage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const utils = trpc.useUtils();
  const { data: factors = [] } = trpc.mefe.list.useQuery({ cycleId }) as { data: MefeFactor[] };
  const { data: summary } = trpc.mefe.getSummary.useQuery({ cycleId });

  const inv = () => { utils.mefe.list.invalidate({ cycleId }); utils.mefe.getSummary.invalidate({ cycleId }); };
  const updateMut = trpc.mefe.update.useMutation({ onSuccess: inv });
  const deleteMut = trpc.mefe.delete.useMutation({ onSuccess: () => { inv(); toast.success("Factor eliminado"); } });
  const syncMut = trpc.mefe.syncFromPestec.useMutation({ onSuccess: (d) => {
    inv();
    if (d.imported > 0) toast.success(`Sincronizados ${d.imported} factores nuevos`);
    else toast.info(`No hay factores nuevos. Ya tienes ${factors.length} factores en la MEFE.`);
  } });
  const finMut = trpc.mefe.finalize.useMutation({ onSuccess: (d) => { inv(); toast.success(`MEFE finalizada — PPT = ${d.ppt.toFixed(2)}`); }, onError: (e) => toast.error(e.message) });
  const unlockMut = trpc.mefe.unlock.useMutation({ onSuccess: () => { inv(); toast.info("MEFE desbloqueada"); } });

  const [showAdd, setShowAdd] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"all" | "pestec" | "porter" | "manual">("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // No auto-sync — user clicks "Sincronizar" explicitly to avoid overwriting adjusted weights

  const SOURCE_CFG: Record<string, { label: string; color: string; bg: string }> = {
    pestec: { label: "PESTEC", color: "#8B1510", bg: "transparent" },
    porter: { label: "Porter", color: "#b45309", bg: "transparent" },
    manual: { label: "Manual", color: "#a8a29e", bg: "transparent" },
  };

  const tw = summary?.totalWeight ?? 0;
  const ppt = summary?.ppt ?? 0;
  const wv = summary?.isWeightValid ?? false;
  const st = summary?.status ?? "en_construccion";
  const fin = st === "finalizada";
  const n = factors.length;
  const nO = summary?.oportunidades ?? 0;
  const nA = summary?.amenazas ?? 0;

  // Validation checks
  const hasIncomplete = factors.some((f) => f.weight < 0.01 || f.rating === 0);
  // Blocking: aviso 1 (nA===0), aviso 2 (nO===0), aviso 5 (n>20)
  // Non-blocking: aviso 3 (Porter incomplete), aviso 4 (n<10), aviso 6 (weight>0.20)
  const canFinalize = wv && n >= 10 && n <= 20 && nO >= 1 && nA >= 1;
  const warnings: string[] = [];
  if (n > 0 && n < 10) warnings.push(`Minimo 10 factores requeridos (tienes ${n})`);
  if (n > 20) warnings.push(`Maximo 20 factores permitidos (tienes ${n})`);
  if (n > 0 && nO === 0) warnings.push("Debe haber al menos 1 Oportunidad");
  if (n > 0 && nA === 0) warnings.push("Debe haber al menos 1 Amenaza");

  // Source counts
  const bySource = { pestec: 0, porter: 0, manual: 0 };
  factors.forEach((f) => {
    const src = f.sourceFactorId ? (f.variable === "porter" || f.variable === "competitivo" ? "porter" : "pestec") : "manual";
    bySource[src as keyof typeof bySource]++;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "transparent" }}>
            <Globe className="size-6" style={{ color: "#8B1510" }} />
          </div>
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Matriz MEFE</h1>
            <p className="text-sm text-muted-foreground">Evaluacion de Factores Externos — D&apos;Alessio</p>
          </div>
        </div>
        <StatusBadge status={st} />
      </div>

      {/* Methodological note */}
      <div className="flex items-start gap-2 rounded-lg border p-3"
        style={{ borderColor: "#8B1510", backgroundColor: "transparent" }}
      >
        <Info className="size-4 shrink-0 mt-0.5" style={{ color: "#8B1510" }} />
        <p className="text-[12px]" style={{ color: "var(--foreground)" }}>
          <strong>Calificacion (1–4):</strong> mide como RESPONDE tu organizacion al factor externo, no la intensidad del factor.
          1 = respuesta deficiente, 2 = por debajo del promedio, 3 = por encima del promedio, 4 = respuesta superior.
        </p>
      </div>

      {/* Sync + Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Sync buttons */}
        <Button size="sm" variant="outline" onClick={() => syncMut.mutate({ cycleId })} disabled={syncMut.isPending || fin} className="gap-1.5">
          <RefreshCw className={`size-3.5 ${syncMut.isPending ? "animate-spin" : ""}`} />
          Sincronizar PESTEC + Porter
        </Button>
        {/* Add manual */}
        {!fin && (
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus className="size-3.5" /> Agregar factor manual
          </Button>
        )}
        {/* Finalize / Unlock */}
        {fin ? (
          <Button size="sm" variant="outline" onClick={() => unlockMut.mutate({ cycleId })} className="gap-1.5">
            <Unlock className="size-3.5" /> Desbloquear
          </Button>
        ) : (
          <Button size="sm" disabled={!canFinalize} onClick={() => finMut.mutate({ cycleId })} className="gap-1.5 text-white" style={{ backgroundColor: "#8B1510" }}>
            <Lock className="size-3.5" /> Finalizar MEFE
          </Button>
        )}
      </div>

      {/* Source badges */}
      {n > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(bySource).filter(([, count]) => count > 0).map(([src, count]) => {
            const cfg = SOURCE_CFG[src] ?? SOURCE_CFG.manual;
            return (
              <span key={src} className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: cfg.bg, color: cfg.color }}
              >
                {cfg.label}: {count}
              </span>
            );
          })}
          <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
            {nO} oportunidades · {nA} amenazas · {n} total
          </span>
        </div>
      )}

      {showAdd && !fin && <AddForm cycleId={cycleId} onClose={() => setShowAdd(false)} />}

      {/* ── PANEL DE VALIDACION DE PESOS (siempre visible, 4 estados) ── */}
      {(() => {
        const isEmpty = n === 0;
        const isExceeded = tw > 1.005;
        const isValid = wv;
        // Pick state
        let panelBg = "var(--color-background-secondary, #f5f5f5)";
        let panelBorder = "var(--color-border-tertiary)";
        let iconBg = "var(--color-text-tertiary)";
        let iconContent = "○";
        let numColor = "var(--color-text-tertiary)";
        let barColor = "var(--color-border-tertiary)";
        let deltaText = "";
        let deltaBg = "";
        let deltaColor = "";
        let message = "";

        if (isEmpty) {
          message = "Sincroniza factores desde PESTEC o Porter para comenzar a construir la MEFE.";
        } else if (isExceeded) {
          panelBg = "transparent"; panelBorder = "#b3261e"; iconBg = "#b3261e"; iconContent = "!";
          numColor = "#b3261e"; barColor = "#b3261e";
          deltaText = `Excede ${(tw - 1).toFixed(2)}`; deltaBg = "transparent"; deltaColor = "#b3261e";
          message = `La suma excede 1.00 en ${(tw - 1).toFixed(2)}. Reduce algun peso para poder finalizar.`;
        } else if (isValid) {
          panelBg = "transparent"; panelBorder = "#1e7f4f"; iconBg = "#1e7f4f"; iconContent = "✓";
          numColor = "#1e7f4f"; barColor = "#1e7f4f";
          deltaText = "✓ Suma correcta"; deltaBg = "transparent"; deltaColor = "#1e7f4f";
          message = "Los pesos suman exactamente 1.00. Puedes finalizar la MEFE si se cumplen los demas requisitos.";
        } else {
          // Warning muted — informativo pero NO debe robar protagonismo al MEFE
          panelBg = "transparent";
          panelBorder = "var(--color-border-tertiary)";
          iconBg = "rgba(139, 21, 16, 0.4)";
          iconContent = "!";
          numColor = "var(--color-text-secondary)";
          barColor = "rgba(139, 21, 16, 0.45)";
          deltaText = `Faltan ${(1 - tw).toFixed(2)}`;
          deltaBg = "transparent";
          deltaColor = "var(--color-text-tertiary)";
          message = "Los pesos no suman 1.00. Ajusta los valores o agrega mas factores para completar la MEFE.";
        }

        return (
          <div className="rounded-xl border p-4 space-y-3 transition-all duration-300"
            style={{ borderColor: panelBorder, backgroundColor: panelBg }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full text-[12px] font-medium text-white"
                  style={{ backgroundColor: iconBg }}
                >
                  {iconContent}
                </span>
                <div>
                  <span className="text-xl font-medium" style={{ color: numColor }}>
                    {tw.toFixed(2)}
                  </span>
                  <span className="text-[12px] ml-1" style={{ color: "var(--color-text-tertiary)" }}>/ 1.00</span>
                </div>
              </div>
              {deltaText && (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                  style={{ backgroundColor: deltaBg, color: deltaColor }}
                >
                  {deltaText}
                </span>
              )}
            </div>

            {/* Bar */}
            <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-border-tertiary, rgba(139, 21, 16,0.14))" }}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${isExceeded ? "animate-pulse" : ""}`}
                style={{ width: `${Math.min(tw * 100, 100)}%`, backgroundColor: barColor }}
              />
            </div>

            <p className="text-[12px]" style={{ color: numColor }}>{message}</p>

            {/* Stat badges */}
            {!isEmpty && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-medium" style={{ color: numColor }}>
                  {n} factores · {nO} O · {nA} A
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── AVISOS METODOLOGICOS ── */}
      {n >= 3 && nA === 0 && (
        <div className="flex items-start gap-2 rounded-lg border p-3"
          style={{ borderColor: "rgba(139, 21, 16, 0.25)", backgroundColor: "transparent" }}
        >
          <AlertTriangle className="size-4 shrink-0 mt-0.5" style={{ color: "var(--color-text-secondary)" }} />
          <div>
            <p className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>Solo oportunidades — sin amenazas</p>
            <p className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
              D&apos;Alessio requiere al menos 1 amenaza en la MEFE. Un analisis sin amenazas indica un diagnostico incompleto del entorno.
            </p>
          </div>
        </div>
      )}
      {n >= 3 && nO === 0 && (
        <div className="flex items-start gap-2 rounded-lg border p-3"
          style={{ borderColor: "rgba(139, 21, 16, 0.25)", backgroundColor: "transparent" }}
        >
          <AlertTriangle className="size-4 shrink-0 mt-0.5" style={{ color: "var(--color-text-secondary)" }} />
          <div>
            <p className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>Solo amenazas — sin oportunidades</p>
            <p className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
              D&apos;Alessio requiere al menos 1 oportunidad en la MEFE. Un entorno sin oportunidades identificadas refleja un diagnostico parcial.
            </p>
          </div>
        </div>
      )}
      {n > 0 && n < 10 && (
        <div className="flex items-start gap-2 rounded-lg border p-3"
          style={{ borderColor: "#8B1510", backgroundColor: "transparent" }}
        >
          <Info className="size-4 shrink-0 mt-0.5" style={{ color: "#8B1510" }} />
          <p className="text-[12px]" style={{ color: "var(--foreground)" }}>
            <strong>Factores insuficientes ({n}/10).</strong> D&apos;Alessio recomienda entre 10 y 20 factores para una MEFE completa.
            Sincroniza desde PESTEC y Porter o agrega factores manualmente.
          </p>
        </div>
      )}
      {factors.some((f) => f.sourceFactorId && !f.variable && (f.weight < 0.01 || f.rating === 0)) && (
        <div className="flex items-start gap-2 rounded-lg border p-3"
          style={{ borderColor: "rgba(139, 21, 16, 0.25)", backgroundColor: "transparent" }}
        >
          <AlertTriangle className="size-4 shrink-0 mt-0.5" style={{ color: "var(--color-text-secondary)" }} />
          <div>
            <p className="text-[12px] font-medium" style={{ color: "var(--color-text-secondary)" }}>Factores de Porter sin completar</p>
            <p className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
              Hay factores sincronizados desde Porter con peso o calificacion sin asignar. Completalos antes de finalizar la MEFE.
            </p>
          </div>
        </div>
      )}
      {n > 20 && (
        <div className="flex items-start gap-2 rounded-lg border p-3"
          style={{ borderColor: "#8B1510", backgroundColor: "transparent" }}
        >
          <Info className="size-4 shrink-0 mt-0.5" style={{ color: "#8B1510" }} />
          <p className="text-[12px]" style={{ color: "var(--foreground)" }}>
            <strong>Demasiados factores ({n}/20).</strong> D&apos;Alessio recomienda maximo 20 factores en la MEFE. Elimina los menos relevantes.
          </p>
        </div>
      )}
      {factors.some((f) => f.weight > 0.20) && (
        <div className="flex items-start gap-2 rounded-lg border p-3"
          style={{ borderColor: "rgba(139, 21, 16, 0.25)", backgroundColor: "transparent" }}
        >
          <Info className="size-4 shrink-0 mt-0.5" style={{ color: "var(--color-text-secondary)" }} />
          <p className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
            <strong>Peso elevado detectado.</strong> Algun factor tiene peso superior a 0.20. D&apos;Alessio recomienda que ningun factor supere 0.30 y que la distribucion sea equilibrada.
          </p>
        </div>
      )}

      {/* Source filter tabs + auto-sort */}
      {n > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {([
              { key: "all" as const, label: "Todos", count: n },
              { key: "pestec" as const, label: "PESTEC", count: bySource.pestec, color: "#8B1510", bg: "transparent" },
              { key: "porter" as const, label: "Porter", count: bySource.porter, color: "#b45309", bg: "transparent" },
              { key: "manual" as const, label: "Manual", count: bySource.manual, color: "#a8a29e", bg: "transparent" },
            ]).filter((t) => t.key === "all" || t.count > 0).map((t) => {
              const active = sourceFilter === t.key;
              return (
                <button key={t.key} type="button" onClick={() => setSourceFilter(t.key)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all cursor-pointer"
                  style={{
                    borderColor: active ? (t.color ?? "#8B1510") : "var(--color-border-tertiary)",
                    backgroundColor: active ? (t.bg ?? "transparent") : "transparent",
                    color: active ? (t.color ?? "#8B1510") : "var(--color-text-secondary)",
                  }}
                >
                  {t.label}
                  <span className="text-[10px]">{t.count}</span>
                </button>
              );
            })}
          </div>
          {!fin && (
            <button type="button"
              onClick={() => {
                // Sort: O first (by score desc), then A (by score desc)
                const opp = [...factors].filter((f) => f.type === "O").sort((a, b) => b.score - a.score);
                const thr = [...factors].filter((f) => f.type === "A").sort((a, b) => b.score - a.score);
                [...opp, ...thr].forEach((f, idx) => {
                  if (f.sortOrder !== idx) updateMut.mutate({ id: f.id });
                });
                toast.success("Factores ordenados: Oportunidades primero, Amenazas despues");
                inv();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium cursor-pointer"
              style={{ borderColor: "var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}
            >
              Ordenar automaticamente
            </button>
          )}
        </div>
      )}

      {n > 0 && (() => {
        const filteredFactors = sourceFilter === "all"
          ? factors
          : factors.filter((f) => {
              const src = f.sourceFactorId ? (f.variable === "porter" || f.variable === "competitivo" ? "porter" : "pestec") : "manual";
              return src === sourceFilter;
            });

        return (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-[12px]">#</TableHead>
                <TableHead className="text-[12px]">Factor</TableHead>
                <TableHead className="w-16 text-[12px]">Fuente</TableHead>
                <TableHead className="w-20 text-[12px]">Tipo</TableHead>
                <TableHead className="w-24 text-[12px]">Peso</TableHead>
                <TableHead className="w-40 text-[12px]">Calificacion</TableHead>
                <TableHead className="w-20 text-[12px] text-right">Puntaje</TableHead>
                {!fin && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFactors.map((f, i) => {
                const isO = f.type === "O";
                const src = f.sourceFactorId ? (f.variable === "porter" || f.variable === "competitivo" ? "porter" : "pestec") : "manual";
                const srcCfg = SOURCE_CFG[src] ?? SOURCE_CFG.manual;
                const varData = f.variable ? PESTEC_VARIABLES.find((v) => v.key === f.variable) : null;
                const isWeightEmpty = f.weight < 0.01;
                const isRatingEmpty = f.rating === 0;
                const isWeightHigh = f.weight > 0.30;
                const ppColor = f.rating === 1 ? "#b3261e" : f.rating === 2 ? "#b45309" : f.rating === 3 ? "#1e7f4f" : f.rating === 4 ? "#1e7f4f" : "var(--color-text-tertiary)";
                const isDeleting = confirmDeleteId === f.id;
                const isIncompleteRow = isWeightEmpty || isRatingEmpty;

                return (
                  <TableRow key={f.id} style={{
                    borderLeftWidth: "3px",
                    borderLeftColor: isO ? "#1e7f4f" : "#b3261e",
                    backgroundColor: "transparent",
                  }}>
                    {/* # */}
                    <TableCell className="text-[12px] text-muted-foreground">{i + 1}</TableCell>

                    {/* Factor (editable, truncated) */}
                    <TableCell>
                      {fin ? (
                        <span className="text-[12px] block truncate max-w-[200px]" title={f.description}>{f.description}</span>
                      ) : (
                        <input className="w-full bg-transparent text-[12px] outline-none focus:underline truncate"
                          defaultValue={f.description} title={f.description}
                          onBlur={(e) => { if (e.target.value !== f.description) updateMut.mutate({ id: f.id, description: e.target.value }); }} />
                      )}
                    </TableCell>

                    {/* Fuente + variable sub-badge */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                          style={{ backgroundColor: srcCfg.bg, color: srcCfg.color }}>
                          {srcCfg.label}
                        </span>
                        {varData && (
                          <span className="inline-flex size-4 items-center justify-center rounded text-[8px] font-medium text-white"
                            style={{ backgroundColor: varData.color }}>
                            {varData.letra}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Tipo (editable pill) */}
                    <TableCell>
                      {fin ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{ backgroundColor: "transparent", border: `1px solid ${isO ? "#1e7f4f" : "#b3261e"}`, color: isO ? "#1e7f4f" : "#b3261e" }}>
                          {isO ? "O" : "A"}
                        </span>
                      ) : (
                        <button type="button"
                          onClick={() => updateMut.mutate({ id: f.id, type: isO ? "A" : "O" })}
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium cursor-pointer transition-colors"
                          style={{ backgroundColor: "transparent", border: `1px solid ${isO ? "#1e7f4f" : "#b3261e"}`, color: isO ? "#1e7f4f" : "#b3261e" }}
                          title={`Click para cambiar a ${isO ? "Amenaza" : "Oportunidad"}`}
                        >
                          {isO ? "O" : "A"}
                        </button>
                      )}
                    </TableCell>

                    {/* Peso */}
                    <TableCell>
                      {fin ? (
                        <span className="text-[12px]">{f.weight.toFixed(2)}</span>
                      ) : (
                        <Input type="number" step="0.01" min="0.01" max="0.30"
                          className="h-7 w-20 text-[12px]"
                          defaultValue={isWeightEmpty ? "" : f.weight.toFixed(2)}
                          placeholder={isWeightEmpty ? "Asignar" : undefined}
                          style={{
                            borderColor: isWeightHigh ? "#b3261e" : isWeightEmpty ? "#b45309" : undefined,
                            backgroundColor: "transparent",
                          }}
                          onBlur={(e) => { const w = parseFloat(e.target.value); if (!isNaN(w)) updateMut.mutate({ id: f.id, weight: w }); }}
                        />
                      )}
                    </TableCell>

                    {/* Calificacion */}
                    <TableCell>
                      {fin ? (
                        <span className="text-[12px]">{f.rating} - {MEFE_RESPONSE_LABELS[f.rating as 1 | 2 | 3 | 4]?.label ?? ""}</span>
                      ) : (
                        <Select defaultValue={isRatingEmpty ? "" : f.rating.toString()}
                          onValueChange={(v) => v && updateMut.mutate({ id: f.id, rating: parseInt(v, 10) })}>
                          <SelectTrigger className="w-full text-[12px] h-7"
                            style={{ borderColor: isRatingEmpty ? "#b45309" : undefined, backgroundColor: "transparent" }}
                          >
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4].map((r) => (
                              <SelectItem key={r} value={r.toString()}>
                                {r} - {MEFE_RESPONSE_LABELS[r as 1 | 2 | 3 | 4].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>

                    {/* Puntaje (colored by rating) */}
                    <TableCell className="text-right">
                      <span className="text-[13px] font-medium" style={{ color: ppColor }}>
                        {f.score > 0 ? f.score.toFixed(2) : "—"}
                      </span>
                    </TableCell>

                    {/* Acciones (confirm delete) */}
                    {!fin && (
                      <TableCell>
                        {isDeleting ? (
                          <div className="flex items-center gap-1">
                            <button type="button"
                              onClick={() => { deleteMut.mutate({ id: f.id }); setConfirmDeleteId(null); }}
                              className="rounded px-1.5 py-0.5 text-[10px] text-white cursor-pointer"
                              style={{ backgroundColor: "transparent" }}>Si</button>
                            <button type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded border px-1.5 py-0.5 text-[10px] cursor-pointer"
                              style={{ borderColor: "var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>No</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setConfirmDeleteId(f.id)}
                            className="rounded p-1 hover:bg-muted cursor-pointer">
                            <Trash2 className="size-3.5 text-destructive" />
                          </button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="font-medium">
                <TableCell /><TableCell className="text-[13px]">TOTAL</TableCell><TableCell /><TableCell />
                <TableCell><span className="text-[13px]" style={{ color: wv ? "#1e7f4f" : "#b3261e" }}>{tw.toFixed(2)}</span></TableCell>
                <TableCell className="text-[12px] text-muted-foreground">—</TableCell>
                <TableCell className="text-right">
                  {wv ? (
                    <span className="text-[15px] font-medium" style={{ color: "#8B1510" }}>{ppt.toFixed(2)}</span>
                  ) : (
                    <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>Ajusta pesos</span>
                  )}
                </TableCell>
                {!fin && <TableCell />}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        );
      })()}

      {n > 0 && wv && (() => {
        const interp = ppt < 2.0
          ? "Las amenazas dominan fuertemente el entorno. Se requieren estrategias defensivas prioritarias."
          : ppt < 2.5
          ? "Las amenazas predominan sobre las oportunidades. La organizacion debe fortalecer su respuesta al entorno."
          : ppt < 3.0
          ? "La organizacion responde adecuadamente a su entorno externo."
          : "La organizacion aprovecha muy bien su entorno. Posicion externa solida para estrategias ofensivas.";
        const isGood = ppt >= 2.5;
        return (
          <div className="rounded-xl border p-5 space-y-3"
            style={{ borderColor: isGood ? "#1e7f4f" : "#b3261e", backgroundColor: "transparent" }}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium uppercase tracking-widest" style={{ color: isGood ? "#1e7f4f" : "#b3261e" }}>
                Puntaje Ponderado Total (PPT)
              </span>
              <span className="text-2xl font-medium" style={{ color: isGood ? "#1e7f4f" : "#b3261e" }}>
                {ppt.toFixed(2)}
              </span>
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: isGood ? "#1e7f4f" : "#b3261e" }}>
              {interp}
            </p>
            <p className="text-[11px]" style={{ color: isGood ? "#1e7f4f" : "#b3261e", opacity: 0.7 }}>
              D&apos;Alessio: PPT &lt; 2.5 indica que las amenazas predominan. PPT &gt;= 2.5 indica respuesta favorable al entorno.
              El PPT se usa como eje Y de la Matriz IE.
            </p>
          </div>
        );
      })()}

      {n === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center space-y-3">
          <Globe className="size-8 mx-auto" style={{ color: "var(--color-text-tertiary)" }} />
          <p className="text-[14px] font-medium" style={{ color: "var(--color-text-secondary)" }}>La MEFE aun no tiene factores</p>
          <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
            Evalua factores en el PESTEC y marca &quot;Incluir en MEFE&quot;, luego sincroniza aqui.
          </p>
        </div>
      )}
    </div>
  );
}
