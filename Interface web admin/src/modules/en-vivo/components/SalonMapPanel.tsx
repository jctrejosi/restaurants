import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { formatNumber } from "@/lib/format"
import { useSede } from "@/app/sede"
import { useSalonMapa } from "@/modules/salon/api"
import { FloorMapCanvas } from "@/modules/salon/components/FloorMapCanvas"
import { MESA_ESTADO_LABEL, resumenMesas, type Mesa, type MesaEstado } from "@/modules/salon/types"
import { MesaDetalleDialog } from "@/modules/en-vivo/components/MesaDetalleDialog"
import { PedidoDetalleDrawer, type PedidoTab } from "@/modules/pedidos/components/PedidoDetalleDrawer"
import type { PedidoActivo } from "@/modules/en-vivo/types"
import "@/modules/salon/salon.css"

/**
 * Mapa del salón dentro de «En vivo»: reutiliza el mismo render del módulo
 * Salón (`FloorMapCanvas`) en modo solo lectura (plan 05 §6.3). El estado de las
 * mesas se actualiza con la operación del APK; el panel solo observa.
 */
export function SalonMapPanel({ pedidos = [] }: { pedidos?: PedidoActivo[] }) {
  const navigate = useNavigate()
  const { sedeId, sede, moneda } = useSede()
  const sedeConsulta = sedeId ?? "centro"
  const { data, isLoading, isError, refetch } = useSalonMapa(sedeConsulta)
  const [mesaSel, setMesaSel] = useState<Mesa | null>(null)
  const [pedidoDetalleId, setPedidoDetalleId] = useState<string | null>(null)
  const [pedidoTab, setPedidoTab] = useState<PedidoTab>("resumen")

  const zonaSel = useMemo(
    () => (mesaSel ? (data?.zonas.find((zona) => zona.id === mesaSel.zonaId) ?? null) : null),
    [data, mesaSel],
  )

  const pedidoSel = useMemo(() => {
    if (!mesaSel) return null
    const numero = Number(mesaSel.numero)
    return (
      pedidos.find(
        (pedido) => pedido.modalidad === "mesa" && Number(pedido.etiqueta.replace(/\D/g, "")) === numero,
      ) ?? null
    )
  }, [mesaSel, pedidos])

  return (
    <section className="panel salon-panel">
      <div className="panel__header">
        <div>
          <div className="panel__title">Salón</div>
          <div className="panel__subtitle">
            {data?.sedeNombre ?? sede?.nombre ?? "Vista de solo lectura"} · el panel observa, el APK opera
          </div>
        </div>
        <Button variant="ghost" className="text-action" onClick={() => navigate("/salon")}>
          Ver módulo Salón <ChevronRight size={15} />
        </Button>
      </div>

      {isError ? (
        <ErrorState
          title="No pudimos cargar el mapa del salón"
          description="Revisa tu conexión e inténtalo de nuevo."
          onRetry={() => void refetch()}
        />
      ) : isLoading || !data ? (
        <div className="salon-panel__body">
          <SkeletonRows rows={4} columns={5} />
        </div>
      ) : data.mesas.length === 0 ? (
        <EmptyState
          title="Sin mesas configuradas"
          description="Configura zonas y mesas en el módulo Salón para verlas aquí."
          action={{ label: "Ir a Salón", onClick: () => navigate("/salon") }}
        />
      ) : (
        <>
          <div className="salon-preview__resumen salon-panel__resumen">
            {(Object.keys(MESA_ESTADO_LABEL) as MesaEstado[]).map((estado) => (
              <span className="salon-preview__chip" key={estado}>
                <i className={`salon-leyenda__punto salon-leyenda__punto--${estado}`} aria-hidden="true" />
                {MESA_ESTADO_LABEL[estado]}: {formatNumber(resumenMesas(data.mesas)[estado])}
              </span>
            ))}
          </div>

          <div className="salon-panel__body">
            <FloorMapCanvas
              zonas={data.zonas}
              mesas={data.mesas}
              uniones={data.uniones}
              seleccion={[]}
              modo="preview"
              onAbrir={setMesaSel}
            />
          </div>
        </>
      )}

      <MesaDetalleDialog
        mesa={mesaSel}
        zona={zonaSel}
        pedido={pedidoSel}
        moneda={moneda}
        onVerPedido={(id) => {
          setMesaSel(null)
          setPedidoTab("resumen")
          setPedidoDetalleId(id)
        }}
        onClose={() => setMesaSel(null)}
      />

      <PedidoDetalleDrawer
        pedidoId={pedidoDetalleId}
        open={Boolean(pedidoDetalleId)}
        tab={pedidoTab}
        onTabChange={setPedidoTab}
        onClose={() => setPedidoDetalleId(null)}
      />
    </section>
  )
}
