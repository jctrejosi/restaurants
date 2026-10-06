import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError, registerMock, type Query } from "@/lib/api"
import {
  AJUSTE_LABEL,
  CANAL_LABEL,
  COMANDA_ESTADO_TONE,
  ESTADO_LABEL,
  ESTADO_TONE,
  LINEA_ESTADO_LABEL,
  LINEA_ESTADO_TONE,
  MODALIDAD_LABEL,
  PAGO_ESTADO_LABEL,
  PAGO_ESTADO_TONE,
  type AccionPedido,
  type AccionPedidoPayload,
  type AjustePedido,
  type AjusteTipo,
  type CanalPedido,
  type ComandaEstado,
  type EventoBitacora,
  type Exportacion,
  type LineaEstado,
  type ModalidadPedido,
  type PagoEstado,
  type PedidoComanda,
  type PedidoDetalle,
  type PedidoLinea,
  type PedidoLista,
  type PedidoPago,
  type PedidoEstado,
  type PedidosFiltros,
  type PedidosRespuesta,
  type ReembolsoPayload,
  type TiemposPedido,
} from "@/modules/pedidos/types"

/* -------------------------------------------------------------------------- */
/* Mock de desarrollo                                                          */
/* Se retira cuando el backend NestJS exponga `/admin/pedidos/*`.             */
/* -------------------------------------------------------------------------- */

const MIN = 60_000

const SEDES: Record<string, { nombre: string; zonaHoraria: string }> = {
  centro: { nombre: "Punto C · Centro", zonaHoraria: "America/Mexico_City" },
  norte: { nombre: "Punto C · Norte", zonaHoraria: "America/Mexico_City" },
}

const SLA_ESTACION: Record<string, number> = {
  Parrilla: 900,
  Cocina: 900,
  "Barra fría": 720,
  Barra: 720,
  Postres: 600,
  Plancha: 900,
}

const DISPOSITIVO: Record<CanalPedido, string> = {
  salon: "Tablet mesero",
  mesero: "Tablet mesero",
  web: "Web",
  app: "App cliente",
  qr: "QR de mesa",
  telefono: "Central telefónica",
}

function haceMinutos(min: number): string {
  return new Date(Date.now() - min * MIN).toISOString()
}

function segundosEntre(desde?: string, hasta?: string): number | null {
  if (!desde || !hasta) return null
  return Math.max(0, Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 1000))
}

type LineaCfg = {
  nombre: string
  precio: number
  cantidad: number
  estacion: string
  notas?: string
  comensal?: string
  mods?: [string, number][]
}

type AjusteCfg = { tipo: AjusteTipo; valor: number; motivo: string; usuario: string; porcentaje?: number }

type ExtraCfg = {
  tipo: EventoBitacora["tipo"]
  detalle: string
  resultado?: string
  actor?: string
  actorTipo?: EventoBitacora["actorTipo"]
  diffs?: EventoBitacora["diffs"]
}

type PedidoCfg = {
  id: string
  folio: string
  estado: PedidoEstado
  modalidad: ModalidadPedido
  canal: CanalPedido
  sedeId: keyof typeof SEDES
  mesa?: string
  mesero: string
  cliente: string
  telefono?: string
  correo?: string
  comensales?: number
  creadoHaceMin: number
  lineas: LineaCfg[]
  ajustes?: AjusteCfg[]
  propina?: number
  pagoMedio?: string
  anularLineaIndex?: number
  slaExtraMin?: Record<string, number>
  extras?: ExtraCfg[]
}

