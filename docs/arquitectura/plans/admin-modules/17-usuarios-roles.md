# 17 — Usuarios y roles

**Rutas:** `/usuarios`, `/roles` · **Prioridad:** MVP; RF-R5-143 en V1 y RF-R5-144 en V2.

Aterriza [R5 §4.15](../../requerimientos/05-panel-administracion.md) y
[brief §6.20](../front/05-plan-panel-administracion.md) sobre las tablas ya migradas de
[01 — núcleo](../../esquema/01-nucleo.md) y las convenciones de [00 — índice](./00-indice.md).
El login, el segundo factor de *acceso* y el `SessionGuard` son Fase 0 (plan 05 §6.1); aquí se
administran identidades, roles y la matriz de permisos.

## 1. Contexto y alcance

- **Resuelve:** CRUD de usuarios con alcance por sucursal, plantillas de rol clonables, matriz
  roles × permisos, asignación usuario–rol–sede, segundo factor obligatorio para administradores
  (V1) y permisos temporales por turno (V2). Un permiso retirado aplica **de inmediato**
  (RF-R5-140) y altas, bajas y suspensión quedan auditadas (RF-R5-142).
- **Fuera de alcance:** autenticación y 2FA de inicio de sesión (Fase 0, plan 05 §6.1); consulta
  de bitácoras (módulo 16); inventario de dispositivos (módulo 18); configuración de sede
  (módulo 19).
