/**
 * Cliente HTTP del panel de administración.
 *
 * Convenciones (ver `docs/arquitectura/plans/admin-modules/00-indice.md` §4.1):
 *   - REST JSON bajo `/admin/…`.
 *   - Paginación `page`/`pageSize`; filtros por query; la sede activa se añade siempre.
 *   - Los errores se normalizan a `ApiError`.
 *
 * Mientras la API NestJS no exponga los endpoints, los módulos registran *mocks*
 * de desarrollo con `registerMock` (ver `VITE_USE_MOCKS`). El paso a la API real
 * no cambia los hooks: basta con desactivar los mocks.
 */

export type Query = Record<string, string | number | boolean | null | undefined>

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE"

const API_URL =
  ((import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001").replace(/\/$/, "")

/** Mocks activos salvo que `VITE_USE_MOCKS=false`. */
export const USE_MOCKS = (import.meta.env.VITE_USE_MOCKS as string | undefined) !== "false"

export const API_BASE_URL = API_URL

const SUCURSAL_PARAM = "sucursal"

let activeSucursalId: string | null = null

export function setActiveSucursalId(id: string | null): void {
  activeSucursalId = id
}

export function getActiveSucursalId(): string | null {
  return activeSucursalId
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly codigo?: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/* -------------------------------------------------------------------------- */
/* Mocks de desarrollo                                                         */
/* -------------------------------------------------------------------------- */

export type MockContext = {
  method: HttpMethod
  path: string
  query: Query
  body?: unknown
}

type MockResolver = (ctx: MockContext) => unknown | Promise<unknown>

type MockEntry = {
  method: HttpMethod
  pattern: RegExp
  resolver: MockResolver
}

const mockRegistry: MockEntry[] = []

/**
 * Registra una respuesta simulada para un `método + ruta` mientras la API no exista.
 * El primer mock que coincide gana; el orden de registro importa.
 */
export function registerMock(method: HttpMethod, pattern: RegExp, resolver: MockResolver): void {
  mockRegistry.push({ method, pattern, resolver })
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function resolveMock(
  ctx: MockContext,
): Promise<{ found: true; value: unknown } | { found: false }> {
  const entry = mockRegistry.find((mock) => mock.method === ctx.method && mock.pattern.test(ctx.path))
  if (!entry) return { found: false }
  await delay(140)
  return { found: true, value: await entry.resolver(ctx) }
}

/* -------------------------------------------------------------------------- */
/* Transporte                                                                  */
/* -------------------------------------------------------------------------- */

function buildUrl(path: string, query?: Query): string {
  const base = path.startsWith("http") ? path : `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`
  const url = new URL(base)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  }
  if (activeSucursalId && !url.searchParams.has(SUCURSAL_PARAM)) {
    url.searchParams.set(SUCURSAL_PARAM, activeSucursalId)
  }
  return url.toString()
}

function authHeaders(): Record<string, string> {
  if (typeof localStorage === "undefined") return {}
  const token = localStorage.getItem("pc_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(method: HttpMethod, path: string, body?: unknown, query?: Query): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...authHeaders(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  })

  if (!response.ok) {
    let payload: { message?: string; codigo?: string } = {}
    try {
      payload = (await response.json()) as typeof payload
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw new ApiError(response.status, payload.message ?? `Error ${response.status}`, payload.codigo)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

async function call<T>(method: HttpMethod, path: string, body?: unknown, query?: Query): Promise<T> {
  if (USE_MOCKS) {
    const mock = await resolveMock({ method, path, query: query ?? {}, body })
    if (mock.found) return mock.value as T
  }
  return request<T>(method, path, body, query)
}

export const api = {
  get: <T>(path: string, query?: Query) => call<T>("GET", path, undefined, query),
  post: <T>(path: string, body?: unknown, query?: Query) => call<T>("POST", path, body, query),
  patch: <T>(path: string, body?: unknown, query?: Query) => call<T>("PATCH", path, body, query),
  put: <T>(path: string, body?: unknown, query?: Query) => call<T>("PUT", path, body, query),
  delete: <T>(path: string, query?: Query) => call<T>("DELETE", path, undefined, query),
}
