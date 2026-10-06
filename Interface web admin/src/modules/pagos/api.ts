import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError, registerMock, type Query } from "@/lib/api"
import type {
  AjustePago,
  ExportacionResp,
  FacturaVinculada,
  LiquidacionPropinas,
  PagoAuditoria,
  PagoDetalle,
  PagoFila,
  PagoFiltros,
  PagosResp,
  PagosTotales,
  PagoEstado,
  PropinasResp,
  ReembolsoPayload,
} from "@/modules/pagos/types"
import { PAGO_ESTADO_TONE } from "@/modules/pagos/types"

/* -------------------------------------------------------------------------- */
/* Mock de desarrollo                                                          */
/* Se retira cuando el backend NestJS exponga `/admin/pagos/*`.               */
/* -------------------------------------------------------------------------- */

const MIN = 60_000

type MedioSeed = { id: string; nombre: string; tipo: PagoFila["medioTipo"]; sucursalId: string; activo: boolean }

const MEDIOS: MedioSeed[] = [
  { id: "m-efectivo-centro", nombre: "Efectivo", tipo: "efectivo", sucursalId: "centro", activo: true },
  { id: "m-tarjeta-centro", nombre: "Tarjeta débito/crédito", tipo: "tarjeta", sucursalId: "centro", activo: true },
  { id: "m-transferencia-centro", nombre: "Transferencia", tipo: "transferencia", sucursalId: "centro", activo: true },
  { id: "m-vale-centro", nombre: "Vales de comida", tipo: "vale", sucursalId: "centro", activo: false },
  { id: "m-efectivo-norte", nombre: "Efectivo", tipo: "efectivo", sucursalId: "norte", activo: true },
  { id: "m-tarjeta-norte", nombre: "Tarjeta débito/crédito", tipo: "tarjeta", sucursalId: "norte", activo: true },
]

const TURNOS: Record<string, { numero: string; sucursalId: string }> = {
  "tn-centro-104": { numero: "T-104", sucursalId: "centro" },
  "tn-centro-105": { numero: "T-105", sucursalId: "centro" },
  "tn-centro-106": { numero: "T-106", sucursalId: "centro" },
  "tn-centro-107": { numero: "T-107", sucursalId: "centro" },
  "tn-norte-88": { numero: "T-088", sucursalId: "norte" },
  "tn-norte-89": { numero: "T-089", sucursalId: "norte" },
}

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

export function haceDiasISO(dias: number): string {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - dias)
  return fechaLocal(fecha.toISOString())
}

type LineaSeed = { descripcion: string; cantidad: number; precioCentavos: number }

type PagoSeed = {
  id: string
  fecha: string
  pedidoId: string
  pedidoCodigo: string
  pedidoEstado: string
  turnoId: string
  medioPagoId: string
  montoCentavos: number
  propinaCentavos: number
  descuentoCentavos: number
  estado: PagoEstado
  cajero: string
  referencia: string | null
  cliente: string
  contacto: string | null
  lineas: LineaSeed[]
  ajustes: AjustePago[]
  factura: Omit<FacturaVinculada, "estadoTone"> | null
  reembolsadoEn: string | null
  reembolsoMotivo: string | null
}

function lineas(lineasCfg: LineaSeed[]) {
  return lineasCfg
}

function pagoBase(
  cfg: Pick<
    PagoSeed,
    | "id"
    | "fecha"
    | "pedidoId"
    | "pedidoCodigo"
    | "pedidoEstado"
    | "turnoId"
    | "medioPagoId"
    | "montoCentavos"
    | "estado"
    | "cajero"
  > &
    Partial<PagoSeed>,
): PagoSeed {
  return {
    propinaCentavos: 0,
    descuentoCentavos: 0,
    referencia: null,
    cliente: "Cliente mostrador",
    contacto: null,
    lineas: [],
    ajustes: [],
    factura: null,
    reembolsadoEn: null,
    reembolsoMotivo: null,
    ...cfg,
  } as PagoSeed
}

