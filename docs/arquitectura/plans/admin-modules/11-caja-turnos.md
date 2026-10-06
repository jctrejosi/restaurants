# 11 — Caja y turnos

**Rutas:** `/caja`, `/caja/:turnoId` · **Prioridad:** MVP; RF-R5-72 (reapertura) y RF-R5-75 (liquidación de propinas) son **V1** · **RF:** 70–75
**Referencias:** [índice](./00-indice.md) · [plan 05 §6.14](../front/05-plan-panel-administracion.md) · [R5 §4.8](../../requerimientos/05-panel-administracion.md) · esquema [01 — núcleo](../../esquema/01-nucleo.md) y [03 — pedidos y dinero](../../esquema/03-pedidos-y-dinero.md).

## 1. Contexto y alcance

Resuelve la operación diaria de caja: abrir turno, seguir sus pagos y propinas, arquear y cerrar con
diferencias explicadas, consultar el reporte de cierre por turno y el consolidado del día y (V1)
reabrir un turno con permiso, motivo y rastro. También configura los medios de pago de la sede.

**Queda fuera:**
- La lista/detalle de pagos, los reembolsos y la liquidación de propinas por período →
  [12-pagos](./12-pagos.md). RF-R5-71 y 75 se comparten: aquí se ve el resumen del turno y se enlaza al detalle.
- Emisión y consulta de facturas → [13-facturacion](./13-facturacion.md).
- Reportes históricos de ventas → [14-reportes](./14-reportes.md).

Depende de Pedidos (`pedido.turno_id` enlaza cada pedido con su turno) y de Pagos (`pago` alimenta el
esperado del arqueo).

## 2. Requisitos cubiertos

| ID | Requisito | Prioridad | Criterio de aceptación (R5) |
|---|---|---|---|
| RF-R5-70 | Abrir y cerrar turnos; arqueo y diferencias | MVP | El cierre cuadra con los pagos del turno |
| RF-R5-71 | Ver pagos, medios, propinas y descuentos del turno | MVP | Detalle por pedido y por medio (se comparte con [12](./12-pagos.md)) |
| RF-R5-72 | Reapertura con permiso y auditoría | V1 | Queda registrada con motivo |
| RF-R5-73 | Configurar medios de pago por sede | MVP | Un medio deshabilitado no se ofrece |
| RF-R5-74 | Reporte de cierre por turno y consolidado del día | MVP | Incluye propinas y descuentos |
| RF-R5-75 | Liquidación de propinas por período | V1 | Exportable para el reparto que decida el local (pantalla en [12](./12-pagos.md)) |

Reglas aplicables: RN-R5-06 (reabrir exige permiso específico), RN-R5-12 (un turno cerrado no se
modifica sin reapertura auditada), RN-R5-01/02 (auditoría con antes/después e inmutable), RN-R5-10
(exportaciones registradas) y RNF-R5-08 (zona de la sede).

## 3. Rutas y pantallas

**`/caja` — turnos y configuración**
- Pestaña **Turnos**: `DataTable` con los turnos de la sede activa; columnas: número, apertura/cierre
  (zona de la sede), usuario de apertura/cierre, ventas, propinas, contado, diferencia, estado.
  Filtros por estado y rango de fechas; orden por `abierto_en` descendente por defecto.
- Acción primaria **Abrir turno** (base inicial en efectivo). Si ya hay un turno abierto en la sede,
  se muestra como banner y la acción queda deshabilitada. (Supuesto: un solo turno abierto por sede.)
- Pestaña **Consolidado del día**: fecha seleccionable; ventas por medio, propinas, descuentos y
  diferencias de los turnos del día; botón **Exportar**.
- Pestaña **Medios de pago**: alta/edición por sede (nombre, tipo, `requiere_referencia`, `activo`).
  Desactivar un medio no altera los pagos ya registrados.

**`/caja/:turnoId` — panel del turno** (pestañas)
- **Resumen**: cabecera con estado y horas; tarjetas de venta por medio (solo `pago` aprobados),
  propinas y descuentos; tabla de pedidos del turno (`pedido.turno_id`) marcando los **pendientes**
  (ni `pagado` ni `cancelado`); enlaces al pedido y a `/pagos?turno=…`.
