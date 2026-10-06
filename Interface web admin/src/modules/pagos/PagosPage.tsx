import { useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Download } from "lucide-react"
import { PageHeader } from "@/components/data/PageHeader"
import { Tabs } from "@/components/data/Tabs"
import { Button } from "@/components/ui/Button"
import { NoPermissionState } from "@/components/ui/states"
import { useToast } from "@/components/ui/toast"
import { useSocketEvent } from "@/lib/realtime"
import { useAuth } from "@/app/auth"
import { useExportarPagos } from "@/modules/pagos/api"
import { PagoDetailDrawer } from "@/modules/pagos/components/PagoDetailDrawer"
import { PagosTab } from "@/modules/pagos/components/PagosTab"
import { PropinasTab } from "@/modules/pagos/components/PropinasTab"
import { ConciliacionTab } from "@/modules/pagos/components/ConciliacionTab"
import "@/modules/pagos/pagos.css"

/** `/pagos` — pagos, propinas (V1) y conciliación de reembolsos. */
export default function PagosPage() {
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const exportar = useExportarPagos()

  useSocketEvent(["pago.estado"], () => {
    void queryClient.invalidateQueries({ queryKey: ["pagos"] })
  })

  const tab = searchParams.get("tab") ?? "pagos"
  const pagoId = searchParams.get("pago")

  const cambiarTab = (id: string) => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.set("tab", id)
    siguiente.delete("pago")
    setSearchParams(siguiente, { replace: true })
  }

  const abrirPago = (id: string) => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.set("pago", id)
    setSearchParams(siguiente, { replace: true })
  }

  const cerrarPago = () => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.delete("pago")
    setSearchParams(siguiente, { replace: true })
  }

  if (!tienePermiso("pagos.ver")) {
    return (
      <div className="module-page">
        <PageHeader eyebrow="Dinero / Pagos" title="Pagos y propinas" />
        <NoPermissionState permiso="pagos.ver" />
      </div>
    )
  }

  const puedeExportar = tienePermiso("pagos.exportar")

  const exportarPagos = () => {
    exportar.mutate(
      {
        tipo: "pagos",
        formato: "csv",
        filtros: {
          turnoId: searchParams.get("turno") ?? undefined,
          medioId: searchParams.get("medio") ?? undefined,
          desde: searchParams.get("desde") ?? undefined,
          hasta: searchParams.get("hasta") ?? undefined,
          estado: searchParams.get("estado") ?? undefined,
        },
      },
      {
        onSuccess: () => mostrar("Exportación registrada; el archivo se genera en segundo plano.", "exito"),
        onError: () => mostrar("No se pudo registrar la exportación.", "error"),
      },
    )
  }

  return (
    <div className="module-page">
      <PageHeader
        eyebrow="Dinero / Pagos"
        title="Pagos y propinas"
        subtitle="Detalle por pedido y por medio, reembolsos conciliados y liquidación de propinas."
        actions={
          <Button
            variant="secondary"
            disabled={!puedeExportar || exportar.isPending}
            title={puedeExportar ? undefined : "Requiere permiso de pagos.exportar"}
            onClick={exportarPagos}
          >
            <Download size={15} /> {exportar.isPending ? "Exportando…" : "Exportar pagos"}
          </Button>
        }
      />

      <Tabs
        tabs={[
          { id: "pagos", label: "Pagos" },
          { id: "propinas", label: "Propinas" },
          { id: "conciliacion", label: "Conciliación" },
        ]}
        value={tab}
        onChange={cambiarTab}
      />

      {tab === "propinas" ? (
        <PropinasTab puedePropinas={tienePermiso("pagos.propinas")} puedeExportar={puedeExportar} />
      ) : tab === "conciliacion" ? (
        <ConciliacionTab onAbrirPago={abrirPago} />
      ) : (
        <PagosTab onAbrirPago={abrirPago} />
      )}

      <PagoDetailDrawer pagoId={pagoId} onClose={cerrarPago} />
    </div>
  )
}
