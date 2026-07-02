#!/bin/sh
# Idempotent migration runner. Applies each apps/api/drizzle/*.sql once,
# tracked in a _migrations table, in filename order (0001, 0002, …).
# Safe to re-run on every `docker compose up`.
set -e

export PGPASSWORD="$POSTGRES_PASSWORD"
PSQL="psql -h postgres -U $POSTGRES_USER -d $POSTGRES_DB -v ON_ERROR_STOP=1"

# Wait for Postgres (compose healthcheck already gates us, this is a belt-and-braces retry).
i=0
until $PSQL -c 'SELECT 1' >/dev/null 2>&1; do
  i=$((i + 1))
  [ "$i" -gt 30 ] && echo "postgres not reachable" && exit 1
  sleep 1
done

$PSQL -c "CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now());"

for f in /migrations/*.sql; do
  [ -e "$f" ] || continue
  name=$(basename "$f")
  # Pass the filename as a bound psql variable and quote it with :'mname' so a
  # filename containing a quote can neither break the statement nor inject SQL
  # into the _migrations table (defense-in-depth; filenames are repo-controlled).
  # NOTE: psql only performs :'var' interpolation for SQL read from stdin/-f,
  # NOT for -c strings, so the SQL is piped in (a -c form errors with
  # "syntax error at or near \":\"").
  applied=$(printf '%s' "SELECT 1 FROM _migrations WHERE name = :'mname';" \
    | $PSQL -v mname="$name" -tA)
  if [ "$applied" = "1" ]; then
    echo "skip   $name"
    continue
  fi
  echo "apply  $name"
  $PSQL -f "$f"
  printf '%s' "INSERT INTO _migrations (name) VALUES (:'mname');" \
    | $PSQL -v mname="$name"
done

echo "migrations up to date"