const PAGOS: PagoSeed[] = [
  pagoBase({
    id: "pg-901",
    fecha: isoHaceDias(1, "10:12"),
    pedidoId: "p-9001",
    pedidoCodigo: "P-9001",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-104",
    medioPagoId: "m-efectivo-centro",
    montoCentavos: 84_500,
    propinaCentavos: 8_000,
    estado: "aprobado",
    cajero: "Laura Pérez",
    cliente: "Ana Morales",
    contacto: "+52 55 1234 5678",
    lineas: lineas([
      { descripcion: "Arrachera al carbón", cantidad: 2, precioCentavos: 18_500 },
      { descripcion: "Guacamole con totopos", cantidad: 1, precioCentavos: 9_500 },
      { descripcion: "Margarita clásica", cantidad: 2, precioCentavos: 14_000 },
      { descripcion: "Pan de la casa", cantidad: 2, precioCentavos: 4_500 },
    ]),
    factura: { id: "f-1042", prefijo: "FE", numero: "1042", estadoDian: "aceptada", totalCentavos: 84_500, notaCredito: null },
  }),
  pagoBase({
    id: "pg-902",
    fecha: isoHaceDias(1, "10:48"),
    pedidoId: "p-9002",
    pedidoCodigo: "P-9002",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-104",
    medioPagoId: "m-tarjeta-centro",
    montoCentavos: 32_000,
    descuentoCentavos: 3_200,
    estado: "aprobado",
    cajero: "Laura Pérez",
    referencia: "AUTH-9002",
    cliente: "Luis Trejo",
    lineas: lineas([
      { descripcion: "Tacos de canasta", cantidad: 3, precioCentavos: 7_500 },
      { descripcion: "Agua de horchata", cantidad: 2, precioCentavos: 3_500 },
    ]),
    ajustes: [
      { id: "aj-902-1", tipo: "descuento", valorCentavos: 3_200, porcentaje: 10, motivo: "Cliente frecuente", usuario: "Laura Pérez" },
    ],
    factura: { id: "f-1043", prefijo: "FE", numero: "1043", estadoDian: "enviada", totalCentavos: 32_000, notaCredito: null },
  }),
  pagoBase({
    id: "pg-903",
    fecha: isoHaceDias(1, "13:20"),
    pedidoId: "p-9003",
    pedidoCodigo: "P-9003",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-104",
    medioPagoId: "m-tarjeta-centro",
    montoCentavos: 121_500,
    propinaCentavos: 12_000,
    estado: "aprobado",
    cajero: "Laura Pérez",
    referencia: "AUTH-9003",
    cliente: "Familia Hernández",
    lineas: lineas([
      { descripcion: "Carne asada", cantidad: 2, precioCentavos: 32_000 },
      { descripcion: "Queso fundido", cantidad: 1, precioCentavos: 12_500 },
      { descripcion: "Cerveza artesanal", cantidad: 4, precioCentavos: 6_500 },
      { descripcion: "Flan napolitano", cantidad: 2, precioCentavos: 7_000 },
    ]),
  }),
  pagoBase({
    id: "pg-904",
    fecha: isoHaceDias(1, "14:05"),
    pedidoId: "p-9004",
    pedidoCodigo: "P-9004",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-104",
    medioPagoId: "m-transferencia-centro",
    montoCentavos: 46_800,
    propinaCentavos: 4_000,
    estado: "aprobado",
    cajero: "Carlos Méndez",
    referencia: "TRF-8891",
    lineas: lineas([{ descripcion: "Pollo rostizado entero", cantidad: 1, precioCentavos: 24_000 }]),
  }),
  pagoBase({
    id: "pg-905",
    fecha: isoHaceDias(1, "15:40"),
    pedidoId: "p-9005",
    pedidoCodigo: "P-9005",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-104",
    medioPagoId: "m-efectivo-centro",
    montoCentavos: 63_000,
    propinaCentavos: 6_000,
    estado: "aprobado",
    cajero: "Carlos Méndez",
    lineas: lineas([{ descripcion: "Enchiladas suizas", cantidad: 3, precioCentavos: 15_500 }]),
  }),
  pagoBase({
    id: "pg-906",
    fecha: isoHaceDias(1, "20:12"),
    pedidoId: "p-9006",
    pedidoCodigo: "P-9006",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-105",
    medioPagoId: "m-tarjeta-centro",
    montoCentavos: 152_000,
    propinaCentavos: 15_000,
    estado: "aprobado",
    cajero: "Carlos Méndez",
    referencia: "AUTH-9006",
    cliente: "Marta Ruiz",
    lineas: lineas([
      { descripcion: "Parrillada para dos", cantidad: 1, precioCentavos: 89_000 },
      { descripcion: "Postre de la casa", cantidad: 2, precioCentavos: 15_000 },
    ]),
    factura: { id: "f-1046", prefijo: "FE", numero: "1046", estadoDian: "rechazada", totalCentavos: 152_000, notaCredito: null },
  }),
  pagoBase({
    id: "pg-907",
    fecha: isoHaceDias(1, "21:02"),
    pedidoId: "p-9007",
    pedidoCodigo: "P-9007",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-105",
    medioPagoId: "m-efectivo-centro",
    montoCentavos: 98_400,
    propinaCentavos: 9_500,
    descuentoCentavos: 4_900,
    estado: "aprobado",
    cajero: "Diego Ramírez",
    ajustes: [
      { id: "aj-907-1", tipo: "cortesia", valorCentavos: 4_900, porcentaje: null, motivo: "Reposición por demora", usuario: "Diego Ramírez" },
    ],
    lineas: lineas([
      { descripcion: "Sopa de tortilla", cantidad: 2, precioCentavos: 11_000 },
      { descripcion: "Tacos al pastor", cantidad: 3, precioCentavos: 16_000 },
    ]),
  }),
  pagoBase({
    id: "pg-908",
    fecha: isoHaceDias(1, "21:35"),
    pedidoId: "p-9008",
    pedidoCodigo: "P-9008",
    pedidoEstado: "reembolsado",
    turnoId: "tn-centro-105",
    medioPagoId: "m-transferencia-centro",
    montoCentavos: 41_200,
    estado: "reembolsado",
    cajero: "Diego Ramírez",
    referencia: "TRF-9010",
    reembolsadoEn: isoHaceDias(1, "21:50"),
    reembolsoMotivo: "Pedido cancelado por el cliente antes de preparar",
    factura: { id: "f-1048", prefijo: "FE", numero: "1048", estadoDian: "anulada", totalCentavos: 41_200, notaCredito: { id: "f-1048-nc", numero: "NC-0007", estado: "aceptada" } },
    lineas: lineas([{ descripcion: "Pizza pepperoni", cantidad: 1, precioCentavos: 41_200 }]),
  }),
  pagoBase({
    id: "pg-909",
    fecha: isoHaceDias(1, "22:18"),
    pedidoId: "p-9009",
    pedidoCodigo: "P-9009",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-105",
    medioPagoId: "m-efectivo-centro",
    montoCentavos: 27_500,
    estado: "aprobado",
    cajero: "Carlos Méndez",
    lineas: lineas([{ descripcion: "Chilaquiles verdes", cantidad: 2, precioCentavos: 13_750 }]),
  }),
  pagoBase({
    id: "pg-910",
    fecha: isoHaceDias(0, "03:05"),
    pedidoId: "p-9010",
    pedidoCodigo: "P-9010",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-106",
    medioPagoId: "m-efectivo-centro",
    montoCentavos: 38_000,
    propinaCentavos: 3_000,
    estado: "aprobado",
    cajero: "Diego Ramírez",
    lineas: lineas([{ descripcion: "Café americano", cantidad: 2, precioCentavos: 4_000 }, { descripcion: "Pan dulce", cantidad: 3, precioCentavos: 10_000 }]),
  }),
  pagoBase({
    id: "pg-911",
    fecha: isoHaceDias(0, "05:40"),
    pedidoId: "p-9011",
    pedidoCodigo: "P-9011",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-106",
    medioPagoId: "m-tarjeta-centro",
    montoCentavos: 56_000,
    propinaCentavos: 5_500,
    estado: "aprobado",
    cajero: "Diego Ramírez",
    referencia: "AUTH-9011",
    lineas: lineas([{ descripcion: "Huevos rancheros", cantidad: 2, precioCentavos: 28_000 }]),
  }),
  pagoBase({
    id: "pg-912",
    fecha: isoHaceDias(0, "10:22"),
    pedidoId: "p-9012",
    pedidoCodigo: "P-9012",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-107",
    medioPagoId: "m-efectivo-centro",
    montoCentavos: 84_500,
    propinaCentavos: 8_000,
    estado: "aprobado",
    cajero: "Laura Pérez",
    cliente: "Ana Morales",
    contacto: "+52 55 1234 5678",
    lineas: lineas([
      { descripcion: "Arrachera al carbón", cantidad: 2, precioCentavos: 18_500 },
      { descripcion: "Agua de horchata", cantidad: 2, precioCentavos: 3_500 },
    ]),
    factura: { id: "f-1051", prefijo: "FE", numero: "1051", estadoDian: "aceptada", totalCentavos: 84_500, notaCredito: null },
  }),
  pagoBase({
    id: "pg-913",
    fecha: isoHaceDias(0, "11:05"),
    pedidoId: "p-9013",
    pedidoCodigo: "P-9013",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-107",
    medioPagoId: "m-tarjeta-centro",
    montoCentavos: 36_000,
    descuentoCentavos: 2_500,
    estado: "aprobado",
    cajero: "Laura Pérez",
    referencia: "AUTH-9013",
    ajustes: [
      { id: "aj-913-1", tipo: "descuento", valorCentavos: 2_500, porcentaje: 7, motivo: "Promoción del día", usuario: "Laura Pérez" },
    ],
    lineas: lineas([{ descripcion: "Combo ejecutivo", cantidad: 1, precioCentavos: 36_000 }]),
    factura: { id: "f-1052", prefijo: "FE", numero: "1052", estadoDian: "pendiente", totalCentavos: 36_000, notaCredito: null },
  }),
  pagoBase({
    id: "pg-914",
    fecha: isoHaceDias(0, "11:40"),
    pedidoId: "p-9014",
    pedidoCodigo: "P-9014",
    pedidoEstado: "pagado",
    turnoId: "tn-centro-107",
    medioPagoId: "m-transferencia-centro",
    montoCentavos: 52_400,
    propinaCentavos: 5_000,
    estado: "aprobado",
    cajero: "Laura Pérez",
    referencia: "TRF-9014",
    lineas: lineas([{ descripcion: "Pizza familiar", cantidad: 1, precioCentavos: 52_400 }]),
  }),
  pagoBase({
    id: "pg-915",
    fecha: isoHaceDias(0, "09:58"),
    pedidoId: "p-9015",
    pedidoCodigo: "P-9015",
    pedidoEstado: "por_cobrar",
    turnoId: "tn-centro-107",
    medioPagoId: "m-efectivo-centro",
    montoCentavos: 77_000,
    estado: "pendiente",
    cajero: "Laura Pérez",
    lineas: lineas([{ descripcion: "Cuenta mesa 05", cantidad: 1, precioCentavos: 77_000 }]),
  }),
  pagoBase({
    id: "pg-916",
    fecha: isoHaceDias(0, "10:30"),
    pedidoId: "p-9016",
    pedidoCodigo: "P-9016",
    pedidoEstado: "en_preparacion",
    turnoId: "tn-centro-107",
    medioPagoId: "m-tarjeta-centro",
    montoCentavos: 45_800,
    estado: "rechazado",
    cajero: "Laura Pérez",
    referencia: "AUTH-9016",
    lineas: lineas([{ descripcion: "Cuenta mesa 08", cantidad: 1, precioCentavos: 45_800 }]),
  }),
  pagoBase({
    id: "pg-917",
    fecha: isoHaceDias(1, "11:15"),
    pedidoId: "p-9020",
    pedidoCodigo: "P-9020",
    pedidoEstado: "pagado",
    turnoId: "tn-norte-88",
    medioPagoId: "m-efectivo-norte",
    montoCentavos: 44_000,
    propinaCentavos: 4_000,
    estado: "aprobado",
    cajero: "Ana Morales",
    lineas: lineas([{ descripcion: "Menú del día", cantidad: 2, precioCentavos: 22_000 }]),
  }),
  pagoBase({
    id: "pg-918",
    fecha: isoHaceDias(1, "13:50"),
    pedidoId: "p-9021",
    pedidoCodigo: "P-9021",
    pedidoEstado: "pagado",
    turnoId: "tn-norte-88",
    medioPagoId: "m-tarjeta-norte",
    montoCentavos: 29_500,
    estado: "aprobado",
    cajero: "Ana Morales",
    referencia: "AUTH-9021",
    lineas: lineas([{ descripcion: "Torta de cochinita", cantidad: 1, precioCentavos: 29_500 }]),
  }),
  pagoBase({
    id: "pg-919",
    fecha: isoHaceDias(0, "10:10"),
    pedidoId: "p-9022",
    pedidoCodigo: "P-9022",
    pedidoEstado: "pagado",
    turnoId: "tn-norte-89",
    medioPagoId: "m-efectivo-norte",
    montoCentavos: 31_000,
    propinaCentavos: 3_000,
    estado: "aprobado",
    cajero: "Ana Morales",
    lineas: lineas([{ descripcion: "Desayuno norteño", cantidad: 1, precioCentavos: 31_000 }]),
  }),
]

