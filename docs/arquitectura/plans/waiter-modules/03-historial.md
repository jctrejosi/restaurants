# 03 — Historial de pedidos (ficha completa de lo atendido)

**Rutas:** `/(app)/historial`, `/(app)/historial/[id]` · **Prioridad:** V1 (lectura) · **Módulo 03**
de la serie ([índice](./00-indice.md)). Brief: [plan 03](../front/03-plan-apk-mesero.md);
requisitos: [R3 §12 y §14](../../requerimientos/03-apk-mesero.md). Ante conflicto, manda R3.

> **Cambio de navegación.** Este módulo **ocupa el ítem «Yo»** de la barra inferior, que pasa a
> **Historial**. La pestaña **Yo / perfil** se retira del nav y se abre desde el **avatar** de la
> cabecera (foto, datos y contraseña ya implementados). El nav queda:
> **Salón · Comandas · Avisos · Historial**.

## 1. Contexto y alcance

El mesero necesita **consultar lo que ya atendió**: todos los pedidos del turno (y de días
anteriores), con su **ficha completa** — consumo, comandas generadas, **comentarios de cliente y de
cocina**, totales y pago. Sirve para responder preguntas del cliente («¿qué pedimos?», «¿esta bebida
ya se cobró?»), resolver dudas con cocina y cuadrar propinas sin depender del panel de
administración.

**Alcance:** lista de pedidos **atendidos por el mesero** con filtros y **detalle de la ficha**
completa.

**Fuera de alcance:** editar el pedido (una vez cobrado es inmutable), reimprimir/cobrar (módulos de
cuenta y cobro) y el historial global de la sede (eso es backoffice:
[`admin-modules/04-comandas.md`](../admin-modules/04-comandas.md)). Este módulo es **solo lectura**.

**Supuesto (por qué este módulo y no otro).** R3 no tiene un RF explícito de «historial del mesero»:
se apoya en los datos que R3 §12 ya obliga a modelar (`Pedido`, `Pedido_linea`, `Comanda`,
`Comanda_linea`, `Ajuste_pedido`, `Pago`) y en la auditoría (RNF-R3-08). Se recomienda **crear un RF
propio** («el mesero consulta los pedidos que atendió con su ficha») al próximo ciclo de requisitos;
mientras tanto, este plan lo implementa como lectura derivada.

## 2. Requisitos cubiertos

| RF-R3 | Requisito | Prioridad | Criterio de aceptación | RN/RNF |
|---|---|---|---|---|
| — | **Nuevo (propuesto):** consultar los pedidos atendidos por el mesero con su ficha | V1 | La ficha coincide con el pedido y sus comandas | RNF-R3-08 |
| 83 | Consultar el resumen del turno (ventas, mesas, propinas) | V2 (apoyo) | El resumen del turno usa los mismos pedidos | — |

Aplican RNF-R3-01 (offline: la ficha usa el último estado sincronizado) y el principio de **solo
lectura e inmutabilidad** de lo cobrado.

## 3. Rutas y pantallas

| Ruta / componente | Pantalla | Contenido y acciones |
|---|---|---|
| `/(app)/historial` | Lista | Resumen (cobrados · total vendido · propinas) y filtros (**Todos · Cobrados · Cancelados**, más rango de fecha/turno en V1). Tarjeta por pedido: folio, mesa/zona/comensales, apertura–cierre, canal, total y **indicador de comentarios** |
| `/(app)/historial/[id]` / hoja `FichaPedidoSheet` | **Ficha completa** | Metadatos (apertura, cierre, comensales, canal, modalidad, pago); **Consumo** (líneas con cantidad, notas, comensal y ronda); **Comandas** (número, estación, estado, sellos); **Comentarios** (cliente/cocina/mesero); **Totales** (subtotal, descuento, impuestos, propina, total) |
| Buscador / `FilterBar` (V1) | Lista | Por folio, mesa, cliente o texto de comentario |

