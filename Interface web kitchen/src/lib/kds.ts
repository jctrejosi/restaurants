/**
 * Modelo del panel de cocina.
 *
 * La unidad de trabajo es el **plato** (no la comanda): qué hay que preparar,
 * cuánto se estima que demora, qué lleva y quién lo está haciendo. La pantalla
 * no conoce mesas, folios ni datos técnicos del pedido.
 *
 * El orden de los platos por preparar lo define el backend; la pantalla solo
 * los pinta en el orden en que llegan.
 */

export type StationId = "parrilla" | "fritura" | "frios" | "postres" | "barra";

/** Vista del panel: una estación concreta o la pantalla única de todas. */
export type StationFilter = StationId | "todas";

export type Tone = "brand" | "amber" | "leaf" | "blue" | "purple" | "gray";

/** Semáforo contra el tiempo estimado de preparación. */
export type Semaforo = "normal" | "por_vencer" | "vencida";

export type DishStatus = "pending" | "preparing" | "delivered";

export type Dish = {
  id: string;
  name: string;
  quantity: number;
  station: StationId;
  /** Tiempo estimado de preparación, en minutos (lo calcula el backend). */
  etaMin: number;
  /** Indicación del comensal: término, tamaño, punto. */
  detail?: string;
  /** Componentes que salen con el plato: papas, ensalada, arroz… */
  includes?: string[];
  /** Observación que cambia la preparación. */
  note?: string;
  status: DishStatus;
  /** Quién lo está preparando. */
  responsible?: string;
  startedAt?: number;
  deliveredAt?: number;
};

/* -------------------------------------------------------------------------- */
/* Estaciones                                                                  */
/* -------------------------------------------------------------------------- */

export const STATIONS: { id: StationId; name: string; tone: Tone }[] = [
  { id: "parrilla", name: "Parrilla", tone: "brand" },
  { id: "fritura", name: "Fritura", tone: "amber" },
  { id: "frios", name: "Fríos", tone: "blue" },
  { id: "postres", name: "Postres", tone: "purple" },
  { id: "barra", name: "Barra", tone: "leaf" },
];

export const STATION_BY_ID: Record<StationId, (typeof STATIONS)[number]> = Object.fromEntries(
  STATIONS.map((station) => [station.id, station]),
) as Record<StationId, (typeof STATIONS)[number]>;

/* -------------------------------------------------------------------------- */
/* Tiempo                                                                      */
/* -------------------------------------------------------------------------- */

export function etaSeconds(dish: Dish): number {
  return dish.etaMin * 60;
}

export function elapsedSeconds(dish: Dish, now: number): number {
  return dish.startedAt ? Math.max(0, Math.floor((now - dish.startedAt) / 1000)) : 0;
}

export function remainingSeconds(dish: Dish, now: number): number {
  return etaSeconds(dish) - elapsedSeconds(dish, now);
}

export function semaforoOf(dish: Dish, now: number): Semaforo {
  const remaining = remainingSeconds(dish, now);
  if (remaining < 0) return "vencida";
  if (remaining <= Math.max(60, etaSeconds(dish) * 0.25)) return "por_vencer";
  return "normal";
}

export const SEMAFORO_LABEL: Record<Semaforo, string> = {
  normal: "En tiempo",
  por_vencer: "Por vencer",
  vencida: "Vencida",
};

/** Tiempo real de preparación (inicio → entrega). */
export function realSeconds(dish: Dish): number | null {
  return dish.startedAt && dish.deliveredAt
    ? Math.round((dish.deliveredAt - dish.startedAt) / 1000)
    : null;
}

