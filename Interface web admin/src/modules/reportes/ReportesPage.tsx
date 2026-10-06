import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Database, Download, FileSpreadsheet, Plus, RefreshCw, Save, Sparkles } from "lucide-react"
import { PageHeader } from "@/components/data/PageHeader"
import { SavedViewChip } from "@/components/data/SavedViewChip"
import { Tabs, type TabItem } from "@/components/data/Tabs"
import { Button } from "@/components/ui/Button"
import { NoPermissionState } from "@/components/ui/states"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import {
  useComparativoReporte,
  useDesempenoReporte,
  useExportarReporte,
  useImpuestosReporte,
  useProgramadosReporte,
  useReservasReporte,
  useVentasReporte,
} from "@/modules/reportes/api"
import { ComparativoPanel, DesempenoPanel, ImpuestosPanel } from "@/modules/reportes/components/PanelesV1"
import { ProgramadosPanel } from "@/modules/reportes/components/ProgramadosPanel"
import { ReportBuilder } from "@/modules/reportes/components/ReportBuilder"
import { ReservasPanel } from "@/modules/reportes/components/ReservasPanel"
import { TableroPanel } from "@/modules/reportes/components/TableroPanel"
import { FreshnessBadge } from "@/modules/reportes/components/FreshnessBadge"
import { VentasPanel } from "@/modules/reportes/components/VentasPanel"
import {
  AGRUPACION_LABEL,
  CANAL_LABEL,
  METRICA_LABEL,
  MODALIDAD_LABEL,
  PERIODO_LABEL,
  type Agrupacion,
  type CanalReporte,
  type MetricaReporte,
  type ModalidadReporte,
  type PeriodoReporte,
  type ReporteFiltros,
} from "@/modules/reportes/types"
import "@/modules/reportes/reportes.css"

const STORAGE_VISTAS = "pc_reportes_vistas"

type VistaGuardada = { id: string; label: string; query: string }

const METRICAS: MetricaReporte[] = [
  "ventas",
  "reservas",
  "desempeno",
  "impuestos",
  "comparativo",
  "programados",
  "tablero",
]

const SUFIJO: Partial<Record<MetricaReporte, string>> = {
  desempeno: "V1",
  impuestos: "V1",
  comparativo: "V1",
  programados: "V1",
  tablero: "V2",
}

const TIPO_EXPORTACION: Partial<Record<MetricaReporte, string>> = {
  ventas: "reporte_ventas",
  reservas: "reporte_reservas",
  desempeno: "reporte_desempeno",
  impuestos: "reporte_impuestos",
  comparativo: "reporte_comparativo",
}

function leerVistas(): VistaGuardada[] {
  if (typeof localStorage === "undefined") return []
  try {
    const bruto = localStorage.getItem(STORAGE_VISTAS)
    if (!bruto) return []
    const parseado = JSON.parse(bruto) as unknown
    return Array.isArray(parseado) ? (parseado as VistaGuardada[]) : []
  } catch {
    return []
  }
}

function useReloj(ms: number): Date {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setAhora(new Date()), ms)
    return () => clearInterval(timer)
  }, [ms])
  return ahora
}

