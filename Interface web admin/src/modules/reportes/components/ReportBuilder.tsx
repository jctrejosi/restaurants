import type { ReactNode } from "react"
import { CalendarRange, GitCompareArrows } from "lucide-react"
import { FilterBar, type ActiveFilter } from "@/components/data/FilterBar"
import { Button } from "@/components/ui/Button"
import { SelectField, TextField } from "@/components/ui/fields"
import { useSede } from "@/app/sede"
import {
  AGRUPACION_LABEL,
  CANAL_LABEL,
  MODALIDAD_LABEL,
  PERIODO_LABEL,
  type Agrupacion,
  type CanalReporte,
  type MetricaComparada,
  type ModalidadReporte,
  type PeriodoReporte,
  type ReporteFiltros,
} from "@/modules/reportes/types"
import {
  CATEGORIAS_REPORTE,
  ESTACIONES_REPORTE,
  MESEROS_REPORTE,
  PRODUCTOS_REPORTE,
} from "@/modules/reportes/api"

const PERIODOS: PeriodoReporte[] = ["hoy", "ayer", "semana", "mes", "rango"]

/**
 * Constructor del reporte (plan 14 §3): métrica + período + filtros + agrupación
 * + comparativos. Todo cambio vive en la URL (consulta compartible).
 */
