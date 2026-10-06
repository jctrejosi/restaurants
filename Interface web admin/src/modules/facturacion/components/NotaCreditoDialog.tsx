import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { formatMoney } from "@/lib/format"
import { useCrearNotaCredito } from "@/modules/facturacion/api"
import type { FacturaDetalle } from "@/modules/facturacion/types"

/**
 * Nota crédito (V1, permiso `facturacion.notas`): acción sensible con motivo
 * obligatorio y auditoría. Supuesto V1: la nota cubre el total de la factura.
 */
export function NotaCreditoDialog({
  open,
  factura,
  onCancel,
  onEmitida,
}: {
  open: boolean
  factura: FacturaDetalle
  onCancel: () => void
  onEmitida: () => void
}) {
  const { mostrar } = useToast()
  const crear = useCrearNotaCredito()
  const numero = `${factura.prefijo}-${factura.numero}`

  return (
    <ConfirmDialog
      open={open}
      title={`Emitir nota crédito de ${numero}`}
      description={`Pedido ${factura.pedidoCodigo} · resolución ${factura.resolucion}`}
      impacto={`Se emitirá una nota crédito por ${formatMoney(factura.totalCentavos, factura.moneda)} y la factura quedará anulada. La numeración respeta la resolución vigente.`}
      motivoLabel="Motivo de la nota crédito"
      confirmLabel={crear.isPending ? "Emitiendo…" : "Emitir nota crédito"}
      onCancel={onCancel}
      onConfirm={(motivo) =>
        crear.mutate(
          { facturaId: factura.id, motivo },
          {
            onSuccess: (nota) => {
              mostrar(`Nota crédito ${nota.prefijo}-${nota.numero} emitida y auditada.`, "exito")
              onEmitida()
            },
            onError: (err) =>
              mostrar(
                err instanceof ApiError ? err.message : "No se pudo emitir la nota crédito.",
                "error",
              ),
          },
        )
      }
    />
  )
}
