"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip as RTooltip,
  ReferenceLine,
  ReferenceArea,
  Cell, LabelList,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useMatrixState } from "@/components/matrices/use-matrix-state";
import {
  Plus,
  Trash2,
  Download,
  Printer,
  RotateCcw,
  PlayCircle,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Settings2,
  Copy,
  HelpCircle,
  Check,
} from "lucide-react";

// ───────────────────────────────────────────────────────────────────────
// TIPOS Y CONSTANTES
// ───────────────────────────────────────────────────────────────────────

type Quadrant = "estrella" | "interrogante" | "vaca" | "perro";

interface Producto {
  id: string;
  nombre: string;
  ventasPropias: string;
  ventasLider: string;
  mercadoActual: string;
  mercadoAnterior: string;
}

interface BcgState {
  empresa: string;
  anioActual: string;
  anioAnterior: string;
  cortoY: string;
  cortoX: string;
  moneda: string;
  unidades: string;
  productos: Producto[];
}

interface ProductoCalculado {
  id: string;
  letra: string;
  nombre: string;
  ventas: number;
  participacionRelativa: number;
  crecimiento: number;
  cuotaPropia: number;
  pesoPortafolio: number;
  cuadrante: Quadrant;
}

const LETRA = (i: number) => String.fromCharCode(65 + i);

const QUADRANT_INFO: Record<
  Quadrant,
  {
    label: string;
    icon: string;
    color: string;
    bg: string;
    border: string;
    estrategia: string;
  }
> = {
  estrella: {
    label: "Estrella",
    icon: "⭐",
    color: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.08)",
    border: "rgba(245, 158, 11, 0.35)",
    estrategia:
      "Invertir agresivamente para mantener liderazgo. Defender cuota y aumentar capacidad.",
  },
  interrogante: {
    label: "Interrogante",
    icon: "❓",
    color: "#8B5CF6",
    bg: "rgba(139, 92, 246, 0.08)",
    border: "rgba(139, 92, 246, 0.35)",
    estrategia:
      "Decision critica: invertir selectivamente para convertir en estrella, o desinvertir si no hay potencial claro.",
  },
  vaca: {
    label: "Vaca lechera",
    icon: "🐄",
    color: "#14B8A6",
    bg: "rgba(20, 184, 166, 0.08)",
    border: "rgba(20, 184, 166, 0.35)",
    estrategia:
      "Ordenar. Mantener con inversion minima y usar el flujo de caja para financiar estrellas e interrogantes prometedores.",
  },
  perro: {
    label: "Perro",
    icon: "🐕",
    color: "#F43F5E",
    bg: "rgba(244, 63, 94, 0.08)",
    border: "rgba(244, 63, 94, 0.35)",
    estrategia:
      "Evaluar liquidacion, venta o reposicionamiento en un nicho rentable.",
  },
};

const MONEDAS = ["USD", "EUR", "MXN", "COP", "S/", "ARS", "BRL", "CLP"];
const UNIDADES = ["Miles", "Millones", "Unidades"];

const newProducto = (): Producto => ({
  id: crypto.randomUUID(),
  nombre: "",
  ventasPropias: "",
  ventasLider: "",
  mercadoActual: "",
  mercadoAnterior: "",
});

const DEMO_DATA: BcgState = {
  empresa: "Empresa Demo BCG",
  anioActual: "2025",
  anioAnterior: "2024",
  cortoY: "10",
  cortoX: "1.0",
  moneda: "S/",
  unidades: "Millones",
  productos: [
    {
      id: crypto.randomUUID(),
      nombre: "Producto A",
      ventasPropias: "50",
      ventasLider: "25",
      mercadoActual: "200",
      mercadoAnterior: "180",
    },
    {
      id: crypto.randomUUID(),
      nombre: "Producto B",
      ventasPropias: "30",
      ventasLider: "60",
      mercadoActual: "290",
      mercadoAnterior: "250",
    },
    {
      id: crypto.randomUUID(),
      nombre: "Producto C",
      ventasPropias: "80",
      ventasLider: "40",
      mercadoActual: "510",
      mercadoAnterior: "500",
    },
    {
      id: crypto.randomUUID(),
      nombre: "Producto D",
      ventasPropias: "10",
      ventasLider: "50",
      mercadoActual: "122",
      mercadoAnterior: "120",
    },
  ],
};

function getInitialState(): BcgState {
  const now = new Date();
  return {
    empresa: "",
    anioActual: String(now.getFullYear()),
    anioAnterior: String(now.getFullYear() - 1),
    cortoY: "10",
    cortoX: "1.0",
    moneda: "S/",
    unidades: "Millones",
    productos: [newProducto()],
  };
}

// Helper: calcular metricas de un producto individual
function calcularProducto(
  p: Producto,
  cortoX: number,
  cortoY: number,
  totalVentas: number,
  letra: string
): ProductoCalculado {
  const ventas = parseFloat(p.ventasPropias) || 0;
  const ventasLider = parseFloat(p.ventasLider) || 0;
  const mercadoActual = parseFloat(p.mercadoActual) || 0;
  const mercadoAnterior = parseFloat(p.mercadoAnterior) || 0;

  const participacionRelativa = ventasLider > 0 ? ventas / ventasLider : 0;
  const crecimiento =
    mercadoAnterior > 0
      ? ((mercadoActual - mercadoAnterior) / mercadoAnterior) * 100
      : 0;
  const cuotaPropia = mercadoActual > 0 ? (ventas / mercadoActual) * 100 : 0;
  const pesoPortafolio = totalVentas > 0 ? (ventas / totalVentas) * 100 : 0;

  const altoCrecimiento = crecimiento >= cortoY;
  const altaParticipacion = participacionRelativa >= cortoX;
  let cuadrante: Quadrant;
  if (altoCrecimiento && altaParticipacion) cuadrante = "estrella";
  else if (altoCrecimiento && !altaParticipacion) cuadrante = "interrogante";
  else if (!altoCrecimiento && altaParticipacion) cuadrante = "vaca";
  else cuadrante = "perro";

  return {
    id: p.id,
    letra,
    nombre: p.nombre,
    ventas,
    participacionRelativa,
    crecimiento,
    cuotaPropia,
    pesoPortafolio,
    cuadrante,
  };
}

