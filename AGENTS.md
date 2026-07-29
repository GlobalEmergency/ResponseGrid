# AGENTS.md — ResponseGrid

Canonical instructions for any AI agent or contributor working in this repo. Read this first. (`CLAUDE.md` just imports this file.)

## What ResponseGrid is

Multi-emergency **material aid coordination + logistics** platform (org: **Global Emergency**). Live: web `https://responsegrid.app` (Vercel), API `https://api.responsegrid.app` (EC2). Activated per emergency; data isolated by `emergency_id`/slug. Connects citizens, organizations and coordinators during a disaster.

**In scope:** collection/logistic points (puntos de acopio) **with declared material inventory per place**, validated needs (with 48h freshness), material offers + matching to needs, **a single shared catalogue of supplies + categories** (insumos), **transport capacity + shipments** (logistics), volunteers + tasks, field reports (incident/stock/status), real-time Leaflet map, **authorization** (roles/grants/groups/API keys), public read-only API + developer `/docs`.

**Deliberately REMOVED — do NOT reintroduce:** family reunification, structural-damage/SAR reports, money-donation CTA. (Material-donation `/donar` stays.)

## Stack

- **pnpm monorepo**, `packageManager: pnpm@10.33.4` (pinned — use corepack; do NOT let pnpm 11 regenerate the lockfile).
- **`apps/api`** — NestJS 11, **hexagonal / DDD** (ports & adapters, CQRS-light, domain events via Redis/BullMQ), Drizzle ORM, Postgres 16, Redis 7. Swagger at `/docs`.
- **`apps/web`** — Next 16 (App Router, React 19), **Atomic Design**, Tailwind 4, Leaflet + `leaflet.markercluster`. Consumes the typed client. (See `apps/web/AGENTS.md` for Next-16 specifics.)
- **`packages/api-client`** — `@reliefhub/api-client`, openapi-fetch typed client. Regenerate with `pnpm gen:api`.
- **`packages/warehouse-*`** — `@globalemergency/warehouse-core` (reusable, framework-free WMS domain: `kernel`/`catalog`/`inventory`/`containers`/`logistics` over an opaque `ScopeId`) + `@globalemergency/warehouse-postgres` (Drizzle persistence). Consumed by `apps/api` via `workspace:*`; **pure domain** — ESLint forbids `@nestjs/*`/`drizzle-orm`/`pg`/`apps/*` imports. Own tests run via `node --test` on compiled JS (`pnpm --filter '@globalemergency/warehouse-core' test`). **The extraction-to-OSS-product roadmap is [EPIC #355](https://github.com/GlobalEmergency/ResponseGrid/issues/355)** — read it before touching these packages. `kernel`/`catalog`/`containers` are the actual domain model behind the `supplies` bounded context (below) — but `apps/api/src/contexts/supplies/infrastructure/drizzle` writes its **own** Drizzle adapters implementing those ports against ResponseGrid's production schema; it does **not** use `@globalemergency/warehouse-postgres`, which today only persists the separate `inventory`/`wms` module (vehicle-fleet work).
- TDD throughout. Dev infra via docker-compose.

## Architecture

Hexagonal bounded contexts in `apps/api/src/contexts/` (18):
`emergencies · resources · needs · offers · supplies · logistics · volunteers · reports · identity` (authz: grants/service-accounts/API keys) `· groups` (cuadrillas) `· organizations · accreditation · templates · notifications · audit · metrics · geocoding · files`.

- `domain/` and `application/` must **NOT** import `@nestjs/*`, drizzle, or infrastructure — enforced by ESLint `no-restricted-imports`. Output ports are mocked in tests; the real domain runs.
- **`supplies` (insumos) — upstream supporting domain (the material line is the core of the platform).** `apps/api/src/contexts/supplies` is a hexagonal **host** (application use cases + Drizzle persistence + HTTP controllers) around domain types that actually live in `@globalemergency/warehouse-core`'s `kernel`/`catalog`/`containers` modules (see `packages/warehouse-*` above). It replaced the old `taxonomy` context and now owns considerably more than a shared taxonomy:
  - **Category**: the taxonomy moved from a closed enum to a **data-driven, validated slug** (`CategorySlug`, format `^[a-z][a-z0-9_]*$`) — the `Category` TS enum survives only as the seed of **core** slugs (food/water/hygiene/clothing/medical/shelter/tools/other + health vertical + UCAB subcategories), exported as `CORE_CATEGORY_SLUGS`. `CategoryDefinition` (the `categories` table) enriches any slug — core or tenant-defined — with localized labels, hierarchy (`parentSlug`), `kind` (material/personnel), facet counts and `externalCodes`. Core slugs are **protected**: archiving one throws `CategoryProtectedError` → 409. Public `GET /categories`; admin CRUD at `admin/categories` (`catalogue:manage`).
  - **`Supply` master-data catalogue** (epic #228, #222): the previously-planned catalogue is now real. Each `Supply` has a server-assigned code `XXX-NNNN` (prefix from its category's root, sequential), a canonical `name` (**base = `es`**) plus **i18n translations** (`supply_translations`, one row per locale) resolved with **fallback to the base name** when the requested locale has none, a `categorySlug`, freeform `attributes` (jsonb, governed by the attribute metamodel below), an optional **`variantOfId`** (a variant just points at its parent — no separate variants table; `attributes` is what actually differentiates it), **aliases** (`supply_aliases`, synonyms resolved by `SupplyResolver` against canonical name + every translation + code + alias; a label matching more than one supply resolves to `null` — ambiguous, must be `merge`d rather than aliased), `status` (`active`/`archived`; `merge` folds a duplicate into a canonical target, moving its aliases and re-pointing its variants), **`nature`** (`fungible`/`reusable`/`human` — logistics classification, lives on the *supply*, not the category, since one category can mix natures; `null` = unclassified), and **`externalCodes`** (open `namespace → code` map for interop, e.g. `unspsc`/`hxl`, indexed with a GIN index for reverse lookup). `unitWeightKg`/`unitVolumeM3` exist in the domain (for vehicle load calculations) but **ResponseGrid's HTTP and persistence don't wire them yet** — always `null` here.
  - **Attribute metamodel** (epic #228): `AttributeDefinition` — an admin-defined, typed field (`text`/`number`/`integer`/`boolean`/`enum`/`date`/`quantity`, with optional `required`/`options`/`unit`) anchored to a `categorySlug` **family** and inherited down the category tree: `resolveEffectiveSchema` unions a category's own definitions with all its ancestors' (root → leaf); the same `key` appearing at two levels of that chain is a collision error, not an override. `Supply.attributes` is validated/coerced against this effective schema on create/edit (`validateAttributes`); a family with no definitions stays a free, ungoverned jsonb (backwards-compatible). CRUD at `admin/attribute-definitions`.
  - **Tenancy** (base global + per-tenant extension): every governed row (`Supply`, `supply_aliases`, `attribute_definitions`) carries a nullable `scopeId` — `null` = global (shared by every tenant), a tenant id = an **additive** extension (effective schema/catalogue = global ∪ that tenant's rows, never overriding; a tenant `key`/alias/code colliding with a global one is rejected, not shadowed). **ResponseGrid's admin HTTP endpoints only operate in the global scope today** — `scopeId` isn't yet an exposed request parameter, so tenancy is a domain/persistence capability ahead of the wired API.
  - **Governance**: `admin/supplies`, `admin/categories` and `admin/attribute-definitions` all require the `catalogue:manage` permission, granted today only via the `platform_admin` role (`ALL_PERMISSIONS`) — i.e. admins-only, no per-emergency coordinator access. The public `GET /supplies`, `GET /supplies/:id` and `GET /categories` serve **only active rows** and never expose `status`/`registrationNotes`/`nature`/`externalCodes`/`scopeId` (those stay in the admin-only projections/DTOs).
  - **Containers** (palet/caja/lote) are **implemented**, not just designed-for (`#140`): a `Container` groups `SupplyLine[]` with declared weight/volume, nests under a parent (self-FK, cycle-checked), seals (lines become immutable once sealed) and moves between a polymorphic holder (`resource`|`shipment`, no FK). Routes under `supplies/containers/*`, gated on being a coordinator of the container's emergency (not `catalogue:manage` — containers are per-emergency, the catalogue is global).
  - `needs`, `offers`, `resources` (inventory) and `logistics` (`ShipmentItem`) still depend on the shared **`SupplyLine`** value object (`name/quantity/unit/category/presentation/expiresAt`), which now carries an optional **`supplyId`** soft link to the master-data `Supply` (nullable — legacy free-text lines aren't forced to link); unlinked legacy text is reconciled via `admin/supplies/backfill` (report + best-effort execute, idempotent).
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

A merged PR → push to `main` triggers: **GitHub Action** deploys the API to EC2 via SSM (builds the Docker image, applies migrations with `migrate.sh`) **and** Vercel auto-deploys the web. The CI gate having passed is what keeps prod healthy.

## Public emergency for testing

`Terremoto Venezuela 2026` — slug `terremoto-venezuela-2026`, id `11111111-1111-4111-8111-111111111111` (574 real collection points imported from acopiove.org).

## Gotchas (hard-won)

- The CI gate **must** include `pnpm --filter api build` — jest/ts-jest is looser than `nest build`.
- Raw SQL `SELECT *` → string-typed dates/numerics/arrays → 500. Use the typed query builder.
- Lockfile: regenerate after dep changes / merges (pnpm 10.33.4), or the deploy's `--frozen-lockfile` fails.
- `prettier` lives in `apps/api`'s deps — run it via `pnpm --filter api exec prettier`, not `pnpm exec prettier` from the root.
