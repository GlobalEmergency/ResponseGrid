> ⚠️ **DEPRECADO** — ficha congelada como referencia histórica. El seguimiento de esta feature vive en **GitHub Issues**: implementada. No edites esta ficha; trabaja en el issue. Convención: ver `AGENTS.md` y [`00-indice.md`](00-indice.md).

# 05 · Personal como necesidad ↔ voluntarios — Dominio: Vertical sanitario

> Caso de uso capturado del análisis de REDH para el roadmap de ReliefHub. Entregable independiente y abordable por separado.

> **Nota (estructura actual):** la categoría **Personal** sanitario ya existe como `medical_personnel` en el enum canónico **`Category`** del bounded context **`supplies`**. Donde la ficha dice `NeedItem` la línea es hoy el value object **`SupplyLine`** (persistido en `need_items`). El matching personal↔voluntarios sigue siendo el objeto pendiente de esta ficha.

---

## 1. Origen (qué hace REDH)

En REDH, la categoría **🧑‍⚕️ Personal** permite que un hospital o refugio médico registre una necesidad de personal sanitario (médicos de urgencias, enfermeros, técnicos de laboratorio, psicólogos de crisis). Las necesidades de personal se listan separadas de las materiales y el coordinador las gestiona de forma diferente: en lugar de buscar un donante de material, busca a alguien disponible con la formación adecuada.

REDH no tiene un módulo de voluntarios propio: el "matching" se hace de forma manual (el coordinador consulta una lista de contactos externa y llama). El registro de disponibilidad y skills del personal que se ofrece es ad-hoc (formulario de texto libre o WhatsApp).

---

## 2. Problema / valor para ReliefHub

**Problema actual:** ReliefHub ya tiene:
- Un roster de voluntarios (`volunteers`) con `skills: VolunteerSkill[]` y `availability`.
- Un sistema de tareas (`Task`) con `requiredSkill?: VolunteerSkill` y asignación.
- Un sistema de necesidades (`needs`) con categorías materiales.

Sin embargo, **las necesidades de tipo "personal" no están conectadas con el roster**. Un coordinador que registra "necesito 2 médicos de urgencias" lo hace como texto libre en descripción, y luego busca voluntarios a mano en otra pantalla.

**Valor:** Unir la dimensión "personal" de las necesidades con el roster crea un flujo de coordinación cerrado:
1. La org registra una need de personal con skill requerida.
2. El sistema sugiere voluntarios del roster con esa skill y disponibilidad.
3. El coordinador crea una `Task` desde la need (o asigna directamente).
4. El voluntario recibe la asignación y hace check-in/out.

Esto completa el ciclo needs ↔ volunteers sin duplicar datos y reutilizando contextos ya construidos.

---

## 3. Propuesta

### 3.1 Modelo (DDD/Hexagonal)

#### Enum `VolunteerSkill` (ya existe en `volunteers`)

```ts
export enum VolunteerSkill {
  driving   = 'driving',
  medical   = 'medical',
  logistics = 'logistics',
  cooking   = 'cooking',
  languages = 'languages',
  admin     = 'admin',
  general   = 'general',
}
```

La skill `medical` es la candidata principal para las necesidades de personal sanitario. Si el vertical sanitario necesita más granularidad (médico, enfermero, técnico), tiene dos opciones:

- **Opción A:** Añadir valores al enum (`nurse`, `lab_technician`, `paramedic`, …).
- **Opción B:** Usar `medical` como base y añadir un campo libre `skillSpecialty?: string` en la need (texto: "médico urgencias pediátricas"). La skill del enum actúa como filtro grueso; la especialidad como texto adicional para el coordinador.

Recomendación: **Opción B** para el MVP (no rompe el enum, la granularidad se captura sin nueva migración de tipo). Opción A si el directorio de voluntarios crece y se quiere filtrar por especialidad en el roster.

#### Extensión del agregado `Need`

Se añade un campo opcional al ítem de need (o a la need completa si es monopropósito):

```ts
// En NeedItem o en Need directamente
requiredSkill?: VolunteerSkill   // si category === 'medical_personnel' (o slug equivalente)
skillSpecialty?: string          // texto libre adicional (Opción B)
requestedCount?: number          // cuántas personas se necesitan
```

