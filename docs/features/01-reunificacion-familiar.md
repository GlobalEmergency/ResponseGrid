# 01 · Reunificación familiar / personas desaparecidas — Dominio: Personas y reunificación

> Caso de uso capturado del análisis de REDH para el roadmap de ReliefHub. Entregable independiente y abordable por separado.

---

## 1. Origen (qué hace REDH)

REDH incluye un formulario de "Buscar familiar" donde el solicitante registra:
- Datos de la persona buscada: nombre, apellido, cédula/documento de identidad, edad aproximada, última ubicación conocida.
- Datos del solicitante (reporter): nombre y teléfono de contacto.
- Consentimiento explícito del solicitante para el tratamiento de datos.

La solicitud es **estrictamente privada**: solo personal autorizado (no el público general) puede consultarla. El sistema contempla además una cola de envío offline para zonas con conectividad degradada.

---

## 2. Problema / valor para ReliefHub

**Hueco que cubre:** ReliefHub no tiene ningún mecanismo para personas buscadas o desaparecidas. Toda la información actualmente visible es logística (puntos, necesidades, ofertas). En una catástrofe de "primeras horas" (terremoto, inundación, colapso de edificios), la reunificación familiar es una necesidad crítica que llega antes que la logística de ayuda material.

**Fase:** primeras horas y operación temprana (primeras 24–72 h).

**Riesgo sin esta feature:** las personas usan canales no estructurados (WhatsApp, redes sociales) con los consiguientes problemas de privacidad y coordinación. Un sistema centralizado y privado reduce la carga sobre la coordinación y protege los datos sensibles.

**Por qué es privada:** los datos (documento de identidad, teléfono, ubicación) son datos personales sensibles. Publicarlos abiertamente viola el GDPR/LOPD y puede poner en peligro a las personas (robo de identidad, violencia de género en contextos de desastre).

---

## 3. Propuesta

### 3.1 Modelo (DDD/Hexagonal)

**Nuevo bounded context:** `reunification` (o `missing-persons`)

**Agregado raíz: `MissingPersonReport`**

```
MissingPersonReport
  id: MissingPersonReportId          // UUID
  emergencyId: EmergencyId           // shared kernel
  // Persona buscada
  person:
    firstName: string
    lastName: string
    documentId?: string              // cédula/NIE/pasaporte — opcional pero clave para cruce
    approximateAge?: number
    lastKnownLocation: string        // dirección textual libre (puede ir sin coords si no se saben)
    lastKnownCoords?: Location       // shared kernel — opcional
    description?: string             // rasgos físicos, ropa, etc.
  // Reporter (solicitante)
  reporter: ReporterInfo
    userId?: UserId                  // si hace login
    name: string                     // obligatorio (anónimo-con-contacto)
    phone: string                    // obligatorio
    email?: string
  // Estado
  status: MissingPersonStatus        // open | under_review | matched | closed
  consentGiven: boolean              // true obligatorio para crear
  // Avistamientos registrados
  sightings: Sighting[]
    id: SightingId
    reportedBy: UserId | string      // user autenticado o nombre libre
    location: string
    coords?: Location
    note: string
    reportedAt: Date
  // Metadatos
  createdAt: Date
  updatedAt: Date
  reviewedBy?: UserId                // coordinador/personal autorizado que revisó
  matchNote?: string                 // nota al resolver el cruce
```

**Value Objects:**
- `ReporterInfo` — encapsula el contacto del solicitante; validación: nombre no vacío, teléfono con formato básico.
- `MissingPersonStatus` — enum con transiciones válidas: `open → under_review → matched | closed`; `matched` también puede transitar a `closed`.
- `PersonData` — agrupa los campos de la persona buscada; `documentId` normalizado (trim + mayúsculas) para facilitar el cruce.

