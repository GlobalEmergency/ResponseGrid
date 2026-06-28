> ⚠️ **DEPRECADO** — ficha congelada como referencia histórica. El seguimiento de esta feature vive en **GitHub Issues**: #36. No edites esta ficha; trabaja en el issue. Convención: ver `AGENTS.md` y [`00-indice.md`](00-indice.md).

# 11 · Directorio de servicios gratuitos — Dominio: Plataforma y acceso

> Caso de uso capturado del análisis de REDH para el roadmap de ReliefHub. Entregable independiente y abordable por separado.

## 1. Origen (qué hace REDH)

REDH incluye una sección de **"Servicios gratuitos validados"**: jornadas médicas, tomas de muestra, atención psicológica y ayuda legal ofrecidas por organizaciones en respuesta a la emergencia. Cada servicio indica organización, tipo, ubicación, horario/fechas y si ha sido verificado. Se filtra por ciudad o cercanía al usuario.

## 2. Problema / valor para ReliefHub

En las primeras horas de una emergencia, muchas organizaciones (Cruz Roja, colegios médicos, ONG) anuncian servicios gratuitos en redes sociales pero no hay un punto centralizado y verificado donde la población los encuentre. ReliefHub ya tiene un directorio de puntos logísticos y un sistema de verificación/publicación; añadir servicios gratuitos como una sub-vista del directorio daría visibilidad a estas iniciativas sin crear infraestructura nueva de fondo.

El riesgo de no tenerlo: los afectados no se enteran de servicios disponibles, o los encuentran en fuentes no verificadas con datos incorrectos (horario ya pasado, ubicación errónea).

## 3. Propuesta

### 3.1 Modelo (DDD/Hexagonal)

**Decisión de arquitectura (abierta, ver § 8):** la propuesta preferida es **reutilizar el contexto `resources` añadiendo `type = 'service'`** con campos extra en un `ServiceDetails` embebido, antes de crear un contexto nuevo. El contexto `resources` ya tiene: tipo, ubicación, verificación por niveles (verified/official), ciclo de vida (queue → verified → published), semáforo (`PublicStatus`), owner (usuario/organización), kill-switch de emergencia.

Extensión del agregado `Resource` para el subtipo `service`:

```
serviceDetails?: {
  serviceType : 'medical_exam' | 'psychological_support' | 'legal_aid'
                | 'food_distribution' | 'clothing' | 'other'
  organization: string          // nombre si no tiene org registrada
  schedule    : string          // texto libre: "Lun-Vie 9:00-17:00" o fechas
  startDate   : Date | null
  endDate     : Date | null     // null = indefinido mientras dure la emergencia
  contactPhone: string | null
  notes       : string | null
}
```

El campo `type` ya existe en `Resource`; se añade `'service'` al enum. Los campos `serviceDetails` se almacenan en una columna `jsonb` en la tabla `resources` (o tabla hija `resource_service_details` si se prefiere normalización; la columna jsonb es más pragmática dado el alcance bajo).

**Puerto de salida nuevo:** `findPublishedServices(emergencyId, filters: { serviceType?, nearCoords?, city? })` en `ResourceRepository`.

### 3.2 Casos de uso

1. **Registrar servicio gratuito** — cualquier usuario autenticado (voluntario u organización) publica un servicio; pasa por la misma cola de verificación que los recursos logísticos.
2. **Verificar y publicar servicio** — coordinador verifica que el servicio es real, activo y de la organización indicada; lo publica. Si la organización está acreditada, sube a nivel Oficial automáticamente (mismo patrón que F2).
3. **Listar servicios por emergencia** — endpoint público que devuelve servicios publicados, filtrables por `serviceType`, ciudad (texto) y opcionalmente ordenados por distancia a unas coordenadas.
4. **Marcar servicio como finalizado** — owner o coordinador cambia `PublicStatus` a `Closed` cuando el servicio termina (las fechas `endDate` son orientativas, el cierre es explícito).
5. **Ver detalle de servicio** — página pública con todos los campos, mapa de ubicación y enlace de ruta.

### 3.3 API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/emergencies/:id/resources` | Sin cambios; acepta `type:'service'` + `serviceDetails` en el body |
| `GET` | `/emergencies/:id/resources?type=service[&serviceType=medical_exam][&city=Caracas][&lat=…&lng=…]` | Listado de servicios publicados; extiende el filtro existente |
| `GET` | `/emergencies/:id/resources/:rid` | Sin cambios; devuelve `serviceDetails` si `type=service` |
| `POST` | `/resources/:id/status` | Sin cambios; permite cambiar a `Closed` cuando el servicio termina |

No se necesitan rutas nuevas si se reutiliza `resources`. La extensión es en los filtros del GET y en la validación del body del POST (DTO `CreateServiceDto extends CreateResourceDto`).

Regenerar `pnpm gen:api` tras añadir los nuevos campos al DTO y al schema OpenAPI.

### 3.4 Frontend (Atomic Design)

**Átomos:**
- `ServiceTypeBadge` — pastilla de color por tipo de servicio (médico, psicológico, legal, alimentario…).
- `ScheduleLabel` — texto de horario/fechas con icono de reloj.

**Moléculas:**
- `ServiceCard` — variante de `ResourceCard` con `ServiceTypeBadge`, organización, horario, `VerificationBadge` existente y botón "¿Cómo llegar?".
- `ServiceFilters` — selector de tipo de servicio + campo de ciudad (reutiliza el patrón de filtros de necesidades ya existente).

