import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError, registerMock, type Query } from "@/lib/api"
import type {
  ConsecutivoConfig,
  ConfigFiscal,
  ConfigFiscalPayload,
  DiagnosticoProveedor,
  EstadoDian,
  ExportacionResp,
  FacturaDetalle,
  FacturaEvento,
  FacturaFila,
  FacturaLinea,
  FacturaFiltros,
  FacturasResp,
  ImpuestoAplicado,
  ImpuestoConfig,
  NotaCreditoPayload,
  ReintentoProveedor,
} from "@/modules/facturacion/types"
import { ESTADO_DIAN_TONE } from "@/modules/facturacion/types"

/* -------------------------------------------------------------------------- */
/* Mock de desarrollo                                                          */
/* Se retira cuando el backend NestJS exponga `/admin/facturacion/*`.         */
/* -------------------------------------------------------------------------- */

const SEDES: Record<string, { nombre: string; zonaHoraria: string; moneda: string }> = {
  centro: { nombre: "Punto C · Centro", zonaHoraria: "America/Mexico_City", moneda: "MXN" },
  norte: { nombre: "Punto C · Norte", zonaHoraria: "America/Mexico_City", moneda: "MXN" },
}

function isoHaceDias(dias: number, hhmm: string): string {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - dias)
  const [horas, minutos] = hhmm.split(":").map(Number)
  fecha.setHours(horas, minutos, 0, 0)
  return fecha.toISOString()
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

function sumarDias(dias: number): string {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + dias)
  return fechaLocal(fecha.toISOString())
}

const IVA_BPS = 1_600

function vigenciaEstado(vigenciaHasta: string): ConsecutivoConfig["vigenciaEstado"] {
  const hoy = hoyISO()
  if (vigenciaHasta < hoy) return "vencida"
  if (vigenciaHasta <= sumarDias(30)) return "por_vencer"
  return "vigente"
}

type LineaCfg = { descripcion: string; cantidad: number; precioCentavos: number }

type FacturaCfg = {
  id: string
  tipo?: "factura" | "nota_credito"
  prefijo: string
  numero: string
  pedidoId: string
  pedidoCodigo: string
  pedidoEstado: string
  turnoId: string
  turnoNumero: string
  resolucion: string
  cufe: string | null
  estadoDian: EstadoDian
  emitidaEn: string
  lineas: LineaCfg[]
  pagos: { id: string; medioNombre: string; montoCentavos: number; estado: string }[]
  facturaOriginalId?: string
  xml?: string
  pdf?: string
  reintentos?: Omit<ReintentoProveedor, "id">[]
  causaRechazo?: string
}

