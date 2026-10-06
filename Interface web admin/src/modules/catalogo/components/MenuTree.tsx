/**
 * Árbol de la carta (plan 06 §3): categorías jerárquicas con reorden, alta,
 * renombre y activación. El nodo seleccionado filtra la tabla de la derecha.
 */

import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { SelectField, TextField } from "@/components/ui/fields"
import type { Categoria } from "@/modules/catalogo/types"

export type MenuTreeProps = {
  categorias: Categoria[]
  seleccionada: string | null
  conteos: Record<string, number>
  puedeEditar: boolean
  onSeleccionar: (id: string | null) => void
  onNueva: (padreId: string | null) => void
  onEditar: (categoria: Categoria) => void
  onMover: (categoria: Categoria, delta: number) => void
  onAlternarActiva: (categoria: Categoria) => void
}

function NodoCategoria({
  categoria,
  hijas,
  nivel,
  seleccionada,
  conteos,
  puedeEditar,
  onSeleccionar,
  onNueva,
  onEditar,
  onMover,
  onAlternarActiva,
}: {
  categoria: Categoria
  hijas: Record<string, Categoria[]>
  nivel: number
} & Omit<MenuTreeProps, "categorias">) {
  const [abierta, setAbierta] = useState(true)
  const children = hijas[categoria.id] ?? []
  const activa = seleccionada === categoria.id

  return (
    <li>
      <div className={`cat-tree__fila ${activa ? "cat-tree__fila--activa" : ""}`} style={{ paddingLeft: nivel * 14 }}>
        <button
          type="button"
          className="cat-tree__toggle"
          aria-label={abierta ? "Contraer" : "Expandir"}
          onClick={() => setAbierta((valor) => !valor)}
          disabled={children.length === 0}
        >
          {children.length === 0 ? <span className="cat-tree__punto" /> : abierta ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <button
          type="button"
          className="cat-tree__nombre"
          onClick={() => onSeleccionar(categoria.id)}
          title={categoria.activa ? undefined : "Categoría inactiva"}
        >
          <span className={categoria.activa ? undefined : "cat-tree__inactiva"}>{categoria.nombre}</span>
          <span className="cat-tree__conteo">{conteos[categoria.id] ?? 0}</span>
          {!categoria.activa ? <span className="cat-tree__tag">inactiva</span> : null}
        </button>
        {puedeEditar ? (
          <span className="cat-tree__actions">
            <button type="button" className="cat-tree__action" title="Nueva subcategoría" onClick={() => onNueva(categoria.id)}>
              +
            </button>
            <button type="button" className="cat-tree__action" title="Renombrar" onClick={() => onEditar(categoria)}>
              ✎
            </button>
            <button type="button" className="cat-tree__action" title="Subir" onClick={() => onMover(categoria, -1)}>
              ↑
            </button>
            <button type="button" className="cat-tree__action" title="Bajar" onClick={() => onMover(categoria, 1)}>
              ↓
            </button>
            <button
              type="button"
              className="cat-tree__action"
              title={categoria.activa ? "Desactivar" : "Activar"}
              onClick={() => onAlternarActiva(categoria)}
            >
              {categoria.activa ? "⊘" : "✓"}
            </button>
          </span>
        ) : null}
      </div>
      {abierta && children.length > 0 ? (
        <ul className="cat-tree__lista">
          {children.map((hija) => (
            <NodoCategoria
              key={hija.id}
              categoria={hija}
              hijas={hijas}
              nivel={nivel + 1}
              seleccionada={seleccionada}
              conteos={conteos}
              puedeEditar={puedeEditar}
              onSeleccionar={onSeleccionar}
              onNueva={onNueva}
              onEditar={onEditar}
              onMover={onMover}
              onAlternarActiva={onAlternarActiva}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function MenuTree({ categorias, seleccionada, conteos, puedeEditar, onSeleccionar, onNueva, onEditar, onMover, onAlternarActiva }: MenuTreeProps) {
  const raices = categorias.filter((categoria) => !categoria.padreId)
  const hijas: Record<string, Categoria[]> = {}
  for (const categoria of categorias) {
    if (!categoria.padreId) continue
    hijas[categoria.padreId] = [...(hijas[categoria.padreId] ?? []), categoria]
  }

  /* Nota: los selectores de la tabla usan los campos compartidos. */

  return (
    <aside className="panel cat-tree">
      <div className="panel__header">
        <div>
          <div className="panel__title">Carta</div>
          <div className="panel__subtitle">Categorías y productos</div>
        </div>
        {puedeEditar ? (
          <Button variant="ghost" className="text-action" onClick={() => onNueva(null)}>
            <Plus size={14} /> Nueva
          </Button>
        ) : null}
      </div>
      <button
        type="button"
        className={`cat-tree__fila cat-tree__fila--raiz ${seleccionada === null ? "cat-tree__fila--activa" : ""}`}
        onClick={() => onSeleccionar(null)}
      >
        <span className="cat-tree__punto" />
        <span className="cat-tree__nombre">Toda la carta</span>
        <span className="cat-tree__conteo">{Object.values(conteos).reduce((total, valor) => total + valor, 0)}</span>
      </button>
      <ul className="cat-tree__lista">
        {raices.map((categoria) => (
          <NodoCategoria
            key={categoria.id}
            categoria={categoria}
            hijas={hijas}
            nivel={0}
            seleccionada={seleccionada}
            conteos={conteos}
            puedeEditar={puedeEditar}
            onSeleccionar={onSeleccionar}
            onNueva={onNueva}
            onEditar={onEditar}
            onMover={onMover}
            onAlternarActiva={onAlternarActiva}
          />
        ))}
      </ul>
    </aside>
  )
}

export function CategoriaDialog({
  abierto,
  categoria,
  categorias,
  padreInicial,
  guardando,
  onCerrar,
  onGuardar,
}: {
  abierto: boolean
  categoria: Categoria | null
  categorias: Categoria[]
  padreInicial: string | null
  guardando: boolean
  onCerrar: () => void
  onGuardar: (payload: { nombre: string; padreId: string | null; activa: boolean }) => void
}) {
  const [nombre, setNombre] = useState("")
  const [padreId, setPadreId] = useState("")
  const [activa, setActiva] = useState(true)

  useEffect(() => {
    if (!abierto) return
    setNombre(categoria?.nombre ?? "")
    setPadreId(categoria?.padreId ?? padreInicial ?? "")
    setActiva(categoria?.activa ?? true)
  }, [abierto, categoria, padreInicial])

  if (!abierto) return null

  const opciones = categorias
    .filter((item) => item.id !== categoria?.id)
    .map((item) => ({ value: item.id, label: item.nombre }))

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onCerrar} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={categoria ? "Editar categoría" : "Nueva categoría"}>
        <div className="modal__header">
          <span className="modal__icon">🗂</span>
          <div>
            <strong>{categoria ? "Editar categoría" : "Nueva categoría"}</strong>
            <p>Las categorías ordenan la carta en web, APK y KDS.</p>
          </div>
        </div>
        <div className="modal__body">
          <TextField label="Nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} />
          <SelectField
            label="Categoría padre"
            options={opciones}
            placeholder="Sin padre (raíz)"
            value={padreId}
            onChange={(event) => setPadreId(event.target.value)}
          />
          <label className="check-inline">
            <input type="checkbox" checked={activa} onChange={(event) => setActiva(event.target.checked)} />
            Categoría activa
          </label>
        </div>
        <div className="modal__footer">
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={guardando || nombre.trim().length < 2}
            onClick={() => onGuardar({ nombre: nombre.trim(), padreId: padreId || null, activa })}
          >
            {guardando ? "Guardando…" : "Guardar categoría"}
          </Button>
        </div>
      </div>
    </>
  )
}
