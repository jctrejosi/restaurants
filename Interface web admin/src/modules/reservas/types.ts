import type { StatusTone } from "@/components/ui/StatusBadge"

/* -------------------------------------------------------------------------- */
/* Dominio del módulo «Reservas» (plan admin-modules/03)                       */
/* RF-R5-40…44 y 47 (MVP); 45 (depósitos) y 46 (bloqueos) en V1.               */
/* -------------------------------------------------------------------------- */

export type ReservaEstado =
  | "solicitada"
  | "confirmada"
  | "sentada"
  | "finalizada"
  | "no_show"
  | "cancelada"

/** Canal por el que entró la reserva (RF-R5-41: alta manual teléfono/mostrador). */
export type CanalReserva = "web" | "apk" | "telefono" | "mostrador"

export type DepositoEstado = "no_requerido" | "pendiente" | "pagado" | "reembolsado"

export type DepositoRegla = "ninguno" | "grupos" | "siempre"

export type TipoBloqueo = "festivo" | "cierre" | "evento"

export type EstadoEspera = "esperando" | "ofrecida" | "aceptada" | "expirada" | "cancelada"

export type ActorReservaTipo = "cliente" | "mesero" | "administrador" | "automatizacion"

export type BitacoraReservaTipo =
  | "solicitada"
  | "confirmada"
  | "editada"
  | "mesa_asignada"
  | "recordatorio_enviado"
  | "reagendada"
  | "cancelada_cliente"
  | "cancelada_local"
  | "sentada"
  | "no_show"
  | "finalizada"
  | "deposito_registrado"
  | "deposito_reembolsado"

export type CanalBitacoraReserva = CanalReserva | "panel"

export type CampoDiff = { campo: string; antes: string; despues: string }

export type EventoReserva = {
  id: string
  tipo: BitacoraReservaTipo
  actor: string
  actorTipo: ActorReservaTipo
  canal: CanalBitacoraReserva
  dispositivo: string
  /** Hora del servidor (RN-R5-08). */
  servidorEn: string
  resultado: string
  detalle?: string
  diffs?: CampoDiff[]
}

/* -------------------------------------------------------------------------- */
/* Lista y detalle                                                             */
/* -------------------------------------------------------------------------- */

export type ReservaLista = {
  id: string
  codigo: string
  fechaHora: string
  duracionMin: number
  personas: number
  estado: ReservaEstado
  canal: CanalReserva
  sedeId: string
  sedeNombre: string
  zonaId?: string
  zonaNombre?: string
  mesaId?: string
  mesaNumero?: string
  clienteNombre: string
  telefono?: string
  correo?: string
  notas?: string
  depositoRequeridoCentavos: number
  depositoPagadoCentavos: number
  depositoEstado: DepositoEstado
  creadaEn: string
}

export type SelloReserva = { etiqueta: string; en?: string }

/** Tiempos clave calculados con sellos del servidor (RF-R5-47). */
export type TiemposReserva = {
  /** `sentada − fecha_hora`; `null` = sin evento (se muestra «—», no promedia). */
  esperaSeg: number | null
  /** `finalizada − sentada`; `null` = mesa todavía en curso o sin cierre. */
  duracionMesaSeg: number | null
}

export type MovimientoDeposito = {
  id: string
  tipo: "cobro" | "reembolso"
  montoCentavos: number
  en: string
  usuario: string
  motivo?: string
  /** Conciliación con Caja (módulos 11–12) pendiente/habilitada. */
  conciliado: boolean
}

export type DepositoReserva = {
  estado: DepositoEstado
  requeridoCentavos: number
  pagadoCentavos: number
  movimientos: MovimientoDeposito[]
}

export type ReservaDetalle = ReservaLista & {
  zonaHoraria: string
  politicaSnapshot: PoliticaReserva
  sellos: {
    creadaEn: string
    confirmadaEn?: string
    sentadaEn?: string
    finalizadaEn?: string
    noShowEn?: string
    canceladaEn?: string
  }
  tiempos: TiemposReserva
  deposito: DepositoReserva
  bitacora: EventoReserva[]
}

