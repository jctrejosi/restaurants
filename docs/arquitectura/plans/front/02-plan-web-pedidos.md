# 02 — Plan del front: web de pedidos del cliente

**Entregable de este documento:** el brief de diseño y los **prompts listos para pegar en
Figma Make** que generan la interfaz completa de la **web de pedidos** (mesa por QR, recoger y
domicilio). La fuente de requisitos es
[`../../requerimientos/02-web-pedidos-cliente.md`](../../requerimientos/02-web-pedidos-cliente.md)
(en adelante «el documento R2»); este plan no cambia requisitos: los traduce a pantallas,
componentes, estados y textos.

**Serie:** este es el plan `02` de la serie de front ([`README.md`](./README.md)). Reutiliza las
**fundaciones visuales** (tokens, tipografía, retícula, accesibilidad) y el inventario base de
[`01-plan-web-reservas.md`](./01-plan-web-reservas.md) §3 y §5 — aquí solo se definen los
componentes y pantallas **propios del pedido**. Se trabaja preferentemente sobre el **mismo
archivo de Figma** («Web Cliente — Punto C»).

**Estado:** propuesta v0.1 — sujeta a las decisiones abiertas de R2 §17 (pago en línea, reparto,
cobertura y tarifas, empaque) y a la marca (§3.1 del plan 01).

---

## 1. Cómo usar este documento

| Paso | Acción | Prompt |
|---|---|---|
| 1 | **Si el archivo de reservas ya existe**: abrirlo y pegar el prompt maestro del pedido (variante A). | §12-A |
| 2 | **Si es un archivo nuevo**: pegar el prompt maestro (variante B, autocontenido: fundaciones + base). | §12-B |
| 3 | Generar **carta en modo pedido + personalización de producto** | §13.1–§13.2 |
| 4 | Generar **carrito y checkout completo** (modalidad, recoger, domicilio, pago) | §13.3–§13.8 |
| 5 | Generar **confirmación, seguimiento, QR de mesa, cancelar, comprobante, calificar y cuenta** | §13.9–§13.16 |
| 6 | Aplicar **estados de operación, prototipo y micro-interacciones**; revisar con la lista de verificación (§11.3) | §13.17–§13.18 |

**Regla de oro:** un prompt por pantalla; si la generación desvía el estilo, repetir «mantén los
tokens y componentes ya definidos en el archivo». El carrito y el checkout son **una sola
experiencia**: genera carrito y checkout seguidos, en la misma sesión.

### 1.1 Convenciones

- Copy **en español** (es-MX; moneda y formatos por sucursal).
- Productos, precios, zonas y modalidades de ejemplo coinciden con el seed
  (`backend/scripts/seed.ts`) y con los datos del plan 01 §10.
- Los estados del pedido se muestran con **nombres para el cliente**, no con los del modelo:

| Estado (modelo) | Etiqueta al cliente | Cuándo |
|---|---|---|
| `enviado` | Recibido | Al confirmar |
| `en_preparacion` | En la cocina | Cocina lo toma |
| `listo` | Listo · «Listo para recoger» | Terminó preparación |
| `en_camino` | En camino | Domicilio, repartidor salió |
| `entregado` | Entregado | Cierre de entrega o retiro |
| `por_cobrar` | Por cobrar | Mesa sin pagar |
| `pagado` | Pagado | Pago conciliado |
| `cancelado` | Cancelado | Terminal alterno |

---

## 2. Contexto del producto

### 2.1 Qué es

La **misma web pública** del plan 01, en «modo pedido»: la carta gana un botón *Agregar* y un
carrito; el usuario paga y **sigue su pedido en línea**. El pedido entra a cocina (KDS) y es
visible para el salón (APK del mesero) con el mismo modelo de datos, sin importar el canal
(RN-23 del análisis del legado).

### 2.2 Modalidades

| Modalidad | Entrada típica | Se asocia a | Particularidades visuales |
|---|---|---|---|
| **Mesa (QR)** | QR en la mesa | Mesa + sesión de mesa | Banner de mesa fijo, pedir cuenta, nota «tu mesero sigue atendiéndote» |
| **Recoger** | Carta web o enlace directo | Sucursal | Hora de recogida («lo antes posible» o programada) y código/QR de retiro |
| **Domicilio** | Carta web | Zona de cobertura + repartidor | Validación de dirección, tarifa, mínimo, tiempo estimado y seguimiento con repartidor |

### 2.3 Objetivos medibles (R2 §15)

- Checkout corto: carrito siempre accesible y **checkout en una sola pantalla** cuando se pueda.
- Totales **siempre** iguales a los del servidor (RNF-R2-04); el navegador solo muestra.
- Conversión, ticket promedio, abandono y recompra medibles con consentimiento.
- WCAG 2.2 AA y CWV en verde en móvil (RNF-R2-03); la web **nunca** almacena datos de tarjeta
  (RNF-R2-01).

### 2.4 Decisión de fases (supuesto por defecto de R2 §17)

- **MVP:** pago **contra entrega / al recoger / en caja**; sin pasarela. El pedido confirma con
  pago pendiente y el flujo no menciona «pago seguro» que no exista.
- **V1:** pago en línea (tarjeta/transferencia), propina, factura, reparto propio, cupones,
  seguimiento con repartidor y cuenta con historial.
- **V2:** división de cuenta, venta por peso, fidelidad, reparto de terceros.

---

## 3. Fundaciones visuales (reutilizadas)

Se heredan **sin cambios** los tokens, tipografía, retícula, formas, sombras, iconografía,
fotografía y movimiento del plan 01 §3. Adiciones específicas del pedido:

| Token/patrón | Valor | Uso |
|---|---|---|
| `overlay` | `rgba(28,25,23,.55)` | Fondo de bottom-sheets y modales |
| `success-100` / `success-600` | `#E8EFE4` / `#4A6B3F` | Pago aprobado, pedido entregado |
| `track-100` / `track-600` | mismo par oliva | Pasos completados del timeline |
| `pending-100` / `pending-600` | `#FCF0DC` / `#B45309` | En preparación, cocina saturada |
| Altura de barra de carrito | 64 px + `safe-area` | Barra fija inferior en móvil |
| Densidad | cómoda | El flujo se usa de pie, con prisa y a una mano |

**Regla de una mano:** acciones primarias del carrito/checkout en el tercio inferior de la
pantalla móvil (barra fija), nunca solo en la cabecera.

---

## 4. Arquitectura de información

### 4.1 Entradas al flujo

1. **Carta web** (`/carta`) → botón *Agregar* por producto.
2. **QR de mesa** (`/mesa/:token`) → abre la carta con el contexto de mesa.
3. **Enlace directo** (`/pedir?sede=centro&modalidad=recoger`) desde campañas o WhatsApp.
4. **Historial** (V1) → «Repetir pedido».

### 4.2 Páginas

