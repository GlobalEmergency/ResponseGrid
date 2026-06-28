# Arquitectura de ResponseGrid

Guía corta para orientarse en el repo sin releer todo el backlog.

## Vista general

- Monorepo `pnpm`
- Backend: NestJS 11 + TypeScript + Drizzle + PostgreSQL + Redis
- Frontend: Next.js 16 + React 19 + Tailwind + Leaflet
- Cliente API tipado en `packages/api-client`

## Backend

La API sigue una arquitectura hexagonal / DDD:

- `apps/api/src/contexts/*` agrupa bounded contexts por dominio
- `domain/` contiene reglas y entidades
- `application/` orquesta casos de uso
- `infrastructure/` adapta HTTP, persistencia y otros detalles externos

Reglas prácticas:

- no importar `@nestjs/*` ni Drizzle dentro de `domain/` o `application/`
- usar puertos para cruzar contextos
- preferir el query builder tipado antes que SQL crudo
- si cambian DTOs o endpoints, regenerar `pnpm gen:api`

## Frontend

La web usa App Router y Atomic Design:

- `apps/web/src/components/atoms`
- `apps/web/src/components/molecules`
- `apps/web/src/components/organisms`

Reglas prácticas:

- mantener componentes de UI pequeños y composables
- reutilizar el cliente tipado en vez de duplicar contratos
- respetar el idioma y el tono del proyecto en las cadenas visibles

## Datos y despliegue

- cambios de esquema siempre con migraciones versionadas en `apps/api/drizzle`
- la CI exige format, lint, build y test
- el despliegue de producción se dispara desde `main`

## Dónde mirar primero

1. `AGENTS.md` para reglas canónicas
2. `README.md` para estado general y arranque
3. `docs/features/` para el backlog funcional
4. `apps/api/AGENTS.md` y `apps/web/AGENTS.md` para detalles por app
