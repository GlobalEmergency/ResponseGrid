> ⚠️ **DEPRECADO** — ficha congelada como referencia histórica. El seguimiento de esta feature vive en **GitHub Issues**: #32 · #33 · #34 · #35. No edites esta ficha; trabaja en el issue. Convención: ver `AGENTS.md` y [`00-indice.md`](00-indice.md).

# 10 · Cola offline real (IndexedDB + sync) — Dominio: Plataforma y acceso

> Caso de uso capturado del análisis de REDH para el roadmap de ReliefHub. Entregable independiente y abordable por separado.

## 1. Origen (qué hace REDH)

REDH opera en zonas con conectividad muy inestable (hospitales sin señal, zonas de sismo). Su premisa es **offline-first agresivo**: cualquier formulario (recurso, petición, oferta, voluntario, reporte) se guarda localmente y se envía en cuanto hay señal, sin intervención del usuario. El mensaje en pantalla es "guardado sin conexión, se enviará automáticamente".

## 2. Problema / valor para ReliefHub

ReliefHub ya tiene **PWA instalable** (manifest + service worker en prod) y **autoguardado de borradores** (`useFormDraft` en localStorage), pero ambas piezas son insuficientes para el caso offline real:

- `useFormDraft` preserva lo que el usuario ha escrito, pero **no intenta el envío** ni survives a un cierre de pestaña tras perder señal.
- El service worker actual solo sirve el shell offline (`/offline`) y hace bypass de `/api`; **no cachea ni encola requests POST**.

Sin cola offline, un voluntario en campo que rellena un reporte de situación y pierde señal **pierde el envío** silenciosamente. En emergencias, esa información es crítica.

## 3. Propuesta

### 3.1 Modelo (DDD/Hexagonal)

La cola offline es **puramente de cliente** (no hay entidad de dominio en el backend). El estado vive en **IndexedDB** (persistente entre cierres de pestaña, disponible en workers).

Estructura de la base de datos IndexedDB `reliefhub-offline-queue`:

```
ObjectStore: pending_requests
  id         : uuid (generado en cliente, sirve de idempotency key)
  url        : string           // ruta relativa ej. /api/emergencies/:id/resources
  method     : 'POST'|'PUT'|'PATCH'
  headers    : Record<string,string>
  body       : string           // JSON.stringify del payload
  formContext: string           // 'resource'|'need'|'offer'|'volunteer'|'report'|'reunification'
  emergencyId: string
  createdAt  : number           // Date.now()
  attempts   : number           // intentos de envío
  lastAttempt: number|null
```

El `id` de la entrada actúa como **idempotency key**: se pasa en la cabecera `Idempotency-Key` al backend para que operaciones de reintentos no dupliquen registros.

El backend necesita soporte de idempotencia en los endpoints que entran en cola (ver § 3.3).

### 3.2 Casos de uso

1. **Enqueue** — cuando el usuario pulsa "Enviar" y `navigator.onLine === false` (o el fetch falla con error de red), el hook `useOfflineQueue` serializa la request en IndexedDB y muestra el banner "guardado sin conexión".
2. **Sync al volver la señal** — el service worker registra un `BackgroundSync` tag (`rh-queue-sync`) si el navegador lo soporta (Chromium). Cuando el navegador recupera señal, dispara el evento `sync` en el SW, que procesa la cola en orden.
3. **Fallback `online` event** — en navegadores sin Background Sync (Firefox, Safari), el main thread escucha `window.addEventListener('online', …)` y ejecuta la misma lógica de vaciado.
4. **UI de estado de cola** — componente `OfflineQueueStatus` (molécula) visible mientras haya entradas pendientes: cuenta de items, spinner de envío, confirmación de cada envío exitoso.
5. **Manejo de conflictos** — si el backend devuelve 4xx (ej. 409 `Emergency not accepting intake`, o 404 "recurso ya no existe"), la entrada se marca como `failed` con el mensaje de error; el usuario ve un aviso y puede descartar o reintentar manualmente. No se reintenta en bucle automático ante 4xx.
6. **Límite de reintentos** — max 5 intentos automáticos ante errores 5xx o de red; tras superar el límite, se marca `failed`.

