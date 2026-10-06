# 02 — Avisos (bandeja, alertas y notificaciones del mesero)

**Rutas:** `/(app)/avisos` · **Prioridad:** MVP RF-R3-64 (avisos de sistema/offline); **V1**
RF-R3-13, 35, 47 y 63; **V2** RF-R3-15, 36 y 48 · **Módulo 02** de la serie
([índice](./00-indice.md)). Brief: [plan 03 §6.17 y §5.6](../front/03-plan-apk-mesero.md);
requisitos: [R3 §5.4–§5.6 y §8](../../requerimientos/03-apk-mesero.md). Ante conflicto, manda R3.

## 1. Contexto y alcance

La **bandeja de avisos** del mesero y su cara en vivo: un **toast global** y un **badge** en la barra
inferior. Reúne todo lo que exige reacción durante el turno: **comanda lista** (RF-R3-35, aviso
sonoro/vibración), **SLA excedido**, **pedido web de mesa** por atender (RF-R3-47), **reserva
próxima** (RF-R3-13), **sincronización fallida** (RF-R3-64, 63), y en V2 **solicitud de cuenta por
QR** (RF-R3-48), **ocupación prolongada** (RF-R3-15) y **agotados** (RF-R3-36). Cada aviso lleva a
la mesa entidad y se marca **atendido**.

**Alcance:** bandeja con filtros, toasts en vivo, badge, y **ajustes de sonido/vibración por tipo**
(con sonidos **distintos** entre «listo» y «SLA excedido»).

**Fuera de alcance:** resolver la operación en sí (servir la comanda, atender la mesa, cobrar); el
aviso **abre** la pantalla que corresponde (Comandas, Salón, Cuenta) y ahí se opera. Tampoco cubre
la cola de sincronización detallada (plan 03 §6.18), a la que solo enlaza.

**Origen de los avisos (dos fuentes).** El módulo compone avisos de naturaleza distinta:

- **Alertas operativas persistentes** → tabla `alerta_operativa` (`tipo`: `impresora`, `dispositivo`,
  `sync`, `sla`, `stock`; `estado`: `abierta`/`atendida`/`descartada`; `atendida_por`, `atendida_en`).
  Son las que sobreviven y se comparten entre usuarios. **En esta instalación el tipo `impresora`
  no aplica** (no hay impresoras: las comandas llegan al KDS en un TV).
- **Eventos operativos en vivo** → derivados de `comanda.estado='lista'`, `pedido` web de mesa y
  `reserva` próxima, que hoy **no** tienen una bandeja con estado leído/atendido por destinatario.

**Supuesto/pendiente (dato).** `alerta_operativa.tipo` **no** incluye hoy `comanda_lista`,
`pedido_web`, `reserva` ni `cuenta_qr`; los tipos del enum son `impresora`, `dispositivo`, `sync`,
`sla`, `stock`. Opciones para cerrar la brecha (decidir con el plan de backend/API):

1. **Derivar** esos avisos del estado de `comanda`/`pedido`/`reserva` y guardar solo el «visto» **en
   el dispositivo** (simple, sin historial multi-dispositivo).
2. Añadir una tabla ligera **`aviso_bandeja`** (+ `aviso_destinatario`/ack por usuario) o reutilizar
   `notificacion` con `canal='push'`, `destinatario_tipo='usuario'` para la entrega.

Recomendación: `alerta_operativa` para lo de sistema y una **tabla nueva** para lo operativo con ack
por usuario (opción 2); mientras no exista, el MVP usa la opción 1 y amplía el enum/crea la tabla en
V1. Este documento no da por sentada ninguna de las dos.

## 2. Requisitos cubiertos

