/**
 * Impresoras y rutas (RF-R5-31, plan 07 §3): CRUD de impresoras y matriz
 * impresora × documento × copias (1–5) por sede. Señala documentos sin
 * impresora activa y copias fuera de rango.
 */

import { useEffect, useState } from "react"
import { AlertTriangle, Check, Plus, Save } from "lucide-react"
import { useSede } from "@/app/sede"
import { useAuth } from "@/app/auth"
import { Button } from "@/components/ui/Button"
import { DataTable, type Column } from "@/components/data/DataTable"
import { Drawer } from "@/components/ui/Drawer"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SelectField, TextField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { formatRelative } from "@/lib/format"
import { useGuardarImpresora, useImpresoras, useRutas, useGuardarRutas } from "@/modules/estaciones/api"
import {
  CONEXION_LABEL,
  DOCUMENTOS,
  DOCUMENTO_LABEL,
  TRABAJO_ESTADO_LABEL,
  type DocumentoImpresion,
  type Impresora,
  type ImpresoraConexion,
  type RutaImpresion,
} from "@/modules/estaciones/types"

function estadoTone(estado: Impresora["ultimosTrabajos"][number]["estado"] | undefined) {
  if (estado === "impreso") return "green" as const
  if (estado === "fallido") return "amber" as const
  return "gray" as const
}

