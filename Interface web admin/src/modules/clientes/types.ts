import type { StatusTone } from "@/components/ui/StatusBadge"

/* -------------------------------------------------------------------------- */
/* Dominio del módulo «Clientes» (plan admin-modules/10)                       */
/* -------------------------------------------------------------------------- */

export type MarketingEstado = "otorgado" | "revocado" | "sin_solicitar"

export type ClienteLista = {
  id: string
  nombre: string
  telefono: string | null
  correo: string | null
  ultimaVisita: string | null
  pedidos: number
  reservasActivas: number
  totalGastadoCentavos: number
  marketing: MarketingEstado
  segmentos: string[]
  anonimizado: boolean
  sucursalId: string
  sucursalNombre: string
  creadoEn: string
  actualizadoEn: string
}

export type ClienteHistorialItem = {
  id: string
  tipo: "pedido" | "reserva"
  folio: string
  fecha: string
  canal: string
  origen: string
  estado: string
  estadoTone: StatusTone
  totalCentavos: number
}

export type AccionRegistro = "consulta" | "exportacion" | "rectificacion" | "consentimiento" | "anonimizacion"

export type AccesoRegistro = {
  id: string
  actor: string
  rol: string
  accion: AccionRegistro
  detalle: string
  dispositivo: string
  fecha: string
}

export type ClienteDetalle = ClienteLista & {
  fechaNacimiento?: string
  preferencias: string[]
  notas?: string
  /** Suscripción a newsletter; se desactiva al revocar marketing (RF-R5-91). */
  suscriptorActivo: boolean
  historial: ClienteHistorialItem[]
  accesos: AccesoRegistro[]
}

export type ConsentimientoTipo = "datos" | "marketing" | "cookies"
export type ConsentimientoCanal = "email" | "sms" | "whatsapp" | "telefono" | "web" | "todos"
export type BaseLegal = "consentimiento" | "contrato" | "interes_legitimo" | "obligacion_legal"

export type Consentimiento = {
  id: string
  clienteId: string
  tipo: ConsentimientoTipo
  canal: ConsentimientoCanal
  baseLegal: BaseLegal
  otorgadoEn: string
  revocadoEn?: string
  vigenciaHasta?: string
  motivoRevocacion?: string
}

export type SegmentoTipo = "recurrentes" | "inactivos" | "cumpleanos"

export type CriterioSegmento = {
  tipo: SegmentoTipo
  minimoPedidos?: number
  diasInactividad?: number
  diasAntesCumpleanos?: number
}

export type Segmento = {
  id: string
  nombre: string
  criterio: CriterioSegmento
  /** Calculado al vuelo; nunca se persiste. */
  conteo: number
  actualizadoEn: string
}

export type ClientesFiltros = {
  page: number
  pageSize: number
  busqueda?: string
  marketing?: "con" | "sin"
  sucursalId?: string
  desde?: string
  hasta?: string
  segmentoId?: string
}

export type ClientesRespuesta = {
  data: ClienteLista[]
  total: number
  page: number
  pageSize: number
}

export type ClientePatch = {
  nombre?: string
  telefono?: string
  correo?: string
  fechaNacimiento?: string
  preferencias?: string[]
  notas?: string
  /** Obligatorio: la rectificación se audita con antes/después. */
  motivo: string
  /** Control de concurrencia optimista; un desfase devuelve 409. */
  actualizadoEn: string
}

export type ConsentimientoPayload = {
  tipo: ConsentimientoTipo
  canal: ConsentimientoCanal
  baseLegal: BaseLegal
  vigenciaHasta?: string
  motivo: string
}

export type AnonimizarPayload = {
  motivo: string
  confirmacion: string
}

export type ExportacionClientes = {
  id: string
  tipo: "lista_clientes" | "acceso_cliente"
  formato: "csv" | "xlsx"
  estado: "en_proceso" | "lista"
  creadoEn: string
  /** Filas estimadas del archivo; si supera el límite se genera en segundo plano. */
  total: number
}

export type VistaPreviaSegmento = {
  conteo: number
  muestra: string[]
}

/* -------------------------------------------------------------------------- */
/* Etiquetas                                                                   */
/* -------------------------------------------------------------------------- */

export const MARKETING_LABEL: Record<MarketingEstado, string> = {
  otorgado: "Con marketing",
  revocado: "Opt-out",
  sin_solicitar: "Sin solicitar",
}

export const MARKETING_TONE: Record<MarketingEstado, StatusTone> = {
  otorgado: "green",
  revocado: "gray",
  sin_solicitar: "outline",
}

export const CONSENTIMIENTO_TIPO_LABEL: Record<ConsentimientoTipo, string> = {
  datos: "Tratamiento de datos",
  marketing: "Marketing",
  cookies: "Cookies",
}

export const CONSENTIMIENTO_CANAL_LABEL: Record<ConsentimientoCanal, string> = {
  email: "Correo",
  sms: "SMS",
  whatsapp: "WhatsApp",
  telefono: "Teléfono",
  web: "Web",
  todos: "Todos los canales",
}

export const BASE_LEGAL_LABEL: Record<BaseLegal, string> = {
  consentimiento: "Consentimiento del titular",
  contrato: "Ejecución de contrato",
  interes_legitimo: "Interés legítimo",
  obligacion_legal: "Obligación legal",
}

export const ACCION_REGISTRO_LABEL: Record<AccionRegistro, string> = {
  consulta: "Consulta sensible",
  exportacion: "Exportación",
  rectificacion: "Rectificación",
  consentimiento: "Consentimiento",
  anonimizacion: "Anonimización",
}

export const SEGMENTO_TIPO_LABEL: Record<SegmentoTipo, string> = {
  recurrentes: "Recurrentes",
  inactivos: "Inactivos",
  cumpleanos: "Cumpleaños",
}

/** Etiqueta legible del criterio de un segmento (V2). */
export function resumenCriterio(criterio: CriterioSegmento): string {
  switch (criterio.tipo) {
    case "recurrentes":
      return `Con ${criterio.minimoPedidos ?? 5} o más pedidos`
    case "inactivos":
      return `Sin visitar desde hace ${criterio.diasInactividad ?? 60} días`
    case "cumpleanos":
      return `Cumpleaños en los próximos ${criterio.diasAntesCumpleanos ?? 14} días`
    default:
      return "Criterio sin definir"
  }
}
