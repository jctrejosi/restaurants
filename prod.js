#!/usr/bin/env node
/**
 * Restaurantes (Punto C) — lanzador de PRODUCCIÓN.
 *
 * Levanta el stack completo en Docker (backend + 4 SPAs + Caddy interno +
 * PostgreSQL/PostGIS) y lo deja listo para que el edge compartido
 * (`edge_caddy`, repo ecommerce) lo publique en 80/443.
 *
 * Uso:
 *   node prod.js                 sincroniza docker/.env, comprueba puertos,
 *                                construye y levanta; imprime DNS y URLs
 *   node prod.js --dns           solo imprime los registros DNS a crear
 *   node prod.js --check-ports   solo comprueba los puertos del host
 *   node prod.js --status        estado de los contenedores
 *   node prod.js --logs          logs en vivo (app + postgres)
 *   node prod.js --restart       reinicia la app (sin reconstruir)
 *   node prod.js --down          detiene el stack (conserva la BD)
 *   node prod.js --no-build      levanta sin reconstruir la imagen
 *   node prod.js --help
 *
 * Configuración: prod.config.json (hosts, IP pública, puerto del host).
 * Secretos:      docker/.env (no se versiona; se crea desde .env.example).
 */
const cp = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const DOCKER_DIR = path.join(ROOT, "docker");
const CONFIG_PATH = path.join(ROOT, "prod.config.json");
const ENV_FILE = path.join(DOCKER_DIR, ".env");
const ENV_EXAMPLE = path.join(DOCKER_DIR, ".env.example");
const COMPOSE_FILE = path.join(DOCKER_DIR, "docker-compose.yml");

const APP_CONTAINER = "restaurants_app";
const DB_CONTAINER = "restaurants_prod_postgres";
const EDGE_CONTAINER = "edge_caddy";
const SHARED_NETWORK = "shared_edge";

const ARGS = process.argv.slice(2);
const has = (flag) => ARGS.includes(flag);

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function die(msg) {
  console.error(`\n${C.red}✘ ${msg}${C.reset}\n`);
  process.exit(1);
}
const rel = (p) => path.relative(ROOT, p) || ".";

// ── Configuración ───────────────────────────────────────────
function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    die(
      `No existe ${rel(CONFIG_PATH)}. Recupéralo del repo o créalo con los ` +
        `campos host.app/host.reservas/host.cocina/host.admin.`,
    );
  }
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch (err) {
    die(`${rel(CONFIG_PATH)} no es JSON válido: ${err.message}`);
  }
  cfg.hosts = cfg.hosts || {};
  for (const key of ["app", "reservas", "cocina", "admin"]) {
    if (!cfg.hosts[key]) die(`Falta "hosts.${key}" en ${rel(CONFIG_PATH)}.`);
  }
  if (!cfg.publicIp) die(`Falta "publicIp" en ${rel(CONFIG_PATH)}.`);
  cfg.mode = cfg.mode === "direct" ? "direct" : "edge";
  cfg.edgePorts = cfg.edgePorts || {};
  return cfg;
}

const hostEntries = (cfg) =>
  Object.entries(cfg.hosts)
    .filter(([, host]) => Boolean(host))
    .filter(([key, host], _i, all) => all.findIndex(([, h]) => h === host) === _i) // dedupe
    .sort(([a], [b]) => (a === "app" ? -1 : b === "app" ? 1 : a.localeCompare(b)));

const schemeOf = (cfg) => (cfg.tls === false ? "http" : "https");

// ── docker/.env ─────────────────────────────────────────────
function setEnvKeys(text, pairs) {
  let out = text;
  const added = [];
  for (const [key, value] of Object.entries(pairs)) {
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(out)) {
      out = out.replace(re, `${key}=${value}`);
    } else if (new RegExp(`^#\\s*${key}=`, "m").test(out)) {
      out = out.replace(new RegExp(`^#\\s*${key}=.*$`, "m"), `${key}=${value}`);
    } else {
      added.push(`${key}=${value}`);
    }
  }
  if (added.length) {
    if (!out.endsWith("\n")) out += "\n";
    out += `\n# ── Sincronizado por prod.js desde prod.config.json ──\n${added.join("\n")}\n`;
  }
  return out;
}

function envValue(text, key) {
  const m = text.match(new RegExp(`^\\s*${key}=(.*)$`, "m"));
  return m ? m[1].trim() : "";
}

