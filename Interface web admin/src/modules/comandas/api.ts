import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError, api, registerMock } from "@/lib/api"
import type {
  ComandaAlerta,
  ComandaDetalle,
  ComandaEstado,
  ComandaLinea,
  ComandaLineaEstado,
  ComandaMonitor,
  ComandasMonitorResp,
  Estacion,
  Excepcion,
  ExcepcionesResp,
  ExportacionResp,
  HistorialFila,
  HistorialTurnoResp,
  Modalidad,
  MonitorFiltros,
  Prioridad,
  ReasignarPayload,
  ReasignarResp,
  ReimprimirPayload,
  ReimprimirResp,
  Semaforo,
  SlaEstacionFila,
  Turno,
} from "@/modules/comandas/types"
import { ESTADO_TONE } from "@/modules/comandas/types"

/* -------------------------------------------------------------------------- */
/* Catálogos base (mock hasta que existan los módulos 07 y Catálogo)           */
/* -------------------------------------------------------------------------- */

/** Sellos relativos al arranque del módulo: estables entre refetch, avanzan en vivo. */
const AHORA_MS = Date.now()

function haceMin(min: number): string {
  return new Date(AHORA_MS - Math.round(min * 60_000)).toISOString()
}

export const ESTACIONES: Estacion[] = [
  { id: "est-parrilla", nombre: "Parrilla", tipo: "Cocina caliente", impresora: "IMP-PARRILLA-01", objetivoSeg: 7 * 60 },
  { id: "est-barra-fria", nombre: "Barra fría", tipo: "Cocina fría", impresora: "IMP-BARRA-01", objetivoSeg: 5 * 60 },
  { id: "est-postres", nombre: "Postres", tipo: "Repostería", impresora: "IMP-POSTRES-01", objetivoSeg: 6 * 60 },
  { id: "est-plancha", nombre: "Plancha", tipo: "Cocina caliente", impresora: "IMP-PLANCHA-01", objetivoSeg: 8 * 60 },
]

export const TURNOS: Turno[] = [{ id: "turno-1", nombre: "Comida (13:00–17:00)" }]

const TURNO_ACTUAL = TURNOS[0]

/* -------------------------------------------------------------------------- */
/* Semilla de comandas                                                         */
/* -------------------------------------------------------------------------- */

type LineaSpec = { nombre: string; cantidad: number; estado: ComandaLineaEstado; notas?: string }

type ComandaSpec = {
  id: string
  numero: string
  pedidoFolio: string
  mesa?: string
  mesero: string
  modalidad: Modalidad
  estacionId: string
  estado: ComandaEstado
  prioridad?: Prioridad
  /** Minutos transcurridos desde `enviada_en`. */
  minAgo: number
  /** Minutos desde que pasó a `lista` (evento de cierre). */
  listaMinAgo?: number
  entregadaMinAgo?: number
  responsable?: string
  motivo?: string
  reimpresa?: boolean
  trabajo?: { estado?: ComandaDetalle["trabajoImpresion"]["estado"]; intentos?: number; ultimoError?: string | null }
  /** Solo aparece en historial/SLA, no en el monitor del KDS. */
  soloHistorial?: boolean
  lineas: LineaSpec[]
}

