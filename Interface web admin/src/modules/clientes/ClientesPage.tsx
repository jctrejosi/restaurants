import { useMemo } from "react"
import { Download, Users } from "lucide-react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { DataTable, type Column } from "@/components/data/DataTable"
import { FilterBar, type ActiveFilter } from "@/components/data/FilterBar"
import { PageHeader } from "@/components/data/PageHeader"
import { SavedViewChip } from "@/components/data/SavedViewChip"
import { MoneyCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { SelectField, TextField, type SelectOption } from "@/components/ui/fields"
import { NoPermissionState } from "@/components/ui/states"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { formatDateTime, maskContact, maskName } from "@/lib/format"
import { useClientes, useExportarClientes, useSegmentos } from "@/modules/clientes/api"
import { ClientProfile, type ClienteTab } from "@/modules/clientes/components/ClientProfile"
import { SegmentBuilder } from "@/modules/clientes/components/SegmentBuilder"
import {
  MARKETING_LABEL,
  MARKETING_TONE,
  type ClienteLista,
  type ClientesFiltros,
} from "@/modules/clientes/types"
import "@/modules/clientes/clientes.css"

const PAGE_SIZE = 10

type VistaClientes = "directorio" | "segmentos"

const VISTAS_PRESET: Array<{ id: string; label: string; params: Record<string, string> }> = [
  { id: "con-marketing", label: "Con marketing", params: { marketing: "con" } },
  { id: "sin-marketing", label: "Sin marketing / opt-out", params: { marketing: "sin" } },
  { id: "recurrentes", label: "Recurrentes", params: { segmento: "seg-recurrentes" } },
]

function leerFiltros(searchParams: URLSearchParams, sedeActiva: string | null): ClientesFiltros {
  const pagina = Number(searchParams.get("page") ?? "1")
  const marketing = searchParams.get("marketing")
  return {
    page: Number.isFinite(pagina) && pagina > 0 ? pagina : 1,
    pageSize: PAGE_SIZE,
    busqueda: searchParams.get("q") ?? undefined,
    marketing: marketing === "con" || marketing === "sin" ? marketing : undefined,
    sucursalId: searchParams.get("sede") ?? sedeActiva ?? undefined,
    desde: searchParams.get("desde") ?? undefined,
    hasta: searchParams.get("hasta") ?? undefined,
    segmentoId: searchParams.get("segmento") ?? undefined,
  }
}

function vistaActiva(params: Record<string, string>, searchParams: URLSearchParams): boolean {
  return Object.entries(params).every(([clave, valor]) => searchParams.get(clave) === valor)
}

/**
 * Módulo Clientes (plan admin-modules/10): lista con filtros, ficha en drawer y
 * segmentos V2. Los datos personales se enmascaran sin `clientes.ver_pii`.
 */
export default function ClientesPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { mostrar } = useToast()
  const { tienePermiso } = useAuth()
  const { sedeId, sedes, esGlobal, zonaHoraria, setSedeId } = useSede()
  const { mutate: solicitarExportacion, isPending: exportando } = useExportarClientes()
  const { data: dataSegmentos } = useSegmentos()

  const filtros = useMemo(() => leerFiltros(searchParams, sedeId), [searchParams, sedeId])
  const { data, isLoading, isError, refetch } = useClientes(filtros)

  const puedeVer = tienePermiso("clientes.ver")
  const puedeExportar = tienePermiso("clientes.exportar")
  const puedeVerPii = tienePermiso("clientes.ver_pii")

  const vista: VistaClientes = searchParams.get("vista") === "segmentos" ? "segmentos" : "directorio"
  const tab = (searchParams.get("tab") as ClienteTab | null) ?? "resumen"

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
    const vistaActual = searchParams.get("vista")
    if (vistaActual) siguiente.set("vista", vistaActual)
    setSearchParams(siguiente, { replace: true })
  }

  const abrirFicha = (cliente: ClienteLista) => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.delete("tab")
    siguiente.delete("vista")
    const query = siguiente.toString()
    navigate(`/clientes/${cliente.id}${query ? `?${query}` : ""}`)
  }

  const cerrarFicha = () => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.delete("tab")
    const query = siguiente.toString()
    navigate(`/clientes${query ? `?${query}` : ""}`)
  }

  const cambiarTab = (nuevo: ClienteTab) => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.set("tab", nuevo)
    setSearchParams(siguiente, { replace: true })
  }

  const exportarLista = () => {
    solicitarExportacion(filtros, {
      onSuccess: (exportacion) =>
        mostrar(
          exportacion.estado === "en_proceso" || exportacion.total > 5_000
            ? `Exportación registrada (${exportacion.total} filas). Es grande: se genera en segundo plano y se avisa al solicitante.`
            : `Exportación registrada (${exportacion.total} clientes).`,
          "exito",
        ),
      onError: () => mostrar("No se pudo registrar la exportación.", "error"),
    })
  }

  if (!puedeVer) {
    return (
      <div className="module-page">
        <PageHeader
          eyebrow="Clientes / Directorio"
          title="Clientes"
          subtitle="Ficha con historial, consentimientos, segmentos y derechos ARCO."
        />
        <NoPermissionState permiso="clientes.ver" />
      </div>
    )
  }

  const clientes = data?.data ?? []
  const total = data?.total ?? 0
  const pagina = data?.page ?? filtros.page
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const filtrosActivos: ActiveFilter[] = []
  if (filtros.busqueda) filtrosActivos.push({ key: "q", label: `Búsqueda: «${filtros.busqueda}»` })
  if (filtros.marketing) {
    filtrosActivos.push({
      key: "marketing",
      label: filtros.marketing === "con" ? "Con marketing" : "Sin marketing / opt-out",
    })
  }
  if (filtros.segmentoId) filtrosActivos.push({ key: "segmento", label: "Con segmento" })
  if (filtros.desde || filtros.hasta) {
    filtrosActivos.push({ key: "fechas", label: `Última visita ${filtros.desde ?? "…"} → ${filtros.hasta ?? "hoy"}` })
  }

  const opcionesSede: SelectOption[] = [
    { value: "", label: "Todas las sedes" },
    ...sedes.map((sede) => ({ value: sede.id, label: sede.nombre })),
  ]
  const opcionesSegmento: SelectOption[] = (dataSegmentos?.data ?? []).map((segmento) => ({
    value: segmento.id,
    label: `${segmento.nombre} (${segmento.conteo})`,
  }))

  const columnas: Column<ClienteLista>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (cliente) => (
        <>
          <span className="order-id">{puedeVerPii ? cliente.nombre : maskName(cliente.nombre)}</span>
          <span className="order-type">
            {cliente.id.toUpperCase()}
            {cliente.anonimizado ? (
              <>
                {" "}
                <StatusBadge tone="gray">Anonimizado</StatusBadge>
              </>
            ) : null}
          </span>
        </>
      ),
    },
    {
      key: "contacto",
      header: "Contacto",
      cell: (cliente) => (
        <span className="cell-wrap">
          <span className="linea-nombre">
            {cliente.telefono ? (puedeVerPii ? cliente.telefono : maskContact(cliente.telefono)) : "Sin teléfono"}
          </span>
          <small className="linea-notas">
            {cliente.correo ? (puedeVerPii ? cliente.correo : maskContact(cliente.correo)) : "Sin correo"}
          </small>
        </span>
      ),
    },
    {
      key: "ultimaVisita",
      header: "Última visita",
      cell: (cliente) => (cliente.ultimaVisita ? formatDateTime(cliente.ultimaVisita, zonaHoraria) : "—"),
    },
    { key: "pedidos", header: "Pedidos", align: "right", cell: (cliente) => cliente.pedidos },
    {
      key: "reservas",
      header: "Reservas activas",
      align: "right",
      cell: (cliente) => (cliente.reservasActivas > 0 ? cliente.reservasActivas : "—"),
    },
    {
      key: "consumo",
      header: "Consumo",
      align: "right",
      cell: (cliente) => <MoneyCell centavos={cliente.totalGastadoCentavos} />,
    },
    {
      key: "marketing",
      header: "Consentimiento",
      cell: (cliente) => (
        <StatusBadge tone={MARKETING_TONE[cliente.marketing]}>{MARKETING_LABEL[cliente.marketing]}</StatusBadge>
      ),
    },
    {
      key: "segmentos",
      header: "Segmentos",
      cell: (cliente) =>
        cliente.segmentos.length === 0 ? (
          "—"
        ) : (
          <span className="cliente-tags">
            {cliente.segmentos.map((segmento) => (
              <span className="cliente-tag" key={segmento}>
                {segmento}
              </span>
            ))}
          </span>
        ),
    },
  ]

  const tabsVista = [
    { id: "directorio", label: "Directorio" },
    { id: "segmentos", label: "Segmentos · V2" },
  ]

  return (
    <div className="module-page">
      <PageHeader
        eyebrow="Clientes / Directorio"
        title="Clientes"
        subtitle="Historial, preferencias, consentimientos y derechos ARCO con datos enmascarados por rol."
        actions={
          <Button
            variant="secondary"
            disabled={!puedeExportar || exportando}
            title={puedeExportar ? undefined : "Requiere permiso de clientes.exportar"}
            onClick={exportarLista}
          >
            <Download size={15} /> {exportando ? "Exportando…" : "Exportar vista"}
          </Button>
        }
      />

      <div className="filter-tabs filter-tabs--inline cliente-vistas">
        {tabsVista.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={`filter-tab ${vista === item.id ? "filter-tab--active" : ""}`}
            onClick={() => actualizar({ vista: item.id === "directorio" ? undefined : item.id }, false)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {vista === "segmentos" ? (
        <SegmentBuilder />
      ) : (
        <>
          <FilterBar
            activeFilters={filtrosActivos}
            onClear={filtrosActivos.length > 0 ? limpiarFiltros : undefined}
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
              placeholder="Nombre, teléfono o correo"
              value={searchParams.get("q") ?? ""}
              onChange={(event) => actualizar({ q: event.target.value || undefined })}
            />
            <SelectField
              label="Marketing"
              options={[
                { value: "con", label: "Con consentimiento" },
                { value: "sin", label: "Sin consentimiento u opt-out" },
              ]}
              placeholder="Todos"
              value={searchParams.get("marketing") ?? ""}
              onChange={(event) => actualizar({ marketing: event.target.value || undefined })}
            />
            <SelectField
              label="Segmento"
              options={opcionesSegmento}
              placeholder="Todos"
              value={searchParams.get("segmento") ?? ""}
              onChange={(event) => actualizar({ segmento: event.target.value || undefined })}
            />
            <TextField
              label="Última visita desde"
              type="date"
              value={searchParams.get("desde") ?? ""}
              onChange={(event) => actualizar({ desde: event.target.value || undefined })}
            />
            <TextField
              label="Última visita hasta"
              type="date"
              value={searchParams.get("hasta") ?? ""}
              onChange={(event) => actualizar({ hasta: event.target.value || undefined })}
            />
          </FilterBar>

          <div className="saved-views">
            <span className="saved-views__label">Vistas</span>
            {VISTAS_PRESET.map((preset) => (
              <SavedViewChip
                key={preset.id}
                label={preset.label}
                active={vistaActiva(preset.params, searchParams)}
                onClick={() => {
                  const siguiente = new URLSearchParams(searchParams)
                  siguiente.delete("marketing")
                  siguiente.delete("segmento")
                  for (const [clave, valor] of Object.entries(preset.params)) siguiente.set(clave, valor)
                  siguiente.delete("page")
                  setSearchParams(siguiente, { replace: true })
                }}
              />
            ))}
          </div>

          <section className="panel">
            <DataTable
              columns={columnas}
              rows={clientes}
              getRowKey={(cliente) => cliente.id}
              onRowClick={abrirFicha}
              loading={isLoading}
              error={isError ? new Error("No se pudo cargar el directorio") : null}
              onRetry={() => void refetch()}
              emptyTitle={filtrosActivos.length > 0 ? "Sin resultados para estos filtros" : "Aún no hay clientes"}
              emptyDescription={
                filtrosActivos.length > 0
                  ? "Limpia los filtros para ver todo el directorio."
                  : "Cuando existan clientes con pedidos o reservas aparecerán aquí."
              }
              footer={
                <div className="pedidos-paginacion">
                  <span>
                    <Users size={13} /> {total} clientes
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
        </>
      )}

      <ClientProfile
        clienteId={id ?? null}
        open={Boolean(id)}
        tab={tab}
        conDatos={puedeVerPii}
        zonaHoraria={zonaHoraria}
        onTabChange={cambiarTab}
        onClose={cerrarFicha}
      />
    </div>
  )
}
