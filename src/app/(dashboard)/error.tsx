"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-danger/15 text-danger">
        <AlertTriangle className="size-6" />
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Algo salió mal al cargar esta página</h1>
        <p className="text-sm text-muted-foreground">{error.message || "Error inesperado."}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>
          <RotateCcw className="size-4" /> Reintentar
        </Button>
        <Link href="/dashboard" className="inline-flex h-8 items-center rounded-lg border px-3 text-sm hover:bg-accent">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
