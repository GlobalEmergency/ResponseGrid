# Datadog en producción (EC2 all-in-one)

Agente Datadog **lean** para depurar el servidor, la base de datos y los servicios.
Corre como un servicio más del stack (`datadog` en `deploy/docker-compose.prod.yml`).

## Qué monitoriza

- **Host** — CPU, RAM, disco, carga, red (la EC2 t3.small).
- **Contenedores** — CPU/memoria/estado de cada contenedor (vía `/var/run/docker.sock`).
- **Postgres** — conexiones, locks, tamaño de BD, transacciones (integración `postgres` por Autodiscovery; usuario de solo lectura `datadog` con rol `pg_monitor`).
- **Redis** — memoria, ops, clientes (integración `redisdb` por Autodiscovery).
- **Logs** — de **todos** los contenedores (API, Postgres, Redis, Caddy) → ver errores en vivo.

## Decisiones (caja pequeña)

- **Sitio: EU** (`DD_SITE=datadoghq.eu`).
- **APM y process-agent desactivados** (`DD_APM_ENABLED=false`, `DD_PROCESS_AGENT_ENABLED=false`) para no cargar la instancia. `mem_limit: 512m`.
- **DBM (query-level)**: pendiente como paso 2 — requiere `shared_preload_libraries=pg_stat_statements` (reinicio de Postgres) + esquema `datadog`. Ver más abajo.

## Secretos (nunca en git)

Van en `deploy/.env` del servidor (modo 600), inyectados al agente con `env_file: .env`:

- `DD_API_KEY` — API key de Datadog.
- `DD_SITE=datadoghq.eu`.
- `DD_POSTGRES_PASSWORD` — contraseña del rol `datadog` de Postgres.

Las labels de Autodiscovery leen la contraseña/BD con `%%env_DD_POSTGRES_PASSWORD%%` y
`%%env_POSTGRES_DB%%` (el agente las tiene por `env_file`), así el compose **no** lleva secretos.

## Usuario de Postgres (una vez)

```sql
CREATE ROLE datadog LOGIN PASSWORD '<DD_POSTGRES_PASSWORD>';
GRANT pg_monitor TO datadog;
```

## Verificar

```bash
# en la EC2
docker compose -f deploy/docker-compose.prod.yml ps          # 'datadog' Up
docker exec deploy-datadog-1 agent status                    # checks postgres/redisdb/docker OK
docker exec deploy-datadog-1 agent health                    # Agent health: PASS
```
En Datadog (EU): **Infrastructure → Host map** (host `responsegrid-prod`), **Integrations → Postgres/Redis**, **Logs**.

## Activar DBM (paso 2, opcional)

1. En el servicio `postgres` del compose añadir:
   `command: ["postgres","-c","shared_preload_libraries=pg_stat_statements","-c","track_activity_query_size=4096","-c","pg_stat_statements.track=all"]`
2. Desplegar (recrea Postgres, ~10 s de corte) y luego:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   CREATE SCHEMA IF NOT EXISTS datadog;
   GRANT USAGE ON SCHEMA datadog TO datadog;
   CREATE OR REPLACE FUNCTION datadog.explain_statement(l_query text, OUT explain JSON)
     RETURNS SETOF JSON AS $$ DECLARE curs REFCURSOR; plan JSON; BEGIN
     OPEN curs FOR EXECUTE pg_catalog.concat('EXPLAIN (FORMAT JSON) ', l_query);
     FETCH curs INTO plan; CLOSE curs; RETURN QUERY SELECT plan; END; $$
     LANGUAGE plpgsql RETURNS NULL ON NULL INPUT SECURITY DEFINER;
   ```
3. Añadir `"dbm":true` a la instancia `postgres` de la label de Autodiscovery.
