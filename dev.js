#!/usr/bin/env node
/**
 * Punto C — lanzador de servicios.
 *
 * Uso:
 *   node dev.js              # DEV: instala dependencias faltantes y levanta
 *                            #   PostgreSQL + backend + las 4 interfaces en
 *                            #   segundo plano; espera a que el backend esté
 *                            #   listo, imprime las URLs y termina (la terminal
 *                            #   queda libre).
 *   node dev.js <flags>      # Solo lo pedido, con sus dependencias mínimas
 *                            #   (p. ej. `node dev.js --client`).
 *   node dev.js --install    # Solo instala las dependencias (de la selección o
 *                            #   de todo) y sale. No levanta nada.
 *   node dev.js --prod       # PRODUCCIÓN ("en vivo"): builds previos requeridos
 *                            #   (backend: yarn build; webs: pnpm run build).
 *   node dev.js --stop       # Detiene los servicios levantados por dev.js.
 *   node dev.js --help       # Lista todos los comandos implementados.
 *
 * Logs: un archivo por servicio en logs/ (logs/<servicio>.log).
 *
 * La BD (docker) queda corriendo al salir; se detiene con
 * `cd db/docker && docker compose stop`.
 */
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const ROOT = __dirname;
const LOGS_DIR = path.join(ROOT, "logs");
const PIDS_FILE = path.join(LOGS_DIR, ".pids.json");

// BD principal (db/docker/docker-compose.yml).
const DB_CONTAINER = "restaurants_postgres";
const DB_NAME = "restaurants";
const DB_PORT = 5435;

const ARGS = process.argv.slice(2);
const MODE = ARGS.includes("--prod") || ARGS.includes("--live") ? "prod" : "dev";
const STOP = ARGS.includes("--stop");
const HELP = ARGS.includes("--help");
const INSTALL_ONLY = ARGS.includes("--install");

// ── Gestores de paquetes ────────────────────────────────────
// Los fronts traen pnpm-lock.yaml; el backend trae yarn.lock. `PM` es el gestor
// preferido para `run` en los fronts; `PM_INSTALLERS` prueba candidatos en orden
// al instalar (pnpm → npm → yarn). npm se asume presente (viene con Node).
// En Windows npm/pnpm/yarn son shims .cmd y Node exige `shell` para ejecutarlos.
const PM_SHELL = process.platform === "win32";
const PKG_MANAGERS = new Set(["npm", "pnpm", "yarn"]);

function hasBin(cmd) {
  const r = spawnSync(cmd, ["--version"], { stdio: "ignore", shell: PM_SHELL });
  return r.status === 0;
}

const PM_CANDIDATES = ["pnpm", "npm", "yarn"].filter(
  (pm) => pm === "npm" || hasBin(pm),
);
const PM = PM_CANDIDATES[0];
const PM_INSTALLERS = PM_CANDIDATES;
// El backend usa yarn (yarn.lock) con npm como respaldo.
const BACKEND_PM = hasBin("yarn") ? "yarn" : "npm";

// Dependencias por servicio: `marker` es lo que se comprueba para saber si ya
// están instaladas; `install`/`installers` son los comandos que las instalan.
const BACKEND_DEPS = {
  marker: ["node_modules"],
  markerType: "dir",
  installers: [BACKEND_PM, "npm"].filter((pm, i, a) => a.indexOf(pm) === i),
};
const PNPM_DEPS = {
  marker: ["node_modules"],
  markerType: "dir",
  installers: PM_INSTALLERS,
};

const C = {
  db: "\x1b[36m",
  backend: "\x1b[31m",
  client: "\x1b[32m",
  kitchen: "\x1b[35m",
  admin: "\x1b[34m",
  waiter: "\x1b[36m",
  reset: "\x1b[0m",
};