const CONFIGS: PedidoCfg[] = [
  {
    id: "p-9051",
    folio: "P-9051",
    estado: "por_cobrar",
    modalidad: "mesa",
    canal: "salon",
    sedeId: "centro",
    mesa: "Mesa 12",
    mesero: "Laura Pérez",
    cliente: "Ana Morales",
    telefono: "+52 55 1234 5678",
    comensales: 4,
    creadoHaceMin: 38,
    propina: 4500,
    pagoMedio: "Efectivo",
    slaExtraMin: { Postres: 2 },
    lineas: [
      { nombre: "Arrachera al carbón", precio: 18500, cantidad: 2, estacion: "Parrilla", comensal: "1", mods: [["Término medio", 0], ["Sin cebolla", 0]] },
      { nombre: "Guacamole con totopos", precio: 9500, cantidad: 1, estacion: "Barra fría", comensal: "1", notas: "Sin picante" },
      { nombre: "Margarita clásica", precio: 14000, cantidad: 2, estacion: "Barra", mods: [["Escarchado de sal", 0]] },
      { nombre: "Pan de la casa", precio: 4500, cantidad: 2, estacion: "Postres" },
    ],
  },
  {
    id: "p-9052",
    folio: "P-9052",
    estado: "listo",
    modalidad: "recoger",
    canal: "web",
    sedeId: "centro",
    mesero: "Carlos Méndez",
    cliente: "Luis Trejo",
    telefono: "+52 55 8765 4321",
    creadoHaceMin: 19,
    lineas: [
      { nombre: "Tacos de canasta", precio: 7500, cantidad: 3, estacion: "Cocina", notas: "Bien dorados" },
      { nombre: "Agua de horchata", precio: 3500, cantidad: 2, estacion: "Barra fría" },
    ],
  },
  {
    id: "p-9053",
    folio: "P-9053",
    estado: "en_preparacion",
    modalidad: "mesa",
    canal: "salon",
    sedeId: "norte",
    mesa: "Mesa 05",
    mesero: "Diego Ramírez",
    cliente: "Cliente en mesa",
    comensales: 2,
    creadoHaceMin: 16,
    ajustes: [{ tipo: "cortesia", valor: 11000, motivo: "Sopa sin cargo por demora", usuario: "Gerente de turno" }],
    lineas: [
      { nombre: "Enchiladas suizas", precio: 15500, cantidad: 1, estacion: "Cocina" },
      { nombre: "Sopa de tortilla", precio: 11000, cantidad: 1, estacion: "Cocina" },
      { nombre: "Limonada de la casa", precio: 4500, cantidad: 2, estacion: "Barra fría" },
    ],
  },
  {
    id: "p-9054",
    folio: "P-9054",
    estado: "en_camino",
    modalidad: "domicilio",
    canal: "app",
    sedeId: "centro",
    mesero: "Carlos Méndez",
    cliente: "Carlos Méndez",
    telefono: "+52 55 2222 3333",
    creadoHaceMin: 22,
    propina: 2000,
    lineas: [
      { nombre: "Pizza pepperoni", precio: 21000, cantidad: 1, estacion: "Cocina", mods: [["Orilla rellena", 4000]] },
      { nombre: "Alitas BBQ", precio: 16500, cantidad: 1, estacion: "Parrilla" },
      { nombre: "Coca-Cola 600 ml", precio: 3500, cantidad: 2, estacion: "Barra fría" },
    ],
  },
  {
    id: "p-9055",
    folio: "P-9055",
    estado: "recibido",
    modalidad: "mesa",
    canal: "qr",
    sedeId: "centro",
    mesa: "Mesa 03",
    mesero: "Laura Pérez",
    cliente: "Sofía Vega",
    comensales: 1,
    creadoHaceMin: 6,
    lineas: [
      { nombre: "Chilaquiles verdes", precio: 13500, cantidad: 1, estacion: "Cocina" },
      { nombre: "Café americano", precio: 4000, cantidad: 1, estacion: "Barra" },
    ],
  },
  {
    id: "p-9056",
    folio: "P-9056",
    estado: "pagado",
    modalidad: "domicilio",
    canal: "web",
    sedeId: "norte",
    mesero: "Carlos Méndez",
    cliente: "Marta Ruiz",
    telefono: "+52 55 4444 5555",
    creadoHaceMin: 55,
    propina: 3000,
    pagoMedio: "Tarjeta",
    lineas: [
      { nombre: "Pollo rostizado entero", precio: 24000, cantidad: 1, estacion: "Parrilla" },
      { nombre: "Ensalada César", precio: 12000, cantidad: 1, estacion: "Barra fría" },
    ],
  },
  {
    id: "p-9057",
    folio: "P-9057",
    estado: "pagado",
    modalidad: "mesa",
    canal: "salon",
    sedeId: "centro",
    mesa: "Mesa 08",
    mesero: "Diego Ramírez",
    cliente: "Familia Hernández",
    comensales: 6,
    creadoHaceMin: 72,
    propina: 6000,
    pagoMedio: "Tarjeta",
    ajustes: [{ tipo: "descuento", valor: 7500, porcentaje: 10, motivo: "Cortesía cumpleaños", usuario: "María Gómez" }],
    extras: [
      {
        tipo: "precio_ajustado",
        detalle: "Se corrigió el precio de «Carne asada» por error de captura.",
        actor: "María Gómez",
        actorTipo: "administrador",
        diffs: [{ campo: "Carne asada · precio", antes: "$300.00", despues: "$320.00" }],
      },
    ],
    lineas: [
      { nombre: "Carne asada", precio: 32000, cantidad: 2, estacion: "Parrilla", mods: [["Término tres cuartos", 0]] },
      { nombre: "Queso fundido", precio: 12500, cantidad: 1, estacion: "Plancha" },
      { nombre: "Cerveza artesanal", precio: 6500, cantidad: 4, estacion: "Barra" },
      { nombre: "Flan napolitano", precio: 7000, cantidad: 2, estacion: "Postres" },
    ],
  },
  {
    id: "p-9058",
    folio: "P-9058",
    estado: "pagado",
    modalidad: "recoger",
    canal: "telefono",
    sedeId: "norte",
    mesero: "Laura Pérez",
    cliente: "Jorge Nava",
    telefono: "+52 81 1234 0000",
    creadoHaceMin: 41,
    pagoMedio: "Efectivo",
    lineas: [
      { nombre: "Burrito de cochinita", precio: 12000, cantidad: 2, estacion: "Cocina" },
      { nombre: "Papas a la francesa", precio: 6000, cantidad: 1, estacion: "Cocina" },
    ],
  },
  {
    id: "p-9059",
    folio: "P-9059",
    estado: "cancelado",
    modalidad: "mesa",
    canal: "salon",
    sedeId: "centro",
    mesa: "Mesa 02",
    mesero: "Carlos Méndez",
    cliente: "Reserva García",
    comensales: 2,
    creadoHaceMin: 30,
    lineas: [
      { nombre: "Filete a la pimienta", precio: 28000, cantidad: 1, estacion: "Parrilla" },
      { nombre: "Copa de vino tinto", precio: 11000, cantidad: 2, estacion: "Barra" },
    ],
  },
  {
    id: "p-9060",
    folio: "P-9060",
    estado: "reembolsado",
    modalidad: "domicilio",
    canal: "app",
    sedeId: "centro",
    mesero: "Diego Ramírez",
    cliente: "Paola Ríos",
    telefono: "+52 55 9999 1111",
    creadoHaceMin: 95,
    pagoMedio: "Tarjeta",
    lineas: [
      { nombre: "Sushi del chef", precio: 26000, cantidad: 1, estacion: "Barra fría" },
      { nombre: "Ramen tonkotsu", precio: 19000, cantidad: 1, estacion: "Cocina" },
    ],
  },
  {
    id: "p-9061",
    folio: "P-9061",
    estado: "en_preparacion",
    modalidad: "mesa",
    canal: "qr",
    sedeId: "norte",
    mesa: "Mesa 09",
    mesero: "Ana Morales",
    cliente: "Cliente en mesa",
    comensales: 3,
    creadoHaceMin: 11,
    lineas: [
      { nombre: "Birria de res", precio: 16000, cantidad: 2, estacion: "Cocina" },
      { nombre: "Consomé", precio: 5000, cantidad: 1, estacion: "Cocina" },
    ],
  },
  {
    id: "p-9062",
    folio: "P-9062",
    estado: "listo",
    modalidad: "recoger",
    canal: "web",
    sedeId: "centro",
    mesero: "Laura Pérez",
    cliente: "Iván Soto",
    telefono: "+52 55 6060 7070",
    creadoHaceMin: 14,
    lineas: [
      { nombre: "Torta ahogada", precio: 13000, cantidad: 1, estacion: "Cocina" },
      { nombre: "Tejuino", precio: 5000, cantidad: 1, estacion: "Barra fría" },
    ],
  },
]

