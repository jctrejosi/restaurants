import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, ApiError, registerMock, type Query } from "@/lib/api"
import {
  MESA_ESTADO_LABEL,
  type AforoFranjaPayload,
  type AforoZonaFranja,
  type AsignacionMesero,
  type ExportacionSalon,
  type FranjaAforo,
  type FueraServicioPayload,
  type MapaCambio,
  type Mesa,
  type MesaEdicionPayload,
  type MesaEstado,
  type MesaEstadoPayload,
  type MesaForma,
  type MesaPayload,
  type SalonMapa,
  type UnionMesa,
  type UnionPayload,
  type Zona,
  type ZonaEdicionPayload,
  type ZonaPayload,
} from "@/modules/salon/types"

/* -------------------------------------------------------------------------- */
/* Mock de desarrollo                                                          */
/* Se retira cuando el backend NestJS exponga `/admin/salon/*`.               */
/* -------------------------------------------------------------------------- */

const SEDES: Record<string, { id: string; nombre: string }> = {
  centro: { id: "centro", nombre: "Punto C · Centro" },
  norte: { id: "norte", nombre: "Punto C · Norte" },
}

type ZonaCfg = {
  clave: string
  nombre: string
  aforo: number
  x: number
  y: number
  ancho: number
  alto: number
}

const ZONAS_CFG: Record<string, ZonaCfg[]> = {
  centro: [
    { clave: "salon", nombre: "Salón principal", aforo: 40, x: 0, y: 0, ancho: 12, alto: 7 },
    { clave: "terraza", nombre: "Terraza", aforo: 32, x: 12, y: 0, ancho: 10, alto: 7 },
    { clave: "barra", nombre: "Barra", aforo: 12, x: 0, y: 7, ancho: 8, alto: 5 },
    { clave: "privado", nombre: "Privado", aforo: 18, x: 8, y: 7, ancho: 14, alto: 5 },
  ],
  norte: [
    { clave: "salon", nombre: "Salón principal", aforo: 28, x: 0, y: 0, ancho: 10, alto: 6 },
    { clave: "terraza", nombre: "Terraza", aforo: 20, x: 10, y: 0, ancho: 8, alto: 6 },
    { clave: "barra", nombre: "Barra", aforo: 8, x: 0, y: 6, ancho: 8, alto: 4 },
    { clave: "privado", nombre: "Privado", aforo: 14, x: 8, y: 6, ancho: 10, alto: 4 },
  ],
}

type MesaCfg = {
  numero: string
  zona: string
  capacidad: number
  posX: number
  posY: number
  estado: MesaEstado
  forma: MesaForma
  sesion?: boolean
  reservas?: number
  desdeHaceMin?: number
  por?: string
}

