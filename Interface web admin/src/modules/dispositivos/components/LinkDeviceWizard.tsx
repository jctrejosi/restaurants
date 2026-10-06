import { useEffect, useState } from "react"
import {
  Check,
  Copy,
  Cpu,
  KeyRound,
  Link2,
  Monitor,
  Printer,
  QrCode,
  Smartphone,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { SelectField, type SelectOption } from "@/components/ui/fields"
import { useSede } from "@/app/sede"
import { formatDateTime } from "@/lib/format"
import { ESTACIONES_DISPOSITIVO, TITULARES_DISPOSITIVO } from "@/modules/dispositivos/api"
import {
  TIPO_DISPOSITIVO_LABEL,
  TIPOS_DISPOSITIVO,
  type DispositivoTipo,
  type VincularDispositivoPayload,
  type VincularDispositivoResp,
} from "@/modules/dispositivos/types"

const ICONO_TIPO: Record<DispositivoTipo, typeof Smartphone> = {
  apk: Smartphone,
  kds: Monitor,
  caja: Cpu,
  print_agent: Printer,
}

const AYUDA_TIPO: Record<DispositivoTipo, string> = {
  apk: "Teléfono del mesero; se asigna a un titular.",
  kds: "Pantalla de cocina; requiere estación de preparación o despacho.",
  caja: "Terminal de cobro de la sede.",
  print_agent: "Servicio de impresión local; recibe aviso de actualización.",
}

/**
 * Asistente de vinculación (plan 18 §6): tipo → sede → usuario/estación →
 * token mostrado una sola vez.
 */
export function LinkDeviceWizard({
  open,
  guardando,
  errorServidor,
  resultado,
  onClose,
  onConfirm,
}: {
  open: boolean
  guardando: boolean
  errorServidor?: string | null
  resultado: VincularDispositivoResp | null
  onClose: () => void
  onConfirm: (payload: VincularDispositivoPayload) => void
}) {
  const { sedes } = useSede()
  const [paso, setPaso] = useState(0)
  const [tipo, setTipo] = useState<DispositivoTipo | null>(null)
  const [sedeId, setSedeId] = useState(sedes[0]?.id ?? "")
  const [usuarioId, setUsuarioId] = useState("")
  const [estacionId, setEstacionId] = useState("")

  useEffect(() => {
    if (!open) return
    setPaso(0)
    setTipo(null)
    setSedeId(sedes[0]?.id ?? "")
    setUsuarioId("")
    setEstacionId("")
  }, [open, sedes])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const estacion = ESTACIONES_DISPOSITIVO.find((item) => item.id === estacionId)
  const pasoValido =
    paso === 0
      ? tipo !== null
      : paso === 1
        ? Boolean(sedeId) && (tipo !== "apk" || Boolean(usuarioId)) && (tipo !== "kds" || Boolean(estacionId))
        : true

  const sedesOptions: SelectOption[] = sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onClose} />
      <div className="modal modal--wizard" role="dialog" aria-modal="true" aria-label="Vincular dispositivo">
        <div className="modal__header">
          <span className="modal__icon">
            <Link2 size={18} />
          </span>
          <div>
            <strong>{resultado ? "Token de vinculación" : "Vincular dispositivo"}</strong>
            <p>
              {resultado
                ? "Cópialo ahora: se muestra una sola vez."
                : "El dispositivo hereda la sede y su alcance operativo."}
            </p>
          </div>
        </div>

        <div className="modal__body">
          {resultado ? (
            <div className="token-panel">
              <QrCode size={40} aria-hidden="true" />
              <code>{resultado.token}</code>
              <p>
                Válido hasta {formatDateTime(resultado.expiraEn)}. Al revincular, el token anterior se
                invalida.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard?.writeText(resultado.token)
                }}
              >
                <Copy size={14} /> Copiar token
              </Button>
            </div>
          ) : paso === 0 ? (
            <div className="wizard-tipos">
              {TIPOS_DISPOSITIVO.map((valor) => {
                const Icono = ICONO_TIPO[valor]
                return (
                  <button
                    type="button"
                    key={valor}
                    className={`wizard-tipo ${tipo === valor ? "wizard-tipo--activo" : ""}`}
                    onClick={() => setTipo(valor)}
                  >
                    <Icono size={20} />
                    <strong>{TIPO_DISPOSITIVO_LABEL[valor]}</strong>
                    <small>{AYUDA_TIPO[valor]}</small>
                  </button>
                )
              })}
            </div>
          ) : paso === 1 ? (
            <div className="wizard-datos">
              <SelectField
                label="Sede"
                options={sedesOptions}
                value={sedeId}
                onChange={(event) => setSedeId(event.target.value)}
              />
              {tipo === "apk" ? (
                <SelectField
                  label="Mesero titular"
                  options={TITULARES_DISPOSITIVO.map((titular) => ({ value: titular.id, label: titular.nombre }))}
                  placeholder="Selecciona al titular"
                  value={usuarioId}
                  onChange={(event) => setUsuarioId(event.target.value)}
                />
              ) : null}
              {tipo === "kds" ? (
                <>
                  <SelectField
                    label="Estación asignada"
                    options={ESTACIONES_DISPOSITIVO.map((item) => ({
                      value: item.id,
                      label: `${item.nombre}${item.activa ? "" : " (inactiva)"}`,
                    }))}
                    placeholder="Selecciona la estación"
                    value={estacionId}
                    onChange={(event) => setEstacionId(event.target.value)}
                  />
                  {estacion && !estacion.activa ? (
                    <p className="modal__impact">
                      La estación {estacion.nombre} está inactiva: el enrutado de comandas puede fallar
                      hasta activarla (módulo 07).
                    </p>
                  ) : null}
                </>
              ) : null}
              {tipo === "caja" || tipo === "print_agent" ? (
                <p className="modal__impact">
                  {tipo === "caja"
                    ? "La caja recibirá un aviso si queda por debajo de la versión mínima."
                    : "El print agent recibe aviso de actualización; no bloquea la operación."}
                </p>
              ) : null}
            </div>
          ) : (
            <ul className="wizard-resumen">
              <li>
                Tipo <strong>{tipo ? TIPO_DISPOSITIVO_LABEL[tipo] : ""}</strong>
              </li>
              <li>
                Sede <strong>{sedes.find((sede) => sede.id === sedeId)?.nombre ?? sedeId}</strong>
              </li>
              {tipo === "apk" ? (
                <li>
                  Titular{" "}
                  <strong>{TITULARES_DISPOSITIVO.find((item) => item.id === usuarioId)?.nombre ?? usuarioId}</strong>
                </li>
              ) : null}
              {tipo === "kds" ? (
                <li>
                  Estación <strong>{estacion?.nombre ?? estacionId}</strong>
                </li>
              ) : null}
              <li className="wizard-resumen__nota">
                <KeyRound size={13} /> Al confirmar se emite un token de un solo uso.
              </li>
            </ul>
          )}

          {errorServidor ? <p className="modal__impact">{errorServidor}</p> : null}
        </div>

        <div className="modal__footer">
          {resultado ? (
            <Button variant="primary" onClick={onClose}>
              <Check size={15} /> Listo
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              {paso > 0 ? (
                <Button variant="ghost" onClick={() => setPaso((actual) => actual - 1)}>
                  Atrás
                </Button>
              ) : null}
              {paso < 2 ? (
                <Button
                  variant="primary"
                  disabled={!pasoValido}
                  onClick={() => setPaso((actual) => actual + 1)}
                >
                  Siguiente
                </Button>
              ) : (
                <Button
                  variant="primary"
                  disabled={guardando || !tipo}
                  onClick={() => {
                    if (!tipo) return
                    onConfirm({
                      tipo,
                      sucursalId: sedeId,
                      usuarioId: tipo === "apk" ? usuarioId : undefined,
                      estacionId: tipo === "kds" ? estacionId : undefined,
                    })
                  }}
                >
                  {guardando ? "Vinculando…" : "Vincular y emitir token"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

/** Token rotado tras revincular: se muestra una sola vez (plan 18 §5). */
export function DeviceTokenDialog({
  resultado,
  onClose,
}: {
  resultado: VincularDispositivoResp | null
  onClose: () => void
}) {
  if (!resultado) return null
  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Token de revinculación">
        <div className="modal__header">
          <span className="modal__icon">
            <KeyRound size={18} />
          </span>
          <div>
            <strong>Nuevo token de {resultado.dispositivo.id}</strong>
            <p>El token anterior quedó invalidado.</p>
          </div>
        </div>
        <div className="modal__body">
          <div className="token-panel">
            <code>{resultado.token}</code>
            <p>Válido hasta {formatDateTime(resultado.expiraEn)}.</p>
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard?.writeText(resultado.token)
              }}
            >
              <Copy size={14} /> Copiar token
            </Button>
          </div>
        </div>
        <div className="modal__footer">
          <Button variant="primary" onClick={onClose}>
            Listo
          </Button>
        </div>
      </div>
    </>
  )
}
