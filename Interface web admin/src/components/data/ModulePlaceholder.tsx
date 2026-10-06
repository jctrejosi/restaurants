import { ArrowRight, Hammer } from "lucide-react"
import type { ModuleDef } from "@/app/nav"
import { PageHeader } from "@/components/data/PageHeader"
import { Button } from "@/components/ui/Button"

/**
 * Marcador para los módulos todavía no implementados. Conserva la navegación y
 * el contexto del sidebar mientras se implementan uno por uno.
 */
export function ModulePlaceholder({ module }: { module: ModuleDef }) {
  return (
    <div className="module-page">
      <PageHeader
        eyebrow={`${module.bloque} / ${module.nombre}`}
        title={module.nombre}
        subtitle={module.descripcion}
      />
      <div className="placeholder-card">
        <span className="placeholder-card__icon" aria-hidden="true">
          <Hammer size={22} />
        </span>
        <div>
          <strong>Módulo pendiente de implementación</strong>
          <p>
            El plan de este módulo está en{" "}
            <code>docs/arquitectura/plans/admin-modules/</code>. Rutas previstas:
          </p>
          <ul className="placeholder-card__routes">
            {module.rutas.map((ruta) => (
              <li key={ruta}>
                <code>{ruta}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="placeholder-hint">
        <Button variant="ghost" onClick={() => window.history.back()}>
          <ArrowRight size={15} style={{ transform: "rotate(180deg)" }} />
          Volver
        </Button>
      </div>
    </div>
  )
}