const MESAS_CFG: Record<string, MesaCfg[]> = {
  centro: [
    { numero: "01", zona: "salon", capacidad: 2, posX: 1.5, posY: 1.5, estado: "ocupada", forma: "redonda", sesion: true, desdeHaceMin: 40, por: "Laura Pérez" },
    { numero: "02", zona: "salon", capacidad: 2, posX: 4.5, posY: 1.5, estado: "reservada", forma: "redonda", reservas: 1, desdeHaceMin: 90, por: "María Gómez" },
    { numero: "03", zona: "salon", capacidad: 4, posX: 7.5, posY: 1.5, estado: "reservada", forma: "cuadrada", reservas: 1, desdeHaceMin: 120, por: "María Gómez" },
    { numero: "04", zona: "salon", capacidad: 4, posX: 10, posY: 1.5, estado: "libre", forma: "cuadrada" },
    { numero: "05", zona: "salon", capacidad: 6, posX: 2, posY: 4.5, estado: "reservada", forma: "cuadrada", reservas: 1, desdeHaceMin: 60, por: "María Gómez" },
    { numero: "06", zona: "salon", capacidad: 2, posX: 5.5, posY: 4.5, estado: "libre", forma: "redonda" },
    { numero: "07", zona: "terraza", capacidad: 4, posX: 14, posY: 2, estado: "reservada", forma: "cuadrada", reservas: 1, desdeHaceMin: 150, por: "María Gómez" },
    { numero: "08", zona: "terraza", capacidad: 4, posX: 17, posY: 2, estado: "libre", forma: "cuadrada" },
    { numero: "09", zona: "terraza", capacidad: 2, posX: 20, posY: 2, estado: "fuera_servicio", forma: "redonda", desdeHaceMin: 600, por: "Diego Ramírez" },
    { numero: "10", zona: "terraza", capacidad: 6, posX: 15, posY: 5, estado: "reservada", forma: "cuadrada", reservas: 1, desdeHaceMin: 200, por: "María Gómez" },
    { numero: "11", zona: "barra", capacidad: 2, posX: 1.5, posY: 8.5, estado: "ocupada", forma: "redonda", sesion: true, desdeHaceMin: 25, por: "Laura Pérez" },
    { numero: "12", zona: "barra", capacidad: 3, posX: 4.5, posY: 8.5, estado: "por_cobrar", forma: "redonda", desdeHaceMin: 10, por: "Laura Pérez" },
    { numero: "13", zona: "privado", capacidad: 8, posX: 11, posY: 8.5, estado: "reservada", forma: "cuadrada", reservas: 1, desdeHaceMin: 300, por: "María Gómez" },
    { numero: "14", zona: "privado", capacidad: 10, posX: 17, posY: 8.5, estado: "libre", forma: "cuadrada" },
  ],
  norte: [
    { numero: "01", zona: "salon", capacidad: 2, posX: 1.5, posY: 1.5, estado: "ocupada", forma: "redonda", sesion: true, desdeHaceMin: 35, por: "Carlos Méndez" },
    { numero: "02", zona: "salon", capacidad: 4, posX: 4.5, posY: 1.5, estado: "libre", forma: "cuadrada" },
    { numero: "03", zona: "salon", capacidad: 4, posX: 7.5, posY: 1.5, estado: "reservada", forma: "cuadrada", reservas: 1, desdeHaceMin: 80, por: "María Gómez" },
    { numero: "04", zona: "salon", capacidad: 6, posX: 2, posY: 4, estado: "libre", forma: "cuadrada" },
    { numero: "05", zona: "terraza", capacidad: 4, posX: 12, posY: 2, estado: "libre", forma: "cuadrada" },
    { numero: "06", zona: "terraza", capacidad: 2, posX: 15, posY: 2, estado: "libre", forma: "redonda" },
    { numero: "07", zona: "barra", capacidad: 3, posX: 2, posY: 7.5, estado: "libre", forma: "redonda" },
    { numero: "08", zona: "privado", capacidad: 8, posX: 11, posY: 7.5, estado: "libre", forma: "cuadrada" },
  ],
}

const FRANJAS: FranjaAforo[] = [
  { id: "f-comida", nombre: "Comida", desdeHora: "13:00", hastaHora: "16:00" },
  { id: "f-cena", nombre: "Cena", desdeHora: "19:00", hastaHora: "22:30" },
]

function claveDeZona(zonaId: string): string {
  return zonaId.split("-").slice(1).join("-")
}

/* -------------------------------------------------------------------------- */
/* Estado del mock                                                             */
/* -------------------------------------------------------------------------- */

const ZONAS: Record<string, Zona[]> = {}
const MESAS: Record<string, Mesa[]> = {}

for (const [sedeId, configuraciones] of Object.entries(ZONAS_CFG)) {
  ZONAS[sedeId] = configuraciones.map((cfg, indice) => ({
    id: `${sedeId[0]}z-${cfg.clave}`,
    sedeId,
    nombre: cfg.nombre,
    aforo: cfg.aforo,
    orden: indice + 1,
    x: cfg.x,
    y: cfg.y,
    ancho: cfg.ancho,
    alto: cfg.alto,
  }))
}

let consecutivoMesa = 100

