import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError, api, registerMock } from "@/lib/api"
import {
  CANALES,
  EVENTOS,
  type AjustesResp,
  type CierreTemporal,
  type ConfiguracionNotificacion,
  type ConfiguracionSucursal,
  type CrearSucursalPayload,
  type HorarioAtencion,
  type HorariosResp,
  type Impuesto,
  type NotificacionesResp,
  type ParametrosResp,
  type PlantillaNotificacion,
  type Sucursal,
  type SucursalesResp,
  type VentanaProgramacion,
} from "@/modules/ajustes/types"

/* -------------------------------------------------------------------------- */
/* Semilla mock                                                                */
/* -------------------------------------------------------------------------- */

const SUCURSALES: Sucursal[] = [
  {
    id: "centro",
    nombre: "Punto C · Centro",
    codigo: "PC-CEN",
    direccion: "Av. Reforma 128, Col. Juárez",
    ciudad: "Ciudad de México",
    telefono: "+52 55 5555 0101",
    coordenadas: "19.4326, -99.1332",
    zonaHoraria: "America/Mexico_City",
    moneda: "MXN",
    activa: true,
  },
  {
    id: "norte",
    nombre: "Punto C · Norte",
    codigo: "PC-NOR",
    direccion: "Calz. Vallejo 900, Col. Industrial",
    ciudad: "Ciudad de México",
    telefono: "+52 55 5555 0202",
    coordenadas: "19.5042, -99.1472",
    zonaHoraria: "America/Mexico_City",
    moneda: "MXN",
    activa: true,
  },
]

let IMPUESTOS: Impuesto[] = [
  { id: "imp-iva16", nombre: "IVA 16%", tasaBps: 1600, tipo: "adicionado", activo: true },
  { id: "imp-iva8", nombre: "IVA 8% frontera", tasaBps: 800, tipo: "adicionado", activo: false },
  { id: "imp-inc", nombre: "INC bebidas 8%", tasaBps: 800, tipo: "inc", activo: false },
]

function horario(id: string, diaSemana: number, franja: HorarioAtencion["franja"], horaApertura: string, horaCierre: string): HorarioAtencion {
  return { id, diaSemana, franja, horaApertura, horaCierre }
}

const HORARIOS: Record<string, HorarioAtencion[]> = {
  centro: [1, 2, 3, 4, 5, 6, 0].flatMap((dia) => [
    horario(`h-c-${dia}-des`, dia, "desayuno", "07:00", "12:00"),
    horario(`h-c-${dia}-com`, dia, "comida", "13:00", "17:00"),
    horario(`h-c-${dia}-cen`, dia, "cena", "18:00", "23:00"),
  ]),
  norte: [1, 2, 3, 4, 5, 6, 0].flatMap((dia) => [
    horario(`h-n-${dia}-com`, dia, "comida", "13:30", "17:30"),
    horario(`h-n-${dia}-cen`, dia, "cena", "18:30", "22:30"),
  ]),
}

const CIERRES: Record<string, CierreTemporal[]> = {
  centro: [
    {
      id: "cierre-1",
      desde: "2026-10-12T14:00:00",
      hasta: "2026-10-12T18:00:00",
      motivo: "Mantenimiento de campana y ductos",
      reservasAfectadas: 3,
    },
  ],
  norte: [],
}

const CONFIGURACION: Record<string, ConfiguracionSucursal> = {
  centro: {
    propinaSugeridaPct: 10,
    copiasComanda: 2,
    copiasFactura: 1,
    borradoComandaImpresa: false,
    comportamientoOffline: "completo",
    ventanaProgramacionMin: 120,
    limitesFranja: [
      { franja: "desayuno", maximoPedidos: 60 },
      { franja: "comida", maximoPedidos: 120 },
      { franja: "cena", maximoPedidos: 90 },
    ],
  },
  norte: {
    propinaSugeridaPct: 12,
    copiasComanda: 1,
    copiasFactura: 1,
    borradoComandaImpresa: true,
    comportamientoOffline: "solo_lectura",
    ventanaProgramacionMin: 90,
    limitesFranja: [
      { franja: "desayuno", maximoPedidos: 40 },
      { franja: "comida", maximoPedidos: 90 },
      { franja: "cena", maximoPedidos: 70 },
    ],
  },
}

