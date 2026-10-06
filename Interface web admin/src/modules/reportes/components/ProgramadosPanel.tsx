import { useState } from "react"
import { History, Mail, Pause, Play, Plus } from "lucide-react"
import { DataTable, type Column } from "@/components/data/DataTable"
import { Button } from "@/components/ui/Button"
import { Drawer } from "@/components/ui/Drawer"
import { IconButton } from "@/components/ui/IconButton"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SelectField, TextField } from "@/components/ui/fields"
import { ErrorState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { useToast } from "@/components/ui/toast"
import { formatDateTime, formatRelative } from "@/lib/format"
import {
  useActualizarProgramado,
  useCrearProgramado,
  useEjecutarProgramado,
  useProgramadosReporte,
} from "@/modules/reportes/api"
import {
  ENTREGA_LABEL,
  ENTREGA_TONE,
  FORMATO_LABEL,
  METRICA_LABEL,
  PERIODICIDAD_LABEL,
  type FormatoReporte,
  type Periodicidad,
  type ReporteProgramado,
} from "@/modules/reportes/types"

type FormProgramado = {
  nombre: string
  metrica: string
  periodicidad: Periodicidad
  formato: FormatoReporte
  destinatarios: string
  periodo: string
  motivo: string
}

const FORM_INICIAL: FormProgramado = {
  nombre: "",
  metrica: "ventas",
  periodicidad: "diario",
  formato: "xlsx",
  destinatarios: "",
  periodo: "hoy",
  motivo: "",
}

/** Reportes programados por correo con registro de entrega (V1, RF-R5-125). */
export function ProgramadosPanel({ puedeProgramar }: { puedeProgramar: boolean }) {
  const { data, isLoading, isError, refetch } = useProgramadosReporte(true)
  const crear = useCrearProgramado()
  const actualizar = useActualizarProgramado()
  const ejecutar = useEjecutarProgramado()
  const { mostrar } = useToast()
  const [modalAbierto, setModalAbierto] = useState(false)
  const [form, setForm] = useState<FormProgramado>(FORM_INICIAL)
  const [historial, setHistorial] = useState<ReporteProgramado | null>(null)

  const guardar = () => {
    const destinatarios = form.destinatarios
      .split(/[,;\n]/)
      .map((correo) => correo.trim())
      .filter(Boolean)
    crear.mutate(
      {
        nombre: form.nombre,
        metrica: form.metrica as ReporteProgramado["metrica"],
        periodicidad: form.periodicidad,
        formato: form.formato,
        destinatarios,
        filtros: { periodo: form.periodo },
        motivo: form.motivo,
      },
      {
        onSuccess: () => {
          mostrar("Reporte programado creado. Queda registrado en auditoría.", "exito")
          setModalAbierto(false)
          setForm(FORM_INICIAL)
        },
        onError: (error) => mostrar(error instanceof Error ? error.message : "No se pudo programar", "error"),
      },
    )
  }

  const alternar = (fila: ReporteProgramado) => {
    actualizar.mutate(
      { id: fila.id, activo: !fila.activo },
      {
        onSuccess: () => mostrar(fila.activo ? "Programación pausada." : "Programación reactivada.", "exito"),
        onError: () => mostrar("No se pudo actualizar la programación.", "error"),
      },
    )
  }

  const ejecutarAhora = (fila: ReporteProgramado) => {
    ejecutar.mutate(fila.id, {
      onSuccess: () => mostrar(`Envío manual de «${fila.nombre}» registrado.`, "exito"),
      onError: () => mostrar("No se pudo ejecutar el envío.", "error"),
    })
  }

  const columnas: Column<ReporteProgramado>[] = [
    {
      key: "nombre",
      header: "Reporte",
      cell: (row) => (
        <>
          <span className="order-id">{row.nombre}</span>
          <span className="order-type">
            {METRICA_LABEL[row.metrica]} · {FORMATO_LABEL[row.formato]}
          </span>
        </>
      ),
    },
    {
      key: "periodicidad",
      header: "Periodicidad",
      cell: (row) => PERIODICIDAD_LABEL[row.periodicidad],
    },
    {
      key: "destinatarios",
      header: "Destinatarios",
      cell: (row) => (
        <span className="programados-mails" title={row.destinatarios.join(", ")}>
          <Mail size={13} aria-hidden="true" /> {row.destinatarios.length}{" "}
          {row.destinatarios.length === 1 ? "destinatario" : "destinatarios"}
        </span>
      ),
    },
    {
      key: "entrega",
      header: "Última entrega",
      cell: (row) => {
        const entrega = row.entregas[0]
        if (!entrega) return "Sin ejecuciones"
        return (
          <>
            <StatusBadge tone={ENTREGA_TONE[entrega.estado]}>{ENTREGA_LABEL[entrega.estado]}</StatusBadge>
            <span className="order-type">{formatRelative(entrega.enviadoEn)}</span>
          </>
        )
      },
    },
    {
      key: "proxima",
      header: "Próxima ejecución",
      cell: (row) => (row.activo ? formatDateTime(row.siguienteEjecucion) : "Pausado"),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (row) => (
        <StatusBadge tone={row.activo ? "green" : "gray"}>{row.activo ? "Activo" : "Pausado"}</StatusBadge>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      cell: (row) => (
        <span className="programados-actions">
          <IconButton
            label="Ver registro de entregas"
            onClick={(event) => {
              event.stopPropagation()
              setHistorial(row)
            }}
          >
            <History size={15} />
          </IconButton>
          <IconButton
            label="Ejecutar ahora"
            disabled={!puedeProgramar || ejecutar.isPending}
            onClick={(event) => {
              event.stopPropagation()
              ejecutarAhora(row)
            }}
          >
            <Play size={15} />
          </IconButton>
          <IconButton
            label={row.activo ? "Pausar" : "Activar"}
            disabled={!puedeProgramar || actualizar.isPending}
            onClick={(event) => {
              event.stopPropagation()
              alternar(row)
            }}
          >
            {row.activo ? <Pause size={15} /> : <Play size={15} />}
          </IconButton>
        </span>
      ),
    },
  ]

  if (isError) {
    return <ErrorState title="No pudimos consultar los reportes programados" onRetry={() => void refetch()} />
  }

  return (
    <div className="report-stack">
      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Reportes programados</div>
            <div className="panel__subtitle">
              Envío por correo o exportación · cada entrega queda registrada con destinatarios y resultado (V1)
            </div>
          </div>
          <Button
            variant="primary"
            disabled={!puedeProgramar}
            title={puedeProgramar ? undefined : "Requiere permiso reportes.programar"}
            onClick={() => setModalAbierto(true)}
          >
            <Plus size={15} /> Programar reporte
          </Button>
        </div>
        <DataTable
          columns={columnas}
          rows={data?.filas ?? []}
          getRowKey={(row) => row.id}
          loading={isLoading || !data}
          onRowClick={(row) => setHistorial(row)}
          emptyTitle="Sin reportes programados"
          emptyDescription="Programa un envío recurrente para recibir las cifras sin entrar al panel."
        />
      </section>

      <Drawer
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title="Programar reporte"
        subtitle="El envío recurrente y su registro quedan auditados"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button variant="primary" disabled={crear.isPending} onClick={guardar}>
              {crear.isPending ? "Programando…" : "Programar"}
            </Button>
          </>
        }
      >
        <div className="programados-form">
          <TextField
            label="Nombre"
            placeholder="Ventas del día (cierre)"
            value={form.nombre}
            onChange={(event) => setForm({ ...form, nombre: event.target.value })}
          />
          <SelectField
            label="Reporte"
            value={form.metrica}
            onChange={(event) => setForm({ ...form, metrica: event.target.value })}
            options={[
              { value: "ventas", label: "Ventas" },
              { value: "reservas", label: "Reservas" },
              { value: "desempeno", label: "Desempeño" },
              { value: "impuestos", label: "Impuestos y propinas" },
              { value: "comparativo", label: "Comparativo de sucursales" },
            ]}
          />
          <SelectField
            label="Período de los datos"
            value={form.periodo}
            onChange={(event) => setForm({ ...form, periodo: event.target.value })}
            options={[
              { value: "hoy", label: "Hoy" },
              { value: "ayer", label: "Ayer" },
              { value: "semana", label: "Última semana" },
              { value: "mes", label: "Este mes" },
            ]}
          />
          <SelectField
            label="Periodicidad"
            value={form.periodicidad}
            onChange={(event) => setForm({ ...form, periodicidad: event.target.value as Periodicidad })}
            options={[
              { value: "diario", label: "Diario" },
              { value: "semanal", label: "Semanal" },
              { value: "mensual", label: "Mensual" },
            ]}
          />
          <SelectField
            label="Formato"
            value={form.formato}
            onChange={(event) => setForm({ ...form, formato: event.target.value as FormatoReporte })}
            options={[
              { value: "csv", label: "CSV" },
              { value: "xlsx", label: "Excel" },
              { value: "pdf", label: "PDF (contabilidad)" },
            ]}
          />
          <TextField
            label="Destinatarios"
            hint="Separa los correos con comas. Se registra cada entrega."
            placeholder="direccion@puntoc.mx, contabilidad@puntoc.mx"
            value={form.destinatarios}
            onChange={(event) => setForm({ ...form, destinatarios: event.target.value })}
          />
          <TextField
            label="Motivo"
            hint="Queda en la bitácora de auditoría."
            placeholder="Solicitud de dirección"
            value={form.motivo}
            onChange={(event) => setForm({ ...form, motivo: event.target.value })}
          />
          <p className="programados-form__note">
            Los programados se ejecutan sobre los agregados de analytics y registran usuario, filtros y resultado
            (RN-R5-10).
          </p>
        </div>
      </Drawer>

      <Drawer
        open={historial !== null}
        onClose={() => setHistorial(null)}
        title={historial?.nombre ?? "Registro de entregas"}
        subtitle={
          historial
            ? `${METRICA_LABEL[historial.metrica]} · ${PERIODICIDAD_LABEL[historial.periodicidad]} · ${historial.destinatarios.length} destinatarios`
            : undefined
        }
      >
        {historial && historial.entregas.length > 0 ? (
          <ol className="programados-entregas">
            {historial.entregas.map((entrega) => (
              <li key={entrega.id}>
                <div className="programados-entregas__head">
                  <StatusBadge tone={ENTREGA_TONE[entrega.estado]}>{ENTREGA_LABEL[entrega.estado]}</StatusBadge>
                  <span>{formatRelative(entrega.enviadoEn)}</span>
                </div>
                <p>{entrega.detalle}</p>
                <small>Destinatarios: {entrega.destinatarios.join(", ")}</small>
              </li>
            ))}
          </ol>
        ) : (
          <p className="programados-form__note">Este programado aún no registra entregas.</p>
        )}
      </Drawer>
    </div>
  )
}
