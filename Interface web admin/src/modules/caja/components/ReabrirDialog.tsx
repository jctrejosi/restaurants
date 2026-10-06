import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { useReabrirTurno } from "@/modules/caja/api"
import type { TurnoDetalle } from "@/modules/caja/types"

/**
 * Reapertura V1 (RF-R5-72/RN-R5-06): exige el permiso `caja.reabrir` (se valida
 * antes de abrir el diálogo) y un motivo obligatorio que queda en auditoría.
 */
export function ReabrirDialog({
  open,
  turno,
  onCancel,
  onReabierto,
}: {
  open: boolean
  turno: TurnoDetalle
  onCancel: () => void
  onReabierto: () => void
}) {
  const { mostrar } = useToast()
  const reabrir = useReabrirTurno(turno.id)

  return (
    <ConfirmDialog
      open={open}
      title={`Reabrir turno ${turno.numero}`}
      description="La reapertura habilita el recálculo del cierre; el cierre anterior se conserva como rastro."
      impacto="El turno vuelve a estado abierto y la acción queda auditada con tu usuario, la fecha y el motivo. Se rechaza si la sede ya tiene otro turno abierto."
      motivoLabel="Motivo de la reapertura"
      confirmLabel={reabrir.isPending ? "Reabriendo…" : "Reabrir turno"}
      onCancel={onCancel}
      onConfirm={(motivo) =>
        reabrir.mutate(
          { motivo },
          {
            onSuccess: () => {
              mostrar(`Turno ${turno.numero} reabierto. Queda rastro en la auditoría.`, "exito")
              onReabierto()
            },
            onError: (err) =>
              mostrar(
                err instanceof ApiError ? err.message : "No se pudo reabrir el turno. Reintenta.",
                "error",
              ),
          },
        )
      }
    />
  )
}
