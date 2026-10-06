import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError, api, registerMock, type Query } from "@/lib/api"
import { maskName } from "@/lib/format"
import {
  type AccesoRegistro,
  type AnonimizarPayload,
  type ClienteDetalle,
  type ClienteHistorialItem,
  type ClienteLista,
  type ClientePatch,
  type ClientesFiltros,
  type ClientesRespuesta,
  type Consentimiento,
  type ConsentimientoPayload,
  type CriterioSegmento,
  type ExportacionClientes,
  type MarketingEstado,
  type Segmento,
  type VistaPreviaSegmento,
} from "@/modules/clientes/types"

/* -------------------------------------------------------------------------- */
/* Mocks de desarrollo (se retiran cuando exista la API NestJS de clientes).   */
/* El enmascarado real ocurre en el servidor; aquí se simula el contrato.      */
/* -------------------------------------------------------------------------- */

const ACTOR = { actor: "María Gómez", rol: "Gerente de sede" }
const DISPOSITIVO = "Panel admin · navegador"
const LIMITE_EXPORTACION = 5_000

const SUCURSAL_NOMBRE: Record<string, string> = {
  centro: "Punto C · Centro",
  norte: "Punto C · Norte",
}

function ahoraISO(): string {
  return new Date().toISOString()
}

function haceDias(dias: number, horas = 13): string {
  return new Date(Date.now() - dias * 86_400_000 - horas * 3_600_000).toISOString()
}

function enDias(dias: number): string {
  return new Date(Date.now() + dias * 86_400_000).toISOString()
}

function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function diasHastaCumple(fechaNacimiento?: string): number | null {
  if (!fechaNacimiento) return null
  const cumple = new Date(`${fechaNacimiento}T00:00:00`)
  if (Number.isNaN(cumple.getTime())) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const proximo = new Date(hoy.getFullYear(), cumple.getMonth(), cumple.getDate())
  if (proximo < hoy) proximo.setFullYear(hoy.getFullYear() + 1)
  return Math.round((proximo.getTime() - hoy.getTime()) / 86_400_000)
}

/* -------------------------------------------------------------------------- */
/* Datos semilla                                                               */
/* -------------------------------------------------------------------------- */

function historialDemo(clienteId: string, pedidos: number, reservasActivas: number): ClienteHistorialItem[] {
  const canales = ["Web", "App", "Salón", "Teléfono"]
  const pedidosEstados: Array<{ estado: string; tone: ClienteHistorialItem["estadoTone"] }> = [
    { estado: "Pagado", tone: "green" },
    { estado: "Entregado", tone: "green" },
    { estado: "Cancelado", tone: "gray" },
  ]
  const items: ClienteHistorialItem[] = []
  const numeroBase = Number(clienteId.replace(/\D/g, "")) || 1

  for (let indice = 0; indice < Math.min(pedidos, 3); indice += 1) {
    const estado = pedidosEstados[indice % pedidosEstados.length] as { estado: string; tone: ClienteHistorialItem["estadoTone"] }
    items.push({
      id: `${clienteId}-ped-${indice}`,
      tipo: "pedido",
      folio: `P-${9000 + numeroBase * 7 + indice}`,
      fecha: haceDias(indice * 11 + 2),
      canal: canales[(numeroBase + indice) % canales.length] as string,
      origen: indice % 2 === 0 ? "Web" : "App",
      estado: estado.estado,
      estadoTone: estado.tone,
      totalCentavos: 18_500 + indice * 9_300,
    })
  }

  if (reservasActivas > 0) {
    items.push({
      id: `${clienteId}-res-activa`,
      tipo: "reserva",
      folio: `R-${4000 + numeroBase * 3}`,
      fecha: enDias(3),
      canal: "Web",
      origen: "Reserva en línea",
      estado: "Confirmada",
      estadoTone: "blue",
      totalCentavos: 0,
    })
  }
  items.push({
    id: `${clienteId}-res-pasada`,
    tipo: "reserva",
    folio: `R-${3000 + numeroBase * 3}`,
    fecha: haceDias(17),
    canal: "Teléfono",
    origen: "Panel admin",
    estado: "Atendida",
    estadoTone: "green",
    totalCentavos: 0,
  })

  return items.sort((a, b) => b.fecha.localeCompare(a.fecha))
}

