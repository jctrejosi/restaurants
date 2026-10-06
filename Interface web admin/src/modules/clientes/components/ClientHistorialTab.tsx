import { Link } from "react-router-dom"
import { DataTable, type Column } from "@/components/data/DataTable"
import { MoneyCell } from "@/components/data/cells"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { formatDateTime } from "@/lib/format"
import type { ClienteHistorialItem } from "@/modules/clientes/types"

/** Historial de pedidos y reservas con enlaces a sus módulos (RF-R5-90). */
export function ClientHistorialTab({
  historial,
  zonaHoraria,
}: {
  historial: ClienteHistorialItem[]
  zonaHoraria: string
}) {
  const columnas: Column<ClienteHistorialItem>[] = [
    {
      key: "folio",
      header: "Documento",
      cell: (item) => (
        <>
          <Link
            className="button button--ghost text-action"
            to={item.tipo === "pedido" ? `/pedidos/${item.id}` : `/reservas/${item.id}`}
          >
            {item.folio}
          </Link>
          <span className="order-type">{item.tipo === "pedido" ? "Pedido" : "Reserva"}</span>
        </>
      ),
    },
    { key: "fecha", header: "Fecha", cell: (item) => formatDateTime(item.fecha, zonaHoraria) },
    {
      key: "origen",
      header: "Canal · origen",
      cell: (item) => `${item.canal} · ${item.origen}`,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (item) => <StatusBadge tone={item.estadoTone}>{item.estado}</StatusBadge>,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (item) => (item.tipo === "pedido" ? <MoneyCell centavos={item.totalCentavos} /> : "—"),
    },
  ]

  return (
    <div className="cliente-tab">
      <p className="clientes-hint">
        Los enlaces abren el pedido o la reserva en su módulo; aquí no se expone contacto a roles sin permiso.
      </p>
      <DataTable
        columns={columnas}
        rows={historial}
        getRowKey={(item) => item.id}
        emptyTitle="Sin historial"
        emptyDescription="Este cliente aún no tiene pedidos ni reservas registradas."
      />
    </div>
  )
}
