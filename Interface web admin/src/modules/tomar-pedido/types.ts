import type { StatusTone } from "@/components/ui/StatusBadge"

/* -------------------------------------------------------------------------- */
/* Dominio del módulo «Tomar pedido» (plan admin-modules/20)                  */
/* Captura manual en caja/mostrador: carrito → borrador → pedido + comandas.  */
/* Todos los importes viajan en centavos (RNF-R5-08).                          */
/* -------------------------------------------------------------------------- */

export type Modalidad = "mesa" | "recoger" | "domicilio"

export const MODALIDAD_LABEL: Record<Modalidad, string> = {
  mesa: "Mesa",
  recoger: "Para llevar",
  domicilio: "Domicilio",
}

export const MODALIDAD_DESCRIPCION: Record<Modalidad, string> = {
  mesa: "Servicio en salón; se asigna mesa y mesero",
  recoger: "El cliente recoge en mostrador cuando esté listo",
  domicilio: "Se envía a la dirección del cliente",
}

/* ----------------------------------- Carta -------------------------------- */

export type AgotadoOrigen = "cocina" | "salon" | "backoffice" | "proveedor"

export const ORIGEN_LABEL: Record<AgotadoOrigen, string> = {
  cocina: "Cocina",
  salon: "Salón",
  backoffice: "Backoffice",
  proveedor: "Proveedor",
}

/** Estado de agotado con origen, motivo y vigencia (RF-R5-30, plan §8). */
export type Agotado = {
  agotado: boolean
  origen: AgotadoOrigen | null
  /** Texto visible del origen, p. ej. «Cocina · parrilla». */
  origenDetalle: string | null
  motivo: string | null
  /** ISO estimado de reactivación; `null` = sin fecha estimada. */
  reactivacionEstimada: string | null
  actualizadoEn: string | null
}

export type Impuesto = {
  id: string
  nombre: string
  tasaBps: number
  tipo: "incluido" | "adicionado" | "inc"
}

export type Estacion = {
  id: string
  nombre: string
}

export type EtiquetaCarta = "recomendado" | "nuevo" | "vegetariano" | "picante" | "menu_del_dia"

export const ETIQUETA_CARTA_LABEL: Record<EtiquetaCarta, string> = {
  recomendado: "Recomendado",
  nuevo: "Nuevo",
  vegetariano: "Vegetariano",
  picante: "Picante",
  menu_del_dia: "Menú del día",
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
  /** Selección mínima; si es > 0 el grupo bloquea «Agregar» hasta elegir. */
  minimo: number
  maximo: number
  obligatorio: boolean
  modificadores: Modificador[]
}

export type ProductoCarta = {
  id: string
  nombre: string
  descripcion: string
  categoriaId: string
  categoriaNombre: string
  sku: string
  /** Precio vigente de la sede activa (se congela al enviar, RN-R5-04). */
  centavos: number
  impuesto: Impuesto
  /** Sin estación la línea no genera comanda (aviso al enviar). */
  estacion: Estacion | null
  agotado: Agotado
  etiquetas: EtiquetaCarta[]
  grupos: GrupoModificador[]
  /** Alternativa sugerida cuando el producto está agotado. */
  alternativaNombre: string | null
}

export type CategoriaCarta = {
  id: string
  nombre: string
  orden: number
  conteo: number
}

export type CartaRespuesta = {
  actualizadoEn: string
  categorias: CategoriaCarta[]
  productos: ProductoCarta[]
  agotados: number
}

/* ------------------------------ Salón y contexto -------------------------- */

export type MesaEstado = "libre" | "ocupada" | "por_cobrar" | "reservada" | "fuera_servicio"

export const MESA_ESTADO_LABEL: Record<MesaEstado, string> = {
  libre: "Libre",
  ocupada: "Ocupada",
  por_cobrar: "Por cobrar",
  reservada: "Reservada",
  fuera_servicio: "Fuera de servicio",
}

export const MESA_ESTADO_TONE: Record<MesaEstado, StatusTone> = {
  libre: "green",
  ocupada: "amber",
  por_cobrar: "gray",
  reservada: "blue",
  fuera_servicio: "outline",
}

export const MESA_ESTADO_DESCRIPCION: Record<MesaEstado, string> = {
  libre: "Disponible para asignar",
  ocupada: "Con sesión abierta",
  por_cobrar: "Pendiente de cobro en Caja",
  reservada: "Apartada para una reserva próxima",
  fuera_servicio: "Bloqueada: no se ofrece",
}

export type MesaCarta = {
  id: string
  numero: string
  zona: string
  capacidad: number
  estado: MesaEstado
  /** Sesión o reserva asociada, para explicar el estado. */
  etiqueta: string | null
}

export type Mesero = {
  id: string
  nombre: string
  rol: string
  enTurno: boolean
  mesasAbiertas: number
}