function accesoDemo(clienteId: string, accion: AccesoRegistro["accion"], detalle: string, dias: number): AccesoRegistro {
  return {
    id: `${clienteId}-acc-${accion}-${dias}`,
    ...ACTOR,
    accion,
    detalle,
    dispositivo: DISPOSITIVO,
    fecha: haceDias(dias),
  }
}

type ClienteCfg = {
  id: string
  nombre: string
  telefono?: string
  correo?: string
  sucursalId?: string
  ultimaVisitaDias: number | null
  pedidos: number
  reservasActivas?: number
  gastoCentavos: number
  marketing: MarketingEstado
  segmentos: string[]
  anonimizado?: boolean
  fechaNacimiento?: string
  preferencias?: string[]
  notas?: string
  suscriptor?: boolean
  creadoDias: number
  actualizadoDias: number
}

function crearCliente(cfg: ClienteCfg): ClienteDetalle {
  const sucursalId = cfg.sucursalId ?? "centro"
  return {
    id: cfg.id,
    nombre: cfg.nombre,
    telefono: cfg.telefono ?? null,
    correo: cfg.correo ?? null,
    ultimaVisita: cfg.ultimaVisitaDias == null ? null : haceDias(cfg.ultimaVisitaDias),
    pedidos: cfg.pedidos,
    reservasActivas: cfg.reservasActivas ?? 0,
    totalGastadoCentavos: cfg.gastoCentavos,
    marketing: cfg.marketing,
    segmentos: cfg.segmentos,
    anonimizado: cfg.anonimizado ?? false,
    sucursalId,
    sucursalNombre: SUCURSAL_NOMBRE[sucursalId] ?? sucursalId,
    creadoEn: haceDias(cfg.creadoDias),
    actualizadoEn: haceDias(cfg.actualizadoDias),
    fechaNacimiento: cfg.fechaNacimiento,
    preferencias: cfg.preferencias ?? [],
    notas: cfg.notas,
    suscriptorActivo: cfg.suscriptor ?? cfg.marketing === "otorgado",
    historial: historialDemo(cfg.id, cfg.pedidos, cfg.reservasActivas ?? 0),
    accesos: cfg.anonimizado
      ? [accesoDemo(cfg.id, "anonimizacion", "Anonimización ARCO ejecutada (se conserva lo fiscal)", 12)]
      : [accesoDemo(cfg.id, "consulta", "Alta y primera consulta con datos completos", 30)],
  }
}

