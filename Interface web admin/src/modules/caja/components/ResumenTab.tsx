import { Link } from "react-router-dom"
import { Receipt, Undo2 } from "lucide-react"
import { MoneyCell } from "@/components/data/cells"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { formatDateTime, formatMoney } from "@/lib/format"
import { MEDIO_PAGO_TIPO_LABEL, type TurnoDetalle } from "@/modules/caja/types"
import { semaforoDiferencia, SEMAFORO_LABEL } from "@/modules/caja/utils"

function Diferencia({ centavos, moneda }: { centavos: number | null; moneda: string }) {
  if (centavos === null) return <span className="caja-muted">Sin arquear</span>
  const semaforo = semaforoDiferencia(centavos)
  return (
    <span className={`caja-diferencia caja-diferencia--${semaforo}`} title={SEMAFORO_LABEL[semaforo]}>
      {centavos === 0 ? formatMoney(0, moneda) : `${centavos > 0 ? "+" : "−"}${formatMoney(Math.abs(centavos), moneda)}`}
    </span>
  )
}

/** Resumen del turno: ventas por medio, propinas, descuentos y pedidos (RF-R5-71/74). */
export function ResumenTab({ turno }: { turno: TurnoDetalle }) {
  const { moneda, zonaHoraria } = turno
  const descuentos = turno.descuentosCentavos

  return (
    <>
      <div className="caja-kpis">
        <article className="caja-kpi">
          <span className="caja-kpi__label">Ventas aprobadas</span>
          <strong className="caja-kpi__value">{formatMoney(turno.ventasCentavos, moneda)}</strong>
          <span className="caja-kpi__foot">{turno.pedidos.length} pedidos en el turno</span>
        </article>
        <article className="caja-kpi">
          <span className="caja-kpi__label">Propinas</span>
          <strong className="caja-kpi__value">{formatMoney(turno.propinasCentavos, moneda)}</strong>
          <span className="caja-kpi__foot">Solo pagos aprobados</span>
        </article>
        <article className="caja-kpi">
          <span className="caja-kpi__label">Descuentos del turno</span>
          <strong className="caja-kpi__value">{formatMoney(descuentos, moneda)}</strong>
          <span className="caja-kpi__foot">Ajustes, cortesías y recargos</span>
        </article>
        <article className="caja-kpi">
          <span className="caja-kpi__label">Esperado en caja</span>
          <strong className="caja-kpi__value">{formatMoney(turno.esperadoCentavos, moneda)}</strong>
          <span className="caja-kpi__foot">Base + ventas + propinas − retiros − gastos</span>
        </article>
        <article className="caja-kpi">
          <span className="caja-kpi__label">Contado</span>
          <strong className="caja-kpi__value">
            {turno.contadoCentavos === null ? "—" : formatMoney(turno.contadoCentavos, moneda)}
          </strong>
          <span className="caja-kpi__foot">{turno.contadoCentavos === null ? "Aún sin arqueo" : "Último arqueo"}</span>
        </article>
        <article className={`caja-kpi caja-kpi--${turno.diferenciaCentavos === null ? "pendiente" : semaforoDiferencia(turno.diferenciaCentavos)}`}>
          <span className="caja-kpi__label">Diferencia</span>
          <strong className="caja-kpi__value">
            <Diferencia centavos={turno.diferenciaCentavos} moneda={moneda} />
          </strong>
          <span className="caja-kpi__foot">contado − esperado</span>
        </article>
      </div>

      <div className="caja-grid-2">
        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__title">Ventas por medio de pago</div>
              <div className="panel__subtitle">Solo pagos aprobados; un medio deshabilitado no se ofrece.</div>
            </div>
            <Link className="text-action" to={`/pagos?turno=${turno.id}`}>
              <Receipt size={14} /> Ver pagos del turno
            </Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Medio</th>
                  <th className="cell-right">Ventas</th>
                  <th className="cell-right">Propinas</th>
                  <th className="cell-right">Esperado</th>
                  <th className="cell-right">Contado</th>
                  <th className="cell-right">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {turno.medios.map((medio) => (
                  <tr key={medio.medioPagoId}>
                    <td>
                      {medio.nombre}
                      <div className="caja-medio__meta">
                        {MEDIO_PAGO_TIPO_LABEL[medio.tipo]}
                        {medio.requiereReferencia ? " · requiere referencia" : ""}
                        {!medio.activo ? " · deshabilitado" : ""}
                      </div>
                    </td>
                    <td className="cell-right">
                      <MoneyCell centavos={medio.ventasCentavos} moneda={moneda} />
                    </td>
                    <td className="cell-right">
                      <MoneyCell centavos={medio.propinasCentavos} moneda={moneda} />
                    </td>
                    <td className="cell-right">
                      <MoneyCell centavos={medio.esperadoCentavos} moneda={moneda} />
                    </td>
                    <td className="cell-right">
                      {medio.contadoCentavos === null ? (
                        <span className="caja-muted">—</span>
                      ) : (
                        <MoneyCell centavos={medio.contadoCentavos} moneda={moneda} />
                      )}
                    </td>
                    <td className="cell-right">
                      <Diferencia centavos={medio.diferenciaCentavos} moneda={moneda} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__title">Pedidos del turno</div>
              <div className="panel__subtitle">
                {turno.pendientes.length > 0
                  ? `${turno.pendientes.length} pendientes de pago o cancelación.`
                  : "Todos los pedidos están pagados o cancelados."}
              </div>
            </div>
            {turno.reabiertoPor ? (
              <StatusBadge tone="amber" title={turno.reabiertoMotivo ?? undefined}>
                <Undo2 size={12} /> Reabierto por {turno.reabiertoPor}
              </StatusBadge>
            ) : null}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th className="cell-right">Total</th>
                  <th className="cell-right">Propina</th>
                </tr>
              </thead>
              <tbody>
                {turno.pedidos.map((pedido) => (
                  <tr key={pedido.id} className={pedido.pendiente ? "caja-pedido--pendiente" : undefined}>
                    <td>
                      <Link className="order-id" to={`/pedidos/${pedido.id}`}>
                        {pedido.codigo}
                      </Link>
                      <div className="caja-pedido__meta">
                        {pedido.modalidad}
                        {pedido.medioNombre ? ` · ${pedido.medioNombre}` : ""}
                      </div>
                    </td>
                    <td>
                      <span className={`status status--${pedido.estadoTone}`}>{pedido.estado.replace(/_/g, " ")}</span>
                      {pedido.pendiente ? <div className="caja-pedido__pendiente">Pendiente de cobro</div> : null}
                    </td>
                    <td>{formatDateTime(pedido.creadoEn, zonaHoraria)}</td>
                    <td className="cell-right">
                      <MoneyCell centavos={pedido.totalCentavos} moneda={moneda} />
                    </td>
                    <td className="cell-right">
                      <MoneyCell centavos={pedido.propinaCentavos} moneda={moneda} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}
