// Modo presentación: catálogo de láminas y configuración guardada en Presentation.config.
// Cada lámina automática se arma con los datos del ciclo; el usuario decide cuáles salen,
// en qué orden, con qué título y nota, y puede sumarles imágenes o agregar láminas libres.

export type SlideKind =
  | "portada"
  | "agenda"
  | "resumen"
  | "identidad"
  | "valores"
  | "entorno"
  | "porter"
  | "mefe"
  | "mefi"
  | "mpc"
  | "foda"
  | "foda_cruzado"
  | "peyea"
  | "ie"
  | "bcg"
  | "priorizacion"
  | "olp"
  | "hoja_ruta"
  | "bsc"
  | "proyectos"
  | "libre"
  | "cierre"
  | "seccion"
  | "anexo_mefe"
  | "anexo_mefi"
  | "anexo_estrategias"
  | "anexo_acciones";

export type SlideImage = { url: string; name?: string; caption?: string };

export type SlideConfig = {
  id: string; // la clave del catálogo (única), o "libre-<n>" para las libres
  kind: SlideKind;
  include: boolean;
  title?: string; // vacío = título automático
  note?: string; // mensaje clave que se muestra en la lámina
  source?: string; // pie de fuente (vacío = automático)
  text?: string; // solo láminas libres: cuerpo
  images?: SlideImage[];
};

/** Formato de vista: Full HD usa el navegador lateral completo; HD (720p) lo compacta a íconos. */
export type ViewFormat = "fhd" | "hd";

export type ClosingMode = "decisiones" | "proximos_pasos" | "vision" | "personalizado";

export type PresentationConfig = {
  slides: SlideConfig[];
  cover: {
    title?: string;
    subtitle?: string;
    presenter?: string;
    dateLabel?: string;
    logoUrl?: string;
    backgroundUrl?: string;
  };
  closing: {
    mode: ClosingMode;
    title?: string;
    text?: string; // personalizado: una idea por línea
    decisions?: string[]; // decisiones que se piden (si está vacío se proponen solas)
  };
  showSlideNumbers: boolean;
  format: ViewFormat;
};