Solo lectura: no hay acciones de escritura salvo «compartir/imprimir la ficha» (opcional, si algún
día se imprime; hoy no aplica, ver [01-comandas.md](./01-comandas.md)).

## 4. Datos

| Tabla | Uso y campos clave |
|---|---|
| `pedido` | `codigo` (folio), `sucursal_id`, `mesa_id`, `mesero`/usuario, `canal` (`web`/`mesero`/`caja`/`kiosco`), `modalidad`, `estado`, `notas`, sellos de apertura/cierre y totales |
| `pedido_linea` | `nombre_snapshot`, `cantidad`/`es_fraccion`, `precio_snapshot_centavos`, `notas` (≤105), `comensal`, `estado` |
| `pedido_linea_modificador` | Modificadores con `nombre_snapshot` (se muestran dentro de la línea) |
| `comanda`, `comanda_linea` | Comandas por estación con `estado` y sellos `enviada_en`/`lista_en`/`entregada_en`; líneas por comanda |
| `ajuste_pedido` | Descuentos/cortesías y propina si se modelan como ajuste; `motivo`, `usuario_id` |
| `pago` | Medio, montos, propina y referencia (bloque «Pago» de la ficha) |
| `mesa`, `zona`, `turno`, `usuario` | Contexto de la ficha y responsable del pedido |
| `analytics.mv_desempeno_mesero`, `mv_ventas_diarias` | Apoyo para el resumen (pedidos del mesero, propinas) |
| `evento_auditoria`, `bitacora_evento` | Origen de eventos y, hoy, de los comentarios de cocina/estado |

**Ampliación de datos (pendiente).** No existe una tabla unificada de **comentarios** con autor
(`cliente`/`cocina`/`mesero`). Hoy se reparten entre `pedido.notas` y `pedido_linea.notas` (cliente,
máx. 105 caracteres) y los eventos del KDS (`bitacora_evento` de `comanda`). Para una ficha fiel se
propone una tabla **`pedido_comentario`** (`pedido_id`, `autor_tipo` `cliente`/`cocina`/`mesero`,
`autor_id`, `texto`, `pedido_linea_id?`, `creado_en`), alimentada por la web/QR (cliente), por el KDS
(cocina) y por el APK (mesero). Decisión con el plan de backend/API. Este documento no la da por
sentada: el MVP muestra lo disponible (`notas` + eventos) y la tabla se añade en V1.

## 5. API propuesta

REST bajo `/mesero/…` (§4.1 del índice), paginación `{ data, total, page, pageSize }`.

| Método y ruta | Propósito |
|---|---|
| `GET /mesero/historial` | Pedidos del mesero con filtros (`estado`, `desde`, `hasta`, `turnoId`, `texto`); incluye total y `tiene_comentarios` |
| `GET /mesero/historial/:id` | Ficha completa: pedido, líneas (+modificadores), comandas, comentarios, ajustes y pago |
| `GET /mesero/historial/resumen` | Resumen del turno/rango (cobrados, total, propinas) para la cabecera |
| V1 `GET /mesero/historial/:id/comentarios` | Comentarios con autor y hora (si se adopta `pedido_comentario`) |

**Eventos Socket.IO:** ninguno propio (solo lectura). La lista se refresca al **reconectar** y cuando
llega `comanda.estado` de un pedido abierto; «Actualizado hace {n} min» en la cabecera (≤ 1 min).

## 6. Frontend

Componentes compartidos (Fase 0): `Sheet`, `StatusBadge`, `EmptyState`, `Skeleton`, `ErrorState`,
`RelativeTime`, `MoneyCell` (helper de moneda).

Propios: `HistorialList`, `PedidoHistoryCard`, `FichaPedidoSheet`, `FichaTotales`,
`ComentarioRow`, `CommentAuthorIcon`, `HistorialFilters`.

- La **ficha** es la vista estrella: legible, con el **consumo completo** (notas y comensal por
  línea), las **comandas** con sus sellos y los **comentarios** con su autor claramente
  identificado (icono + etiqueta `Cliente`/`Cocina`/`Mesero`).
