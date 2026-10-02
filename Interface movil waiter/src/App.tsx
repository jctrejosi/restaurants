import { useMemo, useState, type ReactNode } from "react"

type IconName = "alert" | "bell" | "calendar" | "check" | "chevron" | "clock" | "grid" | "receipt" | "search" | "spark" | "user" | "users" | "wifi"

type TableStatus = "free" | "occupied" | "payment" | "reserved"

type RestaurantTable = {
  id: number
  seats: number
  zone: "Terraza" | "Salón"
  status: TableStatus
  detail: string
  badge?: string
}

const tables: RestaurantTable[] = [
  {
    id: 1,
    seats: 4,
    zone: "Terraza",
    status: "occupied",
    detail: "32 min",
    badge: "Lista",
  },
  { id: 2, seats: 2, zone: "Terraza", status: "free", detail: "Disponible" },
  { id: 3, seats: 4, zone: "Terraza", status: "payment", detail: "$ 1,240" },
  {
    id: 4,
    seats: 6,
    zone: "Terraza",
    status: "reserved",
    detail: "20:30",
    badge: "6 pers.",
  },
  { id: 5, seats: 2, zone: "Salón", status: "occupied", detail: "18 min" },
  {
    id: 6,
    seats: 4,
    zone: "Salón",
    status: "occupied",
    detail: "51 min",
    badge: "Cocina",
  },
  { id: 7, seats: 4, zone: "Salón", status: "free", detail: "Disponible" },
  {
    id: 8,
    seats: 8,
    zone: "Salón",
    status: "reserved",
    detail: "21:00",
    badge: "8 pers.",
  },
  { id: 9, seats: 2, zone: "Salón", status: "free", detail: "Disponible" },
]

const statusLabels: Record<TableStatus, string> = {
  free: "Libre",
  occupied: "Ocupada",
  payment: "Por cobrar",
  reserved: "Reservada",
}

