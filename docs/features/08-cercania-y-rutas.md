> ⚠️ **DEPRECADO** — ficha congelada como referencia histórica. El seguimiento de esta feature vive en **GitHub Issues**: rutas/isócronas #29 · #31 (cercanía `/nearby` ✅). No edites esta ficha; trabaja en el issue. Convención: ver `AGENTS.md` y [`00-indice.md`](00-indice.md).

# 08 · Cercanía y rutas — Dominio: Mapa y geolocalización

> Caso de uso capturado del análisis de REDH para el roadmap de ReliefHub. Entregable independiente y abordable por separado.

## 1. Origen (qué hace REDH)

REDH permite al usuario indicar _"Mi ubicación"_ para ordenar los resultados por cercanía. La UI ofrece una sección _"sitios más cercanos"_ y un enlace directo a la ruta hacia el sitio (navegación externa). El criterio de ordenación es la distancia desde el dispositivo del usuario, no la prioridad ni la fecha de publicación.

## 2. Problema / valor para ReliefHub

La landing `/e/[slug]` ya muestra puntos de recursos y necesidades en un mapa Leaflet con coordenadas lat/lng persistidas en todas las entidades. Sin embargo, la lista de tarjetas no tiene ningún orden de cercanía; el usuario no sabe cuál es el punto más próximo sin inspeccionar el mapa visualmente.

En un escenario de emergencia, el tiempo de desplazamiento es crítico. Mostrar _"2,3 km"_ y un enlace directo de navegación convierte la información en acción inmediata. Al ser fundamentalmente frontend sobre datos ya almacenados, el coste de implementación es bajo y el impacto sobre la utilidad del producto es directo.

## 3. Propuesta

### 3.1 Modelo (DDD/Hexagonal)

No se requieren cambios en el dominio ni en la base de datos. Las coordenadas `lat`/`lng` ya están presentes en las entidades `Resource` y `Need` a través del valor objeto `Location` en `shared/domain`.

**Utilidad nueva en el frontend** (`apps/web/src/lib/geo.ts`):

```typescript
// Fórmula haversine — distancia en km entre dos puntos WGS-84
export function haversineKm(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number }
): number
```

La fórmula haversine es obligatoria (NOT euclídea): la distancia en grados es distorsionada a las latitudes donde operan las emergencias; haversine da la distancia real sobre la esfera terrestre con error < 0,3 % para distancias < 500 km.

**Hook nuevo**: `useUserLocation` (`apps/web/src/hooks/use-user-location.ts`)

- Llama a `navigator.geolocation.getCurrentPosition` con un timeout de 5 s.
- Estado: `{ position: GeolocationCoordinates | null, error: string | null, loading: boolean }`.
- No almacena la posición en ningún servidor (solo en memoria React).
- Respeta el permiso del navegador; si el usuario deniega, degrada silenciosamente (sin ordenación por cercanía).

### 3.2 Casos de uso

| Caso de uso | Actor | Descripción |
|---|---|---|
| Solicitar ubicación | Usuario | Pulsa _"Ordenar por cercanía"_; el navegador pide permiso de geolocalización |
| Ordenar por cercanía | Frontend | Con `position` disponible, ordena la lista de puntos/necesidades por `haversineKm(userPos, entity.location)` |
| Ver distancia | Usuario | Cada tarjeta muestra la distancia calculada (p.ej. _"1,2 km"_) |
| Navegar al sitio | Usuario | Pulsa _"Cómo llegar"_; se abre Google Maps Directions o OSM en nueva pestaña |

### 3.3 API

No se requieren endpoints nuevos. La ordenación y el cálculo de distancia son exclusivamente cliente; los datos de ubicación ya vienen en el payload existente de `GET /emergencies/:id/resources` y `GET /emergencies/:id/needs`.

**Enlace de ruta** (generado en frontend, sin llamada de red adicional):

```typescript
// Google Maps Directions (fallback universal)
`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

