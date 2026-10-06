/**
 * Catálogo (plan 06): una página sirve `/catalogo`, `/catalogo/:id`,
 * `/catalogo/disponibilidad` y `/catalogo/importar`. El árbol de categorías
 * filtra la tabla; la ficha se abre como asistente por pasos.
 */

import { useMemo, useState } from "react"
import { Ban, Download, Ellipsis, Plus, RefreshCw, Shuffle, Wifi } from "lucide-react"
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { PageHeader } from "@/components/data/PageHeader"
import { DataTable, type Column } from "@/components/data/DataTable"
import { FilterBar, type ActiveFilter } from "@/components/data/FilterBar"
import { SavedViewChip } from "@/components/data/SavedViewChip"
import { MoneyCell } from "@/components/data/cells"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { IconButton } from "@/components/ui/IconButton"
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge"
import { SelectField, TextField } from "@/components/ui/fields"
import { NoPermissionState } from "@/components/ui/states"
import { useToast } from "@/components/ui/toast"
import { usePopover } from "@/components/ui/usePopover"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { formatRelative } from "@/lib/format"
import {
  useCambiarDisponibilidad,
  useCategorias,
  useDuplicarProducto,
  useEstacionesDisponibles,
  useExportarCatalogo,
  useGuardarCategoria,
  useProducto,
  useProductos,
} from "@/modules/catalogo/api"
import { CategoriaDialog, MenuTree } from "@/modules/catalogo/components/MenuTree"
import { ProductForm } from "@/modules/catalogo/components/ProductForm"
import { AvailabilityGrid } from "@/modules/catalogo/components/AvailabilityGrid"
import { CsvImporter } from "@/modules/catalogo/components/CsvImporter"
import { ETIQUETA_LABEL, type Categoria, type ProductoLista } from "@/modules/catalogo/types"
import "@/modules/catalogo/catalogo.css"

const PAGE_SIZE = 10

type VistaPreset = { id: string; label: string; params: Record<string, string> }

const VISTAS: VistaPreset[] = [
  { id: "agotados", label: "Agotados", params: { agotado: "true" } },
  { id: "sin-estacion", label: "Sin estación", params: { sinEstacion: "true" } },
  { id: "inactivos", label: "Inactivos", params: { activo: "false" } },
  { id: "destacados", label: "Destacados", params: { destacado: "true" } },
]

function vistaActiva(params: Record<string, string>, searchParams: URLSearchParams): boolean {
  return Object.entries(params).every(([clave, valor]) => searchParams.get(clave) === valor)
}

function AccionesProducto({
  producto,
  puedeEditar,
  puedeDisponibilidad,
  onEditar,
  onDuplicar,
  onAgotar,
  onReactivar,
}: {
  producto: ProductoLista
  puedeEditar: boolean
  puedeDisponibilidad: boolean
  onEditar: () => void
  onDuplicar: () => void
  onAgotar: () => void
  onReactivar: () => void
}) {
  const { open, setOpen, ref } = usePopover<HTMLSpanElement>()
  return (
    <span className="cat-acciones" ref={ref} onClick={(event) => event.stopPropagation()}>
      <IconButton label="Acciones del producto" onClick={() => setOpen(!open)}>
        <Ellipsis size={17} />
      </IconButton>
      {open ? (
        <span className="popover cat-acciones__menu">
          <button type="button" className="button button--ghost" onClick={onEditar}>
            Ver ficha
          </button>
          <button
            type="button"
            className="button button--ghost"
            disabled={!puedeEditar}
            title={puedeEditar ? undefined : "Requiere permiso de catalogo.editar"}
            onClick={onDuplicar}
          >
            <Shuffle size={14} /> Duplicar
          </button>
          {producto.agotado ? (
            <button
              type="button"
              className="button button--ghost"
              disabled={!puedeDisponibilidad}
              title={puedeDisponibilidad ? undefined : "Requiere permiso de catalogo.disponibilidad"}
              onClick={onReactivar}
            >
              <RefreshCw size={14} /> Reactivar
            </button>
          ) : (
            <button
              type="button"
              className="button button--ghost"
              disabled={!puedeDisponibilidad}
              title={puedeDisponibilidad ? undefined : "Requiere permiso de catalogo.disponibilidad"}
              onClick={onAgotar}
            >
              <Ban size={14} /> Agotar
            </button>
          )}
        </span>
      ) : null}
    </span>
  )
}

