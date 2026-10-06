# 20 — Tomar pedido (captura manual en caja) (`/tomar-pedido`)

> **Bloque:** Operación · se muestra en el sidebar **debajo de Pedidos** · **Prioridad:** MVP
> **Fuentes:** [R5 §4.6](../../requerimientos/05-panel-administracion.md) (pedidos), flujo de toma del
> [plan 03 §5.2](../front/03-plan-apk-mesero.md) (APK del mesero) y modalidades del
> [plan 02](../front/02-plan-web-pedidos.md); datos de
> [esquema 02](../../esquema/02-catalogo-salon-reservas.md) y
> [03](../../esquema/03-pedidos-y-dinero.md). Convenciones en [00-indice.md](./00-indice.md) §4.

---

## 1. Contexto y alcance

**Qué resuelve.** El alta **manual** de un pedido desde el panel, como si se tomara en caja o
mostrador: elegir modalidad, cliente y mesa (si aplica), armar el carrito desde la carta con
modificadores y notas, ver los totales y **enviar a cocina**. El pedido nace real (`pedido` +
`comanda` por estación) y desde ahí vive en [02 — Pedidos](./02-pedidos.md) como cualquier otro.

**Por qué un módulo aparte.** Pedidos es lectura + acciones sobre pedidos existentes; esta pantalla
es de **captura**, con otra ergonomía (dos columnas, teclado, carrito) y otra audiencia (cajero,
mostrador, capitán). Separarla evita sobrecargar el detalle de Pedidos y permite operar sin el APK
del mesero (contingencia) o desde el teléfono.

**Trazabilidad de requisitos.** R5 **no tiene un RF explícito** de alta manual desde el panel: es
una **extensión solicitada por operación** que se apoya en RF-R5-50/51/52/53 (pedidos, detalle,
bitácora, acciones), RN-R5-01 (auditoría), RN-R5-04 (snapshot), RN-R5-06 (permisos sensibles),
RN-R5-08 (sellos del servidor), RNF-R5-01 (alcance por sucursal) y RNF-R5-08 (formatos). **Supuesto:**
conviene formalizar el RF en la próxima revisión de R5.

**Fuera de alcance:** cobro, arqueo y cierre ([11 — Caja](./11-caja-turnos.md),
[12 — Pagos](./12-pagos.md)); edición de pedidos ya enviados ([02 — Pedidos](./02-pedidos.md));
operación de cocina ([04 — Comandas](./04-comandas.md) / KDS).

**Supuesto:** disponible para roles de caja/mostrador/capitán; opera sobre la **sede activa** del
shell y exige un **turno de caja abierto** solo para cobrar (V1), no para enviar.

## 2. Requisitos cubiertos

| Referencia | Uso en este módulo | Prioridad |
|---|---|---|
| RF-R5-50 | El pedido creado entra al listado en vivo e historial | MVP |
| RF-R5-51 | Líneas y modificadores reflejan exactamente lo cobrado/impreso | MVP |
| RF-R5-52 | La bitácora nace con `creado` y `enviado` | MVP |
| RF-R5-53 | Reasignar mesa/mesero, anular línea y reimprimir se delegan a Pedidos | MVP (básicas) |
| RN-R5-01 / 02 | Motivo + auditoría en descuentos; bitácora inmutable | MVP |
| RN-R5-04 | Snapshot: el carrito recalcula precios, el pedido ya enviado no cambia | MVP |
| RN-R5-06 | Descuento manual y cobro exigen permisos específicos | MVP |
| RN-R5-08 / RNF-R5-08 | Sellos del servidor y formatos de la sede | MVP |
| RNF-R5-01 | El alcance por sucursal lo aplica el servidor | MVP |

## 3. Rutas y pantallas

- `/tomar-pedido` — pantalla única de dos columnas:
  - **Barra superior de contexto:** `ModalidadSelector` (Mesa · Recoger · Domicilio), mesa asignada,
    cliente (opcional), mesero y turno abierto.
  - **Catálogo (izquierda):** categorías como pestañas/chips, buscador, grid de `ProductoCard` con
    precio vigente y estado de agotado (no agregable, con explicación y origen).
  - **Carrito (derecha):** líneas con producto, modificadores, notas, cantidad (+/−), quitar;
    `TotalesPanel` (subtotal, impuestos, descuento, propina sugerida, total); acciones
    **Guardar borrador**, **Imprimir pre-cuenta**, **Enviar a cocina** y **Cobrar** (V1).
