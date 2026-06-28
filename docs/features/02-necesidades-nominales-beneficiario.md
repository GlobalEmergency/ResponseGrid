# 02 · Necesidades nominales (beneficiario concreto) — Dominio: Personas

> Caso de uso capturado del análisis de REDH para el roadmap de ReliefHub. Entregable independiente y abordable por separado.

---

## 1. Origen (qué hace REDH)

REDH permite registrar necesidades **nominales** dentro de un refugio o centro de atención: una petición de medicación u otro suministro va ligada a una **persona albergada concreta**, con su nombre y edad, de modo que el coordinador del refugio sabe exactamente para quién es cada ítem (p. ej. "insulina para María López, 67 años"). Esta vinculación permite priorizar y gestionar la distribución de forma personalizada, especialmente en el contexto sanitario.

---

## 2. Problema / valor para ReliefHub

**Hueco que cubre:** el contexto `needs` de ReliefHub modela peticiones de recursos con varios ítems (nombre/qty/unit/categoría), ubicación y solicitante (org o particular). Sin embargo, no hay forma de indicar que un ítem específico dentro de una petición corresponde a una persona albergada concreta. Esto es especialmente crítico para:

- Medicación de prescripción en refugios (insulina, antihipertensivos, medicamentos psiquiátricos).
- Suministros de higiene personal adaptados (talla, condición específica).
- Equipos de apoyo a la movilidad o dispositivos médicos.

**Fase:** operación temprana y operación sostenida (días 2–14+). Sobre todo relevante cuando los refugios ya están operativos y la coordinación logística se personaliza.

**Valor:** sin este campo, los coordinadores de refugio deben gestionar la vinculación persona-medicación fuera de la plataforma (en papel o en un Excel paralelo), lo que fragmenta la información y aumenta el riesgo de errores de distribución con potencial impacto en salud.

**Por qué no basta con la nota libre:** el campo `description` de la need ya existe, pero meter el nombre de la persona en texto libre no es estructurado (no se puede filtrar, anonimizar en público, ni auditar quién accede al dato).

---

## 3. Propuesta

### 3.1 Modelo (DDD/Hexagonal)

**Extensión del contexto `needs` existente** — no se crea un nuevo bounded context.

