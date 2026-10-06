import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, CornerDownLeft, Flag, MapPin, Phone, Undo2, UserPlus } from "lucide-react"
import { DurationCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Drawer } from "@/components/ui/Drawer"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { formatDateTime, formatDuration, formatTime, maskContact, maskName } from "@/lib/format"
import { useAccionAsignacion } from "@/modules/domicilio/api"
import { CerrarEntregaDialog } from "@/modules/domicilio/components/CerrarEntregaDialog"
import {
  ENTREGA_ESTADO_LABEL,
  ENTREGA_ESTADO_TONE,
  entregaEstaActiva,
  type Entrega,
} from "@/modules/domicilio/types"

function tonoDot(estado: Entrega["estado"]): string {
  const tono = ENTREGA_ESTADO_TONE[estado]
  return tono === "outline" ? "gray" : tono
}

/** Detalle de una entrega con sus tramos sellados, evidencia y acciones. */
export function EntregaDetalleDrawer({
  open,
  entrega,
  zonaHoraria,
  puedeVerPii,
  puedeAsignar,
  puedeCerrar,
  onClose,
  onAsignar,
}: {
  open: boolean
  entrega: Entrega | null
  zonaHoraria: string
  puedeVerPii: boolean
  puedeAsignar: boolean
  puedeCerrar: boolean
  onClose: () => void
  onAsignar: (entrega: Entrega, accion: "asignar" | "reasignar") => void
}) {
  const { mostrar } = useToast()
  const accion = useAccionAsignacion()
  const [incidencia, setIncidencia] = useState<"fallar" | "devolver" | null>(null)
  const [cerrarOpen, setCerrarOpen] = useState(false)
  const [errorCierre, setErrorCierre] = useState<string | null>(null)

  if (!open || !entrega) return null

  const activa = entregaEstaActiva(entrega.estado)
  const asignada = Boolean(entrega.repartidorId)
  const referencia = entrega.asignadoEn ?? entrega.creadoEn
  const transcurridoSeg = activa
    ? Math.max(0, Math.round((Date.now() - new Date(referencia).getTime()) / 1000))
    : entrega.totalSeg
  const retrasada = activa && transcurridoSeg != null && transcurridoSeg > entrega.tiempoEstimadoMin * 60

  const tituloPermiso = (permitido: boolean, permiso: string) =>
    permitido ? undefined : `Requiere permiso de ${permiso}`

  const ejecutar = (
    payload: { accion: "recoger" | "en_camino" | "fallar" | "devolver"; motivo?: string },
    exito: string,
  ) => {
    accion.mutate(
      { pedidoId: entrega.pedidoId, ...payload },
      {
        onSuccess: () => mostrar(exito, "exito"),
        onError: (error) =>
          mostrar(error instanceof ApiError ? error.message : "No se pudo completar la acción.", "error"),
        onSettled: () => setIncidencia(null),
      },
    )
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        width={640}
        title={`Entrega ${entrega.folio}`}
        subtitle={`${entrega.zonaNombre} · ${entrega.direccion}`}
        footer={
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        }
      >
        <div className="drawer-entity">
          <div>
            <StatusBadge tone={ENTREGA_ESTADO_TONE[entrega.estado]}>
              {ENTREGA_ESTADO_LABEL[entrega.estado]}
            </StatusBadge>{" "}
            {retrasada ? <StatusBadge tone="amber">Retrasada</StatusBadge> : null}
          </div>
          <div className="drawer-entity__tiempo">
            <span>Tiempo {activa ? "transcurrido" : "total"}</span>
            <DurationCell
              segundos={transcurridoSeg}
              objetivoSeg={entrega.tiempoEstimadoMin * 60}
              titulo={`Estimado: ${entrega.tiempoEstimadoMin} min`}
            />
          </div>
        </div>

        {retrasada ? (
          <p className="domicilio-alert domicilio-alert--late">
            La entrega supera el tiempo estimado ({entrega.tiempoEstimadoMin} min) de su zona.
          </p>
        ) : null}

        <div className="entrega-datos">
          <div>
            <strong>Cliente</strong>
            <span>{puedeVerPii ? entrega.clienteNombre : maskName(entrega.clienteNombre)}</span>
          </div>
          <div>
            <strong>Teléfono</strong>
            <span>
              <Phone size={12} /> {puedeVerPii ? entrega.telefono : maskContact(entrega.telefono)}
            </span>
          </div>
          <div>
            <strong>Dirección</strong>
            <span>
              <MapPin size={12} /> {entrega.direccion}
            </span>
          </div>
          <div>
            <strong>Repartidor</strong>
            <span>{entrega.repartidorNombre ?? "Sin asignar"}</span>
          </div>
          <div>
            <strong>Notificación</strong>
            <span>
              {entrega.notificacion
                ? `${entrega.notificacion.canal} · ${entrega.notificacion.estado}`
                : "—"}
            </span>
          </div>
          <div>
            <strong>Hora programada</strong>
            <span>{entrega.horaProgramada ? formatTime(entrega.horaProgramada, zonaHoraria) : "Lo antes posible"}</span>
          </div>
        </div>

        <div className="entrega-acciones">
          <Button
            variant="secondary"
            disabled={!puedeAsignar}
            title={tituloPermiso(puedeAsignar, "domicilio.asignar")}
            onClick={() => onAsignar(entrega, entrega.repartidorId && activa ? "reasignar" : "asignar")}
          >
            <UserPlus size={15} /> {entrega.repartidorId && activa ? "Reasignar" : "Asignar"}
          </Button>
          {activa ? (
            <>
              <Button
                variant="secondary"
                disabled={!puedeCerrar || !asignada || entrega.estado !== "asignado" || accion.isPending}
                title={
                  !asignada
                    ? "Primero asigna un repartidor"
                    : entrega.estado !== "asignado"
                      ? "Disponible cuando la entrega está asignada"
                      : tituloPermiso(puedeCerrar, "domicilio.cerrar_entrega")
                }
                onClick={() => ejecutar({ accion: "recoger" }, "Entrega marcada como recogida (sello del servidor).")}
              >
                <CornerDownLeft size={15} /> Recoger
              </Button>
              <Button
                variant="secondary"
                disabled={!puedeCerrar || !asignada || entrega.estado !== "recogido" || accion.isPending}
                title={
                  !asignada
                    ? "Primero asigna un repartidor"
                    : entrega.estado !== "recogido"
                      ? "Primero marca la entrega como recogida"
                      : tituloPermiso(puedeCerrar, "domicilio.cerrar_entrega")
                }
                onClick={() => ejecutar({ accion: "en_camino" }, "Entrega en camino (sello del servidor).")}
              >
                <ArrowRight size={15} /> En camino
              </Button>
              <Button
                variant="primary"
                disabled={
                  !puedeCerrar ||
                  !asignada ||
                  (entrega.estado !== "en_camino" && entrega.estado !== "recogido") ||
                  accion.isPending
                }
                title={asignada ? tituloPermiso(puedeCerrar, "domicilio.cerrar_entrega") : "Primero asigna un repartidor"}
                onClick={() => {
                  setErrorCierre(null)
                  setCerrarOpen(true)
                }}
              >
                Cerrar con evidencia
              </Button>
              <Button
                variant="ghost"
                className="text-action"
                disabled={!puedeCerrar || !asignada || accion.isPending}
                title={
                  asignada
                    ? tituloPermiso(puedeCerrar, "domicilio.cerrar_entrega")
                    : "Primero asigna un repartidor"
                }
                onClick={() => setIncidencia("fallar")}
              >
                <Flag size={14} /> Fallo
              </Button>
              <Button
                variant="ghost"
                className="text-action"
                disabled={!puedeCerrar || !asignada || accion.isPending}
                title={
                  asignada
                    ? tituloPermiso(puedeCerrar, "domicilio.cerrar_entrega")
                    : "Primero asigna un repartidor"
                }
                onClick={() => setIncidencia("devolver")}
              >
                <Undo2 size={14} /> Devolución
              </Button>
            </>
          ) : null}
          <Link className="button button--ghost text-action" to={`/pedidos/${entrega.pedidoId}`}>
            Ver pedido y bitácora
          </Link>
        </div>

        <h4 className="entrega-seccion">Línea de tiempo (sellos del servidor)</h4>
        {entrega.tramos.length === 0 ? (
          <p className="domicilio-hint">Sin hitos registrados.</p>
        ) : (
          <ol className="entrega-timeline">
            {entrega.tramos.map((tramo, indice) => (
              <li className="entrega-timeline__item" key={`${tramo.estado}-${indice}`}>
                <span className={`entrega-timeline__dot entrega-timeline__dot--${tonoDot(tramo.estado)}`} />
                <div>
                  <strong>{ENTREGA_ESTADO_LABEL[tramo.estado]}</strong>
                  <span>
                    {tramo.actor} · {formatDateTime(tramo.servidorEn, zonaHoraria)}
                  </span>
                  {tramo.nota ? <p>{tramo.nota}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        )}

        {entrega.evidenciaUrl ? (
          <div className="entrega-evidencia">
            <strong>Evidencia de entrega</strong>
            <a href={entrega.evidenciaUrl} target="_blank" rel="noreferrer">
              Ver comprobante adjunto
            </a>
            {entrega.entregadoEn ? (
              <small>
                Cerrada por el servidor {formatDateTime(entrega.entregadoEn, zonaHoraria)} ·{" "}
                {formatDuration(entrega.totalSeg)}
              </small>
            ) : null}
          </div>
        ) : null}

        {entrega.motivoIncidencia ? (
          <p className="domicilio-alert domicilio-alert--late">
            Incidencia: {entrega.motivoIncidencia}. No suma a la liquidación.
          </p>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={incidencia != null}
        title={
          incidencia === "devolver"
            ? `Registrar devolución de ${entrega.folio}`
            : `Reportar fallo de entrega de ${entrega.folio}`
        }
        description="La incidencia queda auditada con motivo y no suma a la liquidación del repartidor."
        impacto={
          incidencia === "devolver"
            ? "El pedido se marca como devuelto a sucursal y la asignación se cierra."
            : "El pedido se marca como entrega fallida y la asignación se cierra."
        }
        confirmLabel={incidencia === "devolver" ? "Registrar devolución" : "Reportar fallo"}
        onCancel={() => setIncidencia(null)}
        onConfirm={(motivo) => {
          if (!incidencia) return
          ejecutar(
            { accion: incidencia, motivo },
            incidencia === "devolver" ? "Devolución registrada y auditada." : "Fallo de entrega registrado.",
          )
        }}
      />

      <CerrarEntregaDialog
        open={cerrarOpen}
        entrega={entrega}
        cerrando={accion.isPending}
        error={errorCierre}
        onCancel={() => setCerrarOpen(false)}
        onConfirm={({ evidenciaUrl, nota }) => {
          accion.mutate(
            { pedidoId: entrega.pedidoId, accion: "entregar", evidenciaUrl, motivo: nota },
            {
              onSuccess: (resultado) => {
                setCerrarOpen(false)
                mostrar(
                  `Entrega ${resultado.entrega.folio} cerrada con sello del servidor${
                    resultado.entrega.entregadoEn
                      ? ` (${formatTime(resultado.entrega.entregadoEn, zonaHoraria)})`
                      : ""
                  }.`,
                  "exito",
                )
              },
              onError: (error) =>
                setErrorCierre(error instanceof ApiError ? error.message : "No se pudo cerrar la entrega."),
            },
          )
        }}
      />
    </>
  )
}
