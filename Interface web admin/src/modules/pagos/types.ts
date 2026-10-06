import type { StatusTone } from "@/components/ui/StatusBadge"

/**
 * Módulo 12 — Pagos y propinas (plan `docs/arquitectura/plans/admin-modules/12-pagos.md`).
 *
 * Reglas del plan reflejadas aquí:
 * - detalle por pedido **y** por medio, con propinas y descuentos (RF-R5-71);
 * - un reembolso nunca supera `pago.monto_centavos`; el máximo se muestra antes de
 *   confirmar y la API responde 422 si se excede (CA-12-03);
 * - la liquidación de propinas es V1, exportable y registra `exportacion`
 *   (RF-R5-75/RN-R5-10);
 * - datos personales enmascarados según el rol (RN-R5-07).
 */

export type PagoEstado = "pendiente" | "aprobado" | "rechazado" | "reembolsado"

export type MedioTipo = "efectivo" | "tarjeta" | "transferencia" | "vale" | "otro"

export type PagoFila = {
  id: string
  fecha: string
  pedidoId: string
  pedidoCodigo: string
  turnoId: string
  turnoNumero: string
  medioPagoId: string
  medioNombre: string
  medioTipo: MedioTipo
  montoCentavos: number
  propinaCentavos: number
  descuentoCentavos: number
  estado: PagoEstado
  estadoTone: StatusTone
  cajero: string
  referencia: string | null
  reembolsadoEn: string | null
}

export type PagoFiltros = {
  turnoId?: string
  medioId?: string
  cajero?: string
  estado?: string
  pedido?: string
  desde?: string
  hasta?: string
  reembolsados?: boolean
  page?: number
  pageSize?: number
}

export type PagosTotales = {
  montoCentavos: number
  propinaCentavos: number
  descuentoCentavos: number
  reembolsadoCentavos: number
  porMedio: { medioPagoId: string; nombre: string; montoCentavos: number; propinaCentavos: number }[]
}

export type PagosResp = {
  data: PagoFila[]
  total: number
  page: number
  pageSize: number
  totales: PagosTotales
}

export type PagoLinea = {
  id: string
  descripcion: string
  cantidad: number
  precioCentavos: number
  totalCentavos: number
}

export type AjustePago = {
  id: string
  tipo: "descuento" | "cortesia" | "recargo"
  valorCentavos: number
  porcentaje: number | null
  motivo: string
  usuario: string
}

export type FacturaVinculada = {
  id: string
  prefijo: string
  numero: string
  estadoDian: "pendiente" | "enviada" | "aceptada" | "rechazada" | "anulada"
  estadoTone: StatusTone
  totalCentavos: number
  notaCredito: { id: string; numero: string; estado: string } | null
}

export type PagoAuditoria = {
  id: string
  accion: "reembolsado" | "aprobado" | "creado" | "exportado"
  actor: string
  ocurridoEn: string
  motivo?: string
  detalle?: string
}

export type PagoDetalle = PagoFila & {
  moneda: string
  zonaHoraria: string
  turnoEstado: "abierto" | "cerrado"
  pedido: {
    id: string
    codigo: string
    estado: string
    estadoTone: StatusTone
    totalCentavos: number
    propinaCentavos: number
    descuentosCentavos: number
    turnoId: string
    turnoNumero: string
  }
  cliente: { nombre: string; contacto: string | null }
  lineas: PagoLinea[]
  ajustes: AjustePago[]
  factura: FacturaVinculada | null
  reembolso: {
    posible: boolean
    maximoCentavos: number
    motivoNoPosible: string | null
    reembolsadoEn: string | null
  }
  conciliacion: {
    conciliado: boolean
    notaCredito: string | null
    detalle: string
  }
  auditoria: PagoAuditoria[]
}

export type ReembolsoPayload = {
  pagoId: string
  montoCentavos: number
  motivo: string
}

export type LiquidacionPropinas = {
  id: string
  periodoDesde: string
  periodoHasta: string
  creadaEn: string
  creadaPor: string
  estado: "borrador" | "exportada"
  totalCentavos: number
  pagos: number
  exportadaEn: string | null
}

export type PropinasResp = {
  desde: string
  hasta: string
  moneda: string
  zonaHoraria: string
  /** Solo pagos aprobados: un reembolsado deja de contar su propina (supuesto). */
  totalCentavos: number
  pagos: number
  porDia: { fecha: string; totalCentavos: number; pagos: number }[]
  porTurno: { turnoId: string; turnoNumero: string; totalCentavos: number; pagos: number }[]
  porMedio: { medioPagoId: string; nombre: string; totalCentavos: number; pagos: number }[]
  porUsuario: { usuario: string; totalCentavos: number; pagos: number }[]
  liquidaciones: LiquidacionPropinas[]
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
  reembolsado: "blue",
}

export const MEDIO_TIPO_LABEL: Record<MedioTipo, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  vale: "Vale",
  otro: "Otro",
}

export const AJUSTE_LABEL: Record<AjustePago["tipo"], string> = {
  descuento: "Descuento",
  cortesia: "Cortesía",
  recargo: "Recargo",
}
