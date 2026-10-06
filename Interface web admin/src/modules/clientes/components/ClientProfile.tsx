import { useEffect, useMemo, useState } from "react"
import { ShieldAlert, ShieldCheck } from "lucide-react"
import { Tabs, type TabItem } from "@/components/data/Tabs"
import { Drawer } from "@/components/ui/Drawer"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/states"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { formatDateTime, maskName } from "@/lib/format"
import { useClienteDetalle } from "@/modules/clientes/api"
import { AccessLogTable } from "@/modules/clientes/components/AccessLogTable"
import { ArcoPanel } from "@/modules/clientes/components/ArcoPanel"
import { ClientHistorialTab } from "@/modules/clientes/components/ClientHistorialTab"
import { ClientResumenTab } from "@/modules/clientes/components/ClientResumenTab"
import { ConsentList } from "@/modules/clientes/components/ConsentList"
import { MARKETING_LABEL, MARKETING_TONE } from "@/modules/clientes/types"

export type ClienteTab = "resumen" | "historial" | "consentimientos" | "arco" | "actividad"

function useAnchoDrawer(): number {
  const [ancho, setAncho] = useState(() =>
    typeof window === "undefined" ? 880 : Math.min(880, Math.round(window.innerWidth * 0.96)),
  )
  useEffect(() => {
    const onResize = () => setAncho(Math.min(880, Math.round(window.innerWidth * 0.96)))
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  return ancho
}

/** Ficha del cliente (RF-R5-90) con Resumen, Historial, Consentimientos, ARCO y Actividad. */
export function ClientProfile({
  clienteId,
  open,
  tab,
  conDatos,
  zonaHoraria,
  onTabChange,
  onClose,
}: {
  clienteId: string | null
  open: boolean
  tab: ClienteTab
  conDatos: boolean
  zonaHoraria: string
  onTabChange: (tab: ClienteTab) => void
  onClose: () => void
}) {
  const { data: cliente, isLoading, isError, refetch } = useClienteDetalle(open ? clienteId : null, conDatos)
  const ancho = useAnchoDrawer()

  const tabs = useMemo<TabItem[]>(() => {
    if (!cliente) {
      return [
        { id: "resumen", label: "Resumen" },
        { id: "historial", label: "Historial" },
        { id: "consentimientos", label: "Consentimientos" },
        { id: "arco", label: "ARCO" },
        { id: "actividad", label: "Actividad" },
      ]
    }
    return [
      { id: "resumen", label: "Resumen" },
      { id: "historial", label: "Historial", badge: String(cliente.historial.length) },
      { id: "consentimientos", label: "Consentimientos" },
      { id: "arco", label: "ARCO" },
      { id: "actividad", label: "Actividad", badge: String(cliente.accesos.length) },
    ]
  }, [cliente])

  const titulo = cliente ? (conDatos ? cliente.nombre : maskName(cliente.nombre)) : "Ficha del cliente"

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={ancho}
      title={titulo}
      subtitle={
        cliente
          ? `${cliente.id.toUpperCase()} · cliente desde ${formatDateTime(cliente.creadoEn, zonaHoraria)}`
          : "Cargando información…"
      }
    >
      {isError ? (
        <ErrorState
          title="No pudimos cargar la ficha"
          description="Revisa tu conexión e inténtalo de nuevo. Si otro usuario la modificó, recarga."
          onRetry={() => void refetch()}
        />
      ) : isLoading || !cliente ? (
        <SkeletonRows rows={6} columns={4} />
      ) : (
        <>
          <div className="cliente-entity">
            <StatusBadge tone={MARKETING_TONE[cliente.marketing]}>{MARKETING_LABEL[cliente.marketing]}</StatusBadge>
            {cliente.anonimizado ? <StatusBadge tone="gray">Anonimizado</StatusBadge> : null}
            {cliente.segmentos.map((segmento) => (
              <span className="cliente-tag" key={segmento}>
                {segmento}
              </span>
            ))}
            <span className="order-type">
              {cliente.pedidos} pedidos · {cliente.reservasActivas} reservas activas
            </span>
          </div>

          {conDatos && !cliente.anonimizado ? (
            <p className="clientes-alert cliente-aviso-pii">
              <ShieldCheck size={13} /> Consulta con datos completos registrada en auditoría (RNF-R5-09).
            </p>
          ) : null}

          {cliente.anonimizado ? (
            <p className="clientes-alert clientes-alert--late">
              <ShieldAlert size={13} /> Cliente anonimizado: se conservan importes, fechas, códigos y facturas para los
              reportes fiscales; los datos personales no se pueden recuperar.
            </p>
          ) : null}

          <Tabs tabs={tabs} value={tab} onChange={(id) => onTabChange(id as ClienteTab)} />

          {tab === "resumen" ? (
            <ClientResumenTab
              cliente={cliente}
              puedeVerPii={conDatos}
              zonaHoraria={zonaHoraria}
              onRecargar={() => void refetch()}
            />
          ) : null}

          {tab === "historial" ? (
            <ClientHistorialTab historial={cliente.historial} zonaHoraria={zonaHoraria} />
          ) : null}

          {tab === "consentimientos" ? (
            <ConsentList clienteId={cliente.id} marketing={cliente.marketing} zonaHoraria={zonaHoraria} />
          ) : null}

          {tab === "arco" ? (
            <ArcoPanel cliente={cliente} zonaHoraria={zonaHoraria} onIrARectificacion={() => onTabChange("resumen")} />
          ) : null}

          {tab === "actividad" ? (
            <div className="cliente-tab">
              <p className="clientes-hint">
                Quién vio qué y cuándo: consultas con datos completos, exportaciones, rectificaciones,
                consentimientos y anonimización (RNF-R5-09).
              </p>
              <AccessLogTable accesos={cliente.accesos} zonaHoraria={zonaHoraria} />
            </div>
          ) : null}
        </>
      )}
    </Drawer>
  )
}
