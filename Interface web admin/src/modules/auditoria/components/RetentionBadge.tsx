import { Lock } from "lucide-react"
import { formatDateTime } from "@/lib/format"
import { useSede } from "@/app/sede"
import type { RetencionResp } from "@/modules/auditoria/types"

/** Retención configurable visible (RF-R5-133): nadie edita ni borra la bitácora. */
export function RetentionBadge({ retencion }: { retencion: RetencionResp }) {
  const { zonaHoraria } = useSede()
  return (
    <span
      className="audit-retention"
      title={`Gestionada en ${retencion.gestionadoPor}. Lo anterior a ${retencion.purgadoAntesDe} se purga por retención.`}
    >
      <Lock size={12} aria-hidden="true" />
      Retención: {retencion.meses} meses
      <small>
        · bitácora inmutable · {retencion.totalConservado} eventos conservados
        {retencion.eventoMasAntiguo ? ` · el más antiguo, ${formatDateTime(retencion.eventoMasAntiguo, zonaHoraria)}` : ""}
      </small>
    </span>
  )
}
