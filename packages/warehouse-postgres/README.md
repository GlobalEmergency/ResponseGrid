# @globalemergency/warehouse-postgres

Adaptador de **persistencia Postgres/Drizzle** para
[`@globalemergency/warehouse-core`](../warehouse-core). Es la capa "con pilas":
el schema, los repos y (en el futuro) las migraciones del WMS viven aquí, para
que ResponseGrid y el WMS standalone compartan la persistencia **una sola vez**
en vez de reimplementarla.

> Estado: **precursor in-monorepo**. Primer contenido: las columnas Drizzle y
> los mappers de la línea de material (`SupplyLine`). Ver épica
> [#355](https://github.com/GlobalEmergency/ResponseGrid/issues/355).

## Principios

- Es la capa **infra**: a diferencia de `warehouse-core` (dominio puro), aquí
  Drizzle es de primera clase.
- `drizzle-orm` es una **peerDependency**: el host aporta la instancia, para que
  los column builders compartan la misma instancia de Drizzle que el `pgTable`
  del consumidor (evita el problema de doble instancia).
- **Dependencia unidireccional:** nunca importa de `apps/*`.

## Contenido

| Export | Uso |
| --- | --- |
| `supplyLineColumns(supplyIdColumn?)` | Factory de las columnas compartidas de una línea de material; se hace *spread* en cada tabla `*_items`. |
| `SupplyLineRow`, `rowToSupplyLineSnapshot`, `supplyLineToColumns` | Mapeo fila persistida ⇄ `SupplyLineSnapshot` del dominio. |

## Build

```bash
pnpm --filter @globalemergency/warehouse-postgres build   # dual CJS+ESM
```
