# Arquitectura del Sistema — Estratega v2

## Stack Tecnologico

| Capa | Tecnologia | Version |
|------|-----------|---------|
| Framework | Next.js | 16.2.2 |
| UI | React | 19.2.4 |
| Lenguaje | TypeScript | 5.x |
| Estilos | Tailwind CSS | 4.x |
| Componentes UI | shadcn/ui + Lucide Icons | - |
| API | tRPC | 11.16.0 |
| ORM | Prisma | 6.19.3 |
| Base de datos | PostgreSQL (Neon) | - |
| Autenticacion | NextAuth v5 | 5.0.0-beta.30 |
| Validacion | Zod | 4.3.6 |
| State management | TanStack Query | 5.96.2 |
| Notificaciones | Sonner | - |
| Storage | AWS S3 | - |
| Deploy | Vercel | - |
| CI/CD | GitHub Actions → Cloudflare Pages (alt) | - |

---

## Estructura de Directorios

```
estratega-v2/
├── prisma/
│   ├── schema.prisma          # 48 modelos, enums, relaciones
│   ├── seed.ts                # Datos iniciales
│   └── migrate-members.ts     # Script de migracion de membresías
├── src/
│   ├── app/                   # Next.js App Router (37 paginas)
│   │   ├── (auth)/            # Rutas publicas/auth
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── onboarding/    # Flujo obligatorio post-registro
│   │   │   ├── invite/[token]/
│   │   │   └── join/
│   │   ├── (dashboard)/       # Rutas protegidas
│   │   │   ├── page.tsx       # Dashboard principal
│   │   │   ├── layout.tsx     # Layout con sidebar + header + guard
│   │   │   ├── admin/users/
│   │   │   ├── settings/
│   │   │   ├── projects/
│   │   │   └── cycles/[cycleId]/
│   │   │       ├── m1-identity/    # Vision, Mision, Valores, Intereses
│   │   │       ├── m2-diagnosis/   # PESTEC, Porter, MEFE, MEFI, AMOFHIT, MPC
│   │   │       ├── m3-formulation/ # OLP, FODA Cruzado, PEYEA, Estrategias
│   │   │       └── m4-deployment/  # Ejes, Portafolios, Programas
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── trpc/[trpc]/
│   │   │   └── upload/
│   │   └── layout.tsx         # Root layout (providers)
│   ├── server/
│   │   ├── auth.ts            # NextAuth config, JWT callbacks
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── trpc/
│   │   │   ├── init.ts        # tRPC procedures (protected, cycle, project, etc.)
│   │   │   ├── context.ts     # tRPC context (session, db, userId, orgId)
│   │   │   └── router.ts      # App router (29 sub-routers)
│   │   └── routers/           # 29 routers tRPC
│   │       ├── onboarding.ts
│   │       ├── organizations.ts
│   │       ├── invitations.ts
│   │       ├── members.ts
│   │       ├── cycle.ts
│   │       ├── user.ts
│   │       ├── vision.ts, mission.ts, values.ts, interests.ts
│   │       ├── pestec.ts, porter.ts, mefe.ts, mefi.ts, amofhit.ts
│   │       ├── mpc.ts, competitive-analysis.ts, industry-attractiveness.ts
│   │       ├── olp.ts, strategy.ts, peyea.ts
│   │       ├── strategic-axis.ts, portfolio.ts, program.ts
│   │       ├── project.ts, issue.ts, sprint.ts, project-config.ts
│   │       └── ratios.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx    # Navegacion principal con arbol de modulos
│   │   │   └── header.tsx     # Barra superior con info de usuario
│   │   ├── settings/
│   │   │   └── invite-panel.tsx
│   │   └── ui/                # 24 componentes shadcn/ui
│   ├── hooks/
│   │   ├── use-organization.ts
│   │   └── use-permission.ts
│   ├── lib/
│   │   ├── permissions.ts     # Mapa de permisos por OrgRole
│   │   ├── session.ts         # Helpers server-side de sesion
│   │   ├── constants.ts       # Roles, labels, configuracion
│   │   ├── trpc.ts            # tRPC client React
│   │   ├── utils.ts           # cn() y utilidades
│   │   └── *-data.ts          # Datos de evaluacion (PESTEC, Porter, etc.)
│   └── middleware.ts          # Auth middleware (cookie check)
├── package.json
├── tsconfig.json
└── wrangler.jsonc             # Config Cloudflare Workers (alt deploy)
```

---

## Modelo de Datos (Prisma)

### Multi-tenancy y Autenticacion

```
Organization ──< OrganizationMember >── User
     │                                    │
     ├── OrganizationInvitation           ├── activeOrganizationId → Organization
     │                                    ├── onboardingCompleted
     └── StrategicCycle                   └── onboardingStep
           │
           └── ModuleStatus (M1-M5)
```

### Roles de Organizacion

```
enum OrgRole {
  PROPIETARIO     // Creador, unico, no transferible
  ADMINISTRADOR   // Designado por propietario
  MIEMBRO         // Invitado que acepto
}
```

### Modulos Estrategicos (M1-M5)

Todos los modelos de contenido tienen `organizationId` + `cycleId`:

```
Organization ──< StrategicCycle ──< Vision
                                ──< Mission
                                ──< Value, EthicsCode
                                ──< Interest, CardinalPrinciple
                                ──< PestecFactor
                                ──< PorterAnalysis
                                ──< MefeFactor, MefeState
                                ──< CompetitiveAnalysis
                                ──< IndustryAttractiveness
                                ──< MpcFactorDef, MpcCompetitor, MpcScore
                                ──< AmofhitArea
                                ──< MefiFactor, MefiState
                                ──< AreaSynthesis, InternalReport
                                ──< FinancialRatio
                                ──< Olp, Strategy, StrategyOlp
                                ──< PeyeaAnalysis, McpeEvaluation
                                ──< StrategicAxis
                                ──< Portfolio ──< Program ──< Project
```

### Gestion de Proyectos

```
Project ──< Issue (EPIC, STORY, TASK, BUG, SUBTASK)
        ──< Sprint
        ──< ProjectMember
        ──< WorkflowStatus
        ──< Component, Label, Version
Issue ──< IssueComment, IssueAttachment, IssueHistory
      ──< IssueLabel, IssueLink, IssueWatcher, TimeEntry
```

---

## Arquitectura de Seguridad

### Aislamiento por Organizacion

Cada dato pertenece a una organizacion. El aislamiento se implementa en 3 capas:

```
┌─────────────────────────────────────────────────┐
│  Capa 1: Middleware (middleware.ts)              │
│  → Verifica cookie de sesion                    │
│  → Redirige no autenticados a /login            │
├─────────────────────────────────────────────────┤
│  Capa 2: tRPC Procedures                        │
│  → protectedProcedure: requiere userId + orgId  │
│  → cycleProcedure: verifica cycle pertenece a   │
│    la org del usuario                           │
│  → projectProcedure: verifica project.orgId     │
│  → authOnlyProcedure: solo requiere userId      │
│    (para onboarding y queries de org)           │
├─────────────────────────────────────────────────┤
│  Capa 3: Verificacion inline                    │
│  → update/delete por id verifican ownership     │
│    via record → cycle → organizationId          │
└─────────────────────────────────────────────────┘
```

### Permisos por Rol

```typescript
PERMISSIONS = {
  ORG_INVITE_MEMBERS:  [PROPIETARIO, ADMINISTRADOR]
  ORG_MANAGE_ROLES:    [PROPIETARIO]
  ORG_EDIT_SETTINGS:   [PROPIETARIO, ADMINISTRADOR]
  ORG_DELETE:          [PROPIETARIO]
  ORG_CREATE_CYCLE:    [PROPIETARIO]
  ORG_DELETE_CYCLE:    [PROPIETARIO]
  STRATEGIC_VIEW:      [PROPIETARIO, ADMINISTRADOR, MIEMBRO]
  STRATEGIC_EDIT:      [PROPIETARIO, ADMINISTRADOR, MIEMBRO]
  PROJECT_VIEW:        [PROPIETARIO, ADMINISTRADOR, MIEMBRO]
  PROJECT_CREATE:      [PROPIETARIO, ADMINISTRADOR]
  MEMBERS_VIEW:        [PROPIETARIO, ADMINISTRADOR, MIEMBRO]
  MEMBERS_REMOVE:      [PROPIETARIO, ADMINISTRADOR]
}
```

---

## Flujos Principales

### Registro + Onboarding

```
Registro → Auto sign-in → /onboarding
  │
  ├── Camino A (sin invitacion):
  │   Paso 1: Crear organizacion (nombre, color)
  │   Paso 2: Invitar equipo (link/codigo, opcional)
  │   Paso 3: Crear ciclo estrategico (3-5 años)
  │   Paso 4: DONE → dashboard
  │
  └── Camino B (con token de invitacion):
      Auto-aceptar invitacion → MIEMBRO → dashboard
```

### Invitacion de Miembros

```
Propietario/Admin genera link + codigo de 6 chars
  │
  ├── Via link: /invite/[token] → verificar → unirse
  └── Via codigo: /join → ingresar codigo → verificar → unirse
```

### Navegacion Estrategica

```
Dashboard → Ciclo activo
  │
  ├── M1 Identidad: Vision, Mision, Valores, Intereses
  ├── M2 Diagnostico:
  │   ├── Externo: PESTEC, Porter, Competitivo, Atractividad, MPC, MEFE
  │   ├── Interno: AMOFHIT, MEFI
  │   └── Sintesis: FODA
  ├── M3 Formulacion: OLP, FODA Cruzado, PEYEA, Estrategias
  ├── M4 Implementacion: Ejes, Portafolios, Programas
  └── M5 Control BSC (pendiente)
```

---

## Comunicacion Cliente-Servidor

```
React Client ←→ tRPC (httpBatchLink + SuperJSON) ←→ Next.js API Route
                                                         │
                                                    Prisma ORM
                                                         │
                                                    PostgreSQL (Neon)
```

- **Sin fetch ni axios** — toda comunicacion via tRPC
- **SuperJSON** como transformer (soporta Date, Map, Set, etc.)
- **React Query** para cache, invalidacion, y estado de queries
- **Zod** para validacion de inputs en cada procedure

---

## Deploy

| Plataforma | Uso | URL |
|-----------|-----|-----|
| Vercel | Deploy principal | estratega-v2.vercel.app |
| Cloudflare Pages | Deploy alternativo (CI/CD) | estratega-v2.workers.dev |
| Neon | PostgreSQL serverless | - |
| GitHub | Repositorio + CI | mkt-inge3d/estratega-v2 |
