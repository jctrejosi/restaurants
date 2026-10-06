/**
 * Asistente por pasos del producto (RF-R5-10, plan 06 §3): datos, precios e
 * impuestos, modificadores, alérgenos, fotos y estación asignada.
 *
 * Reglas: el cambio de precio exige permiso `catalogo.precios` + motivo
 * (RN-R5-06) y los precios son append-only; sin estación el producto no genera
 * comanda y solo se guarda con confirmación (RF-R5-30).
 */

import { useEffect, useState } from "react"
import { AlertTriangle, Check, Plus, Save, X } from "lucide-react"
import { useAuth } from "@/app/auth"
import type { Sede } from "@/app/sede"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Drawer } from "@/components/ui/Drawer"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { SelectField, TextField, TextareaField } from "@/components/ui/fields"
import { useToast } from "@/components/ui/toast"
import { ApiError } from "@/lib/api"
import { formatMoney } from "@/lib/format"
import { ALERGENOS, IMPUESTOS, useGuardarProducto, useHistorialPrecios } from "@/modules/catalogo/api"
import { PriceHistoryTable } from "@/modules/catalogo/components/PriceHistoryTable"
import {
  ETIQUETA_LABEL,
  type Categoria,
  type EtiquetaProducto,
  type FotoProducto,
  type GrupoModificador,
  type PrecioSede,
  type Producto,
  type ProductoPayload,
} from "@/modules/catalogo/types"

const PASOS = ["Datos", "Precios e impuestos", "Modificadores", "Alérgenos", "Fotos", "Estación"] as const
const ETIQUETAS = Object.keys(ETIQUETA_LABEL) as EtiquetaProducto[]

type Draft = {
  nombre: string
  descripcion: string
  categoriaId: string
  sku: string
  codigoBarras: string
  etiquetas: EtiquetaProducto[]
  activo: boolean
  destacado: boolean
  impuestoId: string
  estacionId: string
  tiempoObjetivoSeg: string
  alergenos: string[]
  grupos: GrupoModificador[]
  fotos: FotoProducto[]
}

function construirDraft(producto: Producto | null, categoriaInicial: string | null): Draft {
  return {
    nombre: producto?.nombre ?? "",
    descripcion: producto?.descripcion ?? "",
    categoriaId: producto?.categoriaId ?? categoriaInicial ?? "",
    sku: producto?.sku ?? "",
    codigoBarras: producto?.codigoBarras ?? "",
    etiquetas: producto?.etiquetas ?? [],
    activo: producto?.activo ?? true,
    destacado: producto?.destacado ?? false,
    impuestoId: producto?.impuestoId ?? "iva-16",
    estacionId: producto?.estacionId ?? "",
    tiempoObjetivoSeg: producto?.tiempoObjetivoSeg ? String(producto.tiempoObjetivoSeg) : "",
    alergenos: producto?.alergenos ?? [],
    grupos: producto?.grupos ?? [],
    fotos: producto?.fotos ?? [],
  }
}

