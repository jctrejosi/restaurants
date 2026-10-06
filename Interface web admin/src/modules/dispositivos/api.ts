import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError, api, registerMock, type MockContext } from "@/lib/api"
import {
  esVersionMenor,
  type DiagnosticoResp,
  type Dispositivo,
  type DispositivoEstado,
  type DispositivoTipo,
  type DispositivosFiltros,
  type DispositivosResp,
  type EstacionDispositivo,
  type GuardarVersionesPayload,
  type RevocarDispositivoPayload,
  type SyncOperacion,
  type TitularDispositivo,
  type VersionMinima,
  type VersionesMinimasResp,
  type VincularDispositivoPayload,
  type VincularDispositivoResp,
} from "@/modules/dispositivos/types"

/* -------------------------------------------------------------------------- */
/* Catálogos mock (módulos 07 y 17)                                            */
/* -------------------------------------------------------------------------- */

export const ESTACIONES_DISPOSITIVO: EstacionDispositivo[] = [
  { id: "est-parrilla", nombre: "Parrilla", tipo: "preparacion", activa: true },
  { id: "est-barra-fria", nombre: "Barra fría", tipo: "preparacion", activa: true },
  { id: "est-postres", nombre: "Postres", tipo: "preparacion", activa: true },
  { id: "est-plancha", nombre: "Plancha", tipo: "preparacion", activa: false },
  { id: "est-despacho", nombre: "Despacho", tipo: "despacho", activa: true },
]

export const TITULARES_DISPOSITIVO: TitularDispositivo[] = [
  { id: "u-002", nombre: "Luis Ramírez" },
  { id: "u-003", nombre: "Sofía Herrera" },
  { id: "u-004", nombre: "Ana Beltrán" },
  { id: "u-005", nombre: "Diego Sosa" },
  { id: "u-007", nombre: "Jorge Palacios" },
]

const SEDES_MOCK = [
  { id: "centro", nombre: "Punto C · Centro" },
  { id: "norte", nombre: "Punto C · Norte" },
]

export const VERSIONES_MINIMAS_INICIALES: VersionMinima[] = [
  { tipo: "apk", versionMinima: "2.3.0", forzar: true },
  { tipo: "kds", versionMinima: "2.0.0", forzar: true },
  { tipo: "caja", versionMinima: "3.0.0", forzar: false },
  { tipo: "print_agent", versionMinima: "1.4.0", forzar: false },
]

/* -------------------------------------------------------------------------- */
/* Semilla                                                                     */
/* -------------------------------------------------------------------------- */

const haceMin = (min: number) => new Date(Date.now() - Math.round(min * 60_000)).toISOString()
const haceDias = (dias: number) => haceMin(dias * 60 * 24)

let secuencia = 0
const nuevoId = (prefijo: string) => `${prefijo}-${++secuencia}`

