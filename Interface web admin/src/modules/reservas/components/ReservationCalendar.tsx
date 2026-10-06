import { useMemo, type DragEvent, type MouseEvent } from "react"
import { EmptyState } from "@/components/ui/states"
import { BLOQUEO_LABEL, ESTADO_LABEL, type Bloqueo, type ReservaLista } from "@/modules/reservas/types"
import {
  diasDeSemana,
  esHoy,
  etiquetaDia,
  fechaEnZona,
  isoEnMinutos,
  minutosDelDia,
} from "@/modules/reservas/fechas"
import { ReservationBlock } from "@/modules/reservas/components/ReservationBlock"

export const CAL_HORA_INICIO = 11
export const CAL_HORA_FIN = 24
const ALTO_HORA = 56
const SLOT_MIN = 15
const TOTAL_MINUTOS = (CAL_HORA_FIN - CAL_HORA_INICIO) * 60
const ALTO_TOTAL = (CAL_HORA_FIN - CAL_HORA_INICIO) * ALTO_HORA

type Posicion = { reserva: ReservaLista; top: number; height: number; left: string; width: string }

function organizarDia(reservas: ReservaLista[], zonaHoraria: string): Posicion[] {
  const items = reservas
    .map((reserva) => {
      const inicio = minutosDelDia(reserva.fechaHora, zonaHoraria)
      return { reserva, inicio, fin: inicio + reserva.duracionMin }
    })
    .filter((item) => item.fin > CAL_HORA_INICIO * 60 && item.inicio < CAL_HORA_FIN * 60)
    .sort((a, b) => a.inicio - b.inicio || a.fin - b.fin)

  const carriles: number[] = []
  const asignado = items.map((item) => {
    let carril = carriles.findIndex((fin) => fin <= item.inicio)
    if (carril === -1) {
      carril = carriles.length
      carriles.push(item.fin)
    } else {
      carriles[carril] = item.fin
    }
    return carril
  })
  const totalCarriles = Math.max(1, carriles.length)

  return items.map((item, indice) => {
    const carril = asignado[indice]
    const ancho = 100 / totalCarriles
    const inicio = Math.max(item.inicio, CAL_HORA_INICIO * 60)
    const fin = Math.min(item.fin, CAL_HORA_FIN * 60)
    return {
      reserva: item.reserva,
      top: ((inicio - CAL_HORA_INICIO * 60) / 60) * ALTO_HORA,
      height: Math.max(26, ((fin - inicio) / 60) * ALTO_HORA - 2),
      left: `calc(${carril * ancho}% + 2px)`,
      width: `calc(${ancho}% - 4px)`,
    }
  })
}

type FranjaBloqueo = { bloqueo: Bloqueo; top: number; height: number }

function bloqueosDelDia(bloqueos: Bloqueo[], dia: string): FranjaBloqueo[] {
  const inicioDia = new Date(`${dia}T00:00:00`).getTime()
  const finDia = inicioDia + 24 * 60 * 60 * 1000
  return bloqueos
    .filter((bloqueo) => new Date(bloqueo.desde).getTime() < finDia && new Date(bloqueo.hasta).getTime() > inicioDia)
    .map((bloqueo) => {
      const inicio = Math.max(new Date(bloqueo.desde).getTime(), inicioDia)
      const fin = Math.min(new Date(bloqueo.hasta).getTime(), finDia)
      const minutosInicio = Math.max(CAL_HORA_INICIO * 60, (inicio - inicioDia) / 60000)
      const minutosFin = Math.min(CAL_HORA_FIN * 60, (fin - inicioDia) / 60000)
      return {
        bloqueo,
        top: ((minutosInicio - CAL_HORA_INICIO * 60) / 60) * ALTO_HORA,
        height: Math.max(14, ((minutosFin - minutosInicio) / 60) * ALTO_HORA),
      }
    })
    .filter((franja) => franja.height > 0)
}

