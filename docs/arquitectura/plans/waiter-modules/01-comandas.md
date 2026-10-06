# 01 — Comandas del mesero (estados, entrega, reenvío a cocina y anulación)

**Rutas:** `/(app)/comandas`, `/(app)/mesa/[id]/comandas` · **Prioridad:** MVP RF-R3-30, 31, 34
(línea); **V1** RF-R3-32, 33, 34 (comanda) y 62; **V2** RF-R3-82 · **Módulo 01** de la serie
([índice](./00-indice.md)). Brief: [plan 03 §6.12 y §5.4](../front/03-plan-apk-mesero.md);
requisitos: [R3 §5.4 y §8](../../requerimientos/03-apk-mesero.md). Ante conflicto, manda R3.

> **Desviación de la instalación (2026-10).** En este despliegue **no hay impresoras**: las comandas
> llegan al **KDS**, que se muestra en un **TV de cocina** mediante **otra app**. Por eso este módulo
> **no imprime**: donde el brief/R3 habla de *reimprimir* y de *print agent*, aquí se traduce a
> **reenviar la comanda a cocina** (volver a empujarla al KDS). Los RF de impresión
> **RF-R3-70/71/72/73** y **RF-R3-62** (reimpresión sin conexión) **no aplican** a las comandas en
> esta instalación; si más adelante se agrega impresión, se reactivan desde este mismo módulo.

## 1. Contexto y alcance

El **puente salón ↔ cocina** visto por el mesero. Aquí se consulta el estado de las comandas que
generó el envío de una ronda (RF-R3-30), se marca `entregada` cuando el producto llega a la mesa, y
se recuperan excepciones: **reenviar a cocina** (reenvío explícito, RF-R3-32 reinterpretado) y
**anular** (RF-R3-34). La cocina cambia los estados desde el **app del KDS**; el APK los recibe por
el evento `comanda.estado` y solo marca `entregada` (plan 03 §8 y R3 §8).

**Alcance:** la pestaña **Comandas** (todas las mesas del mesero; «todo el salón» para capitán, V2)
y el **detalle por mesa**. Incluye las acciones del mesero sobre una comanda existente y el reenvío
a cocina (V1).

**Fuera de alcance:** cocinar o cambiar estados de preparación (eso es el app del **KDS**);
**tomar el pedido y enviarlo** (carta rápida, personalizar línea, cuenta de la mesa y hoja «Enviar a
cocina», plan 03 §14.7–§14.10); pre-cuenta y cobro (§14.12–§14.15). Este módulo **consume** las
comandas que produce el envío; no las crea. La **impresión** (si algún día existe: pre-cuenta y
recibo) no es parte de este módulo.

**Supuesto (destino de la pestaña).** El nav del prototipo ya tiene «Comandas»; el brief §4.1 la
ubica como pantalla por mesa (`/(app)/mesa/[id]/comandas`, V1). Se adopta **ambas**: la pestaña
`/(app)/comandas` lista las comandas **del mesero** agrupadas por mesa (el filtro «Mis mesas» es un
chip), y el detalle por mesa conserva la ruta del brief. Si se decide que la pestaña solo muestre
**líneas pendientes de enviar**, se añade un bloque superior marcado como opción, sin cambiar el
resto.

## 2. Requisitos cubiertos

| RF-R3 | Requisito | Prioridad | Criterio de aceptación | RN/RNF |
|---|---|---|---|---|
| 30 | Enviar a cocina solo las líneas nuevas, generando comandas por estación | MVP | Cada estación recibe solo lo suyo (contexto: el módulo las muestra) | RN-R3-01, RN-R3-02 |
| 31 | No reenviar lo ya enviado; el reenvío es explícito | MVP | Un segundo envío no duplica comandas en el KDS | RN-R3-01 |
| 33 | Ver el estado de cada comanda (enviada, en preparación, lista, entregada) | V1 | El estado refleja lo que marca el KDS | — |
| 32 | Reenviar a cocina una comanda de una ronda anterior (con permiso y auditoría) | V1 | El reenvío queda auditado | RNF-R3-08 |
| 34 | Anular una línea (MVP) o comanda (V1) con motivo | MVP/V1 | Se audita y se recalcula el total | RN-R3-03, RN-R3-04 |
| 82 | Supervisar todas las mesas y comandas del salón | V2 | El capitán ve el estado global | RN-R3-06 |

