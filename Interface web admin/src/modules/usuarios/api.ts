import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSyncExternalStore } from "react"
import { ApiError, api, registerMock } from "@/lib/api"
import type {
  AccionUsuario,
  CambiarEstadoUsuarioPayload,
  ConcederPermisoTemporalPayload,
  CrearRolPayload,
  CrearUsuarioPayload,
  DosFaPayload,
  EditarRolPayload,
  EditarUsuarioPayload,
  EventoActividad,
  GuardarPermisosRolPayload,
  GuardarRolesUsuarioPayload,
  PermisoCatalogo,
  PermisoTemporal,
  Rol,
  RolPermisosResp,
  SesionActiva,
  Usuario,
  UsuarioDetalleResp,
  UsuarioEstado,
  UsuarioFiltros,
  UsuariosResp,
} from "@/modules/usuarios/types"

/* -------------------------------------------------------------------------- */
/* Sesión simulada (efecto inmediato de un permiso retirado, RF-R5-140)        */
/* -------------------------------------------------------------------------- */

type SesionState = { version: number; razon: string; actualizadoEn: string }

let sesionState: SesionState = {
  version: 0,
  razon: "Sesión simulada al día",
  actualizadoEn: new Date().toISOString(),
}

const sesionListeners = new Set<() => void>()

/** El front invalida el `me`; aquí se emula la re-evaluación del guard. */
export function refrescarSesionSimulada(razon: string): void {
  sesionState = { version: sesionState.version + 1, razon, actualizadoEn: new Date().toISOString() }
  sesionListeners.forEach((listener) => listener())
}

export function useSesionSimulada(): SesionState {
  return useSyncExternalStore(
    (listener) => {
      sesionListeners.add(listener)
      return () => sesionListeners.delete(listener)
    },
    () => sesionState,
  )
}

/* -------------------------------------------------------------------------- */
/* Semilla mock                                                                */
/* -------------------------------------------------------------------------- */

let secuencia = 0
const nuevoId = (prefijo: string) => `${prefijo}-${++secuencia}`

const haceMin = (min: number) => new Date(Date.now() - Math.round(min * 60_000)).toISOString()
const enHoras = (horas: number) => new Date(Date.now() + horas * 3_600_000).toISOString()

const texto = (valor: unknown): string => String(valor ?? "").trim()

function permiso(
  codigo: string,
  descripcion: string,
  modulo: string,
  sensible = false,
  alcance: PermisoCatalogo["alcance"] = "sucursal",
): PermisoCatalogo {
  return { codigo, descripcion, modulo, sensible, alcance }
}

export const PERMISOS: PermisoCatalogo[] = [
  permiso("pedidos.ver", "Ver pedidos y su detalle", "pedidos"),
  permiso("pedidos.crear", "Crear pedidos", "pedidos"),
  permiso("pedidos.editar", "Editar pedidos en captura", "pedidos"),
  permiso("pedidos.cancelar", "Cancelar pedidos", "pedidos"),
  permiso("pedidos.descuento", "Aplicar descuentos", "pedidos"),
  permiso("pedidos.anular_tras_preparacion", "Anular tras preparación", "pedidos", true),
  permiso("comandas.ver", "Ver comandas y su monitor", "comandas"),
  permiso("comandas.avanzar", "Avanzar estados de comanda", "comandas"),
  permiso("comandas.anular", "Anular comandas", "comandas"),
  permiso("comandas.reimprimir", "Reimprimir comandas", "comandas"),
  permiso("comandas.reasignar", "Reasignar comandas de estación", "comandas"),
  permiso("caja.ver", "Ver caja y turnos", "caja"),
  permiso("caja.abrir", "Abrir turno de caja", "caja"),
  permiso("caja.cerrar", "Cerrar turno de caja", "caja"),
  permiso("caja.movimientos", "Registrar movimientos de caja", "caja"),
  permiso("caja.reabrir", "Reabrir caja cerrada", "caja", true),
  permiso("pagos.ver", "Ver pagos y propinas", "pagos"),
  permiso("pagos.cobrar", "Cobrar y registrar pagos", "pagos"),
  permiso("pagos.reembolsar", "Reembolsar y emitir notas crédito", "pagos", true),
  permiso("catalogo.ver", "Ver catálogo y precios", "catalogo"),
  permiso("catalogo.editar", "Editar productos y modificadores", "catalogo"),
  permiso("catalogo.agotados", "Marcar agotados y disponibilidad", "catalogo"),
  permiso("catalogo.cambiar_precios", "Cambiar precios de venta", "catalogo", true),
  permiso("clientes.ver", "Ver clientes", "clientes"),
  permiso("clientes.editar", "Editar clientes y consentimientos", "clientes"),
  permiso("clientes.ver_pii", "Ver datos personales sin enmascarar", "clientes", true),
  permiso("reservas.ver", "Ver reservas y lista de espera", "reservas"),
  permiso("reservas.crear", "Crear reservas", "reservas"),
  permiso("reservas.editar", "Editar y reubicar reservas", "reservas"),
  permiso("reservas.cancelar", "Cancelar reservas", "reservas"),
  permiso("salon.ver", "Ver mapa de salón", "salon"),
  permiso("salon.mover_mesas", "Mover y unir mesas", "salon"),
  permiso("salon.unir_mesas", "Unir mesas y trasladar cuentas", "salon"),
  permiso("domicilio.ver", "Ver domicilio y reparto", "domicilio"),
  permiso("domicilio.asignar", "Asignar repartidores", "domicilio"),
  permiso("domicilio.liquidar", "Liquidar repartidores", "domicilio"),
  permiso("promociones.ver", "Ver promociones y cupones", "promociones"),
  permiso("promociones.editar", "Editar promociones y cupones", "promociones"),
  permiso("reportes.ver", "Ver reportes", "reportes"),
  permiso("reportes.exportar", "Exportar reportes", "reportes"),
  permiso("tiempos.ver", "Ver tiempos y SLA", "tiempos"),
  permiso("auditoria.ver", "Consultar auditoría", "auditoria"),
  permiso("facturacion.ver", "Ver facturación", "facturacion"),
  permiso("usuarios.ver", "Ver usuarios", "usuarios", false, "global"),
  permiso("usuarios.crear", "Crear usuarios", "usuarios", false, "global"),
  permiso("usuarios.editar", "Editar usuarios", "usuarios", false, "global"),
  permiso("usuarios.suspender", "Suspender y reactivar usuarios", "usuarios", false, "global"),
  permiso("usuarios.baja", "Dar de baja usuarios", "usuarios", true, "global"),
  permiso("usuarios.roles", "Asignar roles y alcance", "usuarios", true, "global"),
  permiso("usuarios.2fa", "Gestionar el segundo factor", "usuarios", true, "global"),
  permiso("usuarios.sesiones", "Ver y revocar sesiones", "usuarios", false, "global"),
  permiso("usuarios.permisos_temporales", "Conceder permisos por turno", "usuarios", true, "global"),
  permiso("roles.ver", "Ver roles y plantillas", "roles", false, "global"),
  permiso("roles.editar", "Editar roles", "roles", false, "global"),
  permiso("roles.clonar", "Clonar plantillas de rol", "roles", false, "global"),
  permiso("roles.permisos", "Editar la matriz de permisos", "roles", true, "global"),
  permiso("dispositivos.ver", "Ver dispositivos", "dispositivos"),
  permiso("dispositivos.vincular", "Vincular y revincular dispositivos", "dispositivos"),
  permiso("dispositivos.editar", "Editar estación o titular", "dispositivos"),
  permiso("dispositivos.revocar", "Revocar dispositivos", "dispositivos", true),
  permiso("dispositivos.version", "Definir versiones mínimas", "dispositivos", true, "global"),
  permiso("dispositivos.diagnostico", "Ver diagnóstico de dispositivos", "dispositivos"),
  permiso("ajustes.ver", "Ver configuración de la sucursal", "ajustes"),
  permiso("ajustes.editar", "Editar operación, horarios y ventanas", "ajustes"),
  permiso("ajustes.global", "Cambiar impuestos y configuración global", "ajustes", true, "global"),
  permiso("sucursales.crear", "Dar de alta sucursales", "sucursales", true, "global"),
  permiso("notificaciones.ver", "Ver plantillas de notificación", "notificaciones"),
  permiso("notificaciones.editar", "Editar plantillas de notificación", "notificaciones"),
]

