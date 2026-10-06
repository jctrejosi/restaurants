import { StatusBadge } from "@/components/ui/StatusBadge"
import { ESTADO_DIAN_LABEL, ESTADO_DIAN_TONE, type EstadoDian } from "@/modules/facturacion/types"

/**
 * Semáforo de `estado_dian` con etiqueta en español. «Rechazada» usa un tono
 * propio del módulo (rojo) sin ocultar nunca la causa (RF-R5-82).
 */
export function EstadoDianBadge({ estado, title }: { estado: EstadoDian; title?: string }) {
  if (estado === "rechazada") {
    return (
      <span className="status facturacion-status--rechazada" title={title ?? "El proveedor rechazó el documento"}>
        {ESTADO_DIAN_LABEL.rechazada}
      </span>
    )
  }
  return (
    <StatusBadge tone={ESTADO_DIAN_TONE[estado]} title={title}>
      {ESTADO_DIAN_LABEL[estado]}
    </StatusBadge>
  )
}
