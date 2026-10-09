import { useEffect, useMemo, useState } from "react"
import { Ban, Download, Printer, RefreshCw, Repeat } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Drawer } from "@/components/ui/Drawer"
import { Tabs } from "@/components/data/Tabs"
import { ErrorState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/app/auth"
import { ApiError } from "@/lib/api"
import { formatDateTime, formatMoney } from "@/lib/format"
import { useAccionPedido, useExportarPedidos, usePedidoDetalle, useReembolsoPedido } from "@/modules/pedidos/api"
import { BitacoraTab } from "@/modules/pedidos/components/BitacoraTab"
import { ComandasTab } from "@/modules/pedidos/components/ComandasTab"
import { EntityHeader } from "@/modules/pedidos/components/EntityHeader"
import { LineasTab } from "@/modules/pedidos/components/LineasTab"
import { PagosTab } from "@/modules/pedidos/components/PagosTab"
import { ReasignarDialog } from "@/modules/pedidos/components/ReasignarDialog"
import { ReembolsoDialog } from "@/modules/pedidos/components/ReembolsoDialog"
import { ResumenTab } from "@/modules/pedidos/components/ResumenTab"
import {
  pedidoEstaAbierto,
  type AccionPedidoPayload,
  type PedidoLinea,
  type PedidoPago,
  type ReembolsoTipo,
} from "@/modules/pedidos/types"
import "@/modules/pedidos/pedidos.css"

export type PedidoTab = "resumen" | "lineas" | "comandas" | "pagos" | "bitacora"

type Dialogo =
  | { tipo: "anular_pedido" }
  | { tipo: "anular_linea"; linea: PedidoLinea }
  | { tipo: "reimprimir" }
  | { tipo: "reenviar" }
  | { tipo: "reasignar" }
  | { tipo: "reembolso"; pago: PedidoPago }
  | null

function useAnchoDrawer(): number {
  const [ancho, setAncho] = useState(() =>
    typeof window === "undefined" ? 860 : Math.min(860, Math.round(window.innerWidth * 0.96)),
  )
  useEffect(() => {
    const onResize = () => setAncho(Math.min(860, Math.round(window.innerWidth * 0.96)))
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  return ancho
}

export function PedidoDetalleDrawer({
  pedidoId,
  open,
  tab,
  onTabChange,
  onClose,
}: {
  pedidoId: string | null
  open: boolean
  tab: PedidoTab
  onTabChange: (tab: PedidoTab) => void
  onClose: () => void
}) {
  const { data: pedido, isLoading, isError, refetch } = usePedidoDetalle(open ? pedidoId : null)
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const ancho = useAnchoDrawer()

  const accion = useAccionPedido()
  const reembolso = useReembolsoPedido()
  const exportar = useExportarPedidos()

  const [dialogo, setDialogo] = useState<Dialogo>(null)

  useEffect(() => {
    setDialogo(null)
  }, [pedidoId])

  const puede = {
    anular: tienePermiso("pedidos.anular"),
    anularLinea: tienePermiso("pedidos.anular_linea"),
    reasignar: tienePermiso("pedidos.reasignar"),
    reimprimir: tienePermiso("pedidos.reimprimir"),
    reenviar: tienePermiso("pedidos.reenviar"),
    reembolsar: tienePermiso("pedidos.reembolsar"),
    exportarBitacora: tienePermiso("auditoria.exportar"),
    verPii: tienePermiso("clientes.ver_pii"),
  }

  const abierto = pedido ? pedidoEstaAbierto(pedido.estado) : false

  const ejecutarAccion = (payload: Omit<AccionPedidoPayload, "id">, exito: string) => {
    if (!pedidoId) return
    accion.mutate(
      { ...payload, id: pedidoId },
      {
        onSuccess: () => mostrar(exito, "exito"),
        onError: (error) =>
          mostrar(
            error instanceof ApiError ? error.message : "No se pudo completar la acción. Intenta de nuevo.",
            "error",
          ),
        onSettled: () => setDialogo(null),
      },
    )
  }

  const tabs = useMemo(() => {
    if (!pedido) {
      return [
        { id: "resumen", label: "Resumen" },
        { id: "lineas", label: "Líneas" },
        { id: "comandas", label: "Comandas" },
        { id: "pagos", label: "Pagos" },
        { id: "bitacora", label: "Bitácora" },
      ]
    }
    return [
      { id: "resumen", label: "Resumen" },
      { id: "lineas", label: "Líneas", badge: String(pedido.lineas.length) },
      { id: "comandas", label: "Comandas", badge: String(pedido.comandas.length) },
      { id: "pagos", label: "Pagos", badge: String(pedido.pagos.length) },
      { id: "bitacora", label: "Bitácora", badge: String(pedido.bitacora.length) },
    ]
  }, [pedido])

  const tituloBoton = (permitido: boolean, permiso: string, activo = true) => {
    if (!permitido) return `Requiere permiso de ${permiso}`
    if (!activo) return "El pedido ya no admite cambios"
    return undefined
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={ancho}
      title={pedido ? pedido.folio : "Detalle del pedido"}
      subtitle={
        pedido ? `${pedido.sedeNombre} · ${formatDateTime(pedido.creadoEn, pedido.zonaHoraria)}` : "Cargando información…"
      }
    >
      {isError ? (
        <ErrorState
          title="No pudimos cargar el pedido"
          description="Revisa tu conexión e inténtalo de nuevo. Si el pedido cambió, vuelve a abrir el detalle."
          onRetry={() => void refetch()}
        />
      ) : isLoading || !pedido ? (
        <SkeletonRows rows={6} columns={4} />
      ) : (
        <>
          <EntityHeader pedido={pedido} />

          <div className="pedido-acciones">
            <Button variant="ghost" className="text-action" onClick={() => onTabChange("bitacora")}>
              <Download size={14} /> Bitácora
            </Button>
            <Button
              variant="secondary"
              disabled={!puede.reasignar || !abierto}
              title={tituloBoton(puede.reasignar, "pedidos.reasignar", abierto)}
              onClick={() => setDialogo({ tipo: "reasignar" })}
            >
              <Repeat size={15} /> Reasignar
            </Button>
            <Button
              variant="secondary"
              disabled={!puede.reimprimir || !abierto}
              title={tituloBoton(puede.reimprimir, "pedidos.reimprimir", abierto)}
              onClick={() => setDialogo({ tipo: "reimprimir" })}
            >
              <Printer size={15} /> Reimprimir
            </Button>
            <Button
              variant="secondary"
              disabled={!puede.reenviar || !abierto}
              title={tituloBoton(puede.reenviar, "pedidos.reenviar", abierto)}
              onClick={() => setDialogo({ tipo: "reenviar" })}
            >
              <RefreshCw size={15} /> Reenviar
            </Button>
            <Button
              variant="secondary"
              disabled={!puede.anular || !abierto}
              title={tituloBoton(puede.anular, "pedidos.anular", abierto)}
              onClick={() => setDialogo({ tipo: "anular_pedido" })}
            >
              <Ban size={15} /> Anular pedido
            </Button>
          </div>

          <Tabs tabs={tabs} value={tab} onChange={(id) => onTabChange(id as PedidoTab)} />

          {tab === "resumen" ? <ResumenTab pedido={pedido} puedeVerPii={puede.verPii} /> : null}
          {tab === "lineas" ? (
            <LineasTab
              pedido={pedido}
              puedeAnular={puede.anularLinea}
              onAnularLinea={(linea) => setDialogo({ tipo: "anular_linea", linea })}
            />
          ) : null}
          {tab === "comandas" ? <ComandasTab pedido={pedido} /> : null}
          {tab === "pagos" ? (
            <PagosTab
              pedido={pedido}
              puedeReembolsar={puede.reembolsar}
              onReembolsar={(pago) => setDialogo({ tipo: "reembolso", pago })}
            />
          ) : null}
          {tab === "bitacora" ? (
            <BitacoraTab
              pedido={pedido}
              puedeExportar={puede.exportarBitacora}
              exportando={exportar.isPending}
              onExportar={() => {
                exportar.mutate(
                  { tipo: "bitacora_pedido", formato: "csv", pedidoId: pedido.id },
                  {
                    onSuccess: () => mostrar("Exportación de bitácora registrada (en segundo plano).", "exito"),
                    onError: () => mostrar("No se pudo registrar la exportación.", "error"),
                  },
                )
              }}
            />
          ) : null}
        </>
      )}

      {/* Acciones con motivo obligatorio (RF-R5-53). */}
      {pedido ? (
        <>
          <ConfirmDialog
            open={dialogo?.tipo === "anular_pedido"}
            title={`Anular pedido ${pedido.folio}`}
            description="El pedido no se borra: queda con su bitácora completa en el historial."
            impacto={`Se cancelará un pedido por ${formatMoney(pedido.montos.totalCentavos)}. Tras la preparación, esta acción exige autorización especial (RN-R5-06).`}
            confirmLabel="Anular pedido"
            onCancel={() => setDialogo(null)}
            onConfirm={(motivo) => ejecutarAccion({ accion: "anular_pedido", motivo }, "Pedido anulado y auditado.")}
          />

          <ConfirmDialog
            open={dialogo?.tipo === "anular_linea"}
            title={dialogo?.tipo === "anular_linea" ? `Anular «${dialogo.linea.nombreSnapshot}»` : "Anular línea"}
            description="La línea deja de cobrarse y el total se recalcula."
            impacto={
              dialogo?.tipo === "anular_linea"
                ? `Se descontará ${formatMoney(dialogo.linea.importeCentavos)} del subtotal.`
                : undefined
            }
            confirmLabel="Anular línea"
            onCancel={() => setDialogo(null)}
            onConfirm={(motivo) =>
              dialogo?.tipo === "anular_linea"
                ? ejecutarAccion(
                    { accion: "anular_linea", motivo, lineaId: dialogo.linea.id },
                    "Línea anulada y auditada.",
                  )
                : undefined
            }
          />

          <ConfirmDialog
            open={dialogo?.tipo === "reimprimir"}
            title="Reimprimir documentos"
            description="Se crea un trabajo de impresión y queda registrado."
            impacto="Se reimprimirá la precuenta del pedido en la impresora de caja."
            confirmLabel="Reimprimir"
            onCancel={() => setDialogo(null)}
            onConfirm={(motivo) =>
              ejecutarAccion({ accion: "reimprimir", motivo, documento: "precuenta" }, "Trabajo de impresión registrado.")
            }
          />

          <ConfirmDialog
            open={dialogo?.tipo === "reenviar"}
            title="Reenviar comandas"
            description="Se reenvían las comandas a sus estaciones y queda registrado."
            impacto="Los documentos se enviarán de nuevo a las estaciones de cocina y barra."
            confirmLabel="Reenviar"
            onCancel={() => setDialogo(null)}
            onConfirm={(motivo) => ejecutarAccion({ accion: "reenviar", motivo }, "Comandas reenviadas a las estaciones.")}
          />

          <ReasignarDialog
            open={dialogo?.tipo === "reasignar"}
            mesaActual={pedido.mesa}
            meseroActual={pedido.mesero}
            onCancel={() => setDialogo(null)}
            onConfirm={(payload) =>
              ejecutarAccion({ accion: "reasignar", motivo: payload.motivo, mesa: payload.mesa, mesero: payload.mesero }, "Mesa/mesero reasignados y auditados.")
            }
          />

          <ReembolsoDialog
            open={dialogo?.tipo === "reembolso"}
            pago={dialogo?.tipo === "reembolso" ? dialogo.pago : null}
            onCancel={() => setDialogo(null)}
            onConfirm={(payload) => {
              if (!pedidoId || !(dialogo?.tipo === "reembolso")) return
              reembolso.mutate(
                {
                  id: pedidoId,
                  pagoId: dialogo.pago.id,
                  tipo: payload.tipo as ReembolsoTipo,
                  montoCentavos: payload.montoCentavos,
                  motivo: payload.motivo,
                },
                {
                  onSuccess: () => mostrar("Reembolso registrado y conciliado con el pago original.", "exito"),
                  onError: (error) =>
                    mostrar(error instanceof ApiError ? error.message : "No se pudo registrar el reembolso.", "error"),
                  onSettled: () => setDialogo(null),
                },
              )
            }}
          />
        </>
      ) : null}
    </Drawer>
  )
}