type RolInterno = Omit<Rol, "permisosCount" | "usuariosCount"> & { permisos: string[] }

const TODOS = PERMISOS.map((item) => item.codigo)

const ROLES: RolInterno[] = [
  {
    id: "rol-admin-global",
    nombre: "Administrador global",
    descripcion: "Gobierno del tenant: usuarios, roles, dispositivos y configuración global.",
    esSistema: true,
    permisos: TODOS,
    version: 1,
  },
  {
    id: "rol-gerente",
    nombre: "Gerente de sede",
    descripcion: "Opera y administra su sucursal: equipo, caja, catálogo y ajustes de sede.",
    esSistema: true,
    permisos: [
      ...TODOS.filter((codigo) =>
        /^(pedidos|comandas|caja|pagos|catalogo|clientes|reservas|salon|domicilio|promociones|reportes|tiempos|auditoria|dispositivos|ajustes|notificaciones)\./.test(
          codigo,
        ),
      ),
      "usuarios.ver",
      "usuarios.crear",
      "usuarios.editar",
      "usuarios.suspender",
      "roles.ver",
    ],
    version: 3,
  },
  {
    id: "rol-mesero",
    nombre: "Mesero",
    descripcion: "Toma pedidos en salón, consulta mesas y sigue sus comandas.",
    esSistema: true,
    permisos: [
      "pedidos.ver",
      "pedidos.crear",
      "comandas.ver",
      "comandas.avanzar",
      "salon.ver",
      "salon.mover_mesas",
      "clientes.ver",
      "pagos.ver",
      "reservas.ver",
    ],
    version: 2,
  },
  {
    id: "rol-cajero",
    nombre: "Cajero",
    descripcion: "Cobra, opera el turno de caja y concilia pagos.",
    esSistema: true,
    permisos: [
      "pedidos.ver",
      "pagos.ver",
      "pagos.cobrar",
      "caja.ver",
      "caja.abrir",
      "caja.cerrar",
      "caja.movimientos",
      "reportes.ver",
    ],
    version: 2,
  },
  {
    id: "rol-capitan",
    nombre: "Capitán",
    descripcion: "Coordina el servicio de piso, comandas y reasignaciones.",
    esSistema: true,
    permisos: [
      "pedidos.ver",
      "pedidos.crear",
      "pedidos.editar",
      "pedidos.descuento",
      "comandas.ver",
      "comandas.avanzar",
      "comandas.reimprimir",
      "comandas.reasignar",
      "salon.ver",
      "salon.mover_mesas",
      "salon.unir_mesas",
      "clientes.ver",
      "reservas.ver",
    ],
    version: 1,
  },
  {
    id: "rol-chef",
    nombre: "Chef",
    descripcion: "Dirige cocina: comandas, agotados y disponibilidad.",
    esSistema: true,
    permisos: ["comandas.ver", "comandas.avanzar", "comandas.anular", "catalogo.ver", "catalogo.agotados", "pedidos.ver"],
    version: 1,
  },
  {
    id: "rol-marketing",
    nombre: "Marketing",
    descripcion: "Campañas, promociones y activos del catálogo sin tocar precios.",
    esSistema: true,
    permisos: [
      "promociones.ver",
      "promociones.editar",
      "catalogo.ver",
      "clientes.ver",
      "reportes.ver",
      "reportes.exportar",
      "notificaciones.ver",
    ],
    version: 1,
  },
  {
    id: "rol-contador",
    nombre: "Contador",
    descripcion: "Consulta caja, pagos, facturación y reportes contables.",
    esSistema: true,
    permisos: [
      "caja.ver",
      "pagos.ver",
      "facturacion.ver",
      "reportes.ver",
      "reportes.exportar",
      "auditoria.ver",
      "tiempos.ver",
    ],
    version: 2,
  },
  {
    id: "rol-auditor-nocturno",
    nombre: "Auditor nocturno (ajustado)",
    descripcion: "Plantilla local: revisa cierres y bitácoras sin operar.",
    esSistema: false,
    permisos: ["caja.ver", "pagos.ver", "reportes.ver", "auditoria.ver", "tiempos.ver"],
    version: 4,
  },
]

