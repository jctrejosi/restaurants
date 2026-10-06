# 13 — Facturación

**Ruta:** `/facturacion` · **Prioridad:** V1 · **RF:** 80–82
**Referencias:** [índice](./00-indice.md) · [plan 05 §6.16](../front/05-plan-panel-administracion.md) · [R5 §4.9](../../requerimientos/05-panel-administracion.md) · esquema [01 — núcleo](../../esquema/01-nucleo.md), [03 — pedidos y dinero](../../esquema/03-pedidos-y-dinero.md) y [04 — marketing y operación](../../esquema/04-marketing-y-operacion.md).

## 1. Contexto y alcance

Consulta de **facturas emitidas** con su estado y notas crédito, enlazadas con el pedido y el pago
(RF-R5-80); **configuración fiscal** de impuestos, resoluciones y prefijos, con consecutivos que
respetan la resolución (RF-R5-81); y **diagnóstico del proveedor** con reintentos y errores visibles
con su causa (RF-R5-82).

**Queda fuera:**
- La emisión en sí (ocurre en el flujo de cobro); esta pantalla consulta, configura y reintenta.
- Integración contable automática → V2 (R5 §15).
- Impresión de recibos/facturas como operación de estación → [07-estaciones](./07-estaciones.md);
  aquí solo se diagnostica su cola (`trabajo_impresion`).
- Arqueo y propinas → [11-caja-turnos](./11-caja-turnos.md) y [12-pagos](./12-pagos.md).

Depende de Pedidos (`factura.pedido_id`) y Pagos (`pago.pedido_id`) para el enlace fiscal.

## 2. Requisitos cubiertos

| ID | Requisito | Prioridad | Criterio de aceptación (R5) |
|---|---|---|---|
| RF-R5-80 | Consultar facturas emitidas, su estado y sus notas crédito | V1 | Enlaza con el pedido y el pago |
| RF-R5-81 | Configurar impuestos, resoluciones y prefijos | V1 | Los consecutivos respetan la resolución |
| RF-R5-82 | Reintentos y diagnóstico del proveedor de facturación | V1 | Un error queda visible con su causa |

Reglas aplicables: RN-R5-01/02 (auditoría con antes/después e inmutable), RN-R5-04 (los datos
fiscales de una factura emitida son snapshot: `factura_linea`, `impuestos_json`), RN-R5-05 (solo el
administrador global gestiona configuración global; el gerente, su sede) y RN-R5-10 (exportaciones
registradas).

## 3. Rutas y pantallas

`/facturacion` única ruta, con pestañas:

- **Facturas**: `DataTable` con filtros por `estado_dian`, prefijo, rango de `emitida_en`, pedido y
  resolución; columnas: número (`prefijo` + `numero`), pedido (código, enlace), total, impuestos,
  estado, `emitida_en` y CUFE/resolución. Detalle en `DetailDrawer` (`/facturacion?factura=:id`):
  líneas (`factura_linea`), impuestos (`impuestos_json`), vínculo con pedido y con sus pagos
  (`pago.pedido_id`), XML/PDF, `Timeline` de estados y reintentos, notas crédito relacionadas y
  acción **Reintentar** cuando el estado lo permite.
- **Configuración fiscal**: impuestos (`impuesto`), consecutivos (`consecutivo`) por sede/tipo/prefijo
  con `resolucion` y `vigencia_hasta`, y `copias_factura` de `configuracion_sucursal`; avisos de
  vigencia próxima a vencer. Solo admin global o gerente de su sede (RN-R5-05).
- **Diagnóstico**: estado del proveedor con facturas pendientes/enviadas por antigüedad, últimos
  errores con causa y reintentos por factura; bloque aparte para la cola de impresión
  (`trabajo_impresion`, tipos `factura`/`recibo`) con `intentos` y `ultimo_error`.

## 4. Datos

