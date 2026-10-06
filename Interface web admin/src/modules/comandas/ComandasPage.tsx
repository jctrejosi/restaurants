import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { PageHeader } from "@/components/data/PageHeader"
import { FilterBar } from "@/components/data/FilterBar"
import { Tabs } from "@/components/data/Tabs"
import { Button } from "@/components/ui/Button"
import { SelectField } from "@/components/ui/fields"
import { NoPermissionState } from "@/components/ui/states"
import { useToast } from "@/components/ui/toast"
import { useSocketEvent } from "@/lib/realtime"
import { formatRelative } from "@/lib/format"
import { useAuth } from "@/app/auth"
import {
  ESTACIONES,
  TURNOS,
  useComandasMonitor,
  useExcepciones,
} from "@/modules/comandas/api"
import { EstacionBoard } from "@/modules/comandas/components/EstacionBoard"
import { HistorialPanel } from "@/modules/comandas/components/HistorialPanel"
import { ExcepcionesPanel } from "@/modules/comandas/components/ExcepcionesPanel"
import { ComandaDetalleDrawer } from "@/modules/comandas/components/ComandaDetalleDrawer"
import { ESTADO_LABEL, type ComandaEstado } from "@/modules/comandas/types"
import "@/modules/comandas/comandas.css"

const ESTADOS: ComandaEstado[] = [
  "pendiente",
  "impresa",
  "en_preparacion",
  "lista",
  "entregada",
  "anulada",
]

type Ambito = "estacion" | "expedidor"

function useClock(activo: boolean): Date {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    if (!activo) return
    const timer = setInterval(() => setAhora(new Date()), 1_000)
    return () => clearInterval(timer)
  }, [activo])
  return ahora
}

