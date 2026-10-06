import type { StatusTone } from "@/components/ui/StatusBadge"

/* -------------------------------------------------------------------------- */
/* Dominio del módulo «Auditoría» (plan admin-modules/16)                      */
/*                                                                             */
/* Bitácora **inmutable**: la UI nunca ofrece editar ni borrar (RN-R5-02);      */
/* cada acción sensible responde quién, qué, cuándo, dónde y por qué (RN-R5-01).*/
/* -------------------------------------------------------------------------- */

export type Severidad = "info" | "baja" | "media" | "alta" | "critica"

export type EntidadAuditoria =
  | "pedido"
  | "reserva"
  | "comanda"
  | "pago"
  | "turno"
  | "producto"
  | "mesa"
  | "usuario"
  | "configuracion"

export type FuenteEvento = "evento_auditoria" | "bitacora_evento"

export type EventoAuditoria = {
  id: string
  fuente: FuenteEvento
  sedeId: string
  sedeNombre: string
  usuarioId: string | null
  usuarioNombre: string
  usuarioRol: string
  dispositivoId: string | null
  ip: string | null
  requestId: string | null
  entidad: EntidadAuditoria
  entidadId: string
  entidadLabel: string
  accion: string
  accionLabel: string
  tipo: string
  severidad: Severidad
  motivo: string | null
  datosAntes: Record<string, unknown> | null
  datosDespues: Record<string, unknown> | null
  canal: string
  creadoEn: string
}

export type ResumenAuditoria = {
  total: number
  criticos: number
  altos: number
  acciones: number
  actores: number
}

export type AuditoriaResp = {
  actualizadoEn: string
  data: EventoAuditoria[]
  total: number
  page: number
  pageSize: number
  resumen: ResumenAuditoria
}

export type RetencionResp = {
  meses: number
  desde: string
  eventoMasAntiguo: string | null
  purgadoAntesDe: string | null
  totalConservado: number
  gestionadoPor: string
}

export type EntidadTimelineResp = {
  actualizadoEn: string
  entidad: EntidadAuditoria
  entidadId: string
  entidadLabel: string
  /** Enlace de vuelta a la entidad de origen (navegación bidireccional, R5 §8). */
  enlaceEntidad: string
  retencion: RetencionResp
  eventos: EventoAuditoria[]
}

export type AuditoriaFiltros = {
  usuarioId?: string
  tipo?: string
  accion?: string
  entidad?: string
  entidadId?: string
  severidad?: string
  desde?: string
  hasta?: string
  texto?: string
}

export type ExportacionAuditoriaResp = {
  id: string
  estado: "pendiente" | "procesando"
  tipo: string
  formato: string
  filasEstimadas: number
  segundoPlano: boolean
  aviso: string | null
  creadoEn: string
}

/* -------------------------------------------------------------------------- */
/* Catálogos y etiquetas                                                       */
/* -------------------------------------------------------------------------- */

export const SEVERIDAD_LABEL: Record<Severidad, string> = {
  info: "Informativa",
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
}

export const SEVERIDAD_TONE: Record<Severidad, StatusTone> = {
  info: "gray",
  baja: "blue",
  media: "amber",
  alta: "amber",
  critica: "amber",
}

export const ENTIDAD_LABEL: Record<EntidadAuditoria, string> = {
  pedido: "Pedido",
  reserva: "Reserva",
  comanda: "Comanda",
  pago: "Pago",
  turno: "Turno de caja",
  producto: "Producto",
  mesa: "Mesa",
  usuario: "Usuario",
  configuracion: "Configuración",
}

/** Ruta al detalle de la entidad para la navegación bidireccional (R5 §8). */
export function rutaEntidad(entidad: EntidadAuditoria | string, entidadId: string): string | null {
  switch (entidad) {
    case "pedido":
      return `/pedidos/${entidadId}`
    case "comanda":
      return `/comandas/${entidadId}`
    case "reserva":
      return `/reservas/${entidadId}`
    case "producto":
      return `/catalogo/${entidadId}`
    case "turno":
      return `/caja/${entidadId}`
    case "usuario":
      return "/usuarios"
    case "mesa":
      return "/salon"
    default:
      return null
  }
}

export const ACCIONES_CATALOGO: {
  accion: string
  label: string
  tipo: string
  severidad: Severidad
}[] = [
  { accion: "pedido.creado", label: "Pedido creado", tipo: "Pedidos", severidad: "info" },
  { accion: "pedido.estado_cambiado", label: "Estado de pedido cambiado", tipo: "Pedidos", severidad: "baja" },
  { accion: "pedido.cancelado", label: "Pedido cancelado", tipo: "Pedidos", severidad: "critica" },
  { accion: "pedido.descuento_aplicado", label: "Descuento aplicado", tipo: "Pedidos", severidad: "alta" },
  { accion: "precio.ajustado", label: "Precio ajustado", tipo: "Catálogo", severidad: "alta" },
  { accion: "producto.agotado", label: "Producto marcado agotado", tipo: "Catálogo", severidad: "baja" },
  { accion: "pago.registrado", label: "Pago registrado", tipo: "Pagos", severidad: "info" },
  { accion: "pago.reembolsado", label: "Pago reembolsado", tipo: "Pagos", severidad: "critica" },
  { accion: "caja.abierta", label: "Caja abierta", tipo: "Caja", severidad: "info" },
  { accion: "caja.cerrada", label: "Caja cerrada", tipo: "Caja", severidad: "media" },
  { accion: "caja.reabierta", label: "Caja reabierta", tipo: "Caja", severidad: "critica" },
  { accion: "turno.cerrado", label: "Turno cerrado", tipo: "Caja", severidad: "media" },
  { accion: "comanda.anulada", label: "Comanda anulada", tipo: "Comandas", severidad: "alta" },
  { accion: "comanda.reasignada", label: "Comanda reasignada", tipo: "Comandas", severidad: "media" },
  { accion: "comanda.reimpresa", label: "Comanda reimpresa", tipo: "Comandas", severidad: "baja" },
  { accion: "reserva.creada", label: "Reserva creada", tipo: "Reservas", severidad: "info" },
  { accion: "reserva.cancelada", label: "Reserva cancelada", tipo: "Reservas", severidad: "baja" },
  { accion: "reserva.no_show", label: "Reserva no-show", tipo: "Reservas", severidad: "media" },
  { accion: "usuario.login", label: "Inicio de sesión", tipo: "Sesión", severidad: "info" },
  { accion: "usuario.login_fallido", label: "Intento de sesión fallido", tipo: "Sesión", severidad: "alta" },
  { accion: "permiso.cambiado", label: "Permisos de rol cambiados", tipo: "Usuarios", severidad: "critica" },
  { accion: "configuracion.modificada", label: "Configuración modificada", tipo: "Configuración", severidad: "alta" },
  { accion: "exportacion.creada", label: "Exportación creada", tipo: "Exportaciones", severidad: "info" },
  { accion: "auditoria.consulta", label: "Consulta sensible de auditoría", tipo: "Auditoría", severidad: "info" },
]

export const severidadDe = (accion: string): Severidad =>
  ACCIONES_CATALOGO.find((item) => item.accion === accion)?.severidad ?? "media"

export const labelDe = (accion: string): string =>
  ACCIONES_CATALOGO.find((item) => item.accion === accion)?.label ?? accion