**Invariantes:**
- `consentGiven` debe ser `true` para crear el reporte (sin consentimiento no se persiste).
- Solo `personal_autorizado` (ver Decisiones abiertas) puede leer la lista completa y cambiar el estado.
- Una vez en estado `matched` o `closed`, no se pueden añadir avistamientos.
- El `documentId`, teléfono y email del reporter **nunca aparecen** en ninguna respuesta pública.

**Eventos de dominio:**
- `MissingPersonReportCreated` — dispara notificación in-app a coordinadores de la emergencia (`notifications` context, puerto `Notifications`).
- `MissingPersonReportMatched` — notifica al coordinador y, si se tiene email/push, al reporter.
- `SightingRegistered` — notifica al coordinador (puede indicar pista activa).

### 3.2 Casos de uso (comandos/queries)

**Comandos:**
| Caso de uso | Actor | Descripción |
|---|---|---|
| `CreateMissingPersonReport` | Particular (login o anónimo-con-contacto) | Crea el reporte; requiere consentimiento = true |
| `RegisterSighting` | Particular autenticado o personal_autorizado | Añade avistamiento a un reporte open/under_review |
| `UpdateReportStatus` | Personal_autorizado | Cambia estado (open→under_review→matched/closed) con nota opcional |
| `CloseReport` | Personal_autorizado | Cierra un reporte (sin cruce encontrado o resuelto por otro medio) |

**Queries:**
| Consulta | Actor | Descripción |
|---|---|---|
| `GetMissingPersonReport` | Personal_autorizado | Detalle completo de un reporte (incluye datos sensibles) |
| `ListMissingPersonReports` | Personal_autorizado | Lista de reportes de una emergencia con filtros (status, fecha) |
| `SearchByDocumentId` | Personal_autorizado | Búsqueda exacta o parcial por documentId para cruzar reportes |
| `GetMyReport` | Reporter autenticado | Ver su propio reporte (sin ver datos de otros reportes) |

### 3.3 API (endpoints clave)

```
POST   /emergencies/:emergencyId/reunification
       Body: { person, reporter, consentGiven }
       → 201 { id, status: 'open' }
       Auth: público (anónimo-con-contacto) o autenticado

GET    /emergencies/:emergencyId/reunification
       → lista de reportes (solo personal_autorizado)
       Auth: RequireEmergencyCoordinatorGuard | RequireAdminGuard | RequirePersonalAutorizadoGuard

GET    /emergencies/:emergencyId/reunification/search?documentId=...
       → coincidencias por documentId (solo personal_autorizado)

GET    /emergencies/:emergencyId/reunification/mine
       → reporte propio del reporter autenticado
       Auth: JWT obligatorio

GET    /reunification/:reportId
       → detalle completo (solo personal_autorizado)

PATCH  /reunification/:reportId/status
       Body: { status, matchNote? }
       Auth: personal_autorizado

POST   /reunification/:reportId/sightings
       Body: { location, coords?, note }
       Auth: autenticado o personal_autorizado
```

Todos los endpoints de lectura/escritura de esta ruta están protegidos por el `EmergencyLookup` factory existente para resolver `emergencyId` desde slug o UUID, igual que el resto de contextos.

### 3.4 Frontend (Atomic Design)

**Átomos:**
- `ConsentCheckbox` — checkbox con texto legal, bloqueante si no se marca.
- `StatusBadgeReunification` — badge de estado (`open` / `en revisión` / `encontrado` / `cerrado`) con color.
- `PrivacyNote` — alert/callout que recuerda al usuario que los datos son privados y solo accesibles por personal autorizado.

**Moléculas:**
- `MissingPersonForm` — formulario de alta (persona + reporter + consentimiento); usa `useFormDraft` para autoguardado (PWA/offline), igual que el resto de formularios existentes.
- `SightingForm` — formulario mini para añadir avistamiento (ubicación + nota).
- `MissingPersonCard` — tarjeta para la lista del panel de coordinación: nombre, edad aprox, estado, fecha, botón "revisar".

