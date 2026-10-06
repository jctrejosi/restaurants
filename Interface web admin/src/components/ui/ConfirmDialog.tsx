import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { TextareaField } from "@/components/ui/fields"

/**
 * Confirmación de acciones sensibles (RN-R5-01): exige **motivo** y muestra el
 * impacto antes de confirmar. El motivo viaja al backend y queda auditado.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  impacto,
  motivoLabel = "Motivo",
  motivoObligatorio = true,
  confirmLabel = "Confirmar",
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  description?: string
  impacto?: string
  motivoLabel?: string
  motivoObligatorio?: boolean
  confirmLabel?: string
  onCancel: () => void
  onConfirm: (motivo: string) => void
}) {
  const [motivo, setMotivo] = useState("")

  useEffect(() => {
    if (open) setMotivo("")
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

  const bloqueado = motivoObligatorio && motivo.trim().length < 3

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onCancel} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__header">
          <span className="modal__icon">
            <AlertTriangle size={18} />
          </span>
          <div>
            <strong>{title}</strong>
            {description ? <p>{description}</p> : null}
          </div>
        </div>
        <div className="modal__body">
          {impacto ? <p className="modal__impact">{impacto}</p> : null}
          <TextareaField
            label={motivoObligatorio ? `${motivoLabel} (obligatorio)` : motivoLabel}
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
            onClick={() => onConfirm(motivo.trim())}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </>
  )
}
