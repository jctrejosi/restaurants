# 17 — Glosario

Términos usados en esta documentación. Cada uno incluye su equivalente en el nuevo modelo
cuando aplica; la columna de equivalente apunta a tablas, campos o componentes definidos en
`04-modelo-de-datos.md` y `03-arquitectura.md`.

## 17.1 Términos de negocio y de producto

| Término | Descripción | Equivalente en el nuevo modelo |
|---|---|---|
| Comanda | Conjunto de líneas de un mismo pedido agrupadas para una estación de preparación; es la unidad de trabajo del KDS. | `comanda`; legado `FACOMAN` |
| Línea de pedido | Ítem individual de un pedido con producto, cantidad, modificadores, notas y snapshot de nombre y precio. | `pedido_linea`; legado `FADMESA` |
| Estación | Punto de preparación (cocina, barra, parrilla, despacho) al que se enrutan los productos según su configuración. | `estacion`; legado `FACOCINA` (`IFCOCINA`) |
| Enrutamiento | Regla que traduce cada línea del pedido en una comanda para su estación destino. | Enrutador de estaciones; legado `IMPCOMAN` + `IFCOCINA` |
| KDS | Kitchen Display System; pantalla que muestra comandas por estación, sus tiempos y permite marcarlas en preparación, listas y entregadas. | KDS PWA; legado `CTRCOMAN` |
| Print agent | Servicio local de la red del restaurante que toma trabajos de impresión de la cola y los envía a la impresora térmica en ESC/POS, con reintentos. | Componente print agent; legado `IMPCOMAN` + `PRINTO.EXE` |
| Mesa | Puesto físico del salón que puede sostener un pedido abierto, una reserva o una unión temporal con otra mesa. | `mesa` (el legado no tiene tabla de mesa: `FADMESA` y `FAESPERA` solo la referencian desde el pedido/consumo) |
| Zona | Agrupación física o lógica de mesas (salón, terraza, barra) para organizar el mapa y las reservas. | `zona` |
| Cubierto | Persona que ocupa un puesto en la mesa; se usa para dimensionar reservas y consumo mínimo. **SUPUESTO:** no aparece como campo en el legado verificado. | `reserva.personas` |
| Turno | Periodo operativo entre apertura y cierre de caja; agrupa pedidos, comandas y pagos y da continuidad a los consecutivos. | `turno`; legado `CTTURNO`/`FADCOMAN` |
| Arqueo | Conteo físico de efectivo y verificación de medios de pago al cierre, comparado contra lo esperado por el sistema. | `cierre_caja` (`contado`, `diferencia`) |
| Cierre de caja | Proceso que cierra el turno, calcula la diferencia, registra el resultado y bloquea nuevos pagos sobre ese turno. | `cierre_caja`; legado `FACIERRE` |
| Propina | Valor voluntario adicional al total del pedido, sugerido por un porcentaje configurable por sucursal. | `pedido.propina`, `pago.propina`; legado `CTPORPRO` |
| Domicilio | Modalidad de pedido entregado en la dirección del cliente, sujeta a zona de cobertura y pedido mínimo. | Modalidad `domicilio`; estado `en_camino` |
| Recoger | Modalidad en la que el cliente retira el pedido en el establecimiento; no requiere cobertura ni repartidor. | Modalidad `recoger` |
| Canal | Origen por el que entra el pedido: web, mesero, caja o kiosco. | Enum `canal_pedido` |
| Modalidad | Forma de consumo o entrega del pedido: mesa, domicilio o recoger. | Enum `modalidad_pedido` |
| Snapshot de precio | Copia del nombre y precio del producto al crear la línea, para que cambios posteriores de catálogo no alteren históricos. | `nombre_snapshot`, `precio_unitario` (ADR-08) |
| Idempotencia | Propiedad por la que repetir una petición (reintento, doble clic, reconexión) no crea registros duplicados. | `client_order_id` (RN-28), `client_op_id` (`04` §4.5) |
| Outbox | Patrón que persiste localmente las operaciones pendientes de enviar y las reintenta al recuperar la conexión. | `sync_operacion`; cola local SQLite del APK |
| SLA | Acuerdo de nivel de servicio; en el producto, tiempo objetivo de preparación por producto o estación que el KDS vigila. | `estacion.sla_seg`, `producto.tiempo_objetivo_seg` (RN-12) |
| RPO | Recovery Point Objective; pérdida máxima de datos tolerable ante un incidente, definida por la frecuencia de respaldo. **SUPUESTO:** valor a acordar en Fase 0. | Respaldos de PostgreSQL |
| RTO | Recovery Time Objective; tiempo máximo aceptable para restablecer el servicio tras una caída. **SUPUESTO:** valor a acordar en Fase 0. | Alta disponibilidad y plan de recuperación |
| Tenant | Cliente del modelo SaaS; agrupa una o más sucursales y aísla sus datos del resto. | `tenant` (ADR-09) |
| RBAC | Role-Based Access Control; permisos otorgados por rol y por sucursal. | `rol`, `permiso`, `rol_permiso`, `usuario_rol`; legado `POSMENU`/`POSRUTA` |
| PWA | Progressive Web App; web instalable con caché y funcionamiento tipo app. Se usa en la web del cliente y en el KDS. | Next.js (web), React (KDS) |
| ESC/POS | Estándar de comandos de impresoras térmicas; el legado ya documenta en él la apertura de gaveta. | Print agent |

