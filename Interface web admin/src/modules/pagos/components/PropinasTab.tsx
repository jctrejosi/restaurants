import { useState } from "react"
import { Download, HandCoins } from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { MoneyCell } from "@/components/data/cells"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Button } from "@/components/ui/Button"
import { TextField } from "@/components/ui/fields"
import { ErrorState, NoPermissionState } from "@/components/ui/states"
import { SkeletonCards } from "@/components/ui/Skeleton"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { formatDateTime, formatMoney } from "@/lib/format"
import { haceDiasISO, hoyISO, useCrearLiquidacion, useExportarLiquidacion, useExportarPagos, usePropinas } from "@/modules/pagos/api"
import type { LiquidacionPropinas } from "@/modules/pagos/types"

/** V1: liquidación de propinas por período, exportable para el reparto del local. */
export function PropinasTab({
  puedePropinas,
  puedeExportar,
}: {
  puedePropinas: boolean
  puedeExportar: boolean
}) {
  const { mostrar } = useToast()
  const [desde, setDesde] = useState(() => haceDiasISO(7))
  const [hasta, setHasta] = useState(hoyISO)
  const [liquidarOpen, setLiquidarOpen] = useState(false)

  const { data, isLoading, isError, error, refetch } = usePropinas(desde, hasta)
  const crear = useCrearLiquidacion()
  const exportarLiquidacion = useExportarLiquidacion()
  const exportarPeriodo = useExportarPagos()

  if (!puedePropinas) {
    return <NoPermissionState permiso="pagos.propinas" />
  }

  if (isError) {
    return (
      <ErrorState
        title="No pudimos cargar la liquidación de propinas"
        description={(error as Error)?.message ?? "Reintenta en unos segundos."}
        onRetry={() => void refetch()}
      />
    )
  }

  const columnasLiquidaciones: Column<LiquidacionPropinas>[] = [
    {
      key: "periodo",
      header: "Período",
      cell: (liquidacion) => `${liquidacion.periodoDesde} → ${liquidacion.periodoHasta}`,
    },
    {
      key: "total",
      header: "Propinas",
      align: "right",
      cell: (liquidacion) => <MoneyCell centavos={liquidacion.totalCentavos} moneda={data?.moneda} />,
    },
    { key: "pagos", header: "Pagos", align: "right", cell: (liquidacion) => String(liquidacion.pagos) },
    {
      key: "creada",
      header: "Generada",
      cell: (liquidacion) => `${formatDateTime(liquidacion.creadaEn, data?.zonaHoraria)} · ${liquidacion.creadaPor}`,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (liquidacion) => (
        <span className={`status status--${liquidacion.estado === "exportada" ? "blue" : "amber"}`}>
          {liquidacion.estado === "exportada" ? "Exportada" : "Borrador"}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      cell: (liquidacion) => (
        <Button
          variant="ghost"
          className="text-action"
          disabled={!puedeExportar || exportarLiquidacion.isPending}
          title={puedeExportar ? undefined : "Requiere permiso de pagos.exportar"}
          onClick={(event) => {
            event.stopPropagation()
            exportarLiquidacion.mutate(liquidacion.id, {
              onSuccess: () =>
                mostrar("Liquidación exportada. El archivo se genera en segundo plano y queda registrado.", "exito"),
              onError: (err) =>
                mostrar(err instanceof ApiError ? err.message : "No se pudo exportar la liquidación.", "error"),
            })
          }}
        >
          <Download size={14} /> Exportar
        </Button>
      ),
    },
  ]

  const exportarPeriodoActual = () => {
    exportarPeriodo.mutate(
      { tipo: "propinas", formato: "csv", filtros: { desde, hasta } },
      {
        onSuccess: () => mostrar("Exportación del período registrada; se genera en segundo plano.", "exito"),
        onError: () => mostrar("No se pudo registrar la exportación del período.", "error"),
      },
    )
  }

  return (
    <>
      <section className="panel">
        <div className="panel__body pagos-propinas__barra">
          <TextField label="Desde" type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
          <TextField label="Hasta" type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
          <span className="pagos-meta">
            Solo pagos aprobados; un pago reembolsado deja de contar su propina (supuesto a confirmar).
          </span>
          <div className="pagos-propinas__acciones">
            <Button
              variant="secondary"
              disabled={!puedeExportar || !data || exportarPeriodo.isPending}
              onClick={exportarPeriodoActual}
              title={puedeExportar ? undefined : "Requiere permiso de pagos.exportar"}
            >
              <Download size={15} /> Exportar período
            </Button>
            <Button variant="primary" disabled={!data || !puedeExportar} onClick={() => setLiquidarOpen(true)}>
              <HandCoins size={15} /> Generar liquidación
            </Button>
          </div>
        </div>
      </section>

      {isLoading || !data ? (
        <SkeletonCards count={4} />
      ) : (
        <>
          <div className="pagos-totales pagos-totales--kpis">
            <article>
              <span>Propinas del período</span>
              <strong>{formatMoney(data.totalCentavos, data.moneda)}</strong>
            </article>
            <article>
              <span>Pagos con propina</span>
              <strong>{data.pagos}</strong>
            </article>
            <article>
              <span>Promedio por pago</span>
              <strong>{formatMoney(data.pagos > 0 ? Math.round(data.totalCentavos / data.pagos) : 0, data.moneda)}</strong>
            </article>
            <article>
              <span>Turnos con propinas</span>
              <strong>{data.porTurno.length}</strong>
            </article>
          </div>

          <div className="pagos-grid-2">
            <section className="panel">
              <div className="panel__header">
                <div className="panel__title">Por día</div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Día</th>
                      <th className="cell-right">Pagos</th>
                      <th className="cell-right">Propinas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.porDia.map((fila) => (
                      <tr key={fila.fecha}>
                        <td>{fila.fecha}</td>
                        <td className="cell-right">{fila.pagos}</td>
                        <td className="cell-right">
                          <MoneyCell centavos={fila.totalCentavos} moneda={data.moneda} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="panel__header">
                <div className="panel__title">Por turno</div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Turno</th>
                      <th className="cell-right">Pagos</th>
                      <th className="cell-right">Propinas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.porTurno.map((fila) => (
                      <tr key={fila.turnoId}>
                        <td>{fila.turnoNumero}</td>
                        <td className="cell-right">{fila.pagos}</td>
                        <td className="cell-right">
                          <MoneyCell centavos={fila.totalCentavos} moneda={data.moneda} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="panel__header">
                <div className="panel__title">Por medio</div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Medio</th>
                      <th className="cell-right">Pagos</th>
                      <th className="cell-right">Propinas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.porMedio.map((fila) => (
                      <tr key={fila.medioPagoId}>
                        <td>{fila.nombre}</td>
                        <td className="cell-right">{fila.pagos}</td>
                        <td className="cell-right">
                          <MoneyCell centavos={fila.totalCentavos} moneda={data.moneda} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="panel__header">
                <div className="panel__title">Por cajero</div>
                <div className="panel__subtitle">El reparto final lo decide el local.</div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th className="cell-right">Pagos</th>
                      <th className="cell-right">Propinas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.porUsuario.map((fila) => (
                      <tr key={fila.usuario}>
                        <td>{fila.usuario}</td>
                        <td className="cell-right">{fila.pagos}</td>
                        <td className="cell-right">
                          <MoneyCell centavos={fila.totalCentavos} moneda={data.moneda} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="panel">
            <div className="panel__header">
              <div>
                <div className="panel__title">Liquidaciones generadas</div>
                <div className="panel__subtitle">Cada exportación crea una fila en exportaciones con usuario, filtros y formato.</div>
              </div>
            </div>
            <DataTable
              columns={columnasLiquidaciones}
              rows={data.liquidaciones}
              getRowKey={(liquidacion) => liquidacion.id}
              emptyTitle="Aún no hay liquidaciones"
              emptyDescription="Genera una para dejar el consolidado exportable del período."
            />
          </section>
        </>
      )}

      <ConfirmDialog
        open={liquidarOpen}
        title="Generar liquidación de propinas"
        description={`Período ${desde} → ${hasta}`}
        impacto={
          data
            ? `Se consolidarán ${formatMoney(data.totalCentavos, data.moneda)} de propinas de ${data.pagos} pagos aprobados. Queda en borrador hasta exportarse.`
            : undefined
        }
        motivoLabel="Motivo de la liquidación"
        confirmLabel={crear.isPending ? "Generando…" : "Generar liquidación"}
        onCancel={() => setLiquidarOpen(false)}
        onConfirm={(motivo) =>
          crear.mutate(
            { periodoDesde: desde, periodoHasta: hasta, motivo },
            {
              onSuccess: (liquidacion) => {
                setLiquidarOpen(false)
                mostrar(`Liquidación ${liquidacion.id} generada con ${formatMoney(liquidacion.totalCentavos)}.`, "exito")
              },
              onError: (err) =>
                mostrar(
                  err instanceof ApiError ? err.message : "No se pudo generar la liquidación.",
                  "error",
                ),
            },
          )
        }
      />
    </>
  )
}
