import type { StatusTone } from "@/components/ui/StatusBadge"

/* -------------------------------------------------------------------------- */
/* Dominio del módulo «Pedidos» (plan admin-modules/02)                        */
/* -------------------------------------------------------------------------- */

export type CanalPedido = "salon" | "web" | "app" | "qr" | "telefono" | "mesero"
export type ModalidadPedido = "mesa" | "recoger" | "domicilio"

export type PedidoEstado =
  | "borrador"
  | "recibido"
  | "en_preparacion"
  | "listo"
  | "en_camino"
  | "entregado"
  | "por_cobrar"
  | "pagado"
  | "cancelado"
  | "reembolsado"

export type LineaEstado =
  | "pendiente"
  | "enviada"
  | "en_preparacion"
  | "lista"
  | "entregada"
  | "anulada"

export type ComandaEstado = "enviada" | "en_preparacion" | "lista" | "entregada"
export type PagoEstado = "pendiente" | "aprobado" | "rechazado" | "reembolsado"
export type AjusteTipo = "descuento" | "cortesia" | "recargo"

export type ActorTipo =
  | "cliente"
  | "mesero"
  | "cocina"
  | "caja"
  | "administrador"
  | "automatizacion"

export type BitacoraTipo =
  | "creado"
  | "enviado"
  | "comanda_enviada"
  | "comanda_en_preparacion"
  | "comanda_lista"
  | "listo"
  | "en_camino"
  | "entregado"
  | "recogido"
  | "por_cobrar"
  | "pagado"
  | "cancelado"
  | "reembolsado"
  | "reasignado"
  | "reimpreso"
  | "reenviado"
  | "linea_anulada"
  | "precio_ajustado"

export type CanalBitacora = CanalPedido | "admin"

/* -------------------------------------------------------------------------- */
/* Lista                                                                       */
/* -------------------------------------------------------------------------- */

export type PedidoLista = {
  id: string
  folio: string
  creadoEn: string
  sedeId: string
  sedeNombre: string
  canal: CanalPedido
  modalidad: ModalidadPedido
  mesa?: string
  clienteNombre: string
  mesero: string
  estado: PedidoEstado
  totalCentavos: number
  /** Tramo total; `null` cuando no hay evento de cierre (R5 §5.3). */
  tiempoTotalSeg: number | null
  pagoResumen: string
  tieneIncidencias: boolean
  tieneDescuento: boolean
  tieneReembolso: boolean
}

/* -------------------------------------------------------------------------- */
/* Detalle                                                                     */
/* -------------------------------------------------------------------------- */

export type LineaModificador = {
  id: string
  nombreSnapshot: string
  precioSnapshotCentavos: number
}

export type PedidoLinea = {
  id: string
  nombreSnapshot: string
  precioSnapshotCentavos: number
  cantidad: number
  importeCentavos: number
  impuestoCentavos: number
  notas?: string
  comensal?: string
  estado: LineaEstado
  estadoTone: StatusTone
  estacion: string
  modificadores: LineaModificador[]
}

export type PedidoComanda = {
  id: string
  numero: string
  estacion: string
  estado: ComandaEstado
  estadoTone: StatusTone
  enviadaEn: string
  listaEn?: string
  entregadaEn?: string
  /** Objetivo de SLA de la estación en segundos. */
  objetivoSeg: number
  /** Tramo de preparación (enviada → lista); `null` sin cierre. */
  tramoSeg: number | null
  lineas: number
}

export type PedidoPago = {
  id: string
  medio: string
  montoCentavos: number
  propinaCentavos: number
  estado: PagoEstado
  estadoTone: StatusTone
  aprobadoEn?: string
  reembolsadoEn?: string
  referencia?: string
  /** `true` si el pago aprobado cubre el total del pedido. */
  conciliado: boolean
}

export type AjustePedido = {
  id: string
  tipo: AjusteTipo
  valorCentavos: number
  porcentaje?: number
  motivo: string
  usuario: string
  lineaId?: string
}

export type CampoDiff = { campo: string; antes: string; despues: string }

export type EventoBitacora = {
  id: string
  tipo: BitacoraTipo
  actor: string
  actorTipo: ActorTipo
  canal: CanalBitacora
  dispositivo: string
  /** Hora del servidor (RN-R5-08). */
  servidorEn: string
  resultado: string
  detalle?: string
  diffs?: CampoDiff[]
}

export type PedidoMontos = {
  subtotalCentavos: number
  descuentosCentavos: number
  impuestosCentavos: number
  recargosCentavos: number
  propinaCentavos: number
  totalCentavos: number
}

/** Tramos de tiempo del pedido (R5 §5.3); `null` = sin evento de cierre. */
export type TiemposPedido = {
  atencionSeg: number | null
  preparacionSeg: number | null
  despachoModo: ModalidadPedido
  despachoSeg: number | null
  cobroSeg: number | null
  totalSeg: number | null
}

export type PedidoCliente = {
  id?: string
  nombre: string
  telefono?: string
  correo?: string
}

export type PedidoDetalle = {
  id: string
  folio: string
  estado: PedidoEstado
  modalidad: ModalidadPedido
  canal: CanalPedido
  sedeId: string
  sedeNombre: string
  zonaHoraria: string
  mesa?: string
  comensales: number
  cliente: PedidoCliente
  mesero: string
  turno: string
  creadoEn: string
  pagadoEn?: string
  canceladoEn?: string
  montos: PedidoMontos
  tiempos: TiemposPedido
  lineas: PedidoLinea[]
  comandas: PedidoComanda[]
  pagos: PedidoPago[]
  ajustes: AjustePedido[]
  bitacora: EventoBitacora[]
  tieneIncidencias: boolean
}