export default function CatalogoPage() {
  const { id } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { mostrar } = useToast()
  const { tienePermiso } = useAuth()
  const { sedeId, sedes, esGlobal, zonaHoraria } = useSede()

  const esDisponibilidad = pathname.startsWith("/catalogo/disponibilidad")
  const esImportar = pathname.startsWith("/catalogo/importar")

  const [dialogo, setDialogo] = useState<{ abierto: boolean; categoria: Categoria | null; padre: string | null }>({
    abierto: false,
    categoria: null,
    padre: null,
  })
  const [agotadoObjetivo, setAgotadoObjetivo] = useState<{ producto: ProductoLista; agotado: boolean } | null>(null)

  const puedeVer = tienePermiso("catalogo.ver")
  const puedeEditar = tienePermiso("catalogo.editar")
  const puedeDisponibilidad = tienePermiso("catalogo.disponibilidad")
  const puedeExportar = tienePermiso("catalogo.exportar")

  const categoriaId = searchParams.get("categoria") ?? undefined
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"))
  const filtros = useMemo(
    () => ({
      categoriaId,
      incluirSubcategorias: true,
      sedeId: sedeId ?? undefined,
      q: searchParams.get("q") ?? undefined,
      activo: searchParams.get("activo") === null ? undefined : searchParams.get("activo") === "true",
      agotado: searchParams.get("agotado") === null ? undefined : searchParams.get("agotado") === "true",
      destacado: searchParams.get("destacado") === null ? undefined : searchParams.get("destacado") === "true",
      sinEstacion: searchParams.get("sinEstacion") === null ? undefined : searchParams.get("sinEstacion") === "true",
      etiqueta: (searchParams.get("etiqueta") as keyof typeof ETIQUETA_LABEL | null) ?? undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [searchParams, sedeId, categoriaId, page],
  )

  const categorias = useCategorias()
  const productos = useProductos(filtros)
  const todos = useProductos({ sedeId: sedeId ?? undefined, page: 1, pageSize: 300 })
  const estaciones = useEstacionesDisponibles()
  const productoDetalle = useProducto(id ?? null)
  const guardarCategoria = useGuardarCategoria()
  const duplicar = useDuplicarProducto()
  const cambiarDisponibilidad = useCambiarDisponibilidad()
  const exportar = useExportarCatalogo()

  const conteos = useMemo(() => {
    const mapa: Record<string, number> = {}
    for (const producto of todos.data?.data ?? []) {
      mapa[producto.categoriaId] = (mapa[producto.categoriaId] ?? 0) + 1
    }
    return mapa
  }, [todos.data])

  const actualizar = (cambios: Record<string, string | undefined>, reiniciarPagina = true) => {
    const siguiente = new URLSearchParams(searchParams)
    for (const [clave, valor] of Object.entries(cambios)) {
      if (!valor) siguiente.delete(clave)
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

  const abrirProducto = (productoId: string) => {
    const query = new URLSearchParams(searchParams)
    navigate(`/catalogo/${productoId}?${query.toString()}`)
  }

  const cerrarFicha = () => {
    const query = new URLSearchParams(searchParams)
    navigate(`/catalogo${query.toString() ? `?${query.toString()}` : ""}`)
  }

  const moverCategoria = (categoria: Categoria, delta: number) => {
    const hermanas = (categorias.data ?? [])
      .filter((item) => item.padreId === categoria.padreId)
      .sort((a, b) => a.orden - b.orden)
    const indice = hermanas.findIndex((item) => item.id === categoria.id)
    const vecina = hermanas[indice + delta]
    if (!vecina) return
    guardarCategoria.mutate({ id: categoria.id, orden: vecina.orden })
    guardarCategoria.mutate({ id: vecina.id, orden: categoria.orden })
  }

  const confirmarAgotado = (motivo: string) => {
    if (!agotadoObjetivo) return
    cambiarDisponibilidad.mutate(
      {
        productoIds: [agotadoObjetivo.producto.id],
        sucursalId: sedeId ?? sedes[0]?.id ?? "centro",
        franja: null,
        agotado: agotadoObjetivo.agotado,
        origen: "backoffice",
        motivo,
      },
      {
        onSuccess: () => {
          mostrar(
            agotadoObjetivo.agotado
              ? "Agotado propagado a web, APK y KDS con origen y vigencia."
              : "Reactivado: web, APK y KDS vuelven a mostrarlo.",
            "exito",
          )
          setAgotadoObjetivo(null)
        },
        onError: () => mostrar("No se pudo cambiar la disponibilidad.", "error"),
      },
    )
  }

  const exportarCatalogo = () => {
    exportar.mutate(
      { tipo: "catalogo", formato: "csv", sucursalId: sedeId ?? undefined },
      {
        onSuccess: (registro) =>
          mostrar(
            registro.avisoSegundoPlano
              ? "Exportación registrada; el volumen es alto y se genera en segundo plano con aviso."
              : `Exportación registrada (${registro.id}) y lista.`,
            "exito",
          ),
        onError: () => mostrar("No se pudo registrar la exportación.", "error"),
      },
    )
  }

  if (!puedeVer) {
    return (
      <div className="module-page">
        <PageHeader eyebrow="Negocio / Catálogo" title="Catálogo" />
        <NoPermissionState permiso="catalogo.ver" />
      </div>
    )
  }

  if (esDisponibilidad) {
    return (
      <div className="module-page">
        <PageHeader
          eyebrow="Negocio / Catálogo"
          title="Disponibilidad por sede"
          subtitle="Agotados y reactivaciones con origen, vigencia y propagación a web, APK y KDS."
          actions={
            <Button variant="secondary" onClick={() => navigate("/catalogo")}>
              Volver a la carta
            </Button>
          }
        />
        <AvailabilityGrid />
      </div>
    )
  }

  if (esImportar) {
    return (
      <div className="module-page">
        <PageHeader
          eyebrow="Negocio / Catálogo"
          title="Importar / exportar"
          subtitle="CSV con validación por fila, rechazo con detalle y registro de exportaciones."
          actions={
            <Button variant="secondary" onClick={() => navigate("/catalogo")}>
              Volver a la carta
            </Button>
          }
        />
        <CsvImporter />
      </div>
    )
  }

  const total = productos.data?.total ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const filtrosActivos: ActiveFilter[] = []
  if (filtros.q) filtrosActivos.push({ key: "q", label: `Búsqueda: «${filtros.q}»` })
  if (filtros.activo !== undefined) filtrosActivos.push({ key: "activo", label: filtros.activo ? "Activos" : "Inactivos" })
  if (filtros.agotado) filtrosActivos.push({ key: "agotado", label: "Agotados" })
  if (filtros.destacado) filtrosActivos.push({ key: "destacado", label: "Destacados" })
  if (filtros.sinEstacion) filtrosActivos.push({ key: "sinEstacion", label: "Sin estación" })
  if (filtros.etiqueta) filtrosActivos.push({ key: "etiqueta", label: ETIQUETA_LABEL[filtros.etiqueta] })

  const columnas: Column<ProductoLista>[] = [
    {
      key: "producto",
      header: "Producto",
      cell: (row) => (
        <>
          <span className="order-id">{row.nombre}</span>
          <span className="order-type">{row.sku}</span>
        </>
      ),
    },
    { key: "categoria", header: "Categoría", cell: (row) => row.categoriaNombre },
    {
      key: "precio",
      header: "Precio vigente",
      align: "right",
      cell: (row) => <MoneyCell centavos={row.precioCentavos} />,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (row) => {
        const tono: StatusTone = row.agotado ? "amber" : row.activo ? "green" : "gray"
        return (
          <>
            <StatusBadge tone={tono}>{row.agotado ? "agotado" : row.activo ? "activo" : "inactivo"}</StatusBadge>
            {row.destacado ? <StatusBadge tone="blue">destacado</StatusBadge> : null}
            {row.etiquetas.includes("menu_del_dia") ? <StatusBadge tone="outline">menú del día</StatusBadge> : null}
          </>
        )
      },
    },
    {
      key: "estacion",
      header: "Estación",
      cell: (row) =>
        row.estacionNombre ? (
          row.estacionNombre
        ) : (
          <StatusBadge tone="amber" title="Sin estación el producto no genera comanda (RF-R5-30)">
            sin estación
          </StatusBadge>
        ),
    },
    {
      key: "actualizado",
      header: "Actualizado",
      cell: (row) => formatRelative(row.actualizadoEn),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      cell: (row) => (
        <AccionesProducto
          producto={row}
          puedeEditar={puedeEditar}
          puedeDisponibilidad={puedeDisponibilidad}
          onEditar={() => abrirProducto(row.id)}
          onDuplicar={() =>
            duplicar.mutate(row.id, {
              onSuccess: () => mostrar("Producto duplicado sin arrastrar el historial de precios.", "exito"),
              onError: () => mostrar("No se pudo duplicar el producto.", "error"),
            })
          }
          onAgotar={() => setAgotadoObjetivo({ producto: row, agotado: true })}
          onReactivar={() => setAgotadoObjetivo({ producto: row, agotado: false })}
        />
      ),
    },
  ]

  return (
    <div className="module-page">
      <PageHeader
        eyebrow="Negocio / Catálogo"
        title="Catálogo"
        subtitle="Carta completa con precios por sede, impuestos, alérgenos, modificadores y disponibilidad."
        actions={
          <>
            <Button
              variant="secondary"
              disabled={!puedeExportar || exportar.isPending}
              title={puedeExportar ? undefined : "Requiere permiso de catalogo.exportar"}
              onClick={exportarCatalogo}
            >
              <Download size={15} /> {exportar.isPending ? "Exportando…" : "Exportar"}
            </Button>
            <Button variant="secondary" onClick={() => navigate("/catalogo/importar")}>
              Importar CSV
            </Button>
            <Button
              variant="primary"
              disabled={!puedeEditar}
              title={puedeEditar ? undefined : "Requiere permiso de catalogo.editar"}
              onClick={() => {
                const query = new URLSearchParams(searchParams)
                if (categoriaId) query.set("categoria", categoriaId)
                navigate(`/catalogo/nuevo?${query.toString()}`)
              }}
            >
              <Plus size={16} /> Nuevo producto
            </Button>
          </>
        }
      />

      <FilterBar
        activeFilters={filtrosActivos}
        onClear={filtrosActivos.length > 0 ? limpiarFiltros : undefined}
        actions={
          <Button variant="ghost" className="text-action" onClick={() => navigate("/catalogo/disponibilidad")}>
            Ver disponibilidad
          </Button>
        }
      >
        {esGlobal ? (
          <SelectField
            label="Sede"
            options={[{ value: "", label: "Todas las sedes" }, ...sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))]}
            value={searchParams.get("sede") ?? ""}
            onChange={(event) => actualizar({ sede: event.target.value || undefined })}
          />
        ) : null}
        <TextField
          label="Buscar"
          placeholder="Producto o SKU"
          value={searchParams.get("q") ?? ""}
          onChange={(event) => actualizar({ q: event.target.value || undefined })}
        />
        <SelectField
          label="Etiqueta"
          options={Object.entries(ETIQUETA_LABEL).map(([value, label]) => ({ value, label }))}
          placeholder="Todas"
          value={searchParams.get("etiqueta") ?? ""}
          onChange={(event) => actualizar({ etiqueta: event.target.value || undefined })}
        />
      </FilterBar>

      <div className="saved-views">
        <span className="saved-views__label">Vistas</span>
        {VISTAS.map((vista) => (
          <SavedViewChip
            key={vista.id}
            label={vista.label}
            active={vistaActiva(vista.params, searchParams)}
            onClick={() => {
              const siguiente = new URLSearchParams(vista.params)
              const categoria = searchParams.get("categoria")
              if (categoria) siguiente.set("categoria", categoria)
              setSearchParams(siguiente, { replace: true })
            }}
          />
        ))}
      </div>

      <div className="catalogo-layout">
        {categorias.isLoading ? (
          <aside className="panel cat-tree">
            <div className="skeleton-rows">
              <div className="skeleton-rows__row"><span className="skeleton" style={{ width: "80%", height: 14 }} /></div>
              <div className="skeleton-rows__row"><span className="skeleton" style={{ width: "65%", height: 14 }} /></div>
              <div className="skeleton-rows__row"><span className="skeleton" style={{ width: "72%", height: 14 }} /></div>
            </div>
          </aside>
        ) : categorias.isError ? (
          <aside className="panel cat-tree">
            <div className="state-block state-block--error">
              <strong>No pudimos cargar las categorías</strong>
              <Button variant="secondary" onClick={() => void categorias.refetch()}>Reintentar</Button>
            </div>
          </aside>
        ) : (
          <MenuTree
            categorias={categorias.data ?? []}
            seleccionada={categoriaId ?? null}
            conteos={conteos}
            puedeEditar={puedeEditar}
            onSeleccionar={(categoria) => actualizar({ categoria: categoria ?? undefined })}
            onNueva={(padre) => setDialogo({ abierto: true, categoria: null, padre })}
            onEditar={(categoria) => setDialogo({ abierto: true, categoria, padre: null })}
            onMover={moverCategoria}
            onAlternarActiva={(categoria) =>
              guardarCategoria.mutate({ id: categoria.id, activa: !categoria.activa })
            }
          />
        )}

        <section className="panel">
          <div className="panel__header">
            <div>
              <div className="panel__title">
                {categoriaId ? (categorias.data?.find((item) => item.id === categoriaId)?.nombre ?? "Categoría") : "Toda la carta"}
              </div>
              <div className="panel__subtitle">{total} producto(s) · los cambios no alteran pedidos ya creados (RN-R5-04)</div>
            </div>
          </div>
          <DataTable
            columns={columnas}
            rows={productos.data?.data ?? []}
            getRowKey={(row) => row.id}
            onRowClick={(row) => abrirProducto(row.id)}
            loading={productos.isLoading}
            error={productos.isError ? (productos.error as Error) : null}
            onRetry={() => void productos.refetch()}
            emptyTitle="Sin productos en esta vista"
            emptyDescription="Ajusta la búsqueda, la categoría o limpia los filtros para ver más resultados."
            footer={
              <div className="pedidos-paginacion">
                <span>
                  <Wifi size={13} /> {productos.isFetching ? "Actualizando…" : `Página ${page} de ${totalPaginas}`}
                </span>
                <span className="pedidos-paginacion__controls">
                  <Button variant="ghost" className="text-action" disabled={page <= 1} onClick={() => actualizar({ page: String(page - 1) }, false)}>
                    Anterior
                  </Button>
                  <Button variant="ghost" className="text-action" disabled={page >= totalPaginas} onClick={() => actualizar({ page: String(page + 1) }, false)}>
                    Siguiente
                  </Button>
                </span>
              </div>
            }
          />
        </section>
      </div>

      <CategoriaDialog
        abierto={dialogo.abierto}
        categoria={dialogo.categoria}
        categorias={categorias.data ?? []}
        padreInicial={dialogo.padre}
        guardando={guardarCategoria.isPending}
        onCerrar={() => setDialogo({ abierto: false, categoria: null, padre: null })}
        onGuardar={(payload) => {
          guardarCategoria.mutate(
            { ...payload, id: dialogo.categoria?.id },
            {
              onSuccess: () => {
                mostrar(dialogo.categoria ? "Categoría actualizada." : "Categoría creada.", "exito")
                setDialogo({ abierto: false, categoria: null, padre: null })
              },
              onError: () => mostrar("No se pudo guardar la categoría.", "error"),
            },
          )
        }}
      />

      <ProductForm
        abierto={Boolean(id)}
        producto={id && id !== "nuevo" ? (productoDetalle.data ?? null) : null}
        esNuevo={id === "nuevo"}
        categoriaInicial={searchParams.get("categoria")}
        categorias={categorias.data ?? []}
        estaciones={(estaciones.data ?? []).map((estacion) => ({ id: estacion.id, nombre: estacion.nombre }))}
        sedes={sedes}
        zonaHoraria={zonaHoraria}
        onCerrar={cerrarFicha}
        onGuardado={() => {
          cerrarFicha()
        }}
        onConflicto={() => {
          void productoDetalle.refetch()
        }}
      />

      <ConfirmDialog
        open={agotadoObjetivo !== null}
        title={agotadoObjetivo?.agotado ? "Agotar producto" : "Reactivar producto"}
        description={
          agotadoObjetivo?.agotado
            ? "Dejará de ofrecerse en web, APK y KDS en todas las franjas de la sede activa."
            : "Volverá a ofrecerse en web, APK y KDS en la sede activa."
        }
        impacto={agotadoObjetivo ? `${agotadoObjetivo.producto.nombre} · ${sedes.find((sede) => sede.id === (sedeId ?? sedes[0]?.id))?.nombre ?? "sede"}` : undefined}
        confirmLabel={agotadoObjetivo?.agotado ? "Agotar" : "Reactivar"}
        onCancel={() => setAgotadoObjetivo(null)}
        onConfirm={confirmarAgotado}
      />
    </div>
  )
}
