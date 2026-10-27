# syntax=docker/dockerfile:1
# ============================================================
# Imagen ÚNICA del stack Restaurantes (Punto C):
#   backend NestJS + las 4 interfaces Vite (reservas, admin, cocina, mesero)
#   + Caddy interno.
#
# Caddy escucha en :8080 y enruta por Host a cada SPA. El backend escucha
# solo en 127.0.0.1:3001 (no se publica). La base de datos vive en otro
# contenedor de la red interna y tampoco se publica.
#
# El edge compartido (edge_caddy, en el repo de ecommerce) es el ÚNICO que
# publica 80/443 y termina TLS; reenvía a `restaurants_app:8080`.
#
# Construir: docker compose -f docker/docker-compose.yml build
# ============================================================

# ── 1. Backend NestJS ───────────────────────────────────────
FROM node:22-bookworm-slim AS backend
WORKDIR /build/backend

RUN npm install -g --force yarn@1.22.22 --no-fund --no-audit
COPY backend/package.json backend/yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY backend/ ./
RUN yarn build

# ── 2. Interfaces web (Vite) ────────────────────────────────
FROM node:22-bookworm-slim AS fronts
ENV CI=true
RUN npm install -g --force pnpm@9.15.9 --no-fund --no-audit
WORKDIR /fronts

# Cada SPA se sirve en la raíz de su subdominio, así que `base` queda en "/"
# (el default de Vite).
COPY ["Interface web client", "reservas"]
COPY ["Interface web admin", "admin"]
COPY ["Interface web kitchen", "cocina"]
COPY ["Interface movil waiter", "mesero"]

RUN set -eux; \
    for d in reservas admin cocina mesero; do \
      ( cd "$d" && pnpm install --frozen-lockfile && pnpm run build ); \
    done

# ── 3. Runtime: Node + Caddy ────────────────────────────────
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    BACKEND_PORT=3001 \
    HTTP_PORT=8080 \
    CADDYFILE_OUT=/tmp/Caddyfile \
    XDG_DATA_HOME=/tmp/caddy \
    XDG_CONFIG_HOME=/tmp/caddy/config \
    TZ=America/Bogota

RUN apt-get update && apt-get install -y --no-install-recommends \
      bash curl ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*

# Caddy estático (misma versión que el edge compartido).
ARG CADDY_VERSION=2.11.7
RUN curl -fsSL "https://github.com/caddyserver/caddy/releases/download/v${CADDY_VERSION}/caddy_${CADDY_VERSION}_linux_amd64.tar.gz" \
      | tar -xz -C /usr/local/bin caddy \
    && chmod +x /usr/local/bin/caddy

WORKDIR /app

# Backend compilado + lo necesario para migrar/sembrar en el arranque.
COPY --from=backend /build/backend/dist ./backend/dist
COPY --from=backend /build/backend/node_modules ./backend/node_modules
COPY --from=backend /build/backend/package.json ./backend/package.json
COPY --from=backend /build/backend/tsconfig.json ./backend/tsconfig.json
COPY --from=backend /build/backend/drizzle.config.ts ./backend/drizzle.config.ts
COPY --from=backend /build/backend/drizzle ./backend/drizzle
COPY --from=backend /build/backend/scripts ./backend/scripts

# Interfaces compiladas.
COPY --from=fronts /fronts/reservas/dist /srv/reservas
COPY --from=fronts /fronts/admin/dist /srv/admin
COPY --from=fronts /fronts/cocina/dist /srv/cocina
COPY --from=fronts /fronts/mesero/dist /srv/mesero

# Proxy inverso + arranque.
COPY docker/entrypoint.sh ./entrypoint.sh
COPY docker/gen-caddyfile.mjs ./gen-caddyfile.mjs

# Normaliza CRLF (el repo se trabaja también en Windows), da permisos y crea
# un usuario SIN privilegios. El contenedor corre con `read_only`, así que
# todo lo escribible vive en /tmp (tmpfs del compose).
RUN sed -i 's/\r$//' ./entrypoint.sh \
    && chmod +x ./entrypoint.sh \
    && groupadd --system --gid 10001 restaurants \
    && useradd --system --uid 10001 --gid restaurants --home-dir /app --shell /usr/sbin/nologin restaurants \
    && mkdir -p /tmp/caddy \
    && chown -R restaurants:restaurants /app /tmp/caddy

USER restaurants

EXPOSE 3001 8080
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["./entrypoint.sh"]
