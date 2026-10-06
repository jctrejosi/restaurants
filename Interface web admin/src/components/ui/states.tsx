import type { ReactNode } from "react"
import { Inbox } from "lucide-react"
import { Button } from "@/components/ui/Button"

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  icon?: ReactNode
}) {
  return (
    <div className="state-block">
      <span className="state-block__icon" aria-hidden="true">
        {icon ?? <Inbox size={22} />}
      </span>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {action ? (
        <Button variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  )
}

export function ErrorState({
  title = "No pudimos cargar la información",
  description = "Revisa tu conexión e inténtalo de nuevo.",
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="state-block state-block--error">
      <strong>{title}</strong>
      <p>{description}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  )
}

export function NoPermissionState({ permiso }: { permiso: string }) {
  return (
    <div className="state-block state-block--warning">
      <strong>No tienes permiso para ver esta sección</strong>
      <p>
        Solicita el permiso <code>{permiso}</code> a un administrador global.
      </p>
    </div>
  )
}
