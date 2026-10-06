import { useMemo, useRef, useState, type ReactNode } from "react"

type IconName = "alert" | "arrow-left" | "badge" | "bell" | "calendar" | "camera" | "check" | "chevron" | "clock" | "grid" | "lock" | "mail" | "phone" | "receipt" | "save" | "search" | "spark" | "user" | "users" | "wifi" | "x"

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

type IconProps = {
  name: IconName
  size?: number
}

function Icon({ name, size = 22 }: IconProps) {
  const paths: Record<IconName, ReactNode> = {
    alert: (
      <>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="m10.3 3.7-8.1 14a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3l-8.1-14a2 2 0 0 0-3.4 0Z" />
      </>
    ),
    "arrow-left": (
      <>
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
      </>
    ),
    badge: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <circle cx="12" cy="10" r="2.5" />
        <path d="M7.5 17.5a5 5 0 0 1 9 0" />
      </>
    ),
    camera: (
      <>
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    phone: (
      <path d="M5 3h3l2 5-2.4 1.5a12.5 12.5 0 0 0 5.9 5.9L15 13l5 2v3a2 2 0 0 1-2.2 2A16 16 0 0 1 3 5.2 2 2 0 0 1 5 3Z" />
    ),
    save: (
      <>
        <path d="M5 3h11l3 3v15H5z" />
        <path d="M9 3v5h6V3M8 13h8M8 17h5" />
      </>
    ),
    x: <path d="M6 6l12 12M18 6 6 18" />,
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

type WaiterProfile = {
  name: string
  email: string
  phone: string
  employeeId: string
  zone: string
  shift: string
  photo: string | null
}

const shifts = ["Turno desayuno", "Turno comida", "Turno cena"]

const initialProfile: WaiterProfile = {
  name: "Ana Morales",
  email: "ana.morales@puntoc.co",
  phone: "+57 300 123 4567",
  employeeId: "PUN-1042",
  zone: "Salón · Terraza",
  shift: "Turno cena",
  photo: null,
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

type FormMessage = {
  tone: "success" | "error"
  text: string
} | null

function ProfileScreen({
  onClose,
  onSave,
  profile,
}: {
  onClose: () => void
  onSave: (next: WaiterProfile) => void
  profile: WaiterProfile
}) {
  const [draft, setDraft] = useState<WaiterProfile>(profile)
  const [detailsMessage, setDetailsMessage] = useState<FormMessage>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordMessage, setPasswordMessage] = useState<FormMessage>(null)

  function updateField<K extends keyof WaiterProfile>(
    field: K,
    value: WaiterProfile[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }))
    setDetailsMessage(null)
  }

  function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setDetailsMessage({
        tone: "error",
        text: "Selecciona un archivo de imagen válido.",
      })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDraft((current) => ({ ...current, photo: reader.result as string }))
        setDetailsMessage(null)
      }
    }
    reader.readAsDataURL(file)
  }

  function saveDetails() {
    if (!draft.name.trim() || !draft.email.trim()) {
      setDetailsMessage({
        tone: "error",
        text: "El nombre y el correo son obligatorios.",
      })
      return
    }
    const cleaned: WaiterProfile = {
      ...draft,
      name: draft.name.trim(),
      email: draft.email.trim(),
    }
    setDraft(cleaned)
    onSave(cleaned)
    setDetailsMessage({ tone: "success", text: "Datos del perfil guardados." })
  }

  function updatePassword() {
    if (!currentPassword) {
      setPasswordMessage({
        tone: "error",
        text: "Ingresa tu contraseña actual.",
      })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMessage({
        tone: "error",
        text: "La nueva contraseña debe tener al menos 8 caracteres.",
      })
      return
    }
    if (newPassword === currentPassword) {
      setPasswordMessage({
        tone: "error",
        text: "La nueva contraseña debe ser distinta a la actual.",
      })
      return
    }
    if (confirmPassword !== newPassword) {
      setPasswordMessage({
        tone: "error",
        text: "La confirmación no coincide con la nueva contraseña.",
      })
      return
    }
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setPasswordMessage({ tone: "success", text: "Contraseña actualizada." })
  }

  return (
    <section className="profile-screen" aria-label="Editar perfil del mesero">
      <header className="profile-topbar">
        <AppButton
          className="profile-back"
          ariaLabel="Volver"
          onClick={onClose}
        >
          <Icon name="arrow-left" size={20} />
        </AppButton>
        <h2 className="profile-title">Mi perfil</h2>
        <span className="profile-topbar-spacer" />
      </header>

      <div className="profile-scroll">
        <div className="profile-card">
          <div className="profile-photo-wrapper">
            {draft.photo ? (
              <img
                alt="Foto de perfil"
                className="profile-photo"
                src={draft.photo}
              />
            ) : (
              <span className="profile-photo profile-photo-fallback">
                {getInitials(draft.name)}
              </span>
            )}
            <AppButton
              ariaLabel="Cambiar foto de perfil"
              className="photo-edit-button"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="camera" size={16} />
            </AppButton>
          </div>
          <strong className="profile-name">{draft.name || "Sin nombre"}</strong>
          <span className="profile-role">
            {draft.shift} · Mesero/a · {draft.employeeId}
          </span>
          <input
            accept="image/*"
            className="hidden-input"
            onChange={handlePhoto}
            ref={fileInputRef}
            type="file"
          />
          <div className="photo-actions">
            <AppButton
              className="ghost-button"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="camera" size={15} /> Subir foto
            </AppButton>
            {draft.photo && (
              <AppButton
                className="ghost-button danger"
                onClick={() => updateField("photo", null)}
              >
                <Icon name="x" size={15} /> Quitar
              </AppButton>
            )}
          </div>
        </div>

        <section className="form-section">
          <p className="form-section-title">
            <Icon name="user" size={14} /> Datos del mesero
          </p>
          <label className="field">
            <span>Nombre completo</span>
            <input
              onChange={(event) => updateField("name", event.target.value)}
              value={draft.name}
            />
          </label>
          <label className="field">
            <span>
              <Icon name="mail" size={13} /> Correo electrónico
            </span>
            <input
              onChange={(event) => updateField("email", event.target.value)}
              type="email"
              value={draft.email}
            />
          </label>
          <label className="field">
            <span>
              <Icon name="phone" size={13} /> Teléfono
            </span>
            <input
              onChange={(event) => updateField("phone", event.target.value)}
              type="tel"
              value={draft.phone}
            />
          </label>
          <label className="field">
            <span>
              <Icon name="badge" size={13} /> Número de empleado
            </span>
            <input
              onChange={(event) =>
                updateField("employeeId", event.target.value)
              }
              value={draft.employeeId}
            />
          </label>
          <label className="field">
            <span>Zona asignada</span>
            <input
              onChange={(event) => updateField("zone", event.target.value)}
              value={draft.zone}
            />
          </label>
          <label className="field">
            <span>Turno</span>
            <select
              onChange={(event) => updateField("shift", event.target.value)}
              value={draft.shift}
            >
              {shifts.map((shift) => (
                <option key={shift} value={shift}>
                  {shift}
                </option>
              ))}
            </select>
          </label>
        </section>

        {detailsMessage && (
          <p className={`form-message ${detailsMessage.tone}`}>
            <Icon
              name={detailsMessage.tone === "error" ? "alert" : "check"}
              size={16}
            />
            {detailsMessage.text}
          </p>
        )}

        <AppButton
          className="primary-button profile-submit"
          onClick={saveDetails}
        >
          <Icon name="save" size={18} /> Guardar cambios
        </AppButton>

        <section className="form-section">
          <p className="form-section-title">
            <Icon name="lock" size={14} /> Seguridad
          </p>
          <label className="field">
            <span>Contraseña actual</span>
            <input
              autoComplete="current-password"
              onChange={(event) => {
                setCurrentPassword(event.target.value)
                setPasswordMessage(null)
              }}
              type="password"
              value={currentPassword}
            />
          </label>
          <label className="field">
            <span>Nueva contraseña</span>
            <input
              autoComplete="new-password"
              onChange={(event) => {
                setNewPassword(event.target.value)
                setPasswordMessage(null)
              }}
              type="password"
              value={newPassword}
            />
          </label>
          <label className="field">
            <span>Confirmar nueva contraseña</span>
            <input
              autoComplete="new-password"
              onChange={(event) => {
                setConfirmPassword(event.target.value)
                setPasswordMessage(null)
              }}
              type="password"
              value={confirmPassword}
            />
          </label>
        </section>

        {passwordMessage && (
          <p className={`form-message ${passwordMessage.tone}`}>
            <Icon
              name={passwordMessage.tone === "error" ? "alert" : "check"}
              size={16}
            />
            {passwordMessage.text}
          </p>
        )}

        <AppButton
          className="primary-button profile-submit"
          onClick={updatePassword}
        >
          <Icon name="lock" size={17} /> Actualizar contraseña
        </AppButton>
      </div>
    </section>
  )
}

export default function App() {
  const [zone, setZone] = useState("Todas")
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(
    null,
  )
  const [searching, setSearching] = useState(false)
  const [profile, setProfile] = useState<WaiterProfile>(initialProfile)
  const [profileOpen, setProfileOpen] = useState(false)

  const firstName = profile.name.trim().split(/\s+/)[0] || "mesero/a"

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
              <h1>Buenas noches, {firstName}</h1>
            </div>
            <AppButton
              className="avatar"
              ariaLabel="Abrir y editar perfil"
              onClick={() => setProfileOpen(true)}
            >
              {profile.photo ? (
                <img alt="" className="avatar-image" src={profile.photo} />
              ) : (
                getInitials(profile.name)
              )}
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
          <AppButton className="nav-item" onClick={() => setProfileOpen(true)}>
            <Icon name="user" />
            <span>Yo</span>
          </AppButton>
        </nav>

        {profileOpen && (
          <ProfileScreen
            onClose={() => setProfileOpen(false)}
            onSave={setProfile}
            profile={profile}
          />
        )}

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
