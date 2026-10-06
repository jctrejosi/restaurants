/**
 * Formulario de cupón (RF-R5-101): código, tipo y valor, vigencia, usos máximos
 * y control de abuso (máximo por cliente). `UsageBar` muestra el consumo y el
 * detalle explica por qué un cupón agotado no aplica.
 */

import { useEffect, useState } from "react"
import { Save } from "lucide-react"
import { useSede } from "@/app/sede"
import { useAuth } from "@/app/auth"
import { Button } from "@/components/ui/Button"
import { Drawer } from "@/components/ui/Drawer"
import { SelectField, TextField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { formatMoney } from "@/lib/format"
import { useGuardarCupon } from "@/modules/promociones/api"
import { CUPON_TIPO_LABEL, type Cupon, type CuponTipo } from "@/modules/promociones/types"

function aInputLocal(iso: string): string {
  const fecha = new Date(iso)
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function aIso(valor: string, respaldo: string): string {
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? respaldo : fecha.toISOString()
}

export function UsageBar({ usos, maximo }: { usos: number; maximo: number }) {
  const porcentaje = maximo > 0 ? Math.min(100, Math.round((usos / maximo) * 100)) : 0
  const agotado = usos >= maximo
  return (
    <span className="cupon-uso">
      <span className="cupon-uso__track">
        <span
          className={`cupon-uso__fill ${agotado ? "cupon-uso__fill--agotado" : ""}`}
          style={{ width: `${porcentaje}%` }}
        />
      </span>
      <small>
        {usos} / {maximo} usos
      </small>
    </span>
  )
}

export function CouponForm({
  abierto,
  cupon,
  onCerrar,
  onGuardado,
}: {
  abierto: boolean
  cupon: Cupon | null
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}) {
  const { sedes } = useSede()
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const guardar = useGuardarCupon()

  const [codigo, setCodigo] = useState("")
  const [tipo, setTipo] = useState<CuponTipo>("porcentaje")
  const [valorPorcentaje, setValorPorcentaje] = useState("10")
  const [valorMonto, setValorMonto] = useState("50.00")
  const [sucursalId, setSucursalId] = useState("")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [usosMaximo, setUsosMaximo] = useState("100")
  const [maximoPorCliente, setMaximoPorCliente] = useState("1")
  const [activo, setActivo] = useState(true)

  const esNuevo = !cupon?.id
  const puedeEditar = tienePermiso("cupones.editar")

  useEffect(() => {
    if (!abierto) return
    const ahora = new Date()
    const enUnMes = new Date(ahora.getTime() + 30 * 24 * 60 * 60_000)
    setCodigo(cupon?.codigo ?? "")
    setTipo(cupon?.tipo ?? "porcentaje")
    setValorPorcentaje(cupon?.tipo === "porcentaje" ? String(cupon.valor / 100) : "10")
    setValorMonto(cupon?.tipo === "monto" ? (cupon.valor / 100).toFixed(2) : "50.00")
    setSucursalId(cupon?.sucursalId ?? "")
    setDesde(aInputLocal(cupon?.desde ?? ahora.toISOString()))
    setHasta(aInputLocal(cupon?.hasta ?? enUnMes.toISOString()))
    setUsosMaximo(String(cupon?.usosMaximo ?? 100))
    setMaximoPorCliente(String(cupon?.maximoPorCliente ?? 1))
    setActivo(cupon?.activo ?? true)
  }, [abierto, cupon])

  const desdeIso = aIso(desde, new Date().toISOString())
  const hastaIso = aIso(hasta, new Date().toISOString())
  const vigenciaInvalida = new Date(hastaIso).getTime() <= new Date(desdeIso).getTime()
  const valor = tipo === "porcentaje" ? Math.round(Number(valorPorcentaje || "0") * 100) : Math.round(Number(valorMonto || "0") * 100)

  const guardarFormulario = () => {
    if (!/^[A-Z0-9-]{4,20}$/.test(codigo.trim().toUpperCase())) {
      mostrar("El código debe tener 4–20 caracteres A-Z, 0-9 o guiones.", "error")
      return
    }
    if (valor <= 0) {
      mostrar("El valor del cupón debe ser mayor que cero.", "error")
      return
    }
    if (Number(usosMaximo) < 1) {
      mostrar("Los usos máximos deben ser al menos 1.", "error")
      return
    }
    if (Number(maximoPorCliente) < 1 || Number(maximoPorCliente) > Number(usosMaximo)) {
      mostrar("El máximo por cliente debe estar entre 1 y los usos máximos.", "error")
      return
    }
    guardar.mutate(
      {
        id: cupon?.id,
        codigo: codigo.trim().toUpperCase(),
        tipo,
        valor,
        sucursalId: sucursalId || null,
        desde: desdeIso,
        hasta: hastaIso,
        usosMaximo: Number(usosMaximo),
        maximoPorCliente: Number(maximoPorCliente),
        activo,
        version: cupon?.version,
      },
      {
        onSuccess: () => onGuardado(esNuevo ? "Cupón creado." : "Cupón actualizado."),
        onError: (error) => mostrar(error instanceof Error ? error.message : "No se pudo guardar el cupón.", "error"),
      },
    )
  }

  return (
    <Drawer
      open={abierto}
      onClose={onCerrar}
      title={esNuevo ? "Nuevo cupón" : `Editar ${cupon?.codigo}`}
      subtitle="El canje ocurre en la tienda/APK; aquí se administran reglas y control de abuso."
      width={640}
      footer={
        <>
          <span className="product-form__paso">
            {cupon ? `${cupon.usos} usos acumulados` : "Sin usos"}
          </span>
          <div className="product-form__footer-actions">
            <Button variant="secondary" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={guardar.isPending || !puedeEditar || vigenciaInvalida}
              title={puedeEditar ? undefined : "Requiere permiso de cupones.editar"}
              onClick={guardarFormulario}
            >
              <Save size={15} /> {guardar.isPending ? "Guardando…" : "Guardar cupón"}
            </Button>
          </div>
        </>
      }
    >
      <div className="form-grid">
        <TextField
          label="Código"
          value={codigo}
          placeholder="BIENVENIDO10"
          onChange={(event) => setCodigo(event.target.value.toUpperCase())}
        />
        <SelectField
          label="Tipo"
          options={Object.entries(CUPON_TIPO_LABEL).map(([value, label]) => ({ value, label }))}
          value={tipo}
          onChange={(event) => setTipo(event.target.value as CuponTipo)}
        />
        {tipo === "porcentaje" ? (
          <TextField
            label="Descuento (%)"
            type="number"
            min={1}
            max={90}
            value={valorPorcentaje}
            hint="Porcentaje sobre el subtotal, sin combinar con otras promociones"
            onChange={(event) => setValorPorcentaje(event.target.value)}
          />
        ) : (
          <TextField
            label="Monto (MXN)"
            type="number"
            min={1}
            step="0.01"
            value={valorMonto}
            onChange={(event) => setValorMonto(event.target.value)}
          />
        )}
        <SelectField
          label="Sede"
          options={sedes.map((sede) => ({ value: sede.id, label: sede.nombre }))}
          placeholder="Todas las sedes"
          value={sucursalId}
          onChange={(event) => setSucursalId(event.target.value)}
        />
        <TextField label="Vigente desde" type="datetime-local" value={desde} onChange={(event) => setDesde(event.target.value)} />
        <TextField label="Vigente hasta" type="datetime-local" value={hasta} onChange={(event) => setHasta(event.target.value)} />
        <TextField
          label="Usos máximos"
          type="number"
          min={1}
          value={usosMaximo}
          hint="Al agotarse el cupón no aplica y se explica el motivo"
          onChange={(event) => setUsosMaximo(event.target.value)}
        />
        <TextField
          label="Máximo por cliente"
          type="number"
          min={1}
          value={maximoPorCliente}
          hint="Control de abuso (RF-R5-101)"
          onChange={(event) => setMaximoPorCliente(event.target.value)}
        />
        <label className="check-inline">
          <input type="checkbox" checked={activo} onChange={(event) => setActivo(event.target.checked)} />
          Cupón activo
        </label>
      </div>

      {vigenciaInvalida ? <div className="notice notice--error">La vigencia debe cumplir desde &lt; hasta.</div> : null}
      {cupon ? (
        <div className="product-form__seccion">
          <div className="panel__title">Consumo</div>
          <UsageBar usos={cupon.usos} maximo={cupon.usosMaximo} />
        </div>
      ) : null}
    </Drawer>
  )
}
