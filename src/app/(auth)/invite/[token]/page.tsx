"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, AlertCircle, Loader2 } from "lucide-react";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { data: session, status } = useSession();
  const router = useRouter();

  const { data: invite, isLoading } = trpc.invitations.verify.useQuery(
    { token },
    { retry: false }
  );

  const acceptInvite = trpc.invitations.accept.useMutation({
    onSuccess: (result) => {
      if (result.alreadyMember) {
        toast.info("Ya eres miembro de esta organización");
      } else {
        toast.success(`Te uniste a la organización`);
      }
      router.push("/");
    },
    onError: (e) => toast.error(e.message),
  });

  // If not authenticated, redirect to register with invite token
  useEffect(() => {
    if (status === "unauthenticated") {
      sessionStorage.setItem("pendingInviteToken", token);
      router.push(`/register?invite=${token}`);
    }
  }, [status, token, router]);

  if (isLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invite?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-[400px]">
          <div className="bg-background border border-border/50 rounded-xl p-8 text-center shadow-sm">
            <AlertCircle className="size-12 text-destructive mx-auto mb-4" />
            <h1 className="text-[17px] font-medium text-foreground mb-2">
              Invitación no válida
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {invite?.reason ?? "Esta invitación no existe o ha sido revocada."}
            </p>
            <Button variant="outline" onClick={() => router.push("/")}>
              Ir al inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-[400px]">
        <div className="bg-background border border-border/50 rounded-xl p-8 text-center shadow-sm">
          {/* Org avatar */}
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-medium mx-auto mb-4"
            style={{ background: invite.organization?.color ?? "#c43028" }}
          >
            {invite.organization?.name?.slice(0, 2).toUpperCase()}
          </div>

          <h1 className="text-[17px] font-medium text-foreground mb-2">
            Te invitaron a unirte
          </h1>
          <p className="text-sm text-muted-foreground mb-1">
            <strong className="text-foreground">{invite.organization?.name}</strong>
          </p>
          <p className="text-[12px] text-muted-foreground mb-6">
            <Users className="inline size-3 mr-1" />
            {invite.organization?._count?.members} miembros · Invitado por{" "}
            {invite.invitedBy}
          </p>

          <div className="bg-muted/50 rounded-lg p-3 mb-6 text-left">
            <p className="text-[12px] text-muted-foreground">
              Entrarás como{" "}
              <strong className="text-foreground">Miembro</strong>. Tendrás
              acceso a los módulos estratégicos, proyectos y tareas de esta
              organización.
            </p>
          </div>

          <Button
            className="w-full mb-2"
            disabled={acceptInvite.isPending}
            onClick={() => acceptInvite.mutate({ token })}
          >
            {acceptInvite.isPending
              ? "Uniéndose..."
              : `Unirme a ${invite.organization?.name}`}
          </Button>
          <button
            className="w-full text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
            onClick={() => router.push("/")}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
