# 15 · Reporte ciudadano de validez de puntos (cerrado / no existe / mudado / desactualizado) — Dominio: Recursos · Mapa y calidad de datos

> **Solicitud de producto:** permitir que un usuario reporte un **centro logístico / punto de acopio** como **cerrado, inexistente, mudado o desactualizado**, de forma que coordinación reciba una señal accionable y el punto se marque visualmente como "dudoso" cuando varios ciudadanos coinciden. Entregable abordable por fases.
>
> **Tracking:** EPIC #120 · sub-issues #121 (backend) · #122 (API) · #123 (web ciudadano) · #124 (web coordinación).
>
> **Decisiones de producto ya tomadas** (PM, 2026‑06‑28):
> 1. **Acceso:** requiere **login** (reutiliza el flujo y permisos actuales; sin superficie anónima en el MVP).
> 2. **Efecto:** **marcar el punto como "dudoso" tras N reportes** independientes — el punto **sigue visible** con un aviso; un **coordinador confirma** (cierra/oculta) o **descarta** (sigue abierto). *No* hay auto‑ocultado automático en el MVP.
> 3. **Motivos ofrecidos:** `cerrado` · `ya no existe en esta ubicación` · `se ha mudado / dirección incorrecta` · `datos desactualizados`.

---

## 1. Origen (qué se observó)

En una emergencia, los **puntos de acopio** envejecen rápido: cierran, se trasladan, cambian de horario o nunca existieron (datos importados de fuentes externas como **acopiove.org** — 574 puntos del `Terremoto Venezuela 2026`). Hoy un ciudadano que **va físicamente** a un punto y lo encuentra cerrado **no tiene forma de avisar**: la información sigue en el mapa, otros hacen el viaje en balde y la confianza en la plataforma cae.

La validez de un punto es exactamente el tipo de dato que **la multitud sobre el terreno** puede mantener fresco mejor que nadie — el mismo principio que la **frescura de necesidades** (ficha `06`), pero aplicado a la **existencia/operatividad del punto**.

---

## 2. Problema / valor para ResponseGrid

**Problema actual** (verificado en el código):

- El `Resource` ya tiene `publicStatus` con el valor **`closed`** (enum `hidden · active · saturated · paused · closed`, en `apps/api/src/contexts/resources/domain/resource-enums.ts`), pero **solo el dueño o un coordinador** pueden cambiarlo vía `POST /resources/:resourceId/status` (`UpdateResourcePublicStatus` valida propiedad/rol con `ResourceMembershipReader`). El **ciudadano de a pie no puede** señalar nada.
- Existe un flujo de reportes ciudadanos (`apps/web/.../e/[slug]/reportar` → `POST /emergencies/:id/reports`, tipos `incident · stock · status · other`), pero es **texto libre genérico**, cae en una cola del coordinador **sin estructura ni agregación**, y su relación con el punto es débil (solo guarda `resourceId`). No marca el punto ni acumula señales.
- **No existe** ningún mecanismo que **agregue la coincidencia de varios ciudadanos** sobre un mismo punto, ni que refleje "este punto está en duda" en mapa/ficha, ni que dé a coordinación una **cola priorizada de puntos a revisar**.
- Un `Resource` con `publicStatus = closed` **desaparece** del mapa y del listado público (los read models filtran a `[active, saturated, paused]`): perfecto como **resultado** de confirmar un cierre, pero hoy nadie alimenta esa transición desde el terreno.

**Valor:**

- **Datos frescos por crowdsourcing:** los puntos muertos se detectan y retiran rápido → menos viajes en balde, más confianza.
- **Señal estructurada y priorizada** para coordinación (cola de "puntos en revisión" con motivos y evidencia), en vez de notas sueltas.
- **Salvaguarda anti‑desinformación:** el efecto por defecto es un **aviso reversible**, no el ocultado automático; siempre confirma un humano.

---

## 3. Propuesta

### Arquitectura elegida (y alternativa considerada)

**Recomendado — concepto propio dentro del contexto `resources`.** La invariante de negocio "*N ciudadanos distintos reportan ⇒ el punto queda **en duda***" y su resolución ("*coordinador confirma cierre / descarta*") son **propiedades del `Resource`**. Mantenerlo dentro de `resources` evita acoplamiento entre contextos: la captura del reporte, el recuento, el umbral, el flag y la resolución viven en **un único bounded context**, sin eventos distribuidos.