for (const [sedeId, configuraciones] of Object.entries(MESAS_CFG)) {
  MESAS[sedeId] = configuraciones.map((cfg) => {
    const zona = ZONAS[sedeId].find((item) => item.id.endsWith(`-${cfg.zona}`))
    return {
      id: `${sedeId[0]}m-${cfg.numero}`,
      zonaId: zona?.id ?? `${sedeId[0]}z-${cfg.zona}`,
      numero: cfg.numero,
      capacidad: cfg.capacidad,
      estado: cfg.estado,
      forma: cfg.forma,
      posX: cfg.posX,
      posY: cfg.posY,
      activa: true,
      desde: cfg.desdeHaceMin != null ? new Date(Date.now() - cfg.desdeHaceMin * 60_000).toISOString() : undefined,
      por: cfg.por,
      sesionAbierta: cfg.sesion === true,
      reservasFuturas: cfg.reservas ?? 0,
    }
  })
  consecutivoMesa += configuraciones.length
}

const UNIONES: Record<string, UnionMesa[]> = {
  centro: [
    {
      id: "un-1",
      zonaId: "cz-salon",
      mesaIds: ["cm-03", "cm-04"],
      nombre: "Mesa 03 + Mesa 04",
      creadaEn: new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString(),
      creadaPor: "María Gómez",
    },
  ],
  norte: [],
}

const AFOROS: AforoZonaFranja[] = [
  { zonaId: "cz-salon", franjaId: "f-comida", aforo: 30, reservas: 18 },
  { zonaId: "cz-salon", franjaId: "f-cena", aforo: 30, reservas: 26 },
  { zonaId: "cz-terraza", franjaId: "f-comida", aforo: 24, reservas: 12 },
  { zonaId: "cz-terraza", franjaId: "f-cena", aforo: 24, reservas: 20 },
  { zonaId: "cz-barra", franjaId: "f-comida", aforo: 8, reservas: 4 },
  { zonaId: "cz-barra", franjaId: "f-cena", aforo: 8, reservas: 7 },
  { zonaId: "cz-privado", franjaId: "f-comida", aforo: 12, reservas: 8 },
  { zonaId: "cz-privado", franjaId: "f-cena", aforo: 12, reservas: 11 },
  { zonaId: "nz-salon", franjaId: "f-comida", aforo: 20, reservas: 9 },
  { zonaId: "nz-salon", franjaId: "f-cena", aforo: 20, reservas: 14 },
  { zonaId: "nz-terraza", franjaId: "f-comida", aforo: 16, reservas: 5 },
  { zonaId: "nz-terraza", franjaId: "f-cena", aforo: 16, reservas: 9 },
  { zonaId: "nz-barra", franjaId: "f-comida", aforo: 6, reservas: 2 },
  { zonaId: "nz-barra", franjaId: "f-cena", aforo: 6, reservas: 5 },
  { zonaId: "nz-privado", franjaId: "f-comida", aforo: 10, reservas: 4 },
  { zonaId: "nz-privado", franjaId: "f-cena", aforo: 10, reservas: 7 },
]

const ASIGNACIONES: AsignacionMesero[] = [
  {
    id: "as-1",
    usuario: "Laura Pérez",
    zonaId: "cz-salon",
    desde: new Date(new Date().setHours(11, 0, 0, 0)).toISOString(),
    hasta: new Date(new Date().setHours(17, 0, 0, 0)).toISOString(),
  },
  {
    id: "as-2",
    usuario: "Carlos Méndez",
    zonaId: "cz-terraza",
    desde: new Date(new Date().setHours(13, 0, 0, 0)).toISOString(),
    hasta: new Date(new Date().setHours(19, 0, 0, 0)).toISOString(),
  },
]

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function mapaDe(sedeId: string): SalonMapa {
  return {
    sedeId,
    sedeNombre: SEDES[sedeId]?.nombre ?? SEDES.centro.nombre,
    zonas: [...(ZONAS[sedeId] ?? [])].sort((a, b) => a.orden - b.orden),
    mesas: [...(MESAS[sedeId] ?? [])],
    uniones: [...(UNIONES[sedeId] ?? [])],
    franjas: FRANJAS,
    aforos: AFOROS.filter((aforo) => aforo.zonaId.startsWith(sedeId[0])),
    asignaciones: ASIGNACIONES.filter((asignacion) => asignacion.zonaId?.startsWith(sedeId[0])),
    actualizadoEn: new Date().toISOString(),
  }
}

