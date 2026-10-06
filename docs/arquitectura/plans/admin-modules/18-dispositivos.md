# 18 — Dispositivos y versiones

**Rutas:** `/dispositivos` · **Prioridad:** MVP (RF-R5-150); RF-R5-151 y RF-R5-152 en V1.

Aterriza [R5 §4.16](../../requerimientos/05-panel-administracion.md) y
[brief §6.21](../front/05-plan-panel-administracion.md) sobre las tablas ya migradas de
[01 — núcleo](../../esquema/01-nucleo.md) y
[04 — marketing y operación](../../esquema/04-marketing-y-operacion.md), siguiendo
[00 — índice](./00-indice.md). El dispositivo pertenece a una sola sucursal y hereda su alcance.

## 1. Contexto y alcance

- **Resuelve:** inventario de dispositivos (APK mesero, KDS, cajas) con estación asignada, versión,
  última conexión y estado; vinculación y revocación (un revocado **deja de operar**, RF-R5-150);
  versión mínima por tipo que **fuerza la actualización** (V1, RF-R5-151); diagnóstico con última
  conexión, operaciones pendientes y errores, enlazado con su alerta (V1, RF-R5-152).
- **Fuera de alcance:** configuración de estaciones e impresoras (módulo 07); trabajos de impresión
  (módulo 07); procesamiento de las operaciones offline (API de sync de cada cliente); centro de
  alertas del shell (Fase 0).
- **Supuesto:** la vinculación emite un token de un solo uso (QR/código) y la revinculación rota el
  token anterior; la versión mínima es configuración del tenant y aplica por tipo de dispositivo.

## 2. Requisitos cubiertos

| ID | Requisito | Prioridad | Criterio verificable |
|---|---|---|---|
| RF-R5-150 | Inventario de dispositivos y vinculación/revocación | MVP | Un dispositivo revocado deja de operar |
| RF-R5-151 | Control de versión mínima por tipo de dispositivo | V1 | Fuerza la actualización |
| RF-R5-152 | Diagnóstico: última conexión, operaciones pendientes y errores | V1 | Enlaza con la alerta correspondiente |

Aplican además: RN-R5-01 (toda acción sensible auditada), RN-R5-05 (el gerente administra su sede;
el administrador global, todas), RNF-R5-01 (aislamiento por sucursal), RNF-R5-05 (la auditoría es
inmutable) y RNF-R5-08 (fechas y horas en la zona de la sede).

## 3. Rutas y pantallas

- `/dispositivos` — **inventario** (`DeviceTable`): tipo (`apk`/`kds`/`caja`), sucursal, usuario
  vinculado, estación (KDS), versión (`version_app`), última conexión (`ultima_conexion_en`) y
  estado (vinculado/revocado). Filtros por sede, tipo, estado y «desactualizados»; búsqueda por
  usuario o estación. Usuario/token no ponen nombre al equipo: se muestra tipo + identificación
  corta (**Supuesto** mientras no exista columna `nombre`).
- **Acciones de lista:** vincular (asistente con token de un solo uso), revocar (motivo
  obligatorio), revincular, abrir detalle.
- `/dispositivos/:id` — **detalle y diagnóstico**: ficha (tipo, usuario, estación, versión,
  estado, creado), diagnóstico V1 (última conexión, pendientes en `sync_operacion`, último error y
  alertas asociadas con enlace al centro de alertas) e historial de conexiones/eventos.
- `/dispositivos/versiones` (V1) — **política de versión mínima** por tipo de dispositivo, con
  vista del parque instalado (cuántos equipos por debajo del mínimo).
- Enlaces cruzados: KDS ↔ bloqueo de operación (plan 04 §6.2), APK ↔ meseros (plan 03) y alerta
  operativa ↔ diagnóstico (RF-R5-152).

## 4. Datos

Tablas exactas y campos clave:

| Tabla | Campos clave |
|---|---|
| `dispositivo` | `usuario_id`, `sucursal_id`, `tipo` (`apk`,`kds`,`caja`), `token` (único), `estacion_id` (solo KDS), `version_app`, `ultima_conexion_en`, `estado` (`vinculado`,`revocado`), `creado_en` |
| `estacion` | `nombre`, `tipo` (`preparacion`,`despacho`), `activa`; define el destino de un KDS |
| `usuario` | Titular del dispositivo (APK); `nombre`, `activo` |
| `sync_operacion` | `dispositivo_id`, `client_op_id` (único), `tipo`, `payload`, `estado` (`pendiente`,`aplicada`,`rechazada`), `aplicado_en`, `error` |
| `alerta_operativa` | `tipo` (`dispositivo`,`sync`,…), `severidad`, `entidad`, `entidad_id`, `estado`, `atendida_por`, `creado_en` |
| `evento_auditoria` | `entidad='dispositivo'`, `accion`, `motivo`, `datos_antes/despues`, `dispositivo_id`, `creado_en` |

