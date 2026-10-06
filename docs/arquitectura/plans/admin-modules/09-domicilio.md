# 09 — Domicilio y repartidores

**Rutas:** `/domicilio` (pantallas en pestañas) · **Prioridad:** V1; RF-R5-113 en V2.

Aterriza [R5 §4.12](../../requerimientos/05-panel-administracion.md) y
[brief §6.12](../front/05-plan-panel-administracion.md) sobre las tablas ya migradas de
[01 — núcleo](../../esquema/01-nucleo.md) y [03 — pedidos y dinero](../../esquema/03-pedidos-y-dinero.md),
con las convenciones de [00 — índice](./00-indice.md). La base ya usa PostGIS: las zonas de cobertura
son geometría y la web de pedidos valida contra ellas; aquí se configuran y se opera la entrega.

## 1. Contexto y alcance

- **Resuelve:** zonas de cobertura (geometría, tarifa, pedido mínimo), alta y estado de repartidores,
  asignación manual o sugerida que notifica al repartidor, seguimiento de entregas con evidencia y
  cierre por sello del servidor, y liquidación por período (V2) exportable y conciliable.
- **Fuera de alcance:** el checkout de la web pública (aquí se publica la configuración con la que la
  web valida; la pantalla de compra no es de este panel); estados generales del pedido (módulo 02);
  cobros, propinas y reembolsos (módulos 11–12); numeración fiscal (módulo 13).
- **Supuesto:** `repartidor` no es un `usuario` del panel: se administra aquí y no inicia sesión. La
  notificación al repartidor se encola en `notificacion` (canal según `configuracion_notificacion`);
  ver huecos en §4 y §11.

## 2. Requisitos cubiertos

| ID | Requisito | Prioridad | Criterio verificable |
|---|---|---|---|
| RF-R5-110 | Zonas de cobertura (geometría), tarifas y pedido mínimo | V1 | La web valida contra esta configuración |
| RF-R5-111 | Alta de repartidores y asignación manual o sugerida | V1 | La asignación notifica al repartidor |
| RF-R5-112 | Seguimiento de entregas, tiempos y evidencia | V1 | La entrega se cierra con marca de tiempo |
| RF-R5-113 | Liquidación por período (entregas, tarifas, propinas) | V2 | Se exporta y se concilia |

Aplican además: RN-R5-01 (auditoría con actor, motivo y antes/después), RN-R5-04 (un cambio de zona o
tarifa **no altera** pedidos creados), RN-R5-08 (sellos del servidor), RN-R5-10 (exportación
registrada), RNF-R5-04 (límites y segundo plano en exportaciones) y RNF-R5-08 (zona horaria de sede).

## 3. Rutas y pantallas

Ruta fija del índice: `/domicilio`. **Supuesto:** las cuatro pantallas del brief viven como pestañas
de esa ruta y los detalles cuelgan de ella (el índice solo fija la ruta raíz).

- `/domicilio?vista=mapa` — **Mapa de cobertura** (`CoverageMap`): polígonos por sucursal sobre mapa,
  con tarifa, mínimo y tiempo estimado por zona; dibujar/editar polígono, validar cierre y solapes,
  activar o desactivar. Acciones por zona: editar, duplicar, exportar GeoJSON.
- `/domicilio?vista=repartidores` — **Repartidores** (`CourierList`): nombre, teléfono, vehículo,
  estado (activo/ocupado/inactivo) y entregas activas; alta, edición y cambio de estado.
- `/domicilio/repartidores/:id` — **detalle**: entregas del período, tiempos promedio, incidencias y
  liquidaciones (V2).
- `/domicilio?vista=entregas` — **Seguimiento**: pedidos `domicilio` activos e históricos con su
  asignación y sus tramos (asignado → recogido → en camino → entregado/fallo), retraso contra
  `tiempo_estimado_min` y evidencia. Acciones: asignar (manual o sugerida), reasignar, recoger, marcar
  en camino, cerrar con evidencia, reportar fallo o devolución.
- `/domicilio/entregas/:pedidoId` — **detalle de la entrega** (`Timeline` con sellos y evidencia;
  enlace al pedido del módulo 02 y a su bitácora).
- `/domicilio?vista=liquidacion` (V2) — **liquidación por período**: filtro por repartidor y fechas,
  cuadro entregas · tarifas · propinas · total, generar/cerrar y exportar, con `DetailDrawer` por
  repartidor y estado de conciliación.

## 4. Datos