function buscarZona(id: string): { sedeId: string; zona: Zona } {
  for (const [sedeId, zonas] of Object.entries(ZONAS)) {
    const zona = zonas.find((item) => item.id === id)
    if (zona) return { sedeId, zona }
  }
  throw new ApiError(404, "La zona no existe.", "zona_no_encontrada")
}

function buscarMesa(id: string): { sedeId: string; mesa: Mesa } {
  for (const [sedeId, mesas] of Object.entries(MESAS)) {
    const mesa = mesas.find((item) => item.id === id)
    if (mesa) return { sedeId, mesa }
  }
  throw new ApiError(404, "La mesa no existe.", "mesa_no_encontrada")
}

function zonaValida(sedeId: string, zonaId: string): Zona {
  const zona = (ZONAS[sedeId] ?? []).find((item) => item.id === zonaId)
  if (!zona) throw new ApiError(422, "La zona indicada no existe en la sede.", "zona_invalida")
  return zona
}

function dentroDeZona(zona: Zona, posX: number, posY: number): boolean {
  return posX >= zona.x && posX <= zona.x + zona.ancho - 1 && posY >= zona.y && posY <= zona.y + zona.alto - 1
}

function zonasSolapadas(sedeId: string, zona: Pick<Zona, "x" | "y" | "ancho" | "alto">, excluirId?: string): Zona | undefined {
  return (ZONAS[sedeId] ?? []).find(
    (otra) =>
      otra.id !== excluirId &&
      zona.x < otra.x + otra.ancho &&
      otra.x < zona.x + zona.ancho &&
      zona.y < otra.y + otra.alto &&
      otra.y < zona.y + zona.alto,
  )
}

function validarZona(sedeId: string, datos: Partial<ZonaPayload & ZonaEdicionPayload>, excluirId?: string): void {
  const nombre = datos.nombre?.trim()
  if (nombre != null && nombre.length < 3) throw new ApiError(422, "El nombre de la zona es obligatorio.", "nombre_requerido")
  if (datos.aforo != null && datos.aforo < 1) throw new ApiError(422, "El aforo debe ser mayor a cero.", "aforo_invalido")
  if (datos.ancho != null && datos.ancho < 3) throw new ApiError(422, "El ancho mínimo de una zona es de 3 celdas.", "ancho_invalido")
  if (datos.alto != null && datos.alto < 3) throw new ApiError(422, "El alto mínimo de una zona es de 3 celdas.", "alto_invalido")
  if ((datos.x ?? 0) < 0 || (datos.y ?? 0) < 0) throw new ApiError(422, "Las coordenadas no pueden ser negativas.", "coordenadas_invalidas")

  if (nombre) {
    const duplicada = (ZONAS[sedeId] ?? []).find((zona) => zona.nombre.toLowerCase() === nombre.toLowerCase() && zona.id !== excluirId)
    if (duplicada) throw new ApiError(409, `Ya existe la zona «${duplicada.nombre}» en la sede.`, "zona_duplicada")
  }

  const actual = excluirId ? (ZONAS[sedeId] ?? []).find((zona) => zona.id === excluirId) : undefined
  const rect = {
    x: datos.x ?? actual?.x ?? 0,
    y: datos.y ?? actual?.y ?? 0,
    ancho: datos.ancho ?? actual?.ancho ?? 0,
    alto: datos.alto ?? actual?.alto ?? 0,
  }
  const solapada = zonasSolapadas(sedeId, rect, excluirId)
  if (solapada) throw new ApiError(409, `La zona se solapa con «${solapada.nombre}». Ajusta su posición o tamaño.`, "zona_solapada")
}