| RF-R3 | Requisito | Prioridad | Criterio de aceptación | RN/RNF |
|---|---|---|---|---|
| 64 | Indicar el estado de conexión y lo pendiente de sincronizar | MVP | El mesero sabe si su operación ya llegó | RN-R3-13 |
| 63 | Avisar y resolver conflictos cuando dos meseros tocan la misma mesa | V1 | Prevalece la operación confirmada por el servidor | — |
| 35 | Recibir aviso sonoro o vibración cuando una comanda está lista | V1 | El aviso distingue «listo» de «SLA excedido» | RNF-R3-04 |
| 47 | Ver y atender el pedido web de la mesa (QR) | V1 | El mesero lo ve y puede complementarlo | RN-R3-11 |
| 13 | Ver la reserva próxima de una mesa y el estado de no-show | V1 | El mesero ve la reserva y puede sentar o liberar | — |
| 36 | Marcar un producto como agotado desde el salón | V2 | El agotado se refleja en todas las interfaces | — |
| 15 | Alerta de mesa con ocupación prolongada | V2 | Se muestran mesas que superan el umbral | — |
| 48 | Solicitar la cuenta desde el QR y verlo en el APK | V2 | El aviso llega al mesero responsable | — |

Aplican RNF-R3-01 (offline fiable), RNF-R3-04 (batería/datos) y RNF-R3-09 (accesibilidad). El aviso
nunca oculta la operación: solo la señala.

## 3. Rutas y pantallas

| Ruta / componente | Pantalla | Contenido y acciones |
|---|---|---|
| `/(app)/avisos` | Bandeja | Secciones **Sin atender** / **Atendidas hoy**; chips por tipo (Todas · Comandas · Mesas · Reservas · Sistema); cada fila: icono + texto + **mesa** + hora + acción |
| `AlertToast` (global, `(app)/_layout`) | Toast en vivo | Aparece sobre la pantalla actual con acciones **Abrir** / **Atender**; haptics + sonido según tipo |
| Badge en la barra inferior | Contador | Nº de avisos **sin atender** (no desaparece si el filtro «Mis mesas» está activo, RF-R3-14) |
| `AvisosSettingsSheet` | Ajustes | Sonido y vibración **por tipo**; deja claro que «listo» y «SLA excedido» suenan distinto; permiso del sistema (expo-notifications) |
| `AlertDetailSheet` (V1) | Detalle | Contexto del aviso (comanda/pedido/reserva/sync), responsable y botón a la pantalla que lo resuelve; enlace a la **cola de sync** (plan 03 §6.18) |

El filtro y la sección elegida viven en la Ruta (compartible). El toast **no** interrumpe una captura
en curso: si hay una hoja abierta, se pospone y se muestra al cerrarla.

## 4. Datos

| Tabla | Uso y campos clave |
|---|---|
| `alerta_operativa` | `sucursal_id`, `tipo` (`impresora`/`dispositivo`/`sync`/`sla`/`stock`; `impresora` no aplica aquí), `severidad` (`baja`/`media`/`alta`), `entidad`, `entidad_id`, `estado` (`abierta`/`atendida`/`descartada`), `atendida_por`, `atendida_en`, `creado_en` |
| `comanda` | Aviso **comanda lista**: `estado='lista'`, `estacion_id`, `pedido_id`, sellos `lista_en`/`entregada_en` |
| `pedido` | Aviso **pedido web**: `canal='web'`, `modalidad='mesa'`, `estado` en curso y mesa; RN-R3-11 |
| `reserva` | Aviso **reserva próxima**: `fecha_hora`, `estado` (`confirmada`), `mesa_id`; no-show; RF-R3-13 |
| `umbral_alerta` | Umbrales por `tipo` y `rol_destinatario` (SLA, ocupación prolongada RF-R3-15) |
| `sync_operacion` | Aviso **sync fallida**: `estado='rechazada'`/`error`; conflicto RF-R3-63 |
| `dispositivo`, `usuario` | Destino/actor del aviso y responsable de la mesa (RF-R3-48) |
| `notificacion` | *(Opcional, supuesto)* `canal='push'`, `destinatario_tipo='usuario'` para entrega push real |
| `evento_auditoria`, `bitacora_evento` | Registro del atendido/descartado y de los conflictos |
| `analytics.mv_sla_estacion` | Respaldo del aviso de SLA excedido |