| Tabla | Campos clave | Uso |
|---|---|---|
| `factura` | `sucursal_id`, `pedido_id`, `numero`, `prefijo`, `resolucion`, `cufe`, `estado_dian` (`pendiente`/`enviada`/`aceptada`/`rechazada`/`anulada`), `xml_url`, `pdf_url`, `total_centavos`, `impuestos_json`, `emitida_en`; `uq_factura_numero (sucursal_id, prefijo, numero)` | Entidad central; número único por sede/prefijo |
| `factura_linea` | `factura_id`, `descripcion`, `cantidad`, `precio_centavos`, `impuesto_id`, `total_centavos` | Detalle fiscal congelado (snapshot) |
| `impuesto` | `tenant_id`, `nombre`, `tasa_bps` (1900 = 19 %), `tipo` (`incluido`/`adicionado`/`inc`), `activo` | Configuración fiscal |
| `consecutivo` | `sucursal_id`, `tipo` (`pedido`/`comanda`/`factura`), `prefijo`, `siguiente`, `resolucion`, `vigencia_hasta`; `uq_consecutivo (sucursal_id, tipo, prefijo)` | Numeración por resolución/prefijo |
| `pedido` | `codigo`, `sucursal_id`, `turno_id`, `total_centavos` | Enlace con el pedido |
| `pago` | `pedido_id`, `medio_pago_id`, `monto_centavos`, `estado` | Enlace con el pago (a través del pedido) |
| `sucursal`, `configuracion_sucursal` | `zona_horaria`, `moneda`, `copias_factura` | Contexto y copias |
| `trabajo_impresion` | `factura_id`, `impresora_id`, `tipo` (`comanda`/`precuenta`/`recibo`/`factura`), `estado`, `intentos`, `ultimo_error` | Cola de impresión de facturas |
| `evento_auditoria` | ver §7 | Configuración, reintentos y anulaciones |
| `alerta_operativa` | `tipo`, `severidad`, `estado` | Supuesto: fallos del proveedor generan alerta; el catálogo de `tipo` no incluye facturación y habría que ampliarlo (pendiente) |
| `exportacion` | `usuario_id`, `tipo`, `filtros`, `formato`, `estado`, `url` | Exportes fiscales |

Notas de modelo (Supuestos a confirmar, §11):
- **Notas crédito**: no hay tabla propia; se muestran como factura relacionada al mismo `pedido_id`
  con `estado_dian = 'anulada'` y su `pdf_url`/`xml_url`.
- **Reintentos del proveedor**: `factura` no tiene columnas de intentos ni último error; se registran
  en `evento_auditoria` (entidad `factura`, acción `reintento_proveedor`) y el contador se deriva de
  allí hasta que se defina una tabla de intentos.
- **`bitacora_evento`** solo admite `entidad_tipo` reserva/pedido/comanda/pago/turno: los eventos de
  factura van a `evento_auditoria` mientras no se amplíe el CHECK.

## 5. API propuesta