- **Supuesto:** «administrador» = rol con alcance global (`usuario_rol.sucursal_id IS NULL`) que
  incluye permisos de gobierno (`usuarios.*`, `roles.*` o `ajustes.global`). El 2FA se exige en V1
  según la respuesta por defecto de R5 §14 (#2).

## 2. Requisitos cubiertos

| ID | Requisito | Prioridad | Criterio verificable |
|---|---|---|---|
| RF-R5-140 | CRUD de usuarios, roles y permisos con alcance por sucursal | MVP | Un permiso retirado aplica de inmediato |
| RF-R5-141 | Plantillas de rol (mesero, cajero, capitán, chef, marketing, contador) | MVP | Se pueden clonar y ajustar |
| RF-R5-142 | Altas, bajas y suspensión con auditoría | MVP | Un usuario dado de baja no puede iniciar sesión |
| RF-R5-143 | Segundo factor para administradores | V1 | Obligatorio según la política del cliente |
| RF-R5-144 | Permisos temporales por turno | V2 | Expiran automáticamente y quedan auditados |

Aplican además: RN-R5-01 (auditoría completa), RN-R5-05 (solo el administrador global gestiona
usuarios y configuración global; el gerente, su sede), RN-R5-06 (permisos sensibles),
RN-R5-07 (enmascarar datos personales), RNF-R5-01 (aislamiento por sucursal), RNF-R5-06
(sesiones robustas y 2FA) y RNF-R5-09 (registro de consultas sensibles).

## 3. Rutas y pantallas

- `/usuarios` — **lista** (`DataTable` + `UserCard`): nombre, correo, roles, sucursales, último
  acceso (`usuario.ultimo_acceso_en`), estado (activo/suspendido/baja) y 2FA (V1). Acciones:
  buscar/filtrar por rol, sucursal y estado; alta; suspender/reactivar/dar de baja; abrir detalle.
- `/usuarios/nuevo` y `/usuarios/:id` — **editor** en pestañas: *Perfil* (nombre, correo, PIN),
  *Roles y alcance* (uno o varios `usuario_rol` con sede o global), *Seguridad* (2FA V1, reset,
  sesiones activas) y *Actividad* (últimos accesos y cambios; enlace a auditoría del usuario).
- `/roles` — **plantillas**: galería de roles (`es_sistema` incluidos) con conteo de permisos y
  usuarios asignados; acciones clonar, editar, crear.
- `/roles/:id` — **matriz de permisos** (`PermissionMatrix`): filas = permisos agrupados por
  módulo, columnas = rol editable; alcance del permiso visible (sucursal o global) y marca
  explícita de **sensibles** (RN-R5-06: reabrir caja, reembolsar, anular tras preparación,
  cambiar precios). La asignación por usuario y sede se hace en el editor de usuario.
- **Supuesto:** el alcance del permiso se materializa en `usuario_rol.sucursal_id` (NULL = todas
  las sucursales); `rol_permiso` no guarda sede. Si se exige un mismo rol con permisos distintos
  por sede, hará falta columna de alcance (ver §11).

## 4. Datos

Tablas exactas ([01 — núcleo](../../esquema/01-nucleo.md) §1.3) y auditoría
([04 — marketing y operación](../../esquema/04-marketing-y-operacion.md) §4.4):

| Tabla | Campos clave |
|---|---|
| `usuario` | `nombre`, `email` (único por tenant), `pin_hash`/`pin_salt`, `activo`, `ultimo_acceso_en` |
| `rol` | `nombre`, `es_sistema` (no editable/borrable si es de sistema), único por tenant |
| `permiso` | `codigo` (PK, p. ej. `pedido.anular`), `descripcion`; catálogo sembrado en F1 |
| `rol_permiso` | PK (`rol_id`, `permiso_codigo`) |
| `usuario_rol` | `sucursal_id` NULL = todas; único `(usuario_id, rol_id, sucursal_id)` |
| `evento_auditoria` | `entidad='usuario'|'rol'`, `accion`, `motivo`, `datos_antes/despues`, `creado_en` |

- **Efecto inmediato de un permiso retirado:** el servidor autoriza contra `rol_permiso` +
  `usuario_rol` en cada request (o caché con versión por tenant); al guardar, invalida sesiones y
  emite el evento de §5. El front invalida el `me` y el guard re-evalúa.
- **Huecos de esquema:** `usuario` no tiene columnas de 2FA ni de suspensión/baja más allá de
  `activo`. **Supuesto:** V1 añade el estado/2FA (tabla `usuario_2fa` o columnas) y V2 una tabla
  de permisos temporales con expiración; ambos pendientes en §11.

## 5. API propuesta

Convenciones de [`00-indice` §4.1](./00-indice.md). Acciones sensibles con `motivo` e
`Idempotency-Key`.

| Método y ruta | Para qué |
|---|---|
| `GET /admin/usuarios` | Lista paginada con filtros (rol, sede, estado, texto) |
| `POST /admin/usuarios` | Alta (nombre, correo, PIN, roles con sede) |
| `GET /admin/usuarios/:id` | Detalle + roles/alcance + último acceso |
| `PATCH /admin/usuarios/:id` | Editar perfil; cuerpo con `Idempotency-Key` |
| `POST /admin/usuarios/:id/suspender` · `/reactivar` | Suspensión/reactivación auditada (motivo) |
| `POST /admin/usuarios/:id/baja` | Baja: bloquea login y roles; auditado (motivo) |
| `PUT /admin/usuarios/:id/roles` | Reemplaza `usuario_rol` (rol + sede) |
| `GET /admin/roles` · `POST /admin/roles` | Lista de roles/plantillas y alta |
| `PATCH /admin/roles/:id` | Editar nombre; roles `es_sistema` limitados |
| `POST /admin/roles/:id/clonar` | Clona rol y sus permisos como plantilla ajustable |
| `GET /admin/roles/:id/permisos` · `PUT /admin/roles/:id/permisos` | Leer/reemplazar la matriz (`rol_permiso`) |
| `GET /admin/permisos` | Catálogo de códigos con descripción, módulo y carácter sensible |
| `POST /admin/usuarios/:id/2fa/reset` (V1) | Reinicia enrolamiento 2FA; auditado |
| `GET /admin/usuarios/:id/sesiones` · `DELETE /admin/usuarios/:id/sesiones` (V1, Supuesto) | Ver/revocar sesiones activas |

**Socket.IO** (namespace `/admin`; room `sucursal:{id}` y **Supuesto** `usuario:{id}`):

- `usuario.creado` / `usuario.actualizado` / `usuario.estado` (suspensión, baja, reactivación).
- `rol.actualizado` y `permisos.actualizados` (invalidan la caché de permisos y el `me` del front).
- `sesion.revocada` (Supuesto): cierra la sesión afectada tras una baja o retiro de permisos.

## 6. Frontend

- Módulo `modules/usuarios` (`api.ts`, `pages/`, `components/`, `types.ts`) según
  [`00-indice` §3](./00-indice.md); reutiliza `DataTable`, `FilterBar`, `DetailDrawer`,
  `StatusBadge`, `ConfirmDialog`, `ReasonSelect`, `EmptyState`, `Skeleton`, `ErrorState`.
- `UserCard` (resumen con roles/sedes), `UserForm` (react-hook-form), `RoleTemplateCard`,
  `PermissionMatrix` (buscador de permisos, agrupación por módulo, `Badge` «sensible»,
  selección por teclado AA) y `ScopeSelect` (sede o «todas» si el actor es global).
- Al guardar la matriz o los roles de un usuario: confirmación con motivo (cambio sensible),
  `409` visible si otro administrador guardó antes, y refresco duro de permisos; sin updates
  optimistas en autorización.
- Estados de lista completos (vacío con acción primaria, cargando, error con «Reintentar», sin
  permisos con explicación) conforme a R5 §8 y plan 05 §6.23.

## 7. Permisos y trazabilidad

| Pares `modulo.accion` | Uso |
|---|---|
| `usuarios.ver`, `usuarios.crear`, `usuarios.editar`, `usuarios.suspender`, `usuarios.baja` | Ciclo de vida del usuario |
| `usuarios.roles`, `roles.ver`, `roles.editar`, `roles.permisos`, `roles.clonar` | Gobierno de roles |
| `usuarios.2fa`, `usuarios.sesiones` (V1); `usuarios.permisos_temporales` (V2) | Seguridad |

- **Sensibles (Supuesto además de RN-R5-06):** `usuarios.baja`, `usuarios.roles`, `roles.permisos`
  y `usuarios.2fa`: piden confirmación con motivo y autorización (PIN/2FA según política).
- **Se audita** en `evento_auditoria`: alta/edición/baja/suspensión/reactivación de usuario,
  asignación de rol y alcance, alta/edición/clonado de rol, cambio de la matriz (antes/después
  por código), reset 2FA y revocación de sesiones; actor, hora del servidor, dispositivo, IP y
  `motivo` (RN-R5-01). La UI no permite editar ni borrar esos registros (RN-R5-02).
- **Alcance (RN-R5-05):** solo el administrador global ve todos los tenants/sedes y asigna alcance
  global; el gerente administra únicamente usuarios y roles de su sede. El servidor filtra siempre
  por alcance (RNF-R5-01); el front nunca es la única defensa. Consultas de datos personales dejan
  registro de acceso (RNF-R5-09) y se enmascaran donde no se necesitan (RN-R5-07).

## 8. Estados y casos borde

- Vacío: «Aún no hay usuarios en esta sede» / «No hay roles» con acción primaria (crear/clonar).
- Sin permiso: ítem del sidebar deshabilitado con explicación; acciones ausentes o deshabilitadas
  con tooltip «Requiere permiso de {permiso}»; la matriz en solo lectura sin `roles.permisos`.
- Conflicto (R5 §13 adaptado): dos administradores editan el mismo usuario o rol → `409` con el
  diff y gana lo confirmado por el servidor.
- Retirar un permiso o suspender a un usuario con sesión abierta: la UI re-evalúa de inmediato
  (evento + refetch); el request en vuelo recibe `403` con explicación, nunca un error críptico.
- Baja de un usuario con turno abierto: se advierte y se exige reasignar o cerrar el turno
  (**Supuesto**: no se bloquea la baja, pero se muestra el detalle pendiente).
- Correo duplicado en el tenant → `409`; PIN inválido o débil → `400` con reglas visibles.
- Salvaguarda **Supuesto**: no se permite dejar el tenant sin ningún administrador global activo.
- Rol `es_sistema`: se puede clonar y ajustar el clon, pero no renombrar ni borrar el original.

## 9. Criterios de aceptación

1. Quitar `pedidos.anular` a un rol, o suspender al usuario, impide la acción en la siguiente
   petición de una sesión ya abierta y la UI deja de ofrecerla (RF-R5-140).
2. Clonar una plantilla (mesero, cajero, capitán, chef, marketing, contador), ajustarla y asignarla
   a un usuario produce exactamente los permisos esperados (RF-R5-141).
3. Un usuario dado de baja no puede iniciar sesión y el cambio aparece en `evento_auditoria` con
   actor, hora, motivo y estado antes/después (RF-R5-142).
4. Con 2FA activo (V1), un administrador sin segundo factor enrolado no completa el acceso y el
   reset queda auditado (RF-R5-143).
5. V2: un permiso temporal por turno caduca solo al expirar y su concesión/caducidad queda
   auditada (RF-R5-144).
6. Un gerente de sede no ve ni administra usuarios fuera de su alcance; el intento directo a la
   API responde `403` (RN-R5-05, RNF-R5-01).

## 10. Plan de trabajo

- **F1 — API/datos:** sembrar `permiso` (códigos `modulo.accion` con marca de sensible); CRUD de
  usuarios, roles y matriz; reglas de alcance; validaciones y `409`; 2FA V1 (esquema + enrolamiento)
  y diseño de permisos temporales V2.
- **F2 — Lectura/lista:** `/usuarios` y `/roles` con `DataTable`, filtros en URL, `SavedView`,
  estados completos y `UserCard`.
- **F3 — Detalle/acciones:** editor de usuario (roles/alcance), `PermissionMatrix` con sensibles,
  suspender/baja/reactivar con motivo, clonado de roles, guard de acciones.
- **F4 — Efectos/en vivo:** invalidación de permisos en caliente (eventos + refetch), revocación de
  sesiones, enlace a auditoría del usuario y registro de accesos.
- **F5 — Pruebas:** verificar los criterios de §9 (revocación inmediata, baja sin login, clonado,
  2FA, alcance del gerente y `403` en API), más accesibilidad AA de la matriz.

## 11. Dependencias y pendientes

- **Depende de:** Fase 0 ([`00-indice` §5](./00-indice.md)) — router, shell con nuevo bloque
  Configuración, sesión/`SessionGuard`, `lib/api.ts`, kit UI y helper de auditoría; esquema ya
  migrado; módulo 16 para consultar los registros de auditoría.
- **Pendientes de decisión:**
  - Dónde persistir el 2FA (tabla propia vs. columnas) y quién puede restablecerlo (supuesto:
    administrador global, con motivo).
  - Si el alcance debe vivir en `rol_permiso` (permisos distintos por sede para un mismo rol) —
    hoy solo `usuario_rol.sucursal_id` expresa alcance.
  - Modelo de permisos temporales por turno (RF-R5-144): relación con `turno`, expiración y job
    de caducidad.
  - Preguntas abiertas de R5 §14 que afectan: #1 (dispositivos de uso del panel), #2 (2FA en V1),
    #8 (rol dueño con alcance por sucursal).