const LIQUIDACIONES: LiquidacionPropinas[] = [
  {
    id: "liq-001",
    periodoDesde: isoHaceDias(3, "00:00").slice(0, 10),
    periodoHasta: isoHaceDias(1, "00:00").slice(0, 10),
    creadaEn: isoHaceDias(1, "12:00"),
    creadaPor: "María Gómez",
    estado: "exportada",
    totalCentavos: 36_500,
    pagos: 8,
    exportadaEn: isoHaceDias(1, "12:05"),
  },
]

function buscarPago(id: string): PagoSeed {
  const pago = PAGOS.find((item) => item.id === id)
  if (!pago) throw new ApiError(404, "El pago no existe o fue movido.", "pago_no_encontrado")
  return pago
}

function medioDe(id: string): MedioSeed {
  const medio = MEDIOS.find((item) => item.id === id)
  if (!medio) throw new ApiError(404, "El medio de pago no existe.", "medio_no_encontrado")
  return medio
}

function aFila(seed: PagoSeed): PagoFila {
  const medio = medioDe(seed.medioPagoId)
  return {
    id: seed.id,
    fecha: seed.fecha,
    pedidoId: seed.pedidoId,
    pedidoCodigo: seed.pedidoCodigo,
    turnoId: seed.turnoId,
    turnoNumero: TURNOS[seed.turnoId]?.numero ?? seed.turnoId,
    medioPagoId: medio.id,
    medioNombre: medio.nombre,
    medioTipo: medio.tipo,
    montoCentavos: seed.montoCentavos,
    propinaCentavos: seed.propinaCentavos,
    descuentoCentavos: seed.descuentoCentavos,
    estado: seed.estado,
    estadoTone: PAGO_ESTADO_TONE[seed.estado],
    cajero: seed.cajero,
    referencia: seed.referencia,
    reembolsadoEn: seed.reembolsadoEn,
  }
}

