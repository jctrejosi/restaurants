import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError, registerMock, type Query } from "@/lib/api"
import type {
  Arqueo,
  ArqueoPayload,
  CerrarTurnoPayload,
  ConsolidadoDia,
  EsperadoMedio,
  ExportacionResp,
  MedioPago,
  MedioPagoTipo,
  MediosPagoResp,
  PedidoTurno,
  ReabrirTurnoPayload,
  TurnoDetalle,
  TurnoFiltros,
  TurnoLite,
  TurnosResp,
} from "@/modules/caja/types"
import {
  MEDIO_PAGO_TIPO_LABEL,
  TOLERANCIA_DIFERENCIA_CENTAVOS,
  TURNO_ESTADO_TONE,
} from "@/modules/caja/types"

/* -------------------------------------------------------------------------- */
/* Mock de desarrollo                                                          */
/* Se retira cuando el backend NestJS exponga `/admin/caja/*`.               */
/* -------------------------------------------------------------------------- */

const MIN = 60_000

type SedeCfg = { nombre: string; zonaHoraria: string; moneda: string }

const SEDES: Record<string, SedeCfg> = {
  centro: { nombre: "Punto C · Centro", zonaHoraria: "America/Mexico_City", moneda: "MXN" },
  norte: { nombre: "Punto C · Norte", zonaHoraria: "America/Mexico_City", moneda: "MXN" },
}

const USUARIO_ACTUAL = "María Gómez"

type PagoSeedEstado = "aprobado" | "pendiente" | "rechazado"

type PedidoSeed = {
  id: string
  codigo: string
  estado: string
  modalidad: string
  totalCentavos: number
  propinaCentavos: number
  descuentosCentavos: number
  medioPagoId: string | null
  pagoEstado: PagoSeedEstado | null
  haceMin: number
}

type TurnoSeed = {
  id: string
  sucursalId: keyof typeof SEDES
  numero: string
  estado: "abierto" | "cerrado"
  abiertoEn: string
  cerradoEn: string | null
  usuarioApertura: string
  usuarioCierre: string | null
  baseInicialCentavos: number
  retirosCentavos: number
  gastosCentavos: number
  observaciones: string
  /** Diferencia sembrada del cierre (contado − esperado); solo turnos cerrados. */
  diferenciaSeedCentavos: number | null
  pedidos: PedidoSeed[]
}

function isoHaceDias(dias: number, hhmm: string): string {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - dias)
  const [horas, minutos] = hhmm.split(":").map(Number)
  fecha.setHours(horas, minutos, 0, 0)
  return fecha.toISOString()
}

function isoHaceMinutos(min: number): string {
  return new Date(Date.now() - min * MIN).toISOString()
}

