# Módulos del APK del mesero — planes de implementación

**Qué es este directorio.** Los planes de implementación **módulo a módulo** de la aplicación del
mesero (proyecto `Interface movil waiter`, que se implementará como `Interface movil mesero` en
Expo + React Native). El brief de diseño original está en
[`../front/03-plan-apk-mesero.md`](../front/03-plan-apk-mesero.md) y los requisitos en
[`../../requerimientos/03-apk-mesero.md`](../../requerimientos/03-apk-mesero.md) (en adelante «R3»).
El brief dejó generado con Figma Make el **mapa de salón** y el **perfil del mesero**; estos
documentos cubren los módulos de la **barra inferior** que todavía no tienen implementación:
**Comandas** y **Avisos**.

**Alcance de cada documento.** No repiten el brief: lo aterrizan a rutas, pantallas, tablas ya
migradas, API, eventos en vivo, permisos, casos borde, criterios de aceptación y plan de trabajo por
fases. Ante conflicto manda R3 y después el plan 03; aquí solo se añade el **cómo**.

**Diferencia con `admin-modules`.** El panel de administración es una **web**; el APK es una app
**offline-first**. Eso condiciona todo: cada operación lleva `client_op_id`, se encola en
`sync_operacion` y se marca «Enviada/Pendiente»; el servidor es idempotente y sella los tiempos.

---

## 1. Mapa de módulos

La barra inferior es **Salón · Comandas · Avisos · Historial**. `Salón` (mapa de mesas), el
**perfil del mesero** (desde el avatar de la cabecera) y, ya implementados en el prototipo,
**Comandas**, **Avisos** e **Historial** (módulo 03, que **ocupa el lugar de la antigua pestaña
«Yo»**).

| # | Módulo | Pestaña | Rutas (expo-router) | Prioridad | RF (R3) | Documento |
|---|---|---|---|---|---|---|
| 01 | Comandas | Comandas | `/(app)/comandas`, `/(app)/mesa/[id]/comandas` | MVP/V1/V2 | 30–35, 82 | [01-comandas.md](./01-comandas.md) |
| 02 | Avisos | Avisos (badge) | `/(app)/avisos` | MVP/V1/V2 | 13, 15, 35, 36, 47, 48, 63, 64 | [02-avisos.md](./02-avisos.md) |
| 03 | Historial de pedidos | Historial | `/(app)/historial`, `/(app)/historial/[id]` | V1 | — (nuevo RF propuesto) | [03-historial.md](./03-historial.md) |

> **Sin impresión de comandas (instalación 2026-10).** En este despliegue las comandas llegan al
> **KDS en un TV de cocina (otra app)**; no hay impresoras. Por eso **RF-R3-70/71/72/73** (impresión)
> y **RF-R3-62** (reimpresión sin conexión) **no aplican** a las comandas y donde el brief dice
> *reimprimir* se implementa **reenviar a cocina**. Detalle en [01-comandas.md](./01-comandas.md).

Notas de alcance:

- El nav del brief (§3) dice «Mis mesas» donde el prototipo puso «Comandas»; se adopta **Comandas**
  (el filtro «Mis mesas» pasa a ser un chip dentro del módulo). Es un cambio de etiqueta, no de
  requisitos.
- El módulo 03 **Historial** reemplaza el ítem «Yo» del nav; el **perfil** se abre desde el avatar.
- Fuera de esta serie: **acceso** (lock/PIN/vincular/turno), **salón** y **cuenta/cobro**, ya
  especificados en el plan 03 §6 y §14. Estos módulos **consumen** lo que esos producen
  (comandas generadas al enviar, pedidos web, reservas) pero no lo redefinen.
- Numeración **local a esta serie** (01, 02, 03); es independiente de `admin-modules`.

---

## 2. Punto de partida (estado real del repo)

- **`Interface movil waiter` es el export de Figma Make.** Todo vive en un solo `src/App.tsx`
  (~2,6k líneas) y `src/index.css` (~1,6k líneas): el **mapa de salón**, el **perfil del mesero**
  (avatar) y los módulos **Comandas**, **Avisos** e **Historial** con datos de ejemplo. No hay
  router, ni cliente HTTP, ni estado de servidor, ni WebSocket: la navegación es por estado interno.
