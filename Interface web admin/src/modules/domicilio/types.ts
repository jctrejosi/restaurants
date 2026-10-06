import type { StatusTone } from "@/components/ui/StatusBadge"

/* -------------------------------------------------------------------------- */
/* Dominio del módulo «Domicilio» (plan admin-modules/09)                      */
/* -------------------------------------------------------------------------- */

/** Vértice GeoJSON simplificado: la geometría real vive en PostGIS. */
export type VerticeGeo = { lat: number; lng: number }

export type Zona = {
  id: string
  sucursalId: string
  sucursalNombre: string
  nombre: string
  tarifaCentavos: number
  pedidoMinimoCentavos: number
  tiempoEstimadoMin: number
  activa: boolean
  actualizadoEn: string
  vertices: VerticeGeo[]
}

export type ZonaPayload = {
  nombre: string
  sucursalId: string
  tarifaCentavos: number
  pedidoMinimoCentavos: number
  tiempoEstimadoMin: number
  vertices: VerticeGeo[]
  activa: boolean
  motivo?: string
}

export type RepartidorEstado = "activo" | "ocupado" | "inactivo"

export type Vehiculo = "moto" | "auto" | "bicicleta" | "a_pie"

export type Repartidor = {
  id: string
  sucursalId: string
  sucursalNombre: string
  nombre: string
  telefono: string
  vehiculo: Vehiculo
  estado: RepartidorEstado
  /** Entregas en curso (`asignado`, `recogido`, `en_camino`). */
  entregasActivas: number
  entregasPeriodo: number
  /** `null` si aún no hay entregas cerradas en el período. */
  tiempoPromedioMin: number | null
  incidencias: number
  creadoEn: string
}

export type RepartidorPayload = {
  nombre: string
  telefono: string
  vehiculo: Vehiculo
  sucursalId: string
  estado?: RepartidorEstado
  motivo?: string
}

export type EntregaEstado =
  | "por_asignar"
  | "asignado"
  | "recogido"
  | "en_camino"
  | "entregado"
  | "entrega_fallida"
  | "devuelto"

export type TramoEntrega = {
  estado: EntregaEstado
  /** Sello del servidor (RN-R5-08); el cliente nunca lo fija. */
  servidorEn: string
  actor: string
  nota?: string
}

export type NotificacionRepartidor = {
  canal: "whatsapp" | "sms" | "llamada"
  estado: "encolada" | "enviada" | "fallida"
  enviadaEn?: string
}

export type Entrega = {
  pedidoId: string
  folio: string
  clienteNombre: string
  telefono: string
  direccion: string
  zonaId: string
  zonaNombre: string
  sucursalId: string
  creadoEn: string
  horaProgramada?: string
  repartidorId?: string
  repartidorNombre?: string
  estado: EntregaEstado
  tiempoEstimadoMin: number
  asignadoEn?: string
  recogidoEn?: string
  enCaminoEn?: string
  entregadoEn?: string
  /** Tramos en segundos; `null` cuando el hito no ha ocurrido. */
  esperaSeg: number | null
  trasladoSeg: number | null
  totalSeg: number | null
  evidenciaUrl?: string
  motivoIncidencia?: string
  propinaCentavos: number
  notificacion?: NotificacionRepartidor
  tramos: TramoEntrega[]
}

export type EntregaAccion =
  | "asignar"
  | "reasignar"
  | "recoger"
  | "en_camino"
  | "entregar"
  | "fallar"
  | "devolver"

export type AsignacionPayload = {
  pedidoId: string
  accion: EntregaAccion
  repartidorId?: string
  motivo?: string
  evidenciaUrl?: string
}

export type AsignacionResultado = {
  entrega: Entrega
  notificacion?: NotificacionRepartidor
}

export type LiquidacionEstado = "abierta" | "cerrada" | "conciliada"

export type Liquidacion = {
  id: string
  repartidorId: string
  repartidorNombre: string
  periodoDesde: string
  periodoHasta: string
  entregas: number
  tarifasCentavos: number
  propinasCentavos: number
  totalCentavos: number
  estado: LiquidacionEstado
  generadaEn: string
  cerradaEn?: string
  conciliadaEn?: string
}

export type LiquidacionPayload = {
  accion: "generar" | "cerrar" | "conciliar"
  id?: string
  repartidorId?: string
  periodoDesde?: string
  periodoHasta?: string
  motivo: string
}

export type EntregasFiltros = {
  sucursalId?: string
  estado?: EntregaEstado | "activas"
  repartidorId?: string
  desde?: string
  hasta?: string
  busqueda?: string
}

export type EntregasRespuesta = {
  data: Entrega[]
  total: number
}

export type ExportacionDomicilio = {
  id: string
  tipo: "zonas_geojson" | "liquidacion"
  formato: "geojson" | "csv"
  estado: "en_proceso" | "lista"
  creadoEn: string
}

export type ZonasRespuesta = {
  data: Zona[]
  total: number
}

export type RepartidoresRespuesta = {
  data: Repartidor[]
  total: number
}

export type LiquidacionesRespuesta = {
  data: Liquidacion[]
  total: number
}

/* -------------------------------------------------------------------------- */
/* Etiquetas y tonalidades                                                     */
/* -------------------------------------------------------------------------- */

export const REPARTIDOR_ESTADO_LABEL: Record<RepartidorEstado, string> = {
  activo: "Activo",
  ocupado: "Ocupado",
  inactivo: "Inactivo",
}

export const REPARTIDOR_ESTADO_TONE: Record<RepartidorEstado, StatusTone> = {
  activo: "green",
  ocupado: "amber",
  inactivo: "gray",
}

export const VEHICULO_LABEL: Record<Vehiculo, string> = {
  moto: "Motocicleta",
  auto: "Automóvil",
  bicicleta: "Bicicleta",
  a_pie: "A pie",
}

export const ENTREGA_ESTADO_LABEL: Record<EntregaEstado, string> = {
  por_asignar: "Por asignar",
  asignado: "Asignado",
  recogido: "Recogido",
  en_camino: "En camino",
  entregado: "Entregado",
  entrega_fallida: "Entrega fallida",
  devuelto: "Devuelto",
}

export const ENTREGA_ESTADO_TONE: Record<EntregaEstado, StatusTone> = {
  por_asignar: "outline",
  asignado: "blue",
  recogido: "amber",
  en_camino: "blue",
  entregado: "green",
  entrega_fallida: "gray",
  devuelto: "gray",
}

export const LIQUIDACION_ESTADO_LABEL: Record<LiquidacionEstado, string> = {
  abierta: "Abierta",
  cerrada: "Cerrada",
  conciliada: "Conciliada",
}

export const LIQUIDACION_ESTADO_TONE: Record<LiquidacionEstado, StatusTone> = {
  abierta: "amber",
  cerrada: "blue",
  conciliada: "green",
}

/** Estados de `domicilio_asignacion` que mantienen una entrega en curso. */
export const ENTREGA_ACTIVA: EntregaEstado[] = ["por_asignar", "asignado", "recogido", "en_camino"]

export function entregaEstaActiva(estado: EntregaEstado): boolean {
  return ENTREGA_ACTIVA.includes(estado)
}