const CLIENTES: ClienteDetalle[] = [
  crearCliente({
    id: "c-001",
    nombre: "Laura Pérez",
    telefono: "+52 55 1234 5678",
    correo: "laura.perez@example.com",
    ultimaVisitaDias: 3,
    pedidos: 24,
    reservasActivas: 1,
    gastoCentavos: 1_845_000,
    marketing: "otorgado",
    segmentos: ["Recurrentes"],
    fechaNacimiento: "1990-10-18",
    preferencias: ["Mesa exterior", "Sin gluten"],
    notas: "Clienta frecuente; prefiere la terraza y avisar por WhatsApp antes de llegar.",
    creadoDias: 420,
    actualizadoDias: 3,
  }),
  crearCliente({
    id: "c-002",
    nombre: "Carlos Méndez",
    telefono: "+52 55 2233 4455",
    correo: "carlos.mendez@example.com",
    ultimaVisitaDias: 12,
    pedidos: 8,
    reservasActivas: 0,
    gastoCentavos: 612_000,
    marketing: "otorgado",
    segmentos: [],
    preferencias: ["Factura mensual"],
    creadoDias: 300,
    actualizadoDias: 12,
  }),
  crearCliente({
    id: "c-003",
    nombre: "Ana Morales",
    telefono: "+52 55 3344 5566",
    correo: "ana.morales@example.com",
    ultimaVisitaDias: 74,
    pedidos: 5,
    gastoCentavos: 287_000,
    marketing: "revocado",
    segmentos: ["Inactivos 60 días"],
    notas: "Solicitó baja de marketing en marzo; no enviar promociones.",
    creadoDias: 240,
    actualizadoDias: 70,
  }),
  crearCliente({
    id: "c-004",
    nombre: "Diego Ramírez",
    telefono: "+52 55 4455 6677",
    correo: "diego.ramirez@example.com",
    ultimaVisitaDias: 21,
    pedidos: 3,
    gastoCentavos: 98_500,
    marketing: "sin_solicitar",
    segmentos: [],
    creadoDias: 60,
    actualizadoDias: 21,
  }),
  crearCliente({
    id: "c-005",
    nombre: "Sofía Herrera",
    telefono: "+52 55 5566 7788",
    correo: "sofia.herrera@example.com",
    ultimaVisitaDias: 6,
    pedidos: 11,
    reservasActivas: 2,
    gastoCentavos: 734_000,
    marketing: "otorgado",
    segmentos: ["Recurrentes"],
    fechaNacimiento: "1992-10-12",
    preferencias: ["Cumpleaños en salón", "Tarta de chocolate"],
    creadoDias: 200,
    actualizadoDias: 6,
  }),
  crearCliente({
    id: "c-006",
    nombre: "Jorge Castillo",
    telefono: "+52 55 6677 8899",
    correo: "jorge.castillo@example.com",
    ultimaVisitaDias: 45,
    pedidos: 14,
    gastoCentavos: 902_000,
    marketing: "revocado",
    segmentos: [],
    notas: "Opt-out de correo; acepta contacto por teléfono solo para su pedido.",
    creadoDias: 500,
    actualizadoDias: 40,
  }),
  crearCliente({
    id: "c-007",
    nombre: "Marta Ruiz",
    telefono: "+52 55 7788 9900",
    correo: "marta.ruiz@example.com",
    ultimaVisitaDias: 96,
    pedidos: 19,
    gastoCentavos: 1_120_000,
    marketing: "otorgado",
    segmentos: ["Inactivos 60 días", "Recurrentes"],
    creadoDias: 610,
    actualizadoDias: 90,
  }),
  crearCliente({
    id: "c-008",
    nombre: "Pablo Núñez",
    telefono: "+52 55 8899 0011",
    ultimaVisitaDias: null,
    pedidos: 1,
    gastoCentavos: 24_500,
    marketing: "sin_solicitar",
    segmentos: [],
    notas: "Solo teléfono: no compartió correo.",
    creadoDias: 15,
    actualizadoDias: 15,
  }),
  crearCliente({
    id: "c-009",
    nombre: "Elena Ríos",
    telefono: "+52 55 9900 1122",
    correo: "elena.rios@example.com",
    sucursalId: "norte",
    ultimaVisitaDias: 9,
    pedidos: 21,
    reservasActivas: 1,
    gastoCentavos: 1_533_000,
    marketing: "otorgado",
    segmentos: ["Recurrentes"],
    preferencias: ["Mesa tranquila"],
    creadoDias: 380,
    actualizadoDias: 9,
  }),
  crearCliente({
    id: "c-010",
    nombre: "Cliente anonimizado C010",
    sucursalId: "norte",
    ultimaVisitaDias: 150,
    pedidos: 7,
    gastoCentavos: 356_000,
    marketing: "revocado",
    segmentos: [],
    anonimizado: true,
    creadoDias: 520,
    actualizadoDias: 12,
  }),
]

function consentimientosBase(cliente: ClienteDetalle): Consentimiento[] {
  return [
    {
      id: `${cliente.id}-cons-datos`,
      clienteId: cliente.id,
      tipo: "datos",
      canal: "todos",
      baseLegal: "contrato",
      otorgadoEn: cliente.creadoEn,
    },
    {
      id: `${cliente.id}-cons-marketing`,
      clienteId: cliente.id,
      tipo: "marketing",
      canal: "email",
      baseLegal: "consentimiento",
      otorgadoEn: cliente.creadoEn,
      revocadoEn: cliente.marketing === "revocado" ? cliente.actualizadoEn : undefined,
      motivoRevocacion: cliente.marketing === "revocado" ? "Opt-out solicitado por el titular" : undefined,
    },
    {
      id: `${cliente.id}-cons-cookies`,
      clienteId: cliente.id,
      tipo: "cookies",
      canal: "web",
      baseLegal: "consentimiento",
      otorgadoEn: cliente.creadoEn,
      vigenciaHasta: enDias(365),
    },
  ]
}

