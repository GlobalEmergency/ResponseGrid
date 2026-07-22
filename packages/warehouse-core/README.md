# @globalemergency/warehouse-core

Núcleo de dominio **puro** de un sistema de gestión de almacén (WMS). Es el
**motor reutilizable de [OpenDepot](https://github.com/GlobalEmergency/opendepot)**
— el WMS open-source pensado para Protección Civil y ayuda humanitaria, válido
para cualquier sector. Lo consumen la app OpenDepot y
[ResponseGrid](https://responsegrid.app).

Sin NestJS, sin Drizzle/`pg`, sin red ni disco: solo agregados, value objects y
servicios de dominio. La persistencia y el HTTP los pone cada host — ver
[`@globalemergency/warehouse-postgres`](https://www.npmjs.com/package/@globalemergency/warehouse-postgres).

## Instalación

```bash
pnpm add @globalemergency/warehouse-core
```

## Principios

- **Dominio puro.** Nunca importa infraestructura ni `apps/*`; los hosts importan
  de aquí, no al revés.
- **Agnóstico de tenencia.** Opera contra un `ScopeId` **opaco**: el host traduce
  su identidad de tenant (organización, emergencia, centro…) a un `ScopeId` en la
  frontera. El paquete no conoce auth ni permisos.
- **Módulos internos** vía _subpath exports_; se dividirían en paquetes propios
  solo ante una necesidad real (OCP/DIP).

## Módulos

| Import           | Qué contiene                                                                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.../kernel`     | `ScopeId`, `SupplyLine`, `Category`/`CategorySlug`/`CategoryRegistry`, `Capacity`, `DomainEvent`                                                                                    |
| `.../catalog`    | `Supply` (maestro de insumos), resolvers texto→id, alias/normalización y puertos                                                                                                    |
| `.../inventory`  | `Warehouse`/`Zone`/`Bin`, `StockItem`, `StockMovement` (kardex + `actorId`), FEFO, reservas, recuentos, caducidad, `LoadTemplate` + `gapAnalysis`, capacidad/manifiesto de vehículo |
| `.../containers` | `Container` (palet/caja/lote) y su holder polimórfico                                                                                                                               |
| `.../logistics`  | `TransportCapacity`, `Shipment` (con `vehicleId`, modos excluyentes), matching                                                                                                      |

## Uso mínimo

```ts
import {
  Warehouse,
  WarehouseId,
} from '@globalemergency/warehouse-core/inventory';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';

const scopeId = ScopeId.create(); // el host mapea su tenant a un ScopeId opaco

const warehouse = Warehouse.create({
  id: WarehouseId.create(),
  scopeId,
  code: 'ALM-CENTRAL',
  name: 'Almacén Central',
  zones: [],
});

// Los agregados son inmutables y exponen snapshots para persistir:
const snapshot = warehouse.toSnapshot();
```

## Build

```bash
pnpm --filter @globalemergency/warehouse-core build   # dual CJS + ESM
pnpm --filter @globalemergency/warehouse-core test    # node --test sobre JS compilado
```

## Licencia

**AGPL-3.0-only.** Las obras derivadas —incluidos los despliegues en red/SaaS
modificados— deben permanecer open source bajo la misma licencia. Ver
[`LICENSE`](./LICENSE).
