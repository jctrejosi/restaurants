import { useEffect, useState, type ReactNode } from "react";

type Status = "queued" | "preparing" | "ready";
type TimerTone = "normal" | "warning" | "overdue";

type Line = {
  id: number;
  quantity: number;
  name: string;
  detail?: string;
  note?: string;
  ready?: boolean;
};

type Order = {
  id: number;
  table: string;
  waiter: string;
  received: string;
  elapsed: string;
  status: Status;
  timerTone: TimerTone;
  promised?: string;
  readyAt?: string;
  shared?: string;
  lines: Line[];
};

const initialOrders: Order[] = [
  {
    id: 1038,
    table: "Mesa 8",
    waiter: "Sofía",
    received: "13:31",
    elapsed: "+02:35",
    status: "queued",
    timerTone: "overdue",
    lines: [
      { id: 1, quantity: 2, name: "Rib eye 400 g", detail: "Término medio" },
      { id: 2, quantity: 1, name: "Papas trufadas", note: "Sin parmesano" },
    ],
  },
  {
    id: 1043,
    table: "Para recoger · #20",
    waiter: "Mostrador",
    received: "13:44",
    elapsed: "07:42",
    status: "queued",
    timerTone: "warning",
    promised: "Para las 14:00",
    lines: [
      { id: 1, quantity: 1, name: "Arrachera", detail: "Tres cuartos" },
      { id: 2, quantity: 1, name: "Papas gajo", note: "Empaque aparte" },
    ],
  },
  {
    id: 1046,
    table: "Mesa 5",
    waiter: "Carlos",
    received: "13:47",
    elapsed: "04:18",
    status: "queued",
    timerTone: "normal",
    shared: "Fríos",
    lines: [
      { id: 1, quantity: 2, name: "Hamburguesa Punto C", detail: "Una sin queso" },
    ],
  },
  {
    id: 1042,
    table: "Mesa 12",
    waiter: "Ana",
    received: "13:41",
    elapsed: "11:08",
    status: "preparing",
    timerTone: "warning",
    shared: "Barra",
    lines: [
      {
        id: 1,
        quantity: 2,
        name: "Hamburguesa Punto C",
        detail: "Término: tres cuartos",
        note: "Sin cebolla",
      },
      {
        id: 2,
        quantity: 1,
        name: "Arrachera",
        detail: "Con guarnición de papas",
        ready: true,
      },
      { id: 3, quantity: 1, name: "Corte del día", note: "1/2 · Salsa aparte" },
    ],
  },
  {
    id: 1047,
    table: "Mesa 3",
    waiter: "Mariana",
    received: "13:45",
    elapsed: "06:21",
    status: "preparing",
    timerTone: "normal",
    lines: [
      { id: 1, quantity: 1, name: "Salmón a las brasas", detail: "Bien cocido" },
      { id: 2, quantity: 2, name: "Vegetales asados", ready: true },
    ],
  },
  {
    id: 1041,
    table: "Mesa 4",
    waiter: "Luis",
    received: "13:38",
    elapsed: "03:12",
    status: "ready",
    timerTone: "normal",
    readyAt: "13:49",
    lines: [
      { id: 1, quantity: 2, name: "Ensalada de la casa", detail: "Sin aderezo", ready: true },
    ],
  },
  {
    id: 1040,
    table: "Mesa 16",
    waiter: "Diego",
    received: "13:35",
    elapsed: "05:46",
    status: "ready",
    timerTone: "warning",
    readyAt: "13:47",
    lines: [
      { id: 1, quantity: 3, name: "Tacos de arrachera", ready: true },
      { id: 2, quantity: 1, name: "Orden de cebollitas", ready: true },
    ],
  },
];

