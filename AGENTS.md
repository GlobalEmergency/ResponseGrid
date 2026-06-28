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
- DB changes **always** as versioned migrations `apps/api/drizzle/NNNN_name.sql` (next free number — check the dir; gaps exist because removed features deleted their migrations). Applied idempotently by `deploy/migrate.sh` (prod) and the test `global-setup` (tracked by filename). `drizzle-kit migrate/generate` hangs on Windows → write the `.sql` by hand. **UTF-8 SQL via file → `psql < f.sql`, never via shell args** (Windows mangles accents).
- After touching DTOs/endpoints: **`pnpm gen:api`** and commit `packages/api-client/src/schema.ts` (verify the new paths are in it).
- Prefer the **typed Drizzle query builder** over raw `db.execute(sql\`SELECT *\`)` — raw SQL returns timestamptz/numeric/array columns as **strings**, which 500s on `.toISOString()` etc. If you must use raw SQL, coerce via the repo's `rawRowToSnapshot` helpers.
- Deliverable docs naming: `{NN}-{kebab-case}.{ext}`. Product/feature backlog lives in `docs/features/` + GitHub Issues.

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
