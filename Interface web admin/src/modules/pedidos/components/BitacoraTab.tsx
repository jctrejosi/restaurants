import { Download } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { BitacoraTimeline } from "@/modules/pedidos/components/BitacoraTimeline"
import type { PedidoDetalle } from "@/modules/pedidos/types"

export function BitacoraTab({
  pedido,
  puedeExportar,
  exportando,
  onExportar,
}: {
  pedido: PedidoDetalle
  puedeExportar: boolean
  exportando: boolean
  onExportar: () => void
}) {
  return (
    <div className="pedido-tab">
      <div className="bitacora__toolbar">
        <p className="detail-note">
          Bitácora inmutable con hora del servidor (RN-R5-02, RN-R5-08). Los cambios de valor muestran antes/después.
        </p>
        <Button
          variant="secondary"
          disabled={!puedeExportar || exportando}
          title={!puedeExportar ? "Requiere permiso de auditoria.exportar" : undefined}
          onClick={onExportar}
        >
          <Download size={15} /> {exportando ? "Exportando…" : "Exportar bitácora"}
        </Button>
      </div>
      {pedido.bitacora.length === 0 ? (
        <div className="state-block">
          <strong>Sin eventos en la bitácora</strong>
          <p>Cuando el pedido avance, aquí verás su línea de tiempo.</p>
        </div>
      ) : (
        <BitacoraTimeline eventos={pedido.bitacora} />
      )}
    </div>
  )
}
