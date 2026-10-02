# 06 — Funcionalidades

Detalle por módulo: objetivo, pantallas, flujos, casos borde y permisos.

## 6.1 Web del cliente (reservas + pedidos)

**Fase:** V1 (pedidos = EP-40; reservas en V1).

**Objetivo:** captar pedidos por canal propio y gestionar reservas sin intervención del personal.

### Pantallas

| Pantalla | Contenido |
|---|---|
| Inicio / carta | Categorías, buscador, destacados, estado de agotados y horario de atención |
| Detalle de producto | Fotos, descripción, modificadores, notas, cantidad (incluida fracción/peso) |
| Carrito | Líneas, totales, impuestos |
| Checkout | Modalidad (domicilio / recoger / mesa vía QR), datos de contacto, dirección, hora programada, propina, pago |
| Seguimiento | Estado del pedido en tiempo real (con `codigo` y token de seguimiento) y tiempo estimado |
| Reservas | Calendario de disponibilidad, número de personas, zona, confirmación |
| Mi cuenta | Historial de pedidos y reservas, direcciones, preferencias |

### Flujos

1. **Pedido a domicilio**: carta → carrito → validación de cobertura → pago o contra entrega →
   confirmación → seguimiento → entrega.
2. **Pedido para recoger**: igual al anterior sin validación de cobertura ni reparto.
3. **Pedido en mesa (QR)**: escaneo del QR de la mesa → carta → carrito → confirmación; el pedido
   entra al mismo flujo de cocina que el de un mesero.
4. **Reserva**: selección de franja → validación de disponibilidad de mesa/franja → confirmación (y depósito si aplica)
   → recordatorio → check-in en la mesa.

### Casos borde

- Producto agotado durante el armado del carrito: se avisa y se retira del carrito.
- Cierre de operación a mitad de pedido: se bloquea el checkout con el horario del día siguiente.
- Dirección fuera de cobertura: mensaje claro con opción de cambiar a "recoger".
- Pago rechazado: el pedido queda en `borrador` y se permite reintentar.
- Doble clic en "confirmar": protegido por `client_order_id`.

### Permisos

Público, sin autenticación. Los datos personales requieren consentimiento (ver `07-api-eventos-y-seguridad.md`).

## 6.2 APK de meseros

**Fase:** MVP.

**Objetivo:** tomar y modificar pedidos en salón, enviarlos a preparación y gestionar la cuenta.

### Pantallas

| Pantalla | Contenido |
|---|---|
| Login | PIN por usuario y vinculación de dispositivo |
| Mapa de salón | Mesas por zona con estado y color; acciones por mesa |
| Toma de pedido | Búsqueda de producto, categorías, modificadores, notas, fracción |
| Resumen del pedido | Líneas, subtotal, envío a cocina, pre-cuenta |
| Cuenta | División, medios de pago, propina, cierre |
| Mis mesas | Lista de mesas asignadas y alertas |
| Notificaciones | Ítems listos, solicitudes de caja, avisos del sistema |

### Flujos

1. Abrir mesa → agregar líneas → enviar a cocina → (agregar más líneas) → pre-cuenta → cobro.
2. Trasladar pedido a otra mesa o unir mesas.
3. Anular línea (con permiso y motivo).
4. Reimprimir comanda de una ronda anterior.
5. Operar sin conexión y sincronizar al recuperar red.

### Casos borde

- Pérdida de red antes de enviar: la comanda queda en cola local y se envía al reconectar.
- Pérdida de red después de enviar: el reintento no duplica gracias al idempotente.
- Producto agotado: se bloquea en la búsqueda y se marca visualmente.
- Cambio de catálogo con app abierta: se refresca sin cerrar sesión.
- Dispositivo compartido: el cierre de sesión limpia datos locales sensibles.

### Permisos

`pedido.crear`, `pedido.enviar`, `pedido.anular` (sensible), `mesa.trasladar`,
`cuenta.pre_cuenta`, `cuenta.cobrar` según el rol configurado.

## 6.3 KDS de cocina

**Fase:** MVP (métricas en V1).

**Objetivo:** que cada estación vea, priorice y despache sus comandas en tiempo real.

### Pantallas

| Pantalla | Contenido |
|---|---|
| Tablero por estación | Tarjetas por comanda con mesa, mesero, hora, ítems, notas y cronómetro |
| Detalle de comanda | Líneas con cantidad, modificadores y notas |
| Historial | Comandas despachadas del turno |
| Métricas | Tiempos promedio por producto y estación |
| Configuración local | Estación asignada, sonido, tema, tamaño de letra |

### Flujos

1. Llega comanda → alerta sonora → cocina marca `en_preparacion` → `lista` → mesero la entrega
   → comanda queda `entregada`.
2. Cocina marca una línea agotada o no disponible → la línea pasa a `anulada` con motivo (RN-33) y se notifica al mesero.
3. Reimpresión de una comanda desde el KDS (con permiso).

### Casos borde

- Comanda anulada por el mesero antes de prepararse: desaparece del tablero con aviso.
- Ítem agregado a un pedido ya enviado: llega como comanda nueva, sin alterar la anterior.
- Estación sin KDS activo: la comanda se imprime en la impresora asociada.
- Caída de red: el KDS reconecta y recupera el estado completo (no depende de memoria local).

### Permisos

`comanda.ver`, `comanda.marcar_estado`, `comanda.anular`, `comanda.reimprimir` (sensible).

## 6.4 Backoffice

**Fase:** MVP (catálogo, salón, usuarios, configuración y caja) / V1 (reportes y facturación).

**Objetivo:** administrar la operación sin tocar base de datos.

| Módulo | Funcionalidades |
|---|---|
| Catálogo | Categorías, productos, variantes, modificadores, combos, precios, agotados |
| Estaciones | Alta de estaciones, asignación de productos, impresoras, SLA |
| Salón | Zonas, mesas, capacidades, unión de mesas, mapa visual |
| Usuarios | Usuarios, roles, permisos, asignación por sucursal, dispositivos |
| Pagos y caja | Medios de pago, apertura y cierre de turno, arqueo, retiros, gastos y reembolsos (V1) |
| Reservas | Calendario, configuración de franjas, capacidad, política de depósito y lista de espera |
| Domicilio | Zonas de cobertura, tarifas, pedidos mínimo, repartidores |
| Reportes | Ventas por canal, producto, mesero, turno; tiempos de preparación |
| Facturación | Emisión DIAN, nota crédito y reemisión (V1 si D3 = Sí) |
| Auditoría | Consulta de eventos sensibles con filtros |
| Configuración | Datos de sucursal, horarios, propina, copias de impresión, borrado de comanda, comportamiento offline, impuestos |

### Casos borde

- Cambio de precio con pedidos abiertos: aplica solo a líneas nuevas (snapshot).
- Eliminación de producto con pedidos históricos: se desactiva, no se borra.
- Cierre de turno con pedidos abiertos: se advierte y requiere confirmación explícita.

### Permisos

`catalogo.editar`, `precio.editar`, `usuario.gestionar`, `caja.abrir`, `caja.cerrar`,
`reporte.ver`, `auditoria.ver`, `config.editar`.