// Puerto reservado por interfaz (lejos de ecommerce 8443–8447 y CRM 8444).
// Los vite.config.ts de cada export leen `process.env.PORT`.
const SERVICES = [
  {
    name: "backend",
    dir: "backend",
    url: "http://localhost:3001",
    dev: [BACKEND_PM, "run", "dev"],
    prod: [BACKEND_PM, "run", "start:prod"],
    deps: BACKEND_DEPS,
  },
  {
    // Web del cliente (planes 01 y 02) — un solo proyecto Figma Make.
    // Reservas en `/` (y `/reservas`); pedidos en `/pedidos`.
    name: "client",
    dir: "Interface web client",
    url: "http://localhost:8450",
    dev: [PM, "run", "dev"],
    prod: [PM, "run", "preview"],
    env: { PORT: "8450" },
    lan: true,
    deps: PNPM_DEPS,
  },
  {
    // KDS de cocina (plan 04): tablero por estación.
    name: "kitchen",
    dir: "Interface web kitchen",
    url: "http://localhost:8452",
    dev: [PM, "run", "dev"],
    prod: [PM, "run", "preview"],
    env: { PORT: "8452" },
    lan: true,
    deps: PNPM_DEPS,
  },
  {
    // Backoffice / panel de administración (plan 05).
    name: "admin",
    dir: "Interface web admin",
    url: "http://localhost:8453",
    dev: [PM, "run", "dev"],
    prod: [PM, "run", "preview"],
    env: { PORT: "8453" },
    lan: true,
    deps: PNPM_DEPS,
  },
  {
    // APK del mesero (plan 03): hoy es el prototipo web exportado de Figma.
    // Cuando llegue el proyecto Expo real (`Interface movil mesero/`), este
    // servicio pasa a Expo (patrón de ecommerce: QR con --fg).
    name: "waiter",
    dir: "Interface movil waiter",
    url: "http://localhost:8454",
    dev: [PM, "run", "dev"],
    prod: [PM, "run", "preview"],
    env: { PORT: "8454" },
    lan: true,
    deps: PNPM_DEPS,
  },
];

// ── Selección por interfaz (flags --x) ──────────────────────
// Cada interfaz declara sus dependencias; al pedirla se levanta también lo
// mínimo para que funcione (p. ej. --client ⇒ backend + PostgreSQL).
const APP_ALIASES = {
  client: "client",
  cliente: "client",
  booking: "client",
  reservas: "client",
  orders: "client",
  pedidos: "client",
  kitchen: "kitchen",
  kds: "kitchen",
  cocina: "kitchen",
  admin: "admin",
  backoffice: "admin",
  waiter: "waiter",
  mesero: "waiter",
  apk: "waiter",
  backend: "backend",
  api: "backend",
  db: "db",
  postgres: "db",
  bd: "db",
};

const APP_DEPENDS = {
  backend: ["db"],
  client: ["db", "backend"],
  kitchen: ["db", "backend"],
  admin: ["db", "backend"],
  waiter: ["db", "backend"],
};

const NO_SELECTOR_FLAGS = ["--prod", "--live", "--stop", "--help", "--install"];

function unknownFlags() {
  const valid = new Set([
    ...NO_SELECTOR_FLAGS,
    ...Object.keys(APP_ALIASES).map((a) => `--${a}`),
    "--all",
    "--todo",
  ]);
  return ARGS.filter((a) => a.startsWith("--") && !valid.has(a));
}

/** Devuelve la lista de servicios a usar, o null si es "todo". */
function resolveSelection() {
  const requested = ARGS.filter((a) => a.startsWith("--"))
    .map((a) => a.slice(2))
    .filter((a) => !NO_SELECTOR_FLAGS.includes(`--${a}`) && a !== "all" && a !== "todo");
  if (requested.length === 0 || ARGS.includes("--all") || ARGS.includes("--todo"))
    return null;

  const names = [];
  const add = (name) => {
    if (!name || names.includes(name)) return;
    for (const dep of APP_DEPENDS[name] || []) add(dep);
    names.push(name);
  };
  for (const raw of requested) {
    const name = APP_ALIASES[raw];
    if (name) add(name);
  }
  return names;
}

function selectionLabel(plan) {
  if (!plan) return "todo";
  const apps = plan.filter((n) => n !== "db");
  return apps.length ? apps.join(" + ") : "solo PostgreSQL";
}

// ── Utilidades de red ───────────────────────────────────────

function waitForPort(port, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const attempt = () => {
      const sock = net.connect({ host: "127.0.0.1", port });
      const done = (ok) => {
        try {
          sock.destroy();
        } catch {
          /* noop */
        }
        resolve(ok);
      };
      sock.once("connect", () => done(true));
      sock.once("error", () => {
        try {
          sock.destroy();
        } catch {
          /* noop */
        }
        if (Date.now() > deadline) done(false);
        else setTimeout(attempt, 1000);
      });
    };
    attempt();
  });
}

