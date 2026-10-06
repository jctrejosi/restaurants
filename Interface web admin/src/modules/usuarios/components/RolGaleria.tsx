import { Copy, KeyRound, Pencil, Plus, Shield, Users } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { SkeletonCards } from "@/components/ui/Skeleton"
import { StatusBadge } from "@/components/ui/StatusBadge"
import type { Rol } from "@/modules/usuarios/types"

/** Galería de plantillas de rol clonables (RF-R5-141, plan 17 §6). */
export function RolGaleria({
  roles,
  cargando,
  error,
  onRetry,
  puedeEditar,
  puedeClonar,
  puedeVerPermisos,
  onNuevo,
  onEditar,
  onClonar,
  onAbrirMatriz,
}: {
  roles: Rol[]
  cargando: boolean
  error: Error | null
  onRetry: () => void
  puedeEditar: boolean
  puedeClonar: boolean
  puedeVerPermisos: boolean
  onNuevo: () => void
  onEditar: (rol: Rol) => void
  onClonar: (rol: Rol) => void
  onAbrirMatriz: (rol: Rol) => void
}) {
  if (error) return <ErrorState onRetry={onRetry} description="No pudimos cargar los roles del tenant." />
  if (cargando) return <SkeletonCards count={6} />
  if (roles.length === 0) {
    return (
      <EmptyState
        title="No hay roles en este tenant"
        description="Crea una plantilla o clona una de sistema para empezar a asignar permisos."
        action={puedeEditar ? { label: "Nuevo rol", onClick: onNuevo } : undefined}
        icon={<Shield size={22} />}
      />
    )
  }

  return (
    <div className="rol-galeria">
      {roles.map((rol) => (
        <article className={`rol-card ${rol.esSistema ? "rol-card--sistema" : ""}`} key={rol.id}>
          <header className="rol-card__head">
            <div>
              <strong>{rol.nombre}</strong>
              <small>{rol.esSistema ? "Plantilla de sistema" : "Plantilla local"}</small>
            </div>
            <StatusBadge tone={rol.esSistema ? "blue" : "outline"}>
              {rol.esSistema ? "Sistema" : "Local"}
            </StatusBadge>
          </header>
          <p className="rol-card__descripcion">{rol.descripcion}</p>
          <div className="rol-card__metricas">
            <span title="Permisos activos">
              <KeyRound size={13} /> {rol.permisosCount} permisos
            </span>
            <span title="Usuarios con este rol">
              <Users size={13} /> {rol.usuariosCount} usuarios
            </span>
          </div>
          <footer className="rol-card__acciones">
            <Button
              variant="primary"
              disabled={!puedeVerPermisos}
              title={puedeVerPermisos ? undefined : "Requiere permiso de roles.ver"}
              onClick={() => onAbrirMatriz(rol)}
            >
              Matriz de permisos
            </Button>
            <Button
              variant="secondary"
              disabled={!puedeClonar}
              title={puedeClonar ? "Clona la plantilla y ajusta el clon" : "Requiere permiso de roles.clonar"}
              onClick={() => onClonar(rol)}
            >
              <Copy size={14} /> Clonar
            </Button>
            <Button
              variant="ghost"
              disabled={!puedeEditar || rol.esSistema}
              title={
                rol.esSistema
                  ? "Los roles de sistema no se renombran; clónalos para ajustarlos"
                  : puedeEditar
                    ? undefined
                    : "Requiere permiso de roles.editar"
              }
              onClick={() => onEditar(rol)}
            >
              <Pencil size={14} /> Editar
            </Button>
          </footer>
        </article>
      ))}

      {puedeEditar ? (
        <button type="button" className="rol-card rol-card--nueva" onClick={onNuevo}>
          <Plus size={20} />
          <strong>Nuevo rol</strong>
          <span>Crea una plantilla local y define su matriz</span>
        </button>
      ) : null}
    </div>
  )
}
