import { Drawer } from "@/components/ui/Drawer"
import { StatusBadge } from "@/components/ui/StatusBadge"
import {
  MESA_ESTADO_DESCRIPCION,
  MESA_ESTADO_LABEL,
  MESA_ESTADO_TONE,
  type MesaCarta,
} from "@/modules/tomar-pedido/types"

/** Selector de mesa: solo se ofrecen libres; el resto explica por qué no (plan §8). */
export function MesaPicker({
  open,
  onClose,
  mesas,
  seleccionada,
  onSeleccionar,
}: {
  open: boolean
  onClose: () => void
  mesas: MesaCarta[]
  seleccionada: string | null
  onSeleccionar: (mesa: MesaCarta) => void
}) {
  const disponibles = mesas.filter((mesa) => mesa.estado === "libre").length
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Elegir mesa"
      subtitle={`${disponibles} mesa(s) disponibles · no se ofrecen ocupadas, reservadas ni fuera de servicio`}
      width={540}
    >
      <div className="tp-mesas">
        {mesas.map((mesa) => {
          const habilitada = mesa.estado === "libre"
          const actual = seleccionada === mesa.numero
          return (
            <button
              key={mesa.id}
              type="button"
              className={`tp-mesa ${actual ? "tp-mesa--actual" : ""} ${!habilitada ? "tp-mesa--bloqueada" : ""}`}
              disabled={!habilitada}
              title={`${MESA_ESTADO_LABEL[mesa.estado]}: ${MESA_ESTADO_DESCRIPCION[mesa.estado]}`}
              onClick={() => {
                onSeleccionar(mesa)
                onClose()
              }}
            >
              <strong>Mesa {mesa.numero}</strong>
              <span>
                {mesa.zona} · {mesa.capacidad} persona(s)
              </span>
              <StatusBadge tone={MESA_ESTADO_TONE[mesa.estado]}>{MESA_ESTADO_LABEL[mesa.estado]}</StatusBadge>
              {mesa.etiqueta ? <small>{mesa.etiqueta}</small> : null}
            </button>
          )
        })}
      </div>
    </Drawer>
  )
}
