import type { StatusTone } from "@/components/ui/StatusBadge"

/* -------------------------------------------------------------------------- */
/* Dominio del módulo «Reportes» (plan admin-modules/14)                       */
/*                                                                             */
/* Solo lectura sobre los agregados de `analytics` (RN-R5-03): las cifras      */
/* «oficiales» coinciden con caja y facturación del mismo período.             */
/* -------------------------------------------------------------------------- */

export type MetricaReporte =
  | "ventas"
  | "reservas"
  | "desempeno"
  | "impuestos"
  | "comparativo"
  | "programados"
  | "tablero"

export type PeriodoReporte = "hoy" | "ayer" | "semana" | "mes" | "rango"
export type Agrupacion = "dia" | "semana" | "mes"

export type CanalReporte = "salon" | "web" | "app" | "qr" | "telefono" | "mesero"
export type ModalidadReporte = "mesa" | "recoger" | "domicilio"

export const METRICA_LABEL: Record<MetricaReporte, string> = {
  ventas: "Ventas",
  reservas: "Reservas",
  desempeno: "Desempeño",
  impuestos: "Impuestos y propinas",
  comparativo: "Comparativo de sucursales",
  programados: "Programados",
  tablero: "Tablero",
}

export const PERIODO_LABEL: Record<PeriodoReporte, string> = {
  hoy: "Hoy",
  ayer: "Ayer",
  semana: "Última semana",
  mes: "Este mes",
  rango: "Rango…",
}

export const AGRUPACION_LABEL: Record<Agrupacion, string> = {
  dia: "Día",
  semana: "Semana",
  mes: "Mes",
}

export const CANAL_LABEL: Record<CanalReporte, string> = {
  salon: "Salón",
  web: "Web",
  app: "App",
  qr: "QR",
  telefono: "Teléfono",
  mesero: "Mesero",
}

export const MODALIDAD_LABEL: Record<ModalidadReporte, string> = {
  mesa: "Mesa",
  recoger: "Recoger",
  domicilio: "Domicilio",
}

/* -------------------------------------------------------------------------- */
/* Sello de frescura (RNF-R5-02)                                               */
/* -------------------------------------------------------------------------- */

export type Frescura = {
  actualizadoEn: string
  /** Minutos transcurridos desde el último refresco del job E9. */
  minutos: number
  /** `false` cuando supera 1 min: «Datos con retraso». */
  vigente: boolean
}

/* -------------------------------------------------------------------------- */
/* Filtros y consulta                                                          */
/* -------------------------------------------------------------------------- */

export type ReporteFiltros = {
  metrica: MetricaReporte
  periodo: PeriodoReporte
  desde?: string
  hasta?: string
  agrupacion: Agrupacion
  canal?: CanalReporte | ""
  modalidad?: ModalidadReporte | ""
  categoriaId?: string
  productoId?: string
  estacionId?: string
  mesero?: string
  /** Compara contra el período anterior (misma métrica y período). */
  comparar: boolean
  dimension?: string
  metricaComparada?: string
}

/* -------------------------------------------------------------------------- */
/* Ventas (RF-R5-120)                                                          */
/* -------------------------------------------------------------------------- */

export type PuntoSerie = {
  etiqueta: string
  desde: string
  totalCentavos: number
  pedidos: number
  ticketCentavos: number
}

export type FilaDesglose = {
  clave: string
  etiqueta: string
  pedidos: number
  subtotalCentavos: number
  descuentosCentavos: number
  impuestosCentavos: number
  propinaCentavos: number
  totalCentavos: number
  /** Fracción 0..1 sobre el total del período. */
  participacion: number
}

export type FilaProducto = {
  productoId: string
  nombre: string
  categoria: string
  cantidad: number
  importeCentavos: number
  participacion: number
}

export type Conciliacion = {
  cajaCentavos: number
  facturacionCentavos: number
  diferenciaCentavos: number
  verificadoEn: string
}

export type VentasResp = {
  actualizadoEn: string
  etiquetaPeriodo: string
  kpis: {
    totalCentavos: number
    pedidos: number
    ticketCentavos: number
    descuentosCentavos: number
    impuestosCentavos: number
    propinaCentavos: number
  }
  comparativo: {
    etiquetaAnterior: string
    totalAnteriorCentavos: number
    variacionPct: number | null
  } | null
  serie: PuntoSerie[]
  desglose: FilaDesglose[]
  porSede: FilaDesglose[]
  porCanal: FilaDesglose[]
  porModalidad: FilaDesglose[]
  productos: FilaProducto[]
  conciliacion: Conciliacion
}

/* -------------------------------------------------------------------------- */
/* Reservas (RF-R5-121)                                                        */
/* -------------------------------------------------------------------------- */

export type CeldaHeatmap = {
  dia: number
  hora: number
  reservas: number
  ocupacionPct: number
}

export type FilaReservaDia = {
  fecha: string
  reservas: number
  confirmadas: number
  sentadas: number
  noShow: number
  canceladas: number
  personas: number
  esperaMediaMin: number
  ocupacionPct: number
}

export type ReservasResp = {
  actualizadoEn: string
  etiquetaPeriodo: string
  kpis: {
    reservas: number
    ocupacionPct: number
    noShowPct: number
    canceladasPct: number
    personas: number
    esperaMediaMin: number
    /** Lista de espera: pendiente de vista en `analytics` (§11 del plan). */
    listaEspera: number
  }
  serie: FilaReservaDia[]
  heatmap: CeldaHeatmap[]
}

/* -------------------------------------------------------------------------- */
/* Desempeño (RF-R5-123, V1)                                                   */
/* -------------------------------------------------------------------------- */

export type DimensionDesempeno = "mesero" | "cajero" | "turno"

