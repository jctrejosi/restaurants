# 04 — Comandas (monitor por estación, SLA y excepciones)

**Rutas:** `/comandas`, `/comandas/:id` · **Prioridad:** MVP RF-R5-60; **V1** RF-R5-61 y 63;
**V2** RF-R5-62 · **Módulo 04** de la serie ([índice](./00-indice.md)). Brief:
[plan 05 §6.7](../front/05-plan-panel-administracion.md); requisitos:
[R5 §4.7, §5.2 y §5.3](../../requerimientos/05-panel-administracion.md). Ante conflicto, manda R5.

## 1. Contexto y alcance

Monitor de comandas por estación con estado y tiempo transcurrido, **idéntico a lo que ve el KDS**
(RF-R5-60), más el cumplimiento de SLA, el historial del turno y las excepciones. El KDS es la
**interfaz de operación**: aquí se **observa** y se corrigen excepciones, no se cocina (plan 05 §1.2);
la pantalla lo advierte de forma visible.

Fuera de alcance: tomar comandas, cambiar estados de preparación o marcar líneas como listas
(eso ocurre en el KDS/APK). La vista unificada de expedidor es solo lectura.

**Supuesto:** la única acción correctiva de este módulo es **reimprimir** una comanda (crea
`trabajo_impresion`); si la operación decide que la impresión corresponde solo al KDS, el botón se
deshabilita sin cambiar el resto del plan.

## 2. Requisitos cubiertos

| RF-R5 | Requisito | Prioridad | Criterio de aceptación | RN/RNF |
|---|---|---|---|---|
| 60 | Monitor por estación con estado y tiempo transcurrido | MVP | Coincide con lo que ve el KDS | RN-R5-08, RNF-R5-02 |
| 61 | Cumplimiento de SLA y alertas; historial del turno | V1 | El reporte se puede exportar | RN-R5-03, RN-R5-10 |
| 62 | Reasignar comandas entre estaciones | V2 | Queda auditado | RN-R5-01 |
| 63 | Ver anulaciones, reimpresiones y agotados con responsable | V1 | Enlaza con la auditoría | RN-R5-01, RN-R5-02 |

Aplican RNF-R5-01 (alcance por sede), RN-R5-08 (sellos del servidor) y RN-R5-04 (la comanda es
snapshot: un cambio de producto o precio no la altera).

## 3. Rutas y pantallas

| Ruta | Pantalla | Contenido y acciones |
|---|---|---|
| `/comandas` | Monitor (pestaña) | Selector de estación o **vista unificada de expedidor**; tarjetas/`DataTable` con estado, líneas, tiempo transcurrido y semáforo; aviso «el KDS es la interfaz de operación» |
| `/comandas?vista=sla` | Cumplimiento de SLA (V1) | Objetivo vs. real por estación, semáforo y lista de vencidas; exportar |
| `/comandas?vista=historial` | Historial del turno (V1) | Comandas del turno con sellos y tiempos; exportable |
| `/comandas?vista=excepciones` | Excepciones (V1) | Anulaciones, reimpresiones y agotados con responsable y enlace a auditoría |
| `/comandas/:id` | Detalle en `DetailDrawer` (deep-link) | Pedido, líneas, estación, sellos, `trabajo_impresion`, alertas y enlace a auditoría; reimprimir |

La pestaña elegida y los filtros viven en la URL (compartibles y `SavedView`). El monitor se refresca
por Socket.IO; SLA e historial muestran «Actualizado hace {n} min» (≤ 1 min, RNF-R5-02).

## 4. Datos

