"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Step = "ORG" | "INVITE" | "CYCLE" | "DONE";

const COLORS = ["#c43028", "#34d399", "#185fa5", "#D85A30", "#D4537E", "#BA7517"];

const STEP_META: { key: Step; label: string }[] = [
  { key: "ORG", label: "Organización" },
  { key: "INVITE", label: "Equipo" },
  { key: "CYCLE", label: "Ciclo" },
  { key: "DONE", label: "Listo" },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-[440px]">
          <div className="glass-strong rounded-2xl p-8 flex justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update: updateSession } = useSession();
  const inviteToken = searchParams.get("invite");

  const [step, setStep] = useState<Step>("ORG");

  // Org state
  const [orgId, setOrgId] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgDesc, setOrgDesc] = useState("");
  const [orgColor, setOrgColor] = useState("#c43028");

  // Invite state
  const [inviteCode, setInviteCode] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  // Cycle state
  const currentYear = new Date().getFullYear();
  const [cycleName, setCycleName] = useState("");
  const [startYear, setStartYear] = useState(currentYear);
  const [duration, setDuration] = useState(5);
  const endYear = startYear + duration;

  // Prevent browser back button during onboarding
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Check onboarding status from DB (not JWT)
  const { data: dbStatus } = trpc.onboarding.getStatus.useQuery(undefined, {
    enabled: !inviteToken,
  });

  // If already completed in DB, redirect to dashboard
  useEffect(() => {
    if (dbStatus?.onboardingCompleted && step === "ORG" && !inviteToken) {
      window.location.href = "/";
    }
  }, [dbStatus, step, inviteToken]);

  // Restore step from DB if user refreshes mid-flow
  useEffect(() => {
    if (dbStatus?.onboardingStep && dbStatus.onboardingStep !== "DONE" && !inviteToken) {
      setStep(dbStatus.onboardingStep as Step);
      const membership = dbStatus.orgMemberships?.[0];
      if (membership) {
        setOrgId(membership.organizationId);
      }
    }
  }, [dbStatus, inviteToken]);

  // ── Camino B: Accept invitation ──
  const acceptInvitation = trpc.onboarding.acceptInvitation.useMutation({
    onSuccess: async () => {
      await updateSession();
      document.cookie = "onboarding-completed=1; path=/; max-age=31536000";
      toast.success("Te uniste a la organización");
      // Full reload to refresh tRPC context with new activeOrganizationId
      window.location.href = "/";
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (inviteToken && !acceptInvitation.isPending && !acceptInvitation.isSuccess && !acceptInvitation.isError) {
      acceptInvitation.mutate({ token: inviteToken });
    }
  }, [inviteToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 1: Create org ──
  const createOrg = trpc.onboarding.createOrganization.useMutation({
    onSuccess: (result) => {
      setOrgId(result.org.id);
      setInviteCode(result.inviteCode);
      setInviteLink(result.inviteUrl);
      setCycleName(`Plan Estratégico ${startYear}–${startYear + duration}`);
      setStep("INVITE");
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Step 2: Skip invite ──
  const skipInvite = trpc.onboarding.skipInvite.useMutation({
    onSuccess: () => setStep("CYCLE"),
  });

  // ── Step 3: Create cycle ──
  const createCycle = trpc.onboarding.createCycle.useMutation({
    onSuccess: async () => {
      await updateSession();
      document.cookie = "onboarding-completed=1; path=/; max-age=31536000";
      setStep("DONE");
      // Session is now refreshed, DONE step will show with "Ir al dashboard" button
    },
    onError: (e) => toast.error(e.message),
  });

  // Avatar initials
  const initials = orgName
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "O";

  // ── Loading: Camino B ──
  if (inviteToken) {
    return (
      <div className="w-full max-w-[440px]">
        <div className="glass-strong rounded-2xl p-8 text-center">
          {acceptInvitation.isError ? (
            <>
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">!</span>
              </div>
              <h2 className="text-lg font-medium mb-1">Invitación no válida</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {acceptInvitation.error?.message ?? "El link es inválido o ha expirado."}
              </p>
              <Button variant="outline" onClick={() => router.replace("/onboarding")}>
                Crear mi propia organización
              </Button>
            </>
          ) : (
            <>
              <Loader2
                className="size-8 animate-spin mx-auto mb-4"
                style={{ color: "#c43028" }}
              />
              <h2 className="text-lg font-medium mb-1">Procesando tu invitación...</h2>
              <p className="text-sm text-muted-foreground">Esto solo toma un momento</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Camino A: Multi-step onboarding ──
  return (
    <div className="w-full max-w-[440px]">
      <div className="bg-background border border-border/50 rounded-xl shadow-sm overflow-hidden">
        {/* Header + Stepper */}
        <div className="px-8 pt-8 pb-0">
          <div className="flex items-center gap-3 mb-6">
            <img src="/logo-isotipo-white.png" alt="Estratega" className="size-8" />
            <span className="text-sm font-medium text-foreground">Estratega</span>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-0 mb-7">
            {STEP_META.map((s, i) => {
              const steps: Step[] = ["ORG", "INVITE", "CYCLE", "DONE"];
              const currentIdx = steps.indexOf(step);
              const thisIdx = steps.indexOf(s.key);
              const isDone = currentIdx > thisIdx;
              const isActive = currentIdx === thisIdx;

              return (
                <div key={s.key} className="flex items-center flex-1">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div
                      className={cn(
                        "w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-medium transition-all",
                        isDone || isActive
                          ? "text-white"
                          : "bg-muted text-muted-foreground border border-border"
                      )}
                      style={
                        isDone || isActive
                          ? { backgroundColor: "#c43028" }
                          : undefined
                      }
                    >
                      {isDone ? <Check className="w-3 h-3" /> : i + 1}
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-medium hidden sm:block",
                        isActive
                          ? "text-foreground"
                          : isDone
                          ? "text-muted-foreground"
                          : "text-muted-foreground/50"
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < 3 && (
                    <div
                      className={cn(
                        "flex-1 h-px mx-2",
                        isDone ? "bg-[#60a5fa]" : "bg-border"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          {/* ── PASO 1: CREAR ORGANIZACIÓN ── */}
          {step === "ORG" && (
            <div>
              <h2 className="text-[16px] font-medium text-foreground mb-1">
                Crea tu organización
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Serás el Propietario y podrás invitar a tu equipo después.
              </p>

              {/* Avatar preview */}
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-medium mx-auto mb-3 transition-colors"
                style={{ background: orgColor }}
              >
                {initials}
              </div>

              {/* Color picker */}
              <div className="flex justify-center gap-2 mb-5">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setOrgColor(color)}
                    className={cn(
                      "w-6 h-6 rounded-md border-2 transition-all cursor-pointer",
                      orgColor === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ background: color }}
                  />
                ))}
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Nombre de la organización *
                  </Label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Ej: Corporación Andina S.A.C."
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Descripción{" "}
                    <span className="font-normal text-muted-foreground/60">
                      (opcional)
                    </span>
                  </Label>
                  <textarea
                    value={orgDesc}
                    onChange={(e) => setOrgDesc(e.target.value)}
                    placeholder="¿A qué se dedica tu organización?"
                    rows={2}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <Button
                  className="w-full"
                  disabled={!orgName.trim() || createOrg.isPending}
                  onClick={() =>
                    createOrg.mutate({
                      name: orgName.trim(),
                      description: orgDesc.trim() || undefined,
                      color: orgColor,
                    })
                  }
                >
                  {createOrg.isPending ? "Creando..." : "Crear organización →"}
                </Button>
              </div>
            </div>
          )}

          {/* ── PASO 2: INVITAR EQUIPO ── */}
          {step === "INVITE" && (
            <div>
              <h2 className="text-[16px] font-medium text-foreground mb-1">
                Invita a tu equipo
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Comparte el link o el código. Puedes seguir invitando después.
              </p>

              {/* Link */}
              <div className="mb-4">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Link de invitación
                </label>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <div className="flex-1 px-3 py-2 bg-muted/50 font-mono text-[11px] text-muted-foreground truncate flex items-center">
                    {inviteLink}
                  </div>
                  <button
                    className="px-3 bg-background border-l border-border hover:bg-muted transition-colors text-sm font-medium text-foreground flex-shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      toast.success("Link copiado");
                    }}
                  >
                    Copiar
                  </button>
                </div>
              </div>

              {/* Code */}
              <div className="mb-4">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Código de invitación
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 px-4 py-3 bg-muted/50 border border-border rounded-lg font-mono text-2xl tracking-[0.3em] text-foreground font-medium text-center">
                    {inviteCode}
                  </div>
                  <button
                    className="p-3 border border-border rounded-lg hover:bg-muted transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteCode);
                      toast.success("Código copiado");
                    }}
                  >
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Los invitados ingresan el código en <strong>/join</strong>
                </p>
              </div>

              <div
                className="rounded-lg px-3 py-2.5 text-[12px] mb-5"
                style={{
                  backgroundColor: "transparent",
                  color: "#c43028",
                  borderLeft: "3px solid #60a5fa",
                }}
              >
                Comparte por WhatsApp, email o donde prefieras. Quien use el link
                o código entrará como <strong>Miembro</strong>.
              </div>

              <Button className="w-full mb-2" onClick={() => setStep("CYCLE")}>
                Continuar → Crear ciclo estratégico
              </Button>
              <button
                className="w-full text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
                onClick={() => {
                  skipInvite.mutate();
                  setStep("CYCLE");
                }}
              >
                Continuar sin invitar ahora
              </button>
            </div>
          )}

          {/* ── PASO 3: CREAR CICLO ── */}
          {step === "CYCLE" && (
            <div>
              <h2 className="text-[16px] font-medium text-foreground mb-1">
                Crea tu ciclo estratégico
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                El ciclo define el horizonte de tu planeamiento. D'Alessio
                recomienda 3 a 5 años.
              </p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Nombre del ciclo *
                  </Label>
                  <Input
                    value={cycleName}
                    onChange={(e) => setCycleName(e.target.value)}
                    placeholder="Ej: Plan Estratégico 2025–2030"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Duración *
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {([3, 5] as const).map((years) => (
                      <button
                        key={years}
                        type="button"
                        onClick={() => {
                          setDuration(years);
                          setCycleName(
                            `Plan Estratégico ${startYear}–${startYear + years}`
                          );
                        }}
                        className={cn(
                          "p-3 rounded-lg border text-left transition-all cursor-pointer",
                          duration === years
                            ? "border-[#60a5fa] bg-[#60a5fa]/5"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <div
                          className={cn(
                            "text-[14px] font-medium",
                            duration === years
                              ? "text-[#60a5fa]"
                              : "text-foreground"
                          )}
                        >
                          {years} años
                        </div>
                        <div
                          className={cn(
                            "text-[11px] mt-0.5",
                            duration === years
                              ? "text-[#60a5fa]/70"
                              : "text-muted-foreground"
                          )}
                        >
                          {startYear} – {startYear + years}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Año de inicio
                    </Label>
                    <select
                      value={startYear}
                      onChange={(e) => {
                        const y = Number(e.target.value);
                        setStartYear(y);
                        setCycleName(
                          `Plan Estratégico ${y}–${y + duration}`
                        );
                      }}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground"
                    >
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Año de fin
                    </Label>
                    <Input value={endYear} readOnly className="bg-muted/50 text-muted-foreground" />
                  </div>
                </div>

                <Button
                  className="w-full"
                  disabled={!cycleName.trim() || !orgId || createCycle.isPending}
                  onClick={() =>
                    createCycle.mutate({
                      organizationId: orgId,
                      name: cycleName.trim(),
                      startYear,
                      endYear,
                    })
                  }
                >
                  {createCycle.isPending
                    ? "Creando ciclo..."
                    : "Crear ciclo y comenzar →"}
                </Button>
              </div>
            </div>
          )}

          {/* ── PASO 4: LISTO ── */}
          {step === "DONE" && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-transparent flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-[18px] font-medium text-foreground mb-2">
                ¡Todo listo!
              </h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Tu organización y ciclo estratégico están creados. Ya puedes
                comenzar el planeamiento.
              </p>

              <div className="bg-muted/50 rounded-lg p-4 text-left mb-6 space-y-2">
                {[
                  { text: "Organización creada", done: true },
                  { text: "Ciclo estratégico activo", done: true },
                  { text: "Define la Visión y Misión (M1)", done: false },
                  { text: "Inicia el diagnóstico estratégico (M2)", done: false },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg",
                      item.done ? "bg-transparent" : "bg-background"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0",
                        item.done
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-muted-foreground border border-border"
                      )}
                    >
                      {item.done ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        i - 1
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-sm",
                        item.done
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>

              <Button className="w-full" onClick={() => { window.location.href = "/"; }}>
                Ir al dashboard →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