**Organismos:**
- `MissingPersonQueue` — tabla/lista en `/coordinacion/reunificacion`; columnas: nombre, documento (parcialmente enmascarado), estado, fecha; acciones: cambiar estado, añadir nota de cruce.
- `MissingPersonDetail` — vista completa del reporte (solo coordinador/personal_autorizado): todos los campos + historial de avistamientos + formulario de cambio de estado.

**Páginas / rutas:**
- `/e/[slug]/buscar-familiar` — formulario público de alta de reporte (con `PrivacyNote` prominente).
- `/e/[slug]/coordinacion/reunificacion` — cola para personal_autorizado.
- `/mi-busqueda` — vista del reporter autenticado de su propio reporte.

**CTA en landing:** botón/enlace "Buscar familiar" visible en la landing pública de la emergencia junto a los 4 CTAs existentes (registrar punto, petición, donar material, apuntarme como voluntario).

### 3.5 Encaje con lo existente

| Patrón / contexto ReliefHub | Cómo se reutiliza |
|---|---|
| `EmergencyId` (shared kernel) | Aísla los reportes por emergencia, igual que todos los demás contextos. |
| `EmergencyLookup` factory | Resuelve slug → emergencyId en los guards, sin lógica propia. |
| `RequireEmergencyCoordinatorGuard` | Base para el guard de personal_autorizado (o se extiende con un rol nuevo). |
| Kill-switch (`EmergencyStatusReader`) | `CreateMissingPersonReport` verifica que la emergencia esté activa (no paused/closed). |
| `notifications` context (puerto `Notifications`) | Dispara notificaciones in-app a coordinadores en `MissingPersonReportCreated` y `SightingRegistered`. |
| `useFormDraft` (hook PWA) | El formulario de alta usa autoguardado en localStorage, igual que voluntarios/reportes. |
| Cola offline (BullMQ) | `CreateMissingPersonReport` puede encolarse si el cliente lo detecta offline (igual que diseño F4c). |
| Drizzle + Postgres | Tabla `missing_person_reports` + `sightings` con FK → emergencies y opcionalmente → users. |

---

## 4. Alcance

### Primer corte (MVP)

- Alta de reporte (persona + reporter + consentimiento) — login opcional (anónimo-con-contacto).
- Cola de revisión para personal_autorizado en panel de coordinación.
- Cambio de estado (open → under_review → matched/closed) con nota.
- Búsqueda por documentId (cruce manual por coordinador).
- Vista "mi búsqueda" para reporters autenticados.
- CTA "Buscar familiar" en landing.
- Notificación in-app a coordinadores al crear reporte.

### Futuro / fuera de alcance

- Cruce automático por documentId entre reportes (algoritmo de matching).
- Avistamientos geo-localizados en mapa (capa privada solo para coordinadores).
- Integración con bases de datos externas (Cruz Roja, Protección Civil).
- SMS/WhatsApp al reporter cuando se encuentra a la persona.
- Exportación de lista (CSV) para coordinación inter-agencia.
- Foto de la persona buscada (requiere FileStorage y consideraciones GDPR adicionales).
- Eliminación automática de datos tras N días (retención GDPR).

---

## 5. Dependencias

| Dependencia | Tipo | Nota |
|---|---|---|
| `emergencies` context | Existente | Kill-switch + EmergencyId |
| `identity` context | Existente | JWT, roles, guards; posible nuevo rol |
| `notifications` context (F5b) | Existente | Notif. in-app a coordinadores |
| `shared/domain` (EmergencyId, Location) | Existente | Value objects del shared kernel |
| BullMQ / cola offline | Existente | Para encolar si offline |
| Drizzle migration | Nueva | Tablas `missing_person_reports`, `sightings` |
| Rol `personal_autorizado` | Pendiente (Decisión abierta) | Puede ser nuevo rol o alias de coordinador |

---