export function ReportBuilder({
  filtros,
  onChange,
  onLimpiar,
  acciones,
}: {
  filtros: ReporteFiltros
  onChange: (cambios: Record<string, string | undefined>) => void
  onLimpiar: () => void
  acciones?: ReactNode
}) {
  const { sedeId, sedes, setSedeId } = useSede()

  const filtrosActivos: ActiveFilter[] = []
  if (filtros.periodo === "rango" && (filtros.desde || filtros.hasta)) {
    filtrosActivos.push({ key: "rango", label: `${filtros.desde ?? "…"} → ${filtros.hasta ?? "…"}` })
  } else {
    filtrosActivos.push({ key: "periodo", label: PERIODO_LABEL[filtros.periodo] })
  }
  if (filtros.canal) filtrosActivos.push({ key: "canal", label: `Canal: ${CANAL_LABEL[filtros.canal]}` })
  if (filtros.modalidad) {
    filtrosActivos.push({ key: "modalidad", label: `Modalidad: ${MODALIDAD_LABEL[filtros.modalidad]}` })
  }
  if (filtros.categoriaId) {
    const categoria = CATEGORIAS_REPORTE.find((item) => item.id === filtros.categoriaId)
    filtrosActivos.push({ key: "categoria", label: `Categoría: ${categoria?.nombre ?? filtros.categoriaId}` })
  }
  if (filtros.productoId) {
    const producto = PRODUCTOS_REPORTE.find((item) => item.id === filtros.productoId)
    filtrosActivos.push({ key: "producto", label: `Producto: ${producto?.nombre ?? filtros.productoId}` })
  }
  if (filtros.estacionId) {
    const estacion = ESTACIONES_REPORTE.find((item) => item.id === filtros.estacionId)
    filtrosActivos.push({ key: "estacion", label: `Estación: ${estacion?.nombre ?? filtros.estacionId}` })
  }
  if (filtros.mesero) filtrosActivos.push({ key: "mesero", label: `Mesero: ${filtros.mesero}` })
  if (filtros.agrupacion !== "dia") {
    filtrosActivos.push({ key: "agrupacion", label: `Agrupación: ${AGRUPACION_LABEL[filtros.agrupacion]}` })
  }
  if (filtros.comparar) filtrosActivos.push({ key: "comparar", label: "Comparado con período anterior" })
  if (sedeId) {
    filtrosActivos.push({
      key: "sede",
      label: `Sede: ${sedes.find((sede) => sede.id === sedeId)?.nombre ?? sedeId}`,
    })
  }

  const esComparativo = filtros.metrica === "comparativo"
  const esDesempeno = filtros.metrica === "desempeno"

  return (
    <>
      <div className="report-period" role="group" aria-label="Período del reporte">
        {PERIODOS.map((periodo) => (
          <button
            key={periodo}
            type="button"
            className={`report-period__btn ${filtros.periodo === periodo ? "report-period__btn--active" : ""}`}
            aria-pressed={filtros.periodo === periodo}
            onClick={() => onChange({ periodo })}
          >
            {PERIODO_LABEL[periodo]}
          </button>
        ))}
        <span className="report-period__range">
          <CalendarRange size={14} aria-hidden="true" />
          <TextField
            label=""
            type="date"
            aria-label="Desde"
            value={filtros.desde ?? ""}
            disabled={filtros.periodo !== "rango"}
            onChange={(event) => onChange({ periodo: "rango", desde: event.target.value })}
          />
          <span className="report-period__sep">→</span>
          <TextField
            label=""
            type="date"
            aria-label="Hasta"
            value={filtros.hasta ?? ""}
            disabled={filtros.periodo !== "rango"}
            onChange={(event) => onChange({ periodo: "rango", hasta: event.target.value })}
          />
        </span>
      </div>

      <FilterBar
        activeFilters={filtrosActivos}
        onClear={onLimpiar}
        actions={
          <>
            {!esComparativo ? (
              <Button
                variant={filtros.comparar ? "primary" : "secondary"}
                aria-pressed={filtros.comparar}
                title="Compara la misma métrica contra el período anterior"
                onClick={() => onChange({ comparar: filtros.comparar ? undefined : "1" })}
              >
                <GitCompareArrows size={15} /> {filtros.comparar ? "Comparando" : "Comparar"}
              </Button>
            ) : null}
            {acciones}
          </>
        }
      >
        <SelectField
          label="Sede"
          value={sedeId ?? ""}
          onChange={(event) => setSedeId(event.target.value || null)}
          options={[{ value: "", label: "Todas las sedes" }, ...sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))]}
        />
        <SelectField
          label="Canal"
          placeholder="Todos"
          value={filtros.canal ?? ""}
          onChange={(event) => onChange({ canal: event.target.value || undefined })}
          options={Object.entries(CANAL_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <SelectField
          label="Modalidad"
          placeholder="Todas"
          value={filtros.modalidad ?? ""}
          onChange={(event) => onChange({ modalidad: event.target.value || undefined })}
          options={Object.entries(MODALIDAD_LABEL).map(([value, label]) => ({ value, label }))}
        />
        <SelectField
          label="Categoría"
          placeholder="Todas"
          value={filtros.categoriaId ?? ""}
          onChange={(event) => onChange({ categoria: event.target.value || undefined })}
          options={CATEGORIAS_REPORTE.map((categoria) => ({ value: categoria.id, label: categoria.nombre }))}
        />
        <SelectField
          label="Producto"
          placeholder="Todos"
          value={filtros.productoId ?? ""}
          onChange={(event) => onChange({ producto: event.target.value || undefined })}
          options={PRODUCTOS_REPORTE.map((producto) => ({ value: producto.id, label: producto.nombre }))}
        />
        <SelectField
          label="Estación"
          placeholder="Todas"
          value={filtros.estacionId ?? ""}
          onChange={(event) => onChange({ estacion: event.target.value || undefined })}
          options={ESTACIONES_REPORTE.map((estacion) => ({ value: estacion.id, label: estacion.nombre }))}
        />
        <SelectField
          label="Mesero"
          placeholder="Todos"
          value={filtros.mesero ?? ""}
          onChange={(event) => onChange({ mesero: event.target.value || undefined })}
          options={MESEROS_REPORTE.map((nombre) => ({ value: nombre, label: nombre }))}
        />
        {esDesempeno ? (
          <SelectField
            label="Dimensión"
            value={filtros.dimension ?? "mesero"}
            onChange={(event) => onChange({ dimension: event.target.value })}
            options={[
              { value: "mesero", label: "Por mesero" },
              { value: "cajero", label: "Por cajero" },
              { value: "turno", label: "Por turno" },
            ]}
          />
        ) : (
          <SelectField
            label="Agrupación"
            value={filtros.agrupacion}
            onChange={(event) => onChange({ agrupacion: event.target.value as Agrupacion })}
            options={(["dia", "semana", "mes"] as Agrupacion[]).map((valor) => ({
              value: valor,
              label: AGRUPACION_LABEL[valor],
            }))}
          />
        )}
        {esComparativo ? (
          <SelectField
            label="Métrica comparada"
            value={filtros.metricaComparada ?? "ventas"}
            onChange={(event) => onChange({ metrica_comparada: event.target.value as MetricaComparada })}
            options={[
              { value: "ventas", label: "Ventas" },
              { value: "pedidos", label: "Pedidos pagados" },
              { value: "ticket", label: "Ticket promedio" },
            ]}
          />
        ) : null}
      </FilterBar>
    </>
  )
}
