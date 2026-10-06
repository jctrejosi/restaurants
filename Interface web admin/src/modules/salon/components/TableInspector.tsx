import { useEffect, useMemo, useState } from "react"
import { Armchair, Wrench } from "lucide-react"
import { useAuth } from "@/app/auth"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SelectField, TextareaField, TextField, type SelectOption } from "@/components/ui/fields"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { useCambiarEstadoMesa, useCrearMesa, useEditarMesa, useFueraServicioMesa } from "@/modules/salon/api"
import {
  FORMA_LABEL,
  MESA_ESTADO_DESCRIPCION,
  MESA_ESTADO_LABEL,
  MESA_ESTADO_TONE,
  type Mesa,
  type MesaEstado,
  type MesaForma,
  type Zona,
} from "@/modules/salon/types"

const ESTADOS_MANUALES: SelectOption[] = (["libre", "ocupada", "por_cobrar", "reservada"] as const).map((estado) => ({
  value: estado,
  label: MESA_ESTADO_LABEL[estado],
}))

const FORMAS: SelectOption[] = Object.entries(FORMA_LABEL).map(([value, label]) => ({ value, label }))

/**
 * Inspector de la mesa: edición de capacidad/posición/estado, bloqueo por
 * mantenimiento con motivo e impacto (sesión abierta y reservas futuras).
 */
