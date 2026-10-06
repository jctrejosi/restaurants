# 08 — Promociones

**Módulo:** Promociones · **Bloque:** Negocio · **Ruta:** `/promociones`.
**Prioridad:** V1 (RF-R5-100…103), V2 (RF-R5-104).

Fuentes: [plan 05 §6.11](../front/05-plan-panel-administracion.md),
[R5 §4.11 y §7](../../requerimientos/05-panel-administracion.md),
[esquema 02 §2.2](../../esquema/02-catalogo-salon-reservas.md) y
[esquema 04 §4.1–4.5](../../esquema/04-marketing-y-operacion.md); convenciones en [00-indice.md](./00-indice.md).

## 1. Contexto y alcance

Resuelve el marketing ligero del restaurante: promociones y banners con vigencia y sede
(RF-R5-100); cupones con reglas, usos máximos y control de abuso (RF-R5-101); suscriptores y
envíos de newsletter (RF-R5-102); reseñas y encuestas con consulta, moderación y publicación
(RF-R5-103); y métricas de campañas por UTM y origen (RF-R5-104, V2).

- **V1:** promociones/banners, cupones, newsletter, reseñas y encuestas.
- **V2:** atribución de reservas y pedidos por UTM y origen.

**Fuera de alcance:** el CRM externo (el [esquema 04](../../esquema/04-marketing-y-operacion.md)
aclara que estas tablas son propias del restaurante, no el proyecto CRM), facturación, el canje de
cupones dentro de la tienda/APK (ocurre en pedidos) y el envío efectivo de notificaciones (lo
ejecuta el servicio de notificaciones).

**Supuestos (a confirmar en §11):**
- El panel administra cupones; el canje y su validación al confirmar el pedido viven en compras/APK.
- Las reseñas llegan del formulario web y de fuentes externas (`web`, `google`, `tripadvisor`,
  `otra`); la moderación es manual y la decisión queda auditada.
- El newsletter encola `notificacion` desde `plantilla_notificacion` y muestra su estado; las
  bajas se respetan en todos los canales.
- El «control de abuso» (RF-R5-101) se implementa con máximo de canjes por cliente y bloqueo por
  ráfaga (límite y ventana por definir).
- Las métricas UTM leen `evento_analitica`/`analytics`, con frescura ≤ 1 min (RNF-R5-02).

## 2. Requisitos cubiertos

| ID | Requisito | Prioridad | Criterio de aceptación (R5) |
|---|---|---|---|
| RF-R5-100 | Promociones y banners con vigencia y sede | V1 | Lo vencido no se publica |
| RF-R5-101 | Cupones con reglas, usos máximos y control de abuso | V1 | Un cupón agotado no aplica |
| RF-R5-102 | Suscriptores y envíos de newsletter | V1 | Solo a contactos con consentimiento |
| RF-R5-103 | Reseñas y encuestas: consulta, moderación y publicación | V1 | Una reseña ofensiva no se publica |
| RF-R5-104 | Métricas de campañas por UTM y origen | V2 | Atribución de reservas y pedidos |

Aplican además **RN-R5-01** y **RN-R5-02** (decisiones de moderación auditadas e inmutables),
**RN-R5-07** (enmascarar datos personales de suscriptores/clientes cuando el rol no los necesita),
**RN-R5-10** (exportaciones con registro y permiso), **RNF-R5-02** (frescura de métricas) y
**RNF-R5-08** (zona horaria y formato de la sede).

## 3. Rutas y pantallas

Ruta única `/promociones` con pestañas en la URL (`?tab=promociones|cupones|newsletter|resenas|metricas`):

| Pestaña | Pantalla | Acciones principales |
|---|---|---|
| Promociones | Calendario/lista + `PromotionForm` | Crear/editar banners y promociones, publicar, pausar, previsualizar |
| Cupones | Lista + `CouponForm` | Crear/editar cupones, ver usos, anular |
| Newsletter | `SubscriberTable` + `SendWizard` | Altas/bajas, segmentar y enviar, ver estado por envío |
| Reseñas y encuestas | `ReviewModeration` | Consultar, publicar o rechazar con motivo, ver encuestas |
| Métricas UTM (V2) | Tablero de campañas | Atribución por UTM y origen de reservas y pedidos |

**Árbol de menú (sidebar):**

```text
Negocio
└─ Promociones                 /promociones
   ├─ Promociones y banners    /promociones?tab=promociones
   ├─ Cupones                  /promociones?tab=cupones
   ├─ Newsletter               /promociones?tab=newsletter
   ├─ Reseñas y encuestas      /promociones?tab=resenas
   └─ Métricas UTM             /promociones?tab=metricas
```

- **Promociones y banners (RF-R5-100):** vigencia `desde`/`hasta`, sede (o todas), tipo
  `banner`/`destacado`, activa; **lo vencido no se publica** y se marca «vencido» en la lista.
- **Cupones (`CouponForm`, RF-R5-101):** código, tipo porcentaje/monto, valor, vigencia, usos
  máximos y sede; barra de usos consumidos; el detalle explica **por qué no aplica** un cupón
  agotado (usos/usos máximos o vigencia).
