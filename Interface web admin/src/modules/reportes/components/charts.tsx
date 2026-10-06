import { formatNumber } from "@/lib/format"

/* -------------------------------------------------------------------------- */
/* Gráficos propios con SVG/CSS (sin `recharts`, plan 14 §6)                   */
/* -------------------------------------------------------------------------- */

export type PuntoGrafica = { etiqueta: string; valor: number; detalle?: string }

/** Barras verticales por período (día/semana/mes). */
export function SerieBarras({
  puntos,
  formatear,
  color = "var(--brand)",
}: {
  puntos: PuntoGrafica[]
  formatear: (valor: number) => string
  color?: string
}) {
  if (puntos.length === 0) return <p className="chart-empty">Sin datos en el período.</p>
  const maximo = Math.max(...puntos.map((punto) => punto.valor), 1)
  return (
    <div className="chart-bars" role="img" aria-label="Serie por período">
      {puntos.map((punto, indice) => (
        <div className="chart-bars__col" key={`${punto.etiqueta}-${indice}`}>
          <div className="chart-bars__track">
            <div
              className="chart-bars__bar"
              style={{ height: `${Math.max(2, (punto.valor / maximo) * 100)}%`, background: color }}
              title={`${punto.etiqueta}: ${punto.detalle ?? formatear(punto.valor)}`}
            />
          </div>
          <span className="chart-bars__label">{punto.etiqueta}</span>
        </div>
      ))}
    </div>
  )
}

/** Serie de línea/área simple con ejes mínimos. */
export function SerieLinea({
  puntos,
  formatear,
  color = "var(--blue)",
}: {
  puntos: PuntoGrafica[]
  formatear: (valor: number) => string
  color?: string
}) {
  if (puntos.length < 2) {
    return <SerieBarras puntos={puntos} formatear={formatear} color={color} />
  }
  const maximo = Math.max(...puntos.map((punto) => punto.valor), 1)
  const ancho = 100
  const alto = 38
  const margen = 2
  const paso = (ancho - margen * 2) / (puntos.length - 1)
  const escalaY = (valor: number) => alto - margen - (valor / maximo) * (alto - margen * 2)
  const coords = puntos.map((punto, indice) => ({
    x: margen + indice * paso,
    y: escalaY(punto.valor),
  }))
  const linea = coords.map((coord) => `${coord.x.toFixed(2)},${coord.y.toFixed(2)}`).join(" ")
  const area = `M ${coords[0]?.x ?? 0} ${alto - margen} L ${linea.split(" ").join(" L ")} L ${
    coords[coords.length - 1]?.x ?? 0
  } ${alto - margen} Z`

  return (
    <div className="chart-line">
      <svg viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" role="img" aria-label="Serie del período">
        <path d={area} fill={color} opacity={0.08} />
        <polyline points={linea} fill="none" stroke={color} strokeWidth={0.9} vectorEffect="non-scaling-stroke" />
        {coords.map((coord, indice) => (
          <circle key={indice} cx={coord.x} cy={coord.y} r={0.9} fill={color}>
            <title>{`${puntos[indice]?.etiqueta}: ${
              puntos[indice]?.detalle ?? formatear(puntos[indice]?.valor ?? 0)
            }`}</title>
          </circle>
        ))}
      </svg>
      <div className="chart-line__labels">
        <span>{puntos[0]?.etiqueta}</span>
        <span>{puntos[Math.floor(puntos.length / 2)]?.etiqueta}</span>
        <span>{puntos[puntos.length - 1]?.etiqueta}</span>
      </div>
    </div>
  )
}

/** Barras horizontales para desgloses (canal, modalidad, sucursal). */
export function BarrasHorizontales({
  filas,
  formatear,
  color = "var(--brand)",
}: {
  filas: { etiqueta: string; valor: number; nota?: string }[]
  formatear: (valor: number) => string
  color?: string
}) {
  if (filas.length === 0) return <p className="chart-empty">Sin datos en el período.</p>
  const maximo = Math.max(...filas.map((fila) => fila.valor), 1)
  return (
    <ul className="chart-hbars">
      {filas.map((fila) => (
        <li key={fila.etiqueta}>
          <span className="chart-hbars__label" title={fila.etiqueta}>
            {fila.etiqueta}
          </span>
          <span className="chart-hbars__track">
            <span
              className="chart-hbars__fill"
              style={{ width: `${Math.max(2, (fila.valor / maximo) * 100)}%`, background: color }}
            />
          </span>
          <span className="chart-hbars__value">
            {formatear(fila.valor)}
            {fila.nota ? <small>{fila.nota}</small> : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Mapa de calor horas × días para reservas (RF-R5-121). */
export function Heatmap({
  celdas,
  dias,
  horas,
  formatear,
  unidad = "reservas",
}: {
  celdas: { dia: number; hora: number; valor: number; ocupacionPct: number }[]
  dias: { valor: number; corto: string; nombre: string }[]
  horas: number[]
  formatear?: (valor: number) => string
  unidad?: string
}) {
  const maximo = Math.max(...celdas.map((celda) => celda.valor), 1)
  const buscar = (dia: number, hora: number) => celdas.find((celda) => celda.dia === dia && celda.hora === hora)
  return (
    <div className="heatmap" role="img" aria-label={`Mapa de calor de ${unidad} por día y hora`}>
      <div className="heatmap__grid" style={{ gridTemplateColumns: `52px repeat(${horas.length}, minmax(30px, 1fr))` }}>
        <span className="heatmap__corner" />
        {horas.map((hora) => (
          <span className="heatmap__hora" key={`h-${hora}`}>{`${hora}:00`}</span>
        ))}
        {dias.map((dia) => (
          <FragmentoDia key={dia.valor} dia={dia} horas={horas} maximo={maximo} buscar={buscar} formatear={formatear} />
        ))}
      </div>
      <div className="heatmap__leyenda">
        <span>Menos</span>
        {[0.12, 0.32, 0.52, 0.72, 0.92].map((intensidad) => (
          <i key={intensidad} style={{ background: `rgba(180, 69, 31, ${intensidad})` }} />
        ))}
        <span>Más {unidad}</span>
      </div>
    </div>
  )
}

function FragmentoDia({
  dia,
  horas,
  maximo,
  buscar,
  formatear,
}: {
  dia: { valor: number; corto: string; nombre: string }
  horas: number[]
  maximo: number
  buscar: (dia: number, hora: number) => { valor: number; ocupacionPct: number } | undefined
  formatear?: (valor: number) => string
}) {
  return (
    <>
      <span className="heatmap__dia" title={dia.nombre}>
        {dia.corto}
      </span>
      {horas.map((hora) => {
        const celda = buscar(dia.valor, hora)
        const valor = celda?.valor ?? 0
        const intensidad = 0.08 + (valor / maximo) * 0.84
        const legible = intensidad > 0.55
        return (
          <span
            className={`heatmap__celda ${legible ? "heatmap__celda--clara" : ""}`}
            key={`${dia.valor}-${hora}`}
            style={{ background: `rgba(180, 69, 31, ${intensidad.toFixed(2)})` }}
            title={`${dia.nombre} ${hora}:00 · ${formatear ? formatear(valor) : formatNumber(valor)} ${unidadLabel(
              valor,
            )} · ocupación ${Math.round((celda?.ocupacionPct ?? 0) * 100)} %`}
          >
            {valor}
          </span>
        )
      })}
    </>
  )
}

function unidadLabel(valor: number): string {
  return valor === 1 ? "reserva" : "reservas"
}
