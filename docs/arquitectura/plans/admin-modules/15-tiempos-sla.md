# 15 — Tiempos y SLA (`/tiempos`)

**Fuentes:** [plan 05 §6.18 y §8](../front/05-plan-panel-administracion.md) · [R5 §4.13 (RF-R5-122), §5.3, §5.4, §7 y §11](../../requerimientos/05-panel-administracion.md) · [esquema 03](../../esquema/03-pedidos-y-dinero.md) · vistas de [`analytics`](../../../../backend/drizzle/migrate/0008_analytics.sql). Convenciones transversales en [00-indice.md](./00-indice.md) §4.

## 1. Contexto y alcance

La vista que convierte los sellos del servidor en las métricas de operación de R5 §5.3, con todas sus fórmulas visibles. **MVP** cubierto por RF-R5-122 y la definición de tiempos de §5.3: atención, preparación, despacho, ruta y recogida, cobro, total, reservas y cumplimiento de SLA.

Fuera de alcance: los agregados de reporte con media/p90 y sus comparativos (módulo 14), el tablero «En vivo» (módulo 01) y la edición de objetivos de SLA (`regla_sla`, RF-R5-32), que se implementa en el módulo 07 — desde aquí solo se enlaza (`SlaEditor`).

**Supuesto:** el job de refresco publica la hora de su última ejecución (igual que en [14-reportes.md](./14-reportes.md)); el sello «Actualizado hace {n} min» se calcula contra esa marca.

## 2. Requisitos cubiertos

| RF / regla | Prioridad | Criterio de aceptación |
|---|---|---|
| RF-R5-122 tiempos | MVP | Atención, preparación, despacho, entrega y cobro **por pedido, estación y mesero** |
| R5 §5.3 definición de tiempos | MVP | Fórmulas exactas por tramo, visibles en tooltip |
| R5 §5.3 regla de cierre | MVP | Sin evento de cierre: «—» y no promedia |
| RN-R5-08 | — | Sellos del **servidor**, no del dispositivo |
| R5 §5.4 trazabilidad | MVP | Clic en una hora lleva al evento que lo produjo (actor y canal) |
| RF-R5-131 | MVP | Línea de tiempo del pedido/reserva enlazada |
| RF-R5-32 (enlace) | — | `SlaEditor` para corregir objetivos, implementado en el módulo 07 |
| RNF-R5-02 / RNF-R5-03 | — | Frescura ≤ 1 min; consultas sobre `analytics`, sin degradar la operación |
| RNF-R5-04 | — | Exportaciones con límites y aviso |

## 3. Rutas y pantallas

Ruta única `/tiempos` con pestaña en la URL (`?tab=`); filtros de sede, estación, mesero, canal, modalidad y rango.

| Pestaña | Qué muestra | Fórmula (R5 §5.3) |
|---|---|---|
| Atención | Por canal, mesero y mesa | `enviado − creado` |
| Preparación | Por estación; y del pedido | `comanda_lista − comanda_enviada` · `listo − enviado` |
| Despacho | Por mesero | `entregado − listo` |
| Ruta y recogida | Domicilio y recoger | `entregado − recogido` · `recogido_en − listo` |
| Cobro | Caja y cierre de mesa | `pagado − por_cobrar` |
| Total | Indicador integral | `pagado/entregado − creado` |
| Reservas | Espera y rotación | `sentada − fecha_hora` · `cierre − apertura` |
| SLA | Cumplimiento por estación | comandas dentro del objetivo / total |

Cada fila abre el pedido/comanda con su bitácora y expande los dos sellos del tramo; cada tramo muestra tooltip con su fórmula («= pagado − por_cobrar»). Acciones: filtrar, exportar (con registro) y saltar al `SlaEditor` del módulo 07.

## 4. Datos

La pantalla lee agregados de `analytics` (RN-R5-03); los sellos crudos solo se consultan por clave para el tooltip.

| Vista / tabla | Uso | Campos clave |
|---|---|---|
| `analytics.mv_tiempos_pedido` | Atención, preparación del pedido, despacho, cobro, total y ruta | pedido_id, sucursal_id, canal, modalidad, mesero_id, fecha, atencion_seg, preparacion_seg, despacho_seg, cobro_seg, total_seg, ruta_seg |
| `analytics.mv_tiempos_comanda` | Preparación por estación | comanda_id, estacion_id, pedido_id, numero, fecha, preparacion_seg, despacho_seg, objetivo_seg, cumple_sla |
| `analytics.mv_sla_estacion` | Pestaña SLA | comandas_medidas, dentro_sla, pct_cumplimiento, preparacion_media_seg |
| `analytics.mv_ocupacion_mesa` | Duración de mesa y ocupación | abierta_en, cerrada_en, duracion_min, pedidos, consumo_centavos |
| `analytics.mv_reservas_diarias` | Espera agregada de reservas | fecha, sucursal_id, espera_media_min |
| `regla_sla` | Objetivo por estación/producto | estacion_id, producto_id, objetivo_seg |
| `bitacora_evento` | Tooltip de sellos con actor y canal | entidad_tipo, entidad_id, evento, actor_tipo, canal, dispositivo_id, creado_en |
| `exportacion` | Exportaciones | usuario_id, tipo, filtros, formato, estado, url |

