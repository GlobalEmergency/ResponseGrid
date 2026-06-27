# 07 · Oferta como compromiso/promesa de entrega — Dominio: Núcleo necesidades/ofertas

> Caso de uso capturado del análisis de REDH para el roadmap de ReliefHub. Entregable independiente y abordable por separado.

## 1. Origen (qué hace REDH)

En REDH, donar insumos es una **promesa de donación** vinculada a una necesidad publicada. El donante especifica cantidad, **fecha y hora de entrega**, **método de entrega** (presencial, envío, recogida por el receptor) y observaciones libres. La promesa puede registrarse offline (cola de envío), de modo que no se pierde si hay mala conectividad. El sistema da seguimiento a si la promesa se cumplió.

## 2. Problema / valor para ReliefHub

El contexto `offers` (F3) implementa la oferta dirigida a una need (`targetNeedId`) con estados `open → matched → fulfilled/cancelled`, pero se trata de un compromiso técnico gestionado por el coordinador sin que el donante ni el receptor tengan visibilidad del _cuándo_ y el _cómo_ de la entrega.

Sin estos datos, la coordinación es ciega: no sabe si el material está en camino, no puede dar confirmación al receptor, y no puede calcular la cobertura real de la necesidad (cuánto prometido vs cuánto entregado). Esto genera llegadas masivas al mismo punto o, al contrario, necesidades que nadie sabe si están siendo atendidas.

Añadir el **ciclo de cumplimiento** a la oferta dirigida transforma una asignación administrativa en un **compromiso rastreable** que:

- Da al donante autonomía para declarar su estado en tiempo real.
- Da al coordinador visibilidad de cobertura sin llamadas de teléfono.
- Da al receptor (punto de recurso o necesidad) expectativa de llegada.

## 3. Propuesta

### 3.1 Modelo (DDD/Hexagonal)

**Agregado afectado: `DonationOffer`** (contexto `offers`, `apps/api/src/offers/`).

Campos nuevos en el valor objeto de entrega (solo relevantes cuando `targetNeedId != null`):

```
deliveryDate:   Date | null      // fecha y hora acordada de entrega
deliveryMethod: DeliveryMethod   // enum: in_person | shipment | pickup_by_receiver
notes:          string | null    // observaciones libres del donante
```

**Nuevo enum `DeliveryMethod`** en `shared/domain` (ya que puede reutilizarse en voluntarios o recursos).

**Ciclo de cumplimiento extendido** (estado de la oferta cuando está dirigida a una need):

```
open → matched → pledged → in_transit → delivered
                         ↘ no_show
                ↘ cancelled
```

- `pledged`: la oferta fue aceptada/matcheada Y el donante ha confirmado los detalles de entrega.
- `in_transit`: el donante declara que el material está en camino.
- `delivered`: el receptor o el coordinador confirma la entrega física.
- `no_show`: pasada la `deliveryDate` sin actualización, el sistema (o el coordinador) puede marcarlo.

**Propiedad derivada `coverage`** en `Need` (calculada en consulta, no persistida):

```
coverage = sum(quantity de offers en {pledged, in_transit, delivered} para esta need) / need.totalQuantity
```

Expuesta como campo en `NeedDto` para que el frontend muestre una barra de progreso.

### 3.2 Casos de uso

| Caso de uso | Actor | Descripción |
|---|---|---|
| `AddDeliveryCommitment` | Donante | Añade `deliveryDate`, `deliveryMethod` y `notes` a una oferta ya `matched`; transiciona a `pledged` |
| `MarkInTransit` | Donante | Declara que el material está en camino; transiciona a `in_transit` |
| `ConfirmDelivery` | Coordinador / Receptor | Confirma la entrega física; transiciona a `delivered`; actualiza cobertura de la need |
| `MarkNoShow` | Coordinador / Scheduler | Pasada `deliveryDate + graceHours` sin `in_transit` ni `delivered`; transiciona a `no_show` |
| `GetNeedCoverage` | Cualquiera (público) | Calcula y devuelve `coverage` como porcentaje de la need cubierto por ofertas activas |

### 3.3 API

```
PATCH /offers/:id/commit
  Body: { deliveryDate: string (ISO), deliveryMethod: DeliveryMethod, notes?: string }
  Auth: donante propietario de la oferta
  Response: DonationOfferDto

PATCH /offers/:id/in-transit
  Auth: donante propietario de la oferta
  Response: DonationOfferDto

PATCH /offers/:id/deliver
  Auth: coordinador de la emergencia
  Response: DonationOfferDto

PATCH /offers/:id/no-show
  Auth: coordinador de la emergencia
  Response: DonationOfferDto

GET /needs/:id/coverage
  Auth: público
  Response: { needId: string, totalQuantity: number, coveredQuantity: number, coveragePercent: number }
```

**Migración Drizzle** (`apps/api/drizzle/000X_offer_delivery.sql`):

```sql
ALTER TABLE donation_offers
  ADD COLUMN delivery_date   TIMESTAMPTZ,
  ADD COLUMN delivery_method VARCHAR(32),
  ADD COLUMN delivery_notes  TEXT;

-- Actualizar el enum de estado si se gestiona como check-constraint o columna text:
-- pledged, in_transit, delivered, no_show se añaden al dominio; la BD usa TEXT con validación en dominio.
```

> GOTCHA: aplicar a dev con `psql` tras generar (ver MEMORY). Regenerar `pnpm gen:api` y commitear `packages/api-client/src/schema.ts`.

### 3.4 Frontend (Atomic Design)

**Átomo nuevo: `CoverageBar`** (`apps/web/src/components/atoms/coverage-bar.tsx`)

