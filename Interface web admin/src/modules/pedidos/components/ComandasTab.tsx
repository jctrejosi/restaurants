import { CookingPot } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { DurationCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { formatTime } from "@/lib/format"
import { COMANDA_ESTADO_LABEL, type PedidoDetalle } from "@/modules/pedidos/types"

export function ComandasTab({ pedido }: { pedido: PedidoDetalle }) {
  const navigate = useNavigate()

  if (pedido.comandas.length === 0) {
    return (
      <div className="pedido-tab">
        <div className="state-block">
          <strong>Aún no se han enviado comandas</strong>
          <p>Este pedido todavía no ha pasado a cocina o barra.</p>
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
              <th>Comanda</th>
              <th>Estación</th>
              <th className="cell-right">Líneas</th>
              <th>Estado</th>
              <th>Enviada</th>
              <th>Preparación</th>
              <th>Entregada</th>
            </tr>
          </thead>
          <tbody>
            {pedido.comandas.map((comanda) => {
              const excedida = comanda.tramoSeg !== null && comanda.tramoSeg > comanda.objetivoSeg
              return (
                <tr key={comanda.id}>
                  <td>
                    <span className="order-id">#{comanda.numero}</span>
                  </td>
                  <td>
                    <span className="station-tag">{comanda.estacion}</span>
                  </td>
                  <td className="cell-right">{comanda.lineas}</td>
                  <td>
                    <StatusBadge tone={comanda.estadoTone}>{COMANDA_ESTADO_LABEL[comanda.estado]}</StatusBadge>
                  </td>
                  <td>{formatTime(comanda.enviadaEn, pedido.zonaHoraria)}</td>
                  <td>
                    <DurationCell
                      segundos={comanda.tramoSeg}
                      objetivoSeg={comanda.objetivoSeg}
                      titulo={`SLA de ${comanda.estacion}: ${Math.round(comanda.objetivoSeg / 60)} min${excedida ? " (excedido)" : ""}`}
                    />
                  </td>
                  <td>{comanda.entregadaEn ? formatTime(comanda.entregadaEn, pedido.zonaHoraria) : "—"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="panel__footer">
        <span>Semáforo contra el objetivo de SLA de cada estación.</span>
        <Button variant="ghost" className="text-action" onClick={() => navigate("/comandas")}>
          <CookingPot size={14} /> Abrir monitor del KDS
        </Button>
      </div>
    </div>
  )
}
