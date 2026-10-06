import { Eye } from "lucide-react"
import type { PreviewCambio } from "@/modules/ajustes/types"

/**
 * Vista previa del efecto (plan 19 §6): resume qué cambia y qué interfaces se
 * ven afectadas antes de confirmar el guardado.
 */
export function EffectPreviewPanel({
  cambios,
  titulo = "Vista previa del efecto",
}: {
  cambios: PreviewCambio[]
  titulo?: string
}) {
  return (
    <section className="preview" aria-label={titulo}>
      <header className="preview__head">
        <Eye size={16} />
        <div>
          <strong>{titulo}</strong>
          <small>Qué cambia y a quién afecta antes de confirmar</small>
        </div>
        <span className="preview__contador">
          {cambios.length === 0 ? "Sin cambios" : `${cambios.length} cambio${cambios.length === 1 ? "" : "s"}`}
        </span>
      </header>
      {cambios.length === 0 ? (
        <p className="preview__vacio">Los valores coinciden con lo guardado; no hay nada por aplicar.</p>
      ) : (
        <ul className="preview__lista">
          {cambios.map((cambio) => (
            <li key={cambio.area}>
              <span className="preview__area">{cambio.area}</span>
              <span className="preview__diff">
                <del>{cambio.antes}</del>
                <ins>{cambio.despues}</ins>
              </span>
              <small className="preview__efecto">{cambio.efecto}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
