"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, List, Kanban, GanttChart, CalendarDays, Paperclip, Users, Settings, ChevronRight, Target,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { PROJECT_STATUS, BSC_PERSPECTIVES, toBscCode, projectInitials, colorDeMarca } from "@/lib/pm";
import { WorkspaceProvider } from "@/components/pm/workspace-context";
import { TaskPanel } from "@/components/pm/task-panel";
import { AvatarStack, friendlyDate } from "@/components/pm/primitives";

const TABS = [
  { label: "Resumen", href: "overview", icon: LayoutDashboard },
  { label: "Lista", href: "list", icon: List },
  { label: "Tablero", href: "board", icon: Kanban },
  { label: "Cronograma", href: "timeline", icon: GanttChart },
  { label: "Calendario", href: "calendar", icon: CalendarDays },
  { label: "Evidencias", href: "evidence", icon: Paperclip },
  { label: "Equipo", href: "team", icon: Users },
  { label: "Ajustes", href: "settings", icon: Settings },
] as const;

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Spinner />}>
      <ProjectShell>{children}</ProjectShell>
    </Suspense>
  );
}

function Spinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
    </div>
  );
}

function ProjectShell({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.projectId as string;
  const { data: session } = useSession();
  const meId = ((session?.user as { id?: string } | undefined)?.id) ?? null;

  const { data: ws, isLoading, error } = trpc.pm.workspace.useQuery({ projectId }, { enabled: !!projectId });

  if (isLoading) return <Spinner />;
  if (error || !ws) {
    return <p className="p-6 text-sm text-muted-foreground">{error?.message ?? "Proyecto no encontrado."}</p>;
  }

  const p = ws.project;
  const status = PROJECT_STATUS[p.status] ?? PROJECT_STATUS.ACTIVE;
  const persp = p.portfolio?.bscPerspective ? BSC_PERSPECTIVES[toBscCode(p.portfolio.bscPerspective)] : null;

  return (
    <WorkspaceProvider projectId={projectId} ws={ws} meId={meId}>
      {/* El layout del dashboard añade p-6; lo compensamos para usar todo el ancho. */}
      <div className="-m-6 flex h-[calc(100%+3rem)] flex-col">
        <header className="shrink-0 border-b bg-background/60 px-6 pt-4 backdrop-blur">
          <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Ruta">
            <Link href="/portfolio" className="hover:text-foreground">
              Portafolio
            </Link>
            {p.portfolio && (
              <>
                <ChevronRight className="size-3" />
                <Link href="/portfolio" className="flex items-center gap-1 hover:text-foreground">
                  {persp && <span className="size-2 rounded-full" style={{ background: persp.color }} />}
                  {p.portfolio.name}
                </Link>
              </>
            )}
            {p.program && (
              <>
                <ChevronRight className="size-3" />
                <span className="max-w-72 truncate">{p.program.name}</span>
              </>
            )}
          </nav>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: colorDeMarca(p.color) ?? "#8B1510" }}>
              {projectInitials(p)}
            </span>
            <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight" title={p.name}>
              {p.name}
            </h1>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ background: `${status.color}1f`, color: status.color }}
            >
              {status.label}
            </span>
            {(p.startDate || p.endDate) && (
              <span className="text-xs text-muted-foreground">
                {friendlyDate(p.startDate)} → {friendlyDate(p.endDate)}
              </span>
            )}
            <Link href={`/projects/${projectId}/team`} className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-accent" title="Equipo del proyecto">
              <AvatarStack users={p.members.map((m) => m.user)} size={26} />
            </Link>
          </div>
          {p.ocp && (
            <Link
              href={`/cycles/${p.ocp.cycleId}/m4-deployment/ocp`}
              className="mt-1.5 inline-flex max-w-full items-center gap-1.5 truncate text-xs text-muted-foreground hover:text-foreground"
            >
              <Target className="size-3.5 text-primary" />
              Ejecuta el <span className="font-medium text-foreground">{p.ocp.code}</span>
              {p.ocp.kpiLinks.length > 0 && <> · mide {p.ocp.kpiLinks.map((k) => k.kpi.code).join(", ")}</>}
            </Link>
          )}

          <div className="-mb-px mt-3 flex gap-0.5 overflow-x-auto" role="tablist">
            {TABS.map((tab) => {
              const href = `/projects/${projectId}/${tab.href}`;
              const active = pathname.startsWith(href);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={href}
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-4", active && "text-primary")} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
      <TaskPanel />
    </WorkspaceProvider>
  );
}
