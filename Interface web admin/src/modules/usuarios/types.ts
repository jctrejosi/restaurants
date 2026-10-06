import type { StatusTone } from "@/components/ui/StatusBadge"

/* -------------------------------------------------------------------------- */
/* Estados y etiquetas                                                         */
/* -------------------------------------------------------------------------- */

export type UsuarioEstado = "activo" | "suspendido" | "baja"

export const ESTADO_USUARIO_LABEL: Record<UsuarioEstado, string> = {
  activo: "Activo",
  suspendido: "Suspendido",
  baja: "Baja",
}

export const ESTADO_USUARIO_TONE: Record<UsuarioEstado, StatusTone> = {
  activo: "green",
  suspendido: "amber",
  baja: "gray",
}

export type DosFaEstado = "activo" | "pendiente" | "no_aplica"

export const DOS_FA_LABEL: Record<DosFaEstado, string> = {
  activo: "2FA activo",
  pendiente: "2FA pendiente",
  no_aplica: "No requerido",
}

/* -------------------------------------------------------------------------- */
/* Usuarios                                                                    */
/* -------------------------------------------------------------------------- */

/** Asignación usuario–rol–sede: `sucursalId = null` = todas las sucursales. */
export type UsuarioRolAsignado = {
  rolId: string
  sucursalId: string | null
}

export type Usuario = {
  id: string
  nombre: string
  email: string
  telefono?: string
  estado: UsuarioEstado
  roles: UsuarioRolAsignado[]
  ultimoAccesoEn: string | null
  creadoEn: string
  dosFa: DosFaEstado
  /** Turno abierto al momento de la consulta (advertencia en bajas). */
  turnoAbierto?: string | null
  /** Concurrencia optimista: el PATCH con versión vieja responde 409. */
  version: number
}

export type SesionActiva = {
  id: string
  dispositivo: string
  ip: string
  iniciadaEn: string
  ultimaActividadEn: string
  actual: boolean
}

export type PermisoTemporalEstado = "vigente" | "expirado" | "revocado"

export type PermisoTemporal = {
  id: string
  permiso: string
  /** Turno al que queda amarrado el permiso (RF-R5-144, V2). */
  turno: string
  otorgadoPor: string
  otorgadoEn: string
  expiraEn: string
  estado: PermisoTemporalEstado
}

export type EventoActividad = {
  id: string
  accion: string
  detalle: string
  actor: string
  creadoEn: string
  auditoriaId: string
}

/* -------------------------------------------------------------------------- */
/* Roles y permisos                                                            */
/* -------------------------------------------------------------------------- */

export type PermisoCatalogo = {
  codigo: string
  descripcion: string
  modulo: string
  /** RN-R5-06: reabrir caja, reembolsar, anular tras preparación, cambiar precios… */
  sensible: boolean
  /** `global` = configuración del tenant; `sucursal` = opera por sede. */
  alcance: "global" | "sucursal"
}

export type Rol = {
  id: string
  nombre: string
  descripcion: string
  /** Los roles de sistema se pueden clonar pero no renombrar ni borrar. */
  esSistema: boolean
  permisosCount: number
  usuariosCount: number
  version: number
}

export type RolPermisosResp = {
  rol: Rol
  permisos: string[]
}

export type UsuariosResp = {
  data: Usuario[]
  total: number
  page: number
  pageSize: number
}

export type UsuarioDetalleResp = {
  usuario: Usuario
  actividad: EventoActividad[]
}

export type UsuarioFiltros = {
  page: number
  pageSize: number
  busqueda?: string
  rolId?: string
  sedeId?: string
  estado?: UsuarioEstado
}

/* -------------------------------------------------------------------------- */
/* Cargas de trabajo                                                           */
/* -------------------------------------------------------------------------- */

export type CrearUsuarioPayload = {
  nombre: string
  email: string
  telefono?: string
  pin: string
  roles: UsuarioRolAsignado[]
}

export type EditarUsuarioPayload = {
  nombre: string
  email: string
  telefono?: string
  version: number
}

export type AccionUsuario = "suspender" | "reactivar" | "baja"

export type CambiarEstadoUsuarioPayload = {
  id: string
  accion: AccionUsuario
  motivo: string
}

export type GuardarRolesUsuarioPayload = {
  id: string
  roles: UsuarioRolAsignado[]
  motivo: string
}

export type CrearRolPayload = {
  nombre: string
  descripcion: string
  /** Códigos con los que arranca el rol (plantilla clonada o selección inicial). */
  permisos: string[]
}

export type EditarRolPayload = {
  id: string
  nombre: string
  descripcion: string
  version: number
}

export type GuardarPermisosRolPayload = {
  rolId: string
  permisos: string[]
  version: number
  motivo: string
}

export type DosFaPayload = {
  id: string
  accion: "reset" | "enrolar"
  motivo: string
}

export type ConcederPermisoTemporalPayload = {
  usuarioId: string
  permiso: string
  turno: string
  expiraEn: string
  motivo: string
}

/* -------------------------------------------------------------------------- */
/* Catálogos de apoyo                                                          */
/* -------------------------------------------------------------------------- */

/** Plantillas nombradas en RF-R5-141; el resto de roles siembra el tenant. */
export const PLANTILLAS_ROL = ["Mesero", "Cajero", "Capitán", "Chef", "Marketing", "Contador"]

export const MODULO_PERMISO_LABEL: Record<string, string> = {
  pedidos: "Pedidos",
  comandas: "Comandas",
  caja: "Caja y turnos",
  pagos: "Pagos y propinas",
  catalogo: "Catálogo",
  clientes: "Clientes",
  reservas: "Reservas",
  salon: "Salón",
  domicilio: "Domicilio",
  reportes: "Reportes",
  tiempos: "Tiempos y SLA",
  auditoria: "Auditoría",
  usuarios: "Usuarios",
  roles: "Roles",
  dispositivos: "Dispositivos",
  ajustes: "Sucursal y ajustes",
  notificaciones: "Notificaciones",
  sucursales: "Sucursales",
}

export const TURNOS_PERMISO_TEMPORAL = [
  { id: "desayuno", nombre: "Desayuno (07:00–12:00)" },
  { id: "comida", nombre: "Comida (13:00–17:00)" },
  { id: "cena", nombre: "Cena (18:00–23:00)" },
]
