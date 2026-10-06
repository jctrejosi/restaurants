import { ChevronDown, LogOut, UserCog } from "lucide-react"
import { useAuth } from "@/app/auth"
import { Button } from "@/components/ui/Button"
import { usePopover } from "@/components/ui/usePopover"
import { initials } from "@/lib/format"

export function UserMenu() {
  const { usuario, cerrarSesion } = useAuth()
  const { open, setOpen, ref } = usePopover<HTMLDivElement>()

  return (
    <div className="user-menu-wrap" ref={ref}>
      <Button variant="ghost" className="user-menu" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="avatar">{initials(usuario.nombre)}</span>
        <span className="user-copy">
          <strong>{usuario.nombre}</strong>
          <small>{usuario.rol}</small>
        </span>
        <ChevronDown size={15} />
      </Button>
      {open ? (
        <div className="popover user-popover" role="menu">
          <div className="user-popover__head">
            <span className="avatar avatar--soft">{initials(usuario.nombre)}</span>
            <div>
              <strong>{usuario.nombre}</strong>
              <small>{usuario.email}</small>
            </div>
          </div>
          <button type="button" role="menuitem" className="button button--ghost" disabled>
            <UserCog size={16} /> Preferencias
          </button>
          <button type="button" role="menuitem" className="button button--ghost" onClick={cerrarSesion}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  )
}
