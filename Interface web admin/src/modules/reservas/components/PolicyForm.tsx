import { useEffect, useState } from "react"
import { Save } from "lucide-react"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Drawer } from "@/components/ui/Drawer"
import { SelectField, TextareaField, TextField, type SelectOption } from "@/components/ui/fields"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { ErrorState, NoPermissionState } from "@/components/ui/states"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { useGuardarPolitica, usePoliticas } from "@/modules/reservas/api"
import { DEPOSITO_REGLA_LABEL, type DepositoRegla, type PoliticaReserva } from "@/modules/reservas/types"

const REGLAS_DEPOSITO: SelectOption[] = Object.entries(DEPOSITO_REGLA_LABEL).map(([value, label]) => ({ value, label }))

/** Políticas por sucursal (RF-R5-43): rigen la web y el panel; se guardan con motivo. */
export function PolicyForm({
  open,
  sedeId,
  onClose,
}: {
  open: boolean
  sedeId: string
  onClose: () => void
}) {
  const { sedes, esGlobal } = useSede()
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const [sedeForm, setSedeForm] = useState(sedeId)
  const { data, isLoading, isError, refetch } = usePoliticas(open ? sedeForm : "")
  const guardar = useGuardarPolitica()
  const puedeEditar = tienePermiso("reservas.politicas")

  const [form, setForm] = useState<PoliticaReserva | null>(null)
  const [montoPesos, setMontoPesos] = useState("0.00")
  const [confirmar, setConfirmar] = useState(false)

  useEffect(() => {
    setSedeForm(sedeId)
  }, [sedeId])

  useEffect(() => {
    if (data) {
      setForm(data)
      setMontoPesos((data.depositoMontoCentavos / 100).toFixed(2))
    }
  }, [data])

  const actualizar = <K extends keyof PoliticaReserva>(campo: K, valor: PoliticaReserva[K]) => {
    setForm((actual) => (actual ? { ...actual, [campo]: valor } : actual))
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        width={600}
        title="Políticas de reserva"
        subtitle="Antelación, duración, tolerancia, máximo, depósito y no-show por sucursal"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              variant="primary"
              disabled={!form || !puedeEditar || guardar.isPending}
              title={!puedeEditar ? "Requiere permiso de reservas.politicas" : undefined}
              onClick={() => setConfirmar(true)}
            >
              <Save size={15} /> {guardar.isPending ? "Guardando…" : "Guardar política"}
            </Button>
          </>
        }
      >
        {!puedeEditar ? <NoPermissionState permiso="reservas.politicas" /> : null}

        {esGlobal ? (
          <SelectField
            label="Sucursal"
            options={sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))}
            value={sedeForm}
            onChange={(event) => setSedeForm(event.target.value)}
          />
        ) : null}

        {isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : isLoading || !form ? (
          <SkeletonRows rows={7} columns={2} />
        ) : (
          <div className="reserva-politica">
            <div className="reserva-campos-2">
              <TextField
                label="Antelación mínima (horas)"
                type="number"
                min={0}
                value={form.antelacionMinHoras}
                onChange={(event) => actualizar("antelacionMinHoras", Number(event.target.value))}
              />
              <TextField
                label="Antelación máxima (días)"
                type="number"
                min={1}
                value={form.antelacionMaxDias}
                onChange={(event) => actualizar("antelacionMaxDias", Number(event.target.value))}
              />
              <TextField
                label="Duración base (min)"
                type="number"
                min={30}
                step={15}
                value={form.duracionMin}
                onChange={(event) => actualizar("duracionMin", Number(event.target.value))}
              />
              <TextField
                label="Tolerancia (min)"
                type="number"
                min={0}
                step={5}
                value={form.toleranciaMin}
                onChange={(event) => actualizar("toleranciaMin", Number(event.target.value))}
              />
              <TextField
                label="Cancelación sin costo (h antes)"
                type="number"
                min={0}
                value={form.cancelacionHoras}
                onChange={(event) => actualizar("cancelacionHoras", Number(event.target.value))}
              />
              <TextField
                label="Máximo por reserva (personas)"
                type="number"
                min={1}
                value={form.maximoPersonas}
                onChange={(event) => actualizar("maximoPersonas", Number(event.target.value))}
              />
              <SelectField
                label="Regla de depósito"
                options={REGLAS_DEPOSITO}
                value={form.depositoRegla}
                onChange={(event) => actualizar("depositoRegla", event.target.value as DepositoRegla)}
              />
              <TextField
                label="Monto del depósito (MXN)"
                type="number"
                min={0}
                step="0.01"
                value={montoPesos}
                onChange={(event) => {
                  setMontoPesos(event.target.value)
                  actualizar("depositoMontoCentavos", Math.round((Number(event.target.value) || 0) * 100))
                }}
              />
              <TextField
                label="Depósito desde (personas)"
                type="number"
                min={1}
                value={form.depositoPersonasMin}
                onChange={(event) => actualizar("depositoPersonasMin", Number(event.target.value))}
              />
              <SelectField
                label="Confirmación"
                options={[
                  { value: "si", label: "Automática al crear" },
                  { value: "no", label: "Manual desde el panel" },
                ]}
                value={form.confirmacionAutomatica ? "si" : "no"}
                onChange={(event) => actualizar("confirmacionAutomatica", event.target.value === "si")}
              />
            </div>
            <TextareaField
              label="Regla de no-show"
              rows={3}
              value={form.noShowRegla}
              onChange={(event) => actualizar("noShowRegla", event.target.value)}
            />
            <p className="reserva-nota">
              Última edición: {formatDateTime(form.actualizadoEn)} por {form.actualizadoPor}. Los cambios rigen la web y el
              panel para reservas nuevas; las creadas conservan su snapshot (RN-R5-04).
            </p>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmar}
        title="Guardar política de reserva"
        description="El cambio rige la disponibilidad de la web y del panel para reservas nuevas."
        impacto="Queda registrado en auditoría con actor, motivo y antes/después."
        confirmLabel="Guardar política"
        onCancel={() => setConfirmar(false)}
        onConfirm={(motivo) => {
          if (!form) return
          guardar.mutate(
            { ...form, motivo },
            {
              onSuccess: () => mostrar("Política guardada y auditada.", "exito"),
              onError: (error) =>
                mostrar(error instanceof ApiError ? error.message : "No se pudo guardar la política.", "error"),
              onSettled: () => setConfirmar(false),
            },
          )
        }}
      />
    </>
  )
}
