import { Bike, ShoppingBag, UtensilsCrossed, type LucideIcon } from "lucide-react"
import { MODALIDAD_DESCRIPCION, MODALIDAD_LABEL, type Modalidad } from "@/modules/tomar-pedido/types"

const ICONOS: Record<Modalidad, LucideIcon> = {
  mesa: UtensilsCrossed,
  recoger: ShoppingBag,
  domicilio: Bike,
}

/** Modalidad del pedido: Mesa · Para llevar · Domicilio (plan §3). */
export function ModalidadSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: Modalidad
  onChange: (modalidad: Modalidad) => void
  disabled?: boolean
}) {
  return (
    <div className="tp-modalidad" role="tablist" aria-label="Modalidad del pedido">
      {(Object.keys(MODALIDAD_LABEL) as Modalidad[]).map((modalidad) => {
        const Icono = ICONOS[modalidad]
        const activa = value === modalidad
        return (
          <button
            key={modalidad}
            type="button"
            role="tab"
            aria-selected={activa}
            className={`button tp-modalidad__btn ${activa ? "tp-modalidad__btn--activa" : ""}`}
            title={MODALIDAD_DESCRIPCION[modalidad]}
            disabled={disabled}
            onClick={() => onChange(modalidad)}
          >
            <Icono size={15} />
            <span>{MODALIDAD_LABEL[modalidad]}</span>
          </button>
        )
      })}
    </div>
  )
}
