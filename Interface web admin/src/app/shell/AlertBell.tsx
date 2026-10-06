import { useEffect, useState } from "react"
import { AlertTriangle, Bell } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { alertasPendientes, SEVERIDAD_LABEL, useAlertas, type AlertaOperativa } from "@/app/alerts"
import { Drawer } from "@/components/ui/Drawer"
import { IconButton } from "@/components/ui/IconButton"
import { Button } from "@/components/ui/Button"
import { formatRelative } from "@/lib/format"

function rutaDeAlerta(alerta: AlertaOperativa): string {
  switch (alerta.entidad) {
    case "comanda":
      return `/comandas/${alerta.entidadId ?? ""}`
    case "turno":
      return "/caja"
    case "dispositivo":
      return "/dispositivos"
    default:
      return "/en-vivo"
  }
}

export function AlertBell() {
  const { data } = useAlertas()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const pendientes = alertasPendientes(data)
  const criticas = pendientes.filter((alerta) => alerta.severidad === "critica").length

  useEffect(() => {
    const abrir = () => setOpen(true)
    window.addEventListener("pc:abrir-alertas", abrir)
    return () => window.removeEventListener("pc:abrir-alertas", abrir)
  }, [])

  return (
    <>
      <IconButton label="Alertas" className="notification-button" onClick={() => setOpen(true)}>
        <Bell size={19} />
        {pendientes.length > 0 ? <span className="notification-dot">{pendientes.length}</span> : null}
      </IconButton>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Alertas operativas"
        subtitle={
          pendientes.length > 0
            ? `${pendientes.length} pendientes · ${criticas} críticas`
            : "Sin pendientes"
        }
        ariaLabel="Alertas operativas"
        width={420}
      >
        {pendientes.length === 0 ? (
          <p className="drawer__note">No hay alertas pendientes. Todo en orden.</p>
        ) : (
          pendientes.map((alerta) => (
            <div className="drawer-alert" key={alerta.id}>
              <span className={`alert-icon alert-icon--${alerta.severidad}`}>
                <AlertTriangle size={17} />
              </span>
              <div>
                <strong>{alerta.titulo}</strong>
                <span>{alerta.detalle}</span>
                <small>
                  {SEVERIDAD_LABEL[alerta.severidad]} · {formatRelative(alerta.creadaEn)}
                </small>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setOpen(false)
                  navigate(rutaDeAlerta(alerta))
                }}
              >
                Atender
              </Button>
            </div>
          ))
        )}
        <div className="drawer__note">
          Todas las acciones quedan registradas en auditoría.
        </div>
      </Drawer>
    </>
  )
}
