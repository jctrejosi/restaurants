/**
 * Promociones (plan 08): pestañas en la URL
 * `?tab=promociones|cupones|newsletter|resenas|metricas`. Lo vencido se marca y
 * no se publica; un cupón agotado no aplica y se explica por qué.
 */

import { useState } from "react"
import { Ban, Check, Download, Plus, Shuffle } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { PageHeader } from "@/components/data/PageHeader"
import { DataTable, type Column } from "@/components/data/DataTable"
import { FilterBar, type ActiveFilter } from "@/components/data/FilterBar"
import { SavedViewChip } from "@/components/data/SavedViewChip"
import { Tabs, type TabItem } from "@/components/data/Tabs"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Drawer } from "@/components/ui/Drawer"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { NoPermissionState } from "@/components/ui/states"
import { SelectField, TextField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { formatDateTime } from "@/lib/format"
import { useSocketEvent } from "@/lib/realtime"
import {
  estadoPromocion,
  motivoNoAplica,
  useAnularCupon,
  useCupones,
  usePromociones,
  usePublicarPromocion,
} from "@/modules/promociones/api"
import { PromotionForm } from "@/modules/promociones/components/PromotionForm"
import { CouponForm, UsageBar } from "@/modules/promociones/components/CouponForm"
import { NewsletterPanel } from "@/modules/promociones/components/NewsletterPanel"
import { ReviewModeration } from "@/modules/promociones/components/ReviewModeration"
import { UtmBoard } from "@/modules/promociones/components/UtmBoard"
import {
  CUPON_TIPO_LABEL,
  PROMOCION_ESTADO_LABEL,
  PROMOCION_ESTADO_TONE,
  PROMOCION_TIPO_LABEL,
  type Cupon,
  type CuponesFiltros,
  type Promocion,
  type PromocionTipo,
  type PromocionesFiltros,
} from "@/modules/promociones/types"
import "@/modules/promociones/promociones.css"

type Pestana = "promociones" | "cupones" | "newsletter" | "resenas" | "metricas"

const VISTAS: { id: string; label: string; estado: string }[] = [
  { id: "vigentes", label: "Vigentes", estado: "vigente" },
  { id: "programadas", label: "Programadas", estado: "programada" },
  { id: "vencidas", label: "Vencidas", estado: "vencida" },
  { id: "pausadas", label: "Pausadas", estado: "pausada" },
]

export default function PromocionesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { mostrar } = useToast()
  const { tienePermiso } = useAuth()
  const { sedes, zonaHoraria } = useSede()

  const tab = (searchParams.get("tab") as Pestana | null) ?? "promociones"
  const [promocionForm, setPromocionForm] = useState<Promocion | null | undefined>(undefined)
  const [cuponForm, setCuponForm] = useState<Cupon | null | undefined>(undefined)
  const [cuponDetalle, setCuponDetalle] = useState<Cupon | null>(null)
  const [cambioEstado, setCambioEstado] = useState<{ promocion: Promocion; accion: "publicar" | "pausar" } | null>(null)
  const [anularCupon, setAnularCupon] = useState<Cupon | null>(null)

  const puedeVer = tienePermiso("promociones.ver")
  const puedeEditar = tienePermiso("promociones.editar")
  const puedePublicar = tienePermiso("promociones.publicar")
  const puedeCupones = tienePermiso("cupones.ver")
  const puedeEditarCupones = tienePermiso("cupones.editar")
  const puedeNewsletter = tienePermiso("newsletter.ver")
  const puedeResenas = tienePermiso("resenas.moderar")
  const puedeMetricas = tienePermiso("metricas.ver")

  const estadoFiltro = searchParams.get("estado") ?? undefined
  const tipoFiltro = (searchParams.get("tipo") as PromocionTipo | null) ?? undefined
  const busqueda = searchParams.get("q") ?? undefined

  const promociones = usePromociones({ estado: (searchParams.get("estado") as PromocionesFiltros["estado"]) ?? undefined, tipo: tipoFiltro, q: busqueda })
  const publicar = usePublicarPromocion()
  const cupones = useCupones({
    estado: (searchParams.get("cuponEstado") as CuponesFiltros["estado"]) ?? undefined,
    q: searchParams.get("cuponQ") ?? undefined,
  })
  const anular = useAnularCupon()

  useSocketEvent(["promocion.actualizada", "cupon.agotado", "resena.creada", "newsletter.envio"], () => {
    void queryClient.invalidateQueries({ queryKey: ["promociones"] })
  })

  if (!puedeVer) {
    return (
      <div className="module-page">
        <PageHeader eyebrow="Negocio / Promociones" title="Promociones" />
        <NoPermissionState permiso="promociones.ver" />
      </div>
    )
  }

  const cambiarTab = (siguiente: string) => {
    const params = new URLSearchParams(searchParams)
    params.set("tab", siguiente)
    setSearchParams(params, { replace: true })
  }

  const actualizar = (claves: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams)
    for (const [clave, valor] of Object.entries(claves)) {
      if (!valor) params.delete(clave)
      else params.set(clave, valor)
    }
    setSearchParams(params, { replace: true })
  }

  const tabs: TabItem[] = [
    { id: "promociones", label: "Promociones y banners" },
    ...(puedeCupones ? [{ id: "cupones", label: "Cupones" }] : []),
    ...(puedeNewsletter ? [{ id: "newsletter", label: "Newsletter" }] : []),
    ...(puedeResenas || puedeVer ? [{ id: "resenas", label: "Reseñas y encuestas" }] : []),
    ...(puedeMetricas ? [{ id: "metricas", label: "Métricas UTM" }] : []),
  ]

  const filtrosActivos: ActiveFilter[] = []
  if (estadoFiltro) filtrosActivos.push({ key: "estado", label: `Estado: ${PROMOCION_ESTADO_LABEL[estadoFiltro as keyof typeof PROMOCION_ESTADO_LABEL]}` })
  if (tipoFiltro) filtrosActivos.push({ key: "tipo", label: `Tipo: ${PROMOCION_TIPO_LABEL[tipoFiltro]}` })
  if (busqueda) filtrosActivos.push({ key: "q", label: `Búsqueda: «${busqueda}»` })

  const columnasPromociones: Column<Promocion>[] = [
    {
      key: "titulo",
      header: "Promoción",
      cell: (row) => (
        <>
          <span className="order-id">{row.titulo}</span>
          <span className="order-type">{PROMOCION_TIPO_LABEL[row.tipo]}</span>
        </>
      ),
    },
    {
      key: "sede",
      header: "Sede",
      cell: (row) => (row.sucursalId ? (sedes.find((sede) => sede.id === row.sucursalId)?.nombre ?? row.sucursalId) : "Todas las sedes"),
    },
    {
      key: "vigencia",
      header: "Vigencia",
      cell: (row) => (
        <>
          <span>{formatDateTime(row.desde, zonaHoraria)}</span>
          <span className="order-type">→ {formatDateTime(row.hasta, zonaHoraria)}</span>
        </>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (row) => {
        const estado = estadoPromocion(row)
        return (
          <StatusBadge tone={PROMOCION_ESTADO_TONE[estado]} title={estado === "vencida" ? "Lo vencido no se publica; duplica para reutilizar" : undefined}>
            {PROMOCION_ESTADO_LABEL[estado]}
          </StatusBadge>
        )
      },
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      cell: (row) => {
        const estado = estadoPromocion(row)
        return (
          <span className="promo-acciones" onClick={(event) => event.stopPropagation()}>
            <Button variant="ghost" className="text-action" disabled={!puedeEditar} onClick={() => setPromocionForm(row)}>
              Editar
            </Button>
            <Button
              variant="ghost"
              className="text-action"
              disabled={!puedeEditar}
              title="Duplicar para reutilizar"
              onClick={() => setPromocionForm({ ...row, id: "", publicada: false })}
            >
              <Shuffle size={14} /> Duplicar
            </Button>
            {estado === "vencida" ? (
              <Button
                variant="ghost"
                className="text-action"
                disabled
                title="Una promoción vencida no se publica; duplícala para reutilizarla."
              >
                <Ban size={14} /> Vencida
              </Button>
            ) : (
              <Button
                variant="ghost"
                className="text-action"
                disabled={!puedePublicar}
                title={puedePublicar ? undefined : "Requiere permiso de promociones.publicar"}
                onClick={() => setCambioEstado({ promocion: row, accion: row.publicada ? "pausar" : "publicar" })}
              >
                {row.publicada ? <Ban size={14} /> : <Check size={14} />} {row.publicada ? "Pausar" : "Publicar"}
              </Button>
            )}
          </span>
        )
      },
    },
  ]

  const columnasCupones: Column<Cupon>[] = [
    {
      key: "codigo",
      header: "Cupón",
      cell: (row) => (
        <>
          <span className="order-id">{row.codigo}</span>
          <span className="order-type">
            {row.tipo === "porcentaje" ? `${row.valor / 100}% de descuento` : `$${(row.valor / 100).toFixed(2)} MXN`}
          </span>
        </>
      ),
    },
    {
      key: "sede",
      header: "Sede",
      cell: (row) => (row.sucursalId ? (sedes.find((sede) => sede.id === row.sucursalId)?.nombre ?? row.sucursalId) : "Todas las sedes"),
    },
    {
      key: "vigencia",
      header: "Vigencia",
      cell: (row) => (
        <>
          <span>{formatDateTime(row.desde, zonaHoraria)}</span>
          <span className="order-type">→ {formatDateTime(row.hasta, zonaHoraria)}</span>
        </>
      ),
    },
    { key: "usos", header: "Usos", cell: (row) => <UsageBar usos={row.usos} maximo={row.usosMaximo} /> },
    {
      key: "reglas",
      header: "Control de abuso",
      cell: (row) => `Máx. ${row.maximoPorCliente} por cliente`,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (row) => {
        const motivo = motivoNoAplica(row)
        return motivo ? (
          <StatusBadge tone="amber" title={motivo}>
            no aplica
          </StatusBadge>
        ) : (
          <StatusBadge tone="green">aplica</StatusBadge>
        )
      },
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      cell: (row) => (
        <span className="promo-acciones" onClick={(event) => event.stopPropagation()}>
          <Button variant="ghost" className="text-action" disabled={!puedeEditarCupones} onClick={() => setCuponForm(row)}>
            Editar
          </Button>
          <Button
            variant="ghost"
            className="text-action"
            disabled={!puedeEditarCupones}
            title={puedeEditarCupones ? undefined : "Requiere permiso de cupones.editar"}
            onClick={() => setAnularCupon(row)}
          >
            <Ban size={14} /> Anular
          </Button>
        </span>
      ),
    },
  ]

  return (
    <div className="module-page">
      <PageHeader
        eyebrow="Negocio / Promociones"
        title="Promociones"
        subtitle="Banners y promociones con vigencia y sede, cupones con usos máximos, newsletter consentido, reseñas moderadas y UTM."
        actions={
          tab === "promociones" ? (
            <Button
              variant="primary"
              disabled={!puedeEditar}
              title={puedeEditar ? undefined : "Requiere permiso de promociones.editar"}
              onClick={() => setPromocionForm(null)}
            >
              <Plus size={16} /> Nueva promoción
            </Button>
          ) : tab === "cupones" ? (
            <Button
              variant="primary"
              disabled={!puedeEditarCupones}
              title={puedeEditarCupones ? undefined : "Requiere permiso de cupones.editar"}
              onClick={() => setCuponForm(null)}
            >
              <Plus size={16} /> Nuevo cupón
            </Button>
          ) : null
        }
      />

      <Tabs tabs={tabs} value={tab} onChange={cambiarTab} />

      {tab === "promociones" ? (
        <>
          <FilterBar
            activeFilters={filtrosActivos}
            onClear={() => setSearchParams(new URLSearchParams(), { replace: true })}
          >
            <TextField
              label="Buscar"
              placeholder="Título"
              value={searchParams.get("q") ?? ""}
              onChange={(event) => actualizar({ q: event.target.value || undefined })}
            />
            <SelectField
              label="Tipo"
              options={Object.entries(PROMOCION_TIPO_LABEL).map(([value, label]) => ({ value, label }))}
              placeholder="Todos"
              value={searchParams.get("tipo") ?? ""}
              onChange={(event) => actualizar({ tipo: event.target.value || undefined })}
            />
            <SelectField
              label="Estado"
              options={Object.entries(PROMOCION_ESTADO_LABEL).map(([value, label]) => ({ value, label }))}
              placeholder="Todos"
              value={searchParams.get("estado") ?? ""}
              onChange={(event) => actualizar({ estado: event.target.value || undefined })}
            />
          </FilterBar>

          <div className="saved-views">
            <span className="saved-views__label">Vistas</span>
            {VISTAS.map((vista) => (
              <SavedViewChip
                key={vista.id}
                label={vista.label}
                active={searchParams.get("estado") === vista.estado}
                onClick={() => actualizar({ estado: searchParams.get("estado") === vista.estado ? undefined : vista.estado })}
              />
            ))}
          </div>

          <section className="panel">
            <DataTable
              columns={columnasPromociones}
              rows={promociones.data?.data ?? []}
              getRowKey={(row) => row.id}
              loading={promociones.isLoading}
              error={promociones.isError ? (promociones.error as Error) : null}
              onRetry={() => void promociones.refetch()}
              emptyTitle="Sin promociones en esta vista"
              emptyDescription="Crea una promoción o ajusta los filtros; las vencidas siguen visibles pero no se publican."
              footer={
                <div className="pedidos-paginacion">
                  <span>
                    <Download size={13} /> {promociones.data?.total ?? 0} promociones · lo vencido no se publica
                  </span>
                </div>
              }
            />
          </section>
        </>
      ) : null}

      {tab === "cupones" ? (
        puedeCupones ? (
          <>
            <FilterBar
              activeFilters={searchParams.get("cuponEstado") ? [{ key: "cuponEstado", label: "Filtro de cupones" }] : []}
              onClear={() => actualizar({ cuponEstado: undefined, cuponQ: undefined })}
            >
              <TextField
                label="Buscar"
                placeholder="Código"
                value={searchParams.get("cuponQ") ?? ""}
                onChange={(event) => actualizar({ cuponQ: event.target.value || undefined })}
              />
              <SelectField
                label="Aplicabilidad"
                options={[
                  { value: "activo", label: "Aplican" },
                  { value: "agotado", label: "Agotados" },
                  { value: "no_aplica", label: "No aplican" },
                ]}
                placeholder="Todos"
                value={searchParams.get("cuponEstado") ?? ""}
                onChange={(event) => actualizar({ cuponEstado: event.target.value || undefined })}
              />
            </FilterBar>
            <section className="panel">
              <DataTable
                columns={columnasCupones}
                rows={cupones.data?.data ?? []}
                getRowKey={(row) => row.id}
                onRowClick={(row) => setCuponDetalle(row)}
                loading={cupones.isLoading}
                error={cupones.isError ? (cupones.error as Error) : null}
                onRetry={() => void cupones.refetch()}
                emptyTitle="Sin cupones en esta vista"
                emptyDescription="Crea un cupón con usos máximos y control de abuso por cliente."
              />
            </section>
          </>
        ) : (
          <NoPermissionState permiso="cupones.ver" />
        )
      ) : null}

      {tab === "newsletter" ? (
        puedeNewsletter ? <NewsletterPanel /> : <NoPermissionState permiso="newsletter.ver" />
      ) : null}

      {tab === "resenas" ? <ReviewModeration /> : null}

      {tab === "metricas" ? (
        puedeMetricas ? <UtmBoard /> : <NoPermissionState permiso="metricas.ver" />
      ) : null}

      <PromotionForm
        abierto={promocionForm !== undefined}
        promocion={promocionForm ?? null}
        onCerrar={() => setPromocionForm(undefined)}
        onGuardado={(mensaje) => {
          mostrar(mensaje, "exito")
          setPromocionForm(undefined)
        }}
      />

      <CouponForm
        abierto={cuponForm !== undefined}
        cupon={cuponForm ?? null}
        onCerrar={() => setCuponForm(undefined)}
        onGuardado={(mensaje) => {
          mostrar(mensaje, "exito")
          setCuponForm(undefined)
        }}
      />

      <Drawer
        open={cuponDetalle !== null}
        onClose={() => setCuponDetalle(null)}
        title={cuponDetalle ? `Cupón ${cuponDetalle.codigo}` : "Cupón"}
        subtitle="Detalle de reglas, consumo y aplicabilidad"
        width={520}
      >
        {cuponDetalle ? (
          <div className="promo-cupon-detalle">
            {motivoNoAplica(cuponDetalle) ? (
              <div className="notice notice--warn">
                <strong>Este cupón no aplica:</strong>
                <span>{motivoNoAplica(cuponDetalle)}.</span>
              </div>
            ) : (
              <div className="notice notice--ok">
                <strong>Aplica:</strong>
                <span>Quedan {cuponDetalle.usosMaximo - cuponDetalle.usos} uso(s) disponibles.</span>
              </div>
            )}
            <UsageBar usos={cuponDetalle.usos} maximo={cuponDetalle.usosMaximo} />
            <dl className="promo-detalle-lista">
              <div>
                <dt>Tipo</dt>
                <dd>
                  {CUPON_TIPO_LABEL[cuponDetalle.tipo]} ·{" "}
                  {cuponDetalle.tipo === "porcentaje" ? `${cuponDetalle.valor / 100}%` : `$${(cuponDetalle.valor / 100).toFixed(2)} MXN`}
                </dd>
              </div>
              <div>
                <dt>Vigencia</dt>
                <dd>
                  {formatDateTime(cuponDetalle.desde, zonaHoraria)} → {formatDateTime(cuponDetalle.hasta, zonaHoraria)}
                </dd>
              </div>
              <div>
                <dt>Sede</dt>
                <dd>
                  {cuponDetalle.sucursalId
                    ? (sedes.find((sede) => sede.id === cuponDetalle.sucursalId)?.nombre ?? cuponDetalle.sucursalId)
                    : "Todas las sedes"}
                </dd>
              </div>
              <div>
                <dt>Control de abuso</dt>
                <dd>Máximo {cuponDetalle.maximoPorCliente} canje(s) por cliente</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{cuponDetalle.activo ? "Activo" : "Pausado"}</dd>
              </div>
              <div>
                <dt>Última edición</dt>
                <dd>
                  {cuponDetalle.actualizadoPor} · {formatDateTime(cuponDetalle.actualizadoEn, zonaHoraria)}
                </dd>
              </div>
            </dl>
            <Button
              variant="secondary"
              disabled={!puedeEditarCupones}
              onClick={() => {
                setCuponForm(cuponDetalle)
                setCuponDetalle(null)
              }}
            >
              Editar cupón
            </Button>
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={cambioEstado !== null}
        title={cambioEstado?.accion === "publicar" ? "Publicar promoción" : "Pausar promoción"}
        description={
          cambioEstado?.accion === "publicar"
            ? "Se publicará en la carta digital y el APK según su vigencia y sede."
            : "Dejará de mostrarse en todos los canales hasta que se vuelva a publicar."
        }
        impacto={cambioEstado?.promocion.titulo}
        confirmLabel={cambioEstado?.accion === "publicar" ? "Publicar" : "Pausar"}
        onCancel={() => setCambioEstado(null)}
        onConfirm={(motivo) => {
          if (!cambioEstado) return
          publicar.mutate(
            { id: cambioEstado.promocion.id, accion: cambioEstado.accion, motivo },
            {
              onSuccess: () => {
                mostrar(
                  cambioEstado.accion === "publicar"
                    ? "Promoción publicada; cambio auditado."
                    : "Promoción pausada; cambio auditado.",
                  "exito",
                )
                setCambioEstado(null)
              },
              onError: (error) => mostrar(error instanceof Error ? error.message : "No se pudo cambiar el estado.", "error"),
            },
          )
        }}
      />

      <ConfirmDialog
        open={anularCupon !== null}
        title="Anular cupón"
        description="El cupón dejará de aplicar de inmediato en tienda y APK."
        impacto={anularCupon ? `${anularCupon.codigo} · usos ${anularCupon.usos} de ${anularCupon.usosMaximo}` : undefined}
        confirmLabel="Anular cupón"
        onCancel={() => setAnularCupon(null)}
        onConfirm={(motivo) => {
          if (!anularCupon) return
          anular.mutate(
            { id: anularCupon.id, motivo },
            {
              onSuccess: () => {
                mostrar("Cupón anulado; la decisión quedó auditada.", "exito")
                setAnularCupon(null)
              },
              onError: () => mostrar("No se pudo anular el cupón.", "error"),
            },
          )
        }}
      />
    </div>
  )
}
