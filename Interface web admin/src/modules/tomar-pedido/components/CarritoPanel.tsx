import { ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/states"
import { TextareaField } from "@/components/ui/fields"
import { LineaCarrito } from "@/modules/tomar-pedido/components/LineaCarrito"
import { TotalesPanel } from "@/modules/tomar-pedido/components/TotalesPanel"
import { unidadesCarrito } from "@/modules/tomar-pedido/totales"
import type {
  DescuentoAplicado,
  LineaCarrito as LineaCarritoModel,
  TotalesCarrito,
} from "@/modules/tomar-pedido/types"

/** Columna derecha del POS: líneas, nota del pedido, totales y acciones. */
export function CarritoPanel({
  lineas,
  moneda,
  lineaActivaId,
  puedeCrear,
  onActivar,
  onCantidad,
  onQuitar,
  onModificadores,
  onNota,
  notas,
  onNotas,
  onVaciar,
  totales,
  descuento,
  propinaPct,
  onPropina,
  puedeDescuento,
  puedePrecuenta,
  puedeCobrar,
  turnoAbierto,
  guardando,
  enviando,
  cobrando,
  guardadoEn,
  onGuardar,
  onDescuento,
  onQuitarDescuento,
  onPrecuenta,
  onEnviar,
  onCobrar,
}: {
  lineas: LineaCarritoModel[]
  moneda?: string
  lineaActivaId: string | null
  puedeCrear: boolean
  onActivar: (id: string) => void
  onCantidad: (id: string, delta: number) => void
  onQuitar: (id: string) => void
  onModificadores: (linea: LineaCarritoModel) => void
  onNota: (linea: LineaCarritoModel) => void
  notas: string
  onNotas: (texto: string) => void
  onVaciar: () => void
  totales: TotalesCarrito
  descuento: DescuentoAplicado | null
  propinaPct: number
  onPropina: (pct: number) => void
  puedeDescuento: boolean
  puedePrecuenta: boolean
  puedeCobrar: boolean
  turnoAbierto: boolean
  guardando: boolean
  enviando: boolean
  cobrando: boolean
  guardadoEn: string | null
  onGuardar: () => void
  onDescuento: () => void
  onQuitarDescuento: () => void
  onPrecuenta: () => void
  onEnviar: () => void
  onCobrar: () => void
}) {
  const unidades = unidadesCarrito(lineas)
  return (
    <section className="panel tp-carrito" aria-label="Carrito del pedido">
      <div className="tp-carrito__cabecera">
        <div>
          <div className="panel__title">Pedido actual</div>
          <div className="panel__subtitle">
            {lineas.length === 0
              ? "Sin líneas todavía"
              : `${lineas.length} línea(s) · ${unidades} pieza(s)`}
          </div>
        </div>
        {lineas.length > 0 ? (
          <Button variant="ghost" className="text-action" disabled={!puedeCrear} onClick={onVaciar}>
            Vaciar
          </Button>
        ) : null}
      </div>

      <div className="tp-carrito__lineas">
        {lineas.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={22} />}
            title="El carrito está vacío"
            description="Agrega productos de la carta para armar el pedido. F2 busca, F9 envía a cocina."
          />
        ) : (
          lineas.map((linea) => (
            <LineaCarrito
              key={linea.id}
              linea={linea}
              activa={linea.id === lineaActivaId}
              moneda={moneda}
              puedeEditar={puedeCrear}
              onActivar={() => onActivar(linea.id)}
              onCantidad={(delta) => onCantidad(linea.id, delta)}
              onQuitar={() => onQuitar(linea.id)}
              onModificadores={() => onModificadores(linea)}
              onNota={() => onNota(linea)}
            />
          ))
        )}
      </div>

      {lineas.length > 0 ? (
        <div className="tp-carrito__notas">
          <TextareaField
            label="Nota del pedido"
            placeholder="Ej. Para llevar todo junto, sin cubiertos…"
            rows={2}
            value={notas}
            onChange={(event) => onNotas(event.target.value)}
          />
        </div>
      ) : null}

      <TotalesPanel
        totales={totales}
        moneda={moneda}
        descuento={descuento}
        propinaPct={propinaPct}
        onPropina={onPropina}
        puedeCrear={puedeCrear}
        puedeDescuento={puedeDescuento}
        puedePrecuenta={puedePrecuenta}
        puedeCobrar={puedeCobrar}
        turnoAbierto={turnoAbierto}
        puedeEnviar={lineas.length > 0}
        guardando={guardando}
        enviando={enviando}
        cobrando={cobrando}
        guardadoEn={guardadoEn}
        onGuardar={onGuardar}
        onDescuento={onDescuento}
        onQuitarDescuento={onQuitarDescuento}
        onPrecuenta={onPrecuenta}
        onEnviar={onEnviar}
        onCobrar={onCobrar}
      />
    </section>
  )
}