const SPECS: ComandaSpec[] = [
  {
    id: "cmd-1038", numero: "1038", pedidoFolio: "P-8831", mesa: "Mesa 12", mesero: "Luis Ramírez",
    modalidad: "mesa", estacionId: "est-parrilla", estado: "en_preparacion", prioridad: "urgente", minAgo: 9.5,
    lineas: [
      { nombre: "Arrachera 300 g", cantidad: 2, estado: "en_preparacion", notas: "Término medio" },
      { nombre: "Costilla BBQ", cantidad: 1, estado: "pendiente" },
      { nombre: "Guarnición de papas", cantidad: 2, estado: "lista" },
    ],
  },
  {
    id: "cmd-1039", numero: "1039", pedidoFolio: "P-8834", mesa: "Mesa 05", mesero: "Sofía Herrera",
    modalidad: "mesa", estacionId: "est-parrilla", estado: "en_preparacion", minAgo: 4,
    lineas: [
      { nombre: "Rib eye 400 g", cantidad: 1, estado: "en_preparacion" },
      { nombre: "Elote asado", cantidad: 2, estado: "pendiente" },
    ],
  },
  {
    id: "cmd-1041", numero: "1041", pedidoFolio: "P-8836", mesa: "Mesa 03", mesero: "Diego Sosa",
    modalidad: "mesa", estacionId: "est-barra-fria", estado: "en_preparacion", minAgo: 2.7,
    lineas: [
      { nombre: "Ceviche de camarón", cantidad: 1, estado: "en_preparacion" },
      { nombre: "Ensalada César", cantidad: 1, estado: "pendiente" },
    ],
  },
  {
    id: "cmd-1042", numero: "1042", pedidoFolio: "P-8837", mesero: "Reparto Centro",
    modalidad: "domicilio", estacionId: "est-postres", estado: "en_preparacion", minAgo: 3,
    lineas: [{ nombre: "Flan napolitano", cantidad: 2, estado: "en_preparacion" }],
  },
  {
    id: "cmd-1044", numero: "1044", pedidoFolio: "P-8840", mesa: "Mesa 08", mesero: "Sofía Herrera",
    modalidad: "mesa", estacionId: "est-barra-fria", estado: "impresa", minAgo: 4.6,
    lineas: [
      { nombre: "Tostada de atún", cantidad: 2, estado: "pendiente" },
      { nombre: "Agua de jamaica", cantidad: 2, estado: "pendiente" },
    ],
  },
  {
    id: "cmd-1045", numero: "1045", pedidoFolio: "P-8841", mesa: "Mesa 10", mesero: "Luis Ramírez",
    modalidad: "mesa", estacionId: "est-plancha", estado: "en_preparacion", minAgo: 7.6,
    lineas: [
      { nombre: "Burguer de res", cantidad: 2, estado: "en_preparacion" },
      { nombre: "Papas gajo", cantidad: 2, estado: "en_preparacion" },
    ],
  },
  {
    id: "cmd-1046", numero: "1046", pedidoFolio: "P-8842", mesa: "Mesa 02", mesero: "Diego Sosa",
    modalidad: "mesa", estacionId: "est-parrilla", estado: "pendiente", minAgo: 6.3, reimpresa: true,
    lineas: [{ nombre: "Picaña 350 g", cantidad: 1, estado: "pendiente" }],
  },
  {
    id: "cmd-1047", numero: "1047", pedidoFolio: "P-8843", mesa: "Mesa 07", mesero: "Sofía Herrera",
    modalidad: "mesa", estacionId: "est-postres", estado: "en_preparacion", minAgo: 5.5,
    lineas: [
      { nombre: "Cheesecake de maracuyá", cantidad: 1, estado: "en_preparacion" },
      { nombre: "Café americano", cantidad: 2, estado: "lista" },
    ],
  },
  {
    id: "cmd-1049", numero: "1049", pedidoFolio: "P-8845", mesa: "Mesa 04", mesero: "Luis Ramírez",
    modalidad: "mesa", estacionId: "est-barra-fria", estado: "en_preparacion", minAgo: 6.2,
    trabajo: { estado: "fallido", intentos: 3, ultimoError: "Impresora sin respuesta (timeout)" },
    lineas: [{ nombre: "Aguachile rojo", cantidad: 2, estado: "en_preparacion" }],
  },
  {
    id: "cmd-1050", numero: "1050", pedidoFolio: "P-8846", mesa: "Mesa 11", mesero: "Diego Sosa",
    modalidad: "mesa", estacionId: "est-plancha", estado: "impresa", minAgo: 1.5,
    lineas: [{ nombre: "Tacos de arrachera", cantidad: 3, estado: "pendiente" }],
  },
  {
    id: "cmd-1051", numero: "1051", pedidoFolio: "P-8847", mesa: "Mesa 06", mesero: "Sofía Herrera",
    modalidad: "mesa", estacionId: "est-parrilla", estado: "lista", minAgo: 12, listaMinAgo: 1.5,
    lineas: [{ nombre: "Salmón a las brasas", cantidad: 2, estado: "lista" }],
  },
  {
    id: "cmd-1052", numero: "1052", pedidoFolio: "P-8820", mesa: "Mesa 09", mesero: "Diego Sosa",
    modalidad: "mesa", estacionId: "est-barra-fria", estado: "anulada", minAgo: 20,
    responsable: "Ana Beltrán (cocina)", motivo: "Producto agotado: pulpo a las brasas",
    lineas: [{ nombre: "Pulpo a las brasas", cantidad: 1, estado: "anulada" }],
  },
  /* Cerradas del turno (solo historial / SLA) */
  {
    id: "cmd-1027", numero: "1027", pedidoFolio: "P-8821", mesa: "Mesa 01", mesero: "Luis Ramírez",
    modalidad: "mesa", estacionId: "est-parrilla", estado: "entregada", minAgo: 22, listaMinAgo: 16, entregadaMinAgo: 15,
    soloHistorial: true, lineas: [{ nombre: "Arrachera 300 g", cantidad: 1, estado: "lista" }],
  },
  {
    id: "cmd-1028", numero: "1028", pedidoFolio: "P-8822", mesa: "Mesa 05", mesero: "Sofía Herrera",
    modalidad: "mesa", estacionId: "est-parrilla", estado: "entregada", minAgo: 25, listaMinAgo: 16, entregadaMinAgo: 14,
    soloHistorial: true, lineas: [{ nombre: "T-bone 450 g", cantidad: 2, estado: "lista" }],
  },
  {
    id: "cmd-1029", numero: "1029", pedidoFolio: "P-8823", mesero: "Reparto Norte",
    modalidad: "domicilio", estacionId: "est-barra-fria", estado: "entregada", minAgo: 20, listaMinAgo: 16, entregadaMinAgo: 13,
    soloHistorial: true, lineas: [{ nombre: "Ceviche de camarón", cantidad: 2, estado: "lista" }],
  },
  {
    id: "cmd-1030", numero: "1030", pedidoFolio: "P-8824", mesa: "Mesa 02", mesero: "Diego Sosa",
    modalidad: "mesa", estacionId: "est-barra-fria", estado: "entregada", minAgo: 18, listaMinAgo: 14, entregadaMinAgo: 12,
    soloHistorial: true, lineas: [{ nombre: "Ensalada César", cantidad: 1, estado: "lista" }],
  },
  {
    id: "cmd-1031", numero: "1031", pedidoFolio: "P-8825", mesa: "Mesa 03", mesero: "Luis Ramírez",
    modalidad: "mesa", estacionId: "est-postres", estado: "entregada", minAgo: 16, listaMinAgo: 12, entregadaMinAgo: 10,
    soloHistorial: true, lineas: [{ nombre: "Flan napolitano", cantidad: 1, estado: "lista" }],
  },
  {
    id: "cmd-1032", numero: "1032", pedidoFolio: "P-8826", mesa: "Mesa 08", mesero: "Sofía Herrera",
    modalidad: "mesa", estacionId: "est-plancha", estado: "entregada", minAgo: 30, listaMinAgo: 21, entregadaMinAgo: 19,
    soloHistorial: true, lineas: [{ nombre: "Burguer de res", cantidad: 3, estado: "lista" }],
  },
  {
    id: "cmd-1033", numero: "1033", pedidoFolio: "P-8827", mesa: "Mesa 04", mesero: "Diego Sosa",
    modalidad: "mesa", estacionId: "est-postres", estado: "entregada", minAgo: 14, listaMinAgo: 9, entregadaMinAgo: 7,
    soloHistorial: true, lineas: [{ nombre: "Cheesecake de maracuyá", cantidad: 2, estado: "lista" }],
  },
  {
    id: "cmd-1034", numero: "1034", pedidoFolio: "P-8828", mesa: "Mesa 06", mesero: "Luis Ramírez",
    modalidad: "mesa", estacionId: "est-plancha", estado: "entregada", minAgo: 19, listaMinAgo: 13, entregadaMinAgo: 11,
    soloHistorial: true, lineas: [{ nombre: "Tacos de arrachera", cantidad: 2, estado: "lista" }],
  },
  {
    id: "cmd-1035", numero: "1035", pedidoFolio: "P-8829", mesa: "Mesa 07", mesero: "Sofía Herrera",
    modalidad: "mesa", estacionId: "est-parrilla", estado: "entregada", minAgo: 17, listaMinAgo: 12, entregadaMinAgo: 10,
    soloHistorial: true, lineas: [{ nombre: "Costilla BBQ", cantidad: 1, estado: "lista" }],
  },
]

