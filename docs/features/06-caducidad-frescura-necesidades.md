> ⚠️ **DEPRECADO** — ficha congelada como referencia histórica. El seguimiento de esta feature vive en **GitHub Issues**: implementada. No edites esta ficha; trabaja en el issue. Convención: ver `AGENTS.md` y [`00-indice.md`](00-indice.md).

# 06 · Caducidad y frescura de necesidades — Dominio: Núcleo necesidades/ofertas

> Caso de uso capturado del análisis de REDH para el roadmap de ReliefHub. Entregable independiente y abordable por separado.

## 1. Origen (qué hace REDH)

REDH muestra las necesidades con una vigencia máxima de 48 horas y presenta un aviso explícito: _"verifica antes de actuar: puede haber cambiado o estar resuelta"_. Las necesidades se listan ordenadas de más reciente a más antigua y desaparecen de la vista pública al superar ese umbral temporal, sin necesidad de que el coordinador cierre cada una manualmente.

## 2. Problema / valor para ReliefHub

Actualmente una necesidad validada (`status: public`) permanece visible indefinidamente. En contexto de emergencia esto genera ruido, frustración y acciones inútiles: alguien se desplaza a llevar agua a un punto que ya la recibió hace tres horas. La confianza en el sistema cae rápidamente si las tarjetas parecen obsoletas.

Un mecanismo de caducidad configurable, combinado con un badge visual de "no verificada recientemente", ofrece:

- **Confianza real**: el usuario sabe que lo que ve es fresco o, si no, lo sabe explícitamente.
- **Carga mínima para coordinadores**: caducidad automática en lugar de cierre manual de cientos de ítems.
- **Renovación activa**: el coordinador o el solicitante confirman que la necesidad sigue en pie, actuando como señal de vida.

## 3. Propuesta

### 3.1 Modelo (DDD/Hexagonal)

**Agregado afectado: `Need`** (contexto `needs`, `apps/api/src/needs/`).

Campos nuevos en la entidad de dominio `Need`:

```
expiresAt: Date | null       // timestamp absoluto; null = sin caducidad (gestionado por coordinador)
lastVerifiedAt: Date | null  // última vez que alguien confirmó que sigue vigente
```

`expiresAt` se calcula al publicar (`status` pasa a `public`) como `publishedAt + validityHours`, donde `validityHours` es un valor de configuración global (por defecto 48 h) que puede ser sobreescrito por emergencia o por prioridad de la necesidad.

Estados de dominio añadidos (sin romper el flujo actual `created → validated → public`):

- `expired`: la need superó `expiresAt` y se ocultó automáticamente de la vista pública.
- El estado `public` gana una propiedad derivada `stale: boolean` (true si `now - lastVerifiedAt > STALE_THRESHOLD`, p.ej. 6 h) que el frontend consume para mostrar el badge de alerta.

**Puerto de salida nuevo**: `NeedExpiryScheduler` — permite al dominio solicitar al sistema de infraestructura que evalúe la caducidad periódicamente (BullMQ delayed job o cron en la capa de infraestructura).

### 3.2 Casos de uso

| Caso de uso | Actor | Descripción |
|---|---|---|
| `SetNeedExpiry` | Sistema (al publicar) | Calcula `expiresAt` a partir de la configuración y lo persiste |
| `ExpireStaleNeeds` | Scheduler / Coordinador (trigger manual) | Busca needs `public` con `expiresAt < now`, las pasa a `expired` y emite `NeedExpiredEvent` |
| `RenewNeed` | Coordinador | Actualiza `lastVerifiedAt = now` y (opcionalmente) recalcula `expiresAt`; devuelve la need a `public` si estaba `expired` |
| `CloseNeedManually` | Coordinador | Cierre explícito (camino ya existente, sin modificaciones) |

### 3.3 API

```
PATCH /needs/:id/renew
  Body: { extendHours?: number }       // si se omite, usa la config global
  Auth: coordinador de la emergencia
  Response: NeedDto (con expiresAt, lastVerifiedAt actualizados)

GET /emergencies/:id/needs?status=expired
  Auth: coordinador
  Response: NeedDto[] (vista de archivo para coordinación)
```

El endpoint público `GET /emergencies/:id/needs` ya filtra por `status: public`; con el cambio también excluirá `expired` automáticamente.

**Migración Drizzle** (`apps/api/drizzle/000X_need_expiry.sql`):

```sql
ALTER TABLE needs
  ADD COLUMN expires_at      TIMESTAMPTZ,
  ADD COLUMN last_verified_at TIMESTAMPTZ;
```

> GOTCHA: aplicar a dev manualmente con `psql` tras generar la migración (ver nota en MEMORY sobre `drizzle-kit` en Windows).

### 3.4 Frontend (Atomic Design)