export default function ComandasPage() {
  const { tienePermiso } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { mostrar } = useToast()
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const ahora = useClock(true)

  const tab = searchParams.get("vista") ?? "monitor"
  const ambito: Ambito = searchParams.get("ambito") === "expedidor" ? "expedidor" : "estacion"
  const estado = searchParams.get("estado") ?? ""
  const turnoId = searchParams.get("turno") ?? ""
  const estacionParam = searchParams.get("estacion") ?? ""
  const estacionId = estacionParam || ESTACIONES[0].id

  /* La estación y los filtros viven en la URL (compartibles, plan 04 §3). */
  useEffect(() => {
    if (ambito === "estacion" && !searchParams.get("estacion")) {
      const next = new URLSearchParams(searchParams)
      next.set("estacion", ESTACIONES[0].id)
      setSearchParams(next, { replace: true })
    }
  }, [ambito, searchParams, setSearchParams])

  const filtros = useMemo(
    () => ({
      estacionId: ambito === "estacion" ? estacionId : undefined,
      estado: estado || undefined,
      turnoId: turnoId || undefined,
      vista: ambito,
    }),
    [ambito, estacionId, estado, turnoId],
  )

  const { data, isLoading, isError, refetch } = useComandasMonitor(filtros)
  const { data: excepciones } = useExcepciones()

  useSocketEvent(
    ["comanda.creada", "comanda.estado", "impresion.estado", "alerta.creada", "disponibilidad.actualizada"],
    () => {
      void queryClient.invalidateQueries({ queryKey: ["comandas"] })
    },
  )

  if (!tienePermiso("comandas.ver")) {
    return (
      <div className="module-page">
        <PageHeader eyebrow="Operación" title="Comandas" />
        <NoPermissionState permiso="comandas.ver" />
      </div>
    )
  }

  const actualizar = (clave: string, valor: string) => {
    const next = new URLSearchParams(searchParams)
    if (valor) next.set(clave, valor)
    else next.delete(clave)
    setSearchParams(next, { replace: true })
  }

  const limpiar = () => {
    const next = new URLSearchParams(searchParams)
    next.delete("estado")
    next.delete("turno")
    setSearchParams(next, { replace: true })
  }

  const abrirComanda = (comandaId: string) => {
    navigate({ pathname: `/comandas/${comandaId}`, search: searchParams.toString() })
  }

  const cerrarDrawer = () => {
    navigate({ pathname: "/comandas", search: searchParams.toString() })
  }

  const verAuditoria = (auditoriaId: string, etiqueta: string) => {
    mostrar(`Auditoría de ${etiqueta}: se abre en el visor de Auditoría (${auditoriaId})`)
  }

  const estaciones = data?.estaciones ?? ESTACIONES
  const estacionNombre = estaciones.find((estacion) => estacion.id === estacionId)?.nombre ?? "—"

  const filtrosActivos: { key: string; label: string }[] = []
  if (ambito === "expedidor") filtrosActivos.push({ key: "ambito", label: "Vista unificada (expedidor)" })
  if (estado) filtrosActivos.push({ key: "estado", label: ESTADO_LABEL[estado as ComandaEstado] ?? estado })
  if (turnoId) {
    filtrosActivos.push({ key: "turno", label: TURNOS.find((turno) => turno.id === turnoId)?.nombre ?? turnoId })
  }

  const hora = ahora.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })

  const tabs = [
    { id: "monitor", label: "Monitor" },
    { id: "sla", label: "SLA del turno" },
    {
      id: "excepciones",
      label: "Excepciones",
      badge: excepciones ? String(excepciones.excepciones.length) : undefined,
    },
  ]

  return (
    <div className="module-page">
      <PageHeader
        eyebrow="Operación / Comandas"
        title="Comandas"
        subtitle="Monitor por estación con SLA, historial del turno y excepciones."
        actions={
          <>
            <div className="live-status">
              <span className="live-dot" />
              <div>
                <strong>En vivo</strong>
                <small>Actualizado {hora}</small>
              </div>
            </div>
            <Button variant="secondary" onClick={() => void refetch()}>
              <RefreshCw size={15} /> Actualizar
            </Button>
          </>
        }
      />

      <div className="module-notice" role="note">
        <AlertTriangle size={18} aria-hidden="true" />
        <span>
          <strong>El KDS es la interfaz de operación.</strong> Aquí se observa el servicio y se
          corrigen excepciones; para cocinar o avanzar estados, usa el KDS o la app de cocina.
        </span>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={(id) => actualizar("vista", id)} />

      {tab === "sla" ? (
        <HistorialPanel turnoId={turnoId || undefined} onOpenComanda={abrirComanda} />
      ) : tab === "excepciones" ? (
        <ExcepcionesPanel onVerAuditoria={verAuditoria} />
      ) : (
        <>
          <FilterBar activeFilters={filtrosActivos} onClear={limpiar}>
            <SelectField
              label="Ámbito"
              value={ambito}
              onChange={(event) => actualizar("ambito", event.target.value)}
              options={[
                { value: "estacion", label: "Por estación" },
                { value: "expedidor", label: "Vista unificada (expedidor)" },
              ]}
            />
            <SelectField
              label="Estación"
              value={estacionId}
              disabled={ambito === "expedidor"}
              onChange={(event) => actualizar("estacion", event.target.value)}
              options={estaciones.map((estacion) => ({ value: estacion.id, label: estacion.nombre }))}
            />
            <SelectField
              label="Estado"
              placeholder="Todos"
              value={estado}
              onChange={(event) => actualizar("estado", event.target.value)}
              options={ESTADOS.map((valor) => ({ value: valor, label: ESTADO_LABEL[valor] }))}
            />
            <SelectField
              label="Turno"
              placeholder="Turno actual"
              value={turnoId}
              onChange={(event) => actualizar("turno", event.target.value)}
              options={TURNOS.map((turno) => ({ value: turno.id, label: turno.nombre }))}
            />
          </FilterBar>

          <section className="panel comandas-panel">
            <div className="panel__header">
              <div>
                <div className="panel__title">
                  {ambito === "expedidor" ? "Vista unificada de expedidor" : `Estación ${estacionNombre}`}
                </div>
                <div className="panel__subtitle">
                  {data
                    ? `${data.resumen.enPreparacion} en preparación · ${data.resumen.porVencer} por vencer · ${data.resumen.vencidas} vencidas`
                    : "Monitor por estación · tiempos del servidor"}
                </div>
              </div>
              <span className="comandas-panel__updated">
                {data ? `Actualizado ${formatRelative(data.actualizadoEn, ahora)}` : "—"}
              </span>
            </div>
            <div className="comandas-panel__body">
              <EstacionBoard
                comandas={data?.comandas ?? []}
                ahoraMs={ahora.getTime()}
                mostrarEstacion={ambito === "expedidor"}
                loading={isLoading}
                error={isError ? new Error("No se pudo cargar el monitor de comandas") : null}
                onRetry={() => void refetch()}
                onOpen={(comanda) => abrirComanda(comanda.id)}
                emptyTitle={
                  ambito === "expedidor" ? "Sin comandas activas" : `Sin comandas en ${estacionNombre}`
                }
                emptyDescription="Cuando el KDS envíe comandas a esta estación aparecerán aquí."
              />
            </div>
          </section>
        </>
      )}

      <ComandaDetalleDrawer
        comandaId={id ?? null}
        estaciones={estaciones}
        onClose={cerrarDrawer}
        onVerAuditoria={verAuditoria}
      />
    </div>
  )
}
