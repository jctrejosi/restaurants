/**
 * Datos simulados del catálogo (plan 06). Los comparte el módulo Estaciones
 * (asignación de productos) para que ambos mocks sean coherentes.
 * Se retira cuando el backend NestJS exponga `/admin/catalogo/*`.
 */

import { registerMock } from "@/lib/api"
import type {
  AgotadoOrigen,
  CambioDisponibilidadPayload,
  Categoria,
  Disponibilidad,
  DisponibilidadFiltros,
  FranjaCelda,
  HistorialPrecio,
  Impuesto,
  Producto,
  ProductoLista,
  ProductosFiltros,
  ProductosRespuesta,
} from "@/modules/catalogo/types"
import { FRANJAS } from "@/modules/catalogo/types"

export const SUCURSALES_MOCK = [
  { id: "centro", nombre: "Punto C · Centro", zonaHoraria: "America/Mexico_City", moneda: "MXN" },
  { id: "norte", nombre: "Punto C · Norte", zonaHoraria: "America/Mexico_City", moneda: "MXN" },
]

export const IMPUESTOS: Impuesto[] = [
  { id: "iva-16", nombre: "IVA 16%", tasaBps: 1600, tipo: "adicionado" },
  { id: "iva-inc", nombre: "IVA 16% incluido", tasaBps: 1600, tipo: "incluido" },
  { id: "exento", nombre: "Exento", tasaBps: 0, tipo: "incluido" },
  { id: "ieps-8", nombre: "IEPS 8% bebidas", tasaBps: 800, tipo: "adicionado" },
]

export const ALERGENOS: { id: string; nombre: string }[] = [
  { id: "gluten", nombre: "Gluten" },
  { id: "lacteos", nombre: "Lácteos" },
  { id: "huevo", nombre: "Huevo" },
  { id: "pescado", nombre: "Pescado" },
  { id: "mariscos", nombre: "Mariscos" },
  { id: "soya", nombre: "Soya" },
  { id: "cacahuate", nombre: "Cacahuate" },
  { id: "nueces", nombre: "Nueces" },
  { id: "sesamo", nombre: "Sésamo" },
  { id: "mostaza", nombre: "Mostaza" },
  { id: "apio", nombre: "Apio" },
  { id: "sulfitos", nombre: "Sulfitos" },
]

const CATEGORIAS_MOCK: Categoria[] = [
  { id: "cat-entradas", nombre: "Entradas", padreId: null, orden: 1, activa: true },
  { id: "cat-fuertes", nombre: "Platos fuertes", padreId: null, orden: 2, activa: true },
  { id: "cat-parrilla", nombre: "Parrilla", padreId: "cat-fuertes", orden: 1, activa: true },
  { id: "cat-mexicana", nombre: "Cocina mexicana", padreId: "cat-fuertes", orden: 2, activa: true },
  { id: "cat-postres", nombre: "Postres", padreId: null, orden: 3, activa: true },
  { id: "cat-bebidas", nombre: "Bebidas", padreId: null, orden: 4, activa: true },
  { id: "cat-aguas", nombre: "Aguas y refrescos", padreId: "cat-bebidas", orden: 1, activa: true },
  { id: "cat-barra", nombre: "Barra", padreId: "cat-bebidas", orden: 2, activa: true },
]

export const ESTACION_NOMBRE: Record<string, string> = {
  "est-parrilla": "Parrilla",
  "est-cocina": "Cocina",
  "est-barra-fria": "Barra fría",
  "est-horno": "Horno",
  "est-postres": "Postres",
  "est-barra": "Barra",
}

function hace(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString()
}

type ProductoCfg = {
  id: string
  nombre: string
  categoriaId: string
  sku: string
  centavos: number
  centavosNorte?: number
  impuestoId?: string
  estacionId: string | null
  etiquetas?: Producto["etiquetas"]
  destacado?: boolean
  activo?: boolean
  alergenos?: string[]
  descripcion?: string
  tiempoObjetivoSeg?: number | null
}

