import { useEffect, useMemo, useState } from "react"
import { MapPinned } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Drawer } from "@/components/ui/Drawer"
import { SelectField, TextareaField, TextField, type SelectOption } from "@/components/ui/fields"
import { formatMoney } from "@/lib/format"
import type { Sede } from "@/app/sede"
import { ZoneSketch } from "@/modules/domicilio/components/ZoneSketch"
import type { VerticeGeo, Zona, ZonaPayload } from "@/modules/domicilio/types"

function parsearVertices(texto: string): VerticeGeo[] | null {
  const lineas = texto
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean)
  const vertices: VerticeGeo[] = []
  for (const linea of lineas) {
    const partes = linea.split(/[,\s]+/).filter(Boolean).map(Number)
    if (partes.length < 2 || !Number.isFinite(partes[0]) || !Number.isFinite(partes[1])) return null
    vertices.push({ lat: partes[0] as number, lng: partes[1] as number })
  }
  return vertices
}

function verticesATexto(vertices: VerticeGeo[]): string {
  return vertices.map((vertice) => `${vertice.lat}, ${vertice.lng}`).join("\n")
}

function aCentavos(valor: string, centavosActuales: number): number {
  if (valor.trim() === "") return centavosActuales
  const numero = Number(valor)
  return Number.isFinite(numero) ? Math.round(numero * 100) : centavosActuales
}

/**
 * Alta y edición de zonas de cobertura con geometría simple (lista de vértices +
 * esquema visual). Un cambio de tarifa o mínimo exige motivo y confirma que los
 * pedidos ya creados no se alteran (RN-R5-04).
 */