const USUARIOS: Usuario[] = [
  {
    id: "u-dev",
    nombre: "María Gómez",
    email: "maria.gomez@puntoc.mx",
    telefono: "+52 55 1234 5678",
    estado: "activo",
    roles: [{ rolId: "rol-gerente", sucursalId: "centro" }],
    ultimoAccesoEn: haceMin(12),
    creadoEn: haceMin(60 * 24 * 380),
    dosFa: "activo",
    turnoAbierto: "Comida (13:00–17:00)",
    version: 2,
  },
  {
    id: "u-002",
    nombre: "Luis Ramírez",
    email: "luis.ramirez@puntoc.mx",
    telefono: "+52 55 2222 1188",
    estado: "activo",
    roles: [{ rolId: "rol-mesero", sucursalId: "centro" }],
    ultimoAccesoEn: haceMin(34),
    creadoEn: haceMin(60 * 24 * 210),
    dosFa: "no_aplica",
    turnoAbierto: "Comida (13:00–17:00)",
    version: 1,
  },
  {
    id: "u-003",
    nombre: "Sofía Herrera",
    email: "sofia.herrera@puntoc.mx",
    estado: "activo",
    roles: [
      { rolId: "rol-cajero", sucursalId: "centro" },
      { rolId: "rol-capitan", sucursalId: "norte" },
    ],
    ultimoAccesoEn: haceMin(95),
    creadoEn: haceMin(60 * 24 * 180),
    dosFa: "no_aplica",
    turnoAbierto: "Comida (13:00–17:00)",
    version: 3,
  },
  {
    id: "u-004",
    nombre: "Ana Beltrán",
    email: "ana.beltran@puntoc.mx",
    estado: "activo",
    roles: [{ rolId: "rol-chef", sucursalId: "norte" }],
    ultimoAccesoEn: haceMin(60 * 26),
    creadoEn: haceMin(60 * 24 * 150),
    dosFa: "no_aplica",
    version: 1,
  },
  {
    id: "u-005",
    nombre: "Diego Sosa",
    email: "diego.sosa@puntoc.mx",
    estado: "suspendido",
    roles: [{ rolId: "rol-capitan", sucursalId: "centro" }],
    ultimoAccesoEn: haceMin(60 * 30),
    creadoEn: haceMin(60 * 24 * 120),
    dosFa: "no_aplica",
    version: 4,
  },
  {
    id: "u-006",
    nombre: "Carmen Ruiz",
    email: "carmen.ruiz@puntoc.mx",
    estado: "activo",
    roles: [
      { rolId: "rol-contador", sucursalId: null },
      { rolId: "rol-admin-global", sucursalId: null },
    ],
    ultimoAccesoEn: haceMin(60 * 5),
    creadoEn: haceMin(60 * 24 * 500),
    dosFa: "pendiente",
    version: 2,
  },
  {
    id: "u-007",
    nombre: "Jorge Palacios",
    email: "jorge.palacios@puntoc.mx",
    estado: "activo",
    roles: [{ rolId: "rol-marketing", sucursalId: null }],
    ultimoAccesoEn: haceMin(60 * 21),
    creadoEn: haceMin(60 * 24 * 90),
    dosFa: "no_aplica",
    version: 1,
  },
  {
    id: "u-008",
    nombre: "Pablo Núñez",
    email: "pablo.nunez@puntoc.mx",
    estado: "baja",
    roles: [{ rolId: "rol-mesero", sucursalId: "norte" }],
    ultimoAccesoEn: null,
    creadoEn: haceMin(60 * 24 * 60),
    dosFa: "no_aplica",
    version: 5,
  },
]

const SESIONES: Record<string, SesionActiva[]> = {
  "u-dev": [
    {
      id: "s-dev-1",
      dispositivo: "Chrome · Linux",
      ip: "192.168.1.24",
      iniciadaEn: haceMin(95),
      ultimaActividadEn: haceMin(3),
      actual: true,
    },
  ],
  "u-002": [
    {
      id: "s-002-1",
      dispositivo: "APK mesero · Pixel 8",
      ip: "192.168.1.51",
      iniciadaEn: haceMin(120),
      ultimaActividadEn: haceMin(34),
      actual: false,
    },
  ],
  "u-006": [
    {
      id: "s-006-1",
      dispositivo: "Chrome · Windows",
      ip: "10.0.0.18",
      iniciadaEn: haceMin(320),
      ultimaActividadEn: haceMin(300),
      actual: false,
    },
    {
      id: "s-006-2",
      dispositivo: "Safari · iPad",
      ip: "10.0.0.31",
      iniciadaEn: haceMin(45),
      ultimaActividadEn: haceMin(5),
      actual: false,
    },
  ],
}

