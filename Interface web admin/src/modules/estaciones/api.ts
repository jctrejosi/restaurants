/**
 * API del módulo Estaciones e impresoras (plan 07). Los mocks se retiran cuando
 * el backend NestJS exponga `/admin/estaciones`, `/admin/impresoras`,
 * `/admin/impresoras/rutas` y `/admin/sla`.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError, registerMock, type Query } from "@/lib/api"
import { registrarMockProductos } from "@/modules/catalogo/mock-productos"
import type { ProductoLista, ProductosRespuesta } from "@/modules/catalogo/types"
import {
  asignarProductos,
  actualizarSla,
  estacionesBase,
  guardarRutas,
  impresorasBase,
  probarImpresion,
  registrarMocksEstaciones,
  rutasBase,
  slaBase,
} from "@/modules/estaciones/mock-estaciones"
import {
  SLA_MAX_SEG,
  SLA_MIN_SEG,
  type Estacion,
  type EstacionPayload,
  type Impresora,
  type ImpresoraPayload,
  type ResultadoPrueba,
  type RutaImpresion,
  type RutasRespuesta,
  type SlaConfig,
  type SlaPayload,
  type SlaRegla,
} from "@/modules/estaciones/types"

registrarMocksEstaciones()
registrarMockProductos()

/* -------------------------------------------------------------------------- */
/* Estaciones                                                                  */
/* -------------------------------------------------------------------------- */

registerMock("POST", /^\/admin\/estaciones$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<EstacionPayload>
  const nombre = body.nombre?.trim()
  if (!nombre) throw new ApiError(422, "El nombre de la estación es obligatorio.", "estacion_invalida")
  if (!body.sucursalId) throw new ApiError(422, "La sucursal es obligatoria.", "estacion_invalida")
  if (
    estacionesBase().some(
      (estacion) =>
        estacion.sucursalId === body.sucursalId && estacion.nombre.toLowerCase() === nombre.toLowerCase(),
    )
  ) {
    throw new ApiError(422, "Ya existe una estación con ese nombre en la sede.", "estacion_duplicada")
  }
  const estacion: Estacion = {
    id: `est-${Date.now()}`,
    nombre,
    tipo: body.tipo ?? "preparacion",
    sucursalId: body.sucursalId,
    activa: body.activa ?? true,
    slaObjetivoSeg: body.slaObjetivoSeg ?? null,
    pasoLista: body.pasoLista ?? "automatico",
    productoIds: [],
    actualizadoEn: new Date().toISOString(),
    actualizadoPor: "María Gómez",
    version: 1,
  }
  estacionesBase().push(estacion)
  if (body.productoIds?.length) asignarProductos(estacion.id, body.productoIds)
  return estacion
})

registerMock("PATCH", /^\/admin\/estaciones\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const estacion = estacionesBase().find((item) => item.id === id)
  if (!estacion) throw new ApiError(404, "La estación no existe.", "estacion_no_encontrada")
  const body = (ctx.body ?? {}) as Partial<EstacionPayload>
  if (body.version !== undefined && body.version !== estacion.version) {
    throw new ApiError(409, "Otro usuario confirmó cambios antes que tú. Gana la versión del servidor.", "conflicto_version")
  }
  if (body.nombre !== undefined) {
    const nombre = body.nombre.trim()
    if (!nombre) throw new ApiError(422, "El nombre es obligatorio.", "estacion_invalida")
    const duplicada = estacionesBase().some(
      (item) =>
        item.id !== id && item.sucursalId === (body.sucursalId ?? estacion.sucursalId) && item.nombre.toLowerCase() === nombre.toLowerCase(),
    )
    if (duplicada) throw new ApiError(422, "Ya existe una estación con ese nombre en la sede.", "estacion_duplicada")
    estacion.nombre = nombre
  }
  if (body.tipo !== undefined) estacion.tipo = body.tipo
  if (body.sucursalId !== undefined) estacion.sucursalId = body.sucursalId
  if (body.activa !== undefined) estacion.activa = body.activa
  if (body.slaObjetivoSeg !== undefined) estacion.slaObjetivoSeg = body.slaObjetivoSeg
  if (body.pasoLista !== undefined) estacion.pasoLista = body.pasoLista
  if (body.productoIds !== undefined) asignarProductos(id, body.productoIds)
  estacion.actualizadoEn = new Date().toISOString()
  estacion.actualizadoPor = "María Gómez"
  estacion.version += 1
  return estacion
})