Invariante de dominio: `requiredSkill` solo tiene sentido si la categoría de la need es de tipo "personal" (slugs `medical_personnel` de la plantilla sanitaria, o categoría base `other` con este propósito). La validación del caso de uso comprueba la coherencia.

#### Puerto nuevo en `volunteers` (o en `needs`)

Se introduce un puerto de consulta para el matching:

```ts
// Puerto de salida en el contexto `needs`, implementado por la infra de `volunteers`
export interface VolunteerMatcherPort {
  findAvailableBySkill(
    emergencyId: string,
    skill: VolunteerSkill,
    limit?: number
  ): Promise<VolunteerMatchResult[]>
}

export interface VolunteerMatchResult {
  volunteerId: string
  userId: string
  name: string
  skills: VolunteerSkill[]
  hasVehicle: boolean
  availability: string
  distance?: number  // futuro, cuando haya ubicación de voluntario
}
```

La implementación consulta el repositorio de `volunteers` filtrando por `emergencyId`, `status = active`, y `skills contains skill`.

#### Caso de uso `SuggestVolunteersForNeed` (contexto `needs`)

Orquesta la consulta vía `VolunteerMatcherPort` y devuelve los candidatos ordenados. No modifica estado.

#### Caso de uso `CreateTaskFromNeed` (contexto `volunteers` o `needs`)

Crea una `Task` a partir de una `Need` de tipo personal:
- `title`: derivado de la need ("Personal médico — Hospital X").
- `requiredSkill`: copiado de `requiredSkill` de la need.
- `linkedNeedId`: referencia a la need (FK o campo soft).
- El coordinador puede asignar uno o varios voluntarios al crear la tarea.

La `Task` ya tiene el flujo `open → in_progress → completed/cancelled` con check-in/out; no hay que modificar su ciclo de vida.

### 3.2 Casos de uso

| Caso de uso | Contexto | Actor | Descripción |
|---|---|---|---|
| `CreateNeed` (ext.) | `needs` | Org/coordinador | Acepta `requiredSkill` y `requestedCount` si categoría es personal |
| `SuggestVolunteersForNeed` | `needs` | Coordinador | Devuelve voluntarios con la skill requerida + disponibles |
| `CreateTaskFromNeed` | `volunteers` | Coordinador | Crea una Task usando los datos de la need de personal |
| `AssignVolunteerToTask` | `volunteers` | Coordinador | Ya existe; se usa desde el flujo de sugerencia |
| `ListNeedsWithSuggestions` | `needs` | Coordinador | Vista de coordinación: needs de personal + nº de voluntarios sugeridos |

### 3.3 API

```
# Sugerencia de voluntarios para una need
GET  /needs/:needId/volunteer-suggestions
     → VolunteerMatchResultDto[]
     Query params: limit (default 10)
     Auth: coordinador de la emergencia

# Crear tarea desde una need de personal
POST /needs/:needId/create-task
     body: {
       volunteerIds?: string[]   // asignaciones iniciales
       dueDate?: string
     }
     → TaskDto
     Auth: coordinador de la emergencia

# Extensión de creación de need (sin cambio de ruta)
POST /emergencies/:id/needs
     body: {
       ...,
       requiredSkill?: VolunteerSkill,
       skillSpecialty?: string,
       requestedCount?: number
     }
```

Cambios en BD (mínimos):

```sql
-- En tabla needs o need_items (según granularidad decidida)
ALTER TABLE needs
  ADD COLUMN required_skill   TEXT,        -- VolunteerSkill
  ADD COLUMN skill_specialty  TEXT,        -- texto libre
  ADD COLUMN requested_count  INTEGER;     -- cuántas personas

-- En tabla tasks (enlace a need)
ALTER TABLE tasks
  ADD COLUMN linked_need_id UUID REFERENCES needs(id) ON DELETE SET NULL;
```

### 3.4 Frontend (Atomic Design)

