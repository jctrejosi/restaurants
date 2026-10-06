import { useSearchParams } from "react-router-dom"
import { DataTable, type Column } from "@/components/data/DataTable"
import { FilterBar } from "@/components/data/FilterBar"
import { MoneyCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { SelectField, TextField } from "@/components/ui/fields"
import { useSede } from "@/app/sede"
import { formatDateTime, formatMoney } from "@/lib/format"
import { CAJEROS_OPCIONES, MEDIOS_OPCIONES, TURNOS_OPCIONES, usePagos } from "@/modules/pagos/api"
import { PAGO_ESTADO_LABEL, type PagoFila, type PagoFiltros } from "@/modules/pagos/types"

const PAGE_SIZE = 10

/** Pestaña Pagos: lista filtrable por turno, medio, cajero y fecha, con totales. */
export function PagosTab({ onAbrirPago }: { onAbrirPago: (pagoId: string) => void }) {
  const { zonaHoraria } = useSede()
  const [searchParams, setSearchParams] = useSearchParams()

  const leer = (clave: string) => searchParams.get(clave) ?? ""
  const page = Math.max(1, Number(leer("page") || 1))
  const filtros: PagoFiltros = {
    turnoId: leer("turno") || undefined,
    medioId: leer("medio") || undefined,
    cajero: leer("cajero") || undefined,
    estado: leer("estado") || undefined,
    pedido: leer("pedido") || undefined,
    desde: leer("desde") || undefined,
    hasta: leer("hasta") || undefined,
    reembolsados: leer("reembolsados") === "true" || undefined,
    page,
    pageSize: PAGE_SIZE,
  }

  const { data, isLoading, isError, error, refetch } = usePagos(filtros)

  const actualizar = (clave: string, valor: string) => {
    const siguiente = new URLSearchParams(searchParams)
    if (valor) siguiente.set(clave, valor)
    else siguiente.delete(clave)
    if (clave !== "page") siguiente.delete("page")
    setSearchParams(siguiente, { replace: true })
  }

  const limpiar = () => {
    const siguiente = new URLSearchParams(searchParams)
    for (const clave of ["turno", "medio", "cajero", "estado", "pedido", "desde", "hasta", "reembolsados", "page"]) {
      siguiente.delete(clave)
    }
    setSearchParams(siguiente, { replace: true })
  }

  const columnas: Column<PagoFila>[] = [
    {
      key: "fecha",
      header: "Fecha",
      cell: (pago) => formatDateTime(pago.fecha, zonaHoraria),
    },
    {
      key: "pedido",
      header: "Pedido",
      cell: (pago) => <span className="order-id">{pago.pedidoCodigo}</span>,
    },
    {
      key: "medio",
      header: "Medio",
      cell: (pago) => (
        <div>
          <div>{pago.medioNombre}</div>
          {pago.referencia ? <div className="pagos-meta">Ref. {pago.referencia}</div> : null}
        </div>
      ),
    },
    {
      key: "cajero",
      header: "Cajero",
      cell: (pago) => pago.cajero,
    },
    {
      key: "monto",
      header: "Monto",
      align: "right",
      cell: (pago) => <MoneyCell centavos={pago.montoCentavos} />,
    },
    {
      key: "propina",
      header: "Propina",
      align: "right",
      cell: (pago) => <MoneyCell centavos={pago.propinaCentavos} />,
    },
    {
      key: "descuento",
      header: "Descuento",
      align: "right",
      cell: (pago) =>
        pago.descuentoCentavos === 0 ? (
          <span className="pagos-meta">—</span>
        ) : (
          <MoneyCell centavos={pago.descuentoCentavos} descuento />
        ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (pago) => <span className={`status status--${pago.estadoTone}`}>{PAGO_ESTADO_LABEL[pago.estado]}</span>,
    },
  ]

  const filtrosActivos: { key: string; label: string }[] = []
  if (filtros.turnoId) {
    filtrosActivos.push({
      key: "turno",
      label: TURNOS_OPCIONES.find((turno) => turno.value === filtros.turnoId)?.label ?? filtros.turnoId,
    })
  }
  if (filtros.medioId) {
    filtrosActivos.push({
      key: "medio",
      label: MEDIOS_OPCIONES.find((medio) => medio.value === filtros.medioId)?.label ?? filtros.medioId,
    })
  }
  if (filtros.cajero) filtrosActivos.push({ key: "cajero", label: filtros.cajero })
  if (filtros.estado) filtrosActivos.push({ key: "estado", label: PAGO_ESTADO_LABEL[filtros.estado as "aprobado"] ?? filtros.estado })
  if (filtros.pedido) filtrosActivos.push({ key: "pedido", label: `Pedido ${filtros.pedido}` })
  if (filtros.desde) filtrosActivos.push({ key: "desde", label: `Desde ${filtros.desde}` })
  if (filtros.hasta) filtrosActivos.push({ key: "hasta", label: `Hasta ${filtros.hasta}` })
  if (filtros.reembolsados) filtrosActivos.push({ key: "reembolsados", label: "Solo reembolsados" })

  const total = data?.total ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const totales = data?.totales

  return (
    <>
      <FilterBar activeFilters={filtrosActivos} onClear={filtrosActivos.length > 0 ? limpiar : undefined}>
        <SelectField
          label="Turno"
          placeholder="Todos"
          value={leer("turno")}
          onChange={(event) => actualizar("turno", event.target.value)}
          options={TURNOS_OPCIONES}
        />
        <SelectField
          label="Medio"
          placeholder="Todos"
          value={leer("medio")}
          onChange={(event) => actualizar("medio", event.target.value)}
          options={MEDIOS_OPCIONES}
        />
        <SelectField
          label="Cajero"
          placeholder="Todos"
          value={leer("cajero")}
          onChange={(event) => actualizar("cajero", event.target.value)}
          options={CAJEROS_OPCIONES.map((cajero) => ({ value: cajero, label: cajero }))}
        />
        <SelectField
          label="Estado"
          placeholder="Todos"
          value={leer("estado")}
          onChange={(event) => actualizar("estado", event.target.value)}
          options={Object.entries(PAGO_ESTADO_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <TextField
          label="Pedido"
          placeholder="P-9012"
          value={leer("pedido")}
          onChange={(event) => actualizar("pedido", event.target.value)}
        />
        <TextField
          label="Desde"
          type="date"
          value={leer("desde")}
          onChange={(event) => actualizar("desde", event.target.value)}
        />
        <TextField
          label="Hasta"
          type="date"
          value={leer("hasta")}
          onChange={(event) => actualizar("hasta", event.target.value)}
        />
        <div className="filter-tabs filter-tabs--inline">
          <Button
            variant="ghost"
            className={`filter-tab ${filtros.reembolsados ? "filter-tab--active" : ""}`}
            onClick={() => actualizar("reembolsados", filtros.reembolsados ? "" : "true")}
          >
            Solo reembolsados
          </Button>
        </div>
      </FilterBar>

      <section className="panel">
        <DataTable
          columns={columnas}
          rows={data?.data ?? []}
          getRowKey={(pago) => pago.id}
          onRowClick={(pago) => onAbrirPago(pago.id)}
          loading={isLoading}
          error={isError ? (error as Error) : null}
          onRetry={() => void refetch()}
          emptyTitle="Aún no hay pagos con estos filtros"
          emptyDescription="Ajusta el turno, el medio, el cajero o el rango de fechas."
          footer={
            <div className="pagos-pie">
              <span>
                {total} pagos · totales del filtro
              </span>
              <span className="pagos-pie__controles">
                <Button
                  variant="ghost"
                  className="text-action"
                  disabled={page <= 1}
                  onClick={() => actualizar("page", String(page - 1))}
                >
                  Anterior
                </Button>
                <span>
                  Página {data?.page ?? page} de {totalPaginas}
                </span>
                <Button
                  variant="ghost"
                  className="text-action"
                  disabled={page >= totalPaginas}
                  onClick={() => actualizar("page", String(page + 1))}
                >
                  Siguiente
                </Button>
              </span>
            </div>
          }
        />
      </section>

      {totales ? (
        <section className="pagos-totales" aria-label="Totales del filtro">
          <article>
            <span>Monto</span>
            <strong>{formatMoney(totales.montoCentavos)}</strong>
          </article>
          <article>
            <span>Propinas</span>
            <strong>{formatMoney(totales.propinaCentavos)}</strong>
          </article>
          <article>
            <span>Descuentos</span>
            <strong>{formatMoney(totales.descuentoCentavos)}</strong>
          </article>
          <article>
            <span>Reembolsado</span>
            <strong>{formatMoney(totales.reembolsadoCentavos)}</strong>
          </article>
          <div className="pagos-totales__medios">
            {totales.porMedio.map((medio) => (
              <span key={medio.medioPagoId} className="pagos-totales__chip" title="Totales del filtro por medio">
                {medio.nombre}: {formatMoney(medio.montoCentavos)} · propinas {formatMoney(medio.propinaCentavos)}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}
