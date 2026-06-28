# 04 · Plantilla y categorías sanitarias — Dominio: Vertical sanitario

> Caso de uso capturado del análisis de REDH para el roadmap de ReliefHub. Entregable independiente y abordable por separado.

---

## 1. Origen (qué hace REDH)

REDH es una plataforma sanitaria desplegada para el sismo de Venezuela (Caracas / La Guaira / Miranda). Sus categorías de necesidades reflejan el dominio hospitalario:

| Categoría REDH | Ejemplos típicos |
|---|---|
| 💊 Medicamentos | Vasopresores, antibióticos, analgésicos pediátricos, insulina, sueros |
| 🩺 Equipos médicos | Ventiladores, monitores, desfibriladores, material de sutura |
| 📦 Insumos | Guantes, gasas, jeringas, apósitos, mascarillas quirúrgicas |
| 🧑‍⚕️ Personal | Médicos, enfermeros, técnicos de laboratorio, psicólogos de emergencia |
| 🏷️ Otros | Generadores, camillas, transporte sanitario |

La plataforma ofrece además plantillas de emergencia (p.ej. "Sismo urbano") que precarga:
- Lista de "qué NO llevar" adaptada al tipo (en sanitario: productos no estériles sin empaquetar, medicamentos sin prospecto, equipos sin batería, personas sin formación mínima).
- Comunicado de apertura por defecto ("Atención, hospital X activa protocolo de emergencia sísmica…").
- Categorías de necesidades preseleccionadas, reduciendo la fricción de alta.

---

## 2. Problema / valor para ReliefHub

**Problema actual:** `NeedCategory` es un enum fijo global (`food | water | hygiene | medical | shelter | tools | other`). La categoría `medical` agrupa todo lo sanitario sin distinción entre medicamentos, equipos, insumos y personal. Eso impide:
- Filtrado preciso en coordinación (¿cuántas necesidades de ventiladores hay?).
- Despliegues verticales de salud (hospitales, refugios médicos) que requieren taxonomía médica propia.
- Listas de "qué NO llevar" sanitarias cargadas automáticamente.

**Valor:** Activar el **vertical sanitario** en ReliefHub permitirá que hospitales y organizaciones de salud coordinen emergencias con la misma plataforma, sin adaptar un vocabulario pensado para ayuda humanitaria genérica.

---

## 3. Propuesta

### 3.1 Modelo (DDD/Hexagonal)

#### Contexto `templates` (ya existe)

El agregado `EmergencyTemplate` ya tiene:
- `dontBringList: string[]`
- `defaultAnnouncement: string`
- El caso de uso `CreateEmergencyFromTemplate` que propaga ambos campos a la emergencia.

**Propuesta:** añadir al agregado `EmergencyTemplate` un campo `defaultNeedCategories: NeedCategory[]` (o equivalente parametrizado, ver opciones A/B abajo). Una plantilla sanitaria precargaría las categorías relevantes.

#### Contexto `needs` — Opciones para las categorías

Hay dos opciones arquitectónicas con trade-offs distintos:

---

**Opción A — Extender el enum global `NeedCategory`**

```ts
// shared/domain/need-category.ts
export enum NeedCategory {
  // genéricas (existentes)
  food       = 'food',
  water      = 'water',
  hygiene    = 'hygiene',
  medical    = 'medical',       // mantener por retrocompat
  shelter    = 'shelter',
  tools      = 'tools',
  other      = 'other',
  // nuevas (vertical sanitario)
  medicines           = 'medicines',
  medical_equipment   = 'medical_equipment',
  medical_supplies    = 'medical_supplies',
  medical_personnel   = 'medical_personnel',
}
```

- Ventajas: simple, un único enum, compatible con el cliente tipado, filtraje global sin cambio de interfaz.
- Desventajas: el enum crece con cada vertical (ej. un futuro vertical logístico); las categorías son globales aunque no tengan sentido en todas las emergencias; migración de BD (ALTER TYPE).

---

**Opción B — Categorías configurables por emergencia / plantilla** *(recomendada)*

El enum `NeedCategory` permanece como **vocabulario base** (las 7 existentes). Se introduce en el dominio una entidad `EmergencyNeedCategory` ligada a la emergencia:

```
EmergencyNeedCategory
  ├── emergencyId: EmergencyId
  ├── slug: string              // identificador único dentro de la emergencia
  ├── label: string             // etiqueta localizable
  ├── baseCategory: NeedCategory  // agrupa a efectos de estadísticas globales
  └── sortOrder: number
```

