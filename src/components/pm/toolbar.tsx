"use client";

import React, { useState } from "react";
import { Filter, Search, X, User, EyeOff, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PRIORITIES } from "@/lib/pm";
import { useWorkspace } from "./workspace-context";
import { PriorityFlag, UserAvatar } from "./primitives";

export function ViewToolbar({ children, className }: { children?: React.ReactNode; className?: string }) {
  const { filters, setFilters, activeFilterCount, ws } = useWorkspace();
  const [open, setOpen] = useState(false);

  const toggleIn = (key: "assigneeIds" | "priorities", v: string) =>
    setFilters((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));

  return (
    <div className={cn("flex flex-wrap items-center gap-2 border-b px-6 py-2.5", className)}>
      <div className="flex h-8 w-56 items-center gap-2 rounded-md border bg-transparent px-2 focus-within:border-primary/50">
        <Search className="size-3.5 text-muted-foreground" />
        <input
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          placeholder="Buscar tareas…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {filters.search && (
          <button type="button" onClick={() => setFilters((f) => ({ ...f, search: "" }))} aria-label="Limpiar búsqueda">
            <X className="size-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setFilters((f) => ({ ...f, onlyMine: !f.onlyMine }))}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm",
          filters.onlyMine ? "border-primary/60 bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <User className="size-3.5" /> Mis tareas
      </button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm",
            activeFilterCount - (filters.onlyMine ? 1 : 0) - (filters.search ? 1 : 0) > 0
              ? "border-primary/60 bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Filter className="size-3.5" /> Filtros
          {activeFilterCount - (filters.onlyMine ? 1 : 0) - (filters.search ? 1 : 0) > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {activeFilterCount - (filters.onlyMine ? 1 : 0) - (filters.search ? 1 : 0)}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Responsable</p>
              <div className="max-h-48 space-y-0.5 overflow-y-auto">
                {[{ id: "none", name: "Sin asignar" }, ...ws.users].map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleIn("assigneeIds", u.id)}
                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-accent"
                  >
                    <UserAvatar user={u.id === "none" ? null : u} size={20} />
                    <span className="flex-1 truncate text-left">{u.name}</span>
                    {filters.assigneeIds.includes(u.id) && <Check className="size-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Prioridad</p>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => toggleIn("priorities", p.value)}
                    className={cn(
                      "rounded-md border px-2 py-1",
                      filters.priorities.includes(p.value) ? "border-primary/60 bg-primary/10" : "hover:bg-accent",
                    )}
                  >
                    <PriorityFlag priority={p.value} showLabel />
                  </button>
                ))}
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.hideDone}
                onChange={(e) => setFilters((f) => ({ ...f, hideDone: e.target.checked }))}
                className="accent-[var(--primary)]"
              />
              <EyeOff className="size-3.5 text-muted-foreground" /> Ocultar completadas
            </label>
            {activeFilterCount > 0 && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setFilters({ search: "", assigneeIds: [], priorities: [], hideDone: false, onlyMine: false })}
              >
                Limpiar todos los filtros
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  );
}
