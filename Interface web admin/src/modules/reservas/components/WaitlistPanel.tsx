import { Clock, UserRound } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/states"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { formatTime, maskName } from "@/lib/format"
import { ESPERA_LABEL, ESPERA_TONE, type EsperaItem } from "@/modules/reservas/types"

/** Cola de espera de la sede (RF-R5-42): asignar mesa convierte la espera en reserva. */
export function WaitlistPanel({
  items,
  zonaHoraria,
  puedeVerPii,
  puedeAsignar,
  onAsignar,
}: {
  items: EsperaItem[]
  zonaHoraria: string
  puedeVerPii: boolean
  puedeAsignar: boolean
  onAsignar: (item: EsperaItem) => void
}) {
  const abiertas = items.filter((item) => item.estado === "esperando" || item.estado === "ofrecida")

  return (
    <section className="panel reserva-panel">
      <div className="panel__header">
        <div>
          <div className="panel__title">Lista de espera</div>
          <div className="panel__subtitle">{abiertas.length} en turno · la vigencia expira sola</div>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="reserva-panel__vacio">
          <EmptyState title="Sin lista de espera" description="Cuando el salón se llene, aquí aparecerán los turnos." />
        </div>
      ) : (
        <ul className="reserva-espera">
          {items.map((item) => {
            const asignable = abiertas.includes(item) && puedeAsignar
            return (
              <li className={`reserva-espera__item ${abiertas.includes(item) ? "" : "reserva-espera__item--cerrada"}`} key={item.id}>
                <div className="reserva-espera__head">
                  <strong>
                    <UserRound size={13} /> {puedeVerPii ? item.clienteNombre : maskName(item.clienteNombre)}
                  </strong>
                  <StatusBadge tone={ESPERA_TONE[item.estado]}>{ESPERA_LABEL[item.estado]}</StatusBadge>
                </div>
                <div className="reserva-espera__meta">
                  <span>{item.personas} personas</span>
                  <span>
                    <Clock size={12} /> Deseada {formatTime(item.franjaDeseada, zonaHoraria)}
                  </span>
                  <span>Vigente hasta {formatTime(item.vigenciaHasta, zonaHoraria)}</span>
                </div>
                {item.notas ? <p className="reserva-espera__notas">{item.notas}</p> : null}
                <Button
                  variant="ghost"
                  className="text-action"
                  disabled={!asignable}
                  title={!puedeAsignar ? "Requiere permiso de reservas.crear" : undefined}
                  onClick={() => onAsignar(item)}
                >
                  Asignar mesa
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
