import { DataTable, type Column } from "@/components/data/DataTable"
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge"
import { formatDateTime } from "@/lib/format"
import { ACCION_REGISTRO_LABEL, type AccesoRegistro } from "@/modules/clientes/types"

const ACCION_TONE: Record<AccesoRegistro["accion"], StatusTone> = {
  consulta: "blue",
  exportacion: "amber",
  rectificacion: "outline",
  consentimiento: "green",
  anonimizacion: "gray",
}

/** Registro de consultas sensibles y cambios de la ficha (RNF-R5-09). */
export function AccessLogTable({ accesos, zonaHoraria }: { accesos: AccesoRegistro[]; zonaHoraria: string }) {
  const columnas: Column<AccesoRegistro>[] = [
    { key: "fecha", header: "Fecha", cell: (registro) => formatDateTime(registro.fecha, zonaHoraria) },
    {
      key: "actor",
      header: "Actor",
      cell: (registro) => (
        <>
          <span className="order-id">{registro.actor}</span>
          <span className="order-type">{registro.rol}</span>
        </>
      ),
    },
    {
      key: "accion",
      header: "Acción",
      cell: (registro) => (
        <StatusBadge tone={ACCION_TONE[registro.accion]}>{ACCION_REGISTRO_LABEL[registro.accion]}</StatusBadge>
      ),
    },
    { key: "detalle", header: "Detalle", cell: (registro) => <span className="cell-wrap">{registro.detalle}</span> },
    { key: "dispositivo", header: "Dispositivo", cell: (registro) => registro.dispositivo },
  ]

  return (
    <DataTable
      columns={columnas}
      rows={accesos}
      getRowKey={(registro) => registro.id}
      emptyTitle="Sin accesos registrados"
      emptyDescription="Aquí aparecerán las consultas con datos completos, exportaciones y cambios de la ficha."
    />
  )
}
