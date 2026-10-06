import { useEffect, type ReactNode } from "react"
import { X } from "lucide-react"
import { IconButton } from "@/components/ui/IconButton"

/** Base de los diálogos del POS: reutiliza `.modal*` del panel (index.css). */
export function DialogoBase({
  open,
  onClose,
  title,
  subtitle,
  icon,
  wide = false,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: ReactNode
  icon?: ReactNode
  wide?: boolean
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onClose} />
      <div
        className={`modal ${wide ? "tp-modal--ancha" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal__header">
          {icon ? <span className="modal__icon">{icon}</span> : null}
          <div>
            <strong>{title}</strong>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <IconButton label="Cerrar" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="modal__body tp-modal__body">{children}</div>
        {footer ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </>
  )
}
