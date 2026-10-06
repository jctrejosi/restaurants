/**
 * API del módulo Promociones (plan 08). Los mocks se retiran cuando el backend
 * NestJS exponga `/admin/promociones`, `/admin/cupones`, `/admin/newsletter` y
 * `/admin/resenas`.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError, registerMock, type Query } from "@/lib/api"
import {
  estadoPromocion,
  motivoNoAplica,
  type Cupon,
  type CuponPayload,
  type CuponesFiltros,
  type EncuestaResumen,
  type EnvioNewsletter,
  type MetricaUtm,
  type MetricasRespuesta,
  type PlantillaNotificacion,
  type Promocion,
  type PromocionPayload,
  type PromocionesFiltros,
  type PromocionesRespuesta,
  type Resena,
  type ResenasFiltros,
  type Segmento,
  type Suscriptor,
} from "@/modules/promociones/types"

function hace(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString()
}

function dentro(min: number): string {
  return new Date(Date.now() + min * 60_000).toISOString()
}

const DIAS = 60 * 24

const PROMOCIONES: Promocion[] = [
  {
    id: "prom-1",
    titulo: "2x1 en alitas los martes",
    descripcion: "Aplica en salón y para llevar. No acumulable con otras promociones.",
    tipo: "banner",
    sucursalId: "centro",
    desde: hace(5 * DIAS),
    hasta: dentro(10 * DIAS),
    publicada: true,
    imagenUrl: "https://images.unsplash.com/photo-1608039755401-742074f0548d?w=640",
    enlace: "/promociones/alitas-2x1",
    actualizadoEn: hace(60 * 24 * 2),
    actualizadoPor: "María Gómez",
    version: 2,
  },
  {
    id: "prom-2",
    titulo: "Menú del día en terraza",
    descripcion: "Tres tiempos con bebida incluida, de 13:00 a 16:00.",
    tipo: "destacado",
    sucursalId: null,
    desde: dentro(2 * DIAS),
    hasta: dentro(20 * DIAS),
    publicada: true,
    imagenUrl: "",
    enlace: "",
    actualizadoEn: hace(60 * 6),
    actualizadoPor: "María Gómez",
    version: 1,
  },
  {
    id: "prom-3",
    titulo: "Noche de jazz",
    descripcion: "Música en vivo y coctelería de autor.",
    tipo: "banner",
    sucursalId: "centro",
    desde: hace(20 * DIAS),
    hasta: hace(3 * DIAS),
    publicada: true,
    imagenUrl: "",
    enlace: "",
    actualizadoEn: hace(20 * DIAS),
    actualizadoPor: "Carlos Méndez",
    version: 3,
  },
  {
    id: "prom-4",
    titulo: "Combo familiar de fin de semana",
    descripcion: "Para 4 personas con postre incluido.",
    tipo: "banner",
    sucursalId: "norte",
    desde: hace(40 * DIAS),
    hasta: dentro(30 * DIAS),
    publicada: false,
    imagenUrl: "",
    enlace: "",
    actualizadoEn: hace(DIAS),
    actualizadoPor: "Ana Morales",
    version: 2,
  },
  {
    id: "prom-5",
    titulo: "Postres de temporada",
    descripcion: "Destacado en la carta digital y el APK.",
    tipo: "destacado",
    sucursalId: "centro",
    desde: hace(2 * DIAS),
    hasta: dentro(25 * DIAS),
    publicada: true,
    imagenUrl: "",
    enlace: "",
    actualizadoEn: hace(48 * 60),
    actualizadoPor: "María Gómez",
    version: 1,
  },
]

const CUPONES: Cupon[] = [
  {
    id: "cup-1",
    codigo: "BIENVENIDO10",
    tipo: "porcentaje",
    valor: 1000,
    sucursalId: null,
    desde: hace(90 * DIAS),
    hasta: dentro(30 * DIAS),
    usos: 34,
    usosMaximo: 200,
    maximoPorCliente: 1,
    activo: true,
    actualizadoEn: hace(3 * DIAS),
    actualizadoPor: "María Gómez",
    version: 2,
  },
  {
    id: "cup-2",
    codigo: "PIZZA50",
    tipo: "monto",
    valor: 5000,
    sucursalId: "centro",
    desde: hace(30 * DIAS),
    hasta: dentro(15 * DIAS),
    usos: 100,
    usosMaximo: 100,
    maximoPorCliente: 1,
    activo: true,
    actualizadoEn: hace(4 * 60),
    actualizadoPor: "Sistema",
    version: 4,
  },
  {
    id: "cup-3",
    codigo: "VERANO25",
    tipo: "porcentaje",
    valor: 1500,
    sucursalId: null,
    desde: hace(120 * DIAS),
    hasta: hace(2 * DIAS),
    usos: 412,
    usosMaximo: 500,
    maximoPorCliente: 2,
    activo: true,
    actualizadoEn: hace(120 * DIAS),
    actualizadoPor: "María Gómez",
    version: 1,
  },
  {
    id: "cup-4",
    codigo: "NORTE20",
    tipo: "porcentaje",
    valor: 2000,
    sucursalId: "norte",
    desde: hace(10 * DIAS),
    hasta: dentro(40 * DIAS),
    usos: 7,
    usosMaximo: 150,
    maximoPorCliente: 1,
    activo: false,
    actualizadoEn: hace(2 * DIAS),
    actualizadoPor: "Ana Morales",
    version: 2,
  },
  {
    id: "cup-5",
    codigo: "CUMPLE15",
    tipo: "monto",
    valor: 10000,
    sucursalId: null,
    desde: hace(15 * DIAS),
    hasta: dentro(60 * DIAS),
    usos: 12,
    usosMaximo: 50,
    maximoPorCliente: 2,
    activo: true,
    actualizadoEn: hace(5 * DIAS),
    actualizadoPor: "María Gómez",
    version: 1,
  },
]

const SUSCRIPTORES: Suscriptor[] = [
  { id: "sus-1", correo: "ana.morales@example.com", nombre: "Ana Morales", consentimientoEn: hace(60 * DIAS), origen: "web", activo: true, altaEn: hace(120 * DIAS) },
  { id: "sus-2", correo: "luis.trejo@example.com", nombre: "Luis Trejo", consentimientoEn: hace(45 * DIAS), origen: "apk", activo: true, altaEn: hace(90 * DIAS) },
  { id: "sus-3", correo: "sofia.vega@example.com", nombre: "Sofía Vega", consentimientoEn: null, origen: "reserva", activo: true, altaEn: hace(30 * DIAS) },
  { id: "sus-4", correo: "carlos.mendez@example.com", nombre: "Carlos Méndez", consentimientoEn: hace(200 * DIAS), origen: "web", activo: false, altaEn: hace(300 * DIAS) },
  { id: "sus-5", correo: "laura.perez@example.com", nombre: "Laura Pérez", consentimientoEn: hace(15 * DIAS), origen: "qr", activo: true, altaEn: hace(20 * DIAS) },
  { id: "sus-6", correo: "diego.ramirez@example.com", nombre: "Diego Ramírez", consentimientoEn: null, origen: "web", activo: true, altaEn: hace(8 * DIAS) },
  { id: "sus-7", correo: "eventos@example.com", nombre: "Eventos Punto C", consentimientoEn: hace(400 * DIAS), origen: "manual", activo: true, altaEn: hace(400 * DIAS) },
  { id: "sus-8", correo: "baja@example.com", nombre: null, consentimientoEn: null, origen: "web", activo: false, altaEn: hace(60 * DIAS) },
]

const SEGMENTOS: Segmento[] = [
  { id: "seg-1", nombre: "Todos los clientes", criterio: "Sin filtro", destinatarios: 1240, conConsentimiento: 980 },
  { id: "seg-2", nombre: "Frecuentes (1+ pedido por semana)", criterio: "pedidos_30d >= 4", destinatarios: 320, conConsentimiento: 295 },
  { id: "seg-3", nombre: "Inactivos 90 días", criterio: "ultimo_pedido > 90d", destinatarios: 410, conConsentimiento: 260 },
]

const PLANTILLAS: PlantillaNotificacion[] = [
  { id: "plan-1", nombre: "Promo semanal", evento: "promocion", canal: "email", idioma: "es-MX" },
  { id: "plan-2", nombre: "Bienvenida a la carta", evento: "alta_cliente", canal: "email", idioma: "es-MX" },
  { id: "plan-3", nombre: "Recordatorio de reserva", evento: "reserva", canal: "email", idioma: "es-MX" },
]

const ENVIOS: EnvioNewsletter[] = [
  {
    id: "env-1",
    plantillaNombre: "Promo semanal",
    segmentoNombre: "Todos los clientes",
    destinatarios: 980,
    excluidos: 260,
    estado: "enviada",
    creadoEn: hace(60 * 24 * 3),
    error: null,
  },
  {
    id: "env-2",
    plantillaNombre: "Bienvenida a la carta",
    segmentoNombre: "Frecuentes (1+ pedido por semana)",
    destinatarios: 295,
    excluidos: 25,
    estado: "pendiente",
    creadoEn: hace(25),
    error: null,
  },
  {
    id: "env-3",
    plantillaNombre: "Recordatorio de reserva",
    segmentoNombre: "Inactivos 90 días",
    destinatarios: 260,
    excluidos: 150,
    estado: "fallida",
    creadoEn: hace(60 * 24),
    error: "El proveedor rechazó la ráfaga (límite por hora). Reintentar más tarde.",
  },
]

const RESENAS: Resena[] = [
  {
    id: "res-1",
    puntaje: 5,
    comentario: "La mejor arrachera que he probado; el servicio fue impecable.",
    fuente: "google",
    autor: "Mariana L.",
    sucursalId: "centro",
    creadaEn: hace(50),
    estado: "pendiente",
    moderadaPor: null,
    moderadaEn: null,
    motivoRechazo: null,
  },
  {
    id: "res-2",
    puntaje: 1,
    comentario: "La comida llegó fría y el mesero fue un idiota, no vuelvo.",
    fuente: "web",
    autor: "Cliente anónimo",
    sucursalId: "centro",
    creadaEn: hace(120),
    estado: "pendiente",
    moderadaPor: null,
    moderadaEn: null,
    motivoRechazo: null,
  },
  {
    id: "res-3",
    puntaje: 4,
    comentario: "Buen menú del día y precio justo; la terraza estaba llena.",
    fuente: "tripadvisor",
    autor: "Jorge R.",
    sucursalId: "norte",
    creadaEn: hace(60 * 8),
    estado: "publicada",
    moderadaPor: "María Gómez",
    moderadaEn: hace(60 * 7),
    motivoRechazo: null,
  },
  {
    id: "res-4",
    puntaje: 5,
    comentario: "Excelente atención en el turno de la tarde.",
    fuente: "web",
    autor: "Paola M.",
    sucursalId: "centro",
    creadaEn: hace(60 * 30),
    estado: "publicada",
    moderadaPor: "María Gómez",
    moderadaEn: hace(60 * 29),
    motivoRechazo: null,
  },
  {
    id: "res-5",
    puntaje: 1,
    comentario: "Spam: compren seguidores en mi sitio web barato.",
    fuente: "otra",
    autor: "promo_bot",
    sucursalId: "centro",
    creadaEn: hace(60 * 36),
    estado: "rechazada",
    moderadaPor: "María Gómez",
    moderadaEn: hace(60 * 35),
    motivoRechazo: "Spam publicitario, no es una reseña real.",
  },
  {
    id: "res-6",
    puntaje: 3,
    comentario: "Rico todo, aunque tardaron bastante en traer la cuenta.",
    fuente: "google",
    autor: "Andrés C.",
    sucursalId: "norte",
    creadaEn: hace(60 * 50),
    estado: "publicada",
    moderadaPor: "Ana Morales",
    moderadaEn: hace(60 * 48),
    motivoRechazo: null,
  },
]

const ENCUESTAS: EncuestaResumen[] = [
  { tipo: "pedido", respuestas: 187, promedio: 4.4, nps: 62 },
  { tipo: "reserva", respuestas: 93, promedio: 4.6, nps: 71 },
  { tipo: "visita", respuestas: 54, promedio: 4.2, nps: 55 },
]

const METRICAS: MetricaUtm[] = [
  { id: "utm-1", campana: "Verano en la terraza", origen: "instagram", medio: "social", pedidos: 84, reservas: 31, ingresoCentavos: 1_845_000 },
  { id: "utm-2", campana: "Menú del día", origen: "google", medio: "organico", pedidos: 152, reservas: 12, ingresoCentavos: 2_230_500 },
  { id: "utm-3", campana: "Newsletter semanal", origen: "email", medio: "newsletter", pedidos: 96, reservas: 8, ingresoCentavos: 1_320_000 },
  { id: "utm-4", campana: "Alitas 2x1", origen: "tiktok", medio: "social", pedidos: 61, reservas: 3, ingresoCentavos: 780_000 },
  { id: "utm-5", campana: "QR de mesa", origen: "qr", medio: "presencial", pedidos: 210, reservas: 0, ingresoCentavos: 2_980_000 },
  { id: "utm-6", campana: "Volante colonia norte", origen: "impreso", medio: "offline", pedidos: 18, reservas: 2, ingresoCentavos: 265_000 },
]

/* -------------------------------------------------------------------------- */
/* Promociones                                                                 */
/* -------------------------------------------------------------------------- */

