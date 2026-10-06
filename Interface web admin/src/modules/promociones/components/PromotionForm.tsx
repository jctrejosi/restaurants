/**
 * Formulario de promoción/banner (RF-R5-100): vigencia con zona de la sede,
 * sede o todas, previsualización y validación `desde < hasta`. Lo vencido se
 * marca «vencido» y no se publica.
 */

import { useEffect, useState } from "react"
import { Save } from "lucide-react"
import { useSede } from "@/app/sede"
import { useAuth } from "@/app/auth"
import { Button } from "@/components/ui/Button"
import { Drawer } from "@/components/ui/Drawer"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SelectField, TextField, TextareaField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { formatDateTime } from "@/lib/format"
import { useGuardarPromocion } from "@/modules/promociones/api"
import {
  PROMOCION_TIPO_LABEL,
  estadoPromocion,
  type Promocion,
  type PromocionTipo,
} from "@/modules/promociones/types"

function aInputLocal(iso: string): string {
  const fecha = new Date(iso)
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function aIso(valor: string, respaldo: string): string {
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? respaldo : fecha.toISOString()
}

export function PromotionForm({
  abierto,
  promocion,
  onCerrar,
  onGuardado,
}: {
  abierto: boolean
  /** `null` o sin id = alta; con id = edición; una copia sin id = duplicar. */
  promocion: Promocion | null
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}) {
  const { sedes, zonaHoraria } = useSede()
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const guardar = useGuardarPromocion()

  const [titulo, setTitulo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [tipo, setTipo] = useState<PromocionTipo>("banner")
  const [sucursalId, setSucursalId] = useState("")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [imagenUrl, setImagenUrl] = useState("")
  const [enlace, setEnlace] = useState("")

  const esNuevo = !promocion?.id
  const puedeEditar = tienePermiso("promociones.editar")

  useEffect(() => {
    if (!abierto) return
    const ahora = new Date()
    const enUnaSemana = new Date(ahora.getTime() + 7 * 24 * 60 * 60_000)
    setTitulo(promocion?.titulo ?? "")
    setDescripcion(promocion?.descripcion ?? "")
    setTipo(promocion?.tipo ?? "banner")
    setSucursalId(promocion?.sucursalId ?? "")
    setDesde(aInputLocal(promocion?.desde ?? ahora.toISOString()))
    setHasta(aInputLocal(promocion?.hasta ?? enUnaSemana.toISOString()))
    setImagenUrl(promocion?.imagenUrl ?? "")
    setEnlace(promocion?.enlace ?? "")
  }, [abierto, promocion])

  const desdeIso = aIso(desde, new Date().toISOString())
  const hastaIso = aIso(hasta, new Date().toISOString())
  const vigenciaInvalida = new Date(hastaIso).getTime() <= new Date(desdeIso).getTime()
  const yaVencida = new Date(hastaIso).getTime() < Date.now()

  const guardarFormulario = () => {
    if (titulo.trim().length < 2) {
      mostrar("El título es obligatorio.", "error")
      return
    }
    if (vigenciaInvalida) {
      mostrar("La vigencia debe cumplir desde < hasta.", "error")
      return
    }
    guardar.mutate(
      {
        id: promocion?.id || undefined,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        tipo,
        sucursalId: sucursalId || null,
        desde: desdeIso,
        hasta: hastaIso,
        imagenUrl: imagenUrl.trim(),
        enlace: enlace.trim(),
        version: promocion?.version,
      },
      {
        onSuccess: () => onGuardado(esNuevo ? "Promoción creada como pausada." : "Promoción actualizada."),
        onError: (error) => mostrar(error instanceof Error ? error.message : "No se pudo guardar la promoción.", "error"),
      },
    )
  }

  const previsualizacion: Promocion = {
    id: promocion?.id ?? "nueva",
    titulo: titulo || "Título de la promoción",
    descripcion,
    tipo,
    sucursalId: sucursalId || null,
    desde: desdeIso,
    hasta: hastaIso,
    publicada: promocion?.publicada ?? false,
    imagenUrl,
    enlace,
    actualizadoEn: new Date().toISOString(),
    actualizadoPor: "—",
    version: promocion?.version ?? 0,
  }

  return (
    <Drawer
      open={abierto}
      onClose={onCerrar}
      title={esNuevo ? (promocion ? "Duplicar promoción" : "Nueva promoción o banner") : `Editar ${promocion?.titulo}`}
      subtitle="Lo vencido no se publica; para reutilizarlo duplícalo."
      width={720}
      footer={
        <>
          <span className="product-form__paso">
            {sucursalId ? sedes.find((sede) => sede.id === sucursalId)?.nombre : "Aplica a todas las sedes"}
          </span>
          <div className="product-form__footer-actions">
            <Button variant="secondary" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={guardar.isPending || !puedeEditar || vigenciaInvalida}
              title={puedeEditar ? undefined : "Requiere permiso de promociones.editar"}
              onClick={guardarFormulario}
            >
              <Save size={15} /> {guardar.isPending ? "Guardando…" : "Guardar promoción"}
            </Button>
          </div>
        </>
      }
    >
      <div className="form-grid">
        <TextField
          className="form-grid__ancho"
          label="Título"
          value={titulo}
          onChange={(event) => setTitulo(event.target.value)}
        />
        <SelectField
          label="Tipo"
          options={Object.entries(PROMOCION_TIPO_LABEL).map(([value, label]) => ({ value, label }))}
          value={tipo}
          onChange={(event) => setTipo(event.target.value as PromocionTipo)}
        />
        <SelectField
          label="Sede"
          options={sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))}
          placeholder="Todas las sedes"
          value={sucursalId}
          onChange={(event) => setSucursalId(event.target.value)}
        />
        <TextField
          label="Vigente desde"
          type="datetime-local"
          value={desde}
          onChange={(event) => setDesde(event.target.value)}
        />
        <TextField
          label="Vigente hasta"
          type="datetime-local"
          value={hasta}
          onChange={(event) => setHasta(event.target.value)}
        />
        <TextField
          label="Imagen (URL pública)"
          value={imagenUrl}
          placeholder="https://…"
          onChange={(event) => setImagenUrl(event.target.value)}
        />
        <TextField label="Enlace" value={enlace} onChange={(event) => setEnlace(event.target.value)} />
        <TextareaField
          className="form-grid__ancho"
          label="Descripción"
          rows={2}
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
        />
      </div>

      {vigenciaInvalida ? (
        <div className="notice notice--error">La vigencia debe cumplir desde &lt; hasta.</div>
      ) : yaVencida ? (
        <div className="notice notice--warn">
          La vigencia ya terminó: se guardará como <strong>vencida</strong> y no podrá publicarse.
        </div>
      ) : (
        <div className="notice notice--ok">
          Se publicará a las {formatDateTime(desdeIso, zonaHoraria)} (hora de la sede).
        </div>
      )}

      <div className="product-form__seccion">
        <div className="panel__title">Previsualización</div>
        <div className="promo-preview">
          {imagenUrl.startsWith("http") ? <img src={imagenUrl} alt={titulo || "Previsualización"} /> : <div className="promo-preview__placeholder">Sin imagen</div>}
          <div className="promo-preview__cuerpo">
            <div className="promo-preview__head">
              <strong>{previsualizacion.titulo}</strong>
              <StatusBadge tone={estadoPromocion(previsualizacion) === "vigente" ? "green" : "gray"}>
                {estadoPromocion(previsualizacion)}
              </StatusBadge>
            </div>
            <p>{previsualizacion.descripcion || "Descripción de la promoción para la carta digital."}</p>
            <small>
              {sucursalId ? sedes.find((sede) => sede.id === sucursalId)?.nombre : "Todas las sedes"} ·{" "}
              {formatDateTime(desdeIso, zonaHoraria)} → {formatDateTime(hastaIso, zonaHoraria)}
            </small>
          </div>
        </div>
      </div>
    </Drawer>
  )
}
