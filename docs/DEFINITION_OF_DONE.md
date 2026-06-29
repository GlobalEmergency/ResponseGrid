# Definition of Done — ResponseGrid

Criterios que **toda feature o sub-issue** debe cumplir antes de cerrarse.
Las épicas se cierran cuando todas sus sub-issues los cumplen.

## Gate de CI (obligatorio siempre)

```bash
pnpm install --frozen-lockfile

# API (si tocas apps/api o packages/api-client)
pnpm --filter api build
pnpm --filter api exec eslint "{src,apps,libs,test}/**/*.ts" --max-warnings=0
pnpm --filter api exec prettier --check "src/**/*.ts" "test/**/*.ts"
pnpm --filter api test

# Web (si tocas apps/web)
pnpm --filter @reliefhub/api-client build
pnpm --filter web build
pnpm --filter web lint
```

Si el área tocada no incluye la API, el gate de web es suficiente, y viceversa.

## Código

- [ ] Tests unitarios en `*.spec.ts` (use-cases con repositorios in-memory si aplica)
- [ ] Sin `console.log` ni código de depuración
- [ ] Sin `@ts-ignore` ni `any` salvo justificación documentada
- [ ] Sin `Co-authored-by` ni referencias a Claude/IA en commits o PRs

## API

- [ ] DTOs documentados con `@ApiProperty` (Swagger)
- [ ] Si se añaden o cambian endpoints: `pnpm gen:api` ejecutado y `packages/api-client/src/schema.ts` commiteado
- [ ] Si hay cambios en el esquema de BD: migración en `apps/api/drizzle/NNNN_nombre.sql` (siguiente número libre)

## Web

- [ ] El flujo principal es navegable en el build de producción (`next build`)
- [ ] Sin regresiones en rutas existentes
- [ ] Fechas formateadas con `formatDate`/`formatDateTime` o `<LocalDate>`, nunca `toLocale*` suelto

## Documentación

- [ ] Si la feature añade comportamiento observable: comentario en el issue o PR explicando cómo probarlo
- [ ] Si añade un nuevo endpoint público: mencionado en la descripción del PR
- [ ] Si cierra un issue o épica: `Closes #NN` en el cuerpo del PR

## Revisión

- [ ] PR abierto contra `main` con la plantilla rellenada
- [ ] CI verde en todos los checks requeridos (`Format check`, `Lint`, `Build`, `Test`)
- [ ] Auto-merge configurado (`gh pr merge --auto --squash`)