let registrado = false

export function registrarMocksPromociones(): void {
  if (registrado) return
  registrado = true

  registerMock("GET", /^\/admin\/promociones$/, (ctx) => {
    const q = ctx.query
    const busqueda = typeof q.q === "string" ? q.q.trim().toLowerCase() : ""
    let items = [...PROMOCIONES]
    if (typeof q.sucursalId === "string" && q.sucursalId) {
      items = items.filter((promocion) => !promocion.sucursalId || promocion.sucursalId === q.sucursalId)
    }
    if (typeof q.tipo === "string" && q.tipo) {
      items = items.filter((promocion) => promocion.tipo === q.tipo)
    }
    if (typeof q.estado === "string" && q.estado) {
      items = items.filter((promocion) => estadoPromocion(promocion) === q.estado)
    }
    if (busqueda) {
      items = items.filter((promocion) => promocion.titulo.toLowerCase().includes(busqueda))
    }
    const respuesta: PromocionesRespuesta = { data: items, total: items.length }
    return respuesta
  })

  registerMock("POST", /^\/admin\/promociones$/, (ctx) => {
    const body = (ctx.body ?? {}) as Partial<PromocionPayload>
    validarVigencia(body.desde, body.hasta)
    if (!body.titulo?.trim()) throw new ApiError(422, "El título es obligatorio.", "promocion_invalida")
    const promocion: Promocion = {
      id: `prom-${Date.now()}`,
      titulo: body.titulo.trim(),
      descripcion: body.descripcion ?? "",
      tipo: body.tipo ?? "banner",
      sucursalId: body.sucursalId ?? null,
      desde: body.desde ?? new Date().toISOString(),
      hasta: body.hasta ?? new Date().toISOString(),
      publicada: false,
      imagenUrl: body.imagenUrl ?? "",
      enlace: body.enlace ?? "",
      actualizadoEn: new Date().toISOString(),
      actualizadoPor: "María Gómez",
      version: 1,
    }
    PROMOCIONES.push(promocion)
    return promocion
  })

  registerMock("GET", /^\/admin\/promociones\/metricas$/, (): MetricasRespuesta => ({
    actualizadoEn: hace(0.4),
    filas: METRICAS,
  }))

  registerMock("GET", /^\/admin\/promociones\/([^/]+)$/, (ctx) => {
    const id = ctx.path.split("/")[3] ?? ""
    const promocion = PROMOCIONES.find((item) => item.id === id)
    if (!promocion) throw new ApiError(404, "La promoción no existe.", "promocion_no_encontrada")
    return promocion
  })

  registerMock("PATCH", /^\/admin\/promociones\/([^/]+)$/, (ctx) => {
    const id = ctx.path.split("/")[3] ?? ""
    const promocion = PROMOCIONES.find((item) => item.id === id)
    if (!promocion) throw new ApiError(404, "La promoción no existe.", "promocion_no_encontrada")
    const body = (ctx.body ?? {}) as Partial<PromocionPayload>
    if (body.version !== undefined && body.version !== promocion.version) {
      throw new ApiError(409, "Otro usuario confirmó cambios antes que tú. Gana la versión del servidor.", "conflicto_version")
    }
    validarVigencia(body.desde ?? promocion.desde, body.hasta ?? promocion.hasta)
    Object.assign(promocion, body, { id: promocion.id })
    promocion.actualizadoEn = new Date().toISOString()
    promocion.actualizadoPor = "María Gómez"
    promocion.version += 1
    return promocion
  })

  registerMock("POST", /^\/admin\/promociones\/([^/]+)\/publicar$/, (ctx) => {
    const id = ctx.path.split("/")[3] ?? ""
    const promocion = PROMOCIONES.find((item) => item.id === id)
    if (!promocion) throw new ApiError(404, "La promoción no existe.", "promocion_no_encontrada")
    if (estadoPromocion(promocion) === "vencida") {
      throw new ApiError(422, "Una promoción vencida no se publica; duplícala para reutilizarla.", "promocion_vencida")
    }
    promocion.publicada = true
    promocion.actualizadoEn = new Date().toISOString()
    promocion.version += 1
    return promocion
  })

  registerMock("POST", /^\/admin\/promociones\/([^/]+)\/pausar$/, (ctx) => {
    const id = ctx.path.split("/")[3] ?? ""
    const promocion = PROMOCIONES.find((item) => item.id === id)
    if (!promocion) throw new ApiError(404, "La promoción no existe.", "promocion_no_encontrada")
    promocion.publicada = false
    promocion.actualizadoEn = new Date().toISOString()
    promocion.version += 1
    return promocion
  })

  /* Cupones */

  registerMock("GET", /^\/admin\/cupones$/, (ctx) => {
    const q = ctx.query
    const busqueda = typeof q.q === "string" ? q.q.trim().toLowerCase() : ""
    let items = [...CUPONES]
    if (typeof q.estado === "string" && q.estado) {
      if (q.estado === "no_aplica") items = items.filter((cupon) => motivoNoAplica(cupon) !== null)
      else if (q.estado === "activo") items = items.filter((cupon) => motivoNoAplica(cupon) === null)
      else if (q.estado === "agotado") items = items.filter((cupon) => cupon.usos >= cupon.usosMaximo)
    }
    if (busqueda) items = items.filter((cupon) => cupon.codigo.toLowerCase().includes(busqueda))
    return { data: items, total: items.length }
  })

  registerMock("POST", /^\/admin\/cupones$/, (ctx) => {
    const body = (ctx.body ?? {}) as Partial<CuponPayload>
    validarVigencia(body.desde, body.hasta)
    const codigo = body.codigo?.trim().toUpperCase()
    if (!codigo) throw new ApiError(422, "El código es obligatorio.", "cupon_invalido")
    if (CUPONES.some((cupon) => cupon.codigo === codigo)) {
      throw new ApiError(422, "Ya existe un cupón con ese código.", "cupon_duplicado")
    }
    const cupon: Cupon = {
      id: `cup-${Date.now()}`,
      codigo,
      tipo: body.tipo ?? "porcentaje",
      valor: body.valor ?? 0,
      sucursalId: body.sucursalId ?? null,
      desde: body.desde ?? new Date().toISOString(),
      hasta: body.hasta ?? new Date().toISOString(),
      usos: 0,
      usosMaximo: body.usosMaximo ?? 100,
      maximoPorCliente: body.maximoPorCliente ?? 1,
      activo: body.activo ?? true,
      actualizadoEn: new Date().toISOString(),
      actualizadoPor: "María Gómez",
      version: 1,
    }
    if (cupon.usosMaximo < 1) throw new ApiError(422, "Los usos máximos deben ser al menos 1.", "cupon_invalido")
    CUPONES.push(cupon)
    return cupon
  })

  registerMock("GET", /^\/admin\/cupones\/([^/]+)$/, (ctx) => {
    const id = ctx.path.split("/")[3] ?? ""
    const cupon = CUPONES.find((item) => item.id === id)
    if (!cupon) throw new ApiError(404, "El cupón no existe.", "cupon_no_encontrado")
    return cupon
  })

  registerMock("PATCH", /^\/admin\/cupones\/([^/]+)$/, (ctx) => {
    const id = ctx.path.split("/")[3] ?? ""
    const cupon = CUPONES.find((item) => item.id === id)
    if (!cupon) throw new ApiError(404, "El cupón no existe.", "cupon_no_encontrado")
    const body = (ctx.body ?? {}) as Partial<CuponPayload>
    if (body.version !== undefined && body.version !== cupon.version) {
      throw new ApiError(409, "Otro usuario confirmó cambios antes que tú. Gana la versión del servidor.", "conflicto_version")
    }
    Object.assign(cupon, body, { id: cupon.id, codigo: body.codigo ? body.codigo.trim().toUpperCase() : cupon.codigo })
    cupon.actualizadoEn = new Date().toISOString()
    cupon.actualizadoPor = "María Gómez"
    cupon.version += 1
    return cupon
  })

  registerMock("POST", /^\/admin\/cupones\/([^/]+)\/anular$/, (ctx) => {
    const id = ctx.path.split("/")[3] ?? ""
    const cupon = CUPONES.find((item) => item.id === id)
    if (!cupon) throw new ApiError(404, "El cupón no existe.", "cupon_no_encontrado")
    cupon.activo = false
    cupon.actualizadoEn = new Date().toISOString()
    cupon.version += 1
    return cupon
  })

  /* Newsletter */

  registerMock("GET", /^\/admin\/newsletter\/suscriptores$/, (ctx) => {
    const q = ctx.query
    const busqueda = typeof q.q === "string" ? q.q.trim().toLowerCase() : ""
    let items = [...SUSCRIPTORES]
    if (busqueda) {
      items = items.filter(
        (suscriptor) =>
          suscriptor.correo.toLowerCase().includes(busqueda) ||
          (suscriptor.nombre ?? "").toLowerCase().includes(busqueda),
      )
    }
    if (String(q.activo ?? "") === "true") items = items.filter((suscriptor) => suscriptor.activo)
    if (String(q.activo ?? "") === "false") items = items.filter((suscriptor) => !suscriptor.activo)
    if (String(q.consentimiento ?? "") === "true") {
      items = items.filter((suscriptor) => suscriptor.consentimientoEn !== null)
    }
    return { data: items, total: items.length }
  })

  registerMock("PATCH", /^\/admin\/newsletter\/suscriptores\/([^/]+)$/, (ctx) => {
    const id = ctx.path.split("/")[3] ?? ""
    const suscriptor = SUSCRIPTORES.find((item) => item.id === id)
    if (!suscriptor) throw new ApiError(404, "El suscriptor no existe.", "suscriptor_no_encontrado")
    const body = (ctx.body ?? {}) as { activo?: boolean }
    if (body.activo !== undefined) suscriptor.activo = body.activo
    return suscriptor
  })

  registerMock("GET", /^\/admin\/newsletter\/envios$/, () => ({ data: ENVIOS, total: ENVIOS.length }))

  registerMock("POST", /^\/admin\/newsletter\/envios$/, (ctx) => {
    const body = (ctx.body ?? {}) as { plantillaId?: string; segmentoId?: string }
    const plantilla = PLANTILLAS.find((item) => item.id === body.plantillaId)
    const segmento = SEGMENTOS.find((item) => item.id === body.segmentoId)
    if (!plantilla || !segmento) throw new ApiError(422, "Selecciona plantilla y segmento.", "envio_invalido")
    const excluidos = segmento.destinatarios - segmento.conConsentimiento
    if (segmento.conConsentimiento === 0) {
      throw new ApiError(422, "El segmento no tiene contactos con consentimiento; no se enviará nada.", "sin_consentimiento")
    }
    const envio: EnvioNewsletter = {
      id: `env-${Date.now()}`,
      plantillaNombre: plantilla.nombre,
      segmentoNombre: segmento.nombre,
      destinatarios: segmento.conConsentimiento,
      excluidos,
      estado: "pendiente",
      creadoEn: new Date().toISOString(),
      error: null,
    }
    ENVIOS.unshift(envio)
    return envio
  })

  registerMock("GET", /^\/admin\/segmentos$/, () => ({ data: SEGMENTOS, total: SEGMENTOS.length }))

  registerMock("GET", /^\/admin\/newsletter\/plantillas$/, () => ({ data: PLANTILLAS, total: PLANTILLAS.length }))

  /* Reseñas y encuestas */

  registerMock("GET", /^\/admin\/resenas$/, (ctx) => {
    const q = ctx.query
    let items = [...RESENAS]
    if (typeof q.estado === "string" && q.estado) {
      items = items.filter((resena) => resena.estado === q.estado)
    }
    if (typeof q.fuente === "string" && q.fuente) {
      items = items.filter((resena) => resena.fuente === q.fuente)
    }
    return { data: items, total: items.length }
  })

  registerMock("POST", /^\/admin\/resenas\/([^/]+)\/moderar$/, (ctx) => {
    const id = ctx.path.split("/")[3] ?? ""
    const resena = RESENAS.find((item) => item.id === id)
    if (!resena) throw new ApiError(404, "La reseña no existe.", "resena_no_encontrada")
    const body = (ctx.body ?? {}) as { decision?: "publicar" | "rechazar"; motivo?: string }
    if (body.decision !== "publicar" && body.decision !== "rechazar") {
      throw new ApiError(422, "Decisión inválida.", "decision_invalida")
    }
    if (body.decision === "rechazar" && (body.motivo?.trim().length ?? 0) < 3) {
      throw new ApiError(422, "Rechazar una reseña exige motivo (RN-R5-02).", "motivo_requerido")
    }
    resena.estado = body.decision === "publicar" ? "publicada" : "rechazada"
    resena.moderadaPor = "María Gómez"
    resena.moderadaEn = new Date().toISOString()
    resena.motivoRechazo = body.decision === "rechazar" ? (body.motivo?.trim() ?? null) : null
    return resena
  })

  registerMock("GET", /^\/admin\/encuestas$/, () => ({ data: ENCUESTAS, total: ENCUESTAS.length }))
}