/* -------------------------------------------------------------------------- */
/* Políticas, lista de espera, disponibilidad y bloqueos                       */
/* -------------------------------------------------------------------------- */

export type PoliticaReserva = {
  sucursalId: string
  sucursalNombre: string
  /** Antelación mínima para reservar por web. */
  antelacionMinHoras: number
  antelacionMaxDias: number
  duracionMin: number
  toleranciaMin: number
  cancelacionHoras: number
  maximoPersonas: number
  depositoRegla: DepositoRegla
  depositoMontoCentavos: number
  depositoPersonasMin: number
  noShowRegla: string
  confirmacionAutomatica: boolean
  actualizadoEn: string
  actualizadoPor: string
}

export type EsperaItem = {
  id: string
  sedeId: string
  clienteNombre: string
  telefono?: string
  personas: number
  franjaDeseada: string
  vigenciaHasta: string
  estado: EstadoEspera
  notas?: string
  creadaEn: string
}

export type MesaCandidata = {
  id: string
  numero: string
  zonaId: string
  zonaNombre: string
  capacidad: number
  /** Estado operativo del salón (plan 05): una mesa `fuera_servicio` no se ofrece. */
  estado: string
  disponible: boolean
  motivo?: string
}

export type FranjaAlternativa = { fechaHora: string; mesasLibres: number; motivo?: string }

export type DisponibilidadReserva = {
  fechaHora: string
  duracionMin: number
  bloqueado: boolean
  motivoBloqueo?: string
  mesas: MesaCandidata[]
  alternativas: FranjaAlternativa[]
}

export type Bloqueo = {
  id: string
  sedeId: string
  sedeNombre: string
  tipo: TipoBloqueo
  motivo: string
  desde: string
  hasta: string
  zonaId?: string
  zonaNombre?: string
  creadoEn: string
  creadoPor: string
  reservasAfectadas: number
}

export type ImpactoBloqueo = {
  bloqueo: Bloqueo
  total: number
  reservas: ReservaLista[]
}

export type ProximaLlegada = {
  reservaId: string
  codigo: string
  hora: string
  clienteNombre: string
  personas: number
  mesa?: string
  estado: ReservaEstado
  /** Minutos respecto de ahora; negativo = retrasada. */
  minutos: number
}

export type CalendarioReserva = {
  desde: string
  hasta: string
  reservas: ReservaLista[]
  listaEspera: EsperaItem[]
  proximasLlegadas: ProximaLlegada[]
  bloqueos: Bloqueo[]
  actualizadoEn: string
}

/* -------------------------------------------------------------------------- */
/* Filtros, acciones y exportación                                             */
/* -------------------------------------------------------------------------- */

export type ReservasFiltros = {
  page: number
  pageSize: number
  sedeId?: string
  desde?: string
  hasta?: string
  estado?: ReservaEstado
  canal?: CanalReserva
  personasMin?: number
  personasMax?: number
  deposito?: boolean
  busqueda?: string
}

export type ReservasRespuesta = {
  data: ReservaLista[]
  total: number
  page: number
  pageSize: number
}

export type ReservaPayload = {
  sedeId: string
  clienteNombre: string
  telefono?: string
  correo?: string
  fechaHora: string
  duracionMin: number
  personas: number
  canal: CanalReserva
  zonaId?: string
  mesaId?: string
  notas?: string
  /** Si viene de la lista de espera, la convierte en reserva al crearla. */
  esperaId?: string
}

export type ReservaEdicionPayload = {
  id: string
  clienteNombre?: string
  telefono?: string
  correo?: string
  personas?: number
  canal?: CanalReserva
  notas?: string
}

export type AccionReservaNombre =
  | "sentar"
  | "finalizar"
  | "no_show"
  | "cancelar"
  | "reubicar"
  | "registrar_deposito"
  | "reembolsar_deposito"

export type AccionReservaPayload = {
  id: string
  accion: AccionReservaNombre
  motivo: string
  /** Reubicación (RF-R5-41/42). */
  fechaHora?: string
  duracionMin?: number
  mesaId?: string
  /** Depósitos V1 (RF-R5-45). */
  montoCentavos?: number
  /** `true` registra `cancelada_cliente` en lugar de `cancelada_local`. */
  porCliente?: boolean
}

