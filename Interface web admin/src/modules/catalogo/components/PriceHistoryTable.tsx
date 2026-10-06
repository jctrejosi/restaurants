/**
 * Historial de precios (RF-R5-13): quién, cuándo, valor anterior → nuevo y el
 * motivo auditado. Los precios son append-only: un cambio no altera pedidos ya
 * creados (RN-R5-04, snapshot).
 */

import { DataTable, type Column } from "@/components/data/DataTable"
import { MoneyCell } from "@/components/data/cells"
import { formatDateTime, formatRelative } from "@/lib/format"
import type { HistorialPrecio } from "@/modules/catalogo/types"

export function PriceHistoryTable({
  historial,
  sedes,
  zonaHoraria,
  mostrarProducto = false,
  cargando,
  error,
  onReintentar,
}: {
  historial: HistorialPrecio[]
  sedes: { id: string; nombre: string }[]
  zonaHoraria: string
  mostrarProducto?: boolean
  cargando: boolean
  error: Error | null
  onReintentar: () => void
}) {
  const nombreSede = (id: string) => sedes.find((sede) => sede.id === id)?.nombre ?? id

  const columnas: Column<HistorialPrecio>[] = [
    {
      key: "fecha",
      header: "Cuándo",
      cell: (row) => (
        <>
          <span>{formatDateTime(row.creadoEn, zonaHoraria)}</span>
          <span className="order-type"> {formatRelative(row.creadoEn)}</span>
        </>
      ),
    },
    ...(mostrarProducto
      ? [{ key: "producto", header: "Producto", cell: (row: HistorialPrecio) => row.productoNombre }]
      : []),
    { key: "sede", header: "Sede", cell: (row) => nombreSede(row.sucursalId) },
    {
      key: "cambio",
      header: "Antes → después",
      align: "right",
      cell: (row) => (
        <span className="price-diff">
          <span className="price-diff__antes">
            {row.antesCentavos === null ? "—" : <MoneyCell centavos={row.antesCentavos} />}
          </span>
          <span aria-hidden="true">→</span>
          <MoneyCell centavos={row.despuesCentavos} />
        </span>
      ),
    },
    { key: "motivo", header: "Motivo", cell: (row) => row.motivo },
    { key: "usuario", header: "Quién", cell: (row) => row.usuario },
  ]

  return (
    <DataTable
      columns={columnas}
      rows={historial}
      getRowKey={(row) => row.id}
      loading={cargando}
      error={error}
      onRetry={onReintentar}
      emptyTitle="Sin cambios de precio registrados"
      emptyDescription="Cuando se publique un precio nuevo aparecerá aquí con quién, cuándo y el valor anterior."
    />
  )
}
