import { DataTable, type Column } from "@/components/data/DataTable"
import { KpiCard } from "@/components/data/KpiCard"
import { ErrorState } from "@/components/ui/states"
import { Skeleton, SkeletonCards, SkeletonRows } from "@/components/ui/Skeleton"
import { formatNumber, formatPercent } from "@/lib/format"
import { useReservasReporte } from "@/modules/reportes/api"
import { Heatmap } from "@/modules/reportes/components/charts"
import { DIAS_SEMANA, type FilaReservaDia, type ReporteFiltros } from "@/modules/reportes/types"

const HORAS = Array.from({ length: 10 }, (_, indice) => 13 + indice)

function etiquetaFecha(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1),
  )
}

/** Reservas (RF-R5-121): volumen, ocupación, no-show, lista de espera y heatmap. */
export function ReservasPanel({
  filtros,
  sedeId,
}: {
  filtros: ReporteFiltros
  sedeId: string | null
}) {
  const { data, isLoading, isError, refetch } = useReservasReporte(filtros, sedeId, true)

  const columnas: Column<FilaReservaDia>[] = [
    { key: "fecha", header: "Fecha", cell: (row) => etiquetaFecha(row.fecha) },
    { key: "reservas", header: "Reservas", align: "right", cell: (row) => formatNumber(row.reservas) },
    { key: "confirmadas", header: "Confirmadas", align: "right", cell: (row) => formatNumber(row.confirmadas) },
    { key: "sentadas", header: "Sentadas", align: "right", cell: (row) => formatNumber(row.sentadas) },
    {
      key: "noShow",
      header: "No-show",
      align: "right",
      cell: (row) => (
        <span className={row.noShow > 0 ? "money money--negative" : undefined}>{formatNumber(row.noShow)}</span>
      ),
    },
    { key: "canceladas", header: "Canceladas", align: "right", cell: (row) => formatNumber(row.canceladas) },
    { key: "personas", header: "Personas", align: "right", cell: (row) => formatNumber(row.personas) },
    {
      key: "espera",
      header: "Espera media",
      align: "right",
      cell: (row) => `${row.esperaMediaMin} min`,
    },
    { key: "ocupacion", header: "Ocupación", align: "right", cell: (row) => formatPercent(row.ocupacionPct) },
  ]

  if (isError) {
    return <ErrorState title="No pudimos consultar los agregados de reservas" onRetry={() => void refetch()} />
  }

  if (isLoading || !data) {
    return (
      <div className="report-stack">
        <SkeletonCards count={5} />
        <section className="panel">
          <div className="report-chart-skeleton">
            <Skeleton height={260} />
          </div>
        </section>
        <section className="panel">
          <SkeletonRows rows={4} columns={8} />
        </section>
      </div>
    )
  }

  return (
    <div className="report-stack">
      <div className="kpi-grid">
        <KpiCard
          data={{
            label: "Reservas",
            value: formatNumber(data.kpis.reservas),
            foot: data.etiquetaPeriodo,
            color: "terracotta",
          }}
        />
        <KpiCard
          data={{
            label: "Ocupación media",
            value: formatPercent(data.kpis.ocupacionPct),
            foot: "sesiones sentadas ÷ disponibles",
            color: "green",
          }}
        />
        <KpiCard
          data={{
            label: "No-show",
            value: formatPercent(data.kpis.noShowPct),
            deltaNegativo: true,
            foot: "confirmadas que no llegaron",
            color: "gold",
          }}
        />
        <KpiCard
          data={{
            label: "Lista de espera",
            value: formatNumber(data.kpis.listaEspera),
            foot: "pendiente de vista en analytics",
            color: "purple",
          }}
        />
        <KpiCard
          data={{
            label: "Espera media",
            value: `${data.kpis.esperaMediaMin} min`,
            foot: `${formatPercent(data.kpis.canceladasPct)} canceladas · ${formatNumber(data.kpis.personas)} personas`,
            color: "blue",
          }}
        />
      </div>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Ocupación por horas y días</div>
            <div className="panel__subtitle">
              Reservas sentadas por franja · intensidad según volumen (heatmap horas × días)
            </div>
          </div>
        </div>
        <div className="report-chart report-chart--heatmap">
          <Heatmap
            celdas={data.heatmap.map((celda) => ({
              dia: celda.dia,
              hora: celda.hora,
              valor: celda.reservas,
              ocupacionPct: celda.ocupacionPct,
            }))}
            dias={DIAS_SEMANA}
            horas={HORAS}
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Detalle por día</div>
            <div className="panel__subtitle">
              {data.etiquetaPeriodo} · {formatNumber(data.kpis.personas)} personas sentadas
            </div>
          </div>
        </div>
        <DataTable
          columns={columnas}
          rows={data.serie}
          getRowKey={(row) => row.fecha}
          emptyTitle="Sin reservas en el período"
          emptyDescription="Prueba con otro rango de fechas o revisa la sede seleccionada."
        />
      </section>
    </div>
  )
}