const ESTADOS_CERRADOS: ComandaEstado[] = ["lista", "entregada", "anulada"]

/** ¿La comanda ya no consume SLA del monitor? */
export function esComandaCerrada(estado: ComandaEstado): boolean {
  return ESTADOS_CERRADOS.includes(estado)
}

/** Semáforo contra el SLA objetivo; las comandas cerradas no se marcan. */
export function calcularSemaforo(
  estado: ComandaEstado,
  transcurridoSeg: number,
  objetivoSeg: number,
): Semaforo {
  if (esComandaCerrada(estado)) return "normal"
  if (transcurridoSeg > objetivoSeg) return "vencida"
  if (transcurridoSeg >= objetivoSeg * 0.85) return "por_vencer"
  return "normal"
}

/** Tiempo transcurrido en vivo (`ahora − enviada_en`); estable para las cerradas. */
export function transcurridoEnVivo(comanda: ComandaMonitor, ahoraMs: number): number {
  if (esComandaCerrada(comanda.estado)) return comanda.transcurridoSeg
  const enviada = Date.parse(comanda.enviadaEn)
  if (Number.isNaN(enviada)) return comanda.transcurridoSeg
  return Math.max(0, Math.round((ahoraMs - enviada) / 1000))
}

function estacionDe(id: string): Estacion {
  return ESTACIONES.find((estacion) => estacion.id === id) ?? ESTACIONES[0]
}

