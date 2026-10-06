import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Download, ExternalLink, RefreshCw, Timer } from "lucide-react"
import { PageHeader } from "@/components/data/PageHeader"
import { Button } from "@/components/ui/Button"
import { NoPermissionState } from "@/components/ui/states"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { useExportarTiempos, useSla, useTiempos } from "@/modules/tiempos/api"
import { FreshnessBadge } from "@/modules/tiempos/components/FreshnessBadge"
import { TimesExplorer } from "@/modules/tiempos/components/TimesExplorer"
import {
  TRAMOS,
  type DimensionPreparacion,
  type EntidadTiempo,
  type TiemposFiltros,
  type TramoId,
} from "@/modules/tiempos/types"
import "@/modules/tiempos/tiempos.css"

const TABS_VALIDAS: TramoId[] = [
  "atencion",
  "preparacion",
  "despacho",
  "ruta",
  "cobro",
  "total",
  "reserva",
  "sla",
]

function useReloj(ms: number): Date {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setAhora(new Date()), ms)
    return () => clearInterval(timer)
  }, [ms])
  return ahora
}

export default function TiemposPage() {
  const { tienePermiso } = useAuth()
  const { sedeId } = useSede()
  const { mostrar } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const ahora = useReloj(30_000)
  const exportar = useExportarTiempos()

  const tabParam = searchParams.get("tab") as TramoId | null
  const tab: TramoId = tabParam && TABS_VALIDAS.includes(tabParam) ? tabParam : "atencion"
  const sector = searchParams.get("sector") === "mostrador" ? "mostrador" : "domicilio"
  const dimension: DimensionPreparacion = searchParams.get("dimension") === "estacion" ? "estacion" : "pedido"
  const tramo: TramoId = tab === "ruta" ? (sector === "mostrador" ? "recogida" : "ruta") : tab

  const filtros: TiemposFiltros = useMemo(
    () => ({
      tramo,
      dimension,
      desde: searchParams.get("desde") ?? undefined,
      hasta: searchParams.get("hasta") ?? undefined,
      estacionId: searchParams.get("estacion") ?? undefined,
      mesero: searchParams.get("mesero") ?? undefined,
      canal: searchParams.get("canal") ?? undefined,
    }),
    [tramo, dimension, searchParams],
  )

  const tiempos = useTiempos(filtros, sedeId, tab !== "sla")
  const sla = useSla(sedeId, tab === "sla")

  const puedeVer = tienePermiso("tiempos.ver")
  const puedeExportar = tienePermiso("tiempos.exportar")

  if (!puedeVer) {
    return (
      <div className="module-page">
        <PageHeader
          eyebrow="Analítica / Tiempos y SLA"
          title="Tiempos y SLA"
          subtitle="Atención, preparación, despacho, ruta, cobro y cumplimiento de SLA con sellos del servidor."
        />
        <NoPermissionState permiso="tiempos.ver" />
      </div>
    )
  }

  const actualizadoEn = tab === "sla" ? sla.data?.actualizadoEn : tiempos.data?.actualizadoEn

  const actualizarParametros = (cambios: Record<string, string | undefined>) => {
    const siguiente = new URLSearchParams(searchParams)
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === undefined || valor === "") siguiente.delete(clave)
      else siguiente.set(clave, valor)
    }
    setSearchParams(siguiente, { replace: true })
  }

  const limpiar = () => {
    const siguiente = new URLSearchParams()
    if (tab !== "atencion") siguiente.set("tab", tab)
    setSearchParams(siguiente, { replace: true })
  }

  const exportarTramo = () => {
    const tipo =
      tab === "sla"
        ? "sla"
        : tramo === "preparacion" && dimension === "estacion"
          ? "tiempos_comandas"
          : "tiempos_pedidos"
    exportar.mutate(
      {
        tipo,
        formato: "csv",
        filtros: {
          tramo,
          dimension,
          desde: filtros.desde,
          hasta: filtros.hasta,
          estacion: filtros.estacionId,
          mesero: filtros.mesero,
          canal: filtros.canal,
        },
      },
      {
        onSuccess: (respuesta) => {
          if (respuesta.segundoPlano && respuesta.aviso) {
            mostrar(respuesta.aviso, "info")
          } else {
            mostrar(
              `Exportación ${respuesta.id} registrada (${respuesta.filasEstimadas.toLocaleString("es-MX")} filas).`,
              "exito",
            )
          }
        },
        onError: (error) =>
          mostrar(error instanceof Error ? error.message : "No se pudo registrar la exportación", "error"),
      },
    )
  }

  const abrirEntidad = (entidad: EntidadTiempo, id: string) => {
    if (entidad === "pedido") navigate(`/pedidos/${id}`)
    else if (entidad === "comanda") navigate(`/comandas/${id}`)
    else if (entidad === "reserva") navigate(`/reservas/${id}`)
    else navigate("/salon")
  }

  const irSlaEditor = () => navigate("/estaciones?sla=1")

  return (
    <div className="module-page tiempos-page">
      <PageHeader
        eyebrow="Analítica / Tiempos y SLA"
        title="Tiempos y SLA"
        subtitle={`Explorador de tramos con las fórmulas de R5 §5.3 · ${TRAMOS[tramo].descripcion}`}
        actions={
          <>
            <FreshnessBadge actualizadoEn={actualizadoEn} ahora={ahora} />
            <Button
              variant="secondary"
              onClick={() => void queryClient.invalidateQueries({ queryKey: ["tiempos"] })}
            >
              <RefreshCw size={15} /> Actualizar
            </Button>
            <Button
              variant="secondary"
              disabled={!puedeExportar || exportar.isPending}
              title={puedeExportar ? undefined : "Requiere permiso tiempos.exportar"}
              onClick={exportarTramo}
            >
              <Download size={15} /> {exportar.isPending ? "Registrando…" : "Exportar"}
            </Button>
            <Button variant="primary" onClick={irSlaEditor} title="Editar objetivos de SLA en Estaciones">
              <ExternalLink size={15} /> SlaEditor
            </Button>
          </>
        }
      />

      <div className="module-notice" role="note">
        <Timer size={18} aria-hidden="true" />
        <span>
          <strong>Todos los tiempos son restas de sellos del servidor (RN-R5-08).</strong> Sin evento de cierre la
          celda muestra «—» y el tramo no promedia; las consultas leen los agregados de `analytics` (mv_tiempos_pedido,
          mv_tiempos_comanda y mv_sla_estacion), nunca la operación en caliente.
        </span>
      </div>

      <TimesExplorer
        tramo={tramo}
        dimension={dimension}
        sector={sector}
        filtros={filtros}
        onChange={actualizarParametros}
        onLimpiar={limpiar}
        data={tiempos.data}
        isLoading={tiempos.isLoading}
        isError={tiempos.isError}
        onRetry={() => void tiempos.refetch()}
        sla={sla.data}
        slaLoading={sla.isLoading}
        slaError={sla.isError}
        onRetrySla={() => void sla.refetch()}
        onAbrirEntidad={abrirEntidad}
        onIrSlaEditor={irSlaEditor}
      />
    </div>
  )
}
