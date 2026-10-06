import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { FilterX, Plus } from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { DurationCell } from "@/components/data/cells"
import { KpiCard, type KpiData } from "@/components/data/KpiCard"
import { Button } from "@/components/ui/Button"
import { SelectField, TextField, type SelectOption } from "@/components/ui/fields"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useAuth } from "@/app/auth"
import type { Sede } from "@/app/sede"
import { formatTime, maskName } from "@/lib/format"
import { useEntregas, useRepartidores } from "@/modules/domicilio/api"
import { AsignarEntregaDialog } from "@/modules/domicilio/components/AsignarEntregaDialog"
import { EntregaDetalleDrawer } from "@/modules/domicilio/components/EntregaDetalleDrawer"
import {
  ENTREGA_ESTADO_LABEL,
  ENTREGA_ESTADO_TONE,
  entregaEstaActiva,
  type Entrega,
  type EntregasFiltros,
} from "@/modules/domicilio/types"

function estaRetrasada(entrega: Entrega): boolean {
  if (!entregaEstaActiva(entrega.estado)) return false
  const referencia = entrega.asignadoEn ?? entrega.creadoEn
  const transcurridoMin = (Date.now() - new Date(referencia).getTime()) / 60_000
  return transcurridoMin > entrega.tiempoEstimadoMin
}

function transcurrido(entrega: Entrega): number | null {
  if (!entregaEstaActiva(entrega.estado)) return entrega.totalSeg
  const referencia = entrega.asignadoEn ?? entrega.creadoEn
  return Math.max(0, Math.round((Date.now() - new Date(referencia).getTime()) / 1000))
}

function leerFiltros(searchParams: URLSearchParams, sucursalId: string | null): EntregasFiltros {
  return {
    sucursalId: sucursalId ?? undefined,
    estado: (searchParams.get("estado") as EntregasFiltros["estado"]) ?? undefined,
    repartidorId: searchParams.get("repartidor") ?? undefined,
    desde: searchParams.get("desde") ?? undefined,
    hasta: searchParams.get("hasta") ?? undefined,
    busqueda: searchParams.get("q") ?? undefined,
  }
}

