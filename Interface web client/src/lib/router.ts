/**
 * Minimal path-based router for the combined client web app.
 * "Web Cliente — Punto C" hosts two flows at different routes:
 *   /reservas (and /)  → booking
 *   /pedidos           → orders
 *
 * Navigation between flows uses plain anchors, which trigger a full load; the
 * Vite dev/preview server falls back to index.html so any route resolves.
 */

export type ClientRoute = "booking" | "orders";

const BASE = import.meta.env.BASE_URL || "/";

function stripBase(pathname: string): string {
  let path = pathname;
  if (BASE !== "/" && path.startsWith(BASE)) path = `/${path.slice(BASE.length)}`;
  return path.replace(/\/index\.html$/, "/");
}

export function readRoute(): ClientRoute {
  const path = stripBase(window.location.pathname).toLowerCase();
  return /^\/pedidos(\/|$)/.test(path) ? "orders" : "booking";
}

export function routeHref(route: ClientRoute): string {
  const segment = route === "orders" ? "pedidos" : "reservas";
  return `${BASE.replace(/\/$/, "")}/${segment}`;
}
