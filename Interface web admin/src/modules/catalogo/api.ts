/**
 * API del módulo Catálogo (plan 06). Los mocks se retiran cuando el backend
 * NestJS exponga `/admin/catalogo/*` y `/admin/exportaciones`.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError, registerMock, type Query } from "@/lib/api"
import {
  ALERGENOS,
  ESTACION_NOMBRE,
  IMPUESTOS,
  SUCURSALES_MOCK,
  aLista,
  agotadosActivos,
  aplicarCambioDisponibilidad,
  categoriasBase,
  filasDisponibilidad,
  filtrarProductos,
  historialPreciosBase,
  obtenerProducto,
  productosBase,
  registrarMockProductos,
} from "@/modules/catalogo/mock-productos"
import {
  ETIQUETA_LABEL,
  FRANJA_LABEL,
  type CambioDisponibilidadPayload,
  type Categoria,
  type DisponibilidadFiltros,
  type DisponibilidadRespuesta,
  type Exportacion,
  type HistorialPrecio,
  type ImportacionFila,
  type ImportacionResultado,
  type PrecioSede,
  type Producto,
  type ProductoPayload,
  type ProductosFiltros,
  type ProductosRespuesta,
} from "@/modules/catalogo/types"
import { registrarMocksEstaciones } from "@/modules/estaciones/mock-estaciones"

registrarMockProductos()
registrarMocksEstaciones()

/* -------------------------------------------------------------------------- */
/* Categorías                                                                  */
/* -------------------------------------------------------------------------- */

registerMock("GET", /^\/admin\/catalogo\/categorias$/, () =>
  [...categoriasBase()].sort((a, b) => a.orden - b.orden),
)

registerMock("POST", /^\/admin\/catalogo\/categorias$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<Categoria>
  const nombre = body.nombre?.trim()
  if (!nombre) throw new ApiError(422, "El nombre de la categoría es obligatorio.", "categoria_invalida")
  const categoria: Categoria = {
    id: `cat-${Date.now()}`,
    nombre,
    padreId: body.padreId ?? null,
    orden: categoriasBase().length + 1,
    activa: body.activa ?? true,
  }
  categoriasBase().push(categoria)
  return categoria
})

registerMock("PATCH", /^\/admin\/catalogo\/categorias\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const categoria = categoriasBase().find((item) => item.id === id)
  if (!categoria) throw new ApiError(404, "La categoría ya no existe.", "categoria_no_encontrada")
  const body = (ctx.body ?? {}) as Partial<Categoria>
  if (body.nombre !== undefined && !body.nombre.trim()) {
    throw new ApiError(422, "El nombre de la categoría es obligatorio.", "categoria_invalida")
  }
  Object.assign(categoria, body, { id: categoria.id })
  return categoria
})

/* -------------------------------------------------------------------------- */
/* Productos                                                                   */
/* -------------------------------------------------------------------------- */

registerMock("GET", /^\/admin\/catalogo\/productos\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const producto = obtenerProducto(id)
  if (!producto) throw new ApiError(404, "El producto no existe.", "producto_no_encontrado")
  return producto
})

function normalizarPrecios(producto: Producto, precios: PrecioSede[], motivo: string | undefined): PrecioSede[] {
  const ahora = new Date().toISOString()
  let huboCambio = false
  const resultado = precios.map((precio) => {
    const vigente = producto.precios.find((item) => item.sucursalId === precio.sucursalId)
    if (!vigente || vigente.centavos !== precio.centavos) {
      huboCambio = true
      return { ...precio, vigenteDesde: ahora }
    }
    return vigente
  })
  if (huboCambio) {
    const motivoLimpio = motivo?.trim() ?? ""
    if (motivoLimpio.length < 3) {
      throw new ApiError(422, "Cambiar precios exige un motivo (RN-R5-06).", "motivo_requerido")
    }
    for (const precio of resultado) {
      const vigente = producto.precios.find((item) => item.sucursalId === precio.sucursalId)
      if (vigente && vigente.centavos !== precio.centavos) {
        historialPreciosBase().unshift({
          id: `hp-${Date.now()}-${precio.sucursalId}`,
          productoId: producto.id,
          productoNombre: producto.nombre,
          sucursalId: precio.sucursalId,
          antesCentavos: vigente.centavos,
          despuesCentavos: precio.centavos,
          vigenteDesde: precio.vigenteDesde,
          motivo: motivo?.trim() ?? "",
          usuario: "María Gómez",
          creadoEn: ahora,
        })
      }
    }
  }
  return resultado
}

