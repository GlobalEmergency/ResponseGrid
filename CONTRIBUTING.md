# Contributing to ResponseGrid

ResponseGrid trabaja en español y sigue un flujo simple: abrir issue, enlazar PR, pasar CI y fusionar por squash.

## Branches

| Prefijo | Cuándo usarlo |
|---------|---------------|
| `feature/NN-resumen-corto` | Nueva funcionalidad |
| `fix/NN-resumen-corto` | Corrección de bug |
| `docs/NN-resumen-corto` | Documentación o configuración de repo |
| `chore/NN-resumen-corto` | Tareas de mantenimiento sin impacto funcional |

Usa el número de issue en la rama siempre que exista. El `resumen-corto` en kebab-case, máx. 5 palabras.

**Ejemplos:**
- `feature/205-telefono-perfil`
- `fix/188-qr-deep-link`
- `docs/43-convencion-labels-ramas-commits`

## Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<scope>): <descripción en español>
```

| Tipo | Cuándo |
|------|--------|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Solo documentación |
| `chore` | Tareas sin impacto funcional (CI, deps, configs) |
| `refactor` | Refactor sin cambio de comportamiento |
| `test` | Tests sin cambio de código de producción |

El scope es opcional pero ayuda cuando el cambio está acotado a un contexto (`api`, `web`, `resources`, `identity`, `logistics`…).

**Ejemplos:**
- `feat(api): añadir phone a RegisterDto y use case UpdateProfile`
- `fix(web): corregir ruta del QR de donación`
- `docs: convención de labels, ramas y commits`
- `chore(web): guardarraíl ESLint anti-toLocale suelto`

**Nunca incluyas** `Co-authored-by` ni referencias a Claude, IA o al modelo en mensajes de commit o PRs.

## Labels

### Tipo de issue

| Label | Cuándo |
|-------|--------|
| `epic` | Agrupa múltiples sub-issues relacionadas |
| `feature` | Nueva funcionalidad |
| `task` | Tarea técnica o de repo (no feature de usuario) |
| `docs` | Solo documentación |
| `bug` | Comportamiento incorrecto |

### Área funcional (`area:*`)

| Label | Contexto |
|-------|----------|
| `area:inventory` | Inventario, expediciones, contenedores, acopio |
| `area:needs` | Necesidades, insumos, categorías, supplies |
| `area:directory` | Directorio de puntos y servicios públicos |
| `area:data` | Ingesta, fuentes, taxonomía, importación |
| `area:offline` | Modo offline, sincronización |
| `area:repo` | Infraestructura del repo, CI, configuración |

Si un issue toca varias áreas, añade todas las que apliquen.

### Prioridad

| Label | Significado |
|-------|-------------|
| `P0` | Bloqueante o crítico en producción |
| `P1` | Alta prioridad, próximo sprint |
| `P2` | Backlog normal |

### Estado (uso de agentes)

| Label | Cuándo |
|-------|--------|
| `in-progress` | Reclamado por un agente o colaborador activo — ver protocolo en `AGENTS.md` |

## Pull requests

- Abre el PR contra `main`
- Incluye `Closes #NN` en la descripción cuando corresponda
- Usa la plantilla de PR (`.github/pull_request_template.md`)
- No subas cambios sin pasar el **gate mínimo** del área tocada (ver `AGENTS.md`)

**Ejemplo de descripción mínima:**

```
## Resumen

Añade phone opcional al registro y un endpoint PATCH /auth/me para editarlo.

## Validación

- [x] Pasé el gate que toca para esta zona del repo
- [x] Verifiqué el comportamiento manualmente
- [x] Actualicé docs, migraciones o cliente API si correspondía

## Cierre

- Closes #205
```

## Referencias

- `AGENTS.md` — reglas canónicas del repo, gate de CI y protocolo de agentes paralelos
- `README.md` — arquitectura y arranque local
- `AGENTS.md` para reglas canónicas del repo
- `README.md` para arquitectura y arranque local
- `docs/DEFINITION_OF_DONE.md` — DoD compartida para features y épicas
