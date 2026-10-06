import type { StatusTone } from "@/components/ui/StatusBadge"

/* -------------------------------------------------------------------------- */
/* Dominio del módulo «Tiempos y SLA» (plan admin-modules/15)                  */
/*                                                                             */
/* Cada tramo es una resta de **sellos del servidor** (R5 §5.3); sin evento de  */
/* cierre el valor es nulo («—») y no entra en media/p90.                      */
/* -------------------------------------------------------------------------- */

export type TramoId =
  | "atencion"
  | "preparacion"
  | "despacho"
  | "ruta"
  | "recogida"
  | "cobro"
  | "total"
  | "reserva"
  | "sla"

export type EntidadTiempo = "pedido" | "comanda" | "sesion_mesa" | "reserva"

export type Semaforo = "normal" | "por_vencer" | "vencida" | "sin_objetivo"

export type Sello = {
  evento: string
  etiqueta: string
  /** Hora del **servidor** (RN-R5-08). */
  hora: string
  actor: string
  actorRol: string
  canal: string
  dispositivo: string | null
}

export type FormulaTramo = {
  id: TramoId
  label: string
  /** Fórmula visible en tooltip, p. ej. «= pagado − por cobrar». */
  formula: string
  inicio: string
  cierre: string
  descripcion: string
}

export const TRAMOS: Record<TramoId, FormulaTramo> = {
  atencion: {
    id: "atencion",
    label: "Atención",
    formula: "= enviado − creado",
    inicio: "creado_en",
    cierre: "enviado_en",
    descripcion: "Del alta del pedido al envío a cocina; por canal, mesero y mesa.",
  },
  preparacion: {
    id: "preparacion",
    label: "Preparación",
    formula: "= listo − enviado",
    inicio: "enviado_en",
    cierre: "listo_en",
    descripcion: "Del envío a comanda hasta que el pedido está listo; también por estación.",
  },
  despacho: {
    id: "despacho",
    label: "Despacho",
    formula: "= entregado − listo",
    inicio: "listo_en",
    cierre: "entregado_en",
    descripcion: "De listo a entregado en mesa; responsabilidad del mesero.",
  },
  ruta: {
    id: "ruta",
    label: "Ruta y recogida",
    formula: "= entregado − recogido",
    inicio: "recogido_en",
    cierre: "entregado_en",
    descripcion: "Domicilio: del reparto en ruta hasta la entrega al cliente.",
  },
  recogida: {
    id: "recogida",
    label: "Recogida en mostrador",
    formula: "= recogido_en − listo",
    inicio: "listo_en",
    cierre: "recogido_en",
    descripcion: "Para recoger: de listo a que el cliente lo recoge.",
  },
  cobro: {
    id: "cobro",
    label: "Cobro",
    formula: "= pagado − por cobrar",
    inicio: "por_cobrar_en",
    cierre: "pagado_en",
    descripcion: "Caja y cierre de mesa; del aviso de cobro al pago registrado.",
  },
  total: {
    id: "total",
    label: "Total",
    formula: "= pagado/entregado − creado",
    inicio: "creado_en",
    cierre: "pagado_en",
    descripcion: "Indicador integral del ciclo del pedido.",
  },
  reserva: {
    id: "reserva",
    label: "Reservas",
    formula: "= sentada − fecha_hora",
    inicio: "fecha_hora",
    cierre: "sentada_en",
    descripcion: "Espera de la reserva; la rotación de mesa es cierre − apertura.",
  },
  sla: {
    id: "sla",
    label: "Cumplimiento de SLA",
    formula: "comandas dentro del objetivo ÷ total",
    inicio: "enviada_en",
    cierre: "lista_en",
    descripcion: "Por estación contra `regla_sla`; sin objetivo no computa.",
  },
}

export const SEMAFORO_LABEL: Record<Semaforo, string> = {
  normal: "En tiempo",
  por_vencer: "Por vencer",
  vencida: "Fuera de objetivo",
  sin_objetivo: "Sin objetivo",
}

export const SEMAFORO_TONE: Record<Semaforo, StatusTone> = {
  normal: "green",
  por_vencer: "amber",
  vencida: "amber",
  sin_objetivo: "gray",
}

export type TiempoFila = {
  id: string
  tramo: TramoId
  entidad: EntidadTiempo
  entidadId: string
  folio: string
  sedeId: string
  sedeNombre: string
  canal: string
  canalLabel: string
  modalidad: string
  modalidadLabel: string
  mesero: string
  estacionNombre: string | null
  /** Duración medida en segundos; `null` sin evento de cierre. */
  tramoSeg: number | null
  objetivoSeg: number | null
  /** Origen del objetivo del semáforo: `regla_sla` o promedio del período. */
  objetivoFuente?: "sla" | "promedio" | null
  semaforo: Semaforo
  /** Sello inicial (actor, canal y hora del servidor). */
  selloInicio: Sello
  selloCierre: Sello | null
}

export type TiemposResumen = {
  /** Media de las filas medidas (las nulas no promedian). */
  mediaSeg: number | null
  p90Seg: number | null
  medidos: number
  sinCierre: number
  objetivoSeg: number | null
}

export type DimensionPreparacion = "pedido" | "estacion"

export type TiemposResp = {
  actualizadoEn: string
  etiquetaRango: string
  tramo: TramoId
  dimension: DimensionPreparacion
  resumen: TiemposResumen
  filas: TiempoFila[]
}

export type SlaFila = {
  estacionId: string
  estacionNombre: string
  objetivoSeg: number | null
  comandasMedidas: number
  dentroSla: number
  /** `null` cuando la estación no tiene `regla_sla`: no se inventa objetivo. */
  pctCumplimiento: number | null
  preparacionMediaSeg: number | null
  p90Seg: number | null
  sinCierre: number
}

export type PuntoSla = { fecha: string; etiqueta: string; pctCumplimiento: number | null; medidas: number }

export type SlaResp = {
  actualizadoEn: string
  filas: SlaFila[]
  historial: PuntoSla[]
}

export type TiemposFiltros = {
  tramo: TramoId
  dimension: DimensionPreparacion
  desde?: string
  hasta?: string
  estacionId?: string
  mesero?: string
  canal?: string
}

export type ExportacionTiemposResp = {
  id: string
  estado: "pendiente" | "procesando"
  tipo: string
  formato: string
  filasEstimadas: number
  segundoPlano: boolean
  aviso: string | null
  creadoEn: string
}