### 3.3 API

**Sin endpoints nuevos** para la cola en sí (es client-side), pero se necesitan dos cambios en el backend:

#### Soporte de idempotencia

Añadir middleware de idempotencia en los endpoints que entran en cola:

| Endpoint | Contexto |
|----------|----------|
| `POST /emergencies/:id/resources` | resources |
| `POST /emergencies/:id/needs` | needs |
| `POST /emergencies/:id/offers` | offers |
| `POST /emergencies/:id/volunteers` | volunteers |
| `POST /emergencies/:id/reports` | reports |

Comportamiento: si llega una request con `Idempotency-Key` ya procesada en las últimas 24 h → devolver la respuesta original cacheada (201 + payload) sin ejecutar de nuevo el caso de uso. Almacenamiento sugerido: tabla `idempotency_keys (key, response_body, status_code, created_at)` con TTL de 24 h (índice en `created_at`).

#### Kill-switch offline

El kill-switch existente (emergencia pausada → 409) ya opera correctamente. El cliente debe propagar ese 409 como error no reintentable.

### 3.4 Frontend (Atomic Design)

**Átomos:**
- `OfflineBadge` — icono + texto "Sin conexión" en rojo, usado en el banner de formulario.
- `QueueCountBadge` — pastilla con número de envíos pendientes.

**Moléculas:**
- `OfflineQueueStatus` — barra/tarjeta persistente mientras `pendingCount > 0`: "N envíos pendientes · Enviando…" / "Todos sincronizados ✓" / lista de errores con botón "Descartar" por ítem.
- `FormOfflineFallback` — wrapper que rodea el botón de submit de cada formulario; intercepta el submit y enruta a la cola si offline.

**Organismos / integraciones:**
- `useOfflineQueue` hook — encapsula escritura/lectura IndexedDB, disparo de Background Sync y escucha de `online`. Expone `{ enqueue, pendingCount, failedItems, dismiss }`.
- Cada formulario existente (`ResourceForm`, `NeedForm`, `OfferForm`, `VolunteerForm`, `ReportForm`, `ReunificationForm`) pasa su `onSubmit` por `FormOfflineFallback` sin cambiar lógica interna.
- `OfflineQueueStatus` se monta en el layout raíz (p. ej. `app/layout.tsx`, lado cliente) para ser visible en todas las páginas.

**Service worker (`public/sw.js`) — ampliaciones:**
- Registrar `BackgroundSync` al hacer `enqueue` desde el SW registration.
- Evento `sync` con tag `rh-queue-sync`: leer IndexedDB, enviar requests en serie, marcar cada una como completada o fallida.
- El bypass de `/api` existente se mantiene; la cola usa `fetch` directamente desde el SW en el evento `sync`.

**`useFormDraft` — relación:**
- Se mantiene sin cambios; sigue siendo el autoguardado del formulario mientras se escribe.
- `useOfflineQueue` es complementario: actúa en el momento del submit (payload completo), no mientras se escribe.
- Al sincronizar con éxito, el hook llama a `clearDraft(formKey)` para limpiar localStorage.

### 3.5 Encaje con lo existente

- **PWA existente:** el service worker `public/sw.js` se amplía; el manifest y la lógica de instalación no cambian.
- **`useFormDraft`:** complementario; no se reemplaza.
- **Kill-switch de emergencia (F1):** el 409 del backend se propaga como error no reintentable; el usuario ve el mensaje de error en `OfflineQueueStatus`.
- **Auth JWT (cookie httpOnly):** el SW envía la cookie automáticamente (same-origin); no se necesita gestionar tokens en la cola. Si la cookie expira, el backend devuelve 401 → ítem marcado como fallido con aviso "sesión expirada, inicia sesión".
- **i18n (F5e):** los textos de `OfflineBadge`, `OfflineQueueStatus` y `FormOfflineFallback` pasan por el sistema de traducciones `t` ya existente.

## 4. Alcance

### Primer corte (MVP)

