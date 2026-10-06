import { DataTable, type Column } from "@/components/data/DataTable"
import { KpiCard } from "@/components/data/KpiCard"
import { MoneyCell } from "@/components/data/cells"
import { ErrorState } from "@/components/ui/states"
import { SkeletonCards, SkeletonRows } from "@/components/ui/Skeleton"
import { formatMoney, formatNumber, formatPercent } from "@/lib/format"
import {
  useComparativoReporte,
  useDesempenoReporte,
  useImpuestosReporte,
} from "@/modules/reportes/api"
import type {
  FilaComparativo,
  FilaDesempeno,
  FilaImpuesto,
  ReporteFiltros,
} from "@/modules/reportes/types"

/* -------------------------------------------------------------------------- */
/* Desempeño por mesero, cajero y turno (V1, RF-R5-123)                        */
/* -------------------------------------------------------------------------- */

export function DesempenoPanel({
  filtros,
  sedeId,
}: {
  filtros: ReporteFiltros
  sedeId: string | null
}) {
  const { data, isLoading, isError, refetch } = useDesempenoReporte(filtros, sedeId, true)

  const columnas: Column<FilaDesempeno>[] = [
    {
      key: "persona",
      header: "Responsable",
      cell: (row) => (
        <>
          <span className="order-id">{row.nombre}</span>
          <span className="order-type">{row.rol}</span>
        </>
      ),
    },
    { key: "pedidos", header: "Pedidos pagados", align: "right", cell: (row) => formatNumber(row.pedidosPagados) },
    { key: "ventas", header: "Ventas", align: "right", cell: (row) => <MoneyCell centavos={row.ventasCentavos} /> },
    { key: "ticket", header: "Ticket promedio", align: "right", cell: (row) => <MoneyCell centavos={row.ticketCentavos} /> },
    { key: "propina", header: "Propinas", align: "right", cell: (row) => <MoneyCell centavos={row.propinaCentavos} /> },
    {
      key: "descuentos",
      header: "Descuentos",
      align: "right",
      cell: (row) => <MoneyCell centavos={row.descuentosCentavos} descuento />,
    },
    {
      key: "anulaciones",
      header: "Anulaciones",
      align: "right",
      cell: (row) => (
        <span className={row.anulaciones > 0 ? "money money--negative" : undefined}>
          {formatNumber(row.anulaciones)}
        </span>
      ),
    },
    {
      key: "anulado",
      header: "Importe anulado",
      align: "right",
      cell: (row) => <MoneyCell centavos={row.anuladoCentavos} descuento />,
    },
  ]

  if (isError) {
    return <ErrorState title="No pudimos consultar el desempeño del período" onRetry={() => void refetch()} />
  }

  if (isLoading || !data) {
    return (
      <div className="report-stack">
        <SkeletonCards count={5} />
        <section className="panel">
          <SkeletonRows rows={5} columns={7} />
        </section>
      </div>
    )
  }

  const dimensionLabel =
    data.dimension === "mesero" ? "meseros" : data.dimension === "cajero" ? "cajeros" : "turnos"

  return (
    <div className="report-stack">
      <div className="kpi-grid">
        <KpiCard
          data={{
            label: "Ventas del período",
            value: formatMoney(data.kpis.ventasCentavos),
            foot: data.etiquetaPeriodo,
            color: "terracotta",
          }}
        />
        <KpiCard
          data={{ label: "Pedidos pagados", value: formatNumber(data.kpis.pedidos), foot: dimensionLabel, color: "blue" }}
        />
        <KpiCard data={{ label: "Ticket promedio", value: formatMoney(data.kpis.ticketCentavos), color: "green" }} />
        <KpiCard
          data={{
            label: "Descuentos",
            value: formatMoney(data.kpis.descuentosCentavos),
            deltaNegativo: true,
            foot: "asociados a cada responsable",
            color: "gold",
          }}
        />
        <KpiCard
          data={{
            label: "Anulaciones",
            value: formatNumber(data.kpis.anulaciones),
            deltaNegativo: true,
            foot: "líneas o pedidos anulados",
            color: "purple",
          }}
        />
      </div>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Desempeño por {dimensionLabel}</div>
            <div className="panel__subtitle">
              {data.etiquetaPeriodo} · anulaciones y descuentos asociados (V1) · propinas incluidas
            </div>
          </div>
        </div>
        <DataTable
          columns={columnas}
          rows={data.filas}
          getRowKey={(row) => row.clave}
          emptyTitle="Sin actividad medible en el período"
          emptyDescription="No hay pedidos pagados atribuibles a los responsables en este rango."
        />
      </section>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Impuestos, propinas y descuentos (V1, RF-R5-124)                            */
/* -------------------------------------------------------------------------- */

function columnasImpuesto(): Column<FilaImpuesto>[] {
  return [
    { key: "etiqueta", header: "Concepto", cell: (row) => row.etiqueta },
    { key: "base", header: "Base", align: "right", cell: (row) => <MoneyCell centavos={row.baseCentavos} /> },
    { key: "impuesto", header: "Impuesto", align: "right", cell: (row) => <MoneyCell centavos={row.impuestoCentavos} /> },
    { key: "propina", header: "Propinas", align: "right", cell: (row) => <MoneyCell centavos={row.propinaCentavos} /> },
    {
      key: "descuentos",
      header: "Descuentos",
      align: "right",
      cell: (row) => <MoneyCell centavos={row.descuentosCentavos} descuento />,
    },
    { key: "total", header: "Total", align: "right", cell: (row) => <MoneyCell centavos={row.totalCentavos} /> },
  ]
}

export function ImpuestosPanel({
  filtros,
  sedeId,
}: {
  filtros: ReporteFiltros
  sedeId: string | null
}) {
  const { data, isLoading, isError, refetch } = useImpuestosReporte(filtros, sedeId, true)

  if (isError) {
    return <ErrorState title="No pudimos consultar los impuestos del período" onRetry={() => void refetch()} />
  }

  if (isLoading || !data) {
    return (
      <div className="report-stack">
        <SkeletonCards count={5} />
        <section className="panel">
          <SkeletonRows rows={3} columns={6} />
        </section>
        <section className="panel">
          <SkeletonRows rows={5} columns={6} />
        </section>
      </div>
    )
  }

  return (
    <div className="report-stack">
      <div className="kpi-grid">
        <KpiCard
          data={{
            label: "Base gravable",
            value: formatMoney(data.kpis.baseGravableCentavos),
            foot: data.etiquetaPeriodo,
            color: "blue",
          }}
        />
        <KpiCard
          data={{ label: "Impuestos trasladados", value: formatMoney(data.kpis.impuestosCentavos), color: "terracotta" }}
        />
        <KpiCard data={{ label: "Propinas", value: formatMoney(data.kpis.propinaCentavos), color: "green" }} />
        <KpiCard
          data={{
            label: "Descuentos",
            value: formatMoney(data.kpis.descuentosCentavos),
            deltaNegativo: true,
            color: "gold",
          }}
        />
        <KpiCard
          data={{
            label: "Total facturado",
            value: formatMoney(data.kpis.totalFacturadoCentavos),
            foot: "exportable a CSV/Excel para contabilidad",
            color: "purple",
          }}
        />
      </div>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Desglose por tasa</div>
            <div className="panel__subtitle">Bases, impuesto trasladado, propinas y descuentos del período</div>
          </div>
        </div>
        <DataTable
          columns={columnasImpuesto()}
          rows={data.porTasa}
          getRowKey={(row) => row.clave}
          emptyTitle="Sin movimientos fiscales"
          emptyDescription="No hay operaciones gravables en el rango seleccionado."
        />
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Detalle diario</div>
            <div className="panel__subtitle">{data.etiquetaPeriodo} · conciliable con caja y facturación</div>
          </div>
        </div>
        <DataTable
          columns={columnasImpuesto()}
          rows={data.porDia}
          getRowKey={(row) => row.clave}
          emptyTitle="Sin días con operación"
          emptyDescription="Ajusta el período del reporte."
        />
      </section>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Comparativo entre sucursales (V1, RF-R5-126)                                */
/* -------------------------------------------------------------------------- */

export function ComparativoPanel({
  filtros,
  sedeId,
}: {
  filtros: ReporteFiltros
  sedeId: string | null
}) {
  const { data, isLoading, isError, refetch } = useComparativoReporte(filtros, sedeId, true)

  if (isError) {
    return <ErrorState title="No pudimos consultar el comparativo entre sucursales" onRetry={() => void refetch()} />
  }

  if (isLoading || !data) {
    return (
      <div className="report-stack">
        <SkeletonCards count={3} />
        <section className="panel">
          <SkeletonRows rows={4} columns={6} />
        </section>
      </div>
    )
  }

  const etiquetaMetrica =
    data.metrica === "ventas" ? "Ventas" : data.metrica === "pedidos" ? "Pedidos pagados" : "Ticket promedio"
  const formatearValor = (valor: number) => (data.metrica === "pedidos" ? formatNumber(valor) : formatMoney(valor))
  const mejor = [...data.filas].sort((a, b) => b.valor - a.valor)[0]

  const columnas: Column<FilaComparativo>[] = [
    {
      key: "sede",
      header: "Sucursal",
      cell: (row) => (
        <>
          <span className="order-id">{row.sedeNombre}</span>
          <span className="order-type">{formatNumber(row.pedidos)} pedidos</span>
        </>
      ),
    },
    { key: "valor", header: etiquetaMetrica, align: "right", cell: (row) => formatearValor(row.valor) },
    {
      key: "anterior",
      header: "Período anterior",
      align: "right",
      cell: (row) => (row.valorAnterior === null ? "—" : formatearValor(row.valorAnterior)),
    },
    {
      key: "variacion",
      header: "Variación",
      align: "right",
      cell: (row) =>
        row.variacionPct === null ? (
          "—"
        ) : (
          <span className={row.variacionPct < 0 ? "money money--negative" : "money"}>
            {row.variacionPct >= 0 ? "+" : "−"}
            {formatPercent(Math.abs(row.variacionPct), 1)}
          </span>
        ),
    },
    { key: "ticketSede", header: "Ticket", align: "right", cell: (row) => <MoneyCell centavos={row.ticketCentavos} /> },
    { key: "participacion", header: "Participación", align: "right", cell: (row) => formatPercent(row.participacion, 1) },
  ]

  return (
    <div className="report-stack">
      <div className="kpi-grid report-kpi-grid--three">
        <KpiCard
          data={{
            label: `Total ${etiquetaMetrica.toLowerCase()}`,
            value:
              data.totalCentavos !== null
                ? formatMoney(data.totalCentavos)
                : formatNumber(data.filas.reduce((acumulado, fila) => acumulado + fila.valor, 0)),
            foot: data.etiquetaPeriodo,
            color: "terracotta",
          }}
        />
        <KpiCard
          data={{
            label: "Sucursal líder",
            value: mejor?.sedeNombre ?? "—",
            foot: mejor ? `${formatNumber(mejor.pedidos)} pedidos` : undefined,
            color: "green",
          }}
        />
        <KpiCard
          data={{
            label: "Sedes comparadas",
            value: formatNumber(data.filas.length),
            foot: "misma métrica y mismo período",
            color: "blue",
          }}
        />
      </div>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Comparativo · {etiquetaMetrica}</div>
            <div className="panel__subtitle">
              {data.etiquetaPeriodo} · variaciones contra el período anterior de cada sucursal
            </div>
          </div>
          <span className="report-note">Zona horaria por sede (RNF-R5-08)</span>
        </div>
        <DataTable
          columns={columnas}
          rows={data.filas}
          getRowKey={(row) => row.sedeId}
          emptyTitle="Sin sedes comparables"
          emptyDescription="No hay agregados para las sucursales del ámbito seleccionado."
        />
      </section>
    </div>
  )
}
