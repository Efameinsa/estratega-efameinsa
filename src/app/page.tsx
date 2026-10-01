import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Target,
  Layers,
  Lightbulb,
  Rocket,
  BarChart3,
  Compass,
  ShieldCheck,
  Workflow,
  Check,
} from "lucide-react";

export const metadata = {
  title: "Estratega — Plataforma integral de planeamiento estratégico",
  description:
    "Diseña, ejecuta y controla la estrategia de tu organización en una sola plataforma. Desde la visión hasta el tablero BSC.",
};

export default function LandingPage() {
  return (
    <div className="landing-shell dark">
      <DecorativeBackdrop />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <Stats />
        <Features />
        <Workflow_ />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}

function DecorativeBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[640px] bg-halo-top" />
      <div className="absolute inset-y-0 right-0 w-[60%] bg-halo-violet" />
      <div className="absolute inset-y-0 left-0 w-[55%] bg-halo-cyan opacity-70" />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.18]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {STARS.map(([cx, cy, r], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r * 0.15}
            fill="rgb(var(--landing-fg))"
            opacity={0.2 + (i % 4) * 0.12}
          />
        ))}
      </svg>
    </div>
  );
}

const STARS: Array<[number, number, number]> = [
  [8, 12, 1], [22, 25, 0.8], [37, 8, 1.2], [45, 40, 0.9],
  [62, 18, 1], [71, 32, 0.7], [85, 10, 1.1], [92, 45, 0.8],
  [14, 55, 0.9], [28, 72, 1], [48, 62, 0.7], [58, 80, 1.1],
  [73, 68, 0.9], [82, 78, 0.8], [95, 62, 1],
  [5, 35, 0.7], [18, 88, 0.9], [35, 92, 0.6], [65, 95, 0.8],
  [88, 92, 0.7], [12, 72, 0.6], [40, 20, 0.7], [55, 50, 0.8],
];

