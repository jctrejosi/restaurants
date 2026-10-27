#!/usr/bin/env node
/**
 * Genera el Caddyfile INTERNO del contenedor a partir de variables de entorno.
 *
 * Este Caddy no hace TLS: escucha en :8080 y enruta por Host. El TLS y los
 * puertos 80/443 los gestiona el edge compartido (edge_caddy).
 *
 * Variables:
 *   HOST_APP, HOST_RESERVAS, HOST_COCINA, HOST_ADMIN  (obligatorias)
 *   HOST_MESERO                                        (opcional)
 *   HTTP_PORT        (default 8080)
 *   BACKEND_PORT     (default 3001)
 *   CADDYFILE_OUT    (default /tmp/Caddyfile)
 */
import fs from "node:fs";

const out = process.env.CADDYFILE_OUT || "/tmp/Caddyfile";
const httpPort = process.env.HTTP_PORT || "8080";
const backendPort = process.env.BACKEND_PORT || "3001";

const hostPattern =
  /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

const hosts = {
  app: (process.env.HOST_APP || "").trim(),
  reservas: (process.env.HOST_RESERVAS || "").trim(),
  cocina: (process.env.HOST_COCINA || "").trim(),
  admin: (process.env.HOST_ADMIN || "").trim(),
  mesero: (process.env.HOST_MESERO || "").trim(),
};

const required = ["app", "reservas", "cocina", "admin"];
const missing = required.filter((key) => !hosts[key]);
if (missing.length) {
  console.error(
    `[caddy] Faltan hosts obligatorios: ${missing
      .map((k) => `HOST_${k.toUpperCase()}`)
      .join(", ")}`,
  );
  process.exit(1);
}

const invalid = Object.entries(hosts).filter(
  ([, host]) => host && !hostPattern.test(host),
);
if (invalid.length) {
  console.error(
    `[caddy] Host inválido: ${invalid.map(([k, v]) => `${k}=${v}`).join(", ")}`,
  );
  process.exit(1);
}

const byHost = new Map();
for (const [key, host] of Object.entries(hosts)) {
  if (!host) continue;
  if (hosts.app && host === hosts.app && key !== "app") continue;
  if (byHost.has(host)) {
    console.error(
      `[caddy] El host ${host} está repetido (${byHost.get(host)} y ${key}).`,
    );
    process.exit(1);
  }
  byHost.set(host, key);
}

const roots = {
  app: "/srv/reservas",
  reservas: "/srv/reservas",
  cocina: "/srv/cocina",
  admin: "/srv/admin",
  mesero: "/srv/mesero",
};

function site(key) {
  const host = hosts[key];
  if (!host || byHost.get(host) !== key) return "";

  return `
# ── ${key} → ${roots[key]} ──
http://${host} {
	import sec_headers

	# API del backend (el prefijo /api se elimina antes de reenviar).
	handle_path /api/* {
		# Diagnóstico de BD: solo interno, no se publica.
		@dbhealth path /health/db
		respond @dbhealth "not found" 404

		request_body {
			max_size 10MB
		}
		reverse_proxy 127.0.0.1:${backendPort}
	}

	# Socket.IO (mismo backend; Caddy negocia el upgrade).
	handle /socket.io/* {
		reverse_proxy 127.0.0.1:${backendPort}
	}

	handle {
		root * ${roots[key]}
		import spa
	}
}
`;
}

const caddyfile = `# Generado por docker/gen-caddyfile.mjs — NO editar a mano.
# TLS: lo termina el edge compartido (edge_caddy). Este Caddy solo sirve HTTP.
{
	admin off
	auto_https off
	http_port ${httpPort}
}

(sec_headers) {
	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
		Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
		Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests"
		-Server
	}
	encode zstd gzip
}

(spa) {
	@assets path /assets/*
	header @assets Cache-Control "public, max-age=31536000, immutable"
	@notAssets not path /assets/*
	header @notAssets Cache-Control "no-cache"
	try_files {path} /index.html
	file_server
}
${Object.keys(roots)
  .map(site)
  .join("")}
# Host desconocido (p. ej. acceso por IP): no se sirve ninguna SPA.
:${httpPort} {
	respond "Not found" 404
}
`;

fs.writeFileSync(out, caddyfile, { encoding: "utf8", mode: 0o600 });
console.log(`[caddy] Caddyfile generado en ${out}`);
console.log(
  `[caddy] Hosts: ${Object.entries(hosts)
    .filter(([, h]) => h)
    .map(([k, h]) => `${k}=${h}`)
    .join(" ")}`,
);
