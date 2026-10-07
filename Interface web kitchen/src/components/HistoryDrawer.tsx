import { useMemo, useState, type ReactNode } from "react";
import Icon from "./Icon";
import { StationTag } from "./bits";
import {
  STATIONS,
  etaSeconds,
  fmtClock,
  fmtSeconds,
  realSeconds,
  type Dish,
  type StationId,
} from "../lib/kds";

type HistFilter = StationId | "todas";

/**
 * Platos terminados del turno: fuera del tablero, pero consultables con su
 * tiempo real contra el estimado y quién los preparó.
 */
export default function HistoryDrawer({
  dishes,
  onClose,
}: {
  dishes: Dish[];
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<HistFilter>("todas");

  const rows = useMemo(
    () =>
      dishes
        .filter((dish) => filter === "todas" || dish.station === filter)
        .sort((a, b) => (b.deliveredAt ?? 0) - (a.deliveredAt ?? 0)),
    [dishes, filter],
  );

  const reals = rows
    .map((dish) => realSeconds(dish))
    .filter((value): value is number => value !== null);
  const onTime = rows.filter((dish) => {
    const real = realSeconds(dish);
    return real !== null && real <= etaSeconds(dish);
  }).length;
  const average = reals.length
    ? Math.round(reals.reduce((sum, value) => sum + value, 0) / reals.length)
    : 0;

  return (
    <>
      <button aria-label="Cerrar terminados" className="backdrop" onClick={onClose} type="button" />
      <aside aria-label="Platos terminados" className="drawer" role="dialog">
        <header className="drawer__head">
          <div>
            <div className="drawer__title">Terminados</div>
            <div className="drawer__sub">Turno comida · hoy</div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Cerrar" type="button">
            <Icon name="close" />
          </button>
        </header>

        <div className="hist-kpis">
          <Stat label="Platos" value={String(rows.length)} />
          <Stat
            label="Cumplimiento"
            tone={rows.length && onTime / rows.length < 0.8 ? "is-late" : "is-ok"}
            value={`${rows.length ? Math.round((onTime / rows.length) * 100) : 0}%`}
          />
          <Stat label="Promedio" value={fmtSeconds(average)} />
        </div>

        <div className="hist-filter">
          <button
            className={`chip chip--select ${filter === "todas" ? "chip--select-on" : ""}`}
            onClick={() => setFilter("todas")}
            type="button"
          >
            Todas
          </button>
          {STATIONS.map((station) => (
            <button
              className={`chip chip--select ${filter === station.id ? "chip--select-on" : ""}`}
              key={station.id}
              onClick={() => setFilter(station.id)}
              type="button"
            >
              {station.name}
            </button>
          ))}
        </div>

        <div className="drawer__body">
          {rows.map((dish) => {
            const real = realSeconds(dish);
            const late = real !== null && real > etaSeconds(dish);
            return (
              <article className="hist-row" key={dish.id}>
                <header className="hist-row__head">
                  <span className="hist-row__name">{dish.name}</span>
                  <span className="hist-row__qty">{dish.quantity}×</span>
                  <span className={`chip ${late ? "chip--vencida" : "chip--leaf"}`}>
                    {late ? "Excedido" : "En tiempo"}
                  </span>
                </header>
                <div className="hist-row__meta">
                  <span>
                    Terminado {dish.deliveredAt ? fmtClock(dish.deliveredAt) : "—"}
                    {dish.responsible ? ` · ${dish.responsible}` : ""}
                  </span>
                  <span className="hist-row__duration">
                    {real !== null ? fmtSeconds(real) : "—"}
                    <small> estimado {dish.etaMin} min</small>
                  </span>
                </div>
                <div className="hist-row__tags">
                  <StationTag id={dish.station} />
                  {dish.detail && <span className="tag tag--ghost">{dish.detail}</span>}
                  {dish.includes?.length ? (
                    <span className="tag tag--ghost">{dish.includes.join(" · ")}</span>
                  ) : null}
                </div>
              </article>
            );
          })}

          {!rows.length && (
            <div className="empty">
              <Icon className="size-7" name="history" />
              <strong>Sin platos terminados</strong>
              <span>Aquí queda lo del turno.</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Stat({
  label,
  value,
  tone = "",
}: {
  label: string;
  value: string;
  tone?: "" | "is-ok" | "is-late";
}): ReactNode {
  return (
    <div className="hist-stat">
      <span className="hist-stat__label">{label}</span>
      <strong className={`hist-stat__value ${tone}`}>{value}</strong>
    </div>
  );
}
