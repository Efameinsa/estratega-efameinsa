"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { OcpInitiativesPanel } from "@/components/ocp/OcpInitiativesPanel";

export default function OcpInitiativesPage() {
  const params = useParams();
  const cycleId = params.cycleId as string;
  const ocpId = params.ocpId as string;

  const { data: ocp, isLoading } = trpc.ocp.getById.useQuery({ id: ocpId });

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Cargando OCP...</p>
      </div>
    );
  }

  if (!ocp) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">OCP no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/cycles/${cycleId}/m4-deployment/ocp`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Volver a OCP
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            {ocp.code}
          </Badge>
          {ocp.responsibleArea && (
            <Badge variant="outline">{ocp.responsibleArea.name}</Badge>
          )}
        </div>
      </div>

      <div className="space-y-1 text-left">
        <h2 className="text-lg font-semibold">{ocp.code}</h2>
        <p className="text-sm text-muted-foreground">{ocp.description}</p>
      </div>

      <OcpInitiativesPanel
        ocpId={ocp.id}
        ocpCode={ocp.code}
        ocpDescription={ocp.description}
      />
    </div>
  );
}
