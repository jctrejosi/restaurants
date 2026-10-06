/**
 * Newsletter (RF-R5-102, plan 08 §3): `SubscriberTable` con consentimiento y
 * `SendWizard` que segmenta y solo envía a contactos con consentimiento; los
 * excluidos se contabilizan y las bajas se respetan en todos los canales.
 */

import { useState } from "react"
import { ArrowRight, Ban, Check, ShieldCheck } from "lucide-react"
import { useAuth } from "@/app/auth"
import { DataTable, type Column } from "@/components/data/DataTable"
import { FilterBar } from "@/components/data/FilterBar"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SelectField, TextField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { formatDateTime, formatRelative, maskContact, maskName } from "@/lib/format"
import {
  useActualizarSuscriptor,
  useCrearEnvio,
  useEnvios,
  usePlantillas,
  useSegmentos,
  useSuscriptores,
} from "@/modules/promociones/api"
import {
  ENVIO_ESTADO_LABEL,
  type EnvioEstado,
  type Suscriptor,
} from "@/modules/promociones/types"
import type { StatusTone } from "@/components/ui/StatusBadge"

const TONO_ENVIO: Record<EnvioEstado, StatusTone> = {
  pendiente: "blue",
  enviada: "green",
  fallida: "amber",
  cancelada: "gray",
}