| # | Página | Ruta | Objetivo | Prioridad |
|---|---|---|---|---|
| 1 | Carta en modo pedido | `/carta` (+ `?modo=pedir`) | Agregar al carrito con disponibilidad viva | MVP |
| 2 | Personalizar producto | sheet (móvil) / drawer (escritorio) | Modificadores, notas y cantidad | MVP |
| 3 | Carrito | `/carrito` (drawer o página) | Revisar líneas, conflictos, cupón y totales | MVP |
| 4 | Checkout: modalidad | `/checkout` sección 1 | Elegir mesa/recoger/domicilio según sede | MVP |
| 5 | Checkout: recoger | `/checkout` sección 2 | «Lo antes posible» o franja programada | V1 |
| 6 | Checkout: domicilio | `/checkout` sección 2 (domicilio) | Dirección + cobertura + tarifa + mínimo | V1 |
| 7 | Checkout: datos y pago | `/checkout` sección 3 | Contacto, propina, método y confirmación | MVP |
| 8 | Pedido recibido | `/pedido/:codigo?t=:token` | Código, ETA y qué sigue | MVP |
| 9 | Seguimiento | `/pedido/:codigo?t=:token` (estados) | Timeline por modalidad, acciones | V1 |
| 10 | Mesa por QR | `/mesa/:token` | Contexto de mesa + pedir cuenta/pagar (V1) | MVP |
| 11 | Cancelar pedido | `/pedido/:codigo?t=:token` (acción) | Política y motivo | V1 |
| 12 | Comprobante / factura | `/pedido/:codigo?t=:token` → comprobante | Descargar y facturar | V1 |
| 13 | Calificación | `/pedido/:codigo?t=:token` → calificar | Estrellas + comentario | V1 |
| 14 | Historial y repetir | `/cuenta/pedidos` | Recompra en un clic | V1 |
| 15 | Recuperar carrito | `/carrito/recuperar?t=:token` | Retomar carrito abandonado | V1 |
| 16 | Operación cerrada | estados en carta y checkout | Fuera de horario, pausado, cocina saturada | MVP |
| 17 | 404 / errores | `*` | Salida a la carta | MVP |

### 4.3 Navegación en «modo pedido»

- La cabecera del plan 01 gana: **selector de modalidad** (cuando aplica) y **botón de carrito**
  con contador; en mesa, un **banner fijo de mesa** («Mesa 12 · Sucursal Centro»).
- En móvil, al haber carrito: **barra inferior fija** «Ver carrito · 3 · $345» que abre el
  carrito; sustituye al botón flotante de WhatsApp mientras se pide.
- El seguimiento es **público con token** (RNF-R2-06): se puede cerrar la pestaña y volver por
  correo/WhatsApp.

---

## 5. Inventario de componentes

Se reutilizan del plan 01: `Header`, `Footer`, `Button`, `Chip`, `Badge`, `Card`, `Accordion`,
`Modal`, `Drawer`, `Toast`, `Skeleton`, `EmptyState`, `ErrorState`, `ProductCard`,
`ProductSheet`, `PriceTag`, `DietBadge`, `AllergenList`, `SedeSelector`, `MapBlock`, `Gallery`,
`HoursTable`, `StepperMini`.

### 5.1 Componentes nuevos

| Componente | Variantes | Dónde | Notas |
|---|---|---|---|
| `ModeSelector` | 3 tarjetas (mesa/recoger/domicilio) con disponibilidad | Checkout §1 | Deshabilita modalidades no disponibles con motivo |
| `TableBanner` | fijo / compacto | Mesa QR, seguimiento | Mesa, sede y enlace a «pedir cuenta» |
| `AddToCartButton` | compacto (card) / ancho (sheet) | Carta, producto | Estado «Agregado ✓» temporal |
| `ModifierSheet` | bottom-sheet (móvil) / drawer (escritorio) | Personalizar | Grupos obligatorios, min/max, costo adicional, notas |
| `QuantityStepper` | sm / md | Producto, carrito | Límites por línea |
| `CartDrawer` | lateral / página | Carrito | Líneas con miniatura, notas, quitar con «Deshacer» |
| `CartSummaryBar` | fija inferior (móvil) | Global en modo pedido | Total y contador en vivo |
| `TotalsBreakdown` | carrito / checkout / seguimiento | Varias | Subtotal, promoción, empaque, envío, impuestos, propina, total |
| `PromoCodeInput` | inline | Carrito/checkout | Explica por qué un cupón no aplica |
| `CartConflictAlert` | agotado / cambio de precio | Carrito/checkout | Acción: quitar, sustituir, aceptar nuevo precio |
| `UpsellRail` | «Lo que piden con esto» | Carrito, seguimiento | Nunca bloquea el checkout |
| `OrderModeBadge` | mesa / recoger / domicilio | Seguimiento, recibos | Icono + texto |
| `AddressForm` | con autocompletado y pin | Checkout domicilio | Etiquetas claras; «Referencias» opcional |
| `CoverageChecker` | mapa + resultado | Checkout domicilio | Estados: en zona, fuera de zona, geocodificación fallida |
| `CoverageResultCard` | en zona / fuera | Checkout domicilio | Fuera: ofrece recoger (RN-R2-06) |
| `PickupSlotPicker` | ASAP + rejilla de horas | Checkout recoger | Solo dentro de la ventana permitida |
| `EtaCard` | preparación / listo / en camino | Confirmación y seguimiento | Rango honesto, se actualiza |
| `TipSelector` | 0 / 10 % / 15 % / 20 % / monto libre | Checkout pago | Fuera del total de productos (RN-R2-13) |
| `PaymentMethodSelector` | radio-cards con icono | Checkout pago | Solo medios habilitados por sede (RF-R2-35) |
| `PaymentStatusPanel` | procesando / rechazado / aprobado | Checkout pago | Reintento sin duplicar (RN-R2-05) |
| `SubmitOrderButton` | normal / enviando / pagando | Checkout | Bloqueo durante el envío (idempotencia) |
| `OrderStatusTimeline` | mesa / recoger / domicilio | Seguimiento | Pasos con sello de hora; estado actual en vivo |
| `OrderCodeCard` | código / QR | Confirmación, recoger | Código copiable y «mostrar QR» |
| `ReceiptCard` | simple / descargable | Confirmación, historial | Comprobante (V1) y factura (V1) |
| `RatingSheet` | estrellas + comentario | Post-entrega | Solo tras `entregado` |
| `RepeatOrderCard` | con aviso de cambios | Historial | «2 productos ya no están disponibles» |
| `OperationNotice` | cerrado / pausado / saturado | Carta, checkout | Con acciones: programar, otra sede, recoger |
| `FulfillmentMap` | estático / en vivo (V1) | Domicilio | Carga con consentimiento |

---

## 6. Especificación pantalla por pantalla

### 6.1 Carta en modo pedido (`/carta`) — RF-R2-01, 07, 08, 83

