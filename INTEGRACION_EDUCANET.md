# Integración Estratega → Educanet

Permite enviar un `Project` de Estratega a Educanet para que el equipo lo
ejecute como flujo operativo (tareas con Gantt, responsables, validación).

## Arquitectura

```
Estratega (plan)                    Educanet (operación)
─────────────────                   ────────────────────
Project + Issues                    Organization (multi-tenant)
   │                                  │
   ▼                                  WorkflowPlantilla
[Botón "Enviar a Educanet"]   ─────►  WorkflowInstancia
   │ POST /api/external/educanet/send │
   ▼                                  TareaInstancia[]
   POST {URL}/api/sync/from-estratega │
   X-Org-Slug: <slug>                 OrigenExterno (trazabilidad)
   X-Estratega-Signature: sha256=<hmac>
```

Push manual desde Estratega: en `Project > Settings > Educanet` el usuario
elige categoría + slug org destino, presiona "Enviar". Estratega firma el
payload con HMAC-SHA256 y POSTea a Educanet, que verifica firma, mapea por
categoría a una `WorkflowPlantilla`, crea `WorkflowInstancia` + `TareaInstancia`
ad-hoc, asigna por email.

## Variables de entorno

### En Estratega
```bash
EDUCANET_WEBHOOK_URL=https://educanet-ten.vercel.app
EDUCANET_WEBHOOK_SECRET=<secret-compartido>
```

### En Educanet
```bash
ESTRATEGA_WEBHOOK_SECRET=<mismo-secret-que-Estratega>
```

Alternativamente, cada `Organization` en Educanet puede tener su propio
`webhookSecret` en la DB. Si está set, prevalece sobre el env var (esto permite
secrets por cliente cuando vendas a múltiples orgs).

## Mapeo de datos

| Estratega                | →   | Educanet                           |
|--------------------------|-----|------------------------------------|
| `Project.id`             | →   | `OrigenExterno.sourceProjectId`    |
| `Project.name`           | →   | `WorkflowInstancia.nombre`         |
| `Project.description`    | →   | `WorkflowInstancia.contextoMarca`  |
| `Project.endDate`        | →   | `WorkflowInstancia.fechaHito`      |
| `Project.ownerId.email`  | →   | `WorkflowInstancia.responsableGeneralId` (match por email) |
| `body.categoria`         | →   | `WorkflowPlantilla.codigo`         |
| `body.orgSlug`           | →   | `Organization.slug`                |
| `Issue.summary`          | →   | `TareaInstancia.nombreAdHoc`       |
| `Issue.description`      | →   | `TareaInstancia.descripcionAdHoc`  |
| `Issue.assigneeId.email` | →   | `TareaInstancia.asignadoAId` (match por email; cae al owner si no se encuentra) |
| `Issue.dueDate`          | →   | `TareaInstancia.fechaEstimadaFin`  |
| `Issue.estimateHours × 60` | → | `TareaInstancia.tiempoEstimadoMaxAdHoc` |

### Categorías válidas

Deben existir como `WorkflowPlantilla.codigo` en la org destino:
- `WEBINAR`
- `CAMPANA_MARKETING`
- `LANZAMIENTO_CURSO`
- `EVENTO_PRESENCIAL`

### Negocios válidos (opcional)

`ANSYS | AUTODESK_MFG | AUTODESK_AEC | ORACLE | INGE3D | LYRACODE | CURSOS`

## Idempotencia

Educanet rechaza envíos duplicados por `(organizationId, sourceApp, sourceProjectId)`.
Reenviar el mismo `Project` retorna `duplicate: true` y la referencia
existente sin crear duplicados.

## Errores comunes

| HTTP | Causa                                                           |
|------|-----------------------------------------------------------------|
| 400  | Falta `X-Org-Slug` o body no es JSON válido                     |
| 401  | Firma HMAC inválida (secret mal configurado en alguno de los dos lados) |
| 404  | `orgSlug` no existe en Educanet                                 |
| 422  | Plantilla con código=categoría no existe en la org, o ownerEmail no es usuario activo |

## Setup inicial en un cliente nuevo

1. Crear `Organization` en Educanet (slug único).
2. Crear `WorkflowPlantilla` con codigos `WEBINAR`/`CAMPANA_MARKETING`/etc en esa org.
3. Crear usuarios con sus emails (que coincidan con los emails de Estratega).
4. Setear `webhookSecret` en `Organization` (o usar fallback env).
5. En Estratega: setear `EDUCANET_WEBHOOK_URL` y `EDUCANET_WEBHOOK_SECRET`.
6. Probar enviando un Project pequeño y verificar `OrigenExterno` en Educanet.