function validarVigencia(desde?: string, hasta?: string): void {
  if (desde && hasta && new Date(hasta).getTime() <= new Date(desde).getTime()) {
    throw new ApiError(422, "La vigencia debe cumplir desde < hasta.", "vigencia_invalida")
  }
}

registrarMocksPromociones()

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function usePromociones(filtros: PromocionesFiltros) {
  return useQuery({
    queryKey: ["promociones", "lista", filtros],
    queryFn: () => api.get<PromocionesRespuesta>("/admin/promociones", filtros as unknown as Query),
    placeholderData: keepPreviousData,
  })
}

export function useGuardarPromocion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: PromocionPayload & { id?: string }) =>
      payload.id
        ? api.patch<Promocion>(`/admin/promociones/${payload.id}`, payload)
        : api.post<Promocion>("/admin/promociones", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["promociones"] })
    },
  })
}

export function usePublicarPromocion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; accion: "publicar" | "pausar"; motivo: string }) =>
      api.post<Promocion>(`/admin/promociones/${payload.id}/${payload.accion}`, { motivo: payload.motivo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["promociones"] })
    },
  })
}

export function useCupones(filtros: CuponesFiltros) {
  return useQuery({
    queryKey: ["promociones", "cupones", filtros],
    queryFn: () => api.get<{ data: Cupon[]; total: number }>("/admin/cupones", filtros as unknown as Query),
    placeholderData: keepPreviousData,
  })
}

