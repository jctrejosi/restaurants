import { useMemo, useState } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import {
  Ban,
  Cpu,
  Link2,
  Monitor,
  Plus,
  Printer,
  RefreshCw,
  Smartphone,
  WifiOff,
} from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { FilterBar, type ActiveFilter } from "@/components/data/FilterBar"
import { PageHeader } from "@/components/data/PageHeader"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { IconButton } from "@/components/ui/IconButton"
import { EmptyState, ErrorState, NoPermissionState } from "@/components/ui/states"
import { SelectField, TextField, type SelectOption } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { ApiError } from "@/lib/api"
import { formatDateTime, formatRelative } from "@/lib/format"
import { useSocketEvent } from "@/lib/realtime"
import {
  dispositivoDesactualizado,
  useDispositivos,
  useGuardarVersionesMinimas,
  useRevincularDispositivo,
  useRevocarDispositivo,
  useVersionesMinimas,
  useVincularDispositivo,
} from "@/modules/dispositivos/api"
import { DeviceDetailDrawer } from "@/modules/dispositivos/components/DeviceDetailDrawer"
import { DeviceStatusBadge } from "@/modules/dispositivos/components/DeviceStatusBadge"
import { DeviceTokenDialog, LinkDeviceWizard } from "@/modules/dispositivos/components/LinkDeviceWizard"
import { VersionPolicyPanel } from "@/modules/dispositivos/components/VersionPolicyPanel"
import {
  TIPO_DISPOSITIVO_LABEL,
  TIPOS_DISPOSITIVO,
  type Dispositivo,
  type DispositivoEstado,
  type DispositivoTipo,
  type DispositivosFiltros,
  type VersionMinima,
  type VincularDispositivoResp,
} from "@/modules/dispositivos/types"
import "@/modules/dispositivos/dispositivos.css"

const PAGE_SIZE = 10

const ICONO_TIPO = {
  apk: Smartphone,
  kds: Monitor,
  caja: Cpu,
  print_agent: Printer,
} as const

function leerFiltros(searchParams: URLSearchParams, sedeActiva: string | null): DispositivosFiltros {
  const page = Number(searchParams.get("page") ?? "1")
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: PAGE_SIZE,
    busqueda: searchParams.get("q") ?? undefined,
    tipo: (searchParams.get("tipo") as DispositivoTipo | null) ?? undefined,
    estado: (searchParams.get("estado") as DispositivoEstado | null) ?? undefined,
    desactualizados: searchParams.get("desactualizados") === "true" ? true : undefined,
    sedeId: searchParams.get("sede") ?? sedeActiva ?? undefined,
  }
}

function mensajeError(error: unknown): string {
  return error instanceof ApiError ? error.message : "Ocurrió un error inesperado"
}

