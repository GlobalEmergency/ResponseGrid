> ⚠️ **DEPRECADO** — ficha congelada como referencia histórica. El seguimiento de esta feature vive en **GitHub Issues**: implementada. No edites esta ficha; trabaja en el issue. Convención: ver `AGENTS.md` y [`00-indice.md`](00-indice.md).

# 09 · Privacidad de ubicación — Dominio: Mapa y geolocalización

> Caso de uso capturado del análisis de REDH para el roadmap de ReliefHub. Entregable independiente y abordable por separado.

## 1. Origen (qué hace REDH)

REDH explicita dos principios de privacidad de ubicación:

1. **Coordenadas aproximadas**: las entidades sensibles (beneficiarios, puntos de acogida) publican una posición aproximada con el aviso _"coordenadas aproximadas: verifica por teléfono antes de trasladarte"_.
2. **Ubicación del usuario no publicada**: el dispositivo del usuario se usa para ordenar por cercanía pero su posición nunca aparece en el mapa público ni en ningún servidor.

## 2. Problema / valor para ReliefHub

ReliefHub ya persiste coordenadas exactas (`lat`/`lng`) en recursos, necesidades y ofertas. Para la mayoría de entidades (puntos logísticos, centros de recogida) esto es correcto: la dirección exacta es necesaria para que los voluntarios lleguen.

Sin embargo, algunas entidades contienen **ubicaciones sensibles** cuya exposición puede:

- Poner en riesgo a personas vulnerables (víctimas, beneficiarios en refugios informales).
- Violar el principio GDPR de minimización de datos al publicar la posición exacta de un domicilio particular que solicitó ayuda.
- Generar flujos masivos no coordinados hacia un punto privado.

La spec de privacidad de ReliefHub ya menciona _"no exponer ubicaciones sensibles hasta asignación"_. Este feature implementa ese principio de forma sistemática con coordenadas aproximadas (redondeo/jitter) para las entidades que lo requieran, y consolida el aviso al usuario final.

## 3. Propuesta

### 3.1 Modelo (DDD/Hexagonal)

**Valor objeto `Location`** en `apps/api/src/shared/domain/location.ts` (ya existente).

Extensión propuesta:

```typescript
export type LocationSensitivity = 'public' | 'approximate' | 'private'

export interface Location {
  address: string
  lat:     number
  lng:     number
  sensitivity: LocationSensitivity   // NUEVO, default: 'public'
}
```

| `sensitivity` | Descripción | Coords publicadas |
|---|---|---|
| `public` | Punto logístico, centro de recogida, recurso oficial | Exactas |
| `approximate` | Need de particular, refugio informal, beneficiario | Aproximadas (jitter ±200–500 m) |
| `private` | Dato interno de coordinación (domicilio del donante para pickup) | Solo coordinador/asignado |

**Función de aproximación** (`apps/api/src/shared/domain/location.ts`):

```typescript
// Añade desplazamiento pseudoaleatorio reproducible basado en entityId
// para que el mismo punto siempre devuelva el mismo offset (sin revelar el real)
export function approximateLocation(loc: Location, radiusMeters = 300): { lat: number; lng: number }
```

El jitter es **determinista por `entityId`**: `hash(entityId) → offset fijo`. Así, el punto aproximado no cambia entre peticiones (no revela el real por diferencia de respuestas) y el mapa es coherente para el usuario.

**Regla de aplicación por tipo de entidad** (configurable, no hardcodeado en dominio):

| Entidad | `sensitivity` por defecto |
|---|---|
| `Resource` (tipo collection_point, logistics) | `public` |
| `Resource` (tipo shelter, con owner particular) | `approximate` |
| `Need` (solicitante: organización) | `public` |
| `Need` (solicitante: particular) | `approximate` |
| `DonationOffer` (método pickup_by_receiver) | `private` |
| `DonationOffer` (otros métodos) | `private` (solo coordinador) |

### 3.2 Casos de uso

| Caso de uso | Actor | Descripción |
|---|---|---|
| `PublishApproximateLocation` | Sistema (al publicar entidad) | Determina `sensitivity` según tipo/solicitante; calcula coords aproximadas si `approximate`; las almacena junto con las exactas |
| `GetPublicLocation` | API pública | Devuelve coords aproximadas o exactas según `sensitivity` y el rol del solicitante |
| `GetExactLocation` | Coordinador / Asignado | Devuelve coords exactas para entidades `approximate` o `private` (auth requerida) |
| `OverrideSensitivity` | Coordinador | Permite cambiar manualmente el nivel de sensibilidad de una entidad concreta |

