"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/router";
import { trpc } from "@/lib/trpc";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  FileText,
  FileImage,
  FileDown,
  Layers,
  RefreshCw,
  Building2,
  Network,
  Grid3X3,
  GitBranch,
  Share2,
  Puzzle,
  Crown,
  Users,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import {
  STRUCTURE_TYPES,
  NODE_TYPES,
  RACI_OPTIONS,
  getStructureTypeDef,
  getNodeTypeDef,
  type StructureType,
  type NodeType,
  type RaciRole,
} from "@/lib/org-structure";
import { exportOrgPdf, exportOrgExcel, exportCanvasPng, exportCanvasSvg } from "@/lib/lazy-exports";
import type { ExportOrgContext, ExportNode } from "@/lib/org-export";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type SetupData = RouterOutputs["orgStructure"]["setup"];
type RecData = RouterOutputs["orgStructure"]["recommendType"];
type OrgNodeItem = NonNullable<SetupData["structure"]>["nodes"][number];
type Step = 1 | 2 | 3;

const TYPE_ICONS: Record<string, LucideIcon> = {
  Network,
  Building2,
  Grid3X3,
  GitBranch,
  Share2,
  Puzzle,
};

export default function StructurePage() {
  return (
    <ReactFlowProvider>
      <StructurePageInner />
    </ReactFlowProvider>
  );
}

