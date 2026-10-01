"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { AMOFHIT_AREAS } from "@/lib/constants";
import {
  AMOFHIT_EVALUATION_DATA,
  RATING_CONFIG,
  type AmofhitVariable,
  type AmofhitSeccion,
  type AmofhitAreaData,
} from "@/lib/amofhit-evaluation-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Megaphone,
  Cog,
  DollarSign,
  Users,
  Monitor,
  Cpu,
  Factory,
  ChevronDown,
  ChevronUp,
  Check,
  Upload,
  X,
  Sparkles,
  FileText,
  Paperclip,
  Pencil,
  ToggleRight,
  Shield,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const AREA_ICONS: Record<string, React.ElementType> = {
  A: Building2, M: Megaphone, O: Cog, F: DollarSign,
  H: Users, I: Monitor, T: Cpu,
};

const AREA_STYLES: Record<string, {
  color: string; bg: string; border: string; badgeBg: string;
}> = {
  A: { color: "text-primary dark:text-primary", bg: "bg-primary/10", border: "border-primary/20 hover:border-primary/40", badgeBg: "bg-primary" },
  M: { color: "text-rose-700 dark:text-rose-700", bg: "bg-rose-500/10", border: "border-rose-500/20 hover:border-rose-500/40", badgeBg: "bg-rose-600" },
  O: { color: "text-amber-700 dark:text-amber-700", bg: "bg-amber-500/10", border: "border-amber-500/20 hover:border-amber-500/40", badgeBg: "bg-amber-600" },
  F: { color: "text-green-700 dark:text-green-700", bg: "bg-green-500/10", border: "border-green-500/20 hover:border-green-500/40", badgeBg: "bg-green-600" },
  H: { color: "text-stone-700 dark:text-stone-700", bg: "bg-stone-500/10", border: "border-stone-500/20 hover:border-stone-500/40", badgeBg: "bg-stone-600" },
  I: { color: "text-cyan-700 dark:text-cyan-700", bg: "bg-cyan-500/10", border: "border-cyan-500/20 hover:border-cyan-500/40", badgeBg: "bg-cyan-600" },
  T: { color: "text-slate-700 dark:text-slate-700", bg: "bg-slate-500/10", border: "border-slate-500/20 hover:border-slate-500/40", badgeBg: "bg-slate-600" },
};

// ---------------------------------------------------------------------------
// Types for evaluation state
// ---------------------------------------------------------------------------

interface VariableEvaluation {
  score: 1 | 2 | 3 | 4;
  hallazgo: string;
  evidenceChips: string[];
  evidenceNotes: string;
  evidenceFiles: string[];
  confirmed: boolean;
  includeInMefi?: boolean;
}

interface AreaEvaluations {
  [variableId: string]: VariableEvaluation;
}

// Contexto de ratios cargados, indexado por key del catalogo (ej. "F.REN.ROE")
interface RatioContextItem {
  name: string;
  unit: string;
  value: number;
  sector: number;
  higherIsBetter: boolean;
}
type RatiosContext = Map<string, RatioContextItem>;

interface RatingSuggestion {
  score: 1 | 2 | 3 | 4;
  details: { name: string; value: number; sector: number; unit: string; deltaPct: number; passes: boolean }[];
}

// Item del catalogo de indicadores cuantitativos (RatioMaster + benchmark + valor del usuario)
interface RatioItem {
  key: string;
  area: string;
  category: string;
  name: string;
  formula: string | null;
  unit: string;
  higherIsBetter: boolean;
  defaultActive: boolean;
  sectorBenchmark: number | null;
  sectorBenchmarkSource: string | null;
  companyValue: number | null;
  sectorOverride: number | null;
}

