import { X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { DIAS_SEMANA, FRANJAS, FRANJA_LABEL, type HorarioAtencion } from "@/modules/ajustes/types"

/** Clave `${diaSemana}-${franja}`; sin entrada = cerrado en esa franja. */
export type HorarioDraft = Record<string, { apertura: string; cierre: string }>

const clave = (dia: number, franja: string) => `${dia}-${franja}`

export function draftDesdeHorarios(horarios: HorarioAtencion[]): HorarioDraft {
  const draft: HorarioDraft = {}
  for (const horario of horarios) {
    draft[clave(horario.diaSemana, horario.franja)] = {
      apertura: horario.horaApertura,
      cierre: horario.horaCierre,
    }
  }
  return draft
}

export function horariosDesdeDraft(draft: HorarioDraft): HorarioAtencion[] {
  const horarios: HorarioAtencion[] = []
  for (const dia of DIAS_SEMANA) {
    for (const franja of FRANJAS) {
      const celda = draft[clave(dia.id, franja)]
      if (!celda?.apertura || !celda?.cierre) continue
      horarios.push({
        id: `h-${dia.id}-${franja}`,
        diaSemana: dia.id,
        franja,
        horaApertura: celda.apertura,
        horaCierre: celda.cierre,
      })
    }
  }
  return horarios
}

/** Rejilla semanal día × franja con apertura y cierre (plan 19 §3). */
export function WeeklyScheduleEditor({
  valor,
  onChange,
  puedeEditar,
}: {
  valor: HorarioDraft
  onChange: (valor: HorarioDraft) => void
  puedeEditar: boolean
}) {
  const cambiar = (dia: number, franja: string, campo: "apertura" | "cierre", nuevo: string) => {
    const actual = valor[clave(dia, franja)] ?? { apertura: "", cierre: "" }
    onChange({ ...valor, [clave(dia, franja)]: { ...actual, [campo]: nuevo } })
  }

  const limpiar = (dia: number, franja: string) => {
    const siguiente = { ...valor }
    delete siguiente[clave(dia, franja)]
    onChange(siguiente)
  }

  const copiarALunes = (diaOrigen: number) => {
    const siguiente = { ...valor }
    for (const franja of FRANJAS) {
      const origen = valor[clave(diaOrigen, franja)]
      if (origen) siguiente[clave(1, franja)] = { ...origen }
      else delete siguiente[clave(1, franja)]
    }
    onChange(siguiente)
  }

  const abrir = (dia: number, franja: string) => {
    onChange({ ...valor, [clave(dia, franja)]: { apertura: "13:00", cierre: "17:00" } })
  }

  return (
    <div className="horario-editor">
      <div className="horario-editor__head">
        <span className="horario-editor__col">Día</span>
        {FRANJAS.map((franja) => (
          <span className="horario-editor__col" key={franja}>
            {FRANJA_LABEL[franja]}
          </span>
        ))}
      </div>
      {DIAS_SEMANA.map((dia) => (
        <div className="horario-editor__fila" key={dia.id}>
          <span className="horario-editor__dia">
            {dia.nombre}
            {puedeEditar && dia.id !== 1 ? (
              <Button variant="ghost" className="text-action" onClick={() => copiarALunes(dia.id)}>
                Copiar a lunes
              </Button>
            ) : null}
          </span>
          {FRANJAS.map((franja) => {
            const celda = valor[clave(dia.id, franja)]
            return (
              <span className={`horario-editor__celda ${celda ? "" : "horario-editor__celda--cerrado"}`} key={franja}>
                {celda ? (
                  <>
                    <input
                      type="time"
                      className="input horario-editor__hora"
                      aria-label={`${dia.nombre} ${FRANJA_LABEL[franja]} apertura`}
                      value={celda.apertura}
                      disabled={!puedeEditar}
                      onChange={(event) => cambiar(dia.id, franja, "apertura", event.target.value)}
                    />
                    <span aria-hidden="true">–</span>
                    <input
                      type="time"
                      className="input horario-editor__hora"
                      aria-label={`${dia.nombre} ${FRANJA_LABEL[franja]} cierre`}
                      value={celda.cierre}
                      disabled={!puedeEditar}
                      onChange={(event) => cambiar(dia.id, franja, "cierre", event.target.value)}
                    />
                    {puedeEditar ? (
                      <button
                        type="button"
                        className="horario-editor__quitar"
                        aria-label={`Cerrar ${dia.nombre} en ${FRANJA_LABEL[franja]}`}
                        title="Marcar como cerrado"
                        onClick={() => limpiar(dia.id, franja)}
                      >
                        <X size={12} />
                      </button>
                    ) : null}
                  </>
                ) : (
                  <button
                    type="button"
                    className="horario-editor__abrir"
                    disabled={!puedeEditar}
                    onClick={() => abrir(dia.id, franja)}
                  >
                    Cerrado · abrir
                  </button>
                )}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}
