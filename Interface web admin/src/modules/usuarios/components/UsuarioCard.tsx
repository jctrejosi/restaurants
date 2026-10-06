import { Mail, ShieldCheck } from "lucide-react"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { initials } from "@/lib/format"
import {
  DOS_FA_LABEL,
  ESTADO_USUARIO_LABEL,
  ESTADO_USUARIO_TONE,
  type Rol,
  type Usuario,
} from "@/modules/usuarios/types"

/** Resumen de identidad con roles y sedes (plan 17 §6). */
export function UsuarioCard({
  usuario,
  roles,
  nombreSede,
}: {
  usuario: Usuario
  roles: Rol[]
  nombreSede: (sucursalId: string | null) => string
}) {
  const nombreRol = (rolId: string) => roles.find((rol) => rol.id === rolId)?.nombre ?? rolId
  const sedes = Array.from(new Set(usuario.roles.map((asignacion) => nombreSede(asignacion.sucursalId))))

  return (
    <div className="usuario-card">
      <span className="usuario-card__avatar" aria-hidden="true">
        {initials(usuario.nombre)}
      </span>
      <div className="usuario-card__copy">
        <div className="usuario-card__top">
          <strong>{usuario.nombre}</strong>
          <StatusBadge tone={ESTADO_USUARIO_TONE[usuario.estado]}>
            {ESTADO_USUARIO_LABEL[usuario.estado]}
          </StatusBadge>
        </div>
        <span className="usuario-card__email">
          <Mail size={12} /> {usuario.email}
        </span>
        <div className="usuario-card__chips">
          {usuario.roles.map((asignacion) => (
            <span className="chip" key={`${asignacion.rolId}-${asignacion.sucursalId ?? "todas"}`}>
              {nombreRol(asignacion.rolId)}
              <small>{nombreSede(asignacion.sucursalId)}</small>
            </span>
          ))}
          {usuario.roles.length === 0 ? <span className="chip chip--muted">Sin rol asignado</span> : null}
        </div>
        <div className="usuario-card__meta">
          <span>
            <ShieldCheck size={12} /> {DOS_FA_LABEL[usuario.dosFa]}
          </span>
          <span>{sedes.length > 0 ? sedes.join(" · ") : "Sin alcance definido"}</span>
        </div>
      </div>
    </div>
  )
}