- **Newsletter (RF-R5-102, RF-R5-91):** `SubscriberTable` (correo, `consentimiento_en`, origen,
  activo) con altas/bajas; `SendWizard` elige plantilla y segmento (`segmento_cliente`), muestra
  el recuento de destinatarios **con consentimiento** y encola el envío.
- **Reseñas y encuestas (`ReviewModeration`, RF-R5-103):** cola de pendientes con puntaje,
  comentario, fuente y fecha; publicar o rechazar con motivo; encuestas agregadas por tipo.
- **Métricas UTM (V2, RF-R5-104):** campañas y orígenes con atribución de reservas y pedidos;
  el tablero muestra «Actualizado hace {n} min» (RNF-R5-02).

## 4. Datos

| Tabla | Uso | Notas |
|---|---|---|
| `promocion` | Banners/promociones | `tipo ∈ banner/cupon/destacado`; `desde < hasta`; `sucursal_id` NULL = todas |
| `cupon` | Cupones | `codigo` unique; `tipo ∈ porcentaje/monto`; `ck_cupon_usos` (usos ≤ usos_maximo) |
| `suscriptor` | Newsletter | `consentimiento_en` obligatorio; unique `(tenant_id, correo)`; `activo` para bajas |
| `resena` | Reseñas | `puntaje 1–5`, `fuente ∈ web/google/tripadvisor/otra`, `publicada` |
| `encuesta` | Encuestas | `tipo ∈ pedido/reserva/visita`; unique `(tipo, referencia_id)` |
| `segmento_cliente` | Destinatarios | `criterio` jsonb; unique `(tenant_id, nombre)` |
| `notificacion` | Envíos | `estado ∈ pendiente/enviada/fallida/cancelada`; `error` visible |
| `plantilla_notificacion` | Contenido por evento/canal/idioma | Unique `(tenant_id, evento, canal, idioma)` |
| `evento_analitica` | UTM y origen (V2) | `origen_utm` jsonb y `consentimiento` |
| `exportacion` / `evento_auditoria` | Trazabilidad | Exportaciones y auditoría (§7) |

La reseña referencia `cliente` (opcional) y `sucursal`; la promoción vencida permanece visible en
la lista pero fuera de publicación. No hay borrado físico de promociones, cupones ni reseñas: se
desactivan o despublican (RN-R5-09 para entidades con historial).

## 5. API propuesta

REST bajo `/admin` (convenciones de [00-indice.md](./00-indice.md) §4.1):

| Método y ruta | Propósito |
|---|---|
| `GET/POST /admin/promociones` · `GET/PATCH /admin/promociones/:id` | CRUD de promociones y banners (409 ante conflicto) |
| `POST /admin/promociones/:id/publicar` · `/pausar` | Cambio de estado con rastro |
| `GET/POST /admin/cupones` · `GET/PATCH /admin/cupones/:id` | CRUD de cupones |
| `GET /admin/cupones/:id/canjes` · `POST /admin/cupones/:id/anular` | Consumo y anulación (motivo) |
| `GET /admin/newsletter/suscriptores` · `PATCH /admin/newsletter/suscriptores/:id` | Lista y alta/baja de suscriptores |
| `GET/POST /admin/newsletter/envios` · `GET /admin/newsletter/envios/:id` | Crear envío (plantilla + segmento) y consultar estado |
| `GET /admin/segmentos` | Segmentos disponibles para el envío |
| `GET /admin/resenas` · `PATCH /admin/resenas/:id/publicar` · `/rechazar` | Moderación con `motivo` obligatorio al rechazar |
| `GET /admin/encuestas` | Consulta agregada de encuestas |
| `GET /admin/promociones/metricas` (V2) | Atribución por UTM y origen (`desde`, `hasta`) |
| `POST /admin/promociones/exportaciones` | Exportar con registro en `exportacion` (RN-R5-10) |

**Eventos Socket.IO** (namespace `/admin`, room `sucursal:{sucursalId}`): `promocion.actualizada`
(vigente/pausada/vencida), `cupon.agotado` (con `codigo` y usos), `resena.creada` (alimenta la cola
de moderación) y `newsletter.envio` (estado pendiente/enviada/fallida). Al reconectar, refetch.

## 6. Frontend

- **Compartidos:** `DataTable`, `FilterBar`, `SavedViewChip`, `DetailDrawer`, `StatusBadge`,
  `MoneyCell`, `ConfirmDialog`, `ReasonSelect`, `EmptyState`, `Skeleton`, `ErrorState`, `Timeline`.
- **Propios:** `PromotionForm` con previsualización y calendario; `CouponForm` + `UsageBar`;
  `SubscriberTable` + `SendWizard` (plantilla, segmento y recuento de consentidos);
  `ReviewModeration`; tablero UTM con `recharts` y tokens `chart-1…8` (V2).
- **Interacciones clave:** validación `desde < hasta`; aviso «se publicará a las {hora} de la
  sede»; el envío muestra destinatarios excluidos por falta de consentimiento; rechazo de reseña
  con `ReasonSelect`; conflicto de edición → 409 y gana lo confirmado por el servidor (convención
  del módulo 06 §8).

