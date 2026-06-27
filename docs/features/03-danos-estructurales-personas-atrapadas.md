# 03 · Daños estructurales y personas atrapadas — Dominio: Campo y rescate (SAR)

> Caso de uso capturado del análisis de REDH para el roadmap de ReliefHub. Entregable independiente y abordable por separado.

---

## 1. Origen (qué hace REDH)

REDH incluye un módulo de reporte de edificaciones dañadas con tres subtipos: **edificación colapsada**, **edificación dañada** y **personas atrapadas**. El flujo contempla:
- Reporte inicial con descripción, ubicación y fotos.
- Revisión por personal autorizado antes de publicar (los reportes no son inmediatamente públicos para evitar pánico o información falsa).
- Acción "Reportar daños" visible en la interfaz de campo como CTA primario.
- Indicación del número estimado de personas atrapadas (si aplica).

En un contexto de sismo como el de Venezuela, este módulo es crítico para que los equipos SAR (Search and Rescue) prioricen su despliegue.

---

## 2. Problema / valor para ReliefHub

**Hueco que cubre:** el contexto `reports` de ReliefHub (F4c) ya existe con tipos `incident / stock / status / other`, pero no tiene tipos específicos para daños estructurales ni para personas atrapadas. Tampoco hay una **capa de daños en el mapa** diferenciada de los puntos logísticos.

**Fase:** primeras horas y operación de rescate (primeras 0–72 h). Es el caso de uso más crítico en tiempo en un desastre sísmico: cada minuto cuenta para las personas atrapadas.

**Valor:**
- Centraliza la información de daños estructurales que hoy llegaría por canales dispersos (llamadas, WhatsApp, redes sociales).
- Permite a los coordinadores SAR y a Protección Civil tener un mapa consolidado y verificado de puntos críticos.
- La revisión previa a la publicación evita que información falsa o imprecisa genere despliegues incorrectos.
- La prioridad `urgent` + escalado garantizan que los reportes de atrapados no se pierdan en la cola general.

**Por qué no basta con `incident` existente:** el tipo `incident` es genérico. Los daños estructurales y las personas atrapadas necesitan:
- Campos específicos (tipo de daño, número de atrapados).
- Flujo de revisión más estricto (publicación explícita, no solo cambio de estado a `reviewed`).
- Capa de mapa diferenciada (iconografía SAR, color de criticidad).
- Escalado automático al coordinador SAR o Protección Civil.

---

## 3. Propuesta

### 3.1 Modelo (DDD/Hexagonal)

