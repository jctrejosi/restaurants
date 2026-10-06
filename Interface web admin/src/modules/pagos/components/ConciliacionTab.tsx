import { Link } from "react-router-dom"
import { DataTable, type Column } from "@/components/data/DataTable"
import { MoneyCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { useSede } from "@/app/sede"
import { formatDateTime } from "@/lib/format"
import { usePagos } from "@/modules/pagos/api"
import type { PagoFila } from "@/modules/pagos/types"

/**
 * Conciliación: pagos reembolsados con su pedido y su documento fiscal. El detalle
 * completo (nota crédito, factura) se consulta en el drawer y en Facturación.
 */
export function ConciliacionTab({ onAbrirPago }: { onAbrirPago: (pagoId: string) => void }) {
  const { zonaHoraria } = useSede()
  const { data, isLoading, isError, error, refetch } = usePagos({ reembolsados: true, pageSize: 50 })

  const columnas: Column<PagoFila>[] = [
    { key: "fecha", header: "Reembolsado", cell: (pago) => formatDateTime(pago.reembolsadoEn ?? pago.fecha, zonaHoraria) },
    { key: "pedido", header: "Pedido", cell: (pago) => <span className="order-id">{pago.pedidoCodigo}</span> },
    { key: "medio", header: "Medio original", cell: (pago) => pago.medioNombre },
    {
      key: "monto",
      header: "Monto reembolsado",
      align: "right",
      cell: (pago) => <MoneyCell centavos={pago.montoCentavos} />,
    },
    { key: "cajero", header: "Cajero", cell: (pago) => pago.cajero },
    {
      key: "documento",
      header: "Documento fiscal",
      cell: (pago) => (
        <span className="pagos-meta">La factura y su nota crédito se consultan en Facturación</span>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      cell: (pago) => (
        <Button variant="ghost" className="text-action" onClick={() => onAbrirPago(pago.id)}>
          Ver conciliación
        </Button>
      ),
    },
  ]

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <div className="panel__title">Reembolsos y notas crédito</div>
          <div className="panel__subtitle">
            Cada reembolso conserva su pedido y se enlaza con el documento fiscal emitido en Facturación.
          </div>
        </div>
      </div>
      <DataTable
        columns={columnas}
        rows={data?.data ?? []}
        getRowKey={(pago) => pago.id}
        onRowClick={(pago) => onAbrirPago(pago.id)}
        loading={isLoading}
        error={isError ? (error as Error) : null}
        onRetry={() => void refetch()}
        emptyTitle="Sin reembolsos en el período"
        emptyDescription="Cuando un pago se reembolse aparecerá aquí con su conciliación."
        footer={
          <div className="pagos-pie">
            <span>{data?.total ?? 0} pagos reembolsados</span>
            <span className="pagos-pie__controles">
              <Link className="text-action" to="/facturacion">
                Ir a Facturación
              </Link>
            </span>
          </div>
        }
      />
    </section>
  )
}