const PERMISOS_TEMPORALES: Record<string, PermisoTemporal[]> = {
  "u-003": [
    {
      id: "pt-1",
      permiso: "caja.reabrir",
      turno: "Comida (13:00–17:00)",
      otorgadoPor: "María Gómez",
      otorgadoEn: haceMin(50),
      expiraEn: enHoras(4),
      estado: "vigente",
    },
    {
      id: "pt-2",
      permiso: "pagos.reembolsar",
      turno: "Cena (18:00–23:00)",
      otorgadoPor: "María Gómez",
      otorgadoEn: haceMin(60 * 26),
      expiraEn: haceMin(60 * 20),
      estado: "expirado",
    },
  ],
  "u-005": [
    {
      id: "pt-3",
      permiso: "comandas.reasignar",
      turno: "Comida (13:00–17:00)",
      otorgadoPor: "Carmen Ruiz",
      otorgadoEn: haceMin(60 * 40),
      expiraEn: haceMin(60 * 36),
      estado: "revocado",
    },
  ],
}

const ACTIVIDAD: Record<string, EventoActividad[]> = {
  "u-dev": [
    {
      id: "act-1",
      accion: "Inicio de sesión",
      detalle: "Acceso desde Chrome · Linux (192.168.1.24)",
      actor: "María Gómez",
      creadoEn: haceMin(95),
      auditoriaId: "aud-9001",
    },
    {
      id: "act-2",
      accion: "Cambio de rol",
      detalle: "Se asignó Gerente de sede en Centro",
      actor: "Carmen Ruiz",
      creadoEn: haceMin(60 * 24 * 30),
      auditoriaId: "aud-8742",
    },
  ],
  "u-005": [
    {
      id: "act-3",
      accion: "Suspensión",
      detalle: "Motivo: revisión de arqueo pendiente",
      actor: "María Gómez",
      creadoEn: haceMin(60 * 30),
      auditoriaId: "aud-8611",
    },
    {
      id: "act-4",
      accion: "Permiso temporal revocado",
      detalle: "comandas.reasignar · turno Comida",
      actor: "Carmen Ruiz",
      creadoEn: haceMin(60 * 36),
      auditoriaId: "aud-8590",
    },
  ],
  "u-008": [
    {
      id: "act-5",
      accion: "Baja",
      detalle: "Motivo: fin de relación laboral",
      actor: "María Gómez",
      creadoEn: haceMin(60 * 24 * 10),
      auditoriaId: "aud-8010",
    },
  ],
}

/* -------------------------------------------------------------------------- */
/* Utilidades mock                                                             */
/* -------------------------------------------------------------------------- */

function rolResumen(rol: RolInterno): Rol {
  const { permisos: _, ...resto } = rol
  return {
    ...resto,
    permisosCount: rol.permisos.length,
    usuariosCount: USUARIOS.filter((usuario) =>
      usuario.roles.some((asignacion) => asignacion.rolId === rol.id),
    ).length,
  }
}

function buscarUsuario(id: string): Usuario {
  const usuario = USUARIOS.find((item) => item.id === id)
  if (!usuario) throw new ApiError(404, "El usuario no existe", "usuario_no_encontrado")
  return usuario
}

function buscarRol(id: string): RolInterno {
  const rol = ROLES.find((item) => item.id === id)
  if (!rol) throw new ApiError(404, "El rol no existe", "rol_no_encontrado")
  return rol
}

function validarMotivo(motivo: string | undefined): string {
  const limpio = texto(motivo)
  if (limpio.length < 3) {
    throw new ApiError(422, "El motivo es obligatorio (mínimo 3 caracteres)", "motivo_requerido")
  }
  return limpio
}

function registrarActividad(usuarioId: string, accion: string, detalle: string, motivo?: string): string {
  const auditoriaId = nuevoId("aud")
  const lista = (ACTIVIDAD[usuarioId] ??= [])
  lista.unshift({
    id: nuevoId("act"),
    accion,
    detalle: motivo ? `${detalle} · Motivo: ${motivo}` : detalle,
    actor: "María Gómez",
    creadoEn: new Date().toISOString(),
    auditoriaId,
  })
  return auditoriaId
}

/** Salvaguarda (Supuesto plan 17 §8): el tenant no queda sin administrador global activo. */
function esUltimoAdministradorGlobal(usuario: Usuario): boolean {
  const esAdminGlobal = usuario.roles.some(
    (asignacion) => asignacion.rolId === "rol-admin-global" && asignacion.sucursalId === null,
  )
  if (!esAdminGlobal) return false
  const otros = USUARIOS.filter(
    (item) =>
      item.id !== usuario.id &&
      item.estado === "activo" &&
      item.roles.some((asignacion) => asignacion.rolId === "rol-admin-global" && asignacion.sucursalId === null),
  )
  return otros.length === 0
}

function paginar<T>(lista: T[], page: number, pageSize: number): { data: T[]; total: number } {
  return { data: lista.slice((page - 1) * pageSize, page * pageSize), total: lista.length }
}

/* -------------------------------------------------------------------------- */
/* Mocks                                                                        */
/* -------------------------------------------------------------------------- */

/** GET /admin/permisos — catálogo `modulo.accion` con marca de sensible. */
registerMock("GET", /^\/admin\/permisos$/, () => PERMISOS)

/** GET /admin/roles — plantillas y roles del tenant con conteos. */
registerMock("GET", /^\/admin\/roles$/, () => ROLES.map(rolResumen))

/** POST /admin/roles — alta desde cero. */
registerMock("POST", /^\/admin\/roles$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<CrearRolPayload>
  const nombre = texto(body.nombre)
  if (nombre.length < 3) throw new ApiError(422, "El nombre del rol es obligatorio", "nombre_requerido")
  if (ROLES.some((rol) => rol.nombre.toLowerCase() === nombre.toLowerCase())) {
    throw new ApiError(409, "Ya existe un rol con ese nombre", "rol_duplicado")
  }
  const permisos = (body.permisos ?? []).filter((codigo) => TODOS.includes(codigo))
  const rol: RolInterno = {
    id: nuevoId("rol"),
    nombre,
    descripcion: texto(body.descripcion) || "Rol local ajustable",
    esSistema: false,
    permisos,
    version: 1,
  }
  ROLES.push(rol)
  refrescarSesionSimulada(`Se creó el rol ${rol.nombre}`)
  return rolResumen(rol)
})

