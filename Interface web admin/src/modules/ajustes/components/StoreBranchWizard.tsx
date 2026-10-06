import { useEffect, useState } from "react"
import { Building2, Copy } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { SelectField, TextField, TextareaField, type SelectOption } from "@/components/ui/fields"
import { MONEDAS, ZONAS_HORARIAS, type ClonarConfiguracion, type CrearSucursalPayload, type Sucursal } from "@/modules/ajustes/types"

const COPIAR_OPCIONES: { clave: keyof ClonarConfiguracion; label: string; detalle: string }[] = [
  { clave: "configuracion", label: "Parámetros de operación", detalle: "Propina, copias, offline, ventanas y límites" },
  { clave: "horarios", label: "Horarios de atención", detalle: "Rejilla semanal completa" },
  { clave: "capacidad", label: "Reglas de capacidad", detalle: "Límites por franja" },
  { clave: "mediosPago", label: "Medios de pago", detalle: "Se configuran en el módulo de caja/pagos" },
]

/** Asistente de alta de sede con clonado de configuración (V1, RF-R5-164). */
export function StoreBranchWizard({
  open,
  sedes,
  guardando,
  errorServidor,
  onClose,
  onConfirm,
}: {
  open: boolean
  sedes: Sucursal[]
  guardando: boolean
  errorServidor?: string | null
  onClose: () => void
  onConfirm: (payload: CrearSucursalPayload) => void
}) {
  const [paso, setPaso] = useState(0)
  const [nombre, setNombre] = useState("")
  const [codigo, setCodigo] = useState("")
  const [direccion, setDireccion] = useState("")
  const [ciudad, setCiudad] = useState("")
  const [telefono, setTelefono] = useState("")
  const [zonaHoraria, setZonaHoraria] = useState("America/Mexico_City")
  const [moneda, setMoneda] = useState("MXN")
  const [clonarDe, setClonarDe] = useState("")
  const [copiar, setCopiar] = useState<ClonarConfiguracion>({
    configuracion: true,
    horarios: true,
    capacidad: true,
    mediosPago: false,
  })
  const [motivo, setMotivo] = useState("")

  useEffect(() => {
    if (!open) return
    setPaso(0)
    setNombre("")
    setCodigo("")
    setDireccion("")
    setCiudad("")
    setTelefono("")
    setZonaHoraria(sedes[0]?.zonaHoraria ?? "America/Mexico_City")
    setMoneda(sedes[0]?.moneda ?? "MXN")
    setClonarDe(sedes[0]?.id ?? "")
    setCopiar({ configuracion: true, horarios: true, capacidad: true, mediosPago: false })
    setMotivo("")
  }, [open, sedes])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const opcionesSede: SelectOption[] = sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))
  const pasoValido =
    paso === 0 ? nombre.trim().length >= 3 && codigo.trim().length >= 3 : paso === 1 ? true : motivo.trim().length >= 3
  const base = sedes.find((sede) => sede.id === clonarDe)

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onClose} />
      <div className="modal modal--wizard" role="dialog" aria-modal="true" aria-label="Alta de sucursal">
        <div className="modal__header">
          <span className="modal__icon">
            <Building2 size={18} />
          </span>
          <div>
            <strong>Alta de sucursal</strong>
            <p>Paso {paso + 1} de 3 · {paso === 0 ? "Datos base" : paso === 1 ? "Clonar configuración" : "Confirmación"}</p>
          </div>
        </div>

        <div className="modal__body">
          {paso === 0 ? (
            <div className="wizard-datos">
              <div className="form-grid">
                <TextField label="Nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} />
                <TextField label="Código" value={codigo} onChange={(event) => setCodigo(event.target.value)} />
                <TextField label="Dirección" value={direccion} onChange={(event) => setDireccion(event.target.value)} />
                <TextField label="Ciudad" value={ciudad} onChange={(event) => setCiudad(event.target.value)} />
                <TextField label="Teléfono" value={telefono} onChange={(event) => setTelefono(event.target.value)} />
                <SelectField
                  label="Zona horaria"
                  options={ZONAS_HORARIAS.map((zona) => ({ value: zona, label: zona }))}
                  value={zonaHoraria}
                  onChange={(event) => setZonaHoraria(event.target.value)}
                />
                <SelectField
                  label="Moneda"
                  options={MONEDAS.map((item) => ({ value: item, label: item }))}
                  value={moneda}
                  onChange={(event) => setMoneda(event.target.value)}
                />
              </div>
            </div>
          ) : paso === 1 ? (
            <div className="wizard-datos">
              <SelectField
                label="Clonar configuración de"
                options={opcionesSede}
                placeholder="Sin clonar (valores por defecto)"
                value={clonarDe}
                onChange={(event) => setClonarDe(event.target.value)}
              />
              <p className="modal__impact">
                <Copy size={13} /> La sede nueva hereda la base y luego se ajusta; los impuestos son
                globales del tenant y no se copian.
              </p>
              <div className="copiar-lista">
                {COPIAR_OPCIONES.map((opcion) => (
                  <label className="ajustes-check" key={opcion.clave}>
                    <input
                      type="checkbox"
                      checked={copiar[opcion.clave]}
                      disabled={!clonarDe}
                      onChange={(event) => setCopiar({ ...copiar, [opcion.clave]: event.target.checked })}
                    />
                    <span>
                      <strong>{opcion.label}</strong>
                      <small>{opcion.detalle}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="wizard-datos">
              <ul className="wizard-resumen">
                <li>
                  Sede <strong>{nombre}</strong>
                </li>
                <li>
                  Código <strong>{codigo}</strong>
                </li>
                <li>
                  Zona y moneda{" "}
                  <strong>
                    {zonaHoraria} · {moneda}
                  </strong>
                </li>
                <li>
                  Configuración base <strong>{base ? base.nombre : "Valores por defecto"}</strong>
                </li>
                <li className="wizard-resumen__nota">
                  <Copy size={13} /> Se copian:{" "}
                  {COPIAR_OPCIONES.filter((opcion) => copiar[opcion.clave]).map((opcion) => opcion.label).join(", ") ||
                    "nada (solo datos base)"}
                </li>
              </ul>
              <TextareaField
                label="Motivo (obligatorio)"
                rows={3}
                placeholder="p. ej. apertura de sucursal norte"
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
              />
            </div>
          )}

          {errorServidor ? <p className="modal__impact">{errorServidor}</p> : null}
        </div>

        <div className="modal__footer">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          {paso > 0 ? (
            <Button variant="ghost" onClick={() => setPaso((actual) => actual - 1)}>
              Atrás
            </Button>
          ) : null}
          {paso < 2 ? (
            <Button variant="primary" disabled={!pasoValido} onClick={() => setPaso((actual) => actual + 1)}>
              Siguiente
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={!pasoValido || guardando}
              onClick={() =>
                onConfirm({
                  nombre: nombre.trim(),
                  codigo: codigo.trim(),
                  direccion: direccion.trim(),
                  ciudad: ciudad.trim(),
                  telefono: telefono.trim(),
                  zonaHoraria,
                  moneda,
                  clonarDe: clonarDe || null,
                  copiar,
                  motivo: motivo.trim(),
                })
              }
            >
              {guardando ? "Creando sede…" : "Crear sucursal"}
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