export const SLIDE_CATALOG: { id?: string; kind: Exclude<SlideKind, "libre">; label: string; group: string; defaultTitle: string; hint: string; include?: boolean }[] = [
  { kind: "portada", label: "Portada", group: "Apertura", defaultTitle: "", hint: "Se arma con la organización, el ciclo y quien presenta." },
  { kind: "agenda", label: "Agenda", group: "Apertura", defaultTitle: "Qué vamos a ver", hint: "Lista las secciones que incluiste, en orden." },
  { kind: "resumen", label: "Resumen ejecutivo", group: "Apertura", defaultTitle: "En una lámina", hint: "Las cifras clave de todo el plan." },
  { id: "sec-identidad", kind: "seccion", label: "Separador · Identidad", group: "Separadores", defaultTitle: "Quiénes somos", hint: "Abre la sección de identidad.", include: false },
  { kind: "identidad", label: "Misión y visión", group: "M1 · Identidad", defaultTitle: "Quiénes somos y a dónde vamos", hint: "Misión y visión vigentes." },
  { kind: "valores", label: "Valores", group: "M1 · Identidad", defaultTitle: "Nuestros valores", hint: "Valores con su conducta esperada." },
  { id: "sec-diagnostico", kind: "seccion", label: "Separador · Diagnóstico", group: "Separadores", defaultTitle: "Dónde estamos", hint: "Abre la sección de diagnóstico." },
  { kind: "entorno", label: "Entorno (PESTEC)", group: "M2 · Diagnóstico", defaultTitle: "Lo que pasa afuera", hint: "Factores del entorno con más impacto." },
  { kind: "porter", label: "Cinco fuerzas de Porter", group: "M2 · Diagnóstico", defaultTitle: "La presión del sector", hint: "Intensidad de cada fuerza." },
  { kind: "mefe", label: "MEFE", group: "M2 · Diagnóstico", defaultTitle: "Cómo respondemos al entorno", hint: "Oportunidades y amenazas ponderadas." },
  { kind: "mefi", label: "MEFI", group: "M2 · Diagnóstico", defaultTitle: "Nuestras fortalezas y debilidades", hint: "Factores internos ponderados." },
  { kind: "mpc", label: "Perfil competitivo (MPC)", group: "M2 · Diagnóstico", defaultTitle: "Frente a la competencia", hint: "Puntaje por competidor y factor." },
  { kind: "foda", label: "FODA", group: "M2 · Diagnóstico", defaultTitle: "FODA", hint: "Los cuatro cuadrantes." },
  { id: "sec-estrategia", kind: "seccion", label: "Separador · Estrategia", group: "Separadores", defaultTitle: "Qué vamos a hacer", hint: "Abre la sección de estrategia." },
  { kind: "foda_cruzado", label: "FODA cruzado", group: "M3 · Formulación", defaultTitle: "Estrategias que salen del FODA", hint: "Estrategias FO, FA, DO y DA." },
  { kind: "peyea", label: "PEYEA", group: "M3 · Formulación", defaultTitle: "Postura estratégica (PEYEA)", hint: "Vector y cuadrante." },
  { kind: "ie", label: "Matriz IE", group: "M3 · Formulación", defaultTitle: "Matriz interna-externa", hint: "Celda según MEFI y MEFE." },
  { kind: "bcg", label: "Matriz BCG", group: "M3 · Formulación", defaultTitle: "Portafolio de líneas (BCG)", hint: "Participación relativa y crecimiento." },
  { kind: "priorizacion", label: "Priorización (MCPE)", group: "M3 · Formulación", defaultTitle: "Qué hacemos primero", hint: "Ranking de estrategias por atractivo." },
  { kind: "olp", label: "Objetivos de largo plazo", group: "M3 · Formulación", defaultTitle: "Objetivos al cierre del plan", hint: "OLP con línea base y meta." },
  { id: "sec-ejecucion", kind: "seccion", label: "Separador · Ejecución", group: "Separadores", defaultTitle: "Cómo lo vamos a ejecutar", hint: "Abre la sección de ejecución y control." },
  { kind: "hoja_ruta", label: "Hoja de ruta", group: "M4 · Implementación", defaultTitle: "Hoja de ruta", hint: "Objetivos de corto plazo por año y sus acciones." },
  { kind: "bsc", label: "Balanced Scorecard", group: "M5 · Control", defaultTitle: "Cómo lo vamos a medir", hint: "Indicadores por perspectiva." },
  { kind: "proyectos", label: "Portafolio de proyectos", group: "M5 · Control", defaultTitle: "Proyectos priorizados", hint: "Proyectos por prioridad." },
  { kind: "cierre", label: "Cierre", group: "Cierre", defaultTitle: "", hint: "Decisiones, próximos pasos o la visión: elige cómo terminar." },
  { id: "sec-anexos", kind: "seccion", label: "Separador · Anexos", group: "Anexos", defaultTitle: "Anexos", hint: "Detalle para consulta después del cierre." },
  { kind: "anexo_mefe", label: "Anexo · MEFE completa", group: "Anexos", defaultTitle: "MEFE: todos los factores", hint: "Tabla completa con pesos y calificaciones." },
  { kind: "anexo_mefi", label: "Anexo · MEFI completa", group: "Anexos", defaultTitle: "MEFI: todos los factores", hint: "Tabla completa con pesos y calificaciones." },
  { kind: "anexo_estrategias", label: "Anexo · Estrategias", group: "Anexos", defaultTitle: "Estrategias: descripción completa", hint: "Cada estrategia con su origen y puntaje." },
  { kind: "anexo_acciones", label: "Anexo · Acciones", group: "Anexos", defaultTitle: "Acciones por objetivo de corto plazo", hint: "Todas las acciones del primer año." },
];

export const CLOSING_MODES: { mode: ClosingMode; label: string; hint: string }[] = [
  { mode: "decisiones", label: "Decisiones que pedimos", hint: "Termina con lo que se necesita aprobar hoy." },
  { mode: "proximos_pasos", label: "Próximos 90 días", hint: "Termina con las acciones inmediatas y sus responsables." },
  { mode: "vision", label: "Volver a la visión", hint: "Termina con la visión y las tres metas que la miden." },
  { mode: "personalizado", label: "Personalizado", hint: "Tu propio título y mensaje." },
];

