# Producción actual: srv07 (Plesk + Docker)

La API corre en **srv07** (`srv07.ingenierosweb.co`), no en AWS. La guía de
[`aws-free-tier.md`](aws-free-tier.md) sigue siendo válida como alternativa
autocontenida, pero no describe el despliegue vivo.

```
responsegrid.app (Vercel)  ──►  responsegrid-api.globalemergency.online
                                        │  nginx de Plesk (TLS wildcard)
                                        ▼
                                127.0.0.1:3100  →  contenedor api
                                                    postgres · redis
```

## Diferencias con el stack de la EC2

| | EC2 (`docker-compose.prod.yml`) | srv07 (`docker-compose.srv07.yml`) |
|---|---|---|
| TLS y reverse proxy | Caddy en 80/443 | nginx de Plesk, la API solo escucha en `127.0.0.1:3100` |
| Datadog | contenedor `datadog/agent:7` propio | agente del host, trazas a `DD_AGENT_HOST` (gateway de docker0) |
| Credenciales de S3 | rol de instancia EC2 | usuario IAM con claves en `deploy/.env` |
| Arranque | `responsegrid.service` | igual, desde `deploy/responsegrid.srv07.service` |

El proyecto de compose se llama `responsegrid` (`-p responsegrid`) para no
colisionar con los demás stacks del servidor.

## Despliegue

Push a `main` → [`deploy.yml`](../../.github/workflows/deploy.yml) entra por SSH
a srv07. La clave `SRV07_DEPLOY_KEY` está atada a un *forced command* en
`/root/.ssh/authorized_keys`, así que solo puede ejecutar
`/usr/local/sbin/responsegrid-deploy`, que hace:

1. `git fetch` + `git reset --hard origin/main`
2. escribe `deploy/.env.version` con el sha corto (etiqueta `DD_VERSION`)
3. instala y habilita la unit de systemd
4. `docker compose -p responsegrid -f deploy/docker-compose.srv07.yml up -d --build`
   (el servicio `migrate` aplica las migraciones pendientes antes de arrancar la API)
5. health check contra `http://127.0.0.1:3100/emergencies`; si no responde 200
   en 2 minutos, falla el deploy y vuelca los logs de la API

Secretos del repo: `SRV07_HOST`, `SRV07_USER`, `SRV07_DEPLOY_KEY`.

## Operación manual

```bash
cd /opt/responsegrid
docker compose -p responsegrid -f deploy/docker-compose.srv07.yml ps
docker compose -p responsegrid -f deploy/docker-compose.srv07.yml logs api --tail 50
/usr/local/sbin/responsegrid-deploy     # el mismo deploy, a mano
```

Backup diario de Postgres en `/etc/cron.daily/responsegrid-backup` →
`/var/backups/responsegrid`, retención 14 días.
