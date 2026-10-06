import { ChevronRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/Button"
import type { MesaEstado, SalonResumen } from "@/modules/en-vivo/types"

const ETIQUETA_POR_ESTADO: Record<MesaEstado, string> = {
  libre: "Libre",
  ocupada: "Ocup.",
  por_cobrar: "Cobrar",
  reservada: "Reservada",
}

const CLASE_POR_ESTADO: Record<MesaEstado, string> = {
  libre: "free",
  ocupada: "busy",
  por_cobrar: "bill",
  reservada: "reserved",
}

export function DiningRoomPanel({ salon }: { salon: SalonResumen }) {
  const navigate = useNavigate()

  return (
    <section className="panel dining-panel">
      <div className="panel__header">
        <div>
          <div className="panel__title">Salón</div>
          <div className="panel__subtitle">{salon.zona}</div>
        </div>
        <Button variant="ghost" className="text-action" onClick={() => navigate("/salon")}>
          Ver mapa <ChevronRight size={15} />
        </Button>
      </div>

      <div className="room-summary">
        <div>
          <strong>{salon.ocupadas}</strong>
          <span>Ocupadas</span>
        </div>
        <div>
          <strong>{salon.libres}</strong>
          <span>Libres</span>
        </div>
        <div>
          <strong>{salon.porCobrar}</strong>
          <span>Por cobrar</span>
        </div>
      </div>

      <div className="tables-grid">
        {salon.mesas.map((mesa) => (
          <div className={`table-dot table-dot--${CLASE_POR_ESTADO[mesa.estado]}`} key={mesa.numero}>
            <span>{mesa.numero}</span>
            <small>{mesa.etiqueta ?? ETIQUETA_POR_ESTADO[mesa.estado]}</small>
          </div>
        ))}
      </div>

      <div className="legend">
        <span>
          <i className="legend-dot legend-dot--free" /> Libre
        </span>
        <span>
          <i className="legend-dot legend-dot--busy" /> Ocupada
        </span>
        <span>
          <i className="legend-dot legend-dot--bill" /> Por cobrar
        </span>
        <span>
          <i className="legend-dot legend-dot--reserved" /> Reservada
        </span>
      </div>
    </section>
  )
}
