import { useMemo, useState } from "react"
import { CalendarHeart, Pencil, Plus, RefreshCcw, UserRoundX, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Drawer } from "@/components/ui/Drawer"
import { SelectField, TextField, type SelectOption } from "@/components/ui/fields"
import { SkeletonCards } from "@/components/ui/Skeleton"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/app/auth"
import { ApiError } from "@/lib/api"
import { formatDateTime, formatNumber } from "@/lib/format"
import { useGuardarSegmento, useSegmentos, vistaPreviaSegmento } from "@/modules/clientes/api"
import {
  SEGMENTO_TIPO_LABEL,
  resumenCriterio,
  type CriterioSegmento,
  type Segmento,
  type SegmentoTipo,
} from "@/modules/clientes/types"

const ICONO: Record<SegmentoTipo, typeof UsersRound> = {
  recurrentes: RefreshCcw,
  inactivos: UserRoundX,
  cumpleanos: CalendarHeart,
}

function criterioConParametro(tipo: SegmentoTipo, valor: number): CriterioSegmento {
  if (tipo === "recurrentes") return { tipo, minimoPedidos: valor }
  if (tipo === "inactivos") return { tipo, diasInactividad: valor }
  return { tipo, diasAntesCumpleanos: valor }
}

const ETIQUETA_PARAMETRO: Record<SegmentoTipo, string> = {
  recurrentes: "Mínimo de pedidos",
  inactivos: "Días sin visitar",
  cumpleanos: "Días de anticipación",
}

const VALOR_INICIAL: Record<SegmentoTipo, number> = {
  recurrentes: 6,
  inactivos: 60,
  cumpleanos: 14,
}

