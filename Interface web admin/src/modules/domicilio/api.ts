import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError, api, registerMock, type Query } from "@/lib/api"
import {
  entregaEstaActiva,
  type AsignacionPayload,
  type AsignacionResultado,
  type Entrega,
  type EntregasFiltros,
  type EntregasRespuesta,
  type ExportacionDomicilio,
  type Liquidacion,
  type LiquidacionPayload,
  type LiquidacionesRespuesta,
  type NotificacionRepartidor,
  type Repartidor,
  type RepartidorPayload,
  type RepartidoresRespuesta,
  type TramoEntrega,
  type Vehiculo,
  type Zona,
  type ZonaPayload,
  type ZonasRespuesta,
} from "@/modules/domicilio/types"

/* -------------------------------------------------------------------------- */
/* Mocks de desarrollo (se retiran cuando exista la API NestJS de domicilio).  */
/* Los sellos de tiempo los pone siempre este «servidor» (RN-R5-08).           */
/* -------------------------------------------------------------------------- */

const SUCURSAL_NOMBRE: Record<string, string> = {
  centro: "Punto C · Centro",
  norte: "Punto C · Norte",
}

/** Comisión fija por entrega usada por el mock de liquidación (hueco §4a del plan: falta snapshot de tarifa). */
const COMISION_ENTREGA_CENTAVOS = 3_500
const CANAL_NOTIFICACION: NotificacionRepartidor["canal"] = "whatsapp"

function ahoraISO(): string {
  return new Date().toISOString()
}

function haceMinutos(minutos: number): string {
  return new Date(Date.now() - minutos * 60_000).toISOString()
}

function coincideRango(iso: string | undefined, desde?: string, hasta?: string): boolean {
  if (!iso) return false
  const fecha = iso.slice(0, 10)
  if (desde && fecha < desde) return false
  if (hasta && fecha > hasta) return false
  return true
}

function segundosEntre(inicio?: string, fin?: string): number | null {
  if (!inicio || !fin) return null
  return Math.max(0, Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / 1000))
}

function sello(
  estado: TramoEntrega["estado"],
  actor: string,
  nota?: string,
  servidorEn: string = ahoraISO(),
): TramoEntrega {
  return { estado, servidorEn, actor, nota }
}

/* -------------------------------------------------------------------------- */
/* Datos semilla                                                               */
/* -------------------------------------------------------------------------- */

const ZONAS: Zona[] = [
  {
    id: "z-centro",
    sucursalId: "centro",
    sucursalNombre: SUCURSAL_NOMBRE.centro,
    nombre: "Centro histórico",
    tarifaCentavos: 3_500,
    pedidoMinimoCentavos: 15_000,
    tiempoEstimadoMin: 30,
    activa: true,
    actualizadoEn: haceMinutos(60 * 26),
    vertices: [
      { lat: 19.437, lng: -99.144 },
      { lat: 19.437, lng: -99.121 },
      { lat: 19.419, lng: -99.118 },
      { lat: 19.418, lng: -99.147 },
    ],
  },
  {
    id: "z-roma",
    sucursalId: "centro",
    sucursalNombre: SUCURSAL_NOMBRE.centro,
    nombre: "Roma – Condesa",
    tarifaCentavos: 4_900,
    pedidoMinimoCentavos: 22_000,
    tiempoEstimadoMin: 40,
    activa: true,
    actualizadoEn: haceMinutos(60 * 50),
    vertices: [
      { lat: 19.416, lng: -99.176 },
      { lat: 19.417, lng: -99.152 },
      { lat: 19.402, lng: -99.151 },
      { lat: 19.401, lng: -99.175 },
    ],
  },
  {
    id: "z-norte",
    sucursalId: "norte",
    sucursalNombre: SUCURSAL_NOMBRE.norte,
    nombre: "Norte industrial",
    tarifaCentavos: 5_500,
    pedidoMinimoCentavos: 30_000,
    tiempoEstimadoMin: 45,
    activa: false,
    actualizadoEn: haceMinutos(60 * 12),
    vertices: [
      { lat: 19.49, lng: -99.162 },
      { lat: 19.491, lng: -99.134 },
      { lat: 19.462, lng: -99.133 },
      { lat: 19.461, lng: -99.163 },
    ],
  },
]

