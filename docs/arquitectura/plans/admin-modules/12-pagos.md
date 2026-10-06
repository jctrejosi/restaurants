# 12 — Pagos y propinas

**Ruta:** `/pagos` · **Prioridad:** MVP; RF-R5-75 (liquidación de propinas) es **V1** · **RF:** 71 y 75
**Referencias:** [índice](./00-indice.md) · [plan 05 §6.15](../front/05-plan-panel-administracion.md) · [R5 §4.8](../../requerimientos/05-panel-administracion.md) · esquema [01 — núcleo](../../esquema/01-nucleo.md) y [03 — pedidos y dinero](../../esquema/03-pedidos-y-dinero.md).

## 1. Contexto y alcance

Lista y detalle de los pagos del negocio con su desglose **por pedido y por medio**, incluidos
propinas y descuentos (RF-R5-71), la conciliación con reembolsos y notas crédito y, en V1, la
**liquidación de propinas por período** exportable para el reparto que decida el local (RF-R5-75).

**Queda fuera:**
- Arqueo, cierre de turno y consolidado del día → [11-caja-turnos](./11-caja-turnos.md).
- Consulta de facturas y notas crédito → [13-facturacion](./13-facturacion.md) (aquí solo se enlaza).
- Liquidación de repartidores de domicilio (`liquidacion_repartidor`) → [09-domicilio](./09-domicilio.md).
- Cobro en sí (caja/web/mesero): esta pantalla es de consulta y reembolso, no de captura de pagos.

Depende de Pedidos (`pago.pedido_id`) y de Caja (`pago` del turno alimenta el arqueo).

## 2. Requisitos cubiertos

| ID | Requisito | Prioridad | Criterio de aceptación (R5) |
|---|---|---|---|
| RF-R5-71 | Ver pagos, medios, propinas y descuentos del turno | MVP | Detalle por pedido y por medio |
| RF-R5-75 | Liquidación de propinas por período | V1 | Se exporta para el reparto que decida el local |

Reglas aplicables: RN-R5-06 (reembolsar exige permiso específico), RN-R5-01/02 (auditoría con
antes/después e inmutable), RN-R5-07 (enmascarar datos personales para roles que no los necesitan),
RN-R5-10 (exportaciones registradas) y RNF-R5-08 (zona de la sede).

## 3. Rutas y pantallas

`/pagos` única ruta, con pestañas:

- **Pagos**: `DataTable` de pagos de la sede activa con filtros por turno, medio, cajero
  (`pago.usuario_id`), rango de fechas, estado y pedido. Columnas: fecha/hora, pedido (código,
  enlace), medio, monto, propina, descuento del pedido, estado y cajero. Totales del filtro.
  El detalle se abre en `DetailDrawer` (`/pagos?pago=:id`): pedido → líneas (`pago_linea` →
  `pedido_linea`), medio y `referencia`, propina, descuentos (`ajuste_pedido`), factura vinculada
  con su estado/nota crédito y acciones.
- **Propinas** (V1): período desde/hasta; totales por día, turno, medio y usuario; botón
  **Exportar liquidación**. El reparto final lo decide el local (RF-R5-75): el panel entrega el
  consolidado exportable, no reparte.
- **Conciliación**: pagos reembolsados, su pedido y el documento fiscal relacionado, con enlaces a
  [13-facturacion](./13-facturacion.md). (Supuesto: puede resolverse como un filtro de la lista si el
  volumen es bajo.)

