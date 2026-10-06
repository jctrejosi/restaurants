import { useState } from "react"
import { Info, Plus } from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useToast } from "@/components/ui/toast"
import { useMediosPago } from "@/modules/caja/api"
import { MEDIO_PAGO_TIPO_LABEL, type MedioPago } from "@/modules/caja/types"
import { MedioPagoForm } from "@/modules/caja/components/MedioPagoForm"

/** Medios de pago por sede: un medio deshabilitado no se ofrece (CA-11-04). */
export function MediosPagoTab({ puedeEditar }: { puedeEditar: boolean }) {
  const { mostrar } = useToast()
  const { data, isLoading, isError, error, refetch } = useMediosPago()
  const [formOpen, setFormOpen] = useState(false)
  const [enEdicion, setEnEdicion] = useState<MedioPago | null>(null)

  const columnas: Column<MedioPago>[] = [
    {
      key: "nombre",
      header: "Medio",
      cell: (medio) => (
        <div>
          <strong>{medio.nombre}</strong>
          <div className="caja-medio__meta">{MEDIO_PAGO_TIPO_LABEL[medio.tipo]}</div>
        </div>
      ),
    },
    {
      key: "referencia",
      header: "Referencia",
      cell: (medio) => (medio.requiereReferencia ? "Obligatoria" : "No requiere"),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (medio) =>
        medio.activo ? (
          <StatusBadge tone="green">Activo</StatusBadge>
        ) : (
          <StatusBadge tone="gray" title="No se ofrece en cobro; los pagos históricos se conservan.">
            Deshabilitado
          </StatusBadge>
        ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      cell: (medio) => (
        <Button
          variant="ghost"
          className="text-action"
          disabled={!puedeEditar}
          title={puedeEditar ? undefined : "Requiere permiso de caja.medios"}
          onClick={(event) => {
            event.stopPropagation()
            setEnEdicion(medio)
            setFormOpen(true)
          }}
        >
          Editar
        </Button>
      ),
    },
  ]

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <div className="panel__title">Medios de pago de la sede</div>
          <div className="panel__subtitle">
            Un medio deshabilitado no se ofrece en las interfaces de cobro; los pagos ya registrados se conservan.
          </div>
        </div>
        <Button
          variant="primary"
          disabled={!puedeEditar}
          title={puedeEditar ? undefined : "Requiere permiso de caja.medios"}
          onClick={() => {
            setEnEdicion(null)
            setFormOpen(true)
          }}
        >
          <Plus size={16} /> Nuevo medio
        </Button>
      </div>

      <div className="module-notice caja-nota" role="note">
        <Info size={16} aria-hidden="true" />
        <span>Los cambios de alta y edición quedan auditados con el antes y el después.</span>
      </div>

      <DataTable
        columns={columnas}
        rows={data?.data ?? []}
        getRowKey={(medio) => medio.id}
        loading={isLoading}
        error={isError ? (error as Error) : null}
        onRetry={() => void refetch()}
        emptyTitle="Aún no hay medios de pago en esta sede"
        emptyDescription="Crea el primero para poder cobrar con él."
      />

      <MedioPagoForm
        open={formOpen}
        medio={enEdicion}
        onCancel={() => setFormOpen(false)}
        onGuardado={(medio) => {
          setFormOpen(false)
          mostrar(`Medio «${medio.nombre}» guardado.`, "exito")
        }}
      />
    </section>
  )
}
