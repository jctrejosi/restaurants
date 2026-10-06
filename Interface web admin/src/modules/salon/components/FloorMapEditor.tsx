import { useEffect, useMemo, useState } from "react"
import { AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter, Armchair, Download, Eye, Layers, Link2, Plus, Save, X } from "lucide-react"
import { useAuth } from "@/app/auth"
import { Button } from "@/components/ui/Button"
import { IconButton } from "@/components/ui/IconButton"
import { useToast } from "@/components/ui/toast"
import { usePopover } from "@/components/ui/usePopover"
import { ApiError } from "@/lib/api"
import { useGuardarMapa, useUnirMesas } from "@/modules/salon/api"
import { FloorMapCanvas } from "@/modules/salon/components/FloorMapCanvas"
import { TableInspector } from "@/modules/salon/components/TableInspector"
import { ZonaForm } from "@/modules/salon/components/ZonaForm"
import { MESA_ESTADO_LABEL, type Mesa, type SalonMapa, type Zona } from "@/modules/salon/types"

type Inspector = { modo: "editar"; mesaId: string } | { modo: "crear"; zonaId?: string } | null

/** Editor del mapa: arrastre por grid, alineación, inspector y guardado por lote. */
export function FloorMapEditor({
  mapa,
  onPreview,
  onExportar,
  exportando,
  onCambiosSinGuardar,
}: {
  mapa: SalonMapa
  onPreview: () => void
  onExportar: (formato: "pdf" | "png" | "csv") => void
  exportando: boolean
  onCambiosSinGuardar: (count: number) => void
}) {
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const guardar = useGuardarMapa(mapa.sedeId)
  const unir = useUnirMesas()
  const menuExport = usePopover<HTMLDivElement>()

  const puedeMapa = tienePermiso("salon.mapa")
  const puedeMesas = tienePermiso("salon.mesas")
  const puedeUniones = tienePermiso("salon.uniones")

  const [seleccion, setSeleccion] = useState<string[]>([])
  const [cambios, setCambios] = useState<Record<string, { posX: number; posY: number }>>({})
  const [inspector, setInspector] = useState<Inspector>(null)
  const [zonaForm, setZonaForm] = useState<{ zona?: Zona | null } | null>(null)

  const totalCambios = Object.keys(cambios).length
  useEffect(() => {
    onCambiosSinGuardar(totalCambios)
  }, [totalCambios, onCambiosSinGuardar])

  const mesaSeleccionada = inspector?.modo === "editar" ? (mapa.mesas.find((mesa) => mesa.id === inspector.mesaId) ?? null) : null

  const zonas = mapa.zonas
  const mesasConCambios = useMemo(
    () => mapa.mesas.map((mesa) => (cambios[mesa.id] ? { ...mesa, ...cambios[mesa.id] } : mesa)),
    [mapa.mesas, cambios],
  )

  const mover = (mesaId: string, posX: number, posY: number) => {
    if (!puedeMapa) {
      mostrar("Requiere permiso de salon.mapa para mover mesas.", "error")
      return
    }
    const mesa = mapa.mesas.find((item) => item.id === mesaId)
    if (!mesa) return
    const zona = zonas.find((item) => item.id === mesa.zonaId)
    const dentro = zona && posX >= zona.x && posX <= zona.x + zona.ancho - 1 && posY >= zona.y && posY <= zona.y + zona.alto - 1
    if (!dentro) {
      mostrar(`La mesa debe quedar dentro de «${zona?.nombre ?? "su zona"}».`, "error")
      return
    }
    if (posX === mesa.posX && posY === mesa.posY) {
      setCambios((actual) => {
        const siguiente = { ...actual }
        delete siguiente[mesaId]
        return siguiente
      })
      return
    }
    setCambios((actual) => ({ ...actual, [mesaId]: { posX, posY } }))
  }

  const seleccionar = (mesa: Mesa, aditivo: boolean) => {
    setSeleccion((actual) => {
      if (!aditivo) return [mesa.id]
      return actual.includes(mesa.id) ? actual.filter((id) => id !== mesa.id) : [...actual, mesa.id]
    })
    setInspector({ modo: "editar", mesaId: mesa.id })
  }

  const alinear = (eje: "x" | "y") => {
    if (seleccion.length < 2) return
    const primero = mapa.mesas.find((mesa) => mesa.id === seleccion[0])
    if (!primero) return
    const siguientes = { ...cambios }
    let fuera = 0
    for (const id of seleccion.slice(1)) {
      const mesa = mapa.mesas.find((item) => item.id === id)
      if (!mesa) continue
      const posX = eje === "x" ? primero.posX : mesa.posX
      const posY = eje === "y" ? primero.posY : mesa.posY
      const zona = zonas.find((item) => item.id === mesa.zonaId)
      const dentro = zona && posX >= zona.x && posX <= zona.x + zona.ancho - 1 && posY >= zona.y && posY <= zona.y + zona.alto - 1
      if (!dentro) {
        fuera += 1
        continue
      }
      siguientes[id] = { posX, posY }
    }
    setCambios(siguientes)
    if (fuera > 0) mostrar(`${fuera} mesa(s) no se pudieron alinear sin salir de su zona.`, "error")
  }

  const guardarCambios = () => {
    const lista = Object.entries(cambios).map(([id, posicion]) => ({ id, ...posicion }))
    if (lista.length === 0) return
    guardar.mutate(lista, {
      onSuccess: () => {
        mostrar("Posiciones guardadas y auditadas.", "exito")
        setCambios({})
      },
      onError: (error) => mostrar(error instanceof ApiError ? error.message : "No se pudieron guardar las posiciones.", "error"),
    })
  }

  const unirSeleccionadas = () => {
    if (seleccion.length < 2) return
    unir.mutate(
      { mesaIds: seleccion },
      {
        onSuccess: (union) => {
          mostrar(`Unión «${union.nombre}» guardada (V1).`, "exito")
          setSeleccion([])
        },
        onError: (error) => mostrar(error instanceof ApiError ? error.message : "No se pudieron unir las mesas.", "error"),
      },
    )
  }

  return (
    <div className="salon-editor">
      <div className="salon-editor__toolbar">
        <Button variant="secondary" disabled={!puedeMesas} onClick={() => setZonaForm({})}>
          <Layers size={15} /> Agregar zona
        </Button>
        <Button
          variant="secondary"
          disabled={!puedeMesas}
          onClick={() =>
            setInspector({
              modo: "crear",
              zonaId: mesaSeleccionada?.zonaId ?? zonas[0]?.id,
            })
          }
        >
          <Armchair size={15} /> Agregar mesa
        </Button>
        <Button variant="ghost" className="text-action" disabled={seleccion.length < 2} onClick={() => alinear("x")}>
          <AlignVerticalJustifyCenter size={14} /> Alinear columnas
        </Button>
        <Button variant="ghost" className="text-action" disabled={seleccion.length < 2} onClick={() => alinear("y")}>
          <AlignHorizontalJustifyCenter size={14} /> Alinear filas
        </Button>
        <Button
          variant="ghost"
          className="text-action"
          disabled={seleccion.length < 2 || !puedeUniones}
          title={!puedeUniones ? "Requiere permiso de salon.uniones (V1)" : undefined}
          onClick={unirSeleccionadas}
        >
          <Link2 size={14} /> Unir seleccionadas{seleccion.length >= 2 ? ` (${seleccion.length})` : ""}
        </Button>
        <span className="salon-editor__aviso">
          {totalCambios > 0 ? `${totalCambios} posición(es) sin guardar` : "Sin cambios de posición"}
        </span>
        <Button variant="primary" disabled={totalCambios === 0 || !puedeMapa || guardar.isPending} onClick={guardarCambios}>
          <Save size={15} /> {guardar.isPending ? "Guardando…" : "Guardar mapa"}
        </Button>
        <Button variant="secondary" onClick={onPreview}>
          <Eye size={15} /> Vista del mesero
        </Button>
        <div className="salon-popover-anchor" ref={menuExport.ref}>
          <Button variant="secondary" disabled={exportando} onClick={() => menuExport.setOpen(!menuExport.open)}>
            <Download size={15} /> Exportar
          </Button>
          {menuExport.open ? (
            <div className="salon-popover" role="menu">
              <button type="button" role="menuitem" onClick={() => { onExportar("pdf"); menuExport.setOpen(false) }}>
                Plano en PDF
              </button>
              <button type="button" role="menuitem" onClick={() => { onExportar("png"); menuExport.setOpen(false) }}>
                Plano en PNG
              </button>
              <button type="button" role="menuitem" onClick={() => { onExportar("csv"); menuExport.setOpen(false) }}>
                Elementos en CSV
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <p className="salon-nota">
        Arrastra una mesa o muévela con las flechas del teclado (Enter para seleccionar). El grid valida que quede dentro de
        su zona; guarda por lote con «Guardar mapa» (auditado).
      </p>

      <div className="salon-editor__layout">
        <div className="salon-editor__canvas">
          <FloorMapCanvas
            zonas={zonas}
            mesas={mesasConCambios}
            uniones={mapa.uniones}
            seleccion={seleccion}
            modo="editar"
            onSeleccion={seleccionar}
            onMover={mover}
          />
        </div>

        <aside className="salon-editor__side panel">
          <div className="panel__header">
            <div>
              <div className="panel__title">Inspector</div>
              <div className="panel__subtitle">
                {seleccion.length > 1 ? `${seleccion.length} mesas seleccionadas` : "Mesa, estado y mantenimiento"}
              </div>
            </div>
            {inspector ? (
              <IconButton label="Cerrar inspector" onClick={() => setInspector(null)}>
                <X size={16} />
              </IconButton>
            ) : null}
          </div>
          <div className="salon-editor__side-body">
            {inspector ? (
              <TableInspector
                mesa={mesaSeleccionada}
                zonas={zonas}
                modo={inspector.modo}
                zonaInicial={inspector.modo === "crear" ? inspector.zonaId : undefined}
                onCerrar={() => {
                  setInspector(null)
                  setSeleccion([])
                }}
              />
            ) : (
              <p className="salon-nota">
                Selecciona una mesa del mapa para editar capacidad, posición y estado, o usa «Agregar mesa» para darla de alta.
              </p>
            )}
          </div>
        </aside>
      </div>

      <div className="salon-leyenda" aria-label="Leyenda de estados de mesa">
        {Object.entries(MESA_ESTADO_LABEL).map(([estado, etiqueta]) => (
          <span className="salon-leyenda__item" key={estado}>
            <i className={`salon-leyenda__punto salon-leyenda__punto--${estado}`} aria-hidden="true" />
            {etiqueta}
          </span>
        ))}
        <span className="salon-leyenda__item">
          <Plus size={12} /> Las mesas `fuera_servicio` no se ofrecen en web, APK ni quiosco.
        </span>
      </div>

      <ZonaForm open={Boolean(zonaForm)} zona={zonaForm?.zona ?? null} sedeId={mapa.sedeId} onClose={() => setZonaForm(null)} />
    </div>
  )
}
