> ⚠️ **DEPRECADO** — ficha congelada como referencia histórica. El seguimiento de esta feature vive en **GitHub Issues**: EPIC #59. No edites esta ficha; trabaja en el issue. Convención: ver `AGENTS.md` y [`00-indice.md`](00-indice.md).

# 14 · Destinatarios finales — Dominio: Núcleo de necesidades / Logística de destino

> Caso de uso capturado de un **parte de campo** (La Guaira, 27‑jun; hospitales Domingo Luciani, Clínico Universitario y Militar Carlos Arvelo) y consolidado tras revisión de producto. Entregable abordable por fases. Tracking en el EPIC #59 y sub-issues #60, #62, #67, #64 (núcleo genérico) + #61, #63 (vertical sanitario).

> **Nota (estructura actual):** lo que esta ficha llama `NeedItem` es hoy el value object **`SupplyLine`** del bounded context **`supplies`** (que aporta `Category` + `CategoryDefinition`). El **seguimiento de lo recibido** por el destinatario reutilizaría ese mismo `SupplyLine`. El patrón de taxonomía configurable de la ficha 04 (`EmergencyNeedCategory`) sigue siendo backlog: hoy las categorías se sirven como enum canónico global + tabla `categories` vía `GET /categories`.

Durante la respuesta al sismo, los **centros de salud** reportan que reciben **demasiadas donaciones sin clasificar**: medicamentos en pastillas/jarabes que no sirven para uso hospitalario directo (se necesitan **ampollas / EV / inhaladores**), alimentos que ahora mismo no se requieren, etc. La información de **qué necesita cada centro** está dispersa y es difícil de centralizar; conseguir un **contacto oficial** del centro es el principal cuello de botella.

La observación clave de modelado es que **un centro de salud no es un tipo especial de punto**, sino una instancia de un concepto más general: el **destinatario final** de la ayuda. Es como un nodo en la etapa de **destino** (cf. `ResourceStage.Destination`), pero en lugar de ser un punto genérico "donde la gente va a recoger" (`DeliveryPoint`/`CollectionPoint`), es el **receptor último**. Puede ser de **varios tipos extensibles**: empresa, organización, particular, hospital… *o cualquier otra cosa*. Y necesita **ficha propia** con **seguimiento de lo que ha recibido** (qué, cuánto, cuándo, de quién).

---

## 2. Problema / valor para ResponseGrid

**Problema actual:**
- `ResourceType` (`apps/api/src/contexts/resources/domain/resource-enums.ts`) modela puntos logísticos (`CollectionPoint`, `DeliveryPoint`, `Warehouse`, `Transport`, `Supplier`, `Venue`), pero **no** el rol de **destinatario final**. Un hospital hoy cae en `Venue` genérico.
- Las **necesidades** son autónomas: la tabla `needs` **no** referencia ningún punto/destinatario (no hay `resourceId`). No se puede ver "las necesidades **de** este destinatario" como una lista **1‑a‑N**.
- No existe una **taxonomía de tipos de destinatario** (empresa/organización/particular/hospital…), ni una **ficha de recepciones** que agregue lo que un receptor ha recibido.

**Valor:** un modelo **genérico y escalable** de destinatario final permite:
- Centralizar las peticiones **por receptor** (un hospital, una empresa, una familia… tienen su lista 1‑a‑N).
- Dirigir donaciones al destinatario correcto y reducir el material inservible acumulado.
- Reutilizar el mismo modelo para cualquier vertical (sanitario como **primer caso**, pero no el único).
- Dar trazabilidad **centrada en el receptor** ("qué ha recibido este centro y cuándo").

---

## 3. Propuesta

### 3.1 Modelo (DDD / Hexagonal)

El **destinatario final** es un **rol** sobre un recurso en `Destination`, no un nuevo `ResourceType`. Lo "que es" (hospital, empresa, particular…) lo aporta una **taxonomía configurable**, no un enum cerrado.

```
Resource (contexto resources, ya existe)
  ├── stage: ResourceStage            // origin | intermediate | destination
  ├── isFinalRecipient: boolean       // NUEVO — rol "destinatario final" (solo con stage = destination)
  ├── recipientType: string | null    // NUEVO — slug de la taxonomía (ver EmergencyRecipientType)
  └── contact / manager / …           // ficha ya existente (se reutiliza)

EmergencyRecipientType (taxonomía extensible, patrón de EmergencyNeedCategory — ficha 04)
  ├── emergencyId: EmergencyId
  ├── slug: string                    // "hospital" | "empresa" | "organizacion" | "particular" | "acopio" | …
  ├── label: string                   // etiqueta localizable
  └── sortOrder: number

Need (contexto needs, ya existe)
  └── resourceId: ResourceId | null   // NUEVO — vincula la necesidad a su destinatario (1‑a‑N)

Receipt (recepción — proyección/registro centrado en el receptor)
  ├── resourceId: ResourceId          // destinatario que recibe
  ├── item / quantity / unit / presentation
  ├── receivedAt: Date
  ├── sourceName: string | null       // origen/donante
  └── needId / transferId / offerId   // procedencia (traslado #11 u oferta entregada #25)
```

