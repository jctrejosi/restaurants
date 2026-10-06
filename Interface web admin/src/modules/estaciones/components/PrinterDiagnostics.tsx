/**
 * Diagnóstico de impresoras (RF-R5-33, V1; plan 07 §3): prueba de impresión con
 * resultado visible para soporte, últimos trabajos (pendiente/enviado/impreso/
 * reintentando/fallido), `intentos`, `ultimo_error` y reintento manual.
 */

import { useState } from "react"
import { Printer, RefreshCw } from "lucide-react"
import { useAuth } from "@/app/auth"
import { Button } from "@/components/ui/Button"
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge"
import { useToast } from "@/components/ui/toast"
import { formatDateTime, formatRelative } from "@/lib/format"
import { useImpresoras, useProbarImpresion } from "@/modules/estaciones/api"
import {
  CONEXION_LABEL,
  DOCUMENTO_LABEL,
  TRABAJO_ESTADO_LABEL,
  type Impresora,
  type ResultadoPrueba,
  type TrabajoEstado,
} from "@/modules/estaciones/types"

const TONO: Record<TrabajoEstado, StatusTone> = {
  pendiente: "gray",
  enviado: "blue",
  impreso: "green",
  reintentando: "amber",
  fallido: "amber",
}

export function PrinterDiagnostics({ sucursalId }: { sucursalId: string }) {
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const impresoras = useImpresoras(sucursalId || undefined)
  const probar = useProbarImpresion()
  const [resultados, setResultados] = useState<Record<string, ResultadoPrueba & { impresora: Impresora }>>({})
  const [enCurso, setEnCurso] = useState<string | null>(null)

  const puedeProbar = tienePermiso("impresoras.probar")

  const lanzar = (impresora: Impresora, trabajoId?: string) => {
    setEnCurso(trabajoId ?? impresora.id)
    probar.mutate(
      { impresoraId: impresora.id, trabajoId },
      {
        onSuccess: (resultado) => {
          setResultados((actual) => ({ ...actual, [impresora.id]: resultado }))
          mostrar(
            resultado.ok ? resultado.mensaje : `Fallo de impresión: ${resultado.mensaje}`,
            resultado.ok ? "exito" : "error",
          )
        },
        onError: (error) => mostrar(error instanceof Error ? error.message : "No se pudo probar la impresora.", "error"),
        onSettled: () => setEnCurso(null),
      },
    )
  }

  const lista = (impresoras.data ?? []).filter((impresora) => impresora.sucursalId === sucursalId)

  if (impresoras.isError) {
    return (
      <div className="state-block state-block--error">
        <strong>No pudimos cargar las impresoras</strong>
        <Button variant="secondary" onClick={() => void impresoras.refetch()}>Reintentar</Button>
      </div>
    )
  }

  if (impresoras.isLoading) {
    return (
      <div className="skeleton-rows">
        <div className="skeleton-rows__row"><span className="skeleton" style={{ width: "100%", height: 90 }} /></div>
        <div className="skeleton-rows__row"><span className="skeleton" style={{ width: "100%", height: 90 }} /></div>
      </div>
    )
  }

  if (lista.length === 0) {
    return (
      <div className="state-block">
        <strong>Sin impresoras en esta sede</strong>
        <p>Crea una impresora en la pestaña Impresoras y rutas para poder probarla.</p>
      </div>
    )
  }

  return (
    <div className="est-diag">
      <div className="module-notice">
        <strong>Diagnóstico V1:</strong>
        <span>
          El resultado de cada prueba y reintento queda visible para soporte y registrado en auditoría; nunca se oculta
          un fallo.
        </span>
      </div>

      <div className="est-diag__grid">
        {lista.map((impresora) => {
          const resultado = resultados[impresora.id]
          const fallidos = impresora.ultimosTrabajos.filter((trabajo) => trabajo.estado === "fallido")
          return (
            <section className="panel est-diag__card" key={impresora.id}>
              <div className="panel__header">
                <div>
                  <div className="panel__title">
                    <Printer size={15} /> {impresora.nombre}
                  </div>
                  <div className="panel__subtitle">
                    {CONEXION_LABEL[impresora.tipoConexion]} · {impresora.direccion} · {impresora.perfil}
                  </div>
                </div>
                <StatusBadge tone={impresora.activa ? "green" : "gray"}>
                  {impresora.activa ? "activa" : "inactiva"}
                </StatusBadge>
              </div>

              {resultado ? (
                <div className={resultado.ok ? "notice notice--ok" : "notice notice--error"}>
                  <strong>{resultado.ok ? "Impresión correcta" : "Fallo de impresión"}</strong>
                  <span>{resultado.mensaje}</span>
                </div>
              ) : null}

              <div className="est-diag__acciones">
                <Button
                  variant="secondary"
                  disabled={!puedeProbar || (probar.isPending && enCurso === impresora.id)}
                  title={puedeProbar ? undefined : "Requiere permiso de impresoras.probar"}
                  onClick={() => lanzar(impresora)}
                >
                  <Printer size={15} />{" "}
                  {probar.isPending && enCurso === impresora.id ? "Enviando…" : "Probar impresión"}
                </Button>
              </div>

              {impresora.ultimosTrabajos.length === 0 ? (
                <p className="drawer__note">Sin trabajos recientes.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Trabajo</th>
                        <th>Estado</th>
                        <th>Intentos</th>
                        <th>Error</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {impresora.ultimosTrabajos.map((trabajo) => (
                        <tr key={trabajo.id}>
                          <td>
                            <span className="order-id">{DOCUMENTO_LABEL[trabajo.documento]}</span>
                            <span className="order-type">
                              {formatDateTime(trabajo.creadoEn)} · {formatRelative(trabajo.creadoEn)}
                            </span>
                          </td>
                          <td>
                            <StatusBadge tone={TONO[trabajo.estado]}>{TRABAJO_ESTADO_LABEL[trabajo.estado]}</StatusBadge>
                          </td>
                          <td>{trabajo.intentos}</td>
                          <td className="est-diag__error">{trabajo.ultimoError ?? "—"}</td>
                          <td className="cell-right">
                            {trabajo.estado === "fallido" || trabajo.estado === "reintentando" ? (
                              <Button
                                variant="ghost"
                                className="text-action"
                                disabled={!puedeProbar || (probar.isPending && enCurso === trabajo.id)}
                                title={puedeProbar ? undefined : "Requiere permiso de impresoras.probar"}
                                onClick={() => lanzar(impresora, trabajo.id)}
                              >
                                <RefreshCw size={14} /> Reintentar
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {fallidos.length > 0 ? (
                <p className="est-aviso">
                  {fallidos.length} trabajo(s) fallido(s): revisa la conexión antes de reintentar.
                </p>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}
