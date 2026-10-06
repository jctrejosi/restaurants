import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError, registerMock, type Query } from "@/lib/api"
import { formatMoney } from "@/lib/format"
import { fechaEnZona, hoyISO } from "@/modules/reservas/fechas"
import {
  ACTOR_LABEL,
  BLOQUEO_LABEL,
  BLOQUEO_TONE,
  BITACORA_LABEL,
  CANAL_BITACORA_LABEL,
  CANAL_LABEL,
  DEPOSITO_LABEL,
  DEPOSITO_TONE,
  ESPERA_LABEL,
  ESPERA_TONE,
  ESTADO_LABEL,
  ESTADO_TONE,
  type AccionReservaNombre,
  type AccionReservaPayload,
  type ActorReservaTipo,
  type Bloqueo,
  type BloqueoPayload,
  type BitacoraReservaTipo,
  type CalendarioReserva,
  type CampoDiff,
  type CanalBitacoraReserva,
  type CanalReserva,
  type DepositoEstado,
  type DisponibilidadReserva,
  type EsperaItem,
  type EventoReserva,
  type ExportacionReserva,
  type ImpactoBloqueo,
  type MesaCandidata,
  type MovimientoDeposito,
  type PoliticaReserva,
  type ProximaLlegada,
  type ReservaDetalle,
  type ReservaEdicionPayload,
  type ReservaEstado,
  type ReservaLista,
  type ReservaPayload,
  type ReservasFiltros,
  type ReservasRespuesta,
  type TiemposReserva,
} from "@/modules/reservas/types"

/* -------------------------------------------------------------------------- */
/* Mock de desarrollo                                                          */
/* Se retira cuando el backend NestJS exponga `/admin/reservas/*` y           */
/* `/admin/bloqueos/*`.                                                        */
/* -------------------------------------------------------------------------- */

const MIN = 60_000

const SEDES: Record<string, { id: string; nombre: string; zonaHoraria: string }> = {
  centro: { id: "centro", nombre: "Punto C · Centro", zonaHoraria: "America/Mexico_City" },
  norte: { id: "norte", nombre: "Punto C · Norte", zonaHoraria: "America/Mexico_City" },
}

const ZONAS: Record<string, string> = {
  salon: "Salón principal",
  terraza: "Terraza",
  barra: "Barra",
  privado: "Privado",
}

/**
 * Catálogo espejo del módulo Salón: mientras no exista la API real, la
 * disponibilidad de reservas se calcula aquí. Cuando el backend esté, este
 * cálculo vive en `GET /admin/reservas/disponibilidad`.
 */
type MesaCatalogo = {
  id: string
  numero: string
  zonaId: string
  zonaNombre: string
  capacidad: number
  fueraServicio: boolean
}

const DEFINICIONES_MESAS: Record<string, Array<[string, string, number, boolean?]>> = {
  centro: [
    ["01", "salon", 2],
    ["02", "salon", 2],
    ["03", "salon", 4],
    ["04", "salon", 4],
    ["05", "salon", 6],
    ["06", "salon", 2],
    ["07", "terraza", 4],
    ["08", "terraza", 4],
    ["09", "terraza", 2, true],
    ["10", "terraza", 6],
    ["11", "barra", 2],
    ["12", "barra", 3],
    ["13", "privado", 8],
    ["14", "privado", 10],
  ],
  norte: [
    ["01", "salon", 2],
    ["02", "salon", 4],
    ["03", "salon", 4],
    ["04", "salon", 6],
    ["05", "terraza", 4],
    ["06", "terraza", 2],
    ["07", "barra", 3],
    ["08", "privado", 8],
  ],
}

const MESAS_CATALOGO: Record<string, MesaCatalogo[]> = Object.fromEntries(
  Object.entries(DEFINICIONES_MESAS).map(([sedeId, definiciones]) => [
    sedeId,
    definiciones.map(([numero, zonaId, capacidad, fueraServicio]) => ({
      id: `${sedeId[0]}-${numero}`,
      numero,
      zonaId,
      zonaNombre: ZONAS[zonaId],
      capacidad,
      fueraServicio: fueraServicio === true,
    })),
  ]),
)

function mesaDe(sedeId: string, mesaId?: string): MesaCatalogo | undefined {
  if (!mesaId) return undefined
  return MESAS_CATALOGO[sedeId]?.find((mesa) => mesa.id === mesaId)
}

/* -------------------------------------------------------------------------- */
/* Fechas del mock                                                             */
/* -------------------------------------------------------------------------- */

function enDia(offsetDias: number, hora: number, minuto = 0): string {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + offsetDias)
  fecha.setHours(hora, minuto, 0, 0)
  return fecha.toISOString()
}

function enFecha(fecha: string, hora: number, minuto = 0): string {
  const dia = new Date(`${fecha}T00:00:00`)
  dia.setHours(hora, minuto, 0, 0)
  return dia.toISOString()
}

function segmento(iso: string, zonaHoraria?: string): string {
  return fechaEnZona(iso, zonaHoraria ?? SEDES.centro.zonaHoraria)
}

function sumarMinutos(iso: string, minutos: number): string {
  return new Date(new Date(iso).getTime() + minutos * MIN).toISOString()
}

function segundosEntre(desde?: string, hasta?: string): number | null {
  if (!desde || !hasta) return null
  return Math.max(0, Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 1000))
}

/* -------------------------------------------------------------------------- */
/* Políticas por sucursal                                                      */
/* -------------------------------------------------------------------------- */

function construirPolitica(sucursalId: string, cambios: Partial<PoliticaReserva>): PoliticaReserva {
  return {
    sucursalId,
    sucursalNombre: SEDES[sucursalId].nombre,
    antelacionMinHoras: 2,
    antelacionMaxDias: 60,
    duracionMin: 90,
    toleranciaMin: 15,
    cancelacionHoras: 4,
    maximoPersonas: 12,
    depositoRegla: "grupos",
    depositoMontoCentavos: 20_000,
    depositoPersonasMin: 6,
    noShowRegla: "Tras 15 min de tolerancia la mesa se libera y el depósito se revisa con Caja.",
    confirmacionAutomatica: true,
    actualizadoEn: enDia(-3, 11, 20),
    actualizadoPor: "María Gómez",
    ...cambios,
  }
}

const POLITICAS: Record<string, PoliticaReserva> = {
  centro: construirPolitica("centro", {}),
  norte: construirPolitica("norte", {
    antelacionMinHoras: 3,
    duracionMin: 120,
    maximoPersonas: 10,
    depositoPersonasMin: 8,
    noShowRegla: "Tras 20 min de tolerancia la mesa se libera; el depósito se retiene salvo causa justificada.",
  }),
}

/* -------------------------------------------------------------------------- */
/* Configuración de reservas del mock                                          */
/* -------------------------------------------------------------------------- */

type ExtraCfg = {
  tipo: BitacoraReservaTipo
  /** Anclado a «ahora − haceMin». */
  haceMin?: number
  /** Anclado a «fecha de la reserva + desdeReservaMin». */
  desdeReservaMin?: number
  actor: string
  actorTipo: ActorReservaTipo
  canal: CanalBitacoraReserva
  dispositivo: string
  resultado?: string
  detalle?: string
  diffs?: CampoDiff[]
}

type ReservaCfg = {
  id: string
  codigo: string
  sedeId: string
  offsetDias: number
  hora: number
  minuto: number
  duracionMin: number
  personas: number
  estado: ReservaEstado
  canal: CanalReserva
  zonaId?: string
  mesaId?: string
  cliente: string
  telefono?: string
  correo?: string
  notas?: string
  creadaAntesMin?: number
  sentadaMin?: number
  finalizadaMin?: number
  noShowToleranciaMin?: number
  canceladaAntesMin?: number
  canceladaPor?: "cliente" | "local"
  motivoCancelacion?: string
  confirmadaAntes?: boolean
  deposito?: { requerido: number; pagado: number; reembolsado?: boolean }
  reagenda?: { antes: string; despues: string; actor?: string }
  extras?: ExtraCfg[]
}

