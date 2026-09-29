"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  User,
  Building2,
  Plug,
  GraduationCap,
  Copy,
  Trash2,
  KeyRound,
  type LucideIcon,
} from "lucide-react";

type SectionKey =
  | "account"
  | "workspace"
  | "integrations";

interface Section {
  key: SectionKey;
  label: string;
  icon: LucideIcon;
}

const SECTIONS: Section[] = [
  { key: "account", label: "Cuenta y perfil", icon: User },
  { key: "workspace", label: "Workspace y equipo", icon: Building2 },
  { key: "integrations", label: "Integraciones", icon: Plug },
];

export default function SettingsPage() {
  const [active, setActive] = useState<SectionKey>("account");

  return (
    <div className="space-y-5">
      <div className="text-left">
        <h2 className="text-lg font-semibold">Configuración</h2>
        <p className="text-sm text-muted-foreground">
          Ajustes de tu cuenta, organización, integraciones y apariencia.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        {/* Sidebar de secciones */}
        <nav className="space-y-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setActive(s.key)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                  isActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Contenido */}
        <div className="min-w-0">
          {active === "account" && <AccountSection />}
          {active === "workspace" && <WorkspaceSection />}
          {active === "integrations" && <IntegrationsSection />}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Cuenta y perfil
// ────────────────────────────────────────────────────────────────────

function AccountSection() {
  const { data: session } = useSession();
  const user = session?.user as
    | { name?: string | null; email?: string | null; role?: string }
    | undefined;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-left text-base">Cuenta y perfil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-left text-sm">
        <Field label="Nombre" value={user?.name ?? "—"} />
        <Field label="Email" value={user?.email ?? "—"} />
        <Field label="Rol" value={user?.role ?? "—"} />
        <p className="pt-2 text-xs text-muted-foreground">
          Próximamente podrás editar tu nombre, foto de perfil y cambiar contraseña.
        </p>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Workspace y equipo
// ────────────────────────────────────────────────────────────────────

function WorkspaceSection() {
  const { data: session } = useSession();
  const user = session?.user as { organizationName?: string } | undefined;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-left text-base">Workspace y equipo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-left text-sm">
        <Field label="Organización" value={user?.organizationName ?? "—"} />
        <p className="pt-2 text-xs text-muted-foreground">
          Para gestionar miembros, invitaciones y roles, ve a la sección <strong>Miembros</strong>{" "}
          en el menú lateral.
        </p>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// Integraciones
// ────────────────────────────────────────────────────────────────────

function IntegrationsSection() {
  const utils = trpc.useUtils();
  const tokensQuery = trpc.workspaceTokens.list.useQuery();
  const [newName, setNewName] = useState("");
  const [revealedToken, setRevealedToken] = useState<{ id: string; plaintext: string } | null>(null);

  const createMut = trpc.workspaceTokens.create.useMutation({
    onSuccess: (res) => {
      utils.workspaceTokens.list.invalidate();
      setRevealedToken({ id: res.id, plaintext: res.plaintext });
      setNewName("");
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeMut = trpc.workspaceTokens.revoke.useMutation({
    onSuccess: () => {
      utils.workspaceTokens.list.invalidate();
      toast.success("Token revocado");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-left text-base">Integraciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-left text-sm text-muted-foreground">
          Conecta Estratega con otras plataformas para sincronizar datos y automatizar
          flujos operativos.
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-4 py-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GraduationCap className="size-6" />
          </div>
          <div className="flex-1 text-left space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">EduCaNet</span>
              <Badge variant="secondary" className="text-[10px]">
                Disponible
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              EduCaNet puede enviar valores reales de KPIs configurados con fuente "EduCaNet"
              al Tablero BSC. Genera un token de workspace para autenticar las llamadas.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-left text-sm flex items-center gap-2">
            <KeyRound className="size-4" /> Tokens de workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-left">
          <p className="text-xs text-muted-foreground">
            Cada token autentica las llamadas REST desde EduCaNet hacia Estratega. Solo verás
            el token completo una vez al crearlo — cópialo y guárdalo en EduCaNet.
          </p>

          {revealedToken && (
            <div className="space-y-2 rounded-md border border-amber-400 bg-transparent p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                <KeyRound className="size-4" /> Token recién creado · Cópialo ahora
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <code className="flex-1 break-all rounded bg-muted px-3 py-2 font-mono text-xs">
                  {revealedToken.plaintext}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(revealedToken.plaintext);
                    toast.success("Token copiado");
                  }}
                >
                  <Copy className="mr-1 size-3.5" /> Copiar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRevealedToken(null)}
                >
                  Listo
                </Button>
              </div>
              <p className="text-[10px] text-amber-300">
                ⚠️ Este token no volverá a mostrarse. Si lo pierdes, deberás revocarlo y generar
                uno nuevo.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Nombre del token</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Token EduCaNet"
              />
            </div>
            <Button
              onClick={() =>
                createMut.mutate({
                  name: newName.trim() || "Token EduCaNet",
                  permissions: "read_write",
                })
              }
              disabled={createMut.isPending}
            >
              Generar token
            </Button>
          </div>

          {tokensQuery.data && tokensQuery.data.length > 0 && (
            <div className="space-y-2">
              {tokensQuery.data.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs",
                    !t.active && "opacity-50",
                  )}
                >
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-muted-foreground">
                      <code className="font-mono">{t.tokenPrefix}…</code> ·{" "}
                      {t.permissions === "read_write" ? "Lectura/Escritura" : "Solo lectura"}
                      {t.lastUsedAt && (
                        <> · Último uso: {new Date(t.lastUsedAt).toLocaleDateString("es-PE")}</>
                      )}
                      {!t.active && t.revokedAt && (
                        <> · Revocado: {new Date(t.revokedAt).toLocaleDateString("es-PE")}</>
                      )}
                    </div>
                  </div>
                  {t.active && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`Revocar el token "${t.name}"? Esta acción no se puede deshacer.`)) {
                          revokeMut.mutate({ id: t.id });
                        }
                      }}
                    >
                      <Trash2 className="mr-1 size-3.5" /> Revocar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/10">
        <CardHeader>
          <CardTitle className="text-left text-sm">Endpoints disponibles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div>
            <code className="font-mono bg-background px-2 py-0.5 rounded">
              POST /api/bsc/indicador/{`{est_kpi_xxx}`}/valor
            </code>
            <span className="ml-2 text-muted-foreground">
              EduCaNet envía valores de KPIs
            </span>
          </div>
          <div>
            <code className="font-mono bg-background px-2 py-0.5 rounded">
              GET /api/cycle/{`{cycleId}`}/indicadores
            </code>
            <span className="ml-2 text-muted-foreground">
              Lista de KPIs disponibles para vincular
            </span>
          </div>
          <div>
            <code className="font-mono bg-background px-2 py-0.5 rounded">
              GET /api/cycle/{`{cycleId}`}/ocps
            </code>
            <span className="ml-2 text-muted-foreground">
              Lista de OCPs del ciclo
            </span>
          </div>
          <p className="pt-2 text-muted-foreground">
            Headers requeridos: <code className="font-mono">Authorization: Bearer &lt;token&gt;</code>{" "}
            y para escritura <code className="font-mono">X-Idempotency-Key: &lt;uuid&gt;</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b pb-2 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