function fechaLocalISO(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`
}

/** Rango efectivo de fechas del período elegido (para el drill-down a pedidos). */
function rangoDe(filtros: ReporteFiltros): { desde: string; hasta: string } {
  const hoy = new Date()
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  if (filtros.periodo === "ayer") {
    const ayer = new Date(inicio)
    ayer.setDate(ayer.getDate() - 1)
    return { desde: fechaLocalISO(ayer), hasta: fechaLocalISO(ayer) }
  }
  if (filtros.periodo === "semana") {
    const desde = new Date(inicio)
    desde.setDate(desde.getDate() - 6)
    return { desde: fechaLocalISO(desde), hasta: fechaLocalISO(inicio) }
  }
  if (filtros.periodo === "mes") {
    return { desde: fechaLocalISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: fechaLocalISO(inicio) }
  }
  if (filtros.periodo === "rango" && filtros.desde && filtros.hasta) {
    return { desde: filtros.desde, hasta: filtros.hasta }
  }
  return { desde: fechaLocalISO(inicio), hasta: fechaLocalISO(inicio) }
}

export default function ReportesPage() {
  const { tienePermiso } = useAuth()
  const { sedeId } = useSede()
  const { mostrar } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [vistas, setVistas] = useState<VistaGuardada[]>(() => leerVistas())
  const ahora = useReloj(30_000)
  const exportar = useExportarReporte()

  const metricaParam = searchParams.get("metrica") as MetricaReporte | null
  const metrica: MetricaReporte = metricaParam && METRICAS.includes(metricaParam) ? metricaParam : "ventas"
  const filtros: ReporteFiltros = useMemo(
    () => ({
      metrica,
      periodo: ((searchParams.get("periodo") as PeriodoReporte) || "semana") as PeriodoReporte,
      desde: searchParams.get("desde") ?? undefined,
      hasta: searchParams.get("hasta") ?? undefined,
      agrupacion: ((searchParams.get("agrupacion") as Agrupacion) || "dia") as Agrupacion,
      canal: (searchParams.get("canal") as CanalReporte | null) ?? "",
      modalidad: (searchParams.get("modalidad") as ModalidadReporte | null) ?? "",
      categoriaId: searchParams.get("categoria") ?? undefined,
      productoId: searchParams.get("producto") ?? undefined,
      estacionId: searchParams.get("estacion") ?? undefined,
      mesero: searchParams.get("mesero") ?? undefined,
      comparar: searchParams.get("comparar") === "1",
      dimension: searchParams.get("dimension") ?? "mesero",
      metricaComparada: searchParams.get("metrica_comparada") ?? "ventas",
    }),
    [metrica, searchParams],
  )

  /* Los hooks se comparten con cada panel por queryKey: sin peticiones extra. */
  const ventas = useVentasReporte(filtros, sedeId, metrica === "ventas" || metrica === "tablero")
  const reservas = useReservasReporte({ ...filtros, metrica: "reservas" }, sedeId, metrica === "reservas")
  const desempeno = useDesempenoReporte(filtros, sedeId, metrica === "desempeno")
  const impuestos = useImpuestosReporte(filtros, sedeId, metrica === "impuestos")
  const comparativo = useComparativoReporte(filtros, sedeId, metrica === "comparativo")
  const programados = useProgramadosReporte(metrica === "programados")

  const actualizadoEn =
    metrica === "ventas" || metrica === "tablero"
      ? ventas.data?.actualizadoEn
      : metrica === "reservas"
        ? reservas.data?.actualizadoEn
        : metrica === "desempeno"
          ? desempeno.data?.actualizadoEn
          : metrica === "impuestos"
            ? impuestos.data?.actualizadoEn
            : metrica === "comparativo"
              ? comparativo.data?.actualizadoEn
              : metrica === "programados"
                ? programados.data?.actualizadoEn
                : undefined

  const puedeVer = tienePermiso("reportes.ver")
  const puedeExportar = tienePermiso("reportes.exportar")
  const puedeProgramar = tienePermiso("reportes.programar")

  if (!puedeVer) {
    return (
      <div className="module-page">
        <PageHeader
          eyebrow="Analítica / Reportes"
          title="Reportes"
          subtitle="Ventas, reservas, desempeño, impuestos, comparativos y reportes programados."
        />
        <NoPermissionState permiso="reportes.ver" />
      </div>
    )
  }

  const actualizar = (cambios: Record<string, string | undefined>) => {
    const siguiente = new URLSearchParams(searchParams)
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === undefined || valor === "") siguiente.delete(clave)
      else siguiente.set(clave, valor)
    }
    setSearchParams(siguiente, { replace: true })
  }

  const limpiarFiltros = () => {
    const siguiente = new URLSearchParams()
    siguiente.set("metrica", metrica)
    setSearchParams(siguiente, { replace: true })
  }

  const guardarVista = () => {
    const actual = new URLSearchParams(searchParams)
    const query = actual.toString()
    if (vistas.some((vista) => vista.query === query)) {
      mostrar("Esa vista ya está guardada.")
      return
    }
    const etiquetas = [
      METRICA_LABEL[metrica],
      filtros.periodo === "rango" && filtros.desde ? `${filtros.desde} → ${filtros.hasta ?? "…"}` : PERIODO_LABEL[filtros.periodo],
      filtros.canal ? CANAL_LABEL[filtros.canal] : null,
      filtros.modalidad ? MODALIDAD_LABEL[filtros.modalidad] : null,
      filtros.agrupacion !== "dia" ? AGRUPACION_LABEL[filtros.agrupacion] : null,
    ].filter(Boolean)
    const vista: VistaGuardada = {
      id: `v-${Date.now()}`,
      label: etiquetas.join(" · "),
      query,
    }
    const siguientes = [...vistas, vista]
    setVistas(siguientes)
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_VISTAS, JSON.stringify(siguientes))
    mostrar(`Vista «${vista.label}» guardada.`, "exito")
  }

  const eliminarVista = (id: string) => {
    const siguientes = vistas.filter((vista) => vista.id !== id)
    setVistas(siguientes)
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_VISTAS, JSON.stringify(siguientes))
  }

  const exportarReporte = () => {
    const tipo = TIPO_EXPORTACION[metrica]
    if (!tipo) {
      mostrar("Esta vista no tiene un formato de exportación definido. Usa «Programar reporte».", "info")
      return
    }
    exportar.mutate(
      {
        tipo,
        formato: metrica === "impuestos" ? "xlsx" : "csv",
        filtros: {
          periodo: filtros.periodo,
          desde: filtros.desde ?? null,
          hasta: filtros.hasta ?? null,
          canal: filtros.canal ?? null,
          modalidad: filtros.modalidad ?? null,
          categoria: filtros.categoriaId ?? null,
          estacion: filtros.estacionId ?? null,
          mesero: filtros.mesero ?? null,
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

  const abrirPedidos = () => {
    const rango = rangoDe(filtros)
    const query = new URLSearchParams()
    query.set("desde", rango.desde)
    query.set("hasta", rango.hasta)
    if (filtros.canal) query.set("canal", filtros.canal)
    if (filtros.modalidad) query.set("modalidad", filtros.modalidad)
    if (filtros.mesero) query.set("mesero", filtros.mesero)
    navigate(`/pedidos?${query.toString()}`)
  }

  const abrirProducto = (productoId: string) => {
    navigate(`/catalogo/${productoId}`)
  }

  const tabs: TabItem[] = METRICAS.map((valor) => ({
    id: valor,
    label: SUFIJO[valor] ? `${METRICA_LABEL[valor]} · ${SUFIJO[valor]}` : METRICA_LABEL[valor],
  }))

  const mostrarBuilder = metrica !== "programados" && metrica !== "tablero"

  return (
    <div className="module-page reportes-page">
      <PageHeader
        eyebrow="Analítica / Reportes"
        title="Reportes"
        subtitle="Constructor de reportes sobre los agregados de analytics: ventas, reservas, desempeño, impuestos y comparativos."
        actions={
          <>
            <FreshnessBadge actualizadoEn={actualizadoEn} ahora={ahora} />
            <Button
              variant="secondary"
              onClick={() => void queryClient.invalidateQueries({ queryKey: ["reportes"] })}
              title="Vuelve a consultar los agregados"
            >
              <RefreshCw size={15} /> Actualizar
            </Button>
            <Button variant="secondary" disabled={!puedeExportar || exportar.isPending} title={puedeExportar ? undefined : "Requiere permiso reportes.exportar"} onClick={exportarReporte}>
              <Download size={15} /> {exportar.isPending ? "Registrando…" : "Exportar"}
            </Button>
            <Button variant="secondary" onClick={guardarVista}>
              <Save size={15} /> Guardar vista
            </Button>
            {metrica === "programados" ? null : (
              <Button variant="primary" onClick={() => actualizar({ metrica: "programados" })}>
                <Plus size={15} /> Programar
              </Button>
            )}
          </>
        }
      />

      <div className="module-notice" role="note">
        <Database size={18} aria-hidden="true" />
        <span>
          <strong>Ninguna consulta toca la operación en caliente (RN-R5-03).</strong> Las cifras salen de los
          agregados de analytics y se concilian con caja y facturación del mismo período; el refresco corre cada
          minuto (RNF-R5-02).
        </span>
      </div>

      <Tabs tabs={tabs} value={metrica} onChange={(id) => actualizar({ metrica: id })} />

      {vistas.length > 0 ? (
        <div className="report-views">
          <span className="report-views__label">
            <Sparkles size={13} aria-hidden="true" /> Vistas guardadas:
          </span>
          {vistas.map((vista) => (
            <SavedViewChip
              key={vista.id}
              label={vista.label}
              active={vista.query === searchParams.toString()}
              onClick={() => setSearchParams(new URLSearchParams(vista.query), { replace: true })}
              onRemove={() => eliminarVista(vista.id)}
            />
          ))}
        </div>
      ) : null}

      {mostrarBuilder ? (
        <ReportBuilder
          filtros={filtros}
          onChange={actualizar}
          onLimpiar={limpiarFiltros}
          acciones={
            metrica === "ventas" ? (
              <Button variant="secondary" onClick={() => abrirPedidos()}>
                <FileSpreadsheet size={15} /> Drill-down a pedidos
              </Button>
            ) : null
          }
        />
      ) : null}

      {metrica === "ventas" ? (
        <VentasPanel filtros={filtros} sedeId={sedeId} onAbrirPedidos={abrirPedidos} onAbrirProducto={abrirProducto} />
      ) : metrica === "reservas" ? (
        <ReservasPanel filtros={filtros} sedeId={sedeId} />
      ) : metrica === "desempeno" ? (
        <DesempenoPanel filtros={filtros} sedeId={sedeId} />
      ) : metrica === "impuestos" ? (
        <ImpuestosPanel filtros={filtros} sedeId={sedeId} />
      ) : metrica === "comparativo" ? (
        <ComparativoPanel filtros={filtros} sedeId={sedeId} />
      ) : metrica === "programados" ? (
        <ProgramadosPanel puedeProgramar={puedeProgramar} />
      ) : (
        <TableroPanel filtros={filtros} sedeId={sedeId} />
      )}
    </div>
  )
}