| Capa | Componente | Descripción |
|---|---|---|
| Átomo | `SkillTag` | Pastilla de skill (reutiliza el estilo de `VolunteerSkillBadge` si existe, o lo crea) |
| Molécula | `PersonnelNeedFields` | Campos adicionales que aparecen en el formulario de need cuando la categoría es "personal": selector de `VolunteerSkill` + campo `skillSpecialty` + `requestedCount` |
| Molécula | `VolunteerSuggestionCard` | Tarjeta de voluntario sugerido: nombre, skills, disponibilidad, botón "Asignar" |
| Organismo | `PersonnelNeedPanel` | Panel de coordinación para una need de personal: datos + lista de sugerencias + botón "Crear tarea" |
| Página | `/e/[slug]/peticion` | Muestra `PersonnelNeedFields` condicionalmente cuando se selecciona categoría personal |
| Página | `/coordinacion/necesidades` | Columna o sección específica para needs de personal + `PersonnelNeedPanel` |
| Página | `/coordinacion/voluntarios` | Ya existe; enlace inverso: "tareas creadas desde necesidades" |

El flujo UI del coordinador:
1. Ve la need de personal en cola de coordinación.
2. Abre `PersonnelNeedPanel` → lista de sugerencias cargada automáticamente.
3. Selecciona uno o varios voluntarios → pulsa "Crear tarea y asignar".
4. La tarea queda en el roster de voluntarios con estado `in_progress` (si hay asignación inmediata) o `open`.

### 3.5 Encaje con lo existente

- **`needs`:** extensión mínima (3 campos opcionales + validación en `CreateNeed`). El flujo `crear → validar → publicar` no cambia.
- **`volunteers`:** `Task` ya tiene `requiredSkill?` y el flujo de asignación. Solo se añade `linkedNeedId` y el caso de uso `CreateTaskFromNeed`.
- **`templates`:** la plantilla sanitaria (feature 04) define la categoría `medical_personnel`; esta feature la usa para activar los campos adicionales. Dependencia lógica, no técnica.
- **`notifications`:** al crear una tarea desde una need y asignarla, el voluntario ya recibiría la notificación de `assign-task` del sistema de notificaciones existente (F5b). Sin cambios.
- **`accreditation`:** no afectado. Las needs de personal siguen el mismo flujo de validación que las materiales.
- **Límite hexagonal:** `VolunteerMatcherPort` cruza el contexto `needs` → `volunteers`. La implementación va en infra de `volunteers`; la interfaz del puerto en `needs/domain/ports`. Esto respeta las reglas de `no-restricted-imports` (el dominio de needs solo ve el puerto, no el repositorio de volunteers).

---

## 4. Alcance

### Primer corte (MVP)

- Campos `requiredSkill`, `skillSpecialty`, `requestedCount` en `Need` (dominio + BD).
- Validación en `CreateNeed`: si categoría personal, `requiredSkill` requerida (ver decisión §8).
- Puerto `VolunteerMatcherPort` + implementación en infra volunteers.
- Caso de uso `SuggestVolunteersForNeed` + endpoint `GET /needs/:id/volunteer-suggestions`.
- Campo `linkedNeedId` en `Task` + caso de uso `CreateTaskFromNeed` + endpoint `POST /needs/:id/create-task`.
- Molécula `PersonnelNeedFields` en formulario de petición (condicional por categoría).
- Panel de sugerencias en coordinación (puede ser modal o panel lateral).
- Tests: unidad de `SuggestVolunteersForNeed` + integración del endpoint + e2e del flujo completo.

### Futuro

- Asignación múltiple: una need de 5 médicos crea 5 tareas o 1 tarea con 5 asignados.
- Seguimiento de cobertura: need de 5 personas, 3 asignadas → progreso visible.
- Notificación push al voluntario cuando se crea una tarea con su skill (requiere PWA push real).
- Matching geográfico: voluntarios ordenados por proximidad a la ubicación de la need.
- Voluntario acepta/rechaza sugerencia antes de que el coordinador confirme (flujo pull).
- Ampliar `VolunteerSkill` con especialidades médicas (Opción A del enum) si hay demanda.
- Dashboard de cobertura de personal por emergencia (widget de métricas).

---

## 5. Dependencias

