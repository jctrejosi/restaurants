import type { ReactNode } from "react"
import { useAuth } from "@/app/auth"
import { NoPermissionState } from "@/components/ui/states"

/** Guarda de módulo/acción por permiso `modulo.accion` (00-indice §4.3). */
export function RequirePermiso({ permiso, children }: { permiso: string; children: ReactNode }) {
  const { tienePermiso } = useAuth()
  if (!tienePermiso(permiso)) return <NoPermissionState permiso={permiso} />
  return <>{children}</>
}
