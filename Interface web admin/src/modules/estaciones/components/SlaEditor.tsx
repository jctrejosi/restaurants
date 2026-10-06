/**
 * Editor de SLA (RF-R5-32, plan 07 §3): objetivo en segundos por estación y por
 * producto, con validación de rangos y avisos de malas configuraciones.
 * Si coexisten SLA de producto y de estación, prevalece el de producto.
 */

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Check, Save } from "lucide-react"
import { useSede } from "@/app/sede"
import { useAuth } from "@/app/auth"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { TextField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { formatDuration } from "@/lib/format"
import { useEstaciones, useGuardarSla, useProductosAsignables, useSla } from "@/modules/estaciones/api"
import { SLA_AVISO_SEG, SLA_MAX_SEG, SLA_MIN_SEG, slaFueraDeRango, type SlaAmbito } from "@/modules/estaciones/types"

export function SlaEditor() {
  const { sedes } = useSede()
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const sla = useSla()
  const estaciones = useEstaciones()
  const productos = useProductosAsignables()
  const guardar = useGuardarSla()

  const [ediciones, setEdiciones] = useState<Record<string, string>>({})

  useEffect(() => {
    setEdiciones({})
  }, [sla.data])

  const puedeEditar = tienePermiso("sla.editar")

  const regla = (ambito: SlaAmbito, refId: string) =>
    sla.data?.reglas.find((item) => item.ambito === ambito && item.refId === refId)

  const productosConEstacion = useMemo(
    () => (productos.data?.data ?? []).filter((producto) => Boolean(producto.estacionNombre)),
    [productos.data],
  )
  const productosSinEstacion = useMemo(
    () => (productos.data?.data ?? []).filter((producto) => !producto.estacionNombre && producto.activo),
    [productos.data],
  )

  const estacionesSinSla = (estaciones.data ?? []).filter(
    (estacion) => !regla("estacion", estacion.id) && !estacion.slaObjetivoSeg,
  )

  const clave = (ambito: SlaAmbito, refId: string) => `${ambito}:${refId}`

  const guardarFila = (ambito: SlaAmbito, refId: string, nombre: string) => {
    const valor = ediciones[clave(ambito, refId)]
    const segundos = Number(valor)
    if (slaFueraDeRango(segundos)) {
      mostrar(`El SLA debe estar entre ${SLA_MIN_SEG} y ${SLA_MAX_SEG} segundos.`, "error")
      return
    }
    guardar.mutate(
      { ambito, refId, objetivoSeg: Math.round(segundos) },
      {
        onSuccess: () => {
          mostrar(`SLA de ${nombre} guardado (${formatDuration(segundos)}).`, "exito")
          setEdiciones((actual) => {
            const copia = { ...actual }
            delete copia[clave(ambito, refId)]
            return copia
          })
        },
        onError: (error) => mostrar(error instanceof Error ? error.message : "No se pudo guardar el SLA.", "error"),
      },
    )
  }

  if (sla.isError || estaciones.isError || productos.isError) {
    return (
      <div className="state-block state-block--error">
        <strong>No pudimos cargar la configuración de SLA</strong>
        <p>Revisa tu conexión e inténtalo de nuevo.</p>
        <Button
          variant="secondary"
          onClick={() => {
            void sla.refetch()
            void estaciones.refetch()
            void productos.refetch()
          }}
        >
          Reintentar
        </Button>
      </div>
    )
  }

  const cargando = sla.isLoading || estaciones.isLoading || productos.isLoading

  if (cargando) {
    return (
      <div className="skeleton-rows">
        <div className="skeleton-rows__row"><span className="skeleton" style={{ width: "100%", height: 20 }} /></div>
        <div className="skeleton-rows__row"><span className="skeleton" style={{ width: "100%", height: 20 }} /></div>
        <div className="skeleton-rows__row"><span className="skeleton" style={{ width: "100%", height: 20 }} /></div>
      </div>
    )
  }

  return (
    <div className="est-sla">
      <div className="module-notice">
        <strong>SLA vigente:</strong>
        <span>
          Alimenta las alertas del KDS y los reportes de tiempos. Se valida entre {SLA_MIN_SEG} y {SLA_MAX_SEG} s; por
          encima de {formatDuration(SLA_AVISO_SEG)} se marca como poco realista.
        </span>
      </div>

      {estacionesSinSla.length > 0 ? (
        <div className="notice notice--warn">
          <AlertTriangle size={15} />
          <span>
            {estacionesSinSla.length} estación(es) sin SLA: no generarán alerta de tiempo.{" "}
            {estacionesSinSla.map((estacion) => estacion.nombre).join(", ")}.
          </span>
        </div>
      ) : (
        <div className="notice notice--ok">
          <Check size={15} /> Todas las estaciones tienen SLA objetivo.
        </div>
      )}

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">SLA por estación</div>
            <div className="panel__subtitle">Objetivo del destino completo. Cambiarlo no altera comandas ya creadas.</div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Estación</th>
                <th>Sede</th>
                <th>Vigente</th>
                <th>Nuevo objetivo (segundos)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(estaciones.data ?? []).map((estacion) => {
                const actual = regla("estacion", estacion.id)?.objetivoSeg ?? estacion.slaObjetivoSeg
                const editado = ediciones[clave("estacion", estacion.id)] ?? (actual ? String(actual) : "")
                const segundos = Number(editado)
                const fuera = !slaFueraDeRango(segundos) && segundos > SLA_AVISO_SEG
                const cambio = editado !== (actual ? String(actual) : "")
                return (
                  <tr key={estacion.id}>
                    <td>
                      <strong>{estacion.nombre}</strong>
                      {!estacion.activa ? <StatusBadge tone="gray"> inactiva</StatusBadge> : null}
                    </td>
                    <td>{sedes.find((sede) => sede.id === estacion.sucursalId)?.nombre ?? estacion.sucursalId}</td>
                    <td>{actual ? formatDuration(actual) : <StatusBadge tone="amber">sin SLA</StatusBadge>}</td>
                    <td>
                      <TextField
                        label=""
                        type="number"
                        min={SLA_MIN_SEG}
                        max={SLA_MAX_SEG}
                        value={editado}
                        className="est-sla__input"
                        disabled={!puedeEditar}
                        onChange={(event) =>
                          setEdiciones((previo) => ({ ...previo, [clave("estacion", estacion.id)]: event.target.value }))
                        }
                      />
                      {fuera ? <span className="est-aviso">Poco realista: supera {formatDuration(SLA_AVISO_SEG)}.</span> : null}
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        className="text-action"
                        disabled={guardar.isPending || !cambio || !puedeEditar}
                        title={puedeEditar ? undefined : "Requiere permiso de sla.editar"}
                        onClick={() => guardarFila("estacion", estacion.id, estacion.nombre)}
                      >
                        <Save size={14} /> Guardar
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">SLA por producto</div>
            <div className="panel__subtitle">
              Si un producto define SLA, prevalece sobre el de su estación. Los productos sin estación no generan
              comanda (RF-R5-30).
            </div>
          </div>
        </div>
        {productosSinEstacion.length > 0 ? (
          <div className="notice notice--warn">
            <AlertTriangle size={15} />
            <span>
              {productosSinEstacion.length} producto(s) sin estación: {productosSinEstacion.map((producto) => producto.nombre).join(", ")}.
              Asígnalos en la pestaña Estaciones para que generen comanda y SLA.
            </span>
          </div>
        ) : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Estación</th>
                <th>Vigente</th>
                <th>Nuevo objetivo (segundos)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {productosConEstacion.map((producto) => {
                const actual = regla("producto", producto.id)?.objetivoSeg
                const editado = ediciones[clave("producto", producto.id)] ?? (actual ? String(actual) : "")
                const segundos = Number(editado)
                const fuera = !slaFueraDeRango(segundos) && segundos > SLA_AVISO_SEG
                const cambio = editado !== (actual ? String(actual) : "")
                return (
                  <tr key={producto.id}>
                    <td>
                      <strong>{producto.nombre}</strong>
                      <span className="order-type">{producto.sku}</span>
                    </td>
                    <td>{producto.estacionNombre}</td>
                    <td>{actual ? formatDuration(actual) : <StatusBadge tone="gray">hereda estación</StatusBadge>}</td>
                    <td>
                      <TextField
                        label=""
                        type="number"
                        min={SLA_MIN_SEG}
                        max={SLA_MAX_SEG}
                        value={editado}
                        className="est-sla__input"
                        disabled={!puedeEditar}
                        onChange={(event) =>
                          setEdiciones((previo) => ({ ...previo, [clave("producto", producto.id)]: event.target.value }))
                        }
                      />
                      {fuera ? <span className="est-aviso">Poco realista: supera {formatDuration(SLA_AVISO_SEG)}.</span> : null}
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        className="text-action"
                        disabled={guardar.isPending || !cambio || !puedeEditar}
                        onClick={() => guardarFila("producto", producto.id, producto.nombre)}
                      >
                        <Save size={14} /> Guardar
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