**Ampliación de datos (pendiente).** Para el aviso **comanda lista** y compañía con estado
**leído/atendido por usuario** e historial multi-dispositivo hace falta **tabla nueva** (opción 2 de
§1) o admitir que el «visto» sea **solo local**. El MVP arranca con lo local; al crear la tabla se
migran los pendientes.

## 5. API propuesta

REST bajo `/mesero/…` (§4.1 del índice).

| Método y ruta | Propósito |
|---|---|
| `GET /mesero/avisos` | Bandeja: filtros `tipo`, `estado`, `turnoId`; mezcla `alerta_operativa` + avisos derivados; paginada |
| `POST /mesero/avisos/:id/atender` | Marca atendido (`atendida_por`, `atendida_en`); `Idempotency-Key` |
| `POST /mesero/avisos/:id/descartar` | Descarta (permiso de supervisor); `motivo` obligatorio |
| `GET` / `PUT /mesero/avisos/preferencias` | Sonido/vibración por tipo (o local en `expo-secure-store`) |
| `POST /mesero/dispositivos/:id/push-token` | *(Supuesto)* Registra el token para push; opcional según §1 |
| V1 `GET /mesero/avisos/stream` | *(Alternativa a Socket.IO)* canal de avisos si no se usa WebSocket |

**Eventos Socket.IO** (room `sucursal:{sucursalId}` y `mesa:{id}`): `comanda.estado`
(`lista` → aviso «comanda lista»; `en_preparacion` con SLA vencido → aviso SLA), `pedido.web`,
`reserva.proxima`, `alerta.creada` (sistema: sync, stock, SLA), `sync.estado`,
`dispositivo.estado`. Al reconectar, refetch de la bandeja.

## 6. Frontend

Componentes compartidos (Fase 0): `ConnectionPill`, `OfflineBanner`, `StatusBadge`, `EmptyState`,
`Skeleton`, `ErrorState`, `RelativeTime`, `Sheet`.

Propios: `AvisosInbox`, `AlertRow`, `AlertToast`, `AlertTypeIcon`, `AvisosBadge`,
`AvisosSettingsSheet`, `AlertDetailSheet`, `SlaBadge` (reutilizado).

- **Sonidos distintos:** «comanda lista» usa el canal/tono de listo; «SLA excedido» usa otro más
  urgente (RF-R3-35). El ajuste por tipo lo explica con texto, no solo con iconos.
- Los avisos de **sistema/offline** (sync) se distinguen con el token `sync`/`offline`
  del plan 03 §3 y **no** usan el tono de «listo».
- El badge cuenta **sin atender**; «Atender» desde el toast o la fila; tocar la fila **abre** la
  entidad (mesa/comanda/reserva).
- **Offline:** los avisos generados sin red (conflictos, fallos de entrega al KDS) se muestran
  igual; se reconcilian al reconectar (RF-R3-63, 64).

## 7. Permisos y trazabilidad

| Permiso | Cubre |
|---|---|
| `avisos.ver` | Bandeja, toasts y badge |
| `avisos.atender` | Marcar atendido |
| `avisos.descartar` | Descartar alertas (supervisor; `motivo`) |
| `avisos.configurar` | Preferencias de sonido/vibración |

`alerta_operativa` ya guarda `atendida_por`/`atendida_en`; el atendido y el descartado escriben
**`evento_auditoria`** con motivo y actor, y los conflictos de sync dejan **`bitacora_evento`**.
Inmutable.

## 8. Estados y casos borde

