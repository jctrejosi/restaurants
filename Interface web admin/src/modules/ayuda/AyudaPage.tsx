import { BookOpen, Keyboard, LifeBuoy } from "lucide-react"
import { PageHeader } from "@/components/data/PageHeader"

const ATAJOS: { teclas: string; accion: string }[] = [
  { teclas: "⌘ K / Ctrl K", accion: "Abrir la búsqueda global" },
  { teclas: "/", accion: "Enfocar la búsqueda" },
  { teclas: "↑ ↓", accion: "Navegar por los resultados" },
  { teclas: "↵", accion: "Abrir el resultado seleccionado" },
  { teclas: "Esc", accion: "Cerrar el panel o diálogo activo" },
]

/**
 * Pantalla auxiliar (plan 05 §4.1): documenta los atajos y da salida a las guías
 * y al soporte. No tiene RF propio.
 */
export default function AyudaPage() {
  return (
    <div className="module-page">
      <PageHeader
        eyebrow="Ayuda / Ayuda y soporte"
        title="Ayuda y soporte"
        subtitle="Atajos, guías de operación y contacto con soporte."
      />

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">
              <Keyboard size={15} /> Atajos de teclado
            </div>
            <div className="panel__subtitle">Disponibles en todo el panel</div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 180 }}>Teclas</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {ATAJOS.map((atajo) => (
                <tr key={atajo.teclas}>
                  <td>
                    <code>{atajo.teclas}</code>
                  </td>
                  <td>{atajo.accion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">
              <BookOpen size={15} /> Guías y planes
            </div>
            <div className="panel__subtitle">Documentación de cada módulo</div>
          </div>
        </div>
        <div className="drawer__body" style={{ paddingTop: 0 }}>
          <p className="panel__subtitle">
            Los planes de implementación viven en{" "}
            <code>docs/arquitectura/plans/admin-modules/</code> y el brief de diseño en{" "}
            <code>docs/arquitectura/plans/front/05-plan-panel-administracion.md</code>. Cada módulo
            incluye sus rutas, API, permisos y criterios de aceptación.
          </p>
          <p className="panel__subtitle">
            <strong>Regla de tiempos:</strong> los tramos se calculan con sellos del servidor; si
            falta el evento de cierre se muestra «—» y no promedia.
          </p>
          <p className="panel__subtitle">
            <strong>Trazabilidad:</strong> desde cualquier pedido o reserva se llega a su bitácora en
            un clic; las acciones sensibles piden motivo y quedan auditadas.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">
              <LifeBuoy size={15} /> Contacto de soporte
            </div>
            <div className="panel__subtitle">Supuesto: pendiente de definir con el cliente</div>
          </div>
        </div>
        <div className="drawer__body" style={{ paddingTop: 0 }}>
          <p className="panel__subtitle">
            Escribe a <code>soporte@puntoc.mx</code> o usa el canal de soporte del proyecto. Para
            incidencias de impresión adjunta el resultado del diagnóstico de{" "}
            <code>/estaciones</code>; para dispositivos, el diagnóstico de <code>/dispositivos</code>.
          </p>
        </div>
      </section>
    </div>
  )
}