- Los totales usan **cifras tabulares**; el total va destacado al final.
- Solo lectura: sin acciones destructivas; el detalle se abre en hoja (móvil) o panel (tableta).
- **Offline:** se muestra el último estado sincronizado con aviso «Datos del {hora}».

## 7. Permisos y trazabilidad

| Permiso | Cubre |
|---|---|
| `historial.ver` | Lista, ficha y resumen **del propio mesero** |
| `historial.ver_equipo` (V2) | Historial de otros meseros / toda la sede (capitán) |

Todo es **inmutable**: la ficha refleja lo auditado (`evento_auditoria`, `bitacora_evento`) y no se
edita. El acceso no escribe auditoría nueva, salvo que se decida registrar consultas (no requerido).

## 8. Estados y casos borde

| Caso | Diseño |
|---|---|
| Pedido cancelado | Se muestra sin consumo facturable y con el **motivo** (comentario/ajuste) |
| Pedido con pedido web (QR) | `canal='web'`; el cliente se marca en la ficha y sus notas se listan como comentarios de cliente |
| Comentario largo del cliente | `pedido_linea.notas` está limitado a 105 caracteres; el texto se muestra truncado con «ver más» si aplica |
| Sin comentarios | «Sin comentarios en este pedido» (patrón `EmptyState` pequeño) |
| Pedido aún abierto (`por_cobrar`) | Se incluye con estado «Por cobrar» y total provisional |
| Sin conexión | Último estado sincronizado + «Datos del {hora}» |
| Vacío / cargando / error / sin permisos | Patrón §4.7 con `EmptyState`, `Skeleton`, `ErrorState` |

## 9. Criterios de aceptación

1. La lista muestra **todos los pedidos atendidos por el mesero** del turno (y anteriores), con
   folio, mesa, hora, canal, total y estado.
2. La **ficha** coincide exactamente con el pedido: líneas (con notas y comensal), comandas con
   sellos, comentarios, totales y pago.
3. Los **comentarios de cliente y de cocina** se distinguen por autor y hora.
4. Se puede filtrar por estado (y por fecha/turno en V1) sin recargar la app.
5. Es **solo lectura**: no expone acciones de edición; lo cobrado es inmutable.
6. Sin conexión, la ficha funciona con el último estado sincronizado y lo indica.

## 10. Plan de trabajo

- [ ] **F1 API/datos:** `GET /mesero/historial`, `/:id` y `/resumen`; consultas por mesero/turno;
      permisos.
- [ ] **F2 lectura/lista:** `/(app)/historial` con resumen, filtros, tarjetas y estados
      vacío/cargando/error.
- [ ] **F3 ficha:** `FichaPedidoSheet` con consumo, comandas, totales y pago; `ComentarioRow` con
      autor.
- [ ] **F4 comentarios/en vivo:** mostrar comentarios de cliente/cocina; refresco al reconectar.
- [ ] **F5 pruebas:** fidelidad de la ficha, pedidos cancelados, notas de 105 caracteres, sin
      permisos.
- [ ] **V1:** tabla `pedido_comentario` (o equivalente) + buscador y rango de fechas.
- [ ] **V2:** historial del equipo para capitán y enlace al resumen del turno (RF-R3-83).

## 11. Dependencias y pendientes

- **Fase 0** (kit y navegación) y los módulos que **producen** los datos: **Comandas**
  ([01](./01-comandas.md)), **Cuenta/cobro**, **Pedidos web** (cliente) y **KDS** (cocina, para los
  comentarios/estados).
- **Pendiente (datos):** decidir la tabla **`pedido_comentario`** (autor cliente/cocina/mesero)
  frente a seguir usando `pedido.notas` + `bitacora_evento`. Afecta al backend, no a R3.
- **Pendiente (requisitos):** crear el RF propio de «historial del mesero» (hoy es un supuesto).
- **Pendiente (alcance):** confirmar si el histórico del APK puede limitarse al turno en curso o
  debe cubrir días anteriores (retención y volumen).
