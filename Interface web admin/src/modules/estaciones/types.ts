/**
 * Tipos del módulo Estaciones e impresoras (plan 07): estaciones con productos
 * asignados, impresoras con rutas por documento y SLA por estación/producto.
 */

export type EstacionTipo = "preparacion" | "despacho"

export const ESTACION_TIPO_LABEL: Record<EstacionTipo, string> = {
  preparacion: "Preparación",
  despacho: "Despacho",
}

export type PasoLista = "automatico" | "explicito"

export const PASO_LISTA_LABEL: Record<PasoLista, string> = {
  automatico: "Automático al marcar todas las líneas",
  explicito: "Explícito por el operador",
}

export type Estacion = {
  id: string
  nombre: string
  tipo: EstacionTipo
  sucursalId: string
  activa: boolean
  /** SLA objetivo en segundos (alimenta alertas del KDS). */
  slaObjetivoSeg: number | null
  /** V1: cómo pasa la comanda a «lista» (RF-R5-34). */
  pasoLista: PasoLista
  productoIds: string[]
  actualizadoEn: string
  actualizadoPor: string
  version: number
}

export type EstacionPayload = {
  nombre: string
  tipo: EstacionTipo
  sucursalId: string
  activa: boolean
  slaObjetivoSeg: number | null
  pasoLista: PasoLista
  productoIds: string[]
  version?: number
}

export type ImpresoraConexion = "red" | "usb" | "bluetooth"

export const CONEXION_LABEL: Record<ImpresoraConexion, string> = {
  red: "Red (IP)",
  usb: "USB",
  bluetooth: "Bluetooth",
}

export type TrabajoEstado = "pendiente" | "enviado" | "impreso" | "reintentando" | "fallido"

export const TRABAJO_ESTADO_LABEL: Record<TrabajoEstado, string> = {
  pendiente: "Pendiente",
  enviado: "Enviado",
  impreso: "Impreso",
  reintentando: "Reintentando",
  fallido: "Fallido",
}

export type TrabajoImpresion = {
  id: string
  documento: DocumentoImpresion
  estado: TrabajoEstado
  intentos: number
  ultimoError: string | null
  creadoEn: string
  impresoEn: string | null
}

export type Impresora = {
  id: string
  nombre: string
  sucursalId: string
  tipoConexion: ImpresoraConexion
  direccion: string
  perfil: string
  activa: boolean
  ultimosTrabajos: TrabajoImpresion[]
  actualizadoEn: string
  actualizadoPor: string
  version: number
}

export type ImpresoraPayload = {
  nombre: string
  sucursalId: string
  tipoConexion: ImpresoraConexion
  direccion: string
  perfil: string
  activa: boolean
  version?: number
}

export type DocumentoImpresion = "comanda" | "precuenta" | "recibo" | "factura"

export const DOCUMENTOS: { id: DocumentoImpresion; label: string }[] = [
  { id: "comanda", label: "Comanda" },
  { id: "precuenta", label: "Precuenta" },
  { id: "recibo", label: "Recibo / ticket" },
  { id: "factura", label: "Factura" },
]

export const DOCUMENTO_LABEL: Record<DocumentoImpresion, string> = {
  comanda: "Comanda",
  precuenta: "Precuenta",
  recibo: "Recibo / ticket",
  factura: "Factura",
}

export type RutaImpresion = {
  documento: DocumentoImpresion
  impresoraId: string | null
  /** Copias 1..5. */
  copias: number
}

export type RutasRespuesta = {
  sucursalId: string
  rutas: RutaImpresion[]
}

export type ResultadoPrueba = {
  ok: boolean
  mensaje: string
  trabajo: TrabajoImpresion
}

export type SlaAmbito = "estacion" | "producto"

export type SlaRegla = {
  id: string
  ambito: SlaAmbito
  refId: string
  refNombre: string
  objetivoSeg: number
}

export type SlaConfig = {
  reglas: SlaRegla[]
}

export type SlaPayload = {
  ambito: SlaAmbito
  refId: string
  objetivoSeg: number
}

export const SLA_MIN_SEG = 30
export const SLA_MAX_SEG = 7200
export const SLA_AVISO_SEG = 1800

export function slaFueraDeRango(objetivoSeg: number): boolean {
  return !Number.isFinite(objetivoSeg) || objetivoSeg < SLA_MIN_SEG || objetivoSeg > SLA_MAX_SEG
}
