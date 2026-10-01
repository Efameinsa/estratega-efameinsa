"use client";

// Láminas del modo presentación, pensadas para directorio:
// · un mensaje por lámina: el título dice la conclusión (sale de los datos; se puede reescribir)
// · pocas cosas y completas en el cuerpo; el detalle va a los anexos
// · una sola retícula: márgenes de 80 px, encabezado y pie siempre en el mismo lugar
// · la fuente de cada cifra al pie
// Se dibujan en un lienzo fijo de 1280 × 720 que el visor escala; por eso usan px y
// colores fijos (no siguen el tema oscuro de la app).
import { useLayoutEffect, useRef } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/router";
import { BookOpenText, Compass, FileText, Gavel, Landmark, Presentation, Rocket, ScanSearch, ChevronUp, ChevronDown } from "lucide-react";
import { catalogEntry, SECTIONS, sectionInfo, type PresentationConfig, type SlideConfig, type ViewFormat } from "@/lib/presentation";

export type PresentationData = inferRouterOutputs<AppRouter>["presentation"]["data"];
export const SLIDE_W = 1280;
export const SLIDE_H = 720;

// ─────────────────────────────────────────── Sistema visual
const MX = 64; // margen lateral del área de contenido
const HEAD_TOP = 34;
const BODY_TOP = 200; // el cuerpo empieza siempre aquí
const BODY_BOTTOM = 58; // espacio reservado al pie
/** Ancho del navegador lateral según el formato (en unidades del lienzo de 1280 × 720). */
export const NAV_W: Record<ViewFormat, number> = { fhd: 236, hd: 84 };
/** Esquina «Intercorp»: tres esquinas suaves y la inferior derecha muy redondeada. */
const CARD_R = "12px 12px 36px 12px";
const FONT = "var(--font-inter), Inter, 'Segoe UI', Arial, sans-serif";
const INK = "#1f1a18";
const MUTED = "#6b6461";
const LINE = "#e6e2de";
const SOFT = "#f6f4f2";
const GOOD = "#1c6b44";
const BAD = "#b42318";
const WARN = "#8a5a0e";
const BLUE = "#1d4f91";
const PERSPECTIVE: Record<string, { label: string; color: string }> = {
  FIN: { label: "Financiera", color: GOOD }, resultados_economicos: { label: "Financiera", color: GOOD },
  CLI: { label: "Clientes y mercado", color: BLUE }, posicion_mercado: { label: "Clientes y mercado", color: BLUE },
  INT: { label: "Procesos internos", color: WARN }, como_opera_empresa: { label: "Procesos internos", color: WARN },
  APR: { label: "Aprendizaje", color: "#6b3fa0" }, personas_cultura: { label: "Aprendizaje", color: "#6b3fa0" },
};
const VARIABLE: Record<string, string> = { politico: "Político", economico: "Económico", social: "Social", tecnologico: "Tecnológico", ecologico: "Ecológico", competitivo: "Competitivo" };
const FORCE_LABEL: Record<string, string> = { rivalidad: "Rivalidad entre competidores", entrantes: "Nuevos entrantes", sustitutos: "Productos sustitutos", compradores: "Poder de los compradores", proveedores: "Poder de los proveedores" };
const REGION_TEXT: Record<string, [string, string]> = {
  crecer: ["Crecer y construir", "Posición para invertir: penetración y desarrollo de mercado, desarrollo de producto e integración."],
  conservar: ["Conservar y mantener", "Posición intermedia: crecer de forma selectiva con penetración de mercado y desarrollo de producto."],
  cosechar: ["Cosechar o desinvertir", "Posición débil: proteger la caja, reducir lo que no rinde y concentrar recursos."],
};