- **Revocación:** se cambia `estado` a `revocado`; el token deja de autenticar (los clientes
  reciben `401`/`410` y dejan de operar); lo pendiente en `sync_operacion` permanece visible en el
  diagnóstico (R5 §13: «dispositivo offline con operaciones pendientes no se oculta»).
- **Huecos de esquema (ver §11):** el brief menciona *print agent*, pero el `CHECK` de
  `dispositivo.tipo` solo admite `apk`,`kds`,`caja`; tampoco existe tabla para la versión mínima
  por tipo. **Supuesto:** ampliar el `CHECK` (o mapear *print agent* a `caja`) y guardar la
  política de versión como configuración del tenant.

## 5. API propuesta

Convenciones de [`00-indice` §4.1](./00-indice.md); revocar/versionar exigen `motivo` e
`Idempotency-Key`.

| Método y ruta | Para qué |
|---|---|
| `GET /admin/dispositivos` | Inventario paginado (filtros sede, tipo, estado, versión, texto) |
| `GET /admin/dispositivos/:id` | Ficha del dispositivo |
| `POST /admin/dispositivos` | Alta y vinculación; devuelve token de un solo uso |
| `PATCH /admin/dispositivos/:id` | Estación asignada / usuario titular |
| `POST /admin/dispositivos/:id/revocar` | Revocación con motivo; el equipo deja de operar |
| `POST /admin/dispositivos/:id/revincular` | Rotar token y volver a `vinculado` (auditado) |
| `GET /admin/dispositivos/:id/diagnostico` (V1) | Última conexión, contadores de sync, errores y alertas |
| `GET /admin/dispositivos/:id/operaciones` (V1) | `sync_operacion` paginada con estado y `error` |
| `POST /admin/dispositivos/:id/operaciones/:opId/reintentar` (V1, **Supuesto**) | Reintento manual de una operación rechazada/pendiente |
| `GET /admin/dispositivos/versiones` · `PUT /admin/dispositivos/versiones` (V1) | Política de versión mínima por tipo |

**Socket.IO** (namespace `/admin`, room `sucursal:{sucursalId}`):

- `dispositivo.vinculado`, `dispositivo.revocado`, `dispositivo.conexion` (actualiza última
  conexión y estado en vivo) y `dispositivo.version` (cambios de `version_app` o quedar por debajo
  del mínimo).
- `sync.pendiente` y `sync.actualizada` (mueven los contadores del diagnóstico).
- `alerta.creada` con `tipo` `dispositivo`/`sync` resalta la fila y enlaza con el diagnóstico.
- Al reconectar, refetch completo del segmento (convención §4.2).

## 6. Frontend

- Módulo `modules/dispositivos` (`api.ts`, `pages/`, `components/`, `types.ts`) reutilizando
  `DataTable`, `FilterBar`, `DetailDrawer`, `StatusBadge`, `Timeline`, `ConfirmDialog`,
  `ReasonSelect`, `EmptyState`, `Skeleton` y `ErrorState`.
- `DeviceTable`, `DeviceStatusBadge` (vinculado/revocado/desactualizado/sin conexión),
  `LinkDeviceWizard` (tipo → sede → usuario/estación → token mostrado una sola vez),
  `RevokeDeviceDialog` (motivo + confirmación), `VersionPolicyForm` (V1) y `DeviceDiagnosticPanel`
  (V1) con última conexión, lista de pendientes, último error y tarjeta de alerta enlazada.
- Tiempos y «hace n min» con `lib/format.ts` en la **zona de la sede** (RNF-R5-08); refresco en
  vivo sin saltos de layout; estados completos de lista (R5 §8).

## 7. Permisos y trazabilidad

| Pares `modulo.accion` | Uso |
|---|---|
| `dispositivos.ver` | Inventario, ficha y diagnóstico |
| `dispositivos.vincular` | Alta y revinculación |
| `dispositivos.editar` | Estación/titular |
| `dispositivos.revocar` | Revocación (sensible) |
| `dispositivos.version` (V1) | Política de versión mínima (sensible) |
| `dispositivos.diagnostico` (V1) | Operaciones pendientes, errores y alertas |

- **Se audita** en `evento_auditoria`: vinculación, revinculación (con rotación de token),
  revocación (con `motivo`), cambio de estación/usuario, cambio de versión mínima y reintentos de
  operaciones; actor, hora del servidor, dispositivo, IP y antes/después (RN-R5-01). Nada de eso
  se puede editar ni borrar desde la UI (RN-R5-02).
