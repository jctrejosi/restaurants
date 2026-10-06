/** Conversión entre pesos capturados por el usuario y centavos. */
export function aCentavos(valor: string): number | null {
  if (valor.trim() === "") return null
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return null
  return Math.round(numero * 100)
}

export function aPesos(centavos: number | null | undefined): string {
  return centavos === null || centavos === undefined ? "" : (centavos / 100).toFixed(2)
}
