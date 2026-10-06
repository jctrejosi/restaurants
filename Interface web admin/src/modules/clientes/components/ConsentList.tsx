import { useState } from "react"
import { ShieldCheck, ShieldOff } from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SelectField, TextField, type SelectOption } from "@/components/ui/fields"
import { ErrorState } from "@/components/ui/states"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/app/auth"
import { ApiError } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { useConsentimientos, useOtorgarConsentimiento, useRevocarConsentimiento } from "@/modules/clientes/api"
import {
  BASE_LEGAL_LABEL,
  CONSENTIMIENTO_CANAL_LABEL,
  CONSENTIMIENTO_TIPO_LABEL,
  type BaseLegal,
  type Consentimiento,
  type ConsentimientoCanal,
  type ConsentimientoTipo,
  type MarketingEstado,
} from "@/modules/clientes/types"

function formatFecha(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone }).format(
    new Date(iso),
  )
}

/**
 * Consentimientos (MVP): otorgamiento y opt-out con motivo. Revocar marketing
 * corta los envíos en todos los canales y desactiva el suscriptor (RF-R5-91).
 */
export function ConsentList({
  clienteId,
  marketing,
  zonaHoraria,
}: {
  clienteId: string
  marketing: MarketingEstado
  zonaHoraria: string
}) {
  const { mostrar } = useToast()
  const { tienePermiso } = useAuth()
  const puedeGestionar = tienePermiso("clientes.consentimientos")

  const { data, isLoading, isError, refetch } = useConsentimientos(clienteId)
  const otorgar = useOtorgarConsentimiento()
  const revocar = useRevocarConsentimiento()

  const [tipo, setTipo] = useState<ConsentimientoTipo>("marketing")
  const [canal, setCanal] = useState<ConsentimientoCanal>("email")
  const [baseLegal, setBaseLegal] = useState<BaseLegal>("consentimiento")
  const [vigencia, setVigencia] = useState("")
  const [motivo, setMotivo] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [revocarItem, setRevocarItem] = useState<Consentimiento | null>(null)

  const consentimientos = data?.data ?? []

  const opcionesTipo: SelectOption[] = Object.entries(CONSENTIMIENTO_TIPO_LABEL).map(([value, label]) => ({ value, label }))
  const opcionesCanal: SelectOption[] = Object.entries(CONSENTIMIENTO_CANAL_LABEL).map(([value, label]) => ({ value, label }))
  const opcionesBase: SelectOption[] = Object.entries(BASE_LEGAL_LABEL).map(([value, label]) => ({ value, label }))

  const registrar = () => {
    if (motivo.trim().length < 3) {
      setError("Escribe un motivo de al menos 3 caracteres.")
      return
    }
    setError(null)
    otorgar.mutate(
      {
        clienteId,
        payload: { tipo, canal, baseLegal, vigenciaHasta: vigencia || undefined, motivo: motivo.trim() },
      },
      {
        onSuccess: () => {
          mostrar(
            tipo === "marketing"
              ? "Consentimiento de marketing registrado; se habilitan envíos en el canal elegido."
              : "Consentimiento registrado y auditado.",
            "exito",
          )
          setMotivo("")
          setVigencia("")
        },
        onError: (fallo) => setError(fallo instanceof ApiError ? fallo.message : "No se pudo registrar el consentimiento."),
      },
    )
  }

  const columnas: Column<Consentimiento>[] = [
    { key: "tipo", header: "Tipo", cell: (item) => CONSENTIMIENTO_TIPO_LABEL[item.tipo] },
    { key: "canal", header: "Canal", cell: (item) => CONSENTIMIENTO_CANAL_LABEL[item.canal] },
    { key: "base", header: "Base legal", cell: (item) => BASE_LEGAL_LABEL[item.baseLegal] },
    {
      key: "otorgado",
      header: "Otorgado",
      cell: (item) => formatDateTime(item.otorgadoEn, zonaHoraria),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (item) =>
        item.revocadoEn ? (
          <>
            <StatusBadge tone="gray">Revocado</StatusBadge>
            <span className="order-type"> {formatDateTime(item.revocadoEn, zonaHoraria)}</span>
          </>
        ) : (
          <StatusBadge tone="green">Vigente</StatusBadge>
        ),
    },
    {
      key: "vigencia",
      header: "Vigencia",
      cell: (item) => (item.vigenciaHasta ? `Hasta ${formatFecha(item.vigenciaHasta, zonaHoraria)}` : "Indefinida"),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      cell: (item) =>
        !item.revocadoEn ? (
          <Button
            variant="secondary"
            disabled={!puedeGestionar}
            title={puedeGestionar ? undefined : "Requiere permiso de clientes.consentimientos"}
            onClick={() => setRevocarItem(item)}
          >
            <ShieldOff size={14} /> Revocar
          </Button>
        ) : (
          "—"
        ),
    },
  ]

  return (
    <div className="cliente-tab">
      {marketing === "revocado" ? (
        <p className="clientes-alert clientes-alert--late">
          <ShieldCheck size={13} /> Opt-out de marketing activo: no se crearán notificaciones de marketing en ningún
          canal y el suscriptor está desactivado.
        </p>
      ) : null}

      {puedeGestionar ? (
        <section className="consent-form">
          <h4>Registrar otorgamiento</h4>
          <div className="consent-form__grid">
            <SelectField label="Tipo" options={opcionesTipo} value={tipo} onChange={(event) => setTipo(event.target.value as ConsentimientoTipo)} />
            <SelectField label="Canal" options={opcionesCanal} value={canal} onChange={(event) => setCanal(event.target.value as ConsentimientoCanal)} />
            <SelectField
              label="Base legal"
              options={opcionesBase}
              value={baseLegal}
              onChange={(event) => setBaseLegal(event.target.value as BaseLegal)}
            />
            <TextField
              label="Vigencia hasta (opcional)"
              type="date"
              value={vigencia}
              onChange={(event) => setVigencia(event.target.value)}
            />
          </div>
          <TextField
            label="Motivo (obligatorio)"
            placeholder="Cómo y cuándo lo otorgó el titular"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
          />
          {error ? <p className="clientes-error">{error}</p> : null}
          <div className="consent-form__actions">
            <Button variant="primary" disabled={otorgar.isPending} onClick={registrar}>
              {otorgar.isPending ? "Registrando…" : "Registrar consentimiento"}
            </Button>
          </div>
        </section>
      ) : (
        <p className="clientes-notice">
          Vista de solo lectura: otorgar y revocar consentimientos requiere el permiso{" "}
          <code>clientes.consentimientos</code>.
        </p>
      )}

      {isError ? (
        <ErrorState
          title="No se pudieron cargar los consentimientos"
          description="Revisa tu conexión e inténtalo de nuevo."
          onRetry={() => void refetch()}
        />
      ) : (
        <DataTable
          columns={columnas}
          rows={consentimientos}
          getRowKey={(item) => item.id}
          loading={isLoading}
          emptyTitle="Sin consentimientos registrados"
          emptyDescription="Registra el consentimiento de datos y de marketing del cliente."
        />
      )}

      <ConfirmDialog
        open={revocarItem != null}
        title={revocarItem ? `Revocar «${CONSENTIMIENTO_TIPO_LABEL[revocarItem.tipo]}»` : "Revocar consentimiento"}
        description={
          revocarItem?.tipo === "marketing"
            ? `El cliente no volverá a recibir marketing por ${CONSENTIMIENTO_CANAL_LABEL[revocarItem.canal]}.`
            : "El opt-out se respeta en todos los canales y cancela envíos pendientes."
        }
        impacto="La baja se propaga a Promociones y desactiva el suscriptor si aplica. Queda auditada con motivo."
        confirmLabel="Revocar consentimiento"
        onCancel={() => setRevocarItem(null)}
        onConfirm={(textoMotivo) => {
          if (!revocarItem) return
          revocar.mutate(
            { clienteId, consentimientoId: revocarItem.id, motivo: textoMotivo },
            {
              onSuccess: () =>
                mostrar(
                  revocarItem.tipo === "marketing"
                    ? "Opt-out registrado: envíos pendientes cancelados y suscriptor desactivado."
                    : "Consentimiento revocado y auditado.",
                  "exito",
                ),
              onError: (fallo) =>
                mostrar(fallo instanceof ApiError ? fallo.message : "No se pudo revocar.", "error"),
            },
          )
          setRevocarItem(null)
        }}
      />
    </div>
  )
}
