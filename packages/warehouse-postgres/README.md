# @globalemergency/warehouse-postgres

Adaptador de **persistencia Postgres/Drizzle** para
[`@globalemergency/warehouse-core`](../warehouse-core). Es la capa "con pilas":
el schema, los repos y las migraciones del WMS viven aquí, para que ResponseGrid
y el WMS standalone compartan la persistencia **una sola vez** en vez de
reimplementarla.

> Estado: **precursor in-monorepo**. Contiene (a) las columnas Drizzle y los
> mappers de la línea de material (`SupplyLine`) y (b) la persistencia del módulo
> `inventory` de warehouse-core sobre el esquema dedicado `wms.` (almacenes,
> zonas, ubicaciones, stock y su libro mayor) con runner de migraciones propio.
> Ver épica [#355](https://github.com/GlobalEmergency/ResponseGrid/issues/355).

## Principios

- Es la capa **infra**: a diferencia de `warehouse-core` (dominio puro), aquí
  Drizzle es de primera clase.
- `drizzle-orm` es una **peerDependency**: el host aporta la instancia, para que
  los column builders compartan la misma instancia de Drizzle que el `pgTable`
  del consumidor (evita el problema de doble instancia).
- **Dependencia unidireccional:** nunca importa de `apps/*`.

## Contenido

Raíz (`.`) — línea de material:

| Export | Uso |
| --- | --- |
| `supplyLineColumns(supplyIdColumn?)` | Factory de las columnas compartidas de una línea de material; se hace *spread* en cada tabla `*_items`. |
| `SupplyLineRow`, `rowToSupplyLineSnapshot`, `supplyLineToColumns` | Mapeo fila persistida ⇄ `SupplyLineSnapshot` del dominio. |

Subpath `./inventory` — persistencia del WMS (esquema `wms.`):

| Export | Uso |
| --- | --- |
| `migrateWms(pool, migrationsDir?)` | Runner idempotente que aplica `migrations/wms_*.sql` en orden, rastreándolos en `wms."_migrations"`. Seguro de re-ejecutar. |
| `DrizzleWarehouseRepository` | Puerto `WarehouseRepository`: upsert del almacén + reemplazo de sus zonas (agregado completo) en transacción. |
| `DrizzleBinRepository` | Puerto `BinRepository`: upsert + finders por id/código/almacén/scope. |
| `DrizzleStockItemRepository` | Puerto `StockItemRepository`: alta (INSERT) / actualización con **concurrencia optimista** por `version`; grano único garantizado por índices parciales. Lanza `StaleStockItemError` ante un update obsoleto. |
| `DrizzleStockMovementRepository` | Puerto `StockMovementRepository`: libro mayor **append-only** con **idempotencia** por `(scope_id, idempotency_key)`. |
| `warehousesTable`, `zonesTable`, `binsTable`, `stockItemsTable`, `stockMovementsTable`, `wms` | Tablas Drizzle del esquema `wms.` y el `pgSchema`. |
| `StaleStockItemError` | Choque de concurrencia optimista al persistir un `StockItem`. |

La columna de tenencia es `scope_id` (uuid opaco), **no** `emergency_id`: el
paquete es agnóstico del sector. Los repos reciben un `NodePgDatabase`
(`drizzle-orm/node-postgres`) por constructor.

## Build y tests

```bash
pnpm --filter @globalemergency/warehouse-postgres build       # dual CJS+ESM
pnpm --filter @globalemergency/warehouse-postgres typecheck
pnpm --filter @globalemergency/warehouse-postgres test:int    # integración; requiere Postgres
```

Los tests de integración usan `node:test` + `pg` contra un Postgres real
(`TEST_DATABASE_URL`, por defecto `postgres://reliefhub:reliefhub@localhost:5434/reliefhub`).
Antes de cada suite hacen `DROP SCHEMA wms CASCADE` + `migrateWms`, de modo que
las ejecuciones son repetibles. `consumer-validation.test.ts` es la **prueba de
reutilización**: ejercita dominio + persistencia de punta a punta importando
sólo `@globalemergency/warehouse-core` + esta librería (nunca `apps/*`).