- **Alcance:** el gerente solo ve y administra dispositivos de su sede; el administrador global,
  todas (RN-R5-05). El servidor filtra por alcance (RNF-R5-01).
- El diagnóstico consulta datos de operación del dispositivo; la consulta queda registrada si se
  considera sensible (RNF-R5-09, **Supuesto** de aplicación).

## 8. Estados y casos borde

- Vacío: «Aún no hay dispositivos vinculados en esta sede» con acción «Vincular».
- Sin conexión hace mucho o nunca (`ultima_conexion_en` NULL): estado «sin conexión» visible, con
  la fecha en zona de la sede; nunca se oculta (R5 §7).
- Offline con operaciones pendientes: el diagnóstico lista los `sync_operacion` en `pendiente` y
  las `rechazada` con `error`; enlaza con la alerta si existe (RF-R5-152).
- Dispositivo revocado: su fila y ficha lo indican; si reaparece intentando operar, se registra y
  se genera/actualiza alerta (**Supuesto**).
- KDS sin `estacion_id` o con estación inactiva: se advierte en la vinculación (afecta el enrutado
  de comandas, módulo 07).
- Token duplicado o reutilizado → `409` con detalle; el token viejo se invalida al revincular.
- Versión por debajo del mínimo (V1): badge y alerta; APK/KDS reciben la política y fuerzan la
  actualización antes de operar; caja/*print agent* reciben aviso (**Supuesto** según política).
- Sede fuera del alcance del usuario → lista vacía con explicación; API responde `403`.
- Conflicto (R5 §13 adaptado): dos administradores revinculan o revocan el mismo equipo → `409`,
  gana lo confirmado por el servidor.

## 9. Criterios de aceptación

1. Revocar un dispositivo impide que siga operando (token rechazado) y el cambio queda auditado
   con actor, motivo y hora (RF-R5-150, RN-R5-01).
2. El inventario muestra tipo, estación, versión, última conexión y estado, filtrable por sede
   (RF-R5-150).
3. Con versión mínima configurada (V1), un equipo por debajo de ella queda marcado y se le fuerza
   la actualización antes de operar (RF-R5-151).
4. El diagnóstico (V1) muestra última conexión, operaciones pendientes de `sync_operacion` y
   errores, y enlaza con la alerta correspondiente (RF-R5-152).
5. Un dispositivo offline con pendientes sigue visible con sus operaciones, sin ocultarse (R5 §7).
6. Un gerente no ve dispositivos de otra sede y la API responde `403` si lo intenta (RNF-R5-01).

## 10. Plan de trabajo

- **F1 — API/datos:** CRUD/vinculación/revocación sobre `dispositivo`; consultas de diagnóstico
  (join con `sync_operacion` y `alerta_operativa`); decisión de esquema para *print agent* y
  versión mínima; permisos sembrados.
- **F2 — Lectura/lista:** `/dispositivos` con `DeviceTable`, filtros en URL, estados completos y
  badges de estado/versión.
- **F3 — Detalle/acciones:** ficha, vincular/revinculación con token de un solo uso, revocar con
  motivo, asignar estación; guard de acciones por permiso.
- **F4 — En vivo/efectos:** eventos `dispositivo.*` y `sync.*`, diagnóstico V1 con enlace a
  alertas, política de versión mínima y su efecto en los clientes.
- **F5 — Pruebas:** criterios de §9 (revocado no opera, offline visible, mínimos fuerzan update,
  diagnóstico ↔ alerta, alcance por sede), más accesibilidad de tabla y diálogos.

## 11. Dependencias y pendientes

- **Depende de:** Fase 0 (shell, `lib/api.ts`, `socket.ts`, `format.ts`, centro de alertas);
  módulo 07 (estaciones); módulo 16 (auditoría); clientes APK/KDS/caja que reportan `version_app`,
  `ultima_conexion_en` y operaciones de `sync_operacion`; plan 03 (APK) y plan 04 §6.2 (bloqueo
  del KDS).
- **Pendientes de decisión:**
  - *Print agent* no existe en el `CHECK` de `dispositivo.tipo` (§4): ampliar tipo o mapear.
  - Persistencia de la versión mínima por tipo (no hay tabla): configuración del tenant
    (**Supuesto**) u otra tabla; y política exacta de bloqueo por tipo (APK/KDS vs. caja).
  - Retención/purga de `sync_operacion` aplicadas/rechazadas; ¿se reintentan desde el panel o solo
    se diagnostican? (RF-R5-152 solo pide diagnóstico; el reintento es **Supuesto**).
  - ¿Qué pasa con las operaciones pendientes de un dispositivo revocado (conservar, reintentar o
    descartar con auditoría)?
  - Preguntas abiertas de R5 §14 que afectan: #1 (qué dispositivos usan el panel y los clientes).
