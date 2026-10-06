# 19 — Sucursal y ajustes

**Rutas:** `/ajustes` · **Prioridad:** MVP (RF-R5-160 y RF-R5-161); RF-R5-162, RF-R5-163 y
RF-R5-164 en V1.

Aterriza [R5 §4.17](../../requerimientos/05-panel-administracion.md) y
[brief §6.22](../front/05-plan-panel-administracion.md) sobre
[01 — núcleo](../../esquema/01-nucleo.md) §1.1 y
[04 — marketing y operación](../../esquema/04-marketing-y-operacion.md) §4.1, con las convenciones
de [00 — índice](./00-indice.md). Los datos de la sede rigen su operación y los formatos del panel
(RNF-R5-08) y se reflejan en las demás interfaces.

## 1. Contexto y alcance

- **Resuelve:** datos de la sucursal (dirección, zona horaria, moneda), horarios de atención y
  cierres temporales, impuestos, consecutivos y medios de pago; parámetros de operación (propina
  sugerida, copias, comportamiento offline, límites por franja) con **vista previa del efecto**
  (MVP); plantillas de notificación por evento/canal, ventanas de programación de pedidos y
  recogida, y alta de sucursal con clonado de configuración (V1).
- **Fuera de alcance:** estaciones e impresoras (módulo 07); políticas de reservas, festivos y
  bloqueos (módulo 03); catálogo y precios (módulo 06); reportes programados (módulo 14); centro de
  alertas del shell (Fase 0).
- **Supuesto:** «configuración global» (tenant) = impuestos y plantillas de notificación; «de sede»
  = sucursal, configuración, horarios, cierres, consecutivos, medios de pago y capacidad. Solo el
  administrador global gestiona lo global; el gerente, su sede (RN-R5-05).

## 2. Requisitos cubiertos

| ID | Requisito | Prioridad | Criterio verificable |
|---|---|---|---|
| RF-R5-160 | Datos de la sucursal, horarios, zona horaria, moneda e impuestos | MVP | Rige la operación de esa sede |
| RF-R5-161 | Parámetros: propina sugerida, copias, comportamiento offline, límites por franja | MVP | Se reflejan en las interfaces |
| RF-R5-162 | Plantillas de notificación por evento y canal | V1 | Cada aviso usa la plantilla vigente |
| RF-R5-163 | Ventanas de programación de pedidos y recogida | V1 | La web respeta la ventana |
| RF-R5-164 | Alta de sucursal y clonado de configuración | V1 | Una sede nueva hereda la base y se ajusta |

Aplican además: RN-R5-01 (cambios auditados con antes/después y motivo), RN-R5-05 (alcance de
administradores), RN-R5-11 (cierres y bloqueos afectan la disponibilidad y los reportes) y
RNF-R5-08 (moneda, fecha y zona horaria por sucursal).

## 3. Rutas y pantallas

- `/ajustes` — **formulario de sucursal y ajustes** con pestañas:
  - *Sucursal*: nombre, código, dirección, ciudad, teléfono, coordenadas, **zona horaria**,
    **moneda** y estado activa; al guardar muestra la **vista previa del efecto** (§6).
  - *Horarios y cierres*: rejilla semanal (día 0–6 × franja desayuno/comida/cena) con apertura y
    cierre; lista y alta de cierres temporales (rango + motivo) con aviso del impacto en reservas
    futuras (RN-R5-11, puente con módulo 03).
  - *Operación*: propina sugerida, copias de comanda/factura, borrado de comanda impresa,
    comportamiento offline (`completo`/`solo_lectura`), ventana de programación (min) y límites
    por franja.
  - *Impuestos y medios de pago*: catálogo de impuestos (nombre, tasa, tipo) y medios de pago por
    sede (nombre, tipo, requiere referencia, activo).
  - *Consecutivos*: prefijo, siguiente, resolución y vigencia por tipo (pedido/comanda/factura).
  - *Notificaciones* (V1): plantillas por evento, canal e idioma, con vista previa y variables; y
    activación/desactivación de la configuración evento × canal.
- `/ajustes/sucursales/nueva` (V1) — **asistente de alta de sede** (`StoreBranchWizard`): datos
  base → clonar configuración de una sede existente → ajustes → confirmación.