// Descripciones contextuales por nivel para cada ratio del catalogo F
// (similar a `descripcionesPills` del cualitativo)
const RATIO_PILL_DESCRIPTIONS: Record<string, Record<1 | 2 | 3 | 4, string>> = {
  "F.LIQ.CURRENT_RATIO": {
    1: "Liquidez critica, riesgo de impago",
    2: "Liquidez ajustada vs sector",
    3: "Liquidez competitiva con la industria",
    4: "Liquidez solida superior al sector",
  },
  "F.LIQ.QUICK_RATIO": {
    1: "Sin colchon liquido inmediato",
    2: "Capacidad inmediata por debajo",
    3: "Capacidad inmediata adecuada",
    4: "Excelente colchon liquido inmediato",
  },
  "F.LIQ.WORKING_CAPITAL": {
    1: "Capital de trabajo negativo o muy bajo",
    2: "Capital de trabajo ajustado",
    3: "Capital de trabajo saludable",
    4: "Capital de trabajo holgado",
  },
  "F.END.DEBT_TO_ASSETS": {
    1: "Sobreendeudamiento, alto riesgo",
    2: "Apalancamiento elevado vs sector",
    3: "Estructura de deuda saludable",
    4: "Estructura conservadora, baja deuda",
  },
  "F.END.DEBT_TO_EQUITY": {
    1: "Sobreendeudamiento, viabilidad comprometida",
    2: "Apalancamiento alto vs sector",
    3: "Balance deuda/patrimonio adecuado",
    4: "Estructura optima, flexibilidad financiera",
  },
  "F.END.INTEREST_COVERAGE": {
    1: "Margen para pagar intereses muy bajo",
    2: "Cobertura de intereses ajustada",
    3: "Cobertura adecuada de intereses",
    4: "Excelente capacidad de pago de intereses",
  },
  "F.REN.GROSS_MARGIN": {
    1: "Margen bruto muy debajo del sector",
    2: "Margen bruto inferior al promedio",
    3: "Margen bruto competitivo",
    4: "Margen bruto superior, fortaleza productiva",
  },
  "F.REN.OPERATING_MARGIN": {
    1: "Operacion poco rentable vs sector",
    2: "Margen operativo inferior",
    3: "Margen operativo competitivo",
    4: "Margen operativo superior, eficiencia alta",
  },
  "F.REN.NET_MARGIN": {
    1: "Margen neto critico, destruye valor",
    2: "Margen neto bajo vs sector",
    3: "Margen neto en linea con la industria",
    4: "Margen neto superior, alta rentabilidad",
  },
  "F.REN.EBITDA_MARGIN": {
    1: "EBITDA muy debajo del sector",
    2: "EBITDA inferior al promedio",
    3: "EBITDA competitivo",
    4: "EBITDA superior, generacion de caja fuerte",
  },
  "F.REN.ROA": {
    1: "ROA muy debajo, activos poco productivos",
    2: "ROA inferior al sector",
    3: "ROA competitivo",
    4: "ROA superior, alta eficiencia en activos",
  },
  "F.REN.ROE": {
    1: "ROE critico, baja rentabilidad para socios",
    2: "ROE inferior al sector",
    3: "ROE competitivo",
    4: "ROE superior, excelente retorno al accionista",
  },
  "F.ACT.INV_TURNOVER": {
    1: "Inventario estancado vs sector",
    2: "Rotacion inferior al promedio",
    3: "Rotacion competitiva",
    4: "Rotacion superior, gestion agil de stock",
  },
  "F.ACT.DSO": {
    1: "Cobranza muy lenta, capital atrapado",
    2: "Cobranza por encima del sector",
    3: "Cobranza alineada con la industria",
    4: "Cobranza rapida, ventaja de caja",
  },
  "F.ACT.ASSET_TURNOVER": {
    1: "Activos subutilizados vs sector",
    2: "Rotacion de activos inferior",
    3: "Rotacion de activos competitiva",
    4: "Rotacion superior, alta productividad de activos",
  },

  // ─── A · ADMINISTRACION Y GERENCIA ──────────────────────────────────
  "A.GOV.LAYERS": {
    1: "Estructura excesivamente jerarquica",
    2: "Demasiados niveles, decisiones lentas",
    3: "Niveles razonables vs sector",
    4: "Estructura plana, decisiones agiles",
  },
  "A.GOV.SPAN": {
    1: "Span muy bajo, exceso de jefes",
    2: "Span por debajo del optimo (5-9)",
    3: "Span dentro del rango optimo",
    4: "Span optimo con alta delegacion",
  },
  "A.GOV.SENIORITY": {
    1: "Equipo gerencial muy nuevo o inestable",
    2: "Antiguedad inferior al sector",
    3: "Antiguedad similar al sector",
    4: "Equipo experimentado, conocimiento profundo",
  },
  "A.GOV.EDUCATION": {
    1: "Nivel educativo gerencial bajo",
    2: "Educacion gerencial inferior al sector",
    3: "Nivel educativo competitivo",
    4: "Equipo altamente formado, fortaleza intelectual",
  },
  "A.GOV.EXEC_TURNOVER": {
    1: "Rotacion gerencial critica, perdida de know-how",
    2: "Rotacion gerencial alta vs sector",
    3: "Rotacion controlada, similar al sector",
    4: "Equipo gerencial estable, baja rotacion",
  },

  // ─── M · MARKETING Y VENTAS ─────────────────────────────────────────
  "M.MKT.MARKET_SHARE": {
    1: "Cuota de mercado marginal",
    2: "Cuota inferior al promedio sectorial",
    3: "Cuota competitiva en su segmento",
    4: "Cuota lider del mercado",
  },
  "M.MKT.SOV": {
    1: "Voz de marca casi inexistente en medios",
    2: "Share of voice inferior al sector",
    3: "Presencia mediatica competitiva",
    4: "Voz de marca dominante",
  },
  "M.MKT.SALES_GROWTH": {
    1: "Ventas decrecientes o estancadas",
    2: "Crecimiento por debajo del sector",
    3: "Crecimiento alineado con la industria",
    4: "Crecimiento superior, ganando mercado",
  },
  "M.MKT.CAC": {
    1: "Costo de adquisicion insostenible",
    2: "CAC mayor al promedio sectorial",
    3: "CAC competitivo",
    4: "CAC bajo, eficiencia comercial superior",
  },
  "M.MKT.LTV": {
    1: "LTV bajo, retencion deficiente",
    2: "LTV inferior al sector",
    3: "LTV competitivo",
    4: "LTV superior, alto valor por cliente",
  },
  "M.MKT.LTV_CAC": {
    1: "Ratio LTV/CAC < 1, modelo insostenible",
    2: "Ratio bajo (~2), apenas rentable",
    3: "Ratio saludable (>3)",
    4: "Ratio excelente (>5), alta rentabilidad",
  },
  "M.MKT.NPS": {
    1: "NPS negativo, mas detractores que promotores",
    2: "NPS bajo vs sector",
    3: "NPS competitivo",
    4: "NPS sobresaliente, base de fans",
  },
  "M.MKT.RETENTION": {
    1: "Retencion critica, churn alto",
    2: "Retencion inferior al sector",
    3: "Retencion alineada con la industria",
    4: "Retencion superior, base leal",
  },
  "M.MKT.FUNNEL_CONV": {
    1: "Conversion comercial muy baja",
    2: "Conversion del funnel inferior",
    3: "Conversion competitiva",
    4: "Conversion superior, equipo eficaz",
  },
  "M.MKT.SALES_COVERAGE": {
    1: "Cobertura comercial muy limitada",
    2: "Cobertura inferior al sector",
    3: "Cobertura adecuada del mercado objetivo",
    4: "Cobertura superior, alcance amplio",
  },

  // ─── O · OPERACIONES Y LOGISTICA ────────────────────────────────────
  "O.OPS.OEE": {
    1: "OEE critico, equipo muy ineficiente",
    2: "OEE inferior al sector",
    3: "OEE competitivo",
    4: "OEE de clase mundial (>85%)",
  },
  "O.OPS.PRODUCTIVITY": {
    1: "Productividad baja vs sector",
    2: "Productividad por empleado inferior",
    3: "Productividad competitiva",
    4: "Productividad superior, equipo eficaz",
  },
  "O.OPS.UNIT_COST": {
    1: "Costo unitario muy alto vs sector",
    2: "Costo unitario por encima del promedio",
    3: "Costo unitario competitivo",
    4: "Costo unitario optimo, ventaja de costos",
  },
  "O.OPS.DEFECT_RATE": {
    1: "Tasa de defectos critica",
    2: "Defectos por encima del sector",
    3: "Defectos en linea con la industria",
    4: "Tasa de defectos minima, calidad superior",
  },
  "O.OPS.OTD": {
    1: "Cumplimiento de entregas critico",
    2: "OTD inferior al sector",
    3: "OTD competitivo",
    4: "OTD superior, confiabilidad excelente",
  },
  "O.OPS.LEAD_TIME": {
    1: "Lead time muy alto, ralentiza el negocio",
    2: "Lead time superior al sector",
    3: "Lead time competitivo",
    4: "Lead time corto, agilidad superior",
  },
  "O.OPS.CAPACITY": {
    1: "Capacidad muy desbalanceada (sub o sobreutilizada)",
    2: "Utilizacion fuera del rango optimo",
    3: "Utilizacion dentro del rango sano (70-90%)",
    4: "Utilizacion optima, sin holgura ni saturacion",
  },
  "O.OPS.INV_TURNOVER": {
    1: "Inventarios estancados",
    2: "Rotacion inferior al sector",
    3: "Rotacion competitiva",
    4: "Rotacion superior, gestion agil",
  },
  "O.OPS.DOI": {
    1: "Dias de inventario excesivos, capital atado",
    2: "DOI superior al sector",
    3: "DOI alineado con la industria",
    4: "DOI bajo, capital de trabajo eficiente",
  },
  "O.OPS.LOG_COST": {
    1: "Costo logistico alto, erosiona margen",
    2: "Costo logistico superior al sector",
    3: "Costo logistico competitivo",
    4: "Costo logistico bajo, ventaja de costos",
  },

  // ─── H · RECURSOS HUMANOS ───────────────────────────────────────────
  "H.HR.TURNOVER": {
    1: "Rotacion critica, hemorragia de talento",
    2: "Rotacion alta vs sector",
    3: "Rotacion controlada",
    4: "Rotacion baja, alta retencion",
  },
  "H.HR.ABSENTEEISM": {
    1: "Ausentismo critico, problema sistemico",
    2: "Ausentismo elevado vs sector",
    3: "Ausentismo controlado",
    4: "Ausentismo minimo, alto compromiso",
  },
  "H.HR.TIME_TO_FILL": {
    1: "Vacantes tardan demasiado en cubrirse",
    2: "Tiempo de cobertura superior al sector",
    3: "Tiempo de cobertura competitivo",
    4: "Cobertura rapida, atraccion fuerte",
  },
  "H.HR.SPAN": {
    1: "Span muy bajo, estructura cara",
    2: "Span fuera del rango optimo",
    3: "Span dentro del rango optimo (5-9)",
    4: "Span optimo con buena supervision",
  },
  "H.HR.PAYROLL_RATIO": {
    1: "Costo de planilla insostenible vs ventas",
    2: "Planilla pesada vs sector",
    3: "Costo de planilla controlado",
    4: "Eficiencia salarial superior",
  },
  "H.HR.TRAINING_HOURS": {
    1: "Casi sin inversion en capacitacion",
    2: "Capacitacion inferior al sector",
    3: "Capacitacion competitiva",
    4: "Inversion superior en desarrollo de talento",
  },
  "H.HR.CLIMATE": {
    1: "Clima laboral critico",
    2: "Clima inferior al sector",
    3: "Clima positivo similar a la industria",
    4: "Clima excepcional, fortaleza diferenciadora",
  },
  "H.HR.ENPS": {
    1: "eNPS negativo, equipo desencantado",
    2: "eNPS bajo vs sector",
    3: "eNPS positivo competitivo",
    4: "eNPS sobresaliente, equipo embajador",
  },
  "H.HR.ACCIDENTS": {
    1: "Tasa de accidentes muy alta, riesgo legal",
    2: "Accidentes por encima del sector",
    3: "Tasa de accidentes controlada",
    4: "Tasa minima, cultura de seguridad",
  },

  // ─── I · SISTEMAS DE INFORMACION ────────────────────────────────────
  "I.SYS.AUTOMATION": {
    1: "Procesos casi sin automatizar",
    2: "Automatizacion inferior al sector",
    3: "Automatizacion competitiva",
    4: "Procesos altamente automatizados",
  },
  "I.SYS.UPTIME": {
    1: "Sistemas inestables, caidas frecuentes",
    2: "Uptime inferior al estandar (99%)",
    3: "Uptime competitivo (>99%)",
    4: "Uptime de clase mundial (>99.9%)",
  },
  "I.SYS.MTTR": {
    1: "Resolucion de incidentes muy lenta",
    2: "MTTR superior al sector",
    3: "MTTR competitivo",
    4: "MTTR muy bajo, soporte agil",
  },
  "I.SYS.CYBERSEC": {
    1: "Cobertura de ciberseguridad critica",
    2: "Proteccion inferior al sector",
    3: "Cobertura de seguridad competitiva",
    4: "Ciberseguridad robusta, riesgo controlado",
  },
  "I.SYS.REAL_TIME": {
    1: "Pocos empleados con acceso a datos en vivo",
    2: "Acceso en tiempo real inferior al sector",
    3: "Acceso a datos competitivo",
    4: "Acceso en tiempo real para todos, cultura data-driven",
  },
  "I.SYS.MATURITY": {
    1: "Madurez digital inicial, procesos manuales",
    2: "Madurez digital basica vs sector",
    3: "Madurez digital competitiva",
    4: "Madurez digital avanzada, lider",
  },
  "I.SYS.DATA_DRIVEN": {
    1: "Decisiones casi sin respaldo de datos",
    2: "Cultura data-driven incipiente",
    3: "Decisiones soportadas en datos",
    4: "Cultura data-driven madura",
  },
  "I.SYS.IT_COST_RATIO": {
    1: "Inversion TI insuficiente",
    2: "Inversion TI inferior al sector",
    3: "Inversion TI competitiva",
    4: "Inversion TI superior, habilita innovacion",
  },

  // ─── T · TECNOLOGIA, I+D ────────────────────────────────────────────
  "T.RD.RD_RATIO": {
    1: "Sin inversion significativa en I+D",
    2: "Inversion I+D inferior al sector",
    3: "Inversion I+D competitiva",
    4: "Inversion I+D superior, fortaleza innovadora",
  },
  "T.RD.CAPEX_TECH": {
    1: "CAPEX tecnologico muy bajo",
    2: "Inversion en tech inferior al sector",
    3: "CAPEX tecnologico competitivo",
    4: "CAPEX tecnologico superior, modernizacion activa",
  },
  "T.RD.NEW_PRODUCT_REV": {
    1: "Portafolio estancado, sin renovacion",
    2: "Renovacion del portafolio inferior",
    3: "Renovacion del portafolio competitiva",
    4: "Portafolio en constante renovacion, vitalidad alta",
  },
  "T.RD.TIME_TO_MARKET": {
    1: "Time-to-market muy lento",
    2: "Time-to-market superior al sector",
    3: "Time-to-market competitivo",
    4: "Time-to-market corto, agilidad innovadora",
  },
  "T.RD.PATENTS": {
    1: "Sin proteccion intelectual",
    2: "Patentes por debajo del sector",
    3: "Patentes en linea con la industria",
    4: "Portafolio de patentes superior, ventaja IP",
  },
  "T.RD.RD_HEADCOUNT": {
    1: "Equipo I+D casi inexistente",
    2: "% personal I+D inferior al sector",
    3: "Personal I+D competitivo",
    4: "Equipo I+D robusto, fortaleza innovadora",
  },
  "T.RD.TECH_ALLIANCES": {
    1: "Sin alianzas tecnologicas",
    2: "Alianzas inferiores al sector",
    3: "Alianzas competitivas",
    4: "Red de alianzas amplia, ecosistema fuerte",
  },
  "T.RD.TECH_AGE": {
    1: "Tecnologia obsoleta",
    2: "Tecnologia mas vieja que el sector",
    3: "Tecnologia actualizada en linea con el sector",
    4: "Tecnologia de punta, ventaja diferenciadora",
  },
};

