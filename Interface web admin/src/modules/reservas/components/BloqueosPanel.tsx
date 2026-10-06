import { useMemo, useState } from "react"
import { BellRing, CalendarPlus, CalendarX2 } from "lucide-react"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { DataTable, type Column } from "@/components/data/DataTable"
import { FilterBar } from "@/components/data/FilterBar"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SelectField, TextField, type SelectOption } from "@/components/ui/fields"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { EmptyState, ErrorState, NoPermissionState } from "@/components/ui/states"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { formatDateTime, maskName } from "@/lib/format"
import { useAccionReserva, useBloqueos, useImpactoBloqueo, useNotificarBloqueo } from "@/modules/reservas/api"
import { fechaEnZona, hoyISO, sumarDias } from "@/modules/reservas/fechas"
import { BloqueoForm } from "@/modules/reservas/components/BloqueoForm"
import { ReubicarDialog } from "@/modules/reservas/components/ReubicarDialog"
import {
  BLOQUEO_LABEL,
  BLOQUEO_TONE,
  ESTADO_LABEL,
  ESTADO_TONE,
  type Bloqueo,
  type ReservaLista,
  type TipoBloqueo,
} from "@/modules/reservas/types"

const TIPOS: SelectOption[] = Object.entries(BLOQUEO_LABEL).map(([value, label]) => ({ value, label }))

function rangoLegible(bloqueo: Bloqueo): string {
  const inicio = formatDateTime(bloqueo.desde)
  const mismoDia =
    fechaEnZona(bloqueo.desde, "America/Mexico_City") === fechaEnZona(bloqueo.hasta, "America/Mexico_City")
  const fin = mismoDia ? formatDateTime(bloqueo.hasta).split(",")[1] ?? bloqueo.hasta : formatDateTime(bloqueo.hasta)
  return `${inicio} → ${fin}`
}

/**
 * Bloqueos y festivos (V1, RF-R5-46): cierres por sede/zona y rango con impacto
 * visible sobre las reservas futuras, notificación y reubicación.
 */