const PRODUCTOS_CFG: ProductoCfg[] = [
  {
    id: "prod-arrachera",
    nombre: "Arrachera al carbón",
    categoriaId: "cat-parrilla",
    sku: "PL-001",
    centavos: 18500,
    centavosNorte: 19500,
    estacionId: "est-parrilla",
    etiquetas: ["recomendado"],
    destacado: true,
    alergenos: ["mostaza", "sulfitos"],
    descripcion: "250 g de arrachera con guarnición de la casa.",
    tiempoObjetivoSeg: 900,
  },
  {
    id: "prod-alitas",
    nombre: "Alitas BBQ",
    categoriaId: "cat-entradas",
    sku: "EN-002",
    centavos: 16500,
    estacionId: "est-parrilla",
    etiquetas: ["picante"],
    alergenos: ["apio", "mostaza"],
    tiempoObjetivoSeg: 840,
  },
  {
    id: "prod-tacos",
    nombre: "Tacos de canasta",
    categoriaId: "cat-mexicana",
    sku: "MX-010",
    centavos: 7500,
    estacionId: "est-cocina",
    tiempoObjetivoSeg: 480,
  },
  {
    id: "prod-enchiladas",
    nombre: "Enchiladas suizas",
    categoriaId: "cat-mexicana",
    sku: "MX-011",
    centavos: 15500,
    estacionId: "est-cocina",
    etiquetas: ["menu_del_dia"],
    alergenos: ["lacteos"],
    tiempoObjetivoSeg: 720,
  },
  {
    id: "prod-chilaquiles",
    nombre: "Chilaquiles verdes",
    categoriaId: "cat-mexicana",
    sku: "MX-012",
    centavos: 13500,
    estacionId: "est-cocina",
    etiquetas: ["menu_del_dia", "vegetariano"],
    alergenos: ["lacteos", "huevo"],
    tiempoObjetivoSeg: 600,
  },
  {
    id: "prod-guacamole",
    nombre: "Guacamole con totopos",
    categoriaId: "cat-entradas",
    sku: "EN-003",
    centavos: 9500,
    estacionId: "est-barra-fria",
    etiquetas: ["recomendado", "vegetariano"],
    alergenos: [],
    tiempoObjetivoSeg: 300,
  },
  {
    id: "prod-sopa",
    nombre: "Sopa de tortilla",
    categoriaId: "cat-entradas",
    sku: "EN-004",
    centavos: 11000,
    estacionId: "est-cocina",
    alergenos: ["lacteos"],
    tiempoObjetivoSeg: 480,
  },
  {
    id: "prod-pizza",
    nombre: "Pizza artesanal pepperoni",
    categoriaId: "cat-fuertes",
    sku: "PL-020",
    centavos: 21000,
    estacionId: "est-horno",
    etiquetas: ["nuevo"],
    alergenos: ["gluten", "lacteos"],
    tiempoObjetivoSeg: 960,
  },
  {
    id: "prod-pan",
    nombre: "Pan de la casa",
    categoriaId: "cat-postres",
    sku: "PO-001",
    centavos: 4500,
    estacionId: "est-postres",
    tiempoObjetivoSeg: 240,
  },
  {
    id: "prod-flan",
    nombre: "Flan napolitano",
    categoriaId: "cat-postres",
    sku: "PO-002",
    centavos: 8500,
    estacionId: "est-postres",
    alergenos: ["lacteos", "huevo"],
    tiempoObjetivoSeg: 180,
  },
  {
    id: "prod-brownie",
    nombre: "Brownie del día",
    categoriaId: "cat-postres",
    sku: "PO-003",
    centavos: 9000,
    estacionId: null,
    alergenos: ["gluten", "lacteos", "huevo"],
    descripcion: "Pendiente de asignar estación: hoy no genera comanda.",
  },
  {
    id: "prod-margarita",
    nombre: "Margarita clásica",
    categoriaId: "cat-barra",
    sku: "BE-100",
    centavos: 14000,
    impuestoId: "ieps-8",
    estacionId: "est-barra",
    etiquetas: ["recomendado"],
    alergenos: ["sulfitos"],
    tiempoObjetivoSeg: 300,
  },
  {
    id: "prod-limonada",
    nombre: "Limonada de la casa",
    categoriaId: "cat-aguas",
    sku: "BE-101",
    centavos: 4500,
    estacionId: "est-barra-fria",
    etiquetas: ["vegetariano", "vegano"],
    tiempoObjetivoSeg: 180,
  },
  {
    id: "prod-horchata",
    nombre: "Agua de horchata",
    categoriaId: "cat-aguas",
    sku: "BE-102",
    centavos: 3500,
    estacionId: "est-barra-fria",
    etiquetas: ["vegetariano"],
    tiempoObjetivoSeg: 120,
  },
  {
    id: "prod-cafe",
    nombre: "Café americano",
    categoriaId: "cat-aguas",
    sku: "BE-103",
    centavos: 4000,
    estacionId: "est-barra",
    tiempoObjetivoSeg: 180,
  },
  {
    id: "prod-combo",
    nombre: "Combo familiar",
    categoriaId: "cat-fuertes",
    sku: "CM-001",
    centavos: 45900,
    estacionId: null,
    descripcion: "Producto armado: requiere estación para generar comanda.",
  },
]

