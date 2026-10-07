import { AlertTriangle, Plus, SlidersHorizontal } from "lucide-react"
import { MoneyCell } from "@/components/data/cells"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { formatDateTime } from "@/lib/format"
import { ORIGEN_LABEL, type ProductoCarta } from "@/modules/tomar-pedido/types"

function inicial(nombre: string): string {
  return nombre.trim().charAt(0).toUpperCase() || "?"
}

/**
 * Ítem de la carta en dos vistas: `tarjeta` (kanban) y `lista` (fila). Un
 * agotado no se puede agregar: muestra origen, motivo y vigencia, y sugiere una
 * alternativa (plan §8).
 */
export function ProductoCard({
  producto,
  moneda,
  puedeAgregar,
  onAgregar,
  onPersonalizar,
  onAgotado,
  onSinPermiso,
  vista = "tarjeta",
}: {
  producto: ProductoCarta
  moneda?: string
  puedeAgregar: boolean
  onAgregar: (producto: ProductoCarta) => void
  onPersonalizar: (producto: ProductoCarta) => void
  onAgotado: (producto: ProductoCarta) => void
  onSinPermiso?: () => void
  vista?: "tarjeta" | "lista"
}) {
  const agotado = producto.agotado.agotado
  const requiereEleccion = producto.grupos.some((grupo) => grupo.minimo > 0)
  const accion = agotado ? onAgotado : requiereEleccion ? onPersonalizar : onAgregar
  const titulo = !puedeAgregar
    ? "Requiere permiso tomar-pedido.crear"
    : agotado
      ? `Agotado · ${producto.agotado.origenDetalle ?? "sin origen"}`
      : requiereEleccion
        ? "Elige los modificadores obligatorios"
        : "Agregar al pedido"

  const onClick = () => {
    if (!puedeAgregar) {
      onSinPermiso?.()
      return
    }
    accion(producto)
  }

  const etiquetas = (
    <>
      {producto.etiquetas.includes("recomendado") ? <StatusBadge tone="green">Recomendado</StatusBadge> : null}
      {producto.etiquetas.includes("menu_del_dia") ? (
        <StatusBadge tone="outline">Menú del día</StatusBadge>
      ) : null}
      {producto.etiquetas.includes("nuevo") ? <StatusBadge tone="blue">Nuevo</StatusBadge> : null}
      {producto.etiquetas.includes("vegetariano") ? <StatusBadge tone="outline">Vegetariano</StatusBadge> : null}
      {producto.etiquetas.includes("picante") ? <StatusBadge tone="amber">Picante</StatusBadge> : null}
    </>
  )

  const hint = requiereEleccion && !agotado ? (
    <span className="tp-producto__hint" title="Tiene grupos de modificadores obligatorios">
      <SlidersHorizontal size={12} /> Personalizable
    </span>
  ) : (
    <span className="tp-producto__hint tp-producto__hint--suave">
      <Plus size={12} /> Agregar
    </span>
  )

  const detalleAgotado = agotado ? (
    <span className="tp-producto__agotado">
      <span className="tp-producto__agotado-linea">
        <AlertTriangle size={13} />
        {producto.agotado.origenDetalle ?? ORIGEN_LABEL[producto.agotado.origen ?? "backoffice"]}
        {producto.agotado.motivo ? ` · ${producto.agotado.motivo}` : ""}
      </span>
      <span className="tp-producto__agotado-vigencia">
        {producto.agotado.reactivacionEstimada
          ? `Reactivación estimada: ${formatDateTime(producto.agotado.reactivacionEstimada)}`
          : "Sin reactivación estimada"}
      </span>
      {producto.alternativaNombre ? (
        <span className="tp-producto__alternativa">Sugerencia: {producto.alternativaNombre}</span>
      ) : null}
    </span>
  ) : null

  if (vista === "lista") {
    return (
      <button
        type="button"
        className={`tp-producto tp-producto--fila ${agotado ? "tp-producto--agotado" : ""}`}
        title={titulo}
        aria-disabled={!puedeAgregar || agotado}
        onClick={onClick}
      >
        <span className="tp-producto__icono" aria-hidden="true">
          {inicial(producto.nombre)}
        </span>

        <span className="tp-fila__texto">
          <span className="tp-fila__titulo">
            <strong className="tp-producto__nombre">{producto.nombre}</strong>
            <span className="tp-producto__etiquetas">{etiquetas}</span>
            {agotado ? <StatusBadge tone="amber">Agotado</StatusBadge> : null}
          </span>
          <span className="tp-producto__desc">{producto.descripcion}</span>
          {detalleAgotado}
        </span>

        <span className="tp-fila__estacion">{producto.estacion ? producto.estacion.nombre : "Sin estación"}</span>

        <MoneyCell centavos={producto.centavos} moneda={moneda} />

        <span className="tp-fila__accion">{hint}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`tp-producto ${agotado ? "tp-producto--agotado" : ""}`}
      title={titulo}
      aria-disabled={!puedeAgregar || agotado}
      onClick={onClick}
    >
      <span className="tp-producto__cabecera">
        <span className="tp-producto__icono" aria-hidden="true">
          {inicial(producto.nombre)}
        </span>
        <span className="tp-producto__etiquetas">{etiquetas}</span>
        {agotado ? <StatusBadge tone="amber">Agotado</StatusBadge> : null}
      </span>

      <strong className="tp-producto__nombre">{producto.nombre}</strong>
      <span className="tp-producto__desc">{producto.descripcion}</span>

      {detalleAgotado}

      <span className="tp-producto__pie">
        <MoneyCell centavos={producto.centavos} moneda={moneda} />
        <span className="tp-producto__meta">
          {producto.estacion ? producto.estacion.nombre : "Sin estación"}
          {hint}
        </span>
      </span>
      {!producto.estacion && !agotado ? (
        <span className="tp-producto__aviso-sin-estacion" title="No genera comanda: no llega a cocina">
          No genera comanda
        </span>
      ) : null}
    </button>
  )
}
