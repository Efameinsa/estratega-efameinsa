"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Eye, Flag, Heart, Target } from "lucide-react";

const SECTIONS = [
  {
    key: "vision",
    label: "Visión",
    description: "Declaración de la posición futura deseada",
    href: "vision",
    icon: Eye,
  },
  {
    key: "mission",
    label: "Misión",
    description: "Propósito de la organización — 9 componentes de D'Alessio",
    href: "mission",
    icon: Target,
  },
  {
    key: "values",
    label: "Valores y Código de Ética",
    description: "Principios fundamentales y normas éticas",
    href: "values",
    icon: Heart,
  },
  {
    key: "interests",
    label: "Intereses y Principios Cardinales",
    description:
      "Matriz de intereses organizacionales y principios cardinales de Hartmann",
    href: "interests",
    icon: Flag,
  },
] as const;

export default function M1IdentityPage() {
  const { cycleId } = useParams<{ cycleId: string }>();

  const { data: vision } = trpc.vision.getActive.useQuery({ cycleId });
  const { data: mission } = trpc.mission.getActive.useQuery({ cycleId });
  const { data: values } = trpc.values.list.useQuery({ cycleId });
  const { data: interests } = trpc.interests.list.useQuery({ cycleId });

  const completionMap: Record<string, boolean> = {
    vision: !!vision,
    mission: !!mission,
    values: (values?.length ?? 0) > 0,
    interests: (interests?.length ?? 0) > 0,
  };

  const completedCount = Object.values(completionMap).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">M1 — Identidad Estratégica</h2>
          <p className="text-sm text-muted-foreground">
            Visión, misión, valores e intereses organizacionales
          </p>
        </div>
        <Badge variant="secondary">
          {completedCount}/{SECTIONS.length} completados
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((section) => {
          const done = completionMap[section.key];
          const Icon = section.icon;
          return (
            <Link
              key={section.key}
              href={`/cycles/${cycleId}/m1-identity/${section.href}`}
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
    </div>
  );
}
