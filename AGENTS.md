# AGENTS.md — ResponseGrid

> **Fork SOS Galápagos.** Este repositorio es el fork de ResponseGrid para la emergencia de Galápagos (USFQ Galápagos, desarrollo IA Humana). Lo propio del fork está en `README.md`, `galapagos/`, `geodatos/` y `deploy/sosgalapagos/`. La rama de trabajo es `main` de este fork y los commits van firmados como **IA Humana**. Las secciones sobre issues, ramas protegidas y despliegue en srv07 describen el proyecto original.

## Árbol de repositorios de SOS Galápagos

**Estás en:** `sosgalapagos`, la plataforma. Antes de tocar `deploy/sosgalapagos/` o la API, lee las dependencias de abajo: otros repositorios publican a través de este.

<!-- arbol-repos:inicio -->
> **Este bloque es idéntico en los seis repositorios** (en su `AGENTS.md`). Si cambias algo, cámbialo en los seis. Última revisión: 2026-11-22 (el mapa único es `/riesgos/`; el visor de `/mapas` se retiró; todo el clima corre en `sosgalapagos-plataforma`; licencia nueva en `sosgalapagos-datos` y `sosgalapagos-plataforma`).

SOS Galápagos no es un solo repositorio, son seis. No hay organización de GitHub: todos están en la cuenta `mayait`. En la Mac de Julián cada uno se clona en `~/dev/<nombre>`.

