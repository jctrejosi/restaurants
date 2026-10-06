/**
 * Tipos del módulo Catálogo (plan 06): categorías jerárquicas, productos con
 * precios append-only por sede, disponibilidad por franja e importación CSV.
 */

export type Categoria = {
  id: string
  nombre: string
  padreId: string | null
  orden: number
  activa: boolean
}

export type Impuesto = {
  id: string
  nombre: string
  tasaBps: number
  tipo: "incluido" | "adicionado" | "inc"
}

export type PrecioSede = {
  sucursalId: string
  centavos: number
  /** Vigencia del precio (append-only: una fila nueva no reescribe la anterior). */
  vigenteDesde: string
}

export type Modificador = {
  id: string
  nombre: string
  sobreprecioCentavos: number
  activo: boolean
}

export type GrupoModificador = {
  id: string
  nombre: string
  minimo: number
  maximo: number
  obligatorio: boolean
  modificadores: Modificador[]
}

export type FotoProducto = {
  id: string
  url: string
  textoAlt: string
  orden: number
}

export type EtiquetaProducto =
  | "recomendado"
  | "menu_del_dia"
  | "nuevo"
  | "vegetariano"
  | "vegano"
  | "picante"

export const ETIQUETA_LABEL: Record<EtiquetaProducto, string> = {
  recomendado: "Recomendado",
  menu_del_dia: "Menú del día",
  nuevo: "Nuevo",
  vegetariano: "Vegetariano",
  vegano: "Vegano",
  picante: "Picante",
}

export type Producto = {
  id: string
  nombre: string
  descripcion: string
  categoriaId: string
  categoriaNombre: string
  sku: string
  codigoBarras: string
  etiquetas: EtiquetaProducto[]
  activo: boolean
  destacado: boolean
  agotado: boolean
  impuestoId: string
  estacionId: string | null
  /** Sin estación el producto no genera comanda (RF-R5-30). */
  estacionNombre: string | null
  /** Objetivo de preparación en segundos; lo consume el KDS (módulo 07). */
  tiempoObjetivoSeg: number | null
  precios: PrecioSede[]
  alergenos: string[]
  grupos: GrupoModificador[]
  fotos: FotoProducto[]
  actualizadoEn: string
  actualizadoPor: string
  version: number
}

export type ProductoLista = {
  id: string
  nombre: string
  sku: string
  categoriaId: string
  categoriaNombre: string
  precioCentavos: number
  activo: boolean
  agotado: boolean
  destacado: boolean
  etiquetas: EtiquetaProducto[]
  estacionId: string | null
  estacionNombre: string | null
  actualizadoEn: string
}

export type ProductosFiltros = {
  categoriaId?: string
  /** Incluye el subárbol de la categoría seleccionada. */
  incluirSubcategorias?: boolean
  sedeId?: string
  activo?: boolean
  agotado?: boolean
  destacado?: boolean
  sinEstacion?: boolean
  etiqueta?: EtiquetaProducto
  q?: string
  page?: number
  pageSize?: number
}

export type ProductosRespuesta = {
  data: ProductoLista[]
  total: number
  page: number
}

export type DisponibilidadFranja = "desayuno" | "comida" | "cena" | "todo_el_dia"

export const FRANJAS: { id: DisponibilidadFranja; label: string }[] = [
  { id: "desayuno", label: "Desayuno" },
  { id: "comida", label: "Comida" },
  { id: "cena", label: "Cena" },
  { id: "todo_el_dia", label: "Todo el día" },
]

export const FRANJA_LABEL: Record<DisponibilidadFranja, string> = {
  desayuno: "Desayuno",
  comida: "Comida",
  cena: "Cena",
  todo_el_dia: "Todo el día",
}

/** `null` en la celda representa la franja «todo el día». */
export type FranjaCelda = DisponibilidadFranja | null

export type AgotadoOrigen = "cocina" | "salon" | "backoffice"

export const ORIGEN_LABEL: Record<AgotadoOrigen, string> = {
  cocina: "Cocina",
  salon: "Salón",
  backoffice: "Panel",
}

export type Disponibilidad = {
  id: string
  productoId: string
  productoNombre: string
  sku: string
  sucursalId: string
  franja: FranjaCelda
  agotado: boolean
  agotadoOrigen: AgotadoOrigen | null
  /** Texto visible del origen, p. ej. «Cocina · parrilla». */
  agotadoOrigenDetalle: string | null
  motivo: string | null
  actualizadoEn: string | null
  actualizadoPor: string | null
  programadoPara: string | null
}

export type DisponibilidadFiltros = {
  sucursalId?: string
  q?: string
  soloAgotados?: boolean
}

export type DisponibilidadRespuesta = {
  data: Disponibilidad[]
  agotados: number
  productos: number
}

export type CambioDisponibilidadPayload = {
  productoIds: string[]
  sucursalId: string
  franja: FranjaCelda
  agotado: boolean
  origen: AgotadoOrigen
  origenDetalle?: string
  motivo: string
}

export type HistorialPrecio = {
  id: string
  productoId: string
  productoNombre: string
  sucursalId: string
  antesCentavos: number | null
  despuesCentavos: number
  vigenteDesde: string
  motivo: string
  usuario: string
  creadoEn: string
}

export type ImportacionError = { columna: string; motivo: string }

export type ImportacionFila = {
  fila: number
  sku: string
  nombre: string
  categoria: string
  precioCentavos: number | null
  estado: "valida" | "rechazada"
  errores: ImportacionError[]
  advertencias: ImportacionError[]
}

export type ImportacionResultado = {
  id: string
  archivo: string
  creadoEn: string
  totalFilas: number
  filasValidas: number
  filasRechazadas: number
  estado: "rechazada" | "aplicada"
  filas: ImportacionFila[]
  usuario: string
}

export type Exportacion = {
  id: string
  tipo: string
  formato: "csv" | "xlsx"
  estado: "en_proceso" | "listo" | "error"
  creadoEn: string
  registradoPor: string
  avisoSegundoPlano: boolean
}

/** Carga útil de alta/edición de producto; `motivo` es obligatorio si cambian precios. */
export type ProductoPayload = {
  nombre: string
  descripcion: string
  categoriaId: string
  sku: string
  codigoBarras: string
  etiquetas: EtiquetaProducto[]
  activo: boolean
  destacado: boolean
  impuestoId: string
  estacionId: string | null
  tiempoObjetivoSeg: number | null
  alergenos: string[]
  grupos: GrupoModificador[]
  fotos: FotoProducto[]
  precios: PrecioSede[]
  motivo?: string
  version?: number
}