function syncEnv(cfg) {
  if (!fs.existsSync(ENV_FILE)) {
    if (!fs.existsSync(ENV_EXAMPLE)) {
      die(`Falta ${rel(ENV_EXAMPLE)} (no puedo crear docker/.env).`);
    }
    fs.copyFileSync(ENV_EXAMPLE, ENV_FILE);
    console.log(`✅ Creado ${rel(ENV_FILE)} a partir del ejemplo.`);
  }

  let text = fs.readFileSync(ENV_FILE, "utf8");
  const scheme = schemeOf(cfg);

  const pairs = {
    HOST_APP: cfg.hosts.app,
    HOST_RESERVAS: cfg.hosts.reservas,
    HOST_COCINA: cfg.hosts.cocina,
    HOST_ADMIN: cfg.hosts.admin,
    HOST_MESERO: cfg.hosts.mesero || "",
    PUBLIC_HTTP_PORT: cfg.edgePorts.http || "127.0.0.1:30390",
    CORS_ORIGIN: hostEntries(cfg)
      .map(([, host]) => `${scheme}://${host}`)
      .join(","),
  };

  // Contraseña de BD: se genera una sola vez y se guarda en docker/.env.
  if (!envValue(text, "POSTGRES_PASSWORD")) {
    pairs.POSTGRES_PASSWORD = crypto.randomBytes(24).toString("hex");
    console.log("🔐 POSTGRES_PASSWORD vacía: generé una y la guardé en docker/.env.");
  }
  if (!envValue(text, "POSTGRES_USER")) pairs.POSTGRES_USER = "restaurants";
  if (!envValue(text, "POSTGRES_DB")) pairs.POSTGRES_DB = "restaurants";

  fs.writeFileSync(ENV_FILE, setEnvKeys(text, pairs));
  try {
    fs.chmodSync(ENV_FILE, 0o600);
  } catch {
    /* Windows */
  }
  console.log(`✅ ${rel(ENV_FILE)} sincronizado (hosts, CORS y puertos).`);

  const current = fs.readFileSync(ENV_FILE, "utf8");
  const missing = ["POSTGRES_PASSWORD", "CORS_ORIGIN"].filter(
    (key) => !envValue(current, key),
  );
  if (missing.length) {
    die(`docker/.env incompleto: falta(n) ${missing.join(", ")}.`);
  }
}

// ── DNS ─────────────────────────────────────────────────────
function printDns(cfg) {
  const zone = cfg.dnsZone || "jcti.xyz";
  const W = 72;
  const bar = "━".repeat(W);
  const line = (s = "") => console.log(`  ${s}`);
  const recordName = (domain) =>
    domain === zone || domain === `www.${zone}`
      ? "@ (raíz)"
      : domain.endsWith(`.${zone}`)
        ? domain.slice(0, -(zone.length + 1))
        : domain;

  console.log(`\n${bar}`);
  console.log(`  DNS a configurar — Restaurantes (Punto C)`);
  console.log(bar);
  line(`Zona    : ${zone}`);
  line(`IP      : ${cfg.publicIp}`);
  line(`Modo    : edge (80/443 los publica edge_caddy y hace TLS)`);
  console.log(bar);
  line(`${C.cyan}En GoDaddy → Zona DNS → Agregar registro tipo A (TTL 600):${C.reset}`);
  line("");
  line(`  ${"NOMBRE".padEnd(16)} ${"TIPO".padEnd(6)} VALOR`);
  line(`  ${"─".repeat(16)} ${"─".repeat(6)} ${"─".repeat(20)}`);
  for (const [, host] of hostEntries(cfg)) {
    line(`  ${recordName(host).padEnd(16)} ${"A".padEnd(6)} ${cfg.publicIp}`);
  }
  line("");
  line(`${C.dim}  No crees comodines (*) ni www: solo los nombres de arriba.${C.reset}`);
  line(`${C.dim}  Todos apuntan al MISMO servidor; el Host decide qué SPA se sirve.${C.reset}`);
  console.log(bar);
  line(`${C.cyan}Firewall / VPS:${C.reset}`);
  line(`  Abre SOLO TCP 80 y 443 (los publica edge_caddy).`);
  line(`  No abras ${cfg.edgePorts.http || "30390"} ni la BD: son locales.`);
  console.log(bar);
  line(`${C.cyan}Mapa Host → servicio:${C.reset}`);
  for (const [key, host] of hostEntries(cfg)) {
    const label = {
      app: "web de reservas/pedidos",
      reservas: "web de reservas",
      cocina: "KDS cocina",
      admin: "backoffice",
      mesero: "APK mesero (web)",
    }[key];
    line(`  ${host.padEnd(34)} → ${label}`);
  }
  line(`  ${hostEntries(cfg)[0][1].padEnd(34)} → /api/* (backend)`);
  console.log(`${bar}\n`);
}

