import { useEffect, useState } from "react"
import { Ban, Link2, Lock, Pencil, Save } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Drawer } from "@/components/ui/Drawer"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { ErrorState } from "@/components/ui/states"
import { SelectField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { formatDateTime, formatRelative } from "@/lib/format"
import { useSede } from "@/app/sede"
import {
  ESTACIONES_DISPOSITIVO,
  TITULARES_DISPOSITIVO,
  dispositivoDesactualizado,
  useDispositivo,
  useEditarDispositivo,
  useVersionesMinimas,
} from "@/modules/dispositivos/api"
import { DeviceDiagnosticPanel } from "@/modules/dispositivos/components/DeviceDiagnosticPanel"
import { DeviceStatusBadge } from "@/modules/dispositivos/components/DeviceStatusBadge"
import { TIPO_DISPOSITIVO_LABEL, type Dispositivo } from "@/modules/dispositivos/types"

function mensajeError(error: unknown): string {
  return error instanceof ApiError ? error.message : "Ocurrió un error inesperado"
}

/** Ficha + diagnóstico del dispositivo; permite ajustar estación o titular. */
export function DeviceDetailDrawer({
  dispositivoId,
  puedeEditar,
  puedeRevocar,
  puedeVincular,
  onClose,
  onRevocar,
  onRevincular,
}: {
  dispositivoId: string | null
  puedeEditar: boolean
  puedeRevocar: boolean
  puedeVincular: boolean
  onClose: () => void
  onRevocar: (dispositivo: Dispositivo) => void
  onRevincular: (dispositivo: Dispositivo) => void
}) {
  const { mostrar } = useToast()
  const { zonaHoraria } = useSede()
  const detalle = useDispositivo(dispositivoId)
  const versiones = useVersionesMinimas()
  const editar = useEditarDispositivo()

  const dispositivo = detalle.data ?? null
  const [usuarioId, setUsuarioId] = useState("")
  const [estacionId, setEstacionId] = useState("")
  const [editando, setEditando] = useState(false)

  useEffect(() => {
    if (!dispositivo) return
    setUsuarioId(dispositivo.usuarioId ?? "")
    setEstacionId(dispositivo.estacionId ?? "")
    setEditando(false)
  }, [dispositivo?.id, dispositivo?.version, dispositivo])

  const politica = versiones.data?.versiones.find((item) => item.tipo === dispositivo?.tipo)
  const desactualizado = dispositivo ? dispositivoDesactualizado(dispositivo) : false
  const guardar = () => {
    if (!dispositivo) return
    editar.mutate(
      {
        id: dispositivo.id,
        usuarioId: dispositivo.tipo === "apk" ? usuarioId : undefined,
        estacionId: dispositivo.tipo === "kds" ? estacionId : undefined,
      },
      {
        onSuccess: () => {
          mostrar("Asignación actualizada y auditada", "exito")
          setEditando(false)
        },
        onError: (error) => mostrar(mensajeError(error), "error"),
      },
    )
  }

  return (
    <Drawer
      open={Boolean(dispositivoId)}
      onClose={onClose}
      title={dispositivo ? dispositivo.id : "Dispositivo"}
      subtitle={
        dispositivo ? (
          <span className="detalle-dispositivo__subtitulo">
            {TIPO_DISPOSITIVO_LABEL[dispositivo.tipo]} · <DeviceStatusBadge dispositivo={dispositivo} desactualizado={desactualizado} />
          </span>
        ) : undefined
      }
      width={680}
    >
      {detalle.isLoading ? <SkeletonRows rows={6} columns={3} /> : null}
      {detalle.isError ? (
        <ErrorState description="No pudimos cargar la ficha del dispositivo." onRetry={() => void detalle.refetch()} />
      ) : null}

      {dispositivo ? (
        <>
          <section className="ficha">
            <div className="ficha__fila">
              <span>Sede</span>
              <strong>{dispositivo.sucursalNombre}</strong>
            </div>
            <div className="ficha__fila">
              <span>Alta</span>
              <strong>{formatDateTime(dispositivo.creadoEn)}</strong>
            </div>
            <div className="ficha__fila">
              <span>Última conexión</span>
              <strong>
                {dispositivo.ultimaConexionEn
                  ? `${formatRelative(dispositivo.ultimaConexionEn)} · ${formatDateTime(dispositivo.ultimaConexionEn, zonaHoraria)}`
                  : "Nunca (equipo visible, R5 §7)"}
              </strong>
            </div>
            <div className="ficha__fila">
              <span>Versión</span>
              <strong>
                {dispositivo.versionApp}
                {politica ? (
                  <small className={desactualizado ? "ficha__alerta" : undefined}>
                    {" "}
                    · mínimo {politica.versionMinima} {desactualizado ? "(requiere actualización)" : ""}
                  </small>
                ) : null}
              </strong>
            </div>
            <div className="ficha__fila">
              <span>Token</span>
              <strong>
                <Lock size={12} />•••••• <small>se rota al revincular</small>
              </strong>
            </div>
          </section>

          <section className="ficha__asignacion">
            <header>
              <strong>Asignación</strong>
              {puedeEditar && !editando ? (
                <Button variant="ghost" className="text-action" onClick={() => setEditando(true)}>
                  <Pencil size={13} /> Editar
                </Button>
              ) : null}
            </header>
            {editando && dispositivo.tipo === "apk" ? (
              <SelectField
                label="Mesero titular"
                options={TITULARES_DISPOSITIVO.map((titular) => ({ value: titular.id, label: titular.nombre }))}
                value={usuarioId}
                onChange={(event) => setUsuarioId(event.target.value)}
              />
            ) : editando && dispositivo.tipo === "kds" ? (
              <SelectField
                label="Estación asignada"
                options={ESTACIONES_DISPOSITIVO.map((item) => ({
                  value: item.id,
                  label: `${item.nombre}${item.activa ? "" : " (inactiva)"}`,
                }))}
                value={estacionId}
                onChange={(event) => setEstacionId(event.target.value)}
              />
            ) : (
              <p>
                {dispositivo.tipo === "apk"
                  ? `Titular: ${dispositivo.usuarioNombre ?? "—"}`
                  : dispositivo.tipo === "kds"
                    ? `Estación: ${dispositivo.estacionNombre ?? "—"}`
                    : "Sin asignación de usuario o estación"}
              </p>
            )}
            {editando ? (
              <div className="ficha__acciones">
                <Button variant="ghost" onClick={() => setEditando(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" disabled={editar.isPending} onClick={guardar}>
                  <Save size={14} /> {editar.isPending ? "Guardando…" : "Guardar asignación"}
                </Button>
              </div>
            ) : null}
          </section>

          <DeviceDiagnosticPanel dispositivoId={dispositivo.id} />

          <div className="ficha__acciones ficha__acciones--estado">
            {dispositivo.estado === "vinculado" ? (
              <Button
                variant="secondary"
                disabled={!puedeRevocar}
                title={puedeRevocar ? undefined : "Requiere permiso de dispositivos.revocar"}
                onClick={() => onRevocar(dispositivo)}
              >
                <Ban size={14} /> Revocar dispositivo
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={!puedeVincular}
                title={puedeVincular ? undefined : "Requiere permiso de dispositivos.vincular"}
                onClick={() => onRevincular(dispositivo)}
              >
                <Link2 size={14} /> Revincular
              </Button>
            )}
          </div>
        </>
      ) : null}
    </Drawer>
  )
}
