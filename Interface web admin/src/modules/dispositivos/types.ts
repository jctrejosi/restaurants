import type { StatusTone } from "@/components/ui/StatusBadge"

/* -------------------------------------------------------------------------- */
/* Catálogos                                                                   */
/* -------------------------------------------------------------------------- */

/** El brief menciona *print agent*; se modela aquí además del CHECK original. */
export type DispositivoTipo = "apk" | "kds" | "caja" | "print_agent"

export const TIPO_DISPOSITIVO_LABEL: Record<DispositivoTipo, string> = {
  apk: "APK mesero",
  kds: "KDS",
  caja: "Caja",
  print_agent: "Print agent",
}

export type DispositivoEstado = "vinculado" | "revocado"

export const ESTADO_DISPOSITIVO_LABEL: Record<DispositivoEstado, string> = {
  vinculado: "Vinculado",
  revocado: "Revocado",
}

export const ESTADO_DISPOSITIVO_TONE: Record<DispositivoEstado, StatusTone> = {
  vinculado: "green",
  revocado: "gray",
}

export type EstacionDispositivo = {
  id: string
  nombre: string
  tipo: "preparacion" | "despacho"
  activa: boolean
}

export type TitularDispositivo = {
  id: string
  nombre: string
}

/* -------------------------------------------------------------------------- */
/* Dispositivos                                                                */
/* -------------------------------------------------------------------------- */

export type Dispositivo = {
  id: string
  tipo: DispositivoTipo
  sucursalId: string
  sucursalNombre: string
  usuarioId?: string
  usuarioNombre?: string
  estacionId?: string
  estacionNombre?: string
  versionApp: string
  ultimaConexionEn: string | null
  estado: DispositivoEstado
  creadoEn: string
  version: number
}

export type VersionMinima = {
  tipo: DispositivoTipo
  versionMinima: string
  /** V1: APK/KDS fuerzan la actualización; caja/print agent solo avisan. */
  forzar: boolean
}

export type ParqueTipo = {
  total: number
  desactualizados: number
}

export type VersionesMinimasResp = {
  versiones: VersionMinima[]
  /** Parque instalado por tipo: cuántos equipos quedan por debajo del mínimo. */
  parque: Record<DispositivoTipo, ParqueTipo>
}

export type OperacionSyncEstado = "pendiente" | "aplicada" | "rechazada"

export type SyncOperacion = {
  id: string
  clientOpId: string
  tipo: string
  estado: OperacionSyncEstado
  creadoEn: string
  aplicadoEn?: string | null
  error?: string | null
}

export type AlertaDispositivo = {
  id: string
  titulo: string
  detalle: string
  severidad: "critica" | "alta" | "media" | "baja"
  estado: "abierta" | "atendida"
  creadaEn: string
}

export type DiagnosticoResp = {
  dispositivo: Dispositivo
  operacionesPendientes: number
  operacionesRechazadas: number
  ultimoError: string | null
  operaciones: SyncOperacion[]
  alertas: AlertaDispositivo[]
  historial: { id: string; evento: string; creadoEn: string }[]
}

export type DispositivosResumen = {
  vinculados: number
  revocados: number
  desactualizados: number
  sinConexion: number
}

export type DispositivosResp = {
  data: Dispositivo[]
  total: number
  page: number
  pageSize: number
  resumen: DispositivosResumen
}

export type DispositivosFiltros = {
  page: number
  pageSize: number
  busqueda?: string
  tipo?: DispositivoTipo
  estado?: DispositivoEstado
  desactualizados?: boolean
  sedeId?: string
}

export const TIPOS_DISPOSITIVO: DispositivoTipo[] = ["apk", "kds", "caja", "print_agent"]

/* -------------------------------------------------------------------------- */
/* Cargas de trabajo                                                           */
/* -------------------------------------------------------------------------- */

export type VincularDispositivoPayload = {
  tipo: DispositivoTipo
  sucursalId: string
  usuarioId?: string
  estacionId?: string
}

export type VincularDispositivoResp = {
  dispositivo: Dispositivo
  /** Token de un solo uso; solo viaja en la respuesta de vinculación. */
  token: string
  expiraEn: string
}

export type RevocarDispositivoPayload = {
  id: string
  motivo: string
}

export type EditarDispositivoPayload = {
  id: string
  usuarioId?: string | null
  estacionId?: string | null
}

export type GuardarVersionesPayload = {
  versiones: VersionMinima[]
  motivo: string
}

/* -------------------------------------------------------------------------- */
/* Comparación de versiones                                                    */
/* -------------------------------------------------------------------------- */

/** `esVersionMenor("2.2.7", "2.3.0") → true` (v1 se considera menor que v2). */
export function esVersionMenor(actual: string, minima: string): boolean {
  const a = actual.split(".").map((parte) => Number(parte) || 0)
  const b = minima.split(".").map((parte) => Number(parte) || 0)
  const largo = Math.max(a.length, b.length)
  for (let indice = 0; indice < largo; indice += 1) {
    const valorA = a[indice] ?? 0
    const valorB = b[indice] ?? 0
    if (valorA < valorB) return true
    if (valorA > valorB) return false
  }
  return false
}