> **Alternativa considerada — extender el contexto `reports`** (nuevo `type`/`reason` + agregación). Reutiliza el formulario `/reportar` y la cola de reportes, pero el flag "dudoso" pertenece al `Resource`, no al `Report`; obligaría a que `reports` conozca umbrales/agregación de recursos o a publicar un evento `reports → resources`. Mayor acoplamiento por menos código nuevo. Ver Decisión abierta nº 7.

### 3.1 Modelo (DDD / Hexagonal)

```
Resource (contexto resources, YA EXISTE) — se le añade una faceta de estado mutable:
  ├── publicStatus: PublicStatus        // hidden|active|saturated|paused|closed (ya existe)
  ├── verificationLevel: VerificationLevel
  ├── disputed: boolean                 // NUEVO — "en duda / posiblemente no válido"
  ├── disputedAt: Date | null           // NUEVO — desde cuándo
  └── (métodos de dominio)
        flagDisputed(at)   → disputed=true  + evento ResourceDisputed         // solo si está visible
        clearDispute()     → disputed=false + evento ResourceDisputeResolved
        // confirmar cierre reutiliza el método EXISTENTE changePublicStatus(Closed)

ResourceValidityReport (NUEVA entidad del contexto resources)
  ├── id: uuid
  ├── resourceId: ResourceId
  ├── emergencyId: EmergencyId
  ├── reporterUserId: string            // requiere login
  ├── reason: ValidityReason            // closed | nonexistent | moved | outdated
  ├── note: string | null               // texto libre opcional
  ├── photoUrls: string[]               // evidencia opcional (reutiliza /files)
  ├── status: 'open' | 'accepted' | 'dismissed'   // resolución del coordinador
  ├── createdAt: Date
  ├── resolvedByUserId: string | null
  └── resolvedAt: Date | null

ValidityReason (enum nuevo)
  closed        // "Cerrado / no operativo"
  nonexistent   // "Ya no existe en esta ubicación"
  moved         // "Se ha mudado / dirección incorrecta"
  outdated      // "Datos desactualizados (horario, contacto, qué acepta)"
```

**Invariantes:**

- `flagDisputed()` solo es válido si el punto está **visible** (`publicStatus ∈ {active, saturated, paused}`): no tiene sentido poner "en duda" algo ya oculto/cerrado.
- **Un reporte abierto por (recurso, usuario):** índice único parcial `UNIQUE (resource_id, reporter_user_id) WHERE status='open'`. Reenviar **actualiza** el reporte del usuario, no suma. → un usuario cuenta **una sola vez** en el recuento.
- **Umbral N (por defecto 3):** cuando el nº de reportes `open` **de usuarios distintos** alcanza N, el recurso pasa a `disputed=true`. Configurable (constante con override `RESOURCE_DISPUTE_THRESHOLD`; por‑emergencia → futuro).
- El **dueño** del punto no cuenta como reportante para disputar su propio punto (tiene `POST /resources/:id/status`). Ver Decisión abierta nº 2.
- `disputed` es **independiente** de `verificationLevel` (un punto `official` también puede caer en duda).

### 3.2 Casos de uso

| Caso de uso | Contexto | Descripción |
|---|---|---|
| `ReportResourceValidity` | `resources` | Ciudadano (autenticado) reporta validez. Valida que el recurso existe, es de la emergencia y es visible; **upsert** del reporte abierto del usuario; **recuenta** reportes abiertos distintos; si `≥ N` y no estaba en duda → `flagDisputed()`. Devuelve `{ id, disputed }`. |
| `ResolveResourceDispute` | `resources` | Coordinador resuelve. `confirm_closed` → `changePublicStatus(Closed)` + reportes abiertos a `accepted` + `clearDispute()`. `dismiss` → reportes a `dismissed` + `clearDispute()`. Authz: `resource:edit`. |
| `GetDisputedResources` | `resources` | Cola de coordinación: puntos `disputed=true` de la emergencia + desglose (recuento por motivo, nº de reportantes distintos, último reporte). |
| `GetResourceValidityReports` | `resources` | Detalle: los reportes individuales de un punto (motivo, nota, fotos, fecha) para el drawer del coordinador. |

> Los read models públicos existentes (`GetPublicResources`, `GetPublicResource`, `GetResourcesInBounds`, `GetNearbyResources`) se amplían para **exponer `disputed`** en la vista, sin cambiar su filtro de visibilidad (un punto en duda sigue `active`, por tanto sigue visible).

### 3.3 API