function construirFactura(cfg: FacturaCfg): FacturaDetalle {
  const subtotal = cfg.lineas.reduce((total, linea) => total + linea.cantidad * linea.precioCentavos, 0)
  const impuestosCentavos = Math.round(subtotal * (IVA_BPS / 10_000))
  const lineas: FacturaLinea[] = cfg.lineas.map((linea, index) => {
    const total = linea.cantidad * linea.precioCentavos
    return {
      id: `${cfg.id}-l${index + 1}`,
      descripcion: linea.descripcion,
      cantidad: linea.cantidad,
      precioCentavos: linea.precioCentavos,
      impuestoNombre: "IVA 16%",
      impuestoCentavos: Math.round(total * (IVA_BPS / 10_000)),
      totalCentavos: total,
    }
  })
  const impuestos: ImpuestoAplicado[] = [
    { nombre: "IVA 16%", tasaBps: IVA_BPS, baseCentavos: subtotal, impuestoCentavos: impuestosCentavos },
  ]

  const timeline: FacturaEvento[] = []
  const push = (accion: FacturaEvento["accion"], ocurridoEn: string, actor: string, causa?: string) => {
    timeline.push({ id: `${cfg.id}-e${timeline.length + 1}`, accion, ocurridoEn, actor, causa })
  }

  push("emitida", cfg.emitidaEn, "Caja")
  if (cfg.estadoDian !== "pendiente") {
    push("enviada", cfg.emitidaEn, "Proveedor de facturación")
  }
  if (cfg.estadoDian === "aceptada") {
    push("aceptada", cfg.emitidaEn, "DIAN")
  }
  if (cfg.estadoDian === "rechazada") {
    push("rechazada", cfg.emitidaEn, "DIAN", cfg.causaRechazo ?? "Rechazo del proveedor sin causa reportada.")
  }
  if (cfg.estadoDian === "anulada") {
    push("anulada", cfg.emitidaEn, "María Gómez", "Nota crédito emitida sobre el documento original.")
  }
  for (const reintento of cfg.reintentos ?? []) {
    push("reintento", reintento.ocurridoEn, "María Gómez", reintento.causa)
  }

  const reintentable = cfg.estadoDian === "pendiente" || cfg.estadoDian === "rechazada"
  const motivoNoReintentable = reintentable
    ? null
    : cfg.estadoDian === "enviada"
      ? "La factura está en trámite ante el proveedor; espera la respuesta antes de reintentar."
      : cfg.estadoDian === "aceptada"
        ? "Una factura aceptada no se reenvía; para revertirla usa una nota crédito."
        : "Una factura anulada no se reintenta."

  const ultimoReintento = cfg.reintentos?.[cfg.reintentos.length - 1]

  return {
    id: cfg.id,
    tipo: cfg.tipo ?? "factura",
    prefijo: cfg.prefijo,
    numero: cfg.numero,
    pedidoId: cfg.pedidoId,
    pedidoCodigo: cfg.pedidoCodigo,
    resolucion: cfg.resolucion,
    cufe: cfg.cufe,
    estadoDian: cfg.estadoDian,
    estadoTone: ESTADO_DIAN_TONE[cfg.estadoDian],
    totalCentavos: subtotal + impuestosCentavos,
    impuestosCentavos,
    emitidaEn: cfg.emitidaEn,
    facturaOriginalId: cfg.facturaOriginalId ?? null,
    moneda: SEDES.centro.moneda,
    zonaHoraria: SEDES.centro.zonaHoraria,
    facturaOriginal: null,
    pedido: {
      id: cfg.pedidoId,
      codigo: cfg.pedidoCodigo,
      estado: cfg.pedidoEstado,
      totalCentavos: subtotal + impuestosCentavos,
      turnoId: cfg.turnoId,
      turnoNumero: cfg.turnoNumero,
    },
    pagos: cfg.pagos,
    lineas,
    impuestos,
    xmlUrl: cfg.xml ?? null,
    pdfUrl: cfg.pdf ?? null,
    notasCredito: [],
    timeline,
    reintentos: (cfg.reintentos ?? []).map((reintento, index) => ({ ...reintento, id: `${cfg.id}-r${index + 1}` })),
    reintentable,
    motivoNoReintentable,
    errorProveedor:
      cfg.estadoDian === "rechazada"
        ? {
            causa: cfg.causaRechazo ?? "Rechazo del proveedor sin causa reportada.",
            ocurridoEn: cfg.emitidaEn,
            intentos: (cfg.reintentos?.length ?? 0) + 1,
          }
        : ultimoReintento?.resultado === "error_red"
          ? {
              causa: ultimoReintento.causa ?? "Error de red del proveedor.",
              ocurridoEn: ultimoReintento.ocurridoEn,
              intentos: cfg.reintentos?.length ?? 1,
            }
          : null,
  }
}

