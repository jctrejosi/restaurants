import { AlertTriangle, BadgePercent, ChefHat, Send, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { formatMoney } from "@/lib/format"
import { DialogoBase } from "@/modules/tomar-pedido/components/DialogoBase"
import { comandasPrevistas, lineasSinEstacion, unidadesCarrito } from "@/modules/tomar-pedido/totales"
import {
  MODALIDAD_LABEL,
  type DescuentoAplicado,
  type LineaCarrito,
  type Modalidad,
  type TotalesCarrito,
} from "@/modules/tomar-pedido/types"

/**
 * Resumen e impacto antes de enviar: comandas por estación, avisos de líneas
 * sin estación y de turno, y nota de idempotencia (plan §3 y §8).
 */
export function ConfirmarEnvioDialog({
  open,
  modalidad,
  mesaNumero,
  clienteNombre,
  lineas,
  totales,
  descuento,
  turnoAbierto,
  avisoMesa,
  enviando,
  moneda,
  onClose,
  onConfirm,
}: {
  open: boolean
  modalidad: Modalidad
  mesaNumero: string | null
  clienteNombre: string | null
  lineas: LineaCarrito[]
  totales: TotalesCarrito
  descuento: DescuentoAplicado | null
  turnoAbierto: boolean
  /** Aviso cuando la mesa forzada no está libre (plan §8). */
  avisoMesa?: string | null
  enviando: boolean
  moneda?: string
  onClose: () => void
  onConfirm: () => void
}) {
  const comandas = comandasPrevistas(lineas)
  const sinEstacion = lineasSinEstacion(lineas)

  return (
    <DialogoBase
      open={open}
      onClose={onClose}
      icon={<ChefHat size={18} />}
      title="Enviar pedido a cocina"
      subtitle="Se crea el pedido con folio y una comanda por estación"
      footer={
        <>
          <Button variant="secondary" disabled={enviando} onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={enviando || lineas.length === 0} onClick={onConfirm}>
            <Send size={15} /> {enviando ? "Enviando…" : "Enviar a cocina"}
          </Button>
        </>
      }
    >
      <dl className="tp-confirmar__resumen">
        <div>
          <dt>Modalidad</dt>
          <dd>
            {MODALIDAD_LABEL[modalidad]}
            {mesaNumero ? ` · Mesa ${mesaNumero}` : ""}
          </dd>
        </div>
        <div>
          <dt>Cliente</dt>
          <dd>{clienteNombre ?? "Público general"}</dd>
        </div>
        <div>
          <dt>Líneas</dt>
          <dd>
            {lineas.length} línea(s) · {unidadesCarrito(lineas)} pieza(s)
          </dd>
        </div>
        <div>
          <dt>Comandas</dt>
          <dd>
            {comandas.length === 0
              ? "Ninguna: todas las líneas van sin estación"
              : comandas.map((comanda) => `${comanda.estacion} (${comanda.lineas})`).join(" · ")}
          </dd>
        </div>
        <div className="tp-confirmar__total">
          <dt>Total con propina</dt>
          <dd>{formatMoney(totales.totalCentavos, moneda)}</dd>
        </div>
      </dl>

      {sinEstacion > 0 ? (
        <p className="tp-confirmar__aviso">
          <WifiOff size={14} /> {sinEstacion} pieza(s) sin estación no generarán comanda; se cobran pero no llegan
          a cocina.
        </p>
      ) : null}

      {avisoMesa ? (
        <p className="tp-confirmar__aviso">
          <AlertTriangle size={14} /> {avisoMesa}
        </p>
      ) : null}

      {modalidad === "mesa" && !mesaNumero ? (
        <p className="tp-confirmar__aviso">
          <AlertTriangle size={14} /> Pedido de mesa sin mesa asignada: se enviará igual, asígnala después desde
          Pedidos si es necesario.
        </p>
      ) : null}

      {!turnoAbierto ? (
        <p className="tp-confirmar__aviso">
          <AlertTriangle size={14} /> No hay turno de caja abierto: puedes enviar, pero «Cobrar (V1)» quedará
          bloqueado.
        </p>
      ) : null}

      {descuento ? (
        <p className="tp-confirmar__aviso tp-confirmar__aviso--info">
          <BadgePercent size={14} /> Descuento {descuento.tipo === "porcentaje" ? `${descuento.valor}%` : "fijo"} ·{" "}
          {descuento.motivo}
        </p>
      ) : null}

      <p className="modal__note">
        Si la impresora de comandas falla, el envío no se bloquea: el trabajo queda en cola para reintentar. Doble
        clic no duplica el pedido (misma clave de idempotencia).
      </p>
    </DialogoBase>
  )
}