```
# Ciudadano (JWT, cualquier usuario autenticado — igual que POST /reports y registrar punto)
POST /resources/:resourceId/validity-reports
     body: { reason: 'closed'|'nonexistent'|'moved'|'outdated', note?: string, photoUrls?: string[] }
     → 201 { id, disputed }

# Coordinación (JWT + PermissionGuard)
GET  /emergencies/:emergencyId/coordination/disputed         # @RequirePermission('resource:read')
     → DisputedResourceDto[]  { resource, distinctReporters, byReason, lastReportedAt }
GET  /resources/:resourceId/validity-reports                 # @RequirePermission('resource:read')
     → ValidityReportDto[]
POST /resources/:resourceId/dispute/resolve                  # @RequirePermission('resource:edit')
     body: { resolution: 'confirm_closed'|'dismiss', note?: string }
     → 204

# Read models públicos (sin auth) — se añade `disputed` (+ `disputedSince`) al DTO existente
GET  /emergencies/:id/public/resources            → items[].disputed
GET  /emergencies/:id/public/resources/:resourceId → .disputed
GET  /emergencies/:id/public/resources/in-bounds   → items[].disputed
GET  /emergencies/:id/public/resources/nearby      → items[].disputed
```

**Permisos:** reutiliza los existentes `resource:read` (cola) y `resource:edit` (resolver). El envío ciudadano solo exige JWT, igual que `POST /emergencies/:id/reports` y el registro de puntos (no necesita permiso propio).

**Migración Drizzle** (`apps/api/drizzle/0031_resource_validity_reports.sql`; aplicar en dev y test vía `psql < f.sql`, *no* drizzle‑kit — cuelga en Windows):

```sql
ALTER TABLE resources ADD COLUMN disputed     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE resources ADD COLUMN disputed_at  TIMESTAMPTZ;

CREATE TABLE resource_validity_reports (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id        UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  emergency_id       UUID NOT NULL,
  reporter_user_id   UUID NOT NULL,
  reason             TEXT NOT NULL,                 -- closed | nonexistent | moved | outdated
  note               TEXT,
  photo_urls         TEXT[] NOT NULL DEFAULT '{}',
  status             TEXT NOT NULL DEFAULT 'open',   -- open | accepted | dismissed
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by_user_id UUID,
  resolved_at        TIMESTAMPTZ
);
-- 1 reporte abierto por (recurso, usuario) → cada fila open = un reportante distinto
CREATE UNIQUE INDEX resource_validity_one_open_per_user
  ON resource_validity_reports (resource_id, reporter_user_id) WHERE status = 'open';
CREATE INDEX resource_validity_open_by_resource
  ON resource_validity_reports (resource_id) WHERE status = 'open';
CREATE INDEX resource_validity_by_emergency
  ON resource_validity_reports (emergency_id);
CREATE INDEX resources_disputed_idx
  ON resources (emergency_id) WHERE disputed = true;
```

Tras tocar DTOs/endpoints: **`pnpm gen:api`** y commitear `packages/api-client/src/schema.ts`.

### 3.4 Frontend (Atomic Design)

| Capa | Componente | Descripción |
|---|---|---|
| Átomo | `DisputedBadge` | Pastilla "⚠ En verificación · posible cierre" (texto público **genérico**, no afirma "CERRADO"). |
| Molécula | `ValidityReasonGroup` | Radios con los 4 motivos (sobre `FormField` existente). |
| Organismo | `ReportValidityForm` | `useActionState` + server action `reportValidity` → `POST …/validity-reports`. Campos: motivo (req.), nota (opc.), `PhotoUploader` (opc.). Reutiliza `FormSuccessScreen`. |
| Organismo | `DisputedResourcesQueue` | Cola de coordinación: puntos en duda + desglose por motivo + evidencia, con acciones "Confirmar cierre" / "Descartar (sigue abierto)" → `POST …/dispute/resolve`. |
| Página/Modal | `…/e/[slug]/recursos/[resourceId]/reportar` | Flujo de reporte (auth‑gated: si no hay sesión, redirige a login con `returnUrl`, patrón ya usado en `/reportar` y `/donar`). |

**Puntos de entrada (CTA "¿Está cerrado o algo va mal? Avísanos"):**
- Popup del marcador en el mapa (`apps/web/src/components/organisms/emergency-map.tsx`).
- `PublicResourceCard` (`apps/web/src/components/organisms/public-resource-card.tsx`).
- Ficha de detalle del punto (`apps/web/src/app/e/[slug]/recursos/[resourceId]/page.tsx`).