const CONFIGS: FacturaCfg[] = [
  {
    id: "f-1042",
    prefijo: "FE",
    numero: "1042",
    pedidoId: "p-9001",
    pedidoCodigo: "P-9001",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-104",
    turnoNumero: "T-104",
    resolucion: "RES-18745-2024",
    cufe: "CUFE-9f2c41a0-1042",
    estadoDian: "aceptada",
    emitidaEn: isoHaceDias(1, "10:20"),
    lineas: [
      { descripcion: "Arrachera al carbón", cantidad: 2, precioCentavos: 18_500 },
      { descripcion: "Guacamole con totopos", cantidad: 1, precioCentavos: 9_500 },
    ],
    pagos: [{ id: "pg-901", medioNombre: "Efectivo", montoCentavos: 84_500, estado: "aprobado" }],
    xml: "/exportes/facturas/f-1042.xml",
    pdf: "/exportes/facturas/f-1042.pdf",
  },
  {
    id: "f-1043",
    prefijo: "FE",
    numero: "1043",
    pedidoId: "p-9002",
    pedidoCodigo: "P-9002",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-104",
    turnoNumero: "T-104",
    resolucion: "RES-18745-2024",
    cufe: "CUFE-1a77be31-1043",
    estadoDian: "enviada",
    emitidaEn: isoHaceDias(1, "10:55"),
    lineas: [
      { descripcion: "Tacos de canasta", cantidad: 3, precioCentavos: 7_500 },
      { descripcion: "Agua de horchata", cantidad: 2, precioCentavos: 3_500 },
    ],
    pagos: [{ id: "pg-902", medioNombre: "Tarjeta débito/crédito", montoCentavos: 32_000, estado: "aprobado" }],
    xml: "/exportes/facturas/f-1043.xml",
    pdf: "/exportes/facturas/f-1043.pdf",
  },
  {
    id: "f-1046",
    prefijo: "FE",
    numero: "1046",
    pedidoId: "p-9006",
    pedidoCodigo: "P-9006",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-105",
    turnoNumero: "T-105",
    resolucion: "RES-18745-2024",
    cufe: "CUFE-77bd9c02-1046",
    estadoDian: "rechazada",
    emitidaEn: isoHaceDias(1, "20:20"),
    causaRechazo: "El proveedor rechazó: el NIT del adquiriente no corresponde al documento.",
    lineas: [
      { descripcion: "Parrillada para dos", cantidad: 1, precioCentavos: 89_000 },
      { descripcion: "Postre de la casa", cantidad: 2, precioCentavos: 15_000 },
    ],
    pagos: [{ id: "pg-906", medioNombre: "Tarjeta débito/crédito", montoCentavos: 152_000, estado: "aprobado" }],
    reintentos: [
      {
        intento: 1,
        ocurridoEn: isoHaceDias(1, "20:25"),
        resultado: "error_red",
        causa: "El proveedor no respondió (timeout de 30 s). Se reintentará en automático.",
      },
      {
        intento: 2,
        ocurridoEn: isoHaceDias(1, "20:27"),
        resultado: "rechazada",
        causa: "El proveedor rechazó: el NIT del adquiriente no corresponde al documento.",
      },
    ],
  },
  {
    id: "f-1048",
    prefijo: "FE",
    numero: "1048",
    pedidoId: "p-9008",
    pedidoCodigo: "P-9008",
    pedidoEstado: "reembolsado",
    turnoId: "tn-centro-105",
    turnoNumero: "T-105",
    resolucion: "RES-18745-2024",
    cufe: "CUFE-33e0aa51-1048",
    estadoDian: "anulada",
    emitidaEn: isoHaceDias(1, "21:40"),
    lineas: [{ descripcion: "Pizza pepperoni", cantidad: 1, precioCentavos: 41_200 }],
    pagos: [{ id: "pg-908", medioNombre: "Transferencia", montoCentavos: 41_200, estado: "reembolsado" }],
    xml: "/exportes/facturas/f-1048.xml",
    pdf: "/exportes/facturas/f-1048.pdf",
  },
  {
    id: "f-1048-nc",
    tipo: "nota_credito",
    prefijo: "NC",
    numero: "0007",
    pedidoId: "p-9008",
    pedidoCodigo: "P-9008",
    pedidoEstado: "reembolsado",
    turnoId: "tn-centro-105",
    turnoNumero: "T-105",
    resolucion: "RES-18745-2024",
    cufe: "CUFE-nc0007-1048",
    estadoDian: "aceptada",
    emitidaEn: isoHaceDias(1, "21:52"),
    facturaOriginalId: "f-1048",
    lineas: [{ descripcion: "Anulación factura FE-1048 · Pedido cancelado", cantidad: 1, precioCentavos: 41_200 }],
    pagos: [],
    xml: "/exportes/facturas/f-1048-nc.xml",
    pdf: "/exportes/facturas/f-1048-nc.pdf",
  },
  {
    id: "f-1049",
    prefijo: "FE",
    numero: "1049",
    pedidoId: "p-9010",
    pedidoCodigo: "P-9010",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-106",
    turnoNumero: "T-106",
    resolucion: "RES-18745-2024",
    cufe: null,
    estadoDian: "pendiente",
    emitidaEn: isoHaceDias(0, "03:10"),
    lineas: [{ descripcion: "Café americano", cantidad: 2, precioCentavos: 4_000 }],
    pagos: [{ id: "pg-910", medioNombre: "Efectivo", montoCentavos: 38_000, estado: "aprobado" }],
  },
  {
    id: "f-1050",
    prefijo: "FE",
    numero: "1050",
    pedidoId: "p-9011",
    pedidoCodigo: "P-9011",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-106",
    turnoNumero: "T-106",
    resolucion: "RES-18745-2024",
    cufe: "CUFE-b201ff7c-1050",
    estadoDian: "aceptada",
    emitidaEn: isoHaceDias(0, "05:45"),
    lineas: [{ descripcion: "Huevos rancheros", cantidad: 2, precioCentavos: 28_000 }],
    pagos: [{ id: "pg-911", medioNombre: "Tarjeta débito/crédito", montoCentavos: 56_000, estado: "aprobado" }],
    xml: "/exportes/facturas/f-1050.xml",
    pdf: "/exportes/facturas/f-1050.pdf",
  },
  {
    id: "f-1051",
    prefijo: "FE",
    numero: "1051",
    pedidoId: "p-9012",
    pedidoCodigo: "P-9012",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-107",
    turnoNumero: "T-107",
    resolucion: "RES-18745-2024",
    cufe: "CUFE-f5c3109a-1051",
    estadoDian: "aceptada",
    emitidaEn: isoHaceDias(0, "10:30"),
    lineas: [
      { descripcion: "Arrachera al carbón", cantidad: 2, precioCentavos: 18_500 },
      { descripcion: "Agua de horchata", cantidad: 2, precioCentavos: 3_500 },
    ],
    pagos: [{ id: "pg-912", medioNombre: "Efectivo", montoCentavos: 84_500, estado: "aprobado" }],
    xml: "/exportes/facturas/f-1051.xml",
    pdf: "/exportes/facturas/f-1051.pdf",
  },
  {
    id: "f-1052",
    prefijo: "FE",
    numero: "1052",
    pedidoId: "p-9013",
    pedidoCodigo: "P-9013",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-107",
    turnoNumero: "T-107",
    resolucion: "RES-18745-2024",
    cufe: null,
    estadoDian: "pendiente",
    emitidaEn: isoHaceDias(0, "11:12"),
    lineas: [{ descripcion: "Combo ejecutivo", cantidad: 1, precioCentavos: 36_000 }],
    pagos: [{ id: "pg-913", medioNombre: "Tarjeta débito/crédito", montoCentavos: 36_000, estado: "aprobado" }],
  },
  {
    id: "f-norte-118",
    prefijo: "FN",
    numero: "0118",
    pedidoId: "p-9020",
    pedidoCodigo: "P-9020",
    pedidoEstado: "pagado",
    turnoId: "tn-norte-88",
    turnoNumero: "T-088",
    resolucion: "RES-18750-2024",
    cufe: "CUFE-a10bb220-0118",
    estadoDian: "aceptada",
    emitidaEn: isoHaceDias(1, "11:30"),
    lineas: [{ descripcion: "Menú del día", cantidad: 2, precioCentavos: 22_000 }],
    pagos: [{ id: "pg-917", medioNombre: "Efectivo", montoCentavos: 44_000, estado: "aprobado" }],
    xml: "/exportes/facturas/f-norte-118.xml",
    pdf: "/exportes/facturas/f-norte-118.pdf",
  },
  {
    id: "f-norte-119",
    prefijo: "FN",
    numero: "0119",
    pedidoId: "p-9021",
    pedidoCodigo: "P-9021",
    pedidoEstado: "pagado",
    turnoId: "tn-norte-88",
    turnoNumero: "T-088",
    resolucion: "RES-18750-2024",
    cufe: "CUFE-c77de903-0119",
    estadoDian: "enviada",
    emitidaEn: isoHaceDias(1, "14:02"),
    lineas: [{ descripcion: "Torta de cochinita", cantidad: 1, precioCentavos: 29_500 }],
    pagos: [{ id: "pg-918", medioNombre: "Tarjeta débito/crédito", montoCentavos: 29_500, estado: "aprobado" }],
    xml: "/exportes/facturas/f-norte-119.xml",
    pdf: "/exportes/facturas/f-norte-119.pdf",
  },
]

