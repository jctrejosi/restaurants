import { useEffect, useState } from "react"
import { Lock, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { TextareaField } from "@/components/ui/fields"
import { formatMoney } from "@/lib/format"
import { ApiError } from "@/lib/api"
import { useCerrarTurno } from "@/modules/caja/api"
import type { TurnoDetalle } from "@/modules/caja/types"
import { semaforoDiferencia, signoDiferencia } from "@/modules/caja/utils"
import { PendientesPedidosTable } from "@/modules/caja/components/PendientesPedidosTable"

/**
 * Cierre del turno (RF-R5-70/CA-11-02): si hay pedidos pendientes el backend
 * responde 409 y solo un cierre forzado, con motivo, queda auditado.
 */
export function CierreDialog({
  open,
  turno,
  onCancel,
  onCerrado,
}: {
  open: boolean
  turno: TurnoDetalle
  onCancel: () => void
  onCerrado: () => void
}) {
  const [confirmarPendientes, setConfirmarPendientes] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [error, setError] = useState<string | null>(null)
  const cerrar = useCerrarTurno(turno.id)

  useEffect(() => {
    if (!open) return
    setConfirmarPendientes(false)
    setMotivo("")
    setError(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  const hayPendientes = turno.pendientes.length > 0
  const diferencia = turno.arqueo?.diferenciaCentavos ?? null
  const semaforo = diferencia === null ? "aviso" : semaforoDiferencia(diferencia)
  const bloqueado = (hayPendientes && !confirmarPendientes) || (hayPendientes && motivo.trim().length < 3) || cerrar.isPending

  const confirmar = () => {
    setError(null)
    cerrar.mutate(
      { confirmarPendientes: hayPendientes ? confirmarPendientes : undefined, motivo: motivo.trim() || undefined },
      {
        onSuccess: () => onCerrado(),
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "No se pudo cerrar el turno. Reintenta."),
      },
    )
  }

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onCancel} />
      <div className="modal modal--wide" role="dialog" aria-modal="true" aria-label={`Cerrar turno ${turno.numero}`}>
        <div className="modal__header">
          <span className="modal__icon">
            <Lock size={18} />
          </span>
          <div>
            <strong>Cerrar turno {turno.numero}</strong>
            <p>El cierre cuadra contra los pagos aprobados y no se modifica sin reapertura auditada.</p>
          </div>
        </div>
        <div className="modal__body">
          <dl className="caja-cuadre__lista caja-cuadre__lista--compacta">
            <div>
              <dt>Esperado</dt>
              <dd>{formatMoney(turno.esperadoCentavos, turno.moneda)}</dd>
            </div>
            <div>
              <dt>Contado</dt>
              <dd>{turno.contadoCentavos === null ? "—" : formatMoney(turno.contadoCentavos, turno.moneda)}</dd>
            </div>
            <div className={`caja-cuadre__diferencia caja-cuadre__diferencia--${semaforo}`}>
              <dt>Diferencia</dt>
              <dd>
                {diferencia === null
                  ? "Sin arqueo"
                  : `${signoDiferencia(diferencia)} ${formatMoney(Math.abs(diferencia), turno.moneda)}`}
              </dd>
            </div>
          </dl>

          {hayPendientes ? (
            <>
              <div className="caja-alerta caja-alerta--warning">
                <TriangleAlert size={17} aria-hidden="true" />
                <div>
                  <strong>{turno.pendientes.length} pedidos pendientes de pago o cancelación</strong>
                  <span>
                    El turno no se cierra hasta resolverlos. Puedes forzar el cierre dejando el motivo en
                    auditoría.
                  </span>
                </div>
              </div>
              <PendientesPedidosTable
                pedidos={turno.pendientes}
                moneda={turno.moneda}
                zonaHoraria={turno.zonaHoraria}
              />
              <label className="caja-check">
                <input
                  type="checkbox"
                  checked={confirmarPendientes}
                  onChange={(event) => setConfirmarPendientes(event.target.checked)}
                />
                <span>
                  Confirmo el cierre con {turno.pendientes.length} pedidos pendientes; quedará registrado en
                  auditoría.
                </span>
              </label>
              <TextareaField
                label="Motivo del cierre forzado (obligatorio)"
                placeholder="Explica por qué se cierra con pedidos pendientes"
                rows={2}
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
              />
            </>
          ) : (
            <p className="caja-muted">Sin pedidos pendientes: el cierre se puede confirmar directamente.</p>
          )}

          {error ? <p className="modal__impact">{error}</p> : null}
          <p className="modal__note">El cierre queda registrado con usuario, fecha y diferencia.</p>
        </div>
        <div className="modal__footer">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={bloqueado}
            title={
              hayPendientes && !confirmarPendientes
                ? "Confirma el cierre con pendientes para continuar"
                : hayPendientes && motivo.trim().length < 3
                  ? "Escribe un motivo de al menos 3 caracteres"
                  : undefined
            }
            onClick={confirmar}
          >
            {cerrar.isPending ? "Cerrando…" : "Cerrar turno"}
          </Button>
        </div>
      </div>
    </>
  )
}
