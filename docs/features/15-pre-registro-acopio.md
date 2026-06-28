# 15 · Pre-registro de donaciones en acopio — Dominio: Ofertas / Logística de acopio

> Caso de uso capturado de operación en acopio. Entregable independiente y abordable por separado.

---

## 1. Origen (qué se observó en campo)

En centros de acopio el proceso suele ser **manual en la llegada**: filas, revisión artículo por artículo y registro en papel o hoja de cálculo.

ResponseGrid ya publica acopios en el mapa y gestiona ofertas (`DonationOffer`), pero eso exige **cuenta de usuario**, modela **un ítem por oferta** y un ciclo coordinador-centrado — no el check-in rápido en la puerta del acopio.

---

## 2. Problema / valor para ResponseGrid

**Problema:** no hay pre-registro multi-ítem sin cuenta, ni código legible para recepción, ni cola de llegadas previstas para el voluntario.

**Valor:** el donante avisa qué lleva antes de llegar; el voluntario confirma en recepción por teléfono o código `ACO-XXXX`.

**Modelado:** agregado **`DonationIntake`** en el contexto `offers`. No extiende `DonationOffer`.

---

## 3. Propuesta

### 3.1 Modelo

```
DonationIntake
├── emergencyId, targetResourceId (acopio)
├── intakeCode (ACO-XXXX, único por emergencia)
├── status: pending | received | rejected | incomplete
├── donorName, donorPhone?, donorEmail?  (≥1 contacto)
├── donorUserId? (si el donante ya tiene sesión)
├── lines[] (ítems donados)
└── volunteerNotes?, evidenceFileKey?, receivedAt/By
```

Solo `pending` es editable por el donante. `received`, `rejected` e `incomplete` son terminales.

### 3.2 API

```
# Públicos (rate-limit)
POST /emergencies/:emergencyId/donation-intakes
POST /emergencies/:emergencyId/donation-intakes/lookup-contact
PATCH /donation-intakes/:intakeId          // intakeCode + contacto

# Protegidos (JWT + intake:read / intake:receive)
GET  /emergencies/:emergencyId/donation-intakes/search?q=
GET  /donation-intakes/:intakeId
GET  /resources/:resourceId/donation-intakes/pending
POST /donation-intakes/:intakeId/receive   → 204
POST /donation-intakes/:intakeId/reject     → 204
POST /donation-intakes/:intakeId/incomplete → 204

# Para QR / deep link
GET  /resources/:resourceId/donation-intake-link
GET  /resources/:resourceId/donation-intake-qr
```

Permisos: `intake: ['create', 'read', 'receive', 'update']`.

### 3.3 Frontend

| Ruta | Descripción |
|------|-------------|
| `/e/[slug]/donar-acopio` | Formulario donante (mobile-first) |
| `/e/[slug]/donar-acopio?resourceId=` | Acopio preseleccionado vía QR o enlace |
| `/e/[slug]/acopio/[resourceId]/recepcion` | Panel voluntario |

### 3.4 Encaje con lo existente

Reutiliza `Resource` (acopio), taxonomía `NeedCategory`, `POST /files` (evidencia opcional en recepción), RBAC y rate-limit. No modifica `DonationOffer` ni crea usuarios por teléfono.

---

## 4. Alcance (MVP)

Cuando la feature esté completa, un acopio debe poder:

- Recibir pre-registros multi-ítem **sin cuenta** (nombre + teléfono o email).
- Asignar código `ACO-XXXX` y permitir edición mientras `pending` (con código + contacto).
- Reconocer al mismo contacto en la emergencia (prefill + intakes `pending` abiertos).
- Dejar al voluntario autenticado buscar, ver detalle y la cola `pending` del acopio.
- Confirmar, rechazar o marcar incompleto, con notas y foto opcional.
- Compartir QR o enlace con el acopio ya preseleccionado.

---

## 5. Entregables (plan)

Abordar en piezas independientes:

1. **Backend** — dominio `DonationIntake`, persistencia y API HTTP.
2. **QR / enlace** — endpoints de link y QR hacia el formulario.
3. **Front donante** — `/donar-acopio`.
4. **Front recepción** — panel del acopio.

---

## 6. Dependencias

- Contexto `resources` (`collection_point`, `collection_and_delivery`).
- Taxonomía `NeedCategory`, `POST /files`, RBAC (`@RequirePermission`).
- `DonationOffer` existente — sin cambios.

---

## 7. Privacidad / seguridad

- Contacto del donante solo para operación en acopio; búsqueda de intakes solo con `intake:read`.
- Edición pública exige `intakeCode` + coincidencia de teléfono o email.
- Rate-limit en endpoints públicos de intake.

---

## 8. Esfuerzo estimado

**M** — cuatro entregables anteriores.