/* -------------------------------------------------------------------------- */
/* Impresoras                                                                  */
/* -------------------------------------------------------------------------- */

registerMock("GET", /^\/admin\/impresoras$/, (ctx) => {
  const sucursalId =
    typeof ctx.query.sucursalId === "string"
      ? ctx.query.sucursalId
      : typeof ctx.query.sucursal === "string"
        ? ctx.query.sucursal
        : undefined
  return impresorasBase().filter((impresora) => !sucursalId || impresora.sucursalId === sucursalId)
})

registerMock("POST", /^\/admin\/impresoras$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<ImpresoraPayload>
  const nombre = body.nombre?.trim()
  if (!nombre) throw new ApiError(422, "El nombre de la impresora es obligatorio.", "impresora_invalida")
  if (!body.direccion?.trim()) throw new ApiError(422, "La dirección es obligatoria.", "impresora_invalida")
  if (!body.sucursalId) throw new ApiError(422, "La sucursal es obligatoria.", "impresora_invalida")
  if (
    impresorasBase().some(
      (impresora) => impresora.sucursalId === body.sucursalId && impresora.nombre.toLowerCase() === nombre.toLowerCase(),
    )
  ) {
    throw new ApiError(422, "Ya existe una impresora con ese nombre en la sede.", "impresora_duplicada")
  }
  const impresora: Impresora = {
    id: `imp-${Date.now()}`,
    nombre,
    sucursalId: body.sucursalId,
    tipoConexion: body.tipoConexion ?? "red",
    direccion: body.direccion.trim(),
    perfil: body.perfil ?? "ESC/POS TM-T20III",
    activa: body.activa ?? true,
    ultimosTrabajos: [],
    actualizadoEn: new Date().toISOString(),
    actualizadoPor: "María Gómez",
    version: 1,
  }
  impresorasBase().push(impresora)
  return impresora
})

registerMock("PATCH", /^\/admin\/impresoras\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const impresora = impresorasBase().find((item) => item.id === id)
  if (!impresora) throw new ApiError(404, "La impresora no existe.", "impresora_no_encontrada")
  const body = (ctx.body ?? {}) as Partial<ImpresoraPayload>
  if (body.version !== undefined && body.version !== impresora.version) {
    throw new ApiError(409, "Otro usuario confirmó cambios antes que tú. Gana la versión del servidor.", "conflicto_version")
  }
  if (body.nombre !== undefined) {
    if (!body.nombre.trim()) throw new ApiError(422, "El nombre es obligatorio.", "impresora_invalida")
    impresora.nombre = body.nombre.trim()
  }
  if (body.tipoConexion !== undefined) impresora.tipoConexion = body.tipoConexion
  if (body.direccion !== undefined) impresora.direccion = body.direccion.trim()
  if (body.perfil !== undefined) impresora.perfil = body.perfil
  if (body.activa !== undefined) impresora.activa = body.activa
  if (body.sucursalId !== undefined) impresora.sucursalId = body.sucursalId
  impresora.actualizadoEn = new Date().toISOString()
  impresora.actualizadoPor = "María Gómez"
  impresora.version += 1
  return impresora
})

registerMock("GET", /^\/admin\/impresoras\/rutas$/, (ctx) => {
  const sucursalId =
    typeof ctx.query.sucursalId === "string"
      ? ctx.query.sucursalId
      : typeof ctx.query.sucursal === "string"
        ? ctx.query.sucursal
        : "centro"
  const respuesta: RutasRespuesta = { sucursalId, rutas: rutasBase(sucursalId) }
  return respuesta
})

registerMock("PUT", /^\/admin\/impresoras\/rutas$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<RutasRespuesta>
  if (!body.sucursalId) throw new ApiError(422, "La sede es obligatoria.", "sede_requerida")
  for (const ruta of body.rutas ?? []) {
    if (ruta.copias < 1 || ruta.copias > 5) {
      throw new ApiError(422, `Las copias de ${ruta.documento} deben estar entre 1 y 5.`, "copias_fuera_de_rango")
    }
    if (ruta.impresoraId && !impresorasBase().some((impresora) => impresora.id === ruta.impresoraId)) {
      throw new ApiError(422, "La impresora seleccionada no existe.", "impresora_no_encontrada")
    }
  }
  guardarRutas(body.sucursalId, body.rutas ?? [])
  return { sucursalId: body.sucursalId, rutas: body.rutas ?? [] }
})