- Barra de progreso con porcentaje y etiqueta _"X % prometido"_.
- Colores: 0–30 % rojo, 31–70 % ámbar, 71–100 % verde.

**Molécula afectada: `NeedCard`** — integra `CoverageBar` bajo la descripción (solo si `coverage` está disponible).

**Organism afectado: `OfferForm`** en `/donar` — cuando la oferta es dirigida a una need (`targetNeedId` presente), muestra los campos `deliveryDate` (date-time picker), `deliveryMethod` (select) y `notes` (textarea).

**Página `/mis-ofertas`** (nueva, alcance MVP):

- Lista las ofertas del donante autenticado (`GET /offers/mine`).
- Por cada oferta `matched` o `pledged`, botones contextuales: _"Estoy en camino"_ (`in_transit`) y confirmación de que ya se registró.
- Por cada oferta `in_transit`: estado informativo _"Material en camino"_.

**Panel coordinación** (`/coordinacion`, sección "Ofertas de material"):

- Nueva columna/badge con estado de entrega y `deliveryDate`.
- Botón _"Confirmar entrega"_ (transiciona a `delivered`).
- Botón _"Marcar no-show"_ (transiciona a `no_show`).

### 3.5 Encaje con lo existente

- Extiende el agregado `DonationOffer` de F3 sin alterar el flujo `open → matched → fulfilled/cancelled`.
- Los estados nuevos (`pledged`, `in_transit`, `delivered`, `no_show`) son un subgrafo de los estados ya `matched`; `fulfilled` del MVP puede mantenerse como alias de `delivered`.
- Reutiliza el `RequireOfferOwnerGuard` (para donante) y `RequireNeedCoordinatorGuard` (para coordinador).
- `NotificationType` en `shared/domain` puede extenderse con `OFFER_IN_TRANSIT` y `OFFER_DELIVERED` para el contexto `notifications` existente.
- El campo `coverage` en `NeedDto` puede calcularse en el repositorio de needs sin nueva tabla (JOIN con offers).

## 4. Alcance

### Primer corte (MVP)

- Campos `deliveryDate`, `deliveryMethod`, `notes` en `DonationOffer` (persistidos, opcionales).
- Transiciones `pledged` e `in_transit` disponibles para el donante vía `PATCH`.
- Transición `delivered` disponible para el coordinador vía `PATCH`.
- `CoverageBar` en `NeedCard`.
- Sección de estado de entrega en el panel de coordinación.
- Página `/mis-ofertas` básica (lista + botón "Estoy en camino").

### Futuro

- Transición `no_show` automática por scheduler pasada `deliveryDate + graceHours`.
- Confirmación por el **receptor** (si el punto de recurso tiene usuario asignado).
- Descuento automático de la cantidad de la need al confirmar entrega (reconciliación de inventario).
- Foto de entrega (adjunto vía contexto `files` ya existente en F4c).
- Notificaciones push al receptor cuando la oferta está `in_transit`.

## 5. Dependencias

- **Internos:** contexto `offers` (F3, `DonationOffer`), contexto `needs` (para `coverage`), contexto `notifications` (para alertas de entrega — Futuro), contexto `files` (para foto de entrega — Futuro).
- **Externos:** ninguno.
- **Features previas requeridas:** F3 (ofertas de material, ya verificado y en `main`).

## 6. Privacidad / seguridad / GDPR

- `deliveryDate` y `deliveryMethod` no son datos personales; `notes` puede contener datos personales si el donante incluye información de contacto. Advertir en el placeholder del campo que no deben incluirse datos sensibles de terceros.
- El `deliveryMethod: pickup_by_receiver` implica que el receptor acude a la ubicación del donante — la ubicación del donante en la oferta dirigida debe ser tratada como dato sensible y ocultarse al público general (solo visible para coordinador y receptor asignado). Ver F09 (privacidad de ubicación).
- Las transiciones de estado quedan en `audit_log` por el interceptor global.
- El `no_show` automático no debe ejecutarse sin un periodo de gracia configurable (ej. 4 h tras `deliveryDate`) para evitar falsos positivos por retrasos menores.

## 7. Esfuerzo estimado

**M** (Medium).

- Backend: migración + enum `DeliveryMethod` + nuevos estados + 4 casos de uso + cobertura calculada en repositorio + tests (~5 h).
- Frontend: `CoverageBar` + extensión `OfferForm` + `/mis-ofertas` + panel coordinación (~4 h).
- Total estimado: **1,5–2 días de desarrollo**.

## 8. Decisiones abiertas (para PM)

1. **¿Quién confirma la entrega: el donante, el coordinador o el receptor?** La propuesta MVP asigna esta acción al coordinador para evitar auto-certificaciones. ¿Es viable operativamente (coordinador disponible) o necesitamos también confirmación del receptor desde el principio?

2. **¿Se descuenta de la cantidad de la need al confirmar entrega?** Implementar reconciliación de inventario ("quedan X de Y kg por cubrir") es valioso pero añade complejidad. ¿Lo incluimos en MVP o dejamos `coverage` solo como indicador estimado?

3. **¿`pledged` es un estado explícito o implícito?** Podría simplificarse como: al añadir `deliveryDate` a una oferta `matched`, automáticamente transiciona a `pledged`. ¿O preferimos que el donante pulse un botón explícito "Confirmar compromiso"?

4. **¿Qué pasa con una oferta `pledged`/`in_transit` si la need caduca (F06)?** ¿El coordinador recibe alerta y decide, o la oferta se mantiene activa independientemente del estado de la need?
