import { Clock, Printer, Save, Send, Wallet } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { formatMoney } from "@/lib/format"
import type { DescuentoAplicado, TotalesCarrito } from "@/modules/tomar-pedido/types"

const PROPINAS = [0, 5, 10, 15, 20]

function horaConSegundos(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

/** Totales, descuento, propina sugerida y acciones del carrito (plan §3). */
export function TotalesPanel({
  totales,
  moneda,
  descuento,
  propinaPct,
  onPropina,
  puedeCrear,
  puedeDescuento,
  puedePrecuenta,
  puedeCobrar,
  turnoAbierto,
  puedeEnviar,
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
  totales: TotalesCarrito
  moneda?: string
  descuento: DescuentoAplicado | null
  propinaPct: number
  onPropina: (pct: number) => void
  puedeCrear: boolean
  puedeDescuento: boolean
  puedePrecuenta: boolean
  puedeCobrar: boolean
  turnoAbierto: boolean
  puedeEnviar: boolean
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
  const titleCrear = puedeCrear ? undefined : "Requiere permiso tomar-pedido.crear"
  const titleDescuento = puedeDescuento ? undefined : "Requiere permiso tomar-pedido.descuento"
  const titlePrecuenta = puedePrecuenta ? undefined : "Requiere permiso tomar-pedido.precuenta"
  const titleCobrar = !puedeCobrar
    ? "Requiere permiso tomar-pedido.cobrar"
    : !turnoAbierto
      ? "Sin turno de caja abierto no se puede cobrar (V1); puedes enviar a cocina"
      : undefined

  return (
    <div className="tp-totales">
      <div className="tp-propina">
        <span className="tp-propina__label">Propina sugerida</span>
        <div className="tp-propina__opciones" role="group" aria-label="Propina sugerida">
          {PROPINAS.map((pct) => (
            <button
              key={pct}
              type="button"
              className={`button tp-propina__chip ${propinaPct === pct ? "tp-propina__chip--activa" : ""}`}
              aria-pressed={propinaPct === pct}
              onClick={() => onPropina(pct)}
            >
              {pct === 0 ? "Sin propina" : `${pct}%`}
            </button>
          ))}
        </div>
      </div>

      <dl className="tp-totales__filas">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatMoney(totales.subtotalCentavos, moneda)}</dd>
        </div>
        <div>
          <dt>Impuestos</dt>
          <dd>{formatMoney(totales.impuestosCentavos, moneda)}</dd>
        </div>
        <div className={descuento ? "tp-totales__descuento" : ""}>
          <dt>
            Descuento
            {descuento ? (
              <span className="tp-totales__descuento-detalle">
                {descuento.tipo === "porcentaje" ? `${descuento.valor}%` : "Monto"} · {descuento.motivo}
              </span>
            ) : null}
          </dt>
          <dd>
            {totales.descuentoCentavos > 0
              ? `− ${formatMoney(totales.descuentoCentavos, moneda)}`
              : formatMoney(0, moneda)}
            {descuento ? (
              <Button
                variant="ghost"
                className="text-action tp-totales__quitar-descuento"
                onClick={onQuitarDescuento}
                title="Quitar descuento (queda auditado)"
              >
                Quitar
              </Button>
            ) : (
              <Button
                variant="ghost"
                className="text-action"
                onClick={onDescuento}
                disabled={!puedeDescuento}
                title={titleDescuento}
              >
                Aplicar
              </Button>
            )}
          </dd>
        </div>
        <div>
          <dt>Propina {propinaPct > 0 ? `(${propinaPct}%)` : ""}</dt>
          <dd>{formatMoney(totales.propinaCentavos, moneda)}</dd>
        </div>
        <div className="tp-totales__total">
          <dt>Total</dt>
          <dd>{formatMoney(totales.totalCentavos, moneda)}</dd>
        </div>
      </dl>

      <div className="tp-acciones">
        <Button
          variant="primary"
          className="tp-acciones__enviar"
          disabled={!puedeCrear || !puedeEnviar || enviando}
          title={titleCrear ?? (puedeEnviar ? "Enviar a cocina (F9)" : "Agrega productos para enviar")}
          onClick={onEnviar}
        >
          <Send size={16} /> {enviando ? "Enviando…" : "Enviar a cocina (F9)"}
        </Button>
        <div className="tp-acciones__fila">
          <Button
            variant="secondary"
            disabled={!puedeEnviar || guardando}
            title={puedeEnviar ? "Guardar borrador" : "Agrega productos para guardar"}
            onClick={onGuardar}
          >
            <Save size={15} /> {guardando ? "Guardando…" : "Guardar borrador"}
          </Button>
          <Button
            variant="secondary"
            disabled={!puedePrecuenta || !puedeEnviar}
            title={titlePrecuenta ?? (puedeEnviar ? "Imprimir pre-cuenta" : "Agrega productos para imprimir")}
            onClick={onPrecuenta}
          >
            <Printer size={15} /> Pre-cuenta
          </Button>
        </div>
        <Button
          variant="secondary"
          className="tp-acciones__cobrar"
          disabled={!puedeCobrar || !turnoAbierto || !puedeEnviar || cobrando}
          title={titleCobrar ?? (puedeEnviar ? "Pasar a Caja (V1)" : "Agrega productos para cobrar")}
          onClick={onCobrar}
        >
          <Wallet size={15} /> {cobrando ? "Enviando a Caja…" : "Cobrar (V1)"}
        </Button>
        <p className="tp-acciones__guardado" aria-live="polite">
          <Clock size={12} />
          {guardando
            ? "Guardando borrador…"
            : guardadoEn
              ? `Borrador guardado ${horaConSegundos(guardadoEn)}`
              : "El borrador se guarda automáticamente"}
        </p>
      </div>
    </div>
  )
}
