# 03 — Reservas (calendario, lista y detalle; bloqueos y festivos)

**Rutas:** `/reservas`, `/reservas/calendario`, `/reservas/:id` · **Prioridad:** MVP RF-R5-40…44 y 47;
**V1** RF-R5-45 (depósitos) y 46 (bloqueos y festivos) · **Módulo 03** de la serie
([índice](./00-indice.md)). Brief: [plan 05 §6.5–6.6](../front/05-plan-panel-administracion.md);
requisitos: [R5 §4.5 y §5.1](../../requerimientos/05-panel-administracion.md). Ante conflicto, manda R5.

## 1. Contexto y alcance

Gestiona la reserva desde que se solicita hasta que se libera la mesa: calendario y lista por sede,
asignación de mesa sin sobre-asignar, lista de espera, políticas por sucursal y la bitácora completa
del ciclo de vida. Incluye una **subpágina de bloqueos y festivos** (V1) que muestra el impacto sobre
las reservas futuras y permite notificar y reubicar.

Fuera de alcance: la captación por web/APK (plan 01) y el cobro del depósito en sí, que se concilia
con Caja y Pagos (módulos 11–12). Las reservas no se borran: se cancelan (RN-R5-09).

**Supuesto:** la subpágina de bloqueos vive como pestaña de `/reservas` con deep-link `?vista=bloqueos`
(no se añade ruta nueva al mapa del índice); la creación manual de una reserva se registra como
`solicitada` + `confirmada` en el mismo acto, salvo que la política exija confirmación posterior.

## 2. Requisitos cubiertos

| RF-R5 | Requisito | Prioridad | Criterio de aceptación | RN/RNF |
|---|---|---|---|---|
| 40 | Listado y calendario por sede, fecha y estado | MVP | Filtros combinables y exportables | RNF-R5-04, RN-R5-10 |
| 41 | Crear, editar, reubicar y cancelar manualmente | MVP | Toda acción manual queda registrada | RN-R5-01, RN-R5-06 |
| 42 | Asignación de mesa y lista de espera | MVP | No se sobre-asigna una mesa | RN-R5-09 |
| 43 | Políticas: antelación, duración, tolerancia, máximo, depósito, no-show | MVP | Rigen la web y el panel | RN-R5-04 |
| 44 | Marcar `sentada`, finalizar y `no_show` | MVP | Actualiza ocupación y reportes | RN-R5-08, RN-R5-11 |
| 45 | Depósitos, cobros y reembolsos | V1 | Se concilia con caja | RN-R5-06, RN-R5-12 |
| 46 | Bloqueos por festivos, cierres y eventos | V1 | La web no ofrece esas franjas | RN-R5-11 |
| 47 | Bitácora de la reserva | MVP | Actor, canal, hora y resultado por evento | RN-R5-01, RN-R5-02 |

Aplican además RNF-R5-01 (alcance por sede), RNF-R5-08 (zona horaria de la sede) y RN-R5-07
(enmascarar contacto para roles que no lo necesitan).

## 3. Rutas y pantallas

| Ruta | Pantalla | Contenido y acciones |
|---|---|---|
| `/reservas` | Lista (pestaña) | `DataTable` con filtros sede, fecha, estado, origen, personas y «con depósito»; exportar; alta de reserva; abrir detalle |
| `/reservas/calendario` | Calendario (pestaña) | `ReservationCalendar` por día/semana y sede, bloques por estado; panel lateral con lista de espera y próximas llegadas; asignar mesa |
| `/reservas/:id` | Detalle en `DetailDrawer` (deep-link) | Pestañas **Resumen**, **Bitácora** y **Depósito** (V1); reubicar, cancelar, sentar, finalizar, no-show, editar |
| `/reservas?vista=bloqueos` | Bloqueos y festivos (V1) | Cierres, festivos y eventos por sede/zona y rango; impacto en reservas; notificar y reubicar |
| `/reservas?panel=politicas` | Políticas (drawer) | Edición de `politica_reserva` por sucursal |

