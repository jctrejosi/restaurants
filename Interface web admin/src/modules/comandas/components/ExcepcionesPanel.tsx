import { useState } from "react"
import { ExternalLink } from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { FilterBar } from "@/components/data/FilterBar"
import { IconButton } from "@/components/ui/IconButton"
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge"
import { SelectField } from "@/components/ui/fields"
import { formatDateTime, formatRelative } from "@/lib/format"
import { useSede } from "@/app/sede"
import { useExcepciones } from "@/modules/comandas/api"
import {
  ORIGEN_AGOTADO_LABEL,
  TIPO_EXCEPCION_LABEL,
  type Excepcion,
  type TipoExcepcion,
} from "@/modules/comandas/types"

const TIPO_TONE: Record<TipoExcepcion, StatusTone> = {
  anulacion: "gray",
  reimpresion: "blue",
  agotado: "amber",
}

/** Anulaciones, reimpresiones y agotados con responsable (RF-R5-63). */
export function ExcepcionesPanel({
  onVerAuditoria,
}: {
  onVerAuditoria: (auditoriaId: string, etiqueta: string) => void
}) {
  const [tipo, setTipo] = useState("")
  const { data, isLoading, isError, refetch } = useExcepciones(tipo || undefined)
  const { zonaHoraria } = useSede()

  const columnas: Column<Excepcion>[] = [
    {
      key: "tipo",
      header: "Tipo",
      cell: (row) => <StatusBadge tone={TIPO_TONE[row.tipo]}>{TIPO_EXCEPCION_LABEL[row.tipo]}</StatusBadge>,
    },
    {
      key: "referencia",
      header: "Comanda / pedido",
      cell: (row) => (
        <>
          <span className="order-id">{row.comandaNumero ? `#${row.comandaNumero}` : "—"}</span>
          <span className="order-type">{row.pedidoFolio ?? "Sin pedido"}</span>
        </>
      ),
    },
    {
      key: "detalle",
      header: "Detalle",
      cell: (row) => (
        <>
          <span className="order-type">{row.detalle}</span>
          {row.producto ? <span className="order-id">{row.producto}</span> : null}
        </>
      ),
    },
    { key: "estacion", header: "Estación", cell: (row) => row.estacionNombre ?? "—" },
    {
      key: "origen",
      header: "Origen",
      cell: (row) => (row.origen ? ORIGEN_AGOTADO_LABEL[row.origen] : "—"),
    },
    { key: "responsable", header: "Responsable", cell: (row) => row.responsable },
    {
      key: "ocurrida",
      header: "Ocurrida",
      cell: (row) => (
        <>
          <span className="order-id">{formatDateTime(row.ocurridaEn, zonaHoraria)}</span>
          <span className="order-type">{formatRelative(row.ocurridaEn)}</span>
        </>
      ),
    },
    {
      key: "auditoria",
      header: "",
      align: "right",
      cell: (row) => (
        <IconButton
          label={`Ver auditoría de ${row.comandaNumero ? `comanda #${row.comandaNumero}` : row.producto ?? "la excepción"}`}
          onClick={() =>
            onVerAuditoria(
              row.auditoriaId,
              row.comandaNumero ? `comanda #${row.comandaNumero}` : row.producto ?? "la excepción",
            )
          }
        >
          <ExternalLink size={15} />
        </IconButton>
      ),
    },
  ]

  const filtrosActivos = tipo
    ? [{ key: "tipo", label: TIPO_EXCEPCION_LABEL[tipo as TipoExcepcion] }]
    : []

  return (
    <div className="excepciones-panel">
      <FilterBar activeFilters={filtrosActivos} onClear={() => setTipo("")}>
        <SelectField
          label="Tipo de excepción"
          placeholder="Todas"
          value={tipo}
          onChange={(event) => setTipo(event.target.value)}
          options={[
            { value: "anulacion", label: "Anulaciones" },
            { value: "reimpresion", label: "Reimpresiones" },
            { value: "agotado", label: "Agotados" },
          ]}
        />
      </FilterBar>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Excepciones del turno</div>
            <div className="panel__subtitle">
              {data
                ? `${data.resumen.anulaciones} anulaciones · ${data.resumen.reimpresiones} reimpresiones · ${data.resumen.agotados} agotados`
                : "Anulaciones, reimpresiones y agotados con responsable y enlace a auditoría"}
            </div>
          </div>
        </div>
        <DataTable
          columns={columnas}
          rows={data?.excepciones ?? []}
          getRowKey={(row) => row.id}
          loading={isLoading}
          error={isError ? new Error("No se pudieron cargar las excepciones") : null}
          onRetry={() => void refetch()}
          emptyTitle="Sin excepciones"
          emptyDescription="No se registran anulaciones, reimpresiones ni agotados con este filtro."
        />
      </section>
    </div>
  )
}
