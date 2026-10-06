import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Pause, Play, Plus } from "lucide-react"
import { PageHeader } from "@/components/data/PageHeader"
import { Button } from "@/components/ui/Button"
import { ErrorState } from "@/components/ui/states"
import { SkeletonCards, SkeletonRows } from "@/components/ui/Skeleton"
import { useToast } from "@/components/ui/toast"
import { useSocketEvent } from "@/lib/realtime"
import { useEnVivoResumen } from "@/modules/en-vivo/api"
import { KpisRow } from "@/modules/en-vivo/components/KpisRow"
import { OrdersPanel } from "@/modules/en-vivo/components/OrdersPanel"
import { DiningRoomPanel } from "@/modules/en-vivo/components/DiningRoomPanel"
import { AlertsPanel } from "@/modules/en-vivo/components/AlertsPanel"
import { ReservationsPanel } from "@/modules/en-vivo/components/ReservationsPanel"

function useClock(activo: boolean): Date {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    if (!activo) return
    const timer = setInterval(() => setAhora(new Date()), 1_000)
    return () => clearInterval(timer)
  }, [activo])
  return ahora
}

export default function EnVivoPage() {
  const [pausado, setPausado] = useState(false)
  const { data, isLoading, isError, refetch } = useEnVivoResumen(pausado)
  const queryClient = useQueryClient()
  const { mostrar } = useToast()
  const ahora = useClock(!pausado)

  useSocketEvent(
    ["pedido.creado", "pedido.estado", "comanda.estado", "alerta.creada"],
    () => {
      void queryClient.invalidateQueries({ queryKey: ["en-vivo"] })
      void queryClient.invalidateQueries({ queryKey: ["alertas"] })
    },
  )

  const actualizado = ahora.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  return (
    <div className="module-page">
      <PageHeader
        eyebrow="Operación / En vivo"
        title="En vivo"
        subtitle="Una vista clara de lo que está pasando ahora en tu restaurante."
        actions={
          <>
            <div className={`live-status ${pausado ? "live-status--paused" : ""}`}>
              <span className="live-dot" />
              <div>
                <strong>{pausado ? "Actualización pausada" : "En vivo"}</strong>
                <small>Actualizado {actualizado}</small>
              </div>
            </div>
            <Button variant="secondary" onClick={() => setPausado((value) => !value)}>
              {pausado ? <Play size={15} /> : <Pause size={15} />}
              {pausado ? "Reanudar" : "Pausar"}
            </Button>
            <Button
              variant="primary"
              onClick={() => mostrar("Nuevo pedido: el alta se implementa con el módulo Pedidos")}
            >
              <Plus size={17} /> Nuevo pedido
            </Button>
          </>
        }
      />

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <>
          {isLoading || !data ? (
            <SkeletonCards count={5} />
          ) : (
            <KpisRow kpis={data.kpis} />
          )}

          {isLoading || !data ? (
            <div className="dashboard-grid">
              <section className="panel orders-panel">
                <SkeletonRows rows={4} columns={5} />
              </section>
              <section className="panel dining-panel">
                <SkeletonRows rows={3} columns={4} />
              </section>
            </div>
          ) : (
            <div className="dashboard-grid">
              <OrdersPanel pedidos={data.pedidosActivos} />
              <DiningRoomPanel salon={data.salon} />
              <AlertsPanel />
              <ReservationsPanel llegadas={data.proximasLlegadas} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
