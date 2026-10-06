import { NavLink } from "react-router-dom"
import { ChevronLeft, ChevronRight, HelpCircle, X } from "lucide-react"
import { AYUDA, NAV_BLOCKS } from "@/app/nav"
import { useAuth } from "@/app/auth"
import { describePermiso } from "@/lib/permissions"
import { IconButton } from "@/components/ui/IconButton"

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="brand">
      <div className="brand__mark">
        <span>P</span>
      </div>
      {!collapsed ? (
        <div>
          <div className="brand__name">Punto C</div>
          <div className="brand__sub">Administración</div>
        </div>
      ) : null}
    </div>
  )
}

export function SidebarNav({
  collapsed,
  onCollapse,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean
  onCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}) {
  const { tienePermiso } = useAuth()

  return (
    <aside
      className={`sidebar ${collapsed ? "sidebar--collapsed" : ""} ${
        mobileOpen ? "sidebar--mobile-open" : ""
      }`}
    >
      <div className="sidebar__top">
        <Logo collapsed={collapsed} />
        <IconButton label="Cerrar menú" className="mobile-close" onClick={onCloseMobile}>
          <X size={18} />
        </IconButton>
      </div>

      <nav className="sidebar__nav" aria-label="Navegación principal">
        {NAV_BLOCKS.map((group) => (
          <div className="nav-group" key={group.label}>
            {!collapsed ? <div className="nav-group__label">{group.label}</div> : null}
            {group.items.map((item) => {
              const Icon = item.icon
              const permitido = tienePermiso(item.permiso)
              if (!permitido) {
                return (
                  <button
                    key={item.path}
                    type="button"
                    className="button button--ghost nav-item nav-item--disabled"
                    disabled
                    title={`Requiere permiso de ${describePermiso(item.permiso)}`}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    {!collapsed ? <span className="nav-item__text">{item.nombre}</span> : null}
                  </button>
                )
              }
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  title={collapsed ? item.nombre : undefined}
                  className={({ isActive }) =>
                    `button button--ghost nav-item ${isActive ? "nav-item--active" : ""}`
                  }
                >
                  <Icon size={18} strokeWidth={1.8} />
                  {!collapsed ? <span className="nav-item__text">{item.nombre}</span> : null}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar__bottom">
        <NavLink
          to={AYUDA.path}
          onClick={onCloseMobile}
          className={({ isActive }) =>
            `button button--ghost nav-item ${isActive ? "nav-item--active" : ""}`
          }
        >
          <HelpCircle size={18} />
          {!collapsed ? <span className="nav-item__text">{AYUDA.nombre}</span> : null}
        </NavLink>
        <button type="button" className="button button--ghost collapse-button" onClick={onCollapse}>
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          {!collapsed ? <span>Contraer menú</span> : null}
        </button>
      </div>
    </aside>
  )
}