function plantilla(
  id: string,
  evento: PlantillaNotificacion["evento"],
  canal: PlantillaNotificacion["canal"],
  asunto: string,
  cuerpo: string,
  idioma = "es-MX",
): PlantillaNotificacion {
  return { id, evento, canal, idioma, asunto, cuerpo }
}

const PLANTILLAS_BASE: PlantillaNotificacion[] = [
  plantilla(
    "pl-pedido-email",
    "pedido.confirmado",
    "email",
    "Confirmamos tu pedido {{folio}}",
    "Hola {{cliente}}: tu pedido {{folio}} por {{total}} quedó confirmado en {{sucursal}}.",
  ),
  plantilla(
    "pl-pedido-wsp",
    "pedido.confirmado",
    "whatsapp",
    "Pedido {{folio}} confirmado",
    "¡Gracias {{cliente}}! Tu pedido {{folio}} está en cocina.",
  ),
  plantilla(
    "pl-listo-email",
    "pedido.listo",
    "email",
    "Tu pedido {{folio}} está listo",
    "{{cliente}}, ya puedes recoger tu pedido {{folio}} en {{sucursal}}.",
  ),
  plantilla(
    "pl-camino-email",
    "pedido.en_camino",
    "email",
    "Tu pedido {{folio}} va en camino",
    "{{cliente}}, {{repartidor}} lleva tu pedido {{folio}}.",
  ),
  plantilla(
    "pl-entregado-email",
    "pedido.entregado",
    "email",
    "Pedido {{folio}} entregado",
    "Gracias por tu compra. Total: {{total}}.",
  ),
  plantilla(
    "pl-reserva-email",
    "reserva.confirmada",
    "email",
    "Reserva confirmada para {{fecha}}",
    "{{cliente}}, confirmamos tu reserva para {{personas}} personas el {{fecha}} a las {{hora}}.",
  ),
  plantilla(
    "pl-recordatorio-wsp",
    "reserva.recordatorio",
    "whatsapp",
    "Recordatorio de reserva",
    "Te esperamos mañana a las {{hora}} en {{sucursal}}.",
  ),
  plantilla(
    "pl-turno-email",
    "turno.cierre",
    "email",
    "Cierre de turno {{fecha}}",
    "El turno de {{sucursal}} cerró con {{total}}. Revisa el reporte de cierre.",
  ),
  plantilla(
    "pl-sync-email",
    "dispositivo.sync",
    "email",
    "Dispositivo {{dispositivo}} con pendientes",
    "{{dispositivo}} reporta {{pendientes}} operaciones pendientes en {{sucursal}}.",
  ),
]

function configuracionNotificacionPorDefecto(): ConfiguracionNotificacion[] {
  return EVENTOS.flatMap((evento) =>
    CANALES.map((canal) => {
      const base = PLANTILLAS_BASE.find((item) => item.evento === evento.id && item.canal === canal)
      return {
        evento: evento.id,
        canal,
        plantillaId: base?.id ?? null,
        activo: Boolean(base),
      }
    }),
  )
}

const NOTIFICACIONES: Record<string, NotificacionesResp> = {
  centro: { plantillas: PLANTILLAS_BASE.map((item) => ({ ...item })), configuracion: configuracionNotificacionPorDefecto() },
  norte: {
    plantillas: PLANTILLAS_BASE.filter((item) => item.canal === "email").map((item) => ({ ...item })),
    configuracion: configuracionNotificacionPorDefecto(),
  },
}

const VENTANAS: Record<string, VentanaProgramacion[]> = {
  centro: [
    { id: "ven-1", tipo: "pedido", dias: [1, 2, 3, 4, 5, 6], desde: "11:00", hasta: "21:30", maxPedidos: 40, activa: true },
    { id: "ven-2", tipo: "recogida", dias: [0, 1, 2, 3, 4, 5, 6], desde: "12:00", hasta: "22:00", maxPedidos: null, activa: true },
  ],
  norte: [
    { id: "ven-3", tipo: "pedido", dias: [1, 2, 3, 4, 5], desde: "12:00", hasta: "21:00", maxPedidos: 25, activa: true },
  ],
}

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                  */
/* -------------------------------------------------------------------------- */

const texto = (valor: unknown): string => String(valor ?? "").trim()

let secuencia = 0
const nuevoId = (prefijo: string) => `${prefijo}-${++secuencia}`

function validarMotivo(motivo: string | undefined): string {
  const limpio = texto(motivo)
  if (limpio.length < 3) {
    throw new ApiError(422, "El motivo es obligatorio (mínimo 3 caracteres)", "motivo_requerido")
  }
  return limpio
}

