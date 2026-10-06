import { useEffect, useState } from "react"
import { CalendarPlus } from "lucide-react"
import { useSede } from "@/app/sede"
import { Button } from "@/components/ui/Button"
import { SelectField, TextareaField, TextField, type SelectOption } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { useCrearBloqueo } from "@/modules/reservas/api"
import { BLOQUEO_LABEL, type BloqueoPayload, type TipoBloqueo } from "@/modules/reservas/types"

export const ZONA_OPCIONES: SelectOption[] = [
  { value: "", label: "Toda la sede" },
  { value: "salon", label: "Salón principal" },
  { value: "terraza", label: "Terraza" },
  { value: "barra", label: "Barra" },
  { value: "privado", label: "Privado" },
]

const TIPOS: SelectOption[] = Object.entries(BLOQUEO_LABEL).map(([value, label]) => ({ value, label }))

/** Formatea un Date para `datetime-local` (hora local del panel). */
function paraInputLocal(fecha: Date): string {
  const desplazado = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000)
  return desplazado.toISOString().slice(0, 16)
}

/** Alta de cierres, festivos y eventos (V1, RF-R5-46). La web no ofrecerá la franja. */
export function BloqueoForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { sedes, sedeId, esGlobal } = useSede()
  const { mostrar } = useToast()
  const crear = useCrearBloqueo()

  const [sedeForm, setSedeForm] = useState(sedeId ?? sedes[0]?.id ?? "centro")
  const [tipo, setTipo] = useState<TipoBloqueo>("cierre")
  const [motivo, setMotivo] = useState("")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [zonaId, setZonaId] = useState("")

  useEffect(() => {
    if (!open) return
    const inicio = new Date(Date.now() + 60 * 60_000)
    inicio.setMinutes(Math.ceil(inicio.getMinutes() / 15) * 15, 0, 0)
    const fin = new Date(inicio.getTime() + 2 * 60 * 60_000)
    setSedeForm(sedeId ?? sedes[0]?.id ?? "centro")
    setTipo("cierre")
    setMotivo("")
    setDesde(paraInputLocal(inicio))
    setHasta(paraInputLocal(fin))
    setZonaId("")
  }, [open, sedeId, sedes])

  if (!open) return null

  const rangoValido = Boolean(desde) && Boolean(hasta) && new Date(hasta) > new Date(desde)
  const puedeGuardar = motivo.trim().length >= 3 && rangoValido && !crear.isPending

  const enviar = () => {
    const payload: BloqueoPayload = {
      sedeId: sedeForm,
      tipo,
      motivo: motivo.trim(),
      desde: new Date(desde).toISOString(),
      hasta: new Date(hasta).toISOString(),
      zonaId: zonaId || undefined,
    }
    crear.mutate(payload, {
      onSuccess: (bloqueo) =>
        {
          mostrar(
            bloqueo.reservasAfectadas > 0
              ? `Bloqueo creado: afecta ${bloqueo.reservasAfectadas} reserva(s). Revísalas y notifica.`
              : "Bloqueo creado; no afecta reservas existentes.",
            "exito",
          )
          onClose()
        },
      onError: (error) => mostrar(error instanceof ApiError ? error.message : "No se pudo crear el bloqueo.", "error"),
    })
  }

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onClose} />
      <div className="modal reserva-modal--ancho" role="dialog" aria-modal="true" aria-label="Nuevo bloqueo">
        <div className="modal__header">
          <span className="modal__icon">
            <CalendarPlus size={18} />
          </span>
          <div>
            <strong>Nuevo bloqueo o festivo</strong>
            <p>La franja deja de ofrecerse en la web y en el APK (RN-R5-11).</p>
          </div>
        </div>
        <div className="modal__body">
          <div className="reserva-campos-2">
            {esGlobal ? (
              <SelectField
                label="Sede"
                options={sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))}
                value={sedeForm}
                onChange={(event) => setSedeForm(event.target.value)}
              />
            ) : null}
            <SelectField label="Tipo" options={TIPOS} value={tipo} onChange={(event) => setTipo(event.target.value as TipoBloqueo)} />
            <SelectField label="Alcance" options={ZONA_OPCIONES} value={zonaId} onChange={(event) => setZonaId(event.target.value)} />
          </div>
          <div className="reserva-campos-2">
            <TextField label="Desde" type="datetime-local" value={desde} onChange={(event) => setDesde(event.target.value)} />
            <TextField
              label="Hasta"
              type="datetime-local"
              value={hasta}
              onChange={(event) => setHasta(event.target.value)}
              hint={rangoValido ? undefined : "El fin debe ser posterior al inicio"}
            />
          </div>
          <TextareaField
            label="Motivo (obligatorio)"
            placeholder="Festivo, mantenimiento, evento privado…"
            rows={3}
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
          />
          <p className="modal__note">
            Al guardar verás las reservas afectadas para notificarlas y reubicarlas sin sobre-asignar.
          </p>
        </div>
        <div className="modal__footer">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={!puedeGuardar} onClick={enviar}>
            {crear.isPending ? "Creando…" : "Crear bloqueo"}
          </Button>
        </div>
      </div>
    </>
  )
}