const DISPOSITIVOS: Dispositivo[] = [
  {
    id: "d-apk-01",
    tipo: "apk",
    sucursalId: "centro",
    sucursalNombre: "Punto C · Centro",
    usuarioId: "u-002",
    usuarioNombre: "Luis Ramírez",
    versionApp: "2.4.1",
    ultimaConexionEn: haceMin(4),
    estado: "vinculado",
    creadoEn: haceDias(120),
    version: 2,
  },
  {
    id: "d-apk-02",
    tipo: "apk",
    sucursalId: "centro",
    sucursalNombre: "Punto C · Centro",
    usuarioId: "u-003",
    usuarioNombre: "Sofía Herrera",
    versionApp: "2.4.1",
    ultimaConexionEn: haceMin(2),
    estado: "vinculado",
    creadoEn: haceDias(95),
    version: 1,
  },
  {
    id: "d-apk-03",
    tipo: "apk",
    sucursalId: "norte",
    sucursalNombre: "Punto C · Norte",
    usuarioId: "u-004",
    usuarioNombre: "Ana Beltrán",
    versionApp: "2.2.7",
    ultimaConexionEn: haceMin(150),
    estado: "vinculado",
    creadoEn: haceDias(60),
    version: 3,
  },
  {
    id: "d-kds-01",
    tipo: "kds",
    sucursalId: "centro",
    sucursalNombre: "Punto C · Centro",
    estacionId: "est-parrilla",
    estacionNombre: "Parrilla",
    versionApp: "1.9.4",
    ultimaConexionEn: haceMin(34),
    estado: "vinculado",
    creadoEn: haceDias(210),
    version: 4,
  },
  {
    id: "d-kds-02",
    tipo: "kds",
    sucursalId: "centro",
    sucursalNombre: "Punto C · Centro",
    estacionId: "est-barra-fria",
    estacionNombre: "Barra fría",
    versionApp: "2.0.1",
    ultimaConexionEn: haceMin(1),
    estado: "vinculado",
    creadoEn: haceDias(180),
    version: 2,
  },
  {
    id: "d-kds-03",
    tipo: "kds",
    sucursalId: "norte",
    sucursalNombre: "Punto C · Norte",
    estacionId: "est-plancha",
    estacionNombre: "Plancha",
    versionApp: "2.0.1",
    ultimaConexionEn: null,
    estado: "vinculado",
    creadoEn: haceDias(45),
    version: 1,
  },
  {
    id: "d-caja-01",
    tipo: "caja",
    sucursalId: "centro",
    sucursalNombre: "Punto C · Centro",
    versionApp: "3.1.0",
    ultimaConexionEn: haceMin(1),
    estado: "vinculado",
    creadoEn: haceDias(300),
    version: 5,
  },
  {
    id: "d-caja-02",
    tipo: "caja",
    sucursalId: "norte",
    sucursalNombre: "Punto C · Norte",
    versionApp: "2.8.0",
    ultimaConexionEn: haceMin(12),
    estado: "vinculado",
    creadoEn: haceDias(240),
    version: 2,
  },
  {
    id: "d-print-01",
    tipo: "print_agent",
    sucursalId: "centro",
    sucursalNombre: "Punto C · Centro",
    versionApp: "1.2.0",
    ultimaConexionEn: haceMin(18),
    estado: "vinculado",
    creadoEn: haceDias(90),
    version: 1,
  },
  {
    id: "d-apk-04",
    tipo: "apk",
    sucursalId: "norte",
    sucursalNombre: "Punto C · Norte",
    usuarioId: "u-008",
    usuarioNombre: "Pablo Núñez",
    versionApp: "2.1.0",
    ultimaConexionEn: haceDias(22),
    estado: "revocado",
    creadoEn: haceDias(400),
    version: 7,
  },
]

let VERSIONES_MINIMAS: VersionMinima[] = [...VERSIONES_MINIMAS_INICIALES]

const HISTORIAL: Record<string, { id: string; evento: string; creadoEn: string }[]> = {
  "d-kds-01": [
    { id: "h-1", evento: "Conexión establecida", creadoEn: haceMin(34) },
    { id: "h-2", evento: "Sincronización con 3 pendientes", creadoEn: haceMin(36) },
    { id: "h-3", evento: "Error de impresión: timeout", creadoEn: haceMin(40) },
  ],
  "d-kds-03": [
    { id: "h-4", evento: "Dispositivo creado", creadoEn: haceDias(45) },
    { id: "h-5", evento: "Sin conexión desde el alta", creadoEn: haceDias(45) },
  ],
  "d-apk-04": [
    { id: "h-6", evento: "Revocado: equipo devuelto", creadoEn: haceDias(22) },
    { id: "h-7", evento: "Intento de operación con token revocado (rechazado)", creadoEn: haceDias(21) },
  ],
}

const OPERACIONES: Record<string, SyncOperacion[]> = {
  "d-kds-01": [
    {
      id: "op-1",
      clientOpId: "co-8831-1",
      tipo: "comanda.estado",
      estado: "pendiente",
      creadoEn: haceMin(36),
      aplicadoEn: null,
      error: null,
    },
    {
      id: "op-2",
      clientOpId: "co-8831-2",
      tipo: "comanda.estado",
      estado: "rechazada",
      creadoEn: haceMin(40),
      aplicadoEn: null,
      error: "Transición inválida: la comanda ya estaba lista",
    },
  ],
  "d-kds-03": [
    {
      id: "op-3",
      clientOpId: "co-4001-1",
      tipo: "comanda.crear",
      estado: "pendiente",
      creadoEn: haceDias(1),
      aplicadoEn: null,
      error: null,
    },
    {
      id: "op-4",
      clientOpId: "co-4001-2",
      tipo: "comanda.estado",
      estado: "pendiente",
      creadoEn: haceDias(1),
      aplicadoEn: null,
      error: null,
    },
  ],
  "d-apk-04": [
    {
      id: "op-5",
      clientOpId: "co-7100-1",
      tipo: "propina.registrar",
      estado: "rechazada",
      creadoEn: haceDias(21),
      aplicadoEn: null,
      error: "Token revocado (410): el dispositivo dejó de operar",
    },
  ],
}