const REPARTIDORES: Repartidor[] = [
  {
    id: "r-luis",
    sucursalId: "centro",
    sucursalNombre: SUCURSAL_NOMBRE.centro,
    nombre: "Luis Torres",
    telefono: "+52 55 1234 8801",
    vehiculo: "moto",
    estado: "activo",
    entregasActivas: 0,
    entregasPeriodo: 18,
    tiempoPromedioMin: 32,
    incidencias: 1,
    creadoEn: haceMinutos(60 * 24 * 120),
  },
  {
    id: "r-sandra",
    sucursalId: "centro",
    sucursalNombre: SUCURSAL_NOMBRE.centro,
    nombre: "Sandra Vega",
    telefono: "+52 55 1234 8802",
    vehiculo: "auto",
    estado: "ocupado",
    entregasActivas: 0,
    entregasPeriodo: 12,
    tiempoPromedioMin: 28,
    incidencias: 0,
    creadoEn: haceMinutos(60 * 24 * 90),
  },
  {
    id: "r-omar",
    sucursalId: "centro",
    sucursalNombre: SUCURSAL_NOMBRE.centro,
    nombre: "Omar Salinas",
    telefono: "+52 55 1234 8803",
    vehiculo: "bicicleta",
    estado: "inactivo",
    entregasActivas: 0,
    entregasPeriodo: 4,
    tiempoPromedioMin: 47,
    incidencias: 3,
    creadoEn: haceMinutos(60 * 24 * 60),
  },
  {
    id: "r-paula",
    sucursalId: "centro",
    sucursalNombre: SUCURSAL_NOMBRE.centro,
    nombre: "Paula Naranjo",
    telefono: "+52 55 1234 8804",
    vehiculo: "moto",
    estado: "activo",
    entregasActivas: 0,
    entregasPeriodo: 15,
    tiempoPromedioMin: 35,
    incidencias: 0,
    creadoEn: haceMinutos(60 * 24 * 45),
  },
  {
    id: "r-elena",
    sucursalId: "norte",
    sucursalNombre: SUCURSAL_NOMBRE.norte,
    nombre: "Elena Ríos",
    telefono: "+52 55 1234 8805",
    vehiculo: "auto",
    estado: "activo",
    entregasActivas: 0,
    entregasPeriodo: 9,
    tiempoPromedioMin: 41,
    incidencias: 1,
    creadoEn: haceMinutos(60 * 24 * 30),
  },
]

function crearEntrega(cfg: {
  pedidoId: string
  folio: string
  clienteNombre: string
  telefono: string
  direccion: string
  zonaId: string
  zonaNombre: string
  sucursalId: string
  creadoHaceMin: number
  tiempoEstimadoMin: number
  repartidorId?: string
  estado: Entrega["estado"]
  asignadoHaceMin?: number
  recogidoHaceMin?: number
  enCaminoHaceMin?: number
  entregadoHaceMin?: number
  evidenciaUrl?: string
  motivoIncidencia?: string
  propinaCentavos?: number
}): Entrega {
  const repartidor = REPARTIDORES.find((item) => item.id === cfg.repartidorId)
  const entrega: Entrega = {
    pedidoId: cfg.pedidoId,
    folio: cfg.folio,
    clienteNombre: cfg.clienteNombre,
    telefono: cfg.telefono,
    direccion: cfg.direccion,
    zonaId: cfg.zonaId,
    zonaNombre: cfg.zonaNombre,
    sucursalId: cfg.sucursalId,
    creadoEn: haceMinutos(cfg.creadoHaceMin),
    repartidorId: cfg.repartidorId,
    repartidorNombre: repartidor?.nombre,
    estado: cfg.estado,
    tiempoEstimadoMin: cfg.tiempoEstimadoMin,
    asignadoEn: cfg.asignadoHaceMin != null ? haceMinutos(cfg.asignadoHaceMin) : undefined,
    recogidoEn: cfg.recogidoHaceMin != null ? haceMinutos(cfg.recogidoHaceMin) : undefined,
    enCaminoEn: cfg.enCaminoHaceMin != null ? haceMinutos(cfg.enCaminoHaceMin) : undefined,
    entregadoEn: cfg.entregadoHaceMin != null ? haceMinutos(cfg.entregadoHaceMin) : undefined,
    esperaSeg: null,
    trasladoSeg: null,
    totalSeg: null,
    evidenciaUrl: cfg.evidenciaUrl,
    motivoIncidencia: cfg.motivoIncidencia,
    propinaCentavos: cfg.propinaCentavos ?? 0,
    tramos: [],
    notificacion: repartidor
      ? { canal: CANAL_NOTIFICACION, estado: "enviada", enviadaEn: cfg.asignadoHaceMin != null ? haceMinutos(cfg.asignadoHaceMin) : undefined }
      : undefined,
  }
  const actor = repartidor?.nombre ?? "Panel admin"
  if (cfg.asignadoHaceMin != null) {
    entrega.tramos.push(
      sello("asignado", "Panel admin", `Notificación ${CANAL_NOTIFICACION} encolada`, haceMinutos(cfg.asignadoHaceMin)),
    )
  }
  if (cfg.recogidoHaceMin != null) entrega.tramos.push(sello("recogido", actor, undefined, haceMinutos(cfg.recogidoHaceMin)))
  if (cfg.enCaminoHaceMin != null) entrega.tramos.push(sello("en_camino", actor, undefined, haceMinutos(cfg.enCaminoHaceMin)))
  if (cfg.entregadoHaceMin != null) {
    entrega.tramos.push(
      sello("entregado", actor, cfg.evidenciaUrl ? "Evidencia adjunta" : undefined, haceMinutos(cfg.entregadoHaceMin)),
    )
  }
  if (cfg.estado === "entrega_fallida" || cfg.estado === "devuelto") {
    entrega.tramos.push(sello(cfg.estado, actor, cfg.motivoIncidencia, haceMinutos(cfg.creadoHaceMin - 10)))
  }
  return recalcularTiempos(entrega)
}

function recalcularTiempos(entrega: Entrega): Entrega {
  entrega.esperaSeg = segundosEntre(entrega.asignadoEn, entrega.recogidoEn)
  entrega.trasladoSeg = segundosEntre(entrega.recogidoEn, entrega.entregadoEn)
  entrega.totalSeg = segundosEntre(entrega.asignadoEn, entrega.entregadoEn)
  return entrega
}

