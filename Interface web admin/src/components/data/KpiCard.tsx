export type KpiColor = "terracotta" | "blue" | "gold" | "purple" | "green"

export type KpiData = {
  label: string
  value: string
  delta?: string
  /** Si el delta es negativo se pinta en rojo (ya incluye el signo). */
  deltaNegativo?: boolean
  foot?: string
  color?: KpiColor
  /** Serie de puntos para el sparkline (`viewBox 0 0 100 34`). */
  points?: string
}

export function Sparkline({ points, color = "terracotta" }: { points: string; color?: KpiColor }) {
  return (
    <svg className={`sparkline sparkline--${color}`} viewBox="0 0 100 34" aria-hidden="true">
      <path
        className="sparkline__area"
        d={`M ${points.split(" ").join(" L ")} L 98 34 L 2 34 Z`}
      />
      <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function KpiCard({ data }: { data: KpiData }) {
  const negativo = data.deltaNegativo || data.delta?.includes("−") === true
  return (
    <div className="kpi-card">
      <div className="kpi-card__label">{data.label}</div>
      <div className="kpi-card__body">
        <div>
          <div className="kpi-card__value">{data.value}</div>
          {(data.delta || data.foot) && (
            <div className={`kpi-card__delta ${negativo ? "kpi-card__delta--negative" : ""}`}>
              {data.delta ? <span>{data.delta}</span> : null} {data.foot}
            </div>
          )}
        </div>
        {data.points ? <Sparkline points={data.points} color={data.color} /> : null}
      </div>
    </div>
  )
}