function sedeDe(ctx: { query: Record<string, unknown> }): string {
  const id = texto(ctx.query.sucursal) || texto(ctx.query.sede) || "centro"
  if (!SUCURSALES.some((sucursal) => sucursal.id === id)) {
    throw new ApiError(404, "La sucursal no existe o está fuera de tu alcance", "sucursal_no_encontrada")
  }
  return id
}

function buscarSucursal(id: string): Sucursal {
  const sucursal = SUCURSALES.find((item) => item.id === id)
  if (!sucursal) throw new ApiError(404, "La sucursal no existe", "sucursal_no_encontrada")
  return sucursal
}

/* -------------------------------------------------------------------------- */
/* Mocks                                                                       */
/* -------------------------------------------------------------------------- */

/** GET /admin/ajustes — datos de la sede activa + catálogo global de impuestos. */
registerMock("GET", /^\/admin\/ajustes$/, (ctx) => {
  const id = sedeDe(ctx)
  const respuesta: AjustesResp = { sucursal: buscarSucursal(id), impuestos: IMPUESTOS.map((item) => ({ ...item })) }
  return respuesta
})

/** PATCH /admin/ajustes — datos de la sede (zona horaria y moneda sensibles). */
registerMock("PATCH", /^\/admin\/ajustes$/, (ctx) => {
  const id = sedeDe(ctx)
  const body = (ctx.body ?? {}) as {
    sucursal?: Partial<Sucursal>
    impuestos?: Impuesto[]
    motivo?: string
    confirmarTurnoAbierto?: boolean
  }
  validarMotivo(body.motivo)
  const sucursal = buscarSucursal(id)
  const cambios = body.sucursal ?? {}
  const cambiaMoneda = cambios.moneda !== undefined && cambios.moneda !== sucursal.moneda
  if (cambiaMoneda && !body.confirmarTurnoAbierto) {
    throw new ApiError(
      409,
      "Hay turno abierto con pagos registrados: confirma el cambio de moneda para continuar",
      "turno_abierto",
    )
  }
  if (cambios.nombre !== undefined && texto(cambios.nombre).length < 3) {
    throw new ApiError(422, "El nombre de la sucursal es obligatorio", "nombre_requerido")
  }
  if (cambios.codigo !== undefined && texto(cambios.codigo).length < 3) {
    throw new ApiError(422, "El código es obligatorio", "codigo_requerido")
  }
  Object.assign(sucursal, cambios)
  if (body.impuestos) {
    IMPUESTOS = body.impuestos.map((item) => ({ ...item }))
  }
  const respuesta: AjustesResp = { sucursal, impuestos: IMPUESTOS.map((item) => ({ ...item })) }
  return respuesta
})

/** GET /admin/ajustes/horarios — rejilla semanal y cierres temporales. */
registerMock("GET", /^\/admin\/ajustes\/horarios$/, (ctx) => {
  const id = sedeDe(ctx)
  const respuesta: HorariosResp = {
    horarios: (HORARIOS[id] ?? []).map((item) => ({ ...item })),
    cierres: (CIERRES[id] ?? []).map((item) => ({ ...item })),
  }
  return respuesta
})

/** PUT /admin/ajustes/horarios — reemplaza la rejilla de atención. */
registerMock("PUT", /^\/admin\/ajustes\/horarios$/, (ctx) => {
  const id = sedeDe(ctx)
  const body = (ctx.body ?? {}) as { horarios?: HorarioAtencion[]; motivo?: string }
  validarMotivo(body.motivo)
  const horarios = body.horarios ?? []
  for (const item of horarios) {
    if (!/^\d{2}:\d{2}$/.test(item.horaApertura) || !/^\d{2}:\d{2}$/.test(item.horaCierre)) {
      throw new ApiError(422, "Las horas deben usar el formato HH:MM", "hora_invalida")
    }
    if (item.horaCierre <= item.horaApertura) {
      throw new ApiError(422, "La hora de cierre debe ser posterior a la de apertura", "rango_invalido")
    }
  }
  HORARIOS[id] = horarios.map((item) => ({ ...item, id: item.id || nuevoId("h") }))
  const respuesta: HorariosResp = {
    horarios: HORARIOS[id].map((item) => ({ ...item })),
    cierres: (CIERRES[id] ?? []).map((item) => ({ ...item })),
  }
  return respuesta
})

