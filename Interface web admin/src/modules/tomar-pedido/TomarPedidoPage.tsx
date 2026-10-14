import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "react-router-dom"
import { ShoppingCart, Users } from "lucide-react"
import { PageHeader } from "@/components/data/PageHeader"
import { Button } from "@/components/ui/Button"
import { IconButton } from "@/components/ui/IconButton"
import { NoPermissionState } from "@/components/ui/states"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/app/auth"
import { useSede } from "@/app/sede"
import { ApiError } from "@/lib/api"
import { formatMoney, formatTime } from "@/lib/format"
import { useSocketEvent } from "@/lib/realtime"
import {
  limpiarBorradorLocal,
  useBorrador,
  useCarta,
  useCliente,
  useCobrarPedido,
  useCrearBorrador,
  useContextoPedido,
  useDescartarBorrador,
  useEnviarPedido,
  useGuardarBorrador,
  useImprimirPrecuenta,
} from "@/modules/tomar-pedido/api"
import {
  calcularTotales,
  nuevaClaveIdempotencia,
  nuevaLineaId,
  unidadesCarrito,
} from "@/modules/tomar-pedido/totales"
import { CarritoPanel } from "@/modules/tomar-pedido/components/CarritoPanel"
import { CatalogoPanel } from "@/modules/tomar-pedido/components/CatalogoPanel"
import { ConfirmarEnvioDialog } from "@/modules/tomar-pedido/components/ConfirmarEnvioDialog"
import { DescuentoDialog } from "@/modules/tomar-pedido/components/DescuentoDialog"
import { ModalidadSelector } from "@/modules/tomar-pedido/components/ModalidadSelector"
import { ModificadoresDialog } from "@/modules/tomar-pedido/components/ModificadoresDialog"
import { NotaLineaDialog } from "@/modules/tomar-pedido/components/NotaLineaDialog"
import {
  BORRADOR_STORAGE_KEY,
  MESA_ESTADO_DESCRIPCION,
  MESA_ESTADO_LABEL,
  MODALIDAD_LABEL,
  type BorradorLocal,
  type BorradorPayload,
  type ClienteResumen,
  type DescuentoAplicado,
  type LineaCarrito,
  type Modalidad,
  type ModificadorElegido,
  type ProductoCarta,
} from "@/modules/tomar-pedido/types"
import "./tomar-pedido.css"

function parseModalidad(valor: string | null): Modalidad {
  return valor === "recoger" || valor === "domicilio" || valor === "mesa" ? valor : "mesa"
}

function mensajeError(error: unknown): string {
  return error instanceof ApiError ? error.message : "Ocurrió un error inesperado. Inténtalo de nuevo."
}

/**
 * Módulo 20 — Tomar pedido: captura manual en caja con catálogo a la izquierda
 * y carrito fijo a la derecha. Query params: `?mesa=`, `?modalidad=`,
 * `?cliente=`, `?borrador=`. Atajos: F2 buscar, F9 enviar, +/−/Supr en la
 * línea activa. Autosave en localStorage + PATCH con recuperación al recargar.
 */
