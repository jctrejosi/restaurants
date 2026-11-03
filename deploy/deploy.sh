#!/usr/bin/env bash
# ============================================================
# Despliegue de producción de Restaurantes (Punto C) en el VPS
# (Windows + WSL Ubuntu + Docker).
#
# Uso:
#   bash deploy/deploy.sh                 # despliega origin/dev
#   bash deploy/deploy.sh <sha|ref>       # despliega un commit/ref concreto
#   DEPLOY_PATH=/ruta bash deploy/deploy.sh
#
# Lo usan GitHub Actions (runner self-hosted) y el operador a mano.
# Es idempotente: deja el checkout en `dev`, reconstruye la imagen, recrea
# la app y espera a que el healthcheck quede `healthy`.
#
# NO toca docker/.env ni el volumen de PostgreSQL.
# ============================================================
set -Eeuo pipefail

ROOT="${DEPLOY_PATH:-/home/deploy/restaurants}"
TARGET="${1:-origin/dev}"
COMPOSE_FILE="$ROOT/docker/docker-compose.yml"
ENV_FILE="$ROOT/docker/.env"
APP_CONTAINER="restaurants_app"
EDGE_CONTAINER="edge_caddy"
PUBLIC_HOST="${PUBLIC_HOST:-restaurant.jcti.xyz}"
PUBLIC_HEALTH_URL="${PUBLIC_HEALTH_URL:-https://${PUBLIC_HOST}/api/health}"

timestamp() { date '+%Y-%m-%d %H:%M:%S'; }
log()  { printf '[deploy %s] %s\n' "$(timestamp)" "$*"; }
warn() { printf '[deploy %s] AVISO: %s\n' "$(timestamp)" "$*" >&2; }
die()  { printf '[deploy %s] ERROR: %s\n' "$(timestamp)" "$*" >&2; exit 1; }

cd "$ROOT" 2>/dev/null || die "No existe DEPLOY_PATH=$ROOT"
[[ -f "$COMPOSE_FILE" ]] || die "Falta $COMPOSE_FILE"
[[ -f "$ENV_FILE" ]]     || die "Falta $ENV_FILE (cópialo de docker/.env.example o ejecuta node prod.js una vez)"
command -v git    >/dev/null || die "git no está instalado"
command -v docker >/dev/null || die "docker no está en PATH"
docker info >/dev/null 2>&1 || die "Docker no responde (revisa systemctl status docker)"

# El .git/config del checkout puede apuntar al ssh.exe de Windows (heredado),
# que no existe dentro de WSL. Si hay clave de despliegue, se usa solo para
# este proceso.
GIT_SSH_KEY="${GIT_SSH_KEY:-/etc/mercaldas/deploy_key}"
if [[ -r "$GIT_SSH_KEY" ]]; then
  export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -i $GIT_SSH_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new}"
fi

# El checkout puede pertenecer a otro usuario de Windows; se marca como
# confiable solo para estos comandos y se desactivan hooks (p. ej. LFS).
git_here() {
  git -c safe.directory="$ROOT" -c core.hooksPath=/nonexistent -C "$ROOT" "$@"
}

log "Repositorio: $ROOT"
log "Objetivo   : $TARGET"

git_here fetch --prune origin '+refs/heads/dev:refs/remotes/origin/dev'
git_here rev-parse --verify --quiet "$TARGET^{commit}" >/dev/null \
  || die "El commit/ref '$TARGET' no existe tras el fetch"

# Checkout determinista: descarta cambios locales en archivos versionados
# (en producción no se editan a mano); los archivos ignorados (.env, datos)
# no se tocan.
git_here checkout -f -B dev "$TARGET"
COMMIT="$(git_here rev-parse --short=12 HEAD)"
SUBJECT="$(git_here log -1 --pretty=%s)"
log "Checkout en dev: $COMMIT — $SUBJECT"

# Valida compose + .env antes de construir.
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet \
  || die "docker compose config falló (revisa $ENV_FILE)"

log "Construyendo imagen restaurants/app:latest…"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build app

log "Levantando/actualizando la app (la BD se conserva)…"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

log "Esperando healthcheck de $APP_CONTAINER…"
STATUS=""
for _ in $(seq 1 90); do
  STATUS="$(docker inspect -f \
    '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
    "$APP_CONTAINER" 2>/dev/null || true)"
  case "$STATUS" in
    healthy)
      log "Contenedor healthy."
      break
      ;;
    unhealthy|exited|dead)
      docker logs --tail 150 "$APP_CONTAINER" 2>&1 || true
      die "El contenedor quedó en estado '$STATUS'."
      ;;
  esac
  sleep 5
done

if [[ "$STATUS" != "healthy" ]]; then
  docker logs --tail 150 "$APP_CONTAINER" 2>&1 || true
  die "Timeout esperando healthy (último estado: '${STATUS:-desconocido}')."
fi

# El edge es de otro proyecto (ecommerce). Se avisa si no está o no publica
# este host, pero no se modifica desde aquí.
if docker inspect "$EDGE_CONTAINER" >/dev/null 2>&1; then
  if ! docker exec "$EDGE_CONTAINER" cat /etc/caddy/Caddyfile 2>/dev/null \
      | grep -q "$APP_CONTAINER"; then
    warn "El Caddyfile de $EDGE_CONTAINER no menciona $APP_CONTAINER."
    warn "Actualiza el repo ecommerce (docker/edge/Caddyfile) y reinicia el edge."
  fi
else
  warn "No existe $EDGE_CONTAINER: nadie publica 80/443."
fi

# Comprobación de punta a punta por el edge (TLS + DNS).
if command -v curl >/dev/null 2>&1 && docker inspect "$EDGE_CONTAINER" >/dev/null 2>&1; then
  if curl -fsS --max-time 15 --cacert /etc/mercaldas/edge-tls/origin.pem --resolve "${PUBLIC_HOST}:443:127.0.0.1" \
      "$PUBLIC_HEALTH_URL" >/dev/null 2>&1; then
    log "HTTPS público OK: $PUBLIC_HEALTH_URL"
  else
    warn "El contenedor está sano, pero $PUBLIC_HEALTH_URL no respondió por el edge."
    warn "Revisa DNS A → IP pública, el Caddyfile del edge y docker logs $EDGE_CONTAINER."
  fi
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
log "Despliegue completado: $COMMIT"