| Repositorio | Visibilidad | Qué contiene | Qué publica |
|---|---|---|---|
| [`sosgalapagos`](https://github.com/mayait/sosgalapagos) | público | La plataforma de coordinación: web y API. Es un fork de `GlobalEmergency/ResponseGrid`. También guarda el Caddy y el Docker Compose de **todo** el servidor (`deploy/sosgalapagos/`). | `sosgalapagos.org/` y `/backend` |
| [`sosgalapagos-datos`](https://github.com/mayait/sosgalapagos-datos) | público | Geodatos, estudios de riesgo, modelos y el panel de `/clima/`. Su carpeta `servidores/` es el índice de qué corre dónde. Código con derechos reservados: uso con permiso. | Los datos de `/mapas/…` (capas y descargas, sin visor) y la página de `/clima/` |
| [`sosgalapagos-plataforma`](https://github.com/mayait/sosgalapagos-plataforma) | público | El mapa de riesgos: reportes ciudadanos con vencimiento sobre las capas de riesgo, buscador, descargas e informe. Django + PostGIS. También corre todo el clima (un solo stack, desde el 22-nov-2026). Código con derechos reservados: uso con permiso. Es el único mapa del sitio desde el 21-nov-2026. | `/riesgos/` |
| [`sosgalapagos-bot`](https://github.com/mayait/sosgalapagos-bot) | **privado** | Asistente de WhatsApp: lee grupos, clasifica mensajes y crea pedidos en la plataforma. | Nada en la web; es un servicio systemd aparte (ver su `LEEME.md`) |
| [`RESPONSEGRID_GALAPAGOS`](https://github.com/mayait/RESPONSEGRID_GALAPAGOS) | público | Carpeta de trabajo local: arranque en la Mac y datos semilla. Clona `sosgalapagos` dentro de `app/`, que git ignora. Conserva la historia de geodatos hasta el 2-nov-2026. | Nada |
| [`estudiantes-riesgo-nino`](https://github.com/mayait/estudiantes-riesgo-nino) | **privado** | Viviendas de estudiantes de USFQ Galápagos cruzadas con el riesgo de inundación. Tiene datos personales. | `/usfq/`, con contraseña |

```
                         sosgalapagos.org (un solo servidor, detrás de Cloudflare)
                                          │
              Caddy + Docker Compose: sosgalapagos → deploy/sosgalapagos/
        ┌──────────────┬──────────────────┬──────────────────┬───────────────────────┐
        │ /  /backend  │ /riesgos/        │ /mapas/… /clima/ │ /usfq/ (contraseña)   │
        ▼              ▼                  ▼                  ▼                       │
   sosgalapagos   sosgalapagos-      sosgalapagos-datos   estudiantes-riesgo-nino    │
   (portada y     plataforma         (datos y modelos)    (privado)                  │
    coordinación) (mapa de riesgos)       │                    ▲                     │
        ▲              ▲  lee capas.json, │ capas y descargas  │ capas de geodatos   │
        │              └──────────────────┴────────────────────┘                     │
        │ API pública                                                                │
   sosgalapagos-bot (privado, servicio aparte) ◄─────────────────────────────────────┘

   /mapas/ ya no tiene visor: la página redirige a /riesgos/. Sus datos se siguen sirviendo.
   RESPONSEGRID_GALAPAGOS/app/  =  otro clon local de sosgalapagos
```

### Cómo dependen unos de otros

1. **Las rutas del servidor se definen en `sosgalapagos`.** El `Caddyfile` y el `docker-compose.yml` de `deploy/sosgalapagos/` sirven la plataforma, pasan `/riesgos/` al contenedor de `sosgalapagos-plataforma` (Compose aparte, en la misma red) y montan las carpetas que publican los demás: `/srv/sosgalapagos-mapas` y `/srv/sosgalapagos-clima` (de `sosgalapagos-datos`) y `/srv/sosgalapagos-privado` (de `estudiantes-riesgo-nino`). Una ruta nueva se añade allí y se despliega con `deploy/sosgalapagos/deploy.sh`, aunque el contenido venga de otro repositorio.
2. **Las capas del mapa de la plataforma se generan en `sosgalapagos-datos`** (`geodatos/export/`) y se sirven desde `sosgalapagos` (`apps/web/public/capas/galapagos-2026/`), dentro de la imagen web. Para que un cambio de capa llegue a la plataforma hay que copiarla y desplegar la app. La carpeta `geodatos/` de `sosgalapagos` no recibe cambios desde el 1-nov-2026: el proceso vivo está en `sosgalapagos-datos`.
3. **El bot habla con la plataforma solo por su API pública** (`https://sosgalapagos.org/backend`, cliente en `src/responsegrid.ts`). No toca la base de datos ni el código. Si cambias un endpoint o un DTO de la API en `sosgalapagos`, revisa ese cliente.
4. **`estudiantes-riesgo-nino` lee las capas de `sosgalapagos-datos`.** Su ruta por defecto apunta a la ubicación antigua, que ya no existe: se corre con `GEODATOS=~/dev/sosgalapagos-datos/geodatos`.
5. **`RESPONSEGRID_GALAPAGOS/app/` es un clon de `sosgalapagos`**, no una carpeta del repositorio que lo contiene. Lo que se hace commit allí va a `sosgalapagos`. Como hay dos clones locales del mismo repositorio (`~/dev/sosgalapagos` y `~/dev/RESPONSEGRID_GALAPAGOS/app`), haz `git pull` antes de trabajar en cualquiera.
6. **El mapa de `/riesgos/` lee lo que `sosgalapagos-datos` publica bajo `/mapas/`**: el manifiesto (`capas.json`), las capas, las teselas, `descargas.json` y `version.txt`. Una capa nueva se añade en `sosgalapagos-datos` y aparece sola en `/riesgos/`. **Nunca se da de baja la carpeta de `/mapas/`**: solo se retiró su página, que redirige a `/riesgos/`.

### Dónde va cada cambio

| Quiero cambiar… | Repositorio |
|---|---|
| La web, la API, la portada, formularios o la marca | `sosgalapagos` |
| Una ruta, un contenedor o el Caddy del servidor | `sosgalapagos` → `deploy/sosgalapagos/` |
| El mapa de riesgos: reportes, buscador, panel de capas, informe, página de descargas | `sosgalapagos-plataforma` |
| Una capa, un estudio, un modelo, el orden y los colores de las capas | `sosgalapagos-datos` → `geodatos/` |
| La página del panel de `/clima/` | `sosgalapagos-datos` → `clima/web/` |
| Las fuentes de clima, el nivel de lluvia, el pronóstico, las mareas, el satélite | `sosgalapagos-plataforma` → `clima/` |
| Qué servicio corre dónde y cómo se publica | `sosgalapagos-datos` → `servidores/README.md` |
| Cómo lee, responde o modera el asistente de WhatsApp | `sosgalapagos-bot` |
| El arranque local o los datos semilla | `RESPONSEGRID_GALAPAGOS` → `galapagos/` |
| El mapa o el informe de estudiantes en riesgo | `estudiantes-riesgo-nino` |

### Reglas que cruzan repositorios

- **No se copia código de `sosgalapagos` (AGPL-3.0) a `sosgalapagos-plataforma`** (todos los derechos reservados desde el 22-nov-2026; antes, Apache 2.0).
- **Nada de un repositorio privado pasa a uno público.** Ni los datos personales de `estudiantes-riesgo-nino` ni la lógica de detección de estafas del bot (`src/analista.ts`).
- **Licencias.** `sosgalapagos` es AGPL-3.0 (fork de ResponseGrid) y no cambia. `sosgalapagos-datos` y `sosgalapagos-plataforma` tienen, desde el 22-nov-2026, el código con todos los derechos reservados (usarlo requiere permiso escrito de Julián Maya) y lo propio que no es código bajo CC BY-NC-ND 4.0; cada archivo de código lleva su aviso de autoría. Los datos de terceros conservan la licencia de su fuente.
- **Cada repositorio tiene sus propias reglas de commit y de ramas.** Léelas en su `AGENTS.md` o `LEEME.md` antes de hacer commit. Dos que cambian: en `sosgalapagos` los commits van como «IA Humana» y sin `Co-Authored-By`; en `sosgalapagos-datos` y en `sosgalapagos-plataforma` se trabaja en una rama con pull request, también sin `Co-Authored-By`.
- **Desplegar es un paso aparte y manual.** Subir a `main` no publica nada en `sosgalapagos.org`. No despliegues si no te lo piden.
<!-- arbol-repos:fin -->

---

Canonical instructions for any AI agent or contributor working in this repo. Read this first. (`CLAUDE.md` just imports this file.)

## What ResponseGrid is

Multi-emergency **material aid coordination + logistics** platform (org: **Global Emergency**). Live: web `https://responsegrid.app` (Vercel), API `https://responsegrid-api.globalemergency.online` (srv07, Plesk + Docker; the legacy `https://api.responsegrid.app` is a Cloudflare 308 redirect to it). Activated per emergency; data isolated by `emergency_id`/slug. Connects citizens, organizations and coordinators during a disaster.

**In scope:** collection/logistic points (puntos de acopio) **with declared material inventory per place**, validated needs (with 48h freshness), material offers + matching to needs, **a single shared catalogue of supplies + categories** (insumos), **transport capacity + shipments** (logistics), volunteers + tasks, field reports (incident/stock/status), real-time Leaflet map, **authorization** (roles/grants/groups/API keys), public read-only API + developer `/docs`.

**Deliberately REMOVED — do NOT reintroduce:** family reunification, structural-damage/SAR reports, money-donation CTA. (Material-donation `/donar` stays.)

## Stack

- **pnpm monorepo**, `packageManager: pnpm@10.33.4` (pinned — use corepack; do NOT let pnpm 11 regenerate the lockfile).
- **`apps/api`** — NestJS 11, **hexagonal / DDD** (ports & adapters, CQRS-light, domain events via Redis/BullMQ), Drizzle ORM, Postgres 16, Redis 7. Swagger at `/docs`.
- **`apps/web`** — Next 16 (App Router, React 19), **Atomic Design**, Tailwind 4, Leaflet + `leaflet.markercluster`. Consumes the typed client. (See `apps/web/AGENTS.md` for Next-16 specifics.)
- **`packages/api-client`** — `@reliefhub/api-client`, openapi-fetch typed client. Regenerate with `pnpm gen:api`.
- **`packages/warehouse-*`** — `@globalemergency/warehouse-core` (reusable, framework-free WMS domain: `kernel`/`catalog`/`inventory`/`containers`/`logistics` over an opaque `ScopeId`) + `@globalemergency/warehouse-postgres` (Drizzle persistence). Consumed by `apps/api` via `workspace:*`; **pure domain** — ESLint forbids `@nestjs/*`/`drizzle-orm`/`pg`/`apps/*` imports. Own tests run via `node --test` on compiled JS (`pnpm --filter '@globalemergency/warehouse-core' test`). **The extraction-to-OSS-product roadmap is [EPIC #355](https://github.com/GlobalEmergency/ResponseGrid/issues/355)** — read it before touching these packages.
- TDD throughout. Dev infra via docker-compose.

## Architecture

Hexagonal bounded contexts in `apps/api/src/contexts/` (18):
`emergencies · resources · needs · offers · supplies · logistics · volunteers · reports · identity` (authz: grants/service-accounts/API keys) `· groups` (cuadrillas) `· organizations · accreditation · templates · notifications · audit · metrics · geocoding · files`.

- `domain/` and `application/` must **NOT** import `@nestjs/*`, drizzle, or infrastructure — enforced by ESLint `no-restricted-imports`. Output ports are mocked in tests; the real domain runs.
- **`supplies` (insumos) — upstream supporting domain (the material line is the core of the platform).** Owns the single material-line model reused everywhere instead of a copy per context: `Category` (the **canonical** enum of aid-material categories — food/water/hygiene/clothing/medical/shelter/tools/other + health vertical medicines/medical_equipment/medical_supplies/medical_personnel), `CategoryDefinition` (the `categories` table: localized labels, hierarchy, import aliases, facet counts — enrichment, not a parallel enum), and the **`SupplyLine`** value object (`name/quantity/unit/category/presentation`). `needs`, `offers`, `resources` (inventory) and `logistics` (`ShipmentItem`) depend on it. Public **`GET /categories`** surfaces the taxonomy. (Replaced the old `taxonomy` context; designed to later reference a `Supply` master-data catalogue and a grouping aggregate —palet/caja/lote— without touching consumers (OCP/DIP).)
- **Resource inventory.** A resource/place declares the material it holds for delivery as `SupplyLine[]` (`resource_items`, FK-cascade; migration `0028`). Captured at `/registrar`. The public detail endpoint exposes it **aggregated to distinct categories** (`inventoryCategories`) for privacy; the full lines are persisted for coordination.
- Shared kernel in `apps/api/src/shared/` (EmergencyId, Location, Priority, DomainEvent, cross-context errors, the single `pg.Pool` via `DatabaseModule`). The material-line/category model lives in `supplies` (an upstream context), not in the shared kernel.
- Authorization model: `Principal → Grant(role@scope) → Permission → can()`; `@RequirePermission` decorator (replaced the legacy per-context coordinator guards). API keys: `X-API-Key: rh_live_…`.

## Conventions

- **Clean Code, DDD, SOLID.** Atomic Design in `apps/web/src/components/{atoms,molecules,organisms}`.
- Working language: **Spanish** (UI copy, commits, issues).
- **Commits & PRs: NEVER include `Co-authored-by` or any reference to Claude / AI / the model.**
- DB changes **always** as versioned migrations `apps/api/drizzle/NNNN_name.sql` (next free number — check the dir; gaps exist because removed features deleted their migrations). Applied idempotently by `deploy/migrate.sh` (prod) and the test `global-setup` (tracked by filename). **Migrations are immutable once merged** — never edit, rename or delete an applied `.sql`: `migrate.sh` tracks by filename, so the change does **not** re-run in prod and the deploy breaks (incident #237); CI's Build job guards this. Fix-forward with a **new** migration instead. `drizzle-kit migrate/generate` hangs on Windows → write the `.sql` by hand. **UTF-8 SQL via file → `psql < f.sql`, never via shell args** (Windows mangles accents).
- After touching DTOs/endpoints: **`pnpm gen:api`** and commit `packages/api-client/src/schema.ts` (verify the new paths are in it).
- Prefer the **typed Drizzle query builder** over raw `db.execute(sql\`SELECT *\`)` — raw SQL returns timestamptz/numeric/array columns as **strings**, which 500s on `.toISOString()` etc. If you must use raw SQL, coerce via the repo's `rawRowToSnapshot` helpers.
- Deliverable docs naming: `{NN}-{kebab-case}.{ext}`.
- **Tracking lives in GitHub Issues — the single source of truth** for features, bugs, docs work, status, priority and the whole backlog. Use the issue templates (`.github/ISSUE_TEMPLATE/`: epic/feature/bug), the labels (`epic`/`feature`/`task`/`docs` · `area:*` · `P0`/`P1`/`P2` · `in-progress`), **EPIC** issues that group sub-issues (checklist + `Closes #NN`), and the **Claiming an issue** protocol below. **Do not track work, status or backlog in markdown.** `docs/features/*.md` is **frozen legacy** (historical specs only, each linked from its issue) — do not add or edit them; open/curate the GitHub issue instead.

## Workflow — branch protection is ACTIVE on `main`

**There is NO direct push to `main`.** Multiple parallel agent sessions merge here, so `main` moves fast. Every change:

1. **Claim the issue** so no two agents take the same one — see **Claiming an issue** below. Only start one that is open, has no `in-progress` label, and is not already linked by an open PR.
2. Sync: `git checkout main && git fetch origin && git merge --ff-only origin/main`.
3. Branch: `git checkout -b feature/NN-short` (or `fix/...`, `docs/...`).
4. Implement (TDD). Run the **full gate locally** (below) — the CI enforces all of it and a red check blocks the merge.
5. `git push -u origin <branch>` → `gh pr create --base main --body "Closes #NN …"` → `gh pr merge <branch> --auto --squash`.
6. CI runs the 4 required checks (`Format check`, `Lint`, `Build`, `Test`); on green it **auto-merges (squash)**, closes the linked issue, **deletes the branch**, and triggers the deploy.

Repo settings: squash-only, delete-branch-on-merge, auto-merge ON, `strict=false` (no up-to-date requirement — but always sync `main` before push to minimise drift), 0 required approvals (the CI is the gate, not human review). Work from GitHub issues; put `Closes #NN` in the PR body.

### Claiming an issue (parallel-agent coordination)

Several agent sessions (Claude, Codex, …) run at once and share one GitHub identity, so **claim an issue before working it** — the `in-progress` label is the lock. Skip this only for ad-hoc work with no issue.

1. **Check it's free:** the issue is open, has **no `in-progress` label**, and **no open PR links it** (`gh pr list --state open --search "NN in:body"`).
2. **Claim it:** `gh issue edit NN --add-label in-progress`, then leave a claim comment — `gh issue comment NN --body "🤖 WIP · <branch> · $(date -u +%FT%TZ)"`. The session identity goes in the comment (not the assignee), since sessions share a token.
3. **Confirm you won the race:** re-read it (`gh issue view NN --comments`). If another claim comment **predates yours**, you lost — remove the label only if you added it (`gh issue edit NN --remove-label in-progress`), retract your comment, and pick a different issue.
4. **Release:** when your PR merges, `Closes #NN` closes the issue and the lock is moot. If you **abandon** it, `gh issue edit NN --remove-label in-progress` and comment why, so it's free again.
5. **Stale claim:** an `in-progress` issue with **no linked open PR and no claim/branch activity for >24h** counts as abandoned — remove the stale label and re-claim it.

## The gate (run locally before pushing — CI runs ALL of these)

```bash
pnpm install --frozen-lockfile          # also catches lockfile drift
# api:
pnpm --filter api build                 # nest build / tsc — CRITICAL: jest passes but tsc (exactOptionalPropertyTypes) catches real bugs
pnpm --filter api exec eslint "{src,apps,libs,test}/**/*.ts" --max-warnings=0
pnpm --filter api exec prettier --check "src/**/*.ts" "test/**/*.ts"
pnpm --filter api test                  # runInBand; global-setup spins up reliefhub_test + applies migrations
# web (build the api-client first):
pnpm --filter @reliefhub/api-client build && pnpm --filter web build
pnpm --filter web lint
pnpm --filter web test                  # node --test on .ts → needs Node ≥22.6 (native type-stripping); CI runs this step on Node 22
```

If you change dependencies, regenerate the lockfile with `pnpm install` (pnpm 10.33.4) and commit `pnpm-lock.yaml` — lockfiles do **not** 3-way-merge cleanly, so regenerate after any merge that touched deps (else the Docker build fails on `--frozen-lockfile`).

## Run / dev

```bash
pnpm dev:infra                          # docker compose: postgres :5433, redis :6380
pnpm --filter api start:dev             # API on :3000 (prod needs JWT_SECRET ≥32 chars; dev: JWT_SECRET=dev-secret-change-me)
pnpm --filter web dev                   # web on :3001
```
Verify `dynamic(ssr:false)` components (the Leaflet map) only in a **production** build (`next start`) or the real browser — dev HMR over `host.docker.internal` doesn't mount them (env artifact, not a bug).

## Deploy

A merged PR → push to `main` triggers: **GitHub Action** deploys the API to srv07 over SSH (builds the Docker image, applies migrations with `migrate.sh`; see `docs/deploy/srv07.md`) **and** Vercel auto-deploys the web. The CI gate having passed is what keeps prod healthy.

## Public emergency for testing

`Terremoto Venezuela 2026` — slug `terremoto-venezuela-2026`, id `11111111-1111-4111-8111-111111111111` (574 real collection points imported from acopiove.org).

## Gotchas (hard-won)

- The CI gate **must** include `pnpm --filter api build` — jest/ts-jest is looser than `nest build`.
- Raw SQL `SELECT *` → string-typed dates/numerics/arrays → 500. Use the typed query builder.
- Lockfile: regenerate after dep changes / merges (pnpm 10.33.4), or the deploy's `--frozen-lockfile` fails.
- `prettier` lives in `apps/api`'s deps — run it via `pnpm --filter api exec prettier`, not `pnpm exec prettier` from the root.