function aMonitor(spec: ComandaSpec): ComandaMonitor {
  const estacion = estacionDe(spec.estacionId)
  const transcurridoSeg = Math.round(spec.minAgo * 60)
  return {
    id: spec.id,
    numero: spec.numero,
    pedidoFolio: spec.pedidoFolio,
    mesa: spec.mesa,
    mesero: spec.mesero,
    modalidad: spec.modalidad,
    estacionId: estacion.id,
    estacionNombre: estacion.nombre,
    estado: spec.estado,
    estadoTone: ESTADO_TONE[spec.estado],
    prioridad: spec.prioridad ?? "normal",
    lineasTotal: spec.lineas.length,
    lineasPendientes: spec.lineas.filter((linea) => linea.estado === "pendiente" || linea.estado === "en_preparacion").length,
    transcurridoSeg,
    objetivoSeg: estacion.objetivoSeg,
    semaforo: calcularSemaforo(spec.estado, transcurridoSeg, estacion.objetivoSeg),
    turnoId: TURNO_ACTUAL.id,
    enviadaEn: haceMin(spec.minAgo),
  }
}

function aDetalle(spec: ComandaSpec): ComandaDetalle {
  const estacion = estacionDe(spec.estacionId)
  const monitor = aMonitor(spec)
  const lineas: ComandaLinea[] = spec.lineas.map((linea, index) => ({
    id: `${spec.id}-l${index + 1}`,
    nombreSnapshot: linea.nombre,
    cantidad: linea.cantidad,
    estado: linea.estado,
    notas: linea.notas,
  }))
  const preparacionSeg = spec.listaMinAgo != null ? Math.round((spec.minAgo - spec.listaMinAgo) * 60) : null
  const alertas: ComandaAlerta[] = []
  if (monitor.semaforo === "vencida") {
    alertas.push({
      id: `al-sla-${spec.id}`,
      tipo: "sla",
      mensaje: `SLA vencido: ${Math.round(monitor.transcurridoSeg / 60)} min de ${Math.round(monitor.objetivoSeg / 60)} min objetivo`,
      creadaEn: haceMin(Math.max(0, spec.minAgo - estacion.objetivoSeg / 60)),
    })
  }
  const trabajoBase = spec.trabajo ?? {}
  if (trabajoBase.estado === "fallido") {
    alertas.push({
      id: `al-imp-${spec.id}`,
      tipo: "impresora",
      mensaje: `Trabajo de impresión fallido en ${estacion.impresora} (${trabajoBase.intentos ?? 1} intentos)`,
      creadaEn: haceMin(Math.max(0, spec.minAgo - 1)),
    })
  }
  return {
    ...monitor,
    lineas,
    listaEn: spec.listaMinAgo != null ? haceMin(spec.listaMinAgo) : null,
    entregadaEn: spec.entregadaMinAgo != null ? haceMin(spec.entregadaMinAgo) : null,
    preparacionSeg,
    responsable: spec.responsable ?? null,
    motivo: spec.motivo ?? null,
    trabajoImpresion: {
      id: `imp-${spec.id}`,
      impresora: estacion.impresora,
      estado: trabajoBase.estado ?? "impreso",
      intentos: trabajoBase.intentos ?? 1,
      ultimoError: trabajoBase.ultimoError ?? null,
      actualizadoEn: haceMin(Math.max(0, spec.minAgo - 0.5)),
    },
    alertas,
    auditoriaId: `aud-${spec.id}`,
  }
}

