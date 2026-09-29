"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        toast.error("Email o contrasena incorrectos");
      } else {
        router.push("/dashboard");
      }
    } catch {
      toast.error("Error al iniciar sesion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="bg-background border border-border/50 rounded-xl p-8 shadow-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo-isotipo-black.png" alt="Estratega" className="size-20 mx-auto mb-3" />
          <h1 className="text-[32px] font-medium">Estratega</h1>
          <p className="text-sm text-muted-foreground mt-1">Inicia sesion en tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Email</Label>
            <Input
              type="email"
              placeholder="tu@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Contrasena</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Iniciando sesion..." : "Iniciar sesion"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          No tienes cuenta?{" "}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Registrate gratis
          </Link>
        </p>
      </div>
    </div>
  );
}
