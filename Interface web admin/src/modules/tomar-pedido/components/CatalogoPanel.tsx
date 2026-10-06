import { useMemo, type RefObject } from "react"
import { Search } from "lucide-react"
import { Tabs } from "@/components/data/Tabs"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { Skeleton } from "@/components/ui/Skeleton"
import { ProductoCard } from "@/modules/tomar-pedido/components/ProductoCard"
import type { CategoriaCarta, ProductoCarta } from "@/modules/tomar-pedido/types"

/**
 * Columna izquierda del POS: categorías como pestañas, buscador (F2) y grid de
 * productos con precio vigente y agotados no agregables (plan §3 y §8).
 */
export function CatalogoPanel({
  categorias,
  productos,
  cargando,
  error,
  onReintentar,
  categoriaId,
  busqueda,
  onCategoria,
  onBusqueda,
  buscadorRef,
  puedeAgregar,
  moneda,
  onAgregar,
  onPersonalizar,
  onAgotado,
  onSinPermiso,
}: {
  categorias: CategoriaCarta[]
  productos: ProductoCarta[]
  cargando: boolean
  error: boolean
  onReintentar: () => void
  categoriaId: string
  busqueda: string
  onCategoria: (id: string) => void
  onBusqueda: (texto: string) => void
  buscadorRef: RefObject<HTMLInputElement | null>
  puedeAgregar: boolean
  moneda?: string
  onAgregar: (producto: ProductoCarta) => void
  onPersonalizar: (producto: ProductoCarta) => void
  onAgotado: (producto: ProductoCarta) => void
  onSinPermiso?: () => void
}) {
  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return productos.filter((producto) => {
      if (categoriaId !== "todas" && producto.categoriaId !== categoriaId) return false
      if (!texto) return true
      return (
        producto.nombre.toLowerCase().includes(texto) ||
        producto.descripcion.toLowerCase().includes(texto) ||
        producto.sku.toLowerCase().includes(texto)
      )
    })
  }, [productos, categoriaId, busqueda])

  const disponibles = productos.filter((producto) => !producto.agotado.agotado).length
  const agotados = productos.length - disponibles

  const tabs = [
    { id: "todas", label: "Todas", badge: String(productos.length) },
    ...categorias.map((categoria) => ({
      id: categoria.id,
      label: categoria.nombre,
      badge: String(categoria.conteo),
    })),
  ]

  return (
    <section className="panel tp-catalogo">
      <div className="tp-catalogo__cabecera">
        <div>
          <div className="panel__title">Carta</div>
          <div className="panel__subtitle">
            {disponibles} disponibles · {agotados} agotados · precios de la sede activa
          </div>
        </div>
        <label className="field tp-buscador">
          <span className="field__label">Buscar (F2)</span>
          <span className="tp-buscador__control">
            <Search size={14} />
            <input
              ref={buscadorRef}
              className="input"
              type="search"
              placeholder="Producto o SKU…"
              value={busqueda}
              onChange={(event) => onBusqueda(event.target.value)}
            />
          </span>
        </label>
      </div>

      <div className="tp-catalogo__tabs">
        <Tabs tabs={tabs} value={categoriaId} onChange={onCategoria} />
      </div>

      {error ? (
        <div className="tp-catalogo__estado">
          <ErrorState
            title="No pudimos cargar la carta"
            description="Revisa tu conexión e inténtalo de nuevo; el carrito abierto no se pierde."
            onRetry={onReintentar}
          />
        </div>
      ) : cargando ? (
        <div className="tp-grid" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, indice) => (
            <div className="tp-producto tp-producto--esqueleto" key={indice}>
              <Skeleton height={14} width="70%" />
              <Skeleton height={11} width="90%" />
              <Skeleton height={11} width="55%" />
              <Skeleton height={20} width="45%" />
            </div>
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <div className="tp-catalogo__estado">
          <EmptyState
            title="Sin productos en esta vista"
            description="Prueba otra categoría o limpia la búsqueda para ver más resultados."
            action={{ label: "Limpiar búsqueda", onClick: () => onBusqueda("") }}
          />
        </div>
      ) : (
        <div className="tp-grid">
          {visibles.map((producto) => (
            <ProductoCard
              key={producto.id}
              producto={producto}
              moneda={moneda}
              puedeAgregar={puedeAgregar}
              onAgregar={onAgregar}
              onPersonalizar={onPersonalizar}
              onAgotado={onAgotado}
              onSinPermiso={onSinPermiso}
            />
          ))}
        </div>
      )}
    </section>
  )
}
