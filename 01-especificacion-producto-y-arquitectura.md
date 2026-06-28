# ReliefHub — Especificación de producto y arquitectura

**Versión:** 0.2 (refinamiento)
**Fecha:** 2026-06-25
**Documento base:** `especificacion_plataforma_ayuda_solidaria.md` (v0.1, funcional).
**Alcance de este documento:** decisiones fundacionales, refinamiento de producto centrado en las **primeras horas** y arquitectura técnica para una **base escalable**. No repite el detalle funcional del v0.1; lo refina y lo reordena.

---

## 1. Contexto

Plataforma para transformar solidaridad espontánea en ayuda útil, coordinada y trazable, reduciendo saturación logística, duplicidades y riesgos operativos. Contexto inicial: movilización desde España hacia Venezuela tras emergencia sísmica, pero concebida como **plataforma multi-emergencia reutilizable**.

Regla de oro (heredada del v0.1, sigue siendo el principio rector):

> La aplicación no debe intentar que una persona desbordada trabaje como gestor logístico. Debe permitirle enviar señales simples, y que la coordinación las convierta en decisiones.

---

## 2. Decisiones fundacionales

Cuatro decisiones tomadas en brainstorming que condicionan todo el diseño:

| # | Decisión | Implicación |
|---|----------|-------------|
| 1 | **Plataforma multi-emergencia** (no one-off Venezuela) | Vive dormida entre crisis, se activa por evento, datos aislados por emergencia, escala de 0 a miles en horas y vuelve a dormir. |
| 2 | **Gobernanza híbrida delegada** | El equipo central (GlobalEmergency) abre cada emergencia y nombra coordinadores/verificadores entre entidades locales de confianza (ONG, ayuntamiento, consulado), reteniendo el veto. Es superset del modelo central: se puede arrancar sin delegar. |
| 3 | **Web/PWA primero** | El ciudadano descubre por Google/redes y llega a una web pública. WhatsApp/Telegram entran después como respaldo de campo manual. Se despliega en minutos, sin depender de aprobación de Meta. |
| 4 | **Multi-tenancy pragmático** | Una sola BD global; todo lo operativo cuelga de una relación `emergency_id` y RLS separa por emergencia. Aislamiento físico (schema/proyecto por emergencia) se pospone hasta que sea necesario. |
| 5 | **Front/back separados, backend hexagonal** | Frontend (Next.js, solo presentación) desacoplado de una API propia en **NestJS** con DDD + Ports & Adapters, SOLID, Clean Code, TDD; eventos vía Redis. Sin BaaS: la lógica vive en el dominio, no en la BD. |

---

## 3. Ciclo de vida de una emergencia

El v0.1 saltaba a "Día 1/2/3". Aquí se modela el ciclo completo, porque las fases **0 y 1** son las que hacen viable la combinación "multi-emergencia" + "ganar las primeras horas".

| Fase | Ventana | Objetivo | Qué hace la plataforma |
|------|---------|----------|------------------------|
| **0. Latente** | entre crisis | Coste ~0, lista para disparar | Plantillas pre-cargadas (catálogo de material, mensajes, categorías, roles), entidades pre-acreditadas. Dormida. |
| **1. Activación** | minutos | Encender rápido | Declarar emergencia desde plantilla → espacio aislado → landing oficial publicada. **La velocidad aquí ES "las primeras horas".** |
| **2. Primeras horas** | 0–24 h | **Contención** | Canalizar el impulso, frenar el caos, captar ofrecimientos sin prometer, registrar y verificar recursos. ← *foco de este documento* |
| **3. Primeros días** | 1–7 d | Operación | Activar puntos verificados, semáforo, fotos de campo, recogidas, voluntariado con turnos, cola de revisión. |
| **4. Sostenimiento** | semanas | Logística | Lotes, QR, expediciones, manifiestos, trazabilidad, matching oferta↔necesidad. |
| **5. Cierre** | post | Apagar ordenado | Pausar recogidas, cerrar puntos, informe, export, lecciones aprendidas → vuelve a Latente. |

---

## 4. Conceptos de producto clave

Tres conceptos que vertebran la Fase 2 y resuelven tensiones del v0.1:

### 4.1. Registrar ≠ publicar
En las primeras horas se **captura** la oferta de todos (almacén, tienda, furgoneta, manos), pero **nada aparece como activo** hasta validarse. Reconcilia "captar el impulso ya" con "no saturar". El que se registra recibe: *"Gracias, quedas registrado. No recibas material ni publiques nada hasta que te validemos."*

### 4.2. Tres niveles de verificación (la confianza es el producto)
Visible como badge en todo recurso, punto y campaña:

| Badge | Nivel | Visibilidad |
|-------|-------|-------------|
| 🔵 | **Sin verificar** (auto-registrado) | En cola; no público, o público con aviso "pendiente, no llevar material" |
| 🟢 | **Verificado** | Un coordinador/verificador local lo validó → público y activo |
| 🏛️ | **Oficial** | Asociado a organización institucional acreditada → hereda su confianza, máximo nivel |

### 4.3. Modelo de recurso unificado
Almacén, punto de recogida, punto de entrega, transporte, tienda, proveedor comparten lo mismo (identidad, contacto, ubicación, qué ofrece, capacidad, nivel de verificación, lado origen/destino). Una sola entidad `resource` con un campo `type` en lugar de seis tablas. (Los **voluntarios** se modelan aparte: sus atributos —skills, turnos, vehículo— son demasiado distintos para forzar la abstracción.)

### 4.4. Origen y destino
La plataforma modela ambos lados desde el día 1: recursos y ofertas en **origen** (España) y **necesidades validadas** declaradas desde **destino** (Venezuela) por entidad receptora acreditada. Un `resource` y un `need` llevan campo `side` (origin/destination).

---

## 5. Fase 2 — Primeras horas (detalle)

### A. Cara pública — "Quiero ayudar"
- **Landing oficial** del evento: qué pasó, estado, fuente oficial + **timestamp de última actualización** visible (antídoto contra bulos).
- **"Qué NO hacer ahora"**: no ropa, no medicamentos, no ir por tu cuenta, no material sin destino.
- **"Quiero ofrecer…"**: entrada a los formularios de auto-registro (bloque B).
- **Lista/mapa de puntos**: solo verificados/oficiales, con semáforo. Si está vacío → "aún no hay puntos activos".
- **Verificador de campañas**: "¿Es de fiar esta cuenta/campaña?".
- **Reportar sospecha**: campaña/punto/perfil falso.

### B. Auto-registro de recursos — "Ofrezco capacidad"
Un formulario, `type` distinto: punto de recogida · punto de entrega/distribución · almacén (m³, palés, ¿refrigerado?) · transporte/logística (furgoneta→camión→naviera/aduanas; rutas, internacional sí/no) · empresa/proveedor (dona producto en cantidad → flujo B2B, o cede espacio) · institución (colaboración oficial).
Comunes a todos: identidad, contacto, ubicación, qué ofrece, capacidad aprox., disponibilidad, **aceptación de normas + consentimiento GDPR**. Todos entran **en cola, sin publicar**.

### C. Verificación y confianza (retaguardia)
- Cola de validación para coordinadores → asignan nivel (Verificado/Oficial) o rechazan/piden info.
- Instituciones se **pre-acreditan** (Fase 0) **o en caliente** (durante la emergencia, con validación central). Una acreditación de **alcance global** (Cruz Roja, consulado) da badge Oficial en cualquier emergencia sin re-acreditarse; una de **alcance por-emergencia** vale solo para una.
- Detección de **duplicados** (mismo local registrado dos veces).
- Antifraude de campañas: entidad, CIF, responsable, cuenta, destino, estado; **alertas de riesgo** (cuentas personales, Bizum, "sale un avión mañana", urgencia extrema sin datos).

### D. Coordinación desde el minuto 1
Cola de revisión (tarjetas) · panel de situación (ofrecimientos por tipo, pendientes/verificados, campañas sospechosas, cobertura geográfica) · publicar/editar mensajes oficiales y estado · **botón "Pausar todo"**.

### E. Transversales no negociables
Confianza visible (timestamp, badges, fuente oficial) · GDPR (consentimiento, minimización, no exponer ubicaciones sensibles hasta asignación) · móvil + mala conexión (PWA, formularios mínimos, fotos comprimidas, autoguardado, 3G) · escala súbita (landing cacheada en CDN, formularios escriben a cola; la home no toca la BD) · i18n-ready (arranca en ES) · compartible (OpenGraph).

### F. Fuera de las primeras horas (Fases 3–4)
Lotes, QR, expediciones, manifiestos, turnos complejos de voluntariado y matching automático oferta↔necesidad. En las primeras horas se **capta y verifica**; se **opera** después.

---

## 6. Roles y permisos

Los roles son **por emergencia** (un usuario puede ser coordinador en Venezuela y nada en la DANA). Se heredan del v0.1 §5, con la capa de gobernanza híbrida:

| Rol | Plano | Resumen |
|-----|-------|---------|
| Ciudadano donante | global | Consulta, ofrece material/transporte/espacio, se apunta de voluntario. No publica ni canaliza. |
| Responsable de punto | por emergencia | Cambia estado de su punto, envía fotos, pide recogida, reporta incidencias. |
| Voluntario operativo | por emergencia | Disponibilidad, tareas asignadas, check-in/out. No se autodesplaza. |
| Coordinador | por emergencia | Valida puntos/campañas, clasifica reportes, asigna recogidas, cierra puntos, prioriza. |
| Entidad verificadora | global o por emergencia | ONG/admón/consulado/operador: valida necesidades, campañas, receptores; bloquea. |
| Administrador central | global | Gestiona usuarios/permisos, audita, activa modo emergencia, pausa recogidas, antifraude. |