function fechaLocal(iso: string): string {
  const fecha = new Date(iso)
  const mes = String(fecha.getMonth() + 1).padStart(2, "0")
  const dia = String(fecha.getDate()).padStart(2, "0")
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

export function hoyISO(): string {
  return fechaLocal(new Date().toISOString())
}

const PEDIDO_ESTADO_TONE: Record<string, PedidoTurno["estadoTone"]> = {
  pagado: "green",
  por_cobrar: "amber",
  listo: "blue",
  en_preparacion: "blue",
  entregado: "outline",
  cancelado: "gray",
  reembolsado: "gray",
}

/* -------------------------------------------------------------------------- */
/* Medios de pago por sede                                                     */
/* -------------------------------------------------------------------------- */

const MEDIOS: MedioPago[] = [
  { id: "m-efectivo-centro", sucursalId: "centro", nombre: "Efectivo", tipo: "efectivo", requiereReferencia: false, activo: true },
  { id: "m-tarjeta-centro", sucursalId: "centro", nombre: "Tarjeta débito/crédito", tipo: "tarjeta", requiereReferencia: true, activo: true },
  { id: "m-transferencia-centro", sucursalId: "centro", nombre: "Transferencia", tipo: "transferencia", requiereReferencia: true, activo: true },
  { id: "m-vale-centro", sucursalId: "centro", nombre: "Vales de comida", tipo: "vale", requiereReferencia: false, activo: false },
  { id: "m-efectivo-norte", sucursalId: "norte", nombre: "Efectivo", tipo: "efectivo", requiereReferencia: false, activo: true },
  { id: "m-tarjeta-norte", sucursalId: "norte", nombre: "Tarjeta débito/crédito", tipo: "tarjeta", requiereReferencia: true, activo: true },
]

function mediosDeSede(sucursalId: string): MedioPago[] {
  return MEDIOS.filter((medio) => medio.sucursalId === sucursalId)
}

function nombreMedio(id: string | null): string | null {
  return MEDIOS.find((medio) => medio.id === id)?.nombre ?? null
}

/* -------------------------------------------------------------------------- */
/* Turnos sembrados                                                            */
/* -------------------------------------------------------------------------- */

const TURNOS: TurnoSeed[] = [
  {
    id: "tn-centro-104",
    sucursalId: "centro",
    numero: "T-104",
    estado: "cerrado",
    abiertoEn: isoHaceDias(1, "08:02"),
    cerradoEn: isoHaceDias(1, "16:10"),
    usuarioApertura: "Laura Pérez",
    usuarioCierre: "María Gómez",
    baseInicialCentavos: 200_000,
    retirosCentavos: 150_000,
    gastosCentavos: 42_000,
    observaciones: "Turno sin incidencias.",
    diferenciaSeedCentavos: 0,
    pedidos: [
      { id: "p-9001", codigo: "P-9001", estado: "pagado", modalidad: "Mesa 04", totalCentavos: 84_500, propinaCentavos: 8_000, descuentosCentavos: 0, medioPagoId: "m-efectivo-centro", pagoEstado: "aprobado", haceMin: 0 },
      { id: "p-9002", codigo: "P-9002", estado: "pagado", modalidad: "Mostrador", totalCentavos: 32_000, propinaCentavos: 0, descuentosCentavos: 3_200, medioPagoId: "m-tarjeta-centro", pagoEstado: "aprobado", haceMin: 0 },
      { id: "p-9003", codigo: "P-9003", estado: "pagado", modalidad: "Mesa 07", totalCentavos: 121_500, propinaCentavos: 12_000, descuentosCentavos: 0, medioPagoId: "m-tarjeta-centro", pagoEstado: "aprobado", haceMin: 0 },
      { id: "p-9004", codigo: "P-9004", estado: "pagado", modalidad: "Domicilio", totalCentavos: 46_800, propinaCentavos: 4_000, descuentosCentavos: 0, medioPagoId: "m-transferencia-centro", pagoEstado: "aprobado", haceMin: 0 },
      { id: "p-9005", codigo: "P-9005", estado: "pagado", modalidad: "Mesa 02", totalCentavos: 63_000, propinaCentavos: 6_000, descuentosCentavos: 0, medioPagoId: "m-efectivo-centro", pagoEstado: "aprobado", haceMin: 0 },
    ],
  },
  {
    id: "tn-centro-105",
    sucursalId: "centro",
    numero: "T-105",
    estado: "cerrado",
    abiertoEn: isoHaceDias(1, "16:25"),
    cerradoEn: isoHaceDias(1, "23:38"),
    usuarioApertura: "Carlos Méndez",
    usuarioCierre: "Carlos Méndez",
    baseInicialCentavos: 180_000,
    retirosCentavos: 95_000,
    gastosCentavos: 18_500,
    observaciones: "Faltante de $25.00 en efectivo; se reportó a gerencia al cierre.",
    diferenciaSeedCentavos: -2_500,
    pedidos: [
      { id: "p-9006", codigo: "P-9006", estado: "pagado", modalidad: "Mesa 09", totalCentavos: 152_000, propinaCentavos: 15_000, descuentosCentavos: 0, medioPagoId: "m-tarjeta-centro", pagoEstado: "aprobado", haceMin: 0 },
      { id: "p-9007", codigo: "P-9007", estado: "pagado", modalidad: "Mesa 11", totalCentavos: 98_400, propinaCentavos: 9_500, descuentosCentavos: 4_900, medioPagoId: "m-efectivo-centro", pagoEstado: "aprobado", haceMin: 0 },
      { id: "p-9008", codigo: "P-9008", estado: "reembolsado", modalidad: "Domicilio", totalCentavos: 41_200, propinaCentavos: 0, descuentosCentavos: 0, medioPagoId: "m-transferencia-centro", pagoEstado: "rechazado", haceMin: 0 },
      { id: "p-9009", codigo: "P-9009", estado: "pagado", modalidad: "Mostrador", totalCentavos: 27_500, propinaCentavos: 0, descuentosCentavos: 0, medioPagoId: "m-efectivo-centro", pagoEstado: "aprobado", haceMin: 0 },
    ],
  },
  {
    id: "tn-centro-106",
    sucursalId: "centro",
    numero: "T-106",
    estado: "cerrado",
    abiertoEn: isoHaceDias(0, "01:30"),
    cerradoEn: isoHaceDias(0, "07:55"),
    usuarioApertura: "Diego Ramírez",
    usuarioCierre: "María Gómez",
    baseInicialCentavos: 150_000,
    retirosCentavos: 60_000,
    gastosCentavos: 12_000,
    observaciones: "Sobrante de $12.00, probable propina mal capturada.",
    diferenciaSeedCentavos: 1_200,
    pedidos: [
      { id: "p-9010", codigo: "P-9010", estado: "pagado", modalidad: "Barra", totalCentavos: 38_000, propinaCentavos: 3_000, descuentosCentavos: 0, medioPagoId: "m-efectivo-centro", pagoEstado: "aprobado", haceMin: 0 },
      { id: "p-9011", codigo: "P-9011", estado: "pagado", modalidad: "Mesa 03", totalCentavos: 56_000, propinaCentavos: 5_500, descuentosCentavos: 0, medioPagoId: "m-tarjeta-centro", pagoEstado: "aprobado", haceMin: 0 },
    ],
  },
  {
    id: "tn-centro-107",
    sucursalId: "centro",
    numero: "T-107",
    estado: "abierto",
    abiertoEn: isoHaceDias(0, "08:03"),
    cerradoEn: null,
    usuarioApertura: "Laura Pérez",
    usuarioCierre: null,
    baseInicialCentavos: 200_000,
    retirosCentavos: 25_000,
    gastosCentavos: 8_000,
    observaciones: "",
    diferenciaSeedCentavos: null,
    pedidos: [
      { id: "p-9012", codigo: "P-9012", estado: "pagado", modalidad: "Mesa 12", totalCentavos: 84_500, propinaCentavos: 8_000, descuentosCentavos: 0, medioPagoId: "m-efectivo-centro", pagoEstado: "aprobado", haceMin: 95 },
      { id: "p-9013", codigo: "P-9013", estado: "pagado", modalidad: "Mostrador", totalCentavos: 36_000, propinaCentavos: 0, descuentosCentavos: 2_500, medioPagoId: "m-tarjeta-centro", pagoEstado: "aprobado", haceMin: 74 },
      { id: "p-9014", codigo: "P-9014", estado: "pagado", modalidad: "Domicilio", totalCentavos: 52_400, propinaCentavos: 5_000, descuentosCentavos: 0, medioPagoId: "m-transferencia-centro", pagoEstado: "aprobado", haceMin: 48 },
      { id: "p-9015", codigo: "P-9015", estado: "por_cobrar", modalidad: "Mesa 05", totalCentavos: 77_000, propinaCentavos: 0, descuentosCentavos: 0, medioPagoId: null, pagoEstado: null, haceMin: 22 },
      { id: "p-9016", codigo: "P-9016", estado: "en_preparacion", modalidad: "Mesa 08", totalCentavos: 45_800, propinaCentavos: 0, descuentosCentavos: 0, medioPagoId: null, pagoEstado: "pendiente", haceMin: 9 },
    ],
  },
  {
    id: "tn-norte-88",
    sucursalId: "norte",
    numero: "T-088",
    estado: "cerrado",
    abiertoEn: isoHaceDias(1, "09:00"),
    cerradoEn: isoHaceDias(1, "17:20"),
    usuarioApertura: "Ana Morales",
    usuarioCierre: "Ana Morales",
    baseInicialCentavos: 120_000,
    retirosCentavos: 40_000,
    gastosCentavos: 9_000,
    observaciones: "Cierre cuadrado.",
    diferenciaSeedCentavos: 0,
    pedidos: [
      { id: "p-9020", codigo: "P-9020", estado: "pagado", modalidad: "Mesa 01", totalCentavos: 44_000, propinaCentavos: 4_000, descuentosCentavos: 0, medioPagoId: "m-efectivo-norte", pagoEstado: "aprobado", haceMin: 0 },
      { id: "p-9021", codigo: "P-9021", estado: "pagado", modalidad: "Mostrador", totalCentavos: 29_500, propinaCentavos: 0, descuentosCentavos: 0, medioPagoId: "m-tarjeta-norte", pagoEstado: "aprobado", haceMin: 0 },
    ],
  },
  {
    id: "tn-norte-89",
    sucursalId: "norte",
    numero: "T-089",
    estado: "abierto",
    abiertoEn: isoHaceDias(0, "09:05"),
    cerradoEn: null,
    usuarioApertura: "Ana Morales",
    usuarioCierre: null,
    baseInicialCentavos: 120_000,
    retirosCentavos: 0,
    gastosCentavos: 0,
    observaciones: "",
    diferenciaSeedCentavos: null,
    pedidos: [
      { id: "p-9022", codigo: "P-9022", estado: "pagado", modalidad: "Mesa 02", totalCentavos: 31_000, propinaCentavos: 3_000, descuentosCentavos: 0, medioPagoId: "m-efectivo-norte", pagoEstado: "aprobado", haceMin: 40 },
      { id: "p-9023", codigo: "P-9023", estado: "listo", modalidad: "Para recoger", totalCentavos: 18_500, propinaCentavos: 0, descuentosCentavos: 0, medioPagoId: null, pagoEstado: null, haceMin: 11 },
    ],
  },
]

/** Arqueos registrados durante la sesión (los sembrados se derivan del cierre). */
const ARQUEOS = new Map<string, Arqueo>()

type RastroTurno = {
  reabiertoPor: string | null
  reabiertoEn: string | null
  reabiertoMotivo: string | null
  motivoForzado: string | null
}

const RASTROS = new Map<string, RastroTurno>()

const EVENTOS = new Map<string, TurnoDetalle["auditoria"]>()

function eventosDe(turno: TurnoSeed): TurnoDetalle["auditoria"] {
  const existentes = EVENTOS.get(turno.id)
  if (existentes) return existentes
  const base: TurnoDetalle["auditoria"] = [
    {
      id: `${turno.id}-e1`,
      accion: "abierto",
      actor: turno.usuarioApertura,
      ocurridoEn: turno.abiertoEn,
      detalle: `Base inicial ${(turno.baseInicialCentavos / 100).toFixed(2)} MXN.`,
    },
  ]
  if (turno.cerradoEn) {
    base.push({
      id: `${turno.id}-e2`,
      accion: "cerrado",
      actor: turno.usuarioCierre ?? USUARIO_ACTUAL,
      ocurridoEn: turno.cerradoEn,
      detalle: turno.observaciones || undefined,
    })
  }
  EVENTOS.set(turno.id, base)
  return base
}

function rastroDe(turnoId: string): RastroTurno {
  let rastro = RASTROS.get(turnoId)
  if (!rastro) {
    rastro = { reabiertoPor: null, reabiertoEn: null, reabiertoMotivo: null, motivoForzado: null }
    RASTROS.set(turnoId, rastro)
  }
  return rastro
}

function buscarTurno(id: string): TurnoSeed {
  const turno = TURNOS.find((item) => item.id === id)
  if (!turno) throw new ApiError(404, "El turno no existe o fue movido.", "turno_no_encontrado")
  return turno
}

function pagosAprobados(turno: TurnoSeed): PedidoSeed[] {
  return turno.pedidos.filter((pedido) => pedido.pagoEstado === "aprobado")
}

function esPendiente(pedido: PedidoSeed): boolean {
  return pedido.pagoEstado !== "aprobado" && pedido.estado !== "cancelado"
}

function totalesTurno(turno: TurnoSeed) {
  const aprobados = pagosAprobados(turno)
  const ventasCentavos = aprobados.reduce((total, pedido) => total + pedido.totalCentavos, 0)
  const propinasCentavos = aprobados.reduce((total, pedido) => total + pedido.propinaCentavos, 0)
  const descuentosCentavos = turno.pedidos.reduce((total, pedido) => total + pedido.descuentosCentavos, 0)
  const esperadoCentavos =
    turno.baseInicialCentavos + ventasCentavos + propinasCentavos - turno.retirosCentavos - turno.gastosCentavos
  return { ventasCentavos, propinasCentavos, descuentosCentavos, esperadoCentavos }
}

function esperadoPorMedio(turno: TurnoSeed): EsperadoMedio[] {
  const aprobados = pagosAprobados(turno)
  const arqueo = arqueoDe(turno)
  const porMedio = new Map<string, EsperadoMedio>()

  const agregar = (medio: MedioPago): EsperadoMedio => {
    let fila = porMedio.get(medio.id)
    if (!fila) {
      fila = {
        medioPagoId: medio.id,
        nombre: medio.nombre,
        tipo: medio.tipo,
        activo: medio.activo,
        requiereReferencia: medio.requiereReferencia,
        ventasCentavos: 0,
        propinasCentavos: 0,
        esperadoCentavos: 0,
        contadoCentavos: null,
        diferenciaCentavos: null,
      }
      porMedio.set(medio.id, fila)
    }
    return fila
  }

  for (const medio of mediosDeSede(turno.sucursalId)) agregar(medio)
  for (const pedido of aprobados) {
    if (!pedido.medioPagoId) continue
    const medio = MEDIOS.find((item) => item.id === pedido.medioPagoId)
    if (!medio) continue
    const fila = agregar(medio)
    fila.ventasCentavos += pedido.totalCentavos
    fila.propinasCentavos += pedido.propinaCentavos
  }

  for (const fila of porMedio.values()) {
    const ajusteEfectivo =
      fila.tipo === "efectivo" ? turno.baseInicialCentavos - turno.retirosCentavos - turno.gastosCentavos : 0
    fila.esperadoCentavos = fila.ventasCentavos + fila.propinasCentavos + ajusteEfectivo
    const contado = arqueo?.contadoPorMedio.find((item) => item.medioPagoId === fila.medioPagoId)?.contadoCentavos ?? null
    fila.contadoCentavos = contado
    fila.diferenciaCentavos = contado === null ? null : contado - fila.esperadoCentavos
  }

  // Un medio deshabilitado no se ofrece (CA-11-04): si no tuvo movimiento en el
  // turno ni se contó, no aparece; si tuvo pagos históricos, sigue visible.
  return [...porMedio.values()].filter(
    (fila) =>
      fila.activo || fila.ventasCentavos > 0 || fila.propinasCentavos > 0 || fila.contadoCentavos !== null,
  )
}

/** Deriva el arqueo de un turno cerrado a partir de la diferencia sembrada. */
function arqueoDe(turno: TurnoSeed): Arqueo | null {
  const registrado = ARQUEOS.get(turno.id)
  if (registrado) return registrado
  if (turno.estado === "abierto" || turno.diferenciaSeedCentavos === null) return null

  const { esperadoCentavos } = totalesTurno(turno)
  const efectivo = mediosDeSede(turno.sucursalId).find((medio) => medio.tipo === "efectivo")
  const contadoTotal = esperadoCentavos + turno.diferenciaSeedCentavos
  const contadoPorMedio = efectivo
    ? [{ medioPagoId: efectivo.id, contadoCentavos: contadoTotal }]
    : []
  return {
    baseInicialCentavos: turno.baseInicialCentavos,
    retirosCentavos: turno.retirosCentavos,
    gastosCentavos: turno.gastosCentavos,
    observaciones: turno.observaciones,
    contadoPorMedio,
    contadoCentavos: contadoTotal,
    diferenciaCentavos: turno.diferenciaSeedCentavos,
    registradoEn: turno.cerradoEn ?? new Date().toISOString(),
    registradoPor: turno.usuarioCierre ?? USUARIO_ACTUAL,
  }
}

function aTurnoLite(turno: TurnoSeed): TurnoLite {
  const { ventasCentavos, propinasCentavos, descuentosCentavos, esperadoCentavos } = totalesTurno(turno)
  const arqueo = arqueoDe(turno)
  const pendientes = turno.pedidos.filter(esPendiente).length
  return {
    id: turno.id,
    sucursalId: turno.sucursalId,
    numero: turno.numero,
    estado: turno.estado,
    estadoTone: TURNO_ESTADO_TONE[turno.estado],
    abiertoEn: turno.abiertoEn,
    cerradoEn: turno.cerradoEn,
    usuarioApertura: turno.usuarioApertura,
    usuarioCierre: turno.usuarioCierre,
    baseInicialCentavos: turno.baseInicialCentavos,
    ventasCentavos,
    propinasCentavos,
    descuentosCentavos,
    esperadoCentavos,
    contadoCentavos: arqueo?.contadoCentavos ?? null,
    diferenciaCentavos: arqueo?.diferenciaCentavos ?? null,
    pedidosTotal: turno.pedidos.length,
    pedidosPendientes: pendientes,
    alertaDiferencia: Math.abs(arqueo?.diferenciaCentavos ?? 0) > TOLERANCIA_DIFERENCIA_CENTAVOS,
  }
}

function pedidosDe(turno: TurnoSeed): PedidoTurno[] {
  return [...turno.pedidos]
    .sort((a, b) => a.haceMin - b.haceMin)
    .map((pedido) => ({
      id: pedido.id,
      codigo: pedido.codigo,
      modalidad: pedido.modalidad,
      estado: pedido.estado,
      estadoTone: PEDIDO_ESTADO_TONE[pedido.estado] ?? "gray",
      totalCentavos: pedido.totalCentavos,
      pagadoCentavos: pedido.pagoEstado === "aprobado" ? pedido.totalCentavos + pedido.propinaCentavos : 0,
      propinaCentavos: pedido.propinaCentavos,
      descuentosCentavos: pedido.descuentosCentavos,
      creadoEn: isoHaceMinutos(pedido.haceMin),
      medioNombre: nombreMedio(pedido.medioPagoId),
      pendiente: esPendiente(pedido),
    }))
}

function aDetalle(turno: TurnoSeed): TurnoDetalle {
  const lite = aTurnoLite(turno)
  const arqueo = arqueoDe(turno)
  const rastro = rastroDe(turno.id)
  const pedidos = pedidosDe(turno)
  const abierto = TURNOS.find((item) => item.sucursalId === turno.sucursalId && item.estado === "abierto")

  return {
    ...lite,
    sucursalNombre: SEDES[turno.sucursalId].nombre,
    zonaHoraria: SEDES[turno.sucursalId].zonaHoraria,
    moneda: SEDES[turno.sucursalId].moneda,
    turnoAbiertoId: abierto && abierto.id !== turno.id ? abierto.id : null,
    cierre: arqueo
      ? {
          baseInicialCentavos: arqueo.baseInicialCentavos,
          ventasEfectivoCentavos: esperadoPorMedio(turno)
            .filter((medio) => medio.tipo === "efectivo")
            .reduce((total, medio) => total + medio.ventasCentavos + medio.propinasCentavos, 0),
          ventasOtrosCentavos: esperadoPorMedio(turno)
            .filter((medio) => medio.tipo !== "efectivo")
            .reduce((total, medio) => total + medio.ventasCentavos + medio.propinasCentavos, 0),
          propinasCentavos: lite.propinasCentavos,
          retirosCentavos: arqueo.retirosCentavos,
          gastosCentavos: arqueo.gastosCentavos,
          contadoCentavos: arqueo.contadoCentavos,
          esperadoCentavos: lite.esperadoCentavos,
          diferenciaCentavos: arqueo.diferenciaCentavos,
          observaciones: arqueo.observaciones,
          cerradoEn: turno.cerradoEn ?? arqueo.registradoEn,
          cerradoPor: turno.usuarioCierre ?? arqueo.registradoPor,
          motivoForzado: rastro.motivoForzado,
        }
      : null,
    arqueo,
    medios: esperadoPorMedio(turno),
    pedidos,
    pendientes: pedidos.filter((pedido) => pedido.pendiente),
    reabiertoPor: rastro.reabiertoPor,
    reabiertoEn: rastro.reabiertoEn,
    reabiertoMotivo: rastro.reabiertoMotivo,
    auditoria: eventosDe(turno),
  }
}

function agregarEvento(turno: TurnoSeed, evento: Omit<TurnoDetalle["auditoria"][number], "id">): void {
  const eventos = eventosDe(turno)
  eventos.push({ ...evento, id: `${turno.id}-e${eventos.length + 1}` })
}

/* -------------------------------------------------------------------------- */
/* Mocks registrados                                                           */
/* -------------------------------------------------------------------------- */

registerMock("GET", /^\/admin\/caja\/turnos$/, (ctx) => {
  const q = ctx.query
  const page = Math.max(1, Number(q.page ?? 1))
  const pageSize = Math.max(1, Number(q.pageSize ?? 10))
  const sucursalId = typeof q.sucursal === "string" ? q.sucursal : null

  let items = TURNOS.map(aTurnoLite)
  if (sucursalId) items = items.filter((turno) => turno.sucursalId === sucursalId)
  if (q.estado) items = items.filter((turno) => turno.estado === q.estado)
  if (q.desde) items = items.filter((turno) => fechaLocal(turno.abiertoEn) >= String(q.desde))
  if (q.hasta) items = items.filter((turno) => fechaLocal(turno.abiertoEn) <= String(q.hasta))

  items = [...items].sort((a, b) =>
    q.orden === "abierto_en_asc" ? a.abiertoEn.localeCompare(b.abiertoEn) : b.abiertoEn.localeCompare(a.abiertoEn),
  )

  const turnoAbierto =
    (sucursalId
      ? TURNOS.find((turno) => turno.sucursalId === sucursalId && turno.estado === "abierto")
      : TURNOS.find((turno) => turno.estado === "abierto")) ?? null

  const respuesta: TurnosResp = {
    data: items.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize),
    total: items.length,
    page,
    pageSize,
    turnoAbierto: turnoAbierto ? aTurnoLite(turnoAbierto) : null,
  }
  return respuesta
})