const ALERTAS: Record<string, DiagnosticoResp["alertas"]> = {
  "d-kds-01": [
    {
      id: "a-sync",
      titulo: "Sincronización pendiente",
      detalle: "KDS Parrilla · 1 operación pendiente y 1 rechazada",
      severidad: "media",
      estado: "abierta",
      creadaEn: haceMin(8),
    },
  ],
  "d-kds-03": [
    {
      id: "a-sin-conexion",
      titulo: "Dispositivo sin conexión",
      detalle: "KDS Plancha (Norte) nunca se ha conectado desde el alta",
      severidad: "alta",
      estado: "abierta",
      creadaEn: haceDias(44),
    },
  ],
  "d-apk-04": [
    {
      id: "a-revocado",
      titulo: "Operación de dispositivo revocado",
      detalle: "APK de Pablo Núñez intentó operar con token revocado",
      severidad: "critica",
      estado: "abierta",
      creadaEn: haceDias(21),
    },
  ],
}

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                  */
/* -------------------------------------------------------------------------- */

const texto = (valor: unknown): string => String(valor ?? "").trim()

function versionMinimaDe(tipo: DispositivoTipo): VersionMinima | undefined {
  return VERSIONES_MINIMAS.find((item) => item.tipo === tipo)
}

export function dispositivoDesactualizado(dispositivo: Dispositivo): boolean {
  const politica = versionMinimaDe(dispositivo.tipo)
  if (!politica) return false
  // «—» = equipo recién vinculado que aún no reporta versión: no se marca.
  if (!/^\d+(\.\d+)*$/.test(dispositivo.versionApp)) return false
  return esVersionMenor(dispositivo.versionApp, politica.versionMinima)
}

function validarMotivo(motivo: string | undefined): string {
  const limpio = texto(motivo)
  if (limpio.length < 3) {
    throw new ApiError(422, "El motivo es obligatorio (mínimo 3 caracteres)", "motivo_requerido")
  }
  return limpio
}

function buscarDispositivo(id: string): Dispositivo {
  const dispositivo = DISPOSITIVOS.find((item) => item.id === id)
  if (!dispositivo) throw new ApiError(404, "El dispositivo no existe", "dispositivo_no_encontrado")
  return dispositivo
}

function tokenDeUnSoloUso(): string {
  const bloque = () => Math.random().toString(36).slice(2, 6).toUpperCase()
  return `VINC-${bloque()}-${bloque()}`
}

function parqueInstalado(): VersionesMinimasResp["parque"] {
  return {
    apk: parqueDeTipo("apk"),
    kds: parqueDeTipo("kds"),
    caja: parqueDeTipo("caja"),
    print_agent: parqueDeTipo("print_agent"),
  }
}

function parqueDeTipo(tipo: DispositivoTipo): { total: number; desactualizados: number } {
  const delTipo = DISPOSITIVOS.filter((item) => item.tipo === tipo)
  return { total: delTipo.length, desactualizados: delTipo.filter(dispositivoDesactualizado).length }
}

function respuestaVersiones(): VersionesMinimasResp {
  return { versiones: VERSIONES_MINIMAS.map((item) => ({ ...item })), parque: parqueInstalado() }
}

/* -------------------------------------------------------------------------- */
/* Mocks                                                                       */
/* -------------------------------------------------------------------------- */

