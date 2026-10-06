import { MoneyCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { formatMoney } from "@/lib/format"
import {
  LINEA_ESTADO_LABEL,
  pedidoEstaAbierto,
  type PedidoDetalle,
  type PedidoLinea,
} from "@/modules/pedidos/types"

export function LineasTab({
  pedido,
  puedeAnular,
  onAnularLinea,
}: {
  pedido: PedidoDetalle
  puedeAnular: boolean
  onAnularLinea: (linea: PedidoLinea) => void
}) {
  const abierto = pedidoEstaAbierto(pedido.estado)

  return (
    <div className="pedido-tab">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Estación</th>
              <th className="cell-right">Cant.</th>
              <th className="cell-right">Precio</th>
              <th className="cell-right">Importe</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pedido.lineas.map((linea) => {
              const anulada = linea.estado === "anulada"
              const bloqueado = !puedeAnular || !abierto || anulada
              return (
                <tr key={linea.id} className={anulada ? "row--muted" : undefined}>
                  <td className="cell-wrap">
                    <span className="linea-nombre">{linea.nombreSnapshot}</span>
                    {linea.comensal ? <span className="linea-comensal">Comensal {linea.comensal}</span> : null}
                    {linea.modificadores.length > 0 ? (
                      <span className="linea-mods">
                        {linea.modificadores.map((mod) => (
                          <span className="mod-tag" key={mod.id}>
                            {mod.nombreSnapshot}
                            {mod.precioSnapshotCentavos > 0 ? ` +${formatMoney(mod.precioSnapshotCentavos)}` : ""}
                          </span>
                        ))}
                      </span>
                    ) : null}
                    {linea.notas ? <span className="linea-notas">Nota: {linea.notas}</span> : null}
                  </td>
                  <td>
                    <span className="station-tag">{linea.estacion}</span>
                  </td>
                  <td className="cell-right">{linea.cantidad}</td>
                  <td className="cell-right">
                    <MoneyCell centavos={linea.precioSnapshotCentavos} />
                  </td>
                  <td className="cell-right">
                    <MoneyCell centavos={linea.importeCentavos} />
                  </td>
                  <td>
                    <StatusBadge tone={linea.estadoTone}>{LINEA_ESTADO_LABEL[linea.estado]}</StatusBadge>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      className="text-action"
                      disabled={bloqueado}
                      title={
                        !puedeAnular
                          ? "Requiere permiso de pedidos.anular_linea"
                          : !abierto
                            ? "El pedido ya no admite cambios"
                            : anulada
                              ? "La línea ya está anulada"
                              : undefined
                      }
                      onClick={() => onAnularLinea(linea)}
                    >
                      Anular
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="panel__footer">
        <span>Los precios son snapshots: no cambian con el catálogo (RN-R5-04).</span>
        <span>
          Subtotal de líneas activas: <MoneyCell centavos={pedido.montos.subtotalCentavos} />
        </span>
      </div>
    </div>
  )
}
