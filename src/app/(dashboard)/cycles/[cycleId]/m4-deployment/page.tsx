"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  FolderKanban,
  Layers,
  Briefcase,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Ejes Estrategicos Tab
// ---------------------------------------------------------------------------

function EjesTab({ cycleId }: { cycleId: string }) {
  const utils = trpc.useUtils();
  const { data: ejes, isLoading } = trpc.strategicAxis.list.useQuery({ cycleId });
  const createAxis = trpc.strategicAxis.create.useMutation({
    onSuccess: () => {
      utils.strategicAxis.list.invalidate({ cycleId });
      setShowForm(false);
      resetForm();
    },
  });
  const updateAxis = trpc.strategicAxis.update.useMutation({
    onSuccess: () => {
      utils.strategicAxis.list.invalidate({ cycleId });
      setEditingId(null);
    },
  });
  const deleteAxis = trpc.strategicAxis.delete.useMutation({
    onSuccess: () => utils.strategicAxis.list.invalidate({ cycleId }),
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3b82f6");

  function resetForm() {
    setName("");
    setDescription("");
    setColor("#3b82f6");
  }

  function handleCreate() {
    if (!name.trim()) return;
    createAxis.mutate({ cycleId, name: name.trim(), description, color });
  }

  function startEdit(eje: { id: string; name: string; description: string | null; color: string | null }) {
    setEditingId(eje.id);
    setName(eje.name);
    setDescription(eje.description ?? "");
    setColor(eje.color ?? "#3b82f6");
  }

  function handleUpdate() {
    if (!editingId || !name.trim()) return;
    updateAxis.mutate({ id: editingId, name: name.trim(), description, color });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ejes Estrategicos</h2>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setShowForm(true);
            setEditingId(null);
          }}
        >
          <Plus className="size-4" />
          Agregar Eje
        </Button>
      </div>

      {(showForm || editingId) && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del eje estrategico"
              />
            </div>
            <div className="space-y-1">
              <Label>Descripcion</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripcion del eje"
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded border"
                />
                <span className="text-sm text-muted-foreground">{color}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={createAxis.isPending || updateAxis.isPending}
              >
                {editingId ? "Guardar" : "Crear"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground">Cargando ejes...</p>
      )}

      {ejes && ejes.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay ejes estrategicos. Agrega uno para empezar.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ejes?.map((eje) => (
          <Card key={eje.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: eje.color ?? "#3b82f6" }}
                  />
                  <CardTitle className="text-base">{eje.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => startEdit(eje)}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => deleteAxis.mutate({ id: eje.id })}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {eje.description && (
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  {eje.description}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Portafolios Tab
// ---------------------------------------------------------------------------

function PortafoliosTab({ cycleId }: { cycleId: string }) {
  const utils = trpc.useUtils();
  const { data: portfolios, isLoading } = trpc.portfolio.list.useQuery({ cycleId });
  const { data: ejes } = trpc.strategicAxis.list.useQuery({ cycleId });
  const createPortfolio = trpc.portfolio.create.useMutation({
    onSuccess: () => {
      utils.portfolio.list.invalidate({ cycleId });
      setShowForm(false);
      resetForm();
    },
  });
  const updatePortfolio = trpc.portfolio.update.useMutation({
    onSuccess: () => {
      utils.portfolio.list.invalidate({ cycleId });
      setEditingId(null);
    },
  });
  const deletePortfolio = trpc.portfolio.delete.useMutation({
    onSuccess: () => utils.portfolio.list.invalidate({ cycleId }),
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [axisId, setAxisId] = useState<string>("");

  function resetForm() {
    setName("");
    setDescription("");
    setAxisId("");
  }

  function handleCreate() {
    if (!name.trim()) return;
    createPortfolio.mutate({
      cycleId,
      name: name.trim(),
      description,
      axisId: axisId || undefined,
    });
  }

  function handleUpdate() {
    if (!editingId || !name.trim()) return;
    updatePortfolio.mutate({
      id: editingId,
      name: name.trim(),
      description,
      axisId: axisId || null,
    });
  }

  function startEdit(p: { id: string; name: string; description: string | null; axisId: string | null }) {
    setEditingId(p.id);
    setName(p.name);
    setDescription(p.description ?? "");
    setAxisId(p.axisId ?? "");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Portafolios</h2>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setShowForm(true);
            setEditingId(null);
          }}
        >
          <Plus className="size-4" />
          Agregar Portafolio
        </Button>
      </div>

      {(showForm || editingId) && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del portafolio"
              />
            </div>
            <div className="space-y-1">
              <Label>Descripcion</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripcion"
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>Eje Estrategico</Label>
              <Select value={axisId} onValueChange={(v) => setAxisId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar eje (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {ejes?.map((eje) => (
                    <SelectItem key={eje.id} value={eje.id}>
                      {eje.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={createPortfolio.isPending || updatePortfolio.isPending}
              >
                {editingId ? "Guardar" : "Crear"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground">Cargando portafolios...</p>
      )}

      {portfolios && portfolios.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay portafolios. Agrega uno para empezar.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {portfolios?.map((p) => (
          <Card key={p.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{p.name}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => startEdit(p)}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => deletePortfolio.mutate({ id: p.id })}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
              {p.axis && (
                <Badge variant="outline" className="w-fit">
                  <div
                    className="size-2 rounded-full"
                    style={{ backgroundColor: p.axis.color ?? "#3b82f6" }}
                  />
                  {p.axis.name}
                </Badge>
              )}
            </CardHeader>
            {p.description && (
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">{p.description}</p>
              </CardContent>
            )}
            <CardContent className="flex gap-3 pt-0 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Layers className="size-3" />
                {"programs" in p ? (p as Record<string, unknown[]>).programs?.length ?? 0 : 0} programas
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Programas Tab
// ---------------------------------------------------------------------------

function ProgramasTab({ cycleId }: { cycleId: string }) {
  const utils = trpc.useUtils();
  const { data: portfolios } = trpc.portfolio.list.useQuery({ cycleId });

  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const { data: programs, isLoading } = trpc.program.list.useQuery(
    { portfolioId: selectedPortfolioId },
    { enabled: !!selectedPortfolioId }
  );

  const createProgram = trpc.program.create.useMutation({
    onSuccess: () => {
      if (selectedPortfolioId) {
        utils.program.list.invalidate({ portfolioId: selectedPortfolioId });
      }
      setShowForm(false);
      resetForm();
    },
  });
  const deleteProgram = trpc.program.delete.useMutation({
    onSuccess: () => {
      if (selectedPortfolioId) {
        utils.program.list.invalidate({ portfolioId: selectedPortfolioId });
      }
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function resetForm() {
    setName("");
    setDescription("");
  }

  function handleCreate() {
    if (!name.trim() || !selectedPortfolioId) return;
    createProgram.mutate({
      portfolioId: selectedPortfolioId,
      name: name.trim(),
      description,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Programas</h2>
        {selectedPortfolioId && (
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="size-4" />
            Agregar Programa
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <Label>Seleccionar Portafolio</Label>
        <Select value={selectedPortfolioId} onValueChange={(v) => setSelectedPortfolioId(v ?? "")}>
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue placeholder="Seleccionar portafolio" />
          </SelectTrigger>
          <SelectContent>
            {portfolios?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showForm && selectedPortfolioId && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del programa"
              />
            </div>
            <div className="space-y-1">
              <Label>Descripcion</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripcion"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={createProgram.isPending}
              >
                Crear
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedPortfolioId && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Selecciona un portafolio para ver sus programas.
          </CardContent>
        </Card>
      )}

      {selectedPortfolioId && isLoading && (
        <p className="text-sm text-muted-foreground">Cargando programas...</p>
      )}

      {selectedPortfolioId && programs && programs.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Este portafolio no tiene programas.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {programs?.map((prog) => (
          <Card key={prog.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{prog.name}</CardTitle>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => deleteProgram.mutate({ id: prog.id })}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
              <Badge variant="outline" className="w-fit">
                {prog.status}
              </Badge>
            </CardHeader>
            {prog.description && (
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">
                  {prog.description}
                </p>
              </CardContent>
            )}
            <CardContent className="flex gap-3 pt-0 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Briefcase className="size-3" />
                {"projects" in prog ? (prog as Record<string, unknown[]>).projects?.length ?? 0 : 0} proyectos
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function M4DeploymentPage() {
  const params = useParams();
  const cycleId = params.cycleId as string;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-left">
          M4 -- Despliegue Estrategico
        </h1>
        <p className="text-sm text-muted-foreground text-left">
          Gestiona ejes estrategicos, portafolios y programas para el despliegue
          de la estrategia.
        </p>
      </div>

      <Tabs defaultValue="ejes">
        <TabsList>
          <TabsTrigger value="ejes">
            <FolderKanban className="size-4" />
            Ejes Estrategicos
          </TabsTrigger>
          <TabsTrigger value="portafolios">
            <Layers className="size-4" />
            Portafolios
          </TabsTrigger>
          <TabsTrigger value="programas">
            <Briefcase className="size-4" />
            Programas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ejes">
          <EjesTab cycleId={cycleId} />
        </TabsContent>
        <TabsContent value="portafolios">
          <PortafoliosTab cycleId={cycleId} />
        </TabsContent>
        <TabsContent value="programas">
          <ProgramasTab cycleId={cycleId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