- Cada `ProductCard` gana `AddToCartButton` (solo si sede y horario lo permiten).
- Producto agotado: tarjeta atenuada, «Agotado» y sin botón; si se agota con carrito armado →
  `CartConflictAlert`.
- Fuera de horario de la franja: «Disponible en {franja}» y sin botón.
- Cabecera con `SedeSelector` y, si la sede tiene varias modalidades, `ModeSelector` en versión
  compacta. Barra `CartSummaryBar` cuando hay líneas.
- Estado de operación (`OperationNotice`): sede cerrada → «Hoy estamos cerrados»; recepción
  pausada → «Por ahora no recibimos pedidos en línea»; cocina saturada → «Programa tu pedido».

### 6.2 Personalizar producto (`ModifierSheet`) — RF-R2-01, 02

- Móvil: bottom-sheet a pantalla casi completa; escritorio: drawer derecho.
- Cabecera: foto opcional, nombre, precio base; cierre con X y gesto.
- Grupos de modificadores en orden: **obligatorios primero** («Elige el término · obligatorio»),
  con contador de selección («1 de 3»), min/max aplicados y costo adicional por opción; opción
  única como radio-cards, múltiple como checkbox-cards.
- Campo de notas por ítem («Sin cebolla, salsa aparte») con contador de caracteres y ayuda
  («Las notas viajan a cocina»).
- `QuantityStepper` y total de la línea en vivo, que suma modificadores.
- Pie fijo: «Agregar · $125» deshabilitado hasta cumplir obligatorios, con mensaje que dice qué
  falta.
- Fracción/peso (V2): selector «N T» con vista previa del subtotal (no en MVP/V1).

### 6.3 Carrito (`/carrito`) — RF-R2-03, 04, 05, 06, 07, 09, 11

- Móvil: página completa; se llega desde `CartSummaryBar`. Escritorio: drawer lateral.
- Líneas: miniatura, nombre, modificadores resumidos, notas, `QuantityStepper`, precio de línea,
  «Quitar» con toast «Deshacer». Editar línea reabre `ModifierSheet`.
- `CartConflictAlert` por línea y global: producto agotado (quitar/sustituir) y cambio de precio
  («El precio de {producto} cambió: $115 → $125. Nuevo total actualizado.»).
- `PromoCodeInput` con estado de error legible («Este cupón venció el 30/09»).
- `UpsellRail` «Lo que piden con esto» (máximo 3, no invasivo).
- `TotalsBreakdown` con propina aún no (se elige en pago) y aviso «El total final se confirma al
  elegir modalidad» si aplican envío/empaque.
- Pie fijo: «Continuar» → checkout; nota «Totales calculados por el restaurante» (RNF-R2-04).
- Carrito persistente (V1): se recupera con el mismo contacto o enlace; vacío → `EmptyState`
  «Tu carrito está vacío» con «Ver la carta».

### 6.4 Checkout · sección 1: modalidad — RF-R2-40, 50, 60, 80, 81, 82, 83

- `ModeSelector` con las 3 tarjetas, cada una con su disponibilidad real: Mesa (solo si se abrió
  desde QR), Recoger, Domicilio; deshabilitadas con motivo («No hay reparto en tu zona», «La
  cocina está al tope»).
- Muestra sede activa y cambia a otra si el usuario quiere (`SedeSelector`).
- Fuera de horario: `OperationNotice` bloquea y ofrece programar (si la ventana lo permite) u
  otra sede.

### 6.5 Checkout · recoger (sección 2) — RF-R2-50, 51, 52

- `PickupSlotPicker`: «Lo antes posible (~25 min)» + rejilla de franjas de 15 min dentro de la
  ventana permitida por la sede (`ventana_programacion_min`).
- Resumen del horario elegido y política de llegada («Te guardamos el pedido 30 min»).
- Nota de aviso: «Te avisaremos por WhatsApp cuando esté listo».

### 6.6 Checkout · domicilio (sección 2) — RF-R2-22, 60, 61, 62

- `AddressForm` con autocompletado, número, piso/depto, referencias y teléfono de contacto.
- `CoverageChecker`: pin en mapa, estados:
  - **En zona:** tarjeta con tarifa, pedido mínimo, tiempo estimado total (preparación + ruta).
  - **Fuera de zona:** `CoverageResultCard` con «No llegamos a esta dirección» y CTA «Pedir para
    recoger» (RN-R2-06); opción de cambiar de sede si otra cubre.
  - **Geocodificación fallida:** pedir referencia manual con mapa y reintento.
- Si el subtotal < mínimo: aviso «Te faltan $45 para el mínimo de esta zona» con acceso a la
  carta; el botón de continuar permanece deshabilitado con explicación.
- V1: aviso si no hay repartidor disponible → programar u ofrecer recoger.

### 6.7 Checkout · datos (sección 3, parte 1) — RF-R2-20, 21, 24, 25

- Contacto: nombre, teléfono, correo (verificación ligera por OTP en V1 para clientes con
  cuenta); «Repetir pedido» (V1) precarga el contacto.
- Notas para el pedido («Sin timbre, llamar al llegar»).
- Factura (V1): checkbox «Requiero factura» que despliega RFC/NIT y razón social; se emite tras
  el pago.
- Consentimiento de datos y términos obligatorio (RF-R2-25) con enlace a legales; checkbox de
  marketing separado y opcional.
- Todo **sin registro**; al final se ofrece «crear cuenta para guardar tus pedidos» (RF-R2-21).

### 6.8 Checkout · pago (sección 3, parte 2) — RF-R2-30…35, 03, 09

- `TipSelector` (0/10/15/20/monto libre) con nota «La propina se registra aparte».
- `PaymentMethodSelector`:
  - **MVP:** «Pago contra entrega (efectivo o tarjeta al recibir)», «Pago al recoger», «Pago en
    caja» (mesa). Si la sede no lo permite, no se muestra (RF-R2-35).
  - **V1 en línea:** tarjeta, transferencia/QR bancario; textos «Pago seguro procesado por
    {pasarela}; no guardamos datos de tu tarjeta».
- `TotalsBreakdown` final: subtotal, descuentos, empaque (si aplica), envío, impuestos, propina y
  **total**; con la leyenda «Total confirmado por el restaurante».
- `SubmitOrderButton` con estados «Enviando pedido…» / «Procesando pago…»; doble clic bloqueado;
  si hay error de red, mensaje con reintento **sin duplicar** (RN-R2-05) y carrito intacto.
- `PaymentStatusPanel` (V1): procesando → aprobado/rechazado («No pudimos procesar el pago;
  puedes reintentar o pagar contra entrega», RNF-R2-08).
- Nota de conciliación: «Confirmamos tu pago con el banco, no solo con esta pantalla» traducida a
  lenguaje simple: «Si el banco confirma, verás tu pedido aquí».

