import { Check, ChevronsUpDown, Store } from "lucide-react"
import { useSede } from "@/app/sede"
import { Button } from "@/components/ui/Button"
import { usePopover } from "@/components/ui/usePopover"

export function SedeSelector() {
  const { sedes, sedeId, sede, esGlobal, setSedeId } = useSede()
  const { open, setOpen, ref } = usePopover<HTMLDivElement>()

  const etiqueta = esGlobal ? "Todas las sedes" : (sede?.nombre ?? "Selecciona sede")

  return (
    <div className="branch-picker" ref={ref}>
      <Button variant="ghost" className="branch-button" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="branch-icon">
          <Store size={16} />
        </span>
        <span>
          <small>Sede activa</small>
          <strong>{etiqueta}</strong>
        </span>
        <ChevronsUpDown size={15} />
      </Button>
      {open ? (
        <div className="popover branch-popover" role="menu">
          {sedes.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`button button--ghost ${sedeId === item.id ? "selected" : ""}`}
              onClick={() => {
                setSedeId(item.id)
                setOpen(false)
              }}
            >
              <Store size={15} /> {item.nombre}
              {sedeId === item.id ? <Check size={14} /> : null}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            className={`button button--ghost ${esGlobal ? "selected" : ""}`}
            onClick={() => {
              setSedeId(null)
              setOpen(false)
            }}
          >
            Todas las sedes
            {esGlobal ? <Check size={14} /> : null}
          </button>
        </div>
      ) : null}
    </div>
  )
}