/* -------------------------------------------------------------------------- */
/* Construcción del detalle a partir de la configuración                       */
/* -------------------------------------------------------------------------- */

function estadoLinea(estado: PedidoEstado): LineaEstado {
  switch (estado) {
    case "borrador":
      return "pendiente"
    case "recibido":
      return "enviada"
    case "en_preparacion":
      return "en_preparacion"
    case "listo":
      return "lista"
    case "cancelado":
      return "anulada"
    default:
      return "entregada"
  }
}

function estadoComanda(estado: PedidoEstado): ComandaEstado {
  switch (estado) {
    case "recibido":
      return "enviada"
    case "en_preparacion":
      return "en_preparacion"
    case "listo":
    case "en_camino":
      return "lista"
    case "cancelado":
      return "enviada"
    default:
      return "entregada"
  }
}

function construirBitacora(cfg: PedidoCfg): { eventos: EventoBitacora[]; sellos: Record<string, string> } {
  const eventos: EventoBitacora[] = []
  const sellos: Record<string, string> = {}
  let cursor = cfg.creadoHaceMin
  const dispositivo = DISPOSITIVO[cfg.canal]
  const esSalon = cfg.canal === "salon" || cfg.canal === "mesero"
  const actorAlta = esSalon ? cfg.mesero : cfg.cliente

  const push = (
    tipo: EventoBitacora["tipo"],
    actor: string,
    actorTipo: EventoBitacora["actorTipo"],
    canal: EventoBitacora["canal"],
    resultado: string,
    detalle?: string,
    diffs?: EventoBitacora["diffs"],
    dispositivoEvento = dispositivo,
  ): string => {
    const servidorEn = haceMinutos(cursor)
    eventos.push({
      id: `${cfg.id}-e${eventos.length + 1}`,
      tipo,
      actor,
      actorTipo,
      canal,
      dispositivo: dispositivoEvento,
      servidorEn,
      resultado,
      detalle,
      diffs,
    })
    return servidorEn
  }

  const estado = cfg.estado
  if (estado === "borrador") {
    return { eventos, sellos }
  }

  sellos.creado = push(
    "creado",
    actorAlta,
    esSalon ? "mesero" : "cliente",
    cfg.canal,
    "Completado",
    `${CANAL_LABEL[cfg.canal]} · ${MODALIDAD_LABEL[cfg.modalidad]}${cfg.mesa ? ` · ${cfg.mesa}` : ""}`,
  )

  cursor -= 2
  sellos.enviado = push("enviado", cfg.mesero, esSalon ? "mesero" : "automatizacion", esSalon ? "mesero" : cfg.canal, "Completado")

  if (cfg.anularLineaIndex != null) {
    cursor -= 1
    const linea = cfg.lineas[cfg.anularLineaIndex]
    push(
      "linea_anulada",
      cfg.mesero,
      "mesero",
      "admin",
      "Completado",
      `Se anuló «${linea.nombre}» antes de preparar.`,
      [{ campo: "Línea", antes: `${linea.nombre} · incluida`, despues: "Anulada" }],
      "Panel admin",
    )
  }

  const preparando = ["en_preparacion", "listo", "en_camino", "entregado", "por_cobrar", "pagado", "reembolsado"].includes(estado)
  const listoCocina = ["listo", "en_camino", "entregado", "por_cobrar", "pagado", "reembolsado"].includes(estado)
  const porCobrar = ["por_cobrar", "pagado", "reembolsado"].includes(estado)

  if (preparando) {
    cursor -= 1
    const estaciones = [...new Set(cfg.lineas.map((linea) => linea.estacion))]
    sellos.comandaEnviada = push(
      "comanda_enviada",
      "Automatización de impresión",
      "automatizacion",
      "admin",
      "Completado",
      `Comandas enviadas a ${estaciones.join(", ")}.`,
      undefined,
      "Router de impresión",
    )
    cursor -= 1
    push("comanda_en_preparacion", "Cocina", "cocina", "admin", "Completado", `Estaciones: ${estaciones.join(", ")}.`, undefined, "KDS cocina")
  }

  if (listoCocina) {
    cursor -= 8
    sellos.listo = push("comanda_lista", "Cocina", "cocina", "admin", "Completado", "Todas las comandas marcadas como listas.", undefined, "KDS cocina")
    cursor -= 1
    push("listo", cfg.mesero, esSalon ? "mesero" : "cocina", esSalon ? "mesero" : "admin", "Completado")
  }

  if (cfg.modalidad === "domicilio" && ["en_camino"].includes(estado)) {
    cursor -= 2
    sellos.despacho = push("en_camino", "Repartidor · Iván S.", "automatizacion", "admin", "Completado", "Pedido asignado a reparto.", undefined, "App reparto")
  }

  if (["entregado", "por_cobrar", "pagado", "reembolsado"].includes(estado)) {
    if (cfg.modalidad === "domicilio") {
      cursor -= 2
      sellos.despacho = push("en_camino", "Repartidor · Iván S.", "automatizacion", "admin", "Completado", "Pedido asignado a reparto.", undefined, "App reparto")
      cursor -= 15
      sellos.despacho = push("entregado", "Repartidor · Iván S.", "automatizacion", "admin", "Completado", "Entregado en domicilio del cliente.", undefined, "App reparto")
    } else if (cfg.modalidad === "recoger") {
      cursor -= 5
      sellos.despacho = push("recogido", cfg.cliente, "cliente", cfg.canal, "Completado", "Recogido en mostrador.")
    } else {
      cursor -= 2
      sellos.despacho = push("entregado", cfg.mesero, "mesero", "mesero", "Completado", `Servido en ${cfg.mesa ?? "mesa"}.`)
    }
  }

  if (porCobrar) {
    cursor -= 2
    sellos.porCobrar = push("por_cobrar", cfg.mesero, "mesero", esSalon ? "mesero" : "admin", "Completado", "Cuenta abierta para cobro.")
  }

  if (estado === "pagado" || estado === "reembolsado") {
    cursor -= 4
    sellos.pagado = push(
      "pagado",
      "Caja",
      "caja",
      "admin",
      "Aprobado",
      `Pago con ${cfg.pagoMedio ?? "Efectivo"}.`,
      undefined,
      "Terminal de caja",
    )
  }

  if (estado === "cancelado") {
    cursor -= 4
    sellos.cancelado = push(
      "cancelado",
      "María Gómez",
      "administrador",
      "admin",
      "Completado",
      "Cancelado a solicitud del cliente antes de preparar.",
      [{ campo: "Estado", antes: ESTADO_LABEL.en_preparacion, despues: ESTADO_LABEL.cancelado }],
      "Panel admin",
    )
  }

  if (estado === "reembolsado") {
    cursor -= 2
    sellos.reembolsado = push(
      "reembolsado",
      "Caja",
      "caja",
      "admin",
      "Aprobado",
      "Reembolso total al medio de pago original.",
      [{ campo: "Estado", antes: ESTADO_LABEL.pagado, despues: ESTADO_LABEL.reembolsado }],
      "Panel admin",
    )
  }

  for (const extra of cfg.extras ?? []) {
    cursor -= 1
    push(
      extra.tipo,
      extra.actor ?? cfg.mesero,
      extra.actorTipo ?? "administrador",
      "admin",
      extra.resultado ?? "Completado",
      extra.detalle,
      extra.diffs,
      "Panel admin",
    )
  }

  return { eventos, sellos }
}

