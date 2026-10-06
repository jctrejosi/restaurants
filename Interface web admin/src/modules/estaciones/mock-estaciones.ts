/**
 * Datos simulados de Estaciones e impresoras (plan 07). El catálogo los usa para
 * asignar la estación del producto y para el aviso «sin estación → sin comanda».
 */

import { registerMock } from "@/lib/api"
import { productosBase, setEstacionProducto } from "@/modules/catalogo/mock-productos"
import type {
  DocumentoImpresion,
  Estacion,
  Impresora,
  RutaImpresion,
  SlaRegla,
  TrabajoImpresion,
} from "@/modules/estaciones/types"

function hace(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString()
}

const ESTACIONES: Estacion[] = [
  {
    id: "est-parrilla",
    nombre: "Parrilla",
    tipo: "preparacion",
    sucursalId: "centro",
    activa: true,
    slaObjetivoSeg: 900,
    pasoLista: "explicito",
    productoIds: ["prod-arrachera", "prod-alitas"],
    actualizadoEn: hace(60 * 24 * 4),
    actualizadoPor: "María Gómez",
    version: 3,
  },
  {
    id: "est-cocina",
    nombre: "Cocina",
    tipo: "preparacion",
    sucursalId: "centro",
    activa: true,
    slaObjetivoSeg: 900,
    pasoLista: "automatico",
    productoIds: ["prod-tacos", "prod-enchiladas", "prod-chilaquiles", "prod-sopa"],
    actualizadoEn: hace(60 * 24 * 9),
    actualizadoPor: "María Gómez",
    version: 5,
  },
  {
    id: "est-barra-fria",
    nombre: "Barra fría",
    tipo: "preparacion",
    sucursalId: "centro",
    activa: true,
    slaObjetivoSeg: 720,
    pasoLista: "automatico",
    productoIds: ["prod-guacamole", "prod-limonada", "prod-horchata"],
    actualizadoEn: hace(60 * 30),
    actualizadoPor: "Carlos Méndez",
    version: 2,
  },
  {
    id: "est-postres",
    nombre: "Postres",
    tipo: "preparacion",
    sucursalId: "centro",
    activa: true,
    slaObjetivoSeg: 600,
    pasoLista: "explicito",
    productoIds: ["prod-pan", "prod-flan"],
    actualizadoEn: hace(60 * 24 * 2),
    actualizadoPor: "María Gómez",
    version: 2,
  },
  {
    id: "est-horno",
    nombre: "Horno",
    tipo: "preparacion",
    sucursalId: "norte",
    activa: true,
    slaObjetivoSeg: 1200,
    pasoLista: "automatico",
    productoIds: ["prod-pizza"],
    actualizadoEn: hace(60 * 24 * 6),
    actualizadoPor: "Ana Morales",
    version: 1,
  },
  {
    id: "est-barra",
    nombre: "Barra",
    tipo: "despacho",
    sucursalId: "centro",
    activa: true,
    slaObjetivoSeg: 480,
    pasoLista: "automatico",
    productoIds: ["prod-margarita", "prod-cafe"],
    actualizadoEn: hace(60 * 12),
    actualizadoPor: "María Gómez",
    version: 4,
  },
  {
    id: "est-despacho",
    nombre: "Despacho",
    tipo: "despacho",
    sucursalId: "norte",
    activa: true,
    slaObjetivoSeg: 300,
    pasoLista: "automatico",
    productoIds: [],
    actualizadoEn: hace(60 * 24 * 20),
    actualizadoPor: "Ana Morales",
    version: 1,
  },
]

