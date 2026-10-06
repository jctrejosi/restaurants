/**
 * Permisos por `modulo.accion` (00-indice §4.3). Un permiso retirado aplica de
 * inmediato (RF-R5-140): la UI consulta el conjunto vigente en cada render.
 */

export type Permiso = string

export const PERMISO_GLOBAL = "*"

export function toPermisoSet(permisos: ReadonlyArray<string> | ReadonlySet<string>): Set<string> {
  return permisos instanceof Set ? permisos : new Set(permisos)
}

/**
 * `hasPermiso(["pedidos.ver"], "pedidos.anular") → false`
 * `hasPermiso(["pedidos.*"], "pedidos.anular") → true`
 * `hasPermiso(["*"], "caja.reabrir") → true`
 */
export function hasPermiso(
  permisos: ReadonlyArray<string> | ReadonlySet<string>,
  permiso: Permiso,
): boolean {
  const set = toPermisoSet(permisos)
  if (set.has(PERMISO_GLOBAL) || set.has(permiso)) return true
  const [modulo] = permiso.split(".")
  return modulo ? set.has(`${modulo}.*`) : false
}

/** Nombre legible de un permiso para tooltips: `caja.reabrir` → «Reabrir caja». */
export function describePermiso(permiso: Permiso): string {
  const [modulo, accion] = permiso.split(".")
  const accionTexto = (accion ?? permiso).replace(/_/g, " ")
  return `${accionTexto.charAt(0).toUpperCase()}${accionTexto.slice(1)}${modulo ? ` (${modulo})` : ""}`
}
