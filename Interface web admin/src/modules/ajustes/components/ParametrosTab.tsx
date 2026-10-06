import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Save } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { ErrorState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { SelectField, TextField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { useGuardarParametros, useParametros } from "@/modules/ajustes/api"
import { EffectPreviewPanel } from "@/modules/ajustes/components/EffectPreviewPanel"
import {
  FRANJAS,
  FRANJA_LABEL,
  OFFLINE_LABEL,
  type ConfiguracionSucursal,
  type PreviewCambio,
} from "@/modules/ajustes/types"

function mensajeError(error: unknown): string {
  return error instanceof ApiError ? error.message : "Ocurrió un error inesperado"
}

function cambiosParametros(original: ConfiguracionSucursal, draft: ConfiguracionSucursal): PreviewCambio[] {
  const cambios: PreviewCambio[] = []
  const agregar = (area: string, antes: string, despues: string, efecto: string) => {
    if (antes !== despues) cambios.push({ area, antes, despues, efecto })
  }
  agregar(
    "Propina sugerida",
    `${original.propinaSugeridaPct} %`,
    `${draft.propinaSugeridaPct} %`,
    "Aparece en el cobro de caja y en el APK del mesero.",
  )
  agregar(
    "Copias de comanda",
    String(original.copiasComanda),
    String(draft.copiasComanda),
    "Afecta comandas nuevas; las ya impresas no se reimprimen solas.",
  )
  agregar(
    "Copias de factura",
    String(original.copiasFactura),
    String(draft.copiasFactura),
    "Afecta facturas emitidas después del cambio.",
  )
  agregar(
    "Borrado de comanda impresa",
    original.borradoComandaImpresa ? "Permitido" : "Bloqueado",
    draft.borradoComandaImpresa ? "Permitido" : "Bloqueado",
    "Controla el borrado de comandas ya impresas en el KDS.",
  )
  agregar(
    "Comportamiento offline",
    OFFLINE_LABEL[original.comportamientoOffline],
    OFFLINE_LABEL[draft.comportamientoOffline],
    "El APK y el KDS cambian de modo al reconectar (módulo 18).",
  )
  agregar(
    "Ventana de programación",
    `${original.ventanaProgramacionMin} min`,
    `${draft.ventanaProgramacionMin} min`,
    "La web solo acepta pedidos programados dentro de la ventana (RF-R5-163).",
  )
  for (const franja of FRANJAS) {
    const antes = original.limitesFranja.find((item) => item.franja === franja)?.maximoPedidos
    const despues = draft.limitesFranja.find((item) => item.franja === franja)?.maximoPedidos
    agregar(
      `Límite ${FRANJA_LABEL[franja].toLowerCase()}`,
      antes === undefined ? "Sin límite" : `${antes} pedidos`,
      despues === undefined ? "Sin límite" : `${despues} pedidos`,
      "La web y el APK respetan el tope por franja al aceptar pedidos.",
    )
  }
  return cambios
}

/** Pestaña «Parámetros»: operación con vista previa del efecto (RF-R5-161). */
export function ParametrosTab({ puedeEditar }: { puedeEditar: boolean }) {
  const { mostrar } = useToast()
  const parametros = useParametros(true)
  const guardar = useGuardarParametros()
  const [draft, setDraft] = useState<ConfiguracionSucursal | null>(null)
  const [confirmar, setConfirmar] = useState(false)

  useEffect(() => {
    if (parametros.data) setDraft(parametros.data.configuracion)
  }, [parametros.data])

  const cambios = useMemo(
    () => (draft && parametros.data ? cambiosParametros(parametros.data.configuracion, draft) : []),
    [draft, parametros.data],
  )

  if (parametros.isError) {
    return <ErrorState description="No pudimos cargar los parámetros de operación." onRetry={() => void parametros.refetch()} />
  }
  if (parametros.isLoading || !draft) return <SkeletonRows rows={7} columns={3} />

  const limite = (franja: (typeof FRANJAS)[number]) =>
    draft.limitesFranja.find((item) => item.franja === franja)?.maximoPedidos ?? 0

  const setLimite = (franja: (typeof FRANJAS)[number], valor: number) => {
    setDraft((actual) => {
      if (!actual) return actual
      const existe = actual.limitesFranja.some((item) => item.franja === franja)
      return {
        ...actual,
        limitesFranja: existe
          ? actual.limitesFranja.map((item) => (item.franja === franja ? { ...item, maximoPedidos: valor } : item))
          : [...actual.limitesFranja, { franja, maximoPedidos: valor }],
      }
    })
  }

  return (
    <div className="ajustes-tab">
      <section className="panel ajustes-seccion">
        <div className="panel__header">
          <div>
            <div className="panel__title">Parámetros de operación</div>
            <div className="panel__subtitle">
              Propina, copias, offline y límites por franja; se reflejan en web, APK y KDS.
            </div>
          </div>
          <Button
            variant="primary"
            disabled={!puedeEditar || cambios.length === 0}
            title={puedeEditar ? undefined : "Requiere permiso de ajustes.editar"}
            onClick={() => setConfirmar(true)}
          >
            <Save size={14} /> Guardar parámetros
          </Button>
        </div>

        <div className="ajustes-form">
          <TextField
            label="Propina sugerida (%)"
            type="number"
            min={0}
            max={30}
            step="0.5"
            value={draft.propinaSugeridaPct}
            disabled={!puedeEditar}
            onChange={(event) =>
              setDraft({ ...draft, propinaSugeridaPct: Number(event.target.value) || 0 })
            }
          />
          <TextField
            label="Copias de comanda"
            type="number"
            min={1}
            max={5}
            value={draft.copiasComanda}
            disabled={!puedeEditar}
            onChange={(event) => setDraft({ ...draft, copiasComanda: Number(event.target.value) || 1 })}
          />
          <TextField
            label="Copias de factura"
            type="number"
            min={1}
            max={5}
            value={draft.copiasFactura}
            disabled={!puedeEditar}
            onChange={(event) => setDraft({ ...draft, copiasFactura: Number(event.target.value) || 1 })}
          />
          <TextField
            label="Ventana de programación (min)"
            type="number"
            min={0}
            max={1440}
            step="15"
            value={draft.ventanaProgramacionMin}
            disabled={!puedeEditar}
            onChange={(event) =>
              setDraft({ ...draft, ventanaProgramacionMin: Number(event.target.value) || 0 })
            }
          />
          <SelectField
            label="Comportamiento offline"
            options={Object.entries(OFFLINE_LABEL).map(([value, label]) => ({ value, label }))}
            value={draft.comportamientoOffline}
            disabled={!puedeEditar}
            onChange={(event) =>
              setDraft({ ...draft, comportamientoOffline: event.target.value as ConfiguracionSucursal["comportamientoOffline"] })
            }
          />
          <label className="ajustes-check">
            <input
              type="checkbox"
              checked={draft.borradoComandaImpresa}
              disabled={!puedeEditar}
              onChange={(event) => setDraft({ ...draft, borradoComandaImpresa: event.target.checked })}
            />
            Permitir borrado de comanda ya impresa
          </label>
        </div>

        <div className="limites">
          <div className="limites__titulo">Límites por franja</div>
          <div className="limites__grid">
            {FRANJAS.map((franja) => (
              <TextField
                key={franja}
                label={`Máximo en ${FRANJA_LABEL[franja].toLowerCase()}`}
                type="number"
                min={1}
                max={999}
                value={limite(franja)}
                disabled={!puedeEditar}
                onChange={(event) => setLimite(franja, Number(event.target.value) || 0)}
              />
            ))}
          </div>
        </div>

        {cambios.length > 0 ? (
          <p className="ajustes-aviso" role="note">
            <AlertTriangle size={14} /> Cambios con efecto operativo: revisa la vista previa y confirma
            con motivo; quedarán en auditoría.
          </p>
        ) : null}

        <EffectPreviewPanel cambios={cambios} />
      </section>

      <ConfirmDialog
        open={confirmar}
        title="Guardar parámetros de operación"
        description="Los parámetros rigen la operación de la sede y se reflejan en las interfaces."
        impacto={cambios.map((cambio) => `${cambio.area}: ${cambio.antes} → ${cambio.despues}`).join("; ")}
        confirmLabel="Guardar parámetros"
        onCancel={() => setConfirmar(false)}
        onConfirm={(motivo) => {
          setConfirmar(false)
          guardar.mutate(
            { configuracion: draft, motivo },
            {
              onSuccess: () => mostrar("Parámetros actualizados; las interfaces los toman al operar", "exito"),
              onError: (error) => mostrar(mensajeError(error), "error"),
            },
          )
        }}
      />
    </div>
  )
}
