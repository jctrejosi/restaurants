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
import { useExportarFacturas } from "@/modules/facturacion/api"
import { FacturaDetailDrawer } from "@/modules/facturacion/components/FacturaDetailDrawer"
import { FacturasTab } from "@/modules/facturacion/components/FacturasTab"
import { NotasCreditoTab } from "@/modules/facturacion/components/NotasCreditoTab"
import { ConfiguracionFiscalTab } from "@/modules/facturacion/components/ConfiguracionFiscalTab"
import { DiagnosticoTab } from "@/modules/facturacion/components/DiagnosticoTab"
import "@/modules/facturacion/facturacion.css"

/** `/facturacion` — facturas, notas crédito, configuración fiscal y diagnóstico. */
export default function FacturacionPage() {
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const exportar = useExportarFacturas()

  useSocketEvent(["factura.estado"], () => {
    void queryClient.invalidateQueries({ queryKey: ["facturacion"] })
  })

  const tab = searchParams.get("tab") ?? "facturas"
  const facturaId = searchParams.get("factura")

  const cambiarTab = (id: string) => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.set("tab", id)
    siguiente.delete("factura")
    setSearchParams(siguiente, { replace: true })
  }

  const abrirFactura = (id: string) => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.set("factura", id)
    setSearchParams(siguiente, { replace: true })
  }

  const cerrarFactura = () => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.delete("factura")
    setSearchParams(siguiente, { replace: true })
  }

  if (!tienePermiso("facturacion.ver")) {
    return (
      <div className="module-page">
        <PageHeader eyebrow="Dinero / Facturación" title="Facturación" />
        <NoPermissionState permiso="facturacion.ver" />
      </div>
    )
  }

  const puedeExportar = tienePermiso("facturacion.exportar")

  const exportarFacturas = () => {
    exportar.mutate(
      {
        tipo: "facturas",
        formato: "csv",
        filtros: {
          estado: searchParams.get("estado") ?? undefined,
          prefijo: searchParams.get("prefijo") ?? undefined,
          desde: searchParams.get("desde") ?? undefined,
          hasta: searchParams.get("hasta") ?? undefined,
        },
      },
      {
        onSuccess: () => mostrar("Exportación fiscal registrada; se genera en segundo plano.", "exito"),
        onError: () => mostrar("No se pudo registrar la exportación.", "error"),
      },
    )
  }

  return (
    <div className="module-page">
      <PageHeader
        eyebrow="Dinero / Facturación"
        title="Facturación"
        subtitle="Facturas y notas crédito, configuración de impuestos, resoluciones y prefijos, y diagnóstico del proveedor."
        actions={
          <Button
            variant="secondary"
            disabled={!puedeExportar || exportar.isPending}
            title={puedeExportar ? undefined : "Requiere permiso de facturacion.exportar"}
            onClick={exportarFacturas}
          >
            <Download size={15} /> {exportar.isPending ? "Exportando…" : "Exportar facturas"}
          </Button>
        }
      />

      <Tabs
        tabs={[
          { id: "facturas", label: "Facturas" },
          { id: "notas", label: "Notas crédito" },
          { id: "configuracion", label: "Configuración fiscal" },
          { id: "diagnostico", label: "Diagnóstico" },
        ]}
        value={tab}
        onChange={cambiarTab}
      />

      {tab === "notas" ? (
        <NotasCreditoTab puedeNotas={tienePermiso("facturacion.notas")} onAbrirFactura={abrirFactura} />
      ) : tab === "configuracion" ? (
        <ConfiguracionFiscalTab />
      ) : tab === "diagnostico" ? (
        <DiagnosticoTab onAbrirFactura={abrirFactura} />
      ) : (
        <FacturasTab onAbrirFactura={abrirFactura} />
      )}

      <FacturaDetailDrawer facturaId={facturaId} onClose={cerrarFactura} />
    </div>
  )
}
