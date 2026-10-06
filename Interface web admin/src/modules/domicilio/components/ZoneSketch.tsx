import type { VerticeGeo } from "@/modules/domicilio/types"

/**
 * Esquema visual del polígono de la zona. No es un mapa editable: dibuja la
 * geometría (GeoJSON) como referencia mientras se capturan los vértices.
 */
export function ZoneSketch({ vertices, height = 110 }: { vertices: VerticeGeo[]; height?: number }) {
  if (vertices.length < 3) {
    return (
      <div className="zone-sketch zone-sketch--empty" style={{ height }}>
        <span>Se necesitan al menos 3 vértices para dibujar la zona</span>
      </div>
    )
  }

  const lats = vertices.map((vertice) => vertice.lat)
  const lngs = vertices.map((vertice) => vertice.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const rangoLat = maxLat - minLat || 0.001
  const rangoLng = maxLng - minLng || 0.001

  const puntos = vertices
    .map((vertice) => {
      const x = 6 + ((vertice.lng - minLng) / rangoLng) * 88
      const y = 6 + (1 - (vertice.lat - minLat) / rangoLat) * 48
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

  return (
    <svg
      className="zone-sketch"
      viewBox="0 0 100 60"
      style={{ height }}
      role="img"
      aria-label={`Polígono de ${vertices.length} vértices`}
    >
      {[0, 1, 2, 3].map((linea) => (
        <line key={`h-${linea}`} x1="0" x2="100" y1={linea * 20} y2={linea * 20} className="zone-sketch__grid" />
      ))}
      {[0, 1, 2, 3, 4].map((linea) => (
        <line key={`v-${linea}`} y1="0" y2="60" x1={linea * 25} x2={linea * 25} className="zone-sketch__grid" />
      ))}
      <polygon points={puntos} className="zone-sketch__area" />
      {vertices.map((vertice, indice) => {
        const x = 6 + ((vertice.lng - minLng) / rangoLng) * 88
        const y = 6 + (1 - (vertice.lat - minLat) / rangoLat) * 48
        return <circle key={indice} cx={x.toFixed(1)} cy={y.toFixed(1)} r="1.6" className="zone-sketch__punto" />
      })}
    </svg>
  )
}
