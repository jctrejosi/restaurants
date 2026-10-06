import type { StatusTone } from "@/components/ui/StatusBadge"

/* -------------------------------------------------------------------------- */
/* Dominio del módulo «Salón» (plan admin-modules/05)                          */
/* RF-R5-20 y 21 (MVP); 22 (uniones) y 23 (aforo) en V1.                       */
/* -------------------------------------------------------------------------- */

export type MesaEstado = "libre" | "ocupada" | "por_cobrar" | "reservada" | "fuera_servicio"

export type MesaForma = "cuadrada" | "redonda"

export type Zona = {
  id: string
  sedeId: string
  nombre: string
  aforo: number
  orden: number
  /** Rectángulo en celdas del grid del mapa. */
  x: number
  y: number
  ancho: number
  alto: number
}

export type Mesa = {
  id: string
  zonaId: string
  numero: string
  capacidad: number
  estado: MesaEstado
  forma: MesaForma
  /** Posición en celdas del grid (centro de la mesa). */
  posX: number
  posY: number
  /** Baja lógica: no se borra (plan 05 §4). */
  activa: boolean
  desde?: string
  por?: string
  sesionAbierta: boolean
  reservasFuturas: number
}

export type UnionMesa = {
  id: string
  zonaId: string
  mesaIds: string[]
  nombre: string
  creadaEn: string
  creadaPor: string
}

export type FranjaAforo = {
  id: string
  nombre: string
  desdeHora: string
  hastaHora: string
}

export type AforoZonaFranja = {
  zonaId: string
  franjaId: string
  aforo: number
  /** Reservas ya comprometidas en la franja (efecto sobre disponibilidad). */
  reservas: number
}

export type AsignacionMesero = {
  id: string
  usuario: string
  zonaId?: string
  mesaId?: string
  desde: string
  hasta: string
}

export type SalonMapa = {
  sedeId: string
  sedeNombre: string
  zonas: Zona[]
  mesas: Mesa[]
  uniones: UnionMesa[]
  franjas: FranjaAforo[]
  aforos: AforoZonaFranja[]
  asignaciones: AsignacionMesero[]
  actualizadoEn: string
}

/* -------------------------------------------------------------------------- */
/* Payloads                                                                    */
/* -------------------------------------------------------------------------- */

export type ZonaPayload = {
  sedeId: string
  nombre: string
  aforo: number
  orden?: number
  x: number
  y: number
  ancho: number
  alto: number
}

export type ZonaEdicionPayload = {
  id: string
  nombre?: string
  aforo?: number
  orden?: number
  x?: number
  y?: number
  ancho?: number
  alto?: number
  motivo?: string
}

export type MesaPayload = {
  zonaId: string
  numero: string
  capacidad: number
  posX: number
  posY: number
  forma?: MesaForma
  activa?: boolean
}

export type MesaEdicionPayload = {
  id: string
  zonaId?: string
  numero?: string
  capacidad?: number
  posX?: number
  posY?: number
  forma?: MesaForma
  activa?: boolean
  motivo?: string
}

export type MapaCambio = { id: string; posX: number; posY: number }

export type MesaEstadoPayload = {
  id: string
  estado: Exclude<MesaEstado, "fuera_servicio">
  motivo: string
}

export type FueraServicioPayload = {
  id: string
  motivo: string
  /** Confirma el bloqueo cuando hay reservas futuras (plan 05 §8). */
  confirmar?: boolean
  hasta?: string
}

export type UnionPayload = { mesaIds: string[]; nombre?: string }

export type AforoFranjaPayload = { franjaId: string; aforo: number }

export type ExportacionSalon = {
  id: string
  tipo: "plano" | "elementos"
  formato: "pdf" | "png" | "csv"
  estado: "en_proceso" | "lista"
  creadoEn: string
}

/* -------------------------------------------------------------------------- */
/* Etiquetas y tonalidades                                                     */
/* -------------------------------------------------------------------------- */

export const MESA_ESTADO_LABEL: Record<MesaEstado, string> = {
  libre: "Libre",
  ocupada: "Ocupada",
  por_cobrar: "Por cobrar",
  reservada: "Reservada",
  fuera_servicio: "Fuera de servicio",
}

export const MESA_ESTADO_TONE: Record<MesaEstado, StatusTone> = {
  libre: "green",
  ocupada: "amber",
  por_cobrar: "gray",
  reservada: "blue",
  fuera_servicio: "outline",
}

export const MESA_ESTADO_DESCRIPCION: Record<MesaEstado, string> = {
  libre: "Disponible para sentar",
  ocupada: "Con sesión abierta por el APK",
  por_cobrar: "Sesión cerrada pendiente de cobro",
  reservada: "Con reserva próxima confirmada",
  fuera_servicio: "Bloqueada por mantenimiento: no se ofrece",
}

export const FORMA_LABEL: Record<MesaForma, string> = {
  cuadrada: "Cuadrada",
  redonda: "Redonda",
}

/** Celdas del grid del mapa (px por celda). */
export const CELDA = 40

export function mesaOperativa(mesa: Mesa): boolean {
  return mesa.activa && mesa.estado !== "fuera_servicio"
}

export function resumenMesas(mesas: Mesa[]): Record<MesaEstado, number> {
  const resumen: Record<MesaEstado, number> = { libre: 0, ocupada: 0, por_cobrar: 0, reservada: 0, fuera_servicio: 0 }
  for (const mesa of mesas) resumen[mesa.estado] += 1
  return resumen
}