export function ProductForm({
  abierto,
  producto,
  esNuevo,
  categoriaInicial,
  categorias,
  estaciones,
  sedes,
  zonaHoraria,
  onCerrar,
  onGuardado,
  onConflicto,
}: {
  abierto: boolean
  producto: Producto | null
  esNuevo: boolean
  categoriaInicial: string | null
  categorias: Categoria[]
  estaciones: { id: string; nombre: string }[]
  sedes: Sede[]
  zonaHoraria: string
  onCerrar: () => void
  onGuardado: () => void
  onConflicto: () => void
}) {
  const { tienePermiso } = useAuth()
  const { mostrar } = useToast()
  const guardar = useGuardarProducto()
  const historial = useHistorialPrecios(abierto && !esNuevo ? (producto?.id ?? undefined) : undefined)

  const [paso, setPaso] = useState(0)
  const [draft, setDraft] = useState<Draft>(() => construirDraft(producto, categoriaInicial))
  const [preciosTexto, setPreciosTexto] = useState<Record<string, string>>({})
  const [motivoAbierto, setMotivoAbierto] = useState(false)
  const [confirmarEstacion, setConfirmarEstacion] = useState(false)
  const [motivoPrecio, setMotivoPrecio] = useState<string | undefined>(undefined)
  const [conflicto, setConflicto] = useState<string | null>(null)

  const puedeEditar = tienePermiso("catalogo.editar")
  const puedePrecios = tienePermiso("catalogo.precios")
  const puedeDestacados = tienePermiso("catalogo.destacados")

  useEffect(() => {
    if (!abierto) return
    setPaso(0)
    setDraft(construirDraft(producto, categoriaInicial))
    setConflicto(null)
    const precios: Record<string, string> = {}
    for (const sede of sedes) {
      const vigente = producto?.precios.find((precio) => precio.sucursalId === sede.id)
      precios[sede.id] = vigente ? (vigente.centavos / 100).toFixed(2) : ""
    }
    setPreciosTexto(precios)
  }, [abierto, producto, categoriaInicial, sedes])

  const opcionesCategoria = categorias.filter((categoria) => categoria.activa).map((categoria) => ({
    value: categoria.id,
    label: categoria.nombre,
  }))
  const opcionesEstacion = estaciones.map((estacion) => ({ value: estacion.id, label: estacion.nombre }))
  const opcionesImpuesto = IMPUESTOS.map((impuesto) => ({
    value: impuesto.id,
    label: impuesto.nombre,
  }))

  const centavosDe = (texto: string): number | null => {
    const numero = Number(texto.replace(",", "."))
    if (!Number.isFinite(numero) || numero < 0) return null
    return Math.round(numero * 100)
  }

  const precios: PrecioSede[] = sedes.map((sede) => ({
    sucursalId: sede.id,
    centavos: centavosDe(preciosTexto[sede.id] ?? "") ?? 0,
    vigenteDesde:
      producto?.precios.find((precio) => precio.sucursalId === sede.id)?.vigenteDesde ??
      new Date().toISOString(),
  }))

  const cambiosPrecio = sedes
    .map((sede) => {
      const anterior = producto?.precios.find((precio) => precio.sucursalId === sede.id)?.centavos ?? null
      const nuevo = centavosDe(preciosTexto[sede.id] ?? "")
      return { sede: sede.nombre, anterior, nuevo, cambio: anterior !== nuevo }
    })
    .filter((item) => item.cambio)

  const hayCambioPrecio = !esNuevo && cambiosPrecio.length > 0

  const errorPaso = (indice: number): string | null => {
    if (indice === 0) {
      if (draft.nombre.trim().length < 2) return "El nombre del producto es obligatorio."
      if (!draft.categoriaId) return "Selecciona la categoría del producto."
      if (!draft.sku.trim()) return "El SKU es obligatorio."
    }
    if (indice === 1) {
      for (const sede of sedes) {
        if ((preciosTexto[sede.id] ?? "").trim() === "") return `Captura el precio de ${sede.nombre}.`
        if (centavosDe(preciosTexto[sede.id] ?? "") === null) return `El precio de ${sede.nombre} no es válido.`
      }
      if (draft.tiempoObjetivoSeg.trim() !== "") {
        const segundos = Number(draft.tiempoObjetivoSeg)
        if (!Number.isFinite(segundos) || segundos < 30 || segundos > 7200) {
          return "El tiempo objetivo debe estar entre 30 y 7 200 segundos (referencia SLA, módulo 07)."
        }
      }
    }
    if (indice === 2) {
      for (const grupo of draft.grupos) {
        if (grupo.nombre.trim().length < 2) return "Cada grupo de modificadores necesita nombre."
        if (grupo.maximo < 1 || grupo.maximo < grupo.minimo) {
          return `Revisa el rango del grupo «${grupo.nombre}»: máximo ≥ 1 y ≥ mínimo.`
        }
      }
    }
    if (indice === 4) {
      for (const foto of draft.fotos) {
        if (!foto.url.startsWith("http")) return "Cada foto necesita una URL pública."
        if (!foto.textoAlt.trim()) return "Cada foto necesita texto alternativo (accesibilidad AA)."
      }
    }
    return null
  }

  const guardarCon = (motivo?: string) => {
    const payload: ProductoPayload & { id?: string } = {
      id: producto?.id,
      nombre: draft.nombre.trim(),
      descripcion: draft.descripcion.trim(),
      categoriaId: draft.categoriaId,
      sku: draft.sku.trim(),
      codigoBarras: draft.codigoBarras.trim(),
      etiquetas: draft.etiquetas,
      activo: draft.activo,
      destacado: draft.destacado,
      impuestoId: draft.impuestoId,
      estacionId: draft.estacionId || null,
      tiempoObjetivoSeg: draft.tiempoObjetivoSeg.trim() === "" ? null : Number(draft.tiempoObjetivoSeg),
      alergenos: draft.alergenos,
      grupos: draft.grupos,
      fotos: draft.fotos.map((foto, indice) => ({ ...foto, orden: indice + 1 })),
      precios,
      motivo,
      version: producto?.version,
    }
    guardar.mutate(payload, {
      onSuccess: () => {
        mostrar(esNuevo ? "Producto creado. Ya puede asignarse a una estación." : "Cambios publicados según vigencia.", "exito")
        onGuardado()
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 409) {
          setConflicto(error.message)
          return
        }
        mostrar(error instanceof Error ? error.message : "No se pudo guardar el producto.", "error")
      },
    })
  }

  const continuarGuardado = (motivo?: string) => {
    if (!draft.estacionId && !confirmarEstacion) {
      setMotivoPrecio(motivo)
      setConfirmarEstacion(true)
      return
    }
    guardarCon(motivo)
  }

  const intentarGuardar = () => {
    for (let indice = 0; indice < PASOS.length; indice += 1) {
      const error = errorPaso(indice)
      if (error) {
        setPaso(indice)
        mostrar(error, "error")
        return
      }
    }
    if (hayCambioPrecio && !puedePrecios) {
      mostrar("Cambiar precios requiere el permiso catalogo.precios (RN-R5-06).", "error")
      return
    }
    if (hayCambioPrecio) {
      setMotivoAbierto(true)
      return
    }
    continuarGuardado()
  }

  const actualizarGrupo = (grupoId: string, cambios: Partial<GrupoModificador>) =>
    setDraft((actual) => ({
      ...actual,
      grupos: actual.grupos.map((grupo) => (grupo.id === grupoId ? { ...grupo, ...cambios } : grupo)),
    }))

  const agregarGrupo = () =>
    setDraft((actual) => ({
      ...actual,
      grupos: [
        ...actual.grupos,
        { id: `grp-${Date.now()}`, nombre: "", minimo: 0, maximo: 1, obligatorio: false, modificadores: [] },
      ],
    }))

  const agregarModificador = (grupoId: string) =>
    setDraft((actual) => ({
      ...actual,
      grupos: actual.grupos.map((grupo) =>
        grupo.id === grupoId
          ? {
              ...grupo,
              modificadores: [
                ...grupo.modificadores,
                { id: `mod-${Date.now()}`, nombre: "", sobreprecioCentavos: 0, activo: true },
              ],
            }
          : grupo,
      ),
    }))

  const actualizarModificador = (
    grupoId: string,
    modificadorId: string,
    cambios: { nombre?: string; sobreprecioCentavos?: number },
  ) =>
    setDraft((actual) => ({
      ...actual,
      grupos: actual.grupos.map((grupo) =>
        grupo.id === grupoId
          ? {
              ...grupo,
              modificadores: grupo.modificadores.map((modificador) =>
                modificador.id === modificadorId ? { ...modificador, ...cambios } : modificador,
              ),
            }
          : grupo,
      ),
    }))

  const quitarModificador = (grupoId: string, modificadorId: string) =>
    setDraft((actual) => ({
      ...actual,
      grupos: actual.grupos.map((grupo) =>
        grupo.id === grupoId
          ? { ...grupo, modificadores: grupo.modificadores.filter((item) => item.id !== modificadorId) }
          : grupo,
      ),
    }))

  const impactoPrecios = cambiosPrecio
    .map(
      (item) =>
        `${item.sede}: ${item.anterior === null ? "sin precio" : formatMoney(item.anterior)} → ${
          item.nuevo === null ? "—" : formatMoney(item.nuevo)
        }`,
    )
    .join(" · ")

  const puedeAvanzar = errorPaso(paso) === null

  return (
    <>
      <Drawer
        open={abierto}
        onClose={onCerrar}
        title={esNuevo ? "Nuevo producto" : (draft.nombre || "Producto")}
        subtitle={
          esNuevo
            ? "Alta de producto: se publica según vigencia y no altera pedidos ya creados."
            : `SKU ${draft.sku || "—"} · versión ${producto?.version ?? 1}`
        }
        width={820}
        footer={
          <>
            <div className="product-form__paso">
              Paso {paso + 1} de {PASOS.length} · {PASOS[paso]}
            </div>
            <div className="product-form__footer-actions">
              <Button variant="ghost" disabled={paso === 0} onClick={() => setPaso((valor) => valor - 1)}>
                Anterior
              </Button>
              {paso < PASOS.length - 1 ? (
                <Button
                  variant="secondary"
                  disabled={!puedeAvanzar}
                  title={puedeAvanzar ? undefined : (errorPaso(paso) ?? undefined)}
                  onClick={() => setPaso((valor) => valor + 1)}
                >
                  Siguiente
                </Button>
              ) : null}
              <Button
                variant="primary"
                disabled={guardar.isPending || !puedeEditar}
                title={puedeEditar ? undefined : "Requiere permiso de catalogo.editar"}
                onClick={() => intentarGuardar()}
              >
                <Save size={15} /> {guardar.isPending ? "Guardando…" : esNuevo ? "Crear producto" : "Guardar cambios"}
              </Button>
            </div>
          </>
        }
      >
        {conflicto ? (
          <div className="conflict-banner">
            <AlertTriangle size={16} />
            <div>
              <strong>Otro usuario confirmó cambios antes que tú</strong>
              <p>{conflicto} Gana lo confirmado por el servidor; revisa la versión vigente antes de reintentar.</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setConflicto(null)
                onConflicto()
              }}
            >
              Recargar versión
            </Button>
          </div>
        ) : null}

        <div className="product-form__steps" role="tablist" aria-label="Pasos del producto">
          {PASOS.map((nombre, indice) => (
            <button
              key={nombre}
              type="button"
              role="tab"
              aria-selected={paso === indice}
              className={`step-chip ${paso === indice ? "step-chip--active" : ""}`}
              onClick={() => setPaso(indice)}
            >
              {indice + 1}. {nombre}
            </button>
          ))}
        </div>

        {paso === 0 ? (
          <div className="form-grid">
            <TextField
              label="Nombre"
              value={draft.nombre}
              onChange={(event) => setDraft((actual) => ({ ...actual, nombre: event.target.value }))}
            />
            <TextField
              label="SKU"
              value={draft.sku}
              hint="Único en la carta"
              onChange={(event) => setDraft((actual) => ({ ...actual, sku: event.target.value }))}
            />
            <TextField
              label="Código de barras"
              value={draft.codigoBarras}
              onChange={(event) => setDraft((actual) => ({ ...actual, codigoBarras: event.target.value }))}
            />
            <SelectField
              label="Categoría"
              options={opcionesCategoria}
              placeholder="Selecciona una categoría"
              value={draft.categoriaId}
              onChange={(event) => setDraft((actual) => ({ ...actual, categoriaId: event.target.value }))}
            />
            <TextareaField
              className="form-grid__ancho"
              label="Descripción"
              rows={3}
              value={draft.descripcion}
              onChange={(event) => setDraft((actual) => ({ ...actual, descripcion: event.target.value }))}
            />
            <div className="form-grid__ancho">
              <span className="field__label">Etiquetas de carta</span>
              <div className="check-grid">
                {ETIQUETAS.map((etiqueta) => (
                  <label className="check-inline" key={etiqueta}>
                    <input
                      type="checkbox"
                      checked={draft.etiquetas.includes(etiqueta)}
                      onChange={(event) =>
                        setDraft((actual) => ({
                          ...actual,
                          etiquetas: event.target.checked
                            ? [...actual.etiquetas, etiqueta]
                            : actual.etiquetas.filter((item) => item !== etiqueta),
                        }))
                      }
                    />
                    {ETIQUETA_LABEL[etiqueta]}
                  </label>
                ))}
              </div>
            </div>
            <label className="check-inline">
              <input
                type="checkbox"
                checked={draft.activo}
                onChange={(event) => setDraft((actual) => ({ ...actual, activo: event.target.checked }))}
              />
              Producto activo en la carta
            </label>
            <label className="check-inline" title={puedeDestacados ? undefined : "Requiere permiso de catalogo.destacados"}>
              <input
                type="checkbox"
                checked={draft.destacado}
                disabled={!puedeDestacados}
                onChange={(event) => setDraft((actual) => ({ ...actual, destacado: event.target.checked }))}
              />
              Destacado / recomendado
            </label>
          </div>
        ) : null}

        {paso === 1 ? (
          <div>
            {!puedePrecios ? (
              <div className="notice notice--warn">
                <AlertTriangle size={15} /> Requiere permiso <code>catalogo.precios</code> para editar precios
                (RN-R5-06). Puedes consultar el historial.
              </div>
            ) : null}
            <p className="drawer__note">
              Los precios son <strong>append-only</strong>: al publicar se crea una vigencia nueva desde ahora y los
              pedidos ya creados conservan su precio (RN-R5-04).
            </p>
            <div className="form-grid">
              {sedes.map((sede) => {
                const vigente = producto?.precios.find((precio) => precio.sucursalId === sede.id)
                return (
                  <TextField
                    key={sede.id}
                    label={`${sede.nombre} (MXN)`}
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={!puedePrecios}
                    value={preciosTexto[sede.id] ?? ""}
                    hint={vigente ? `Vigente desde ${new Date(vigente.vigenteDesde).toLocaleDateString("es-MX")}` : "Sin precio"}
                    onChange={(event) =>
                      setPreciosTexto((actual) => ({ ...actual, [sede.id]: event.target.value }))
                    }
                  />
                )
              })}
              <SelectField
                label="Impuesto"
                options={opcionesImpuesto}
                value={draft.impuestoId}
                onChange={(event) => setDraft((actual) => ({ ...actual, impuestoId: event.target.value }))}
              />
              <TextField
                label="Tiempo objetivo (segundos)"
                type="number"
                min={30}
                max={7200}
                value={draft.tiempoObjetivoSeg}
                hint="Rango 30–7 200 s; alimenta alertas SLA (módulo 07)"
                onChange={(event) => setDraft((actual) => ({ ...actual, tiempoObjetivoSeg: event.target.value }))}
              />
            </div>
            {!esNuevo && producto ? (
              <div className="product-form__seccion">
                <div className="panel__title">Historial de precios</div>
                <PriceHistoryTable
                  historial={historial.data?.data ?? []}
                  sedes={sedes}
                  zonaHoraria={zonaHoraria}
                  cargando={historial.isLoading}
                  error={historial.isError ? (historial.error as Error) : null}
                  onReintentar={() => void historial.refetch()}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {paso === 2 ? (
          <div>
            <div className="product-form__seccion-head">
              <p className="drawer__note">
                Los grupos pueden ser obligatorios y se aplican al producto o a su categoría. Define mínimo y máximo de
                selecciones.
              </p>
              <Button variant="secondary" onClick={agregarGrupo}>
                <Plus size={15} /> Agregar grupo
              </Button>
            </div>
            {draft.grupos.length === 0 ? (
              <div className="state-block">
                <strong>Sin modificadores</strong>
                <p>Agrega grupos (término, extras, orilla) y sus opciones con sobreprecio.</p>
              </div>
            ) : (
              draft.grupos.map((grupo) => (
                <div className="mod-group" key={grupo.id}>
                  <div className="mod-group__head">
                    <TextField
                      label="Grupo"
                      value={grupo.nombre}
                      onChange={(event) => actualizarGrupo(grupo.id, { nombre: event.target.value })}
                    />
                    <TextField
                      label="Mín."
                      type="number"
                      min={0}
                      value={grupo.minimo}
                      onChange={(event) => actualizarGrupo(grupo.id, { minimo: Number(event.target.value) })}
                    />
                    <TextField
                      label="Máx."
                      type="number"
                      min={1}
                      value={grupo.maximo}
                      onChange={(event) => actualizarGrupo(grupo.id, { maximo: Number(event.target.value) })}
                    />
                    <label className="check-inline">
                      <input
                        type="checkbox"
                        checked={grupo.obligatorio}
                        onChange={(event) => actualizarGrupo(grupo.id, { obligatorio: event.target.checked })}
                      />
                      Obligatorio
                    </label>
                    <Button
                      variant="ghost"
                      className="text-action"
                      onClick={() =>
                        setDraft((actual) => ({
                          ...actual,
                          grupos: actual.grupos.filter((item) => item.id !== grupo.id),
                        }))
                      }
                    >
                      <X size={14} /> Quitar grupo
                    </Button>
                  </div>
                  {grupo.modificadores.map((modificador) => (
                    <div className="mod-row" key={modificador.id}>
                      <TextField
                        label="Opción"
                        value={modificador.nombre}
                        onChange={(event) =>
                          actualizarModificador(grupo.id, modificador.id, { nombre: event.target.value })
                        }
                      />
                      <TextField
                        label="Sobreprecio (MXN)"
                        type="number"
                        min={0}
                        step="0.01"
                        value={(modificador.sobreprecioCentavos / 100).toFixed(2)}
                        onChange={(event) =>
                          actualizarModificador(grupo.id, modificador.id, {
                            sobreprecioCentavos: Math.round(Number(event.target.value || "0") * 100),
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        className="text-action"
                        onClick={() => quitarModificador(grupo.id, modificador.id)}
                      >
                        <X size={14} /> Quitar
                      </Button>
                    </div>
                  ))}
                  <Button variant="ghost" className="text-action" onClick={() => agregarModificador(grupo.id)}>
                    <Plus size={14} /> Agregar opción
                  </Button>
                </div>
              ))
            )}
          </div>
        ) : null}

        {paso === 3 ? (
          <div>
            <p className="drawer__note">
              Los alérgenos se muestran en la carta y en todos los canales (web, APK, KDS).
            </p>
            <div className="check-grid">
              {ALERGENOS.map((alergeno) => (
                <label className="check-inline" key={alergeno.id}>
                  <input
                    type="checkbox"
                    checked={draft.alergenos.includes(alergeno.id)}
                    onChange={(event) =>
                      setDraft((actual) => ({
                        ...actual,
                        alergenos: event.target.checked
                          ? [...actual.alergenos, alergeno.id]
                          : actual.alergenos.filter((item) => item !== alergeno.id),
                      }))
                    }
                  />
                  {alergeno.nombre}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {paso === 4 ? (
          <div>
            <div className="product-form__seccion-head">
              <p className="drawer__note">
                Guía de encuadre: 4:3, fondo claro, 1 200 px de ancho. La primera foto es la principal; todas necesitan
                texto alternativo.
              </p>
              <Button
                variant="secondary"
                onClick={() =>
                  setDraft((actual) => ({
                    ...actual,
                    fotos: [...actual.fotos, { id: `foto-${Date.now()}`, url: "", textoAlt: "", orden: actual.fotos.length + 1 }],
                  }))
                }
              >
                <Plus size={15} /> Agregar foto
              </Button>
            </div>
            {draft.fotos.length === 0 ? (
              <div className="state-block">
                <strong>Sin fotos</strong>
                <p>Agrega al menos una foto principal para web y APK.</p>
              </div>
            ) : (
              draft.fotos.map((foto, indice) => (
                <div className="photo-row" key={foto.id}>
                  <div className="photo-row__preview">
                    {foto.url.startsWith("http") ? <img src={foto.url} alt={foto.textoAlt || "Vista previa"} /> : <span>Sin URL</span>}
                  </div>
                  <div className="photo-row__campos">
                    <TextField
                      label="URL pública"
                      value={foto.url}
                      placeholder="https://…"
                      onChange={(event) =>
                        setDraft((actual) => ({
                          ...actual,
                          fotos: actual.fotos.map((item) => (item.id === foto.id ? { ...item, url: event.target.value } : item)),
                        }))
                      }
                    />
                    <TextField
                      label="Texto alternativo"
                      value={foto.textoAlt}
                      onChange={(event) =>
                        setDraft((actual) => ({
                          ...actual,
                          fotos: actual.fotos.map((item) => (item.id === foto.id ? { ...item, textoAlt: event.target.value } : item)),
                        }))
                      }
                    />
                  </div>
                  <div className="photo-row__acciones">
                    <Button
                      variant="ghost"
                      className="text-action"
                      disabled={indice === 0}
                      onClick={() => {
                        const fotos = [...draft.fotos]
                        ;[fotos[indice - 1], fotos[indice]] = [fotos[indice], fotos[indice - 1]]
                        setDraft((actual) => ({ ...actual, fotos }))
                      }}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-action"
                      disabled={indice === draft.fotos.length - 1}
                      onClick={() => {
                        const fotos = [...draft.fotos]
                        ;[fotos[indice + 1], fotos[indice]] = [fotos[indice], fotos[indice + 1]]
                        setDraft((actual) => ({ ...actual, fotos }))
                      }}
                    >
                      ↓
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-action"
                      onClick={() =>
                        setDraft((actual) => ({ ...actual, fotos: actual.fotos.filter((item) => item.id !== foto.id) }))
                      }
                    >
                      <X size={14} /> Quitar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}

        {paso === 5 ? (
          <div>
            <p className="drawer__note">
              La estación define el destino de la comanda y su SLA. Se administran en Estaciones e impresoras.
            </p>
            <SelectField
              label="Estación asignada"
              options={opcionesEstacion}
              placeholder="Sin estación"
              value={draft.estacionId}
              onChange={(event) => setDraft((actual) => ({ ...actual, estacionId: event.target.value }))}
            />
            {!draft.estacionId ? (
              <div className="notice notice--warn">
                <AlertTriangle size={15} />
                <span>
                  Este producto <strong>no genera comanda</strong> (RF-R5-30). Al guardar se pedirá confirmación y
                  quedará en el listado de pendientes de estación.
                </span>
              </div>
            ) : (
              <div className="notice notice--ok">
                <Check size={15} /> Generará comanda en {estaciones.find((item) => item.id === draft.estacionId)?.nombre}.
              </div>
            )}
            <div className="product-form__seccion">
              <div className="panel__title">Estado de publicación</div>
              <div className="product-form__estado">
                <StatusBadge tone={draft.activo ? "green" : "gray"}>{draft.activo ? "activo" : "inactivo"}</StatusBadge>
                {draft.destacado ? <StatusBadge tone="amber">destacado</StatusBadge> : null}
                {hayCambioPrecio ? <StatusBadge tone="blue">cambio de precio pendiente</StatusBadge> : null}
                {!draft.estacionId ? <StatusBadge tone="amber">sin estación</StatusBadge> : null}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={motivoAbierto}
        title="Confirmar cambio de precios"
        description="Se creará una nueva vigencia desde ahora; los pedidos ya creados conservan su precio."
        impacto={impactoPrecios}
        confirmLabel="Publicar precios"
        onCancel={() => setMotivoAbierto(false)}
        onConfirm={(motivo) => {
          setMotivoAbierto(false)
          continuarGuardado(motivo)
        }}
      />

      <ConfirmDialog
        open={confirmarEstacion}
        title="Producto sin estación"
        description="Sin estación asignada el producto no genera comanda en la cocina (RF-R5-30)."
        impacto="Puedes resolverlo después desde Estaciones e impresoras."
        motivoLabel="Nota (opcional)"
        motivoObligatorio={false}
        confirmLabel="Guardar sin estación"
        onCancel={() => setConfirmarEstacion(false)}
        onConfirm={() => {
          setConfirmarEstacion(false)
          guardarCon(motivoPrecio)
        }}
      />
    </>
  )
}