Se añade un value object opcional `BeneficiaryInfo` al agregado `NeedItem` (nivel ítem, no nivel need — ver Decisión abierta #1).

```
NeedItem  (extensión, ya existente)
  id: NeedItemId
  name: string
  quantity: number
  unit: string
  category: NeedCategory
  // NUEVO — campo opcional, privacy-gated
  beneficiary?: BeneficiaryInfo
    displayName: string        // nombre completo — NUNCA expuesto en vista pública
    approximateAge?: number    // edad aprox — NUNCA expuesto en vista pública
    notes?: string             // notas médicas/contexto — NUNCA expuesto en vista pública
```

**Value Object `BeneficiaryInfo`:**
- Inmutable; se construye con nombre (obligatorio si se proporciona), edad opcional y notas opcionales.
- Invariante: si `beneficiary` está presente, `displayName` no puede ser vacío.
- Invariante: `notes` tiene longitud máxima de 500 caracteres (evitar que se convierta en historial clínico).

**Sin cambio al agregado `Need`:** la need en sí no cambia. El `BeneficiaryInfo` vive dentro de `NeedItem`, lo que permite que una misma petición (need) tenga ítems con y sin beneficiario (p. ej. "agua para todos + insulina para la Sra. López").

**Eventos de dominio:** ninguno nuevo. Los eventos `NeedValidated` y `NeedPublished` existentes ya gestionan el flujo. Se añade lógica de **proyección** (ver §3.3) para la vista pública: si `beneficiary` está presente, la proyección pública muestra `"para 1 persona"` en lugar del nombre.

### 3.2 Casos de uso (comandos/queries)

**Sin cambio de comando:** `CreateNeed` (existente) acepta ahora el campo `beneficiary` opcional en cada ítem del DTO `CreateNeedItemDto`. La validación del caso de uso verifica que `consentGiven` sea `true` si se incluye beneficiary (ver §6).

**Queries afectadas:**
| Consulta | Cambio | Actor |
|---|---|---|
| `GetNeedPublicView` | Si ítem tiene beneficiary → devuelve `"para 1 persona"` (o iniciales si se decide así) | Público |
| `GetNeedCoordinatorView` | Devuelve `beneficiary` completo | Coordinador / personal_autorizado |
| `ListNeedsForCoordinator` | Añade indicador visual "tiene beneficiario" en la tarjeta | Coordinador |

### 3.3 API (endpoints clave)

No se añaden endpoints nuevos. Se modifican los DTOs existentes:

```
POST /emergencies/:emergencyId/needs
  Body (extensión de NeedItemDto):
    items: [
      {
        name: string,
        quantity: number,
        unit: string,
        category: NeedCategory,
        beneficiary?: {          // NUEVO — opcional
          displayName: string,
          approximateAge?: number,
          notes?: string
        }
      }
    ]
    ...resto sin cambio

GET /needs/:needId
  Response (según actor):
    Público:   items[*].beneficiary → null (omitido o reemplazado por "para 1 persona")
    Coordinador: items[*].beneficiary → objeto completo
```

**Proyección pública** — se implementa en el caso de uso de query o en el mapper: si el ítem tiene `beneficiary !== null`, la respuesta pública incluye `{ hasBeneficiary: true, beneficiaryLabel: "para 1 persona" }` y omite `displayName`, `approximateAge` y `notes`.

**OpenAPI:** los campos de beneficiary se marcan con `@ApiProperty({ description: 'Solo visible para coordinadores', nullable: true })` y se excluyen del schema de respuesta pública con un DTO separado (`PublicNeedItemDto` vs `CoordinatorNeedItemDto`).

### 3.4 Frontend (Atomic Design)

**Átomos:**
- `BeneficiaryToggle` — checkbox "Esta petición es para una persona específica (p. ej. medicación nominativa)" que expande los campos de beneficiario dentro del ítem.
- `BeneficiaryPrivacyNote` — callout informativo: "El nombre de la persona no se mostrará públicamente. Solo los coordinadores tendrán acceso a este dato."
- `BeneficiaryLabel` — en vista pública: muestra `"para 1 persona"` (o iniciales si se decide) en lugar del nombre, con icono de candado para indicar privacidad.

**Moléculas:**
- `NeedItemForm` (existente, extensión) — añade al ítem, tras activar `BeneficiaryToggle`, los campos `displayName`, `approximateAge` y `notes`, con el `BeneficiaryPrivacyNote` integrado.
- `NeedItemCardCoordinator` (existente, extensión) — en el panel de coordinación, muestra el nombre y edad del beneficiario en una fila colapsable/expandible (para no saturar la vista de la cola con datos sensibles a la vista).

**Páginas / rutas afectadas:**
- `/e/[slug]/peticion` — formulario de petición: añade el toggle y los campos de beneficiario por ítem.
- `/e/[slug]/coordinacion` — cola de necesidades: indicador visual (icono persona) en la tarjeta de la need si algún ítem tiene beneficiario; detalle expandible.
- Landing pública `/e/[slug]` — lista de necesidades: se aplica la proyección pública (`BeneficiaryLabel`).

**Consideración i18n:** los strings `"para 1 persona"` y las etiquetas del formulario ya están en el sistema i18n es/en existente (F5e).

### 3.5 Encaje con lo existente

| Patrón / contexto ReliefHub | Cómo se reutiliza |
|---|---|
| Agregado `NeedItem` + `Need` (context `needs`) | Extensión de campo opcional; sin cambio al flujo validar→publicar. |
| DTOs separados por actor | Patrón ya usado en `resources` (public vs coordinator view); se replica aquí. |
| `RequireNeedCoordinatorGuard` | Controla el acceso a la vista completa con datos de beneficiario. |
| `AuditInterceptor` (F5c) | Registra en `audit_log` cada consulta al detalle con beneficiario (quién accedió y cuándo). |
| `useFormDraft` (PWA, F5d) | El formulario de petición ya usa autoguardado; el campo beneficiario se incluye en el borrador. |
| `notifications` (F5b) | Sin cambio; las notificaciones de validación/publicación ya existen. |
| i18n (F5e) | Nuevas cadenas en `es.json` / `en.json` para los labels del beneficiario. |
| Drizzle schema | Añadir columnas `beneficiary_display_name`, `beneficiary_age`, `beneficiary_notes` en `need_items` (nullable). |

---

## 4. Alcance

### Primer corte (MVP)

- Campo `beneficiary` opcional en `NeedItem` (modelo + persistencia Drizzle).
- Toggle en formulario de petición con campos expandibles y nota de privacidad.
- Proyección pública (oculta nombre, muestra "para 1 persona").
- Vista coordinador con datos completos en panel de coordinación.
- Registro en `audit_log` de accesos a datos de beneficiario.
- Consentimiento explícito en el formulario (checkbox) antes de rellenar datos del beneficiario.

### Futuro / fuera de alcance

- Anonimización automática tras cierre de la emergencia (borrado de `displayName`/`notes`, conservando solo `approximateAge` para estadísticas).
- Búsqueda por nombre de beneficiario (coordinadores buscan "¿hemos recibido insulina para López?").
- Historial de necesidades por beneficiario (si la persona albergada tiene necesidades recurrentes).
- Exportación de lista de beneficiarios por refugio (coordinación sanitaria inter-agencia).
- Mostrar iniciales en lugar de "para 1 persona" (decisión de diseño pendiente, ver §8).

---

## 5. Dependencias

| Dependencia | Tipo | Nota |
|---|---|---|
| Contexto `needs` | Existente | Extensión de NeedItem; sin cambio al flujo principal. |
| `identity` context + guards | Existente | `RequireNeedCoordinatorGuard` controla el acceso al dato sensible. |
| `audit` context (F5c) | Existente | Log de accesos a datos de beneficiario. |
| Drizzle migration | Nueva | Columnas nullable en `need_items`; migración non-breaking (ALTER TABLE ADD COLUMN nullable). |
| i18n (F5e) | Existente | Nuevas cadenas en los ficheros de traducción. |
| `useFormDraft` (F5d) | Existente | Sin cambio al hook; el campo se serializa automáticamente. |

**Migración Drizzle (recordatorio GOTCHA):** tras generar la migración SQL, aplicarla manualmente a dev con `docker exec -i reliefhub-postgres-1 psql -U reliefhub -d reliefhub < apps/api/drizzle/<NNNN>_*.sql`. El `global-setup` de tests la aplica a `reliefhub_test` automáticamente.

---

## 6. Privacidad / seguridad / GDPR

- **Base legal:** consentimiento explícito del solicitante (art. 6.1.a RGPD). El checkbox "acepto que el nombre de esta persona sea registrado para gestionar su petición" es un requisito hard antes de activar los campos de beneficiario.
- **Datos de tercero:** el solicitante registra datos de una tercera persona (el beneficiario). Esto requiere que el solicitante declare tener autorización para ello (p. ej. familiar, cuidador, personal del refugio).
- **Minimización:** solo nombre, edad aproximada y nota libre (sin datos médicos detallados, sin documento de identidad).
- **Restricción de acceso:** los campos de beneficiario no aparecen nunca en ninguna respuesta pública. Proyección pública elimina el objeto y lo reemplaza por `{ hasBeneficiary: true, beneficiaryLabel: "para 1 persona" }`.
- **Auditoría:** cada GET al detalle de una need con beneficiario debe quedar en `audit_log` (coordinador, timestamp, needId). El `AuditInterceptor` global ya cubre esto.
- **No indexación:** las rutas de coordinación ya tienen `noindex`. La landing pública no expone datos personales.
- **Retención:** al cerrar la emergencia, los campos `beneficiary_display_name` y `beneficiary_notes` deben poder anonimizarse (fuera del MVP; documentarlo como riesgo aceptado).

---

## 7. Esfuerzo estimado

**S (Pequeño) — ~2–3 días de desarrollo**

Justificación: es una extensión de campo opcional en un contexto y agregado ya existentes. No hay nuevo bounded context ni tablas nuevas de entidad propia (solo columnas nullable en `need_items`). El mayor cuidado está en la proyección doble (pública vs coordinador) en los DTOs y en la UI del formulario. Los patrones (toggle, nota de privacidad, dual DTO) ya tienen ejemplos claros en el codebase (badges de verificación, vistas dual coordinator/public en resources).

---

## 8. Decisiones abiertas (para PM)

1. **¿Dato a nivel ítem o a nivel need?**
   - A nivel ítem (propuesto): permite que una need tenga "pan para todos + insulina para la Sra. López". Más preciso y flexible.
   - A nivel need: más sencillo técnicamente, pero obliga a crear una need separada por beneficiario, lo que fragmenta la información.
   - **Propuesta:** nivel ítem. Si resulta demasiado complejo para el coordinador de campo, se puede simplificar en la UI (ocultar el toggle por defecto).

2. **¿Qué se muestra en la vista pública: "para 1 persona", iniciales o nada?**
   - "Para 1 persona" (propuesto): informa que es nominal sin revelar identidad.
   - Iniciales (p. ej. "M.L., 67 años"): algo más informativo pero potencialmente identificable si la ubicación del refugio es conocida.
   - Nada (tratar como cualquier ítem): más privado pero pierde el valor informativo.
   - **Propuesta:** "para 1 persona" en MVP; evaluar iniciales en futuro con feedback de coordinadores.

3. **¿Consentimiento explícito como campo en la petición o como condición de uso?**
   - Campo checkbox en el formulario: trazable y documentado por petición.
   - Condición de uso general al registrarse: más ágil pero menos granular.
   - **Propuesta:** checkbox por petición en MVP (más defensivo legalmente).

4. **¿Se permite que el beneficiario sea diferente del solicitante pero sin login?**
   - Un coordinador de refugio puede registrar peticiones nominales para múltiples beneficiarios sin que cada uno tenga cuenta.
   - Esto implica que el solicitante actúa como representante, lo que debe quedar claro en el consentimiento.
   - **Propuesta:** sí, el solicitante puede representar al beneficiario; el consentimiento debe decirlo explícitamente.