### 6.9 Pedido recibido (estado inicial de `/pedido/:codigo`) — RF-R2-41, 70

- Check grande, «¡Pedido recibido!», `OrderCodeCard` con código copiable y `EtaCard`.
- `OrderStatusTimeline` en su primer paso («Recibido»), resumen de líneas y totales, modalidad y
  dirección/sede.
- Acciones: «Seguir mi pedido» (recarga el estado), «Seguir por WhatsApp» (V1), «Compartir enlace
  de seguimiento».
- Nota mesa: «Tu mesero ya ve este pedido en su pantalla»; nota recoger: «Te avisamos cuando
  esté listo»; domicilio: «Asignaremos a tu repartidor».
- Ofrece cuenta opcional: «Crea una cuenta para guardar y repetir este pedido».

### 6.10 Seguimiento (`/pedido/:codigo?t=:token`) — RF-R2-62, 63, 70, 71

- `OrderStatusTimeline` por modalidad:
  - **Mesa:** Recibido → En la cocina → Servido → Por cobrar → Pagado (con acción «Pedir cuenta»
    y «Pagar en línea» en V1).
  - **Recoger:** Recibido → En la cocina → **Listo para recoger** (con `OrderCodeCard` QR) →
    Retirado.
  - **Domicilio:** Recibido → En la cocina → Listo → **En camino** (repartidor y mapa en V1) →
    Entregado.
- `EtaCard` se ajusta con cada estado; si la cocina se retrasa, «Va un poco más lento de lo
  previsto» (honesto).
- Acciones contextuales: cancelar (con política), comprobante, calificar (al entregado), repetir,
  soporte (WhatsApp/teléfono con el código precargado).
- Estado cancelado: resumen del motivo y CTA de recompra.

### 6.11 Mesa por QR (`/mesa/:token`) — RF-R2-40, 42, 44

- `TableBanner` fijo: «Mesa 12 · Sucursal Centro» y acceso a «Pedir la cuenta».
- Carta en modo pedido con la mesa ya asociada; el paso de modalidad se omite (siempre `mesa`).
- Nota de convivencia: «Tu mesero sigue atendiéndote; puedes pedir aquí lo que quieras».
- «Pedir la cuenta»: sheet con resumen de los pedidos de la sesión y CTA; estado «Avisamos a tu
  mesero» con tiempo estimado.
- V1 «Pagar la mesa»: pago en línea del total de la sesión; V2 división en partes iguales.
- QR inválido, sesión cerrada o mesa reasignada: `ErrorState` «Este QR ya no está activo. Pide
  ayuda a tu mesero» (caso borde R2 §16).

### 6.12 Cancelar pedido — RF-R2-65, RN-R2-12

- Diálogo con la política **antes** de cancelar: «La cocina ya empezó tu pedido; cancelarlo puede
  aplicar un cargo del 50 %» o «Cancelas sin cargo porque aún no iniciamos».
- Motivo opcional en chips + confirmación; resultado con estado cancelado y recompra.
- Sin opción de cancelar cuando ya salió (`en_camino`): ofrece soporte.

### 6.13 Comprobante y factura (V1) — RF-R2-33

- `ReceiptCard` en confirmación e historial: folio, fecha, líneas, totales, propina y método.
- «Descargar comprobante» (PDF) y «Solicitar factura» con formulario fiscal mínimo; estado de la
  factura (emitida/pendiente).

### 6.14 Calificación (V1) — RF-R2-72

- `RatingSheet` al pasar a `entregado`: estrellas grandes, comentario opcional, chips de motivo
  (comida, tiempo, empaque, repartidor) y agradecimiento; nunca bloquea.

### 6.15 Historial y repetir (V1: `/cuenta/pedidos`) — RF-R2-21, 73

- Lista de pedidos con modalidad, fecha, total, estado y acciones (seguir, repetir, comprobante,
  calificar).
- `RepeatOrderCard`: «Repetir este pedido» rearma el carrito con precios vigentes y avisa los
  productos que ya no están o cambiaron de precio antes de continuar.

### 6.16 Recuperar carrito (V1) — RF-R2-04, R2 §10

- Enlace «Retoma tu pedido» (correo/WhatsApp con consentimiento) → `/carrito/recuperar?t=:token`
  que reconstruye el carrito vigente; si algo cambió, se avisa con `CartConflictAlert`.

### 6.17 Estados de operación — RF-R2-80…83

| Situación | Dónde aparece | Diseño |
|---|---|---|
| Fuera de horario | Carta y checkout | `OperationNotice` con horarios y «Reservar mesa» |
| Recepción pausada | Carta y checkout | Aviso + «Avisarme cuando abra» (suscriptor) |
| Cocina saturada | Checkout | Ofrece programar franja u otra sede |
| Sin repartidor (domicilio) | Checkout domicilio | Ofrece recoger o programar |
| Sede cerrada temporalmente | Carta | Aviso con fecha de reapertura y otras sedes |

---

## 7. Casos borde y errores (R2 §16)

| Caso | Tratamiento visual | Mensaje |
|---|---|---|
| Doble clic en «Pagar/Confirmar» | Botón en estado de envío; sin duplicados | «Estamos confirmando tu pedido…» |
| Pago aprobado y la web se cae | El seguimiento muestra el pedido confirmado al volver | «Tu pago se confirmó; tu pedido sigue en cocina.» |
| Producto agotado con carrito armado | `CartConflictAlert` por línea | «{Producto} se agotó. Quítalo o cámbialo por otro.» |
| Cambio de precio | Aviso y total recalculado antes de confirmar | «El precio cambió; este es el nuevo total.» |
| Fuera de cobertura | `CoverageResultCard` con alternativa | «Aún no llegamos a tu dirección. ¿Pedimos para recoger?» |
| QR de mesa inválido/cerrado | `ErrorState` | «Este QR ya no está activo. Pide ayuda a tu mesero.» |
| Cocina saturada | `OperationNotice` | «Estamos al tope en esta franja. Programa tu pedido o prueba otra sede.» |
| Sin repartidor | Aviso en domicilio | «No hay repartidor disponible ahora; puedes recoger sin costo de envío.» |
| No contesta en la entrega | Nota post-entrega en seguimiento | «No pudimos entregar. Te contactaremos según la política.» |
| Cancelación tras iniciar cocina | Diálogo con política | «Ya iniciamos tu pedido; aplicaríamos un cargo del {x} %.» |
| Productos de varias estaciones | Nota en seguimiento | «Tu pedido se prepara en cocina y barra; te avisamos al estar completo.» |
| Pago rechazado (V1) | `PaymentStatusPanel` | «No pudimos procesar el pago. Reintenta u otro medio; tu carrito sigue aquí.» |
| Promociones no acumulables | Explicación en carrito | «Se aplicó la mejor promoción para ti.» |

---

## 8. Accesibilidad, rendimiento y SEO

