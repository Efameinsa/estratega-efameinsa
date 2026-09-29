"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

export default function CycleLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { cycleId } = useParams<{ cycleId: string }>();
  const { data, isLoading, error } = trpc.cycle.getById.useQuery(
    { id: cycleId },
    { retry: false },
  );

  useEffect(() => {
    if (error) {
      // Limpiar cycleId stale del localStorage para que el sidebar no siga
      // generando links inválidos al volver al dashboard.
      try {
        const stored = localStorage.getItem("sei-last-cycle-id");
        if (stored === cycleId) {
          localStorage.removeItem("sei-last-cycle-id");
        }
      } catch {}
      router.replace("/dashboard");
    }
  }, [error, router, cycleId]);

  if (isLoading) {
    return (
      <div className="animate-pulse p-6 text-sm text-muted-foreground">
        Verificando acceso al ciclo...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        No tienes acceso a este ciclo. Redirigiendo al inicio...
      </div>
    );
  }

  return <>{children}</>;
}
