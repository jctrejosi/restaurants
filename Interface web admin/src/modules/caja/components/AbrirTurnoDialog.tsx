import { useEffect, useState } from "react"
import { Wallet } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { TextField, TextareaField } from "@/components/ui/fields"
import { useAbrirTurno } from "@/modules/caja/api"
import { ApiError } from "@/lib/api"
import { aCentavos } from "@/modules/caja/utils"

/**
 * Apertura de turno con base inicial en efectivo. Si la sede ya tiene un turno
 * abierto la API responde 409 y el error se muestra con su causa (plan §8).
 */
export function AbrirTurnoDialog({
  open,
  moneda,
  onCancel,
  onAbierto,
}: {
  open: boolean
  moneda?: string
  onCancel: () => void
  onAbierto: (turnoId: string) => void
}) {
  const [base, setBase] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [error, setError] = useState<string | null>(null)
  const abrir = useAbrirTurno()

  useEffect(() => {
    if (!open) return
    setBase("")
    setObservaciones("")
    setError(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  const baseCentavos = aCentavos(base)
  const bloqueado = baseCentavos === null || baseCentavos < 0

  const confirmar = () => {
    if (baseCentavos === null) return
    setError(null)
    abrir.mutate(
      { baseInicialCentavos: baseCentavos, observaciones: observaciones.trim() || undefined },
      {
        onSuccess: (turno) => onAbierto(turno.id),
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "No se pudo abrir el turno. Inténtalo de nuevo."),
      },
    )
  }

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onCancel} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Abrir turno">
        <div className="modal__header">
          <span className="modal__icon">
            <Wallet size={18} />
          </span>
          <div>
            <strong>Abrir turno</strong>
            <p>Solo puede existir un turno abierto por sede; la base inicial es el efectivo con el que arranca la caja.</p>
          </div>
        </div>
        <div className="modal__body">
          <TextField
            label={`Base inicial en efectivo (${moneda ?? "MXN"})`}
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={base}
            hint="Se usa para calcular el esperado de efectivo del arqueo."
            onChange={(event) => setBase(event.target.value)}
          />
          <TextareaField
            label="Observaciones"
            placeholder="Notas de apertura (opcional)"
            rows={2}
            value={observaciones}
            onChange={(event) => setObservaciones(event.target.value)}
          />
          {error ? <p className="modal__impact">{error}</p> : null}
        </div>
        <div className="modal__footer">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={bloqueado || abrir.isPending}
            title={bloqueado ? "Escribe una base inicial válida (0 o mayor)" : undefined}
            onClick={confirmar}
          >
            {abrir.isPending ? "Abriendo…" : "Abrir turno"}
          </Button>
        </div>
      </div>
    </>
  )
}
