import { useState } from "react"
import { Building2, MapPin, Plus, Phone } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { SkeletonCards } from "@/components/ui/Skeleton"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { useCrearSucursal, useSucursales } from "@/modules/ajustes/api"
import { StoreBranchWizard } from "@/modules/ajustes/components/StoreBranchWizard"
import { useSede } from "@/app/sede"

function mensajeError(error: unknown): string {
  return error instanceof ApiError ? error.message : "Ocurrió un error inesperado"
}

/** Pestaña «Sucursales»: sedes en alcance y alta con clonado (V1, RF-R5-164). */
export function SucursalesTab({ puedeCrear }: { puedeCrear: boolean }) {
  const { mostrar } = useToast()
  const { sedeId, setSedeId } = useSede()
  const sucursales = useSucursales()
  const crear = useCrearSucursal()
  const [wizard, setWizard] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (sucursales.isLoading) return <SkeletonCards count={3} />
  if (sucursales.isError) {
    return <ErrorState description="No pudimos cargar las sucursales." onRetry={() => void sucursales.refetch()} />
  }

  const sedes = sucursales.data?.data ?? []

  return (
    <div className="ajustes-tab">
      <section className="panel ajustes-seccion">
        <div className="panel__header">
          <div>
            <div className="panel__title">
              <Building2 size={14} /> Sucursales
            </div>
            <div className="panel__subtitle">
              El gerente ve su sede; el administrador global, todas y el alta con clonado.
            </div>
          </div>
          <Button
            variant="primary"
            disabled={!puedeCrear}
            title={puedeCrear ? undefined : "Requiere permiso de sucursales.crear"}
            onClick={() => {
              setError(null)
              setWizard(true)
            }}
          >
            <Plus size={15} /> Nueva sucursal
          </Button>
        </div>

        {sedes.length === 0 ? (
          <EmptyState
            title="Sin sucursales en alcance"
            description="Crea la primera sede para configurar su operación."
            action={puedeCrear ? { label: "Nueva sucursal", onClick: () => setWizard(true) } : undefined}
          />
        ) : (
          <div className="sucursales-grid">
            {sedes.map((sede) => (
              <article className={`sucursal-card ${sede.id === sedeId ? "sucursal-card--activa" : ""}`} key={sede.id}>
                <header>
                  <div>
                    <strong>{sede.nombre}</strong>
                    <small>
                      {sede.codigo} · {sede.ciudad}
                    </small>
                  </div>
                  <StatusBadge tone={sede.activa ? "green" : "gray"}>
                    {sede.activa ? "Activa" : "Inactiva"}
                  </StatusBadge>
                </header>
                <p>
                  <MapPin size={12} /> {sede.direccion || "Sin dirección"}
                </p>
                <p>
                  <Phone size={12} /> {sede.telefono || "Sin teléfono"} · {sede.zonaHoraria} · {sede.moneda}
                </p>
                <footer>
                  <Button
                    variant="ghost"
                    className="text-action"
                    onClick={() => setSedeId(sede.id)}
                    disabled={sede.id === sedeId}
                  >
                    {sede.id === sedeId ? "Sede activa" : "Trabajar en esta sede"}
                  </Button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      <StoreBranchWizard
        open={wizard}
        sedes={sedes}
        guardando={crear.isPending}
        errorServidor={error}
        onClose={() => setWizard(false)}
        onConfirm={(payload) => {
          setError(null)
          crear.mutate(payload, {
            onSuccess: (respuesta) => {
              mostrar(`Sucursal ${respuesta.sucursal.nombre} creada con configuración heredada`, "exito")
              setWizard(false)
            },
            onError: (err) => setError(mensajeError(err)),
          })
        }}
      />
    </div>
  )
}
