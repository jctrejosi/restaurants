import type { DescuentoAplicado, LineaCarrito, TotalesCarrito } from "@/modules/tomar-pedido/types"

/* -------------------------------------------------------------------------- */
/* Cálculo del carrito (RN-R5-04): todo se recalcula antes de confirmar;      */
/* el pedido ya enviado conserva su snapshot.                                 */
/* -------------------------------------------------------------------------- */

export const PROPINA_SUGERIDA_PCT = 10

export function nuevaLineaId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `lin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function nuevaClaveIdempotencia(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `env-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Precio unitario con modificadores (sin impuestos). */
export function precioUnitario(linea: LineaCarrito): number {
  return (
    linea.centavos +
    linea.modificadores.reduce((total, modificador) => total + modificador.sobreprecioCentavos, 0)
  )
}

export function importeLinea(linea: LineaCarrito): number {
  return precioUnitario(linea) * linea.cantidad
}

export function unidadesCarrito(lineas: LineaCarrito[]): number {
  return lineas.reduce((total, linea) => total + linea.cantidad, 0)
}

export function valorDescuento(subtotalCentavos: number, descuento: DescuentoAplicado | null): number {
  if (!descuento || subtotalCentavos <= 0) return 0
  if (descuento.tipo === "monto") return Math.min(Math.max(0, descuento.valor), subtotalCentavos)
  return Math.round((subtotalCentavos * Math.min(100, Math.max(0, descuento.valor))) / 100)
}

/**
 * Totales del carrito. El descuento se prorratea por línea para calcular el
 * impuesto sobre la base rebajada; la propina se sugiere sobre la base con
 * descuento y sin impuestos.
 */
export function calcularTotales(
  lineas: LineaCarrito[],
  descuento: DescuentoAplicado | null,
  propinaPct: number,
): TotalesCarrito {
  const subtotalCentavos = lineas.reduce((total, linea) => total + importeLinea(linea), 0)
  const descuentoCentavos = valorDescuento(subtotalCentavos, descuento)
  const baseCentavos = subtotalCentavos - descuentoCentavos

  let impuestosCentavos = 0
  if (subtotalCentavos > 0) {
    const factor = baseCentavos / subtotalCentavos
    for (const linea of lineas) {
      const impuesto = linea.impuesto
      if (impuesto.tipo === "adicionado" && impuesto.tasaBps > 0) {
        impuestosCentavos += Math.round((importeLinea(linea) * factor * impuesto.tasaBps) / 10_000)
      }
    }
  }

  const propinaSugeridaCentavos = Math.round((baseCentavos * PROPINA_SUGERIDA_PCT) / 100)
  const propinaCentavos = Math.round((baseCentavos * Math.max(0, propinaPct)) / 100)

  return {
    subtotalCentavos,
    descuentoCentavos,
    impuestosCentavos,
    propinaSugeridaCentavos,
    propinaCentavos,
    totalCentavos: baseCentavos + impuestosCentavos + propinaCentavos,
  }
}

/** Agrupa las líneas con estación para previsualizar comandas antes de enviar. */
export function comandasPrevistas(lineas: LineaCarrito[]): { estacion: string; lineas: number }[] {
  const mapa = new Map<string, number>()
  for (const linea of lineas) {
    if (!linea.estacion) continue
    mapa.set(linea.estacion.nombre, (mapa.get(linea.estacion.nombre) ?? 0) + linea.cantidad)
  }
  return [...mapa.entries()].map(([estacion, cantidad]) => ({ estacion, lineas: cantidad }))
}

export function lineasSinEstacion(lineas: LineaCarrito[]): number {
  return lineas.filter((linea) => !linea.estacion).reduce((total, linea) => total + linea.cantidad, 0)
}
