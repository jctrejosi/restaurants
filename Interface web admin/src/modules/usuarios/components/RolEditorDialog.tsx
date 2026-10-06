import { useEffect, useState } from "react"
import { Shield } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { TextField, TextareaField } from "@/components/ui/fields"
import type { Rol } from "@/modules/usuarios/types"

/** Alta o edición de una plantilla local (los roles de sistema solo se clonan). */
export function RolEditorDialog({
  open,
  rol,
  guardando,
  errorServidor,
  onCancel,
  onGuardar,
}: {
  open: boolean
  rol: Rol | null
  guardando: boolean
  errorServidor?: string | null
  onCancel: () => void
  onGuardar: (payload: { nombre: string; descripcion: string }) => void
}) {
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")

  useEffect(() => {
    if (!open) return
    setNombre(rol?.nombre ?? "")
    setDescripcion(rol?.descripcion ?? "")
  }, [open, rol])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  const bloqueado = nombre.trim().length < 3 || guardando

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onCancel} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Editor de rol">
        <div className="modal__header">
          <span className="modal__icon">
            <Shield size={18} />
          </span>
          <div>
            <strong>{rol ? `Editar ${rol.nombre}` : "Nuevo rol"}</strong>
            <p>La matriz de permisos se ajusta después, con motivo y auditoría.</p>
          </div>
        </div>
        <div className="modal__body">
          <TextField
            label="Nombre"
            placeholder="p. ej. Anfitrión de piso"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
          />
          <TextareaField
            label="Descripción"
            rows={3}
            placeholder="¿Qué puede hacer este rol?"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
          />
          {errorServidor ? <p className="modal__impact">{errorServidor}</p> : null}
        </div>
        <div className="modal__footer">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={bloqueado}
            title={nombre.trim().length < 3 ? "Escribe un nombre de al menos 3 caracteres" : undefined}
            onClick={() => onGuardar({ nombre: nombre.trim(), descripcion: descripcion.trim() })}
          >
            {guardando ? "Guardando…" : rol ? "Guardar cambios" : "Crear rol"}
          </Button>
        </div>
      </div>
    </>
  )
}
