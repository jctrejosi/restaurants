# 03 — Plan del front: APK del mesero

**Entregable de este documento:** el brief de diseño y los **prompts listos para pegar en
Figma Make** que generan las pantallas de la **aplicación del mesero** (teléfono Android y
tableta): mapa de salón, toma de pedido, envío a cocina, cuenta, cobro y modo offline. La fuente
de requisitos es [`../../requerimientos/03-apk-mesero.md`](../../requerimientos/03-apk-mesero.md)
(en adelante «el documento R3»); este plan no cambia requisitos: los traduce a pantallas,
componentes, estados y textos.

**Serie:** es el plan `03` de la serie de front ([`README.md`](./README.md)). Reutiliza la
**identidad visual** de [`01-plan-web-reservas.md`](./01-plan-web-reservas.md) §3 y los patrones
de interacción de [`02-plan-web-pedidos.md`](./02-plan-web-pedidos.md) (carrito, modificadores,
pago, timeline), adaptados a **app nativa**: pantallas densas, uso a una mano, tolerancia a
errores y **operación sin conexión**.

**Estado:** propuesta v0.1 — sujeta a las decisiones abiertas de R3 §17 (hardware teléfono/tableta,
quién cobra, impresoras de salón) y a la marca (§3.1 del plan 01).

---

## 1. Cómo usar este documento

| Paso | Acción | Prompt |
|---|---|---|
| 1 | Crear el archivo «APK Mesero — Punto C» y pegar el **prompt maestro** (define fundaciones de app y componentes). | §13 |
| 2 | Generar **acceso** (PIN, vinculación de dispositivo, turno) | §14.1–§14.3 |
| 3 | Generar **salón** (mapa, acciones de mesa, reservas) | §14.4–§14.6 |
| 4 | Generar **toma de pedido** (carta rápida, personalizar, cuenta de mesa, enviar a cocina) | §14.7–§14.11 |
| 5 | Generar **comandas, cuenta y cobro** (estados, pre-cuenta, ajustes, división, medios, cierre) | §14.12–§14.17 |
| 6 | Generar **offline, avisos, dispositivo y turno**; y luego el **prototipo** con casos borde | §14.18–§14.21 |
| 7 | Revisar con la **lista de verificación** (§12.3) | — |

**Regla de oro:** un prompt por pantalla; conservar los tokens y componentes ya definidos. Este
flujo tiene muchas pantallas pequeñas: conviene generarlas en el orden de arriba porque cada paso
usa componentes del anterior.

### 1.1 Figma Make para una app nativa (importante)

Figma Make produce **diseño y prototipo**; su exportación de código es React **web**, que **no se
usa** en el APK. Aquí Figma Make se usa para:

- Generar las **pantallas de app** (marco 390 × 844 con barra de estado y áreas seguras; variante
  tableta 1024 × 768 horizontal).
- Generar el **prototipo navegable** para validar el flujo con meseros reales.
- Servir de **referencia visual** para la implementación en **Expo + React Native** (stack de las
  apps móviles de `ecommerce`: `expo`, `expo-router`, `zustand`, `@tanstack/react-query`,
  `socket.io-client`, `expo-secure-store`, `@react-native-community/netinfo`,
  `expo-notifications`).

En los prompts se pide explícitamente «pantalla de aplicación móvil Android», no una web.

### 1.2 Convenciones

- Copy **en español**, frases cortas (espacio y prisa).
- Estado de **mesa** y de **comanda** se muestran con color **y texto** (nunca solo color).
- El proyecto final se llamará **`Interface movil mesero`** (convención de `ecommerce`).

| Estado de mesa (modelo) | Etiqueta | Tratamiento |
|---|---|---|
| `libre` | Libre | Superficie clara, borde neutro |
| `ocupada` | Ocupada · {min} min | Fondo oliva suave (`leaf-100`), texto `leaf-600` |
| `por_cobrar` | Por cobrar | Fondo ámbar (`pending-100`) |
| `reservada` | Reservada {hora} | Fondo marca suave (`brand-100`) con icono de calendario |
| `fuera_servicio` | Fuera de servicio | Gris con rayado suave, no seleccionable |

| Estado de comanda | Etiqueta | Tratamiento |
|---|---|---|
| `pendiente` / `enviada` | Enviada {hora} | Neutro con borde |
| `en_preparacion` | En cocina | Ámbar |
| `lista` | Lista · «Recoger» | Oliva + punto de aviso |
| `entregada` | Entregada {hora} | Gris atenuado |
| `anulada` | Anulada | Rojo tachado |

---

## 2. Contexto del producto

### 2.1 Qué es

La herramienta de trabajo del salón. Debe ser **rápida de una mano**, funcionar con **red
intermitente** y no perder nada. Conecta salón ↔ cocina (KDS) ↔ caja y recibe los pedidos web de
mesa.

### 2.2 Actores

| Actor | Uso principal |
|---|---|
| Mesero | Sus mesas: abrir, pedir, enviar, servir, pre-cuenta, cobrar (si tiene permiso) |
| Capitán / supervisor | Todo lo del mesero + traspasos, autorizar anulaciones y descuentos |
| Cajero | Recibe pedidos enviados a cobro (en su propia interfaz) |

### 2.3 Objetivos medibles (R3 §15)

- Ronda tomada y enviada en **pocos toques**; respuesta percibida **< 100 ms** en acciones
  frecuentes (RNF-R3-02).
- **30 minutos sin red** sin pérdida ni duplicados (RNF-R3-01); la idempotencia es por operación.
- Cero ambigüedad entre líneas **pendientes** y **enviadas** (RN-R3-01).
- Uso en gama media, batería y datos para un turno completo (RNF-R3-04/05).

### 2.4 Decisiones de fases (supuesto por defecto de R3 §17)

- **MVP:** login por PIN, mapa de salón, tomar y enviar pedidos, comandas, pre-cuenta, enviar a
  caja, offline con cola e impresión por print agent.
- **V1:** cobro en el APK (efectivo/tarjeta/transferencia, parciales), propina, descuentos con
  autorización, división de cuenta, fracción/peso, traspasos, comandas con estados en vivo, avisos.
- **V2:** compartir/propiedad avanzada de mesas, supervisor global, resumen de turno, agotar
  producto desde el salón, cobro por persona desde QR.

### 2.5 Modelo de operación (resumen de R3 §3)

Zonas y mesas con estado; **un mesero responsable por mesa** (traspaso auditado); el pedido crece
por **rondas** (cada envío es independiente); los pedidos web de mesa entran al **mismo pedido**.

---

## 3. Fundaciones visuales

Se heredan la paleta, tipografía (Fraunces + Inter), radios y sombras del plan 01 §3, con estos
ajustes de app:

| Aspecto | Definición |
|---|---|
| Base de color | Se mantiene la marca; el **estado** manda: oliva=activo, ámbar=espera, marca=reserva, rojo=problema |
| Contraste | Alto: texto `ink-900` sobre superficies claras; estados siempre con icono + palabra |
| Tamaño táctil | Mínimo **48 px**; acciones frecuentes 56–64 px; separación ≥ 12 px |
| Densidad | Compacta pero táctil; en tableta, patrón **maestro-detalle** (salón a la izquierda, cuenta a la derecha) |
| Tipografía UI | Inter para todo lo operativo; Fraunces solo en login, cabeceras y totales grandes |
| Cifras | Tabulares para precios, cantidades y tiempos |
| Modo brillo | Interruptor «alto contraste» que sube contraste y tamaño de texto (uso con brillo del local) |
| Movimiento | 150–200 ms; las hojas suben desde abajo; haptics en confirmaciones y avisos |
| Navegación | Barra inferior de 4 accesos (Salón · Mis mesas · Avisos · Yo) + hojas modales; sin menús anidados |

**Tokens nuevos:**

| Token | Valor | Uso |
|---|---|---|
| `table-libre` | `#FFFFFF` + borde `ink-300` | Mesa libre |
| `table-ocupada` | `#E8EFE4` / texto `#3F6B4A` | Ocupada |
| `table-porcobrar` | `#FCF0DC` / texto `#8A4B0A` | Por cobrar |
| `table-reservada` | `#F6E3D9` / texto `#8F3517` | Reservada |
| `table-fuera` | `#EDEAE5` con rayado | Fuera de servicio |
| `info-600` / `info-100` | `#1F5FA8` / `#E4EEF8` | Pedido web, información |
| `offline-600` / `offline-100` | `#B3261E` / `#F9E3E1` | Sin conexión |
| `sync-600` / `sync-100` | `#B45309` / `#FCF0DC` | Sincronizando / pendientes |

---

## 4. Arquitectura de información

### 4.1 Pantallas

| # | Pantalla | Ruta (expo-router) | Objetivo | Prioridad |
|---|---|---|---|---|
| 1 | Bloqueo / reanudar sesión | `/(auth)/lock` | Volver sin re-loguear, con expiración | MVP |
| 2 | Acceso con PIN | `/(auth)/pin` | Login de persona en dispositivo vinculado | MVP |
| 3 | Vincular dispositivo | `/(auth)/vincular` | Alta del dispositivo por código | MVP |
| 4 | Selección de sucursal y turno | `/(auth)/turno` | Abrir turno y asignaciones | V1 |
| 5 | Mapa de salón | `/(app)/salon` | Zonas, mesas y estados | MVP |
| 6 | «Mis mesas» y filtros | `/(app)/salon?filtro=mias` | Trabajar la zona asignada | V1 |
| 7 | Acciones de mesa (hoja) | hoja sobre salón | Abrir, trasladar, unir, reserva, agotar (V2) | MVP/V1 |
| 8 | Carta rápida | `/(app)/mesa/[id]/carta` | Buscar y agregar productos | MVP |
| 9 | Personalizar línea | hoja sobre carta | Modificadores, notas, fracción, comensal | MVP |
| 10 | Cuenta de la mesa | `/(app)/mesa/[id]` | Líneas pendientes y enviadas; enviar | MVP |
| 11 | Enviar a cocina (revisión) | hoja sobre cuenta | Ver el reparto por estación e imprimir | MVP |
| 12 | Comandas de la mesa | `/(app)/mesa/[id]/comandas` | Estados, entregar, reimprimir, anular | V1 |
| 13 | Pre-cuenta | `/(app)/mesa/[id]/precuenta` | Vista e impresión (no fiscal) | MVP |
| 14 | Ajustes: descuento/cortesía | hoja | Con autorización y motivo | V1 |
| 15 | Propina y división | hoja | Propina y partes que cuadran | V1 |
| 16 | Cobro | `/(app)/mesa/[id]/cobro` | Medio, parciales, cambio, comprobante | V1 |
| 17 | Enviar a caja | hoja | Que la caja cobre | MVP |
| 18 | Avisos | `/(app)/avisos` | Comandas listas, SLA, pedidos web, reservas | V1 |
| 19 | Estado y cola de sincronización | `/(app)/sync` | Pendientes, reintentos y conflictos | MVP |
| 20 | Yo / dispositivo | `/(app)/yo` | Versión, vinculación, cambiar mesero, salir | MVP |
| 21 | Actualización obligatoria | `/(auth)/actualizar` | Bloqueo por versión mínima | V1 |
| 22 | Cierre de turno | `/(app)/turno/cierre` | Resumen del turno | V2 |

### 4.2 Navegación

- **Barra inferior:** Salón · Mis mesas · Avisos (con badge) · Yo.
- **Estado permanente:** píldora de conexión en la cabecera (`En línea` · `Sin conexión · 3 pendientes` · `Sincronizando`) que abre la pantalla 19.
- **Hojas modales** para todo lo transitorio (acciones de mesa, personalizar, enviar, ajustar, cobrar) para no perder el contexto del salón.
- **Tableta:** salón y cuenta lado a lado; la barra inferior pasa a riel lateral.
- **Bloqueo:** al volver de segundo plano, pantalla 1 con PIN si expiró; permite terminar la operación en curso si está offline (caso borde R3 §16).

---

## 5. Inventario de componentes

### 5.1 Acceso y dispositivo

| Componente | Variantes | Notas |
|---|---|---|
| `PinPad` | 4/6 dígitos | Teclado grande, sin teclado del sistema; contador de intentos |
| `DeviceBadge` | vinculado / revocado / versión obsoleta | En «Yo» y en la cabecera del login |
| `LinkDeviceSheet` | código / QR | Alta del dispositivo con confirmación de sucursal |
| `SessionLockOverlay` | con operación en curso / sin ella | Explica si se puede terminar lo iniciado |
| `ShiftSheet` | apertura / cierre | Responsable, mesas asignadas y resumen |

### 5.2 Salón

| Componente | Variantes | Notas |
|---|---|---|
| `ZoneTabs` | scroll horizontal | «Todas» + zonas; «Mis mesas» como chip fijo |
| `TableGrid` | teléfono / tableta | Rejilla con `TableCard`; zoom de tamaño en tableta |
| `TableCard` | 5 estados + badges | Número grande, tiempo de ocupación, inicial del mesero, badges (comanda lista, pedido web, reserva) |
| `TableActionSheet` | libre / ocupada / por cobrar / reservada | Acciones según estado (abrir, ver cuenta, pre-cuenta, cobrar, trasladar, unir, sentar reserva, liberar) |
| `TransferTableSheet` | — | Elegir mesero destino; queda auditado |
| `MergeTablesSheet` | — | Elegir mesa destino; conserva líneas |
| `ReservationCard` | próxima / retrasada | Hora, personas, preferencia; «Sentar» y «No-show» |
| `TableStatusLegend` | fija inferior (plegable) | Leyenda de colores y símbolos |

