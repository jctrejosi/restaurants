import { useEffect, useState } from "react"
import { Pencil, Save, UserRound, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { TextField, TextareaField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/app/auth"
import { ApiError } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { useActualizarCliente, useRegistrarAcceso } from "@/modules/clientes/api"
import { MaskedField } from "@/modules/clientes/components/MaskedField"
import type { ClienteDetalle } from "@/modules/clientes/types"

/** Resumen de la ficha: contacto enmascarado, preferencias, notas y rectificación. */
export function ClientResumenTab({
  cliente,
  puedeVerPii,
  zonaHoraria,
  onRecargar,
}: {
  cliente: ClienteDetalle
  puedeVerPii: boolean
  zonaHoraria: string
  onRecargar: () => void
}) {
  const { mostrar } = useToast()
  const { tienePermiso } = useAuth()
  const actualizar = useActualizarCliente()
  const registrarAcceso = useRegistrarAcceso()

  const puedeEditar = tienePermiso("clientes.editar")
  const [editando, setEditando] = useState(false)
  const [dialogoOpen, setDialogoOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorConflicto, setErrorConflicto] = useState(false)

  const [nombre, setNombre] = useState(cliente.nombre)
  const [telefono, setTelefono] = useState(cliente.telefono ?? "")
  const [correo, setCorreo] = useState(cliente.correo ?? "")
  const [fechaNacimiento, setFechaNacimiento] = useState(cliente.fechaNacimiento ?? "")
  const [preferencias, setPreferencias] = useState(cliente.preferencias.join(", "))
  const [notas, setNotas] = useState(cliente.notas ?? "")

  useEffect(() => {
    setNombre(cliente.nombre)
    setTelefono(cliente.telefono ?? "")
    setCorreo(cliente.correo ?? "")
    setFechaNacimiento(cliente.fechaNacimiento ?? "")
    setPreferencias(cliente.preferencias.join(", "))
    setNotas(cliente.notas ?? "")
  }, [cliente.id, cliente.actualizadoEn])

  const verDato = (campo: string) => registrarAcceso.mutate({ clienteId: cliente.id, campo })

  const guardar = (motivo: string) => {
    if (!nombre.trim()) {
      setError("El nombre no puede quedar vacío.")
      return
    }
    actualizar.mutate(
      {
        id: cliente.id,
        payload: {
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          correo: correo.trim(),
          fechaNacimiento: fechaNacimiento || undefined,
          preferencias: preferencias
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          notas: notas.trim() || undefined,
          motivo,
          actualizadoEn: cliente.actualizadoEn,
        },
      },
      {
        onSuccess: () => {
          mostrar("Rectificación guardada; el antes/después queda en auditoría.", "exito")
          setEditando(false)
          setError(null)
          setErrorConflicto(false)
        },
        onError: (fallo) => {
          if (fallo instanceof ApiError && fallo.codigo === "conflicto_edicion") {
            setErrorConflicto(true)
            setError(fallo.message)
          } else {
            setError(fallo instanceof ApiError ? fallo.message : "No se pudo guardar la rectificación.")
          }
        },
      },
    )
  }

  return (
    <div className="cliente-tab">
      <section className="cliente-bloque">
        <div className="cliente-bloque__head">
          <h4>
            <UserRound size={14} /> Datos de contacto
          </h4>
          {puedeEditar && !cliente.anonimizado ? (
            <Button variant="ghost" className="text-action" onClick={() => setEditando((valor) => !valor)}>
              {editando ? (
                <>
                  <X size={13} /> Cancelar
                </>
              ) : (
                <>
                  <Pencil size={13} /> Editar ficha
                </>
              )}
            </Button>
          ) : null}
        </div>

        {editando ? (
          <div className="cliente-form">
            <div className="cliente-form__grid">
              <TextField label="Nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} />
              <TextField label="Teléfono" value={telefono} onChange={(event) => setTelefono(event.target.value)} />
              <TextField label="Correo" type="email" value={correo} onChange={(event) => setCorreo(event.target.value)} />
              <TextField
                label="Fecha de nacimiento"
                type="date"
                value={fechaNacimiento}
                onChange={(event) => setFechaNacimiento(event.target.value)}
              />
            </div>
            <TextField
              label="Preferencias (separadas por coma)"
              placeholder="Mesa exterior, Sin gluten"
              value={preferencias}
              onChange={(event) => setPreferencias(event.target.value)}
            />
            <TextareaField
              label="Notas internas"
              rows={3}
              value={notas}
              onChange={(event) => setNotas(event.target.value)}
            />
            <div className="cliente-form__actions">
              <Button variant="primary" disabled={actualizar.isPending} onClick={() => setDialogoOpen(true)}>
                <Save size={15} /> {actualizar.isPending ? "Guardando…" : "Guardar rectificación"}
              </Button>
              <span className="clientes-hint">La rectificación exige motivo y guarda antes/después en auditoría.</span>
            </div>
          </div>
        ) : (
          <div className="cliente-contacto">
            <MaskedField
              label="Nombre"
              campo="nombre"
              value={cliente.nombre}
              tipo="nombre"
              puedeVer={puedeVerPii}
              onVer={verDato}
              ocupado={registrarAcceso.isPending}
            />
            <MaskedField
              label="Teléfono"
              campo="telefono"
              value={cliente.telefono}
              puedeVer={puedeVerPii}
              onVer={verDato}
              ocupado={registrarAcceso.isPending}
            />
            <MaskedField
              label="Correo"
              campo="correo"
              value={cliente.correo}
              puedeVer={puedeVerPii}
              onVer={verDato}
              ocupado={registrarAcceso.isPending}
            />
            <div className="masked-field">
              <strong>Fecha de nacimiento</strong>
              <span className="masked-field__value">
                {puedeVerPii && cliente.fechaNacimiento ? cliente.fechaNacimiento : "••/••/••••"}
              </span>
            </div>
          </div>
        )}

        {errorConflicto ? (
          <div className="clientes-alert clientes-alert--late">
            <p>{error}</p>
            <Button variant="secondary" onClick={onRecargar}>
              Recargar ficha
            </Button>
          </div>
        ) : error ? (
          <p className="clientes-error">{error}</p>
        ) : null}
      </section>

      <section className="cliente-bloque">
        <h4>Preferencias</h4>
        {cliente.preferencias.length === 0 ? (
          <p className="clientes-hint">Sin preferencias capturadas.</p>
        ) : (
          <div className="cliente-tags">
            {cliente.preferencias.map((preferencia) => (
              <span className="cliente-tag" key={preferencia}>
                {preferencia}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="cliente-bloque">
        <h4>Notas internas</h4>
        {puedeEditar ? (
          cliente.notas ? (
            <p className="cliente-notas">{cliente.notas}</p>
          ) : (
            <p className="clientes-hint">Sin notas.</p>
          )
        ) : (
          <p className="clientes-notice">
            Las notas internas son dato personal: solo se muestran con permiso <code>clientes.editar</code>.
          </p>
        )}
        <small className="clientes-hint">
          Última actualización de la ficha: {formatDateTime(cliente.actualizadoEn, zonaHoraria)}
        </small>
      </section>

      <ConfirmDialog
        open={dialogoOpen}
        title="Guardar rectificación"
        description="El cambio queda auditado con el valor anterior y el nuevo (ARCO)."
        impacto={`Se actualizará la ficha de ${cliente.nombre}. Un guardado concurrente recibirá 409 y no pisará las notas.`}
        confirmLabel="Guardar cambios"
        onCancel={() => setDialogoOpen(false)}
        onConfirm={(motivo) => {
          guardar(motivo)
          setDialogoOpen(false)
        }}
      />
    </div>
  )
}