const CONSENTIMIENTOS: Consentimiento[] = CLIENTES.flatMap(consentimientosBase)

const SEGMENTOS_BASE: Array<Omit<Segmento, "conteo">> = [
  {
    id: "seg-recurrentes",
    nombre: "Recurrentes",
    criterio: { tipo: "recurrentes", minimoPedidos: 6 },
    actualizadoEn: haceDias(20),
  },
  {
    id: "seg-inactivos",
    nombre: "Inactivos 60 días",
    criterio: { tipo: "inactivos", diasInactividad: 60 },
    actualizadoEn: haceDias(15),
  },
  {
    id: "seg-cumple",
    nombre: "Cumpleaños próximos",
    criterio: { tipo: "cumpleanos", diasAntesCumpleanos: 14 },
    actualizadoEn: haceDias(8),
  },
]

const SEGMENTOS: Array<Omit<Segmento, "conteo">> = [...SEGMENTOS_BASE]

/* -------------------------------------------------------------------------- */
/* Criterios de segmento (V2)                                                  */
/* -------------------------------------------------------------------------- */

export function coincideCriterio(cliente: ClienteDetalle, criterio: CriterioSegmento): boolean {
  if (cliente.anonimizado) return false
  switch (criterio.tipo) {
    case "recurrentes":
      return cliente.pedidos >= (criterio.minimoPedidos ?? 5)
    case "inactivos":
      return cliente.ultimaVisita != null && diasDesde(cliente.ultimaVisita) >= (criterio.diasInactividad ?? 60)
    case "cumpleanos": {
      const dias = diasHastaCumple(cliente.fechaNacimiento)
      return dias != null && dias <= (criterio.diasAntesCumpleanos ?? 14)
    }
    default:
      return false
  }
}

export function contarSegmento(criterio: CriterioSegmento): number {
  return CLIENTES.filter((cliente) => coincideCriterio(cliente, criterio)).length
}

/** Vista previa del conteo y muestra enmascarada antes de usar el segmento. */
export function vistaPreviaSegmento(criterio: CriterioSegmento): VistaPreviaSegmento {
  const coincidentes = CLIENTES.filter((cliente) => coincideCriterio(cliente, criterio))
  return {
    conteo: coincidentes.length,
    muestra: coincidentes.slice(0, 5).map((cliente) => maskName(cliente.nombre)),
  }
}

function conConteo(segmento: Omit<Segmento, "conteo">): Segmento {
  return { ...segmento, conteo: contarSegmento(segmento.criterio) }
}

/* -------------------------------------------------------------------------- */
/* Utilidades de servidor (mock)                                               */
/* -------------------------------------------------------------------------- */

function buscarCliente(id: string): ClienteDetalle {
  const cliente = CLIENTES.find((item) => item.id === id)
  if (!cliente) throw new ApiError(404, "El cliente no existe.", "cliente_no_encontrado")
  return cliente
}

function buscarConsentimiento(clienteId: string, consentimientoId: string): Consentimiento {
  const consentimiento = CONSENTIMIENTOS.find(
    (item) => item.clienteId === clienteId && item.id === consentimientoId,
  )
  if (!consentimiento) throw new ApiError(404, "El consentimiento no existe.", "consentimiento_no_encontrado")
  return consentimiento
}

function registrar(
  cliente: ClienteDetalle,
  accion: AccesoRegistro["accion"],
  detalle: string,
): AccesoRegistro {
  const registro: AccesoRegistro = {
    id: `${cliente.id}-acc-${accion}-${Date.now().toString(36)}`,
    ...ACTOR,
    accion,
    detalle,
    dispositivo: DISPOSITIVO,
    fecha: ahoraISO(),
  }
  cliente.accesos.unshift(registro)
  if (cliente.accesos.length > 40) cliente.accesos.pop()
  return registro
}

function validarMotivo(motivo: string | undefined, mensaje: string): string {
  const limpio = motivo?.trim() ?? ""
  if (limpio.length < 3) throw new ApiError(422, mensaje, "motivo_requerido")
  return limpio
}