const ENTREGAS: Entrega[] = [
  crearEntrega({
    pedidoId: "p-8845",
    folio: "P-8845",
    clienteNombre: "Renata Solís",
    telefono: "+52 55 1414 2525",
    direccion: "Calle Regina 99, Centro",
    zonaId: "z-centro",
    zonaNombre: "Centro histórico",
    sucursalId: "centro",
    creadoHaceMin: 11,
    tiempoEstimadoMin: 25,
    estado: "por_asignar",
    propinaCentavos: 0,
  }),
  crearEntrega({
    pedidoId: "p-8837",
    folio: "P-8837",
    clienteNombre: "Laura Pérez",
    telefono: "+52 55 2211 3344",
    direccion: "Av. Juárez 128, Centro",
    zonaId: "z-centro",
    zonaNombre: "Centro histórico",
    sucursalId: "centro",
    creadoHaceMin: 42,
    tiempoEstimadoMin: 30,
    repartidorId: "r-luis",
    estado: "en_camino",
    asignadoHaceMin: 31,
    recogidoHaceMin: 19,
    enCaminoHaceMin: 12,
    propinaCentavos: 3_000,
  }),
  crearEntrega({
    pedidoId: "p-8841",
    folio: "P-8841",
    clienteNombre: "Carlos Méndez",
    telefono: "+52 55 7788 9900",
    direccion: "Calle Colima 240, Roma Norte",
    zonaId: "z-roma",
    zonaNombre: "Roma – Condesa",
    sucursalId: "centro",
    creadoHaceMin: 14,
    tiempoEstimadoMin: 40,
    repartidorId: "r-paula",
    estado: "recogido",
    asignadoHaceMin: 9,
    recogidoHaceMin: 2,
    propinaCentavos: 0,
  }),
  crearEntrega({
    pedidoId: "p-8843",
    folio: "P-8843",
    clienteNombre: "Ana Morales",
    telefono: "+52 55 4455 6677",
    direccion: "Calle Orizaba 87, Roma Sur",
    zonaId: "z-roma",
    zonaNombre: "Roma – Condesa",
    sucursalId: "centro",
    creadoHaceMin: 65,
    tiempoEstimadoMin: 35,
    repartidorId: "r-sandra",
    estado: "asignado",
    asignadoHaceMin: 6,
    propinaCentavos: 2_500,
  }),
  crearEntrega({
    pedidoId: "p-8830",
    folio: "P-8830",
    clienteNombre: "Diego Ramírez",
    telefono: "+52 55 1010 2020",
    direccion: "Eje Central 45, Centro",
    zonaId: "z-centro",
    zonaNombre: "Centro histórico",
    sucursalId: "centro",
    creadoHaceMin: 180,
    tiempoEstimadoMin: 30,
    repartidorId: "r-omar",
    estado: "entregado",
    asignadoHaceMin: 160,
    recogidoHaceMin: 150,
    enCaminoHaceMin: 140,
    entregadoHaceMin: 132,
    evidenciaUrl: "https://evidencia.puntoc.mx/e/p-8830.jpg",
    propinaCentavos: 5_000,
  }),
  crearEntrega({
    pedidoId: "p-8825",
    folio: "P-8825",
    clienteNombre: "Sofía Herrera",
    telefono: "+52 55 3030 4040",
    direccion: "Calle Puebla 310, Roma Norte",
    zonaId: "z-roma",
    zonaNombre: "Roma – Condesa",
    sucursalId: "centro",
    creadoHaceMin: 210,
    tiempoEstimadoMin: 40,
    repartidorId: "r-luis",
    estado: "entregado",
    asignadoHaceMin: 200,
    recogidoHaceMin: 186,
    enCaminoHaceMin: 175,
    entregadoHaceMin: 168,
    evidenciaUrl: "https://evidencia.puntoc.mx/e/p-8825.jpg",
    propinaCentavos: 0,
  }),
  crearEntrega({
    pedidoId: "p-8822",
    folio: "P-8822",
    clienteNombre: "Jorge Castillo",
    telefono: "+52 55 5050 6060",
    direccion: "Av. Hidalgo 12, Centro",
    zonaId: "z-centro",
    zonaNombre: "Centro histórico",
    sucursalId: "centro",
    creadoHaceMin: 260,
    tiempoEstimadoMin: 35,
    repartidorId: "r-paula",
    estado: "entregado",
    asignadoHaceMin: 250,
    recogidoHaceMin: 238,
    enCaminoHaceMin: 226,
    entregadoHaceMin: 206,
    evidenciaUrl: "https://evidencia.puntoc.mx/e/p-8822.jpg",
    propinaCentavos: 4_000,
  }),
  crearEntrega({
    pedidoId: "p-8819",
    folio: "P-8819",
    clienteNombre: "Marta Ruiz",
    telefono: "+52 55 7070 8080",
    direccion: "Calle Tabasco 55, Roma Sur",
    zonaId: "z-roma",
    zonaNombre: "Roma – Condesa",
    sucursalId: "centro",
    creadoHaceMin: 300,
    tiempoEstimadoMin: 40,
    repartidorId: "r-omar",
    estado: "entrega_fallida",
    asignadoHaceMin: 290,
    recogidoHaceMin: 280,
    enCaminoHaceMin: 270,
    motivoIncidencia: "Cliente no localizado en el domicilio",
    propinaCentavos: 0,
  }),
  crearEntrega({
    pedidoId: "p-8815",
    folio: "P-8815",
    clienteNombre: "Pablo Núñez",
    telefono: "+52 55 9090 1212",
    direccion: "Calle Durango 190, Roma Norte",
    zonaId: "z-roma",
    zonaNombre: "Roma – Condesa",
    sucursalId: "centro",
    creadoHaceMin: 340,
    tiempoEstimadoMin: 40,
    repartidorId: "r-sandra",
    estado: "devuelto",
    asignadoHaceMin: 330,
    recogidoHaceMin: 318,
    enCaminoHaceMin: 305,
    motivoIncidencia: "Dirección incorrecta, pedido devuelto a sucursal",
    propinaCentavos: 0,
  }),
]