| Dependencia | Estado |
|---|---|
| Contexto `volunteers` (roster + `Task` + `requiredSkill`) | ✅ Hecho (F4b) |
| Contexto `needs` (ítems, validación, cola coordinación) | ✅ Hecho |
| Feature 04 (categoría `medical_personnel`) | Lógica (conviene hacerla antes o en paralelo) |
| Sistema de notificaciones (`assign-task` trigger) | ✅ Hecho (F5b) |
| `pnpm gen:api` tras añadir endpoints | Obligatorio |
| Migración Drizzle manual vía psql | 2 ALTER TABLE |

---

## 6. Privacidad / seguridad / GDPR

- **Datos de voluntarios expuestos:** `VolunteerMatchResultDto` incluye nombre y skills del voluntario. Debe ser accesible **solo para coordinadores** de la emergencia (guard `RequireCoordinatorGuard` en el endpoint de sugerencias). No es dato público.
- **Consentimiento:** el voluntario ya da consentimiento explícito (`consentGiven: true`) al registrarse en F4b. La visibilidad de su perfil al coordinador está cubierta.
- **`skillSpecialty` como texto libre:** puede contener información sensible (p.ej. "diabético, necesita pausas"). No exponer en vistas públicas ni en logs de auditoría sin seudonimización.
- **`linkedNeedId` en `Task`:** la tarea queda vinculada a la need; si la need se elimina (SET NULL), la tarea persiste pero pierde el enlace. Correcto en términos de auditoría.
- **GDPR:** los datos de voluntarios son datos personales. El derecho de supresión (`DELETE /volunteers/:id`) debe eliminar también las asignaciones a tareas o seudonimizarlas.

---

## 7. Esfuerzo estimado

**M (medio) — 3-5 días de desarrollo**

- Backend: 3 campos en need + puerto + 2 casos de uso + 2 endpoints → ~2 días.
- Frontend: `PersonnelNeedFields` + `VolunteerSuggestionCard` + `PersonnelNeedPanel` → ~1,5 días.
- Tests + migración → ~1 día.

La feature 04 puede hacerse en paralelo; ambas son M independientes que convergen en la categoría `medical_personnel`.

---

## 8. Decisiones abiertas (para PM)

1. **¿Una need de "personal" genera tareas automáticamente o solo sugiere voluntarios?**
   - *Solo sugiere:* el coordinador decide cuándo y si crear una tarea. Menos fricción, más control. Adecuado cuando hay incertidumbre sobre la disponibilidad real.
   - *Genera tarea automáticamente al validar la need:* flujo más cerrado pero puede crear tareas "zombi" si el voluntario no responde.
   - **Recomendación:** acción manual del coordinador (botón "Crear tarea desde esta need"). La automatización es futura.

2. **¿`requiredSkill` es obligatoria en una need de tipo personal?**
   - Si obligatoria: el coordinador siempre tiene un filtro para buscar voluntarios; mejor UX de matching.
   - Si opcional: permite registrar "necesito personal" sin especificar skill; útil en el caos inicial.
   - **Recomendación:** opcional en MVP (el formulario la sugiere pero no bloquea). Hacerla obligatoria en el future cuando el roster sea más rico.

3. **¿La sugerencia de voluntarios cruza emergencias?**
   - ¿Un voluntario registrado en la emergencia "venezuela" puede sugerirse para otra emergencia? Probablemente no: el roster es por emergencia. Confirmar.

4. **¿Granularidad de skills para el vertical sanitario?** ¿Añadir `nurse`, `paramedic` al enum `VolunteerSkill` ya en este MVP, o usar `medical` + `skillSpecialty` texto libre?
   La Opción B (texto libre) reduce la migración de BD y del cliente tipado; la Opción A da filtrado estructurado. Depende de cuánto crezca el roster de voluntarios sanitarios.

5. **¿Una need de personal con `requestedCount = 3` genera 1 tarea con 3 asignados o 3 tareas?** El modelo actual de `Task` admite múltiples asignaciones (array de `TaskAssignment`), así que 1 tarea parece lo correcto. ¿Confirmar comportamiento?

6. **¿Visibilidad pública de las needs de personal?** Actualmente las needs publicadas son públicas. ¿Una need de "necesitamos 2 médicos urgencias" debe ser pública (anima a voluntarios a apuntarse) o solo interna (coordinador gestiona desde el roster)?
