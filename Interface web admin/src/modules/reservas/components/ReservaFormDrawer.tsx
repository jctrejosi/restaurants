import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Save } from "lucide-react"
import { useSede } from "@/app/sede"
import { Button } from "@/components/ui/Button"
import { Drawer } from "@/components/ui/Drawer"
import { SelectField, TextareaField, TextField, type SelectOption } from "@/components/ui/fields"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/states"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { useCrearReserva, useDisponibilidadReserva, useEditarReserva, usePoliticas } from "@/modules/reservas/api"
import { fechaEnZona } from "@/modules/reservas/fechas"
import { CANAL_LABEL, type CanalReserva, type EsperaItem, type ReservaDetalle } from "@/modules/reservas/types"

const DURACIONES: SelectOption[] = [30, 45, 60, 75, 90, 120, 150, 180].map((valor) => ({
  value: String(valor),
  label: `${valor} min`,
}))

const CANALES: SelectOption[] = Object.entries(CANAL_LABEL).map(([value, label]) => ({ value, label }))

function partesDeISO(iso: string, zonaHoraria: string): { fecha: string; hora: string } {
  const fecha = fechaEnZona(iso, zonaHoraria)
  const hora = new Intl.DateTimeFormat("en-GB", {
    timeZone: zonaHoraria,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso))
  return { fecha, hora }
}

