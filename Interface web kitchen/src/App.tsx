import { useEffect, useMemo, useRef, useState } from "react";
import DishCard from "./components/DishCard";
import HistoryDrawer from "./components/HistoryDrawer";
import Icon from "./components/Icon";
import QueueCard from "./components/QueueCard";
import {
  STATIONS,
  STATION_BY_ID,
  buildDemoDishes,
  fmtClock,
  type Dish,
  type StationFilter,
  type StationId,
} from "./lib/kds";

/**
 * Panel de cocina **de consulta**:
 *
 *  - arriba, «En cola» en una sola fila: una ficha mínima por plato por
 *    preparar (cantidad, plato, estación y tiempo estimado), en el orden que
 *    decide el backend;
 *  - abajo, una ficha por plato en preparación (nombre, tiempo estimado,
 *    detalles, lo que lleva y quién lo está haciendo).
 *
 * No hay acciones en pantalla y nada hace scroll: todo se ajusta al alto del
 * panel. Cada pantalla se deja fija con `?estacion=parrilla` (o «Todas») y
 * recuerda la última estación usada.
 */
function initialFilter(): StationFilter {
  try {
    const candidate =
      new URLSearchParams(window.location.search).get("estacion") ??
      window.localStorage.getItem("kds-estacion");
    if (candidate === "todas") return "todas";
    if (candidate && STATIONS.some((station) => station.id === candidate)) {
      return candidate as StationId;
    }
  } catch {
    /* sin URL ni almacenamiento disponibles */
  }
  return "todas";
}

/** La barra superior puede quedar oculta (pantalla de pared) y se recupera con
 * el botón flotante. Se recuerda la preferencia entre recargas. */
function readHeaderPref(): boolean {
  try {
    return window.localStorage.getItem("kds-barra") !== "oculta";
  } catch {
    return true;
  }
}

