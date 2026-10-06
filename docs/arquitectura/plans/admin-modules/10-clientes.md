# 10 — Clientes

**Rutas:** `/clientes`, `/clientes/:id` · **Prioridad:** V1; RF-R5-91 en MVP y RF-R5-92 en V2.

Aterriza [R5 §4.10](../../requerimientos/05-panel-administracion.md) y
[brief §6.13](../front/05-plan-panel-administracion.md) sobre [01 — núcleo](../../esquema/01-nucleo.md)
§1.4 (`cliente`, `consentimiento`), [03 — pedidos y dinero](../../esquema/03-pedidos-y-dinero.md)
(`pedido`, `pago`) y [04 — marketing y operación](../../esquema/04-marketing-y-operacion.md)
(`segmento_cliente`, `suscriptor`, `resena`, `evento_auditoria`, `exportacion`), con las convenciones
de [00 — índice](./00-indice.md). La privacidad es el eje: datos enmascarados por rol, consultas
sensibles registradas y anonimización que no rompe lo fiscal.

## 1. Contexto y alcance

- **Resuelve:** ficha con datos, historial de pedidos y reservas, preferencias y notas;
  consentimientos con opt-out respetado en todos los canales (MVP); segmentos básicos (V2); derechos
  ARCO con acceso, rectificación y anonimización (V1).
- **Fuera de alcance:** campañas y envíos (módulo 08 Promociones, que consume consentimientos y
  segmentos); moderación de reseñas (08); facturación y reportes fiscales (13/14, que deben seguir
  cuadrando tras anonimizar); alta de clientes desde la web pública.
- **Supuesto:** `cliente` es a nivel **tenant** (no por sucursal) y el historial se acota al alcance de
  sedes del usuario. Un rol sin `clientes.datos` ve la lista y la ficha con datos **enmascarados**
  (RN-R5-07), nunca la ficha vacía.

## 2. Requisitos cubiertos

| ID | Requisito | Prioridad | Criterio verificable |
|---|---|---|---|
| RF-R5-90 | Ficha del cliente con su historial de reservas y pedidos | V1 | Solo roles autorizados ven sus datos |
| RF-R5-91 | Consentimientos, preferencias y bajas (opt-out) | MVP | La baja se respeta en todos los canales |
| RF-R5-92 | Segmentos básicos (recurrentes, inactivos, cumpleaños) | V2 | Se usan para campañas |
| RF-R5-93 | Derecho de acceso, rectificación y anonimización | V1 | La anonimización no rompe los reportes fiscales |

Aplican además: RN-R5-07 (enmascarar datos personales), RN-R5-09 (no se borra: se cancela/anonimiza
sin romper lo fiscal), RN-R5-10 (exportación registrada), RNF-R5-01 (aislamiento), RNF-R5-04
(límites de exportación), RNF-R5-08 (zona horaria de sede) y RNF-R5-09 (registro de consultas
sensibles).

## 3. Rutas y pantallas

- `/clientes` — **lista** (`DataTable` + `ClientRow`): nombre, teléfono y correo enmascarados o
  completos según permiso; última visita, nº de pedidos, reservas activas y estado de consentimiento.
  Filtros: texto, con/sin marketing, sede, fechas y segmento (V2); exportación de la vista.
- `/clientes/:id` — **ficha** (`ClientProfile`) en pestañas:
  - *Resumen*: contacto (enmascarado por rol), preferencias, notas (visibles solo con permiso) y
    etiquetas de segmento.
  - *Historial*: pedidos y reservas con totales, canal, origen y estado; enlaces a `/pedidos/:id` y
    `/reservas/:id`; sin datos de contacto expuestos a roles sin permiso.
  - *Consentimientos* (`ConsentList`, MVP): tipo, canal, base legal, `otorgado_en`/`revocado_en` y
    vigencia; otorgar y revocar con motivo.
  - *ARCO* (V1): acceso (exportar los datos del cliente), rectificación y anonimización (acción
    irreversible con doble confirmación).
  - *Actividad*: accesos sensibles y cambios —quién vio qué y cuándo— (RNF-R5-09).
- **Segmentos** (V2): vista «Segmentos» dentro de `/clientes` con galería de `segmento_cliente`,
  vista previa del conteo y edición del criterio (recurrentes, inactivos, cumpleaños).
