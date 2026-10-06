import { useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "react-router-dom"
import { PageHeader } from "@/components/data/PageHeader"
import { Tabs, type TabItem } from "@/components/data/Tabs"
import { NoPermissionState } from "@/components/ui/states"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { useSocketEvent } from "@/lib/realtime"
import { EntregasTab } from "@/modules/domicilio/components/EntregasTab"
import { LiquidacionTab } from "@/modules/domicilio/components/LiquidacionTab"
import { RepartidoresTab } from "@/modules/domicilio/components/RepartidoresTab"
import { ZonasTab } from "@/modules/domicilio/components/ZonasTab"
import "@/modules/domicilio/domicilio.css"

type VistaDomicilio = "zonas" | "repartidores" | "entregas" | "liquidacion"

const VISTAS: VistaDomicilio[] = ["zonas", "repartidores", "entregas", "liquidacion"]

/**
 * Módulo Domicilio (plan admin-modules/09): zonas de cobertura, repartidores,
 * seguimiento de entregas y liquidación por período (V2), en pestañas.
 */
export default function DomicilioPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { tienePermiso } = useAuth()
  const { sedeId, sedes, esGlobal, zonaHoraria, setSedeId } = useSede()

  useSocketEvent(
    [
      "zona.actualizada",
      "repartidor.creado",
      "repartidor.estado",
      "domicilio.asignado",
      "domicilio.estado",
      "liquidacion.generada",
    ],
    () => {
      void queryClient.invalidateQueries({ queryKey: ["domicilio"] })
    },
  )

  const vistaParam = searchParams.get("vista") ?? "zonas"
  const vista: VistaDomicilio = VISTAS.includes(vistaParam as VistaDomicilio)
    ? (vistaParam as VistaDomicilio)
    : "zonas"

  if (!tienePermiso("domicilio.ver")) {
    return (
      <div className="module-page">
        <PageHeader
          eyebrow="Servicio / Domicilio"
          title="Domicilio"
          subtitle="Zonas de cobertura, repartidores, seguimiento de entregas y liquidación."
        />
        <NoPermissionState permiso="domicilio.ver" />
      </div>
    )
  }

  const cambiarVista = (id: string) => {
    const siguiente = new URLSearchParams(searchParams)
    if (id === "zonas") siguiente.delete("vista")
    else siguiente.set("vista", id)
    setSearchParams(siguiente, { replace: true })
  }

  const tabs: TabItem[] = [
    { id: "zonas", label: "Zonas de cobertura" },
    { id: "repartidores", label: "Repartidores" },
    { id: "entregas", label: "Seguimiento de entregas" },
    { id: "liquidacion", label: "Liquidación", badge: "V2" },
  ]

  return (
    <div className="module-page">
      <PageHeader
        eyebrow="Servicio / Domicilio"
        title="Domicilio"
        subtitle="Configura la cobertura que valida la web y opera la entrega: asignación, evidencia, cierre con sello del servidor y liquidación."
      />

      <Tabs tabs={tabs} value={vista} onChange={cambiarVista} />

      {vista === "zonas" ? (
        <ZonasTab
          sucursalId={sedeId}
          esGlobal={esGlobal}
          sedes={sedes}
          zonaHoraria={zonaHoraria}
          onCambiarSede={setSedeId}
        />
      ) : null}

      {vista === "repartidores" ? (
        <RepartidoresTab sucursalId={sedeId} esGlobal={esGlobal} sedes={sedes} onCambiarSede={setSedeId} />
      ) : null}

      {vista === "entregas" ? (
        <EntregasTab
          sucursalId={sedeId}
          esGlobal={esGlobal}
          sedes={sedes}
          zonaHoraria={zonaHoraria}
          onCambiarSede={setSedeId}
        />
      ) : null}

      {vista === "liquidacion" ? (
        <LiquidacionTab sucursalId={sedeId} esGlobal={esGlobal} sedes={sedes} onCambiarSede={setSedeId} />
      ) : null}
    </div>
  )
}