function auditoriaDe(seed: PagoSeed): PagoAuditoria[] {
  const eventos: PagoAuditoria[] = [
    {
      id: `${seed.id}-a1`,
      accion: "creado",
      actor: seed.cajero,
      ocurridoEn: seed.fecha,
      detalle: `Cobro con ${medioDe(seed.medioPagoId).nombre}.`,
    },
  ]
  if (seed.estado === "aprobado" || seed.estado === "reembolsado") {
    eventos.push({
      id: `${seed.id}-a2`,
      accion: "aprobado",
      actor: seed.cajero,
      ocurridoEn: seed.fecha,
      detalle: "Pago aplicado al pedido.",
    })
  }
  if (seed.estado === "reembolsado" && seed.reembolsadoEn) {
    eventos.push({
      id: `${seed.id}-a3`,
      accion: "reembolsado",
      actor: "María Gómez",
      ocurridoEn: seed.reembolsadoEn,
      motivo: seed.reembolsoMotivo ?? undefined,
      detalle: `Reembolso de ${(seed.montoCentavos / 100).toFixed(2)} MXN al medio original.`,
    })
  }
  return eventos
}

function aDetalle(seed: PagoSeed): PagoDetalle {
  const fila = aFila(seed)
  const sucursalId = TURNOS[seed.turnoId]?.sucursalId ?? "centro"
  const sede = SEDES[sucursalId] ?? SEDES.centro
  const turno = TURNOS[seed.turnoId]
  const puedeReembolsar = seed.estado === "aprobado"
  const factura: FacturaVinculada | null = seed.factura
    ? {
        ...seed.factura,
        estadoTone:
          seed.factura.estadoDian === "aceptada"
            ? "green"
            : seed.factura.estadoDian === "enviada"
              ? "blue"
              : seed.factura.estadoDian === "pendiente"
                ? "amber"
                : "gray",
      }
    : null

  return {
    ...fila,
    moneda: sede.moneda,
    zonaHoraria: sede.zonaHoraria,
    turnoEstado: seed.turnoId === "tn-centro-107" || seed.turnoId === "tn-norte-89" ? "abierto" : "cerrado",
    pedido: {
      id: seed.pedidoId,
      codigo: seed.pedidoCodigo,
      estado: seed.pedidoEstado,
      estadoTone:
        seed.pedidoEstado === "pagado"
          ? "green"
          : seed.pedidoEstado === "reembolsado"
            ? "gray"
            : seed.pedidoEstado === "por_cobrar"
              ? "amber"
              : "blue",
      totalCentavos: seed.montoCentavos + seed.descuentoCentavos,
      propinaCentavos: seed.propinaCentavos,
      descuentosCentavos: seed.descuentoCentavos,
      turnoId: seed.turnoId,
      turnoNumero: turno?.numero ?? seed.turnoId,
    },
    cliente: { nombre: seed.cliente, contacto: seed.contacto },
    lineas: seed.lineas.map((linea, index) => ({
      id: `${seed.id}-l${index + 1}`,
      descripcion: linea.descripcion,
      cantidad: linea.cantidad,
      precioCentavos: linea.precioCentavos,
      totalCentavos: linea.cantidad * linea.precioCentavos,
    })),
    ajustes: seed.ajustes,
    factura,
    reembolso: {
      posible: puedeReembolsar,
      maximoCentavos: seed.montoCentavos,
      motivoNoPosible:
        seed.estado === "reembolsado"
          ? "El pago ya fue reembolsado; un reintento sería rechazado (409)."
          : seed.estado === "rechazado"
            ? "Un pago rechazado no se reembolsa (409)."
            : seed.estado === "pendiente"
              ? "El pago aún no está aprobado; no hay nada que reembolsar (409)."
              : null,
      reembolsadoEn: seed.reembolsadoEn,
    },
    conciliacion: {
      conciliado: seed.estado === "aprobado" || seed.estado === "reembolsado",
      notaCredito: factura?.notaCredito ? `${factura.notaCredito.numero} · ${factura.notaCredito.estado}` : null,
      detalle:
        seed.estado === "aprobado"
          ? "Pago aplicado al pedido y conciliado con el arqueo del turno."
          : seed.estado === "reembolsado"
            ? "Pago reembolsado; el reverso queda conciliado con su documento fiscal."
            : seed.estado === "rechazado"
              ? "El proveedor rechazó el cobro; el pago no se aplica al pedido."
              : "Cobro en curso; todavía no concilia.",
    },
    auditoria: auditoriaDe(seed),
  }
}

