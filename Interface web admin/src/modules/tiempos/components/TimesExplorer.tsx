import { useMemo, useState } from "react"
import { AlertTriangle, Bike, CookingPot, ExternalLink, ShoppingBag } from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { FilterBar, type ActiveFilter } from "@/components/data/FilterBar"
import { Tabs, type TabItem } from "@/components/data/Tabs"
import { DurationCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { Drawer } from "@/components/ui/Drawer"
import { SelectField, TextField } from "@/components/ui/fields"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { Skeleton, SkeletonRows } from "@/components/ui/Skeleton"
import { formatDateTime, formatDuration, formatNumber } from "@/lib/format"
import { useSede } from "@/app/sede"
import { ESTACIONES_TIEMPOS, MESEROS_TIEMPOS } from "@/modules/tiempos/api"
import { SellosPanel } from "@/modules/tiempos/components/SellosPanel"
import { SlaPanel } from "@/modules/tiempos/components/SlaPanel"
import {
  SEMAFORO_LABEL,
  TRAMOS,
  type DimensionPreparacion,
  type EntidadTiempo,
  type SlaResp,
  type TiempoFila,
  type TiemposFiltros,
  type TiemposResp,
  type TramoId,
} from "@/modules/tiempos/types"

const TABS: { id: TramoId; label: string }[] = [
  { id: "atencion", label: "Atención" },
  { id: "preparacion", label: "Preparación" },
  { id: "despacho", label: "Despacho" },
  { id: "ruta", label: "Ruta y recogida" },
  { id: "cobro", label: "Cobro" },
  { id: "total", label: "Total" },
  { id: "reserva", label: "Reservas" },
  { id: "sla", label: "Cumplimiento de SLA" },
]

const CANALES = [
  { value: "salon", label: "Salón" },
  { value: "qr", label: "QR" },
  { value: "telefono", label: "Teléfono" },
  { value: "web", label: "Web" },
  { value: "app", label: "App" },
  { value: "kds", label: "KDS" },
]

export function TimesExplorer({
  tramo,
  dimension,
  sector,
  filtros,
  onChange,
  onLimpiar,
  data,
  isLoading,
  isError,
  onRetry,
  sla,
  slaLoading,
  slaError,
  onRetrySla,
  onAbrirEntidad,
  onIrSlaEditor,
}: {
  tramo: TramoId
  dimension: DimensionPreparacion
  sector: "domicilio" | "mostrador"
  filtros: TiemposFiltros
  onChange: (cambios: Record<string, string | undefined>) => void
  onLimpiar: () => void
  data: TiemposResp | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  sla: SlaResp | undefined
  slaLoading: boolean
  slaError: boolean
  onRetrySla: () => void
  onAbrirEntidad: (entidad: EntidadTiempo, id: string) => void
  onIrSlaEditor: () => void
}) {
  const { zonaHoraria, sedeId, sedes, setSedeId } = useSede()
  const [detalle, setDetalle] = useState<TiempoFila | null>(null)

  const tabActiva: TramoId = tramo === "recogida" ? "ruta" : tramo

  const filtrosActivos: ActiveFilter[] = []
  if (filtros.estacionId) {
    filtrosActivos.push({
      key: "estacion",
      label: `Estación: ${ESTACIONES_TIEMPOS.find((item) => item.id === filtros.estacionId)?.nombre ?? filtros.estacionId}`,
    })
  }
  if (filtros.mesero) filtrosActivos.push({ key: "mesero", label: `Mesero: ${filtros.mesero}` })
  if (filtros.canal) filtrosActivos.push({ key: "canal", label: `Canal: ${filtros.canal}` })
  if (filtros.desde || filtros.hasta) {
    filtrosActivos.push({ key: "rango", label: `${filtros.desde ?? "…"} → ${filtros.hasta ?? "hoy"}` })
  }

  const columnas: Column<TiempoFila>[] = useMemo(
    () => [
      {
        key: "folio",
        header: tramo === "reserva" ? "Entidad" : "Pedido / comanda",
        cell: (row) => (
          <>
            <span className="order-id">{row.folio}</span>
            <span className="order-type">
              {row.entidad === "comanda" ? "Comanda" : row.entidad === "reserva" ? "Reserva" : row.entidad === "sesion_mesa" ? "Sesión de mesa" : "Pedido"}
            </span>
          </>
        ),
      },
      { key: "sede", header: "Sede", cell: (row) => row.sedeNombre },
      {
        key: "origen",
        header: "Canal · modalidad",
        cell: (row) => `${row.canalLabel}${row.modalidadLabel !== "—" ? ` · ${row.modalidadLabel}` : ""}`,
      },
      {
        key: "responsable",
        header: tramo === "preparacion" && dimension === "estacion" ? "Estación" : "Mesero",
        cell: (row) =>
          tramo === "preparacion" && dimension === "estacion" ? (row.estacionNombre ?? "—") : row.mesero,
      },
      {
        key: "tramo",
        header: (
          <span title={TRAMOS[tramo].formula}>
            {tramo === "recogida" ? TRAMOS.recogida.label : TRAMOS[tramo].label} ⓘ
          </span>
        ),
        align: "right",
        cell: (row) => (
          <span className={`tramo-cell tramo-cell--${row.semaforo}`} title={`${TRAMOS[tramo].formula} · ${SEMAFORO_LABEL[row.semaforo]}`}>
            <i className="tramo-cell__dot" aria-hidden="true" />
            <DurationCell
              segundos={row.tramoSeg}
              objetivoSeg={row.objetivoSeg}
              titulo={`${TRAMOS[tramo].formula}${row.objetivoFuente === "promedio" ? " · referencia: promedio del período" : ""}`}
            />
          </span>
        ),
      },
      {
        key: "sellos",
        header: "Sellos",
        cell: (row) =>
          row.selloCierre === null ? (
            <span className="tramo-sin-cierre">
              <AlertTriangle size={13} /> sin cierre
            </span>
          ) : (
            <span className="tramo-sellos">
              {formatDateTime(row.selloInicio.hora, zonaHoraria)} → {formatDateTime(row.selloCierre.hora, zonaHoraria)}
            </span>
          ),
      },
    ],
    [dimension, tramo, zonaHoraria],
  )

  const tabs: TabItem[] = TABS.map((tab) => ({ id: tab.id, label: tab.label }))

  if (tabActiva === "sla") {
    if (slaError) return <ErrorState title="No pudimos consultar el cumplimiento de SLA" onRetry={onRetrySla} />
    if (slaLoading || !sla) {
      return (
        <div className="tiempos-stack">
          <div className="tiempos-sla-grid">
            {Array.from({ length: 4 }).map((_, indice) => (
              <div className="tiempos-sla-card" key={indice}>
                <Skeleton height={15} width="50%" />
                <Skeleton height={8} width="100%" />
                <Skeleton height={40} width="100%" />
              </div>
            ))}
          </div>
        </div>
      )
    }
    return (
      <div className="tiempos-stack">
        <Tabs tabs={tabs} value={tabActiva} onChange={(id) => onChange({ tab: id, dimension: undefined })} />
        <SlaPanel data={sla} onIrSlaEditor={onIrSlaEditor} />
      </div>
    )
  }

  const resumen = data?.resumen
  const filas = data?.filas ?? []

  return (
    <div className="tiempos-stack">
      <Tabs
        tabs={tabs}
        value={tabActiva}
        onChange={(id) => {
          setDetalle(null)
          onChange({ tab: id, dimension: id === "preparacion" ? (dimension === "estacion" ? "estacion" : undefined) : undefined })
        }}
      />

      {tabActiva === "preparacion" ? (
        <div className="tiempos-toggle" role="group" aria-label="Dimensión de preparación">
          <button
            type="button"
            className={`tiempos-toggle__btn ${dimension !== "estacion" ? "tiempos-toggle__btn--active" : ""}`}
            aria-pressed={dimension !== "estacion"}
            onClick={() => onChange({ dimension: undefined })}
          >
            <ShoppingBag size={14} /> Por pedido
          </button>
          <button
            type="button"
            className={`tiempos-toggle__btn ${dimension === "estacion" ? "tiempos-toggle__btn--active" : ""}`}
            aria-pressed={dimension === "estacion"}
            onClick={() => onChange({ dimension: "estacion" })}
          >
            <CookingPot size={14} /> Por estación (comandas)
          </button>
        </div>
      ) : null}

      {tabActiva === "ruta" ? (
        <div className="tiempos-toggle" role="group" aria-label="Tipo de entrega">
          <button
            type="button"
            className={`tiempos-toggle__btn ${sector !== "mostrador" ? "tiempos-toggle__btn--active" : ""}`}
            aria-pressed={sector !== "mostrador"}
            onClick={() => onChange({ sector: undefined })}
          >
            <Bike size={14} /> Domicilio · {TRAMOS.ruta.formula}
          </button>
          <button
            type="button"
            className={`tiempos-toggle__btn ${sector === "mostrador" ? "tiempos-toggle__btn--active" : ""}`}
            aria-pressed={sector === "mostrador"}
            onClick={() => onChange({ sector: "mostrador" })}
          >
            <ShoppingBag size={14} /> Recoger · {TRAMOS.recogida.formula}
          </button>
        </div>
      ) : null}

      <FilterBar activeFilters={filtrosActivos} onClear={onLimpiar}>
        <SelectField
          label="Sede"
          value={sedeId ?? ""}
          onChange={(event) => setSedeId(event.target.value || null)}
          options={[
            { value: "", label: "Todas las sedes" },
            ...sedes.map((sede) => ({ value: sede.id, label: sede.nombre })),
          ]}
        />
        <SelectField
          label="Estación"
          placeholder="Todas"
          value={filtros.estacionId ?? ""}
          onChange={(event) => onChange({ estacion: event.target.value || undefined })}
          options={ESTACIONES_TIEMPOS.map((estacion) => ({ value: estacion.id, label: estacion.nombre }))}
        />
        <SelectField
          label="Mesero"
          placeholder="Todos"
          value={filtros.mesero ?? ""}
          onChange={(event) => onChange({ mesero: event.target.value || undefined })}
          options={MESEROS_TIEMPOS.map((mesero) => ({ value: mesero, label: mesero }))}
        />
        <SelectField
          label="Canal"
          placeholder="Todos"
          value={filtros.canal ?? ""}
          onChange={(event) => onChange({ canal: event.target.value || undefined })}
          options={CANALES}
        />
        <TextField
          label="Desde"
          type="date"
          value={filtros.desde ?? ""}
          onChange={(event) => onChange({ desde: event.target.value || undefined })}
        />
        <TextField
          label="Hasta"
          type="date"
          value={filtros.hasta ?? ""}
          onChange={(event) => onChange({ hasta: event.target.value || undefined })}
        />
      </FilterBar>

      <div className="tiempos-resumen">
        <div className="tiempos-resumen__card">
          <span>Media del tramo</span>
          <strong>{formatDuration(resumen?.mediaSeg)}</strong>
          <small>{formatNumber(resumen?.medidos ?? 0)} tramos medidos</small>
        </div>
        <div className="tiempos-resumen__card">
          <span>P90</span>
          <strong>{formatDuration(resumen?.p90Seg)}</strong>
          <small>percentile_cont(0.9) sobre filas con cierre</small>
        </div>
        <div className="tiempos-resumen__card">
          <span>Sin cierre</span>
          <strong>{formatNumber(resumen?.sinCierre ?? 0)}</strong>
          <small>muestran «—» y no promedian (R5 §5.3)</small>
        </div>
        <div className="tiempos-resumen__card">
          <span>Objetivo</span>
          <strong>{resumen?.objetivoSeg === null || resumen?.objetivoSeg === undefined ? "—" : formatDuration(resumen.objetivoSeg)}</strong>
          <small>
            {resumen?.objetivoSeg == null
              ? "semáforo contra el promedio del período"
              : "objetivo de la estación filtrada"}
          </small>
        </div>
        <div className="tiempos-resumen__card tiempos-resumen__card--formula">
          <span>Fórmula</span>
          <code>{tramo === "recogida" ? TRAMOS.recogida.formula : TRAMOS[tramo].formula}</code>
          <small>{TRAMOS[tramo === "recogida" ? "recogida" : tramo].descripcion}</small>
        </div>
      </div>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">
              {tramo === "recogida" ? TRAMOS.recogida.label : TRAMOS[tramo].label}
              {data ? ` · ${data.etiquetaRango}` : ""}
            </div>
            <div className="panel__subtitle">
              Cada fila abre los dos sellos que la componen (hora del servidor, actor y canal) · clic en una hora lleva
              al evento que lo produjo (R5 §5.4)
            </div>
          </div>
          <span className="tiempos-legend">
            <i className="tiempos-legend__dot tiempos-legend__dot--normal" /> En tiempo
            <i className="tiempos-legend__dot tiempos-legend__dot--por_vencer" /> Por vencer
            <i className="tiempos-legend__dot tiempos-legend__dot--vencida" /> Fuera de objetivo
          </span>
        </div>
        {isError ? (
          <ErrorState title="No pudimos consultar los tramos del período" onRetry={onRetry} />
        ) : isLoading || !data ? (
          <SkeletonRows rows={6} columns={6} />
        ) : filas.length === 0 ? (
          <EmptyState
            title="No hay tramos medidos en este rango"
            description="Se necesitan los sellos del servidor del tramo y al menos un evento de cierre; ajusta la estación, el canal o el rango."
          />
        ) : (
          <DataTable
            columns={columnas}
            rows={filas}
            getRowKey={(row) => row.id}
            onRowClick={(row) => setDetalle(row)}
            emptyTitle="No hay tramos medidos en este rango"
            emptyDescription="Revisa los filtros de estación, mesero y canal."
          />
        )}
      </section>

      <p className="tiempos-note">
        Los tramos sin evento de cierre muestran «—» y quedan fuera de media y p90. Los pedidos cancelados se excluyen
        de los promedios.
      </p>

      <Drawer
        open={detalle !== null}
        onClose={() => setDetalle(null)}
        title={detalle ? `Tramo · ${TRAMOS[detalle.tramo].label}` : "Tramo"}
        subtitle={detalle ? `${detalle.folio} · ${detalle.sedeNombre} · ${detalle.canalLabel}` : undefined}
        footer={
          detalle ? (
            <>
              <Button variant="secondary" onClick={() => setDetalle(null)}>
                Cerrar
              </Button>
              <Button variant="primary" onClick={() => onAbrirEntidad(detalle.entidad, detalle.entidadId)}>
                <ExternalLink size={15} /> Ver {detalle.entidad === "comanda" ? "comanda" : detalle.entidad === "pedido" ? "pedido" : detalle.entidad === "reserva" ? "reserva" : "mesa"}
              </Button>
            </>
          ) : null
        }
      >
        {detalle ? (
          <SellosPanel
            formula={TRAMOS[detalle.tramo]}
            selloInicio={detalle.selloInicio}
            selloCierre={detalle.selloCierre}
            tramoSeg={detalle.tramoSeg}
          />
        ) : null}
      </Drawer>
    </div>
  )
}
