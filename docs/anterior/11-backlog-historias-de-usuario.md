# 11 — Backlog de historias de usuario

Backlog inicial derivado de `02-alcance-y-decisiones.md`, `05-reglas-de-negocio.md`,
`06-funcionalidades.md` y `12-roadmap-y-estimacion.md`. Cada épica está ubicada en la fase del
roadmap en que se construye; las épicas EP-80 y EP-90 son transversales.

## 11.1 Cómo leer este backlog

| Elemento | Convención |
|---|---|
| Historias | Formato "Como <rol> quiero <acción> para <beneficio>" |
| ID | `H-0xx` Fase 0; `H-1xx`…`H-6xx` fases 1 a 6; `H-8xx` Plataforma/DevOps; `H-9xx` Migración del legado |
| Prioridad | **Must**: sin ella no se cumplen los criterios de la fase/MVP. **Should**: necesaria para V1, puede postergarse dentro de la fase. **Could**: deseable si hay margen |
| Estimación | Puntos en escala 1, 2, 3, 5, 8, 13 (convención a calibrar con el equipo; 13 = dividir antes de comprometer) |
| Criterios | 2 a 4 por historia, en formato Dado/Cuando/Entonces cuando aplica |
| Trazabilidad | Las referencias `RN-xx` apuntan a `05-reglas-de-negocio.md`; "criterio MVP n" a `02-alcance-y-decisiones.md`; fases y duraciones a `12-roadmap-y-estimacion.md` |
| Condicionales | Las historias con "(condicional a D3/D5/D7)" quedan bloqueadas hasta cerrar esa decisión |
| Terminado | Una historia termina cuando sus criterios pasan QA y las pruebas automatizadas del flujo afectado pasan en CI (criterio MVP 7) |

Los datos del legado citados son solo los verificados en `01-analisis-legado.md`; no se asumen
campos ni tablas adicionales.

## 11.2 Mapa de épicas

| Épica | Nombre | Fase | Historias | Puntos |
|---|---|---|---|---|
| EP-00 | Descubrimiento y definiciones | 0 | H-001–H-006 | 40 |
| EP-10 | Núcleo, API y tiempo real | 1 | H-101–H-103 | 18 |
| EP-11 | Catálogo y menú | 1 | H-110–H-113 | 16 |
| EP-12 | Salón, zonas y mesas | 1 | H-120–H-122 | 13 |
| EP-13 | Motor de pedidos | 1 | H-130–H-135 | 29 |
| EP-14 | Usuarios, roles y permisos | 1 | H-140–H-142 | 15 |
| EP-15 | Auditoría | 1 | H-150–H-151 | 8 |
| EP-16 | Configuración de operación | 1 | H-160–H-161 | 5 |
| EP-20 | APK de meseros | 2 | H-201–H-207 | 36 |
| EP-21 | Comanda y enrutamiento | 2 | H-210–H-212 | 16 |
| EP-22 | Impresión y print agent | 2 | H-220–H-222 | 16 |
| EP-23 | Offline y sincronización | 2 | H-230–H-232 | 26 |
| EP-30 | KDS de cocina | 3 | H-301–H-306 | 29 |
| EP-40 | Web cliente (pedidos) | 4 | H-401–H-406 | 33 |
| EP-41 | Cobertura y domicilio | 4 | H-410–H-411 | 10 |
| EP-42 | Cuenta de cliente web | 4 | H-420 | 5 |
| EP-50 | Reservas | 5 | H-501–H-503 | 16 |
| EP-51 | Pagos y propina | 5 | H-510–H-512 | 19 |
| EP-52 | Notificaciones | 5 | H-520–H-521 | 11 |
| EP-60 | Caja y cierre | 6 | H-601–H-603 | 16 |
| EP-61 | Impuestos y facturación | 6 | H-610–H-612 | 23 |
| EP-62 | Reportes y hardening | 6 | H-620–H-623 | 21 |
| EP-80 | Plataforma y DevOps (transversal) | Todas | H-801–H-805 | 31 |
| EP-90 | Migración del legado (transversal) | 0 y siguientes | H-901–H-905 | 34 |

## 11.3 Fase 0 — Descubrimiento

### EP-00 — Descubrimiento y definiciones (Fase 0)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-001 | Como responsable de producto quiero cerrar las decisiones D1–D10 en una sesión de descubrimiento para congelar el alcance y desbloquear el diseño. | Must | 5 | Dado el taller con el cliente, cuando termine, entonces D1–D10 quedan documentadas con decisión, fecha y responsable.<br>Cuando una decisión siga abierta, entonces las historias dependientes se marcan como bloqueadas y no entran a la Fase 1. |
| H-002 | Como analista de negocio quiero validar las reglas RN-01…RN-32 contra la operación real para confirmar que el nuevo producto las preserva. | Must | 8 | Dado el código y la documentación del legado, cuando se revise cada regla con el cliente, entonces queda confirmada, corregida o descartada con evidencia.<br>Cuando aparezca una regla no documentada, entonces se registra en `05-reglas-de-negocio.md` antes de estimarla. |
| H-003 | Como diseñador UX quiero prototipos navegables de APK, KDS y web para validar los flujos críticos antes de construir. | Should | 8 | Dado el prototipo, cuando un mesero y un cocinero reales lo prueben, entonces completan los flujos de tomar pedido y despachar comanda sin ayuda.<br>Cuando haya hallazgos, entonces se incorporan y se versiona el prototipo antes de cerrar la fase. |
| H-004 | Como líder técnico quiero un spike de API + WebSocket + print agent + KDS para validar la latencia de comanda a cocina < 1 s y la impresión real. | Must | 13 | Dado el spike, cuando se envíe una comanda, entonces el KDS la muestra en < 1 s (p95) y el print agent imprime en la impresora de prueba.<br>Cuando la impresora esté apagada, entonces el pedido no se bloquea y la cola reintenta (RN-09). |
| H-005 | Como líder técnico quiero homologar impresoras, dispositivos Android 8+ y red WiFi del piloto para reducir el riesgo de hardware incompatible. | Should | 3 | Dado el inventario del restaurante, cuando se pruebe cada equipo, entonces queda una lista de equipos homologados con plan B por equipo crítico (R-12). |
| H-006 | Como responsable de datos quiero definir consentimiento, retención y política de tratamiento de datos personales para cumplir la normativa aplicable (según D4). | Should | 3 | Dado el flujo de reserva o pedido web, cuando se capturen datos personales, entonces existe consentimiento explícito y política publicada.<br>Cuando un cliente solicite borrado, entonces el proceso queda definido y es ejecutable (R-10). |
| — | **Subtotal EP-00** | — | **40** | — |