const MONITORES: ComandaMonitor[] = SPECS.filter(
  (spec) => !spec.soloHistorial && spec.estado !== "entregada",
).map(aMonitor)

const DETALLES: ComandaDetalle[] = SPECS.map(aDetalle)

/* -------------------------------------------------------------------------- */
/* SLA del turno                                                              */
/* -------------------------------------------------------------------------- */

function percentil(valores: number[], p: number): number | null {
  if (valores.length === 0) return null
  const orden = [...valores].sort((a, b) => a - b)
  const indice = Math.min(orden.length - 1, Math.max(0, Math.ceil(p * orden.length) - 1))
  return orden[indice]
}

function promedio(valores: number[]): number | null {
  if (valores.length === 0) return null
  return Math.round(valores.reduce((total, valor) => total + valor, 0) / valores.length)
}

function construirSla(): { filas: SlaEstacionFila[]; global: number } {
  const filas = ESTACIONES.map((estacion) => {
    const deEstacion = SPECS.filter((spec) => spec.estacionId === estacion.id && spec.estado !== "anulada")
    const cerradas = deEstacion.filter((spec) => spec.listaMinAgo != null)
    const sinCierre = deEstacion.filter((spec) => spec.listaMinAgo == null).length
    const tiempos = cerradas.map((spec) => Math.round((spec.minAgo - (spec.listaMinAgo ?? spec.minAgo)) * 60))
    const cumplidas = tiempos.filter((seg) => seg <= estacion.objetivoSeg).length
    return {
      estacionId: estacion.id,
      estacionNombre: estacion.nombre,
      objetivoSeg: estacion.objetivoSeg,
      cumplidas,
      total: tiempos.length,
      vencidas: tiempos.filter((seg) => seg > estacion.objetivoSeg).length,
      sinCierre,
      promedioSeg: promedio(tiempos),
      p90Seg: percentil(tiempos, 0.9),
      cumplimientoPct: tiempos.length > 0 ? cumplidas / tiempos.length : 1,
    }
  })
  const totales = filas.reduce((acc, fila) => acc + fila.total, 0)
  const cumplidas = filas.reduce((acc, fila) => acc + fila.cumplidas, 0)
  return { filas, global: totales > 0 ? cumplidas / totales : 1 }
}

/* -------------------------------------------------------------------------- */
/* Excepciones                                                                */
/* -------------------------------------------------------------------------- */