export function PrinterRoutes({ sucursalId }: { sucursalId: string }) {
  const { sedes } = useSede()
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const impresoras = useImpresoras(sucursalId || undefined)
  const guardarImpresora = useGuardarImpresora()
  const rutasQuery = useRutas(sucursalId)
  const guardarRutas = useGuardarRutas()

  const [editar, setEditar] = useState<Impresora | null | "nueva">(null)
  const [draft, setDraft] = useState({
    nombre: "",
    sucursalId,
    tipoConexion: "red" as ImpresoraConexion,
    direccion: "",
    perfil: "ESC/POS TM-T20III",
    activa: true,
  })
  const [rutas, setRutas] = useState<RutaImpresion[]>([])

  const puedeEditar = tienePermiso("impresoras.editar")
  const lista = impresoras.data ?? []

  useEffect(() => {
    if (!editar) return
    if (editar === "nueva") {
      setDraft({ nombre: "", sucursalId, tipoConexion: "red", direccion: "", perfil: "ESC/POS TM-T20III", activa: true })
    } else {
      setDraft({
        nombre: editar.nombre,
        sucursalId: editar.sucursalId,
        tipoConexion: editar.tipoConexion,
        direccion: editar.direccion,
        perfil: editar.perfil,
        activa: editar.activa,
      })
    }
  }, [editar, sucursalId])

  useEffect(() => {
    if (rutasQuery.data) setRutas(rutasQuery.data.rutas)
  }, [rutasQuery.data])

  const actualizarRuta = (documento: DocumentoImpresion, cambios: Partial<RutaImpresion>) =>
    setRutas((actual) => actual.map((ruta) => (ruta.documento === documento ? { ...ruta, ...cambios } : ruta)))

  const guardarRuta = () => {
    const invalida = rutas.find((ruta) => ruta.copias < 1 || ruta.copias > 5)
    if (invalida) {
      mostrar(`Las copias de ${DOCUMENTO_LABEL[invalida.documento]} deben estar entre 1 y 5.`, "error")
      return
    }
    guardarRutas.mutate(
      { sucursalId, rutas },
      {
        onSuccess: () => mostrar("Matriz de impresión guardada. Al imprimir se respetan documento y copias.", "exito"),
        onError: (error) => mostrar(error instanceof Error ? error.message : "No se pudo guardar la matriz.", "error"),
      },
    )
  }

  const guardar = () => {
    if (draft.nombre.trim().length < 2 || draft.direccion.trim().length < 2) {
      mostrar("Nombre y dirección son obligatorios.", "error")
      return
    }
    guardarImpresora.mutate(
      { ...draft, id: editar && editar !== "nueva" ? editar.id : undefined, version: editar && editar !== "nueva" ? editar.version : undefined },
      {
        onSuccess: () => {
          mostrar(editar === "nueva" ? "Impresora creada." : "Impresora actualizada.", "exito")
          setEditar(null)
        },
        onError: (error) => mostrar(error instanceof Error ? error.message : "No se pudo guardar la impresora.", "error"),
      },
    )
  }

  const columnas: Column<Impresora>[] = [
    {
      key: "nombre",
      header: "Impresora",
      cell: (row) => (
        <>
          <span className="order-id">{row.nombre}</span>
          <span className="order-type">{CONEXION_LABEL[row.tipoConexion]} · {row.direccion}</span>
        </>
      ),
    },
    { key: "perfil", header: "Perfil ESC/POS", cell: (row) => row.perfil },
    {
      key: "estado",
      header: "Estado",
      cell: (row) => (
        <StatusBadge tone={row.activa ? "green" : "gray"}>{row.activa ? "activa" : "inactiva"}</StatusBadge>
      ),
    },
    {
      key: "ultimo",
      header: "Último trabajo",
      cell: (row) => {
        const trabajo = row.ultimosTrabajos[0]
        if (!trabajo) return "Sin trabajos"
        return (
          <>
            <StatusBadge tone={estadoTone(trabajo.estado)}>{TRABAJO_ESTADO_LABEL[trabajo.estado]}</StatusBadge>
            <span className="order-type"> {DOCUMENTO_LABEL[trabajo.documento]} · {formatRelative(trabajo.creadoEn)}</span>
          </>
        )
      },
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      cell: (row) => (
        <Button variant="ghost" className="text-action" onClick={() => setEditar(row)}>
          Editar
        </Button>
      ),
    },
  ]

  const impresorasSede = lista.filter((impresora) => impresora.sucursalId === sucursalId)

  return (
    <div className="est-impresoras">
      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Impresoras de la sede</div>
            <div className="panel__subtitle">
              La impresora inactiva se señala en la matriz; los trabajos fallidos quedan visibles en Diagnóstico.
            </div>
          </div>
          <Button
            variant="primary"
            disabled={!puedeEditar}
            title={puedeEditar ? undefined : "Requiere permiso de impresoras.editar"}
            onClick={() => setEditar("nueva")}
          >
            <Plus size={15} /> Nueva impresora
          </Button>
        </div>
        <DataTable
          columns={columnas}
          rows={impresorasSede}
          getRowKey={(row) => row.id}
          loading={impresoras.isLoading}
          error={impresoras.isError ? (impresoras.error as Error) : null}
          onRetry={() => void impresoras.refetch()}
          emptyTitle="Aún no hay impresoras en esta sede"
          emptyDescription="Crea la primera impresora y define su ruta por documento."
        />
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Matriz impresora × documento × copias</div>
            <div className="panel__subtitle">
              Comanda, precuenta, recibo y factura. Copias de 1 a 5; los documentos sin impresora activa se señalan.
            </div>
          </div>
          <Button variant="primary" disabled={guardarRutas.isPending || !puedeEditar} onClick={guardarRuta}>
            <Save size={15} /> {guardarRutas.isPending ? "Guardando…" : "Guardar matriz"}
          </Button>
        </div>

        {rutasQuery.isLoading ? (
          <div className="skeleton-rows">
            <div className="skeleton-rows__row"><span className="skeleton" style={{ width: "100%", height: 18 }} /></div>
            <div className="skeleton-rows__row"><span className="skeleton" style={{ width: "100%", height: 18 }} /></div>
          </div>
        ) : rutasQuery.isError ? (
          <div className="state-block state-block--error">
            <strong>No pudimos cargar la matriz</strong>
            <Button variant="secondary" onClick={() => void rutasQuery.refetch()}>Reintentar</Button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Impresora</th>
                  <th>Copias (1–5)</th>
                  <th>Diagnóstico</th>
                </tr>
              </thead>
              <tbody>
                {rutas.map((ruta) => {
                  const impresora = impresorasSede.find((item) => item.id === ruta.impresoraId)
                  const sinImpresora = !ruta.impresoraId
                  const inactiva = impresora ? !impresora.activa : false
                  return (
                    <tr key={ruta.documento}>
                      <td>
                        <strong>{DOCUMENTO_LABEL[ruta.documento]}</strong>
                      </td>
                      <td>
                        <SelectField
                          label=""
                          options={impresorasSede.map((item) => ({
                            value: item.id,
                            label: `${item.nombre}${item.activa ? "" : " (inactiva)"}`,
                          }))}
                          placeholder="Sin impresora"
                          value={ruta.impresoraId ?? ""}
                          onChange={(event) => actualizarRuta(ruta.documento, { impresoraId: event.target.value || null })}
                        />
                      </td>
                      <td>
                        <TextField
                          label=""
                          type="number"
                          min={1}
                          max={5}
                          value={ruta.copias}
                          className="est-copias"
                          onChange={(event) => actualizarRuta(ruta.documento, { copias: Number(event.target.value) })}
                        />
                      </td>
                      <td>
                        {sinImpresora ? (
                          <span className="est-aviso">
                            <AlertTriangle size={13} /> Sin impresora: el trabajo se encola y genera alerta.
                          </span>
                        ) : inactiva ? (
                          <span className="est-aviso">
                            <AlertTriangle size={13} /> La impresora está inactiva: los trabajos fallarán.
                          </span>
                        ) : (
                          <span className="est-ok">
                            <Check size={13} /> Listo
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Drawer
        open={editar !== null}
        onClose={() => setEditar(null)}
        title={editar === "nueva" ? "Nueva impresora" : "Editar impresora"}
        subtitle="La dirección depende del tipo de conexión (IP:puerto, ruta USB o dirección Bluetooth)."
        width={560}
        footer={
          <>
            <span className="product-form__paso">Sede: {sedes.find((sede) => sede.id === draft.sucursalId)?.nombre ?? sucursalId}</span>
            <div className="product-form__footer-actions">
              <Button variant="secondary" onClick={() => setEditar(null)}>
                Cancelar
              </Button>
              <Button variant="primary" disabled={guardarImpresora.isPending || !puedeEditar} onClick={guardar}>
                <Save size={15} /> Guardar impresora
              </Button>
            </div>
          </>
        }
      >
        <div className="form-grid">
          <TextField label="Nombre" value={draft.nombre} onChange={(event) => setDraft((actual) => ({ ...actual, nombre: event.target.value }))} />
          <SelectField
            label="Tipo de conexión"
            options={Object.entries(CONEXION_LABEL).map(([value, label]) => ({ value, label }))}
            value={draft.tipoConexion}
            onChange={(event) => setDraft((actual) => ({ ...actual, tipoConexion: event.target.value as ImpresoraConexion }))}
          />
          <TextField
            label="Dirección"
            value={draft.direccion}
            placeholder={draft.tipoConexion === "red" ? "192.168.1.50:9100" : draft.tipoConexion === "usb" ? "/dev/usb/lp0" : "00:11:22:33:44:55"}
            onChange={(event) => setDraft((actual) => ({ ...actual, direccion: event.target.value }))}
          />
          <TextField label="Perfil ESC/POS" value={draft.perfil} onChange={(event) => setDraft((actual) => ({ ...actual, perfil: event.target.value }))} />
          <label className="check-inline">
            <input type="checkbox" checked={draft.activa} onChange={(event) => setDraft((actual) => ({ ...actual, activa: event.target.checked }))} />
            Impresora activa
          </label>
        </div>
      </Drawer>
    </div>
  )
}