### 5.3 Toma de pedido

| Componente | Variantes | Notas |
|---|---|---|
| `QuickSearchBar` | texto / código rápido | Botón de teclado numérico para códigos |
| `CategoryChips` | con contador | Filtrado instantáneo |
| `ProductTile` | normal / agotado / 99 / destacado | Precio y etiqueta; agotado no seleccionable (RF-R3-23) |
| `LineSheet` | nueva / editando pendiente | Modificadores, notas, cantidad, fracción, comensal |
| `ModifierGroup` | única / múltiple / obligatoria | Mín/máx y costo adicional, con validación en vivo |
| `NotesField` | con plantillas rápidas | «Sin cebolla», «Salsa aparte», «Para compartir» |
| `FractionInput` | «N T» | Teclado numérico, subtotal en enteros (RN-R3-09) |
| `DinerTagSelector` | 1..n / «Mesa» | Cobro por comensal (V1) |
| `PendingSentSplit` | — | Dos bloques separados: **Pendientes** y **Enviadas** (RN-R3-01) |
| `LineRow` | pendiente / enviada / anulada | Enviadas muestran sello de hora y no se editan (RN-R3-03) |
| `RoundsNav` | lista de rondas | Acceso a rondas anteriores |

### 5.4 Cocina, comandas e impresión

| Componente | Variantes | Notas |
|---|---|---|
| `SendToKitchenSheet` | con reparto por estación | «Cocina: 3 · Barra: 2»; solo líneas nuevas |
| `PrintStatusRow` | pendiente / imprimiendo / impresa / falló | Reintentar por estación; aviso honesto |
| `ComandaCard` | 5 estados | Estación, número, hora, líneas y sello |
| `ComandaStatusStepper` | — | `enviada → en_preparacion → lista → entregada` |
| `MarkDeliveredButton` | — | El mesero marca `entregada` |
| `ReprintConfirm` | con permiso | Explica que es una reimpresión (auditada) |
| `AnnulSheet` | línea / comanda | Motivo obligatorio; permiso si ya se preparó (RN-R3-04) |
| `PermissionGate` | PIN de capitán | Para descuentos, anulaciones y reimpresiones |

### 5.5 Cuenta, cobro y caja

| Componente | Variantes | Notas |
|---|---|---|
| `BillPanel` | resumen / detalle | Totales, líneas, propina y ajustes |
| `PreCuentaPreview` | pantalla / impresa | Marca «No es documento fiscal» (RN-R3-08) |
| `DiscountSheet` | descuento / cortesía | Con `PermissionGate` y motivo |
| `TipSelector` | 0/10/15/20/libre | Separada del total (RN-R3-13 análoga) |
| `SplitSheet` | iguales / por ítems / por comensal | Muestra que las partes cuadran |
| `PaymentMethodGrid` | efectivo / tarjeta / transferencia | Solo los habilitados por sede |
| `CashChangeCalculator` | con billetes rápidos | Monto recibido y cambio |
| `PartialPaymentRow` | — | Saldo restante; el pedido sigue `por_cobrar` |
| `SendToCashierSheet` | — | Instrucción y estado; evita doble cobro (RN-R3-07) |
| `ReceiptPreview` | recibo / apertura de gaveta | Botones «Imprimir» y «Abrir gaveta» |
| `CloseTableConfirm` | — | Libera mesa y vuelve a `libre` |

### 5.6 Sistema, offline y avisos

| Componente | Variantes | Notas |
|---|---|---|
| `ConnectionPill` | en línea / sin conexión / sincronizando | Abre la pantalla 19 |
| `OfflineBanner` | sin conexión / reconectado | «Sin conexión: puedes seguir tomando pedidos» |
| `SyncQueueSheet` | pendientes / fallidas / conflictos | Reintentar, ver detalle, resolver |
| `ConflictResolverSheet` | mesa / comanda | Explica qué ganó el servidor y qué opciones hay |
| `AlertsInbox`, `AlertToast` | listo / SLA / web / reserva | Sonido **distinto** entre «listo» y «SLA excedido» (RF-R3-35) |
| `SlaBadge` | en tiempo / excedido | En `ComandaCard` y `TableCard` |
| `DestructiveConfirmDialog` | — | Para anular, transferir y cobrar |
| `ForcedUpdateScreen` | — | Bloquea y lleva a la tienda |
| `PermissionDeniedSheet` | — | Explica qué permiso falta y a quién pedirlo |

---

## 6. Especificación pantalla por pantalla

### 6.1 Bloqueo / reanudar sesión — RF-R3-03, 04

- Pantalla completa con logo pequeño, nombre del mesero y `PinPad` u opción «Reanudar» si la
  sesión sigue válida y hay red.
- Si hay operación a medias y no hay red: «Puedes terminar la comanda en curso; te pediremos PIN al
  reconectar» (caso borde R3 §16).
- Expiración configurable con aviso 30 s antes.

### 6.2 Acceso con PIN — RF-R3-01, 03

- Cabecera con sede y `DeviceBadge`; avatar/inicial y nombre del último mesero.
- `PinPad` grande; mensaje tras fallo («PIN incorrecto. Intentos restantes: 3»); bloqueo temporal
  visible con cuenta atrás.
- Accesos secundarios: «Cambiar mesero» (V1, RF-R3-05), «Vincular este dispositivo», «Ayuda».

### 6.3 Vincular dispositivo — RF-R3-02

- Explica que el dispositivo quedará ligado al restaurante y sucursal; campo de código de
  vinculación (o escaneo de QR) y confirmación con nombre del local.
- Estado de dispositivo revocado: al reconectar se borran datos locales y se exige vinculación
  nueva (caso borde; RNF-R3-03).

### 6.4 Sucursal y turno — RF-R3-80, 81

- Si el dispositivo puede operar en más de una sucursal, elegir; luego **abrir turno** con
  responsable y asignación de zonas/mesas (o «salón completo»).
- Cierre de turno: resumen (mesas atendidas, ventas, propinas) — V2.

### 6.5 Mapa de salón — RF-R3-10, 11, 14, 15

- `ZoneTabs` arriba; debajo `TableGrid` con `TableCard` (número, estado, tiempo, mesero, badges de
  comanda lista / pedido web / reserva / SLA).
- Filtros: «Mis mesas» y zona; las alertas críticas **nunca** se ocultan con el filtro (RF-R3-14).
- Toque: abre `TableActionSheet`; toque largo: acciones rápidas contextuales.
- Mesa con ocupación prolongada (V2): borde y etiqueta «+ {min}».
- Pie con `TableStatusLegend` plegable y `ConnectionPill` en cabecera.