El detalle abre como drawer sobre la lista/calendario y es enlazable por URL. Calendario y lista
comparten filtros (viven en la URL, materializables como `SavedView`).

## 4. Datos

| Tabla | Uso y campos clave |
|---|---|
| `reserva` | Entidad principal: `fecha_hora`, `duracion_min`, `periodo` (tstzrange), `personas`, `zona_id`, `mesa_id`, `estado` (`solicitada`/`confirmada`/`sentada`/`no_show`/`cancelada`), `codigo`, `origen`, `politica_snapshot`, `deposito_requerido/pagado`, sellos `sentada_en`, `finalizada_en`, `no_show_en` |
| `politica_reserva` | Una fila por sucursal: antelaciones, `duracion_min`, `tolerancia_min`, `cancelacion_horas`, `maximo_personas`, `deposito_regla`, `no_show_regla` |
| `lista_espera` | Estados `esperando`/`ofrecida`/`aceptada`/`expirada`/`cancelada`, `franja_deseada`, `vigencia_hasta` |
| `mesa`, `zona` | Mesas candidatas (`capacidad`, `estado <> 'fuera_servicio'`, `activa`), zonas y `aforo` |
| `mesa_asignacion`, `sesion_mesa` | Ocupación real al sentar; la sesión la abre el APK al ocupar la mesa (el panel solo observa) |
| `cierre_temporal` (bloqueos y festivos) | `desde`, `hasta`, `motivo`; **Supuesto:** festivos/eventos y su recurrencia se modelan como filas de `cierre_temporal`; si se pide recurrencia o alcance por zona, hace falta migración nueva |
| `horario_atencion`, `regla_capacidad` | Franjas vigentes y máximo de pedidos por franja para calcular disponibilidad |
| `cliente` | Vínculo opcional y datos de contacto (enmascarados por rol) |
| `bitacora_evento`, `evento_auditoria` | Bitácora (`entidad_tipo='reserva'`) y auditoría de toda mutación |

Notas: `politica_snapshot` conserva la política vigente al crear (RN-R5-04); `periodo` lo mantiene el
trigger `tg_reserva_periodo`; el solape por mesa lo bloquea el constraint `ex_reserva_mesa_solape`
(btree_gist) para estados `solicitada`/`confirmada`/`sentada`. Los reportes de reservas salen de
`analytics.mv_reservas_diarias` (RN-R5-03), nunca de consultas en caliente.

## 5. API propuesta

REST bajo `/admin/…` con paginación `{ data, total, page, pageSize }`, filtros por query y fechas ISO.

| Método y ruta | Propósito |
|---|---|
| `GET /admin/reservas` | Lista filtrable (sede, rango, estado, origen, personas, con depósito, texto) y exportable |
| `GET /admin/reservas/calendario` | Reservas del rango + lista de espera + próximas llegadas para pintar el calendario |
| `GET /admin/reservas/disponibilidad` | Franjas y mesas candidatas; descuenta bloqueos, solapes, `fuera_servicio`, aforo y política |
| `GET /admin/reservas/:id` | Detalle con cliente, política aplicada, mesa y sellos |
| `GET /admin/reservas/:id/bitacora` | Timeline §5.1 con antes/después y tiempos clave |
| `POST /admin/reservas` | Alta manual (canal `telefono`/`mostrador`); `Idempotency-Key` |
| `PATCH /admin/reservas/:id` | Edición de datos y notas (no cambia estado) |
| `POST /admin/reservas/:id/reubicar` | Cambio de fecha/mesa; valida solape; motivo obligatorio |
| `POST /admin/reservas/:id/cancelar` | Cancelación local o de cliente con motivo; registra `cancelada_local`/`cancelada_cliente` |
| `POST /admin/reservas/:id/sentada` | Marca llegada con mesa asignada; `Idempotency-Key` |
| `POST /admin/reservas/:id/finalizar` | Cierra la reserva; habilita duración de mesa |
| `POST /admin/reservas/:id/no-show` | Marca no-show con hora y actor |
| `GET` / `PUT /admin/reservas/politicas` | Consulta y edición de `politica_reserva` por sucursal |
| `GET` / `POST /admin/reservas/lista-espera` | Cola de espera; `POST /admin/reservas/lista-espera/:id/asignar` la convierte en reserva |
| V1 `POST /admin/reservas/:id/deposito` | Registra depósito y lo envía a Caja; `POST …/deposito/reembolso` con permiso y motivo |
| V1 `GET` / `POST` / `DELETE /admin/reservas/bloqueos[/:id]` | Cierres, festivos y eventos; valida rango |
| V1 `GET /admin/reservas/bloqueos/:id/impacto` | Reservas afectadas por el bloqueo |
| V1 `POST /admin/reservas/bloqueos/:id/notificar` | Notifica y propone reubicación de las reservas afectadas |
| `POST /admin/reservas/exportaciones` | Crea registro en `exportacion`; segundo plano si el volumen es alto |

