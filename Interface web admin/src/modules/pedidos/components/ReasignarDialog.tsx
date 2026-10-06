import { useEffect, useState } from "react"
import { Repeat } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { SelectField, TextareaField, type SelectOption } from "@/components/ui/fields"

const MESAS: SelectOption[] = Array.from({ length: 12 }).map((_, index) => {
  const numero = String(index + 1).padStart(2, "0")
  return { value: `Mesa ${numero}`, label: `Mesa ${numero}` }
})

const MESEROS: SelectOption[] = ["Laura Pérez", "Carlos Méndez", "Ana Morales", "Diego Ramírez"].map((nombre) => ({
  value: nombre,
  label: nombre,
}))

/** Reasigna mesa o mesero con motivo obligatorio y auditoría. */
export function ReasignarDialog({
  open,
  mesaActual,
  meseroActual,
  onCancel,
  onConfirm,
}: {
  open: boolean
  mesaActual?: string
  meseroActual: string
  onCancel: () => void
  onConfirm: (payload: { mesa?: string; mesero: string; motivo: string }) => void
}) {
  const [mesa, setMesa] = useState(mesaActual ?? "")
  const [mesero, setMesero] = useState(meseroActual)
  const [motivo, setMotivo] = useState("")

  useEffect(() => {
    if (!open) return
    setMesa(mesaActual ?? "")
    setMesero(meseroActual)
    setMotivo("")
  }, [open, mesaActual, meseroActual])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  const bloqueado = motivo.trim().length < 3 || mesero.trim().length === 0

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onCancel} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Reasignar mesa o mesero">
        <div className="modal__header">
          <span className="modal__icon">
            <Repeat size={18} />
          </span>
          <div>
            <strong>Reasignar mesa o mesero</strong>
            <p>El cambio queda auditado con el valor anterior y el nuevo.</p>
          </div>
        </div>
        <div className="modal__body">
          <SelectField
            label="Mesa"
            options={MESAS}
            placeholder="Sin mesa (mostrador)"
            value={mesa}
            onChange={(event) => setMesa(event.target.value)}
          />
          <SelectField
            label="Mesero"
            options={MESEROS}
            value={mesero}
            onChange={(event) => setMesero(event.target.value)}
          />
          <TextareaField
            label="Motivo (obligatorio)"
            placeholder="Explica brevemente la razón"
            rows={3}
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
          />
          <p className="modal__note">Esta acción requiere motivo y quedará registrada en auditoría.</p>
        </div>
        <div className="modal__footer">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={bloqueado}
            title={bloqueado ? "Escribe un motivo de al menos 3 caracteres" : undefined}
            onClick={() => onConfirm({ mesa: mesa || undefined, mesero, motivo: motivo.trim() })}
          >
            Reasignar
          </Button>
        </div>
      </div>
    </>
  )
}
