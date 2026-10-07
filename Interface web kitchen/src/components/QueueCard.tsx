import { StationTag } from "./bits";
import { fmtEstimate, type Dish, type StationFilter } from "../lib/kds";

/**
 * Ficha mínima de la cola, en una sola línea: cantidad, plato, estación (solo
 * en la vista de todas las estaciones) y tiempo estimado.
 */
export default function QueueCard({ dish, filter }: { dish: Dish; filter: StationFilter }) {
  return (
    <article className="queue-item">
      <span className="queue-item__qty">{dish.quantity}×</span>
      <span className="queue-item__name">{dish.name}</span>
      {filter === "todas" && <StationTag id={dish.station} />}
      <span className="queue-item__eta">{fmtEstimate(dish.etaMin)}</span>
    </article>
  );
}