function StructurePageInner() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const utils = trpc.useUtils();

  const [step, setStep] = useState<Step>(1);
  const [selectedType, setSelectedType] = useState<StructureType | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const setupQuery = trpc.orgStructure.setup.useQuery({ cycleId });
  const recQuery = trpc.orgStructure.recommendType.useQuery({ cycleId });

  const autoGenerate = trpc.orgStructure.autoGenerate.useMutation({
    onSuccess: (res) => {
      utils.orgStructure.setup.invalidate({ cycleId });
      if (res.created > 0) toast.success(res.message);
    },
    onError: (e) => toast.error(e.message),
  });

  const setType = trpc.orgStructure.createOrUpdateStructure.useMutation({
    onSuccess: () => utils.orgStructure.setup.invalidate({ cycleId }),
    onError: (e) => toast.error(e.message),
  });

  const updateNode = trpc.orgStructure.updateNode.useMutation({
    onSuccess: () => utils.orgStructure.setup.invalidate({ cycleId }),
    onError: (e) => toast.error(e.message),
  });

  const addNode = trpc.orgStructure.addNode.useMutation({
    onSuccess: () => {
      utils.orgStructure.setup.invalidate({ cycleId });
      toast.success("Nodo agregado");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteNode = trpc.orgStructure.deleteNode.useMutation({
    onSuccess: () => {
      utils.orgStructure.setup.invalidate({ cycleId });
      setSelectedNodeId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePositions = trpc.orgStructure.updatePositions.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const setNodeOcps = trpc.orgStructure.setNodeOcps.useMutation({
    onSuccess: () => utils.orgStructure.setup.invalidate({ cycleId }),
    onError: (e) => toast.error(e.message),
  });

  const setNodePolicies = trpc.orgStructure.setNodePolicies.useMutation({
    onSuccess: () => utils.orgStructure.setup.invalidate({ cycleId }),
    onError: (e) => toast.error(e.message),
  });

  const confirmStructure = trpc.orgStructure.confirmStructure.useMutation({
    onSuccess: () => {
      utils.orgStructure.setup.invalidate({ cycleId });
      toast.success("Estructura confirmada");
    },
    onError: (e) => toast.error(e.message),
  });

  const setup = setupQuery.data;
  const rec = recQuery.data;

  // Cuando llega la recomendación, preseleccionar
  useEffect(() => {
    if (rec && !selectedType && !setup?.structure) {
      setSelectedType(rec.recommendation.type);
    }
  }, [rec, setup?.structure, selectedType]);

  // Cuando ya hay estructura, usar su tipo
  useEffect(() => {
    if (setup?.structure && !selectedType) {
      setSelectedType(setup.structure.type as StructureType);
    }
  }, [setup?.structure, selectedType]);

  function handleSelectType(type: StructureType) {
    setSelectedType(type);
  }

  function handleContinueToStep2() {
    if (!selectedType) return;
    autoGenerate.mutate(
      { cycleId, type: selectedType, replaceExisting: false },
      {
        onSuccess: () => setStep(2),
      },
    );
  }

  function handleRegenerate() {
    if (!selectedType) return;
    if (
      !confirm(
        "Esto reemplazará el organigrama actual con uno regenerado desde los datos. ¿Continuar?",
      )
    )
      return;
    autoGenerate.mutate({ cycleId, type: selectedType, replaceExisting: true });
  }

  if (setupQuery.isLoading) {
    return (
      <div className="animate-pulse text-muted-foreground">Cargando módulo de Estructura...</div>
    );
  }
  if (!setup) {
    return <div className="text-muted-foreground">No se pudo cargar la información del ciclo.</div>;
  }

  const noOcps = setup.ocps.length === 0;

  return (
    <div className={cn("space-y-6", isFullscreen && "h-screen overflow-hidden")}>
      <PageHeader />
      <Stepper step={step} onChange={setStep} canGoStep2={!!setup.structure || !!selectedType} />

      {noOcps && (
        <Card className="border-amber-500/30 bg-transparent">
          <CardContent className="py-3 text-left text-xs text-amber-300">
            Para mejores resultados, define primero tus OCPs en M4. El sistema usará esa
            información para sugerir las áreas necesarias.
          </CardContent>
        </Card>
      )}

      {step === 1 && rec && (
        <Step1
          setup={setup}
          recommendation={rec}
          selectedType={selectedType}
          onSelect={handleSelectType}
          onContinue={handleContinueToStep2}
          isGenerating={autoGenerate.isPending || setType.isPending}
        />
      )}

      {step === 2 && setup.structure && (
        <Step2
          cycleId={cycleId}
          setup={setup}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onUpdateNode={(id, data) => updateNode.mutate({ id, ...data })}
          onAddNode={(args) =>
            addNode.mutate({ cycleId, structureId: setup.structure!.id, ...args })
          }
          onDeleteNode={(id) => deleteNode.mutate({ id })}
          onSavePositions={(positions) =>
            updatePositions.mutate({ structureId: setup.structure!.id, positions })
          }
          onRegenerate={handleRegenerate}
          onSetNodeOcps={(nodeId, items) => setNodeOcps.mutate({ nodeId, items })}
          onSetNodePolicies={(nodeId, items) => setNodePolicies.mutate({ nodeId, items })}
          onContinue={() => setStep(3)}
          onBack={() => setStep(1)}
          isFullscreen={isFullscreen}
          setFullscreen={setIsFullscreen}
        />
      )}

      {step === 3 && setup.structure && (
        <Step3
          cycleId={cycleId}
          setup={setup}
          onBack={() => setStep(2)}
          onConfirm={() => confirmStructure.mutate({ cycleId })}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Header + Stepper
// ───────────────────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <div className="space-y-1 text-left">
      <h2 className="text-lg font-semibold">Estructura Organizacional</h2>
      <p className="text-sm text-muted-foreground">
        El marco que define áreas, jerarquías y relaciones para ejecutar la estrategia. La
        estructura sigue a la estrategia.
      </p>
    </div>
  );
}

function Stepper({
  step,
  onChange,
  canGoStep2,
}: {
  step: Step;
  onChange: (s: Step) => void;
  canGoStep2: boolean;
}) {
  const steps: { id: Step; label: string; description: string }[] = [
    { id: 1, label: "1 · Tipo", description: "Recomendación y elección" },
    { id: 2, label: "2 · Organigrama", description: "Editor visual auto-generado" },
    { id: 3, label: "3 · Validar", description: "Matriz RACI y exportación" },
  ];
  return (
    <div className="flex items-stretch gap-2">
      {steps.map((s) => {
        const active = s.id === step;
        const disabled = s.id > 1 && !canGoStep2;
        return (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s.id)}
            className={cn(
              "flex flex-1 flex-col items-start rounded-lg border px-4 py-3 text-left transition",
              active
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:bg-muted/30",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span className="text-sm font-medium">{s.label}</span>
            <span className="text-xs text-muted-foreground">{s.description}</span>
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// STEP 1 · Tipo y recomendación
// ───────────────────────────────────────────────────────────────────────

function Step1({
  setup,
  recommendation,
  selectedType,
  onSelect,
  onContinue,
  isGenerating,
}: {
  setup: SetupData;
  recommendation: RecData;
  selectedType: StructureType | null;
  onSelect: (t: StructureType) => void;
  onContinue: () => void;
  isGenerating: boolean;
}) {
  const recType = recommendation.recommendation.type;

  return (
    <div className="space-y-6">
      <Card className="border-primary/25 bg-primary/10/40">
        <CardContent className="py-4 text-left text-sm text-primary">
          <strong className="block">La estructura sigue a la estrategia.</strong>
          <span className="text-primary/80">
            Elige el tipo de organización más adecuado para ejecutar tu plan. El sistema
            analizó tus estrategias y te sugiere la opción más alineada.
          </span>
        </CardContent>
      </Card>

      <Card className="border-2 border-emerald-500/30 bg-transparent">
        <CardHeader>
          <CardTitle className="text-left text-base text-emerald-300">
            <Sparkles className="mr-1 inline size-4" />
            Recomendación: {getStructureTypeDef(recType)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-left text-sm text-emerald-300">
          <p>{recommendation.recommendation.reason}</p>
          {recommendation.recommendation.detectedSignals.length > 0 && (
            <ul className="ml-4 list-disc text-xs">
              {recommendation.recommendation.detectedSignals.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
          {recommendation.markets.length > 0 && (
            <p className="text-xs">
              <strong>Mercados detectados:</strong>{" "}
              {recommendation.markets.map((m) => m.label).join(", ")}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {STRUCTURE_TYPES.map((t) => {
          const isSelected = selectedType === t.key;
          const isRecommended = recType === t.key;
          const Icon = TYPE_ICONS[t.icon] ?? Layers;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onSelect(t.key)}
              className={cn(
                "relative flex flex-col rounded-xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
                isSelected
                  ? "border-2 ring-2 ring-primary/30"
                  : "border hover:border-primary/40",
                isRecommended && !isSelected && "border-primary/30 bg-primary/10/30",
              )}
              style={
                isSelected
                  ? { borderColor: t.color, backgroundColor: `${t.color}10` }
                  : undefined
              }
            >
              {isRecommended && (
                <Badge className="absolute right-3 top-3 border-emerald-500 bg-transparent0 text-white">
                  <Sparkles className="mr-1 size-3" />
                  Recomendada
                </Badge>
              )}
              <div
                className="mb-3 flex size-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${t.color}20`, color: t.color }}
              >
                <Icon className="size-6" />
              </div>
              <h3 className="text-base font-semibold">{t.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                <strong>Ideal cuando:</strong> {t.whenToUse}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-end pt-2">
        <Button onClick={onContinue} disabled={!selectedType || isGenerating}>
          {isGenerating
            ? "Generando organigrama..."
            : selectedType
            ? `Continuar con ${getStructureTypeDef(selectedType)?.label}`
            : "Selecciona un tipo"}
          <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// STEP 2 · Canvas React Flow
// ───────────────────────────────────────────────────────────────────────

// Custom node component
function OrgFlowNode({ data, selected }: NodeProps) {
  const d = data as {
    label: string;
    code: string;
    nodeType: string;
    origin: string;
    ocpCount: number;
    policyCount: number;
    ftes: number | null;
  };
  const ndef = getNodeTypeDef(d.nodeType);
  const originIcon = d.origin === "auto_generated" ? "⚡" : d.origin === "template" ? "📋" : "+";

  return (
    <div
      className={cn(
        "rounded-xl border-2 px-3 py-2 shadow-md transition-all",
        selected ? "ring-2 ring-amber-500" : "",
        d.origin === "template" && "border-dashed",
      )}
      style={{
        borderColor: ndef?.color,
        backgroundColor: ndef?.color,
        color: ndef?.textColor,
        minWidth: 160,
        maxWidth: 220,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-white/5 !border-white" />
      <div className="flex items-center justify-between gap-1 text-[10px] opacity-80">
        <span className="font-mono">{d.code}</span>
        <span>{originIcon}</span>
      </div>
      <div className="mt-0.5 text-sm font-semibold leading-tight">{d.label}</div>
      <div className="mt-1 flex flex-wrap gap-1 text-[10px] opacity-90">
        {d.ocpCount > 0 && <span>{d.ocpCount} OCPs</span>}
        {d.policyCount > 0 && <span>· {d.policyCount} pol</span>}
        {d.ftes != null && <span>· {d.ftes} FTE</span>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-white/5 !border-white" />
    </div>
  );
}

const nodeTypes = { org: OrgFlowNode };

function Step2({
  cycleId,
  setup,
  selectedNodeId,
  onSelectNode,
  onUpdateNode,
  onAddNode,
  onDeleteNode,
  onSavePositions,
  onRegenerate,
  onSetNodeOcps,
  onSetNodePolicies,
  onContinue,
  onBack,
  isFullscreen,
  setFullscreen,
}: {
  cycleId: string;
  setup: SetupData;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onUpdateNode: (
    id: string,
    data: {
      name?: string;
      code?: string;
      nodeType?: NodeType;
      responsibleRole?: string | null;
      ftesEstimated?: number | null;
    },
  ) => void;
  onAddNode: (args: {
    code: string;
    name: string;
    nodeType: NodeType;
    positionX: number;
    positionY: number;
    parentNodeId?: string;
  }) => void;
  onDeleteNode: (id: string) => void;
  onSavePositions: (positions: { id: string; x: number; y: number }[]) => void;
  onRegenerate: () => void;
  onSetNodeOcps: (
    nodeId: string,
    items: { ocpId: string; raciRole: RaciRole }[],
  ) => void;
  onSetNodePolicies: (
    nodeId: string,
    items: { politicaId: string; applies: "completamente" | "parcialmente" }[],
  ) => void;
  onContinue: () => void;
  onBack: () => void;
  isFullscreen: boolean;
  setFullscreen: (v: boolean) => void;
}) {
  const structure = setup.structure!;
  const flowRef = useRef<HTMLDivElement | null>(null);

  // History stack para undo/redo (snapshots de positions)
  const [history, setHistory] = useState<Array<Record<string, { x: number; y: number }>>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const initialNodes = useMemo<Node[]>(
    () =>
      structure.nodes.map((n) => ({
        id: n.id,
        type: "org",
        position: { x: n.positionX, y: n.positionY },
        data: {
          label: n.name,
          code: n.code,
          nodeType: n.nodeType,
          origin: n.origin,
          ocpCount: n.ocpLinks.length,
          policyCount: n.policyLinks.length,
          ftes: n.ftesEstimated,
        },
        draggable: true,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [structure.nodes.length, structure.id],
  );

  const initialEdges = useMemo<Edge[]>(
    () =>
      structure.relations.map((r) => ({
        id: `e-${r.parentNodeId}-${r.childNodeId}`,
        source: r.parentNodeId,
        target: r.childNodeId,
        animated: false,
        style:
          r.relationType === "transversal"
            ? { stroke: "#BA7517", strokeDasharray: "6 4" }
            : r.relationType === "reporta_funcional"
            ? { stroke: "#a78bfa", strokeDasharray: "3 3" }
            : { stroke: "#94A3B8" },
        type: "smoothstep",
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [structure.relations.length, structure.id],
  );

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  // Sync when server changes
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges]);

  const pushHistory = useCallback((snapshot: Record<string, { x: number; y: number }>) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(snapshot);
      return newHistory.slice(-30); // limit
    });
    setHistoryIndex((i) => Math.min(i + 1, 29));
  }, [historyIndex]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onNodeDragStop = useCallback(() => {
    const positions = nodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));
    onSavePositions(positions);
    const snap: Record<string, { x: number; y: number }> = {};
    for (const n of nodes) snap[n.id] = n.position;
    pushHistory(snap);
  }, [nodes, onSavePositions, pushHistory]);

  function undo() {
    if (historyIndex <= 0) return;
    const target = history[historyIndex - 1];
    setHistoryIndex((i) => i - 1);
    setNodes((nds) =>
      nds.map((n) => (target[n.id] ? { ...n, position: target[n.id] } : n)),
    );
    onSavePositions(
      Object.entries(target).map(([id, p]) => ({ id, x: p.x, y: p.y })),
    );
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    const target = history[historyIndex + 1];
    setHistoryIndex((i) => i + 1);
    setNodes((nds) =>
      nds.map((n) => (target[n.id] ? { ...n, position: target[n.id] } : n)),
    );
    onSavePositions(
      Object.entries(target).map(([id, p]) => ({ id, x: p.x, y: p.y })),
    );
  }

  const selectedNode = structure.nodes.find((n) => n.id === selectedNodeId) ?? null;

  function handleAddBlock(nodeType: NodeType, namePrefix: string) {
    const ndef = NODE_TYPES.find((n) => n.key === nodeType)!;
    const codes = setup.structure!.nodes.map((n) => n.code);
    let i = 1;
    let code = `${namePrefix.toUpperCase().slice(0, 4)}-${i}`;
    while (codes.includes(code)) {
      i++;
      code = `${namePrefix.toUpperCase().slice(0, 4)}-${i}`;
    }
    onAddNode({
      code,
      name: namePrefix,
      nodeType,
      positionX: Math.random() * 200,
      positionY: ndef.hierarchyLevel * 140,
    });
  }

  return (
    <div className={cn("space-y-4", isFullscreen && "fixed inset-0 z-50 bg-background p-4")}>
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 size-4" /> Volver al tipo
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="mr-1 size-4" /> : <Maximize2 className="mr-1 size-4" />}
            {isFullscreen ? "Salir" : "Pantalla completa"}
          </Button>
          <Button size="sm" onClick={onContinue}>
            Ver validación <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>
      </div>

      {!isFullscreen && (
        <Card className="border-emerald-500/30 bg-transparent">
          <CardContent className="py-3 text-left text-xs text-emerald-300">
            <strong>Organigrama generado automáticamente.</strong> El sistema construyó la
            estructura {structure.type} basándose en tus estrategias, OCPs y mitigantes éticos.
            Revisa, edita o agrega lo que falte. Todo es modificable.
          </CardContent>
        </Card>
      )}

      <div className={cn("grid gap-4", isFullscreen ? "h-[90vh] grid-cols-[260px_1fr]" : "lg:grid-cols-[260px_1fr]")}>
        {/* SIDEBAR */}
        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={onRegenerate}>
                <RefreshCw className="mr-2 size-4" /> Regenerar
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={undo} disabled={historyIndex <= 0}>
                ↶ Deshacer
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={redo} disabled={historyIndex >= history.length - 1}>
                ↷ Rehacer
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Agregar nodo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <DragBlock label="Directorio" type="directorio" icon={Crown} onClick={() => handleAddBlock("directorio", "Directorio")} />
              <DragBlock label="CEO / GG" type="ceo" icon={Crown} onClick={() => handleAddBlock("ceo", "CEO")} />
              <DragBlock label="División" type="division" icon={Building2} onClick={() => handleAddBlock("division", "División")} />
              <DragBlock label="Gerencia" type="gerencia" icon={Users} onClick={() => handleAddBlock("gerencia", "Gerencia")} />
              <DragBlock label="Jefatura" type="jefatura" icon={Users} onClick={() => handleAddBlock("jefatura", "Jefatura")} />
              <DragBlock label="Comité" type="comite" icon={ShieldAlert} onClick={() => handleAddBlock("comite", "Comité")} />
              <DragBlock label="Auditoría" type="auditoria" icon={ShieldAlert} onClick={() => handleAddBlock("auditoria", "Auditoría")} />
            </CardContent>
          </Card>

          <Card className="text-[10px] text-muted-foreground">
            <CardContent className="py-3 space-y-1">
              <div>⚡ Auto-generado</div>
              <div>📋 Plantilla del tipo</div>
              <div>+ Agregado por ti</div>
            </CardContent>
          </Card>
        </div>

        {/* CANVAS */}
        <div className={cn("relative rounded-lg border bg-muted/20", isFullscreen ? "h-full" : "h-[640px]")} ref={flowRef}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={(_e, node) => onSelectNode(node.id)}
            onPaneClick={() => onSelectNode(null)}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(167,139,250,0.14)" />
            <Controls />
            <MiniMap nodeColor={(n) => getNodeTypeDef((n.data as { nodeType: string }).nodeType)?.color ?? "#64748b"} />
          </ReactFlow>
        </div>
      </div>

      {/* EDITOR INLINE */}
      {selectedNode && (
        <NodeEditor
          node={selectedNode}
          setup={setup}
          onUpdate={(data) => onUpdateNode(selectedNode.id, data)}
          onDelete={() => onDeleteNode(selectedNode.id)}
          onSetOcps={(items) => onSetNodeOcps(selectedNode.id, items)}
          onSetPolicies={(items) => onSetNodePolicies(selectedNode.id, items)}
        />
      )}
    </div>
  );
}

function DragBlock({
  label,
  type,
  icon: Icon,
  onClick,
}: {
  label: string;
  type: NodeType;
  icon: LucideIcon;
  onClick: () => void;
}) {
  const ndef = getNodeTypeDef(type)!;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-all hover:-translate-y-0.5 hover:shadow-sm"
      style={{ borderColor: `${ndef.color}40`, color: ndef.color }}
    >
      <Icon className="size-3.5" />
      <span className="flex-1 text-left">{label}</span>
      <Plus className="size-3" />
    </button>
  );
}

function NodeEditor({
  node,
  setup,
  onUpdate,
  onDelete,
  onSetOcps,
  onSetPolicies,
}: {
  node: OrgNodeItem;
  setup: SetupData;
  onUpdate: (data: {
    name?: string;
    code?: string;
    nodeType?: NodeType;
    responsibleRole?: string | null;
    ftesEstimated?: number | null;
  }) => void;
  onDelete: () => void;
  onSetOcps: (items: { ocpId: string; raciRole: RaciRole }[]) => void;
  onSetPolicies: (items: { politicaId: string; applies: "completamente" | "parcialmente" }[]) => void;
}) {
  const [name, setName] = useState(node.name);
  const [code, setCode] = useState(node.code);
  const [responsible, setResponsible] = useState(node.responsibleRole ?? "");
  const [ftes, setFtes] = useState(node.ftesEstimated != null ? String(node.ftesEstimated) : "");

  useEffect(() => {
    setName(node.name);
    setCode(node.code);
    setResponsible(node.responsibleRole ?? "");
    setFtes(node.ftesEstimated != null ? String(node.ftesEstimated) : "");
  }, [node.id, node.name, node.code, node.responsibleRole, node.ftesEstimated]);

  const ocpLinkMap = new Map(node.ocpLinks.map((l) => [l.ocpId, l.raciRole as RaciRole]));
  const policyApplyMap = new Map(
    node.policyLinks.map((p) => [p.politicaId, p.applies as "completamente" | "parcialmente"]),
  );

  function toggleOcp(ocpId: string, role: RaciRole) {
    const items: { ocpId: string; raciRole: RaciRole }[] = [];
    const current = new Map(ocpLinkMap);
    if (current.get(ocpId) === role) {
      current.delete(ocpId);
    } else {
      current.set(ocpId, role);
    }
    for (const [id, r] of current) items.push({ ocpId: id, raciRole: r });
    onSetOcps(items);
  }

  function togglePolicy(politicaId: string) {
    const items: { politicaId: string; applies: "completamente" | "parcialmente" }[] = [];
    const current = new Map(policyApplyMap);
    if (current.has(politicaId)) current.delete(politicaId);
    else current.set(politicaId, "completamente");
    for (const [id, applies] of current) items.push({ politicaId: id, applies });
    onSetPolicies(items);
  }

  const originLabel =
    node.origin === "auto_generated"
      ? "⚡ Auto-generado"
      : node.origin === "template"
      ? "📋 Plantilla"
      : "+ Agregado manualmente";

  return (
    <Card className="border-2 border-amber-500/30">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{code}</Badge>
            <CardTitle className="text-base">{name}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {originLabel}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
            <Trash2 className="mr-1 size-4" /> Eliminar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-left">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Código</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onBlur={() => code !== node.code && onUpdate({ code })}
            />
          </div>
          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name !== node.name && onUpdate({ name })}
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select
              value={node.nodeType}
              onValueChange={(v) => onUpdate({ nodeType: v as NodeType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NODE_TYPES.map((n) => (
                  <SelectItem key={n.key} value={n.key}>
                    {n.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Responsable / Cargo</Label>
            <Input
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              onBlur={() =>
                responsible !== (node.responsibleRole ?? "") &&
                onUpdate({ responsibleRole: responsible || null })
              }
              placeholder="VP División EE.UU."
            />
          </div>
          <div className="space-y-1">
            <Label>FTEs estimados</Label>
            <Input
              type="number"
              value={ftes}
              onChange={(e) => setFtes(e.target.value)}
              onBlur={() => {
                const v = ftes ? Number(ftes) : null;
                if (v !== node.ftesEstimated) onUpdate({ ftesEstimated: v });
              }}
              placeholder="Por definir..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">OCPs asignados</Label>
          {setup.ocps.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Sin OCPs definidos en este ciclo
            </p>
          ) : (
            <div className="space-y-1.5">
              {setup.ocps.map((o) => {
                const currentRole = ocpLinkMap.get(o.id);
                return (
                  <div
                    key={o.id}
                    className="flex flex-wrap items-center gap-1.5 rounded-md border bg-muted/10 px-2 py-1.5 text-xs"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {o.code}
                    </span>
                    <span className="flex-1 truncate">{o.description}</span>
                    <div className="flex gap-1">
                      {RACI_OPTIONS.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => toggleOcp(o.id, r.value)}
                          className={cn(
                            "rounded px-2 py-0.5 text-[10px] font-medium transition",
                            currentRole === r.value
                              ? "text-white"
                              : "border border-border bg-background text-muted-foreground hover:bg-muted",
                          )}
                          style={
                            currentRole === r.value
                              ? { backgroundColor: r.bg, color: r.color }
                              : undefined
                          }
                          title={r.description}
                        >
                          {r.value}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Políticas que aplica</Label>
          {setup.policies.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Sin políticas confirmadas</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {setup.policies.map((p) => {
                const isOn = policyApplyMap.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePolicy(p.id)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] transition",
                      isOn
                        ? p.mandatory
                          ? "border-amber-400 bg-transparent text-amber-300"
                          : "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted/20 hover:bg-muted",
                    )}
                    title={p.name}
                  >
                    {p.code}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {node.ocpLinks.length === 0 && node.policyLinks.length === 0 && (
          <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-transparent px-3 py-2 text-xs text-amber-300">
            <AlertTriangle className="size-4" />
            Esta área no tiene OCPs ni políticas asignadas. ¿Qué hace?
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ───────────────────────────────────────────────────────────────────────
// STEP 3 · Validar
// ───────────────────────────────────────────────────────────────────────

function Step3({
  cycleId,
  setup,
  onBack,
  onConfirm,
}: {
  cycleId: string;
  setup: SetupData;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const utils = trpc.useUtils();
  const structure = setup.structure!;

  const levels = new Set(structure.nodes.map((n) => n.hierarchyLevel)).size;
  const committees = structure.nodes.filter(
    (n) => n.nodeType === "comite" || n.nodeType === "auditoria",
  );
  const ocpsCoveredIds = new Set(
    structure.nodes.flatMap((n) => n.ocpLinks.map((l) => l.ocpId)),
  );
  const coveragePct =
    setup.ocps.length === 0
      ? 100
      : Math.round((ocpsCoveredIds.size / setup.ocps.length) * 100);

  // Áreas sin OCPs
  const areasWithoutOcps = structure.nodes.filter(
    (n) => n.ocpLinks.length === 0 && n.nodeType !== "directorio" && n.nodeType !== "ceo",
  );
  // Cargas altas
  const overloaded = structure.nodes.filter((n) => n.ocpLinks.length > 5);
  // OCPs huérfanos
  const orphanOcps = setup.ocps.filter((o) => !ocpsCoveredIds.has(o.id));
  // Duplicados de nombre
  const nameMap = new Map<string, OrgNodeItem[]>();
  for (const n of structure.nodes) {
    const k = n.name.toLowerCase().trim();
    if (!nameMap.has(k)) nameMap.set(k, []);
    nameMap.get(k)!.push(n);
  }
  const duplicates = Array.from(nameMap.values()).filter((arr) => arr.length > 1);

  const observations: string[] = [];
  for (const a of areasWithoutOcps) {
    observations.push(`${a.code} · ${a.name} no tiene OCPs asignados`);
  }
  for (const a of overloaded) {
    observations.push(`${a.code} · ${a.name} maneja ${a.ocpLinks.length} OCPs (carga alta)`);
  }
  for (const o of orphanOcps) {
    observations.push(`${o.code} · sin área responsable asignada`);
  }
  for (const dup of duplicates) {
    observations.push(`Áreas con nombre duplicado: ${dup.map((d) => d.code).join(", ")}`);
  }

  // Carga por área
  const loadByNode = structure.nodes
    .map((n) => ({ node: n, count: n.ocpLinks.length }))
    .sort((a, b) => b.count - a.count);
  const maxLoad = Math.max(1, ...loadByNode.map((l) => l.count));

  const narrative = useMemo(() => {
    const parts: string[] = [];
    parts.push(
      `Tu estructura ${structure.type} tiene ${structure.nodes.length} áreas distribuidas en ${levels} niveles jerárquicos.`,
    );
    const mostLoaded = loadByNode.find((l) => l.count > 0);
    if (mostLoaded) {
      parts.push(
        `La más cargada es ${mostLoaded.node.code} con ${mostLoaded.count} OCPs.`,
      );
    }
    if (committees.length > 0) {
      parts.push(`${committees.length} comité(s) transversal(es) refuerzan la coordinación.`);
    }
    if (orphanOcps.length > 0) {
      parts.push(`Quedan ${orphanOcps.length} OCPs sin área responsable clara.`);
    }
    return parts.join(" ");
  }, [structure, levels, loadByNode, committees, orphanOcps]);

  const flowExportRef = useRef<HTMLDivElement | null>(null);

  async function buildExportContext(): Promise<ExportOrgContext | null> {
    const data = await utils.orgStructure.getExportData.fetch({ cycleId });
    if (!data.structure) return null;
    return {
      cycle: data.cycle,
      organization: data.organization,
      structure: {
        id: data.structure.id,
        type: data.structure.type,
        name: data.structure.name,
        status: data.structure.status,
        nodes: data.structure.nodes as unknown as ExportNode[],
        relations: data.structure.relations,
      },
      ocps: data.ocps,
      policies: data.policies,
    };
  }

  async function handleExportPdf() {
    const ctx = await buildExportContext();
    if (!ctx) return;
    await exportOrgPdf(ctx, flowExportRef.current);
    toast.success("PDF generado");
  }

  async function handleExportExcel() {
    const ctx = await buildExportContext();
    if (!ctx) return;
    exportOrgExcel(ctx);
    toast.success("Excel generado");
  }

  async function handleExportPng() {
    if (!flowExportRef.current) return;
    await exportCanvasPng(flowExportRef.current, `estructura-${structure.type}`);
    toast.success("PNG generado");
  }

  async function handleExportSvg() {
    if (!flowExportRef.current) return;
    await exportCanvasSvg(flowExportRef.current, `estructura-${structure.type}`);
    toast.success("SVG generado");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 size-4" /> Volver al organigrama
        </Button>
        <Button onClick={onConfirm} variant="default">
          <CheckCircle2 className="mr-1 size-4" /> Confirmar estructura
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Áreas" value={structure.nodes.length} />
        <MetricCard label="Niveles" value={levels} />
        <MetricCard label="Comités" value={committees.length} />
        <MetricCard label="Cobertura OCPs" value={`${coveragePct}%`} />
      </div>

      {/* Canvas escondido para exportar */}
      <div className="absolute -left-[10000px] h-[600px] w-[1000px]" ref={flowExportRef}>
        <MiniOrgPreview structure={structure} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base">Matriz de responsabilidades (RACI)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {setup.ocps.length === 0 ? (
            <p className="px-6 py-6 text-sm text-muted-foreground">
              Sin OCPs definidos. Vuelve a M4 · OCP por Área para crear OCPs y luego refresca
              esta vista.
            </p>
          ) : (
            <>
              <div className="px-3 py-2 text-[11px] text-muted-foreground">
                {RACI_OPTIONS.map((r) => (
                  <span key={r.value} className="mr-3">
                    <span
                      className="mr-1 inline-block rounded px-1 font-mono font-semibold"
                      style={{ backgroundColor: r.bg, color: r.color }}
                    >
                      {r.value}
                    </span>
                    {r.label}
                  </span>
                ))}
              </div>
              <table className="w-full text-left text-xs">
                <thead className="border-y bg-muted/30">
                  <tr>
                    <th className="px-3 py-2 font-medium">Área</th>
                    {setup.ocps.map((o) => (
                      <th key={o.id} className="px-2 py-2 text-center font-mono font-medium">
                        {o.code}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-medium">Carga</th>
                  </tr>
                </thead>
                <tbody>
                  {structure.nodes.map((n) => {
                    const count = n.ocpLinks.length;
                    return (
                      <tr
                        key={n.id}
                        className={cn(
                          "border-b last:border-b-0",
                          count === 0 && "bg-transparent",
                          count > 5 && "bg-transparent",
                        )}
                      >
                        <td className="px-3 py-2">
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {n.code}
                          </div>
                          <div className="font-medium">{n.name}</div>
                          {count === 0 && (
                            <span className="text-[10px] text-amber-300">Sin OCPs</span>
                          )}
                        </td>
                        {setup.ocps.map((o) => {
                          const link = n.ocpLinks.find((l) => l.ocpId === o.id);
                          if (!link) {
                            return (
                              <td key={o.id} className="px-2 py-2 text-center text-muted-foreground/40">
                                —
                              </td>
                            );
                          }
                          const r = RACI_OPTIONS.find((x) => x.value === link.raciRole);
                          return (
                            <td key={o.id} className="px-2 py-2 text-center">
                              <span
                                className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
                                style={{
                                  backgroundColor: r?.bg ?? "#999",
                                  color: r?.color ?? "white",
                                }}
                              >
                                {link.raciRole}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-semibold">{count}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-muted/20">
                    <td className="px-3 py-2 font-semibold">Cobertura por OCP</td>
                    {setup.ocps.map((o) => {
                      const cnt = structure.nodes.filter((n) =>
                        n.ocpLinks.some((l) => l.ocpId === o.id),
                      ).length;
                      return (
                        <td key={o.id} className="px-2 py-2 text-center font-semibold">
                          {cnt}
                        </td>
                      );
                    })}
                    <td />
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-left text-base">Carga por área</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-left">
            {loadByNode.map((l) => {
              const pct = Math.round((l.count / maxLoad) * 100);
              return (
                <div key={l.node.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn(l.count === 0 && "text-muted-foreground")}>
                      {l.node.code} · {l.node.name}
                    </span>
                    <span className="font-medium">{l.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor:
                          l.count === 0 ? "rgba(0,0,0,0.08)" : l.count > 5 ? "#E11D48" : "#a78bfa",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-left text-base">Políticas vinculadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-left">
            {setup.policies.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin políticas confirmadas</p>
            ) : (
              setup.policies.map((p) => {
                const cnt = structure.nodes.filter((n) =>
                  n.policyLinks.some((l) => l.politicaId === p.id),
                ).length;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs",
                      p.mandatory && "bg-transparent",
                    )}
                  >
                    <div>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {p.code}
                      </span>{" "}
                      <span>{p.name.slice(0, 70)}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {cnt} áreas
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {observations.length > 0 && (
        <Card className="border-amber-500/30 bg-transparent">
          <CardHeader>
            <CardTitle className="text-left text-base text-amber-300">
              Observaciones del diseño ({observations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-left text-amber-300">
            <ul className="ml-4 list-disc space-y-1">
              {observations.slice(0, 12).map((o, i) => (
                <li key={i}>{o}</li>
              ))}
              {observations.length > 12 && (
                <li className="italic">… y {observations.length - 12} más</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base">Análisis del diseño</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-left text-muted-foreground">
          {narrative}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base">Exportar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportPdf}>
            <FileText className="mr-1 size-4" /> PDF profesional
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileDown className="mr-1 size-4" /> Excel
          </Button>
          <Button variant="outline" onClick={handleExportPng}>
            <FileImage className="mr-1 size-4" /> PNG
          </Button>
          <Button variant="outline" onClick={handleExportSvg}>
            <FileImage className="mr-1 size-4" /> SVG
          </Button>
        </CardContent>
      </Card>

      <Card className="border-primary/25 bg-primary/10/30">
        <CardContent className="py-4 text-sm text-left text-primary">
          <strong className="block">¿Qué sigue?</strong>
          Con tu estructura definida, el próximo módulo (Recursos · 7M) te ayudará a estimar
          y asignar los recursos necesarios (capital, talento, materiales, tecnología, etc.)
          para que cada área pueda ejecutar sus OCPs.
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="py-4 text-left">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

// Preview compacto del organigrama solo para exportación
function MiniOrgPreview({
  structure,
}: {
  structure: NonNullable<SetupData["structure"]>;
}) {
  return (
    <ReactFlow
      nodes={structure.nodes.map((n) => ({
        id: n.id,
        type: "org",
        position: { x: n.positionX, y: n.positionY },
        data: {
          label: n.name,
          code: n.code,
          nodeType: n.nodeType,
          origin: n.origin,
          ocpCount: n.ocpLinks.length,
          policyCount: n.policyLinks.length,
          ftes: n.ftesEstimated,
        },
      }))}
      edges={structure.relations.map((r) => ({
        id: `e-${r.parentNodeId}-${r.childNodeId}`,
        source: r.parentNodeId,
        target: r.childNodeId,
        type: "smoothstep",
        style: { stroke: "#94A3B8" },
      }))}
      nodeTypes={nodeTypes}
      fitView
      proOptions={{ hideAttribution: true }}
      panOnDrag={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      nodesDraggable={false}
      nodesConnectable={false}
    />
  );
}
