/**
 * Reseñas y encuestas (RF-R5-103, plan 08 §3): cola de moderación con decisión
 * auditada (publicar o rechazar con motivo, RN-R5-02) y consulta agregada de
 * encuestas. Una reseña ofensiva no se publica.
 */

import { useState } from "react"
import { Ban, Check, Star } from "lucide-react"
import { useAuth } from "@/app/auth"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Button } from "@/components/ui/Button"
import { FilterBar } from "@/components/data/FilterBar"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SelectField } from "@/components/ui/fields"
import { NoPermissionState } from "@/components/ui/states"
import { useToast } from "@/components/ui/toast"
import { formatDateTime, formatRelative, maskName } from "@/lib/format"
import { useEncuestas, useModerarResena, useResenas } from "@/modules/promociones/api"
import {
  RESENA_ESTADO_LABEL,
  RESENA_ESTADO_TONE,
  RESENA_FUENTE_LABEL,
  type Resena,
  type ResenaEstado,
  type ResenaFuente,
} from "@/modules/promociones/types"

function Puntaje({ valor }: { valor: number }) {
  return (
    <span className="promo-puntaje" aria-label={`${valor} de 5`}>
      {Array.from({ length: 5 }).map((_, indice) => (
        <Star key={indice} size={13} className={indice < valor ? "promo-puntaje__llena" : "promo-puntaje__vacia"} />
      ))}
      <strong>{valor}/5</strong>
    </span>
  )
}

