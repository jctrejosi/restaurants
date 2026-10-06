import { formatMoney } from "@/lib/format"

/* -------------------------------------------------------------------------- */
/* Diff antes/después (RF-R5-132): precios, estados, pagos y descuentos        */
/* -------------------------------------------------------------------------- */

function etiquetaCampo(clave: string): string {
  return clave
    .replace(/_centavos$/, " (importe)")
    .replace(/_/g, " ")
    .replace(/^\w/, (letra) => letra.toUpperCase())
}

function formatearValor(clave: string, valor: unknown): string {
  if (valor === null || valor === undefined) return "—"
  if (typeof valor === "boolean") return valor ? "Sí" : "No"
  if (typeof valor === "number") {
    return clave.endsWith("_centavos") ? formatMoney(valor) : String(valor)
  }
  if (Array.isArray(valor)) return valor.length === 0 ? "—" : valor.join(", ")
  if (typeof valor === "object") return JSON.stringify(valor)
  return String(valor)
}

export function BeforeAfterDiff({
  antes,
  despues,
}: {
  antes: Record<string, unknown> | null
  despues: Record<string, unknown> | null
}) {
  if (!antes && !despues) {
    return (
      <p className="audit-diff__empty">
        Este hito no documenta antes/después (evento de bitácora o consulta).
      </p>
    )
  }

  const claves = [...new Set([...Object.keys(antes ?? {}), ...Object.keys(despues ?? {})])]
  const cambios = claves.filter((clave) => {
    const a = antes?.[clave]
    const d = despues?.[clave]
    return JSON.stringify(a) !== JSON.stringify(d)
  })

  const creado = !antes
  const esCreacion = creado && Boolean(despues)

  return (
    <div className="audit-diff">
      {esCreacion ? <span className="audit-diff__created">Creado</span> : null}
      {cambios.length === 0 ? (
        <p className="audit-diff__empty">Sin cambios de campos entre antes y después.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Campo</th>
              <th>Antes</th>
              <th>Después</th>
            </tr>
          </thead>
          <tbody>
            {cambios.map((clave) => (
              <tr key={clave}>
                <td>{etiquetaCampo(clave)}</td>
                <td className="audit-diff__antes">
                  {antes ? formatearValor(clave, antes[clave]) : <span className="audit-diff__missing">—</span>}
                </td>
                <td className="audit-diff__despues">{despues ? formatearValor(clave, despues[clave]) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