const LIQUIDACIONES: Liquidacion[] = [
  {
    id: "liq-1",
    repartidorId: "r-luis",
    repartidorNombre: "Luis Torres",
    periodoDesde: "2026-09-22",
    periodoHasta: "2026-09-28",
    entregas: 18,
    tarifasCentavos: 63_000,
    propinasCentavos: 21_500,
    totalCentavos: 84_500,
    estado: "conciliada",
    generadaEn: haceMinutos(60 * 24 * 8),
    cerradaEn: haceMinutos(60 * 24 * 7),
    conciliadaEn: haceMinutos(60 * 24 * 6),
  },
  {
    id: "liq-2",
    repartidorId: "r-paula",
    repartidorNombre: "Paula Naranjo",
    periodoDesde: "2026-09-29",
    periodoHasta: "2026-10-05",
    entregas: 12,
    tarifasCentavos: 42_000,
    propinasCentavos: 9_000,
    totalCentavos: 51_000,
    estado: "cerrada",
    generadaEn: haceMinutos(60 * 24 * 2),
    cerradaEn: haceMinutos(60 * 24),
  },
]

/* -------------------------------------------------------------------------- */
/* Utilidades de servidor (mock)                                               */
/* -------------------------------------------------------------------------- */

function buscarZona(id: string): Zona {
  const zona = ZONAS.find((item) => item.id === id)
  if (!zona) throw new ApiError(404, "La zona de cobertura no existe.", "zona_no_encontrada")
  return zona
}

function buscarRepartidor(id: string): Repartidor {
  const repartidor = REPARTIDORES.find((item) => item.id === id)
  if (!repartidor) throw new ApiError(404, "El repartidor no existe.", "repartidor_no_encontrado")
  return repartidor
}

function buscarEntrega(pedidoId: string): Entrega {
  const entrega = ENTREGAS.find((item) => item.pedidoId === pedidoId)
  if (!entrega) throw new ApiError(404, "La entrega no existe.", "entrega_no_encontrada")
  return entrega
}

function conCarga(repartidor: Repartidor): Repartidor {
  return {
    ...repartidor,
    entregasActivas: ENTREGAS.filter(
      (entrega) => entrega.repartidorId === repartidor.id && entregaEstaActiva(entrega.estado),
    ).length,
  }
}

function bbox(vertices: { lat: number; lng: number }[]) {
  const lats = vertices.map((vertice) => vertice.lat)
  const lngs = vertices.map((vertice) => vertice.lng)
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  }
}

function seSolapan(a: ReturnType<typeof bbox>, b: ReturnType<typeof bbox>): boolean {
  return !(a.maxLat < b.minLat || b.maxLat < a.minLat || a.maxLng < b.minLng || b.maxLng < a.minLng)
}

function validarVertices(vertices: { lat: number; lng: number }[] | undefined): void {
  if (!vertices || vertices.length < 3) {
    throw new ApiError(422, "El polígono necesita al menos 3 vértices válidos.", "geometria_invalida")
  }
  if (vertices.some((vertice) => !Number.isFinite(vertice.lat) || !Number.isFinite(vertice.lng))) {
    throw new ApiError(422, "Hay vértices con coordenadas inválidas.", "geometria_invalida")
  }
}

function validarSolapes(zona: Pick<Zona, "id" | "sucursalId" | "vertices" | "activa">): void {
  if (!zona.activa) return
  const caja = bbox(zona.vertices)
  const choque = ZONAS.find(
    (otra) =>
      otra.id !== zona.id &&
      otra.sucursalId === zona.sucursalId &&
      otra.activa &&
      seSolapan(caja, bbox(otra.vertices)),
  )
  if (choque) {
    throw new ApiError(409, `La zona se solapa con «${choque.nombre}». Ajusta el polígono.`, "zona_solapada")
  }
}

function notificarRepartidor(): NotificacionRepartidor {
  return { canal: CANAL_NOTIFICACION, estado: "enviada", enviadaEn: ahoraISO() }
}