function filtrarClientes(filtros: ClientesFiltros): ClienteLista[] {
  let items = [...CLIENTES]
  const busqueda = filtros.busqueda?.trim().toLowerCase()
  if (busqueda) {
    items = items.filter(
      (cliente) =>
        cliente.nombre.toLowerCase().includes(busqueda) ||
        (cliente.telefono ?? "").toLowerCase().includes(busqueda) ||
        (cliente.correo ?? "").toLowerCase().includes(busqueda),
    )
  }
  if (filtros.marketing === "con") items = items.filter((cliente) => cliente.marketing === "otorgado")
  if (filtros.marketing === "sin") items = items.filter((cliente) => cliente.marketing !== "otorgado")
  if (filtros.sucursalId) items = items.filter((cliente) => cliente.sucursalId === filtros.sucursalId)
  if (filtros.desde || filtros.hasta) {
    items = items.filter((cliente) => {
      if (!cliente.ultimaVisita) return false
      const fecha = cliente.ultimaVisita.slice(0, 10)
      if (filtros.desde && fecha < filtros.desde) return false
      if (filtros.hasta && fecha > filtros.hasta) return false
      return true
    })
  }
  if (filtros.segmentoId) {
    const segmento = SEGMENTOS.find((item) => item.id === filtros.segmentoId)
    if (segmento) items = items.filter((cliente) => coincideCriterio(cliente, segmento.criterio))
  }
  return items.sort((a, b) => (b.ultimaVisita ?? "").localeCompare(a.ultimaVisita ?? ""))
}

/* -------------------------------------------------------------------------- */
/* Mocks registrados                                                           */
/* -------------------------------------------------------------------------- */

registerMock("GET", /^\/admin\/clientes$/, (ctx) => {
  const q = ctx.query
  const page = Math.max(1, Number(q.page ?? 1))
  const pageSize = Math.max(1, Number(q.pageSize ?? 10))
  const items = filtrarClientes({
    page,
    pageSize,
    busqueda: typeof q.busqueda === "string" ? q.busqueda : undefined,
    marketing: q.marketing === "con" || q.marketing === "sin" ? q.marketing : undefined,
    sucursalId: typeof q.sucursalId === "string" ? q.sucursalId : undefined,
    desde: typeof q.desde === "string" ? q.desde : undefined,
    hasta: typeof q.hasta === "string" ? q.hasta : undefined,
    segmentoId: typeof q.segmentoId === "string" ? q.segmentoId : undefined,
  })
  const inicio = (page - 1) * pageSize
  const respuesta: ClientesRespuesta = {
    data: items.slice(inicio, inicio + pageSize),
    total: items.length,
    page,
    pageSize,
  }
  return respuesta
})

registerMock("GET", /^\/admin\/clientes\/export$/, (ctx) => {
  const q = ctx.query
  const total = filtrarClientes({
    page: 1,
    pageSize: LIMITE_EXPORTACION,
    busqueda: typeof q.busqueda === "string" ? q.busqueda : undefined,
    marketing: q.marketing === "con" || q.marketing === "sin" ? q.marketing : undefined,
    sucursalId: typeof q.sucursalId === "string" ? q.sucursalId : undefined,
    segmentoId: typeof q.segmentoId === "string" ? q.segmentoId : undefined,
  }).length
  const exportacion: ExportacionClientes = {
    id: `exp-${Date.now().toString(36)}`,
    tipo: "lista_clientes",
    formato: "csv",
    estado: total > LIMITE_EXPORTACION ? "en_proceso" : "lista",
    creadoEn: ahoraISO(),
    total,
  }
  return exportacion
})

registerMock("GET", /^\/admin\/clientes\/segmentos$/, () => {
  return { data: SEGMENTOS.map(conConteo), total: SEGMENTOS.length }
})

registerMock("POST", /^\/admin\/clientes\/segmentos$/, (ctx) => {
  const body = (ctx.body ?? {}) as { nombre?: string; criterio?: CriterioSegmento }
  const nombre = body.nombre?.trim()
  if (!nombre) throw new ApiError(422, "El nombre del segmento es obligatorio.", "nombre_requerido")
  if (SEGMENTOS.some((segmento) => segmento.nombre.toLowerCase() === nombre.toLowerCase())) {
    throw new ApiError(409, "Ya existe un segmento con ese nombre.", "segmento_duplicado")
  }
  const segmento: Omit<Segmento, "conteo"> = {
    id: `seg-${Date.now().toString(36)}`,
    nombre,
    criterio: body.criterio ?? { tipo: "recurrentes", minimoPedidos: 5 },
    actualizadoEn: ahoraISO(),
  }
  SEGMENTOS.push(segmento)
  return conConteo(segmento)
})