| Caso | Diseño |
|---|---|
| Sin conexión | Se siguen viendo avisos derivados locales; los de servidor entran al reconectar; `OfflineBanner` visible |
| Comanda lista sin red | Llega al reconectar (evento del KDS no se adelanta); se empuja en el refetch |
| Conflicto de sync (dos meseros) | Aviso `sync` de severidad alta con enlace a la cola; prevalece lo confirmado por el servidor (R3 §16) |
| Aviso duplicado | Deduplicación por `entidad`+`entidad_id`+`tipo` (o `client_op_id`); el badge no infla el conteo |
| Alerta descartada sin permiso | Rechazo con motivo registrado (supervisor) |
| Reserva no-show | Aviso con acción «Sentar»/«Liberar» (RF-R3-13); si se libera, la mesa vuelve a `libre` |
| Pedido web mientras el mesero edita la mesa | Toast no invasivo; al abrir, evita la doble captura (R3 §16) |
| Permiso de notificaciones denegado en el SO | Se avisa y se ofrece ir a ajustes; la bandeja sigue funcionando |
| Sesión expirada en segundo plano | Al volver, lock con PIN; los avisos acumulados se muestran tras desbloquear |
| Vacío / cargando / error / sin permisos | Patrón §4.7 con `EmptyState`, `Skeleton`, `ErrorState` |

## 9. Criterios de aceptación

1. El badge y la bandeja cuentan solo los avisos **sin atender**; atender uno lo mueve a «Atendidas
   hoy» de forma persistente (sobrevive a reabrir la app).
2. Una comanda que pasa a `lista` dispara **toast + sonido/vibración** en < 2 s con la app abierta, y
   el sonido es **distinto** al de «SLA excedido» (RF-R3-35).
3. Cada tipo de aviso **abre** la entidad correcta (mesa/comanda/reserva) y nunca duplica captura
   (RN-R3-11).
4. Los avisos de **sincronización fallida** y de **conflicto** son visibles, reintentables y enlazan
   con la cola; nada se pierde ni se duplica (RN-R3-13).
5. Los **ajustes por tipo** se respetan (silenciar «listo» no silencia «SLA excedido»).
6. Sin conexión, la bandeja sigue respondiendo y se reconcilia al reconectar.

## 10. Plan de trabajo

- [ ] **F1 API/datos:** bandeja con `alerta_operativa` + derivados; `atender`/`descartar`; preferencias;
      decisión de tabla nueva (cierre del supuesto de §1) con el backend.
- [ ] **F2 lectura/lista:** `/(app)/avisos` con secciones, chips y `AlertRow`; badge en la barra;
      estados vacío/cargando/error.
- [ ] **F3 detalle/acciones:** `AlertToast` global y «Abrir/Atender»; `AlertDetailSheet` y enlace a
      la cola de sync.
- [ ] **F4 en vivo/notificaciones:** Socket.IO de avisos; `AvisosSettingsSheet` y canales de sonido/
      vibración de `expo-notifications`; push si se aprueba.
- [ ] **F5 pruebas:** sonidos distintos, deduplicación, offline y permisos.
- [ ] **V1:** comanda lista, SLA excedido, pedido web y reserva próxima con ack por usuario.
- [ ] **V2:** solicitud de cuenta QR, ocupación prolongada y agotados.

## 11. Dependencias y pendientes

- **Fase 0**, **Comandas** (mismo `ComandaCard`), **Salón** (abre la mesa), **Reservas** (emite
  `reserva.proxima`), **web de pedidos** (emite `pedido.web`), **KDS** (emite `comanda.estado`) y el
  **módulo de sync** del plan 03 §6.18.
- **Pendiente crítico:** cerrar la decisión de datos de §1 (tabla nueva de avisos vs. derivar + visto
  local vs. `notificacion` push). Afecta al plan de backend/API, no a R3.
- Preguntas de R3 §17 que lo afectan: hardware y política de notificaciones; si cambian, revisar este
  módulo con fecha y RF.
