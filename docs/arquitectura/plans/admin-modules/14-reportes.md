# 14 — Reportes (`/reportes`)

**Fuentes:** [plan 05 §6.17, §7 y §8](../front/05-plan-panel-administracion.md) · [R5 §4.13, §7 y §11](../../requerimientos/05-panel-administracion.md) · [esquema 04](../../esquema/04-marketing-y-operacion.md) · vistas de [`analytics`](../../../../backend/drizzle/migrate/0008_analytics.sql). Convenciones transversales en [00-indice.md](./00-indice.md) §4.

## 1. Contexto y alcance

Constructor de reportes sobre los agregados ya calculados en el esquema `analytics`, nunca sobre la base operativa en caliente (RN-R5-03, RNF-R5-03). Cubre:

- **MVP:** ventas (RF-R5-120), reservas (RF-R5-121) y agregados de tiempos por pedido, estación y mesero (RF-R5-122; el explorador de tramos vive en [15-tiempos-sla.md](./15-tiempos-sla.md)).
- **V1:** desempeño (RF-R5-123), impuestos/propinas/descuentos (RF-R5-124), programados (RF-R5-125) y comparativo entre sucursales (RF-R5-126).
- **V2:** tablero personalizable por rol (RF-R5-127).

Fuera de alcance: la definición de tiempos y sellos (R5 §5.3 → módulo 15), el tablero «En vivo» (módulo 01) y la emisión de las vistas (job E9, `0008_analytics.sql`).

**Supuesto:** el job de refresco corre con periodicidad ≤ 1 min (RNF-R5-02) y deja metadato de su última ejecución; de ahí sale el sello «Actualizado hace {n} min».

## 2. Requisitos cubiertos

| RF / regla | Prioridad | Criterio de aceptación |
|---|---|---|
| RF-R5-120 ventas | MVP | Por período, sede, canal, modalidad y producto; **coincide con caja y facturación** |
| RF-R5-121 reservas | MVP | Volumen, ocupación, no-show y lista de espera; filtrable por sede y fecha |
| RF-R5-122 tiempos | MVP | Agregados por pedido, estación y mesero (§6.3); media y p90 |
| RF-R5-123 desempeño | V1 | Por mesero, cajero y turno, con anulaciones y descuentos asociados |
| RF-R5-124 impuestos | V1 | Impuestos, propinas y descuentos del período listos para contabilidad |
| RF-R5-125 programados | V1 | Por correo y exportación CSV/Excel; la entrega queda registrada |
| RF-R5-126 comparativo | V1 | Mismas métricas y períodos entre sucursales |
| RF-R5-127 tablero | V2 | Cada usuario arma su vista por rol |
| RN-R5-03 / RNF-R5-03 | — | Solo lee `analytics`; no degrada la operación |
| RN-R5-10 / RNF-R5-04 | — | Exportaciones con límites, aviso y registro de quién las hizo |
| RNF-R5-02 | — | Sello de frescura ≤ 1 min |
| RN-R5-11 | — | Festivos, cierres y bloqueos se reflejan en los reportes |

## 3. Rutas y pantallas

| Ruta | Pantalla | Contenido |
|---|---|---|
| `/reportes` | `ReportBuilder` + resultados | Consulta en la URL (compartible y guardable) |
| `/reportes/programados` (V1) | `ProgramadosTable` | Altas, bajas y ejecución manual |
| `/reportes/tablero` (V2, **Supuesto** de ruta) | Tablero por rol | Tarjetas favoritas del usuario |

`ReportBuilder`: métrica + período (hoy/ayer/semana/mes/rango) + filtros (sede, canal, modalidad, producto, categoría, estación, mesero) + agrupación (día/semana/mes) + comparativos (período anterior / entre sucursales). Resultado: `KpiCard`s (total, pedidos, ticket promedio), gráfico con tokens `chart-1…8`, `DataTable` de desglose, `ReservasHeatmap` (horas × días) y botones **Exportar**, **Guardar vista** y **Programar** (V1).

Acciones por pantalla: drill-down de una cifra al listado que la compone (pedidos/productos, con enlace a los módulos 02/04); exportar (con registro); guardar vista privada o de equipo; programar (V1).

## 4. Datos

Solo lectura; las cifras «oficiales» salen de `analytics` (RN-R5-03).