Acción **Reembolsar** en el detalle, solo para pagos `aprobado`: `ConfirmDialog` con el **máximo
reembolsable visible** + `ReasonSelect` (motivo) + autorización PIN/2FA según política (R5 §14 #2).

## 4. Datos

| Tabla | Campos clave | Uso |
|---|---|---|
| `pago` | `pedido_id` / `reserva_id` (uno y solo uno, `ck_pago_origen`), `medio_pago_id`, `monto_centavos`, `propina_centavos`, `referencia`, `estado` (`pendiente`/`aprobado`/`rechazado`/`reembolsado`), `pasarela_payload`, `usuario_id`, `creado_en`, `aprobado_en`, `reembolsado_en` | Entidad central de la lista y el detalle |
| `pago_linea` | `pago_id`, `pedido_linea_id`, `monto_centavos` | Aplicación del pago a las líneas del pedido |
| `medio_pago` | `nombre`, `tipo`, `requiere_referencia`, `activo` | Filtro y detalle por medio |
| `pedido` | `codigo`, `turno_id`, `estado`, `descuentos_centavos`, `propina_centavos`, `total_centavos` | Contexto por pedido y vínculo con el turno |
| `pedido_linea` | `nombre_snapshot`, `cantidad`, `precio_snapshot_centavos` | Detalle por pedido (RN-R5-04: snapshot) |
| `ajuste_pedido` | `tipo` (`descuento`/`cortesia`/`recargo`), `valor_centavos`, `porcentaje`, `motivo`, `usuario_id` | Descuentos y recargos mostrados con el pago |
| `turno`, `cierre_caja` | `numero`, `estado`, `cierre_caja.propinas_centavos` | Contexto y conciliación con el arqueo |
| `factura` | `pedido_id`, `estado_dian`, `total_centavos` | Enlace a factura y nota crédito (doc 13) |
| `liquidacion_repartidor` | `repartidor_id`, `periodo_desde/hasta`, `propinas_centavos` | Referencia para domicilio; fuera de alcance |
| `evento_auditoria`, `bitacora_evento` | ver §7 | Reembolsos y accesos sensibles |
| `exportacion` | `usuario_id`, `tipo`, `filtros`, `formato`, `estado`, `url` | Liquidación de propinas y export de pagos |

Notas: `estado = 'reembolsado'` + `reembolsado_en` marcan el reembolso; hoy no hay columna de monto
reembolsado → **Supuesto**: V1 asume reembolso total por pago y el monto máximo es
`pago.monto_centavos`; los reembolsos parciales requieren migración (§11). Los pagos de señas de
reserva (`reserva_id`) se listan con el mismo tratamiento.

## 5. API propuesta

Prefijo `/admin`; listas `{ data, total, page, pageSize }` (índice §4.1).

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/admin/pagos` | Lista paginada (turno, medio, cajero, estado, fechas, pedido) con totales |
| GET | `/admin/pagos/:id` | Detalle: pago, líneas, pedido, propina, descuentos y factura vinculada |
| POST | `/admin/pagos/:id/reembolsar` | Reembolsar con `motivo`; `Idempotency-Key`; valida máximo y estado |
| GET | `/admin/pagos/resumen` | Totales por turno/rango: por medio, propinas y descuentos (alimenta Caja) |
| GET | `/admin/pagos/propinas` | V1: liquidación por período agrupada por día, turno, medio y usuario |
| POST | `/admin/pagos/exportaciones` | Exportar (`tipo: 'pagos'|'propinas'`, `filtros`, `formato`); crea `exportacion` |

Errores: estado no reembolsable (ya `reembolsado`/`rechazado`) → **409**; monto mayor al pago →
**422** con `{ maximo_centavos }` (R5 §13: «se rechaza»); todo reintento es idempotente.

**Socket.IO** (namespace `/admin`, room `sucursal:{sucursalId}`): emite `pago.estado` en pasado con
`{ pagoId, pedidoId, accion: 'creado'|'aprobado'|'rechazado'|'reembolsado' }`; lo consumen esta
pantalla y Caja. Al reconectar, refetch completo del segmento.

## 6. Frontend

- Módulo `modules/pagos/`: `api.ts`, `types.ts`, `pages/PagosListPage.tsx`, componentes
  `PagoDetailDrawer`, `ReembolsoDialog`, `PropinasTab`, `ConciliacionTab`, `TotalesFooter`.
- Compartidos: `DataTable`, `FilterBar`, `MoneyCell`, `StatusBadge`, `DetailDrawer`,
  `ConfirmDialog`, `ReasonSelect`, `ExportButton`, `EmptyState`/`Skeleton`/`ErrorState`.
- El reembolso muestra el máximo permitido antes de confirmar y no permite escribir un monto mayor;
  el error del servidor se refleja en el diálogo con su causa.
- Filtros, pestaña y pago abierto viven en la URL (compartible / vista guardada).
- Datos personales del pedido enmascarados cuando el rol no los necesita (RN-R5-07).
- Copy en español; sin permiso, acciones ausentes o con tooltip «Requiere permiso de {permiso}».

## 7. Permisos y trazabilidad

| Permiso | Cubre |
|---|---|
| `pagos.ver` | Lista, detalle, totales y conciliación |
| `pagos.reembolsar` | Reembolso (permiso específico, RN-R5-06) |
| `pagos.propinas` | V1: consulta de la liquidación de propinas |
| `pagos.exportar` | Exportaciones de pagos y propinas |

Se audita en `evento_auditoria` (actor, dispositivo, IP, antes/después, `motivo`) y en
`bitacora_evento` con `entidad_tipo = 'pago'`:
- reembolso: monto, estado anterior/nuevo, pedido, autorización y motivo;
- exportación de liquidación: registro en `exportacion` + evento (RN-R5-10);
- **Supuesto**: la consulta de la liquidación de propinas registra acceso (RNF-R5-09), por tratarse
  de información sensible de personas.

Nada de lo auditado se puede editar ni borrar desde la UI (RN-R5-02).

## 8. Estados y casos borde

- **Vacío**: «Aún no hay pagos con estos filtros» + limpiar filtros; propinas sin datos en el período, explicado.
- **Cargando**: `Skeleton` en filas y tarjetas. **Error**: causa + «Reintentar».
- **Sin permisos**: `pagos.reembolsar` ausente → botón deshabilitado con tooltip; sin `pagos.ver`, ruta protegida.
- **Reembolso mayor al pago** (R5 §13): se rechaza con el máximo visible; el pago no cambia.
- **Reembolso duplicado o de pago no aprobado**: 409; la idempotencia evita dobles registros por reintento de red.
- **Pago por pasarela**: el reverso puede depender del proveedor; si falla, el error queda visible y el pago no se marca reembolsado (Supuesto).
- **Propinas**: los pagos `rechazado` no suman; **Supuesto**: un pago reembolsado deja de contar su propina (confirmar con el cliente).
- **Zona horaria de sede ≠ administrador**: fechas en la zona de la sede (RNF-R5-08).
- **Exportación muy grande**: segundo plano con aviso (`exportacion.estado`).

## 9. Criterios de aceptación

- **CA-12-01 (RF-R5-71)**: desde un pago se ven su pedido, líneas, medio, propina y descuentos, con detalle por pedido y por medio en lista y drawer.
- **CA-12-02 (RF-R5-71)**: los totales del filtro por turno coinciden con el esperado del arqueo (`GET /admin/caja/turnos/:id/esperado`).
- **CA-12-03 (R5 §13)**: un reembolso mayor a `pago.monto_centavos` se rechaza indicando el máximo y no altera el pago.
- **CA-12-04 (RN-R5-06)**: un reembolso válido deja el pago en `reembolsado`, con `reembolsado_en` y evento de auditoría con motivo.
- **CA-12-05 (RF-R5-75)**: la liquidación del período suma las propinas de los pagos aprobados, es exportable (CSV/XLSX) y crea fila en `exportacion`.
- **CA-12-06**: sin `pagos.reembolsar` la acción no está disponible y nunca se ejecuta en el backend (403).

## 10. Plan de trabajo

**F1 — API/datos**
- [ ] Módulo NestJS `pagos`: DTOs, repositorios Drizzle y consulta con totales.
- [ ] Detalle por pedido/medio con `pago_linea`, `pedido_linea` y `ajuste_pedido`.
- [ ] Reembolso transaccional con validación de estado/monto, `Idempotency-Key` y auditoría.
- [ ] V1: agregación de propinas por período (día/turno/medio/usuario).

**F2 — lectura/lista**
- [ ] `GET /admin/pagos` con filtros, paginación y totales; `GET /admin/pagos/:id`.
- [ ] `/pagos` pestaña Pagos con estados vacío/cargando/error/sin permisos.
- [ ] Filtros en URL y montos con `MoneyCell` por moneda de la sede.

**F3 — detalle/acciones**
- [ ] `PagoDetailDrawer` con pedido, líneas, propina, descuentos y factura.
- [ ] `ReembolsoDialog` con máximo visible, motivo y autorización.
- [ ] `ConciliacionTab` con enlaces a pedido y factura/nota crédito.

**F4 — en vivo/exportación**
- [ ] Suscripción a `pago.estado` y refetch al reconectar.
- [ ] V1: exportación de la liquidación de propinas con registro en `exportacion`.

**F5 — pruebas**
- [ ] Totales contra el cierre de caja del turno (integración).
- [ ] Reembolso: límite, duplicado, idempotencia y auditoría (e2e).
- [ ] Liquidación de propinas con pagos reembolsados y rango vacío.

## 11. Dependencias y pendientes

- Fase 0, [02-pedidos](./02-pedidos.md) y [11-caja-turnos](./11-caja-turnos.md); [13-facturacion](./13-facturacion.md) para notas crédito.
- Preguntas de R5 §14 que afectan: #2 (2FA en V1 para reembolsar), #6 (exportación para contabilidad), #3 (retención de auditoría).
- Supuestos a confirmar: reembolso total por pago (sin columna de monto reembolsado); efecto del reembolso en propinas del turno y de la liquidación; si la liquidación debe discriminar por mesero/repartidor o solo por cajero; alcance de la consulta de propinas por rol.
- Si se necesitan reembolsos parciales o trazabilidad fina del reverso, planificar migración de `pago` (monto reembolsado/estado por reverso) antes de implementar V1.