function calcularTiempos(cfg: PedidoCfg, sellos: Record<string, string>): TiemposPedido {
  // El tramo total solo cierra con pago o cancelación; si no, queda abierto («—»).
  const fin = sellos.pagado ?? sellos.cancelado
  return {
    atencionSeg: segundosEntre(sellos.creado, sellos.enviado),
    preparacionSeg: segundosEntre(sellos.enviado, sellos.listo),
    despachoModo: cfg.modalidad,
    despachoSeg: cfg.modalidad === "mesa" ? null : segundosEntre(sellos.listo, sellos.despacho),
    cobroSeg: segundosEntre(sellos.porCobrar, sellos.pagado),
    totalSeg: segundosEntre(sellos.creado, fin),
  }
}

function construirPedido(cfg: PedidoCfg): PedidoDetalle {
  const { eventos, sellos } = construirBitacora(cfg)
  const estadoLineaActual = estadoLinea(cfg.estado)
  const estadoComandaActual = estadoComanda(cfg.estado)

  const lineas: PedidoLinea[] = cfg.lineas.map((linea, index) => {
    const estado = cfg.anularLineaIndex === index ? "anulada" : estadoLineaActual
    const importeCentavos = linea.precio * linea.cantidad
    return {
      id: `${cfg.id}-l${index + 1}`,
      nombreSnapshot: linea.nombre,
      precioSnapshotCentavos: linea.precio,
      cantidad: linea.cantidad,
      importeCentavos,
      impuestoCentavos: Math.round(importeCentavos * 0.16),
      notas: linea.notas,
      comensal: linea.comensal,
      estado,
      estadoTone: LINEA_ESTADO_TONE[estado],
      estacion: linea.estacion,
      modificadores: (linea.mods ?? []).map(([nombre, precio], modIndex) => ({
        id: `${cfg.id}-l${index + 1}-m${modIndex + 1}`,
        nombreSnapshot: nombre,
        precioSnapshotCentavos: precio,
      })),
    }
  })

  const ajustes: AjustePedido[] = (cfg.ajustes ?? []).map((ajuste, index) => ({
    id: `${cfg.id}-a${index + 1}`,
    tipo: ajuste.tipo,
    valorCentavos: ajuste.valor,
    porcentaje: ajuste.porcentaje,
    motivo: ajuste.motivo,
    usuario: ajuste.usuario,
  }))

  const activas = lineas.filter((linea) => linea.estado !== "anulada")
  const subtotalCentavos = activas.reduce((total, linea) => total + linea.importeCentavos, 0)
  const impuestosCentavos = activas.reduce((total, linea) => total + linea.impuestoCentavos, 0)
  const descuentosCentavos = ajustes.filter((ajuste) => ajuste.tipo !== "recargo").reduce((total, ajuste) => total + ajuste.valorCentavos, 0)
  const recargosCentavos = ajustes.filter((ajuste) => ajuste.tipo === "recargo").reduce((total, ajuste) => total + ajuste.valorCentavos, 0)
  const baseCentavos = subtotalCentavos - descuentosCentavos + impuestosCentavos + recargosCentavos
  const propinaCentavos = cfg.propina ?? 0

  const pagoEstado: PagoEstado | null =
    cfg.estado === "reembolsado"
      ? "reembolsado"
      : cfg.estado === "pagado" || cfg.estado === "entregado"
        ? "aprobado"
        : cfg.estado === "por_cobrar"
          ? "pendiente"
          : null

  const pagos: PedidoPago[] = pagoEstado
    ? [
        {
          id: `${cfg.id}-p1`,
          medio: cfg.pagoMedio ?? "Efectivo",
          montoCentavos: baseCentavos + propinaCentavos,
          propinaCentavos,
          estado: pagoEstado,
          estadoTone: PAGO_ESTADO_TONE[pagoEstado],
          aprobadoEn: sellos.pagado,
          reembolsadoEn: sellos.reembolsado,
          referencia: cfg.pagoMedio === "Tarjeta" ? `AUTH-${cfg.id.slice(2)}` : undefined,
          conciliado: false,
        },
      ]
    : []

  const comandas: PedidoComanda[] = [...new Set(cfg.lineas.map((linea) => linea.estacion))].map((estacion, index) => {
    const extra = cfg.slaExtraMin?.[estacion] ?? 0
    const enviadaEn = sellos.enviado
      ? new Date(new Date(sellos.enviado).getTime() - extra * MIN).toISOString()
      : haceMinutos(cfg.creadoHaceMin)
    const listaEn = sellos.listo && listoCocinaEstado(cfg.estado) ? sellos.listo : undefined
    const entregadaEn = sellos.despacho && ["entregado", "por_cobrar", "pagado", "reembolsado"].includes(cfg.estado) ? sellos.despacho : undefined
    const objetivoSeg = SLA_ESTACION[estacion] ?? 480
    return {
      id: `${cfg.id}-c${index + 1}`,
      numero: String(2000 + Number(cfg.id.replace("p-", "")) % 100 * 3 + index),
      estacion,
      estado: estadoComandaActual,
      estadoTone: COMANDA_ESTADO_TONE[estadoComandaActual],
      enviadaEn,
      listaEn,
      entregadaEn,
      objetivoSeg,
      tramoSeg: segundosEntre(enviadaEn, listaEn),
      lineas: cfg.lineas.filter((linea) => linea.estacion === estacion).length,
    }
  })

  const detalle: PedidoDetalle = {
    id: cfg.id,
    folio: cfg.folio,
    estado: cfg.estado,
    modalidad: cfg.modalidad,
    canal: cfg.canal,
    sedeId: cfg.sedeId,
    sedeNombre: SEDES[cfg.sedeId].nombre,
    zonaHoraria: SEDES[cfg.sedeId].zonaHoraria,
    mesa: cfg.mesa,
    comensales: cfg.comensales ?? 2,
    cliente: { nombre: cfg.cliente, telefono: cfg.telefono, correo: cfg.correo },
    mesero: cfg.mesero,
    turno: "Turno 2 · Comida",
    creadoEn: sellos.creado ?? haceMinutos(cfg.creadoHaceMin),
    pagadoEn: sellos.pagado,
    canceladoEn: sellos.cancelado,
    montos: {
      subtotalCentavos,
      descuentosCentavos,
      impuestosCentavos,
      recargosCentavos,
      propinaCentavos,
      totalCentavos: baseCentavos + propinaCentavos,
    },
    tiempos: calcularTiempos(cfg, sellos),
    lineas,
    comandas,
    pagos,
    ajustes,
    bitacora: eventos,
    tieneIncidencias: false,
  }

  recalcular(detalle)
  return detalle
}