registerMock("POST", /^\/admin\/catalogo\/productos$/, (ctx) => {
  const body = (ctx.body ?? {}) as ProductoPayload
  const nombre = body.nombre?.trim()
  if (!nombre) throw new ApiError(422, "El nombre del producto es obligatorio.", "producto_invalido")
  if (!body.sku?.trim()) throw new ApiError(422, "El SKU es obligatorio.", "producto_invalido")
  if (productosBase().some((item) => item.sku.toLowerCase() === body.sku.trim().toLowerCase())) {
    throw new ApiError(422, "Ya existe un producto con ese SKU.", "sku_duplicado")
  }
  if (!body.categoriaId) throw new ApiError(422, "La categoría es obligatoria.", "producto_invalido")
  const categoria = categoriasBase().find((item) => item.id === body.categoriaId)
  const producto: Producto = {
    id: `prod-${Date.now()}`,
    nombre,
    descripcion: body.descripcion ?? "",
    categoriaId: body.categoriaId,
    categoriaNombre: categoria?.nombre ?? "Sin categoría",
    sku: body.sku.trim(),
    codigoBarras: body.codigoBarras ?? "",
    etiquetas: body.etiquetas ?? [],
    activo: body.activo ?? true,
    destacado: body.destacado ?? false,
    agotado: false,
    impuestoId: body.impuestoId ?? "iva-16",
    estacionId: body.estacionId ?? null,
    estacionNombre: body.estacionId ? (ESTACION_NOMBRE[body.estacionId] ?? body.estacionId) : null,
    tiempoObjetivoSeg: body.tiempoObjetivoSeg ?? null,
    precios: body.precios ?? [],
    alergenos: body.alergenos ?? [],
    grupos: body.grupos ?? [],
    fotos: body.fotos ?? [],
    actualizadoEn: new Date().toISOString(),
    actualizadoPor: "María Gómez",
    version: 1,
  }
  productosBase().push(producto)
  return producto
})

registerMock("PATCH", /^\/admin\/catalogo\/productos\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const producto = obtenerProducto(id)
  if (!producto) throw new ApiError(404, "El producto no existe.", "producto_no_encontrado")
  const body = (ctx.body ?? {}) as ProductoPayload
  if (body.version !== undefined && body.version !== producto.version) {
    throw new ApiError(
      409,
      "Otro usuario confirmó cambios antes que tú. Gana la versión del servidor.",
      "conflicto_version",
    )
  }
  if (body.sku !== undefined) {
    const sku = body.sku.trim()
    if (!sku) throw new ApiError(422, "El SKU es obligatorio.", "producto_invalido")
    if (productosBase().some((item) => item.id !== id && item.sku.toLowerCase() === sku.toLowerCase())) {
      throw new ApiError(422, "Ya existe un producto con ese SKU.", "sku_duplicado")
    }
    producto.sku = sku
  }
  if (body.nombre !== undefined) {
    if (!body.nombre.trim()) throw new ApiError(422, "El nombre es obligatorio.", "producto_invalido")
    producto.nombre = body.nombre.trim()
  }
  if (body.descripcion !== undefined) producto.descripcion = body.descripcion
  if (body.categoriaId !== undefined) {
    producto.categoriaId = body.categoriaId
    producto.categoriaNombre =
      categoriasBase().find((item) => item.id === body.categoriaId)?.nombre ?? "Sin categoría"
  }
  if (body.codigoBarras !== undefined) producto.codigoBarras = body.codigoBarras
  if (body.etiquetas !== undefined) producto.etiquetas = body.etiquetas
  if (body.activo !== undefined) producto.activo = body.activo
  if (body.destacado !== undefined) producto.destacado = body.destacado
  if (body.impuestoId !== undefined) producto.impuestoId = body.impuestoId
  if (body.tiempoObjetivoSeg !== undefined) {
    if (body.tiempoObjetivoSeg !== null && (body.tiempoObjetivoSeg < 30 || body.tiempoObjetivoSeg > 7200)) {
      throw new ApiError(422, "El tiempo objetivo debe estar entre 30 y 7 200 segundos.", "tiempo_invalido")
    }
    producto.tiempoObjetivoSeg = body.tiempoObjetivoSeg
  }
  if (body.alergenos !== undefined) producto.alergenos = body.alergenos
  if (body.grupos !== undefined) producto.grupos = body.grupos
  if (body.fotos !== undefined) producto.fotos = body.fotos
  if (body.estacionId !== undefined) {
    producto.estacionId = body.estacionId
    producto.estacionNombre = body.estacionId
      ? (ESTACION_NOMBRE[body.estacionId] ?? body.estacionId)
      : null
  }
  if (body.precios !== undefined) producto.precios = normalizarPrecios(producto, body.precios, body.motivo)
  producto.actualizadoEn = new Date().toISOString()
  producto.actualizadoPor = "María Gómez"
  producto.version += 1
  return producto
})

