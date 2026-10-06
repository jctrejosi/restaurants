import { Clock, Flame } from "lucide-react"
import { DurationCell } from "@/components/data/cells"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { formatDuration } from "@/lib/format"
import { calcularSemaforo, transcurridoEnVivo } from "@/modules/comandas/api"
import {
  ESTADO_LABEL,
  MODALIDAD_LABEL,
  SEMAFORO_LABEL,
  type ComandaMonitor,
} from "@/modules/comandas/types"

/** Tarjeta de comanda del monitor; refleja lo que ve el KDS (RF-R5-60). */
export function ComandaCard({
  comanda,
  ahoraMs,
  mostrarEstacion,
  onOpen,
}: {
  comanda: ComandaMonitor
  ahoraMs: number
  /** Vista unificada de expedidor: la estación se muestra dentro de la tarjeta. */
  mostrarEstacion: boolean
  onOpen: () => void
}) {
  const transcurridoSeg = transcurridoEnVivo(comanda, ahoraMs)
  const semaforo = calcularSemaforo(comanda.estado, transcurridoSeg, comanda.objetivoSeg)
  const ubicacion = comanda.mesa ?? MODALIDAD_LABEL[comanda.modalidad]

  return (
    <button
      type="button"
      className={`comanda-card comanda-card--${semaforo} ${comanda.prioridad === "urgente" ? "comanda-card--urgente" : ""}`}
      onClick={onOpen}
      aria-label={`Comanda ${comanda.numero} · ${ESTADO_LABEL[comanda.estado]} · ${SEMAFORO_LABEL[semaforo]}`}
    >
      <span className="comanda-card__head">
        <span className="comanda-card__num">#{comanda.numero}</span>
        <StatusBadge tone={comanda.estadoTone}>{ESTADO_LABEL[comanda.estado]}</StatusBadge>
      </span>

      <span className="comanda-card__meta">
        <span>{ubicacion}</span>
        <span className="comanda-card__dot" aria-hidden="true">·</span>
        <span>{comanda.pedidoFolio}</span>
        {mostrarEstacion ? (
          <>
            <span className="comanda-card__dot" aria-hidden="true">·</span>
            <span className="comanda-card__station">{comanda.estacionNombre}</span>
          </>
        ) : null}
      </span>

      <span className="comanda-card__times">
        <span className="comanda-card__time">
          <Clock size={13} aria-hidden="true" />
          <DurationCell
            segundos={transcurridoSeg}
            objetivoSeg={comanda.objetivoSeg}
            titulo="Tiempo transcurrido desde el envío de la comanda"
          />
        </span>
        <span className="comanda-card__sla">SLA {formatDuration(comanda.objetivoSeg)}</span>
      </span>

      <span className="comanda-card__foot">
        <span className="comanda-card__lines">
          {comanda.lineasPendientes} de {comanda.lineasTotal}{" "}
          {comanda.lineasTotal === 1 ? "línea" : "líneas"} por preparar
        </span>
        {comanda.prioridad === "urgente" ? (
          <span className="comanda-card__flag">
            <Flame size={12} aria-hidden="true" /> Urgente
          </span>
        ) : null}
      </span>
    </button>
  )
}
