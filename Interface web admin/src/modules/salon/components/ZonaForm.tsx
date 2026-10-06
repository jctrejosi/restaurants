import { useEffect, useState } from "react"
import { PenSquare, Plus } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { TextField, TextareaField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { useCrearZona, useEditarZona } from "@/modules/salon/api"
import type { Zona } from "@/modules/salon/types"

/** Alta y edición de zonas con posición y tamaño dentro del grid del mapa. */
export function ZonaForm({
  open,
  zona,
  sedeId,
  onClose,
}: {
  open: boolean
  zona?: Zona | null
  sedeId: string
  onClose: () => void
}) {
  const { mostrar } = useToast()
  const crear = useCrearZona()
  const editar = useEditarZona()
  const esEdicion = Boolean(zona)

  const [nombre, setNombre] = useState("")
  const [aforo, setAforo] = useState("20")
  const [x, setX] = useState("0")
  const [y, setY] = useState("0")
  const [ancho, setAncho] = useState("6")
  const [alto, setAlto] = useState("4")
  const [motivo, setMotivo] = useState("")

  useEffect(() => {
    if (!open) return
    setNombre(zona?.nombre ?? "")
    setAforo(String(zona?.aforo ?? 20))
    setX(String(zona?.x ?? 0))
    setY(String(zona?.y ?? 0))
    setAncho(String(zona?.ancho ?? 6))
    setAlto(String(zona?.alto ?? 4))
    setMotivo("")
  }, [open, zona])

  if (!open) return null

  const valido =
    nombre.trim().length >= 3 && Number(aforo) >= 1 && Number(ancho) >= 3 && Number(alto) >= 3 && (!esEdicion || motivo.trim().length >= 3)
  const pendiente = crear.isPending || editar.isPending

  const guardar = () => {
    const manejarError = (error: unknown) =>
      mostrar(error instanceof ApiError ? error.message : "No se pudo guardar la zona.", "error")
    if (esEdicion && zona) {
      editar.mutate(
        {
          id: zona.id,
          nombre: nombre.trim(),
          aforo: Number(aforo),
          x: Number(x),
          y: Number(y),
          ancho: Number(ancho),
          alto: Number(alto),
          motivo: motivo.trim(),
        },
        { onSuccess: () => { mostrar("Zona actualizada y auditada.", "exito"); onClose() }, onError: manejarError },
      )
      return
    }
    crear.mutate(
      {
        sedeId,
        nombre: nombre.trim(),
        aforo: Number(aforo),
        x: Number(x),
        y: Number(y),
        ancho: Number(ancho),
        alto: Number(alto),
      },
      { onSuccess: () => { mostrar("Zona creada.", "exito"); onClose() }, onError: manejarError },
    )
  }

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onClose} />
      <div className="modal salon-modal--ancho" role="dialog" aria-modal="true" aria-label={esEdicion ? `Editar zona ${zona?.nombre}` : "Nueva zona"}>
        <div className="modal__header">
          <span className="modal__icon">{esEdicion ? <PenSquare size={18} /> : <Plus size={18} />}</span>
          <div>
            <strong>{esEdicion ? `Editar «${zona?.nombre}»` : "Nueva zona"}</strong>
            <p>La zona ubica mesas en el grid del mapa; el aforo limita la disponibilidad de la web (V1).</p>
          </div>
        </div>
        <div className="modal__body">
          <TextField label="Nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} />
          <div className="salon-campos-3">
            <TextField label="Aforo" type="number" min={1} value={aforo} onChange={(event) => setAforo(event.target.value)} />
            <TextField label="Celdas de ancho" type="number" min={3} value={ancho} onChange={(event) => setAncho(event.target.value)} />
            <TextField label="Celdas de alto" type="number" min={3} value={alto} onChange={(event) => setAlto(event.target.value)} />
          </div>
          <div className="salon-campos-2">
            <TextField label="Columna (x)" type="number" min={0} value={x} onChange={(event) => setX(event.target.value)} />
            <TextField label="Fila (y)" type="number" min={0} value={y} onChange={(event) => setY(event.target.value)} />
          </div>
          {esEdicion ? (
            <TextareaField
              label="Motivo del cambio (obligatorio)"
              rows={2}
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
            />
          ) : null}
          <p className="modal__note">
            Los cambios de aforo o capacidad no alteran reservas creadas; se avisa del efecto en la disponibilidad futura
            (RN-R5-04).
          </p>
        </div>
        <div className="modal__footer">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={!valido || pendiente} onClick={guardar}>
            {pendiente ? "Guardando…" : esEdicion ? "Guardar zona" : "Crear zona"}
          </Button>
        </div>
      </div>
    </>
  )
}
