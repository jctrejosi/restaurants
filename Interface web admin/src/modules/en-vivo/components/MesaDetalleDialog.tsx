import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { CalendarClock, Clock3, MapPin, ReceiptText, Users, UserRound, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { IconButton } from "@/components/ui/IconButton"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { MoneyCell } from "@/components/data/cells"
import { formatDuration, formatRelative } from "@/lib/format"
import { MESA_ESTADO_LABEL, MESA_ESTADO_TONE, type Mesa, type Zona } from "@/modules/salon/types"
import { MODALIDAD_LABEL, type PedidoActivo } from "@/modules/en-vivo/types"
import "@/modules/en-vivo/en-vivo.css"

/**
 * Detalle de una mesa desde «En vivo»: estado, ocupación y el pedido en curso
 * (plan 05 §6.3). Solo lectura: la operación la hacen el mesero/APK y los módulos.
 */
export function MesaDetalleDialog({
  mesa,
  zona,
  pedido,
  moneda,
  onVerPedido,
  onClose,
}: {
  mesa: Mesa | null
  zona?: Zona | null
  pedido: PedidoActivo | null
  moneda?: string
  /** Abre el detalle del pedido sin salir de «En vivo». */
  onVerPedido?: (pedidoId: string) => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!mesa) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [mesa, onClose])

  const navigate = useNavigate()

  if (!mesa) return null

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onClose} />
      <div className="modal mesa-detalle" role="dialog" aria-modal="true" aria-label={`Mesa ${mesa.numero}`}>
        <div className="modal__header">
          <span className="modal__icon">
            <MapPin size={18} />
          </span>
          <div>
            <strong>Mesa {mesa.numero}</strong>
            <p>
              {zona?.nombre ?? "Sin zona"} · {mesa.capacidad} pax
            </p>
          </div>
          <IconButton label="Cerrar" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>

        <div className="modal__body">
          <div className="mesa-detalle__badges">
            <StatusBadge tone={MESA_ESTADO_TONE[mesa.estado]}>{MESA_ESTADO_LABEL[mesa.estado]}</StatusBadge>
            {mesa.sesionAbierta ? <StatusBadge tone="amber">Sesión abierta</StatusBadge> : null}
            {mesa.reservasFuturas > 0 ? (
              <StatusBadge tone="blue">
                <CalendarClock size={11} /> {mesa.reservasFuturas} reserva(s)
              </StatusBadge>
            ) : null}
          </div>

          <div className="mesa-detalle__grid">
            <div className="mesa-detalle__dato">
              <span>
                <Users size={11} /> Capacidad
              </span>
              <strong>{mesa.capacidad} personas</strong>
            </div>
            <div className="mesa-detalle__dato">
              <span>
                <Clock3 size={11} /> Ocupada desde
              </span>
              <strong>{mesa.desde && mesa.estado !== "libre" ? formatRelative(mesa.desde) : "—"}</strong>
            </div>
            <div className="mesa-detalle__dato">
              <span>
                <UserRound size={11} /> Atendida por
              </span>
              <strong>{mesa.por ?? "—"}</strong>
            </div>
          </div>

          <div className="mesa-detalle__seccion">
            <div className="mesa-detalle__seccion-title">
              <ReceiptText size={13} /> Pedido en curso
            </div>
            {pedido ? (
              <div className="mesa-detalle__pedido">
                <div className="mesa-detalle__pedido-head">
                  <span className="mesa-detalle__folio">{pedido.folio}</span>
                  <StatusBadge tone={pedido.estadoTone}>{pedido.estado}</StatusBadge>
                </div>
                <dl className="mesa-detalle__filas">
                  <div>
                    <dt>Modalidad</dt>
                    <dd>{MODALIDAD_LABEL[pedido.modalidad]}</dd>
                  </div>
                  <div>
                    <dt>Canal</dt>
                    <dd>{pedido.canal}</dd>
                  </div>
                  <div>
                    <dt>Tiempo transcurrido</dt>
                    <dd>{formatDuration(pedido.transcurridoSeg)}</dd>
                  </div>
                  <div className="mesa-detalle__total">
                    <dt>Total</dt>
                    <dd>
                      <MoneyCell centavos={pedido.totalCentavos} moneda={moneda} />
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="mesa-detalle__vacio">
                Sin pedido en curso en esta mesa. La operación la registra el mesero desde el APK.
              </p>
            )}
          </div>
        </div>

        <div className="modal__footer">
          <Button variant="secondary" onClick={() => navigate("/salon")}>
            <MapPin size={15} /> Ver en Salón
          </Button>
          {pedido ? (
            <Button variant="primary" onClick={() => onVerPedido?.(pedido.id)}>
              <ReceiptText size={15} /> Ver pedido
            </Button>
          ) : null}
        </div>
      </div>
    </>
  )
}