registerMock("POST", /^\/admin\/caja\/turnos$/, (ctx) => {
  const body = (ctx.body ?? {}) as { sucursalId?: string; baseInicialCentavos?: number; observaciones?: string }
  const sucursalId =
    body.sucursalId ?? (typeof ctx.query.sucursal === "string" ? ctx.query.sucursal : "centro")
  if (!SEDES[sucursalId]) throw new ApiError(422, "La sede indicada no existe.", "sede_invalida")

  const abierto = TURNOS.find((turno) => turno.sucursalId === sucursalId && turno.estado === "abierto")
  if (abierto) {
    throw new ApiError(
      409,
      `Ya hay un turno abierto en la sede (${abierto.numero}). Ciérralo o reábrelo antes de abrir otro.`,
      "turno_ya_abierto",
    )
  }

  const base = Math.max(0, Math.round(Number(body.baseInicialCentavos ?? 0)))
  const numero = String(100 + TURNOS.filter((turno) => turno.sucursalId === sucursalId).length + 1)
  const turno: TurnoSeed = {
    id: `tn-${sucursalId}-${Date.now()}`,
    sucursalId,
    numero: `T-${numero}`,
    estado: "abierto",
    abiertoEn: new Date().toISOString(),
    cerradoEn: null,
    usuarioApertura: USUARIO_ACTUAL,
    usuarioCierre: null,
    baseInicialCentavos: base,
    retirosCentavos: 0,
    gastosCentavos: 0,
    observaciones: body.observaciones?.trim() ?? "",
    diferenciaSeedCentavos: null,
    pedidos: [],
  }
  TURNOS.push(turno)
  agregarEvento(turno, {
    accion: "abierto",
    actor: USUARIO_ACTUAL,
    ocurridoEn: turno.abiertoEn,
    detalle: `Base inicial ${(base / 100).toFixed(2)} MXN.${body.observaciones ? ` ${body.observaciones}` : ""}`,
  })
  return aDetalle(turno)
})