## 6. Privacidad / seguridad / GDPR

- **Base legal:** consentimiento explícito del solicitante (art. 6.1.a RGPD). Sin `consentGiven = true` no se persiste nada.
- **Minimización de datos:** solo se recogen los campos estrictamente necesarios. `documentId` es opcional (aunque valioso para el cruce).
- **Acceso restringido:** ningún endpoint público devuelve datos de reportes. Solo personal_autorizado accede a la lista y al detalle completo. El reporter autenticado solo ve su propio reporte.
- **Enmascaramiento en UI:** en la lista de coordinación, el documentId aparece parcialmente enmascarado (p. ej. `V-**1234`). El teléfono del reporter solo visible al abrir el detalle.
- **Retención:** definir política de retención (p. ej. borrado automático 90 días tras cierre de emergencia). Fuera del MVP pero debe diseñarse desde el principio en el esquema DB (campo `purgeAfter`).
- **Logs de auditoría:** toda consulta y cambio de estado del reporte debe quedar en `audit_log` (contexto `audit`, `AuditInterceptor` global ya existente).
- **No indexación:** las rutas `/e/[slug]/buscar-familiar` y `/mi-busqueda` deben incluir `noindex, nofollow` en el meta (no deben aparecer en buscadores).
- **Cifrado en reposo:** considerar cifrar `documentId` y `phone` en BD (fuera del MVP, pero documentarlo como riesgo aceptado).

---

## 7. Esfuerzo estimado

**M (Medio) — ~5–8 días de desarrollo**

Justificación: el modelo es nuevo (contexto propio + 2 tablas) pero sigue exactamente los patrones hexagonales ya establecidos. Los casos de uso son CRUD + cambio de estado, sin lógica de matching automático. El frontend reutiliza `useFormDraft`, la cola de coordinación y los patrones de guards existentes. El mayor esfuerzo está en la gestión cuidadosa de privacidad (guards, enmascaramiento en UI, auditoría) y en la decisión de arquitectura sobre el rol `personal_autorizado`.

---

## 8. Decisiones abiertas (para PM)

1. **¿Login obligatorio o anónimo-con-contacto?**
   - Anónimo-con-contacto (nombre + teléfono) es más accesible en primeras horas (la víctima puede no tener cuenta), pero dificulta "ver mi búsqueda" y aumenta el riesgo de spam.
   - Login obligatorio filtra mejor pero excluye a quien no tiene cuenta en el peor momento.
   - **Propuesta:** anónimo-con-contacto para el alta; login opcional para ver el estado del propio reporte. Valorar captcha simple para reducir spam anónimo.

2. **¿Quién es "personal autorizado"?**
   - ¿Es el rol `coordinator` existente (por emergencia) o se crea un rol nuevo (`missing_persons_officer`)?
   - Si se crea un rol nuevo, requiere cambios en `identity` (tabla de membresías), nuevo guard y nueva UI de asignación de rol.
   - **Propuesta:** en MVP, reutilizar el rol `coordinator` de la emergencia. En futuro, rol dedicado con acceso inter-emergencia (p. ej. Cruz Roja regional).

3. **¿Se permiten avistamientos anónimos?**
   - Cualquier persona podría añadir un avistamiento ("vi a alguien con esas características en X lugar"), lo que es valioso pero puede generar ruido o información falsa.
   - **Propuesta:** avistamientos solo por usuarios autenticados o por personal_autorizado, no anónimos.

4. **¿Foto de la persona buscada en el MVP?**
   - Añade muchísimo valor para el cruce pero implica FileStorage, GDPR para imagen de una tercera persona, y consentimiento adicional.
   - **Propuesta:** fuera del MVP. Incluir el campo en el modelo con `photoUrl?: string` para reservar el espacio.

5. **Retención de datos: ¿quién decide el plazo y cómo se activa el borrado?**
   - Necesita política legal explícita antes de producción.
