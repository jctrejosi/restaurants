import { useEffect, useState } from "react"
import { Percent } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { SelectField, TextField } from "@/components/ui/fields"
import { TIPO_IMPUESTO_LABEL, type ImpuestoConfig } from "@/modules/facturacion/types"

/** Alta/edición de un impuesto (tasa en bps; 1900 = 19 %). */
export function ImpuestoForm({
  open,
  impuesto,
  onCancel,
  onGuardar,
}: {
  open: boolean
  impuesto: ImpuestoConfig | null
  onCancel: () => void
  onGuardar: (impuesto: ImpuestoConfig) => void
}) {
  const [nombre, setNombre] = useState("")
  const [tasa, setTasa] = useState("16")
  const [tipo, setTipo] = useState<ImpuestoConfig["tipo"]>("adicionado")
  const [activo, setActivo] = useState(true)

  useEffect(() => {
    if (!open) return
    setNombre(impuesto?.nombre ?? "")
    setTasa(impuesto ? String(impuesto.tasaBps / 100) : "16")
    setTipo(impuesto?.tipo ?? "adicionado")
    setActivo(impuesto?.activo ?? true)
  }, [open, impuesto])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  const tasaBps = Math.round(Number(tasa) * 100)
  const bloqueado = nombre.trim().length < 3 || !Number.isFinite(tasaBps) || tasaBps < 0 || tasaBps > 100_000

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onCancel} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Impuesto">
        <div className="modal__header">
          <span className="modal__icon">
            <Percent size={18} />
          </span>
          <div>
            <strong>{impuesto ? `Editar ${impuesto.nombre}` : "Nuevo impuesto"}</strong>
            <p>Los cambios de tasa, tipo y estado quedan auditados con el antes y el después.</p>
          </div>
        </div>
        <div className="modal__body">
          <TextField
            label="Nombre"
            placeholder="IVA 16%"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
          />
          <TextField
            label="Tasa (%)"
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={tasa}
            hint={`Se guarda en puntos base: ${Number.isFinite(tasaBps) ? tasaBps : 0} bps`}
            onChange={(event) => setTasa(event.target.value)}
          />
          <SelectField
            label="Tipo"
            options={(Object.keys(TIPO_IMPUESTO_LABEL) as ImpuestoConfig["tipo"][]).map((valor) => ({
              value: valor,
              label: TIPO_IMPUESTO_LABEL[valor],
            }))}
            value={tipo}
            onChange={(event) => setTipo(event.target.value as ImpuestoConfig["tipo"])}
          />
          <label className="facturacion-check">
            <input type="checkbox" checked={activo} onChange={(event) => setActivo(event.target.checked)} />
            <span>Activo: se aplica en la emisión</span>
          </label>
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
                id: impuesto?.id ?? `imp-${Date.now()}`,
                nombre: nombre.trim(),
                tasaBps,
                tipo,
                activo,
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
