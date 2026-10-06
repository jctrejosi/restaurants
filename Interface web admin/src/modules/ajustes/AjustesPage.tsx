import { useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Globe, RefreshCw, Settings } from "lucide-react"
import { PageHeader } from "@/components/data/PageHeader"
import { Tabs, type TabItem } from "@/components/data/Tabs"
import { Button } from "@/components/ui/Button"
import { EmptyState, NoPermissionState } from "@/components/ui/states"
import { SelectField } from "@/components/ui/fields"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { useSocketEvent } from "@/lib/realtime"
import { DatosHorariosTab } from "@/modules/ajustes/components/DatosHorariosTab"
import { NotificacionesTab } from "@/modules/ajustes/components/NotificacionesTab"
import { ParametrosTab } from "@/modules/ajustes/components/ParametrosTab"
import { ProgramacionTab } from "@/modules/ajustes/components/ProgramacionTab"
import { SucursalesTab } from "@/modules/ajustes/components/SucursalesTab"
import "@/modules/ajustes/ajustes.css"

const TABS: TabItem[] = [
  { id: "datos", label: "Datos y horarios" },
  { id: "parametros", label: "Parámetros" },
  { id: "notificaciones", label: "Notificaciones (V1)" },
  { id: "programacion", label: "Programación (V1)" },
  { id: "sucursales", label: "Sucursales" },
]

export default function AjustesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { tienePermiso } = useAuth()
  const { sedeId, sede, sedes, esGlobal, setSedeId } = useSede()

  const tabSolicitada = searchParams.get("tab") ?? "datos"
  const tab = TABS.some((item) => item.id === tabSolicitada) ? tabSolicitada : "datos"
  const puedeVer = tienePermiso("ajustes.ver")
  const puedeEditar = tienePermiso("ajustes.editar")
  const puedeGlobal = tienePermiso("ajustes.global")
  const puedeNotificacionesVer = tienePermiso("notificaciones.ver")
  const puedeNotificacionesEditar = tienePermiso("notificaciones.editar")
  const puedeCrearSucursal = tienePermiso("sucursales.crear")

  useSocketEvent(
    [
      "sucursal.actualizada",
      "ajustes.actualizados",
      "horario.actualizado",
      "cierre.actualizado",
      "plantilla.actualizada",
      "sede.creada",
    ],
    () => {
      void queryClient.invalidateQueries({ queryKey: ["ajustes"] })
      void queryClient.invalidateQueries({ queryKey: ["sucursales"] })
    },
  )

  const cambiarTab = (id: string) => {
    const siguiente = new URLSearchParams(searchParams)
    if (id === "datos") siguiente.delete("tab")
    else siguiente.set("tab", id)
    setSearchParams(siguiente, { replace: true })
  }

  if (!puedeVer) {
    return (
      <div className="module-page">
        <PageHeader eyebrow="Configuración / Sucursal y ajustes" title="Sucursal y ajustes" />
        <NoPermissionState permiso="ajustes.ver" />
      </div>
    )
  }

  return (
    <div className="module-page">
      <PageHeader
        eyebrow="Configuración / Sucursal y ajustes"
        title="Sucursal y ajustes"
        subtitle="Datos, horarios y parámetros que rigen la operación de la sede y los formatos del panel."
        actions={
          <>
            {esGlobal ? (
              <SelectField
                label="Sede a configurar"
                options={sedes.map((item) => ({ value: item.id, label: item.nombre }))}
                value={sedeId ?? ""}
                onChange={(event) => setSedeId(event.target.value || null)}
              />
            ) : (
              <span className="ajustes-sede">
                <Settings size={14} /> {sede?.nombre ?? "Sede"} · {sede?.zonaHoraria}
              </span>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                void queryClient.invalidateQueries({ queryKey: ["ajustes"] })
                void queryClient.invalidateQueries({ queryKey: ["sucursales"] })
              }}
            >
              <RefreshCw size={15} /> Actualizar
            </Button>
          </>
        }
      />

      <Tabs tabs={TABS} value={tab} onChange={cambiarTab} />

      {tab !== "sucursales" && !sedeId ? (
        <EmptyState
          title="Selecciona una sede para configurar"
          description="Los ajustes de operación, horarios y notificaciones se administran por sucursal. Elige una en el selector de la barra superior."
          icon={<Globe size={22} />}
          action={{ label: "Usar la primera sede", onClick: () => setSedeId(sedes[0]?.id ?? null) }}
        />
      ) : tab === "datos" ? (
        <DatosHorariosTab puedeEditar={puedeEditar} puedeGlobal={puedeGlobal} />
      ) : tab === "parametros" ? (
        <ParametrosTab puedeEditar={puedeEditar} />
      ) : tab === "notificaciones" ? (
        <NotificacionesTab puedeVer={puedeNotificacionesVer} puedeEditar={puedeNotificacionesEditar} />
      ) : tab === "programacion" ? (
        <ProgramacionTab puedeEditar={puedeEditar} />
      ) : (
        <SucursalesTab puedeCrear={puedeCrearSucursal} />
      )}
    </div>
  )
}