- **Dependencias actuales:** `react` 19, `react-dom`, Tailwind v4 (Vite 8 + TypeScript). No hay
  nada de app nativa todavía.
- **Destino real de la app:** **Expo + React Native** (stack de las apps móviles de `ecommerce`:
  `expo-router`, `zustand`, `@tanstack/react-query`, `socket.io-client`, `expo-secure-store`,
  `@react-native-community/netinfo`, `expo-notifications`), proyecto `Interface movil mesero`
  (plan 03 §1.1 y §12.2). El export web es **referencia visual** y base del prototipo.
- **Backend:** esqueleto NestJS 11 en `backend/` (puerto **3001**, Swagger en `/api/docs`,
  `ValidationPipe` global).
- **Base de datos: implementada.** Esquema Drizzle en `backend/drizzle/schema/*`
  (`01-nucleo` … `08-operacion`), migraciones y esquema **`analytics`** con vistas materializadas
  (`mv_tiempos_comanda`, `mv_sla_estacion`, `mv_desempeno_mesero`, `fn_refrescar_analytics()`).
  Referencia por tabla en [`../../esquema/`](../../esquema/README.md).

**Conclusión:** cada módulo es, sobre todo, **API nueva + pantalla nueva** sobre una base de datos
que ya existe, más la **cola offline** que es propia de esta app. El catálogo, las estaciones, el
KDS, los pedidos web y las reservas son **dependencias de datos** que otras interfaces alimentan.

---

## 3. Estructura objetivo del front

### 3.1 App nativa (Expo + expo-router)

```
Interface movil mesero/src/
  app/
    _layout.tsx            # providers (Query, Socket, Offline, Notificaciones)
    (auth)/                # lock, pin, vincular, turno
    (app)/
      _layout.tsx          # barra inferior + estado permanente (ConnectionPill, AlertToast)
      salon.tsx
      comandas.tsx         # módulo 01
      mesa/[id]/comandas.tsx
      avisos.tsx           # módulo 02
      yo.tsx
  features/
    comandas/  avisos/
      api.ts               # hooks react-query del módulo
      screens/             # pantallas y hojas del módulo
      components/          # componentes propios
      store.ts             # zustand (estado local/offline)
      types.ts             # DTOs del módulo
  lib/
    api.ts             # fetch wrapper: baseURL, errores, Idempotency-Key
    socket.ts          # socket.io-client, rooms y reconexión
    offline/           # netinfo + cola sync_operacion + client_op_id
    notifications.ts   # expo-notifications: sonido/vibración por tipo de aviso
    storage.ts         # expo-secure-store (sesión/PIN) + caché de catálogo
    format.ts          # moneda/fecha/zona por sucursal, cifras tabulares
```

### 3.2 Prototipo actual (React web de Figma Make)

Mientras el prototipo siga en React web, modularizar `src/App.tsx` en `src/features/*` con el mismo
reparto (api/screens/components/store/types) y una navegación mínima de pestañas, para que el salto
a Expo no sea reescritura. La identidad visual ya definida (`src/index.css`, tokens del plan 03 §3)
se conserva.

**Dependencias a añadir (app real):** `expo-router`, `zustand`, `@tanstack/react-query`,
`socket.io-client`, `@react-native-community/netinfo`, `expo-notifications`, `expo-secure-store`;
`date-fns` si hace falta. **Sin print agent:** las comandas no se imprimen, llegan al KDS en un TV.

---

## 4. Convenciones transversales (obligatorias en todos los módulos)

### 4.1 API (NestJS, 3001)

- REST JSON bajo **`/mesero/…`** (prefijo propuesto; lo fija el plan de backend/API, igual que
  `/admin/…` en `admin-modules`). Ej.: `GET /mesero/comandas`, `POST /mesero/avisos/:id/atender`.
- **Paginación** `?page=&pageSize=`; listas `{ data, total, page, pageSize }`.
- **Filtros combinables por query** (sucursal, estado, estación, mesa, turno, fechas ISO, texto).
- **Errores** `{ statusCode, message, codigo? }`; conflictos → **409** con el detalle (p. ej., dos
  meseros sobre la misma mesa, R3 §16).
- **Acciones sensibles** (anular tras preparar, reenviar a cocina, descartar) llevan `motivo` y
  `Idempotency-Key`; el servidor es idempotente.
