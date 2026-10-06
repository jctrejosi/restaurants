import { useMutation, useQuery } from "@tanstack/react-query"
import { api, ApiError, registerMock, type Query } from "@/lib/api"
import {
  ACCIONES_CATALOGO,
  labelDe,
  severidadDe,
  type AuditoriaFiltros,
  type AuditoriaResp,
  type EntidadAuditoria,
  type EntidadTimelineResp,
  type EventoAuditoria,
  type ExportacionAuditoriaResp,
  type RetencionResp,
} from "@/modules/auditoria/types"

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

function q(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

function isoHaceHoras(horas: number): string {
  return new Date(Date.now() - horas * 3_600_000).toISOString()
}

export const SEDES_AUDITORIA = [
  { id: "centro", nombre: "Punto C · Centro" },
  { id: "norte", nombre: "Punto C · Norte" },
]

export const ACTORES_AUDITORIA = [
  { id: "u-01", nombre: "María Gómez", rol: "Gerente de sede" },
  { id: "u-02", nombre: "Luis Paredes", rol: "Mesero" },
  { id: "u-03", nombre: "Paola Ríos", rol: "Cajera" },
  { id: "u-04", nombre: "Jorge Solís", rol: "Supervisor" },
  { id: "u-05", nombre: "Karla Méndez", rol: "Mesera" },
  { id: "sistema", nombre: "Sistema", rol: "Sistema" },
]

export const ENTIDADES_AUDITORIA = [
  "pedido",
  "reserva",
  "comanda",
  "pago",
  "turno",
  "producto",
  "mesa",
  "usuario",
  "configuracion",
] as const

export const SEVERIDADES_AUDITORIA = ["info", "baja", "media", "alta", "critica"] as const

/* -------------------------------------------------------------------------- */
/* Semillas de eventos                                                         */
/* -------------------------------------------------------------------------- */

type Semilla = {
  accion: string
  entidad: EntidadAuditoria
  entidadId: string
  entidadLabel: string
  motivo: string | null
  antes: Record<string, unknown> | null
  despues: Record<string, unknown> | null
  actor: number
  canal: string
  dispositivo: string | null
  horas: number
  sede: number
}

const SEMILLAS: Semilla[] = [
  // Pedido cancelado tras preparación, con descuento previo (timeline rica)
  { accion: "pedido.creado", entidad: "pedido", entidadId: "ped-3100", entidadLabel: "Pedido #4821", motivo: null, antes: null, despues: { estado: "recibido", total_centavos: 58_400, mesa: "M-12" }, actor: 1, canal: "App mesero", dispositivo: "dis-centro-04", horas: 51, sede: 0 },
  { accion: "pedido.descuento_aplicado", entidad: "pedido", entidadId: "ped-3100", entidadLabel: "Pedido #4821", motivo: "Cortesía autorizada por demora en cocina", antes: { descuento_centavos: 0 }, despues: { descuento_centavos: 9_700 }, actor: 0, canal: "Panel admin", dispositivo: "dis-centro-01", horas: 50, sede: 0 },
  { accion: "pedido.cancelado", entidad: "pedido", entidadId: "ped-3100", entidadLabel: "Pedido #4821", motivo: "Cliente se retiró antes de recibir el pedido", antes: { estado: "en_preparacion", total_centavos: 58_400 }, despues: { estado: "cancelado", anulado_centavos: 48_700 }, actor: 3, canal: "App mesero", dispositivo: "dis-centro-04", horas: 49, sede: 0 },

  // Reserva cancelada
  { accion: "reserva.creada", entidad: "reserva", entidadId: "res-3200", entidadLabel: "Reserva #318 · 6 pax", motivo: null, antes: null, despues: { fecha_hora: "19:30", personas: 6, mesa: "M-04" }, actor: 5, canal: "Web", dispositivo: null, horas: 96, sede: 0 },
  { accion: "reserva.cancelada", entidad: "reserva", entidadId: "res-3200", entidadLabel: "Reserva #318 · 6 pax", motivo: "Cambio de planes del cliente", antes: { estado: "confirmada" }, despues: { estado: "cancelada", personas_liberadas: 6 }, actor: 0, canal: "Panel admin", dispositivo: "dis-centro-01", horas: 74, sede: 0 },
  { accion: "reserva.no_show", entidad: "reserva", entidadId: "res-3201", entidadLabel: "Reserva #327 · 2 pax", motivo: "No se presentó en 20 min de tolerancia", antes: { estado: "confirmada" }, despues: { estado: "no_show", espera_min: 22 }, actor: 5, canal: "Tablet recepción", dispositivo: "dis-centro-08", horas: 22, sede: 0 },

  // Comanda anulada y reasignada
  { accion: "comanda.reasignada", entidad: "comanda", entidadId: "com-3300", entidadLabel: "Comanda #812", motivo: "Parrilla saturada; se mueve a plancha", antes: { estacion: "Parrilla" }, despues: { estacion: "Plancha" }, actor: 3, canal: "KDS", dispositivo: "dis-centro-03", horas: 44, sede: 0 },
  { accion: "comanda.anulada", entidad: "comanda", entidadId: "com-3300", entidadLabel: "Comanda #812", motivo: "Ingrediente agotado comunicado por cocina", antes: { estado: "en_preparacion", lineas: 3 }, despues: { estado: "anulada", lineas_anuladas: 3 }, actor: 3, canal: "KDS", dispositivo: "dis-centro-03", horas: 43, sede: 0 },

  // Pago reembolsado
  { accion: "pago.registrado", entidad: "pago", entidadId: "pag-3400", entidadLabel: "Pago #7712", motivo: null, antes: null, despues: { medio: "tarjeta", total_centavos: 67_900 }, actor: 4, canal: "TPV", dispositivo: "dis-centro-07", horas: 70, sede: 1 },
  { accion: "pago.reembolsado", entidad: "pago", entidadId: "pag-3400", entidadLabel: "Pago #7712", motivo: "Producto no disponible después del cobro", antes: { estado: "aprobado", total_centavos: 67_900 }, despues: { estado: "reembolsado", devuelto_centavos: 67_900 }, actor: 0, canal: "Panel admin", dispositivo: "dis-norte-01", horas: 68, sede: 1 },

  // Caja: apertura, cierre y reapertura auditada
  { accion: "caja.abierta", entidad: "turno", entidadId: "turno-3500", entidadLabel: "Turno matutino · Caja 1", motivo: null, antes: null, despues: { fondo_centavos: 150_000, cajero: "Paola Ríos" }, actor: 4, canal: "TPV", dispositivo: "dis-centro-07", horas: 120, sede: 0 },
  { accion: "caja.cerrada", entidad: "turno", entidadId: "turno-3500", entidadLabel: "Turno matutino · Caja 1", motivo: "Cierre de turno sin novedades", antes: { estado: "abierto" }, despues: { estado: "cerrado", total_centavos: 1_523_000, diferencia_centavos: 0 }, actor: 4, canal: "TPV", dispositivo: "dis-centro-07", horas: 98, sede: 0 },
  { accion: "caja.reabierta", entidad: "turno", entidadId: "turno-3500", entidadLabel: "Turno matutino · Caja 1", motivo: "Faltante de $120 detectado en arqueo posterior", antes: { estado: "cerrado", total_centavos: 1_523_000 }, despues: { estado: "abierto", diferencia_centavos: -12_000 }, actor: 0, canal: "Panel admin", dispositivo: "dis-centro-01", horas: 95, sede: 0 },

  // Precio y agotado
  { accion: "precio.ajustado", entidad: "producto", entidadId: "pro-3600", entidadLabel: "Tacos de arrachera", motivo: "Actualización de carta autorizada por dirección", antes: { precio_centavos: 18_500 }, despues: { precio_centavos: 21_000 }, actor: 0, canal: "Panel admin", dispositivo: "dis-centro-01", horas: 130, sede: 0 },
  { accion: "producto.agotado", entidad: "producto", entidadId: "pro-3600", entidadLabel: "Tacos de arrachera", motivo: "Sin existencia de arrachera en inventario", antes: { disponible: true }, despues: { disponible: false }, actor: 3, canal: "KDS", dispositivo: "dis-centro-03", horas: 20, sede: 0 },

  // Usuarios y permisos
  { accion: "usuario.login", entidad: "usuario", entidadId: "us-3700", entidadLabel: "Karla Méndez", motivo: null, antes: null, despues: { rol: "Mesera", metodo: "2FA" }, actor: 5, canal: "App mesero", dispositivo: "dis-centro-04", horas: 28, sede: 0 },
  { accion: "usuario.login_fallido", entidad: "usuario", entidadId: "us-3700", entidadLabel: "Karla Méndez", motivo: "Credenciales inválidas (3er intento)", antes: null, despues: { intentos: 3, bloqueo_temporal: false }, actor: 5, canal: "App mesero", dispositivo: "dis-centro-04", horas: 29, sede: 0 },
  { accion: "permiso.cambiado", entidad: "usuario", entidadId: "us-3701", entidadLabel: "Luis Paredes", motivo: "Promoción temporal a supervisor de piso", antes: { rol: "Mesero", permisos: ["pedidos.ver", "comandas.ver"] }, despues: { rol: "Supervisor", permisos: ["pedidos.ver", "comandas.ver", "pedidos.anular", "caja.reabrir"] }, actor: 0, canal: "Panel admin", dispositivo: "dis-centro-01", horas: 150, sede: 0 },

  // Configuración y exportaciones
  { accion: "configuracion.modificada", entidad: "configuracion", entidadId: "cfg-horarios", entidadLabel: "Horario de servicio", motivo: "Se amplía cierre de viernes a 01:00 por temporada", antes: { cierre_viernes: "23:30" }, despues: { cierre_viernes: "01:00" }, actor: 0, canal: "Panel admin", dispositivo: "dis-centro-01", horas: 200, sede: 0 },
  { accion: "exportacion.creada", entidad: "configuracion", entidadId: "cfg-export", entidadLabel: "Exportación de auditoría", motivo: "Solicitud de contabilidad", antes: null, despues: { tipo: "auditoria", formato: "xlsx", filas: 41_230 }, actor: 0, canal: "Panel admin", dispositivo: "dis-centro-01", horas: 12, sede: 0 },

  // Volumen adicional repartido en la semana
  { accion: "pedido.estado_cambiado", entidad: "pedido", entidadId: "ped-3900", entidadLabel: "Pedido #4830", motivo: null, antes: { estado: "listo" }, despues: { estado: "entregado" }, actor: 1, canal: "App mesero", dispositivo: "dis-norte-04", horas: 6, sede: 1 },
  { accion: "pedido.estado_cambiado", entidad: "pedido", entidadId: "ped-3901", entidadLabel: "Pedido #4831", motivo: null, antes: { estado: "en_preparacion" }, despues: { estado: "listo" }, actor: 2, canal: "KDS", dispositivo: "dis-norte-03", horas: 8, sede: 1 },
  { accion: "comanda.reimpresa", entidad: "comanda", entidadId: "com-3902", entidadLabel: "Comanda #824", motivo: "Papel atascado en impresora de barra", antes: { intentos: 1 }, despues: { intentos: 2 }, actor: 2, canal: "KDS", dispositivo: "dis-centro-03", horas: 10, sede: 0 },
  { accion: "usuario.login", entidad: "usuario", entidadId: "us-3903", entidadLabel: "Paola Ríos", motivo: null, antes: null, despues: { rol: "Cajera", metodo: "2FA" }, actor: 4, canal: "TPV", dispositivo: "dis-centro-07", horas: 14, sede: 0 },
  { accion: "reserva.creada", entidad: "reserva", entidadId: "res-3904", entidadLabel: "Reserva #341 · 4 pax", motivo: null, antes: null, despues: { fecha_hora: "21:00", personas: 4, mesa: "M-09" }, actor: 5, canal: "Web", dispositivo: null, horas: 16, sede: 0 },
  { accion: "comanda.reasignada", entidad: "comanda", entidadId: "com-3905", entidadLabel: "Comanda #828", motivo: "Barra fría al límite; se apoya con parrilla", antes: { estacion: "Barra fría" }, despues: { estacion: "Parrilla" }, actor: 3, canal: "Panel admin", dispositivo: "dis-centro-01", horas: 30, sede: 0 },
  { accion: "pedido.descuento_aplicado", entidad: "pedido", entidadId: "ped-3906", entidadLabel: "Pedido #4836", motivo: "Promoción 2×1 martes de tacos", antes: { descuento_centavos: 0 }, despues: { descuento_centavos: 12_500 }, actor: 1, canal: "App mesero", dispositivo: "dis-centro-04", horas: 34, sede: 0 },
  { accion: "producto.agotado", entidad: "producto", entidadId: "pro-3907", entidadLabel: "Cheesecake de guayaba", motivo: "Fin de lote sin reposición", antes: { disponible: true }, despues: { disponible: false }, actor: 2, canal: "KDS", dispositivo: "dis-norte-03", horas: 38, sede: 1 },
  { accion: "caja.cerrada", entidad: "turno", entidadId: "turno-3908", entidadLabel: "Turno vespertino · Caja 2", motivo: "Cierre con sobrante de $35", antes: { estado: "abierto" }, despues: { estado: "cerrado", total_centavos: 2_104_500, diferencia_centavos: 3_500 }, actor: 4, canal: "TPV", dispositivo: "dis-norte-07", horas: 42, sede: 1 },
  { accion: "reserva.no_show", entidad: "reserva", entidadId: "res-3909", entidadLabel: "Reserva #352 · 8 pax", motivo: "Grupo no llegó; mesa liberada", antes: { estado: "confirmada" }, despues: { estado: "no_show", espera_min: 25 }, actor: 5, canal: "Tablet recepción", dispositivo: "dis-centro-08", horas: 46, sede: 0 },
  { accion: "auditoria.consulta", entidad: "configuracion", entidadId: "aud-consulta-01", entidadLabel: "Consulta de bitácora", motivo: "Revisión mensual de excepciones", antes: null, despues: { rango: "2026-09-01 → 2026-09-30", registros: 1_240 }, actor: 0, canal: "Panel admin", dispositivo: "dis-centro-01", horas: 54, sede: 0 },
  { accion: "precio.ajustado", entidad: "producto", entidadId: "pro-3910", entidadLabel: "Margarita clásica", motivo: "Ajuste por costo de insumos", antes: { precio_centavos: 14_000 }, despues: { precio_centavos: 15_500 }, actor: 0, canal: "Panel admin", dispositivo: "dis-norte-01", horas: 62, sede: 1 },
]

function construirEventos(): EventoAuditoria[] {
  return SEMILLAS.map((semilla, indice) => {
    const actor = ACTORES_AUDITORIA[semilla.actor] ?? ACTORES_AUDITORIA[0]
    const sede = SEDES_AUDITORIA[semilla.sede] ?? SEDES_AUDITORIA[0]
    return {
      id: `ev-${4000 + indice}`,
      fuente: "evento_auditoria" as const,
      sedeId: sede?.id ?? "centro",
      sedeNombre: sede?.nombre ?? "Punto C",
      usuarioId: actor?.id ?? null,
      usuarioNombre: actor?.nombre ?? "Sistema",
      usuarioRol: actor?.rol ?? "Sistema",
      dispositivoId: semilla.dispositivo,
      ip: actor?.id === "sistema" ? null : `10.0.${(indice % 4) + 1}.${20 + (indice % 200)}`,
      requestId: `req-${9_000 + indice}`,
      entidad: semilla.entidad,
      entidadId: semilla.entidadId,
      entidadLabel: semilla.entidadLabel,
      accion: semilla.accion,
      accionLabel: labelDe(semilla.accion),
      tipo: ACCIONES_CATALOGO.find((item) => item.accion === semilla.accion)?.tipo ?? "Operación",
      severidad: severidadDe(semilla.accion),
      motivo: semilla.motivo,
      datosAntes: semilla.antes,
      datosDespues: semilla.despues,
      canal: semilla.canal,
      creadoEn: isoHaceHoras(semilla.horas),
    }
  }).sort((a, b) => Date.parse(b.creadoEn) - Date.parse(a.creadoEn))
}

const EVENTOS = construirEventos()

/** Hitos de `bitacora_evento` que se combinan en la línea de tiempo (plan 16 §4). */
function bitacoraDe(entidad: string, entidadId: string, entidadLabel: string): EventoAuditoria[] {
  if (!["pedido", "comanda", "reserva", "pago", "turno"].includes(entidad)) return []
  const hitos: { evento: string; label: string; horas: number; actor: string; rol: string; canal: string }[] = [
    { evento: `${entidad}.creado`, label: "Entidad creada", horas: 52, actor: "Luis Paredes", rol: "Mesero", canal: "App mesero" },
    { evento: `${entidad}.actualizado`, label: "Actualización operativa", horas: 50.5, actor: "Sistema", rol: "Sistema", canal: "Servicio" },
    { evento: `${entidad}.cerrado`, label: "Cierre operativo", horas: 48.5, actor: "Paola Ríos", rol: "Cajera", canal: "TPV" },
  ]
  return hitos.map((hito, indice) => ({
    id: `bit-${entidadId}-${indice}`,
    fuente: "bitacora_evento" as const,
    sedeId: "centro",
    sedeNombre: "Punto C · Centro",
    usuarioId: null,
    usuarioNombre: hito.actor,
    usuarioRol: hito.rol,
    dispositivoId: indice === 1 ? null : `dis-centro-0${indice + 2}`,
    ip: null,
    requestId: `req-${entidadId}-${indice}`,
    entidad: entidad as EntidadAuditoria,
    entidadId,
    entidadLabel,
    accion: hito.evento,
    accionLabel: hito.label,
    tipo: "Bitácora",
    severidad: "info" as const,
    motivo: "Hito del ciclo de vida registrado por el servicio",
    datosAntes: null,
    datosDespues: null,
    canal: hito.canal,
    creadoEn: isoHaceHoras(hito.horas + hash(entidadId + indice) * 2),
  }))
}

function retencionVigente(): RetencionResp {
  const purga = new Date()
  purga.setMonth(purga.getMonth() - 24)
  const desde = new Date(purga)
  desde.setDate(1)
  const masAntiguo = EVENTOS.length > 0 ? EVENTOS[EVENTOS.length - 1]?.creadoEn ?? null : null
  return {
    meses: 24,
    desde: desde.toISOString().slice(0, 10),
    eventoMasAntiguo: masAntiguo,
    purgadoAntesDe: purga.toISOString().slice(0, 10),
    totalConservado: EVENTOS.length,
    gestionadoPor: "Configuración del tenant · módulo Sucursal y ajustes",
  }
}

/* -------------------------------------------------------------------------- */
/* Mocks                                                                       */
/* -------------------------------------------------------------------------- */

/** GET /admin/auditoria — bitácora global con filtros y paginación (RF-R5-130). */
registerMock("GET", /^\/admin\/auditoria$/, (ctx) => {
  const usuarioId = q(ctx.query.usuario_id)
  const tipo = q(ctx.query.tipo)
  const accion = q(ctx.query.accion)
  const entidad = q(ctx.query.entidad)
  const entidadId = q(ctx.query.entidad_id)
  const severidad = q(ctx.query.severidad)
  const desde = q(ctx.query.desde)
  const hasta = q(ctx.query.hasta)
  const texto = q(ctx.query.texto).toLowerCase()
  const sucursal = q(ctx.query.sucursal)
  const page = Math.max(1, Number(q(ctx.query.page)) || 1)
  const pageSize = Math.max(1, Math.min(100, Number(q(ctx.query.pageSize)) || 10))

  const filtrados = EVENTOS.filter((evento) => {
    if (usuarioId && evento.usuarioId !== usuarioId) return false
    if (tipo && evento.tipo !== tipo) return false
    if (accion && evento.accion !== accion) return false
    if (entidad && evento.entidad !== entidad) return false
    if (entidadId && evento.entidadId !== entidadId) return false
    if (severidad && evento.severidad !== severidad) return false
    if (sucursal && evento.sedeId !== sucursal) return false
    if (desde && Date.parse(evento.creadoEn) < Date.parse(`${desde}T00:00:00`)) return false
    if (hasta && Date.parse(evento.creadoEn) > Date.parse(`${hasta}T23:59:59`)) return false
    if (texto) {
      const blob = `${evento.accionLabel} ${evento.usuarioNombre} ${evento.entidadLabel} ${evento.motivo ?? ""} ${evento.entidadId}`.toLowerCase()
      if (!blob.includes(texto)) return false
    }
    return true
  })

  const inicio = (page - 1) * pageSize
  const respuesta: AuditoriaResp = {
    actualizadoEn: new Date().toISOString(),
    data: filtrados.slice(inicio, inicio + pageSize),
    total: filtrados.length,
    page,
    pageSize,
    resumen: {
      total: filtrados.length,
      criticos: filtrados.filter((evento) => evento.severidad === "critica").length,
      altos: filtrados.filter((evento) => evento.severidad === "alta").length,
      acciones: new Set(filtrados.map((evento) => evento.accion)).size,
      actores: new Set(filtrados.map((evento) => evento.usuarioId ?? "sistema")).size,
    },
  }
  return respuesta
})

/** GET /admin/auditoria/retencion — retención configurable visible (RF-R5-133). */
registerMock("GET", /^\/admin\/auditoria\/retencion$/, () => retencionVigente())

/** GET /admin/auditoria/:entidad/:id — línea de tiempo combinada (RF-R5-131). */
registerMock("GET", /^\/admin\/auditoria\/([^/]+)\/([^/]+)$/, (ctx) => {
  const match = ctx.path.match(/^\/admin\/auditoria\/([^/]+)\/([^/]+)$/)
  const entidad = decodeURIComponent(match?.[1] ?? "")
  const entidadId = decodeURIComponent(match?.[2] ?? "")
  const auditoria = EVENTOS.filter((evento) => evento.entidad === entidad && evento.entidadId === entidadId)
  const bitacora = bitacoraDe(entidad, entidadId, auditoria[0]?.entidadLabel ?? entidadId)
  /* Deduplicación por requestId/hito para no repetir un evento presente en ambas fuentes. */
  const vistos = new Set<string>()
  const eventos = [...auditoria, ...bitacora]
    .filter((evento) => {
      const clave = `${evento.requestId ?? evento.id}-${evento.accion}`
      if (vistos.has(clave)) return false
      vistos.add(clave)
      return true
    })
    .sort((a, b) => Date.parse(b.creadoEn) - Date.parse(a.creadoEn))

  const respuesta: EntidadTimelineResp = {
    actualizadoEn: new Date().toISOString(),
    entidad: entidad as EntidadAuditoria,
    entidadId,
    entidadLabel: auditoria[0]?.entidadLabel ?? bitacora[0]?.entidadLabel ?? entidadId,
    enlaceEntidad: "",
    retencion: retencionVigente(),
    eventos,
  }
  return respuesta
})

/** POST /admin/exportaciones — la exportación de auditoría se audita a sí misma. */
registerMock("POST", /^\/admin\/exportaciones$/, (ctx) => {
  const payload = (ctx.body ?? {}) as { tipo?: string; formato?: string; filtros?: { desde?: string; hasta?: string } }
  if (!payload.tipo) throw new ApiError(422, "Indica el tipo de exportación", "tipo_requerido")
  const filasEstimadas = payload.tipo === "auditoria" ? 128_400 : 5_000
  const segundoPlano = filasEstimadas > 50_000
  const respuesta: ExportacionAuditoriaResp = {
    id: `exp-${Date.now()}`,
    estado: "pendiente",
    tipo: payload.tipo,
    formato: payload.formato ?? "csv",
    filasEstimadas,
    segundoPlano,
    aviso: segundoPlano
      ? `La exportación supera 50 000 filas (${filasEstimadas.toLocaleString("es-MX")}): se procesa en segundo plano y se te avisará cuando esté lista.`
      : null,
    creadoEn: new Date().toISOString(),
  }
  return respuesta
})

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export type PaginaAuditoria = { page: number; pageSize: number }

function consultaAuditoria(filtros: AuditoriaFiltros, pagina: PaginaAuditoria, sedeId: string | null): Query {
  return {
    usuario_id: filtros.usuarioId,
    tipo: filtros.tipo,
    accion: filtros.accion,
    entidad: filtros.entidad,
    entidad_id: filtros.entidadId,
    severidad: filtros.severidad,
    desde: filtros.desde,
    hasta: filtros.hasta,
    texto: filtros.texto,
    page: pagina.page,
    pageSize: pagina.pageSize,
    sucursal: sedeId ?? undefined,
  }
}

export function useAuditoria(filtros: AuditoriaFiltros, pagina: PaginaAuditoria, sedeId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["auditoria", "lista", filtros, pagina, sedeId],
    queryFn: () => api.get<AuditoriaResp>("/admin/auditoria", consultaAuditoria(filtros, pagina, sedeId)),
    enabled,
  })
}

export function useEntidadTimeline(entidad: string | undefined, entidadId: string | undefined) {
  return useQuery({
    queryKey: ["auditoria", "entidad", entidad, entidadId],
    queryFn: () => api.get<EntidadTimelineResp>(`/admin/auditoria/${entidad}/${entidadId}`),
    enabled: Boolean(entidad && entidadId),
  })
}

export function useRetencion(enabled: boolean) {
  return useQuery({
    queryKey: ["auditoria", "retencion"],
    queryFn: () => api.get<RetencionResp>("/admin/auditoria/retencion"),
    enabled,
  })
}

export function useExportarAuditoria() {
  return useMutation({
    mutationFn: (payload: { tipo: string; formato: string; filtros: AuditoriaFiltros }) =>
      api.post<ExportacionAuditoriaResp>("/admin/exportaciones", payload),
  })
}
