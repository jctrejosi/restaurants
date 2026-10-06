import { useMemo, useState } from "react"
import { Download, FileSpreadsheet, Plus } from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { MoneyCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SelectField, TextField, type SelectOption } from "@/components/ui/fields"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/app/auth"
import type { Sede } from "@/app/sede"
import { ApiError } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { useExportarLiquidacion, useLiquidacionAccion, useLiquidaciones, useRepartidores } from "@/modules/domicilio/api"
import {
  LIQUIDACION_ESTADO_LABEL,
  LIQUIDACION_ESTADO_TONE,
  type Liquidacion,
} from "@/modules/domicilio/types"

function haceDias(dias: number): string {
  const fecha = new Date(Date.now() - dias * 24 * 60 * 60 * 1000)
  return fecha.toISOString().slice(0, 10)
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10)
}

/** (V2) Liquidación por período: entregas, tarifas y propinas, exportable. */
export function LiquidacionTab({ sucursalId, esGlobal, sedes, onCambiarSede }: {
  sucursalId: string | null
  esGlobal: boolean
  sedes: Sede[]
  onCambiarSede: (sedeId: string | null) => void
}) {
  const { mostrar } = useToast()
  const { tienePermiso } = useAuth()
  const { data: dataRepartidores } = useRepartidores(sucursalId)
  const repartidores = dataRepartidores?.data ?? []

  const [repartidorId, setRepartidorId] = useState("")
  const [desde, setDesde] = useState(haceDias(7))
  const [hasta, setHasta] = useState(hoy())
  const [generarOpen, setGenerarOpen] = useState(false)
  const [cerrar, setCerrar] = useState<Liquidacion | null>(null)
  const [conciliar, setConciliar] = useState<Liquidacion | null>(null)

  const filtros = useMemo(
    () => ({ repartidorId: repartidorId || undefined, desde: desde || undefined, hasta: hasta || undefined }),
    [repartidorId, desde, hasta],
  )

  const { data, isLoading, isError, refetch } = useLiquidaciones(filtros)
  const accion = useLiquidacionAccion()
  const exportar = useExportarLiquidacion()

  const puedeLiquidar = tienePermiso("domicilio.liquidar")
  const puedeExportar = tienePermiso("domicilio.exportar")
  const liquidaciones = data?.data ?? []

  const opcionesRepartidor: SelectOption[] = repartidores.map((repartidor) => ({
    value: repartidor.id,
    label: repartidor.nombre,
  }))

  const nombreRepartidor = repartidores.find((repartidor) => repartidor.id === repartidorId)?.nombre

  const ejecutarGeneracion = (motivo: string) => {
    accion.mutate(
      { accion: "generar", repartidorId, periodoDesde: desde, periodoHasta: hasta, motivo },
      {
        onSuccess: (liquidacion) => {
          mostrar(
            liquidacion.estado === "abierta"
              ? `Liquidación de ${liquidacion.repartidorNombre} generada (${liquidacion.entregas} entregas).`
              : "Ese período ya tenía una liquidación; se muestra la existente.",
            "exito",
          )
          setGenerarOpen(false)
        },
        onError: (error) =>
          mostrar(error instanceof ApiError ? error.message : "No se pudo generar la liquidación.", "error"),
      },
    )
  }

  const ejecutarCierre = (liquidacion: Liquidacion, tipo: "cerrar" | "conciliar", motivo: string) => {
    accion.mutate(
      { accion: tipo, id: liquidacion.id, motivo },
      {
        onSuccess: () =>
          mostrar(
            tipo === "cerrar"
              ? `Liquidación de ${liquidacion.repartidorNombre} cerrada.`
              : `Liquidación de ${liquidacion.repartidorNombre} conciliada.`,
            "exito",
          ),
        onError: (error) =>
          mostrar(error instanceof ApiError ? error.message : "No se pudo actualizar la liquidación.", "error"),
      },
    )
    setCerrar(null)
    setConciliar(null)
  }

  const exportarPeriodo = (liquidacion: Liquidacion) => {
    exportar.mutate(liquidacion.id, {
      onSuccess: () =>
        mostrar("Exportación registrada; el archivo se genera en segundo plano y queda en `exportacion`.", "exito"),
      onError: () => mostrar("No se pudo registrar la exportación.", "error"),
    })
  }

  const columnas: Column<Liquidacion>[] = [
    {
      key: "repartidor",
      header: "Repartidor",
      cell: (liquidacion) => (
        <>
          <span className="order-id">{liquidacion.repartidorNombre}</span>
          <span className="order-type">Generada {formatDateTime(liquidacion.generadaEn)}</span>
        </>
      ),
    },
    { key: "periodo", header: "Período", cell: (liquidacion) => `${liquidacion.periodoDesde} → ${liquidacion.periodoHasta}` },
    { key: "entregas", header: "Entregas", align: "right", cell: (liquidacion) => liquidacion.entregas },
    {
      key: "tarifas",
      header: "Tarifas",
      align: "right",
      cell: (liquidacion) => <MoneyCell centavos={liquidacion.tarifasCentavos} />,
    },
    {
      key: "propinas",
      header: "Propinas",
      align: "right",
      cell: (liquidacion) => <MoneyCell centavos={liquidacion.propinasCentavos} />,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (liquidacion) => (
        <strong>
          <MoneyCell centavos={liquidacion.totalCentavos} />
        </strong>
      ),
    },
    {
      key: "estado",
      header: "Conciliación",
      cell: (liquidacion) => (
        <>
          <StatusBadge tone={LIQUIDACION_ESTADO_TONE[liquidacion.estado]}>
            {LIQUIDACION_ESTADO_LABEL[liquidacion.estado]}
          </StatusBadge>
          {liquidacion.conciliadaEn ? (
            <span className="order-type"> · {formatDateTime(liquidacion.conciliadaEn)}</span>
          ) : null}
        </>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      cell: (liquidacion) => (
        <span className="table-actions">
          {liquidacion.estado === "abierta" ? (
            <Button
              variant="secondary"
              disabled={!puedeLiquidar}
              title={puedeLiquidar ? undefined : "Requiere permiso de domicilio.liquidar"}
              onClick={() => setCerrar(liquidacion)}
            >
              Cerrar
            </Button>
          ) : null}
          {liquidacion.estado === "cerrada" ? (
            <Button
              variant="secondary"
              disabled={!puedeLiquidar}
              title={puedeLiquidar ? undefined : "Requiere permiso de domicilio.liquidar"}
              onClick={() => setConciliar(liquidacion)}
            >
              Conciliar
            </Button>
          ) : null}
          <Button
            variant="ghost"
            className="text-action"
            disabled={!puedeExportar || exportar.isPending}
            title={puedeExportar ? undefined : "Requiere permiso de domicilio.exportar"}
            onClick={() => exportarPeriodo(liquidacion)}
          >
            <Download size={13} /> Exportar
          </Button>
        </span>
      ),
    },
  ]

  return (
    <>
      <p className="domicilio-notice">
        La liquidación cuadra entregas × tarifas + propinas de pagos aprobados. Las entregas fallidas o devueltas no
        suman.
      </p>

      <div className="module-toolbar module-toolbar--wrap">
        {esGlobal ? (
          <SelectField
            label="Sede"
            options={[{ value: "", label: "Todas las sedes" }, ...sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))]}
            value={sucursalId ?? ""}
            onChange={(event) => onCambiarSede(event.target.value || null)}
          />
        ) : null}
        <SelectField
          label="Repartidor"
          options={opcionesRepartidor}
          placeholder="Todos"
          value={repartidorId}
          onChange={(event) => setRepartidorId(event.target.value)}
        />
        <TextField label="Período desde" type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
        <TextField label="Período hasta" type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
        <span className="module-toolbar__spacer" />
        <Button
          variant="primary"
          disabled={!puedeLiquidar || !repartidorId || !desde || !hasta}
          title={
            puedeLiquidar
              ? "Elige repartidor y período"
              : "Requiere permiso de domicilio.liquidar"
          }
          onClick={() => setGenerarOpen(true)}
        >
          <Plus size={16} /> Generar período
        </Button>
      </div>

      <section className="panel">
        <DataTable
          columns={columnas}
          rows={liquidaciones}
          getRowKey={(liquidacion) => liquidacion.id}
          loading={isLoading}
          error={isError ? new Error("No se pudieron cargar las liquidaciones") : null}
          onRetry={() => void refetch()}
          emptyTitle="No hay liquidaciones en el rango"
          emptyDescription="Genera un período con el repartidor y las fechas seleccionadas."
        />
      </section>

      <ConfirmDialog
        open={generarOpen}
        title={`Generar liquidación${nombreRepartidor ? ` de ${nombreRepartidor}` : ""}`}
        description="El período es idempotente por repartidor y rango de fechas: si ya existe, se reutiliza."
        impacto={`Período ${desde} → ${hasta}. Se tomarán las entregas cerradas con sello del servidor y las propinas aprobadas.`}
        confirmLabel="Generar liquidación"
        onCancel={() => setGenerarOpen(false)}
        onConfirm={ejecutarGeneracion}
      />

      <ConfirmDialog
        open={cerrar != null}
        title={cerrar ? `Cerrar liquidación de ${cerrar.repartidorNombre}` : "Cerrar liquidación"}
        description="Al cerrar, el período queda listo para conciliar y ya no admite recálculo."
        impacto={cerrar ? `${cerrar.entregas} entregas · total ${(cerrar.totalCentavos / 100).toFixed(2)} MXN.` : undefined}
        confirmLabel="Cerrar liquidación"
        onCancel={() => setCerrar(null)}
        onConfirm={(motivo) => {
          if (cerrar) ejecutarCierre(cerrar, "cerrar", motivo)
        }}
      />

      <ConfirmDialog
        open={conciliar != null}
        title={conciliar ? `Conciliar liquidación de ${conciliar.repartidorNombre}` : "Conciliar liquidación"}
        description="Marca el período como conciliado contra los pagos aprobados."
        impacto={
          conciliar
            ? `Total conciliado: ${(conciliar.totalCentavos / 100).toFixed(2)} MXN (${conciliar.entregas} entregas).`
            : undefined
        }
        confirmLabel="Conciliar"
        onCancel={() => setConciliar(null)}
        onConfirm={(motivo) => {
          if (conciliar) ejecutarCierre(conciliar, "conciliar", motivo)
        }}
      />

      <p className="domicilio-hint">
        <FileSpreadsheet size={13} /> Cada exportación crea un registro en `exportacion` y se avisa al solicitante
        (RN-R5-10, RNF-R5-04).
      </p>
    </>
  )
}
