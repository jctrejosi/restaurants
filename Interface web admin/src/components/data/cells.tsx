import { formatDuration, formatMoney } from "@/lib/format"

/** Importe en centavos con la moneda de la sede. */
export function MoneyCell({
  centavos,
  moneda,
  descuento,
}: {
  centavos: number
  moneda?: string
  descuento?: boolean
}) {
  const clase = ["money", centavos < 0 || descuento ? "money--negative" : ""].filter(Boolean).join(" ")
  return <span className={clase}>{formatMoney(centavos, moneda)}</span>
}

/**
 * Tramo de tiempo con semáforo contra su SLA (R5 §5.3). Sin evento de cierre el
 * valor es `null` y se muestra «—» (no promedia).
 */
export function DurationCell({
  segundos,
  objetivoSeg,
  titulo,
}: {
  segundos: number | null | undefined
  objetivoSeg?: number | null
  /** Fórmula del tramo, p. ej. «= pagado − por cobrar». */
  titulo?: string
}) {
  const excedido = segundos != null && objetivoSeg != null && segundos > objetivoSeg
  return (
    <span className={`duration ${excedido ? "duration--late" : ""}`} title={titulo}>
      {formatDuration(segundos)}
    </span>
  )
}