/** (V2) Segmentos: galería, edición del criterio y vista previa del conteo. */
export function SegmentBuilder() {
  const { mostrar } = useToast()
  const { tienePermiso } = useAuth()
  const puedeGestionar = tienePermiso("clientes.segmentos")

  const { data, isLoading, isError, refetch } = useSegmentos()
  const guardar = useGuardarSegmento()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [segmento, setSegmento] = useState<Segmento | null>(null)
  const [nombre, setNombre] = useState("")
  const [tipo, setTipo] = useState<SegmentoTipo>("recurrentes")
  const [parametro, setParametro] = useState(String(VALOR_INICIAL.recurrentes))
  const [error, setError] = useState<string | null>(null)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)

  const segmentos = data?.data ?? []

  const abrirNuevo = () => {
    setSegmento(null)
    setNombre("")
    setTipo("recurrentes")
    setParametro(String(VALOR_INICIAL.recurrentes))
    setError(null)
    setErrorServidor(null)
    setDrawerOpen(true)
  }

  const abrirEdicion = (item: Segmento) => {
    setSegmento(item)
    setNombre(item.nombre)
    setTipo(item.criterio.tipo)
    setParametro(
      String(
        item.criterio.tipo === "recurrentes"
          ? item.criterio.minimoPedidos ?? VALOR_INICIAL.recurrentes
          : item.criterio.tipo === "inactivos"
            ? item.criterio.diasInactividad ?? VALOR_INICIAL.inactivos
            : item.criterio.diasAntesCumpleanos ?? VALOR_INICIAL.cumpleanos,
      ),
    )
    setError(null)
    setErrorServidor(null)
    setDrawerOpen(true)
  }

  const criterio = useMemo(() => criterioConParametro(tipo, Number(parametro) || 0), [tipo, parametro])
  const vistaPrevia = useMemo(() => vistaPreviaSegmento(criterio), [criterio])

  const guardarSegmento = () => {
    if (!nombre.trim()) {
      setError("El nombre del segmento es obligatorio.")
      return
    }
    if (!Number.isFinite(Number(parametro)) || Number(parametro) <= 0) {
      setError("El parámetro del criterio debe ser mayor a cero.")
      return
    }
    setError(null)
    guardar.mutate(
      { id: segmento?.id, nombre: nombre.trim(), criterio },
      {
        onSuccess: () => {
          mostrar(segmento ? "Segmento actualizado." : "Segmento creado.", "exito")
          setDrawerOpen(false)
        },
        onError: (fallo) =>
          setErrorServidor(fallo instanceof ApiError ? fallo.message : "No se pudo guardar el segmento."),
      },
    )
  }

  if (isError) {
    return (
      <ErrorState
        title="No se pudieron cargar los segmentos"
        description="Revisa tu conexión e inténtalo de nuevo."
        onRetry={() => void refetch()}
      />
    )
  }

  return (
    <div className="cliente-tab">
      <div className="module-toolbar">
        <p className="clientes-notice">
          Los segmentos (V2) se calculan al vuelo: recurrentes, inactivos y cumpleaños. La vista previa se pide antes de
          usarlos en campañas.
        </p>
        <span className="module-toolbar__spacer" />
        <Button
          variant="primary"
          disabled={!puedeGestionar}
          title={puedeGestionar ? undefined : "Requiere permiso de clientes.segmentos"}
          onClick={abrirNuevo}
        >
          <Plus size={16} /> Nuevo segmento
        </Button>
      </div>

      {isLoading ? (
        <SkeletonCards count={3} />
      ) : segmentos.length === 0 ? (
        <EmptyState
          title="Sin segmentos definidos"
          description="Crea un segmento por recurrencia, inactividad o cumpleaños para tus campañas."
          icon={<UsersRound size={22} />}
          action={puedeGestionar ? { label: "Nuevo segmento", onClick: abrirNuevo } : undefined}
        />
      ) : (
        <div className="segmento-grid">
          {segmentos.map((item) => {
            const Icono = ICONO[item.criterio.tipo]
            return (
              <article className="segmento-card" key={item.id}>
                <div className="segmento-card__head">
                  <span className="segmento-card__icon">
                    <Icono size={16} />
                  </span>
                  <div>
                    <strong>{item.nombre}</strong>
                    <small>{SEGMENTO_TIPO_LABEL[item.criterio.tipo]}</small>
                  </div>
                </div>
                <p className="segmento-card__criterio">{resumenCriterio(item.criterio)}</p>
                <div className="segmento-card__conteo">
                  <span>{formatNumber(item.conteo)}</span>
                  <small>clientes (vista previa al usarse)</small>
                </div>
                <div className="segmento-card__foot">
                  <small>Actualizado {formatDateTime(item.actualizadoEn)}</small>
                  <Button
                    variant="ghost"
                    className="text-action"
                    disabled={!puedeGestionar}
                    title={puedeGestionar ? undefined : "Requiere permiso de clientes.segmentos"}
                    onClick={() => abrirEdicion(item)}
                  >
                    <Pencil size={13} /> Editar criterio
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
        title={segmento ? `Editar «${segmento.nombre}»` : "Nuevo segmento"}
        subtitle="El conteo se calcula al vuelo; revisa la vista previa antes de guardar."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)} disabled={guardar.isPending}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={guardarSegmento} disabled={guardar.isPending}>
              {guardar.isPending ? "Guardando…" : "Guardar segmento"}
            </Button>
          </>
        }
      >
        <div className="cliente-form">
          <TextField label="Nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} />
          <SelectField
            label="Tipo de criterio"
            options={Object.entries(SEGMENTO_TIPO_LABEL).map(([value, label]) => ({ value, label })) as SelectOption[]}
            value={tipo}
            onChange={(event) => {
              const nuevo = event.target.value as SegmentoTipo
              setTipo(nuevo)
              setParametro(String(VALOR_INICIAL[nuevo]))
            }}
          />
          <TextField
            label={ETIQUETA_PARAMETRO[tipo]}
            type="number"
            min="1"
            value={parametro}
            onChange={(event) => setParametro(event.target.value)}
          />

          <div className="segmento-preview">
            <strong>Vista previa</strong>
            <p>
              {formatNumber(vistaPrevia.conteo)} clientes coinciden con «{resumenCriterio(criterio)}» (se excluyen los
              anonimizados).
            </p>
            {vistaPrevia.muestra.length > 0 ? (
              <div className="cliente-tags">
                {vistaPrevia.muestra.map((nombreMuestra) => (
                  <span className="cliente-tag" key={nombreMuestra}>
                    {nombreMuestra}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {error || errorServidor ? <p className="clientes-error">{error ?? errorServidor}</p> : null}
        </div>
      </Drawer>
    </div>
  )
}