- El administrador global puede cambiar de sede en el formulario; el gerente solo ve la suya
  (selector del shell enlazado, plan 05 §6.2).

## 4. Datos

Tablas exactas y campos clave:

| Tabla | Campos clave |
|---|---|
| `sucursal` | `nombre`, `codigo` (único por tenant), `direccion`, `ciudad`, `telefono`, `coordenadas`, `zona_horaria`, `moneda`, `activa` |
| `configuracion_sucursal` | `propina_sugerida_pct`, `copias_comanda`, `copias_factura`, `borrado_comanda_impresa`, `comportamiento_offline`, `ventana_programacion_min`, `limite_pedidos_franja` (1:1 con sede) |
| `horario_atencion` | `dia_semana` (0–6), `franja` (`desayuno`,`comida`,`cena`), `hora_apertura`, `hora_cierre` |
| `cierre_temporal` | `desde`, `hasta`, `motivo` |
| `impuesto` | `nombre`, `tasa_bps` (1900 = 19 %), `tipo` (`incluido`,`adicionado`,`inc`), `activo` |
| `consecutivo` | `tipo` (`pedido`,`comanda`,`factura`), `prefijo`, `siguiente`, `resolucion`, `vigencia_hasta`; único por sede/tipo/prefijo |
| `medio_pago` | `nombre`, `tipo`, `requiere_referencia`, `activo`; único por sede/nombre |
| `regla_capacidad` | `franja`, `maximo_pedidos`; límites por franja (convive con `limite_pedidos_franja`, ver §11) |
| `plantilla_notificacion` | `evento`, `canal`, `idioma`, `asunto`, `cuerpo`; único por tenant/evento/canal/idioma |
| `configuracion_notificacion` | `evento`, `canal`, `plantilla_id`, `activo`; unique por tenant/evento/canal |
| `notificacion` | `plantilla_id`, `canal`, `payload`, `estado`, `enviado_en`, `error` |
| `evento_auditoria` | `entidad='sucursal'|'configuracion_sucursal'|'impuesto'|…`, `accion`, `motivo`, antes/después |

- **Snapshot:** los cambios de configuración no reescriben pedidos, turnos ni notificaciones ya
  emitidos (RN-R5-04 por analogía; `notificacion.plantilla_id` conserva la plantilla usada).
- **Servidor:** una sola fuente de verdad por sede; la web y el APK leen horarios/ventanas vigentes
  al momento de operar (caso «extensión de horario en caliente», R5 §7).

## 5. API propuesta

Convenciones de [`00-indice` §4.1](./00-indice.md); cambios globales o con efecto operativo llevan
`motivo` e `Idempotency-Key`.

| Método y ruta | Para qué |
|---|---|
| `GET /admin/sucursales` · `GET /admin/sucursales/:id` | Sedes visibles según alcance; datos base |
| `PATCH /admin/sucursales/:id` | Nombre, contacto, zona horaria, moneda, activa |
| `GET /admin/sucursales/:id/configuracion` · `PUT …/configuracion` | Parámetros de operación (RF-R5-161) |
| `GET /admin/sucursales/:id/horarios` · `PUT …/horarios` | Rejilla semanal de atención |
| `GET /admin/sucursales/:id/cierres` · `POST …/cierres` · `DELETE /admin/cierres/:id` | Cierres temporales con motivo |
| `GET /admin/impuestos` · `POST /admin/impuestos` · `PATCH /admin/impuestos/:id` | Catálogo global de impuestos |
| `GET /admin/sucursales/:id/consecutivos` · `PUT …/consecutivos` | Prefijos/vigencias por tipo |
| `GET /admin/sucursales/:id/medios-pago` · `POST/PATCH …/medios-pago` | Medios de pago de la sede |
| `GET /admin/sucursales/:id/capacidad` · `PUT …/capacidad` | Reglas de capacidad por franja |
| `POST /admin/sucursales/:id/ajustes/preview` (**Supuesto**) | Vista previa del efecto antes de guardar |
| `POST /admin/sucursales` (V1) | Alta de sede clonando una configuración base |
| `GET/POST/PATCH /admin/plantillas-notificacion` (V1) | Plantillas por evento, canal e idioma |
| `GET/PUT /admin/configuracion-notificacion` (V1) | Qué plantilla queda activa por evento × canal |