const fmt = (n: number | null | undefined, d = 2) => (n == null ? "—" : n.toLocaleString("es-ES", { maximumFractionDigits: d }));
const fx = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const withUnit = (n: number | null | undefined, unit?: string | null) => {
  const u = (unit ?? "").trim();
  const cur = ["S/", "US$"].find((c) => u.startsWith(c));
  if (cur) return `${cur} ${fmt(n)}${u.slice(cur.length)}`;
  return `${fmt(n)}${u ? " " + u : ""}`;
};
const clamp = (lines: number): React.CSSProperties => ({ display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" });
/** Versión corta de un texto largo: la idea antes de «:» o del primer paréntesis. */
function short(text: string, max = 95) {
  const r = shortRaw(text, max);
  // Si el corte dejó un paréntesis abierto, se corta antes del paréntesis
  const open = r.split("(").length > r.split(")").length;
  return open ? r.slice(0, r.lastIndexOf(" (")).trim() || r : r;
}
function shortRaw(text: string, max: number) {
  const t = text.trim();
  if (t.length <= max) return t;
  for (const sep of [": ", " (", "; ", " — "]) {
    const i = t.indexOf(sep);
    if (i >= 12 && i <= max + 15) return t.slice(0, i);
  }
  for (const sep of [", ", " y ", " con ", " para ", " que "]) {
    const i = t.lastIndexOf(sep, max);
    if (i >= 20) return t.slice(0, i);
  }
  return t;
}
/** Primera letra en minúscula, salvo siglas y nombres propios (MEFE, Google). */
const lcFirst = (s: string) => (s.length > 1 && s[1] === s[1].toLowerCase() && !/^(Google|Meta|LinkedIn|YouTube|Serfac|Lima|LG)/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const joinEs = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);

export type AgendaItem = { section: string; topics: { label: string; n: number }[] };
type Ctx = { data: PresentationData; config: PresentationConfig; slide: SlideConfig; index: number; total: number; agenda: AgendaItem[]; section?: string; W?: number };
const widthOf = (ctx: Ctx) => ctx.W ?? SLIDE_W;
/** Color de la sección de la lámina (cada sección tiene su tono). */
const accentOf = (ctx: Ctx) => sectionInfo(ctx.section)?.color ?? ctx.data.org.color ?? "#8B1510";

// ─────────────────────────────────────────── Títulos que dicen la conclusión
function porterRows(d: PresentationData) {
  return Object.entries(d.porter?.forces ?? {}).map(([k, v]) => {
    const vals = Object.values(v.values ?? {});
    return { k, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 };
  });
}

function autoHeadline(ctx: Ctx): { title: string; sub?: string } {
  const d = ctx.data;
  const own = d.mpc.competitors.find((c) => c.own);
  const rivals = d.mpc.competitors.filter((c) => !c.own).sort((a, b) => b.total - a.total);
  const rival = rivals[0];
  switch (ctx.slide.kind) {
    case "resumen":
      return { title: own && rival && own.total >= rival.total ? "Lideramos el sector, pero dejamos pasar oportunidades que la competencia ya toma" : "El plan en una lámina" };
    case "identidad":
      return { title: d.vision?.horizon ? `Hacia dónde vamos al ${d.vision.horizon}` : "Quiénes somos y a dónde vamos" };
    case "valores":
      return { title: `${d.values.length} valores guían cómo trabajamos` };
    case "entorno": {
      const o = d.pestec.filter((p) => p.type === "O").length;
      return { title: `El entorno trae ${o} oportunidades y ${d.pestec.length - o} amenazas`, sub: "Los factores con más impacto en el negocio" };
    }
    case "porter": {
      const top = [...porterRows(d)].sort((a, b) => b.avg - a.avg)[0];
      return { title: top ? `La presión más fuerte del sector: ${(FORCE_LABEL[top.k] ?? top.k).toLowerCase()}` : "La presión del sector" };
    }
    case "mefe":
      return {
        title: d.mefe.ppt >= 2.5 ? `Respondemos bien al entorno: ${fx(d.mefe.ppt)} de 4` : `Respondemos al entorno por debajo del promedio: ${fx(d.mefe.ppt)} de 4`,
        sub: "Matriz de evaluación de factores externos (MEFE) · promedio 2,50",
      };
    case "mefi":
      return {
        title: d.mefi.ppt >= 2.5 ? `Nuestra fuerza interna supera el promedio: ${fx(d.mefi.ppt)} de 4` : `Nuestra fuerza interna está bajo el promedio: ${fx(d.mefi.ppt)} de 4`,
        sub: "Matriz de evaluación de factores internos (MEFI) · promedio 2,50",
      };
    case "mpc": {
      if (!own || !rival) return { title: "Frente a la competencia" };
      const lose = d.mpc.factors.filter((f) => (own.ratings[f.id] ?? 0) < Math.max(...rivals.map((r) => r.ratings[f.id] ?? 0))).map((f) => lcFirst(short(f.name, 40)));
      return {
        title: own.total >= rival.total ? `Somos los primeros: ${fx(own.total)} frente a ${fx(rival.total)} de ${rival.name}` : `${rival.name} nos supera: ${fx(rival.total)} frente a ${fx(own.total)}`,
        sub: lose.length ? `Nos ganan en ${joinEs(lose.slice(0, 3))}` : undefined,
      };
    }
    case "foda":
      return { title: `${d.foda.F.length} fortalezas y ${d.foda.D.length} debilidades frente a ${d.foda.O.length} oportunidades y ${d.foda.A.length} amenazas`, sub: "Los factores que más pesan en cada cuadrante" };
    case "foda_cruzado":
      return { title: `${d.crossStrategies.length} estrategias salen del cruce del FODA` };
    case "peyea": {
      if (!d.peyea) return { title: "Postura estratégica (PEYEA)" };
      const why: Record<string, string> = {
        agresivo: "estamos en posición de crecer y ganar participación",
        conservador: "crecer con cautela y cuidar la base",
        competitivo: "el sector es atractivo, pero hay que reforzar nuestra posición",
        defensivo: "hay que proteger la posición antes de crecer",
      };
      return { title: `Postura ${d.peyea.label.toLowerCase()}: ${why[d.peyea.quadrant ?? ""] ?? ""}` };
    }
    case "ie":
      return { title: d.ie ? `Celda ${d.ie.cell}: ${(REGION_TEXT[d.ie.region]?.[0] ?? d.ie.region).toLowerCase()}` : "Matriz interna-externa" };
    case "bcg": {
      const stars = d.bcg.products.filter((p) => p.quadrant === "Estrella").map((p) => lcFirst(p.name));
      return { title: stars.length ? `La apuesta es ${joinEs(stars)}` : "Portafolio de líneas de negocio", sub: d.bcg.note || undefined };
    }
    case "priorizacion": {
      const top = d.ranking.slice(0, 3).map((r) => r.code);
      return { title: top.length ? `Primero ${joinEs(top)}: las estrategias de mayor atractivo` : "Qué hacemos primero", sub: "Matriz cuantitativa de planeamiento estratégico (MCPE)" };
    }
    case "olp": {
      const main = d.olps[0];
      return {
        title: main ? `Al ${main.year ?? d.cycle.yearEnd}, ${lcFirst(main.metric ?? "el objetivo principal")} de ${withUnit(main.current, main.unit)} a ${withUnit(main.target, main.unit)}` : "Objetivos de largo plazo",
        sub: `${d.olps.length} objetivos de largo plazo, uno por cada frente del plan`,
      };
    }
    case "hoja_ruta": {
      const first = Math.min(...d.ocps.map((o) => o.year));
      return { title: `${d.ocps.filter((o) => o.year === first).length} metas para ${first} abren el camino`, sub: "Objetivos de corto plazo por año y metas al cierre del plan" };
    }
    case "bsc":
      return { title: `${d.kpis.length} indicadores para seguir el plan cada trimestre`, sub: "Balanced Scorecard · valor actual → meta" };
    case "proyectos": {
      const hi = d.projects.filter((p) => p.priority === "alta").length;
      return { title: `${hi} de ${d.projects.length} proyectos son de prioridad alta`, sub: "Portafolio generado desde los objetivos de corto plazo" };
    }
    default:
      return { title: catalogEntry(ctx.slide.kind, ctx.slide.id)?.defaultTitle ?? "Lámina" };
  }
}

function autoSource(ctx: Ctx): string {
  const map: Partial<Record<string, string>> = {
    resumen: `Matrices del ${ctx.data.cycle.name}`,
    entorno: "Análisis PESTEC del ciclo",
    porter: "Cinco fuerzas de Porter · intensidad de 1 a 5",
    mefe: "MEFE del ciclo · pesos de 0 a 1, calificación de 1 a 4",
    mefi: "MEFI del ciclo · pesos de 0 a 1, calificación de 1 a 4",
    mpc: "Matriz de perfil competitivo · calificación de 1 (débil) a 4 (fuerte)",
    foda: "FODA a partir de la MEFE y la MEFI",
    foda_cruzado: "FODA cruzado del ciclo",
    peyea: "Matriz PEYEA",
    ie: "Matriz IE a partir de los totales de MEFI y MEFE",
    bcg: "Matriz BCG · participación relativa y crecimiento del mercado",
    priorizacion: "MCPE · atractivo total ponderado",
    olp: "Objetivos de largo plazo del ciclo",
    hoja_ruta: "Objetivos de corto plazo del ciclo",
    bsc: "KPIs del ciclo · último dato registrado",
    proyectos: "Portafolio de proyectos del ciclo",
    anexo_mefe: "MEFE del ciclo", anexo_mefi: "MEFI del ciclo", anexo_estrategias: "Matriz de decisión y MCPE", anexo_acciones: "Objetivos de corto plazo y acciones del ciclo",
  };
  return map[ctx.slide.kind] ?? "";
}

// ─────────────────────────────────────────── Piezas comunes
function Frame({ ctx, children }: { ctx: Ctx; children: React.ReactNode }) {
  const accent = accentOf(ctx);
  const W = widthOf(ctx);
  const auto = autoHeadline(ctx);
  const title = ctx.slide.title?.trim() || auto.title;
  const sub = ctx.slide.note?.trim() || auto.sub;
  const topic = ctx.slide.kind === "libre" ? null : catalogEntry(ctx.slide.kind, ctx.slide.id)?.defaultTitle;
  const source = ctx.slide.source?.trim() || autoSource(ctx);
  const imgs = ctx.slide.kind === "libre" ? [] : ctx.slide.images ?? [];
  return (
    <div style={{ width: W, height: SLIDE_H, background: "#fff", color: INK, fontFamily: FONT, position: "relative", overflow: "hidden" }}>
      {/* Encabezado al estilo de los reportes de Intercorp: número y documento a la izquierda, sección a la derecha */}
      <div style={{ position: "absolute", left: MX, right: MX, top: HEAD_TOP, display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 7, borderBottom: `1.5px solid ${accent}` }}>
        <span style={{ fontSize: 13, color: MUTED }}>
          {ctx.config.showSlideNumbers ? <b style={{ color: accent }}>{ctx.index + 1} / </b> : null}
          {ctx.data.cycle.name}{topic ? ` · ${topic}` : ""}
        </span>
        <span style={{ fontSize: 15, fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: 0.6 }}>{ctx.section ?? ""}</span>
      </div>
      <div style={{ position: "absolute", left: MX, right: MX, top: HEAD_TOP + 44 }}>
        <div style={{ fontSize: 31, fontWeight: 800, lineHeight: 1.15, color: accent, letterSpacing: -0.4, ...clamp(2) }}>{title}</div>
        {sub ? <div style={{ fontSize: 17, color: MUTED, marginTop: 8, ...clamp(1) }}>{sub}</div> : null}
      </div>
      <div style={{ position: "absolute", left: MX, right: MX, top: BODY_TOP, bottom: BODY_BOTTOM, display: "flex", gap: 28 }}>
        <Fit>{children}</Fit>
        {imgs.length ? (
          <div style={{ width: W > 1100 ? 320 : 270, display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
            {imgs.slice(0, 3).map((im, i) => (
              <figure key={i} style={{ margin: 0, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt={im.caption ?? im.name ?? ""} style={{ width: "100%", flex: 1, minHeight: 0, objectFit: "cover", borderRadius: CARD_R }} />
                {im.caption ? <figcaption style={{ fontSize: 13, color: MUTED, marginTop: 6, ...clamp(1) }}>{im.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{ position: "absolute", left: MX, right: MX, bottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, fontSize: 12, color: MUTED }}>
        <span style={clamp(1)}>{source ? `Fuente: ${source}` : ""}</span>
        <span style={{ whiteSpace: "nowrap" }}>{ctx.data.org.name}</span>
      </div>
    </div>
  );
}

/**
 * Si el cuerpo de una lámina no entra, se achica de a poco hasta que entre, en vez de
 * cortar texto con «…». Se detiene en 0,74 para no volverse ilegible.
 */
function Fit({ children }: { children: React.ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    // Se escala con transform (no cambia las medidas de maquetación) y se agranda la caja en la
    // misma proporción, así las medidas que se comparan siempre están en el mismo sistema.
    const apply = (z: number) => {
      el.style.transform = z === 1 ? "" : `scale(${z})`;
      el.style.width = `${100 / z}%`;
      el.style.height = `${100 / z}%`;
    };
    const overflows = () => {
      if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) return true;
      for (const n of Array.from(el.querySelectorAll<HTMLElement>("*"))) {
        const cs = getComputedStyle(n);
        const clipped = cs.overflow !== "visible" || cs.getPropertyValue("-webkit-line-clamp") !== "none";
        if (clipped && n.scrollHeight > n.clientHeight + 1) return true;
      }
      return false;
    };
    let z = 1;
    apply(z);
    while (z > 0.74 && overflows()) {
      z = Math.round((z - 0.03) * 100) / 100;
      apply(z);
    }
  });
  return (
    <div style={{ flex: 1, minWidth: 0, height: "100%", position: "relative", overflow: "hidden" }}>
      <div ref={inner} style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}

function Stat({ label, value, sub, accent, big }: { label: string; value: string; sub?: string; accent?: string; big?: boolean }) {
  return (
    <div style={{ background: SOFT, borderRadius: CARD_R, padding: big ? "22px 24px" : "16px 20px" }}>
      <div style={{ fontSize: 13, color: MUTED, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: big ? 52 : 32, fontWeight: 700, marginTop: 4, color: accent ?? INK, letterSpacing: -0.5, lineHeight: 1.05 }}>{value}</div>
      {sub ? <div style={{ fontSize: 15, color: MUTED, marginTop: 6, lineHeight: 1.35, ...clamp(3) }}>{sub}</div> : null}
    </div>
  );
}

/** Barra de 1 a 4 con la marca del promedio 2,5. */
function Gauge({ value, accent }: { value: number; accent: string }) {
  const pct = ((Math.min(4, Math.max(1, value)) - 1) / 3) * 100;
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ position: "relative", height: 12, background: "#e9e5e1", borderRadius: 6 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: accent, borderRadius: 6 }} />
        <div style={{ position: "absolute", left: "50%", top: -5, width: 2, height: 22, background: INK }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: MUTED, marginTop: 6 }}><span>1</span><span>promedio 2,5</span><span>4</span></div>
    </div>
  );
}

function Code({ children, color }: { children: React.ReactNode; color: string }) {
  return <span style={{ display: "inline-block", minWidth: 38, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff", background: color, borderRadius: 4, padding: "2px 6px", marginRight: 12, flex: "none" }}>{children}</span>;
}

function Empty({ what }: { what: string }) {
  return <div style={{ height: "100%", display: "grid", placeItems: "center", color: MUTED, fontSize: 20, background: SOFT, borderRadius: 10 }}>Todavía no hay datos de {what} en este ciclo.</div>;
}

// ─────────────────────────────────────────── Portada, separadores y cierre
function Cover({ ctx }: { ctx: Ctx }) {
  const { data, config } = ctx;
  const accent = data.org.color || "#8B1510";
  const bg = config.cover.backgroundUrl;
  const logo = config.cover.logoUrl || data.org.logoUrl;
  const dateLabel = config.cover.dateLabel || new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
  const light = !bg;
  return (
    <div style={{ width: widthOf(ctx), height: SLIDE_H, position: "relative", overflow: "hidden", fontFamily: FONT, background: light ? "#fff" : "#111", color: light ? INK : "#fff" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {bg ? <img src={bg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null}
      {bg ? <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(12,10,10,.9) 0%, rgba(12,10,10,.7) 55%, rgba(12,10,10,.3) 100%)" }} /> : null}
      <div style={{ position: "absolute", left: 0, top: 0, width: 16, height: SLIDE_H, background: accent }} />
      <div style={{ position: "absolute", left: 104, top: 72 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo ? <img src={logo} alt={data.org.name} style={{ height: 54, maxWidth: 340, objectFit: "contain", background: light ? "transparent" : "rgba(255,255,255,.94)", padding: light ? 0 : 8, borderRadius: 6 }} /> : <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: light ? accent : "#fff" }}>{data.org.name}</div>}
      </div>
      <div style={{ position: "absolute", left: 104, right: 180, top: 262 }}>
        <div style={{ width: 64, height: 4, background: accent, marginBottom: 26 }} />
        <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.04, letterSpacing: -1.5 }}>{config.cover.title || data.cycle.name}</div>
        <div style={{ fontSize: 24, marginTop: 20, color: light ? MUTED : "#e8e3e0", maxWidth: 860, lineHeight: 1.35 }}>
          {config.cover.subtitle || `Diagnóstico, estrategias y hoja de ruta ${data.cycle.yearStart + 1}–${data.cycle.yearEnd}`}
        </div>
      </div>
      <div style={{ position: "absolute", left: 104, right: 104, bottom: 60, display: "flex", justifyContent: "space-between", fontSize: 17, color: light ? MUTED : "#e8e3e0" }}>
        <span>{config.cover.presenter || data.presenter || ""}</span>
        <span>{dateLabel}</span>
      </div>
    </div>
  );
}

const SECTION_ICON = { presentacion: Presentation, identidad: Landmark, diagnostico: ScanSearch, estrategia: Compass, ejecucion: Rocket, decisiones: Gavel, anexos: FileText } as const;
export function SectionIcon({ section, size, color }: { section?: string; size: number; color: string }) {
  const Icon = SECTION_ICON[sectionInfo(section)?.icon ?? "presentacion"] ?? BookOpenText;
  return <Icon size={size} color={color} strokeWidth={1.6} />;
}

// Portada de sección a todo color, con el ícono grande y el título al costado (como los reportes de Intercorp)
function Section({ ctx }: { ctx: Ctx }) {
  const accent = accentOf(ctx);
  const entry = catalogEntry(ctx.slide.kind, ctx.slide.id);
  const title = ctx.slide.title?.trim() || entry?.defaultTitle || "";
  const n = ctx.agenda.findIndex((a) => a.section === ctx.section);
  const topics = ctx.agenda[n]?.topics ?? [];
  return (
    <div style={{ width: widthOf(ctx), height: SLIDE_H, position: "relative", overflow: "hidden", fontFamily: FONT, background: accent, color: "#fff" }}>
      {/* Trazos diagonales muy tenues de fondo */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.07, backgroundImage: "repeating-linear-gradient(-18deg, #fff 0 2px, transparent 2px 46px)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 44, padding: "0 70px" }}>
        <SectionIcon section={ctx.section} size={150} color="#fff" />
        <div style={{ width: 2, alignSelf: "stretch", margin: "250px 0", background: "rgba(255,255,255,.75)" }} />
        <div style={{ maxWidth: 600 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", opacity: 0.85 }}>{n >= 0 ? `${String(n + 1).padStart(2, "0")} · ` : ""}{ctx.section}</div>
          <div style={{ fontSize: 56, fontWeight: 800, marginTop: 8, lineHeight: 1.02, letterSpacing: -1, textTransform: "uppercase" }}>{title}</div>
          {ctx.slide.note ? <div style={{ fontSize: 20, marginTop: 14, opacity: 0.92 }}>{ctx.slide.note}</div> : null}
        </div>
      </div>
      {topics.length ? (
        <div style={{ position: "absolute", left: 70, right: 70, bottom: 52, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 10px" }}>
          {topics.map((t) => <span key={t.label} style={{ fontSize: 15, padding: "5px 12px", borderRadius: 999, background: "rgba(255,255,255,.16)" }}>{t.label}</span>)}
        </div>
      ) : null}
    </div>
  );
}

function Closing({ ctx }: { ctx: Ctx }) {
  const { data, config } = ctx;
  const accent = data.org.color || "#8B1510";
  const mode = config.closing.mode;
  const firstYear = Math.min(...data.ocps.map((o) => o.year), 9999);
  let title = config.closing.title?.trim() || "";
  let items: { head: string; body?: string }[] = [];
  let lead: string | null = null;
  if (mode === "decisiones") {
    title ||= "Lo que pedimos decidir hoy";
    const custom = (config.closing.decisions ?? []).map((d) => d.trim()).filter(Boolean);
    items = custom.length
      ? custom.map((d) => ({ head: d }))
      : [
          { head: `Aprobar como prioridad ${joinEs(data.ranking.slice(0, 3).map((r) => r.code))}`, body: data.ranking.slice(0, 3).map((r) => `${r.code} ${lcFirst(short(r.text, 40))}`).join(" · ") },
          { head: "Validar los pesos y supuestos del diagnóstico", body: "Las matrices se recalculan solas si cambia una ponderación." },
          { head: "Nombrar a los responsables de los proyectos de prioridad alta", body: `${data.projects.filter((p) => p.priority === "alta").length} proyectos esperan dueño y fecha de arranque.` },
          { head: "Fijar la próxima revisión del plan", body: "Revisión trimestral con el tablero de indicadores." },
        ];
  } else if (mode === "proximos_pasos") {
    title ||= "Los próximos 90 días";
    const prio: Record<string, number> = { alta: 0, media: 1, baja: 2 };
    items = data.ocps
      .filter((o) => o.year === firstYear)
      .sort((a, b) => (prio[a.priority ?? "media"] ?? 1) - (prio[b.priority ?? "media"] ?? 1))
      .slice(0, 6)
      .map((o) => ({ head: o.text, body: [o.actions[0]?.text, o.area].filter(Boolean).join(" · ") }));
  } else if (mode === "vision") {
    title ||= `Hacia ${data.vision?.horizon ?? data.cycle.yearEnd}`;
    lead = data.vision?.text ?? null;
    items = data.olps.slice(0, 3).map((o) => ({ head: `${withUnit(o.current, o.unit)} → ${withUnit(o.target, o.unit)}`, body: o.metric ?? o.text }));
  } else {
    title ||= "Para cerrar";
    items = (config.closing.text ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => ({ head: l }));
  }
  items = items.slice(0, 6);
  const grid = items.length > 4;
  return (
    <div style={{ width: widthOf(ctx), height: SLIDE_H, background: INK, color: "#fff", position: "relative", overflow: "hidden", fontFamily: FONT }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 16, height: SLIDE_H, background: accent }} />
      <div style={{ position: "absolute", left: 104, right: 104, top: 76 }}>
        <div style={{ fontSize: 14, letterSpacing: 2, textTransform: "uppercase", color: "#f1d3cf", fontWeight: 700 }}>{data.cycle.name}</div>
        <div style={{ fontSize: 46, fontWeight: 700, marginTop: 12, letterSpacing: -1 }}>{title}</div>
        {lead ? <div style={{ fontSize: 24, lineHeight: 1.4, marginTop: 22, color: "#e8e3e0", maxWidth: 1000, ...clamp(4) }}>{lead}</div> : null}
      </div>
      <div style={{ position: "absolute", left: 104, right: 104, top: lead ? 400 : 250, bottom: 90, display: "grid", gridTemplateColumns: grid ? "1fr 1fr" : "1fr", gap: grid ? "34px 56px" : 26, alignContent: "start" }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            <div style={{ minWidth: 40, height: 40, borderRadius: 20, background: accent, display: "grid", placeItems: "center", fontSize: 18, fontWeight: 700 }}>{i + 1}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: grid ? 21 : 24, fontWeight: 600, lineHeight: 1.25 }}>{it.head}</div>
              {it.body ? <div style={{ fontSize: grid ? 15 : 17, color: "#c9c1bc", marginTop: 6, lineHeight: 1.4 }}>{it.body}</div> : null}
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 104, right: 104, bottom: 34, display: "flex", justifyContent: "space-between", fontSize: 14, color: "#a9a19c" }}>
        <span>{data.org.name}</span>
        <span>{config.cover.presenter || data.presenter || ""}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── Láminas de contenido
// Índice por secciones, en tarjetas con el color de cada una (como el índice de los reportes de Intercorp)
function Agenda({ ctx }: { ctx: Ctx }) {
  const items = ctx.agenda.filter((a) => a.section !== "Anexos" && a.section !== "Presentación");
  const cols = items.length > 4 ? 3 : 2;
  return (
    <Frame ctx={{ ...ctx, slide: { ...ctx.slide, title: ctx.slide.title || "Qué vamos a ver" } }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "22px 26px" }}>
        {items.map((a, i) => {
          const color = sectionInfo(a.section)?.color ?? INK;
          return (
            <div key={a.section} style={{ background: SOFT, borderRadius: CARD_R, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", paddingRight: 12 }}>
                <div style={{ width: 62, height: 62, background: color, display: "grid", placeItems: "center", borderRadius: "10px 0 10px 0", flex: "none" }}>
                  <SectionIcon section={a.section} size={30} color="#fff" />
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color, textTransform: "uppercase", lineHeight: 1.1 }}>
                  {String(a.topics[0]?.n ?? i + 1).padStart(2, "0")} / {a.section}
                </div>
              </div>
              <div style={{ padding: "12px 18px 18px 18px" }}>
                {a.topics.slice(0, 6).map((t) => (
                  <div key={t.label} style={{ display: "flex", gap: 10, fontSize: 15, padding: "4px 0" }}>
                    <b style={{ color, minWidth: 30 }}>{String(t.n).padStart(2, "0")} /</b>
                    <span >{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

function Resumen({ ctx }: { ctx: Ctx }) {
  const d = ctx.data;
  const accent = accentOf(ctx);
  const own = d.mpc.competitors.find((c) => c.own);
  const rival = [...d.mpc.competitors].filter((c) => !c.own).sort((a, b) => b.total - a.total)[0];
  const top = d.ranking.slice(0, 3);
  const mainOlp = d.olps[0];
  const messages = [
    own && rival ? (own.total >= rival.total ? `Somos los primeros frente a la competencia: ${fx(own.total)} contra ${fx(rival.total)} de ${rival.name}.` : `${rival.name} nos supera frente a la competencia: ${fx(rival.total)} contra ${fx(own.total)}.`) : null,
    `${d.mefe.ppt < 2.5 ? "Aprovechamos el entorno a medias" : "Aprovechamos bien el entorno"} (MEFE ${fx(d.mefe.ppt)}) con una base interna ${d.mefi.ppt >= 2.5 ? "sólida" : "por reforzar"} (MEFI ${fx(d.mefi.ppt)}).`,
    mainOlp ? `La meta: ${lcFirst(mainOlp.metric ?? "objetivo principal")} de ${withUnit(mainOlp.current, mainOlp.unit)} a ${withUnit(mainOlp.target, mainOlp.unit)} al ${mainOlp.year ?? d.cycle.yearEnd}.` : null,
    top.length ? `Para lograrlo priorizamos ${joinEs(top.map((r) => `${r.code} (${lcFirst(short(r.text, 44))})`))}.` : null,
  ].filter(Boolean) as string[];
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 48, height: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: accent, minWidth: 24, lineHeight: 1.4 }}>{i + 1}</span>
              <span style={{ fontSize: 19, lineHeight: 1.45 }}>{m}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignContent: "start" }}>
          <Stat label="Perfil competitivo" value={fx(own?.total)} sub={rival ? `${rival.name}: ${fx(rival.total)}` : undefined} accent={accent} />
          <Stat label="Postura" value={d.peyea?.label ?? "—"} sub={d.ie ? `Matriz IE: celda ${d.ie.cell}` : undefined} />
          <Stat label="MEFE" value={fx(d.mefe.ppt)} sub="Respuesta al entorno" />
          <Stat label="MEFI" value={fx(d.mefi.ppt)} sub="Fuerza interna" />
        </div>
      </div>
    </Frame>
  );
}

function Identidad({ ctx }: { ctx: Ctx }) {
  const d = ctx.data;
  const accent = accentOf(ctx);
  const block = (label: string, text: string | null | undefined) => (
    <div style={{ flex: 1, borderTop: `3px solid ${accent}`, paddingTop: 20 }}>
      <div style={{ fontSize: 14, letterSpacing: 1.6, textTransform: "uppercase", color: accent, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, lineHeight: 1.5, marginTop: 14 }}>{text ?? "Sin definir"}</div>
    </div>
  );
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "flex", gap: 56, height: "100%" }}>
        {block("Misión", d.mission)}
        {block(d.vision?.horizon ? `Visión ${d.vision.horizon}` : "Visión", d.vision?.text)}
      </div>
    </Frame>
  );
}

function Valores({ ctx }: { ctx: Ctx }) {
  const v = ctx.data.values;
  if (!v.length) return <Frame ctx={ctx}><Empty what="valores" /></Frame>;
  const accent = accentOf(ctx);
  const cols = v.length === 4 ? 2 : Math.min(v.length, 3);
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "30px 40px" }}>
        {v.slice(0, 6).map((x, i) => (
          <div key={i} style={{ borderTop: `3px solid ${accent}`, paddingTop: 14 }}>
            <div style={{ fontSize: 21, fontWeight: 700 }}>{x.name}</div>
            <div style={{ fontSize: 17, lineHeight: 1.45, marginTop: 8 }}>{x.description}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function Entorno({ ctx }: { ctx: Ctx }) {
  const rows = ctx.data.pestec.slice(0, 6);
  if (!rows.length) return <Frame ctx={ctx}><Empty what="PESTEC" /></Frame>;
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "repeat(3, 1fr)", gap: "18px 40px", height: "100%" }}>
        {rows.map((p, i) => (
          <div key={i} style={{ borderLeft: `4px solid ${p.type === "O" ? GOOD : BAD}`, paddingLeft: 16, overflow: "hidden" }}>
            <div style={{ fontSize: 12, color: p.type === "O" ? GOOD : BAD, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700 }}>{p.type === "O" ? "Oportunidad" : "Amenaza"} · {VARIABLE[p.variable] ?? p.variable}</div>
            <div style={{ fontSize: 16.5, lineHeight: 1.4, marginTop: 6 }}>{p.hallazgo ?? p.name}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function Porter({ ctx }: { ctx: Ctx }) {
  if (!ctx.data.porter) return <Frame ctx={ctx}><Empty what="Porter" /></Frame>;
  const rows = porterRows(ctx.data);
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 8, maxWidth: 1000 }}>
        {rows.map((r) => (
          <div key={r.k} style={{ display: "grid", gridTemplateColumns: "320px 1fr 56px", alignItems: "center", gap: 20, fontSize: 19 }}>
            <span>{FORCE_LABEL[r.k] ?? r.k}</span>
            <div style={{ height: 18, background: SOFT, borderRadius: 9 }}><div style={{ width: `${(r.avg / 5) * 100}%`, height: "100%", borderRadius: 9, background: r.avg >= 3.5 ? BAD : r.avg >= 2.5 ? WARN : GOOD }} /></div>
            <b style={{ textAlign: "right" }}>{fmt(r.avg, 1)}</b>
          </div>
        ))}
      </div>
    </Frame>
  );
}

type Factor = PresentationData["mefe"]["factors"][number];
function FactorList({ title, color, rows }: { title: string; color: string; rows: Factor[] }) {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 1.2, paddingBottom: 8, borderBottom: `2px solid ${color}` }}>{title}</div>
      {rows.map((r) => (
        <div key={r.code} style={{ display: "flex", alignItems: "flex-start", padding: "12px 0", borderBottom: `1px solid ${LINE}` }}>
          <Code color={color}>{r.code}</Code>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 16.5, lineHeight: 1.35 }}>{short(r.description, 85)}</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 3 }}>peso {fx(r.weight)} · calificación {r.rating}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
function FactorSummary({ ctx, kind }: { ctx: Ctx; kind: "mefe" | "mefi" }) {
  const m = ctx.data[kind];
  if (!m.factors.length) return <Frame ctx={ctx}><Empty what={kind.toUpperCase()} /></Frame>;
  const accent = accentOf(ctx);
  const byScore = (a: Factor, b: Factor) => (b.score ?? 0) - (a.score ?? 0);
  const byWeight = (a: Factor, b: Factor) => b.weight - a.weight;
  const [left, right] =
    kind === "mefe"
      ? [
          { title: "Lo que aprovechamos", color: GOOD, rows: m.factors.filter((f) => f.rating >= 3).sort(byScore).slice(0, 4) },
          { title: "Lo que dejamos pasar", color: BAD, rows: m.factors.filter((f) => f.rating <= 2).sort(byWeight).slice(0, 4) },
        ]
      : [
          { title: "Fortalezas que más pesan", color: GOOD, rows: m.factors.filter((f) => f.type === "F").sort(byScore).slice(0, 4) },
          { title: "Debilidades que más pesan", color: BAD, rows: m.factors.filter((f) => f.type === "D").sort(byWeight).slice(0, 4) },
        ];
  const counts =
    kind === "mefe"
      ? `${m.factors.filter((f) => f.type === "O").length} oportunidades y ${m.factors.filter((f) => f.type === "A").length} amenazas`
      : `${m.factors.filter((f) => f.type === "F").length} fortalezas y ${m.factors.filter((f) => f.type === "D").length} debilidades`;
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 1fr", gap: 36, height: "100%" }}>
        <div>
          <Stat label="Total ponderado" value={fx(m.ppt)} sub={`${counts}. El detalle completo va en el anexo.`} accent={accent} big />
          <Gauge value={m.ppt} accent={accent} />
        </div>
        <FactorList {...left} />
        <FactorList {...right} />
      </div>
    </Frame>
  );
}

function Mpc({ ctx }: { ctx: Ctx }) {
  const { factors, competitors } = ctx.data.mpc;
  if (!factors.length) return <Frame ctx={ctx}><Empty what="la MPC" /></Frame>;
  const accent = accentOf(ctx);
  const cols = competitors.slice(0, 6);
  const colW = widthOf(ctx) > 1100 ? 96 : 82;
  const grid = `1fr 54px ${cols.map(() => `${colW}px`).join(" ")}`;
  const best = Math.max(...cols.map((c) => c.total));
  const rowH = Math.min(40, Math.floor(360 / factors.length));
  return (
    <Frame ctx={ctx}>
      <div style={{ fontSize: 15 }}>
        <div style={{ display: "grid", gridTemplateColumns: grid, gap: 6, alignItems: "end", fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: 0.6, paddingBottom: 6, borderBottom: `2px solid ${INK}` }}>
          <span>Factor clave</span><span style={{ textAlign: "right" }}>Peso</span>
          {cols.map((c) => <span key={c.name} style={{ textAlign: "center", color: c.own ? accent : MUTED, fontWeight: c.own ? 700 : 500, lineHeight: 1.2 }}>{c.name}</span>)}
        </div>
        {factors.map((f) => (
          <div key={f.id} style={{ display: "grid", gridTemplateColumns: grid, gap: 6, minHeight: rowH, padding: "3px 0", borderBottom: `1px solid ${LINE}`, alignItems: "center" }}>
            <FactorName name={f.name} />
            <span style={{ textAlign: "right", color: MUTED }}>{fx(f.weight)}</span>
            {cols.map((c) => {
              const r = c.ratings[f.id] ?? 0;
              return <span key={c.name} style={{ textAlign: "center", fontWeight: 600, fontSize: 15, color: r >= 4 ? GOOD : r <= 1 ? BAD : INK, background: c.own ? "#f7ecea" : "transparent", alignSelf: "stretch", display: "grid", placeItems: "center" }}>{r || "—"}</span>;
            })}
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: grid, gap: 6, paddingTop: 10, fontSize: 18, fontWeight: 700, alignItems: "center" }}>
          <span>Total ponderado</span><span />
          {cols.map((c) => <span key={c.name} style={{ textAlign: "center", color: c.total === best ? "#fff" : INK, background: c.total === best ? accent : SOFT, borderRadius: 6, padding: "4px 0" }}>{fx(c.total)}</span>)}
        </div>
      </div>
    </Frame>
  );
}

function FactorName({ name }: { name: string }) {
  const i = name.indexOf(" (");
  const main = i > 0 ? name.slice(0, i) : name;
  const detail = i > 0 ? name.slice(i + 2).replace(/\)$/, "") : "";
  return (
    <span style={{ lineHeight: 1.2 }}>
      <span style={{ fontSize: 14.5, fontWeight: 600 }}>{main}</span>
      {detail ? <span style={{ display: "block", fontSize: 12, color: MUTED, marginTop: 1 }}>{detail}</span> : null}
    </span>
  );
}

function Foda({ ctx }: { ctx: Ctx }) {
  const f = ctx.data.foda;
  const top = (rows: Factor[]) => [...rows].sort((a, b) => b.weight - a.weight).slice(0, 4);
  const box = (label: string, color: string, rows: Factor[]) => (
    <div style={{ borderTop: `3px solid ${color}`, paddingTop: 10, minHeight: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 18, fontWeight: 700, color }}>{label}</span>
        {rows.length > 4 ? <span style={{ fontSize: 12, color: MUTED }}>4 de {rows.length} · el resto en el anexo</span> : null}
      </div>
      {top(rows).map((r) => (
        <div key={r.code} style={{ display: "flex", alignItems: "baseline", fontSize: 16, marginTop: 9, lineHeight: 1.3 }}>
          <b style={{ minWidth: 38, color, fontSize: 14 }}>{r.code}</b><span >{short(r.description, 70)}</span>
        </div>
      ))}
    </div>
  );
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "22px 44px", height: "100%" }}>
        {box("Fortalezas", GOOD, f.F)}
        {box("Debilidades", BAD, f.D)}
        {box("Oportunidades", BLUE, f.O)}
        {box("Amenazas", WARN, f.A)}
      </div>
    </Frame>
  );
}

function FodaCruzado({ ctx }: { ctx: Ctx }) {
  const s = ctx.data.crossStrategies;
  if (!s.length) return <Frame ctx={ctx}><Empty what="FODA cruzado" /></Frame>;
  const Q: [string, string, string][] = [["FO", "Fortalezas para tomar oportunidades", GOOD], ["FA", "Fortalezas frente a amenazas", BLUE], ["DO", "Corregir debilidades con oportunidades", WARN], ["DA", "Defendernos donde somos débiles", BAD]];
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28, height: "100%" }}>
        {Q.map(([q, label, color]) => {
          const list = s.filter((x) => x.quadrant === q);
          return (
            <div key={q} style={{ borderTop: `3px solid ${color}`, paddingTop: 10, overflow: "hidden" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{q}</div>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>{label}</div>
              {list.map((x) => (
                <div key={x.code} style={{ display: "flex", alignItems: "baseline", marginBottom: list.length > 3 ? 12 : 16 }}>
                  <b style={{ minWidth: 38, fontSize: 14, color }}>{x.code}</b>
                  <span style={{ fontSize: list.length > 3 ? 15 : 16, lineHeight: 1.35 }}>{short(x.text, 80)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

function Peyea({ ctx }: { ctx: Ctx }) {
  const p = ctx.data.peyea;
  if (!p) return <Frame ctx={ctx}><Empty what="PEYEA" /></Frame>;
  const accent = accentOf(ctx);
  const S = 420, c = S / 2;
  const R = Math.max(2, Math.ceil(Math.max(Math.abs(p.x), Math.abs(p.y)) + 1));
  const k = c / R;
  const px = c + p.x * k, py = c - p.y * k;
  const Q: [string, number, number][] = [["Agresivo", c + c / 2, 30], ["Conservador", c - c / 2, 30], ["Defensivo", c - c / 2, S - 14], ["Competitivo", c + c / 2, S - 14]];
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "flex", gap: 56, alignItems: "center", height: "100%" }}>
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ flex: "none" }}>
          <rect x={c} y={0} width={c} height={c} fill="#eaf3ee" />
          <line x1={0} y1={c} x2={S} y2={c} stroke={INK} /><line x1={c} y1={0} x2={c} y2={S} stroke={INK} />
          {Array.from({ length: R * 2 - 1 }, (_, n) => n - R + 1).filter((n) => n !== 0).map((n) => <g key={n}><line x1={c + n * k} y1={c - 4} x2={c + n * k} y2={c + 4} stroke={MUTED} /><line x1={c - 4} y1={c - n * k} x2={c + 4} y2={c - n * k} stroke={MUTED} /></g>)}
          {Q.map(([t, x, y]) => <text key={t} x={x} y={y} textAnchor="middle" fontSize={16} fill={t.toLowerCase() === p.quadrant ? accent : MUTED} fontWeight={t.toLowerCase() === p.quadrant ? 700 : 400}>{t}</text>)}
          <text x={S - 4} y={c - 8} textAnchor="end" fontSize={12} fill={MUTED}>FI</text><text x={4} y={c - 8} fontSize={12} fill={MUTED}>VC</text>
          <text x={c + 6} y={14} fontSize={12} fill={MUTED}>FF</text><text x={c + 6} y={S - 4} fontSize={12} fill={MUTED}>EE</text>
          <line x1={c} y1={c} x2={px} y2={py} stroke={accent} strokeWidth={4} />
          <circle cx={px} cy={py} r={7} fill={accent} />
          <text x={px + 12} y={py - 12} fontSize={15} fontWeight={700} fill={accent}>({fmt(p.x)}; {fmt(p.y)})</text>
        </svg>
        <div style={{ flex: 1 }}>
          <Stat label="Cuadrante" value={p.label} sub={`Vector (${fmt(p.x)}; ${fmt(p.y)})`} accent={accent} big />
          <div style={{ fontSize: 16, color: MUTED, marginTop: 20, lineHeight: 1.6 }}>FF: fuerza financiera · VC: ventaja competitiva<br />EE: estabilidad del entorno · FI: fuerza de la industria</div>
        </div>
      </div>
    </Frame>
  );
}

function Ie({ ctx }: { ctx: Ctx }) {
  const ie = ctx.data.ie;
  if (!ie) return <Frame ctx={ctx}><Empty what="la matriz IE" /></Frame>;
  const accent = accentOf(ctx);
  const cells = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
  const region = (c: string) => (["I", "II", "IV"].includes(c) ? "#dcefe3" : ["III", "V", "VII"].includes(c) ? "#f4ead6" : "#f4dedb");
  const [label, text] = REGION_TEXT[ie.region] ?? [ie.region, ie.meaning];
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "flex", gap: 56, alignItems: "center", height: "100%" }}>
        <div style={{ flex: "none" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 124px)", gridTemplateRows: "repeat(3, 104px)", gap: 6 }}>
            {cells.map((c) => (
              <div key={c} style={{ background: c === ie.cell ? accent : region(c), color: c === ie.cell ? "#fff" : INK, borderRadius: 6, display: "grid", placeItems: "center", fontSize: c === ie.cell ? 32 : 20, fontWeight: 700 }}>{c}</div>
            ))}
          </div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 10 }}>Columnas: MEFI alto → bajo · filas: MEFE alto → bajo</div>
        </div>
        <div style={{ flex: 1 }}>
          <Stat label={`Celda ${ie.cell}`} value={label} sub={`MEFI ${fx(ie.mefi)} · MEFE ${fx(ie.mefe)}`} accent={accent} />
          <div style={{ fontSize: 19, marginTop: 20, lineHeight: 1.45 }}>{text}</div>
        </div>
      </div>
    </Frame>
  );
}

function Bcg({ ctx }: { ctx: Ctx }) {
  const b = ctx.data.bcg;
  if (!b.products.length) return <Frame ctx={ctx}><Empty what="la BCG" /></Frame>;
  const accent = accentOf(ctx);
  const W = 560, H = 400;
  const maxShare = Math.max(2, ...b.products.map((p) => p.share));
  const maxG = Math.max(20, ...b.products.map((p) => p.growth));
  const maxSales = Math.max(...b.products.map((p) => p.sales), 1);
  const x = (s: number) => W - (s / maxShare) * W;
  const y = (g: number) => H - (Math.max(0, g) / maxG) * H;
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "flex", gap: 40, height: "100%" }}>
        <svg width={W} height={H + 26} viewBox={`0 0 ${W} ${H + 26}`} style={{ flex: "none" }}>
          <rect x={0} y={0} width={W} height={H} fill={SOFT} />
          <line x1={x(1)} y1={0} x2={x(1)} y2={H} stroke={LINE} strokeWidth={2} /><line x1={0} y1={y(10)} x2={W} y2={y(10)} stroke={LINE} strokeWidth={2} />
          {([["Estrella", 12, 22], ["Interrogante", W - 104, 22], ["Vaca lechera", 12, H - 10], ["Perro", W - 52, H - 10]] as [string, number, number][]).map(([t, tx, ty]) => <text key={t} x={tx} y={ty} fontSize={14} fill={MUTED}>{t}</text>)}
          {b.products.map((p) => {
            const r = 14 + (p.sales / maxSales) * 32;
            return (
              <g key={p.name}>
                <circle cx={x(p.share)} cy={y(p.growth)} r={r} fill={accent} fillOpacity={0.78} />
                <text x={x(p.share)} y={y(p.growth) - r - 6} textAnchor="middle" fontSize={13} fontWeight={600} fill={INK}>{p.name}</text>
              </g>
            );
          })}
          <text x={W / 2} y={H + 20} textAnchor="middle" fontSize={12} fill={MUTED}>← mayor participación relativa · eje vertical: crecimiento del mercado (%)</text>
        </svg>
        <div style={{ flex: 1 }}>
          {b.products.map((p) => (
            <div key={p.name} style={{ padding: "12px 0", borderBottom: `1px solid ${LINE}` }}>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 14, color: MUTED, marginTop: 2 }}>{p.quadrant} · participación {fmt(p.share)} · crecimiento {fmt(p.growth, 1)} %</div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

const STATUS: Record<string, [string, string]> = { retenida: ["Retenida", GOOD], retenida_manual: ["Retenida", GOOD], retenida_final: ["Retenida", GOOD], reactivada: ["Reactivada", GOOD], contingencia: ["Contingencia", WARN] };
function Priorizacion({ ctx }: { ctx: Ctx }) {
  const r = ctx.data.ranking.slice(0, 10);
  if (!r.length) return <Frame ctx={ctx}><Empty what="la MCPE" /></Frame>;
  const accent = accentOf(ctx);
  const max = Math.max(...r.map((x) => x.score), 0.01);
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "flex", flexDirection: "column", gap: r.length > 8 ? 10 : 15 }}>
        {r.map((x, i) => {
          const [st, stColor] = STATUS[x.status] ?? [x.status, MUTED];
          return (
            <div key={x.code} style={{ display: "grid", gridTemplateColumns: "52px 1fr 240px 52px 110px", gap: 16, alignItems: "center" }}>
              <b style={{ fontSize: 17, color: i < 3 ? accent : INK }}>{x.code}</b>
              <span style={{ fontSize: 16, fontWeight: i < 3 ? 600 : 400 }}>{short(x.text, 95)}</span>
              <div style={{ height: 14, background: SOFT, borderRadius: 7 }}><div style={{ width: `${(x.score / max) * 100}%`, height: "100%", borderRadius: 7, background: i < 3 ? accent : "#a59c97" }} /></div>
              <span style={{ fontSize: 16, fontWeight: 700, textAlign: "right" }}>{fx(x.score)}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: stColor, textTransform: "uppercase", letterSpacing: 0.8 }}>{st}</span>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

function Olp({ ctx }: { ctx: Ctx }) {
  const o = ctx.data.olps;
  if (!o.length) return <Frame ctx={ctx}><Empty what="OLP" /></Frame>;
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gridTemplateRows: `repeat(${Math.min(8, o.length)}, 1fr)`, height: "100%" }}>
        {o.slice(0, 8).map((x) => {
          const p = PERSPECTIVE[x.perspective ?? ""] ?? { label: "", color: INK };
          return (
            <div key={x.code} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 20, borderBottom: `1px solid ${LINE}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, color: p.color, textTransform: "uppercase", letterSpacing: 1.1, fontWeight: 700, whiteSpace: "nowrap" }}>{p.label}{x.year ? ` · al ${x.year}` : ""}</div>
                <div style={{ fontSize: 17, fontWeight: 600, marginTop: 2, lineHeight: 1.25 }}>{x.metric ?? short(x.text, 60)}</div>
              </div>
              <div style={{ fontSize: 19, fontWeight: 700, color: p.color, whiteSpace: "nowrap" }}>{withUnit(x.current, x.unit)} <span style={{ color: MUTED, fontWeight: 400 }}>→</span> {withUnit(x.target, x.unit)}</div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

function HojaRuta({ ctx }: { ctx: Ctx }) {
  const years = [...new Set(ctx.data.ocps.map((o) => o.year))].sort();
  if (!years.length) return <Frame ctx={ctx}><Empty what="OCP" /></Frame>;
  const accent = accentOf(ctx);
  const cols = years.slice(0, 2).map((y) => ({ label: String(y), list: ctx.data.ocps.filter((o) => o.year === y) }));
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, 1fr) 0.75fr`, gap: 36, height: "100%" }}>
        {cols.map((c) => (
          <div key={c.label} style={{ minHeight: 0, overflow: "hidden" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: accent, paddingBottom: 6, borderBottom: `3px solid ${accent}` }}>{c.label}</div>
            {c.list.slice(0, 8).map((o) => (
              <div key={o.code} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "6px 0", borderBottom: `1px solid ${LINE}` }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: o.priority === "alta" ? accent : "#cfc7c2", flex: "none", transform: "translateY(-2px)" }} />
                <span style={{ fontSize: 14.5, lineHeight: 1.28 }}>{o.text}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{ background: SOFT, borderRadius: 10, padding: "12px 20px", minHeight: 0, overflow: "hidden" }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Al {ctx.data.cycle.yearEnd}</div>
          {ctx.data.olps.slice(0, 5).map((o) => (
            <div key={o.code} style={{ padding: "8px 0", borderBottom: `1px solid ${LINE}` }}>
              <div style={{ fontSize: 13, color: MUTED }}>{o.metric}</div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{withUnit(o.target, o.unit)}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", right: 0, top: -20, fontSize: 12, color: MUTED, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: accent, display: "inline-block" }} /> prioridad alta</div>
    </Frame>
  );
}

function Bsc({ ctx }: { ctx: Ctx }) {
  const k = ctx.data.kpis;
  if (!k.length) return <Frame ctx={ctx}><Empty what="KPIs" /></Frame>;
  const dims = ["resultados_economicos", "posicion_mercado", "como_opera_empresa", "personas_cultura"];
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "20px 48px", height: "100%" }}>
        {dims.map((d) => {
          const p = PERSPECTIVE[d];
          return (
            <div key={d} style={{ borderTop: `3px solid ${p.color}`, paddingTop: 10, overflow: "hidden" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: p.color, textTransform: "uppercase", letterSpacing: 1 }}>{p.label}</div>
              {k.filter((x) => x.dimension === d).slice(0, 3).map((x) => (
                <div key={x.code} style={{ padding: "12px 0", borderBottom: `1px solid ${LINE}` }}>
                  <div style={{ fontSize: 16, color: MUTED }}>{x.name}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, marginTop: 2, whiteSpace: "nowrap" }}><span style={{ color: MUTED, fontWeight: 500 }}>{["S/", "US$"].some((c) => (x.unit ?? "").startsWith(c)) ? withUnit(x.real, x.unit) : fmt(x.real)}</span> <span style={{ color: MUTED, fontWeight: 400 }}>→</span> <span style={{ color: p.color }}>{withUnit(x.finalMeta, x.unit)}</span>{x.finalPeriod ? <span style={{ fontSize: 13, color: MUTED, fontWeight: 400 }}>  al {x.finalPeriod.slice(0, 4)}</span> : null}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </Frame>
  );
}

function Proyectos({ ctx }: { ctx: Ctx }) {
  const p = ctx.data.projects;
  if (!p.length) return <Frame ctx={ctx}><Empty what="proyectos" /></Frame>;
  const accent = accentOf(ctx);
  const col = (label: string, color: string, rows: typeof p) => (
    <div style={{ minHeight: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 6, borderBottom: `3px solid ${color}` }}>
        <span style={{ fontSize: 18, fontWeight: 700, color }}>{label}</span><span style={{ fontSize: 13, color: MUTED }}>{rows.length} proyectos</span>
      </div>
      {rows.slice(0, 8).map((x) => (
        <div key={x.key} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "baseline", padding: "9px 0", borderBottom: `1px solid ${LINE}` }}>
          <span style={{ fontSize: 15.5, lineHeight: 1.3 }}>{x.name.replace(/^OCP[\d.]+\s*·?\s*/, "")}</span>
          <span style={{ fontSize: 13, color: MUTED, whiteSpace: "nowrap" }}>{x.year ?? ""} · {x.tasks} tareas</span>
        </div>
      ))}
    </div>
  );
  return (
    <Frame ctx={ctx}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, height: "100%" }}>
        {col("Prioridad alta", accent, p.filter((x) => x.priority === "alta"))}
        {col("Prioridad media y baja", MUTED, p.filter((x) => x.priority !== "alta"))}
      </div>
    </Frame>
  );
}

function Libre({ ctx }: { ctx: Ctx }) {
  const imgs = ctx.slide.images ?? [];
  const accent = accentOf(ctx);
  const lines = (ctx.slide.text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets = lines.length > 1 || lines.some((l) => l.startsWith("-"));
  const body = (
    <div style={{ fontSize: 21, lineHeight: 1.5 }}>
      {bullets
        ? lines.slice(0, 7).map((l, i) => <div key={i} style={{ display: "flex", gap: 14, marginBottom: 12 }}><span style={{ color: accent, fontWeight: 700 }}>—</span><span>{l.replace(/^-\s*/, "")}</span></div>)
        : <p style={{ margin: 0 }}>{lines[0] ?? ""}</p>}
    </div>
  );
  return (
    <Frame ctx={ctx}>
      {imgs.length ? (
        <div style={{ display: "grid", gridTemplateColumns: lines.length ? "1fr 1.25fr" : "1fr", gap: 36, height: "100%" }}>
          {lines.length ? body : null}
          <div style={{ display: "grid", gridTemplateColumns: imgs.length > 1 ? "1fr 1fr" : "1fr", gridAutoRows: "1fr", gap: 14, minHeight: 0 }}>
            {imgs.slice(0, 4).map((im, i) => (
              <figure key={i} style={{ margin: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt={im.caption ?? ""} style={{ width: "100%", flex: 1, minHeight: 0, objectFit: "cover", borderRadius: 8 }} />
                {im.caption ? <figcaption style={{ fontSize: 13, color: MUTED, marginTop: 6, ...clamp(1) }}>{im.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        </div>
      ) : body}
    </Frame>
  );
}

// ─────────────────────────────────────────── Anexos (detalle completo, letra menor)
function AnexoFactores({ ctx, kind }: { ctx: Ctx; kind: "mefe" | "mefi" }) {
  const m = ctx.data[kind];
  if (!m.factors.length) return <Frame ctx={ctx}><Empty what={kind.toUpperCase()} /></Frame>;
  const order: [string, string][] = kind === "mefe" ? [["O", "Oportunidades"], ["A", "Amenazas"]] : [["F", "Fortalezas"], ["D", "Debilidades"]];
  const grid = "40px 1fr 52px 44px 52px";
  return (
    <Frame ctx={{ ...ctx, slide: { ...ctx.slide, note: ctx.slide.note || `Total ponderado ${fx(m.ppt)} de 4` } }}>
      <div style={{ fontSize: 11.5 }}>
        <div style={{ display: "grid", gridTemplateColumns: grid, gap: 8, color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, paddingBottom: 3, borderBottom: `2px solid ${INK}` }}>
          <span /><span>Factor</span><span style={{ textAlign: "right" }}>Peso</span><span style={{ textAlign: "right" }}>Calif.</span><span style={{ textAlign: "right" }}>Pond.</span>
        </div>
        {order.map(([t, label]) => (
          <div key={t}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t === "O" || t === "F" ? GOOD : BAD, textTransform: "uppercase", letterSpacing: 1, padding: "5px 0 1px" }}>{label}</div>
            {m.factors.filter((r) => r.type === t).map((r) => (
              <div key={r.code} style={{ display: "grid", gridTemplateColumns: grid, gap: 8, padding: "1.5px 0", borderBottom: `1px solid ${LINE}`, lineHeight: 1.25 }}>
                <b>{r.code}</b><span>{r.description}</span>
                <span style={{ textAlign: "right" }}>{fx(r.weight)}</span><span style={{ textAlign: "right" }}>{r.rating}</span><span style={{ textAlign: "right" }}>{fx(r.score)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Frame>
  );
}

function AnexoEstrategias({ ctx }: { ctx: Ctx }) {
  const r = ctx.data.ranking;
  if (!r.length) return <Frame ctx={ctx}><Empty what="estrategias" /></Frame>;
  const origins = new Map(ctx.data.crossStrategies.map((s) => [s.code, `${s.quadrant} · ${s.origins.join(" + ")}`]));
  const grid = "44px 1fr 150px 56px 96px";
  return (
    <Frame ctx={ctx}>
      <div style={{ fontSize: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: grid, gap: 12, color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, paddingBottom: 3, borderBottom: `2px solid ${INK}` }}>
          <span /><span>Estrategia</span><span>Origen</span><span style={{ textAlign: "right" }}>MCPE</span><span>Estado</span>
        </div>
        {r.map((x) => (
          <div key={x.code} style={{ display: "grid", gridTemplateColumns: grid, gap: 12, padding: "3px 0", borderBottom: `1px solid ${LINE}`, lineHeight: 1.28 }}>
            <b>{x.code}</b><span>{x.text}</span><span style={{ color: MUTED }}>{origins.get(x.code) ?? ""}</span>
            <span style={{ textAlign: "right", fontWeight: 600 }}>{fx(x.score)}</span><span style={{ color: (STATUS[x.status] ?? [x.status, MUTED])[1] }}>{(STATUS[x.status] ?? [x.status])[0]}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function AnexoAcciones({ ctx }: { ctx: Ctx }) {
  const first = Math.min(...ctx.data.ocps.map((o) => o.year), 9999);
  const list = ctx.data.ocps.filter((o) => o.year === first);
  if (!list.length) return <Frame ctx={ctx}><Empty what="acciones" /></Frame>;
  return (
    <Frame ctx={{ ...ctx, slide: { ...ctx.slide, note: ctx.slide.note || `Objetivos de corto plazo de ${first} y sus acciones` } }}>
      <div style={{ columns: 2, columnGap: 44, fontSize: 12.5 }}>
        {list.map((o) => (
          <div key={o.code} style={{ breakInside: "avoid", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{o.text} <span style={{ color: MUTED, fontWeight: 400 }}>· {o.area ?? ""}</span></div>
            {o.actions.map((a, i) => <div key={i} style={{ paddingLeft: 12, lineHeight: 1.4 }}>– {a.text}</div>)}
          </div>
        ))}
      </div>
    </Frame>
  );
}

// ─────────────────────────────────────────── Despacho
export function Slide(ctx: Ctx) {
  switch (ctx.slide.kind) {
    case "portada": return <Cover ctx={ctx} />;
    case "cierre": return <Closing ctx={ctx} />;
    case "seccion": return <Section ctx={ctx} />;
    case "agenda": return <Agenda ctx={ctx} />;
    case "resumen": return <Resumen ctx={ctx} />;
    case "identidad": return <Identidad ctx={ctx} />;
    case "valores": return <Valores ctx={ctx} />;
    case "entorno": return <Entorno ctx={ctx} />;
    case "porter": return <Porter ctx={ctx} />;
    case "mefe": return <FactorSummary ctx={ctx} kind="mefe" />;
    case "mefi": return <FactorSummary ctx={ctx} kind="mefi" />;
    case "mpc": return <Mpc ctx={ctx} />;
    case "foda": return <Foda ctx={ctx} />;
    case "foda_cruzado": return <FodaCruzado ctx={ctx} />;
    case "peyea": return <Peyea ctx={ctx} />;
    case "ie": return <Ie ctx={ctx} />;
    case "bcg": return <Bcg ctx={ctx} />;
    case "priorizacion": return <Priorizacion ctx={ctx} />;
    case "olp": return <Olp ctx={ctx} />;
    case "hoja_ruta": return <HojaRuta ctx={ctx} />;
    case "bsc": return <Bsc ctx={ctx} />;
    case "proyectos": return <Proyectos ctx={ctx} />;
    case "libre": return <Libre ctx={ctx} />;
    case "anexo_mefe": return <AnexoFactores ctx={ctx} kind="mefe" />;
    case "anexo_mefi": return <AnexoFactores ctx={ctx} kind="mefi" />;
    case "anexo_estrategias": return <AnexoEstrategias ctx={ctx} />;
    case "anexo_acciones": return <AnexoAcciones ctx={ctx} />;
    default: return <Frame ctx={ctx}><Empty what="esta lámina" /></Frame>;
  }
}

/** Título, bajada y fuente automáticos de una lámina (para mostrarlos como guía en el editor). */
export function headlineFor(data: PresentationData, config: PresentationConfig, slide: SlideConfig) {
  const ctx: Ctx = { data, config, slide, index: 0, total: 0, agenda: [] };
  return { ...autoHeadline(ctx), source: autoSource(ctx) };
}

const SECTION_BY_ID: Record<string, string> = { "sec-identidad": "Identidad", "sec-diagnostico": "Diagnóstico", "sec-estrategia": "Estrategia", "sec-ejecucion": "Ejecución y control", "sec-anexos": "Anexos" };
const SECTION_OF_KIND: Record<string, string> = {
  agenda: "Presentación", resumen: "Presentación", identidad: "Identidad", valores: "Identidad",
  entorno: "Diagnóstico", porter: "Diagnóstico", mefe: "Diagnóstico", mefi: "Diagnóstico", mpc: "Diagnóstico", foda: "Diagnóstico",
  foda_cruzado: "Estrategia", peyea: "Estrategia", ie: "Estrategia", bcg: "Estrategia", priorizacion: "Estrategia", olp: "Estrategia",
  hoja_ruta: "Ejecución y control", bsc: "Ejecución y control", proyectos: "Ejecución y control", cierre: "Decisiones",
  anexo_mefe: "Anexos", anexo_mefi: "Anexos", anexo_estrategias: "Anexos", anexo_acciones: "Anexos",
};
const FULL_BLEED = new Set(["portada", "cierre"]);

/**
 * Láminas incluidas, en orden, con la sección de cada una (las libres heredan la de la
 * lámina anterior) y la agenda por secciones con el número de lámina de cada tema.
 */
export function visibleSlides(config: PresentationConfig) {
  const slides = config.slides.filter((s) => s.include);
  const sections: (string | undefined)[] = [];
  let last: string | undefined = "Presentación";
  for (const s of slides) {
    const own = s.kind === "portada" ? "Presentación" : s.kind === "seccion" ? SECTION_BY_ID[s.id] : SECTION_OF_KIND[s.kind];
    last = own ?? last;
    sections.push(last);
  }
  const agenda: AgendaItem[] = [];
  slides.forEach((s, i) => {
    const section = sections[i];
    if (!section || s.kind === "portada") return;
    let item = agenda.find((a) => a.section === section);
    if (!item) agenda.push((item = { section, topics: [] }));
    if (s.kind === "seccion" || s.kind === "agenda") return;
    const label = s.kind === "libre" ? s.title?.trim() || "Lámina libre" : s.kind === "cierre" ? "Lo que pedimos decidir" : catalogEntry(s.kind, s.id)?.label?.replace(/^Anexo · /, "") ?? "";
    if (label && !item.topics.some((t) => t.label === label)) item.topics.push({ label, n: i + 1 });
  });
  agenda.sort((a, b) => SECTIONS.findIndex((x) => x.name === a.section) - SECTIONS.findIndex((x) => x.name === b.section));
  return { slides, agenda, sections };
}

// ─────────────────────────────────────────── Navegador lateral (estilo reporte Intercorp)
function Navigator({ ctx, format, sectionsPresent, onGo }: { ctx: Ctx; format: ViewFormat; sectionsPresent: { name: string; first: number }[]; onGo?: (index: number) => void }) {
  const W = NAV_W[format];
  const compact = format === "hd";
  const logo = "/logo-efameinsa-blanco.png";
  const idx = sectionsPresent.findIndex((s) => s.name === ctx.section);
  const isIndex = ctx.slide.kind === "agenda";
  const arrow = (up: boolean) => {
    const target = sectionsPresent[idx + (up ? -1 : 1)];
    const Icon = up ? ChevronUp : ChevronDown;
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (target) onGo?.(target.first); }}
        disabled={!target}
        aria-label={up ? "Sección anterior" : "Sección siguiente"}
        style={{ position: "relative", width: 46, height: 46, borderRadius: 23, border: "4px solid #262830", background: "#1f2024", display: "grid", placeItems: "center", cursor: target ? "pointer" : "default", opacity: target ? 1 : 0.35, alignSelf: "center", padding: 0 }}
      >
        <Icon size={24} color="#fff" strokeWidth={3} />
      </button>
    );
  };
  return (
    <div style={{ width: W, height: SLIDE_H, background: "#16171a", position: "relative", overflow: "hidden", fontFamily: FONT, display: "flex", flexDirection: "column", padding: compact ? "22px 10px" : "26px 18px", gap: 12, boxSizing: "border-box", flex: "none" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(-14deg, rgba(255,255,255,.035) 0 3px, transparent 3px 40px)" }} />
      <div style={{ position: "relative", height: compact ? 40 : 52, display: "flex", alignItems: "center", justifyContent: compact ? "center" : "flex-start", marginBottom: 10 }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={ctx.data.org.name} style={{ maxHeight: compact ? 26 : 40, maxWidth: compact ? 64 : 196, objectFit: "contain", objectPosition: compact ? "center" : "left" }} />
        ) : (
          <span style={{ fontWeight: 800, color: "#fff", fontSize: compact ? 12 : 18 }}>{compact ? ctx.data.org.name.slice(0, 3).toUpperCase() : ctx.data.org.name}</span>
        )}
      </div>
      {arrow(true)}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 7, background: "#1f2024", borderRadius: compact ? 14 : 22, padding: compact ? 6 : 8, border: "1px solid #262830" }}>
        {sectionsPresent.map((s) => {
          const info = sectionInfo(s.name);
          const active = s.name === ctx.section || isIndex;
          return (
            <button
              key={s.name}
              type="button"
              onClick={(e) => { e.stopPropagation(); onGo?.(s.first); }}
              title={s.name}
              style={{ display: "flex", alignItems: "center", gap: compact ? 0 : 10, justifyContent: compact ? "center" : "flex-start", background: active ? info?.color ?? INK : "#262830", color: active ? "#fff" : "rgba(255,255,255,.72)", border: 0, borderRadius: compact ? 10 : 14, height: compact ? 50 : 54, padding: compact ? 0 : "0 12px", cursor: "pointer", textAlign: "left", fontFamily: FONT }}
            >
              <SectionIcon section={s.name} size={compact ? 24 : 22} color="#fff" />
              {compact ? null : <span style={{ width: 1, height: 26, background: "rgba(255,255,255,.6)" }} />}
              {compact ? null : <span style={{ fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", lineHeight: 1.15, letterSpacing: 0.2 }}>{s.name}</span>}
            </button>
          );
        })}
      </div>
      {arrow(false)}
      <div style={{ position: "relative", marginTop: "auto", textAlign: "center", fontSize: 12, color: "rgba(255,255,255,.55)" }}>{ctx.index + 1} / {ctx.total}</div>
    </div>
  );
}

type StageProps = { data: PresentationData; config: PresentationConfig; slides: SlideConfig[]; sections: (string | undefined)[]; agenda: AgendaItem[]; index: number; onGo?: (index: number) => void };

/**
 * El escenario completo de una lámina: navegador + contenido en 1280 × 720 unidades.
 * La portada y el cierre van a sangre (sin navegador). Lo usan el visor y la vista previa.
 */
export function Stage({ data, config, slides, sections, agenda, index, onGo }: StageProps) {
  const slide = slides[index];
  if (!slide) return null;
  const format = config.format ?? "fhd";
  const full = FULL_BLEED.has(slide.kind);
  const navW = full ? 0 : NAV_W[format];
  const ctx: Ctx = { data, config, slide, index, total: slides.length, agenda, section: sections[index], W: SLIDE_W - navW };
  const present: { name: string; first: number }[] = [];
  sections.forEach((s, i) => { if (s && !present.some((p) => p.name === s)) present.push({ name: s, first: i }); });
  present.sort((a, b) => SECTIONS.findIndex((x) => x.name === a.name) - SECTIONS.findIndex((x) => x.name === b.name));
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, display: "flex", background: "#fff", overflow: "hidden" }}>
      {full ? null : <Navigator ctx={ctx} format={format} sectionsPresent={present} onGo={onGo} />}
      <Slide {...ctx} />
    </div>
  );
}

/** Escenario escalado a un ancho dado (miniaturas y vista previa). */
export function ScaledStage({ width, ...props }: StageProps & { width: number }) {
  const scale = width / SLIDE_W;
  return (
    <div style={{ width, height: SLIDE_H * scale, overflow: "hidden", position: "relative" }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: SLIDE_W, height: SLIDE_H, position: "absolute", left: 0, top: 0 }}>
        <Stage {...props} />
      </div>
    </div>
  );
}
