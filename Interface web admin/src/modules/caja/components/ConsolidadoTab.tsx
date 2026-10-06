import { useState } from "react"
import { Link } from "react-router-dom"
import { Download } from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { MoneyCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { TextField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { formatDateTime, formatMoney } from "@/lib/format"
import { hoyISO, useConsolidadoDia, useExportarCaja } from "@/modules/caja/api"
import { MEDIO_PAGO_TIPO_LABEL, type ConsolidadoMedio, type TurnoLite } from "@/modules/caja/types"
import { semaforoDiferencia } from "@/modules/caja/utils"

/** Consolidado del día con propinas, descuentos y diferencias, exportable (RF-R5-74). */
export function ConsolidadoTab({ puedeExportar }: { puedeExportar: boolean }) {
  const { mostrar } = useToast()
  const [fecha, setFecha] = useState(hoyISO)
  const { data, isLoading, isError, error, refetch } = useConsolidadoDia(fecha)
  const exportar = useExportarCaja()

  const columnasMedios: Column<ConsolidadoMedio>[] = [
    { key: "nombre", header: "Medio", cell: (medio) => `${medio.nombre} · ${MEDIO_PAGO_TIPO_LABEL[medio.tipo]}` },
    {
      key: "ventas",
      header: "Ventas",
      align: "right",
      cell: (medio) => <MoneyCell centavos={medio.ventasCentavos} moneda={data?.moneda} />,
    },
    {
      key: "propinas",
      header: "Propinas",
      align: "right",
      cell: (medio) => <MoneyCell centavos={medio.propinasCentavos} moneda={data?.moneda} />,
    },
    {
      key: "contado",
      header: "Contado",
      align: "right",
      cell: (medio) =>
        medio.contadoCentavos === null ? (
          <span className="caja-muted">—</span>
        ) : (
          <MoneyCell centavos={medio.contadoCentavos} moneda={data?.moneda} />
        ),
    },
    {
      key: "diferencia",
      header: "Diferencia",
      align: "right",
      cell: (medio) =>
        medio.diferenciaCentavos === null ? (
          <span className="caja-muted">—</span>
        ) : (
          <span className={`caja-diferencia caja-diferencia--${semaforoDiferencia(medio.diferenciaCentavos)}`}>
            {formatMoney(medio.diferenciaCentavos, data?.moneda)}
          </span>
        ),
    },
  ]

  const columnasTurnos: Column<TurnoLite>[] = [
    {
      key: "numero",
      header: "Turno",
      cell: (turno) => (
        <Link className="order-id" to={`/caja/${turno.id}`}>
          {turno.numero}
        </Link>
      ),
    },
    {
      key: "horas",
      header: "Apertura / cierre",
      cell: (turno) =>
        `${formatDateTime(turno.abiertoEn, data?.zonaHoraria)} · ${
          turno.cerradoEn ? formatDateTime(turno.cerradoEn, data?.zonaHoraria) : "abierto"
        }`,
    },
    {
      key: "ventas",
      header: "Ventas",
      align: "right",
      cell: (turno) => <MoneyCell centavos={turno.ventasCentavos} moneda={data?.moneda} />,
    },
    {
      key: "propinas",
      header: "Propinas",
      align: "right",
      cell: (turno) => <MoneyCell centavos={turno.propinasCentavos} moneda={data?.moneda} />,
    },
    {
      key: "diferencia",
      header: "Diferencia",
      align: "right",
      cell: (turno) =>
        turno.diferenciaCentavos === null ? (
          <span className="caja-muted">Sin arquear</span>
        ) : (
          <span className={`caja-diferencia caja-diferencia--${semaforoDiferencia(turno.diferenciaCentavos)}`}>
            {formatMoney(turno.diferenciaCentavos, data?.moneda)}
          </span>
        ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (turno) => (
        <span className={`status status--${turno.estadoTone}`}>{turno.estado === "abierto" ? "Abierto" : "Cerrado"}</span>
      ),
    },
  ]

  const exportarConsolidado = () => {
    exportar.mutate(
      { tipo: "caja_consolidado", formato: "csv", filtros: { fecha, sucursalId: data?.sucursalId } },
      {
        onSuccess: () => mostrar("Exportación registrada; el archivo se genera en segundo plano.", "exito"),
        onError: () => mostrar("No se pudo registrar la exportación.", "error"),
      },
    )
  }

  return (
    <>
      <section className="panel caja-consolidado__filtros">
        <div className="panel__body caja-consolidado__barra">
          <TextField
            label="Fecha"
            type="date"
            value={fecha}
            max={hoyISO()}
            onChange={(event) => setFecha(event.target.value || hoyISO())}
          />
          <span className="caja-muted">
            {data ? `${data.sucursalNombre} · ${data.turnos.length} turnos` : "Consolidado por sede activa"}
          </span>
          <Button
            variant="secondary"
            disabled={!puedeExportar || isLoading || !data}
            title={puedeExportar ? undefined : "Requiere permiso de caja.exportar"}
            onClick={exportarConsolidado}
          >
            <Download size={15} /> {exportar.isPending ? "Exportando…" : "Exportar"}
          </Button>
        </div>
      </section>

      {isError ? (
        <section className="panel">
          <div className="panel__body">
            <p className="caja-error">{(error as Error)?.message ?? "No se pudo cargar el consolidado."}</p>
            <Button variant="secondary" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </div>
        </section>
      ) : (
        <>
          <div className="caja-kpis">
            <article className="caja-kpi">
              <span className="caja-kpi__label">Ventas del día</span>
              <strong className="caja-kpi__value">{formatMoney(data?.totales.ventasCentavos ?? 0, data?.moneda)}</strong>
              <span className="caja-kpi__foot">{data?.totales.pedidosTotal ?? 0} pedidos</span>
            </article>
            <article className="caja-kpi">
              <span className="caja-kpi__label">Propinas</span>
              <strong className="caja-kpi__value">{formatMoney(data?.totales.propinasCentavos ?? 0, data?.moneda)}</strong>
              <span className="caja-kpi__foot">Incluidas en el reporte</span>
            </article>
            <article className="caja-kpi">
              <span className="caja-kpi__label">Descuentos</span>
              <strong className="caja-kpi__value">{formatMoney(data?.totales.descuentosCentavos ?? 0, data?.moneda)}</strong>
              <span className="caja-kpi__foot">Ajustes y cortesías del día</span>
            </article>
            <article className="caja-kpi">
              <span className="caja-kpi__label">Contado</span>
              <strong className="caja-kpi__value">{formatMoney(data?.totales.contadoCentavos ?? 0, data?.moneda)}</strong>
              <span className="caja-kpi__foot">Turnos con arqueo</span>
            </article>
            <article className={`caja-kpi caja-kpi--${semaforoDiferencia(data?.totales.diferenciaCentavos ?? 0)}`}>
              <span className="caja-kpi__label">Diferencia acumulada</span>
              <strong className="caja-kpi__value">
                {formatMoney(data?.totales.diferenciaCentavos ?? 0, data?.moneda)}
              </strong>
              <span className="caja-kpi__foot">
                {data?.totales.pedidosPendientes ?? 0} pedidos pendientes en el día
              </span>
            </article>
          </div>

          <section className="panel">
            <div className="panel__header">
              <div>
                <div className="panel__title">Ventas por medio</div>
                <div className="panel__subtitle">Turnos de la fecha seleccionada (incluye turnos que cruzan medianoche).</div>
              </div>
            </div>
            <DataTable
              columns={columnasMedios}
              rows={data?.medios ?? []}
              getRowKey={(medio) => medio.medioPagoId}
              loading={isLoading}
              emptyTitle="Sin movimientos en la fecha"
              emptyDescription="Prueba con otra fecha o revisa que existan turnos cerrados."
            />
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <div className="panel__title">Turnos del día</div>
              </div>
            </div>
            <DataTable
              columns={columnasTurnos}
              rows={data?.turnos ?? []}
              getRowKey={(turno) => turno.id}
              loading={isLoading}
              emptyTitle="Aún no hay turnos en esta fecha"
            />
          </section>
        </>
      )}
    </>
  )
}