/** POST /admin/ajustes/cierres — cierre temporal con motivo e impacto (supuesto). */
registerMock("POST", /^\/admin\/ajustes\/cierres$/, (ctx) => {
  const id = sedeDe(ctx)
  const body = (ctx.body ?? {}) as { desde?: string; hasta?: string; motivo?: string }
  validarMotivo(body.motivo)
  const desde = texto(body.desde)
  const hasta = texto(body.hasta)
  if (!desde || !hasta) throw new ApiError(422, "Indica el rango del cierre", "rango_requerido")
  if (new Date(hasta) <= new Date(desde)) {
    throw new ApiError(422, "El fin del cierre debe ser posterior al inicio", "rango_invalido")
  }
  const horas = (new Date(hasta).getTime() - new Date(desde).getTime()) / 3_600_000
  const cierre: CierreTemporal = {
    id: nuevoId("cierre"),
    desde,
    hasta,
    motivo: texto(body.motivo),
    reservasAfectadas: Math.max(0, Math.round(horas / 2)),
  }
  ;(CIERRES[id] ??= []).push(cierre)
  return cierre
})

/** DELETE /admin/ajustes/cierres/:id — elimina un cierre programado. */
registerMock("DELETE", /^\/admin\/ajustes\/cierres\/([^/]+)$/, (ctx) => {
  const id = sedeDe(ctx)
  const cierreId = ctx.path.match(/^\/admin\/ajustes\/cierres\/([^/]+)$/)?.[1] ?? ""
  validarMotivo(texto(ctx.query.motivo))
  const lista = CIERRES[id] ?? []
  const indice = lista.findIndex((item) => item.id === cierreId)
  if (indice < 0) throw new ApiError(404, "El cierre no existe", "cierre_no_encontrado")
  const [eliminado] = lista.splice(indice, 1)
  return eliminado
})

/** GET /admin/ajustes/parametros — parámetros de operación (RF-R5-161). */
registerMock("GET", /^\/admin\/ajustes\/parametros$/, (ctx) => {
  const id = sedeDe(ctx)
  const respuesta: ParametrosResp = { configuracion: { ...CONFIGURACION[id] } }
  return respuesta
})

/** PUT /admin/ajustes/parametros — guarda con validaciones de rango. */
registerMock("PUT", /^\/admin\/ajustes\/parametros$/, (ctx) => {
  const id = sedeDe(ctx)
  const body = (ctx.body ?? {}) as { configuracion?: ConfiguracionSucursal; motivo?: string }
  validarMotivo(body.motivo)
  const configuracion = body.configuracion
  if (!configuracion) throw new ApiError(422, "Faltan los parámetros", "parametros_requeridos")
  if (configuracion.propinaSugeridaPct < 0 || configuracion.propinaSugeridaPct > 30) {
    throw new ApiError(422, "La propina sugerida debe estar entre 0 % y 30 %", "propina_invalida")
  }
  if (configuracion.copiasComanda < 1 || configuracion.copiasFactura < 1) {
    throw new ApiError(422, "Debe imprimirse al menos una copia", "copias_invalidas")
  }
  for (const limite of configuracion.limitesFranja) {
    if (limite.maximoPedidos < 1) {
      throw new ApiError(422, "El límite por franja debe ser mayor que cero", "limite_invalido")
    }
  }
  CONFIGURACION[id] = {
    ...configuracion,
    limitesFranja: configuracion.limitesFranja.map((item) => ({ ...item })),
  }
  const respuesta: ParametrosResp = { configuracion: { ...CONFIGURACION[id] } }
  return respuesta
})

/** GET /admin/ajustes/notificaciones — plantillas y configuración evento × canal (V1). */
registerMock("GET", /^\/admin\/ajustes\/notificaciones$/, (ctx) => {
  const id = sedeDe(ctx)
  const datos = NOTIFICACIONES[id] ?? { plantillas: [], configuracion: configuracionNotificacionPorDefecto() }
  const respuesta: NotificacionesResp = {
    plantillas: datos.plantillas.map((item) => ({ ...item })),
    configuracion: datos.configuracion.map((item) => ({ ...item })),
  }
  return respuesta
})