Tablas exactas: [03 — pedidos y dinero](../../esquema/03-pedidos-y-dinero.md) §3.1–3.3,
[01 — núcleo](../../esquema/01-nucleo.md) §1.4 (allí está `repartidor`) y
[04 — marketing y operación](../../esquema/04-marketing-y-operacion.md) §4.1 y §4.5.

| Tabla | Campos clave |
|---|---|
| `zona_cobertura` | `sucursal_id`, `nombre` (único por sucursal), `tarifa_centavos`, `pedido_minimo_centavos`, `tiempo_estimado_min`, `geometria`, `activa` |
| `repartidor` | `sucursal_id`, `nombre`, `telefono`, `vehiculo`, `estado` (`activo`, `ocupado`, `inactivo`) |
| `domicilio_asignacion` | `pedido_id`, `repartidor_id`, `asignado_en`, `recogido_en`, `entregado_en`, `estado` (`asignado`, `recogido`, `en_camino`, `entregado`, `entrega_fallida`, `devuelto`), `evidencia_url` |
| `pedido` | `modalidad='domicilio'`, `cliente_id`, `nombre_contacto`, `telefono_contacto`, `hora_programada`, `estado`, `recargos_centavos`, `propina_centavos` y sellos |
| `pago` | `pedido_id`, `monto_centavos`, `propina_centavos`, `estado='aprobado'` (base de la liquidación) |
| `liquidacion_repartidor` | `repartidor_id`, `periodo_desde/hasta`, `entregas`, `tarifas_centavos`, `propinas_centavos`, `total_centavos` |
| `notificacion` / `configuracion_notificacion` | aviso al repartidor: `canal`, `estado`, `payload`; la configuración decide el canal |
| `evento_auditoria` / `exportacion` | auditoría de mutaciones y registro de exportaciones |

- **Geometría:** la instancia usa PostGIS; la API recibe y devuelve **GeoJSON** y la validación
  topológica se ejecuta en el servidor (D-BD-10; el vol. 03 aún la describe como `jsonb` GeoJSON).
- **Un pedido, una asignación activa:** índice parcial `uq_domicilio_activo`; reasignar exige cerrar la
  asignación anterior en la misma operación.
- **Sellos del servidor:** los CHECK de `domicilio_asignacion` exigen orden (asignado ≤ recogido ≤
  entregado); la API ignora marcas de tiempo que envíe el cliente (RN-R5-08).
- **Huecos detectados (ver §11):** (a) `pedido` no guarda `zona_id` ni tarifa instantánea, y la
  liquidación necesita atribuir la tarifa por entrega → snapshot propuesto en F1, sin tocar pedidos
  creados; (b) `notificacion.destinatario_tipo` no admite `repartidor`; (c) `liquidacion_repartidor`
  no tiene estado ni unicidad por período; (d) `domicilio_asignacion` no tiene motivo de fallo propio
  (se cubre vía auditoría).

## 5. API propuesta

Convenciones de [00 — índice §4.1](./00-indice.md); acciones sensibles con `motivo` e
`Idempotency-Key`.

| Método y ruta | Para qué |
|---|---|
| `GET /admin/domicilio/zonas` | Lista de zonas (activas e inactivas) de la sucursal |
| `POST /admin/domicilio/zonas` · `PATCH /admin/domicilio/zonas/:id` | Alta/edición de geometría, tarifa, mínimo y tiempo estimado (auditado) |
| `POST /admin/domicilio/zonas/:id/activar` · `/desactivar` | Publicar o retirar la zona de la validación web |
| `GET /admin/domicilio/repartidores` | Lista con estado y entregas activas |
| `POST /admin/domicilio/repartidores` · `PATCH /admin/domicilio/repartidores/:id` | Alta y edición |
| `POST /admin/domicilio/repartidores/:id/estado` | Cambia `activo`/`ocupado`/`inactivo` desde el panel |
| `GET /admin/domicilio/entregas` | Seguimiento paginado (estado, repartidor, fechas, sucursal) |
| `GET /admin/domicilio/entregas/:pedidoId` | Detalle con sellos, evidencia e historial de asignaciones |
| `GET /admin/domicilio/sugerencia?pedidoId=` | Candidatos ordenados (**Supuesto** de criterio: activos de la sucursal, menos entregas activas y sin retrasos) |
| `POST /admin/domicilio/entregas/:pedidoId/asignar` | Asignación manual o de la sugerencia; notifica al repartidor |
| `POST /admin/domicilio/entregas/:pedidoId/reasignar` | Cambia de repartidor con motivo; cierra la asignación anterior |
| `POST /admin/domicilio/entregas/:pedidoId/recoger` · `/en-camino` | Avanza el estado; sello del servidor |
| `POST /admin/domicilio/entregas/:pedidoId/entregar` | Cierra con `evidencia_url` (**Supuesto:** obligatoria) y sello del servidor |
| `POST /admin/domicilio/entregas/:pedidoId/fallar` · `/devolver` | Incidencia con motivo (`entrega_fallida`/`devuelto`) |
| `GET /admin/domicilio/liquidaciones` (V2) | Períodos por repartidor y estado de conciliación |
| `POST /admin/domicilio/liquidaciones` (V2) | Genera/cierra un período (idempotente por repartidor y rango) |
| `GET /admin/domicilio/liquidaciones/:id/export` (V2) | Exporta CSV/XLSX y crea registro en `exportacion` |

