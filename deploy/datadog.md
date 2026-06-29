# Datadog en producción (EC2 all-in-one)

Agente Datadog **lean** para depurar el servidor, la base de datos y los servicios.
Corre como un servicio más del stack (`datadog` en `deploy/docker-compose.prod.yml`).

## Qué monitoriza

- **Host** — CPU, RAM, disco, carga, red (la EC2 t3.small).
- **Contenedores** — CPU/memoria/estado de cada contenedor (vía `/var/run/docker.sock`).
- **Postgres** — conexiones, locks, tamaño de BD, transacciones (integración `postgres` por Autodiscovery; usuario de solo lectura `datadog` con rol `pg_monitor`).
- **Redis** — memoria, ops, clientes (integración `redisdb` por Autodiscovery).
- **Logs** — de **todos** los contenedores (API, Postgres, Redis, Caddy) → ver errores en vivo.
- **APM / trazas** — peticiones de la API instrumentadas con `dd-trace`: latencia y errores por endpoint, con spans de Postgres y Redis. Cada span lleva método, ruta, status, user-agent e **IP del cliente** (`DD_TRACE_CLIENT_IP_ENABLED`, leída del `X-Forwarded-For` de Caddy).
- **Access logs** — una línea JSON por petición (middleware `http-logger.middleware.ts`), con los **atributos estándar de Datadog** para que caigan en los facets y pipelines out-of-the-box **sin crear facets custom**: `status`, `http.method`, `http.status_code`, `http.url`, `http.useragent`, `http.referer`, `network.client.ip` (dispara el GeoIP → país/ciudad), `network.bytes_written`, `duration` (en ns), y `dd.trace_id`/`dd.span_id` para saltar del log a su traza APM. Se escribe directo a stdout (el `ConsoleLogger` json anidaría todo bajo `message.*` y rompería el mapeo estándar). **No** registra bodies ni cabeceras de auth (contraseñas/PII). El IP real depende de `trust proxy` en `main.ts` (un único salto de Caddy).

## Decisiones (caja pequeña)

- **Sitio: EU** (`DD_SITE=datadoghq.eu`).
- **APM activado** (`DD_APM_ENABLED=true` + `DD_APM_NON_LOCAL_TRAFFIC=true`); la API envía trazas al agente (`DD_AGENT_HOST=datadog`, puerto 8126). **process-agent desactivado**. `mem_limit: 768m`.
- **DBM (query-level) activado** — Postgres arranca con `shared_preload_libraries=pg_stat_statements` y el rol `datadog` tiene el esquema/función de explain. Setup más abajo.

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

## DBM (query-level) — setup

1. El servicio `postgres` del compose arranca con
   `command: ["postgres","-c","shared_preload_libraries=pg_stat_statements","-c","track_activity_query_size=4096","-c","pg_stat_statements.track=all"]`
   y la label de Autodiscovery lleva `"dbm":true`.
2. Una vez desplegado (el cambio de `command` recrea Postgres, ~10 s de corte):
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