**No aplican en esta instalación:** RF-R3-70 (imprimir comandas por estación), RF-R3-71 (no
imprimir en estaciones vacías/`99`) y RF-R3-62 (reimprimir sin conexión). La entrega a cocina es por
**KDS**, no por impresora. RN-R3-02 (enrutamiento por estación) sigue vigente: una estación vacía o
`99` no genera comanda en el KDS.

Aplican, además, RNF-R3-01 (offline fiable) y RNF-R3-02 (respuesta inmediata) y RN-R3-03 (una línea
enviada no se edita: se anula y se agrega).

## 3. Rutas y pantallas

| Ruta | Pantalla | Contenido y acciones |
|---|---|---|
| `/(app)/comandas` | Bandeja del mesero | Chips de estado (**Todas · En cocina · Listas · Entregadas**); agrupada por **mesa**; cada mesa con sus comandas por **ronda/estación** (`ComandaCard`); `SlaBadge`; pull-to-refresh; badge de «listas»; actualización en vivo |
| `/(app)/mesa/[id]/comandas` | Comandas de la mesa | Comandas de la mesa agrupadas por ronda y estación; cabecera con mesa, mesero y total; acciones por comanda |
| `/(app)/comandas?vista=historial` (V1) | Historial del turno | Comandas del turno con sellos y tiempos (solo lectura) |
| Hoja `ComandaDetailSheet` | Detalle | Número, estación (pantalla del KDS), ronda, líneas (`nombre_snapshot`), sellos, `SlaBadge` |
| Hoja `ResendConfirm` (V1) | Reenviar a cocina | Explica que es un **reenvío** auditado al KDS; pide `PermissionGate` si la comanda ya está `entregada` |
| Hoja `AnnulSheet` | Anular | Línea o comanda; **motivo obligatorio**; si ya se preparó, pide **PIN del capitán** (RN-R3-04) |
| `MarkDeliveredButton` | Acción inline | Marca `entregada` (la puede hacer el mesero); optimista + sello del servidor |

La pestaña, los chips y el filtro viven en la **ruta/estado de navegación** (compartible). El
detalle usa **hoja modal** sobre la bandeja para no perder contexto.

## 4. Datos

| Tabla | Uso y campos clave |
|---|---|
| `comanda` | `pedido_id`, `sucursal_id`, `estacion_id`, `numero`, `turno_id`, `estado` (`pendiente`/`impresa`/`en_preparacion`/`lista`/`entregada`/`anulada`), sellos `enviada_en`, `lista_en`, `entregada_en` |
| `comanda_linea` | `comanda_id`, `pedido_linea_id`, `estado` (`pendiente`…`anulada`); cuenta de pendientes |
| `pedido`, `pedido_linea` | Mesa, mesero/modalidad y `nombre_snapshot` de cada línea; totales del pedido |
| `estacion` | Estación del producto; **cada estación corresponde a un punto/sector del KDS** (no a una impresora) |
| `regla_sla`, `producto.tiempo_objetivo_seg` | Objetivo por estación o producto (alcance excluyente) para el semáforo |
| `mesa`, `turno`, `usuario` | Contexto de mesa y mesero responsable; turno en curso |
| `sync_operacion` | Cola offline: `client_op_id`, `tipo`, `payload`, `estado`, `error` (entregar/anular/reenviar) |
| `evento_auditoria`, `bitacora_evento` | Auditoría de entrega, reenvío y anulación (`entidad_tipo` = `comanda`/`pedido`) |
| `analytics.mv_tiempos_comanda`, `mv_sla_estacion` | Agregados de SLA del turno (opcional para cabecera/historial) |

Notas: el **tiempo transcurrido** es `ahora_servidor − enviada_en` y el de preparación
`lista_en − enviada_en`; sin `lista_en` la celda muestra **«—»** y no promedia. La comanda es
**snapshot**: un cambio de producto o precio no la altera. **No se usan** `trabajo_impresion` ni
`impresora` en este módulo; el estado `impresa` del enum `estado_comanda_enum` corresponde al envío
al KDS en la práctica (o queda sin uso) y no se muestra como «impresa» al mesero. No se requieren
tablas nuevas.