**Mostrar el estado "dudoso":** `DisputedBadge` en card, ficha y popup; estilo de marcador diferenciado + **nueva entrada en la leyenda** del mapa para puntos en duda.

**i18n:** strings `es` + `en` (sección nueva junto a las de `reportar`).

### 3.5 Encaje con lo existente

- **`resources`:** solo añade 2 columnas (`disputed`, `disputed_at`) + 1 tabla; reutiliza `Resource`, `PublicResourceCard`, la cola de coordinación (`GET /emergencies/:id/coordination/queue` → se le suma la de `/disputed`) y `changePublicStatus(Closed)` para el cierre confirmado.
- **`reports`:** se mantiene tal cual para incidencias de campo libres (stock/incidente). El nuevo flujo es **estructurado y específico del punto**; en el futuro podrían unificarse (Decisión abierta nº 7).
- **`notifications`:** al disputar un punto se puede **avisar al dueño** ("Se han reportado problemas con tu punto"), reutilizando el patrón de `VerifyResource` (`NotificationsPort`).
- **`audit` / `metrics`:** los eventos `ResourceDisputed` / `ResourceDisputeResolved` se prestan a auditoría y a una métrica de "calidad de datos del directorio".
- **Frescura (ficha 06) y privacidad (ficha 09):** mismo espíritu de "verifica antes de actuar"; reutiliza el aviso de frescura ya presente en la UI.

---

## 4. Alcance

### Primer corte (MVP)
- Columnas `disputed`/`disputed_at` en `resources` + tabla `resource_validity_reports` + migración `0031`.
- Dominio: `flagDisputed` / `clearDispute` + eventos; entidad `ResourceValidityReport`; recuento distinto + umbral N (default 3).
- Casos de uso `ReportResourceValidity`, `ResolveResourceDispute`, `GetDisputedResources`, `GetResourceValidityReports`.
- Endpoints (envío ciudadano + cola/resolución coordinación) + `disputed` en los 4 read models públicos + `pnpm gen:api`.
- Web: flujo de reporte desde card/popup/ficha, `DisputedBadge`, cola de coordinación, leyenda, i18n.
- TDD: dominio (umbral, dedup, invariantes) + integración de endpoints.

### Futuro
- **Auto‑ocultado** opcional tras N como **política por emergencia** (la opción que el PM descartó por defecto, disponible como ajuste).
- **Umbral y ventana de frescura configurables por emergencia**; caducidad (TTL) de reportes abiertos antiguos con recuento.
- **Ponderación por confianza** del reportante (verificado/histórico) → híbrido/anónimo (la opción de acceso que se descartó).
- **Auto‑servicio del dueño**: "Confirmo que sigo abierto" limpia la duda; **cooldown** tras "descartar" para evitar re‑flag inmediato.
- **Unificar** con el contexto `reports` si se decide un único modelo de "señal ciudadana".
- Métricas de calidad de datos (puntos muertos detectados, tiempo hasta resolución) en `metrics`.

---

## 5. Dependencias

| Dependencia | Estado |
|---|---|
| Contexto `resources` (`Resource`, `publicStatus`, cola de coordinación) | ✅ Existe |
| Autenticación JWT + permisos `resource:read` / `resource:edit` | ✅ Existe (ficha 13) |
| `PhotoUploader`, `FormField`, `FormSuccessScreen`, patrón `useActionState` + server actions | ✅ Existe |
| `NotificationsPort` (aviso al dueño) | ✅ Existe (opcional) |
| `pnpm gen:api` tras nuevos endpoints | Obligatorio |
| Migración Drizzle vía `psql` (dev + `global-setup` de test) | Obligatorio |

---

## 6. Privacidad / seguridad / GDPR

- **`reporter_user_id` es interno**: nunca se expone en vistas públicas (evita represalias y señalar a quien reporta).
- **Badge público genérico** ("en verificación / posible cierre"), **sin** desglose de motivos ni recuentos públicos: afirmar "CERRADO" sobre una organización real **antes** de confirmación humana sería desinformación/difamación. El detalle por motivo es **solo para coordinación**.
- **Fotos ciudadanas**: pueden contener personas/PII → revisión por coordinación; **no** exponerlas públicamente en el MVP (Decisión abierta nº 4).
- **Anti‑abuso (con login):** un reporte abierto por (usuario, recurso) vía índice único; el dueño no dispara duda sobre su propio punto; el ocultado **nunca** es automático (lo confirma un humano). *Futuro:* rate‑limit por usuario y cooldown tras descartar.
- Respeta la **privacidad de ubicación** (ficha 09) ya existente.