- Se heredan los criterios del plan 01 §8; específicos del pedido:
  - **Sheets y drawers:** trampa de foco, cierre con `Esc`, retorno de foco al cerrar,
    `aria-modal`; nunca bloquear el scroll del fondo sin gestión accesible.
  - **Carrito y timeline:** cambios anunciados con `aria-live` («Se agregó {producto} al
    carrito», «Tu pedido está listo»).
  - **Formularios de pago:** métodos como `radio-group` con etiquetas completas; errores
    asociados; el estado de envío bloquea doble envío y se anuncia.
- **Rendimiento:** las páginas de pedido son interactivas; la carta sigue siendo SSR/cacheable y
  el carrito es cliente; checkout ligero (sin librerías de mapa salvo domicilio aceptado).
- **SEO:** carta indexable; **checkout, carrito, seguimiento y confirmación con `noindex`**;
  seguimiento con token no listado en sitemap.
- **Analítica (con consentimiento):** `view_item`, `add_to_cart`, `begin_checkout`,
  `add_shipping_info` (domicilio), `add_payment_info`, `purchase`, `order_status_view`,
  `cancel_order`, `rate_order`, `repeat_order`; captura de UTM en el pedido (RNF-R1-10 aplica por
  analogía y R2 §10).

---

## 9. Copy deck (textos base)

| Clave | Texto |
|---|---|
| `cart.title` | Tu pedido |
| `cart.empty` | Tu carrito está vacío |
| `cart.emptyCta` | Ver la carta |
| `cart.continue` | Continuar |
| `cart.conflict.out` | {Producto} se agotó. Quítalo o cámbialo por otro. |
| `cart.conflict.price` | El precio de {producto} cambió. Actualizamos tu total. |
| `cart.promo.invalid` | Este cupón no está vigente. |
| `checkout.title` | Confirma tu pedido |
| `mode.mesa` | En la mesa |
| `mode.recoger` | Para recoger |
| `mode.domicilio` | A domicilio |
| `mode.unavailable` | No disponible ahora |
| `pickup.asap` | Lo antes posible |
| `pickup.schedule` | Programar hora |
| `pickup.readyNotice` | Te avisaremos por WhatsApp cuando esté listo. |
| `address.outOfCoverage` | Aún no llegamos a esta dirección |
| `address.outOfCoverageCta` | Pedir para recoger |
| `address.minimum` | Te faltan {monto} para el mínimo de esta zona |
| `payment.cash` | Pago contra entrega |
| `payment.pickup` | Pago al recoger |
| `payment.cashier` | Pago en caja |
| `payment.card` | Tarjeta (pago seguro) |
| `payment.rejected` | No pudimos procesar el pago. Reintenta u otro medio; tu carrito sigue aquí. |
| `payment.secure` | No guardamos datos de tu tarjeta. |
| `tip.question` | ¿Dejas propina? Se registra aparte del total. |
| `tip.none` | Sin propina |
| `totals.note` | Total confirmado por el restaurante |
| `submit.sending` | Enviando pedido… |
| `order.received` | ¡Pedido recibido! |
| `order.code` | Tu código de pedido |
| `order.eta` | Tiempo estimado |
| `track.mesa.note` | Tu mesero ya ve este pedido en su pantalla. |
| `track.recoger.note` | Muestra tu código al llegar; te guardamos el pedido 30 min. |
| `track.domicilio.note` | Te avisaremos cuando el repartidor salga. |
| `track.slow` | Va un poco más lento de lo previsto. Gracias por la paciencia. |
| `bill.request` | Pedir la cuenta |
| `bill.sent` | Avisamos a tu mesero. |
| `qr.invalid` | Este QR ya no está activo. Pide ayuda a tu mesero. |
| `cancel.policyFree` | Puedes cancelar sin cargo: aún no iniciamos tu pedido. |
| `cancel.policyCharged` | Ya iniciamos tu pedido; cancelar puede aplicar un cargo del {x} %. |
| `rating.title` | ¿Cómo estuvo tu pedido? |
| `operation.closed` | Hoy estamos cerrados. Te esperamos {próximo horario}. |
| `operation.busy` | Estamos al tope en esta franja. Programa tu pedido o prueba otra sede. |

---

## 10. Datos de ejemplo para el prototipo

```json
{
  "sede": { "id": "centro", "nombre": "Sucursal Centro", "modalidades": ["mesa", "recoger", "domicilio"] },
  "mesa": { "numero": "12", "token": "mesa-12-a7f3", "sesionActiva": true },
  "modificadores": {
    "hamburguesa": [
      { "grupo": "Punto de la carne", "tipo": "unica", "obligatorio": true, "min": 1, "max": 1,
        "opciones": [ { "nombre": "Término medio", "costo": 0 }, { "nombre": "Tres cuartos", "costo": 0 }, { "nombre": "Bien cocida", "costo": 0 } ] },
      { "grupo": "Extras", "tipo": "multiple", "obligatorio": false, "min": 0, "max": 3,
        "opciones": [ { "nombre": "Tocino", "costo": 15 }, { "nombre": "Queso extra", "costo": 10 }, { "nombre": "Huevo", "costo": 12 } ] }
    ],
    "cafe": [
      { "grupo": "Tamaño", "tipo": "unica", "obligatorio": true, "min": 1, "max": 1,
        "opciones": [ { "nombre": "12 oz", "costo": 0 }, { "nombre": "16 oz", "costo": 10 } ] },
      { "grupo": "Leche", "tipo": "unica", "obligatorio": false, "min": 0, "max": 1,
        "opciones": [ { "nombre": "Entera", "costo": 0 }, { "nombre": "Deslactosada", "costo": 0 }, { "nombre": "Almendra", "costo": 10 } ] }
    ]
  },
  "carrito": [
    { "producto": "Tacos al pastor", "cantidad": 2, "precio": 125, "notas": "Sin cebolla", "modificadores": [] },
    { "producto": "Limonada", "cantidad": 2, "precio": 35, "modificadores": [] },
    { "producto": "Hamburguesa de res", "cantidad": 1, "precio": 145,
      "modificadores": [ { "grupo": "Punto de la carne", "opcion": "Término medio", "costo": 0 }, { "grupo": "Extras", "opcion": "Tocino", "costo": 15 } ] }
  ],
  "totales": { "subtotal": 470, "descuento": 0, "empaque": 10, "envio": 35, "impuestos": 75, "propina": 47, "total": 637 },
  "zonas": [
    { "nombre": "Centro", "tarifa": 35, "minimo": 150, "tiempo": "35–50 min" },
    { "nombre": "Norte", "tarifa": 45, "minimo": 200, "tiempo": "45–60 min" }
  ],
  "franjasRecoger": ["13:00", "13:15", "13:30", "13:45", "14:00"],
  "pedido": {
    "codigo": "PC-9K3D1", "estado": "en_preparacion", "modalidad": "domicilio",
    "lineas": 3, "total": 637, "eta": "19:20–19:35",
    "repartidor": { "nombre": "Luis M.", "vehiculo": "Moto" }
  },
  "preguntasCalificar": ["Comida", "Tiempo de entrega", "Empaque", "Repartidor"]
}
```

