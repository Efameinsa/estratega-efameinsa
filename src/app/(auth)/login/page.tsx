"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail, TriangleAlert } from "lucide-react";

/**
 * EL LOGIN EN VIDRIO (29-09): el mismo del CRM de Efameinsa. Tarjeta
 * translúcida sobre el fondo carbón y granate (lo pone el layout de (auth)),
 * el logo en blanco, campos con ícono y un botón granate con brillo.
 *
 * Además de verse igual, trae lo que traba a la gente al entrar: ver la
 * contraseña que se escribe y el aviso de Bloq Mayús activado.
 * El envío es el mismo de siempre: NextAuth `credentials` y a /dashboard.
 * Las animaciones son CSS (`.acceso-entrar`, `.acceso-aviso` en globals.css);
 * el CRM usa motion/react, que Estratega no tiene.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verClave, setVerClave] = useState(false);
  const [mayusculas, setMayusculas] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Correo o contraseña incorrectos.");
        toast.error("Email o contrasena incorrectos");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("No se pudo iniciar sesión. Intenta de nuevo.");
      toast.error("Error al iniciar sesion.");
    } finally {
      setLoading(false);
    }
  }

  const campo =
    "peer h-11 w-full rounded-xl border border-white/15 bg-white/[0.06] pl-10 pr-3 text-[15px] text-white outline-none transition-all duration-200 placeholder:text-white/35 hover:border-white/25 focus:border-[#c43028]/80 focus:bg-white/[0.09] focus:ring-4 focus:ring-[#c43028]/20 focus-visible:outline-none";
  const icono =
    "pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/45 transition-colors peer-focus:text-white/80";
  const revisarMayus = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setMayusculas(e.getModifierState?.("CapsLock") ?? false);

  return (
    <div className="acceso-entrar relative z-10 w-full max-w-[400px]">
      {/* El borde que brilla: un degradado de 1 px por fuera de la tarjeta */}
      <div className="rounded-[26px] bg-gradient-to-br from-white/25 via-white/5 to-[#c43028]/30 p-px shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
        <div className="relative overflow-hidden rounded-[25px] bg-[#1f1a18]/55 px-7 pb-7 pt-8 backdrop-blur-2xl backdrop-saturate-150 sm:px-9">
          {/* Reflejo de vidrio arriba */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.08] to-transparent"
            aria-hidden
          />

          <div className="relative flex flex-col items-center text-center">
            {/* Se llama `logo-…` para que el middleware lo sirva sin sesión */}
            <Image
              src="/logo-efameinsa-blanco.png"
              alt="Efameinsa"
              width={442}
              height={334}
              priority
              className="h-16 w-auto drop-shadow-[0_4px_18px_rgba(0,0,0,0.35)]"
            />
            <p className="mt-4 text-[15px] font-semibold tracking-tight text-white/90">Sistema Integrado de Gestión</p>
            <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.24em] text-white/75">
              <span className="size-1.5 rounded-full bg-[#e0483f] shadow-[0_0_8px_#e0483f]" />
              ESTRATEGA
            </span>
            <h1 className="mt-5 text-[22px] font-bold tracking-tight text-white">Iniciar sesión</h1>
          </div>

          <form onSubmit={handleSubmit} className="relative mt-7 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[13px] font-semibold text-white/80">
                Correo
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  autoFocus
                  placeholder="nombre@efameinsa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={campo}
                />
                <Mail className={icono} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[13px] font-semibold text-white/80">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={verClave ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={revisarMayus}
                  onKeyDown={revisarMayus}
                  onBlur={() => setMayusculas(false)}
                  className={`${campo} pr-11`}
                />
                <LockKeyhole className={icono} />
                <button
                  type="button"
                  onClick={() => setVerClave((v) => !v)}
                  className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={verClave ? "Ocultar la contraseña" : "Ver la contraseña"}
                  title={verClave ? "Ocultar la contraseña" : "Ver la contraseña"}
                >
                  {verClave ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {mayusculas && (
                <p className="flex items-center gap-1.5 text-xs text-amber-300">
                  <TriangleAlert className="size-3.5" /> Tiene activado Bloq Mayús.
                </p>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="acceso-aviso flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/15 px-3 py-2.5 text-sm text-red-100"
              >
                <TriangleAlert className="mt-0.5 size-4 flex-none text-red-300" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative mt-2 flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-[#a51b15] to-[#7e1210] text-[15px] font-semibold text-white shadow-[0_10px_30px_-10px_rgba(196,48,40,0.8),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-200 hover:shadow-[0_14px_36px_-10px_rgba(196,48,40,0.95),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-110 active:scale-[0.99] disabled:cursor-wait disabled:opacity-80"
            >
              {/* Destello que cruza el botón al pasar el mouse */}
              <span
                className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/20 blur-md transition-transform duration-700 group-hover:translate-x-[450%]"
                aria-hidden
              />
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Ingresando…
                </>
              ) : (
                <>
                  Ingresar <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="relative mt-6 text-center text-[13px] text-white/55">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="font-semibold text-white/85 underline-offset-4 hover:text-white hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