export function defaultConfig(): PresentationConfig {
  return {
    slides: SLIDE_CATALOG.map((s) => ({ id: s.id ?? s.kind, kind: s.kind, include: s.include ?? !["porter", "bcg"].includes(s.kind) })),
    cover: {},
    closing: { mode: "decisiones" },
    showSlideNumbers: true,
    format: "fhd",
  };
}

/** Lee la config guardada y la completa con las láminas nuevas del catálogo (quedan apagadas). */
export function parseConfig(raw: string | null | undefined): PresentationConfig {
  const base = defaultConfig();
  let saved: Partial<PresentationConfig> = {};
  try {
    saved = raw ? (JSON.parse(raw) as Partial<PresentationConfig>) : {};
  } catch {
    saved = {};
  }
  const slides = Array.isArray(saved.slides) ? saved.slides.filter((s) => s && s.id && s.kind) : [];
  if (!slides.length) slides.push(...base.slides);
  // Láminas nuevas del catálogo: se insertan detrás de su vecina anterior, con su valor por defecto
  base.slides.forEach((s, k) => {
    if (slides.some((x) => x.id === s.id)) return;
    const prevId = k > 0 ? base.slides[k - 1].id : null;
    const at = prevId ? slides.findIndex((x) => x.id === prevId) + 1 : 0;
    slides.splice(at > 0 ? at : k === 0 ? 0 : slides.length, 0, s);
  });
  return {
    slides,
    cover: { ...base.cover, ...(saved.cover ?? {}) },
    closing: { ...base.closing, ...(saved.closing ?? {}) },
    showSlideNumbers: saved.showSlideNumbers ?? true,
    format: saved.format === "hd" ? "hd" : "fhd",
  };
}

export function catalogEntry(kind: SlideKind, id?: string) {
  return SLIDE_CATALOG.find((s) => (id && s.id ? s.id === id : s.kind === kind)) ?? SLIDE_CATALOG.find((s) => s.kind === kind);
}

/** Sección a la que pertenece cada lámina (para la agenda, el navegador y el encabezado). */
export const SECTION_OF: Partial<Record<SlideKind, string>> = {
  agenda: "Presentación", resumen: "Presentación", cierre: "Decisiones",
  identidad: "Identidad", valores: "Identidad",
  entorno: "Diagnóstico", porter: "Diagnóstico", mefe: "Diagnóstico", mefi: "Diagnóstico", mpc: "Diagnóstico", foda: "Diagnóstico",
  foda_cruzado: "Estrategia", peyea: "Estrategia", ie: "Estrategia", bcg: "Estrategia", priorizacion: "Estrategia", olp: "Estrategia",
  hoja_ruta: "Ejecución y control", bsc: "Ejecución y control", proyectos: "Ejecución y control",
  anexo_mefe: "Anexos", anexo_mefi: "Anexos", anexo_estrategias: "Anexos", anexo_acciones: "Anexos",
};

/**
 * Secciones del navegador lateral. Cada una tiene su tono (al estilo de los reportes
 * de Intercorp), dentro de la paleta de la marca: granate, carbón y tonos de apoyo
 * oscuros que se leen bien sobre blanco.
 */
export const SECTIONS: { name: string; short: string; color: string; icon: "presentacion" | "identidad" | "diagnostico" | "estrategia" | "ejecucion" | "decisiones" | "anexos" }[] = [
  { name: "Presentación", short: "Inicio", color: "#8B1510", icon: "presentacion" },
  { name: "Identidad", short: "Identidad", color: "#5E0D0B", icon: "identidad" },
  { name: "Diagnóstico", short: "Diagnóstico", color: "#1D4F91", icon: "diagnostico" },
  { name: "Estrategia", short: "Estrategia", color: "#1C6B44", icon: "estrategia" },
  { name: "Ejecución y control", short: "Ejecución", color: "#8A5A0E", icon: "ejecucion" },
  { name: "Decisiones", short: "Decisiones", color: "#2C2E35", icon: "decisiones" },
  { name: "Anexos", short: "Anexos", color: "#6B6461", icon: "anexos" },
];
export function sectionInfo(name: string | undefined) {
  return SECTIONS.find((s) => s.name === name);
}
