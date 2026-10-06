import { useEffect, useState } from "react"
import { UserPlus } from "lucide-react"
import { ApiError } from "@/lib/api"
import { initials } from "@/lib/format"
import { Button } from "@/components/ui/Button"
import { Drawer } from "@/components/ui/Drawer"
import { TextField } from "@/components/ui/fields"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SkeletonRows } from "@/components/ui/Skeleton"
import { EmptyState, ErrorState } from "@/components/ui/states"
import { useToast } from "@/components/ui/toast"
import { useBuscarClientes, useCrearCliente } from "@/modules/tomar-pedido/api"
import type { ClienteResumen } from "@/modules/tomar-pedido/types"

/**
 * Búsqueda de cliente por teléfono/nombre con alta rápida. Un cliente con
 * opt-out se puede buscar y usar para la venta, pero sin acciones de marketing.
 */
export function ClientePicker({
  open,
  onClose,
  seleccionado,
  onSeleccionar,
}: {
  open: boolean
  onClose: () => void
  seleccionado: ClienteResumen | null
  onSeleccionar: (cliente: ClienteResumen | null) => void
}) {
  const { mostrar } = useToast()
  const [q, setQ] = useState("")
  const [altaRapida, setAltaRapida] = useState(false)
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [aceptaMarketing, setAceptaMarketing] = useState(false)

  const busqueda = useBuscarClientes(q)
  const crear = useCrearCliente()

  useEffect(() => {
    if (!open) return
    setQ("")
    setAltaRapida(false)
    setNombre("")
    setTelefono("")
    setAceptaMarketing(false)
  }, [open])

  const telefonoDigitos = telefono.replace(/\D/g, "")
  const altaValida = nombre.trim().length >= 3 && telefonoDigitos.length >= 10

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Elegir cliente"
      subtitle="Búsqueda por nombre o teléfono; la venta no exige consentimiento de marketing"
      width={480}
    >
      <button
        type="button"
        className={`button tp-cliente ${!seleccionado ? "tp-cliente--actual" : ""}`}
        onClick={() => {
          onSeleccionar(null)
          onClose()
        }}
      >
        <span className="avatar avatar--soft">PG</span>
        <span className="tp-cliente__datos">
          <strong>Público general</strong>
          <small>Sin datos de cliente ni historial</small>
        </span>
      </button>

      <TextField
        label="Buscar cliente"
        placeholder="Nombre o teléfono (mín. 2 caracteres)"
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />

      {q.trim().length < 2 ? (
        <p className="tp-clientes__hint">Escribe al menos 2 caracteres para buscar en el padrón.</p>
      ) : busqueda.isLoading ? (
        <SkeletonRows rows={3} columns={2} />
      ) : busqueda.isError ? (
        <ErrorState title="No pudimos buscar clientes" onRetry={() => void busqueda.refetch()} />
      ) : (busqueda.data ?? []).length === 0 ? (
        <EmptyState
          title="Sin coincidencias"
          description="Revisa el teléfono o da de alta al cliente con «Alta rápida»."
        />
      ) : (
        <div className="tp-clientes">
          {(busqueda.data ?? []).map((cliente) => (
            <button
              key={cliente.id}
              type="button"
              className={`button tp-cliente ${seleccionado?.id === cliente.id ? "tp-cliente--actual" : ""}`}
              onClick={() => {
                onSeleccionar(cliente)
                onClose()
              }}
            >
              <span className="avatar avatar--soft">{initials(cliente.nombre)}</span>
              <span className="tp-cliente__datos">
                <strong>{cliente.nombre}</strong>
                <small>
                  {cliente.telefono} · {cliente.visitas} visita(s)
                  {cliente.direccion ? " · con dirección" : ""}
                </small>
              </span>
              {cliente.optOutMarketing ? (
                <StatusBadge tone="amber" title="Opt-out: sin acciones de marketing">
                  Sin marketing
                </StatusBadge>
              ) : null}
            </button>
          ))}
        </div>
      )}

      <div className="tp-alta-rapida">
        <Button variant="secondary" onClick={() => setAltaRapida((valor) => !valor)}>
          <UserPlus size={15} /> {altaRapida ? "Cancelar alta rápida" : "Alta rápida"}
        </Button>
        {altaRapida ? (
          <div className="tp-alta-rapida__form">
            <TextField
              label="Nombre"
              placeholder="Nombre y apellido"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
            />
            <TextField
              label="Teléfono"
              placeholder="10 dígitos"
              inputMode="tel"
              value={telefono}
              onChange={(event) => setTelefono(event.target.value)}
            />
            <label className="tp-check">
              <input
                type="checkbox"
                checked={aceptaMarketing}
                onChange={(event) => setAceptaMarketing(event.target.checked)}
              />
              Acepta recibir promociones (si no, queda con opt-out)
            </label>
            <Button
              variant="primary"
              disabled={!altaValida || crear.isPending}
              title={altaValida ? undefined : "Nombre (mín. 3) y teléfono de 10 dígitos"}
              onClick={() => {
                crear.mutate(
                  {
                    nombre: nombre.trim(),
                    telefono: telefonoDigitos,
                    aceptaMarketing,
                  },
                  {
                    onSuccess: (cliente) => {
                      mostrar(`Cliente ${cliente.nombre} dado de alta.`, "exito")
                      onSeleccionar(cliente)
                      onClose()
                    },
                    onError: (error) =>
                      mostrar(
                        error instanceof ApiError ? error.message : "No se pudo dar de alta al cliente.",
                        "error",
                      ),
                  },
                )
              }}
            >
              {crear.isPending ? "Guardando…" : "Guardar cliente"}
            </Button>
          </div>
        ) : null}
      </div>
    </Drawer>
  )
}
