import { useMemo, useState } from "react"
import { Download, Save, Wifi } from "lucide-react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { DataTable, type Column } from "@/components/data/DataTable"
import { FilterBar, type ActiveFilter } from "@/components/data/FilterBar"
import { PageHeader } from "@/components/data/PageHeader"
import { SavedViewChip } from "@/components/data/SavedViewChip"
import { DurationCell, MoneyCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { SelectField, TextField, type SelectOption } from "@/components/ui/fields"
import { NoPermissionState } from "@/components/ui/states"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { formatTime, maskName } from "@/lib/format"
import { useSocketEvent } from "@/lib/realtime"
import { useExportarPedidos, usePedidos } from "@/modules/pedidos/api"
import { PedidoDetalleDrawer, type PedidoTab } from "@/modules/pedidos/components/PedidoDetalleDrawer"
import {
  CANAL_LABEL,
  ESTADO_LABEL,
  ESTADO_TONE,
  MODALIDAD_LABEL,
  type CanalPedido,
  type ModalidadPedido,
  type PedidoEstado,
  type PedidoLista,
  type PedidosFiltros,
} from "@/modules/pedidos/types"
import "@/modules/pedidos/pedidos.css"

const PAGE_SIZE = 10
const MESEROS = ["Laura Pérez", "Carlos Méndez", "Ana Morales", "Diego Ramírez"]

type VistaPreset = { id: string; label: string; params: Record<string, string> }

const VISTAS_PRESET: VistaPreset[] = [
  { id: "por-cobrar-hoy", label: "Por cobrar de hoy", params: { estado: "por_cobrar" } },
  { id: "domicilio-en-camino", label: "Domicilio en camino", params: { modalidad: "domicilio", estado: "en_camino" } },
  { id: "con-incidencias", label: "Con incidencias", params: { incidencias: "true" } },
]

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

type VistaGuardada = { id: string; label: string; query: string }

const STORAGE_VISTAS = "pc_pedidos_vistas"

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

function leerFiltros(searchParams: URLSearchParams, sedeActiva: string | null): PedidosFiltros {
  const entero = (clave: string) => {
    const valor = Number(searchParams.get(clave) ?? "1")
    return Number.isFinite(valor) && valor > 0 ? valor : 1
  }
  return {
    page: entero("page"),
    pageSize: PAGE_SIZE,
    sedeId: searchParams.get("sede") ?? sedeActiva ?? undefined,
    canal: (searchParams.get("canal") as CanalPedido | null) ?? undefined,
    modalidad: (searchParams.get("modalidad") as ModalidadPedido | null) ?? undefined,
    estado: (searchParams.get("estado") as PedidoEstado | null) ?? undefined,
    mesero: searchParams.get("mesero") ?? undefined,
    desde: searchParams.get("desde") ?? undefined,
    hasta: searchParams.get("hasta") ?? undefined,
    incidencias: searchParams.get("incidencias") === "true" ? true : undefined,
    descuento: searchParams.get("descuento") === "true" ? true : undefined,
    reembolso: searchParams.get("reembolso") === "true" ? true : undefined,
    busqueda: searchParams.get("q") ?? undefined,
  }
}

function vistaActiva(params: Record<string, string>, searchParams: URLSearchParams): boolean {
  return Object.entries(params).every(([clave, valor]) => searchParams.get(clave) === valor)
}

export default function PedidosPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { mostrar } = useToast()
  const { tienePermiso } = useAuth()
  const { sedeId, sedes, esGlobal, zonaHoraria } = useSede()

  const [vistas, setVistas] = useState<VistaGuardada[]>(() => leerVistasGuardadas())

  const filtros = useMemo(() => leerFiltros(searchParams, sedeId), [searchParams, sedeId])
  const { data, isLoading, isError, error, refetch, isFetching } = usePedidos(filtros)
  const exportar = useExportarPedidos()

  useSocketEvent(
    ["pedido.creado", "pedido.estado", "pedido.actualizado", "comanda.estado", "pago.registrado"],
    () => {
      void queryClient.invalidateQueries({ queryKey: ["pedidos"] })
    },
  )

  const puedeVer = tienePermiso("pedidos.ver")
  const puedeExportar = tienePermiso("pedidos.exportar")
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
    if (searchParams.get("sede")) siguiente.set("sede", searchParams.get("sede") ?? "")
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
      filtros.modalidad ? MODALIDAD_LABEL[filtros.modalidad] : null,
      filtros.canal ? CANAL_LABEL[filtros.canal] : null,
      filtros.busqueda ? `«${filtros.busqueda}»` : null,
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

  const exportarPeriodo = () => {
    exportar.mutate(
      { tipo: "pedidos", formato: "csv" },
      {
        onSuccess: () =>
          mostrar("Exportación registrada. El archivo se genera en segundo plano y se avisará al solicitante.", "exito"),
        onError: () => mostrar("No se pudo registrar la exportación.", "error"),
      },
    )
  }

  const abrirDetalle = (pedido: PedidoLista) => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.delete("tab")
    const query = siguiente.toString()
    navigate(`/pedidos/${pedido.id}${query ? `?${query}` : ""}`)
  }

  const cerrarDetalle = () => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.delete("tab")
    const query = siguiente.toString()
    navigate(`/pedidos${query ? `?${query}` : ""}`)
  }

  const cambiarTab = (tab: PedidoTab) => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.set("tab", tab)
    setSearchParams(siguiente, { replace: true })
  }

  const columnas: Column<PedidoLista>[] = [
    {
      key: "folio",
      header: "Folio / hora",
      cell: (row) => (
        <>
          <span className="order-id">{row.folio}</span>
          <span className="order-type">{formatTime(row.creadoEn, zonaHoraria)}</span>
        </>
      ),
    },
    { key: "sede", header: "Sede", cell: (row) => row.sedeNombre },
    {
      key: "origen",
      header: "Modalidad · canal",
      cell: (row) => `${MODALIDAD_LABEL[row.modalidad]} · ${CANAL_LABEL[row.canal]}`,
    },
    {
      key: "mesa",
      header: "Mesa",
      cell: (row) => row.mesa ?? (row.modalidad === "domicilio" ? "Domicilio" : "Mostrador"),
    },
    {
      key: "cliente",
      header: "Cliente",
      cell: (row) => (puedeVerPii ? row.clienteNombre : maskName(row.clienteNombre)),
    },
    { key: "mesero", header: "Mesero", cell: (row) => row.mesero },
    {
      key: "estado",
      header: "Estado",
      cell: (row) => <StatusBadge tone={ESTADO_TONE[row.estado]}>{ESTADO_LABEL[row.estado]}</StatusBadge>,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (row) => <MoneyCell centavos={row.totalCentavos} />,
    },
    {
      key: "tiempo",
      header: "Tiempo total",
      align: "right",
      cell: (row) => <DurationCell segundos={row.tiempoTotalSeg} titulo="= cierre − creado" />,
    },
    { key: "pago", header: "Pago", cell: (row) => row.pagoResumen },
  ]

  const filtrosActivos: ActiveFilter[] = []
  if (filtros.desde || filtros.hasta) {
    filtrosActivos.push({ key: "fecha", label: `Fecha ${filtros.desde ?? "…"} → ${filtros.hasta ?? "hoy"}` })
  }
  if (filtros.canal) filtrosActivos.push({ key: "canal", label: `Canal: ${CANAL_LABEL[filtros.canal]}` })
  if (filtros.modalidad) {
    filtrosActivos.push({ key: "modalidad", label: `Modalidad: ${MODALIDAD_LABEL[filtros.modalidad]}` })
  }
  if (filtros.estado) filtrosActivos.push({ key: "estado", label: `Estado: ${ESTADO_LABEL[filtros.estado]}` })
  if (filtros.mesero) filtrosActivos.push({ key: "mesero", label: `Mesero: ${filtros.mesero}` })
  if (filtros.incidencias) filtrosActivos.push({ key: "incidencias", label: "Con incidencias" })
  if (filtros.descuento) filtrosActivos.push({ key: "descuento", label: "Con descuento" })
  if (filtros.reembolso) filtrosActivos.push({ key: "reembolso", label: "Con reembolso" })
  if (filtros.busqueda) filtrosActivos.push({ key: "busqueda", label: `Búsqueda: «${filtros.busqueda}»` })

  const opcionesSede: SelectOption[] = [{ value: "", label: "Todas las sedes" }, ...sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))]
  const opcionesCanal: SelectOption[] = Object.entries(CANAL_LABEL).map(([value, label]) => ({ value, label }))
  const opcionesModalidad: SelectOption[] = Object.entries(MODALIDAD_LABEL).map(([value, label]) => ({ value, label }))
  const opcionesEstado: SelectOption[] = Object.entries(ESTADO_LABEL).map(([value, label]) => ({ value, label }))
  const opcionesMesero: SelectOption[] = MESEROS.map((nombre) => ({ value: nombre, label: nombre }))

  if (!puedeVer) {
    return (
      <div className="module-page">
        <PageHeader
          eyebrow="Operación / Pedidos"
          title="Pedidos"
          subtitle="Historial operativo y trazable de todos los pedidos."
        />
        <NoPermissionState permiso="pedidos.ver" />
      </div>
    )
  }

  const total = data?.total ?? 0
  const pagina = data?.page ?? filtros.page
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="module-page">
      <PageHeader
        eyebrow="Operación / Pedidos"
        title="Pedidos"
        subtitle="Lista en vivo e historial con detalle, líneas, comandas, pagos y bitácora."
        actions={
          <>
            {!puedeExportar ? (
              <Button variant="secondary" disabled title="Requiere permiso de pedidos.exportar">
                <Download size={15} /> Exportar
              </Button>
            ) : (
              <Button variant="secondary" disabled={exportar.isPending} onClick={exportarPeriodo}>
                <Download size={15} /> {exportar.isPending ? "Exportando…" : "Exportar período"}
              </Button>
            )}
          </>
        }
      />

      <FilterBar
        activeFilters={filtrosActivos}
        onClear={filtrosActivos.length > 0 ? limpiarFiltros : undefined}
        actions={
          <>
            <Button variant="ghost" className="text-action" onClick={guardarVista}>
              <Save size={14} /> Guardar vista
            </Button>
          </>
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
          placeholder="Folio o cliente"
          value={searchParams.get("q") ?? ""}
          onChange={(event) => actualizar({ q: event.target.value || undefined })}
        />
        <SelectField
          label="Canal"
          options={opcionesCanal}
          placeholder="Todos"
          value={searchParams.get("canal") ?? ""}
          onChange={(event) => actualizar({ canal: event.target.value || undefined })}
        />
        <SelectField
          label="Modalidad"
          options={opcionesModalidad}
          placeholder="Todas"
          value={searchParams.get("modalidad") ?? ""}
          onChange={(event) => actualizar({ modalidad: event.target.value || undefined })}
        />
        <SelectField
          label="Estado"
          options={opcionesEstado}
          placeholder="Todos"
          value={searchParams.get("estado") ?? ""}
          onChange={(event) => actualizar({ estado: event.target.value || undefined })}
        />
        <SelectField
          label="Mesero"
          options={opcionesMesero}
          placeholder="Todos"
          value={searchParams.get("mesero") ?? ""}
          onChange={(event) => actualizar({ mesero: event.target.value || undefined })}
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
        <div className="filter-tabs filter-tabs--inline">
          <Button
            variant="ghost"
            className={`filter-tab ${filtros.incidencias ? "filter-tab--active" : ""}`}
            onClick={() => actualizar({ incidencias: filtros.incidencias ? undefined : "true" })}
          >
            Con incidencias
          </Button>
          <Button
            variant="ghost"
            className={`filter-tab ${filtros.descuento ? "filter-tab--active" : ""}`}
            onClick={() => actualizar({ descuento: filtros.descuento ? undefined : "true" })}
          >
            Con descuento
          </Button>
          <Button
            variant="ghost"
            className={`filter-tab ${filtros.reembolso ? "filter-tab--active" : ""}`}
            onClick={() => actualizar({ reembolso: filtros.reembolso ? undefined : "true" })}
          >
            Con reembolso
          </Button>
        </div>
      </FilterBar>

      <div className="saved-views">
        <span className="saved-views__label">Vistas</span>
        {VISTAS_PRESET.map((vista) => (
          <SavedViewChip
            key={vista.id}
            label={vista.label}
            active={vistaActiva(
              vista.id === "por-cobrar-hoy" ? { ...vista.params, desde: hoyISO() } : vista.params,
              searchParams,
            )}
            onClick={() =>
              aplicarVista(vista.id === "por-cobrar-hoy" ? { ...vista.params, desde: hoyISO() } : vista.params)
            }
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
          rows={data?.data ?? []}
          getRowKey={(row) => row.id}
          onRowClick={abrirDetalle}
          loading={isLoading}
          error={isError ? (error as Error) : null}
          onRetry={() => void refetch()}
          emptyTitle="Aún no hay pedidos en este período"
          emptyDescription="Ajusta la fecha, la sede o limpia los filtros para ver más resultados."
          footer={
            <div className="pedidos-paginacion">
              <span>
                <Wifi size={13} /> {isFetching ? "Actualizando…" : "En vivo"} · {total} pedidos
              </span>
              <span className="pedidos-paginacion__controls">
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

      <PedidoDetalleDrawer
        pedidoId={id ?? null}
        open={Boolean(id)}
        tab={(searchParams.get("tab") as PedidoTab | null) ?? "resumen"}
        onTabChange={cambiarTab}
        onClose={cerrarDetalle}
      />
    </div>
  )
}
