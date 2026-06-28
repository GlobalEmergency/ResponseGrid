# Despliegue en AWS (capa gratuita)

Stack: **web en Vercel** (gratis) + **API + Postgres + Redis en una EC2 t3.micro** (free tier 12 meses) + **ficheros en S3** (5 GB gratis). HTTPS automático con Caddy.

```
Navegador ──► Vercel (Next.js)
                  │  HTTPS
                  ▼
            api.tudominio.com  ──►  EC2 t3.micro
                                     ├─ Caddy (TLS)
                                     ├─ API (NestJS)         ──► S3 (ficheros)
                                     ├─ Postgres (volumen)
                                     └─ Redis
```

> **Coste:** 0 € durante 12 meses (EC2/S3 free tier). Después, ~7-9 $/mes la t3.micro + céntimos de S3. El web en Vercel es gratis siempre.
>
> **Nota:** la instancia en producción se subió a **t3.small** (2 GB) para dar holgura al **agente de observabilidad (Datadog)** — ver [`deploy/datadog.md`](../../deploy/datadog.md). La **t3.micro** sigue valiendo para un despliegue mínimo sin Datadog.

**Necesitas:** una cuenta AWS, un **dominio** (para el HTTPS del API; vale un subdominio `api.tudominio.com`), y acceso al repo privado.

---

## A. S3 + rol IAM para la EC2

1. **Crea un bucket S3** (privado), p. ej. `responsegrid-uploads-tuid`, en tu región (p. ej. `eu-west-1`).
2. **Crea un rol IAM para EC2** (`Trusted entity: EC2`) con una política que permita solo ese bucket:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
       "Resource": "arn:aws:s3:::responsegrid-uploads-tuid/*"
     }]
   }
   ```
   Llámalo p. ej. `responsegrid-ec2`. Así la EC2 accede a S3 **sin claves estáticas**.

## B. Lanzar la EC2 t3.micro

1. **EC2 → Launch instance:**
   - AMI: **Ubuntu Server 22.04/24.04 LTS** · Tipo: **t3.micro** (free tier).
   - Key pair: crea/usa una para SSH.
   - **IAM instance profile:** el rol `responsegrid-ec2` del paso A.
   - **Security group:** SSH (22) **solo desde tu IP**; HTTP (80) y HTTPS (443) desde cualquier sitio.
   - **Advanced → User data:** pega el contenido de [`deploy/user-data.sh`](../../deploy/user-data.sh) (instala Docker, Compose y swap de 2 GB).
2. **Importante para el rol IAM dentro de Docker** — sube el *hop limit* de IMDS a 2 (si no, el contenedor no ve el rol):
   ```bash
   aws ec2 modify-instance-metadata-options --instance-id i-XXXX \
     --http-tokens required --http-put-response-hop-limit 2
   ```
3. **Elastic IP:** asigna una IP elástica y asóciala a la instancia (gratis mientras esté asociada a una instancia en marcha). Te da una IP fija.

## C. DNS

Crea un registro **A**: `api.tudominio.com` → la IP elástica. (Espera a que propague.)

## D. Desplegar en la EC2

```bash
ssh ubuntu@api.tudominio.com

# Clona el repo privado (usa una deploy key de solo lectura o un PAT).
#  Deploy key: ssh-keygen -t ed25519 -f ~/.ssh/responsegrid -N "" && cat ~/.ssh/responsegrid.pub
#  → añádela en GitHub: repo → Settings → Deploy keys → Add (read-only).
git clone git@github.com:GlobalEmergency/ResponseGrid.git
cd ResponseGrid

# Configura el entorno
cp deploy/.env.example deploy/.env
nano deploy/.env      # rellena POSTGRES_PASSWORD, JWT_SECRET (openssl rand -hex 32),
                      # FRONTEND_URL (tu URL de Vercel), S3_BUCKET, AWS_REGION, API_DOMAIN…

# Arranca todo (build + migraciones automáticas + HTTPS)
docker compose -f deploy/docker-compose.prod.yml up -d --build
docker compose -f deploy/docker-compose.prod.yml logs -f api
```

Las **migraciones se aplican solas** (servicio `migrate`, idempotente). Caddy pide el certificado TLS para `API_DOMAIN` automáticamente. Comprueba: `https://api.tudominio.com/docs` (Swagger).

**Datos iniciales (opcional):** el esquema lo crean las migraciones. Para un usuario admin / datos demo, ejecuta los `apps/api/scripts/seed-*.ts` apuntando `DATABASE_URL` a tu Postgres (p. ej. con un túnel SSH desde tu máquina con el repo), o crea una cuenta por `/signup` y promuévela a admin. *(Los seeds crean usuarios demo — no los uses en producción real.)*

## E. Web en Vercel

1. **Importa el repo** en Vercel.
2. **Root Directory:** `apps/web`.
3. **Build Command** (override): `pnpm --filter @reliefhub/api-client build && next build`.
4. **Environment Variables:**
   - `API_URL` = `https://api.tudominio.com`
   - `NEXT_PUBLIC_API_URL` = `https://api.tudominio.com`
   - `COOKIE_SECURE` = `true`
   - (`DEMO_MODE` **sin definir** en producción)
5. Deploy. Copia la URL resultante (`https://tu-app.vercel.app`).
6. **Cierra el círculo CORS:** pon esa URL en `FRONTEND_URL` de `deploy/.env` en la EC2 y reinicia la API:
   ```bash
   docker compose -f deploy/docker-compose.prod.yml up -d api
   ```

## F. Actualizar

```bash
cd ResponseGrid && git pull
docker compose -f deploy/docker-compose.prod.yml up -d --build
```
(Las migraciones nuevas se aplican solas en el arranque.)

---

## Notas / límites del free tier

- **EC2/RDS/ElastiCache son free 12 meses**, no permanente. Aquí usamos solo EC2 (los otros no) → tras 12 meses, ~7-9 $/mes.
- **1 GiB de RAM** es justo para Node+Postgres+Redis → el `user-data` añade 2 GB de swap. Suficiente para demo / tráfico bajo; para producción seria, sube a `t3.small` o separa Postgres a RDS.
- **S3 free tier:** 5 GB + 20k GET + 2k PUT al mes (12 meses).
- **Credenciales S3:** preferimos el rol IAM (sin claves en disco). Si no puedes usar rol, pon `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` en `deploy/.env`.
- **OAuth (Google/Facebook):** opcional. Rellena las claves y `OAUTH_CALLBACK_BASE=https://api.tudominio.com` si lo quieres.