function Navbar() {
  return (
    <header className="glass-subtle sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo-isotipo-black.png" alt="" className="size-7 dark:hidden" />
          <img src="/logo-isotipo-white.png" alt="" className="hidden size-7 dark:block" />
          <span className="text-base font-semibold tracking-tight">Estratega</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <a
            href="#features"
            className="text-sm opacity-70 transition-opacity hover:opacity-100"
          >
            Módulos
          </a>
          <a
            href="#workflow"
            className="text-sm opacity-70 transition-opacity hover:opacity-100"
          >
            Cómo funciona
          </a>
          <a
            href="#cta"
            className="text-sm opacity-70 transition-opacity hover:opacity-100"
          >
            Empezar
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden h-9 items-center rounded-lg px-3 text-sm font-medium opacity-80 transition-all hover:bg-black/5 hover:opacity-100 sm:inline-flex dark:hover:bg-white/10"
          >
            Ingresar
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center rounded-lg bg-[rgb(var(--glow-blue))] px-4 text-sm font-medium text-white shadow-sm transition-all hover:brightness-110 hover:shadow-md"
          >
            Crear cuenta
            <ArrowRight className="ml-1.5 size-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative px-4 pb-24 pt-20 sm:pt-28">
      <div className="relative mx-auto max-w-5xl text-center">
        <div className="glass mb-7 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--glow-blue))]/20 px-3.5 py-1.5 text-xs font-medium">
          <Sparkles className="size-3.5 text-[rgb(var(--glow-blue))]" />
          <span>Plataforma integral para planeamiento estratégico</span>
        </div>

        <h1 className="text-5xl font-semibold leading-[0.95] tracking-tighter sm:text-6xl md:text-7xl">
          De la visión
          <br />
          <span className="text-shimmer-landing">a la ejecución.</span>
        </h1>

        <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed opacity-70 md:text-xl">
          Diseña, ejecuta y controla la estrategia de tu organización en una sola plataforma.
          Diagnóstico, formulación, implementación y control alineados módulo a módulo.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex h-12 items-center rounded-xl bg-[rgb(var(--glow-blue))] px-6 text-base font-medium text-white shadow-lg shadow-[rgb(var(--glow-blue))]/25 transition-all hover:brightness-110 hover:shadow-xl"
          >
            Crear cuenta gratis
            <ArrowRight className="ml-2 size-4" />
          </Link>
          <Link
            href="/login"
            className="glass inline-flex h-12 items-center rounded-xl px-6 text-base font-medium transition-all hover:bg-white/5"
          >
            Ingresar
          </Link>
        </div>

        <p className="mt-5 text-xs opacity-50">
          No necesitas tarjeta. Empieza con un ciclo estratégico en minutos.
        </p>
      </div>

      <div className="relative mx-auto mt-20 max-w-6xl px-4">
        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  const cards = [
    { code: "M1", label: "Identidad", icon: Compass, progress: 100 },
    { code: "M2", label: "Diagnóstico", icon: Lightbulb, progress: 82 },
    { code: "M3", label: "Formulación", icon: Layers, progress: 64 },
    { code: "M4", label: "Implementación", icon: Rocket, progress: 35 },
    { code: "M5", label: "Control BSC", icon: BarChart3, progress: 12 },
  ];
  return (
    <div className="glass-strong rounded-3xl p-3 sm:p-5">
      <div className="rounded-2xl bg-white/5 p-5 backdrop-blur-sm dark:bg-black/20">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-2.5 rounded-full bg-red-400/70" />
            <div className="size-2.5 rounded-full bg-amber-400/70" />
            <div className="size-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <span className="text-xs opacity-50">ciclo 2026-2030 · borrador</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {cards.map((c) => (
            <div
              key={c.code}
              className="glass rounded-xl p-4 text-left transition-transform hover:-translate-y-1"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[10px] font-medium opacity-50">
                  {c.code}
                </span>
                <c.icon className="size-4 opacity-70" />
              </div>
              <p className="text-sm font-medium leading-tight">{c.label}</p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-[rgb(var(--glow-blue))]"
                  style={{ width: `${c.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="glass rounded-xl p-4 text-left">
            <p className="text-xs opacity-60">OLPs definidos</p>
            <p className="mt-1 text-2xl font-semibold">7</p>
          </div>
          <div className="glass rounded-xl p-4 text-left">
            <p className="text-xs opacity-60">Estrategias retenidas</p>
            <p className="mt-1 text-2xl font-semibold">14</p>
          </div>
          <div className="glass rounded-xl p-4 text-left">
            <p className="text-xs opacity-60">OCPs en ejecución</p>
            <p className="mt-1 text-2xl font-semibold">28</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stats() {
  const stats = [
    { value: "5", label: "Módulos integrados" },
    { value: "+20", label: "Matrices estratégicas" },
    { value: "100%", label: "Trazabilidad" },
    { value: "BSC", label: "Tablero de control" },
  ];
  return (
    <section className="relative px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="glass-strong grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-black/5 sm:grid-cols-4 dark:bg-white/5">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-[rgb(var(--landing-bg))]/80 px-6 py-8 text-center"
            >
              <p className="text-3xl font-semibold tracking-tight md:text-4xl">
                {s.value}
              </p>
              <p className="mt-1 text-xs opacity-60 sm:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="relative px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[rgb(var(--glow-blue))]/80">
            Módulos
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Todo el ciclo estratégico, conectado.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base opacity-70 md:text-lg">
            Cada módulo hereda inputs del anterior y alimenta al siguiente. Sin perder
            trazabilidad entre la visión y la métrica trimestral.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={Compass}
            title="M1 · Identidad estratégica"
            description="Visión, misión, valores, intereses y principios cardinales del directorio."
            items={["Visión SMART", "Misión 9 elementos", "Código de ética"]}
          />
          <FeatureCard
            icon={Lightbulb}
            title="M2 · Diagnóstico"
            description="Análisis externo e interno completo con PESTEC, Porter, AMOFHIT, MEFE/MEFI."
            items={["PESTEC + MEFE", "Porter + MPC", "AMOFHIT + MEFI"]}
          />
          <FeatureCard
            icon={Layers}
            title="M3 · Formulación"
            description="Matrices BCG, IE, GE, PEYEA, FODA cruzado, MCPE, Rumelt y auditoría ética."
            items={["8 matrices", "FODA cruzado", "Rumelt + Ética"]}
            highlight
          />
          <FeatureCard
            icon={Rocket}
            title="M4 · Implementación"
            description="OCPs por área, políticas, estructura y recursos. Donde la estrategia se ejecuta."
            items={["OCP por área", "Políticas", "Estructura + 7M"]}
          />
          <FeatureCard
            icon={BarChart3}
            title="M5 · Control BSC"
            description="Tablero balanceado, KPIs, alertas y revisiones estratégicas continuas."
            items={["Tablero BSC", "KPIs y metas", "Revisión cíclica"]}
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Plan Estratégico Integral"
            description="PEI consolidado autogenerado listo para presentar al directorio."
            items={["Exportable", "Modo presentación", "Trazabilidad"]}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  items,
  highlight,
}: {
  icon: typeof Compass;
  title: string;
  description: string;
  items: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "glass relative overflow-hidden rounded-2xl p-6 text-left transition-all hover:-translate-y-1 hover:shadow-lg" +
        (highlight ? " ring-1 ring-[rgb(var(--glow-blue))]/30" : "")
      }
    >
      <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-[rgb(var(--glow-blue))]/10 text-[rgb(var(--glow-blue))]">
        <Icon className="size-5" />
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm opacity-70 leading-relaxed">{description}</p>
      <ul className="mt-4 space-y-1.5 text-xs opacity-80">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <Check className="size-3.5 shrink-0 text-emerald-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Workflow_() {
  const steps = [
    {
      n: "01",
      title: "Crea tu ciclo estratégico",
      description: "Define horizonte, organización y equipo. Listo en menos de un minuto.",
    },
    {
      n: "02",
      title: "Avanza módulo por módulo",
      description: "Cada paso hereda del anterior; alertas inteligentes evitan inconsistencias.",
    },
    {
      n: "03",
      title: "Aterriza en OCPs ejecutables",
      description: "OCPs por área con acciones trimestrales, indicadores y recursos asignados.",
    },
    {
      n: "04",
      title: "Mide y ajusta con BSC",
      description: "Tablero balanceado con KPIs reales que alimentan tu próximo ciclo.",
    },
  ];
  return (
    <section id="workflow" className="relative px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[rgb(var(--glow-blue))]/80">
            Cómo funciona
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Flujo guiado, sin perder rigor.
          </h2>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.n} className="glass rounded-2xl p-6 text-left">
              <div className="mb-4 inline-flex items-center gap-2">
                <span className="font-mono text-xs opacity-50">{step.n}</span>
                <div className="h-px w-8 bg-current opacity-20" />
              </div>
              <h3 className="text-base font-semibold leading-tight tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 text-sm opacity-70 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section id="cta" className="relative px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="glass-strong relative overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-16">
          <div className="absolute inset-0 bg-halo-top opacity-60" />
          <div className="relative">
            <div className="glass mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium">
              <Target className="size-3.5 text-[rgb(var(--glow-blue))]" />
              <span>Empieza tu primer ciclo hoy</span>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              Tu próximo plan estratégico
              <br />
              <span className="text-shimmer-landing">empieza aquí.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base opacity-70 md:text-lg">
              Únete a equipos directivos que diseñan, ejecutan y revisan su estrategia con
              trazabilidad de visión a métrica.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 items-center rounded-xl bg-[rgb(var(--glow-blue))] px-6 text-base font-medium text-white shadow-lg shadow-[rgb(var(--glow-blue))]/25 transition-all hover:brightness-110"
              >
                Crear cuenta gratis
                <ArrowRight className="ml-2 size-4" />
              </Link>
              <Link
                href="/login"
                className="glass inline-flex h-12 items-center rounded-xl px-6 text-base font-medium transition-all hover:bg-white/5"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-black/5 px-4 py-10 text-sm dark:border-white/5">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo-isotipo-black.png" alt="" className="size-6 dark:hidden" />
          <img src="/logo-isotipo-white.png" alt="" className="hidden size-6 dark:block" />
          <span className="font-semibold tracking-tight">Estratega</span>
          <span className="opacity-40">·</span>
          <span className="text-xs opacity-60">© {new Date().getFullYear()}</span>
        </div>
        <nav className="flex flex-wrap items-center gap-5 text-xs opacity-70">
          <a href="#features" className="hover:opacity-100">
            Módulos
          </a>
          <a href="#workflow" className="hover:opacity-100">
            Cómo funciona
          </a>
          <Link href="/login" className="hover:opacity-100">
            Ingresar
          </Link>
          <Link href="/register" className="hover:opacity-100">
            Crear cuenta
          </Link>
        </nav>
      </div>
    </footer>
  );
}