export default function DispositivosPage() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { mostrar } = useToast()
  const { tienePermiso } = useAuth()
  const { sedeId, sedes, zonaHoraria } = useSede()

  const esVistaVersiones =
    searchParams.get("vista") === "versiones" || location.pathname.endsWith("/versiones")

  const filtros = useMemo(() => leerFiltros(searchParams, sedeId), [searchParams, sedeId])
  const dispositivos = useDispositivos(filtros)
  const versiones = useVersionesMinimas()

  const vincular = useVincularDispositivo()
  const revincular = useRevincularDispositivo()
  const revocar = useRevocarDispositivo()
  const guardarVersiones = useGuardarVersionesMinimas()

  const [wizardAbierto, setWizardAbierto] = useState(false)
  const [resultadoVinculacion, setResultadoVinculacion] = useState<VincularDispositivoResp | null>(null)
  const [tokenRevinculado, setTokenRevinculado] = useState<VincularDispositivoResp | null>(null)
  const [errorWizard, setErrorWizard] = useState<string | null>(null)
  const [revocarA, setRevocarA] = useState<Dispositivo | null>(null)
  const [revincularA, setRevincularA] = useState<Dispositivo | null>(null)

  useSocketEvent(
    [
      "dispositivo.vinculado",
      "dispositivo.revocado",
      "dispositivo.conexion",
      "dispositivo.version",
      "sync.pendiente",
      "sync.actualizada",
      "alerta.creada",
    ],
    () => {
      void queryClient.invalidateQueries({ queryKey: ["dispositivos"] })
    },
  )

  const puedeVer = tienePermiso("dispositivos.ver")
  const puedeVincular = tienePermiso("dispositivos.vincular")
  const puedeRevocar = tienePermiso("dispositivos.revocar")
  const puedeEditar = tienePermiso("dispositivos.editar")
  const puedeVersion = tienePermiso("dispositivos.version")

  const actualizar = (cambios: Record<string, string | undefined>, reiniciarPagina = true) => {
    const siguiente = new URLSearchParams(searchParams)
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === undefined || valor === "") siguiente.delete(clave)
      else siguiente.set(clave, valor)
    }
    if (reiniciarPagina) siguiente.delete("page")
    setSearchParams(siguiente, { replace: true })
  }

  const columnas: Column<Dispositivo>[] = [
    {
      key: "dispositivo",
      header: "Dispositivo",
      cell: (row) => {
        const Icono = ICONO_TIPO[row.tipo]
        return (
          <span className="dispositivo-celda">
            <span className={`dispositivo-celda__icono dispositivo-celda__icono--${row.tipo}`}>
              <Icono size={15} />
            </span>
            <span>
              <strong>{TIPO_DISPOSITIVO_LABEL[row.tipo]}</strong>
              <small>{row.id}</small>
            </span>
          </span>
        )
      },
    },
    { key: "sede", header: "Sede", cell: (row) => row.sucursalNombre },
    {
      key: "asignacion",
      header: "Usuario / estación",
      cell: (row) =>
        row.usuarioNombre ?? row.estacionNombre ?? <span className="texto-tenue">Sin asignar</span>,
    },
    {
      key: "version",
      header: "Versión",
      cell: (row) => {
        const desactualizado = dispositivoDesactualizado(row)
        return (
          <>
            <span className="version-celda">{row.versionApp}</span>
            {desactualizado ? <small className="version-celda__alerta">Por debajo del mínimo</small> : null}
          </>
        )
      },
    },
    {
      key: "conexion",
      header: "Última conexión",
      cell: (row) =>
        row.ultimaConexionEn ? (
          <>
            <strong className="texto-fuerte">{formatRelative(row.ultimaConexionEn)}</strong>
            <small className="texto-tenue">{formatDateTime(row.ultimaConexionEn, zonaHoraria)}</small>
          </>
        ) : (
          <span className="texto-tenue">
            <WifiOff size={12} /> Nunca
          </span>
        ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (row) => <DeviceStatusBadge dispositivo={row} desactualizado={dispositivoDesactualizado(row)} />,
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      cell: (row) => (
        <span className="fila-acciones" onClick={(event) => event.stopPropagation()}>
          {row.estado === "vinculado" ? (
            <IconButton
              label="Revocar dispositivo"
              disabled={!puedeRevocar}
              title={puedeRevocar ? "Revocar" : "Requiere permiso de dispositivos.revocar"}
              onClick={() => setRevocarA(row)}
            >
              <Ban size={15} />
            </IconButton>
          ) : (
            <IconButton
              label="Revincular dispositivo"
              disabled={!puedeVincular}
              title={puedeVincular ? "Revincular" : "Requiere permiso de dispositivos.vincular"}
              onClick={() => setRevincularA(row)}
            >
              <Link2 size={15} />
            </IconButton>
          )}
        </span>
      ),
    },
  ]

  const filtrosActivos: ActiveFilter[] = []
  if (filtros.busqueda) filtrosActivos.push({ key: "q", label: `Búsqueda: «${filtros.busqueda}»` })
  if (filtros.tipo) {
    filtrosActivos.push({ key: "tipo", label: `Tipo: ${TIPO_DISPOSITIVO_LABEL[filtros.tipo]}` })
  }
  if (filtros.estado) filtrosActivos.push({ key: "estado", label: `Estado: ${filtros.estado}` })
  if (filtros.desactualizados) filtrosActivos.push({ key: "desactualizados", label: "Desactualizados" })
  if (searchParams.get("sede")) {
    filtrosActivos.push({
      key: "sede",
      label: `Sede: ${sedes.find((sede) => sede.id === searchParams.get("sede"))?.nombre ?? ""}`,
    })
  }

  const limpiarFiltros = () => {
    const siguiente = new URLSearchParams(searchParams)
    for (const clave of ["q", "tipo", "estado", "desactualizados", "page", "sede"]) siguiente.delete(clave)
    setSearchParams(siguiente, { replace: true })
  }

  const opcionesTipo: SelectOption[] = TIPOS_DISPOSITIVO.map((tipo) => ({
    value: tipo,
    label: TIPO_DISPOSITIVO_LABEL[tipo],
  }))
  const opcionesEstado: SelectOption[] = [
    { value: "vinculado", label: "Vinculado" },
    { value: "revocado", label: "Revocado" },
  ]

  const dispositivoDrawerId = searchParams.get("dispositivo")
  const total = dispositivos.data?.total ?? 0
  const pagina = dispositivos.data?.page ?? filtros.page
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const resumen = dispositivos.data?.resumen
  const vacio = !dispositivos.isLoading && !dispositivos.isError && (dispositivos.data?.data.length ?? 0) === 0

  if (!puedeVer) {
    return (
      <div className="module-page">
        <PageHeader eyebrow="Configuración / Dispositivos" title="Dispositivos" />
        <NoPermissionState permiso="dispositivos.ver" />
      </div>
    )
  }

  return (
    <div className="module-page">
      <PageHeader
        eyebrow="Configuración / Dispositivos"
        title="Dispositivos"
        subtitle="Inventario, vinculación y revocación, versión mínima por tipo y diagnóstico (V1)."
        actions={
          <>
            <Button variant="secondary" onClick={() => void dispositivos.refetch()}>
              <RefreshCw size={15} /> Actualizar
            </Button>
            <Button
              variant="primary"
              disabled={!puedeVincular}
              title={puedeVincular ? undefined : "Requiere permiso de dispositivos.vincular"}
              onClick={() => {
                setErrorWizard(null)
                setResultadoVinculacion(null)
                setWizardAbierto(true)
              }}
            >
              <Plus size={16} /> Vincular dispositivo
            </Button>
          </>
        }
      />

      <div className="vista-switch">
        <Button
          variant="ghost"
          className={`filter-tab ${!esVistaVersiones ? "filter-tab--active" : ""}`}
          onClick={() => actualizar({ vista: undefined }, false)}
        >
          Inventario
        </Button>
        <Button
          variant="ghost"
          className={`filter-tab ${esVistaVersiones ? "filter-tab--active" : ""}`}
          onClick={() => actualizar({ vista: "versiones" }, false)}
        >
          Versiones mínimas (V1)
        </Button>
      </div>

      {esVistaVersiones ? (
        <VersionPolicyPanel
          data={versiones.data}
          cargando={versiones.isLoading}
          error={versiones.isError ? (versiones.error as Error) : null}
          onRetry={() => void versiones.refetch()}
          puedeEditar={puedeVersion}
          guardando={guardarVersiones.isPending}
          onGuardar={(versionesDraft: VersionMinima[], motivo) => {
            guardarVersiones.mutate(
              { versiones: versionesDraft, motivo },
              {
                onSuccess: () => mostrar("Política de versiones actualizada y auditada", "exito"),
                onError: (error) => mostrar(mensajeError(error), "error"),
              },
            )
          }}
        />
      ) : (
        <>
          {resumen ? (
            <div className="dispositivos-resumen">
              <div className="dispositivos-resumen__card">
                <span>Vinculados</span>
                <strong>{resumen.vinculados}</strong>
              </div>
              <div className="dispositivos-resumen__card">
                <span>Revocados</span>
                <strong>{resumen.revocados}</strong>
              </div>
              <div className="dispositivos-resumen__card dispositivos-resumen__card--alerta">
                <span>Desactualizados</span>
                <strong>{resumen.desactualizados}</strong>
              </div>
              <div className="dispositivos-resumen__card">
                <span>Sin conexión</span>
                <strong>{resumen.sinConexion}</strong>
              </div>
            </div>
          ) : null}

          <FilterBar activeFilters={filtrosActivos} onClear={filtrosActivos.length > 0 ? limpiarFiltros : undefined}>
            <SelectField
              label="Sede"
              options={sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))}
              placeholder="Sede activa"
              value={searchParams.get("sede") ?? ""}
              onChange={(event) => actualizar({ sede: event.target.value || undefined })}
            />
            <SelectField
              label="Tipo"
              options={opcionesTipo}
              placeholder="Todos"
              value={searchParams.get("tipo") ?? ""}
              onChange={(event) => actualizar({ tipo: event.target.value || undefined })}
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
              placeholder="Usuario, estación o id"
              value={searchParams.get("q") ?? ""}
              onChange={(event) => actualizar({ q: event.target.value || undefined })}
            />
            <div className="filter-tabs filter-tabs--inline">
              <Button
                variant="ghost"
                className={`filter-tab ${filtros.desactualizados ? "filter-tab--active" : ""}`}
                onClick={() => actualizar({ desactualizados: filtros.desactualizados ? undefined : "true" })}
              >
                Desactualizados
              </Button>
            </div>
          </FilterBar>

          {dispositivos.isError ? (
            <ErrorState
              description="No pudimos cargar el inventario de dispositivos."
              onRetry={() => void dispositivos.refetch()}
            />
          ) : vacio ? (
            <EmptyState
              title="Aún no hay dispositivos vinculados en esta sede"
              description="Vincula un APK, un KDS, una caja o un print agent para verlo en el inventario."
              action={puedeVincular ? { label: "Vincular dispositivo", onClick: () => setWizardAbierto(true) } : undefined}
            />
          ) : (
            <section className="panel">
              <DataTable
                columns={columnas}
                rows={dispositivos.data?.data ?? []}
                getRowKey={(row) => row.id}
                onRowClick={(row) => actualizar({ dispositivo: row.id }, false)}
                loading={dispositivos.isLoading}
                emptyTitle="Sin dispositivos para estos filtros"
                emptyDescription="Ajusta el tipo, el estado o la sede, o limpia los filtros."
                footer={
                  <div className="dispositivos-paginacion">
                    <span>
                      {dispositivos.isFetching ? "Actualizando…" : "En vivo"} · {total} dispositivos
                    </span>
                    <span className="dispositivos-paginacion__controls">
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

      <DeviceDetailDrawer
        dispositivoId={dispositivoDrawerId}
        puedeEditar={puedeEditar}
        puedeRevocar={puedeRevocar}
        puedeVincular={puedeVincular}
        onClose={() => actualizar({ dispositivo: undefined }, false)}
        onRevocar={(dispositivo) => setRevocarA(dispositivo)}
        onRevincular={(dispositivo) => setRevincularA(dispositivo)}
      />

      <LinkDeviceWizard
        open={wizardAbierto}
        guardando={vincular.isPending}
        errorServidor={errorWizard}
        resultado={resultadoVinculacion}
        onClose={() => {
          setWizardAbierto(false)
          setResultadoVinculacion(null)
        }}
        onConfirm={(payload) => {
          setErrorWizard(null)
          vincular.mutate(payload, {
            onSuccess: (respuesta) => {
              setResultadoVinculacion(respuesta)
              mostrar("Dispositivo vinculado; entrega el token una sola vez", "exito")
            },
            onError: (error) => setErrorWizard(mensajeError(error)),
          })
        }}
      />

      <DeviceTokenDialog resultado={tokenRevinculado} onClose={() => setTokenRevinculado(null)} />

      <ConfirmDialog
        open={revocarA !== null}
        title={`Revocar ${revocarA?.id ?? "dispositivo"}`}
        description="El equipo deja de operar: su token deja de autenticar (401/410)."
        impacto="Las operaciones pendientes permanecen visibles en el diagnóstico; el equipo puede revincularse con un token nuevo."
        confirmLabel="Revocar dispositivo"
        onCancel={() => setRevocarA(null)}
        onConfirm={(motivo) => {
          const dispositivo = revocarA
          setRevocarA(null)
          if (!dispositivo) return
          revocar.mutate(
            { id: dispositivo.id, motivo },
            {
              onSuccess: () => mostrar("Dispositivo revocado; dejó de operar y quedó auditado", "exito"),
              onError: (error) => mostrar(mensajeError(error), "error"),
            },
          )
        }}
      />

      <ConfirmDialog
        open={revincularA !== null}
        title={`Revincular ${revincularA?.id ?? "dispositivo"}`}
        description="Se rota el token anterior y el equipo vuelve a estado vinculado."
        impacto="El token viejo se invalida; entrega el nuevo token al equipo."
        motivoLabel="Motivo de la revinculación"
        confirmLabel="Revincular y rotar token"
        onCancel={() => setRevincularA(null)}
        onConfirm={(motivo) => {
          const dispositivo = revincularA
          setRevincularA(null)
          if (!dispositivo) return
          revincular.mutate(
            { id: dispositivo.id, motivo },
            {
              onSuccess: (respuesta) => {
                setTokenRevinculado(respuesta)
                mostrar("Dispositivo revinculado; token anterior invalidado", "exito")
              },
              onError: (error) => mostrar(mensajeError(error), "error"),
            },
          )
        }}
      />
    </div>
  )
}