/** POST /admin/roles/:id/clonar — copia plantilla y sus permisos (RF-R5-141). */
registerMock("POST", /^\/admin\/roles\/([^/]+)\/clonar$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const origen = buscarRol(id)
  const body = (ctx.body ?? {}) as { nombre?: string; motivo?: string }
  validarMotivo(body.motivo)
  const nombre = texto(body.nombre) || `${origen.nombre} (copia)`
  if (ROLES.some((rol) => rol.nombre.toLowerCase() === nombre.toLowerCase())) {
    throw new ApiError(409, "Ya existe un rol con ese nombre", "rol_duplicado")
  }
  const clon: RolInterno = {
    id: nuevoId("rol"),
    nombre,
    descripcion: `${origen.descripcion} · Clonado de ${origen.nombre}`,
    esSistema: false,
    permisos: [...origen.permisos],
    version: 1,
  }
  ROLES.push(clon)
  refrescarSesionSimulada(`Se clonó la plantilla ${origen.nombre}`)
  return rolResumen(clon)
})

/** GET /admin/roles/:id/permisos — matriz vigente del rol. */
registerMock("GET", /^\/admin\/roles\/([^/]+)\/permisos$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const rol = buscarRol(id)
  const respuesta: RolPermisosResp = { rol: rolResumen(rol), permisos: [...rol.permisos] }
  return respuesta
})

/** PUT /admin/roles/:id/permisos — reemplaza la matriz (sensible, con motivo). */
registerMock("PUT", /^\/admin\/roles\/([^/]+)\/permisos$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const rol = buscarRol(id)
  const body = (ctx.body ?? {}) as Partial<GuardarPermisosRolPayload>
  validarMotivo(body.motivo)
  if (body.version !== undefined && body.version !== rol.version) {
    throw new ApiError(409, "Otro administrador guardó este rol antes; recarga la matriz", "version_conflicto")
  }
  const permisos = (body.permisos ?? []).filter((codigo) => TODOS.includes(codigo))
  rol.permisos = permisos
  rol.version += 1
  refrescarSesionSimulada(`La matriz de ${rol.nombre} cambió: los permisos aplican de inmediato`)
  const respuesta: RolPermisosResp = { rol: rolResumen(rol), permisos: [...rol.permisos] }
  return respuesta
})

/** PATCH /admin/roles/:id — los roles de sistema solo se clonan. */
registerMock("PATCH", /^\/admin\/roles\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const rol = buscarRol(id)
  if (rol.esSistema) {
    throw new ApiError(
      409,
      "Los roles de sistema no se renombran ni se borran; clónalos como plantilla ajustable",
      "rol_sistema",
    )
  }
  const body = (ctx.body ?? {}) as Partial<EditarRolPayload>
  if (body.version !== undefined && body.version !== rol.version) {
    throw new ApiError(409, "Otro administrador editó este rol antes; recarga la lista", "version_conflicto")
  }
  const nombre = texto(body.nombre) || rol.nombre
  if (
    ROLES.some((item) => item.id !== rol.id && item.nombre.toLowerCase() === nombre.toLowerCase())
  ) {
    throw new ApiError(409, "Ya existe un rol con ese nombre", "rol_duplicado")
  }
  rol.nombre = nombre
  rol.descripcion = texto(body.descripcion) || rol.descripcion
  rol.version += 1
  return rolResumen(rol)
})

/** GET /admin/usuarios — lista paginada con filtros de rol, sede, estado y texto. */
registerMock("GET", /^\/admin\/usuarios$/, (ctx) => {
  const busqueda = texto(ctx.query.q).toLowerCase()
  const rolId = texto(ctx.query.rol)
  const sedeId = texto(ctx.query.sede)
  const estado = texto(ctx.query.estado) as UsuarioEstado | ""
  const page = Math.max(1, Number(ctx.query.page) || 1)
  const pageSize = Math.max(1, Number(ctx.query.pageSize) || 10)

  const filtrados = USUARIOS.filter((usuario) => {
    if (estado && usuario.estado !== estado) return false
    if (rolId && !usuario.roles.some((asignacion) => asignacion.rolId === rolId)) return false
    if (
      sedeId &&
      !usuario.roles.some((asignacion) => asignacion.sucursalId === null || asignacion.sucursalId === sedeId)
    ) {
      return false
    }
    if (busqueda) {
      const heno = `${usuario.nombre} ${usuario.email}`.toLowerCase()
      if (!heno.includes(busqueda)) return false
    }
    return true
  })

  const { data, total } = paginar(filtrados, page, pageSize)
  const respuesta: UsuariosResp = { data, total, page, pageSize }
  return respuesta
})

/** POST /admin/usuarios — alta con roles y alcance; PIN validado. */
registerMock("POST", /^\/admin\/usuarios$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<CrearUsuarioPayload>
  const nombre = texto(body.nombre)
  const email = texto(body.email).toLowerCase()
  if (nombre.length < 3) throw new ApiError(422, "El nombre es obligatorio", "nombre_requerido")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(422, "El correo no es válido", "email_invalido")
  }
  if (USUARIOS.some((usuario) => usuario.email.toLowerCase() === email)) {
    throw new ApiError(409, "Ya existe un usuario con ese correo en el tenant", "email_duplicado")
  }
  const pin = texto(body.pin)
  if (!/^\d{6,8}$/.test(pin)) {
    throw new ApiError(
      422,
      "El PIN debe tener de 6 a 8 dígitos numéricos y no repetirse al cambiarlo",
      "pin_debil",
    )
  }
  const roles = body.roles ?? []
  if (roles.length === 0) throw new ApiError(422, "Asigna al menos un rol con su sede", "roles_requeridos")
  for (const asignacion of roles) buscarRol(asignacion.rolId)

  const usuario: Usuario = {
    id: nuevoId("u"),
    nombre,
    email,
    telefono: texto(body.telefono) || undefined,
    estado: "activo",
    roles: roles.map((asignacion) => ({ rolId: asignacion.rolId, sucursalId: asignacion.sucursalId ?? null })),
    ultimoAccesoEn: null,
    creadoEn: new Date().toISOString(),
    dosFa: roles.some((asignacion) => asignacion.rolId === "rol-admin-global") ? "pendiente" : "no_aplica",
    version: 1,
  }
  USUARIOS.push(usuario)
  registrarActividad(usuario.id, "Alta", `Se creó el usuario ${nombre}`)
  refrescarSesionSimulada(`Alta de ${nombre}: roles y permisos vigentes`)
  return usuario
})