| Tabla | Uso y campos clave |
|---|---|
| `comanda` | `pedido_id`, `estacion_id`, `numero`, `turno_id`, `estado` (`pendiente`/`impresa`/`en_preparacion`/`lista`/`entregada`/`anulada`), sellos `enviada_en`, `lista_en`, `entregada_en` |
| `comanda_linea` | `pedido_linea_id` y estado por línea (`pendiente`…`anulada`); permite contar pendientes |
| `pedido`, `pedido_linea` | Contexto (mesa, mesero, modalidad) y `nombre_snapshot` de las líneas |
| `estacion`, `impresora` | Nombre y tipo de estación; impresoras destino de cada trabajo |
| `regla_sla` | Objetivo por estación **o** por producto (`objetivo_seg`, alcance excluyente) |
| `producto.tiempo_objetivo_seg` | Objetivo por producto cuando no hay regla específica |
| `trabajo_impresion` | `estado` (`pendiente`…`impreso`/`fallido`), `intentos`, `ultimo_error`; origen de reimpresiones |
| `disponibilidad_producto` | Agotados con `agotado_origen` (`cocina`/`salon`/`backoffice`) para la pestaña de excepciones |
| `alerta_operativa` | Tipos `sla` e `impresora`: vencidas y fallos de impresión |
| `usuario`, `turno` | Responsable de cada excepción y turno en curso |
| `evento_auditoria`, `bitacora_evento` | Auditoría de acciones y bitácora (`entidad_tipo='comanda'`/`'pedido'`) |

Notas: el **tiempo transcurrido** es `ahora_servidor − enviada_en` y el de preparación
`lista_en − enviada_en`; sin `lista_en` la celda muestra «—» y no promedia (R5 §5.3). Los agregados de
SLA salen de `analytics.mv_tiempos_comanda` y `mv_sla_estacion` (RN-R5-03).

## 5. API propuesta

REST bajo `/admin/…`, paginación `{ data, total, page, pageSize }`, filtros por query.

| Método y ruta | Propósito |
|---|---|
| `GET /admin/comandas` | Monitor: filtros por sede, estación, estado y turno; incluye tiempo transcurrido y semáforo calculados en servidor |
| `GET /admin/comandas/:id` | Detalle con líneas, pedido, sellos, trabajos de impresión y alertas |
| `POST /admin/comandas/:id/reimprimir` | Relanza impresión (Supuesto); crea `trabajo_impresion`; `Idempotency-Key` y motivo |
| V1 `GET /admin/comandas/sla` | Cumplimiento por estación y lista de vencidas del turno |
| V1 `GET /admin/comandas/historial` | Historial del turno con sellos y tiempos |
| V1 `GET /admin/comandas/excepciones` | Anulaciones, reimpresiones y agotados con responsable e id de auditoría |
| V2 `POST /admin/comandas/:id/reasignar` | Cambia `estacion_id` con motivo; auditoría antes/después |
| `POST /admin/comandas/exportaciones` | Exporta SLA/historial; registro en `exportacion` (RN-R5-10) |

**Eventos Socket.IO** (namespace `/admin`, room `sucursal:{sucursalId}`): `comanda.creada`,
`comanda.estado` (refleja los cambios del KDS), `impresion.estado` (éxito/fallo de
`trabajo_impresion`; **Supuesto** de nombre si no existe evento dedicado), `alerta.creada` (SLA,
impresora), `disponibilidad.actualizada` (agotados), `dispositivo.estado` y `sync.pendiente` (KDS
offline con operaciones pendientes). Al reconectar se refetch del monitor.

## 6. Frontend

Componentes compartidos: `DataTable`, `FilterBar`, `SavedViewChip`, `DetailDrawer`, `StatusBadge`,
`Timeline` (sellos §5.2), `DurationCell`, `EmptyState`, `Skeleton`, `ErrorState`, `ConfirmDialog`,
`ReasonSelect` (reimprimir/reasignar). Propios: `KitchenMonitor`, `ComandaCard`, `StationSelector`,
`SlaGauge`, `LateList`, `ExceptionTable`, `PrintJobsList`.

- Monitor compacto con tiempo transcurrido en vivo y color por semáforo (normal / por vencer /
  vencida), igual que el KDS; sin acciones de cocina.
- Detalle con enlace directo a la auditoría de cada excepción (plan 05 §8: bitácora en un clic).
- Aviso permanente, accesible (AA), de que la operación se hace en el KDS.

## 7. Permisos y trazabilidad

| Permiso | Cubre |
|---|---|
| `comandas.ver` | Monitor, detalle, SLA, historial y excepciones |
| `comandas.reimprimir` | Relanzar impresión (motivo obligatorio) |
| `comandas.reasignar` (V2) | Cambio de estación (motivo obligatorio) |
| `comandas.exportar` | Exportaciones (RN-R5-10) |

