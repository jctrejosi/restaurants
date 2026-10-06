# 05 — Salón (mapa, zonas, mesas, uniones y aforo)

**Ruta:** `/salon` · **Prioridad:** MVP RF-R5-20 y 21; **V1** RF-R5-22 (unión/división) y 23
(franjas y aforo) · **Módulo 05** de la serie ([índice](./00-indice.md)). Brief:
[plan 05 §6.8](../front/05-plan-panel-administracion.md); requisitos:
[R5 §4.3](../../requerimientos/05-panel-administracion.md). Ante conflicto, manda R5.

## 1. Contexto y alcance

Mantiene el mapa del salón: zonas y mesas con capacidad y posición, sus estados, el bloqueo por
mantenimiento, las uniones/divisiones y las franjas y aforo por zona que limitan la disponibilidad de
la web. El mapa debe coincidir con el salón real (RF-R5-20) y la vista previa «así lo verá el mesero»
reutiliza los estados del plan 03 (APK).

Fuera de alcance: abrir/cerrar sesiones de mesa (lo hace el APK del mesero; el panel observa),
cobrar mesas (módulos 11–12) y la operación de pedidos (módulo 02).

**Supuesto:** unión/división (V1) y aforo por franja/zona (V1) requieren soporte que hoy no está en el
esquema: una tabla de composiciones de mesas y una relación franja↔zona. Se proponen en F1-V1 como
migración nueva; hasta entonces esos ítems quedan deshabilitados con explicación.

## 2. Requisitos cubiertos

| RF-R5 | Requisito | Prioridad | Criterio de aceptación | RN/RNF |
|---|---|---|---|---|
| 20 | CRUD de zonas y mesas con capacidad y posición en el mapa | MVP | El mapa coincide con el salón real | RN-R5-01 |
| 21 | Estados de mesa y bloqueo por mantenimiento (`fuera_servicio`) | MVP | Una mesa bloqueada no se ofrece | RN-R5-11 |
| 22 | Unión y división de mesas | V1 | Configuraciones guardadas y reflejadas en el APK | RN-R5-01 |
| 23 | Franjas y aforo por zona para reservas | V1 | Limita la disponibilidad de la web | RN-R5-11 |

Aplican RNF-R5-01 (alcance por sede), RN-R5-04 (los cambios de salón no alteran reservas creadas) y
RNF-R5-07 (accesibilidad y teclado para el mapa).

## 3. Rutas y pantallas

| Ruta | Pantalla | Contenido y acciones |
|---|---|---|
| `/salon` | Mapa (pestaña por defecto) | `FloorMapEditor`: zonas y mesas arrastrables con capacidad y estado; toolbar de alta, selección múltiple, alinear y guardar; panel lateral de edición |
| `/salon?vista=elementos` | Zonas y mesas (pestaña) | `DataTable` de zonas y mesas (capacidad, estado, activa, posición); altas, bajas y edición |
| `/salon?vista=uniones` (V1) | Uniones (pestaña) | Configuraciones guardadas de mesas unidas; crear, editar y dividir; aviso de solapes |
| `/salon?vista=aforo` (V1) | Franjas y aforo (pestaña) | Aforo por zona y franja; muestra el efecto sobre disponibilidad de reservas |
| `/salon/preview` o botón «Vista del mesero» | Vista previa | Render de solo lectura con los estados del APK (plan 03 §3); sin acciones |

El estado de cada mesa se pinta con el mismo vocabulario del esquema: `libre`, `ocupada`,
`por_cobrar`, `reservada` y `fuera_servicio` (bloqueo por mantenimiento).

## 4. Datos

| Tabla | Uso y campos clave |
|---|---|
| `zona` | `nombre`, `aforo`, `orden`; una zona por sede se identifica por `uq_zona` |
| `mesa` | `numero`, `capacidad`, `estado` (`libre`/`ocupada`/`por_cobrar`/`reservada`/`fuera_servicio`), `pos_x`/`pos_y`, `activa`, `zona_id` |
| `mesa_asignacion` | Mesero ↔ zona o mesa por turno (`desde`, `hasta`; alcance excluyente) |
| `sesion_mesa` | Sesión QR abierta/cerrada por el APK; el panel la consulta para pintar ocupación |
| `reserva`, `politica_reserva` | Estado `reservada`, franjas y límites de personas que el salón debe respetar |
| `regla_capacidad` ([01-núcleo](../../esquema/01-nucleo.md)) | Máximo de pedidos por franja de la sede; acota la operación junto al aforo |
| `horario_atencion`, `cierre_temporal` | Franjas vigentes y bloqueos que el mapa debe señalar |
| `turno`, `usuario` | Turno en curso y mesero asignado |
| `evento_auditoria`, `bitacora_evento` | Auditoría de cambios de mapa/estado; `bitacora_evento` hoy solo admite reserva/pedido/comanda/pago/turno |