/** POST /admin/usuarios/:id/2fa — reinicia o enrola el segundo factor (V1). */
registerMock("POST", /^\/admin\/usuarios\/([^/]+)\/2fa$/, (ctx) => {
  const id = ctx.path.match(/^\/admin\/usuarios\/([^/]+)\/2fa$/)?.[1] ?? ""
  const usuario = buscarUsuario(id)
  const body = (ctx.body ?? {}) as Partial<DosFaPayload>
  const motivo = validarMotivo(body.motivo)
  usuario.dosFa = body.accion === "enrolar" ? "activo" : "pendiente"
  usuario.version += 1
  registrarActividad(
    id,
    body.accion === "enrolar" ? "2FA activado" : "2FA restablecido",
    `Segundo factor ${body.accion === "enrolar" ? "enrolado" : "reiniciado"}`,
    motivo,
  )
  return usuario
})

/** Alias del plan 17 §5: `POST /admin/usuarios/:id/2fa/reset`. */
registerMock("POST", /^\/admin\/usuarios\/([^/]+)\/2fa\/reset$/, (ctx) => {
  const id = ctx.path.match(/^\/admin\/usuarios\/([^/]+)\/2fa\/reset$/)?.[1] ?? ""
  const usuario = buscarUsuario(id)
  const body = (ctx.body ?? {}) as { motivo?: string }
  const motivo = validarMotivo(body.motivo)
  usuario.dosFa = "pendiente"
  usuario.version += 1
  registrarActividad(id, "2FA restablecido", "Reinicio de enrolamiento", motivo)
  return usuario
})

/** POST /admin/usuarios/:id/suspender|reactivar|baja — auditado y con motivo. */
registerMock("POST", /^\/admin\/usuarios\/([^/]+)\/(suspender|reactivar|baja)$/, (ctx) => {
  const coincidencia = ctx.path.match(/^\/admin\/usuarios\/([^/]+)\/(suspender|reactivar|baja)$/)
  const id = coincidencia?.[1] ?? ""
  const accion = (coincidencia?.[2] ?? "") as AccionUsuario
  const usuario = buscarUsuario(id)
  const body = (ctx.body ?? {}) as Partial<CambiarEstadoUsuarioPayload>
  const motivo = validarMotivo(body.motivo)

  if (accion === "suspender") {
    if (usuario.estado !== "activo") throw new ApiError(409, "Solo se suspenden usuarios activos", "estado_invalido")
    if (esUltimoAdministradorGlobal(usuario)) {
      throw new ApiError(
        409,
        "No se puede dejar el tenant sin administrador global activo",
        "ultimo_administrador",
      )
    }
    usuario.estado = "suspendido"
  } else if (accion === "baja") {
    if (usuario.estado === "baja") throw new ApiError(409, "El usuario ya está dado de baja", "estado_invalido")
    if (esUltimoAdministradorGlobal(usuario)) {
      throw new ApiError(
        409,
        "No se puede dejar el tenant sin administrador global activo",
        "ultimo_administrador",
      )
    }
    usuario.estado = "baja"
  } else {
    if (usuario.estado === "activo") throw new ApiError(409, "El usuario ya está activo", "estado_invalido")
    usuario.estado = "activo"
  }
  usuario.version += 1
  registrarActividad(
    id,
    accion === "suspender" ? "Suspensión" : accion === "baja" ? "Baja" : "Reactivación",
    accion === "baja" ? "El usuario no podrá iniciar sesión" : `Estado: ${usuario.estado}`,
    motivo,
  )
  refrescarSesionSimulada(
    accion === "baja"
      ? `Baja de ${usuario.nombre}: sesión invalidada de inmediato`
      : `Estado de ${usuario.nombre}: ${usuario.estado}`,
  )
  return usuario
})

/** PUT /admin/usuarios/:id/roles — reemplaza roles y alcance (sensible). */
registerMock("PUT", /^\/admin\/usuarios\/([^/]+)\/roles$/, (ctx) => {
  const id = ctx.path.match(/^\/admin\/usuarios\/([^/]+)\/roles$/)?.[1] ?? ""
  const usuario = buscarUsuario(id)
  const body = (ctx.body ?? {}) as Partial<GuardarRolesUsuarioPayload>
  const motivo = validarMotivo(body.motivo)
  const roles = body.roles ?? []
  if (roles.length === 0) throw new ApiError(422, "El usuario debe conservar al menos un rol", "roles_requeridos")
  for (const asignacion of roles) buscarRol(asignacion.rolId)
  usuario.roles = roles.map((asignacion) => ({
    rolId: asignacion.rolId,
    sucursalId: asignacion.sucursalId ?? null,
  }))
  usuario.dosFa = usuario.roles.some((asignacion) => asignacion.rolId === "rol-admin-global")
    ? usuario.dosFa === "activo"
      ? "activo"
      : "pendiente"
    : "no_aplica"
  usuario.version += 1
  registrarActividad(id, "Cambio de roles", "Se reemplazaron roles y alcance", motivo)
  refrescarSesionSimulada(`Roles de ${usuario.nombre} actualizados: permisos re-evaluados`)
  return usuario
})