function listoCocinaEstado(estado: PedidoEstado): boolean {
  return ["listo", "en_camino", "entregado", "por_cobrar", "pagado", "reembolsado"].includes(estado)
}

/** Recalcula montos, conciliación e incidencias a partir de líneas, ajustes y pagos. */
function recalcular(detalle: PedidoDetalle): void {
  const activas = detalle.lineas.filter((linea) => linea.estado !== "anulada")
  const subtotalCentavos = activas.reduce((total, linea) => total + linea.importeCentavos, 0)
  const impuestosCentavos = activas.reduce((total, linea) => total + linea.impuestoCentavos, 0)
  const descuentosCentavos = detalle.ajustes.filter((ajuste) => ajuste.tipo !== "recargo").reduce((total, ajuste) => total + ajuste.valorCentavos, 0)
  const recargosCentavos = detalle.ajustes.filter((ajuste) => ajuste.tipo === "recargo").reduce((total, ajuste) => total + ajuste.valorCentavos, 0)
  const propinaCentavos = detalle.pagos.reduce((total, pago) => total + pago.propinaCentavos, 0)
  const totalCentavos = subtotalCentavos - descuentosCentavos + impuestosCentavos + recargosCentavos + propinaCentavos

  detalle.montos = {
    subtotalCentavos,
    descuentosCentavos,
    impuestosCentavos,
    recargosCentavos,
    propinaCentavos,
    totalCentavos,
  }

  const aprobado = detalle.pagos.filter((pago) => pago.estado === "aprobado").reduce((total, pago) => total + pago.montoCentavos, 0)
  detalle.pagos.forEach((pago) => {
    pago.conciliado = pago.estado === "aprobado" && totalCentavos > 0 && aprobado >= totalCentavos
  })

  detalle.tieneIncidencias =
    detalle.lineas.some((linea) => linea.estado === "anulada") ||
    detalle.comandas.some((comanda) => comanda.tramoSeg !== null && comanda.tramoSeg > comanda.objetivoSeg)
}

