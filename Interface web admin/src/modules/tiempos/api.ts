import { useMutation, useQuery } from "@tanstack/react-query"
import { api, ApiError, registerMock, type Query } from "@/lib/api"
import type {
  DimensionPreparacion,
  ExportacionTiemposResp,
  Sello,
  SlaFila,
  SlaResp,
  Semaforo,
  TiempoFila,
  TiemposFiltros,
  TiemposResp,
  TramoId,
} from "@/modules/tiempos/types"

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

function pseudo(clave: string, min: number, max: number): number {
  return min + hash(clave) * (max - min)
}

function q(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

function haceMin(minutos: number): string {
  return new Date(Date.now() - minutos * 60_000).toISOString()
}

function actualizadoAhora(): string {
  return haceMin(pseudo(`sello-${Math.floor(Date.now() / 60_000)}`, 0.2, 0.9))
}

export const SEDES_TIEMPOS = [
  { id: "centro", nombre: "Punto C · Centro" },
  { id: "norte", nombre: "Punto C · Norte" },
]

export const MESEROS_TIEMPOS = ["Ana Ruiz", "Luis Paredes", "Jorge Solís", "Karla Méndez"]

export const ESTACIONES_TIEMPOS: { id: string; nombre: string; objetivoSeg: number | null }[] = [
  { id: "parrilla", nombre: "Parrilla", objetivoSeg: 720 },
  { id: "barra-fria", nombre: "Barra fría", objetivoSeg: 300 },
  { id: "postres", nombre: "Postres", objetivoSeg: 240 },
  /** Sin `regla_sla`: el SLA muestra «—» con CTA al SlaEditor, nunca un objetivo inventado. */
  { id: "barra", nombre: "Barra de bebidas", objetivoSeg: null },
]

const CANAL_LABEL: Record<string, string> = {
  salon: "Salón",
  qr: "QR",
  telefono: "Teléfono",
  web: "Web",
  app: "App",
  mesero: "Mesero",
  kds: "KDS",
}

const MODALIDAD_LABEL: Record<string, string> = {
  mesa: "Mesa",
  recoger: "Recoger",
  domicilio: "Domicilio",
}

/* -------------------------------------------------------------------------- */
/* Semillas: pedidos con sellos del servidor                                   */
/* -------------------------------------------------------------------------- */

type PedidoSpec = {
  id: string
  folio: string
  sedeId: string
  canal: string
  modalidad: string
  mesero: string
  estacionId: string
  creadoMin: number
  enviadoMin: number | null
  listoMin: number | null
  entregadoMin: number | null
  porCobrarMin: number | null
  pagadoMin: number | null
  recogidoMin: number | null
}

function construirSpecs(): PedidoSpec[] {
  const specs: PedidoSpec[] = []
  for (let i = 0; i < 26; i += 1) {
    const id = `ped-${1200 + i}`
    const modalidad = i % 7 === 3 ? "domicilio" : i % 5 === 2 ? "recoger" : "mesa"
    const canal =
      modalidad === "domicilio" ? (i % 2 === 0 ? "web" : "app") : modalidad === "recoger" ? "telefono" : i % 4 === 0 ? "qr" : "salon"
    const sede = SEDES_TIEMPOS[i % SEDES_TIEMPOS.length] ?? SEDES_TIEMPOS[0]
    const mesero = MESEROS_TIEMPOS[i % MESEROS_TIEMPOS.length] ?? MESEROS_TIEMPOS[0]
    const estacion = ESTACIONES_TIEMPOS[i % ESTACIONES_TIEMPOS.length] ?? ESTACIONES_TIEMPOS[0]
    const creadoMin = 12 + Math.round(pseudo(`${id}-creado`, 0, 400))
    const atencion = Math.round(pseudo(`${id}-atencion`, 1.5, 5))
    const preparacion = Math.round(pseudo(`${id}-prep`, 7, 27))
    const despacho = Math.round(pseudo(`${id}-desp`, 2, 9))
    const cobro = Math.round(pseudo(`${id}-cobro`, 2, 10))
    const enviadoMin = Math.max(1, creadoMin - atencion)
    const listoMin = Math.max(1, enviadoMin - preparacion)
    const entregadoMin = Math.max(1, listoMin - despacho)
    const porCobrarMin = Math.max(1, entregadoMin - Math.round(pseudo(`${id}-pc`, 1, 5)))
    const pagadoMin = Math.max(1, porCobrarMin - cobro)
    const recogidoMin = modalidad === "domicilio" ? Math.max(1, listoMin - Math.round(pseudo(`${id}-rec`, 2, 6))) : listoMin
    const abierto = i % 9 === 4
    const sinCierre = i % 11 === 5
    specs.push({
      id,
      folio: `#${4580 + i}`,
      sedeId: sede?.id ?? "centro",
      canal,
      modalidad,
      mesero,
      estacionId: estacion?.id ?? "parrilla",
      creadoMin,
      enviadoMin,
      listoMin: abierto && i % 3 === 0 ? null : listoMin,
      entregadoMin: abierto ? null : sinCierre ? null : entregadoMin,
      porCobrarMin: abierto ? null : entregadoMin - Math.round(pseudo(`${id}-pc2`, 1, 4)),
      pagadoMin: abierto ? null : sinCierre ? null : pagadoMin,
      recogidoMin: modalidad === "domicilio" ? recogidoMin : modalidad === "recoger" ? Math.max(1, listoMin - 2) : null,
    })
  }
  return specs
}

const SPECS = construirSpecs()

function sello(
  evento: string,
  etiqueta: string,
  minAgo: number | null,
  actor: string,
  actorRol: string,
  canal: string,
  dispositivo: string | null,
): Sello | null {
  if (minAgo === null) return null
  return {
    evento,
    etiqueta,
    hora: haceMin(minAgo),
    actor,
    actorRol,
    canal,
    dispositivo,
  }
}

function filaPedido(spec: PedidoSpec, tramo: TramoId): TiempoFila | null {
  if (tramo === "ruta" && spec.modalidad !== "domicilio") return null
  if (tramo === "recogida" && spec.modalidad !== "recoger") return null

  let inicioMin: number | null = null
  let cierreMin: number | null = null
  let inicio: { evento: string; etiqueta: string; actor: string; actorRol: string; canal: string; dispositivo: string } | null = null
  let cierre: { evento: string; etiqueta: string; actor: string; actorRol: string; canal: string; dispositivo: string } | null = null

  switch (tramo) {
    case "atencion":
      inicioMin = spec.creadoMin
      inicio = { evento: "pedido.creado", etiqueta: "Creado", actor: spec.modalidad === "mesa" ? spec.mesero : "Cliente", actorRol: spec.modalidad === "mesa" ? "Mesero" : "Cliente", canal: CANAL_LABEL[spec.canal] ?? spec.canal, dispositivo: `dis-${spec.sedeId}-01` }
      cierreMin = spec.enviadoMin
      cierre = { evento: "pedido.enviado", etiqueta: "Enviado a cocina", actor: spec.mesero, actorRol: "Mesero", canal: "KDS" as string, dispositivo: `dis-${spec.sedeId}-02` }
      break
    case "preparacion":
      inicioMin = spec.enviadoMin
      inicio = { evento: "pedido.enviado", etiqueta: "Enviado", actor: spec.mesero, actorRol: "Mesero", canal: "KDS", dispositivo: `dis-${spec.sedeId}-02` }
      cierreMin = spec.listoMin
      cierre = { evento: "pedido.listo", etiqueta: "Listo", actor: "Cocina", actorRol: "Cocina", canal: "KDS", dispositivo: `dis-${spec.sedeId}-03` }
      break
    case "despacho":
      inicioMin = spec.listoMin
      inicio = { evento: "pedido.listo", etiqueta: "Listo", actor: "Cocina", actorRol: "Cocina", canal: "KDS", dispositivo: `dis-${spec.sedeId}-03` }
      cierreMin = spec.entregadoMin
      cierre = { evento: "pedido.entregado", etiqueta: "Entregado", actor: spec.mesero, actorRol: "Mesero", canal: "App mesero", dispositivo: `dis-${spec.sedeId}-04` }
      break
    case "ruta":
      inicioMin = spec.recogidoMin
      inicio = { evento: "domicilio.recogido", etiqueta: "Recogido en ruta", actor: "Reparto", actorRol: "Repartidor", canal: "App reparto", dispositivo: `dis-${spec.sedeId}-05` }
      cierreMin = spec.entregadoMin
      cierre = { evento: "domicilio.entregado", etiqueta: "Entregado al cliente", actor: "Reparto", actorRol: "Repartidor", canal: "App reparto", dispositivo: `dis-${spec.sedeId}-05` }
      break
    case "recogida":
      inicioMin = spec.listoMin
      inicio = { evento: "pedido.listo", etiqueta: "Listo en mostrador", actor: "Cocina", actorRol: "Cocina", canal: "KDS", dispositivo: `dis-${spec.sedeId}-03` }
      cierreMin = spec.recogidoMin
      cierre = { evento: "pedido.recogido", etiqueta: "Recogido", actor: "Cliente", actorRol: "Cliente", canal: "Mostrador", dispositivo: `dis-${spec.sedeId}-06` }
      break
    case "cobro":
      inicioMin = spec.porCobrarMin
      inicio = { evento: "pedido.por_cobrar", etiqueta: "Por cobrar", actor: spec.mesero, actorRol: "Mesero", canal: "App mesero", dispositivo: `dis-${spec.sedeId}-04` }
      cierreMin = spec.pagadoMin
      cierre = { evento: "pedido.pagado", etiqueta: "Pagado", actor: spec.mesero, actorRol: "Cajero", canal: "TPV", dispositivo: `dis-${spec.sedeId}-07` }
      break
    case "total":
      inicioMin = spec.creadoMin
      inicio = { evento: "pedido.creado", etiqueta: "Creado", actor: spec.modalidad === "mesa" ? spec.mesero : "Cliente", actorRol: spec.modalidad === "mesa" ? "Mesero" : "Cliente", canal: CANAL_LABEL[spec.canal] ?? spec.canal, dispositivo: `dis-${spec.sedeId}-01` }
      cierreMin = spec.pagadoMin ?? spec.entregadoMin
      cierre = spec.pagadoMin
        ? { evento: "pedido.pagado", etiqueta: "Pagado", actor: spec.mesero, actorRol: "Cajero", canal: "TPV", dispositivo: `dis-${spec.sedeId}-07` }
        : spec.entregadoMin
          ? { evento: "pedido.entregado", etiqueta: "Entregado", actor: spec.mesero, actorRol: "Mesero", canal: "App mesero", dispositivo: `dis-${spec.sedeId}-04` }
          : null
      break
    default:
      return null
  }

  if (!inicio || inicioMin === null) return null
  const tramoSeg = cierreMin !== null && cierre !== null ? Math.max(0, Math.round((inicioMin - cierreMin) * 60)) : null
  const selloInicio: Sello = {
    evento: inicio.evento,
    etiqueta: inicio.etiqueta,
    hora: haceMin(inicioMin),
    actor: inicio.actor,
    actorRol: inicio.actorRol,
    canal: inicio.canal,
    dispositivo: inicio.dispositivo,
  }
  const selloCierre = cierre && cierreMin !== null ? sello(cierre.evento, cierre.etiqueta, cierreMin, cierre.actor, cierre.actorRol, cierre.canal, cierre.dispositivo) : null

  return {
    id: `${spec.id}-${tramo}`,
    tramo,
    entidad: "pedido",
    entidadId: spec.id,
    folio: spec.folio,
    sedeId: spec.sedeId,
    sedeNombre: SEDES_TIEMPOS.find((sede) => sede.id === spec.sedeId)?.nombre ?? spec.sedeId,
    canal: spec.canal,
    canalLabel: CANAL_LABEL[spec.canal] ?? spec.canal,
    modalidad: spec.modalidad,
    modalidadLabel: MODALIDAD_LABEL[spec.modalidad] ?? spec.modalidad,
    mesero: spec.mesero,
    estacionNombre: ESTACIONES_TIEMPOS.find((estacion) => estacion.id === spec.estacionId)?.nombre ?? null,
    tramoSeg,
    objetivoSeg: null,
    semaforo: "sin_objetivo",
    selloInicio,
    selloCierre,
  }
}

/* Comandas por estación (preparación por estación y SLA) --------------------- */

type ComandaSpec = {
  id: string
  numero: string
  pedidoFolio: string
  pedidoId: string
  estacionId: string
  enviadaMin: number
  listaMin: number | null
  entregadaMin: number | null
  sedeId: string
}

function construirComandas(): ComandaSpec[] {
  const comandas: ComandaSpec[] = []
  SPECS.forEach((spec, indice) => {
    for (let k = 0; k < 2; k += 1) {
      const estacion = ESTACIONES_TIEMPOS[(indice + k) % ESTACIONES_TIEMPOS.length] ?? ESTACIONES_TIEMPOS[0]
      const enviadaMin = spec.enviadoMin ?? spec.creadoMin
      const delta = Math.round(pseudo(`${spec.id}-comanda-${k}`, 4, 22))
      const sinLista = (indice + k) % 13 === 7
      const listaMin = spec.listoMin === null || sinLista ? null : Math.max(1, enviadaMin - delta)
      comandas.push({
        id: `com-${spec.id}-${k}`,
        numero: `${820 + indice * 2 + k}`,
        pedidoFolio: spec.folio,
        pedidoId: spec.id,
        estacionId: estacion?.id ?? "parrilla",
        enviadaMin,
        listaMin,
        entregadaMin: listaMin !== null ? Math.max(1, listaMin - Math.round(pseudo(`${spec.id}-${k}-ent`, 1, 5))) : null,
        sedeId: spec.sedeId,
      })
    }
  })
  return comandas
}

const COMANDAS = construirComandas()

function filaComanda(comanda: ComandaSpec): TiempoFila {
  const estacion = ESTACIONES_TIEMPOS.find((item) => item.id === comanda.estacionId) ?? ESTACIONES_TIEMPOS[0]
  const objetivoSeg = estacion?.objetivoSeg ?? null
  const tramoSeg = comanda.listaMin !== null ? Math.max(0, Math.round((comanda.enviadaMin - comanda.listaMin) * 60)) : null
  const selloInicio: Sello = {
    evento: "comanda.enviada",
    etiqueta: "Comanda enviada",
    hora: haceMin(comanda.enviadaMin),
    actor: "Sistema",
    actorRol: "Sistema",
    canal: "KDS",
    dispositivo: `dis-${comanda.sedeId}-02`,
  }
  const selloCierre = comanda.listaMin !== null
    ? sello(
        "comanda.lista",
        "Comanda lista",
        comanda.listaMin,
        "Cocina",
        "Cocina",
        "KDS",
        `dis-${comanda.sedeId}-03`,
      )
    : null
  return {
    id: comanda.id,
    tramo: "preparacion",
    entidad: "comanda",
    entidadId: comanda.id,
    folio: `#${comanda.numero} · ${comanda.pedidoFolio}`,
    sedeId: comanda.sedeId,
    sedeNombre: SEDES_TIEMPOS.find((sede) => sede.id === comanda.sedeId)?.nombre ?? comanda.sedeId,
    canal: "kds",
    canalLabel: "KDS",
    modalidad: "mesa",
    modalidadLabel: "—",
    mesero: "—",
    estacionNombre: estacion?.nombre ?? null,
    tramoSeg,
    objetivoSeg,
    semaforo: semaforoDe(tramoSeg, objetivoSeg),
    selloInicio,
    selloCierre,
  }
}

/* Reservas y rotación de mesa ------------------------------------------------ */

function filasReserva(): TiempoFila[] {
  const filas: TiempoFila[] = []
  for (let i = 0; i < 12; i += 1) {
    const id = `res-${300 + i}`
    const sede = SEDES_TIEMPOS[i % SEDES_TIEMPOS.length] ?? SEDES_TIEMPOS[0]
    const fechaHoraMin = Math.round(pseudo(`${id}-fh`, 60, 380))
    const espera = Math.round(pseudo(`${id}-espera`, 0, 24))
    const sentadaMin = Math.max(1, fechaHoraMin - espera)
    const sinSentar = i % 8 === 6
    filas.push({
      id,
      tramo: "reserva",
      entidad: "reserva",
      entidadId: id,
      folio: `Reserva ${id.slice(-3)} · ${pseudo(`${id}-p`, 2, 7).toFixed(0)} pax`,
      sedeId: sede?.id ?? "centro",
      sedeNombre: sede?.nombre ?? "Punto C",
      canal: "web",
      canalLabel: "Web",
      modalidad: "mesa",
      modalidadLabel: "Mesa",
      mesero: "—",
      estacionNombre: null,
      tramoSeg: sinSentar ? null : espera * 60,
      objetivoSeg: 15 * 60,
      semaforo: semaforoDe(sinSentar ? null : espera * 60, 15 * 60),
      selloInicio: {
        evento: "reserva.creada",
        etiqueta: "Hora reservada",
        hora: haceMin(fechaHoraMin),
        actor: "Cliente",
        actorRol: "Cliente",
        canal: "Web",
        dispositivo: null,
      },
      selloCierre: sinSentar
        ? null
        : sello("reserva.sentada", "Sentada", sentadaMin, "Recepción", "Anfitrión", "Tablet", `dis-${sede?.id}-08`),
    })
  }
  for (let i = 0; i < 8; i += 1) {
    const id = `mesa-${90 + i}`
    const sede = SEDES_TIEMPOS[(i + 1) % SEDES_TIEMPOS.length] ?? SEDES_TIEMPOS[0]
    const abiertaMin = Math.round(pseudo(`${id}-abre`, 90, 420))
    const duracionMin = Math.round(pseudo(`${id}-dur`, 38, 128))
    const cerradaMin = Math.max(1, abiertaMin - duracionMin)
    const abierta = i % 6 === 5
    filas.push({
      id,
      tramo: "reserva",
      entidad: "sesion_mesa",
      entidadId: id,
      folio: `Mesa ${4 + i} · rotación`,
      sedeId: sede?.id ?? "centro",
      sedeNombre: sede?.nombre ?? "Punto C",
      canal: "salon",
      canalLabel: "Salón",
      modalidad: "mesa",
      modalidadLabel: "Mesa",
      mesero: MESEROS_TIEMPOS[i % MESEROS_TIEMPOS.length] ?? "—",
      estacionNombre: null,
      tramoSeg: abierta ? null : duracionMin * 60,
      objetivoSeg: 90 * 60,
      semaforo: semaforoDe(abierta ? null : duracionMin * 60, 90 * 60),
      selloInicio: {
        evento: "sesion_mesa.abierta",
        etiqueta: "Mesa abierta",
        hora: haceMin(abiertaMin),
        actor: MESEROS_TIEMPOS[i % MESEROS_TIEMPOS.length] ?? "Mesero",
        actorRol: "Mesero",
        canal: "App mesero",
        dispositivo: `dis-${sede?.id}-04`,
      },
      selloCierre: abierta
        ? null
        : sello("sesion_mesa.cerrada", "Mesa cerrada", cerradaMin, "Caja", "Cajero", "TPV", `dis-${sede?.id}-07`),
    })
  }
  return filas
}

/* Cálculos ------------------------------------------------------------------- */

function semaforoDe(tramoSeg: number | null, objetivoSeg: number | null): Semaforo {
  if (tramoSeg === null || objetivoSeg === null) return "sin_objetivo"
  if (tramoSeg > objetivoSeg) return "vencida"
  if (tramoSeg > objetivoSeg * 0.8) return "por_vencer"
  return "normal"
}

function percentil(valores: number[], p: number): number | null {
  if (valores.length === 0) return null
  const orden = [...valores].sort((a, b) => a - b)
  const indice = Math.min(orden.length - 1, Math.floor(p * (orden.length - 1)))
  return orden[indice] ?? null
}

function resumir(filas: TiempoFila[], objetivoSeg: number | null): TiemposResp["resumen"] {
  const medidas = filas.map((fila) => fila.tramoSeg).filter((valor): valor is number => valor !== null)
  const media = medidas.length > 0 ? Math.round(medidas.reduce((acc, valor) => acc + valor, 0) / medidas.length) : null
  return {
    mediaSeg: media,
    p90Seg: percentil(medidas, 0.9),
    medidos: medidas.length,
    sinCierre: filas.length - medidas.length,
    objetivoSeg,
  }
}

/* Mocks --------------------------------------------------------------------- */

/** GET /admin/tiempos — tramo por pedido/comanda/reserva con sellos (RF-R5-122). */
registerMock("GET", /^\/admin\/tiempos$/, (ctx) => {
  const tramo = (q(ctx.query.tramo) || "atencion") as TramoId
  const dimension = (q(ctx.query.dimension) || "pedido") as DimensionPreparacion
  const sucursal = q(ctx.query.sucursal)
  const estacionFiltro = q(ctx.query.estacion)
  const meseroFiltro = q(ctx.query.mesero)
  const canalFiltro = q(ctx.query.canal)

  let filas: TiempoFila[]
  if (tramo === "reserva") {
    filas = filasReserva()
  } else if (tramo === "preparacion" && dimension === "estacion") {
    filas = COMANDAS.map(filaComanda)
  } else {
    filas = SPECS.map((spec) => filaPedido(spec, tramo)).filter((fila): fila is TiempoFila => fila !== null)
  }

  filas = filas.filter((fila) => {
    if (sucursal && fila.sedeId !== sucursal) return false
    if (meseroFiltro && fila.mesero !== meseroFiltro) return false
    if (canalFiltro && fila.canal !== canalFiltro) return false
    if (estacionFiltro) {
      const estacion = ESTACIONES_TIEMPOS.find((item) => item.nombre === fila.estacionNombre)
      if (!estacion || estacion.id !== estacionFiltro) return false
    }
    return true
  })

  const objetivoEstacion = estacionFiltro
    ? ESTACIONES_TIEMPOS.find((estacion) => estacion.id === estacionFiltro)?.objetivoSeg ?? null
    : null
  const resumen = resumir(filas, objetivoEstacion)

  /* Semáforo: contra `objetivo_seg` cuando exista (SLA) o contra el promedio del período. */
  filas = filas.map((fila) => {
    if (fila.objetivoSeg !== null) {
      return { ...fila, semaforo: semaforoDe(fila.tramoSeg, fila.objetivoSeg), objetivoFuente: "sla" as const }
    }
    const referencia = resumen.mediaSeg
    if (referencia === null || fila.tramoSeg === null) {
      return { ...fila, semaforo: "sin_objetivo" as const, objetivoFuente: null }
    }
    return { ...fila, objetivoSeg: referencia, semaforo: semaforoDe(fila.tramoSeg, referencia), objetivoFuente: "promedio" as const }
  })

  const respuesta: TiemposResp = {
    actualizadoEn: actualizadoAhora(),
    etiquetaRango: q(ctx.query.desde) ? `${q(ctx.query.desde)} → ${q(ctx.query.hasta) || "hoy"}` : "Hoy · turno en curso",
    tramo,
    dimension,
    resumen: {
      ...resumen,
      sinCierre: filas.filter((fila) => fila.tramoSeg === null).length,
      medidos: filas.filter((fila) => fila.tramoSeg !== null).length,
    },
    filas,
  }
  return respuesta
})

/** GET /admin/tiempos/sla — cumplimiento por estación (mv_sla_estacion). */
registerMock("GET", /^\/admin\/tiempos\/sla$/, (ctx) => {
  const sucursal = q(ctx.query.sucursal)
  const filas: SlaFila[] = ESTACIONES_TIEMPOS.map((estacion) => {
    const comandas = COMANDAS.filter((comanda) => comanda.estacionId === estacion.id).filter(
      (comanda) => !sucursal || comanda.sedeId === sucursal,
    )
    const cerradas = comandas.filter((comanda) => comanda.listaMin !== null)
    const tiempos = cerradas.map((comanda) => Math.max(0, Math.round((comanda.enviadaMin - (comanda.listaMin ?? comanda.enviadaMin)) * 60)))
    const objetivoSeg = estacion.objetivoSeg
    const dentroSla = objetivoSeg === null ? 0 : tiempos.filter((valor) => valor <= objetivoSeg).length
    const media = tiempos.length > 0 ? Math.round(tiempos.reduce((acc, valor) => acc + valor, 0) / tiempos.length) : null
    return {
      estacionId: estacion.id,
      estacionNombre: estacion.nombre,
      objetivoSeg,
      comandasMedidas: cerradas.length,
      dentroSla,
      pctCumplimiento: objetivoSeg === null || cerradas.length === 0 ? null : dentroSla / cerradas.length,
      preparacionMediaSeg: media,
      p90Seg: percentil(tiempos, 0.9),
      sinCierre: comandas.length - cerradas.length,
    }
  })

  const historial = Array.from({ length: 7 }, (_, indice) => {
    const dia = new Date()
    dia.setDate(dia.getDate() - (6 - indice))
    const clave = `sla-${dia.toISOString().slice(0, 10)}`
    return {
      fecha: dia.toISOString().slice(0, 10),
      etiqueta: new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric" }).format(dia),
      pctCumplimiento: pseudo(clave, 0.72, 0.98),
      medidas: Math.round(pseudo(`${clave}-m`, 48, 126)),
    }
  })

  const respuesta: SlaResp = { actualizadoEn: actualizadoAhora(), filas, historial }
  return respuesta
})

/** POST /admin/exportaciones — contrato compartido 14/15/16 (RN-R5-10). */
registerMock("POST", /^\/admin\/exportaciones$/, (ctx) => {
  const payload = (ctx.body ?? {}) as { tipo?: string; formato?: string }
  if (!payload.tipo) throw new ApiError(422, "Indica el tipo de exportación", "tipo_requerido")
  const filasEstimadasBase: Record<string, number> = {
    tiempos_pedidos: 38_000,
    tiempos_comandas: 52_000,
    sla: 890,
  }
  const filasEstimadas = filasEstimadasBase[payload.tipo] ?? 4_000
  const segundoPlano = filasEstimadas > 50_000
  const respuesta: ExportacionTiemposResp = {
    id: `exp-${Date.now()}`,
    estado: "pendiente",
    tipo: payload.tipo,
    formato: payload.formato ?? "csv",
    filasEstimadas,
    segundoPlano,
    aviso: segundoPlano
      ? `La exportación supera 50 000 filas (${filasEstimadas.toLocaleString("es-MX")}): se procesa en segundo plano y se avisará al solicitante.`
      : null,
    creadoEn: new Date().toISOString(),
  }
  return respuesta
})

/* Hooks ---------------------------------------------------------------------- */

function consulta(filtros: TiemposFiltros, sedeId: string | null): Query {
  return {
    tramo: filtros.tramo,
    dimension: filtros.dimension,
    desde: filtros.desde,
    hasta: filtros.hasta,
    estacion: filtros.estacionId,
    mesero: filtros.mesero,
    canal: filtros.canal,
    sucursal: sedeId ?? undefined,
  }
}

export function useTiempos(filtros: TiemposFiltros, sedeId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["tiempos", "explorador", filtros, sedeId],
    queryFn: () => api.get<TiemposResp>("/admin/tiempos", consulta(filtros, sedeId)),
    enabled,
    refetchInterval: 60_000,
  })
}

export function useSla(sedeId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["tiempos", "sla", sedeId],
    queryFn: () => api.get<SlaResp>("/admin/tiempos/sla", { sucursal: sedeId ?? undefined }),
    enabled,
    refetchInterval: 60_000,
  })
}

export function useExportarTiempos() {
  return useMutation({
    mutationFn: (payload: { tipo: string; formato: string; filtros: Record<string, string | undefined> }) =>
      api.post<ExportacionTiemposResp>("/admin/exportaciones", payload),
  })
}