**Átomo nuevo: `FreshnessIndicator`** (`apps/web/src/components/atoms/freshness-indicator.tsx`)

- Si `stale === false` y `expiresAt` está a más de X horas: nada.
- Si `stale === true` o `expiresAt` a menos de 2 h: badge ámbar _"Verifica antes de actuar"_.
- Si `expired`: tarjeta oculta en vista pública (no renderizada).

**Molécula afectada: `NeedCard`** — integra `FreshnessIndicator` debajo del título.

**Organism afectado: `NeedsSection`** en la landing `/e/[slug]` — las necesidades se ordenan de más reciente a más antigua (`publishedAt desc`, comportamiento ya esperado; confirmar si no está así).

**Panel de coordinación** (`/coordinacion`):

- Nueva pestaña o sección _"Caducadas"_ con lista de needs `expired` y botón _"Renovar"_.
- El botón Renovar llama a `PATCH /needs/:id/renew` y actualiza la UI optimísticamente.

### 3.5 Encaje con lo existente

- El estado `public` existente no se modifica; `expired` es un nuevo estado terminal suave (reversible vía `RenewNeed`).
- Las ofertas dirigidas (`targetNeedId`) a una need `expired` no se cancelan automáticamente; el coordinador decide (ver F07).
- Reutiliza la cola de coordinación y los guards `RequireNeedCoordinatorGuard` existentes.
- El `NeedExpiryScheduler` puede implementarse con el worker BullMQ ya presente (Redis en docker-compose puerto 6380).

## 4. Alcance

### Primer corte (MVP)

- Campo `expiresAt` (48 h hardcodeado en configuración) calculado al publicar.
- Job programado (BullMQ, cada 15 min) que pasa needs vencidas a `expired`.
- Badge `FreshnessIndicator` en `NeedCard`.
- Filtro de needs `expired` fuera de la vista pública.
- Endpoint `PATCH /needs/:id/renew` accesible desde el panel de coordinación.

### Futuro

- `validityHours` configurable por emergencia y por prioridad (alta = 24 h, normal = 48 h, baja = 72 h).
- Notificación in-app al solicitante cuando su necesidad está próxima a caducar (integra contexto `notifications`).
- `lastVerifiedAt` actualizable también por el propio solicitante (autoconfirmación).
- Vigencia para offers y reports (campo `expiresAt` en esas entidades por el mismo mecanismo).

## 5. Dependencias

- **Internos:** contexto `needs` (agregado `Need`, repositorio Drizzle), contexto `notifications` (para alerta de próxima caducidad — solo en Futuro), BullMQ/Redis existente.
- **Externos:** ninguno.
- **Features previas requeridas:** ninguna (el contexto `needs` con flujo `created→validated→public` ya existe y está verificado).

## 6. Privacidad / seguridad / GDPR

- Las needs `expired` no se devuelven en endpoints públicos; solo el coordinador autenticado puede listarlas.
- `lastVerifiedAt` no contiene datos personales; es un timestamp de actividad del coordinador.
- El renovado por parte del coordinador queda registrado en `audit_log` (interceptor `AuditInterceptor` global ya en producción).
- El aviso _"verifica antes de actuar"_ reduce la exposición indirecta de datos sensibles de ubicación al desincentivar desplazamientos basados en información obsoleta.

## 7. Esfuerzo estimado

**S** (Small).

- Backend: migración (30 min) + campo en dominio + caso de uso `ExpireStaleNeeds` + `RenewNeed` + scheduler BullMQ (~3 h) + tests (~2 h).
- Frontend: átomo `FreshnessIndicator` + integración `NeedCard` + sección coordinación (~2 h).
- Total estimado: **1 día de desarrollo**.

## 8. Decisiones abiertas (para PM)

1. **¿Auto-cerrar (`expired`) o solo marcar como "no verificada recientemente" (`stale`)?** La propuesta MVP auto-archiva (oculta de vista pública) al caducar. Alternativa conservadora: solo mostrar badge ámbar y dejar la tarjeta visible. ¿Qué genera más confianza al ciudadano sin saturar al coordinador?

2. **¿Vigencia global (48 h para todas) o por prioridad?** Globalmente es más simple de comunicar; por prioridad es más realista (una necesidad crítica de agua debería caducar antes que una de ropa). ¿Arrancamos global y ajustamos en v2?

3. **¿Quién puede renovar?** Solo coordinador (propuesta MVP) o también el propio solicitante. El segundo reduce carga operativa pero abre la puerta a "renovaciones automáticas" sin verificación real.

4. **¿Qué pasa con las ofertas dirigidas a una need que caduca?** ¿Se mantienen en `matched`/`open` o se notifica al donante para que confirme? (Decisión que cruza con F07.)