export function fmtSeconds(total: number): string {
  const value = Math.max(0, Math.floor(total));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function fmtClock(ms: number): string {
  return new Date(ms).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** «≈8 min», o «≈1 h 15 min» para estimados largos. */
export function fmtEstimate(minutes: number): string {
  if (minutes < 60) return `≈${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `≈${hours} h ${rest} min` : `≈${hours} h`;
}

/* -------------------------------------------------------------------------- */
/* Personas                                                                    */
/* -------------------------------------------------------------------------- */

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/* -------------------------------------------------------------------------- */
/* Datos de demostración                                                       */
/* -------------------------------------------------------------------------- */

const MINUTE = 60_000;

/**
 * Platos del turno. El orden de los `pending` es el que devuelve el backend
 * (prioriza cocciones largas y reparte la carga por estación): la pantalla no
 * reordena nada.
 */
export function buildDemoDishes(): Dish[] {
  const now = Date.now();
  const ago = (minutes: number) => now - minutes * MINUTE;

  return [
    /* ---- Por preparar (orden definido por el backend) ---- */
    {
      id: "p1",
      name: "Corte del día",
      quantity: 1,
      station: "parrilla",
      etaMin: 9,
      detail: "1/2 · Salsa aparte",
      includes: ["Puré de papa", "Verduras"],
      status: "pending",
    },
    {
      id: "p2",
      name: "Arrachera",
      quantity: 1,
      station: "parrilla",
      etaMin: 8,
      detail: "Tres cuartos",
      includes: ["Papas gajo", "Guacamole"],
      status: "pending",
    },
    {
      id: "p3",
      name: "Papas gajo",
      quantity: 2,
      station: "fritura",
      etaMin: 5,
      includes: ["Sal marina"],
      status: "pending",
    },
    {
      id: "p4",
      name: "Tacos de arrachera",
      quantity: 3,
      station: "parrilla",
      etaMin: 5,
      includes: ["Cebollitas", "Salsa verde"],
      status: "pending",
    },
    {
      id: "p5",
      name: "Ensalada de la casa",
      quantity: 1,
      station: "frios",
      etaMin: 3,
      detail: "Sin aderezo",
      includes: ["Lechuga", "Tomate", "Aguacate"],
      status: "pending",
    },
    {
      id: "p6",
      name: "Brownie",
      quantity: 1,
      station: "postres",
      etaMin: 2,
      includes: ["Helado de vainilla"],
      note: "Para compartir",
      status: "pending",
    },
    {
      id: "p7",
      name: "Guacamole",
      quantity: 1,
      station: "frios",
      etaMin: 3,
      includes: ["Totopos"],
      status: "pending",
    },
    {
      id: "p8",
      name: "Michelada",
      quantity: 2,
      station: "barra",
      etaMin: 3,
      detail: "Sin clamato",
      status: "pending",
    },
    {
      id: "p9",
      name: "Cerveza artesanal",
      quantity: 2,
      station: "barra",
      etaMin: 1,
      status: "pending",
    },
    {
      id: "p10",
      name: "Cebollitas asadas",
      quantity: 1,
      station: "parrilla",
      etaMin: 3,
      includes: ["Limón"],
      status: "pending",
    },

    /* ---- En preparación ---- */
    {
      id: "c1",
      name: "Hamburguesa Punto C",
      quantity: 2,
      station: "parrilla",
      etaMin: 6,
      detail: "Tres cuartos",
      includes: ["Papas a la francesa"],
      note: "Sin cebolla",
      status: "preparing",
      responsible: "Luis",
      startedAt: ago(7.4),
    },
    {
      id: "c2",
      name: "Rib eye 400 g",
      quantity: 1,
      station: "parrilla",
      etaMin: 8,
      detail: "Término medio",
      includes: ["Papas trufadas"],
      status: "preparing",
      responsible: "Sofía",
      startedAt: ago(4.1),
    },
    {
      id: "c3",
      name: "Salmón a las brasas",
      quantity: 1,
      station: "parrilla",
      etaMin: 7,
      detail: "Bien cocido",
      includes: ["Vegetales asados"],
      status: "preparing",
      responsible: "Carlos",
      startedAt: ago(5.6),
    },
    {
      id: "c4",
      name: "Papas trufadas",
      quantity: 2,
      station: "fritura",
      etaMin: 5,
      includes: ["Parmesano"],
      note: "Sin parmesano",
      status: "preparing",
      responsible: "Ana",
      startedAt: ago(3.4),
    },
    {
      id: "c5",
      name: "Ensalada de la casa",
      quantity: 1,
      station: "frios",
      etaMin: 3,
      detail: "Sin aderezo",
      includes: ["Lechuga", "Tomate", "Aguacate", "Aderezo aparte"],
      status: "preparing",
      responsible: "Mariana",
      startedAt: ago(1.6),
    },
    {
      id: "c6",
      name: "Flan de la casa",
      quantity: 1,
      station: "postres",
      etaMin: 2,
      includes: ["Caramelo"],
      status: "preparing",
      responsible: "Diego",
      startedAt: ago(0.8),
    },
    {
      id: "c7",
      name: "Limonada",
      quantity: 3,
      station: "barra",
      etaMin: 2,
      detail: "Sin azúcar",
      status: "preparing",
      responsible: "Mariana",
      startedAt: ago(1.1),
    },

    /* ---- Terminados en el turno (consulta) ---- */
    {
      id: "t1",
      name: "Carne de res",
      quantity: 2,
      station: "parrilla",
      etaMin: 9,
      detail: "Término medio",
      includes: ["Papas", "Ensalada"],
      status: "delivered",
      responsible: "Sofía",
      startedAt: ago(38),
      deliveredAt: ago(29.5),
    },
    {
      id: "t2",
      name: "Hamburguesa Punto C",
      quantity: 1,
      station: "parrilla",
      etaMin: 6,
      detail: "Tres cuartos",
      includes: ["Papas a la francesa"],
      status: "delivered",
      responsible: "Luis",
      startedAt: ago(52),
      deliveredAt: ago(42),
    },
    {
      id: "t3",
      name: "Guacamole",
      quantity: 1,
      station: "frios",
      etaMin: 3,
      includes: ["Totopos"],
      status: "delivered",
      responsible: "Mariana",
      startedAt: ago(64),
      deliveredAt: ago(61),
    },
    {
      id: "t4",
      name: "Tacos de arrachera",
      quantity: 2,
      station: "parrilla",
      etaMin: 5,
      includes: ["Cebollitas", "Salsa verde"],
      status: "delivered",
      responsible: "Carlos",
      startedAt: ago(78),
      deliveredAt: ago(72),
    },
    {
      id: "t5",
      name: "Cerveza artesanal",
      quantity: 2,
      station: "barra",
      etaMin: 1,
      status: "delivered",
      responsible: "Diego",
      startedAt: ago(96),
      deliveredAt: ago(95),
    },
    {
      id: "t6",
      name: "Salmón a las brasas",
      quantity: 1,
      station: "parrilla",
      etaMin: 7,
      detail: "Bien cocido",
      includes: ["Vegetales asados"],
      status: "delivered",
      responsible: "Sofía",
      startedAt: ago(110),
      deliveredAt: ago(101),
    },
  ];
}
