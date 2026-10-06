import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Armchair, Eye, Gauge, LayoutGrid, Link2, Table2 } from "lucide-react"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { PageHeader } from "@/components/data/PageHeader"
import { Tabs } from "@/components/data/Tabs"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SelectField, type SelectOption } from "@/components/ui/fields"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { ErrorState, NoPermissionState } from "@/components/ui/states"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { useExportarSalon, useSalonMapa } from "@/modules/salon/api"
import { AforoGrid } from "@/modules/salon/components/AforoGrid"
import { FloorMapEditor } from "@/modules/salon/components/FloorMapEditor"
import { MeseroPreview } from "@/modules/salon/components/MeseroPreview"
import { UnionEditor } from "@/modules/salon/components/UnionEditor"
import { ZonasMesasTabla } from "@/modules/salon/components/ZonasMesasTabla"
import { MESA_ESTADO_LABEL, resumenMesas, type MesaEstado } from "@/modules/salon/types"
import "@/modules/salon/salon.css"

const VISTAS = ["mapa", "elementos", "uniones", "aforo"] as const

export default function SalonPage() {
  const { tienePermiso } = useAuth()
  const { sedeId, sedes, esGlobal } = useSede()
  const [searchParams, setSearchParams] = useSearchParams()
  const { mostrar } = useToast()

  const [preview, setPreview] = useState(false)
  const [cambiosPendientes, setCambiosPendientes] = useState(0)
  const [tabPendiente, setTabPendiente] = useState<string | null>(null)

  const sedeParam = searchParams.get("sede")
  const sedeActiva = sedeParam ?? sedeId ?? sedes[0]?.id ?? "centro"
  const vistaParam = searchParams.get("vista") ?? "mapa"
  const vista = (VISTAS as readonly string[]).includes(vistaParam) ? vistaParam : "mapa"

  const mapa = useSalonMapa(sedeActiva)
  const exportar = useExportarSalon()

  if (!tienePermiso("salon.ver")) {
    return (
      <div className="module-page">
        <PageHeader
          eyebrow="Operación / Salón"
          title="Salón"
          subtitle="Mapa, zonas, mesas, estados, uniones y aforo."
        />
        <NoPermissionState permiso="salon.ver" />
      </div>
    )
  }

  const cambiarVista = (id: string) => {
    if (cambiosPendientes > 0 && id !== vista) {
      setTabPendiente(id)
      return
    }
    aplicarVista(id)
  }

  const aplicarVista = (id: string) => {
    const siguiente = new URLSearchParams(searchParams)
    if (id === "mapa") siguiente.delete("vista")
    else siguiente.set("vista", id)
    setSearchParams(siguiente, { replace: true })
  }

  const exportarPlano = (formato: "pdf" | "png" | "csv") => {
    exportar.mutate(
      { tipo: formato === "csv" ? "elementos" : "plano", formato },
      {
        onSuccess: () => mostrar("Exportación registrada. El plano se genera en segundo plano (RN-R5-10).", "exito"),
        onError: (error) => mostrar(error instanceof ApiError ? error.message : "No se pudo registrar la exportación.", "error"),
      },
    )
  }

  const resumen = mapa.data ? resumenMesas(mapa.data.mesas) : null
  const opcionesSede: SelectOption[] = sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))

  return (
    <div className="module-page">
      <PageHeader
        eyebrow="Operación / Salón"
        title="Salón"
        subtitle="El mapa debe coincidir con el salón real: zonas, mesas, estados, mantenimiento, uniones y aforo."
        actions={
          <Button variant="secondary" disabled={!mapa.data} onClick={() => setPreview(true)}>
            <Eye size={15} /> Vista del mesero
          </Button>
        }
      />

      <div className="salon-barra">
        {esGlobal || sedeParam ? (
          <SelectField
            label="Sede visible"
            options={opcionesSede}
            value={sedeActiva}
            onChange={(event) => {
              const siguiente = new URLSearchParams(searchParams)
              siguiente.set("sede", event.target.value)
              setSearchParams(siguiente, { replace: true })
            }}
          />
        ) : (
          <span className="salon-barra__sede">{mapa.data?.sedeNombre ?? "Cargando sede…"}</span>
        )}
        {resumen ? (
          <div className="salon-barra__resumen">
            {(Object.keys(resumen) as MesaEstado[]).map((estado) => (
              <span className="salon-barra__chip" key={estado}>
                <i className={`salon-leyenda__punto salon-leyenda__punto--${estado}`} aria-hidden="true" />
                {MESA_ESTADO_LABEL[estado]}: {resumen[estado]}
              </span>
            ))}
          </div>
        ) : null}
        <span className="salon-barra__hint">
          {mapa.data ? `Actualizado ${new Date(mapa.data.actualizadoEn).toLocaleTimeString("es-MX")}` : ""}
        </span>
      </div>

      <Tabs
        tabs={[
          { id: "mapa", label: <><LayoutGrid size={14} /> Mapa</> },
          { id: "elementos", label: <><Table2 size={14} /> Zonas y mesas</> },
          { id: "uniones", label: <><Link2 size={14} /> Uniones</>, badge: "V1" },
          { id: "aforo", label: <><Gauge size={14} /> Franjas y aforo</>, badge: "V1" },
        ]}
        value={vista}
        onChange={cambiarVista}
      />

      {mapa.isError ? (
        <ErrorState
          title="No pudimos cargar el salón"
          description="Revisa tu conexión e inténtalo de nuevo."
          onRetry={() => void mapa.refetch()}
        />
      ) : mapa.isLoading || !mapa.data ? (
        <SkeletonRows rows={7} columns={4} />
      ) : (
        <>
          {vista === "mapa" ? (
            <FloorMapEditor
              mapa={mapa.data}
              onPreview={() => setPreview(true)}
              onExportar={exportarPlano}
              exportando={exportar.isPending}
              onCambiosSinGuardar={setCambiosPendientes}
            />
          ) : null}
          {vista === "elementos" ? <ZonasMesasTabla mapa={mapa.data} /> : null}
          {vista === "uniones" ? <UnionEditor mapa={mapa.data} /> : null}
          {vista === "aforo" ? <AforoGrid mapa={mapa.data} /> : null}
        </>
      )}

      <p className="salon-nota">
        <Armchair size={12} /> La baja de una mesa es lógica (`activa=false`) y el bloqueo por mantenimiento es
        `fuera_servicio`: ninguna de las dos se ofrece en web, APK ni quiosco (RN-R5-11).
      </p>

      {preview && mapa.data ? <MeseroPreview mapa={mapa.data} onClose={() => setPreview(false)} /> : null}

      <ConfirmDialog
        open={Boolean(tabPendiente)}
        title="Tienes posiciones sin guardar"
        description="Si cambias de pestaña perderás los movimientos de mesas que no guardaste."
        impacto={`${cambiosPendientes} mesa(s) con posición sin guardar.`}
        motivoObligatorio={false}
        confirmLabel="Descartar y continuar"
        onCancel={() => setTabPendiente(null)}
        onConfirm={() => {
          if (tabPendiente) aplicarVista(tabPendiente)
          setTabPendiente(null)
          setCambiosPendientes(0)
        }}
      />
    </div>
  )
}
