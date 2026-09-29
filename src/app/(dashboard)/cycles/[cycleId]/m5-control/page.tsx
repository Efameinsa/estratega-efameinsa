"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowRight, BarChart3, CheckCircle, Circle, Clock, FolderKanban, Target } from "lucide-react";

const SECTIONS = [
  {
    key: "kpis",
    label: "KPIs y Metas",
    description: "Define indicadores clave con metas por período y umbrales semáforo",
    href: "kpis",
    icon: Target,
  },
  {
    key: "tablero",
    label: "Tablero BSC",
    description: "Vista consolidada del Balanced Scorecard con las 4 dimensiones",
    href: "tablero",
    icon: BarChart3,
  },
  {
    key: "alertas",
    label: "Alertas Estratégicas",
    description: "Disparadores automáticos cuando KPIs salen del rango esperado",
    href: "alertas",
    icon: AlertCircle,
  },
  {
    key: "revision",
    label: "Revisión Estratégica",
    description: "Calendario formal de revisiones, actas y acciones correctivas",
    href: "revision",
    icon: Clock,
  },
] as const;

export default function M5ControlPage() {
  const { cycleId } = useParams<{ cycleId: string }>();

  const { data: kpisSetup } = trpc.kpis.setup.useQuery({ cycleId });
  const { data: reviewSetup } = trpc.reviews.setup.useQuery({ cycleId });
  const { data: alertStats } = trpc.alerts.stats.useQuery({ cycleId });

  const kpiCount = kpisSetup?.kpis?.length ?? 0;
  const alertCount = alertStats?.byStatus
    ? Object.values(alertStats.byStatus).reduce((s, n) => s + n, 0)
    : 0;
  const completionMap: Record<string, boolean> = {
    kpis: kpiCount > 0,
    tablero: kpiCount > 0,
    alertas: alertCount > 0,
    revision: (reviewSetup?.upcoming?.length ?? 0) > 0 || (reviewSetup?.completed ?? 0) > 0,
  };

  const completedCount = Object.values(completionMap).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">M5 — Control (Balanced Scorecard)</h2>
          <p className="text-sm text-muted-foreground">
            Mide, monitorea y revisa el cumplimiento estratégico
          </p>
        </div>
        <Badge variant="secondary">
          {completedCount}/{SECTIONS.length} con datos
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((section) => {
          const done = completionMap[section.key];
          const Icon = section.icon;
          return (
            <Link
              key={section.key}
              href={`/cycles/${cycleId}/m5-control/${section.href}`}
            >
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/50">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {section.label}
                      {done ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {section.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Link
        href="/portfolio"
        className="flex items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5 transition-colors hover:border-primary/60 hover:bg-primary/10"
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <FolderKanban className="size-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Siguiente paso · Ejecución</p>
          <p className="font-semibold">Portafolio, programas y proyectos</p>
          <p className="text-sm text-muted-foreground">
            Genera desde el BSC los proyectos de cada OCP y gestiónalos con lista, tablero, cronograma Gantt, evidencias y registro de horas.
          </p>
        </div>
        <ArrowRight className="size-5 text-primary" />
      </Link>
    </div>
  );
}
