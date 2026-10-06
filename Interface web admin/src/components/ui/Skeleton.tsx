import type { ReactNode } from "react"

export function Skeleton({
  width = "100%",
  height = 16,
  radius = 6,
}: {
  width?: number | string
  height?: number | string
  radius?: number
}) {
  return (
    <span
      className="skeleton"
      aria-hidden="true"
      style={{ width, height, borderRadius: radius }}
    />
  )
}

export function SkeletonRows({ rows = 4, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="skeleton-rows" aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div className="skeleton-rows__row" key={rowIndex}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton key={columnIndex} height={14} width={columnIndex === 0 ? "42%" : "70%"} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-cards" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div className="kpi-card" key={index}>
          <Skeleton height={11} width="45%" />
          <Skeleton height={26} width="60%" />
          <Skeleton height={11} width="35%" />
        </div>
      ))}
    </div>
  )
}

export type { ReactNode }