- Query params soportados: `?mesa=`, `?modalidad=`, `?cliente=`, `?borrador=` (recuperar).
- Diálogos: `ModificadoresDialog` (grupos con min/max y obligatorios), `NotaLineaDialog`,
  `ClientePicker` (búsqueda por teléfono/nombre + alta rápida), `MesaPicker` (solo mesas
  disponibles), `DescuentoDialog` (permiso + motivo), `ConfirmarEnvioDialog` (resumen e impacto).
- Atajos: `F2` foco del buscador, `+`/`−` cantidad, `Supr` quitar línea, `F9` enviar (con
  confirmación). Lector de código de barras: **V1 (supuesto)**.

## 4. Datos

| Tabla | Uso |
|---|---|
| `pedido` / `pedido_linea` / `pedido_linea_modificador` | Pedido creado y carrito confirmado; snapshot de nombre, precio e impuestos por línea |
| `comanda` / `comanda_linea` | Se generan al enviar, agrupadas por estación |
| `producto` / `producto_precio` / `grupo_modificador` / `modificador` / `disponibilidad_producto` | Catálogo, precio vigente, modificadores y agotados |
| `estacion` / `regla_sla` | Estación destino de cada línea y SLA inicial de la comanda |
| `mesa` / `sesion_mesa` / `zona` | Mesas disponibles, ocupación y bloqueo `fuera_servicio` |
| `cliente` | Búsqueda y alta rápida; sin consentimiento no se usa para marketing |
| `turno` | Turno abierto de la sede (requisito de cobro V1) |
| `ajuste_pedido` | Descuento manual con motivo |
| `trabajo_impresion` | Pre-cuenta y comandas impresas |
| `bitacora_evento` / `evento_auditoria` | Eventos `creado`, `enviado`, `comanda_enviada`; auditoría de descuento |

Notas: el **precio se congela** en la línea al confirmar (RN-R5-04); todos los sellos
(`creado_en`, `enviado_en`…) los pone el servidor (RN-R5-08).

## 5. API propuesta

| Método y ruta | Para qué |
|---|---|
| `GET /admin/tomar-pedido/catalogo` | Categorías y productos con precio vigente, modificadores, impuestos, agotados y estación |
| `GET /admin/tomar-pedido/contexto` | Mesas con estado, meseros en turno y turno de caja abierto |
| `GET /admin/tomar-pedido/clientes?q=` | Búsqueda de cliente por teléfono o nombre |
| `POST /admin/tomar-pedido/borradores` | Crear borrador (carrito) |
| `PATCH /admin/tomar-pedido/borradores/:id` | Autosave del carrito |
| `DELETE /admin/tomar-pedido/borradores/:id` | Descartar borrador |
| `POST /admin/tomar-pedido/borradores/:id/enviar` | Confirmar: crea `pedido` + `comanda`s y folio (**Idempotency-Key**) |
| `POST /admin/tomar-pedido/borradores/:id/precuenta` | Imprimir pre-cuenta (`trabajo_impresion`) |
| `POST /admin/tomar-pedido/borradores/:id/cobrar` | V1: pasa a `por_cobrar` y enlaza con Caja/Pagos |

Realtime: `pedido.creado`, `comanda.creada`, `mesa.estado` (para liberar ocupar la mesa al enviar).

## 6. Frontend

- Layout de caja: catálogo flexible a la izquierda (60–65 %) y carrito fijo a la derecha (35–40 %),
  ambas columnas con scroll propio en escritorio; en tableta el carrito pasa a hoja inferior.
- Componentes: `ModalidadSelector`, `ContextoPanel`, `CatalogoPanel` (`CategoriaChips`, `Buscador`,
  `ProductoCard`), `CarritoPanel` (`LineaCarrito`, `CantidadStepper`), `TotalesPanel`,
  `ClientePicker`, `MesaPicker`, `ModificadoresDialog`, `NotaLineaDialog`, `DescuentoDialog`,
  `ConfirmarEnvioDialog`.
