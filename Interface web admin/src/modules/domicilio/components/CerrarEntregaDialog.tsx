import { useEffect, useState } from "react"
import { BadgeCheck } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { TextField, TextareaField } from "@/components/ui/fields"
import type { Entrega } from "@/modules/domicilio/types"

/**
 * Cierre de entrega: la evidencia es obligatoria y el sello temporal lo pone el
 * servidor (RN-R5-08); el cliente nunca envía marcas de tiempo.
 */
export function CerrarEntregaDialog({
  open,
  entrega,
  cerrando,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean
  entrega: Entrega | null
  cerrando: boolean
  error: string | null
  onCancel: () => void
  onConfirm: (payload: { evidenciaUrl: string; nota?: string }) => void
}) {
  const [evidenciaUrl, setEvidenciaUrl] = useState("")
  const [nota, setNota] = useState("")

  useEffect(() => {
    if (!open) return
    setEvidenciaUrl("")
    setNota("")
  }, [open])

  if (!open || !entrega) return null

  const bloqueado = evidenciaUrl.trim().length < 8

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onCancel} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Cerrar entrega">
        <div className="modal__header">
          <span className="modal__icon">
            <BadgeCheck size={18} />
          </span>
          <div>
            <strong>Cerrar entrega {entrega.folio}</strong>
            <p>
              {entrega.repartidorNombre ?? "Sin repartidor"} · {entrega.zonaNombre}
            </p>
          </div>
        </div>
        <div className="modal__body">
          <TextField
            label="Evidencia de entrega (obligatoria)"
            placeholder="https://evidencia.puntoc.mx/e/…"
            value={evidenciaUrl}
            onChange={(event) => setEvidenciaUrl(event.target.value)}
            hint="Fotografía o comprobante firmado; se adjunta a la asignación."
          />
          <TextareaField
            label="Nota de cierre (opcional)"
            placeholder="Observaciones de la entrega"
            rows={2}
            value={nota}
            onChange={(event) => setNota(event.target.value)}
          />
          <p className="modal__note">
            El sello de cierre lo pone el servidor al confirmar; los sellos respetan asignado ≤ recogido ≤ entregado.
          </p>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
        <div className="modal__footer">
          <Button variant="secondary" onClick={onCancel} disabled={cerrando}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={bloqueado || cerrando}
            title={bloqueado ? "Adjunta la evidencia para cerrar" : undefined}
            onClick={() => onConfirm({ evidenciaUrl: evidenciaUrl.trim(), nota: nota.trim() || undefined })}
          >
            {cerrando ? "Cerrando…" : "Cerrar entrega"}
          </Button>
        </div>
      </div>
    </>
  )
}
