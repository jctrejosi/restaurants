import { RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { Button } from "@/components/ui/Button"
import { ErrorState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { formatDateTime, formatRelative } from "@/lib/format"
import { useSede } from "@/app/sede"
import { useDiagnosticoProveedor } from "@/modules/facturacion/api"

/** Diagnóstico del proveedor: pendientes por antigüedad, errores con causa y cola de impresión. */
export function DiagnosticoTab({ onAbrirFactura }: { onAbrirFactura: (facturaId: string) => void }) {
  const { zonaHoraria } = useSede()
  const { data, isLoading, isError, error, refetch, isFetching } = useDiagnosticoProveedor()

  if (isError) {
    return (
      <ErrorState
        title="No pudimos consultar al proveedor"
        description={(error as Error)?.message ?? "Reintenta en unos segundos."}
        onRetry={() => void refetch()}
      />
    )
  }

  if (isLoading || !data) {
    return (
      <section className="panel">
        <SkeletonRows rows={6} columns={4} />
      </section>
    )
  }

  const operativo = data.proveedor.estado === "operativo"

  const columnasErrores: Column<(typeof data.errores)[number]>[] = [
    { key: "numero", header: "Factura", cell: (errorFila) => <span className="order-id">{errorFila.numero}</span> },
    { key: "causa", header: "Causa", cell: (errorFila) => <span className="facturacion-causa">{errorFila.causa}</span> },
    { key: "intentos", header: "Intentos", align: "right", cell: (errorFila) => String(errorFila.intentos) },
    {
      key: "ocurrido",
      header: "Ocurrido",
      cell: (errorFila) => formatDateTime(errorFila.ocurridoEn, zonaHoraria),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      cell: (errorFila) => (
        <Button variant="ghost" className="text-action" onClick={() => onAbrirFactura(errorFila.facturaId)}>
          Ver y reintentar
        </Button>
      ),
    },
  ]

  const columnasReintentos: Column<(typeof data.reintentos)[number]>[] = [
    { key: "factura", header: "Factura", cell: (reintento) => <span className="order-id">{reintento.numero}</span> },
    { key: "intento", header: "Intento", align: "right", cell: (reintento) => String(reintento.intento) },
    {
      key: "resultado",
      header: "Resultado",
      cell: (reintento) => (
        <span className={`status status--${reintento.resultado === "enviada" ? "blue" : "gray"}`}>
          {reintento.resultado.replace(/_/g, " ")}
        </span>
      ),
    },
    { key: "causa", header: "Causa", cell: (reintento) => reintento.causa ?? "—" },
    {
      key: "ocurrido",
      header: "Ocurrido",
      cell: (reintento) => formatDateTime(reintento.ocurridoEn, zonaHoraria),
    },
  ]

  const columnasImpresion: Column<(typeof data.colaImpresion)[number]>[] = [
    { key: "factura", header: "Documento", cell: (trabajo) => <span className="order-id">{trabajo.facturaNumero}</span> },
    { key: "tipo", header: "Tipo", cell: (trabajo) => trabajo.tipo },
    { key: "impresora", header: "Impresora", cell: (trabajo) => trabajo.impresora },
    {
      key: "estado",
      header: "Estado",
      cell: (trabajo) => (
        <span className={`status status--${trabajo.estado === "fallido" ? "amber" : trabajo.estado === "impreso" ? "green" : "blue"}`}>
          {trabajo.estado}
        </span>
      ),
    },
    { key: "intentos", header: "Intentos", align: "right", cell: (trabajo) => String(trabajo.intentos) },
    {
      key: "error",
      header: "Último error",
      cell: (trabajo) =>
        trabajo.ultimoError ? <span className="facturacion-causa">{trabajo.ultimoError}</span> : "—",
    },
  ]

  return (
    <>
      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Estado del proveedor</div>
            <div className="panel__subtitle">
              {data.proveedor.nombre} · {data.proveedor.ambiente}
            </div>
          </div>
          <div className="facturacion-diagnostico__acciones">
            <span className={`status status--${operativo ? "green" : "amber"}`}>
              {operativo ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />} {data.proveedor.estado}
            </span>
            <Button variant="secondary" disabled={isFetching} onClick={() => void refetch()}>
              <RefreshCw size={15} /> {isFetching ? "Consultando…" : "Actualizar"}
            </Button>
          </div>
        </div>
        <div className="panel__body facturacion-diagnostico__grid">
          <div>
            <span className="facturacion-meta">Última conexión</span>
            <strong>{formatRelative(data.proveedor.ultimaConexion)}</strong>
          </div>
          <div>
            <span className="facturacion-meta">Latencia</span>
            <strong>{data.proveedor.latenciaMs} ms</strong>
          </div>
          <div>
            <span className="facturacion-meta">Pendientes</span>
            <strong>{data.facturas.pendientes}</strong>
          </div>
          <div>
            <span className="facturacion-meta">Enviadas</span>
            <strong>{data.facturas.enviadas}</strong>
          </div>
          <div>
            <span className="facturacion-meta">Aceptadas</span>
            <strong>{data.facturas.aceptadas}</strong>
          </div>
          <div>
            <span className="facturacion-meta">Rechazadas</span>
            <strong className={data.facturas.rechazadas > 0 ? "facturacion-numero--alerta" : undefined}>
              {data.facturas.rechazadas}
            </strong>
          </div>
        </div>
      </section>

      <div className="facturacion-grid-2">
        <section className="panel">
          <div className="panel__header">
            <div className="panel__title">Pendientes por antigüedad</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Antigüedad</th>
                  <th className="cell-right">Cantidad</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {data.pendientesPorAntiguedad.map((fila) => (
                  <tr key={fila.rango}>
                    <td>{fila.rango}</td>
                    <td className="cell-right">{fila.cantidad}</td>
                    <td className="facturacion-meta">{fila.detalle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__title">Recuperación</div>
              <div className="panel__subtitle">El backoff automático es del backend; el manual queda auditado.</div>
            </div>
          </div>
          <div className="panel__body facturacion-meta">
            {data.errores.length === 0
              ? "No hay errores registrados del proveedor."
              : `${data.errores.length} facturas con error; ${data.errores.reduce((total, fila) => total + fila.intentos, 0)} intentos acumulados.`}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Últimos errores del proveedor</div>
            <div className="panel__subtitle">La causa nunca se oculta; cada reintento deja rastro en auditoría.</div>
          </div>
        </div>
        <DataTable
          columns={columnasErrores}
          rows={data.errores}
          getRowKey={(errorFila) => errorFila.id}
          emptyTitle="Sin errores del proveedor"
          emptyDescription="Todas las facturas del rango fueron aceptadas o están en trámite."
        />
      </section>

      <section className="panel">
        <div className="panel__header">
          <div className="panel__title">Reintentos registrados</div>
        </div>
        <DataTable
          columns={columnasReintentos}
          rows={data.reintentos}
          getRowKey={(reintento) => reintento.id}
          emptyTitle="Sin reintentos registrados"
        />
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Cola de impresión de facturas</div>
            <div className="panel__subtitle">
              Fallos de impresión visibles con intentos y último error; la impresión vive en Estaciones.
            </div>
          </div>
        </div>
        <DataTable
          columns={columnasImpresion}
          rows={data.colaImpresion}
          getRowKey={(trabajo) => trabajo.id}
          emptyTitle="Sin trabajos de impresión"
        />
      </section>
    </>
  )
}
