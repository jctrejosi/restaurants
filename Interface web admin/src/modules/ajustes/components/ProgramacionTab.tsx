import { useEffect, useMemo, useState } from "react"
import { CalendarClock, Plus, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { SelectField, TextField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { useGuardarVentanas, useVentanas } from "@/modules/ajustes/api"
import {
  DIAS_SEMANA,
  resumenDias,
  type VentanaProgramacion,
} from "@/modules/ajustes/types"

function mensajeError(error: unknown): string {
  return error instanceof ApiError ? error.message : "Ocurrió un error inesperado"
}

function ventanaInvalida(ventana: VentanaProgramacion): boolean {
  return ventana.dias.length === 0 || ventana.hasta <= ventana.desde
}

/** Pestaña «Programación» (V1): ventanas de pedidos y recogida. */
export function ProgramacionTab({ puedeEditar }: { puedeEditar: boolean }) {
  const { mostrar } = useToast()
  const ventanasQuery = useVentanas(true)
  const guardar = useGuardarVentanas()
  const [draft, setDraft] = useState<VentanaProgramacion[] | null>(null)
  const [confirmar, setConfirmar] = useState(false)

  useEffect(() => {
    if (ventanasQuery.data) setDraft(ventanasQuery.data.map((item) => ({ ...item })))
  }, [ventanasQuery.data])

  const invalidas = useMemo(() => (draft ?? []).filter(ventanaInvalida).length, [draft])
  const sinCambios = useMemo(() => {
    if (!draft || !ventanasQuery.data) return true
    return JSON.stringify(draft) === JSON.stringify(ventanasQuery.data)
  }, [draft, ventanasQuery.data])

  if (ventanasQuery.isError) {
    return <ErrorState description="No pudimos cargar las ventanas de programación." onRetry={() => void ventanasQuery.refetch()} />
  }
  if (ventanasQuery.isLoading || !draft) return <SkeletonRows rows={5} columns={4} />

  const actualizar = (indice: number, cambios: Partial<VentanaProgramacion>) => {
    setDraft((actual) =>
      actual ? actual.map((item, pos) => (pos === indice ? { ...item, ...cambios } : item)) : actual,
    )
  }

  const alternarDia = (indice: number, dia: number) => {
    const ventana = draft[indice]
    const dias = ventana.dias.includes(dia)
      ? ventana.dias.filter((item) => item !== dia)
      : [...ventana.dias, dia]
    actualizar(indice, { dias })
  }

  return (
    <div className="ajustes-tab">
      <section className="panel ajustes-seccion">
        <div className="panel__header">
          <div>
            <div className="panel__title">
              <CalendarClock size={14} /> Ventanas de programación
            </div>
            <div className="panel__subtitle">
              La web solo acepta pedidos programados o para recoger dentro de una ventana activa.
            </div>
          </div>
          <div className="ajustes-botones">
            <Button
              variant="ghost"
              className="text-action"
              disabled={!puedeEditar}
              onClick={() =>
                setDraft((actual) => [
                  ...(actual ?? []),
                  {
                    id: `ven-nueva-${Date.now()}`,
                    tipo: "pedido",
                    dias: [1, 2, 3, 4, 5],
                    desde: "12:00",
                    hasta: "21:00",
                    maxPedidos: null,
                    activa: true,
                  },
                ])
              }
            >
              <Plus size={13} /> Agregar ventana
            </Button>
            <Button
              variant="primary"
              disabled={!puedeEditar || invalidas > 0 || sinCambios}
              title={
                invalidas > 0
                  ? "Corrige las ventanas sin días o con rango inválido"
                  : undefined
              }
              onClick={() => setConfirmar(true)}
            >
              <Save size={14} /> Guardar ventanas
            </Button>
          </div>
        </div>

        {draft.length === 0 ? (
          <EmptyState
            title="Sin ventanas configuradas"
            description="Sin ventanas, la web no ofrece programar pedidos ni recogidas."
            action={puedeEditar ? { label: "Agregar ventana", onClick: () => setDraft((actual) => [...(actual ?? []), { id: `ven-nueva-${Date.now()}`, tipo: "pedido", dias: [1, 2, 3, 4, 5], desde: "12:00", hasta: "21:00", maxPedidos: null, activa: true }]) } : undefined}
          />
        ) : (
          <div className="ventanas">
            {draft.map((ventana, indice) => (
              <article className={`ventana ${ventanaInvalida(ventana) ? "ventana--invalida" : ""}`} key={ventana.id}>
                <header className="ventana__head">
                  <SelectField
                    label="Tipo"
                    options={[
                      { value: "pedido", label: "Pedidos programados" },
                      { value: "recogida", label: "Recogida" },
                    ]}
                    value={ventana.tipo}
                    disabled={!puedeEditar}
                    onChange={(event) => actualizar(indice, { tipo: event.target.value as VentanaProgramacion["tipo"] })}
                  />
                  <label className="ajustes-check">
                    <input
                      type="checkbox"
                      checked={ventana.activa}
                      disabled={!puedeEditar}
                      onChange={(event) => actualizar(indice, { activa: event.target.checked })}
                    />
                    Activa
                  </label>
                  <Button
                    variant="ghost"
                    className="text-action"
                    disabled={!puedeEditar}
                    onClick={() => setDraft((actual) => (actual ? actual.filter((_, pos) => pos !== indice) : actual))}
                  >
                    <Trash2 size={13} /> Quitar
                  </Button>
                </header>
                <div className="ventana__dias" role="group" aria-label="Días de la ventana">
                  {DIAS_SEMANA.map((dia) => (
                    <button
                      type="button"
                      key={dia.id}
                      className={`chip chip--dia ${ventana.dias.includes(dia.id) ? "chip--activo" : ""}`}
                      disabled={!puedeEditar}
                      aria-pressed={ventana.dias.includes(dia.id)}
                      onClick={() => alternarDia(indice, dia.id)}
                    >
                      {dia.nombre.slice(0, 3)}
                    </button>
                  ))}
                  <span className="ventana__resumen">{resumenDias(ventana.dias)}</span>
                </div>
                <div className="ventana__horas">
                  <TextField
                    label="Desde"
                    type="time"
                    value={ventana.desde}
                    disabled={!puedeEditar}
                    onChange={(event) => actualizar(indice, { desde: event.target.value })}
                  />
                  <TextField
                    label="Hasta"
                    type="time"
                    value={ventana.hasta}
                    disabled={!puedeEditar}
                    onChange={(event) => actualizar(indice, { hasta: event.target.value })}
                  />
                  <TextField
                    label="Máximo de pedidos"
                    type="number"
                    min={1}
                    placeholder="Sin tope"
                    value={ventana.maxPedidos ?? ""}
                    disabled={!puedeEditar}
                    hint="Vacío = sin tope en la ventana"
                    onChange={(event) =>
                      actualizar(indice, {
                        maxPedidos: event.target.value === "" ? null : Number(event.target.value) || 1,
                      })
                    }
                  />
                </div>
                {ventanaInvalida(ventana) ? (
                  <p className="ventana__error">Revisa el rango y selecciona al menos un día.</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmar}
        title="Guardar ventanas de programación"
        description="La web respeta las ventanas vigentes al aceptar pedidos."
        impacto={`${draft.filter((item) => item.activa).length} ventanas activas de ${draft.length}.`}
        confirmLabel="Guardar ventanas"
        onCancel={() => setConfirmar(false)}
        onConfirm={(motivo) => {
          setConfirmar(false)
          guardar.mutate(
            { ventanas: draft, motivo },
            {
              onSuccess: () => mostrar("Ventanas actualizadas y auditadas", "exito"),
              onError: (error) => mostrar(mensajeError(error), "error"),
            },
          )
        }}
      />
    </div>
  )
}