registerMock("PATCH", /^\/admin\/clientes\/segmentos\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const segmento = SEGMENTOS.find((item) => item.id === id)
  if (!segmento) throw new ApiError(404, "El segmento no existe.", "segmento_no_encontrado")
  const body = (ctx.body ?? {}) as { nombre?: string; criterio?: CriterioSegmento }
  if (body.nombre?.trim()) segmento.nombre = body.nombre.trim()
  if (body.criterio) segmento.criterio = body.criterio
  segmento.actualizadoEn = ahoraISO()
  return conConteo(segmento)
})

registerMock("GET", /^\/admin\/clientes\/([^/]+)\/consentimientos$/, (ctx) => {
  const clienteId = ctx.path.split("/")[3] ?? ""
  buscarCliente(clienteId)
  const items = CONSENTIMIENTOS.filter((consentimiento) => consentimiento.clienteId === clienteId).sort((a, b) =>
    b.otorgadoEn.localeCompare(a.otorgadoEn),
  )
  return { data: items, total: items.length }
})

registerMock("POST", /^\/admin\/clientes\/([^/]+)\/consentimientos$/, (ctx) => {
  const clienteId = ctx.path.split("/")[3] ?? ""
  const cliente = buscarCliente(clienteId)
  const body = (ctx.body ?? {}) as Partial<ConsentimientoPayload>
  const motivo = validarMotivo(body.motivo, "Otorgar un consentimiento requiere motivo.")
  if (!body.tipo || !body.canal || !body.baseLegal) {
    throw new ApiError(422, "Indica tipo, canal y base legal del consentimiento.", "consentimiento_incompleto")
  }
  const consentimiento: Consentimiento = {
    id: `${cliente.id}-cons-${Date.now().toString(36)}`,
    clienteId: cliente.id,
    tipo: body.tipo,
    canal: body.canal,
    baseLegal: body.baseLegal,
    otorgadoEn: ahoraISO(),
    vigenciaHasta: body.vigenciaHasta || undefined,
  }
  CONSENTIMIENTOS.push(consentimiento)
  if (body.tipo === "marketing") {
    cliente.marketing = "otorgado"
    cliente.suscriptorActivo = body.canal === "email" || body.canal === "todos"
  }
  cliente.actualizadoEn = ahoraISO()
  registrar(cliente, "consentimiento", `Otorgó «${body.tipo}» por ${body.canal}: ${motivo}`)
  return consentimiento
})

registerMock("POST", /^\/admin\/clientes\/([^/]+)\/consentimientos\/([^/]+)\/revocar$/, (ctx) => {
  const clienteId = ctx.path.split("/")[3] ?? ""
  const consentimientoId = ctx.path.split("/")[5] ?? ""
  const cliente = buscarCliente(clienteId)
  const consentimiento = buscarConsentimiento(clienteId, consentimientoId)
  const motivo = validarMotivo(ctx.body ? (ctx.body as { motivo?: string }).motivo : undefined, "Revocar requiere motivo.")
  if (consentimiento.revocadoEn) {
    throw new ApiError(409, "El consentimiento ya está revocado.", "consentimiento_ya_revocado")
  }
  consentimiento.revocadoEn = ahoraISO()
  consentimiento.motivoRevocacion = motivo
  if (consentimiento.tipo === "marketing") {
    cliente.marketing = "revocado"
    cliente.suscriptorActivo = false
  }
  cliente.actualizadoEn = ahoraISO()
  registrar(
    cliente,
    "consentimiento",
    consentimiento.tipo === "marketing"
      ? `Opt-out de marketing (${consentimiento.canal}): se cancelan envíos pendientes y se desactiva el suscriptor.`
      : `Revocó «${consentimiento.tipo}»: ${motivo}`,
  )
  return consentimiento
})

