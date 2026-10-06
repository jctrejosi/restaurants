/* ==========================================================================
   Módulo 19 · Sucursal y ajustes — tipos y catálogos compartidos
   ========================================================================== */

export type Franja = "desayuno" | "comida" | "cena"

export const FRANJAS: Franja[] = ["desayuno", "comida", "cena"]

export const FRANJA_LABEL: Record<Franja, string> = {
  desayuno: "Desayuno",
  comida: "Comida",
  cena: "Cena",
}

export const DIAS_SEMANA = [
  { id: 1, nombre: "Lunes" },
  { id: 2, nombre: "Martes" },
  { id: 3, nombre: "Miércoles" },
  { id: 4, nombre: "Jueves" },
  { id: 5, nombre: "Viernes" },
  { id: 6, nombre: "Sábado" },
  { id: 0, nombre: "Domingo" },
]

export const ZONAS_HORARIAS = [
  "America/Mexico_City",
  "America/Cancun",
  "America/Monterrey",
  "America/Tijuana",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "Europe/Madrid",
]

export const MONEDAS = ["MXN", "USD", "EUR", "COP", "PEN", "CLP"]

/* -------------------------------------------------------------------------- */
/* Sucursal y horarios                                                         */
/* -------------------------------------------------------------------------- */

export type Sucursal = {
  id: string
  nombre: string
  codigo: string
  direccion: string
  ciudad: string
  telefono: string
  coordenadas: string
  zonaHoraria: string
  moneda: string
  activa: boolean
}

export type HorarioAtencion = {
  id: string
  diaSemana: number
  franja: Franja
  horaApertura: string
  horaCierre: string
}

export type CierreTemporal = {
  id: string
  desde: string
  hasta: string
  motivo: string
  /** Reservas futuras dentro del rango; enlaza con el módulo 03 (RN-R5-11). */
  reservasAfectadas: number
}

export type Impuesto = {
  id: string
  nombre: string
  /** 1900 = 19 %. */
  tasaBps: number
  tipo: "incluido" | "adicionado" | "inc"
  activo: boolean
}

export const TIPO_IMPUESTO_LABEL: Record<Impuesto["tipo"], string> = {
  incluido: "Incluido en precio",
  adicionado: "Adicionado al total",
  inc: "INC",
}

export type ComportamientoOffline = "completo" | "solo_lectura"

export const OFFLINE_LABEL: Record<ComportamientoOffline, string> = {
  completo: "Operación completa sin conexión",
  solo_lectura: "Solo lectura sin conexión",
}

export type LimiteFranja = {
  franja: Franja
  maximoPedidos: number
}

export type ConfiguracionSucursal = {
  propinaSugeridaPct: number
  copiasComanda: number
  copiasFactura: number
  borradoComandaImpresa: boolean
  comportamientoOffline: ComportamientoOffline
  ventanaProgramacionMin: number
  limitesFranja: LimiteFranja[]
}

export type AjustesResp = {
  sucursal: Sucursal
  /** Catálogo global del tenant (editable solo con `ajustes.global`). */
  impuestos: Impuesto[]
}

export type HorariosResp = {
  horarios: HorarioAtencion[]
  cierres: CierreTemporal[]
}

export type ParametrosResp = {
  configuracion: ConfiguracionSucursal
}

/* -------------------------------------------------------------------------- */
/* Notificaciones (V1)                                                         */
/* -------------------------------------------------------------------------- */

export type CanalNotificacion = "email" | "sms" | "whatsapp" | "push"

export const CANALES: CanalNotificacion[] = ["email", "sms", "whatsapp", "push"]

export const CANAL_LABEL: Record<CanalNotificacion, string> = {
  email: "Correo",
  sms: "SMS",
  whatsapp: "WhatsApp",
  push: "Push",
}

export type EventoNotificacion =
  | "pedido.confirmado"
  | "pedido.listo"
  | "pedido.en_camino"
  | "pedido.entregado"
  | "reserva.confirmada"
  | "reserva.recordatorio"
  | "turno.cierre"
  | "dispositivo.sync"

export const EVENTOS: {
  id: EventoNotificacion
  label: string
  variables: string[]
}[] = [
  { id: "pedido.confirmado", label: "Pedido confirmado", variables: ["{{cliente}}", "{{folio}}", "{{total}}", "{{sucursal}}"] },
  { id: "pedido.listo", label: "Pedido listo para recoger", variables: ["{{cliente}}", "{{folio}}", "{{sucursal}}"] },
  { id: "pedido.en_camino", label: "Pedido en camino", variables: ["{{cliente}}", "{{folio}}", "{{repartidor}}"] },
  { id: "pedido.entregado", label: "Pedido entregado", variables: ["{{cliente}}", "{{folio}}", "{{total}}"] },
  { id: "reserva.confirmada", label: "Reserva confirmada", variables: ["{{cliente}}", "{{fecha}}", "{{hora}}", "{{personas}}"] },
  { id: "reserva.recordatorio", label: "Recordatorio de reserva", variables: ["{{cliente}}", "{{fecha}}", "{{hora}}", "{{sucursal}}"] },
  { id: "turno.cierre", label: "Cierre de turno", variables: ["{{sucursal}}", "{{fecha}}", "{{total}}"] },
  { id: "dispositivo.sync", label: "Sincronización de dispositivo", variables: ["{{dispositivo}}", "{{pendientes}}", "{{sucursal}}"] },
]

export type PlantillaNotificacion = {
  id: string
  evento: EventoNotificacion
  canal: CanalNotificacion
  idioma: string
  asunto: string
  cuerpo: string
}

export type ConfiguracionNotificacion = {
  evento: EventoNotificacion
  canal: CanalNotificacion
  plantillaId: string | null
  activo: boolean
}

export type NotificacionesResp = {
  plantillas: PlantillaNotificacion[]
  configuracion: ConfiguracionNotificacion[]
}

/* -------------------------------------------------------------------------- */
/* Programación (V1)                                                           */
/* -------------------------------------------------------------------------- */

export type VentanaProgramacion = {
  id: string
  tipo: "pedido" | "recogida"
  /** Días ISO: 0 = domingo … 6 = sábado. */
  dias: number[]
  desde: string
  hasta: string
  maxPedidos: number | null
  activa: boolean
}

/* -------------------------------------------------------------------------- */
/* Sucursales                                                                  */
/* -------------------------------------------------------------------------- */

export type SucursalesResp = {
  data: Sucursal[]
}

export type ClonarConfiguracion = {
  configuracion: boolean
  horarios: boolean
  mediosPago: boolean
  capacidad: boolean
}

export type CrearSucursalPayload = {
  nombre: string
  codigo: string
  direccion: string
  ciudad: string
  telefono: string
  zonaHoraria: string
  moneda: string
  /** Sede base a clonar; `null` = configuración por defecto. */
  clonarDe: string | null
  copiar: ClonarConfiguracion
  motivo: string
}

/* -------------------------------------------------------------------------- */
/* Vista previa del efecto                                                     */
/* -------------------------------------------------------------------------- */

export type PreviewCambio = {
  area: string
  antes: string
  despues: string
  /** Interfaces afectadas, p. ej. «Web y APK · este cambio aplica al reconectar». */
  efecto: string
}

export function resumenDias(dias: number[]): string {
  if (dias.length === 0) return "Ningún día"
  if (dias.length === 7) return "Todos los días"
  const ordenados = [...dias].sort((a, b) => a - b)
  return ordenados.map((dia) => DIAS_SEMANA.find((item) => item.id === dia)?.nombre.slice(0, 3) ?? dia).join(", ")
}
