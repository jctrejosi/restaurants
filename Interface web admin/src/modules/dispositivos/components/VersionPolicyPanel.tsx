import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, HardDrive } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { ErrorState } from "@/components/ui/states"
import { TextField } from "@/components/ui/fields"
import {
  TIPO_DISPOSITIVO_LABEL,
  TIPOS_DISPOSITIVO,
  type DispositivoTipo,
  type VersionMinima,
  type VersionesMinimasResp,
} from "@/modules/dispositivos/types"

type Borrador = Record<DispositivoTipo, { versionMinima: string; forzar: boolean }>

function borradorDesde(versiones: VersionMinima[]): Borrador {
  const borrador = {} as Borrador
  for (const tipo of TIPOS_DISPOSITIVO) {
    const item = versiones.find((version) => version.tipo === tipo)
    borrador[tipo] = { versionMinima: item?.versionMinima ?? "0.0.0", forzar: item?.forzar ?? false }
  }
  return borrador
}

/**
 * Política de versión mínima por tipo (V1, RF-R5-151) con vista del parque
 * instalado. Es sensible: pide motivo y queda auditada.
 */
export function VersionPolicyPanel({
  data,
  cargando,
  error,
  onRetry,
  puedeEditar,
  guardando,
  onGuardar,
}: {
  data: VersionesMinimasResp | undefined
  cargando: boolean
  error: Error | null
  onRetry: () => void
  puedeEditar: boolean
  guardando: boolean
  onGuardar: (versiones: VersionMinima[], motivo: string) => void
}) {
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  const [confirmar, setConfirmar] = useState(false)

  useEffect(() => {
    if (data) setBorrador(borradorDesde(data.versiones))
  }, [data])

  const cambios = useMemo(() => {
    if (!data || !borrador) return []
    const lista: string[] = []
    for (const tipo of TIPOS_DISPOSITIVO) {
      const original = data.versiones.find((item) => item.tipo === tipo)
      const actual = borrador[tipo]
      if (!original) continue
      if (original.versionMinima !== actual.versionMinima) {
        lista.push(`${TIPO_DISPOSITIVO_LABEL[tipo]}: ${original.versionMinima} → ${actual.versionMinima}`)
      } else if (original.forzar !== actual.forzar) {
        lista.push(`${TIPO_DISPOSITIVO_LABEL[tipo]}: ${actual.forzar ? "forzar" : "solo avisar"}`)
      }
    }
    return lista
  }, [data, borrador])

  if (cargando || !borrador) {
    return (
      <section className="panel">
        <SkeletonRows rows={4} columns={4} />
      </section>
    )
  }

  if (error || !data) {
    return <ErrorState description="No pudimos cargar la política de versiones." onRetry={onRetry} />
  }

  return (
    <section className="panel versiones">
      <div className="panel__header">
        <div>
          <div className="panel__title">Versión mínima por tipo</div>
          <div className="panel__subtitle">
            APK y KDS fuerzan la actualización antes de operar; caja y print agent solo reciben aviso.
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Versión mínima</th>
              <th>Comportamiento</th>
              <th>Parque instalado</th>
            </tr>
          </thead>
          <tbody>
            {TIPOS_DISPOSITIVO.map((tipo) => {
              const parque = data.parque[tipo]
              const editableForzar = tipo === "apk" || tipo === "kds"
              return (
                <tr key={tipo}>
                  <td>
                    <strong className="texto-fuerte">{TIPO_DISPOSITIVO_LABEL[tipo]}</strong>
                  </td>
                  <td>
                    <TextField
                      aria-label={`Versión mínima de ${TIPO_DISPOSITIVO_LABEL[tipo]}`}
                      value={borrador[tipo].versionMinima}
                      disabled={!puedeEditar}
                      onChange={(event) =>
                        setBorrador((actual) =>
                          actual
                            ? {
                                ...actual,
                                [tipo]: { ...actual[tipo], versionMinima: event.target.value },
                              }
                            : actual,
                        )
                      }
                    />
                  </td>
                  <td>
                    <label className="versiones__forzar">
                      <input
                        type="checkbox"
                        checked={borrador[tipo].forzar}
                        disabled={!puedeEditar || !editableForzar}
                        title={
                          editableForzar
                            ? "Fuerza la actualización antes de operar"
                            : "Caja y print agent solo reciben aviso"
                        }
                        onChange={(event) =>
                          setBorrador((actual) =>
                            actual
                              ? { ...actual, [tipo]: { ...actual[tipo], forzar: event.target.checked } }
                              : actual,
                          )
                        }
                      />
                      Fuerza actualización
                    </label>
                  </td>
                  <td>
                    <span className="versiones__parque">
                      <HardDrive size={13} /> {parque.total} equipos
                      {parque.desactualizados > 0 ? (
                        <StatusBadge tone="amber">{parque.desactualizados} por debajo</StatusBadge>
                      ) : (
                        <StatusBadge tone="green">Al día</StatusBadge>
                      )}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="versiones__footer">
        <span>
          <AlertTriangle size={13} /> Los equipos por debajo del mínimo quedan marcados y reciben la
          política al reconectar.
        </span>
        <Button
          variant="primary"
          disabled={!puedeEditar || cambios.length === 0 || guardando}
          title={puedeEditar ? undefined : "Requiere permiso de dispositivos.version"}
          onClick={() => setConfirmar(true)}
        >
          {guardando ? "Guardando…" : "Guardar política"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmar}
        title="Guardar versión mínima"
        description="La política aplica por tipo de dispositivo en todo el tenant."
        impacto={
          cambios.length > 0
            ? `Cambios: ${cambios.join("; ")}. Los equipos afectados reciben la política al reconectar.`
            : "Sin cambios."
        }
        confirmLabel="Confirmar política"
        onCancel={() => setConfirmar(false)}
        onConfirm={(motivo) => {
          setConfirmar(false)
          onGuardar(
            TIPOS_DISPOSITIVO.map((tipo) => ({ tipo, ...borrador[tipo] })),
            motivo,
          )
        }}
      />
    </section>
  )
}
