export interface PredefinedArea {
  key: string;
  name: string;
  icon: string;
}

export const PREDEFINED_AREAS: PredefinedArea[] = [
  { key: "gerencia-general", name: "Gerencia General", icon: "Crown" },
  { key: "comercial", name: "Comercial / Ventas", icon: "TrendingUp" },
  { key: "marketing", name: "Marketing", icon: "Megaphone" },
  { key: "operaciones", name: "Operaciones / Producción", icon: "Factory" },
  { key: "finanzas", name: "Finanzas", icon: "Wallet" },
  { key: "rrhh", name: "Recursos Humanos", icon: "Users" },
  { key: "tecnologia", name: "Tecnología / I+D", icon: "Cpu" },
  { key: "logistica", name: "Logística / Cadena de suministro", icon: "Truck" },
  { key: "calidad", name: "Calidad", icon: "ShieldCheck" },
  { key: "legal", name: "Legal / Cumplimiento", icon: "Scale" },
];

export const FREQUENCY_OPTIONS = [
  { value: "mensual", label: "Mensual" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
] as const;

export const PRIORITY_OPTIONS = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
] as const;

export const STATUS_OPTIONS = [
  { value: "borrador", label: "Borrador" },
  { value: "definido", label: "Definido" },
  { value: "en_ejecucion", label: "En ejecución" },
  { value: "cumplido", label: "Cumplido" },
  { value: "no_cumplido", label: "No cumplido" },
] as const;

export const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

export type Quarter = (typeof QUARTERS)[number];
export type DistributionMode = "lineal" | "exponencial" | "frontal";

export function distributeLinear(start: number, end: number, steps: number): number[] {
  if (steps <= 0) return [];
  if (steps === 1) return [end];
  const delta = (end - start) / steps;
  const values: number[] = [];
  for (let i = 1; i <= steps; i++) {
    values.push(start + delta * i);
  }
  values[values.length - 1] = end;
  return values;
}

export function distributeExponential(start: number, end: number, steps: number): number[] {
  if (steps <= 0) return [];
  if (steps === 1) return [end];
  const safeStart = start === 0 ? 0.0001 : start;
  const ratio = Math.pow(end / safeStart, 1 / steps);
  const values: number[] = [];
  let current = safeStart;
  for (let i = 0; i < steps; i++) {
    current = current * ratio;
    values.push(current);
  }
  values[values.length - 1] = end;
  return values;
}

export function distributeFrontLoaded(start: number, end: number, steps: number): number[] {
  if (steps <= 0) return [];
  if (steps === 1) return [end];
  const total = end - start;
  const values: number[] = [];
  let accumulated = 0;
  for (let i = 1; i <= steps; i++) {
    const progress = Math.sqrt(i / steps);
    const target = start + total * progress;
    values.push(target);
    accumulated = target;
  }
  values[values.length - 1] = end;
  return values;
}

export function distribute(
  mode: DistributionMode,
  start: number,
  end: number,
  steps: number,
): number[] {
  switch (mode) {
    case "exponencial":
      return distributeExponential(start, end, steps);
    case "frontal":
      return distributeFrontLoaded(start, end, steps);
    case "lineal":
    default:
      return distributeLinear(start, end, steps);
  }
}
