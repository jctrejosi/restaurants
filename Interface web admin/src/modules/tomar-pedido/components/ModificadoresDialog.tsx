import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Minus, Plus, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { IconButton } from "@/components/ui/IconButton"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { formatMoney } from "@/lib/format"
import { DialogoBase } from "@/modules/tomar-pedido/components/DialogoBase"
import type {
  GrupoModificador,
  LineaCarrito,
  ModificadorElegido,
  ProductoCarta,
} from "@/modules/tomar-pedido/types"

function etiquetaRegla(grupo: GrupoModificador): string {
  if (grupo.maximo === 1) return grupo.minimo > 0 ? "Elige 1" : "Opcional · elige 1"
  if (grupo.minimo > 0) return `Elige ${grupo.minimo} a ${grupo.maximo}`
  return `Hasta ${grupo.maximo}`
}

/**
 * Grupos de modificadores con mínimo/máximo: los obligatorios sin elegir
 * bloquean «Agregar» y explican qué falta (plan §8).
 */
export function ModificadoresDialog({
  open,
  producto,
  linea,
  moneda,
  onClose,
  onGuardar,
}: {
  open: boolean
  producto: ProductoCarta | null
  /** Línea en edición; `null` cuando se agrega una nueva. */
  linea: LineaCarrito | null
  moneda?: string
  onClose: () => void
  onGuardar: (modificadores: ModificadorElegido[], cantidad: number) => void
}) {
  const [seleccion, setSeleccion] = useState<Record<string, string[]>>({})
  const [cantidad, setCantidad] = useState(1)

  useEffect(() => {
    if (!open || !producto) return
    const inicial: Record<string, string[]> = {}
    for (const grupo of producto.grupos) {
      inicial[grupo.id] = linea
        ? linea.modificadores.filter((modificador) => modificador.grupoId === grupo.id).map((m) => m.modificadorId)
        : []
    }
    setSeleccion(inicial)
    setCantidad(linea?.cantidad ?? 1)
  }, [open, producto, linea])

  const faltantes = useMemo(() => {
    if (!producto) return []
    return producto.grupos.filter((grupo) => (seleccion[grupo.id]?.length ?? 0) < grupo.minimo)
  }, [producto, seleccion])

  const precioUnitario = useMemo(() => {
    if (!producto) return 0
    let total = producto.centavos
    for (const grupo of producto.grupos) {
      for (const id of seleccion[grupo.id] ?? []) {
        total += grupo.modificadores.find((m) => m.id === id)?.sobreprecioCentavos ?? 0
      }
    }
    return total
  }, [producto, seleccion])

  if (!producto) return null

  const alternar = (grupo: GrupoModificador, modificadorId: string) => {
    setSeleccion((actual) => {
      const actuales = actual[grupo.id] ?? []
      const yaElegido = actuales.includes(modificadorId)
      let siguientes: string[]
      if (yaElegido) {
        siguientes = actuales.filter((id) => id !== modificadorId)
      } else if (grupo.maximo === 1) {
        siguientes = [modificadorId]
      } else if (actuales.length >= grupo.maximo) {
        siguientes = actuales
      } else {
        siguientes = [...actuales, modificadorId]
      }
      return { ...actual, [grupo.id]: siguientes }
    })
  }

  const confirmar = () => {
    const elegidos: ModificadorElegido[] = []
    for (const grupo of producto.grupos) {
      for (const id of seleccion[grupo.id] ?? []) {
        const modificador = grupo.modificadores.find((m) => m.id === id)
        if (!modificador) continue
        elegidos.push({
          grupoId: grupo.id,
          grupoNombre: grupo.nombre,
          modificadorId: modificador.id,
          nombre: modificador.nombre,
          sobreprecioCentavos: modificador.sobreprecioCentavos,
        })
      }
    }
    onGuardar(elegidos, cantidad)
  }

  return (
    <DialogoBase
      open={open}
      onClose={onClose}
      wide
      icon={<SlidersHorizontal size={18} />}
      title={linea ? `Modificadores · ${producto.nombre}` : `Agregar ${producto.nombre}`}
      subtitle={`${producto.categoriaNombre} · precio base ${formatMoney(producto.centavos, moneda)}`}
      footer={
        <>
          <span className="tp-stepper tp-stepper--grande">
            <IconButton
              label="Quitar una pieza"
              className="tp-stepper__btn"
              disabled={cantidad <= 1}
              onClick={() => setCantidad((valor) => Math.max(1, valor - 1))}
            >
              <Minus size={14} />
            </IconButton>
            <span className="tp-stepper__valor">{cantidad}</span>
            <IconButton
              label="Agregar una pieza"
              className="tp-stepper__btn"
              onClick={() => setCantidad((valor) => Math.min(30, valor + 1))}
            >
              <Plus size={14} />
            </IconButton>
          </span>
          <span className="tp-dialogo__total">
            Total <strong>{formatMoney(precioUnitario * cantidad, moneda)}</strong>
          </span>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={faltantes.length > 0}
            title={faltantes.length > 0 ? "Completa los grupos obligatorios" : undefined}
            onClick={confirmar}
          >
            {linea ? "Guardar cambios" : "Agregar al pedido"}
          </Button>
        </>
      }
    >
      {faltantes.length > 0 ? (
        <p className="tp-dialogo__falta">
          <AlertTriangle size={14} /> Falta elegir: {faltantes.map((grupo) => grupo.nombre).join(", ")}
        </p>
      ) : null}

      {producto.grupos.map((grupo) => {
        const elegidos = seleccion[grupo.id] ?? []
        return (
          <fieldset className="tp-grupo" key={grupo.id}>
            <legend>
              <strong>{grupo.nombre}</strong>
              {grupo.obligatorio ? <StatusBadge tone="amber">Obligatorio</StatusBadge> : null}
              <span className="tp-grupo__regla">{etiquetaRegla(grupo)}</span>
            </legend>
            <div className="tp-grupo__opciones">
              {grupo.modificadores.map((modificador) => {
                const activo = elegidos.includes(modificador.id)
                const bloqueado = !activo && grupo.maximo > 1 && elegidos.length >= grupo.maximo
                return (
                  <button
                    key={modificador.id}
                    type="button"
                    className={`button tp-opcion ${activo ? "tp-opcion--activa" : ""}`}
                    aria-pressed={activo}
                    disabled={bloqueado}
                    title={bloqueado ? `Máximo ${grupo.maximo} en ${grupo.nombre}` : undefined}
                    onClick={() => alternar(grupo, modificador.id)}
                  >
                    <span>{modificador.nombre}</span>
                    {modificador.sobreprecioCentavos > 0 ? (
                      <em>+ {formatMoney(modificador.sobreprecioCentavos, moneda)}</em>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )
      })}
    </DialogoBase>
  )
}
