> ⚠️ **DEPRECADO** — ficha congelada como referencia histórica. El seguimiento de esta feature vive en **GitHub Issues**: #37. No edites esta ficha; trabaja en el issue. Convención: ver `AGENTS.md` y [`00-indice.md`](00-indice.md).

# 12 · CTA de número de emergencia nacional — Dominio: Plataforma y acceso

> Caso de uso capturado del análisis de REDH para el roadmap de ReliefHub. Entregable independiente y abordable por separado.

## 1. Origen (qué hace REDH)

REDH muestra un **banner persistente** en la parte superior de todas las pantallas con el número de emergencia médica nacional del país afectado: "🚨 Emergencia médica: llamar al 171" y un botón "Llamar 171" que abre `tel:171`. El número es configurable por emergencia y se muestra siempre visible, no como notificación descartable.

## 2. Problema / valor para ReliefHub

ReliefHub es multi-país. Cada emergencia tiene su contexto geográfico y sus números de emergencia propios (Venezuela: 171 médico, 911 policía; España: 112; México: 911…). Sin este campo, un usuario que llega a la landing en plena crisis no sabe a qué número llamar si necesita ayuda inmediata. El CTA es el recurso más básico y crítico de cualquier plataforma de emergencias.

La landing actual tiene un banner de estado de emergencia (`StatusBanner`, F1) y la tarjeta de anuncio (`AnnouncementCard`); este CTA es complementario y debe ser prominente incluso cuando no hay anuncio especial.

## 3. Propuesta

### 3.1 Modelo (DDD/Hexagonal)

Extensión mínima del **agregado `Emergency`** en el contexto `emergencies`:

```typescript
// Nuevo campo en el value object o en el agregado directamente
emergencyPhone?: EmergencyPhoneList   // ver decisión § 8.1
```

Dos opciones de modelo (decisión abierta):

**Opción A — campo libre por emergencia (un solo número principal):**
```typescript
emergencyPhone: string | null   // ej. "112" o "+34 112"
```
Simple. El admin ingresa el número al crear/editar la emergencia. Se muestra un solo botón CTA.

**Opción B — lista de números por tipo:**
```typescript
emergencyPhones: Array<{
  type  : 'medical' | 'police' | 'fire' | 'general' | 'other'
  label : string    // texto visible ej. "Emergencias médicas"
  number: string    // ej. "171"
}>
```
Más flexible. Permite mostrar varios botones (médico, policía…) o uno destacado como "principal".

La propuesta MVP es **Opción A** (un número principal por emergencia) porque cubre el 90 % de los casos con cero complejidad. La Opción B es futuro.

**Cambios en dominio:**
- `Emergency.emergencyPhone: string | null` — nuevo campo nullable.
- Método `setEmergencyPhone(phone: string | null)` en el agregado (o incluirlo en `UpdateEmergencyCommand`).
- Persistencia: nueva columna `emergency_phone VARCHAR(30)` en la tabla `emergencies` (migración Drizzle trivial).

**Puerto de salida:** ninguno nuevo; el campo se añade al DTO de respuesta de `findBySlug` y `findAll`.

### 3.2 Casos de uso

1. **Configurar número de emergencia** — coordinador/admin edita la emergencia y establece el número (o lo deja vacío). Si vacío, el banner no aparece.
2. **Mostrar banner en landing** — la landing `/e/[slug]` lee `emergencyPhone` del agregado y renderiza el `EmergencyPhoneBanner` en la parte superior si el campo tiene valor.
3. **Llamar desde el banner** — el usuario pulsa "Llamar {número}" y se abre el marcador del dispositivo vía `tel:{número}` (en móvil llama directamente; en desktop abre app de llamada o lo ignora).

### 3.3 API

| Cambio | Detalle |
|--------|---------|
| Schema `emergencies` | Nueva columna `emergency_phone VARCHAR(30) NULL` |
| `EmergencyResponseDto` | Añadir campo `emergencyPhone: string | null` |
| `UpdateEmergencyDto` | Añadir campo opcional `emergencyPhone?: string` |
| `PUT/PATCH /emergencies/:id` | Acepta y persiste `emergencyPhone` |
| `GET /emergencies/:slug` | Devuelve `emergencyPhone` en la respuesta pública |

No se necesitan endpoints nuevos. La migración es una sola línea de `ALTER TABLE`.

Regenerar `pnpm gen:api` tras añadir el campo al DTO y al schema OpenAPI.

### 3.4 Frontend (Atomic Design)

**Átomos:**
- `PhoneIcon` — icono de teléfono (o reutilizar el del sistema de iconos ya existente).

**Moléculas:**
- `EmergencyPhoneBanner` — barra horizontal fija en la parte superior (por encima del `StatusBanner` existente o integrada en él como fila adicional). Contenido:
  - Icono 🚨 + texto "Emergencia: llama al {número}" en rojo/naranja.
  - Botón/enlace `<a href="tel:{número}">Llamar {número}</a>` prominente.
  - No tiene botón de cerrar (es persistente mientras el usuario está en la página).
  - En desktop, el enlace `tel:` abre la app de llamadas configurada o se ignora; se puede añadir copia del número al portapapeles como fallback visual.

