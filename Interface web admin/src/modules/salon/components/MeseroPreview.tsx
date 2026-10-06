import { X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { formatNumber } from "@/lib/format"
import { MESA_ESTADO_LABEL, resumenMesas, type SalonMapa } from "@/modules/salon/types"
import { FloorMapCanvas } from "@/modules/salon/components/FloorMapCanvas"

/** Vista previa «así lo verá el mesero»: mismo render del mapa en solo lectura. */
export function MeseroPreview({ mapa, onClose }: { mapa: SalonMapa; onClose: () => void }) {
  const resumen = resumenMesas(mapa.mesas)

  return (
    <div className="salon-preview" role="dialog" aria-modal="true" aria-label="Vista previa del mesero">
      <div className="salon-preview__header">
        <div>
          <strong>Así lo verá el mesero</strong>
          <span>
            Vista de solo lectura ({mapa.sedeNombre}). Los estados se actualizan con la operación del APK; el panel solo
            observa (plan 05 §1).
          </span>
        </div>
        <Button variant="secondary" onClick={onClose}>
          <X size={15} /> Cerrar
        </Button>
      </div>

      <div className="salon-preview__resumen">
        {Object.entries(resumen).map(([estado, total]) => (
          <span className="salon-preview__chip" key={estado}>
            <i className={`salon-leyenda__punto salon-leyenda__punto--${estado}`} aria-hidden="true" />
            {MESA_ESTADO_LABEL[estado as keyof typeof MESA_ESTADO_LABEL]}: {formatNumber(total)}
          </span>
        ))}
      </div>

      <div className="salon-preview__body">
        <FloorMapCanvas
          zonas={mapa.zonas}
          mesas={mapa.mesas}
          uniones={mapa.uniones}
          seleccion={[]}
          modo="preview"
        />
      </div>

      <p className="salon-nota">
        Una mesa `fuera_servicio` o con `activa=false` no aparece como candidata en la disponibilidad de reservas ni en las
        interfaces de cliente/mesero (criterio de aceptación 2).
      </p>
    </div>
  )
}