const PEDIDOS: PedidoDetalle[] = CONFIGS.map(construirPedido)

function buscarPedido(id: string): PedidoDetalle {
  const pedido = PEDIDOS.find((item) => item.id === id)
  if (!pedido) throw new ApiError(404, "El pedido no existe o fue movido.", "pedido_no_encontrado")
  return pedido
}

function aLista(detalle: PedidoDetalle): PedidoLista {
  const tiempoTotalSeg =
    detalle.tiempos.totalSeg ?? Math.max(0, Math.round((Date.now() - new Date(detalle.creadoEn).getTime()) / 1000))
  const aprobado = detalle.pagos.find((pago) => pago.estado === "aprobado")
  const reembolsado = detalle.pagos.find((pago) => pago.estado === "reembolsado")
  const pendiente = detalle.pagos.find((pago) => pago.estado === "pendiente")
  const pagoResumen = reembolsado
    ? "Reembolsado"
    : aprobado
      ? `Pagado · ${aprobado.medio}`
      : pendiente
        ? "Pendiente"
        : "—"

  return {
    id: detalle.id,
    folio: detalle.folio,
    creadoEn: detalle.creadoEn,
    sedeId: detalle.sedeId,
    sedeNombre: detalle.sedeNombre,
    canal: detalle.canal,
    modalidad: detalle.modalidad,
    mesa: detalle.mesa,
    clienteNombre: detalle.cliente.nombre,
    mesero: detalle.mesero,
    estado: detalle.estado,
    totalCentavos: detalle.montos.totalCentavos,
    tiempoTotalSeg,
    pagoResumen,
    tieneIncidencias: detalle.tieneIncidencias,
    tieneDescuento: detalle.montos.descuentosCentavos > 0,
    tieneReembolso: detalle.pagos.some((pago) => pago.estado === "reembolsado"),
  }
}

