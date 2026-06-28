# ResponseGrid

**Plataforma de coordinación de ayuda en emergencias.** Conecta a ciudadanía, organizaciones y coordinación durante una catástrofe: publica los puntos logísticos verificados, recoge y valida necesidades, casa ofertas de material con quien las pide, organiza voluntariado y partes de campo, y mantiene todo en un mapa en tiempo real — minimizando el ruido y los desplazamientos inútiles.

> Producto de la organización **GlobalEmergency**. Multi-emergencia, multilingüe (ES/EN), con privacidad por diseño.

---

## ✨ Qué hace

| Dominio | Capacidades |
|---|---|
| **Emergencias** | Multi-emergencia con estados (activa / en pausa), **kill-switch** (corta altas cuando no está activa), comunicado oficial, **plantillas** (p. ej. "Emergencia sanitaria") y lista de "qué NO llevar ahora". |
| **Puntos logísticos** | Ficha del punto (almacén/transporte…), rol origen→intermedio→destino, **nivel de confianza** (verificado / oficial vía acreditación), **semáforo de estado** (operativo/saturado/en pausa/cerrado) y autoservicio del responsable. |
| **Necesidades** | Ciclo crear→validar→público, categorías (incl. **sanitarias**: medicamentos, equipos, insumos, personal), prioridad, ítems con cantidad, **caducidad/frescura** (48 h, "verifica antes de actuar"), y **personal sanitario ↔ matching con el roster de voluntarios**. |
| **Ofertas de material** | Oferta general o dirigida a una necesidad concreta + matching oferta↔necesidad desde coordinación. |
| **Voluntariado** | Roster con skills / disponibilidad / vehículo + **tareas** con asignación y check-in/out. |
| **Partes de campo** | Partes de campo (incidencia/stock/estado) con fotos, prioridad y punto logístico relacionado; cola de revisión en coordinación. |
| **Mapa** | Leaflet con capas (puntos, necesidades), **privacidad de ubicación** (coordenadas aproximadas para entidades sensibles, "tu ubicación no se publica"). |
| **Plataforma** | Identidad JWT + OAuth (Google/Facebook), acreditación de organizaciones, notificaciones in-app, **auditoría** de acciones, métricas, geocodificación (Nominatim), almacenamiento de ficheros, **i18n ES/EN**, **PWA** (manifest + service worker + autoguardado de borradores) y seguridad (Helmet, rate-limit, CORS). |

---

## 🏗️ Arquitectura

Monorepo **pnpm** con arquitectura **hexagonal / DDD** (puertos y adaptadores, bounded contexts) en el backend y **Atomic Design** en el frontend.

```
ResponseGrid/
├─ apps/
│  ├─ api/      NestJS 11 · hexagonal/DDD · Drizzle ORM · Postgres + Redis (BullMQ)
│  └─ web/      Next.js 16 · React 19 · App Router · Tailwind · Leaflet · PWA
├─ packages/
│  └─ api-client/   Cliente TypeScript tipado (openapi-fetch) generado desde la API
└─ docs/        Especificaciones, fichas de feature y planes
```

**15 bounded contexts** en `apps/api/src/contexts/`: `emergencies`, `resources`, `needs`, `offers`, `volunteers`, `reports`, `identity`, `organizations`, `accreditation`, `templates`, `notifications`, `audit`, `metrics`, `geocoding`, `files`. Cada uno con `domain` (agregados, value objects, puertos), `application` (casos de uso) e `infrastructure` (HTTP, Drizzle, adaptadores).

**Stack:** NestJS 11 · Next.js 16 · React 19 · TypeScript · Drizzle ORM · PostgreSQL 16 · Redis 7 (BullMQ) · Tailwind · Leaflet · Jest · ESLint + Prettier.

---

## 🚀 Puesta en marcha

**Requisitos:** Node ≥ 20, [pnpm](https://pnpm.io), Docker.

```bash
# 1) Dependencias
pnpm install

# 2) Postgres (5433) + Redis (6380)
docker compose up -d

# 3) Variables de entorno
cp apps/api/.env.example apps/api/.env      # rellena JWT_SECRET y, si usas login social, las claves OAuth
cp apps/web/.env.example apps/web/.env.local

# 4) Migraciones (aplícalas a la BD de dev)
#    drizzle-kit puede colgarse en Windows/Git Bash → se aplican con psql:
for f in apps/api/drizzle/*.sql; do docker exec -i $(docker compose ps -q postgres) psql -U reliefhub -d reliefhub < "$f"; done

# 5) Datos de demo
pnpm --filter api exec ts-node scripts/seed-identity.ts
pnpm --filter api exec ts-node scripts/seed-emergencies.ts
pnpm --filter api exec ts-node scripts/seed-templates.ts

# 6) Arrancar
pnpm --filter api start:dev          # API en http://localhost:3000  (Swagger en /docs)
pnpm --filter web dev                # Web en http://localhost:3001
```

Credenciales demo (solo si `DEMO_MODE=true` en `apps/web/.env.local`): `coord@reliefhub.org` / `coord1234`.

> **Tras tocar endpoints de la API:** `pnpm gen:api` regenera el cliente tipado (`packages/api-client/src/schema.ts`).

---

## 🧪 Calidad

```bash
pnpm --filter api test           # unitarios + integración (jest --runInBand)
pnpm --filter api test:e2e       # end-to-end (requiere Postgres/Redis)
pnpm --filter api lint           # ESLint
pnpm --filter web lint
pnpm --filter web build
```

Desarrollo guiado por **TDD**; Clean Code, SOLID y DDD en el backend, Atomic Design en el frontend.

---

## 🗺️ Estado y roadmap

**Implementado y verificado:** ciclo de vida de emergencia + kill-switch, confianza/acreditación, semáforo de puntos, voluntariado + tareas, partes de campo + fotos, plantillas, notificaciones, auditoría, PWA, i18n, métricas, y las features capturadas del análisis competitivo: categorías sanitarias, caducidad de necesidades, privacidad de ubicación y matching personal↔voluntarios.

**Backlog (en `docs/features/`):** necesidades nominales por beneficiario, oferta como compromiso de entrega, cercanía/rutas, cola offline real, directorio de servicios gratuitos, CTA de emergencia nacional, e **inventario y logística de punto de acopio** (existencias, lotes/cajas, traslados e indicadores de impacto).

---

## 🚀 Despliegue

- [`docs/deploy/aws-free-tier.md`](docs/deploy/aws-free-tier.md) — guía paso a paso: **web en Vercel + API/Postgres/Redis en una EC2 t3.micro (capa gratuita) + S3**. Artefactos en [`deploy/`](deploy) (Dockerfile, `docker-compose.prod.yml`, migraciones, Caddy).

## 📚 Documentación

- [`docs/features/`](docs/features) — fichas de feature (origen, propuesta DDD+API+Atomic, alcance, privacidad).
- [`01-especificacion-producto-y-arquitectura.md`](01-especificacion-producto-y-arquitectura.md) y [`especificacion_plataforma_ayuda_solidaria.md`](especificacion_plataforma_ayuda_solidaria.md) — especificación de producto y arquitectura.