### 6.6 Acciones de mesa (hoja) — RF-R3-11, 12, 13, 47

- Según estado:
  - **Libre:** «Abrir mesa» (comensales), «Sentar reserva» (si hay reserva próxima), «Fuera de
    servicio».
  - **Ocupada:** «Tomar pedido», «Ver cuenta», «Comandas», «Trasladar», «Unir», «Pre-cuenta»,
    «Cobrar» (según permiso), «Enviar a caja».
  - **Por cobrar:** «Cobrar», «Enviar a caja», «Ver cuenta».
  - **Reservada:** «Sentar», «Liberar», «No-show».
- Muestra mesero responsable y, si hay, el **pedido web de mesa** con su estado (RF-R3-47).

### 6.7 «Mis mesas» — RF-R3-14, 81

- Vista enfocada con las mesas asignadas, ordenadas por urgencia (SLA excedido, por cobrar, listas
  por servir); acciones rápidas inline.

### 6.8 Carta rápida — RF-R3-20, 23

- `QuickSearchBar` con botón «código» (teclado numérico); `CategoryChips`; rejilla de
  `ProductTile` a 2 columnas (móvil) o 3–4 (tableta).
- Agotados y fuera de horario atenuados y no seleccionables, con motivo.
- Toque en producto: agrega 1 si no tiene modificadores; si los tiene, abre **Personalizar**.
- Cabecera muestra la mesa («Mesa 12») y el contador de líneas pendientes.

### 6.9 Personalizar línea (hoja) — RF-R3-21, 22, 25

- Grupos de modificadores (obligatorios arriba) con min/máx y costo; `NotesField` con plantillas;
  `QuantityStepper`; `FractionInput` («N T») para productos a granel (V1); `DinerTagSelector` (V1).
- Validación en vivo: el botón «Agregar» se habilita solo al cumplir obligatorios, indicando qué
  falta.
- Total de la línea grande y siempre visible (uso en movimiento).

### 6.10 Cuenta de la mesa — RF-R3-24, 30, 31, 34, 33

- Encabezado: mesa, comensales, mesero, tiempo de ocupación y totales.
- **`PendingSentSplit`**: bloque *Pendientes* (editables/borrables) y bloque *Enviadas* (no
  editables; con sello de hora y número de ronda).
- Cada ronda con su hora; acciones por línea pendiente: editar, quitar, mover (V2).
- Botón primario **«Enviar a cocina»** (si hay pendientes) y secundario «Ver comandas».
- Si una línea pendiente referencia un producto agotado: aviso antes de enviar (RN-R3-14).

### 6.11 Enviar a cocina (hoja) — RF-R3-30, 31, 70, 71, 73

- Revisión del reparto: **«Cocina: 3 · Barra: 2»**, con detalle por estación y aviso de estaciones
  vacías/`99` que no imprimen (RF-R3-71).
- Al confirmar: envía solo líneas nuevas, sella hora y estado, y muestra `PrintStatusRow` por
  estación (imprimiendo/impresa/falló con «Reintentar»).
- Nunca reimprime lo ya enviado (RN-R3-01); si la impresora no responde, la comanda queda en cola
  y se avisa (caso borde R3 §16).
- Sin conexión: la comanda se imprime por el print agent local y el envío queda encolado (RF-R3-62).

### 6.12 Comandas de la mesa — RF-R3-33, 32, 34, 35

- Lista por ronda y estación con `ComandaCard` y `ComandaStatusStepper`; el mesero marca
  `entregada` (RN del ciclo de §8 R3).
- Acciones: marcar entregada, reimprimir (con `PermissionGate` y aviso de auditoría), anular
  (`AnnulSheet` con motivo; autorización si ya se preparó).
- `SlaBadge` visible; al pasar a `lista` llega `AlertToast` con sonido/vibración.

### 6.13 Pre-cuenta — RF-R3-40, 72

- `PreCuentaPreview` con formato de ticket (logo, mesa, mesero, líneas, subtotal, ajustes, total,
  propina si se definió) y leyenda «No es documento fiscal».
- Acciones: «Imprimir», «Enviar a caja», «Cobrar» (V1). Muestra qué líneas siguen pendientes de
  enviar (aviso).

### 6.14 Ajustes: descuento y cortesía — RF-R3-41, RN-R3-05

- `DiscountSheet` con tipo (% o monto), alcance (total o línea), motivo obligatorio y
  `PermissionGate` (PIN del capitán). Sin permiso: se rechaza y se registra el intento (caso borde).
- Refleja el nuevo total y queda auditado.

### 6.15 Propina y división — RF-R3-42, 43

- `TipSelector` (0/10/15/20/libre) separada del total de productos.
- `SplitSheet`: partes iguales, por ítems o por comensal; muestra el total por parte y verifica que
  la suma cuadre con el pedido; cada parte se cobra con `PaymentMethodGrid`.

### 6.16 Cobro — RF-R3-44, 46

- `BillPanel` con total, propina y ajustes; `PaymentMethodGrid` (efectivo/tarjeta/transferencia
  habilitados por sede).
- **Efectivo:** `CashChangeCalculator` (montos rápidos y cambio).
- **Parciales:** `PartialPaymentRow`; el pedido permanece `por_cobrar` hasta cubrir el total.
- **Tarjeta:** instrucción del datáfono y confirmación manual del resultado (nunca datos de tarjeta
  en la app, RNF-R3-03).
- Al completar: `ReceiptPreview` (imprimir recibo, abrir gaveta) y `CloseTableConfirm` que libera
  la mesa.
- «Enviar a caja» disponible como alternativa (RF-R3-45); nunca se cobra dos veces (RN-R3-07).

### 6.17 Avisos — RF-R3-35, 47, 48

- Bandeja con tipos: **comanda lista**, **SLA excedido**, **pedido web de mesa**, **reserva
  próxima**, **sincronización fallida**.
- Cada aviso lleva a la mesa correspondiente y se puede marcar como atendido.
- Ajustes de sonido/vibración por tipo (distintos entre «listo» y «SLA»).

### 6.18 Estado y cola de sincronización — RF-R3-60, 61, 63, 64

- Resumen: en línea / sin conexión desde {hora}; operaciones pendientes, fallidas y conflictos.
- `SyncQueueSheet`: lista en orden causal con tipo, hora y estado; «Reintentar todo», detalle
  (payload legible) y «Descartar» solo con autorización.
- `ConflictResolverSheet`: explica el conflicto (p. ej., dos meseros abrieron la misma mesa),
  muestra qué confirmó el servidor y ofrece reconciliar.
- Recuerda la regla: **nada se pierde y nada se duplica** (idempotencia por `client_op_id`).

### 6.19 Yo / dispositivo — RF-R3-02, 05, 06

