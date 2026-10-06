# 02 — Pedidos (`/pedidos`, `/pedidos/:id`)

**Módulo:** Pedidos · **Bloque:** Operación · **Prioridad:** MVP (RF-R5-54 y RF-R5-56 se habilitan en V1; RF-R5-55 en V2).
**Requisitos:** RF-R5-50…56 y RF-R5-131/132 (R5 §4.6 y §4.14).
Fuentes: [índice de la serie](./00-indice.md) · [brief §6.4–6.4.1](../front/05-plan-panel-administracion.md) · [R5](../../requerimientos/05-panel-administracion.md).

## 1. Contexto y alcance

**Qué resuelve.** El historial operativo completo y trazable de los pedidos:

- Lista en vivo + historial con filtros combinables, columnas de operación y `SavedViewChip`.
- Detalle en `DetailDrawer` con pestañas **Resumen · Líneas · Comandas · Pagos · Bitácora**.
- Acciones con motivo y auditoría: reasignar, anular línea/pedido, reimprimir, reenviar.
- Reembolsos y notas crédito (V1) conciliados con el pago original; forzar estado (V2) con autorización especial.
- Bitácora del pedido con actor, canal, dispositivo, hora del servidor, resultado, antes/después (RF-R5-131/132) y tiempos derivados.
- Exportación del período (V1) con registro en `exportacion`.

**Fuera de alcance.** Creación de pedidos (**Supuesto:** el alta llega desde web/APK/QR/mesero; R5 no la asigna al panel); KDS y operación de comandas ([04 — Comandas](./04-comandas.md)); caja y arqueo ([11 — Caja y turnos](./11-caja-turnos.md)); facturación ([13 — Facturación](./13-facturacion.md)); reparto y repartidores ([09 — Domicilio](./09-domicilio.md)); auditoría global ([16 — Auditoría](./16-auditoria.md)), salvo la bitácora del pedido.

Principios: un pedido no se borra, se cancela (RN-R5-09); los snapshots no cambian (RN-R5-04); la bitácora es inmutable (RN-R5-02).

## 2. Requisitos cubiertos

| ID | Requisito (resumen) | Prioridad | Criterio de aceptación (R5) |
|---|---|---|---|
| RF-R5-50 | Listado en vivo e historial con filtros (sede, canal, modalidad, estado, mesero, fecha) | MVP | Los filtros se combinan y se guardan |
| RF-R5-51 | Detalle del pedido: líneas, modificadores, comandas, pagos y descuentos | MVP | Refleja exactamente lo cobrado y lo impreso |
| RF-R5-52 | Bitácora del pedido: línea de tiempo con todas las acciones y sus tiempos | MVP | Incluye creación, envío, comandas, pagos y cancelaciones (§6.2) |
| RF-R5-53 | Acciones: reasignar mesa o mesero, anular línea o pedido, reimprimir y reenviar | MVP (básicas) / V1 (todas) | Cada acción pide motivo y queda auditada |
| RF-R5-54 | Reembolsos y notas crédito con permiso | V1 | Se concilia con el pago original |
| RF-R5-55 | Forzar un estado con autorización especial | V2 | Queda auditado con motivo y doble confirmación |
| RF-R5-56 | Exportación de pedidos del período | V1 | La exportación respeta el permiso y deja registro |
| RF-R5-131 | Línea de tiempo de cada pedido (§6) | MVP | Todos los eventos del ciclo, en orden |
| RF-R5-132 | Ver el antes y el después de cada cambio | MVP | Aplica a precios, estados, pagos y descuentos |

Reglas aplicables: RN-R5-01 (auditoría), RN-R5-02 (inmutabilidad), RN-R5-04 (snapshot), RN-R5-06 (permisos de reembolso/anulación tras preparación), RN-R5-07 (PII enmascarada), RN-R5-08 (sellos del servidor), RN-R5-09 (no se borra), RN-R5-10 (exportaciones); RNF-R5-01 (alcance servidor), RNF-R5-02 (agregados ≤ 1 min), RNF-R5-04 (exportación en segundo plano), RNF-R5-08 (zona de la sede), RNF-R5-09 (registro de consultas sensibles).

