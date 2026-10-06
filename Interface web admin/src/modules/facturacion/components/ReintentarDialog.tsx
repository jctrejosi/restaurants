import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { useReintentarFactura } from "@/modules/facturacion/api"
import type { FacturaDetalle } from "@/modules/facturacion/types"

/** Reintento manual ante el proveedor (RF-R5-82): motivo obligatorio y auditado. */
export function ReintentarDialog({
  open,
  factura,
  onCancel,
  onReintentado,
}: {
  open: boolean
  factura: FacturaDetalle
  onCancel: () => void
  onReintentado: () => void
}) {
  const { mostrar } = useToast()
  const reintentar = useReintentarFactura()
  const numero = `${factura.prefijo}-${factura.numero}`

  return (
    <ConfirmDialog
      open={open}
      title={`Reintentar ${numero}`}
      description="Se reenvía la factura al proveedor de facturación y se registra el intento en la trazabilidad."
      impacto={
        factura.errorProveedor
          ? `Último error (${formatDateTime(factura.errorProveedor.ocurridoEn, factura.zonaHoraria)}): ${factura.errorProveedor.causa}`
          : "No hay errores registrados; el documento quedó pendiente de envío."
      }
      motivoLabel="Motivo del reintento"
      confirmLabel={reintentar.isPending ? "Reintentando…" : "Reintentar envío"}
      onCancel={onCancel}
      onConfirm={(motivo) =>
        reintentar.mutate(
          { facturaId: factura.id, motivo },
          {
            onSuccess: () => {
              mostrar(`Reintento de ${numero} registrado; la factura queda en trámite.`, "exito")
              onReintentado()
            },
            onError: (err) =>
              mostrar(
                err instanceof ApiError ? err.message : "No se pudo reintentar la factura.",
                "error",
              ),
          },
        )
      }
    />
  )
}
