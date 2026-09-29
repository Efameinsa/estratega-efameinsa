"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ChevronRight, LogOut, CalendarRange } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ROLES_LABELS, type Role } from "@/lib/constants";
import { avatarColor, initials } from "@/lib/pm";

const MODULE_LABELS: Record<string, string> = {
  "m1-identity": "M1 · Identidad",
  "m2-diagnosis": "M2 · Diagnóstico",
  "m3-formulation": "M3 · Formulación",
  "m4-deployment": "M4 · Implementación",
  "m5-control": "M5 · Control",
};

export function Header() {
  const { data: session } = useSession();
  const params = useParams<{ cycleId?: string }>();
  const pathname = usePathname();
  const { data: cycles } = trpc.cycle.list.useQuery(undefined, { staleTime: 5 * 60 * 1000, retry: false });

  const user = session?.user as
    | {
        id?: string;
        name?: string | null;
        role?: Role;
        organizationName?: string;
      }
    | undefined;

  const cycle = params.cycleId ? cycles?.find((c) => c.id === params.cycleId) : cycles?.find((c) => c.status === "IN_PROGRESS");
  const moduleSeg = pathname.split("/")[3];
  const moduleLabel = params.cycleId ? MODULE_LABELS[moduleSeg] : undefined;

  return (
    <header className="glass-subtle relative z-20 flex h-12 shrink-0 items-center justify-between gap-4 px-5">
      <nav className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground" aria-label="Ubicación">
        <span className="truncate font-medium text-foreground/90">{user?.organizationName ?? "Sin organización"}</span>
        {cycle && (
          <>
            <ChevronRight className="size-3.5 shrink-0" />
            <Link href={`/cycles/${cycle.id}/m1-identity`} className="flex items-center gap-1.5 truncate hover:text-foreground">
              <CalendarRange className="size-3.5 text-primary" />
              {cycle.name}
            </Link>
          </>
        )}
        {moduleLabel && (
          <>
            <ChevronRight className="size-3.5 shrink-0" />
            <Link href={`/cycles/${params.cycleId}/${moduleSeg}`} className="truncate hover:text-foreground">
              {moduleLabel}
            </Link>
          </>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        {user && (
          <>
            <span
              className="flex size-7 items-center justify-center rounded-full text-[11px] font-semibold text-[#0a0814]"
              style={{ background: avatarColor(user.id) }}
              aria-hidden
            >
              {initials(user.name)}
            </span>
            <span className="hidden text-sm sm:inline">{user.name}</span>
            {user.role && (
              <Badge variant="secondary" className="hidden md:inline-flex">
                {ROLES_LABELS[user.role] ?? user.role}
              </Badge>
            )}
          </>
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          onClick={() => {
            try {
              localStorage.removeItem("sei-last-cycle-id");
              localStorage.removeItem("sei-sidebar-expand");
              localStorage.removeItem("sei-sidebar-collapsed");
            } catch {}
            signOut({ callbackUrl: "/login" });
          }}
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