Notas: la baja de una mesa se hace con `activa=false` (no se borra); `fuera_servicio` es el bloqueo
operativo temporal y **no se ofrece** en web, APK ni quiosco. Los cambios de `capacidad` o estado no
tocan reservas ya creadas (RN-R5-04).

## 5. API propuesta

REST bajo `/admin/…`, paginación `{ data, total, page, pageSize }`, filtros por query.

| Método y ruta | Propósito |
|---|---|
| `GET /admin/salon/mapa` | Zonas, mesas, posiciones, estados, ocupación y asignaciones del turno (pinta editor y vista previa) |
| `GET` / `POST` / `PATCH` / `DELETE /admin/salon/zonas[/:id]` | CRUD de zonas; borrar con mesas o reservas asociadas responde 409 |
| `GET` / `POST` / `PATCH` / `DELETE /admin/salon/mesas[/:id]` | CRUD de mesas; alta masiva por zona |
| `PATCH /admin/salon/mapa` | Guardado por lote de posiciones (arrastre); `Idempotency-Key`; valida pertenencia a la zona |
| `POST /admin/salon/mesas/:id/estado` | Bloqueo `fuera_servicio`, reactivación o cambio manual con motivo; `Idempotency-Key` |
| `GET` / `POST` / `DELETE /admin/salon/asignaciones[/:id]` | Asignación de meseros por zona o mesa en el turno |
| `GET /admin/salon/preview` | Payload de la vista «así lo verá el mesero» (solo lectura) |
| V1 `GET` / `POST /admin/salon/uniones` y `DELETE /admin/salon/uniones/:id` | Configuraciones de mesas unidas y división; **Supuesto**: tabla nueva de composiciones |
| V1 `GET` / `PUT /admin/salon/zonas/:id/franjas` | Aforo por zona y franja; **Supuesto**: tabla nueva franja↔zona |
| `POST /admin/salon/exportaciones` | Plano del salón (PDF/PNG) y listados; registro en `exportacion` |

**Eventos Socket.IO** (namespace `/admin`, room `sucursal:{sucursalId}`): `mesa.estado` (cambios
operativos), `salon.mapa` (**Supuesto** de nombre para altas/bajas y posiciones), `sesion.estado`
(apertura/cierre de sesión por el APK; Supuesto), `reserva.estado` y `corte`/`sync.pendiente` cuando un
dispositivo queda desactualizado. Al reconectar se refetch del mapa completo.

## 6. Frontend

Componentes compartidos: `DataTable`, `FilterBar`, `DetailDrawer` (edición de mesa/zona), `StatusBadge`
(estados de mesa), `ConfirmDialog`, `ReasonSelect` (bloqueo), `EmptyState`, `Skeleton`, `ErrorState`,
`MoneyCell` no aplica. Propios: `FloorMapEditor`, `FloorMapCanvas` (zoom, cuadrícula, alineación),
`TableShape`, `ZoneOverlay`, `TableInspector`, `UnionEditor` (V1), `AforoGrid` (V1),
`MeseroPreview`.

- Editor con arrastrar y soltar; guardado por lotes con indicador de cambios sin guardar y
  confirmación al salir.
- Estados con semáforo y tooltip (desde cuándo y por quién); la vista previa reutiliza el mismo
  render en modo lectura.
- Aviso destacado si una mesa bloqueada tiene reservas futuras o sesión abierta.
- Accesible por teclado (mover mesa con flechas y confirmar con Enter, RNF-R5-07).

## 7. Permisos y trazabilidad

| Permiso | Cubre |
|---|---|
| `salon.ver` | Mapa, listados, vista previa |
| `salon.zonas` / `salon.mesas` | CRUD de zonas y mesas |
| `salon.mapa` | Edición de posiciones por lote |
| `salon.estado` | Bloqueo `fuera_servicio`, reactivación y cambios manuales |
| `salon.asignaciones` | Asignación de meseros por turno |
| `salon.uniones` (V1) / `salon.aforo` (V1) | Uniones y franjas/aforo |
| `salon.exportar` | Exportaciones (RN-R5-10) |

