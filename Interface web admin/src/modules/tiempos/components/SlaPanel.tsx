import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { formatDuration, formatPercent } from "@/lib/format"
import type { SlaFila, SlaResp } from "@/modules/tiempos/types"

function claseCumplimiento(pct: number | null): string {
  if (pct === null) return "tiempos-sla-card--sin"
  if (pct >= 0.9) return "tiempos-sla-card--good"
  if (pct >= 0.75) return "tiempos-sla-card--warn"
  return "tiempos-sla-card--bad"
}

function SlaCard({ fila, onIrSlaEditor }: { fila: SlaFila; onIrSlaEditor: () => void }) {
  return (
    <div className={`tiempos-sla-card ${claseCumplimiento(fila.pctCumplimiento)}`}>
      <div className="tiempos-sla-card__head">
        <strong>{fila.estacionNombre}</strong>
        {fila.pctCumplimiento === null ? (
          <span className="tiempos-sla-card__pct">—</span>
        ) : (
          <span className="tiempos-sla-card__pct">{formatPercent(fila.pctCumplimiento)}</span>
        )}
      </div>
      {fila.pctCumplimiento === null ? (
        <div className="tiempos-sla-card__sin-objetivo">
          <p>Esta estación no tiene <code>regla_sla</code>: el cumplimiento no computa y no se inventa objetivo.</p>
          <Button variant="secondary" onClick={onIrSlaEditor}>
            <ExternalLink size={14} /> Definir objetivo (SlaEditor)
          </Button>
        </div>
      ) : (
        <div
          className="tiempos-sla-card__gauge"
          role="img"
          aria-label={`Cumplimiento ${formatPercent(fila.pctCumplimiento)} en ${fila.estacionNombre}`}
        >
          <span style={{ width: `${Math.round(fila.pctCumplimiento * 100)}%` }} />
        </div>
      )}
      <dl className="tiempos-sla-card__data">
        <div>
          <dt>Objetivo</dt>
          <dd>{fila.objetivoSeg === null ? "—" : formatDuration(fila.objetivoSeg)}</dd>
        </div>
        <div>
          <dt>Dentro / medidas</dt>
          <dd>
            {fila.objetivoSeg === null ? `${fila.comandasMedidas} medidas` : `${fila.dentroSla}/${fila.comandasMedidas}`}
          </dd>
        </div>
        <div>
          <dt>Preparación media</dt>
          <dd>{formatDuration(fila.preparacionMediaSeg)}</dd>
        </div>
        <div>
          <dt>P90</dt>
          <dd>{formatDuration(fila.p90Seg)}</dd>
        </div>
        <div>
          <dt>Sin cierre</dt>
          <dd>{fila.sinCierre}</dd>
        </div>
      </dl>
    </div>
  )
}

/** Cumplimiento por estación contra `regla_sla` (RF-R5-122, pestaña SLA). */
export function SlaPanel({ data, onIrSlaEditor }: { data: SlaResp; onIrSlaEditor: () => void }) {
  const maximo = Math.max(...data.historial.map((punto) => punto.pctCumplimiento ?? 0), 0.1)

  return (
    <div className="tiempos-stack">
      <div className="tiempos-sla-grid">
        {data.filas.map((fila) => (
          <SlaCard key={fila.estacionId} fila={fila} onIrSlaEditor={onIrSlaEditor} />
        ))}
      </div>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Cumplimiento de los últimos 7 días</div>
            <div className="panel__subtitle">
              Comandas dentro del objetivo ÷ total, por estación configurada · sin objetivo no computa
            </div>
          </div>
          <Button variant="secondary" onClick={onIrSlaEditor}>
            <ExternalLink size={15} /> Abrir SlaEditor
          </Button>
        </div>
        <div className="tiempos-sla-historial">
          {data.historial.map((punto) => (
            <div className="tiempos-sla-historial__col" key={punto.fecha}>
              <div className="tiempos-sla-historial__track">
                <div
                  className="tiempos-sla-historial__bar"
                  style={{ height: `${Math.max(3, ((punto.pctCumplimiento ?? 0) / maximo) * 100)}%` }}
                  title={`${punto.etiqueta}: ${punto.pctCumplimiento === null ? "—" : formatPercent(punto.pctCumplimiento)} · ${punto.medidas} comandas`}
                />
              </div>
              <span>{punto.etiqueta}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="tiempos-note">
        Los objetivos de SLA se editan en el módulo <strong>Estaciones e impresoras</strong> (`regla_sla` por estación y
        producto). Aquí solo se consulta el cumplimiento.
      </p>
    </div>
  )
}