export function useGuardarCupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CuponPayload & { id?: string }) =>
      payload.id
        ? api.patch<Cupon>(`/admin/cupones/${payload.id}`, payload)
        : api.post<Cupon>("/admin/cupones", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["promociones"] })
    },
  })
}

export function useAnularCupon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; motivo: string }) =>
      api.post<Cupon>(`/admin/cupones/${payload.id}/anular`, { motivo: payload.motivo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["promociones"] })
    },
  })
}

export function useSuscriptores(filtros: { q?: string; activo?: boolean; consentimiento?: boolean }) {
  return useQuery({
    queryKey: ["promociones", "suscriptores", filtros],
    queryFn: () =>
      api.get<{ data: Suscriptor[]; total: number }>("/admin/newsletter/suscriptores", filtros as unknown as Query),
    placeholderData: keepPreviousData,
  })
}

export function useActualizarSuscriptor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; activo: boolean }) =>
      api.patch<Suscriptor>(`/admin/newsletter/suscriptores/${payload.id}`, { activo: payload.activo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["promociones", "suscriptores"] })
    },
  })
}

export function useSegmentos() {
  return useQuery({
    queryKey: ["promociones", "segmentos"],
    queryFn: () => api.get<{ data: Segmento[]; total: number }>("/admin/segmentos"),
  })
}