export type FilaDesempeno = {
  clave: string
  nombre: string
  rol: string
  pedidosPagados: number
  ventasCentavos: number
  ticketCentavos: number
  propinaCentavos: number
  descuentosCentavos: number
  anulaciones: number
  /** Importe anulado del período. */
  anuladoCentavos: number
}

export type DesempenoResp = {
  actualizadoEn: string
  etiquetaPeriodo: string
  dimension: DimensionDesempeno
  kpis: {
    ventasCentavos: number
    pedidos: number
    ticketCentavos: number
    descuentosCentavos: number
    anulaciones: number
  }
  filas: FilaDesempeno[]
}

/* -------------------------------------------------------------------------- */
/* Impuestos, propinas y descuentos (RF-R5-124, V1)                            */
/* -------------------------------------------------------------------------- */

export type FilaImpuesto = {
  clave: string
  etiqueta: string
  baseCentavos: number
  impuestoCentavos: number
  propinaCentavos: number
  descuentosCentavos: number
  totalCentavos: number
}

export type ImpuestosResp = {
  actualizadoEn: string
  etiquetaPeriodo: string
  kpis: {
    baseGravableCentavos: number
    impuestosCentavos: number
    propinaCentavos: number
    descuentosCentavos: number
    totalFacturadoCentavos: number
  }
  porTasa: FilaImpuesto[]
  porDia: FilaImpuesto[]
}

/* -------------------------------------------------------------------------- */
/* Comparativo entre sucursales (RF-R5-126, V1)                                */
/* -------------------------------------------------------------------------- */

export type MetricaComparada = "ventas" | "pedidos" | "ticket"

export type FilaComparativo = {
  sedeId: string
  sedeNombre: string
  valor: number
  valorAnterior: number | null
  variacionPct: number | null
  pedidos: number
  ticketCentavos: number
  participacion: number
}

export type ComparativoResp = {
  actualizadoEn: string
  etiquetaPeriodo: string
  metrica: MetricaComparada
  totalCentavos: number | null
  filas: FilaComparativo[]
}

/* -------------------------------------------------------------------------- */
/* Programados (RF-R5-125, V1)                                                 */
/* -------------------------------------------------------------------------- */

export type Periodicidad = "diario" | "semanal" | "mensual"
export type FormatoReporte = "csv" | "xlsx" | "pdf"
export type EstadoEntrega = "entregado" | "fallido" | "pendiente"

export type EntregaProgramado = {
  id: string
  enviadoEn: string
  estado: EstadoEntrega
  destinatarios: string[]
  detalle: string
}

export type ReporteProgramado = {
  id: string
  nombre: string
  metrica: MetricaReporte
  periodicidad: Periodicidad
  formato: FormatoReporte
  destinatarios: string[]
  activo: boolean
  siguienteEjecucion: string
  creadoEn: string
  filtros: Record<string, string>
  entregas: EntregaProgramado[]
}

export type ProgramadosResp = {
  actualizadoEn: string
  filas: ReporteProgramado[]
}

export type CrearProgramadoPayload = {
  nombre: string
  metrica: MetricaReporte
  periodicidad: Periodicidad
  formato: FormatoReporte
  destinatarios: string[]
  filtros: Record<string, string>
  motivo?: string
}

/* -------------------------------------------------------------------------- */
/* Exportaciones (RN-R5-10, RNF-R5-04)                                         */
/* -------------------------------------------------------------------------- */

export type ExportacionPayload = {
  tipo: string
  formato: FormatoReporte
  filtros: Record<string, string | number | boolean | null | undefined>
}

export type ExportacionResp = {
  id: string
  estado: "pendiente" | "procesando"
  tipo: string
  formato: FormatoReporte
  filasEstimadas: number
  /** `true` cuando supera el límite y se procesa en segundo plano. */
  segundoPlano: boolean
  aviso: string | null
  creadoEn: string
}

/* -------------------------------------------------------------------------- */
/* Tablero personalizable (RF-R5-127, V2)                                      */
/* -------------------------------------------------------------------------- */

export type TarjetaTablero = {
  id: string
  titulo: string
  descripcion: string
  metrica: MetricaReporte
  kpi: {
    label: string
    value: string
    delta?: string
    deltaNegativo?: boolean
    foot?: string
  }
}

export type SemanaDia = {
  valor: number
  corto: string
  nombre: string
}

export const DIAS_SEMANA: SemanaDia[] = [
  { valor: 1, corto: "Lun", nombre: "Lunes" },
  { valor: 2, corto: "Mar", nombre: "Martes" },
  { valor: 3, corto: "Mié", nombre: "Miércoles" },
  { valor: 4, corto: "Jue", nombre: "Jueves" },
  { valor: 5, corto: "Vie", nombre: "Viernes" },
  { valor: 6, corto: "Sáb", nombre: "Sábado" },
  { valor: 0, corto: "Dom", nombre: "Domingo" },
]

/* -------------------------------------------------------------------------- */
/* Badges auxiliares                                                           */
/* -------------------------------------------------------------------------- */

export const PERIODICIDAD_LABEL: Record<Periodicidad, string> = {
  diario: "Diario",
  semanal: "Semanal",
  mensual: "Mensual",
}

export const FORMATO_LABEL: Record<FormatoReporte, string> = {
  csv: "CSV",
  xlsx: "Excel",
  pdf: "PDF",
}

export const ENTREGA_TONE: Record<EstadoEntrega, StatusTone> = {
  entregado: "green",
  fallido: "amber",
  pendiente: "blue",
}

export const ENTREGA_LABEL: Record<EstadoEntrega, string> = {
  entregado: "Entregado",
  fallido: "Falló",
  pendiente: "Pendiente",
}