## 11.4 Fase 1 — Núcleo backend

### EP-10 — Núcleo, API y tiempo real (Fase 1)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-101 | Como administrador quiero crear sucursales con zona horaria, moneda y parámetros operativos (propina sugerida, copias de comanda y factura, borrado de comanda) para parametrizar cada operación sin tocar código. | Must | 5 | Dado el alta de una sucursal, cuando se guarde, entonces exige zona horaria y moneda.<br>Cuando se cambie la propina sugerida o las copias, entonces aplican a pedidos e impresiones siguientes sin afectar históricos. |
| H-102 | Como administrador quiero que todo dato operativo quede aislado por sucursal para que ningún usuario vea o modifique información de otra sede. | Must | 5 | Dado un usuario con acceso a una sola sucursal, cuando consulte pedidos, mesas o reportes, entonces solo recibe los de su sucursal (RN-30).<br>Cuando un tenant tenga varias sucursales, entonces los consecutivos y turnos son independientes por sucursal. |
| H-103 | Como desarrollador de clientes quiero una API REST versionada y documentada (OpenAPI) con bus WebSocket por sucursal y estación para construir APK, KDS y web sobre contratos estables. | Must | 8 | Dado el contrato OpenAPI, cuando un cliente se conecte, entonces se autentica y recibe solo los eventos de su sucursal o estación.<br>Cuando se envíe una comanda, entonces los suscriptores del bus la reciben en < 1 s (objetivo no funcional). |
| — | **Subtotal EP-10** | — | **18** | — |

### EP-11 — Catálogo y menú (Fase 1)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-110 | Como administrador del menú quiero gestionar categorías y productos (nombre, descripción, precio entero, impuesto, estación, tiempo objetivo, imagen, visible en web) para mantener la carta actualizada. | Must | 5 | Dado un producto nuevo, cuando se guarde, entonces exige categoría y precio en enteros de peso (ADR-07) y permite asignar estación e impuesto (equivale a `IFCOCINA` del legado).<br>Cuando se desactive un producto con pedidos históricos, entonces se conserva el histórico (borrado lógico, no físico). |
| H-111 | Como administrador del menú quiero configurar grupos de modificadores (obligatorios, mínimos y máximos) y asignarlos a productos para vender adiciones y términos. | Must | 3 | Dado un producto con grupo obligatorio, cuando se agregue al pedido, entonces no se puede confirmar sin cumplir la selección mínima.<br>Cuando un modificador tenga precio, entonces el total de la línea lo incluye. |
| H-112 | Como administrador del menú quiero variantes y combos para vender presentaciones (tamaños) y paquetes de productos. | Should | 5 | Dado un producto con variantes, cuando se pida, entonces el precio final suma el delta de la variante elegida.<br>Dado un combo, cuando se pida, entonces sus componentes se enrutan a las estaciones que les corresponden. |
| H-113 | Como operador quiero marcar productos como agotados y alternar su visibilidad por canal para no vender lo que no hay (RN-32). | Must | 3 | Dado un producto agotado, cuando se consulte la carta web, el APK o el KDS, entonces aparece bloqueado y no se puede pedir.<br>Cuando el producto vuelva a estar disponible, entonces se habilita sin reinstalar aplicaciones (RN-31). |
| — | **Subtotal EP-11** | — | **16** | — |

### EP-12 — Salón, zonas y mesas (Fase 1)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-120 | Como administrador del salón quiero gestionar zonas y mesas (nombre, capacidad, posición, estado) para reflejar el plano real del restaurante. | Must | 3 | Dado el alta de una mesa, cuando se guarde, entonces pertenece a una zona y admite capacidad y posición.<br>Cuando una mesa esté fuera de servicio, entonces no puede abrir pedidos. |
| H-121 | Como administrador quiero un mapa visual editable del salón para organizar mesas por zona y usarlo como tablero operativo. | Should | 5 | Dado el mapa, cuando se mueva o agregue una mesa, entonces la posición se guarda y se refleja en el APK y el backoffice. |
| H-122 | Como mesero quiero trasladar un pedido a otra mesa y unir mesas conservando el historial para resolver cambios de última hora (RN-17). | Must | 5 | Dado un pedido abierto, cuando se traslade de mesa, entonces conserva su número e historial de movimientos.<br>Cuando se unan mesas, entonces la cuenta puede cerrarse junta o dividida y el estado de mesa se actualiza en tiempo real. |
| — | **Subtotal EP-12** | — | **13** | — |