/** Criterio del plan §5 (supuesto): activos de la sucursal, menos carga y sin retrasos. */
export function sugerirRepartidores(
  repartidores: Repartidor[],
  sucursalId: string,
): Repartidor[] {
  return repartidores
    .filter((repartidor) => repartidor.sucursalId === sucursalId && repartidor.estado === "activo")
    .map((repartidor) => {
      const activas = ENTREGAS.filter(
        (entrega) => entrega.repartidorId === repartidor.id && entregaEstaActiva(entrega.estado),
      )
      const retrasadas = activas.filter((entrega) => {
        const referencia = entrega.asignadoEn ?? entrega.creadoEn
        const transcurridoMin = (Date.now() - new Date(referencia).getTime()) / 60_000
        return transcurridoMin > entrega.tiempoEstimadoMin
      }).length
      return { repartidor, activas: activas.length, retrasadas }
    })
    .sort(
      (a, b) =>
        a.retrasadas - b.retrasadas ||
        a.activas - b.activas ||
        (a.repartidor.tiempoPromedioMin ?? 999) - (b.repartidor.tiempoPromedioMin ?? 999),
    )
    .map((item) => item.repartidor)
}

/* -------------------------------------------------------------------------- */
/* Mocks registrados                                                           */
/* -------------------------------------------------------------------------- */

registerMock("GET", /^\/admin\/domicilio\/zonas$/, (ctx) => {
  const sucursalId = typeof ctx.query.sucursalId === "string" ? ctx.query.sucursalId : undefined
  const items = ZONAS.filter((zona) => !sucursalId || zona.sucursalId === sucursalId).sort((a, b) =>
    a.nombre.localeCompare(b.nombre),
  )
  const respuesta: ZonasRespuesta = { data: items, total: items.length }
  return respuesta
})

registerMock("POST", /^\/admin\/domicilio\/zonas$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<ZonaPayload>
  const nombre = body.nombre?.trim()
  if (!nombre) throw new ApiError(422, "El nombre de la zona es obligatorio.", "nombre_requerido")
  validarVertices(body.vertices)
  const sucursalId = body.sucursalId ?? "centro"
  const nueva: Zona = {
    id: `z-${ZONAS.length + 1}-${Date.now().toString(36)}`,
    sucursalId,
    sucursalNombre: SUCURSAL_NOMBRE[sucursalId] ?? sucursalId,
    nombre,
    tarifaCentavos: Math.max(0, Math.round(body.tarifaCentavos ?? 0)),
    pedidoMinimoCentavos: Math.max(0, Math.round(body.pedidoMinimoCentavos ?? 0)),
    tiempoEstimadoMin: Math.max(1, Math.round(body.tiempoEstimadoMin ?? 30)),
    activa: body.activa ?? true,
    actualizadoEn: ahoraISO(),
    vertices: body.vertices ?? [],
  }
  validarSolapes(nueva)
  ZONAS.push(nueva)
  return nueva
})

registerMock("PATCH", /^\/admin\/domicilio\/zonas\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const zona = buscarZona(id)
  const body = (ctx.body ?? {}) as Partial<ZonaPayload>
  const cambiaPrecios =
    (body.tarifaCentavos != null && body.tarifaCentavos !== zona.tarifaCentavos) ||
    (body.pedidoMinimoCentavos != null && body.pedidoMinimoCentavos !== zona.pedidoMinimoCentavos)
  if (cambiaPrecios && (body.motivo?.trim().length ?? 0) < 3) {
    throw new ApiError(422, "El cambio de tarifa o mínimo requiere motivo (auditoría).", "motivo_requerido")
  }
  if (body.vertices) validarVertices(body.vertices)
  const actualizada: Zona = {
    ...zona,
    nombre: body.nombre?.trim() || zona.nombre,
    tarifaCentavos: body.tarifaCentavos != null ? Math.max(0, Math.round(body.tarifaCentavos)) : zona.tarifaCentavos,
    pedidoMinimoCentavos:
      body.pedidoMinimoCentavos != null ? Math.max(0, Math.round(body.pedidoMinimoCentavos)) : zona.pedidoMinimoCentavos,
    tiempoEstimadoMin:
      body.tiempoEstimadoMin != null ? Math.max(1, Math.round(body.tiempoEstimadoMin)) : zona.tiempoEstimadoMin,
    activa: body.activa ?? zona.activa,
    vertices: body.vertices ?? zona.vertices,
    actualizadoEn: ahoraISO(),
  }
  validarSolapes(actualizada)
  Object.assign(zona, actualizada)
  return zona
})

registerMock("POST", /^\/admin\/domicilio\/zonas\/export$/, (ctx) => {
  const body = (ctx.body ?? {}) as { zonaId?: string }
  const exportacion: ExportacionDomicilio = {
    id: `exp-${Date.now().toString(36)}`,
    tipo: "zonas_geojson",
    formato: "geojson",
    estado: "en_proceso",
    creadoEn: ahoraISO(),
  }
  void body
  return exportacion
})

registerMock("GET", /^\/admin\/domicilio\/repartidores$/, (ctx) => {
  const sucursalId = typeof ctx.query.sucursalId === "string" ? ctx.query.sucursalId : undefined
  const items = REPARTIDORES.filter((repartidor) => !sucursalId || repartidor.sucursalId === sucursalId)
    .map(conCarga)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
  const respuesta: RepartidoresRespuesta = { data: items, total: items.length }
  return respuesta
})

