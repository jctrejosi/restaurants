import { useState } from "react"
import { MoreVertical, Plus } from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { DurationCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { IconButton } from "@/components/ui/IconButton"
import { SelectField } from "@/components/ui/fields"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useToast } from "@/components/ui/toast"
import { usePopover } from "@/components/ui/usePopover"
import { useAuth } from "@/app/auth"
import type { Sede } from "@/app/sede"
import { ApiError } from "@/lib/api"
import { useGuardarRepartidor, useRepartidores } from "@/modules/domicilio/api"
import { CourierForm } from "@/modules/domicilio/components/CourierForm"
import {
  REPARTIDOR_ESTADO_LABEL,
  REPARTIDOR_ESTADO_TONE,
  VEHICULO_LABEL,
  type Repartidor,
  type RepartidorEstado,
  type RepartidorPayload,
} from "@/modules/domicilio/types"

/** Alta, edición y estado de repartidores, con su carga actual. */
export function RepartidoresTab({
  sucursalId,
  esGlobal,
  sedes,
  onCambiarSede,
}: {
  sucursalId: string | null
  esGlobal: boolean
  sedes: Sede[]
  onCambiarSede: (sedeId: string | null) => void
}) {
  const { mostrar } = useToast()
  const { tienePermiso } = useAuth()
  const { data, isLoading, isError, refetch } = useRepartidores(sucursalId)
  const guardar = useGuardarRepartidor()

  const [formOpen, setFormOpen] = useState(false)
  const [repartidorEnEdicion, setRepartidorEnEdicion] = useState<Repartidor | null>(null)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const [inactivar, setInactivar] = useState<Repartidor | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const menu = usePopover<HTMLDivElement>()

  const puedeRepartidores = tienePermiso("domicilio.repartidores")
  const repartidores = data?.data ?? []

  const abrirNuevo = () => {
    setRepartidorEnEdicion(null)
    setErrorServidor(null)
    setFormOpen(true)
  }

  const abrirEdicion = (repartidor: Repartidor) => {
    setRepartidorEnEdicion(repartidor)
    setErrorServidor(null)
    setFormOpen(true)
    menu.setOpen(false)
  }

  const payloadDe = (repartidor: Repartidor, cambios: Partial<RepartidorPayload>): RepartidorPayload => ({
    nombre: repartidor.nombre,
    telefono: repartidor.telefono,
    vehiculo: repartidor.vehiculo,
    sucursalId: repartidor.sucursalId,
    ...cambios,
  })

  const guardarRepartidor = (payload: RepartidorPayload) => {
    guardar.mutate(
      { id: repartidorEnEdicion?.id, payload },
      {
        onSuccess: () => {
          mostrar(repartidorEnEdicion ? "Repartidor actualizado y auditado." : "Repartidor dado de alta.", "exito")
          setFormOpen(false)
          setRepartidorEnEdicion(null)
        },
        onError: (error) =>
          setErrorServidor(error instanceof ApiError ? error.message : "No se pudo guardar el repartidor."),
      },
    )
  }

  const cambiarEstado = (repartidor: Repartidor, estado: RepartidorEstado, motivo?: string) => {
    guardar.mutate(
      { id: repartidor.id, payload: payloadDe(repartidor, { estado, motivo }) },
      {
        onSuccess: () => mostrar(`Estado de ${repartidor.nombre}: ${REPARTIDOR_ESTADO_LABEL[estado].toLowerCase()}.`, "exito"),
        onError: (error) =>
          mostrar(error instanceof ApiError ? error.message : "No se pudo cambiar el estado.", "error"),
      },
    )
    menu.setOpen(false)
  }

  const alternarMenu = (repartidorId: string) => {
    if (menu.open && menuId === repartidorId) {
      menu.setOpen(false)
      return
    }
    setMenuId(repartidorId)
    menu.setOpen(true)
  }

  const columnas: Column<Repartidor>[] = [
    {
      key: "repartidor",
      header: "Repartidor",
      cell: (repartidor) => (
        <>
          <span className="order-id">{repartidor.nombre}</span>
          <span className="order-type">
            <StatusBadge tone={REPARTIDOR_ESTADO_TONE[repartidor.estado]}>
              {REPARTIDOR_ESTADO_LABEL[repartidor.estado]}
            </StatusBadge>{" "}
            · {repartidor.sucursalNombre}
          </span>
        </>
      ),
    },
    { key: "telefono", header: "Teléfono", cell: (repartidor) => repartidor.telefono },
    { key: "vehiculo", header: "Vehículo", cell: (repartidor) => VEHICULO_LABEL[repartidor.vehiculo] },
    {
      key: "activas",
      header: "Entregas activas",
      align: "right",
      cell: (repartidor) =>
        repartidor.entregasActivas > 0 ? (
          <StatusBadge tone="blue">{repartidor.entregasActivas}</StatusBadge>
        ) : (
          "—"
        ),
    },
    { key: "periodo", header: "Entregas período", align: "right", cell: (repartidor) => repartidor.entregasPeriodo },
    {
      key: "promedio",
      header: "Tiempo promedio",
      align: "right",
      cell: (repartidor) =>
        repartidor.tiempoPromedioMin == null ? (
          "—"
        ) : (
          <DurationCell segundos={repartidor.tiempoPromedioMin * 60} titulo="Promedio del período" />
        ),
    },
    {
      key: "incidencias",
      header: "Incidencias",
      align: "right",
      cell: (repartidor) => (repartidor.incidencias > 0 ? repartidor.incidencias : "—"),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      cell: (repartidor) => (
        <span className="row-menu" ref={menu.open && menuId === repartidor.id ? menu.ref : undefined}>
          <IconButton
            label="Acciones del repartidor"
            onClick={(event) => {
              event.stopPropagation()
              alternarMenu(repartidor.id)
            }}
          >
            <MoreVertical size={16} />
          </IconButton>
          {menu.open && menuId === repartidor.id ? (
            <div className="row-menu__panel" role="menu">
              <button
                type="button"
                role="menuitem"
                disabled={!puedeRepartidores}
                title={puedeRepartidores ? undefined : "Requiere permiso de domicilio.repartidores"}
                onClick={() => abrirEdicion(repartidor)}
              >
                Editar
              </button>
              {repartidor.estado !== "activo" ? (
                <button type="button" role="menuitem" disabled={!puedeRepartidores} onClick={() => cambiarEstado(repartidor, "activo")}>
                  Marcar activo
                </button>
              ) : null}
              {repartidor.estado !== "ocupado" ? (
                <button type="button" role="menuitem" disabled={!puedeRepartidores} onClick={() => cambiarEstado(repartidor, "ocupado")}>
                  Marcar ocupado
                </button>
              ) : null}
              {repartidor.estado !== "inactivo" ? (
                <button
                  type="button"
                  role="menuitem"
                  className="row-menu__danger"
                  disabled={!puedeRepartidores}
                  onClick={() => {
                    setInactivar(repartidor)
                    menu.setOpen(false)
                  }}
                >
                  Inactivar
                </button>
              ) : null}
            </div>
          ) : null}
        </span>
      ),
    },
  ]

  return (
    <>
      <div className="module-toolbar">
        {esGlobal ? (
          <SelectField
            label="Sede"
            options={[{ value: "", label: "Todas las sedes" }, ...sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))]}
            value={sucursalId ?? ""}
            onChange={(event) => onCambiarSede(event.target.value || null)}
          />
        ) : null}
        <span className="module-toolbar__spacer" />
        <Button
          variant="primary"
          disabled={!puedeRepartidores}
          title={puedeRepartidores ? undefined : "Requiere permiso de domicilio.repartidores"}
          onClick={abrirNuevo}
        >
          <Plus size={16} /> Nuevo repartidor
        </Button>
      </div>

      <section className="panel">
        <DataTable
          columns={columnas}
          rows={repartidores}
          getRowKey={(repartidor) => repartidor.id}
          loading={isLoading}
          error={isError ? new Error("No se pudieron cargar los repartidores") : null}
          onRetry={() => void refetch()}
          emptyTitle="Aún no hay repartidores"
          emptyDescription="Da de alta repartidores para asignarles entregas y notificarles."
        />
      </section>

      <CourierForm
        open={formOpen}
        repartidor={repartidorEnEdicion}
        sedes={sedes}
        sucursalPredeterminada={sucursalId}
        guardando={guardar.isPending}
        errorServidor={errorServidor}
        onClose={() => setFormOpen(false)}
        onGuardar={guardarRepartidor}
      />

      <ConfirmDialog
        open={inactivar != null}
        title={inactivar ? `Inactivar a ${inactivar.nombre}` : "Inactivar repartidor"}
        description="No aparecerá como candidato para nuevas asignaciones."
        impacto={
          inactivar
            ? inactivar.entregasActivas > 0
              ? `Tiene ${inactivar.entregasActivas} entrega(s) en curso: primero reasígnalas o ciérralas.`
              : `Tiene ${inactivar.entregasPeriodo} entrega(s) en el período. El cambio queda auditado.`
            : undefined
        }
        confirmLabel="Inactivar"
        onCancel={() => setInactivar(null)}
        onConfirm={(motivo) => {
          if (!inactivar) return
          cambiarEstado(inactivar, "inactivo", motivo)
          setInactivar(null)
        }}
      />
    </>
  )
}