const CONFIGS: ReservaCfg[] = [
  {
    id: "res-2481",
    codigo: "R-2481",
    sedeId: "centro",
    offsetDias: 0,
    hora: 13,
    minuto: 0,
    duracionMin: 90,
    personas: 4,
    estado: "confirmada",
    canal: "web",
    zonaId: "salon",
    mesaId: "c-03",
    cliente: "Laura Pérez",
    telefono: "55 1234 8801",
    correo: "laura.perez@correo.mx",
    notas: "Cumpleaños; solicitaron silla para bebé.",
    creadaAntesMin: 1560,
  },
  {
    id: "res-2482",
    codigo: "R-2482",
    sedeId: "centro",
    offsetDias: 0,
    hora: 13,
    minuto: 30,
    duracionMin: 90,
    personas: 2,
    estado: "sentada",
    canal: "telefono",
    zonaId: "salon",
    mesaId: "c-01",
    cliente: "Carlos Méndez",
    telefono: "55 9876 4410",
    creadaAntesMin: 240,
    sentadaMin: 5,
  },
  {
    id: "res-2483",
    codigo: "R-2483",
    sedeId: "centro",
    offsetDias: 0,
    hora: 14,
    minuto: 0,
    duracionMin: 120,
    personas: 6,
    estado: "confirmada",
    canal: "web",
    zonaId: "salon",
    mesaId: "c-05",
    cliente: "Ana Morales",
    telefono: "55 4433 2098",
    correo: "ana.morales@correo.mx",
    deposito: { requerido: 20_000, pagado: 20_000 },
  },
  {
    id: "res-2484",
    codigo: "R-2484",
    sedeId: "centro",
    offsetDias: 0,
    hora: 14,
    minuto: 15,
    duracionMin: 90,
    personas: 2,
    estado: "solicitada",
    canal: "apk",
    cliente: "Diego Ramírez",
    telefono: "55 2211 7788",
    creadaAntesMin: 180,
  },
  {
    id: "res-2485",
    codigo: "R-2485",
    sedeId: "centro",
    offsetDias: 0,
    hora: 15,
    minuto: 0,
    duracionMin: 150,
    personas: 8,
    estado: "confirmada",
    canal: "telefono",
    zonaId: "privado",
    mesaId: "c-13",
    cliente: "Sofía Herrera",
    telefono: "55 6767 1002",
    notas: "Comida de negocios; piden factura.",
    deposito: { requerido: 20_000, pagado: 20_000 },
    creadaAntesMin: 4320,
  },
  {
    id: "res-2486",
    codigo: "R-2486",
    sedeId: "centro",
    offsetDias: 0,
    hora: 19,
    minuto: 30,
    duracionMin: 120,
    personas: 4,
    estado: "confirmada",
    canal: "web",
    zonaId: "terraza",
    mesaId: "c-07",
    cliente: "Lucía Ortega",
    telefono: "55 3344 5566",
    correo: "lucia.ortega@correo.mx",
    reagenda: { antes: "Hoy 20:30", despues: "Hoy 19:30" },
    creadaAntesMin: 2880,
  },
  {
    id: "res-2487",
    codigo: "R-2487",
    sedeId: "centro",
    offsetDias: 0,
    hora: 12,
    minuto: 30,
    duracionMin: 90,
    personas: 2,
    estado: "finalizada",
    canal: "mostrador",
    zonaId: "barra",
    mesaId: "c-11",
    cliente: "Jorge Salinas",
    creadaAntesMin: 300,
    sentadaMin: 4,
    finalizadaMin: 62,
  },
  {
    id: "res-2488",
    codigo: "R-2488",
    sedeId: "centro",
    offsetDias: 0,
    hora: 21,
    minuto: 0,
    duracionMin: 90,
    personas: 3,
    estado: "no_show",
    canal: "web",
    zonaId: "barra",
    mesaId: "c-12",
    cliente: "Marta Ruiz",
    telefono: "55 1122 9087",
    correo: "marta.ruiz@correo.mx",
    noShowToleranciaMin: 18,
    creadaAntesMin: 1440,
  },
  {
    id: "res-2489",
    codigo: "R-2489",
    sedeId: "centro",
    offsetDias: 0,
    hora: 18,
    minuto: 0,
    duracionMin: 90,
    personas: 4,
    estado: "cancelada",
    canal: "telefono",
    cliente: "Iván Castro",
    telefono: "55 5566 3344",
    canceladaAntesMin: 240,
    motivoCancelacion: "El cliente cambió de planes.",
  },
  {
    id: "res-2490",
    codigo: "R-2490",
    sedeId: "centro",
    offsetDias: 0,
    hora: 16,
    minuto: 30,
    duracionMin: 90,
    personas: 2,
    estado: "cancelada",
    canal: "web",
    cliente: "Paola Núñez",
    telefono: "55 7788 2211",
    canceladaPor: "cliente",
    canceladaAntesMin: 400,
    motivoCancelacion: "Cambio de fecha solicitado desde la web.",
    confirmadaAntes: true,
  },
  {
    id: "res-2491",
    codigo: "R-2491",
    sedeId: "norte",
    offsetDias: 0,
    hora: 13,
    minuto: 0,
    duracionMin: 120,
    personas: 4,
    estado: "confirmada",
    canal: "web",
    zonaId: "salon",
    mesaId: "n-03",
    cliente: "Ricardo Beltrán",
    telefono: "81 2233 4455",
    creadaAntesMin: 2000,
  },
  {
    id: "res-2492",
    codigo: "R-2492",
    sedeId: "norte",
    offsetDias: 0,
    hora: 14,
    minuto: 30,
    duracionMin: 120,
    personas: 2,
    estado: "sentada",
    canal: "telefono",
    zonaId: "salon",
    mesaId: "n-01",
    cliente: "Elena Garza",
    telefono: "81 6677 8899",
    creadaAntesMin: 320,
    sentadaMin: 12,
  },
  {
    id: "res-2493",
    codigo: "R-2493",
    sedeId: "norte",
    offsetDias: 0,
    hora: 20,
    minuto: 30,
    duracionMin: 150,
    personas: 8,
    estado: "confirmada",
    canal: "web",
    zonaId: "privado",
    mesaId: "n-08",
    cliente: "Héctor Villarreal",
    telefono: "81 1010 2020",
    correo: "hector.v@correo.mx",
    deposito: { requerido: 20_000, pagado: 0 },
  },
  {
    id: "res-2494",
    codigo: "R-2494",
    sedeId: "norte",
    offsetDias: 0,
    hora: 19,
    minuto: 0,
    duracionMin: 120,
    personas: 2,
    estado: "no_show",
    canal: "apk",
    zonaId: "barra",
    mesaId: "n-07",
    cliente: "Nadia Robles",
    telefono: "81 5454 6767",
    creadaAntesMin: 900,
  },
  {
    id: "res-2495",
    codigo: "R-2495",
    sedeId: "centro",
    offsetDias: 1,
    hora: 13,
    minuto: 30,
    duracionMin: 120,
    personas: 6,
    estado: "confirmada",
    canal: "web",
    zonaId: "terraza",
    mesaId: "c-10",
    cliente: "Laura Pérez",
    telefono: "55 1234 8801",
    correo: "laura.perez@correo.mx",
    deposito: { requerido: 20_000, pagado: 20_000 },
    creadaAntesMin: 1000,
  },
  {
    id: "res-2496",
    codigo: "R-2496",
    sedeId: "centro",
    offsetDias: 1,
    hora: 21,
    minuto: 30,
    duracionMin: 90,
    personas: 2,
    estado: "confirmada",
    canal: "apk",
    zonaId: "barra",
    mesaId: "c-12",
    cliente: "Andrés Pineda",
    telefono: "55 9090 1212",
    deposito: { requerido: 10_000, pagado: 10_000 },
    creadaAntesMin: 700,
  },
  {
    id: "res-2497",
    codigo: "R-2497",
    sedeId: "norte",
    offsetDias: 1,
    hora: 14,
    minuto: 0,
    duracionMin: 120,
    personas: 4,
    estado: "solicitada",
    canal: "web",
    cliente: "Paulina Sáenz",
    telefono: "81 3030 4040",
    creadaAntesMin: 60,
  },
  {
    id: "res-2480",
    codigo: "R-2480",
    sedeId: "centro",
    offsetDias: -1,
    hora: 14,
    minuto: 0,
    duracionMin: 120,
    personas: 4,
    estado: "finalizada",
    canal: "telefono",
    zonaId: "salon",
    mesaId: "c-04",
    cliente: "Roberto Díaz",
    creadaAntesMin: 2000,
    sentadaMin: 3,
    finalizadaMin: 95,
  },
  {
    id: "res-2498",
    codigo: "R-2498",
    sedeId: "centro",
    offsetDias: 2,
    hora: 15,
    minuto: 0,
    duracionMin: 90,
    personas: 4,
    estado: "confirmada",
    canal: "web",
    zonaId: "salon",
    mesaId: "c-06",
    cliente: "Verónica Luna",
    telefono: "55 8282 9393",
    creadaAntesMin: 500,
  },
  {
    id: "res-2499",
    codigo: "R-2499",
    sedeId: "centro",
    offsetDias: 5,
    hora: 20,
    minuto: 0,
    duracionMin: 120,
    personas: 4,
    estado: "confirmada",
    canal: "web",
    zonaId: "salon",
    mesaId: "c-03",
    cliente: "Gabriel Soto",
    telefono: "55 4747 5858",
    creadaAntesMin: 400,
  },
]

const ACTORES_ALTA: Record<CanalReserva, { actor: string; actorTipo: ActorReservaTipo; dispositivo: string }> = {
  web: { actor: "Portal de reservas", actorTipo: "automatizacion", dispositivo: "Web" },
  apk: { actor: "App cliente", actorTipo: "automatizacion", dispositivo: "App cliente" },
  telefono: { actor: "María Gómez", actorTipo: "administrador", dispositivo: "Central telefónica" },
  mostrador: { actor: "María Gómez", actorTipo: "administrador", dispositivo: "Mostrador" },
}