- **Multi-sucursal:** el servidor filtra por el alcance del usuario (RNF-R3-07); el front nunca es
  la única defensa. Estaciones y pedidos vienen acotados a la sucursal del dispositivo.
- **El APK no inventa precios ni reglas** (RN-R3-10): usa el catálogo y los totales del servidor;
  sin red, el último catálogo sincronizado.

### 4.2 Realtime (Socket.IO)

- Namespace **`/mesero`** (o el que fije el plan de backend); rooms por `sucursal:{id}` y, para
  detalles, `mesa:{id}`.
- Eventos nombrados `dominio.accion` en pasado: `comanda.creada`, `comanda.estado`,
  `comanda.recibida` (recepción del KDS), `alerta.creada`, `pedido.web`, `reserva.proxima`,
  `sync.estado`, `dispositivo.estado`. Cada módulo detalla los suyos.
- **Al reconectar:** refetch del segmento afectado; los eventos no se reprocesan (RN-R3-13).
- Los estados de preparación (`en_preparacion`, `lista`) los emite el **KDS**; el evento
  `comanda.estado` es la fuente para el APK.

### 4.3 Offline e idempotencia (eje del APK)

- **Toda mutación** lleva `client_op_id`; se guarda en `sync_operacion`
  (`unique(client_op_id)`, `estado` pendiente/aplicada/rechazada, `error`). Nada se pierde ni se
  duplica (RN-R3-13, RNF-R3-01).
- **Marcas de confianza** en cada operación: `✓ Enviada` (confirmada por el servidor) o
  `↻ Pendiente` (en cola). El mesero nunca duda si su envío llegó.
- **Qué se puede hacer sin red:** ver el último estado sincronizado, marcar `entregada` y anular
  líneas; el **reenvío a cocina** se encola y se aplica al reconectar (el KDS es remoto).
- **Cola visible:** `ConnectionPill` (plan 03 §6.18) abre el detalle de pendientes/fallidas; los
  avisos de sync fallida viven en el módulo 02.

### 4.4 Identidad, permisos y datos

- **PIN por persona en dispositivo vinculado**; la sesión se bloquea por expiración (plan 03 §6).
- Permisos por **`modulo.accion`** (`comandas.ver`, `comandas.entregar`, `comandas.reenviar`,
  `comandas.anular`, `avisos.ver`, `avisos.atender`, `avisos.configurar`…). Sin permiso: acción
  ausente o deshabilitada, nunca un error críptico.
- **Acciones sensibles** exigen autorización de **capitán** (`PermissionGate` con PIN): anular una
  comanda ya preparada, reenviar una entregada, descartar una alerta (RN-R3-04, §16).
- La app **no almacena datos de tarjeta**; los datos sensibles locales se pueden borrar de forma
  remota al revocar el dispositivo (RNF-R3-03, RN-R3-12).

### 4.5 Trazabilidad

- Toda acción sensible escribe **`evento_auditoria`** (usuario, dispositivo, entidad, acción,
  motivo, antes/después) y, cuando aplica, **`bitacora_evento`**
  (`entidad_tipo` = `comanda` / `pedido`, evento, actor, canal, dispositivo, hora del servidor).
- Bitácoras y auditoría **inmutables**: la app no ofrece editar ni borrar.

### 4.6 Tiempos

- Los tramos usan **sellos del servidor**: `comanda.enviada_en`, `lista_en`, `entregada_en`. El
  tiempo transcurrido es `ahora_servidor − enviada_en`; el de preparación `lista_en − enviada_en`.
  Sin `lista_en` la celda muestra **«—»** y no promedia.
- SLA contra **`regla_sla`** (por estación o producto) o `producto.tiempo_objetivo_seg`; el
  semáforo es en tiempo / por vencer / excedido. Agregados del turno salen de `analytics`.

### 4.7 UI/UX móvil

- Tokens y estados del plan 03 §3; **táctil ≥ 48 px**; estado siempre con **color + texto + icono**.
- Uso **a una mano**; hojas modales que **suben desde abajo**; **haptics** en confirmaciones y
  avisos; sonidos **distintos** entre «listo» y «SLA excedido» (RF-R3-35).
- Todo listado tiene **vacío, cargando, error y sin permisos** explicados; copy en español y frases
  cortas.

