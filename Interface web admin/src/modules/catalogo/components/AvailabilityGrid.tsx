/**
 * Grid de disponibilidad (RF-R5-11, plan 06 §3): filas = producto, columnas =
 * sede × franja. Cada celda muestra estado, origen y vigencia; el agotado se
 * propaga a web, APK y KDS. Acciones individuales y masivas con motivo
 * (origen `backoffice`), programación V2 deshabilitada.
 */

import { useMemo, useState } from "react"
import { Ban, RefreshCw } from "lucide-react"
import { useSede } from "@/app/sede"
import { useAuth } from "@/app/auth"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { FilterBar } from "@/components/data/FilterBar"
import { SelectField, TextField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { formatRelative } from "@/lib/format"
import { useCambiarDisponibilidad, useDisponibilidad } from "@/modules/catalogo/api"
import {
  FRANJAS,
  FRANJA_LABEL,
  type Disponibilidad,
  type DisponibilidadFranja,
} from "@/modules/catalogo/types"

type Celda = {
  productoId: string
  productoNombre: string
  sucursalId: string
  franja: DisponibilidadFranja
  registro: Disponibilidad | undefined
}

export function AvailabilityGrid() {
  const { sedes, zonaHoraria } = useSede()
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const cambiar = useCambiarDisponibilidad()

  const [sucursalFiltro, setSucursalFiltro] = useState("")
  const [franjaFiltro, setFranjaFiltro] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [soloAgotados, setSoloAgotados] = useState(false)
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [accion, setAccion] = useState<null | { tipo: "agotar" | "reactivar"; celdas: Celda[] }>(null)

  const puedeDisponibilidad = tienePermiso("catalogo.disponibilidad")

  const { data, isLoading, isError, refetch } = useDisponibilidad({
    sucursalId: sucursalFiltro || undefined,
    q: busqueda || undefined,
    soloAgotados,
  })

  const sedesVisibles = sucursalFiltro ? sedes.filter((sede) => sede.id === sucursalFiltro) : sedes
  const franjasVisibles = franjaFiltro
    ? FRANJAS.filter((franja) => franja.id === franjaFiltro)
    : FRANJAS

  const filas = data?.data ?? []

  const productos = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const fila of filas) {
      if (!mapa.has(fila.productoId)) mapa.set(fila.productoId, fila.productoId)
    }
    return [...mapa.keys()]
  }, [filas])

  const celda = (productoId: string, sucursalId: string, franja: DisponibilidadFranja): Disponibilidad | undefined =>
    filas.find(
      (fila) =>
        fila.productoId === productoId &&
        fila.sucursalId === sucursalId &&
        fila.franja === (franja === "todo_el_dia" ? null : franja),
    )

  const nombreProducto = (productoId: string) =>
    filas.find((fila) => fila.productoId === productoId)?.productoNombre ?? productoId

  const skuProducto = (productoId: string) =>
    filas.find((fila) => fila.productoId === productoId)?.sku ?? ""

  if (isError) {
    return <div className="state-block state-block--error"><strong>No pudimos cargar la disponibilidad</strong><p>Revisa tu conexión e inténtalo de nuevo.</p><Button variant="secondary" onClick={() => void refetch()}>Reintentar</Button></div>
  }

  if (isLoading || !data) {
    return <div className="skeleton-rows"><div className="skeleton-rows__row"><span className="skeleton" style={{ width: "100%", height: 220 }} /></div></div>
  }

  if (filas.length === 0) {
    return (
      <div className="state-block">
        <strong>Sin productos para mostrar</strong>
        <p>Ajusta la búsqueda o los filtros de sede y franja.</p>
      </div>
    )
  }

  const abrirAccion = (tipo: "agotar" | "reactivar", celdas: Celda[]) => setAccion({ tipo, celdas })

  const ejecutar = (motivo: string) => {
    if (!accion) return
    const porClave = new Map<string, Celda[]>()
    for (const item of accion.celdas) {
      const clave = `${item.sucursalId}|${item.franja}`
      porClave.set(clave, [...(porClave.get(clave) ?? []), item])
    }
    const promesas = [...porClave.entries()].map(([clave, celdas]) => {
      const [sucursalId, franja] = clave.split("|") as [string, DisponibilidadFranja]
      return cambiar.mutateAsync({
        productoIds: celdas.map((item) => item.productoId),
        sucursalId,
        franja,
        agotado: accion.tipo === "agotar",
        origen: "backoffice",
        origenDetalle: "Panel · gerente de sede",
        motivo,
      })
    })
    Promise.all(promesas)
      .then(() => {
        mostrar(
          accion.tipo === "agotar"
            ? "Agotado propagado a web, APK y KDS con origen y vigencia."
            : "Reactivado: web, APK y KDS vuelven a mostrarlo disponible.",
          "exito",
        )
        setSeleccion([])
        setAccion(null)
      })
      .catch(() => {
        mostrar("No se pudo aplicar el cambio de disponibilidad.", "error")
      })
  }

  const alternarSeleccion = (productoId: string) =>
    setSeleccion((actual) =>
      actual.includes(productoId) ? actual.filter((item) => item !== productoId) : [...actual, productoId],
    )

  const celdasSeleccionadas = (): Celda[] => {
    const resultado: Celda[] = []
    for (const productoId of seleccion) {
      for (const sede of sedesVisibles) {
        for (const franja of franjasVisibles) {
          resultado.push({
            productoId,
            productoNombre: productoId,
            sucursalId: sede.id,
            franja: franja.id,
            registro: celda(productoId, sede.id, franja.id),
          })
        }
      }
    }
    return resultado
  }

  const impacto = accion
    ? `${accion.celdas.length} celda(s): ${[...new Set(accion.celdas.map((item) => sedes.find((sede) => sede.id === item.sucursalId)?.nombre ?? item.sucursalId))].join(", ")}`
    : undefined

  return (
    <div>
      <div className="module-notice">
        <strong>Propagación activa:</strong>
        <span>
          Un agotado se refleja en web, APK y KDS con su origen y vigencia (RF-R5-11). Cambiar aquí no altera pedidos ya
          creados.
        </span>
      </div>

      <FilterBar
        activeFilters={[
          ...(soloAgotados ? [{ key: "agotados", label: "Solo agotados" }] : []),
          ...(franjaFiltro
            ? [{ key: "franja", label: `Franja: ${FRANJA_LABEL[franjaFiltro as DisponibilidadFranja]}` }]
            : []),
        ]}
        onClear={() => {
          setSoloAgotados(false)
          setFranjaFiltro("")
          setSucursalFiltro("")
          setBusqueda("")
        }}
        actions={
          <Button
            variant="ghost"
            className="text-action"
            disabled
            title="La programación de vigencia llega en V2 (RF-R5-15)"
          >
            Programar cambio (V2)
          </Button>
        }
      >
        <SelectField
          label="Sede"
          options={[{ value: "", label: "Todas las sedes" }, ...sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))]}
          value={sucursalFiltro}
          onChange={(event) => setSucursalFiltro(event.target.value)}
        />
        <SelectField
          label="Franja"
          options={[{ value: "", label: "Todas las franjas" }, ...FRANJAS.map((franja) => ({ value: franja.id, label: franja.label }))]}
          value={franjaFiltro}
          onChange={(event) => setFranjaFiltro(event.target.value)}
        />
        <TextField
          label="Buscar"
          placeholder="Producto o SKU"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />
        <Button
          variant="ghost"
          className={`filter-tab ${soloAgotados ? "filter-tab--active" : ""}`}
          onClick={() => setSoloAgotados((valor) => !valor)}
        >
          Solo agotados
        </Button>
      </FilterBar>

      {seleccion.length > 0 ? (
        <div className="bulk-bar">
          <span>
            <strong>{seleccion.length}</strong> producto(s) seleccionado(s) · {sedesVisibles.length} sede(s) ·{" "}
            {franjasVisibles.length} franja(s)
          </span>
          <div>
            <Button
              variant="secondary"
              disabled={!puedeDisponibilidad}
              title={puedeDisponibilidad ? undefined : "Requiere permiso de catalogo.disponibilidad"}
              onClick={() => abrirAccion("agotar", celdasSeleccionadas())}
            >
              <Ban size={15} /> Agotar selección
            </Button>
            <Button
              variant="secondary"
              disabled={!puedeDisponibilidad}
              title={puedeDisponibilidad ? undefined : "Requiere permiso de catalogo.disponibilidad"}
              onClick={() => abrirAccion("reactivar", celdasSeleccionadas())}
            >
              <RefreshCw size={15} /> Reactivar selección
            </Button>
            <Button variant="ghost" className="text-action" onClick={() => setSeleccion([])}>
              Limpiar
            </Button>
          </div>
        </div>
      ) : null}

      <section className="panel availability">
        <div className="table-wrap availability__scroll">
          <table className="availability__tabla">
            <thead>
              <tr>
                <th rowSpan={2} className="availability__producto">
                  Producto
                </th>
                {sedesVisibles.map((sede) => (
                  <th key={sede.id} colSpan={franjasVisibles.length} className="availability__sede">
                    {sede.nombre}
                  </th>
                ))}
              </tr>
              <tr>
                {sedesVisibles.flatMap((sede) =>
                  franjasVisibles.map((franja) => (
                    <th key={`${sede.id}-${franja.id}`} className="availability__franja">
                      {franja.label}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {productos.map((productoId) => (
                <tr key={productoId}>
                  <td className="availability__producto">
                    <label className="check-inline">
                      <input
                        type="checkbox"
                        checked={seleccion.includes(productoId)}
                        onChange={() => alternarSeleccion(productoId)}
                      />
                      <span>
                        {nombreProducto(productoId)}
                        <small className="order-type">{skuProducto(productoId)}</small>
                      </span>
                    </label>
                  </td>
                  {sedesVisibles.flatMap((sede) =>
                    franjasVisibles.map((franja) => {
                      const registro = celda(productoId, sede.id, franja.id)
                      const agotado = Boolean(registro?.agotado)
                      const detalle = agotado
                        ? `${registro?.agotadoOrigenDetalle ?? "Panel"} · ${registro?.actualizadoEn ? formatRelative(registro.actualizadoEn) : "vigente"} · ${registro?.motivo ?? "sin motivo"}`
                        : "Disponible en web, APK y KDS"
                      return (
                        <td key={`${productoId}-${sede.id}-${franja.id}`}>
                          <button
                            type="button"
                            className={`disp-cell ${agotado ? "disp-cell--agotado" : "disp-cell--ok"}`}
                            title={`${detalle}${registro?.actualizadoEn ? ` · vigencia ${new Date(registro.actualizadoEn).toLocaleString("es-MX", { timeZone: zonaHoraria })}` : ""}`}
                            disabled={!puedeDisponibilidad}
                            onClick={() =>
                              abrirAccion(agotado ? "reactivar" : "agotar", [
                                { productoId, productoNombre: nombreProducto(productoId), sucursalId: sede.id, franja: franja.id, registro },
                              ])
                            }
                          >
                            <span className="disp-cell__dot" />
                            <span className="disp-cell__texto">{agotado ? "Agotado" : "Disponible"}</span>
                            {agotado ? <small>{registro?.agotadoOrigenDetalle ?? "Panel"}</small> : null}
                            {agotado && registro?.actualizadoEn ? <small>{formatRelative(registro.actualizadoEn)}</small> : null}
                          </button>
                        </td>
                      )
                    }),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel__footer">
          <span>
            {data.agotados} celda(s) agotada(s) · {data.productos} producto(s). Origen y vigencia visibles en cada celda.
          </span>
        </div>
      </section>

      <ConfirmDialog
        open={accion !== null}
        title={accion?.tipo === "agotar" ? "Agotar disponibilidad" : "Reactivar disponibilidad"}
        description={
          accion?.tipo === "agotar"
            ? "El producto dejará de ofrecerse en web, APK y KDS en las celdas seleccionadas."
            : "El producto volverá a ofrecerse en web, APK y KDS en las celdas seleccionadas."
        }
        impacto={impacto}
        confirmLabel={accion?.tipo === "agotar" ? "Agotar" : "Reactivar"}
        onCancel={() => setAccion(null)}
        onConfirm={(motivo) => ejecutar(motivo)}
      />
    </div>
  )
}