/** GET /admin/usuarios/:id/sesiones — sesiones activas (V1). */
registerMock("GET", /^\/admin\/usuarios\/([^/]+)\/sesiones$/, (ctx) => {
  const id = ctx.path.match(/^\/admin\/usuarios\/([^/]+)\/sesiones$/)?.[1] ?? ""
  buscarUsuario(id)
  return SESIONES[id] ?? []
})

/** DELETE /admin/usuarios/:id/sesiones — revoca sesiones con motivo (V1). */
registerMock("DELETE", /^\/admin\/usuarios\/([^/]+)\/sesiones$/, (ctx) => {
  const id = ctx.path.match(/^\/admin\/usuarios\/([^/]+)\/sesiones$/)?.[1] ?? ""
  const usuario = buscarUsuario(id)
  const motivo = validarMotivo(texto(ctx.query.motivo))
  const previas = SESIONES[id] ?? []
  SESIONES[id] = previas.filter((sesion) => sesion.actual)
  registrarActividad(id, "Sesiones revocadas", `${previas.length - (SESIONES[id]?.length ?? 0)} sesiones cerradas`, motivo)
  refrescarSesionSimulada(`Sesiones de ${usuario.nombre} revocadas`)
  return { ok: true, revocadas: previas.length - (SESIONES[id]?.length ?? 0) }
})

/** GET /admin/usuarios/:id/permisos-temporales — permisos por turno (V2). */
registerMock("GET", /^\/admin\/usuarios\/([^/]+)\/permisos-temporales$/, (ctx) => {
  const id = ctx.path.match(/^\/admin\/usuarios\/([^/]+)\/permisos-temporales$/)?.[1] ?? ""
  buscarUsuario(id)
  const lista = PERMISOS_TEMPORALES[id] ?? []
  const ahora = Date.now()
  return lista.map((item) =>
    item.estado === "vigente" && new Date(item.expiraEn).getTime() <= ahora
      ? { ...item, estado: "expirado" as const }
      : item,
  )
})

/** POST /admin/usuarios/:id/permisos-temporales — concede hasta el fin del turno. */
registerMock("POST", /^\/admin\/usuarios\/([^/]+)\/permisos-temporales$/, (ctx) => {
  const id = ctx.path.match(/^\/admin\/usuarios\/([^/]+)\/permisos-temporales$/)?.[1] ?? ""
  const usuario = buscarUsuario(id)
  const body = (ctx.body ?? {}) as Partial<ConcederPermisoTemporalPayload>
  const motivo = validarMotivo(body.motivo)
  const permiso = texto(body.permiso)
  if (!TODOS.includes(permiso)) throw new ApiError(422, "El permiso no existe en el catálogo", "permiso_invalido")
  if (!texto(body.turno)) throw new ApiError(422, "Selecciona el turno de vigencia", "turno_requerido")
  const expiraEn = texto(body.expiraEn)
  if (!expiraEn || new Date(expiraEn).getTime() <= Date.now()) {
    throw new ApiError(422, "La expiración debe ser futura y quedar dentro del turno", "expiracion_invalida")
  }
  const nuevo: PermisoTemporal = {
    id: nuevoId("pt"),
    permiso,
    turno: texto(body.turno),
    otorgadoPor: "María Gómez",
    otorgadoEn: new Date().toISOString(),
    expiraEn,
    estado: "vigente",
  }
  ;(PERMISOS_TEMPORALES[id] ??= []).unshift(nuevo)
  registrarActividad(id, "Permiso temporal", `${permiso} hasta ${expiraEn}`, motivo)
  refrescarSesionSimulada(`Permiso temporal concedido a ${usuario.nombre}: ${permiso}`)
  return nuevo
})

/** DELETE /admin/usuarios/:id/permisos-temporales/:permisoId — revoca antes de expirar. */
registerMock("DELETE", /^\/admin\/usuarios\/([^/]+)\/permisos-temporales\/([^/]+)$/, (ctx) => {
  const coincidencia = ctx.path.match(/^\/admin\/usuarios\/([^/]+)\/permisos-temporales\/([^/]+)$/)
  const id = coincidencia?.[1] ?? ""
  const permisoId = coincidencia?.[2] ?? ""
  const usuario = buscarUsuario(id)
  const motivo = validarMotivo(texto(ctx.query.motivo))
  const lista = PERMISOS_TEMPORALES[id] ?? []
  const item = lista.find((permiso) => permiso.id === permisoId)
  if (!item) throw new ApiError(404, "El permiso temporal no existe", "permiso_no_encontrado")
  item.estado = "revocado"
  registrarActividad(id, "Permiso temporal revocado", item.permiso, motivo)
  refrescarSesionSimulada(`Permiso temporal revocado a ${usuario.nombre}: ${item.permiso}`)
  return item
})

/** PATCH /admin/usuarios/:id — edición de perfil con concurrencia optimista. */
registerMock("PATCH", /^\/admin\/usuarios\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const usuario = buscarUsuario(id)
  const body = (ctx.body ?? {}) as Partial<EditarUsuarioPayload>
  if (body.version !== undefined && body.version !== usuario.version) {
    throw new ApiError(409, "Otro administrador editó este usuario antes; recarga la ficha", "version_conflicto")
  }
  const nombre = texto(body.nombre)
  const email = texto(body.email).toLowerCase()
  if (nombre.length < 3) throw new ApiError(422, "El nombre es obligatorio", "nombre_requerido")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(422, "El correo no es válido", "email_invalido")
  }
  if (USUARIOS.some((item) => item.id !== id && item.email.toLowerCase() === email)) {
    throw new ApiError(409, "Ya existe un usuario con ese correo en el tenant", "email_duplicado")
  }
  usuario.nombre = nombre
  usuario.email = email
  usuario.telefono = texto(body.telefono) || undefined
  usuario.version += 1
  registrarActividad(id, "Edición de perfil", "Se actualizaron datos de contacto")
  return usuario
})