const AGOTADOS: Excepcion[] = [
  {
    id: "exc-ago-1", tipo: "agotado", comandaNumero: "1052", pedidoFolio: "P-8820", producto: "Pulpo a las brasas",
    estacionNombre: "Barra fría", detalle: "Producto marcado como agotado desde cocina", responsable: "Ana Beltrán",
    origen: "cocina", ocurridaEn: haceMin(19), auditoriaId: "aud-1052",
  },
  {
    id: "exc-ago-2", tipo: "agotado", comandaNumero: null, pedidoFolio: null, producto: "Cheesecake de maracuyá",
    estacionNombre: "Postres", detalle: "Sin existencias para el servicio del turno", responsable: "María Gómez",
    origen: "backoffice", ocurridaEn: haceMin(48), auditoriaId: "aud-ago-2",
  },
  {
    id: "exc-ago-3", tipo: "agotado", comandaNumero: null, pedidoFolio: null, producto: "Cerveza artesanal IPA",
    estacionNombre: "Barra fría", detalle: "Marcado agotado en salón durante el turno", responsable: "Diego Sosa",
    origen: "salon", ocurridaEn: haceMin(26), auditoriaId: "aud-ago-3",
  },
]

function construirExcepciones(): Excepcion[] {
  const anulaciones: Excepcion[] = SPECS.filter((spec) => spec.estado === "anulada").map((spec) => ({
    id: `exc-${spec.id}`,
    tipo: "anulacion",
    comandaNumero: spec.numero,
    pedidoFolio: spec.pedidoFolio,
    producto: null,
    estacionNombre: estacionDe(spec.estacionId).nombre,
    detalle: spec.motivo ?? "Comanda anulada",
    responsable: spec.responsable ?? "—",
    origen: null,
    ocurridaEn: haceMin(Math.max(0, spec.minAgo - 1)),
    auditoriaId: `aud-${spec.id}`,
  }))
  const reimpresiones: Excepcion[] = SPECS.filter(
    (spec) => spec.reimpresa || (spec.trabajo?.intentos ?? 0) > 1,
  ).map((spec) => {
    const estacion = estacionDe(spec.estacionId)
    const fallido = spec.trabajo?.estado === "fallido"
    return {
      id: `exc-${spec.id}`,
      tipo: "reimpresion",
      comandaNumero: spec.numero,
      pedidoFolio: spec.pedidoFolio,
      producto: null,
      estacionNombre: estacion.nombre,
      detalle: fallido
        ? `Trabajo fallido en ${estacion.impresora}; se solicitó reimpresión`
        : `Reimpresión manual solicitada desde el panel (${estacion.impresora})`,
      responsable: fallido ? "Ana Beltrán" : "María Gómez",
      origen: null,
      ocurridaEn: haceMin(Math.max(0, spec.minAgo - 0.5)),
      auditoriaId: `aud-${spec.id}`,
    }
  })
  return [...anulaciones, ...reimpresiones, ...AGOTADOS].sort(
    (a, b) => Date.parse(b.ocurridaEn) - Date.parse(a.ocurridaEn),
  )
}

/* -------------------------------------------------------------------------- */
/* Mocks (se retiran cuando exista la API NestJS de comandas)                  */
/* -------------------------------------------------------------------------- */

function queryString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

/** GET /admin/comandas — monitor por estación o vista unificada de expedidor. */
registerMock("GET", /^\/admin\/comandas$/, (ctx) => {
  const estacionId = queryString(ctx.query.estacion)
  const estado = queryString(ctx.query.estado)
  const turnoId = queryString(ctx.query.turno)
  const comandas = MONITORES.filter((comanda) => {
    if (estacionId && comanda.estacionId !== estacionId) return false
    if (estado && comanda.estado !== estado) return false
    if (turnoId && comanda.turnoId !== turnoId) return false
    return true
  })
  const respuesta: ComandasMonitorResp = {
    actualizadoEn: new Date().toISOString(),
    estaciones: ESTACIONES,
    comandas,
    resumen: {
      enPreparacion: comandas.filter((comanda) => comanda.estado === "en_preparacion").length,
      porVencer: comandas.filter((comanda) => comanda.semaforo === "por_vencer").length,
      vencidas: comandas.filter((comanda) => comanda.semaforo === "vencida").length,
    },
  }
  return respuesta
})