/* -------------------------------------------------------------------------- */
/* Constructor de reservas                                                     */
/* -------------------------------------------------------------------------- */

function construirReserva(cfg: ReservaCfg): ReservaDetalle {
  const sede = SEDES[cfg.sedeId]
  const politica = POLITICAS[cfg.sedeId]
  const fechaHora = enDia(cfg.offsetDias, cfg.hora, cfg.minuto)
  const fechaHoraMs = new Date(fechaHora).getTime()
  const creadaEn = sumarMinutos(fechaHora, -(cfg.creadaAntesMin ?? 1440))
  const mesa = mesaDe(cfg.sedeId, cfg.mesaId)

  const eventos: EventoReserva[] = []
  const agregar = (
    tipo: BitacoraReservaTipo,
    en: string,
    actor: string,
    actorTipo: ActorReservaTipo,
    canal: CanalBitacoraReserva,
    dispositivo: string,
    resultado: string,
    detalle?: string,
    diffs?: CampoDiff[],
  ) => {
    eventos.push({
      id: `${cfg.id}-e${eventos.length + 1}`,
      tipo,
      actor,
      actorTipo,
      canal,
      dispositivo,
      servidorEn: en,
      resultado,
      detalle,
      diffs,
    })
  }

  const alta = ACTORES_ALTA[cfg.canal]
  agregar("solicitada", creadaEn, alta.actor, alta.actorTipo, cfg.canal, alta.dispositivo, "Registrada", `Canal ${CANAL_LABEL[cfg.canal]}`)

  let confirmadaEn: string | undefined
  const confirmar = cfg.estado !== "solicitada" && (cfg.estado !== "cancelada" || cfg.confirmadaAntes !== false)
  if (confirmar) {
    confirmadaEn = sumarMinutos(creadaEn, politica.confirmacionAutomatica ? 1 : 35)
    agregar(
      "confirmada",
      confirmadaEn,
      politica.confirmacionAutomatica ? "Motor de reservas" : "María Gómez",
      politica.confirmacionAutomatica ? "automatizacion" : "administrador",
      politica.confirmacionAutomatica ? cfg.canal : "panel",
      politica.confirmacionAutomatica ? "Motor de reservas" : "Panel admin",
      "Confirmada",
      `Política: ${politica.duracionMin} min · tolerancia ${politica.toleranciaMin} min`,
    )
  }

  if (cfg.telefono || cfg.correo) {
    const recordatorioEn = Math.max(new Date(creadaEn).getTime() + 5 * MIN, fechaHoraMs - 24 * 60 * MIN)
    if (recordatorioEn < fechaHoraMs && recordatorioEn <= Date.now()) {
      agregar(
        "recordatorio_enviado",
        new Date(recordatorioEn).toISOString(),
        "Motor de notificaciones",
        "automatizacion",
        cfg.canal,
        "Servicio de mensajes",
        "Enviado",
        cfg.telefono ? `Recordatorio a ${cfg.telefono}` : `Recordatorio a ${cfg.correo}`,
      )
    }
  }

  if (mesa && cfg.estado !== "solicitada") {
    const base = confirmadaEn ?? creadaEn
    const mesaEn = new Date(Math.min(new Date(base).getTime() + 5 * MIN, fechaHoraMs - 45 * MIN))
    agregar(
      "mesa_asignada",
      new Date(Math.max(mesaEn.getTime(), new Date(creadaEn).getTime())).toISOString(),
      "María Gómez",
      "administrador",
      "panel",
      "Panel admin",
      "Asignada",
      `Mesa ${mesa.numero} · ${mesa.zonaNombre}`,
    )
  }

  if (cfg.reagenda) {
    const reagendaEn = new Date(
      Math.max(new Date(creadaEn).getTime() + 90 * MIN, fechaHoraMs - 3 * 60 * MIN),
    ).toISOString()
    agregar(
      "reagendada",
      reagendaEn,
      cfg.reagenda.actor ?? "María Gómez",
      "administrador",
      "panel",
      "Panel admin",
      "Aplicada",
      "Reubicación solicitada por el cliente.",
      [{ campo: "Fecha y hora", antes: cfg.reagenda.antes, despues: cfg.reagenda.despues }],
    )
  }

  let sentadaEn: string | undefined
  if (cfg.sentadaMin != null && (cfg.estado === "sentada" || cfg.estado === "finalizada")) {
    sentadaEn = sumarMinutos(fechaHora, cfg.sentadaMin)
    agregar("sentada", sentadaEn, "Laura Pérez", "mesero", "mostrador", "Tablet mesero", "Cliente en mesa", mesa ? `Mesa ${mesa.numero}` : undefined)
  }

  let finalizadaEn: string | undefined
  if (cfg.estado === "finalizada" && sentadaEn) {
    finalizadaEn = sumarMinutos(sentadaEn, cfg.finalizadaMin ?? Math.max(30, cfg.duracionMin - 10))
    agregar("finalizada", finalizadaEn, "Laura Pérez", "mesero", "mostrador", "Tablet mesero", "Mesa liberada")
  }

  let noShowEn: string | undefined
  if (cfg.estado === "no_show") {
    noShowEn = sumarMinutos(fechaHora, cfg.noShowToleranciaMin ?? politica.toleranciaMin)
    agregar(
      "no_show",
      noShowEn,
      "María Gómez",
      "administrador",
      "panel",
      "Panel admin",
      "Registrado",
      "Se libera la mesa; el depósito se revisa con Caja.",
    )
  }

  let canceladaEn: string | undefined
  if (cfg.estado === "cancelada") {
    canceladaEn = new Date(
      Math.max(new Date(creadaEn).getTime() + 60 * MIN, fechaHoraMs - (cfg.canceladaAntesMin ?? 180) * MIN),
    ).toISOString()
    const porCliente = cfg.canceladaPor === "cliente"
    agregar(
      porCliente ? "cancelada_cliente" : "cancelada_local",
      canceladaEn,
      porCliente ? cfg.cliente : "María Gómez",
      porCliente ? "cliente" : "administrador",
      porCliente ? cfg.canal : "panel",
      porCliente ? "Portal/App" : "Panel admin",
      "Cancelada",
      cfg.motivoCancelacion ?? "Sin motivo registrado.",
    )
  }

  const depositoRequerido = cfg.deposito?.requerido ?? 0
  const depositoPagado = cfg.deposito?.pagado ?? 0
  const movimientos: MovimientoDeposito[] = []
  if (depositoPagado > 0) {
    movimientos.push({
      id: `${cfg.id}-d1`,
      tipo: "cobro",
      montoCentavos: depositoPagado,
      en: sumarMinutos(creadaEn, 12),
      usuario: "Pasarela de pagos",
      motivo: "Cobro del depósito al confirmar la reserva.",
      conciliado: true,
    })
    agregar(
      "deposito_registrado",
      sumarMinutos(creadaEn, 12),
      "Pasarela de pagos",
      "automatizacion",
      "panel",
      "Pasarela de pagos",
      "Pagado",
      `Depósito de ${formatMoney(depositoPagado)}`,
    )
  }
  if (cfg.deposito?.reembolsado) {
    movimientos.push({
      id: `${cfg.id}-d2`,
      tipo: "reembolso",
      montoCentavos: depositoPagado,
      en: sumarMinutos(canceladaEn ?? creadaEn, 30),
      usuario: "María Gómez",
      motivo: "Reembolso aprobado tras la cancelación.",
      conciliado: true,
    })
    agregar(
      "deposito_reembolsado",
      sumarMinutos(canceladaEn ?? creadaEn, 30),
      "María Gómez",
      "administrador",
      "panel",
      "Panel admin",
      "Reembolsado",
      `Reembolso de ${formatMoney(depositoPagado)} enviado a Caja`,
    )
  }

  for (const extra of cfg.extras ?? []) {
    const en =
      extra.desdeReservaMin != null
        ? sumarMinutos(fechaHora, extra.desdeReservaMin)
        : new Date(Date.now() - (extra.haceMin ?? 0) * MIN).toISOString()
    agregar(
      extra.tipo,
      en,
      extra.actor,
      extra.actorTipo,
      extra.canal,
      extra.dispositivo,
      extra.resultado ?? "Completado",
      extra.detalle,
      extra.diffs,
    )
  }

  eventos.sort((a, b) => a.servidorEn.localeCompare(b.servidorEn))
  eventos.forEach((evento, indice) => {
    evento.id = `${cfg.id}-e${indice + 1}`
  })

  const depositoEstado: DepositoEstado =
    cfg.deposito?.reembolsado === true
      ? "reembolsado"
      : depositoRequerido === 0
        ? "no_requerido"
        : depositoPagado >= depositoRequerido
          ? "pagado"
          : "pendiente"

  const sellos = {
    creadaEn,
    confirmadaEn,
    sentadaEn,
    finalizadaEn,
    noShowEn,
    canceladaEn,
  }

  const detalle: ReservaDetalle = {
    id: cfg.id,
    codigo: cfg.codigo,
    fechaHora,
    duracionMin: cfg.duracionMin,
    personas: cfg.personas,
    estado: cfg.estado,
    canal: cfg.canal,
    sedeId: cfg.sedeId,
    sedeNombre: sede.nombre,
    zonaId: cfg.zonaId,
    zonaNombre: cfg.zonaId ? ZONAS[cfg.zonaId] : undefined,
    mesaId: mesa?.id,
    mesaNumero: mesa?.numero,
    clienteNombre: cfg.cliente,
    telefono: cfg.telefono,
    correo: cfg.correo,
    notas: cfg.notas,
    depositoRequeridoCentavos: depositoRequerido,
    depositoPagadoCentavos: depositoPagado,
    depositoEstado,
    creadaEn,
    zonaHoraria: sede.zonaHoraria,
    politicaSnapshot: { ...politica },
    sellos,
    tiempos: {
      esperaSeg: segundosEntre(fechaHora, sentadaEn),
      duracionMesaSeg: segundosEntre(sentadaEn, finalizadaEn),
    },
    deposito: {
      estado: depositoEstado,
      requeridoCentavos: depositoRequerido,
      pagadoCentavos: depositoPagado,
      movimientos,
    },
    bitacora: eventos,
  }
  return detalle
}