- Mesero actual, sede, turno; versión de la app (`ForcedUpdateScreen` si es menor a la mínima);
  vinculación y revocación; «Cambiar mesero»; «Cerrar sesión» (con `DestructiveConfirmDialog` y
  aviso de operaciones pendientes).

### 6.20 Actualización obligatoria y errores de permiso

- `ForcedUpdateScreen` bloquea con explicación y botón a la tienda (RF-R3-06).
- `PermissionDeniedSheet` explica el permiso faltante (p. ej., «Solo el capitán autoriza
  descuentos») con opción de pedir autorización en el momento.

---

## 7. Casos borde y errores (R3 §16)

| Caso | Tratamiento | Mensaje |
|---|---|---|
| Dos meseros abren la misma mesa | `ConflictResolverSheet` | «Otro mesero abrió esta mesa. Se conservó lo confirmado por el sistema.» |
| Se pierde la red al enviar | Comanda encolada + `ConnectionPill` | «Sin conexión: guardamos tu envío y lo mandamos al reconectar.» |
| La impresora no responde | `PrintStatusRow` en fallo | «No pudimos imprimir en {estación}. Reintentamos; puedes reintentar ahora.» |
| Producto agotado al enviar | Bloqueo de la línea | «{Producto} se agotó. Quítalo o cámbialo antes de enviar.» |
| Sesión expirada sin conexión | Permite terminar y pide PIN al reconectar | «Termina esta comanda; al Reconectar pediremos tu PIN.» |
| Dispositivo revocado offline | Purga local al reconectar | «Este dispositivo fue revocado. Vuelve a vincularlo.» |
| Hora del dispositivo desfasada | Sello del servidor | (sin mensaje; el servidor sella los tiempos) |
| Unir/trasladar con cuenta abierta | Conserva líneas, recalcula | «Se movieron {n} líneas a la mesa {m}.» |
| Cobro parcial | Pedido sigue `por_cobrar` | «Queda un saldo de ${monto}.» |
| Descuento sin permiso | Rechazo + registro | «Necesitas autorización del capitán. Intento registrado.» |
| Llega un pedido web mientras edito | Aviso y refresco | «Llegó un pedido web a esta mesa.» |
| Reimpresión de comanda entregada | Requiere permiso | «Reimprimir queda registrado en la auditoría.» |

---

## 8. Offline y sincronización (experiencia)

Esta sección es específica del APK y condiciona varias pantallas.

- **Indicador permanente** (`ConnectionPill`) con tres estados y contador de pendientes; tocar abre
  la cola.
- **Qué se puede hacer sin red:** login con PIN ya validado, mapa de salón con el último estado,
  tomar pedido con el catálogo sincronizado, imprimir comandas/pre-cuenta por el print agent y
  **encolar todo**.
- **Marcas de confianza:** cada operación muestra su destino: `✓ Enviada` (confirmada por el
  servidor) o `↻ Pendiente` (en cola). El mesero nunca duda si su envío llegó.
- **Catálogo añejo:** si el catálogo tiene más de X horas sin sincronizar, aviso discreto
  «Catálogo del {hora}» (RN-R3-10; sin sondeo periódico, por versión).
- **Conflictos:** se detectan al reconectar; se muestra la mesa afectada y se explica qué quedó
  confirmado; el mesero reconcilia (completar, anular o rehacer).
- **Errores de sincronización:** la operación fallida queda visible con su motivo; «Reintentar» y,
  solo con autorización, «Descartar».

---

## 9. Accesibilidad, rendimiento y telemetría

- **Táctil:** objetivos ≥ 48 px, acciones destructivas separadas del pulgar frecuente; confirmación
  doble en anulaciones, traspasos y cobros.
- **Contraste y brillo:** estados con icono + texto; interruptor de alto contraste; textos de
  tamaño configurable.
- **Haptics y sonido:** vibración en aviso de comanda lista y error; sonido diferenciado «listo» vs
  «SLA excedido» (RF-R3-35); todo silenciable por tipo.
- **Rendimiento:** respuesta percibida < 100 ms (RNF-R3-02): listas virtualizadas, imágenes
  cacheadas, sin bloqueos de red en la UI (react-query + cola local).
- **Batería/datos:** sincronización por eventos y por reconexión, no sondeo (RNF-R3-04).
- **Telemetría (para métricas de R3 §15):** eventos de UI para tiempo por ronda, envíos, anulaciones,
  reimpresiones, cobros en APK vs caja, uso offline (minutos y operaciones) e incidentes de
  sincronización; **sin PII** en los eventos.
- **Seguridad:** datos sensibles en `expo-secure-store`; purga remota al revocar el dispositivo
  (RNF-R3-03).

---

## 10. Copy deck (textos base)

| Clave | Texto |
|---|---|
| `login.title` | Ingresa tu PIN |
| `login.attempts` | Pin incorrecto. Intentos restantes: {n} |
| `login.locked` | Cuenta bloqueada temporalmente. Vuelve en {mm:ss} |
| `link.title` | Vincular este dispositivo |
| `shift.open` | Abrir turno |
| `salon.title` | Salón |
| `salon.mine` | Mis mesas |
| `table.open` | Abrir mesa |
| `table.occupied` | Ocupada · {min} min |
| `table.toCharge` | Por cobrar |
| `table.reserved` | Reservada {hora} |
| `table.outOfService` | Fuera de servicio |
| `menu.search` | Buscar o escribir código |
| `menu.soldOut` | Agotado |
| `line.add` | Agregar |
| `line.notes` | Notas para cocina |
| `line.fraction` | Cantidad (N T) |
| `cart.pending` | Pendientes de enviar |
| `cart.sent` | Enviadas (no se editan) |
| `send.title` | Enviar a cocina |
| `send.split` | Cocina: {a} · Barra: {b} |
| `send.sent` | Comanda enviada |
| `print.failed` | No pudimos imprimir en {estación} |
| `print.retry` | Reintentar impresión |
| `comanda.annul` | Anular con motivo |
| `comanda.annulReq` | Esta comanda ya se preparó; requiere autorización |
| `precuenta.title` | Pre-cuenta |
| `precuenta.notFiscal` | No es documento fiscal |
| `discount.needAuth` | Necesitas autorización del capitán |
| `tip.question` | ¿Dejas propina? |
| `split.equal` | Partes iguales |
| `split.byItems` | Por ítems |
| `split.byDiner` | Por comensal |
| `pay.cash` | Efectivo |
| `pay.card` | Tarjeta |
| `pay.transfer` | Transferencia |
| `pay.change` | Cambio |
| `pay.partial` | Queda un saldo de {monto} |
| `pay.sentToCashier` | Enviamos la cuenta a caja |
| `pay.done` | Pago registrado. Imprime el recibo o abre la gaveta |
| `bill.close` | Cobrar y liberar mesa |
| `sync.offline` | Sin conexión: puedes seguir tomando pedidos |
| `sync.pending` | {n} operaciones pendientes de enviar |
| `sync.conflict` | Otro mesero cambió esta mesa. Revisa la reconciliación |
| `alerts.ready` | Comanda lista: {mesa} |
| `alerts.sla` | SLA excedido: {mesa} |
| `alerts.web` | Pedido web en {mesa} |
| `update.forced` | Actualiza la app para seguir operando |