export default function TomarPedidoPage() {
  const { usuario, tienePermiso } = useAuth()
  const { moneda } = useSede()
  const { mostrar } = useToast()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const puedeVer = tienePermiso("tomar-pedido.ver")
  const puedeCrear = tienePermiso("tomar-pedido.crear")
  const puedeDescuento = tienePermiso("tomar-pedido.descuento")
  const puedePrecuenta = tienePermiso("tomar-pedido.precuenta")
  const puedeCobrar = tienePermiso("tomar-pedido.cobrar")

  const borradorParam = searchParams.get("borrador")
  const clienteParam = searchParams.get("cliente")
  /* QA: `?turno=cerrado` simula una sede sin turno de caja abierto. */
  const turnoCerrado = searchParams.get("turno") === "cerrado"
  /* QA: `?impresora=caida` simula la impresora de comandas fuera de línea. */
  const simularImpresoraCaida = searchParams.get("impresora") === "caida"

  const carta = useCarta()
  const contexto = useContextoPedido(turnoCerrado)
  const borradorRemoto = useBorrador(borradorParam)

  const crear = useCrearBorrador()
  const guardar = useGuardarBorrador()
  const descartar = useDescartarBorrador()
  const enviar = useEnviarPedido()
  const precuenta = useImprimirPrecuenta()
  const cobrar = useCobrarPedido()

  /* ------------------------------ Estado del carrito ---------------------- */

  const [modalidad, setModalidad] = useState<Modalidad>(() => parseModalidad(searchParams.get("modalidad")))
  const [lineas, setLineas] = useState<LineaCarrito[]>([])
  const [mesaNumero, setMesaNumero] = useState<string | null>(searchParams.get("mesa"))
  const [cliente, setCliente] = useState<ClienteResumen | null>(null)
  const [clientePendienteId, setClientePendienteId] = useState<string | null>(null)
  const [meseroId, setMeseroId] = useState<string | null>(null)
  const [comensales, setComensales] = useState(2)
  const [descuento, setDescuento] = useState<DescuentoAplicado | null>(null)
  const [propinaPct, setPropinaPct] = useState(10)
  const [notas, setNotas] = useState("")
  const [lineaActivaId, setLineaActivaId] = useState<string | null>(null)

  const [categoriaId, setCategoriaId] = useState("todas")
  const [busqueda, setBusqueda] = useState("")

  const [productoMods, setProductoMods] = useState<ProductoCarta | null>(null)
  const [lineaMods, setLineaMods] = useState<LineaCarrito | null>(null)
  const [lineaNota, setLineaNota] = useState<LineaCarrito | null>(null)
  const [descuentoAbierto, setDescuentoAbierto] = useState(false)
  const [envioAbierto, setEnvioAbierto] = useState(false)

  const [borradorId, setBorradorId] = useState<string | null>(null)
  const [guardadoEn, setGuardadoEn] = useState<string | null>(null)

  const buscadorRef = useRef<HTMLInputElement>(null)
  const hidratadoRef = useRef(false)
  const ultimoSyncRef = useRef<string | null>(null)
  const idempotenciaRef = useRef<string | null>(null)
  const clienteParamAplicadoRef = useRef(false)

  /* ------------------------------ Derivados ------------------------------- */

  const mesas = contexto.data?.mesas ?? []
  const turno = contexto.data?.turno ?? null

  const mesa = useMemo(
    () =>
      mesas.find(
        (item) => item.numero === mesaNumero || (mesaNumero !== null && Number(item.numero) === Number(mesaNumero)),
      ) ?? null,
    [mesas, mesaNumero],
  )

  const avisoMesa =
    mesa && mesa.estado !== "libre"
      ? `Mesa ${mesa.numero} forzada desde el enlace: ${MESA_ESTADO_LABEL[mesa.estado]} · ${
          MESA_ESTADO_DESCRIPCION[mesa.estado]
        }${mesa.etiqueta ? ` (${mesa.etiqueta})` : ""}. Confirma al enviar.`
      : null

  const clienteConsultado = useCliente(clienteParam ?? clientePendienteId)

  const totales = useMemo(
    () => calcularTotales(lineas, descuento, propinaPct),
    [lineas, descuento, propinaPct],
  )

  const cantidadesEnPedido = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const linea of lineas) mapa.set(linea.productoId, (mapa.get(linea.productoId) ?? 0) + linea.cantidad)
    return mapa
  }, [lineas])

  const payload: BorradorPayload = useMemo(
    () => ({
      modalidad,
      mesaNumero,
      clienteId: cliente?.id ?? clientePendienteId,
      clienteNombre: cliente?.nombre ?? null,
      clienteTelefono: cliente?.telefono ?? null,
      meseroId,
      comensales,
      lineas,
      descuento,
      propinaPct,
      notas,
    }),
    [modalidad, mesaNumero, cliente, clientePendienteId, meseroId, comensales, lineas, descuento, propinaPct, notas],
  )
  const payloadKey = useMemo(() => JSON.stringify(payload), [payload])

  /* ------------------------------ Recuperación ---------------------------- */

  useEffect(() => {
    if (clienteConsultado.data && !cliente && !clienteParamAplicadoRef.current) {
      clienteParamAplicadoRef.current = true
      setCliente(clienteConsultado.data)
      setClientePendienteId(null)
    }
  }, [clienteConsultado.data, cliente])

  useEffect(() => {
    if (hidratadoRef.current || borradorParam) return
    const crudo = typeof localStorage !== "undefined" ? localStorage.getItem(BORRADOR_STORAGE_KEY) : null
    if (crudo) {
      try {
        const local = JSON.parse(crudo) as BorradorLocal
        if (local.lineas?.length > 0) {
          setModalidad(local.modalidad)
          setMesaNumero(local.mesaNumero)
          setCliente(local.cliente ?? null)
          setMeseroId(local.meseroId)
          setComensales(local.comensales)
          setLineas(local.lineas)
          setDescuento(local.descuento)
          setPropinaPct(local.propinaPct)
          setNotas(local.notas)
          setBorradorId(local.id)
          setGuardadoEn(local.guardadoEn)
          mostrar(`Recuperamos tu borrador guardado a las ${formatTime(local.guardadoEn)}.`, "info")
        }
      } catch {
        limpiarBorradorLocal()
      }
    }
    hidratadoRef.current = true
  }, [borradorParam, mostrar])

  useEffect(() => {
    if (!borradorParam || hidratadoRef.current) return
    if (!borradorRemoto.data) return
    const borrador = borradorRemoto.data
    setModalidad(borrador.modalidad)
    setMesaNumero(borrador.mesaNumero)
    setClientePendienteId(borrador.clienteId)
    setMeseroId(borrador.meseroId)
    setComensales(borrador.comensales)
    setLineas(borrador.lineas)
    setDescuento(borrador.descuento)
    setPropinaPct(borrador.propinaPct)
    setNotas(borrador.notas)
    setBorradorId(borrador.id)
    setGuardadoEn(borrador.actualizadoEn)
    hidratadoRef.current = true
    mostrar(`Borrador recuperado (${borrador.lineas.length} línea(s)).`, "info")
  }, [borradorParam, borradorRemoto.data, mostrar])

  useEffect(() => {
    if (borradorParam && borradorRemoto.isError && !hidratadoRef.current) {
      hidratadoRef.current = true
      mostrar("No pudimos recuperar el borrador solicitado; se descartó.", "error")
    }
  }, [borradorParam, borradorRemoto.isError, mostrar])

  /* -------------------------------- Autosave ------------------------------ */

  const persistir = useCallback(
    async (manual = false): Promise<string | null> => {
      if (payload.lineas.length === 0) {
        if (borradorId) {
          setBorradorId(null)
          descartar.mutate(borradorId)
        }
        limpiarBorradorLocal()
        ultimoSyncRef.current = null
        setGuardadoEn(null)
        return null
      }

      try {
        const local: BorradorLocal = {
          ...payload,
          id: borradorId,
          guardadoEn: new Date().toISOString(),
          cliente,
        }
        localStorage.setItem(BORRADOR_STORAGE_KEY, JSON.stringify(local))
        if (borradorId) {
          const guardado = await guardar.mutateAsync({ id: borradorId, ...payload })
          setGuardadoEn(guardado.actualizadoEn)
          ultimoSyncRef.current = payloadKey
          return borradorId
        }
        const creado = await crear.mutateAsync(payload)
        setBorradorId(creado.id)
        setGuardadoEn(creado.actualizadoEn)
        ultimoSyncRef.current = payloadKey
        const localConId: BorradorLocal = { ...local, id: creado.id, guardadoEn: creado.actualizadoEn }
        localStorage.setItem(BORRADOR_STORAGE_KEY, JSON.stringify(localConId))
        return creado.id
      } catch (error) {
        if (error instanceof ApiError && error.status === 404 && borradorId) {
          /* El borrador ya no existe en el servidor: se recrea sin perder el carrito. */
          try {
            const creado = await crear.mutateAsync(payload)
            setBorradorId(creado.id)
            setGuardadoEn(creado.actualizadoEn)
            ultimoSyncRef.current = payloadKey
            return creado.id
          } catch (errorRecrear) {
            if (manual) mostrar(mensajeError(errorRecrear), "error")
            return null
          }
        }
        if (manual) mostrar(mensajeError(error), "error")
        return borradorId
      }
    },
    [borradorId, cliente, crear, descartar, guardar, mostrar, payload, payloadKey],
  )

  const persistirRef = useRef(persistir)
  persistirRef.current = persistir

  useEffect(() => {
    if (!hidratadoRef.current) return
    if (lineas.length === 0 && !borradorId) return
    if (ultimoSyncRef.current === payloadKey) return
    const timer = window.setTimeout(() => {
      void persistirRef.current()
    }, 1_000)
    return () => window.clearTimeout(timer)
  }, [payloadKey, borradorId, lineas.length])

  /* ------------------------------ Realtime -------------------------------- */

  useSocketEvent(["mesa.estado", "pedido.creado"], () => {
    void queryClient.invalidateQueries({ queryKey: ["tomar-pedido", "contexto"] })
  })

  /* ------------------------------- Atajos --------------------------------- */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const objetivo = event.target as HTMLElement | null
      const enCampo =
        objetivo?.tagName === "INPUT" ||
        objetivo?.tagName === "TEXTAREA" ||
        objetivo?.tagName === "SELECT" ||
        Boolean(objetivo?.isContentEditable)

      if (event.key === "F2") {
        event.preventDefault()
        buscadorRef.current?.focus()
        buscadorRef.current?.select()
        return
      }
      if (event.key === "F9") {
        event.preventDefault()
        abrirConfirmacion()
        return
      }
      if (enCampo || !lineaActivaId) return
      if (!puedeCrear) return
      if (event.key === "+" || event.key === "=") {
        event.preventDefault()
        cambiarCantidad(lineaActivaId, 1)
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault()
        cambiarCantidad(lineaActivaId, -1)
      } else if (event.key === "Delete") {
        event.preventDefault()
        quitarLinea(lineaActivaId)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  })

  if (!puedeVer) {
    return (
      <div className="module-page">
        <PageHeader eyebrow="Operación / Tomar pedido" title="Tomar pedido" />
        <NoPermissionState permiso="tomar-pedido.ver" />
      </div>
    )
  }

  /* ------------------------------- Acciones ------------------------------- */

  function nuevaLinea(producto: ProductoCarta, modificadores: ModificadorElegido[], cantidad: number): LineaCarrito {
    return {
      id: nuevaLineaId(),
      productoId: producto.id,
      nombreSnapshot: producto.nombre,
      sku: producto.sku,
      centavos: producto.centavos,
      impuesto: producto.impuesto,
      estacion: producto.estacion,
      cantidad,
      modificadores,
      notas: "",
    }
  }

  function agregarProducto(producto: ProductoCarta) {
    if (!puedeCrear) {
      mostrar("Requiere permiso tomar-pedido.crear.", "error")
      return
    }
    if (producto.agotado.agotado) {
      mostrar(
        `«${producto.nombre}» está agotado (${producto.agotado.origenDetalle ?? "sin origen"}).${
          producto.alternativaNombre ? ` Sugerencia: ${producto.alternativaNombre}.` : ""
        }`,
        "error",
      )
      return
    }
    if (producto.grupos.some((grupo) => grupo.minimo > 0)) {
      setLineaMods(null)
      setProductoMods(producto)
      return
    }
    const linea = nuevaLinea(producto, [], 1)
    setLineas((actuales) => [...actuales, linea])
    setLineaActivaId(linea.id)
    mostrar(`${producto.nombre} agregado al pedido.`, "exito")
  }

  function cambiarCantidad(id: string, delta: number) {
    setLineas((actuales) =>
      actuales.flatMap((linea) => {
        if (linea.id !== id) return [linea]
        const cantidad = linea.cantidad + delta
        return cantidad < 1 ? [] : [{ ...linea, cantidad }]
      }),
    )
    if (delta < 0) {
      const linea = lineas.find((item) => item.id === id)
      if (linea && linea.cantidad + delta < 1) setLineaActivaId(null)
    }
  }

  function quitarLinea(id: string) {
    setLineas((actuales) => actuales.filter((linea) => linea.id !== id))
    if (lineaActivaId === id) setLineaActivaId(null)
  }

  function guardarModificadores(modificadores: ModificadorElegido[], cantidad: number) {
    if (lineaMods) {
      setLineas((actuales) =>
        actuales.map((linea) =>
          linea.id === lineaMods.id ? { ...linea, modificadores, cantidad } : linea,
        ),
      )
      mostrar(`Línea «${lineaMods.nombreSnapshot}» actualizada.`, "exito")
    } else if (productoMods) {
      const linea = nuevaLinea(productoMods, modificadores, cantidad)
      setLineas((actuales) => [...actuales, linea])
      setLineaActivaId(linea.id)
      mostrar(`${productoMods.nombre} agregado al pedido.`, "exito")
    }
    setProductoMods(null)
    setLineaMods(null)
  }

  /**
   * Reconcilia el carrito con la carta vigente antes de confirmar (RN-R5-04:
   * el carrito recalcula precios; el pedido ya enviado no cambia).
   */
  function reconciliarCarta(): number {
    if (!carta.data) return 0
    let cambios = 0
    const siguientes = lineas.map((linea) => {
      const producto = carta.data?.productos.find((item) => item.id === linea.productoId)
      if (!producto) return linea
      const mismoPrecio = producto.centavos === linea.centavos
      const mismoImpuesto = producto.impuesto.id === linea.impuesto.id
      const mismaEstacion = (producto.estacion?.id ?? null) === (linea.estacion?.id ?? null)
      if (mismoPrecio && mismoImpuesto && mismaEstacion) return linea
      cambios += 1
      return {
        ...linea,
        nombreSnapshot: producto.nombre,
        centavos: producto.centavos,
        impuesto: producto.impuesto,
        estacion: producto.estacion,
      }
    })
    if (cambios > 0) setLineas(siguientes)
    return cambios
  }

  function abrirConfirmacion() {
    if (!puedeCrear) {
      mostrar("Requiere permiso tomar-pedido.crear.", "error")
      return
    }
    if (lineas.length === 0) return
    const cambios = reconciliarCarta()
    if (cambios > 0) {
      mostrar(`Se actualizaron precios o estaciones de ${cambios} línea(s) a la carta vigente.`, "info")
    }
    setEnvioAbierto(true)
  }

  function cambiarModalidad(siguiente: Modalidad) {
    setModalidad(siguiente)
    if (siguiente === "domicilio") {
      mostrar("Domicilio: captura la dirección del cliente en la nota del pedido.", "info")
    }
  }

  function vaciarCarrito() {
    setLineas([])
    setDescuento(null)
    setLineaActivaId(null)
  }

  function limpiarPedido() {
    limpiarBorradorLocal()
    ultimoSyncRef.current = null
    idempotenciaRef.current = null
    setLineas([])
    setDescuento(null)
    setPropinaPct(10)
    setNotas("")
    setCliente(null)
    setClientePendienteId(null)
    setBorradorId(null)
    setGuardadoEn(null)
    setLineaActivaId(null)
  }

  async function guardarBorradorManual() {
    try {
      const id = await persistir(true)
      if (id) mostrar("Borrador guardado; puedes recuperarlo al recargar.", "exito")
    } catch {
      /* `persistir` ya avisa del error */
    }
  }

  async function imprimirPrecuenta() {
    try {
      const id = await persistir(true)
      if (!id) return
      const respuesta = await precuenta.mutateAsync(id)
      mostrar(
        respuesta.impresa
          ? `Pre-cuenta impresa (trabajo ${respuesta.trabajoId}).`
          : respuesta.aviso ?? "La impresora de caja no respondió; la pre-cuenta quedó encolada.",
        respuesta.impresa ? "exito" : "error",
      )
    } catch (error) {
      mostrar(mensajeError(error), "error")
    }
  }

  async function confirmarEnvio() {
    try {
      const id = await persistir(true)
      if (!id) {
        mostrar("Agrega productos antes de enviar.", "error")
        return
      }
      if (!idempotenciaRef.current) idempotenciaRef.current = nuevaClaveIdempotencia()
      const respuesta = await enviar.mutateAsync({
        id,
        idempotencyKey: idempotenciaRef.current,
        simularImpresoraCaida,
      })
      mostrar(
        `Pedido ${respuesta.folio} enviado a cocina · ${respuesta.comandas.length} comanda(s)${
          respuesta.idempotente ? " (reintento sin duplicar)" : ""
        }.`,
        "exito",
      )
      for (const aviso of respuesta.avisos) {
        mostrar(aviso.mensaje, aviso.tipo === "impresora" ? "error" : "info")
      }
      limpiarPedido()
      setEnvioAbierto(false)
    } catch (error) {
      mostrar(mensajeError(error), "error")
    }
  }

  async function cobrarPedido() {
    if (!puedeCobrar) {
      mostrar("Requiere permiso tomar-pedido.cobrar.", "error")
      return
    }
    if (!turno) {
      mostrar("Sin turno de caja abierto no se puede cobrar (V1). Puedes enviar a cocina.", "error")
      return
    }
    try {
      const id = await persistir(true)
      if (!id) {
        mostrar("Agrega productos antes de cobrar.", "error")
        return
      }
      const respuesta = await cobrar.mutateAsync(id)
      mostrar(
        `Pedido ${respuesta.folio} pasó a Caja (por cobrar) en el turno ${respuesta.turnoId}.`,
        "exito",
      )
      limpiarPedido()
    } catch (error) {
      mostrar(mensajeError(error), "error")
    }
  }

  const unidades = unidadesCarrito(lineas)

  return (
    <div className="module-page tp-page">
      <PageHeader
        eyebrow="Operación / Tomar pedido"
        title="Tomar pedido"
        subtitle="Captura manual en caja: arma el carrito, envía a cocina y pasa el cobro a Caja (V1)."
        actions={
          <Button variant="primary" disabled={lineas.length === 0} onClick={abrirConfirmacion}>
            <ShoppingCart size={16} /> Enviar pedido
            {unidades > 0 ? ` · ${formatMoney(totales.totalCentavos, moneda)}` : ""}
          </Button>
        }
      />

      <div className="tp-layout">
        <div className="tp-catalogo-col">
          <div className="tp-barra">
            <ModalidadSelector value={modalidad} onChange={cambiarModalidad} />
            {modalidad === "mesa" ? (
              <div className="tp-barra__campo">
                <span className="field__label">
                  <Users size={12} /> Comensales
                </span>
                <span className="tp-stepper">
                  <IconButton
                    label="Menos comensales"
                    className="tp-stepper__btn"
                    disabled={comensales <= 1}
                    onClick={() => setComensales(comensales - 1)}
                  >
                    −
                  </IconButton>
                  <span className="tp-stepper__valor">{comensales}</span>
                  <IconButton
                    label="Más comensales"
                    className="tp-stepper__btn"
                    disabled={comensales >= 30}
                    onClick={() => setComensales(comensales + 1)}
                  >
                    +
                  </IconButton>
                </span>
              </div>
            ) : null}
          </div>

          <CatalogoPanel
            categorias={carta.data?.categorias ?? []}
            productos={carta.data?.productos ?? []}
            cargando={carta.isLoading}
            error={carta.isError}
            onReintentar={() => void carta.refetch()}
            categoriaId={categoriaId}
            busqueda={busqueda}
            onCategoria={setCategoriaId}
            onBusqueda={setBusqueda}
            buscadorRef={buscadorRef}
            puedeAgregar={puedeCrear}
            moneda={moneda}
            cantidades={cantidadesEnPedido}
            onAgregar={agregarProducto}
            onPersonalizar={(producto) => {
              setLineaMods(null)
              setProductoMods(producto)
            }}
            onAgotado={(producto) =>
              mostrar(
                `«${producto.nombre}» agotado (${producto.agotado.origenDetalle ?? "sin origen"}).${
                  producto.agotado.reactivacionEstimada
                    ? ` Reactivación estimada: ${new Date(producto.agotado.reactivacionEstimada).toLocaleString("es-MX")}.`
                    : " Sin reactivación estimada."
                }${producto.alternativaNombre ? ` Sugerencia: ${producto.alternativaNombre}.` : ""}`,
                "error",
              )
            }
            onSinPermiso={() => mostrar("Requiere permiso tomar-pedido.crear.", "error")}
          />
        </div>

        <div className="tp-carrito-col">
          <CarritoPanel
            lineas={lineas}
            moneda={moneda}
            lineaActivaId={lineaActivaId}
            puedeCrear={puedeCrear}
            onActivar={setLineaActivaId}
            onCantidad={cambiarCantidad}
            onQuitar={quitarLinea}
            onModificadores={(linea) => {
              const producto = carta.data?.productos.find((item) => item.id === linea.productoId)
              if (!producto) {
                mostrar("El producto ya no está en la carta vigente.", "error")
                return
              }
              setProductoMods(producto)
              setLineaMods(linea)
            }}
            onNota={setLineaNota}
            notas={notas}
            onNotas={setNotas}
            onVaciar={vaciarCarrito}
            totales={totales}
            descuento={descuento}
            propinaPct={propinaPct}
            onPropina={setPropinaPct}
            puedeDescuento={puedeDescuento}
            puedePrecuenta={puedePrecuenta}
            puedeCobrar={puedeCobrar}
            turnoAbierto={Boolean(turno)}
            guardando={crear.isPending || guardar.isPending}
            enviando={enviar.isPending}
            cobrando={cobrar.isPending}
            guardadoEn={guardadoEn}
            onGuardar={() => void guardarBorradorManual()}
            onDescuento={() => {
              if (!puedeDescuento) {
                mostrar("Requiere permiso tomar-pedido.descuento.", "error")
                return
              }
              setDescuentoAbierto(true)
            }}
            onQuitarDescuento={() => {
              setDescuento(null)
              mostrar("Descuento retirado; el cambio queda auditado.", "info")
            }}
            onPrecuenta={() => void imprimirPrecuenta()}
            onEnviar={() => {
              abrirConfirmacion()
            }}
            onCobrar={() => void cobrarPedido()}
          />
        </div>
      </div>

      <ModificadoresDialog
        open={Boolean(productoMods)}
        producto={productoMods}
        linea={lineaMods}
        moneda={moneda}
        onClose={() => {
          setProductoMods(null)
          setLineaMods(null)
        }}
        onGuardar={guardarModificadores}
      />

      <NotaLineaDialog
        open={Boolean(lineaNota)}
        linea={lineaNota}
        onClose={() => setLineaNota(null)}
        onGuardar={(nota) => {
          if (lineaNota) {
            setLineas((actuales) =>
              actuales.map((linea) => (linea.id === lineaNota.id ? { ...linea, notas: nota } : linea)),
            )
            mostrar("Nota de la línea guardada.", "exito")
          }
          setLineaNota(null)
        }}
      />

      <DescuentoDialog
        open={descuentoAbierto}
        descuento={descuento}
        subtotalCentavos={totales.subtotalCentavos}
        moneda={moneda}
        usuario={usuario.nombre}
        puedeDescuento={puedeDescuento}
        onClose={() => setDescuentoAbierto(false)}
        onAplicar={(nuevo) => {
          setDescuento(nuevo)
          mostrar(`Descuento aplicado y auditado: ${nuevo.motivo}.`, "exito")
        }}
        onQuitar={() => setDescuento(null)}
      />

      <ConfirmarEnvioDialog
        open={envioAbierto}
        modalidad={modalidad}
        mesaNumero={mesaNumero}
        clienteNombre={cliente?.nombre ?? null}
        lineas={lineas}
        totales={totales}
        descuento={descuento}
        turnoAbierto={Boolean(turno)}
        avisoMesa={avisoMesa}
        enviando={enviar.isPending}
        moneda={moneda}
        onClose={() => setEnvioAbierto(false)}
        onConfirm={() => void confirmarEnvio()}
      />

      <p className="tp-atajos">
        Atajos: <kbd>F2</kbd> buscar · <kbd>F9</kbd> enviar · <kbd>+</kbd>/<kbd>−</kbd> cantidad · <kbd>Supr</kbd>{" "}
        quitar línea · modalidad {MODALIDAD_LABEL[modalidad].toLowerCase()}
      </p>
    </div>
  )
}
