import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search } from "lucide-react"
import { AYUDA, MODULES, moduleForPath } from "@/app/nav"
import { useAuth } from "@/app/auth"
import { describePermiso } from "@/lib/permissions"

const TODOS = [...MODULES, AYUDA]

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [texto, setTexto] = useState("")
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { tienePermiso } = useAuth()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const enCampo = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA"
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((value) => !value)
      } else if (event.key === "/" && !enCampo && !open) {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  useEffect(() => {
    if (open) {
      setTexto("")
      setCursor(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const resultados = useMemo(() => {
    const consulta = texto.trim().toLowerCase()
    return TODOS.filter((modulo) => tienePermiso(modulo.permiso)).filter((modulo) =>
      consulta.length === 0
        ? true
        : modulo.nombre.toLowerCase().includes(consulta) ||
          modulo.descripcion.toLowerCase().includes(consulta) ||
          modulo.rutas.some((ruta) => ruta.includes(consulta)),
    ).slice(0, 8)
  }, [texto, tienePermiso])

  const abrir = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <>
      <button type="button" className="button button--ghost search-box" onClick={() => setOpen(true)}>
        <Search size={17} />
        <span>Buscar pedidos, reservas, clientes…</span>
        <kbd>⌘ K</kbd>
      </button>

      {open ? (
        <>
          <div className="cmdk-backdrop" role="presentation" onClick={() => setOpen(false)} />
          <div className="cmdk" role="dialog" aria-modal="true" aria-label="Búsqueda global">
            <div className="cmdk__head">
              <Search size={17} />
              <input
                ref={inputRef}
                className="cmdk__input"
                placeholder="Buscar módulos, pedidos, reservas, clientes…"
                value={texto}
                onChange={(event) => {
                  setTexto(event.target.value)
                  setCursor(0)
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault()
                    setCursor((value) => Math.min(value + 1, resultados.length - 1))
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault()
                    setCursor((value) => Math.max(value - 1, 0))
                  } else if (event.key === "Enter" && resultados[cursor]) {
                    abrir(resultados[cursor].path)
                  } else if (event.key === "Escape") {
                    setOpen(false)
                  }
                }}
              />
              <kbd>esc</kbd>
            </div>
            <div className="cmdk__list">
              {resultados.length === 0 ? (
                <p className="cmdk__empty">Sin resultados para «{texto}».</p>
              ) : (
                resultados.map((modulo, index) => {
                  const Icon = modulo.icon
                  return (
                    <button
                      key={modulo.path}
                      type="button"
                      className={`cmdk__item ${index === cursor ? "cmdk__item--active" : ""}`}
                      onMouseEnter={() => setCursor(index)}
                      onClick={() => abrir(modulo.path)}
                    >
                      <Icon size={17} />
                      <span>
                        <strong>{modulo.nombre}</strong>
                        <small>{modulo.bloque}</small>
                      </span>
                      <em>{modulo.rutas[0]}</em>
                    </button>
                  )
                })
              )}
            </div>
            <div className="cmdk__foot">
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> navegar · <kbd>↵</kbd> abrir
              </span>
              <span>{moduleForPath(window.location.pathname)?.nombre ?? "Inicio"}</span>
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}

export { describePermiso }
