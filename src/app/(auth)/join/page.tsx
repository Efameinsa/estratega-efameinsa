"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const { refetch, isFetching } = trpc.invitations.verifyCode.useQuery(
    { code: code.toUpperCase() },
    {
      enabled: false,
      retry: false,
    }
  );

  async function handleVerify() {
    if (code.length !== 6) return;
    const { data } = await refetch();
    if (data?.valid && data.token) {
      router.push(`/invite/${data.token}`);
    } else {
      toast.error("Código inválido o expirado");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-[380px]">
        <div className="glass-strong rounded-2xl p-8">
          <h1 className="text-[17px] font-medium text-foreground mb-2 text-center">
            Unirte con código
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Ingresa el código de 6 caracteres que te compartieron
          </p>

          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            placeholder="XXXXXX"
            className="w-full border border-input rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-[0.3em] bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-4"
            maxLength={6}
          />

          <Button
            className="w-full"
            disabled={code.length < 6 || isFetching}
            onClick={handleVerify}
          >
            {isFetching ? "Verificando..." : "Verificar código"}
          </Button>

          <p className="text-center text-[12px] text-muted-foreground mt-4">
            ¿Tienes un link de invitación? Ábrelo directamente en el navegador.
          </p>
        </div>
      </div>
    </div>
  );
}
