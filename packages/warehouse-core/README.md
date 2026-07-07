# @globalemergency/warehouse-core

Núcleo reutilizable de **gestión de almacén** (dominio puro). Es el paquete
compartido entre **ResponseGrid** (que lo embebe como funcionalidad interna de
sus centros logísticos) y el futuro **WMS standalone** de Global Emergency.

> Estado: **precursor in-monorepo**. Vive dentro de este monorepo y se consume
> vía `workspace:*`; se extraerá a su propio repo OSS más adelante. Ver épica
> [#355](https://github.com/GlobalEmergency/ResponseGrid/issues/355).

## Principios

- **Dominio puro.** Sin NestJS, sin Drizzle/`pg`, sin infraestructura. La
  persistencia y el HTTP los pone cada host.
- **Agnóstico de tenencia.** El núcleo no sabe qué es una emergencia ni una
  Protección Civil: opera contra ids opacos (`ownerId`/`actorId` en módulos
  posteriores).
- **Dependencia unidireccional.** Este paquete **nunca** importa de `apps/*`.
  Los hosts importan de aquí, no al revés.
- **Módulos internos** vía *subpath exports* (`/kernel`, y en el futuro
  `/catalog`, `/inventory`, `/containers`, `/logistics`). Se dividen en paquetes
  independientes solo ante una necesidad real.

## Módulos

| Import | Contenido |
| --- | --- |
| `@globalemergency/warehouse-core/kernel` | `SupplyLine` (value object de línea de material), `Category` (taxonomía canónica), `CategoryDefinition`. |
| `@globalemergency/warehouse-core/catalog` | Catálogo `Supply` (insumos, master data), resolvers de texto→id (`SupplyResolver`, `CategoryResolver`), alias/normalización y ports de catálogo. |

## Build

Doble build para poder ser consumido tanto por CommonJS (la API NestJS de
ResponseGrid) como por ESM (web / WMS standalone):

```bash
pnpm --filter @globalemergency/warehouse-core build   # emite dist/cjs y dist/esm
```
