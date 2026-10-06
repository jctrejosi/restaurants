import { useEffect, useRef, type ReactNode } from "react"
import { X } from "lucide-react"
import { IconButton } from "@/components/ui/IconButton"

/** Panel lateral para no perder el contexto de la lista (plan 05 §3.4). */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  ariaLabel,
  width = 560,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  ariaLabel?: string
  width?: number
}) {
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="drawer-backdrop" role="presentation" onClick={onClose} />
      <aside
        className="drawer"
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="drawer__header">
          <div>
            <div className="drawer__title">{title}</div>
            {subtitle ? <div className="drawer__subtitle">{subtitle}</div> : null}
          </div>
          <IconButton label="Cerrar" onClick={onClose}>
            <X size={19} />
          </IconButton>
        </div>
        <div className="drawer__body">{children}</div>
        {footer ? <div className="drawer__footer">{footer}</div> : null}
      </aside>
    </>
  )
}