registerMock("GET", /^\/admin\/caja\/consolidado-dia$/, (ctx) => {
  const fecha = typeof ctx.query.fecha === "string" && ctx.query.fecha ? ctx.query.fecha : hoyISO()
  const sucursalId = typeof ctx.query.sucursal === "string" && ctx.query.sucursal ? ctx.query.sucursal : "centro"

  const turnos = TURNOS.filter((turno) => {
    if (turno.sucursalId !== sucursalId) return false
    if (fechaLocal(turno.abiertoEn) === fecha) return true
    // Turnos que cruzan medianoche: el cierre cae en la fecha consultada.
    return turno.cerradoEn !== null && fechaLocal(turno.abiertoEn) < fecha && fechaLocal(turno.cerradoEn) >= fecha
  })

  const medios = new Map<string, ConsolidadoDia["medios"][number]>()
  const totales: ConsolidadoDia["totales"] = {
    ventasCentavos: 0,
    propinasCentavos: 0,
    descuentosCentavos: 0,
    contadoCentavos: 0,
    diferenciaCentavos: 0,
    pedidosTotal: 0,
    pedidosPendientes: 0,
  }

  for (const turno of turnos) {
    const lite = aTurnoLite(turno)
    totales.ventasCentavos += lite.ventasCentavos
    totales.propinasCentavos += lite.propinasCentavos
    totales.descuentosCentavos += lite.descuentosCentavos
    totales.contadoCentavos += lite.contadoCentavos ?? 0
    totales.diferenciaCentavos += lite.diferenciaCentavos ?? 0
    totales.pedidosTotal += lite.pedidosTotal
    totales.pedidosPendientes += lite.pedidosPendientes

    for (const medio of esperadoPorMedio(turno)) {
      let fila = medios.get(medio.medioPagoId)
      if (!fila) {
        fila = {
          medioPagoId: medio.medioPagoId,
          nombre: medio.nombre,
          tipo: medio.tipo,
          ventasCentavos: 0,
          propinasCentavos: 0,
          contadoCentavos: 0,
          diferenciaCentavos: 0,
        }
        medios.set(medio.medioPagoId, fila)
      }
      fila.ventasCentavos += medio.ventasCentavos
      fila.propinasCentavos += medio.propinasCentavos
      fila.contadoCentavos = (fila.contadoCentavos ?? 0) + (medio.contadoCentavos ?? 0)
      fila.diferenciaCentavos = (fila.diferenciaCentavos ?? 0) + (medio.diferenciaCentavos ?? 0)
    }
  }

  const respuesta: ConsolidadoDia = {
    fecha,
    sucursalId,
    sucursalNombre: SEDES[sucursalId]?.nombre ?? sucursalId,
    moneda: SEDES[sucursalId]?.moneda ?? "MXN",
    zonaHoraria: SEDES[sucursalId]?.zonaHoraria ?? "America/Mexico_City",
    turnos: turnos.map(aTurnoLite).sort((a, b) => b.abiertoEn.localeCompare(a.abiertoEn)),
    medios: [...medios.values()].filter((medio) => medio.ventasCentavos > 0 || medio.propinasCentavos > 0),
    totales,
  }
  return respuesta
})