- **Arqueo y cierre**: base inicial, contado por medio (efectivo obligatorio), retiros, gastos y
  observaciones; diferencia calculada en vivo contra el esperado; advertencia con el detalle de los
  pedidos abiertos.
- **Reporte**: vista imprimible del cierre (totales, arqueo, diferencia, propinas y descuentos) con
  **Exportar** a CSV/XLSX/PDF.
- V1: acción **Reabrir turno** sobre turnos cerrados, con motivo obligatorio.

## 4. Datos

| Tabla | Campos clave | Uso |
|---|---|---|
| `turno` | `sucursal_id`, `numero`, `estado` (`abierto`/`cerrado`), `abierto_en`, `cerrado_en`, `usuario_apertura_id`, `usuario_cierre_id`; `uq_turno (sucursal_id, numero)` | Entidad central; índice parcial `ix_turno_abierto` |
| `cierre_caja` | `turno_id` (único), `base_inicial_centavos`, `ventas_efectivo_centavos`, `ventas_otros_centavos`, `propinas_centavos`, `retiros_centavos`, `gastos_centavos`, `contado_centavos`, `diferencia_centavos`, `observaciones`, `reabierto_por`, `reabierto_en` | Arqueo y cierre; la reapertura conserva `reabierto_por`/`reabierto_en` como rastro |
| `pago`, `pago_linea` | `pedido_id`, `medio_pago_id`, `monto_centavos`, `propina_centavos`, `estado`, `creado_en`/`aprobado_en`, `pedido_linea_id` | Esperado del arqueo (solo `aprobado`) y detalle por pedido/medio |
| `medio_pago` | `sucursal_id`, `nombre`, `tipo`, `requiere_referencia`, `activo`; `uq_medio_pago (sucursal_id, nombre)` | RF-R5-73 |
| `pedido` | `turno_id`, `estado`, `total_centavos`, `descuentos_centavos`, `propina_centavos` | Pedidos del turno y pendientes de cobro |
| `ajuste_pedido` | `pedido_id`, `tipo` (`descuento`/`cortesia`/`recargo`), `valor_centavos`, `porcentaje`, `motivo`, `usuario_id` | Descuentos del consolidado |
| `sucursal`, `configuracion_sucursal` | `zona_horaria`, `moneda`, `comportamiento_offline` | Formato y contexto |
| `evento_auditoria`, `bitacora_evento` | ver §7 | Apertura, cierre, reapertura y cambios de medios |
| `exportacion` | `usuario_id`, `tipo`, `filtros`, `formato`, `estado`, `url` | Reportes exportados |
| `alerta_operativa` | `tipo`, `severidad`, `estado` | Supuesto: diferencias sobre el umbral generan alerta; hoy no hay tipo específico de caja (se decide con el cliente) |

Notas: el cierre vigente vive en `cierre_caja`; la reapertura **no borra** el cierre, habilita su
recalculo y deja rastro. Los importes se guardan en centavos y se pintan en la moneda de `sucursal`.

## 5. API propuesta

