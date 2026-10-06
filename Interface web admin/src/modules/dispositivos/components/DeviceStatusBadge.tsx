import { StatusBadge } from "@/components/ui/StatusBadge"
import { ESTADO_DISPOSITIVO_LABEL, type Dispositivo } from "@/modules/dispositivos/types"

/** Estado operativo visible: revocado, desactualizado, sin conexión o vinculado. */
export function DeviceStatusBadge({
  dispositivo,
  desactualizado,
}: {
  dispositivo: Dispositivo
  desactualizado?: boolean
}) {
  if (dispositivo.estado === "revocado") return <StatusBadge tone="gray">Revocado</StatusBadge>
  if (desactualizado) {
    return (
      <StatusBadge tone="amber" title="Por debajo de la versión mínima configurada">
        Desactualizado
      </StatusBadge>
    )
  }
  if (dispositivo.ultimaConexionEn === null) {
    return (
      <StatusBadge tone="blue" title="Nunca se ha conectado; el equipo sigue visible">
        Sin conexión
      </StatusBadge>
    )
  }
  return <StatusBadge tone="green">{ESTADO_DISPOSITIVO_LABEL[dispositivo.estado]}</StatusBadge>
}
