import { CreditCard, Undo2 } from "lucide-react"
import { MoneyCell } from "@/components/data/cells"
import { DataTable, type Column } from "@/components/data/DataTable"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/states"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { formatDateTime } from "@/lib/format"
import {
  DEPOSITO_LABEL,
  DEPOSITO_TONE,
  type MovimientoDeposito,
  type ReservaDetalle,
} from "@/modules/reservas/types"

/** Pestaña Depósito (V1, RF-R5-45): cobros y reembolsos conciliados con Caja. */
export function DepositoTab({
  reserva,
  puedeGestionar,
  puedeReembolsar,
  onRegistrar,
  onReembolsar,
  procesando,
}: {
  reserva: ReservaDetalle
  puedeGestionar: boolean
  puedeReembolsar: boolean
  onRegistrar: () => void
  onReembolsar: () => void
  procesando: boolean
}) {
  const { deposito } = reserva
  if (deposito.requeridoCentavos <= 0) {
    return (
      <EmptyState
        title="Esta reserva no requiere depósito"
        description="La política aplicada no pide anticipo. Si cambia la política de la sede, las reservas nuevas sí lo pedirán (RN-R5-04)."
      />
    )
  }

  const columnas: Column<MovimientoDeposito>[] = [
    { key: "tipo", header: "Movimiento", cell: (row) => (row.tipo === "cobro" ? "Cobro" : "Reembolso") },
    {
      key: "monto",
      header: "Monto",
      align: "right",
      cell: (row) => <MoneyCell centavos={row.tipo === "cobro" ? row.montoCentavos : -row.montoCentavos} />,
    },
    { key: "fecha", header: "Fecha", cell: (row) => formatDateTime(row.en, reserva.zonaHoraria) },
    { key: "usuario", header: "Registró", cell: (row) => row.usuario },
    { key: "motivo", header: "Motivo", cell: (row) => row.motivo ?? "—" },
    {
      key: "conciliacion",
      header: "Caja",
      cell: (row) => (
        <StatusBadge tone={row.conciliado ? "green" : "amber"}>
          {row.conciliado ? "Conciliado" : "Pendiente"}
        </StatusBadge>
      ),
    },
  ]

  const saldo = Math.max(0, deposito.requeridoCentavos - deposito.pagadoCentavos)

  return (
    <div className="reserva-deposito">
      <section className="detail-block">
        <h4>Estado del depósito</h4>
        <div className="reserva-deposito__resumen">
          <div>
            <span>Estado</span>
            <StatusBadge tone={DEPOSITO_TONE[deposito.estado]}>{DEPOSITO_LABEL[deposito.estado]}</StatusBadge>
          </div>
          <div>
            <span>Requerido</span>
            <MoneyCell centavos={deposito.requeridoCentavos} />
          </div>
          <div>
            <span>Pagado</span>
            <MoneyCell centavos={deposito.pagadoCentavos} />
          </div>
          <div>
            <span>Saldo</span>
            <MoneyCell centavos={saldo} descuento={saldo > 0} />
          </div>
        </div>
        <div className="reserva-deposito__acciones">
          <Button
            variant="primary"
            disabled={!puedeGestionar || procesando || deposito.estado === "pagado"}
            title={!puedeGestionar ? "Requiere permiso de reservas.depositos" : undefined}
            onClick={onRegistrar}
          >
            <CreditCard size={15} /> Registrar depósito
          </Button>
          <Button
            variant="secondary"
            disabled={!puedeReembolsar || procesando || deposito.pagadoCentavos <= 0}
            title={!puedeReembolsar ? "Requiere permiso de reservas.reembolsar" : undefined}
            onClick={onReembolsar}
          >
            <Undo2 size={15} /> Reembolsar
          </Button>
        </div>
        <p className="reserva-nota">
          Los depósitos se concilian con Caja y Pagos (módulos 11–12); un reembolso exige permiso y motivo (RN-R5-06).
        </p>
      </section>

      <section className="detail-block detail-block--wide reserva-deposito__movimientos">
        <h4>Movimientos</h4>
        <DataTable
          columns={columnas}
          rows={deposito.movimientos}
          getRowKey={(row) => row.id}
          emptyTitle="Sin movimientos registrados"
          emptyDescription="Registra el cobro del depósito para verlo aquí."
        />
      </section>
    </div>
  )
}