## 5. API propuesta

REST bajo `/mesero/…` (prefijo propuesto, §4.1 del índice), paginación `{ data, total, page, pageSize }`.

| Método y ruta | Propósito |
|---|---|
| `GET /mesero/comandas` | Bandeja: filtros `estado`, `estacionId`, `mesaId`, `turnoId`, `alcance=mias\|salon` (V2); incluye tiempo transcurrido y semáforo calculados en servidor |
| `GET /mesero/comandas/:id` | Detalle con líneas, pedido y sellos |
| `GET /mesero/comandas/:id/lineas` | Líneas con `nombre_snapshot` y estado por línea |
| `POST /mesero/comandas/:id/entregar` | Marca `entregada` (sello del servidor); `Idempotency-Key` |
| V1 `POST /mesero/comandas/:id/reenviar` | Reenvía la comanda al KDS (permiso si ya `entregada`); `motivo` + `Idempotency-Key` |
| V1 `POST /mesero/comandas/:id/anular` | Anula la comanda; `motivo`; autorización si ya se preparó |
| `POST /mesero/comandas/lineas/:lineaId/anular` | MVP: anula una línea con `motivo` (recalcula total) |
| V2 `GET /mesero/comandas/salon` | Supervisión del salón completo (capitán) |
| V1 `GET /mesero/comandas/historial` | Historial del turno con sellos y tiempos |

**Eventos Socket.IO** (room `sucursal:{sucursalId}` y `mesa:{id}`): `comanda.creada` (nueva comanda
al enviar), `comanda.estado` (cambios del **KDS**: `en_preparacion`/`lista`/`entregada`),
`comanda.recibida` (el KDS confirmó la recepción de la comanda — **Supuesto** de nombre si no existe
evento dedicado), `alerta.creada` (SLA) y `sync.estado` (confirmación de operaciones encoladas). Al
reconectar, refetch de la bandeja.

## 6. Frontend

Componentes compartidos (Fase 0): `Sheet`, `StatusBadge`, `SlaBadge`, `EmptyState`, `Skeleton`,
`ErrorState`, `PermissionGate`, `DestructiveConfirmDialog`, `RelativeTime`, `ConnectionPill`.

Propios: `ComandasInbox`, `ComandaCard` (variantes por estado), `ComandaStatusStepper`
(`enviada → en_preparacion → lista → entregada`), `MesaGroupHeader`, `MarkDeliveredButton`,
`ResendConfirm`, `AnnulSheet`, `ComandaDetailSheet`.

- La bandeja prioriza **listas** arriba (punto de aviso oliva) y **SLA excedido** en rojo; agrupa por
  mesa con el número grande (uso de pie/en movimiento).
- **Separación inequívoca** de estados (RN-R3-01 y R3 §11): la comanda muestra **hora de envío
  sellada** y nunca se edita; «Entregada» queda atenuada.
- El **reenvío a cocina** y la **anulación** siempre con **aviso de auditoría** en la hoja; la
  anulación tras preparar (y el reenvío de una comanda entregada) muestra el `PermissionGate`.
- **Offline:** entregar y anular siguen disponibles y muestran `↻ Pendiente`; el **reenvío a cocina
  requiere red** (el KDS es remoto), así que se encola y se envía al reconectar.

## 7. Permisos y trazabilidad

| Permiso | Cubre |
|---|---|
| `comandas.ver` | Bandeja, detalle e historial |
| `comandas.entregar` | Marcar `entregada` |
| `comandas.reenviar` | Reenviar a cocina (motivo obligatorio) |
| `comandas.anular` | Anular línea/comanda antes de preparar |
| `comandas.anular_post` | Anular tras preparar (exige `PermissionGate` de capitán) |
| `comandas.supervisar` (V2) | Ver todo el salón |

Se escribe **`evento_auditoria`** en entrega, reenvío y anulación (con `motivo` y antes/después), y
**`bitacora_evento`** (`entidad_tipo='comanda'`) con el ciclo
`comanda_enviada`/`comanda_en_preparacion`/`comanda_lista`/`comanda_entregada` y, a nivel de pedido,
`anulado`. Todo es inmutable.

## 8. Estados y casos borde