function coincideFecha(iso: string, desde?: string, hasta?: string): boolean {
  const fecha = fechaLocal(iso)
  if (desde && fecha < desde) return false
  if (hasta && fecha > hasta) return false
  return true
}

function boolParam(valor: unknown): boolean {
  return valor === true || valor === "true"
}

function calcularTotales(items: PagoSeed[]): PagosTotales {
  const porMedio = new Map<string, PagosTotales["porMedio"][number]>()
  const totales: PagosTotales = {
    montoCentavos: 0,
    propinaCentavos: 0,
    descuentoCentavos: 0,
    reembolsadoCentavos: 0,
    porMedio: [],
  }
  for (const pago of items) {
    const medio = medioDe(pago.medioPagoId)
    totales.montoCentavos += pago.montoCentavos
    totales.propinaCentavos += pago.propinaCentavos
    totales.descuentoCentavos += pago.descuentoCentavos
    if (pago.estado === "reembolsado") totales.reembolsadoCentavos += pago.montoCentavos
    let fila = porMedio.get(medio.id)
    if (!fila) {
      fila = { medioPagoId: medio.id, nombre: medio.nombre, montoCentavos: 0, propinaCentavos: 0 }
      porMedio.set(medio.id, fila)
    }
    fila.montoCentavos += pago.montoCentavos
    fila.propinaCentavos += pago.propinaCentavos
  }
  totales.porMedio = [...porMedio.values()]
  return totales
}