/** GET /admin/dispositivos — inventario paginado con filtros y resumen. */
registerMock("GET", /^\/admin\/dispositivos$/, (ctx) => {
  const busqueda = texto(ctx.query.q).toLowerCase()
  const tipo = texto(ctx.query.tipo) as DispositivoTipo | ""
  const estado = texto(ctx.query.estado) as DispositivoEstado | ""
  const soloDesactualizados = texto(ctx.query.desactualizados) === "true"
  const sedeId = texto(ctx.query.sede) || texto(ctx.query.sucursal)
  const page = Math.max(1, Number(ctx.query.page) || 1)
  const pageSize = Math.max(1, Number(ctx.query.pageSize) || 10)

  const filtrados = DISPOSITIVOS.filter((dispositivo) => {
    if (tipo && dispositivo.tipo !== tipo) return false
    if (estado && dispositivo.estado !== estado) return false
    if (sedeId && dispositivo.sucursalId !== sedeId) return false
    if (soloDesactualizados && !dispositivoDesactualizado(dispositivo)) return false
    if (busqueda) {
      const heno = `${dispositivo.id} ${dispositivo.usuarioNombre ?? ""} ${
        dispositivo.estacionNombre ?? ""
      } ${dispositivo.sucursalNombre}`.toLowerCase()
      if (!heno.includes(busqueda)) return false
    }
    return true
  })

  const respuesta: DispositivosResp = {
    data: filtrados.slice((page - 1) * pageSize, page * pageSize),
    total: filtrados.length,
    page,
    pageSize,
    resumen: {
      vinculados: DISPOSITIVOS.filter((item) => item.estado === "vinculado").length,
      revocados: DISPOSITIVOS.filter((item) => item.estado === "revocado").length,
      desactualizados: DISPOSITIVOS.filter(dispositivoDesactualizado).length,
      sinConexion: DISPOSITIVOS.filter((item) => item.ultimaConexionEn === null).length,
    },
  }
  return respuesta
})

/** GET /admin/dispositivos/versiones-minimas — política vigente y parque (V1). */
registerMock("GET", /^\/admin\/dispositivos\/versiones-minimas$/, () => respuestaVersiones())

/** PUT /admin/dispositivos/versiones-minimas — política sensible con motivo (V1). */
registerMock("PUT", /^\/admin\/dispositivos\/versiones-minimas$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<GuardarVersionesPayload>
  validarMotivo(body.motivo)
  const versiones = body.versiones ?? []
  for (const item of versiones) {
    if (!/^\d+\.\d+\.\d+$/.test(item.versionMinima)) {
      throw new ApiError(422, `Versión inválida para ${item.tipo}: usa el formato x.y.z`, "version_invalida")
    }
  }
  if (versiones.length === 0) throw new ApiError(422, "La política no puede quedar vacía", "versiones_requeridas")
  VERSIONES_MINIMAS = versiones.map((item) => ({ ...item }))
  return respuestaVersiones()
})

/** POST /admin/dispositivos — alta y vinculación; devuelve token de un solo uso. */
registerMock("POST", /^\/admin\/dispositivos$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<VincularDispositivoPayload>
  const tipo = body.tipo as DispositivoTipo | undefined
  if (!tipo) throw new ApiError(422, "Selecciona el tipo de dispositivo", "tipo_requerido")
  const sede = SEDES_MOCK.find((item) => item.id === body.sucursalId)
  if (!sede) throw new ApiError(422, "Selecciona una sede válida", "sede_requerida")
  if (tipo === "kds") {
    const estacion = ESTACIONES_DISPOSITIVO.find((item) => item.id === body.estacionId)
    if (!estacion) throw new ApiError(422, "Un KDS necesita estación asignada", "estacion_requerida")
    if (!estacion.activa) {
      throw new ApiError(
        409,
        `La estación ${estacion.nombre} está inactiva: el enrutado de comandas puede fallar`,
        "estacion_inactiva",
      )
    }
  }
  if (tipo === "apk") {
    const titular = TITULARES_DISPOSITIVO.find((item) => item.id === body.usuarioId)
    if (!titular) throw new ApiError(422, "El APK se vincula a un mesero titular", "usuario_requerido")
  }
  const dispositivo: Dispositivo = {
    id: nuevoId("d"),
    tipo,
    sucursalId: sede.id,
    sucursalNombre: sede.nombre,
    usuarioId: tipo === "apk" ? body.usuarioId : undefined,
    usuarioNombre:
      tipo === "apk" ? TITULARES_DISPOSITIVO.find((item) => item.id === body.usuarioId)?.nombre : undefined,
    estacionId: tipo === "kds" ? body.estacionId : undefined,
    estacionNombre:
      tipo === "kds"
        ? ESTACIONES_DISPOSITIVO.find((item) => item.id === body.estacionId)?.nombre
        : undefined,
    versionApp: "—",
    ultimaConexionEn: null,
    estado: "vinculado",
    creadoEn: new Date().toISOString(),
    version: 1,
  }
  DISPOSITIVOS.push(dispositivo)
  const respuesta: VincularDispositivoResp = {
    dispositivo,
    token: tokenDeUnSoloUso(),
    expiraEn: new Date(Date.now() + 15 * 60_000).toISOString(),
  }
  return respuesta
})

