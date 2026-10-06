import type { StatusTone } from "@/components/ui/StatusBadge"

/**
 * Módulo 13 — Facturación (plan `docs/arquitectura/plans/admin-modules/13-facturacion.md`).
 *
 * Supuestos de modelo del plan que se reflejan en el mock (§4/§11):
 * - no hay tabla propia de notas crédito: se modelan como factura relacionada
 *   (`tipo = 'nota_credito'`) apuntando a la factura original;
 * - los reintentos del proveedor no tienen columnas propias: se derivan del
 *   historial de la factura (contador + último error);
 * - los importes viajan en centavos y las fechas se pintan en la zona de la sede.
 */

export type EstadoDian = "pendiente" | "enviada" | "aceptada" | "rechazada" | "anulada"

export type FacturaTipo = "factura" | "nota_credito"

export type FacturaFila = {
  id: string
  tipo: FacturaTipo
  prefijo: string
  numero: string
  pedidoId: string
  pedidoCodigo: string
  resolucion: string
  cufe: string | null
  estadoDian: EstadoDian
  estadoTone: StatusTone
  totalCentavos: number
  impuestosCentavos: number
  emitidaEn: string
  /** Factura original cuando el documento es una nota crédito. */
  facturaOriginalId: string | null
}

export type FacturaFiltros = {
  estado?: string
  prefijo?: string
  desde?: string
  hasta?: string
  pedido?: string
  resolucion?: string
  tipo?: string
  page?: number
  pageSize?: number
}

export type FacturasResp = {
  data: FacturaFila[]
  total: number
  page: number
  pageSize: number
  resumen: {
    aceptadas: number
    enviadas: number
    pendientes: number
    rechazadas: number
  }
}

export type FacturaLinea = {
  id: string
  descripcion: string
  cantidad: number
  precioCentavos: number
  impuestoNombre: string
  impuestoCentavos: number
  totalCentavos: number
}

export type ImpuestoAplicado = {
  nombre: string
  tasaBps: number
  baseCentavos: number
  impuestoCentavos: number
}

export type FacturaPago = {
  id: string
  medioNombre: string
  montoCentavos: number
  estado: string
}

export type NotaCreditoRef = {
  id: string
  numero: string
  estadoDian: EstadoDian
  totalCentavos: number
  emitidaEn: string
}

export type FacturaEvento = {
  id: string
  accion: "emitida" | "enviada" | "aceptada" | "rechazada" | "reintento" | "nota_credito" | "anulada"
  ocurridoEn: string
  actor: string
  causa?: string
}

export type ReintentoProveedor = {
  id: string
  intento: number
  ocurridoEn: string
  resultado: "enviada" | "rechazada" | "error_red"
  causa?: string
}

export type FacturaDetalle = FacturaFila & {
  moneda: string
  zonaHoraria: string
  facturaOriginal: { id: string; numero: string } | null
  pedido: {
    id: string
    codigo: string
    estado: string
    totalCentavos: number
    turnoId: string
    turnoNumero: string
  }
  pagos: FacturaPago[]
  lineas: FacturaLinea[]
  impuestos: ImpuestoAplicado[]
  xmlUrl: string | null
  pdfUrl: string | null
  notasCredito: NotaCreditoRef[]
  timeline: FacturaEvento[]
  reintentos: ReintentoProveedor[]
  reintentable: boolean
  motivoNoReintentable: string | null
  errorProveedor: { causa: string; ocurridoEn: string; intentos: number } | null
}

export type NotaCreditoPayload = {
  facturaId: string
  motivo: string
}

export type ImpuestoConfig = {
  id: string
  nombre: string
  /** 1900 = 19 % (bps). */
  tasaBps: number
  tipo: "incluido" | "adicionado" | "inc"
  activo: boolean
}

export type ConsecutivoConfig = {
  id: string
  sucursalId: string
  sucursalNombre: string
  tipo: "factura" | "pedido" | "comanda"
  prefijo: string
  /** Solo avanza al emitir: el panel no permite bajarlo (validación del backend). */
  siguiente: number
  resolucion: string
  vigenciaHasta: string
  vigenciaEstado: "vigente" | "por_vencer" | "vencida"
}

export type ConfigFiscal = {
  impuestos: ImpuestoConfig[]
  consecutivos: ConsecutivoConfig[]
  copiasFactura: number
  actualizadoEn: string
  actualizadoPor: string
}

export type ConfigFiscalPayload = {
  impuestos: ImpuestoConfig[]
  consecutivos: ConsecutivoConfig[]
  copiasFactura: number
  motivo: string
}

export type DiagnosticoProveedor = {
  proveedor: {
    nombre: string
    estado: "operativo" | "degradado" | "caido"
    ambiente: string
    ultimaConexion: string
    latenciaMs: number
  }
  facturas: { pendientes: number; enviadas: number; aceptadas: number; rechazadas: number }
  pendientesPorAntiguedad: { rango: string; cantidad: number; detalle: string }[]
  errores: { id: string; facturaId: string; numero: string; causa: string; ocurridoEn: string; intentos: number }[]
  reintentos: (ReintentoProveedor & { facturaId: string; numero: string })[]
  colaImpresion: {
    id: string
    facturaNumero: string
    impresora: string
    tipo: "factura" | "recibo" | "comanda" | "precuenta"
    estado: "pendiente" | "imprimiendo" | "impreso" | "fallido"
    intentos: number
    ultimoError: string | null
  }[]
}

export type ExportacionResp = {
  id: string
  tipo: string
  formato: "csv" | "xlsx" | "pdf"
  estado: "en_proceso" | "lista"
  creadoEn: string
  ok?: boolean
  exportacionId?: string
}

export const ESTADO_DIAN_LABEL: Record<EstadoDian, string> = {
  pendiente: "Pendiente",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  anulada: "Anulada",
}

export const ESTADO_DIAN_TONE: Record<EstadoDian, StatusTone> = {
  pendiente: "amber",
  enviada: "blue",
  aceptada: "green",
  rechazada: "amber",
  anulada: "gray",
}

export const TIPO_DOCUMENTO_LABEL: Record<FacturaTipo, string> = {
  factura: "Factura",
  nota_credito: "Nota crédito",
}

export const TIPO_IMPUESTO_LABEL: Record<ImpuestoConfig["tipo"], string> = {
  incluido: "Incluido en el precio",
  adicionado: "Adicionado al precio",
  inc: "INC (impuesto al consumo)",
}

export const TIPO_CONSECUTIVO_LABEL: Record<ConsecutivoConfig["tipo"], string> = {
  factura: "Factura",
  pedido: "Pedido",
  comanda: "Comanda",
}