// OpenStreetMap Directions (alternativa libre)
`https://www.openstreetmap.org/directions?from=${userLat},${userLng}&to=${lat},${lng}`
```

Se puede ofrecer el enlace OSM como opción secundaria para usuarios que prefieran software libre.

### 3.4 Frontend (Atomic Design)

**Átomo nuevo: `DistanceBadge`** (`apps/web/src/components/atoms/distance-badge.tsx`)

- Muestra `"X,X km"` con un icono de localización.
- Si la ubicación del usuario no está disponible, no renderiza nada (sin placeholder vacío).

**Átomo nuevo: `DirectionsLink`** (`apps/web/src/components/atoms/directions-link.tsx`)

- Enlace externo _"Cómo llegar"_ con icono de ruta.
- Target `_blank` + `rel="noopener noreferrer"`.
- Genera URL de Google Maps Directions con las coords de destino.

**Molécula afectada: `ResourceCard`** y **`NeedCard`** — integran `DistanceBadge` y `DirectionsLink` en el footer de la tarjeta.

**Organism nuevo o modificado: `NearbySection`** en la landing `/e/[slug]`

- Subsección _"Más cercanos a ti"_ (máx. 3–5 elementos) encima de la lista completa.
- Solo se muestra si `position` está disponible.
- Usa el mismo componente `ResourceCard`/`NeedCard` con la propiedad `distance` inyectada.

**Organism afectado: `NeedsSection`** y **`ResourcesSection`** en la landing

- Botón/toggle _"Ordenar por cercanía"_ que activa `useUserLocation` y re-ordena la lista en memoria.
- Al activarse, las tarjetas se reordenan con una transición CSS sutil (evitar dizziness en listas largas).
- El ordenamiento por cercanía es un estado local del cliente; no persiste entre sesiones.

**Mapa Leaflet** (`apps/web/src/components/organisms/emergency-map.tsx`):

- Si `position` disponible, añadir marcador _"Tu ubicación"_ (círculo azul semitransparente) al mapa.
- **No** centrar el mapa forzosamente en el usuario; respetar el foco actual (la zona de emergencia).

### 3.5 Encaje con lo existente

- Los datos de `lat`/`lng` ya están disponibles en todas las entidades (shared `Location`).
- El mapa Leaflet ya existe (`dynamic(ssr:false)`) y acepta marcadores adicionales.
- `useUserLocation` es un hook cliente puro; compatible con la arquitectura App Router (marcado `'use client'` donde sea necesario).
- Sin impacto en `@reliefhub/api-client`; no se modifica el schema OpenAPI.

## 4. Alcance

### Primer corte (MVP)

- Hook `useUserLocation` con permiso del navegador.
- Función `haversineKm` en `lib/geo.ts`.
- Átomo `DistanceBadge` + `DirectionsLink`.
- Toggle _"Ordenar por cercanía"_ en la sección de necesidades de la landing.
- Enlace de ruta en cada `NeedCard` (destino = coords de la need).

### Futuro

- Sección _"Más cercanos a ti"_ (subsección destacada con los 3–5 primeros).
- Ordenación por cercanía también en `ResourceCard` y en el panel de coordinación.
- Enlace OSM como alternativa a Google Maps.
- Distancia calculada en servidor para listados ordenados mediante parámetro `?near=lat,lng` (para SSR o SEO; requiere extensión del API).
- Caché de la posición del usuario en `sessionStorage` para no volver a pedir permiso en la misma sesión.

## 5. Dependencias

- **Internos:** datos de `lat`/`lng` en `ResourceDto` y `NeedDto` (ya presentes), mapa Leaflet existente.
- **Externos:** API de Geolocalización del navegador (W3C Geolocation API, sin coste, solo con HTTPS o localhost).
- **Features previas requeridas:** ninguna técnica; recomendable tener F09 (privacidad de ubicación) acordada antes de mostrar el marcador de ubicación del usuario en el mapa.

## 6. Privacidad / seguridad / GDPR

- La posición del usuario **nunca se envía al servidor** en este feature: vive exclusivamente en memoria del cliente y se destruye al cerrar la pestaña.
- El permiso de geolocalización es explícito (prompt del navegador); el usuario puede denegarlo y la funcionalidad degrada gracefully.
- Aviso en la UI al activar la ordenación: _"Tu ubicación no se publica ni se comparte"_ (texto breve bajo el toggle).
- Las coordenadas de destino (entidad) que se insertan en el enlace de Google Maps son las de la entidad, no del usuario. Aun así, el enlace se abre en nueva pestaña para que el usuario controle qué envía a Google.
- Alineado con el principio GDPR de minimización: no se recoge, almacena ni procesa la ubicación del usuario en ningún sistema de ReliefHub.

## 7. Esfuerzo estimado

**S** (Small).

- `lib/geo.ts` + hook `useUserLocation`: ~1 h.
- Átomos `DistanceBadge` + `DirectionsLink`: ~1 h.
- Integración en `NeedCard` + toggle en `NeedsSection`: ~2 h.
- Tests (unitarios de `haversineKm`, hook con mock de `navigator.geolocation`): ~1,5 h.
- Total estimado: **medio día – 1 día de desarrollo**.

## 8. Decisiones abiertas (para PM)

1. **¿Qué entidades se ordenan por cercanía en MVP?** La propuesta prioriza las necesidades (más urgente para donantes). ¿Incluimos también los recursos (puntos logísticos) en el primer corte, o se reserva para Futuro?

2. **¿Mostrar distancia siempre o solo cuando el usuario activa la geolocalización?** Si mostramos _"X km"_ siempre, necesitamos la ubicación del usuario de antemano (o el campo queda vacío). Propuesta: mostrar `DistanceBadge` solo cuando `position != null`; de lo contrario, el footer de la tarjeta no muestra nada en ese hueco.

3. **¿Google Maps o OSM como enlace de ruta por defecto?** Google Maps tiene mayor adopción en móvil; OSM es coherente con la filosofía open-source del stack (Nominatim, Leaflet). ¿Ofrecer ambos, o elegir uno para MVP?

4. **¿Marcador de usuario en el mapa?** El mapa ya tiene marcadores de recursos y necesidades. Añadir el punto del usuario puede ayudar a contextualizar, pero si la zona de emergencia está lejos, el mapa quedaría descentrado o confuso. ¿Lo activamos en MVP o se reserva para Futuro?