function validarMesa(sedeId: string, datos: Partial<MesaPayload & MesaEdicionPayload>, excluirId?: string): void {
  const numero = datos.numero?.trim()
  if (numero != null && numero.length === 0) throw new ApiError(422, "El número de mesa es obligatorio.", "numero_requerido")
  if (datos.capacidad != null && (datos.capacidad < 1 || datos.capacidad > 20)) {
    throw new ApiError(422, "La capacidad debe estar entre 1 y 20 personas.", "capacidad_invalida")
  }
  if (numero) {
    const duplicada = (MESAS[sedeId] ?? []).find((mesa) => mesa.numero.toLowerCase() === numero.toLowerCase() && mesa.id !== excluirId)
    if (duplicada) throw new ApiError(409, `Ya existe la mesa ${duplicada.numero} en la sede (uq_mesa).`, "mesa_duplicada")
  }
}

function nombreUniones(mesaIds: string[]): string[] {
  const numeros = mesaIds.map((id) => buscarMesa(id).mesa.numero)
  return numeros.map((numero) => `Mesa ${numero}`)
}

/* -------------------------------------------------------------------------- */
/* Mocks registrados                                                           */
/* -------------------------------------------------------------------------- */

registerMock("GET", /^\/admin\/salon$/, (ctx) => {
  const q = ctx.query
  const sedeId = typeof q.sedeId === "string" && q.sedeId ? q.sedeId : typeof q.sucursal === "string" && q.sucursal ? q.sucursal : "centro"
  return mapaDe(SEDES[sedeId] ? sedeId : "centro")
})

registerMock("POST", /^\/admin\/zonas$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<ZonaPayload>
  const sedeId = body.sedeId && SEDES[body.sedeId] ? body.sedeId : ""
  if (!sedeId) throw new ApiError(422, "Selecciona una sede válida.", "sede_invalida")
  validarZona(sedeId, body)
  const zona: Zona = {
    id: `z-${sedeId}-${(ZONAS[sedeId]?.length ?? 0) + 1}-${Date.now().toString(36)}`,
    sedeId,
    nombre: (body.nombre ?? "").trim(),
    aforo: Number(body.aforo ?? 0),
    orden: body.orden ?? (ZONAS[sedeId]?.length ?? 0) + 1,
    x: Number(body.x ?? 0),
    y: Number(body.y ?? 0),
    ancho: Number(body.ancho ?? 4),
    alto: Number(body.alto ?? 4),
  }
  ZONAS[sedeId] = [...(ZONAS[sedeId] ?? []), zona]
  FRANJAS.forEach((franja) => AFOROS.push({ zonaId: zona.id, franjaId: franja.id, aforo: zona.aforo, reservas: 0 }))
  return zona
})

registerMock("PATCH", /^\/admin\/zonas\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const { sedeId, zona } = buscarZona(id)
  const body = (ctx.body ?? {}) as Partial<ZonaEdicionPayload>
  const motivo = body.motivo?.trim() ?? ""
  if (motivo.length < 3) throw new ApiError(422, "El motivo del cambio es obligatorio.", "motivo_requerido")
  validarZona(sedeId, body, id)
  Object.assign(zona, {
    nombre: body.nombre?.trim() ?? zona.nombre,
    aforo: body.aforo ?? zona.aforo,
    orden: body.orden ?? zona.orden,
    x: body.x ?? zona.x,
    y: body.y ?? zona.y,
    ancho: body.ancho ?? zona.ancho,
    alto: body.alto ?? zona.alto,
  })
  const mesas = MESAS[sedeId] ?? []
  const fuera = mesas.filter((mesa) => mesa.zonaId === id && !dentroDeZona(zona, mesa.posX, mesa.posY))
  if (fuera.length > 0) {
    throw new ApiError(
      409,
      `La zona reducida dejaría ${fuera.length} mesa(s) fuera del área (${fuera.map((mesa) => `Mesa ${mesa.numero}`).join(", ")}).`,
      "mesas_fuera_de_zona",
    )
  }
  return zona
})