const FACTURAS: FacturaDetalle[] = CONFIGS.map(construirFactura)

const CONFIG: ConfigFiscal = {
  impuestos: [
    { id: "imp-iva16", nombre: "IVA 16%", tasaBps: 1_600, tipo: "adicionado", activo: true },
    { id: "imp-iva8", nombre: "IVA 8% frontera", tasaBps: 800, tipo: "adicionado", activo: false },
    { id: "imp-inc8", nombre: "INC 8%", tasaBps: 800, tipo: "inc", activo: false },
  ],
  consecutivos: [
    {
      id: "con-centro-fe",
      sucursalId: "centro",
      sucursalNombre: "Punto C · Centro",
      tipo: "factura",
      prefijo: "FE",
      siguiente: 1_057,
      resolucion: "RES-18745-2024",
      vigenciaHasta: sumarDias(400),
      vigenciaEstado: vigenciaEstado(sumarDias(400)),
    },
    {
      id: "con-centro-p",
      sucursalId: "centro",
      sucursalNombre: "Punto C · Centro",
      tipo: "pedido",
      prefijo: "P",
      siguiente: 9_057,
      resolucion: "RES-18745-2024",
      vigenciaHasta: sumarDias(400),
      vigenciaEstado: vigenciaEstado(sumarDias(400)),
    },
    {
      id: "con-norte-fn",
      sucursalId: "norte",
      sucursalNombre: "Punto C · Norte",
      tipo: "factura",
      prefijo: "FN",
      siguiente: 120,
      resolucion: "RES-18750-2024",
      vigenciaHasta: sumarDias(20),
      vigenciaEstado: vigenciaEstado(sumarDias(20)),
    },
    {
      id: "con-norte-nc",
      sucursalId: "norte",
      sucursalNombre: "Punto C · Norte",
      tipo: "factura",
      prefijo: "NC",
      siguiente: 8,
      resolucion: "RES-18750-2024",
      vigenciaHasta: sumarDias(-12),
      vigenciaEstado: vigenciaEstado(sumarDias(-12)),
    },
  ],
  copiasFactura: 2,
  actualizadoEn: isoHaceDias(6, "09:00"),
  actualizadoPor: "María Gómez",
}