function sleepSync(ms) {
  const sab = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sab), 0, 0, ms);
}

/** Mata el proceso que escuche en `port` (Unix: fuser, Windows: netstat+taskkill). */
function killPort(port) {
  if (process.platform === "win32") {
    try {
      const out = spawnSync("netstat", ["-ano"], { encoding: "utf8" }).stdout;
      const pids = new Set();
      out.split("\n").forEach((line) => {
        const m = line.trim().match(new RegExp(`:${port}\\s+.*?LISTENING\\s+(\\d+)\\s*$`));
        if (m) pids.add(m[1]);
      });
      pids.forEach((pid) => {
        try {
          spawnSync("taskkill", ["/PID", pid, "/T", "/F"], { stdio: "ignore" });
        } catch {
          /* ya terminó */
        }
      });
      if (pids.size)
        console.log(`  ✓ puerto ${port} liberado (PID ${[...pids].join(", ")})`);
    } catch {
      /* sin procesos */
    }
  } else {
    const r = spawnSync("fuser", ["-k", `${port}/tcp`], {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
    const out = (r.stdout || "").toString().trim();
    if (out) console.log(`  ✓ puerto ${port} liberado (PID ${out})`);
  }
}

// ── Logs ────────────────────────────────────────────────────

function openLog(name) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  const logPath = path.join(LOGS_DIR, `${name}.log`);
  const fd = fs.openSync(logPath, "a");
  fs.writeSync(
    fd,
    `\n===== [${name}] ${new Date().toISOString()} modo=${MODE} =====\n`,
  );
  return { fd, logPath };
}

// ── PostgreSQL (docker) ─────────────────────────────────────

function startDatabase() {
  const dbDir = path.join(ROOT, "db", "docker");
  console.log(`${C.db}[db]${C.reset} 🐘 PostgreSQL (docker compose up -d) → logs/db.log`);

  const { fd } = openLog("db");
  const run = (args) =>
    spawnSync("docker", args, {
      cwd: dbDir,
      stdio: ["ignore", fd, fd],
      timeout: 120000,
    });

  // Intento con --wait (espera el healthcheck de pg_isready); si no lo soporta,
  // cae al arranque simple.
  let r = run(["compose", "up", "-d", "--wait"]);
  if (r.status === 0) {
    fs.closeSync(fd);
    console.log(`${C.db}[db]${C.reset} ✅ PostgreSQL listo`);
    return true;
  }
  r = run(["compose", "up", "-d"]);
  fs.closeSync(fd);
  if (r.status === 0) {
    console.log(`${C.db}[db]${C.reset} ✅ Contenedor arrancado. Esperando :${DB_PORT}...`);
    return true;
  }
  console.warn(
    `${C.db}[db]${C.reset} ⚠️  No se pudo levantar PostgreSQL (detalle en logs/db.log).`,
  );
  console.warn(
    `${C.db}[db]${C.reset} 💡 Docker no está disponible: arranca el daemon (sudo systemctl start docker o sudo service docker start) y, si hace falta, añade tu usuario al grupo docker (sudo usermod -aG docker $USER) y reinicia sesión.`,
  );
  return false;
}

// ── Dependencias ────────────────────────────────────────────

function dirHasContent(p) {
  try {
    return fs.readdirSync(p).length > 0;
  } catch {
    return false;
  }
}

/** Instala las dependencias de un servicio si no están (node_modules). */
function ensureDeps(svc) {
  const color = C[svc.name] || "";
  const cwd = path.join(ROOT, svc.dir);
  const markerPath = path.join(cwd, ...svc.deps.marker);
  const installed =
    svc.deps.markerType === "file"
      ? fs.existsSync(markerPath)
      : dirHasContent(markerPath);
  if (installed) return true;

  console.log(`${color}[${svc.name}]${C.reset} 📦 instalando dependencias...`);

  // Candidatos a probar en orden (p. ej. pnpm → npm → yarn): gana el primero
  // que instale bien. Esto cubre "pnpm no instalado" y "pnpm instalado pero roto".
  if (svc.deps.installers) {
    for (const pm of svc.deps.installers) {
      console.log(`${color}[${svc.name}]${C.reset}    · ${pm} install`);
      const r = spawnSync(pm, ["install"], { cwd, stdio: "inherit", shell: PM_SHELL });
      if (r.status === 0) {
        console.log(`${color}[${svc.name}]${C.reset} ✅ dependencias listas (${pm})`);
        return true;
      }
      console.warn(
        `${color}[${svc.name}]${C.reset} ⚠️  "${pm} install" falló; probando con el siguiente gestor...`,
      );
    }
    console.error(
      `${color}[${svc.name}]${C.reset} ✘ no se pudieron instalar las dependencias — se omite este servicio`,
    );
    return false;
  }

  for (const step of svc.deps.install) {
    const r = spawnSync(step[0], step.slice(1), {
      cwd,
      stdio: "inherit",
      shell: PM_SHELL && PKG_MANAGERS.has(step[0]),
    });
    if (r.status !== 0) {
      console.error(
        `${color}[${svc.name}]${C.reset} ✘ falló la instalación: ${step.join(" ")} — se omite este servicio`,
      );
      return false;
    }
  }
  console.log(`${color}[${svc.name}]${C.reset} ✅ dependencias listas`);
  return true;
}

// ── Arranque de servicios ───────────────────────────────────

function resolveCmd(svc) {
  return MODE === "prod" ? svc.prod : svc.dev;
}

function startService(svc) {
  const color = C[svc.name] || "";
  const lanUrl = svc.lan ? toLanUrl(svc.url, lanIp()) : null;
  console.log(
    `${color}[${svc.name}]${C.reset} ▶ ${svc.url}` +
      (lanUrl ? `  (red local: ${lanUrl})` : "") +
      `  (log: logs/${svc.name}.log)`,
  );

  const cmd = resolveCmd(svc);
  if (!cmd) return null;

  const port = svc.url ? new URL(svc.url).port : null;
  if (port) {
    killPort(port);
    sleepSync(800); // tiempo para que el SO libere el socket
  }

  const { fd } = openLog(svc.name);
  const child = spawn(cmd[0], cmd.slice(1), {
    cwd: path.join(ROOT, svc.dir),
    stdio: ["ignore", fd, fd],
    detached: true, // su propio grupo de procesos: sobrevive a la terminal
    shell: process.platform === "win32",
    env: { ...process.env, ...(svc.env || {}) },
  });

  child.on("error", (err) => {
    console.error(`${color}[${svc.name}]${C.reset} ✘ no se pudo arrancar: ${err.message}`);
  });
  child.unref(); // no mantener vivo al padre por el hijo
  fs.closeSync(fd); // el hijo heredó su propio fd al archivo
  return child.pid;
}

/**
 * IPv4 de la red local, para abrir los servicios desde el celular.
 * Se puede forzar con `LAN_IP=192.168.x.x`.
 */
function lanIp() {
  if (process.env.LAN_IP) return process.env.LAN_IP;
  // Se descartan las interfaces virtuales (docker, puentes, VPNs): no son
  // alcanzables desde el celular aunque tengan IPv4.
  const virtual = /^(docker|br-|veth|virbr|vmnet|tun|tap|utun|wg|zt)/;
  const found = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (virtual.test(name)) continue;
    for (const a of addrs || []) {
      if (a.family === "IPv4" && !a.internal) found.push({ name, address: a.address });
    }
  }
  const rank = (n) =>
    n.startsWith("en") || n.startsWith("eth") || n.startsWith("wl") ? 0 : 1;
  found.sort((a, b) => rank(a.name) - rank(b.name));
  return found.length ? found[0].address : null;
}