## 17.2 Términos del legado (`punto_c`)

| Término | Descripción | Equivalente en el nuevo modelo |
|---|---|---|
| xHarbour | Dialecto/compilador compatible con Clipper en el que está escrito `punto_c`. | Reemplazado por NestJS/TypeScript, Flutter y React |
| FiveWin | Framework de interfaz gráfica para Windows (MDI) usado por todas las apps del legado. | Web, APK y PWA |
| ADS | Advantage Database Server; motor cliente-servidor que gestiona las tablas DBF del legado. | PostgreSQL |
| DBF | Formato de tabla de dBase (archivo plano con campos fijos) sobre el que opera el legado. | Tablas de PostgreSQL |
| CDX | Índice compuesto asociado a una DBF; define las claves de acceso del legado. | Índices y restricciones de PostgreSQL |
| ADT/ADI | Formatos de tabla e índice nativos de ADS (`ADSSETFILETYPE(3)`) cuando este gestiona los datos. | Tablas de PostgreSQL (vía importador, D1) |
| RLOCK | Bloqueo de un registro para escritura concurrente en el esquema DBF/ADS. | Transacciones de PostgreSQL; sin acceso directo desde clientes |
| FLOCK | Bloqueo de tabla completa; usado en operaciones masivas o de mantenimiento. | Migraciones e importaciones por lote |
| Sentinel | Llave de licenciamiento del legado (`spromeps.lib`, `Sentinel_xhb.lib`). | No aplica al producto nuevo |
| `FADCON` | Configuración global: punto, empresa, consecutivos (`CTCOMANDA`, `CTTURNO`), copias (`CTIMPCO`, `CTIMPFA`), propina (`CTPORPRO`), borrado (`CTBORRACO`), timer (`CTTIMECO`). | `configuracion_sucursal` + `consecutivo` (`04`) |
| `FADMESA` | Comanda en curso por mesa: ítems con cantidad, estación (`IFCOCINA`), bandera de impresión (`IFCOMANDA`), observación y horas. | `pedido_linea` |
| `FACOMAN` | Monitor de comandas: filas por ítem con estado `P` (pendiente) o `E` (entregada) y horas de inicio y fin. | `comanda`, `comanda_linea` |
| `FACOCINA` | Catálogo de estaciones de preparación/impresión: código (`IFCOCINA`), nombre y `COLPT`. | `estacion`, `impresora` |
| `FAESPERA` | Cuentas o mesas abiertas con neto, vendedor, pedido y observación. | `pedido` abierto (`por_cobrar`) |
| `FADCOMAN` | Rango diario de consecutivos de comanda (`CODIA`, `COINICIAL`, `COFINAL`). | `consecutivo`, `turno` |
| `VEDVEN` | Catálogo de meseros/vendedores (`VNOMBRE`). | `usuario` con rol mesero |
| `POSOPER` | Operadores/usuarios del sistema (`IINICIAL`). | `usuario` |
| `POSMENU` | Menús disponibles por usuario. | Navegación dinámica según `rol`/`permiso` |
| `POSRUTA` | Permisos usuario × opción; base del control de acceso del legado. | RBAC (`rol_permiso`, `usuario_rol`) |
| `POSPAGO` | Catálogo de medios de pago (`CODIGO`). | `medio_pago` |
| `ITEMRAP` | Ítems rápidos y códigos de búsqueda (`INEAN14`, `NUMERO`, `INARTIC`). | `producto.sku`; códigos de barras pendientes de modelar en `04` |
| `ITEOBSER` | Observaciones predefinidas (`CODIGO`). | Observaciones predefinidas pendientes de modelar en `04`; hoy `grupo_modificador` |
| `FADCLI` | Catálogo de clientes (`CNOMBRE`, `CTIPPAG`). | `cliente` |
| `FADMECLI` | Relación mesa–cliente (`CLMESA`, `CLCLIENTE`). | `pedido.cliente_id`, `reserva.cliente_id` |
| `FADDIA` / `FADITE` / `FAPAGO` | Factura diaria, detalle de factura y pagos del legado. | `factura`, `factura_linea`, `pago`; históricos importables solo como consulta |
| `FACIERRE` | Cierre de caja del legado. | `cierre_caja` |
| `TIDTAB` / `TIDSAL` / `TIDTIPOS` | Inventario: catálogo de artículos, saldos y tipos. | Fuera de alcance del MVP (D9) |
| `IFCOCINA` | Campo del ítem con el código de estación; vacío o `'99'` significa que no se imprime y va directo a cuenta. | `producto.estacion_id` (RN-01) |
| `IFCOMANDA` | Bandera de impresión del ítem: solo se imprime lo pendiente (distinto de `'X'`); al imprimir se marca `'X'` y se sella `IFHORAI`. | `pedido_linea.estado` + `comanda.enviada_en` (RN-03) |
| `IFCANT2` | Cantidad fraccionaria o por peso del ítem; se imprime como "N T" (tandas/kilos). | `es_fraccion`, `cantidad_fraccion` |
| `IFOBSER` | Observación libre por ítem (hasta ~105 caracteres, impresa en bloques de 35). | `pedido_linea.notas` (RN-05) |
| `COLPT` | Campo de `FACOCINA` que asocia la estación con su color/tipo o impresora. | `estacion.kds_activo`, `impresora` |
| `CTCOMANDA` / `CTTURNO` | Consecutivo de comanda y de turno configurados en `FADCON`, con rango diario en `FADCOMAN`. | `consecutivo`, `turno` (RN-07) |
| `CTIMPCO` / `CTIMPFA` | Número de copias configurables para comanda y factura. | `impresora.copias` y configuración de factura (RN-08) |
| `CTBORRACO` | Bandera que activa el borrado de la comanda tras imprimirla. | Política de retención configurable (RN-10) |
| `CTPORPRO` | Porcentaje de propina sugerida aplicado por el POS. | Configuración de propina por sucursal (RN-21) |
| `CTTIMECO` | Intervalo del timer con el que el monitor de comandas refrescaba su estado. | Eventos por WebSocket; ya no hay sondeo |
| `27,112,0,64,240` | Secuencia ESC/POS para abrir la gaveta de dinero (perfil Epson; existen variantes Star). | Mismo comando emitido por el print agent |

> Los campos y tablas del legado citados son únicamente los verificados en el código de `punto_c`.
> Cualquier término no listado aquí no debe considerarse parte del análisis.
