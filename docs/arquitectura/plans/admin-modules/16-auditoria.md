# 16 — Auditoría (`/auditoria`, `/auditoria/:entidad/:id`)

**Fuentes:** [plan 05 §6.19 y §8](../front/05-plan-panel-administracion.md) · [R5 §4.14, §5.4, §7 y §11](../../requerimientos/05-panel-administracion.md) · [esquema 04](../../esquema/04-marketing-y-operacion.md). Convenciones transversales en [00-indice.md](./00-indice.md) §4.

## 1. Contexto y alcance

Bitácora global de acciones sensibles y línea de tiempo por entidad, **inmutable** y con retención configurable visible. **MVP:** RF-R5-130 (explorador con filtros y exportación), RF-R5-131 (línea de tiempo), RF-R5-132 (antes/después) y RF-R5-133 (inmutabilidad y retención). **V2:** RF-R5-134 (alertas por umbral).

Fuera de alcance: las pestañas de bitácora embebidas en cada detalle (módulos 02/03/04/11/12), que consumen la misma API, y la campana de alertas del shell (Fase 0), que muestra `alerta.creada`.

## 2. Requisitos cubiertos

| RF / regla | Prioridad | Criterio de aceptación |
|---|---|---|
| RF-R5-130 bitácora global | MVP | Filtros + exportación; **quién, qué, cuándo, dónde y por qué** |
| RF-R5-131 línea de tiempo | MVP | Todos los eventos del ciclo de reserva/pedido, en orden |
| RF-R5-132 antes/después | MVP | Aplica a precios, estados, pagos y descuentos |
| RF-R5-133 inmutabilidad y retención | MVP | Nadie edita ni borra; retención configurable visible |
| RF-R5-134 alertas por umbral | V2 | Se notifica al responsable |
| RN-R5-01 | — | Actor, hora, dispositivo, motivo y antes/después en cada acción sensible |
| RN-R5-02 / RNF-R5-05 | — | Auditoría inmutable, retención configurable y respaldo |
| RN-R5-10 | — | Toda exportación respeta permisos y deja registro |
| RNF-R5-09 | — | Consulta sensible (datos personales) deja registro de acceso |

## 3. Rutas y pantallas

| Ruta | Pantalla | Contenido |
|---|---|---|
| `/auditoria` | `AuditExplorer` | Listado global con filtros por actor, tipo/acción, entidad, severidad, fecha y sede |
| `/auditoria/:entidad/:id` | `EntityTimeline` | Línea de tiempo completa de la entidad con diffs y enlace de vuelta |
| `/auditoria/alertas` (V2) | `AlertasTable` | Alertas por umbral; atender/descartar |
| `/auditoria/umbrales` (V2, **Supuesto** de ruta) | `UmbralesForm` | Configuración de `umbral_alerta` |

`AuditExplorer` muestra las cinco preguntas de RN-R5-01 en columnas (quién + rol, qué/acción, cuándo con hora del servidor, dónde con sede/canal/dispositivo, por qué con motivo) más severidad. Cada fila abre un `DetailDrawer` con `BeforeAfterDiff` y enlace «Ver entidad». Desde cualquier detalle de pedido, reserva, comanda, pago o turno, el botón «Ver bitácora» navega a `/auditoria/:entidad/:id` (enlace **bidireccional**, R5 §8).

## 4. Datos

| Tabla | Uso | Campos clave |
|---|---|---|
| `evento_auditoria` | Bitácora global (MVP) | tenant_id, sucursal_id, usuario_id, dispositivo_id, entidad, entidad_id, accion, motivo, datos_antes, datos_despues, ip, request_id, creado_en; **particionada por mes** |
| `bitacora_evento` | Línea de tiempo por entidad | entidad_tipo (reserva/pedido/comanda/pago/turno), entidad_id, evento, actor_tipo, actor_id, canal, dispositivo_id, datos, creado_en |
| `alerta_operativa` (V2) | Alertas por umbral | sucursal_id, tipo (incluye `sla`), severidad, entidad, entidad_id, estado, atendida_por, atendida_en |
| `umbral_alerta` (V2) | Configuración | tenant_id, tipo, valor, rol_destinatario (único por tenant+tipo) |
| `exportacion` | Exportaciones | usuario_id, tipo, filtros, formato, estado, url, creado_en |

Notas:

- Inmutables: `evento_auditoria` solo admite `INSERT` (se revocan `UPDATE`/`DELETE` al rol de aplicación y se refuerza con trigger); la UI nunca ofrece editar ni borrar (RN-R5-02).
- Índices existentes: `ix_auditoria_entidad (entidad, entidad_id, creado_en)`, `ix_auditoria_usuario (usuario_id, creado_en)`, `ix_bitacora_entidad (entidad_tipo, entidad_id, creado_en)`.
- La línea de tiempo de una entidad combina `bitacora_evento` + `evento_auditoria` de esa entidad, ordenado por `creado_en`; **Supuesto:** deduplicación por `request_id`/hito para no repetir un evento que está en ambas fuentes.
- **Supuestos a confirmar en F1:** la «severidad» de RF-R5-130 no es columna; se deriva de un catálogo acción→severidad en la API (alternativa: columna nueva). La retención configurable se lee de la configuración del tenant (por defecto **24 meses**, [00-indice.md](./00-indice.md) §8) y se gestiona en el módulo 19.

## 5. API propuesta

| Método y ruta | Propósito |
|---|---|
| `GET /admin/auditoria` | Listado global; query `usuario_id,accion,entidad,entidad_id,severidad,desde,hasta,sucursal_id,texto,page,pageSize,orden` |
| `GET /admin/auditoria/facetas` | Valores vigentes para el `FilterBar` (acciones, entidades, actores, severidades) |
| `GET /admin/auditoria/:entidad/:id` | Línea de tiempo de la entidad (`bitacora_evento` + `evento_auditoria`) |
| `GET /admin/auditoria/retencion` | Retención vigente y fecha del evento más antiguo conservado (**Supuesto**) |
| `POST /admin/exportaciones` · `GET /admin/exportaciones/:id` | Exportación asíncrona con registro |
| `GET /admin/auditoria/alertas` · `PATCH /admin/auditoria/alertas/:id` (V2) | Alertas por umbral; atender o descartar |
| `GET`/`PATCH /admin/auditoria/umbrales` (V2) | Configuración de umbrales y rol destinatario |

- **No existen endpoints de escritura** sobre `evento_auditoria` ni `bitacora_evento`; cualquier intento de mutación responde **405** (**Supuesto** de contrato) y en BD falla por permisos/trigger.
- Listas paginadas `{data,total,page,pageSize}`; errores `{statusCode,message,codigo}`; `PATCH` de alertas/umbrales con `motivo` e `Idempotency-Key` (acción sensible, RN-R5-06) y antes/después auditado.

### Exportaciones

Mismo contrato que 14 y 15: `POST /admin/exportaciones` con `{tipo: 'auditoria', formato: 'csv|xlsx|pdf', filtros}`; crea fila en `exportacion` (`pendiente` → `procesando` → `lista|fallida`) y registro en `evento_auditoria`, y responde **202** (RN-R5-10). **Supuesto:** límite de 50 000 filas; por encima, segundo plano con aviso al solicitante (RNF-R5-04).

### Realtime

Namespace `/admin`, room `sucursal:{sucursalId}`: `auditoria.registrada` (cola en vivo del explorador; **Supuesto** de evento) y `exportacion.estado`; `alerta.creada` (V2) llega al `AlertBell` del shell. Al reconectar: refetch completo del segmento.

## 6. Frontend

- Compartidos: `DataTable`, `FilterBar`, `DetailDrawer`, `Timeline`, `BeforeAfterDiff`, `StatusBadge`, `EmptyState`, `Skeleton`, `ErrorState` y botón de exportación con panel de estado.
- Propios: `AuditExplorer` (columnas quién/qué/cuándo/dónde/por qué), `AuditEventDrawer` (diff + metadatos + enlaces), `EntityTimeline` (hitos con actor y canal), `RetentionBadge` («Retención: 24 meses»), `SeverityBadge` (derivada) y, en V2, `AlertasTable` y `UmbralesForm`.
- Interacciones: filtros en la URL; fila → drawer; «Ver entidad» al detalle correspondiente; desde la entidad, «Ver bitácora» al timeline; **ninguna** vista ofrece editar ni borrar (RN-R5-02). Datos personales enmascarados según rol (RN-R5-07) y navegación por teclado AA (RNF-R5-07).

## 7. Permisos y trazabilidad

| Permiso | Alcance |
|---|---|
| `auditoria.ver` | Explorador global y timeline por entidad |
| `auditoria.exportar` | `POST /admin/exportaciones` y descarga |
| `auditoria.alertas` (V2) | Ver y atender/descartar alertas |
| `auditoria.umbrales` (V2) | Configurar `umbral_alerta` |

Sin permiso: ítem deshabilitado con explicación; exportar ausente con tooltip «Requiere permiso de auditoria.exportar» (plan 05 §6.23).

