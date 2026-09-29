"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Target,
  Grid3X3,
  Compass,
  ListChecks,
} from "lucide-react";

const SUBPAGES = [
  {
    href: "olp",
    title: "OLP",
    description: "Objetivos de Largo Plazo",
    icon: Target,
  },
  {
    href: "foda-cruzado",
    title: "FODA Cruzado",
    description: "Estrategias FO, FA, DO, DA",
    icon: Grid3X3,
  },
  {
    href: "strategies",
    title: "Estrategias",
    description: "Listado y gestión de estrategias retenidas",
    icon: ListChecks,
  },
  {
    href: "peyea",
    title: "PEYEA",
    description: "Posición Estratégica y Evaluación de la Acción",
    icon: Compass,
  },
] as const;

export default function M3FormulationPage() {
  const { cycleId } = useParams<{ cycleId: string }>();

  return (
    <div className="space-y-6">
      <div className="text-left">
        <h2 className="text-lg font-semibold">Modulo 3: Formulacion Estrategica</h2>
        <p className="text-sm text-muted-foreground">
          Generacion, evaluacion y seleccion de estrategias para el ciclo de planeamiento
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUBPAGES.map((page) => {
          const Icon = page.icon;
          return (
            <Link
              key={page.href}
              href={`/cycles/${cycleId}/m3-formulation/${page.href}`}
            >
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{page.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-left text-sm text-muted-foreground">
                    {page.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