Una `EmergencyTemplate` puede incluir una lista `customNeedCategories: EmergencyNeedCategorySpec[]` que se copia al crear la emergencia desde plantilla.

Al registrar una necesidad, el frontend muestra las categorías configuradas para esa emergencia (las custom si existen, el enum base si no). La validación de dominio acepta el `slug` de categoría válido para esa emergencia.

- Ventajas: cada emergencia tiene su taxonomía; el enum base no crece; escalable a múltiples verticales; sin migración de tipo enum.
- Desventajas: mayor complejidad (tabla `emergency_need_categories`, lógica de "categorías permitidas" en el guard de creación de need); el filtrado global por categoría requiere un mapa slug→baseCategory.

---

**Recomendación:** Opción B. El enum global ya tiene `medical`; añadir 4 variantes médicas lo infla y sienta precedente de crecer con cada vertical. Las categorías por emergencia/plantilla son el modelo correcto a largo plazo y encajan naturalmente con el concepto de plantilla ya existente.

#### Nuevas entidades de dominio (solo si Opción B)

```
EmergencyNeedCategory (value object / entidad ligera)
  └── en contexto `needs` o en `templates` (decisión abierta, ver §8)
```

#### Plantilla sanitaria propuesta

`EmergencyTemplate` nueva con:
```
name: "Emergencia sanitaria / Sismo"
type: "health"
dontBringList:
  - Medicamentos sin envase original o sin prospecto
  - Equipos médicos sin batería ni manual
  - Alimentos perecederos sin refrigeración
  - Donantes de sangre no convocados por los servicios de salud
  - Personas sin formación sanitaria mínima en zonas de atención
defaultAnnouncement: >
  Activado protocolo de emergencia sanitaria. Coordinamos necesidades de
  medicamentos, equipos e insumos médicos. Solo personal sanitario
  acreditado en zonas de triaje.
customNeedCategories:
  - { slug: medicines,         label: Medicamentos,    baseCategory: medical }
  - { slug: medical_equipment, label: Equipos médicos, baseCategory: medical }
  - { slug: medical_supplies,  label: Insumos,         baseCategory: medical }
  - { slug: medical_personnel, label: Personal,        baseCategory: other }
  - { slug: other_health,      label: Otros,           baseCategory: other }
```

### 3.2 Casos de uso

| Caso de uso | Contexto | Descripción |
|---|---|---|
| `CreateEmergencyFromTemplate` | `templates` | Ya existe; extender para copiar `customNeedCategories` a la emergencia |
| `ListNeedCategoriesForEmergency` | `needs` | Devuelve categorías configuradas (custom o enum base) |
| `CreateNeed` | `needs` | Valida que la categoría enviada sea válida para esa emergencia |
| `AdminSeedHealthTemplate` | `templates` | Seed de la plantilla sanitaria (script de inicialización) |

### 3.3 API

```
GET  /emergencies/:id/need-categories
     → NeedCategoryDto[]  { slug, label, baseCategory, sortOrder }

POST /emergencies/:id/needs
     body: { ..., category: string }   // slug validado por el caso de uso
     (sin cambio de contrato si la categoría es el slug)

# Admin / templates
GET  /templates                        // ya existe
POST /templates                        // ya existe; extender DTO con customNeedCategories
GET  /templates/:id                    // ya existe
```

Migración Drizzle necesaria (si Opción B):
```sql
CREATE TABLE emergency_need_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  label       TEXT NOT NULL,
  base_category TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (emergency_id, slug)
);
```

### 3.4 Frontend (Atomic Design)

| Capa | Componente | Descripción |
|---|---|---|
| Átomo | `CategoryBadge` | Pastilla de color con icono emoji + etiqueta (generaliza el filtro existente) |
| Molécula | `NeedCategorySelector` | Dropdown/chips que carga las categorías de la emergencia vía `GET /emergencies/:id/need-categories`; reemplaza el selector fijo actual |
| Organismo | `HealthTemplateAdminForm` | Formulario admin para crear/editar plantillas con lista de categorías custom y dontBringList |
| Página | `/e/[slug]/peticion` | Usa `NeedCategorySelector` en lugar del enum hardcodeado |
| Página | `/admin/templates` | Añade sección "Categorías de la plantilla" (ya existe la página, se amplía) |