- **Supuesto:** las «notas» internas son dato personal: solo roles autorizados las ven y su edición
  se audita.

## 4. Datos

| Tabla | Campos clave |
|---|---|
| `cliente` | `tenant_id`, `nombre`, `telefono`, `correo`, `fecha_nacimiento`, `preferencias` (jsonb), `notas`, `creado_en`/`actualizado_en`; no se borra, se anonimiza |
| `consentimiento` | `cliente_id`, `tipo` (`datos`, `marketing`, `cookies`), `canal`, `base_legal`, `otorgado_en`, `revocado_en` (opt-out) |
| `pedido` | `cliente_id`, `nombre_contacto`/`telefono_contacto` (a anonimizar), `canal`, `modalidad`, `total_centavos`, `estado` y sellos |
| `reserva` | `cliente_id`, `nombre_contacto`/`telefono_contacto`/`correo_contacto` (a anonimizar), `fecha_hora`, `estado`, `personas` ([02 — catálogo, salón y reservas](../../esquema/02-catalogo-salon-reservas.md) §2.5) |
| `segmento_cliente` | `nombre` (único por tenant), `criterio` jsonb, `actualizado_en`; el conteo se calcula al vuelo |
| `suscriptor` | `correo`, `consentimiento_en`, `activo` (baja de newsletter) |
| `resena` | `cliente_id`, `puntaje`, `fecha`, `publicada` (aquí solo consulta) |
| `notificacion` | `destinatario_tipo` (`cliente`/`contacto`), `canal`, `estado`; se consulta para verificar opt-out |
| `evento_auditoria` / `exportacion` | accesos sensibles, mutaciones y exportaciones |

- **Enmascarado en el servidor:** el DTO expone los campos personales solo si el actor tiene
  `clientes.datos`; sin él viajan enmascarados (p. ej. `A*** B***`, `***1234`, `j***@dominio`). El
  front nunca recibe el dato completo (RN-R5-07).
- **Consulta sensible registrada:** abrir la ficha con datos completos o exportarlos escribe en
  `evento_auditoria` (`entidad='cliente'`, acción de consulta/exportación) con actor, dispositivo y
  sello del servidor (RNF-R5-09).
- **Anonimización (RN-R5-09):** se reemplazan los datos personales de `cliente` y los campos de
  contacto de `pedido`/`reserva`, se revocan consentimientos y se desactiva `suscriptor`; se conservan
  importes, fechas, códigos y facturas para los reportes fiscales. La fila no se borra: se marca como
  anonimizada.
- **Huecos detectados (ver §11):** (a) `cliente` no tiene marca `anonimizado_en` ni histórico de
  accesos propio; (b) no hay tabla de solicitudes ARCO con estado y plazos; (c) `consentimiento` no
  guarda actor ni motivo propios (se cubren vía auditoría); (d) falta política explícita para
  `notificacion.payload` y `resena` al anonimizar.

## 5. API propuesta

Convenciones de [00 — índice §4.1](./00-indice.md); acciones sensibles con `motivo` e
`Idempotency-Key`.

| Método y ruta | Para qué |
|---|---|
| `GET /admin/clientes` | Lista paginada (texto, consentimiento, sede, fechas y segmento V2); campos enmascarados según permiso |
| `GET /admin/clientes/:id` | Ficha; con `clientes.datos` devuelve datos completos y **registra el acceso** |
| `PATCH /admin/clientes/:id` | Rectificación (ARCO); auditada con antes/después |
| `GET /admin/clientes/:id/historial` | Pedidos y reservas paginados con totales y estados |
| `GET /admin/clientes/:id/consentimientos` | Consentimientos vigentes e históricos |
| `POST /admin/clientes/:id/consentimientos` | Registrar otorgamiento (tipo, canal, base legal) |
| `POST /admin/clientes/:id/consentimientos/:id/revocar` | Opt-out con motivo; corta envíos futuros |
| `GET /admin/clientes/:id/accesos` | Registro de consultas sensibles de la ficha (RNF-R5-09) |
| `POST /admin/clientes/:id/anonimizar` | ARCO: anonimiza sin romper lo fiscal; motivo + `Idempotency-Key`; irreversible |
| `GET /admin/clientes/:id/export` | Acceso ARCO/portabilidad; crea registro en `exportacion` |
| `GET /admin/clientes/export` | Exportación de lista con filtros; registrada y con límites (RNF-R5-04) |
| `GET /admin/clientes/segmentos` · `POST /admin/clientes/segmentos` · `PATCH /admin/clientes/segmentos/:id` (V2) | CRUD de segmentos |
| `GET /admin/clientes/segmentos/:id/vista-previa` (V2) | Conteo y muestra antes de usarlo en campañas |

