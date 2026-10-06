# 07 — Estaciones e impresoras

**Módulo:** Estaciones e impresoras · **Bloque:** Negocio · **Ruta:** `/estaciones`.
**Prioridad:** MVP (RF-R5-30…32), V1 (RF-R5-33, RF-R5-34).

Fuentes: [plan 05 §6.10](../front/05-plan-panel-administracion.md),
[R5 §4.4, §7 y §13](../../requerimientos/05-panel-administracion.md),
[esquema 01 §1.2](../../esquema/01-nucleo.md), [esquema 02 §2.3](../../esquema/02-catalogo-salon-reservas.md) y
[esquema 04 §4.5](../../esquema/04-marketing-y-operacion.md); convenciones en [00-indice.md](./00-indice.md).

## 1. Contexto y alcance

Resuelve la configuración de cocina: estaciones de preparación/despacho con productos asignados
(RF-R5-30); impresoras y la matriz impresora × documento × copias (RF-R5-31); SLA por estación y
por producto que alimenta las alertas del KDS y los reportes de tiempos (RF-R5-32); prueba de
impresión y diagnóstico (RF-R5-33, V1); y el paso a «lista» automático o explícito (RF-R5-34, V1).

- **MVP:** CRUD de estaciones con asignación de productos y SLA objetivo; CRUD de impresoras y
  matriz de rutas con copias por documento; SLA por estación y producto con validación de rangos.
- **V1:** prueba de impresión y diagnóstico visible para soporte; configuración del paso a lista.
- **Fuera de alcance:** la interfaz del KDS, la ejecución de impresión en el dispositivo, las
  copias globales de la sede (módulo 19) y el diseño de plantillas ESC/POS.

**Supuestos (a confirmar en §11):**
- La matriz impresora × documento × copias **no tiene tabla dedicada** en el esquema actual (solo
  `impresora` y `configuracion_sucursal.copias_comanda/copias_factura`); Supuesto: migración con
  `ruta_impresion` (`sucursal_id`, `documento ∈ comanda/precuenta/recibo/factura`, `impresora_id`,
  `copias 1..5`).
- El paso a lista (automático/explícito) se configura por estación en una columna nueva de
  `estacion`; el KDS la lee.
- Si coexisten SLA de producto y de estación, prevalece el de producto.
- El «ticket» del brief equivale al documento `recibo` de `trabajo_impresion`.

## 2. Requisitos cubiertos

| ID | Requisito | Prioridad | Criterio de aceptación (R5) |
|---|---|---|---|
| RF-R5-30 | CRUD de estaciones y asignación de productos | MVP | Cada producto tiene estación o queda sin comanda |
| RF-R5-31 | CRUD de impresoras, rutas y copias por documento | MVP | Las copias respetan la configuración |
| RF-R5-32 | SLA por estación y por producto | MVP | Se usa para alertas y reportes de tiempos |
| RF-R5-33 | Prueba de impresión y diagnóstico desde el panel | V1 | El resultado es visible para soporte |
| RF-R5-34 | Configurar el paso a «lista» (automático o explícito) | V1 | La regla se aplica en el KDS |

Aplican además **RNF-R5-02** (lo operativo en vivo: fallos de impresora y SLA), **RNF-R5-08**
(sellos del servidor para SLA) y, de forma indirecta, **RN-R5-04** (cambiar una estación o su SLA
no altera comandas ya creadas). El SLA alimenta `mv_sla_estacion` en `analytics` (00-indice §2).

## 3. Rutas y pantallas

Ruta única `/estaciones` con pestañas en la URL (`?tab=estaciones|impresoras|sla|diagnostico`):

| Pestaña | Pantalla | Acciones principales |
|---|---|---|
| Estaciones | Lista + `StationForm` | Crear/editar estación, tipo, sucursal, activa, SLA objetivo, asignar productos |
| Impresoras | Lista + `PrinterRoutes` | CRUD de impresoras y matriz impresora × documento × copias |
| SLA | `SlaEditor` | SLA por estación y por producto; validación y avisos |
| Diagnóstico (V1) | `PrinterDiagnostics` | Prueba de impresión, último trabajo, reintentar, alertas |

**Árbol de menú (sidebar):**

```text
Negocio
└─ Estaciones e impresoras    /estaciones
   ├─ Estaciones              /estaciones?tab=estaciones
   ├─ Impresoras y rutas      /estaciones?tab=impresoras
   ├─ SLA                     /estaciones?tab=sla
   └─ Diagnóstico             /estaciones?tab=diagnostico
```

- **Estaciones (`StationForm`, plan 05 §6.10):** nombre, tipo (preparación/despacho), sucursal,
  activa y **SLA objetivo**; productos asignados con `ProductPicker` (búsqueda y asignación
  masiva). Al guardar se avisa si hay **productos sin estación**: no generan comanda (RF-R5-30).
