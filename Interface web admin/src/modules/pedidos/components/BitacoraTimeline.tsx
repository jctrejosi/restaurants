import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge"
import { formatDateTime } from "@/lib/format"
import {
  ACTOR_LABEL,
  BITACORA_LABEL,
  CANAL_BITACORA_LABEL,
  type EventoBitacora,
} from "@/modules/pedidos/types"

function tonoResultado(resultado: string): StatusTone {
  const normalizado = resultado.toLowerCase()
  if (normalizado.includes("aprob") || normalizado.includes("complet")) return "green"
  if (normalizado.includes("rechaz") || normalizado.includes("fall")) return "gray"
  return "blue"
}

/** Línea de tiempo de la bitácora del pedido (RF-R5-131/132). */
export function BitacoraTimeline({ eventos }: { eventos: EventoBitacora[] }) {
  return (
    <ol className="bitacora">
      {eventos.map((evento) => (
        <li className="bitacora__item" key={evento.id}>
          <span className={`bitacora__dot bitacora__dot--${tonoResultado(evento.resultado)}`} aria-hidden="true" />
          <div className="bitacora__body">
            <div className="bitacora__head">
              <strong>{BITACORA_LABEL[evento.tipo]}</strong>
              <span className="bitacora__time" title="Hora del servidor">
                {formatDateTime(evento.servidorEn)}
              </span>
            </div>
            <div className="bitacora__meta">
              <span>{evento.actor}</span>
              <span>{ACTOR_LABEL[evento.actorTipo]}</span>
              <span>{CANAL_BITACORA_LABEL[evento.canal]}</span>
              <span>{evento.dispositivo}</span>
            </div>
            {evento.detalle ? <p className="bitacora__detail">{evento.detalle}</p> : null}
            <div className="bitacora__result">
              <StatusBadge tone={tonoResultado(evento.resultado)}>{evento.resultado}</StatusBadge>
            </div>
            {evento.diffs && evento.diffs.length > 0 ? (
              <div className="bitacora__diffs">
                {evento.diffs.map((diff) => (
                  <div className="diff" key={`${diff.campo}-${diff.antes}`}>
                    <span className="diff__campo">{diff.campo}</span>
                    <span className="diff__antes">{diff.antes}</span>
                    <span className="diff__arrow" aria-hidden="true">
                      →
                    </span>
                    <span className="diff__despues">{diff.despues}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
