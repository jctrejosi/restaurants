import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { AlertTriangle, Download, Lock, ShieldCheck } from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { FilterBar, type ActiveFilter } from "@/components/data/FilterBar"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SelectField, TextField } from "@/components/ui/fields"
import { ErrorState } from "@/components/ui/states"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { formatDateTime } from "@/lib/format"
import {
  ACTORES_AUDITORIA,
  ENTIDADES_AUDITORIA,
  SEVERIDADES_AUDITORIA,
  useAuditoria,
  useExportarAuditoria,
  useRetencion,
} from "@/modules/auditoria/api"
import { AuditEventDrawer } from "@/modules/auditoria/components/AuditEventDrawer"
import { RetentionBadge } from "@/modules/auditoria/components/RetentionBadge"
import {
  ACCIONES_CATALOGO,
  ENTIDAD_LABEL,
  rutaEntidad,
  SEVERIDAD_LABEL,
  SEVERIDAD_TONE,
  type AuditoriaFiltros,
  type EntidadAuditoria,
  type EventoAuditoria,
  type Severidad,
} from "@/modules/auditoria/types"

const PAGE_SIZE = 10

const TIPOS_AUDITORIA = [...new Set(ACCIONES_CATALOGO.map((item) => item.tipo))]

/** Bitácora global inmutable con filtros y exportación registrada (RF-R5-130). */
export function AuditExplorer() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { mostrar } = useToast()
  const { tienePermiso } = useAuth()
  const { sedeId, sedes, setSedeId } = useSede()
  const [evento, setEvento] = useState<EventoAuditoria | null>(null)

  const filtros: AuditoriaFiltros = useMemo(
    () => ({
      usuarioId: searchParams.get("usuario") ?? undefined,
      tipo: searchParams.get("tipo") ?? undefined,
      accion: searchParams.get("accion") ?? undefined,
      entidad: searchParams.get("entidad") ?? undefined,
      severidad: searchParams.get("severidad") ?? undefined,
      desde: searchParams.get("desde") ?? undefined,
      hasta: searchParams.get("hasta") ?? undefined,
      texto: searchParams.get("texto") ?? undefined,
    }),
    [searchParams],
  )
  const pagina = Math.max(1, Number(searchParams.get("page")) || 1)

  const { data, isLoading, isError, refetch } = useAuditoria(filtros, { page: pagina, pageSize: PAGE_SIZE }, sedeId, true)
  const { data: retencion } = useRetencion(true)
  const exportar = useExportarAuditoria()
  const puedeExportar = tienePermiso("auditoria.exportar")

  const actualizar = (cambios: Record<string, string | undefined>) => {
    const siguiente = new URLSearchParams(searchParams)
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === undefined || valor === "") siguiente.delete(clave)
      else siguiente.set(clave, valor)
    }
    siguiente.delete("page")
    setSearchParams(siguiente, { replace: true })
  }

  const limpiar = () => setSearchParams(new URLSearchParams(), { replace: true })

  const filtrosActivos: ActiveFilter[] = []
  if (filtros.usuarioId) {
    const actor = ACTORES_AUDITORIA.find((item) => item.id === filtros.usuarioId)
    filtrosActivos.push({ key: "usuario", label: `Actor: ${actor?.nombre ?? filtros.usuarioId}` })
  }
  if (filtros.tipo) filtrosActivos.push({ key: "tipo", label: `Tipo: ${filtros.tipo}` })
  if (filtros.accion) {
    filtrosActivos.push({
      key: "accion",
      label: `Acción: ${ACCIONES_CATALOGO.find((item) => item.accion === filtros.accion)?.label ?? filtros.accion}`,
    })
  }
  if (filtros.entidad) {
    filtrosActivos.push({
      key: "entidad",
      label: `Entidad: ${ENTIDAD_LABEL[filtros.entidad as EntidadAuditoria] ?? filtros.entidad}`,
    })
  }
  if (filtros.severidad) {
    filtrosActivos.push({
      key: "severidad",
      label: `Severidad: ${SEVERIDAD_LABEL[filtros.severidad as Severidad] ?? filtros.severidad}`,
    })
  }
  if (filtros.desde || filtros.hasta) {
    filtrosActivos.push({ key: "rango", label: `${filtros.desde ?? "…"} → ${filtros.hasta ?? "hoy"}` })
  }
  if (filtros.texto) filtrosActivos.push({ key: "texto", label: `Texto: «${filtros.texto}»` })

  const exportarBitacora = () => {
    exportar.mutate(
      { tipo: "auditoria", formato: "xlsx", filtros },
      {
        onSuccess: (respuesta) => {
          if (respuesta.segundoPlano && respuesta.aviso) {
            mostrar(respuesta.aviso, "info")
          } else {
            mostrar(`Exportación ${respuesta.id} registrada y auditada.`, "exito")
          }
        },
        onError: (error) =>
          mostrar(error instanceof Error ? error.message : "No se pudo registrar la exportación", "error"),
      },
    )
  }

  const irATimeline = (entidad: EntidadAuditoria, entidadId: string) => {
    navigate(`/auditoria/${entidad}/${entidadId}`)
  }

  const columnas: Column<EventoAuditoria>[] = [
    {
      key: "quien",
      header: "Quién",
      cell: (row) => (
        <>
          <span className="order-id">{row.usuarioNombre}</span>
          <span className="order-type">{row.usuarioRol}</span>
        </>
      ),
    },
    {
      key: "que",
      header: "Qué",
      cell: (row) => (
        <>
          <span className="audit-accion">{row.accionLabel}</span>
          <span className="order-type">
            <code>{row.accion}</code>
          </span>
        </>
      ),
    },
    {
      key: "cuando",
      header: "Cuándo",
      cell: (row) => (
        <>
          <span>{formatDateTime(row.creadoEn)}</span>
          <span className="order-type">hora del servidor</span>
        </>
      ),
    },
    {
      key: "donde",
      header: "Dónde",
      cell: (row) => (
        <>
          <span>{row.sedeNombre}</span>
          <span className="order-type">
            {row.canal}
            {row.dispositivoId ? ` · ${row.dispositivoId}` : ""}
          </span>
        </>
      ),
    },
    {
      key: "porque",
      header: "Por qué",
      cell: (row) => row.motivo ?? <span className="audit-detail__missing">—</span>,
    },
    {
      key: "severidad",
      header: "Severidad",
      cell: (row) => <StatusBadge tone={SEVERIDAD_TONE[row.severidad]}>{SEVERIDAD_LABEL[row.severidad]}</StatusBadge>,
    },
    {
      key: "entidad",
      header: "Entidad",
      cell: (row) => (
        <>
          <span>{row.entidadLabel}</span>
          <span className="order-type">
            {ENTIDAD_LABEL[row.entidad]} · <code>{row.entidadId}</code>
          </span>
        </>
      ),
    },
  ]

  const total = data?.total ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangoInvalido =
    retencion !== undefined && filtros.desde !== undefined && filtros.desde < (retencion.purgadoAntesDe ?? "")

  return (
    <div className="audit-stack">
      {retencion ? <RetentionBadge retencion={retencion} /> : null}

      <FilterBar
        activeFilters={filtrosActivos}
        onClear={limpiar}
        actions={
          puedeExportar ? (
            <Button variant="secondary" disabled={exportar.isPending} onClick={exportarBitacora}>
              <Download size={15} /> {exportar.isPending ? "Registrando…" : "Exportar bitácora"}
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled
              title="Requiere permiso auditoria.exportar"
              aria-disabled="true"
            >
              <Download size={15} /> Exportar bitácora
            </Button>
          )
        }
      >
        <SelectField
          label="Sede"
          value={sedeId ?? ""}
          onChange={(event) => setSedeId(event.target.value || null)}
          options={[{ value: "", label: "Todas las sedes" }, ...sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))]}
        />
        <SelectField
          label="Actor"
          placeholder="Todos"
          value={filtros.usuarioId ?? ""}
          onChange={(event) => actualizar({ usuario: event.target.value || undefined })}
          options={ACTORES_AUDITORIA.map((actor) => ({ value: actor.id, label: `${actor.nombre} · ${actor.rol}` }))}
        />
        <SelectField
          label="Tipo"
          placeholder="Todos"
          value={filtros.tipo ?? ""}
          onChange={(event) => actualizar({ tipo: event.target.value || undefined })}
          options={TIPOS_AUDITORIA.map((tipo) => ({ value: tipo, label: tipo }))}
        />
        <SelectField
          label="Acción"
          placeholder="Todas"
          value={filtros.accion ?? ""}
          onChange={(event) => actualizar({ accion: event.target.value || undefined })}
          options={ACCIONES_CATALOGO.map((item) => ({ value: item.accion, label: item.label }))}
        />
        <SelectField
          label="Entidad"
          placeholder="Todas"
          value={filtros.entidad ?? ""}
          onChange={(event) => actualizar({ entidad: event.target.value || undefined })}
          options={ENTIDADES_AUDITORIA.map((entidad) => ({ value: entidad, label: ENTIDAD_LABEL[entidad] }))}
        />
        <SelectField
          label="Severidad"
          placeholder="Todas"
          value={filtros.severidad ?? ""}
          onChange={(event) => actualizar({ severidad: event.target.value || undefined })}
          options={SEVERIDADES_AUDITORIA.map((severidad) => ({
            value: severidad,
            label: SEVERIDAD_LABEL[severidad],
          }))}
        />
        <TextField
          label="Desde"
          type="date"
          value={filtros.desde ?? ""}
          onChange={(event) => actualizar({ desde: event.target.value || undefined })}
        />
        <TextField
          label="Hasta"
          type="date"
          value={filtros.hasta ?? ""}
          onChange={(event) => actualizar({ hasta: event.target.value || undefined })}
        />
        <TextField
          label="Texto"
          placeholder="Folio, motivo, acción…"
          value={filtros.texto ?? ""}
          onChange={(event) => actualizar({ texto: event.target.value || undefined })}
        />
      </FilterBar>

      {rangoInvalido ? (
        <p className="audit-warning">
          <AlertTriangle size={14} /> El rango pedido es anterior a la retención: los datos previos a{" "}
          {retencion?.purgadoAntesDe} se purgaron según la retención de {retencion?.meses} meses.
        </p>
      ) : null}

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Bitácora global</div>
            <div className="panel__subtitle">
              {data
                ? `${data.resumen.total} eventos · ${data.resumen.criticos} críticos · ${data.resumen.altos} altos · ${data.resumen.actores} actores`
                : "Quién, qué, cuándo, dónde y por qué (RN-R5-01)"}
            </div>
          </div>
          <span className="audit-immutable">
            <Lock size={13} /> Solo lectura
          </span>
        </div>

        {isError ? (
          <ErrorState title="No pudimos consultar la bitácora" onRetry={() => void refetch()} />
        ) : (
          <DataTable
            columns={columnas}
            rows={data?.data ?? []}
            getRowKey={(row) => row.id}
            loading={isLoading || !data}
            onRowClick={(row) => setEvento(row)}
            emptyTitle="Sin eventos en el rango"
            emptyDescription="La bitácora es inmutable y solo crece: cambia los filtros o amplía el rango de fechas."
            footer={
              total > 0 ? (
                <div className="audit-pagination">
                  <span>
                    {(pagina - 1) * PAGE_SIZE + 1}–{Math.min(pagina * PAGE_SIZE, total)} de {total}
                  </span>
                  <span className="audit-pagination__actions">
                    <Button
                      variant="secondary"
                      disabled={pagina <= 1}
                      onClick={() => actualizar({ page: String(pagina - 1) })}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={pagina >= totalPaginas}
                      onClick={() => actualizar({ page: String(pagina + 1) })}
                    >
                      Siguiente
                    </Button>
                  </span>
                </div>
              ) : null
            }
          />
        )}
      </section>

      <div className="module-notice" role="note">
        <ShieldCheck size={18} aria-hidden="true" />
        <span>
          <strong>Auditoría inmutable (RN-R5-02).</strong> Los eventos se guardan en una tabla particionada de solo
          inserción; nadie edita ni borra desde la UI y la API responde 405 a cualquier intento de mutación. La
          exportación también queda auditada (RN-R5-10).
        </span>
      </div>

      <AuditEventDrawer
        evento={evento}
        onClose={() => setEvento(null)}
        onVerEntidad={(entidad, entidadId) => {
          const ruta = rutaEntidad(entidad, entidadId)
          if (ruta) navigate(ruta)
        }}
        onVerBitacora={irATimeline}
      />
    </div>
  )
}
