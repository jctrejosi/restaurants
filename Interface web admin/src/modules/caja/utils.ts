import { TOLERANCIA_DIFERENCIA_CENTAVOS } from "@/modules/caja/types"

/** Convierte un valor en pesos escrito por el usuario a centavos. */
export function aCentavos(valor: string): number | null {
  if (valor.trim() === "") return null
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return null
  return Math.round(numero * 100)
}

/** Convierte centavos a un valor editable en pesos. */
export function aPesos(centavos: number | null | undefined): string {
  return centavos === null || centavos === undefined ? "" : (centavos / 100).toFixed(2)
}

export type SemaforoDiferencia = "cuadra" | "aviso" | "error"

/** Semáforo de la diferencia: 0 cuadra, tolerancia = aviso, mayor = error (plan §6). */
export function semaforoDiferencia(diferencia: number): SemaforoDiferencia {
  const absoluta = Math.abs(diferencia)
  if (absoluta === 0) return "cuadra"
  return absoluta <= TOLERANCIA_DIFERENCIA_CENTAVOS ? "aviso" : "error"
}

export const SEMAFORO_LABEL: Record<SemaforoDiferencia, string> = {
  cuadra: "Cuadra",
  aviso: "Dentro de tolerancia",
  error: "Fuera de tolerancia",
}

export function signoDiferencia(diferencia: number): string {
  if (diferencia > 0) return "Sobra"
  if (diferencia < 0) return "Falta"
  return "Cuadra"
}
