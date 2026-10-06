import { useNavigate } from "react-router-dom"
import { Ban, ExternalLink, Lock, Server } from "lucide-react"
import { Drawer } from "@/components/ui/Drawer"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { formatDateTime } from "@/lib/format"
import { useSede } from "@/app/sede"
import { BeforeAfterDiff } from "@/modules/auditoria/components/BeforeAfterDiff"
import {
  rutaEntidad,
  SEVERIDAD_LABEL,
  SEVERIDAD_TONE,
  type EventoAuditoria,
} from "@/modules/auditoria/types"

/** Detalle de un evento: las cinco preguntas de RN-R5-01 + diff antes/después. */
export function AuditEventDrawer({
  evento,
  onClose,
  onVerEntidad,
  onVerBitacora,
}: {
  evento: EventoAuditoria | null
  onClose: () => void
  /** Enlace bidireccional: navega al detalle de la entidad cuando exista ruta. */
  onVerEntidad?: (entidad: EventoAuditoria["entidad"], entidadId: string) => void
  /** Enlace a la línea de tiempo de la entidad (`/auditoria/:entidad/:id`). */
  onVerBitacora?: (entidad: EventoAuditoria["entidad"], entidadId: string) => void
}) {
  const navigate = useNavigate()
  const { zonaHoraria } = useSede()
  if (!evento) return null

  const ruta = rutaEntidad(evento.entidad, evento.entidadId)

  return (
    <Drawer
      open={evento !== null}
      onClose={onClose}
      title={evento.accionLabel}
      subtitle={`${evento.entidadLabel} · ${evento.fuente === "bitacora_evento" ? "bitácora de la entidad" : "evento de auditoría"}`}
      width={640}
      footer={
        <>
          <span className="audit-immutable">
            <Ban size={13} /> Inmutable: no se edita ni se borra (RN-R5-02)
          </span>
          {onVerBitacora ? (
            <Button
              variant="secondary"
              onClick={() => onVerBitacora(evento.entidad, evento.entidadId)}
            >
              Ver bitácora de la entidad
            </Button>
          ) : null}
          <Button
            variant="primary"
            disabled={!ruta}
            title={ruta ? "Ir al detalle de la entidad" : "Esta entidad no tiene vista de detalle en el panel"}
            onClick={() => {
              if (!ruta) return
              if (onVerEntidad) onVerEntidad(evento.entidad, evento.entidadId)
              else navigate(ruta)
            }}
          >
            <ExternalLink size={15} /> Ver entidad
          </Button>
        </>
      }
    >
      <div className="audit-detail">
        <div className="audit-detail__questions">
          <div>
            <span>Quién</span>
            <strong>{evento.usuarioNombre}</strong>
            <small>{evento.usuarioRol}</small>
          </div>
          <div>
            <span>Qué</span>
            <strong>{evento.accionLabel}</strong>
            <small>
              <code>{evento.accion}</code>
            </small>
          </div>
          <div>
            <span>Cuándo</span>
            <strong>{formatDateTime(evento.creadoEn, zonaHoraria)}</strong>
            <small>hora del servidor (RN-R5-08)</small>
          </div>
          <div>
            <span>Dónde</span>
            <strong>{evento.sedeNombre}</strong>
            <small>
              {evento.canal}
              {evento.dispositivoId ? ` · ${evento.dispositivoId}` : ""}
              {evento.ip ? ` · IP ${evento.ip}` : ""}
            </small>
          </div>
          <div>
            <span>Por qué</span>
            <strong>{evento.motivo ?? "—"}</strong>
            <small>{evento.motivo ? "motivo registrado" : "sin motivo capturado"}</small>
          </div>
          <div>
            <span>Severidad</span>
            <strong>
              <StatusBadge tone={SEVERIDAD_TONE[evento.severidad]}>{SEVERIDAD_LABEL[evento.severidad]}</StatusBadge>
            </strong>
            <small>derivada del catálogo acción → severidad</small>
          </div>
        </div>

        <section className="audit-detail__section">
          <h3>Antes / después</h3>
          <BeforeAfterDiff antes={evento.datosAntes} despues={evento.datosDespues} />
        </section>

        <section className="audit-detail__section">
          <h3>Metadatos del evento</h3>
          <dl className="audit-detail__meta">
            <div>
              <dt>ID</dt>
              <dd>{evento.id}</dd>
            </div>
            <div>
              <dt>Request</dt>
              <dd>{evento.requestId ?? "—"}</dd>
            </div>
            <div>
              <dt>Entidad</dt>
              <dd>
                {evento.entidadLabel} · <code>{evento.entidadId}</code>
              </dd>
            </div>
            <div>
              <dt>Fuente</dt>
              <dd>
                <Server size={12} /> {evento.fuente}
              </dd>
            </div>
          </dl>
        </section>

        <p className="audit-detail__note">
          <Lock size={13} /> El evento vive en una tabla particionada de solo inserción: no existe forma de editarlo ni
          borrarlo desde la UI ni la API (405 ante cualquier mutación).
        </p>
      </div>
    </Drawer>
  )
}