export function BloqueosPanel({
  sedeId,
  esGlobal,
  puedeVerPii,
  onAbrirReserva,
}: {
  sedeId?: string
  esGlobal: boolean
  puedeVerPii: boolean
  onAbrirReserva: (reservaId: string) => void
}) {
  const { tienePermiso } = useAuth()
  const { zonaHoraria } = useSede()
  const { mostrar } = useToast()

  const [desde, setDesde] = useState(hoyISO())
  const [hasta, setHasta] = useState(sumarDias(hoyISO(), 30))
  const [tipo, setTipo] = useState("")
  const [seleccionId, setSeleccionId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [notificarOpen, setNotificarOpen] = useState(false)
  const [reubicar, setReubicar] = useState<ReservaLista | null>(null)

  const puedeBloqueos = tienePermiso("reservas.bloqueos")
  const puedeReubicar = tienePermiso("reservas.reubicar")

  const { data: bloqueos, isLoading, isError, error, refetch } = useBloqueos({
    sedeId,
    desde,
    hasta,
    tipo: tipo || undefined,
  })
  const impacto = useImpactoBloqueo(seleccionId)
  const notificar = useNotificarBloqueo()
  const accion = useAccionReserva()

  const columnas = useMemo<Column<Bloqueo>[]>(
    () => [
      {
        key: "tipo",
        header: "Tipo",
        cell: (row) => <StatusBadge tone={BLOQUEO_TONE[row.tipo]}>{BLOQUEO_LABEL[row.tipo]}</StatusBadge>,
      },
      { key: "motivo", header: "Motivo", cell: (row) => row.motivo },
      { key: "rango", header: "Rango", cell: (row) => rangoLegible(row) },
      { key: "alcance", header: "Alcance", cell: (row) => row.zonaNombre ?? "Toda la sede" },
      {
        key: "afectadas",
        header: "Reservas afectadas",
        align: "right",
        cell: (row) => (row.reservasAfectadas > 0 ? <StatusBadge tone="amber">{row.reservasAfectadas}</StatusBadge> : "0"),
      },
      { key: "creado", header: "Creado por", cell: (row) => `${row.creadoPor} · ${formatDateTime(row.creadoEn)}` },
    ],
    [],
  )

  const columnasImpacto = useMemo<Column<ReservaLista>[]>(
    () => [
      { key: "codigo", header: "Reserva", cell: (row) => row.codigo },
      { key: "fecha", header: "Fecha y hora", cell: (row) => formatDateTime(row.fechaHora, zonaHoraria) },
      {
        key: "cliente",
        header: "Cliente",
        cell: (row) => (puedeVerPii ? row.clienteNombre : maskName(row.clienteNombre)),
      },
      { key: "personas", header: "Personas", align: "right", cell: (row) => row.personas },
      { key: "mesa", header: "Mesa", cell: (row) => (row.mesaNumero ? `Mesa ${row.mesaNumero}` : "Sin asignar") },
      {
        key: "estado",
        header: "Estado",
        cell: (row) => <StatusBadge tone={ESTADO_TONE[row.estado]}>{ESTADO_LABEL[row.estado]}</StatusBadge>,
      },
      {
        key: "acciones",
        header: "",
        cell: (row) => (
          <Button
            variant="ghost"
            className="text-action"
            disabled={!puedeReubicar}
            title={!puedeReubicar ? "Requiere permiso de reservas.reubicar" : "Reubicar sin sobre-asignar"}
            onClick={(event) => {
              event.stopPropagation()
              setReubicar(row)
            }}
          >
            Reubicar
          </Button>
        ),
      },
    ],
    [puedeReubicar, puedeVerPii, zonaHoraria],
  )

  if (!tienePermiso("reservas.ver")) {
    return <NoPermissionState permiso="reservas.ver" />
  }

  return (
    <div className="reserva-bloqueos">
      <FilterBar
        activeFilters={tipo ? [{ key: "tipo", label: `Tipo: ${BLOQUEO_LABEL[tipo as TipoBloqueo]}` }] : []}
        onClear={() => setTipo("")}
        actions={
          <Button
            variant="primary"
            disabled={!puedeBloqueos}
            title={!puedeBloqueos ? "Requiere permiso de reservas.bloqueos" : undefined}
            onClick={() => setFormOpen(true)}
          >
            <CalendarPlus size={15} /> Nuevo bloqueo
          </Button>
        }
      >
        <TextField label="Desde" type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
        <TextField label="Hasta" type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
        <SelectField
          label="Tipo"
          options={TIPOS}
          placeholder="Todos"
          value={tipo}
          onChange={(event) => setTipo(event.target.value)}
        />
      </FilterBar>

      <section className="panel">
        <DataTable
          columns={columnas}
          rows={bloqueos ?? []}
          getRowKey={(row) => row.id}
          onRowClick={(row) => setSeleccionId(row.id === seleccionId ? null : row.id)}
          loading={isLoading}
          error={isError ? (error as Error) : null}
          onRetry={() => void refetch()}
          emptyTitle="Sin bloqueos en el rango"
          emptyDescription="Crea un cierre, festivo o evento para que la web deje de ofrecer la franja."
        />
      </section>

      {seleccionId ? (
        <section className="panel reserva-impacto">
          <div className="panel__header">
            <div>
              <div className="panel__title">
                <CalendarX2 size={15} /> Impacto del bloqueo
              </div>
              <div className="panel__subtitle">
                {impacto.data
                  ? `${impacto.data.total} reserva(s) afectadas · notificar avisa al cliente y propone reubicación`
                  : "Calculando impacto…"}
              </div>
            </div>
            <Button
              variant="secondary"
              disabled={!puedeBloqueos || notificar.isPending || (impacto.data?.total ?? 0) === 0}
              title={!puedeBloqueos ? "Requiere permiso de reservas.bloqueos" : undefined}
              onClick={() => setNotificarOpen(true)}
            >
              <BellRing size={15} /> {notificar.isPending ? "Notificando…" : "Notificar y proponer reubicación"}
            </Button>
          </div>
          {impacto.isLoading ? (
            <SkeletonRows rows={3} columns={5} />
          ) : impacto.isError ? (
            <div className="reserva-impacto__vacio">
              <ErrorState
                title="No pudimos calcular el impacto"
                description="Reintenta para ver las reservas afectadas por el bloqueo."
                onRetry={() => void impacto.refetch()}
              />
            </div>
          ) : impacto.data && impacto.data.total > 0 ? (
            <DataTable
              columns={columnasImpacto}
              rows={impacto.data.reservas}
              getRowKey={(row) => row.id}
              onRowClick={(row) => onAbrirReserva(row.id)}
              emptyTitle="Sin reservas afectadas"
            />
          ) : (
            <div className="reserva-impacto__vacio">
              <EmptyState
                title="Sin reservas afectadas"
                description="Ninguna reserva activa cae dentro de este bloqueo; la franja ya no se ofrecerá a nuevas solicitudes."
              />
            </div>
          )}
        </section>
      ) : null}

      <BloqueoForm open={formOpen} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={notificarOpen}
        title="Notificar a las reservas afectadas"
        description="Se envía el aviso con la propuesta de reubicación y queda en la bitácora de cada reserva."
        impacto={
          impacto.data && impacto.data.total > 0
            ? `Se notificará a ${impacto.data.total} reserva(s): ${impacto.data.reservas.map((reserva) => reserva.codigo).join(", ")}.`
            : undefined
        }
        confirmLabel="Notificar"
        onCancel={() => setNotificarOpen(false)}
        onConfirm={(motivo) => {
          if (!seleccionId) return
          notificar.mutate(
            { id: seleccionId, motivo },
            {
              onSuccess: (resultado) => mostrar(`${resultado.notificadas} reserva(s) notificadas con propuesta de reubicación.`, "exito"),
              onError: (error) =>
                mostrar(error instanceof ApiError ? error.message : "No se pudo notificar.", "error"),
              onSettled: () => setNotificarOpen(false),
            },
          )
        }}
      />

      <ReubicarDialog
        open={Boolean(reubicar)}
        reserva={reubicar}
        zonaHoraria={zonaHoraria}
        pendiente={accion.isPending}
        onCancel={() => setReubicar(null)}
        onConfirm={(payload) => {
          if (!reubicar) return
          accion.mutate(
            {
              id: reubicar.id,
              accion: "reubicar",
              motivo: payload.motivo,
              fechaHora: payload.fechaHora,
              duracionMin: payload.duracionMin,
              mesaId: payload.mesaId ?? "",
            },
            {
              onSuccess: () => {
                mostrar("Reserva reubicada fuera de la franja bloqueada.", "exito")
                setReubicar(null)
                setSeleccionId(null)
              },
              onError: (error) => mostrar(error instanceof ApiError ? error.message : "No se pudo reubicar.", "error"),
            },
          )
        }}
      />
    </div>
  )
}