registerMock("POST", /^\/admin\/domicilio\/repartidores$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<RepartidorPayload>
  const nombre = body.nombre?.trim()
  if (!nombre) throw new ApiError(422, "El nombre del repartidor es obligatorio.", "nombre_requerido")
  if ((body.telefono?.trim().length ?? 0) < 8) {
    throw new ApiError(422, "El teléfono del repartidor es obligatorio.", "telefono_requerido")
  }
  const sucursalId = body.sucursalId ?? "centro"
  const repartidor: Repartidor = {
    id: `r-${Date.now().toString(36)}`,
    sucursalId,
    sucursalNombre: SUCURSAL_NOMBRE[sucursalId] ?? sucursalId,
    nombre,
    telefono: body.telefono?.trim() ?? "",
    vehiculo: (body.vehiculo as Vehiculo | undefined) ?? "moto",
    estado: body.estado ?? "activo",
    entregasActivas: 0,
    entregasPeriodo: 0,
    tiempoPromedioMin: null,
    incidencias: 0,
    creadoEn: ahoraISO(),
  }
  REPARTIDORES.push(repartidor)
  return repartidor
})

registerMock("PATCH", /^\/admin\/domicilio\/repartidores\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const repartidor = buscarRepartidor(id)
  const body = (ctx.body ?? {}) as Partial<RepartidorPayload>
  const activas = ENTREGAS.filter(
    (entrega) => entrega.repartidorId === repartidor.id && entregaEstaActiva(entrega.estado),
  ).length
  if (body.estado === "inactivo") {
    if ((body.motivo?.trim().length ?? 0) < 3) {
      throw new ApiError(422, "Inactivar a un repartidor requiere motivo.", "motivo_requerido")
    }
    if (activas > 0) {
      throw new ApiError(409, `No se puede inactivar: tiene ${activas} entrega(s) en curso.`, "repartidor_con_entregas")
    }
  }
  Object.assign(repartidor, {
    nombre: body.nombre?.trim() || repartidor.nombre,
    telefono: body.telefono?.trim() || repartidor.telefono,
    vehiculo: body.vehiculo ?? repartidor.vehiculo,
    estado: body.estado ?? repartidor.estado,
    sucursalId: body.sucursalId ?? repartidor.sucursalId,
    sucursalNombre: body.sucursalId
      ? SUCURSAL_NOMBRE[body.sucursalId] ?? body.sucursalId
      : repartidor.sucursalNombre,
  })
  return conCarga(repartidor)
})

registerMock("GET", /^\/admin\/domicilio\/entregas$/, (ctx) => {
  const q = ctx.query
  let items = [...ENTREGAS]

  if (typeof q.sucursalId === "string") items = items.filter((entrega) => entrega.sucursalId === q.sucursalId)
  if (typeof q.repartidorId === "string") items = items.filter((entrega) => entrega.repartidorId === q.repartidorId)
  if (q.estado === "activas") items = items.filter((entrega) => entregaEstaActiva(entrega.estado))
  else if (typeof q.estado === "string") items = items.filter((entrega) => entrega.estado === q.estado)
  if (q.desde || q.hasta) {
    items = items.filter((entrega) => coincideRango(entrega.creadoEn, q.desde as string, q.hasta as string))
  }
  if (typeof q.busqueda === "string" && q.busqueda.trim()) {
    const texto = q.busqueda.trim().toLowerCase()
    items = items.filter(
      (entrega) =>
        entrega.folio.toLowerCase().includes(texto) ||
        entrega.clienteNombre.toLowerCase().includes(texto) ||
        entrega.direccion.toLowerCase().includes(texto),
    )
  }

  items.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
  const respuesta: EntregasRespuesta = { data: items, total: items.length }
  return respuesta
})