Notas:

- Sellos de origen que alimentan las vistas (no se leen en caliente): `pedido` (creado_en, enviado_en, listo_en, entregado_en, por_cobrar_en, pagado_en), `comanda` (enviada_en, lista_en, entregada_en), `domicilio_asignacion` (recogido_en, entregado_en), `sesion_mesa` (abierta_en, cerrada_en) y `reserva` (fecha_hora, sentada_en).
- `ruta_seg` sale de la última `domicilio_asignacion` con `recogido_en` y `entregado_en`; sin esos sellos el tramo es nulo → «—».
- **Pendiente (gap R5 ↔ `analytics`):** el tramo de recogida (`recogido_en − listo` para «recoger») y la espera por reserva no existen hoy como vistas (`mv_tiempos_reserva` no está en E9); ver §11.

## 5. API propuesta

| Método y ruta | Propósito |
|---|---|
| `GET /admin/tiempos/pedidos` | Tramo por pedido; query `tramo,desde,hasta,sucursal_id,canal,modalidad,mesero_id,page,pageSize`; responde filas + `resumen` (media, p90, medidos, sin_cierre) |
| `GET /admin/tiempos/comandas` | Tramo por comanda/estación con `objetivo_seg` y `cumple_sla` |
| `GET /admin/tiempos/sla` | Cumplimiento por estación (y por día); `agrupar=estacion|dia` |
| `GET /admin/tiempos/reservas` | Espera agregada (`espera_media_min`) y duración de mesa (`duracion_min`) |
| `GET /admin/tiempos/tramos/:entidad/:id?tramo=` | Los dos sellos del tramo (hora del servidor, actor y canal) |
| `POST /admin/exportaciones` · `GET /admin/exportaciones/:id` | Exportación asíncrona con registro |

- `tramo` ∈ `atencion|preparacion|despacho|ruta|recogida|cobro|total|reserva|sla`.
- Los tramos sin cierre llegan como `null`: el front pinta «—» y la API los excluye de media/p90 (`FILTER (WHERE … IS NOT NULL)`); `resumen.sin_cierre` los cuenta.
- **Supuesto:** el p90 se calcula en la API con `percentile_cont(0.9)` sobre las filas con cierre.

### Exportaciones

Mismo contrato que 14 y 16: `POST /admin/exportaciones` con `{tipo, formato, filtros}`, `tipo: 'tiempos_pedidos|tiempos_comandas|sla'`, `formato: 'csv|xlsx'` según el `CHECK` de `exportacion`; crea registro (`pendiente` → `procesando` → `lista|fallida`) y responde **202** (RN-R5-10). **Supuesto:** límite de 50 000 filas; por encima, segundo plano con aviso (RNF-R5-04).

### Realtime

Namespace `/admin`, room `sucursal:{sucursalId}`: `analytics.actualizado` refresca el sello y el segmento visible; `exportacion.estado` avisa `lista`/`fallida`. `pedido.estado` y `comanda.estado` no recalculan agregados (solo lo operativo). **Supuesto:** el job de SLA puede generar `alerta.creada` de tipo `sla`, visible en la campana del shell (módulo 01). Al reconectar: refetch completo.

## 6. Frontend

- Compartidos: `DataTable`, `FilterBar`, `SavedViewChip`, `DurationCell`, `DetailDrawer`, `Timeline`, `EmptyState`, `Skeleton`, `ErrorState`, `FreshnessBadge` y botón de exportación con panel de estado.
- Propios: `TimesExplorer` (pestañas), `FormulasTooltip` («= pagado − por_cobrar»), `SellosPopover` (sello inicial y final con hora, actor y canal), `SinCierreCell` («—» + conteo) y `SlaEditorLink`.
- Semáforo: verde/ámbar/rojo contra `objetivo_seg` cuando exista (SLA por estación) o contra el promedio del período en el resto de tramos (plan 05 §8).
- Interacciones: expandir fila = dos sellos; clic en una hora = evento que la produjo (R5 §5.4); clic en fila = `/pedidos/:id` o `/comandas/:id`; CTA al `SlaEditor` (`/estaciones`, módulo 07); copy con las reglas visibles («sellos del servidor», «sin cierre no hay promedio»).

## 7. Permisos y trazabilidad

