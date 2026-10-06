import { CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/states"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { formatTime, maskName } from "@/lib/format"
import { ESTADO_LABEL, ESTADO_TONE, type ProximaLlegada } from "@/modules/reservas/types"

function etiquetaMinutos(minutos: number): string {
  if (minutos < 0) return `Retrasada ${Math.abs(minutos)} min`
  if (minutos <= 5) return "Llegando ahora"
  return `En ${minutos} min`
}

/** Próximas llegadas del día (RF-R5-42/44): abre el detalle para sentar o reubicar. */
export function ArrivalsPanel({
  llegadas,
  zonaHoraria,
  puedeVerPii,
  onAbrir,
}: {
  llegadas: ProximaLlegada[]
  zonaHoraria: string
  puedeVerPii: boolean
  onAbrir: (reservaId: string) => void
}) {
  return (
    <section className="panel reserva-panel">
      <div className="panel__header">
        <div>
          <div className="panel__title">Próximas llegadas</div>
          <div className="panel__subtitle">Reservas de hoy pendientes de sentar</div>
        </div>
      </div>
      {llegadas.length === 0 ? (
        <div className="reserva-panel__vacio">
          <EmptyState title="Sin llegadas próximas" description="No hay reservas pendientes en las próximas horas." />
        </div>
      ) : (
        <ul className="reserva-llegadas">
          {llegadas.map((llegada) => {
            const retrasada = llegada.minutos < 0
            return (
              <li className={`reserva-llegada ${retrasada ? "reserva-llegada--retrasada" : ""}`} key={llegada.reservaId}>
                <div className="reserva-llegada__hora">
                  <strong>{formatTime(llegada.hora, zonaHoraria)}</strong>
                  <span>
                    <Clock size={11} /> {etiquetaMinutos(llegada.minutos)}
                  </span>
                </div>
                <div className="reserva-llegada__cuerpo">
                  <strong>{puedeVerPii ? llegada.clienteNombre : maskName(llegada.clienteNombre)}</strong>
                  <span>
                    {llegada.codigo} · {llegada.personas} personas · {llegada.mesa ?? "Sin mesa"}
                  </span>
                  <StatusBadge tone={ESTADO_TONE[llegada.estado]}>{ESTADO_LABEL[llegada.estado]}</StatusBadge>
                </div>
                <Button
                  variant="ghost"
                  className="text-action"
                  title="Abrir la reserva para sentar, reubicar o cancelar"
                  onClick={() => onAbrir(llegada.reservaId)}
                >
                  <CheckCircle2 size={14} /> Sentar
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
