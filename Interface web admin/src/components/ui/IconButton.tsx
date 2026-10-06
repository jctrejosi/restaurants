import type { ButtonHTMLAttributes, ReactNode } from "react"

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  children: ReactNode
}

export function IconButton({ label, children, className = "", ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`icon-button ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}