### EP-13 — Motor de pedidos (Fase 1)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-130 | Como usuario de cualquier canal quiero crear pedidos con canal (web, mesero, caja, kiosco) y modalidad (mesa, domicilio, recoger) usando el mismo modelo y una numeración consecutiva por sucursal (RN-23). | Must | 8 | Dado un pedido nuevo, cuando se cree, entonces recibe número consecutivo por sucursal y nace en `borrador`.<br>Cuando el pedido salga de `borrador`, entonces las transiciones se validan contra la máquina de estados. |
| H-131 | Como cajero quiero que cada línea guarde snapshot de nombre y precio, calcule impuestos según el producto y totalice en enteros para que los cambios de precio no alteren pedidos históricos (ADR-07, ADR-08, RN-20). | Must | 5 | Dado un cambio de precio posterior, cuando se consulte el pedido, entonces la línea conserva el precio del momento de la venta.<br>Dada una cuenta con impuesto incluido y otra adicionado, cuando se totalice, entonces el ticket discrimina base e impuesto. |
| H-132 | Como mesero quiero escribir notas libres por línea (hasta ~105 caracteres: 3 bloques de 35) y que lleguen a cocina para personalizar la preparación (RN-05, RN-06). | Must | 3 | Dado un ítem con nota, cuando se envíe, entonces la comanda impresa y el KDS la muestran completa, partida en bloques de 35 caracteres. |
| H-133 | Como mesero quiero registrar fracción o peso (por ejemplo media tanda o kilos) y que se imprima como "N T" para vender productos a granel (legado `IFCANT2`). | Must | 5 | Dada una línea marcada como fracción, cuando se imprima la comanda, entonces muestra "N T" junto a la cantidad.<br>Cuando la fracción alimente el subtotal, entonces el cálculo sigue siendo en enteros. |
| H-134 | Como administrador quiero que pedidos y líneas solo cambien por transiciones válidas de la máquina de estados para evitar estados inconsistentes (RN-13). | Must | 5 | Dado un pedido `pagado`, cuando se intente volver a `en_preparacion`, entonces la API responde error y no altera datos.<br>Cuando una línea se anule, entonces el total del pedido se recalcula y se emite el evento a KDS y auditoría. |
| H-135 | Como supervisor quiero anular líneas o pedidos y aplicar descuentos solo con permiso, motivo y auditoría para controlar el fraude (RN-15, RN-16). | Must | 3 | Dado un usuario sin permiso `pedido.anular` (ni `descuento.aplicar` para descuentos), cuando intente la acción, entonces se rechaza (equivalente a `POSRUTA` del legado).<br>Cuando se anule o descuente, entonces se exige motivo y queda registro inmutable con usuario, dispositivo y hora. |
| — | **Subtotal EP-13** | — | **29** | — |

### EP-14 — Usuarios, roles y permisos (Fase 1)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-140 | Como administrador quiero gestionar usuarios y roles, asignándolos a una o varias sucursales, para que cada persona tenga acceso solo a lo que necesita. | Must | 5 | Dado un usuario sin rol asignado, cuando inicie sesión, entonces no accede a módulos operativos.<br>Cuando un usuario cambie de sucursal, entonces sus permisos se recalculan según su asignación. |
| H-141 | Como administrador quiero una matriz de permisos por rol (RBAC) para habilitar acciones sensibles sin depender de menús binarios. | Must | 5 | Dado un rol, cuando se edite su matriz, entonces los cambios aplican en el siguiente inicio de sesión o refresco de token.<br>Cuando un permiso se retire, entonces las acciones nuevas se rechazan de inmediato. |
| H-142 | Como mesero quiero iniciar sesión con PIN en un dispositivo vinculado y como administrador quiero revocar dispositivos para operar con seguridad en equipos compartidos. | Must | 5 | Dado un dispositivo no vinculado, cuando se intente operar, entonces requiere vinculación y token válido.<br>Cuando se revoque un dispositivo o venza la sesión, entonces se borran datos locales sensibles y se exige PIN de nuevo.<br>Dados varios intentos fallidos, cuando se superen, entonces la cuenta se bloquea temporalmente. |
| — | **Subtotal EP-14** | — | **15** | — |

### EP-15 — Auditoría (Fase 1)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-150 | Como auditor quiero que toda acción sensible (anulación, descuento, cierre, reimpresión, cambio de precio) quede registrada con antes/después, usuario, dispositivo y hora (RN-29). | Must | 5 | Dada una acción sensible, cuando se ejecute, entonces se inserta un evento de auditoría no editable.<br>Cuando un pedido se anule, entonces el evento incluye el motivo y los pagos asociados. |
| H-151 | Como supervisor quiero consultar la auditoría con filtros por fecha, usuario, entidad y acción, y exportarla, para investigar incidentes. | Should | 3 | Dado un rango de fechas, cuando se filtre, entonces se listan los eventos paginados y exportables.<br>Cuando se exporte, entonces el archivo conserva los mismos datos del visor. |
| — | **Subtotal EP-15** | — | **8** | — |

### EP-16 — Configuración de operación (Fase 1)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-160 | Como administrador quiero una base de clientes con nombre, teléfono, email y consentimiento de datos para asociar pedidos y reservas. | Should | 3 | Dado un pedido web, cuando el cliente acepte el tratamiento de datos, entonces queda registrado el consentimiento con fecha.<br>Cuando un cliente repita teléfono o email, entonces se reutiliza su ficha en lugar de duplicarla. |
| H-161 | Como administrador quiero configurar los medios de pago por sucursal (efectivo, tarjeta, transferencia, pasarela) para que caja y web solo ofrezcan los habilitados. | Should | 2 | Dado un medio deshabilitado, cuando se cobre, entonces no aparece en las opciones (equivalente a `POSPAGO` del legado).<br>Cuando un medio requiera referencia, entonces el cobro la exige. |
| — | **Subtotal EP-16** | — | **5** | — |

## 11.5 Fase 2 — APK de meseros, comanda e impresión