function coincideFecha(iso: string, desde?: string, hasta?: string): boolean {
  const fecha = iso.slice(0, 10)
  if (desde && fecha < desde) return false
  if (hasta && fecha > hasta) return false
  return true
}

function boolParam(valor: unknown): boolean {
  return valor === true || valor === "true"
}

/* -------------------------------------------------------------------------- */
/* Mocks registrados                                                           */
/* -------------------------------------------------------------------------- */

registerMock("GET", /^\/admin\/pedidos$/, (ctx) => {
  const q = ctx.query
  const page = Math.max(1, Number(q.page ?? 1))
  const pageSize = Math.max(1, Number(q.pageSize ?? 10))
  const busqueda = typeof q.busqueda === "string" ? q.busqueda.trim().toLowerCase() : ""

  let items = PEDIDOS.map(aLista)

  if (q.sedeId) items = items.filter((pedido) => pedido.sedeId === q.sedeId)
  if (q.canal) items = items.filter((pedido) => pedido.canal === q.canal)
  if (q.modalidad) items = items.filter((pedido) => pedido.modalidad === q.modalidad)
  if (q.estado) items = items.filter((pedido) => pedido.estado === q.estado)
  if (q.mesero) items = items.filter((pedido) => pedido.mesero === q.mesero)
  if (q.desde || q.hasta) items = items.filter((pedido) => coincideFecha(pedido.creadoEn, q.desde as string, q.hasta as string))
  if (boolParam(q.incidencias)) items = items.filter((pedido) => pedido.tieneIncidencias)
  if (boolParam(q.descuento)) items = items.filter((pedido) => pedido.tieneDescuento)
  if (boolParam(q.reembolso)) items = items.filter((pedido) => pedido.tieneReembolso)
  if (busqueda) {
    items = items.filter(
      (pedido) =>
        pedido.folio.toLowerCase().includes(busqueda) ||
        pedido.clienteNombre.toLowerCase().includes(busqueda),
    )
  }

  items = [...items].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))

  const total = items.length
  const inicio = (page - 1) * pageSize
  const respuesta: PedidosRespuesta = {
    data: items.slice(inicio, inicio + pageSize),
    total,
    page,
    pageSize,
  }
  return respuesta
})

registerMock("POST", /^\/admin\/pedidos\/([^/]+)\/acciones$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const detalle = buscarPedido(id)
  const body = (ctx.body ?? {}) as Partial<AccionPedidoPayload>
  const motivo = body.motivo?.trim()
  if (!motivo || motivo.length < 3) {
    throw new ApiError(422, "El motivo es obligatorio para esta acción.", "motivo_requerido")
  }

  const agregarEvento = (evento: Omit<EventoBitacora, "id" | "servidorEn">) => {
    detalle.bitacora.push({
      ...evento,
      id: `${detalle.id}-e${detalle.bitacora.length + 1}`,
      servidorEn: new Date().toISOString(),
    })
  }

  switch (body.accion as AccionPedido) {
    case "anular_linea": {
      const linea = detalle.lineas.find((item) => item.id === body.lineaId)
      if (!linea) throw new ApiError(404, "La línea no existe.", "linea_no_encontrada")
      linea.estado = "anulada"
      linea.estadoTone = LINEA_ESTADO_TONE.anulada
      recalcular(detalle)
      agregarEvento({
        tipo: "linea_anulada",
        actor: "María Gómez",
        actorTipo: "administrador",
        canal: "admin",
        dispositivo: "Panel admin",
        resultado: "Completado",
        detalle: `${motivo}`,
        diffs: [{ campo: "Línea", antes: `${linea.nombreSnapshot} · incluida`, despues: "Anulada" }],
      })
      break
    }
    case "anular_pedido": {
      agregarEvento({
        tipo: "cancelado",
        actor: "María Gómez",
        actorTipo: "administrador",
        canal: "admin",
        dispositivo: "Panel admin",
        resultado: "Completado",
        detalle: motivo,
        diffs: [{ campo: "Estado", antes: ESTADO_LABEL[detalle.estado], despues: ESTADO_LABEL.cancelado }],
      })
      detalle.estado = "cancelado"
      detalle.canceladoEn = new Date().toISOString()
      break
    }
    case "reasignar": {
      const antes = [detalle.mesa ?? "Sin mesa", detalle.mesero].join(" · ")
      if (body.mesa) detalle.mesa = body.mesa
      if (body.mesero) detalle.mesero = body.mesero
      const despues = [detalle.mesa ?? "Sin mesa", detalle.mesero].join(" · ")
      agregarEvento({
        tipo: "reasignado",
        actor: "María Gómez",
        actorTipo: "administrador",
        canal: "admin",
        dispositivo: "Panel admin",
        resultado: "Completado",
        detalle: motivo,
        diffs: [{ campo: "Mesa · mesero", antes, despues }],
      })
      break
    }
    case "reimprimir":
    case "reenviar": {
      const tipo = body.accion === "reimprimir" ? "reimpreso" : "reenviado"
      agregarEvento({
        tipo,
        actor: "María Gómez",
        actorTipo: "administrador",
        canal: "admin",
        dispositivo: body.accion === "reimprimir" ? "Router de impresión" : "KDS cocina",
        resultado: "Completado",
        detalle: motivo,
      })
      break
    }
    default:
      throw new ApiError(400, "Acción no reconocida.", "accion_invalida")
  }

  return detalle
})

