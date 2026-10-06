import type { ReactNode } from "react"

export type StatusTone = "amber" | "green" | "blue" | "gray" | "outline"

export function StatusBadge({
  tone,
  children,
  title,
}: {
  tone: StatusTone
  children: ReactNode
  title?: string
}) {
  return (
    <span className={`status status--${tone}`} title={title}>
      {children}
    </span>
  )
}