La separación entre coords exactas (persistidas, solo coordinación) y coords aproximadas (calculadas en runtime o almacenadas en caché) **no altera el dominio existente**: la `Location` interna mantiene el valor exacto; el DTO de respuesta pública aplica la función `approximateLocation` antes de serializar.

### 3.3 API

**Cambio en DTOs existentes** (no en endpoints):

- `ResourceDto`, `NeedDto`, `DonationOfferDto` añaden campo `locationSensitivity: LocationSensitivity`.
- La serialización (mapper de infraestructura) aplica `approximateLocation` cuando `sensitivity === 'approximate'` y el solicitante no es coordinador.
- Para `private`: las coords se omiten del DTO público (`lat: null, lng: null`); solo presentes cuando el auth tiene rol coordinador o es el asignado.

```
GET /needs/:id
  Response pública:  { lat: <aproximado>, lng: <aproximado>, locationSensitivity: 'approximate', address: 'Barrio X, Valencia' }
  Response coord.:   { lat: <exacto>, lng: <exacto>, locationSensitivity: 'approximate', address: 'Calle Exacta 12, Valencia' }
```

**Endpoint nuevo de coordinación**:

```
GET /needs/:id/exact-location
  Auth: coordinador de la emergencia
  Response: { lat: number, lng: number, address: string }
```

No se expone en OpenAPI público (marcado `@ApiExcludeEndpoint()` o bajo prefijo `/admin`).

**Migración Drizzle** (`apps/api/drizzle/000X_location_sensitivity.sql`):

```sql
ALTER TABLE resources ADD COLUMN location_sensitivity VARCHAR(16) NOT NULL DEFAULT 'public';
ALTER TABLE needs     ADD COLUMN location_sensitivity VARCHAR(16) NOT NULL DEFAULT 'approximate';

-- Las coords exactas ya están en lat/lng; añadimos las aproximadas como caché:
ALTER TABLE needs     ADD COLUMN approx_lat DOUBLE PRECISION;
ALTER TABLE needs     ADD COLUMN approx_lng DOUBLE PRECISION;
```

> GOTCHA: aplicar a dev con `psql` manualmente (ver MEMORY). Actualizar `pnpm gen:api`.

### 3.4 Frontend (Atomic Design)

**Átomo nuevo: `PrivacyLocationNotice`** (`apps/web/src/components/atoms/privacy-location-notice.tsx`)

- Renderiza el texto _"Coordenadas aproximadas. Verifica la dirección exacta por teléfono antes de trasladarte."_ acompañado de un icono de información.
- Solo se muestra cuando la entidad tiene `locationSensitivity === 'approximate'`.

**Atom nuevo: `PrivateLocationPlaceholder`** (`apps/web/src/components/atoms/private-location-placeholder.tsx`)

- Sustituye las coords en tarjetas cuando `locationSensitivity === 'private'`.
- Muestra: _"Ubicación disponible tras asignación por coordinador."_

**Molécula afectada: `NeedCard`** y **`ResourceCard`** — integran `PrivacyLocationNotice` o `PrivateLocationPlaceholder` según `locationSensitivity`.

**Organism afectado: `EmergencyMap`** (`apps/web/src/components/organisms/emergency-map.tsx`)

- Los marcadores de entidades `approximate` usan un radio visual de incertidumbre: círculo semitransparente de ~300 m de radio alrededor del punto (Leaflet `L.circle`), no solo el pin exacto.
- Las entidades `private` no tienen marcador en el mapa público (se omiten del array de puntos).

**Principio de ubicación del usuario** (transversal, consolidado aquí):

- Ningún componente envía la posición del usuario a ningún endpoint.
- El hook `useUserLocation` (F08) persiste la posición solo en memoria React.
- Añadir en el pie de la sección de cercanía/mapa: _"Tu ubicación no se publica ni se comparte."_

### 3.5 Encaje con lo existente

- El valor objeto `Location` en `shared/domain` ya es el punto de extensión natural.
- Los mappers de infraestructura (Drizzle → DTO) son donde se aplica la lógica de aproximación; el dominio nunca ve la versión aproximada (trabaja siempre con coords exactas internamente).
- Compatible con el `audit_log` existente: el acceso a `exact-location` queda registrado (actor, entidad, timestamp).
- La función `approximateLocation` es determinista y pura → testable con snapshots.
- Sin impacto en el flujo de geocoding (Nominatim proxy): la búsqueda de dirección sigue usando coords exactas internamente.

## 4. Alcance

### Primer corte (MVP)

