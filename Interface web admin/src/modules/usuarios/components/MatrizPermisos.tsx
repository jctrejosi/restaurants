import { useEffect, useMemo, useState } from "react"
import { Lock, Search, ShieldAlert } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { TextField } from "@/components/ui/fields"
import {
  MODULO_PERMISO_LABEL,
  type PermisoCatalogo,
  type Rol,
} from "@/modules/usuarios/types"

function ordenModulo(modulo: string): string {
  return MODULO_PERMISO_LABEL[modulo] ?? modulo
}

/**
 * Matriz roles × permisos (RF-R5-140): agrupada por módulo, marca los sensibles
 * (RN-R5-06) y muestra el alcance (sede o global). Sin updates optimistas.
 */
export function MatrizPermisos({
  rol,
  catalogo,
  permisosActuales,
  puedeEditar,
  guardando,
  onGuardar,
}: {
  rol: Rol
  catalogo: PermisoCatalogo[]
  permisosActuales: string[]
  puedeEditar: boolean
  guardando: boolean
  onGuardar: (permisos: string[], motivo: string) => void
}) {
  const [draft, setDraft] = useState<string[]>(permisosActuales)
  const [busqueda, setBusqueda] = useState("")
  const [confirmar, setConfirmar] = useState(false)

  useEffect(() => {
    setDraft(permisosActuales)
  }, [permisosActuales, rol.id])

  const seleccion = useMemo(() => new Set(draft), [draft])

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return catalogo.filter((permiso) =>
      termino
        ? permiso.codigo.toLowerCase().includes(termino) ||
          permiso.descripcion.toLowerCase().includes(termino)
        : true,
    )
  }, [catalogo, busqueda])

  const porModulo = useMemo(() => {
    const mapa = new Map<string, PermisoCatalogo[]>()
    for (const permiso of filtrados) {
      const lista = mapa.get(permiso.modulo) ?? []
      lista.push(permiso)
      mapa.set(permiso.modulo, lista)
    }
    return Array.from(mapa.entries()).sort(([a], [b]) => ordenModulo(a).localeCompare(ordenModulo(b)))
  }, [filtrados])

  const activosOriginales = useMemo(() => new Set(permisosActuales), [permisosActuales])
  const agregados = draft.filter((codigo) => !activosOriginales.has(codigo))
  const retirados = permisosActuales.filter((codigo) => !seleccion.has(codigo))
  const hayCambios = agregados.length > 0 || retirados.length > 0

  const alternar = (codigo: string) => {
    if (!puedeEditar) return
    setDraft((actual) =>
      actual.includes(codigo) ? actual.filter((item) => item !== codigo) : [...actual, codigo],
    )
  }

  const alternarModulo = (modulo: string, activar: boolean) => {
    if (!puedeEditar) return
    const codigos = (porModulo.find(([clave]) => clave === modulo)?.[1] ?? []).map(
      (permiso) => permiso.codigo,
    )
    setDraft((actual) => {
      const conjunto = new Set(actual)
      for (const codigo of codigos) {
        if (activar) conjunto.add(codigo)
        else conjunto.delete(codigo)
      }
      return Array.from(conjunto)
    })
  }

  const resumir = (lista: string[], tope = 8) => {
    const muestra = lista.slice(0, tope).join(", ")
    return lista.length > tope ? `${muestra} y ${lista.length - tope} más` : muestra
  }

  return (
    <div className="matriz">
      <div className="matriz__toolbar">
        <TextField
          label="Buscar permiso"
          placeholder="p. ej. caja.reabrir o reembolsar"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />
        <span className="matriz__resumen">
          {draft.length} de {catalogo.length} permisos activos
          {hayCambios ? (
            <strong>
              {" "}
              · {agregados.length} por conceder · {retirados.length} por retirar
            </strong>
          ) : null}
        </span>
      </div>

      {!puedeEditar ? (
        <p className="matriz__nota" role="note">
          <Lock size={14} /> Solo lectura: se requiere el permiso <code>roles.permisos</code> para
          editar la matriz.
        </p>
      ) : null}

      <div className="matriz__grupos">
        {porModulo.map(([modulo, permisos]) => {
          const activosModulo = permisos.filter((permiso) => seleccion.has(permiso.codigo)).length
          return (
            <section className="matriz__grupo" key={modulo} aria-label={ordenModulo(modulo)}>
              <header className="matriz__grupo-head">
                <div>
                  <strong>{ordenModulo(modulo)}</strong>
                  <small>
                    {activosModulo} de {permisos.length} activos
                  </small>
                </div>
                <div className="matriz__grupo-acciones">
                  <Button
                    variant="ghost"
                    className="text-action"
                    disabled={!puedeEditar}
                    onClick={() => alternarModulo(modulo, true)}
                  >
                    Marcar todos
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-action"
                    disabled={!puedeEditar}
                    onClick={() => alternarModulo(modulo, false)}
                  >
                    Quitar
                  </Button>
                </div>
              </header>
              <div className="matriz__filas">
                {permisos.map((permiso) => {
                  const activo = seleccion.has(permiso.codigo)
                  return (
                    <label
                      className={`matriz__fila ${activo ? "matriz__fila--activa" : ""} ${
                        puedeEditar ? "" : "matriz__fila--readonly"
                      }`}
                      key={permiso.codigo}
                    >
                      <input
                        type="checkbox"
                        checked={activo}
                        disabled={!puedeEditar}
                        onChange={() => alternar(permiso.codigo)}
                      />
                      <span className="matriz__fila-copy">
                        <span className="matriz__fila-titulo">
                          {permiso.descripcion}
                          {permiso.sensible ? (
                            <StatusBadge tone="amber" title="Permiso sensible (RN-R5-06)">
                              <ShieldAlert size={11} /> Sensible
                            </StatusBadge>
                          ) : null}
                          <StatusBadge tone="outline">
                            {permiso.alcance === "global" ? "Global" : "Sede"}
                          </StatusBadge>
                        </span>
                        <code>{permiso.codigo}</code>
                      </span>
                    </label>
                  )
                })}
              </div>
            </section>
          )
        })}
        {porModulo.length === 0 ? (
          <p className="matriz__vacio">
            <Search size={15} /> Ningún permiso coincide con «{busqueda}».
          </p>
        ) : null}
      </div>

      <div className="matriz__footer">
        <span>
          Los cambios de autorización no se aplican de forma optimista: se confirman y quedan
          auditados con motivo.
        </span>
        <Button
          variant="primary"
          disabled={!puedeEditar || !hayCambios || guardando}
          onClick={() => setConfirmar(true)}
        >
          {guardando ? "Guardando…" : "Guardar matriz"}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmar}
        title={`Actualizar permisos de ${rol.nombre}`}
        description="El cambio aplica de inmediato a las sesiones abiertas de los usuarios con este rol."
        impacto={
          hayCambios
            ? [
                agregados.length > 0 ? `Se conceden: ${resumir(agregados)}.` : "",
                retirados.length > 0 ? `Se retiran: ${resumir(retirados)}.` : "",
              ]
                .filter(Boolean)
                .join(" ")
            : "Sin cambios."
        }
        confirmLabel="Confirmar cambio"
        onCancel={() => setConfirmar(false)}
        onConfirm={(motivo) => {
          setConfirmar(false)
          onGuardar([...draft], motivo)
        }}
      />
    </div>
  )
}