| Vista / tabla | Uso | Campos clave |
|---|---|---|
| `analytics.mv_ventas_diarias` | Ventas MVP | fecha, sucursal_id, canal, modalidad, pedidos, subtotal/descuentos/impuestos/propina/recargos/total_centavos |
| `analytics.mv_ventas_producto` | Ventas por producto | fecha, sucursal_id, categoria_id, producto_id, cantidad, importe_centavos |
| `analytics.mv_reservas_diarias` | Reservas MVP | reservas, confirmadas, sentadas, no_show, canceladas, personas_confirmadas, espera_media_min |
| `analytics.mv_tiempos_pedido` | Tiempos por pedido | atencion_seg, preparacion_seg, despacho_seg, cobro_seg, total_seg, ruta_seg |
| `analytics.mv_tiempos_comanda` y `analytics.mv_sla_estacion` | Tiempos por estación | preparacion_seg, objetivo_seg, cumple_sla / comandas_medidas, pct_cumplimiento |
| `analytics.mv_desempeno_mesero` (V1) | Desempeño | pedidos_pagados, ventas_centavos, propina_centavos, descuentos_centavos, cancelados |
| `analytics.mv_ocupacion_mesa` | Ocupación y rotación | fecha, sesion_mesa_id, duracion_min, pedidos, consumo_centavos |
| `reporte_guardado` | Vistas guardadas | usuario_id, nombre, tipo, filtros (jsonb), visibilidad privado/equipo |
| `reporte_programado` (V1) | Programados | tipo, filtros, periodicidad diario/semanal/mensual, destinatarios, activo |
| `exportacion` | Toda exportación | usuario_id, tipo, filtros, formato, estado, url, creado_en |

Notas:

- `mv_ventas_diarias` y `mv_ventas_producto` solo cuentan pedidos `pagado` (y líneas no anuladas): la conciliación con caja (`cierre_caja`/`pago`) y facturación (`factura`) se hace por totales del período.
- No hay escritura sobre `analytics`; el refresco es `analytics.fn_refrescar_analytics()` (job E9).
- `mv_reservas_diarias` **no** trae lista de espera (RF-R5-121): ver §11.

## 5. API propuesta

| Método y ruta | Propósito |
|---|---|
| `GET /admin/reportes/ventas` | Agregado de ventas; query `desde,hasta,agrupacion,sucursal_id,canal,modalidad,producto_id,categoria_id,comparar` |
| `GET /admin/reportes/reservas` | Reservas con filtros de sede y fecha + serie para el heatmap |
| `GET /admin/reportes/tiempos` | Media y p90 de cada tramo por período, sede, estación y mesero (RF-R5-122) |
| `GET /admin/reportes/desempeno` (V1) | Incluye `cancelados` y `descuentos_centavos` |
| `GET /admin/reportes/impuestos` (V1) | Impuestos, propinas y descuentos del período |
| `GET /admin/reportes/comparativo-sucursales` (V1) | Misma métrica y período para N sedes |
| `GET`/`POST /admin/reportes/guardados` · `PATCH`/`DELETE /:id` | Vistas guardadas propias |
| `GET`/`POST /admin/reportes/programados` (V1) · `PATCH /:id` · `POST /:id/ejecutar` | Programación y envío inmediato |
| `POST /admin/exportaciones` · `GET /admin/exportaciones/:id` | Exportación asíncrona compartida (14/15/16) |

Listas con paginación `?page=&pageSize=` → `{data,total,page,pageSize}`; filtros combinables en la URL; `?orden=campo:asc|desc`; errores `{statusCode,message,codigo}`.

### Exportaciones

```json
POST /admin/exportaciones
{ "tipo": "reporte_ventas|reporte_reservas|reporte_desempeno|...",
  "formato": "csv|xlsx|pdf", "filtros": { "desde": "...", "hasta": "...", "sucursal_id": "..." } }
```

- Crea fila en `exportacion` (`pendiente` → `procesando` → `lista|fallida`) y registro en `evento_auditoria`; responde **202** con `{id}` (RN-R5-10).
- **Supuesto:** límite de 50 000 filas; por encima se ejecuta en segundo plano y se avisa al solicitante (RNF-R5-04, plan 05 §7).
- Entrega por `url` temporal; `pdf` para contabilidad y programados (V1).

### Realtime

Namespace `/admin`, room `sucursal:{sucursalId}`: `analytics.actualizado` (refresca el sello y, si cambia el rango visible, refetch) y `exportacion.estado` (`lista`/`fallida`). **Supuesto:** `alerta.creada` (V2) cuando un umbral afecte a reportes. Al reconectar: refetch completo del segmento.

## 6. Frontend

- Compartidos: `DataTable`, `FilterBar`, `SavedViewChip`, `MoneyCell`, `DurationCell`, `DetailDrawer`, `EmptyState`, `Skeleton`, `ErrorState`, wrappers de `recharts` y `FreshnessBadge` («Actualizado hace {n} min», compartido con el módulo 15).
- Propios: `ReportBuilder` (barra métrica/período/filtros/agrupación), `KpiCard`, `ComparativeToggle`, `ReservasHeatmap`, `ProgramadosTable`, `ProgramarModal`.
- Interacciones: cambiar métrica o filtros cambia la URL (compartible); guardar vista desde el chip; comparativos con **las mismas métricas y períodos**; drill-down al listado subyacente; exportación con aviso de «en segundo plano» cuando aplique. Todo copy en español y accesible por teclado (RNF-R5-07).

