import { useEffect, useState } from "react"
import { CreditCard } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { SelectField, TextField } from "@/components/ui/fields"
import { ApiError } from "@/lib/api"
import { useGuardarMedioPago } from "@/modules/caja/api"
import { MEDIO_PAGO_TIPO_LABEL, type MedioPago, type MedioPagoTipo } from "@/modules/caja/types"

const TIPOS: { value: MedioPagoTipo; label: string }[] = (
  Object.keys(MEDIO_PAGO_TIPO_LABEL) as MedioPagoTipo[]
).map((tipo) => ({ value: tipo, label: MEDIO_PAGO_TIPO_LABEL[tipo] }))

/** Alta/edición de un medio de pago de la sede (RF-R5-73). */
export function MedioPagoForm({
  open,
  medio,
  onCancel,
  onGuardado,
}: {
  open: boolean
  medio: MedioPago | null
  onCancel: () => void
  onGuardado: (medio: MedioPago) => void
}) {
  const [nombre, setNombre] = useState("")
  const [tipo, setTipo] = useState<MedioPagoTipo>("efectivo")
  const [requiereReferencia, setRequiereReferencia] = useState(false)
  const [activo, setActivo] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const guardar = useGuardarMedioPago()

  useEffect(() => {
    if (!open) return
    setNombre(medio?.nombre ?? "")
    setTipo(medio?.tipo ?? "efectivo")
    setRequiereReferencia(medio?.requiereReferencia ?? false)
    setActivo(medio?.activo ?? true)
    setError(null)
  }, [open, medio])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  const bloqueado = nombre.trim().length < 3 || guardar.isPending

  const confirmar = () => {
    setError(null)
    guardar.mutate(
      { id: medio?.id, nombre: nombre.trim(), tipo, requiereReferencia, activo },
      {
        onSuccess: (guardado) => onGuardado(guardado),
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "No se pudo guardar el medio de pago."),
      },
    )
  }

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onCancel} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Medio de pago">
        <div className="modal__header">
          <span className="modal__icon">
            <CreditCard size={18} />
          </span>
          <div>
            <strong>{medio ? `Editar ${medio.nombre}` : "Nuevo medio de pago"}</strong>
            <p>Desactivar un medio no altera los pagos ya registrados.</p>
          </div>
        </div>
        <div className="modal__body">
          <TextField
            label="Nombre"
            placeholder="Efectivo, Tarjeta, Transferencia…"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
          />
          <SelectField
            label="Tipo"
            options={TIPOS}
            value={tipo}
            onChange={(event) => setTipo(event.target.value as MedioPagoTipo)}
          />
          <label className="caja-check">
            <input
              type="checkbox"
              checked={requiereReferencia}
              onChange={(event) => setRequiereReferencia(event.target.checked)}
            />
            <span>Requiere referencia o autorización al cobrar</span>
          </label>
          <label className="caja-check">
            <input type="checkbox" checked={activo} onChange={(event) => setActivo(event.target.checked)} />
            <span>Activo: se ofrece en las interfaces de cobro</span>
          </label>
          {error ? <p className="modal__impact">{error}</p> : null}
          <p className="modal__note">Los cambios de medios de pago quedan auditados con el antes y el después.</p>
        </div>
        <div className="modal__footer">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={bloqueado} onClick={confirmar}>
            {guardar.isPending ? "Guardando…" : medio ? "Guardar cambios" : "Crear medio"}
          </Button>
        </div>
      </div>
    </>
  )
}
