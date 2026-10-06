import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  Ban,
  History,
  KeyRound,
  Laptop,
  Lock,
  Plus,
  Power,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react"
import { Tabs, type TabItem } from "@/components/data/Tabs"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Drawer } from "@/components/ui/Drawer"
import { IconButton } from "@/components/ui/IconButton"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { ErrorState } from "@/components/ui/states"
import { SelectField, TextField, type SelectOption } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { formatDateTime, formatRelative } from "@/lib/format"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import {
  use2FAUsuario,
  useAccionUsuario,
  useConcederPermisoTemporal,
  useCrearUsuario,
  useEditarUsuario,
  useGuardarRolesUsuario,
  usePermisosCatalogo,
  usePermisosTemporales,
  useRevocarPermisoTemporal,
  useRevocarSesiones,
  useSesionesUsuario,
  useUsuarioDetalle,
} from "@/modules/usuarios/api"
import { UsuarioCard } from "@/modules/usuarios/components/UsuarioCard"
import {
  DOS_FA_LABEL,
  ESTADO_USUARIO_LABEL,
  ESTADO_USUARIO_TONE,
  TURNOS_PERMISO_TEMPORAL,
  type PermisoTemporal,
  type Rol,
  type UsuarioRolAsignado,
} from "@/modules/usuarios/types"

type TabUsuario = "perfil" | "roles" | "seguridad" | "actividad"

function mensajeError(error: unknown): string {
  return error instanceof ApiError ? error.message : "Ocurrió un error inesperado"
}

const ESTADO_TEMPORAL_TONE = {
  vigente: "green",
  expirado: "gray",
  revocado: "amber",
} as const

/**
 * Editor de usuario (plan 17 §3): perfil, roles y alcance, seguridad (2FA,
 * sesiones, permisos por turno V2) y actividad auditada.
 */