## 7. Permisos y trazabilidad

| Permiso | Alcance |
|---|---|
| `reportes.ver` | Acceso al módulo, guardado de vistas propias y drill-down |
| `reportes.exportar` | `POST /admin/exportaciones` y descarga |
| `reportes.programar` (V1) | CRUD de `reporte_programado` y ejecución manual |
| `reportes.tablero` (V2) | Tablero personalizable (configuración del usuario) |

Sin permiso: ítem del sidebar deshabilitado con explicación; botón de exportar ausente con tooltip «Requiere permiso de reportes.exportar» (plan 05 §6.23).

Trazabilidad: exportaciones → `exportacion` + `evento_auditoria` (`accion: 'exportacion.creada'`); programados → `evento_auditoria` (`entidad: 'reporte_programado'`, con antes/después); los agregados no exponen datos personales y, si el drill-down muestra cliente, se enmascara (RN-R5-07).

## 8. Estados y casos borde

- **Vacío:** «Aún no hay ventas en este período» + acción «Cambiar período» / «Ver hoy».
- **Cargando:** `Skeleton` por tarjeta y fila, sin saltos de layout.
- **Error:** causa + «Reintentar»; si `analytics` no responde, enlace a estado del sistema.
- **Sin permisos:** explicación por módulo y por acción (plan 05 §6.23).
- **Exportación muy grande:** se limita, se procesa en segundo plano y se avisa (plan 05 §7).
- **Datos con retraso:** si el refresco supera 1 min, el sello se pinta en rojo con «Datos con retraso».
- **Zona horaria:** períodos y fechas en la zona de la sede (RNF-R5-08), sobre todo en comparativos multi-sede.
- **Festivos y cierres:** afectan disponibilidad y se ven reflejados (RN-R5-11).
- **Cancelados:** excluidos de totales y promedios de venta; la vista «Excepciones» pertenece al módulo 15 (plan 05 §8).

## 9. Criterios de aceptación

- [ ] Ventas por período, sede, canal, modalidad y producto **coinciden con caja y facturación** del mismo período (RF-R5-120).
- [ ] Reservas filtrables por sede y fecha con volumen, ocupación y no-show, más heatmap horas × días (RF-R5-121).
- [ ] Agregados de tiempos por pedido, estación y mesero con media y p90; celdas sin cierre excluidas del promedio (RF-R5-122, §5.3).
- [ ] Desempeño con anulaciones y descuentos asociados (V1).
- [ ] Impuestos, propinas y descuentos exportables a CSV/Excel listos para contabilidad (V1).
- [ ] Programados por correo/exportación con entrega registrada (V1).
- [ ] Comparativo entre sucursales con las mismas métricas y períodos (V1).
- [ ] Tablero personalizable por rol (V2).
- [ ] Sello de frescura ≤ 1 min visible y en verde; ninguna consulta toca tablas operativas en caliente (RNF-R5-02, RN-R5-03).
- [ ] Toda exportación deja registro con usuario y filtros (RN-R5-10).

## 10. Plan de trabajo

- [ ] **F1 API/agregados:** módulo NestJS `reportes`; consultas a `analytics` (ventas, reservas, tiempos); sello de frescura; contrato de `exportacion`.
- [ ] **F2 lectura/lista:** `/reportes` con `ReportBuilder` (ventas y reservas MVP), filtros en URL, `SavedView`, `KpiCard`s y heatmap.
- [ ] **F3 detalle/diffs:** drill-down de cifras a pedidos/productos; comparativos (período anterior y multi-sede); desempeño V1.
- [ ] **F4 exportación/programados:** `POST /admin/exportaciones` con segundo plano y aviso; programados por correo (V1); tablero V2.
- [ ] **F5 pruebas:** conciliación con caja/facturación, frescura ≤ 1 min, límites de exportación, permisos y rangos amplios.

## 11. Dependencias y pendientes

- Depende de la Fase 0 ([00-indice.md](./00-indice.md) §5), del job E9 de refresco y de los módulos 02/04/15 para drill-down y tiempos; comparte el contrato de exportación con 15 y 16.
- **Pendiente (gap R5 ↔ esquema):** «lista de espera» de RF-R5-121 no existe en `mv_reservas_diarias`; opciones: nueva vista/columna o declarar el requisito fuera del MVP. **Supuesto** de trabajo: se implementa sin lista de espera hasta definirla.
- **Pendiente:** metadato de la última actualización de `analytics`; límite real de exportación; si caja (efectivo vs. otros medios) y `mv_ventas_diarias` (total del pedido) deben cuadrar al centavo, acordar la conciliación.
- Preguntas de R5 §14 que lo afectan: envío de programados y retención de sus registros; formatos de moneda y zona por sede (RNF-R5-08).