---

## 11. Datos de ejemplo para el prototipo

```json
{
  "mesero": { "nombre": "Mesero Uno", "pin": "1234", "sucursal": "Sucursal Centro", "turno": "Turno 2" },
  "dispositivo": { "tipo": "tablet", "vinculado": true, "versionApp": "1.0.0", "versionMinima": "1.0.0" },
  "conexion": { "estado": "sin_conexion", "pendientes": 3, "desde": "19:02" },
  "zonas": [
    { "nombre": "Salón principal", "mesas": 12 },
    { "nombre": "Terraza", "mesas": 8 }
  ],
  "mesas": [
    { "numero": "12", "zona": "Salón principal", "estado": "ocupada", "min": 24, "mesero": "MU", "badges": ["lista"], "total": 470 },
    { "numero": "13", "zona": "Salón principal", "estado": "por_cobrar", "min": 51, "mesero": "MU", "total": 637 },
    { "numero": "14", "zona": "Salón principal", "estado": "reservada", "hora": "20:30", "personas": 4 },
    { "numero": "5", "zona": "Terraza", "estado": "libre" },
    { "numero": "6", "zona": "Terraza", "estado": "fuera_servicio" }
  ],
  "cuenta": {
    "mesa": "12", "mesero": "Mesero Uno", "comensales": 3,
    "pendientes": [
      { "producto": "Tacos al pastor", "cantidad": 2, "precio": 125, "notas": "Sin cebolla" }
    ],
    "enviadas": [
      { "ronda": 1, "hora": "19:12",
        "lineas": [
          { "producto": "Guacamole", "cantidad": 1, "precio": 89 },
          { "producto": "Limonada", "cantidad": 2, "precio": 35 }
        ] }
    ],
    "totales": { "subtotal": 409, "descuento": 0, "impuestos": 65, "propina": 40, "total": 514 }
  },
  "comandas": [
    { "numero": 101, "estacion": "Cocina", "estado": "en_preparacion", "enviada": "19:12", "sla": "en_tiempo" },
    { "numero": 102, "estacion": "Barra", "estado": "lista", "enviada": "19:12", "sla": "en_tiempo" }
  ],
  "sync": [
    { "tipo": "pedido.enviar", "mesa": "12", "hora": "19:14", "estado": "pendiente" },
    { "tipo": "comanda.entregada", "mesa": "13", "hora": "19:10", "estado": "pendiente" },
    { "tipo": "pago.registrar", "mesa": "13", "hora": "19:09", "estado": "fallida", "motivo": "conflicto de estado" }
  ],
  "ajustes": { "permisos": ["linea.anular", "comanda.reimprimir", "cobro.registrar"], "requiereAutorizacion": ["descuento.aplicar", "comanda.anular_post"] }
}
```

---

## 12. Entregables esperados de Figma Make

### 12.1 Del archivo de Figma

| # | Entregable | Criterio |
|---|---|---|
| 1 | **Fundaciones de app**: tokens, tipografía, tamaños táctiles, estados de mesa y comanda | Nombres del §3 |
| 2 | **Componentes** (§5) con variantes y estados (incluye offline y permisos) | Reutilizables, auto-layout |
| 3 | **Teléfono (390 × 844)**: las 22 pantallas de §4.1 | Con barra de estado y áreas seguras |
| 4 | **Tableta (1024 × 768 horizontal)**: salón (maestro-detalle), cuenta, cobro | Riel lateral |
| 5 | **Estados**: offline, pendiente/fallida de sync, conflicto, impresora caída, permisos, agotado, versión obsoleta | Como mínimo los de §7 |
| 6 | **Prototipo** con 4 caminos: abrir mesa y pedir; enviar y servir; pre-cuenta y cobro; operar sin red y sincronizar | Enlaces internos reales |
| 7 | **Notas de diseño** con pendientes (R3 §17) | — |

### 12.2 Del código

Figma Make exporta **React web**; **no** se usa en el APK. La implementación real es **Expo +
React Native** (stack de las apps móviles de `ecommerce`), en `Interface movil mesero`. El archivo
de Figma es la **referencia visual** y la base del prototipo para validar con meseros.

### 12.3 Lista de verificación

- [ ] Login con PIN y bloqueo por intentos; sesión reanudable.
- [ ] Mapa de salón con los 5 estados de mesa, badges y filtro «mis mesas» que no oculta alertas.
- [ ] Tomar una ronda y enviarla: reparto por estación, solo lo nuevo, con estado de impresión.
- [ ] Separación inequívoca entre líneas **pendientes** y **enviadas**.
- [ ] Comandas con estados, entrega, reimpresión con permiso y anulación con motivo.
- [ ] Pre-cuenta marcada como no fiscal y con impresión.
- [ ] Cobro: efectivo con cambio, parciales, propina, división y envío a caja; nunca doble cobro.
- [ ] Descuento/anulación/traspaso piden autorización y avisan de auditoría.
- [ ] Offline: indicador, marcas «enviada/pendiente», cola, conflictos y reintentos.
- [ ] Impresora caída: comanda en cola y aviso con reintento.
- [ ] Estados de versión obsoleta, dispositivo revocado y permiso denegado.
- [ ] Objetivos táctiles ≥ 48 px; contraste alto; estados con icono + texto; haptics.
- [ ] Prototipo enlaza los 4 caminos completos.

---

## 13. Prompt maestro para el APK (pegar primero)