### EP-20 — APK de meseros (Fase 2)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-201 | Como mesero quiero iniciar sesión con PIN y vincular mi dispositivo para operar de forma segura y tener mis mesas a mano. | Must | 5 | Dado el primer uso, cuando se vincule el dispositivo, entonces queda registrado con versión de app y última conexión.<br>Cuando el dispositivo se revoque, entonces la app borra datos locales sensibles al siguiente contacto con el servidor. |
| H-202 | Como mesero quiero un mapa de salón con estado de mesas en tiempo real y acciones (abrir, trasladar, unir) para gestionar mi zona sin desplazarme. | Must | 5 | Dada una mesa libre, cuando la abra, entonces queda `ocupada` y visible para otros meseros y caja en tiempo real.<br>Cuando otra persona ocupe la mesa antes, entonces la acción se rechaza con mensaje claro. |
| H-203 | Como mesero quiero tomar pedidos buscando por categoría o texto, con modificadores, notas y fracción, y con los agotados bloqueados, para armar la cuenta rápido y sin errores. | Must | 8 | Dado un producto agotado, cuando lo busque, entonces aparece bloqueado y no se puede agregar (RN-32).<br>Dada una búsqueda por texto o categoría, cuando seleccione un producto, entonces se abre el diálogo de modificadores y notas.<br>Cuando el catálogo cambie con la app abierta, entonces se refresca sin cerrar sesión (RN-31). |
| H-204 | Como mesero quiero enviar el pedido a preparación con una acción para que cocina reciba la comanda de inmediato. | Must | 5 | Dado un pedido con líneas, cuando lo envíe, entonces pasa a `enviado` y se generan las comandas por estación (RN-01, RN-02).<br>Cuando no haya red, entonces el envío queda en cola local y se sincroniza al reconectar (RN-28). |
| H-205 | Como mesero quiero agregar una segunda ronda a un pedido ya enviado y consultar la pre-cuenta sin duplicar comandas para completar el servicio. | Must | 5 | Dado un pedido con comandas enviadas, cuando agregue líneas, entonces solo las nuevas generan comanda (RN-04).<br>Cuando solicite la pre-cuenta, entonces se genera el documento sin cerrar el pedido. |
| H-206 | Como mesero quiero ver mis mesas y recibir alertas cuando un ítem esté listo para recogerlo a tiempo. | Must | 5 | Dado un ítem `lista` en cocina, cuando ocurra, entonces el mesero asignado recibe aviso en la app.<br>Cuando el mesero abra la alerta, entonces puede marcar la entrega y la comanda pasa a `entregada`. |
| H-207 | Como supervisor quiero que la anulación de una línea desde el APK exija permiso y motivo para controlar pérdidas. | Must | 3 | Dado un usuario sin permiso, cuando intente anular, entonces la app deshabilita la acción.<br>Cuando se anule una línea ya enviada, entonces cocina recibe el aviso y queda evento de auditoría. |
| — | **Subtotal EP-20** | — | **36** | — |

### EP-21 — Comanda y enrutamiento (Fase 2)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-210 | Como operador quiero que al enviar el pedido se generen comandas por estación y se inserten en el KDS y la cola de impresión para que cada área reciba solo lo suyo (RN-01, RN-02). | Must | 8 | Dado un pedido con 3 ítems en 2 estaciones, cuando se envíe, entonces se crean 2 comandas.<br>Dado un ítem con estación vacía o `99`, cuando se envíe, entonces no genera comanda de preparación y va directo a cuenta (regla del legado `IFCOCINA`).<br>Cuando se genere la comanda, entonces nace en estado pendiente/impresa (equivalente al estado `'P'` de `FACOMAN`). |
| H-211 | Como operador quiero que solo se envíen líneas pendientes y que el envío quede sellado para que reenviar un pedido no duplique comandas (RN-03; legado `IFCOMANDA` distinto de `'X'`). | Must | 3 | Dado un pedido con líneas ya enviadas, cuando se reenvíe, entonces no se genera comanda nueva por ellas.<br>Cuando una línea se envíe, entonces pasa a `enviada` y se sella `enviada_en` (equivale a marcar `IFCOMANDA='X'` e `IFHORAI`). |
| H-212 | Como operador quiero que cada comanda reciba número consecutivo por sucursal y turno, con rango diario, y respete las copias y el borrado configurado para mantener la numeración contable (RN-07, RN-08, RN-10). | Must | 5 | Dada una comanda nueva, cuando se genere, entonces toma el consecutivo del día y el turno abierto (equivalente a `CTCOMANDA`, `CTTURNO` y rango diario de `FADCOMAN`).<br>Cuando se imprima, entonces usa las copias configuradas de comanda y factura (`CTIMPCO`, `CTIMPFA`) y, si el borrado automático está activo (`CTBORRACO`), la comanda se elimina tras imprimir. |
| — | **Subtotal EP-21** | — | **16** | — |

### EP-22 — Impresión y print agent (Fase 2)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-220 | Como operador quiero un print agent local con cola, reintentos y monitoreo para que un fallo de impresora no bloquee la operación (RN-09). | Must | 8 | Dada una impresora apagada, cuando se envíe una comanda, entonces el pedido se crea igual y la impresión se reintenta.<br>Cuando la impresora vuelva, entonces el trabajo pendiente se imprime una sola vez.<br>Cuando un trabajo falle repetidamente, entonces se genera alerta visible en backoffice. |
| H-221 | Como cocinero quiero que la comanda impresa use el formato ESC/POS definido (encabezado con mesa, mesero y turno; ítems, cantidades, modificadores y notas en bloques de 35; fracción "N T") para preparar sin ambigüedad. | Must | 5 | Dada una comanda, cuando se imprima, entonces incluye mesa, mesero, turno, número, hora y las copias configuradas.<br>Dada una línea con nota larga, cuando se imprima, entonces aparece completa en bloques de 35 caracteres.<br>Dada una línea por fracción, cuando se imprima, entonces muestra "N T". |
| H-222 | Como supervisor quiero reimprimir una comanda con permiso y abrir el cajón de dinero desde la impresora para resolver incidencias de operación. | Should | 3 | Dada una reimpresión, cuando se ejecute, entonces exige permiso y queda auditada con usuario y motivo.<br>Cuando se solicite abrir el cajón, entonces el print agent envía la secuencia ESC/POS `27,112,0,64,240` a la impresora configurada. |
| — | **Subtotal EP-22** | — | **16** | — |

