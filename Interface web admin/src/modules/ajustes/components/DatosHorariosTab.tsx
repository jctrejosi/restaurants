import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Landmark, Plus, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { ErrorState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { SelectField, TextField, type SelectOption } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import {
  MONEDAS,
  TIPO_IMPUESTO_LABEL,
  ZONAS_HORARIAS,
  type Impuesto,
  type PreviewCambio,
  type Sucursal,
} from "@/modules/ajustes/types"
import { useActualizarAjustes, useAjustes, useCrearCierre, useEliminarCierre, useGuardarHorarios, useHorarios } from "@/modules/ajustes/api"
import { ClosureList } from "@/modules/ajustes/components/ClosureList"
import { EffectPreviewPanel } from "@/modules/ajustes/components/EffectPreviewPanel"
import {
  WeeklyScheduleEditor,
  draftDesdeHorarios,
  horariosDesdeDraft,
  type HorarioDraft,
} from "@/modules/ajustes/components/WeeklyScheduleEditor"

function mensajeError(error: unknown): string {
  return error instanceof ApiError ? error.message : "Ocurrió un error inesperado"
}

function cambiosDatos(original: Sucursal, draft: Sucursal): PreviewCambio[] {
  const cambios: PreviewCambio[] = []
  const agregar = (area: string, antes: string, despues: string, efecto: string) => {
    if (antes !== despues) cambios.push({ area, antes, despues, efecto })
  }
  agregar("Zona horaria", original.zonaHoraria, draft.zonaHoraria, "Formatos y horarios del panel para esta sede; no reescribe históricos.")
  agregar("Moneda", original.moneda, draft.moneda, "Importes del panel y tickets nuevos; con turno abierto requiere confirmación.")
  agregar("Nombre", original.nombre, draft.nombre, "Ficha de la sede en todas las interfaces.")
  agregar("Código", original.codigo, draft.codigo, "Identificador operativo y reportes.")
  agregar("Dirección", original.direccion, draft.direccion, "Ficha de sede y documentos.")
  agregar("Ciudad", original.ciudad, draft.ciudad, "Ficha de sede y reportes.")
  agregar("Teléfono", original.telefono, draft.telefono, "Ficha pública y confirmaciones.")
  agregar("Coordenadas", original.coordenadas, draft.coordenadas, "Mapa de domicilio y cobertura.")
  agregar("Estado", original.activa ? "Activa" : "Inactiva", draft.activa ? "Activa" : "Inactiva", "Disponibilidad de la sede para operar.")
  return cambios
}

function tasaDesdeBps(bps: number): string {
  return (bps / 100).toFixed(2).replace(/\.00$/, "")
}

/** Pestaña «Datos y horarios»: sede, rejilla semanal, cierres e impuestos globales. */
export function DatosHorariosTab({
  puedeEditar,
  puedeGlobal,
}: {
  puedeEditar: boolean
  puedeGlobal: boolean
}) {
  const { mostrar } = useToast()
  const ajustes = useAjustes(true)
  const horariosQuery = useHorarios(true)
  const actualizar = useActualizarAjustes()
  const guardarHorarios = useGuardarHorarios()
  const crearCierre = useCrearCierre()
  const eliminarCierre = useEliminarCierre()

  const [datos, setDatos] = useState<Sucursal | null>(null)
  const [horarioDraft, setHorarioDraft] = useState<HorarioDraft | null>(null)
  const [impuestos, setImpuestos] = useState<Impuesto[]>([])
  const [confirmarDatos, setConfirmarDatos] = useState(false)
  const [confirmarHorarios, setConfirmarHorarios] = useState(false)
  const [confirmarImpuestos, setConfirmarImpuestos] = useState(false)

  useEffect(() => {
    if (ajustes.data) setDatos(ajustes.data.sucursal)
  }, [ajustes.data])

  useEffect(() => {
    if (ajustes.data) setImpuestos(ajustes.data.impuestos)
  }, [ajustes.data])

  useEffect(() => {
    if (horariosQuery.data) setHorarioDraft(draftDesdeHorarios(horariosQuery.data.horarios))
  }, [horariosQuery.data])

  const preview = useMemo(
    () => (datos && ajustes.data ? cambiosDatos(ajustes.data.sucursal, datos) : []),
    [datos, ajustes.data],
  )

  const horariosFinales = useMemo(
    () => (horarioDraft ? horariosDesdeDraft(horarioDraft) : []),
    [horarioDraft],
  )

  const celdaInvalida = useMemo(() => {
    if (!horarioDraft) return false
    return Object.entries(horarioDraft).some(
      ([, celda]) => !celda.apertura || !celda.cierre || celda.cierre <= celda.apertura,
    )
  }, [horarioDraft])

  const opcionesZona: SelectOption[] = ZONAS_HORARIAS.map((zona) => ({ value: zona, label: zona }))
  const opcionesMoneda: SelectOption[] = MONEDAS.map((moneda) => ({ value: moneda, label: moneda }))

  if (ajustes.isError || horariosQuery.isError) {
    return (
      <ErrorState
        description="No pudimos cargar los datos de la sede."
        onRetry={() => {
          void ajustes.refetch()
          void horariosQuery.refetch()
        }}
      />
    )
  }

  if (ajustes.isLoading || horariosQuery.isLoading || !datos || !horarioDraft) {
    return <SkeletonRows rows={8} columns={4} />
  }

  const zonaCambia = ajustes.data ? datos.zonaHoraria !== ajustes.data.sucursal.zonaHoraria : false
  const monedaCambia = ajustes.data ? datos.moneda !== ajustes.data.sucursal.moneda : false

  return (
    <div className="ajustes-tab">
      <section className="panel ajustes-seccion">
        <div className="panel__header">
          <div>
            <div className="panel__title">Datos de la sucursal</div>
            <div className="panel__subtitle">
              Rigen la operación, los horarios y los formatos de esta sede (RNF-R5-08).
            </div>
          </div>
          <Button
            variant="primary"
            disabled={!puedeEditar || preview.length === 0}
            title={puedeEditar ? undefined : "Requiere permiso de ajustes.editar"}
            onClick={() => setConfirmarDatos(true)}
          >
            <Save size={14} /> Guardar datos
          </Button>
        </div>
        <div className="ajustes-form">
          <TextField
            label="Nombre"
            value={datos.nombre}
            disabled={!puedeEditar}
            onChange={(event) => setDatos({ ...datos, nombre: event.target.value })}
          />
          <TextField
            label="Código"
            value={datos.codigo}
            disabled={!puedeEditar}
            onChange={(event) => setDatos({ ...datos, codigo: event.target.value })}
          />
          <TextField
            label="Dirección"
            value={datos.direccion}
            disabled={!puedeEditar}
            onChange={(event) => setDatos({ ...datos, direccion: event.target.value })}
          />
          <TextField
            label="Ciudad"
            value={datos.ciudad}
            disabled={!puedeEditar}
            onChange={(event) => setDatos({ ...datos, ciudad: event.target.value })}
          />
          <TextField
            label="Teléfono"
            value={datos.telefono}
            disabled={!puedeEditar}
            onChange={(event) => setDatos({ ...datos, telefono: event.target.value })}
          />
          <TextField
            label="Coordenadas"
            value={datos.coordenadas}
            hint="latitud, longitud"
            disabled={!puedeEditar}
            onChange={(event) => setDatos({ ...datos, coordenadas: event.target.value })}
          />
          <SelectField
            label="Zona horaria"
            options={opcionesZona}
            value={datos.zonaHoraria}
            disabled={!puedeEditar}
            onChange={(event) => setDatos({ ...datos, zonaHoraria: event.target.value })}
          />
          <SelectField
            label="Moneda"
            options={opcionesMoneda}
            value={datos.moneda}
            disabled={!puedeEditar}
            onChange={(event) => setDatos({ ...datos, moneda: event.target.value })}
          />
          <label className="ajustes-check">
            <input
              type="checkbox"
              checked={datos.activa}
              disabled={!puedeEditar}
              onChange={(event) => setDatos({ ...datos, activa: event.target.checked })}
            />
            Sede activa (disponible para operar)
          </label>
        </div>
        {zonaCambia || monedaCambia ? (
          <p className="ajustes-aviso" role="note">
            <AlertTriangle size={14} /> Cambiar zona horaria o moneda aplica a operaciones y formatos
            nuevos; no reescribe pedidos, turnos ni reportes ya cerrados.
          </p>
        ) : null}
        <EffectPreviewPanel cambios={preview} />
      </section>

      <section className="panel ajustes-seccion">
        <div className="panel__header">
          <div>
            <div className="panel__title">Horarios y cierres</div>
            <div className="panel__subtitle">Rejilla semanal por franja; las franjas vacías quedan cerradas.</div>
          </div>
          <Button
            variant="primary"
            disabled={!puedeEditar || celdaInvalida || horariosFinales.length === 0}
            title={
              celdaInvalida
                ? "Revisa las franjas con cierre anterior a la apertura"
                : horariosFinales.length === 0
                  ? "Configura al menos una franja"
                  : undefined
            }
            onClick={() => setConfirmarHorarios(true)}
          >
            <Save size={14} /> Guardar horarios
          </Button>
        </div>
        {horariosFinales.length === 0 ? (
          <p className="ajustes-aviso" role="note">
            <AlertTriangle size={14} /> La sede no tiene horarios: la web y el APK la verán cerrada.
            Marca «abrir» en las franjas que apliquen.
          </p>
        ) : null}
        <WeeklyScheduleEditor valor={horarioDraft} onChange={setHorarioDraft} puedeEditar={puedeEditar} />
        <ClosureList
          cierres={horariosQuery.data?.cierres ?? []}
          puedeEditar={puedeEditar}
          creando={crearCierre.isPending}
          onCrear={(payload) =>
            crearCierre.mutate(payload, {
              onSuccess: (cierre) =>
                mostrar(
                  cierre.reservasAfectadas > 0
                    ? `Cierre programado: ${cierre.reservasAfectadas} reservas quedan afectadas`
                    : "Cierre programado y auditado",
                  "exito",
                ),
              onError: (error) => mostrar(mensajeError(error), "error"),
            })
          }
          onEliminar={(id, motivo) =>
            eliminarCierre.mutate(
              { id, motivo },
              {
                onSuccess: () => mostrar("Cierre eliminado y auditado", "exito"),
                onError: (error) => mostrar(mensajeError(error), "error"),
              },
            )
          }
        />
      </section>

      <section className="panel ajustes-seccion">
        <div className="panel__header">
          <div>
            <div className="panel__title">
              <Landmark size={14} /> Impuestos (configuración global)
            </div>
            <div className="panel__subtitle">
              Catálogo del tenant; solo el administrador global puede cambiar tasas.
            </div>
          </div>
          {puedeGlobal ? (
            <div className="ajustes-botones">
              <Button
                variant="ghost"
                className="text-action"
                onClick={() =>
                  setImpuestos((actual) => [
                    ...actual,
                    { id: `imp-${actual.length + 1}`, nombre: "Nuevo impuesto", tasaBps: 0, tipo: "adicionado", activo: false },
                  ])
                }
              >
                <Plus size={13} /> Agregar
              </Button>
              <Button variant="primary" onClick={() => setConfirmarImpuestos(true)}>
                <Save size={14} /> Guardar impuestos
              </Button>
            </div>
          ) : (
            <span className="ajustes-nota">Solo lectura: requiere permiso ajustes.global</span>
          )}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Impuesto</th>
                <th>Tasa</th>
                <th>Tipo</th>
                <th>Activo</th>
                {puedeGlobal ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {impuestos.map((impuesto, indice) => (
                <tr key={impuesto.id}>
                  <td>
                    <TextField
                      aria-label="Nombre del impuesto"
                      value={impuesto.nombre}
                      disabled={!puedeGlobal}
                      onChange={(event) =>
                        setImpuestos((actual) =>
                          actual.map((item, pos) => (pos === indice ? { ...item, nombre: event.target.value } : item)),
                        )
                      }
                    />
                  </td>
                  <td>
                    <TextField
                      aria-label="Tasa"
                      type="number"
                      min={0}
                      step="0.01"
                      value={tasaDesdeBps(impuesto.tasaBps)}
                      disabled={!puedeGlobal}
                      onChange={(event) =>
                        setImpuestos((actual) =>
                          actual.map((item, pos) =>
                            pos === indice
                              ? { ...item, tasaBps: Math.round((Number(event.target.value) || 0) * 100) }
                              : item,
                          ),
                        )
                      }
                    />
                  </td>
                  <td>
                    <SelectField
                      aria-label="Tipo de impuesto"
                      options={Object.entries(TIPO_IMPUESTO_LABEL).map(([value, label]) => ({ value, label }))}
                      value={impuesto.tipo}
                      disabled={!puedeGlobal}
                      onChange={(event) =>
                        setImpuestos((actual) =>
                          actual.map((item, pos) =>
                            pos === indice ? { ...item, tipo: event.target.value as Impuesto["tipo"] } : item,
                          ),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={impuesto.activo}
                      disabled={!puedeGlobal}
                      aria-label={`Activar ${impuesto.nombre}`}
                      onChange={(event) =>
                        setImpuestos((actual) =>
                          actual.map((item, pos) => (pos === indice ? { ...item, activo: event.target.checked } : item)),
                        )
                      }
                    />
                  </td>
                  {puedeGlobal ? (
                    <td>
                      <Button
                        variant="ghost"
                        className="text-action"
                        onClick={() => setImpuestos((actual) => actual.filter((_, pos) => pos !== indice))}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={confirmarDatos}
        title="Guardar datos de la sucursal"
        description="Los cambios quedan auditados con antes/después."
        impacto={
          monedaCambia
            ? "Hay turno abierto con pagos: el cambio de moneda aplica solo a operaciones nuevas y requiere esta confirmación."
            : preview.map((cambio) => `${cambio.area}: ${cambio.antes} → ${cambio.despues}`).join("; ")
        }
        confirmLabel="Guardar cambios"
        onCancel={() => setConfirmarDatos(false)}
        onConfirm={(motivo) => {
          setConfirmarDatos(false)
          actualizar.mutate(
            { sucursal: datos, motivo, confirmarTurnoAbierto: monedaCambia },
            {
              onSuccess: () => mostrar("Datos de la sucursal actualizados y auditados", "exito"),
              onError: (error) => mostrar(mensajeError(error), "error"),
            },
          )
        }}
      />

      <ConfirmDialog
        open={confirmarHorarios}
        title="Guardar horarios de atención"
        description="La web y el APK usan el horario vigente al momento de operar."
        impacto={`${horariosFinales.length} franjas configuradas; las franjas vacías quedan cerradas.`}
        confirmLabel="Guardar horarios"
        onCancel={() => setConfirmarHorarios(false)}
        onConfirm={(motivo) => {
          setConfirmarHorarios(false)
          guardarHorarios.mutate(
            { horarios: horariosFinales, motivo },
            {
              onSuccess: () => mostrar("Horarios actualizados; las interfaces los toman al operar", "exito"),
              onError: (error) => mostrar(mensajeError(error), "error"),
            },
          )
        }}
      />

      <ConfirmDialog
        open={confirmarImpuestos}
        title="Guardar catálogo de impuestos"
        description="Los impuestos rigen la operación de todas las sedes del tenant."
        impacto="Los cambios aplican a operaciones nuevas; los documentos ya emitidos no se reescriben."
        confirmLabel="Guardar impuestos"
        onCancel={() => setConfirmarImpuestos(false)}
        onConfirm={(motivo) => {
          setConfirmarImpuestos(false)
          actualizar.mutate(
            { sucursal: {}, impuestos, motivo },
            {
              onSuccess: () => mostrar("Impuestos actualizados y auditados", "exito"),
              onError: (error) => mostrar(mensajeError(error), "error"),
            },
          )
        }}
      />
    </div>
  )
}