/** Alta manual (RF-R5-41) y edición de datos; la reubicación va por su propia acción. */
export function ReservaFormDrawer({
  open,
  reserva,
  espera,
  fechaInicial,
  onClose,
}: {
  open: boolean
  reserva?: ReservaDetalle | null
  espera?: EsperaItem | null
  fechaInicial?: string
  onClose: () => void
}) {
  const { sedes, sedeId, esGlobal, zonaHoraria: zonaGlobal } = useSede()
  const { mostrar } = useToast()
  const esEdicion = Boolean(reserva)

  const [sedeForm, setSedeForm] = useState(sedeId ?? sedes[0]?.id ?? "centro")
  const [clienteNombre, setClienteNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [correo, setCorreo] = useState("")
  const [fecha, setFecha] = useState("")
  const [hora, setHora] = useState("20:00")
  const [personas, setPersonas] = useState("2")
  const [duracion, setDuracion] = useState("90")
  const [canal, setCanal] = useState<CanalReserva>("mostrador")
  const [zonaId, setZonaId] = useState("")
  const [mesaId, setMesaId] = useState("")
  const [notas, setNotas] = useState("")

  const zonaHoraria = esEdicion && reserva ? reserva.zonaHoraria : zonaGlobal
  const inicializado = useRef(false)

  useEffect(() => {
    if (!open) {
      inicializado.current = false
      return
    }
    // Solo inicializa al abrir: los refetch del calendario no deben pisar lo ya escrito.
    if (inicializado.current) return
    inicializado.current = true
    if (reserva) {
      const partes = partesDeISO(reserva.fechaHora, reserva.zonaHoraria)
      setSedeForm(reserva.sedeId)
      setClienteNombre(reserva.clienteNombre)
      setTelefono(reserva.telefono ?? "")
      setCorreo(reserva.correo ?? "")
      setFecha(partes.fecha)
      setHora(partes.hora)
      setPersonas(String(reserva.personas))
      setDuracion(String(reserva.duracionMin))
      setCanal(reserva.canal)
      setZonaId(reserva.zonaId ?? "")
      setMesaId(reserva.mesaId ?? "")
      setNotas(reserva.notas ?? "")
      return
    }
    const base = fechaInicial ? new Date(fechaInicial) : new Date()
    setSedeForm(sedeId ?? sedes[0]?.id ?? "centro")
    setClienteNombre(espera?.clienteNombre ?? "")
    setTelefono(espera?.telefono ?? "")
    setCorreo("")
    setFecha(fechaEnZona(base.toISOString(), zonaGlobal))
    setHora(
      espera
        ? partesDeISO(espera.franjaDeseada, zonaGlobal).hora
        : `${String(base.getHours()).padStart(2, "0")}:${String(base.getMinutes()).padStart(2, "0")}`,
    )
    setPersonas(String(espera?.personas ?? 2))
    setDuracion("90")
    setCanal("mostrador")
    setZonaId("")
    setMesaId("")
    setNotas(espera?.notas ?? "")
  }, [open, reserva, espera, fechaInicial, sedeId, sedes, zonaGlobal])

  const politica = usePoliticas(sedeForm)
  const fechaHora = useMemo(() => {
    if (!fecha || !hora) return ""
    const instante = new Date(`${fecha}T${hora}:00`)
    return Number.isNaN(instante.getTime()) ? "" : instante.toISOString()
  }, [fecha, hora])

  const disponibilidad = useDisponibilidadReserva(
    {
      sedeId: sedeForm,
      fechaHora,
      duracionMin: Number(duracion) || 90,
      personas: Number(personas) || 1,
      zonaId: zonaId || undefined,
      excluirId: reserva?.id,
    },
    open && Boolean(fechaHora),
  )

  const crear = useCrearReserva()
  const editar = useEditarReserva()
  const pendiente = crear.isPending || editar.isPending

  const zonas = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const mesa of disponibilidad.data?.mesas ?? []) mapa.set(mesa.zonaId, mesa.zonaNombre)
    return Array.from(mapa.entries())
  }, [disponibilidad.data])

  const mesasDisponibles = (disponibilidad.data?.mesas ?? []).filter(
    (mesa) => (mesa.disponible || mesa.id === reserva?.mesaId) && (!zonaId || mesa.zonaId === zonaId),
  )

  const bloqueado = disponibilidad.data?.bloqueado ?? false
  const excedeMaximo = politica.data != null && Number(personas) > politica.data.maximoPersonas
  const puedeGuardar =
    clienteNombre.trim().length >= 3 &&
    Boolean(fechaHora) &&
    Number(personas) >= 1 &&
    !excedeMaximo &&
    (esEdicion || !bloqueado) &&
    !pendiente

  const cerrarConExito = (mensaje: string) => {
    mostrar(mensaje, "exito")
    onClose()
  }

  const manejarError = (error: unknown) => {
    mostrar(
      error instanceof ApiError ? error.message : "No se pudo guardar la reserva. Intenta de nuevo.",
      "error",
    )
  }

  const guardar = () => {
    if (esEdicion && reserva) {
      editar.mutate(
        {
          id: reserva.id,
          clienteNombre: clienteNombre.trim(),
          telefono: telefono.trim(),
          correo: correo.trim(),
          personas: Number(personas),
          canal,
          notas: notas.trim(),
        },
        { onSuccess: () => cerrarConExito("Reserva actualizada y auditada."), onError: manejarError },
      )
      return
    }
    crear.mutate(
      {
        sedeId: sedeForm,
        clienteNombre: clienteNombre.trim(),
        telefono: telefono.trim() || undefined,
        correo: correo.trim() || undefined,
        fechaHora,
        duracionMin: Number(duracion) || 90,
        personas: Number(personas),
        canal,
        zonaId: zonaId || undefined,
        mesaId: mesaId || undefined,
        notas: notas.trim() || undefined,
        esperaId: espera?.id,
      },
      {
        onSuccess: () => cerrarConExito("Reserva creada; la asignación de mesa quedó en la bitácora."),
        onError: manejarError,
      },
    )
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={640}
      title={esEdicion ? `Editar ${reserva?.codigo}` : espera ? `Nueva reserva · ${espera.clienteNombre}` : "Nueva reserva"}
      subtitle={
        esEdicion
          ? "La fecha, la mesa y la duración se cambian con «Reubicar» para dejar rastro"
          : "Alta manual de teléfono o mostrador (RF-R5-41); la política vigente se guarda en la reserva"
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={!puedeGuardar} onClick={guardar}>
            <Save size={15} /> {pendiente ? "Guardando…" : esEdicion ? "Guardar cambios" : "Crear reserva"}
          </Button>
        </>
      }
    >
      {politica.isError ? <ErrorState onRetry={() => void politica.refetch()} /> : null}

      <div className="reserva-campos-2">
        {esGlobal && !esEdicion ? (
          <SelectField
            label="Sede"
            options={sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))}
            value={sedeForm}
            onChange={(event) => {
              setSedeForm(event.target.value)
              setZonaId("")
              setMesaId("")
            }}
          />
        ) : null}
        <TextField
          label="Cliente"
          placeholder="Nombre y apellido"
          value={clienteNombre}
          onChange={(event) => setClienteNombre(event.target.value)}
        />
        <TextField label="Teléfono" placeholder="55 0000 0000" value={telefono} onChange={(event) => setTelefono(event.target.value)} />
        <TextField label="Correo" placeholder="cliente@correo.mx" value={correo} onChange={(event) => setCorreo(event.target.value)} />
      </div>

      {esEdicion ? (
        <div className="reserva-campos-2">
          <TextField
            label="Personas"
            type="number"
            min={1}
            max={politica.data?.maximoPersonas}
            value={personas}
            onChange={(event) => setPersonas(event.target.value)}
            hint={politica.data ? `Máximo de la sede: ${politica.data.maximoPersonas}` : undefined}
          />
        </div>
      ) : null}

      {esEdicion ? (
        <p className="reserva-aviso">
          Para mover de fecha u hora, o cambiar de mesa, usa la acción <strong>Reubicar</strong>: valida el solape y exige
          motivo (RF-R5-41/42).
        </p>
      ) : (
        <div className="reserva-campos-3">
          <TextField label="Fecha" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
          <TextField label="Hora" type="time" value={hora} onChange={(event) => setHora(event.target.value)} />
          <TextField
            label="Personas"
            type="number"
            min={1}
            max={politica.data?.maximoPersonas}
            value={personas}
            onChange={(event) => setPersonas(event.target.value)}
            hint={politica.data ? `Máximo de la sede: ${politica.data.maximoPersonas}` : undefined}
          />
        </div>
      )}

      <div className="reserva-campos-2">
        <SelectField label="Duración" options={DURACIONES} value={duracion} onChange={(event) => setDuracion(event.target.value)} />
        <SelectField
          label="Canal"
          options={CANALES}
          value={canal}
          onChange={(event) => setCanal(event.target.value as CanalReserva)}
        />
        <SelectField
          label="Zona"
          options={[{ value: "", label: "Cualquier zona" }, ...zonas.map(([value, label]) => ({ value, label }))]}
          value={zonaId}
          onChange={(event) => {
            setZonaId(event.target.value)
            setMesaId("")
          }}
        />
        <SelectField
          label="Mesa candidata"
          options={[
            { value: "", label: "Asignar automáticamente" },
            ...mesasDisponibles.map((mesa) => ({
              value: mesa.id,
              label: `Mesa ${mesa.numero} · ${mesa.zonaNombre} · ${mesa.capacidad} pax`,
            })),
          ]}
          value={mesaId}
          onChange={(event) => setMesaId(event.target.value)}
        />
      </div>

      {bloqueado ? (
        <p className="reserva-aviso reserva-aviso--error">
          <AlertTriangle size={14} /> {disponibilidad.data?.motivoBloqueo}. La web no ofrecerá esta franja (RN-R5-11); elige otra
          fecha u hora.
        </p>
      ) : null}
      {disponibilidad.isFetching ? (
        <p className="reserva-nota">Consultando disponibilidad de mesas operativas sin solape.</p>
      ) : null}
      {excedeMaximo ? (
        <p className="reserva-aviso reserva-aviso--error">
          <AlertTriangle size={14} /> La política de la sede permite hasta {politica.data?.maximoPersonas} personas por reserva.
        </p>
      ) : null}
      {disponibilidad.isLoading && !esEdicion ? <SkeletonRows rows={2} columns={2} /> : null}

      <TextareaField
        label="Notas"
        placeholder="Alergias, cumpleaños, silla de bebé, factura…"
        rows={3}
        value={notas}
        onChange={(event) => setNotas(event.target.value)}
      />

      <p className="reserva-nota">
        Al crear, el sistema asigna la primera mesa libre con capacidad suficiente si no eliges una; el intento de
        sobre-asignación responde 409 con alternativas (RN-R5-09). Zona horaria: {zonaHoraria}.
      </p>
    </Drawer>
  )
}
