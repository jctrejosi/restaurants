import { DurationCell } from "@/components/data/cells"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { formatDateTime, formatDuration, formatMoney, maskContact, maskName } from "@/lib/format"
import {
  CANAL_LABEL,
  DEPOSITO_LABEL,
  DEPOSITO_TONE,
  DEPOSITO_REGLA_LABEL,
  ESTADO_LABEL,
  ESTADO_TONE,
  type ReservaDetalle,
} from "@/modules/reservas/types"

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="reserva-dato">
      <span>{etiqueta}</span>
      <strong>{children}</strong>
    </div>
  )
}

/** Pestaña Resumen del detalle: datos, política aplicada, sellos y tiempos clave. */
export function ResumenTab({ reserva, puedeVerPii }: { reserva: ReservaDetalle; puedeVerPii: boolean }) {
  const politica = reserva.politicaSnapshot
  const contacto = (valor?: string) => (valor ? (puedeVerPii ? valor : maskContact(valor)) : "—")

  return (
    <div className="reserva-resumen">
      <section className="detail-block">
        <h4>Reserva</h4>
        <Dato etiqueta="Código">
          <span className="reserva-codigo">{reserva.codigo}</span>
        </Dato>
        <Dato etiqueta="Estado">
          <StatusBadge tone={ESTADO_TONE[reserva.estado]}>{ESTADO_LABEL[reserva.estado]}</StatusBadge>
        </Dato>
        <Dato etiqueta="Fecha y hora">{formatDateTime(reserva.fechaHora, reserva.zonaHoraria)}</Dato>
        <Dato etiqueta="Duración">{reserva.duracionMin} min</Dato>
        <Dato etiqueta="Personas">{reserva.personas}</Dato>
        <Dato etiqueta="Canal">{CANAL_LABEL[reserva.canal]}</Dato>
      </section>

      <section className="detail-block">
        <h4>Cliente</h4>
        <Dato etiqueta="Nombre">{puedeVerPii ? reserva.clienteNombre : maskName(reserva.clienteNombre)}</Dato>
        <Dato etiqueta="Teléfono">{contacto(reserva.telefono)}</Dato>
        <Dato etiqueta="Correo">{contacto(reserva.correo)}</Dato>
        {!puedeVerPii ? (
          <p className="reserva-nota">
            Contacto enmascarado: requiere el permiso <code>clientes.ver_pii</code> (RN-R5-07).
          </p>
        ) : null}
      </section>

      <section className="detail-block">
        <h4>Ubicación</h4>
        <Dato etiqueta="Sede">{reserva.sedeNombre}</Dato>
        <Dato etiqueta="Zona">{reserva.zonaNombre ?? "Sin zona"}</Dato>
        <Dato etiqueta="Mesa">{reserva.mesaNumero ? `Mesa ${reserva.mesaNumero}` : "Sin asignar"}</Dato>
        <Dato etiqueta="Zona horaria">{reserva.zonaHoraria}</Dato>
      </section>

      <section className="detail-block">
        <h4>Tiempos de la reserva</h4>
        <Dato etiqueta="Espera (sentada − reserva)">
          <DurationCell segundos={reserva.tiempos.esperaSeg} titulo="= sentada − fecha y hora" />
        </Dato>
        <Dato etiqueta="Duración de mesa (finalizada − sentada)">
          <DurationCell segundos={reserva.tiempos.duracionMesaSeg} titulo="= finalizada − sentada" />
        </Dato>
        <div className="reserva-sellos">
          {(
            [
              ["Creada", reserva.sellos.creadaEn],
              ["Confirmada", reserva.sellos.confirmadaEn],
              ["Sentada", reserva.sellos.sentadaEn],
              ["Finalizada", reserva.sellos.finalizadaEn],
              ["No-show", reserva.sellos.noShowEn],
              ["Cancelada", reserva.sellos.canceladaEn],
            ] as const
          ).map(([etiqueta, sello]) => (
            <span className="reserva-sello" key={etiqueta}>
              {etiqueta}: {sello ? formatDateTime(sello, reserva.zonaHoraria) : "—"}
            </span>
          ))}
        </div>
        <p className="reserva-nota">Los tramos sin evento de cierre se muestran «—» y no promedian (R5 §5.3).</p>
      </section>

      <section className="detail-block">
        <h4>Política aplicada (snapshot)</h4>
        <Dato etiqueta="Antelación mínima">{politica.antelacionMinHoras} h</Dato>
        <Dato etiqueta="Duración base">{politica.duracionMin} min</Dato>
        <Dato etiqueta="Tolerancia">{politica.toleranciaMin} min</Dato>
        <Dato etiqueta="Cancelación sin costo">{politica.cancelacionHoras} h antes</Dato>
        <Dato etiqueta="Máximo por reserva">{politica.maximoPersonas} personas</Dato>
        <Dato etiqueta="Depósito">{DEPOSITO_REGLA_LABEL[politica.depositoRegla]}</Dato>
        <p className="reserva-nota">
          La reserva conserva la política vigente al crearse (RN-R5-04); los cambios de política no la alteran.
        </p>
      </section>

      <section className="detail-block">
        <h4>Depósito</h4>
        <Dato etiqueta="Estado">
          <StatusBadge tone={DEPOSITO_TONE[reserva.deposito.estado]}>{DEPOSITO_LABEL[reserva.deposito.estado]}</StatusBadge>
        </Dato>
        <Dato etiqueta="Requerido">{reserva.deposito.requeridoCentavos > 0 ? formatMoney(reserva.deposito.requeridoCentavos) : "—"}</Dato>
        <Dato etiqueta="Pagado">{reserva.deposito.pagadoCentavos > 0 ? formatMoney(reserva.deposito.pagadoCentavos) : "—"}</Dato>
      </section>

      {reserva.notas ? (
        <section className="detail-block detail-block--wide">
          <h4>Notas</h4>
          <p className="reserva-notas">{reserva.notas}</p>
        </section>
      ) : null}

      <p className="reserva-nota detail-block--wide">
        Tiempos y sellos del servidor; la bitácora es inmutable y enlaza con auditoría (RN-R5-01/02).
        {reserva.tiempos.esperaSeg != null ? ` Espera: ${formatDuration(reserva.tiempos.esperaSeg)}.` : ""}
      </p>
    </div>
  )
}
