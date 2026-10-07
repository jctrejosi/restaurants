import Icon from "./Icon";
import { ProgressBar, Responsible, StationTag } from "./bits";
import {
  elapsedSeconds,
  etaSeconds,
  fmtEstimate,
  fmtSeconds,
  semaforoOf,
  type Dish,
  type StationFilter,
} from "../lib/kds";

/**
 * Ficha de un plato en preparación: nombre del plato como título, tiempo
 * estimado en la esquina, lo que lleva, sus indicaciones y quién lo prepara.
 *
 * Solo informa: la pantalla es de consulta, no un panel táctil.
 */
export default function DishCard({
  dish,
  now,
  filter,
}: {
  dish: Dish;
  now: number;
  filter: StationFilter;
}) {
  const tone = semaforoOf(dish, now);
  const elapsed = elapsedSeconds(dish, now);
  const estimate = etaSeconds(dish);
  const remaining = estimate - elapsed;

  return (
    <article className={`dish dish--${tone}`}>
      <header className="dish__head">
        <div className="dish__titles">
          <h3 className="dish__name">{dish.name}</h3>
          <div className="dish__meta">
            <span className="dish__qty">{dish.quantity}×</span>
            {filter === "todas" && <StationTag id={dish.station} />}
          </div>
        </div>
        <div className="dish__timer">
          <span className="dish__eta">
            <Icon className="size-4" name="clock" />
            {fmtEstimate(dish.etaMin)}
          </span>
          <span className={`chip chip--${tone}`}>
            {tone === "vencida" && <Icon className="size-3.5" name="alert" />}
            {remaining >= 0 ? `Lleva ${fmtSeconds(elapsed)}` : `Excedido ${fmtSeconds(-remaining)}`}
          </span>
        </div>
      </header>

      <ProgressBar tone={tone} value={elapsed / estimate} />

      <div className="dish__body">
        {dish.detail && <p className="dish__detail">{dish.detail}</p>}
        {dish.includes?.length ? (
          <div className="dish__includes">
            <span className="dish__label">Lleva</span>
            {dish.includes.map((item) => (
              <span className="include" key={item}>
                {item}
              </span>
            ))}
          </div>
        ) : null}
        {dish.note && <p className="dish__note">Nota · {dish.note}</p>}
      </div>

      <footer className="dish__foot">
        <Responsible label="Prepara" name={dish.responsible} />
      </footer>
    </article>
  );
}