registerMock("POST", /^\/admin\/mesas$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<MesaPayload>
  const zonaId = body.zonaId ?? ""
  if (!zonaId) throw new ApiError(422, "Selecciona la zona de la mesa.", "zona_requerida")
  const { sedeId } = buscarZona(zonaId)
  validarMesa(sedeId, body)
  const zona = zonaValida(sedeId, zonaId)
  const posX = Number(body.posX ?? zona.x)
  const posY = Number(body.posY ?? zona.y)
  if (!dentroDeZona(zona, posX, posY)) {
    throw new ApiError(422, "La mesa debe quedar dentro de su zona.", "mesa_fuera_de_zona")
  }
  consecutivoMesa += 1
  const mesa: Mesa = {
    id: `${sedeId[0]}m-n${consecutivoMesa}`,
    zonaId,
    numero: (body.numero ?? "").trim(),
    capacidad: Number(body.capacidad ?? 2),
    estado: "libre",
    forma: body.forma ?? "cuadrada",
    posX,
    posY,
    activa: body.activa ?? true,
    sesionAbierta: false,
    reservasFuturas: 0,
    desde: new Date().toISOString(),
    por: "María Gómez",
  }
  MESAS[sedeId] = [...(MESAS[sedeId] ?? []), mesa]
  return mesa
})

registerMock("POST", /^\/admin\/mesas\/unir$/, (ctx) => {
  const body = (ctx.body ?? {}) as Partial<UnionPayload>
  const mesaIds = Array.from(new Set(body.mesaIds ?? []))
  if (mesaIds.length < 2) throw new ApiError(422, "Selecciona al menos dos mesas para unir.", "mesas_insuficientes")
  const mesas = mesaIds.map((id) => buscarMesa(id))
  const sedeId = mesas[0].sedeId
  if (mesas.some((item) => item.sedeId !== sedeId)) {
    throw new ApiError(422, "Todas las mesas deben pertenecer a la misma sede.", "sedes_distintas")
  }
  const zonaId = mesas[0].mesa.zonaId
  if (mesas.some((item) => item.mesa.zonaId !== zonaId)) {
    throw new ApiError(422, "Solo se pueden unir mesas de la misma zona.", "zonas_distintas")
  }
  const unionExistente = (UNIONES[sedeId] ?? []).find((union) => union.mesaIds.some((id) => mesaIds.includes(id)))
  if (unionExistente) {
    const repetidas = unionExistente.mesaIds.filter((id) => mesaIds.includes(id)).map((id) => `Mesa ${buscarMesa(id).mesa.numero}`)
    throw new ApiError(409, `${repetidas.join(", ")} ya pertenece(n) a la unión «${unionExistente.nombre}».`, "mesa_ya_unida")
  }
  const union: UnionMesa = {
    id: `un-${Date.now().toString(36)}`,
    zonaId,
    mesaIds,
    nombre: body.nombre?.trim() || nombreUniones(mesaIds).join(" + "),
    creadaEn: new Date().toISOString(),
    creadaPor: "María Gómez",
  }
  UNIONES[sedeId] = [...(UNIONES[sedeId] ?? []), union]
  return union
})

registerMock("POST", /^\/admin\/mesas\/([^/]+)\/estado$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const { sedeId, mesa } = buscarMesa(id)
  const body = (ctx.body ?? {}) as Partial<MesaEstadoPayload>
  const motivo = body.motivo?.trim() ?? ""
  if (motivo.length < 3) throw new ApiError(422, "El motivo del cambio de estado es obligatorio (RN-R5-01).", "motivo_requerido")
  if (!mesa.activa) throw new ApiError(422, "La mesa está dada de baja; reactívala antes de operarla.", "mesa_inactiva")
  const estado = body.estado as MesaEstado | undefined
  if (!estado || !["libre", "ocupada", "por_cobrar", "reservada"].includes(estado)) {
    throw new ApiError(422, "Estado de mesa no válido.", "estado_invalido")
  }
  if (mesa.estado === "fuera_servicio" && estado !== "libre") {
    throw new ApiError(422, "La mesa está fuera de servicio; reactívala antes de cambiar su estado operativo.", "mesa_fuera_servicio")
  }
  mesa.estado = estado
  mesa.desde = new Date().toISOString()
  mesa.por = "María Gómez"
  void sedeId
  return mesa
})

