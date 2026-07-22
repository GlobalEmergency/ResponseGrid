# @globalemergency/warehouse-postgres

Adaptador de **persistencia Postgres/Drizzle** para
[`@globalemergency/warehouse-core`](https://www.npmjs.com/package/@globalemergency/warehouse-core).
Es la capa "con pilas" (schema, repos y migraciones del WMS) — el **motor de
persistencia de [OpenDepot](https://github.com/GlobalEmergency/opendepot)**, para
que cualquier host comparta la persistencia **una sola vez** en vez de
reimplementarla.

## Instalación

```bash
pnpm add @globalemergency/warehouse-postgres @globalemergency/warehouse-core drizzle-orm
```

`drizzle-orm` es una **peerDependency**: el host aporta la instancia (evita el
problema de doble instancia de Drizzle). Los repos reciben un `NodePgDatabase`
(`drizzle-orm/node-postgres`) por constructor.

## Principios

- Es la capa **infra**: a diferencia de `warehouse-core` (dominio puro), aquí
  Drizzle es de primera clase.
- `drizzle-orm` es una **peerDependency**: el host aporta la instancia, para que
  los column builders compartan la misma instancia de Drizzle que el `pgTable`
  del consumidor (evita el problema de doble instancia).
- **Dependencia unidireccional:** nunca importa de `apps/*`.

## Contenido

Raíz (`.`) — línea de material:

| Export                                                            | Uso                                                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `supplyLineColumns(supplyIdColumn?)`                              | Factory de las columnas compartidas de una línea de material; se hace _spread_ en cada tabla `*_items`. |
| `SupplyLineRow`, `rowToSupplyLineSnapshot`, `supplyLineToColumns` | Mapeo fila persistida ⇄ `SupplyLineSnapshot` del dominio.                                               |

Subpath `./inventory` — persistencia del WMS (esquema `wms.`):

| Export                                                                                                                                    | Uso                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `migrateWms(pool, migrationsDir?)`                                                                                                        | Runner idempotente que aplica `migrations/wms_*.sql` en orden, rastreándolos en `wms."_migrations"`. Seguro de re-ejecutar.                                                                                   |
| `DrizzleWarehouseRepository`                                                                                                              | Puerto `WarehouseRepository`: upsert del almacén + reemplazo de sus zonas (agregado completo) en transacción.                                                                                                 |
| `DrizzleBinRepository`                                                                                                                    | Puerto `BinRepository`: upsert + finders por id/código/almacén/scope.                                                                                                                                         |
| `DrizzleStockItemRepository`                                                                                                              | Puerto `StockItemRepository`: alta (INSERT) / actualización con **concurrencia optimista** por `version`; grano único garantizado por índices parciales. Lanza `StaleStockItemError` ante un update obsoleto. |
| `DrizzleStockMovementRepository`                                                                                                          | Puerto `StockMovementRepository`: libro mayor **append-only** con **idempotencia** por `(scope_id, idempotency_key)` y `actorId` (cadena de custodia).                                                        |
| `DrizzleContainerRepository`                                                                                                              | Puerto `ContainerRepository`: palets/cajas con self-FK de composición y allocator monotónico de código.                                                                                                       |
| `DrizzleLoadTemplateRepository`                                                                                                           | Puerto `LoadTemplateRepository`: kits de misión (raíz + líneas hijas) con upsert transaccional.                                                                                                               |
| `runInWmsTransaction(db, work)`                                                                                                           | **UnitOfWork**: ejecuta `work(uow)` con todos los repos ligados a una misma transacción (traslados atómicos).                                                                                                 |
| `warehousesTable`, `zonesTable`, `binsTable`, `stockItemsTable`, `stockMovementsTable`, `containersTable`, `loadTemplatesTable`, …, `wms` | Tablas Drizzle del esquema `wms.` y el `pgSchema`.                                                                                                                                                            |
| `StaleStockItemError`                                                                                                                     | Choque de concurrencia optimista al persistir un `StockItem`.                                                                                                                                                 |

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

## Licencia

**AGPL-3.0-only.** Las obras derivadas —incluidos los despliegues en red/SaaS
modificados— deben permanecer open source bajo la misma licencia. Ver
[`LICENSE`](./LICENSE).
