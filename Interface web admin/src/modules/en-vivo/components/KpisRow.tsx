import { KpiCard } from "@/components/data/KpiCard"
import type { KpiData } from "@/components/data/KpiCard"

export function KpisRow({ kpis }: { kpis: KpiData[] }) {
  return (
    <div className="kpi-grid">
      {kpis.map((kpi) => (
        <KpiCard data={kpi} key={kpi.label} />
      ))}
    </div>
  )
}
