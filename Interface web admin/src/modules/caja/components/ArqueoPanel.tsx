import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Calculator, Save } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { TextField, TextareaField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { formatDateTime, formatMoney } from "@/lib/format"
import { useGuardarArqueo } from "@/modules/caja/api"
import { MEDIO_PAGO_TIPO_LABEL, type TurnoDetalle } from "@/modules/caja/types"
import { aCentavos, semaforoDiferencia, SEMAFORO_LABEL } from "@/modules/caja/utils"
import { PendientesPedidosTable } from "@/modules/caja/components/PendientesPedidosTable"

/**
 * Arqueo y cierre (RF-R5-70): esperado vs. contado por medio, diferencia en vivo
 * contra los pagos aprobados y advertencia con el detalle de pedidos abiertos.
 */
export function ArqueoPanel({
  turno,
  puedeCerrar,
  onSolicitarCierre,
}: {
  turno: TurnoDetalle
  puedeCerrar: boolean
  onSolicitarCierre: () => void
}) {
  const { mostrar } = useToast()
  const guardar = useGuardarArqueo(turno.id)

  const [base, setBase] = useState(() => (turno.arqueo ? String(turno.arqueo.baseInicialCentavos / 100) : String(turno.baseInicialCentavos / 100)))
  const [retiros, setRetiros] = useState(() => String((turno.arqueo?.retirosCentavos ?? 0) / 100))
  const [gastos, setGastos] = useState(() => String((turno.arqueo?.gastosCentavos ?? 0) / 100))
  const [observaciones, setObservaciones] = useState(() => turno.arqueo?.observaciones ?? "")
  const [contado, setContado] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {}
    for (const medio of turno.medios) {
      const valor = turno.arqueo?.contadoPorMedio.find((fila) => fila.medioPagoId === medio.medioPagoId)?.contadoCentavos
      inicial[medio.medioPagoId] = valor === null || valor === undefined ? "" : String(valor / 100)
    }
    return inicial
  })
  const [error, setError] = useState<string | null>(null)
  const inicializado = useRef<string | null>(null)

  // Solo se reinicia al cambiar de turno o cuando se registra un arqueo nuevo:
  // el refetch periódico no debe borrar lo que el usuario está escribiendo.
  const claveArqueo = `${turno.id}:${turno.arqueo?.registradoEn ?? "sin-arqueo"}`
  useEffect(() => {
    if (inicializado.current === claveArqueo) return
    inicializado.current = claveArqueo
    setBase(String((turno.arqueo?.baseInicialCentavos ?? turno.baseInicialCentavos) / 100))
    setRetiros(String((turno.arqueo?.retirosCentavos ?? 0) / 100))
    setGastos(String((turno.arqueo?.gastosCentavos ?? 0) / 100))
    setObservaciones(turno.arqueo?.observaciones ?? "")
    const siguiente: Record<string, string> = {}
    for (const medio of turno.medios) {
      const valor = turno.arqueo?.contadoPorMedio.find((fila) => fila.medioPagoId === medio.medioPagoId)?.contadoCentavos
      siguiente[medio.medioPagoId] = valor === null || valor === undefined ? "" : String(valor / 100)
    }
    setContado(siguiente)
    setError(null)
  }, [claveArqueo, turno])

  const calculo = useMemo(() => {
    const baseCentavos = aCentavos(base) ?? 0
    const retirosCentavos = aCentavos(retiros) ?? 0
    const gastosCentavos = aCentavos(gastos) ?? 0
    const medios = turno.medios.map((medio) => {
      const ajuste = medio.tipo === "efectivo" ? baseCentavos - retirosCentavos - gastosCentavos : 0
      const esperadoCentavos = medio.ventasCentavos + medio.propinasCentavos + ajuste
      const contadoCentavos = aCentavos(contado[medio.medioPagoId] ?? "") ?? 0
      return { ...medio, esperadoCentavos, contadoCentavos, diferenciaCentavos: contadoCentavos - esperadoCentavos }
    })
    const esperadoCentavos = medios.reduce((total, medio) => total + medio.esperadoCentavos, 0)
    const contadoCentavos = medios.reduce((total, medio) => total + medio.contadoCentavos, 0)
    const efectivo = medios.find((medio) => medio.tipo === "efectivo")
    const efectivoSinContar = Boolean(efectivo) && (contado[efectivo?.medioPagoId ?? ""] ?? "").trim() === ""
    return {
      medios,
      esperadoCentavos,
      contadoCentavos,
      diferenciaCentavos: contadoCentavos - esperadoCentavos,
      efectivoSinContar,
    }
  }, [base, retiros, gastos, contado, turno.medios])

  const semaforo = semaforoDiferencia(calculo.diferenciaCentavos)
  const exigeObservaciones = calculo.diferenciaCentavos !== 0 && observaciones.trim().length < 3
  const bloqueado = calculo.efectivoSinContar || exigeObservaciones || guardar.isPending

  const guardarArqueo = () => {
    setError(null)
    guardar.mutate(
      {
        baseInicialCentavos: aCentavos(base) ?? 0,
        retirosCentavos: aCentavos(retiros) ?? 0,
        gastosCentavos: aCentavos(gastos) ?? 0,
        observaciones: observaciones.trim(),
        contadoPorMedio: turno.medios.map((medio) => ({
          medioPagoId: medio.medioPagoId,
          contadoCentavos: aCentavos(contado[medio.medioPagoId] ?? ""),
        })),
      },
      {
        onSuccess: () => mostrar("Arqueo guardado. La diferencia quedó registrada en el turno.", "exito"),
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "No se pudo guardar el arqueo. Reintenta."),
      },
    )
  }

  const puedeCerrarAhora = puedeCerrar && turno.arqueo !== null
  const soloLectura = turno.estado === "cerrado"

  return (
    <div className="caja-grid-2 caja-arqueo">
      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Arqueo</div>
            <div className="panel__subtitle">
              Efectivo obligatorio; retiros y gastos descuentan del esperado.
            </div>
          </div>
          <Calculator size={17} aria-hidden="true" />
        </div>
        {soloLectura ? (
          <div className="module-notice caja-nota" role="note">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              Turno cerrado: el arqueo es de solo lectura. Para recalcularlo hay que reabrirlo con motivo.
            </span>
          </div>
        ) : null}
        <div className="panel__body caja-arqueo__form">
          <TextField
            label={`Base inicial (${turno.moneda})`}
            type="number"
            min={0}
            step="0.01"
            value={base}
            disabled={soloLectura}
            onChange={(event) => setBase(event.target.value)}
          />
          <div className="caja-arqueo__fila">
            <TextField
              label={`Retiros (${turno.moneda})`}
              type="number"
              min={0}
              step="0.01"
              value={retiros}
              disabled={soloLectura}
              onChange={(event) => setRetiros(event.target.value)}
            />
            <TextField
              label={`Gastos (${turno.moneda})`}
              type="number"
              min={0}
              step="0.01"
              value={gastos}
              disabled={soloLectura}
              onChange={(event) => setGastos(event.target.value)}
            />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Medio</th>
                  <th className="cell-right">Esperado</th>
                  <th className="cell-right">Contado</th>
                  <th className="cell-right">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {calculo.medios.map((medio) => (
                  <tr key={medio.medioPagoId}>
                    <td>
                      {medio.nombre}
                      <div className="caja-medio__meta">
                        {MEDIO_PAGO_TIPO_LABEL[medio.tipo]}
                        {!medio.activo ? " · deshabilitado" : ""}
                      </div>
                    </td>
                    <td className="cell-right">
                      <span className="money">{formatMoney(medio.esperadoCentavos, turno.moneda)}</span>
                    </td>
                    <td className="cell-right">
                      <input
                        className="input caja-arqueo__contado"
                        type="number"
                        min={0}
                        step="0.01"
                        aria-label={`Contado en ${medio.nombre}`}
                        value={contado[medio.medioPagoId] ?? ""}
                        disabled={soloLectura}
                        onChange={(event) =>
                          setContado((actual) => ({ ...actual, [medio.medioPagoId]: event.target.value }))
                        }
                      />
                    </td>
                    <td className="cell-right">
                      <span className={`caja-diferencia caja-diferencia--${semaforoDiferencia(medio.diferenciaCentavos)}`}>
                        {medio.diferenciaCentavos === 0
                          ? formatMoney(0, turno.moneda)
                          : `${medio.diferenciaCentavos > 0 ? "+" : "−"}${formatMoney(Math.abs(medio.diferenciaCentavos), turno.moneda)}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TextareaField
            label="Observaciones"
            placeholder="Explica cualquier diferencia, retiro o incidencia"
            rows={3}
            value={observaciones}
            disabled={soloLectura}
            hint={exigeObservaciones ? "La diferencia no es cero: las observaciones son obligatorias." : undefined}
            onChange={(event) => setObservaciones(event.target.value)}
          />
          {error ? <p className="caja-error">{error}</p> : null}

          <div className="caja-arqueo__acciones">
            <Button variant="secondary" disabled={bloqueado || soloLectura} onClick={guardarArqueo}>
              <Save size={15} /> {guardar.isPending ? "Guardando…" : "Guardar arqueo"}
            </Button>
            {turno.estado === "abierto" ? (
              <Button
                variant="primary"
                disabled={!puedeCerrarAhora}
                title={
                  !puedeCerrar
                    ? "Requiere permiso de caja.cerrar"
                    : turno.arqueo === null
                      ? "Guarda el arqueo antes de cerrar"
                      : undefined
                }
                onClick={onSolicitarCierre}
              >
                Cerrar turno
              </Button>
            ) : null}
          </div>
          {turno.arqueo ? (
            <p className="caja-arqueo__meta">
              Último arqueo: {turno.arqueo.registradoPor}, {formatDateTime(turno.arqueo.registradoEn, turno.zonaHoraria)}
            </p>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Cuadre del turno</div>
            <div className="panel__subtitle">contado − esperado, contra los pagos aprobados.</div>
          </div>
          <span className={`caja-semaforo caja-semaforo--${semaforo}`}>{SEMAFORO_LABEL[semaforo]}</span>
        </div>
        <div className="panel__body caja-cuadre">
          <dl className="caja-cuadre__lista">
            <div>
              <dt>Esperado</dt>
              <dd>{formatMoney(calculo.esperadoCentavos, turno.moneda)}</dd>
            </div>
            <div>
              <dt>Contado</dt>
              <dd>{formatMoney(calculo.contadoCentavos, turno.moneda)}</dd>
            </div>
            <div className={`caja-cuadre__diferencia caja-cuadre__diferencia--${semaforo}`}>
              <dt>Diferencia</dt>
              <dd>
                {calculo.diferenciaCentavos === 0
                  ? formatMoney(0, turno.moneda)
                  : `${calculo.diferenciaCentavos > 0 ? "+" : "−"}${formatMoney(Math.abs(calculo.diferenciaCentavos), turno.moneda)}`}
              </dd>
            </div>
          </dl>
          <p className="caja-cuadre__formula" title="Fórmula del backend">
            Diferencia = contado − (base + ventas + propinas − retiros − gastos)
          </p>

          <div className={`caja-alerta ${turno.pendientes.length > 0 ? "caja-alerta--warning" : ""}`}>
            <AlertTriangle size={17} aria-hidden="true" />
            <div>
              <strong>
                {turno.pendientes.length > 0
                  ? `${turno.pendientes.length} pedidos pendientes de cobro`
                  : "Sin pedidos pendientes"}
              </strong>
              <span>
                {turno.pendientes.length > 0
                  ? "El cierre se bloquea con 409 hasta resolverlos o confirmarlo con motivo."
                  : "El turno se puede cerrar sin confirmación adicional."}
              </span>
            </div>
          </div>

          <PendientesPedidosTable
            pedidos={turno.pendientes}
            moneda={turno.moneda}
            zonaHoraria={turno.zonaHoraria}
          />
        </div>
      </section>
    </div>
  )
}