- **Impresoras y rutas (`PrinterRoutes`):** CRUD de impresora (nombre, `tipo_conexion`
  red/usb/bluetooth, dirección, perfil ESC/POS, activa) y **matriz impresora × documento × copias**
  con documentos `comanda`, `precuenta`, `recibo` y `factura` y copias de 1 a 5. Se señala el
  documento sin impresora activa y la impresora inactiva.
- **SLA (`SlaEditor`):** objetivo en segundos por estación y por producto; valida rangos (R4 §16)
  y avisa de SLA mal configurados, de estaciones sin SLA y de productos sin estación/SLA. Alimenta
  las alertas del KDS y los reportes de tiempos (RF-R5-32).
- **Diagnóstico (V1):** prueba de impresión por impresora con resultado visible para soporte y el
  estado de los últimos `trabajo_impresion` (pendiente/enviado/impreso/reintentando/fallido,
  `intentos`, `ultimo_error`) con reintento manual (RF-R5-33).
- **Paso a lista (V1):** por estación, **automático** (al marcar todas las líneas) o **explícito**;
  la regla se aplica en el KDS (RF-R5-34).

## 4. Datos

| Tabla | Uso | Notas |
|---|---|---|
| `estacion` | Estación de preparación/despacho | `sucursal_id`, `nombre`, `tipo`, `activa`; unique `(sucursal_id, nombre)` |
| `impresora` | Impresoras de la sede | `tipo_conexion ∈ red/usb/bluetooth`, `direccion`, `perfil`, `activa`; unique `(sucursal_id, nombre)` |
| `sucursal` | Alcance y filtro | El permiso acota las sedes visibles (RNF-R5-01) |
| `producto` | Asignación | `estacion_id` NULL o sin estación = sin comanda; se edita también desde el módulo 06 |
| `regla_sla` | SLA por estación o producto | `objetivo_seg > 0`; check XOR estación/producto |
| `trabajo_impresion` | Cola y diagnóstico | `tipo ∈ comanda/precuenta/recibo/factura`, `estado`, `intentos`, `ultimo_error`, `impreso_en` |
| `configuracion_sucursal` | Valores por defecto de la sede | `copias_comanda`/`copias_factura` (1–5) y `borrado_comanda_impresa` |
| `alerta_operativa` | Alertas de impresora/dispositivo | `tipo ∈ impresora/dispositivo/sync/sla/stock`, severidad, entidad |

**Hueco detectado:** no existe tabla de rutas de impresión ni campo de paso a lista; el plan
propone `ruta_impresion` y una columna en `estacion` como **Supuesto** (§1) a validar con el plan
de backend. Hasta entonces, la matriz puede derivarse de `configuracion_sucursal` para comanda y
factura, pero no cubre precuenta/recibo ni la asignación por impresora. Cambiar estación, rutas o
SLA no reescribe comandas ya creadas (RN-R5-04).

## 5. API propuesta

REST bajo `/admin` (convenciones de [00-indice.md](./00-indice.md) §4.1):

| Método y ruta | Propósito |
|---|---|
| `GET/POST /admin/estaciones` · `GET/PATCH /admin/estaciones/:id` | CRUD de estaciones (409 ante edición concurrente) |
| `PUT /admin/estaciones/:id/productos` | Asignación masiva; responde los productos que quedan sin estación |
| `PATCH /admin/estaciones/:id/paso-lista` | Modo automático/explícito (V1) |
| `GET/POST /admin/impresoras` · `PATCH /admin/impresoras/:id` | CRUD de impresoras |
| `GET/PUT /admin/impresoras/rutas` | Matriz impresora × documento × copias (`ruta_impresion`) |
| `GET /admin/sla` · `PUT /admin/sla/estacion/:id` · `PUT /admin/sla/producto/:id` | Consulta y edición de SLA; valida rangos |
| `POST /admin/impresoras/:id/prueba` (V1) | Prueba de impresión con resultado |
| `GET /admin/impresoras/:id/diagnostico` (V1) | Últimos `trabajo_impresion` y alertas |
| `POST /admin/impresoras/:id/trabajos/:trabajoId/reintentar` (V1) | Reintento manual con rastro |

**Eventos Socket.IO** (namespace `/admin`, room `sucursal:{sucursalId}`): `estacion.actualizada`,
`impresora.actualizada`, `sla.actualizado`, `impresion.estado` (trabajo enviado/impreso/fallido,
con `impresoraId` e `intentos`) y `alerta.creada` (ya escuchada por el shell). Al reconectar,
refetch completo del segmento.

## 6. Frontend

- **Compartidos:** `DataTable`, `FilterBar`, `DetailDrawer`, `ConfirmDialog`, `StatusBadge`,
  `DurationCell` (SLA), `EmptyState`, `Skeleton`, `ErrorState`, `Timeline`.
- **Propios:** `StationForm` + `ProductPicker` (asignación masiva con contador y pendientes),
  `PrinterRoutes` (matriz editable con validación de copias), `SlaEditor` (rangos y avisos) y
  `PrinterDiagnostics` (probar, estado y reintentar).