---

## 11. Entregables esperados de Figma Make

### 11.1 Del archivo de Figma

| # | Entregable | Criterio |
|---|---|---|
| 1 | **Componentes nuevos** (§5.1) con variantes y estados | Reutilizan los del plan 01; nada duplicado |
| 2 | **Móvil (390)**: las 17 páginas de §4.2 | Con estados y sheets |
| 3 | **Escritorio (1440)**: carta, carrito, checkout, seguimiento, historial | Drawer lateral para carrito/producto |
| 4 | **Estados**: conflictos de carrito, pago rechazado, fuera de cobertura, cocina saturada, cerrado, QR inválido, vacío | Como mínimo los de §7 |
| 5 | **Prototipo** clickable: 3 caminos completos (mesa QR, recoger, domicilio) + pago rechazado + conflicto de agotado | Enlaces internos reales |
| 6 | **Notas de diseño**: decisiones y pendientes (R2 §17) | — |

### 11.2 Del código (si se exporta)

Mismo stack del plan 01 (§11.2): React + TypeScript + Vite + Tailwind v4 + Radix/shadcn +
lucide-react + react-hook-form + react-router. El proyecto final será `Interface web pedidos/`
(o módulo dentro de `Interface web reservas/` si el cliente prefiere una sola web con «modo
pedido»; **recomendado: una sola web** para compartir sesión, carta y fundaciones).

### 11.3 Lista de verificación

- [ ] Se puede pedir en las 3 modalidades, de principio a fin, sin registro.
- [ ] El carrito es accesible desde cualquier pantalla del flujo; total en vivo.
- [ ] Modificadores validan obligatorios, min/max y costo adicional antes de agregar.
- [ ] Los conflictos (agotado, cambio de precio) se muestran y resuelven antes de pagar.
- [ ] Domicilio: cobertura, tarifa, mínimo y tiempo se ven **antes** de pagar; fuera de cobertura
      ofrece recoger.
- [ ] Pago: solo medios habilitados; estado de envío bloquea doble confirmación; reintento no
      duplica.
- [ ] Propina separada del total de productos.
- [ ] Seguimiento con timeline por modalidad, código visible y acciones contextuales.
- [ ] QR: mesa bloqueada, pedir cuenta y errores de QR cubiertos.
- [ ] Estados de operación (cerrado, pausado, saturado, sin repartidor) diseñados.
- [ ] Accesibilidad AA, `aria-live` en carrito/timeline y foco gestionado en sheets.
- [ ] Prototipo enlaza: carta → producto → carrito → checkout → confirmación → seguimiento →
      repetir.

---

## 12. Prompt maestro para Figma Make

### 12-A. Sobre el archivo existente de reservas (recomendado)

```text
Este archivo ya tiene las fundaciones y los componentes base de la web del cliente (plan de
reservas): tokens de color, tipografía Fraunces + Inter, botones, inputs, cards, chips, sheets,
toasts, skeletons, estados vacíos y el flujo de reserva. NO los rehagas.

Vamos a añadir el MODO PEDIDO de la misma web (mesa por QR, recoger y domicilio). Crea únicamente
los componentes nuevos:
- ModeSelector (3 tarjetas: En la mesa / Para recoger / A domicilio, con disponibilidad y motivo
  cuando estén deshabilitadas).
- TableBanner (mesa y sede, con acción «Pedir la cuenta»).
- AddToCartButton, QuantityStepper, ModifierSheet (grupos con obligatorio/min/max y costo
  adicional, notas por ítem), CartDrawer, CartSummaryBar fija inferior en móvil, TotalsBreakdown
  (subtotal, descuentos, empaque, envío, impuestos, propina, total), PromoCodeInput,
  CartConflictAlert (agotado / cambio de precio), UpsellRail.
- AddressForm + CoverageChecker + CoverageResultCard, PickupSlotPicker, EtaCard, TipSelector,
  PaymentMethodSelector, PaymentStatusPanel, SubmitOrderButton con estados, OrderStatusTimeline
  (variantes mesa/recoger/domicilio), OrderCodeCard, ReceiptCard, RatingSheet, RepeatOrderCard,
  OperationNotice (cerrado/pausado/saturado).

Reglas: español; móvil primero (390) y escritorio (1440); barra de carrito fija abajo en móvil;
acciones primarias a una mano; accesibilidad AA; sheets con foco gestionado; cambios de carrito y
timeline anunciados con aria-live. Espera mi siguiente mensaje antes de generar pantallas.
```

### 12-B. Archivo nuevo (autocontenido)

```text
Diseña la web pública de pedidos de un restaurante llamado «Punto C»: el cliente arma un pedido
desde la carta, elige modalidad —en la mesa por QR, para recoger o a domicilio—, paga y sigue su
pedido en línea. Es la misma web de la marca (cálida contemporánea) y comparte la carta del sitio.
Español, mobile-first (390) y escritorio (1440).

FUNDACIONES (créalas como variables de Figma): fondo #FAF7F2; superficies #FFFFFF y #F3EDE4;
títulos Fraunces, texto Inter; acción terracota #B4451F (hover #8F3517); texto #1C1917/#3F3B38/
#6B6560; bordes #D6D0C9; éxito #4A6B3F; aviso #B45309; error #B3261E; estrellas #C99A2E; radios
8/12/16/full; sombras suaves; espaciado de 4; contenedor 1200; iconos Lucide.

COMPONENTES BASE: Button, Input/Select/Textarea/Checkbox/Radio con estados, Chip, Badge, Card,
Modal, Drawer, Toast, Skeleton, EmptyState, ErrorState, ProductCard, PriceTag, DietBadge,
AllergenList, SedeSelector, MapBlock.

COMPONENTES DE PEDIDO: ModeSelector, TableBanner, AddToCartButton, QuantityStepper, ModifierSheet,
CartDrawer, CartSummaryBar, TotalsBreakdown, PromoCodeInput, CartConflictAlert, UpsellRail,
AddressForm, CoverageChecker, CoverageResultCard, PickupSlotPicker, EtaCard, TipSelector,
PaymentMethodSelector, PaymentStatusPanel, SubmitOrderButton, OrderStatusTimeline, OrderCodeCard,
ReceiptCard, RatingSheet, RepeatOrderCard, OperationNotice.

Estados del pedido para el cliente: Recibido → En la cocina → Listo → En camino (domicilio) →
Entregado; en mesa además Por cobrar → Pagado; y Cancelado. Reglas: los totales los calcula el
restaurante (la web solo los muestra); el pago es idempotente (doble clic no duplica); el carrito
nunca se pierde; accesibilidad WCAG 2.2 AA. Primero fundaciones y componentes; espera mi
siguiente mensaje antes de generar pantallas.
```

