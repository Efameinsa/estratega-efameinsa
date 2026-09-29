"use client";

import { useState, type FormEvent, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const registerMutation = trpc.user.register.useMutation({
    async onSuccess() {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        toast.error("Registro exitoso, pero no se pudo iniciar sesion.");
        router.push("/login");
      } else {
        toast.success("Cuenta creada exitosamente");
        // Redirect to onboarding (with invite token if present)
        if (inviteToken) {
          router.push(`/onboarding?invite=${inviteToken}`);
        } else {
          router.push("/onboarding");
        }
      }
    },
    onError(err) {
      toast.error(err.message || "Error al registrarse.");
      setLoading(false);
    },
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("La contrasena debe tener al menos 6 caracteres");
      return;
    }
    setLoading(true);
    registerMutation.mutate({ name, email, password });
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="glass-strong rounded-2xl p-8">
        {/* Logo */}
        <div className="text-center mb-7">
          <img src="/logo-isotipo-white.png" alt="Estratega" className="size-20 mx-auto mb-3" />
          <h1 className="text-[32px] font-medium">Crea tu cuenta</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {inviteToken
              ? "Regístrate para unirte a la organización"
              : "Gratis · Sin tarjeta de credito"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Nombre completo</Label>
            <Input
              placeholder="Juan Perez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Email</Label>
            <Input
              type="email"
              placeholder="tu@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Contrasena</Label>
            <Input
              type="password"
              placeholder="Minimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Ya tienes cuenta?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Inicia sesion
          </Link>
        </p>
      </div>
    </div>
  );
}
