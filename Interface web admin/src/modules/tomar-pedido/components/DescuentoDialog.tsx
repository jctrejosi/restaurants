import { useEffect, useMemo, useState } from "react"
import { BadgePercent } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { SelectField, TextField, TextareaField } from "@/components/ui/fields"
import { formatMoney } from "@/lib/format"
import { DialogoBase } from "@/modules/tomar-pedido/components/DialogoBase"
import { valorDescuento } from "@/modules/tomar-pedido/totales"
import type { DescuentoAplicado, DescuentoTipo } from "@/modules/tomar-pedido/types"

/**
 * Descuento manual: exige permiso `tomar-pedido.descuento` y motivo obligatorio;
 * queda en `ajuste_pedido` y `evento_auditoria` (RN-R5-01/06).
 */
export function DescuentoDialog({
  open,
  descuento,
  subtotalCentavos,
  moneda,
  usuario,
  puedeDescuento,
  onClose,
  onAplicar,
  onQuitar,
}: {
  open: boolean
  descuento: DescuentoAplicado | null
  subtotalCentavos: number
  moneda?: string
  usuario: string
  puedeDescuento: boolean
  onClose: () => void
  onAplicar: (descuento: DescuentoAplicado) => void
  onQuitar: () => void
}) {
  const [tipo, setTipo] = useState<DescuentoTipo>("porcentaje")
  const [valor, setValor] = useState("")
  const [motivo, setMotivo] = useState("")

  useEffect(() => {
    if (!open) return
    setTipo(descuento?.tipo ?? "porcentaje")
    setValor(
      descuento ? (descuento.tipo === "monto" ? (descuento.valor / 100).toFixed(2) : String(descuento.valor)) : "",
    )
    setMotivo(descuento?.motivo ?? "")
  }, [open, descuento])

  const numero = useMemo(() => {
    const parseado = Number.parseFloat(valor.replace(",", "."))
    return Number.isFinite(parseado) ? parseado : 0
  }, [valor])

  const centavos = Math.round(numero * 100)
  // `valorDescuento` espera el porcentaje como número (0–100) y el monto en centavos.
  const simulacion: DescuentoAplicado | null =
    tipo === "porcentaje"
      ? { tipo, valor: Math.min(100, Math.max(0, numero)), motivo, usuario, aplicadoEn: "" }
      : { tipo, valor: centavos, motivo, usuario, aplicadoEn: "" }
  const impactoCentavos = valorDescuento(subtotalCentavos, simulacion)

  const error: string | null = !puedeDescuento
    ? "Requiere permiso tomar-pedido.descuento"
    : motivo.trim().length < 3
      ? "El motivo es obligatorio (mín. 3 caracteres)"
      : numero <= 0
        ? "Captura un valor mayor a cero"
        : tipo === "porcentaje" && numero > 100
          ? "El porcentaje no puede superar 100%"
          : tipo === "monto" && centavos > subtotalCentavos
            ? `El monto no puede superar el subtotal (${formatMoney(subtotalCentavos, moneda)})`
            : null

  return (
    <DialogoBase
      open={open}
      onClose={onClose}
      icon={<BadgePercent size={18} />}
      title={descuento ? "Editar descuento" : "Aplicar descuento"}
      subtitle="El descuento se aplica sobre el subtotal antes de impuestos"
      footer={
        <>
          {descuento ? (
            <Button
              variant="secondary"
              className="tp-dialogo__izquierda"
              onClick={() => {
                onQuitar()
                onClose()
              }}
            >
              Quitar descuento
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={Boolean(error)}
            title={error ?? undefined}
            onClick={() => {
              if (error) return
              const limpio: DescuentoAplicado = {
                tipo,
                valor:
                  tipo === "porcentaje" ? Math.round(Math.min(100, Math.max(0, numero))) : centavos,
                motivo: motivo.trim(),
                usuario,
                aplicadoEn: new Date().toISOString(),
              }
              onAplicar(limpio)
              onClose()
            }}
          >
            {descuento ? "Guardar descuento" : "Aplicar descuento"}
          </Button>
        </>
      }
    >
      <div className="tp-descuento__campos">
        <SelectField
          label="Tipo"
          options={[
            { value: "porcentaje", label: "Porcentaje" },
            { value: "monto", label: "Monto fijo" },
          ]}
          value={tipo}
          onChange={(event) => setTipo(event.target.value as DescuentoTipo)}
        />
        <TextField
          label={tipo === "porcentaje" ? "Porcentaje (%)" : "Monto (MXN)"}
          placeholder={tipo === "porcentaje" ? "10" : "50.00"}
          inputMode="decimal"
          value={valor}
          onChange={(event) => setValor(event.target.value)}
        />
      </div>

      <TextareaField
        label="Motivo (obligatorio)"
        placeholder="Ej. Cortesía por demora en el servicio"
        rows={3}
        value={motivo}
        onChange={(event) => setMotivo(event.target.value)}
      />

      <p className="modal__impact">
        Impacto: <strong>{formatMoney(impactoCentavos, moneda)}</strong> sobre un subtotal de{" "}
        {formatMoney(subtotalCentavos, moneda)}.
      </p>
      <p className="modal__note">
        Queda auditado con tu usuario ({usuario}) y la hora del servidor, en ajuste de pedido y evento de
        auditoría.
      </p>
    </DialogoBase>
  )
}