const RESERVAS: ReservaDetalle[] = CONFIGS.map(construirReserva)

function buscarReserva(id: string): ReservaDetalle {
  const reserva = RESERVAS.find((item) => item.id === id)
  if (!reserva) throw new ApiError(404, "La reserva no existe o fue movida.", "reserva_no_encontrada")
  return reserva
}

function aLista(reserva: ReservaDetalle): ReservaLista {
  const { bitacora: _bitacora, politicaSnapshot: _politica, sellos: _sellos, tiempos: _tiempos, deposito: _deposito, zonaHoraria: _zonaHoraria, ...lista } = reserva
  return lista
}

/* -------------------------------------------------------------------------- */
/* Lista de espera y bloqueos                                                  */
/* -------------------------------------------------------------------------- */

const LISTA_ESPERA: EsperaItem[] = [
  {
    id: "esp-1",
    sedeId: "centro",
    clienteNombre: "Fernanda López",
    telefono: "55 3131 4141",
    personas: 4,
    franjaDeseada: enDia(0, 20, 30),
    vigenciaHasta: enDia(0, 22, 0),
    estado: "esperando",
    notas: "Acepta terraza o salón.",
    creadaEn: new Date(Date.now() - 40 * MIN).toISOString(),
  },
  {
    id: "esp-2",
    sedeId: "centro",
    clienteNombre: "Raúl Ibarra",
    telefono: "55 5151 6161",
    personas: 2,
    franjaDeseada: enDia(0, 19, 0),
    vigenciaHasta: enDia(0, 20, 30),
    estado: "ofrecida",
    creadaEn: new Date(Date.now() - 25 * MIN).toISOString(),
  },
  {
    id: "esp-3",
    sedeId: "norte",
    clienteNombre: "Carmen Vega",
    telefono: "81 7171 8181",
    personas: 6,
    franjaDeseada: enDia(1, 14, 0),
    vigenciaHasta: enDia(1, 15, 0),
    estado: "esperando",
    creadaEn: new Date(Date.now() - 90 * MIN).toISOString(),
  },
  {
    id: "esp-4",
    sedeId: "centro",
    clienteNombre: "Luis Pardo",
    telefono: "55 9191 0202",
    personas: 2,
    franjaDeseada: enDia(0, 13, 0),
    vigenciaHasta: enDia(0, 13, 30),
    estado: "expirada",
    creadaEn: new Date(Date.now() - 5 * 60 * MIN).toISOString(),
  },
]

const BLOQUEOS: Bloqueo[] = [
  {
    id: "blq-1",
    sedeId: "centro",
    sedeNombre: SEDES.centro.nombre,
    tipo: "cierre",
    motivo: "Mantenimiento de cocina programado.",
    desde: enDia(0, 23, 0),
    hasta: enDia(1, 1, 0),
    creadoEn: enDia(-2, 9, 0),
    creadoPor: "María Gómez",
    reservasAfectadas: 0,
  },
  {
    id: "blq-2",
    sedeId: "centro",
    sedeNombre: SEDES.centro.nombre,
    tipo: "festivo",
    motivo: "Aniversario del local: cierre por festejo interno.",
    desde: enDia(5, 0, 0),
    hasta: enDia(5, 23, 59),
    creadoEn: enDia(-6, 10, 0),
    creadoPor: "María Gómez",
    reservasAfectadas: 0,
  },
  {
    id: "blq-3",
    sedeId: "centro",
    sedeNombre: SEDES.centro.nombre,
    tipo: "evento",
    motivo: "Evento privado que ocupa la terraza.",
    desde: enDia(0, 18, 0),
    hasta: enDia(0, 22, 0),
    zonaId: "terraza",
    zonaNombre: ZONAS.terraza,
    creadoEn: enDia(-1, 12, 0),
    creadoPor: "Diego Ramírez",
    reservasAfectadas: 0,
  },
  {
    id: "blq-4",
    sedeId: "norte",
    sedeNombre: SEDES.norte.nombre,
    tipo: "cierre",
    motivo: "Limpieza profunda de salón.",
    desde: enDia(1, 10, 0),
    hasta: enDia(1, 12, 0),
    creadoEn: enDia(-1, 17, 0),
    creadoPor: "Ana Torres",
    reservasAfectadas: 0,
  },
]

const ESTADOS_QUE_OCUPAN: ReservaEstado[] = ["solicitada", "confirmada", "sentada"]

function solapan(aInicio: number, aFin: number, bInicio: number, bFin: number): boolean {
  return aInicio < bFin && bInicio < aFin
}

function reservasSolapadas(mesaId: string, inicioISO: string, duracionMin: number, excluirId?: string): ReservaDetalle[] {
  const inicio = new Date(inicioISO).getTime()
  const fin = inicio + duracionMin * MIN
  return RESERVAS.filter(
    (reserva) =>
      reserva.mesaId === mesaId &&
      reserva.id !== excluirId &&
      ESTADOS_QUE_OCUPAN.includes(reserva.estado) &&
      solapan(inicio, fin, new Date(reserva.fechaHora).getTime(), new Date(reserva.fechaHora).getTime() + reserva.duracionMin * MIN),
  )
}

function validarMesaLibre(sedeId: string, mesaId: string, inicioISO: string, duracionMin: number, personas: number, excluirId?: string): void {
  const conflictos = reservasSolapadas(mesaId, inicioISO, duracionMin, excluirId)
  if (conflictos.length === 0) return
  const mesa = mesaDe(sedeId, mesaId)
  const conflicto = conflictos[0]
  const alternativas = mesasLibres(sedeId, inicioISO, duracionMin, personas, excluirId)
    .slice(0, 3)
    .map((candidata) => `Mesa ${candidata.numero}`)
    .join(", ")
  throw new ApiError(
    409,
    `La mesa ${mesa?.numero ?? ""} ya está asignada a ${conflicto.codigo}. Alternativas libres: ${alternativas || "ninguna"}.`,
    "mesa_no_disponible",
  )
}

function mesasLibres(sedeId: string, inicioISO: string, duracionMin: number, personas: number, excluirId?: string): MesaCatalogo[] {
  return (MESAS_CATALOGO[sedeId] ?? []).filter(
    (mesa) =>
      !mesa.fueraServicio &&
      mesa.capacidad >= personas &&
      reservasSolapadas(mesa.id, inicioISO, duracionMin, excluirId).length === 0,
  )
}

function bloqueoQueAfecta(sedeId: string, zonaId: string | undefined, inicioISO: string, duracionMin: number): Bloqueo | undefined {
  const inicio = new Date(inicioISO).getTime()
  const fin = inicio + duracionMin * MIN
  return BLOQUEOS.find(
    (bloqueo) =>
      bloqueo.sedeId === sedeId &&
      (!bloqueo.zonaId || !zonaId || bloqueo.zonaId === zonaId) &&
      solapan(inicio, fin, new Date(bloqueo.desde).getTime(), new Date(bloqueo.hasta).getTime()),
  )
}

function contarAfectadas(bloqueo: Bloqueo): number {
  return RESERVAS.filter(
    (reserva) =>
      reserva.sedeId === bloqueo.sedeId &&
      ESTADOS_QUE_OCUPAN.includes(reserva.estado) &&
      (!bloqueo.zonaId || reserva.zonaId === bloqueo.zonaId) &&
      solapan(
        new Date(reserva.fechaHora).getTime(),
        new Date(reserva.fechaHora).getTime() + reserva.duracionMin * MIN,
        new Date(bloqueo.desde).getTime(),
        new Date(bloqueo.hasta).getTime(),
      ),
  ).length
}

function recalcularReserva(reserva: ReservaDetalle): void {
  const { sellos } = reserva
  const tiempos: TiemposReserva = {
    esperaSeg: segundosEntre(reserva.fechaHora, sellos.sentadaEn),
    duracionMesaSeg: segundosEntre(sellos.sentadaEn, sellos.finalizadaEn),
  }
  reserva.tiempos = tiempos
  reserva.depositoEstado = reserva.deposito.estado
  reserva.depositoPagadoCentavos = reserva.deposito.pagadoCentavos
}