// ── Docker ──────────────────────────────────────────────────
function run(cmd, args, opts = {}) {
  return cp.spawnSync(cmd, args, {
    encoding: "utf8",
    windowsHide: true,
    ...opts,
  });
}

function compose(args, opts = {}) {
  return cp.spawnSync(
    "docker",
    ["compose", "--env-file", ENV_FILE, "-f", COMPOSE_FILE, ...args],
    {
      cwd: ROOT,
      stdio: "inherit",
      windowsHide: true,
      ...opts,
    },
  );
}

function checkDocker() {
  const version = run("docker", ["--version"]);
  if (version.status !== 0) {
    die("Docker no está disponible en el PATH (¿daemon/WSL2 arrancado?).");
  }
  const info = run("docker", ["info"]);
  if (info.status !== 0) {
    die("Docker no responde. Arráncalo (`sudo systemctl start docker`) y reintenta.");
  }
}

function ensureSharedNetwork() {
  const inspect = run("docker", ["network", "inspect", SHARED_NETWORK]);
  if (inspect.status === 0) return;
  console.log(`${C.yellow}⚠️  No existe la red ${SHARED_NETWORK}; la creo.${C.reset}`);
  const create = run("docker", ["network", "create", SHARED_NETWORK]);
  if (create.status !== 0) {
    die(`No pude crear la red ${SHARED_NETWORK}: ${(create.stderr || "").trim()}`);
  }
}

// ── Puertos del host ────────────────────────────────────────
function parseHostPort(value, fallback) {
  const raw = String(value || fallback || "").trim();
  if (!raw) return null;
  const noProto = raw.replace(/\/tcp$/i, "");
  let portText = noProto;
  if (noProto.startsWith("[")) {
    const idx = noProto.lastIndexOf("]:");
    portText = idx >= 0 ? noProto.slice(idx + 2) : noProto;
  } else if (noProto.includes(":")) {
    portText = noProto.slice(noProto.lastIndexOf(":") + 1);
  }
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { raw, port };
}

function dockerSnapshot() {
  const r = run("docker", [
    "ps",
    "--format",
    "{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}",
  ]);
  if (r.status !== 0) return [];
  return (r.stdout || "")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [name, image, status, ports] = line.split("\t");
      const hostPorts = new Set();
      const re = /:(\d+)->/g;
      let m;
      while ((m = re.exec(ports || ""))) hostPorts.add(Number(m[1]));
      return { name, image, status, ports: ports || "", hostPorts };
    });
}

function processCommand(pid) {
  if (!pid) return "";
  const r = run("ps", ["-p", String(pid), "-o", "args="]);
  if (r.status !== 0) return "";
  return (r.stdout || "").trim().split(/\r?\n/)[0].slice(0, 180);
}

function linuxListeners(port) {
  const ss = run("ss", ["-ltnpH", `sport = :${port}`]);
  if (ss.status === 0) {
    const out = ss.stdout || "";
    if (!out.trim()) return [];
    const found = [];
    const re = /users:\(\("([^"]+)",pid=(\d+)/g;
    let match;
    while ((match = re.exec(out))) {
      found.push({
        name: match[1],
        pid: Number(match[2]),
        command: processCommand(Number(match[2])),
      });
    }
    return found;
  }

  const lsof = run("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-F", "pcn"]);
  if (lsof.status === 0) {
    const out = lsof.stdout || "";
    if (!out.trim()) return [];
    const found = [];
    let current = null;
    for (const line of out.split(/\r?\n/)) {
      if (line.startsWith("p")) {
        if (current && current.pid) found.push(current);
        current = { pid: Number(line.slice(1)) };
      } else if (line.startsWith("c") && current) {
        current.name = line.slice(1);
      }
    }
    if (current && current.pid) found.push(current);
    for (const item of found) item.command = processCommand(item.pid);
    return found;
  }
  return [];
}

