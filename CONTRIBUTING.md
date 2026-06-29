# Contributing to ResponseGrid

ResponseGrid trabaja en español y sigue un flujo simple: abrir issue, enlazar PR, pasar CI y fusionar por squash.

## Branches

- `feature/NN-resumen-corto` para features
- `fix/NN-resumen-corto` para bugs
- `docs/NN-resumen-corto` para documentación

Usa el número de issue en la rama siempre que exista.

## Commits

- Usa mensajes convencionales: `feat:`, `fix:`, `docs:`, `chore:`
- Añade un scope cuando ayude: `feat(api): ...`
- No incluyas `Co-authored-by` ni referencias a Claude o al modelo

## Labels

La taxonomía del repo es:

- `epic`, `feature`, `task`, `docs`
- `area:*`
- prioridad `P0`, `P1`, `P2`

Si un issue nuevo no encaja, triágialo antes de implementarlo.

## Pull requests

- Abre el PR contra `main`
- Incluye `Closes #NN` en la descripción cuando corresponda
- Usa la plantilla de PR
- No subas cambios sin pasar el gate mínimo del área tocada

## Referencias

- `AGENTS.md` para reglas canónicas del repo
- `README.md` para arquitectura y arranque local
- `docs/features/` para el backlog funcional
- `docs/DEFINITION_OF_DONE.md` — DoD compartida para features y épicas
