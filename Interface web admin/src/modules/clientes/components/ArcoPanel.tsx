import { useState } from "react"
import { Download, Pencil, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { TextField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/app/auth"
import { ApiError } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { useAnonimizarCliente, useExportarCliente } from "@/modules/clientes/api"
import type { ClienteDetalle } from "@/modules/clientes/types"

/** Derechos ARCO (V1): acceso/portabilidad, rectificación y anonimización. */
export function ArcoPanel({
  cliente,
  zonaHoraria,
  onIrARectificacion,
}: {
  cliente: ClienteDetalle
  zonaHoraria: string
  onIrARectificacion: () => void
}) {
  const { mostrar } = useToast()
  const { tienePermiso } = useAuth()
  const exportar = useExportarCliente()
  const anonimizar = useAnonimizarCliente()

  const [confirmacion, setConfirmacion] = useState("")
  const [dialogoOpen, setDialogoOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const puedeExportar = tienePermiso("clientes.exportar")
  const puedeEditar = tienePermiso("clientes.editar")
  const puedeAnonimizar = tienePermiso("clientes.anonimizar")

  const solicitarAcceso = () => {
    exportar.mutate(cliente.id, {
      onSuccess: (exportacion) =>
        mostrar(
          `Solicitud de acceso registrada (${exportacion.id}). El archivo se genera en segundo plano y queda en exportación.`,
          "exito",
        ),
      onError: (fallo) => mostrar(fallo instanceof ApiError ? fallo.message : "No se pudo registrar la solicitud.", "error"),
    })
  }

  return (
    <div className="cliente-tab arco-panel">
      {cliente.anonimizado ? (
        <p className="clientes-alert clientes-alert--late">
          <ShieldAlert size={13} /> Este cliente está anonimizado: no se muestran datos personales y las acciones ARCO
          quedan deshabilitadas. Los accesos a la ficha se siguen registrando.
        </p>
      ) : null}

      <section className="arco-card">
        <h4>Derecho de acceso y portabilidad</h4>
        <p>
          Genera una exportación con los datos del cliente. La solicitud crea un registro en <code>exportacion</code> y
          se limita si es muy grande (RN-R5-10, RNF-R5-04).
        </p>
        <Button
          variant="secondary"
          disabled={!puedeExportar || exportar.isPending}
          title={puedeExportar ? undefined : "Requiere permiso de clientes.exportar"}
          onClick={solicitarAcceso}
        >
          <Download size={15} /> {exportar.isPending ? "Registrando…" : "Exportar datos del cliente"}
        </Button>
      </section>

      <section className="arco-card">
        <h4>Rectificación</h4>
        <p>
          Corrige nombre, contacto, fecha de nacimiento, preferencias o notas. El cambio guarda el antes/después en
          auditoría y un guardado concurrente recibe 409.
        </p>
        <Button
          variant="secondary"
          disabled={!puedeEditar || cliente.anonimizado}
          title={
            cliente.anonimizado
              ? "Un cliente anonimizado no admite rectificación"
              : puedeEditar
                ? undefined
                : "Requiere permiso de clientes.editar"
          }
          onClick={onIrARectificacion}
        >
          <Pencil size={15} /> Editar datos de la ficha
        </Button>
      </section>

      <section className="arco-card arco-card--danger">
        <h4>Anonimización (irreversible)</h4>
        <p>
          Reemplaza los datos personales del cliente y los contactos de pedidos y reservas, revoca consentimientos y
          desactiva el suscriptor.
        </p>
        <ul className="arco-lista">
          <li>
            <strong>Se conserva:</strong> importes, fechas, códigos y facturas; los reportes fiscales siguen cuadrando
            (RN-R5-09).
          </li>
          <li>
            <strong>Se pierde:</strong> nombre, teléfono, correo, dirección de contacto, preferencias y notas. No se
            puede deshacer.
          </li>
        </ul>
        {!cliente.anonimizado ? (
          <>
            <TextField
              label="Escribe ANONIMIZAR para habilitar la acción"
              placeholder="ANONIMIZAR"
              value={confirmacion}
              onChange={(event) => setConfirmacion(event.target.value)}
            />
            <div className="arco-panel__acciones">
              <Button
                variant="primary"
                className="button--danger"
                disabled={!puedeAnonimizar || confirmacion.trim() !== "ANONIMIZAR"}
                title={puedeAnonimizar ? "Escribe ANONIMIZAR para confirmar" : "Requiere permiso de clientes.anonimizar"}
                onClick={() => setDialogoOpen(true)}
              >
                Solicitar anonimización
              </Button>
              <span className="clientes-hint">
                Última actualización: {formatDateTime(cliente.actualizadoEn, zonaHoraria)}
              </span>
            </div>
          </>
        ) : (
          <p className="clientes-hint">
            Anonimizado previamente; la evidencia queda en la pestaña <strong>Actividad</strong>.
          </p>
        )}
        {error ? <p className="clientes-error">{error}</p> : null}
      </section>

      <ConfirmDialog
        open={dialogoOpen}
        title={`Anonimizar a «${cliente.nombre}»`}
        description="Acción irreversible con doble confirmación. Se conservan importes y facturas para los reportes fiscales."
        impacto="Se reemplazan los datos personales del cliente, los contactos de pedidos y reservas, se revocan sus consentimientos y se desactiva el suscriptor."
        confirmLabel="Anonimizar definitivamente"
        onCancel={() => setDialogoOpen(false)}
        onConfirm={(motivo) => {
          setError(null)
          anonimizar.mutate(
            { id: cliente.id, payload: { motivo, confirmacion } },
            {
              onSuccess: () => {
                mostrar("Cliente anonimizado; los reportes fiscales se conservan.", "exito")
                setDialogoOpen(false)
                setConfirmacion("")
              },
              onError: (fallo) => {
                setError(fallo instanceof ApiError ? fallo.message : "No se pudo anonimizar al cliente.")
                setDialogoOpen(false)
              },
            },
          )
        }}
      />
    </div>
  )
}
