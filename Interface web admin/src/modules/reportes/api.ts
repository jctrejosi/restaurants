import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError, registerMock, type Query } from "@/lib/api"
import type {
  Agrupacion,
  CanalReporte,
  ComparativoResp,
  CrearProgramadoPayload,
  DesempenoResp,
  DimensionDesempeno,
  ExportacionPayload,
  ExportacionResp,
  FilaDesglose,
  FilaImpuesto,
  FilaProducto,
  ImpuestosResp,
  MetricaComparada,
  ModalidadReporte,
  PeriodoReporte,
  ProgramadosResp,
  ReporteFiltros,
  ReporteProgramado,
  ReservasResp,
  VentasResp,
} from "@/modules/reportes/types"

/* -------------------------------------------------------------------------- */
/* Utilidades deterministas del mock                                            */
/* -------------------------------------------------------------------------- */

function hash(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

/** Valor determinista [min, max] a partir de una clave. */
function pseudo(clave: string, min: number, max: number): number {
  return min + hash(clave) * (max - min)
}

function haceSegundos(segundos: number): string {
  return new Date(Date.now() - segundos * 1000).toISOString()
}

/** Sello de frescura del job E9: siempre dentro del minuto (RNF-R5-02). */
function actualizadoAhora(clave: string): string {
  return haceSegundos(Math.round(pseudo(clave, 12, 52)))
}

function aFechaISO(fecha: Date): string {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, "0")
  const d = String(fecha.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function parseISO(fecha: string): Date {
  const [y, m, d] = fecha.split("-").map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

function etiquetaDia(fecha: Date): string {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(fecha)
}

function etiquetaRango(desde: Date, hasta: Date): string {
  return `${etiquetaDia(desde)} – ${etiquetaDia(hasta)} ${hasta.getFullYear()}`
}

type Rango = { desde: Date; hasta: Date; etiqueta: string; dias: number }

function resolverRango(periodo: PeriodoReporte, desdeISO?: string, hastaISO?: string): Rango {
  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  let desde = inicioHoy
  let hasta = inicioHoy
  if (periodo === "ayer") {
    desde = new Date(inicioHoy)
    desde.setDate(desde.getDate() - 1)
    hasta = desde
  } else if (periodo === "semana") {
    desde = new Date(inicioHoy)
    desde.setDate(desde.getDate() - 6)
  } else if (periodo === "mes") {
    desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  } else if (periodo === "rango" && desdeISO && hastaISO) {
    desde = parseISO(desdeISO)
    hasta = parseISO(hastaISO)
    if (desde > hasta) [desde, hasta] = [hasta, desde]
  }
  const dias = Math.max(1, Math.round((hasta.getTime() - desde.getTime()) / 86_400_000) + 1)
  return { desde, hasta, etiqueta: etiquetaRango(desde, hasta), dias }
}

function diasDelRango(rango: Rango): Date[] {
  const dias: Date[] = []
  for (let i = 0; i < rango.dias; i += 1) {
    const dia = new Date(rango.desde)
    dia.setDate(dia.getDate() + i)
    dias.push(dia)
  }
  return dias
}

/* -------------------------------------------------------------------------- */
/* Catálogos de referencia                                                     */
/* -------------------------------------------------------------------------- */

export const SEDES_REPORTE = [
  { id: "centro", nombre: "Punto C · Centro", baseDiaCentavos: 9_500_000 },
  { id: "norte", nombre: "Punto C · Norte", baseDiaCentavos: 6_150_000 },
]

export const CATEGORIAS_REPORTE = [
  { id: "entradas", nombre: "Entradas", peso: 0.12 },
  { id: "fuertes", nombre: "Platos fuertes", peso: 0.37 },
  { id: "bebidas", nombre: "Bebidas", peso: 0.19 },
  { id: "postres", nombre: "Postres", peso: 0.09 },
  { id: "barra", nombre: "Barra", peso: 0.15 },
  { id: "extras", nombre: "Extras", peso: 0.08 },
]

export const MESEROS_REPORTE = [
  "Ana Ruiz",
  "Luis Paredes",
  "Jorge Solís",
  "Karla Méndez",
  "Iván Torres",
]

export const CAJEROS_REPORTE = ["Paola Ríos", "Diego Cano"]

export const ESTACIONES_REPORTE = [
  { id: "parrilla", nombre: "Parrilla" },
  { id: "barra-fria", nombre: "Barra fría" },
  { id: "postres", nombre: "Postres" },
  { id: "barra", nombre: "Barra de bebidas" },
]

const CANAL_PESO: Record<CanalReporte, number> = {
  salon: 0.3,
  mesero: 0.17,
  web: 0.13,
  app: 0.17,
  qr: 0.09,
  telefono: 0.14,
}

const MODALIDAD_PESO: Record<ModalidadReporte, number> = {
  mesa: 0.58,
  recoger: 0.17,
  domicilio: 0.25,
}

export const PRODUCTOS_REPORTE: {
  id: string
  nombre: string
  categoriaId: string
  peso: number
}[] = [
  { id: "p-arrachera", nombre: "Tacos de arrachera", categoriaId: "fuertes", peso: 0.11 },
  { id: "p-milanesa", nombre: "Milanesa de res", categoriaId: "fuertes", peso: 0.09 },
  { id: "p-pasta", nombre: "Pasta al pesto", categoriaId: "fuertes", peso: 0.07 },
  { id: "p-ensalada", nombre: "Ensalada de la casa", categoriaId: "entradas", peso: 0.05 },
  { id: "p-queso", nombre: "Queso fundido", categoriaId: "entradas", peso: 0.05 },
  { id: "p-limonada", nombre: "Limonada de la casa", categoriaId: "bebidas", peso: 0.08 },
  { id: "p-cafe", nombre: "Café de olla", categoriaId: "bebidas", peso: 0.05 },
  { id: "p-cheesecake", nombre: "Cheesecake de guayaba", categoriaId: "postres", peso: 0.05 },
  { id: "p-brownie", nombre: "Brownie con helado", categoriaId: "postres", peso: 0.04 },
  { id: "p-margarita", nombre: "Margarita clásica", categoriaId: "barra", peso: 0.09 },
  { id: "p-vino", nombre: "Copa de vino tinto", categoriaId: "barra", peso: 0.06 },
  { id: "p-papas", nombre: "Papas a la francesa", categoriaId: "extras", peso: 0.05 },
  { id: "p-guacamole", nombre: "Guacamole", categoriaId: "extras", peso: 0.04 },
]

const FACtoresDia = [0.86, 0.74, 0.78, 0.84, 0.94, 1.24, 1.34] // dom..sáb

function totalDia(sedeId: string, baseDiaCentavos: number, dia: Date): number {
  const fecha = aFechaISO(dia)
  const factor = FACtoresDia[dia.getDay()] ?? 1
  const jitter = pseudo(`${sedeId}-${fecha}-ventas`, 0.9, 1.1)
  return Math.round(baseDiaCentavos * factor * jitter)
}

function distribuir(
  total: number,
  pesos: { clave: string; etiqueta: string; peso: number }[],
  filtro: string,
): FilaDesglose[] {
  const seleccionados = filtro ? pesos.filter((item) => item.clave === filtro) : pesos
  const suma = seleccionados.reduce((acumulado, item) => acumulado + item.peso, 0)
  return seleccionados.map((item) => {
    const importe = Math.round((total * item.peso) / suma)
    const subtotal = Math.round(importe / 1.16)
    return {
      clave: item.clave,
      etiqueta: item.etiqueta,
      pedidos: Math.max(1, Math.round(importe / 2_750)),
      subtotalCentavos: subtotal,
      descuentosCentavos: Math.round(subtotal * pseudo(`desc-${item.clave}-${filtro}`, 0.02, 0.06)),
      impuestosCentavos: importe - subtotal,
      propinaCentavos: Math.round(importe * pseudo(`prop-${item.clave}`, 0.04, 0.08)),
      totalCentavos: importe,
      participacion: total > 0 ? importe / total : 0,
    }
  })
}

function agruparSerie(dias: Date[], totalPorDia: (dia: Date) => number, agrupacion: Agrupacion): VentasResp["serie"] {
  const cubos = new Map<string, { etiqueta: string; desde: string; totalCentavos: number; dias: number }>()
  dias.forEach((dia) => {
    let clave = aFechaISO(dia)
    let etiqueta = etiquetaDia(dia)
    if (agrupacion === "mes") {
      clave = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}`
      etiqueta = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(dia)
    } else if (agrupacion === "semana") {
      const inicioSemana = new Date(dia)
      inicioSemana.setDate(inicioSemana.getDate() - ((dia.getDay() + 6) % 7))
      clave = aFechaISO(inicioSemana)
      etiqueta = `Semana ${etiquetaDia(inicioSemana)}`
    }
    const actual = cubos.get(clave) ?? { etiqueta, desde: aFechaISO(dia), totalCentavos: 0, dias: 0 }
    actual.totalCentavos += totalPorDia(dia)
    actual.dias += 1
    cubos.set(clave, actual)
  })
  return [...cubos.values()].map((cubo) => {
    const pedidos = Math.max(1, Math.round(cubo.totalCentavos / 2_750))
    return {
      etiqueta: cubo.etiqueta,
      desde: cubo.desde,
      totalCentavos: cubo.totalCentavos,
      pedidos,
      ticketCentavos: Math.round(cubo.totalCentavos / pedidos),
    }
  })
}

function filasDesempeno(
  dimension: DimensionDesempeno,
  totalCentavos: number,
  etiquetaPeriodo: string,
): DesempenoResp {
  const grupos =
    dimension === "mesero"
      ? MESEROS_REPORTE.map((nombre, indice) => ({ clave: `mesero-${indice}`, nombre, rol: "Mesero", peso: pseudo(`mes-${nombre}`, 0.1, 0.24) }))
      : dimension === "cajero"
        ? CAJEROS_REPORTE.map((nombre, indice) => ({ clave: `cajero-${indice}`, nombre, rol: "Cajero", peso: pseudo(`caj-${nombre}`, 0.36, 0.62) }))
        : [
            { clave: "turno-matutino", nombre: "Matutino (07–15 h)", rol: "Turno", peso: 0.36 },
            { clave: "turno-vespertino", nombre: "Vespertino (15–23 h)", rol: "Turno", peso: 0.51 },
            { clave: "turno-nocturno", nombre: "Nocturno (23–07 h)", rol: "Turno", peso: 0.13 },
          ]
  const suma = grupos.reduce((acumulado, grupo) => acumulado + grupo.peso, 0)
  const filas = grupos.map((grupo) => {
    const ventas = Math.round((totalCentavos * grupo.peso) / suma)
    const pedidos = Math.max(1, Math.round(ventas / pseudo(`ticket-${grupo.clave}`, 2_400, 3_200)))
    const anulaciones = Math.round(pseudo(`anul-${grupo.clave}-${etiquetaPeriodo}`, 0, 4.99))
    return {
      clave: grupo.clave,
      nombre: grupo.nombre,
      rol: grupo.rol,
      pedidosPagados: pedidos,
      ventasCentavos: ventas,
      ticketCentavos: Math.round(ventas / pedidos),
      propinaCentavos: Math.round(ventas * pseudo(`prop-${grupo.clave}`, 0.04, 0.09)),
      descuentosCentavos: Math.round(ventas * pseudo(`desc-${grupo.clave}`, 0.015, 0.06)),
      anulaciones,
      anuladoCentavos: anulaciones * Math.round(pseudo(`monto-anul-${grupo.clave}`, 8_000, 42_000)),
    }
  })
  const ventasTotales = filas.reduce((acumulado, fila) => acumulado + fila.ventasCentavos, 0)
  const pedidosTotales = filas.reduce((acumulado, fila) => acumulado + fila.pedidosPagados, 0)
  return {
    actualizadoEn: actualizadoAhora(`desempeno-${dimension}`),
    etiquetaPeriodo,
    dimension,
    kpis: {
      ventasCentavos: ventasTotales,
      pedidos: pedidosTotales,
      ticketCentavos: Math.round(ventasTotales / Math.max(1, pedidosTotales)),
      descuentosCentavos: filas.reduce((acumulado, fila) => acumulado + fila.descuentosCentavos, 0),
      anulaciones: filas.reduce((acumulado, fila) => acumulado + fila.anulaciones, 0),
    },
    filas,
  }
}

/* -------------------------------------------------------------------------- */
/* Programados                                                                 */
/* -------------------------------------------------------------------------- */

const PROGRAMADOS: ReporteProgramado[] = [
  {
    id: "prog-ventas-diario",
    nombre: "Ventas del día (cierre)",
    metrica: "ventas",
    periodicidad: "diario",
    formato: "xlsx",
    destinatarios: ["direccion@puntoc.mx", "contabilidad@puntoc.mx"],
    activo: true,
    siguienteEjecucion: haceSegundos(-14 * 3600),
    creadoEn: haceSegundos(140 * 24 * 3600),
    filtros: { periodo: "hoy", agrupacion: "dia" },
    entregas: [
      {
        id: "ent-1",
        enviadoEn: haceSegundos(24 * 3600),
        estado: "entregado",
        destinatarios: ["direccion@puntoc.mx", "contabilidad@puntoc.mx"],
        detalle: "2 destinatarios · archivo de 1,8 MB",
      },
      {
        id: "ent-2",
        enviadoEn: haceSegundos(48 * 3600),
        estado: "entregado",
        destinatarios: ["direccion@puntoc.mx", "contabilidad@puntoc.mx"],
        detalle: "2 destinatarios · archivo de 1,7 MB",
      },
    ],
  },
  {
    id: "prog-reservas-semanal",
    nombre: "Reservas de la semana",
    metrica: "reservas",
    periodicidad: "semanal",
    formato: "pdf",
    destinatarios: ["salon@puntoc.mx"],
    activo: true,
    siguienteEjecucion: haceSegundos(-3 * 24 * 3600),
    creadoEn: haceSegundos(90 * 24 * 3600),
    filtros: { periodo: "semana" },
    entregas: [
      {
        id: "ent-3",
        enviadoEn: haceSegundos(7 * 24 * 3600),
        estado: "entregado",
        destinatarios: ["salon@puntoc.mx"],
        detalle: "1 destinatario · archivo de 640 KB",
      },
    ],
  },
  {
    id: "prog-impuestos-mensual",
    nombre: "Impuestos y propinas para contabilidad",
    metrica: "impuestos",
    periodicidad: "mensual",
    formato: "csv",
    destinatarios: ["contabilidad@puntoc.mx"],
    activo: true,
    siguienteEjecucion: haceSegundos(-12 * 24 * 3600),
    creadoEn: haceSegundos(210 * 24 * 3600),
    filtros: { periodo: "mes" },
    entregas: [
      {
        id: "ent-4",
        enviadoEn: haceSegundos(30 * 24 * 3600),
        estado: "fallido",
        destinatarios: ["contabilidad@puntoc.mx"],
        detalle: "Rebotó: buzón lleno. Se reintentará en la próxima ejecución.",
      },
    ],
  },
  {
    id: "prog-desempeno-quincenal",
    nombre: "Desempeño por mesero",
    metrica: "desempeno",
    periodicidad: "semanal",
    formato: "xlsx",
    destinatarios: ["rh@puntoc.mx", "gerencia@puntoc.mx"],
    activo: false,
    siguienteEjecucion: haceSegundos(-9 * 24 * 3600),
    creadoEn: haceSegundos(60 * 24 * 3600),
    filtros: { periodo: "semana", dimension: "mesero" },
    entregas: [],
  },
]

/* -------------------------------------------------------------------------- */
/* Consultas                                                                   */
/* -------------------------------------------------------------------------- */

function queryVentas(ctx: { query: Query }): {
  filtros: ReporteFiltros
  rango: Rango
  sedeIds: string[]
} {
  const periodo = (q(ctx.query.periodo) || "semana") as PeriodoReporte
  const desde = q(ctx.query.desde) || undefined
  const hasta = q(ctx.query.hasta) || undefined
  const sucursal = q(ctx.query.sucursal)
  const filtros: ReporteFiltros = {
    metrica: "ventas",
    periodo,
    desde,
    hasta,
    agrupacion: (q(ctx.query.agrupacion) || "dia") as Agrupacion,
    canal: (q(ctx.query.canal) || "") as CanalReporte | "",
    modalidad: (q(ctx.query.modalidad) || "") as ModalidadReporte | "",
    categoriaId: q(ctx.query.categoria) || undefined,
    productoId: q(ctx.query.producto) || undefined,
    estacionId: q(ctx.query.estacion) || undefined,
    mesero: q(ctx.query.mesero) || undefined,
    comparar: q(ctx.query.comparar) === "1",
  }
  const rango = resolverRango(periodo, desde, hasta)
  const sedeIds = sucursal ? [sucursal] : SEDES_REPORTE.map((sede) => sede.id)
  return { filtros, rango, sedeIds }
}

function totalVentasPeriodo(rango: Rango, sedeIds: string[]): number {
  return diasDelRango(rango).reduce(
    (acumulado, dia) =>
      acumulado +
      sedeIds.reduce((sumaSede, sedeId) => {
        const sede = SEDES_REPORTE.find((item) => item.id === sedeId)
        return sumaSede + (sede ? totalDia(sede.id, sede.baseDiaCentavos, dia) : 0)
      }, 0),
    0,
  )
}

function periodoAnterior(rango: Rango): Rango {
  const hasta = new Date(rango.desde)
  hasta.setDate(hasta.getDate() - 1)
  const desde = new Date(hasta)
  desde.setDate(desde.getDate() - (rango.dias - 1))
  return { desde, hasta, etiqueta: etiquetaRango(desde, hasta), dias: rango.dias }
}

function q(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

/* -------------------------------------------------------------------------- */
/* Mocks de reportes                                                           */
/* -------------------------------------------------------------------------- */

/** GET /admin/reportes/ventas — agregado de ventas (RF-R5-120). */
registerMock("GET", /^\/admin\/reportes\/ventas$/, (ctx) => {
  const { filtros, rango, sedeIds } = queryVentas(ctx)
  const totalBruto = totalVentasPeriodo(rango, sedeIds)
  const factorCanal = filtros.canal ? CANAL_PESO[filtros.canal] : 1
  const factorModalidad = filtros.modalidad ? MODALIDAD_PESO[filtros.modalidad] : 1
  const categoria = CATEGORIAS_REPORTE.find((item) => item.id === filtros.categoriaId)
  const factorCategoria = categoria ? categoria.peso : 1
  const factorMesero = filtros.mesero ? 1 / MESEROS_REPORTE.length : 1
  const factorEstacion = filtros.estacionId ? 0.32 : 1
  const factorProducto = filtros.productoId
    ? PRODUCTOS_REPORTE.find((item) => item.id === filtros.productoId)?.peso ?? 0.05
    : 1
  const totalCentavos = Math.round(
    totalBruto * factorCanal * factorModalidad * factorCategoria * factorMesero * factorEstacion * factorProducto,
  )
  const dias = diasDelRango(rango)
  const pesoDia = (dia: Date) => totalDia("centro", 9_500_000, dia) + totalDia("norte", 6_150_000, dia)
  const pesoTotal = dias.reduce((acumulado, dia) => acumulado + pesoDia(dia), 0)
  const serie = agruparSerie(dias, (dia) => Math.round((totalCentavos * pesoDia(dia)) / Math.max(1, pesoTotal)), filtros.agrupacion)

  const canales = (Object.keys(CANAL_PESO) as CanalReporte[]).map((clave) => ({
    clave,
    etiqueta: clave,
    peso: CANAL_PESO[clave],
  }))
  const modalidades = (Object.keys(MODALIDAD_PESO) as ModalidadReporte[]).map((clave) => ({
    clave,
    etiqueta: clave,
    peso: MODALIDAD_PESO[clave],
  }))
  const etiquetasCanal: Record<string, string> = {
    salon: "Salón",
    web: "Web",
    app: "App",
    qr: "QR",
    telefono: "Teléfono",
    mesero: "Mesero",
  }
  const etiquetasModalidad: Record<string, string> = {
    mesa: "Mesa",
    recoger: "Recoger",
    domicilio: "Domicilio",
  }

  const productosBase = PRODUCTOS_REPORTE.filter(
    (producto) =>
      (!filtros.categoriaId || producto.categoriaId === filtros.categoriaId) &&
      (!filtros.productoId || producto.id === filtros.productoId),
  )
  const pesoProductos = productosBase.reduce((acumulado, producto) => acumulado + producto.peso, 0)
  const productos: FilaProducto[] = productosBase
    .map((producto) => {
      const importe = Math.round((totalCentavos * producto.peso) / pesoProductos)
      const categoriaProducto = CATEGORIAS_REPORTE.find((item) => item.id === producto.categoriaId)
      return {
        productoId: producto.id,
        nombre: producto.nombre,
        categoria: categoriaProducto?.nombre ?? producto.categoriaId,
        cantidad: Math.max(1, Math.round(importe / 21_500)),
        importeCentavos: importe,
        participacion: totalCentavos > 0 ? importe / totalCentavos : 0,
      }
    })
    .sort((a, b) => b.importeCentavos - a.importeCentavos)

  const totalAnterior = filtros.comparar ? totalVentasPeriodo(periodoAnterior(rango), sedeIds) : 0
  const anteriorAjustado = Math.round(totalAnterior * factorCanal * factorModalidad)

  const respuesta: VentasResp = {
    actualizadoEn: actualizadoAhora(`ventas-${rango.etiqueta}`),
    etiquetaPeriodo: rango.etiqueta,
    kpis: {
      totalCentavos,
      pedidos: Math.max(1, Math.round(totalCentavos / 2_480)),
      ticketCentavos: Math.round(totalCentavos / Math.max(1, Math.round(totalCentavos / 2_480))),
      descuentosCentavos: Math.round(totalCentavos * pseudo(`desc-${rango.etiqueta}`, 0.02, 0.045)),
      impuestosCentavos: Math.round((totalCentavos / 1.16) * 0.16),
      propinaCentavos: Math.round(totalCentavos * pseudo(`tip-${rango.etiqueta}`, 0.045, 0.075)),
    },
    comparativo: filtros.comparar
      ? {
          etiquetaAnterior: periodoAnterior(rango).etiqueta,
          totalAnteriorCentavos: anteriorAjustado,
          variacionPct: anteriorAjustado > 0 ? (totalCentavos - anteriorAjustado) / anteriorAjustado : null,
        }
      : null,
    serie,
    desglose: serie.map((punto) => {
      const subtotal = Math.round(punto.totalCentavos / 1.16)
      return {
        clave: punto.desde,
        etiqueta: punto.etiqueta,
        pedidos: punto.pedidos,
        subtotalCentavos: subtotal,
        descuentosCentavos: Math.round(subtotal * 0.03),
        impuestosCentavos: punto.totalCentavos - subtotal,
        propinaCentavos: Math.round(punto.totalCentavos * 0.06),
        totalCentavos: punto.totalCentavos,
        participacion: totalCentavos > 0 ? punto.totalCentavos / totalCentavos : 0,
      }
    }),
    porSede: sedeIds.map((sedeId) => {
      const sede = SEDES_REPORTE.find((item) => item.id === sedeId)
      const importe = Math.round(
        totalVentasPeriodo(rango, [sedeId]) *
          factorCanal *
          factorModalidad *
          factorCategoria *
          factorMesero *
          factorEstacion *
          factorProducto,
      )
      const subtotal = Math.round(importe / 1.16)
      return {
        clave: sedeId,
        etiqueta: sede?.nombre ?? sedeId,
        pedidos: Math.max(1, Math.round(importe / 2_480)),
        subtotalCentavos: subtotal,
        descuentosCentavos: Math.round(subtotal * pseudo(`desc-sede-${sedeId}`, 0.02, 0.045)),
        impuestosCentavos: importe - subtotal,
        propinaCentavos: Math.round(importe * pseudo(`tip-sede-${sedeId}`, 0.045, 0.075)),
        totalCentavos: importe,
        participacion: totalCentavos > 0 ? importe / totalCentavos : 0,
      }
    }),
    porCanal: distribuir(
      totalCentavos,
      canales.map((item) => ({ ...item, etiqueta: etiquetasCanal[item.clave] ?? item.clave })),
      filtros.canal ?? "",
    ),
    porModalidad: distribuir(
      totalCentavos,
      modalidades.map((item) => ({ ...item, etiqueta: etiquetasModalidad[item.clave] ?? item.clave })),
      filtros.modalidad ?? "",
    ),
    productos,
    conciliacion: {
      cajaCentavos: totalCentavos,
      facturacionCentavos: totalCentavos,
      diferenciaCentavos: 0,
      verificadoEn: haceSegundos(95),
    },
  }
  return respuesta
})

/** GET /admin/reportes/reservas — volumen, ocupación, no-show y heatmap (RF-R5-121). */
registerMock("GET", /^\/admin\/reportes\/reservas$/, (ctx) => {
  const { rango } = queryVentas(ctx)
  const dias = diasDelRango(rango)
  const serie = dias.map((dia) => {
    const clave = aFechaISO(dia)
    const factor = FACtoresDia[dia.getDay()] ?? 1
    const reservas = Math.round(pseudo(`res-${clave}`, 26, 58) * (factor > 1.2 ? 1.55 : 1))
    const confirmadas = Math.round(reservas * pseudo(`conf-${clave}`, 0.82, 0.94))
    const canceladas = reservas - confirmadas
    const noShow = Math.round(confirmadas * pseudo(`ns-${clave}`, 0.04, 0.11))
    const sentadas = confirmadas - noShow
    return {
      fecha: clave,
      reservas,
      confirmadas,
      sentadas,
      noShow,
      canceladas,
      personas: Math.round(sentadas * pseudo(`pers-${clave}`, 2.6, 3.6)),
      esperaMediaMin: Math.round(pseudo(`espera-${clave}`, 6, 21)),
      ocupacionPct: pseudo(`ocup-${clave}`, 0.62, 0.97),
    }
  })
  const reservas = serie.reduce((acumulado, fila) => acumulado + fila.reservas, 0)
  const noShow = serie.reduce((acumulado, fila) => acumulado + fila.noShow, 0)
  const canceladas = serie.reduce((acumulado, fila) => acumulado + fila.canceladas, 0)
  const heatmap = []
  for (const dia of [1, 2, 3, 4, 5, 6, 0]) {
    for (let hora = 13; hora <= 22; hora += 1) {
      const clave = `heat-${dia}-${hora}`
      const cena = hora >= 19 ? 1.35 : hora <= 14 ? 0.75 : 1
      const finDeSemana = dia === 5 || dia === 6 || dia === 0 ? 1.5 : 1
      const reservasCelda = Math.round(pseudo(clave, 0, 7.99) * cena * finDeSemana)
      heatmap.push({
        dia,
        hora,
        reservas: reservasCelda,
        ocupacionPct: Math.min(0.99, pseudo(`${clave}-ocup`, 0.18, 0.86) * cena * finDeSemana),
      })
    }
  }
  const respuesta: ReservasResp = {
    actualizadoEn: actualizadoAhora(`reservas-${rango.etiqueta}`),
    etiquetaPeriodo: rango.etiqueta,
    kpis: {
      reservas,
      ocupacionPct: serie.reduce((acumulado, fila) => acumulado + fila.ocupacionPct, 0) / Math.max(1, serie.length),
      noShowPct: reservas > 0 ? noShow / reservas : 0,
      canceladasPct: reservas > 0 ? canceladas / reservas : 0,
      personas: serie.reduce((acumulado, fila) => acumulado + fila.personas, 0),
      esperaMediaMin: Math.round(
        serie.reduce((acumulado, fila) => acumulado + fila.esperaMediaMin, 0) / Math.max(1, serie.length),
      ),
      listaEspera: Math.round(pseudo(`lista-espera-${rango.etiqueta}`, 0, 18)),
    },
    serie,
    heatmap,
  }
  return respuesta
})

/** GET /admin/reportes/desempeno — por mesero, cajero y turno (V1, RF-R5-123). */
registerMock("GET", /^\/admin\/reportes\/desempeno$/, (ctx) => {
  const { rango, sedeIds } = queryVentas(ctx)
  const dimension = (q(ctx.query.dimension) || "mesero") as DimensionDesempeno
  return filasDesempeno(dimension, totalVentasPeriodo(rango, sedeIds), rango.etiqueta)
})

/** GET /admin/reportes/impuestos — listos para contabilidad (V1, RF-R5-124). */
registerMock("GET", /^\/admin\/reportes\/impuestos$/, (ctx) => {
  const { rango, sedeIds } = queryVentas(ctx)
  const total = totalVentasPeriodo(rango, sedeIds)
  const base = Math.round(total / 1.16)
  const impuestos = total - base
  const propina = Math.round(total * 0.06)
  const descuentos = Math.round(base * 0.031)
  const tasas = [
    { clave: "iva-16", etiqueta: "IVA 16 %", proporcion: 0.88 },
    { clave: "iva-8", etiqueta: "IVA 8 % (frontera)", proporcion: 0.07 },
    { clave: "exento", etiqueta: "Exento de IVA", proporcion: 0.05 },
  ]
  const porTasa: FilaImpuesto[] = tasas.map((tasa) => {
    const baseTasa = Math.round(base * tasa.proporcion)
    const impuestoTasa = tasa.clave === "exento" ? 0 : Math.round(baseTasa * (tasa.clave === "iva-16" ? 0.16 : 0.08))
    return {
      clave: tasa.clave,
      etiqueta: tasa.etiqueta,
      baseCentavos: baseTasa,
      impuestoCentavos: impuestoTasa,
      propinaCentavos: Math.round(propina * tasa.proporcion),
      descuentosCentavos: Math.round(descuentos * tasa.proporcion),
      totalCentavos: baseTasa + impuestoTasa,
    }
  })
  const porDia: FilaImpuesto[] = diasDelRango(rango).map((dia) => {
    const fecha = aFechaISO(dia)
    const totalDia = Math.round((total / rango.dias) * pseudo(`imp-${fecha}`, 0.9, 1.1))
    const baseDia = Math.round(totalDia / 1.16)
    return {
      clave: fecha,
      etiqueta: etiquetaDia(dia),
      baseCentavos: baseDia,
      impuestoCentavos: totalDia - baseDia,
      propinaCentavos: Math.round(totalDia * 0.06),
      descuentosCentavos: Math.round(baseDia * 0.031),
      totalCentavos: totalDia,
    }
  })
  const respuesta: ImpuestosResp = {
    actualizadoEn: actualizadoAhora(`impuestos-${rango.etiqueta}`),
    etiquetaPeriodo: rango.etiqueta,
    kpis: {
      baseGravableCentavos: base,
      impuestosCentavos: impuestos,
      propinaCentavos: propina,
      descuentosCentavos: descuentos,
      totalFacturadoCentavos: total,
    },
    porTasa,
    porDia,
  }
  return respuesta
})

/** GET /admin/reportes/comparativo — mismas métricas entre sucursales (V1, RF-R5-126). */
registerMock("GET", /^\/admin\/reportes\/comparativo$/, (ctx) => {
  const { rango } = queryVentas(ctx)
  const metrica = (q(ctx.query.metrica_comparada) || "ventas") as MetricaComparada
  const dias = diasDelRango(rango)
  const datos = SEDES_REPORTE.map((sede) => {
    const ventas = dias.reduce((acumulado, dia) => acumulado + totalDia(sede.id, sede.baseDiaCentavos, dia), 0)
    const pedidos = Math.max(1, Math.round(ventas / 2_480))
    return { sede, ventas, pedidos, ticketCentavos: Math.round(ventas / pedidos) }
  })
  const totalVentas = datos.reduce((acumulado, item) => acumulado + item.ventas, 0)
  const filas = datos.map((item) => {
    const valor =
      metrica === "ventas" ? item.ventas : metrica === "pedidos" ? item.pedidos : item.ticketCentavos
    const valorAnterior = Math.round(valor * pseudo(`comp-${item.sede.id}-${metrica}`, 0.86, 1.12))
    return {
      sedeId: item.sede.id,
      sedeNombre: item.sede.nombre,
      valor,
      valorAnterior,
      variacionPct: valorAnterior > 0 ? (valor - valorAnterior) / valorAnterior : null,
      pedidos: item.pedidos,
      ticketCentavos: item.ticketCentavos,
      participacion: totalVentas > 0 ? item.ventas / totalVentas : 0,
    }
  })
  const respuesta: ComparativoResp = {
    actualizadoEn: actualizadoAhora(`comparativo-${rango.etiqueta}`),
    etiquetaPeriodo: rango.etiqueta,
    metrica,
    totalCentavos: metrica === "ventas" ? totalVentas : null,
    filas,
  }
  return respuesta
})

/** GET /admin/reportes/programados — programación y registro de entrega (V1). */
registerMock("GET", /^\/admin\/reportes\/programados$/, () => {
  const respuesta: ProgramadosResp = {
    actualizadoEn: actualizadoAhora("programados"),
    filas: PROGRAMADOS,
  }
  return respuesta
})

/** POST /admin/reportes/programados — alta auditada (RF-R5-125). */
registerMock("POST", /^\/admin\/reportes\/programados$/, (ctx) => {
  const payload = (ctx.body ?? {}) as CrearProgramadoPayload
  if (!payload.nombre || payload.nombre.trim().length < 3) {
    throw new ApiError(422, "Escribe un nombre de al menos 3 caracteres", "nombre_requerido")
  }
  if (!payload.destinatarios || payload.destinatarios.length === 0) {
    throw new ApiError(422, "Agrega al menos un destinatario", "destinatarios_requeridos")
  }
  const programado: ReporteProgramado = {
    id: `prog-${Date.now()}`,
    nombre: payload.nombre.trim(),
    metrica: payload.metrica,
    periodicidad: payload.periodicidad,
    formato: payload.formato,
    destinatarios: payload.destinatarios,
    activo: true,
    siguienteEjecucion: haceSegundos(-24 * 3600),
    creadoEn: new Date().toISOString(),
    filtros: payload.filtros,
    entregas: [],
  }
  PROGRAMADOS.unshift(programado)
  return programado
})

/** PATCH /admin/reportes/programados/:id — activar o pausar. */
registerMock("PATCH", /^\/admin\/reportes\/programados\/([^/]+)$/, (ctx) => {
  const id = ctx.path.match(/^\/admin\/reportes\/programados\/([^/]+)$/)?.[1] ?? ""
  const programado = PROGRAMADOS.find((item) => item.id === id)
  if (!programado) throw new ApiError(404, "Reporte programado no encontrado", "programado_no_encontrado")
  const { activo } = (ctx.body ?? {}) as { activo?: boolean }
  programado.activo = Boolean(activo)
  return programado
})

/** POST /admin/reportes/programados/:id/ejecutar — envío inmediato registrado. */
registerMock("POST", /^\/admin\/reportes\/programados\/([^/]+)\/ejecutar$/, (ctx) => {
  const id = ctx.path.match(/^\/admin\/reportes\/programados\/([^/]+)\/ejecutar$/)?.[1] ?? ""
  const programado = PROGRAMADOS.find((item) => item.id === id)
  if (!programado) throw new ApiError(404, "Reporte programado no encontrado", "programado_no_encontrado")
  const entrega = {
    id: `ent-${Date.now()}`,
    enviadoEn: new Date().toISOString(),
    estado: "entregado" as const,
    destinatarios: programado.destinatarios,
    detalle: `${programado.destinatarios.length} destinatario${programado.destinatarios.length === 1 ? "" : "s"} · envío manual`,
  }
  programado.entregas = [entrega, ...programado.entregas]
  return { ok: true as const, entrega }
})

/** POST /admin/exportaciones — contrato compartido 14/15/16 (RN-R5-10). */
registerMock("POST", /^\/admin\/exportaciones$/, (ctx) => {
  const payload = (ctx.body ?? {}) as Partial<ExportacionPayload>
  if (!payload.tipo) throw new ApiError(422, "Indica el tipo de exportación", "tipo_requerido")
  const formato = payload.formato ?? "csv"
  const filasEstimadasBase: Record<string, number> = {
    reporte_ventas: 24_000,
    reporte_reservas: 1_200,
    reporte_desempeno: 640,
    reporte_impuestos: 3_100,
    reporte_comparativo: 42,
    auditoria: 128_000,
    tiempos_pedidos: 38_000,
    tiempos_comandas: 52_000,
    sla: 890,
  }
  const filasEstimadas = filasEstimadasBase[payload.tipo] ?? 5_000
  const segundoPlano = filasEstimadas > 50_000
  const respuesta: ExportacionResp = {
    id: `exp-${Date.now()}`,
    estado: "pendiente",
    tipo: payload.tipo,
    formato,
    filasEstimadas,
    segundoPlano,
    aviso: segundoPlano
      ? `La exportación supera 50 000 filas (${filasEstimadas.toLocaleString("es-MX")}): se procesa en segundo plano y se te avisará cuando esté lista.`
      : null,
    creadoEn: new Date().toISOString(),
  }
  return respuesta
})

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

function consulta(filtros: ReporteFiltros, sedeId: string | null): Query {
  return {
    periodo: filtros.periodo,
    desde: filtros.desde,
    hasta: filtros.hasta,
    agrupacion: filtros.agrupacion,
    canal: filtros.canal || undefined,
    modalidad: filtros.modalidad || undefined,
    categoria: filtros.categoriaId,
    producto: filtros.productoId,
    estacion: filtros.estacionId,
    mesero: filtros.mesero,
    comparar: filtros.comparar ? "1" : undefined,
    dimension: filtros.dimension,
    metrica_comparada: filtros.metricaComparada,
    sucursal: sedeId ?? undefined,
  }
}

export function useVentasReporte(filtros: ReporteFiltros, sedeId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["reportes", "ventas", filtros, sedeId],
    queryFn: () => api.get<VentasResp>("/admin/reportes/ventas", consulta(filtros, sedeId)),
    enabled,
  })
}

export function useReservasReporte(filtros: ReporteFiltros, sedeId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["reportes", "reservas", filtros, sedeId],
    queryFn: () => api.get<ReservasResp>("/admin/reportes/reservas", consulta(filtros, sedeId)),
    enabled,
  })
}

export function useDesempenoReporte(filtros: ReporteFiltros, sedeId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["reportes", "desempeno", filtros, sedeId],
    queryFn: () => api.get<DesempenoResp>("/admin/reportes/desempeno", consulta(filtros, sedeId)),
    enabled,
  })
}

export function useImpuestosReporte(filtros: ReporteFiltros, sedeId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["reportes", "impuestos", filtros, sedeId],
    queryFn: () => api.get<ImpuestosResp>("/admin/reportes/impuestos", consulta(filtros, sedeId)),
    enabled,
  })
}

export function useComparativoReporte(filtros: ReporteFiltros, sedeId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["reportes", "comparativo", filtros, sedeId],
    queryFn: () => api.get<ComparativoResp>("/admin/reportes/comparativo", consulta(filtros, sedeId)),
    enabled,
  })
}

export function useProgramadosReporte(enabled: boolean) {
  return useQuery({
    queryKey: ["reportes", "programados"],
    queryFn: () => api.get<ProgramadosResp>("/admin/reportes/programados"),
    enabled,
  })
}

export function useCrearProgramado() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CrearProgramadoPayload) =>
      api.post<ReporteProgramado>("/admin/reportes/programados", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reportes", "programados"] })
    },
  })
}

export function useActualizarProgramado() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; activo: boolean }) =>
      api.patch<ReporteProgramado>(`/admin/reportes/programados/${vars.id}`, { activo: vars.activo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reportes", "programados"] })
    },
  })
}

export function useEjecutarProgramado() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<{ ok: true }>(`/admin/reportes/programados/${id}/ejecutar`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reportes", "programados"] })
    },
  })
}

export function useExportarReporte() {
  return useMutation({
    mutationFn: (payload: ExportacionPayload) => api.post<ExportacionResp>("/admin/exportaciones", payload),
  })
}

export { ApiError }