---

## 7. Arquitectura técnica

Front y back **separados**. Backend con **DDD + Hexagonal (Ports & Adapters)**, SOLID, Clean Code, TDD. Sin BaaS: la lógica vive en el dominio, no en la BD.

### 7.1. Stack

| Capa | Elección | Por qué |
|------|----------|---------|
| Frontend | **Next.js (App Router) como front puro** | Landing SSG/ISR cacheada en CDN (SEO + escala súbita), PWA + offline, next-intl, **Atomic Design**. Cero lógica de negocio: solo presentación + consumo de API. |
| Backend | **NestJS (TypeScript), Ports & Adapters** | DDD/Hexagonal/CQRS; `@nestjs/cqrs` + BullMQ; mismo lenguaje que el front (tipos/DTOs compartidos). |
| API | **REST + OpenAPI** | Contrato explícito front↔back; suficiente (GraphQL queda como opción). |
| BD | **PostgreSQL** (Neon o Supabase-Postgres puro, UE) | **Repos a mano / data-mapper** (no active-record, para no filtrar persistencia al dominio); `emergency_id` + RLS. |
| Eventos/colas | **Redis (Upstash, serverless)** | Event bus de domain events, colas (BullMQ), cache, rate-limit. |
| Storage | S3-compatible (Cloudflare R2 / S3) tras puerto `FileStorage` | Fotos/docs; compresión en cliente antes de subir. |
| Auth | JWT; proveedor o propia tras puerto `IdentityProvider` (a concretar, §11) | Roles por emergencia vía `memberships`. |
| Offline | PWA + service worker + cola local (IndexedDB) | Reportes/registros sin red, sync al volver. |
| Hosting | Front: Vercel/CDN · Back: Cloud Run / Fly.io / Railway (scale-to-zero) | Dormida ≈ 0. |

### 7.2. Arquitectura de aplicación (hexagonal)

Cada bounded context (§5/§8) es un módulo con tres capas:

- **Domain:** agregados (Emergency, Resource, Campaign, Need, Volunteer…), value objects, **domain events**, y **puertos** de salida (interfaces: repositorios, event bus, storage, notificaciones).
- **Application:** casos de uso como **command/query handlers** (`RegisterResource`, `VerifyResource`, `PauseCollections`, `ListPublicPoints`…). Orquestan dominio + puertos. **CQRS ligero**: comandos mutan agregados y emiten eventos; queries leen proyecciones optimizadas.
- **Infrastructure:** adapters inyectados por DI (controllers REST, repos Postgres, publisher/consumer Redis, storage S3, gateways externos).

**Event-driven:** los domain events se publican a Redis → handlers asíncronos (notificaciones, proyecciones de lectura, realtime de la cola de coordinación). **Outbox pattern** para no perder eventos si algo falla tras el commit.

### 7.3. Estrategia de testing (TDD)

- **Caso de uso (application):** dominio **real**, se mockean **solo los puertos de salida** (repos in-memory/fakes, bus fake, gateways stub). Rápidos, sin I/O. El grueso del TDD.
- **Dominio (VOs/agregados):** puros, sin mocks.
- **Adapters (integración):** repos Postgres reales y contrato del bus Redis — pocos, lentos.
- **E2E:** mínimos, flujos críticos (registrar→verificar→publicar, parar entregas).
- Pirámide: muchos dominio+uso, pocos integración, poquísimos e2e.

### 7.4. Cómo se cumplen los requisitos no funcionales

- **Escala súbita (0→miles en minutos):** landing SSG/ISR en CDN (no toca el back); escrituras → backend autoescalable + Redis (BullMQ) amortiguando el pico. La home no consulta el back.
- **Dormida barata:** backend scale-to-zero (Cloud Run/Fly) + Neon (Postgres autosuspend) + Upstash (Redis pay-per-request). Entre crisis, coste ≈ 0 aun con back separado.
- **Aislamiento + GDPR:** RLS por `emergency_id`, `audit_log`, datos en UE, retención por evento (purga al cerrar).
- **Confianza:** badges, timestamp de última actualización y fuente oficial son ciudadanos de primera clase del modelo.
- **Mala conexión:** PWA offline-first con cola local.

### 7.5. Puerta de escape de escalado
Si una emergencia maneja datos ultra-sensibles (p. ej. sanitarios) o el volumen lo exige, esa —y solo esa— se promueve a **schema propio** o **BD/instancia propia**. El modelo de dos planos (§8) lo permite sin tocar la identidad global.

