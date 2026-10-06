import { useEffect, useState } from "react"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { SelectField, TextField, TextareaField, type SelectOption } from "@/components/ui/fields"
import { formatMoney } from "@/lib/format"
import type { PedidoPago, ReembolsoTipo } from "@/modules/pedidos/types"

const TIPOS: SelectOption[] = [
  { value: "reembolso", label: "Reembolso al medio original" },
  { value: "nota_credito", label: "Nota crédito" },
]

/** Reembolso / nota crédito (V1) conciliado con el pago original (RF-R5-54). */
export function ReembolsoDialog({
  open,
  pago,
  onCancel,
  onConfirm,
}: {
  open: boolean
  pago: PedidoPago | null
  onCancel: () => void
  onConfirm: (payload: { tipo: ReembolsoTipo; montoCentavos: number; motivo: string }) => void
}) {
  const [tipo, setTipo] = useState<ReembolsoTipo>("reembolso")
  const [monto, setMonto] = useState("")
  const [motivo, setMotivo] = useState("")

  const maximo = pago ? pago.montoCentavos / 100 : 0

  useEffect(() => {
    if (!open) return
    setTipo("reembolso")
    setMonto(pago ? (pago.montoCentavos / 100).toFixed(2) : "")
    setMotivo("")
  }, [open, pago])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onCancel])

  if (!open || !pago) return null

  const montoCentavos = Math.round(Number(monto) * 100)
  const excede = montoCentavos > pago.montoCentavos
  const bloqueado = motivo.trim().length < 3 || !Number.isFinite(montoCentavos) || montoCentavos <= 0 || excede

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onCancel} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Reembolso del pedido">
        <div className="modal__header">
          <span className="modal__icon">
            <RotateCcw size={18} />
          </span>
          <div>
            <strong>Reembolso o nota crédito</strong>
            <p>
              Pago con {pago.medio} · máximo disponible {formatMoney(pago.montoCentavos)}
            </p>
          </div>
        </div>
        <div className="modal__body">
          <SelectField
            label="Tipo"
            options={TIPOS}
            value={tipo}
            onChange={(event) => setTipo(event.target.value as ReembolsoTipo)}
          />
          <TextField
            label="Monto (MXN)"
            type="number"
            min={0}
            step="0.01"
            value={monto}
            hint={`No puede superar ${formatMoney(pago.montoCentavos)}`}
            onChange={(event) => setMonto(event.target.value)}
          />
          {excede ? (
            <p className="modal__impact">El reembolso no puede superar el pago original. Ajusta el monto.</p>
          ) : null}
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
            title={bloqueado ? "Revisa el monto y escribe un motivo de al menos 3 caracteres" : undefined}
            onClick={() => onConfirm({ tipo, montoCentavos, motivo: motivo.trim() })}
          >
            Confirmar reembolso
          </Button>
        </div>
      </div>
    </>
  )
}