**Socket.IO** (namespace `/admin`; room `sucursal:{sucursalId}`):

- `cliente.actualizado`, `consentimiento.revocado`, `cliente.anonimizado` y `segmento.actualizado`
  (V2). Los eventos invalidan la caché de ficha y listas; no hay operación en vivo que dependa de
  ellos.
- El opt-out se propaga a Promociones (módulo 08) para cancelar envíos pendientes (**Supuesto:** se
  cancelan las `notificacion` en estado `pendiente` y se desactiva `suscriptor`).

## 6. Frontend

- Módulo `modules/clientes` (`api.ts`, `pages/`, `components/`, `types.ts`) según
  [00 — índice §3](./00-indice.md); reutiliza `DataTable`, `FilterBar`, `SavedViewChip`,
  `DetailDrawer`, `StatusBadge`, `MoneyCell`, `Timeline`, `ConfirmDialog`, `ReasonSelect`,
  `EmptyState`, `Skeleton` y `ErrorState`.
- Propios: `MaskedField` (muestra el valor enmascarado y, si el rol puede, un botón «Ver dato» que
  registra el acceso), `ClientProfile` (pestañas), `ConsentList`, `ArcoPanel`, `AccessLogTable`,
  `SegmentBuilder` (V2; edita `segmento_cliente.criterio` y pide vista previa antes de guardar/usar).
- La ficha avisa «Consulta registrada» cuando el rol ve datos completos; la anonimización exige
  escribir `ANONIMIZAR` y explica qué se conserva (fiscal) y qué se pierde (irreversible).
- Sin datos personales en URLs, logs ni exportaciones sin permiso; listas con estados completos
  (vacío, cargando, error, sin permisos) y confirmaciones con motivo.

## 7. Permisos y trazabilidad

| Permiso | Alcance |
|---|---|
| `clientes.ver` | Lista y ficha con datos **enmascarados** |
| `clientes.datos` | Ver datos completos (consulta sensible registrada) |
| `clientes.editar` | Rectificación y notas (auditado) |
| `clientes.consentimientos` | Otorgar y revocar consentimientos |
| `clientes.anonimizar` | Anonimización ARCO (sensible: motivo + confirmación fuerte) |
| `clientes.exportar` | Exportaciones (acceso ARCO y listas); crea registro en `exportacion` |
| `clientes.segmentos` (V2) | Crear y editar segmentos |

- **Auditoría (`evento_auditoria`, `entidad='cliente'`):** **todas** las consultas sensibles
  (RNF-R5-09) más rectificación (antes/después), consentimientos otorgados/revocados, anonimización
  (irreversible, con motivo y alcance) y cada exportación (RN-R5-10). Auditoría inmutable (RN-R5-02).
- Desde la ficha se llega a la auditoría/bitácora en un clic (módulo 16) y a pedidos y reservas
  (módulos 02/03).

## 8. Estados y casos borde

- **Vacío:** «Aún no hay clientes» y «Sin resultados para estos filtros» con CTA para limpiarlos.
- **Cargando/error/sin permisos:** `Skeleton`; causa + «Reintentar»; sin `clientes.datos`, el botón de
  ver dato y el de exportar ARCO no aparecen (tooltip «Requiere permiso de {permiso}»).
- **Anonimización:** nunca borra; conserva lo fiscal (RN-R5-09). Si hay pedidos abiertos o campañas en
  curso, se advierte y se cortan los envíos pendientes (**Supuesto**, §11).
- **Opt-out:** revocar `marketing` impide crear nuevas notificaciones de marketing y desactiva
  `suscriptor`; las ya encoladas se cancelan (RF-R5-91).
