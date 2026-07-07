# ResponseGrid · API

API de la **plataforma de coordinación de ayuda material y logística en emergencias** de [Global Emergency](https://globalemergency.online). Construida con **NestJS 11** siguiendo arquitectura **hexagonal / DDD** (puertos y adaptadores, bounded contexts), **Drizzle ORM** sobre **PostgreSQL 16** y **Redis 7** (BullMQ) para eventos de dominio.

> Para la visión de conjunto del monorepo, la arquitectura y el roadmap, consulta el [`README.md`](../../README.md) raíz y **[`AGENTS.md`](../../AGENTS.md)** (guía canónica de convenciones).

## Puesta en marcha

```bash
pnpm install                 # desde la raíz del monorepo
docker compose up -d         # Postgres (5433) + Redis (6380)
cp apps/api/.env.example apps/api/.env   # rellena JWT_SECRET (≥32 chars en prod)
pnpm --filter api start:dev  # API en http://localhost:3000 · Swagger en /docs
```

## Calidad

```bash
pnpm --filter api build      # nest build — gate crítico de CI (tsc estricto)
pnpm --filter api lint       # ESLint (max-warnings=0)
pnpm --filter api test       # unitarios + integración (jest --runInBand)
```

Desarrollo guiado por **TDD**; Clean Code, SOLID y DDD. El `domain/` y `application/` no importan `@nestjs/*`, Drizzle ni infraestructura (regla de ESLint).

> **Tras tocar DTOs/endpoints:** `pnpm gen:api` regenera el cliente tipado (`packages/api-client/src/schema.ts`).

## Licencia

Publicada bajo **[GNU AGPL-3.0](../../LICENSE)**. Es la licencia autoritativa de todo el código del proyecto (copyleft de red: si ofreces el servicio en red, debes publicar el código fuente correspondiente). La licencia de los **datos** que expone la API pública es distinta: **CC BY-SA 4.0** (ver el portal `/docs`).
