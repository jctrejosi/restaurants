import {
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react"
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleDollarSign,
  Clock3,
  CookingPot,
  Ellipsis,
  FileBarChart,
  Gauge,
  HelpCircle,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  PackageOpen,
  Pause,
  Play,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  Truck,
  Users,
  UtensilsCrossed,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost"
}

function Button({
  children,
  variant = "secondary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button className={`button button--${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}

function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  children: ReactNode
}) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`icon-button ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

const navGroups: {
  label: string
  items: { name: string icon: LucideIcon badge?: string }[]
}[] = [
  {
    label: "Operación",
    items: [
      { name: "En vivo", icon: LayoutDashboard },
      { name: "Pedidos", icon: ShoppingBag, badge: "14" },
      { name: "Reservas", icon: CalendarDays },
      { name: "Comandas", icon: CookingPot, badge: "3" },
      { name: "Salón", icon: LayoutGrid },
    ],
  },
  {
    label: "Negocio",
    items: [
      { name: "Catálogo", icon: BookOpen },
      { name: "Estaciones", icon: UtensilsCrossed },
      { name: "Promociones", icon: Tag },
    ],
  },
  {
    label: "Servicio",
    items: [
      { name: "Domicilio", icon: Truck },
      { name: "Clientes", icon: Users },
    ],
  },
  {
    label: "Dinero",
    items: [
      { name: "Caja y turnos", icon: CircleDollarSign },
      { name: "Pagos", icon: ReceiptText },
      { name: "Facturación", icon: FileBarChart },
    ],
  },
  {
    label: "Analítica",
    items: [
      { name: "Reportes", icon: Gauge },
      { name: "Tiempos y SLA", icon: Clock3 },
      { name: "Auditoría", icon: ShieldCheck },
    ],
  },
]

const orders = [
  {
    id: "P-8831",
    type: "Mesa 12",
    channel: "Salón",
    time: "38:12",
    state: "Por cobrar",
    total: "$845",
    tone: "amber",
  },
  {
    id: "P-8834",
    type: "Para recoger",
    channel: "Web",
    time: "19:40",
    state: "Listo",
    total: "$220",
    tone: "green",
  },
  {
    id: "P-8836",
    type: "Mesa 05",
    channel: "Salón",
    time: "16:08",
    state: "En preparación",
    total: "$490",
    tone: "amber",
  },
  {
    id: "P-8837",
    type: "Domicilio",
    channel: "App",
    time: "11:42",
    state: "Recibido",
    total: "$360",
    tone: "blue",
  },
]

const alerts = [
  {
    tone: "critical",
    title: "SLA excedido",
    detail: "Comanda 1038 · Parrilla",
    time: "+02:35",
  },
  {
    tone: "high",
    title: "Turno sin cerrar",
    detail: "Caja principal · 1 oct",
    time: "14 h",
  },
  {
    tone: "medium",
    title: "Sincronización pendiente",
    detail: "KDS Parrilla · 2 operaciones",
    time: "8 min",
  },
]

const kpis = [
  {
    label: "Ventas de hoy",
    value: "$28,450",
    delta: "+12.4%",
    foot: "vs. ayer",
    color: "terracotta",
    points: "2,29 18,24 34,25 50,15 66,19 82,8 98,11",
  },
  {
    label: "Pedidos activos",
    value: "14",
    delta: "+3",
    foot: "última hora",
    color: "blue",
    points: "2,24 18,21 34,23 50,17 66,14 82,16 98,8",
  },
  {
    label: "Reservas de hoy",
    value: "23",
    delta: "78%",
    foot: "ocupación",
    color: "gold",
    points: "2,27 18,25 34,20 50,21 66,14 82,10 98,7",
  },
  {
    label: "Ticket promedio",
    value: "$412",
    delta: "+5.8%",
    foot: "vs. ayer",
    color: "purple",
    points: "2,26 18,25 34,17 50,19 66,14 82,15 98,8",
  },
  {
    label: "Cumplimiento SLA",
    value: "92%",
    delta: "−2.1%",
    foot: "objetivo 95%",
    color: "green",
    points: "2,9 18,12 34,10 50,17 66,16 82,20 98,19",
  },
]

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="brand">
      <div className="brand__mark">
        <span>P</span>
      </div>
      {!collapsed && (
        <div>
          <div className="brand__name">Punto C</div>
          <div className="brand__sub">Administración</div>
        </div>
      )}
    </div>
  )
}

function Sidebar({
  collapsed,
  active,
  onActive,
  onCollapse,
  mobileOpen,
  closeMobile,
}: {
  collapsed: boolean
  active: string
  onActive: (name: string) => void
  onCollapse: () => void
  mobileOpen: boolean
  closeMobile: () => void
}) {
  return (
    <aside
      className={`sidebar ${collapsed ? "sidebar--collapsed" : ""} ${
        mobileOpen ? "sidebar--mobile-open" : ""
      }`}
    >
      <div className="sidebar__top">
        <Logo collapsed={collapsed} />
        <IconButton
          label="Cerrar menú"
          className="mobile-close"
          onClick={closeMobile}
        >
          <X size={18} />
        </IconButton>
      </div>
      <nav className="sidebar__nav" aria-label="Navegación principal">
        {navGroups.map((group) => (
          <div className="nav-group" key={group.label}>
            {!collapsed && (
              <div className="nav-group__label">{group.label}</div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon
              const selected = active === item.name
              return (
                <Button
                  variant="ghost"
                  key={item.name}
                  className={`nav-item ${selected ? "nav-item--active" : ""}`}
                  onClick={() => {
                    onActive(item.name)
                    closeMobile()
                  }}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon size={18} strokeWidth={selected ? 2.3 : 1.8} />
                  {!collapsed && (
                    <span className="nav-item__text">{item.name}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span className="nav-item__badge">{item.badge}</span>
                  )}
                </Button>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar__bottom">
        <Button
          variant="ghost"
          className="nav-item"
          onClick={() => onActive("Sucursal y ajustes")}
        >
          <Settings size={18} />
          {!collapsed && (
            <span className="nav-item__text">Sucursal y ajustes</span>
          )}
        </Button>
        <Button
          variant="ghost"
          className="nav-item"
          onClick={() => onActive("Ayuda")}
        >
          <HelpCircle size={18} />
          {!collapsed && (
            <span className="nav-item__text">Ayuda y soporte</span>
          )}
        </Button>
        <Button
          variant="ghost"
          className="collapse-button"
          onClick={onCollapse}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          {!collapsed && <span>Contraer menú</span>}
        </Button>
      </div>
    </aside>
  )
}

function Sparkline({ points, color }: { points: string color: string }) {
  return (
    <svg
      className={`sparkline sparkline--${color}`}
      viewBox="0 0 100 34"
      aria-hidden="true"
    >
      <path
        className="sparkline__area"
        d={`M ${points.replaceAll(" ", " L ")} L 98 34 L 2 34 Z`}
      />
      <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function KpiCard({ data }: { data: typeof kpis[number] }) {
  const negative = data.delta.includes("−")
  return (
    <div className="kpi-card">
      <div className="kpi-card__label">{data.label}</div>
      <div className="kpi-card__body">
        <div>
          <div className="kpi-card__value">{data.value}</div>
          <div
            className={`kpi-card__delta ${
              negative ? "kpi-card__delta--negative" : ""
            }`}
          >
            <span>{data.delta}</span> {data.foot}
          </div>
        </div>
        <Sparkline points={data.points} color={data.color} />
      </div>
    </div>
  )
}

function StatusBadge({ tone, children }: { tone: string children: ReactNode }) {
  return <span className={`status status--${tone}`}>{children}</span>
}

function OrdersCard() {
  const [filter, setFilter] = useState("Todos")
  const filters = ["Todos", "Mesa · 7", "Recoger · 3", "Domicilio · 4"]
  const visible =
    filter === "Todos"
      ? orders
      : orders.filter((order) => order.type.includes(filter.split(" ")[0]))
  return (
    <section className="panel orders-panel">
      <div className="panel__header panel__header--stack">
        <div>
          <div className="panel__title">Pedidos activos</div>
          <div className="panel__subtitle">
            14 pedidos en curso en todos los canales
          </div>
        </div>
        <Button variant="ghost" className="text-action">
          Ver todos <ChevronRight size={15} />
        </Button>
      </div>
      <div className="filter-tabs">
        {filters.map((item) => (
          <Button
            variant="ghost"
            className={`filter-tab ${
              filter === item ? "filter-tab--active" : ""
            }`}
            key={item}
            onClick={() => setFilter(item)}
          >
            {item}
          </Button>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Origen</th>
              <th>Tiempo</th>
              <th>Estado</th>
              <th className="cell-right">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((order) => (
              <tr key={order.id}>
                <td>
                  <span className="order-id">{order.id}</span>
                  <span className="order-type">{order.type}</span>
                </td>
                <td>{order.channel}</td>
                <td>
                  <span
                    className={
                      order.time === "38:12"
                        ? "duration duration--late"
                        : "duration"
                    }
                  >
                    {order.time}
                  </span>
                </td>
                <td>
                  <StatusBadge tone={order.tone}>{order.state}</StatusBadge>
                </td>
                <td className="cell-right money">{order.total}</td>
                <td>
                  <IconButton label={`Opciones de ${order.id}`}>
                    <Ellipsis size={17} />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel__footer">
        <span>
          <Wifi size={13} /> Actualización automática
        </span>
        <span>Mostrando {visible.length} de 14</span>
      </div>
    </section>
  )
}

function DiningRoomCard() {
  const tables = [
    ["01", "free"],
    ["02", "busy"],
    ["03", "busy"],
    ["04", "bill"],
    ["05", "busy"],
    ["06", "free"],
    ["07", "reserved"],
    ["08", "reserved"],
    ["09", "free"],
    ["10", "busy"],
    ["11", "free"],
    ["12", "bill"],
  ]
  return (
    <section className="panel dining-panel">
      <div className="panel__header">
        <div>
          <div className="panel__title">Salón</div>
          <div className="panel__subtitle">Terraza principal</div>
        </div>
        <Button variant="ghost" className="text-action">
          Ver mapa <ChevronRight size={15} />
        </Button>
      </div>
      <div className="room-summary">
        <div>
          <strong>7</strong>
          <span>Ocupadas</span>
        </div>
        <div>
          <strong>9</strong>
          <span>Libres</span>
        </div>
        <div>
          <strong>2</strong>
          <span>Por cobrar</span>
        </div>
      </div>
      <div className="tables-grid">
        {tables.map(([number, state]) => (
          <div className={`table-dot table-dot--${state}`} key={number}>
            <span>{number}</span>
            <small>
              {state === "free"
                ? "Libre"
                : state === "busy"
                  ? "Ocup."
                  : state === "bill"
                    ? "Cobrar"
                    : "14:00"}
            </small>
          </div>
        ))}
      </div>
      <div className="legend">
        <span>
          <i className="legend-dot legend-dot--free" />
          Libre
        </span>
        <span>
          <i className="legend-dot legend-dot--busy" />
          Ocupada
        </span>
        <span>
          <i className="legend-dot legend-dot--bill" />
          Por cobrar
        </span>
        <span>
          <i className="legend-dot legend-dot--reserved" />
          Reservada
        </span>
      </div>
    </section>
  )
}

function AlertCard({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="panel alerts-panel">
      <div className="panel__header">
        <div>
          <div className="panel__title">Requiere atención</div>
          <div className="panel__subtitle">3 alertas operativas</div>
        </div>
        <Button variant="ghost" className="text-action" onClick={onOpen}>
          Ver todas <ChevronRight size={15} />
        </Button>
      </div>
      <div className="alert-list">
        {alerts.map((alert) => (
          <Button
            variant="ghost"
            className="alert-row"
            key={alert.title}
            onClick={onOpen}
          >
            <span className={`alert-icon alert-icon--${alert.tone}`}>
              <AlertTriangle size={16} />
            </span>
            <span className="alert-copy">
              <strong>{alert.title}</strong>
              <span>{alert.detail}</span>
            </span>
            <span className="alert-time">{alert.time}</span>
            <ChevronRight size={16} />
          </Button>
        ))}
      </div>
    </section>
  )
}

function ReservationsCard() {
  return (
    <section className="panel reservations-panel">
      <div className="panel__header">
        <div>
          <div className="panel__title">Próximas llegadas</div>
          <div className="panel__subtitle">
            6 reservas en las próximas 2 horas
          </div>
        </div>
        <Button variant="ghost" className="text-action">
          Calendario <ChevronRight size={15} />
        </Button>
      </div>
      <div className="reservation-list">
        {[
          ["14:00", "LP", "Laura Pérez", "4 personas", "Mesa 8"],
          ["14:15", "CM", "Carlos Méndez", "2 personas", "Mesa 3"],
          ["14:30", "AM", "Ana Morales", "6 personas", "Por asignar"],
        ].map(([time, initials, name, people, table]) => (
          <div className="reservation-row" key={name}>
            <div className="reservation-time">{time}</div>
            <div className="avatar avatar--soft">{initials}</div>
            <div className="reservation-copy">
              <strong>{name}</strong>
              <span>{people}</span>
            </div>
            <StatusBadge tone={table === "Por asignar" ? "gray" : "outline"}>
              {table}
            </StatusBadge>
          </div>
        ))}
      </div>
    </section>
  )
}

function AlertDrawer({ open, onClose }: { open: boolean onClose: () => void }) {
  if (!open) return null
  return (
    <>
      <Button
        variant="ghost"
        className="drawer-backdrop"
        onClick={onClose}
        aria-label="Cerrar alertas"
      />
      <aside className="drawer" aria-label="Alertas operativas">
        <div className="drawer__header">
          <div>
            <div className="drawer__title">Alertas operativas</div>
            <div className="drawer__subtitle">3 pendientes · 1 crítica</div>
          </div>
          <IconButton label="Cerrar" onClick={onClose}>
            <X size={19} />
          </IconButton>
        </div>
        <div className="drawer__body">
          {alerts.map((alert) => (
            <div className="drawer-alert" key={alert.title}>
              <span className={`alert-icon alert-icon--${alert.tone}`}>
                <AlertTriangle size={17} />
              </span>
              <div>
                <strong>{alert.title}</strong>
                <span>{alert.detail}</span>
                <small>Detectada hace {alert.time}</small>
              </div>
              <Button variant="secondary">Atender</Button>
            </div>
          ))}
        </div>
        <div className="drawer__note">
          <ShieldCheck size={16} /> Todas las acciones quedan registradas en
          auditoría.
        </div>
      </aside>
    </>
  )
}

export default function App() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [active, setActive] = useState("En vivo")
  const [paused, setPaused] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [branchOpen, setBranchOpen] = useState(false)
  const [branch, setBranch] = useState("Punto C · Centro")
  const [now, setNow] = useState(new Date())
  const [toast, setToast] = useState("")

  useEffect(() => {
    if (paused) return
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [paused])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(""), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  const time = useMemo(
    () =>
      now.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [now],
  )

  const handleNavigation = (name: string) => {
    if (name === "En vivo") {
      setActive(name)
      return
    }
    setActive(name)
    setToast(`${name}: módulo listo para conectar`)
  }

  return (
    <div className="app-shell">
      <Sidebar
        collapsed={collapsed}
        active={active}
        onActive={handleNavigation}
        onCollapse={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        closeMobile={() => setMobileOpen(false)}
      />
      {mobileOpen && (
        <Button
          variant="ghost"
          className="mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar navegación"
        />
      )}
      <div className="app-main">
        <header className="topbar">
          <IconButton
            label="Abrir navegación"
            className="menu-trigger"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </IconButton>
          <Button variant="ghost" className="search-box">
            <Search size={17} />
            <span>Buscar pedidos, reservas, clientes…</span>
            <kbd>⌘ K</kbd>
          </Button>
          <div className="topbar__actions">
            <div className="branch-picker">
              <Button
                variant="ghost"
                className="branch-button"
                onClick={() => setBranchOpen((value) => !value)}
              >
                <span className="branch-icon">
                  <Store size={16} />
                </span>
                <span>
                  <small>Sede activa</small>
                  <strong>{branch}</strong>
                </span>
                <ChevronsUpDown size={15} />
              </Button>
              {branchOpen && (
                <div className="popover branch-popover">
                  {[
                    "Punto C · Centro",
                    "Punto C · Norte",
                    "Todas las sedes",
                  ].map((item) => (
                    <Button
                      variant="ghost"
                      key={item}
                      className={branch === item ? "selected" : ""}
                      onClick={() => {
                        setBranch(item)
                        setBranchOpen(false)
                      }}
                    >
                      <Store size={15} /> {item}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <IconButton
              label="Alertas"
              className="notification-button"
              onClick={() => setAlertsOpen(true)}
            >
              <Bell size={19} />
              <span className="notification-dot">3</span>
            </IconButton>
            <div className="topbar__divider" />
            <Button variant="ghost" className="user-menu">
              <span className="avatar">MG</span>
              <span className="user-copy">
                <strong>María Gómez</strong>
                <small>Gerente de sede</small>
              </span>
              <ChevronDown size={15} />
            </Button>
          </div>
        </header>
        <main className="content">
          <div className="page-header">
            <div>
              <div className="eyebrow">Operación / {active}</div>
              <div className="page-title">{active}</div>
              <div className="page-subtitle">
                Una vista clara de lo que está pasando ahora en tu restaurante.
              </div>
            </div>
            <div className="live-controls">
              <div
                className={`live-status ${paused ? "live-status--paused" : ""}`}
              >
                <span className="live-dot" />
                <div>
                  <strong>
                    {paused ? "Actualización pausada" : "En vivo"}
                  </strong>
                  <small>Actualizado {time}</small>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setPaused((value) => !value)}
              >
                {paused ? <Play size={15} /> : <Pause size={15} />}{" "}
                {paused ? "Reanudar" : "Pausar"}
              </Button>
              <Button
                variant="primary"
                onClick={() => setToast("Nuevo pedido: formulario abierto")}
              >
                <Plus size={17} /> Nuevo pedido
              </Button>
            </div>
          </div>
          {active !== "En vivo" && (
            <div className="module-notice">
              <PackageOpen size={20} />
              <span>
                <strong>Vista previa del módulo {active}</strong> El tablero
                permanece visible para mantener el contexto operativo.
              </span>
              <Button variant="ghost" onClick={() => setActive("En vivo")}>
                Volver a En vivo
              </Button>
            </div>
          )}
          <div className="kpi-grid">
            {kpis.map((kpi) => (
              <KpiCard data={kpi} key={kpi.label} />
            ))}
          </div>
          <div className="dashboard-grid">
            <OrdersCard />
            <DiningRoomCard />
            <AlertCard onOpen={() => setAlertsOpen(true)} />
            <ReservationsCard />
          </div>
        </main>
      </div>
      <AlertDrawer open={alertsOpen} onClose={() => setAlertsOpen(false)} />
      {toast && (
        <div className="toast">
          <ShieldCheck size={17} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  )
}