/** Reemplaza el host localhost de una URL por la IP de la red local. */
function toLanUrl(url, ip) {
  return ip ? url.replace("//localhost", `//${ip}`) : null;
}

function printUrls(services, showDb) {
  const ip = lanIp();
  console.log("\n━━━━━━━━━━━━━ Punto C — URLs ━━━━━━━━━━━━━");
  for (const svc of services) {
    if (!svc.url) continue;
    // Los servicios marcados `lan` escuchan en 0.0.0.0: se pueden abrir desde
    // el celular con la IP del equipo.
    const lanUrl = svc.lan ? toLanUrl(svc.url, ip) : null;
    console.log(
      `  ${svc.name.toUpperCase().padEnd(8)} → ${svc.url}` +
        (lanUrl ? `   ·  red local: ${lanUrl}` : ""),
    );
  }
  if (showDb) console.log(`  DB       → PostgreSQL localhost:${DB_PORT} (docker)`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const started = services.map((s) => s.name).join(", ");
  console.log(`Logs: logs/*.log  (${started || "sin servicios"}).`);
}

function registerPid(name, pid) {
  let pids = {};
  try {
    pids = JSON.parse(fs.readFileSync(PIDS_FILE, "utf8"));
  } catch {
    /* sin archivo */
  }
  pids[name] = pid;
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.writeFileSync(PIDS_FILE, JSON.stringify(pids, null, 2));
}

// ── Detención ───────────────────────────────────────────────

function stopAll() {
  let pids = {};
  try {
    pids = JSON.parse(fs.readFileSync(PIDS_FILE, "utf8"));
  } catch {
    /* sin archivo de pids */
  }

  const entries = Object.entries(pids);
  if (!entries.length) console.log("No hay servicios registrados (logs/.pids.json).");
  for (const [name, pid] of entries) {
    try {
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"]);
      } else {
        process.kill(-pid, "SIGTERM"); // todo el grupo (procesos desacoplados)
      }
      console.log(`⏹  ${name} (pid ${pid})`);
    } catch {
      try {
        process.kill(pid, "SIGTERM");
        console.log(`⏹  ${name} (pid ${pid})`);
      } catch {
        console.log(`  ${name} ya no estaba corriendo`);
      }
    }
  }

  // Red de seguridad: liberar los puertos de los servicios.
  for (const svc of SERVICES) {
    if (svc.url) killPort(new URL(svc.url).port);
  }

  try {
    fs.unlinkSync(PIDS_FILE);
  } catch {
    /* noop */
  }
  console.log("\n💡 La BD (docker) sigue corriendo. Para detenerla: cd db/docker && docker compose stop");
}

