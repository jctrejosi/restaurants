import { useParams } from "react-router-dom"
import { PageHeader } from "@/components/data/PageHeader"
import { NoPermissionState } from "@/components/ui/states"
import { useAuth } from "@/app/auth"
import { CajaLista } from "@/modules/caja/components/CajaLista"
import { TurnoPanel } from "@/modules/caja/components/TurnoPanel"
import "@/modules/caja/caja.css"

/**
 * `/caja` y `/caja/:turnoId` (módulo 11): lista de turnos con consolidado y
 * medios de pago, o el panel de un turno concreto.
 */
export default function CajaPage() {
  const { tienePermiso } = useAuth()
  const { turnoId } = useParams<{ turnoId?: string }>()

  if (!tienePermiso("caja.ver")) {
    return (
      <div className="module-page">
        <PageHeader eyebrow="Dinero / Caja" title="Caja y turnos" />
        <NoPermissionState permiso="caja.ver" />
      </div>
    )
  }

  return turnoId ? <TurnoPanel turnoId={turnoId} /> : <CajaLista />
}