**Organismo / integración:**
- La landing `/e/[slug]` (Server Component o Client Component que ya consume el agregado `Emergency`) lee `emergencyPhone` y monta `EmergencyPhoneBanner` condicionalmente.
- El `StatusBanner` existente (F1) se mantiene separado; el `EmergencyPhoneBanner` va encima o integrado como segunda línea si ambos están activos.

**i18n:**
- El texto "Emergencia: llama al" se añade al diccionario `es`/`en` existente.
- El número en sí no se traduce.

**Accesibilidad:**
- El enlace `tel:` debe tener `aria-label="Llamar al número de emergencia {número}"`.
- Contraste de color suficiente para el banner en rojo/naranja (verificar AA).

### 3.5 Encaje con lo existente

- **Agregado `Emergency` (contextos/emergencies):** extensión mínima con un campo nullable. Sin impacto en lógica existente.
- **`StatusBanner` (F1):** coexiste; son banners de propósito distinto (estado de la emergencia vs. número de llamada). Se puede integrar visualmente en un mismo componente `EmergencyAlerts` si el PM lo prefiere.
- **`AnnouncementCard` (F1):** independiente; el número de emergencia no es un anuncio.
- **Templates (F5a):** si una plantilla de emergencia tiene `emergencyPhone` predefinido (ej. plantilla "Venezuela"), se hereda al crear la emergencia desde plantilla. Campo opcional en `EmergencyTemplate`.
- **Panel de coordinación:** añadir campo de edición del número en el formulario de configuración de la emergencia (actualmente no existe un formulario de edición de emergencia en el front; si no existe, puede editarse via API directamente hasta que se cree).

## 4. Alcance

### Primer corte (MVP)

- Nueva columna `emergency_phone` en la tabla `emergencies`.
- Campo `emergencyPhone` en `UpdateEmergencyDto` y `EmergencyResponseDto`.
- `EmergencyPhoneBanner` (molécula) en la landing de la emergencia.
- Edición del número desde el endpoint existente `PUT /emergencies/:id` (sin UI de edición en frontend en el MVP; el coordinador lo establece via API o seed).

### Futuro

- UI de edición del número en el panel de coordinación (formulario de configuración de la emergencia).
- Opción B: lista de números por tipo (médico/policía/bomberos) con varios CTAs.
- Catálogo de números por país para autocompletar al crear una emergencia (ej. seleccionar "Venezuela" sugiere 171, 911…).
- Número visible en la pantalla `/offline` para que esté disponible sin conexión (crítico).
- Integración en templates (F5a): el template puede preconfigurar el número.

## 5. Dependencias

| Dependencia | Tipo | Nota |
|-------------|------|------|
| Agregado `Emergency` (contexto `emergencies`) | Interna | Extensión mínima de campo nullable |
| `StatusBanner` (F1) | Interna | Coexiste; decisión de diseño si se integran visualmente |
| Templates (F5a) | Interna opcional | Para preconfigurar el número en plantillas de emergencia |
| Migración Drizzle | Backend | Una columna; aplicar a mano con psql (gotcha entorno) |

## 6. Privacidad / seguridad / GDPR

- El número de emergencia es información pública institucional (número del estado o servicios de salud). Sin datos personales.
- El enlace `tel:` es nativo del navegador; ReliefHub no interviene en la llamada.
- Sin implicaciones GDPR.
- Consideración de seguridad menor: validar que `emergencyPhone` solo contiene dígitos, espacios, `+` y guiones (evitar inyección de un `tel:javascript:…` malicioso). Añadir validación con regex en el DTO backend y sanitización en el frontend antes de usar en `href`.

## 7. Esfuerzo estimado

**S** (pequeño, casi trivial) — Una columna, un campo en el DTO, una molécula y su integración en la landing. Estimado: medio día o menos.

Desglose orientativo:
- Migración + campo DTO backend: ~1 hora
- `EmergencyPhoneBanner` + integración en landing: ~2 horas
- i18n + accesibilidad + validación de formato: ~1 hora

## 8. Decisiones abiertas (para PM)

1. **¿Un solo número o lista por tipo?** La propuesta MVP es un campo libre (Opción A). ¿Hay casos conocidos en ReliefHub donde se necesiten varios números desde el inicio (médico + policía + bomberos), o con uno es suficiente para el primer corte?

2. **¿Campo libre o catálogo por país?** Campo libre permite cualquier número sin mantenimiento de catálogo. Un catálogo por país (`country → [{ type, number }]`) autocompletaría al crear la emergencia pero requiere mantener los datos. ¿El equipo prefiere libertad o guía?

3. **¿Banner siempre visible o descartable?** La propuesta es persistente (no cierra). ¿Hay contextos donde el número ya no es relevante (emergencia pausada, cerrada) y el banner debería ocultarse automáticamente? Propuesta: ocultar si `emergency.status === 'Closed'`.

4. **¿Dónde edita el coordinador el número?** En MVP, solo vía API. ¿Se incluye en el MVP un campo de edición en la UI de coordinación, o se pospone al panel de configuración de emergencia (feature pendiente)?

5. **¿El número aparece en la pantalla `/offline`?** Sería el caso de mayor valor (sin conexión, necesito llamar). Requiere que el SW cachee la página offline con el número ya incrustado o que lo lea de algún storage local. ¿Incluirlo en el MVP offline o es futuro?
