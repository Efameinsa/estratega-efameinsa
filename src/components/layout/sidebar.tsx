"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  ChevronRight,
  LayoutDashboard,
  Target,
  Search,
  Lightbulb,
  Eye,
  Compass,
  Heart,
  Globe,
  Shield,
  Trophy,
  BarChart3,
  Factory,
  TrendingUp,
  Grid3X3,
  Crosshair,
  GitBranch,
  ArrowUpDown,
  Layers,
  Filter,
  CheckCircle,
  Scale,
  FileText,
  Users,
  Settings,
  Rocket,
  FolderKanban,
  Briefcase,
  Lock,
  Clock,
  ShieldCheck,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ItemStatus = "implementado" | "referencia" | "bloqueado";

interface TreeNodeData {
  label: string;
  href?: string;
  icon?: LucideIcon;
  children?: TreeNodeData[];
  defaultOpen?: boolean;
  isGroupHeader?: boolean;
  status?: ItemStatus;
  lockTooltip?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasActiveDescendant(node: TreeNodeData, pathname: string): boolean {
  if (node.href && pathname.startsWith(node.href)) return true;
  return node.children?.some((c) => hasActiveDescendant(c, pathname)) ?? false;
}

// ---------------------------------------------------------------------------
// TreeNode component
// ---------------------------------------------------------------------------

// localStorage key for expansion state
const EXPAND_KEY = "sei-sidebar-expand";
function getStoredExpand(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(EXPAND_KEY) || "{}"); } catch { return {}; }
}
function setStoredExpand(label: string, open: boolean) {
  if (typeof window === "undefined") return;
  try {
    const cur = getStoredExpand();
    cur[label] = open;
    localStorage.setItem(EXPAND_KEY, JSON.stringify(cur));
  } catch {}
}

