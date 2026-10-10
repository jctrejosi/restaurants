import { useEffect, useState } from "react";
import BookingApp from "./booking/App";
import OrdersApp from "./orders/App";
import { readRoute, type ClientRoute } from "./lib/router";

/** Document titles per flow (the static title comes from .figma/make/site.json). */
const TITLES: Record<ClientRoute, string> = {
  booking: "Reserva · Punto C",
  orders: "Órdenes · Punto C",
};

/**
 * Mounts one of the two client flows (reservas / pedidos) based on the URL.
 * Each flow keeps its own scoped stylesheet, so they never collide.
 */
export default function ClientApp() {
  const [route, setRoute] = useState<ClientRoute>(() => readRoute());

  useEffect(() => {
    const sync = () => setRoute(readRoute());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    document.title = TITLES[route];
  }, [route]);

  if (route === "orders") {
    return <div className="app-scope-orders" style={{ minHeight: "100vh" }}><OrdersApp /></div>;
  }
  return <div className="app-scope-booking" style={{ minHeight: "100vh" }}><BookingApp /></div>;
}
