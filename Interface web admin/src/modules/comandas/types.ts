import type { StatusTone } from "@/components/ui/StatusBadge"

/**
 * Módulo 04 — Comandas (plan `docs/arquitectura/plans/admin-modules/04-comandas.md`).
 *
 * El panel **observa** el KDS: monitor por estación con SLA y excepciones. Las
 * acciones de cocina (tomar, avanzar estados) viven en el KDS/APK, no aquí.
 */

export type Modalidad = "mesa" | "recoger" | "domicilio"

export type ComandaEstado =
  | "pendiente"
  | "impresa"
  | "en_preparacion"
  | "lista"
  | "entregada"
  | "anulada"

export type ComandaLineaEstado = "pendiente" | "en_preparacion" | "lista" | "anulada"

/** Semáforo del monitor contra el SLA objetivo (R5 §5.3). */
export type Semaforo = "normal" | "por_vencer" | "vencida"

export type Prioridad = "normal" | "urgente"

export type TrabajoImpresionEstado = "pendiente" | "imprimiendo" | "impreso" | "fallido"

export type ComandaAlertaTipo = "sla" | "impresora"

export type Estacion = {
  id: string
  nombre: string
  /** Tipo de cocina/barra (Parrilla, Barra fría, Postres…). */
  tipo: string
  impresora: string
  /** Objetivo de SLA de la estación en segundos (`regla_sla` o `tiempo_objetivo_seg`). */
  objetivoSeg: number
}

export type ComandaLinea = {
  id: string
  nombreSnapshot: string
  cantidad: number
  estado: ComandaLineaEstado
  notas?: string
}

export type TrabajoImpresion = {
  id: string
  impresora: string
  estado: TrabajoImpresionEstado
  intentos: number
  ultimoError?: string | null
  actualizadoEn: string
}

export type ComandaAlerta = {
  id: string
  tipo: ComandaAlertaTipo
  mensaje: string
  creadaEn: string
}

/** Fila del monitor (lo que ve el expedidor/KDS; sin líneas detalladas). */
export type ComandaMonitor = {
  id: string
  numero: string
  pedidoFolio: string
  mesa?: string
  mesero?: string
  modalidad: Modalidad
  estacionId: string
  estacionNombre: string
  estado: ComandaEstado
  estadoTone: StatusTone
  prioridad: Prioridad
  lineasTotal: number
  lineasPendientes: number
  transcurridoSeg: number
  objetivoSeg: number
  semaforo: Semaforo
  turnoId: string
  enviadaEn: string
}

export type ComandaDetalle = ComandaMonitor & {
  lineas: ComandaLinea[]
  listaEn: string | null
  entregadaEn: string | null
  /** `lista_en − enviada_en`; `null` sin evento de cierre (no promedia). */
  preparacionSeg: number | null
  /** Responsable de la excepción (anulación). */
  responsable: string | null
  motivo: string | null
  trabajoImpresion: TrabajoImpresion
  alertas: ComandaAlerta[]
  auditoriaId: string | null
}

export type ComandasMonitorResp = {
  actualizadoEn: string
  estaciones: Estacion[]
  comandas: ComandaMonitor[]
  resumen: {
    enPreparacion: number
    porVencer: number
    vencidas: number
  }
}

export type MonitorFiltros = {
  estacionId?: string
  estado?: string
  turnoId?: string
  /** `expedidor` = vista unificada de todas las estaciones (solo lectura). */
  vista: "estacion" | "expedidor"
}

/* -------------------------------------------------------------------------- */
/* SLA / historial del turno                                                   */
/* -------------------------------------------------------------------------- */

export type SlaEstacionFila = {
  estacionId: string
  estacionNombre: string
  objetivoSeg: number
  cumplidas: number
  total: number
  vencidas: number
  /** Comandas sin evento de cierre: fuera de promedios (R5 §5.3). */
  sinCierre: number
  promedioSeg: number | null
  p90Seg: number | null
  /** Fracción 0..1; 1 cuando no hay datos del turno. */
  cumplimientoPct: number
}

export type HistorialFila = {
  id: string
  numero: string
  pedidoFolio: string
  estacionNombre: string
  estado: ComandaEstado
  estadoTone: StatusTone
  enviadaEn: string
  listaEn: string | null
  entregadaEn: string | null
  preparacionSeg: number | null
  responsable: string | null
}

export type HistorialTurnoResp = {
  actualizadoEn: string
  turnoId: string
  turnoNombre: string
  inicioTurno: string
  cumplimientoGlobalPct: number
  sla: SlaEstacionFila[]
  vencidas: ComandaMonitor[]
  filas: HistorialFila[]
}

/* -------------------------------------------------------------------------- */
/* Excepciones (anulaciones, reimpresiones y agotados)                         */
/* -------------------------------------------------------------------------- */

export type TipoExcepcion = "anulacion" | "reimpresion" | "agotado"

export type OrigenAgotado = "cocina" | "salon" | "backoffice"

export type Excepcion = {
  id: string
  tipo: TipoExcepcion
  comandaNumero: string | null
  pedidoFolio: string | null
  producto: string | null
  estacionNombre: string | null
  detalle: string
  responsable: string
  origen: OrigenAgotado | null
  ocurridaEn: string
  auditoriaId: string
}

export type ExcepcionesResp = {
  actualizadoEn: string
  excepciones: Excepcion[]
  resumen: { anulaciones: number; reimpresiones: number; agotados: number }
}

/* -------------------------------------------------------------------------- */
/* Mutaciones                                                                  */
/* -------------------------------------------------------------------------- */

export type ReimprimirPayload = { motivo: string }
export type ReimprimirResp = { ok: true; trabajo: TrabajoImpresion }

export type ReasignarPayload = { estacionId: string; motivo: string }
export type ReasignarResp = {
  ok: true
  comandaId: string
  estacionId: string
  estacionNombre: string
  motivo: string
  auditoriaId: string
}

export type ExportacionResp = {
  ok: true
  exportacionId: string
  tipo: string
  generadaEn: string
}

export type Turno = { id: string; nombre: string }

/* -------------------------------------------------------------------------- */
/* Etiquetas y mapas                                                           */
/* -------------------------------------------------------------------------- */

export const MODALIDAD_LABEL: Record<Modalidad, string> = {
  mesa: "Mesa",
  recoger: "Recoger",
  domicilio: "Domicilio",
}

export const ESTADO_LABEL: Record<ComandaEstado, string> = {
  pendiente: "Pendiente",
  impresa: "Impresa",
  en_preparacion: "En preparación",
  lista: "Lista",
  entregada: "Entregada",
  anulada: "Anulada",
}

export const ESTADO_TONE: Record<ComandaEstado, StatusTone> = {
  pendiente: "gray",
  impresa: "blue",
  en_preparacion: "amber",
  lista: "green",
  entregada: "outline",
  anulada: "gray",
}

export const LINEA_ESTADO_LABEL: Record<ComandaLineaEstado, string> = {
  pendiente: "Pendiente",
  en_preparacion: "En preparación",
  lista: "Lista",
  anulada: "Anulada",
}

export const SEMAFORO_LABEL: Record<Semaforo, string> = {
  normal: "En tiempo",
  por_vencer: "Por vencer",
  vencida: "Vencida",
}

export const TIPO_EXCEPCION_LABEL: Record<TipoExcepcion, string> = {
  anulacion: "Anulación",
  reimpresion: "Reimpresión",
  agotado: "Agotado",
}

export const ORIGEN_AGOTADO_LABEL: Record<OrigenAgotado, string> = {
  cocina: "Cocina",
  salon: "Salón",
  backoffice: "Backoffice",
}
