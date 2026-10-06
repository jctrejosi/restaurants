import type { StatusTone } from "@/components/ui/StatusBadge"

/**
 * Módulo 11 — Caja y turnos (plan `docs/arquitectura/plans/admin-modules/11-caja-turnos.md`).
 *
 * Reglas del plan que se reflejan aquí:
 * - el cierre `cuadra` contra los pagos **aprobados** del turno (CA-11-01);
 * - un turno cerrado no se modifica sin reapertura auditada (RN-R5-12);
 * - un medio con `activo = false` no se ofrece y sigue visible en pagos históricos
 *   (CA-11-04);
 * - importes en centavos; moneda y zona horaria de la sede (RNF-R5-08).
 */

export type TurnoEstado = "abierto" | "cerrado"

export type TurnoLite = {
  id: string
  sucursalId: string
  numero: string
  estado: TurnoEstado
  estadoTone: StatusTone
  abiertoEn: string
  cerradoEn: string | null
  usuarioApertura: string
  usuarioCierre: string | null
  baseInicialCentavos: number
  ventasCentavos: number
  propinasCentavos: number
  descuentosCentavos: number
  /** Base + ventas + propinas − retiros − gastos (solo pagos aprobados). */
  esperadoCentavos: number
  contadoCentavos: number | null
  diferenciaCentavos: number | null
  pedidosTotal: number
  pedidosPendientes: number
  /** Hay una diferencia sobre el umbral: se avisa al shell (plan §8). */
  alertaDiferencia: boolean
}

export type TurnosResp = {
  data: TurnoLite[]
  total: number
  page: number
  pageSize: number
  /** Turno abierto de la sede activa; limita la acción «Abrir turno». */
  turnoAbierto: TurnoLite | null
}

export type TurnoFiltros = {
  estado?: string
  desde?: string
  hasta?: string
  page?: number
  pageSize?: number
  orden?: "abierto_en_desc" | "abierto_en_asc"
}

export type MedioPagoTipo = "efectivo" | "tarjeta" | "transferencia" | "vale" | "otro"

export type MedioPago = {
  id: string
  sucursalId: string
  nombre: string
  tipo: MedioPagoTipo
  requiereReferencia: boolean
  activo: boolean
}

export type MediosPagoResp = {
  data: MedioPago[]
  total: number
  page: number
  pageSize: number
}

export type EsperadoMedio = {
  medioPagoId: string
  nombre: string
  tipo: MedioPagoTipo
  /** Un medio deshabilitado no se ofrece, pero se muestra si tuvo pagos en el turno. */
  activo: boolean
  requiereReferencia: boolean
  ventasCentavos: number
  propinasCentavos: number
  esperadoCentavos: number
  contadoCentavos: number | null
  diferenciaCentavos: number | null
}

export type PedidoTurno = {
  id: string
  codigo: string
  modalidad: string
  estado: string
  estadoTone: StatusTone
  totalCentavos: number
  pagadoCentavos: number
  propinaCentavos: number
  descuentosCentavos: number
  creadoEn: string
  medioNombre: string | null
  /** Ni pagado ni cancelado: bloquea el cierre (409, CA-11-02). */
  pendiente: boolean
}

export type ContadoMedio = {
  medioPagoId: string
  /** `null` = sin contar todavía (el efectivo es obligatorio para arquear). */
  contadoCentavos: number | null
}

export type Arqueo = {
  baseInicialCentavos: number
  retirosCentavos: number
  gastosCentavos: number
  observaciones: string
  contadoPorMedio: ContadoMedio[]
  contadoCentavos: number
  /** contado − esperado (fórmula del backend, plan §4.5). */
  diferenciaCentavos: number
  registradoEn: string
  registradoPor: string
}

export type Cierre = {
  baseInicialCentavos: number
  ventasEfectivoCentavos: number
  ventasOtrosCentavos: number
  propinasCentavos: number
  retirosCentavos: number
  gastosCentavos: number
  contadoCentavos: number
  esperadoCentavos: number
  diferenciaCentavos: number
  observaciones: string
  cerradoEn: string
  cerradoPor: string
  /** Cierre forzado con pedidos pendientes: queda auditado con motivo. */
  motivoForzado: string | null
}

export type EventoTurno = {
  id: string
  accion: "abierto" | "arqueo" | "cerrado" | "reaperturado" | "forzado"
  actor: string
  ocurridoEn: string
  motivo?: string
  detalle?: string
}

export type TurnoDetalle = TurnoLite & {
  sucursalNombre: string
  zonaHoraria: string
  moneda: string
  /** Otro turno abierto en la sede (para validar la reapertura). */
  turnoAbiertoId: string | null
  cierre: Cierre | null
  arqueo: Arqueo | null
  medios: EsperadoMedio[]
  pedidos: PedidoTurno[]
  pendientes: PedidoTurno[]
  reabiertoPor: string | null
  reabiertoEn: string | null
  reabiertoMotivo: string | null
  auditoria: EventoTurno[]
}

export type ArqueoPayload = {
  baseInicialCentavos: number
  retirosCentavos: number
  gastosCentavos: number
  observaciones: string
  contadoPorMedio: ContadoMedio[]
}

export type CerrarTurnoPayload = {
  /** Confirmación explícita para cerrar con pedidos pendientes (queda auditada). */
  confirmarPendientes?: boolean
  motivo?: string
}

export type ReabrirTurnoPayload = {
  motivo: string
}

export type ConsolidadoMedio = {
  medioPagoId: string
  nombre: string
  tipo: MedioPagoTipo
  ventasCentavos: number
  propinasCentavos: number
  contadoCentavos: number | null
  diferenciaCentavos: number | null
}

export type ConsolidadoDia = {
  fecha: string
  sucursalId: string
  sucursalNombre: string
  moneda: string
  zonaHoraria: string
  turnos: TurnoLite[]
  medios: ConsolidadoMedio[]
  totales: {
    ventasCentavos: number
    propinasCentavos: number
    descuentosCentavos: number
    contadoCentavos: number
    diferenciaCentavos: number
    pedidosTotal: number
    pedidosPendientes: number
  }
}

export type FormatoExportacion = "csv" | "xlsx" | "pdf"

export type ExportacionResp = {
  id: string
  tipo: string
  formato: FormatoExportacion
  estado: "en_proceso" | "lista"
  creadoEn: string
  /** Campos propios del registro de exportación cuando responde este módulo. */
  ok?: boolean
  exportacionId?: string
}

/** Diferencia que se considera «cuadra» (aviso, no error). */
export const TOLERANCIA_DIFERENCIA_CENTAVOS = 1_000

export const TURNO_ESTADO_LABEL: Record<TurnoEstado, string> = {
  abierto: "Abierto",
  cerrado: "Cerrado",
}

export const TURNO_ESTADO_TONE: Record<TurnoEstado, StatusTone> = {
  abierto: "green",
  cerrado: "gray",
}

export const MEDIO_PAGO_TIPO_LABEL: Record<MedioPagoTipo, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  vale: "Vale",
  otro: "Otro",
}