export function TableInspector({
  mesa,
  zonas,
  modo,
  zonaInicial,
  onCerrar,
}: {
  mesa: Mesa | null
  zonas: Zona[]
  modo: "editar" | "crear"
  zonaInicial?: string
  onCerrar: () => void
}) {
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const crear = useCrearMesa()
  const editar = useEditarMesa()
  const cambiarEstado = useCambiarEstadoMesa()
  const fueraServicio = useFueraServicioMesa()

  const puedeMesas = tienePermiso("salon.mesas")
  const puedeEstado = tienePermiso("salon.estado")

  const [numero, setNumero] = useState("")
  const [capacidad, setCapacidad] = useState("2")
  const [zonaId, setZonaId] = useState(zonaInicial ?? zonas[0]?.id ?? "")
  const [forma, setForma] = useState<MesaForma>("cuadrada")
  const [posX, setPosX] = useState("0")
  const [posY, setPosY] = useState("0")
  const [activa, setActiva] = useState(true)
  const [estadoManual, setEstadoManual] = useState<Exclude<MesaEstado, "fuera_servicio">>("libre")
  const [motivo, setMotivo] = useState("")
  const [dialogo, setDialogo] = useState<"baja" | "bloqueo" | "reactivar" | null>(null)

  useEffect(() => {
    if (modo === "editar" && mesa) {
      setNumero(mesa.numero)
      setCapacidad(String(mesa.capacidad))
      setZonaId(mesa.zonaId)
      setForma(mesa.forma)
      setPosX(String(mesa.posX))
      setPosY(String(mesa.posY))
      setActiva(mesa.activa)
      setEstadoManual(mesa.estado === "fuera_servicio" ? "libre" : mesa.estado)
      setMotivo("")
      return
    }
    const zona = zonas.find((item) => item.id === (zonaInicial ?? zonas[0]?.id))
    setNumero("")
    setCapacidad("2")
    setZonaId(zona?.id ?? "")
    setForma("cuadrada")
    setPosX(String((zona?.x ?? 0) + 1))
    setPosY(String((zona?.y ?? 0) + 1))
    setActiva(true)
    setEstadoManual("libre")
    setMotivo("")
  }, [modo, mesa, zonaInicial, zonas])

  const opcionesZona: SelectOption[] = useMemo(() => zonas.map((zona) => ({ value: zona.id, label: zona.nombre })), [zonas])

  const guardar = () => {
    const manejarError = (error: unknown) =>
      mostrar(error instanceof ApiError ? error.message : "No se pudo guardar la mesa.", "error")
    if (modo === "crear") {
      crear.mutate(
        {
          zonaId,
          numero: numero.trim(),
          capacidad: Number(capacidad),
          posX: Number(posX),
          posY: Number(posY),
          forma,
          activa,
        },
        { onSuccess: () => { mostrar("Mesa creada; el mapa ya la muestra.", "exito"); onCerrar() }, onError: manejarError },
      )
      return
    }
    if (!mesa) return
    editar.mutate(
      {
        id: mesa.id,
        zonaId,
        numero: numero.trim(),
        capacidad: Number(capacidad),
        posX: Number(posX),
        posY: Number(posY),
        forma,
        activa,
      },
      { onSuccess: () => { mostrar("Mesa actualizada y auditada.", "exito"); onCerrar() }, onError: manejarError },
    )
  }

  if (modo === "editar" && !mesa) {
    return <p className="salon-nota">Selecciona una mesa en el mapa para editarla.</p>
  }

  const requiereConfirmacionBaja = Boolean(mesa && (mesa.sesionAbierta || mesa.reservasFuturas > 0))
  const esFueraServicio = mesa?.estado === "fuera_servicio"

  return (
    <div className="salon-inspector">
      <div className="salon-inspector__head">
        <strong>{modo === "crear" ? "Nueva mesa" : `Mesa ${mesa?.numero}`}</strong>
        {mesa ? <StatusBadge tone={MESA_ESTADO_TONE[mesa.estado]}>{MESA_ESTADO_LABEL[mesa.estado]}</StatusBadge> : null}
      </div>
      {mesa ? (
        <p className="salon-nota">
          {MESA_ESTADO_DESCRIPCION[mesa.estado]}
          {mesa.desde && mesa.estado !== "libre" ? ` · desde ${formatDateTime(mesa.desde)}` : ""}
          {mesa.por ? ` · por ${mesa.por}` : ""}
        </p>
      ) : null}

      <div className="salon-campos-2">
        <TextField label="Número" value={numero} onChange={(event) => setNumero(event.target.value)} />
        <TextField
          label="Capacidad"
          type="number"
          min={1}
          max={20}
          value={capacidad}
          onChange={(event) => setCapacidad(event.target.value)}
        />
        <SelectField label="Zona" options={opcionesZona} value={zonaId} onChange={(event) => setZonaId(event.target.value)} />
        <SelectField label="Forma" options={FORMAS} value={forma} onChange={(event) => setForma(event.target.value as MesaForma)} />
        <TextField label="Columna (x)" type="number" min={0} value={posX} onChange={(event) => setPosX(event.target.value)} />
        <TextField label="Fila (y)" type="number" min={0} value={posY} onChange={(event) => setPosY(event.target.value)} />
      </div>

      <label className="salon-check">
        <input
          type="checkbox"
          checked={activa}
          onChange={(event) => {
            const siguiente = event.target.checked
            setActiva(siguiente)
            if (!siguiente && requiereConfirmacionBaja) setDialogo("baja")
          }}
        />
        Mesa activa (la baja es lógica: `activa=false`)
      </label>

      <Button variant="primary" disabled={!puedeMesas || crear.isPending || editar.isPending} onClick={guardar}>
        <Armchair size={15} /> {crear.isPending || editar.isPending ? "Guardando…" : modo === "crear" ? "Crear mesa" : "Guardar cambios"}
      </Button>

      {modo === "editar" && mesa ? (
        <div className="salon-inspector__estado">
          <h4>Estado operativo y mantenimiento</h4>
          <p className="salon-nota">
            El cambio manual exige motivo y queda auditado con actor y antes/después (plan 05 §7).
          </p>
          <SelectField
            label="Cambiar estado a"
            options={ESTADOS_MANUALES}
            value={estadoManual}
            disabled={esFueraServicio || !puedeEstado}
            onChange={(event) => setEstadoManual(event.target.value as Exclude<MesaEstado, "fuera_servicio">)}
          />
          <TextareaField
            label="Motivo del cambio (obligatorio)"
            rows={2}
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
          />
          <div className="salon-inspector__acciones">
            <Button
              variant="secondary"
              disabled={!puedeEstado || esFueraServicio || motivo.trim().length < 3 || cambiarEstado.isPending}
              title={esFueraServicio ? "Reactiva la mesa para operarla" : undefined}
              onClick={() =>
                cambiarEstado.mutate(
                  { id: mesa.id, estado: estadoManual, motivo: motivo.trim() },
                  {
                    onSuccess: () => { mostrar("Estado de mesa actualizado y auditado.", "exito"); setMotivo("") },
                    onError: (error) => mostrar(error instanceof ApiError ? error.message : "No se pudo cambiar el estado.", "error"),
                  },
                )
              }
            >
              Aplicar estado
            </Button>
            {esFueraServicio ? (
              <Button
                variant="primary"
                disabled={!puedeEstado || motivo.trim().length < 3 || cambiarEstado.isPending}
                onClick={() =>
                  cambiarEstado.mutate(
                    { id: mesa.id, estado: "libre", motivo: motivo.trim() },
                    {
                      onSuccess: () => { mostrar("Mesa reactivada; vuelve a ofrecerse.", "exito"); setMotivo("") },
                      onError: (error) => mostrar(error instanceof ApiError ? error.message : "No se pudo reactivar.", "error"),
                    },
                  )
                }
              >
                Reactivar mesa
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled={!puedeEstado}
                onClick={() => setDialogo("bloqueo")}
              >
                <Wrench size={15} /> Bloquear por mantenimiento
              </Button>
            )}
          </div>
          {mesa.reservasFuturas > 0 ? (
            <p className="salon-aviso">
              Esta mesa tiene {mesa.reservasFuturas} reserva(s) futura(s): bloquearla o darla de baja no las altera, pero pide
              confirmación y avisa del efecto.
            </p>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={dialogo === "bloqueo"}
        title={mesa ? `Bloquear Mesa ${mesa.numero}` : "Bloquear mesa"}
        description="La mesa queda `fuera_servicio`: no se ofrece en web, APK ni quiosco (RN-R5-11)."
        impacto={
          mesa?.sesionAbierta
            ? "Tiene una sesión abierta; ciérrala antes de bloquearla."
            : mesa && mesa.reservasFuturas > 0
              ? `Tiene ${mesa.reservasFuturas} reserva(s) futura(s); se notificará el impacto en disponibilidad.`
              : undefined
        }
        confirmLabel="Bloquear mesa"
        onCancel={() => setDialogo(null)}
        onConfirm={(razon) => {
          if (!mesa) return
          fueraServicio.mutate(
            { id: mesa.id, motivo: razon, confirmar: true },
            {
              onSuccess: () => mostrar("Mesa fuera de servicio; ya no se ofrece.", "exito"),
              onError: (error) => mostrar(error instanceof ApiError ? error.message : "No se pudo bloquear la mesa.", "error"),
              onSettled: () => setDialogo(null),
            },
          )
        }}
      />

      <ConfirmDialog
        open={dialogo === "baja"}
        title={mesa ? `Dar de baja Mesa ${mesa.numero}` : "Dar de baja"}
        description="La baja es lógica (`activa=false`): conserva historial y reservas, pero deja de ofrecerse."
        impacto={
          mesa?.sesionAbierta
            ? "Tiene una sesión abierta; ciérrala antes de darla de baja."
            : mesa
              ? `Tiene ${mesa.reservasFuturas} reserva(s) futura(s).`
              : undefined
        }
        confirmLabel="Dar de baja"
        onCancel={() => {
          setDialogo(null)
          setActiva(true)
        }}
        onConfirm={(razon) => {
          if (!mesa) return
          editar.mutate(
            { id: mesa.id, activa: false, forzar: true, motivo: razon },
            {
              onSuccess: () => mostrar("Mesa dada de baja; el historial se conserva.", "exito"),
              onError: (error) => mostrar(error instanceof ApiError ? error.message : "No se pudo dar de baja.", "error"),
              onSettled: () => setDialogo(null),
            },
          )
        }}
      />
    </div>
  )
}
