import { useNavigate } from "react-router-dom"
import { Activity, AlertTriangle, CloudOff, ExternalLink, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { formatDateTime, formatRelative } from "@/lib/format"
import { useDiagnosticoDispositivo } from "@/modules/dispositivos/api"
import type { AlertaDispositivo } from "@/modules/dispositivos/types"

const TONE_SEVERIDAD: Record<AlertaDispositivo["severidad"], StatusTone> = {
  critica: "amber",
  alta: "amber",
  media: "blue",
  baja: "gray",
}

const TONE_OPERACION = {
  pendiente: "amber",
  aplicada: "green",
  rechazada: "gray",
} as const

/**
 * Diagnóstico V1 (RF-R5-152): última conexión, pendientes de `sync_operacion`,
 * último error y alerta enlazada. Un equipo offline con pendientes no se oculta.
 */
export function DeviceDiagnosticPanel({ dispositivoId }: { dispositivoId: string | null }) {
  const navigate = useNavigate()
  const diagnostico = useDiagnosticoDispositivo(dispositivoId)

  if (diagnostico.isLoading) return <SkeletonRows rows={5} columns={3} />
  if (diagnostico.isError || !diagnostico.data) {
    return (
      <ErrorState
        description="No pudimos cargar el diagnóstico del dispositivo."
        onRetry={() => void diagnostico.refetch()}
      />
    )
  }

  const { dispositivo, operaciones, alertas, historial } = diagnostico.data
  const sinConexion = dispositivo.ultimaConexionEn === null

  return (
    <div className="diagnostico">
      <div className="diagnostico__kpis">
        <div className="diagnostico__kpi">
          <span>
            <WifiOff size={14} /> Última conexión
          </span>
          <strong>{dispositivo.ultimaConexionEn ? formatRelative(dispositivo.ultimaConexionEn) : "Nunca"}</strong>
          <small>
            {dispositivo.ultimaConexionEn ? formatDateTime(dispositivo.ultimaConexionEn) : "Sin registro"}
          </small>
        </div>
        <div className="diagnostico__kpi">
          <span>
            <CloudOff size={14} /> Operaciones pendientes
          </span>
          <strong>{diagnostico.data.operacionesPendientes}</strong>
          <small>En cola de sincronización</small>
        </div>
        <div className="diagnostico__kpi">
          <span>
            <AlertTriangle size={14} /> Rechazadas
          </span>
          <strong>{diagnostico.data.operacionesRechazadas}</strong>
          <small>{diagnostico.data.ultimoError ?? "Sin errores"}</small>
        </div>
      </div>

      {sinConexion ? (
        <p className="diagnostico__aviso" role="note">
          <WifiOff size={15} /> El equipo no ha reportado conexión. Sus operaciones pendientes siguen
          visibles y no se descartan.
        </p>
      ) : null}

      {alertas.length > 0 ? (
        <section className="diagnostico__bloque">
          <h4>Alertas asociadas</h4>
          <div className="diagnostico__alertas">
            {alertas.map((alerta) => (
              <article className="diagnostico__alerta" key={alerta.id}>
                <StatusBadge tone={TONE_SEVERIDAD[alerta.severidad]}>{alerta.severidad}</StatusBadge>
                <div>
                  <strong>{alerta.titulo}</strong>
                  <small>
                    {alerta.detalle} · {formatRelative(alerta.creadaEn)}
                  </small>
                </div>
                <Button variant="ghost" className="text-action" onClick={() => navigate("/en-vivo")}>
                  <ExternalLink size={12} /> Ver alerta
                </Button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="diagnostico__bloque">
        <h4>Operaciones de sincronización</h4>
        {operaciones.length === 0 ? (
          <EmptyState title="Sin operaciones en cola" description="El dispositivo está al día." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client op</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Creada</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {operaciones.map((operacion) => (
                  <tr key={operacion.id}>
                    <td>
                      <span className="order-id">{operacion.clientOpId}</span>
                    </td>
                    <td>{operacion.tipo}</td>
                    <td>
                      <StatusBadge tone={TONE_OPERACION[operacion.estado]}>{operacion.estado}</StatusBadge>
                    </td>
                    <td>{formatRelative(operacion.creadoEn)}</td>
                    <td className="diagnostico__error">{operacion.error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="diagnostico__bloque">
        <h4>Historial de conexiones y eventos</h4>
        <ol className="diagnostico__historial">
          {historial.map((evento) => (
            <li key={evento.id}>
              <Activity size={13} />
              <span>{evento.evento}</span>
              <small>{formatDateTime(evento.creadoEn)}</small>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