registerMock("GET", /^\/admin\/caja\/medios-pago$/, (ctx) => {
  const sucursalId = typeof ctx.query.sucursal === "string" && ctx.query.sucursal ? ctx.query.sucursal : "centro"
  const items = mediosDeSede(sucursalId)
  const respuesta: MediosPagoResp = { data: items, total: items.length, page: 1, pageSize: 50 }
  return respuesta
})

registerMock("POST", /^\/admin\/caja\/medios-pago$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<MedioPago>
  const sucursalId = body.sucursalId ?? (typeof ctx.query.sucursal === "string" ? ctx.query.sucursal : "centro")
  const nombre = body.nombre?.trim()
  if (!nombre || nombre.length < 3) {
    throw new ApiError(422, "El nombre del medio de pago es obligatorio.", "nombre_requerido")
  }
  const duplicado = MEDIOS.some(
    (medio) => medio.sucursalId === sucursalId && medio.nombre.toLowerCase() === nombre.toLowerCase(),
  )
  if (duplicado) {
    throw new ApiError(409, "Ya existe un medio de pago con ese nombre en la sede.", "medio_duplicado")
  }
  const medio: MedioPago = {
    id: `m-${sucursalId}-${Date.now()}`,
    sucursalId,
    nombre,
    tipo: (body.tipo as MedioPagoTipo) ?? "otro",
    requiereReferencia: body.requiereReferencia ?? false,
    activo: body.activo ?? true,
  }
  MEDIOS.push(medio)
  return medio
})

