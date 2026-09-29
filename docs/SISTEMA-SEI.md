# SEI - Sistema Estrategico Integral

Plataforma web que integra el ciclo completo de gestion estrategica: desde el planeamiento gerencial (D'Alessio) hasta la ejecucion de proyectos (PMBOK + Jira), todo en un solo sistema.

---

## Resumen Ejecutivo

| Aspecto | Detalle |
|---|---|
| **Nombre** | SEI - Sistema Estrategico Integral |
| **Proposito** | Planeamiento estrategico + Ejecucion de proyectos + Seguimiento |
| **Metodologia** | D'Alessio (El Proceso Estrategico) + PMBOK + Agile/Scrum |
| **Usuarios** | Alta direccion, gerentes, jefes de proyecto, analistas, equipos |
| **Modelos de datos** | 45 tablas |
| **Routers API** | 25 modulos tRPC |
| **Paginas** | 33 vistas |
| **Lineas de codigo** | ~68,000 |

---

## Arquitectura Tecnica

### Stack

| Capa | Tecnologia | Version |
|---|---|---|
| **Framework** | Next.js (App Router, Turbopack) | 16.2.2 |
| **UI** | React | 19.2.4 |
| **Lenguaje** | TypeScript (strict, sin @ts-nocheck) | 5.x |
| **Estilos** | Tailwind CSS v4 + shadcn/ui (base-nova) | 4.x |
| **API** | tRPC (type-safe RPC) | 11.13 |
| **Base de datos** | SQLite (dev) / PostgreSQL (prod) via Prisma ORM | Prisma 6.19 |
| **Autenticacion** | NextAuth v5 beta (JWT + Credentials) | 5.0.0-beta |
| **Validacion** | Zod | 4.x |
| **State Management** | TanStack React Query | 5.96 |
| **Iconos** | Lucide React | 1.7 |
| **Notificaciones** | Sonner | 2.x |
| **Serialization** | SuperJSON | 2.x |

### Estructura de Directorios

```
estratega-v2/
├── prisma/
│   ├── schema.prisma        # 45 modelos, 709 lineas
│   ├── seed.ts              # Datos iniciales (org + admin + ciclo)
│   └── dev.db               # SQLite local
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, Register
│   │   ├── (dashboard)/     # Layout con sidebar + header
│   │   │   ├── page.tsx     # Home: lista de ciclos
│   │   │   ├── cycles/
│   │   │   │   ├── new/     # Crear ciclo
│   │   │   │   └── [cycleId]/
│   │   │   │       ├── m1-identity/    # 5 paginas
│   │   │   │       ├── m2-diagnosis/   # 10 paginas
│   │   │   │       ├── m3-formulation/ # 5 paginas
│   │   │   │       └── m4-deployment/  # 1 pagina
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx            # Lista proyectos
│   │   │   │   └── [projectId]/
│   │   │   │       ├── layout.tsx      # Header + tabs
│   │   │   │       ├── board/          # Kanban
│   │   │   │       ├── backlog/        # Sprint planning
│   │   │   │       ├── sprints/        # Gestion de sprints
│   │   │   │       ├── timeline/       # Gantt
│   │   │   │       └── settings/       # Configuracion
│   │   │   ├── admin/users/
│   │   │   └── settings/
│   │   └── api/
│   │       ├── auth/[...nextauth]/     # NextAuth endpoints
│   │       └── trpc/[trpc]/            # tRPC handler
│   ├── server/
│   │   ├── auth.ts          # NextAuth config
│   │   ├── db.ts            # Prisma singleton
│   │   ├── trpc/
│   │   │   ├── init.ts      # Router, procedures, middleware
│   │   │   ├── context.ts   # Auth context
│   │   │   └── router.ts    # App router (25 sub-routers)
│   │   └── routers/         # 25 archivos de routers
│   ├── components/
│   │   ├── layout/          # Sidebar (arbol jerarquico), Header
│   │   ├── providers/       # tRPC, Session
│   │   └── ui/              # shadcn/ui components
│   └── lib/
│       ├── constants.ts     # Roles, PESTE variables, etc.
│       ├── trpc.ts          # tRPC client
│       └── utils.ts         # Helpers
└── .env                     # Variables de entorno
```

### Seguridad y Roles

7 niveles jerarquicos de acceso:

| Rol | Nivel | Permisos |
|---|---|---|
| ADMIN | 100 | Todo |
| ALTA_DIRECCION | 90 | Lectura + escritura estrategica |
| GERENTE | 70 | Lectura + escritura |
| JEFE_PROYECTO | 60 | Lectura + escritura |
| ANALISTA | 50 | Lectura + escritura |
| MIEMBRO_EQUIPO | 30 | Lectura |
| SOLO_LECTURA | 10 | Solo lectura |

- **protectedProcedure**: requiere autenticacion
- **editorProcedure**: requiere rol ANALISTA o superior
- **adminProcedure**: solo ADMIN

---

## Modulos Funcionales

### M1 - Identidad Estrategica

Define quienes somos, a donde vamos y que nos guia.

| Componente | Descripcion |
|---|---|
| **Vision** | Declaracion de vision con horizonte temporal. Toggle activa/inactiva. Versionado. |
| **Mision** | Declaracion de mision con componentes. Toggle activa/inactiva. Versionado. |
| **Valores** | Valores organizacionales con descripcion y comportamientos esperados. |
| **Codigo de Etica** | Normas eticas por categoria. |
| **Intereses Organizacionales** | Clasificados por intensidad (vital, importante, periferico). Aliados, neutrales, adversarios. |
| **Principios Cardinales** | Influencia de terceras partes, lazos pasados/presentes, contrabalance de intereses, conservacion de enemigos. |

### M2 - Diagnostico Situacional

Evaluacion integral del entorno externo e interno. Sigue la metodologia D'Alessio.

#### Analisis Externo

| Componente | Descripcion |
|---|---|
| **PESTE (Macroentorno)** | 5 dimensiones: Politico, Economico, Social, Tecnologico, Ecologico. Variables primarias y secundarias precargas del libro de D'Alessio (Tablas 5.1-5.5). Seleccion via checkboxes + variables personalizadas. Evaluacion: tipo (O/A), impacto (1-5), probabilidad (1-5), tendencia, fuente. |
| **Porter (Microentorno)** | 5 fuerzas competitivas con preguntas predefinidas y sliders (1-5). Score promedio por fuerza. Atractividad general. Factores O/A derivados para MEFE. |
| **MEFE** | Matriz de Evaluacion de Factores Externos. Importa desde PESTE + Porter. Peso (0-1, suma=1), rating (1-4), score ponderado. Alerta si < 2.5. |
| **Analisis Competitivo** | 10 criterios de la industria. Item 1: rango de crecimiento. Items 2-10: escala 1-10 con labels bipolares. |
| **Atractividad de la Industria** | 15 factores (D'Alessio). Puntaje 0-10 por factor. Total sobre 150. |
| **MPC** | Matriz de Perfil Competitivo. Importa factores desde analisis competitivo + atractividad. Evalua contra competidores (rating 1-4). Score total por competidor. |

#### Analisis Interno

| Componente | Descripcion |
|---|---|
| **AMOFHIT** | 7 areas funcionales: Administracion, Marketing, Operaciones, Finanzas (incluye Ratios Financieros), RRHH, Informacion, Tecnologia. Hallazgos clasificados como Fortaleza/Debilidad. |
| **Ratios Financieros** | Integrado en AMOFHIT (area F). 4 categorias: Liquidez, Gestion, Solvencia, Rentabilidad. Formula, valor, benchmark, año. |
| **MEFI** | Matriz de Evaluacion de Factores Internos. Importa desde AMOFHIT. Mismo esquema que MEFE pero con tipo F/D. |

#### Consolidado

| Componente | Descripcion |
|---|---|
| **FODA** | Vista consolidada 2x2. Fortalezas (verde), Oportunidades (azul), Debilidades (amarillo), Amenazas (rojo). Ordenados por score. Alimentado por MEFE + MEFI. |

#### Flujo de Datos M2

```
MACROENTORNO              MICROENTORNO
    PESTE ──────────┐         Porter ────────┐
    (P,E,S,T,E)    │         (5 Fuerzas)    │
                    └────┬───────────────────┘
                         ▼
                       MEFE (resumen externo)
                         │
    Comp. + Atract. ──► MPC (perfil competitivo)
                         │
    AMOFHIT ──────────► MEFI (resumen interno)
         │                │
         └────────┬───────┘
                  ▼
                FODA
```

### M3 - Formulacion Estrategica

Generacion y seleccion de estrategias.

| Componente | Descripcion |
|---|---|
| **OLP** | Objetivos de Largo Plazo con metricas, valores actual/meta, unidad, perspectiva BSC (Financiera, Clientes, Procesos, Aprendizaje). |
| **FODA Cruzado** | Generacion de estrategias cruzando F/O/D/A. 4 cuadrantes: FO (Explotar), FA (Confrontar), DO (Buscar), DA (Evitar). Codigo auto-generado. |
| **Estrategias** | Listado y gestion de estrategias agrupadas por cuadrante FODA. |
| **PEYEA** | 4 dimensiones: Fuerza Financiera, Ventaja Competitiva, Estabilidad del Entorno, Fuerza de la Industria. Factores con puntaje. Calculo de vector (X,Y). Determinacion de cuadrante: Agresivo, Competitivo, Conservador, Defensivo. |

### M4 - Despliegue Estrategico

Traduce las estrategias en estructura ejecutable segun PMBOK.

| Componente | Descripcion |
|---|---|
| **Ejes Estrategicos** | Agrupacion tematica de objetivos (ej: Crecimiento, Innovacion, Eficiencia). Color personalizable. |
| **Portafolios** | Conjunto de programas y/o proyectos alineados a un eje. Puede contener programas o proyectos directamente (PMBOK). |
| **Programas** | Conjunto de proyectos relacionados dentro de un portafolio. Fechas, responsable, estado. |

#### Jerarquia PMBOK

```
Eje Estrategico
└── Portafolio
    ├── Programa
    │   └── Proyecto
    └── Proyecto (directo)
```

### M5 - Gestion de Proyectos (tipo Jira)

Sistema completo de gestion de proyectos con todas las funcionalidades de Jira.

#### Entidades del Proyecto

| Entidad | Descripcion |
|---|---|
| **Proyecto** | Key unico (ej: "SEI"), nombre, estado, vinculacion a portafolio/programa. |
| **Issues** | 5 tipos: Epic, Story, Task, Bug, Subtask. Jerarquia padre-hijo. Numero auto-incremental (SEI-1, SEI-2...). |
| **Workflow** | Estados personalizables por proyecto. 3 categorias: TODO, IN_PROGRESS, DONE. Colores. Default: Por Hacer, En Progreso, En Revision, Hecho. |
| **Sprints** | Ciclos de trabajo. Estados: Planificado, Activo, Completado. Objetivo, fechas. Issues se mueven entre sprints. |
| **Componentes** | Agrupacion de issues por modulo/area del proyecto. |
| **Labels** | Etiquetas con color personalizable. |
| **Versiones/Releases** | Planificacion de entregas. Estados: No liberada, Liberada, Archivada. |
| **Miembros** | Roles por proyecto: Admin, PM, Miembro, Viewer. |

#### Campos de un Issue

| Campo | Tipo | Descripcion |
|---|---|---|
| type | enum | EPIC, STORY, TASK, BUG, SUBTASK |
| summary | texto | Titulo corto |
| description | texto largo | Detalle |
| status | relacion | Estado del workflow |
| priority | enum | CRITICAL, HIGH, MEDIUM, LOW |
| resolution | enum | FIXED, WONT_FIX, DUPLICATE, CANNOT_REPRODUCE |
| assignee | relacion | Responsable |
| reporter | relacion | Quien lo creo |
| component | relacion | Modulo/area |
| sprint | relacion | Sprint asignado |
| version | relacion | Release planificado |
| parent | relacion | Issue padre (jerarquia) |
| storyPoints | numero | Estimacion en puntos |
| estimateHours | numero | Estimacion en horas |
| timeSpent | numero | Horas registradas |
| startDate | fecha | Inicio planificado |
| dueDate | fecha | Fecha limite |
| resolvedAt | fecha | Cuando se resolvio |

#### Funcionalidades de Issues

| Funcionalidad | Descripcion |
|---|---|
| **Comentarios** | Agregar, editar, eliminar comentarios por issue. |
| **Historial** | Log automatico de cada cambio (campo, valor anterior, valor nuevo, quien, cuando). |
| **Vinculacion** | Links entre issues: BLOCKS, RELATES_TO, DUPLICATES. |
| **Watchers** | Seguir issues sin ser asignado. Toggle follow/unfollow. |
| **Time Tracking** | Registrar horas trabajadas por dia con notas. Suma automatica en timeSpent. |
| **Adjuntos** | Archivos adjuntos con nombre, URL, tamaño, tipo MIME. |
| **Labels** | Multiples etiquetas por issue. |
| **Filtros** | Busqueda por tipo, estado, asignado, sprint, prioridad, texto. |

#### Vistas del Proyecto

| Vista | Descripcion |
|---|---|
| **Board (Kanban)** | Columnas por estado del workflow. Cards con tipo, key, summary, prioridad, asignado. Cambio de estado via dropdown. Crear issue rapido. |
| **Backlog** | Secciones: Sprint Activo, Sprints Planificados, Backlog (sin sprint). Seleccion multiple para mover issues entre sprints. Crear sprint e issues. |
| **Sprints** | Lista de sprints con estado, objetivo, fechas, conteo de issues, story points. Expandible para ver issues. Iniciar/completar sprint. |
| **Timeline (Gantt)** | Vista horizontal con rango de meses configurable. Barras por startDate/dueDate. Colores por estado (gris=TODO, azul=In Progress, verde=Done). Linea de hoy. |
| **Settings** | 6 tabs: General, Workflow, Componentes, Labels, Versiones, Miembros. |

---

## Modelo de Datos

### Diagrama de Relaciones

```
Organization ─── User ─── Session/Account
     │
     └── StrategicCycle
              │
              ├── M1: Vision, Mission, Value, EthicsCode, Interest, CardinalPrinciple
              │
              ├── M2: PestecFactor, PorterAnalysis, MefeFactor, CompetitiveAnalysis,
              │       IndustryAttractiveness, MpcFactorDef, MpcCompetitor, MpcScore,
              │       AmofhitArea, MefiFactor, FinancialRatio
              │
              ├── M3: Olp, Strategy, StrategyOlp, PeyeaAnalysis, McpeEvaluation
              │
              └── M4: StrategicAxis ── Portfolio ── Program ── Project
                                                         │
                                                    Project
                                                    ├── ProjectMember
                                                    ├── WorkflowStatus
                                                    ├── Component
                                                    ├── Label
                                                    ├── Version
                                                    ├── Sprint
                                                    └── Issue
                                                         ├── IssueLabel
                                                         ├── IssueLink
                                                         ├── IssueComment
                                                         ├── IssueAttachment
                                                         ├── IssueHistory
                                                         ├── IssueWatcher
                                                         └── TimeEntry
```

### Estadisticas

| Metrica | Valor |
|---|---|
| Modelos Prisma | 45 |
| Routers tRPC | 25 |
| Paginas/Vistas | 33 |
| Componentes UI | ~20 (shadcn) |
| Lineas de codigo | ~68,000 |
| Commits | 11 |

---

## Credenciales de Desarrollo

| Campo | Valor |
|---|---|
| URL | http://localhost:3000 |
| Email | admin@demo.com |
| Password | la que muestra `npm run db:seed` (o `SEED_ADMIN_PASSWORD`) |
| Organizacion | Organizacion Demo |
| Ciclo | Plan Estrategico 2025-2030 |

---

## Flujo Completo del Sistema

```
PLANEAMIENTO                                    EJECUCION
────────────                                    ─────────

M1 Identidad                                    M4 Despliegue
├── Vision                                      ├── Ejes Estrategicos
├── Mision                                      ├── Portafolios
├── Valores                                     └── Programas
└── Intereses                                        │
       │                                             ▼
       ▼                                        M5 Proyectos
M2 Diagnostico                                  ├── Board (Kanban)
├── Externo: PESTE + Porter → MEFE + MPC        ├── Backlog
├── Interno: AMOFHIT → MEFI                     ├── Sprints
└── Consolidado: FODA                           ├── Timeline (Gantt)
       │                                        └── Settings
       ▼
M3 Formulacion
├── OLP (Objetivos)
├── FODA Cruzado (Estrategias)
├── PEYEA (Posicionamiento)
└── Estrategias retenidas
       │
       └──────────────────────────────────────► Proyectos
```