function agregarEvento(
  reserva: ReservaDetalle,
  evento: Omit<EventoReserva, "id" | "servidorEn"> & { servidorEn?: string },
): void {
  reserva.bitacora.push({
    ...evento,
    id: `${reserva.id}-e${reserva.bitacora.length + 1}`,
    servidorEn: evento.servidorEn ?? new Date().toISOString(),
  })
}

/* -------------------------------------------------------------------------- */
/* Mocks registrados                                                           */
/* -------------------------------------------------------------------------- */

registerMock("GET", /^\/admin\/reservas$/, (ctx) => {
  const q = ctx.query
  const page = Math.max(1, Number(q.page ?? 1))
  const pageSize = Math.max(1, Number(q.pageSize ?? 10))
  const busqueda = typeof q.busqueda === "string" ? q.busqueda.trim().toLowerCase() : ""

  let items = RESERVAS.map(aLista)

  if (q.sedeId) items = items.filter((reserva) => reserva.sedeId === q.sedeId)
  if (q.estado) items = items.filter((reserva) => reserva.estado === q.estado)
  if (q.canal) items = items.filter((reserva) => reserva.canal === q.canal)
  if (q.desde || q.hasta) {
    items = items.filter((reserva) => {
      const fecha = segmento(reserva.fechaHora, SEDES[reserva.sedeId]?.zonaHoraria)
      if (typeof q.desde === "string" && q.desde && fecha < q.desde) return false
      if (typeof q.hasta === "string" && q.hasta && fecha > q.hasta) return false
      return true
    })
  }
  if (q.personasMin) items = items.filter((reserva) => reserva.personas >= Number(q.personasMin))
  if (q.personasMax) items = items.filter((reserva) => reserva.personas <= Number(q.personasMax))
  if (q.deposito === true || q.deposito === "true") {
    items = items.filter((reserva) => reserva.depositoRequeridoCentavos > 0)
  }
  if (busqueda) {
    items = items.filter(
      (reserva) =>
        reserva.codigo.toLowerCase().includes(busqueda) ||
        reserva.clienteNombre.toLowerCase().includes(busqueda) ||
        (reserva.mesaNumero ?? "").toLowerCase().includes(busqueda),
    )
  }

  items = [...items].sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))

  const total = items.length
  const inicio = (page - 1) * pageSize
  const respuesta: ReservasRespuesta = {
    data: items.slice(inicio, inicio + pageSize),
    total,
    page,
    pageSize,
  }
  return respuesta
})

registerMock("GET", /^\/admin\/reservas\/calendario$/, (ctx) => {
  const q = ctx.query
  const sedeId = typeof q.sedeId === "string" && q.sedeId ? q.sedeId : undefined
  const desde = typeof q.desde === "string" && q.desde ? q.desde : hoyISO()
  const hasta = typeof q.hasta === "string" && q.hasta ? q.hasta : desde

  const reservas = RESERVAS.filter((reserva) => {
    if (sedeId && reserva.sedeId !== sedeId) return false
    const fecha = segmento(reserva.fechaHora, reserva.zonaHoraria)
    return fecha >= desde && fecha <= hasta
  }).map(aLista)

  const listaEspera = LISTA_ESPERA.filter((item) => {
    if (sedeId && item.sedeId !== sedeId) return false
    return segmento(item.vigenciaHasta, SEDES[item.sedeId]?.zonaHoraria) >= desde
  })

  const ahora = Date.now()
  const proximasLlegadas: ProximaLlegada[] = RESERVAS.filter(
    (reserva) =>
      (!sedeId || reserva.sedeId === sedeId) &&
      (reserva.estado === "confirmada" || reserva.estado === "solicitada") &&
      segmento(reserva.fechaHora, reserva.zonaHoraria) === hoyISO(reserva.zonaHoraria),
  )
    .map((reserva) => ({
      reservaId: reserva.id,
      codigo: reserva.codigo,
      hora: reserva.fechaHora,
      clienteNombre: reserva.clienteNombre,
      personas: reserva.personas,
      mesa: reserva.mesaNumero ? `Mesa ${reserva.mesaNumero}` : undefined,
      estado: reserva.estado,
      minutos: Math.round((new Date(reserva.fechaHora).getTime() - ahora) / MIN),
    }))
    .filter((llegada) => llegada.minutos > -45)
    .sort((a, b) => a.minutos - b.minutos)
    .slice(0, 6)

  BLOQUEOS.forEach((bloqueo) => {
    bloqueo.reservasAfectadas = contarAfectadas(bloqueo)
  })

  const bloqueos = BLOQUEOS.filter((bloqueo) => {
    if (sedeId && bloqueo.sedeId !== sedeId) return false
    const inicio = segmento(bloqueo.desde, SEDES[bloqueo.sedeId]?.zonaHoraria)
    const fin = segmento(bloqueo.hasta, SEDES[bloqueo.sedeId]?.zonaHoraria)
    return inicio <= hasta && fin >= desde
  })

  const calendario: CalendarioReserva = {
    desde,
    hasta,
    reservas,
    listaEspera,
    proximasLlegadas,
    bloqueos,
    actualizadoEn: new Date().toISOString(),
  }
  return calendario
})

registerMock("GET", /^\/admin\/reservas\/disponibilidad$/, (ctx) => {
  const q = ctx.query
  const sedeId = typeof q.sedeId === "string" && q.sedeId ? q.sedeId : "centro"
  const fechaHora = typeof q.fechaHora === "string" && q.fechaHora ? q.fechaHora : new Date().toISOString()
  const politica = POLITICAS[sedeId] ?? POLITICAS.centro
  const duracionMin = Number(q.duracionMin ?? politica.duracionMin)
  const personas = Number(q.personas ?? 2)
  const zonaId = typeof q.zonaId === "string" && q.zonaId ? q.zonaId : undefined
  const excluirId = typeof q.excluirId === "string" && q.excluirId ? q.excluirId : undefined

  const bloqueo = bloqueoQueAfecta(sedeId, zonaId, fechaHora, duracionMin)

  const mesas: MesaCandidata[] = (MESAS_CATALOGO[sedeId] ?? [])
    .filter((mesa) => (!zonaId || mesa.zonaId === zonaId) && mesa.capacidad >= personas)
    .map((mesa) => {
      if (mesa.fueraServicio) {
        return { ...mesa, estado: "fuera_servicio", disponible: false, motivo: "Fuera de servicio por mantenimiento" }
      }
      const conflicto = reservasSolapadas(mesa.id, fechaHora, duracionMin, excluirId)[0]
      return {
        id: mesa.id,
        numero: mesa.numero,
        zonaId: mesa.zonaId,
        zonaNombre: mesa.zonaNombre,
        capacidad: mesa.capacidad,
        estado: conflicto ? "reservada" : "libre",
        disponible: !conflicto && !bloqueo,
        motivo: bloqueo ? `${BLOQUEO_LABEL[bloqueo.tipo]}: ${bloqueo.motivo}` : conflicto ? `Ocupada por ${conflicto.codigo}` : undefined,
      }
    })

  const alternativas = [30, 60, 90, 120]
    .map((salto) => {
      const alternativa = sumarMinutos(fechaHora, salto)
      const bloqueoAlternativa = bloqueoQueAfecta(sedeId, zonaId, alternativa, duracionMin)
      const libres = mesasLibres(sedeId, alternativa, duracionMin, personas, excluirId).length
      return {
        fechaHora: alternativa,
        mesasLibres: bloqueoAlternativa ? 0 : libres,
        motivo: bloqueoAlternativa ? `${BLOQUEO_LABEL[bloqueoAlternativa.tipo]}: ${bloqueoAlternativa.motivo}` : undefined,
      }
    })
    .filter((alternativa) => alternativa.mesasLibres > 0)

  const disponibilidad: DisponibilidadReserva = {
    fechaHora,
    duracionMin,
    bloqueado: Boolean(bloqueo),
    motivoBloqueo: bloqueo ? `${BLOQUEO_LABEL[bloqueo.tipo]}: ${bloqueo.motivo}` : undefined,
    mesas,
    alternativas,
  }
  return disponibilidad
})

registerMock("GET", /^\/admin\/reservas\/politicas$/, (ctx) => {
  const q = ctx.query
  const sedeId = typeof q.sedeId === "string" && q.sedeId ? q.sedeId : typeof q.sucursal === "string" && q.sucursal ? q.sucursal : "centro"
  return { ...(POLITICAS[sedeId] ?? POLITICAS.centro) }
})

registerMock("PUT", /^\/admin\/reservas\/politicas$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<PoliticaReserva> & { motivo?: string }
  const sedeId = body.sucursalId && POLITICAS[body.sucursalId] ? body.sucursalId : "centro"
  const politica = POLITICAS[sedeId]
  const motivo = body.motivo?.trim()
  if (!motivo || motivo.length < 3) {
    throw new ApiError(422, "El motivo es obligatorio para cambiar la política.", "motivo_requerido")
  }
  Object.assign(politica, {
    ...body,
    sucursalId: sedeId,
    sucursalNombre: SEDES[sedeId].nombre,
    actualizadoEn: new Date().toISOString(),
    actualizadoPor: "María Gómez",
  })
  return { ...politica }
})