registerMock("GET", /^\/admin\/caja\/medios-pago\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const medio = MEDIOS.find((item) => item.id === id)
  if (!medio) throw new ApiError(404, "El medio de pago no existe.", "medio_no_encontrado")
  return medio
})

registerMock("PUT", /^\/admin\/caja\/medios-pago\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const medio = MEDIOS.find((item) => item.id === id)
  if (!medio) throw new ApiError(404, "El medio de pago no existe.", "medio_no_encontrado")
  const body = (ctx.body ?? {}) as Partial<MedioPago>
  if (body.nombre !== undefined) {
    const nombre = body.nombre.trim()
    if (nombre.length < 3) throw new ApiError(422, "El nombre del medio es obligatorio.", "nombre_requerido")
    const duplicado = MEDIOS.some(
      (item) =>
        item.id !== medio.id &&
        item.sucursalId === medio.sucursalId &&
        item.nombre.toLowerCase() === nombre.toLowerCase(),
    )
    if (duplicado) throw new ApiError(409, "Ya existe un medio con ese nombre.", "medio_duplicado")
    medio.nombre = nombre
  }
  if (body.tipo !== undefined) medio.tipo = body.tipo
  if (body.requiereReferencia !== undefined) medio.requiereReferencia = body.requiereReferencia
  if (body.activo !== undefined) medio.activo = body.activo
  return medio
})

