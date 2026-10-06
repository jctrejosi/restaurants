import type { DragEvent, KeyboardEvent } from "react"
import { formatRelative } from "@/lib/format"
import { CELDA, MESA_ESTADO_LABEL, type Mesa } from "@/modules/salon/types"

export function tituloMesa(mesa: Mesa): string {
  const partes = [`Mesa ${mesa.numero}`, MESA_ESTADO_LABEL[mesa.estado], `${mesa.capacidad} pax`]
  if (mesa.desde && mesa.estado !== "libre") partes.push(`desde ${formatRelative(mesa.desde)}`)
  if (mesa.por) partes.push(`por ${mesa.por}`)
  if (mesa.sesionAbierta) partes.push("sesión abierta")
  if (mesa.reservasFuturas > 0) partes.push(`${mesa.reservasFuturas} reserva(s) futura(s)`)
  if (!mesa.activa) partes.push("dada de baja")
  return partes.join(" · ")
}

/**
 * Mesa del mapa: círculo o cuadro con semáforo por estado y tooltip con
 * «desde cuándo y por quién» (plan 05 §6). Accesible por teclado (RNF-R5-07):
 * flechas mueven, Enter selecciona.
 */
export function TableShape({
  mesa,
  seleccionada,
  unida,
  modo,
  onSeleccion,
  onMover,
  onDragStart,
}: {
  mesa: Mesa
  seleccionada: boolean
  unida: boolean
  modo: "editar" | "preview"
  onSeleccion?: (mesa: Mesa, aditivo: boolean) => void
  onMover?: (mesaId: string, posX: number, posY: number) => void
  onDragStart?: (event: DragEvent<HTMLButtonElement>, mesa: Mesa) => void
}) {
  const teclas: Record<string, [number, number]> = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (modo !== "editar" || !onMover) return
    const delta = teclas[event.key]
    if (!delta) return
    event.preventDefault()
    onMover(mesa.id, mesa.posX + delta[0], mesa.posY + delta[1])
  }

  return (
    <button
      type="button"
      className={[
        "salon-mesa",
        `salon-mesa--${mesa.estado}`,
        `salon-mesa--${mesa.forma}`,
        seleccionada ? "salon-mesa--sel" : "",
        unida ? "salon-mesa--unida" : "",
        mesa.activa ? "" : "salon-mesa--inactiva",
        modo === "preview" ? "salon-mesa--solo-lectura" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ left: mesa.posX * CELDA, top: mesa.posY * CELDA }}
      title={tituloMesa(mesa)}
      aria-pressed={modo === "editar" ? seleccionada : undefined}
      tabIndex={modo === "editar" ? 0 : -1}
      draggable={modo === "editar"}
      onDragStart={(event) => onDragStart?.(event, mesa)}
      onClick={(event) => {
        event.stopPropagation()
        if (modo === "editar") onSeleccion?.(mesa, event.shiftKey)
      }}
      onKeyDown={onKeyDown}
    >
      <strong>{mesa.numero}</strong>
      <small>{mesa.capacidad}</small>
      {mesa.estado === "fuera_servicio" ? <span className="salon-mesa__bloqueo" aria-hidden="true" /> : null}
    </button>
  )
}
