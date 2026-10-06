import { AlertTriangle, ChevronRight } from "lucide-react"
import { alertasPendientes, SEVERIDAD_LABEL, useAlertas } from "@/app/alerts"
import { Button } from "@/components/ui/Button"
import { formatRelative } from "@/lib/format"

/** Bandeja resumida de alertas; «Ver todas» abre el drawer del shell. */
export function AlertsPanel() {
  const { data } = useAlertas()
  const pendientes = alertasPendientes(data)
  const visibles = pendientes.slice(0, 3)

  return (
    <section className="panel alerts-panel">
      <div className="panel__header">
        <div>
          <div className="panel__title">Requiere atención</div>
          <div className="panel__subtitle">
            {pendientes.length} {pendientes.length === 1 ? "alerta operativa" : "alertas operativas"}
          </div>
        </div>
        <Button
          variant="ghost"
          className="text-action"
          onClick={() => window.dispatchEvent(new CustomEvent("pc:abrir-alertas"))}
        >
          Ver todas <ChevronRight size={15} />
        </Button>
      </div>

      <div className="alert-list">
        {visibles.length === 0 ? (
          <p className="panel__subtitle">Sin alertas pendientes.</p>
        ) : (
          visibles.map((alerta) => (
            <Button
              variant="ghost"
              className="alert-row"
              key={alerta.id}
              onClick={() => window.dispatchEvent(new CustomEvent("pc:abrir-alertas"))}
            >
              <span className={`alert-icon alert-icon--${alerta.severidad}`}>
                <AlertTriangle size={16} />
              </span>
              <span className="alert-copy">
                <strong>{alerta.titulo}</strong>
                <span>{alerta.detalle}</span>
              </span>
              <span className="alert-time">
                {SEVERIDAD_LABEL[alerta.severidad]} · {formatRelative(alerta.creadaEn)}
              </span>
              <ChevronRight size={16} />
            </Button>
          ))
        )}
      </div>
    </section>
  )
}
