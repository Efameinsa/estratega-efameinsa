"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function NewCyclePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [yearStart, setYearStart] = useState(new Date().getFullYear());
  const [yearEnd, setYearEnd] = useState(new Date().getFullYear() + 5);

  const createCycle = trpc.cycle.create.useMutation({
    onSuccess: (cycle) => {
      toast.success("Ciclo estratégico creado");
      router.push(`/cycles/${cycle.id}/m1-identity`);
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSubmit() {
    if (!name.trim()) return;
    createCycle.mutate({
      name: name.trim(),
      yearStart,
      yearEnd,
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-left">
        Nuevo Ciclo Estratégico
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-left">Datos del Ciclo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Nombre del Plan</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Plan Estratégico 2025-2030"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Año Inicio</Label>
              <Input
                type="number"
                value={yearStart}
                onChange={(e) => setYearStart(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Año Fin</Label>
              <Input
                type="number"
                value={yearEnd}
                onChange={(e) => setYearEnd(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || createCycle.isPending}
            >
              {createCycle.isPending ? "Creando..." : "Crear Ciclo"}
            </Button>
            <Button variant="outline" onClick={() => router.push("/")}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