registerMock("POST", /^\/admin\/domicilio\/asignaciones$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<AsignacionPayload>
  const pedidoId = body.pedidoId
  if (!pedidoId) throw new ApiError(422, "Falta el pedido de la asignación.", "pedido_requerido")
  const entrega = buscarEntrega(pedidoId)

  const esActiva = entregaEstaActiva(entrega.estado)
  const repartidorActual = entrega.repartidorId ? buscarRepartidor(entrega.repartidorId) : null

  switch (body.accion) {
    case "asignar": {
      if (esActiva && entrega.repartidorId) {
        throw new ApiError(
          409,
          `El pedido ya está asignado a ${entrega.repartidorNombre}. Usa reasignar para cambiarlo.`,
          "asignacion_activa",
        )
      }
      const repartidor = buscarRepartidor(body.repartidorId ?? "")
      if (repartidor.estado !== "activo") {
        throw new ApiError(409, `${repartidor.nombre} está ${repartidor.estado} y no puede recibir entregas.`, "repartidor_no_disponible")
      }
      const notificacion = notificarRepartidor()
      entrega.repartidorId = repartidor.id
      entrega.repartidorNombre = repartidor.nombre
      entrega.estado = "asignado"
      entrega.asignadoEn = notificacion.enviadaEn
      entrega.recogidoEn = undefined
      entrega.enCaminoEn = undefined
      entrega.entregadoEn = undefined
      entrega.evidenciaUrl = undefined
      entrega.motivoIncidencia = undefined
      entrega.notificacion = notificacion
      entrega.tramos.push(sello("asignado", "Panel admin", `Notificación ${notificacion.canal} encolada`))
      recalcularTiempos(entrega)
      const resultado: AsignacionResultado = { entrega, notificacion }
      return resultado
    }
    case "reasignar": {
      if (!esActiva) throw new ApiError(409, "La entrega no está activa; no se puede reasignar.", "entrega_no_activa")
      if ((body.motivo?.trim().length ?? 0) < 3) {
        throw new ApiError(422, "La reasignación requiere motivo.", "motivo_requerido")
      }
      const repartidor = buscarRepartidor(body.repartidorId ?? "")
      if (repartidor.id === repartidorActual?.id) {
        throw new ApiError(422, "Selecciona un repartidor distinto al actual.", "mismo_repartidor")
      }
      if (repartidor.estado !== "activo") {
        throw new ApiError(409, `${repartidor.nombre} está ${repartidor.estado} y no puede recibir entregas.`, "repartidor_no_disponible")
      }
      const notificacion = notificarRepartidor()
      const nota = `Reasignado de ${repartidorActual?.nombre ?? "sin asignar"}: ${body.motivo?.trim()}`
      entrega.tramos.push(sello("asignado", "Panel admin", nota))
      entrega.repartidorId = repartidor.id
      entrega.repartidorNombre = repartidor.nombre
      entrega.estado = "asignado"
      entrega.asignadoEn = notificacion.enviadaEn
      entrega.recogidoEn = undefined
      entrega.enCaminoEn = undefined
      entrega.notificacion = notificacion
      recalcularTiempos(entrega)
      const resultado: AsignacionResultado = { entrega, notificacion }
      return resultado
    }
    case "recoger": {
      if (!esActiva || !entrega.repartidorId) {
        throw new ApiError(409, "La entrega no tiene una asignación activa.", "entrega_no_activa")
      }
      if (entrega.estado !== "asignado") {
        throw new ApiError(409, "La entrega ya fue recogida.", "transicion_invalida")
      }
      entrega.estado = "recogido"
      entrega.recogidoEn = ahoraISO()
      entrega.tramos.push(sello("recogido", entrega.repartidorNombre ?? "Repartidor"))
      recalcularTiempos(entrega)
      return { entrega } satisfies AsignacionResultado
    }
    case "en_camino": {
      if (entrega.estado !== "recogido") {
        throw new ApiError(409, "Primero marca la entrega como recogida.", "transicion_invalida")
      }
      entrega.estado = "en_camino"
      entrega.enCaminoEn = ahoraISO()
      entrega.tramos.push(sello("en_camino", entrega.repartidorNombre ?? "Repartidor"))
      recalcularTiempos(entrega)
      return { entrega } satisfies AsignacionResultado
    }
    case "entregar": {
      if (entrega.estado !== "en_camino" && entrega.estado !== "recogido") {
        throw new ApiError(409, "La entrega no está lista para cerrarse.", "transicion_invalida")
      }
      const evidencia = body.evidenciaUrl?.trim()
      if (!evidencia) {
        throw new ApiError(422, "La evidencia de entrega es obligatoria para cerrar.", "evidencia_requerida")
      }
      entrega.estado = "entregado"
      entrega.evidenciaUrl = evidencia
      entrega.entregadoEn = ahoraISO()
      entrega.tramos.push(sello("entregado", entrega.repartidorNombre ?? "Repartidor", "Evidencia adjunta"))
      recalcularTiempos(entrega)
      return { entrega } satisfies AsignacionResultado
    }
    case "fallar":
    case "devolver": {
      if (!esActiva) throw new ApiError(409, "La entrega no está activa.", "entrega_no_activa")
      if ((body.motivo?.trim().length ?? 0) < 3) {
        throw new ApiError(422, "Reportar una incidencia requiere motivo.", "motivo_requerido")
      }
      entrega.estado = body.accion === "fallar" ? "entrega_fallida" : "devuelto"
      entrega.motivoIncidencia = body.motivo?.trim()
      entrega.tramos.push(sello(entrega.estado, entrega.repartidorNombre ?? "Repartidor", entrega.motivoIncidencia))
      return { entrega } satisfies AsignacionResultado
    }
    default:
      throw new ApiError(400, "Acción de entrega no reconocida.", "accion_invalida")
  }
})

registerMock("GET", /^\/admin\/domicilio\/liquidaciones$/, (ctx) => {
  const q = ctx.query
  let items = [...LIQUIDACIONES]
  if (typeof q.repartidorId === "string") items = items.filter((item) => item.repartidorId === q.repartidorId)
  if (q.desde) items = items.filter((item) => item.periodoHasta >= (q.desde as string))
  if (q.hasta) items = items.filter((item) => item.periodoDesde <= (q.hasta as string))
  items.sort((a, b) => b.periodoDesde.localeCompare(a.periodoDesde))
  const respuesta: LiquidacionesRespuesta = { data: items, total: items.length }
  return respuesta
})

