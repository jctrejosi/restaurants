import { Download, ExternalLink } from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { KpiCard } from "@/components/data/KpiCard"
import { MoneyCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { Skeleton, SkeletonCards, SkeletonRows } from "@/components/ui/Skeleton"
import { useAuth } from "@/app/auth"
import { formatMoney, formatNumber, formatPercent } from "@/lib/format"
import { useVentasReporte } from "@/modules/reportes/api"
import { BarrasHorizontales, SerieBarras, SerieLinea } from "@/modules/reportes/components/charts"
import type { FilaDesglose, FilaProducto, ReporteFiltros } from "@/modules/reportes/types"

function puntosSparkline(serie: { totalCentavos: number }[]): string | undefined {
  if (serie.length < 2) return undefined
  const maximo = Math.max(...serie.map((punto) => punto.totalCentavos), 1)
  return serie
    .map((punto, indice) => {
      const x = (indice / (serie.length - 1)) * 100
      const y = 31 - (punto.totalCentavos / maximo) * 27
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
}

function variacion(delta: number | null, etiqueta: string): string {
  if (delta === null) return `vs ${etiqueta}`
  const signo = delta >= 0 ? "+" : "−"
  return `${signo}${formatPercent(Math.abs(delta), 1)} vs ${etiqueta}`
}

/** Reporte de ventas (RF-R5-120): coincide con caja y facturación del período. */
export function VentasPanel({
  filtros,
  sedeId,
  onAbrirPedidos,
  onAbrirProducto,
}: {
  filtros: ReporteFiltros
  sedeId: string | null
  onAbrirPedidos: () => void
  onAbrirProducto: (productoId: string) => void
}) {
  const { data, isLoading, isError, refetch, isFetching } = useVentasReporte(filtros, sedeId, true)
  const { tienePermiso } = useAuth()
  const puedeExportar = tienePermiso("reportes.exportar")

  const columnasDesglose: Column<FilaDesglose>[] = [
    { key: "periodo", header: "Período", cell: (row) => row.etiqueta },
    { key: "pedidos", header: "Pedidos", align: "right", cell: (row) => formatNumber(row.pedidos) },
    { key: "subtotal", header: "Subtotal", align: "right", cell: (row) => <MoneyCell centavos={row.subtotalCentavos} /> },
    {
      key: "descuentos",
      header: "Descuentos",
      align: "right",
      cell: (row) => <MoneyCell centavos={row.descuentosCentavos} descuento />,
    },
    { key: "impuestos", header: "Impuestos", align: "right", cell: (row) => <MoneyCell centavos={row.impuestosCentavos} /> },
    { key: "propina", header: "Propina", align: "right", cell: (row) => <MoneyCell centavos={row.propinaCentavos} /> },
    { key: "total", header: "Total", align: "right", cell: (row) => <MoneyCell centavos={row.totalCentavos} /> },
    {
      key: "participacion",
      header: "Participación",
      align: "right",
      cell: (row) => formatPercent(row.participacion, 1),
    },
  ]

  const columnasProducto: Column<FilaProducto>[] = [
    {
      key: "producto",
      header: "Producto",
      cell: (row) => (
        <>
          <span className="order-id">{row.nombre}</span>
          <span className="order-type">{row.categoria}</span>
        </>
      ),
    },
    { key: "cantidad", header: "Cantidad", align: "right", cell: (row) => formatNumber(row.cantidad) },
    { key: "importe", header: "Importe", align: "right", cell: (row) => <MoneyCell centavos={row.importeCentavos} /> },
    {
      key: "participacion",
      header: "Participación",
      align: "right",
      cell: (row) => formatPercent(row.participacion, 1),
    },
    {
      key: "accion",
      header: "",
      align: "right",
      cell: () => (
        <span className="report-link">
          <ExternalLink size={13} /> Ver producto
        </span>
      ),
    },
  ]

  if (isError) {
    return <ErrorState title="No pudimos consultar los agregados de ventas" onRetry={() => void refetch()} />
  }

  if (isLoading || !data) {
    return (
      <div className="report-stack">
        <SkeletonCards count={5} />
        <section className="panel">
          <div className="report-chart-skeleton">
            <Skeleton height={190} />
          </div>
        </section>
        <section className="panel">
          <SkeletonRows rows={5} columns={7} />
        </section>
      </div>
    )
  }

  const comparativo = data.comparativo
  const sinVentas = data.kpis.totalCentavos === 0

  if (sinVentas) {
    return (
      <EmptyState
        title="Aún no hay ventas en este período"
        description="Cambia el período o revisa que el job de analytics haya refrescado los agregados."
        action={{ label: "Ver hoy", onClick: onAbrirPedidos }}
      />
    )
  }

  const puntos = data.serie.map((punto) => ({
    etiqueta: punto.etiqueta,
    valor: punto.totalCentavos,
    detalle: `${formatMoney(punto.totalCentavos)} · ${formatNumber(punto.pedidos)} pedidos`,
  }))

  return (
    <div className="report-stack">
      <div className="kpi-grid">
        <KpiCard
          data={{
            label: "Total vendido",
            value: formatMoney(data.kpis.totalCentavos),
            delta: comparativo ? variacion(comparativo.variacionPct, comparativo.etiquetaAnterior) : undefined,
            deltaNegativo: (comparativo?.variacionPct ?? 0) < 0,
            foot: data.etiquetaPeriodo,
            color: "terracotta",
            points: puntosSparkline(data.serie),
          }}
        />
        <KpiCard
          data={{
            label: "Pedidos pagados",
            value: formatNumber(data.kpis.pedidos),
            foot: "solo pedidos `pagado`, líneas no anuladas",
            color: "blue",
          }}
        />
        <KpiCard
          data={{
            label: "Ticket promedio",
            value: formatMoney(data.kpis.ticketCentavos),
            foot: "total ÷ pedidos pagados",
            color: "green",
          }}
        />
        <KpiCard
          data={{
            label: "Descuentos",
            value: formatMoney(data.kpis.descuentosCentavos),
            deltaNegativo: true,
            foot: "aplicados en el período",
            color: "gold",
          }}
        />
        <KpiCard
          data={{
            label: "Impuestos + propinas",
            value: formatMoney(data.kpis.impuestosCentavos + data.kpis.propinaCentavos),
            foot: `${formatMoney(data.kpis.impuestosCentavos)} IVA · ${formatMoney(data.kpis.propinaCentavos)} propina`,
            color: "purple",
          }}
        />
      </div>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Ventas por período</div>
            <div className="panel__subtitle">
              {data.etiquetaPeriodo} · agrupación {filtros.agrupacion} · {data.serie.length} puntos
            </div>
          </div>
          <span className="report-conciliacion" title="Conciliación contra caja y facturación del mismo período">
            Conciliado con caja y facturación · diferencia {formatMoney(data.conciliacion.diferenciaCentavos)}
          </span>
        </div>
        <div className="report-chart">
          {data.serie.length > 16 ? (
            <SerieLinea puntos={puntos} formatear={formatMoney} />
          ) : (
            <SerieBarras puntos={puntos} formatear={formatMoney} />
          )}
        </div>
      </section>

      <div className="report-split">
        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__title">Por sede</div>
              <div className="panel__subtitle">Misma métrica y período por sucursal</div>
            </div>
          </div>
          <div className="report-chart">
            <BarrasHorizontales
              filas={data.porSede.map((fila) => ({
                etiqueta: fila.etiqueta,
                valor: fila.totalCentavos,
                nota: `${formatNumber(fila.pedidos)} pedidos`,
              }))}
              formatear={formatMoney}
              color="var(--leaf)"
            />
          </div>
        </section>
        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__title">Por canal</div>
              <div className="panel__subtitle">Salón, web, app, QR, teléfono y mesero</div>
            </div>
          </div>
          <div className="report-chart">
            <BarrasHorizontales
              filas={data.porCanal.map((fila) => ({
                etiqueta: fila.etiqueta,
                valor: fila.totalCentavos,
                nota: `${formatNumber(fila.pedidos)} pedidos`,
              }))}
              formatear={formatMoney}
            />
          </div>
        </section>
        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__title">Por modalidad</div>
              <div className="panel__subtitle">Mesa, recoger y domicilio</div>
            </div>
          </div>
          <div className="report-chart">
            <BarrasHorizontales
              filas={data.porModalidad.map((fila) => ({
                etiqueta: fila.etiqueta,
                valor: fila.totalCentavos,
                nota: `${formatNumber(fila.pedidos)} pedidos`,
              }))}
              formatear={formatMoney}
              color="var(--blue)"
            />
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Desglose del período</div>
            <div className="panel__subtitle">
              Subtotal, descuentos, impuestos y propina por {filtros.agrupacion} · toca una fila para ver los pedidos
            </div>
          </div>
          <div className="report-actions">
            {puedeExportar ? (
              <Button variant="secondary" disabled={isFetching} onClick={onAbrirPedidos}>
                <ExternalLink size={15} /> Ver pedidos
              </Button>
            ) : null}
          </div>
        </div>
        <DataTable
          columns={columnasDesglose}
          rows={data.desglose}
          getRowKey={(row) => row.clave}
          onRowClick={onAbrirPedidos}
          emptyTitle="Sin movimientos en el período"
          emptyDescription="Ajusta el rango o los filtros del reporte."
        />
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Ventas por producto</div>
            <div className="panel__subtitle">
              Top {data.productos.length} productos · drill-down al catálogo
            </div>
          </div>
          <span className="report-note">
            <Download size={13} aria-hidden="true" /> Exportable desde la barra superior
          </span>
        </div>
        <DataTable
          columns={columnasProducto}
          rows={data.productos}
          getRowKey={(row) => row.productoId}
          onRowClick={(row) => onAbrirProducto(row.productoId)}
          emptyTitle="Sin productos vendidos en el período"
          emptyDescription="La categoría o el producto filtrado no registran ventas."
        />
      </section>
    </div>
  )
}