registerMock("POST", /^\/admin\/catalogo\/productos\/([^/]+)\/duplicar$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  const original = obtenerProducto(id)
  if (!original) throw new ApiError(404, "El producto no existe.", "producto_no_encontrado")
  const copia: Producto = {
    ...structuredClone(original),
    id: `prod-${Date.now()}`,
    nombre: `${original.nombre} (copia)`,
    sku: `${original.sku}-COPIA`,
    destacado: false,
    agotado: false,
    precios: original.precios.map((precio) => ({ ...precio, vigenteDesde: new Date().toISOString() })),
    actualizadoEn: new Date().toISOString(),
    actualizadoPor: "María Gómez",
    version: 1,
  }
  productosBase().push(copia)
  return copia
})

registerMock("GET", /^\/admin\/catalogo\/alergenos$/, () => ALERGENOS)

/* -------------------------------------------------------------------------- */
/* Disponibilidad                                                              */
/* -------------------------------------------------------------------------- */

registerMock("GET", /^\/admin\/catalogo\/disponibilidad$/, (ctx) => {
  const q = ctx.query
  const sucursalId = typeof q.sucursalId === "string" ? q.sucursalId : typeof q.sucursal === "string" ? q.sucursal : undefined
  const filtros: DisponibilidadFiltros = {
    q: typeof q.q === "string" ? q.q : undefined,
    soloAgotados: String(q.soloAgotados ?? "false") === "true",
  }
  const data = filasDisponibilidad(sucursalId, filtros)
  const respuesta: DisponibilidadRespuesta = {
    data,
    agotados: data.filter((fila) => fila.agotado).length,
    productos: new Set(data.map((fila) => fila.productoId)).size,
  }
  return respuesta
})

registerMock("POST", /^\/admin\/catalogo\/disponibilidad$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<CambioDisponibilidadPayload>
  if (!body.productoIds?.length) throw new ApiError(422, "Selecciona al menos un producto.", "seleccion_vacia")
  if (!body.sucursalId) throw new ApiError(422, "La sede es obligatoria.", "sede_requerida")
  if (!body.motivo || body.motivo.trim().length < 3) {
    throw new ApiError(422, "El motivo es obligatorio para agotar o reactivar.", "motivo_requerido")
  }
  const { actualizados } = aplicarCambioDisponibilidad({
    productoIds: body.productoIds,
    sucursalId: body.sucursalId,
    franja: body.franja ?? null,
    agotado: Boolean(body.agotado),
    origen: body.origen ?? "backoffice",
    origenDetalle: body.origenDetalle,
    motivo: body.motivo.trim(),
  })
  return {
    actualizados,
    propagacion: ["web", "apk", "kds"],
    vigenteDesde: new Date().toISOString(),
  }
})

/* -------------------------------------------------------------------------- */
/* Historial de precios                                                        */
/* -------------------------------------------------------------------------- */