// ── Ayuda (--help) ─────────────────────────────────────────

const APP_LABELS = {
  backend: "API NestJS + Drizzle (reservas, pedidos, meseros, KDS, admin)",
  client: "Web del cliente — reservas (plan 01) y pedidos (plan 02)",
  kitchen: "KDS de cocina (plan 04)",
  admin: "Panel de administración (plan 05)",
  waiter: "APK del mesero — prototipo web (plan 03)",
};

function selectorFlags() {
  const flags = [];
  for (const [alias, name] of Object.entries(APP_ALIASES)) {
    if (alias !== name) continue;
    flags.push(`--${alias}`);
  }
  return flags;
}

function printHelp() {
  const out = [];
  out.push("Punto C — lanzador de servicios\n");
  out.push("Uso:");
  out.push("  node dev.js                 Levanta todo (DB + backend + interfaces)");
  out.push("  node dev.js --install       Solo instala dependencias y sale");
  out.push("  node dev.js --prod          Modo producción (requiere builds previos)");
  out.push("  node dev.js --stop          Detiene lo levantado por dev.js");
  out.push("  node dev.js --help          Esta ayuda\n");
  out.push("Servicios (se pueden combinar; cada uno arrastra lo que necesita):");
  for (const [alias, name] of Object.entries(APP_ALIASES)) {
    if (alias !== name || name === "db") continue;
    const svc = SERVICES.find((s) => s.name === name);
    const url = svc ? `  ${svc.url}` : "";
    out.push(`  --${alias.padEnd(10)} ${(APP_LABELS[name] || "").padEnd(58)}${url}`);
  }
  out.push("  --db         Solo PostgreSQL (docker)");
  out.push("  --all        Todo (igual que sin flags)\n");
  out.push("Alias en español: --reservas --pedidos --kds --cocina --mesero --apk --bd\n");
  out.push("Ejemplos:");
  out.push("  node dev.js --client             # PostgreSQL + backend + web del cliente");
  out.push("  node dev.js --kds --admin        # ambas interfaces + backend + PostgreSQL");
  out.push("  node dev.js --install --client   # instala solo lo de la web del cliente");
  console.log(out.join("\n"));
}

function printCommands() {
  console.log("Comandos útiles:");
  console.log("  node dev.js --stop        detiene todo lo levantado");
  console.log("  node dev.js --install     instala dependencias faltantes");
  console.log("  cd db/docker && docker compose stop   detiene PostgreSQL");
  console.log("  tail -f logs/backend.log  sigue un log en vivo");
}