---

## 7. Esfuerzo estimado

**M (~3–5 días)** — un solo contexto, gran reutilización de UI y permisos.

- Dominio + migración + casos de uso (umbral/dedup/resolución): **M** (~2 días, TDD).
- Endpoints + `disputed` en read models + `gen:api`: **S** (~1 día).
- Web (flujo de reporte + badge + cola de coordinación + i18n): **M** (~1,5–2 días).

---

## 8. Decisiones (resueltas — PM, 2026‑06‑28)

| # | Decisión | Resolución |
|---|---|---|
| 7 | **Arquitectura** | **Concepto propio en `resources`** (entidad `ResourceValidityReport` + flag `disputed` en `Resource`); sin acoplar con el contexto `reports`. |
| 1 | **Umbral N** | **N = 3** reportantes distintos. Constante global (override `RESOURCE_DISPUTE_THRESHOLD`); umbral por‑emergencia queda para futuro. |
| 4 | **Fotos ciudadanas** | **Solo coordinación** (no públicas): PII y riesgo de afirmar "cerrado" sin confirmar. |
| 3 | **Caducidad de reportes** | **Sin TTL en el MVP**: los reportes abiertos persisten hasta que coordinación resuelve. TTL/ventana de frescura = futuro. |
| 2 | **Excluir al dueño del recuento** | **Sí**: el dueño usa `POST /resources/:id/status`; no dispara duda sobre su propio punto. |
| 5 | **Texto del badge público** | **"En verificación · posible cierre"** (genérico; no afirma "CERRADO"). |
| 6 | **Cooldown tras "descartar"** | **No en el MVP**; se añadirá solo si aparece abuso de re‑marcado. |

> Revisables tras el MVP (ver §4 · Futuro): umbral por‑emergencia, TTL/ventana de frescura, ponderación por confianza del reportante, auto‑ocultado como política por emergencia y cooldown de reapertura.

---

## 9. Ajustes tras sincronizar `main` (2026‑06‑28)

Al traer `main`, varios cambios recientes **encajan** y **simplifican** esta feature:

- **Migración → `0031`** (no `0028`): `main` ocupó `0028`–`0030` (inventario de recursos, capacidad de transporte, expediciones, enriquecimiento del audit trail).
- **Auditoría "con motivo" reutilizada** (PR #135): `ResolveResourceDispute` devuelve `MutationAuditResult` (`apps/api/src/shared/domain/mutation-audit.ts`); el controlador adjunta el motivo con `setAuditContext` y el `AuditInterceptor` lo persiste en `audit_log` (visible en `/coordinacion/actividad`). Trazabilidad coordinador-only sin código de auditoría nuevo.
- **Resolución de 3 vías** (aprovecha `Resource.discard()` / `VerificationLevel.Rejected`, nuevos en `main`):
  - `confirm_closed` → `changePublicStatus(Closed)` (reversible).
  - `mark_invalid` → `Resource.markInvalid()` → `Rejected` (para "ya no existe"; sale de los listados públicos).
  - `dismiss` → `clearDispute()` (el punto sigue activo).
- **Permiso `resource:close`** (existía sin uso) → "confirmar cierre"; `resource:edit` / `resource:read` para el resto.
- **Coordinación por pestañas** (#117): la cola de #124 será una pestaña `/coordinacion/puntos-en-duda` reutilizando `CoordinationTabs`, `SearchBox`, `Pagination`, `ValidationActions` y el patrón `coordination-queues`.
- **`safeNextPath`** (#125): el flujo ciudadano (#123) lo reutiliza para el auth-gate; el formulario va como modal sobre `DetailDrawer`.
- **`Resource` ahora tiene `items: SupplyLine[]`** (inventario): ortogonal, sin impacto en la disputa.

**Estado:** el **backend (#121)** está implementado en este PR — dominio (`disputed`/`disputedAt`, `flagDisputed`/`clearDispute`/`markInvalid`, eventos), entidad `ResourceValidityReport`, migración `0031`, casos de uso (`ReportResourceValidity` con dedup + umbral, `ResolveResourceDispute` de 3 vías, `GetDisputedResources`, `GetResourceValidityReports`), repos (puerto + Drizzle + en memoria) y wiring. Gate verde (build · lint · prettier · test). Pendiente: API (#122) y web (#123/#124).