## 3. Rutas y pantallas

- `/pedidos` — lista en vivo + historial. Filtros combinables (en URL): sede, canal, modalidad, estado, mesero, rango de fechas, «con incidencias», «con descuento», «con reembolso» y búsqueda por folio/cliente. Columnas: folio (mono), hora, sede, modalidad/canal, mesa, cliente (enmascarado si aplica), mesero, estado, total, tiempo total y pago. `SavedViewChip` («Por cobrar de hoy», «Domicilio en camino», «Con incidencias») y exportación (V1).
- `/pedidos/:id` — detalle en `DetailDrawer` ancho, deep-link. `EntityHeader` con folio, estado, modalidad, total, acciones y botón **«Bitácora» siempre visible**.
- Pestañas con query `?tab=` (**Supuesto:** en la URL para que sean compartibles y sobrevivan a la recarga): **Resumen · Líneas · Comandas · Pagos · Bitácora**.
- Acciones por pantalla:

| Pantalla | Acciones |
|---|---|
| Lista | filtrar, guardar vista, exportar (V1), abrir detalle |
| Detalle · cabecera | Bitácora, reasignar mesa/mesero, reimprimir, reenviar, anular pedido |
| Líneas | anular línea |
| Comandas | enlace al monitor del KDS |
| Pagos | reembolsar / nota crédito (V1); ver conciliación |
| Bitácora | exportar con registro; saltar a la entidad de origen |
| Cabecera (V2) | forzar estado (doble confirmación + autorización) |

## 4. Datos

- `pedido`: `codigo`, `sucursal_id`, `canal`, `modalidad`, `estado` (`borrador`…`cancelado`), `cliente_id`/`nombre_contacto`/`telefono_contacto`, `mesa_id`/`sesion_mesa_id`, `mesero_id`, `turno_id`, montos (`subtotal_centavos`, `descuentos_centavos`, `impuestos_centavos`, `propina_centavos`, `recargos_centavos`, `total_centavos`) y sellos (`creado_en`…`pagado_en`, `cancelado_en`).
- `pedido_linea`: `nombre_snapshot`, `precio_snapshot_centavos`, `impuesto_snapshot`, `cantidad`, `notas`, `comensal`, `estado` (`pendiente`…`anulada`). Fuente de «lo cobrado» (RN-R5-04).
- `pedido_linea_modificador`: `nombre_snapshot`, `precio_snapshot_centavos`; modificadores tal como se cobraron.
- `ajuste_pedido`: `tipo` (descuento, cortesía, recargo), `valor_centavos`/`porcentaje`, `motivo`, `usuario_id`, `pedido_linea_id`.
- `comanda` + `comanda_linea`: comandas por `estacion_id` con `estado` y sellos `enviada_en`/`lista_en`/`entregada_en`; eslabón con lo impreso.
- `pago` + `pago_linea`: medios, montos, propina, `estado`, `aprobado_en`/`reembolsado_en` y asignación por línea (`pago_linea.pedido_linea_id`).
- `mesa` y `sesion_mesa`: opciones de reasignación y sesión activa.
- `regla_sla`: objetivo por estación o producto, para el semáforo de la pestaña «Comandas».
- `bitacora_evento`: timeline del pedido (eventos de R5 §5.2). `evento_auditoria`: mutaciones sensibles con `motivo`, `datos_antes`/`datos_despues`.
- `trabajo_impresion`: una fila por reimpresión/reenvío. `exportacion`: una fila por exportación (RF-R5-56/130).
- `analytics.mv_tiempos_pedido`: agregados de tiempos para comparativas del módulo 15 (RN-R5-03); el detalle calcula sus tramos con sellos del servidor (RN-R5-08).

