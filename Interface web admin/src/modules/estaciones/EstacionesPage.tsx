/**
 * Estaciones e impresoras (plan 07): pestañas en la URL
 * `?tab=estaciones|impresoras|sla|diagnostico`, aviso persistente de productos
 * sin estación y formularios de estación/impresora.
 */

import { useState } from "react"
import { AlertTriangle, Plus } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { PageHeader } from "@/components/data/PageHeader"
import { DataTable, type Column } from "@/components/data/DataTable"
import { Tabs, type TabItem } from "@/components/data/Tabs"
import { DurationCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { NoPermissionState } from "@/components/ui/states"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { useSocketEvent } from "@/lib/realtime"
import { formatRelative } from "@/lib/format"
import { useEstaciones, useImpresoras, useProductosAsignables } from "@/modules/estaciones/api"
import { StationForm } from "@/modules/estaciones/components/StationForm"
import { PrinterRoutes } from "@/modules/estaciones/components/PrinterRoutes"
import { SlaEditor } from "@/modules/estaciones/components/SlaEditor"
import { PrinterDiagnostics } from "@/modules/estaciones/components/PrinterDiagnostics"
import { ESTACION_TIPO_LABEL, PASO_LISTA_LABEL, type Estacion } from "@/modules/estaciones/types"
import "@/modules/estaciones/estaciones.css"

type Pestana = "estaciones" | "impresoras" | "sla" | "diagnostico"

export default function EstacionesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { mostrar } = useToast()
  const { tienePermiso } = useAuth()
  const { sedeId, sedes } = useSede()

  const sucursalId = sedeId ?? sedes[0]?.id ?? "centro"
  const tab = (searchParams.get("tab") as Pestana | null) ?? "estaciones"

  const [estacionEditando, setEstacionEditando] = useState<Estacion | "nueva" | null>(null)

  const puedeVer = tienePermiso("estaciones.ver")
  const puedeVerImpresoras = tienePermiso("impresoras.ver")
  const puedeEditar = tienePermiso("estaciones.editar")

  const estaciones = useEstaciones(sucursalId)
  const productos = useProductosAsignables()
  const impresoras = useImpresoras(sucursalId)

  useSocketEvent(["estacion.actualizada", "impresora.actualizada", "sla.actualizado", "impresion.estado"], () => {
    void queryClient.invalidateQueries({ queryKey: ["estaciones"] })
  })

  const cambiarTab = (siguiente: string) => {
    const params = new URLSearchParams(searchParams)
    params.set("tab", siguiente)
    setSearchParams(params, { replace: true })
  }

  if (!puedeVer) {
    return (
      <div className="module-page">
        <PageHeader eyebrow="Negocio / Estaciones" title="Estaciones e impresoras" />
        <NoPermissionState permiso="estaciones.ver" />
      </div>
    )
  }

  const pendientes = (productos.data?.data ?? []).filter((producto) => producto.activo && !producto.estacionNombre)
  const fallidos = (impresoras.data ?? []).filter((impresora) =>
    impresora.ultimosTrabajos.some((trabajo) => trabajo.estado === "fallido"),
  ).length

  const tabs: TabItem[] = [
    { id: "estaciones", label: "Estaciones", badge: String(estaciones.data?.length ?? "") },
    { id: "impresoras", label: "Impresoras y rutas" },
    { id: "sla", label: "SLA" },
    { id: "diagnostico", label: "Diagnóstico", badge: fallidos > 0 ? String(fallidos) : undefined },
  ]

  const columnas: Column<Estacion>[] = [
    {
      key: "nombre",
      header: "Estación",
      cell: (row) => (
        <>
          <span className="order-id">{row.nombre}</span>
          <span className="order-type">{ESTACION_TIPO_LABEL[row.tipo]}</span>
        </>
      ),
    },
    { key: "sede", header: "Sede", cell: (row) => sedes.find((sede) => sede.id === row.sucursalId)?.nombre ?? row.sucursalId },
    {
      key: "sla",
      header: "SLA objetivo",
      cell: (row) =>
        row.slaObjetivoSeg ? (
          <DurationCell segundos={row.slaObjetivoSeg} titulo="Objetivo del destino" />
        ) : (
          <StatusBadge tone="amber">sin SLA</StatusBadge>
        ),
    },
    {
      key: "productos",
      header: "Productos",
      cell: (row) =>
        row.productoIds.length > 0 ? (
          `${row.productoIds.length} asignado(s)`
        ) : (
          <StatusBadge tone="amber" title="Estación sin productos: no recibe comandas">
            sin productos
          </StatusBadge>
        ),
    },
    {
      key: "paso",
      header: "Paso a «lista»",
      cell: (row) => (
        <StatusBadge tone={row.pasoLista === "automatico" ? "blue" : "outline"}>
          {row.pasoLista === "automatico" ? "automático" : "explícito"}
        </StatusBadge>
      ),
    },
    {
      key: "activa",
      header: "Estado",
      cell: (row) => <StatusBadge tone={row.activa ? "green" : "gray"}>{row.activa ? "activa" : "inactiva"}</StatusBadge>,
    },
    { key: "actualizado", header: "Actualizado", cell: (row) => formatRelative(row.actualizadoEn) },
  ]

  return (
    <div className="module-page">
      <PageHeader
        eyebrow="Negocio / Estaciones"
        title="Estaciones e impresoras"
        subtitle="Destinos de comanda, rutas de impresión por documento y SLA que alimenta al KDS."
        actions={
          tab === "estaciones" ? (
            <Button
              variant="primary"
              disabled={!puedeEditar}
              title={puedeEditar ? undefined : "Requiere permiso de estaciones.editar"}
              onClick={() => setEstacionEditando("nueva")}
            >
              <Plus size={16} /> Nueva estación
            </Button>
          ) : null
        }
      />

      {pendientes.length > 0 ? (
        <div className="module-notice module-notice--warn">
          <AlertTriangle size={15} />
          <strong>
            {pendientes.length} producto(s) sin estación:
          </strong>
          <span>
            no generan comanda. {pendientes.slice(0, 4).map((producto) => producto.nombre).join(", ")}
            {pendientes.length > 4 ? "…" : ""}
          </span>
          <Button variant="ghost" className="text-action" onClick={() => navigate("/catalogo?sinEstacion=true")}>
            Resolver en Catálogo
          </Button>
        </div>
      ) : null}

      <Tabs tabs={tabs} value={tab} onChange={cambiarTab} />

      {tab === "estaciones" ? (
        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__title">Estaciones de preparación y despacho</div>
              <div className="panel__subtitle">
                Cada producto con estación genera comanda en ese destino; sin estación no la genera (RF-R5-30).
              </div>
            </div>
          </div>
          <DataTable
            columns={columnas}
            rows={estaciones.data ?? []}
            getRowKey={(row) => row.id}
            onRowClick={(row) => setEstacionEditando(row)}
            loading={estaciones.isLoading}
            error={estaciones.isError ? (estaciones.error as Error) : null}
            onRetry={() => void estaciones.refetch()}
            emptyTitle="Aún no hay estaciones en esta sede"
            emptyDescription="Crea la primera estación para enrutar comandas y medir SLA por destino."
            footer={
              <div className="pedidos-paginacion">
                <span>{estaciones.data?.length ?? 0} estaciones · {PASO_LISTA_LABEL.explicito.toLowerCase()} disponible en V1</span>
              </div>
            }
          />
        </section>
      ) : null}

      {tab === "impresoras" ? (
        puedeVerImpresoras ? (
          <PrinterRoutes sucursalId={sucursalId} />
        ) : (
          <NoPermissionState permiso="impresoras.ver" />
        )
      ) : null}

      {tab === "sla" ? <SlaEditor /> : null}

      {tab === "diagnostico" ? (
        puedeVerImpresoras ? (
          <PrinterDiagnostics sucursalId={sucursalId} />
        ) : (
          <NoPermissionState permiso="impresoras.ver" />
        )
      ) : null}

      <StationForm
        abierto={estacionEditando !== null}
        estacion={estacionEditando === "nueva" ? null : estacionEditando}
        sucursalPorDefecto={sucursalId}
        onCerrar={() => setEstacionEditando(null)}
        onGuardado={(mensaje) => {
          mostrar(mensaje, "exito")
          setEstacionEditando(null)
        }}
      />
    </div>
  )
}