function windowsListeners(port) {
  const netstat = run("netstat", ["-ano", "-p", "tcp"]);
  if (netstat.status !== 0) return [];
  const pids = new Set();
  for (const line of (netstat.stdout || "").split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 5 || cols[3] !== "LISTENING") continue;
    if (!new RegExp(`:${port}$`).test(cols[1])) continue;
    pids.add(Number(cols[4]));
  }
  const found = [];
  for (const pid of pids) {
    const q = run("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"]);
    const name = (q.stdout || "").match(/^"([^"]+)"/)?.[1] || "proceso no identificado";
    found.push({ name, pid, command: "" });
  }
  return found;
}

const hostListeners = (port) =>
  process.platform === "win32" ? windowsListeners(port) : linuxListeners(port);

/** Comprueba el puerto de la app y avisa del estado del edge (80/443). */
function checkHostPorts(cfg) {
  const text = fs.readFileSync(ENV_FILE, "utf8");
  const http = parseHostPort(
    envValue(text, "PUBLIC_HTTP_PORT"),
    cfg.edgePorts.http || "127.0.0.1:30390",
  );
  if (!http) die("PUBLIC_HTTP_PORT no es un puerto válido.");

  const containers = dockerSnapshot();
  const owners = containers.filter((c) => c.hostPorts.has(http.port));
  const own = owners.find((c) => c.name === APP_CONTAINER);
  const conflicts = [];

  console.log(`\n${C.cyan}==> Comprobando puertos del host…${C.reset}`);
  if (own) {
    console.log(`  ✅ ${http.raw} → ${APP_CONTAINER} ya lo usa; se recreará.`);
  } else if (owners.length) {
    conflicts.push({ raw: http.raw, port: http.port, owners });
  } else {
    const listeners = hostListeners(http.port);
    if (listeners.length) conflicts.push({ raw: http.raw, port: http.port, listeners });
    else console.log(`  ✅ ${http.raw} → libre.`);
  }

  if (conflicts.length) {
    console.error(`\n${C.red}✘ El puerto del front está ocupado por otro servicio:${C.reset}`);
    for (const conflict of conflicts) {
      console.error(`   • ${conflict.raw} (puerto ${conflict.port})`);
      if (conflict.owners) {
        console.error(
          `     Contenedor(es): ${conflict.owners
            .map((c) => `${c.name} (${c.image})`)
            .join(", ")}`,
        );
      } else {
        for (const l of conflict.listeners) {
          console.error(`     ${l.name || "proceso"}${l.pid ? ` · PID ${l.pid}` : ""}`);
          if (l.command) console.error(`        ${l.command}`);
        }
      }
    }
    console.error(
      `\n   Detén ese servicio o cambia PUBLIC_HTTP_PORT en ${rel(ENV_FILE)}.` +
        `\n   No se construyó ni levantó nada.\n`,
    );
    process.exit(1);
  }

  // 80/443 pertenecen al edge compartido.
  for (const port of [80, 443]) {
    const edgeOwner = containers.find(
      (c) => c.name === EDGE_CONTAINER && c.hostPorts.has(port),
    );
    if (edgeOwner) {
      console.log(`  ✅ ${port} → ${EDGE_CONTAINER} (edge compartido).`);
      continue;
    }
    const other = containers.find((c) => c.hostPorts.has(port));
    if (other) {
      console.warn(
        `  ${C.yellow}⚠️  ${port} lo publica ${other.name}; el edge no podrá usarlo.${C.reset}`,
      );
      continue;
    }
    const listeners = hostListeners(port);
    if (listeners.length) {
      console.warn(
        `  ${C.yellow}⚠️  ${port} está ocupado por otro proceso; el edge no podrá publicarlo.${C.reset}`,
      );
      for (const l of listeners) console.warn(`     ${l.name}${l.pid ? ` · PID ${l.pid}` : ""}`);
    } else {
      console.warn(
        `  ${C.yellow}⚠️  ${port} está libre: ${EDGE_CONTAINER} no está publicado.${C.reset}`,
      );
    }
  }
}

