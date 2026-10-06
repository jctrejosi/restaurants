import { formatNumber } from "@/lib/format"
import { CELDA, type Mesa, type Zona } from "@/modules/salon/types"

/** Fondo de la zona en el mapa: nombre, aforo y ocupación actual. */
export function ZoneOverlay({ zona, mesas }: { zona: Zona; mesas: Mesa[] }) {
  const enZona = mesas.filter((mesa) => mesa.zonaId === zona.id)
  const fueraServicio = enZona.filter((mesa) => mesa.estado === "fuera_servicio" || !mesa.activa).length
  const ocupadas = enZona.filter((mesa) => mesa.estado === "ocupada" || mesa.estado === "por_cobrar").length

  return (
    <div
      className="salon-zona"
      style={{
        left: zona.x * CELDA,
        top: zona.y * CELDA,
        width: zona.ancho * CELDA,
        height: zona.alto * CELDA,
      }}
    >
      <div className="salon-zona__head">
        <strong>{zona.nombre}</strong>
        <span>
          Aforo {formatNumber(zona.aforo)} · {enZona.length} mesas · {ocupadas} ocupadas
          {fueraServicio > 0 ? ` · ${fueraServicio} fuera de servicio` : ""}
        </span>
      </div>
    </div>
  )
}