export function usePlantillas() {
  return useQuery({
    queryKey: ["promociones", "plantillas"],
    queryFn: () => api.get<{ data: PlantillaNotificacion[]; total: number }>("/admin/newsletter/plantillas"),
  })
}

export function useEnvios() {
  return useQuery({
    queryKey: ["promociones", "envios"],
    queryFn: () => api.get<{ data: EnvioNewsletter[]; total: number }>("/admin/newsletter/envios"),
  })
}

export function useCrearEnvio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { plantillaId: string; segmentoId: string }) =>
      api.post<EnvioNewsletter>("/admin/newsletter/envios", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["promociones", "envios"] })
    },
  })
}

export function useResenas(filtros: ResenasFiltros) {
  return useQuery({
    queryKey: ["promociones", "resenas", filtros],
    queryFn: () => api.get<{ data: Resena[]; total: number }>("/admin/resenas", filtros as unknown as Query),
    placeholderData: keepPreviousData,
  })
}

export function useModerarResena() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; decision: "publicar" | "rechazar"; motivo?: string }) =>
      api.post<Resena>(`/admin/resenas/${payload.id}/moderar`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["promociones", "resenas"] })
    },
  })
}

export function useEncuestas() {
  return useQuery({
    queryKey: ["promociones", "encuestas"],
    queryFn: () => api.get<{ data: EncuestaResumen[]; total: number }>("/admin/encuestas"),
  })
}

export function useMetricasUtm() {
  return useQuery({
    queryKey: ["promociones", "metricas"],
    queryFn: () => api.get<MetricasRespuesta>("/admin/promociones/metricas"),
    refetchInterval: 60_000,
  })
}

export { motivoNoAplica, estadoPromocion }