function buscarFactura(id: string): FacturaDetalle {
  const factura = FACTURAS.find((item) => item.id === id)
  if (!factura) throw new ApiError(404, "La factura no existe o fue movida.", "factura_no_encontrada")
  return factura
}

function aFila(factura: FacturaDetalle): FacturaFila {
  const { lineas: _lineas, pagos: _pagos, timeline: _timeline, ...fila } = factura
  return fila
}

function coincideFecha(iso: string, desde?: string, hasta?: string): boolean {
  const fecha = fechaLocal(iso)
  if (desde && fecha < desde) return false
  if (hasta && fecha > hasta) return false
  return true
}

function detalleConRelaciones(factura: FacturaDetalle): FacturaDetalle {
  const original = factura.facturaOriginalId
    ? FACTURAS.find((item) => item.id === factura.facturaOriginalId)
    : undefined
  return {
    ...factura,
    facturaOriginal: original ? { id: original.id, numero: `${original.prefijo}-${original.numero}` } : null,
    notasCredito: FACTURAS.filter(
      (item) => item.tipo === "nota_credito" && item.facturaOriginalId === factura.id,
    ).map((nota) => ({
      id: nota.id,
      numero: `${nota.prefijo}-${nota.numero}`,
      estadoDian: nota.estadoDian,
      totalCentavos: nota.totalCentavos,
      emitidaEn: nota.emitidaEn,
    })),
  }
}

/* -------------------------------------------------------------------------- */
/* Mocks registrados                                                           */
/* -------------------------------------------------------------------------- */

registerMock("GET", /^\/admin\/facturacion\/facturas$/, (ctx) => {
  const q = ctx.query
  const page = Math.max(1, Number(q.page ?? 1))
  const pageSize = Math.max(1, Number(q.pageSize ?? 10))

  let items = FACTURAS.map(aFila)
  if (q.estado) items = items.filter((factura) => factura.estadoDian === q.estado)
  if (q.prefijo) items = items.filter((factura) => factura.prefijo === q.prefijo)
  if (q.resolucion) items = items.filter((factura) => factura.resolucion === String(q.resolucion))
  if (q.tipo) items = items.filter((factura) => factura.tipo === q.tipo)
  if (q.pedido) {
    const busqueda = String(q.pedido).toLowerCase()
    items = items.filter((factura) => factura.pedidoCodigo.toLowerCase().includes(busqueda))
  }
  if (q.desde || q.hasta) {
    items = items.filter((factura) => coincideFecha(factura.emitidaEn, q.desde as string, q.hasta as string))
  }

  items = [...items].sort((a, b) => b.emitidaEn.localeCompare(a.emitidaEn))
  const respuesta: FacturasResp = {
    data: items.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize),
    total: items.length,
    page,
    pageSize,
    resumen: {
      aceptadas: items.filter((factura) => factura.estadoDian === "aceptada").length,
      enviadas: items.filter((factura) => factura.estadoDian === "enviada").length,
      pendientes: items.filter((factura) => factura.estadoDian === "pendiente").length,
      rechazadas: items.filter((factura) => factura.estadoDian === "rechazada").length,
    },
  }
  return respuesta
})

