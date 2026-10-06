import type { ReactNode } from "react"
import { DataTableBase, type Column } from "@/components/data/DataTableBase"

export type { Column }

/**
 * Tabla densa del panel: cabecera sticky, cifras tabulares, fila → detalle.
 * Estados de vacío, carga y error explicados (R5 §8).
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  loading,
  error,
  onRetry,
  emptyTitle = "Aún no hay información",
  emptyDescription,
  footer,
}: {
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  onRowClick?: (row: T) => void
  loading?: boolean
  error?: Error | null
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  footer?: ReactNode
}) {
  return (
    <DataTableBase
      columns={columns}
      rows={rows}
      getRowKey={getRowKey}
      onRowClick={onRowClick}
      loading={loading}
      error={error}
      onRetry={onRetry}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      footer={footer}
    />
  )
}
