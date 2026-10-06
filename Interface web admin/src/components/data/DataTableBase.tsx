import type { ReactNode } from "react"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"

export type Column<T> = {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: "left" | "right"
  width?: string
  className?: string
}

export function DataTableBase<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  loading,
  error,
  onRetry,
  emptyTitle,
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
  emptyTitle: string
  emptyDescription?: string
  footer?: ReactNode
}) {
  if (error) return <ErrorState onRetry={onRetry} />
  if (loading) return <SkeletonRows columns={columns.length} />
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={[column.align === "right" ? "cell-right" : "", column.className ?? ""]
                    .filter(Boolean)
                    .join(" ")}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "row--clickable" : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={column.align === "right" ? "cell-right" : undefined}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer ? <div className="panel__footer">{footer}</div> : null}
    </>
  )
}