**Socket.IO** (namespace `/admin`; room `sucursal:{sucursalId}`):

- `zona.actualizada` (refresca el mapa y es la señal para la web de pedidos).
- `repartidor.creado`, `repartidor.estado`.
- `domicilio.asignado`, `domicilio.estado` (recogido/en camino/entregado/fallo/devolución).
- `liquidacion.generada` (V2).
- La notificación al repartidor es una `notificacion` encolada; `domicilio.asignado` solo refresca el
  panel. Al reconectar, refetch completo del segmento.

## 6. Frontend

- Módulo `modules/domicilio` (`api.ts`, `pages/`, `components/`, `types.ts`) según
  [00 — índice §3](./00-indice.md); reutiliza `DataTable`, `FilterBar`, `SavedViewChip`,
  `DetailDrawer`, `StatusBadge`, `MoneyCell`, `DurationCell`, `Timeline`, `ConfirmDialog`,
  `ReasonSelect`, `EmptyState`, `Skeleton` y `ErrorState`.
- Propios: `CoverageMap` (dibujo/edición de polígonos; **Supuesto** de librería: MapLibre o Leaflet con
  capa GeoJSON), `ZoneForm`, `CourierList`, `CourierForm`, `AssignmentPanel` (sugerencia ordenada +
  elección manual), `DeliveryTimeline` (semáforo contra `tiempo_estimado_min`), `EvidenceUpload`,
  `LiquidationTable` (V2).
- Interacciones: filtros en la URL; la asignación muestra la carga actual del repartidor; el cierre
  pide evidencia y confirma; al editar zona se avisa que los pedidos ya creados **no** cambian
  (RN-R5-04); sin updates optimistas en asignación ni en cierre.
- Listas con estados de vacío, cargando, error y sin permisos explicados (R5 §8), y confirmación con
  motivo en acciones sensibles.

## 7. Permisos y trazabilidad

| Permiso | Alcance |
|---|---|
| `domicilio.ver` | Ver zonas, repartidores, entregas y liquidaciones |
| `domicilio.zonas` | Crear/editar/activar zonas, tarifas y mínimos (cambio sensible) |
| `domicilio.repartidores` | Alta, edición y cambio de estado de repartidores |
| `domicilio.asignar` | Asignar y reasignar entregas |
| `domicilio.cerrar_entrega` | Recoger, avanzar, cerrar con evidencia y reportar fallo |
| `domicilio.liquidar` (V2) | Generar y cerrar liquidaciones |
| `domicilio.exportar` | Exportar zonas o liquidaciones (crea registro en `exportacion`, RN-R5-10) |

- **Auditoría (`evento_auditoria`):** zonas (antes/después de geometría, tarifa y mínimo), repartidores
  (alta, edición y estado), asignación y reasignación (motivo), cierre de entrega (evidencia y sello
  del servidor), fallos y devoluciones (motivo), generación y exportación de liquidación.
- Los cambios de zona aplican a pedidos nuevos; los creados conservan su tarifa (RN-R5-04). La bitácora
  de la entrega se alcanza desde el detalle del pedido (módulo 02).

## 8. Estados y casos borde

- **Vacío:** «Aún no hay zonas configuradas» con CTA «Dibujar zona»; «Sin repartidores activos»;
  «No hay entregas en el rango» con limpiar filtros.
- **Cargando/error/sin permisos:** `Skeleton`, causa + «Reintentar» y acciones deshabilitadas con
  tooltip «Requiere permiso de {permiso}».
