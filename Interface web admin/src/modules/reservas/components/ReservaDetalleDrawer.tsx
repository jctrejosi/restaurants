import { useEffect, useMemo, useState } from "react"
import {
  Ban,
  CalendarClock,
  CreditCard,
  DoorOpen,
  LogOut,
  Pencil,
  Undo2,
  UserX,
} from "lucide-react"
import { useAuth } from "@/app/auth"
import { Tabs } from "@/components/data/Tabs"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Drawer } from "@/components/ui/Drawer"
import { TextField, TextareaField } from "@/components/ui/fields"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/states"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { formatDateTime, formatDuration, formatMoney } from "@/lib/format"
import { useAccionReserva, useExportarReservas, useReservaDetalle } from "@/modules/reservas/api"
import { BitacoraReserva } from "@/modules/reservas/components/BitacoraReserva"
import { DepositoTab } from "@/modules/reservas/components/DepositoTab"
import { ReservaFormDrawer } from "@/modules/reservas/components/ReservaFormDrawer"
import { ResumenTab } from "@/modules/reservas/components/ResumenTab"
import { ReubicarDialog, type ReubicarPayload } from "@/modules/reservas/components/ReubicarDialog"
import {
  CANAL_LABEL,
  DEPOSITO_LABEL,
  DEPOSITO_TONE,
  ESTADO_LABEL,
  ESTADO_TONE,
  reservaAdmiteReubicacion,
  type AccionReservaPayload,
  type ReservaDetalle,
} from "@/modules/reservas/types"

export type ReservaTab = "resumen" | "bitacora" | "deposito"

type Dialogo =
  | { tipo: "editar" }
  | { tipo: "reubicar" }
  | { tipo: "sentar" }
  | { tipo: "finalizar" }
  | { tipo: "no_show" }
  | { tipo: "cancelar" }
  | { tipo: "registrar_deposito" }
  | { tipo: "reembolsar_deposito" }
  | null

