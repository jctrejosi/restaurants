#!/usr/bin/env bash
# ============================================================
# Arranque del contenedor de Restaurantes.
#   1. Genera el Caddyfile interno desde las variables HOST_*.
#   2. Espera a PostgreSQL y aplica migraciones + seed (idempotentes).
#   3. Lanza el backend NestJS en 127.0.0.1:3001.
#   4. Lanza Caddy en :8080 (routing por Host hacia las SPAs y /api).
#
# Si cualquiera de los dos procesos muere, el contenedor termina y Docker lo
# reinicia (restart: unless-stopped).
# ============================================================
set -Eeuo pipefail

cd /app

log() { printf '[entrypoint] %s\n' "$*"; }

log "Generando Caddyfile…"
node ./gen-caddyfile.mjs

if [[ "${RUN_DB_MIGRATIONS:-1}" == "1" ]]; then
  DB_HOST="${DB_HOST:-restaurants_prod_postgres}"
  DB_PORT="${DB_PORT:-5432}"

  log "Esperando PostgreSQL en ${DB_HOST}:${DB_PORT}…"
  ready=0
  for _ in $(seq 1 60); do
    if (echo >"/dev/tcp/${DB_HOST}/${DB_PORT}") >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 2
  done
  if [[ "$ready" != "1" ]]; then
    log "ERROR: PostgreSQL no respondió en 120s (${DB_HOST}:${DB_PORT})."
    exit 1
  fi

  log "Aplicando migraciones…"
  (
    cd /app/backend
    ./node_modules/.bin/drizzle-kit migrate
  )

  log "Aplicando seed idempotente…"
  (
    cd /app/backend
    ./node_modules/.bin/ts-node scripts/seed.ts
  )
else
  log "RUN_DB_MIGRATIONS=${RUN_DB_MIGRATIONS}: se omiten migraciones y seed."
fi

log "Iniciando backend…"
(
  cd /app/backend
  exec node dist/src/main.js
) &
BACKEND_PID=$!

log "Iniciando Caddy en :${HTTP_PORT:-8080}…"
caddy run --config "${CADDYFILE_OUT:-/tmp/Caddyfile}" --adapter caddyfile &
CADDY_PID=$!

shutdown() {
  log "Deteniendo servicios…"
  kill -TERM "$BACKEND_PID" "$CADDY_PID" 2>/dev/null || true
}
trap shutdown TERM INT

set +e
wait -n "$BACKEND_PID" "$CADDY_PID"
status=$?
set -e

log "Un proceso terminó (código $status); cerrando el contenedor."
shutdown
exit "$status"
