import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ExternalLink, Lock, ShieldAlert } from "lucide-react"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { Button } from "@/components/ui/Button"
import { formatDateTime, formatMoney } from "@/lib/format"
import { useSede } from "@/app/sede"
import { AuditEventDrawer } from "@/modules/auditoria/components/AuditEventDrawer"
import { RetentionBadge } from "@/modules/auditoria/components/RetentionBadge"
import {
  rutaEntidad,
  SEVERIDAD_LABEL,
  SEVERIDAD_TONE,
  type EntidadTimelineResp,
  type EventoAuditoria,
} from "@/modules/auditoria/types"

function valorCorto(clave: string, valor: unknown): string {
  if (valor === null || valor === undefined) return "—"
  if (typeof valor === "boolean") return valor ? "Sí" : "No"
  if (typeof valor === "number") return clave.endsWith("_centavos") ? formatMoney(valor) : String(valor)
  if (Array.isArray(valor)) return valor.join(", ")
  if (typeof valor === "object") return JSON.stringify(valor)
  return String(valor)
}

/** Primera diferencia antes → después, para la vista compacta del hito. */
function resumenDiff(antes: Record<string, unknown> | null, despues: Record<string, unknown> | null): string | null {
  if (!antes && despues) {
    const primeraEntrada = Object.entries(despues)[0]
    if (!primeraEntrada) return "Creado"
    return `Creado · ${primeraEntrada[0].replace(/_/g, " ")}: ${valorCorto(primeraEntrada[0], primeraEntrada[1])}`
  }
  if (!antes) return null
  for (const clave of Object.keys(despues ?? {})) {
    if (JSON.stringify(antes[clave]) !== JSON.stringify(despues?.[clave])) {
      return `${clave.replace(/_/g, " ")}: ${valorCorto(clave, antes[clave])} → ${valorCorto(clave, despues?.[clave])}`
    }
  }
  return null
}

/** Línea de tiempo completa de una entidad (RF-R5-131) con enlace bidireccional. */
export function EntityTimeline({ data }: { data: EntidadTimelineResp }) {
  const navigate = useNavigate()
  const { zonaHoraria } = useSede()
  const [evento, setEvento] = useState<EventoAuditoria | null>(null)
  const ruta = rutaEntidad(data.entidad, data.entidadId)

  return (
    <div className="audit-stack">
      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">{data.entidadLabel}</div>
            <div className="panel__subtitle">
              Línea de tiempo de <code>
                {data.entidad}/{data.entidadId}
              </code>{" "}
              · {data.eventos.length} eventos en orden cronológico inverso · fuentes `bitacora_evento` + `evento_auditoria`
            </div>
          </div>
          <div className="audit-header-actions">
            <RetentionBadge retencion={data.retencion} />
            <Button
              variant="secondary"
              disabled={!ruta}
              title={ruta ? "Volver al detalle de la entidad" : "Sin vista de detalle para esta entidad"}
              onClick={() => ruta && navigate(ruta)}
            >
              <ExternalLink size={15} /> Ver entidad
            </Button>
          </div>
        </div>

        {data.eventos.length === 0 ? (
          <div className="audit-empty">
            <ShieldAlert size={20} aria-hidden="true" />
            <strong>Sin eventos para esta entidad en la retención vigente</strong>
            <p>
              La bitácora es inmutable y solo crece; si la entidad es anterior a {data.retencion.purgadoAntesDe}, sus
              eventos se purgaron según la retención de {data.retencion.meses} meses.
            </p>
          </div>
        ) : (
          <ol className="audit-timeline">
            {data.eventos.map((hito) => {
              const resumen = resumenDiff(hito.datosAntes, hito.datosDespues)
              return (
                <li key={hito.id} className={`audit-timeline__item audit-timeline__item--${hito.severidad}`}>
                  <span className="audit-timeline__dot" aria-hidden="true" />
                  <button type="button" className="audit-timeline__card" onClick={() => setEvento(hito)}>
                    <div className="audit-timeline__head">
                      <strong>{hito.accionLabel}</strong>
                      <StatusBadge tone={SEVERIDAD_TONE[hito.severidad]}>
                        {SEVERIDAD_LABEL[hito.severidad]}
                      </StatusBadge>
                      <span className="audit-timeline__hora">{formatDateTime(hito.creadoEn, zonaHoraria)}</span>
                    </div>
                    <div className="audit-timeline__meta">
                      <span>
                        {hito.usuarioNombre} · {hito.usuarioRol}
                      </span>
                      <span>
                        {hito.canal}
                        {hito.dispositivoId ? ` · ${hito.dispositivoId}` : ""}
                      </span>
                      <span className="audit-timeline__fuente">{hito.fuente}</span>
                    </div>
                    {hito.motivo ? <p className="audit-timeline__motivo">Motivo: {hito.motivo}</p> : null}
                    {resumen ? <p className="audit-timeline__diff">{resumen}</p> : null}
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <p className="audit-note">
        <Lock size={13} /> Esta línea de tiempo es de solo lectura: la UI no ofrece editar ni borrar y la API responde
        405 ante cualquier mutación (RN-R5-02).
      </p>

      <AuditEventDrawer evento={evento} onClose={() => setEvento(null)} />
    </div>
  )
}