registerMock("POST", /^\/admin\/reservas$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<ReservaPayload>
  const sedeId = body.sedeId && SEDES[body.sedeId] ? body.sedeId : ""
  if (!sedeId) throw new ApiError(422, "Selecciona una sede válida.", "sede_invalida")
  const politica = POLITICAS[sedeId]
  const clienteNombre = body.clienteNombre?.trim() ?? ""
  if (clienteNombre.length < 3) throw new ApiError(422, "El nombre del cliente es obligatorio.", "cliente_requerido")
  if (!body.fechaHora || Number.isNaN(new Date(body.fechaHora).getTime())) {
    throw new ApiError(422, "La fecha y hora de la reserva son obligatorias.", "fecha_invalida")
  }
  const personas = Number(body.personas ?? 0)
  if (personas < 1) throw new ApiError(422, "Indica al menos una persona.", "personas_invalidas")
  if (personas > politica.maximoPersonas) {
    throw new ApiError(422, `La política de la sede permite hasta ${politica.maximoPersonas} personas por reserva.`, "personas_excedidas")
  }
  const fechaHora = new Date(body.fechaHora).toISOString()
  if (new Date(fechaHora).getTime() < Date.now() - 5 * MIN) {
    throw new ApiError(422, "La fecha de la reserva ya pasó.", "fecha_pasada")
  }
  const duracionMin = Math.max(30, Number(body.duracionMin ?? politica.duracionMin))

  const bloqueo = bloqueoQueAfecta(sedeId, body.zonaId, fechaHora, duracionMin)
  if (bloqueo) {
    throw new ApiError(409, `La franja está cerrada (${BLOQUEO_LABEL[bloqueo.tipo]}: ${bloqueo.motivo}).`, "franja_cerrada")
  }

  let mesaId = body.mesaId
  if (mesaId) {
    validarMesaLibre(sedeId, mesaId, fechaHora, duracionMin, personas)
  } else {
    const candidata = mesasLibres(sedeId, fechaHora, duracionMin, personas)[0]
    mesaId = candidata?.id
  }
  if (body.zonaId && mesaId) {
    const mesa = mesaDe(sedeId, mesaId)
    if (mesa && mesa.zonaId !== body.zonaId) mesaId = undefined
  }

  const numero = 2500 + RESERVAS.length + 1
  const id = `res-${numero + 1000}`
  const codigo = `R-${numero}`
  const mesa = mesaDe(sedeId, mesaId)
  const canal = (body.canal ?? "mostrador") as CanalReserva
  const ahora = new Date().toISOString()

  const eventos: EventoReserva[] = [
    {
      id: `${id}-e1`,
      tipo: "solicitada",
      actor: "María Gómez",
      actorTipo: "administrador",
      canal: "panel",
      dispositivo: "Panel admin",
      servidorEn: ahora,
      resultado: "Registrada",
      detalle: `Alta manual · canal ${CANAL_LABEL[canal]}`,
    },
  ]
  const detalle: ReservaDetalle = {
    id,
    codigo,
    fechaHora,
    duracionMin,
    personas,
    estado: politica.confirmacionAutomatica ? "confirmada" : "solicitada",
    canal,
    sedeId,
    sedeNombre: SEDES[sedeId].nombre,
    zonaId: mesa?.zonaId,
    zonaNombre: mesa?.zonaNombre,
    mesaId: mesa?.id,
    mesaNumero: mesa?.numero,
    clienteNombre,
    telefono: body.telefono,
    correo: body.correo,
    notas: body.notas,
    depositoRequeridoCentavos: 0,
    depositoPagadoCentavos: 0,
    depositoEstado: "no_requerido",
    creadaEn: ahora,
    zonaHoraria: SEDES[sedeId].zonaHoraria,
    politicaSnapshot: { ...politica },
    sellos: { creadaEn: ahora },
    tiempos: { esperaSeg: null, duracionMesaSeg: null },
    deposito: { estado: "no_requerido", requeridoCentavos: 0, pagadoCentavos: 0, movimientos: [] },
    bitacora: eventos,
  }
  if (politica.confirmacionAutomatica) {
    detalle.sellos.confirmadaEn = ahora
    agregarEvento(detalle, {
      tipo: "confirmada",
      actor: "Motor de reservas",
      actorTipo: "automatizacion",
      canal: "panel",
      dispositivo: "Motor de reservas",
      resultado: "Confirmada",
      detalle: `Política: ${politica.duracionMin} min`,
    })
  }
  if (mesa) {
    agregarEvento(detalle, {
      tipo: "mesa_asignada",
      actor: "María Gómez",
      actorTipo: "administrador",
      canal: "panel",
      dispositivo: "Panel admin",
      resultado: "Asignada",
      detalle: `Mesa ${mesa.numero} · ${mesa.zonaNombre}`,
    })
  }
  if (body.esperaId) {
    const espera = LISTA_ESPERA.find((item) => item.id === body.esperaId)
    if (espera) {
      espera.estado = "aceptada"
      agregarEvento(detalle, {
        tipo: "confirmada",
        actor: "María Gómez",
        actorTipo: "administrador",
        canal: "panel",
        dispositivo: "Panel admin",
        resultado: "Convertida",
        detalle: `Lista de espera de ${espera.clienteNombre}`,
      })
    }
  }

  RESERVAS.push(detalle)
  return detalle
})

registerMock("POST", /^\/admin\/reservas\/exportaciones$/, (ctx) => {
  const body = (ctx.body ?? {}) as { tipo?: ExportacionReserva["tipo"]; formato?: ExportacionReserva["formato"] }
  const exportacion: ExportacionReserva = {
    id: `exp-res-${Date.now()}`,
    tipo: body.tipo ?? "reservas",
    formato: body.formato ?? "csv",
    estado: "en_proceso",
    creadoEn: new Date().toISOString(),
  }
  return exportacion
})