---

## 5. Fase 0 — fundaciones (previa a todos los módulos)

1. **Navegación:** `expo-router` con `(app)/_layout.tsx` (barra inferior de 4 pestañas con badge en
   Avisos) y **estado permanente** (`ConnectionPill` + `AlertToast` global).
2. **Sesión:** lock/PIN/vinculación y `PermissionGate`; `expo-secure-store`.
3. **Cliente de datos:** `lib/api.ts` (fetch + errores + `Idempotency-Key`) y `QueryClient`;
   `lib/socket.ts` con reconexión y suscripción por sucursal.
4. **Offline:** `lib/offline/` (netinfo + cola `sync_operacion` + `client_op_id`) y **marcas**
   Enviada/Pendiente.
5. **Notificaciones:** `lib/notifications.ts` (canales de sonido/vibración por tipo, permiso del
   sistema, token push).
6. **Kit compartido:** `Sheet`, `StatusBadge`, `ConnectionPill`, `OfflineBanner`, `ComandaCard`
   base + `ComandaStatusStepper`, `SlaBadge`, `EmptyState`, `Skeleton`, `ErrorState`,
   `PermissionGate`, `DestructiveConfirmDialog`, `RelativeTime`.
7. **Auditoría base:** helper de mutación que adjunta `motivo` y escribe el evento.

---

## 6. Plantilla de cada documento de módulo

1. **Contexto y alcance** — qué resuelve, qué queda fuera, prioridad MVP/V1/V2.
2. **Requisitos cubiertos** — tabla RF-R3 (+ RN/RNF aplicables) con prioridad y criterio.
3. **Rutas y pantallas** — lista/detalle/hojas; acciones por pantalla.
4. **Datos** — tablas del esquema implicadas (nombre exacto) y campos clave; **ampliaciones** si el
   esquema no cubre algo (se marcan como *Supuesto/pendiente*).
5. **API propuesta** — endpoints REST y eventos Socket.IO.
6. **Frontend** — componentes compartidos y propios, layout, interacciones clave.
7. **Permisos y trazabilidad** — pares `modulo.accion` y qué se audita.
8. **Estados y casos borde** — vacío/cargando/error/sin permisos y los casos de R3 §16 propios.
9. **Criterios de aceptación** — verificables, derivados de R3.
10. **Plan de trabajo** — checklist por fases: (F1) API/datos, (F2) lectura/lista, (F3)
    detalle/acciones, (F4) en vivo/offline, (F5) pruebas.
11. **Dependencias y pendientes** — módulos previos y preguntas de R3 §17 que lo afectan.

---

## 7. Orden de implementación sugerido

1. **Fase 0** (fundaciones) y **Comandas** en modo **lectura + entregar** (es lo que más se usa en
   el turno y valida la cola offline y el realtime).
2. **Avisos** MVP: bandeja + `AlertToast` + badge, con los tipos de **sistema/offline**
   (sync fallida).
3. **Avisos V1**: comanda lista, SLA excedido, pedido web y reserva próxima (requieren el evento
   del KDS, la web de pedidos y reservas).
4. **Comandas V1**: reenviar a cocina con permiso, anular comanda, estados finos del ciclo.
5. **Historial de pedidos** (módulo 03): lista y **ficha completa** (consumo, comandas, comentarios
   de cliente y cocina, totales y pago); depende de Comandas y Cuenta/cobro.
6. **V2** de todos: supervisión del salón completo, solicitud de cuenta por QR, ocupación
   prolongada, agotados e historial del equipo para capitán.

Dependencias críticas: **Catálogo → Estaciones → Comandas**; **KDS** emite `comanda.estado`;
**web de pedidos** emite `pedido.web`; **Reservas** emite `reserva.proxima`; la **cola offline**
(Fase 0) es prerrequisito de toda acción de escritura.

---

## 8. Cómo mantener este directorio

- Un `.md` por módulo, numerado; los cambios de alcance se anotan en el propio módulo con **fecha y
  RF afectado**.
- Si cambia R3 o el plan 03, actualizar primero el requerimiento/brief y después el módulo; nunca al
  revés.
- Los **supuestos** se marcan explícitamente y se cierran con el plan de backend/API (prefijo,
  tablas nuevas de avisos, eventos).