/** GET /admin/comandas/historial — cumplimiento de SLA e historial del turno. */
registerMock("GET", /^\/admin\/comandas\/historial$/, () => {
  const { filas, global } = construirSla()
  const respuesta: HistorialTurnoResp = {
    actualizadoEn: new Date().toISOString(),
    turnoId: TURNO_ACTUAL.id,
    turnoNombre: TURNO_ACTUAL.nombre,
    inicioTurno: haceMin(185),
    cumplimientoGlobalPct: global,
    sla: filas,
    vencidas: MONITORES.filter((comanda) => comanda.semaforo === "vencida"),
    filas: SPECS.map<HistorialFila>((spec) => {
      const monitor = aMonitor(spec)
      return {
        id: spec.id,
        numero: spec.numero,
        pedidoFolio: spec.pedidoFolio,
        estacionNombre: monitor.estacionNombre,
        estado: spec.estado,
        estadoTone: ESTADO_TONE[spec.estado],
        enviadaEn: monitor.enviadaEn,
        listaEn: spec.listaMinAgo != null ? haceMin(spec.listaMinAgo) : null,
        entregadaEn: spec.entregadaMinAgo != null ? haceMin(spec.entregadaMinAgo) : null,
        preparacionSeg: spec.listaMinAgo != null ? Math.round((spec.minAgo - spec.listaMinAgo) * 60) : null,
        responsable: spec.responsable ?? null,
      }
    }).sort((a, b) => Date.parse(b.enviadaEn) - Date.parse(a.enviadaEn)),
  }
  return respuesta
})

/** GET /admin/comandas/excepciones — anulaciones, reimpresiones y agotados. */
registerMock("GET", /^\/admin\/comandas\/excepciones$/, (ctx) => {
  const tipo = queryString(ctx.query.tipo)
  const todas = construirExcepciones()
  const excepciones = tipo ? todas.filter((excepcion) => excepcion.tipo === tipo) : todas
  const respuesta: ExcepcionesResp = {
    actualizadoEn: new Date().toISOString(),
    excepciones,
    resumen: {
      anulaciones: todas.filter((excepcion) => excepcion.tipo === "anulacion").length,
      reimpresiones: todas.filter((excepcion) => excepcion.tipo === "reimpresion").length,
      agotados: todas.filter((excepcion) => excepcion.tipo === "agotado").length,
    },
  }
  return respuesta
})

/** POST /admin/comandas/:id/reimprimir — relanza impresión (motivo + idempotencia). */
registerMock("POST", /^\/admin\/comandas\/([^/]+)\/reimprimir$/, (ctx) => {
  const id = ctx.path.match(/^\/admin\/comandas\/([^/]+)\/reimprimir$/)?.[1] ?? ""
  const detalle = DETALLES.find((comanda) => comanda.id === id)
  if (!detalle) throw new ApiError(404, "Comanda no encontrada", "comanda_no_encontrada")
  const { motivo } = (ctx.body ?? {}) as ReimprimirPayload
  if (!motivo || motivo.trim().length < 3) {
    throw new ApiError(422, "El motivo es obligatorio", "motivo_requerido")
  }
  const trabajo = {
    ...detalle.trabajoImpresion,
    id: `imp-${id}-${Date.now()}`,
    estado: "pendiente" as const,
    intentos: detalle.trabajoImpresion.intentos + 1,
    ultimoError: null,
    actualizadoEn: new Date().toISOString(),
  }
  detalle.trabajoImpresion = trabajo
  const respuesta: ReimprimirResp = { ok: true, trabajo }
  return respuesta
})