function Icon({ name, size = 22 }: { name: IconName size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    alert: (
      <>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="m10.3 3.7-8.1 14a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3l-8.1-14a2 2 0 0 0-3.4 0Z" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    calendar: (
      <>
        <path d="M8 2v4M16 2v4M3 10h18" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3h12v19l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 8h6M9 12h6" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4L12 3Z" />
        <path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    wifi: (
      <>
        <path d="M5 12.6a11 11 0 0 1 14 0M8.5 16a6 6 0 0 1 7 0" />
        <path d="M12 20h.01M2 9a16 16 0 0 1 20 0" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  )
}

function AppButton({
  children,
  className = "",
  onClick,
  ariaLabel,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  ariaLabel?: string
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={className}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

export default function App() {
  const [zone, setZone] = useState("Todas")
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(
    null,
  )
  const [searching, setSearching] = useState(false)

  const visibleTables = useMemo(
    () =>
      tables.filter((table) => {
        const zoneMatches = zone === "Todas" || table.zone === zone
        const searchMatches = !searching || table.status !== "free"
        return zoneMatches && searchMatches
      }),
    [searching, zone],
  )

  return (
    <main className="app-shell">
      <section
        className="phone-frame"
        aria-label="Aplicación Punto C para meseros"
      >
        <div className="status-bar">
          <span>19:42</span>
          <div className="status-icons">
            <span>5G</span>
            <Icon name="wifi" size={15} />
            <span className="battery" />
          </div>
        </div>

        <header className="app-header">
          <div className="brand-row">
            <div>
              <p className="eyebrow">PUNTO C · CENTRO</p>
              <h1>Buenas noches, Ana</h1>
            </div>
            <AppButton className="avatar" ariaLabel="Abrir perfil de Ana">
              AM
              <span className="avatar-dot" />
            </AppButton>
          </div>
          <div className="header-meta">
            <span className="connection-pill">
              <span className="connection-dot" />
              En línea
            </span>
            <span>Turno cena · 5 mesas</span>
          </div>
        </header>

        <div className="content">
          <div className="section-heading">
            <div>
              <p className="section-kicker">SALÓN EN VIVO</p>
              <h2>Mis mesas</h2>
            </div>
            <AppButton
              className={`icon-button ${searching ? "active" : ""}`}
              ariaLabel="Buscar mesas activas"
              onClick={() => setSearching((value) => !value)}
            >
              <Icon name="search" />
            </AppButton>
          </div>

          <div className="summary-strip" aria-label="Resumen del salón">
            <div>
              <strong>5</strong>
              <span>Activas</span>
            </div>
            <div>
              <strong className="warning-number">1</strong>
              <span>Por cobrar</span>
            </div>
            <div>
              <strong className="ready-number">1</strong>
              <span>Lista</span>
            </div>
          </div>

          <nav className="zone-tabs" aria-label="Zonas del restaurante">
            {["Todas", "Terraza", "Salón"].map((item) => (
              <AppButton
                className={zone === item ? "zone-chip selected" : "zone-chip"}
                key={item}
                onClick={() => setZone(item)}
              >
                {item}
              </AppButton>
            ))}
          </nav>

          {searching && (
            <div className="filter-notice">
              <Icon name="spark" size={18} />
              Mostrando solo mesas con actividad
              <AppButton onClick={() => setSearching(false)}>Quitar</AppButton>
            </div>
          )}

          <div className="table-grid">
            {visibleTables.map((table) => (
              <AppButton
                className={`table-card table-${table.status}`}
                key={table.id}
                onClick={() => setSelectedTable(table)}
                ariaLabel={`Mesa ${table.id}, ${statusLabels[table.status]}`}
              >
                <div className="table-top">
                  <span className="table-label">MESA</span>
                  <span className="seat-count">
                    <Icon name="users" size={14} /> {table.seats}
                  </span>
                </div>
                <strong className="table-number">{table.id}</strong>
                <span className="table-status">
                  {statusLabels[table.status]}
                </span>
                <span className="table-detail">
                  {table.status === "occupied" && (
                    <Icon name="clock" size={14} />
                  )}
                  {table.status === "reserved" && (
                    <Icon name="calendar" size={14} />
                  )}
                  {table.detail}
                </span>
                {table.badge && (
                  <span className={`table-badge badge-${table.status}`}>
                    {table.badge === "Lista" && <span className="pulse-dot" />}
                    {table.badge}
                  </span>
                )}
              </AppButton>
            ))}
          </div>
        </div>

        <nav className="bottom-nav" aria-label="Navegación principal">
          <AppButton className="nav-item active">
            <Icon name="grid" />
            <span>Salón</span>
          </AppButton>
          <AppButton className="nav-item">
            <Icon name="receipt" />
            <span>Comandas</span>
          </AppButton>
          <AppButton className="nav-item nav-alert">
            <span className="notification-count">2</span>
            <Icon name="bell" />
            <span>Avisos</span>
          </AppButton>
          <AppButton className="nav-item">
            <Icon name="user" />
            <span>Yo</span>
          </AppButton>
        </nav>

        {selectedTable && (
          <div className="sheet-overlay" onClick={() => setSelectedTable(null)}>
            <section
              className="action-sheet"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sheet-handle" />
              <div className="sheet-heading">
                <div
                  className={`sheet-table-icon table-${selectedTable.status}`}
                >
                  {selectedTable.id}
                </div>
                <div>
                  <p className="eyebrow">{selectedTable.zone.toUpperCase()}</p>
                  <h2>Mesa {selectedTable.id}</h2>
                  <p>
                    {statusLabels[selectedTable.status]} · {selectedTable.seats}{" "}
                    lugares
                  </p>
                </div>
              </div>

              {selectedTable.status === "free" ? (
                <div className="sheet-body">
                  <div className="sheet-message">
                    <Icon name="check" />
                    <span>
                      <strong>Lista para recibir comensales</strong>
                      Abre la mesa para comenzar un pedido.
                    </span>
                  </div>
                  <AppButton className="primary-button">
                    Abrir mesa
                    <Icon name="chevron" />
                  </AppButton>
                </div>
              ) : (
                <div className="sheet-body">
                  <AppButton className="primary-button">
                    {selectedTable.status === "payment"
                      ? "Ver cuenta"
                      : "Continuar pedido"}
                    <Icon name="chevron" />
                  </AppButton>
                  <div className="secondary-actions">
                    <AppButton>
                      <Icon name="receipt" />
                      Pre-cuenta
                    </AppButton>
                    <AppButton>
                      <Icon name="users" />
                      Trasladar
                    </AppButton>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  )
}