registerMock("GET", /^\/admin\/facturacion\/config$/, () => CONFIG)

registerMock("PUT", /^\/admin\/facturacion\/config$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<ConfigFiscalPayload>
  const motivo = body.motivo?.trim() ?? ""
  if (motivo.length < 3) {
    throw new ApiError(422, "El cambio de configuración fiscal exige un motivo.", "motivo_requerido")
  }

  for (const impuesto of body.impuestos ?? []) {
    if (!impuesto.nombre.trim()) throw new ApiError(422, "Cada impuesto necesita nombre.", "impuesto_invalido")
    if (impuesto.tasaBps < 0 || impuesto.tasaBps > 100_000) {
      throw new ApiError(422, `La tasa de ${impuesto.nombre} está fuera de rango.`, "tasa_invalida")
    }
  }
  for (const consecutivo of body.consecutivos ?? []) {
    if (!consecutivo.prefijo.trim()) throw new ApiError(422, "Cada consecutivo necesita prefijo.", "prefijo_requerido")
    if (!consecutivo.resolucion.trim()) {
      throw new ApiError(422, `El consecutivo ${consecutivo.prefijo} no tiene resolución.`, "resolucion_requerida")
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(consecutivo.vigenciaHasta)) {
      throw new ApiError(422, `La vigencia de ${consecutivo.prefijo} no es una fecha válida.`, "vigencia_invalida")
    }
    const previo = CONFIG.consecutivos.find((item) => item.id === consecutivo.id)
    if (previo && consecutivo.siguiente < previo.siguiente) {
      throw new ApiError(
        422,
        `El consecutivo ${consecutivo.prefijo} solo avanza al emitir; no se puede bajar de ${previo.siguiente}.`,
        "consecutivo_no_baja",
      )
    }
  }

  CONFIG.impuestos = (body.impuestos ?? CONFIG.impuestos).map((impuesto) => ({ ...impuesto }))
  CONFIG.consecutivos = (body.consecutivos ?? CONFIG.consecutivos).map((consecutivo) => ({
    ...consecutivo,
    vigenciaEstado: vigenciaEstado(consecutivo.vigenciaHasta),
  }))
  CONFIG.copiasFactura = Math.max(0, Math.min(5, Math.round(Number(body.copiasFactura ?? CONFIG.copiasFactura))))
  CONFIG.actualizadoEn = new Date().toISOString()
  CONFIG.actualizadoPor = "María Gómez"
  return CONFIG
})