/* -------------------------------------------------------------------------- */
/* Mocks registrados                                                           */
/* -------------------------------------------------------------------------- */

registerMock("GET", /^\/admin\/pagos$/, (ctx) => {
  const q = ctx.query
  const page = Math.max(1, Number(q.page ?? 1))
  const pageSize = Math.max(1, Number(q.pageSize ?? 10))

  let items = PAGOS.filter((pago) => {
    if (q.turnoId && pago.turnoId !== q.turnoId) return false
    if (q.medioId && pago.medioPagoId !== q.medioId) return false
    if (q.cajero && pago.cajero !== q.cajero) return false
    if (q.estado && pago.estado !== q.estado) return false
    if (q.pedido) {
      const busqueda = String(q.pedido).toLowerCase()
      if (!pago.pedidoCodigo.toLowerCase().includes(busqueda)) return false
    }
    if (q.desde || q.hasta) {
      if (!coincideFecha(pago.fecha, q.desde as string, q.hasta as string)) return false
    }
    if (boolParam(q.reembolsados) && pago.estado !== "reembolsado") return false
    return true
  })

  items = [...items].sort((a, b) => b.fecha.localeCompare(a.fecha))
  const totales = calcularTotales(items)
  const respuesta: PagosResp = {
    data: items.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize).map(aFila),
    total: items.length,
    page,
    pageSize,
    totales,
  }
  return respuesta
})

