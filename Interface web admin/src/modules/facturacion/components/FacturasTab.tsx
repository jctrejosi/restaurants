import { useSearchParams } from "react-router-dom"
import { DataTable, type Column } from "@/components/data/DataTable"
import { FilterBar } from "@/components/data/FilterBar"
import { MoneyCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { SelectField, TextField } from "@/components/ui/fields"
import { useSede } from "@/app/sede"
import { formatDateTime } from "@/lib/format"
import { PREFIJOS, RESOLUCIONES, useFacturas } from "@/modules/facturacion/api"
import {
  ESTADO_DIAN_LABEL,
  TIPO_DOCUMENTO_LABEL,
  type FacturaFila,
  type FacturaFiltros,
} from "@/modules/facturacion/types"
import { EstadoDianBadge } from "@/modules/facturacion/components/EstadoDianBadge"

const PAGE_SIZE = 10

/** Pestaña Facturas: lista filtrable con estado, totales, CUFE y resolución. */
export function FacturasTab({ onAbrirFactura }: { onAbrirFactura: (facturaId: string) => void }) {
  const { zonaHoraria } = useSede()
  const [searchParams, setSearchParams] = useSearchParams()

  const leer = (clave: string) => searchParams.get(clave) ?? ""
  const page = Math.max(1, Number(leer("page") || 1))
  const filtros: FacturaFiltros = {
    estado: leer("estado") || undefined,
    prefijo: leer("prefijo") || undefined,
    resolucion: leer("resolucion") || undefined,
    pedido: leer("pedido") || undefined,
    desde: leer("desde") || undefined,
    hasta: leer("hasta") || undefined,
    tipo: leer("tipo") || undefined,
    page,
    pageSize: PAGE_SIZE,
  }

  const { data, isLoading, isError, error, refetch } = useFacturas(filtros)

  const actualizar = (clave: string, valor: string) => {
    const siguiente = new URLSearchParams(searchParams)
    if (valor) siguiente.set(clave, valor)
    else siguiente.delete(clave)
    if (clave !== "page") siguiente.delete("page")
    setSearchParams(siguiente, { replace: true })
  }

  const limpiar = () => {
    const siguiente = new URLSearchParams(searchParams)
    for (const clave of ["estado", "prefijo", "resolucion", "pedido", "desde", "hasta", "tipo", "page"]) {
      siguiente.delete(clave)
    }
    setSearchParams(siguiente, { replace: true })
  }

  const columnas: Column<FacturaFila>[] = [
    {
      key: "numero",
      header: "Número",
      cell: (factura) => (
        <div>
          <span className="order-id">
            {factura.prefijo}-{factura.numero}
          </span>
          {factura.tipo === "nota_credito" ? (
            <div className="facturacion-meta">{TIPO_DOCUMENTO_LABEL.nota_credito}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: "pedido",
      header: "Pedido",
      cell: (factura) => <span className="order-id">{factura.pedidoCodigo}</span>,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (factura) => <MoneyCell centavos={factura.totalCentavos} />,
    },
    {
      key: "impuestos",
      header: "Impuestos",
      align: "right",
      cell: (factura) => <MoneyCell centavos={factura.impuestosCentavos} />,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (factura) => <EstadoDianBadge estado={factura.estadoDian} />,
    },
    {
      key: "emitida",
      header: "Emitida",
      cell: (factura) => formatDateTime(factura.emitidaEn, zonaHoraria),
    },
    {
      key: "cufe",
      header: "CUFE / resolución",
      cell: (factura) => (
        <div>
          <div className="facturacion-meta">{factura.cufe ?? "Sin CUFE (pendiente)"}</div>
          <div className="facturacion-meta">{factura.resolucion}</div>
        </div>
      ),
    },
  ]

  const filtrosActivos: { key: string; label: string }[] = []
  if (filtros.estado) filtrosActivos.push({ key: "estado", label: ESTADO_DIAN_LABEL[filtros.estado as "aceptada"] ?? filtros.estado })
  if (filtros.prefijo) filtrosActivos.push({ key: "prefijo", label: `Prefijo ${filtros.prefijo}` })
  if (filtros.resolucion) filtrosActivos.push({ key: "resolucion", label: `Resolución ${filtros.resolucion}` })
  if (filtros.pedido) filtrosActivos.push({ key: "pedido", label: `Pedido ${filtros.pedido}` })
  if (filtros.desde) filtrosActivos.push({ key: "desde", label: `Desde ${filtros.desde}` })
  if (filtros.hasta) filtrosActivos.push({ key: "hasta", label: `Hasta ${filtros.hasta}` })
  if (filtros.tipo) filtrosActivos.push({ key: "tipo", label: TIPO_DOCUMENTO_LABEL[filtros.tipo as "factura"] ?? filtros.tipo })

  const total = data?.total ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const resumen = data?.resumen

  return (
    <>
      <FilterBar activeFilters={filtrosActivos} onClear={filtrosActivos.length > 0 ? limpiar : undefined}>
        <SelectField
          label="Estado DIAN"
          placeholder="Todos"
          value={leer("estado")}
          onChange={(event) => actualizar("estado", event.target.value)}
          options={Object.entries(ESTADO_DIAN_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <SelectField
          label="Prefijo"
          placeholder="Todos"
          value={leer("prefijo")}
          onChange={(event) => actualizar("prefijo", event.target.value)}
          options={PREFIJOS.map((prefijo) => ({ value: prefijo, label: prefijo }))}
        />
        <SelectField
          label="Resolución"
          placeholder="Todas"
          value={leer("resolucion")}
          onChange={(event) => actualizar("resolucion", event.target.value)}
          options={RESOLUCIONES.map((resolucion) => ({ value: resolucion, label: resolucion }))}
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
      </FilterBar>

      {resumen ? (
        <div className="facturacion-resumen">
          <span className="facturacion-resumen__chip">Aceptadas: {resumen.aceptadas}</span>
          <span className="facturacion-resumen__chip">Enviadas: {resumen.enviadas}</span>
          <span className="facturacion-resumen__chip">Pendientes: {resumen.pendientes}</span>
          <span className="facturacion-resumen__chip facturacion-resumen__chip--alerta">
            Rechazadas: {resumen.rechazadas}
          </span>
        </div>
      ) : null}

      <section className="panel">
        <DataTable
          columns={columnas}
          rows={data?.data ?? []}
          getRowKey={(factura) => factura.id}
          onRowClick={(factura) => onAbrirFactura(factura.id)}
          loading={isLoading}
          error={isError ? (error as Error) : null}
          onRetry={() => void refetch()}
          emptyTitle="Aún no hay facturas en este rango"
          emptyDescription="La emisión ocurre en el cobro; aquí se consulta y se reintenta. Ajusta los filtros o revisa Pedidos."
          footer={
            <div className="facturacion-pie">
              <span>{total} documentos</span>
              <span className="facturacion-pie__controles">
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
    </>
  )
}