/** PUT /admin/ajustes/notificaciones — valida que no se activen canales sin plantilla. */
registerMock("PUT", /^\/admin\/ajustes\/notificaciones$/, (ctx) => {
  const id = sedeDe(ctx)
  const body = (ctx.body ?? {}) as Partial<NotificacionesResp> & { motivo?: string }
  validarMotivo(body.motivo)
  const plantillas = body.plantillas ?? []
  const configuracion = body.configuracion ?? []
  for (const item of configuracion) {
    if (item.activo && !plantillas.some((plantilla) => plantilla.id === item.plantillaId)) {
      throw new ApiError(
        422,
        `No se puede activar ${item.evento} · ${item.canal} sin una plantilla válida`,
        "plantilla_requerida",
      )
    }
  }
  NOTIFICACIONES[id] = {
    plantillas: plantillas.map((item) => ({ ...item })),
    configuracion: configuracion.map((item) => ({ ...item })),
  }
  const respuesta: NotificacionesResp = {
    plantillas: NOTIFICACIONES[id].plantillas.map((item) => ({ ...item })),
    configuracion: NOTIFICACIONES[id].configuracion.map((item) => ({ ...item })),
  }
  return respuesta
})

/** GET /admin/ajustes/ventanas — ventanas de programación de pedidos y recogida (V1). */
registerMock("GET", /^\/admin\/ajustes\/ventanas$/, (ctx) => {
  const id = sedeDe(ctx)
  return (VENTANAS[id] ?? []).map((item) => ({ ...item, dias: [...item.dias] }))
})

/** PUT /admin/ajustes/ventanas — reemplaza las ventanas vigentes. */
registerMock("PUT", /^\/admin\/ajustes\/ventanas$/, (ctx) => {
  const id = sedeDe(ctx)
  const body = (ctx.body ?? {}) as { ventanas?: VentanaProgramacion[]; motivo?: string }
  validarMotivo(body.motivo)
  const ventanas = body.ventanas ?? []
  for (const ventana of ventanas) {
    if (!/^\d{2}:\d{2}$/.test(ventana.desde) || !/^\d{2}:\d{2}$/.test(ventana.hasta)) {
      throw new ApiError(422, "Las ventanas usan horas HH:MM", "hora_invalida")
    }
    if (ventana.hasta <= ventana.desde) {
      throw new ApiError(422, "La ventana debe cerrar después de abrir", "rango_invalido")
    }
  }
  VENTANAS[id] = ventanas.map((item) => ({ ...item, dias: [...item.dias] }))
  return VENTANAS[id].map((item) => ({ ...item, dias: [...item.dias] }))
})

/** GET /admin/sucursales — sedes visibles según alcance. */
registerMock("GET", /^\/admin\/sucursales$/, () => {
  const respuesta: SucursalesResp = { data: SUCURSALES.map((item) => ({ ...item })) }
  return respuesta
})

/** POST /admin/sucursales (V1) — alta con clonado de configuración. */
registerMock("POST", /^\/admin\/sucursales$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<CrearSucursalPayload>
  const motivo = validarMotivo(body.motivo)
  const nombre = texto(body.nombre)
  const codigo = texto(body.codigo)
  if (nombre.length < 3) throw new ApiError(422, "El nombre de la sede es obligatorio", "nombre_requerido")
  if (codigo.length < 3) throw new ApiError(422, "El código es obligatorio", "codigo_requerido")
  if (SUCURSALES.some((sucursal) => sucursal.codigo.toLowerCase() === codigo.toLowerCase())) {
    throw new ApiError(409, "Ya existe una sede con ese código", "codigo_duplicado")
  }
  const base = body.clonarDe ? buscarSucursal(body.clonarDe) : null
  const nueva: Sucursal = {
    id: nuevoId("sede"),
    nombre,
    codigo,
    direccion: texto(body.direccion),
    ciudad: texto(body.ciudad) || base?.ciudad || "",
    telefono: texto(body.telefono),
    coordenadas: "",
    zonaHoraria: texto(body.zonaHoraria) || base?.zonaHoraria || "America/Mexico_City",
    moneda: texto(body.moneda) || base?.moneda || "MXN",
    activa: true,
  }
  SUCURSALES.push(nueva)
  const copiar = body.copiar ?? { configuracion: true, horarios: true, mediosPago: false, capacidad: true }
  CONFIGURACION[nueva.id] = base
    ? {
        ...CONFIGURACION[base.id],
        limitesFranja: copiar.capacidad
          ? CONFIGURACION[base.id].limitesFranja.map((item) => ({ ...item }))
          : CONFIGURACION[nueva.id]?.limitesFranja ?? [],
      }
    : {
        propinaSugeridaPct: 10,
        copiasComanda: 1,
        copiasFactura: 1,
        borradoComandaImpresa: false,
        comportamientoOffline: "completo",
        ventanaProgramacionMin: 120,
        limitesFranja: [],
      }
  HORARIOS[nueva.id] =
    base && copiar.horarios ? HORARIOS[base.id].map((item) => ({ ...item, id: nuevoId("h") })) : []
  CIERRES[nueva.id] = []
  NOTIFICACIONES[nueva.id] = {
    plantillas: base ? NOTIFICACIONES[base.id].plantillas.map((item) => ({ ...item, id: nuevoId("pl") })) : [],
    configuracion: base
      ? NOTIFICACIONES[base.id].configuracion.map((item) => ({ ...item }))
      : configuracionNotificacionPorDefecto(),
  }
  VENTANAS[nueva.id] = base && copiar.configuracion ? VENTANAS[base.id].map((item) => ({ ...item, id: nuevoId("ven") })) : []
  return { sucursal: nueva, motivo }
})

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function useAjustes(habilitado: boolean) {
  return useQuery({
    queryKey: ["ajustes", "datos"],
    queryFn: () => api.get<AjustesResp>("/admin/ajustes"),
    enabled: habilitado,
  })
}

