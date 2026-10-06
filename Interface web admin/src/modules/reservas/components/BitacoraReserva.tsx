import { Download } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge"
import { formatDateTime, formatDuration } from "@/lib/format"
import {
  ACTOR_LABEL,
  BITACORA_LABEL,
  CANAL_BITACORA_LABEL,
  type EventoReserva,
  type TiemposReserva,
} from "@/modules/reservas/types"

function tonoResultado(resultado: string): StatusTone {
  const normalizado = resultado.toLowerCase()
  if (normalizado.includes("aprob") || normalizado.includes("complet") || normalizado.includes("pagad") || normalizado.includes("confirm")) {
    return "green"
  }
  if (normalizado.includes("rechaz") || normalizado.includes("fall") || normalizado.includes("no-show")) return "gray"
  return "blue"
}

/** Pestaña fija de bitácora (RF-R5-47): actor, canal, hora, resultado y tiempos clave. */
export function BitacoraReserva({
  eventos,
  tiempos,
  puedeExportar,
  exportando,
  onExportar,
}: {
  eventos: EventoReserva[]
  tiempos: TiemposReserva
  puedeExportar: boolean
  exportando: boolean
  onExportar: () => void
}) {
  return (
    <div className="reserva-bitacora">
      <div className="reserva-bitacora__toolbar">
        <p className="reserva-nota">
          Bitácora inmutable (RN-R5-02): cada evento guarda actor, canal, hora y resultado. Los tiempos se calculan
          con sellos del servidor.
        </p>
        <Button
          variant="secondary"
          disabled={!puedeExportar || exportando}
          title={!puedeExportar ? "Requiere permiso de reservas.exportar" : undefined}
          onClick={onExportar}
        >
          <Download size={14} /> {exportando ? "Exportando…" : "Exportar bitácora"}
        </Button>
      </div>

      {eventos.length === 0 ? (
        <p className="reserva-nota">Todavía no hay eventos para esta reserva.</p>
      ) : (
        <ol className="reserva-bitacora__lista">
          {eventos.map((evento) => {
            const tiempo =
              evento.tipo === "sentada"
                ? { etiqueta: "Espera", segundos: tiempos.esperaSeg, titulo: "= sentada − fecha y hora" }
                : evento.tipo === "finalizada"
                  ? { etiqueta: "Duración de mesa", segundos: tiempos.duracionMesaSeg, titulo: "= finalizada − sentada" }
                  : null
            return (
              <li className="reserva-bitacora__item" key={evento.id}>
                <span className={`reserva-bitacora__dot reserva-bitacora__dot--${tonoResultado(evento.resultado)}`} aria-hidden="true" />
                <div className="reserva-bitacora__body">
                  <div className="reserva-bitacora__head">
                    <strong>{BITACORA_LABEL[evento.tipo]}</strong>
                    <span className="reserva-bitacora__time" title="Hora del servidor (RN-R5-08)">
                      {formatDateTime(evento.servidorEn)}
                    </span>
                  </div>
                  <div className="reserva-bitacora__meta">
                    <span>{evento.actor}</span>
                    <span>{ACTOR_LABEL[evento.actorTipo]}</span>
                    <span>{CANAL_BITACORA_LABEL[evento.canal]}</span>
                    <span>{evento.dispositivo}</span>
                  </div>
                  {evento.detalle ? <p className="reserva-bitacora__detail">{evento.detalle}</p> : null}
                  <div className="reserva-bitacora__result">
                    <StatusBadge tone={tonoResultado(evento.resultado)}>{evento.resultado}</StatusBadge>
                    {tiempo ? (
                      <span className="reserva-bitacora__tiempo" title={tiempo.titulo}>
                        {tiempo.etiqueta}: {formatDuration(tiempo.segundos)}
                      </span>
                    ) : null}
                  </div>
                  {evento.diffs && evento.diffs.length > 0 ? (
                    <div className="reserva-diffs">
                      {evento.diffs.map((diff) => (
                        <div className="reserva-diff" key={`${diff.campo}-${diff.antes}`}>
                          <span className="reserva-diff__campo">{diff.campo}</span>
                          <span className="reserva-diff__antes">{diff.antes}</span>
                          <span className="reserva-diff__arrow" aria-hidden="true">
                            →
                          </span>
                          <span className="reserva-diff__despues">{diff.despues}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
