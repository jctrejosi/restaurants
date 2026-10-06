# 01 — En vivo (`/en-vivo`)

**Módulo:** En vivo · **Bloque:** Operación · **Prioridad:** MVP (RF-R5-04 y RF-R5-05 se habilitan en V1).
**Requisitos:** RF-R5-01…05 (R5 §4.1).
Fuentes: [índice de la serie](./00-indice.md) · [brief §6.3](../front/05-plan-panel-administracion.md) · [R5](../../requerimientos/05-panel-administracion.md).

## 1. Contexto y alcance

**Qué resuelve.** Es la pantalla de entrada del panel y el centro de la operación diaria:

- Fila de `KpiCard` (hoy vs. ayer): ventas del día, pedidos activos, reservas de hoy, ticket promedio y cumplimiento de SLA.
- Pedidos activos por estado y modalidad (mesa/recoger/domicilio) y por canal (web, mesero, caja, kiosco), con filtro rápido; cada fila abre `DetailDrawer`.
- Salón: mesas ocupadas/libres/por cobrar y próximas llegadas de reservas.
- Comandas por estación: mini `StationBoard` con vencidas y por vencer destacadas, en el lenguaje visual del KDS.
- Bandeja de alertas con severidad; cada una enlaza a su diagnóstico o entidad.
- Accesos directos a excepciones (reimprimir, reasignar, anular, reembolsar), con permisos y auditoría.
- Auto-refresco con indicador «En vivo · actualizado {hh:mm:ss}», pausable.

**Fuera de alcance.** KDS completo ([04 — Comandas](./04-comandas.md)); mapa y edición del salón ([05 — Salón](./05-salon.md)); gestión de reservas ([03 — Reservas](./03-reservas.md)); diagnóstico y gestión de impresoras/dispositivos ([07 — Estaciones](./07-estaciones.md), [18 — Dispositivos](./18-dispositivos.md)); detalle y acciones completas del pedido ([02 — Pedidos](./02-pedidos.md)): aquí solo el acceso directo.