function getRatioDescription(
  key: string,
  score: 1 | 2 | 3 | 4,
  higherIsBetter: boolean,
): string {
  const custom = RATIO_PILL_DESCRIPTIONS[key];
  if (custom) return custom[score];
  // Fallback generico si no esta en el mapping (ej. ratios personalizados)
  const fallback = higherIsBetter
    ? {
        1: "Muy por debajo del sector",
        2: "Por debajo del sector",
        3: "Compite con el sector",
        4: "Supera al sector",
      }
    : {
        1: "Muy por encima del sector",
        2: "Por encima del sector",
        3: "Cerca del sector",
        4: "Por debajo del sector (mejor)",
      };
  return fallback[score];
}

// Calificacion 1-4 para un solo ratio basado en su delta vs sector
function rateRatio(deltaPct: number, higherIsBetter: boolean): 1 | 2 | 3 | 4 {
  // Convertimos a "delta favorable": positivo si supera al sector, negativo si no
  const favorable = higherIsBetter ? deltaPct : -deltaPct;
  if (favorable < -25) return 1;
  if (favorable < 0) return 2;
  if (favorable < 15) return 3;
  return 4;
}

function suggestRatingFromRatios(
  linkedRatios: string[] | undefined,
  ratios: RatiosContext | null,
): RatingSuggestion | null {
  if (!linkedRatios || linkedRatios.length === 0 || !ratios) return null;
  const details: RatingSuggestion["details"] = [];
  for (const key of linkedRatios) {
    const r = ratios.get(key);
    if (!r) continue;
    const deltaPct = ((r.value - r.sector) / Math.abs(r.sector)) * 100;
    const passes = r.higherIsBetter ? deltaPct > 0 : deltaPct < 0;
    details.push({
      name: r.name,
      value: r.value,
      sector: r.sector,
      unit: r.unit,
      deltaPct,
      passes,
    });
  }
  if (details.length === 0) return null;

  // Promedio de "delta favorable": +N si pasa, -N si no
  const avgFavorableDelta =
    details.reduce((sum, d) => {
      const abs = Math.abs(d.deltaPct);
      return sum + (d.passes ? abs : -abs);
    }, 0) / details.length;

  let score: 1 | 2 | 3 | 4;
  if (avgFavorableDelta < -25) score = 1;
  else if (avgFavorableDelta < 0) score = 2;
  else if (avgFavorableDelta < 15) score = 3;
  else score = 4;

  return { score, details };
}