export function ZoneForm({
  open,
  zona,
  sedes,
  sucursalPredeterminada,
  guardando,
  errorServidor,
  onClose,
  onGuardar,
}: {
  open: boolean
  zona: Zona | null
  sedes: Sede[]
  sucursalPredeterminada: string | null
  guardando: boolean
  errorServidor: string | null
  onClose: () => void
  onGuardar: (payload: ZonaPayload) => void
}) {
  const [nombre, setNombre] = useState("")
  const [sucursalId, setSucursalId] = useState("")
  const [tarifa, setTarifa] = useState("")
  const [minimo, setMinimo] = useState("")
  const [tiempo, setTiempo] = useState("30")
  const [activa, setActiva] = useState("true")
  const [verticesTexto, setVerticesTexto] = useState("")
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [confirmarPrecios, setConfirmarPrecios] = useState<ZonaPayload | null>(null)

  useEffect(() => {
    if (!open) return
    setNombre(zona?.nombre ?? "")
    setSucursalId(zona?.sucursalId ?? sucursalPredeterminada ?? sedes[0]?.id ?? "")
    setTarifa(zona ? (zona.tarifaCentavos / 100).toFixed(2) : "35.00")
    setMinimo(zona ? (zona.pedidoMinimoCentavos / 100).toFixed(2) : "150.00")
    setTiempo(String(zona?.tiempoEstimadoMin ?? 30))
    setActiva(zona ? String(zona.activa) : "true")
    setVerticesTexto(
      zona
        ? verticesATexto(zona.vertices)
        : "19.410, -99.140\n19.410, -99.120\n19.396, -99.119\n19.395, -99.141",
    )
    setErrorLocal(null)
    setConfirmarPrecios(null)
  }, [open, zona, sucursalPredeterminada, sedes])

  const verticesVistaPrevia = useMemo(() => parsearVertices(verticesTexto) ?? [], [verticesTexto])

  const opcionesSede: SelectOption[] = sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))

  const construirPayload = (): ZonaPayload | null => {
    if (!nombre.trim()) {
      setErrorLocal("El nombre de la zona es obligatorio.")
      return null
    }
    const vertices = parsearVertices(verticesTexto)
    if (!vertices || vertices.length < 3) {
      setErrorLocal("Captura al menos 3 vértices válidos, uno por línea (lat, lng).")
      return null
    }
    const tiempoNumero = Math.round(Number(tiempo))
    if (!Number.isFinite(tiempoNumero) || tiempoNumero < 1) {
      setErrorLocal("El tiempo estimado debe ser de al menos 1 minuto.")
      return null
    }
    setErrorLocal(null)
    return {
      nombre: nombre.trim(),
      sucursalId,
      tarifaCentavos: aCentavos(tarifa, zona?.tarifaCentavos ?? 0),
      pedidoMinimoCentavos: aCentavos(minimo, zona?.pedidoMinimoCentavos ?? 0),
      tiempoEstimadoMin: tiempoNumero,
      vertices,
      activa: activa === "true",
    }
  }

  const guardar = () => {
    const payload = construirPayload()
    if (!payload) return
    const cambianPrecios =
      zona != null &&
      (payload.tarifaCentavos !== zona.tarifaCentavos || payload.pedidoMinimoCentavos !== zona.pedidoMinimoCentavos)
    if (cambianPrecios) {
      setConfirmarPrecios(payload)
      return
    }
    onGuardar(payload)
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        width={640}
        title={zona ? `Editar zona «${zona.nombre}»` : "Nueva zona de cobertura"}
        subtitle="La web de pedidos valida contra esta configuración al confirmar un domicilio."
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={guardando}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : zona ? "Guardar cambios" : "Crear zona"}
            </Button>
          </>
        }
      >
        <div className="zone-form">
          {zona ? (
            <p className="domicilio-notice">
              Los pedidos ya creados conservan la tarifa y el mínimo vigentes al momento de su alta: este cambio solo
              aplica a pedidos nuevos (RN-R5-04).
            </p>
          ) : null}

          <div className="zone-form__grid">
            <TextField label="Nombre de la zona" value={nombre} onChange={(event) => setNombre(event.target.value)} />
            <SelectField
              label={zona ? "Sucursal (fija)" : "Sucursal"}
              options={opcionesSede}
              value={sucursalId}
              disabled={Boolean(zona)}
              onChange={(event) => setSucursalId(event.target.value)}
            />
            <TextField
              label="Tarifa de envío (MXN)"
              type="number"
              min="0"
              step="0.01"
              value={tarifa}
              onChange={(event) => setTarifa(event.target.value)}
            />
            <TextField
              label="Pedido mínimo (MXN)"
              type="number"
              min="0"
              step="0.01"
              value={minimo}
              onChange={(event) => setMinimo(event.target.value)}
            />
            <TextField
              label="Tiempo estimado (min)"
              type="number"
              min="1"
              value={tiempo}
              onChange={(event) => setTiempo(event.target.value)}
            />
            <SelectField
              label="Estado de publicación"
              options={[
                { value: "true", label: "Activa (valida en la web)" },
                { value: "false", label: "Inactiva" },
              ]}
              value={activa}
              onChange={(event) => setActiva(event.target.value)}
            />
          </div>

          <TextareaField
            label="Vértices del polígono (GeoJSON simplificado)"
            hint="Un vértice por línea con formato «latitud, longitud». El servidor valida solapes con PostGIS."
            rows={6}
            value={verticesTexto}
            onChange={(event) => setVerticesTexto(event.target.value)}
          />

          <div className="zone-form__sketch">
            <div className="zone-form__sketch-head">
              <strong>
                <MapPinned size={14} /> Esquema de cobertura
              </strong>
              <span>{verticesVistaPrevia.length} vértices</span>
            </div>
            <ZoneSketch vertices={verticesVistaPrevia} />
            <p className="domicilio-hint">
              Referencia visual del polígono capturado; la edición sobre mapa llegará con la API de geolocalización.
            </p>
          </div>

          {errorLocal || errorServidor ? <p className="form-error">{errorLocal ?? errorServidor}</p> : null}
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmarPrecios != null}
        title="Confirmar cambio de tarifa o mínimo"
        description="El cambio queda auditado con el valor anterior y el nuevo."
        impacto={
          confirmarPrecios && zona
            ? `Tarifa ${formatMoney(zona.tarifaCentavos)} → ${formatMoney(confirmarPrecios.tarifaCentavos)} · Mínimo ${formatMoney(zona.pedidoMinimoCentavos)} → ${formatMoney(confirmarPrecios.pedidoMinimoCentavos)}. Los pedidos ya creados no se modifican.`
            : undefined
        }
        confirmLabel="Guardar con motivo"
        onCancel={() => setConfirmarPrecios(null)}
        onConfirm={(motivo) => {
          if (!confirmarPrecios) return
          onGuardar({ ...confirmarPrecios, motivo })
          setConfirmarPrecios(null)
        }}
      />
    </>
  )
}