### EP-23 — Offline y sincronización (Fase 2)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-230 | Como mesero quiero operar sin conexión al menos 30 minutos y sincronizar al volver la red para no perder pedidos ni duplicarlos (criterio MVP 4; duración final según D7). | Must | 13 | Dado el APK sin red, cuando el mesero tome y envíe pedidos, entonces quedan en cola local y la app los muestra como pendientes.<br>Cuando vuelva la conexión, entonces se sincronizan en orden y el servidor confirma cada operación.<br>Cuando el proceso se interrumpa, entonces no hay pérdida ni duplicación. |
| H-231 | Como desarrollador quiero que todo envío del APK lleve `client_order_id` y que repetirlo devuelva el mismo resultado para garantizar idempotencia (RN-28). | Must | 5 | Dada una petición repetida con el mismo `client_order_id`, cuando llegue, entonces la API responde con el pedido existente sin crear otro.<br>Cuando dos dispositivos envíen a la vez, entonces no se duplican mesas ni comandas. |
| H-232 | Como mesero quiero que el APK descargue catálogo, mesas y usuarios y muestre pendientes de sincronización y conflictos para operar con datos vigentes y resolver choques. | Must | 8 | Dado un cambio de precio o un agotado, cuando el APK se sincronice, entonces lo refleja sin reinstalar (RN-31).<br>Dado un conflicto (mesa ocupada por otro, línea ya enviada), cuando se detecte, entonces se muestra al mesero y se resuelve según regla definida sin sobrescribir datos. |
| — | **Subtotal EP-23** | — | **26** | — |

## 11.6 Fase 3 — KDS de cocina

### EP-30 — KDS de cocina (Fase 3)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-301 | Como cocinero quiero un tablero por estación con las comandas de mi área en tiempo real, con refresco por eventos y recuperación al reconectar, para trabajar sin llamadas ni papeleo. | Must | 8 | Dada una comanda enviada, cuando llegue, entonces aparece en la estación correcta en < 1 s.<br>Cuando la estación no tenga KDS activo, entonces la comanda se imprime en su impresora asociada.<br>Cuando la red se caiga, entonces el KDS reconecta y recupera el estado completo desde el servidor. |
| H-302 | Como cocinero quiero ver el detalle de cada comanda (mesa, mesero, cantidad, modificadores, notas y hora) para preparar exactamente lo pedido. | Must | 3 | Dada una comanda, cuando se abra su detalle, entonces muestra todos los ítems con sus notas completas y modificadores. |
| H-303 | Como cocinero quiero marcar `en_preparacion` y `lista`, y que el despacho marque `entregada` con hora, para que salón y métricas sigan el avance (legado: estado `'E'` con `IFHORAF`). | Must | 5 | Dada una comanda pendiente, cuando cocina la inicie, entonces pasa a `en_preparacion` y se avisa al mesero.<br>Cuando se marque `lista`, entonces el mesero recibe la notificación.<br>Cuando el mesero la entregue, entonces la comanda queda `entregada` con sello de hora. |
| H-304 | Como jefe de cocina quiero un semáforo de SLA por tiempo objetivo que marque las comandas verdes, amarillas o rojas para priorizar el despacho (RN-12). | Must | 5 | Dada una comanda dentro del tiempo objetivo, cuando se muestre, entonces está en verde.<br>Cuando supere el objetivo, entonces pasa a amarillo y, al doble, a rojo, quedando marcada para reportes. |
| H-305 | Como cocinero quiero alertas sonoras al llegar una comanda nueva y al superar el SLA, silenciables por estación, para no perder pedidos en hora pico (RN-11; legado `CTRCOMAN`). | Must | 3 | Dada una comanda nueva, cuando llegue, entonces suena la alerta de la estación.<br>Cuando la estación silencie el sonido, entonces deja de sonar solo en esa estación. |
| H-306 | Como administrador quiero consultar el historial del turno, las métricas de tiempos por producto y estación, y permitir reimpresión autorizada para operar y medir la cocina. | Should | 5 | Dado el turno en curso o cerrado, cuando se consulte el historial, entonces lista las comandas despachadas con sus tiempos.<br>Cuando se calcule el promedio, entonces se agrupa por producto y estación.<br>Cuando se reimprima desde el KDS, entonces exige permiso y queda auditado. |
| — | **Subtotal EP-30** | — | **29** | — |

## 11.7 Fase 4 — Web cliente (pedidos)

### EP-40 — Web cliente (Fase 4)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-401 | Como cliente quiero ver la carta en una PWA con categorías, buscador, destacados, agotados y horario de atención para decidir qué pedir desde mi celular. | Must | 5 | Dada la carta, cuando un producto esté agotado, entonces no se muestra o se muestra bloqueado y no se puede pedir.<br>Cuando el restaurante esté cerrado, entonces se muestra el horario y se bloquea el checkout con la hora de apertura siguiente.<br>La carta es instalable como PWA y responde en móvil. |
| H-402 | Como cliente quiero ver el detalle de un producto (fotos, descripción, modificadores, notas, cantidad, fracción) para pedirlo exactamente como lo quiero. | Must | 5 | Dado un producto con modificadores obligatorios, cuando lo agregue, entonces debo completar la selección mínima.<br>Cuando el producto sea a granel, entonces puedo indicar fracción o peso. |
| H-403 | Como cliente quiero un carrito que sume líneas, impuestos y total en tiempo real para conocer cuánto pagaré antes de confirmar. | Must | 5 | Dada una línea agregada o eliminada, cuando cambie el carrito, entonces los totales se recalculan al instante.<br>Cuando el precio de un producto cambie durante la sesión, entonces aplica solo a líneas nuevas (snapshot). |
| H-404 | Como cliente quiero hacer checkout para domicilio o recoger con mis datos, dirección u hora programada, y confirmar una sola vez para recibir el pedido correcto. | Must | 8 | Dada la modalidad domicilio, cuando confirme, entonces se valida cobertura y pedido mínimo antes de aceptar (RN-26).<br>Cuando haga doble clic en confirmar, entonces se crea un solo pedido gracias a `client_order_id`.<br>Cuando la operación esté cerrada, entonces el checkout se bloquea con aviso. |
| H-405 | Como cliente en mesa quiero pedir escaneando el QR para que el pedido llegue a la misma cocina que el de un mesero (RN-24). | Must | 5 | Dado un QR de mesa válido, cuando confirme, entonces el pedido queda asociado a esa mesa.<br>Dado un QR inválido o una mesa fuera de servicio, cuando intente pedir, entonces la API rechaza el pedido con mensaje claro. |
| H-406 | Como cliente quiero seguir mi pedido en tiempo real y ver el tiempo estimado para saber cuándo estará listo o en camino. | Must | 5 | Dado un pedido en curso, cuando cambie de estado, entonces la vista se actualiza en pocos segundos sin recargar.<br>Cuando la modalidad sea domicilio, entonces veo el estado `en_camino` y los datos del repartidor. |
| — | **Subtotal EP-40** | — | **33** | — |

