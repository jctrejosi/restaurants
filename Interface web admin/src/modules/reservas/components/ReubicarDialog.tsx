import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { SelectField, TextField, TextareaField, type SelectOption } from "@/components/ui/fields"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { formatDateTime, formatTime } from "@/lib/format"
import { useDisponibilidadReserva } from "@/modules/reservas/api"
import { fechaEnZona, minutosDelDia } from "@/modules/reservas/fechas"
import { ESTADO_LABEL, ESTADO_TONE, type ReservaLista } from "@/modules/reservas/types"

export type ReubicarPayload = {
  fechaHora: string
  duracionMin: number
  mesaId?: string
  motivo: string
}

const DURACIONES: SelectOption[] = [30, 45, 60, 75, 90, 120, 150, 180].map((valor) => ({
  value: String(valor),
  label: `${valor} min`,
}))

/**
 * Reubicación sin sobre-asignar (RF-R5-42): consulta la disponibilidad, avisa
 * de cierres y exige motivo; el servidor revalida y responde 409 si hay solape.
 */
export function ReubicarDialog({
  open,
  reserva,
  fechaInicial,
  zonaHoraria,
  pendiente,
  onCancel,
  onConfirm,
}: {
  open: boolean
  reserva: ReservaLista | null
  /** Prefill opcional al arrastrar un bloque en el calendario. */
  fechaInicial?: string
  zonaHoraria: string
  pendiente: boolean
  onCancel: () => void
  onConfirm: (payload: ReubicarPayload) => void
}) {
  const [fecha, setFecha] = useState("")
  const [hora, setHora] = useState("")
  const [duracion, setDuracion] = useState("90")
  const [mesaId, setMesaId] = useState("")
  const [motivo, setMotivo] = useState("")
  const inicializado = useRef(false)

  useEffect(() => {
    if (!open || !reserva) {
      inicializado.current = false
      return
    }
    // Solo inicializa al abrir: los refetch del calendario no deben pisar la edición.
    if (inicializado.current) return
    inicializado.current = true
    const objetivo = fechaInicial ? new Date(fechaInicial) : new Date(reserva.fechaHora)
    setFecha(fechaEnZona(objetivo.toISOString(), zonaHoraria))
    const minutos = minutosDelDia(objetivo.toISOString(), zonaHoraria)
    setHora(`${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`)
    setDuracion(String(reserva.duracionMin))
    setMesaId(reserva.mesaId ?? "")
    setMotivo("")
  }, [open, reserva, fechaInicial, zonaHoraria])

  const fechaHora = useMemo(() => {
    if (!fecha || !hora) return ""
    const instante = new Date(`${fecha}T${hora}:00`)
    return Number.isNaN(instante.getTime()) ? "" : instante.toISOString()
  }, [fecha, hora])

  const disponibilidad = useDisponibilidadReserva(
    {
      sedeId: reserva?.sedeId ?? "",
      fechaHora,
      duracionMin: Number(duracion) || 90,
      personas: reserva?.personas ?? 2,
      excluirId: reserva?.id,
    },
    open && Boolean(reserva) && Boolean(fechaHora),
  )

  if (!open || !reserva) return null

  const mesas = disponibilidad.data?.mesas ?? []
  const disponibles = mesas.filter((mesa) => mesa.disponible || mesa.id === reserva.mesaId)
  const noDisponibles = mesas.filter((mesa) => !mesa.disponible && mesa.id !== reserva.mesaId)
  const bloqueado = disponibilidad.data?.bloqueado ?? false
  const opcionesMesa: SelectOption[] = [
    { value: "", label: "Sin asignar (solo si la sede lo permite)" },
    ...disponibles.map((mesa) => ({
      value: mesa.id,
      label: `Mesa ${mesa.numero} · ${mesa.zonaNombre} · ${mesa.capacidad} pax`,
    })),
  ]

  const bloqueadoEnviar = pendiente || motivo.trim().length < 3 || bloqueado || !fechaHora

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onCancel} />
      <div className="modal reserva-modal--ancho" role="dialog" aria-modal="true" aria-label={`Reubicar reserva ${reserva.codigo}`}>
        <div className="modal__header">
          <span className="modal__icon">
            <CalendarClock size={18} />
          </span>
          <div>
            <strong>Reubicar {reserva.codigo}</strong>
            <p>
              Actual: {formatDateTime(reserva.fechaHora, zonaHoraria)} · {reserva.mesaNumero ? `Mesa ${reserva.mesaNumero}` : "sin mesa"} ·{" "}
              {reserva.personas} personas <StatusBadge tone={ESTADO_TONE[reserva.estado]}>{ESTADO_LABEL[reserva.estado]}</StatusBadge>
            </p>
          </div>
        </div>

        <div className="modal__body">
          {bloqueado ? (
            <p className="reserva-aviso reserva-aviso--error">
              <AlertTriangle size={14} /> Franja cerrada: {disponibilidad.data?.motivoBloqueo}. Elige otra hora o revisa Bloqueos y
              festivos.
            </p>
          ) : null}

          <div className="reserva-campos-3">
            <TextField label="Fecha" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
            <TextField label="Hora" type="time" value={hora} onChange={(event) => setHora(event.target.value)} />
            <SelectField label="Duración" options={DURACIONES} value={duracion} onChange={(event) => setDuracion(event.target.value)} />
          </div>

          <SelectField
            label="Mesa candidata (solo mesas operativas y sin solape)"
            options={opcionesMesa}
            value={mesaId}
            onChange={(event) => setMesaId(event.target.value)}
          />
          <p className="reserva-nota">
            {noDisponibles.length > 0
              ? `No disponibles: ${noDisponibles.map((mesa) => `Mesa ${mesa.numero}`).join(", ")}.`
              : "Todas las mesas con capacidad suficiente están libres en esta franja."}
          </p>

          {disponibilidad.data && !bloqueado && disponibilidad.data.alternativas.length > 0 ? (
            <div className="reserva-alternativas">
              <span>Alternativas con hueco:</span>
              {disponibilidad.data.alternativas.map((alternativa) => (
                <Button
                  key={alternativa.fechaHora}
                  variant="ghost"
                  className="text-action"
                  onClick={() => setHora(formatTime(alternativa.fechaHora, zonaHoraria))}
                  title={`${alternativa.mesasLibres} mesas libres`}
                >
                  {formatTime(alternativa.fechaHora, zonaHoraria)}
                </Button>
              ))}
            </div>
          ) : null}

          <TextareaField
            label="Motivo (obligatorio)"
            placeholder="Explica brevemente por qué se reubica la reserva"
            rows={3}
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
          />
          <p className="modal__note">
            El servidor revalida el solape; si la mesa se ocupó, responde 409 con el conflicto y las alternativas (RN-R5-09).
          </p>
        </div>

        <div className="modal__footer">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={bloqueadoEnviar}
            title={bloqueadoEnviar ? "Completa motivo y una franja disponible" : undefined}
            onClick={() =>
              onConfirm({
                fechaHora,
                duracionMin: Number(duracion) || reserva.duracionMin,
                mesaId: mesaId || undefined,
                motivo: motivo.trim(),
              })
            }
          >
            {pendiente ? "Reubicando…" : "Reubicar y registrar"}
          </Button>
        </div>
      </div>
    </>
  )
}