**Supuesto:** el consolidado multi-sede es V1 (R5 §14 #7); en MVP el tablero muestra la sede activa del shell.

## 2. Requisitos cubiertos

| ID | Requisito (resumen) | Prioridad | Criterio de aceptación (R5) |
|---|---|---|---|
| RF-R5-01 | Tablero en vivo con pedidos activos por estado, modalidad y canal | MVP | Se actualiza sin recargar la página |
| RF-R5-02 | Estado del salón: mesas ocupadas, reservas del día y próximas llegadas | MVP | El gerente ve la operación de un vistazo |
| RF-R5-03 | Comandas vencidas o próximas a vencer su SLA, por estación | MVP | Se destacan las que superan el objetivo |
| RF-R5-04 | Alertas de infraestructura: impresoras, dispositivos y sincronización pendiente | V1 | Cada alerta enlaza al diagnóstico |
| RF-R5-05 | Accesos directos a las excepciones (reimprimir, reasignar, anular, reembolsar) | V1 | La acción respeta permisos y se audita |

Reglas aplicables: RN-R5-01/02 (auditoría y bitácoras inmutables), RN-R5-06 (acciones sensibles con permiso específico), RN-R5-07 (PII enmascarada), RN-R5-08 (sellos del servidor), RN-R5-10 (exportaciones con registro, si aplica); RNF-R5-01 (alcance por sucursal en servidor), RNF-R5-02 (dato analítico «Actualizado hace {n} min», ≤ 1 min), RNF-R5-08 (zona horaria de la sede).

## 3. Rutas y pantallas

- `/en-vivo` — única pantalla; bloques en orden: KPIs → pedidos activos → salón + próximas llegadas → comandas por estación → alertas.
- `DetailDrawer` de pedido: se abre al hacer clic en fila o tarjeta; resumen (folio, estado, modalidad, mesa/mesero, total, tiempos) y enlace «Abrir en Pedidos» → `/pedidos/:id`.
- `DetailDrawer` de alerta: tipo, severidad, entidad afectada, antigüedad y enlace al diagnóstico (`/dispositivos`, `/estaciones` o la entidad de origen).
- Barra de estado «En vivo · actualizado {hh:mm:ss}» con **Pausar/Reanudar** y aviso «Sin conexión en vivo» cuando el socket cae.
- Deep links de accesos directos hacia las pantallas completas: `/pedidos/:id` (acciones), `/comandas/:id` (KDS), `/salon` (mapa), `/dispositivos` (diagnóstico).
- Sin subpestañas propias: el detalle profundo se delega a los módulos dueños.

## 4. Datos

Lectura operativa en vivo (tablas exactas del esquema):

- `pedido`: agrupaciones por `estado` (activo = distinto de `pagado` y `cancelado`), `modalidad`, `canal`, `sucursal_id`, `mesa_id`, `mesero_id`; sellos (`creado_en`…`pagado_en`) y montos (`total_centavos`, `propina_centavos`).
- `pedido_linea`: conteo de líneas activas por pedido (excluye `anulada`).
- `comanda` + `comanda_linea`: comandas por `estacion_id` con `estado`, `enviada_en`, `lista_en`, `entregada_en`; base del mini tablero.
- `regla_sla`: `objetivo_seg` por `estacion_id` o `producto_id`; objetivo efectivo por comanda (producto > estación). **Supuesto:** sin regla aplicable, la comanda se marca «sin SLA» y no se pinta como vencida.
- `mesa`, `sesion_mesa`, `zona`: ocupadas/libres/por cobrar (`mesa.estado`) y sesiones abiertas (`sesion_mesa.cerrada_en IS NULL`).
- `alerta_operativa`: `tipo` (impresora, dispositivo, sync, sla, stock), `severidad`, `estado`, `entidad`/`entidad_id`, `atendida_por`/`atendida_en`.
- `trabajo_impresion`: estado de las reimpresiones disparadas desde accesos directos.
- `sync_operacion`: pendientes por dispositivo (`estado='pendiente'`) para la alerta de sincronización.
- `bitacora_evento`: últimos eventos del pedido, para el resumen del drawer (opcional).

Agregados: comparativos hoy vs. ayer y **cumplimiento de SLA** se sirven desde `analytics` (`mv_ventas_diarias`, `mv_sla_estacion`, `mv_reservas_diarias`) — RN-R5-03. Notas: aquí no hay snapshots que preservar (solo lectura); los tramos se calculan con sellos del servidor (RN-R5-08) y todo se pinta en la zona de la sede.

## 5. API propuesta

REST bajo `/admin` (convenciones del [índice](./00-indice.md) §4.1):

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/admin/en-vivo/resumen` | KPIs del día con comparativo de ayer y cumplimiento de SLA. |
| GET | `/admin/en-vivo/pedidos-activos` | Pedidos activos agrupados por estado, modalidad y canal. |
| GET | `/admin/en-vivo/salon` | Conteo de mesas por estado y sesiones abiertas. |
| GET | `/admin/en-vivo/proximas-llegadas` | Reservas próximas a llegar (ventana configurable). |
| GET | `/admin/en-vivo/comandas` | Mini tablero por estación con vencidas y por vencer. |
| GET | `/admin/alertas` | Bandeja de alertas; filtros `estado`, `severidad`, `tipo`. |
| POST | `/admin/alertas/:id/atender` | Marca `atendida` (`atendida_por`, `atendida_en`); auditado. |

Accesos directos (RF-R5-05): reutilizan los endpoints de [02 — Pedidos](./02-pedidos.md) — `POST /admin/pedidos/:id/reasignar`, `/anular`, `/reimprimir` y `/reembolsar` (V1) — con `motivo` obligatorio e `Idempotency-Key`.

**Socket.IO:** namespace `/admin`, room `sucursal:{sucursalId}`. El tablero consume `pedido.creado`, `pedido.estado`, `pedido.actualizado`, `comanda.estado`, `mesa.estado`, `reserva.estado`, `pago.registrado`, `alerta.creada`, `alerta.atendida`, `sync.pendiente` y `dispositivo.estado`. Al reconectar se hace refetch completo de los bloques (los eventos no se reprocesan).

## 6. Frontend

- `modules/en-vivo/`: `pages/EnVivoPage.tsx`; `components/KpiRow.tsx`, `PedidosActivosCard.tsx`, `SalonResumenCard.tsx`, `StationMiniBoard.tsx`, `AlertTray.tsx`, `AccesosDirectosMenu.tsx`, `EnVivoStatusIndicator.tsx`; `api.ts`, `types.ts`.
- Compartidos: `KpiCard`, `DataTable` (modo compacto), `DetailDrawer`, `StatusBadge`, `MoneyCell`, `DurationCell`, `EmptyState`, `Skeleton`, `ErrorState`; tokens del plan 05 §3.2.
- Auto-refresco: los eventos invalidan claves de react-query y repintan sin recargar; fallback de polling suave si el socket está caído; la pausa detiene eventos/polling pero conserva lo pintado.
- Indicador con tres estados: conectado (verde), reconectando (ámbar), sin conexión (rojo).
- Cifras tabulares, foco gestionado al abrir/cerrar drawer y navegación completa por teclado (AA).

## 7. Permisos y trazabilidad

| Par | Uso |
|---|---|
| `en-vivo.ver` | Acceso al módulo y al tablero, con alcance por sucursal. |
| `pedidos.reasignar`, `pedidos.anular`, `pedidos.reimprimir`, `pedidos.reembolsar` | Accesos directos; sin el par, el botón se omite o se deshabilita con tooltip. |
| `alertas.atender` | Marcar alerta como atendida. **Supuesto:** par propuesto; se confirma con el módulo 18. |

Trazabilidad: cada acceso directo escribe `evento_auditoria` (actor, entidad, `motivo`, antes/después, hora del servidor) y el evento correspondiente en `bitacora_evento`; una reimpresión crea `trabajo_impresion`; atender una alerta actualiza `alerta_operativa` y deja rastro en `evento_auditoria`. Consultas con datos personales dejan registro de acceso (RNF-R5-09). Bitácoras inmutables (RN-R5-02): la UI no ofrece editar ni borrar.

## 8. Estados y casos borde

- **Vacío:** «Aún no hay pedidos activos hoy», con acción para quitar filtros o cambiar de sede; igual en salón («Sin mesas ocupadas») y alertas («Sin alertas abiertas»).
- **Cargando:** `Skeleton` por tarjeta y fila, sin saltos de layout.
- **Error:** causa concreta + «Reintentar»; si es persistente, enlace a estado del sistema.
- **Sin permisos:** ítem del sidebar deshabilitado con explicación; acciones ausentes o deshabilitadas con «Requiere permiso de {permiso}».
- **Socket caído/reconectando:** aviso visible, sin ocultar datos; al volver, refetch completo.
- **Datos añejos:** si el último refresco supera 1 min, el indicador pasa a ámbar (RNF-R5-02).
- **Zona horaria de sede ≠ administrador:** horas en la zona de la sede (R5 §13).
- **Dispositivo offline con operaciones pendientes:** se refleja en la bandeja vía `alerta_operativa`/`sync_operacion`; no se oculta.
- **Ayer sin datos:** los comparativos muestran «—», sin promediar ni romper (R5 §5.3).
- **Umbral de «por vencer»:** **Supuesto:** 5 min antes de `objetivo_seg`; configurable (pendiente de fijar con el cliente).

## 9. Criterios de aceptación

1. Con la pantalla abierta, un evento `pedido.creado`/`pedido.estado` actualiza contadores y filas **sin recargar** y cambia el «actualizado {hh:mm:ss}» (RF-R5-01).
2. Los KPIs muestran hoy vs. ayer; sin dato de ayer, «—». Ticket promedio = ventas ÷ pedidos pagados. **Supuesto:** fórmula a confirmar contra R5 §12.
3. Los contadores de salón (ocupadas/libres/por cobrar) y las próximas llegadas coinciden con `GET /admin/en-vivo/salon` y `/proximas-llegadas` en el mismo instante.
4. El mini tablero resalta en rojo las comandas vencidas (`ahora − enviada_en > objetivo`) y en ámbar las próximas a vencer; las vencidas se ordenan primero (RF-R5-03).
5. Sin `en-vivo.ver`, el ítem del sidebar está deshabilitado con explicación; con permiso de solo lectura, los accesos directos no se ofrecen.
6. Acceso directo sin permiso: deshabilitado con tooltip «Requiere permiso de {permiso}»; con permiso: pide motivo, confirma y deja fila en `evento_auditoria` y evento en la bitácora (RF-R5-05).
7. Cada alerta enlaza a su diagnóstico o entidad; al atenderla sale de «abiertas» y queda registrada (RF-R5-04, V1).
8. Pausar congela las actualizaciones conservando los datos; reanudar re-sincroniza sin recargar.
9. Caída de Socket.IO: aviso «Sin conexión en vivo» + «Reintentar»; al reconectar, refetch completo.

## 10. Plan de trabajo

- [ ] **F1 · API/datos:** endpoints `/admin/en-vivo/*` y `/admin/alertas`; consultas operativas con índices por `sucursal_id`/`estado`/sellos y lectura de agregados en `analytics`; contrato de KPIs (hoy/ayer).
- [ ] **F2 · Lectura/lista:** tablero con datos reales (KPIs, pedidos activos, salón, mini tablero); estados vacío/cargando/error/sin permisos; filtro rápido por modalidad y canal.
- [ ] **F3 · Detalle/acciones:** `DetailDrawer` de pedido y alerta, enlaces a módulos dueños, atender alerta, accesos directos con permiso y motivo.
- [ ] **F4 · En vivo/exportación:** suscripción Socket.IO por sucursal, actualizaciones sin recargar, indicador y pausa, reconexión con refetch; alertas y accesos directos V1. **Exportación: no aplica** (R5 no define exportar el tablero).
- [ ] **F5 · Pruebas:** unitarias de agrupaciones, tramos y SLA; integración de permisos y auditoría; e2e «En vivo → alerta de SLA → comanda → excepción → auditoría» (plan 05 §6.24); a11y y teclado.

## 11. Dependencias y pendientes

- **Prerequisito:** Fase 0 del [índice](./00-indice.md) §5 (router/shell, `lib/api.ts`, `lib/socket.ts`, permisos, kit UI).
- Depende de: **Comandas** (mini tablero y enlaces), **Pedidos** (drawer y accesos directos), **Salón** (estado de mesas), **Dispositivos/Estaciones** (diagnóstico de alertas, V1).
- Preguntas R5 §14 que lo afectan: #1 (gerencia en computador; capitanes en tableta → layout responsivo), #7 (consolidado multi-sede en V1).
- Pendientes con el cliente: ventana de «por vencer» y semáforo; definición de «sin SLA»; par de permiso de la bandeja de alertas.