function useAnchoDrawer(): number {
  const [ancho, setAncho] = useState(() =>
    typeof window === "undefined" ? 820 : Math.min(820, Math.round(window.innerWidth * 0.96)),
  )
  useEffect(() => {
    const onResize = () => setAncho(Math.min(820, Math.round(window.innerWidth * 0.96)))
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  return ancho
}

/** Detalle de la reserva con acciones y las pestañas Resumen, Bitácora y Depósito. */
export function ReservaDetalleDrawer({
  reservaId,
  open,
  tab,
  onTabChange,
  onClose,
}: {
  reservaId: string | null
  open: boolean
  tab: ReservaTab
  onTabChange: (tab: ReservaTab) => void
  onClose: () => void
}) {
  const { data: reserva, isLoading, isError, refetch } = useReservaDetalle(open ? reservaId : null)
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const ancho = useAnchoDrawer()
  const accion = useAccionReserva()
  const exportar = useExportarReservas()

  const [dialogo, setDialogo] = useState<Dialogo>(null)

  useEffect(() => {
    setDialogo(null)
  }, [reservaId])

  const puede = {
    editar: tienePermiso("reservas.editar"),
    reubicar: tienePermiso("reservas.reubicar"),
    cancelar: tienePermiso("reservas.cancelar"),
    estado: tienePermiso("reservas.estado"),
    depositos: tienePermiso("reservas.depositos"),
    reembolsar: tienePermiso("reservas.reembolsar"),
    exportar: tienePermiso("reservas.exportar"),
    verPii: tienePermiso("clientes.ver_pii"),
  }

  const ejecutar = (payload: Omit<AccionReservaPayload, "id">, exito: string) => {
    if (!reservaId) return
    accion.mutate(
      { ...payload, id: reservaId },
      {
        onSuccess: () => mostrar(exito, "exito"),
        onError: (error) =>
          mostrar(error instanceof ApiError ? error.message : "No se pudo completar la acción. Intenta de nuevo.", "error"),
        onSettled: () => setDialogo(null),
      },
    )
  }

  const tabs = useMemo(() => {
    if (!reserva) {
      return [
        { id: "resumen", label: "Resumen" },
        { id: "bitacora", label: "Bitácora" },
        { id: "deposito", label: "Depósito" },
      ]
    }
    return [
      { id: "resumen", label: "Resumen" },
      { id: "bitacora", label: "Bitácora", badge: String(reserva.bitacora.length) },
      { id: "deposito", label: "Depósito", badge: reserva.depositoRequeridoCentavos > 0 ? DEPOSITO_LABEL[reserva.depositoEstado] : undefined },
    ]
  }, [reserva])

  const tituloBoton = (permitido: boolean, permiso: string, activo = true) => {
    if (!permitido) return `Requiere permiso de ${permiso}`
    if (!activo) return "La reserva ya no admite esta acción"
    return undefined
  }

  const admiteLlegada = reserva?.estado === "solicitada" || reserva?.estado === "confirmada"
  const puedeSentarAhora = Boolean(admiteLlegada && reserva?.mesaId)

  if (!open) return null

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={ancho}
      title={reserva ? `Reserva ${reserva.codigo}` : "Detalle de la reserva"}
      subtitle={
        reserva
          ? `${reserva.sedeNombre} · ${formatDateTime(reserva.fechaHora, reserva.zonaHoraria)} · ${reserva.personas} personas`
          : "Cargando información…"
      }
    >
      {isError ? (
        <ErrorState
          title="No pudimos cargar la reserva"
          description="Revisa tu conexión e inténtalo de nuevo. Si cambió, vuelve a abrir el detalle."
          onRetry={() => void refetch()}
        />
      ) : isLoading || !reserva ? (
        <SkeletonRows rows={6} columns={4} />
      ) : (
        <>
          <div className="reserva-entity">
            <div className="reserva-entity__row">
              <span className="reserva-codigo">{reserva.codigo}</span>
              <StatusBadge tone={ESTADO_TONE[reserva.estado]}>{ESTADO_LABEL[reserva.estado]}</StatusBadge>
              <span className="reserva-chip">{CANAL_LABEL[reserva.canal]}</span>
              <span className="reserva-chip">{reserva.personas} personas</span>
              <span className="reserva-chip">{reserva.mesaNumero ? `Mesa ${reserva.mesaNumero}` : "Sin mesa"}</span>
              {reserva.depositoRequeridoCentavos > 0 ? (
                <StatusBadge tone={DEPOSITO_TONE[reserva.depositoEstado]}>Depósito {DEPOSITO_LABEL[reserva.depositoEstado]}</StatusBadge>
              ) : null}
            </div>
            <div className="reserva-entity__tiempos">
              <span title="= sentada − fecha y hora">Espera: {formatDuration(reserva.tiempos.esperaSeg)}</span>
              <span title="= finalizada − sentada">Duración de mesa: {formatDuration(reserva.tiempos.duracionMesaSeg)}</span>
              {reserva.notas ? <span title={reserva.notas}>Notas del cliente</span> : null}
            </div>
          </div>

          <div className="reserva-acciones">
            <Button
              variant="secondary"
              disabled={!puede.editar}
              title={tituloBoton(puede.editar, "reservas.editar")}
              onClick={() => setDialogo({ tipo: "editar" })}
            >
              <Pencil size={15} /> Editar
            </Button>
            <Button
              variant="secondary"
              disabled={!puede.reubicar || !reservaAdmiteReubicacion(reserva.estado)}
              title={tituloBoton(puede.reubicar, "reservas.reubicar", reservaAdmiteReubicacion(reserva.estado))}
              onClick={() => setDialogo({ tipo: "reubicar" })}
            >
              <CalendarClock size={15} /> Reubicar
            </Button>
            <Button
              variant="secondary"
              disabled={!puede.estado || !puedeSentarAhora}
              title={
                !puede.estado
                  ? "Requiere permiso de reservas.estado"
                  : !admiteLlegada
                    ? "La reserva ya no admite esta acción"
                    : !reserva.mesaId
                      ? "Asigna una mesa con «Reubicar» antes de sentar al cliente"
                      : undefined
              }
              onClick={() => setDialogo({ tipo: "sentar" })}
            >
              <DoorOpen size={15} /> Sentar
            </Button>
            <Button
              variant="secondary"
              disabled={!puede.estado || reserva.estado !== "sentada"}
              title={tituloBoton(puede.estado, "reservas.estado", reserva.estado === "sentada")}
              onClick={() => setDialogo({ tipo: "finalizar" })}
            >
              <LogOut size={15} /> Finalizar
            </Button>
            <Button
              variant="secondary"
              disabled={!puede.estado || (reserva.estado !== "solicitada" && reserva.estado !== "confirmada")}
              title={tituloBoton(puede.estado, "reservas.estado", reserva.estado === "solicitada" || reserva.estado === "confirmada")}
              onClick={() => setDialogo({ tipo: "no_show" })}
            >
              <UserX size={15} /> No-show
            </Button>
            <Button
              variant="secondary"
              disabled={!puede.cancelar || (reserva.estado !== "solicitada" && reserva.estado !== "confirmada")}
              title={tituloBoton(puede.cancelar, "reservas.cancelar", reserva.estado === "solicitada" || reserva.estado === "confirmada")}
              onClick={() => setDialogo({ tipo: "cancelar" })}
            >
              <Ban size={15} /> Cancelar
            </Button>
          </div>

          <Tabs tabs={tabs} value={tab} onChange={(id) => onTabChange(id as ReservaTab)} />

          <div className="reserva-tab">
            {tab === "resumen" ? <ResumenTab reserva={reserva} puedeVerPii={puede.verPii} /> : null}
            {tab === "bitacora" ? (
              <BitacoraReserva
                eventos={reserva.bitacora}
                tiempos={reserva.tiempos}
                puedeExportar={puede.exportar}
                exportando={exportar.isPending}
                onExportar={() =>
                  exportar.mutate(
                    { tipo: "bitacora_reserva", formato: "csv", reservaId: reserva.id },
                    {
                      onSuccess: () => mostrar("Exportación de bitácora registrada (en segundo plano).", "exito"),
                      onError: () => mostrar("No se pudo registrar la exportación.", "error"),
                    },
                  )
                }
              />
            ) : null}
            {tab === "deposito" ? (
              <DepositoTab
                reserva={reserva}
                puedeGestionar={puede.depositos}
                puedeReembolsar={puede.reembolsar}
                procesando={accion.isPending}
                onRegistrar={() => setDialogo({ tipo: "registrar_deposito" })}
                onReembolsar={() => setDialogo({ tipo: "reembolsar_deposito" })}
              />
            ) : null}
          </div>
        </>
      )}

      {reserva ? (
        <>
          <ReservaFormDrawer open={dialogo?.tipo === "editar"} reserva={reserva} onClose={() => setDialogo(null)} />

          <ReubicarDialog
            open={dialogo?.tipo === "reubicar"}
            reserva={reserva}
            zonaHoraria={reserva.zonaHoraria}
            pendiente={accion.isPending}
            onCancel={() => setDialogo(null)}
            onConfirm={(payload: ReubicarPayload) =>
              ejecutar(
                { accion: "reubicar", motivo: payload.motivo, fechaHora: payload.fechaHora, duracionMin: payload.duracionMin, mesaId: payload.mesaId ?? "" },
                "Reserva reubicada; el antes/después quedó en la bitácora.",
              )
            }
          />

          <ConfirmDialog
            open={dialogo?.tipo === "sentar"}
            title={`Sentar la mesa de ${reserva.codigo}`}
            description="Marca la llegada; la ocupación y los reportes se actualizan (RF-R5-44)."
            impacto={`Mesa ${reserva.mesaNumero ?? "sin asignar"} · ${reserva.personas} personas.`}
            motivoObligatorio={false}
            confirmLabel="Sentar"
            onCancel={() => setDialogo(null)}
            onConfirm={(motivo) => ejecutar({ accion: "sentar", motivo }, "Reserva sentada.")}
          />
          <ConfirmDialog
            open={dialogo?.tipo === "finalizar"}
            title={`Finalizar ${reserva.codigo}`}
            description="Se libera la mesa y se cierra la duración de mesa para reportes."
            motivoObligatorio={false}
            confirmLabel="Finalizar"
            onCancel={() => setDialogo(null)}
            onConfirm={(motivo) => ejecutar({ accion: "finalizar", motivo }, "Reserva finalizada; mesa liberada.")}
          />
          <ConfirmDialog
            open={dialogo?.tipo === "no_show"}
            title={`Marcar no-show en ${reserva.codigo}`}
            description="La reserva se cierra como no-show con hora y actor (RF-R5-44)."
            impacto="La mesa se libera; si hay depósito, se revisa con Caja (RN-R5-06)."
            confirmLabel="Marcar no-show"
            onCancel={() => setDialogo(null)}
            onConfirm={(motivo) => ejecutar({ accion: "no_show", motivo }, "No-show registrado y auditado.")}
          />
          <ConfirmDialog
            open={dialogo?.tipo === "cancelar"}
            title={`Cancelar ${reserva.codigo}`}
            description="La reserva no se borra: se cancela y conserva su bitácora (RN-R5-09)."
            impacto={`Presenta la cancelación a ${formatDateTime(reserva.fechaHora, reserva.zonaHoraria)} · ${reserva.personas} personas.`}
            confirmLabel="Cancelar reserva"
            onCancel={() => setDialogo(null)}
            onConfirm={(motivo) => ejecutar({ accion: "cancelar", motivo }, "Reserva cancelada y auditada.")}
          />
          <DepositoDialog
            open={dialogo?.tipo === "registrar_deposito" || dialogo?.tipo === "reembolsar_deposito"}
            tipo={dialogo?.tipo === "reembolsar_deposito" ? "reembolso" : "cobro"}
            maxCentavos={
              dialogo?.tipo === "reembolsar_deposito"
                ? reserva.deposito.pagadoCentavos
                : Math.max(0, reserva.deposito.requeridoCentavos - reserva.deposito.pagadoCentavos)
            }
            pendiente={accion.isPending}
            onCancel={() => setDialogo(null)}
            onConfirm={(montoCentavos, motivo) =>
              ejecutar(
                dialogo?.tipo === "reembolsar_deposito"
                  ? { accion: "reembolsar_deposito", motivo, montoCentavos }
                  : { accion: "registrar_deposito", motivo, montoCentavos },
                dialogo?.tipo === "reembolsar_deposito"
                  ? "Reembolso registrado; queda pendiente de conciliar con Caja."
                  : "Depósito registrado; queda pendiente de conciliar con Caja.",
              )
            }
          />
        </>
      ) : null}
    </Drawer>
  )
}

function DepositoDialog({
  open,
  tipo,
  maxCentavos,
  pendiente,
  onCancel,
  onConfirm,
}: {
  open: boolean
  tipo: "cobro" | "reembolso"
  maxCentavos: number
  pendiente: boolean
  onCancel: () => void
  onConfirm: (montoCentavos: number, motivo: string) => void
}) {
  const [monto, setMonto] = useState("")
  const [motivo, setMotivo] = useState("")

  useEffect(() => {
    if (open) {
      setMonto((maxCentavos / 100).toFixed(2))
      setMotivo("")
    }
  }, [open, maxCentavos])

  if (!open) return null

  const montoCentavos = Math.round((Number(monto) || 0) * 100)
  const bloqueado = motivo.trim().length < 3 || montoCentavos <= 0 || montoCentavos > maxCentavos || pendiente
  const esReembolso = tipo === "reembolso"

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onCancel} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={esReembolso ? "Reembolsar depósito" : "Registrar depósito"}>
        <div className="modal__header">
          <span className="modal__icon">
            {esReembolso ? <Undo2 size={18} /> : <CreditCard size={18} />}
          </span>
          <div>
            <strong>{esReembolso ? "Reembolsar depósito" : "Registrar depósito"}</strong>
            <p>
              {esReembolso
                ? `Máximo reembolsable: ${formatMoney(maxCentavos)}. Exige permiso y motivo (RN-R5-06).`
                : `Saldo pendiente: ${formatMoney(maxCentavos)}. Se envía a Caja para su conciliación.`}
            </p>
          </div>
        </div>
        <div className="modal__body">
          <TextField
            label="Monto (MXN)"
            type="number"
            min="0"
            step="0.01"
            value={monto}
            onChange={(event) => setMonto(event.target.value)}
            hint={montoCentavos > maxCentavos ? "El monto supera el máximo permitido" : undefined}
          />
          <TextareaField
            label="Motivo (obligatorio)"
            placeholder={esReembolso ? "Causa del reembolso" : "Referencia del cobro"}
            rows={3}
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
          />
          <p className="modal__note">La operación queda auditada y enlazada con la bitácora de la reserva.</p>
        </div>
        <div className="modal__footer">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={bloqueado} onClick={() => onConfirm(montoCentavos, motivo.trim())}>
            {pendiente ? "Registrando…" : esReembolso ? "Reembolsar" : "Registrar"}
          </Button>
        </div>
      </div>
    </>
  )
}