**Socket.IO** (namespace `/admin`, room `sucursal:{sucursalId}`):

- `sucursal.actualizada` y `ajustes.actualizados`: el panel y las demás interfaces refrescan
  formatos, parámetros y ventanas.
- `horario.actualizado` y `cierre.actualizado`: la web/APK usan el horario vigente al momento.
- `plantilla.actualizada` (V1) y `sede.creada` (V1, para el resto de administradores).
- Al reconectar: refetch del segmento (convención §4.2).

## 6. Frontend

- Módulo `modules/ajustes` reutilizando `FilterBar`/`DataTable` donde aplique, `ConfirmDialog`,
  `ReasonSelect`, `BeforeAfterDiff`, `StatusBadge`, `EmptyState`, `Skeleton` y `ErrorState`.
- `ConfigForm` con validación (`react-hook-form`) y **`EffectPreviewPanel`**: al editar, resume qué
  cambia (moneda y formatos, horarios/ventanas de la web, copias de comanda, propina sugerida,
  offline del APK/KDS, límites por franja, impuestos) y qué interfaces se ven afectadas.
- `WeeklyScheduleEditor`, `ClosureList` (impacto en reservas futuras), `TaxTable`,
  `PaymentMethodList`, `ConsecutiveForm` (advierte turno abierto y saltos de numeración),
  `NotificationTemplateEditor` (asunto/cuerpo con variables y vista previa) y
  `StoreBranchWizard` (V1).
- Formatos de fecha/moneda siempre con la zona de la **sede activa** (`lib/format.ts`); cambios
  destructivos con confirmación y motivo; accesibilidad AA (RNF-R5-07).

## 7. Permisos y trazabilidad

| Pares `modulo.accion` | Uso |
|---|---|
| `ajustes.ver` | Ver la configuración de la sede en alcance |
| `ajustes.editar` | Operación, horarios, cierres, consecutivos, medios de pago (de sede) |
| `ajustes.global` | Impuestos y configuración global del tenant (sensible, RN-R5-05) |
| `sucursales.crear` (V1) | Alta de sede con clonado (sensible) |
| `notificaciones.ver` / `notificaciones.editar` (V1) | Plantillas y configuración de avisos |

- **Se audita** en `evento_auditoria`: cambios de zona horaria, moneda, impuestos, redondeo de
  propina, copias, offline, ventanas, límites, horarios, cierres, consecutivos, medios de pago,
  plantillas y alta de sede; con actor, hora del servidor, `motivo`, antes/después e IP
  (RN-R5-01). Registros inmutables (RN-R5-02).
- **Alcance:** gerente solo su sede; administrador global, todas y la configuración global
  (RN-R5-05). El servidor filtra por sucursal (RNF-R5-01).
- Cambios con efecto global o durante turno abierto piden confirmación explícita con motivo
  (brief §6.22) y quedan enlazados a la auditoría.

## 8. Estados y casos borde

- Vacío: sin horarios configurados se advierte «la sede no tiene horarios» y se ofrece cargar una
  plantilla; sin cierres, la lista explica que no hay cierres programados.
- Sin permisos: pestañas y campos en solo lectura con explicación; acciones ausentes para quien no
  puede editar; `403` en API fuera de alcance.
- **Zona horaria de sede ≠ administrador:** todo se muestra en la zona de la sede; al cambiarla se
  advierte que aplica a nuevas operaciones y formatos, sin reescribir históricos (**Supuesto**).
- **Extensión de horario en caliente:** la web/APK reciben el evento y usan el horario vigente al
  momento (R5 §7).
- **Cierre temporal con reservas futuras:** se muestra el conteo de reservas afectadas y se ofrece
  notificar/reubicar (puente con módulo 03, RN-R5-11).
- Cambio de moneda o impuestos con turno abierto o pagos registrados: se advierte y, si hay pagos
  del turno, se bloquea hasta cerrarlo (**Supuesto**).
- Cambio de `comportamiento_offline`: advertencia de que APK/KDS cambiarán su modo al reconectar
  (módulo 18); cambio de copias afecta comandas nuevas, no las ya impresas.