registerMock("GET", /^\/admin\/pagos\/propinas\/liquidaciones$/, (ctx) => {
  const q = ctx.query
  const desde = typeof q.desde === "string" && q.desde ? q.desde : hoyISO()
  const hasta = typeof q.hasta === "string" && q.hasta ? q.hasta : hoyISO()

  const aprobados = PAGOS.filter(
    (pago) => pago.estado === "aprobado" && coincideFecha(pago.fecha, desde, hasta),
  )

  const porDia = new Map<string, PropinasResp["porDia"][number]>()
  const porTurno = new Map<string, PropinasResp["porTurno"][number]>()
  const porMedio = new Map<string, PropinasResp["porMedio"][number]>()
  const porUsuario = new Map<string, PropinasResp["porUsuario"][number]>()

  for (const pago of aprobados) {
    if (pago.propinaCentavos === 0) continue
    const dia = fechaLocal(pago.fecha)
    const filaDia = porDia.get(dia) ?? { fecha: dia, totalCentavos: 0, pagos: 0 }
    filaDia.totalCentavos += pago.propinaCentavos
    filaDia.pagos += 1
    porDia.set(dia, filaDia)

    const turno = TURNOS[pago.turnoId]
    const filaTurno = porTurno.get(pago.turnoId) ?? {
      turnoId: pago.turnoId,
      turnoNumero: turno?.numero ?? pago.turnoId,
      totalCentavos: 0,
      pagos: 0,
    }
    filaTurno.totalCentavos += pago.propinaCentavos
    filaTurno.pagos += 1
    porTurno.set(pago.turnoId, filaTurno)

    const medio = medioDe(pago.medioPagoId)
    const filaMedio = porMedio.get(medio.id) ?? { medioPagoId: medio.id, nombre: medio.nombre, totalCentavos: 0, pagos: 0 }
    filaMedio.totalCentavos += pago.propinaCentavos
    filaMedio.pagos += 1
    porMedio.set(medio.id, filaMedio)

    const filaUsuario = porUsuario.get(pago.cajero) ?? { usuario: pago.cajero, totalCentavos: 0, pagos: 0 }
    filaUsuario.totalCentavos += pago.propinaCentavos
    filaUsuario.pagos += 1
    porUsuario.set(pago.cajero, filaUsuario)
  }

  const respuesta: PropinasResp = {
    desde,
    hasta,
    moneda: SEDES.centro.moneda,
    zonaHoraria: SEDES.centro.zonaHoraria,
    totalCentavos: aprobados.reduce((total, pago) => total + pago.propinaCentavos, 0),
    pagos: aprobados.filter((pago) => pago.propinaCentavos > 0).length,
    porDia: [...porDia.values()].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    porTurno: [...porTurno.values()],
    porMedio: [...porMedio.values()],
    porUsuario: [...porUsuario.values()].sort((a, b) => b.totalCentavos - a.totalCentavos),
    liquidaciones: LIQUIDACIONES,
  }
  return respuesta
})

registerMock("POST", /^\/admin\/pagos\/propinas\/liquidaciones$/, (ctx) => {
  const body = (ctx.body ?? {}) as { periodoDesde?: string; periodoHasta?: string; motivo?: string }
  if (!body.periodoDesde || !body.periodoHasta) {
    throw new ApiError(422, "El período desde/hasta es obligatorio.", "periodo_requerido")
  }
  if (body.periodoDesde > body.periodoHasta) {
    throw new ApiError(422, "El período está invertido: revisa las fechas.", "periodo_invalido")
  }
  if ((body.motivo?.trim() ?? "").length < 3) {
    throw new ApiError(422, "La liquidación exige un motivo (queda auditada).", "motivo_requerido")
  }

  const aprobados = PAGOS.filter(
    (pago) => pago.estado === "aprobado" && coincideFecha(pago.fecha, body.periodoDesde, body.periodoHasta),
  )
  const totalCentavos = aprobados.reduce((total, pago) => total + pago.propinaCentavos, 0)
  if (totalCentavos === 0) {
    throw new ApiError(422, "El período no tiene propinas de pagos aprobados.", "sin_propinas")
  }

  const liquidacion: LiquidacionPropinas = {
    id: `liq-${String(LIQUIDACIONES.length + 1).padStart(3, "0")}`,
    periodoDesde: body.periodoDesde,
    periodoHasta: body.periodoHasta,
    creadaEn: new Date().toISOString(),
    creadaPor: "María Gómez",
    estado: "borrador",
    totalCentavos,
    pagos: aprobados.filter((pago) => pago.propinaCentavos > 0).length,
    exportadaEn: null,
  }
  LIQUIDACIONES.unshift(liquidacion)
  return liquidacion
})

registerMock("POST", /^\/admin\/pagos\/propinas\/liquidaciones\/([^/]+)\/export$/, (ctx) => {
  const id = ctx.path.split("/")[5] ?? ""
  const liquidacion = LIQUIDACIONES.find((item) => item.id === id)
  if (!liquidacion) throw new ApiError(404, "La liquidación no existe.", "liquidacion_no_encontrada")
  liquidacion.estado = "exportada"
  liquidacion.exportadaEn = new Date().toISOString()
  const exportacion: ExportacionResp = {
    ok: true,
    id: `exp-${Date.now()}`,
    exportacionId: `exp-${Date.now()}`,
    tipo: "liquidacion_propinas",
    formato: "csv",
    estado: "en_proceso",
    creadoEn: new Date().toISOString(),
  }
  return exportacion
})