registerMock("POST", /^\/admin\/clientes\/([^/]+)\/accesos$/, (ctx) => {
  const clienteId = ctx.path.split("/")[3] ?? ""
  const cliente = buscarCliente(clienteId)
  const body = (ctx.body ?? {}) as { campo?: string }
  const registro = registrar(
    cliente,
    "consulta",
    body.campo ? `Consulta sensible: reveló el campo «${body.campo}»` : "Consulta sensible de la ficha",
  )
  return registro
})

registerMock("GET", /^\/admin\/clientes\/([^/]+)\/export$/, (ctx) => {
  const clienteId = ctx.path.split("/")[3] ?? ""
  const cliente = buscarCliente(clienteId)
  registrar(cliente, "exportacion", "Derecho de acceso ARCO: exportación de los datos del cliente")
  const exportacion: ExportacionClientes = {
    id: `exp-${Date.now().toString(36)}`,
    tipo: "acceso_cliente",
    formato: "csv",
    estado: "en_proceso",
    creadoEn: ahoraISO(),
    total: 1,
  }
  return exportacion
})

registerMock("PATCH", /^\/admin\/clientes\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const cliente = buscarCliente(id)
  const body = (ctx.body ?? {}) as Partial<ClientePatch>
  if (cliente.anonimizado) {
    throw new ApiError(409, "El cliente está anonimizado: no admite rectificación.", "cliente_anonimizado")
  }
  const motivo = validarMotivo(body.motivo, "La rectificación requiere motivo.")
  if (body.actualizadoEn && body.actualizadoEn !== cliente.actualizadoEn) {
    throw new ApiError(
      409,
      "Otro usuario modificó la ficha mientras editabas. Recarga y vuelve a intentarlo.",
      "conflicto_edicion",
    )
  }
  const antes = [cliente.nombre, cliente.telefono ?? "sin teléfono", cliente.correo ?? "sin correo"].join(" · ")
  if (body.nombre?.trim()) cliente.nombre = body.nombre.trim()
  if (body.telefono !== undefined) cliente.telefono = body.telefono.trim() || null
  if (body.correo !== undefined) cliente.correo = body.correo.trim() || null
  if (body.fechaNacimiento !== undefined) cliente.fechaNacimiento = body.fechaNacimiento || undefined
  if (body.preferencias !== undefined) cliente.preferencias = body.preferencias
  if (body.notas !== undefined) cliente.notas = body.notas.trim() || undefined
  cliente.actualizadoEn = ahoraISO()
  const despues = [cliente.nombre, cliente.telefono ?? "sin teléfono", cliente.correo ?? "sin correo"].join(" · ")
  registrar(cliente, "rectificacion", `Rectificación: ${antes} → ${despues}. Motivo: ${motivo}`)
  return cliente
})

registerMock("POST", /^\/admin\/clientes\/([^/]+)\/anonimizar$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const cliente = buscarCliente(id)
  const body = (ctx.body ?? {}) as Partial<AnonimizarPayload>
  if (cliente.anonimizado) {
    throw new ApiError(409, "El cliente ya está anonimizado.", "cliente_anonimizado")
  }
  if (body.confirmacion !== "ANONIMIZAR") {
    throw new ApiError(422, "Escribe ANONIMIZAR para confirmar la acción irreversible.", "confirmacion_invalida")
  }
  const motivo = validarMotivo(body.motivo, "La anonimización requiere motivo.")
  const sufijo = cliente.id.replace(/\D/g, "").slice(-4).padStart(4, "0")
  cliente.nombre = `Cliente anonimizado C${sufijo}`
  cliente.telefono = null
  cliente.correo = null
  cliente.fechaNacimiento = undefined
  cliente.preferencias = []
  cliente.notas = undefined
  cliente.segmentos = []
  cliente.marketing = "revocado"
  cliente.suscriptorActivo = false
  cliente.anonimizado = true
  cliente.actualizadoEn = ahoraISO()
  for (const consentimiento of CONSENTIMIENTOS.filter(
    (item) => item.clienteId === cliente.id && !item.revocadoEn,
  )) {
    consentimiento.revocadoEn = ahoraISO()
    consentimiento.motivoRevocacion = "Anonimización ARCO (RN-R5-09)"
  }
  registrar(
    cliente,
    "anonimizacion",
    `Anonimización irreversible: se conservan importes, fechas, códigos y facturas para reportes fiscales. Motivo: ${motivo}`,
  )
  return cliente
})