/** Seguimiento de entregas con tramos, retraso contra el estimado y evidencia. */
export function EntregasTab({
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
  const [searchParams, setSearchParams] = useSearchParams()
  const { tienePermiso } = useAuth()
  const filtros = useMemo(() => leerFiltros(searchParams, sucursalId), [searchParams, sucursalId])
  const { data, isLoading, isError, refetch, isFetching } = useEntregas(filtros)
  const { data: dataRepartidores } = useRepartidores(sucursalId)

  const [detalleId, setDetalleId] = useState<string | null>(null)
  const [asignar, setAsignar] = useState<{ entrega: Entrega; accion: "asignar" | "reasignar" } | null>(null)

  const puedeAsignar = tienePermiso("domicilio.asignar")
  const puedeCerrar = tienePermiso("domicilio.cerrar_entrega")
  const puedeVerPii = tienePermiso("clientes.ver_pii")

  const entregas = data?.data ?? []
  const repartidores = dataRepartidores?.data ?? []
  const entregaDetalle = entregas.find((entrega) => entrega.pedidoId === detalleId) ?? null

  const actualizar = (cambios: Record<string, string | undefined>) => {
    const siguiente = new URLSearchParams(searchParams)
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === undefined || valor === "") siguiente.delete(clave)
      else siguiente.set(clave, valor)
    }
    setSearchParams(siguiente, { replace: true })
  }

  const hayFiltros = Boolean(
    searchParams.get("estado") ||
      searchParams.get("repartidor") ||
      searchParams.get("desde") ||
      searchParams.get("hasta") ||
      searchParams.get("q"),
  )

  const limpiarFiltros = () => {
    const siguiente = new URLSearchParams()
    const vista = searchParams.get("vista")
    if (vista) siguiente.set("vista", vista)
    setSearchParams(siguiente, { replace: true })
  }

  const kpis: KpiData[] = [
    { label: "Entregas activas", value: String(entregas.filter((entrega) => entregaEstaActiva(entrega.estado)).length), foot: "en el filtro actual", color: "blue" },
    { label: "Retrasadas", value: String(entregas.filter(estaRetrasada).length), foot: "sobre el estimado", color: "terracotta" },
    { label: "Sin asignar", value: String(entregas.filter((entrega) => entregaEstaActiva(entrega.estado) && !entrega.repartidorId).length), foot: "requieren repartidor", color: "gold" },
    { label: "Entregadas", value: String(entregas.filter((entrega) => entrega.estado === "entregado").length), foot: "con evidencia", color: "green" },
  ]

  const opcionesEstado: SelectOption[] = [
    { value: "activas", label: "En curso" },
    ...Object.entries(ENTREGA_ESTADO_LABEL).map(([value, label]) => ({ value, label })),
  ]

  const opcionesRepartidor: SelectOption[] = repartidores.map((repartidor) => ({
    value: repartidor.id,
    label: `${repartidor.nombre} (${repartidor.entregasActivas} activas)`,
  }))

  const columnas: Column<Entrega>[] = [
    {
      key: "pedido",
      header: "Pedido",
      cell: (entrega) => (
        <>
          <span className="order-id">{entrega.folio}</span>
          <span className="order-type">{formatTime(entrega.creadoEn, zonaHoraria)}</span>
        </>
      ),
    },
    {
      key: "cliente",
      header: "Cliente y destino",
      cell: (entrega) => (
        <span className="cell-wrap">
          <span className="linea-nombre">{puedeVerPii ? entrega.clienteNombre : maskName(entrega.clienteNombre)}</span>
          <small className="linea-notas">{entrega.direccion}</small>
        </span>
      ),
    },
    { key: "zona", header: "Zona", cell: (entrega) => entrega.zonaNombre },
    {
      key: "repartidor",
      header: "Repartidor",
      cell: (entrega) => entrega.repartidorNombre ?? <span className="text-muted">Sin asignar</span>,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (entrega) => (
        <>
          <StatusBadge tone={ENTREGA_ESTADO_TONE[entrega.estado]}>{ENTREGA_ESTADO_LABEL[entrega.estado]}</StatusBadge>
          {estaRetrasada(entrega) ? (
            <>
              {" "}
              <StatusBadge tone="amber" title={`Estimado: ${entrega.tiempoEstimadoMin} min`}>
                Retrasada
              </StatusBadge>
            </>
          ) : null}
        </>
      ),
    },
    {
      key: "tiempo",
      header: "Tiempo / estimado",
      align: "right",
      cell: (entrega) => (
        <DurationCell
          segundos={transcurrido(entrega)}
          objetivoSeg={entrega.estado === "entregado" ? undefined : entrega.tiempoEstimadoMin * 60}
          titulo={entrega.estado === "entregado" ? "= entregado − asignado" : `Estimado: ${entrega.tiempoEstimadoMin} min`}
        />
      ),
    },
    {
      key: "evidencia",
      header: "Evidencia",
      align: "right",
      cell: (entrega) => (entrega.evidenciaUrl ? "Sí" : "—"),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      cell: (entrega) => (
        <span className="table-actions">
          {entregaEstaActiva(entrega.estado) ? (
            <Button
              variant="secondary"
              disabled={!puedeAsignar}
              title={puedeAsignar ? undefined : "Requiere permiso de domicilio.asignar"}
              onClick={(event) => {
                event.stopPropagation()
                setAsignar({ entrega, accion: entrega.repartidorId ? "reasignar" : "asignar" })
              }}
            >
              <Plus size={14} /> {entrega.repartidorId ? "Reasignar" : "Asignar"}
            </Button>
          ) : (
            "—"
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <div className="domicilio-kpis">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} data={kpi} />
        ))}
      </div>

      <div className="module-toolbar module-toolbar--wrap">
        {esGlobal ? (
          <SelectField
            label="Sede"
            options={[{ value: "", label: "Todas las sedes" }, ...sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))]}
            value={sucursalId ?? ""}
            onChange={(event) => onCambiarSede(event.target.value || null)}
          />
        ) : null}
        <TextField
          label="Buscar"
          placeholder="Folio, cliente o dirección"
          value={searchParams.get("q") ?? ""}
          onChange={(event) => actualizar({ q: event.target.value || undefined })}
        />
        <SelectField
          label="Estado"
          options={opcionesEstado}
          placeholder="Todos"
          value={searchParams.get("estado") ?? ""}
          onChange={(event) => actualizar({ estado: event.target.value || undefined })}
        />
        <SelectField
          label="Repartidor"
          options={opcionesRepartidor}
          placeholder="Todos"
          value={searchParams.get("repartidor") ?? ""}
          onChange={(event) => actualizar({ repartidor: event.target.value || undefined })}
        />
        <TextField
          label="Desde"
          type="date"
          value={searchParams.get("desde") ?? ""}
          onChange={(event) => actualizar({ desde: event.target.value || undefined })}
        />
        <TextField
          label="Hasta"
          type="date"
          value={searchParams.get("hasta") ?? ""}
          onChange={(event) => actualizar({ hasta: event.target.value || undefined })}
        />
        {hayFiltros ? (
          <Button variant="ghost" className="text-action" onClick={limpiarFiltros}>
            <FilterX size={14} /> Limpiar filtros
          </Button>
        ) : null}
      </div>

      <section className="panel">
        <DataTable
          columns={columnas}
          rows={entregas}
          getRowKey={(entrega) => entrega.pedidoId}
          onRowClick={(entrega) => setDetalleId(entrega.pedidoId)}
          loading={isLoading}
          error={isError ? new Error("No se pudo cargar el seguimiento") : null}
          onRetry={() => void refetch()}
          emptyTitle="No hay entregas en el rango"
          emptyDescription="Ajusta las fechas o limpia los filtros para ver más entregas."
          footer={
            <div className="pedidos-paginacion">
              <span>{isFetching ? "Actualizando…" : "En vivo"} · {entregas.length} entregas</span>
            </div>
          }
        />
      </section>

      <EntregaDetalleDrawer
        open={entregaDetalle != null}
        entrega={entregaDetalle}
        zonaHoraria={zonaHoraria}
        puedeVerPii={puedeVerPii}
        puedeAsignar={puedeAsignar}
        puedeCerrar={puedeCerrar}
        onClose={() => setDetalleId(null)}
        onAsignar={(entrega, accion) => setAsignar({ entrega, accion })}
      />

      <AsignarEntregaDialog
        open={asignar != null}
        entrega={asignar?.entrega ?? null}
        accion={asignar?.accion ?? "asignar"}
        repartidores={repartidores}
        onClose={() => setAsignar(null)}
      />
    </>
  )
}