---

## 8. Modelo de datos inicial

Dos planos. El **global** es siempre compartido; el **operativo** cuelga de `emergency_id`.

### 8.1. Plano global (identidad y control)
- **organizations**: id, name, type, tax_id, contacts, website, social, verification_level, notes.
- **users**: id, name, contact, locale, created_at *(auth vía Supabase)*.
- **emergencies**: id, name, slug, country, zone, status (latent/active/winding_down/closed), origin_context, destination_context, default_language, template_id, activated_at, closed_at.
- **memberships**: id, user_id, emergency_id, organization_id?, role, created_at. ← *resuelve "una org accede a sus emergencias activas"*.
- **accreditations**: id, organization_id, scope (global | emergency_id), level (verified/official), granted_by, granted_at, evidence.
- **templates**: id, name, material_catalog, default_messages, categories, locales.

### 8.2. Plano operativo (todo con `emergency_id`)
- **resources** *(unificado)*: id, emergency_id, type (collection_point/delivery_point/warehouse/transport/supplier/venue), side (origin/destination), organization_id?, name, contact, location, municipality, country, capacity (jsonb: m3/pallets/vehicle_type/refrigerated/routes…), accepted_categories, opening_hours, verification_level, public_status (hidden/pending/active/saturated/paused/closed), responsible_person, last_update_at.
- **volunteers**: id, emergency_id, user_id?, name, contact, municipality, skills, validated_skills, availability, vehicle, status, consent, assigned_task_id.
- **reports** *(cola de campo)*: id, emergency_id, resource_id?, user_id, type, category, approx_volume, text_note, audio_url, photo_urls, location, priority, status, created_at, reviewed_at.
- **needs** *(lado destino)*: id, emergency_id, side=destination, title, category, priority, requested_qty, unit, fulfilled_qty, requesting_org_id, validator_org_id, expiry, conditions, status.
- **donation_offers** *(material ciudadano concreto)*: id, emergency_id, donor_type, donor_contact, category, item, qty, photos, location, status, matched_need_id, assigned_resource_id, notes.
- **campaigns**: id, emergency_id, name, type, organizer_org_id, verification_status, cif, responsible, bank_or_link, fund_destination, dates, public_visibility, status, risk_flags.
- **incidents**: id, emergency_id, type, severity, related_entity_type, related_entity_id, description, reported_by, status, resolution.
- **audit_log**: id, emergency_id, actor, action, entity, before, after, at.
- **Fase 3–4 (roadmap):** `lots`, `shipments` (también con `emergency_id`).

> Semántica: `resources` = nodos/capacidad que se ofrecen; `donation_offers` = material concreto que dona un ciudadano; `needs` = necesidad validada desde destino; `reports` = señales de campo sobre un recurso.

---

## 9. Roadmap por fases (resumen de entrega)

- **Hito 0 — Latente + Activación:** plantillas, alta de emergencia desde plantilla, landing publicable en minutos, identidad global + memberships.
- **Hito 1 — Primeras horas (Fase 2):** todo el §5 (cara pública, auto-registro, verificación, cola de coordinación, panel, pausar todo). **Este es el MVP real.**
- **Hito 2 — Operación (Fase 3):** activación de puntos, semáforo de campo, recogidas, voluntariado con turnos.
- **Hito 3 — Logística (Fase 4):** lotes, QR, expediciones, manifiestos, matching.
- **Hito 4 — Cierre (Fase 5):** pausa global, informe, export, lecciones.

---

## 10. Fuera de alcance (won't have al inicio)
App nativa, blockchain, pagos propios, marketplace, inventario unitario, red social, gamificación, IA como decisión final, automatismos críticos sin revisión humana. (Coherente con v0.1 §25 y §33.)

---

## 11. Decisiones abiertas / riesgos a cerrar antes de implementar
- **GDPR detallado:** base legal por tipo de dato, política de retención y purga al cerrar emergencia, encargados de tratamiento (Neon/Upstash/Vercel/Cloud Run, todos UE). *Bloqueante legal.*
- **Autenticación:** propia (JWT gestionado en el back) vs. proveedor externo (Auth0/Clerk/Supabase Auth como IdP), siempre tras un puerto `IdentityProvider`. Trade-off control vs. mantenimiento.
- **Capacidad operativa humana:** la verificación y la cola de coordinación exigen personas en pico. Diseño asume **coordinación escasa** (filtros automáticos de triage, nunca de decisión). Validar con el equipo real.
- **Identidad/acreditación de coordinadores:** cómo se prueba que alguien es coordinador legítimo (invitación + verificación de entidad). Cimiento del antifraude.
- **Integración WhatsApp:** arranca manual/supervisado; la Business API (plantillas, aprobación Meta) es trabajo de Fase 3+.