Prefijo `/admin`; listas `{ data, total, page, pageSize }` (índice §4.1).

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/admin/caja/turnos` | Lista paginada de turnos (sede, estado, fechas; `orden`) |
| POST | `/admin/caja/turnos` | Abrir turno (base inicial); 409 si ya hay uno abierto |
| GET | `/admin/caja/turnos/:id` | Panel: turno, cierre, totales, pedidos y pendientes |
| GET | `/admin/caja/turnos/:id/esperado` | Esperado por medio: pagos aprobados, propinas, descuentos y pendientes |
| POST | `/admin/caja/turnos/:id/cierre` | Cerrar con base, contado, retiros, gastos y observaciones; devuelve la diferencia |
| POST | `/admin/caja/turnos/:id/reabrir` | V1: reabrir con `motivo`; `Idempotency-Key` (RN-R5-06) |
| GET | `/admin/caja/turnos/:id/reporte` | Reporte de cierre del turno |
| GET | `/admin/caja/consolidado-dia` | Consolidado del día (`fecha`), con propinas y descuentos |
| GET/POST | `/admin/caja/medios-pago` | Listar / crear medios de la sede |
| PATCH | `/admin/caja/medios-pago/:id` | Editar (incluye `activo`) |
| POST | `/admin/caja/exportaciones` | Exportar reporte (`tipo`, `filtros`, `formato`); crea `exportacion` |

Cierre con pedidos abiertos: el POST responde **409** con `{ pendientes: [{ codigo, estado, total_centavos }] }`.
Supuesto: puede forzarse con `confirmar_pendientes: true` + `motivo` y queda auditado; el cliente
confirma si prefiere impedirlo siempre.

**Socket.IO** (namespace `/admin`, room `sucursal:{sucursalId}`): emite `caja.turno` en pasado con
`{ turnoId, accion: 'abierto'|'cerrado'|'reaperturado', estado }`. La pantalla se refresca además al
recibir los `pago.*` del turno (definidos en [12](./12-pagos.md)). Al reconectar, refetch completo.

## 6. Frontend

- Módulo `modules/caja/`: `api.ts` (hooks react-query), `types.ts`, `pages/TurnosListPage.tsx` y
  `pages/TurnoDetailPage.tsx`; componentes `ArqueoPanel`, `CierreDialog`, `ReabrirDialog`,
  `MedioPagoForm`, `PendientesPedidosTable`, `ReporteCierre`.
- Compartidos: `DataTable`, `FilterBar`, `MoneyCell`, `StatusBadge`, `Timeline`,
  `ConfirmDialog`, `ReasonSelect`, `ExportButton`, `EmptyState`/`Skeleton`/`ErrorState`.
- El arqueo muestra **esperado vs. contado** por medio y la diferencia con semáforo (0 = cuadra,
  tolerancia = aviso, mayor = error) y tooltip con la fórmula del backend (índice §4.5).
- Pestaña activa y filtros viven en la URL (compartible / vista guardada).
- Copy en español y estados explicados; sin permiso, acciones ausentes o con tooltip
  «Requiere permiso de {permiso}» (plan 05 §6.23).

## 7. Permisos y trazabilidad

| Permiso | Cubre |
|---|---|
| `caja.ver` | Lista, panel, consolidado y reportes |
| `caja.abrir` | Abrir turno |
| `caja.cerrar` | Cerrar turno (incluida la confirmación con pendientes) |
| `caja.reabrir` | V1: reabrir turno cerrado (permiso específico, RN-R5-06) |
| `caja.medios` | Alta/edición de medios de pago |
| `caja.exportar` | Exportaciones |

Se audita en `evento_auditoria` (actor, dispositivo, IP, antes/después y `motivo` cuando aplica) y en
`bitacora_evento` con `entidad_tipo = 'turno'` y eventos `abierto`, `cerrado`, `reaperturado`:
- apertura y cierre (totales, contado, diferencia, observaciones y motivo si se forzó con pendientes);
- reapertura (motivo obligatorio; campos previos de `estado`, `reabierto_por`, `reabierto_en`);
- cambios de medio de pago (antes/después);
- exportaciones: registro en `exportacion` + evento con usuario y filtros (RN-R5-10).

Ningún endpoint edita o borra cierres ni bitácoras (RN-R5-02).

## 8. Estados y casos borde

- **Vacío**: sin turnos en el rango → «Aún no hay turnos» + **Abrir turno**; sin turno abierto → banner con la misma acción.
- **Cargando**: `Skeleton` en tarjetas y tabla. **Error**: causa + «Reintentar».
- **Sin permisos**: ítem deshabilitado en el sidebar con explicación; acciones por botón con tooltip; el backend responde 403.
- **Cierre con pedidos abiertos** (R5 §13): 409 con el detalle; no se cierra hasta resolverlos o confirmar con motivo.
- **Reapertura** (R5 §13): exige `caja.reabrir` + motivo y deja rastro; se rechaza si el turno no está cerrado o ya hay uno abierto en la sede.
- **Doble cierre / doble apertura**: 409; `Idempotency-Key` evita duplicados por reintento de red.
- **Diferencia ≠ 0**: se exigen `observaciones` al cerrar (Supuesto); por encima del umbral configurado se emite alerta al shell.
- **Zona horaria de sede ≠ administrador**: fechas y horas en la zona de la sede (RNF-R5-08).
- **Exportación muy grande**: segundo plano con aviso al solicitante (`exportacion.estado`).

## 9. Criterios de aceptación

- **CA-11-01 (RF-R5-70)**: al cerrar el turno, ventas y propinas del `cierre_caja` cuadran con los `pago` aprobados del turno; la diferencia guardada = contado − esperado.
- **CA-11-02 (R5 §13)**: con pedidos del turno no pagados/cancelados, el cierre responde 409 con el detalle y no persiste `cierre_caja`.
- **CA-11-03 (RF-R5-72, RN-R5-12)**: reabrir exige `caja.reabrir` + motivo, genera evento con antes/después y deja el turno en `abierto`; sin reapertura ningún endpoint modifica un turno cerrado.
- **CA-11-04 (RF-R5-73)**: un medio con `activo = false` no se ofrece en las interfaces de cobro y sigue visible en pagos históricos.
- **CA-11-05 (RF-R5-74)**: el reporte de turno y el consolidado del día incluyen propinas y descuentos y son exportables.
- **CA-11-06 (RN-R5-10)**: toda exportación crea fila en `exportacion` con usuario, tipo, filtros y formato.
- **CA-11-07**: importes y horas se muestran en la moneda y la zona de la sede.

## 10. Plan de trabajo

**F1 — API/datos**
- [ ] Módulo NestJS `caja` con DTOs validados y repositorios Drizzle sobre §4.
- [ ] ABM de turnos y medios; cálculo del esperado por medio (`pago`/`pago_linea`).
- [ ] Cierre transaccional con validación de pendientes (409 + detalle) y diferencia calculada en servidor.
- [ ] Reapertura V1 con motivo, permiso e `Idempotency-Key`; auditoría y bitácora.

**F2 — lectura/lista**
- [ ] `GET` de turnos, esperado, consolidado y reporte; filtros, paginación y orden.
- [ ] `/caja` con pestañas Turnos, Consolidado y Medios de pago; vacío/error/sin permisos.
- [ ] Fechas y moneda por sede (`lib/format.ts`).

**F3 — detalle/acciones**
- [ ] `/caja/:turnoId` con Resumen, Arqueo y cierre y Reporte.
- [ ] `CierreDialog` y (V1) `ReabrirDialog` con `ConfirmDialog` + `ReasonSelect`.
- [ ] Lista de pendientes enlazada a los pedidos.

**F4 — en vivo/exportación**
- [ ] Suscripción a `caja.turno` y refetch al reconectar.
- [ ] Exportación de reportes con registro en `exportacion`; segundo plano si el volumen es alto.

**F5 — pruebas**
- [ ] Cuadre del cierre contra pagos (unitarias + integración).
- [ ] Cierre con pendientes, reapertura, idempotencia y auditoría (e2e).
- [ ] Medios deshabilitados y permisos por rol.

## 11. Dependencias y pendientes

- Fase 0 (router/shell/kit), [02-pedidos](./02-pedidos.md) y [12-pagos](./12-pagos.md): sin `pedido.turno_id` ni pagos reales no hay arqueo.
- Preguntas de R5 §14 que afectan: #2 (2FA en V1 para la reapertura), #3 (retención de auditoría), #4 (cierre diario por correo: candidato a exportación), #7 (consolidado multi-sucursal en V1; hoy el consolidado es por sede activa).
- Decisiones a confirmar: un solo turno abierto por sede; permitir o no el cierre forzado con pendientes; umbral de diferencia que genera alerta; turnos que cruzan medianoche.
