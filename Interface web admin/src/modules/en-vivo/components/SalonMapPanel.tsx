import { useNavigate } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { formatNumber } from "@/lib/format"
import { useSede } from "@/app/sede"
import { useSalonMapa } from "@/modules/salon/api"
import { FloorMapCanvas } from "@/modules/salon/components/FloorMapCanvas"
import { MESA_ESTADO_LABEL, resumenMesas, type MesaEstado } from "@/modules/salon/types"
import "@/modules/salon/salon.css"

/**
 * Mapa del salón dentro de «En vivo»: reutiliza el mismo render del módulo
 * Salón (`FloorMapCanvas`) en modo solo lectura (plan 05 §6.3). El estado de las
 * mesas se actualiza con la operación del APK; el panel solo observa.
 */
export function SalonMapPanel() {
  const navigate = useNavigate()
  const { sedeId, sede } = useSede()
  const sedeConsulta = sedeId ?? "centro"
  const { data, isLoading, isError, refetch } = useSalonMapa(sedeConsulta)

  return (
    <section className="panel salon-panel">
      <div className="panel__header">
        <div>
          <div className="panel__title">Salón</div>
          <div className="panel__subtitle">
            {data?.sedeNombre ?? sede?.nombre ?? "Vista de solo lectura"} · el panel observa, el APK opera
          </div>
        </div>
        <Button variant="ghost" className="text-action" onClick={() => navigate("/salon")}>
          Ver módulo Salón <ChevronRight size={15} />
        </Button>
      </div>

      {isError ? (
        <ErrorState
          title="No pudimos cargar el mapa del salón"
          description="Revisa tu conexión e inténtalo de nuevo."
          onRetry={() => void refetch()}
        />
      ) : isLoading || !data ? (
        <div className="salon-panel__body">
          <SkeletonRows rows={4} columns={5} />
        </div>
      ) : data.mesas.length === 0 ? (
        <EmptyState
          title="Sin mesas configuradas"
          description="Configura zonas y mesas en el módulo Salón para verlas aquí."
          action={{ label: "Ir a Salón", onClick: () => navigate("/salon") }}
        />
      ) : (
        <>
          <div className="salon-preview__resumen salon-panel__resumen">
            {(Object.keys(MESA_ESTADO_LABEL) as MesaEstado[]).map((estado) => (
              <span className="salon-preview__chip" key={estado}>
                <i className={`salon-leyenda__punto salon-leyenda__punto--${estado}`} aria-hidden="true" />
                {MESA_ESTADO_LABEL[estado]}: {formatNumber(resumenMesas(data.mesas)[estado])}
              </span>
            ))}
          </div>

          <div className="salon-panel__body">
            <FloorMapCanvas
              zonas={data.zonas}
              mesas={data.mesas}
              uniones={data.uniones}
              seleccion={[]}
              modo="preview"
            />
          </div>
        </>
      )}
    </section>
  )
}
