import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { CircleDollarSign, Plus } from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { FilterBar } from "@/components/data/FilterBar"
import { MoneyCell } from "@/components/data/cells"
import { Tabs } from "@/components/data/Tabs"
import { PageHeader } from "@/components/data/PageHeader"
import { Button } from "@/components/ui/Button"
import { SelectField, TextField } from "@/components/ui/fields"
import { formatDateTime, formatMoney } from "@/lib/format"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { useTurnos } from "@/modules/caja/api"
import { TURNO_ESTADO_LABEL, type TurnoFiltros, type TurnoLite } from "@/modules/caja/types"
import { semaforoDiferencia } from "@/modules/caja/utils"
import { AbrirTurnoDialog } from "@/modules/caja/components/AbrirTurnoDialog"
import { ConsolidadoTab } from "@/modules/caja/components/ConsolidadoTab"
import { MediosPagoTab } from "@/modules/caja/components/MediosPagoTab"

const PAGE_SIZE = 10

/** `/caja` — lista de turnos, consolidado del día y configuración de medios. */
export function CajaLista() {
  const { tienePermiso } = useAuth()
  const { moneda, zonaHoraria } = useSede()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [abrirOpen, setAbrirOpen] = useState(false)

  const vista = searchParams.get("vista") ?? "turnos"
  const estado = searchParams.get("estado") ?? ""
  const desde = searchParams.get("desde") ?? ""
  const hasta = searchParams.get("hasta") ?? ""
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))

  const filtros: TurnoFiltros = {
    estado: estado || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
    page,
    pageSize: PAGE_SIZE,
    orden: "abierto_en_desc",
  }

  const { data, isLoading, isError, error, refetch } = useTurnos(filtros)

  const actualizar = (clave: string, valor: string) => {
    const siguiente = new URLSearchParams(searchParams)
    if (valor) siguiente.set(clave, valor)
    else siguiente.delete(clave)
    if (clave !== "page") siguiente.delete("page")
    setSearchParams(siguiente, { replace: true })
  }

  const limpiar = () => {
    const siguiente = new URLSearchParams(searchParams)
    siguiente.delete("estado")
    siguiente.delete("desde")
    siguiente.delete("hasta")
    siguiente.delete("page")
    setSearchParams(siguiente, { replace: true })
  }

  const columnas: Column<TurnoLite>[] = [
    {
      key: "numero",
      header: "Turno",
      cell: (turno) => <span className="order-id">{turno.numero}</span>,
    },
    {
      key: "horas",
      header: "Apertura / cierre",
      cell: (turno) => (
        <div>
          <div>{formatDateTime(turno.abiertoEn, zonaHoraria)}</div>
          <div className="caja-medio__meta">
            {turno.cerradoEn ? formatDateTime(turno.cerradoEn, zonaHoraria) : "En curso"}
          </div>
        </div>
      ),
    },
    {
      key: "usuarios",
      header: "Apertura / cierre",
      cell: (turno) => (
        <div>
          <div>{turno.usuarioApertura}</div>
          <div className="caja-medio__meta">{turno.usuarioCierre ?? "—"}</div>
        </div>
      ),
    },
    {
      key: "ventas",
      header: "Ventas",
      align: "right",
      cell: (turno) => <MoneyCell centavos={turno.ventasCentavos} moneda={moneda} />,
    },
    {
      key: "propinas",
      header: "Propinas",
      align: "right",
      cell: (turno) => <MoneyCell centavos={turno.propinasCentavos} moneda={moneda} />,
    },
    {
      key: "contado",
      header: "Contado",
      align: "right",
      cell: (turno) =>
        turno.contadoCentavos === null ? (
          <span className="caja-muted">—</span>
        ) : (
          <MoneyCell centavos={turno.contadoCentavos} moneda={moneda} />
        ),
    },
    {
      key: "diferencia",
      header: "Diferencia",
      align: "right",
      cell: (turno) =>
        turno.diferenciaCentavos === null ? (
          <span className="caja-muted">Sin arquear</span>
        ) : (
          <span className={`caja-diferencia caja-diferencia--${semaforoDiferencia(turno.diferenciaCentavos)}`}>
            {formatMoney(turno.diferenciaCentavos, moneda)}
          </span>
        ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (turno) => (
        <span className={`status status--${turno.estadoTone}`}>{TURNO_ESTADO_LABEL[turno.estado]}</span>
      ),
    },
  ]

  const total = data?.total ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const turnoAbierto = data?.turnoAbierto ?? null
  const puedeAbrir = tienePermiso("caja.abrir")
  const filtrosActivos: { key: string; label: string }[] = []
  if (estado) filtrosActivos.push({ key: "estado", label: TURNO_ESTADO_LABEL[estado as "abierto" | "cerrado"] ?? estado })
  if (desde) filtrosActivos.push({ key: "desde", label: `Desde ${desde}` })
  if (hasta) filtrosActivos.push({ key: "hasta", label: `Hasta ${hasta}` })

  return (
    <div className="module-page">
      <PageHeader
        eyebrow="Dinero / Caja"
        title="Caja y turnos"
        subtitle="Turnos, arqueo, cierre con diferencias explicadas, reapertura auditada y reportes."
        actions={
          <Button
            variant="primary"
            disabled={!puedeAbrir || Boolean(turnoAbierto)}
            title={
              !puedeAbrir
                ? "Requiere permiso de caja.abrir"
                : turnoAbierto
                  ? `Ya hay un turno abierto (${turnoAbierto.numero}); ciérralo antes de abrir otro`
                  : undefined
            }
            onClick={() => setAbrirOpen(true)}
          >
            <Plus size={16} /> Abrir turno
          </Button>
        }
      />

      <Tabs
        tabs={[
          { id: "turnos", label: "Turnos" },
          { id: "consolidado", label: "Consolidado del día" },
          { id: "medios", label: "Medios de pago" },
        ]}
        value={vista}
        onChange={(id) => actualizar("vista", id)}
      />

      {vista === "consolidado" ? (
        <ConsolidadoTab puedeExportar={tienePermiso("caja.exportar")} />
      ) : vista === "medios" ? (
        <MediosPagoTab puedeEditar={tienePermiso("caja.medios")} />
      ) : (
        <>
          {turnoAbierto ? (
            <div className="caja-alerta caja-alerta--info">
              <CircleDollarSign size={17} aria-hidden="true" />
              <div>
                <strong>
                  Turno {turnoAbierto.numero} abierto desde {formatDateTime(turnoAbierto.abiertoEn, zonaHoraria)}
                </strong>
                <span>
                  Solo puede existir un turno abierto por sede.{" "}
                  <Link className="text-action" to={`/caja/${turnoAbierto.id}`}>
                    Abrir panel del turno
                  </Link>
                </span>
              </div>
            </div>
          ) : null}

          <FilterBar activeFilters={filtrosActivos} onClear={filtrosActivos.length > 0 ? limpiar : undefined}>
            <SelectField
              label="Estado"
              placeholder="Todos"
              value={estado}
              onChange={(event) => actualizar("estado", event.target.value)}
              options={[
                { value: "abierto", label: "Abierto" },
                { value: "cerrado", label: "Cerrado" },
              ]}
            />
            <TextField
              label="Desde"
              type="date"
              value={desde}
              onChange={(event) => actualizar("desde", event.target.value)}
            />
            <TextField
              label="Hasta"
              type="date"
              value={hasta}
              onChange={(event) => actualizar("hasta", event.target.value)}
            />
          </FilterBar>

          <section className="panel">
            <DataTable
              columns={columnas}
              rows={data?.data ?? []}
              getRowKey={(turno) => turno.id}
              onRowClick={(turno) => navigate(`/caja/${turno.id}`)}
              loading={isLoading}
              error={isError ? (error as Error) : null}
              onRetry={() => void refetch()}
              emptyTitle="Aún no hay turnos en este rango"
              emptyDescription="Abre un turno con su base inicial o ajusta los filtros de fecha."
              footer={
                <div className="caja-paginacion">
                  <span>{total} turnos</span>
                  <span className="caja-paginacion__controles">
                    <Button
                      variant="ghost"
                      className="text-action"
                      disabled={page <= 1}
                      onClick={() => actualizar("page", String(page - 1))}
                    >
                      Anterior
                    </Button>
                    <span>
                      Página {data?.page ?? page} de {totalPaginas}
                    </span>
                    <Button
                      variant="ghost"
                      className="text-action"
                      disabled={page >= totalPaginas}
                      onClick={() => actualizar("page", String(page + 1))}
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

      <AbrirTurnoDialog
        open={abrirOpen}
        moneda={moneda}
        onCancel={() => setAbrirOpen(false)}
        onAbierto={(turnoId) => {
          setAbrirOpen(false)
          navigate(`/caja/${turnoId}`)
        }}
      />
    </div>
  )
}
