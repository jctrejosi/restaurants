import { ChevronRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { initials } from "@/lib/format"
import type { ProximaLlegada } from "@/modules/en-vivo/types"

export function ReservationsPanel({ llegadas }: { llegadas: ProximaLlegada[] }) {
  const navigate = useNavigate()

  return (
    <section className="panel reservations-panel">
      <div className="panel__header">
        <div>
          <div className="panel__title">Próximas llegadas</div>
          <div className="panel__subtitle">
            {llegadas.length} reservas en las próximas 2 horas
          </div>
        </div>
        <Button variant="ghost" className="text-action" onClick={() => navigate("/reservas")}>
          Calendario <ChevronRight size={15} />
        </Button>
      </div>

      <div className="reservation-list">
        {llegadas.map((llegada) => (
          <div className="reservation-row" key={`${llegada.hora}-${llegada.cliente}`}>
            <div className="reservation-time">{llegada.hora}</div>
            <div className="avatar avatar--soft">{initials(llegada.cliente)}</div>
            <div className="reservation-copy">
              <strong>{llegada.cliente}</strong>
              <span>{llegada.personas} personas</span>
            </div>
            <StatusBadge tone={llegada.mesa ? "outline" : "gray"}>
              {llegada.mesa ?? "Por asignar"}
            </StatusBadge>
          </div>
        ))}
      </div>
    </section>
  )
}