function formatJustification(s: RatingSuggestion): string {
  const parts = s.details.map((d) => {
    const sign = d.deltaPct >= 0 ? "+" : "";
    return `${d.name} ${formatNum(d.value)}${d.unit === "%" ? "%" : ""} vs sector ${formatNum(d.sector)}${d.unit === "%" ? "%" : ""} (${sign}${d.deltaPct.toFixed(1)}%)`;
  });
  return `Respaldo cuantitativo: ${parts.join("; ")}.`;
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString("es-PE", { maximumFractionDigits: 0 });
  return n.toLocaleString("es-PE", { maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Scroll reveal hook
// ---------------------------------------------------------------------------

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ---------------------------------------------------------------------------
// Rating Pill component
// ---------------------------------------------------------------------------

// Default (unselected) pill colors — gradient from red to green
const PILL_DEFAULTS: Record<1 | 2 | 3 | 4, { bg: string; border: string; text: string; numberColor: string }> = {
  1: { bg: "transparent",  border: "#b3261e", text: "#9B4444", numberColor: "#C14444" },
  2: { bg: "transparent",  border: "#a16207", text: "#7A5A1F", numberColor: "#B07A22" },
  3: { bg: "transparent",  border: "#ACC57E", text: "#4A6B22", numberColor: "#5E8A25" },
  4: { bg: "transparent",  border: "#7ECDB0", text: "#1A7A56", numberColor: "#1e7f4f" },
};

function RatingPill({
  score,
  label,
  description,
  selected,
  onClick,
}: {
  score: 1 | 2 | 3 | 4;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  const config = RATING_CONFIG[score];
  const defaults = PILL_DEFAULTS[score];

  // Selected = strong saturated colors from RATING_CONFIG
  // Default = softer gradient tones from PILL_DEFAULTS
  const bg = selected ? config.bg : defaults.bg;
  const border = selected ? config.border : defaults.border;
  const text = selected ? config.text : defaults.text;
  const numberColor = selected ? config.text : defaults.numberColor;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-xl border-[1.5px] p-3 text-center transition-all duration-200 cursor-pointer"
      style={{
        borderColor: border,
        backgroundColor: bg,
        boxShadow: selected ? `0 0 0 1px ${config.border}33` : "none",
      }}
    >
      <span
        className="text-[11px] font-medium uppercase tracking-wide"
        style={{ color: text }}
      >
        {config.label}
      </span>
      <span
        className="text-2xl font-medium"
        style={{ color: numberColor }}
      >
        {score}
      </span>
      <span
        className="text-[12px] leading-snug"
        style={{ color: text }}
      >
        {description}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Suggestion Panel — auto-calificacion basada en respaldo cuantitativo
// ---------------------------------------------------------------------------

function SuggestionPanel({
  suggestion,
  applied,
  onApply,
  onUndo,
}: {
  suggestion: RatingSuggestion;
  applied: boolean;
  onApply: () => void;
  onUndo: () => void;
}) {
  const cfg = RATING_CONFIG[suggestion.score];
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: "transparent",
        borderColor: "#BFD8F2",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-8 items-center justify-center rounded-full shrink-0" style={{ backgroundColor: "#8B1510" }}>
          <Sparkles className="size-4 text-white" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "#8B1510" }}>
              Sugerencia basada en tus indicadores
            </span>
            <span
              className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
              style={{ borderColor: cfg.border, color: cfg.text, backgroundColor: cfg.bg }}
            >
              {cfg.label} ({suggestion.score})
            </span>
          </div>
          <ul className="text-[12px] space-y-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {suggestion.details.map((d, i) => {
              const sign = d.deltaPct >= 0 ? "+" : "";
              return (
                <li key={i} className="flex items-baseline gap-1.5">
                  <span
                    className="inline-block size-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: d.passes ? "#1e7f4f" : "#b3261e" }}
                  />
                  <span>
                    {d.name}: <strong>{formatNum(d.value)}{d.unit === "%" ? "%" : ""}</strong> vs sector {formatNum(d.sector)}{d.unit === "%" ? "%" : ""} ({sign}{d.deltaPct.toFixed(1)}%)
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-2 pt-1">
            {applied ? (
              <>
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700">
                  <Check className="size-3.5" /> Sugerencia aplicada
                </span>
                <button
                  type="button"
                  onClick={onUndo}
                  className="text-[12px] underline text-muted-foreground hover:text-foreground"
                >
                  Deshacer
                </button>
              </>
            ) : (
              <Button size="sm" onClick={onApply} className="h-8">
                Aplicar sugerencia
              </Button>
            )}
            <span className="text-[11px] text-muted-foreground">
              Puedes ajustarla manualmente despues
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evidence Chip component
// ---------------------------------------------------------------------------

function EvidenceChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[13px] transition-all duration-150 cursor-pointer"
      style={{
        borderColor: active ? "#8B1510" : "var(--color-border-tertiary)",
        backgroundColor: "transparent",
        color: active ? "#185fa5" : "var(--color-text-secondary)",
      }}
    >
      {active && <Check className="size-3" />}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Variable Row component (the core evaluation unit)
// ---------------------------------------------------------------------------

function VariableRow({
  variable,
  index,
  evaluation,
  expanded,
  onToggle,
  onCollapse,
  onUpdateEvaluation,
  areaColor,
  ratiosContext,
  ratiosByKey,
  ratioCycleId,
  ratioYear,
  onRatiosUpdated,
}: {
  variable: AmofhitVariable;
  index: number;
  evaluation: VariableEvaluation | undefined;
  expanded: boolean;
  onToggle: () => void;
  onCollapse: () => void;
  onUpdateEvaluation: (eval_: Partial<VariableEvaluation>) => void;
  areaColor: string;
  ratiosContext: RatiosContext | null;
  ratiosByKey: Map<string, RatioItem>;
  ratioCycleId: string;
  ratioYear: number;
  onRatiosUpdated: () => void;
}) {
  const suggestion = useMemo(
    () => suggestRatingFromRatios(variable.linkedRatios, ratiosContext),
    [variable.linkedRatios, ratiosContext],
  );
  const linkedRatioItems = useMemo<RatioItem[]>(() => {
    if (!variable.linkedRatios) return [];
    return variable.linkedRatios
      .map((k) => ratiosByKey.get(k))
      .filter((it): it is RatioItem => Boolean(it));
  }, [variable.linkedRatios, ratiosByKey]);
  const [extraJustification, setExtraJustification] = useState<string | null>(null);
  const [pendingScore, setPendingScore] = useState<1 | 2 | 3 | 4 | null>(
    evaluation?.score ?? null,
  );
  const [pendingChips, setPendingChips] = useState<string[]>(
    evaluation?.evidenceChips ?? [],
  );
  const [pendingNotes, setPendingNotes] = useState(
    evaluation?.evidenceNotes ?? "",
  );
  const [pendingFiles, setPendingFiles] = useState<string[]>(
    evaluation?.evidenceFiles ?? [],
  );
  const [pendingIncludeInMefi, setPendingIncludeInMefi] = useState<boolean>(
    evaluation?.includeInMefi ?? false,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Snapshot of state at time of expansion, for cancel
  const snapshotRef = useRef<{
    score: 1 | 2 | 3 | 4 | null;
    chips: string[];
    notes: string;
    files: string[];
  } | null>(null);

  // Capture snapshot when panel opens
  useEffect(() => {
    if (expanded) {
      snapshotRef.current = {
        score: evaluation?.score ?? null,
        chips: evaluation?.evidenceChips ?? [],
        notes: evaluation?.evidenceNotes ?? "",
        files: evaluation?.evidenceFiles ?? [],
      };
    }
  }, [expanded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync state when evaluation changes externally
  useEffect(() => {
    if (evaluation) {
      setPendingScore(evaluation.score);
      setPendingChips(evaluation.evidenceChips);
      setPendingNotes(evaluation.evidenceNotes);
      setPendingFiles(evaluation.evidenceFiles);
      setPendingIncludeInMefi(evaluation.includeInMefi ?? false);
    }
  }, [evaluation]);

  const isConfirmed = evaluation?.confirmed ?? false;
  const displayScore = isConfirmed ? evaluation?.score : pendingScore;

  // Border color for the row
  let borderLeftColor = "var(--color-border-tertiary)";
  if (isConfirmed && displayScore) {
    borderLeftColor = displayScore >= 3
      ? "var(--color-border-success, #22c55e)"
      : "var(--color-border-danger, #ef4444)";
  }

  const hasNoEvidence = pendingChips.includes("No tenemos evidencia");

  // Effective score: if "No tenemos evidencia" and score >= 3, cap at 3 (adjusted -0.5 conceptually)
  function getEffectiveScore(): number | null {
    if (!pendingScore) return null;
    if (hasNoEvidence && pendingScore >= 3) return pendingScore - 0.5;
    return pendingScore;
  }

  function handleSelectScore(s: 1 | 2 | 3 | 4) {
    setPendingScore(s);
    // Reset "No tenemos evidencia" if selecting new score
    if (pendingChips.includes("No tenemos evidencia")) {
      setPendingChips([]);
    }
  }

  function handleToggleChip(chip: string) {
    if (chip === "No tenemos evidencia") {
      if (pendingChips.includes(chip)) {
        setPendingChips([]);
      } else {
        setPendingChips([chip]);
        setPendingNotes("");
      }
      return;
    }
    const withoutNo = pendingChips.filter((c) => c !== "No tenemos evidencia");
    if (withoutNo.includes(chip)) {
      setPendingChips(withoutNo.filter((c) => c !== chip));
    } else {
      setPendingChips([...withoutNo, chip]);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const names = Array.from(files).map((f) => f.name);
    setPendingFiles((prev) => [...prev, ...names]);
    e.target.value = "";
  }

  function handleRemoveFile(name: string) {
    setPendingFiles((prev) => prev.filter((f) => f !== name));
  }

  function handleCancel() {
    // Restore snapshot and collapse
    const snap = snapshotRef.current;
    if (snap) {
      setPendingScore(snap.score);
      setPendingChips(snap.chips);
      setPendingNotes(snap.notes);
      setPendingFiles(snap.files);
    }
    onCollapse();
  }

  function handleConfirm() {
    if (!pendingScore) return;
    const effectiveScore = getEffectiveScore();
    let hallazgo = variable.hallazgos[pendingScore];
    if (hasNoEvidence && pendingScore >= 3) {
      hallazgo += " (Sin evidencia documentada — calificacion ajustada)";
    }
    if (extraJustification) {
      hallazgo += ` ${extraJustification}`;
    }
    // Score 1 and 4 auto-include in MEFI
    const autoInclude = pendingScore === 1 || pendingScore === 4;
    onUpdateEvaluation({
      score: pendingScore,
      hallazgo,
      evidenceChips: pendingChips,
      evidenceNotes: pendingNotes,
      evidenceFiles: pendingFiles,
      confirmed: true,
      includeInMefi: autoInclude ? true : pendingIncludeInMefi,
    });
    toast.success(`Variable "${variable.id}" confirmada como ${RATING_CONFIG[pendingScore].label}`);
    onCollapse();
  }

  // Badge for collapsed state — with pencil icon on hover for confirmed
  function StatusBadge() {
    if (!isConfirmed || !evaluation?.score) {
      return (
        <span
          className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-medium"
          style={{
            borderColor: "var(--color-border-tertiary)",
            color: "var(--color-text-tertiary)",
            backgroundColor: "transparent",
          }}
        >
          Sin evaluar
        </span>
      );
    }
    const cfg = RATING_CONFIG[evaluation.score];
    return (
      <span
        className="group/badge inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-medium cursor-pointer"
        style={{
          borderColor: cfg.border,
          color: cfg.text,
          backgroundColor: cfg.bg,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {cfg.label} ({evaluation.score})
        <Pencil className="size-3 opacity-0 group-hover/badge:opacity-100 transition-opacity" />
      </span>
    );
  }

  // Hallazgo text with "no evidence" adjustment notice
  function getHallazgoDisplay(): string {
    if (!pendingScore) return "";
    let text = variable.hallazgos[pendingScore];
    if (hasNoEvidence && pendingScore >= 3) {
      text += " (Sin evidencia documentada — calificacion ajustada)";
    }
    if (extraJustification) {
      text += ` ${extraJustification}`;
    }
    return text;
  }

  return (
    <div
      className="rounded-xl border transition-all duration-200"
      style={{
        borderLeftWidth: "3px",
        borderLeftColor,
      }}
    >
      {/* Collapsed row — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/30 cursor-pointer"
      >
        <ChevronDown
          className={`size-4 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          style={{ color: areaColor }}
        />
        <span
          className="flex-1 text-[14px] leading-snug"
          style={{ color: "var(--color-text-primary)" }}
        >
          {variable.pregunta}
        </span>
        <StatusBadge />
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t px-5 pb-5 pt-4 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* ZONA 0a — Indicadores cuantitativos embebidos */}
          {linkedRatioItems.length > 0 && (
            <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
              <div className="flex items-start gap-2 flex-wrap">
                <DollarSign className="size-4 text-green-700 dark:text-green-700 mt-0.5" />
                <span className="text-[13px] font-medium">
                  Indicadores cuantitativos que respaldan esta evaluacion
                </span>
                <span className="text-[11px] text-muted-foreground italic ml-auto">
                  opcional — al llenarlos se sugiere la calificacion
                </span>
              </div>
              <div className="space-y-2">
                {linkedRatioItems.map((item) => (
                  <RatioRow
                    key={item.key}
                    item={item}
                    cycleId={ratioCycleId}
                    year={ratioYear}
                    onUpdated={onRatiosUpdated}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ZONA 0b — Sugerencia automatica basada en ratios */}
          {suggestion && !isConfirmed && (
            <SuggestionPanel
              suggestion={suggestion}
              applied={pendingScore === suggestion.score && extraJustification !== null}
              onApply={() => {
                handleSelectScore(suggestion.score);
                setExtraJustification(formatJustification(suggestion));
              }}
              onUndo={() => {
                setExtraJustification(null);
              }}
            />
          )}

          {/* ZONA 1 — Rating Pills (calificacion final cualitativa) */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-foreground">
                Calificacion final de la variable
              </span>
              <span className="text-[11px] text-muted-foreground">
                {linkedRatioItems.length > 0
                  ? "Resume tu evaluacion considerando el respaldo cuantitativo de arriba — esta calificacion alimenta el hallazgo y la MEFI."
                  : "Marca segun tu juicio — esta calificacion alimenta el hallazgo y la MEFI."}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([1, 2, 3, 4] as const).map((s) => (
                <RatingPill
                  key={s}
                  score={s}
                  label={RATING_CONFIG[s].label}
                  description={variable.descripcionesPills[s]}
                  selected={pendingScore === s}
                  onClick={() => handleSelectScore(s)}
                />
              ))}
            </div>
          </div>

          {/* ZONA 2 — Auto-generated finding */}
          {pendingScore && (
            <div
              className="rounded-lg border p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
              style={{
                borderColor: RATING_CONFIG[pendingScore].border,
                backgroundColor: RATING_CONFIG[pendingScore].bg,
              }}
            >
              <p
                className="text-[11px] font-medium uppercase tracking-widest mb-2"
                style={{ color: RATING_CONFIG[pendingScore].text }}
              >
                Hallazgo generado automaticamente
              </p>
              <p
                className="text-[13px] leading-relaxed"
                style={{ color: RATING_CONFIG[pendingScore].text }}
              >
                {getHallazgoDisplay()}
              </p>
              {hasNoEvidence && pendingScore >= 3 && (
                <p className="mt-2 text-[11px] font-medium" style={{ color: "#b45309" }}>
                  Calificacion efectiva ajustada a {getEffectiveScore()} por falta de evidencia
                </p>
              )}
            </div>
          )}

          {/* MEFI inclusion toggle */}
          {pendingScore && (
            <div className="flex items-center gap-2 rounded-lg border px-4 py-2.5"
              style={{ borderColor: "var(--color-border-tertiary)" }}
            >
              <TrendingUp className="size-4" style={{ color: "#8B1510" }} />
              {pendingScore === 1 || pendingScore === 4 ? (
                <span className="text-[12px] font-medium" style={{ color: "#8B1510" }}>
                  Se incluye automaticamente en la MEFI
                </span>
              ) : (
                <>
                  <span className="flex-1 text-[12px] font-medium"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Incluir en MEFI
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingIncludeInMefi(!pendingIncludeInMefi)}
                    className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer"
                    style={{
                      backgroundColor: pendingIncludeInMefi ? "#8B1510" : "var(--color-border-tertiary, rgba(139, 21, 16,0.14))",
                    }}
                  >
                    <span
                      className="inline-block size-3.5 rounded-full bg-white transition-transform"
                      style={{
                        transform: pendingIncludeInMefi ? "translateX(17px)" : "translateX(3px)",
                      }}
                    />
                  </button>
                </>
              )}
            </div>
          )}

          {/* ZONA 3 — Evidence */}
          {pendingScore && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-1.5">
                <Paperclip className="size-3.5" style={{ color: "var(--color-text-tertiary)" }} />
                <span
                  className="text-[13px] font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Evidencia de soporte (opcional pero recomendada)
                </span>
              </div>

              {/* Evidence chips */}
              <div className="flex flex-wrap gap-2">
                {variable.chipsEvidencia.map((chip) => (
                  <EvidenceChip
                    key={chip}
                    label={chip}
                    active={pendingChips.includes(chip)}
                    onClick={() => handleToggleChip(chip)}
                  />
                ))}
              </div>

              {/* File upload area */}
              <div
                className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors hover:bg-muted/20 cursor-pointer"
                style={{ borderColor: "var(--color-border-tertiary)" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-5" style={{ color: "var(--color-text-tertiary)" }} />
                <span className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>
                  Arrastra archivos o haz clic para adjuntar
                </span>
                <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
                  PDF Â· Word Â· Excel Â· imagenes
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  multiple
                  onChange={handleFileSelect}
                />
              </div>

              {/* Attached files */}
              {pendingFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pendingFiles.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px]"
                      style={{
                        borderColor: "var(--color-border-secondary)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      <FileText className="size-3" />
                      {name}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveFile(name); }}
                        className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-muted cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Textarea (hidden if "No tenemos evidencia") */}
              {!hasNoEvidence && (
                <Textarea
                  placeholder="Describe brevemente la evidencia o contexto adicional... (opcional)"
                  value={pendingNotes}
                  onChange={(e) => setPendingNotes(e.target.value)}
                  className="min-h-[60px] resize-y text-[13px]"
                />
              )}
            </div>
          )}

          {/* ZONA 4 — Action bar */}
          <div className="flex items-center gap-3 pt-1">
            {/* Confirm / Update button */}
            <button
              type="button"
              disabled={!pendingScore}
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{
                backgroundColor: pendingScore ? "#8B1510" : "#8B1510",
              }}
            >
              <Check className="size-3.5" />
              {isConfirmed ? "Actualizar hallazgo" : "Confirmar hallazgo"}
            </button>

            {/* Consultar IA button */}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-[13px] font-medium transition-all duration-150 cursor-pointer"
              style={{
                borderColor: areaColor,
                color: areaColor,
              }}
              onClick={() => {
                toast.info("La asistencia de IA estara disponible proximamente.");
              }}
            >
              {/* Animated pulse dot */}
              <span className="relative flex size-2">
                <span
                  className="absolute inline-flex size-full animate-ping rounded-full opacity-75"
                  style={{ backgroundColor: areaColor }}
                />
                <span
                  className="relative inline-flex size-2 rounded-full"
                  style={{ backgroundColor: areaColor }}
                />
              </span>
              <Sparkles className="size-3.5" />
              Consultar IA
            </button>

            {/* Cancel button */}
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-[13px] font-medium transition-all duration-150 cursor-pointer"
              style={{
                borderColor: "var(--color-border-tertiary)",
                color: "var(--color-text-secondary)",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section group component
// ---------------------------------------------------------------------------

function SectionGroup({
  seccion,
  evaluations,
  expandedVariable,
  onToggleVariable,
  onCollapseVariable,
  onUpdateEvaluation,
  areaColor,
  startIndex,
  ratiosContext,
  ratiosByKey,
  ratioCycleId,
  ratioYear,
  onRatiosUpdated,
}: {
  seccion: AmofhitSeccion;
  evaluations: AreaEvaluations;
  expandedVariable: string | null;
  onToggleVariable: (id: string) => void;
  onCollapseVariable: () => void;
  onUpdateEvaluation: (variableId: string, eval_: Partial<VariableEvaluation>) => void;
  areaColor: string;
  startIndex: number;
  ratiosContext: RatiosContext | null;
  ratiosByKey: Map<string, RatioItem>;
  ratioCycleId: string;
  ratioYear: number;
  onRatiosUpdated: () => void;
}) {
  const evaluated = seccion.variables.filter((v) => evaluations[v.id]?.confirmed).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div
          className="flex size-6 items-center justify-center rounded-lg text-[10px] font-medium text-white"
          style={{ backgroundColor: areaColor }}
        >
          {seccion.id}
        </div>
        <h4 className="text-[14px] font-medium" style={{ color: "var(--color-text-primary)" }}>
          {seccion.nombre}
        </h4>
        <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
          {evaluated}/{seccion.variables.length} evaluadas
        </span>
      </div>
      <div className="space-y-2">
        {seccion.variables.map((v, vi) => (
          <VariableRow
            key={v.id}
            variable={v}
            index={startIndex + vi}
            evaluation={evaluations[v.id]}
            expanded={expandedVariable === v.id}
            onToggle={() => onToggleVariable(v.id)}
            onCollapse={onCollapseVariable}
            onUpdateEvaluation={(eval_) => onUpdateEvaluation(v.id, eval_)}
            areaColor={areaColor}
            ratiosContext={ratiosContext}
            ratiosByKey={ratiosByKey}
            ratioCycleId={ratioCycleId}
            ratioYear={ratioYear}
            onRatiosUpdated={onRatiosUpdated}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Area Evaluation Panel
// ---------------------------------------------------------------------------

function AreaEvaluationPanel({ areaKey }: { areaKey: string }) {
  const params = useParams();
  const cycleId = params.cycleId as string;
  const utils = trpc.useUtils();
  const areaData = AMOFHIT_EVALUATION_DATA[areaKey];
  const style = AREA_STYLES[areaKey];

  // Load persisted data
  const { data } = trpc.amofhit.getByArea.useQuery({ cycleId, area: areaKey });
  const upsertMutation = trpc.amofhit.upsert.useMutation({
    onSuccess: () => utils.amofhit.getByArea.invalidate({ cycleId, area: areaKey }),
    onError: (e) => toast.error(e.message),
  });

  // Cargar respaldo cuantitativo del catalogo para esta area (las 7 estan sembradas)
  const { data: ratiosSetup } = trpc.companyMetric.getAreaSetup.useQuery(
    { cycleId, area: areaKey },
  );

  const onRatiosUpdated = useCallback(() => {
    utils.companyMetric.getAreaSetup.invalidate({ cycleId, area: areaKey });
  }, [utils, cycleId, areaKey]);

  // Map de ratios por key (todos los del catalogo, con o sin valor cargado)
  const ratiosByKey = useMemo(() => {
    const map = new Map<string, RatioItem>();
    if (!ratiosSetup) return map;
    for (const it of ratiosSetup.items as RatioItem[]) {
      map.set(it.key, it);
    }
    return map;
  }, [ratiosSetup]);

  // Contexto de ratios YA cargados (con valor + sector) para sugerencia agregada
  const ratiosContext: RatiosContext | null = useMemo(() => {
    if (!ratiosSetup) return null;
    const map = new Map<string, RatioContextItem>();
    for (const it of ratiosSetup.items as RatioItem[]) {
      const sectorVal = it.sectorOverride ?? it.sectorBenchmark;
      if (it.companyValue === null || sectorVal === null || sectorVal === 0) continue;
      map.set(it.key, {
        name: it.name,
        unit: it.unit,
        value: it.companyValue,
        sector: sectorVal,
        higherIsBetter: it.higherIsBetter,
      });
    }
    return map;
  }, [ratiosSetup]);

  const ratioYear = ratiosSetup?.year ?? new Date().getFullYear() - 1;
  const ratioSector = ratiosSetup?.sector ?? "";

  // Calcular ratios "huerfanos" (en el catalogo pero sin pregunta cualitativa que los referencie)
  const orphanRatios = useMemo<RatioItem[]>(() => {
    if (!ratiosSetup || !areaData) return [];
    const linkedKeys = new Set<string>();
    for (const seccion of areaData.secciones) {
      for (const v of seccion.variables) {
        (v.linkedRatios || []).forEach((k) => linkedKeys.add(k));
      }
    }
    return (ratiosSetup.items as RatioItem[]).filter((it) => !linkedKeys.has(it.key));
  }, [ratiosSetup, areaData]);

  // Initialize evaluations from server data
  const [evaluations, setEvaluations] = useState<AreaEvaluations>({});
  const [expandedVariable, setExpandedVariable] = useState<string | null>(null);

  useEffect(() => {
    if (data?.findings && typeof data.findings === "object" && !Array.isArray(data.findings)) {
      // New format: findings is a map of variable evaluations
      setEvaluations(data.findings as AreaEvaluations);
    } else if (data?.findings && Array.isArray(data.findings)) {
      // Legacy format: array of {description, type, notes}
      // Don't overwrite if we already have evaluations
    }
  }, [data]);

  // Persist evaluations
  const persist = useCallback(
    (updated: AreaEvaluations) => {
      setEvaluations(updated);

      // Also build legacy findings array for backwards compat with MEFI import
      const legacyFindings = Object.values(updated)
        .filter((e) => e.confirmed)
        .map((e) => ({
          description: e.hallazgo,
          type: e.score >= 3 ? "fortaleza" : "debilidad",
          notes: e.evidenceNotes || undefined,
          score: e.score,
        }));

      // Calculate area score (average of all confirmed)
      const confirmed = Object.values(updated).filter((e) => e.confirmed);
      const avgScore = confirmed.length > 0
        ? confirmed.reduce((s, e) => s + e.score, 0) / confirmed.length
        : undefined;

      upsertMutation.mutate({
        cycleId,
        area: areaKey,
        findings: { ...updated, _legacy: legacyFindings },
        score: avgScore,
      });
    },
    [cycleId, areaKey, upsertMutation],
  );

  function handleUpdateEvaluation(variableId: string, eval_: Partial<VariableEvaluation>) {
    const updated = {
      ...evaluations,
      [variableId]: { ...evaluations[variableId], ...eval_ } as VariableEvaluation,
    };
    persist(updated);
  }

  function handleToggleVariable(id: string) {
    setExpandedVariable((prev) => (prev === id ? null : id));
  }

  function handleCollapseVariable() {
    setExpandedVariable(null);
  }

  if (!areaData) return null;

  // Progress calculation
  const totalVars = areaData.totalVariables;
  const confirmedCount = Object.values(evaluations).filter((e) => e.confirmed).length;
  const progressPct = totalVars > 0 ? Math.round((confirmedCount / totalVars) * 100) : 0;

  // Summary counts
  const fortalezas = Object.values(evaluations).filter((e) => e.confirmed && e.score >= 3).length;
  const debilidades = Object.values(evaluations).filter((e) => e.confirmed && e.score < 3).length;

  let runningIndex = 0;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
            Progreso de evaluacion
          </span>
          {progressPct === 100 ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "#1e7f4f" }}>
              <Check className="size-4" style={{ color: "#1e7f4f" }} />
              Area completada
            </span>
          ) : (
            <span className="text-[13px] font-medium" style={{ color: "var(--color-text-secondary)" }}>
              {confirmedCount}/{totalVars} variables ({progressPct}%)
            </span>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "var(--color-border-tertiary, rgba(139, 21, 16,0.14))" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              backgroundColor: progressPct === 100 ? "#1e7f4f" : "#8B1510",
            }}
          />
        </div>
        {/* Summary badges */}
        {confirmedCount > 0 && (
          <div className="flex items-center gap-3 pt-1">
            <span className="inline-flex items-center gap-1 text-[12px] font-medium"
              style={{ color: "#4d7c0f" }}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: "#4d7c0f" }} />
              {fortalezas} fortaleza{fortalezas !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1 text-[12px] font-medium"
              style={{ color: "#b3261e" }}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: "transparent" }} />
              {debilidades} debilidad{debilidades !== 1 ? "es" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Sections with variables */}
      {areaData.secciones.map((seccion) => {
        const startIdx = runningIndex;
        runningIndex += seccion.variables.length;
        return (
          <SectionGroup
            key={seccion.id}
            seccion={seccion}
            evaluations={evaluations}
            expandedVariable={expandedVariable}
            onToggleVariable={handleToggleVariable}
            onCollapseVariable={handleCollapseVariable}
            onUpdateEvaluation={handleUpdateEvaluation}
            areaColor={areaData.color}
            startIndex={startIdx}
            ratiosContext={ratiosContext}
            ratiosByKey={ratiosByKey}
            ratioCycleId={cycleId}
            ratioYear={ratioYear}
            onRatiosUpdated={onRatiosUpdated}
          />
        );
      })}

      {/* Otros indicadores (huerfanos del catalogo + personalizados) — todas las areas */}
      {ratiosSetup && (
        <OtrosIndicadoresSection
          orphans={orphanRatios}
          cycleId={cycleId}
          year={ratioYear}
          sector={ratioSector}
          onUpdated={onRatiosUpdated}
          areaCategory={areaKey}
        />
      )}

      {/* Area Findings Panel */}
      {confirmedCount >= 1 && (
        <AreaFindingsPanel evaluations={evaluations} areaColor={areaData.color} totalVars={totalVars} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Area Findings Panel — shows confirmed fortalezas/debilidades for the area
// ---------------------------------------------------------------------------

function AreaFindingsPanel({
  evaluations,
  areaColor,
  totalVars,
}: {
  evaluations: AreaEvaluations;
  areaColor: string;
  totalVars: number;
}) {
  const [open, setOpen] = useState(true);

  const confirmed = Object.entries(evaluations).filter(([, e]) => e.confirmed);
  const fortalezas = confirmed
    .filter(([, e]) => e.score >= 3)
    .sort((a, b) => b[1].score - a[1].score);
  const debilidades = confirmed
    .filter(([, e]) => e.score < 3)
    .sort((a, b) => a[1].score - b[1].score);

  return (
    <div className="rounded-xl border" style={{ borderColor: "var(--color-border-tertiary)" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 p-4 text-left cursor-pointer"
      >
        <Shield className="size-4" style={{ color: areaColor }} />
        <span className="flex-1 text-[14px] font-medium">Hallazgos del area</span>
        <span className="text-[12px]" style={{ color: "var(--color-text-tertiary)" }}>
          {fortalezas.length} fortaleza{fortalezas.length !== 1 ? "s" : ""} Â· {debilidades.length} debilidad{debilidades.length !== 1 ? "es" : ""} Â· {confirmed.length} evaluadas de {totalVars}
        </span>
        <ChevronDown
          className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--color-text-tertiary)" }}
        />
      </button>

      {open && (
        <div className="border-t px-4 pb-4 pt-3">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Fortalezas */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: "#4d7c0f" }} />
                <span className="text-[13px] font-medium" style={{ color: "#4d7c0f" }}>
                  Fortalezas ({fortalezas.length})
                </span>
              </div>
              {fortalezas.length === 0 ? (
                <p className="text-[12px] text-muted-foreground p-3 border border-dashed rounded-lg text-center">
                  Sin fortalezas confirmadas
                </p>
              ) : (
                fortalezas.map(([id, ev]) => {
                  const cfg = RATING_CONFIG[ev.score];
                  const hallazgoCorto = ev.hallazgo.split(" — ")[0].split(". ")[0] + ".";
                  const inMefi = ev.score === 4 || ev.includeInMefi;
                  const hasEvidence = ev.evidenceChips.length > 0 && !ev.evidenceChips.includes("No tenemos evidencia");
                  return (
                    <div key={id} className="flex items-start gap-2 rounded-lg p-2 text-[12px]"
                      style={{ backgroundColor: cfg.bg }}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-medium text-white"
                        style={{ backgroundColor: cfg.border }}
                      >
                        {ev.score}
                      </span>
                      <span className="flex-1 leading-snug" style={{ color: cfg.text }}>
                        {hallazgoCorto}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        {inMefi && <TrendingUp className="size-3" style={{ color: "#8B1510" }} />}
                        {hasEvidence && <Paperclip className="size-3" style={{ color: "var(--color-text-tertiary)" }} />}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Debilidades */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: "transparent" }} />
                <span className="text-[13px] font-medium" style={{ color: "#b3261e" }}>
                  Debilidades ({debilidades.length})
                </span>
              </div>
              {debilidades.length === 0 ? (
                <p className="text-[12px] text-muted-foreground p-3 border border-dashed rounded-lg text-center">
                  Sin debilidades confirmadas
                </p>
              ) : (
                debilidades.map(([id, ev]) => {
                  const cfg = RATING_CONFIG[ev.score];
                  const hallazgoCorto = ev.hallazgo.split(" — ")[0].split(". ")[0] + ".";
                  const inMefi = ev.score === 1 || ev.includeInMefi;
                  const hasEvidence = ev.evidenceChips.length > 0 && !ev.evidenceChips.includes("No tenemos evidencia");
                  return (
                    <div key={id} className="flex items-start gap-2 rounded-lg p-2 text-[12px]"
                      style={{ backgroundColor: cfg.bg }}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-medium text-white"
                        style={{ backgroundColor: cfg.border }}
                      >
                        {ev.score}
                      </span>
                      <span className="flex-1 leading-snug" style={{ color: cfg.text }}>
                        {hallazgoCorto}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        {inMefi && <TrendingUp className="size-3" style={{ color: "#8B1510" }} />}
                        {hasEvidence && <Paperclip className="size-3" style={{ color: "var(--color-text-tertiary)" }} />}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Area Card with reveal animation
// ---------------------------------------------------------------------------

function AreaCard({
  areaKey,
  index,
  isActive,
  onClick,
  evaluatedCount,
  totalCount,
}: {
  areaKey: string;
  index: number;
  isActive: boolean;
  onClick: () => void;
  evaluatedCount: number;
  totalCount: number;
}) {
  const { ref, visible } = useReveal();
  const Icon = AREA_ICONS[areaKey] ?? Building2;
  const style = AREA_STYLES[areaKey];
  const areaData = AMOFHIT_EVALUATION_DATA[areaKey];
  if (!style || !areaData) return null;

  const progressPct = totalCount > 0 ? Math.round((evaluatedCount / totalCount) * 100) : 0;

  return (
    <div
      ref={ref}
      className={`transform transition-all duration-500 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
      style={{ transitionDelay: `${index * 75}ms` }}
    >
      <button
        type="button"
        onClick={onClick}
        className={`group block w-full rounded-2xl border p-5 text-left shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${style.border} ${
          isActive
            ? "ring-2 ring-primary/30 ring-offset-2 bg-card shadow-md"
            : "bg-card"
        }`}
      >
        <div className="flex items-start justify-between">
          <div className={`inline-flex items-center justify-center rounded-xl ${style.bg} p-2.5`}>
            <Icon className={`size-5 ${style.color}`} />
          </div>
          <div className={`flex size-8 items-center justify-center rounded-lg ${style.badgeBg} text-xs font-medium text-white shadow-sm`}>
            {areaKey}
          </div>
        </div>
        <h3 className="mt-3 text-sm font-medium">{areaData.nombre}</h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{areaData.descripcion}</p>

        {/* Mini progress */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {evaluatedCount}/{totalCount} evaluadas
            </span>
            {progressPct === 100 && (
              <span className="text-[11px] font-medium text-green-700 dark:text-green-700">
                Completado
              </span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                backgroundColor: areaData.color,
              }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1 text-xs font-medium transition-colors group-hover:text-primary">
          {isActive ? (
            <><ChevronUp className="size-3.5" /> Cerrar</>
          ) : (
            <><ChevronDown className="size-3.5" /> Evaluar</>
          )}
        </div>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componentes auxiliares para ratios cuantitativos (RatioRow, SectorContext)
// ---------------------------------------------------------------------------


function SectorContext({
  sector,
  year,
  source,
}: {
  sector: string;
  year: number;
  source: string | null;
}) {
  if (!sector) {
    return (
      <div className="rounded-md border border-amber-500/30 bg-transparent p-3 text-xs">
        <AlertTriangle className="inline size-3.5 mr-1 text-amber-700" />
        No has definido el sector de tu empresa. Sin sector, no podemos
        precargar promedios de la industria. Configuralo en Ajustes &gt; Organizacion.
      </div>
    );
  }
  return (
    <div className="text-xs text-muted-foreground">
      Sector detectado:{" "}
      <span className="font-medium text-foreground capitalize">{sector}</span> Â·
      Promedios aÃ±o {year}
      {source && <span className="text-[10px]"> Â· {source}</span>}
    </div>
  );
}

function RatioRow({
  item,
  cycleId,
  year,
  onUpdated,
}: {
  item: RatioItem;
  cycleId: string;
  year: number;
  onUpdated: () => void;
}) {
  const [tuValor, setTuValor] = useState(
    item.companyValue !== null ? String(item.companyValue) : "",
  );
  const [sectorVal, setSectorVal] = useState(
    item.sectorOverride !== null
      ? String(item.sectorOverride)
      : item.sectorBenchmark !== null
      ? String(item.sectorBenchmark)
      : "",
  );

  const upsert = trpc.companyMetric.upsert.useMutation({ onSuccess: onUpdated });

  const tuValorNum = parseFloat(tuValor);
  const sectorValNum = parseFloat(sectorVal);
  const tieneTuValor = !isNaN(tuValorNum) && tuValor !== "";
  const tieneSectorVal = !isNaN(sectorValNum) && sectorVal !== "";

  // Delta % vs sector + calificacion automatica 1-4
  let deltaColor = "text-muted-foreground";
  let deltaLabel = "—";
  let autoScore: 1 | 2 | 3 | 4 | null = null;
  if (tieneTuValor && tieneSectorVal && sectorValNum !== 0) {
    const deltaPct = ((tuValorNum - sectorValNum) / Math.abs(sectorValNum)) * 100;
    const pctAbs = Math.abs(deltaPct);
    const supera = item.higherIsBetter ? deltaPct > 0 : deltaPct < 0;
    if (supera && pctAbs >= 3) {
      deltaColor = "text-emerald-700 dark:text-emerald-700";
    } else if (!supera && pctAbs >= 15) {
      deltaColor = "text-rose-700 dark:text-rose-700";
    } else {
      deltaColor = "text-amber-700 dark:text-amber-700";
    }
    deltaLabel = `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`;
    autoScore = rateRatio(deltaPct, item.higherIsBetter);
  }

  function persist() {
    const valueToSave = tieneTuValor ? tuValorNum : null;
    // Si el sector cambio respecto al benchmark precargado, lo guardamos como override
    const sectorOverride =
      tieneSectorVal &&
      item.sectorBenchmark !== null &&
      Math.abs(sectorValNum - item.sectorBenchmark) > 0.001
        ? sectorValNum
        : tieneSectorVal && item.sectorBenchmark === null
        ? sectorValNum
        : null;
    upsert.mutate({
      cycleId,
      ratioKey: item.key,
      year,
      value: valueToSave,
      sectorOverride,
    });
  }

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium leading-snug">{item.name}</div>
          {item.formula && (
            <div className="text-xs text-muted-foreground italic mt-1">
              {item.formula}
            </div>
          )}
        </div>
        <div
          className={`text-base font-semibold tabular-nums shrink-0 ${deltaColor}`}
          title={
            tieneTuValor && tieneSectorVal
              ? item.higherIsBetter ? "Mayor es mejor" : "Menor es mejor"
              : ""
          }
        >
          {deltaLabel}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">
            Tu empresa
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              value={tuValor}
              onChange={(e) => setTuValor(e.target.value)}
              onBlur={persist}
              className="w-full rounded-md border-2 border-input bg-muted/40 dark:bg-input/30 px-3 py-2 text-sm font-semibold text-foreground pr-14 transition-colors hover:bg-muted/60 hover:border-foreground/30 focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 focus:bg-background placeholder:text-muted-foreground placeholder:font-normal"
              placeholder="Ingresa tu valor"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none font-normal">
              {item.unit}
            </span>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">
            Sector{" "}
            <span className="text-[10px] text-muted-foreground font-normal">
              (editable)
            </span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              value={sectorVal}
              onChange={(e) => setSectorVal(e.target.value)}
              onBlur={persist}
              className="w-full rounded-md border-2 border-input bg-muted/40 dark:bg-input/30 px-3 py-2 text-sm font-semibold text-foreground pr-14 transition-colors hover:bg-muted/60 hover:border-foreground/30 focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 focus:bg-background placeholder:text-muted-foreground placeholder:font-normal"
              placeholder={item.sectorBenchmark === null ? "Sin referencia" : ""}
              title={
                item.sectorBenchmark !== null
                  ? `Promedio sectorial precargado: ${item.sectorBenchmark}. Edita si tienes datos mas recientes.`
                  : "Sin referencia sectorial. Ingresa tu propio valor."
              }
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none font-normal">
              {item.unit}
            </span>
          </div>
        </div>
      </div>

      {/* Calificacion automatica 1-4 segun delta vs sector */}
      <div className="mt-3 pt-3 border-t">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Calificacion automatica
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([1, 2, 3, 4] as const).map((s) => {
            const cfg = RATING_CONFIG[s];
            const active = autoScore === s;
            const desc = getRatioDescription(item.key, s, item.higherIsBetter);
            const baseTextColor = "var(--color-text-tertiary, #6b6b6b)";
            return (
              <div
                key={s}
                className="rounded-md border p-2.5 transition-all flex flex-col gap-1"
                style={{
                  borderColor: active ? cfg.border : "var(--color-border-tertiary, rgba(139, 21, 16,0.14))",
                  backgroundColor: active ? cfg.bg : "transparent",
                  borderWidth: active ? 2 : 1,
                  opacity: autoScore === null ? 0.55 : active ? 1 : 0.45,
                }}
              >
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-base font-semibold leading-none"
                    style={{ color: active ? cfg.text : baseTextColor }}
                  >
                    {s}
                  </span>
                  <span
                    className="text-[11px] font-medium uppercase tracking-wide"
                    style={{ color: active ? cfg.text : baseTextColor }}
                  >
                    {cfg.label}
                  </span>
                </div>
                <div
                  className="text-[12px] leading-snug"
                  style={{ color: active ? cfg.text : baseTextColor }}
                >
                  {desc}
                </div>
              </div>
            );
          })}
        </div>
        {autoScore === null && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Llena ambos campos para que el sistema marque automaticamente la calificacion.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Otros indicadores: huerfanos del catalogo + indicadores personalizados
// ---------------------------------------------------------------------------

function OtrosIndicadoresSection({
  orphans,
  cycleId,
  year,
  sector,
  onUpdated,
  areaCategory,
}: {
  orphans: RatioItem[];
  cycleId: string;
  year: number;
  sector: string;
  onUpdated: () => void;
  areaCategory: string;
}) {
  const customCategory = `Personalizado-${areaCategory}`;
  const [activated, setActivated] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customFormula, setCustomFormula] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [customBenchmark, setCustomBenchmark] = useState("");
  const utils = trpc.useUtils();

  const { data: customRatios = [] } = trpc.ratios.list.useQuery({ cycleId });
  const customsArea = (customRatios as Array<{ id: string; name: string; category: string; value: number; benchmark?: number | null; formula?: string | null }>).filter(
    (r) => r.category === customCategory,
  );

  const createCustom = trpc.ratios.create.useMutation({
    onSuccess: () => {
      utils.ratios.list.invalidate({ cycleId });
      setCustomName("");
      setCustomFormula("");
      setCustomValue("");
      setCustomBenchmark("");
      setShowAddForm(false);
      toast.success("Indicador agregado");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCustom = trpc.ratios.delete.useMutation({
    onSuccess: () => utils.ratios.list.invalidate({ cycleId }),
    onError: (e) => toast.error(e.message),
  });

  const visibleOrphans = orphans.filter(
    (it) => activated.has(it.key) || it.companyValue !== null,
  );
  const hiddenOrphans = orphans.filter(
    (it) => !activated.has(it.key) && it.companyValue === null,
  );

  function handleCreateCustom() {
    if (!customName.trim() || !customValue) return;
    const value = parseFloat(customValue);
    if (isNaN(value) || value < 0) {
      toast.error("Valor invalido");
      return;
    }
    const benchmark = customBenchmark ? parseFloat(customBenchmark) : undefined;
    createCustom.mutate({
      cycleId,
      category: customCategory,
      name: customName.trim(),
      formula: customFormula.trim() || undefined,
      value,
      benchmark: benchmark !== undefined && !isNaN(benchmark) ? benchmark : undefined,
      year,
    });
  }

  if (orphans.length === 0 && customsArea.length === 0 && !showAddForm) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddForm(true)}
        >
          <span className="text-base leading-none mr-1">+</span> Agregar indicador personalizado
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <DollarSign className="size-4 text-green-700 dark:text-green-700" />
        <h3 className="text-[14px] font-medium">Otros indicadores cuantitativos</h3>
        <span className="text-[11px] text-muted-foreground italic">
          opcional — no estan ligados a una pregunta especifica
        </span>
      </div>

      {/* Huerfanos del catalogo */}
      {orphans.length > 0 && (
        <div className="space-y-2">
          {visibleOrphans.length > 0 && (
            <div className="space-y-2">
              {visibleOrphans.map((item) => (
                <RatioRow
                  key={item.key}
                  item={item}
                  cycleId={cycleId}
                  year={year}
                  onUpdated={onUpdated}
                />
              ))}
            </div>
          )}
          {hiddenOrphans.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const next = new Set(activated);
                hiddenOrphans.forEach((o) => next.add(o.key));
                setActivated(next);
              }}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <span className="text-base leading-none">+</span> Activar{" "}
              {hiddenOrphans.length}{" "}
              {hiddenOrphans.length === 1 ? "indicador del catalogo" : "indicadores del catalogo"}{" "}
              (capital de trabajo, margen bruto, dias cobranza, etc.)
            </button>
          )}
        </div>
      )}

      {/* Personalizados (FinancialRatio category=Personalizado) */}
      {customsArea.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Indicadores personalizados
          </div>
          {customsArea.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border bg-background p-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{r.name}</div>
                {r.formula && (
                  <div className="text-xs text-muted-foreground italic">{r.formula}</div>
                )}
              </div>
              <div className="text-sm tabular-nums shrink-0">
                {r.value}
                {r.benchmark != null && (
                  <span className="text-muted-foreground ml-2">
                    vs {r.benchmark}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => deleteCustom.mutate({ id: r.id })}
                className="text-destructive hover:text-destructive/70"
                title="Eliminar"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Boton + form para agregar custom */}
      {!showAddForm ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddForm(true)}
        >
          <span className="text-base leading-none mr-1">+</span> Agregar indicador personalizado
        </Button>
      ) : (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Nuevo indicador personalizado
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Nombre *
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ej. Z-score Altman"
                className="w-full rounded-md border-2 border-input bg-muted/40 dark:bg-input/30 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 hover:border-foreground/30 focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 focus:bg-background placeholder:text-muted-foreground placeholder:font-normal"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Formula (opcional)
              </label>
              <input
                type="text"
                value={customFormula}
                onChange={(e) => setCustomFormula(e.target.value)}
                placeholder="Ej. 1.2 x WC/AT + 1.4 x ..."
                className="w-full rounded-md border-2 border-input bg-muted/40 dark:bg-input/30 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 hover:border-foreground/30 focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 focus:bg-background placeholder:text-muted-foreground placeholder:font-normal"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Tu valor *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                className="w-full rounded-md border-2 border-input bg-muted/40 dark:bg-input/30 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 hover:border-foreground/30 focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 focus:bg-background placeholder:text-muted-foreground placeholder:font-normal"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Sector (opcional)
              </label>
              <input
                type="number"
                step="any"
                value={customBenchmark}
                onChange={(e) => setCustomBenchmark(e.target.value)}
                className="w-full rounded-md border-2 border-input bg-muted/40 dark:bg-input/30 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 hover:border-foreground/30 focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 focus:bg-background placeholder:text-muted-foreground placeholder:font-normal"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreateCustom}
              disabled={!customName.trim() || !customValue || createCustom.isPending}
            >
              Guardar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAddForm(false);
                setCustomName("");
                setCustomFormula("");
                setCustomValue("");
                setCustomBenchmark("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {sector && (
        <div className="text-[11px] text-muted-foreground italic pt-1">
          Estos datos alimentan MEFI, PEYEA y BSC.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AmofhitPage() {
  const params = useParams();
  const cycleId = params.cycleId as string;
  const [activeArea, setActiveArea] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load all area data to show progress on cards
  const { data: allAreas } = trpc.amofhit.list.useQuery({ cycleId });

  function getEvaluatedCount(areaKey: string): number {
    if (!allAreas) return 0;
    const areaRecord = allAreas.find((a: { area: string }) => a.area === areaKey);
    if (!areaRecord) return 0;
    try {
      const findings = JSON.parse(areaRecord.findings);
      if (typeof findings === "object" && !Array.isArray(findings)) {
        return Object.values(findings).filter(
          (e: unknown) => typeof e === "object" && e !== null && (e as VariableEvaluation).confirmed,
        ).length;
      }
    } catch {}
    return 0;
  }

  function handleAreaClick(key: string) {
    const next = activeArea === key ? null : key;
    setActiveArea(next);
    if (next) {
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      {/* Hero */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
            <Factory className="size-6 text-teal-700 dark:text-teal-700" />
          </div>
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Evaluación AMOFHIT</h1>
            <p className="text-sm text-muted-foreground">
              Evalua las 7 areas funcionales internas — metodologia D&apos;Alessio
            </p>
          </div>
        </div>
      </div>

      {/* Area cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AMOFHIT_AREAS.map((area, i) => {
          const areaData = AMOFHIT_EVALUATION_DATA[area.key];
          if (!areaData) return null;
          return (
            <AreaCard
              key={area.key}
              areaKey={area.key}
              index={i}
              isActive={activeArea === area.key}
              onClick={() => handleAreaClick(area.key)}
              evaluatedCount={getEvaluatedCount(area.key)}
              totalCount={areaData.totalVariables}
            />
          );
        })}
      </div>

      {/* Active area panel */}
      {activeArea && (
        <div ref={panelRef} className="space-y-6 scroll-mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {(() => {
            const areaData = AMOFHIT_EVALUATION_DATA[activeArea];
            const Icon = AREA_ICONS[activeArea] ?? Building2;
            const style = AREA_STYLES[activeArea];
            if (!areaData || !style) return null;
            return (
              <>
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-xl ${style.bg}`}>
                    <Icon className={`size-5 ${style.color}`} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-medium">{areaData.nombre}</h2>
                    <p className="text-xs text-muted-foreground">{areaData.descripcion}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActiveArea(null)}
                    className="text-muted-foreground"
                  >
                    <ChevronUp className="size-4" />
                    Cerrar
                  </Button>
                </div>

                <div
                  className="h-px w-full"
                  style={{
                    background: `linear-gradient(to right, ${areaData.color}99, transparent)`,
                  }}
                />

                <AreaEvaluationPanel areaKey={activeArea} />
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