**Decisión de arquitectura (ver Decisión abierta #1):** se propone **extender el contexto `reports` existente** con dos tipos nuevos (`structural_damage`, `trapped_persons`) en lugar de crear un contexto propio. Justificación: el flujo (cola → revisión → publicación, FileStorage, prioridad, estado open→reviewed) ya está completamente implementado en `reports`; crear un contexto separado duplicaría infraestructura sin añadir valor diferencial. Si en el futuro el contexto SAR crece (gestión de equipos SAR, despacho, comunicaciones), se puede extraer.

**Extensión del agregado `Report`:**

```
Report  (extensión del agregado existente)
  // Campos ya existentes
  id: ReportId
  emergencyId: EmergencyId
  type: ReportType               // AMPLIADO: incident | stock | status | other
                                 //           + structural_damage | trapped_persons
  note: string
  photoUrls: string[]            // FileStorage existente
  priority: Priority             // low | medium | high | urgent
  status: ReportStatus           // open | reviewed (existente)  + NUEVO: published
  resourceId?: ResourceId        // enlace opcional a punto logístico (existente)
  location?: Location            // shared kernel

  // NUEVOS campos — solo presentes cuando type IN (structural_damage, trapped_persons)
  structuralDetail?: StructuralDetail
    damageLevel: DamageLevel     // collapsed | severe | moderate (enum nuevo)
    trappedPersonsEstimate?: number  // número estimado de atrapados (0 = ninguno / desconocido)
    accessibleForRescue?: boolean    // ¿el acceso está despejado para equipos SAR?
    buildingType?: string            // vivienda, escuela, hospital, comercio, etc.
  // Estado de publicación extendido
  publishedAt?: Date             // cuando el coordinador publica (nuevo)
  publishNote?: string           // nota pública breve del coordinador al publicar
```

**Value Object `StructuralDetail`:**
- Solo se valida y persiste si `type` es `structural_damage` o `trapped_persons`.
- Invariante: si `type === 'trapped_persons'`, `trappedPersonsEstimate` debe ser > 0 (hay al menos 1 persona atrapada confirmada) o `null`/`undefined` si es desconocido pero sospechado.
- `DamageLevel.collapsed` implica máxima prioridad; si se registra con prioridad < `urgent`, el caso de uso la eleva automáticamente a `urgent`.

**Estado extendido:** se añade `published` al `ReportStatus` existente. Flujo:
```
open → reviewed → published (visible en mapa y lista pública)
                ↘ closed (descartado por el coordinador)
```
El estado `published` es el nuevo estado final para reportes de daños validados. Los reportes de tipo `incident/stock/status/other` existentes mantienen el flujo `open → reviewed` sin cambio.

**Eventos de dominio:**
- `StructuralDamageReportCreated` — prioridad `urgent` si hay atrapados; dispara notificación in-app a coordinadores con escalado visual (ver §3.4).
- `StructuralDamageReportPublished` — dispara actualización de la capa de mapa.
- `TrappedPersonsReported` (si `type === 'trapped_persons'`) — evento adicional para posible integración futura con Protección Civil; en MVP solo dispara notificación con asunto urgente.

### 3.2 Casos de uso (comandos/queries)

**Comandos:**
| Caso de uso | Actor | Descripción |
|---|---|---|
| `CreateStructuralDamageReport` | Particular autenticado | Crea reporte de tipo `structural_damage` o `trapped_persons`; kill-switch aplica. |
| `ReviewStructuralReport` | Coordinador | Cambia estado `open → reviewed`; puede ajustar `damageLevel` o `trappedPersonsEstimate`. |
| `PublishStructuralReport` | Coordinador | Cambia estado `reviewed → published`; el reporte pasa a ser visible en mapa y lista pública con `publishNote`. |
| `CloseStructuralReport` | Coordinador | Descarta un reporte falso o duplicado (`any → closed`); requiere nota. |
| `AddPhotosToReport` | Reporter o Coordinador | Añade fotos a un reporte existente (usa FileStorage existente). |

Los casos de uso `ReviewReport` y `PublishStructuralReport` son operaciones separadas (no se puede publicar sin revisar primero). Esto es distinto al flujo de `incidents` simples donde `reviewed` ya es el estado final.

**Queries:**
| Consulta | Actor | Descripción |
|---|---|---|
| `ListStructuralReports` | Coordinador | Lista filtrable (status, damageLevel, emergencyId) en panel de coordinación. |
| `GetPublishedDamageLayer` | Público | GeoJSON de reportes `published` para la capa del mapa; solo expone campos no sensibles. |
| `GetStructuralReportDetail` | Coordinador | Detalle completo de un reporte (con fotos, historial de estado). |

### 3.3 API (endpoints clave)

```
// Creación — extensión del endpoint existente de reports
POST   /emergencies/:emergencyId/reports
  Body (extensión de CreateReportDto):
    type: 'structural_damage' | 'trapped_persons'
    note: string
    priority: Priority                   // se eleva a urgent automáticamente si trapped_persons
    location?: { address, lat, lng }
    structuralDetail?: {
      damageLevel: 'collapsed' | 'severe' | 'moderate'
      trappedPersonsEstimate?: number
      accessibleForRescue?: boolean
      buildingType?: string
    }
    photoUrls?: string[]                 // subidas previamente vía POST /files
  Auth: JWT obligatorio

// Revisión (existente, sin cambio)
PATCH  /reports/:reportId/status
  Body: { status: 'reviewed', note? }
  Auth: RequireReportCoordinatorGuard

// NUEVO — publicación de reporte de daños
POST   /reports/:reportId/publish
  Body: { publishNote?: string }
  Auth: RequireReportCoordinatorGuard

// NUEVO — capa pública de daños para el mapa
GET    /emergencies/:emergencyId/reports/damage-layer
  Response: GeoJSON FeatureCollection
    features[*].properties:
      id, type, damageLevel, trappedPersonsEstimate,
      publishNote, publishedAt, photoUrls[0] (thumbnail)
  Auth: público (sin JWT)

// Lista para coordinadores (extensión del endpoint existente)
GET    /emergencies/:emergencyId/reports
  Query: ?type=structural_damage|trapped_persons&status=open|reviewed|published
  Auth: RequireReportCoordinatorGuard
```

**`gen:api`:** tras añadir `/reports/:reportId/publish` y `/emergencies/:emergencyId/reports/damage-layer`, ejecutar `pnpm gen:api` y commitear `packages/api-client/src/schema.ts` (GOTCHA recurrente documentado en el estado del proyecto).

### 3.4 Frontend (Atomic Design)

**Átomos:**
- `DamageLevelBadge` — badge con color e icono para `collapsed` (rojo 🔴), `severe` (naranja 🟠), `moderate` (amarillo 🟡).
- `TrappedPersonsCount` — display numérico con icono de persona para el número de atrapados; si es desconocido muestra "?".
- `UrgentAlert` — alerta visual prominente (rojo, icono sirena) para reportes `trapped_persons` en la cola del coordinador.
- `DamageMarker` — marcador Leaflet diferenciado para la capa de daños (icono edificio con color según `damageLevel`); distinto de los marcadores de puntos logísticos actuales.

**Moléculas:**
- `StructuralDamageForm` — extensión del formulario de reporte (`/reportar`) que aparece cuando se selecciona tipo `structural_damage` o `trapped_persons`; campos: `damageLevel`, `trappedPersonsEstimate`, `accessibleForRescue`, `buildingType` + foto (igual que el formulario de reporte existente, que ya comprime en canvas y sube vía `/api/upload`).
- `StructuralReportCard` — tarjeta en la cola del coordinador: `DamageLevelBadge` + `TrappedPersonsCount` + estado + foto thumbnail + botones "Revisar" y "Publicar".
- `DamageReportPublishModal` — modal de confirmación con campo `publishNote` antes de publicar (evita publicaciones accidentales de información no verificada).

**Organismos:**
- `DamageReportsQueue` — sección en `/coordinacion/reportes` (existente) con filtro `type=structural_damage|trapped_persons` y ordenación por criticidad (atrapados primero, luego colapsado, severo, moderado); incluye `UrgentAlert` destacado al tope de la cola si hay atrapados pendientes de revisión.
- `DamageLayer` — capa Leaflet en la landing pública y en la vista de coordinación: markers `DamageMarker` procedentes de `GET /emergencies/:emergencyId/reports/damage-layer`; popup con `DamageLevelBadge`, nota de publicación y foto thumbnail.

**Páginas / rutas afectadas:**
- `/e/[slug]/reportar` — formulario de reporte (existente): añade los tipos `structural_damage` y `trapped_persons` en el selector de tipo, con el sub-formulario `StructuralDamageForm` expandiéndose dinámicamente.
- `/e/[slug]/coordinacion/reportes` — panel existente: añade `DamageReportsQueue` con filtros y `UrgentAlert`.
- `/e/[slug]` — landing pública: añade la capa `DamageLayer` en el mapa Leaflet existente (toggle o capa siempre visible según decisión de diseño).

**CTA en landing:** añadir enlace "Reportar daños" como CTA secundario en la landing pública (junto a los 5 CTAs existentes), con icono de edificio. Solo visible si la emergencia tiene tipos sísmicos/estructurales (controlable via `emergency.type` o `template`).

### 3.5 Encaje con lo existente

| Patrón / contexto ReliefHub | Cómo se reutiliza |
|---|---|
| Contexto `reports` (F4c) | Extensión directa: nuevos tipos + campo `structuralDetail` + estado `published`. Sin nuevo módulo NestJS. |
| `FileStorage` (puerto, F4c) | Las fotos se suben exactamente igual que en los reportes actuales: compresión canvas client-side → `/api/upload` Route Handler → `POST /files` → `GET /files/:key`. |
| Cola de coordinación `/coordinacion/reportes` | Se añaden filtros y sección de urgentes; no se rehace la UI. |
| Leaflet / mapa (landing, F4a) | La capa de daños se añade como una `LayerGroup` adicional en el mapa existente; mismos `L.marker` con icono personalizado. |
| `notifications` (F5b, puerto `Notifications`) | `StructuralDamageReportCreated` y `TrappedPersonsReported` disparan notificaciones in-app a coordinadores. |
| `AuditInterceptor` (F5c) | Toda acción de revisión y publicación queda en `audit_log`. |
| `RequireReportCoordinatorGuard` | Guard existente (factory de guards); controla revisión y publicación. |
| `EmergencyStatusReader` (kill-switch) | `CreateStructuralDamageReport` verifica que la emergencia esté activa. |
| `Priority` (shared/domain) | La elevación automática a `urgent` usa el enum existente del shared kernel. |

---

## 4. Alcance

### Primer corte (MVP)

- Tipos `structural_damage` y `trapped_persons` en el enum `ReportType` existente.
- Campo `structuralDetail` nullable en el agregado `Report` (columnas JSON o columns explícitas en `reports` table).
- Caso de uso `CreateStructuralDamageReport` con elevación automática de prioridad a `urgent` si hay atrapados.
- Estado `published` añadido a `ReportStatus`; caso de uso `PublishStructuralReport`.
- Endpoint `GET /emergencies/:emergencyId/reports/damage-layer` (GeoJSON público).
- Capa `DamageLayer` en el mapa de la landing pública.
- `DamageReportsQueue` en el panel de coordinación con `UrgentAlert`.
- Formulario `/reportar` con sub-formulario `StructuralDamageForm`.
- Notificación in-app a coordinadores al crear un reporte de atrapados.

### Futuro / fuera de alcance

- Integración con Protección Civil / 112 vía API externa.
- Asignación de equipos SAR a un reporte específico (despacho de recursos humanos).
- Seguimiento de estado de rescate (atrapados confirmados → rescatados → trasladados).
- Mapa de calor de daños (densidad por zona).
- Alerta SMS/push a coordinadores fuera de la app cuando se crea un reporte `trapped_persons`.
- Validación cruzada de reportes (varios usuarios reportan el mismo edificio → consolidación).
- Integración con bases de datos catastrales para datos del edificio.
- Video además de fotos.
- Modo offline real para el formulario de reporte de daños (IndexedDB + sync, ver feature 10).

---

## 5. Dependencias

| Dependencia | Tipo | Nota |
|---|---|---|
| Contexto `reports` (F4c) | Existente | Extensión de enum, campo, estado y caso de uso. |
| `FileStorage` (F4c) | Existente | Sin cambio; las fotos siguen el mismo flujo. |
| `notifications` (F5b) | Existente | Nuevos disparadores para reportes de daños/atrapados. |
| `audit` (F5c) | Existente | Sin cambio; el interceptor global cubre los nuevos endpoints. |
| `shared/domain` (Priority, EmergencyId, Location) | Existente | Sin cambio. |
| Drizzle migration | Nueva | Columnas `structural_damage_level`, `trapped_persons_estimate`, `accessible_for_rescue`, `building_type`, `published_at`, `publish_note` en `reports` (nullable). Alternativamente, columna JSONB `structural_detail`. |
| `api-client` (`pnpm gen:api`) | Existente | Regenerar tras añadir endpoints nuevos. |
| Leaflet (mapa) | Existente | Nueva `LayerGroup` para daños; sin cambio a la integración base. |

**Migración Drizzle (GOTCHA):** aplicar manualmente a dev con psql tras generar la migración. El `global-setup` de tests la aplica a `reliefhub_test` automáticamente.

---

## 6. Privacidad / seguridad / GDPR

- **Datos públicos:** la capa de daños publicada (`damage-layer`) solo expone: tipo de daño, nivel, número de atrapados (si aplica), nota del coordinador, foto (si existe) y coordenadas. No expone quién hizo el reporte.
- **Datos del reporter:** el `userId` del reporter nunca aparece en la respuesta pública. Solo en la vista del coordinador (para seguimiento). Queda en `audit_log`.
- **Fotos:** heredan las políticas de `FileStorage` existentes: `X-Content-Type-Options: nosniff`, bloqueo de SVG, sin TTL en disco (S3 en producción). Considerar marca de agua o resolución reducida para fotos públicas (fuera del MVP).
- **Información de ubicación:** las coordenadas de los daños se publican con precisión completa (necesaria para SAR). No hay anonimización de ubicación en este contexto (a diferencia de feature 09 para puntos logísticos).
- **Revisión previa a publicación:** el flujo `open → reviewed → published` garantiza que ningún reporte no verificado sea visible en el mapa público. Crítico para evitar pánico o despliegue incorrecto de recursos.
- **Reportes falsos:** el coordinador puede cerrar (`closed`) un reporte falso con nota. Queda en `audit_log` para trazabilidad.
- **GDPR:** los reportes de daños no contienen datos personales de la víctima por diseño (el número de atrapados es un dato estadístico, no nominativo). El dato más cercano a personal es el `userId` del reporter, que se gestiona igual que en el contexto `reports` existente.

---

## 7. Esfuerzo estimado

**M (Medio) — ~4–6 días de desarrollo**

Justificación: la mayor parte del trabajo reutiliza el contexto `reports` existente (F4c fue ~8 días incluyendo FileStorage). Aquí se añaden: extensión del enum y del agregado (~0.5 días), casos de uso nuevos `PublishStructuralReport` y elevación de prioridad (~1 día), endpoint GeoJSON público (~1 día), capa Leaflet en el mapa (~1 día), cola con urgentes y modal de publicación en el front (~1.5 días), notificaciones (~0.5 días), tests (~1 día). El esfuerzo total es menor que F4c porque no se parte de cero: FileStorage, cola de coordinación y mapa ya existen.

---

## 8. Decisiones abiertas (para PM)

1. **¿Extender `reports` o crear contexto `damage-reports` propio?**
   - Extender (propuesto): menor esfuerzo, reutiliza FileStorage/cola/guards. Riesgo: si el contexto SAR crece mucho, el agregado `Report` se vuelve demasiado genérico.
   - Contexto propio: más limpio DDD-puristamente, pero duplica infraestructura y añade ~2–3 días de esfuerzo sin valor diferencial en el MVP.
   - **Propuesta:** extender. Revisitar en el futuro si SAR necesita despacho de equipos o integración con Protección Civil.

2. **¿Quién valida / publica: coordinador de la emergencia o un rol específico SAR/Protección Civil?**
   - Coordinador existente (propuesto para MVP): no requiere nuevo rol; ya gestiona otros tipos de reportes.
   - Rol nuevo `sar_coordinator` o `protection_civil_officer`: más preciso para emergencias grandes, pero requiere cambios en `identity`, guards y UI de asignación de rol.
   - **Propuesta:** coordinador existente en MVP. Documentar que en despliegues con Protección Civil se necesitará un rol nuevo.

3. **¿La capa de daños siempre visible en el mapa o toggle opt-in?**
   - Siempre visible: mayor impacto informativo; puede saturar el mapa en emergencias con muchos reportes.
   - Toggle (propuesto): el usuario activa/desactiva la capa de daños junto a las capas de puntos y necesidades ya existentes.
   - **Propuesta:** toggle opt-in, activado por defecto cuando hay reportes `trapped_persons` publicados.

4. **¿Se permite reportar sin login?**
   - Sin login: más accesible en primeras horas (la persona en el lugar del daño puede no tener cuenta).
   - Con login obligatorio (propuesto): reduce spam y permite dar seguimiento al reporter; el login social (Google/Facebook) ya existe y facilita el acceso rápido.
   - **Propuesta:** login obligatorio; destacar el login social como opción rápida en el CTA "Reportar daños".

5. **¿Qué sucede cuando se crea un reporte `trapped_persons` fuera del horario de coordinación?**
   - Las notificaciones in-app solo son visibles si el coordinador está conectado.
   - Fuera del MVP: explorar SMS/WhatsApp de escalado urgente al teléfono del coordinador de guardia.
   - **Propuesta:** documentarlo como riesgo operativo aceptado en MVP; implementar escalado externo en siguiente iteración.
