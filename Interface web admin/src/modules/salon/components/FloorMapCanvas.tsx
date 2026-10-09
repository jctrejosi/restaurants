import type { DragEvent } from "react"
import { CELDA, type Mesa, type UnionMesa, type Zona } from "@/modules/salon/types"
import { TableShape } from "@/modules/salon/components/TableShape"
import { ZoneOverlay } from "@/modules/salon/components/ZoneOverlay"

/**
 * Lienzo del salón sobre un grid: zonas como fondos y mesas posicionadas por
 * celda. En modo edición admite arrastre y flechas (RNF-R5-07); en «preview»
 * es solo lectura y reutiliza el mismo render.
 */
export function FloorMapCanvas({
  zonas,
  mesas,
  uniones = [],
  seleccion,
  modo,
  onSeleccion,
  onMover,
  onAbrir,
}: {
  zonas: Zona[]
  mesas: Mesa[]
  uniones?: UnionMesa[]
  seleccion: string[]
  modo: "editar" | "preview"
  onSeleccion?: (mesa: Mesa, aditivo: boolean) => void
  onMover?: (mesaId: string, posX: number, posY: number) => void
  /** En modo preview, abre el detalle de la mesa. */
  onAbrir?: (mesa: Mesa) => void
}) {
  const columnas = Math.max(16, ...zonas.map((zona) => zona.x + zona.ancho))
  const filas = Math.max(10, ...zonas.map((zona) => zona.y + zona.alto))

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (modo !== "editar" || !onMover) return
    const id = event.dataTransfer.getData("text/plain")
    if (!id) return
    const rect = event.currentTarget.getBoundingClientRect()
    const posX = Math.max(0, Math.min(columnas - 1, Math.floor((event.clientX - rect.left) / CELDA)))
    const posY = Math.max(0, Math.min(filas - 1, Math.floor((event.clientY - rect.top) / CELDA)))
    onMover(id, posX, posY)
  }

  const mesasPorId = new Map(mesas.map((mesa) => [mesa.id, mesa]))
  const unidas = new Set(uniones.flatMap((union) => union.mesaIds))

  return (
    <div
      className={`salon-canvas ${modo === "preview" ? "salon-canvas--preview" : ""}`}
      style={{ width: columnas * CELDA, height: filas * CELDA }}
      onDragOver={(event) => {
        if (modo === "editar") event.preventDefault()
      }}
      onDrop={onDrop}
    >
      {zonas.map((zona) => (
        <ZoneOverlay key={zona.id} zona={zona} mesas={mesas} />
      ))}

      {uniones.map((union) => {
        const miembros = union.mesaIds.map((id) => mesasPorId.get(id)).filter((mesa): mesa is Mesa => Boolean(mesa))
        if (miembros.length < 2) return null
        const minX = Math.min(...miembros.map((mesa) => mesa.posX)) - 0.9
        const maxX = Math.max(...miembros.map((mesa) => mesa.posX)) + 0.9
        const minY = Math.min(...miembros.map((mesa) => mesa.posY)) - 0.9
        const maxY = Math.max(...miembros.map((mesa) => mesa.posY)) + 0.9
        return (
          <div
            className="salon-union"
            key={union.id}
            style={{
              left: minX * CELDA,
              top: minY * CELDA,
              width: (maxX - minX) * CELDA,
              height: (maxY - minY) * CELDA,
            }}
          >
            <span>{union.nombre}</span>
          </div>
        )
      })}

      {mesas.map((mesa) => (
        <TableShape
          key={mesa.id}
          mesa={mesa}
          seleccionada={seleccion.includes(mesa.id)}
          unida={unidas.has(mesa.id)}
          modo={modo}
          onSeleccion={onSeleccion}
          onAbrir={onAbrir}
          onMover={modo === "editar" ? onMover : undefined}
          onDragStart={
            modo === "editar"
              ? (event, origen) => {
                  event.dataTransfer.setData("text/plain", origen.id)
                  event.dataTransfer.effectAllowed = "move"
                }
              : undefined
          }
        />
      ))}
    </div>
  )
}
