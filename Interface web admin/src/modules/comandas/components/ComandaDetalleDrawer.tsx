import { useEffect, useState } from "react"
import { Printer, Shuffle, ExternalLink, AlertTriangle } from "lucide-react"
import { Drawer } from "@/components/ui/Drawer"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SelectField } from "@/components/ui/fields"
import { ErrorState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { useToast } from "@/components/ui/toast"
import { DurationCell } from "@/components/data/cells"
import { ApiError } from "@/lib/api"
import { formatDateTime, formatDuration } from "@/lib/format"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import {
  useComandaDetalle,
  useReasignarComanda,
  useReimprimirComanda,
} from "@/modules/comandas/api"
import {
  ESTADO_LABEL,
  LINEA_ESTADO_LABEL,
  MODALIDAD_LABEL,
  type Estacion,
} from "@/modules/comandas/types"

const TRABAJO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  imprimiendo: "Imprimiendo",
  impreso: "Impreso",
  fallido: "Fallido",
}

export function ComandaDetalleDrawer({
  comandaId,
  estaciones,
  onClose,
  onVerAuditoria,
}: {
  comandaId: string | null
  onClose: () => void
  estaciones: Estacion[]
  onVerAuditoria: (auditoriaId: string, etiqueta: string) => void
}) {
  const { data, isLoading, isError, refetch } = useComandaDetalle(comandaId)
  const reimprimir = useReimprimirComanda()
  const reasignar = useReasignarComanda()
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const { zonaHoraria } = useSede()

  const [dialogo, setDialogo] = useState<"reimprimir" | "reasignar" | null>(null)
  const [estacionDestino, setEstacionDestino] = useState("")

  useEffect(() => {
    setDialogo(null)
    setEstacionDestino("")
  }, [comandaId])

  const puedeReimprimir = tienePermiso("comandas.reimprimir")
  const puedeReasignar = tienePermiso("comandas.reasignar")

  const confirmarReimpresion = (motivo: string) => {
    if (!comandaId) return
    reimprimir.mutate(
      { id: comandaId, motivo },
      {
        onSuccess: () => {
          mostrar("Reimpresión registrada y trazada en auditoría", "exito")
          setDialogo(null)
        },
        onError: (error) =>
          mostrar(
            error instanceof ApiError ? error.message : "No se pudo relanzar la impresión",
            "error",
          ),
      },
    )
  }

  const confirmarReasignacion = (motivo: string) => {
    if (!comandaId || !estacionDestino) return
    reasignar.mutate(
      { id: comandaId, estacionId: estacionDestino, motivo },
      {
        onSuccess: (respuesta) => {
          mostrar(`Comanda reasignada a ${respuesta.estacionNombre}`, "exito")
          setDialogo(null)
          setEstacionDestino("")
        },
        onError: (error) =>
          mostrar(
            error instanceof ApiError ? error.message : "No se pudo reasignar la comanda",
            "error",
          ),
      },
    )
  }

  return (
    <Drawer
      open={Boolean(comandaId)}
      onClose={onClose}
      width={620}
      title={data ? `Comanda #${data.numero}` : "Comanda"}
      subtitle={
        data
          ? `${data.estacionNombre} · ${data.mesa ?? MODALIDAD_LABEL[data.modalidad]} · ${data.pedidoFolio}`
          : undefined
      }
      footer={
        data ? (
          <>
            <Button variant="secondary" onClick={() => onVerAuditoria(data.auditoriaId ?? "", `comanda #${data.numero}`)}>
              <ExternalLink size={15} /> Ver auditoría
            </Button>
            <span className="comandas-drawer__spacer" />
            <Button
              variant="secondary"
              disabled={!puedeReasignar || !data}
              title={puedeReasignar ? "V2: reasignar entre estaciones" : "Requiere permiso comandas.reasignar"}
              onClick={() => setDialogo("reasignar")}
            >
              <Shuffle size={15} /> Reasignar (V2)
            </Button>
            <Button
              variant="primary"
              disabled={!puedeReimprimir || !data}
              title={puedeReimprimir ? undefined : "Requiere permiso comandas.reimprimir"}
              onClick={() => setDialogo("reimprimir")}
            >
              <Printer size={15} /> Reimprimir
            </Button>
          </>
        ) : undefined
      }
    >
      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <SkeletonRows rows={7} columns={2} />
      ) : (
        <div className="comandas-detail">
          <div className="comandas-detail__row">
            <StatusBadge tone={data.estadoTone}>{ESTADO_LABEL[data.estado]}</StatusBadge>
            {data.prioridad === "urgente" ? <StatusBadge tone="amber">Urgente</StatusBadge> : null}
            <span className="comandas-detail__time">
              <DurationCell
                segundos={data.transcurridoSeg}
                objetivoSeg={data.objetivoSeg}
                titulo="Tiempo transcurrido desde el envío"
              />
              <span className="comandas-detail__muted">
                SLA {formatDuration(data.objetivoSeg)}
              </span>
            </span>
          </div>

          {data.estado === "anulada" ? (
            <div className="comandas-detail__alert">
              <AlertTriangle size={15} aria-hidden="true" />
              <span>
                <strong>Comanda anulada.</strong> Responsable: {data.responsable ?? "—"}.
                {data.motivo ? ` Motivo: ${data.motivo}.` : ""} No cuenta para el SLA del turno.
              </span>
            </div>
          ) : null}

          <dl className="comandas-detail__grid">
            <div>
              <dt>Pedido</dt>
              <dd>{data.pedidoFolio}</dd>
            </div>
            <div>
              <dt>{MODALIDAD_LABEL[data.modalidad]}</dt>
              <dd>{data.mesa ?? "—"}</dd>
            </div>
            <div>
              <dt>Mesero</dt>
              <dd>{data.mesero ?? "—"}</dd>
            </div>
            <div>
              <dt>Estación</dt>
              <dd>{data.estacionNombre}</dd>
            </div>
          </dl>

          <section className="comandas-detail__section">
            <h4 className="comandas-detail__title">Sellos del servidor</h4>
            <ul className="comandas-timeline">
              <li>
                <span className="comandas-timeline__dot" />
                <span className="comandas-timeline__label">Enviada</span>
                <span className="comandas-timeline__value">{formatDateTime(data.enviadaEn, zonaHoraria)}</span>
              </li>
              <li className={data.listaEn ? "" : "comandas-timeline--muted"}>
                <span className="comandas-timeline__dot" />
                <span className="comandas-timeline__label">Lista</span>
                <span className="comandas-timeline__value">
                  {data.listaEn ? formatDateTime(data.listaEn, zonaHoraria) : "—"}
                </span>
              </li>
              <li className={data.entregadaEn ? "" : "comandas-timeline--muted"}>
                <span className="comandas-timeline__dot" />
                <span className="comandas-timeline__label">Entregada</span>
                <span className="comandas-timeline__value">
                  {data.entregadaEn ? formatDateTime(data.entregadaEn, zonaHoraria) : "—"}
                </span>
              </li>
            </ul>
            <p className="comandas-detail__muted">
              Preparación:{" "}
              <DurationCell
                segundos={data.preparacionSeg}
                objetivoSeg={data.objetivoSeg}
                titulo="= lista − enviada; sin evento de cierre no se promedia"
              />
            </p>
          </section>

          <section className="comandas-detail__section">
            <h4 className="comandas-detail__title">Líneas ({data.lineas.length})</h4>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="cell-right">Cant.</th>
                    <th>Estado</th>
                    <th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lineas.map((linea) => (
                    <tr key={linea.id}>
                      <td>{linea.nombreSnapshot}</td>
                      <td className="cell-right">{linea.cantidad}</td>
                      <td>
                        <span
                          className={`status ${linea.estado === "lista" ? "status--green" : linea.estado === "en_preparacion" ? "status--amber" : "status--gray"}`}
                        >
                          {LINEA_ESTADO_LABEL[linea.estado]}
                        </span>
                      </td>
                      <td>{linea.notas ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="comandas-detail__section">
            <h4 className="comandas-detail__title">Impresión</h4>
            <div className="comandas-print">
              <div>
                <span className="comandas-detail__muted">Impresora</span>
                <strong>{data.trabajoImpresion.impresora}</strong>
              </div>
              <div>
                <span className="comandas-detail__muted">Estado</span>
                <strong>
                  <span
                    className={`status ${data.trabajoImpresion.estado === "fallido" ? "status--amber" : data.trabajoImpresion.estado === "impreso" ? "status--green" : "status--blue"}`}
                  >
                    {TRABAJO_LABEL[data.trabajoImpresion.estado] ?? data.trabajoImpresion.estado}
                  </span>
                </strong>
              </div>
              <div>
                <span className="comandas-detail__muted">Intentos</span>
                <strong>{data.trabajoImpresion.intentos}</strong>
              </div>
              <div>
                <span className="comandas-detail__muted">Actualizado</span>
                <strong>{formatDateTime(data.trabajoImpresion.actualizadoEn, zonaHoraria)}</strong>
              </div>
            </div>
            {data.trabajoImpresion.ultimoError ? (
              <p className="comandas-detail__error">
                <AlertTriangle size={13} aria-hidden="true" /> Último error: {data.trabajoImpresion.ultimoError}
              </p>
            ) : null}
          </section>

          {data.alertas.length > 0 ? (
            <section className="comandas-detail__section">
              <h4 className="comandas-detail__title">Alertas</h4>
              <ul className="comandas-alerts">
                {data.alertas.map((alerta) => (
                  <li key={alerta.id}>
                    <AlertTriangle size={14} aria-hidden="true" />
                    <span>{alerta.mensaje}</span>
                    <span className="comandas-detail__muted">{formatDateTime(alerta.creadaEn, zonaHoraria)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {puedeReasignar ? (
            <section className="comandas-detail__section">
              <h4 className="comandas-detail__title">Reasignar estación (V2)</h4>
              <SelectField
                label="Estación destino"
                placeholder="Selecciona una estación"
                value={estacionDestino}
                onChange={(event) => setEstacionDestino(event.target.value)}
                options={estaciones
                  .filter((estacion) => estacion.id !== data.estacionId)
                  .map((estacion) => ({ value: estacion.id, label: estacion.nombre }))}
              />
              <span className="field__hint">El cambio queda auditado con antes/después y motivo.</span>
            </section>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={dialogo === "reimprimir"}
        title="Reimprimir comanda"
        description="Relanza el trabajo de impresión en la impresora de la estación."
        impacto="Crea un nuevo trabajo de impresión y queda registrado en auditoría con tu motivo."
        motivoLabel="Motivo de la reimpresión"
        confirmLabel="Reimprimir"
        onCancel={() => setDialogo(null)}
        onConfirm={confirmarReimpresion}
      />

      <ConfirmDialog
        open={dialogo === "reasignar"}
        title="Reasignar comanda a otra estación"
        description="Acción V2: cambia la estación responsable de la comanda."
        impacto={`Se moverá de ${data?.estacionNombre ?? "—"} a ${
          estaciones.find((estacion) => estacion.id === estacionDestino)?.nombre ?? "la estación elegida"
        }.`}
        motivoLabel="Motivo de la reasignación"
        confirmLabel="Reasignar"
        onCancel={() => setDialogo(null)}
        onConfirm={confirmarReasignacion}
      />
    </Drawer>
  )
}