registerMock("GET", /^\/admin\/facturacion\/proveedor\/diagnostico$/, () => {
  const filas = FACTURAS.map(aFila)
  const pendientes = filas.filter((factura) => factura.estadoDian === "pendiente")
  const rechazadas = filas.filter((factura) => factura.estadoDian === "rechazada")
  const errores = FACTURAS.filter((factura) => factura.errorProveedor).map((factura) => ({
    id: `${factura.id}-err`,
    facturaId: factura.id,
    numero: `${factura.prefijo}-${factura.numero}`,
    causa: factura.errorProveedor?.causa ?? "Sin causa reportada",
    ocurridoEn: factura.errorProveedor?.ocurridoEn ?? factura.emitidaEn,
    intentos: factura.errorProveedor?.intentos ?? 1,
  }))
  const reintentos = FACTURAS.flatMap((factura) =>
    (factura.reintentos ?? []).map((reintento) => ({
      ...reintento,
      id: `${factura.id}-${reintento.id}`,
      facturaId: factura.id,
      numero: `${factura.prefijo}-${factura.numero}`,
    })),
  )

  const diagnostico: DiagnosticoProveedor = {
    proveedor: {
      nombre: "FacturaTech (proveedor autorizado)",
      estado: errores.length > 0 ? "degradado" : "operativo",
      ambiente: "Producción",
      ultimaConexion: isoHaceDias(0, "12:05"),
      latenciaMs: errores.length > 0 ? 1_840 : 320,
    },
    facturas: {
      pendientes: pendientes.length,
      enviadas: filas.filter((factura) => factura.estadoDian === "enviada").length,
      aceptadas: filas.filter((factura) => factura.estadoDian === "aceptada").length,
      rechazadas: rechazadas.length,
    },
    pendientesPorAntiguedad: [
      { rango: "Menos de 1 h", cantidad: 1, detalle: "En cola normal de envío." },
      { rango: "1 a 6 h", cantidad: 1, detalle: "Revisar si el proveedor responde lento." },
      { rango: "Más de 6 h", cantidad: Math.max(0, pendientes.length - 2), detalle: "Requiere reintento manual." },
    ],
    errores,
    reintentos,
    colaImpresion: [
      {
        id: "ti-501",
        facturaNumero: "FE-1051",
        impresora: "Caja principal",
        tipo: "factura",
        estado: "impreso",
        intentos: 1,
        ultimoError: null,
      },
      {
        id: "ti-502",
        facturaNumero: "FE-1052",
        impresora: "Caja principal",
        tipo: "factura",
        estado: "fallido",
        intentos: 3,
        ultimoError: "La impresora no responde (sin papel o apagada).",
      },
      {
        id: "ti-503",
        facturaNumero: "FE-1046",
        impresora: "Caja 2",
        tipo: "recibo",
        estado: "pendiente",
        intentos: 0,
        ultimoError: null,
      },
    ],
  }
  return diagnostico
})

registerMock("POST", /^\/admin\/facturacion\/facturas\/([^/]+)\/reintentar$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const factura = buscarFactura(id)
  if (!factura.reintentable) {
    throw new ApiError(
      409,
      factura.motivoNoReintentable ?? "La factura no se puede reintentar en su estado actual.",
      "factura_no_reintentable",
    )
  }

  const cuerpo = (ctx.body ?? {}) as { motivo?: string }
  const intento = factura.reintentos.length + 1
  const ahora = new Date().toISOString()
  factura.reintentos.push({
    id: `${factura.id}-r${intento}`,
    intento,
    ocurridoEn: ahora,
    resultado: "enviada",
  })
  factura.timeline.push({
    id: `${factura.id}-e${factura.timeline.length + 1}`,
    accion: "reintento",
    ocurridoEn: ahora,
    actor: "María Gómez",
    causa: cuerpo.motivo?.trim() ? `Reintento manual: ${cuerpo.motivo.trim()}` : "Reintento manual desde el panel.",
  })
  factura.estadoDian = "enviada"
  factura.estadoTone = ESTADO_DIAN_TONE.enviada
  factura.cufe = factura.cufe ?? `CUFE-${factura.id}-${Date.now().toString(36)}`
  factura.errorProveedor = null
  factura.reintentable = false
  factura.motivoNoReintentable = "La factura está en trámite ante el proveedor; espera la respuesta antes de reintentar."
  return detalleConRelaciones(factura)
})

