import { useMemo } from "react"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { Skeleton } from "@/components/ui/Skeleton"
import { calcularSemaforo, transcurridoEnVivo } from "@/modules/comandas/api"
import { ComandaCard } from "@/modules/comandas/components/ComandaCard"
import type { ComandaMonitor, Semaforo } from "@/modules/comandas/types"

const ORDEN_SEMAFORO: Record<Semaforo, number> = { vencida: 0, por_vencer: 1, normal: 2 }

function peso(comanda: ComandaMonitor, ahoraMs: number): { semaforo: Semaforo; transcurrido: number } {
  const transcurrido = transcurridoEnVivo(comanda, ahoraMs)
  return { semaforo: calcularSemaforo(comanda.estado, transcurrido, comanda.objetivoSeg), transcurrido }
}

/** Tablero por estación (o vista unificada de expedidor) reutilizable. */
export function EstacionBoard({
  comandas,
  ahoraMs,
  mostrarEstacion,
  loading,
  error,
  onRetry,
  onOpen,
  emptyTitle = "Sin comandas en esta vista",
  emptyDescription = "Cuando el KDS envíe comandas a la estación aparecerán aquí.",
}: {
  comandas: ComandaMonitor[]
  ahoraMs: number
  mostrarEstacion: boolean
  loading?: boolean
  error?: Error | null
  onRetry?: () => void
  onOpen: (comanda: ComandaMonitor) => void
  emptyTitle?: string
  emptyDescription?: string
}) {
  const ordenadas = useMemo(() => {
    return [...comandas].sort((a, b) => {
      const pa = peso(a, ahoraMs)
      const pb = peso(b, ahoraMs)
      if (ORDEN_SEMAFORO[pa.semaforo] !== ORDEN_SEMAFORO[pb.semaforo]) {
        return ORDEN_SEMAFORO[pa.semaforo] - ORDEN_SEMAFORO[pb.semaforo]
      }
      if (a.prioridad !== b.prioridad) return a.prioridad === "urgente" ? -1 : 1
      return pb.transcurrido - pa.transcurrido
    })
  }, [comandas, ahoraMs])

  if (error) return <ErrorState onRetry={onRetry} />
  if (loading) {
    return (
      <div className="comandas-board" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="comanda-card comanda-card--skeleton" key={index}>
            <Skeleton height={16} width="55%" />
            <Skeleton height={11} width="80%" />
            <Skeleton height={22} width="45%" />
            <Skeleton height={11} width="65%" />
          </div>
        ))}
      </div>
    )
  }
  if (ordenadas.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <>
      <div className="comandas-legend" aria-label="Semáforo de SLA">
        <span className="comandas-legend__item">
          <i className="comandas-legend__dot comandas-legend__dot--normal" /> En tiempo
        </span>
        <span className="comandas-legend__item">
          <i className="comandas-legend__dot comandas-legend__dot--por_vencer" /> Por vencer
        </span>
        <span className="comandas-legend__item">
          <i className="comandas-legend__dot comandas-legend__dot--vencida" /> Vencida
        </span>
        <span className="comandas-legend__count">
          {ordenadas.length} {ordenadas.length === 1 ? "comanda" : "comandas"}
        </span>
      </div>
      <div className="comandas-board">
        {ordenadas.map((comanda) => (
          <ComandaCard
            key={comanda.id}
            comanda={comanda}
            ahoraMs={ahoraMs}
            mostrarEstacion={mostrarEstacion}
            onOpen={() => onOpen(comanda)}
          />
        ))}
      </div>
    </>
  )
}
