/**
 * Formulario de estación (RF-R5-30, plan 07 §3): nombre, tipo, sucursal, activa,
 * SLA objetivo, modo de paso a lista (V1) y asignación masiva de productos con
 * aviso de los que quedan sin estación («no genera comanda»).
 */

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Check, Save, Search } from "lucide-react"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Drawer } from "@/components/ui/Drawer"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SelectField, TextField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { useGuardarEstacion, useProductosAsignables } from "@/modules/estaciones/api"
import {
  ESTACION_TIPO_LABEL,
  PASO_LISTA_LABEL,
  SLA_MAX_SEG,
  SLA_MIN_SEG,
  type Estacion,
  type EstacionTipo,
  type PasoLista,
} from "@/modules/estaciones/types"

export function StationForm({
  abierto,
  estacion,
  sucursalPorDefecto,
  onCerrar,
  onGuardado,
}: {
  abierto: boolean
  estacion: Estacion | null
  sucursalPorDefecto: string
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}) {
  const { sedes } = useSede()
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const productos = useProductosAsignables()
  const guardar = useGuardarEstacion()

  const [nombre, setNombre] = useState("")
  const [tipo, setTipo] = useState<EstacionTipo>("preparacion")
  const [sucursalId, setSucursalId] = useState(sucursalPorDefecto)
  const [activa, setActiva] = useState(true)
  const [sla, setSla] = useState("")
  const [pasoLista, setPasoLista] = useState<PasoLista>("automatico")
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [confirmarPendientes, setConfirmarPendientes] = useState(false)

  const puedeEditar = tienePermiso("estaciones.editar")
  const puedePasoLista = tienePermiso("estaciones.paso_lista")

  useEffect(() => {
    if (!abierto) return
    setNombre(estacion?.nombre ?? "")
    setTipo(estacion?.tipo ?? "preparacion")
    setSucursalId(estacion?.sucursalId ?? sucursalPorDefecto)
    setActiva(estacion?.activa ?? true)
    setSla(estacion?.slaObjetivoSeg ? String(estacion.slaObjetivoSeg) : "")
    setPasoLista(estacion?.pasoLista ?? "automatico")
    setSeleccion(estacion?.productoIds ?? [])
    setBusqueda("")
    setConfirmarPendientes(false)
  }, [abierto, estacion, sucursalPorDefecto])

  const lista = productos.data?.data ?? []
  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return lista
    return lista.filter(
      (producto) => producto.nombre.toLowerCase().includes(texto) || producto.sku.toLowerCase().includes(texto),
    )
  }, [lista, busqueda])

  const pendientes = useMemo(
    () => lista.filter((producto) => producto.activo && !producto.estacionId && !seleccion.includes(producto.id)),
    [lista, seleccion],
  )

  const alternar = (productoId: string) =>
    setSeleccion((actual) =>
      actual.includes(productoId) ? actual.filter((item) => item !== productoId) : [...actual, productoId],
    )

  const error = (): string | null => {
    if (nombre.trim().length < 2) return "El nombre de la estación es obligatorio."
    if (!sucursalId) return "Selecciona la sucursal."
    if (sla.trim() !== "") {
      const segundos = Number(sla)
      if (!Number.isFinite(segundos) || segundos < SLA_MIN_SEG || segundos > SLA_MAX_SEG) {
        return `El SLA objetivo debe estar entre ${SLA_MIN_SEG} y ${SLA_MAX_SEG} segundos.`
      }
    }
    return null
  }

  const guardarCon = () => {
    guardar.mutate(
      {
        id: estacion?.id,
        nombre: nombre.trim(),
        tipo,
        sucursalId,
        activa,
        slaObjetivoSeg: sla.trim() === "" ? null : Number(sla),
        pasoLista,
        productoIds: seleccion,
        version: estacion?.version,
      },
      {
        onSuccess: () => onGuardado(estacion ? "Estación actualizada." : "Estación creada."),
        onError: (fallo) => mostrar(fallo instanceof Error ? fallo.message : "No se pudo guardar la estación.", "error"),
      },
    )
  }

  const intentarGuardar = () => {
    const problema = error()
    if (problema) {
      mostrar(problema, "error")
      return
    }
    if (pendientes.length > 0) {
      setConfirmarPendientes(true)
      return
    }
    guardarCon()
  }

  return (
    <>
      <Drawer
        open={abierto}
        onClose={onCerrar}
        title={estacion ? `Editar ${estacion.nombre}` : "Nueva estación"}
        subtitle="Las comandas se enrutan a la estación del producto; cambiar la estación no altera comandas ya creadas."
        width={760}
        footer={
          <>
            <span className="product-form__paso">
              {seleccion.length} producto(s) · {pendientes.length} sin estación
            </span>
            <div className="product-form__footer-actions">
              <Button variant="secondary" onClick={onCerrar}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                disabled={guardar.isPending || !puedeEditar}
                title={puedeEditar ? undefined : "Requiere permiso de estaciones.editar"}
                onClick={intentarGuardar}
              >
                <Save size={15} /> {guardar.isPending ? "Guardando…" : "Guardar estación"}
              </Button>
            </div>
          </>
        }
      >
        <div className="form-grid">
          <TextField label="Nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} />
          <SelectField
            label="Tipo"
            options={Object.entries(ESTACION_TIPO_LABEL).map(([value, label]) => ({ value, label }))}
            value={tipo}
            onChange={(event) => setTipo(event.target.value as EstacionTipo)}
          />
          <SelectField
            label="Sucursal"
            options={sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))}
            placeholder="Selecciona la sede"
            value={sucursalId}
            onChange={(event) => setSucursalId(event.target.value)}
          />
          <TextField
            label="SLA objetivo (segundos)"
            type="number"
            min={SLA_MIN_SEG}
            max={SLA_MAX_SEG}
            value={sla}
            hint={`${SLA_MIN_SEG}–${SLA_MAX_SEG} s; alimenta alertas del KDS`}
            onChange={(event) => setSla(event.target.value)}
          />
          <SelectField
            label="Paso a «lista» (V1)"
            options={Object.entries(PASO_LISTA_LABEL).map(([value, label]) => ({ value, label }))}
            value={pasoLista}
            disabled={!puedePasoLista}
            title={puedePasoLista ? undefined : "Requiere permiso de estaciones.paso_lista"}
            onChange={(event) => setPasoLista(event.target.value as PasoLista)}
          />
          <label className="check-inline">
            <input type="checkbox" checked={activa} onChange={(event) => setActiva(event.target.checked)} />
            Estación activa
          </label>
        </div>

        <div className="product-form__seccion">
          <div className="product-form__seccion-head">
            <div>
              <div className="panel__title">Productos asignados</div>
              <div className="panel__subtitle">
                Un producto sin estación no genera comanda y queda listado como pendiente (RF-R5-30).
              </div>
            </div>
            <div className="picker-busqueda">
              <Search size={14} />
              <input
                className="input"
                placeholder="Buscar producto o SKU"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
              />
            </div>
          </div>

          {productos.isLoading ? (
            <div className="skeleton-rows">
              <div className="skeleton-rows__row"><span className="skeleton" style={{ width: "90%", height: 14 }} /></div>
              <div className="skeleton-rows__row"><span className="skeleton" style={{ width: "80%", height: 14 }} /></div>
            </div>
          ) : productos.isError ? (
            <div className="state-block state-block--error">
              <strong>No pudimos cargar los productos</strong>
              <Button variant="secondary" onClick={() => void productos.refetch()}>Reintentar</Button>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="state-block">
              <strong>Sin coincidencias</strong>
              <p>Ajusta la búsqueda para asignar productos a esta estación.</p>
            </div>
          ) : (
            <div className="picker-lista">
              {filtrados.map((producto) => (
                <label className={`picker-fila ${seleccion.includes(producto.id) ? "picker-fila--activa" : ""}`} key={producto.id}>
                  <input type="checkbox" checked={seleccion.includes(producto.id)} onChange={() => alternar(producto.id)} />
                  <span className="picker-fila__nombre">
                    {producto.nombre}
                    <small className="order-type">{producto.sku} · {producto.categoriaNombre}</small>
                  </span>
                  {producto.estacionNombre ? (
                    producto.estacionNombre === estacion?.nombre ? (
                      <StatusBadge tone="green">en esta estación</StatusBadge>
                    ) : (
                      <StatusBadge tone="gray" title="Se moverá desde su estación actual">
                        {producto.estacionNombre}
                      </StatusBadge>
                    )
                  ) : (
                    <StatusBadge tone="amber">sin estación</StatusBadge>
                  )}
                </label>
              ))}
            </div>
          )}

          {pendientes.length > 0 ? (
            <div className="notice notice--warn">
              <AlertTriangle size={15} />
              <span>
                {pendientes.length} producto(s) activo(s) quedarán <strong>sin estación</strong>: no generarán comanda.
                Quedan listados en el aviso del módulo y en el catálogo.
              </span>
            </div>
          ) : (
            <div className="notice notice--ok">
              <Check size={15} /> Todos los productos activos tienen estación asignada.
            </div>
          )}
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmarPendientes}
        title="Guardar con productos sin estación"
        description="Los productos marcados no generarán comanda en la cocina (RF-R5-30)."
        impacto={`${pendientes.length} producto(s) quedarán sin estación: ${pendientes
          .slice(0, 3)
          .map((producto) => producto.nombre)
          .join(", ")}${pendientes.length > 3 ? "…" : ""}`}
        motivoLabel="Nota (opcional)"
        motivoObligatorio={false}
        confirmLabel="Guardar de todos modos"
        onCancel={() => setConfirmarPendientes(false)}
        onConfirm={() => {
          setConfirmarPendientes(false)
          guardarCon()
        }}
      />
    </>
  )
}