export type BloqueoPayload = {
  sedeId: string
  tipo: TipoBloqueo
  motivo: string
  desde: string
  hasta: string
  zonaId?: string
}

export type ExportacionReserva = {
  id: string
  tipo: "reservas" | "bitacora_reserva"
  formato: "csv" | "xlsx"
  estado: "en_proceso" | "lista"
  creadoEn: string
}

/* -------------------------------------------------------------------------- */
/* Etiquetas y tonalidades                                                     */
/* -------------------------------------------------------------------------- */

export const ESTADO_LABEL: Record<ReservaEstado, string> = {
  solicitada: "Solicitada",
  confirmada: "Confirmada",
  sentada: "Sentada",
  finalizada: "Finalizada",
  no_show: "No-show",
  cancelada: "Cancelada",
}

export const ESTADO_TONE: Record<ReservaEstado, StatusTone> = {
  solicitada: "blue",
  confirmada: "green",
  sentada: "amber",
  finalizada: "gray",
  no_show: "outline",
  cancelada: "gray",
}

export const CANAL_LABEL: Record<CanalReserva, string> = {
  web: "Web",
  apk: "App cliente",
  telefono: "Teléfono",
  mostrador: "Mostrador",
}

export const CANAL_BITACORA_LABEL: Record<CanalBitacoraReserva, string> = {
  ...CANAL_LABEL,
  panel: "Panel admin",
}

export const DEPOSITO_LABEL: Record<DepositoEstado, string> = {
  no_requerido: "No requerido",
  pendiente: "Pendiente",
  pagado: "Pagado",
  reembolsado: "Reembolsado",
}

export const DEPOSITO_TONE: Record<DepositoEstado, StatusTone> = {
  no_requerido: "gray",
  pendiente: "amber",
  pagado: "green",
  reembolsado: "outline",
}

export const DEPOSITO_REGLA_LABEL: Record<DepositoRegla, string> = {
  ninguno: "No se pide depósito",
  grupos: "Solo a grupos",
  siempre: "Siempre",
}

export const BLOQUEO_LABEL: Record<TipoBloqueo, string> = {
  festivo: "Festivo",
  cierre: "Cierre",
  evento: "Evento",
}

export const BLOQUEO_TONE: Record<TipoBloqueo, StatusTone> = {
  festivo: "blue",
  cierre: "amber",
  evento: "green",
}

export const ESPERA_LABEL: Record<EstadoEspera, string> = {
  esperando: "Esperando",
  ofrecida: "Ofrecida",
  aceptada: "Aceptada",
  expirada: "Expirada",
  cancelada: "Cancelada",
}

export const ESPERA_TONE: Record<EstadoEspera, StatusTone> = {
  esperando: "amber",
  ofrecida: "blue",
  aceptada: "green",
  expirada: "gray",
  cancelada: "gray",
}

export const BITACORA_LABEL: Record<BitacoraReservaTipo, string> = {
  solicitada: "Reserva solicitada",
  confirmada: "Reserva confirmada",
  editada: "Datos editados",
  mesa_asignada: "Mesa asignada",
  recordatorio_enviado: "Recordatorio enviado",
  reagendada: "Reagendada",
  cancelada_cliente: "Cancelada por el cliente",
  cancelada_local: "Cancelada en local",
  sentada: "Cliente sentado",
  no_show: "No-show",
  finalizada: "Reserva finalizada",
  deposito_registrado: "Depósito registrado",
  deposito_reembolsado: "Depósito reembolsado",
}

export const ACTOR_LABEL: Record<ActorReservaTipo, string> = {
  cliente: "Cliente",
  mesero: "Mesero",
  administrador: "Administrador",
  automatizacion: "Automatización",
}

/** Estados que todavía ocupan mesa y admiten acciones operativas. */
export function reservaEstaActiva(estado: ReservaEstado): boolean {
  return estado === "solicitada" || estado === "confirmada" || estado === "sentada"
}

export function reservaAdmiteReubicacion(estado: ReservaEstado): boolean {
  return estado === "solicitada" || estado === "confirmada"
}