registerMock("GET", /^\/admin\/catalogo\/precios\/historial$/, (ctx) => {
  const productoId = typeof ctx.query.productoId === "string" ? ctx.query.productoId : undefined
  const data = historialPreciosBase()
    .filter((registro) => !productoId || registro.productoId === productoId)
    .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())
  return { data, total: data.length }
})

/* -------------------------------------------------------------------------- */
/* Importación y exportación                                                   */
/* -------------------------------------------------------------------------- */

const IMPORTACIONES: ImportacionResultado[] = []
const EXPORTACIONES: Exportacion[] = []

registerMock("POST", /^\/admin\/catalogo\/importar$/, (ctx) => {
  const body = (ctx.body ?? {}) as { archivo?: string; filas?: ImportacionFila[] }
  const filas = body.filas ?? []
  if (filas.length === 0) throw new ApiError(422, "El archivo no tiene filas de datos.", "csv_vacio")
  const rechazadas = filas.filter((fila) => fila.estado === "rechazada")
  if (rechazadas.length > 0) {
    throw new ApiError(
      422,
      `El archivo se rechazó: ${rechazadas.length} fila(s) con errores. No se aplicó ningún cambio.`,
      "importacion_invalida",
    )
  }
  for (const fila of filas) {
    const existente = productosBase().find((producto) => producto.sku.toLowerCase() === fila.sku.toLowerCase())
    const categoria = categoriasBase().find(
      (item) => item.nombre.toLowerCase() === fila.categoria.toLowerCase(),
    )
    if (existente) {
      existente.nombre = fila.nombre
      if (categoria) {
        existente.categoriaId = categoria.id
        existente.categoriaNombre = categoria.nombre
      }
      if (fila.precioCentavos !== null) {
        existente.precios = existente.precios.map((precio) => ({
          ...precio,
          centavos: fila.precioCentavos as number,
          vigenteDesde: new Date().toISOString(),
        }))
      }
      existente.actualizadoEn = new Date().toISOString()
      existente.actualizadoPor = "Importación CSV"
      existente.version += 1
    } else if (categoria) {
      productosBase().push({
        id: `prod-${Date.now()}-${fila.fila}`,
        nombre: fila.nombre,
        descripcion: "",
        categoriaId: categoria.id,
        categoriaNombre: categoria.nombre,
        sku: fila.sku,
        codigoBarras: "",
        etiquetas: [],
        activo: true,
        destacado: false,
        agotado: false,
        impuestoId: "iva-16",
        estacionId: null,
        estacionNombre: null,
        tiempoObjetivoSeg: null,
        precios: SUCURSALES_MOCK.map((sucursal) => ({
          sucursalId: sucursal.id,
          centavos: fila.precioCentavos ?? 0,
          vigenteDesde: new Date().toISOString(),
        })),
        alergenos: [],
        grupos: [],
        fotos: [],
        actualizadoEn: new Date().toISOString(),
        actualizadoPor: "Importación CSV",
        version: 1,
      })
    }
  }
  const resultado: ImportacionResultado = {
    id: `imp-${IMPORTACIONES.length + 1}`,
    archivo: body.archivo ?? "catalogo.csv",
    creadoEn: new Date().toISOString(),
    totalFilas: filas.length,
    filasValidas: filas.length,
    filasRechazadas: 0,
    estado: "aplicada",
    filas,
    usuario: "María Gómez",
  }
  IMPORTACIONES.push(resultado)
  return resultado
})

registerMock("POST", /^\/admin\/exportaciones$/, (ctx) => {
  const body = (ctx.body ?? {}) as { tipo?: string; formato?: Exportacion["formato"] }
  const totalFilas = productosBase().length
  const exportacion: Exportacion = {
    id: `exp-${EXPORTACIONES.length + 1}`,
    tipo: body.tipo ?? "catalogo",
    formato: body.formato ?? "csv",
    estado: totalFilas > 500 ? "en_proceso" : "listo",
    creadoEn: new Date().toISOString(),
    registradoPor: "María Gómez",
    avisoSegundoPlano: totalFilas > 500,
  }
  EXPORTACIONES.push(exportacion)
  return exportacion
})

