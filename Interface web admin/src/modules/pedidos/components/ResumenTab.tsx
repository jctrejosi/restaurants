import { DurationCell, MoneyCell } from "@/components/data/cells"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { formatDateTime, maskContact, maskName } from "@/lib/format"
import {
  AJUSTE_LABEL,
  ESTADO_LABEL,
  ESTADO_TONE,
  type PedidoDetalle,
} from "@/modules/pedidos/types"

export function ResumenTab({
  pedido,
  puedeVerPii,
}: {
  pedido: PedidoDetalle
  puedeVerPii: boolean
}) {
  const { montos, tiempos } = pedido
  const contacto = pedido.cliente.telefono

  return (
    <div className="pedido-resumen">
      <section className="detail-block">
        <h4>Cliente y servicio</h4>
        <div className="detail-row">
          <span>Cliente</span>
          <strong>{puedeVerPii ? pedido.cliente.nombre : maskName(pedido.cliente.nombre)}</strong>
        </div>
        {contacto ? (
          <div className="detail-row">
            <span>Teléfono</span>
            <strong>{puedeVerPii ? contacto : maskContact(contacto)}</strong>
          </div>
        ) : null}
        <div className="detail-row">
          <span>Mesero</span>
          <strong>{pedido.mesero}</strong>
        </div>
        <div className="detail-row">
          <span>{pedido.modalidad === "mesa" ? "Mesa" : "Entrega"}</span>
          <strong>{pedido.modalidad === "mesa" ? (pedido.mesa ?? "Sin asignar") : pedido.modalidad === "domicilio" ? "Domicilio" : "Mostrador"}</strong>
        </div>
        <div className="detail-row">
          <span>Comensales</span>
          <strong>{pedido.comensales}</strong>
        </div>
        <div className="detail-row">
          <span>Turno</span>
          <strong>{pedido.turno}</strong>
        </div>
        <div className="detail-row">
          <span>Creado</span>
          <strong>{formatDateTime(pedido.creadoEn, pedido.zonaHoraria)}</strong>
        </div>
        {!puedeVerPii ? (
          <p className="detail-note">
            Contacto enmascarado por políticas de datos personales. Esta consulta queda registrada.
          </p>
        ) : null}
      </section>

      <section className="detail-block">
        <h4>Montos</h4>
        <div className="totals">
          <div className="totals__row">
            <span>Subtotal</span>
            <MoneyCell centavos={montos.subtotalCentavos} />
          </div>
          <div className="totals__row">
            <span>Descuentos y cortesías</span>
            <MoneyCell centavos={-montos.descuentosCentavos} descuento />
          </div>
          <div className="totals__row">
            <span>Impuestos</span>
            <MoneyCell centavos={montos.impuestosCentavos} />
          </div>
          <div className="totals__row">
            <span>Recargos</span>
            <MoneyCell centavos={montos.recargosCentavos} />
          </div>
          <div className="totals__row">
            <span>Propina</span>
            <MoneyCell centavos={montos.propinaCentavos} />
          </div>
          <div className="totals__row totals__row--total">
            <span>Total</span>
            <MoneyCell centavos={montos.totalCentavos} />
          </div>
        </div>
        <p className="detail-note">Total = subtotal − descuentos + impuestos + recargos + propina.</p>
      </section>

      <section className="detail-block detail-block--wide">
        <h4>Tiempos del pedido</h4>
        <div className="detail-row">
          <span>Atención</span>
          <DurationCell segundos={tiempos.atencionSeg} titulo="= enviado a cocina − creado" />
        </div>
        <div className="detail-row">
          <span>Preparación</span>
          <DurationCell segundos={tiempos.preparacionSeg} titulo="= listo − enviado a cocina" />
        </div>
        <div className="detail-row">
          <span>{tiempos.despachoModo === "domicilio" ? "Ruta" : "Despacho / recogida"}</span>
          <DurationCell
            segundos={tiempos.despachoSeg}
            titulo={tiempos.despachoModo === "domicilio" ? "= entrega − listo" : "= recogida − listo"}
          />
        </div>
        <div className="detail-row">
          <span>Cobro</span>
          <DurationCell segundos={tiempos.cobroSeg} titulo="= pagado − por cobrar" />
        </div>
        <div className="detail-row detail-row--total">
          <span>Total</span>
          <DurationCell segundos={tiempos.totalSeg} titulo="= cierre − creado" />
        </div>
        <p className="detail-note">Los tramos sin evento de cierre se muestran «—» y no promedian.</p>
      </section>

      {pedido.ajustes.length > 0 ? (
        <section className="detail-block detail-block--wide">
          <h4>Ajustes</h4>
          {pedido.ajustes.map((ajuste) => (
            <div className="detail-row" key={ajuste.id}>
              <span>
                {AJUSTE_LABEL[ajuste.tipo]}
                {ajuste.porcentaje ? ` · ${ajuste.porcentaje}%` : ""} · {ajuste.usuario}
              </span>
              <span className="detail-row__value">
                <MoneyCell centavos={ajuste.tipo === "recargo" ? ajuste.valorCentavos : -ajuste.valorCentavos} descuento={ajuste.tipo !== "recargo"} />
                <small>{ajuste.motivo}</small>
              </span>
            </div>
          ))}
        </section>
      ) : null}

      {pedido.tieneIncidencias ? (
        <section className="detail-block detail-block--wide">
          <h4>Incidencias</h4>
          <div className="detail-row">
            <span>Se detectaron incidencias en este pedido</span>
            <StatusBadge tone={ESTADO_TONE[pedido.estado]}>{ESTADO_LABEL[pedido.estado]}</StatusBadge>
          </div>
        </section>
      ) : null}
    </div>
  )
}
