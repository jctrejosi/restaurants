import type { ReactNode } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/Button"

export type ActiveFilter = { key: string; label: string }

/** Barra de filtros combinables; los chips muestran lo activo (plan 05 §3.4). */
export function FilterBar({
  children,
  activeFilters = [],
  onClear,
  actions,
}: {
  children: ReactNode
  activeFilters?: ActiveFilter[]
  onClear?: () => void
  actions?: ReactNode
}) {
  return (
    <div className="filter-bar">
      <div className="filter-bar__controls">{children}</div>
      {activeFilters.length > 0 ? (
        <div className="filter-bar__chips">
          {activeFilters.map((filtro) => (
            <span className="filter-chip" key={filtro.key}>
              {filtro.label}
            </span>
          ))}
          {onClear ? (
            <Button variant="ghost" className="text-action" onClick={onClear}>
              <X size={13} /> Limpiar
            </Button>
          ) : null}
        </div>
      ) : null}
      {actions ? <div className="filter-bar__actions">{actions}</div> : null}
    </div>
  )
}