/* -------------------------------------------------------------------------- */
/* Utilidades CSV (vista previa con validación por fila)                       */
/* -------------------------------------------------------------------------- */

export type CampoCsv =
  | "sku"
  | "nombre"
  | "categoria"
  | "precio"
  | "impuesto"
  | "estacion"
  | "alergenos"
  | "etiquetas"
  | "activo"

export const CAMPOS_CSV: { id: CampoCsv; label: string; obligatorio: boolean }[] = [
  { id: "sku", label: "SKU", obligatorio: true },
  { id: "nombre", label: "Nombre", obligatorio: true },
  { id: "categoria", label: "Categoría", obligatorio: true },
  { id: "precio", label: "Precio (MXN)", obligatorio: true },
  { id: "impuesto", label: "Impuesto", obligatorio: false },
  { id: "estacion", label: "Estación", obligatorio: false },
  { id: "alergenos", label: "Alérgenos", obligatorio: false },
  { id: "etiquetas", label: "Etiquetas", obligatorio: false },
  { id: "activo", label: "Activo", obligatorio: false },
]

export function parsearCsv(texto: string): string[][] {
  const limpio = texto.replace(/\r\n?/g, "\n").trim()
  if (!limpio) return []
  const primeraLinea = limpio.split("\n")[0]
  const delimitador = (primeraLinea.match(/;/g)?.length ?? 0) > (primeraLinea.match(/,/g)?.length ?? 0) ? ";" : ","
  const filas: string[][] = []
  let campo = ""
  let fila: string[] = []
  let entreComillas = false
  for (let i = 0; i < limpio.length; i += 1) {
    const caracter = limpio[i]
    if (entreComillas) {
      if (caracter === '"' && limpio[i + 1] === '"') {
        campo += '"'
        i += 1
      } else if (caracter === '"') {
        entreComillas = false
      } else {
        campo += caracter
      }
    } else if (caracter === '"') {
      entreComillas = true
    } else if (caracter === delimitador) {
      fila.push(campo.trim())
      campo = ""
    } else if (caracter === "\n") {
      fila.push(campo.trim())
      filas.push(fila)
      fila = []
      campo = ""
    } else {
      campo += caracter
    }
  }
  fila.push(campo.trim())
  filas.push(fila)
  return filas.filter((item) => item.some((valor) => valor !== ""))
}

function mapearColumnas(cabecera: string[]): Record<CampoCsv, number | null> {
  const normalizar = (valor: string) =>
    valor
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
  const mapeo = {} as Record<CampoCsv, number | null>
  for (const campo of CAMPOS_CSV) {
    const indice = cabecera.findIndex((titulo) => {
      const limpio = normalizar(titulo)
      if (campo.id === "precio") return limpio === "precio" || limpio.startsWith("precio")
      if (campo.id === "categoria") return limpio === "categoria"
      return limpio === campo.id
    })
    mapeo[campo.id] = indice >= 0 ? indice : null
  }
  return mapeo
}

export function sugerirMapeo(cabecera: string[]): Record<CampoCsv, number | null> {
  return mapearColumnas(cabecera)
}