registerMock("POST", /^\/admin\/pagos\/([^/]+)\/reembolsos$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const pago = buscarPago(id)
  const body = (ctx.body ?? {}) as Partial<ReembolsoPayload>
  const motivo = body.motivo?.trim() ?? ""
  if (motivo.length < 3) {
    throw new ApiError(422, "El motivo es obligatorio para el reembolso.", "motivo_requerido")
  }
  if (pago.estado !== "aprobado") {
    throw new ApiError(
      409,
      pago.estado === "reembolsado"
        ? "El pago ya fue reembolsado; no se puede reembolsar dos veces."
        : "Solo se pueden reembolsar pagos aprobados.",
      "pago_no_reembolsable",
    )
  }
  const monto = Math.round(Number(body.montoCentavos ?? 0))
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new ApiError(422, "El monto debe ser mayor a cero.", "monto_invalido")
  }
  if (monto > pago.montoCentavos) {
    throw new ApiError(
      422,
      `El reembolso no puede superar el pago. Máximo reembolsable: ${(pago.montoCentavos / 100).toFixed(2)} MXN.`,
      "reembolso_excede_pago",
    )
  }

  pago.estado = "reembolsado"
  pago.reembolsadoEn = new Date().toISOString()
  pago.reembolsoMotivo = motivo
  return aDetalle(pago)
})

registerMock("GET", /^\/admin\/pagos\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  return aDetalle(buscarPago(id))
})

registerMock("POST", /^\/admin\/exportaciones$/, (ctx) => {
  const body = (ctx.body ?? {}) as { tipo?: string; formato?: ExportacionResp["formato"] }
  const exportacion: ExportacionResp = {
    ok: true,
    id: `exp-${Date.now()}`,
    exportacionId: `exp-${Date.now()}`,
    tipo: body.tipo ?? "pagos",
    formato: body.formato ?? "csv",
    estado: "en_proceso",
    creadoEn: new Date().toISOString(),
  }
  return exportacion
})

/* -------------------------------------------------------------------------- */
/* Catálogos para filtros del prototipo                                        */
/* -------------------------------------------------------------------------- */

export const TURNOS_OPCIONES = Object.entries(TURNOS).map(([id, turno]) => ({
  value: id,
  label: turno.numero,
}))

export const MEDIOS_OPCIONES = MEDIOS.map((medio) => ({
  value: medio.id,
  label: `${medio.nombre}${medio.activo ? "" : " · deshabilitado"}`,
}))

export const CAJEROS_OPCIONES = [...new Set(PAGOS.map((pago) => pago.cajero))].sort()

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function usePagos(filtros: PagoFiltros) {
  return useQuery({
    queryKey: ["pagos", "lista", filtros],
    queryFn: () => api.get<PagosResp>("/admin/pagos", filtros as unknown as Query),
    placeholderData: keepPreviousData,
  })
}

export function usePagoDetalle(id: string | null) {
  return useQuery({
    queryKey: ["pagos", "detalle", id],
    queryFn: () => api.get<PagoDetalle>(`/admin/pagos/${id}`),
    enabled: Boolean(id),
  })
}

export function useReembolsarPago() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ReembolsoPayload) =>
      api.post<PagoDetalle>(`/admin/pagos/${payload.pagoId}/reembolsos`, payload),
    onSuccess: (_detalle, payload) => {
      void queryClient.invalidateQueries({ queryKey: ["pagos"] })
      void queryClient.invalidateQueries({ queryKey: ["pagos", "detalle", payload.pagoId] })
    },
  })
}

export function usePropinas(desde: string, hasta: string) {
  return useQuery({
    queryKey: ["pagos", "propinas", desde, hasta],
    queryFn: () => api.get<PropinasResp>("/admin/pagos/propinas/liquidaciones", { desde, hasta }),
    placeholderData: keepPreviousData,
  })
}

export function useCrearLiquidacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { periodoDesde: string; periodoHasta: string; motivo: string }) =>
      api.post<LiquidacionPropinas>("/admin/pagos/propinas/liquidaciones", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pagos", "propinas"] })
    },
  })
}

export function useExportarLiquidacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (liquidacionId: string) =>
      api.post<ExportacionResp>(`/admin/pagos/propinas/liquidaciones/${liquidacionId}/export`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pagos", "propinas"] })
    },
  })
}

export function useExportarPagos() {
  return useMutation({
    mutationFn: (payload: {
      tipo: string
      formato: ExportacionResp["formato"]
      filtros?: Record<string, unknown>
    }) => api.post<ExportacionResp>("/admin/exportaciones", payload),
  })
}

export { PAGO_ESTADO_LABEL, PAGO_ESTADO_TONE } from "@/modules/pagos/types"