### EP-41 — Cobertura y domicilio (Fase 4)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-410 | Como administrador quiero configurar zonas de cobertura con tarifa, pedido mínimo y tiempo estimado para aceptar solo domicilios viables (RN-26). | Must | 5 | Dada una dirección fuera de cobertura, cuando el cliente confirme, entonces la API responde error de negocio y ofrece cambiar a "recoger".<br>Dado un pedido bajo el mínimo, cuando se intente confirmar, entonces se bloquea indicando cuánto falta. |
| H-411 | Como operador de despacho quiero asignar repartidor a un pedido y registrar las marcas de tiempo (asignado, recogido, entregado, evidencia) para trazabilidad completa (RN-27). | Must | 5 | Dado un pedido `listo` a domicilio, cuando se asigne repartidor, entonces el pedido pasa a `en_camino` y se registra la hora de asignación.<br>Cuando el repartidor entregue, entonces se registra la hora y opcionalmente evidencia; el cliente lo ve. |
| — | **Subtotal EP-41** | — | **10** | — |

### EP-42 — Cuenta de cliente web (Fase 4)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-420 | Como cliente quiero una cuenta con historial de pedidos y reservas, direcciones frecuentes y preferencias para repetir más rápido. | Should | 5 | Dado un cliente registrado, cuando entre, entonces ve sus pedidos y reservas anteriores.<br>Cuando repita un pedido, entonces puede reutilizar una dirección guardada.<br>Cuando solicite eliminar su cuenta, entonces se aplica la política de datos definida en H-006. |
| — | **Subtotal EP-42** | — | **5** | — |

## 11.8 Fase 5 — Reservas, pagos y notificaciones

### EP-50 — Reservas (Fase 5)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-501 | Como cliente quiero reservar en línea eligiendo fecha, hora, personas y zona, viendo solo la disponibilidad real, para asegurar mi mesa sin llamar (RN-25). | Must | 8 | Dada una franja sin disponibilidad, cuando la seleccione, entonces no se ofrece o se muestra agotada.<br>Dado un bloqueo confirmado, cuando otro intente la misma mesa y franja, entonces no se puede confirmar (restricción única). |
| H-502 | Como cliente quiero recibir confirmación con código de reserva y poder cancelarla, para tener control de mi reserva. | Must | 3 | Dada una reserva confirmada, cuando se cree, entonces se genera código único y se notifica por el canal elegido.<br>Cuando el cliente cancele, entonces la mesa se libera y el estado pasa a `cancelada`. |
| H-503 | Como anfitrión quiero que las reservas reciban recordatorio y que el `no_show` libere la mesa pasado el margen, para no perder mesas vendibles (RN-25). | Should | 5 | Dado un recordatorio configurado, cuando llegue el momento, entonces se envía el mensaje al cliente.<br>Dado un `no_show`, cuando se cumpla el margen, entonces la mesa se libera y queda registrada la marca. |
| — | **Subtotal EP-50** | — | **16** | — |

### EP-51 — Pagos y propina (Fase 5)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-510 | Como cliente quiero pagar en línea con la pasarela configurada y que el pedido se confirme según la respuesta para asegurar mi pedido sin efectivo (condicional a D5). | Must | 8 | Dado un pago aprobado por webhook, cuando llegue la confirmación, entonces el pedido pasa de `borrador` a `enviado`.<br>Dado un pago rechazado, cuando ocurra, entonces el pedido queda en `borrador` y se permite reintentar.<br>Cuando el pago se reembolse, entonces el estado pasa a `reembolsado` y queda trazado. |
| H-511 | Como cajero quiero registrar varios pagos por pedido (efectivo, tarjeta, transferencia, mixto) y que el total cuadre, para cobrar cuentas divididas o compartidas (RN-18). | Must | 8 | Dada una cuenta dividida, cuando se registren pagos parciales, entonces el pedido se marca `pagado` solo al cubrir el total.<br>Cuando un pago requiera referencia, entonces se exige y se guarda. |
| H-512 | Como cliente quiero que la propina sea voluntaria y sugerida por porcentaje configurable, pudiendo aceptarla, modificarla o rechazarla (RN-21; legado `CTPORPRO`). | Must | 3 | Dada una cuenta, cuando se sugiera la propina, entonces usa el porcentaje configurado de la sucursal.<br>Cuando el cliente modifique o rechace, entonces el total se ajusta y el pago registra la propina real. |
| — | **Subtotal EP-51** | — | **19** | — |

### EP-52 — Notificaciones (Fase 5)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-520 | Como cliente quiero recibir notificaciones transaccionales (WhatsApp, SMS o push) en los hitos de mi pedido o reserva, con registro y reintento, para estar informado sin llamar. | Must | 8 | Dado un evento de confirmación, `en_camino` o `listo`, cuando ocurra, entonces se envía el mensaje por el canal configurado.<br>Cuando el envío falle, entonces se reintenta y el registro queda con estado y error. |
| H-521 | Como administrador quiero plantillas editables por evento y canal para adaptar los mensajes sin tocar código. | Should | 3 | Dada una plantilla, cuando se edite, entonces los siguientes envíos usan la nueva versión.<br>Cuando exista más de un idioma configurado, entonces se selecciona la plantilla correspondiente al cliente. |
| — | **Subtotal EP-52** | — | **11** | — |