export function validarImportacion(
  texto: string,
  mapeo: Record<CampoCsv, number | null>,
): { filas: ImportacionFila[]; cabecera: string[] } {
  const filasCrudas = parsearCsv(texto)
  const cabecera = filasCrudas[0] ?? []
  const cuerpo = filasCrudas.slice(1)
  const skus = new Set<string>()
  const nombresCategoria = new Set(categoriasBase().map((categoria) => categoria.nombre.toLowerCase()))
  const nombresEstacion = new Set(Object.values(ESTACION_NOMBRE).map((nombre) => nombre.toLowerCase()))
  const nombresImpuesto = new Set(IMPUESTOS.map((impuesto) => impuesto.nombre.toLowerCase()))
  const nombresAlergeno = new Set(ALERGENOS.map((alergeno) => alergeno.nombre.toLowerCase()))
  const etiquetas = new Set(Object.values(ETIQUETA_LABEL).map((label) => label.toLowerCase()))

  const valor = (fila: string[], campo: CampoCsv): string => {
    const indice = mapeo[campo]
    return indice === null || indice === undefined ? "" : (fila[indice] ?? "").trim()
  }

  const filas: ImportacionFila[] = cuerpo.map((fila, indice) => {
    const errores: ImportacionFila["errores"] = []
    const advertencias: ImportacionFila["advertencias"] = []
    const sku = valor(fila, "sku")
    const nombre = valor(fila, "nombre")
    const categoria = valor(fila, "categoria")
    const precioTexto = valor(fila, "precio").replace(/\s|\$/g, "")
    const impuesto = valor(fila, "impuesto")
    const estacion = valor(fila, "estacion")
    const crudosAlergenos = valor(fila, "alergenos")
    const crudasEtiquetas = valor(fila, "etiquetas")
    const activoTexto = valor(fila, "activo").toLowerCase()

    if (!sku) errores.push({ columna: "sku", motivo: "El SKU es obligatorio." })
    else if (skus.has(sku.toLowerCase())) errores.push({ columna: "sku", motivo: "SKU duplicado en el archivo." })
    else skus.add(sku.toLowerCase())
    if (!nombre) errores.push({ columna: "nombre", motivo: "El nombre es obligatorio." })
    if (!categoria) errores.push({ columna: "categoria", motivo: "La categoría es obligatoria." })
    else if (!nombresCategoria.has(categoria.toLowerCase())) {
      errores.push({ columna: "categoria", motivo: `La categoría «${categoria}» no existe en la carta.` })
    }

    let precioCentavos: number | null = null
    if (!precioTexto) {
      errores.push({ columna: "precio", motivo: "El precio es obligatorio." })
    } else {
      const numero = Number(precioTexto.replace(",", "."))
      if (!Number.isFinite(numero) || numero < 0) {
        errores.push({ columna: "precio", motivo: `«${precioTexto}» no es un precio válido.` })
      } else {
        precioCentavos = Math.round(numero * 100)
      }
    }

    if (impuesto && !nombresImpuesto.has(impuesto.toLowerCase())) {
      errores.push({ columna: "impuesto", motivo: `El impuesto «${impuesto}» no existe.` })
    }
    if (estacion && !nombresEstacion.has(estacion.toLowerCase())) {
      errores.push({ columna: "estacion", motivo: `La estación «${estacion}» no existe.` })
    } else if (!estacion) {
      advertencias.push({ columna: "estacion", motivo: "Sin estación: el producto no generará comanda." })
    }
    for (const alergeno of crudosAlergenos.split(/[|;/,]/).map((item) => item.trim()).filter(Boolean)) {
      if (!nombresAlergeno.has(alergeno.toLowerCase())) {
        errores.push({ columna: "alergenos", motivo: `El alérgeno «${alergeno}» no está en el catálogo maestro.` })
      }
    }
    for (const etiqueta of crudasEtiquetas.split(/[|;/,]/).map((item) => item.trim()).filter(Boolean)) {
      if (!etiquetas.has(etiqueta.toLowerCase())) {
        errores.push({ columna: "etiquetas", motivo: `La etiqueta «${etiqueta}» no es válida.` })
      }
    }
    if (activoTexto && !["si", "sí", "1", "true", "no", "0", "false"].includes(activoTexto)) {
      errores.push({ columna: "activo", motivo: `«${activoTexto}» no es un valor sí/no válido.` })
    }

    return {
      fila: indice + 2,
      sku,
      nombre,
      categoria,
      precioCentavos,
      estado: errores.length > 0 ? "rechazada" : "valida",
      errores,
      advertencias,
    }
  })

  for (const campo of CAMPOS_CSV) {
    if (campo.obligatorio && mapeo[campo.id] === null) {
      // Columna obligatoria sin mapear: todas las filas quedan rechazadas.
      for (const fila of filas) {
        fila.errores.push({ columna: campo.id, motivo: `Falta mapear la columna obligatoria «${campo.label}».` })
        fila.estado = "rechazada"
      }
    }
  }

  return { filas, cabecera }
}