/* -------------------------------------------------------------------------- */
/* Filtros, acciones y exportación                                             */
/* -------------------------------------------------------------------------- */

export type PedidosFiltros = {
  page: number
  pageSize: number
  sedeId?: string
  canal?: CanalPedido
  modalidad?: ModalidadPedido
  estado?: PedidoEstado
  mesero?: string
  desde?: string
  hasta?: string
  incidencias?: boolean
  descuento?: boolean
  reembolso?: boolean
  busqueda?: string
}

export type PedidosRespuesta = {
  data: PedidoLista[]
  total: number
  page: number
  pageSize: number
}

export type AccionPedido =
  | "anular_linea"
  | "anular_pedido"
  | "reasignar"
  | "reimprimir"
  | "reenviar"

export type AccionPedidoPayload = {
  id: string
  accion: AccionPedido
  motivo: string
  lineaId?: string
  mesa?: string
  mesero?: string
  documento?: "comanda" | "precuenta" | "recibo"
}

export type ReembolsoTipo = "reembolso" | "nota_credito"

export type ReembolsoPayload = {
  id: string
  pagoId: string
  tipo: ReembolsoTipo
  montoCentavos: number
  motivo: string
}

export type Exportacion = {
  id: string
  tipo: "pedidos" | "bitacora_pedido"
  formato: "csv" | "xlsx"
  estado: "en_proceso" | "lista"
  creadoEn: string
}

/* -------------------------------------------------------------------------- */
/* Etiquetas y tonalidades                                                     */
/* -------------------------------------------------------------------------- */

export const CANAL_LABEL: Record<CanalPedido, string> = {
  salon: "Salón",
  web: "Web",
  app: "App",
  qr: "QR",
  telefono: "Teléfono",
  mesero: "Mesero",
}

export const CANAL_BITACORA_LABEL: Record<CanalBitacora, string> = {
  ...CANAL_LABEL,
  admin: "Panel admin",
}

export const MODALIDAD_LABEL: Record<ModalidadPedido, string> = {
  mesa: "Mesa",
  recoger: "Recoger",
  domicilio: "Domicilio",
}

export const ESTADO_LABEL: Record<PedidoEstado, string> = {
  borrador: "Borrador",
  recibido: "Recibido",
  en_preparacion: "En preparación",
  listo: "Listo",
  en_camino: "En camino",
  entregado: "Entregado",
  por_cobrar: "Por cobrar",
  pagado: "Pagado",
  cancelado: "Cancelado",
  reembolsado: "Reembolsado",
}

export const ESTADO_TONE: Record<PedidoEstado, StatusTone> = {
  borrador: "outline",
  recibido: "blue",
  en_preparacion: "amber",
  listo: "green",
  en_camino: "blue",
  entregado: "green",
  por_cobrar: "amber",
  pagado: "green",
  cancelado: "gray",
  reembolsado: "gray",
}

export const LINEA_ESTADO_LABEL: Record<LineaEstado, string> = {
  pendiente: "Pendiente",
  enviada: "Enviada",
  en_preparacion: "En preparación",
  lista: "Lista",
  entregada: "Entregada",
  anulada: "Anulada",
}

export const LINEA_ESTADO_TONE: Record<LineaEstado, StatusTone> = {
  pendiente: "outline",
  enviada: "blue",
  en_preparacion: "amber",
  lista: "green",
  entregada: "green",
  anulada: "gray",
}

export const COMANDA_ESTADO_LABEL: Record<ComandaEstado, string> = {
  enviada: "Enviada",
  en_preparacion: "En preparación",
  lista: "Lista",
  entregada: "Entregada",
}

export const COMANDA_ESTADO_TONE: Record<ComandaEstado, StatusTone> = {
  enviada: "blue",
  en_preparacion: "amber",
  lista: "green",
  entregada: "green",
}

export const PAGO_ESTADO_LABEL: Record<PagoEstado, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  reembolsado: "Reembolsado",
}

export const PAGO_ESTADO_TONE: Record<PagoEstado, StatusTone> = {
  pendiente: "amber",
  aprobado: "green",
  rechazado: "gray",
  reembolsado: "gray",
}

export const AJUSTE_LABEL: Record<AjusteTipo, string> = {
  descuento: "Descuento",
  cortesia: "Cortesía",
  recargo: "Recargo",
}

export const BITACORA_LABEL: Record<BitacoraTipo, string> = {
  creado: "Pedido creado",
  enviado: "Enviado a cocina",
  comanda_enviada: "Comanda enviada",
  comanda_en_preparacion: "Comanda en preparación",
  comanda_lista: "Comanda lista",
  listo: "Pedido listo",
  en_camino: "En camino",
  entregado: "Entregado",
  recogido: "Recogido",
  por_cobrar: "Por cobrar",
  pagado: "Pagado",
  cancelado: "Pedido cancelado",
  reembolsado: "Reembolsado",
  reasignado: "Reasignado",
  reimpreso: "Reimpreso",
  reenviado: "Reenviado",
  linea_anulada: "Línea anulada",
  precio_ajustado: "Precio ajustado",
}

export const ACTOR_LABEL: Record<ActorTipo, string> = {
  cliente: "Cliente",
  mesero: "Mesero",
  cocina: "Cocina",
  caja: "Caja",
  administrador: "Administrador",
  automatizacion: "Automatización",
}

/** Estados en los que el pedido todavía admite acciones operativas. */
export function pedidoEstaAbierto(estado: PedidoEstado): boolean {
  return estado !== "cancelado" && estado !== "reembolsado" && estado !== "pagado"
}