export default function App() {
  const dishes = useMemo<Dish[]>(() => buildDemoDishes(), []);
  const [station, setStation] = useState<StationFilter>(initialFilter);
  const [headerOpen, setHeaderOpen] = useState(readHeaderPref);
  const [now, setNow] = useState(() => Date.now());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  /** Platos que no caben en la fila de la cola (se avisan con una flecha). */
  const [queueOverflow, setQueueOverflow] = useState(0);
  const queueListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!historyOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHistoryOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [historyOpen]);

  useEffect(() => {
    window.localStorage.setItem("kds-estacion", station);
  }, [station]);

  useEffect(() => {
    window.localStorage.setItem("kds-barra", headerOpen ? "visible" : "oculta");
  }, [headerOpen]);

  const inView = (dish: Dish) => station === "todas" || dish.station === station;

  /* Sin reordenar: el backend decide el orden de preparación. */
  const pending = dishes.filter((dish) => dish.status === "pending" && inView(dish));
  const preparing = dishes.filter((dish) => dish.status === "preparing" && inView(dish));
  const finished = dishes.filter((dish) => dish.status === "delivered");
  const active = dishes.filter((dish) => dish.status !== "delivered");

  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    } catch {
      /* pantalla completa no disponible */
    }
  };

  const loadFor = (id: StationId) => active.filter((dish) => dish.station === id).length;
  const currentStation = station === "todas" ? null : STATION_BY_ID[station];

  /* La fila de la cola no hace scroll: si algo queda fuera, lo avisa la flecha. */
  useEffect(() => {
    const list = queueListRef.current;
    if (!list) return;

    const measure = () => {
      const cards = Array.from(list.querySelectorAll<HTMLElement>(".queue-item"));
      const limit = list.clientWidth;
      const fits = (reserve: number) =>
        cards.filter((card) => card.offsetLeft + card.offsetWidth <= limit - reserve).length;
      /* Primero contamos lo que cabe sin reservar; si sobra algo, recalculamos
       * dejando sitio para la flecha, para que ninguna ficha quede tapada a
       * medias por el degradado (títulos nunca cortados). */
      let fit = fits(0);
      if (fit < cards.length) fit = fits(110);
      cards.forEach((card, index) => {
        card.style.visibility = index < fit ? "" : "hidden";
      });
      setQueueOverflow(cards.length - fit);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    void document.fonts.ready.then(measure).catch(() => {});
    return () => observer.disconnect();
  }, [pending.length, station]);

  return (
    <main className={`kds ${headerOpen ? "" : "kds--sin-barra"}`}>
      <header
        aria-hidden={!headerOpen}
        className={`topbar ${headerOpen ? "" : "topbar--hidden"}`}
        inert={!headerOpen}
      >
        <div className="brand">
          <div className="brand__mark">PC</div>
          <div>
            <div className="brand__name">Cocina</div>
            <div className="brand__sub">
              Punto C · {currentStation ? `Pantalla ${currentStation.name}` : "Todas las estaciones"}
            </div>
          </div>
        </div>

        <nav aria-label="Estación" className="stations">
          <button
            aria-pressed={station === "todas"}
            className={`station ${station === "todas" ? "station--on" : ""}`}
            onClick={() => setStation("todas")}
            title="Todos los platos del restaurante"
            type="button"
          >
            Todas
            <span className="station__count">{active.length}</span>
          </button>
          {STATIONS.map((item) => (
            <button
              aria-pressed={station === item.id}
              className={`station ${station === item.id ? "station--on" : ""}`}
              key={item.id}
              onClick={() => setStation(item.id)}
              title={`Platos pendientes en ${item.name}`}
              type="button"
            >
              {item.name}
              <span className="station__count">{loadFor(item.id)}</span>
            </button>
          ))}
        </nav>

        <div className="topbar__actions">
          <div className="live">
            <span className="live__dot" />
            <div>
              <strong>En vivo</strong>
              <small>{fmtClock(now)} · turno comida</small>
            </div>
          </div>

          <button
            className="icon-btn"
            onClick={toggleFullscreen}
            title={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            type="button"
          >
            <Icon name={fullscreen ? "minimize" : "expand"} />
          </button>

          <button className="btn btn--secondary" onClick={() => setHistoryOpen(true)} type="button">
            <Icon className="size-4" name="history" />
            Terminados
            <span className="badge">{finished.length}</span>
          </button>

          <button
            className="icon-btn"
            onClick={() => setHeaderOpen(false)}
            title="Ocultar barra"
            type="button"
          >
            <Icon className="chev chev--up size-4" name="chevron" />
          </button>
        </div>
      </header>

      {!headerOpen && (
        <button
          className="header-peek"
          onClick={() => setHeaderOpen(true)}
          title="Mostrar barra"
          type="button"
        >
          <Icon className="chev chev--down size-4" name="chevron" />
          Barra
        </button>
      )}

      <section className="board">
        <section aria-label="Platos en cola" className="zone zone--queue">
          <div className="queue-band">
            <div className="queue-band__label">
              En cola
              <span className="count">{pending.length}</span>
            </div>
            <div className="queue-band__list" ref={queueListRef}>
              {pending.map((dish) => (
                <QueueCard dish={dish} filter={station} key={dish.id} />
              ))}
              {!pending.length && <p className="queue-band__empty">Nada en cola</p>}
            </div>
            {queueOverflow > 0 && (
              <div aria-hidden="true" className="queue-more">
                <span className="queue-more__arrow">
                  <Icon className="size-4" name="chevron" />
                </span>
                <span className="queue-more__count">+{queueOverflow}</span>
              </div>
            )}
          </div>
        </section>

        <section aria-label="Platos en preparación" className="zone zone--prep">
          <header className="zone__head">
            <div>
              <div className="zone__title">
                <span className="dot dot--amber" />
                En preparación
                <span className="count">{preparing.length}</span>
              </div>
              <div className="zone__hint">
                {currentStation ? `Solo ${currentStation.name}` : "Todas las estaciones"}
              </div>
            </div>
          </header>
          <div className="zone__body zone__body--grid">
            {preparing.map((dish) => (
              <DishCard dish={dish} filter={station} key={dish.id} now={now} />
            ))}
            {!preparing.length && (
              <div className="empty">
                <Icon className="size-7" name="check" />
                <strong>Nada en el fuego</strong>
                <span>Cuando arranque un plato aparece aquí.</span>
              </div>
            )}
          </div>
        </section>
      </section>

      {historyOpen && <HistoryDrawer dishes={finished} onClose={() => setHistoryOpen(false)} />}
    </main>
  );
}
