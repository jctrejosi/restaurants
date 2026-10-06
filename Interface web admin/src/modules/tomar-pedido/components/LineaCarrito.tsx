import { Minus, Plus, SlidersHorizontal, StickyNote, Trash2 } from "lucide-react"
import { MoneyCell } from "@/components/data/cells"
import { IconButton } from "@/components/ui/IconButton"
import { importeLinea } from "@/modules/tomar-pedido/totales"
import type { LineaCarrito as LineaCarritoModel } from "@/modules/tomar-pedido/types"

function CantidadStepper({
  cantidad,
  disabled,
  onCambiar,
}: {
  cantidad: number
  disabled: boolean
  onCambiar: (delta: number) => void
}) {
  return (
    <span className="tp-stepper">
      <IconButton
        label="Quitar una pieza (−)"
        className="tp-stepper__btn"
        disabled={disabled}
        onClick={() => onCambiar(-1)}
      >
        <Minus size={13} />
      </IconButton>
      <span className="tp-stepper__valor" aria-live="polite">
        {cantidad}
      </span>
      <IconButton
        label="Agregar una pieza (+)"
        className="tp-stepper__btn"
        disabled={disabled}
        onClick={() => onCambiar(1)}
      >
        <Plus size={13} />
      </IconButton>
    </span>
  )
}

/** Línea del carrito con modificadores, notas, cantidad y quitar (plan §3). */
export function LineaCarrito({
  linea,
  activa,
  moneda,
  puedeEditar,
  onActivar,
  onCantidad,
  onQuitar,
  onModificadores,
  onNota,
}: {
  linea: LineaCarritoModel
  activa: boolean
  moneda?: string
  puedeEditar: boolean
  onActivar: () => void
  onCantidad: (delta: number) => void
  onQuitar: () => void
  onModificadores: () => void
  onNota: () => void
}) {
  return (
    <article
      className={`tp-linea ${activa ? "tp-linea--activa" : ""}`}
      onClick={onActivar}
      aria-current={activa ? "true" : undefined}
    >
      <div className="tp-linea__cabecera">
        <div className="tp-linea__titulo">
          <strong>{linea.nombreSnapshot}</strong>
          <span className="tp-linea__precio">
            <MoneyCell centavos={linea.centavos} moneda={moneda} /> c/u
          </span>
        </div>
        <span className="tp-linea__importe">
          <MoneyCell centavos={importeLinea(linea)} moneda={moneda} />
        </span>
      </div>

      {linea.modificadores.length > 0 ? (
        <ul className="tp-linea__mods">
          {linea.modificadores.map((modificador) => (
            <li key={`${modificador.grupoId}-${modificador.modificadorId}`}>
              {modificador.nombre}
              {modificador.sobreprecioCentavos > 0 ? (
                <span> +{Math.round(modificador.sobreprecioCentavos / 100)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {linea.notas ? (
        <p className="tp-linea__nota">
          <StickyNote size={12} /> {linea.notas}
        </p>
      ) : null}

      <div className="tp-linea__pie">
        <CantidadStepper cantidad={linea.cantidad} disabled={!puedeEditar} onCambiar={onCantidad} />
        <span className="tp-linea__estacion" title={linea.estacion ? undefined : "No genera comanda"}>
          {linea.estacion ? linea.estacion.nombre : "Sin estación"}
        </span>
        <span className="tp-linea__acciones">
          <IconButton
            label="Modificadores"
            disabled={!puedeEditar}
            onClick={(event) => {
              event.stopPropagation()
              onModificadores()
            }}
          >
            <SlidersHorizontal size={14} />
          </IconButton>
          <IconButton
            label="Nota de la línea"
            disabled={!puedeEditar}
            onClick={(event) => {
              event.stopPropagation()
              onNota()
            }}
          >
            <StickyNote size={14} />
          </IconButton>
          <IconButton
            label="Quitar línea (Supr)"
            disabled={!puedeEditar}
            onClick={(event) => {
              event.stopPropagation()
              onQuitar()
            }}
          >
            <Trash2 size={14} />
          </IconButton>
        </span>
      </div>
    </article>
  )
}
