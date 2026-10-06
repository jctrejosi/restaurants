import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { PageHeader } from "@/components/data/PageHeader"
import { Button } from "@/components/ui/Button"
import { ErrorState, NoPermissionState } from "@/components/ui/states"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { useAuth } from "@/app/auth"
import { useEntidadTimeline } from "@/modules/auditoria/api"
import { AuditExplorer } from "@/modules/auditoria/components/AuditExplorer"
import { EntityTimeline } from "@/modules/auditoria/components/EntityTimeline"
import { ENTIDAD_LABEL, type EntidadAuditoria } from "@/modules/auditoria/types"
import "@/modules/auditoria/auditoria.css"

export default function AuditoriaPage() {
  const { entidad, id } = useParams<{ entidad?: string; id?: string }>()
  const { tienePermiso } = useAuth()
  const navigate = useNavigate()
  const esTimeline = Boolean(entidad && id)
  const timeline = useEntidadTimeline(esTimeline ? entidad : undefined, esTimeline ? id : undefined)

  if (!tienePermiso("auditoria.ver")) {
    return (
      <div className="module-page">
        <PageHeader
          eyebrow="Analítica / Auditoría"
          title="Auditoría"
          subtitle="Bitácora global inmutable con diffs antes/después, filtros y exportación registrada."
        />
        <NoPermissionState permiso="auditoria.ver" />
      </div>
    )
  }

  const entidadLabel = entidad ? (ENTIDAD_LABEL[entidad as EntidadAuditoria] ?? entidad) : ""

  return (
    <div className="module-page auditoria-page">
      <PageHeader
        eyebrow="Analítica / Auditoría"
        title={esTimeline ? `Bitácora · ${entidadLabel}` : "Auditoría"}
        subtitle={
          esTimeline
            ? "Línea de tiempo completa de la entidad con antes/después, actor, canal y motivo."
            : "Quién, qué, cuándo, dónde y por qué de cada acción sensible (RN-R5-01) · solo lectura."
        }
        actions={
          esTimeline ? (
            <Button variant="secondary" onClick={() => navigate("/auditoria")}>
              <ArrowLeft size={15} /> Volver a la bitácora
            </Button>
          ) : (
            <span className="audit-immutable">
              <ShieldCheck size={14} /> Inmutable y con retención configurable
            </span>
          )
        }
      />

      {esTimeline ? (
        timeline.isError ? (
          <ErrorState title="No pudimos cargar la línea de tiempo" onRetry={() => void timeline.refetch()} />
        ) : timeline.isLoading || !timeline.data ? (
          <section className="panel">
            <SkeletonRows rows={6} columns={4} />
          </section>
        ) : (
          <EntityTimeline data={timeline.data} />
        )
      ) : (
        <AuditExplorer />
      )}
    </div>
  )
}