function categoriaNombre(categoriaId: string): string {
  return CATEGORIAS_MOCK.find((categoria) => categoria.id === categoriaId)?.nombre ?? "Sin categoría"
}

function precioInicial(centavos: number, vigenteHaceMin: number) {
  return [
    { sucursalId: "centro", centavos, vigenteDesde: hace(vigenteHaceMin) },
    { sucursalId: "norte", centavos, vigenteDesde: hace(vigenteHaceMin) },
  ]
}

const PRODUCTOS: Producto[] = PRODUCTOS_CFG.map((cfg, indice) => ({
  id: cfg.id,
  nombre: cfg.nombre,
  descripcion: cfg.descripcion ?? "",
  categoriaId: cfg.categoriaId,
  categoriaNombre: categoriaNombre(cfg.categoriaId),
  sku: cfg.sku,
  codigoBarras: `75012345${String(indice + 1).padStart(4, "0")}`,
  etiquetas: cfg.etiquetas ?? [],
  activo: cfg.activo ?? true,
  destacado: cfg.destacado ?? false,
  agotado: false,
  impuestoId: cfg.impuestoId ?? "iva-16",
  estacionId: cfg.estacionId,
  estacionNombre: cfg.estacionId ? (ESTACION_NOMBRE[cfg.estacionId] ?? cfg.estacionId) : null,
  tiempoObjetivoSeg: cfg.tiempoObjetivoSeg ?? null,
  precios: precioInicial(cfg.centavos, 60 * 24 * 12 + indice * 30).map((precio) =>
    precio.sucursalId === "norte" && cfg.centavosNorte ? { ...precio, centavos: cfg.centavosNorte } : precio,
  ),
  alergenos: cfg.alergenos ?? [],
  grupos: [],
  fotos: [],
  actualizadoEn: hace(90 + indice * 17),
  actualizadoPor: "María Gómez",
  version: 1 + (indice % 4),
}))

// Grupos de modificadores de ejemplo en dos productos.
PRODUCTOS[0].grupos = [
  {
    id: "grp-termino",
    nombre: "Término de la carne",
    minimo: 1,
    maximo: 1,
    obligatorio: true,
    modificadores: [
      { id: "mod-rojo", nombre: "Término rojo", sobreprecioCentavos: 0, activo: true },
      { id: "mod-medio", nombre: "Término medio", sobreprecioCentavos: 0, activo: true },
      { id: "mod-bien", nombre: "Bien cocido", sobreprecioCentavos: 0, activo: true },
    ],
  },
]
PRODUCTOS[7].grupos = [
  {
    id: "grp-orilla",
    nombre: "Orilla",
    minimo: 0,
    maximo: 1,
    obligatorio: false,
    modificadores: [
      { id: "mod-rellena", nombre: "Orilla rellena", sobreprecioCentavos: 4000, activo: true },
      { id: "mod-fina", nombre: "Orilla fina", sobreprecioCentavos: 0, activo: true },
    ],
  },
]

