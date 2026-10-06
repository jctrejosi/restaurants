import { MoneyCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { formatDateTime } from "@/lib/format"
import { PAGO_ESTADO_LABEL, type PedidoDetalle, type PedidoPago } from "@/modules/pedidos/types"

export function PagosTab({
  pedido,
  puedeReembolsar,
  onReembolsar,
}: {
  pedido: PedidoDetalle
  puedeReembolsar: boolean
  onReembolsar: (pago: PedidoPago) => void
}) {
  const pagadoAprobado = pedido.pagos
    .filter((pago) => pago.estado === "aprobado")
    .reduce((total, pago) => total + pago.montoCentavos, 0)
  const conciliado = pagadoAprobado >= pedido.montos.totalCentavos && pedido.montos.totalCentavos > 0

  if (pedido.pagos.length === 0) {
    return (
      <div className="pedido-tab">
        <div className="state-block">
          <strong>Este pedido aún no tiene pagos registrados</strong>
          <p>El cobro se registra en caja; aquí verás la conciliación cuando exista.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pedido-tab">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Medio</th>
              <th>Referencia</th>
              <th className="cell-right">Monto</th>
              <th className="cell-right">Propina</th>
              <th>Estado</th>
              <th>Conciliación</th>
              <th>Aprobado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pedido.pagos.map((pago) => {
              const reembolsable = puedeReembolsar && pago.estado === "aprobado"
              return (
                <tr key={pago.id}>
                  <td>{pago.medio}</td>
                  <td>{pago.referencia ?? "—"}</td>
                  <td className="cell-right">
                    <MoneyCell centavos={pago.montoCentavos} />
                  </td>
                  <td className="cell-right">
                    <MoneyCell centavos={pago.propinaCentavos} />
                  </td>
                  <td>
                    <StatusBadge tone={pago.estadoTone}>{PAGO_ESTADO_LABEL[pago.estado]}</StatusBadge>
                  </td>
                  <td>
                    <StatusBadge tone={pago.conciliado ? "green" : "amber"}>
                      {pago.conciliado ? "Conciliado" : "Sin conciliar"}
                    </StatusBadge>
                  </td>
                  <td>{pago.aprobadoEn ? formatDateTime(pago.aprobadoEn, pedido.zonaHoraria) : "—"}</td>
                  <td>
                    <Button
                      variant="ghost"
                      className="text-action"
                      disabled={!reembolsable}
                      title={
                        !puedeReembolsar
                          ? "Requiere permiso de pedidos.reembolsar"
                          : pago.estado === "reembolsado"
                            ? "El pago ya está reembolsado"
                            : pago.estado !== "aprobado"
                              ? "Solo se reembolsan pagos aprobados"
                              : undefined
                      }
                      onClick={() => onReembolsar(pago)}
                    >
                      Reembolsar
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="panel__footer">
        <span>
          Conciliación contra el total del pedido:{" "}
          <StatusBadge tone={conciliado ? "green" : "amber"}>
            {conciliado ? "Cuadrado" : "Pendiente"}
          </StatusBadge>
        </span>
        <span>
          Pagado aprobado: <MoneyCell centavos={pagadoAprobado} /> · Total:{" "}
          <MoneyCell centavos={pedido.montos.totalCentavos} />
        </span>
      </div>
    </div>
  )
}