Prefijo `/admin`; listas `{ data, total, page, pageSize }` (índice §4.1).

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/admin/facturacion/facturas` | Lista paginada (estado, prefijo, fechas, pedido, resolución) |
| GET | `/admin/facturacion/facturas/:id` | Detalle: líneas, impuestos, pedido/pagos, XML/PDF, notas crédito y reintentos |
| POST | `/admin/facturacion/facturas/:id/reintentar` | Reenviar al proveedor; `Idempotency-Key`; auditado |
| GET | `/admin/facturacion/diagnostico` | Estado del proveedor: pendientes por antigüedad, errores con causa y reintentos |
| GET/POST | `/admin/facturacion/impuestos` | Listar / crear impuestos |
| PATCH | `/admin/facturacion/impuestos/:id` | Editar (tasa, tipo, `activo`) con antes/después |
| GET/POST | `/admin/facturacion/consecutivos` | Listar / crear consecutivos por sede, tipo y prefijo |
| PATCH | `/admin/facturacion/consecutivos/:id` | Editar prefijo/resolución/vigencia; `siguiente` solo avanza al emitir |
| POST | `/admin/facturacion/exportaciones` | Exportar facturas o reporte fiscal; crea `exportacion` |

Validaciones: emitir con `vigencia_hasta` vencida o sin resolución → **409** (RF-R5-81); número
duplicado por `uq_factura_numero` → **409**, nunca se reasigna; factura no reintentable por estado →
**409**. Supuesto: el panel no permite bajar `siguiente`; ajustes excepcionales exigen
`facturacion.configurar` + motivo + auditoría.

**Socket.IO** (namespace `/admin`, room `sucursal:{sucursalId}`): emite `factura.estado` en pasado con
`{ facturaId, pedidoId, estado }` al pasar a `enviada`/`aceptada`/`rechazada`/`anulada`; los fallos
del proveedor se reflejan como `alerta.creada` (Supuesto). Al reconectar, refetch completo.

## 6. Frontend

- Módulo `modules/facturacion/`: `api.ts`, `types.ts`, `pages/FacturasListPage.tsx`,
  `pages/FiscalSettingsPage.tsx`, `pages/ProviderDiagnosticPage.tsx` (o pestañas dentro de una sola
  página con la ruta `/facturacion`), componentes `FacturaDetailDrawer`, `ImpuestoForm`,
  `ConsecutivoForm`, `NotasCreditoList`, `ColaImpresionFactura`.
- Compartidos: `DataTable`, `FilterBar`, `MoneyCell`, `StatusBadge`, `Timeline`, `ExportButton`,
  `ConfirmDialog`, `ReasonSelect`, `EmptyState`/`Skeleton`/`ErrorState`.
- Estados de `estado_dian` con semáforo y etiquetas en español; el error del proveedor se muestra con
  causa y fecha, sin ocultarlo (RF-R5-82).
- Aviso proactivo cuando `vigencia_hasta` está vencida o próxima a vencer (RF-R5-81).
- Copy en español; sin permiso, acciones ausentes o con tooltip «Requiere permiso de {permiso}».

## 7. Permisos y trazabilidad

| Permiso | Cubre |
|---|---|
| `facturacion.ver` | Lista, detalle, configuración y diagnóstico |
| `facturacion.reintentar` | Reintento manual ante el proveedor |
| `facturacion.configurar` | Impuestos, consecutivos, resoluciones y prefijos (RN-R5-05) |
| `facturacion.notas` | V1: anulación/nota crédito (Supuesto: acción sensible con motivo y autorización) |
| `facturacion.exportar` | Exportaciones fiscales |

Se audita en `evento_auditoria` (actor, dispositivo, IP, antes/después y `motivo`):
- cambios de impuestos y consecutivos (tasa, tipo, prefijo, resolución, vigencia);
- reintentos del proveedor (número de intento, resultado y causa);
- anulación/nota crédito (motivo y autorización);
- exportaciones: registro en `exportacion` + evento (RN-R5-10).

Los eventos de factura no caben hoy en `bitacora_evento` (ver §4); no se edita ni borra nada de lo
auditado (RN-R5-02).

## 8. Estados y casos borde

- **Vacío**: sin facturas en el rango → explicación y enlace a Pedidos; sin config fiscal → aviso con acción para configurarla.
- **Cargando**: `Skeleton` en lista y detalle. **Error**: causa + «Reintentar».
- **Sin permisos**: ruta protegida por `facturacion.ver`; configurar/reintentar ausentes con tooltip.
- **Factura rechazada** (RF-R5-82): causa visible y botón **Reintentar**; el error nunca se oculta.
- **Consecutivo vencido o inexistente** (RF-R5-81): se bloquea la emisión (409 desde cobro) y la configuración lo advierte.
- **Número duplicado**: `uq_factura_numero` → 409; no se reasigna ni se reutiliza un número.
- **Proveedor caído**: facturas encoladas con su antigüedad en el diagnóstico; reintento manual auditado; el backoff automático es del backend (Supuesto).
- **Factura sin XML/PDF**: «en proceso», no error.
- **Nota crédito**: visible cuando exista el documento relacionado; mientras no haya modelo explícito, ver §11.
- **Cola de impresión fallida**: `trabajo_impresion.intentos`/`ultimo_error` visibles en el diagnóstico, sin ocultar el fallo (R5 §13).
- **Zona horaria de sede ≠ administrador**: fechas en la zona de la sede (RNF-R5-08).
- **Exportación muy grande**: segundo plano con aviso (`exportacion.estado`).

## 9. Criterios de aceptación

- **CA-13-01 (RF-R5-80)**: cada factura muestra y enlaza su pedido y sus pagos (vía `pago.pedido_id`).
- **CA-13-02 (RF-R5-80)**: lista y detalle muestran `estado_dian` y las notas crédito relacionadas.
- **CA-13-03 (RF-R5-81)**: no se emite ni reintenta una factura con consecutivo vencido o fuera de la resolución/prefijo; el número emitido es único por `sucursal_id` + `prefijo` + `numero`.
- **CA-13-04 (RF-R5-82)**: un error del proveedor queda visible con su causa y su número de reintentos; el reintento manual deja rastro en auditoría.
- **CA-13-05 (RN-R5-01)**: los cambios de impuestos/consecutivos quedan auditados con antes/después y motivo.
- **CA-13-06 (RN-R5-10)**: toda exportación crea fila en `exportacion` con usuario, tipo, filtros y formato.

## 10. Plan de trabajo

**F1 — API/datos**
- [ ] Módulo NestJS `facturacion`: DTOs, consultas de facturas y detalle con líneas/impuestos.
- [ ] CRUD validado de impuestos y consecutivos con auditoría de cambios.
- [ ] Reintento contra el proveedor con `Idempotency-Key` y registro de intentos.
- [ ] Diagnóstico agregado (pendientes por antigüedad, errores, reintentos, cola de impresión).

**F2 — lectura/lista**
- [ ] `/facturacion` pestaña Facturas con filtros, paginación y estados de UI.
- [ ] `StatusBadge`/`Timeline` de `estado_dian` y avisos de vigencia.
- [ ] Fechas y montos por sede (zona y moneda).

**F3 — detalle/acciones**
- [ ] `FacturaDetailDrawer` con líneas, impuestos, enlaces a pedido/pagos, XML/PDF y notas crédito.
- [ ] `FiscalSettingsPage` (impuestos, consecutivos, `copias_factura`) con confirmación y motivo.
- [ ] Reintento con `ConfirmDialog` y causa visible del error anterior.

**F4 — en vivo/exportación**
- [ ] Suscripción a `factura.estado` y refetch al reconectar; alertas de fallo en el shell.
- [ ] Exportación fiscal con registro en `exportacion`.

**F5 — pruebas**
- [ ] Numeración: unicidad, resolución vencida y prefijos (integración).
- [ ] Reintentos: error visible, causa, contador y auditoría (e2e).
- [ ] Permisos por rol y auditoría de configuración fiscal.

## 11. Dependencias y pendientes

- Fase 0, [02-pedidos](./02-pedidos.md), [11-caja-turnos](./11-caja-turnos.md) y [12-pagos](./12-pagos.md); proveedor de facturación externo.
- Preguntas de R5 §14 que afectan: #2 (2FA en V1 para anular/notas crédito), #3 (retención de la auditoría fiscal), #6 (exportación para contabilidad).
- Pendientes de modelo a resolver con el cliente antes de F1: (a) entidad/tabla de **notas crédito**; (b) tabla o columnas de **intentos del proveedor**; (c) ampliar el CHECK de `bitacora_evento` a `factura` y el catálogo de `alerta_operativa` a fallos de facturación; (d) quién puede anular una factura y con qué autorización.
- Si el proveedor expone webhooks propios, definir su normalización hacia `factura.estado` y `alerta.creada`.
