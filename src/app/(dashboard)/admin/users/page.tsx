"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  User,
  Mail,
  Phone,
  Shield,
  Briefcase,
  Pencil,
  UserX,
  UserCheck,
} from "lucide-react";
import { ROLES_LABELS, type Role } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROFILES = [
  { value: "DISENADOR", label: "Diseñador" },
  { value: "COMMUNITY_MANAGER", label: "Community Manager" },
  { value: "TRAFFIKER", label: "Traffiker" },
  { value: "GERENTE", label: "Gerente" },
  { value: "COMERCIAL", label: "Comercial" },
  { value: "JEFE_AREA", label: "Jefe de Área" },
  { value: "DESARROLLADOR", label: "Desarrollador" },
  { value: "ANALISTA", label: "Analista" },
  { value: "OTRO", label: "Otro" },
] as const;

const PROFILE_LABELS: Record<string, string> = Object.fromEntries(
  PROFILES.map((p) => [p.value, p.label])
);

const ROLES = [
  { value: "ADMIN", label: "Administrador" },
  { value: "ALTA_DIRECCION", label: "Alta Dirección" },
  { value: "GERENTE", label: "Gerente" },
  { value: "JEFE_PROYECTO", label: "Jefe de Proyecto" },
  { value: "ANALISTA", label: "Analista" },
  { value: "MIEMBRO_EQUIPO", label: "Miembro de Equipo" },
  { value: "SOLO_LECTURA", label: "Solo Lectura" },
] as const;

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-transparent text-red-700 dark:bg-transparent dark:text-red-400",
  ALTA_DIRECCION: "bg-transparent text-purple-700 dark:bg-transparent dark:text-purple-400",
  GERENTE: "bg-primary/15 text-primary dark:bg-primary/90/30 dark:text-primary",
  JEFE_PROYECTO: "bg-transparent text-teal-700 dark:bg-transparent dark:text-teal-400",
  ANALISTA: "bg-transparent text-yellow-700 dark:bg-transparent dark:text-yellow-400",
  MIEMBRO_EQUIPO: "bg-transparent text-gray-700 dark:bg-transparent dark:text-gray-300",
  SOLO_LECTURA: "bg-transparent text-gray-500 dark:bg-transparent dark:text-gray-500",
};

// ---------------------------------------------------------------------------
// Admin Users Page
// ---------------------------------------------------------------------------

export default function AdminUsersPage() {
  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.user.list.useQuery();

  const createUser = trpc.user.create.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      setCreateOpen(false);
      resetForm();
    },
  });

  const updateUser = trpc.user.update.useMutation({
    onSuccess: () => {
      utils.user.list.invalidate();
      setEditingUser(null);
    },
  });

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("MIEMBRO_EQUIPO");
  const [profile, setProfile] = useState("");

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setRole("MIEMBRO_EQUIPO");
    setProfile("");
  }

  // Edit
  const [editingUser, setEditingUser] = useState<{
    id: string; name: string; role: string; phone: string; profile: string;
  } | null>(null);

  const activeUsers = (users ?? []).filter((u) => u.active);
  const inactiveUsers = (users ?? []).filter((u) => !u.active);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-left">Administración de Usuarios</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona los miembros de tu organización
          </p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
          <Plus className="size-4" />
          Crear usuario
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* User cards */}
      {!isLoading && (
        <div className="space-y-3">
          {activeUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex items-center gap-4 p-4">
                {/* Avatar */}
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="size-5 text-primary" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{user.name}</span>
                    <Badge className={`text-[10px] ${ROLE_COLORS[user.role] ?? ""}`}>
                      {ROLES_LABELS[user.role as Role] ?? user.role}
                    </Badge>
                    {user.profile && (
                      <Badge variant="outline" className="text-[10px]">
                        {PROFILE_LABELS[user.profile] ?? user.profile}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="size-3" />
                      {user.email}
                    </span>
                    {user.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="size-3" />
                        {user.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() =>
                      setEditingUser({
                        id: user.id,
                        name: user.name,
                        role: user.role,
                        phone: user.phone ?? "",
                        profile: user.profile ?? "",
                      })
                    }
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => updateUser.mutate({ id: user.id, active: false })}
                    title="Desactivar usuario"
                  >
                    <UserX className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Inactive */}
          {inactiveUsers.length > 0 && (
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Usuarios inactivos ({inactiveUsers.length})
              </h3>
              {inactiveUsers.map((user) => (
                <Card key={user.id} className="opacity-60">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-muted-foreground line-through">
                          {user.name}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => updateUser.mutate({ id: user.id, active: true })}
                    >
                      <UserCheck className="size-3.5" />
                      Reactivar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Create Dialog ---- */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear nuevo usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nombre completo</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="space-y-1">
                <Label>Correo electrónico</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@empresa.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+51 999 999 999"
                />
              </div>
              <div className="space-y-1">
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Perfil</Label>
                <Select value={profile || "__none__"} onValueChange={(v) => setProfile(v === "__none__" ? "" : (v ?? ""))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar perfil">
                      {(val: string) => {
                        if (!val || val === "__none__") return "Seleccionar perfil";
                        return PROFILE_LABELS[val] ?? val;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin perfil</SelectItem>
                    {PROFILES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Rol en el sistema</Label>
                <Select value={role} onValueChange={(v) => setRole(v ?? "MIEMBRO_EQUIPO")}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(val: string) => ROLES.find((r) => r.value === val)?.label ?? val}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                createUser.mutate({
                  name: name.trim(),
                  email: email.trim(),
                  password,
                  phone: phone.trim() || undefined,
                  profile: profile || undefined,
                  role,
                })
              }
              disabled={
                !name.trim() || !email.trim() || password.length < 6 || createUser.isPending
              }
            >
              Crear usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Edit Dialog ---- */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Nombre completo</Label>
                <Input
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  placeholder="+51 999 999 999"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Perfil</Label>
                  <Select
                    value={editingUser.profile || "__none__"}
                    onValueChange={(v) =>
                      setEditingUser({ ...editingUser, profile: v === "__none__" ? "" : (v ?? "") })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sin perfil">
                        {(val: string) => {
                          if (!val || val === "__none__") return "Sin perfil";
                          return PROFILE_LABELS[val] ?? val;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin perfil</SelectItem>
                      {PROFILES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Rol</Label>
                  <Select
                    value={editingUser.role}
                    onValueChange={(v) =>
                      setEditingUser({ ...editingUser, role: v ?? "MIEMBRO_EQUIPO" })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(val: string) => ROLES.find((r) => r.value === val)?.label ?? val}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!editingUser) return;
                updateUser.mutate({
                  id: editingUser.id,
                  name: editingUser.name.trim(),
                  role: editingUser.role,
                  phone: editingUser.phone.trim() || null,
                  profile: editingUser.profile || null,
                });
              }}
              disabled={!editingUser?.name.trim() || updateUser.isPending}
            >
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