registerMock("POST", /^\/admin\/domicilio\/liquidaciones$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<LiquidacionPayload>
  if ((body.motivo?.trim().length ?? 0) < 3) {
    throw new ApiError(422, "La liquidación requiere motivo para auditoría.", "motivo_requerido")
  }

  if (body.accion === "generar") {
    const repartidor = buscarRepartidor(body.repartidorId ?? "")
    if (!body.periodoDesde || !body.periodoHasta) {
      throw new ApiError(422, "Indica el período a liquidar.", "periodo_requerido")
    }
    const existente = LIQUIDACIONES.find(
      (item) =>
        item.repartidorId === repartidor.id &&
        item.periodoDesde === body.periodoDesde &&
        item.periodoHasta === body.periodoHasta,
    )
    if (existente) return existente

    const entregasCumplidas = ENTREGAS.filter(
      (entrega) =>
        entrega.repartidorId === repartidor.id &&
        entrega.estado === "entregado" &&
        coincideRango(entrega.entregadoEn, body.periodoDesde, body.periodoHasta),
    )
    const tarifasCentavos = entregasCumplidas.length * COMISION_ENTREGA_CENTAVOS
    const propinasCentavos = entregasCumplidas.reduce((total, entrega) => total + entrega.propinaCentavos, 0)
    const liquidacion: Liquidacion = {
      id: `liq-${LIQUIDACIONES.length + 1}-${Date.now().toString(36)}`,
      repartidorId: repartidor.id,
      repartidorNombre: repartidor.nombre,
      periodoDesde: body.periodoDesde,
      periodoHasta: body.periodoHasta,
      entregas: entregasCumplidas.length,
      tarifasCentavos,
      propinasCentavos,
      totalCentavos: tarifasCentavos + propinasCentavos,
      estado: "abierta",
      generadaEn: ahoraISO(),
    }
    LIQUIDACIONES.push(liquidacion)
    return liquidacion
  }

  const liquidacion = LIQUIDACIONES.find((item) => item.id === body.id)
  if (!liquidacion) throw new ApiError(404, "La liquidación no existe.", "liquidacion_no_encontrada")

  if (body.accion === "cerrar") {
    if (liquidacion.estado !== "abierta") {
      throw new ApiError(409, "Solo se pueden cerrar liquidaciones abiertas.", "transicion_invalida")
    }
    liquidacion.estado = "cerrada"
    liquidacion.cerradaEn = ahoraISO()
    return liquidacion
  }
  if (body.accion === "conciliar") {
    if (liquidacion.estado !== "cerrada") {
      throw new ApiError(409, "Primero cierra la liquidación para conciliarla.", "transicion_invalida")
    }
    liquidacion.estado = "conciliada"
    liquidacion.conciliadaEn = ahoraISO()
    return liquidacion
  }
  throw new ApiError(400, "Acción de liquidación no reconocida.", "accion_invalida")
})

registerMock("POST", /^\/admin\/domicilio\/liquidaciones\/([^/]+)\/export$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const liquidacion = LIQUIDACIONES.find((item) => item.id === id)
  if (!liquidacion) throw new ApiError(404, "La liquidación no existe.", "liquidacion_no_encontrada")
  const exportacion: ExportacionDomicilio = {
    id: `exp-${Date.now().toString(36)}`,
    tipo: "liquidacion",
    formato: "csv",
    estado: "en_proceso",
    creadoEn: ahoraISO(),
  }
  return exportacion
})

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function useZonas(sucursalId: string | null) {
  return useQuery({
    queryKey: ["domicilio", "zonas", sucursalId],
    queryFn: () =>
      api.get<ZonasRespuesta>("/admin/domicilio/zonas", { sucursalId: sucursalId ?? undefined }),
  })
}

export function useGuardarZona() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: ZonaPayload }) =>
      id
        ? api.patch<Zona>(`/admin/domicilio/zonas/${id}`, payload)
        : api.post<Zona>("/admin/domicilio/zonas", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["domicilio", "zonas"] })
    },
  })
}

export function useExportarZonas() {
  return useMutation({
    mutationFn: (zonaId?: string) =>
      api.post<ExportacionDomicilio>("/admin/domicilio/zonas/export", { zonaId }),
  })
}

export function useRepartidores(sucursalId: string | null) {
  return useQuery({
    queryKey: ["domicilio", "repartidores", sucursalId],
    queryFn: () =>
      api.get<RepartidoresRespuesta>("/admin/domicilio/repartidores", { sucursalId: sucursalId ?? undefined }),
  })
}

export function useGuardarRepartidor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: RepartidorPayload }) =>
      id
        ? api.patch<Repartidor>(`/admin/domicilio/repartidores/${id}`, payload)
        : api.post<Repartidor>("/admin/domicilio/repartidores", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["domicilio", "repartidores"] })
      void queryClient.invalidateQueries({ queryKey: ["domicilio", "entregas"] })
    },
  })
}

export function useEntregas(filtros: EntregasFiltros) {
  return useQuery({
    queryKey: ["domicilio", "entregas", filtros],
    queryFn: () => api.get<EntregasRespuesta>("/admin/domicilio/entregas", filtros as unknown as Query),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  })
}

export function useAccionAsignacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AsignacionPayload) =>
      api.post<AsignacionResultado>("/admin/domicilio/asignaciones", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["domicilio", "entregas"] })
      void queryClient.invalidateQueries({ queryKey: ["domicilio", "repartidores"] })
    },
  })
}

export function useLiquidaciones(filtros: { repartidorId?: string; desde?: string; hasta?: string }) {
  return useQuery({
    queryKey: ["domicilio", "liquidaciones", filtros],
    queryFn: () => api.get<LiquidacionesRespuesta>("/admin/domicilio/liquidaciones", filtros),
  })
}

export function useLiquidacionAccion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: LiquidacionPayload) =>
      api.post<Liquidacion>("/admin/domicilio/liquidaciones", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["domicilio", "liquidaciones"] })
    },
  })
}

export function useExportarLiquidacion() {
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ExportacionDomicilio>(`/admin/domicilio/liquidaciones/${id}/export`, {}),
  })
}
