import { useMemo, useState } from "react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { MoneyCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { SelectField } from "@/components/ui/fields"
import { useSede } from "@/app/sede"
import { formatDateTime } from "@/lib/format"
import { useFacturaDetalle, useFacturas } from "@/modules/facturacion/api"
import type { FacturaFila } from "@/modules/facturacion/types"
import { EstadoDianBadge } from "@/modules/facturacion/components/EstadoDianBadge"
import { NotaCreditoDialog } from "@/modules/facturacion/components/NotaCreditoDialog"

/** Notas crédito emitidas y emisión V1 sobre facturas aceptadas (con motivo). */
export function NotasCreditoTab({
  puedeNotas,
  onAbrirFactura,
}: {
  puedeNotas: boolean
  onAbrirFactura: (facturaId: string) => void
}) {
  const { zonaHoraria } = useSede()
  const [facturaSeleccionada, setFacturaSeleccionada] = useState("")
  const [dialogoOpen, setDialogoOpen] = useState(false)

  const notas = useFacturas({ tipo: "nota_credito", pageSize: 50 })
  const aceptadas = useFacturas({ tipo: "factura", estado: "aceptada", pageSize: 50 })
  const { data: facturaDetalle } = useFacturaDetalle(dialogoOpen ? facturaSeleccionada || null : null)

  const opciones = useMemo(
    () =>
      (aceptadas.data?.data ?? []).map((factura) => ({
        value: factura.id,
        label: `${factura.prefijo}-${factura.numero} · ${factura.pedidoCodigo}`,
      })),
    [aceptadas.data],
  )

  const columnas: Column<FacturaFila>[] = [
    {
      key: "numero",
      header: "Nota crédito",
      cell: (nota) => <span className="order-id">{`${nota.prefijo}-${nota.numero}`}</span>,
    },
    { key: "pedido", header: "Pedido", cell: (nota) => nota.pedidoCodigo },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (nota) => <MoneyCell centavos={nota.totalCentavos} />,
    },
    { key: "estado", header: "Estado", cell: (nota) => <EstadoDianBadge estado={nota.estadoDian} /> },
    {
      key: "emitida",
      header: "Emitida",
      cell: (nota) => formatDateTime(nota.emitidaEn, zonaHoraria),
    },
    {
      key: "original",
      header: "Factura original",
      cell: (nota) => (
        <Button
          variant="ghost"
          className="text-action"
          onClick={(event) => {
            event.stopPropagation()
            onAbrirFactura(nota.facturaOriginalId ?? nota.id)
          }}
        >
          Ver original
        </Button>
      ),
    },
  ]

  return (
    <>
      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Emitir nota crédito</div>
            <div className="panel__subtitle">
              Solo sobre facturas aceptadas; la numeración respeta la resolución y queda auditada.
            </div>
          </div>
        </div>
        <div className="panel__body facturacion-notas__barra">
          <SelectField
            label="Factura aceptada"
            placeholder="Selecciona una factura"
            options={opciones}
            value={facturaSeleccionada}
            disabled={!puedeNotas}
            onChange={(event) => setFacturaSeleccionada(event.target.value)}
          />
          <Button
            variant="primary"
            disabled={!puedeNotas || !facturaSeleccionada}
            title={puedeNotas ? undefined : "Requiere permiso de facturacion.notas"}
            onClick={() => setDialogoOpen(true)}
          >
            Emitir nota crédito
          </Button>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Notas crédito emitidas</div>
            <div className="panel__subtitle">Documentos relacionados con su factura original.</div>
          </div>
        </div>
        <DataTable
          columns={columnas}
          rows={notas.data?.data ?? []}
          getRowKey={(nota) => nota.id}
          onRowClick={(nota) => onAbrirFactura(nota.id)}
          loading={notas.isLoading}
          error={notas.isError ? (notas.error as Error) : null}
          onRetry={() => void notas.refetch()}
          emptyTitle="Aún no hay notas crédito"
          emptyDescription="Se generan al anular una factura aceptada; quedan enlazadas a su factura original."
        />
      </section>

      {!puedeNotas ? <p className="facturacion-meta">Emisión deshabilitada: requiere permiso de facturacion.notas.</p> : null}

      {facturaDetalle ? (
        <NotaCreditoDialog
          open={dialogoOpen}
          factura={facturaDetalle}
          onCancel={() => setDialogoOpen(false)}
          onEmitida={() => {
            setDialogoOpen(false)
            setFacturaSeleccionada("")
            void notas.refetch()
            void aceptadas.refetch()
          }}
        />
      ) : null}
    </>
  )
}
