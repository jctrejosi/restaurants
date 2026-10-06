/**
 * Métricas UTM (V2, RF-R5-104; plan 08 §3): atribución de reservas y pedidos por
 * campaña y origen. Solo agregados sin datos personales (RN-R5-07) y frescura
 * visible ≤ 1 min (RNF-R5-02).
 */

import { useMetricasUtm } from "@/modules/promociones/api"
import { MoneyCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { formatNumber, formatRelative } from "@/lib/format"

export function UtmBoard() {
  const metricas = useMetricasUtm()

  if (metricas.isError) {
    return (
      <div className="state-block state-block--error">
        <strong>No pudimos cargar las métricas</strong>
        <p>El tablero lee agregados de analytics; reintenta en unos segundos.</p>
        <Button variant="secondary" onClick={() => void metricas.refetch()}>Reintentar</Button>
      </div>
    )
  }

  if (metricas.isLoading || !metricas.data) {
    return (
      <div className="skeleton-rows">
        <div className="skeleton-rows__row"><span className="skeleton" style={{ width: "100%", height: 24 }} /></div>
        <div className="skeleton-rows__row"><span className="skeleton" style={{ width: "100%", height: 24 }} /></div>
        <div className="skeleton-rows__row"><span className="skeleton" style={{ width: "100%", height: 24 }} /></div>
      </div>
    )
  }

  const filas = metricas.data.filas
  const totalPedidos = filas.reduce((total, fila) => total + fila.pedidos, 0)
  const totalReservas = filas.reduce((total, fila) => total + fila.reservas, 0)
  const totalIngreso = filas.reduce((total, fila) => total + fila.ingresoCentavos, 0)
  const maximo = Math.max(1, ...filas.map((fila) => fila.ingresoCentavos))

  return (
    <div className="promo-utm">
      <div className="module-notice">
        <strong>Actualizado hace {formatRelative(metricas.data.actualizadoEn)}</strong>
        <span>Frescura objetivo ≤ 1 min (RNF-R5-02). Solo se muestran agregados, sin datos personales.</span>
      </div>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Atribución por UTM y origen</div>
            <div className="panel__subtitle">
              Reservas y pedidos atribuidos a la campaña con la que llegó el cliente.
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Campaña</th>
                <th>Origen · medio</th>
                <th className="cell-right">Pedidos</th>
                <th className="cell-right">Reservas</th>
                <th className="cell-right">Ingreso</th>
                <th>Participación</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.id}>
                  <td>
                    <strong>{fila.campana}</strong>
                  </td>
                  <td>
                    {fila.origen} · {fila.medio}
                  </td>
                  <td className="cell-right">{formatNumber(fila.pedidos)}</td>
                  <td className="cell-right">{formatNumber(fila.reservas)}</td>
                  <td className="cell-right">
                    <MoneyCell centavos={fila.ingresoCentavos} />
                  </td>
                  <td>
                    <span className="promo-utm__bar">
                      <span style={{ width: `${Math.round((fila.ingresoCentavos / maximo) * 100)}%` }} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>
                  <strong>Total</strong>
                </td>
                <td className="cell-right">
                  <strong>{formatNumber(totalPedidos)}</strong>
                </td>
                <td className="cell-right">
                  <strong>{formatNumber(totalReservas)}</strong>
                </td>
                <td className="cell-right">
                  <strong>
                    <MoneyCell centavos={totalIngreso} />
                  </strong>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="panel__footer">
          <span>
            {filas.length} campaña(s) con actividad · atribución calculada por analytics (V2).
          </span>
        </div>
      </section>
    </div>
  )
}
