import type { KpiData } from "@/components/data/KpiCard"
import type { StatusTone } from "@/components/ui/StatusBadge"

export type Modalidad = "mesa" | "recoger" | "domicilio"

export type PedidoActivo = {
  id: string
  folio: string
  modalidad: Modalidad
  etiqueta: string
  canal: string
  estado: string
  estadoTone: StatusTone
  totalCentavos: number
  transcurridoSeg: number
  /** Objetivo de SLA del pedido; si se supera, el tiempo se marca en rojo. */
  slaSeg?: number
}

export type ComandaResumen = {
  numero: string
  estacion: string
  estado: string
  transcurridoSeg: number
  slaSeg: number
}

export type ProximaLlegada = {
  hora: string
  cliente: string
  personas: number
  mesa?: string
}

export type EnVivoResumen = {
  actualizadoEn: string
  kpis: KpiData[]
  pedidosActivos: PedidoActivo[]
  comandas: ComandaResumen[]
  proximasLlegadas: ProximaLlegada[]
}

export const MODALIDAD_LABEL: Record<Modalidad, string> = {
  mesa: "Mesa",
  recoger: "Recoger",
  domicilio: "Domicilio",
}
