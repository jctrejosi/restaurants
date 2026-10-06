import { useEffect, useState } from "react"
import { StickyNote } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { TextareaField } from "@/components/ui/fields"
import { DialogoBase } from "@/modules/tomar-pedido/components/DialogoBase"
import type { LineaCarrito } from "@/modules/tomar-pedido/types"

const SUGERENCIAS = [
  "Sin cebolla",
  "Sin picante",
  "Sin lácteos",
  "Término bien cocido",
  "Para compartir",
  "Alergia a nueces",
]

/** Nota libre por línea: atajos con vocabulario de cocina (plan §3). */
export function NotaLineaDialog({
  open,
  linea,
  onClose,
  onGuardar,
}: {
  open: boolean
  linea: LineaCarrito | null
  onClose: () => void
  onGuardar: (nota: string) => void
}) {
  const [nota, setNota] = useState("")

  useEffect(() => {
    if (open) setNota(linea?.notas ?? "")
  }, [open, linea])

  if (!linea) return null

  return (
    <DialogoBase
      open={open}
      onClose={onClose}
      icon={<StickyNote size={18} />}
      title={`Nota · ${linea.nombreSnapshot}`}
      subtitle="La nota viaja a la comanda de la estación y al ticket"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => onGuardar(nota.trim())}>
            Guardar nota
          </Button>
        </>
      }
    >
      <div className="tp-nota__chips">
        {SUGERENCIAS.map((sugerencia) => (
          <button
            key={sugerencia}
            type="button"
            className="button tp-nota__chip"
            onClick={() =>
              setNota((actual) => (actual.trim().length === 0 ? sugerencia : `${actual}, ${sugerencia}`))
            }
          >
            {sugerencia}
          </button>
        ))}
      </div>
      <TextareaField
        label="Nota para cocina"
        placeholder="Ej. Sin cebolla y término bien cocido"
        rows={3}
        value={nota}
        onChange={(event) => setNota(event.target.value)}
      />
      <p className="modal__note">Vacía el campo para quitar la nota de la línea.</p>
    </DialogoBase>
  )
}
