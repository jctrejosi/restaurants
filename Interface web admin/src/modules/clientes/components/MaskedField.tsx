import { useState } from "react"
import { Eye, Lock } from "lucide-react"
import { IconButton } from "@/components/ui/IconButton"
import { maskContact, maskName } from "@/lib/format"

/**
 * Muestra el valor enmascarado; si el rol tiene permiso, ofrece «Ver dato» y
 * registra el acceso a la consulta sensible (RN-R5-07, RNF-R5-09).
 */
export function MaskedField({
  label,
  campo,
  value,
  tipo = "contacto",
  puedeVer,
  onVer,
  ocupado,
  placeholder = "—",
}: {
  label: string
  campo: string
  value: string | null | undefined
  tipo?: "nombre" | "contacto"
  puedeVer: boolean
  onVer: (campo: string) => void
  ocupado?: boolean
  placeholder?: string
}) {
  const [revelado, setRevelado] = useState(false)

  const visible = !value ? placeholder : revelado ? value : tipo === "nombre" ? maskName(value) : maskContact(value)

  return (
    <div className="masked-field">
      <strong>{label}</strong>
      <span className="masked-field__row">
        <span className={revelado ? "masked-field__value masked-field__value--full" : "masked-field__value"}>
          {visible}
        </span>
        {puedeVer && value && !revelado ? (
          <IconButton
            label={`Ver ${label.toLowerCase()} (queda registrado)`}
            disabled={ocupado}
            className="masked-field__eye"
            onClick={() => {
              setRevelado(true)
              onVer(campo)
            }}
          >
            <Eye size={14} />
          </IconButton>
        ) : null}
        {!puedeVer && value ? (
          <span className="masked-field__lock" title="Requiere permiso de clientes.ver_pii">
            <Lock size={12} />
          </span>
        ) : null}
      </span>
    </div>
  )
}