## 7. Permisos y trazabilidad

| Permiso | Cubre |
|---|---|
| `promociones.ver` / `promociones.editar` | Consulta y CRUD de promociones y banners |
| `promociones.publicar` | Publicar/pausar y programar vigencia |
| `cupones.ver` / `cupones.editar` | Consulta, CRUD y anulación de cupones |
| `newsletter.ver` / `newsletter.enviar` | Suscriptores y envíos |
| `resenas.moderar` | Publicar o rechazar reseñas y consultar encuestas |
| `metricas.ver` | Tablero UTM (V2; datos personales enmascarados, RN-R5-07) |

**Se audita en `evento_auditoria`:** publicación/pausa de promociones, cambios de cupón (valor,
vigencia, usos), anulaciones, envíos de newsletter (plantilla, segmento y número de destinatarios),
altas y bajas de suscriptores, **decisión de moderación de cada reseña** (publicada o rechazada,
con motivo) y exportaciones. El tablero UTM solo lee agregados. Auditoría inmutable (RN-R5-02).

## 8. Estados y casos borde

- **Vacío/cargando/error/sin permisos:** cada pestaña lo explica y ofrece acción primaria; sin
  permiso, la ruta va deshabilitada y las acciones llevan tooltip «Requiere permiso de {permiso}».
- **Promoción vencida:** no se publica y se marca «vencido»; para reutilizarla se duplica.
- **Cupón agotado:** no aplica y el detalle explica por qué (usos/usos máximos o vigencia).
- **Newsletter:** sin consentimiento no se envía y se contabiliza como excluido; las bajas se
  respetan en todos los canales; los fallos de envío quedan visibles (`notificacion.error`).
- **Reseña ofensiva:** no se publica; la decisión con motivo queda auditada (RF-R5-103).
- **Envío o exportación grande:** límite claro, proceso en segundo plano y aviso al solicitante
  (RNF-R5-04); nunca bloquea la operación.
- **Dos administradores editan la misma promoción o cupón:** 409 con la versión vigente; gana lo
  confirmado por el servidor.
- **Zona horaria distinta:** vigencias y fechas se muestran en la zona de la sede; una promoción
  sin sede aplica a todas las sedes.

## 9. Criterios de aceptación

| # | Criterio verificable |
|---|---|
| 1 | Crear una promoción con vigencia y sede: lo vencido no se publica y aparece marcado «vencido» (RF-R5-100) |
| 2 | Un cupón con usos máximos agotado no aplica y el detalle explica el motivo (RF-R5-101) |
| 3 | El newsletter solo envía a contactos con consentimiento y la baja se respeta en todos los canales (RF-R5-102, RF-R5-91) |
| 4 | Una reseña ofensiva no se publica y la decisión queda auditada con quién, cuándo y motivo (RF-R5-103) |
| 5 | Encuestas y reseñas se consultan y moderan desde el panel con estados claros (RF-R5-103) |
| 6 | (V2) Las métricas por UTM atribuyen reservas y pedidos con frescura ≤ 1 min (RF-R5-104, RNF-R5-02) |

## 10. Plan de trabajo

- [ ] **F1 — API/datos:** DTOs y validaciones (`desde < hasta`, usos, consentimiento); CRUD de
      promociones/cupones/suscriptores; moderación; envío de newsletter sobre `notificacion`;
      auditoría con `motivo`; exportaciones con registro.
- [ ] **F2 — Lectura/lista:** `modules/promociones` (api/pages/components/types); ruta lazy y
      guard; pestañas en URL; lista con estados vigente/programado/vencido/pausado; estados
      vacío/cargando/error/sin permisos.
- [ ] **F3 — Detalle/acciones:** `PromotionForm` con previsualización; `CouponForm` con usos;
      `ReviewModeration` con motivo; conflicto 409.
- [ ] **F4 — Masivo/envíos/en vivo:** `SendWizard` con segmentos y consentimiento; eventos
      `promocion.*`, `cupon.agotado`, `resena.creada`; métricas UTM (V2) con agregados.
- [ ] **F5 — Pruebas:** e2e RF-R5-100…103; envío solo a consentidos; moderación auditada;
      exportación en segundo plano; accesibilidad AA y teclado.

## 11. Dependencias y pendientes

- **Fase 0** y **Usuarios y roles**; **Clientes** (10) aporta `cliente_id`, consentimiento y
  segmentos; **Sucursal y ajustes** (19) las plantillas y canales de notificación; **Catálogo**
  (06) si los banners enlazan productos; **Pedidos** y **Reservas** más `analytics` para la
  atribución UTM (V2).
- Preguntas de R5 §14 que afectan: #3 (retención de auditoría, 2 años por defecto) y #7
  (consolidado multi-sucursal en V1).
- Pendientes a cerrar: política de moderación (quién puede publicar), importación de reseñas
  externas (Google/TripAdvisor), límites de envío y plantillas por canal, definición exacta del
  «control de abuso» y si un cupón puede combinarse con promociones.
