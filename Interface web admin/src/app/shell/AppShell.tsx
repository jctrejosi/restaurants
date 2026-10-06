import { useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { SidebarNav } from "@/app/shell/SidebarNav"
import { Topbar } from "@/app/shell/Topbar"

const SIDEBAR_KEY = "pc_sidebar_collapsed"

export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === "1")
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0")
  }, [collapsed])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="app-shell">
      <SidebarNav
        collapsed={collapsed}
        onCollapse={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      {mobileOpen ? (
        <button
          type="button"
          className="button button--ghost mobile-backdrop"
          aria-label="Cerrar navegación"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <div className="app-main">
        <Topbar onOpenMobile={() => setMobileOpen(true)} />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
