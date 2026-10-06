import { Download } from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { DurationCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { ErrorState } from "@/components/ui/states"
import { Skeleton, SkeletonRows } from "@/components/ui/Skeleton"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { formatDateTime, formatDuration, formatPercent, formatRelative } from "@/lib/format"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { useExportarComandas, useHistorialTurno } from "@/modules/comandas/api"
import {
  ESTADO_LABEL,
  type ComandaMonitor,
  type HistorialFila,
  type SlaEstacionFila,
} from "@/modules/comandas/types"

function claseCumplimiento(pct: number): string {
  if (pct >= 0.9) return "sla-card--good"
  if (pct >= 0.75) return "sla-card--warn"
  return "sla-card--bad"
}

function SlaCard({ fila }: { fila: SlaEstacionFila }) {
  return (
    <div className={`sla-card ${claseCumplimiento(fila.cumplimientoPct)}`}>
      <div className="sla-card__head">
        <strong>{fila.estacionNombre}</strong>
        <span className="sla-card__pct">{formatPercent(fila.cumplimientoPct)}</span>
      </div>
      <div className="sla-card__gauge" role="img" aria-label={`Cumplimiento ${formatPercent(fila.cumplimientoPct)}`}>
        <span style={{ width: `${Math.round(fila.cumplimientoPct * 100)}%` }} />
      </div>
      <dl className="sla-card__data">
        <div>
          <dt>Objetivo</dt>
          <dd>{formatDuration(fila.objetivoSeg)}</dd>
        </div>
        <div>
          <dt>Cumplidas</dt>
          <dd>
            {fila.cumplidas}/{fila.total}
          </dd>
        </div>
        <div>
          <dt>Promedio</dt>
          <dd>{formatDuration(fila.promedioSeg)}</dd>
        </div>
        <div>
          <dt>P90</dt>
          <dd>{formatDuration(fila.p90Seg)}</dd>
        </div>
        <div>
          <dt>Vencidas</dt>
          <dd>{fila.vencidas}</dd>
        </div>
        <div>
          <dt>Sin cierre</dt>
          <dd>{fila.sinCierre}</dd>
        </div>
      </dl>
    </div>
  )
}

const COLUMNAS_VENCIDAS: Column<ComandaMonitor>[] = [
  {
    key: "numero",
    header: "Comanda",
    cell: (row) => (
      <>
        <span className="order-id">#{row.numero}</span>
        <span className="order-type">{row.pedidoFolio}</span>
      </>
    ),
  },
  { key: "estacion", header: "Estación", cell: (row) => row.estacionNombre },
  {
    key: "tiempo",
    header: "Transcurrido",
    cell: (row) => (
      <DurationCell segundos={row.transcurridoSeg} objetivoSeg={row.objetivoSeg} titulo="SLA vencido" />
    ),
  },
  {
    key: "estado",
    header: "Estado",
    cell: (row) => <StatusBadge tone={row.estadoTone}>{ESTADO_LABEL[row.estado]}</StatusBadge>,
  },
]

/** Cumplimiento de SLA e historial del turno (RF-R5-61). */
export function HistorialPanel({
  turnoId,
  onOpenComanda,
}: {
  turnoId?: string
  onOpenComanda: (id: string) => void
}) {
  const { data, isLoading, isError, refetch } = useHistorialTurno(turnoId)
  const exportar = useExportarComandas()
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const { zonaHoraria } = useSede()

  const puedeExportar = tienePermiso("comandas.exportar")

  const columnasHistorial: Column<HistorialFila>[] = [
    {
      key: "numero",
      header: "Comanda",
      cell: (row) => (
        <>
          <span className="order-id">#{row.numero}</span>
          <span className="order-type">{row.pedidoFolio}</span>
        </>
      ),
    },
    { key: "estacion", header: "Estación", cell: (row) => row.estacionNombre },
    {
      key: "estado",
      header: "Estado",
      cell: (row) => <StatusBadge tone={row.estadoTone}>{ESTADO_LABEL[row.estado]}</StatusBadge>,
    },
    { key: "enviada", header: "Enviada", cell: (row) => formatDateTime(row.enviadaEn, zonaHoraria) },
    {
      key: "lista",
      header: "Lista",
      cell: (row) => (row.listaEn ? formatDateTime(row.listaEn, zonaHoraria) : "—"),
    },
    {
      key: "entregada",
      header: "Entregada",
      cell: (row) => (row.entregadaEn ? formatDateTime(row.entregadaEn, zonaHoraria) : "—"),
    },
    {
      key: "preparacion",
      header: "Preparación",
      align: "right",
      cell: (row) => (
        <DurationCell
          segundos={row.preparacionSeg}
          titulo="= lista − enviada; sin evento de cierre no se promedia"
        />
      ),
    },
  ]

  const handleExportar = () => {
    exportar.mutate("historial", {
      onSuccess: (respuesta) =>
        mostrar(`Exportación ${respuesta.exportacionId} generada y registrada`, "exito"),
      onError: (error) =>
        mostrar(
          error instanceof ApiError ? error.message : "No se pudo generar la exportación",
          "error",
        ),
    })
  }

  if (isError) return <ErrorState onRetry={() => void refetch()} />

  if (isLoading || !data) {
    return (
      <div className="sla-panel">
        <div className="sla-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="sla-card" key={index}>
              <Skeleton height={15} width="50%" />
              <Skeleton height={8} width="100%" />
              <Skeleton height={40} width="100%" />
            </div>
          ))}
        </div>
        <section className="panel">
          <SkeletonRows rows={5} columns={6} />
        </section>
      </div>
    )
  }

  return (
    <div className="sla-panel">
      <div className="sla-panel__head">
        <div>
          <div className="panel__title">{data.turnoNombre}</div>
          <div className="panel__subtitle">
            Cumplimiento global {formatPercent(data.cumplimientoGlobalPct)} · Actualizado{" "}
            {formatRelative(data.actualizadoEn)}
          </div>
        </div>
        <Button
          variant="secondary"
          disabled={!puedeExportar || exportar.isPending}
          title={puedeExportar ? undefined : "Requiere permiso comandas.exportar"}
          onClick={handleExportar}
        >
          <Download size={15} /> {exportar.isPending ? "Exportando…" : "Exportar"}
        </Button>
      </div>

      <div className="sla-grid">
        {data.sla.map((fila) => (
          <SlaCard fila={fila} key={fila.estacionId} />
        ))}
      </div>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Comandas vencidas</div>
            <div className="panel__subtitle">
              {data.vencidas.length} {data.vencidas.length === 1 ? "comanda fuera de SLA" : "comandas fuera de SLA"} en el turno
            </div>
          </div>
        </div>
        <DataTable
          columns={COLUMNAS_VENCIDAS}
          rows={data.vencidas}
          getRowKey={(row) => row.id}
          onRowClick={(row) => onOpenComanda(row.id)}
          emptyTitle="Sin comandas vencidas"
          emptyDescription="Todas las comandas activas del turno están dentro del objetivo de SLA."
        />
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Historial del turno</div>
            <div className="panel__subtitle">
              {data.filas.length} comandas con sellos y tiempos · Inicio {formatDateTime(data.inicioTurno, zonaHoraria)}
            </div>
          </div>
        </div>
        <DataTable
          columns={columnasHistorial}
          rows={data.filas}
          getRowKey={(row) => row.id}
          onRowClick={(row) => onOpenComanda(row.id)}
          emptyTitle="Sin comandas en el turno"
          emptyDescription="Aún no se registran comandas en el turno en curso."
        />
      </section>
    </div>
  )
}