// ── Edge compartido ─────────────────────────────────────────
function edgeStatus(cfg) {
  const inspect = run("docker", ["inspect", "-f", "{{.State.Status}}", EDGE_CONTAINER]);
  if (inspect.status !== 0) {
    console.warn(
      `\n${C.yellow}⚠️  No existe el contenedor ${EDGE_CONTAINER}.${C.reset}` +
        `\n   Sin él nadie publica 80/443. Levántalo desde el repo ecommerce:` +
        `\n   cd /mnt/c/Users/Desarrolo4/Documents/ecommerce/docker/edge && docker compose up -d\n`,
    );
    return;
  }
  const status = (inspect.stdout || "").trim();
  if (status !== "running") {
    console.warn(`${C.yellow}⚠️  ${EDGE_CONTAINER} está en estado "${status}".${C.reset}`);
  }

  const config = run("docker", [
    "exec",
    EDGE_CONTAINER,
    "cat",
    "/etc/caddy/Caddyfile",
  ]);
  if (config.status !== 0) {
    console.warn(
      `\n${C.yellow}⚠️  No pude leer el Caddyfile del edge.${C.reset}` +
        `\n   Actualízalo (repo ecommerce, rama dev) y reinicia: docker restart ${EDGE_CONTAINER}\n`,
    );
    return;
  }
  const text = config.stdout || "";
  const missingHosts = hostEntries(cfg)
    .map(([, host]) => host)
    .filter((host) => !text.includes(host));
  if (!text.includes(APP_CONTAINER) || missingHosts.length) {
    console.warn(
      `\n${C.yellow}⚠️  El Caddyfile del edge aún no publica Restaurantes.${C.reset}` +
        (missingHosts.length ? `\n   Faltan hosts: ${missingHosts.join(", ")}` : "") +
        `\n   El bloque vive en el repo ecommerce: docker/edge/Caddyfile.` +
        `\n   Tras actualizarlo:  docker restart ${EDGE_CONTAINER}` +
        `\n   y valida:            docker exec ${EDGE_CONTAINER} caddy validate --config /etc/caddy/Caddyfile\n`,
    );
  } else {
    console.log(`  ✅ El edge publica estos hosts hacia ${APP_CONTAINER}:8080.`);
  }
}

// ── Salud ───────────────────────────────────────────────────
function containerHealth(name) {
  const r = run("docker", [
    "inspect",
    "-f",
    "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}",
    name,
  ]);
  if (r.status !== 0) return "";
  return (r.stdout || "").trim();
}

function sleepSync(ms) {
  const sab = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sab), 0, 0, ms);
}

function waitHealthy(name, tries = 60) {
  process.stdout.write(`  ⏳ Esperando healthcheck de ${name}`);
  for (let i = 0; i < tries; i += 1) {
    const status = containerHealth(name);
    if (status === "healthy") {
      process.stdout.write(" ✅\n");
      return true;
    }
    if (["unhealthy", "exited", "dead"].includes(status)) {
      process.stdout.write(` ✘ (${status})\n`);
      run("docker", ["logs", "--tail", "120", name], { stdio: "inherit" });
      return false;
    }
    process.stdout.write(".");
    sleepSync(5000);
  }
  process.stdout.write(" ✘ (timeout)\n");
  run("docker", ["logs", "--tail", "120", name], { stdio: "inherit" });
  return false;
}

function smokeTests(cfg) {
  const host = cfg.hosts.app;
  const port = parseHostPort(
    envValue(fs.readFileSync(ENV_FILE, "utf8"), "PUBLIC_HTTP_PORT"),
    cfg.edgePorts.http || "127.0.0.1:30390",
  );
  console.log(`\n${C.cyan}==> Comprobaciones de salud${C.reset}`);

  if (port && run("curl", ["--version"]).status === 0) {
    const local = run("curl", [
      "-fsS",
      "--max-time",
      "10",
      "-H",
      `Host: ${host}`,
      `http://127.0.0.1:${port.port}/`,
    ]);
    if (local.status === 0) console.log(`  ✅ Front local (${host}) responde.`);
    else console.warn(`  ${C.yellow}⚠️  El front local no respondió por 127.0.0.1:${port.port}.${C.reset}`);
  }

  if (run("docker", ["inspect", EDGE_CONTAINER]).status === 0) {
    const publicCheck = run("curl", [
      "-fsS",
      "--max-time",
      "15",
      "--resolve",
      `${host}:443:127.0.0.1`,
      `https://${host}/api/health`,
    ]);
    if (publicCheck.status === 0) {
      console.log(`  ✅ HTTPS público (${host}/api/health) responde.`);
    } else {
      console.warn(
        `  ${C.yellow}⚠️  ${host}/api/health no respondió por el edge.${C.reset}` +
          `\n     Revisa DNS (A → ${cfg.publicIp}), el Caddyfile del edge y` +
          `\n     \`docker logs --tail 80 ${EDGE_CONTAINER}\`.`,
      );
    }
  }
}