El frontend solicita las categorías al montar el formulario de petición. Si la emergencia no tiene categorías custom, usa el enum base traducido (i18n existente).

### 3.5 Encaje con lo existente

- **`templates`:** `CreateEmergencyFromTemplate` ya copia `dontBringList` y `defaultAnnouncement`; se extiende para copiar `customNeedCategories`.
- **`needs`:** `NeedItem.category` ya es `NeedCategory` enum; con Opción B pasa a ser `string` validado; la capa de aplicación convierte. El filtro de coordinación (`category` query param en `GET /emergencies/:id/needs`) sigue funcionando con el slug.
- **`i18n`:** las etiquetas de categoría se almacenan como texto en BD; el selector las muestra directas sin clave i18n, lo que simplifica la traducción.
- **`accreditation`:** no afectado.
- **`volunteers`:** la categoría `medical_personnel` converge con la feature 05 (ver ficha independiente).

---

## 4. Alcance

### Primer corte (MVP)

- Tabla `emergency_need_categories` + repositorio en `needs`.
- `CreateEmergencyFromTemplate` copia categorías.
- `ListNeedCategoriesForEmergency` (caso de uso + endpoint).
- Validación en `CreateNeed` (categoría válida para la emergencia).
- `NeedCategorySelector` molécula + integración en `/peticion`.
- Seed de la plantilla sanitaria (script o admin UI).
- Tests unitarios del caso de uso + integración del endpoint.

### Futuro

- Editor de categorías por emergencia (admin) sin plantilla previa.
- Categorías jerárquicas (p.ej. Medicamentos → Pediátricos).
- Iconos/colores configurables por categoría.
- Estadísticas por categoría custom (para el widget de métricas).
- Opción A como fallback: si el cliente tiene enum hardcodeado, aceptar las 7 categorías base aunque la emergencia tenga custom.

---

## 5. Dependencias

| Dependencia | Estado |
|---|---|
| Contexto `templates` (`EmergencyTemplate`, `CreateEmergencyFromTemplate`) | ✅ Hecho (F5a) |
| Contexto `needs` (estructura `NeedItem.category`) | ✅ Hecho |
| `pnpm gen:api` tras añadir endpoint | Obligatorio (GOTCHA recurrente) |
| Migración Drizzle manual vía psql (drizzle-kit cuelga en Windows) | Aplicar a dev y test |
| Seed de la plantilla sanitaria | Script nuevo o carga admin |

---

## 6. Privacidad / seguridad / GDPR

- Las categorías son metadata de emergencia, no datos personales. Sin impacto GDPR directo.
- La categoría `medical_personnel` en una necesidad puede inferir carencias de plantilla del hospital; no exponer estadísticas desagregadas a usuarios anónimos.
- El endpoint de categorías es público (read-only), igual que las categorías de necesidades actuales.

---

## 7. Esfuerzo estimado

**M (medio) — 3-5 días de desarrollo**

- Backend: tabla + repositorio + 2 casos de uso + extensión de plantilla → ~2 días.
- Frontend: `NeedCategorySelector` + integración + admin de plantilla → ~1,5 días.
- Tests + migración + seed → ~1 día.

La Opción A (enum global) sería S (~1 día) pero genera deuda de diseño.

---

## 8. Decisiones abiertas (para PM)

1. **¿Opción A (enum global con 4 nuevas entradas) o Opción B (categorías por emergencia/plantilla)?**
   La recomendación técnica es B, pero A es más rápida si el vertical sanitario es el único previsto y no se esperan más verticales a corto plazo.

2. **¿Dónde vive la entidad `EmergencyNeedCategory`?** ¿En el contexto `needs` (las categorías son parte del lenguaje de necesidades) o en `templates` (las categorías se definen al crear la emergencia desde plantilla)? Propuesta: en `needs`, con un puerto de lectura desde `templates`.

3. **¿La plantilla sanitaria se crea con seed inicial o vía admin UI?** El seed es más rápido para MVP; la UI admin permite que el operador cree más plantillas sin código.

4. **¿`medical_personnel` como categoría de need o como tipo especial con skill requerida?** Esta decisión conecta directamente con la feature 05. Si se elige Opción B, `medical_personnel` puede ser simplemente una categoría custom; la lógica de matching con voluntarios va en feature 05.

5. **¿Retrocompatibilidad?** Las necesidades existentes con categoría `medical` del enum base ¿se migran automáticamente o coexisten?