- **Interacciones clave:** aviso persistente «N productos sin estación» con enlace al catálogo;
  la matriz marca documentos sin impresora y copias fuera de rango; el diagnóstico se actualiza con
  `impresion.estado`; conflicto de edición → 409 y gana lo confirmado por el servidor (convención
  del módulo 06 §8).

## 7. Permisos y trazabilidad

| Permiso | Cubre |
|---|---|
| `estaciones.ver` / `estaciones.editar` | Consulta y CRUD de estaciones, asignación de productos |
| `impresoras.ver` / `impresoras.editar` | Consulta y CRUD de impresoras y rutas |
| `sla.editar` | SLA por estación y por producto |
| `impresoras.probar` | Prueba de impresión y reintentos (V1) |
| `estaciones.paso_lista` | Configurar el paso a lista (V1) |

**Se audita en `evento_auditoria`:** cambios de estación y de asignación de productos, cambios de
SLA (antes/después), cambios de rutas y copias, cambio de modo de paso a lista y resultado de las
pruebas/reintentos de impresión. El historial operativo de impresión vive en `trabajo_impresion`.
La bitácora (`bitacora_evento`) no aplica aquí: solo cubre reserva, pedido, comanda, pago y turno.

## 8. Estados y casos borde

- **Vacío/cargando/error/sin permisos:** sin estaciones se explica para qué sirven y se ofrece
  crearlas; sin permiso, la ruta queda deshabilitada con explicación y las acciones llevan tooltip
  «Requiere permiso de {permiso}» (plan 05 §6.23).
- **Producto sin estación:** aparece en el listado de pendientes y en el catálogo; **no genera
  comanda** y se avisa al guardar (RF-R5-30).
- **Estación sin productos o sin SLA:** aviso; sin SLA no hay alerta de ese destino.
- **SLA mal configurado:** rango inválido o fuera de lo razonable → se señala y no se guarda.
- **Impresora offline/fallida:** el trabajo queda `reintentando`/`fallido` con `ultimo_error`
  visible en diagnóstico; nunca se oculta y se puede reintentar (R5 §13, dispositivo offline).
- **Copias fuera de 1–5:** rechazo con el rango visible.
- **Matriz incompleta:** documento sin impresora activa → aviso; Supuesto: el trabajo se encola y
  genera `alerta_operativa` de impresora.
- **Dos administradores editan la misma estación o impresora:** 409 con la versión vigente y gana
  lo confirmado por el servidor.

## 9. Criterios de aceptación

| # | Criterio verificable |
|---|---|
| 1 | Todo producto con estación genera comanda a esa estación; sin estación no la genera y el panel lo avisa al guardar (RF-R5-30) |
| 2 | La matriz impresora × documento × copias se respeta al imprimir comanda, precuenta, recibo y factura (RF-R5-31) |
| 3 | Cambiar el SLA por estación o producto se refleja en las alertas del KDS y en los reportes de tiempos (RF-R5-32) |
| 4 | La prueba de impresión deja un resultado visible para soporte (RF-R5-33) |
| 5 | Configurar el paso a lista (automático o explícito) y comprobar que el KDS lo aplica (RF-R5-34) |
| 6 | Los productos sin estación se listan y se pueden resolver desde el panel sin salir del módulo |

## 10. Plan de trabajo

- [ ] **F1 — API/datos:** migración de `ruta_impresion` y del modo de paso a lista (Supuestos §1);
      DTOs y validaciones; CRUD de estaciones/impresoras/rutas/SLA; auditoría; contrato de 409.
- [ ] **F2 — Lectura/lista:** `modules/estaciones` (api/pages/components/types); ruta lazy y guard;
      lista de estaciones con SLA y nº de productos; estados explicados.
- [ ] **F3 — Detalle/acciones:** `StationForm` + `ProductPicker`; `PrinterRoutes`; `SlaEditor` con
      validación y avisos; aviso de productos sin estación.
- [ ] **F4 — Masivo/en vivo:** diagnóstico con `impresion.estado` y reintentos (V1); prueba de
      impresión; paso a lista (V1); eventos `estacion.*`, `impresora.*`, `sla.*`.
- [ ] **F5 — Pruebas:** e2e RF-R5-30…34; copias por documento; SLA consumido por KDS/reportes;
      accesibilidad AA y teclado; alertas visibles.

## 11. Dependencias y pendientes

- **Fase 0** y **Usuarios y roles**; **Sucursal y ajustes** (19) para `configuracion_sucursal` y
  sedes; **Catálogo** (06) aporta los productos a asignar; **Comandas** (04) y el KDS consumen
  estaciones y paso a lista; **Tiempos y SLA** (15) lee `mv_sla_estacion`.
- Pendientes a cerrar: estructura definitiva de la matriz (¿tabla `ruta_impresion` o JSONB en
  `impresora`?), dónde vive el modo de paso a lista, protocolo de impresión (agente local vs red),
  catálogo de perfiles ESC/POS, precedencia fina producto/estación para SLA y si puede haber más
  de una impresora activa por documento y sede.