const IMPRESORAS: Impresora[] = [
  {
    id: "imp-cocina",
    nombre: "Cocina principal",
    sucursalId: "centro",
    tipoConexion: "red",
    direccion: "192.168.1.50:9100",
    perfil: "ESC/POS TM-T20III",
    activa: true,
    ultimosTrabajos: [
      { id: "trab-1041", documento: "comanda", estado: "impreso", intentos: 1, ultimoError: null, creadoEn: hace(9), impresoEn: hace(9) },
      { id: "trab-1040", documento: "comanda", estado: "impreso", intentos: 1, ultimoError: null, creadoEn: hace(26), impresoEn: hace(26) },
    ],
    actualizadoEn: hace(9),
    actualizadoPor: "Sistema",
    version: 1,
  },
  {
    id: "imp-barra",
    nombre: "Barra",
    sucursalId: "centro",
    tipoConexion: "red",
    direccion: "192.168.1.51:9100",
    perfil: "ESC/POS TM-T20III",
    activa: true,
    ultimosTrabajos: [
      { id: "trab-1039", documento: "comanda", estado: "impreso", intentos: 1, ultimoError: null, creadoEn: hace(31), impresoEn: hace(31) },
    ],
    actualizadoEn: hace(31),
    actualizadoPor: "Sistema",
    version: 1,
  },
  {
    id: "imp-caja",
    nombre: "Caja",
    sucursalId: "centro",
    tipoConexion: "usb",
    direccion: "/dev/usb/lp0",
    perfil: "ESC/POS TM-T88VI",
    activa: true,
    ultimosTrabajos: [
      { id: "trab-1038", documento: "factura", estado: "impreso", intentos: 1, ultimoError: null, creadoEn: hace(48), impresoEn: hace(48) },
      { id: "trab-1037", documento: "recibo", estado: "impreso", intentos: 1, ultimoError: null, creadoEn: hace(52), impresoEn: hace(52) },
    ],
    actualizadoEn: hace(48),
    actualizadoPor: "Sistema",
    version: 1,
  },
  {
    id: "imp-despacho",
    nombre: "Despacho norte",
    sucursalId: "norte",
    tipoConexion: "bluetooth",
    direccion: "00:11:22:33:44:55",
    perfil: "ESC/POS TM-P20",
    activa: false,
    ultimosTrabajos: [
      {
        id: "trab-1035",
        documento: "comanda",
        estado: "fallido",
        intentos: 3,
        ultimoError: "Sin conexión con la impresora (bluetooth)",
        creadoEn: hace(120),
        impresoEn: null,
      },
    ],
    actualizadoEn: hace(120),
    actualizadoPor: "Sistema",
    version: 1,
  },
]

const RUTAS: Record<string, RutaImpresion[]> = {
  centro: [
    { documento: "comanda", impresoraId: "imp-cocina", copias: 1 },
    { documento: "precuenta", impresoraId: "imp-caja", copias: 1 },
    { documento: "recibo", impresoraId: "imp-caja", copias: 1 },
    { documento: "factura", impresoraId: "imp-caja", copias: 2 },
  ],
  norte: [
    { documento: "comanda", impresoraId: "imp-despacho", copias: 2 },
    { documento: "precuenta", impresoraId: "imp-caja", copias: 1 },
    { documento: "recibo", impresoraId: "imp-caja", copias: 1 },
    { documento: "factura", impresoraId: null, copias: 1 },
  ],
}

const SLA_PRODUCTO: Record<string, number> = {
  "prod-arrachera": 600,
}

let registrado = false

export function registrarMocksEstaciones(): void {
  if (registrado) return
  registrado = true
  registerMock("GET", /^\/admin\/estaciones$/, () => estacionesBase())
}

export function estacionesBase(): Estacion[] {
  return ESTACIONES
}

export function impresorasBase(): Impresora[] {
  return IMPRESORAS
}

export function rutasBase(sucursalId: string): RutaImpresion[] {
  if (!RUTAS[sucursalId]) {
    RUTAS[sucursalId] = [
      { documento: "comanda", impresoraId: null, copias: 1 },
      { documento: "precuenta", impresoraId: null, copias: 1 },
      { documento: "recibo", impresoraId: null, copias: 1 },
      { documento: "factura", impresoraId: null, copias: 1 },
    ]
  }
  return RUTAS[sucursalId]
}

export function guardarRutas(sucursalId: string, rutas: RutaImpresion[]): void {
  RUTAS[sucursalId] = rutas
}

