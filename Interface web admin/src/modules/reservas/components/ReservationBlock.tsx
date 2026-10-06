import type { DragEvent } from "react"
import { formatTime } from "@/lib/format"
import { ESTADO_LABEL, ESTADO_TONE, type ReservaLista } from "@/modules/reservas/types"

/** Bloque de reserva del calendario, coloreado por estado (plan 03 §6). */
export function ReservationBlock({
  reserva,
  top,
  height,
  left,
  width,
  zonaHoraria,
  draggable,
  onAbrir,
  onDragStart,
}: {
  reserva: ReservaLista
  top: number
  height: number
  left: string
  width: string
  zonaHoraria: string
  draggable: boolean
  onAbrir: () => void
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void
}) {
  const tone = ESTADO_TONE[reserva.estado]
  return (
    <button
      type="button"
      className={`reserva-bloque reserva-bloque--${tone} reserva-bloque--${reserva.estado}`}
      style={{ top, height, left, width }}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={(event) => {
        event.stopPropagation()
        onAbrir()
      }}
      title={`${reserva.codigo} · ${reserva.clienteNombre} · ${reserva.personas} pers. · ${ESTADO_LABEL[reserva.estado]}${
        reserva.mesaNumero ? ` · Mesa ${reserva.mesaNumero}` : " · Sin mesa"
      }`}
    >
      <span className="reserva-bloque__hora">{formatTime(reserva.fechaHora, zonaHoraria)}</span>
      <span className="reserva-bloque__cliente">{reserva.clienteNombre}</span>
      <span className="reserva-bloque__meta">
        {reserva.personas} pax{reserva.mesaNumero ? ` · M${reserva.mesaNumero}` : " · sin mesa"}
      </span>
    </button>
  )
}
