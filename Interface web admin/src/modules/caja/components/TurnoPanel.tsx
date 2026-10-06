import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Lock, Undo2 } from "lucide-react"
import { PageHeader } from "@/components/data/PageHeader"
import { Tabs } from "@/components/data/Tabs"
import { Button } from "@/components/ui/Button"
import { ErrorState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { formatDateTime } from "@/lib/format"
import { useSocketEvent } from "@/lib/realtime"
import { useAuth } from "@/app/auth"
import { useTurnoDetalle } from "@/modules/caja/api"
import { ArqueoPanel } from "@/modules/caja/components/ArqueoPanel"
import { CierreDialog } from "@/modules/caja/components/CierreDialog"
import { ReabrirDialog } from "@/modules/caja/components/ReabrirDialog"
import { ReporteCierre } from "@/modules/caja/components/ReporteCierre"
import { ResumenTab } from "@/modules/caja/components/ResumenTab"

const VISTAS = ["resumen", "arqueo", "reporte"] as const

/** Panel del turno (`/caja/:turnoId`): resumen, arqueo y cierre, y reporte. */
export function TurnoPanel({ turnoId }: { turnoId: string }) {
  const { tienePermiso } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [cierreOpen, setCierreOpen] = useState(false)
  const [reabrirOpen, setReabrirOpen] = useState(false)

  const { data: turno, isLoading, isError, error, refetch } = useTurnoDetalle(turnoId)

  useSocketEvent(["caja.turno", "pago.estado"], () => {
    void queryClient.invalidateQueries({ queryKey: ["caja"] })
  })

  const vistaParam = searchParams.get("vista") ?? "resumen"
  const vista = (VISTAS as readonly string[]).includes(vistaParam) ? vistaParam : "resumen"

  const cambiarVista = (id: string) => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.set("vista", id)
    setSearchParams(siguiente, { replace: true })
  }

  if (isError) {
    return (
      <div className="module-page">
        <PageHeader eyebrow="Dinero / Caja" title="Panel del turno" />
        <ErrorState
          title="No pudimos cargar el turno"
          description={(error as Error)?.message ?? "Revisa tu conexión e inténtalo de nuevo."}
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  if (isLoading || !turno) {
    return (
      <div className="module-page">
        <PageHeader eyebrow="Dinero / Caja" title="Panel del turno" subtitle="Cargando el turno…" />
        <section className="panel">
          <SkeletonRows rows={6} columns={5} />
        </section>
      </div>
    )
  }

  const puedeCerrar = tienePermiso("caja.cerrar")
  const puedeReabrir = tienePermiso("caja.reabrir")

  return (
    <div className="module-page">
      <PageHeader
        eyebrow={
          <Link className="text-action" to="/caja">
            <ArrowLeft size={13} /> Caja y turnos
          </Link>
        }
        title={`Turno ${turno.numero}`}
        subtitle={
          <>
            {turno.sucursalNombre} · apertura {formatDateTime(turno.abiertoEn, turno.zonaHoraria)}
            {turno.cerradoEn ? ` · cierre ${formatDateTime(turno.cerradoEn, turno.zonaHoraria)}` : " · en curso"}
          </>
        }
        actions={
          <>
            <span className={`status status--${turno.estadoTone}`}>
              {turno.estado === "abierto" ? "Abierto" : "Cerrado"}
            </span>
            {turno.estado === "abierto" ? (
              <Button
                variant="primary"
                disabled={!puedeCerrar || turno.arqueo === null}
                title={
                  !puedeCerrar
                    ? "Requiere permiso de caja.cerrar"
                    : turno.arqueo === null
                      ? "Guarda el arqueo antes de cerrar"
                      : undefined
                }
                onClick={() => setCierreOpen(true)}
              >
                <Lock size={15} /> Cerrar turno
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled={!puedeReabrir}
                title={puedeReabrir ? undefined : "Requiere permiso de caja.reabrir"}
                onClick={() => setReabrirOpen(true)}
              >
                <Undo2 size={15} /> Reabrir turno
              </Button>
            )}
          </>
        }
      />

      {turno.reabiertoPor ? (
        <div className="caja-alerta caja-alerta--warning">
          <Undo2 size={17} aria-hidden="true" />
          <div>
            <strong>
              Turno reabierto por {turno.reabiertoPor}
              {turno.reabiertoEn ? ` el ${formatDateTime(turno.reabiertoEn, turno.zonaHoraria)}` : ""}
            </strong>
            <span>Motivo: {turno.reabiertoMotivo ?? "—"}. El cierre anterior se conserva como rastro.</span>
          </div>
        </div>
      ) : null}

      {turno.estado === "cerrado" ? (
        <div className="caja-alerta caja-alerta--info">
          <Lock size={17} aria-hidden="true" />
          <div>
            <strong>Turno cerrado</strong>
            <span>
              Un turno cerrado no se modifica: para recalcular el arqueo primero hay que reabrirlo con motivo.
            </span>
          </div>
        </div>
      ) : null}

      <Tabs
        tabs={[
          { id: "resumen", label: "Resumen" },
          { id: "arqueo", label: "Arqueo y cierre" },
          { id: "reporte", label: "Reporte" },
        ]}
        value={vista}
        onChange={cambiarVista}
      />

      {vista === "arqueo" ? (
        <ArqueoPanel turno={turno} puedeCerrar={puedeCerrar} onSolicitarCierre={() => setCierreOpen(true)} />
      ) : vista === "reporte" ? (
        <ReporteCierre turno={turno} puedeExportar={tienePermiso("caja.exportar")} />
      ) : (
        <ResumenTab turno={turno} />
      )}

      <CierreDialog
        open={cierreOpen}
        turno={turno}
        onCancel={() => setCierreOpen(false)}
        onCerrado={() => {
          setCierreOpen(false)
          void queryClient.invalidateQueries({ queryKey: ["caja"] })
          void refetch()
        }}
      />
      <ReabrirDialog
        open={reabrirOpen}
        turno={turno}
        onCancel={() => setReabrirOpen(false)}
        onReabierto={() => {
          setReabrirOpen(false)
          void queryClient.invalidateQueries({ queryKey: ["caja"] })
          void refetch()
          navigate(`/caja/${turno.id}?vista=arqueo`)
        }}
      />
    </div>
  )
}