registerMock("POST", /^\/admin\/pedidos\/([^/]+)\/reembolsos$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const detalle = buscarPedido(id)
  const body = (ctx.body ?? {}) as Partial<ReembolsoPayload>
  const motivo = body.motivo?.trim()
  if (!motivo || motivo.length < 3) {
    throw new ApiError(422, "El motivo es obligatorio para el reembolso.", "motivo_requerido")
  }

  const pago = detalle.pagos.find((item) => item.id === body.pagoId)
  if (!pago) throw new ApiError(404, "El pago a reembolsar no existe.", "pago_no_encontrado")
  const monto = Math.round(Number(body.montoCentavos ?? 0))
  if (monto <= 0) throw new ApiError(422, "El monto debe ser mayor a cero.", "monto_invalido")
  if (monto > pago.montoCentavos) {
    throw new ApiError(
      422,
      `El reembolso no puede superar el pago original (${(pago.montoCentavos / 100).toFixed(2)} MXN).`,
      "reembolso_excede_pago",
    )
  }

  pago.estado = "reembolsado"
  pago.estadoTone = PAGO_ESTADO_TONE.reembolsado
  pago.reembolsadoEn = new Date().toISOString()
  detalle.estado = "reembolsado"

  detalle.bitacora.push({
    id: `${detalle.id}-e${detalle.bitacora.length + 1}`,
    tipo: "reembolsado",
    actor: "María Gómez",
    actorTipo: "administrador",
    canal: "admin",
    dispositivo: "Panel admin",
    servidorEn: new Date().toISOString(),
    resultado: "Aprobado",
    detalle: `${motivo} · Monto ${(monto / 100).toFixed(2)} MXN`,
    diffs: [{ campo: "Estado del pago", antes: PAGO_ESTADO_LABEL.aprobado, despues: PAGO_ESTADO_LABEL.reembolsado }],
  })

  recalcular(detalle)
  return detalle
})

registerMock("GET", /^\/admin\/pedidos\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  return buscarPedido(id)
})

const EXPORTACIONES: Exportacion[] = []

registerMock("POST", /^\/admin\/exportaciones$/, (ctx) => {
  const body = (ctx.body ?? {}) as { tipo?: Exportacion["tipo"]; formato?: Exportacion["formato"] }
  const exportacion: Exportacion = {
    id: `exp-${EXPORTACIONES.length + 1}`,
    tipo: body.tipo ?? "pedidos",
    formato: body.formato ?? "csv",
    estado: "en_proceso",
    creadoEn: new Date().toISOString(),
  }
  EXPORTACIONES.push(exportacion)
  return exportacion
})

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function usePedidos(filtros: PedidosFiltros) {
  return useQuery({
    queryKey: ["pedidos", "lista", filtros],
    queryFn: () => api.get<PedidosRespuesta>("/admin/pedidos", filtros as unknown as Query),
    placeholderData: keepPreviousData,
  })
}

export function usePedidoDetalle(id: string | null) {
  return useQuery({
    queryKey: ["pedidos", "detalle", id],
    queryFn: () => api.get<PedidoDetalle>(`/admin/pedidos/${id}`),
    enabled: Boolean(id),
  })
}

export function useAccionPedido() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AccionPedidoPayload) =>
      api.post<PedidoDetalle>(`/admin/pedidos/${payload.id}/acciones`, payload),
    onSuccess: (_detalle, payload) => {
      void queryClient.invalidateQueries({ queryKey: ["pedidos"] })
      void queryClient.invalidateQueries({ queryKey: ["pedidos", "detalle", payload.id] })
    },
  })
}

export function useReembolsoPedido() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ReembolsoPayload) =>
      api.post<PedidoDetalle>(`/admin/pedidos/${payload.id}/reembolsos`, payload),
    onSuccess: (_detalle, payload) => {
      void queryClient.invalidateQueries({ queryKey: ["pedidos"] })
      void queryClient.invalidateQueries({ queryKey: ["pedidos", "detalle", payload.id] })
    },
  })
}

export function useExportarPedidos() {
  return useMutation({
    mutationFn: (payload: { tipo: Exportacion["tipo"]; formato?: Exportacion["formato"]; pedidoId?: string }) =>
      api.post<Exportacion>("/admin/exportaciones", payload),
  })
}

/** Utilidad para los selects del prototipo. */
export { AJUSTE_LABEL, ESTADO_LABEL, ESTADO_TONE, LINEA_ESTADO_LABEL, PAGO_ESTADO_LABEL }