## 11.9 Fase 6 — Caja, facturación, reportes y hardening

### EP-60 — Caja y cierre (Fase 6)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-601 | Como cajero quiero abrir el turno con base inicial para que todo cobro quede asociado al turno abierto (legado `CTTURNO`). | Must | 3 | Dado el primer turno del día, cuando se abra, entonces se registra número, hora, usuario y base inicial.<br>Cuando ya exista un turno abierto en la sucursal, entonces no se permite abrir otro sin cerrarlo. |
| H-602 | Como cajero quiero cobrar en caja con división de cuenta y varios medios de pago para cerrar cuentas de salón y mostrador (RN-18). | Must | 5 | Dada una cuenta dividida por líneas o partes iguales, cuando se cobre, entonces la suma de pagos cuadra con el total.<br>Cuando se cobre un pedido contra entrega, entonces el pago se registra con su medio y referencia. |
| H-603 | Como cajero quiero cerrar el turno con arqueo (base, ventas, propinas, retiros, gastos y contado) y diferencia calculada, sin poder cerrarlo dos veces, para cuadrar la caja (RN-22; legado `FACIERRE`). | Must | 8 | Dado el cierre, cuando se registre el conteo, entonces el sistema calcula la diferencia contra lo esperado.<br>Cuando el turno esté cerrado, entonces no admite nuevos pagos ni movimientos.<br>Cuando existan pedidos abiertos, entonces se advierte y se exige confirmación explícita. |
| — | **Subtotal EP-60** | — | **16** | — |

### EP-61 — Impuestos y facturación (Fase 6)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-610 | Como contador quiero que cada producto tenga su impuesto (inc, iva o ninguno) y que el precio pueda tenerlo incluido o adicionado, con discriminación en el ticket, para cumplir la normativa fiscal (RN-20; según D4). | Must | 5 | Dado un producto con impuesto incluido, cuando se cobre, entonces el ticket discrimina base e impuesto.<br>Dado un producto con impuesto adicionado, cuando se totalice, entonces el impuesto se suma al subtotal. |
| H-611 | Como dueño quiero emitir factura electrónica ante la DIAN con el proveedor definido, con estados y nota crédito cuando aplique, para facturar legalmente (condicional a D3). | Must | 13 | Dado un pago completo, cuando se solicite factura, entonces se envía a la DIAN y se guardan `cufe` y estado.<br>Cuando el proveedor rechace, entonces la factura queda en estado de error con reintento y aviso.<br>Dado un pedido anulado con pago aprobado, cuando proceda, entonces se emite nota crédito o reembolso (RN-14). |
| H-612 | Como contador quiero que la numeración use prefijo, resolución y vigencia por sucursal, sin huecos ni duplicados, para cumplir la resolución de facturación. | Must | 5 | Dado un rango agotado o vencido, cuando se intente facturar, entonces se bloquea y se alerta.<br>Cuando se emita, entonces el consecutivo es único por sucursal y tipo de documento. |
| — | **Subtotal EP-61** | — | **23** | — |

### EP-62 — Reportes y hardening (Fase 6)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-620 | Como gerente quiero reportes de ventas por canal, producto, mesero y turno, con tiempos de preparación y exportación a CSV o Excel, para tomar decisiones. | Must | 8 | Dado un rango de fechas, cuando se genere el reporte, entonces cuadra al peso con los pagos registrados.<br>Cuando se aplique filtro por sucursal, canal o mesero, entonces los subtotales se recalculan.<br>Cuando se exporte, entonces el archivo respeta los filtros aplicados. |
| H-621 | Como líder técnico quiero pruebas de carga que validen 200 pedidos por hora y 500 dispositivos por instancia (referencia de `03-arquitectura.md`) para dimensionar la operación. | Must | 5 | Dado el escenario de carga, cuando se ejecute, entonces se miden latencia p95, errores y saturación de colas.<br>Cuando no se cumpla el objetivo, entonces se documentan cuellos de botella y ajustes. |
| H-622 | Como DevOps quiero backups automáticos, restauración probada y plan de continuidad para no perder datos operativos. | Must | 5 | Dado el backup diario, cuando se restaure en un entorno de prueba, entonces los datos cuadran al día del respaldo.<br>Cuando ocurra un incidente mayor, entonces existe procedimiento documentado con RPO/RTO definidos y acordados con el cliente. |
| H-623 | Como equipo quiero documentación de instalación, operación y soporte para la sucursal piloto, para cumplir el criterio de aceptación del MVP 8. | Must | 3 | Dado el piloto, cuando el personal consulte la guía, entonces puede operar los flujos básicos y reportar fallas.<br>Cuando se despliegue una actualización, entonces el runbook indica pasos y rollback. |
| — | **Subtotal EP-62** | — | **21** | — |