/** PATCH /admin/dispositivos/:id — estación o titular (auditado). */
registerMock("PATCH", /^\/admin\/dispositivos\/([^/]+)$/, (ctx) => {
  const id = ctx.path.match(/^\/admin\/dispositivos\/([^/]+)$/)?.[1] ?? ""
  const dispositivo = buscarDispositivo(id)
  const body = (ctx.body ?? {}) as { usuarioId?: string | null; estacionId?: string | null }
  if (dispositivo.tipo === "kds" && body.estacionId !== undefined) {
    if (body.estacionId === null) {
      throw new ApiError(422, "Un KDS no puede quedarse sin estación", "estacion_requerida")
    }
    const estacion = ESTACIONES_DISPOSITIVO.find((item) => item.id === body.estacionId)
    if (!estacion) throw new ApiError(422, "La estación no existe", "estacion_invalida")
    dispositivo.estacionId = estacion.id
    dispositivo.estacionNombre = estacion.nombre
  }
  if (dispositivo.tipo === "apk" && body.usuarioId !== undefined) {
    if (body.usuarioId === null) {
      throw new ApiError(422, "El APK necesita un mesero titular", "usuario_requerido")
    }
    const titular = TITULARES_DISPOSITIVO.find((item) => item.id === body.usuarioId)
    if (!titular) throw new ApiError(422, "El titular no existe", "usuario_invalido")
    dispositivo.usuarioId = titular.id
    dispositivo.usuarioNombre = titular.nombre
  }
  dispositivo.version += 1
  return dispositivo
})

/** POST /admin/dispositivos/:id/vincular — (re)vincula y rota el token. */
function resolverVinculacion(ctx: MockContext): VincularDispositivoResp {
  const id = ctx.path.match(/^\/admin\/dispositivos\/([^/]+)\/(vincular|revincular)$/)?.[1] ?? ""
  const dispositivo = buscarDispositivo(id)
  const body = (ctx.body ?? {}) as { motivo?: string }
  if (dispositivo.estado === "revocado" && texto(body.motivo).length < 3) {
    throw new ApiError(422, "Revinculación: el motivo es obligatorio (mínimo 3 caracteres)", "motivo_requerido")
  }
  dispositivo.estado = "vinculado"
  dispositivo.version += 1
  const respuesta: VincularDispositivoResp = {
    dispositivo,
    token: tokenDeUnSoloUso(),
    expiraEn: new Date(Date.now() + 15 * 60_000).toISOString(),
  }
  return respuesta
}

registerMock("POST", /^\/admin\/dispositivos\/([^/]+)\/vincular$/, resolverVinculacion)

/** Alias del plan 18 §5: `POST /admin/dispositivos/:id/revincular`. */
registerMock("POST", /^\/admin\/dispositivos\/([^/]+)\/revincular$/, resolverVinculacion)

/** POST /admin/dispositivos/:id/revocar — el equipo deja de operar (RF-R5-150). */
registerMock("POST", /^\/admin\/dispositivos\/([^/]+)\/revocar$/, (ctx) => {
  const id = ctx.path.match(/^\/admin\/dispositivos\/([^/]+)\/revocar$/)?.[1] ?? ""
  const dispositivo = buscarDispositivo(id)
  const body = (ctx.body ?? {}) as Partial<RevocarDispositivoPayload>
  validarMotivo(body.motivo)
  if (dispositivo.estado === "revocado") {
    throw new ApiError(409, "El dispositivo ya está revocado", "dispositivo_revocado")
  }
  dispositivo.estado = "revocado"
  dispositivo.version += 1
  return dispositivo
})