```text
Diseña las pantallas de una APLICACIÓN MÓVIL ANDROID para meseros de un restaurante llamado
«Punto C». No es una web: son pantallas de app (marco teléfono 390 × 844 con barra de estado y
áreas seguras; variante tableta 1024 × 768 horizontal). Español. Uso a una mano, con prisa, a
veces con brillo del local y red intermitente.

IDENTIDAD: fondo #FAF7F2; superficies #FFFFFF/#F3EDE4; marca terracota #B4451F (hover/pressed
#8F3517); texto #1C1917/#3F3B38/#6B6560; bordes #D6D0C9; éxito #4A6B3F; aviso #B45309; error
#B3261E; info #1F5FA8; radios 10/14/full; iconos Lucide; títulos en Fraunces solo en login,
cabeceras y totales, el resto Inter. Cifras tabulares. Objetivos táctiles ≥ 48 px.

ESTADOS DE MESA (color + texto, nunca solo color): Libre (blanco con borde), Ocupada · {min} min
(oliva suave), Por cobrar (ámbar), Reservada {hora} (marca suave), Fuera de servicio (gris
rayado). ESTADOS DE COMANDA: Enviada {hora}, En cocina (ámbar), Lista (oliva con punto de aviso),
Entregada (gris), Anulada (rojo tachado). CONEXIÓN: En línea / Sin conexión · {n} pendientes
(rojo) / Sincronizando (ámbar), siempre visible en la cabecera.

COMPONENTES BASE: PinPad grande, dispositivo vinculado, píldora de conexión, barra inferior de 4
accesos (Salón · Mis mesas · Avisos · Yo), hojas modales desde abajo, diálogos de confirmación
para acciones destructivas, toasts, badges y skeletons.

COMPONENTES PROPIOS: ZoneTabs, TableCard, TableActionSheet, TransferTableSheet, MergeTablesSheet,
ReservationCard, QuickSearchBar, CategoryChips, ProductTile (normal/agotado/99), LineSheet con
modificadores/notas/fracción/comensal, PendingSentSplit, RoundsNav, SendToKitchenSheet con reparto
por estación, PrintStatusRow, ComandaCard con stepper de estados, AnnulSheet con motivo,
PermissionGate (PIN del capitán), BillPanel, PreCuentaPreview, DiscountSheet, TipSelector,
SplitSheet, PaymentMethodGrid, CashChangeCalculator, PartialPaymentRow, SendToCashierSheet,
ReceiptPreview, CloseTableConfirm, ConnectionPill, OfflineBanner, SyncQueueSheet,
ConflictResolverSheet, AlertsInbox, AlertToast, SlaBadge, ForcedUpdateScreen,
PermissionDeniedSheet.

REGLAS CLAVE: el mesero siempre distingue líneas PENDIENTES (editables) de ENVIADAS (no se
editan; solo anular con motivo); nada se pierde ni se duplica sin conexión (marca cada operación
como Enviada o Pendiente); acciones sensibles piden autorización y avisan que quedan auditadas;
la pre-cuenta no es documento fiscal. Primero fundaciones y componentes; espera mi siguiente
mensaje antes de generar pantallas.
```

---

## 14. Prompts por pantalla

### 14.1 Bloqueo / reanudar sesión

```text
Diseña la pantalla de BLOQUEO al volver a la app: fondo marca suave, logo pequeño, nombre del
mesero y botón «Reanudar» si la sesión sigue válida; si no, PinPad. Incluye el caso «sin
conexión con operación en curso»: «Puedes terminar la comanda en curso; te pediremos PIN al
reconectar», con acceso a la cuenta a medias. Aviso de expiración 30 s antes.
```

### 14.2 Acceso con PIN

```text
Diseña ACCESO CON PIN: cabecera con sede y estado del dispositivo, nombre e inicial del último
mesero, PinPad grande (no el teclado del sistema) con 4–6 dígitos, mensajes de error con intentos
restantes y bloqueo temporal con cuenta atrás. Accesos: «Cambiar mesero», «Vincular este
dispositivo», «Ayuda».
```

### 14.3 Vincular dispositivo y turno

```text
Diseña VINCULAR DISPOSITIVO: explicación breve, campo de código (o escaneo QR) y confirmación con
el nombre del restaurante y la sucursal; estado de dispositivo revocado con mensaje «Vuelve a
vincularlo». Diseña también SELECCIÓN DE SUCURSAL Y APERTURA DE TURNO: responsable, asignación de
zonas/mesas u «salón completo», y estado del turno abierto.
```

### 14.4 Mapa de salón

```text
Diseña el MAPA DE SALÓN: cabecera con sede, mesero, píldora de conexión (En línea / Sin conexión ·
3 pendientes) y chips de zona («Todas», «Salón principal», «Terraza») más el chip «Mis mesas»;
rejilla de TARJETAS DE MESA con número grande, estado (color + texto), tiempo de ocupación,
iniciales del mesero y badges (comanda lista, SLA excedido, pedido web, reserva). Pie con leyenda
plegable de estados. Versión tableta con más columnas y panel lateral reservado para la cuenta.
```

### 14.5 Acciones de mesa

```text
Diseña la HOJA DE ACCIONES DE MESA por estado: Libre (Abrir mesa, Sentar reserva, Fuera de
servicio); Ocupada (Tomar pedido, Ver cuenta, Comandas, Trasladar, Unir, Pre-cuenta, Cobrar,
Enviar a caja); Por cobrar (Cobrar, Enviar a caja, Ver cuenta); Reservada (Sentar, Liberar,
No-show). Incluye la hoja TRASLADAR (elegir mesero) y UNIR (elegir mesa destino) con aviso de que
queda auditado, y la tarjeta de RESERVA PRÓXIMA con hora, personas y preferencia.
```

### 14.6 Mis mesas

```text
Diseña «MIS MESAS»: lista/grid de las mesas asignadas ordenadas por urgencia (SLA excedido, por
cobrar, listas por servir), con acciones rápidas inline (ver cuenta, comandas, cobrar) y un
indicador de «no se ocultan alertas» cuando hay filtro activo.
```

### 14.7 Carta rápida

```text
Diseña CARTA RÁPIDA para tomar pedido: cabecera con «Mesa 12» y contador de líneas pendientes;
barra de búsqueda con botón «código» (teclado numérico); chips de categorías; rejilla de
productos (2 columnas en teléfono, 3–4 en tableta) con precio y estado; agotados y fuera de
horario atenuados y no seleccionables con motivo. Toque en producto sin modificadores agrega 1
(con animación breve y haptic); con modificadores abre Personalizar.
```

### 14.8 Personalizar línea

```text
Diseña PERSONALIZAR LÍNEA como hoja desde abajo: grupos de modificadores con «obligatorio» y
contador («1 de 3»), único como radio-filas y múltiple como checkbox-filas con costo adicional
(+$15); notas con plantillas rápidas (Sin cebolla, Salsa aparte, Para compartir); cantidad;
entrada de fracción «N T» para granel (V1); etiqueta de comensal (V1); total de la línea grande y
visible; botón «Agregar» deshabilitado hasta cumplir obligatorios, indicando qué falta.
```

### 14.9 Cuenta de la mesa

```text
Diseña la CUENTA DE LA MESA con DOS BLOQUES CLARAMENTE SEPARADOS: «Pendientes de enviar»
(editables: editar, quitar) y «Enviadas» (no editables, con sello de hora y número de ronda), más
totales en vivo y el botón primario «Enviar a cocina». Muestra el aviso cuando una línea pendiente
usa un producto agotado. Incluye navegación por rondas y un encabezado con mesa, comensales,
mesero y tiempo de ocupación.
```

### 14.10 Enviar a cocina