/** POST /admin/comandas/:id/reasignar — V2, cambio de estación auditado. */
registerMock("POST", /^\/admin\/comandas\/([^/]+)\/reasignar$/, (ctx) => {
  const id = ctx.path.match(/^\/admin\/comandas\/([^/]+)\/reasignar$/)?.[1] ?? ""
  const detalle = DETALLES.find((comanda) => comanda.id === id)
  if (!detalle) throw new ApiError(404, "Comanda no encontrada", "comanda_no_encontrada")
  const { estacionId, motivo } = (ctx.body ?? {}) as ReasignarPayload
  if (!estacionId) throw new ApiError(422, "Selecciona la estación destino", "estacion_requerida")
  if (!motivo || motivo.trim().length < 3) {
    throw new ApiError(422, "El motivo es obligatorio", "motivo_requerido")
  }
  const estacion = ESTACIONES.find((item) => item.id === estacionId)
  if (!estacion) throw new ApiError(422, "Estación destino inválida", "estacion_invalida")
  const respuesta: ReasignarResp = {
    ok: true,
    comandaId: id,
    estacionId: estacion.id,
    estacionNombre: estacion.nombre,
    motivo: motivo.trim(),
    auditoriaId: `aud-${id}-reasignar`,
  }
  return respuesta
})

/** POST /admin/comandas/exportaciones — exporta SLA/historial (RN-R5-10). */
registerMock("POST", /^\/admin\/comandas\/exportaciones$/, (ctx) => {
  const { tipo } = (ctx.body ?? {}) as { tipo?: string }
  const respuesta: ExportacionResp = {
    ok: true,
    exportacionId: `exp-${Date.now()}`,
    tipo: tipo ?? "historial",
    generadaEn: new Date().toISOString(),
  }
  return respuesta
})

/** GET /admin/comandas/:id — detalle (se registra al final: es el más genérico). */
registerMock("GET", /^\/admin\/comandas\/([^/]+)$/, (ctx) => {
  const id = ctx.path.match(/^\/admin\/comandas\/([^/]+)$/)?.[1] ?? ""
  const detalle = DETALLES.find((comanda) => comanda.id === id)
  if (!detalle) throw new ApiError(404, "Comanda no encontrada", "comanda_no_encontrada")
  return detalle
})

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function useComandasMonitor(filtros: MonitorFiltros) {
  return useQuery({
    queryKey: ["comandas", "monitor", filtros],
    queryFn: () =>
      api.get<ComandasMonitorResp>("/admin/comandas", {
        estacion: filtros.estacionId,
        estado: filtros.estado,
        turno: filtros.turnoId,
        vista: filtros.vista,
      }),
    refetchInterval: 15_000,
  })
}

export function useComandaDetalle(id: string | null) {
  return useQuery({
    queryKey: ["comandas", "detalle", id],
    queryFn: () => api.get<ComandaDetalle>(`/admin/comandas/${id}`),
    enabled: Boolean(id),
  })
}

export function useHistorialTurno(turnoId?: string) {
  return useQuery({
    queryKey: ["comandas", "historial", turnoId ?? "actual"],
    queryFn: () => api.get<HistorialTurnoResp>("/admin/comandas/historial", { turno: turnoId }),
    refetchInterval: 60_000,
  })
}

export function useExcepciones(tipo?: string) {
  return useQuery({
    queryKey: ["comandas", "excepciones", tipo ?? "todas"],
    queryFn: () => api.get<ExcepcionesResp>("/admin/comandas/excepciones", { tipo }),
    refetchInterval: 30_000,
  })
}

export function useReimprimirComanda() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; motivo: string }) =>
      api.post<ReimprimirResp>(`/admin/comandas/${vars.id}/reimprimir`, { motivo: vars.motivo }),
    onSuccess: (_respuesta, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["comandas"] })
      void queryClient.invalidateQueries({ queryKey: ["comandas", "detalle", vars.id] })
    },
  })
}

export function useReasignarComanda() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string } & ReasignarPayload) =>
      api.post<ReasignarResp>(`/admin/comandas/${vars.id}/reasignar`, {
        estacionId: vars.estacionId,
        motivo: vars.motivo,
      }),
    onSuccess: (_respuesta, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["comandas"] })
      void queryClient.invalidateQueries({ queryKey: ["comandas", "detalle", vars.id] })
    },
  })
}

export function useExportarComandas() {
  return useMutation({
    mutationFn: (tipo: "historial" | "sla") =>
      api.post<ExportacionResp>("/admin/comandas/exportaciones", { tipo }),
  })
}
