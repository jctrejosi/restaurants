import { useMemo, useState } from "react"
import { LayoutDashboard, Star } from "lucide-react"
import { KpiCard, type KpiData } from "@/components/data/KpiCard"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { SkeletonCards } from "@/components/ui/Skeleton"
import { formatMoney, formatNumber, formatPercent } from "@/lib/format"
import { useReservasReporte, useVentasReporte } from "@/modules/reportes/api"
import type { ReporteFiltros } from "@/modules/reportes/types"

const STORAGE_KEY = "pc_reporte_tablero"

type TarjetaCatalogo = {
  id: string
  titulo: string
  descripcion: string
}

export const TARJETAS_DISPONIBLES: TarjetaCatalogo[] = [
  { id: "ventas", titulo: "Ventas de hoy", descripcion: "Total vendido con comparación vs ayer" },
  { id: "pedidos", titulo: "Pedidos pagados", descripcion: "Volumen de pedidos cerrados hoy" },
  { id: "ticket", titulo: "Ticket promedio", descripcion: "Total ÷ pedidos pagados" },
  { id: "descuentos", titulo: "Descuentos", descripcion: "Importe descontado hoy" },
  { id: "impuestos", titulo: "Impuestos", descripcion: "IVA trasladado del día" },
  { id: "propina", titulo: "Propinas", descripcion: "Propinas registradas hoy" },
  { id: "reservas", titulo: "Reservas", descripcion: "Reservas recibidas hoy" },
  { id: "ocupacion", titulo: "Ocupación", descripcion: "Ocupación media de mesas" },
  { id: "noShow", titulo: "No-show", descripcion: "Porcentaje de no presentadas" },
  { id: "espera", titulo: "Espera media de reservas", descripcion: "Minutos de espera promedio" },
]

function leerFavoritas(): string[] {
  if (typeof localStorage === "undefined") return ["ventas", "pedidos", "ticket", "reservas"]
  try {
    const bruto = localStorage.getItem(STORAGE_KEY)
    if (!bruto) return ["ventas", "pedidos", "ticket", "reservas"]
    const parseado = JSON.parse(bruto) as unknown
    return Array.isArray(parseado) ? (parseado as string[]) : []
  } catch {
    return ["ventas", "pedidos", "ticket", "reservas"]
  }
}

/**
 * Tablero personalizable por rol (V2, RF-R5-127): el usuario elige las tarjetas
 * favoritas; la selección se guarda por usuario/dispositivo.
 */
export function TableroPanel({ filtros, sedeId }: { filtros: ReporteFiltros; sedeId: string | null }) {
  const [favoritas, setFavoritas] = useState<string[]>(() => leerFavoritas())
  const filtrosHoy: ReporteFiltros = useMemo(
    () => ({ ...filtros, metrica: "ventas", periodo: "hoy", agrupacion: "dia", comparar: true }),
    [filtros],
  )
  const ventas = useVentasReporte(filtrosHoy, sedeId, true)
  const reservas = useReservasReporte({ ...filtrosHoy, metrica: "reservas" }, sedeId, true)

  const alternar = (id: string) => {
    const siguientes = favoritas.includes(id) ? favoritas.filter((item) => item !== id) : [...favoritas, id]
    setFavoritas(siguientes)
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(siguientes))
  }

  if (ventas.isError || reservas.isError) {
    return (
      <ErrorState
        title="No pudimos armar tu tablero"
        onRetry={() => {
          void ventas.refetch()
          void reservas.refetch()
        }}
      />
    )
  }

  if (ventas.isLoading || reservas.isLoading || !ventas.data || !reservas.data) {
    return (
      <div className="report-stack">
        <SkeletonCards count={4} />
      </div>
    )
  }

  const kpis: Record<string, KpiData> = {
    ventas: {
      label: "Ventas de hoy",
      value: formatMoney(ventas.data.kpis.totalCentavos),
      delta: ventas.data.comparativo
        ? `${ventas.data.comparativo.variacionPct !== null && ventas.data.comparativo.variacionPct >= 0 ? "+" : "−"}${formatPercent(
            Math.abs(ventas.data.comparativo.variacionPct ?? 0),
            1,
          )} vs ayer`
        : undefined,
      deltaNegativo: (ventas.data.comparativo?.variacionPct ?? 0) < 0,
      color: "terracotta",
    },
    pedidos: { label: "Pedidos pagados", value: formatNumber(ventas.data.kpis.pedidos), foot: "hoy", color: "blue" },
    ticket: { label: "Ticket promedio", value: formatMoney(ventas.data.kpis.ticketCentavos), foot: "hoy", color: "green" },
    descuentos: {
      label: "Descuentos",
      value: formatMoney(ventas.data.kpis.descuentosCentavos),
      deltaNegativo: true,
      foot: "hoy",
      color: "gold",
    },
    impuestos: { label: "Impuestos", value: formatMoney(ventas.data.kpis.impuestosCentavos), foot: "hoy", color: "purple" },
    propina: { label: "Propinas", value: formatMoney(ventas.data.kpis.propinaCentavos), foot: "hoy", color: "green" },
    reservas: { label: "Reservas", value: formatNumber(reservas.data.kpis.reservas), foot: "hoy", color: "terracotta" },
    ocupacion: {
      label: "Ocupación",
      value: formatPercent(reservas.data.kpis.ocupacionPct),
      foot: "mesas sentadas",
      color: "blue",
    },
    noShow: {
      label: "No-show",
      value: formatPercent(reservas.data.kpis.noShowPct),
      deltaNegativo: true,
      foot: "de las confirmadas",
      color: "gold",
    },
    espera: {
      label: "Espera media",
      value: `${reservas.data.kpis.esperaMediaMin} min`,
      foot: "reservas sentadas",
      color: "purple",
    },
  }

  const seleccionadas = TARJETAS_DISPONIBLES.filter((tarjeta) => favoritas.includes(tarjeta.id))

  return (
    <div className="report-stack">
      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">
              <LayoutDashboard size={15} aria-hidden="true" /> Mi tablero
            </div>
            <div className="panel__subtitle">
              Personalizable por rol (V2) · elige las tarjetas que quieres ver al abrir el día
            </div>
          </div>
        </div>
        <div className="tablero-selector">
          {TARJETAS_DISPONIBLES.map((tarjeta) => {
            const activa = favoritas.includes(tarjeta.id)
            return (
              <button
                key={tarjeta.id}
                type="button"
                className={`tablero-toggle ${activa ? "tablero-toggle--active" : ""}`}
                aria-pressed={activa}
                title={tarjeta.descripcion}
                onClick={() => alternar(tarjeta.id)}
              >
                <Star size={13} aria-hidden="true" /> {tarjeta.titulo}
              </button>
            )
          })}
        </div>
      </section>

      {seleccionadas.length === 0 ? (
        <EmptyState
          title="Tu tablero está vacío"
          description="Activa al menos una tarjeta para armar tu vista personal."
        />
      ) : (
        <div className="kpi-grid report-kpi-grid--auto">
          {seleccionadas.map((tarjeta) => (
            <KpiCard key={tarjeta.id} data={kpis[tarjeta.id] ?? { label: tarjeta.titulo, value: "—" }} />
          ))}
        </div>
      )}
    </div>
  )
}