```text
Diseña la hoja ENVIAR A COCINA: resumen del reparto por estación («Cocina: 3 · Barra: 2») con el
detalle, aviso de estaciones vacías o marcadas 99 que no imprimen, y botón de confirmar. Tras
confirmar, muestra el estado de impresión por estación (imprimiendo / impresa / falló con
«Reintentar») y el mensaje «Comanda enviada». Si no hay red, avisa que la impresión sale por el
agente local y el envío queda encolado.
```

### 14.11 Comandas de la mesa

```text
Diseña COMANDAS DE LA MESA: tarjetas por ronda y estación con número, hora, líneas y stepper de
estado (Enviada → En cocina → Lista → Entregada), badge de SLA (en tiempo / excedido) y acciones:
«Marcar entregada» (mesero), «Reimprimir» (pide autorización y avisa que queda auditado) y
«Anular» (hoja con motivo obligatorio; si ya se preparó, pide PIN del capitán).
```

### 14.12 Pre-cuenta

```text
Diseña la PRE-CUENTA con formato de ticket (logo, mesa, mesero, líneas, subtotal, ajustes,
propina y total) y la leyenda clara «No es documento fiscal». Acciones: «Imprimir», «Enviar a
caja» y «Cobrar» (V1). Avisa si quedan líneas pendientes de enviar.
```

### 14.13 Descuentos y cortesías

```text
Diseña AJUSTES: descuento o cortesía con tipo (% o monto), alcance (total o línea), MOTIVO
obligatorio y autorización por PIN del capitán (PermissionGate). Muestra el rechazo cuando no hay
permiso («Necesitas autorización del capitán. Intento registrado.») y el total actualizado.
```

### 14.14 Propina y división

```text
Diseña PROPINA Y DIVISIÓN: selector de propina (Sin propina · 10 % · 15 % · 20 % · libre) separado
del total de productos; división en partes iguales, por ítems o por comensal, con el total por
parte y una verificación visible de que la suma cuadra con el pedido; cada parte se puede cobrar
con su medio.
```

### 14.15 Cobro

```text
Diseña COBRO: resumen con total, propina y ajustes; medios como filas de radio (Efectivo, Tarjeta,
Transferencia) solo los habilitados; para efectivo, calculadora de cambio con billetes rápidos;
para pagos parciales, saldo restante y el pedido permaneciendo «Por cobrar»; formato de tarjeta:
instrucción del datáfono y confirmación manual del resultado (la app nunca pide datos de tarjeta).
Al completar: vista de recibo con «Imprimir recibo» y «Abrir gaveta», y confirmación final
«Cobrar y liberar mesa». Incluye «Enviar a caja» como alternativa y la advertencia de que un
pedido se cobra una sola vez.
```

### 14.16 Avisos

```text
Diseña la BANDEJA DE AVISOS con tipos: comanda lista, SLA excedido, pedido web de mesa, reserva
próxima y sincronización fallida; cada aviso con mesa, hora y acción para abrirla o marcarla como
atendida; ajustes de sonido y vibración por tipo, dejando claro que «listo» y «SLA excedido» suenan
distinto.
```

### 14.17 Estado y cola de sincronización

```text
Diseña ESTADO Y COLA DE SINCRONIZACIÓN: resumen (En línea / Sin conexión desde {hora}, pendientes,
fallidas, conflictos) y lista en orden causal con tipo de operación, mesa, hora y estado; acciones
«Reintentar todo», ver detalle y «Descartar» (solo con autorización). Diseña también el
CONFLICTO: explica que otro mesero cambió la mesa, qué confirmó el servidor y las opciones para
reconciliar, con la promesa visible «nada se pierde y nada se duplica».
```

### 14.18 Yo / dispositivo, versión y permisos

```text
Diseña «YO»: mesero actual, sede y turno; versión de la app; estado y revocación de vinculación;
«Cambiar mesero»; «Cerrar sesión» con confirmación destructiva que avisa si hay operaciones
pendientes. Diseña además: pantalla de ACTUALIZACIÓN OBLIGATORIA (bloquea con botón a la tienda) y
la hoja de PERMISO DENEGADO (qué permiso falta, a quién pedirlo y opción de solicitarlo).
```

### 14.19 Cierre de turno

```text
Diseña CIERRE DE TURNO (V2): resumen con mesas atendidas, ventas, propinas y comandas; monto
esperado vs registrado; confirmación de cierre con el responsable; advertencia si quedan mesas
abiertas u operaciones sin sincronizar.
```

### 14.20 Prototipo e interacciones

```text
Convierte el archivo en un prototipo navegable con cuatro caminos: (1) PIN → salón → abrir mesa →
tomar ronda con modificadores → enviar a cocina (con reparto por estación e impresión) → comanda
lista → servir; (2) pre-cuenta → propina → cobro en efectivo con cambio → liberar mesa; (3) sin
red → tomar ronda → ver «pendiente» → reconectar → sincronizar → resolver un conflicto de mesa;
(4) impresora caída → comanda en cola → reintentar. Añade haptics y sonidos diferenciados (listo
vs SLA), transiciones de 150–200 ms y modo alto contraste. Documenta en notas qué pantallas son
MVP y qué V1/V2.
```

---

## 15. Trazabilidad RF → pantallas

| RF (R3) | Dónde se cubre |
|---|---|
| 01–03 sesión y dispositivo | 1, 2, 3, 19, 21 |
| 04 offline tras login | 5, 6, 8, 9, 18 |
| 05–06 cambio de mesero y versión | 19, 20 (actualización) |
| 10–15 mapa de salón | 5, 6, 7 |
| 20–26 toma de pedido | 8, 9, 10 |
| 30–36 comandas y avisos | 10, 11, 12, 17 |
| 40–48 cuenta y cobro | 13, 14, 15, 16, 17 |
| 60–65 offline y sincronización | 18, 19 |
| 70–73 impresión | 11, 13, 16 |
| 80–83 turno y supervisión | 3, 4, 6, 19 |
| RN-R3-01/03/09/14 | 9, 10, 11 |
| RNF-R3-01/02/03/09 | 3, 5, 18, 19 |

---

## 16. Siguientes pasos

1. Confirmar con el cliente las decisiones de **R3 §17** (hardware teléfono/tableta, quién cobra,
   impresoras de salón, ventana offline).
2. Validar el prototipo con **meseros reales** en un turno (el flujo y los textos, no solo el
   diseño).
3. Implementar en **Expo + React Native** dentro de `Interface movil mesero`, con
   `expo-secure-store` (PIN y token de dispositivo), `netinfo` (estado de conexión), cola de
   sincronización local y `socket.io-client` para estados en vivo.
4. Después de este brief, el de la **cocina** ([R4](../../requerimientos/04-kds-cocina.md)),
   que consume las comandas aquí enviadas.