export function slaBase(): SlaRegla[] {
  const reglas: SlaRegla[] = ESTACIONES.map((estacion) => ({
    id: `sla-est-${estacion.id}`,
    ambito: "estacion" as const,
    refId: estacion.id,
    refNombre: estacion.nombre,
    objetivoSeg: estacion.slaObjetivoSeg ?? 900,
  }))
  for (const [productoId, objetivo] of Object.entries(SLA_PRODUCTO)) {
    const producto = productosBase().find((item) => item.id === productoId)
    if (!producto) continue
    reglas.push({
      id: `sla-prod-${productoId}`,
      ambito: "producto",
      refId: productoId,
      refNombre: producto.nombre,
      objetivoSeg: objetivo,
    })
  }
  return reglas
}

export function actualizarSla(ambito: "estacion" | "producto", refId: string, objetivoSeg: number): SlaRegla {
  if (ambito === "estacion") {
    const estacion = ESTACIONES.find((item) => item.id === refId)
    if (!estacion) throw new Error("La estación no existe.")
    estacion.slaObjetivoSeg = objetivoSeg
    estacion.actualizadoEn = new Date().toISOString()
    estacion.version += 1
  } else {
    SLA_PRODUCTO[refId] = objetivoSeg
    const producto = productosBase().find((item) => item.id === refId)
    if (producto) {
      producto.tiempoObjetivoSeg = objetivoSeg
      producto.actualizadoEn = new Date().toISOString()
    }
  }
  return slaBase().find((regla) => regla.ambito === ambito && regla.refId === refId) as SlaRegla
}

export function asignarProductos(estacionId: string, productoIds: string[]): void {
  const estacion = ESTACIONES.find((item) => item.id === estacionId)
  if (!estacion) return
  const anteriores = estacion.productoIds
  const removidos = anteriores.filter((id) => !productoIds.includes(id))
  for (const id of removidos) setEstacionProducto(id, null)
  for (const otra of ESTACIONES) {
    if (otra.id === estacionId) continue
    otra.productoIds = otra.productoIds.filter((id) => !productoIds.includes(id))
  }
  estacion.productoIds = productoIds
  for (const id of productoIds) setEstacionProducto(id, estacionId)
  estacion.actualizadoEn = new Date().toISOString()
  estacion.version += 1
}

export function productosSinEstacion(): { id: string; nombre: string; sku: string }[] {
  return productosBase()
    .filter((producto) => producto.activo && !producto.estacionId)
    .map((producto) => ({ id: producto.id, nombre: producto.nombre, sku: producto.sku }))
}

export function probarImpresion(impresoraId: string, trabajoId?: string): { trabajo: TrabajoImpresion; impresora: Impresora } {
  const impresora = IMPRESORAS.find((item) => item.id === impresoraId)
  if (!impresora) throw new Error("La impresora no existe.")
  const existente = trabajoId ? impresora.ultimosTrabajos.find((trabajo) => trabajo.id === trabajoId) : undefined
  const trabajo: TrabajoImpresion = existente
    ? { ...existente, intentos: existente.intentos + 1 }
    : {
        id: `trab-${Date.now()}`,
        documento: "comanda",
        estado: "pendiente",
        intentos: 1,
        ultimoError: null,
        creadoEn: new Date().toISOString(),
        impresoEn: null,
      }
  if (impresora.activa) {
    trabajo.estado = "impreso"
    trabajo.impresoEn = new Date().toISOString()
    trabajo.ultimoError = null
  } else {
    trabajo.estado = "fallido"
    trabajo.ultimoError = "Sin conexión con la impresora. Revisa la dirección y vuelve a intentar."
  }
  impresora.ultimosTrabajos = [trabajo, ...impresora.ultimosTrabajos.filter((item) => item.id !== trabajo.id)].slice(0, 5)
  impresora.actualizadoEn = new Date().toISOString()
  impresora.actualizadoPor = "Prueba de impresión"
  return { trabajo, impresora }
}

export function documentoLabel(documento: DocumentoImpresion): string {
  return documento === "comanda" ? "Comanda" : documento === "precuenta" ? "Precuenta" : documento === "recibo" ? "Recibo" : "Factura"
}
