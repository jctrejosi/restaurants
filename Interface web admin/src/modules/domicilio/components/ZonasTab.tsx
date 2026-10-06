import { useState } from "react"
import { Download, MapPinned, Pencil, Plus, Power } from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { MoneyCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { IconButton } from "@/components/ui/IconButton"
import { SelectField } from "@/components/ui/fields"
import { EmptyState } from "@/components/ui/states"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/app/auth"
import type { Sede } from "@/app/sede"
import { ApiError } from "@/lib/api"
import { formatDateTime, formatMoney } from "@/lib/format"
import { useExportarZonas, useGuardarZona, useZonas } from "@/modules/domicilio/api"
import { ZoneForm } from "@/modules/domicilio/components/ZoneForm"
import { ZoneSketch } from "@/modules/domicilio/components/ZoneSketch"
import type { Zona, ZonaPayload } from "@/modules/domicilio/types"

function payloadDeZona(zona: Zona, cambios: Partial<ZonaPayload>): ZonaPayload {
  return {
    nombre: zona.nombre,
    sucursalId: zona.sucursalId,
    tarifaCentavos: zona.tarifaCentavos,
    pedidoMinimoCentavos: zona.pedidoMinimoCentavos,
    tiempoEstimadoMin: zona.tiempoEstimadoMin,
    vertices: zona.vertices,
    activa: zona.activa,
    ...cambios,
  }
}

/** Zonas de cobertura: tarifa, pedido mínimo, tiempo estimado y publicación. */
export function ZonasTab({
  sucursalId,
  esGlobal,
  sedes,
  zonaHoraria,
  onCambiarSede,
}: {
  sucursalId: string | null
  esGlobal: boolean
  sedes: Sede[]
  zonaHoraria: string
  onCambiarSede: (sedeId: string | null) => void
}) {
  const { mostrar } = useToast()
  const { tienePermiso } = useAuth()
  const { data, isLoading, isError, refetch } = useZonas(sucursalId)
  const guardar = useGuardarZona()
  const exportar = useExportarZonas()

  const [formOpen, setFormOpen] = useState(false)
  const [zonaEnEdicion, setZonaEnEdicion] = useState<Zona | null>(null)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const [desactivar, setDesactivar] = useState<Zona | null>(null)

  const puedeZonas = tienePermiso("domicilio.zonas")
  const puedeExportar = tienePermiso("domicilio.exportar")
  const zonas = data?.data ?? []

  const abrirNueva = () => {
    setZonaEnEdicion(null)
    setErrorServidor(null)
    setFormOpen(true)
  }

  const abrirEdicion = (zona: Zona) => {
    setZonaEnEdicion(zona)
    setErrorServidor(null)
    setFormOpen(true)
  }

  const guardarZona = (payload: ZonaPayload) => {
    guardar.mutate(
      { id: zonaEnEdicion?.id, payload },
      {
        onSuccess: () => {
          mostrar(zonaEnEdicion ? "Zona actualizada y auditada." : "Zona creada y auditada.", "exito")
          setFormOpen(false)
          setZonaEnEdicion(null)
        },
        onError: (error) =>
          setErrorServidor(error instanceof ApiError ? error.message : "No se pudo guardar la zona."),
      },
    )
  }

  const exportarGeoJson = () => {
    exportar.mutate(undefined, {
      onSuccess: () => mostrar("Exportación GeoJSON registrada; se genera en segundo plano.", "exito"),
      onError: () => mostrar("No se pudo registrar la exportación.", "error"),
    })
  }

  const columnas: Column<Zona>[] = [
    {
      key: "zona",
      header: "Zona",
      cell: (zona) => (
        <>
          <span className="order-id">{zona.nombre}</span>
          <span className="order-type">
            <StatusBadge tone={zona.activa ? "green" : "gray"}>{zona.activa ? "Activa" : "Inactiva"}</StatusBadge>{" "}
            · actualizada {formatDateTime(zona.actualizadoEn, zonaHoraria)}
          </span>
        </>
      ),
    },
    { key: "sucursal", header: "Sucursal", cell: (zona) => zona.sucursalNombre },
    {
      key: "tarifa",
      header: "Tarifa",
      align: "right",
      cell: (zona) => <MoneyCell centavos={zona.tarifaCentavos} />,
    },
    {
      key: "minimo",
      header: "Pedido mínimo",
      align: "right",
      cell: (zona) => <MoneyCell centavos={zona.pedidoMinimoCentavos} />,
    },
    { key: "tiempo", header: "Tiempo estimado", align: "right", cell: (zona) => `${zona.tiempoEstimadoMin} min` },
    {
      key: "cobertura",
      header: "Cobertura",
      cell: (zona) => (
        <span className="zone-cell">
          <ZoneSketch vertices={zona.vertices} height={30} />
          <small>{zona.vertices.length} vértices</small>
        </span>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      cell: (zona) => (
        <span className="table-actions">
          <IconButton
            label={puedeZonas ? "Editar zona" : "Requiere permiso de domicilio.zonas"}
            disabled={!puedeZonas}
            onClick={(event) => {
              event.stopPropagation()
              abrirEdicion(zona)
            }}
          >
            <Pencil size={15} />
          </IconButton>
          <Button
            variant="ghost"
            className="text-action"
            disabled={!puedeZonas}
            title={puedeZonas ? undefined : "Requiere permiso de domicilio.zonas"}
            onClick={(event) => {
              event.stopPropagation()
              if (zona.activa) setDesactivar(zona)
              else guardarZona(payloadDeZona(zona, { activa: true, motivo: "Reactivación desde el panel" }))
            }}
          >
            <Power size={13} /> {zona.activa ? "Desactivar" : "Activar"}
          </Button>
        </span>
      ),
    },
  ]

  return (
    <>
      <div className="module-toolbar">
        {esGlobal ? (
          <SelectField
            label="Sede"
            options={[{ value: "", label: "Todas las sedes" }, ...sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))]}
            value={sucursalId ?? ""}
            onChange={(event) => onCambiarSede(event.target.value || null)}
          />
        ) : null}
        <span className="module-toolbar__spacer" />
        <Button
          variant="secondary"
          disabled={!puedeExportar || exportar.isPending}
          title={puedeExportar ? undefined : "Requiere permiso de domicilio.exportar"}
          onClick={exportarGeoJson}
        >
          <Download size={15} /> {exportar.isPending ? "Exportando…" : "Exportar GeoJSON"}
        </Button>
        <Button
          variant="primary"
          disabled={!puedeZonas}
          title={puedeZonas ? undefined : "Requiere permiso de domicilio.zonas"}
          onClick={abrirNueva}
        >
          <Plus size={16} /> Nueva zona
        </Button>
      </div>

      <section className="panel">
        {!isLoading && !isError && zonas.length === 0 ? (
          <EmptyState
            title="Aún no hay zonas configuradas"
            description="Configura la primera zona para que la web valide cobertura, tarifa y pedido mínimo."
            icon={<MapPinned size={22} />}
            action={puedeZonas ? { label: "Dibujar zona", onClick: abrirNueva } : undefined}
          />
        ) : (
          <DataTable
            columns={columnas}
            rows={zonas}
            getRowKey={(zona) => zona.id}
            loading={isLoading}
            error={isError ? new Error("No se pudieron cargar las zonas") : null}
            onRetry={() => void refetch()}
            emptyTitle="Aún no hay zonas configuradas"
            emptyDescription="Configura la primera zona para validar domicilios en la web."
          />
        )}
      </section>

      <ZoneForm
        open={formOpen}
        zona={zonaEnEdicion}
        sedes={sedes}
        sucursalPredeterminada={sucursalId}
        guardando={guardar.isPending}
        errorServidor={errorServidor}
        onClose={() => setFormOpen(false)}
        onGuardar={guardarZona}
      />

      <ConfirmDialog
        open={desactivar != null}
        title={desactivar ? `Desactivar «${desactivar.nombre}»` : "Desactivar zona"}
        description="La web dejará de aceptar domicilios en esta zona."
        impacto={
          desactivar
            ? `Los pedidos ya creados en la zona no se modifican; solo se retira de la validación web. Tarifa actual: ${formatMoney(desactivar.tarifaCentavos)}.`
            : undefined
        }
        confirmLabel="Desactivar zona"
        onCancel={() => setDesactivar(null)}
        onConfirm={(motivo) => {
          if (!desactivar) return
          guardarZona(payloadDeZona(desactivar, { activa: false, motivo }))
          setDesactivar(null)
        }}
      />
    </>
  )
}
