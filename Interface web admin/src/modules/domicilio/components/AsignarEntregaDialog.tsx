import { useEffect, useMemo, useState } from "react"
import { Send, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { TextareaField } from "@/components/ui/fields"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { sugerirRepartidores, useAccionAsignacion } from "@/modules/domicilio/api"
import { VEHICULO_LABEL, type Entrega, type Repartidor } from "@/modules/domicilio/types"

/**
 * Asignación manual o sugerida. La sugerencia va primero (activos de la
 * sucursal, menos carga y sin retrasos); la asignación notifica al repartidor.
 */
export function AsignarEntregaDialog({
  open,
  entrega,
  accion,
  repartidores,
  onClose,
}: {
  open: boolean
  entrega: Entrega | null
  accion: "asignar" | "reasignar"
  repartidores: Repartidor[]
  onClose: () => void
}) {
  const { mostrar } = useToast()
  const asignar = useAccionAsignacion()
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [motivo, setMotivo] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !entrega) return
    setSeleccionado(null)
    setMotivo("")
    setError(null)
  }, [open, entrega])

  const sugeridos = useMemo(
    () => (entrega ? sugerirRepartidores(repartidores, entrega.sucursalId) : []),
    [entrega, repartidores],
  )

  const candidatos = useMemo(() => {
    if (!entrega) return []
    const activos = repartidores.filter(
      (repartidor) => repartidor.sucursalId === entrega.sucursalId && repartidor.estado !== "inactivo",
    )
    const ordenados = [
      ...sugeridos,
      ...activos.filter((repartidor) => !sugeridos.some((sugerido) => sugerido.id === repartidor.id)),
    ]
    return ordenados.filter((repartidor) => repartidor.id !== entrega.repartidorId)
  }, [entrega, repartidores, sugeridos])

  if (!open || !entrega) return null

  const esReasignacion = accion === "reasignar"
  const bloqueado = !seleccionado || (esReasignacion && motivo.trim().length < 3)

  const confirmar = () => {
    if (!seleccionado) return
    asignar.mutate(
      {
        pedidoId: entrega.pedidoId,
        accion,
        repartidorId: seleccionado,
        motivo: motivo.trim() || undefined,
      },
      {
        onSuccess: (resultado) => {
          mostrar(
            `Entrega ${resultado.entrega.folio} asignada a ${resultado.entrega.repartidorNombre}. Notificación ${resultado.notificacion?.canal ?? "encolada"} ${resultado.notificacion?.estado ?? "enviada"}.`,
            "exito",
          )
          onClose()
        },
        onError: (fallo) =>
          setError(fallo instanceof ApiError ? fallo.message : "No se pudo asignar la entrega."),
      },
    )
  }

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onClose} />
      <div className="modal modal--wide" role="dialog" aria-modal="true" aria-label="Asignar entrega">
        <div className="modal__header">
          <span className="modal__icon">
            {esReasignacion ? <Send size={18} /> : <UserPlus size={18} />}
          </span>
          <div>
            <strong>
              {esReasignacion ? "Reasignar entrega" : "Asignar entrega"} {entrega.folio}
            </strong>
            <p>
              {esReasignacion && entrega.repartidorNombre
                ? `Actualmente con ${entrega.repartidorNombre}; el cambio cierra la asignación anterior.`
                : "Elige al repartidor; se le notifica por el canal configurado."}
            </p>
          </div>
        </div>
        <div className="modal__body">
          <div className="asignar-candidatos">
            {candidatos.length === 0 ? (
              <p className="domicilio-notice">No hay repartidores disponibles en esta sucursal.</p>
            ) : (
              candidatos.map((repartidor, indice) => (
                <button
                  key={repartidor.id}
                  type="button"
                  className={`asignar-candidato ${seleccionado === repartidor.id ? "asignar-candidato--activo" : ""}`}
                  onClick={() => setSeleccionado(repartidor.id)}
                >
                  <span className="asignar-candidato__head">
                    <strong>{repartidor.nombre}</strong>
                    {indice === 0 ? <StatusBadge tone="green">Sugerido</StatusBadge> : null}
                    {repartidor.estado === "ocupado" ? <StatusBadge tone="amber">Ocupado</StatusBadge> : null}
                  </span>
                  <small>
                    {repartidor.entregasActivas} entregas activas · promedio{" "}
                    {repartidor.tiempoPromedioMin == null ? "—" : `${repartidor.tiempoPromedioMin} min`} ·{" "}
                    {VEHICULO_LABEL[repartidor.vehiculo]}
                  </small>
                </button>
              ))
            )}
          </div>

          <TextareaField
            label={esReasignacion ? "Motivo (obligatorio)" : "Nota para auditoría (opcional)"}
            placeholder={esReasignacion ? "Explica por qué cambia de repartidor" : "Instrucciones para la entrega"}
            rows={3}
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
          />
          {error ? <p className="form-error">{error}</p> : null}
          <p className="modal__note">
            La asignación crea una notificación al repartidor y queda auditada con actor y sello del servidor.
          </p>
        </div>
        <div className="modal__footer">
          <Button variant="secondary" onClick={onClose} disabled={asignar.isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={bloqueado || asignar.isPending}
            title={bloqueado ? "Elige un repartidor" : undefined}
            onClick={confirmar}
          >
            {asignar.isPending ? "Asignando…" : esReasignacion ? "Reasignar" : "Asignar"}
          </Button>
        </div>
      </div>
    </>
  )
}