**Eventos Socket.IO** (namespace `/admin`, room `sucursal:{sucursalId}`): `reserva.creada`,
`reserva.actualizada`, `reserva.estado` (incluye `sentada`, `finalizada`, `no_show`, cancelación),
`lista_espera.actualizada`, `mesa.estado`, `bloqueo.creado`/`bloqueo.eliminado` (V1) y `alerta.creada`
(cuando un no-show o un SLA de espera genera alerta). Al reconectar se refetch del segmento completo.

## 6. Frontend

Componentes compartidos: `DataTable`, `FilterBar`, `SavedViewChip`, `DetailDrawer`, `StatusBadge`,
`Timeline`, `BeforeAfterDiff`, `ConfirmDialog`, `ReasonSelect`, `DurationCell`, `EmptyState`,
`Skeleton`, `ErrorState`, `MoneyCell` (depósitos). Propios: `ReservationCalendar`, `ReservationBlock`
(color por estado), `WaitlistPanel`, `ArrivalsPanel`, `PolicyForm`, `ImpactList` (V1).

- Calendario por día/semana con arrastrar para reubicar; el servidor revalida solape y devuelve 409
  con las alternativas si falla.
- Detalle en drawer con pestaña fija de **Bitácora** (`Timeline` con actor, canal, hora y resultado;
  tiempos clave en tooltip: `sentada − fecha_hora` y `finalizada − sentada`).
- Estados de bloqueo visibles en el calendario (capa de cierres, V1) y aviso al intentar reservar en
  una franja cerrada.
- Datos de contacto enmascarados según rol (RN-R5-07) y acceso registrado (RNF-R5-09).

## 7. Permisos y trazabilidad

| Permiso | Cubre |
|---|---|
| `reservas.ver` | Lista, calendario, detalle y bitácora |
| `reservas.crear` / `reservas.editar` | Alta y edición manual |
| `reservas.reubicar` / `reservas.cancelar` | Reubicación y cancelación (con motivo) |
| `reservas.estado` | Sentar, finalizar y marcar no-show |
| `reservas.politicas` | Edición de `politica_reserva` |
| `reservas.depositos` / `reservas.reembolsar` (V1) | Depósito, cobro y reembolso (RN-R5-06) |
| `reservas.bloqueos` (V1) | Alta/baja de cierres, festivos y eventos |
| `reservas.exportar` | Exportaciones (RN-R5-10) |

Se audita en `evento_auditoria` (actor, motivo, antes/después) toda mutación y consulta sensible de
contacto. Va a `bitacora_evento` con `entidad_tipo='reserva'` y eventos de R5 §5.1: `solicitada`,
`confirmada`, `recordatorio_enviado`, `reagendada`, `cancelada_cliente`/`cancelada_local`, `sentada`
(con mesa), `no_show` y `finalizada`. La edición de política y los bloqueos van a auditoría
(`entidad='politica_reserva'` y `'cierre_temporal'`); la bitácora no admite esas entidades en su CHECK.
Bitácora y auditoría son inmutables (RN-R5-02) y enlazan de ida y vuelta con el módulo 16.