export function filasAImportacionCsv(filas: ImportacionFila[]): string {
  const cabecera = ["fila", "sku", "nombre", "categoria", "precio", "estado", "columna", "motivo"]
  const lineas = filas.flatMap((fila) => {
    if (fila.errores.length === 0) {
      return [[String(fila.fila), fila.sku, fila.nombre, fila.categoria, ((fila.precioCentavos ?? 0) / 100).toFixed(2), fila.estado, "", ""].join(",")]
    }
    return fila.errores.map((error) =>
      [String(fila.fila), fila.sku, fila.nombre, fila.categoria, "", "rechazada", error.columna, error.motivo]
        .map((valor) => `"${valor.replace(/"/g, '""')}"`)
        .join(","),
    )
  })
  return [cabecera.join(","), ...lineas].join("\n")
}

export function resumenFranja(franja: string | null): string {
  if (franja === null) return "Todo el día"
  return FRANJA_LABEL[franja as keyof typeof FRANJA_LABEL] ?? franja
}

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function useCategorias() {
  return useQuery({
    queryKey: ["catalogo", "categorias"],
    queryFn: () => api.get<Categoria[]>("/admin/catalogo/categorias"),
  })
}

export function useGuardarCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Categoria> & { id?: string }) =>
      payload.id
        ? api.patch<Categoria>(`/admin/catalogo/categorias/${payload.id}`, payload)
        : api.post<Categoria>("/admin/catalogo/categorias", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["catalogo", "categorias"] })
    },
  })
}

export function useProductos(filtros: ProductosFiltros) {
  return useQuery({
    queryKey: ["catalogo", "productos", filtros],
    queryFn: () => api.get<ProductosRespuesta>("/admin/catalogo/productos", filtros as unknown as Query),
    placeholderData: keepPreviousData,
  })
}

export function useProducto(id: string | null) {
  return useQuery({
    queryKey: ["catalogo", "producto", id],
    queryFn: () => api.get<Producto>(`/admin/catalogo/productos/${id}`),
    enabled: Boolean(id) && id !== "nuevo",
  })
}

export function useGuardarProducto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProductoPayload & { id?: string }) =>
      payload.id
        ? api.patch<Producto>(`/admin/catalogo/productos/${payload.id}`, payload)
        : api.post<Producto>("/admin/catalogo/productos", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["catalogo"] })
    },
  })
}

export function useDuplicarProducto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<Producto>(`/admin/catalogo/productos/${id}/duplicar`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["catalogo"] })
    },
  })
}

export function useDisponibilidad(filtros: DisponibilidadFiltros) {
  return useQuery({
    queryKey: ["catalogo", "disponibilidad", filtros],
    queryFn: () =>
      api.get<DisponibilidadRespuesta>("/admin/catalogo/disponibilidad", filtros as unknown as Query),
    placeholderData: keepPreviousData,
  })
}

export function useCambiarDisponibilidad() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CambioDisponibilidadPayload) =>
      api.post<{ actualizados: number; propagacion: string[]; vigenteDesde: string }>(
        "/admin/catalogo/disponibilidad",
        payload,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["catalogo"] })
    },
  })
}

export function useHistorialPrecios(productoId?: string) {
  return useQuery({
    queryKey: ["catalogo", "historial", productoId ?? "todos"],
    queryFn: () =>
      api.get<{ data: HistorialPrecio[]; total: number }>("/admin/catalogo/precios/historial", {
        productoId,
      }),
  })
}

/** Estaciones disponibles para asignar un producto (dato maestro del módulo 07). */
export function useEstacionesDisponibles() {
  return useQuery({
    queryKey: ["catalogo", "estaciones"],
    queryFn: () => api.get<{ id: string; nombre: string; sucursalId: string }[]>("/admin/estaciones"),
  })
}

export function useImportarCatalogo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { archivo: string; filas: ImportacionFila[] }) =>
      api.post<ImportacionResultado>("/admin/catalogo/importar", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["catalogo"] })
    },
  })
}

export function useExportarCatalogo() {
  return useMutation({
    mutationFn: (payload: { tipo: string; formato?: "csv" | "xlsx"; sucursalId?: string }) =>
      api.post<Exportacion>("/admin/exportaciones", payload),
  })
}

export { ALERGENOS, IMPUESTOS, agotadosActivos, aLista, filtrarProductos }
