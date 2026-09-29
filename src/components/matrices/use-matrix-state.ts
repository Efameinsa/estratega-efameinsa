"use client";

import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Estado de una matriz guardado en el servidor (antes solo en localStorage).
 * - Carga desde la BD; si no hay nada, migra lo que hubiera en el navegador.
 * - Guarda con un pequeño retardo para no escribir en cada tecla.
 */
export function useMatrixState<T>(cycleId: string, kind: "bcg" | "ge", legacyKey: string) {
  const { data, isLoading, isError } = trpc.matrixState.get.useQuery({ cycleId, kind }, { staleTime: 30_000 });
  const save = trpc.matrixState.save.useMutation();
  const [initial, setInitial] = useState<{ value: T | null; ready: boolean }>({ value: null, ready: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<T | null>(null);
  const mutateRef = useRef(save.mutate);
  const lastJson = useRef<string | null>(null);
  useEffect(() => {
    mutateRef.current = save.mutate;
  });

  useEffect(() => {
    if (isLoading || initial.ready) return;
    let value: T | null = (data?.data as T | undefined) ?? null;
    if (!value) {
      try {
        const raw = localStorage.getItem(legacyKey);
        if (raw) value = JSON.parse(raw) as T;
      } catch {}
    }
    lastJson.current = value ? JSON.stringify(value) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación única al llegar los datos
    setInitial({ value, ready: true });
  }, [isLoading, data, legacyKey, initial.ready]);

  const persist = (value: T) => {
    // Si no se pudo leer del servidor, nunca se sobrescribe lo guardado allí.
    if (isError) return;
    const json = JSON.stringify(value);
    if (json === lastJson.current) return; // sin cambios: no escribe
    lastJson.current = json;
    try {
      localStorage.setItem(legacyKey, json);
    } catch {}
    pending.current = value;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pending.current = null;
      save.mutate({ cycleId, kind, data: value });
    }, 800);
  };

  // Al salir de la página se guarda lo pendiente de inmediato.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current) mutateRef.current({ cycleId, kind, data: pending.current });
    },
    [cycleId, kind],
  );

  return { initial: initial.value, ready: initial.ready, persist, saving: save.isPending };
}
