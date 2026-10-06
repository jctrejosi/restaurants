import { useState } from "react"
import { CalendarX2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { EmptyState } from "@/components/ui/states"
import { TextField, TextareaField } from "@/components/ui/fields"
import { formatDateTime } from "@/lib/format"
import type { CierreTemporal } from "@/modules/ajustes/types"

/** Cierres temporales con motivo y aviso del impacto en reservas (RN-R5-11). */
export function ClosureList({
  cierres,
  puedeEditar,
  creando,
  onCrear,
  onEliminar,
}: {
  cierres: CierreTemporal[]
  puedeEditar: boolean
  creando: boolean
  onCrear: (payload: { desde: string; hasta: string; motivo: string }) => void
  onEliminar: (id: string, motivo: string) => void
}) {
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [motivo, setMotivo] = useState("")
  const [porEliminar, setPorEliminar] = useState<CierreTemporal | null>(null)

  const rangoInvalido = desde !== "" && hasta !== "" && new Date(hasta) <= new Date(desde)
  const bloqueado = !puedeEditar || !desde || !hasta || motivo.trim().length < 3 || rangoInvalido

  return (
    <section className="cierres">
      <header className="cierres__head">
        <div>
          <strong>Cierres temporales</strong>
          <small>Rango y motivo; las reservas futuras dentro del rango se señalan.</small>
        </div>
      </header>

      {cierres.length === 0 ? (
        <EmptyState
          title="No hay cierres programados"
          description="Programa un cierre si habrá mantenimiento o un evento privado."
          icon={<CalendarX2 size={20} />}
        />
      ) : (
        <ul className="cierres__lista">
          {cierres.map((cierre) => (
            <li key={cierre.id}>
              <div>
                <strong>
                  {formatDateTime(cierre.desde)} → {formatDateTime(cierre.hasta)}
                </strong>
                <small>{cierre.motivo}</small>
              </div>
              {cierre.reservasAfectadas > 0 ? (
                <StatusBadge tone="amber">
                  {cierre.reservasAfectadas} reservas afectadas
                </StatusBadge>
              ) : (
                <StatusBadge tone="green">Sin reservas afectadas</StatusBadge>
              )}
              <Button
                variant="ghost"
                className="text-action"
                disabled={!puedeEditar}
                onClick={() => setPorEliminar(cierre)}
              >
                <Trash2 size={13} /> Eliminar
              </Button>
            </li>
          ))}
        </ul>
      )}

      {puedeEditar ? (
        <div className="cierres__form">
          <TextField
            label="Desde"
            type="datetime-local"
            value={desde}
            onChange={(event) => setDesde(event.target.value)}
          />
          <TextField
            label="Hasta"
            type="datetime-local"
            value={hasta}
            onChange={(event) => setHasta(event.target.value)}
          />
          <TextareaField
            label="Motivo (obligatorio)"
            rows={2}
            placeholder="p. ej. mantenimiento de cocina"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
          />
          <Button
            variant="secondary"
            disabled={bloqueado || creando}
            title={
              rangoInvalido
                ? "El fin debe ser posterior al inicio"
                : motivo.trim().length < 3
                  ? "Escribe un motivo de al menos 3 caracteres"
                  : undefined
            }
            onClick={() => {
              onCrear({ desde, hasta, motivo: motivo.trim() })
              setDesde("")
              setHasta("")
              setMotivo("")
            }}
          >
            {creando ? "Programando…" : "Programar cierre"}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={porEliminar !== null}
        title="Eliminar cierre temporal"
        description="La sede volverá a su horario habitual en ese rango."
        impacto={porEliminar ? `${formatDateTime(porEliminar.desde)} → ${formatDateTime(porEliminar.hasta)}` : undefined}
        confirmLabel="Eliminar cierre"
        onCancel={() => setPorEliminar(null)}
        onConfirm={(razon) => {
          const cierre = porEliminar
          setPorEliminar(null)
          if (cierre) onEliminar(cierre.id, razon)
        }}
      />
    </section>
  )
}