registerMock("POST", /^\/admin\/reservas\/([^/]+)\/acciones$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const reserva = buscarReserva(id)
  const body = (ctx.body ?? {}) as Partial<AccionReservaPayload>
  const accion = body.accion as AccionReservaNombre
  const motivo = body.motivo?.trim() ?? ""
  const motivoObligatorio = accion !== "sentar" && accion !== "finalizar"
  if (motivoObligatorio && motivo.length < 3) {
    throw new ApiError(422, "El motivo es obligatorio para esta acción.", "motivo_requerido")
  }
  const ahora = new Date().toISOString()

  switch (accion) {
    case "sentar": {
      if (reserva.estado !== "confirmada" && reserva.estado !== "solicitada") {
        throw new ApiError(422, "Solo se puede sentar una reserva solicitada o confirmada.", "estado_invalido")
      }
      if (!reserva.mesaId) {
        throw new ApiError(422, "La reserva no tiene mesa asignada; reubícala antes de sentar al cliente.", "mesa_requerida")
      }
      reserva.estado = "sentada"
      reserva.sellos.sentadaEn = ahora
      agregarEvento(reserva, {
        tipo: "sentada",
        actor: "María Gómez",
        actorTipo: "administrador",
        canal: "panel",
        dispositivo: "Panel admin",
        resultado: "Cliente en mesa",
        detalle: reserva.mesaNumero ? `Mesa ${reserva.mesaNumero}` : undefined,
      })
      break
    }
    case "finalizar": {
      if (reserva.estado !== "sentada") {
        throw new ApiError(422, "Solo se puede finalizar una reserva sentada.", "estado_invalido")
      }
      reserva.estado = "finalizada"
      reserva.sellos.finalizadaEn = ahora
      agregarEvento(reserva, {
        tipo: "finalizada",
        actor: "María Gómez",
        actorTipo: "administrador",
        canal: "panel",
        dispositivo: "Panel admin",
        resultado: "Mesa liberada",
      })
      break
    }
    case "no_show": {
      if (reserva.estado !== "confirmada" && reserva.estado !== "solicitada") {
        throw new ApiError(422, "Solo se puede marcar no-show una reserva pendiente de llegada.", "estado_invalido")
      }
      reserva.estado = "no_show"
      reserva.sellos.noShowEn = ahora
      agregarEvento(reserva, {
        tipo: "no_show",
        actor: "María Gómez",
        actorTipo: "administrador",
        canal: "panel",
        dispositivo: "Panel admin",
        resultado: "Registrado",
        detalle: motivo,
      })
      break
    }
    case "cancelar": {
      if (reserva.estado !== "confirmada" && reserva.estado !== "solicitada") {
        throw new ApiError(422, "Una reserva sentada o cerrada ya no se cancela; usa finalizar.", "estado_invalido")
      }
      reserva.estado = "cancelada"
      reserva.sellos.canceladaEn = ahora
      agregarEvento(reserva, {
        tipo: body.porCliente ? "cancelada_cliente" : "cancelada_local",
        actor: body.porCliente ? reserva.clienteNombre : "María Gómez",
        actorTipo: body.porCliente ? "cliente" : "administrador",
        canal: body.porCliente ? reserva.canal : "panel",
        dispositivo: body.porCliente ? "Portal/App" : "Panel admin",
        resultado: "Cancelada",
        detalle: motivo,
      })
      break
    }
    case "reubicar": {
      if (reserva.estado !== "confirmada" && reserva.estado !== "solicitada") {
        throw new ApiError(422, "Solo se reubican reservas pendientes de llegada.", "estado_invalido")
      }
      const fechaHora = body.fechaHora ? new Date(body.fechaHora).toISOString() : reserva.fechaHora
      const duracionMin = Math.max(30, Number(body.duracionMin ?? reserva.duracionMin))
      const mesaId = body.mesaId === "" ? undefined : (body.mesaId ?? reserva.mesaId)

      const bloqueo = bloqueoQueAfecta(reserva.sedeId, undefined, fechaHora, duracionMin)
      if (bloqueo) {
        throw new ApiError(409, `La franja está cerrada (${BLOQUEO_LABEL[bloqueo.tipo]}: ${bloqueo.motivo}).`, "franja_cerrada")
      }
      if (mesaId) validarMesaLibre(reserva.sedeId, mesaId, fechaHora, duracionMin, reserva.personas, reserva.id)

      const mesaAnterior = reserva.mesaNumero ? `Mesa ${reserva.mesaNumero}` : "Sin mesa"
      const mesaNueva = mesaDe(reserva.sedeId, mesaId)
      const diffs: CampoDiff[] = []
      if (fechaHora !== reserva.fechaHora) {
        diffs.push({
          campo: "Fecha y hora",
          antes: new Date(reserva.fechaHora).toISOString(),
          despues: new Date(fechaHora).toISOString(),
        })
      }
      if ((mesaNueva?.numero ?? "Sin mesa") !== (reserva.mesaNumero ?? "Sin mesa")) {
        diffs.push({ campo: "Mesa", antes: mesaAnterior, despues: mesaNueva ? `Mesa ${mesaNueva.numero}` : "Sin mesa" })
      }
      if (duracionMin !== reserva.duracionMin) {
        diffs.push({ campo: "Duración", antes: `${reserva.duracionMin} min`, despues: `${duracionMin} min` })
      }

      reserva.fechaHora = fechaHora
      reserva.duracionMin = duracionMin
      reserva.mesaId = mesaNueva?.id
      reserva.mesaNumero = mesaNueva?.numero
      reserva.zonaId = mesaNueva?.zonaId ?? reserva.zonaId
      reserva.zonaNombre = mesaNueva?.zonaNombre ?? reserva.zonaNombre

      agregarEvento(reserva, {
        tipo: "reagendada",
        actor: "María Gómez",
        actorTipo: "administrador",
        canal: "panel",
        dispositivo: "Panel admin",
        resultado: "Aplicada",
        detalle: motivo,
        diffs,
      })
      break
    }
    case "registrar_deposito": {
      if (reserva.deposito.requeridoCentavos <= 0) {
        throw new ApiError(422, "La política de esta reserva no pide depósito.", "deposito_no_requerido")
      }
      if (reserva.deposito.estado === "pagado") {
        throw new ApiError(422, "El depósito ya está cubierto.", "deposito_pagado")
      }
      const monto = Math.round(Number(body.montoCentavos ?? 0))
      if (monto <= 0) throw new ApiError(422, "El monto debe ser mayor a cero.", "monto_invalido")
      reserva.deposito.pagadoCentavos += monto
      reserva.deposito.estado = reserva.deposito.pagadoCentavos >= reserva.deposito.requeridoCentavos ? "pagado" : "pendiente"
      reserva.depositoPagadoCentavos = reserva.deposito.pagadoCentavos
      reserva.depositoEstado = reserva.deposito.estado
      reserva.deposito.movimientos.push({
        id: `${reserva.id}-d${reserva.deposito.movimientos.length + 1}`,
        tipo: "cobro",
        montoCentavos: monto,
        en: ahora,
        usuario: "María Gómez",
        motivo,
        conciliado: false,
      })
      agregarEvento(reserva, {
        tipo: "deposito_registrado",
        actor: "María Gómez",
        actorTipo: "administrador",
        canal: "panel",
        dispositivo: "Panel admin",
        resultado: "Registrado",
        detalle: `${motivo} · ${formatMoney(monto)} · pendiente de conciliar con Caja`,
      })
      break
    }
    case "reembolsar_deposito": {
      if (reserva.deposito.pagadoCentavos <= 0) {
        throw new ApiError(422, "La reserva no tiene depósito pagado.", "sin_deposito")
      }
      const monto = Math.round(Number(body.montoCentavos ?? 0))
      if (monto <= 0) throw new ApiError(422, "El monto debe ser mayor a cero.", "monto_invalido")
      if (monto > reserva.deposito.pagadoCentavos) {
        throw new ApiError(422, "El reembolso no puede superar lo pagado.", "reembolso_excedido")
      }
      reserva.deposito.pagadoCentavos -= monto
      reserva.deposito.estado = reserva.deposito.pagadoCentavos === 0 ? "reembolsado" : reserva.deposito.estado
      reserva.depositoPagadoCentavos = reserva.deposito.pagadoCentavos
      reserva.depositoEstado = reserva.deposito.estado
      reserva.deposito.movimientos.push({
        id: `${reserva.id}-d${reserva.deposito.movimientos.length + 1}`,
        tipo: "reembolso",
        montoCentavos: monto,
        en: ahora,
        usuario: "María Gómez",
        motivo,
        conciliado: false,
      })
      agregarEvento(reserva, {
        tipo: "deposito_reembolsado",
        actor: "María Gómez",
        actorTipo: "administrador",
        canal: "panel",
        dispositivo: "Panel admin",
        resultado: "Reembolsado",
        detalle: `${motivo} · ${formatMoney(monto)}`,
      })
      break
    }
    default:
      throw new ApiError(400, "Acción no reconocida.", "accion_invalida")
  }

  recalcularReserva(reserva)
  return reserva
})

registerMock("PATCH", /^\/admin\/reservas\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const reserva = buscarReserva(id)
  const body = (ctx.body ?? {}) as Partial<ReservaEdicionPayload>
  const politica = POLITICAS[reserva.sedeId]

  if (body.personas != null && body.personas > politica.maximoPersonas) {
    throw new ApiError(422, `La política de la sede permite hasta ${politica.maximoPersonas} personas.`, "personas_excedidas")
  }

  const diffs: CampoDiff[] = []
  const agregarDiff = (campo: string, antes: string, despues: string) => {
    if (antes !== despues) diffs.push({ campo, antes, despues })
  }
  if (body.clienteNombre != null) {
    agregarDiff("Cliente", reserva.clienteNombre, body.clienteNombre)
    reserva.clienteNombre = body.clienteNombre
  }
  if (body.telefono != null) {
    agregarDiff("Teléfono", reserva.telefono ?? "—", body.telefono || "—")
    reserva.telefono = body.telefono || undefined
  }
  if (body.correo != null) {
    agregarDiff("Correo", reserva.correo ?? "—", body.correo || "—")
    reserva.correo = body.correo || undefined
  }
  if (body.personas != null) {
    agregarDiff("Personas", String(reserva.personas), String(body.personas))
    reserva.personas = body.personas
  }
  if (body.canal != null) {
    agregarDiff("Canal", CANAL_LABEL[reserva.canal], CANAL_LABEL[body.canal])
    reserva.canal = body.canal
  }
  if (body.notas != null) {
    agregarDiff("Notas", reserva.notas ?? "—", body.notas || "—")
    reserva.notas = body.notas || undefined
  }

  if (diffs.length > 0) {
    agregarEvento(reserva, {
      tipo: "editada",
      actor: "María Gómez",
      actorTipo: "administrador",
      canal: "panel",
      dispositivo: "Panel admin",
      resultado: "Guardada",
      detalle: "Edición de datos de la reserva.",
      diffs,
    })
  }
  return reserva
})

registerMock("GET", /^\/admin\/reservas\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  return buscarReserva(id)
})

registerMock("GET", /^\/admin\/bloqueos$/, (ctx) => {
  const q = ctx.query
  let items = [...BLOQUEOS]
  if (q.sedeId) items = items.filter((bloqueo) => bloqueo.sedeId === q.sedeId)
  if (q.tipo) items = items.filter((bloqueo) => bloqueo.tipo === q.tipo)
  if (q.desde || q.hasta) {
    items = items.filter((bloqueo) => {
      const inicio = segmento(bloqueo.desde, SEDES[bloqueo.sedeId]?.zonaHoraria)
      const fin = segmento(bloqueo.hasta, SEDES[bloqueo.sedeId]?.zonaHoraria)
      if (typeof q.desde === "string" && q.desde && fin < q.desde) return false
      if (typeof q.hasta === "string" && q.hasta && inicio > q.hasta) return false
      return true
    })
  }
  items.forEach((bloqueo) => {
    bloqueo.reservasAfectadas = contarAfectadas(bloqueo)
  })
  return items.sort((a, b) => a.desde.localeCompare(b.desde))
})