Las excepciones se leen de `bitacora_evento` (`entidad_tipo='pedido'`/`'comanda'`) y
`evento_auditoria`, con los eventos de R5 §5.2: `comanda_enviada`, `comanda_en_preparacion`,
`comanda_lista` y, a nivel de pedido, `enviado`, `entregado` y `cancelado`/`reembolsado`. La
reimpresión y la reasignación (V2) escriben `evento_auditoria` con actor, motivo y antes/después, y
enlazan con el visor de auditoría (plan 05 §8). Todo es inmutable (RN-R5-02).

## 8. Estados y casos borde

| Caso | Diseño |
|---|---|
| Impresora caída o trabajo fallido | `trabajo_impresion.estado='fallido'` + alerta `impresora`; reintento visible con intentos y último error |
| Comanda anulada | Se muestra con su responsable, motivo y enlace a auditoría; no cuenta en SLA |
| Comanda sin evento de cierre | `lista_en` ausente: «—» y fuera de promedios (R5 §5.3) |
| SLA vencido | Entra a «vencidas» y genera alerta; semáforo visible en monitor y SLA |
| Producto agotado | Aparece en excepciones con `agotado_origen` y responsable |
| KDS offline con pendientes | Se muestra en el diagnóstico (`sync.pendiente`/`dispositivo.estado`), nunca se oculta |
| Zona horaria de sede ≠ administrador | Sellos y tiempos en la zona de la sede (RNF-R5-08) |
| Sin permisos / vacío / cargando / error | Patrón del plan 05 §6.23 con `EmptyState`, `Skeleton` y «Reintentar» |

## 9. Criterios de aceptación

1. El monitor muestra las mismas comandas, estados y tiempos que el KDS para la misma estación y
   turno (misma fuente `comanda`, sellos del servidor).
2. El tiempo transcurrido se actualiza sin recargar; al reconectar, el segmento se refetch completo.
3. El cumplimiento de SLA por estación se calcula con `regla_sla` (o `tiempo_objetivo_seg`) y se puede
   exportar dejando registro.
4. Anulaciones, reimpresiones y agotados listan responsable y hora, y enlazan con la auditoría.
5. La reasignación (V2) queda auditada con antes/después y motivo.
6. La reimpresión (Supuesto) crea el trabajo, se traza y no permite duplicados por doble clic
   (`Idempotency-Key`).

## 10. Plan de trabajo

- [ ] **F1 API/datos:** módulo NestJS `comandas`; lecturas del monitor con tiempos de servidor;
      detalle; permisos; hooks de auditoría.
- [ ] **F2 lectura/lista:** pestaña Monitor con selector de estación y vista expedidor; estados
      vacío/cargando/error.
- [ ] **F3 detalle/acciones:** drawer con líneas, sellos y trabajos de impresión; reimprimir con
      motivo e idempotencia.
- [ ] **F4 en vivo/exportación:** Socket.IO del monitor; refresco al reconectar; exportaciones.
- [ ] **F5 pruebas:** paridad con KDS, tiempos sin cierre, permisos, idempotencia y trazabilidad.
- [ ] **V1:** SLA + alertas + historial exportable; pestaña de excepciones con enlaces a auditoría.
- [ ] **V2:** reasignación entre estaciones auditada (tras validar con operación del KDS).

## 11. Dependencias y pendientes

- **Fase 0**, **Estaciones e impresoras** (módulo 07; sin estaciones reales no hay monitor) y
  **Pedidos/Comandas del KDS** como origen de datos; **Catálogo** dueño de `regla_sla` y tiempos
  objetivo; `analytics` para SLA e historial; **Auditoría** para los enlaces.
- Preguntas de R5 §14 que lo afectan: objetivos de SLA por defecto y política de reintentos de
  impresión; si cambian, revisar este módulo con fecha y RF.
- **Pendiente:** confirmar si la reimpresión desde el panel es deseada o queda solo en el KDS, y si
  existe un evento de impresión dedicado (hoy se asume `impresion.estado`).