**Invariantes:**
- `isFinalRecipient = true` ⇒ `stage = destination`.
- `recipientType` (si se informa) debe ser un `slug` válido para esa emergencia.
- Un `Receipt` siempre apunta a un `resourceId` con rol destinatario.
- `Need.resourceId` es **opcional**: una necesidad puede no estar ligada a un destinatario (compatibilidad hacia atrás).

> **Destinatario "particular":** una persona/familia puede ser destinatario **sin** ficha pública de recurso. En ese caso se modela vía **necesidades nominales** (ficha `02`) con privacidad, no como `resource` visible. El modelo admite ambos caminos (ver §8).

### 3.2 Casos de uso

| Caso de uso | Contexto | Descripción |
|---|---|---|
| `MarkResourceAsFinalRecipient` | `resources` | Marca un recurso en destino como destinatario y le asigna `recipientType` |
| `ListRecipientTypesForEmergency` | `resources`/`needs` | Devuelve la taxonomía de tipos configurada (o base) |
| `LinkNeedToRecipient` | `needs` | Asocia (o crea) una necesidad ligada a un `resourceId` |
| `ListNeedsByRecipient` | `needs` | Lista 1‑a‑N de necesidades de un destinatario |
| `RecordReceipt` / `ProjectReceipts` | `inventory`/`resources` | Registra o deriva recepciones desde traslados (#11) / ofertas entregadas (#25) |
| `GetRecipientReceipts` | `resources` | Historial de recepciones de un destinatario + resumen agregado |
| `CreateEmergencyFromTemplate` | `templates` | Extender para precargar `recipientTypes` (como ya hace con `dontBringList`) |

### 3.3 API

```
# Taxonomía de tipos de destinatario
GET  /emergencies/:id/recipient-types
     → RecipientTypeDto[] { slug, label, sortOrder }

# Destinatario ↔ necesidades (1‑a‑N)
GET  /emergencies/:id/public/resources/:resourceId/needs
     → NeedView[]
POST /emergencies/:id/needs
     body: { ..., resourceId?: string }     // vínculo opcional al destinatario

# Recepciones (ficha del destinatario)
GET  /emergencies/:id/resources/:resourceId/receipts
     → { items: ReceiptDto[], summary: { byCategory, byItem } }
```

Migraciones Drizzle (aplicar a dev y test vía psql — drizzle-kit cuelga en Windows):
```sql
ALTER TABLE resources ADD COLUMN is_final_recipient BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE resources ADD COLUMN recipient_type TEXT;            -- slug, nullable
ALTER TABLE needs     ADD COLUMN resource_id UUID REFERENCES resources(id);

CREATE TABLE emergency_recipient_types (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  slug         TEXT NOT NULL,
  label        TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (emergency_id, slug)
);
-- receipts: tabla propia o proyección de eventos de traslado/oferta (ver §8)
```

### 3.4 Frontend (Atomic Design)

| Capa | Componente | Descripción |
|---|---|---|
| Átomo | `RecipientTypeBadge` | Pastilla con el tipo de destinatario (hospital, empresa…) |
| Molécula | `RecipientTypeSelector` | Carga la taxonomía vía `GET /emergencies/:id/recipient-types` |
| Molécula | `ReceiptTimelineItem` | Una entrada del historial de recepciones (qué, cuánto, cuándo, de quién) |
| Organismo | `RecipientNeedsList` | Lista 1‑a‑N de necesidades en la ficha del destinatario |
| Organismo | `RecipientReceiptsPanel` | Sección "Recepciones" en la ficha (timeline + resumen agregado) |
| Página | Ficha del recurso/destinatario | Integra necesidades, recepciones y contacto verificado |

### 3.5 Encaje con lo existente

- **`resources`:** reutiliza `Resource`, su ficha (`PublicResourceCard`), `ResourceStage` y `VerificationLevel` (para el contacto oficial verificado, #64). Solo añade `isFinalRecipient` + `recipientType`.
- **`needs`:** añade `resourceId` opcional; `GET public/needs` y filtros siguen funcionando.
- **`templates`:** la taxonomía de tipos se precarga desde plantilla, igual que `dontBringList` y `defaultAnnouncement`.
- **`inventory`/`offers` (EPIC #1, #25):** las recepciones se **derivan** de traslados confirmados y ofertas entregadas; no se duplica el registro.
- **Vertical sanitario (#61, #63):** la **presentación** de ítems (ampolla/EV/inhalador) y el "qué SÍ/NO llevar" se construyen **encima** de este núcleo, como primer caso de uso.

---

## 4. Alcance

### Primer corte (MVP)
- `isFinalRecipient` + `recipientType` en `resources` + taxonomía `emergency_recipient_types`.
- `resourceId` opcional en `needs` + endpoint `…/resources/:resourceId/needs`.
- Selector de tipo + lista de necesidades en la ficha del destinatario.
- Recepciones derivadas de traslados/ofertas existentes (solo lectura) + resumen agregado.
- Plantilla precarga los tipos base (empresa · organización · particular · hospital · acopio · otro).
- Tests de dominio (TDD) + integración de endpoints.

### Futuro
- Registro **manual** de recepción (donación directa sin traslado formal).
- Editor de taxonomía de tipos por emergencia (admin) sin plantilla previa.
- Tipos jerárquicos / sub-uso dentro de un destinatario (p. ej. "pacientes" vs "personal" de un hospital).
- Métricas de impacto por destinatario (kilos/cajas recibidas) integradas en `metrics`.
- Matching por cercanía necesidad↔destinatario (enlaza con EPIC #4 y #57).

---

## 5. Dependencias

| Dependencia | Estado |
|---|---|
| Contexto `resources` (`Resource`, `ResourceStage`, ficha) | ✅ Existe |
| Contexto `needs` (`Need`, `NeedItem`) | ✅ Existe |
| Patrón de taxonomía configurable (`EmergencyNeedCategory`, ficha 04) | 🔜 Referencia de diseño |
| Traslados con recepción confirmada (#11) y oferta→entregada (#25) | 🔜 Backlog (para recepciones derivadas) |
| Necesidades nominales / privacidad (ficha 02) | 🔜 Para destinatarios "particulares" |
| `pnpm gen:api` tras nuevos endpoints | Obligatorio |
| Migraciones Drizzle vía psql (dev + test) | Obligatorio |

---

## 6. Privacidad / seguridad / GDPR

- Los destinatarios **tipo organización/empresa/hospital** son entidades públicas; su ficha y recepciones agregadas pueden ser públicas (igual que los puntos hoy).
- Los destinatarios **tipo particular** son personas: **no** llevan ficha pública. Se modelan con necesidades nominales (ficha 02), datos mínimos, consentimiento y sin exponer identidad en vistas públicas.
- El **historial de recepciones** puede revelar carencias/capacidades de un centro: limitar el desglose fino a coordinación; exponer al público solo agregados no sensibles.
- Respeta la **privacidad de ubicación** existente (coordenadas aproximadas para entidades sensibles, ficha 09).

---

## 7. Esfuerzo estimado

**L (grande) — abordar por fases**

- Núcleo destinatario + taxonomía (#60, #62): **M** (~3‑4 días).
- Vínculo necesidad↔destinatario 1‑a‑N (#60): incluido arriba.
- Ficha + recepciones derivadas (#67): **M**, depende de #11/#25 — si aún no existen, empezar por recepción manual.
- Contacto oficial verificado (#64): **S** (~1 día), reutiliza `VerificationLevel`.
- Vertical sanitario (#61, #63): fichas independientes.

---

## 8. Decisiones abiertas (para PM)

1. **¿Destinatario = rol sobre `resource`, o agregado propio `Recipient`?** Propuesta: rol sobre `resource` (máximo reuso de ficha/estado/verificación). Un agregado propio solo si aparecen destinatarios sin nodo logístico.
2. **¿`recipientType` como taxonomía configurable (recomendado) o enum base?** Recomendado configurable (patrón ficha 04), por el "*o cualquier otra cosa*".
3. **¿Las recepciones se derivan de traslados/ofertas (proyección de eventos) o se registran a mano?** Probablemente ambos; el MVP puede empezar por lo que ya exista.
4. **¿Un "particular" es `resource` con privacidad o siempre necesidad nominal (ficha 02)?** Define el límite entre este modelo y el de beneficiario nominal.
5. **¿Sub-uso dentro de un destinatario** (p. ej. "pacientes" vs "personal" de un hospital) entra en alcance o se pospone?
6. **¿`Need.resourceId` obligatorio para algún tipo** (p. ej. necesidades sanitarias) **o siempre opcional?**
