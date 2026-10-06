import { formatDateTime } from "@/lib/format"
import { useSede } from "@/app/sede"
import type { FormulaTramo, Sello } from "@/modules/tiempos/types"

/** Los dos sellos que componen un tramo, con hora del servidor, actor y canal (R5 §5.4). */
export function SellosPanel({
  formula,
  selloInicio,
  selloCierre,
  tramoSeg,
}: {
  formula: FormulaTramo
  selloInicio: Sello
  selloCierre: Sello | null
  tramoSeg: number | null
}) {
  const { zonaHoraria } = useSede()

  return (
    <div className="sellos">
      <div className="sellos__formula">
        <code>{formula.formula}</code>
        <span>
          {formula.inicio} → {formula.cierre} · sellos del servidor (RN-R5-08)
        </span>
      </div>
      <ol className="sellos__list">
        <li>
          <SelloCard sello={selloInicio} zonaHoraria={zonaHoraria} />
        </li>
        <li className={selloCierre === null ? "sellos__item--missing" : undefined}>
          {selloCierre ? (
            <SelloCard sello={selloCierre} zonaHoraria={zonaHoraria} />
          ) : (
            <div className="sellos__missing">
              <strong>Sin evento de cierre</strong>
              <span>
                No existe el sello <code>{formula.cierre}</code>: el tramo muestra «—» y queda fuera de media y p90.
              </span>
            </div>
          )}
        </li>
      </ol>
      <p className="sellos__note">
        {tramoSeg === null
          ? "Este tramo no promedia hasta que exista el evento de cierre."
          : "Ambas horas provienen del reloj del servidor: cambiar el reloj del dispositivo no altera la duración."}
      </p>
    </div>
  )
}

function SelloCard({ sello, zonaHoraria }: { sello: Sello; zonaHoraria: string }) {
  return (
    <div className="sello-card">
      <div className="sello-card__head">
        <strong>{sello.etiqueta}</strong>
        <span className="sello-card__hora">{formatDateTime(sello.hora, zonaHoraria)}</span>
      </div>
      <dl className="sello-card__data">
        <div>
          <dt>Evento</dt>
          <dd>
            <code>{sello.evento}</code>
          </dd>
        </div>
        <div>
          <dt>Actor</dt>
          <dd>
            {sello.actor} <small>({sello.actorRol})</small>
          </dd>
        </div>
        <div>
          <dt>Canal</dt>
          <dd>{sello.canal}</dd>
        </div>
        <div>
          <dt>Dispositivo</dt>
          <dd>{sello.dispositivo ?? "—"}</dd>
        </div>
      </dl>
    </div>
  )
}