export function ReviewModeration() {
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const [estado, setEstado] = useState<string>("pendiente")
  const [fuente, setFuente] = useState("")
  const [objetivo, setObjetivo] = useState<{ resena: Resena; decision: "publicar" | "rechazar" } | null>(null)

  const resenas = useResenas({
    estado: estado === "todas" ? undefined : (estado as ResenaEstado),
    fuente: (fuente as ResenaFuente) || undefined,
  })
  const encuestas = useEncuestas()
  const moderar = useModerarResena()

  const puedeModerar = tienePermiso("resenas.moderar")

  if (!tienePermiso("promociones.ver") && !puedeModerar) {
    return <NoPermissionState permiso="resenas.moderar" />
  }

  const pendientes = (resenas.data?.data ?? []).filter((resena) => resena.estado === "pendiente").length

  return (
    <div className="promo-resenas">
      <FilterBar
        activeFilters={fuente ? [{ key: "fuente", label: `Fuente: ${RESENA_FUENTE_LABEL[fuente as ResenaFuente]}` }] : []}
        onClear={() => setFuente("")}
      >
        <SelectField
          label="Estado"
          options={[
            { value: "pendiente", label: "Pendientes" },
            { value: "publicada", label: "Publicadas" },
            { value: "rechazada", label: "Rechazadas" },
            { value: "todas", label: "Todas" },
          ]}
          value={estado}
          onChange={(event) => setEstado(event.target.value)}
        />
        <SelectField
          label="Fuente"
          options={Object.entries(RESENA_FUENTE_LABEL).map(([value, label]) => ({ value, label }))}
          placeholder="Todas"
          value={fuente}
          onChange={(event) => setFuente(event.target.value)}
        />
      </FilterBar>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Cola de moderación</div>
            <div className="panel__subtitle">
              {pendientes} pendiente(s). La decisión queda auditada con quién, cuándo y motivo.
            </div>
          </div>
        </div>

        {resenas.isError ? (
          <div className="state-block state-block--error">
            <strong>No pudimos cargar las reseñas</strong>
            <Button variant="secondary" onClick={() => void resenas.refetch()}>Reintentar</Button>
          </div>
        ) : resenas.isLoading ? (
          <div className="skeleton-rows">
            <div className="skeleton-rows__row"><span className="skeleton" style={{ width: "100%", height: 70 }} /></div>
            <div className="skeleton-rows__row"><span className="skeleton" style={{ width: "100%", height: 70 }} /></div>
          </div>
        ) : (resenas.data?.data ?? []).length === 0 ? (
          <div className="state-block">
            <strong>Sin reseñas en esta vista</strong>
            <p>Cuando llegue una reseña nueva aparecerá aquí para moderar (RF-R5-103).</p>
          </div>
        ) : (
          <div className="promo-resenas__lista">
            {(resenas.data?.data ?? []).map((resena) => (
              <article className="promo-resena" key={resena.id}>
                <div className="promo-resena__head">
                  <Puntaje valor={resena.puntaje} />
                  <StatusBadge tone={RESENA_ESTADO_TONE[resena.estado]}>{RESENA_ESTADO_LABEL[resena.estado]}</StatusBadge>
                  <StatusBadge tone="outline">{RESENA_FUENTE_LABEL[resena.fuente]}</StatusBadge>
                  <span className="order-type">
                    {maskName(resena.autor)} · {formatRelative(resena.creadaEn)}
                  </span>
                </div>
                <p className="promo-resena__comentario">{resena.comentario}</p>
                {resena.moderadaEn ? (
                  <p className="promo-resena__auditoria">
                    Moderada por {resena.moderadaPor} el {formatDateTime(resena.moderadaEn)}
                    {resena.motivoRechazo ? ` · Motivo: ${resena.motivoRechazo}` : ""}
                  </p>
                ) : null}
                <div className="promo-resena__acciones">
                  <Button
                    variant="secondary"
                    disabled={!puedeModerar || resena.estado === "publicada"}
                    title={puedeModerar ? undefined : "Requiere permiso de resenas.moderar"}
                    onClick={() => setObjetivo({ resena, decision: "publicar" })}
                  >
                    <Check size={14} /> Publicar
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!puedeModerar || resena.estado === "rechazada"}
                    title={puedeModerar ? undefined : "Requiere permiso de resenas.moderar"}
                    onClick={() => setObjetivo({ resena, decision: "rechazar" })}
                  >
                    <Ban size={14} /> Rechazar con motivo
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Encuestas</div>
            <div className="panel__subtitle">Agregado por tipo: pedido, reserva y visita.</div>
          </div>
        </div>
        <div className="promo-encuestas">
          {(encuestas.data?.data ?? []).map((encuesta) => (
            <div className="kpi-card" key={encuesta.tipo}>
              <span className="kpi-card__label">Encuesta de {encuesta.tipo}</span>
              <span className="kpi-card__value">{encuesta.promedio.toFixed(1)}/5</span>
              <span className="kpi-card__delta">
                <span>{encuesta.respuestas} respuestas</span> · NPS {encuesta.nps}
              </span>
            </div>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={objetivo !== null}
        title={objetivo?.decision === "publicar" ? "Publicar reseña" : "Rechazar reseña"}
        description={
          objetivo?.decision === "publicar"
            ? "La reseña se mostrará en la carta pública y el APK."
            : "La reseña no se publicará. El motivo es obligatorio y queda auditado (RN-R5-02)."
        }
        impacto={objetivo ? `«${objetivo.resena.comentario.slice(0, 90)}${objetivo.resena.comentario.length > 90 ? "…" : ""}»` : undefined}
        motivoLabel={objetivo?.decision === "publicar" ? "Nota (opcional)" : "Motivo del rechazo"}
        motivoObligatorio={objetivo?.decision === "rechazar"}
        confirmLabel={objetivo?.decision === "publicar" ? "Publicar" : "Rechazar"}
        onCancel={() => setObjetivo(null)}
        onConfirm={(motivo) => {
          if (!objetivo) return
          moderar.mutate(
            { id: objetivo.resena.id, decision: objetivo.decision, motivo },
            {
              onSuccess: () => {
                mostrar(
                  objetivo.decision === "publicar"
                    ? "Reseña publicada; decisión auditada."
                    : "Reseña rechazada; decisión y motivo auditados.",
                  "exito",
                )
                setObjetivo(null)
              },
              onError: (error) => mostrar(error instanceof Error ? error.message : "No se pudo moderar la reseña.", "error"),
            },
          )
        }}
      />
    </div>
  )
}
