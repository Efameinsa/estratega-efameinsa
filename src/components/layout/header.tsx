"use client";

import { useSession, signOut } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { ROLES_LABELS, type Role } from "@/lib/constants";

export function Header() {
  const { data: session } = useSession();

  const user = session?.user as
    | {
        name?: string | null;
        role?: Role;
        organizationName?: string;
      }
    | undefined;

  return (
    <header className="glass-subtle relative z-20 flex h-12 shrink-0 items-center justify-between px-5">
      <div className="text-sm font-medium text-muted-foreground">
        {user?.organizationName ?? "Sin organización"}
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="text-sm">{user.name}</span>
            {user.role && (
              <Badge variant="secondary">
                {ROLES_LABELS[user.role] ?? user.role}
              </Badge>
            )}
          </>
        )}

        <Button
          variant="ghost"
          size="icon-sm"
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