- **Zona solapada o polígono inválido:** se rechaza con 409/422 y se resalta el sector; **Supuesto:**
  no se permiten solapes entre zonas activas de la misma sucursal.
- **Cambio de tarifa o mínimo:** los pedidos ya creados no cambian (RN-R5-04); el aviso aparece antes
  de guardar.
- **Dos asignaciones activas:** el segundo intento devuelve 409 mostrando el repartidor vigente.
- **Entrega sin evidencia o con sello del dispositivo:** se bloquea; el sello lo pone el servidor
  (RN-R5-08).
- **Repartidor inactivo u ocupado:** no aparece como candidato; forzarlo devuelve 409.
- **Pedido cancelado con entrega activa:** se cierra la asignación y se notifica (**Supuesto**: regla a
  confirmar, §11).
- **Entrega fallida o devuelta:** exige motivo y no suma a la liquidación (**Supuesto**: no suma).
- **Exportación grande (V2):** límite + segundo plano con aviso (RNF-R5-04).
- **Zona horaria:** sellos y rangos se pintan en la zona de la sede (RNF-R5-08).

## 9. Criterios de aceptación

1. Una dirección fuera de toda `zona_cobertura` activa, o un subtotal menor al
   `pedido_minimo_centavos`, **no permite confirmar** un pedido a domicilio en la web; la tarifa
   aplicada es la de la zona vigente al crearlo (RF-R5-110).
2. Editar tarifa, mínimo o geometría **no altera** pedidos ya creados ni sus totales (RN-R5-04).
3. El alta de repartidor y la asignación (manual o sugerida) quedan auditadas; la asignación crea la
   `notificacion` al repartidor y su estado es consultable (RF-R5-111).
4. Un pedido no puede tener dos `domicilio_asignacion` activas; el intento devuelve 409 con el
   repartidor vigente.
5. El cierre de entrega guarda `entregado_en` **del servidor** y `evidencia_url`; los sellos respetan
   asignado ≤ recogido ≤ entregado (RF-R5-112, RN-R5-08).
6. El seguimiento muestra los tramos y el retraso contra `tiempo_estimado_min` con semáforo, y «—»
   cuando un tramo no ocurrió.
7. (V2) La liquidación del período cuadra entregas × tarifas + propinas de pagos aprobados y se
   exporta dejando registro en `exportacion` (RF-R5-113, RN-R5-10).

## 10. Plan de trabajo

- [ ] **F1 — API/datos:** módulo NestJS `domicilio`; CRUD de zonas con validación de geometría
      (PostGIS) y solapes; CRUD de repartidores y estados; asignación/avance/cierre; snapshot de zona y
      tarifa en el pedido (hueco §4a); auditoría; permisos sembrados.
- [ ] **F2 — lectura/lista:** mapa de cobertura en solo lectura y lista de repartidores paginada con
      filtros; estados vacío/cargando/error/sin permisos.
- [ ] **F3 — detalle/acciones:** edición de zonas en el mapa; alta/edición de repartidores; asignación
      manual/sugerida; avance y cierre con evidencia; detalle de entrega con `Timeline`.
- [ ] **F4 — en vivo/exportación:** eventos Socket.IO; seguimiento en vivo; exportar GeoJSON/zonas;
      (V2) generación de liquidaciones y exportación registrada.
- [ ] **F5 — pruebas:** unitarias de validación de polígonos/solapes y de sellos; e2e asignación →
      notificación → cierre; conciliación de liquidación contra `pago`; casos borde de §8.

## 11. Dependencias y pendientes

- **Depende de:** Fase 0 (shell, permisos, helper de auditoría); módulo 02 Pedidos (origen de las
  entregas y enlace a la bitácora); módulo 12 Pagos y propinas (propinas conciliables, V2);
  Notificaciones (`notificacion`/`configuracion_notificacion`); `exportacion` (F4).
- **Pendientes de esquema/negocio:** (a) snapshot de zona/tarifa en `pedido` o tabla puente para
  atribuir tarifa en la liquidación; (b) `destinatario_tipo='repartidor'` en `notificacion` o canal
  propio; (c) estado y unicidad por período en `liquidacion_repartidor`; (d) motivo de fallo en
  `domicilio_asignacion` (hoy solo auditoría); (e) regla de pedidos cancelados con entrega activa.
- **Preguntas de R5 §14 que lo afectan:** #7 consolidado multi-sucursal (zonas por sede) y #8
  administración por el dueño con alcance por sucursal. Rigen los supuestos por defecto de R5 §14.