export type TurnoCajaResumen = {
  id: string
  numero: string
  caja: string
  abiertoEn: string
  usuario: string
  baseCentavos: number
  ventasCentavos: number
}

export type ContextoRespuesta = {
  actualizadoEn: string
  mesas: MesaCarta[]
  meseros: Mesero[]
  /** `null` = sin turno abierto: se puede enviar, «Cobrar» queda bloqueado. */
  turno: TurnoCajaResumen | null
}

/* --------------------------------- Clientes ------------------------------- */

export type ClienteResumen = {
  id: string
  nombre: string
  telefono: string
  correo: string | null
  visitas: number
  ultimaVisita: string | null
  /** Con opt-out la venta se permite; no se ofrecen acciones de marketing. */
  optOutMarketing: boolean
  notas: string | null
  direccion: string | null
}

export type ClienteNuevoPayload = {
  nombre: string
  telefono: string
  correo?: string | null
  aceptaMarketing: boolean
}

/* ------------------------------ Carrito y líneas -------------------------- */

export type ModificadorElegido = {
  grupoId: string
  grupoNombre: string
  modificadorId: string
  nombre: string
  sobreprecioCentavos: number
}

export type LineaCarrito = {
  /** Identificador local de la línea (no viaja como PK). */
  id: string
  productoId: string
  nombreSnapshot: string
  sku: string
  /** Precio unitario sin modificadores, congelado al agregar. */
  centavos: number
  impuesto: Impuesto
  estacion: Estacion | null
  cantidad: number
  modificadores: ModificadorElegido[]
  notas: string
}

/* --------------------------------- Totales -------------------------------- */

export type DescuentoTipo = "porcentaje" | "monto"

export type DescuentoAplicado = {
  tipo: DescuentoTipo
  /** Porcentaje 0–100 cuando es «porcentaje»; centavos cuando es «monto». */
  valor: number
  motivo: string
  usuario: string
  aplicadoEn: string
}

export type TotalesCarrito = {
  subtotalCentavos: number
  descuentoCentavos: number
  /** Impuestos adicionados por línea (los incluidos ya viven en el precio). */
  impuestosCentavos: number
  propinaSugeridaCentavos: number
  propinaCentavos: number
  totalCentavos: number
}

/* -------------------------------- Borradores ------------------------------ */

export type BorradorEstado = "abierto" | "enviado" | "cobrado"

export type BorradorPayload = {
  modalidad: Modalidad
  mesaNumero: string | null
  clienteId: string | null
  clienteNombre: string | null
  clienteTelefono: string | null
  meseroId: string | null
  comensales: number
  lineas: LineaCarrito[]
  descuento: DescuentoAplicado | null
  /** Propina sugerida elegida, en porcentaje sobre la base con descuento. */
  propinaPct: number
  notas: string
}

export type Borrador = BorradorPayload & {
  id: string
  estado: BorradorEstado
  creadoEn: string
  actualizadoEn: string
  version: number
  /** Folio del pedido generado al enviar o cobrar; `null` mientras es borrador. */
  folio: string | null
}

/** Snapshot que se conserva en localStorage para recuperar al recargar. */
export type BorradorLocal = BorradorPayload & {
  id: string | null
  guardadoEn: string
  /** Cliente completo para restaurar la UI sin volver a buscarlo. */
  cliente: ClienteResumen | null
}

export const BORRADOR_STORAGE_KEY = "pc_tomar_pedido_borrador"

/* ------------------------------ Envío y cobro ----------------------------- */

export type ComandaGenerada = {
  id: string
  numero: string
  estacion: string
  lineas: number
  impresa: boolean
}

export type EnvioAviso = {
  tipo: "sin_estacion" | "impresora" | "sin_turno"
  mensaje: string
  lineas?: number
}

export type EnvioPayload = {
  /**
   * Clave de idempotencia del intento. En la API real viaja como header
   * `Idempotency-Key`; el cliente actual no expone headers, así que el mock
   * la recibe en el cuerpo. Reutilizarla garantiza un solo pedido.
   */
  idempotencyKey: string
  /** Solo QA: simula la impresora de comandas caída. */
  simularImpresoraCaida?: boolean
}

export type EnvioRespuesta = {
  folio: string
  pedidoId: string
  enviadoEn: string
  /** `true` cuando el servidor devolvió el resultado de un intento previo. */
  idempotente: boolean
  totalCentavos: number
  comandas: ComandaGenerada[]
  avisos: EnvioAviso[]
  impresoraOk: boolean
}

export type PrecuentaRespuesta = {
  folio: string
  trabajoId: string
  impresa: boolean
  impresoEn: string
  aviso: string | null
}

export type CobroRespuesta = {
  folio: string
  pedidoId: string
  estado: "por_cobrar"
  turnoId: string
  /** Enlace al módulo de Caja/Pagos (`/pagos`), V1. */
  urlPagos: string
  cobradoEn: string
}