- Campo `locationSensitivity` en `Resource` y `Need` con valores por defecto según tipo/solicitante.
- Mapper de infraestructura aplica `approximateLocation` en DTOs públicos cuando `sensitivity === 'approximate'`.
- Átomo `PrivacyLocationNotice` en `NeedCard`.
- Marcador con radio de incertidumbre en el mapa para needs de particulares.
- Aviso _"Tu ubicación no se publica"_ en la sección de cercanía.

### Futuro

- `sensitivity === 'private'` para offers (método pickup_by_receiver) — endpoint `exact-location` para coordinador.
- UI admin/coordinación para sobreescribir `sensitivity` de una entidad concreta.
- Configuración por emergencia del radio de aproximación (200 m urbano / 500 m rural).
- Certificación GDPR: documentar en el registro de actividades de tratamiento (RAT) el flujo de coords aproximadas.
- Auditabilidad: log de cada acceso a `exact-location` con notificación al DPO si supera umbral.

## 5. Dependencias

- **Internos:** valor objeto `Location` en `shared/domain`, mappers de infraestructura de `needs` y `resources`, mapa Leaflet, contexto `audit_log` (F5c, para log de `exact-location`), hook `useUserLocation` (F08, para aviso de privacidad).
- **Externos:** ninguno.
- **Features previas requeridas:** ninguna técnica; recomendable coordinar con F08 (cercanía/rutas) para alinear el tratamiento de la posición del usuario; y con F07 (compromiso de entrega) para el tratamiento de la ubicación del donante en `pickup_by_receiver`.

## 6. Privacidad / seguridad / GDPR

Este es el feature central de cumplimiento GDPR del dominio de geolocalización. Principios aplicados:

- **Minimización**: la ubicación exacta de un particular solo se expone al coordinador o al voluntario asignado; el público ve la aproximada.
- **Propósito**: las coords exactas se recogen para logística interna (coordinación de entrega); no se publican para propósitos distintos.
- **Transparencia**: el aviso _"coordenadas aproximadas, verifica por teléfono"_ informa al usuario de la imprecisión intencional, evitando acciones basadas en datos incorrectos y reduciendo el riesgo de desplazamientos fallidos.
- **Seguridad de datos**: la función `approximateLocation` con jitter determinista evita que la comparación de múltiples respuestas revele la posición real (el offset es siempre el mismo para la misma entidad).
- **Acceso controlado**: el endpoint `exact-location` requiere autenticación + rol coordinador + pertenencia a la emergencia (guards ya existentes).
- **Registro de acceso**: cada consulta a `exact-location` se registra en `audit_log` (actor, entidad, timestamp) para detectar accesos indebidos.
- **Base legal**: datos de ubicación de personas físicas son datos de categoría sensible según el RGPD cuando permiten identificar el domicilio habitual. La aproximación reduce el riesgo a nivel de "datos anonimizados" dentro del producto.

## 7. Esfuerzo estimado

**M** (Medium) por ser transversal.

- Backend: extensión `Location` + función `approximateLocation` + campo `locationSensitivity` en entidades + migración + mappers actualizados + endpoint `exact-location` + tests (~4 h).
- Frontend: átomos `PrivacyLocationNotice` y `PrivateLocationPlaceholder` + integración en tarjetas + marcador de incertidumbre en mapa (~3 h).
- Total estimado: **1,5 días de desarrollo**.

## 8. Decisiones abiertas (para PM)

1. **¿Qué entidades son sensibles y cuál es el nivel de aproximación?** La propuesta usa `approximate` (radio ~300 m) para needs de particulares y refugios informales. ¿Hay otros tipos de entidad sensibles (ej. voluntarios con domicilio como zona de operación)? ¿300 m es suficiente para zonas urbanas densas, o preferimos 500 m?

2. **¿La ubicación exacta de una need particular es visible solo para el coordinador, o también para el voluntario/donante asignado?** La propuesta dice "coordinador o asignado". ¿El donante cuya oferta fue aceptada ve la dirección exacta del receptor, o recibe solo el barrio y se coordina por teléfono?

3. **¿El jitter debe ser determinista (siempre el mismo offset por entidad) o aleatorio por sesión?** Determinista protege de ataques de correlación (el punto aproximado no cambia, no hay información extra en varias peticiones). Aleatorio por sesión añade anonimato pero genera incoherencias visuales en el mapa. La propuesta recomienda determinista.

4. **¿Aplicamos `private` a las coords de `DonationOffer` tipo pickup_by_receiver desde MVP, o se pospone?** El donor puede estar revelando su domicilio al aceptar que el receptor acuda a buscarlo. Si no protegemos eso desde el inicio, puede haber datos en producción sin protección retroactiva.