## 8. Estados y casos borde

| Caso | Diseño |
|---|---|
| Sobre-asignación de mesa | 409 con mesa/franja en conflicto y alternativas; la BD es la última defensa |
| Cierre temporal con reservas futuras | Impacto visible; «notificar y reubicar»; la web no ofrece la franja (RN-R5-11) |
| Dos administradores editan la misma reserva | Aviso de conflicto; gana lo confirmado por el servidor (plan 05 §6.23) |
| Reserva sin evento de cierre | Tiempos con «—»; no promedia (R5 §5.3) |
| Zona horaria de sede ≠ administrador | Todo en la zona de la sede (RNF-R5-08) |
| Exportación muy grande | Se limita, se procesa en segundo plano y se avisa (RNF-R5-04) |
| Sin permisos | Ítem deshabilitado y acciones ausentes con tooltip del permiso requerido |
| Vacío / cargando / error | Acción primaria en vacío, `Skeleton` sin saltos y error con «Reintentar» |

## 9. Criterios de aceptación

1. Lista y calendario filtran de forma combinable y exportan respetando permisos, dejando registro.
2. Cada acción manual (crear, editar, reubicar, cancelar, sentar, finalizar, no-show) queda en
   auditoría y en la bitácora con actor, canal, hora y resultado.
3. No se sobre-asigna: el intento responde 409 con el conflicto; solo se asignan mesas operativas.
4. Las políticas editadas rigen la web y el panel: la disponibilidad calculada las aplica y la
   reserva guarda `politica_snapshot`.
5. Sentar/finalizar/no-show actualizan estado de mesa y se reflejan en ocupación y reportes.
6. La bitácora muestra la línea §5.1 completa, el antes/después de los reagendamientos y los tiempos
   clave calculados con sellos del servidor.
7. Un cierre o festivo impide ofrecer la franja en la web y permite notificar y reubicar afectadas.

## 10. Plan de trabajo

- [ ] **F1 API/datos:** módulo NestJS `reservas`; lecturas con filtros y paginación; `disponibilidad`
      con solape/aforo/bloqueos; DTOs validados; permisos y auditoría base.
- [ ] **F2 lectura/lista:** pestañas Lista y Calendario, `FilterBar` en URL, estados vacío/cargando/
      error y exportación.
- [ ] **F3 detalle/acciones:** drawer con Resumen y Bitácora; alta, edición, reubicar, cancelar,
      sentar, finalizar, no-show; políticas.
- [ ] **F4 en vivo/exportación:** eventos Socket.IO y refetch; lista de espera; exportaciones en
      segundo plano.
- [ ] **F5 pruebas:** permisos por rol, conflictos 409, tiempos con sellos, inmutabilidad de bitácora
      y recorrido completo solicitar → sentar → finalizar.
- [ ] **V1:** depósitos/reembolsos conciliados con Caja y subpágina de bloqueos con impacto.

## 11. Dependencias y pendientes

- **Fase 0** (router, shell, `lib/api`, `lib/socket`, kit de datos) y **Salón** (mesas/zonas) como
  precondición; **Clientes** mejora el vínculo pero no bloquea; **Caja/Pagos** para depósitos V1;
  **Notificaciones** para recordatorio y avisos de reubicación; `analytics` para reportes.
- Preguntas de R5 §14 que lo afectan: recurrencia y alcance de bloqueos, política de depósitos y
  retención de datos personales de reserva; si cambian, revisar este módulo con fecha y RF.
- **Pendientes técnicos:** confirmar si la subpágina de bloqueos requiere rutas propias y si la
  recurrencia de festivos justifica una tabla nueva (hoy `cierre_temporal` no la tiene).
