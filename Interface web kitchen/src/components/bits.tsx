import { STATION_BY_ID, initials, type Semaforo, type StationId } from "../lib/kds";

/** Etiqueta de estación con el tono del admin (Parrilla, Fríos, Barra…). */
export function StationTag({ id }: { id: StationId }) {
  const station = STATION_BY_ID[id];
  return <span className={`tag tag--${station.tone}`}>{station.name}</span>;
}

/** Quién lo está preparando: iniciales + nombre. */
export function Responsible({ name, label }: { name?: string; label?: string }) {
  return (
    <span className="responsible">
      {label ? <span className="dish__label">{label}</span> : null}
      {name ? (
        <>
          <i className="responsible__initials">{initials(name)}</i>
          <span className="responsible__name">{name}</span>
        </>
      ) : (
        <span className="responsible__name responsible__name--none">Sin asignar</span>
      )}
    </span>
  );
}

/** Barra de avance contra el tiempo estimado: verde → ámbar → rojo. */
export function ProgressBar({ value, tone }: { value: number; tone: Semaforo }) {
  return (
    <div className="progress" role="presentation">
      <span
        className={`progress__fill progress__fill--${tone}`}
        style={{ width: `${Math.min(100, Math.max(2, value * 100))}%` }}
      />
    </div>
  );
}
