"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { trpc } from "@/lib/trpc";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  // Check onboarding from DB, NOT from JWT
  const { data: onboardingStatus, isLoading: onboardingLoading } =
    trpc.onboarding.getStatus.useQuery(undefined, {
      enabled: status === "authenticated",
      retry: false,
    });

  // Restore and persist collapsed state
  useEffect(() => {
    const stored = localStorage.getItem("sei-sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sei-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  // Not authenticated — go to login
  if (status === "unauthenticated") {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }

  // Loading
  if (status === "loading" || (status === "authenticated" && onboardingLoading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  // Onboarding not completed — go to onboarding
  if (status === "authenticated" && onboardingStatus && !onboardingStatus.onboardingCompleted) {
    if (typeof window !== "undefined") window.location.href = "/onboarding";
    return null;
  }

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="relative flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