// ── Principal ───────────────────────────────────────────────

async function main() {
  if (HELP) {
    printHelp();
    return;
  }
  // Flag desconocido ⇒ no se ejecuta nada.
  const unknown = unknownFlags();
  if (unknown.length) {
    console.error(`✘ Flag(s) desconocido(s): ${unknown.join(", ")} — no se levanta nada.`);
    console.error("  Usa `node dev.js --help` para ver las opciones.");
    process.exit(1);
  }
  if (STOP) return stopAll();

  fs.mkdirSync(LOGS_DIR, { recursive: true });

  const plan = resolveSelection(); // null ⇒ todo
  const wantDb = plan === null || plan.includes("db");
  const svcNames =
    plan === null ? SERVICES.map((s) => s.name) : plan.filter((n) => n !== "db");
  const services = SERVICES.filter((s) => svcNames.includes(s.name));

  console.log(
    `🍽️  Punto C — modo ${MODE.toUpperCase()} · selección: ${selectionLabel(plan)}  (logs → logs/*.log)`,
  );
  if (PM === "npm")
    console.warn(
      `${C.admin}[pnpm]${C.reset} ⚠️  pnpm no está instalado — se usará npm como gestor de paquetes en las interfaces.`,
    );
  if (MODE === "prod")
    console.warn(
      `${C.admin}[prod]${C.reset} ⚠️  Modo producción: asegúrate de tener los builds (backend: ${BACKEND_PM} run build; webs: ${PM} run build).`,
    );
  console.log("");

  // 1. Instalar dependencias faltantes de los servicios elegidos.
  const sinDeps = new Set();
  for (const svc of services) {
    if (!ensureDeps(svc)) sinDeps.add(svc.name);
  }
  console.log("");

  if (INSTALL_ONLY) {
    const listos = services.filter((s) => !sinDeps.has(s.name)).map((s) => s.name);
    console.log(`✅ Dependencias al día: ${listos.join(", ") || "—"}`);
    if (sinDeps.size)
      console.error(`✘ Con problemas: ${[...sinDeps].join(", ")} (revisa el detalle arriba)`);
    process.exit(sinDeps.size ? 1 : 0);
  }

  // 2. Bases de datos.
  if (wantDb) {
    startDatabase();
    const dbUp = await waitForPort(DB_PORT, 90000);
    if (!dbUp) {
      console.warn(
        `${C.db}[db]${C.reset} ⚠️  PostgreSQL no responde en :${DB_PORT}; los servicios reintentarán al conectar.`,
      );
    }
  } else {
    console.log(`${C.db}[db]${C.reset} 🚫 PostgreSQL no iniciado (esta selección no lo necesita).`);
  }

  // 3. Servicios en segundo plano.
  const pids = {};
  for (const svc of services) {
    if (sinDeps.has(svc.name)) continue; // falló la instalación de dependencias
    const pid = startService(svc);
    if (pid) pids[svc.name] = pid;
  }
  if (Object.keys(pids).length) {
    fs.writeFileSync(PIDS_FILE, JSON.stringify(pids, null, 2));
  } else {
    try {
      fs.unlinkSync(PIDS_FILE);
    } catch {
      /* noop */
    }
  }

  // No liberar la terminal hasta que el backend esté montado: si se cierra
  // antes, el usuario no puede ver si arrancó bien o falló al revisar logs.
  const backendSvc = services.find((s) => s.name === "backend");
  if (backendSvc && backendSvc.url) {
    const backendPort = Number(new URL(backendSvc.url).port);
    console.log(
      `${C.backend}[backend]${C.reset} ⏳ esperando a que esté listo (${backendSvc.url})...`,
    );
    const backendUp = await waitForPort(backendPort, 120000);
    if (backendUp) {
      console.log(`${C.backend}[backend]${C.reset} ✅ Backend listo`);
    } else {
      console.warn(
        `${C.backend}[backend]${C.reset} ⚠️  No respondió en :${backendPort} — revisa logs/backend.log`,
      );
    }
  }

  printUrls(services, wantDb);
  console.log("\n✅ Listo — servicios en segundo plano. Terminal libre.");
  console.log("");
  printCommands();
  process.exit(0); // cierra el script; los servicios siguen en segundo plano
}

main();
