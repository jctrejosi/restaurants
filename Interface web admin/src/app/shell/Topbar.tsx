import { Menu } from "lucide-react"
import { IconButton } from "@/components/ui/IconButton"
import { SedeSelector } from "@/app/shell/SedeSelector"
import { AlertBell } from "@/app/shell/AlertBell"
import { UserMenu } from "@/app/shell/UserMenu"
import { GlobalSearch } from "@/app/shell/GlobalSearch"

export function Topbar({ onOpenMobile }: { onOpenMobile: () => void }) {
  return (
    <header className="topbar">
      <IconButton label="Abrir navegación" className="menu-trigger" onClick={onOpenMobile}>
        <Menu size={20} />
      </IconButton>
      <GlobalSearch />
      <div className="topbar__actions">
        <SedeSelector />
        <AlertBell />
        <div className="topbar__divider" />
        <UserMenu />
      </div>
    </header>
  )
}