Notas: inmutabilidad de bitácora y auditoría (RN-R5-02); el pedido se cancela, no se borra (RN-R5-09); los cambios de catálogo no alteran pedidos ya creados (RN-R5-04). **Supuesto:** el reembolso parcial se registra sobre `pago` (`estado='reembolsado'`, `reembolsado_en`) más `evento_auditoria`; si el cliente exige historial de reembolsos parciales sucesivos, hará falta una tabla específica (ver §11).

## 5. API propuesta

REST bajo `/admin` (convenciones del [índice](./00-indice.md) §4.1):

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/admin/pedidos` | Lista paginada con filtros combinables y orden por campo/dirección. |
| GET | `/admin/pedidos/:id` | Cabecera y resumen del pedido. |
| GET | `/admin/pedidos/:id/lineas` | Líneas con modificadores, comanda/estación y estado. |
| GET | `/admin/pedidos/:id/comandas` | Comandas por estación con tiempos y SLA. |
| GET | `/admin/pedidos/:id/pagos` | Pagos, propina, descuentos y conciliación. |
| GET | `/admin/pedidos/:id/bitacora` | Timeline completo con diffs y tiempos derivados. |
| POST | `/admin/pedidos/:id/reasignar` | Reasigna mesa o mesero (`motivo`, `Idempotency-Key`). |
| POST | `/admin/pedidos/:id/lineas/:lineaId/anular` | Anula línea con motivo; auditado. |
| POST | `/admin/pedidos/:id/anular` | Anula el pedido; tras preparación exige autorización (RN-R5-06). |
| POST | `/admin/pedidos/:id/reimprimir` | Crea `trabajo_impresion` (comanda, precuenta o recibo). |
| POST | `/admin/pedidos/:id/reenviar` | Reenvía comandas a estaciones; auditado. |
| POST | `/admin/pedidos/:id/reembolsar` | V1: reembolso/nota crédito; valida monto ≤ pago original. |
| POST | `/admin/pedidos/:id/forzar-estado` | V2: fuerza estado con doble confirmación y autorización. |
| POST | `/admin/exportaciones` | Crea `exportacion` (tipos `pedidos` y `bitacora_pedido`); en segundo plano si es grande. |
| GET | `/admin/exportaciones/:id` | Estado y URL de la exportación. |

**Supuesto:** las vistas guardadas se persisten en `reporte_guardado` (`tipo='pedidos'`) o solo en URL + usuario; se decide en el módulo de fundaciones.

**Socket.IO:** namespace `/admin`, room `sucursal:{sucursalId}`. El front consume `pedido.creado`, `pedido.estado`, `pedido.actualizado`, `comanda.estado` y `pago.registrado`; el servidor emite al confirmar `pedido.estado` (anular/forzar), `comanda.estado` (reenviar) y `pago.reembolsado` (V1). Al reconectar, refetch completo de la vista activa.

## 6. Frontend

- `modules/pedidos/`: `pages/PedidosPage.tsx`; `components/PedidoDrawer.tsx`, `ResumenTab.tsx`, `LineasTab.tsx` (`OrderLinesTable`), `ComandasTab.tsx`, `PagosTab.tsx`, `BitacoraTab.tsx`, `RefundDialog.tsx` (V1), `ForzarEstadoDialog.tsx` (V2); `api.ts`, `types.ts`.
- Compartidos: `DataTable`, `FilterBar`, `SavedViewChip`, `DetailDrawer`, `EntityHeader`, `StatusBadge`, `MoneyCell`, `DurationCell`, `Timeline`, `BeforeAfterDiff`, `ConfirmDialog`, `ReasonSelect`, `Pagination`, `EmptyState`, `Skeleton`, `ErrorState`.
- Interacciones: filtros en la URL; filas insertadas/actualizadas por socket con resalte breve; drawer con foco gestionado y cierre con `Esc`; la última pestaña abierta se recuerda por pedido; cifras tabulares y totales alineados a la derecha.
- Bitácora: cada evento muestra actor (cliente, mesero, cocina, caja, administrador, automatización), canal, dispositivo, hora del servidor y resultado; los cambios de valor abren `BeforeAfterDiff` (RF-R5-132).
- Tiempos visibles con fórmula en tooltip (R5 §5.3): atención, preparación por estación, preparación del pedido, despacho, ruta/recogida, cobro y total; sin evento de cierre se muestra «—» y no promedia.

## 7. Permisos y trazabilidad

| Par | Uso |
|---|---|
| `pedidos.ver` | Lista y detalle; contacto enmascarado salvo permiso de PII (RN-R5-07). |
| `pedidos.reasignar` | Reasignar mesa o mesero. |
| `pedidos.anular_linea` | Anular línea. |
| `pedidos.anular` | Anular pedido; tras preparación, autorización + motivo (RN-R5-06). |
| `pedidos.reimprimir` | Reimprimir documentos. |
| `pedidos.reenviar` | Reenviar comandas a estaciones. |
| `pedidos.reembolsar` | V1: reembolsos y notas crédito (RN-R5-06). |
| `pedidos.forzar_estado` | V2: forzar estado con doble confirmación. |
| `pedidos.exportar` | Exportar el listado del período (RF-R5-56). |
| `auditoria.exportar` | Exportar la bitácora (RF-R5-130). **Supuesto:** el par exacto se fija en el módulo 16. |
| `clientes.ver_pii` | Ver contacto sin enmascarar. **Supuesto:** se define en el módulo 10. |

Trazabilidad: `bitacora_evento` recibe los eventos del ciclo (`creado`, `enviado`, `comanda_enviada`, `comanda_en_preparacion`, `comanda_lista`, `listo`, `entregado`/`en_camino`/`recogido`, `por_cobrar`, `pagado`, `cancelado`/`reembolsado`) con actor, canal, dispositivo y hora del servidor; `evento_auditoria` recibe cada mutación sensible con `motivo` y `datos_antes`/`datos_despues`; `trabajo_impresion` registra reimpresiones; `exportacion` registra descargas. Bitácoras inmutables (RN-R5-02); consultas sensibles con PII dejan registro (RNF-R5-09).

## 8. Estados y casos borde

- **Vacío:** «Aún no hay pedidos en este período», con limpiar filtros o cambiar fecha/sede; sin acción «Nuevo pedido» (**Supuesto:** el alta no es del panel).
- **Cargando:** `Skeleton` por fila; paginación sin saltos.
- **Error:** causa + «Reintentar»; un 403 por permiso se explica con el nombre del par requerido.
- **Sin permisos:** módulo deshabilitado en el sidebar; acciones ausentes o deshabilitadas con tooltip.
- **Conflicto (R5 §13):** dos administradores actúan sobre el mismo pedido → **409** con el estado vigente; gana lo confirmado por el servidor y la UI refresca.
- **Reembolso mayor al pago:** se rechaza mostrando el monto máximo disponible.
- **Anulación tras preparación:** exige autorización (PIN/2FA según política) + motivo; queda auditada.
- **Cambio de catálogo con pedido en curso:** el pedido conserva sus snapshots (RN-R5-04); solo los carritos sin confirmar se recalculan (fuera de este módulo).
- **Exportación muy grande:** se procesa en segundo plano en `exportacion` y se avisa al solicitante (RNF-R5-04, RN-R5-10).
- **Zona horaria de sede ≠ administrador:** todas las fechas y horas en la zona de la sede (R5 §13).
- **Sin evento de cierre:** el tramo muestra «—» y no entra en promedios (R5 §5.3).
- **Pedido cancelado:** no se borra (RN-R5-09); se muestra con su bitácora completa.

## 9. Criterios de aceptación

1. **RF-R5-50:** combinar sede, canal, modalidad, estado, mesero, rango de fechas y «con incidencias»/«con descuento»/«con reembolso» devuelve el subconjunto correcto; la URL reproduce la consulta en otro equipo y `SavedViewChip` la restaura.
2. La lista muestra folio (mono), hora, sede, modalidad/canal, mesa, cliente, mesero, estado, total, tiempo total y pago; con `pedido.creado`/`pedido.estado` la fila aparece o se actualiza sin recargar.
3. **RF-R5-51:** «Líneas» refleja `nombre_snapshot`/`precio_snapshot_centavos` y sus modificadores; la aritmética (subtotal − descuentos + impuestos + recargos + propina = total) cuadra con `pedido.total_centavos` y con los pagos aprobados, y coincide con lo enviado a comanda/impresión.
4. La pestaña «Comandas» muestra estado y tramos por estación con semáforo contra `regla_sla.objetivo_seg`; sin cierre, «—».
5. «Pagos» lista `pago`/`pago_linea` con medio, monto, propina, descuentos y conciliación contra el total.
6. **RF-R5-52 / RF-R5-131:** la bitácora incluye creación, envío, comandas, listo, entrega/en camino/recogida, por cobrar, pago y cancelación/reembolso **en orden**, cada uno con actor, canal, dispositivo, hora del servidor y resultado.
7. **RF-R5-132:** los cambios de precio, estado, pago y descuento muestran `BeforeAfterDiff` con antes/después.
8. **RF-R5-53:** toda acción pide motivo, confirma, responde 409 si el estado cambió y deja fila en `evento_auditoria` y eventos en `bitacora_evento`. Sin permiso: acción deshabilitada con «Requiere permiso de {permiso}».
9. **RF-R5-54 (V1):** el reembolso no supera el pago original, se concilia contra él y el exceso se rechaza mostrando el máximo.
10. **RF-R5-55 (V2):** forzar estado exige doble confirmación + autorización especial y queda auditado con motivo.
11. **RF-R5-56 / RF-R5-130:** sin `pedidos.exportar` no hay botón (o 403 explicado); con permiso, cada exportación crea fila en `exportacion` y avisa si va en segundo plano.
12. **RN-R5-07:** un rol sin permiso de PII ve nombre/teléfono enmascarados; la consulta sensible queda registrada (RNF-R5-09).

## 10. Plan de trabajo

- [ ] **F1 · API/datos:** listado paginado con filtros y orden; detalle y subrecursos (líneas, comandas, pagos, bitácora); acciones con `motivo` e `Idempotency-Key`; índices por `sucursal_id`, `estado`, `creado_en`, `mesero_id`; contrato de tiempos (R5 §5.3) con sellos del servidor.
- [ ] **F2 · Lectura/lista:** `/pedidos` con `DataTable`, filtros en URL, columnas y `SavedViewChip`; estados vacío/cargando/error/sin permisos.
- [ ] **F3 · Detalle/acciones:** drawer con pestañas y `EntityHeader`; anular línea/pedido, reasignar, reimprimir y reenviar con `ConfirmDialog` + motivo; `RefundDialog` (V1) y forzar estado (V2).
- [ ] **F4 · En vivo/exportación:** actualizaciones Socket.IO sin recargar; bitácora con diffs y tiempos; exportación de pedidos (V1) y de bitácora (RF-R5-130) con registro en `exportacion`.
- [ ] **F5 · Pruebas:** unitarias (filtros, aritmética de totales, tramos), integración (permisos, 409, reembolso máximo, auditoría), e2e «Pedidos → detalle → pestañas → bitácora con tiempos → exportar» (plan 05 §6.24), a11y y teclado.

## 11. Dependencias y pendientes

- **Prerequisito:** Fase 0 del [índice](./00-indice.md) §5 (router/shell, cliente de datos, socket, kit UI, permisos).
- Depende de: **Comandas** (pestaña y enlaces), **Salón** (mesas para reasignar), **Caja/Pagos** (conciliación y reembolsos V1), **Auditoría** (bitácora global, exportación y `BeforeAfterDiff`), **Usuarios** (pares de permiso).
- Preguntas R5 §14 que lo afectan: #1 (capitanes en tableta → acciones táctiles y cómodas), #3 (retención de bitácora: 2 años por defecto).
- Pendientes a confirmar: definición exacta de «con incidencias»; almacenamiento de reembolsos parciales sucesivos; persistencia de vistas guardadas; par de permiso de PII.