registerMock("POST", /^\/admin\/caja\/turnos\/([^/]+)\/arqueo$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const turno = buscarTurno(id)
  if (turno.estado !== "abierto") {
    throw new ApiError(
      409,
      "El turno está cerrado. Para modificar el arqueo primero hay que reabrirlo con motivo.",
      "turno_cerrado",
    )
  }
  const body = (ctx.body ?? {}) as Partial<ArqueoPayload>
  const baseInicialCentavos = Math.max(0, Math.round(Number(body.baseInicialCentavos ?? turno.baseInicialCentavos)))
  const retirosCentavos = Math.max(0, Math.round(Number(body.retirosCentavos ?? 0)))
  const gastosCentavos = Math.max(0, Math.round(Number(body.gastosCentavos ?? 0)))
  const observaciones = body.observaciones?.trim() ?? ""
  const contadoPorMedio = (body.contadoPorMedio ?? []).map((fila) => ({
    medioPagoId: fila.medioPagoId,
    contadoCentavos: fila.contadoCentavos === null ? null : Math.max(0, Math.round(Number(fila.contadoCentavos))),
  }))

  const esperado = esperadoPorMedio(turno)
  const efectivo = esperado.find((medio) => medio.tipo === "efectivo")
  if (efectivo) {
    const contadoEfectivo = contadoPorMedio.find((fila) => fila.medioPagoId === efectivo.medioPagoId)
    if (!contadoEfectivo || contadoEfectivo.contadoCentavos === null) {
      throw new ApiError(422, "El contado en efectivo es obligatorio para arquear.", "contado_efectivo_requerido")
    }
  }

  turno.baseInicialCentavos = baseInicialCentavos
  turno.retirosCentavos = retirosCentavos
  turno.gastosCentavos = gastosCentavos
  turno.observaciones = observaciones

  const esperadoActualizado = esperadoPorMedio(turno)
  const contadoCentavos = contadoPorMedio.reduce((total, fila) => total + (fila.contadoCentavos ?? 0), 0)
  const esperadoCentavos = esperadoActualizado.reduce((total, medio) => total + medio.esperadoCentavos, 0)
  const diferenciaCentavos = contadoCentavos - esperadoCentavos

  if (diferenciaCentavos !== 0 && observaciones.length < 3) {
    throw new ApiError(
      422,
      `La diferencia es de ${(diferenciaCentavos / 100).toFixed(2)} MXN; explica el motivo en observaciones.`,
      "observaciones_requeridas",
    )
  }

  const arqueo: Arqueo = {
    baseInicialCentavos,
    retirosCentavos,
    gastosCentavos,
    observaciones,
    contadoPorMedio,
    contadoCentavos,
    diferenciaCentavos,
    registradoEn: new Date().toISOString(),
    registradoPor: USUARIO_ACTUAL,
  }
  ARQUEOS.set(turno.id, arqueo)
  agregarEvento(turno, {
    accion: "arqueo",
    actor: USUARIO_ACTUAL,
    ocurridoEn: arqueo.registradoEn,
    detalle: `Contado ${(contadoCentavos / 100).toFixed(2)} MXN · diferencia ${(diferenciaCentavos / 100).toFixed(2)} MXN.`,
  })
  return aDetalle(turno)
})

registerMock("POST", /^\/admin\/caja\/turnos\/([^/]+)\/cerrar$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const turno = buscarTurno(id)
  if (turno.estado !== "abierto") {
    throw new ApiError(409, "El turno ya está cerrado.", "turno_ya_cerrado")
  }
  const arqueo = ARQUEOS.get(turno.id)
  if (!arqueo) {
    throw new ApiError(409, "Registra el arqueo antes de cerrar el turno.", "arqueo_requerido")
  }

  const body = (ctx.body ?? {}) as CerrarTurnoPayload
  const pendientes = turno.pedidos.filter(esPendiente)
  const motivo = body.motivo?.trim() ?? ""

  if (pendientes.length > 0 && body.confirmarPendientes !== true) {
    const detalle = pendientes.map((pedido) => `${pedido.codigo} (${pedido.estado})`).join(", ")
    throw new ApiError(
      409,
      `No se puede cerrar: hay ${pendientes.length} pedidos pendientes del turno: ${detalle}. Resuélvelos o confirma el cierre forzado con motivo.`,
      "pedidos_abiertos",
    )
  }
  if (pendientes.length > 0 && motivo.length < 3) {
    throw new ApiError(422, "El cierre con pedidos pendientes exige un motivo.", "motivo_requerido")
  }

  turno.estado = "cerrado"
  turno.cerradoEn = new Date().toISOString()
  turno.usuarioCierre = USUARIO_ACTUAL
  if (pendientes.length > 0) rastroDe(turno.id).motivoForzado = motivo
  agregarEvento(turno, {
    accion: pendientes.length > 0 ? "forzado" : "cerrado",
    actor: USUARIO_ACTUAL,
    ocurridoEn: turno.cerradoEn,
    motivo: motivo || undefined,
    detalle:
      pendientes.length > 0
        ? `Cierre forzado con ${pendientes.length} pedidos pendientes.`
        : `Diferencia ${(arqueo.diferenciaCentavos / 100).toFixed(2)} MXN.`,
  })
  return aDetalle(turno)
})

