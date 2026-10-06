import { useMemo, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Ban, Info, KeyRound, Plus, Power, RefreshCw, ShieldCheck, UsersRound } from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { FilterBar, type ActiveFilter } from "@/components/data/FilterBar"
import { PageHeader } from "@/components/data/PageHeader"
import { SavedViewChip } from "@/components/data/SavedViewChip"
import { Tabs } from "@/components/data/Tabs"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Drawer } from "@/components/ui/Drawer"
import { IconButton } from "@/components/ui/IconButton"
import { EmptyState, ErrorState, NoPermissionState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SelectField, TextField, type SelectOption } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { ApiError } from "@/lib/api"
import { formatDateTime, formatRelative, initials } from "@/lib/format"
import { useSocketEvent } from "@/lib/realtime"
import {
  useAccionUsuario,
  useClonarRol,
  useCrearRol,
  useEditarRol,
  useGuardarPermisosRol,
  usePermisosCatalogo,
  useRolPermisos,
  useRoles,
  useSesionSimulada,
  useUsuarios,
} from "@/modules/usuarios/api"
import { MatrizPermisos } from "@/modules/usuarios/components/MatrizPermisos"
import { RolEditorDialog } from "@/modules/usuarios/components/RolEditorDialog"
import { RolGaleria } from "@/modules/usuarios/components/RolGaleria"
import { UsuarioEditorDrawer } from "@/modules/usuarios/components/UsuarioEditorDrawer"
import {
  ESTADO_USUARIO_LABEL,
  ESTADO_USUARIO_TONE,
  type Rol,
  type Usuario,
  type UsuarioEstado,
  type UsuarioFiltros,
} from "@/modules/usuarios/types"
import "@/modules/usuarios/usuarios.css"

const PAGE_SIZE = 10

const VISTAS_PRESET: { id: string; label: string; params: Record<string, string> }[] = [
  { id: "suspendidos", label: "Suspendidos", params: { estado: "suspendido" } },
  { id: "bajas", label: "Bajas", params: { estado: "baja" } },
]

function leerFiltros(searchParams: URLSearchParams, sedeActiva: string | null): UsuarioFiltros {
  const page = Number(searchParams.get("page") ?? "1")
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: PAGE_SIZE,
    busqueda: searchParams.get("q") ?? undefined,
    rolId: searchParams.get("rol") ?? undefined,
    sedeId: searchParams.get("sede") ?? sedeActiva ?? undefined,
    estado: (searchParams.get("estado") as UsuarioEstado | null) ?? undefined,
  }
}

function mensajeError(error: unknown): string {
  return error instanceof ApiError ? error.message : "Ocurrió un error inesperado"
}

