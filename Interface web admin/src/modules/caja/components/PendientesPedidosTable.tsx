import { Link } from "react-router-dom"
import type { PedidoTurno } from "@/modules/caja/types"
import { MoneyCell } from "@/components/data/cells"
import { formatDateTime } from "@/lib/format"

/**
 * Pedidos del turno que aún no están pagados ni cancelados (CA-11-02): el cierre
 * los muestra con su detalle y enlace al pedido en lugar de ocultarlos.
 */
export function PendientesPedidosTable({
  pedidos,
  moneda,
  zonaHoraria,
}: {
  pedidos: PedidoTurno[]
  moneda?: string
  zonaHoraria?: string
}) {
  if (pedidos.length === 0) {
    return (
      <p className="caja-pendientes__vacio">
        No hay pedidos pendientes: el turno se puede cerrar sin forzar nada.
      </p>
    )
  }

  return (
    <div className="table-wrap caja-pendientes__tabla">
      <table>
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Estado</th>
            <th>Creado</th>
            <th className="cell-right">Total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <tr key={pedido.id}>
              <td>
                <span className="order-id">{pedido.codigo}</span>
                <div className="caja-pendientes__modalidad">{pedido.modalidad}</div>
              </td>
              <td>
                <span className={`status status--${pedido.estadoTone}`}>{pedido.estado.replace(/_/g, " ")}</span>
              </td>
              <td>{formatDateTime(pedido.creadoEn, zonaHoraria)}</td>
              <td className="cell-right">
                <MoneyCell centavos={pedido.totalCentavos} moneda={moneda} />
              </td>
              <td className="cell-right">
                <Link className="text-action" to={`/pedidos/${pedido.id}`}>
                  Ver pedido
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