registerMock("GET", /^\/admin\/clientes\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const cliente = buscarCliente(id)
  const conDatos = ctx.query.conDatos === "true" || ctx.query.conDatos === true
  if (conDatos && !cliente.anonimizado) {
    registrar(cliente, "consulta", "Ficha abierta con datos completos (consulta sensible RNF-R5-09)")
  }
  return cliente
})

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function useClientes(filtros: ClientesFiltros) {
  return useQuery({
    queryKey: ["clientes", "lista", filtros],
    queryFn: () => api.get<ClientesRespuesta>("/admin/clientes", filtros as unknown as Query),
    placeholderData: keepPreviousData,
  })
}

export function useClienteDetalle(id: string | null, conDatos: boolean) {
  return useQuery({
    queryKey: ["clientes", "detalle", id, conDatos],
    queryFn: () => api.get<ClienteDetalle>(`/admin/clientes/${id}`, { conDatos }),
    enabled: Boolean(id),
  })
}

export function useActualizarCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ClientePatch }) =>
      api.patch<ClienteDetalle>(`/admin/clientes/${id}`, payload),
    onSuccess: (_cliente, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["clientes"] })
      void queryClient.invalidateQueries({ queryKey: ["clientes", "detalle", variables.id] })
    },
  })
}

export function useConsentimientos(clienteId: string | null) {
  return useQuery({
    queryKey: ["clientes", "consentimientos", clienteId],
    queryFn: () =>
      api.get<{ data: Consentimiento[]; total: number }>(`/admin/clientes/${clienteId}/consentimientos`),
    enabled: Boolean(clienteId),
  })
}

export function useOtorgarConsentimiento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ clienteId, payload }: { clienteId: string; payload: ConsentimientoPayload }) =>
      api.post<Consentimiento>(`/admin/clientes/${clienteId}/consentimientos`, payload),
    onSuccess: (_consentimiento, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["clientes", "consentimientos", variables.clienteId] })
      void queryClient.invalidateQueries({ queryKey: ["clientes", "detalle", variables.clienteId] })
    },
  })
}

export function useRevocarConsentimiento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      clienteId,
      consentimientoId,
      motivo,
    }: {
      clienteId: string
      consentimientoId: string
      motivo: string
    }) =>
      api.post<Consentimiento>(`/admin/clientes/${clienteId}/consentimientos/${consentimientoId}/revocar`, {
        motivo,
      }),
    onSuccess: (_consentimiento, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["clientes", "consentimientos", variables.clienteId] })
      void queryClient.invalidateQueries({ queryKey: ["clientes", "detalle", variables.clienteId] })
    },
  })
}

export function useRegistrarAcceso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ clienteId, campo }: { clienteId: string; campo: string }) =>
      api.post<AccesoRegistro>(`/admin/clientes/${clienteId}/accesos`, { campo }),
    onSuccess: (_registro, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["clientes", "detalle", variables.clienteId] })
    },
  })
}

export function useAnonimizarCliente() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AnonimizarPayload }) =>
      api.post<ClienteDetalle>(`/admin/clientes/${id}/anonimizar`, payload),
    onSuccess: (_cliente, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["clientes"] })
      void queryClient.invalidateQueries({ queryKey: ["clientes", "detalle", variables.id] })
    },
  })
}

export function useExportarCliente() {
  return useMutation({
    mutationFn: (clienteId: string) => api.get<ExportacionClientes>(`/admin/clientes/${clienteId}/export`),
  })
}

export function useExportarClientes() {
  return useMutation({
    mutationFn: (filtros: ClientesFiltros) =>
      api.get<ExportacionClientes>("/admin/clientes/export", filtros as unknown as Query),
  })
}

export function useSegmentos() {
  return useQuery({
    queryKey: ["clientes", "segmentos"],
    queryFn: () => api.get<{ data: Segmento[]; total: number }>("/admin/clientes/segmentos"),
  })
}

export function useGuardarSegmento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre, criterio }: { id?: string; nombre: string; criterio: CriterioSegmento }) =>
      id
        ? api.patch<Segmento>(`/admin/clientes/segmentos/${id}`, { nombre, criterio })
        : api.post<Segmento>("/admin/clientes/segmentos", { nombre, criterio }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["clientes", "segmentos"] })
    },
  })
}