registerMock("POST", /^\/admin\/bloqueos$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<BloqueoPayload>
  const sedeId = body.sedeId && SEDES[body.sedeId] ? body.sedeId : ""
  if (!sedeId) throw new ApiError(422, "Selecciona una sede válida.", "sede_invalida")
  const motivo = body.motivo?.trim() ?? ""
  if (motivo.length < 3) throw new ApiError(422, "El motivo del bloqueo es obligatorio.", "motivo_requerido")
  if (!body.desde || !body.hasta) throw new ApiError(422, "Indica el rango del bloqueo.", "rango_requerido")
  const desde = new Date(body.desde)
  const hasta = new Date(body.hasta)
  if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime()) || hasta <= desde) {
    throw new ApiError(422, "El rango del bloqueo no es válido.", "rango_invalido")
  }

  const bloqueo: Bloqueo = {
    id: `blq-${BLOQUEOS.length + 1}`,
    sedeId,
    sedeNombre: SEDES[sedeId].nombre,
    tipo: body.tipo ?? "cierre",
    motivo,
    desde: desde.toISOString(),
    hasta: hasta.toISOString(),
    zonaId: body.zonaId,
    zonaNombre: body.zonaId ? ZONAS[body.zonaId] : undefined,
    creadoEn: new Date().toISOString(),
    creadoPor: "María Gómez",
    reservasAfectadas: 0,
  }
  BLOQUEOS.push(bloqueo)
  bloqueo.reservasAfectadas = contarAfectadas(bloqueo)
  return bloqueo
})

registerMock("GET", /^\/admin\/bloqueos\/([^/]+)\/impacto$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const bloqueo = BLOQUEOS.find((item) => item.id === id)
  if (!bloqueo) throw new ApiError(404, "El bloqueo no existe.", "bloqueo_no_encontrado")
  bloqueo.reservasAfectadas = contarAfectadas(bloqueo)
  const reservas = RESERVAS.filter(
    (reserva) =>
      reserva.sedeId === bloqueo.sedeId &&
      ESTADOS_QUE_OCUPAN.includes(reserva.estado) &&
      (!bloqueo.zonaId || reserva.zonaId === bloqueo.zonaId) &&
      solapan(
        new Date(reserva.fechaHora).getTime(),
        new Date(reserva.fechaHora).getTime() + reserva.duracionMin * MIN,
        new Date(bloqueo.desde).getTime(),
        new Date(bloqueo.hasta).getTime(),
      ),
  ).map(aLista)
  const impacto: ImpactoBloqueo = { bloqueo, total: reservas.length, reservas }
  return impacto
})

registerMock("POST", /^\/admin\/bloqueos\/([^/]+)\/notificar$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const bloqueo = BLOQUEOS.find((item) => item.id === id)
  if (!bloqueo) throw new ApiError(404, "El bloqueo no existe.", "bloqueo_no_encontrado")
  const body = (ctx.body ?? {}) as { motivo?: string }
  const motivo = body.motivo?.trim()
  if (!motivo || motivo.length < 3) {
    throw new ApiError(422, "El motivo de la notificación es obligatorio.", "motivo_requerido")
  }
  const afectadas = RESERVAS.filter(
    (reserva) =>
      reserva.sedeId === bloqueo.sedeId &&
      ESTADOS_QUE_OCUPAN.includes(reserva.estado) &&
      (!bloqueo.zonaId || reserva.zonaId === bloqueo.zonaId) &&
      solapan(
        new Date(reserva.fechaHora).getTime(),
        new Date(reserva.fechaHora).getTime() + reserva.duracionMin * MIN,
        new Date(bloqueo.desde).getTime(),
        new Date(bloqueo.hasta).getTime(),
      ),
  )
  afectadas.forEach((reserva) => {
    agregarEvento(reserva, {
      tipo: "recordatorio_enviado",
      actor: "María Gómez",
      actorTipo: "administrador",
      canal: "panel",
      dispositivo: "Servicio de notificaciones",
      resultado: "Notificada",
      detalle: `${motivo} · Se propone reubicación por ${BLOQUEO_LABEL[bloqueo.tipo].toLowerCase()}.`,
    })
  })
  return { notificadas: afectadas.length, propuestas: afectadas.map((reserva) => reserva.codigo) }
})

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export type DisponibilidadParams = {
  sedeId: string
  fechaHora: string
  duracionMin: number
  personas: number
  zonaId?: string
  excluirId?: string
}

export function useReservas(filtros: ReservasFiltros) {
  return useQuery({
    queryKey: ["reservas", "lista", filtros],
    queryFn: () => api.get<ReservasRespuesta>("/admin/reservas", filtros as unknown as Query),
    placeholderData: keepPreviousData,
  })
}

export function useReservaDetalle(id: string | null) {
  return useQuery({
    queryKey: ["reservas", "detalle", id],
    queryFn: () => api.get<ReservaDetalle>(`/admin/reservas/${id}`),
    enabled: Boolean(id),
  })
}

export function useCalendarioReservas(params: { sedeId?: string; desde: string; hasta: string }) {
  return useQuery({
    queryKey: ["reservas", "calendario", params],
    queryFn: () => api.get<CalendarioReserva>("/admin/reservas/calendario", params as unknown as Query),
    refetchInterval: 60_000,
  })
}

export function useDisponibilidadReserva(params: DisponibilidadParams, enabled = true) {
  return useQuery({
    queryKey: ["reservas", "disponibilidad", params],
    queryFn: () => api.get<DisponibilidadReserva>("/admin/reservas/disponibilidad", params as unknown as Query),
    enabled: enabled && Boolean(params.fechaHora) && params.personas > 0,
    staleTime: 10_000,
  })
}

export function useCrearReserva() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ReservaPayload) => api.post<ReservaDetalle>("/admin/reservas", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reservas"] })
    },
  })
}

export function useEditarReserva() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ReservaEdicionPayload) =>
      api.patch<ReservaDetalle>(`/admin/reservas/${payload.id}`, payload),
    onSuccess: (_detalle, payload) => {
      void queryClient.invalidateQueries({ queryKey: ["reservas"] })
      void queryClient.invalidateQueries({ queryKey: ["reservas", "detalle", payload.id] })
    },
  })
}

export function useAccionReserva() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AccionReservaPayload) =>
      api.post<ReservaDetalle>(`/admin/reservas/${payload.id}/acciones`, payload),
    onSuccess: (_detalle, payload) => {
      void queryClient.invalidateQueries({ queryKey: ["reservas"] })
      void queryClient.invalidateQueries({ queryKey: ["reservas", "detalle", payload.id] })
      void queryClient.invalidateQueries({ queryKey: ["bloqueos"] })
    },
  })
}

export function usePoliticas(sedeId: string) {
  return useQuery({
    queryKey: ["reservas", "politicas", sedeId],
    queryFn: () => api.get<PoliticaReserva>("/admin/reservas/politicas", { sedeId }),
    enabled: Boolean(sedeId),
  })
}

export function useGuardarPolitica() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: PoliticaReserva & { motivo: string }) =>
      api.put<PoliticaReserva>("/admin/reservas/politicas", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reservas", "politicas"] })
    },
  })
}

export function useBloqueos(filtros: { sedeId?: string; desde?: string; hasta?: string; tipo?: string }) {
  return useQuery({
    queryKey: ["bloqueos", "lista", filtros],
    queryFn: () => api.get<Bloqueo[]>("/admin/bloqueos", filtros as unknown as Query),
    placeholderData: keepPreviousData,
  })
}

export function useCrearBloqueo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: BloqueoPayload) => api.post<Bloqueo>("/admin/bloqueos", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bloqueos"] })
      void queryClient.invalidateQueries({ queryKey: ["reservas"] })
    },
  })
}

export function useImpactoBloqueo(id: string | null) {
  return useQuery({
    queryKey: ["bloqueos", "impacto", id],
    queryFn: () => api.get<ImpactoBloqueo>(`/admin/bloqueos/${id}/impacto`),
    enabled: Boolean(id),
  })
}

export function useNotificarBloqueo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; motivo: string }) =>
      api.post<{ notificadas: number; propuestas: string[] }>(`/admin/bloqueos/${payload.id}/notificar`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bloqueos"] })
      void queryClient.invalidateQueries({ queryKey: ["reservas"] })
    },
  })
}

export function useExportarReservas() {
  return useMutation({
    mutationFn: (payload: { tipo: ExportacionReserva["tipo"]; formato?: ExportacionReserva["formato"]; reservaId?: string }) =>
      api.post<ExportacionReserva>("/admin/reservas/exportaciones", payload),
  })
}

/** Utilidad para los selects del prototipo. */
export {
  ACTOR_LABEL,
  BLOQUEO_LABEL,
  BLOQUEO_TONE,
  BITACORA_LABEL,
  CANAL_BITACORA_LABEL,
  CANAL_LABEL,
  DEPOSITO_LABEL,
  DEPOSITO_TONE,
  ESPERA_LABEL,
  ESPERA_TONE,
  ESTADO_LABEL,
  ESTADO_TONE,
}
