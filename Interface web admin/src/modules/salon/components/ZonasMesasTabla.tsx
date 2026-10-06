import { useState } from "react"
import { Armchair, Layers, Pencil } from "lucide-react"
import { useAuth } from "@/app/auth"
import { DataTable, type Column } from "@/components/data/DataTable"
import { Button } from "@/components/ui/Button"
import { Drawer } from "@/components/ui/Drawer"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { TableInspector } from "@/modules/salon/components/TableInspector"
import { ZonaForm } from "@/modules/salon/components/ZonaForm"
import {
  MESA_ESTADO_LABEL,
  MESA_ESTADO_TONE,
  type Mesa,
  type SalonMapa,
  type Zona,
} from "@/modules/salon/types"

/** Pestaña «Zonas y mesas»: listados con altas, edición y baja lógica. */
export function ZonasMesasTabla({ mapa }: { mapa: SalonMapa }) {
  const { tienePermiso } = useAuth()
  const puedeZonas = tienePermiso("salon.zonas")
  const puedeMesas = tienePermiso("salon.mesas")

  const [zonaForm, setZonaForm] = useState<{ zona: Zona | null } | null>(null)
  const [mesaEdicion, setMesaEdicion] = useState<Mesa | null>(null)
  const [crearMesa, setCrearMesa] = useState(false)

  const columnasZona: Column<Zona>[] = [
    { key: "nombre", header: "Zona", cell: (zona) => <strong>{zona.nombre}</strong> },
    { key: "aforo", header: "Aforo", align: "right", cell: (zona) => zona.aforo },
    {
      key: "mesas",
      header: "Mesas",
      align: "right",
      cell: (zona) => mapa.mesas.filter((mesa) => mesa.zonaId === zona.id).length,
    },
    {
      key: "ocupadas",
      header: "Ocupadas",
      align: "right",
      cell: (zona) =>
        mapa.mesas.filter((mesa) => mesa.zonaId === zona.id && (mesa.estado === "ocupada" || mesa.estado === "por_cobrar")).length,
    },
    {
      key: "fuera",
      header: "Fuera de servicio",
      align: "right",
      cell: (zona) => mapa.mesas.filter((mesa) => mesa.zonaId === zona.id && mesa.estado === "fuera_servicio").length,
    },
    {
      key: "acciones",
      header: "",
      cell: (zona) => (
        <Button
          variant="ghost"
          className="text-action"
          disabled={!puedeZonas}
          title={!puedeZonas ? "Requiere permiso de salon.zonas" : undefined}
          onClick={() => setZonaForm({ zona })}
        >
          <Pencil size={13} /> Editar
        </Button>
      ),
    },
  ]

  const columnasMesa: Column<Mesa>[] = [
    { key: "numero", header: "Mesa", cell: (mesa) => <strong>Mesa {mesa.numero}</strong> },
    {
      key: "zona",
      header: "Zona",
      cell: (mesa) => mapa.zonas.find((zona) => zona.id === mesa.zonaId)?.nombre ?? "—",
    },
    { key: "capacidad", header: "Capacidad", align: "right", cell: (mesa) => `${mesa.capacidad} pax` },
    {
      key: "estado",
      header: "Estado",
      cell: (mesa) => <StatusBadge tone={MESA_ESTADO_TONE[mesa.estado]}>{MESA_ESTADO_LABEL[mesa.estado]}</StatusBadge>,
    },
    { key: "activa", header: "Activa", cell: (mesa) => (mesa.activa ? "Sí" : "No (baja lógica)") },
    {
      key: "posicion",
      header: "Posición",
      align: "right",
      cell: (mesa) => `x${mesa.posX} · y${mesa.posY}`,
    },
    {
      key: "acciones",
      header: "",
      cell: (mesa) => (
        <Button
          variant="ghost"
          className="text-action"
          disabled={!puedeMesas}
          title={!puedeMesas ? "Requiere permiso de salon.mesas" : undefined}
          onClick={() => setMesaEdicion(mesa)}
        >
          <Pencil size={13} /> Editar
        </Button>
      ),
    },
  ]

  return (
    <div className="salon-elementos">
      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Zonas</div>
            <div className="panel__subtitle">Nombre, aforo y área en el grid; borrar con mesas o reservas responde 409</div>
          </div>
          <Button variant="secondary" disabled={!puedeZonas} onClick={() => setZonaForm({ zona: null })}>
            <Layers size={15} /> Agregar zona
          </Button>
        </div>
        <DataTable
          columns={columnasZona}
          rows={mapa.zonas}
          getRowKey={(zona) => zona.id}
          emptyTitle="Sin zonas"
          emptyDescription="Crea la primera zona para empezar a ubicar mesas en el mapa."
        />
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Mesas</div>
            <div className="panel__subtitle">Capacidad, estado, baja lógica y posición; la identidad uq_mesa es por sede</div>
          </div>
          <Button variant="secondary" disabled={!puedeMesas} onClick={() => setCrearMesa(true)}>
            <Armchair size={15} /> Agregar mesa
          </Button>
        </div>
        <DataTable columns={columnasMesa} rows={mapa.mesas} getRowKey={(mesa) => mesa.id} emptyTitle="Sin mesas" />
      </section>

      <ZonaForm open={Boolean(zonaForm)} zona={zonaForm?.zona ?? null} sedeId={mapa.sedeId} onClose={() => setZonaForm(null)} />

      <Drawer
        open={Boolean(mesaEdicion) || crearMesa}
        onClose={() => {
          setMesaEdicion(null)
          setCrearMesa(false)
        }}
        width={560}
        title={crearMesa ? "Nueva mesa" : mesaEdicion ? `Mesa ${mesaEdicion.numero}` : "Mesa"}
        subtitle="Capacidad, posición y estado con trazabilidad de auditoría"
      >
        <TableInspector
          mesa={mesaEdicion}
          zonas={mapa.zonas}
          modo={crearMesa ? "crear" : "editar"}
          onCerrar={() => {
            setMesaEdicion(null)
            setCrearMesa(false)
          }}
        />
      </Drawer>
    </div>
  )
}