Trazabilidad: la exportación de auditoría se audita a sí misma (`exportacion` + `evento_auditoria`, RN-R5-10); los cambios de umbral (V2) van con antes/después; las consultas que expongan datos personales dejan registro de acceso (**Supuesto:** acción `auditoria.consulta`, RNF-R5-09) — si el volumen lo desaconseja, usar un contador aparte.

## 8. Estados y casos borde

- **Vacío:** «Sin eventos en el rango» + explicación de inmutabilidad y retención vigente.
- **Cargando / error / sin permisos:** estados estándar con causa, «Reintentar» y explicación por módulo/acción (plan 05 §6.23).
- **Evento de creación:** el diff muestra «Creado» y «—» en el valor anterior; eventos sin `datos_antes` no rompen el drawer.
- **Actor sistema o dispositivo offline:** actor «Sistema» (o actor_id nulo) y canal/dispositivo visibles; no se oculta lo que falló (plan 05 §7).
- **Retención:** si el rango pedido es anterior a la retención, aviso «los datos anteriores a {fecha} se purgaron según la retención» en vez de error.
- **Rango/volumen grande:** **Supuesto** máx. 31 días por consulta interactiva; exportaciones completas en segundo plano con aviso.
- **Particiones mensuales:** un fallo del job de particiones no debe romper la consulta (rango vacío + alerta interna).
- **Zona horaria:** horas en la zona de la sede, siempre con la marca «hora del servidor» (RNF-R5-08).
- **Inmutabilidad:** intentos de `PATCH`/`DELETE` sobre eventos responden 405 (Supuesto) y los intentos directos en BD fallan por permisos/trigger.

## 9. Criterios de aceptación

- [ ] Cada evento muestra quién (usuario + rol), qué (acción), cuándo (hora del servidor), dónde (sede, canal, dispositivo) y por qué (motivo) (RF-R5-130, RN-R5-01).
- [ ] Filtros combinables por actor, tipo, entidad, severidad, fecha y sede, y exportación con registro (RF-R5-130, RN-R5-10).
- [ ] La línea de tiempo de una reserva o un pedido lista todos los eventos del ciclo, en orden (RF-R5-131).
- [ ] Antes/después visible para precios, estados, pagos y descuentos (RF-R5-132).
- [ ] No existe forma (UI ni API) de editar o borrar un evento; `UPDATE`/`DELETE` directo falla en BD (RF-R5-133, RN-R5-02).
- [ ] La retención configurable es visible en la pantalla (RF-R5-133).
- [ ] Navegación bidireccional entidad ↔ bitácora desde cualquier detalle (R5 §8).
- [ ] V2: descuentos altos, anulación tras preparación y reaperturas disparan alerta al rol destinatario (RF-R5-134).
- [ ] Exportaciones grandes se limitan, corren en segundo plano y avisan (RNF-R5-04).

## 10. Plan de trabajo

- [ ] **F1 API/agregados:** listado, facetas, timeline por entidad y retención sobre `evento_auditoria` y `bitacora_evento`; verificar índices, particiones y contrato inmutable.
- [ ] **F2 lectura/lista:** `AuditExplorer` con las cinco preguntas, filtros en la URL y estados vacío/cargando/error/sin permisos.
- [ ] **F3 detalle/diffs:** `AuditEventDrawer` con `BeforeAfterDiff`, `EntityTimeline` y enlaces bidireccionales; deduplicación de fuentes.
- [ ] **F4 exportación/alertas:** exportación con registro y segundo plano; V2: `alerta_operativa`/`umbral_alerta` con notificación al responsable.
- [ ] **F5 pruebas:** inmutabilidad (intentos de mutación), retención, orden del timeline, diffs, filtros, permisos, enmascarado y exportaciones.

## 11. Dependencias y pendientes

- Depende de la Fase 0 (helper de mutación que escribe `evento_auditoria`/`bitacora_evento`), de los módulos que producen eventos (01, 02, 03, 04, 11, 12) y del 19 para retención y umbrales (V2); el shell muestra `alerta.creada`.
- **Pendientes:** no existe columna de severidad ni tabla de configuración de retención (Supuestos arriba); definir el catálogo acción→severidad; criterio de dedupe entre `bitacora_evento` y `evento_auditoria`; límite de rango interactivo y de exportación; confirmar si la purga es por partición y la retención por defecto (2 años según [00-indice.md](./00-indice.md) §8).
- Preguntas de R5 §14 que lo afectan: retención y respaldo de auditoría, 2FA para consultar auditoría si el cliente lo exige (RNF-R5-06) y formato/canal de las alertas al responsable (V2).