| Permiso | Alcance |
|---|---|
| `tiempos.ver` | Acceso al explorador y a los sellos/tooltips |
| `tiempos.exportar` | `POST /admin/exportaciones` y descarga |
| `estaciones.sla` (módulo 07) | Editar `regla_sla` desde el `SlaEditor` enlazado |

Sin permiso: ítem deshabilitado con explicación; exportar ausente con tooltip «Requiere permiso de tiempos.exportar» (plan 05 §6.23).

Trazabilidad: exportaciones → `exportacion` + `evento_auditoria`; abrir la entidad muestra datos según los permisos de su módulo; si se muestran datos personales (p. ej. cliente de un domicilio) se enmascaran (RN-R5-07) y la consulta sensible deja registro de acceso (RNF-R5-09).

## 8. Estados y casos borde

- **Vacío:** «No hay tramos medidos en este rango» + explicación de qué sellos se necesitan.
- **Tramo mayoritario sin cierre:** celdas «—» con contador «N sin cierre»; nunca promedian (R5 §5.3).
- **Estación sin `regla_sla`:** SLA «—» con CTA al `SlaEditor`; no se inventa objetivo.
- **Cancelados:** excluidos de los promedios; la vista «Excepciones» los muestra aparte (plan 05 §8).
- **Domicilio sin asignación o sin recogida:** ruta «—»; comanda anulada o sin `lista_en`: preparación «—».
- **Refresco caído:** sello en rojo «Datos con retraso (> 1 min)» (RNF-R5-02).
- **Rango muy amplio:** **Supuesto** máx. 1 año con aviso; por defecto 31 días.
- **Zona horaria:** horas en la zona de la sede, con marca «hora del servidor» (RNF-R5-08).
- **Cargando/error/sin permisos:** estados estándar (plan 05 §6.23).

## 9. Criterios de aceptación

- [ ] Cada pestaña calcula exactamente la fórmula de R5 §5.3 y la muestra en tooltip.
- [ ] Cada tramo puede abrirse y muestra los **dos sellos** que lo componen, con hora del servidor, actor y canal.
- [ ] Sin evento de cierre: la celda muestra «—» y la fila queda fuera de media y p90 (verificable con datos sembrados).
- [ ] Cumplimiento de SLA = comandas dentro del objetivo / total **por estación**, según `regla_sla`; sin objetivo no computa y se indica.
- [ ] Alterar el reloj de un dispositivo no cambia ninguna duración (RN-R5-08).
- [ ] Los tramos se pueden ver por pedido, por estación y por mesero (RF-R5-122).
- [ ] Sello de frescura ≤ 1 min (RNF-R5-02); las consultas no tocan tablas operativas en caliente (RN-R5-03).
- [ ] Exportación con registro en `exportacion` y segundo plano si supera el límite (RNF-R5-04, RN-R5-10).
- [ ] Enlaces a bitácora, pedido/comanda y `SlaEditor` funcionan según permisos.

## 10. Plan de trabajo

- [ ] **F1 API/agregados:** endpoints `pedidos`, `comandas`, `sla` y `reservas`; `resumen` (media, p90, medidos, sin_cierre); verificar `fn_refrescar_analytics()` ≤ 1 min.
- [ ] **F2 lectura/lista:** `TimesExplorer` con pestañas MVP (Atención, Preparación, Despacho, Total), filtros en URL, `DurationCell` con semáforo y sello de frescura.
- [ ] **F3 detalle/diffs:** `SellosPopover` con los dos sellos (actor y canal), pestañas Cobro, Ruta y recogida, Reservas y SLA; enlaces a entidad/bitácora y CTA `SlaEditor`.
- [ ] **F4 exportación/avisos:** `POST /admin/exportaciones` con registro, límites y aviso; suscripción a `analytics.actualizado` y `exportacion.estado`.
- [ ] **F5 pruebas:** fórmulas con casos sembrados, «—» sin cierre, SLA con y sin objetivo, frescura, permisos y límites de exportación.

## 11. Dependencias y pendientes

- Depende del job E9 (refresco), del helper de auditoría de la Fase 0 ([00-indice.md](./00-indice.md) §5) y de los módulos 02/04 (detalle y bitácora) y 07 (`SlaEditor`); comparte el contrato de exportación con 14 y 16.
- **Pendiente (gap R5 ↔ `analytics`):** no existe `mv_tiempos_reserva` (espera por reserva) ni agregado del tramo de recogida de «recoger»; `mv_tiempos_comanda` no expone sellos crudos, así que el tooltip se resuelve vía `bitacora_evento`/PK. Decidir en F1 si se crean vistas nuevas o se acota el MVP.
- **Pendiente:** dónde se calcula el p90 (**Supuesto**: API con `percentile_cont`); límite de rango para no cargar el refresco; cómo se comporta el semáforo cuando no hay promedio comparable.
- Preguntas de R5 §14 que lo afectan: frescura real del job, política de cancelados y convivencia multi-sede/zona horaria.