PRODUCTOS[0].fotos = [
  { id: "foto-arrachera-1", url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=640", textoAlt: "Arrachera a la parrilla con guarnición", orden: 1 },
]

const AGOTADOS: Disponibilidad[] = [
  {
    id: "disp-1",
    productoId: "prod-arrachera",
    productoNombre: "Arrachera al carbón",
    sku: "PL-001",
    sucursalId: "centro",
    franja: "comida",
    agotado: true,
    agotadoOrigen: "cocina",
    agotadoOrigenDetalle: "Cocina · parrilla",
    motivo: "Se terminó la proteína del turno",
    actualizadoEn: hace(12),
    actualizadoPor: "Luis Trejo",
    programadoPara: null,
  },
  {
    id: "disp-2",
    productoId: "prod-guacamole",
    productoNombre: "Guacamole con totopos",
    sku: "EN-003",
    sucursalId: "centro",
    franja: null,
    agotado: true,
    agotadoOrigen: "backoffice",
    agotadoOrigenDetalle: "Panel · gerente de sede",
    motivo: "Sin aguacate en inventario",
    actualizadoEn: hace(35),
    actualizadoPor: "María Gómez",
    programadoPara: null,
  },
  {
    id: "disp-3",
    productoId: "prod-flan",
    productoNombre: "Flan napolitano",
    sku: "PO-002",
    sucursalId: "norte",
    franja: "cena",
    agotado: true,
    agotadoOrigen: "salon",
    agotadoOrigenDetalle: "Salón · mesa 4",
    motivo: "Producto reservado para evento privado",
    actualizadoEn: hace(80),
    actualizadoPor: "Ana Morales",
    programadoPara: null,
  },
]

const HISTORIAL: HistorialPrecio[] = [
  {
    id: "hp-1",
    productoId: "prod-arrachera",
    productoNombre: "Arrachera al carbón",
    sucursalId: "norte",
    antesCentavos: 17500,
    despuesCentavos: 19500,
    vigenteDesde: hace(60 * 24 * 3),
    motivo: "Ajuste por costo de proveedor",
    usuario: "María Gómez",
    creadoEn: hace(60 * 24 * 3),
  },
  {
    id: "hp-2",
    productoId: "prod-pizza",
    productoNombre: "Pizza artesanal pepperoni",
    sucursalId: "centro",
    antesCentavos: 19500,
    despuesCentavos: 21000,
    vigenteDesde: hace(60 * 24 * 8),
    motivo: "Actualización de carta de temporada",
    usuario: "María Gómez",
    creadoEn: hace(60 * 24 * 8),
  },
  {
    id: "hp-3",
    productoId: "prod-margarita",
    productoNombre: "Margarita clásica",
    sucursalId: "centro",
    antesCentavos: 12500,
    despuesCentavos: 14000,
    vigenteDesde: hace(60 * 24 * 15),
    motivo: "Ajuste por IEPS",
    usuario: "Carlos Méndez",
    creadoEn: hace(60 * 24 * 15),
  },
]

/* -------------------------------------------------------------------------- */
/* Helpers consumidos por la API y por Estaciones                              */
/* -------------------------------------------------------------------------- */

export function categoriasBase(): Categoria[] {
  return CATEGORIAS_MOCK
}

export function productosBase(): Producto[] {
  return PRODUCTOS
}

export function historialPreciosBase(): HistorialPrecio[] {
  return HISTORIAL
}

export function obtenerProducto(id: string): Producto | undefined {
  return PRODUCTOS.find((producto) => producto.id === id)
}

export function setEstacionProducto(productoId: string, estacionId: string | null): void {
  const producto = obtenerProducto(productoId)
  if (!producto) return
  producto.estacionId = estacionId
  producto.estacionNombre = estacionId ? (ESTACION_NOMBRE[estacionId] ?? estacionId) : null
}

export function productosSinEstacion(): { id: string; nombre: string; sku: string }[] {
  return PRODUCTOS.filter((producto) => !producto.estacionId && producto.activo).map((producto) => ({
    id: producto.id,
    nombre: producto.nombre,
    sku: producto.sku,
  }))
}

export function precioDe(producto: Producto, sedeId?: string): number {
  const precio = sedeId
    ? producto.precios.find((item) => item.sucursalId === sedeId)
    : producto.precios[0]
  return precio?.centavos ?? 0
}

export function aLista(producto: Producto, sedeId?: string): ProductoLista {
  const agotado = AGOTADOS.some(
    (registro) =>
      registro.productoId === producto.id && registro.agotado && (!sedeId || registro.sucursalId === sedeId),
  )
  return {
    id: producto.id,
    nombre: producto.nombre,
    sku: producto.sku,
    categoriaId: producto.categoriaId,
    categoriaNombre: producto.categoriaNombre,
    precioCentavos: precioDe(producto, sedeId),
    activo: producto.activo,
    agotado,
    destacado: producto.destacado,
    etiquetas: producto.etiquetas,
    estacionId: producto.estacionId,
    estacionNombre: producto.estacionNombre,
    actualizadoEn: producto.actualizadoEn,
  }
}

export function filtrarProductos(filtros: ProductosFiltros): ProductosRespuesta {
  const page = Math.max(1, Number(filtros.page ?? 1))
  const pageSize = Math.max(1, Number(filtros.pageSize ?? 10))
  const busqueda = (filtros.q ?? "").trim().toLowerCase()

  let categoriaIds: Set<string> | null = null
  if (filtros.categoriaId) {
    categoriaIds = new Set([filtros.categoriaId])
    if (filtros.incluirSubcategorias !== false) {
      let creciendo = true
      while (creciendo) {
        creciendo = false
        for (const categoria of CATEGORIAS_MOCK) {
          if (categoria.padreId && categoriaIds.has(categoria.padreId) && !categoriaIds.has(categoria.id)) {
            categoriaIds.add(categoria.id)
            creciendo = true
          }
        }
      }
    }
  }

  let items = PRODUCTOS.map((producto) => aLista(producto, filtros.sedeId))
  if (categoriaIds) items = items.filter((producto) => categoriaIds?.has(producto.categoriaId))
  if (filtros.activo !== undefined) items = items.filter((producto) => producto.activo === filtros.activo)
  if (filtros.agotado !== undefined) items = items.filter((producto) => producto.agotado === filtros.agotado)
  if (filtros.destacado) items = items.filter((producto) => producto.destacado)
  if (filtros.sinEstacion) items = items.filter((producto) => !producto.estacionId)
  if (filtros.etiqueta) items = items.filter((producto) => producto.etiquetas.includes(filtros.etiqueta!))
  if (busqueda) {
    items = items.filter(
      (producto) =>
        producto.nombre.toLowerCase().includes(busqueda) || producto.sku.toLowerCase().includes(busqueda),
    )
  }

  const total = items.length
  const inicio = (page - 1) * pageSize
  return { data: items.slice(inicio, inicio + pageSize), total, page }
}

export function registrarMockProductos(): void {
  if (registrado) return
  registrado = true
  registerMock("GET", /^\/admin\/catalogo\/productos$/, (ctx) => {
    const q = ctx.query
    const filtros: ProductosFiltros = {
      categoriaId: typeof q.categoriaId === "string" ? q.categoriaId : undefined,
      incluirSubcategorias: q.incluirSubcategorias === undefined ? true : String(q.incluirSubcategorias) !== "false",
      sedeId: typeof q.sedeId === "string" ? q.sedeId : typeof q.sucursal === "string" ? q.sucursal : undefined,
      activo: q.activo === undefined ? undefined : String(q.activo) === "true",
      agotado: q.agotado === undefined ? undefined : String(q.agotado) === "true",
      destacado: q.destacado === undefined ? undefined : String(q.destacado) === "true",
      sinEstacion: q.sinEstacion === undefined ? undefined : String(q.sinEstacion) === "true",
      etiqueta: typeof q.etiqueta === "string" ? (q.etiqueta as ProductosFiltros["etiqueta"]) : undefined,
      q: typeof q.q === "string" ? q.q : undefined,
      page: Number(q.page ?? 1),
      pageSize: Number(q.pageSize ?? 10),
    }
    return filtrarProductos(filtros)
  })
}

let registrado = false

/* -------------------------------------------------------------------------- */
/* Disponibilidad                                                              */
/* -------------------------------------------------------------------------- */

export function filasDisponibilidad(sucursalId: string | undefined, filtros: DisponibilidadFiltros): Disponibilidad[] {
  const sucursales = sucursalId ? [sucursalId] : SUCURSALES_MOCK.map((sucursal) => sucursal.id)
  const busqueda = (filtros.q ?? "").trim().toLowerCase()
  const filas: Disponibilidad[] = []
  for (const producto of PRODUCTOS) {
    if (busqueda && !producto.nombre.toLowerCase().includes(busqueda) && !producto.sku.toLowerCase().includes(busqueda)) {
      continue
    }
    if (!producto.activo) continue
    for (const sede of sucursales) {
      for (const franja of FRANJAS) {
        const clave: FranjaCelda = franja.id === "todo_el_dia" ? null : franja.id
        const registro = AGOTADOS.find(
          (item) => item.productoId === producto.id && item.sucursalId === sede && item.franja === clave,
        )
        if (filtros.soloAgotados && !registro?.agotado) continue
        filas.push(
          registro ?? {
            id: `disp-${producto.id}-${sede}-${clave ?? "todo"}`,
            productoId: producto.id,
            productoNombre: producto.nombre,
            sku: producto.sku,
            sucursalId: sede,
            franja: clave,
            agotado: false,
            agotadoOrigen: null,
            agotadoOrigenDetalle: null,
            motivo: null,
            actualizadoEn: null,
            actualizadoPor: null,
            programadoPara: null,
          },
        )
      }
    }
  }
  return filas
}

export function aplicarCambioDisponibilidad(payload: CambioDisponibilidadPayload): { actualizados: number } {
  const clave: FranjaCelda = payload.franja === "todo_el_dia" ? null : payload.franja
  let actualizados = 0
  for (const productoId of payload.productoIds) {
    const indice = AGOTADOS.findIndex(
      (item) =>
        item.productoId === productoId && item.sucursalId === payload.sucursalId && item.franja === clave,
    )
    if (payload.agotado) {
      const registro: Disponibilidad = {
        id: indice >= 0 ? AGOTADOS[indice].id : `disp-${productoId}-${payload.sucursalId}-${clave ?? "todo"}`,
        productoId,
        productoNombre:
          AGOTADOS[indice]?.productoNombre ?? obtenerProducto(productoId)?.nombre ?? productoId,
        sku: AGOTADOS[indice]?.sku ?? obtenerProducto(productoId)?.sku ?? "",
        sucursalId: payload.sucursalId,
        franja: clave,
        agotado: true,
        agotadoOrigen: payload.origen,
        agotadoOrigenDetalle:
          payload.origenDetalle ??
          (payload.origen === "backoffice" ? "Panel · gerente de sede" : payload.origen === "salon" ? "Salón" : "Cocina"),
        motivo: payload.motivo,
        actualizadoEn: new Date().toISOString(),
        actualizadoPor: "María Gómez",
        programadoPara: null,
      }
      if (indice >= 0) AGOTADOS[indice] = registro
      else AGOTADOS.push(registro)
    } else if (indice >= 0) {
      AGOTADOS.splice(indice, 1)
    }
    actualizados += 1
  }
  return { actualizados }
}

export function agotadosActivos(): Disponibilidad[] {
  return AGOTADOS.filter((registro) => registro.agotado)
}

export function origenLabel(origen: AgotadoOrigen | null): string {
  if (origen === "cocina") return "Cocina"
  if (origen === "salon") return "Salón"
  if (origen === "backoffice") return "Panel"
  return "—"
}