registerMock("POST", /^\/admin\/mesas\/([^/]+)\/fuera-servicio$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const { mesa } = buscarMesa(id)
  const body = (ctx.body ?? {}) as Partial<FueraServicioPayload>
  const motivo = body.motivo?.trim() ?? ""
  if (motivo.length < 3) throw new ApiError(422, "El motivo del bloqueo por mantenimiento es obligatorio (RN-R5-01).", "motivo_requerido")
  if (mesa.sesionAbierta) {
    throw new ApiError(409, "La mesa tiene una sesión abierta por el APK; ciérrala antes de bloquearla.", "sesion_abierta")
  }
  if (mesa.reservasFuturas > 0 && !body.confirmar) {
    throw new ApiError(
      409,
      `La mesa tiene ${mesa.reservasFuturas} reserva(s) futura(s); confirma el bloqueo para continuar.`,
      "reservas_futuras",
    )
  }
  mesa.estado = "fuera_servicio"
  mesa.desde = new Date().toISOString()
  mesa.por = "María Gómez"
  return mesa
})

registerMock("POST", /^\/admin\/mesas\/([^/]+)\/dividir$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  for (const [sedeId, uniones] of Object.entries(UNIONES)) {
    const indice = uniones.findIndex((union) => union.id === id || union.mesaIds.includes(id))
    if (indice >= 0) {
      const [union] = uniones.splice(indice, 1)
      void sedeId
      return { ok: true, id: union.id }
    }
  }
  throw new ApiError(404, "La mesa o unión indicada no pertenece a una configuración de mesas unidas.", "union_no_encontrada")
})

registerMock("PATCH", /^\/admin\/mesas\/([^/]+)$/, (ctx) => {
  const id = ctx.path.split("/")[3] ?? ""
  const { sedeId, mesa } = buscarMesa(id)
  const body = (ctx.body ?? {}) as Partial<MesaEdicionPayload> & { forzar?: boolean }
  validarMesa(sedeId, body, id)

  if (body.activa === false) {
    if (mesa.sesionAbierta) {
      throw new ApiError(409, "La mesa tiene una sesión abierta; ciérrala antes de darla de baja.", "sesion_abierta")
    }
    if (mesa.reservasFuturas > 0 && !body.forzar) {
      throw new ApiError(
        409,
        `La mesa tiene ${mesa.reservasFuturas} reserva(s) futura(s); confirma la baja para continuar.`,
        "reservas_futuras",
      )
    }
  }

  const zonaId = body.zonaId ?? mesa.zonaId
  const zona = zonaValida(sedeId, zonaId)
  const posX = body.posX ?? mesa.posX
  const posY = body.posY ?? mesa.posY
  if (!dentroDeZona(zona, posX, posY)) {
    throw new ApiError(422, "La mesa debe quedar dentro de su zona.", "mesa_fuera_de_zona")
  }

  mesa.zonaId = zonaId
  mesa.numero = body.numero?.trim() ?? mesa.numero
  mesa.capacidad = body.capacidad ?? mesa.capacidad
  mesa.posX = posX
  mesa.posY = posY
  mesa.forma = body.forma ?? mesa.forma
  if (body.activa != null) mesa.activa = body.activa
  mesa.desde = new Date().toISOString()
  mesa.por = "María Gómez"
  return mesa
})

registerMock("GET", /^\/admin\/salon\/zonas\/([^/]+)\/franjas$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  buscarZona(id)
  return AFOROS.filter((aforo) => aforo.zonaId === id)
})

registerMock("PUT", /^\/admin\/salon\/zonas\/([^/]+)\/franjas$/, (ctx) => {
  const id = ctx.path.split("/")[4] ?? ""
  buscarZona(id)
  const body = (ctx.body ?? {}) as { franjas?: AforoFranjaPayload[]; motivo?: string }
  const motivo = body.motivo?.trim() ?? ""
  if (motivo.length < 3) throw new ApiError(422, "El motivo del cambio de aforo es obligatorio.", "motivo_requerido")
  for (const cambio of body.franjas ?? []) {
    const fila = AFOROS.find((aforo) => aforo.zonaId === id && aforo.franjaId === cambio.franjaId)
    if (!fila) throw new ApiError(404, "La franja indicada no existe para la zona.", "franja_no_encontrada")
    if (cambio.aforo < fila.reservas) {
      const franja = FRANJAS.find((item) => item.id === cambio.franjaId)
      throw new ApiError(
        422,
        `El aforo de «${franja?.nombre ?? cambio.franjaId}» no puede ser menor a las ${fila.reservas} reservas ya comprometidas.`,
        "aforo_insuficiente",
      )
    }
    fila.aforo = cambio.aforo
  }
  return AFOROS.filter((aforo) => aforo.zonaId === id)
})