function Icon({
  name,
  className = "size-5",
}: {
  name: "alert" | "check" | "clock" | "gear" | "history" | "package" | "signal" | "volume";
  className?: string;
}) {
  const paths: Record<typeof name, ReactNode> = {
    alert: (
      <>
        <path d="M12 3 2.8 19a1.4 1.4 0 0 0 1.2 2h16a1.4 1.4 0 0 0 1.2-2L12 3Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    gear: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    package: (
      <>
        <path d="m4 7 8-4 8 4-8 4-8-4ZM4 7v10l8 4 8-4V7M12 11v10" />
      </>
    ),
    signal: (
      <>
        <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
        <circle cx="12" cy="19" r="1" />
      </>
    ),
    volume: (
      <>
        <path d="M11 5 6 9H3v6h3l5 4V5ZM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function Button({
  children,
  className = "",
  onClick,
  title,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      className={`cursor-pointer rounded-lg font-semibold transition active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kds-text ${className}`}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function Ticket({
  order,
  onTake,
  onToggleLine,
  onReady,
  onDeliver,
}: {
  order: Order;
  onTake: () => void;
  onToggleLine: (lineId: number) => void;
  onReady: () => void;
  onDeliver: () => void;
}) {
  const complete = order.lines.filter((line) => line.ready).length;
  const remaining = order.lines.length - complete;
  const stateLabel =
    order.status === "queued" ? "En cola" : order.status === "preparing" ? "En preparación" : "Lista";

  return (
    <article className={`ticket ticket-${order.status} ${order.timerTone === "overdue" ? "ticket-overdue" : ""}`}>
      {order.promised && <div className="priority-flag">{order.promised}</div>}
      <div className="flex items-start justify-between gap-3 border-b border-kds-border px-4 py-3">
        <div>
          <div className="font-display text-3xl leading-none font-semibold tracking-tight">
            #{order.id}
          </div>
          <div className="mt-1.5 text-lg font-bold text-kds-text">{order.table}</div>
        </div>
        <div className="text-right">
          <div className={`timer timer-${order.timerTone}`}>
            {order.timerTone === "overdue" ? "Excedido " : ""}
            {order.elapsed}
          </div>
          <div className="mt-1 text-xs font-bold tracking-wide text-kds-dim uppercase">{stateLabel}</div>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-kds-border px-4 py-2 text-sm text-kds-dim">
        <span>{order.waiter}</span>
        <span>Recibida {order.received}</span>
      </div>

      <div className="divide-y divide-kds-border">
        {order.lines.map((line) => (
          <div
            className={`flex min-h-16 gap-3 px-4 py-3 ${line.ready ? "line-ready" : ""}`}
            key={line.id}
          >
            {order.status === "preparing" && (
              <Button
                className={`line-check ${line.ready ? "line-check-active" : ""}`}
                onClick={() => onToggleLine(line.id)}
                title={line.ready ? "Marcar como pendiente" : "Marcar como lista"}
              >
                {line.ready && <Icon className="size-5" name="check" />}
              </Button>
            )}
            {order.status === "ready" && (
              <span className="line-check line-check-active">
                <Icon className="size-5" name="check" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex gap-2 text-lg leading-snug font-semibold">
                <span className="text-state-preparing">{line.quantity}×</span>
                <span>{line.name}</span>
              </div>
              {line.detail && <div className="mt-1 text-sm text-kds-dim">{line.detail}</div>}
              {line.note && <div className="mt-1 text-sm font-semibold text-state-preparing">Nota: {line.note}</div>}
            </div>
          </div>
        ))}
      </div>

      {(order.shared || order.readyAt) && (
        <div className="border-t border-kds-border px-4 py-2 text-sm font-medium text-kds-dim">
          {order.shared ? `Comparte con ${order.shared}` : `Lista desde las ${order.readyAt}`}
        </div>
      )}

      <div className="p-3">
        {order.status === "queued" && (
          <Button className="action action-queued" onClick={onTake}>
            Tomar comanda
          </Button>
        )}
        {order.status === "preparing" && (
          <Button className="action action-preparing" onClick={onReady}>
            <span>Todo listo</span>
            <span className="text-sm font-medium opacity-75">
              {remaining ? `Faltan ${remaining} de ${order.lines.length}` : "Comanda completa"}
            </span>
          </Button>
        )}
        {order.status === "ready" && (
          <Button className="action action-ready" onClick={onDeliver}>
            <Icon className="size-5" name="check" />
            Entregar
          </Button>
        )}
      </div>
    </article>
  );
}

const columns: { status: Status; label: string; subtitle: string }[] = [
  { status: "queued", label: "En cola", subtitle: "Por antigüedad" },
  { status: "preparing", label: "En preparación", subtitle: "Trabajando ahora" },
  { status: "ready", label: "Listas", subtitle: "Esperando recogida" },
];

export default function App() {
  const [orders, setOrders] = useState(initialOrders);
  const [clock, setClock] = useState(new Date());
  const [toast, setToast] = useState("");
  const [alertMuted, setAlertMuted] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateStatus = (id: number, status: Status) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === id
          ? {
              ...order,
              status,
              timerTone: status === "ready" ? "normal" : order.timerTone,
              readyAt:
                status === "ready"
                  ? clock.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
                  : order.readyAt,
              lines:
                status === "ready" ? order.lines.map((line) => ({ ...line, ready: true })) : order.lines,
            }
          : order,
      ),
    );
  };

  const deliver = (id: number) => {
    setOrders((current) => current.filter((order) => order.id !== id));
    setToast(`Comanda #${id} entregada`);
  };

  const toggleLine = (orderId: number, lineId: number) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              lines: order.lines.map((line) =>
                line.id === lineId ? { ...line, ready: !line.ready } : line,
              ),
            }
          : order,
      ),
    );
  };

  const counts = {
    queued: orders.filter((order) => order.status === "queued").length,
    preparing: orders.filter((order) => order.status === "preparing").length,
    ready: orders.filter((order) => order.status === "ready").length,
  };
  const overdue = orders.filter((order) => order.timerTone === "overdue");

  return (
    <main className="flex h-screen min-h-[700px] flex-col overflow-hidden bg-kds-bg text-kds-text">
      <header className="shrink-0 border-b border-kds-border bg-kds-surface">
        <div className="flex h-20 items-center gap-5 px-5">
          <div className="flex min-w-64 items-center gap-3">
            <div className="brand-mark">PC</div>
            <div>
              <div className="font-display text-2xl leading-none font-semibold">Parrilla</div>
              <div className="mt-1 text-sm text-kds-dim">Punto C · Centro</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {columns.map((column) => (
              <div className={`counter counter-${column.status}`} key={column.status}>
                <span>{column.label}</span>
                <strong>{counts[column.status]}</strong>
              </div>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="connection">
              <Icon className="size-4" name="signal" />
              En línea
            </div>
            <div className="clock">
              <span>{clock.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span>
              <small>Turno comida</small>
            </div>
            <Button className="header-button">
              <Icon name="package" />
              <span>Despacho</span>
            </Button>
            <Button className="header-button">
              <Icon name="history" />
              <span>Historial</span>
            </Button>
            <Button className="icon-button" title="Ajustes">
              <Icon name="gear" />
            </Button>
          </div>
        </div>
      </header>

      <section className="grid min-h-0 flex-1 grid-cols-3 gap-px bg-kds-border">
        {columns.map((column) => {
          const columnOrders = orders.filter((order) => order.status === column.status);
          return (
            <div className="flex min-w-0 flex-col bg-kds-bg" key={column.status}>
              <div className={`column-header column-header-${column.status}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="status-dot" />
                    <span className="text-xl font-bold">{column.label}</span>
                    <span className="column-count">{columnOrders.length}</span>
                  </div>
                  <div className="mt-1 text-sm text-kds-dim">{column.subtitle}</div>
                </div>
                <Icon className="size-5 text-kds-dim" name="clock" />
              </div>
              <div className="column-scroll">
                {columnOrders.length ? (
                  columnOrders.map((order) => (
                    <Ticket
                      key={order.id}
                      order={order}
                      onDeliver={() => deliver(order.id)}
                      onReady={() => {
                        updateStatus(order.id, "ready");
                        setToast(`Comanda #${order.id} lista · se avisó a ${order.waiter}`);
                      }}
                      onTake={() => {
                        updateStatus(order.id, "preparing");
                        setToast(`Comanda #${order.id} en preparación`);
                      }}
                      onToggleLine={(lineId) => toggleLine(order.id, lineId)}
                    />
                  ))
                ) : (
                  <div className="empty-state">
                    <Icon className="size-8" name="check" />
                    <strong>Sin comandas</strong>
                    <span>Buen trabajo.</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {overdue.length > 0 && (
        <footer className={`alert-tray ${alertMuted ? "alert-muted" : ""}`}>
          <div className="flex items-center gap-3">
            <span className="alert-icon">
              <Icon name={alertMuted ? "volume" : "alert"} />
            </span>
            <div>
              <div className="font-bold">
                {alertMuted ? "Alerta silenciada" : "SLA excedido"} · Comanda #{overdue[0].id}
              </div>
              <div className="text-sm text-alert-dim">
                {alertMuted ? "Registro guardado · visible hasta resolver" : "Mesa 8 · excedida por 02:35"}
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button className="alert-secondary" onClick={() => setAlertMuted(!alertMuted)}>
              <Icon className="size-5" name="volume" />
              {alertMuted ? "Reactivar alerta" : "Silenciar 10 min"}
            </Button>
            <Button
              className="alert-primary"
              onClick={() => document.querySelector(".ticket-overdue")?.scrollIntoView({ behavior: "smooth" })}
            >
              Abrir comanda
            </Button>
          </div>
        </footer>
      )}

      {toast && (
        <div aria-live="polite" className="toast" role="status">
          <Icon className="size-5" name="check" />
          {toast}
        </div>
      )}
    </main>
  );
}