---

## 13. Prompts por pantalla

### 13.1 Carta en modo pedido

```text
Diseña la CARTA EN MODO PEDIDO (móvil y escritorio) partiendo de la carta existente. Añade:
botón «Agregar» en cada tarjeta de producto disponible; estado «Agotado» atenuado sin botón;
«Disponible en {franja}» para productos fuera de horario; contador de carrito en la cabecera y,
en móvil, BARRA FIJA INFERIOR «Ver carrito · {n} · ${total}» cuando haya líneas. Cabecera con
selector de sede y, si hay varias modalidades, un selector compacto En la mesa / Para recoger / A
domicilio. Aviso de operación cuando aplique: «Hoy estamos cerrados. Te esperamos {próximo
horario}» o «Estamos al tope en esta franja: programa tu pedido o prueba otra sede». Usa los 12
productos de ejemplo del brief.
```

### 13.2 Personalizar producto

```text
Diseña PERSONALIZAR PRODUCTO como bottom-sheet en móvil (casi pantalla completa) y drawer derecho
en escritorio: foto opcional, nombre y precio base; grupos de modificadores con «obligatorio» y
contador «1 de 3»; opción única con radio-cards y múltiple con checkbox-cards mostrando el costo
adicional (+$15); campo de notas «Sin cebolla, salsa aparte» con ayuda «Las notas viajan a
cocina»; selector de cantidad; total de la línea en vivo; pie fijo «Agregar · $125» deshabilitado
hasta cumplir los obligatorios con el texto de qué falta. Ejemplos: hamburguesa (punto de la carne
obligatorio; extras tocino +15, queso +10, huevo +12) y café (tamaño 12/16 oz +10; leche entera,
deslactosada o almendra +10).
```

### 13.3 Carrito

```text
Diseña el CARRITO: página completa en móvil (se abre desde la barra fija) y drawer lateral en
escritorio. Líneas con miniatura, nombre, modificadores resumidos, notas, cantidad con +/-,
precio de línea y «Quitar» con toast «Deshacer». Incluye: alerta de conflicto por producto
agotado («{Producto} se agotó. Quítalo o cámbialo»), alerta de cambio de precio con total
recalculado, campo de cupón con error legible («Este cupón venció el 30/09»), riel «Lo que piden
con esto» (3 sugerencias), desglose de totales (subtotal, descuentos, empaque, envío, impuestos)
con la nota «Total confirmado por el restaurante», y pie fijo «Continuar» con el total. Estado
vacío: «Tu carrito está vacío» + «Ver la carta».
```

### 13.4 Checkout: modalidad

```text
Diseña el CHECKOUT en UNA PANTALLA (móvil apilado, escritorio en dos columnas con resumen a la
derecha). Sección 1 «¿Cómo quieres tu pedido?»: tres tarjetas grandes — En la mesa, Para recoger,
A domicilio — con disponibilidad real y motivo cuando estén deshabilitadas («No hay reparto en tu
zona», «La cocina está al tope»). Muestra la sede activa con opción de cambiarla. Si está fuera
de horario, bloquea con OperationNotice y ofrece programar u otra sede. El resto de secciones
(varían según modalidad) se generan en los siguientes prompts; deja el resumen lateral con
sede, modalidad, líneas y totales.
```

### 13.5 Checkout: recoger

```text
Diseña la sección de RECOGER dentro del checkout: opción «Lo antes posible (~25 min)» y rejilla
de horas programadas en franjas de 15 min dentro del horario; resumen de la hora elegida; nota
«Te avisaremos por WhatsApp cuando esté listo» y «Te guardamos el pedido 30 minutos».
```

### 13.6 Checkout: domicilio

```text
Diseña la sección de DOMICILIO dentro del checkout: formulario de dirección (calle, número,
piso/depto, referencias, teléfono), mapa con pin arrastrable y botón «Confirmar dirección».
Resultado de cobertura: EN ZONA → tarjeta con tarifa ($35), pedido mínimo ($150), tiempo
estimado («35–50 min») y desglose actualizado; FUERA DE ZONA → «Aún no llegamos a esta
dirección» con botón «Pedir para recoger»; GEOCODIFICACIÓN FALLIDA → pedir referencia manual con
reintento. Si el subtotal no alcanza el mínimo: «Te faltan $45 para el mínimo de esta zona» con
acceso a la carta y botón de continuar deshabilitado. Si no hay repartidor: ofrecer recoger o
programar.
```

### 13.7 Checkout: datos

```text
Diseña la sección de DATOS del checkout: nombre, teléfono, correo, notas del pedido («Sin timbre,
llamar al llegar»), checkbox «Requiero factura» que despliega RFC/NIT y razón social (V1),
checkbox obligatorio de consentimiento de datos y términos con enlaces, y checkbox separado y
opcional de marketing. Recuerda «Sin registro: solo necesitamos tu contacto». Deja espacio para
un bloque final «Crear cuenta para guardar tus pedidos» que aparecerá tras confirmar.
```

### 13.8 Checkout: pago

```text
Diseña la sección de PAGO del checkout: selector de propina (Sin propina · 10 % · 15 % · 20 % ·
monto libre) con nota «Se registra aparte del total»; métodos como radio-cards: «Pago contra
entrega (efectivo o tarjeta al recibir)», «Pago al recoger», «Pago en caja» (mesa); en V1 también
«Tarjeta (pago seguro)» y «Transferencia» con la nota «No guardamos datos de tu tarjeta».
Desglose final: subtotal, descuentos, empaque, envío, impuestos, propina y TOTAL destacado con
«Total confirmado por el restaurante». Botón primario «Confirmar pedido · $637» con estados
«Enviando pedido…» y bloqueo anti doble clic. Incluye el estado de pago rechazado (V1): «No
pudimos procesar el pago. Reintenta u otro medio; tu carrito sigue aquí.» con «Reintentar» y
«Cambiar medio».
```

### 13.9 Pedido recibido

```text
Diseña PEDIDO RECIBIDO (estado inicial del seguimiento): check grande, «¡Pedido recibido!»,
tarjeta con código grande y copiable (PC-9K3D1), tarjeta de tiempo estimado, timeline en su
primer paso «Recibido», resumen de líneas y totales, modalidad con su nota («Tu mesero ya ve este
pedido en su pantalla» / «Te avisamos por WhatsApp cuando esté listo» / «Asignaremos a tu
repartidor»), acciones «Seguir mi pedido», «Compartir enlace de seguimiento» y oferta discreta
«Crea una cuenta para guardar y repetir este pedido».
```

### 13.10 Seguimiento del pedido