- **Exportación muy grande:** límite + segundo plano con aviso (RNF-R5-04).
- **Conflicto de edición:** dos administradores rectificando a la vez → 409 y gana lo confirmado por
  el servidor (plan 05 §6.23); las notas no se pisan.
- **Cliente sin correo (solo teléfono):** permitido; cada canal usa solo lo disponible y consentido.
- **Ficha anonimizada:** se indica ese estado, no se muestran datos personales y los accesos siguen
  registrándose.
- **Zona horaria:** fechas, visitas y cumpleaños se pintan en la zona de la sede consultada
  (RNF-R5-08).

## 9. Criterios de aceptación

1. Un rol sin `clientes.datos` ve lista y ficha con nombre, teléfono y correo **enmascarados**, y no
   puede exportarlos (RN-R5-07).
2. Abrir una ficha con datos completos (o exportarla) deja registro consultable en
   `/clientes/:id/accesos` con actor, fecha y dispositivo (RNF-R5-09).
3. Revocar `marketing` impide nuevas notificaciones de marketing en **todos** los canales, se refleja
   en Promociones y desactiva `suscriptor` (RF-R5-91).
4. El historial muestra pedidos y reservas del cliente con totales y estados, con enlaces a sus
   módulos y sin exponer contacto a roles sin permiso (RF-R5-90).
5. Anonimizar reemplaza los datos personales, conserva importes y facturas, y los reportes fiscales
   (13/14) siguen cuadrando; la acción es irreversible y queda auditada (RF-R5-93, RN-R5-09).
6. La rectificación guarda antes/después en auditoría y un guardado concurrente recibe 409.
7. Toda exportación (ARCO o lista) respeta permisos, se limita si es grande y crea registro en
   `exportacion` (RN-R5-10, RNF-R5-04).
8. (V2) Un segmento (recurrentes, inactivos, cumpleaños) muestra vista previa del conteo antes de
   usarse en campañas (RF-R5-92).

## 10. Plan de trabajo

- [ ] **F1 — API/datos:** módulo NestJS `clientes`; DTO con enmascarado por permiso; historial
      (pedido/reserva); consentimientos; registro de accesos; anonimización transaccional que cubre
      `cliente` + contactos de `pedido`/`reserva` + `suscriptor`; campos nuevos de los huecos §4;
      permisos sembrados.
- [ ] **F2 — lectura/lista:** lista paginada con filtros y exportación básica; ficha en lectura con
      Resumen/Historial/Consentimientos; estados vacío/cargando/error/sin permisos.
- [ ] **F3 — detalle/acciones:** rectificación y notas; otorgar/revocar consentimientos; ARCO
      (exportar acceso y confirmar anonimización); panel de accesos.
- [ ] **F4 — en vivo/exportación:** eventos Socket.IO e invalidación de caché; propagación de opt-out a
      Promociones; exportaciones en segundo plano con aviso; (V2) segmentos con vista previa.
- [ ] **F5 — pruebas:** unitarias de enmascarado y reglas de consentimiento; e2e de opt-out por canal;
      e2e de anonimización verificando que facturas y reportes no cambian; auditoría de consultas;
      casos borde de §8.

## 11. Dependencias y pendientes

- **Depende de:** Fase 0 (permisos, helper de auditoría, formato); módulo 08 Promociones (consumidor
  del opt-out y de los segmentos); módulos 02/03 (historial y enlaces); módulos 13/14 (verificar que
  la anonimización no rompe lo fiscal); `exportacion`.
- **Pendientes de esquema/negocio:** (a) marca `anonimizado_en` (y opcional hash de pseudónimo) en
  `cliente`; (b) flujo/tabla de **solicitudes ARCO** con estado y plazos; (c) `consentimiento` sin
  actor/motivo propios (hoy solo auditoría); (d) política de anonimización de `notificacion.payload` y
  `resena`; (e) comportamiento del opt-out con campañas ya en curso.
- **Preguntas de R5 §14 que lo afectan:** #4 reportes automáticos (un export ARCO no debe mezclarse
  con envíos programados), #7 consolidado multi-sucursal (alcance del historial) y #8 administración
  por el dueño con alcance por sucursal. Rigen los supuestos por defecto de R5 §14.