export function UsuarioEditorDrawer({
  usuarioId,
  abierto,
  onClose,
  roles,
  onVerAuditoria,
}: {
  usuarioId: string | null
  abierto: boolean
  onClose: () => void
  roles: Rol[]
  onVerAuditoria: (auditoriaId: string, etiqueta: string) => void
}) {
  const { mostrar } = useToast()
  const { tienePermiso, usuario: actor } = useAuth()
  const { sedes } = useSede()
  const esAlta = usuarioId === null

  const detalle = useUsuarioDetalle(abierto && !esAlta ? usuarioId : null)
  const sesiones = useSesionesUsuario(abierto && !esAlta ? usuarioId : null)
  const temporales = usePermisosTemporales(abierto && !esAlta ? usuarioId : null)
  const catalogo = usePermisosCatalogo()

  const crear = useCrearUsuario()
  const editar = useEditarUsuario()
  const accion = useAccionUsuario()
  const guardarRoles = useGuardarRolesUsuario()
  const dosFa = use2FAUsuario()
  const revocarSesiones = useRevocarSesiones()
  const concederTemporal = useConcederPermisoTemporal()
  const revocarTemporal = useRevocarPermisoTemporal()

  const usuario = detalle.data?.usuario ?? null
  const actividad = detalle.data?.actividad ?? []

  const [tab, setTab] = useState<TabUsuario>("perfil")
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [telefono, setTelefono] = useState("")
  const [pin, setPin] = useState("")
  const [rolesDraft, setRolesDraft] = useState<UsuarioRolAsignado[]>([])

  const [confirmarRoles, setConfirmarRoles] = useState(false)
  const [accionPendiente, setAccionPendiente] = useState<"suspender" | "reactivar" | "baja" | null>(null)
  const [confirmar2fa, setConfirmar2fa] = useState<"reset" | "enrolar" | null>(null)
  const [confirmarSesiones, setConfirmarSesiones] = useState(false)
  const [revocarPermiso, setRevocarPermiso] = useState<PermisoTemporal | null>(null)

  const [permisoNuevo, setPermisoNuevo] = useState("")
  const [turnoNuevo, setTurnoNuevo] = useState(TURNOS_PERMISO_TEMPORAL[0].id)
  const [horasNuevo, setHorasNuevo] = useState("4")
  const [motivoNuevo, setMotivoNuevo] = useState("")

  useEffect(() => {
    if (!abierto) return
    setTab("perfil")
    setPin("")
    setPermisoNuevo("")
    setMotivoNuevo("")
  }, [abierto, usuarioId])

  useEffect(() => {
    if (esAlta) {
      setNombre("")
      setEmail("")
      setTelefono("")
      setRolesDraft([])
      return
    }
    if (!usuario) return
    setNombre(usuario.nombre)
    setEmail(usuario.email)
    setTelefono(usuario.telefono ?? "")
    setRolesDraft(usuario.roles)
  }, [esAlta, usuario?.id, usuario?.version, usuario?.nombre, usuario?.email, usuario?.telefono, usuario?.roles, usuario])

  const puedeCrear = tienePermiso("usuarios.crear")
  const puedeEditar = tienePermiso("usuarios.editar")
  const puedeRoles = tienePermiso("usuarios.roles")
  const puede2fa = tienePermiso("usuarios.2fa")
  const puedeSesiones = tienePermiso("usuarios.sesiones")
  const puedeTemporales = tienePermiso("usuarios.permisos_temporales")
  const esGlobalAdmin = actor.sucursalIds.length === 0

  const opcionesRol: SelectOption[] = roles.map((rol) => ({ value: rol.id, label: rol.nombre }))
  const opcionesSede: SelectOption[] = [
    ...(esGlobalAdmin ? [{ value: "", label: "Todas las sedes (global)" }] : []),
    ...sedes.map((sede) => ({ value: sede.id, label: sede.nombre })),
  ]
  const nombreSede = (sucursalId: string | null) =>
    sucursalId === null ? "Todas las sedes" : sedes.find((sede) => sede.id === sucursalId)?.nombre ?? sucursalId

  const opcionesPermiso: SelectOption[] = (catalogo.data ?? [])
    .filter((permiso) => !permiso.sensible)
    .map((permiso) => ({ value: permiso.codigo, label: `${permiso.descripcion} (${permiso.codigo})` }))

  const cambiosRoles = useMemo(() => {
    if (!usuario) return false
    return JSON.stringify(usuario.roles) !== JSON.stringify(rolesDraft)
  }, [usuario, rolesDraft])

  const resumenCambioRoles = useMemo(() => {
    if (!usuario) return ""
    const antes = new Set(usuario.roles.map((item) => `${item.rolId}@${item.sucursalId ?? "todas"}`))
    const despues = new Set(rolesDraft.map((item) => `${item.rolId}@${item.sucursalId ?? "todas"}`))
    const nombreRol = (rolId: string) => roles.find((rol) => rol.id === rolId)?.nombre ?? rolId
    const agregados = [...despues].filter((clave) => !antes.has(clave)).map((clave) => nombreRol(clave.split("@")[0]))
    const retirados = [...antes].filter((clave) => !despues.has(clave)).map((clave) => nombreRol(clave.split("@")[0]))
    const partes: string[] = []
    if (agregados.length) partes.push(`Se asignan: ${agregados.join(", ")}.`)
    if (retirados.length) partes.push(`Se retiran: ${retirados.join(", ")}.`)
    return partes.join(" ") || "Sin cambios de alcance."
  }, [usuario, rolesDraft, roles])

  const requiere2fa = (usuario?.roles ?? []).some((asignacion) => asignacion.rolId === "rol-admin-global")

  const tabs: TabItem[] = esAlta
    ? [
        { id: "perfil", label: "Perfil" },
        { id: "roles", label: "Roles y alcance" },
      ]
    : [
        { id: "perfil", label: "Perfil" },
        { id: "roles", label: "Roles y alcance" },
        { id: "seguridad", label: "Seguridad" },
        { id: "actividad", label: "Actividad", badge: actividad.length ? String(actividad.length) : undefined },
      ]

  const guardarPerfil = () => {
    if (nombre.trim().length < 3) {
      mostrar("El nombre debe tener al menos 3 caracteres", "error")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      mostrar("El correo no es válido", "error")
      return
    }
    if (esAlta) {
      if (!/^\d{6,8}$/.test(pin)) {
        mostrar("El PIN debe tener de 6 a 8 dígitos numéricos", "error")
        return
      }
      if (rolesDraft.length === 0) {
        mostrar("Asigna al menos un rol con su sede en la pestaña «Roles y alcance»", "error")
        setTab("roles")
        return
      }
      crear.mutate(
        {
          nombre: nombre.trim(),
          email: email.trim(),
          telefono: telefono.trim() || undefined,
          pin,
          roles: rolesDraft,
        },
        {
          onSuccess: (nuevo) => {
            mostrar(`Usuario ${nuevo.nombre} creado y auditado`, "exito")
            onClose()
          },
          onError: (error) => mostrar(mensajeError(error), "error"),
        },
      )
      return
    }
    if (!usuario) return
    editar.mutate(
      {
        id: usuario.id,
        nombre: nombre.trim(),
        email: email.trim(),
        telefono: telefono.trim() || undefined,
        version: usuario.version,
      },
      {
        onSuccess: () => mostrar("Perfil actualizado y auditado", "exito"),
        onError: (error) => mostrar(mensajeError(error), "error"),
      },
    )
  }

  const aplicarAccion = (tipo: "suspender" | "reactivar" | "baja", motivo: string) => {
    if (!usuario) return
    accion.mutate(
      { id: usuario.id, accion: tipo, motivo },
      {
        onSuccess: () =>
          mostrar(
            tipo === "reactivar"
              ? "Usuario reactivado; ya puede iniciar sesión"
              : tipo === "suspender"
                ? "Usuario suspendido; sus sesiones quedan invalidadas"
                : "Usuario dado de baja; no podrá iniciar sesión",
            "exito",
          ),
        onError: (error) => mostrar(mensajeError(error), "error"),
      },
    )
  }

  const conceder = () => {
    if (!usuario) return
    if (!permisoNuevo) {
      mostrar("Selecciona el permiso a conceder", "error")
      return
    }
    if (motivoNuevo.trim().length < 3) {
      mostrar("El motivo es obligatorio (mínimo 3 caracteres)", "error")
      return
    }
    const horas = Number(horasNuevo) || 4
    const turno = TURNOS_PERMISO_TEMPORAL.find((item) => item.id === turnoNuevo)
    concederTemporal.mutate(
      {
        usuarioId: usuario.id,
        permiso: permisoNuevo,
        turno: turno?.nombre ?? turnoNuevo,
        expiraEn: new Date(Date.now() + horas * 3_600_000).toISOString(),
        motivo: motivoNuevo.trim(),
      },
      {
        onSuccess: () => {
          mostrar("Permiso temporal concedido, con caducidad auditada", "exito")
          setPermisoNuevo("")
          setMotivoNuevo("")
        },
        onError: (error) => mostrar(mensajeError(error), "error"),
      },
    )
  }

  const etiqueta = usuario?.nombre ?? "Nuevo usuario"

  return (
    <Drawer
      open={abierto}
      onClose={onClose}
      title={etiqueta}
      subtitle={
        esAlta ? (
          "Alta de usuario con roles y alcance"
        ) : usuario ? (
          <StatusBadge tone={ESTADO_USUARIO_TONE[usuario.estado]}>
            {ESTADO_USUARIO_LABEL[usuario.estado]}
          </StatusBadge>
        ) : undefined
      }
      width={640}
      footer={
        esAlta ? (
          <Button
            variant="primary"
            disabled={!puedeCrear || crear.isPending}
            title={puedeCrear ? undefined : "Requiere permiso de usuarios.crear"}
            onClick={guardarPerfil}
          >
            <UserPlus size={15} /> {crear.isPending ? "Creando…" : "Crear usuario"}
          </Button>
        ) : usuario ? (
          <>
            {usuario.estado === "activo" ? (
              <>
                <Button
                  variant="secondary"
                  disabled={!tienePermiso("usuarios.suspender")}
                  title={tienePermiso("usuarios.suspender") ? undefined : "Requiere permiso de usuarios.suspender"}
                  onClick={() => setAccionPendiente("suspender")}
                >
                  <Ban size={15} /> Suspender
                </Button>
                <Button
                  variant="secondary"
                  disabled={!tienePermiso("usuarios.baja")}
                  title={tienePermiso("usuarios.baja") ? undefined : "Requiere permiso de usuarios.baja"}
                  onClick={() => setAccionPendiente("baja")}
                >
                  <Ban size={15} /> Dar de baja
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                disabled={!tienePermiso("usuarios.suspender") || accion.isPending}
                title={tienePermiso("usuarios.suspender") ? undefined : "Requiere permiso de usuarios.suspender"}
                onClick={() => setAccionPendiente("reactivar")}
              >
                <Power size={15} /> Reactivar
              </Button>
            )}
          </>
        ) : null
      }
    >
      {!esAlta && detalle.isLoading ? <SkeletonRows rows={6} columns={3} /> : null}
      {!esAlta && detalle.isError ? (
        <ErrorState
          description="No pudimos cargar la ficha del usuario."
          onRetry={() => void detalle.refetch()}
        />
      ) : null}

      {esAlta || usuario ? (
        <>
          {usuario ? <UsuarioCard usuario={usuario} roles={roles} nombreSede={nombreSede} /> : null}

          <Tabs tabs={tabs} value={tab} onChange={(id) => setTab(id as TabUsuario)} />

          {tab === "perfil" ? (
            <section className="usuario-seccion">
              {usuario?.turnoAbierto ? (
                <p className="usuario-nota" role="note">
                  <History size={14} /> Turno abierto: {usuario.turnoAbierto}. Una baja exige
                  reasignar o cerrar ese trabajo pendiente.
                </p>
              ) : null}
              <div className="form-grid">
                <TextField
                  label="Nombre"
                  value={nombre}
                  disabled={!esAlta && !puedeEditar}
                  onChange={(event) => setNombre(event.target.value)}
                />
                <TextField
                  label="Correo"
                  type="email"
                  value={email}
                  disabled={!esAlta && !puedeEditar}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <TextField
                  label="Teléfono"
                  value={telefono}
                  disabled={!esAlta && !puedeEditar}
                  onChange={(event) => setTelefono(event.target.value)}
                />
                {esAlta ? (
                  <TextField
                    label="PIN de acceso"
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    hint="De 6 a 8 dígitos; se guarda con hash y nunca se muestra."
                    onChange={(event) => setPin(event.target.value)}
                  />
                ) : null}
              </div>
              {!esAlta ? (
                <div className="usuario-seccion__acciones">
                  <Button
                    variant="primary"
                    disabled={!puedeEditar || editar.isPending}
                    title={puedeEditar ? undefined : "Requiere permiso de usuarios.editar"}
                    onClick={guardarPerfil}
                  >
                    {editar.isPending ? "Guardando…" : "Guardar perfil"}
                  </Button>
                </div>
              ) : null}
            </section>
          ) : null}

          {tab === "roles" ? (
            <section className="usuario-seccion">
              <p className="usuario-seccion__intro">
                Cada asignación combina un rol con su alcance: una sede concreta o todas las sedes
                (solo administrador global).
              </p>
              <div className="roles-asignados">
                {rolesDraft.map((asignacion, indice) => (
                  <div className="roles-asignados__fila" key={`${asignacion.rolId}-${indice}`}>
                    <SelectField
                      label={indice === 0 ? "Rol" : undefined}
                      options={opcionesRol}
                      value={asignacion.rolId}
                      disabled={!puedeRoles && !esAlta}
                      onChange={(event) =>
                        setRolesDraft((actual) =>
                          actual.map((item, pos) =>
                            pos === indice ? { ...item, rolId: event.target.value } : item,
                          ),
                        )
                      }
                    />
                    <SelectField
                      label={indice === 0 ? "Alcance" : undefined}
                      options={opcionesSede}
                      value={asignacion.sucursalId ?? ""}
                      disabled={!puedeRoles && !esAlta}
                      onChange={(event) =>
                        setRolesDraft((actual) =>
                          actual.map((item, pos) =>
                            pos === indice ? { ...item, sucursalId: event.target.value || null } : item,
                          ),
                        )
                      }
                    />
                    <IconButton
                      label="Quitar asignación"
                      disabled={!puedeRoles && !esAlta}
                      onClick={() => setRolesDraft((actual) => actual.filter((_, pos) => pos !== indice))}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                ))}
                {rolesDraft.length === 0 ? (
                  <p className="usuario-seccion__vacio">Sin roles asignados. Agrega al menos uno.</p>
                ) : null}
              </div>
              <div className="usuario-seccion__acciones">
                <Button
                  variant="ghost"
                  className="text-action"
                  disabled={!puedeRoles && !esAlta}
                  onClick={() =>
                    setRolesDraft((actual) => [
                      ...actual,
                      { rolId: roles.find((rol) => rol.id === "rol-mesero")?.id ?? roles[0]?.id ?? "", sucursalId: actor.sucursalIds[0] ?? null },
                    ])
                  }
                >
                  <Plus size={14} /> Agregar rol
                </Button>
                {esAlta ? null : (
                  <Button
                    variant="primary"
                    disabled={!puedeRoles || !cambiosRoles || guardarRoles.isPending}
                    title={puedeRoles ? undefined : "Requiere permiso de usuarios.roles"}
                    onClick={() => setConfirmarRoles(true)}
                  >
                    {guardarRoles.isPending ? "Guardando…" : "Guardar roles y alcance"}
                  </Button>
                )}
              </div>
            </section>
          ) : null}

          {tab === "seguridad" ? (
            <section className="usuario-seccion">
              <div className="seguridad-card">
                <header>
                  <ShieldCheck size={18} />
                  <div>
                    <strong>Segundo factor (V1)</strong>
                    <small>
                      {requiere2fa
                        ? "Obligatorio para administradores globales"
                        : "Se exige cuando el usuario recibe alcance global"}
                    </small>
                  </div>
                  <StatusBadge tone={usuario?.dosFa === "activo" ? "green" : usuario?.dosFa === "pendiente" ? "amber" : "gray"}>
                    {usuario ? DOS_FA_LABEL[usuario.dosFa] : "—"}
                  </StatusBadge>
                </header>
                <div className="seguridad-card__acciones">
                  <Button
                    variant="secondary"
                    disabled={!puede2fa || !usuario}
                    title={puede2fa ? undefined : "Requiere permiso de usuarios.2fa"}
                    onClick={() => setConfirmar2fa("enrolar")}
                  >
                    <KeyRound size={14} /> Enrolar / confirmar
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={!puede2fa || !usuario}
                    title={puede2fa ? undefined : "Requiere permiso de usuarios.2fa"}
                    onClick={() => setConfirmar2fa("reset")}
                  >
                    Restablecer
                  </Button>
                </div>
              </div>

              <div className="seguridad-card">
                <header>
                  <Laptop size={18} />
                  <div>
                    <strong>Sesiones activas</strong>
                    <small>Revocarlas cierra el acceso de inmediato</small>
                  </div>
                </header>
                {sesiones.isLoading ? <SkeletonRows rows={2} columns={3} /> : null}
                {sesiones.isError ? (
                  <ErrorState description="No pudimos cargar las sesiones." onRetry={() => void sesiones.refetch()} />
                ) : null}
                {(sesiones.data ?? []).length === 0 && !sesiones.isLoading ? (
                  <p className="usuario-seccion__vacio">Sin sesiones activas registradas.</p>
                ) : null}
                <ul className="sesiones-lista">
                  {(sesiones.data ?? []).map((sesion) => (
                    <li key={sesion.id}>
                      <div>
                        <strong>
                          {sesion.dispositivo} {sesion.actual ? "(esta sesión)" : ""}
                        </strong>
                        <small>
                          IP {sesion.ip} · inicio {formatRelative(sesion.iniciadaEn)} · última
                          actividad {formatRelative(sesion.ultimaActividadEn)}
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="seguridad-card__acciones">
                  <Button
                    variant="secondary"
                    disabled={!puedeSesiones || (sesiones.data ?? []).length === 0}
                    title={puedeSesiones ? undefined : "Requiere permiso de usuarios.sesiones"}
                    onClick={() => setConfirmarSesiones(true)}
                  >
                    Revocar sesiones
                  </Button>
                </div>
              </div>

              <div className="seguridad-card">
                <header>
                  <Lock size={18} />
                  <div>
                    <strong>Permisos temporales por turno (V2)</strong>
                    <small>Caducan solos al expirar y quedan auditados</small>
                  </div>
                </header>
                {temporales.isLoading ? <SkeletonRows rows={2} columns={3} /> : null}
                {(temporales.data ?? []).length === 0 && !temporales.isLoading ? (
                  <p className="usuario-seccion__vacio">No hay permisos temporales para este usuario.</p>
                ) : null}
                <ul className="temporales-lista">
                  {(temporales.data ?? []).map((permiso) => (
                    <li key={permiso.id}>
                      <div>
                        <strong>{permiso.permiso}</strong>
                        <small>
                          {permiso.turno} · expira {formatDateTime(permiso.expiraEn)} · otorgó{" "}
                          {permiso.otorgadoPor}
                        </small>
                      </div>
                      <StatusBadge tone={ESTADO_TEMPORAL_TONE[permiso.estado]}>{permiso.estado}</StatusBadge>
                      {permiso.estado === "vigente" ? (
                        <Button
                          variant="ghost"
                          className="text-action"
                          disabled={!puedeTemporales}
                          onClick={() => setRevocarPermiso(permiso)}
                        >
                          Revocar
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <div className="temporal-form">
                  <SelectField
                    label="Permiso"
                    options={opcionesPermiso}
                    placeholder="Selecciona un permiso no sensible"
                    value={permisoNuevo}
                    disabled={!puedeTemporales}
                    onChange={(event) => setPermisoNuevo(event.target.value)}
                  />
                  <SelectField
                    label="Turno"
                    options={TURNOS_PERMISO_TEMPORAL.map((turno) => ({ value: turno.id, label: turno.nombre }))}
                    value={turnoNuevo}
                    disabled={!puedeTemporales}
                    onChange={(event) => setTurnoNuevo(event.target.value)}
                  />
                  <SelectField
                    label="Vigencia"
                    options={[
                      { value: "4", label: "Hasta 4 h (una comida)" },
                      { value: "8", label: "Hasta 8 h (turno completo)" },
                      { value: "12", label: "Hasta 12 h (doble turno)" },
                    ]}
                    value={horasNuevo}
                    disabled={!puedeTemporales}
                    onChange={(event) => setHorasNuevo(event.target.value)}
                  />
                  <TextField
                    label="Motivo"
                    placeholder="Explica por qué se concede"
                    value={motivoNuevo}
                    disabled={!puedeTemporales}
                    onChange={(event) => setMotivoNuevo(event.target.value)}
                  />
                  <Button
                    variant="secondary"
                    disabled={!puedeTemporales || concederTemporal.isPending}
                    title={puedeTemporales ? undefined : "Requiere permiso de usuarios.permisos_temporales"}
                    onClick={conceder}
                  >
                    {concederTemporal.isPending ? "Concediendo…" : "Conceder permiso"}
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          {tab === "actividad" ? (
            <section className="usuario-seccion">
              <p className="usuario-seccion__intro">
                <Activity size={14} /> Bitácora inmutable del usuario; se consulta completa en el
                módulo de Auditoría.
              </p>
              {actividad.length === 0 ? (
                <p className="usuario-seccion__vacio">Sin eventos registrados para este usuario.</p>
              ) : (
                <ol className="actividad-lista">
                  {actividad.map((evento) => (
                    <li key={evento.id}>
                      <div className="actividad-lista__punto" aria-hidden="true" />
                      <div>
                        <strong>{evento.accion}</strong>
                        <p>{evento.detalle}</p>
                        <small>
                          {evento.actor} · {formatDateTime(evento.creadoEn)}
                        </small>
                      </div>
                      <Button
                        variant="ghost"
                        className="text-action"
                        onClick={() => onVerAuditoria(evento.auditoriaId, evento.accion)}
                      >
                        Ver en auditoría
                      </Button>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ) : null}

          <ConfirmDialog
            open={confirmarRoles}
            title="Confirmar roles y alcance"
            description="El cambio de autorización aplica de inmediato a las sesiones abiertas."
            impacto={resumenCambioRoles}
            confirmLabel="Confirmar asignación"
            onCancel={() => setConfirmarRoles(false)}
            onConfirm={(motivo) => {
              setConfirmarRoles(false)
              if (!usuario) return
              guardarRoles.mutate(
                { id: usuario.id, roles: rolesDraft, motivo },
                {
                  onSuccess: () => mostrar("Roles actualizados; los permisos aplican de inmediato", "exito"),
                  onError: (error) => mostrar(mensajeError(error), "error"),
                },
              )
            }}
          />

          <ConfirmDialog
            open={accionPendiente !== null}
            title={
              accionPendiente === "baja"
                ? "Dar de baja al usuario"
                : accionPendiente === "suspender"
                  ? "Suspender al usuario"
                  : "Reactivar al usuario"
            }
            description={
              accionPendiente === "baja"
                ? "La baja bloquea el inicio de sesión y sus roles; el registro queda auditado con antes/después."
                : accionPendiente === "suspender"
                  ? "La suspensión aplica de inmediato a las sesiones abiertas."
                  : "El usuario recupera el acceso con los mismos roles y alcance."
            }
            impacto={
              usuario?.turnoAbierto
                ? `Turno abierto: ${usuario.turnoAbierto}. Reasigna o cierra ese trabajo pendiente.`
                : undefined
            }
            confirmLabel={
              accionPendiente === "baja"
                ? "Dar de baja"
                : accionPendiente === "suspender"
                  ? "Suspender"
                  : "Reactivar"
            }
            onCancel={() => setAccionPendiente(null)}
            onConfirm={(motivo) => {
              const tipo = accionPendiente
              setAccionPendiente(null)
              if (tipo) aplicarAccion(tipo, motivo)
            }}
          />

          <ConfirmDialog
            open={confirmar2fa !== null}
            title={confirmar2fa === "reset" ? "Restablecer el segundo factor" : "Enrolar el segundo factor"}
            description={
              confirmar2fa === "reset"
                ? "El administrador deberá enrolar un nuevo factor en su próximo acceso."
                : "Marca el segundo factor como activo para este administrador."
            }
            confirmLabel={confirmar2fa === "reset" ? "Restablecer" : "Enrolar"}
            onCancel={() => setConfirmar2fa(null)}
            onConfirm={(motivo) => {
              const tipo = confirmar2fa
              setConfirmar2fa(null)
              if (!usuario || !tipo) return
              dosFa.mutate(
                { id: usuario.id, accion: tipo, motivo },
                {
                  onSuccess: () => mostrar("Segundo factor actualizado y auditado", "exito"),
                  onError: (error) => mostrar(mensajeError(error), "error"),
                },
              )
            }}
          />

          <ConfirmDialog
            open={confirmarSesiones}
            title="Revocar sesiones activas"
            description="El usuario perderá el acceso en todos sus dispositivos."
            impacto="Los requests en vuelo recibirán 403; deberá volver a iniciar sesión."
            confirmLabel="Revocar sesiones"
            onCancel={() => setConfirmarSesiones(false)}
            onConfirm={(motivo) => {
              setConfirmarSesiones(false)
              if (!usuario) return
              revocarSesiones.mutate(
                { id: usuario.id, motivo },
                {
                  onSuccess: (respuesta) =>
                    mostrar(`${respuesta.revocadas} sesiones revocadas y auditadas`, "exito"),
                  onError: (error) => mostrar(mensajeError(error), "error"),
                },
              )
            }}
          />

          <ConfirmDialog
            open={revocarPermiso !== null}
            title="Revocar permiso temporal"
            description="El usuario perderá este permiso antes de que expire el turno."
            impacto={revocarPermiso ? `${revocarPermiso.permiso} · ${revocarPermiso.turno}` : ""}
            confirmLabel="Revocar permiso"
            onCancel={() => setRevocarPermiso(null)}
            onConfirm={(motivo) => {
              const permiso = revocarPermiso
              setRevocarPermiso(null)
              if (!usuario || !permiso) return
              revocarTemporal.mutate(
                { usuarioId: usuario.id, permisoId: permiso.id, motivo },
                {
                  onSuccess: () => mostrar("Permiso temporal revocado y auditado", "exito"),
                  onError: (error) => mostrar(mensajeError(error), "error"),
                },
              )
            }}
          />
        </>
      ) : null}
    </Drawer>
  )
}
