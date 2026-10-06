import { useMemo, useState } from "react"
import { ChevronRight, Ellipsis, Wifi } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/Button"
import { IconButton } from "@/components/ui/IconButton"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { DurationCell, MoneyCell } from "@/components/data/cells"
import { MODALIDAD_LABEL, type Modalidad, type PedidoActivo } from "@/modules/en-vivo/types"

type Filtro = "todos" | Modalidad

export function OrdersPanel({ pedidos }: { pedidos: PedidoActivo[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const navigate = useNavigate()

  const conteos = useMemo(
    () => ({
      todos: pedidos.length,
      mesa: pedidos.filter((pedido) => pedido.modalidad === "mesa").length,
      recoger: pedidos.filter((pedido) => pedido.modalidad === "recoger").length,
      domicilio: pedidos.filter((pedido) => pedido.modalidad === "domicilio").length,
    }),
    [pedidos],
  )

  const visibles = filtro === "todos" ? pedidos : pedidos.filter((pedido) => pedido.modalidad === filtro)

  const filtros: { key: Filtro; label: string }[] = [
    { key: "todos", label: `Todos · ${conteos.todos}` },
    { key: "mesa", label: `${MODALIDAD_LABEL.mesa} · ${conteos.mesa}` },
    { key: "recoger", label: `${MODALIDAD_LABEL.recoger} · ${conteos.recoger}` },
    { key: "domicilio", label: `${MODALIDAD_LABEL.domicilio} · ${conteos.domicilio}` },
  ]

  return (
    <section className="panel orders-panel">
      <div className="panel__header panel__header--stack">
        <div>
          <div className="panel__title">Pedidos activos</div>
          <div className="panel__subtitle">{conteos.todos} pedidos en curso en todos los canales</div>
        </div>
        <Button variant="ghost" className="text-action" onClick={() => navigate("/pedidos")}>
          Ver todos <ChevronRight size={15} />
        </Button>
      </div>

      <div className="filter-tabs">
        {filtros.map((item) => (
          <Button
            variant="ghost"
            key={item.key}
            className={`filter-tab ${filtro === item.key ? "filter-tab--active" : ""}`}
            onClick={() => setFiltro(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Origen</th>
              <th>Tiempo</th>
              <th>Estado</th>
              <th className="cell-right">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((pedido) => (
              <tr
                key={pedido.id}
                className="row--clickable"
                onClick={() => navigate(`/pedidos/${pedido.id}`)}
              >
                <td>
                  <span className="order-id">{pedido.folio}</span>
                  <span className="order-type">{pedido.etiqueta}</span>
                </td>
                <td>{pedido.canal}</td>
                <td>
                  <DurationCell
                    segundos={pedido.transcurridoSeg}
                    objetivoSeg={pedido.slaSeg}
                    titulo="Tiempo transcurrido desde la creación"
                  />
                </td>
                <td>
                  <StatusBadge tone={pedido.estadoTone}>{pedido.estado}</StatusBadge>
                </td>
                <td className="cell-right">
                  <MoneyCell centavos={pedido.totalCentavos} />
                </td>
                <td>
                  <IconButton label={`Opciones de ${pedido.folio}`}>
                    <Ellipsis size={17} />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel__footer">
        <span>
          <Wifi size={13} /> Actualización automática
        </span>
        <span>
          Mostrando {visibles.length} de {conteos.todos}
        </span>
      </div>
    </section>
  )
}
