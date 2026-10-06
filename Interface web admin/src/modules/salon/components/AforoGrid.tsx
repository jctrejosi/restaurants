import { useEffect, useState } from "react"
import { Save } from "lucide-react"
import { useAuth } from "@/app/auth"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { useGuardarAforoZona } from "@/modules/salon/api"
import type { SalonMapa, Zona } from "@/modules/salon/types"

/**
 * Franjas y aforo por zona (V1, RF-R5-23). Supuesto del plan: la relación
 * franja↔zona requiere migración nueva; aquí se simula con filas de aforo.
 */
export function AforoGrid({ mapa }: { mapa: SalonMapa }) {
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const guardar = useGuardarAforoZona()
  const puedeAforo = tienePermiso("salon.aforo")

  const [valores, setValores] = useState<Record<string, string>>({})
  const [confirmar, setConfirmar] = useState<Zona | null>(null)

  useEffect(() => {
    const siguiente: Record<string, string> = {}
    for (const fila of mapa.aforos) siguiente[`${fila.zonaId}:${fila.franjaId}`] = String(fila.aforo)
    setValores(siguiente)
  }, [mapa])

  const filaDe = (zonaId: string, franjaId: string) =>
    mapa.aforos.find((fila) => fila.zonaId === zonaId && fila.franjaId === franjaId)

  return (
    <div className="salon-aforo">
      <p className="salon-nota">
        V1 · El aforo por zona y franja limita la disponibilidad de la web (RF-R5-23) y nunca puede quedar por debajo de
        las reservas ya comprometidas. Los cambios no alteran reservas creadas (RN-R5-04).
      </p>

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Zona</th>
                {mapa.franjas.map((franja) => (
                  <th key={franja.id}>
                    {franja.nombre}
                    <small className="salon-aforo__horario">
                      {franja.desdeHora}–{franja.hastaHora}
                    </small>
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {mapa.zonas.map((zona) => (
                <tr key={zona.id}>
                  <td>
                    <strong className="salon-aforo__zona">{zona.nombre}</strong>
                    <small className="salon-aforo__sub">Aforo base {zona.aforo}</small>
                  </td>
                  {mapa.franjas.map((franja) => {
                    const fila = filaDe(zona.id, franja.id)
                    const clave = `${zona.id}:${franja.id}`
                    const valor = Number(valores[clave] ?? 0)
                    const libres = Math.max(0, valor - (fila?.reservas ?? 0))
                    const ocupacion = valor > 0 ? Math.round(((fila?.reservas ?? 0) / valor) * 100) : 100
                    return (
                      <td key={franja.id}>
                        <input
                          className="input salon-aforo__input"
                          type="number"
                          min={fila?.reservas ?? 0}
                          value={valores[clave] ?? ""}
                          disabled={!puedeAforo}
                          onChange={(event) => setValores((actual) => ({ ...actual, [clave]: event.target.value }))}
                          aria-label={`Aforo de ${zona.nombre} en ${franja.nombre}`}
                        />
                        <small className="salon-aforo__sub">
                          {fila?.reservas ?? 0} reservas · {libres} libres · {ocupacion}% ocupado
                        </small>
                      </td>
                    )
                  })}
                  <td className="cell-right">
                    <Button variant="ghost" className="text-action" disabled={!puedeAforo} onClick={() => setConfirmar(zona)}>
                      <Save size={13} /> Guardar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(confirmar)}
        title={confirmar ? `Guardar aforo de «${confirmar.nombre}»` : "Guardar aforo"}
        description="El aforo rige la disponibilidad de la web para reservas nuevas en esa zona y franja."
        impacto="Se valida que ninguna franja quede por debajo de las reservas ya comprometidas."
        confirmLabel="Guardar aforo"
        onCancel={() => setConfirmar(null)}
        onConfirm={(motivo) => {
          if (!confirmar) return
          const franjas = mapa.franjas.map((franja) => ({
            franjaId: franja.id,
            aforo: Number(valores[`${confirmar.id}:${franja.id}`] ?? 0),
          }))
          guardar.mutate(
            { zonaId: confirmar.id, franjas, motivo },
            {
              onSuccess: () => mostrar("Aforo guardado y auditado.", "exito"),
              onError: (error) => mostrar(error instanceof ApiError ? error.message : "No se pudo guardar el aforo.", "error"),
              onSettled: () => setConfirmar(null),
            },
          )
        }}
      />
    </div>
  )
}
