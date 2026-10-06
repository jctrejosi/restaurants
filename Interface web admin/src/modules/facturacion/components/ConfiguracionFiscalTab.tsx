import { useEffect, useRef, useState } from "react"
import { AlertTriangle, Save } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { TextField } from "@/components/ui/fields"
import { ErrorState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { useAuth } from "@/app/auth"
import { useConfigFiscal, useGuardarConfigFiscal } from "@/modules/facturacion/api"
import {
  TIPO_CONSECUTIVO_LABEL,
  TIPO_IMPUESTO_LABEL,
  type ConfigFiscal,
  type ConsecutivoConfig,
  type ImpuestoConfig,
} from "@/modules/facturacion/types"
import { ConsecutivoForm } from "@/modules/facturacion/components/ConsecutivoForm"
import { ImpuestoForm } from "@/modules/facturacion/components/ImpuestoForm"

/**
 * Configuración fiscal: impuestos, consecutivos por resolución/prefijo y copias.
 * Se edita en borrador y se guarda con motivo obligatorio (auditoría con
 * antes/después); el consecutivo `siguiente` nunca baja.
 */
export function ConfiguracionFiscalTab() {
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const { data, isLoading, isError, error, refetch } = useConfigFiscal()
  const guardar = useGuardarConfigFiscal()

  const [draft, setDraft] = useState<ConfigFiscal | null>(null)
  const [impuestoOpen, setImpuestoOpen] = useState(false)
  const [impuestoEdit, setImpuestoEdit] = useState<ImpuestoConfig | null>(null)
  const [consecutivoOpen, setConsecutivoOpen] = useState(false)
  const [consecutivoEdit, setConsecutivoEdit] = useState<ConsecutivoConfig | null>(null)
  const [guardarOpen, setGuardarOpen] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)
  const sincronizado = useRef<string | null>(null)

  useEffect(() => {
    if (!data) return
    if (sincronizado.current === data.actualizadoEn) return
    sincronizado.current = data.actualizadoEn
    setDraft({
      impuestos: data.impuestos.map((impuesto) => ({ ...impuesto })),
      consecutivos: data.consecutivos.map((consecutivo) => ({ ...consecutivo })),
      copiasFactura: data.copiasFactura,
      actualizadoEn: data.actualizadoEn,
      actualizadoPor: data.actualizadoPor,
    })
  }, [data])

  const puedeConfigurar = tienePermiso("facturacion.configurar")

  if (isError) {
    return (
      <ErrorState
        title="No pudimos cargar la configuración fiscal"
        description={(error as Error)?.message ?? "Reintenta en unos segundos."}
        onRetry={() => void refetch()}
      />
    )
  }

  if (isLoading || !draft) {
    return (
      <section className="panel">
        <SkeletonRows rows={6} columns={4} />
      </section>
    )
  }

  const avisos = draft.consecutivos.filter((consecutivo) => consecutivo.vigenciaEstado !== "vigente")
  const hayCambios = data
    ? JSON.stringify({
        impuestos: draft.impuestos,
        consecutivos: draft.consecutivos,
        copiasFactura: draft.copiasFactura,
      }) !==
      JSON.stringify({
        impuestos: data.impuestos,
        consecutivos: data.consecutivos,
        copiasFactura: data.copiasFactura,
      })
    : false

  const guardarConfig = (motivo: string) => {
    setErrorGuardado(null)
    guardar.mutate(
      {
        impuestos: draft.impuestos,
        consecutivos: draft.consecutivos,
        copiasFactura: draft.copiasFactura,
        motivo,
      },
      {
        onSuccess: () => {
          setGuardarOpen(false)
          mostrar("Configuración fiscal guardada y auditada.", "exito")
        },
        onError: (err) =>
          setErrorGuardado(err instanceof ApiError ? err.message : "No se pudo guardar la configuración."),
      },
    )
  }

  return (
    <>
      {avisos.length > 0 ? (
        <div className="facturacion-alerta" role="alert">
          <AlertTriangle size={17} aria-hidden="true" />
          <div>
            <strong>Resoluciones con la vigencia comprometida</strong>
            <span>
              {avisos
                .map(
                  (consecutivo) =>
                    `${consecutivo.prefijo} (${consecutivo.sucursalNombre}) vence ${consecutivo.vigenciaHasta}`,
                )
                .join(" · ")}
              . La emisión con consecutivo vencido se bloquea con 409.
            </span>
          </div>
        </div>
      ) : null}

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Impuestos</div>
            <div className="panel__subtitle">
              Tasa en puntos base (1900 = 19 %). Los cambios quedan auditados con el antes y el después.
            </div>
          </div>
          <Button
            variant="secondary"
            disabled={!puedeConfigurar}
            title={puedeConfigurar ? undefined : "Requiere permiso de facturacion.configurar"}
            onClick={() => {
              setImpuestoEdit(null)
              setImpuestoOpen(true)
            }}
          >
            Nuevo impuesto
          </Button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th className="cell-right">Tasa</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {draft.impuestos.map((impuesto) => (
                <tr key={impuesto.id}>
                  <td>{impuesto.nombre}</td>
                  <td className="cell-right">{(impuesto.tasaBps / 100).toFixed(2)} %</td>
                  <td>{TIPO_IMPUESTO_LABEL[impuesto.tipo]}</td>
                  <td>
                    <span className={`status status--${impuesto.activo ? "green" : "gray"}`}>
                      {impuesto.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="cell-right">
                    <Button
                      variant="ghost"
                      className="text-action"
                      disabled={!puedeConfigurar}
                      onClick={() => {
                        setImpuestoEdit(impuesto)
                        setImpuestoOpen(true)
                      }}
                    >
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Consecutivos por resolución</div>
            <div className="panel__subtitle">
              El siguiente número solo avanza al emitir; el panel no permite bajarlo.
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sede</th>
                <th>Tipo</th>
                <th>Prefijo</th>
                <th className="cell-right">Siguiente</th>
                <th>Resolución</th>
                <th>Vigencia</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {draft.consecutivos.map((consecutivo) => (
                <tr key={consecutivo.id}>
                  <td>{consecutivo.sucursalNombre}</td>
                  <td>{TIPO_CONSECUTIVO_LABEL[consecutivo.tipo]}</td>
                  <td>
                    <span className="order-id">{consecutivo.prefijo}</span>
                  </td>
                  <td className="cell-right">{consecutivo.siguiente}</td>
                  <td>{consecutivo.resolucion}</td>
                  <td>
                    <span
                      className={`status status--${
                        consecutivo.vigenciaEstado === "vencida"
                          ? "gray"
                          : consecutivo.vigenciaEstado === "por_vencer"
                            ? "amber"
                            : "green"
                      }`}
                    >
                      {consecutivo.vigenciaHasta}
                    </span>
                    <div className="facturacion-meta">
                      {consecutivo.vigenciaEstado === "vencida"
                        ? "Vencida: bloquea la emisión"
                        : consecutivo.vigenciaEstado === "por_vencer"
                          ? "Próxima a vencer"
                          : "Vigente"}
                    </div>
                  </td>
                  <td className="cell-right">
                    <Button
                      variant="ghost"
                      className="text-action"
                      disabled={!puedeConfigurar}
                      onClick={() => {
                        setConsecutivoEdit(consecutivo)
                        setConsecutivoOpen(true)
                      }}
                    >
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel__body facturacion-config__pie">
          <TextField
            label="Copias de factura"
            type="number"
            min={0}
            max={5}
            value={String(draft.copiasFactura)}
            disabled={!puedeConfigurar}
            hint="Copias que se imprimen en la estación al emitir."
            onChange={(event) =>
              setDraft((actual) =>
                actual ? { ...actual, copiasFactura: Math.max(0, Math.min(5, Number(event.target.value) || 0)) } : actual,
              )
            }
          />
          <div className="facturacion-config__meta">
            <span className="facturacion-meta">
              Última actualización: {formatDateTime(draft.actualizadoEn)} · {draft.actualizadoPor}
            </span>
            <Button
              variant="primary"
              disabled={!puedeConfigurar || !hayCambios}
              title={puedeConfigurar ? (hayCambios ? undefined : "No hay cambios por guardar") : "Requiere permiso de facturacion.configurar"}
              onClick={() => setGuardarOpen(true)}
            >
              <Save size={15} /> Guardar configuración
            </Button>
          </div>
        </div>
      </section>

      <ImpuestoForm
        open={impuestoOpen}
        impuesto={impuestoEdit}
        onCancel={() => setImpuestoOpen(false)}
        onGuardar={(impuesto) => {
          setDraft((actual) =>
            actual
              ? {
                  ...actual,
                  impuestos: actual.impuestos.some((item) => item.id === impuesto.id)
                    ? actual.impuestos.map((item) => (item.id === impuesto.id ? impuesto : item))
                    : [...actual.impuestos, impuesto],
                }
              : actual,
          )
          setImpuestoOpen(false)
        }}
      />
      <ConsecutivoForm
        open={consecutivoOpen}
        consecutivo={consecutivoEdit}
        onCancel={() => setConsecutivoOpen(false)}
        onGuardar={(consecutivo) => {
          setDraft((actual) =>
            actual
              ? {
                  ...actual,
                  consecutivos: actual.consecutivos.map((item) =>
                    item.id === consecutivo.id ? consecutivo : item,
                  ),
                }
              : actual,
          )
          setConsecutivoOpen(false)
        }}
      />

      <ConfirmDialog
        open={guardarOpen}
        title="Guardar configuración fiscal"
        description="Los cambios aplican a la emisión y al reintento de facturas."
        impacto={
          errorGuardado
            ? errorGuardado
            : `Se guardarán ${draft.impuestos.length} impuestos, ${draft.consecutivos.length} consecutivos y ${draft.copiasFactura} copias. Queda auditado con el antes y el después.`
        }
        motivoLabel="Motivo del cambio"
        confirmLabel={guardar.isPending ? "Guardando…" : "Guardar cambios"}
        onCancel={() => {
          setGuardarOpen(false)
          setErrorGuardado(null)
        }}
        onConfirm={guardarConfig}
      />
    </>
  )
}