/** GET /admin/dispositivos/:id/diagnostico — pendientes, errores y alertas (V1). */
registerMock("GET", /^\/admin\/dispositivos\/([^/]+)\/diagnostico$/, (ctx) => {
  const id = ctx.path.match(/^\/admin\/dispositivos\/([^/]+)\/diagnostico$/)?.[1] ?? ""
  const dispositivo = buscarDispositivo(id)
  const operaciones = OPERACIONES[id] ?? []
  const pendientes = operaciones.filter((operacion) => operacion.estado === "pendiente")
  const rechazadas = operaciones.filter((operacion) => operacion.estado === "rechazada")
  const respuesta: DiagnosticoResp = {
    dispositivo,
    operacionesPendientes: pendientes.length,
    operacionesRechazadas: rechazadas.length,
    ultimoError: rechazadas[0]?.error ?? null,
    operaciones,
    alertas: ALERTAS[id] ?? [],
    historial: HISTORIAL[id] ?? [
      { id: `h-${id}-alta`, evento: "Dispositivo creado", creadoEn: dispositivo.creadoEn },
    ],
  }
  return respuesta
})

/** GET /admin/dispositivos/:id — ficha (se registra al final: es la más genérica). */
registerMock("GET", /^\/admin\/dispositivos\/([^/]+)$/, (ctx) => {
  const id = ctx.path.match(/^\/admin\/dispositivos\/([^/]+)$/)?.[1] ?? ""
  return buscarDispositivo(id)
})

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function useDispositivos(filtros: DispositivosFiltros) {
  return useQuery({
    queryKey: ["dispositivos", "lista", filtros],
    queryFn: () =>
      api.get<DispositivosResp>("/admin/dispositivos", {
        page: filtros.page,
        pageSize: filtros.pageSize,
        q: filtros.busqueda,
        tipo: filtros.tipo,
        estado: filtros.estado,
        desactualizados: filtros.desactualizados ? "true" : undefined,
        sede: filtros.sedeId,
      }),
    refetchInterval: 30_000,
  })
}

export function useDispositivo(id: string | null) {
  return useQuery({
    queryKey: ["dispositivos", "detalle", id],
    queryFn: () => api.get<Dispositivo>(`/admin/dispositivos/${id}`),
    enabled: Boolean(id),
  })
}

export function useDiagnosticoDispositivo(id: string | null) {
  return useQuery({
    queryKey: ["dispositivos", "diagnostico", id],
    queryFn: () => api.get<DiagnosticoResp>(`/admin/dispositivos/${id}/diagnostico`),
    enabled: Boolean(id),
  })
}

export function useVersionesMinimas() {
  return useQuery({
    queryKey: ["dispositivos", "versiones-minimas"],
    queryFn: () => api.get<VersionesMinimasResp>("/admin/dispositivos/versiones-minimas"),
  })
}

export function useVincularDispositivo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: VincularDispositivoPayload) =>
      api.post<VincularDispositivoResp>("/admin/dispositivos", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dispositivos"] })
    },
  })
}

export function useRevincularDispositivo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) =>
      api.post<VincularDispositivoResp>(`/admin/dispositivos/${id}/vincular`, { motivo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dispositivos"] })
    },
  })
}

export function useRevocarDispositivo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: RevocarDispositivoPayload) =>
      api.post<Dispositivo>(`/admin/dispositivos/${id}/revocar`, { motivo }),
    onSuccess: (_dispositivo, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["dispositivos"] })
      void queryClient.invalidateQueries({ queryKey: ["dispositivos", "detalle", vars.id] })
    },
  })
}

export function useEditarDispositivo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; usuarioId?: string | null; estacionId?: string | null }) =>
      api.patch<Dispositivo>(`/admin/dispositivos/${id}`, payload),
    onSuccess: (_dispositivo, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["dispositivos"] })
      void queryClient.invalidateQueries({ queryKey: ["dispositivos", "detalle", vars.id] })
    },
  })
}

export function useGuardarVersionesMinimas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: GuardarVersionesPayload) =>
      api.put<VersionesMinimasResp>("/admin/dispositivos/versiones-minimas", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dispositivos"] })
    },
  })
}