// ── Ayuda ───────────────────────────────────────────────────
function printHelp() {
  console.log(`
${C.bold}Restaurantes (Punto C) — producción${C.reset}

  node prod.js                 sincroniza docker/.env, comprueba puertos,
                               construye y levanta; imprime DNS y URLs
  node prod.js --dns           solo imprime los registros DNS
  node prod.js --check-ports   solo comprueba los puertos del host
  node prod.js --status        estado de los contenedores
  node prod.js --logs          logs en vivo (app + postgres)
  node prod.js --restart       reinicia la app (sin reconstruir)
  node prod.js --down          detiene el stack (conserva la BD)
  node prod.js --no-build      levanta sin reconstruir la imagen
  node prod.js --help

${C.dim}Configuración : prod.config.json (hosts, IP, puerto del host)
Secretos      : docker/.env (se crea solo; no se versiona)
Contenedores  : ${APP_CONTAINER} (app) + ${DB_CONTAINER} (BD)
Exposición    : solo edge_caddy publica 80/443${C.reset}
`);
}

// ── Main ────────────────────────────────────────────────────
function main() {
  if (has("--help") || has("-h")) {
    printHelp();
    return;
  }

  const cfg = loadConfig();

  if (has("--dns")) {
    printDns(cfg);
    return;
  }

  checkDocker();
  syncEnv(cfg);

  if (has("--check-ports")) {
    checkHostPorts(cfg);
    return;
  }

  if (has("--status")) {
    compose(["ps"]);
    return;
  }

  if (has("--logs")) {
    compose(["logs", "-f", "--tail", "120", "app", "postgres"]);
    return;
  }

  if (has("--down")) {
    console.log(`${C.cyan}==> Deteniendo el stack (la BD se conserva)…${C.reset}`);
    compose(["down"]);
    return;
  }

  if (has("--restart")) {
    console.log(`${C.cyan}==> Reiniciando ${APP_CONTAINER}…${C.reset}`);
    compose(["restart", "app"]);
    return;
  }

  printDns(cfg);
  checkHostPorts(cfg);
  ensureSharedNetwork();

  const configCheck = compose(["config", "--quiet"]);
  if (configCheck.status !== 0) {
    die(`docker compose config falló (revisa ${rel(ENV_FILE)}).`);
  }

  if (!has("--no-build")) {
    console.log(`\n${C.cyan}==> Construyendo imagen restaurants/app:latest…${C.reset}`);
    const build = compose(["build", "app"]);
    if (build.status !== 0) die("Falló la construcción de la imagen.");
  }

  console.log(`\n${C.cyan}==> Levantando contenedores…${C.reset}`);
  const up = compose(["up", "-d"]);
  if (up.status !== 0) die("Falló docker compose up.");

  console.log("");
  if (!waitHealthy(APP_CONTAINER)) {
    die(`El contenedor ${APP_CONTAINER} no quedó healthy. Revisa: node prod.js --logs`);
  }
  if (containerHealth(DB_CONTAINER) !== "healthy") {
    console.warn(`${C.yellow}⚠️  ${DB_CONTAINER} no reporta healthy todavía.${C.reset}`);
  }

  edgeStatus(cfg);
  smokeTests(cfg);

  compose(["ps"]);

  const scheme = schemeOf(cfg);
  console.log(`\n${C.green}${C.bold}✓ Stack levantado.${C.reset}`);
  for (const [key, host] of hostEntries(cfg)) {
    const suffix = key === "app" ? " (y /api/*)" : "";
    console.log(`   ${scheme}://${host}${suffix}`);
  }
  console.log(
    `\n${C.dim}Si acabas de crear el DNS, espera la propagación y el certificado` +
      `\n(Let's Encrypt) antes de que el edge responda por HTTPS.${C.reset}\n`,
  );
}

main();
