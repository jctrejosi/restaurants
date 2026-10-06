import { useEffect, useState } from "react"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { TextField } from "@/components/ui/fields"
import { ApiError } from "@/lib/api"
import { formatMoney } from "@/lib/format"
import { useReembolsarPago } from "@/modules/pagos/api"
import type { PagoDetalle } from "@/modules/pagos/types"
import { aCentavos, aPesos } from "@/modules/pagos/utils"

/**
 * Reembolso (RN-R5-06/CA-12-03): muestra el **máximo reembolsable**, nunca deja
 * escribir un monto mayor y confirma con motivo obligatorio y auditoría. El error
 * del servidor (422 con el máximo) se refleja en el propio diálogo.
 */
export function ReembolsoDialog({
  open,
  pago,
  onCancel,
  onConfirmado,
}: {
  open: boolean
  pago: PagoDetalle | null
  onCancel: () => void
  onConfirmado: () => void
}) {
  const [paso, setPaso] = useState<"monto" | "confirmar">("monto")
  const [monto, setMonto] = useState("")
  const [error, setError] = useState<string | null>(null)
  const reembolsar = useReembolsarPago()

  useEffect(() => {
    if (!open) return
    setPaso("monto")
    setError(null)
    setMonto(pago ? aPesos(pago.reembolso.maximoCentavos) : "")
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

  const maximo = pago.reembolso.maximoCentavos
  const montoCentavos = aCentavos(monto)
  const excede = montoCentavos !== null && montoCentavos > maximo
  const invalido = montoCentavos === null || montoCentavos <= 0 || excede

  const confirmar = (motivo: string) => {
    if (montoCentavos === null) return
    setError(null)
    reembolsar.mutate(
      { pagoId: pago.id, montoCentavos, motivo },
      {
        onSuccess: () => onConfirmado(),
        onError: (err) => {
          setError(err instanceof ApiError ? err.message : "No se pudo registrar el reembolso.")
          setPaso("monto")
        },
      },
    )
  }

  if (paso === "confirmar") {
    return (
      <ConfirmDialog
        open
        title={`Reembolsar ${formatMoney(montoCentavos ?? 0, pago.moneda)}`}
        description={`Pago ${pago.id} · ${pago.pedidoCodigo} · ${pago.medioNombre}`}
        impacto={`Máximo reembolsable ${formatMoney(maximo, pago.moneda)}. El reverso se hace al medio original y queda auditado.`}
        motivoLabel="Motivo del reembolso"
        confirmLabel={reembolsar.isPending ? "Reembolsando…" : "Confirmar reembolso"}
        onCancel={() => setPaso("monto")}
        onConfirm={confirmar}
      />
    )
  }

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onCancel} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Reembolso del pago">
        <div className="modal__header">
          <span className="modal__icon">
            <RotateCcw size={18} />
          </span>
          <div>
            <strong>Reembolsar pago</strong>
            <p>
              {pago.pedidoCodigo} · {pago.medioNombre} · máximo reembolsable {formatMoney(maximo, pago.moneda)}
            </p>
          </div>
        </div>
        <div className="modal__body">
          <TextField
            label={`Monto a reembolsar (${pago.moneda})`}
            type="number"
            min={0}
            step="0.01"
            value={monto}
            hint={`No puede superar ${formatMoney(maximo, pago.moneda)}; V1 asume reembolso total por pago.`}
            onChange={(event) => setMonto(event.target.value)}
          />
          {excede ? (
            <p className="modal__impact">
              El reembolso no puede superar el pago original. Ajusta el monto al máximo permitido.
            </p>
          ) : null}
          {error ? <p className="modal__impact">{error}</p> : null}
          <p className="modal__note">
            El reembolso exige el permiso <code>pagos.reembolsar</code> y deja rastro en auditoría.
          </p>
        </div>
        <div className="modal__footer">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={invalido}
            title={invalido ? "Escribe un monto mayor a 0 y dentro del máximo" : undefined}
            onClick={() => setPaso("confirmar")}
          >
            Continuar
          </Button>
        </div>
      </div>
    </>
  )
}
