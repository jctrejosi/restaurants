import { useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Drawer } from "@/components/ui/Drawer"
import { SelectField, TextField, type SelectOption } from "@/components/ui/fields"
import type { Sede } from "@/app/sede"
import { VEHICULO_LABEL, type Repartidor, type RepartidorPayload } from "@/modules/domicilio/types"

/** Alta y edición de repartidores (no inician sesión en el panel). */
export function CourierForm({
  open,
  repartidor,
  sedes,
  sucursalPredeterminada,
  guardando,
  errorServidor,
  onClose,
  onGuardar,
}: {
  open: boolean
  repartidor: Repartidor | null
  sedes: Sede[]
  sucursalPredeterminada: string | null
  guardando: boolean
  errorServidor: string | null
  onClose: () => void
  onGuardar: (payload: RepartidorPayload) => void
}) {
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [vehiculo, setVehiculo] = useState("moto")
  const [sucursalId, setSucursalId] = useState("")
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setNombre(repartidor?.nombre ?? "")
    setTelefono(repartidor?.telefono ?? "")
    setVehiculo(repartidor?.vehiculo ?? "moto")
    setSucursalId(repartidor?.sucursalId ?? sucursalPredeterminada ?? sedes[0]?.id ?? "")
    setErrorLocal(null)
  }, [open, repartidor, sucursalPredeterminada, sedes])

  const opcionesSede: SelectOption[] = sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))
  const opcionesVehiculo: SelectOption[] = Object.entries(VEHICULO_LABEL).map(([value, label]) => ({
    value,
    label,
  }))

  const guardar = () => {
    if (!nombre.trim()) {
      setErrorLocal("El nombre del repartidor es obligatorio.")
      return
    }
    if (telefono.trim().length < 8) {
      setErrorLocal("Captura un teléfono válido para avisarle de las asignaciones.")
      return
    }
    setErrorLocal(null)
    onGuardar({
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      vehiculo: vehiculo as RepartidorPayload["vehiculo"],
      sucursalId,
    })
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={560}
      title={repartidor ? `Editar a ${repartidor.nombre}` : "Nuevo repartidor"}
      subtitle="La asignación de entregas le notifica por el canal configurado."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : repartidor ? "Guardar cambios" : "Dar de alta"}
          </Button>
        </>
      }
    >
      <div className="zone-form">
        <div className="zone-form__grid">
          <TextField label="Nombre completo" value={nombre} onChange={(event) => setNombre(event.target.value)} />
          <TextField
            label="Teléfono"
            placeholder="+52 55 0000 0000"
            value={telefono}
            onChange={(event) => setTelefono(event.target.value)}
          />
          <SelectField
            label="Vehículo"
            options={opcionesVehiculo}
            value={vehiculo}
            onChange={(event) => setVehiculo(event.target.value)}
          />
          <SelectField
            label={repartidor ? "Sucursal (fija)" : "Sucursal"}
            options={opcionesSede}
            value={sucursalId}
            disabled={Boolean(repartidor)}
            onChange={(event) => setSucursalId(event.target.value)}
          />
        </div>
        <p className="domicilio-notice">
          El repartidor no es un usuario del panel: su estado (activo, ocupado, inactivo) y sus entregas se
          administran desde aquí.
        </p>
        {errorLocal || errorServidor ? <p className="form-error">{errorLocal ?? errorServidor}</p> : null}
      </div>
    </Drawer>
  )
}
