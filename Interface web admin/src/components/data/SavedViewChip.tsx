import { Bookmark } from "lucide-react"

/** Vista guardada por usuario/rol (RF-R5-50/127). */
export function SavedViewChip({
  label,
  active,
  onClick,
  onRemove,
}: {
  label: string
  active?: boolean
  onClick: () => void
  onRemove?: () => void
}) {
  return (
    <span className={`saved-view ${active ? "saved-view--active" : ""}`}>
      <button type="button" className="button button--ghost saved-view__main" onClick={onClick}>
        <Bookmark size={13} /> {label}
      </button>
      {onRemove ? (
        <button
          type="button"
          className="button button--ghost saved-view__remove"
          aria-label={`Quitar vista ${label}`}
          onClick={onRemove}
        >
          ×
        </button>
      ) : null}
    </span>
  )
}