registerMock("POST", /^\/admin\/facturacion\/facturas\/([^/]+)\/notas-credito$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const factura = buscarFactura(id)
  const body = (ctx.body ?? {}) as Partial<NotaCreditoPayload>
  const motivo = body.motivo?.trim() ?? ""
  if (motivo.length < 3) {
    throw new ApiError(422, "La nota crédito exige un motivo.", "motivo_requerido")
  }
  if (factura.tipo !== "factura") {
    throw new ApiError(409, "No se puede emitir una nota crédito sobre otra nota crédito.", "documento_invalido")
  }
  if (factura.estadoDian !== "aceptada") {
    throw new ApiError(
      409,
      "Solo se emite nota crédito sobre facturas aceptadas por el proveedor.",
      "factura_no_anulable",
    )
  }

  const ahora = new Date().toISOString()
  const numero = String(FACTURAS.filter((item) => item.tipo === "nota_credito").length + 8).padStart(4, "0")
  const nota = construirFactura({
    id: `${factura.id}-nc-${Date.now().toString(36)}`,
    tipo: "nota_credito",
    prefijo: "NC",
    numero,
    pedidoId: factura.pedidoId,
    pedidoCodigo: factura.pedidoCodigo,
    pedidoEstado: factura.pedido.estado,
    turnoId: factura.pedido.turnoId,
    turnoNumero: factura.pedido.turnoNumero,
    resolucion: factura.resolucion,
    cufe: `CUFE-nc-${factura.numero}-${Date.now().toString(36)}`,
    estadoDian: "aceptada",
    emitidaEn: ahora,
    facturaOriginalId: factura.id,
    lineas: [{ descripcion: `Anulación ${factura.prefijo}-${factura.numero} · ${motivo}`, cantidad: 1, precioCentavos: Math.round(factura.totalCentavos / 1.16) }],
    pagos: [],
    xml: `/exportes/facturas/${factura.id}-nc.xml`,
    pdf: `/exportes/facturas/${factura.id}-nc.pdf`,
  })

  factura.estadoDian = "anulada"
  factura.estadoTone = ESTADO_DIAN_TONE.anulada
  factura.reintentable = false
  factura.motivoNoReintentable = "Una factura anulada no se reintenta."
  factura.timeline.push({
    id: `${factura.id}-e${factura.timeline.length + 1}`,
    accion: "nota_credito",
    ocurridoEn: ahora,
    actor: "María Gómez",
    causa: motivo,
  })
  FACTURAS.push(nota)
  return detalleConRelaciones(nota)
})

registerMock("GET", /^\/admin\/facturacion\/facturas\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  return detalleConRelaciones(buscarFactura(id))
})

registerMock("POST", /^\/admin\/exportaciones$/, (ctx) => {
  const body = (ctx.body ?? {}) as { tipo?: string; formato?: ExportacionResp["formato"] }
  const exportacion: ExportacionResp = {
    ok: true,
    id: `exp-${Date.now()}`,
    exportacionId: `exp-${Date.now()}`,
    tipo: body.tipo ?? "facturas",
    formato: body.formato ?? "csv",
    estado: "en_proceso",
    creadoEn: new Date().toISOString(),
  }
  return exportacion
})

/* -------------------------------------------------------------------------- */
/* Catálogos para filtros                                                      */
/* -------------------------------------------------------------------------- */

export const PREFIJOS = [...new Set(FACTURAS.map((factura) => factura.prefijo))].sort()

export const RESOLUCIONES = [...new Set(FACTURAS.map((factura) => factura.resolucion))].sort()

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function useFacturas(filtros: FacturaFiltros) {
  return useQuery({
    queryKey: ["facturacion", "facturas", filtros],
    queryFn: () => api.get<FacturasResp>("/admin/facturacion/facturas", filtros as unknown as Query),
    placeholderData: keepPreviousData,
  })
}

export function useFacturaDetalle(id: string | null) {
  return useQuery({
    queryKey: ["facturacion", "factura", id],
    queryFn: () => api.get<FacturaDetalle>(`/admin/facturacion/facturas/${id}`),
    enabled: Boolean(id),
  })
}

export function useReintentarFactura() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { facturaId: string; motivo: string }) =>
      api.post<FacturaDetalle>(`/admin/facturacion/facturas/${payload.facturaId}/reintentar`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["facturacion"] })
    },
  })
}

export function useCrearNotaCredito() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NotaCreditoPayload) =>
      api.post<FacturaDetalle>(`/admin/facturacion/facturas/${payload.facturaId}/notas-credito`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["facturacion"] })
    },
  })
}

export function useConfigFiscal() {
  return useQuery({
    queryKey: ["facturacion", "config"],
    queryFn: () => api.get<ConfigFiscal>("/admin/facturacion/config"),
  })
}

export function useGuardarConfigFiscal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ConfigFiscalPayload) =>
      api.put<ConfigFiscal>("/admin/facturacion/config", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["facturacion"] })
    },
  })
}

export function useDiagnosticoProveedor() {
  return useQuery({
    queryKey: ["facturacion", "diagnostico"],
    queryFn: () => api.get<DiagnosticoProveedor>("/admin/facturacion/proveedor/diagnostico"),
    refetchInterval: 30_000,
  })
}

export function useExportarFacturas() {
  return useMutation({
    mutationFn: (payload: {
      tipo: string
      formato: ExportacionResp["formato"]
      filtros?: Record<string, unknown>
    }) => api.post<ExportacionResp>("/admin/exportaciones", payload),
  })
}