**Organismos:**
- `ServiceDirectorySection` — sección en la landing de emergencia `/e/[slug]` (nueva pestaña o acordeón junto a "Puntos logísticos" y "Necesidades"), monta `ServiceFilters` + lista de `ServiceCard`.

**Páginas:**
- `/e/[slug]/servicios` — página dedicada con mapa y lista (opcional; puede ser una sub-ruta del directorio existente en lugar de página propia).
- `/e/[slug]/registrar-servicio` — formulario de alta de servicio (reutiliza `ResourceForm` con campos condicionales para `serviceDetails`).

**Formulario de registro:**
- El formulario existente `/e/[slug]/registrar` podría ampliar el selector de tipo con `service` y mostrar campos adicionales condicionalmente (horario, tipo de servicio, fecha fin). Alternativa: formulario propio `/registrar-servicio` para no complicar el formulario principal.

### 3.5 Encaje con lo existente

- **Contexto `resources`:** se amplía sin romper nada; los recursos logísticos existentes no se ven afectados.
- **Ciclo verificar→publicar:** sin cambios; los servicios pasan por la misma cola en `/coordinacion`.
- **Acreditación (F2):** una Cruz Roja acreditada que registra un servicio médico sale como 🏛️ Oficial automáticamente.
- **Semáforo `PublicStatus` (F4a):** `Active`/`Closed` ya existen; `Closed` sirve para marcar servicio terminado.
- **Mapa Leaflet:** los servicios publicados pueden aparecer en el mapa con un icono distinto (configurable por tipo en el cliente).
- **Cercanía (feature 08):** la ordenación por distancia usa el mismo mecanismo propuesto en esa feature.
- **i18n (F5e):** los textos nuevos pasan por el sistema `t` existente.

## 4. Alcance

### Primer corte (MVP)

- Añadir `type='service'` al enum de `Resource` y columna `service_details jsonb` en la tabla.
- `CreateServiceDto` con validación de `serviceDetails`.
- Filtro `type=service` en el endpoint GET de recursos.
- `ServiceCard` + `ServiceFilters` + sección "Servicios gratuitos" en la landing de emergencia.
- Formulario de registro mínimo (puede ser el mismo `/registrar` con tipo=service).
- Cola de verificación en coordinación (sin cambios de UI; los servicios aparecen en la cola de recursos existente).

### Futuro

- Página `/e/[slug]/servicios` con mapa propio y filtros avanzados.
- Caducidad automática por `endDate` (relacionado con feature 06).
- Alertas push cuando aparece un nuevo servicio cercano (requiere notificaciones push, fuera de alcance ahora).
- Página pública de servicios sin contexto de emergencia (directorio global inter-emergencia).
- Formulario de alta sin login (moderación previa obligatoria) para bajar la barrera de organizaciones externas.

## 5. Dependencias

| Dependencia | Tipo | Nota |
|-------------|------|------|
| Contexto `resources` | Interna | Se extiende; requiere migración Drizzle (columna `service_details jsonb`) |
| Acreditación (F2) | Interna | Necesaria para el badge Oficial automático; sin ella, el badge es simplemente Verificado |
| Feature 08 (cercanía) | Interna opcional | Necesaria para ordenar servicios por distancia; el MVP puede omitirla |
| Feature 06 (caducidad) | Interna opcional | Para caducidad automática por `endDate`; el MVP la omite |
| Migración Drizzle | Backend | Aplicar a mano con psql (gotcha entorno conocido) |

## 6. Privacidad / seguridad / GDPR

- Los servicios son información pública de organizaciones, no de individuos. Bajo riesgo de privacidad.
- El campo `contactPhone` es del servicio/organización, no del usuario que registra; no hay exposición de datos personales.
- Si se permite registro sin login en el futuro, hay que aplicar moderación antes de publicar (el ciclo de verificación existente ya lo garantiza).
- No hay datos de menores ni datos sensibles en los campos del servicio en sí.

## 7. Esfuerzo estimado

**S** (pequeño) — La mayor parte del trabajo es configuración y composición de piezas existentes. La migración es trivial (columna jsonb). El formulario y la lista reutilizan patrones ya implementados.

Desglose orientativo:
- Migración + extensión DTO/repositorio backend: ~0,5 días
- Componentes frontend (`ServiceCard`, `ServiceFilters`, sección en landing): ~1 día
- Formulario de registro con campos condicionales: ~0,5 días

## 8. Decisiones abiertas (para PM)

1. **¿`type=service` en `resources` o contexto propio `services`?** La propuesta es reutilizar `resources`. Un contexto propio daría más libertad de evolución pero duplica infraestructura (repositorio, endpoints, cola de verificación, migración completa). ¿Se acepta la extensión de `resources`?

2. **¿Formulario propio `/registrar-servicio` o ampliar el formulario `/registrar` existente?** Formulario propio es más claro para el usuario; ampliar el existente es menos código. ¿Cuál prefiere el equipo?

3. **¿Caducidad automática por `endDate` en MVP o se deja manual (cierre explícito)?** Sin caducidad automática, un servicio puede quedar "publicado" con fecha pasada. Se sugiere al menos mostrar un aviso visual si `endDate < hoy`, aunque el cierre sea manual.

4. **¿Los servicios aparecen en el mapa general de la emergencia o solo en su sección propia?** Incluirlos en el mapa con icono diferenciado da más visibilidad, pero puede saturar el mapa. ¿Capa opcional?

5. **¿Alta sin login para organizaciones externas?** Bajaría la barrera de entrada pero requiere moderación antes de publicar. ¿Prioridad en la primera iteración?
