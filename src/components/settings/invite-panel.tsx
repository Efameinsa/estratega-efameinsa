"use client";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw, Link2 } from "lucide-react";
import { toast } from "sonner";

export function InvitePanel({ organizationId }: { organizationId: string }) {
  const utils = trpc.useUtils();

  const { data: activeInvite } = trpc.invitations.getActive.useQuery({
    organizationId,
  });

  const generate = trpc.invitations.generate.useMutation({
    onSuccess: () => {
      utils.invitations.getActive.invalidate({ organizationId });
      toast.success("Nuevo link de invitación generado");
    },
  });

  const revoke = trpc.invitations.revoke.useMutation({
    onSuccess: () => {
      utils.invitations.getActive.invalidate({ organizationId });
      toast.success("Link revocado");
    },
  });

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[13px] font-medium text-foreground mb-1">
          Invitar miembros
        </h3>
        <p className="text-[12px] text-muted-foreground">
          Comparte el link o el código con las personas que quieres invitar.
          Solo los que tengan este link o código podrán unirse.
        </p>
      </div>

      {activeInvite ? (
        <div className="space-y-3">
          {/* Invite link */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wide">
              Link de invitación
            </label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <div className="flex-1 px-3 py-2 bg-muted/50 font-mono text-[12px] text-muted-foreground truncate flex items-center">
                {activeInvite.inviteUrl}
              </div>
              <button
                onClick={() =>
                  copyToClipboard(activeInvite.inviteUrl, "Link")
                }
                className="px-3 bg-background border-l border-border hover:bg-muted transition-colors flex items-center"
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Short code */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wide">
              Código de invitación
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-4 py-3 bg-muted/50 border border-border rounded-lg font-mono text-2xl tracking-[0.3em] text-foreground font-medium text-center">
                {activeInvite.code}
              </div>
              <button
                onClick={() =>
                  copyToClipboard(activeInvite.code, "Código")
                }
                className="p-3 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Los invitados pueden ingresar este código en{" "}
              <strong>/join</strong>
            </p>
          </div>

          {/* Meta info */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>
              Expira el{" "}
              {new Date(activeInvite.expiresAt).toLocaleDateString("es-PE", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {" · "}
              {activeInvite.useCount} usos
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => generate.mutate({ organizationId })}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                disabled={generate.isPending}
              >
                <RefreshCw className="w-3 h-3" />
                Regenerar
              </button>
              <span className="text-border">·</span>
              <button
                onClick={() => revoke.mutate({ organizationId })}
                className="text-destructive hover:text-destructive/80 transition-colors"
                disabled={revoke.isPending}
              >
                Revocar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 border border-dashed border-border rounded-lg">
          <Link2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-[13px] text-muted-foreground mb-4">
            No hay ningún link de invitación activo
          </p>
          <Button
            size="sm"
            onClick={() => generate.mutate({ organizationId })}
            disabled={generate.isPending}
          >
            Generar link de invitación
          </Button>
        </div>
      )}
    </div>
  );
}
