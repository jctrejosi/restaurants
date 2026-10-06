import { useEffect, useMemo, useState } from "react"
import { Bell, Pencil, Plus, Save } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { NoPermissionState, ErrorState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SelectField, TextField, TextareaField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { useGuardarNotificaciones, useNotificaciones } from "@/modules/ajustes/api"
import {
  CANALES,
  CANAL_LABEL,
  EVENTOS,
  type CanalNotificacion,
  type ConfiguracionNotificacion,
  type EventoNotificacion,
  type NotificacionesResp,
  type PlantillaNotificacion,
} from "@/modules/ajustes/types"

const IDIOMAS = [
  { value: "es-MX", label: "Español (México)" },
  { value: "en-US", label: "Inglés (EE. UU.)" },
]

const VALORES_MUESTRA: Record<string, string> = {
  "{{cliente}}": "Laura Pérez",
  "{{folio}}": "P-8831",
  "{{total}}": "$845.00",
  "{{sucursal}}": "Punto C · Centro",
  "{{repartidor}}": "Carlos Méndez",
  "{{fecha}}": "12 de octubre",
  "{{hora}}": "14:00",
  "{{personas}}": "4",
  "{{dispositivo}}": "KDS Parrilla",
  "{{pendientes}}": "3",
}

function renderizar(texto: string): string {
  let resultado = texto
  for (const [variable, valor] of Object.entries(VALORES_MUESTRA)) {
    resultado = resultado.split(variable).join(valor)
  }
  return resultado
}

function mensajeError(error: unknown): string {
  return error instanceof ApiError ? error.message : "Ocurrió un error inesperado"
}

/** Pestaña «Notificaciones» (V1): plantillas por evento y canal con vista previa. */
export function NotificacionesTab({
  puedeVer,
  puedeEditar,
}: {
  puedeVer: boolean
  puedeEditar: boolean
}) {
  const { mostrar } = useToast()
  const notificaciones = useNotificaciones(puedeVer)
  const guardar = useGuardarNotificaciones()
  const [draft, setDraft] = useState<NotificacionesResp | null>(null)
  const [editando, setEditando] = useState<PlantillaNotificacion | null>(null)
  const [nueva, setNueva] = useState<{ evento: EventoNotificacion; canal: CanalNotificacion } | null>(null)
  const [confirmar, setConfirmar] = useState(false)

  useEffect(() => {
    if (notificaciones.data) setDraft(notificaciones.data)
  }, [notificaciones.data])

  const pendientesSinPlantilla = useMemo(() => {
    if (!draft) return 0
    return draft.configuracion.filter(
      (item) => item.activo && !draft.plantillas.some((plantilla) => plantilla.id === item.plantillaId),
    ).length
  }, [draft])

  if (!puedeVer) return <NoPermissionState permiso="notificaciones.ver" />
  if (notificaciones.isError) {
    return <ErrorState description="No pudimos cargar las plantillas de notificación." onRetry={() => void notificaciones.refetch()} />
  }
  if (notificaciones.isLoading || !draft) return <SkeletonRows rows={8} columns={4} />

  const plantillasDe = (evento: EventoNotificacion, canal: CanalNotificacion) =>
    draft.plantillas.filter((item) => item.evento === evento && item.canal === canal)

  const configDe = (evento: EventoNotificacion, canal: CanalNotificacion) =>
    draft.configuracion.find((item) => item.evento === evento && item.canal === canal)

  const actualizarConfig = (evento: EventoNotificacion, canal: CanalNotificacion, cambios: Partial<ConfiguracionNotificacion>) => {
    setDraft((actual) => {
      if (!actual) return actual
      const existe = actual.configuracion.some((item) => item.evento === evento && item.canal === canal)
      return {
        ...actual,
        configuracion: existe
          ? actual.configuracion.map((item) =>
              item.evento === evento && item.canal === canal ? { ...item, ...cambios } : item,
            )
          : [...actual.configuracion, { evento, canal, plantillaId: null, activo: false, ...cambios }],
      }
    })
  }

  const guardarPlantilla = (plantilla: PlantillaNotificacion) => {
    setDraft((actual) => {
      if (!actual) return actual
      const existe = actual.plantillas.some((item) => item.id === plantilla.id)
      return {
        ...actual,
        plantillas: existe
          ? actual.plantillas.map((item) => (item.id === plantilla.id ? plantilla : item))
          : [...actual.plantillas, plantilla],
      }
    })
    setEditando(null)
    setNueva(null)
  }

  return (
    <div className="ajustes-tab">
      <section className="panel ajustes-seccion">
        <div className="panel__header">
          <div>
            <div className="panel__title">
              <Bell size={14} /> Plantillas por evento y canal
            </div>
            <div className="panel__subtitle">
              Cada aviso usa la plantilla vigente; un canal activo sin plantilla queda bloqueado.
            </div>
          </div>
          <Button
            variant="primary"
            disabled={!puedeEditar || pendientesSinPlantilla > 0}
            title={
              !puedeEditar
                ? "Requiere permiso de notificaciones.editar"
                : pendientesSinPlantilla > 0
                  ? "Hay canales activos sin plantilla válida"
                  : undefined
            }
            onClick={() => setConfirmar(true)}
          >
            <Save size={14} /> Guardar notificaciones
          </Button>
        </div>

        {pendientesSinPlantilla > 0 ? (
          <p className="ajustes-aviso" role="note">
            Hay {pendientesSinPlantilla} canales activos sin plantilla válida; corrígelo antes de guardar.
          </p>
        ) : null}

        <div className="notif-lista">
          {EVENTOS.map((evento) => (
            <article className="notif-evento" key={evento.id}>
              <header className="notif-evento__head">
                <div>
                  <strong>{evento.label}</strong>
                  <small>
                    Variables: {evento.variables.map((variable) => (
                      <code key={variable}>{variable}</code>
                    ))}
                  </small>
                </div>
              </header>
              <div className="notif-canales">
                {CANALES.map((canal) => {
                  const config = configDe(evento.id, canal)
                  const plantillas = plantillasDe(evento.id, canal)
                  const activa = config?.activo ?? false
                  const sinPlantilla = activa && !plantillas.some((item) => item.id === config?.plantillaId)
                  return (
                    <div className={`notif-canal ${activa ? "notif-canal--activo" : ""}`} key={canal}>
                      <label className="notif-canal__toggle">
                        <input
                          type="checkbox"
                          checked={activa}
                          disabled={!puedeEditar}
                          onChange={(event) =>
                            actualizarConfig(evento.id, canal, { activo: event.target.checked })
                          }
                        />
                        {CANAL_LABEL[canal]}
                      </label>
                      {plantillas.length > 0 ? (
                        <select
                          className="input"
                          aria-label={`Plantilla de ${evento.label} por ${CANAL_LABEL[canal]}`}
                          value={config?.plantillaId ?? ""}
                          disabled={!puedeEditar}
                          onChange={(event) =>
                            actualizarConfig(evento.id, canal, { plantillaId: event.target.value || null })
                          }
                        >
                          <option value="">Sin plantilla</option>
                          {plantillas.map((plantilla) => (
                            <option key={plantilla.id} value={plantilla.id}>
                              {plantilla.asunto} · {plantilla.idioma}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="notif-canal__vacio">Sin plantilla</span>
                      )}
                      {sinPlantilla ? <StatusBadge tone="amber">Revisar</StatusBadge> : null}
                      <div className="notif-canal__acciones">
                        <Button
                          variant="ghost"
                          className="text-action"
                          disabled={!puedeEditar}
                          onClick={() => {
                            const existente = plantillas.find((item) => item.id === config?.plantillaId) ?? plantillas[0]
                            if (existente) setEditando({ ...existente })
                            else setNueva({ evento: evento.id, canal })
                          }}
                        >
                          {plantillas.length > 0 ? <Pencil size={12} /> : <Plus size={12} />}
                          {plantillas.length > 0 ? "Editar" : "Crear"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      {(editando || nueva) ? (
        <PlantillaEditor
          plantilla={
            editando ?? {
              id: `pl-${nueva?.evento}-${nueva?.canal}-${Date.now()}`,
              evento: nueva?.evento ?? "pedido.confirmado",
              canal: nueva?.canal ?? "email",
              idioma: "es-MX",
              asunto: "",
              cuerpo: "",
            }
          }
          variables={EVENTOS.find((evento) => evento.id === (editando ?? nueva)?.evento)?.variables ?? []}
          onCancel={() => {
            setEditando(null)
            setNueva(null)
          }}
          onGuardar={guardarPlantilla}
        />
      ) : null}

      <ConfirmDialog
        open={confirmar}
        title="Guardar configuración de notificaciones"
        description="Los avisos posteriores usan la plantilla vigente; los ya emitidos conservan la suya."
        impacto={`${draft.plantillas.length} plantillas y ${draft.configuracion.filter((item) => item.activo).length} canales activos.`}
        confirmLabel="Guardar notificaciones"
        onCancel={() => setConfirmar(false)}
        onConfirm={(motivo) => {
          setConfirmar(false)
          guardar.mutate(
            { plantillas: draft.plantillas, configuracion: draft.configuracion, motivo },
            {
              onSuccess: () => mostrar("Plantillas y canales actualizados y auditados", "exito"),
              onError: (error) => mostrar(mensajeError(error), "error"),
            },
          )
        }}
      />
    </div>
  )
}

function PlantillaEditor({
  plantilla,
  variables,
  onCancel,
  onGuardar,
}: {
  plantilla: PlantillaNotificacion
  variables: string[]
  onCancel: () => void
  onGuardar: (plantilla: PlantillaNotificacion) => void
}) {
  const [draft, setDraft] = useState(plantilla)

  useEffect(() => {
    setDraft(plantilla)
  }, [plantilla])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onCancel])

  const bloqueado = draft.asunto.trim().length < 3 || draft.cuerpo.trim().length < 10

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onCancel} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Editor de plantilla">
        <div className="modal__header">
          <span className="modal__icon">
            <Bell size={18} />
          </span>
          <div>
            <strong>
              Plantilla · {EVENTOS.find((evento) => evento.id === draft.evento)?.label} · {CANAL_LABEL[draft.canal]}
            </strong>
            <p>Usa las variables para personalizar; el aviso toma esta plantilla al emitirse.</p>
          </div>
        </div>
        <div className="modal__body">
          <SelectField
            label="Idioma"
            options={IDIOMAS}
            value={draft.idioma}
            onChange={(event) => setDraft({ ...draft, idioma: event.target.value })}
          />
          <TextField
            label="Asunto"
            value={draft.asunto}
            onChange={(event) => setDraft({ ...draft, asunto: event.target.value })}
          />
          <TextareaField
            label="Cuerpo"
            rows={4}
            value={draft.cuerpo}
            onChange={(event) => setDraft({ ...draft, cuerpo: event.target.value })}
          />
          <div className="plantilla-variables">
            {variables.map((variable) => (
              <button
                type="button"
                key={variable}
                className="chip"
                onClick={() => setDraft({ ...draft, cuerpo: `${draft.cuerpo} ${variable}`.trim() })}
              >
                {variable}
              </button>
            ))}
          </div>
          <div className="plantilla-preview">
            <strong>Vista previa</strong>
            <p>{renderizar(draft.asunto) || "Sin asunto"}</p>
            <small>{renderizar(draft.cuerpo) || "Sin cuerpo"}</small>
          </div>
        </div>
        <div className="modal__footer">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={bloqueado} onClick={() => onGuardar(draft)}>
            Aplicar plantilla
          </Button>
        </div>
      </div>
    </>
  )
}