## 11.10 Épica transversal — Plataforma y DevOps (EP-80)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-801 | Como equipo quiero repositorio(s), convenciones y revisión de código con CI (build, lint, pruebas unitarias y de integración) para integrar cambios sin romper la rama principal. | Must | 5 | Dada una PR, cuando se abra, entonces CI ejecuta build, lint y pruebas y bloquea el merge si falla.<br>Cuando una prueba falle, entonces el autor recibe el detalle del fallo. |
| H-802 | Como equipo quiero entrega continua con migraciones a staging y producción, y secretos gestionados fuera del repositorio, para desplegar con seguridad y repetibilidad. | Must | 5 | Dado un merge a la rama de despliegue, cuando se ejecute el pipeline, entonces aplica migraciones y despliega a staging; a producción con aprobación.<br>Cuando una migración falle, entonces el despliegue se detiene sin dejar el sistema a medias.<br>Los secretos no están en el repositorio ni en los logs. |
| H-803 | Como equipo quiero Docker para desarrollo y ambientes dev, staging y producción (con datos anonimizados en staging) para reproducir entornos y cumplir protección de datos. | Must | 5 | Dado el repositorio, cuando se levante el entorno local, entonces API, base de datos, Redis y clientes quedan operativos con un solo comando.<br>Dado staging, cuando se carguen datos, entonces provienen de una copia anonimizada (R-10). |
| H-804 | Como equipo quiero observabilidad (logs estructurados, métricas y alertas de impresión fallida, colas y KDS caído) para operar el piloto sin depender de revisiones manuales. | Must | 8 | Dada una impresión fallida o un KDS sin conexión, cuando ocurra, entonces se dispara alerta con sucursal y dispositivo.<br>Dado un incidente, cuando se investigue, entonces hay trazas correlacionadas por pedido y comanda. |
| H-805 | Como equipo quiero pruebas E2E de los flujos críticos en CI (tomar pedido, comanda, KDS, entrega y pago) para proteger el criterio de MVP 7. | Must | 8 | Dado un cambio en la rama principal, cuando corra CI, entonces el flujo crítico se ejecuta contra un ambiente efímero y pasa.<br>Cuando un flujo se rompa, entonces el merge se bloquea con evidencia. |
| — | **Subtotal EP-80** | — | **31** | — |

## 11.11 Épica transversal — Migración del legado (EP-90)

| ID | Historia | Prioridad | Pts | Criterios de aceptación |
|---|---|---|---|---|
| H-901 | Como líder técnico quiero extraer y perfilar los datos del legado (`FADCON`, `FACOCINA`, comandas en curso de `FADMESA`, `VEDVEN`, `POSOPER`, `FADCLI`, `ITEMRAP`, `ITEOBSER`) para dimensionar la migración con datos reales. | Must | 8 | Dada la base ADS/DBF, cuando se extraiga una copia, entonces se documentan conteos, nulos y casos sucios por tabla.<br>Cuando existan campos no verificados, entonces se confirman con el cliente o el DDL antes de mapear; no se asumen. |
| H-902 | Como líder técnico quiero un mapeo legado a nuevo producto (`IFCOCINA` a estación, `VEDVEN` a mesero, `POSOPER` a usuario, `FADCLI` a cliente, y la configuración `CTCOMANDA`, `CTTURNO`, `CTPORPRO`, `CTIMPCO`, `CTIMPFA`, `CTBORRACO` a parámetros) para migrar el catálogo y la operación sin reinterpretar reglas. | Must | 8 | Dada una tabla del legado, cuando se mapee, entonces cada campo destino tiene origen documentado o queda marcado como nuevo.<br>Cuando una regla del legado no tenga equivalente, entonces se registra como brecha y se decide con el cliente. |
| H-903 | Como operador de migración quiero importar catálogo, salón, personas y configuración con simulación previa, validación y reporte de rechazos; los históricos de ventas (`FADDIA`, `FADITE`, `FAPAGO`) entran solo como consulta para preservar la información. | Must | 5 | Dada una importación en modo simulación, cuando se ejecute, entonces no escribe datos y reporta qué se importaría y qué se rechaza.<br>Cuando se importe en firme, entonces cada rechazo queda con causa y fila de origen.<br>Cuando se carguen históricos, entonces quedan disponibles para consulta y no para operar. |
| H-904 | Como PM quiero una reconciliación formal (conteos, totales, mesas, precios) y un acta de corte para decidir el cambio de sistema con respaldo. | Must | 5 | Dada la importación, cuando se compare contra el legado, entonces las diferencias quedan listadas y justificadas.<br>Cuando se firme el acta, entonces la fecha, la hora de corte y el responsable quedan documentados. |
| H-905 | Como PM quiero una estrategia de convivencia y corte sin big-bang, con capacitación y arranque asistido del piloto, para reducir el riesgo operativo (R-05) y asegurar adopción. | Must | 8 | Dada la convivencia, cuando el legado y el nuevo sistema operen en paralelo, entonces hay reglas claras de qué pedido vive en cada uno y por cuánto tiempo.<br>Dado el arranque, cuando el piloto empiece, entonces el personal está capacitado y existe soporte en sitio o remoto los primeros días.<br>Cuando se haga el corte, entonces existe plan de reversa si falla. |
| — | **Subtotal EP-90** | — | **34** | — |

## 11.12 Resumen de puntos por fase

| Fase o línea | Épicas | Historias | Puntos |
|---|---|---|---|
| Fase 0 — Descubrimiento | EP-00 | 6 | 40 |
| Fase 1 — Núcleo backend | EP-10 a EP-16 | 23 | 104 |
| Fase 2 — APK meseros, comanda e impresión | EP-20 a EP-23 | 16 | 94 |
| Fase 3 — KDS cocina | EP-30 | 6 | 29 |
| Fase 4 — Web cliente (pedidos) | EP-40 a EP-42 | 9 | 48 |
| Fase 5 — Reservas, pagos y notificaciones | EP-50 a EP-52 | 8 | 46 |
| Fase 6 — Caja, facturación, reportes y hardening | EP-60 a EP-62 | 10 | 60 |
| Transversal — Plataforma y DevOps | EP-80 | 5 | 31 |
| Transversal — Migración del legado | EP-90 | 5 | 34 |
| **Total** | **24 épicas** | **88** | **486** |

Cortes de planeación derivados de la tabla:

- **MVP (F1–F3 + piloto; F0 es prerrequisito):** 45 historias, **227 puntos** (no incluye EP-00).
- **V1 (fases 0–6):** 78 historias, **421 puntos**.
- **Transversales (EP-80 y EP-90):** 10 historias, **65 puntos**.

Supuestos de lectura: los puntos son una convención interna para priorizar y no un compromiso de
fecha; la conversión a semanas depende del equipo y debe calibrarse en la Fase 0. Las historias de
las fases 1–3 no dependen de pasarelas de pago ni de facturación electrónica, conforme al MVP
recomendado en `12-roadmap-y-estimacion.md`. Este backlog debe revisarse al cerrar D1–D10, al
resultado del spike H-004 y durante el piloto.