registerMock("POST", /^\/admin\/salon\/exportaciones$/, (ctx) => {
  const body = (ctx.body ?? {}) as { tipo?: ExportacionSalon["tipo"]; formato?: ExportacionSalon["formato"] }
  const exportacion: ExportacionSalon = {
    id: `exp-salon-${Date.now()}`,
    tipo: body.tipo ?? "plano",
    formato: body.formato ?? "pdf",
    estado: "en_proceso",
    creadoEn: new Date().toISOString(),
  }
  return exportacion
})

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

export function useSalonMapa(sedeId: string) {
  return useQuery({
    queryKey: ["salon", "mapa", sedeId],
    queryFn: () => api.get<SalonMapa>("/admin/salon", { sedeId }),
    enabled: Boolean(sedeId),
  })
}

export function useCrearZona() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ZonaPayload) => api.post<Zona>("/admin/zonas", payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["salon"] }),
  })
}

export function useEditarZona() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ZonaEdicionPayload) => api.patch<Zona>(`/admin/zonas/${payload.id}`, payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["salon"] }),
  })
}

export function useCrearMesa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: MesaPayload) => api.post<Mesa>("/admin/mesas", payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["salon"] }),
  })
}

export function useEditarMesa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: MesaEdicionPayload & { forzar?: boolean }) =>
      api.patch<Mesa>(`/admin/mesas/${payload.id}`, payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["salon"] }),
  })
}

/** Guardado por lote de posiciones (arrastre): un PATCH por mesa movida. */
export function useGuardarMapa(sedeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (cambios: MapaCambio[]) => {
      return Promise.all(cambios.map((cambio) => api.patch<Mesa>(`/admin/mesas/${cambio.id}`, cambio)))
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["salon", "mapa", sedeId] })
    },
  })
}

export function useCambiarEstadoMesa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: MesaEstadoPayload) => api.post<Mesa>(`/admin/mesas/${payload.id}/estado`, payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["salon"] }),
  })
}

export function useFueraServicioMesa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: FueraServicioPayload) =>
      api.post<Mesa>(`/admin/mesas/${payload.id}/fuera-servicio`, payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["salon"] }),
  })
}

export function useUnirMesas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UnionPayload) => api.post<UnionMesa>("/admin/mesas/unir", payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["salon"] }),
  })
}

export function useDividirUnion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; motivo: string }) =>
      api.post<{ ok: boolean; id: string }>(`/admin/mesas/${payload.id}/dividir`, payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["salon"] }),
  })
}

export function useAforoZona(zonaId: string | null) {
  return useQuery({
    queryKey: ["salon", "aforo", zonaId],
    queryFn: () => api.get<AforoZonaFranja[]>(`/admin/salon/zonas/${zonaId}/franjas`),
    enabled: Boolean(zonaId),
  })
}

export function useGuardarAforoZona() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { zonaId: string; franjas: AforoFranjaPayload[]; motivo: string }) =>
      api.put<AforoZonaFranja[]>(`/admin/salon/zonas/${payload.zonaId}/franjas`, payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["salon"] }),
  })
}

export function useExportarSalon() {
  return useMutation({
    mutationFn: (payload: { tipo: ExportacionSalon["tipo"]; formato?: ExportacionSalon["formato"] }) =>
      api.post<ExportacionSalon>("/admin/salon/exportaciones", payload),
  })
}

/** Utilidad para los selects del prototipo. */
export { claveDeZona, FRANJAS, MESA_ESTADO_LABEL }