registerMock("POST", /^\/admin\/caja\/turnos\/([^/]+)\/reabrir$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const turno = buscarTurno(id)
  if (turno.estado !== "cerrado") {
    throw new ApiError(409, "Solo se puede reabrir un turno cerrado.", "turno_no_cerrado")
  }
  const abierto = TURNOS.find((item) => item.sucursalId === turno.sucursalId && item.estado === "abierto")
  if (abierto) {
    throw new ApiError(
      409,
      `No se puede reabrir ${turno.numero}: la sede tiene el turno ${abierto.numero} abierto. Ciérralo primero.`,
      "turno_abierto_en_sede",
    )
  }
  const body = (ctx.body ?? {}) as ReabrirTurnoPayload
  const motivo = body.motivo?.trim() ?? ""
  if (motivo.length < 3) {
    throw new ApiError(422, "La reapertura exige un motivo.", "motivo_requerido")
  }

  // El cierre vigente se conserva como rastro (RN-R5-12): se materializa antes
  // de reabrir para que el recálculo posterior no lo pierda.
  const arqueoPrevio = arqueoDe(turno)
  if (arqueoPrevio) ARQUEOS.set(turno.id, arqueoPrevio)

  const rastro = rastroDe(turno.id)
  rastro.reabiertoPor = USUARIO_ACTUAL
  rastro.reabiertoEn = new Date().toISOString()
  rastro.reabiertoMotivo = motivo
  turno.estado = "abierto"
  turno.cerradoEn = null
  turno.usuarioCierre = null
  agregarEvento(turno, {
    accion: "reaperturado",
    actor: USUARIO_ACTUAL,
    ocurridoEn: rastro.reabiertoEn,
    motivo,
    detalle: "El cierre anterior se conserva como rastro y se habilita su recálculo.",
  })
  return aDetalle(turno)
})

registerMock("GET", /^\/admin\/caja\/turnos\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  return aDetalle(buscarTurno(id))
})

registerMock("POST", /^\/admin\/exportaciones$/, (ctx) => {
  const body = (ctx.body ?? {}) as { tipo?: string; formato?: ExportacionResp["formato"] }
  const exportacion: ExportacionResp = {
    ok: true,
    id: `exp-${Date.now()}`,
    exportacionId: `exp-${Date.now()}`,
    tipo: body.tipo ?? "caja_turno",
    formato: body.formato ?? "csv",
    estado: "en_proceso",
    creadoEn: new Date().toISOString(),
  }
  return exportacion
})

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function useTurnos(filtros: TurnoFiltros) {
  return useQuery({
    queryKey: ["caja", "turnos", filtros],
    queryFn: () => api.get<TurnosResp>("/admin/caja/turnos", filtros as unknown as Query),
    placeholderData: keepPreviousData,
  })
}

export function useTurnoDetalle(id: string | null) {
  return useQuery({
    queryKey: ["caja", "turno", id],
    queryFn: () => api.get<TurnoDetalle>(`/admin/caja/turnos/${id}`),
    enabled: Boolean(id),
    refetchInterval: 20_000,
  })
}

export function useConsolidadoDia(fecha: string) {
  return useQuery({
    queryKey: ["caja", "consolidado", fecha],
    queryFn: () => api.get<ConsolidadoDia>("/admin/caja/consolidado-dia", { fecha }),
  })
}

export function useMediosPago() {
  return useQuery({
    queryKey: ["caja", "medios"],
    queryFn: () => api.get<MediosPagoResp>("/admin/caja/medios-pago"),
  })
}

export function useAbrirTurno() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { baseInicialCentavos: number; observaciones?: string }) =>
      api.post<TurnoDetalle>("/admin/caja/turnos", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["caja"] })
    },
  })
}

export function useGuardarArqueo(turnoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ArqueoPayload) =>
      api.post<TurnoDetalle>(`/admin/caja/turnos/${turnoId}/arqueo`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["caja"] })
    },
  })
}

export function useCerrarTurno(turnoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CerrarTurnoPayload) =>
      api.post<TurnoDetalle>(`/admin/caja/turnos/${turnoId}/cerrar`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["caja"] })
    },
  })
}

export function useReabrirTurno(turnoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ReabrirTurnoPayload) =>
      api.post<TurnoDetalle>(`/admin/caja/turnos/${turnoId}/reabrir`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["caja"] })
    },
  })
}

export function useGuardarMedioPago() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<MedioPago> & { nombre: string }) =>
      payload.id
        ? api.put<MedioPago>(`/admin/caja/medios-pago/${payload.id}`, payload)
        : api.post<MedioPago>("/admin/caja/medios-pago", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["caja", "medios"] })
    },
  })
}

export function useExportarCaja() {
  return useMutation({
    mutationFn: (payload: { tipo: string; formato: ExportacionResp["formato"]; filtros?: Record<string, unknown> }) =>
      api.post<ExportacionResp>("/admin/exportaciones", payload),
  })
}

export { MEDIO_PAGO_TIPO_LABEL }