export function useActualizarAjustes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { sucursal: Partial<Sucursal>; impuestos?: Impuesto[]; motivo: string; confirmarTurnoAbierto?: boolean }) =>
      api.patch<AjustesResp>("/admin/ajustes", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ajustes"] })
      void queryClient.invalidateQueries({ queryKey: ["sucursales"] })
    },
  })
}

export function useHorarios(habilitado: boolean) {
  return useQuery({
    queryKey: ["ajustes", "horarios"],
    queryFn: () => api.get<HorariosResp>("/admin/ajustes/horarios"),
    enabled: habilitado,
  })
}

export function useGuardarHorarios() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { horarios: HorarioAtencion[]; motivo: string }) =>
      api.put<HorariosResp>("/admin/ajustes/horarios", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ajustes"] })
    },
  })
}

export function useCrearCierre() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { desde: string; hasta: string; motivo: string }) =>
      api.post<CierreTemporal>("/admin/ajustes/cierres", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ajustes"] })
    },
  })
}

export function useEliminarCierre() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      api.delete<CierreTemporal>(`/admin/ajustes/cierres/${id}`, { motivo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ajustes"] })
    },
  })
}

export function useParametros(habilitado: boolean) {
  return useQuery({
    queryKey: ["ajustes", "parametros"],
    queryFn: () => api.get<ParametrosResp>("/admin/ajustes/parametros"),
    enabled: habilitado,
  })
}

export function useGuardarParametros() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { configuracion: ConfiguracionSucursal; motivo: string }) =>
      api.put<ParametrosResp>("/admin/ajustes/parametros", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ajustes"] })
    },
  })
}

export function useNotificaciones(habilitado: boolean) {
  return useQuery({
    queryKey: ["ajustes", "notificaciones"],
    queryFn: () => api.get<NotificacionesResp>("/admin/ajustes/notificaciones"),
    enabled: habilitado,
  })
}

export function useGuardarNotificaciones() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: NotificacionesResp & { motivo: string }) =>
      api.put<NotificacionesResp>("/admin/ajustes/notificaciones", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ajustes"] })
    },
  })
}

export function useVentanas(habilitado: boolean) {
  return useQuery({
    queryKey: ["ajustes", "ventanas"],
    queryFn: () => api.get<VentanaProgramacion[]>("/admin/ajustes/ventanas"),
    enabled: habilitado,
  })
}

export function useGuardarVentanas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { ventanas: VentanaProgramacion[]; motivo: string }) =>
      api.put<VentanaProgramacion[]>("/admin/ajustes/ventanas", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ajustes"] })
    },
  })
}

export function useSucursales() {
  return useQuery({
    queryKey: ["sucursales", "lista"],
    queryFn: () => api.get<SucursalesResp>("/admin/sucursales"),
  })
}

export function useCrearSucursal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CrearSucursalPayload) =>
      api.post<{ sucursal: Sucursal; motivo: string }>("/admin/sucursales", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sucursales"] })
    },
  })
}
