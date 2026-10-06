import { useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ExternalLink, FileCode, FileText, RefreshCw, ShieldAlert } from "lucide-react"
import { Drawer } from "@/components/ui/Drawer"
import { MoneyCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { ErrorState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { formatDateTime, formatMoney } from "@/lib/format"
import { useAuth } from "@/app/auth"
import { useFacturaDetalle } from "@/modules/facturacion/api"
import { TIPO_DOCUMENTO_LABEL } from "@/modules/facturacion/types"
import { EstadoDianBadge } from "@/modules/facturacion/components/EstadoDianBadge"
import { ReintentarDialog } from "@/modules/facturacion/components/ReintentarDialog"
import { NotaCreditoDialog } from "@/modules/facturacion/components/NotaCreditoDialog"

function Archivo({ url, etiqueta, icono }: { url: string | null; etiqueta: string; icono: ReactNode }) {
  if (!url) {
    return (
      <span className="facturacion-meta" title="El proveedor aún no ha generado el archivo">
        {etiqueta}: en proceso
      </span>
    )
  }
  return (
    <a className="text-action" href={url} target="_blank" rel="noreferrer">
      {icono} {etiqueta}
    </a>
  )
}

/** Detalle de la factura: líneas, impuestos, vínculos, XML/PDF, timeline y notas crédito. */
export function FacturaDetailDrawer({ facturaId, onClose }: { facturaId: string | null; onClose: () => void }) {
  const { tienePermiso } = useAuth()
  const { data: factura, isLoading, isError, error, refetch } = useFacturaDetalle(facturaId)
  const [reintentarOpen, setReintentarOpen] = useState(false)
  const [notaOpen, setNotaOpen] = useState(false)

  const puedeReintentar = tienePermiso("facturacion.reintentar")
  const puedeNotas = tienePermiso("facturacion.notas")

  return (
    <Drawer
      open={Boolean(facturaId)}
      onClose={onClose}
      title={factura ? `${factura.prefijo}-${factura.numero}` : "Factura"}
      subtitle={
        factura
          ? `${TIPO_DOCUMENTO_LABEL[factura.tipo]} · pedido ${factura.pedidoCodigo} · ${formatDateTime(factura.emitidaEn, factura.zonaHoraria)}`
          : "Cargando…"
      }
      width={640}
      footer={
        factura ? (
          <>
            <Link className="text-action" to={`/pedidos/${factura.pedidoId}`}>
              <ExternalLink size={14} /> Ver pedido
            </Link>
            {factura.tipo === "factura" && factura.estadoDian === "aceptada" ? (
              <Button
                variant="secondary"
                disabled={!puedeNotas}
                title={puedeNotas ? undefined : "Requiere permiso de facturacion.notas"}
                onClick={() => setNotaOpen(true)}
              >
                Emitir nota crédito
              </Button>
            ) : null}
            <Button
              variant="primary"
              disabled={!puedeReintentar || !factura.reintentable}
              title={
                !puedeReintentar
                  ? "Requiere permiso de facturacion.reintentar"
                  : factura.motivoNoReintentable ?? undefined
              }
              onClick={() => setReintentarOpen(true)}
            >
              <RefreshCw size={15} /> Reintentar
            </Button>
          </>
        ) : null
      }
    >
      {isError ? (
        <ErrorState
          title="No pudimos cargar la factura"
          description={(error as Error)?.message ?? "Reintenta en unos segundos."}
          onRetry={() => void refetch()}
        />
      ) : isLoading || !factura ? (
        <SkeletonRows rows={7} columns={4} />
      ) : (
        <div className="facturacion-detalle">
          <div className="facturacion-detalle__estado">
            <EstadoDianBadge estado={factura.estadoDian} />
            <span className="facturacion-meta">
              Resolución {factura.resolucion} · CUFE {factura.cufe ?? "pendiente"}
            </span>
          </div>

          {factura.errorProveedor ? (
            <div className="facturacion-error-proveedor" role="alert">
              <ShieldAlert size={17} aria-hidden="true" />
              <div>
                <strong>Error del proveedor ({factura.errorProveedor.intentos} intentos)</strong>
                <span>
                  {factura.errorProveedor.causa} · {formatDateTime(factura.errorProveedor.ocurridoEn, factura.zonaHoraria)}
                </span>
              </div>
            </div>
          ) : null}

          {factura.facturaOriginal ? (
            <p className="facturacion-meta">
              Documento relacionado con la factura{" "}
              <Link className="text-action" to={`/facturacion?factura=${factura.facturaOriginal.id}`}>
                {factura.facturaOriginal.numero}
              </Link>
            </p>
          ) : null}

          <section className="facturacion-detalle__bloque">
            <h4>Vínculo con pedido y pagos</h4>
            <dl className="facturacion-detalle__lista">
              <div>
                <dt>Pedido</dt>
                <dd>
                  <Link className="order-id" to={`/pedidos/${factura.pedido.id}`}>
                    {factura.pedido.codigo}
                  </Link>{" "}
                  <span className="facturacion-meta">{factura.pedido.estado.replace(/_/g, " ")}</span>
                </dd>
              </div>
              <div>
                <dt>Turno</dt>
                <dd>
                  <Link className="text-action" to={`/caja/${factura.pedido.turnoId}`}>
                    {factura.pedido.turnoNumero}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Pagos</dt>
                <dd>
                  {factura.pagos.length === 0 ? (
                    <span className="facturacion-meta">Sin pagos vinculados</span>
                  ) : (
                    <Link className="text-action" to={`/pagos?pedido=${factura.pedidoCodigo}`}>
                      {factura.pagos.length} pago(s) · ver en Pagos
                    </Link>
                  )}
                </dd>
              </div>
            </dl>
            {factura.pagos.length > 0 ? (
              <ul className="facturacion-detalle__pagos">
                {factura.pagos.map((pago) => (
                  <li key={pago.id}>
                    <span>{pago.medioNombre}</span>
                    <MoneyCell centavos={pago.montoCentavos} moneda={factura.moneda} />
                    <span className={`status status--${pago.estado === "aprobado" ? "green" : "gray"}`}>
                      {pago.estado}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="facturacion-detalle__bloque">
            <h4>Líneas (snapshot fiscal)</h4>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th className="cell-right">Cant.</th>
                    <th className="cell-right">Precio</th>
                    <th className="cell-right">Impuesto</th>
                    <th className="cell-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {factura.lineas.map((linea) => (
                    <tr key={linea.id}>
                      <td>{linea.descripcion}</td>
                      <td className="cell-right">{linea.cantidad}</td>
                      <td className="cell-right">
                        <MoneyCell centavos={linea.precioCentavos} moneda={factura.moneda} />
                      </td>
                      <td className="cell-right">
                        <MoneyCell centavos={linea.impuestoCentavos} moneda={factura.moneda} />
                        <div className="facturacion-meta">{linea.impuestoNombre}</div>
                      </td>
                      <td className="cell-right">
                        <MoneyCell centavos={linea.totalCentavos} moneda={factura.moneda} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="facturacion-detalle__lista facturacion-detalle__lista--totales">
              {factura.impuestos.map((impuesto) => (
                <div key={impuesto.nombre}>
                  <dt>
                    {impuesto.nombre} ({(impuesto.tasaBps / 100).toFixed(2)} %)
                  </dt>
                  <dd>
                    base <MoneyCell centavos={impuesto.baseCentavos} moneda={factura.moneda} /> ·{" "}
                    <MoneyCell centavos={impuesto.impuestoCentavos} moneda={factura.moneda} />
                  </dd>
                </div>
              ))}
              <div>
                <dt>Total</dt>
                <dd>
                  <strong>{formatMoney(factura.totalCentavos, factura.moneda)}</strong>
                </dd>
              </div>
            </dl>
          </section>

          <section className="facturacion-detalle__bloque">
            <h4>Archivos y notas crédito</h4>
            <div className="facturacion-detalle__archivos">
              <Archivo url={factura.xmlUrl} etiqueta="XML" icono={<FileCode size={14} />} />
              <Archivo url={factura.pdfUrl} etiqueta="PDF" icono={<FileText size={14} />} />
            </div>
            {factura.notasCredito.length === 0 ? (
              <p className="facturacion-meta">Sin notas crédito relacionadas.</p>
            ) : (
              <ul className="facturacion-detalle__notas">
                {factura.notasCredito.map((nota) => (
                  <li key={nota.id}>
                    <Link className="text-action" to={`/facturacion?factura=${nota.id}`}>
                      {nota.numero}
                    </Link>
                    <MoneyCell centavos={nota.totalCentavos} moneda={factura.moneda} />
                    <EstadoDianBadge estado={nota.estadoDian} />
                    <span className="facturacion-meta">{formatDateTime(nota.emitidaEn, factura.zonaHoraria)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="facturacion-detalle__bloque">
            <h4>Timeline de estados y reintentos</h4>
            <ol className="facturacion-timeline">
              {factura.timeline.map((evento) => (
                <li key={evento.id}>
                  <span className={`facturacion-timeline__dot facturacion-timeline__dot--${evento.accion}`} />
                  <div>
                    <strong>{evento.accion}</strong>
                    <span className="facturacion-meta">
                      {formatDateTime(evento.ocurridoEn, factura.zonaHoraria)} · {evento.actor}
                    </span>
                    {evento.causa ? <p className="facturacion-timeline__causa">{evento.causa}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
            {factura.reintentos.length > 0 ? (
              <p className="facturacion-meta">
                {factura.reintentos.length} reintento(s) registrados; el último fue{" "}
                {factura.reintentos[factura.reintentos.length - 1]?.resultado}.
              </p>
            ) : null}
          </section>
        </div>
      )}

      {factura ? (
        <>
          <ReintentarDialog
            open={reintentarOpen}
            factura={factura}
            onCancel={() => setReintentarOpen(false)}
            onReintentado={() => {
              setReintentarOpen(false)
              void refetch()
            }}
          />
          <NotaCreditoDialog
            open={notaOpen}
            factura={factura}
            onCancel={() => setNotaOpen(false)}
            onEmitida={() => {
              setNotaOpen(false)
              void refetch()
            }}
          />
        </>
      ) : null}
    </Drawer>
  )
}
