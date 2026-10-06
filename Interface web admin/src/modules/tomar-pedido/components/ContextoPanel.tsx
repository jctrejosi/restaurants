import { AlertTriangle, CalendarClock, MapPin, UserRound, Users } from "lucide-react"
import { IconButton } from "@/components/ui/IconButton"
import { SelectField } from "@/components/ui/fields"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { ModalidadSelector } from "@/modules/tomar-pedido/components/ModalidadSelector"
import {
  MODALIDAD_LABEL,
  type ClienteResumen,
  type MesaCarta,
  type Mesero,
  type Modalidad,
  type TurnoCajaResumen,
} from "@/modules/tomar-pedido/types"

/** Barra de contexto: modalidad, mesa, cliente, mesero y turno de caja (plan §3). */
export function ContextoPanel({
  modalidad,
  onModalidad,
  mesa,
  avisoMesa,
  onAbrirMesa,
  cliente,
  onAbrirCliente,
  onQuitarCliente,
  meseros,
  meseroId,
  onMesero,
  comensales,
  onComensales,
  turno,
  turnoCargando = false,
}: {
  modalidad: Modalidad
  onModalidad: (modalidad: Modalidad) => void
  mesa: MesaCarta | null
  avisoMesa: string | null
  onAbrirMesa: () => void
  cliente: ClienteResumen | null
  onAbrirCliente: () => void
  onQuitarCliente: () => void
  meseros: Mesero[]
  meseroId: string | null
  onMesero: (id: string | null) => void
  comensales: number
  onComensales: (cantidad: number) => void
  turno: TurnoCajaResumen | null
  turnoCargando?: boolean
}) {
  return (
    <section className="panel tp-contexto" aria-label="Contexto del pedido">
      <div className="tp-contexto__cabecera">
        <div>
          <div className="panel__title">Contexto del pedido</div>
          <div className="panel__subtitle">La modalidad define si se asigna mesa y a dónde va el pedido</div>
        </div>
        {turnoCargando ? (
          <StatusBadge tone="gray">Consultando turno…</StatusBadge>
        ) : turno ? (
          <StatusBadge tone="green" title={`Abierto por ${turno.usuario}`}>
            Turno abierto · {turno.caja}
          </StatusBadge>
        ) : (
          <StatusBadge tone="amber" title="Puedes enviar a cocina; «Cobrar» queda bloqueado (V1)">
            Sin turno de caja
          </StatusBadge>
        )}
      </div>

      <ModalidadSelector value={modalidad} onChange={onModalidad} />

      <div className="tp-contexto__campos">
        {modalidad === "mesa" ? (
          <div className="tp-contexto__campo">
            <span className="field__label">Mesa</span>
            <button
              type="button"
              className={`button tp-picker-btn ${mesa ? "" : "tp-picker-btn--vacio"}`}
              onClick={onAbrirMesa}
            >
              <MapPin size={14} />
              {mesa ? `Mesa ${mesa.numero} · ${mesa.zona}` : "Elegir mesa"}
            </button>
          </div>
        ) : (
          <div className="tp-contexto__campo">
            <span className="field__label">Mesa</span>
            <span className="tp-contexto__no-aplica">No aplica para {MODALIDAD_LABEL[modalidad]}</span>
          </div>
        )}

        <div className="tp-contexto__campo">
          <span className="field__label">Cliente (opcional)</span>
          <span className="tp-contexto__cliente">
            <button
              type="button"
              className={`button tp-picker-btn ${cliente ? "" : "tp-picker-btn--vacio"}`}
              onClick={onAbrirCliente}
            >
              <UserRound size={14} />
              {cliente ? cliente.nombre : "Público general"}
            </button>
            {cliente ? (
              <IconButton label="Quitar cliente" onClick={onQuitarCliente}>
                ×
              </IconButton>
            ) : null}
          </span>
        </div>

        <SelectField
          label="Mesero"
          options={meseros
            .filter((mesero) => mesero.enTurno)
            .map((mesero) => ({ value: mesero.id, label: `${mesero.nombre} · ${mesero.rol}` }))}
          placeholder={modalidad === "mesa" ? "Sin asignar" : "Mostrador"}
          value={meseroId ?? ""}
          onChange={(event) => onMesero(event.target.value || null)}
        />

        <div className="tp-contexto__campo">
          <span className="field__label">
            <Users size={12} /> Comensales
          </span>
          <span className="tp-stepper">
            <IconButton
              label="Menos comensales"
              className="tp-stepper__btn"
              disabled={comensales <= 1}
              onClick={() => onComensales(comensales - 1)}
            >
              −
            </IconButton>
            <span className="tp-stepper__valor">{comensales}</span>
            <IconButton
              label="Más comensales"
              className="tp-stepper__btn"
              disabled={comensales >= 30}
              onClick={() => onComensales(comensales + 1)}
            >
              +
            </IconButton>
          </span>
        </div>
      </div>

      {avisoMesa ? (
        <p className="tp-contexto__aviso">
          <AlertTriangle size={14} /> {avisoMesa}
        </p>
      ) : null}

      {!turnoCargando && !turno ? (
        <p className="tp-contexto__aviso tp-contexto__aviso--suave">
          <CalendarClock size={14} /> Sin turno abierto puedes enviar a cocina, pero «Cobrar (V1)» está bloqueado
          hasta que Caja abra el turno.
        </p>
      ) : null}
    </section>
  )
}