function TreeNode({
  node,
  pathname,
  depth,
}: {
  node: TreeNodeData;
  pathname: string;
  depth: number;
}) {
  // Exact match → highlight fuerte. Para items con children, evitamos marcar
  // simultáneamente al padre cuando un hijo está activo: en ese caso solo el
  // hijo lleva el highlight fuerte y el padre recibe un highlight suave.
  const hasChildren = !!node.children?.length;
  const isExactActive = !!node.href && pathname === node.href;
  const isPrefixActive = !!node.href && pathname.startsWith(node.href + "/");
  const isActive = hasChildren ? isExactActive : (isExactActive || isPrefixActive);
  const descendantActive = hasChildren && hasActiveDescendant(node, pathname);
  // Highlight suave: el padre cuyo descendiente está activo (pero el padre no es el item exacto)
  const isAncestorOfActive = hasChildren && descendantActive && !isExactActive;

  const [open, setOpenState] = useState(
    node.defaultOpen ?? descendantActive ?? false,
  );

  // Restore from localStorage after mount (avoids hydration mismatch)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const stored = getStoredExpand();
    if (stored[node.label] !== undefined) setOpenState(stored[node.label]);
    setHydrated(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setOpen(val: boolean) {
    setOpenState(val);
    setStoredExpand(node.label, val);
  }

  // Auto-expand when a descendant becomes active
  useEffect(() => {
    if (descendantActive && !open) setOpen(true);
  }, [descendantActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const Icon = node.icon;
  const paddingLeft = depth * 12 + 8;

  // Group header style (Analisis Externo, Analisis Interno, Consolidado)
  if (node.isGroupHeader) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-1.5 py-1.5 text-left"
          style={{ paddingLeft }}
        >
          {hasChildren && (
            <ChevronRight
              className={cn(
                "size-3 shrink-0 text-sidebar-foreground/50 transition-transform duration-200",
                open && "rotate-90"
              )}
            />
          )}
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--sidebar-foreground)" }}>
            {node.label}
          </span>
        </button>

        {open && hasChildren && (
          <div className="relative ml-3 border-l border-sidebar-border">
            {node.children!.map((child, i) => (
              <TreeNode
                key={child.label + i}
                node={child}
                pathname={pathname}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isRef = node.status === "referencia";
  const isLocked = node.status === "bloqueado";
  const isDisabled = isRef || isLocked;

  // Regular link / collapsible node
  const content = (
    <>
      {hasChildren && (
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-90"
          )}
        />
      )}
      {!hasChildren && isLocked && (
        <Lock className="size-3 shrink-0 text-sidebar-foreground/30" />
      )}
      {!hasChildren && !isLocked && Icon && (
        <Icon className="size-3.5 shrink-0 text-sidebar-foreground/50" />
      )}
      {hasChildren && Icon && (
        <Icon className="size-3.5 shrink-0 text-sidebar-foreground/50" />
      )}
      <span className="truncate text-left" title={node.label}>{node.label}</span>
      {isRef && (
        <span className="ml-auto shrink-0 text-[8px] text-sidebar-foreground/30">prox.</span>
      )}
      {isLocked && node.lockTooltip && (
        <span className="ml-auto shrink-0 text-[8px] text-sidebar-foreground/30" title={node.lockTooltip}>🔒</span>
      )}
    </>
  );

  const sharedClasses = cn(
    "flex w-full items-center gap-1.5 rounded-md py-1.5 text-left text-sm transition-all duration-150",
    isDisabled
      ? "opacity-45 cursor-default"
      : isActive
      ? "font-medium"
      : isAncestorOfActive
      ? "font-medium"
      : "hover:text-sidebar-foreground"
  );

  // Inline styles for exact color control — tokens del tema morado
  // - isActive: highlight fuerte (bg + border izquierdo) para el item seleccionado
  // - isAncestorOfActive: highlight suave (solo color de texto) para indicar
  //   que un descendiente está activo, sin competir con el sub-item real.
  const sharedStyle: React.CSSProperties = isDisabled
    ? { color: "var(--sidebar-foreground)", opacity: 0.5, paddingLeft }
    : isActive
    ? {
        color: "var(--sidebar-accent-foreground)",
        backgroundColor: "var(--sidebar-accent)",
        borderLeft: "2px solid var(--sidebar-primary)",
        paddingLeft: paddingLeft - 2,
      }
    : isAncestorOfActive
    ? { color: "var(--sidebar-accent-foreground)", paddingLeft }
    : { color: "var(--sidebar-foreground)", paddingLeft };

  return (
    <div>
      {node.href && !isDisabled ? (
        <div className="flex items-center">
          <Link
            href={node.href}
            className={cn(sharedClasses, "flex-1")}
            style={sharedStyle}
          >
            {content}
          </Link>
          {hasChildren && (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="shrink-0 rounded p-0.5 text-sidebar-foreground/50 hover:text-sidebar-foreground"
            >
              <ChevronRight
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  open && "rotate-90"
                )}
              />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => hasChildren && setOpen(!open)}
          className={sharedClasses}
          style={sharedStyle}
        >
          {content}
        </button>
      )}

      {open && hasChildren && (
        <div className="relative ml-3 border-l border-sidebar-border">
          {node.children!.map((child, i) => (
            <TreeNode
              key={child.label + i}
              node={child}
              pathname={pathname}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Build sidebar tree data
// ---------------------------------------------------------------------------

// Ejecución: visible siempre, haya o no un ciclo seleccionado.
const EXECUTION_GROUP: TreeNodeData =
    {
      label: "Ejecución Estratégica",
      isGroupHeader: true,
      defaultOpen: true,
      children: [
        {
          label: "Portafolio",
          icon: FolderKanban,
          href: "/portfolio",
        },
        {
          label: "Proyectos",
          icon: Briefcase,
          href: "/projects",
        },
        {
          label: "Mis tareas",
          icon: CheckCircle,
          href: "/my-tasks",
        },
      ],
    };

function buildCycleTree(cycleId: string): TreeNodeData[] {
  const base = `/cycles/${cycleId}`;

  return [
    // ══════════════════════════════════════════════
    // SECCION 1: PLANEAMIENTO ESTRATEGICO
    // ══════════════════════════════════════════════
    {
      label: "Planeamiento Estratégico",
      isGroupHeader: true,
      defaultOpen: true,
      children: [
        // M1
        {
          label: "M1 · Identidad",
          icon: Target,
          href: `${base}/m1-identity`,
          defaultOpen: false,
          children: [
            { label: "Visión", href: `${base}/m1-identity/vision`, icon: Eye },
            { label: "Misión", href: `${base}/m1-identity/mission`, icon: Compass },
            { label: "Valores y Ética", href: `${base}/m1-identity/values`, icon: Heart },
            { label: "Intereses", href: `${base}/m1-identity/interests`, icon: Globe },
          ],
        },
        // M2
        {
          label: "M2 · Diagnóstico",
          icon: Search,
          href: `${base}/m2-diagnosis`,
          defaultOpen: false,
          children: [
            {
              label: "Análisis Externo",
              isGroupHeader: true,
              defaultOpen: false,
              children: [
                { label: "PESTEC (Macroentorno)", href: `${base}/m2-diagnosis/pestec`, icon: Globe },
                { label: "Microentorno · Porter", href: `${base}/m2-diagnosis/porter`, icon: Shield },
                { label: "Análisis Competitivo", href: `${base}/m2-diagnosis/competitive-analysis`, icon: Crosshair },
                { label: "Atractividad de la Industria", href: `${base}/m2-diagnosis/industry-attractiveness`, icon: TrendingUp },
                { label: "MPC", href: `${base}/m2-diagnosis/mpc`, icon: Trophy },
                { label: "Matriz MEFE", href: `${base}/m2-diagnosis/mefe`, icon: BarChart3 },
              ],
            },
            {
              label: "Análisis Interno",
              isGroupHeader: true,
              defaultOpen: false,
              children: [
                { label: "AMOFHIT", href: `${base}/m2-diagnosis/amofhit`, icon: Factory },
                { label: "Matriz MEFI", href: `${base}/m2-diagnosis/mefi`, icon: TrendingUp },
              ],
            },
            {
              label: "Síntesis",
              isGroupHeader: true,
              defaultOpen: false,
              children: [
                { label: "FODA Consolidado", href: `${base}/m2-diagnosis/foda`, icon: Grid3X3 },
              ],
            },
          ],
        },
        // M3
        {
          label: "M3 · Formulación",
          icon: Lightbulb,
          href: `${base}/m3-formulation`,
          defaultOpen: false,
          children: [
            // 1. FODA Cruzado (genera estrategias)
            { label: "FODA Cruzado", href: `${base}/m3-formulation/foda-cruzado`, icon: GitBranch },
            // 2. PEYEA, BCG, IE, GE (más estrategias y validación)
            { label: "PEYEA", href: `${base}/m3-formulation/peyea`, icon: ArrowUpDown },
            { label: "Matriz BCG", href: `${base}/m3-formulation/bcg`, icon: BarChart3 },
            { label: "Matriz IE", href: `${base}/m3-formulation/ie`, icon: Grid3X3 },
            { label: "Gran Estrategia (GE)", href: `${base}/m3-formulation/ge`, icon: Crosshair },
            // 3. OLP (metas cuantitativas)
            { label: "OLP", href: `${base}/m3-formulation/olp`, icon: Crosshair },
            // 4-7. Decisión y filtros
            { label: "Matriz de Decisión (MD)", href: `${base}/m3-formulation/md`, icon: Layers },
            { label: "MCPE", href: `${base}/m3-formulation/mcpe`, icon: BarChart3 },
            { label: "Filtro de Rumelt", href: `${base}/m3-formulation/rumelt`, icon: Shield },
            { label: "Auditoría Ética", href: `${base}/m3-formulation/ethics`, icon: Shield },
            // 8. Estrategias retenidas
            { label: "Estrategias retenidas", href: `${base}/m3-formulation/strategies`, icon: Layers },
            // 9. Plan Estratégico Integral
            { label: "Plan Estratégico Integral", href: `${base}/m3-formulation/pei`, icon: FileText },
          ],
        },
        // M4
        {
          label: "M4 · Implementación",
          icon: Rocket,
          href: `${base}/m4-deployment`,
          defaultOpen: false,
          children: [
            { label: "OCP por área", href: `${base}/m4-deployment/ocp`, icon: Target },
            { label: "Políticas organizacionales", href: `${base}/m4-deployment/politicas`, icon: ShieldCheck },
            { label: "Estructura organizacional", href: `${base}/m4-deployment/estructura`, icon: Building2 },
            { label: "Recursos (7M)", href: `${base}/m4-deployment/7m`, icon: Layers },
          ],
        },
        // M5
        {
          label: "M5 · Control (BSC)",
          icon: BarChart3,
          href: `${base}/m5-control`,
          defaultOpen: false,
          children: [
            { label: "KPIs y metas", href: `${base}/m5-control/kpis`, icon: Target },
            { label: "Tablero BSC", href: `${base}/m5-control/tablero`, icon: BarChart3 },
            { label: "Alertas estratégicas", href: `${base}/m5-control/alertas`, icon: AlertCircle },
            { label: "Revisión estratégica", href: `${base}/m5-control/revision`, icon: Clock },
          ],
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const params = useParams();
  const paramCycleId = params?.cycleId as string | undefined;
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  // Use session for display, not for access control (backend handles that)
  const { data: session } = useSession();
  const sessionUser = session?.user as Record<string, unknown> | undefined;
  const orgName = (sessionUser?.organizationName as string) ?? "Organización";


  // Persist last-used cycleId so sidebar stays visible on non-cycle routes
  const [lastCycleId, setLastCycleId] = useState<string | null>(null);

  // Auto-detect active cycle from the org if no cycleId stored
  const { data: cycles } = trpc.cycle.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Restore from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem("sei-last-cycle-id");
    if (stored) setLastCycleId(stored);
  }, []);

  useEffect(() => {
    if (paramCycleId) {
      setLastCycleId(paramCycleId);
      localStorage.setItem("sei-last-cycle-id", paramCycleId);
    }
  }, [paramCycleId]);

  // If no stored cycle, use the first active cycle from the org
  const autoCycleId = cycles?.find((c) => c.status === "IN_PROGRESS")?.id ?? cycles?.[0]?.id;

  // Guard: only honor lastCycleId if it belongs to a cycle the current user can access.
  // Stops cross-account leaks when the same browser is reused between users.
  const accessibleCycleIds = useMemo(
    () => new Set(cycles?.map((c) => c.id) ?? []),
    [cycles],
  );
  const safeLastCycleId =
    lastCycleId && accessibleCycleIds.has(lastCycleId) ? lastCycleId : null;

  const cycleId = paramCycleId || safeLastCycleId || autoCycleId;

  // Clean stale localStorage entry if it points to a cycle that's no longer accessible
  useEffect(() => {
    if (!cycles) return;
    if (lastCycleId && !accessibleCycleIds.has(lastCycleId)) {
      localStorage.removeItem("sei-last-cycle-id");
      setLastCycleId(null);
    }
  }, [cycles, lastCycleId, accessibleCycleIds]);

  const cycleTree = useMemo(
    () => (cycleId ? [...buildCycleTree(cycleId), EXECUTION_GROUP] : [EXECUTION_GROUP]),
    [cycleId]
  );

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col overflow-y-auto overflow-x-hidden py-3 transition-all duration-200",
        collapsed ? "w-14 px-1.5" : "w-[300px] px-3"
      )}
      style={{ backgroundColor: "var(--sidebar)" }}
    >
      {/* Header: ESTRATEGA logo + org switcher */}
      <div className={cn("mb-4", collapsed ? "flex justify-center" : "px-2")}>
        {collapsed ? (
          <button type="button" onClick={onToggle}
            className="flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-sidebar-accent"
            title="Expandir sidebar"
          >
            <img src="/logo-isotipo-white.png" alt="Estratega" className="size-7" />
          </button>
        ) : (
          <div className="relative">
            <button type="button"
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="flex w-full items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-sidebar-accent"
            >
              <img src="/logo-isotipo-white.png" alt="Estratega" className="size-8 shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <span className="text-[13px] font-medium block truncate" style={{ color: "var(--sidebar-accent-foreground)" }}>
                  {orgName}
                </span>
                <span className="text-[10px]" style={{ color: "var(--sidebar-foreground)" }}>
                  ESTRATEGA
                </span>
              </div>
              <ChevronRight
                className={cn("size-3.5 text-sidebar-foreground/50 transition-transform", orgDropdownOpen && "rotate-90")}
              />
            </button>
            {orgDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-sidebar-border p-1.5 shadow-lg"
                style={{ backgroundColor: "var(--popover)" }}
              >
                <div className="flex items-center gap-2 rounded-md bg-sidebar-accent p-2">
                  <img src="/logo-isotipo-white.png" alt="" className="size-5" />
                  <span className="text-[12px] font-medium text-white">{orgName}</span>
                  <CheckCircle className="size-3.5 ml-auto text-emerald-400" />
                </div>
                <button type="button" onClick={() => setOrgDropdownOpen(false)}
                  className="mt-1 flex w-full items-center gap-2 rounded-md p-2 text-[11px] text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  Cambiar organización...
                </button>
              </div>
            )}
            <button type="button" onClick={onToggle}
              className="absolute right-0 top-0 rounded-md p-1 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              title="Contraer sidebar"
            >
              <ChevronRight className="size-3.5 rotate-180" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      {collapsed ? (
        /* Collapsed: icon-only nav */
        <div className="flex flex-col items-center gap-1">
          <CollapsedNavItem href="/dashboard" icon={LayoutDashboard} label="Inicio" pathname={pathname} />
          {cycleId && (
            <>
              <CollapsedNavItem href={`/cycles/${cycleId}/m1-identity`} icon={Compass} label="M1 · Identidad" pathname={pathname} />
              <CollapsedNavItem href={`/cycles/${cycleId}/m2-diagnosis`} icon={Search} label="M2 · Diagnóstico" pathname={pathname} />
              <CollapsedNavItem href={`/cycles/${cycleId}/m3-formulation`} icon={Lightbulb} label="M3 · Formulación" pathname={pathname} />
              <CollapsedNavItem href={`/cycles/${cycleId}/m4-deployment`} icon={Rocket} label="M4 · Implementación" pathname={pathname} />
              <CollapsedNavItem href={`/cycles/${cycleId}/m5-control`} icon={BarChart3} label="M5 · Control" pathname={pathname} />
            </>
          )}
          <div className="my-1 h-px w-6 bg-sidebar-border" />
          <CollapsedNavItem href="/portfolio" icon={FolderKanban} label="Portafolio" pathname={pathname} />
          <CollapsedNavItem href="/projects" icon={Briefcase} label="Proyectos" pathname={pathname} />
          <CollapsedNavItem href="/my-tasks" icon={CheckCircle} label="Mis tareas" pathname={pathname} />
          <div className="mt-auto flex flex-col items-center gap-1 border-t border-sidebar-border pt-2">
            <CollapsedNavItem href="/admin/users" icon={Users} label="Miembros" pathname={pathname} />
            <CollapsedNavItem href="/settings" icon={Settings} label="Config" pathname={pathname} />
          </div>
        </div>
      ) : (
        /* Expanded: full tree nav */
        <>
          <TreeNode
            node={{ label: "Inicio", href: "/dashboard", icon: LayoutDashboard }}
            pathname={pathname}
            depth={0}
          />

          {cycleTree.map((node, i) => (
            <TreeNode
              key={node.label + i}
              node={node}
              pathname={pathname}
              depth={0}
            />
          ))}

          <div className="mt-auto flex flex-col gap-0.5 border-t border-sidebar-border pt-2">
            <TreeNode
              node={{ label: "Miembros", href: "/admin/users", icon: Users }}
              pathname={pathname}
              depth={0}
            />
            <TreeNode
              node={{ label: "Configuración", href: "/settings", icon: Settings }}
              pathname={pathname}
              depth={0}
            />
          </div>
        </>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Collapsed nav item (icon only)
// ---------------------------------------------------------------------------

function CollapsedNavItem({
  href,
  icon: Icon,
  label,
  pathname,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  pathname: string;
}) {
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={cn(
        "flex size-9 items-center justify-center rounded-md transition-all duration-150",
        isActive
          ? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
      title={label}
    >
      <Icon className="size-4" />
    </Link>
  );
}
