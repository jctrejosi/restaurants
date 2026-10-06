import { MoneyCell } from "@/components/data/cells"
import { StatusBadge } from "@/components/ui/StatusBadge"
import {
  CANAL_LABEL,
  ESTADO_LABEL,
  ESTADO_TONE,
  MODALIDAD_LABEL,
  type PedidoDetalle,
} from "@/modules/pedidos/types"

/** Cabecera de entidad del pedido: folio (mono), estado, modalidad y total. */
export function EntityHeader({ pedido }: { pedido: PedidoDetalle }) {
  return (
    <div className="pedido-entity">
      <div className="pedido-entity__row">
        <span className="pedido-entity__folio">{pedido.folio}</span>
        <StatusBadge tone={ESTADO_TONE[pedido.estado]}>{ESTADO_LABEL[pedido.estado]}</StatusBadge>
        <span className="pedido-entity__modalidad">{MODALIDAD_LABEL[pedido.modalidad]}</span>
        <span className="pedido-entity__canal">{CANAL_LABEL[pedido.canal]}</span>
        {pedido.mesa ? <span className="pedido-entity__mesa">{pedido.mesa}</span> : null}
      </div>
      <div className="pedido-entity__total">
        <span>Total del pedido</span>
        <MoneyCell centavos={pedido.montos.totalCentavos} moneda="MXN" />
      </div>
    </div>
  )
}
