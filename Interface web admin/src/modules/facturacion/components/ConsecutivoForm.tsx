import { useEffect, useState } from "react"
import { Hash } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { TextField } from "@/components/ui/fields"
import { TIPO_CONSECUTIVO_LABEL, type ConsecutivoConfig } from "@/modules/facturacion/types"

/**
 * Edición de un consecutivo. El `siguiente` **solo avanza al emitir**: aquí es de
 * solo lectura y el backend rechaza cualquier intento de bajarlo (RF-R5-81).
 */
export function ConsecutivoForm({
  open,
  consecutivo,
  onCancel,
  onGuardar,
}: {
  open: boolean
  consecutivo: ConsecutivoConfig | null
  onCancel: () => void
  onGuardar: (consecutivo: ConsecutivoConfig) => void
}) {
  const [prefijo, setPrefijo] = useState("")
  const [resolucion, setResolucion] = useState("")
  const [vigencia, setVigencia] = useState("")

  useEffect(() => {
    if (!open || !consecutivo) return
    setPrefijo(consecutivo.prefijo)
    setResolucion(consecutivo.resolucion)
    setVigencia(consecutivo.vigenciaHasta)
  }, [open, consecutivo])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onCancel])

  if (!open || !consecutivo) return null

  const bloqueado = prefijo.trim().length === 0 || resolucion.trim().length < 3 || !vigencia

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onCancel} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Consecutivo">
        <div className="modal__header">
          <span className="modal__icon">
            <Hash size={18} />
          </span>
          <div>
            <strong>
              {consecutivo.sucursalNombre} · {TIPO_CONSECUTIVO_LABEL[consecutivo.tipo]}
            </strong>
            <p>La numeración respeta la resolución; el consecutivo solo avanza al emitir.</p>
          </div>
        </div>
        <div className="modal__body">
          <TextField
            label="Prefijo"
            value={prefijo}
            onChange={(event) => setPrefijo(event.target.value.toUpperCase())}
          />
          <TextField
            label="Siguiente número"
            value={String(consecutivo.siguiente)}
            readOnly
            disabled
            hint="Solo avanza al emitir; no se puede bajar desde el panel."
          />
          <TextField
            label="Resolución"
            placeholder="RES-18745-2024"
            value={resolucion}
            onChange={(event) => setResolucion(event.target.value.toUpperCase())}
          />
          <TextField
            label="Vigencia hasta"
            type="date"
            value={vigencia}
            onChange={(event) => setVigencia(event.target.value)}
          />
          {consecutivo.vigenciaEstado === "vencida" ? (
            <p className="modal__impact">
              La resolución está vencida: la emisión y el reintento se bloquean (409) hasta renovarla.
            </p>
          ) : consecutivo.vigenciaEstado === "por_vencer" ? (
            <p className="modal__impact">La vigencia está próxima a vencer: renueva la resolución a tiempo.</p>
          ) : null}
        </div>
        <div className="modal__footer">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={bloqueado}
            onClick={() =>
              onGuardar({
                ...consecutivo,
                prefijo: prefijo.trim().toUpperCase(),
                resolucion: resolucion.trim().toUpperCase(),
                vigenciaHasta: vigencia,
              })
            }
          >
            Aplicar cambio
          </Button>
        </div>
      </div>
    </>
  )
}
