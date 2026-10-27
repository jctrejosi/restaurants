#!/usr/bin/env bash
# ============================================================
# Instala un runner self-hosted de GitHub Actions dentro de WSL (Ubuntu)
# para el repo de Restaurantes.
#
# Se ejecuta UNA vez, como root:
#   bash deploy/install-runner.sh <REGISTRATION_TOKEN>
#
# El token se genera en:
#   GitHub → repo jctrejosi/restaurants → Settings → Actions → Runners
#   → New self-hosted runner (Linux, x64). Caduca en ~1 hora.
#
# El runner queda como servicio systemd (usuario `ghrunner`, grupo `docker`)
# con labels `mercaldas,linux`; el workflow lo usa con:
#   runs-on: [self-hosted, linux, mercaldas]
#
# Variables opcionales:
#   REPO_URL=https://github.com/jctrejosi/restaurants
#   RUNNER_NAME=restaurants-vps
#   RUNNER_USER=ghrunner
#   RUNNER_DIR=/opt/actions-runner-restaurants
#   RUNNER_VERSION=<x.y.z>   (por defecto, la última release)
# ============================================================
set -Eeuo pipefail

TOKEN="${1:-}"
REPO_URL="${REPO_URL:-https://github.com/jctrejosi/restaurants}"
RUNNER_NAME="${RUNNER_NAME:-restaurants-vps}"
RUNNER_USER="${RUNNER_USER:-ghrunner}"
RUNNER_DIR="${RUNNER_DIR:-/opt/actions-runner-restaurants}"
RUNNER_VERSION="${RUNNER_VERSION:-}"

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
log() { printf '==> %s\n' "$*"; }

[[ -n "$TOKEN" ]] || die "Uso: bash deploy/install-runner.sh <REGISTRATION_TOKEN>"
[[ "$(id -u)" -eq 0 ]] || die "Ejecuta este script como root."
[[ -d /run/systemd/system ]] \
  || die "systemd no está activo en esta distro WSL. Habilítalo (ver docs/VPS-WINDOWS.md)."
command -v apt-get >/dev/null || die "Este instalador asume Ubuntu/Debian (apt-get)."

log "Instalando dependencias base…"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  ca-certificates curl git python3 tar

if [[ -z "$RUNNER_VERSION" ]]; then
  log "Consultando la última versión del runner…"
  RUNNER_VERSION="$(
    curl -fsSL https://api.github.com/repos/actions/runner/releases/latest \
      | python3 -c 'import json,sys; print(json.load(sys.stdin)["tag_name"].lstrip("v"))'
  )"
fi
[[ -n "$RUNNER_VERSION" ]] || die "No pude resolver RUNNER_VERSION."

if ! id "$RUNNER_USER" >/dev/null 2>&1; then
  log "Creando usuario de servicio $RUNNER_USER…"
  useradd --system --create-home --shell /bin/bash "$RUNNER_USER"
fi
install -d -m 700 -o "$RUNNER_USER" -g "$RUNNER_USER" "/home/$RUNNER_USER/.ssh"

if getent group docker >/dev/null 2>&1; then
  usermod -aG docker "$RUNNER_USER"
else
  die "No existe el grupo docker. Instala/arranca Docker primero."
fi

log "Descargando actions-runner $RUNNER_VERSION…"
TMP_TGZ="$(mktemp /tmp/actions-runner-XXXXXX.tar.gz)"
trap 'rm -f "$TMP_TGZ"' EXIT
curl -fL --retry 3 -o "$TMP_TGZ" \
  "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"

mkdir -p "$RUNNER_DIR"
tar -xzf "$TMP_TGZ" -C "$RUNNER_DIR"
chown -R "$RUNNER_USER:$RUNNER_USER" "$RUNNER_DIR"

log "Instalando dependencias del runner…"
"$RUNNER_DIR/bin/installdependencies.sh"

log "Registrando el runner en $REPO_URL…"
su -s /bin/bash "$RUNNER_USER" -c \
  "cd '$RUNNER_DIR' && ./config.sh --url '$REPO_URL' --token '$TOKEN' --name '$RUNNER_NAME' --labels 'mercaldas,linux' --unattended --replace"

log "Verificando acceso a Docker como $RUNNER_USER…"
su -s /bin/bash "$RUNNER_USER" -c "docker info >/dev/null" \
  || die "El usuario $RUNNER_USER no puede usar Docker (revisa el grupo docker)."

log "Instalando y arrancando el servicio systemd…"
cd "$RUNNER_DIR"
./svc.sh install "$RUNNER_USER"
./svc.sh start
./svc.sh status || true

log "Runner instalado."
cat <<EOF

Verifica en GitHub → Settings → Actions → Runners que '$RUNNER_NAME'
aparezca en línea con los labels self-hosted, linux, mercaldas.

Servicio:  systemctl status actions.runner.*.service
Logs:      journalctl -u 'actions.runner.*' -f
Reiniciar: systemctl restart 'actions.runner.*'
EOF