Toda mutación (zonas, mesas, posiciones, estado, asignaciones, uniones y aforo) escribe
`evento_auditoria` con entidad `zona`/`mesa`/`mesa_asignacion` y antes/después. El bloqueo por
mantenimiento exige motivo (RN-R5-01). `bitacora_evento` no admite hoy estas entidades (su CHECK solo
cubre reserva, pedido, comanda, pago y turno); si operación pide bitácora de mesas, se amplía el CHECK
en una migración y se enlaza igual que el resto (plan 05 §8).

## 8. Estados y casos borde

| Caso | Diseño |
|---|---|
| Dos administradores editan la misma mesa | Aviso de conflicto y gana lo confirmado por el servidor (plan 05 §6.23) |
| Mesa con sesión abierta o reserva futura | Bloquear/desactivar advierte y pide confirmación; si la operación lo exige, 409 con detalle |
| Borrar zona con mesas o reservas | Se rechaza con 409 y el detalle del vínculo |
| Mesa `fuera_servicio` | No aparece como candidata en disponibilidad de reservas ni en web/APK (`activa=false` tampoco) |
| Unión con solape o mesa repetida | Se valida al guardar; la configuración anterior se conserva |
| Cambio de aforo/capacidad | No altera reservas creadas; se avisa del efecto en disponibilidad futura |
| Dispositivo con mapa desactualizado | Se muestra en el diagnóstico (`sync.pendiente`), nunca se oculta |
| Zona horaria de sede ≠ administrador | Franjas y bloqueos en la zona de la sede (RNF-R5-08) |
| Sin permisos / vacío / cargando / error | Patrón del plan 05 §6.23, con `EmptyState` y «Reintentar» |

## 9. Criterios de aceptación

1. El CRUD de zonas y mesas guarda capacidad y posición y el mapa renderizado coincide con el salón
   real (validable con la vista previa y el plano exportado).
2. Una mesa con `estado='fuera_servicio'` o `activa=false` no se ofrece en la disponibilidad de
   reservas ni en las interfaces de cliente/mesero.
3. Cada cambio de mapa o estado queda auditado con actor, motivo y antes/después.
4. Las configuraciones de unión/división se guardan y se reflejan en el APK (V1).
5. Las franjas y el aforo por zona limitan la disponibilidad de la web (V1), sin tocar reservas ya
   creadas.
6. Los estados de mesa visibles coinciden con En vivo y con la ocupación usada en reportes.

## 10. Plan de trabajo

- [ ] **F1 API/datos:** módulo NestJS `salon`; CRUD de zonas/mesas; guardado por lotes; permisos y
      auditoría; validaciones de unicidad (`uq_zona`, `uq_mesa`).
- [ ] **F2 lectura/lista:** pestaña Zonas y mesas + primera versión del mapa en solo lectura con
      estados y ocupación.
- [ ] **F3 detalle/acciones:** editor con arrastre, inspector, bloqueo con motivo, asignaciones de
      meseros y confirmaciones.
- [ ] **F4 en vivo/exportación:** `mesa.estado` y `salon.mapa`; vista previa del mesero; exportar
      plano; refetch al reconectar.
- [ ] **F5 pruebas:** permisos, conflictos de edición, conflicto al borrar zona, bloqueo no ofrecido y
      accesibilidad del editor.
- [ ] **V1:** migración de composiciones y de franja↔zona; pestañas Uniones y Aforo; reflejo en APK.

## 11. Dependencias y pendientes

- **Fase 0** y **Salón** comparte datos con **Reservas** (módulo 03), **En vivo** (estados de mesa) y
  **Pedidos** (ocupación/sesión); **Dispositivos** para el reflejo en APK; **Usuarios** para meseros.
- Preguntas de R5 §14 que lo afectan: alcance de la unión/división (solo V1), recurrencia y alcance de
  bloqueos, y si se requiere bitácora propia de mesas además de auditoría.
- **Pendientes técnicos:** definir el modelo exacto de composiciones de mesas y de franja↔zona
  (tablas nuevas propuestas) y confirmar con operación la semántica de `fuera_servicio` frente a
  `activa=false`.
