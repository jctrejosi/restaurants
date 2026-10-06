import { useMemo, useState } from "react"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Save,
  Settings2,
  Wifi,
} from "lucide-react"
import { useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { DataTable, type Column } from "@/components/data/DataTable"
import { FilterBar, type ActiveFilter } from "@/components/data/FilterBar"
import { PageHeader } from "@/components/data/PageHeader"
import { SavedViewChip } from "@/components/data/SavedViewChip"
import { Tabs } from "@/components/data/Tabs"
import { MoneyCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { SelectField, TextField, type SelectOption } from "@/components/ui/fields"
import { ErrorState, NoPermissionState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { formatDateTime, formatTime, maskName } from "@/lib/format"
import { useSocketEvent } from "@/lib/realtime"
import {
  useAccionReserva,
  useCalendarioReservas,
  useExportarReservas,
  useReservas,
} from "@/modules/reservas/api"
import { BloqueosPanel } from "@/modules/reservas/components/BloqueosPanel"
import { PolicyForm } from "@/modules/reservas/components/PolicyForm"
import { ArrivalsPanel } from "@/modules/reservas/components/ArrivalsPanel"
import { ReservaDetalleDrawer, type ReservaTab } from "@/modules/reservas/components/ReservaDetalleDrawer"
import { ReservaFormDrawer } from "@/modules/reservas/components/ReservaFormDrawer"
import { ReservationCalendar } from "@/modules/reservas/components/ReservationCalendar"
import { ReubicarDialog } from "@/modules/reservas/components/ReubicarDialog"
import { WaitlistPanel } from "@/modules/reservas/components/WaitlistPanel"
import { etiquetaDia, etiquetaDiaLarga, hoyISO, inicioSemana, sumarDias } from "@/modules/reservas/fechas"
import {
  CANAL_LABEL,
  ESTADO_LABEL,
  ESTADO_TONE,
  type CanalReserva,
  type ReservaEstado,
  type ReservaLista,
  type ReservasFiltros,
} from "@/modules/reservas/types"
import "@/modules/reservas/reservas.css"

const PAGE_SIZE = 10
const STORAGE_VISTAS = "pc_reservas_vistas"

type VistaGuardada = { id: string; label: string; query: string }

type VistaPreset = { id: string; label: string; params: Record<string, string> }

const VISTAS_PRESET: VistaPreset[] = [
  { id: "hoy", label: "Hoy", params: { desde: hoyISO(), hasta: hoyISO() } },
  { id: "semana", label: "Próximos 7 días", params: { desde: hoyISO(), hasta: sumarDias(hoyISO(), 7) } },
  { id: "deposito", label: "Con depósito", params: { deposito: "true" } },
  { id: "no-show", label: "No-show", params: { estado: "no_show" } },
]

const TAMANOS: SelectOption[] = [
  { value: "1-2", label: "1 a 2" },
  { value: "3-4", label: "3 a 4" },
  { value: "5-6", label: "5 a 6" },
  { value: "7+", label: "7 o más" },
]

function leerVistasGuardadas(): VistaGuardada[] {
  if (typeof localStorage === "undefined") return []
  try {
    const bruto = localStorage.getItem(STORAGE_VISTAS)
    if (!bruto) return []
    const parsed = JSON.parse(bruto) as VistaGuardada[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function leerFiltros(searchParams: URLSearchParams, sedeActiva: string | null): ReservasFiltros {
  const entero = (clave: string) => {
    const valor = Number(searchParams.get(clave) ?? "1")
    return Number.isFinite(valor) && valor > 0 ? valor : 1
  }
  const tamano = searchParams.get("tamano")
  return {
    page: entero("page"),
    pageSize: PAGE_SIZE,
    sedeId: searchParams.get("sede") ?? sedeActiva ?? undefined,
    desde: searchParams.get("desde") ?? undefined,
    hasta: searchParams.get("hasta") ?? undefined,
    estado: (searchParams.get("estado") as ReservaEstado | null) ?? undefined,
    canal: (searchParams.get("canal") as CanalReserva | null) ?? undefined,
    personasMin: tamano ? Number(tamano.split("-")[0]) : undefined,
    personasMax: tamano && tamano !== "7+" ? Number(tamano.split("-")[1]) : undefined,
    deposito: searchParams.get("deposito") === "true" ? true : undefined,
    busqueda: searchParams.get("q") ?? undefined,
  }
}

function vistaActiva(params: Record<string, string>, searchParams: URLSearchParams): boolean {
  return Object.entries(params).every(([clave, valor]) => searchParams.get(clave) === valor)
}

export default function ReservasPage() {
  const { id } = useParams()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { mostrar } = useToast()
  const { tienePermiso } = useAuth()
  const { sedeId, sedes, esGlobal, zonaHoraria } = useSede()

  const [vistas, setVistas] = useState<VistaGuardada[]>(() => leerVistasGuardadas())
  const [reubicar, setReubicar] = useState<ReservaLista | null>(null)
  const [reubicarFecha, setReubicarFecha] = useState<string | null>(null)

  const detalleId = id && id !== "calendario" ? id : null
  const enCalendario = location.pathname.endsWith("/calendario") || searchParams.get("vista") === "calendario"
  const vistaBloqueos = searchParams.get("vista") === "bloqueos"
  const tabPrincipal = vistaBloqueos ? "bloqueos" : enCalendario ? "calendario" : "lista"

  const filtros = useMemo(() => leerFiltros(searchParams, sedeId), [searchParams, sedeId])
  const lista = useReservas(filtros)

  const modoCal = searchParams.get("calModo") === "semana" ? "semana" : "dia"
  const fechaCal = searchParams.get("fecha") ?? hoyISO(zonaHoraria)
  const rangoCalendario = useMemo(() => {
    if (modoCal === "semana") {
      const inicio = inicioSemana(fechaCal)
      return { desde: inicio, hasta: sumarDias(inicio, 6) }
    }
    return { desde: fechaCal, hasta: fechaCal }
  }, [modoCal, fechaCal])

  const calendario = useCalendarioReservas({ sedeId: sedeId ?? undefined, ...rangoCalendario })

  const exportar = useExportarReservas()
  const accion = useAccionReserva()

  useSocketEvent(
    ["reserva.creada", "reserva.actualizada", "reserva.estado", "lista_espera.actualizada", "mesa.estado", "bloqueo.creado", "bloqueo.eliminado"],
    () => {
      void queryClient.invalidateQueries({ queryKey: ["reservas"] })
      void queryClient.invalidateQueries({ queryKey: ["bloqueos"] })
    },
  )

  const puedeVer = tienePermiso("reservas.ver")
  const puedeCrear = tienePermiso("reservas.crear")
  const puedeExportar = tienePermiso("reservas.exportar")
  const puedeReubicar = tienePermiso("reservas.reubicar")
  const puedePoliticas = tienePermiso("reservas.politicas")
  const puedeVerPii = tienePermiso("clientes.ver_pii")

  const actualizar = (cambios: Record<string, string | undefined>, reiniciarPagina = true) => {
    const siguiente = new URLSearchParams(searchParams)
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === undefined || valor === "") siguiente.delete(clave)
      else siguiente.set(clave, valor)
    }
    if (reiniciarPagina) siguiente.delete("page")
    setSearchParams(siguiente, { replace: true })
  }

  const limpiarFiltros = () => {
    const siguiente = new URLSearchParams()
    const sede = searchParams.get("sede")
    if (sede) siguiente.set("sede", sede)
    setSearchParams(siguiente, { replace: true })
  }

  const aplicarVista = (params: Record<string, string>) => {
    const siguiente = new URLSearchParams()
    const sede = searchParams.get("sede")
    if (sede) siguiente.set("sede", sede)
    for (const [clave, valor] of Object.entries(params)) siguiente.set(clave, valor)
    setSearchParams(siguiente, { replace: true })
  }

  const guardarVista = () => {
    const actual = new URLSearchParams(searchParams)
    actual.delete("tab")
    actual.delete("vista")
    actual.delete("panel")
    const query = actual.toString()
    if (!query) {
      mostrar("Primero aplica algún filtro para poder guardar la vista.")
      return
    }
    if (vistas.some((vista) => vista.query === query)) {
      mostrar("Esa vista ya está guardada.")
      return
    }
    const etiquetas = [
      filtros.estado ? ESTADO_LABEL[filtros.estado] : null,
      filtros.canal ? CANAL_LABEL[filtros.canal] : null,
      filtros.deposito ? "Con depósito" : null,
      filtros.desde || filtros.hasta ? `${filtros.desde ?? "…"} → ${filtros.hasta ?? "hoy"}` : null,
    ].filter(Boolean)
    const vista: VistaGuardada = {
      id: `v-${Date.now()}`,
      label: etiquetas.length > 0 ? etiquetas.join(" · ") : `Vista ${vistas.length + 1}`,
      query,
    }
    const siguientes = [...vistas, vista]
    setVistas(siguientes)
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_VISTAS, JSON.stringify(siguientes))
    mostrar(`Vista «${vista.label}» guardada.`, "exito")
  }

  const eliminarVista = (vistaId: string) => {
    const siguientes = vistas.filter((vista) => vista.id !== vistaId)
    setVistas(siguientes)
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_VISTAS, JSON.stringify(siguientes))
  }

  const cambiarTabPrincipal = (tab: string) => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.delete("vista")
    siguiente.delete("panel")
    siguiente.delete("tab")
    if (tab === "calendario") {
      navigate(`/reservas/calendario${siguiente.toString() ? `?${siguiente}` : ""}`)
      return
    }
    if (tab === "bloqueos") siguiente.set("vista", "bloqueos")
    navigate(`/reservas${siguiente.toString() ? `?${siguiente}` : ""}`)
  }

  const abrirDetalle = (reservaId: string) => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.delete("tab")
    siguiente.delete("nueva")
    siguiente.delete("nuevaFecha")
    siguiente.delete("espera")
    if (enCalendario) siguiente.set("vista", "calendario")
    navigate(`/reservas/${reservaId}${siguiente.toString() ? `?${siguiente}` : ""}`)
  }

  const cerrarDetalle = () => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.delete("tab")
    siguiente.delete("vista")
    const destino = enCalendario ? "/reservas/calendario" : "/reservas"
    navigate(`${destino}${siguiente.toString() ? `?${siguiente}` : ""}`)
  }

  const cambiarTabDetalle = (tab: ReservaTab) => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.set("tab", tab)
    setSearchParams(siguiente, { replace: true })
  }

  const abrirNueva = (extra: Record<string, string> = {}) => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.set("nueva", "1")
    for (const [clave, valor] of Object.entries(extra)) siguiente.set(clave, valor)
    if (enCalendario) siguiente.set("vista", "calendario")
    setSearchParams(siguiente, { replace: true })
  }

  const cerrarNueva = () => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.delete("nueva")
    siguiente.delete("nuevaFecha")
    siguiente.delete("espera")
    setSearchParams(siguiente, { replace: true })
  }

  const exportarPeriodo = () => {
    exportar.mutate(
      { tipo: "reservas", formato: "csv" },
      {
        onSuccess: () =>
          mostrar("Exportación registrada. El archivo se genera en segundo plano y se avisará al solicitante.", "exito"),
        onError: () => mostrar("No se pudo registrar la exportación.", "error"),
      },
    )
  }

  const columnas: Column<ReservaLista>[] = [
    {
      key: "codigo",
      header: "Reserva",
      cell: (row) => (
        <>
          <span className="order-id">{row.codigo}</span>
          <span className="order-type">{formatTime(row.fechaHora, zonaHoraria)}</span>
        </>
      ),
    },
    { key: "fecha", header: "Fecha", cell: (row) => formatDateTime(row.fechaHora, zonaHoraria) },
    { key: "sede", header: "Sede", cell: (row) => row.sedeNombre },
    {
      key: "cliente",
      header: "Cliente",
      cell: (row) => (puedeVerPii ? row.clienteNombre : maskName(row.clienteNombre)),
    },
    { key: "personas", header: "Personas", align: "right", cell: (row) => row.personas },
    {
      key: "ubicacion",
      header: "Zona · mesa",
      cell: (row) => `${row.zonaNombre ?? "—"} · ${row.mesaNumero ? `Mesa ${row.mesaNumero}` : "sin mesa"}`,
    },
    { key: "canal", header: "Canal", cell: (row) => CANAL_LABEL[row.canal] },
    {
      key: "estado",
      header: "Estado",
      cell: (row) => <StatusBadge tone={ESTADO_TONE[row.estado]}>{ESTADO_LABEL[row.estado]}</StatusBadge>,
    },
    {
      key: "deposito",
      header: "Depósito",
      align: "right",
      cell: (row) => (row.depositoRequeridoCentavos > 0 ? <MoneyCell centavos={row.depositoPagadoCentavos} /> : "—"),
    },
    { key: "duracion", header: "Duración", align: "right", cell: (row) => `${row.duracionMin} min` },
  ]

  const filtrosActivos: ActiveFilter[] = []
  if (filtros.desde || filtros.hasta) {
    filtrosActivos.push({ key: "fecha", label: `Fecha ${filtros.desde ?? "…"} → ${filtros.hasta ?? "hoy"}` })
  }
  if (filtros.estado) filtrosActivos.push({ key: "estado", label: `Estado: ${ESTADO_LABEL[filtros.estado]}` })
  if (filtros.canal) filtrosActivos.push({ key: "canal", label: `Canal: ${CANAL_LABEL[filtros.canal]}` })
  if (searchParams.get("tamano")) {
    filtrosActivos.push({ key: "tamano", label: `Personas: ${searchParams.get("tamano")}` })
  }
  if (filtros.deposito) filtrosActivos.push({ key: "deposito", label: "Con depósito" })
  if (filtros.busqueda) filtrosActivos.push({ key: "busqueda", label: `Búsqueda: «${filtros.busqueda}»` })

  const opcionesSede: SelectOption[] = [{ value: "", label: "Todas las sedes" }, ...sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))]
  const opcionesEstado: SelectOption[] = Object.entries(ESTADO_LABEL).map(([value, label]) => ({ value, label }))
  const opcionesCanal: SelectOption[] = Object.entries(CANAL_LABEL).map(([value, label]) => ({ value, label }))

  if (!puedeVer) {
    return (
      <div className="module-page">
        <PageHeader
          eyebrow="Operación / Reservas"
          title="Reservas"
          subtitle="Calendario, lista y detalle de reservas con lista de espera, políticas y bloqueos."
        />
        <NoPermissionState permiso="reservas.ver" />
      </div>
    )
  }

  const total = lista.data?.total ?? 0
  const pagina = lista.data?.page ?? filtros.page
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const esperaSeleccionada = searchParams.get("espera")
    ? (calendario.data?.listaEspera.find((item) => item.id === searchParams.get("espera")) ?? null)
    : null

  return (
    <div className="module-page">
      <PageHeader
        eyebrow="Operación / Reservas"
        title="Reservas"
        subtitle="Del «solicitada» al «finalizada»: calendario, asignación sin sobre-asignar, bitácora y bloqueos."
        actions={
          <>
            <Button
              variant="secondary"
              disabled={!puedePoliticas}
              title={!puedePoliticas ? "Requiere permiso de reservas.politicas" : undefined}
              onClick={() => actualizar({ panel: "politicas" })}
            >
              <Settings2 size={15} /> Políticas
            </Button>
            {puedeExportar ? (
              <Button variant="secondary" disabled={exportar.isPending} onClick={exportarPeriodo}>
                <Download size={15} /> {exportar.isPending ? "Exportando…" : "Exportar"}
              </Button>
            ) : (
              <Button variant="secondary" disabled title="Requiere permiso de reservas.exportar">
                <Download size={15} /> Exportar
              </Button>
            )}
            <Button
              variant="primary"
              disabled={!puedeCrear}
              title={!puedeCrear ? "Requiere permiso de reservas.crear" : undefined}
              onClick={() => abrirNueva()}
            >
              <Plus size={17} /> Nueva reserva
            </Button>
          </>
        }
      />

      <Tabs
        tabs={[
          { id: "lista", label: "Lista" },
          { id: "calendario", label: "Calendario" },
          { id: "bloqueos", label: "Bloqueos y festivos" },
        ]}
        value={tabPrincipal}
        onChange={cambiarTabPrincipal}
      />

      {tabPrincipal === "lista" ? (
        <>
          <FilterBar
            activeFilters={filtrosActivos}
            onClear={filtrosActivos.length > 0 ? limpiarFiltros : undefined}
            actions={
              <Button variant="ghost" className="text-action" onClick={guardarVista}>
                <Save size={14} /> Guardar vista
              </Button>
            }
          >
            {esGlobal ? (
              <SelectField
                label="Sede"
                options={opcionesSede}
                value={searchParams.get("sede") ?? ""}
                onChange={(event) => actualizar({ sede: event.target.value || undefined })}
              />
            ) : null}
            <TextField
              label="Buscar"
              placeholder="Código, cliente o mesa"
              value={searchParams.get("q") ?? ""}
              onChange={(event) => actualizar({ q: event.target.value || undefined })}
            />
            <TextField
              label="Desde"
              type="date"
              value={searchParams.get("desde") ?? ""}
              onChange={(event) => actualizar({ desde: event.target.value || undefined })}
            />
            <TextField
              label="Hasta"
              type="date"
              value={searchParams.get("hasta") ?? ""}
              onChange={(event) => actualizar({ hasta: event.target.value || undefined })}
            />
            <SelectField
              label="Estado"
              options={opcionesEstado}
              placeholder="Todos"
              value={searchParams.get("estado") ?? ""}
              onChange={(event) => actualizar({ estado: event.target.value || undefined })}
            />
            <SelectField
              label="Canal"
              options={opcionesCanal}
              placeholder="Todos"
              value={searchParams.get("canal") ?? ""}
              onChange={(event) => actualizar({ canal: event.target.value || undefined })}
            />
            <SelectField
              label="Personas"
              options={TAMANOS}
              placeholder="Cualquiera"
              value={searchParams.get("tamano") ?? ""}
              onChange={(event) => actualizar({ tamano: event.target.value || undefined })}
            />
            <div className="filter-tabs filter-tabs--inline">
              <Button
                variant="ghost"
                className={`filter-tab ${filtros.deposito ? "filter-tab--active" : ""}`}
                onClick={() => actualizar({ deposito: filtros.deposito ? undefined : "true" })}
              >
                Con depósito
              </Button>
            </div>
          </FilterBar>

          <div className="reservas-vistas">
            <span className="reservas-vistas__label">Vistas</span>
            {VISTAS_PRESET.map((vista) => (
              <SavedViewChip
                key={vista.id}
                label={vista.label}
                active={vistaActiva(vista.params, searchParams)}
                onClick={() => aplicarVista(vista.params)}
              />
            ))}
            {vistas.map((vista) => (
              <SavedViewChip
                key={vista.id}
                label={vista.label}
                active={vistaActiva(Object.fromEntries(new URLSearchParams(vista.query)), searchParams)}
                onClick={() => {
                  const sede = searchParams.get("sede")
                  const siguiente = new URLSearchParams(vista.query)
                  if (sede) siguiente.set("sede", sede)
                  setSearchParams(siguiente, { replace: true })
                }}
                onRemove={() => eliminarVista(vista.id)}
              />
            ))}
          </div>

          <section className="panel">
            <DataTable
              columns={columnas}
              rows={lista.data?.data ?? []}
              getRowKey={(row) => row.id}
              onRowClick={(row) => abrirDetalle(row.id)}
              loading={lista.isLoading}
              error={lista.isError ? (lista.error as Error) : null}
              onRetry={() => void lista.refetch()}
              emptyTitle="Aún no hay reservas en este período"
              emptyDescription="Ajusta la fecha, la sede o limpia los filtros para ver más resultados."
              footer={
                <div className="reservas-paginacion">
                  <span>
                    <Wifi size={13} /> {lista.isFetching ? "Actualizando…" : "En vivo"} · {total} reservas
                  </span>
                  <span className="reservas-paginacion__controls">
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
        </>
      ) : null}

      {tabPrincipal === "calendario" ? (
        <>
          <div className="reservas-calendario__toolbar">
            <Button variant="ghost" onClick={() => actualizar({ fecha: sumarDias(fechaCal, modoCal === "dia" ? -1 : -7) })}>
              <ChevronLeft size={16} /> Anterior
            </Button>
            <strong className="reservas-calendario__fecha">
              <CalendarDays size={15} />{" "}
              {modoCal === "dia"
                ? etiquetaDiaLarga(fechaCal)
                : `${etiquetaDia(rangoCalendario.desde)} – ${etiquetaDia(rangoCalendario.hasta)}`}
            </strong>
            <Button variant="ghost" onClick={() => actualizar({ fecha: sumarDias(fechaCal, modoCal === "dia" ? 1 : 7) })}>
              Siguiente <ChevronRight size={16} />
            </Button>
            <Button variant="secondary" onClick={() => actualizar({ fecha: hoyISO(zonaHoraria) })}>
              Hoy
            </Button>
            <div className="filter-tabs filter-tabs--inline">
              <Button
                variant="ghost"
                className={`filter-tab ${modoCal === "dia" ? "filter-tab--active" : ""}`}
                onClick={() => actualizar({ calModo: undefined })}
              >
                Día
              </Button>
              <Button
                variant="ghost"
                className={`filter-tab ${modoCal === "semana" ? "filter-tab--active" : ""}`}
                onClick={() => actualizar({ calModo: "semana" })}
              >
                Semana
              </Button>
            </div>
            <Button variant="secondary" onClick={() => abrirNueva({ nuevaFecha: new Date(`${fechaCal}T20:00:00`).toISOString() })}>
              <Plus size={15} /> Nueva reserva
            </Button>
          </div>

          <p className="reserva-nota">
            Arrastra un bloque para reubicarlo (el servidor valida el solape) o haz clic en un hueco para crear. La capa
            rayada marca cierres y festivos (V1).
          </p>

          <div className="reservas-calendario__layout">
            <section className="panel reservas-calendario__panel">
              {calendario.isError ? (
                <div className="reservas-calendario__estado">
                  <ErrorState
                    title="No pudimos cargar el calendario"
                    description="Revisa tu conexión e inténtalo de nuevo."
                    onRetry={() => void calendario.refetch()}
                  />
                </div>
              ) : calendario.isLoading || !calendario.data ? (
                <div className="reservas-calendario__cargando">
                  <SkeletonRows rows={6} columns={4} />
                </div>
              ) : (
                <ReservationCalendar
                  modo={modoCal}
                  fecha={fechaCal}
                  reservas={calendario.data.reservas}
                  bloqueos={calendario.data.bloqueos}
                  zonaHoraria={zonaHoraria}
                  puedeReubicar={puedeReubicar}
                  onAbrir={(reserva) => abrirDetalle(reserva.id)}
                  onNuevo={(fechaHoraISO) => abrirNueva({ nuevaFecha: fechaHoraISO })}
                  onReubicar={(reserva, fechaHoraISO) => {
                    setReubicar(reserva)
                    setReubicarFecha(fechaHoraISO)
                  }}
                />
              )}
            </section>

            <aside className="reservas-calendario__side">
              <WaitlistPanel
                items={calendario.data?.listaEspera ?? []}
                zonaHoraria={zonaHoraria}
                puedeVerPii={puedeVerPii}
                puedeAsignar={puedeCrear}
                onAsignar={(item) => {
                  setSearchParams(
                    (() => {
                      const siguiente = new URLSearchParams(searchParams)
                      siguiente.set("nueva", "1")
                      siguiente.set("espera", item.id)
                      siguiente.set("vista", "calendario")
                      siguiente.set("nuevaFecha", item.franjaDeseada)
                      return siguiente
                    })(),
                    { replace: true },
                  )
                }}
              />
              <ArrivalsPanel
                llegadas={calendario.data?.proximasLlegadas ?? []}
                zonaHoraria={zonaHoraria}
                puedeVerPii={puedeVerPii}
                onAbrir={abrirDetalle}
              />
            </aside>
          </div>
        </>
      ) : null}

      {tabPrincipal === "bloqueos" ? (
        <BloqueosPanel
          sedeId={sedeId ?? undefined}
          esGlobal={esGlobal}
          puedeVerPii={puedeVerPii}
          onAbrirReserva={(reservaId) => abrirDetalle(reservaId)}
        />
      ) : null}

      <ReservaDetalleDrawer
        reservaId={detalleId}
        open={Boolean(detalleId)}
        tab={(searchParams.get("tab") as ReservaTab | null) ?? "resumen"}
        onTabChange={cambiarTabDetalle}
        onClose={cerrarDetalle}
      />

      <ReservaFormDrawer
        open={searchParams.get("nueva") === "1" && puedeCrear}
        espera={esperaSeleccionada}
        fechaInicial={searchParams.get("nuevaFecha") ?? undefined}
        onClose={cerrarNueva}
      />

      <PolicyForm
        open={searchParams.get("panel") === "politicas" && puedePoliticas}
        sedeId={sedeId ?? sedes[0]?.id ?? "centro"}
        onClose={() => actualizar({ panel: undefined })}
      />

      <ReubicarDialog
        open={Boolean(reubicar)}
        reserva={reubicar}
        fechaInicial={reubicarFecha ?? undefined}
        zonaHoraria={zonaHoraria}
        pendiente={accion.isPending}
        onCancel={() => {
          setReubicar(null)
          setReubicarFecha(null)
        }}
        onConfirm={(payload) => {
          if (!reubicar) return
          accion.mutate(
            {
              id: reubicar.id,
              accion: "reubicar",
              motivo: payload.motivo,
              fechaHora: payload.fechaHora,
              duracionMin: payload.duracionMin,
              mesaId: payload.mesaId ?? "",
            },
            {
              onSuccess: () => {
                mostrar("Reserva reubicada y auditada.", "exito")
                setReubicar(null)
                setReubicarFecha(null)
              },
              onError: (error) =>
                mostrar(error instanceof ApiError ? error.message : "No se pudo reubicar la reserva.", "error"),
            },
          )
        }}
      />
    </div>
  )
}
