import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { CalendarPlus, Plus } from "lucide-react"
import { PageHeader } from "@/components/data/PageHeader"
import { Button } from "@/components/ui/Button"
import { ErrorState } from "@/components/ui/states"
import { SkeletonCards, SkeletonRows } from "@/components/ui/Skeleton"
import { useSocketEvent } from "@/lib/realtime"
import { useEnVivoResumen } from "@/modules/en-vivo/api"
import { KpisRow } from "@/modules/en-vivo/components/KpisRow"
import { OrdersPanel } from "@/modules/en-vivo/components/OrdersPanel"
import { SalonMapPanel } from "@/modules/en-vivo/components/SalonMapPanel"
import { AlertsPanel } from "@/modules/en-vivo/components/AlertsPanel"
import { ReservationsPanel } from "@/modules/en-vivo/components/ReservationsPanel"

function useClock(): Date {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setAhora(new Date()), 1_000)
    return () => clearInterval(timer)
  }, [])
  return ahora
}

export default function EnVivoPage() {
  const { data, isLoading, isError, refetch } = useEnVivoResumen()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const ahora = useClock()

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
            <div className="live-status">
              <span className="live-dot" />
              <div>
                <strong>En vivo</strong>
                <small>Actualizado {actualizado}</small>
              </div>
            </div>
            <Button variant="secondary" onClick={() => navigate("/reservas?nueva=1")}>
              <CalendarPlus size={16} /> Nueva reserva
            </Button>
            <Button variant="primary" onClick={() => navigate("/tomar-pedido")}>
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

          <SalonMapPanel />

          {isLoading || !data ? (
            <div className="dashboard-grid">
              <section className="panel orders-panel">
                <SkeletonRows rows={4} columns={5} />
              </section>
            </div>
          ) : (
            <div className="dashboard-grid">
              <OrdersPanel pedidos={data.pedidosActivos} />
              <AlertsPanel />
              <ReservationsPanel llegadas={data.proximasLlegadas} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