| Caso | Diseño |
|---|---|
| Sin conexión | Entregar/anular se encolan (`↻ Pendiente`); el reenvío a cocina se encola y se aplica al reconectar (RN-R3-13) |
| La comanda no aparece en el KDS | Acción **Reenviar a cocina** (auditada) desde la tarjeta y el detalle |
| Anular tras preparar | `PermissionGate` (PIN del capitán) + motivo; se registra el intento y queda auditado (RN-R3-04) |
| Comanda anulada | Se muestra con responsable, motivo y no cuenta en SLA |
| Comanda sin `lista_en` | «—» en tiempo de preparación; fuera de promedios |
| SLA vencido | `SlaBadge` rojo y primer lugar en el orden de la bandeja |
| Estación `99` o vacía | No genera comanda en el KDS (RN-R3-02) |
| Dos meseros sobre la misma mesa | 409 del servidor; se prioriza el estado confirmado (R3 §16) |
| Sesión expirada sin red | Se permite terminar (entregar/anular) y se pide PIN al reconectar |
| Vacío / cargando / error / sin permisos | Patrón §4.7: `EmptyState`, `Skeleton`, `ErrorState` con «Reintentar» |

## 9. Criterios de aceptación

1. La bandeja lista las comandas del mesero agrupadas por mesa y refleja el estado que marca el KDS
   (misma fuente `comanda`, sellos del servidor).
2. Marcar **entregada** sella `entregada_en` y sobrevive a cerrar y reabrir la app; sin red queda
   `↻ Pendiente` y se aplica al reconectar sin duplicar.
3. **Reenviar a cocina** empuja de nuevo la comanda al KDS, exige permiso si ya está `entregada`, no
   duplica la comanda en el KDS por doble toque (`Idempotency-Key`) y queda auditado.
4. **Anular** línea (MVP) o comanda (V1) con motivo; tras preparar exige autorización y queda
   auditado; el total del pedido se recalcula.
5. Un segundo envío **no** genera comandas duplicadas en el KDS (RF-R3-31).
6. El módulo **no imprime** ni muestra estados de impresora (desviación de la instalación).

## 10. Plan de trabajo

- [ ] **F1 API/datos:** endpoints de bandeja y detalle con tiempos de servidor; entrega y anulación
      de línea; reenvío a cocina; permisos y hooks de auditoría; contrato de `client_op_id`.
- [ ] **F2 lectura/lista:** pestaña Comandas con chips de estado, agrupación por mesa, `ComandaCard`
      y estados vacío/cargando/error.
- [ ] **F3 detalle/acciones:** `ComandaDetailSheet` con líneas y sellos; **entregar** optimista;
      **anular línea** con motivo.
- [ ] **F4 en vivo/offline:** Socket.IO (`comanda.estado`); marcas Enviada/Pendiente; refetch al
      reconectar; cola del reenvío a cocina.
- [ ] **F5 pruebas:** idempotencia, offline, permiso denegado, sin `lista_en`, reenvío sin duplicar.
- [ ] **V1:** reenviar a cocina con permiso, anular comanda, historial del turno, `SlaBadge`.
- [ ] **V2:** supervisión del salón completo para capitán.

## 11. Dependencias y pendientes

- **Fase 0** (router, cola offline, kit), **Catálogo** y **Estaciones** (la estación enruta al
  sector del KDS), **KDS** como emisor de `comanda.estado` (y de la recepción de la comanda),
  **Cuenta/Enviar a cocina** como creador de comandas y **Anulación/números** compartidos con el
  panel.
- Preguntas de R3 §17 que lo afectan: hardware (teléfono/tableta); si cambian, revisar este módulo
  con fecha y RF.
- **Pendiente:** confirmar si existe un evento dedicado de **recepción del KDS** (hoy se asume
  `comanda.recibida`) y si el «Historial del turno» del APK no duplica el monitor del panel
  ([`../../plans/admin-modules/04-comandas.md`](../admin-modules/04-comandas.md)). Si se decide que
  el histórico vive solo en el panel, la vista V1 se elimina sin tocar el resto.
- **Pendiente (impresión):** si la operación habilita impresoras para comandas, reactivar RF-R3-70/71
  y RF-R3-62 y el `trabajo_impresion`/print agent en este módulo.
