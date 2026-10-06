import { useEffect, useState } from "react"
import { Link2, Scissors } from "lucide-react"
import { useAuth } from "@/app/auth"
import { DataTable, type Column } from "@/components/data/DataTable"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { SelectField, type SelectOption } from "@/components/ui/fields"
import { EmptyState } from "@/components/ui/states"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { useDividirUnion, useUnirMesas } from "@/modules/salon/api"
import { MESA_ESTADO_LABEL, MESA_ESTADO_TONE, type SalonMapa, type UnionMesa } from "@/modules/salon/types"

type FilaUnion = {
  union: UnionMesa
  zonaNombre: string
  mesas: string
  capacidad: number
  estado: string
  estadoTone: "green" | "amber" | "blue" | "gray" | "outline"
}

/**
 * Uniones y divisiones de mesas (V1, RF-R5-22). Supuesto del plan: requiere una
 * tabla nueva de composiciones; aquí se simula con configuraciones guardadas.
 */
export function UnionEditor({ mapa }: { mapa: SalonMapa }) {
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const unir = useUnirMesas()
  const dividir = useDividirUnion()
  const puedeUniones = tienePermiso("salon.uniones")

  const [zonaId, setZonaId] = useState(mapa.zonas[0]?.id ?? "")
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [porDividir, setPorDividir] = useState<UnionMesa | null>(null)

  useEffect(() => {
    if (!mapa.zonas.some((zona) => zona.id === zonaId)) setZonaId(mapa.zonas[0]?.id ?? "")
  }, [mapa.zonas, zonaId])

  const unidas = new Set(mapa.uniones.flatMap((union) => union.mesaIds))
  const mesasZona = mapa.mesas.filter((mesa) => mesa.zonaId === zonaId)

  const opcionesZona: SelectOption[] = mapa.zonas.map((zona) => ({ value: zona.id, label: zona.nombre }))

  const filas: FilaUnion[] = mapa.uniones.map((union) => {
    const mesas = union.mesaIds.map((id) => mapa.mesas.find((mesa) => mesa.id === id)).filter(Boolean)
    const estados = new Set(mesas.map((mesa) => mesa?.estado))
    const estado = estados.size === 1 ? (mesas[0]?.estado ?? "libre") : "mixto"
    return {
      union,
      zonaNombre: mapa.zonas.find((zona) => zona.id === union.zonaId)?.nombre ?? "—",
      mesas: mesas.map((mesa) => `Mesa ${mesa?.numero}`).join(" + "),
      capacidad: mesas.reduce((total, mesa) => total + (mesa?.capacidad ?? 0), 0),
      estado,
      estadoTone: estado === "mixto" ? "outline" : MESA_ESTADO_TONE[estado as keyof typeof MESA_ESTADO_TONE] ?? "outline",
    }
  })

  const columnas: Column<FilaUnion>[] = [
    { key: "nombre", header: "Configuración", cell: (fila) => fila.union.nombre },
    { key: "zona", header: "Zona", cell: (fila) => fila.zonaNombre },
    { key: "mesas", header: "Mesas", cell: (fila) => fila.mesas },
    { key: "capacidad", header: "Capacidad total", align: "right", cell: (fila) => fila.capacidad },
    {
      key: "estado",
      header: "Estado",
      cell: (fila) => (
        <StatusBadge tone={fila.estadoTone}>
          {fila.estado === "mixto" ? "Mixto" : MESA_ESTADO_LABEL[fila.estado as keyof typeof MESA_ESTADO_LABEL]}
        </StatusBadge>
      ),
    },
    {
      key: "acciones",
      header: "",
      cell: (fila) => (
        <Button
          variant="ghost"
          className="text-action"
          disabled={!puedeUniones}
          title={!puedeUniones ? "Requiere permiso de salon.uniones" : "Dividir la unión"}
          onClick={() => setPorDividir(fila.union)}
        >
          <Scissors size={13} /> Dividir
        </Button>
      ),
    },
  ]

  return (
    <div className="salon-uniones">
      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="panel__title">Crear unión de mesas</div>
            <div className="panel__subtitle">La configuración se refleja en el APK; se validan solapes y mesa repetida</div>
          </div>
        </div>
        <div className="salon-uniones__form">
          <SelectField
            label="Zona"
            options={opcionesZona}
            value={zonaId}
            onChange={(event) => {
              setZonaId(event.target.value)
              setSeleccion([])
            }}
          />
          <div className="salon-uniones__mesas">
            {mesasZona.map((mesa) => {
              const yaUnida = unidas.has(mesa.id)
              return (
                <label className={`salon-check ${yaUnida ? "salon-check--disabled" : ""}`} key={mesa.id}>
                  <input
                    type="checkbox"
                    disabled={yaUnida || !puedeUniones}
                    checked={seleccion.includes(mesa.id)}
                    onChange={() =>
                      setSeleccion((actual) =>
                        actual.includes(mesa.id) ? actual.filter((id) => id !== mesa.id) : [...actual, mesa.id],
                      )
                    }
                  />
                  Mesa {mesa.numero} · {mesa.capacidad} pax
                  {yaUnida ? " (ya unida)" : ""}
                </label>
              )
            })}
          </div>
          <Button
            variant="primary"
            disabled={seleccion.length < 2 || !puedeUniones || unir.isPending}
            title={!puedeUniones ? "Requiere permiso de salon.uniones" : undefined}
            onClick={() =>
              unir.mutate(
                { mesaIds: seleccion },
                {
                  onSuccess: (union) => {
                    mostrar(`Unión «${union.nombre}» guardada (V1).`, "exito")
                    setSeleccion([])
                  },
                  onError: (error) => mostrar(error instanceof ApiError ? error.message : "No se pudieron unir las mesas.", "error"),
                },
              )
            }
          >
            <Link2 size={15} /> {unir.isPending ? "Guardando…" : `Unir ${seleccion.length || ""} mesas`}
          </Button>
        </div>
      </section>

      <section className="panel">
        {mapa.uniones.length === 0 ? (
          <EmptyState
            title="Sin configuraciones de mesas unidas"
            description="Selecciona dos o más mesas de la misma zona para guardar la primera unión (V1)."
          />
        ) : (
          <DataTable
            columns={columnas}
            rows={filas}
            getRowKey={(fila) => fila.union.id}
            emptyTitle="Sin uniones"
          />
        )}
      </section>

      <ConfirmDialog
        open={Boolean(porDividir)}
        title={porDividir ? `Dividir «${porDividir.nombre}»` : "Dividir unión"}
        description="Las mesas vuelven a operar sueltas; la unión deja de reflejarse en el APK."
        impacto={porDividir ? `Configuración de ${porDividir.mesaIds.length} mesas.` : undefined}
        confirmLabel="Dividir unión"
        onCancel={() => setPorDividir(null)}
        onConfirm={(motivo) => {
          if (!porDividir) return
          dividir.mutate(
            { id: porDividir.id, motivo },
            {
              onSuccess: () => mostrar("Unión dividida y auditada.", "exito"),
              onError: (error) => mostrar(error instanceof ApiError ? error.message : "No se pudo dividir la unión.", "error"),
              onSettled: () => setPorDividir(null),
            },
          )
        }}
      />
    </div>
  )
}
