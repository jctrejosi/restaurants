import { useState } from "react"
import { Link } from "react-router-dom"
import { ExternalLink, RotateCcw } from "lucide-react"
import { Drawer } from "@/components/ui/Drawer"
import { MoneyCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { ErrorState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { formatDateTime, formatMoney, maskContact, maskName } from "@/lib/format"
import { useAuth } from "@/app/auth"
import { usePagoDetalle } from "@/modules/pagos/api"
import { AJUSTE_LABEL, PAGO_ESTADO_LABEL } from "@/modules/pagos/types"
import { ReembolsoDialog } from "@/modules/pagos/components/ReembolsoDialog"

/** Detalle del pago por pedido y por medio, con propinas, descuentos y conciliación. */
export function PagoDetailDrawer({ pagoId, onClose }: { pagoId: string | null; onClose: () => void }) {
  const { tienePermiso } = useAuth()
  const { data: pago, isLoading, isError, error, refetch } = usePagoDetalle(pagoId)
  const [reembolsoOpen, setReembolsoOpen] = useState(false)

  const puedeReembolsar = tienePermiso("pagos.reembolsar")
  /// Supuesto: un permiso específico gobierna los datos personales (RN-R5-07).
  const puedeVerPii = tienePermiso("pagos.datos_personales")

  return (
    <Drawer
      open={Boolean(pagoId)}
      onClose={onClose}
      title={pago ? `Pago ${pago.id}` : "Pago"}
      subtitle={pago ? `${pago.pedidoCodigo} · ${pago.medioNombre} · ${formatDateTime(pago.fecha, pago.zonaHoraria)}` : "Cargando…"}
      width={620}
      footer={
        pago ? (
          <>
            <Link className="text-action" to={`/pedidos/${pago.pedidoId}`}>
              <ExternalLink size={14} /> Ver pedido en Pedidos
            </Link>
            <Button
              variant="primary"
              disabled={!puedeReembolsar || !pago.reembolso.posible}
              title={
                !puedeReembolsar
                  ? "Requiere permiso de pagos.reembolsar"
                  : pago.reembolso.motivoNoPosible ?? undefined
              }
              onClick={() => setReembolsoOpen(true)}
            >
              <RotateCcw size={15} /> Reembolsar
            </Button>
          </>
        ) : null
      }
    >
      {isError ? (
        <ErrorState
          title="No pudimos cargar el pago"
          description={(error as Error)?.message ?? "Reintenta en unos segundos."}
          onRetry={() => void refetch()}
        />
      ) : isLoading || !pago ? (
        <SkeletonRows rows={6} columns={4} />
      ) : (
        <div className="pagos-detalle">
          <div className="pagos-detalle__estado">
            <StatusBadge tone={pago.estadoTone}>{PAGO_ESTADO_LABEL[pago.estado]}</StatusBadge>
            {pago.reembolsadoEn ? (
              <span className="pagos-detalle__meta">
                Reembolsado el {formatDateTime(pago.reembolsadoEn, pago.zonaHoraria)}
              </span>
            ) : null}
          </div>

          <section className="pagos-detalle__bloque">
            <h4>Por pedido</h4>
            <dl className="pagos-detalle__lista">
              <div>
                <dt>Pedido</dt>
                <dd>
                  <Link className="order-id" to={`/pedidos/${pago.pedido.id}`}>
                    {pago.pedido.codigo}
                  </Link>{" "}
                  <span className={`status status--${pago.pedido.estadoTone}`}>
                    {pago.pedido.estado.replace(/_/g, " ")}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Turno</dt>
                <dd>
                  <Link className="text-action" to={`/caja/${pago.pedido.turnoId}`}>
                    {pago.pedido.turnoNumero}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Total del pedido</dt>
                <dd>
                  <MoneyCell centavos={pago.pedido.totalCentavos} moneda={pago.moneda} />
                </dd>
              </div>
              <div>
                <dt>Descuentos</dt>
                <dd>
                  <MoneyCell centavos={pago.pedido.descuentosCentavos} moneda={pago.moneda} descuento />
                </dd>
              </div>
              <div>
                <dt>Propina</dt>
                <dd>
                  <MoneyCell centavos={pago.pedido.propinaCentavos} moneda={pago.moneda} />
                </dd>
              </div>
              <div>
                <dt>Cliente</dt>
                <dd>
                  {puedeVerPii ? pago.cliente.nombre : maskName(pago.cliente.nombre)}
                  {pago.cliente.contacto ? (
                    <div className="pagos-detalle__meta">
                      {puedeVerPii ? pago.cliente.contacto : maskContact(pago.cliente.contacto)}
                    </div>
                  ) : null}
                </dd>
              </div>
            </dl>
            {!puedeVerPii ? (
              <p className="pagos-detalle__meta">
                Datos personales enmascarados para tu rol (RN-R5-07).
              </p>
            ) : null}
          </section>

          <section className="pagos-detalle__bloque">
            <h4>Por medio de pago</h4>
            <dl className="pagos-detalle__lista">
              <div>
                <dt>Medio</dt>
                <dd>{pago.medioNombre}</dd>
              </div>
              <div>
                <dt>Referencia</dt>
                <dd>{pago.referencia ?? "No aplica"}</dd>
              </div>
              <div>
                <dt>Monto</dt>
                <dd>
                  <MoneyCell centavos={pago.montoCentavos} moneda={pago.moneda} />
                </dd>
              </div>
              <div>
                <dt>Propina</dt>
                <dd>
                  <MoneyCell centavos={pago.propinaCentavos} moneda={pago.moneda} />
                </dd>
              </div>
              <div>
                <dt>Cajero</dt>
                <dd>{pago.cajero}</dd>
              </div>
              <div>
                <dt>Descuento aplicado</dt>
                <dd>
                  <MoneyCell centavos={pago.descuentoCentavos} moneda={pago.moneda} descuento />
                </dd>
              </div>
            </dl>
          </section>

          <section className="pagos-detalle__bloque">
            <h4>Líneas del pedido aplicadas al pago</h4>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th className="cell-right">Cant.</th>
                    <th className="cell-right">Precio</th>
                    <th className="cell-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pago.lineas.map((linea) => (
                    <tr key={linea.id}>
                      <td>{linea.descripcion}</td>
                      <td className="cell-right">{linea.cantidad}</td>
                      <td className="cell-right">
                        <MoneyCell centavos={linea.precioCentavos} moneda={pago.moneda} />
                      </td>
                      <td className="cell-right">
                        <MoneyCell centavos={linea.totalCentavos} moneda={pago.moneda} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {pago.ajustes.length > 0 ? (
            <section className="pagos-detalle__bloque">
              <h4>Descuentos, cortesías y recargos</h4>
              <ul className="pagos-detalle__ajustes">
                {pago.ajustes.map((ajuste) => (
                  <li key={ajuste.id}>
                    <span className="pagos-detalle__ajuste-tipo">{AJUSTE_LABEL[ajuste.tipo]}</span>
                    <MoneyCell centavos={ajuste.valorCentavos} moneda={pago.moneda} descuento={ajuste.tipo !== "recargo"} />
                    {ajuste.porcentaje ? <span className="pagos-detalle__meta">{ajuste.porcentaje}%</span> : null}
                    <span className="pagos-detalle__meta">
                      {ajuste.motivo} · {ajuste.usuario}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="pagos-detalle__bloque">
            <h4>Conciliación y documento fiscal</h4>
            <p className="pagos-detalle__conciliacion">
              {pago.conciliacion.conciliado ? "Conciliado" : "Sin conciliar"} · {pago.conciliacion.detalle}
            </p>
            {pago.factura ? (
              <dl className="pagos-detalle__lista">
                <div>
                  <dt>Factura</dt>
                  <dd>
                    <Link className="text-action" to={`/facturacion?factura=${pago.factura.id}`}>
                      {pago.factura.prefijo}-{pago.factura.numero}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt>Estado DIAN</dt>
                  <dd>
                    <StatusBadge tone={pago.factura.estadoTone}>{pago.factura.estadoDian}</StatusBadge>
                  </dd>
                </div>
                <div>
                  <dt>Total facturado</dt>
                  <dd>
                    <MoneyCell centavos={pago.factura.totalCentavos} moneda={pago.moneda} />
                  </dd>
                </div>
                <div>
                  <dt>Nota crédito</dt>
                  <dd>{pago.conciliacion.notaCredito ?? "Sin nota crédito"}</dd>
                </div>
              </dl>
            ) : (
              <p className="pagos-detalle__meta">
                Este pago no tiene factura vinculada. La emisión vive en el módulo de Facturación.
              </p>
            )}
          </section>

          <section className="pagos-detalle__bloque">
            <h4>Trazabilidad</h4>
            <ul className="pagos-detalle__auditoria">
              {pago.auditoria.map((evento) => (
                <li key={evento.id}>
                  <StatusBadge tone={evento.accion === "reembolsado" ? "blue" : "gray"}>{evento.accion}</StatusBadge>
                  <span>
                    {formatDateTime(evento.ocurridoEn, pago.zonaHoraria)} · {evento.actor}
                    {evento.motivo ? ` · ${evento.motivo}` : ""}
                  </span>
                </li>
              ))}
            </ul>
            <p className="pagos-detalle__meta">Nada de lo auditado se edita ni se borra desde la UI.</p>
          </section>

          <p className="pagos-detalle__meta">
            Máximo reembolsable: {formatMoney(pago.reembolso.maximoCentavos, pago.moneda)}
            {pago.reembolso.motivoNoPosible ? ` · ${pago.reembolso.motivoNoPosible}` : ""}
          </p>
        </div>
      )}

      <ReembolsoDialog
        open={reembolsoOpen}
        pago={pago ?? null}
        onCancel={() => setReembolsoOpen(false)}
        onConfirmado={() => {
          setReembolsoOpen(false)
          void refetch()
        }}
      />
    </Drawer>
  )
}
