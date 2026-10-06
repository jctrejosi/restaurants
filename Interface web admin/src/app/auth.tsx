/**
 * Sesión del panel. Mientras no exista `/entrar` con la API real, se usa un
 * usuario de desarrollo con permiso global. La forma del objeto ya es la final
 * (R5 §2): rol + alcance por sucursal + permisos `modulo.accion`.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { hasPermiso, type Permiso } from "@/lib/permissions"

export type Usuario = {
  id: string
  nombre: string
  email: string
  rol: string
  /** `["*"]` = administrador global; si no, `modulo.accion` o `modulo.*`. */
  permisos: string[]
  /** `sucursalIds` vacío = todas las sedes. */
  sucursalIds: string[]
}

const USUARIO_DEV: Usuario = {
  id: "u-dev",
  nombre: "María Gómez",
  email: "maria.gomez@puntoc.mx",
  rol: "Gerente de sede",
  permisos: ["*"],
  sucursalIds: [],
}

type AuthContextValue = {
  usuario: Usuario
  permisos: Set<string>
  tienePermiso: (permiso: Permiso) => boolean
  cerrarSesion: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario] = useState<Usuario>(USUARIO_DEV)

  const value = useMemo<AuthContextValue>(() => {
    const permisos = new Set(usuario.permisos)
    return {
      usuario,
      permisos,
      tienePermiso: (permiso) => hasPermiso(permisos, permiso),
      cerrarSesion: () => {
        localStorage.removeItem("pc_token")
        window.location.assign("/entrar")
      },
    }
  }, [usuario])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth debe usarse dentro de <AuthProvider>")
  return context
}