```text
Diseña el SEGUIMIENTO del pedido (página pública con código y token) con tres variantes de
timeline: MESA (Recibido → En la cocina → Servido → Por cobrar → Pagado, con acciones «Pedir
cuenta» y «Pagar en línea»), RECOGER (Recibido → En la cocina → Listo para recoger con código QR
de retiro y «Muestra tu código al llegar; te guardamos el pedido 30 min» → Retirado) y DOMICILIO
(Recibido → En la cocina → Listo → En camino con repartidor y mapa → Entregado). Incluye tarjeta
de tiempo estimado que se ajusta («Va un poco más lento de lo previsto»), acciones contextuales
(cancelar con política, comprobante, calificar al entregado, repetir, soporte por WhatsApp con el
código precargado) y estado cancelado con motivo y recompra.
```

### 13.11 Mesa por QR

```text
Diseña la experiencia de MESA POR QR (`/mesa/:token`): banner fijo superior «Mesa 12 · Sucursal
Centro» con acción «Pedir la cuenta»; carta en modo pedido con la mesa ya asociada (sin paso de
modalidad); nota «Tu mesero sigue atendiéndote; puedes pedir aquí lo que quieras». Sheet de
«Pedir la cuenta»: resumen de los pedidos de la sesión, total y botón; estado enviado «Avisamos a
tu mesero» con tiempo estimado. Incluye el estado de error: «Este QR ya no está activo. Pide
ayuda a tu mesero.» En V1, «Pagar la mesa» en línea.
```

### 13.12 Cancelar pedido

```text
Diseña CANCELAR PEDIDO: diálogo con la política ANTES de cancelar («Puedes cancelar sin cargo:
aún no iniciamos tu pedido» o «Ya iniciamos tu pedido; cancelar puede aplicar un cargo del
{50 %}»), selector de motivo en chips (ya no lo necesito, me equivoqué, tarda demasiado, otro) y
confirmación. Resultado: estado cancelado con motivo, CTA «Volver a pedir» y comprobante. Si el
pedido ya salió (`en_camino`), no permitir cancelar y ofrecer soporte.
```

### 13.13 Comprobante y factura

```text
Diseña COMPROBANTE Y FACTURA: tarjeta de comprobante (folio, fecha, líneas, subtotal, impuestos,
propina, total, método de pago y modalidad) con «Descargar comprobante (PDF)»; botón «Solicitar
factura» con formulario fiscal mínimo y estado de la factura (solicitada, emitida). Disponible
desde la confirmación y desde el historial.
```

### 13.14 Calificación

```text
Diseña CALIFICAR PEDIDO (solo tras entregado): sheet con estrellas grandes, chips de motivo
(Comida, Tiempo de entrega, Empaque, Repartidor), comentario opcional y agradecimiento; nunca
bloquea ni insiste si se omite.
```

### 13.15 Historial y repetir

```text
Diseña HISTORIAL DE PEDIDOS (V1, dentro de la cuenta): lista con modalidad, fecha, total y estado
por pedido; acciones seguir, repetir, comprobante y calificar. «Repetir» rearma el carrito con
precios vigentes y avisa antes de continuar: «2 productos ya no están disponibles» o cambios de
precio.
```

### 13.16 Recuperar carrito

```text
Diseña RECUPERAR CARRITO (V1): página a la que llega el enlace «Retoma tu pedido» del correo o
WhatsApp; reconstruye el carrito vigente y avisa de cambios con la alerta de conflicto; CTA
«Continuar con mi pedido».
```

### 13.17 Estados de operación

```text
Diseña los ESTADOS DE OPERACIÓN: sede cerrada («Hoy estamos cerrados. Te esperamos {próximo
horario}»), recepción pausada («Por ahora no recibimos pedidos en línea» + «Avisarme cuando
abra»), cocina saturada («Estamos al tope en esta franja: programa tu pedido o prueba otra
sede»), sin repartidor en domicilio («Puedes recoger sin costo de envío»), sede cerrada
temporalmente con fecha de reapertura. Cada uno con acción útil y sin callejones sin salida.
```

### 13.18 Prototipo e interacciones

```text
Convierte el archivo en prototipo navegable con tres caminos completos: (1) MESA QR: escanear
(entrada directa a /mesa/:token) → agregar → personalizar hamburguesa → carrito → checkout en
caja → confirmación → seguimiento → pedir cuenta; (2) RECOGER: carta → carrito → checkout con
hora programada → confirmación con código → seguimiento «Listo para recoger»; (3) DOMICILIO:
carrito → checkout → dirección fuera de cobertura → cambiar a recoger; además pago rechazado
(V1) → reintento, y conflicto de producto agotado con carrito armado. Micro-interacciones sutiles
180–240 ms ease-out; respetar «reducir movimiento»; aria-live en carrito y timeline.
```

---

## 14. Trazabilidad RF → pantallas

| RF (R2) | Dónde se cubre |
|---|---|
| 01–03, 05–09, 11 carrito y totales | Carta modo pedido, Personalizar, Carrito, Checkout pago |
| 04 carrito persistente | Carrito (V1), Recuperar carrito |
| 10–11 fracción y upsell | Personalizar (V2), UpsellRail |
| 20–21 sin registro / cuenta | Checkout datos, Pedido recibido, Historial |
| 22–23 cobertura y programación | Checkout domicilio y recoger |
| 24–25 factura y consentimiento | Checkout datos, Comprobante |
| 30–35 pago, propina, comprobante, idempotencia | Checkout pago, PaymentStatusPanel, Comprobante |
| 40–44 mesa QR | Mesa por QR, Pedido recibido, Seguimiento mesa |
| 50–52 recoger | Checkout recoger, Confirmación, Seguimiento recoger |
| 60–65 domicilio | Checkout domicilio, Seguimiento domicilio, Cancelar |
| 70–73 seguimiento, notificaciones, calificar, repetir | Seguimiento, Calificación, Historial |
| 80–83 operación por sede | OperationNotice en carta y checkout |
| RN-R2-02/04/05/12/17 | Totales, reenvío sin duplicar, cancelación, avisos de carrito |
| RNF-R2-01/03/06 | Pago sin datos de tarjeta, accesibilidad, token público de seguimiento |

---

## 15. Siguientes pasos

1. Confirmar con el cliente las **decisiones de R2 §17** (pago en línea, reparto, zonas/tarifas,
   empaque, factura); ajustar prompts marcados V1/MVP.
2. Decidir con el cliente si la web de pedidos es un **módulo de la web de reservas** (recomendado)
   o un proyecto aparte; en ambos casos comparte las fundaciones del plan 01.
3. Generar con Figma Make siguiendo §1 y validar con §11.3.
4. Después de esta web, los siguientes briefs de interfaz son el **APK del mesero**
   ([R3](../../requerimientos/03-apk-mesero.md)) y el **KDS**
   ([R4](../../requerimientos/04-kds-cocina.md)), que consumen los pedidos aquí diseñados.