// ───────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ───────────────────────────────────────────────────────────────────────

export default function BcgPage() {
  const params = useParams();
  const cycleId = params.cycleId as string;
  const storageKey = `bcg-${cycleId}`;

  const [state, setState] = useState<BcgState>(getInitialState());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [hidratado, setHidratado] = useState(false);

  const matrix = useMatrixState<BcgState>(cycleId, "bcg", storageKey);
  useEffect(() => {
    if (!matrix.ready || hidratado) return;
    const parsed = matrix.initial;
    if (parsed && Array.isArray(parsed.productos)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación única desde el servidor
      setState({ ...getInitialState(), ...parsed });
    }
    setHidratado(true);
  }, [matrix.ready, matrix.initial, hidratado]);

  useEffect(() => {
    if (!hidratado) return;
    matrix.persist(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, hidratado]);

  const productosCalculados: ProductoCalculado[] = useMemo(() => {
    const cortoY = parseFloat(state.cortoY) || 0;
    const cortoX = parseFloat(state.cortoX) || 0;
    const totalVentas = state.productos.reduce(
      (acc, p) => acc + (parseFloat(p.ventasPropias) || 0),
      0
    );
    return state.productos.map((p, i) =>
      calcularProducto(p, cortoX, cortoY, totalVentas, LETRA(i))
    );
  }, [state.productos, state.cortoY, state.cortoX]);

  const totales = useMemo(() => {
    const total = productosCalculados.reduce((acc, p) => acc + p.ventas, 0);
    const porCuadrante: Record<Quadrant, { count: number; ventas: number }> = {
      estrella: { count: 0, ventas: 0 },
      interrogante: { count: 0, ventas: 0 },
      vaca: { count: 0, ventas: 0 },
      perro: { count: 0, ventas: 0 },
    };
    productosCalculados.forEach((p) => {
      porCuadrante[p.cuadrante].count += 1;
      porCuadrante[p.cuadrante].ventas += p.ventas;
    });
    return { total, porCuadrante };
  }, [productosCalculados]);

  const fase1Completa = useMemo(() => {
    return (
      state.empresa.trim() !== "" &&
      state.anioActual !== "" &&
      state.anioAnterior !== "" &&
      parseInt(state.anioAnterior) < parseInt(state.anioActual) &&
      parseFloat(state.cortoY) >= 0 &&
      parseFloat(state.cortoX) > 0
    );
  }, [state]);

  function actualizarProducto(id: string, campo: keyof Producto, valor: string) {
    setState((s) => ({
      ...s,
      productos: s.productos.map((p) =>
        p.id === id ? { ...p, [campo]: valor } : p
      ),
    }));
  }

  function agregarProducto() {
    if (state.productos.length >= 15) {
      toast.error("Maximo 15 productos por analisis");
      return;
    }
    setState((s) => ({ ...s, productos: [...s.productos, newProducto()] }));
  }

  function duplicarProducto(id: string) {
    if (state.productos.length >= 15) {
      toast.error("Maximo 15 productos por analisis");
      return;
    }
    setState((s) => {
      const idx = s.productos.findIndex((p) => p.id === id);
      if (idx === -1) return s;
      const original = s.productos[idx];
      const copia: Producto = {
        ...original,
        id: crypto.randomUUID(),
        nombre: `${original.nombre} (copia)`,
      };
      const nuevos = [...s.productos];
      nuevos.splice(idx + 1, 0, copia);
      return { ...s, productos: nuevos };
    });
  }

  function eliminarProducto(id: string) {
    if (state.productos.length === 1) {
      toast.error("Debe haber al menos 1 producto");
      return;
    }
    setState((s) => ({
      ...s,
      productos: s.productos.filter((p) => p.id !== id),
    }));
  }

  function cargarDemo() {
    setState({
      ...DEMO_DATA,
      productos: DEMO_DATA.productos.map((p) => ({
        ...p,
        id: crypto.randomUUID(),
      })),
    });
    setErrors({});
    toast.success("Datos de ejemplo cargados");
  }

  function limpiarTodo() {
    if (!confirm("Esto borrara todos los datos ingresados. Continuar?")) return;
    setState(getInitialState());
    setErrors({});
    setPaso(1);
    toast.success("Datos limpiados");
  }

  function validarFase1(): boolean {
    const errs: Record<string, string> = {};
    if (!state.empresa.trim()) errs.empresa = "Ingresa el nombre de la empresa";
    if (!state.anioActual) errs.anioActual = "Año actual requerido";
    if (!state.anioAnterior) errs.anioAnterior = "Año anterior requerido";
    if (
      state.anioActual &&
      state.anioAnterior &&
      parseInt(state.anioAnterior) >= parseInt(state.anioActual)
    )
      errs.anios = "El año anterior debe ser menor al año actual";
    if (parseFloat(state.cortoY) < 0)
      errs.cortoY = "No puede ser negativo";
    if (parseFloat(state.cortoX) <= 0)
      errs.cortoX = "Debe ser mayor a 0";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validarFase2(): boolean {
    const errs: Record<string, string> = {};
    state.productos.forEach((p, i) => {
      const prefix = `producto-${i}`;
      if (!p.nombre.trim()) errs[`${prefix}-nombre`] = "Nombre requerido";
      const campos: { key: keyof Producto; label: string }[] = [
        { key: "ventasPropias", label: "Tus ventas" },
        { key: "ventasLider", label: "Ventas del lider" },
        { key: "mercadoActual", label: "Mercado actual" },
        { key: "mercadoAnterior", label: "Mercado anterior" },
      ];
      campos.forEach(({ key, label }) => {
        const v = parseFloat(p[key]);
        if (!p[key] || isNaN(v))
          errs[`${prefix}-${key}`] = `${label} requerido`;
        else if (v < 0)
          errs[`${prefix}-${key}`] = `${label} no puede ser negativo`;
        else if (v === 0 && key !== "mercadoAnterior")
          errs[`${prefix}-${key}`] = `${label} debe ser mayor a 0`;
      });
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function avanzar() {
    if (paso === 1) {
      if (!validarFase1()) {
        toast.error("Completa los datos generales antes de continuar");
        return;
      }
      setPaso(2);
    } else if (paso === 2) {
      if (!validarFase2()) {
        toast.error("Hay productos con datos faltantes o invalidos");
        return;
      }
      setPaso(3);
    }
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  }

  const saveStrategies = trpc.bcg.saveRetainedStrategies.useMutation({
    onSuccess: (r) => toast.success(`${r.count} estrategias del BCG enviadas a la Matriz de Decisión`),
    onError: (e) => toast.error(e.message),
  });
  function guardarEstrategias() {
    saveStrategies.mutate({
      cycleId,
      strategies: productosCalculados.map((p) => ({
        code: `BCG-${p.letra}`,
        name: `${QUADRANT_INFO[p.cuadrante].label} · ${p.nombre}`,
        description: QUADRANT_INFO[p.cuadrante].estrategia,
      })),
    });
  }

  function retroceder() {
    if (paso === 3) setPaso(2);
    else if (paso === 2) setPaso(1);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  }

  function exportarCsv() {
    const headers = [
      "Producto",
      `Ventas (${state.moneda} ${state.unidades})`,
      "Participacion relativa",
      "Crecimiento mercado (%)",
      "Cuota propia (%)",
      "Peso portafolio (%)",
      "Cuadrante",
    ];
    const rows = productosCalculados.map((p) => [
      p.nombre,
      p.ventas.toFixed(2),
      p.participacionRelativa.toFixed(3),
      p.crecimiento.toFixed(2),
      p.cuotaPropia.toFixed(2),
      p.pesoPortafolio.toFixed(2),
      QUADRANT_INFO[p.cuadrante].label,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `matriz-bcg-${state.empresa.replace(/\s+/g, "-").toLowerCase() || "portafolio"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!hidratado) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando...</div>;
  }

  return (
    <>
      <div className="container mx-auto max-w-6xl p-4 md:p-6 print:p-0">
        <PrintStyles />

        <header className="mb-6 print:mb-3">
          <h1 className="text-2xl font-semibold tracking-tight">Matriz BCG</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Boston Consulting Group — analisis de portafolio en 3 pasos
          </p>
        </header>

        <Stepper paso={paso} setPaso={setPaso} fase1Completa={fase1Completa} />

        <div className="mt-6 space-y-5">
          {paso === 1 && (
            <PasoConfiguracion
              state={state}
              setState={setState}
              errors={errors}
              fase1Completa={fase1Completa}
            />
          )}
          {paso === 2 && (
            <PasoProductos
              state={state}
              productos={productosCalculados}
              errors={errors}
              actualizar={actualizarProducto}
              agregar={agregarProducto}
              duplicar={duplicarProducto}
              eliminar={eliminarProducto}
              cargarDemo={cargarDemo}
            />
          )}
          {paso === 3 && (
            <PasoResultados
              state={state}
              productos={productosCalculados}
              totales={totales}
            />
          )}
        </div>

        {/* Barra de navegacion fija */}
        <NavBar
          paso={paso}
          onBack={retroceder}
          onNext={avanzar}
          onLimpiar={limpiarTodo}
          onExport={exportarCsv}
          onPrint={() => window.print()}
          onSave={guardarEstrategias}
          saving={saveStrategies.isPending}
        />
      </div>
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────
// STEPPER
// ───────────────────────────────────────────────────────────────────────

function Stepper({
  paso,
  setPaso,
  fase1Completa,
}: {
  paso: 1 | 2 | 3;
  setPaso: (p: 1 | 2 | 3) => void;
  fase1Completa: boolean;
}) {
  const pasos = [
    { id: 1, label: "Configuracion" },
    { id: 2, label: "Productos" },
    { id: 3, label: "Matriz BCG" },
  ];
  return (
    <nav aria-label="Progreso" className="print:hidden">
      <ol className="flex items-center justify-between gap-2 max-w-2xl mx-auto">
        {pasos.map((p, i) => {
          const isActive = paso === p.id;
          const isDone = paso > p.id;
          const clickable =
            (p.id === 1) ||
            (p.id === 2 && fase1Completa) ||
            (p.id === 3 && paso === 3);
          return (
            <li key={p.id} className="flex items-center gap-2 flex-1">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && setPaso(p.id as 1 | 2 | 3)}
                className={`flex items-center gap-2 group ${clickable ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
              >
                <span
                  className={`flex items-center justify-center size-8 rounded-full text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : isDone
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-muted text-muted-foreground border"
                  }`}
                >
                  {isDone ? <Check className="size-4" /> : p.id}
                </span>
                <span
                  className={`text-sm hidden sm:inline ${
                    isActive
                      ? "font-medium text-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {p.label}
                </span>
              </button>
              {i < pasos.length - 1 && (
                <div
                  className={`flex-1 h-px ${
                    paso > p.id ? "bg-primary/30" : "bg-border"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ───────────────────────────────────────────────────────────────────────
// FASE 1 — CONFIGURACION
// ───────────────────────────────────────────────────────────────────────

function PasoConfiguracion({
  state,
  setState,
  errors,
  fase1Completa,
}: {
  state: BcgState;
  setState: React.Dispatch<React.SetStateAction<BcgState>>;
  errors: Record<string, string>;
  fase1Completa: boolean;
}) {
  const [avanzadosAbiertos, setAvanzadosAbiertos] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Datos generales</CardTitle>
          {fase1Completa && (
            <Badge variant="outline" className="bg-transparent text-emerald-300 border-emerald-500/30 dark:bg-transparent dark:text-emerald-400 dark:border-emerald-900">
              <Check className="size-3 mr-1" /> Completo
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs" htmlFor="empresa">
              Empresa o portafolio
            </Label>
            <Input
              id="empresa"
              value={state.empresa}
              placeholder="Ej. Corporacion Andina S.A."
              onChange={(e) => setState((s) => ({ ...s, empresa: e.target.value }))}
              aria-invalid={!!errors.empresa}
            />
            {errors.empresa && <ErrorMsg msg={errors.empresa} />}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs" htmlFor="moneda">
                Moneda
              </Label>
              <NativeSelect
                id="moneda"
                value={state.moneda}
                onChange={(v) => setState((s) => ({ ...s, moneda: v }))}
                options={MONEDAS}
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="unidades">
                Unidades
              </Label>
              <NativeSelect
                id="unidades"
                value={state.unidades}
                onChange={(v) => setState((s) => ({ ...s, unidades: v }))}
                options={UNIDADES}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs" htmlFor="anioActual">
                Año actual
              </Label>
              <Input
                id="anioActual"
                type="number"
                value={state.anioActual}
                onChange={(e) =>
                  setState((s) => ({ ...s, anioActual: e.target.value }))
                }
                aria-invalid={!!errors.anioActual || !!errors.anios}
              />
              {errors.anioActual && <ErrorMsg msg={errors.anioActual} />}
            </div>
            <div>
              <Label className="text-xs" htmlFor="anioAnterior">
                Año anterior
              </Label>
              <Input
                id="anioAnterior"
                type="number"
                value={state.anioAnterior}
                onChange={(e) =>
                  setState((s) => ({ ...s, anioAnterior: e.target.value }))
                }
                aria-invalid={!!errors.anioAnterior || !!errors.anios}
              />
              {errors.anioAnterior && <ErrorMsg msg={errors.anioAnterior} />}
            </div>
          </div>
          {errors.anios && <ErrorMsg msg={errors.anios} />}
        </CardContent>
      </Card>

      {/* Ajustes avanzados (colapsable) */}
      <Card>
        <button
          type="button"
          onClick={() => setAvanzadosAbiertos((v) => !v)}
          className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Ajustes avanzados (lineas que dividen la matriz)
            </span>
          </div>
          {avanzadosAbiertos ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </button>
        {avanzadosAbiertos && (
          <CardContent className="pt-0 space-y-4">
            <p className="text-xs text-muted-foreground">
              Estas son las lineas que dividen la matriz en sus 4 cuadrantes. Si
              no estas seguro, deja los valores recomendados.
            </p>

            <CorteCard
              titulo="¿Desde que % consideras que un mercado 'crece rapido'?"
              recomendado="10%"
              explicacion="Productos en mercados que crecen mas rapido que este numero iran arriba (Estrella o Interrogante). Los que crecen mas lento iran abajo (Vaca lechera o Perro)."
              valor={state.cortoY}
              onChange={(v) => setState((s) => ({ ...s, cortoY: v }))}
              sufijoInput="%"
              sufijoTexto="por año"
              error={errors.cortoY}
              tipsTitulo="¿Cuando cambiar este valor?"
              tips={[
                "Bajalo a 3-5% en sectores maduros (alimentos, banca, electricidad).",
                "Subelo a 15-20% en sectores dinamicos (tecnologia, e-commerce, fintech).",
              ]}
            />

            <CorteCard
              titulo="¿Que tan grande debes ser frente al lider para ser 'fuerte'?"
              recomendado="1.0"
              explicacion="1.0 = del mismo tamaño que el lider. Productos que igualan o superan este multiplo van a la izquierda (posicion fuerte). Los menores van a la derecha (posicion debil)."
              valor={state.cortoX}
              onChange={(v) => setState((s) => ({ ...s, cortoX: v }))}
              sufijoInput="veces"
              sufijoTexto="del lider"
              error={errors.cortoX}
              tipsTitulo="Ejemplo practico"
              tips={[
                "Vendes $50M, lider $100M → participacion 0.5 (mitad del lider).",
                "Vendes $100M, lider $100M → participacion 1.0 (en el limite).",
                "Vendes $200M, segundo $100M → participacion 2.0 (lider claro).",
              ]}
            />
          </CardContent>
        )}
      </Card>
    </>
  );
}

function CorteCard({
  titulo,
  recomendado,
  explicacion,
  valor,
  onChange,
  sufijoInput,
  sufijoTexto,
  error,
  tipsTitulo,
  tips,
}: {
  titulo: string;
  recomendado: string;
  explicacion: string;
  valor: string;
  onChange: (v: string) => void;
  sufijoInput: string;
  sufijoTexto: string;
  error?: string;
  tipsTitulo: string;
  tips: string[];
}) {
  const [tipsAbiertos, setTipsAbiertos] = useState(false);
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="text-sm font-medium leading-snug">{titulo}</div>
        <Badge
          variant="outline"
          className="bg-transparent text-emerald-300 border-emerald-500/30 shrink-0 dark:bg-transparent dark:text-emerald-400 dark:border-emerald-900"
        >
          Recomendado: {recomendado}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {explicacion}
      </p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-[200px]">
          <Input
            type="number"
            step="any"
            min="0"
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            className="pr-14"
            aria-invalid={!!error}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {sufijoInput}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{sufijoTexto}</span>
      </div>
      {error && <ErrorMsg msg={error} />}

      <button
        type="button"
        onClick={() => setTipsAbiertos((v) => !v)}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {tipsAbiertos ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
        {tipsTitulo}
      </button>
      {tipsAbiertos && (
        <ul className="text-xs text-muted-foreground space-y-1.5 pl-4 leading-relaxed">
          {tips.map((t, i) => (
            <li key={i} className="list-disc">{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// FASE 2 — PRODUCTOS
// ───────────────────────────────────────────────────────────────────────

function PasoProductos({
  state,
  productos,
  errors,
  actualizar,
  agregar,
  duplicar,
  eliminar,
  cargarDemo,
}: {
  state: BcgState;
  productos: ProductoCalculado[];
  errors: Record<string, string>;
  actualizar: (id: string, campo: keyof Producto, valor: string) => void;
  agregar: () => void;
  duplicar: (id: string) => void;
  eliminar: (id: string) => void;
  cargarDemo: () => void;
}) {
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setColapsados((set) => {
      const s = new Set(set);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Productos</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {state.productos.length} de 15 — Si tu empresa es lider, ingresa las
            ventas del segundo competidor
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {state.productos.map((p, i) => {
          const calc = productos[i];
          const colapsado = colapsados.has(p.id);
          return (
            <ProductoCard
              key={p.id}
              producto={p}
              calc={calc}
              index={i}
              moneda={state.moneda}
              unidades={state.unidades}
              anioActual={state.anioActual}
              anioAnterior={state.anioAnterior}
              colapsado={colapsado}
              toggle={() => toggle(p.id)}
              errors={errors}
              actualizar={actualizar}
              duplicar={duplicar}
              eliminar={eliminar}
              puedeEliminar={state.productos.length > 1}
            />
          );
        })}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={agregar}
            disabled={state.productos.length >= 15}
          >
            <Plus className="size-4 mr-1.5" /> Agregar producto
          </Button>
          <Button size="sm" variant="ghost" onClick={cargarDemo}>
            <PlayCircle className="size-4 mr-1.5" /> Cargar demo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductoCard({
  producto,
  calc,
  index,
  moneda,
  unidades,
  anioActual,
  anioAnterior,
  colapsado,
  toggle,
  errors,
  actualizar,
  duplicar,
  eliminar,
  puedeEliminar,
}: {
  producto: Producto;
  calc: ProductoCalculado | undefined;
  index: number;
  moneda: string;
  unidades: string;
  anioActual: string;
  anioAnterior: string;
  colapsado: boolean;
  toggle: () => void;
  errors: Record<string, string>;
  actualizar: (id: string, campo: keyof Producto, valor: string) => void;
  duplicar: (id: string) => void;
  eliminar: (id: string) => void;
  puedeEliminar: boolean;
}) {
  const prefix = `producto-${index}`;
  const info = calc ? QUADRANT_INFO[calc.cuadrante] : QUADRANT_INFO.perro;
  const tieneError = Object.keys(errors).some((k) => k.startsWith(prefix));
  const datosCompletos =
    producto.nombre &&
    producto.ventasPropias &&
    producto.ventasLider &&
    producto.mercadoActual &&
    producto.mercadoAnterior;

  return (
    <div
      className={`rounded-lg border ${tieneError ? "border-destructive/40" : ""}`}
    >
      {/* Cabecera siempre visible */}
      <div className="flex items-center gap-2 p-3 hover:bg-accent/30 transition-colors">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-2 flex-1 text-left min-w-0"
        >
          {colapsado ? (
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          )}
          <span className="font-medium text-sm truncate">
            {producto.nombre || `Producto sin nombre`}
          </span>
        </button>
        {datosCompletos && calc && (
          <Badge
            variant="outline"
            className="shrink-0"
            style={{
              color: info.color,
              borderColor: info.border,
              backgroundColor: info.bg,
            }}
          >
            {info.icon} {info.label}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => duplicar(producto.id)}
          className="h-8 w-8 p-0"
          title="Duplicar producto"
        >
          <Copy className="size-3.5 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => eliminar(producto.id)}
          disabled={!puedeEliminar}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive disabled:opacity-30"
          title="Eliminar producto"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Cuerpo (oculto si colapsado) */}
      {!colapsado && (
        <div className="p-3 pt-0 space-y-3 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="md:col-span-2">
              <Label className="text-xs">Nombre del producto</Label>
              <Input
                value={producto.nombre}
                placeholder="Ej. Cafe gourmet 250g"
                onChange={(e) =>
                  actualizar(producto.id, "nombre", e.target.value)
                }
                aria-invalid={!!errors[`${prefix}-nombre`]}
              />
              {errors[`${prefix}-nombre`] && (
                <ErrorMsg msg={errors[`${prefix}-nombre`]} />
              )}
            </div>

            <MoneyField
              label={`Mis ventas ${anioActual}`}
              hint="Lo que vendiste de este producto el año actual"
              moneda={moneda}
              unidades={unidades}
              value={producto.ventasPropias}
              onChange={(v) => actualizar(producto.id, "ventasPropias", v)}
              error={errors[`${prefix}-ventasPropias`]}
            />
            <MoneyField
              label={`Ventas del lider ${anioActual}`}
              hint="Si tu eres el lider, ingresa las del segundo competidor"
              moneda={moneda}
              unidades={unidades}
              value={producto.ventasLider}
              onChange={(v) => actualizar(producto.id, "ventasLider", v)}
              error={errors[`${prefix}-ventasLider`]}
            />
            <MoneyField
              label={`Mercado total ${anioActual}`}
              moneda={moneda}
              unidades={unidades}
              value={producto.mercadoActual}
              onChange={(v) => actualizar(producto.id, "mercadoActual", v)}
              error={errors[`${prefix}-mercadoActual`]}
            />
            <MoneyField
              label={`Mercado total ${anioAnterior}`}
              moneda={moneda}
              unidades={unidades}
              value={producto.mercadoAnterior}
              onChange={(v) => actualizar(producto.id, "mercadoAnterior", v)}
              error={errors[`${prefix}-mercadoAnterior`]}
            />
          </div>

          {/* Panel resultado en vivo */}
          {datosCompletos && calc && (
            <div className="rounded-md bg-primary/10/70 dark:bg-primary/10 border border-primary/20 dark:border-primary/40 p-3">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <LiveMetric
                  label="Participacion relativa"
                  value={calc.participacionRelativa.toFixed(2)}
                />
                <LiveMetric
                  label="Crecimiento"
                  value={`${calc.crecimiento.toFixed(1)}%`}
                />
                <LiveMetric
                  label="Cuadrante"
                  value={`${info.icon} ${info.label}`}
                  color={info.color}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MoneyField({
  label,
  hint,
  moneda,
  unidades: _unidades,
  value,
  onChange,
  error,
}: {
  label: string;
  hint?: string;
  moneda: string;
  unidades: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1">
        <Label className="text-xs">{label}</Label>
        {hint && (
          <span
            className="text-muted-foreground hover:text-foreground cursor-help"
            title={hint}
          >
            <HelpCircle className="size-3" />
          </span>
        )}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none font-medium">
          {moneda}
        </span>
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          className="pl-12"
        />
      </div>
      {error && <ErrorMsg msg={error} />}
    </div>
  );
}

function LiveMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className="text-sm font-semibold tabular-nums"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

function NativeSelect({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
    >
      {options.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="mt-1 text-[11px] text-destructive flex items-center gap-1">
      <AlertCircle className="size-3" /> {msg}
    </p>
  );
}

// ───────────────────────────────────────────────────────────────────────
// NAV BAR (footer fijo)
// ───────────────────────────────────────────────────────────────────────

function NavBar({
  paso,
  onBack,
  onNext,
  onLimpiar,
  onExport,
  onPrint,
  onSave,
  saving,
}: {
  paso: 1 | 2 | 3;
  onBack: () => void;
  onNext: () => void;
  onLimpiar: () => void;
  onExport: () => void;
  onPrint: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="sticky bottom-0 mt-6 -mx-4 px-4 md:-mx-6 md:px-6 py-3 bg-background/95 backdrop-blur border-t flex items-center justify-between flex-wrap gap-2 print:hidden">
      <div className="flex gap-2">
        {paso > 1 && (
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4 mr-1.5" /> Atras
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onLimpiar}>
          <RotateCcw className="size-4 mr-1.5" /> Limpiar todo
        </Button>
      </div>
      <div className="flex gap-2">
        {paso === 3 && (
          <>
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="size-4 mr-1.5" /> Exportar CSV
            </Button>
            <Button variant="outline" size="sm" onClick={onPrint}>
              <Printer className="size-4 mr-1.5" /> Imprimir / PDF
            </Button>
            <Button size="sm" onClick={onSave} disabled={saving}>
              {saving ? "Guardando…" : "Llevar estrategias a la Matriz de Decisión"}
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </>
        )}
        {paso < 3 && (
          <Button onClick={onNext} size="sm">
            {paso === 1 ? "Continuar a productos" : "Generar matriz BCG"}
            <ArrowRight className="size-4 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// FASE 3 — RESULTADOS
// ───────────────────────────────────────────────────────────────────────

function PasoResultados({
  state,
  productos,
  totales,
}: {
  state: BcgState;
  productos: ProductoCalculado[];
  totales: { total: number; porCuadrante: Record<Quadrant, { count: number; ventas: number }> };
}) {
  const fmtMoneda = (n: number) =>
    `${state.moneda} ${n.toLocaleString("es-PE", { maximumFractionDigits: 0 })}`;
  const fmtNum = (n: number, decimals = 2) =>
    n.toLocaleString("es-PE", {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span className="font-medium">{state.empresa || "Portafolio"}</span>
        <span className="text-muted-foreground">
          Periodo {state.anioAnterior} → {state.anioActual} · {state.unidades} de {state.moneda}
        </span>
        <span className="text-muted-foreground">
          Corte Y: {state.cortoY}% · Corte X: {state.cortoX}
        </span>
      </div>

      {/* GRAFICO */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Grafico BCG</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            {productos.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <span
                  className="inline-block size-2.5 rounded-full"
                  style={{ backgroundColor: QUADRANT_INFO[p.cuadrante].color }}
                />
                <span>
                  <span className="font-semibold">{p.letra}</span>
                  <span className="text-muted-foreground">
                    {" "}— {QUADRANT_INFO[p.cuadrante].label}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <BcgChart
            productos={productos}
            cortoY={parseFloat(state.cortoY) || 10}
            cortoX={parseFloat(state.cortoX) || 1}
            moneda={state.moneda}
          />

          <div className="mt-2 text-[11px] text-muted-foreground text-right">
            Tamaño de burbuja = peso en el portafolio
          </div>
        </CardContent>
      </Card>

      {/* TABLA */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tabla de resultados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Part. relativa</TableHead>
                  <TableHead className="text-right">Crecim. mercado</TableHead>
                  <TableHead className="text-right">Cuota propia</TableHead>
                  <TableHead className="text-right">Peso portafolio</TableHead>
                  <TableHead>Cuadrante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productos.map((p) => {
                  const info = QUADRANT_INFO[p.cuadrante];
                  return (
                    <TableRow key={p.id} style={{ backgroundColor: info.bg }}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold text-white shrink-0"
                            style={{ backgroundColor: info.color }}
                          >
                            {p.letra}
                          </span>
                          {p.nombre}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtMoneda(p.ventas)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(p.participacionRelativa, 3)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(p.crecimiento)}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(p.cuotaPropia)}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(p.pesoPortafolio)}%
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{
                            color: info.color,
                            borderColor: info.border,
                            backgroundColor: "transparent",
                          }}
                        >
                          {info.icon} {info.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="border-t-2 font-medium">
                  <TableCell>Total ({productos.length})</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtMoneda(totales.total)}
                  </TableCell>
                  <TableCell colSpan={5} />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* RESUMEN EJECUTIVO */}
      <ResumenEjecutivo productos={productos} totales={totales} />

      {/* RECOMENDACIONES POR PRODUCTO */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recomendaciones estrategicas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {productos.map((p) => {
              const info = QUADRANT_INFO[p.cuadrante];
              return (
                <div
                  key={p.id}
                  className="rounded-lg border p-4"
                  style={{ borderColor: info.border, backgroundColor: info.bg }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2">
                      <span
                        className="inline-flex items-center justify-center size-6 rounded-full text-xs font-bold text-white shrink-0 mt-0.5"
                        style={{ backgroundColor: info.color }}
                      >
                        {p.letra}
                      </span>
                      <div>
                        <div className="text-sm font-medium">{p.nombre}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Part. {fmtNum(p.participacionRelativa, 2)} ·
                          Crec. {fmtNum(p.crecimiento)}% ·
                          Cuota {fmtNum(p.cuotaPropia)}%
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      style={{ color: info.color, borderColor: info.border }}
                    >
                      {info.icon} {info.label}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/85 mt-2">
                    {info.estrategia}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ResumenEjecutivo({
  productos: _productos,
  totales,
}: {
  productos: ProductoCalculado[];
  totales: {
    total: number;
    porCuadrante: Record<Quadrant, { count: number; ventas: number }>;
  };
}) {
  const total = totales.total;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  const diagnostico = useMemo(() => {
    const e = totales.porCuadrante.estrella.count;
    const i = totales.porCuadrante.interrogante.count;
    const v = totales.porCuadrante.vaca.count;
    const p = totales.porCuadrante.perro.count;
    const pctVacas = pct(totales.porCuadrante.vaca.ventas);
    const pctPerros = pct(totales.porCuadrante.perro.ventas);
    const pctEstrellas = pct(totales.porCuadrante.estrella.ventas);
    const alertas: string[] = [];

    if (pctVacas > 70)
      alertas.push(
        "Dependencia critica de vacas lecheras (>70% de ingresos): el portafolio esta envejecido y necesita inversion en estrellas/interrogantes para garantizar relevo."
      );
    if (pctPerros > 25)
      alertas.push(
        "Alto peso de perros en ingresos (>25%): evalua liquidacion o reposicionamiento para liberar recursos."
      );
    if (e === 0 && i === 0)
      alertas.push(
        "Portafolio sin productos en mercados de alto crecimiento: riesgo estrategico a mediano plazo."
      );
    if (e === 0 && v > 0 && pctVacas > 40)
      alertas.push(
        "Sin estrellas que reemplacen a las vacas cuando maduren: planifica nuevos lanzamientos."
      );
    if (i > e + v + p)
      alertas.push(
        "Demasiadas interrogantes: enfoca recursos en 1-2 con mayor potencial; el resto desinvierte."
      );

    let estado: "equilibrado" | "atencion" | "riesgo";
    if (alertas.length === 0 && pctEstrellas > 10) estado = "equilibrado";
    else if (alertas.length <= 1) estado = "atencion";
    else estado = "riesgo";
    return { alertas, estado };
  }, [totales, pct]);

  const estadoConfig = {
    equilibrado: { label: "Portafolio equilibrado", color: "#14B8A6" },
    atencion: { label: "Requiere atencion", color: "#F59E0B" },
    riesgo: { label: "Riesgo elevado", color: "#F43F5E" },
  }[diagnostico.estado];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Resumen ejecutivo del portafolio</CardTitle>
          <Badge
            variant="outline"
            style={{ color: estadoConfig.color, borderColor: estadoConfig.color }}
          >
            {estadoConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {(Object.keys(QUADRANT_INFO) as Quadrant[]).map((k) => {
            const info = QUADRANT_INFO[k];
            const data = totales.porCuadrante[k];
            return (
              <div
                key={k}
                className="rounded-lg border p-3"
                style={{ borderColor: info.border }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ color: info.color }}>{info.icon}</span>
                  <span className="text-xs font-medium">{info.label}</span>
                </div>
                <div className="text-2xl font-semibold tabular-nums">
                  {data.count}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {pct(data.ventas).toFixed(1)}% ingresos
                </div>
              </div>
            );
          })}
        </div>

        {diagnostico.alertas.length > 0 ? (
          <div className="space-y-2">
            <Separator className="my-3" />
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Diagnostico
            </div>
            {diagnostico.alertas.map((a, i) => (
              <div
                key={i}
                className="flex gap-2 items-start text-sm rounded-md border border-amber-200/60 bg-transparent dark:border-amber-900/30 dark:bg-transparent p-3"
              >
                <AlertCircle className="size-4 mt-0.5 shrink-0 text-amber-400" />
                <span className="leading-relaxed">{a}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-emerald-200/60 bg-transparent dark:border-emerald-900/30 dark:bg-transparent p-3 text-sm">
            El portafolio muestra un balance razonable entre cuadrantes. Mantente
            atento a la evolucion de las estrellas e interrogantes.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ───────────────────────────────────────────────────────────────────────
// CHART
// ───────────────────────────────────────────────────────────────────────

function BcgChart({
  productos,
  cortoY,
  cortoX,
  moneda,
}: {
  productos: ProductoCalculado[];
  cortoY: number;
  cortoX: number;
  moneda: string;
}) {
  const dataMaxX = Math.max(
    ...productos.map((p) => p.participacionRelativa),
    cortoX
  );
  const maxX = Math.max(cortoX * 2.5, dataMaxX * 1.15, 2.5);
  const minX = 0;

  const yValues = productos.map((p) => p.crecimiento);
  const dataMaxY = Math.max(...yValues, 0);
  const dataMinY = Math.min(...yValues, 0);
  const maxY = Math.max(cortoY * 2, Math.ceil(dataMaxY / 5) * 5 + 2, 20);
  const minY = Math.min(0, Math.floor(dataMinY / 5) * 5);

  const xStep = maxX <= 3 ? 0.5 : maxX <= 6 ? 1 : 2;
  const xTicks: number[] = [];
  for (let v = 0; v <= maxX + 0.001; v += xStep)
    xTicks.push(Number(v.toFixed(2)));

  const yStep = maxY - minY <= 25 ? 2 : maxY - minY <= 50 ? 5 : 10;
  const yTicks: number[] = [];
  for (let v = minY; v <= maxY + 0.001; v += yStep)
    yTicks.push(Number(v.toFixed(0)));

  const dataByQuadrant = (Object.keys(QUADRANT_INFO) as Quadrant[]).map((q) => ({
    quadrant: q,
    items: productos
      .filter((p) => p.cuadrante === q)
      .map((p) => ({
        x: p.participacionRelativa,
        y: p.crecimiento,
        z: Math.max(p.pesoPortafolio, 1.5),
        letra: p.letra,
        nombre: p.nombre,
        cuadrante: p.cuadrante,
        cuotaPropia: p.cuotaPropia,
        ventas: p.ventas,
        peso: p.pesoPortafolio,
      })),
  }));

  return (
    <div className="w-full h-[480px] md:h-[560px] bg-card">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 30, right: 40, bottom: 36, left: 32 }}>
          <XAxis
            type="number"
            dataKey="x"
            domain={[minX, maxX]}
            ticks={xTicks}
            reversed
            tick={{ fontSize: 11, fill: "#9a91b8" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(167,139,250,0.14)" }}
            label={{
              value: "Participacion relativa de mercado",
              position: "insideBottom",
              offset: -14,
              style: { fontSize: 11, fill: "#9a91b8", textAnchor: "middle" },
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[minY, maxY]}
            ticks={yTicks}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: "#9a91b8" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(167,139,250,0.14)" }}
            label={{
              value: "Tasa de crecimiento del mercado (%)",
              angle: -90,
              position: "insideLeft",
              offset: 0,
              style: { fontSize: 11, fill: "#9a91b8", textAnchor: "middle" },
            }}
          />
          <ZAxis type="number" dataKey="z" range={[400, 4500]} />

          <ReferenceArea
            x1={cortoX} x2={maxX} y1={cortoY} y2={maxY}
            fill="transparent" stroke="none"
            label={{
              value: `${QUADRANT_INFO.estrella.icon} ${QUADRANT_INFO.estrella.label}`,
              position: "insideTop",
              fill: QUADRANT_INFO.estrella.color,
              fontSize: 13, fontWeight: 500, offset: 10,
            }}
          />
          <ReferenceArea
            x1={minX} x2={cortoX} y1={cortoY} y2={maxY}
            fill="transparent" stroke="none"
            label={{
              value: `${QUADRANT_INFO.interrogante.icon} ${QUADRANT_INFO.interrogante.label}`,
              position: "insideTop",
              fill: QUADRANT_INFO.interrogante.color,
              fontSize: 13, fontWeight: 500, offset: 10,
            }}
          />
          <ReferenceArea
            x1={cortoX} x2={maxX} y1={minY} y2={cortoY}
            fill="transparent" stroke="none"
            label={{
              value: `${QUADRANT_INFO.vaca.icon} ${QUADRANT_INFO.vaca.label}`,
              position: "insideBottom",
              fill: QUADRANT_INFO.vaca.color,
              fontSize: 13, fontWeight: 500, offset: 10,
            }}
          />
          <ReferenceArea
            x1={minX} x2={cortoX} y1={minY} y2={cortoY}
            fill="transparent" stroke="none"
            label={{
              value: `${QUADRANT_INFO.perro.icon} ${QUADRANT_INFO.perro.label}`,
              position: "insideBottom",
              fill: QUADRANT_INFO.perro.color,
              fontSize: 13, fontWeight: 500, offset: 10,
            }}
          />

          <ReferenceLine x={cortoX} stroke="rgba(167,139,250,0.14)" strokeDasharray="4 4" strokeWidth={1} />
          <ReferenceLine y={cortoY} stroke="rgba(167,139,250,0.14)" strokeDasharray="4 4" strokeWidth={1} />

          <RTooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={<ChartTooltip moneda={moneda} />}
          />

          {dataByQuadrant.map(({ quadrant, items }) =>
            items.length > 0 ? (
              <Scatter
                key={quadrant}
                name={QUADRANT_INFO[quadrant].label}
                data={items}
                fill={QUADRANT_INFO[quadrant].color}
                fillOpacity={0.55}
                stroke={QUADRANT_INFO[quadrant].color}
                strokeOpacity={0.6}
                strokeWidth={1}
              >
                {items.map((_, i) => (
                  <Cell key={i} />
                ))}
                <LabelList dataKey="letra" position="center" fill="#ffffff" fontSize={13} fontWeight={700} />
                <LabelList
                  dataKey="nombre"
                  content={(p: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown }) => (
                    <text x={Number(p.x) + Number(p.width ?? 0) / 2} y={Number(p.y) + Number(p.height ?? 0) + 14} textAnchor="middle" fill="#cbc3e3" fontSize={11}>
                      {String(p.value ?? "")}
                    </text>
                  )}
                />
              </Scatter>
            ) : null
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  moneda,
}: {
  active?: boolean;
  payload?: Array<{
    payload: {
      letra: string;
      nombre: string;
      cuadrante: Quadrant;
      x: number;
      y: number;
      cuotaPropia: number;
      ventas: number;
      peso: number;
    };
  }>;
  moneda?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const info = QUADRANT_INFO[d.cuadrante];
  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur p-3 shadow-md text-xs space-y-1 min-w-[210px]">
      <div className="font-medium text-sm flex items-center gap-1.5">
        <span
          className="inline-flex items-center justify-center size-5 rounded-full text-[11px] font-bold text-white"
          style={{ backgroundColor: info.color }}
        >
          {d.letra}
        </span>
        {d.nombre}
      </div>
      <div className="text-xs" style={{ color: info.color }}>
        {info.icon} {info.label}
      </div>
      <Separator className="my-1.5" />
      <Row label="Participacion relativa" value={d.x.toFixed(3)} />
      <Row label="Crecimiento mercado" value={`${d.y.toFixed(2)}%`} />
      <Row label="Cuota propia" value={`${d.cuotaPropia.toFixed(2)}%`} />
      <Row label="Peso portafolio" value={`${d.peso.toFixed(2)}%`} />
      <Row label="Ventas" value={`${moneda} ${d.ventas.toLocaleString("es-PE")}`} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-medium">{value}</span>
    </div>
  );
}

function PrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        body { background: white; }
        nav, aside, [role="navigation"], .print\\:hidden { display: none !important; }
        main, .container { max-width: 100% !important; padding: 0 !important; }
        .recharts-wrapper { page-break-inside: avoid; }
      }
    `}</style>
  );
}