/* -------------------------------------------------------------------------- */
/* SLA                                                                         */
/* -------------------------------------------------------------------------- */

registerMock("GET", /^\/admin\/sla$/, (): SlaConfig => ({ reglas: slaBase() }))

registerMock("PUT", /^\/admin\/sla$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<SlaPayload>
  if (!body.refId || !body.ambito) throw new ApiError(422, "Indica el destino del SLA.", "sla_invalido")
  const objetivo = Number(body.objetivoSeg)
  if (!Number.isFinite(objetivo) || objetivo < SLA_MIN_SEG || objetivo > SLA_MAX_SEG) {
    throw new ApiError(
      422,
      `El SLA debe estar entre ${SLA_MIN_SEG} y ${SLA_MAX_SEG} segundos.`,
      "sla_fuera_de_rango",
    )
  }
  const regla: SlaRegla = actualizarSla(body.ambito, body.refId, Math.round(objetivo))
  return regla
})

/* -------------------------------------------------------------------------- */
/* Prueba de impresión (V1)                                                    */
/* -------------------------------------------------------------------------- */

registerMock("POST", /^\/admin\/impresoras\/([^/]+)\/prueba$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const body = (ctx.body ?? {}) as { trabajoId?: string }
  const { trabajo, impresora } = probarImpresion(id, body.trabajoId)
  const respuesta: ResultadoPrueba & { impresora: Impresora } = {
    ok: trabajo.estado === "impreso",
    mensaje:
      trabajo.estado === "impreso"
        ? `Ticket de prueba impreso en ${impresora.nombre} (${impresora.perfil}).`
        : trabajo.ultimoError ?? "La impresora no respondió.",
    trabajo,
    impresora,
  }
  return respuesta
})

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function useEstaciones(sucursalId?: string) {
  return useQuery({
    queryKey: ["estaciones", "lista", sucursalId ?? "todas"],
    queryFn: () => api.get<Estacion[]>("/admin/estaciones", sucursalId ? { sucursalId } : undefined),
    placeholderData: keepPreviousData,
  })
}

export function useGuardarEstacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: EstacionPayload & { id?: string }) =>
      payload.id
        ? api.patch<Estacion>(`/admin/estaciones/${payload.id}`, payload)
        : api.post<Estacion>("/admin/estaciones", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["estaciones"] })
      void queryClient.invalidateQueries({ queryKey: ["catalogo"] })
    },
  })
}

export function useImpresoras(sucursalId?: string) {
  return useQuery({
    queryKey: ["estaciones", "impresoras", sucursalId ?? "todas"],
    queryFn: () => api.get<Impresora[]>("/admin/impresoras", sucursalId ? { sucursalId } : undefined),
    placeholderData: keepPreviousData,
  })
}

export function useGuardarImpresora() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ImpresoraPayload & { id?: string }) =>
      payload.id
        ? api.patch<Impresora>(`/admin/impresoras/${payload.id}`, payload)
        : api.post<Impresora>("/admin/impresoras", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["estaciones", "impresoras"] })
    },
  })
}

export function useRutas(sucursalId: string) {
  return useQuery({
    queryKey: ["estaciones", "rutas", sucursalId],
    queryFn: () => api.get<RutasRespuesta>("/admin/impresoras/rutas", { sucursalId }),
    enabled: Boolean(sucursalId),
  })
}

export function useGuardarRutas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RutasRespuesta) => api.put<RutasRespuesta>("/admin/impresoras/rutas", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["estaciones", "rutas"] })
    },
  })
}

export function useSla() {
  return useQuery({
    queryKey: ["estaciones", "sla"],
    queryFn: () => api.get<SlaConfig>("/admin/sla"),
  })
}

/** Productos asignables (dato maestro del catálogo, módulo 06). */
export function useProductosAsignables() {
  return useQuery({
    queryKey: ["estaciones", "productos"],
    queryFn: () => api.get<ProductosRespuesta>("/admin/catalogo/productos", { page: 1, pageSize: 300 }),
  })
}

export type { ProductoLista }

export function useGuardarSla() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SlaPayload) => api.put<SlaRegla>("/admin/sla", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["estaciones", "sla"] })
    },
  })
}

export function useProbarImpresion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { impresoraId: string; trabajoId?: string }) =>
      api.post<ResultadoPrueba & { impresora: Impresora }>(`/admin/impresoras/${payload.impresoraId}/prueba`, {
        trabajoId: payload.trabajoId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["estaciones", "impresoras"] })
    },
  })
}
