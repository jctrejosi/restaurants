import { AlertTriangle, RefreshCw } from "lucide-react"
import { formatRelative } from "@/lib/format"

/**
 * Sello de frescura del job E9 (RNF-R5-02), gemelo del que usa el módulo 14:
 * verde si el último refresco fue hace ≤ 1 min; rojo si hay retraso.
 * (Cuando exista `FreshnessBadge` en `src/components`, este duplicado se retira.)
 */
export function FreshnessBadge({ actualizadoEn, ahora }: { actualizadoEn: string | undefined; ahora: Date }) {
  if (!actualizadoEn) {
    return <span className="freshness freshness--muted">Sin sello de actualización</span>
  }
  const minutos = Math.max(0, Math.round((ahora.getTime() - Date.parse(actualizadoEn)) / 60_000))
  const vigente = minutos <= 1
  return (
    <span
      className={`freshness ${vigente ? "freshness--ok" : "freshness--late"}`}
      title={`Última ejecución del refresco de analytics: ${formatRelative(actualizadoEn, ahora)}`}
    >
      {vigente ? <RefreshCw size={12} /> : <AlertTriangle size={12} />}
      {vigente ? `Actualizado hace ${minutos} min` : `Datos con retraso (${minutos} min > 1 min)`}
    </span>
  )
}