- **Autosave del borrador** (localStorage + `PATCH`) con recuperación al volver; indicador «Borrador
  guardado hh:mm:ss».
- Estados: catálogo cargando/error/vacío; carrito vacío explicado; sin turno (aviso, envío permitido
  y cobro bloqueado en V1); sin permisos.

## 7. Permisos y trazabilidad

- Pares de permiso: `tomar-pedido.ver`, `tomar-pedido.crear` (agregar/enviar), `tomar-pedido.descuento`,
  `tomar-pedido.cobrar` (V1), `tomar-pedido.precuenta`.
- El **descuento manual** exige permiso y **motivo obligatorio**; queda en `ajuste_pedido` y en
  `evento_auditoria` (RN-R5-01/06).
- La bitácora del pedido nace con actor (usuario del panel), canal (`Panel · Mostrador`), dispositivo
  y hora del servidor; las comandas se registran al enviarse (RF-R5-52, §5.2 de R5).

## 8. Estados y casos borde

| Caso | Comportamiento esperado |
|---|---|
| Producto agotado | No se agrega; se explica origen y vigencia y se sugiere alternativa |
| Cambio de precio con carrito abierto | El carrito se recalcula antes de confirmar; los pedidos ya creados no cambian (RN-R5-04) |
| Mesa ocupada o `fuera_servicio` | No se ofrece; si se fuerza, confirmación con aviso |
| Modificadores obligatorios sin elegir | Bloquea «Agregar» y explica qué falta |
| Doble clic en «Enviar» | Idempotencia: un solo pedido (misma `Idempotency-Key`) |
| Sin turno de caja abierto | Se puede enviar con aviso; «Cobrar» (V1) queda bloqueado |
| Línea sin estación asignada | Aviso al enviar: no genera comanda (no llega a cocina) |
| Impresora caída | El envío no se bloquea; se encola `trabajo_impresion` y se avisa para reintentar |
| Cliente con opt-out | La búsqueda funciona, pero no se ofrecen acciones de marketing/newsletter |
| Descuento sin permiso | Acción ausente u deshabilitada con tooltip «Requiere permiso de …» |

## 9. Criterios de aceptación

1. Se puede crear un pedido de mesa, recoger o domicilio sin salir de la pantalla y enviarlo a cocina.
2. El pedido enviado aparece de inmediato en En vivo y en Pedidos con folio, líneas, modificadores y
   bitácora completa (`creado` → `enviado` → `comanda_enviada`).
3. Los agotados no se pueden agregar y se ve su origen; al reactivarse vuelven a estar disponibles.
4. Un descuento manual sin motivo o sin permiso no se puede aplicar; con ambos, queda auditado.
5. Reenviar el mismo carrito no duplica pedidos (idempotencia).
6. Los totales del carrito coinciden con lo enviado y con lo que muestra el detalle de Pedidos.
7. El borrador se recupera al recargar la página.

## 10. Plan de trabajo

- **F1 — API/datos:** endpoints del §5 y contrato de líneas/modificadores; snapshot de precio y
  agrupación por estación.
- **F2 — Catálogo:** categorías, búsqueda, cards con agotados y modificadores.
- **F3 — Carrito y contexto:** modalidad, mesa/cliente/mesero, cantidades, notas, totales, borradores.
- **F4 — Envío y enlaces:** confirmación, idempotencia, impresión de pre-cuenta, enlaces con Pedidos,
  En vivo, Caja/Pagos (V1).
- **F5 — Pruebas y accesibilidad:** teclado, casos borde del §8, auditoría y permisos.

## 11. Dependencias y pendientes

- Depende de: [06 — Catálogo](./06-catalogo.md) (precio/agotados), [05 — Salón](./05-salon.md)
  (mesas), [07 — Estaciones](./07-estaciones.md) (comandas), [11 — Caja](./11-caja-turnos.md) y
  [12 — Pagos](./12-pagos.md) (cobro V1), [02 — Pedidos](./02-pedidos.md) (seguimiento).
- Pendiente: **formalizar el RF** de alta manual en R5; decidir si el carrito puede quedar
  **compartido entre cajeros** (V2); lector de código de barras (V1); propina sugerida en el paso de
  cobro (V1).