- Hook `useOfflineQueue` con IndexedDB (`idb` o `idb-keyval` como wrapper ligero).
- Integración en los 5 formularios más usados: recurso, petición, oferta, material, reporte.
- Fallback `online` event (sin Background Sync en MVP para simplicidad).
- `OfflineQueueStatus` básico (contador + spinner + mensaje de error por ítem).
- Middleware de idempotencia en backend con tabla `idempotency_keys`.

### Futuro

- Background Sync API en el SW (mejora la experiencia en Chromium cuando la app está cerrada).
- Soporte de reintentos escalonados (backoff exponencial).
- Panel de cola en `/perfil` para que el usuario vea y gestione sus envíos pendientes.
- Soporte de adjuntos (fotos de reporte): serializar como Blob en IndexedDB y subir como multipart al sincronizar.
- Sincronización parcial: si un ítem de una need ya no existe al sincronizar, preguntar al usuario si quiere redirigir la oferta.

## 5. Dependencias

| Dependencia | Tipo | Nota |
|-------------|------|------|
| PWA service worker existente (`public/sw.js`) | Interna | Se amplía, no se reemplaza |
| `useFormDraft` | Interna | Complementario; no se toca |
| Formularios existentes (resource/need/offer/volunteer/report) | Interna | Se integra el wrapper sin refactor interno |
| `idb` o `idb-keyval` | Externa (npm) | Wrapper ligero sobre IndexedDB API; alternativa: IndexedDB nativo |
| Tabla `idempotency_keys` en Postgres | Backend | Migración Drizzle nueva; aplicar a mano con psql (gotcha entorno) |

## 6. Privacidad / seguridad / GDPR

- Los datos pendientes se almacenan en **IndexedDB del dispositivo del usuario** (mismo origen, no sale a la red). No hay acceso por parte del servidor hasta que se sincroniza.
- Si el usuario cierra sesión, el hook debe **vaciar la cola** (o al menos advertir que los datos pendientes se borrarán) para evitar envíos no autorizados desde otra sesión.
- Los datos en cola pueden contener información personal (datos de contacto, datos de voluntario). Informar en la UI: "tus datos se guardan en este dispositivo hasta que haya conexión".
- La tabla `idempotency_keys` solo almacena la respuesta del servidor (no el payload original); TTL de 24 h limita la retención.
- No hay datos de terceros ni transferencias fuera del sistema propio.

## 7. Esfuerzo estimado

**M** (medio) — La lógica de Background Sync + IndexedDB tiene su complejidad, pero el patrón es bien conocido y la integración con los formularios es mecánica una vez el hook está hecho. El middleware de idempotencia en backend añade una migración y un interceptor/middleware sencillo.

Desglose orientativo:
- Hook `useOfflineQueue` + IndexedDB: ~1 día
- Integración en 5 formularios + componentes UI: ~0,5 días
- Middleware idempotencia backend + migración: ~0,5 días
- Background Sync en SW (MVP sin él): 0; en futuro ~0,5 días adicionales

## 8. Decisiones abiertas (para PM)

1. **¿Qué formularios entran en cola en el MVP?** Propuesta: recurso, petición, oferta de material, voluntario, reporte.

2. **Idempotencia en backend: ¿implementar o diferir?** Sin idempotencia, un reenvío duplica el registro. Con idempotencia, añadimos una migración y un interceptor. ¿Vale la pena en MVP o se acepta la deuda de posibles duplicados con una nota operacional?

3. **¿Conflictos: qué hacer si la emergencia ya no acepta intake al sincronizar?** Opciones: (a) mostrar error y dejar el ítem en cola para que el usuario decida; (b) archivar automáticamente con mensaje explicativo. ¿Cuál es la UX preferida?

4. **Adjuntos en cola:** las fotos de reporte son Blobs grandes. ¿Se incluyen en el MVP de la cola o se excluyen (solo formularios de texto)?

5. **Vaciado de cola al cerrar sesión:** ¿vaciar silenciosamente o pedir confirmación? Riesgo de pérdida de datos si el usuario cierra sesión accidentalmente.
