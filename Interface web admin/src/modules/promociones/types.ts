/**
 * Tipos del módulo Promociones (plan 08): promociones/banners con vigencia y
 * sede, cupones con reglas y control de abuso, newsletter con consentimiento,
 * reseñas moderadas y métricas UTM (V2).
 */

import type { StatusTone } from "@/components/ui/StatusBadge"

export type PromocionTipo = "banner" | "destacado"

export const PROMOCION_TIPO_LABEL: Record<PromocionTipo, string> = {
  banner: "Banner",
  destacado: "Destacado",
}

export type PromocionEstado = "vigente" | "programada" | "vencida" | "pausada"

export const PROMOCION_ESTADO_LABEL: Record<PromocionEstado, string> = {
  vigente: "Vigente",
  programada: "Programada",
  vencida: "Vencida",
  pausada: "Pausada",
}

export const PROMOCION_ESTADO_TONE: Record<PromocionEstado, StatusTone> = {
  vigente: "green",
  programada: "blue",
  vencida: "gray",
  pausada: "amber",
}

export type Promocion = {
  id: string
  titulo: string
  descripcion: string
  tipo: PromocionTipo
  /** `null` = aplica a todas las sedes. */
  sucursalId: string | null
  desde: string
  hasta: string
  /** Pausada = existía pero no está publicada; vencida nunca se publica. */
  publicada: boolean
  imagenUrl: string
  enlace: string
  actualizadoEn: string
  actualizadoPor: string
  version: number
}

export type PromocionPayload = {
  titulo: string
  descripcion: string
  tipo: PromocionTipo
  sucursalId: string | null
  desde: string
  hasta: string
  imagenUrl: string
  enlace: string
  version?: number
}

export type PromocionesFiltros = {
  estado?: PromocionEstado
  tipo?: PromocionTipo
  sucursalId?: string
  q?: string
}

export type PromocionesRespuesta = {
  data: Promocion[]
  total: number
}

export function estadoPromocion(promocion: Promocion, ahora: Date = new Date()): PromocionEstado {
  const hasta = new Date(promocion.hasta).getTime()
  const desde = new Date(promocion.desde).getTime()
  if (hasta < ahora.getTime()) return "vencida"
  if (!promocion.publicada) return "pausada"
  if (desde > ahora.getTime()) return "programada"
  return "vigente"
}

export type CuponTipo = "porcentaje" | "monto"

export const CUPON_TIPO_LABEL: Record<CuponTipo, string> = {
  porcentaje: "Porcentaje",
  monto: "Monto fijo",
}

export type Cupon = {
  id: string
  codigo: string
  tipo: CuponTipo
  /** Porcentaje en puntos base (1000 = 10%) o monto en centavos. */
  valor: number
  sucursalId: string | null
  desde: string
  hasta: string
  usos: number
  usosMaximo: number
  maximoPorCliente: number
  activo: boolean
  actualizadoEn: string
  actualizadoPor: string
  version: number
}

export type CuponPayload = {
  codigo: string
  tipo: CuponTipo
  valor: number
  sucursalId: string | null
  desde: string
  hasta: string
  usosMaximo: number
  maximoPorCliente: number
  activo: boolean
  version?: number
}

export type CuponesFiltros = {
  estado?: "activo" | "agotado" | "no_aplica"
  q?: string
}

/** Explica por qué un cupón agotado/vencido no aplica (RF-R5-101). */
export function motivoNoAplica(cupon: Cupon, ahora: Date = new Date()): string | null {
  if (new Date(cupon.hasta).getTime() < ahora.getTime()) {
    return `Venció el ${new Date(cupon.hasta).toLocaleDateString("es-MX")}`
  }
  if (!cupon.activo) return "Cupón pausado por el panel"
  if (cupon.usos >= cupon.usosMaximo) return `Usos agotados (${cupon.usos} de ${cupon.usosMaximo})`
  return null
}

export type Suscriptor = {
  id: string
  correo: string
  nombre: string | null
  consentimientoEn: string | null
  origen: string
  activo: boolean
  altaEn: string
}

export type Segmento = {
  id: string
  nombre: string
  criterio: string
  destinatarios: number
  conConsentimiento: number
}

export type PlantillaNotificacion = {
  id: string
  nombre: string
  evento: string
  canal: string
  idioma: string
}

export type EnvioEstado = "pendiente" | "enviada" | "fallida" | "cancelada"

export const ENVIO_ESTADO_LABEL: Record<EnvioEstado, string> = {
  pendiente: "Pendiente",
  enviada: "Enviada",
  fallida: "Fallida",
  cancelada: "Cancelada",
}

export type EnvioNewsletter = {
  id: string
  plantillaNombre: string
  segmentoNombre: string
  destinatarios: number
  excluidos: number
  estado: EnvioEstado
  creadoEn: string
  error: string | null
}

export type ResenaFuente = "web" | "google" | "tripadvisor" | "otra"

export const RESENA_FUENTE_LABEL: Record<ResenaFuente, string> = {
  web: "Web",
  google: "Google",
  tripadvisor: "TripAdvisor",
  otra: "Otra",
}

export type ResenaEstado = "pendiente" | "publicada" | "rechazada"

export const RESENA_ESTADO_LABEL: Record<ResenaEstado, string> = {
  pendiente: "Pendiente",
  publicada: "Publicada",
  rechazada: "Rechazada",
}

export const RESENA_ESTADO_TONE: Record<ResenaEstado, StatusTone> = {
  pendiente: "amber",
  publicada: "green",
  rechazada: "gray",
}

export type Resena = {
  id: string
  puntaje: number
  comentario: string
  fuente: ResenaFuente
  autor: string
  sucursalId: string
  creadaEn: string
  estado: ResenaEstado
  moderadaPor: string | null
  moderadaEn: string | null
  motivoRechazo: string | null
}

export type ResenasFiltros = {
  estado?: ResenaEstado
  fuente?: ResenaFuente
}

export type EncuestaResumen = {
  tipo: "pedido" | "reserva" | "visita"
  respuestas: number
  promedio: number
  nps: number
}

export type MetricaUtm = {
  id: string
  campana: string
  origen: string
  medio: string
  pedidos: number
  reservas: number
  ingresoCentavos: number
}

export type MetricasRespuesta = {
  actualizadoEn: string
  filas: MetricaUtm[]
}