/** GET /admin/usuarios/:id — detalle + actividad reciente (se registra al final). */
registerMock("GET", /^\/admin\/usuarios\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const usuario = buscarUsuario(id)
  const respuesta: UsuarioDetalleResp = { usuario, actividad: ACTIVIDAD[id] ?? [] }
  return respuesta
})

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function useUsuarios(filtros: UsuarioFiltros) {
  return useQuery({
    queryKey: ["usuarios", "lista", filtros],
    queryFn: () =>
      api.get<UsuariosResp>("/admin/usuarios", {
        page: filtros.page,
        pageSize: filtros.pageSize,
        q: filtros.busqueda,
        rol: filtros.rolId,
        sede: filtros.sedeId,
        estado: filtros.estado,
      }),
  })
}

export function useUsuarioDetalle(id: string | null) {
  return useQuery({
    queryKey: ["usuarios", "detalle", id],
    queryFn: () => api.get<UsuarioDetalleResp>(`/admin/usuarios/${id}`),
    enabled: Boolean(id),
  })
}

export function useCrearUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CrearUsuarioPayload) => api.post<Usuario>("/admin/usuarios", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] })
      void queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
  })
}

export function useEditarUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: EditarUsuarioPayload & { id: string }) =>
      api.patch<Usuario>(`/admin/usuarios/${id}`, payload),
    onSuccess: (_usuario, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] })
      void queryClient.invalidateQueries({ queryKey: ["usuarios", "detalle", vars.id] })
    },
  })
}

export function useAccionUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CambiarEstadoUsuarioPayload) =>
      api.post<Usuario>(`/admin/usuarios/${payload.id}/${payload.accion}`, { motivo: payload.motivo }),
    onSuccess: (_usuario, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] })
      void queryClient.invalidateQueries({ queryKey: ["usuarios", "detalle", vars.id] })
    },
  })
}

export function useGuardarRolesUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, roles, motivo }: GuardarRolesUsuarioPayload) =>
      api.put<Usuario>(`/admin/usuarios/${id}/roles`, { roles, motivo }),
    onSuccess: (_usuario, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] })
      void queryClient.invalidateQueries({ queryKey: ["usuarios", "detalle", vars.id] })
    },
  })
}

export function use2FAUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, accion, motivo }: DosFaPayload) =>
      api.post<Usuario>(`/admin/usuarios/${id}/2fa`, { accion, motivo }),
    onSuccess: (_usuario, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] })
      void queryClient.invalidateQueries({ queryKey: ["usuarios", "detalle", vars.id] })
    },
  })
}

export function useSesionesUsuario(id: string | null) {
  return useQuery({
    queryKey: ["usuarios", "sesiones", id],
    queryFn: () => api.get<SesionActiva[]>(`/admin/usuarios/${id}/sesiones`),
    enabled: Boolean(id),
  })
}

export function useRevocarSesiones() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      api.delete<{ ok: boolean; revocadas: number }>(`/admin/usuarios/${id}/sesiones`, { motivo }),
    onSuccess: (_respuesta, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["usuarios", "sesiones", vars.id] })
    },
  })
}

export function usePermisosTemporales(id: string | null) {
  return useQuery({
    queryKey: ["usuarios", "permisos-temporales", id],
    queryFn: () => api.get<PermisoTemporal[]>(`/admin/usuarios/${id}/permisos-temporales`),
    enabled: Boolean(id),
  })
}

export function useConcederPermisoTemporal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ usuarioId, ...payload }: ConcederPermisoTemporalPayload) =>
      api.post<PermisoTemporal>(`/admin/usuarios/${usuarioId}/permisos-temporales`, payload),
    onSuccess: (_permiso, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["usuarios", "permisos-temporales", vars.usuarioId] })
    },
  })
}

export function useRevocarPermisoTemporal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ usuarioId, permisoId, motivo }: { usuarioId: string; permisoId: string; motivo: string }) =>
      api.delete<PermisoTemporal>(`/admin/usuarios/${usuarioId}/permisos-temporales/${permisoId}`, { motivo }),
    onSuccess: (_permiso, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["usuarios", "permisos-temporales", vars.usuarioId] })
    },
  })
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles", "lista"],
    queryFn: () => api.get<Rol[]>("/admin/roles"),
  })
}

export function useCrearRol() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CrearRolPayload) => api.post<Rol>("/admin/roles", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
  })
}

export function useEditarRol() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: EditarRolPayload & { id: string }) =>
      api.patch<Rol>(`/admin/roles/${id}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
  })
}

export function useClonarRol() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre, motivo }: { id: string; nombre?: string; motivo: string }) =>
      api.post<Rol>(`/admin/roles/${id}/clonar`, { nombre, motivo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
  })
}

export function useRolPermisos(id: string | null) {
  return useQuery({
    queryKey: ["roles", "permisos", id],
    queryFn: () => api.get<RolPermisosResp>(`/admin/roles/${id}/permisos`),
    enabled: Boolean(id),
  })
}

export function useGuardarPermisosRol() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ rolId, ...payload }: GuardarPermisosRolPayload) =>
      api.put<RolPermisosResp>(`/admin/roles/${rolId}/permisos`, payload),
    onSuccess: (_respuesta, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] })
      void queryClient.invalidateQueries({ queryKey: ["roles", "permisos", vars.rolId] })
    },
  })
}

export function usePermisosCatalogo() {
  return useQuery({
    queryKey: ["permisos", "catalogo"],
    queryFn: () => api.get<PermisoCatalogo[]>("/admin/permisos"),
    staleTime: 5 * 60_000,
  })
}