- Consecutivos: editar `prefijo`/`siguiente` con turno abierto advierte y audita; nunca retrocede
  por debajo de documentos ya emitidos (**Supuesto**).
- Plantilla activa ausente para evento × canal: el aviso queda «sin plantilla» y se alerta; la
  configuración no activa canales sin plantilla válida.
- Conflicto (R5 §13 adaptado): dos administradores guardan la misma configuración → `409` con el
  diff y gana lo confirmado por el servidor.

## 9. Criterios de aceptación

1. Cambiar zona horaria o moneda de una sede actualiza horarios y formatos del panel para esa sede
   sin alterar históricos (RF-R5-160, RNF-R5-08).
2. Horarios, cierres e impuestos guardados rigen la operación de la sede: la web respeta las
   ventanas de programación y los límites por franja (RF-R5-160, RF-R5-163, RN-R5-11).
3. Propina sugerida, copias y comportamiento offline se reflejan en las interfaces tras guardar,
   mostrando la vista previa del efecto antes de confirmar (RF-R5-161).
4. Cada aviso emitido referencia la plantilla vigente por evento y canal; cambiar la plantilla
   afecta a los avisos posteriores (RF-R5-162).
5. El asistente de alta de sede crea la sede con la configuración base heredada, lista para
   ajustar, y la operación queda auditada (RF-R5-164).
6. Un gerente no puede editar configuración global ni sedes fuera de su alcance; la API responde
   `403` (RN-R5-05, RNF-R5-01).
7. Todo cambio sensible de configuración aparece en auditoría con actor, hora, motivo y
   antes/después (RN-R5-01).

## 10. Plan de trabajo

- **F1 — API/datos:** CRUD de sede, configuración y horarios; impuestos, consecutivos, medios de
  pago y capacidad; permisos sembrados y reglas de alcance global/sede; endpoint de vista previa.
- **F2 — Lectura/lista:** `/ajustes` con pestañas, formularios en solo lectura para `ajustes.ver`,
  estados completos y formato por zona de sede.
- **F3 — Detalle/acciones:** guardado con motivo y confirmación, editor semanal, cierres con
  impacto en reservas, `EffectPreviewPanel` y guard de acciones.
- **F4 — Efectos/notificaciones:** eventos Socket.IO y refresco de formatos/ventanas; plantillas de
  notificación (V1), ventanas de programación (V1) y alta de sede con clonado (V1).
- **F5 — Pruebas:** criterios de §9 (zonas y formatos, reflejo en interfaces, plantilla vigente,
  ventana respetada, clonado de sede, alcance del gerente), más accesibilidad de formularios.

## 11. Dependencias y pendientes

- **Depende de:** Fase 0 (shell con `SedeSelector`, `lib/format.ts` por sucursal, `lib/api.ts`,
  socket y helper de auditoría); módulo 17 (quién es administrador global); módulos 03, 06, 07, 11,
  13 y 18, que consumen estos ajustes; módulo 16 para consultar la auditoría; servicios de
  notificaciones de [04 — marketing y operación](../../esquema/04-marketing-y-operacion.md).
- **Pendientes de decisión:**
  - Duplicidad `configuracion_sucursal.limite_pedidos_franja` vs. tabla `regla_capacidad`: definir
    cuál manda o cómo se combinan (hoy ambas existen en el esquema).
  - Semántica exacta del cambio de zona horaria/moneda con turno abierto o pagos del día
    (advertir vs. bloquear) y su efecto en reportes ya cerrados.
  - Consecutivos: reglas de edición de `prefijo`/`siguiente`/`vigencia_hasta` una vez emitidos
    documentos (¿solo prefijo nuevo en V2?).
  - Variables soportadas por las plantillas (formato y validación) y fallback cuando no hay
    plantilla activa.
  - Contenido exacto del clonado de sede (¿copia horarios y medios de pago?); **Supuesto**: sí,
    copia configuración, horarios, medios de pago y reglas de capacidad, no impuestos (globales).
  - Preguntas abiertas de R5 §14 que afectan: #4 (reportes automáticos por correo), #5 (el gerente
    no cambia precios), #7 (consolidado multi-sucursal en V1), #8 (rol dueño con alcance por sede).
