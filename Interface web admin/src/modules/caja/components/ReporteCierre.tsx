import { useState } from "react"
import { FileDown, Printer } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { useToast } from "@/components/ui/toast"
import { formatDateTime, formatMoney } from "@/lib/format"
import { useExportarCaja } from "@/modules/caja/api"
import { MEDIO_PAGO_TIPO_LABEL, type FormatoExportacion, type TurnoDetalle } from "@/modules/caja/types"
import { semaforoDiferencia, signoDiferencia } from "@/modules/caja/utils"

const FORMATOS: FormatoExportacion[] = ["csv", "xlsx", "pdf"]

/** Reporte de cierre del turno, imprimible y exportable (RF-R5-74/CA-11-05). */
export function ReporteCierre({ turno, puedeExportar }: { turno: TurnoDetalle; puedeExportar: boolean }) {
  const { mostrar } = useToast()
  const exportar = useExportarCaja()
  const [error, setError] = useState<string | null>(null)

  const descargar = (formato: FormatoExportacion) => {
    setError(null)
    exportar.mutate(
      {
        tipo: "caja_turno",
        formato,
        filtros: { turnoId: turno.id, numero: turno.numero, sucursalId: turno.sucursalId },
      },
      {
        onSuccess: () =>
          mostrar(
            `Exportación ${formato.toUpperCase()} registrada. Se genera en segundo plano y se avisará al solicitante.`,
            "exito",
          ),
        onError: (err) => setError(err instanceof Error ? err.message : "No se pudo registrar la exportación."),
      },
    )
  }

  const diferencia = turno.arqueo?.diferenciaCentavos ?? null
  const semaforo = diferencia === null ? "aviso" : semaforoDiferencia(diferencia)

  return (
    <section className="panel caja-reporte">
      <div className="panel__header caja-reporte__cabecera">
        <div>
          <div className="panel__title">Reporte de cierre · {turno.numero}</div>
          <div className="panel__subtitle">
            {turno.sucursalNombre} · apertura {formatDateTime(turno.abiertoEn, turno.zonaHoraria)}
            {turno.cierre ? ` · cierre ${formatDateTime(turno.cierre.cerradoEn, turno.zonaHoraria)}` : " · turno abierto"}
          </div>
        </div>
        <div className="caja-reporte__acciones">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={15} /> Imprimir
          </Button>
          {puedeExportar ? (
            FORMATOS.map((formato) => (
              <Button
                key={formato}
                variant="secondary"
                disabled={exportar.isPending}
                onClick={() => descargar(formato)}
              >
                <FileDown size={15} /> {formato.toUpperCase()}
              </Button>
            ))
          ) : (
            <Button variant="secondary" disabled title="Requiere permiso de caja.exportar">
              <FileDown size={15} /> Exportar
            </Button>
          )}
        </div>
      </div>
      {error ? <p className="caja-error caja-reporte__error">{error}</p> : null}

      <div className="caja-reporte__cuerpo">
        <div className="caja-reporte__bloque">
          <h4>Resumen de ventas</h4>
          <dl className="caja-reporte__totales">
            <div>
              <dt>Ventas aprobadas</dt>
              <dd>{formatMoney(turno.ventasCentavos, turno.moneda)}</dd>
            </div>
            <div>
              <dt>Propinas</dt>
              <dd>{formatMoney(turno.propinasCentavos, turno.moneda)}</dd>
            </div>
            <div>
              <dt>Descuentos</dt>
              <dd>{formatMoney(turno.descuentosCentavos, turno.moneda)}</dd>
            </div>
            <div>
              <dt>Pedidos</dt>
              <dd>
                {turno.pedidos.length} ({turno.pendientes.length} pendientes)
              </dd>
            </div>
          </dl>
        </div>

        <div className="caja-reporte__bloque">
          <h4>Arqueo</h4>
          <dl className="caja-reporte__totales">
            <div>
              <dt>Base inicial</dt>
              <dd>{formatMoney(turno.arqueo?.baseInicialCentavos ?? turno.baseInicialCentavos, turno.moneda)}</dd>
            </div>
            <div>
              <dt>Retiros</dt>
              <dd>{formatMoney(turno.arqueo?.retirosCentavos ?? 0, turno.moneda)}</dd>
            </div>
            <div>
              <dt>Gastos</dt>
              <dd>{formatMoney(turno.arqueo?.gastosCentavos ?? 0, turno.moneda)}</dd>
            </div>
            <div>
              <dt>Esperado</dt>
              <dd>{formatMoney(turno.esperadoCentavos, turno.moneda)}</dd>
            </div>
            <div>
              <dt>Contado</dt>
              <dd>{turno.contadoCentavos === null ? "—" : formatMoney(turno.contadoCentavos, turno.moneda)}</dd>
            </div>
            <div className={`caja-reporte__diferencia caja-reporte__diferencia--${semaforo}`}>
              <dt>Diferencia</dt>
              <dd>
                {diferencia === null
                  ? "Sin arqueo"
                  : `${signoDiferencia(diferencia)} ${formatMoney(Math.abs(diferencia), turno.moneda)}`}
              </dd>
            </div>
          </dl>
        </div>

        <div className="caja-reporte__bloque caja-reporte__bloque--ancho">
          <h4>Detalle por medio de pago</h4>
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
                      <div className="caja-medio__meta">{MEDIO_PAGO_TIPO_LABEL[medio.tipo]}</div>
                    </td>
                    <td className="cell-right">
                      <span className="money">{formatMoney(medio.ventasCentavos, turno.moneda)}</span>
                    </td>
                    <td className="cell-right">
                      <span className="money">{formatMoney(medio.propinasCentavos, turno.moneda)}</span>
                    </td>
                    <td className="cell-right">
                      <span className="money">{formatMoney(medio.esperadoCentavos, turno.moneda)}</span>
                    </td>
                    <td className="cell-right">
                      <span className="money">
                        {medio.contadoCentavos === null ? "—" : formatMoney(medio.contadoCentavos, turno.moneda)}
                      </span>
                    </td>
                    <td className="cell-right">
                      <span className={`caja-diferencia caja-diferencia--${semaforoDiferencia(medio.diferenciaCentavos ?? 0)}`}>
                        {medio.diferenciaCentavos === null
                          ? "—"
                          : formatMoney(medio.diferenciaCentavos, turno.moneda)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="caja-reporte__bloque caja-reporte__bloque--ancho">
          <h4>Observaciones y rastro</h4>
          <p className="caja-reporte__observaciones">
            {turno.arqueo?.observaciones?.trim()
              ? turno.arqueo.observaciones
              : "Sin observaciones registradas en el arqueo."}
          </p>
          {turno.cierre?.motivoForzado ? (
            <p className="caja-reporte__rastro">
              <strong>Cierre forzado:</strong> {turno.cierre.motivoForzado}
            </p>
          ) : null}
          {turno.reabiertoPor ? (
            <p className="caja-reporte__rastro">
              <strong>Reapertura:</strong> {turno.reabiertoPor},{" "}
              {turno.reabiertoEn ? formatDateTime(turno.reabiertoEn, turno.zonaHoraria) : "—"} ·{" "}
              {turno.reabiertoMotivo ?? "sin motivo"}
            </p>
          ) : null}
          <ul className="caja-reporte__eventos">
            {turno.auditoria.map((evento) => (
              <li key={evento.id}>
                <span className={`status status--${evento.accion === "reaperturado" ? "amber" : "gray"}`}>
                  {evento.accion}
                </span>
                <span>
                  {formatDateTime(evento.ocurridoEn, turno.zonaHoraria)} · {evento.actor}
                  {evento.motivo ? ` · ${evento.motivo}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
