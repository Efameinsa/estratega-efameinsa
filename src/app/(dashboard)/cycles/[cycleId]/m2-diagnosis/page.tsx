"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Globe,
  Shield,
  Trophy,
  BarChart3,
  Factory,
  TrendingUp,
  Grid3X3,
  Search,
  Building2,
  Layers,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Scroll-reveal hook
// ---------------------------------------------------------------------------

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

// ---------------------------------------------------------------------------
// Animated card
// ---------------------------------------------------------------------------

function DiagCard({
  icon: Icon,
  title,
  description,
  href,
  items,
  index = 0,
  accent = "primary",
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  href?: string;
  items?: Array<{ label: string; href?: string }>;
  index?: number;
  accent?: "primary" | "teal" | "purple" | "amber" | "rose";
}) {
  const { ref, visible } = useReveal();

  const accentMap = {
    primary: {
      bg: "bg-primary/10",
      text: "text-primary",
      border: "hover:border-primary/40",
      glow: "hover:shadow-primary/5",
    },
    teal: {
      bg: "bg-transparent0/10",
      text: "text-teal-600 dark:text-teal-400",
      border: "hover:border-teal-500/40",
      glow: "hover:shadow-teal-500/5",
    },
    purple: {
      bg: "bg-transparent0/10",
      text: "text-purple-600 dark:text-purple-400",
      border: "hover:border-purple-500/40",
      glow: "hover:shadow-purple-500/5",
    },
    amber: {
      bg: "bg-transparent0/10",
      text: "text-amber-600 dark:text-amber-400",
      border: "hover:border-amber-500/40",
      glow: "hover:shadow-amber-500/5",
    },
    rose: {
      bg: "bg-transparent0/10",
      text: "text-rose-600 dark:text-rose-400",
      border: "hover:border-rose-500/40",
      glow: "hover:shadow-rose-500/5",
    },
  };

  const a = accentMap[accent];

  const Wrapper = href ? Link : "div";
  const wrapperProps = href ? { href } : {};

  return (
    <div
      ref={ref}
      className={`transform transition-all duration-500 ease-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0"
      }`}
      style={{ transitionDelay: `${index * 75}ms` }}
    >
      <Wrapper
        {...(wrapperProps as any)}
        className={`group block h-full rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 ${a.border} ${a.glow} hover:shadow-lg hover:-translate-y-1`}
      >
        {/* Icon badge */}
        <div className={`mb-3 inline-flex items-center justify-center rounded-xl ${a.bg} p-2.5`}>
          <Icon className={`size-5 ${a.text}`} />
        </div>

        {/* Title */}
        <h3 className="mb-1 text-base font-semibold">
          {title}
          {href && (
            <ChevronRight className="ml-1 inline size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
          )}
        </h3>

        {/* Description */}
        {description && (
          <p className="mb-3 text-sm text-muted-foreground">{description}</p>
        )}

        {/* Items */}
        {items && items.length > 0 && (
          <ul className="space-y-1.5">
            {items.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <div className={`size-1.5 rounded-full ${a.bg.replace("/10", "/40")}`} />
                {item.href ? (
                  <Link
                    href={item.href}
                    className={`${a.text} hover:underline underline-offset-2`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">{item.label}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Wrapper>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header with animated line
// ---------------------------------------------------------------------------

function SectionHeader({
  number,
  title,
  subtitle,
  accent = "primary",
}: {
  number: string;
  title: string;
  subtitle?: string;
  accent?: "primary" | "teal" | "purple";
}) {
  const { ref, visible } = useReveal();

  const lineColor = {
    primary: "from-primary/60 to-transparent",
    teal: "from-teal-500/60 to-transparent",
    purple: "from-purple-500/60 to-transparent",
  }[accent];

  const numBg = {
    primary: "bg-primary text-white",
    teal: "bg-transparent0 text-white",
    purple: "bg-transparent0 text-white",
  }[accent];

  return (
    <div
      ref={ref}
      className={`transform transition-all duration-600 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${numBg} text-sm font-bold shadow-md`}>
          {number}
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      <div className={`mt-3 h-px w-full bg-gradient-to-r ${lineColor}`} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function M2DiagnosisPage() {
  const params = useParams();
  const cid = params.cycleId as string;
  const base = `/cycles/${cid}/m2-diagnosis`;

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-10">
      {/* Hero */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
            <Search className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">M2 — Diagnostico</h1>
            <p className="text-sm text-muted-foreground">
              Analisis del entorno externo, interno y consolidado
            </p>
          </div>
        </div>
      </div>

      {/* ===== ANALISIS EXTERNO ===== */}
      <section className="space-y-6">
        <SectionHeader
          number="E"
          title="Analisis Externo"
          subtitle="Evaluacion del macroentorno, microentorno y competencia"
          accent="primary"
        />

        {/* Macroentorno */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            1. Macroentorno
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <DiagCard
              icon={Globe}
              title="PESTE"
              description="Analisis del entorno politico, economico, social, tecnologico y ecologico"
              href={`${base}/pestec`}
              items={[
                { label: "Politico" },
                { label: "Economico" },
                { label: "Social" },
                { label: "Tecnologico" },
                { label: "Ecologico" },
              ]}
              index={0}
              accent="primary"
            />
          </div>
        </div>

        {/* Microentorno */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            2. Microentorno
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <DiagCard
              icon={Shield}
              title="5 Fuerzas de Porter"
              description="Evaluacion de la estructura competitiva de la industria"
              href={`${base}/porter`}
              items={[
                { label: "Rivalidad entre competidores" },
                { label: "Poder de negociacion de clientes" },
                { label: "Poder de negociacion de proveedores" },
                { label: "Amenaza de sustitutos" },
                { label: "Amenaza de nuevos entrantes" },
              ]}
              index={1}
              accent="teal"
            />
          </div>
        </div>

        {/* Competidores */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            3. Analisis de competidores
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DiagCard
              icon={Trophy}
              title="MPC"
              description="Matriz de Perfil Competitivo"
              href={`${base}/mpc`}
              index={2}
              accent="amber"
            />
            <DiagCard
              icon={TrendingUp}
              title="Analisis Competitivo"
              description="Evaluacion detallada de la competencia"
              href={`${base}/competitive-analysis`}
              index={3}
              accent="amber"
            />
            <DiagCard
              icon={BarChart3}
              title="Atractividad de la Industria"
              description="Factores de atraccion del sector"
              href={`${base}/industry-attractiveness`}
              index={4}
              accent="amber"
            />
          </div>
        </div>

        {/* Sintesis externa */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            4. Sintesis del entorno externo
          </h3>
          <DiagCard
            icon={BarChart3}
            title="MEFE"
            description="Matriz de Evaluacion de Factores Externos"
            href={`${base}/mefe`}
            items={[
              { label: "Oportunidades" },
              { label: "Amenazas" },
              { label: "Pesos y Calificaciones" },
            ]}
            index={5}
            accent="primary"
          />
        </div>
      </section>

      {/* ===== ANALISIS INTERNO ===== */}
      <section className="space-y-6">
        <SectionHeader
          number="I"
          title="Analisis Interno"
          subtitle="Evaluacion de las capacidades y recursos de la organizacion"
          accent="teal"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <DiagCard
            icon={Factory}
            title="AMOFHIT"
            description="Analisis de las 7 areas funcionales internas"
            href={`${base}/amofhit`}
            items={[
              { label: "Administracion y Gerencia" },
              { label: "Marketing y Ventas" },
              { label: "Operaciones y Logistica" },
              { label: "Finanzas y Contabilidad" },
              { label: "Recursos Humanos" },
              { label: "Sistemas de Informacion" },
              { label: "Tecnologia e I+D" },
            ]}
            index={0}
            accent="teal"
          />
          <DiagCard
            icon={TrendingUp}
            title="MEFI"
            description="Matriz de Evaluacion de Factores Internos"
            href={`${base}/mefi`}
            items={[
              { label: "Fortalezas" },
              { label: "Debilidades" },
              { label: "Pesos y Calificaciones" },
            ]}
            index={1}
            accent="teal"
          />
        </div>
      </section>

      {/* ===== CONSOLIDADO ===== */}
      <section className="space-y-6">
        <SectionHeader
          number="C"
          title="Consolidado"
          subtitle="Integracion del analisis externo e interno"
          accent="purple"
        />

        <DiagCard
          icon={Grid3X3}
          title="FODA"
          description="Matriz de Fortalezas, Oportunidades, Debilidades y Amenazas"
          href={`${base}/foda`}
          items={[
            { label: "Fortalezas" },
            { label: "Oportunidades" },
            { label: "Debilidades" },
            { label: "Amenazas" },
          ]}
          index={0}
          accent="purple"
        />
      </section>
    </div>
  );
}