export function NewsletterPanel() {
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()

  const [busqueda, setBusqueda] = useState("")
  const [estado, setEstado] = useState("")
  const [plantillaId, setPlantillaId] = useState("")
  const [segmentoId, setSegmentoId] = useState("")

  const suscriptores = useSuscriptores({
    q: busqueda || undefined,
    activo: estado === "activos" ? true : undefined,
    consentimiento: estado === "consentidos" ? true : undefined,
  })
  const plantillas = usePlantillas()
  const segmentos = useSegmentos()
  const envios = useEnvios()
  const actualizar = useActualizarSuscriptor()
  const crearEnvio = useCrearEnvio()

  const puedeGestionar = tienePermiso("newsletter.enviar")
  const puedeVerPii = tienePermiso("clientes.ver_pii")
  const puedeEnviar = puedeGestionar

  const segmento = segmentos.data?.data.find((item) => item.id === segmentoId)
  const excluidos = segmento ? segmento.destinatarios - segmento.conConsentimiento : 0

  const columnas: Column<Suscriptor>[] = [
    {
      key: "correo",
      header: "Correo",
      cell: (row) => (
        <>
          <span className="order-id">{puedeVerPii ? row.correo : maskContact(row.correo)}</span>
          <span className="order-type">{row.nombre ? (puedeVerPii ? row.nombre : maskName(row.nombre)) : "Sin nombre"}</span>
        </>
      ),
    },
    {
      key: "consentimiento",
      header: "Consentimiento",
      cell: (row) =>
        row.consentimientoEn ? (
          <StatusBadge tone="green">{formatDateTime(row.consentimientoEn)}</StatusBadge>
        ) : (
          <StatusBadge tone="amber" title="Sin consentimiento no se le puede enviar newsletter">
            sin consentimiento
          </StatusBadge>
        ),
    },
    { key: "origen", header: "Origen", cell: (row) => row.origen },
    {
      key: "estado",
      header: "Estado",
      cell: (row) => <StatusBadge tone={row.activo ? "green" : "gray"}>{row.activo ? "activo" : "baja"}</StatusBadge>,
    },
    { key: "alta", header: "Alta", cell: (row) => formatRelative(row.altaEn) },
    {
      key: "acciones",
      header: "",
      align: "right",
      cell: (row) => (
        <Button
          variant="ghost"
          className="text-action"
          disabled={!puedeGestionar}
          title={puedeGestionar ? undefined : "Requiere permiso de newsletter.enviar"}
          onClick={() =>
            actualizar.mutate(
              { id: row.id, activo: !row.activo },
              {
                onSuccess: () =>
                  mostrar(
                    row.activo
                      ? "Baja registrada: se respeta en todos los canales."
                      : "Suscriptor reactivado; solo recibirá envíos si mantiene consentimiento.",
                    "exito",
                  ),
                onError: () => mostrar("No se pudo actualizar el suscriptor.", "error"),
              },
            )
          }
        >
          {row.activo ? <Ban size={14} /> : <Check size={14} />} {row.activo ? "Dar de baja" : "Reactivar"}
        </Button>
      ),
    },
  ]

  return (
    <div className="promo-newsletter">
      <div className="module-notice">
        <ShieldCheck size={15} />
        <strong>Solo con consentimiento:</strong>
        <span>
          El envío excluye a quien no tenga consentimiento registrado y respeta las bajas en todos los canales
          (RF-R5-102).
        </span>
      </div>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Suscriptores</div>
            <div className="panel__subtitle">
              {suscriptores.data?.total ?? 0} contacto(s). Los datos personales se enmascaran sin permiso de clientes.
            </div>
          </div>
        </div>
        <FilterBar
          activeFilters={[]}
          onClear={() => {
            setBusqueda("")
            setEstado("")
          }}
        >
          <TextField
            label="Buscar"
            placeholder="Correo o nombre"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
          <SelectField
            label="Estado"
            options={[
              { value: "activos", label: "Solo activos" },
              { value: "consentidos", label: "Con consentimiento" },
            ]}
            placeholder="Todos"
            value={estado}
            onChange={(event) => setEstado(event.target.value)}
          />
        </FilterBar>
        <DataTable
          columns={columnas}
          rows={suscriptores.data?.data ?? []}
          getRowKey={(row) => row.id}
          loading={suscriptores.isLoading}
          error={suscriptores.isError ? (suscriptores.error as Error) : null}
          onRetry={() => void suscriptores.refetch()}
          emptyTitle="Sin suscriptores en esta vista"
          emptyDescription="Ajusta la búsqueda o los filtros; las altas llegan desde web, APK y reservas."
        />
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Nuevo envío</div>
            <div className="panel__subtitle">
              Elige plantilla y segmento; se muestra el recuento con consentimiento y los excluidos.
            </div>
          </div>
        </div>
        <div className="form-grid">
          <SelectField
            label="Plantilla"
            options={(plantillas.data?.data ?? []).map((plantilla) => ({
              value: plantilla.id,
              label: `${plantilla.nombre} · ${plantilla.canal} · ${plantilla.idioma}`,
            }))}
            placeholder="Selecciona plantilla"
            value={plantillaId}
            onChange={(event) => setPlantillaId(event.target.value)}
          />
          <SelectField
            label="Segmento"
            options={(segmentos.data?.data ?? []).map((item) => ({ value: item.id, label: item.nombre }))}
            placeholder="Selecciona segmento"
            value={segmentoId}
            onChange={(event) => setSegmentoId(event.target.value)}
          />
        </div>
        {segmento ? (
          <div className="promo-envio-resumen">
            <span>
              <strong>{segmento.conConsentimiento}</strong> destinatario(s) con consentimiento
            </span>
            <span className={excluidos > 0 ? "est-aviso" : undefined}>
              <strong>{excluidos}</strong> excluido(s) sin consentimiento
            </span>
            <Button
              variant="primary"
              disabled={!puedeEnviar || !plantillaId || crearEnvio.isPending}
              title={puedeEnviar ? undefined : "Requiere permiso de newsletter.enviar"}
              onClick={() =>
                crearEnvio.mutate(
                  { plantillaId, segmentoId },
                  {
                    onSuccess: (envio) =>
                      mostrar(
                        `Envío encolado: ${envio.destinatarios} destinatario(s) con consentimiento, ${envio.excluidos} excluido(s).`,
                        "exito",
                      ),
                    onError: (error) => mostrar(error instanceof Error ? error.message : "No se pudo encolar el envío.", "error"),
                  },
                )
              }
            >
              <ArrowRight size={15} /> {crearEnvio.isPending ? "Encolando…" : "Encolar envío"}
            </Button>
          </div>
        ) : (
          <p className="drawer__note">
            Selecciona un segmento para ver cuántos contactos recibirán el envío y cuántos quedan excluidos.
          </p>
        )}
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Envíos</div>
            <div className="panel__subtitle">Estado por envío; los fallos quedan visibles con su error.</div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Plantilla / segmento</th>
                <th>Destinatarios</th>
                <th>Excluidos</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {(envios.data?.data ?? []).map((envio) => (
                <tr key={envio.id}>
                  <td>
                    <span className="order-id">{envio.plantillaNombre}</span>
                    <span className="order-type">{envio.segmentoNombre}</span>
                  </td>
                  <td>{envio.destinatarios}</td>
                  <td>{envio.excluidos}</td>
                  <td>
                    <StatusBadge tone={TONO_ENVIO[envio.estado]}>{ENVIO_ESTADO_LABEL[envio.estado]}</StatusBadge>
                  </td>
                  <td>{formatRelative(envio.creadoEn)}</td>
                  <td className="promo-envio-error">{envio.error ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