export default function UsuariosPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { mostrar } = useToast()
  const { tienePermiso } = useAuth()
  const { sedeId, sedes } = useSede()
  const [searchParams, setSearchParams] = useSearchParams()
  const sesionSimulada = useSesionSimulada()

  const esVistaRoles = location.pathname.startsWith("/roles")

  const filtros = useMemo(() => leerFiltros(searchParams, sedeId), [searchParams, sedeId])
  const usuarios = useUsuarios(filtros)
  const roles = useRoles()
  const catalogo = usePermisosCatalogo()

  const rolMatrizId = searchParams.get("rol")
  const rolPermisos = useRolPermisos(esVistaRoles ? rolMatrizId : null)
  const guardarPermisos = useGuardarPermisosRol()
  const clonarRol = useClonarRol()
  const crearRol = useCrearRol()
  const editarRol = useEditarRol()
  const accionUsuario = useAccionUsuario()

  const [clonar, setClonar] = useState<Rol | null>(null)
  const [editorRol, setEditorRol] = useState<{ rol: Rol | null } | null>(null)
  const [errorRol, setErrorRol] = useState<string | null>(null)
  const [accion, setAccion] = useState<{ usuario: Usuario; tipo: "suspender" | "reactivar" } | null>(null)

  useSocketEvent(
    ["usuario.creado", "usuario.actualizado", "usuario.estado", "rol.actualizado", "permisos.actualizados", "sesion.revocada"],
    () => {
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] })
      void queryClient.invalidateQueries({ queryKey: ["roles"] })
    },
  )

  const puedeVerUsuarios = tienePermiso("usuarios.ver")
  const puedeVerRoles = tienePermiso("roles.ver")
  const puedeCrearUsuario = tienePermiso("usuarios.crear")
  const puedeSuspender = tienePermiso("usuarios.suspender")
  const puedeEditarRol = tienePermiso("roles.editar")
  const puedeClonar = tienePermiso("roles.clonar")
  const puedePermisos = tienePermiso("roles.permisos")

  const actualizar = (cambios: Record<string, string | undefined>, reiniciarPagina = true) => {
    const siguiente = new URLSearchParams(searchParams)
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === undefined || valor === "") siguiente.delete(clave)
      else siguiente.set(clave, valor)
    }
    if (reiniciarPagina) siguiente.delete("page")
    setSearchParams(siguiente, { replace: true })
  }

  const irAVista = (vista: "usuarios" | "roles") => {
    navigate(vista === "roles" ? "/roles" : "/usuarios")
  }

  const nombreSede = (sucursalId: string | null) =>
    sucursalId === null ? "Todas las sedes" : sedes.find((sede) => sede.id === sucursalId)?.nombre ?? sucursalId

  const nombreRol = (rolId: string) => roles.data?.find((rol) => rol.id === rolId)?.nombre ?? rolId

  const columnas: Column<Usuario>[] = [
      {
        key: "usuario",
        header: "Usuario",
        cell: (row) => (
          <span className="usuario-celda">
            <span className="usuario-celda__avatar" aria-hidden="true">
              {initials(row.nombre)}
            </span>
            <span>
              <strong>{row.nombre}</strong>
              <small>{row.email}</small>
            </span>
          </span>
        ),
      },
      {
        key: "roles",
        header: "Roles y alcance",
        cell: (row) =>
          row.roles.length === 0 ? (
            <span className="texto-tenue">Sin rol</span>
          ) : (
            <span className="chips-celda">
              {row.roles.map((asignacion) => (
                <span className="chip" key={`${asignacion.rolId}-${asignacion.sucursalId ?? "todas"}`}>
                  {nombreRol(asignacion.rolId)}
                  <small>{nombreSede(asignacion.sucursalId)}</small>
                </span>
              ))}
            </span>
          ),
      },
      {
        key: "acceso",
        header: "Último acceso",
        cell: (row) =>
          row.ultimoAccesoEn ? (
            <>
              <strong className="texto-fuerte">{formatRelative(row.ultimoAccesoEn)}</strong>
              <small className="texto-tenue">{formatDateTime(row.ultimoAccesoEn)}</small>
            </>
          ) : (
            <span className="texto-tenue">Nunca</span>
          ),
      },
      {
        key: "dosfa",
        header: "2FA",
        cell: (row) =>
          row.dosFa === "activo" ? (
            <StatusBadge tone="green">Activo</StatusBadge>
          ) : row.dosFa === "pendiente" ? (
            <StatusBadge tone="amber">Pendiente</StatusBadge>
          ) : (
            <span className="texto-tenue">—</span>
          ),
      },
      {
        key: "estado",
        header: "Estado",
        cell: (row) => (
          <StatusBadge tone={ESTADO_USUARIO_TONE[row.estado]}>{ESTADO_USUARIO_LABEL[row.estado]}</StatusBadge>
        ),
      },
      {
        key: "acciones",
        header: "",
        align: "right",
        cell: (row) => (
          <span className="fila-acciones" onClick={(event) => event.stopPropagation()}>
            {row.estado === "activo" ? (
              <IconButton
                label="Suspender usuario"
                disabled={!puedeSuspender}
                title={puedeSuspender ? "Suspender" : "Requiere permiso de usuarios.suspender"}
                onClick={() => setAccion({ usuario: row, tipo: "suspender" })}
              >
                <Ban size={15} />
              </IconButton>
            ) : (
              <IconButton
                label="Reactivar usuario"
                disabled={!puedeSuspender}
                title={puedeSuspender ? "Reactivar" : "Requiere permiso de usuarios.suspender"}
                onClick={() => setAccion({ usuario: row, tipo: "reactivar" })}
              >
                <Power size={15} />
              </IconButton>
            )}
          </span>
        ),
      },
  ]

  const filtrosActivos: ActiveFilter[] = []
  if (filtros.busqueda) filtrosActivos.push({ key: "q", label: `Búsqueda: «${filtros.busqueda}»` })
  if (filtros.rolId) filtrosActivos.push({ key: "rol", label: `Rol: ${nombreRol(filtros.rolId)}` })
  if (filtros.estado) filtrosActivos.push({ key: "estado", label: `Estado: ${ESTADO_USUARIO_LABEL[filtros.estado]}` })
  if (searchParams.get("sede")) {
    filtrosActivos.push({ key: "sede", label: `Sede: ${nombreSede(searchParams.get("sede"))}` })
  }

  const limpiarFiltros = () => {
    const siguiente = new URLSearchParams(searchParams)
    for (const clave of ["q", "rol", "estado", "page"]) siguiente.delete(clave)
    setSearchParams(siguiente, { replace: true })
  }

  const opcionesSede: SelectOption[] = [
    { value: "", label: "Sede activa" },
    ...sedes.map((sede) => ({ value: sede.id, label: sede.nombre })),
  ]
  const opcionesRol: SelectOption[] = (roles.data ?? []).map((rol) => ({ value: rol.id, label: rol.nombre }))
  const opcionesEstado: SelectOption[] = (Object.keys(ESTADO_USUARIO_LABEL) as UsuarioEstado[]).map((valor) => ({
    value: valor,
    label: ESTADO_USUARIO_LABEL[valor],
  }))

  const usuarioDrawerId = searchParams.get("usuario")
  const creando = searchParams.get("nuevo") === "1"
  const abrirDrawer = usuarioDrawerId || creando

  const total = usuarios.data?.total ?? 0
  const pagina = usuarios.data?.page ?? filtros.page
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const vacioUsuarios = !usuarios.isLoading && !usuarios.isError && (usuarios.data?.data.length ?? 0) === 0

  if (esVistaRoles && !puedeVerRoles) {
    return (
      <div className="module-page">
        <PageHeader eyebrow="Configuración / Roles" title="Roles y plantillas" />
        <NoPermissionState permiso="roles.ver" />
      </div>
    )
  }

  if (!esVistaRoles && !puedeVerUsuarios) {
    return (
      <div className="module-page">
        <PageHeader eyebrow="Configuración / Usuarios" title="Usuarios" />
        <NoPermissionState permiso="usuarios.ver" />
      </div>
    )
  }

  return (
    <div className="module-page">
      <PageHeader
        eyebrow={esVistaRoles ? "Configuración / Roles" : "Configuración / Usuarios"}
        title={esVistaRoles ? "Roles y plantillas" : "Usuarios"}
        subtitle={
          esVistaRoles
            ? "Plantillas clonables y matriz de permisos roles × permisos con alcance por sede."
            : "Altas, bajas y suspensiones auditadas, con alcance por sucursal y segundo factor."
        }
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                if (esVistaRoles) void roles.refetch()
                else void usuarios.refetch()
              }}
            >
              <RefreshCw size={15} /> Actualizar
            </Button>
            {esVistaRoles ? (
              <Button
                variant="primary"
                disabled={!puedeEditarRol}
                title={puedeEditarRol ? undefined : "Requiere permiso de roles.editar"}
                onClick={() => {
                  setErrorRol(null)
                  setEditorRol({ rol: null })
                }}
              >
                <Plus size={16} /> Nuevo rol
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={!puedeCrearUsuario}
                title={puedeCrearUsuario ? undefined : "Requiere permiso de usuarios.crear"}
                onClick={() => actualizar({ nuevo: "1", usuario: undefined })}
              >
                <Plus size={16} /> Nuevo usuario
              </Button>
            )}
          </>
        }
      />

      <Tabs
        tabs={[
          { id: "usuarios", label: <span className="tab-inline"><UsersRound size={14} /> Usuarios</span> },
          { id: "roles", label: <span className="tab-inline"><ShieldCheck size={14} /> Roles y permisos</span> },
        ]}
        value={esVistaRoles ? "roles" : "usuarios"}
        onChange={(id) => irAVista(id === "roles" ? "roles" : "usuarios")}
      />

      <div className={`sesion-simulada ${sesionSimulada.version > 0 ? "sesion-simulada--activa" : ""}`} role="status">
        <Info size={15} />
        <span>
          <strong>Efecto inmediato:</strong> {sesionSimulada.razon}
          {sesionSimulada.version > 0 ? ` · ${formatRelative(sesionSimulada.actualizadoEn)}` : ""}
        </span>
      </div>

      {esVistaRoles ? (
        <>
          <RolGaleria
            roles={roles.data ?? []}
            cargando={roles.isLoading}
            error={roles.isError ? (roles.error as Error) : null}
            onRetry={() => void roles.refetch()}
            puedeEditar={puedeEditarRol}
            puedeClonar={puedeClonar}
            puedeVerPermisos={puedeVerRoles}
            onNuevo={() => {
              setErrorRol(null)
              setEditorRol({ rol: null })
            }}
            onEditar={(rol) => {
              setErrorRol(null)
              setEditorRol({ rol })
            }}
            onClonar={(rol) => setClonar(rol)}
            onAbrirMatriz={(rol) => actualizar({ rol: rol.id }, false)}
          />
          <p className="roles-nota">
            <KeyRound size={14} /> Los roles de sistema se clonan y ajustan; el original no se
            renombra ni se borra.
          </p>
        </>
      ) : (
        <>
          <FilterBar
            activeFilters={filtrosActivos}
            onClear={filtrosActivos.length > 0 ? limpiarFiltros : undefined}
            actions={null}
          >
            <SelectField
              label="Sede"
              options={opcionesSede}
              value={searchParams.get("sede") ?? ""}
              onChange={(event) => actualizar({ sede: event.target.value || undefined })}
            />
            <SelectField
              label="Rol"
              options={opcionesRol}
              placeholder="Todos"
              value={searchParams.get("rol") ?? ""}
              onChange={(event) => actualizar({ rol: event.target.value || undefined })}
            />
            <SelectField
              label="Estado"
              options={opcionesEstado}
              placeholder="Todos"
              value={searchParams.get("estado") ?? ""}
              onChange={(event) => actualizar({ estado: event.target.value || undefined })}
            />
            <TextField
              label="Buscar"
              placeholder="Nombre o correo"
              value={searchParams.get("q") ?? ""}
              onChange={(event) => actualizar({ q: event.target.value || undefined })}
            />
          </FilterBar>

          <div className="saved-views">
            <span className="saved-views__label">Vistas</span>
            {VISTAS_PRESET.map((vista) => (
              <SavedViewChip
                key={vista.id}
                label={vista.label}
                active={Object.entries(vista.params).every(([clave, valor]) => searchParams.get(clave) === valor)}
                onClick={() => actualizar(vista.params)}
              />
            ))}
          </div>

          {usuarios.isError ? (
            <ErrorState
              description="No pudimos cargar los usuarios de la sede en alcance."
              onRetry={() => void usuarios.refetch()}
            />
          ) : vacioUsuarios ? (
            <EmptyState
              title="Aún no hay usuarios en esta sede"
              description="Da de alta al equipo y asigna sus plantillas de rol con alcance por sucursal."
              action={
                puedeCrearUsuario ? { label: "Nuevo usuario", onClick: () => actualizar({ nuevo: "1" }) } : undefined
              }
            />
          ) : (
            <section className="panel">
              <DataTable
                columns={columnas}
                rows={usuarios.data?.data ?? []}
                getRowKey={(row) => row.id}
                onRowClick={(row) => actualizar({ usuario: row.id, nuevo: undefined }, false)}
                loading={usuarios.isLoading}
                emptyTitle="Sin usuarios para estos filtros"
                emptyDescription="Ajusta el rol, la sede o el estado, o limpia los filtros."
                footer={
                  <div className="usuarios-paginacion">
                    <span>
                      {usuarios.isFetching ? "Actualizando…" : "En vivo"} · {total} usuarios
                    </span>
                    <span className="usuarios-paginacion__controls">
                      <Button
                        variant="ghost"
                        className="text-action"
                        disabled={pagina <= 1}
                        onClick={() => actualizar({ page: String(pagina - 1) }, false)}
                      >
                        Anterior
                      </Button>
                      <span>
                        Página {pagina} de {totalPaginas}
                      </span>
                      <Button
                        variant="ghost"
                        className="text-action"
                        disabled={pagina >= totalPaginas}
                        onClick={() => actualizar({ page: String(pagina + 1) }, false)}
                      >
                        Siguiente
                      </Button>
                    </span>
                  </div>
                }
              />
            </section>
          )}
        </>
      )}

      <UsuarioEditorDrawer
        usuarioId={creando ? null : usuarioDrawerId}
        abierto={Boolean(abrirDrawer) && !esVistaRoles}
        onClose={() => actualizar({ usuario: undefined, nuevo: undefined }, false)}
        roles={roles.data ?? []}
        onVerAuditoria={(auditoriaId, etiqueta) => {
          mostrar(`Auditoría de «${etiqueta}» (${auditoriaId}): se abre en el módulo Auditoría`)
        }}
      />

      <Drawer
        open={esVistaRoles && Boolean(rolMatrizId)}
        onClose={() => actualizar({ rol: undefined }, false)}
        title={rolPermisos.data ? `Permisos · ${rolPermisos.data.rol.nombre}` : "Permisos del rol"}
        subtitle={
          rolPermisos.data
            ? `${rolPermisos.data.rol.esSistema ? "Plantilla de sistema" : "Plantilla local"} · ${
                rolPermisos.data.rol.usuariosCount
              } usuarios asignados`
            : undefined
        }
        width={760}
      >
        {rolPermisos.isLoading ? <SkeletonRows rows={6} columns={3} /> : null}
        {rolPermisos.isError ? (
          <ErrorState
            description="No pudimos cargar la matriz de permisos."
            onRetry={() => void rolPermisos.refetch()}
          />
        ) : null}
        {rolPermisos.data && catalogo.data ? (
          <MatrizPermisos
            rol={rolPermisos.data.rol}
            catalogo={catalogo.data}
            permisosActuales={rolPermisos.data.permisos}
            puedeEditar={puedePermisos}
            guardando={guardarPermisos.isPending}
            onGuardar={(permisos, motivo) => {
              const datos = rolPermisos.data
              if (!datos) return
              guardarPermisos.mutate(
                { rolId: datos.rol.id, permisos, version: datos.rol.version, motivo },
                {
                  onSuccess: () => mostrar("Matriz guardada; los permisos aplican de inmediato", "exito"),
                  onError: (error) => mostrar(mensajeError(error), "error"),
                },
              )
            }}
          />
        ) : null}
        {catalogo.isError ? (
          <ErrorState description="No pudimos cargar el catálogo de permisos." onRetry={() => void catalogo.refetch()} />
        ) : null}
      </Drawer>

      <RolEditorDialog
        open={editorRol !== null}
        rol={editorRol?.rol ?? null}
        guardando={crearRol.isPending || editarRol.isPending}
        errorServidor={errorRol}
        onCancel={() => setEditorRol(null)}
        onGuardar={({ nombre, descripcion }) => {
          setErrorRol(null)
          if (editorRol?.rol) {
            editarRol.mutate(
              { id: editorRol.rol.id, nombre, descripcion, version: editorRol.rol.version },
              {
                onSuccess: () => {
                  mostrar("Rol actualizado y auditado", "exito")
                  setEditorRol(null)
                },
                onError: (error) => setErrorRol(mensajeError(error)),
              },
            )
          } else {
            crearRol.mutate(
              { nombre, descripcion, permisos: [] },
              {
                onSuccess: () => {
                  mostrar("Rol creado; define su matriz de permisos", "exito")
                  setEditorRol(null)
                },
                onError: (error) => setErrorRol(mensajeError(error)),
              },
            )
          }
        }}
      />

      <ConfirmDialog
        open={clonar !== null}
        title={`Clonar ${clonar?.nombre ?? "plantilla"}`}
        description="Se copian sus permisos a una plantilla local ajustable; el original no cambia."
        impacto={clonar ? `${clonar.permisosCount} permisos pasarán al clon «${clonar.nombre} (copia)».` : undefined}
        confirmLabel="Clonar plantilla"
        onCancel={() => setClonar(null)}
        onConfirm={(motivo) => {
          const rol = clonar
          setClonar(null)
          if (!rol) return
          clonarRol.mutate(
            { id: rol.id, nombre: `${rol.nombre} (copia)`, motivo },
            {
              onSuccess: (copia) => mostrar(`Plantilla clonada: ${copia.nombre}`, "exito"),
              onError: (error) => mostrar(mensajeError(error), "error"),
            },
          )
        }}
      />

      <ConfirmDialog
        open={accion !== null}
        title={
          accion?.tipo === "suspender"
            ? `Suspender a ${accion.usuario.nombre}`
            : `Reactivar a ${accion?.usuario.nombre ?? ""}`
        }
        description={
          accion?.tipo === "suspender"
            ? "La suspensión aplica de inmediato: sus sesiones abiertas quedan invalidadas."
            : "El usuario recupera el acceso con los mismos roles y alcance."
        }
        impacto={
          accion?.usuario.turnoAbierto
            ? `Turno abierto: ${accion.usuario.turnoAbierto}.`
            : undefined
        }
        confirmLabel={accion?.tipo === "suspender" ? "Suspender" : "Reactivar"}
        onCancel={() => setAccion(null)}
        onConfirm={(motivo) => {
          const pendiente = accion
          setAccion(null)
          if (!pendiente) return
          accionUsuario.mutate(
            { id: pendiente.usuario.id, accion: pendiente.tipo, motivo },
            {
              onSuccess: () => mostrar("Cambio de estado aplicado y auditado", "exito"),
              onError: (error) => mostrar(mensajeError(error), "error"),
            },
          )
        }}
      />
    </div>
  )
}