export function ReservationCalendar({
  modo,
  fecha,
  reservas,
  bloqueos,
  zonaHoraria,
  puedeReubicar,
  onAbrir,
  onNuevo,
  onReubicar,
}: {
  modo: "dia" | "semana"
  fecha: string
  reservas: ReservaLista[]
  bloqueos: Bloqueo[]
  zonaHoraria: string
  puedeReubicar: boolean
  onAbrir: (reserva: ReservaLista) => void
  onNuevo: (fechaHoraISO: string) => void
  onReubicar: (reserva: ReservaLista, fechaHoraISO: string) => void
}) {
  const dias = useMemo(() => (modo === "dia" ? [fecha] : diasDeSemana(fecha)), [modo, fecha])

  const porDia = useMemo(() => {
    const mapa = new Map<string, ReservaLista[]>()
    for (const dia of dias) mapa.set(dia, [])
    for (const reserva of reservas) {
      const dia = fechaEnZona(reserva.fechaHora, zonaHoraria)
      if (mapa.has(dia)) mapa.get(dia)?.push(reserva)
    }
    return mapa
  }, [dias, reservas, zonaHoraria])

  const ahoraMinutos = minutosDelDia(new Date().toISOString(), zonaHoraria)
  const dentroDeHorario = ahoraMinutos >= CAL_HORA_INICIO * 60 && ahoraMinutos <= CAL_HORA_FIN * 60

  const minutoDesdePuntero = (evento: DragEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>): number => {
    const rect = evento.currentTarget.getBoundingClientRect()
    const relativo = ((evento.clientY - rect.top) / ALTO_HORA) * 60
    const acotado = Math.max(0, Math.min(TOTAL_MINUTOS - SLOT_MIN, Math.round(relativo / SLOT_MIN) * SLOT_MIN))
    return CAL_HORA_INICIO * 60 + acotado
  }

  if (reservas.length === 0 && bloqueos.length === 0) {
    return (
      <EmptyState
        title="Sin reservas en el rango"
        description="Elige otra fecha o crea una reserva manual para verla en el calendario."
        action={{ label: "Nueva reserva", onClick: () => onNuevo(isoEnMinutos(fecha, CAL_HORA_INICIO * 60 + 60)) }}
      />
    )
  }

  return (
    <div className={`cal ${modo === "semana" ? "cal--semana" : "cal--dia"}`} role="grid" aria-label="Calendario de reservas">
      <div className="cal__gutter">
        <div className="cal__gutter-head" />
        {Array.from({ length: CAL_HORA_FIN - CAL_HORA_INICIO }, (_, indice) => (
          <div className="cal-hora" key={indice} style={{ height: ALTO_HORA }}>
            <span>
              {CAL_HORA_INICIO + indice}:00
            </span>
          </div>
        ))}
      </div>

      <div className="cal__dias">
        {dias.map((dia) => {
          const delDia = porDia.get(dia) ?? []
          const posiciones = organizarDia(delDia, zonaHoraria)
          const franjas = bloqueosDelDia(bloqueos, dia)
          const diaDeHoy = esHoy(dia)
          return (
            <div className="cal-dia" key={dia}>
              <div className={`cal-dia__head ${diaDeHoy ? "cal-dia__head--hoy" : ""}`}>
                <strong>{etiquetaDia(dia)}</strong>
                <span>{delDia.length} reservas</span>
              </div>
              <div
                className="cal-dia__pista"
                style={{ height: ALTO_TOTAL }}
                onClick={(event) => {
                  if (event.target !== event.currentTarget) return
                  onNuevo(isoEnMinutos(dia, minutoDesdePuntero(event)))
                }}
                onDragOver={(event) => {
                  if (puedeReubicar) event.preventDefault()
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  const id = event.dataTransfer.getData("text/plain")
                  const reserva = reservas.find((item) => item.id === id)
                  if (!reserva) return
                  onReubicar(reserva, isoEnMinutos(dia, minutoDesdePuntero(event)))
                }}
              >
                {Array.from({ length: CAL_HORA_FIN - CAL_HORA_INICIO }, (_, indice) => (
                  <div className="cal-linea" key={indice} style={{ top: indice * ALTO_HORA }} aria-hidden="true" />
                ))}
                {franjas.map((franja) => (
                  <div
                    className={`cal-bloqueo cal-bloqueo--${franja.bloqueo.tipo}`}
                    style={{ top: franja.top, height: franja.height }}
                    key={franja.bloqueo.id}
                    title={`${BLOQUEO_LABEL[franja.bloqueo.tipo]}: ${franja.bloqueo.motivo}${
                      franja.bloqueo.zonaNombre ? ` · ${franja.bloqueo.zonaNombre}` : ""
                    }`}
                  >
                    <span>
                      {BLOQUEO_LABEL[franja.bloqueo.tipo]}
                      {franja.bloqueo.zonaNombre ? ` · ${franja.bloqueo.zonaNombre}` : ""}
                    </span>
                  </div>
                ))}
                {posiciones.map((posicion) => (
                  <ReservationBlock
                    key={posicion.reserva.id}
                    reserva={posicion.reserva}
                    top={posicion.top}
                    height={posicion.height}
                    left={posicion.left}
                    width={posicion.width}
                    zonaHoraria={zonaHoraria}
                    draggable={puedeReubicar && (posicion.reserva.estado === "solicitada" || posicion.reserva.estado === "confirmada")}
                    onAbrir={() => onAbrir(posicion.reserva)}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", posicion.reserva.id)
                      event.dataTransfer.effectAllowed = "move"
                    }}
                  />
                ))}
                {diaDeHoy && dentroDeHorario ? (
                  <div className="cal-ahora" style={{ top: ((ahoraMinutos - CAL_HORA_INICIO * 60) / 60) * ALTO_HORA }} aria-hidden="true" />
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <div className="cal__leyenda">
        <span className="cal__leyenda-titulo">Leyenda</span>
        {(["solicitada", "confirmada", "sentada", "finalizada", "no_show", "cancelada"] as const).map((estado) => (
          <span className="cal__leyenda-item" key={estado}>
            <i className={`cal__leyenda-punto cal__leyenda-punto--${estado}`} aria-hidden="true" />
            {ESTADO_LABEL[estado]}
          </span>
        ))}
        <span className="cal__leyenda-item">
          <i className="cal__leyenda-punto cal__leyenda-punto--bloqueo" aria-hidden="true" />
          Bloqueo / festivo
        </span>
      </div>
    </div>
  )
}
