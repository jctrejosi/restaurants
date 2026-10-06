# Módulos del panel de administración — planes de implementación

**Qué es este directorio.** Los planes de implementación **módulo a módulo** del panel de
administración (`Interface web admin`). El brief de diseño original está en
[`../front/05-plan-panel-administracion.md`](../front/05-plan-panel-administracion.md) y los
requisitos en
[`../../requerimientos/05-panel-administracion.md`](../../requerimientos/05-panel-administracion.md)
(en adelante «R5»). El brief dejó generado con Figma Make el shell y el tablero «En vivo»; estos
documentos cubren los **submódulos del sidebar** que quedaron sin especificación implementable.

**Alcance de cada documento.** No repiten el brief: lo aterrizan a rutas, pantallas, tablas ya
migradas, API NestJS, eventos en vivo, permisos, casos borde, criterios de aceptación y plan de
trabajo por fases. Ante conflicto, manda R5 y después el plan 05; aquí solo se añade el **cómo**.

---

## 1. Mapa de módulos

El sidebar del plan 05 §4.1 tiene seis bloques. La interfaz generada muestra los cinco primeros y
«Sucursal y ajustes» abajo; **Usuarios y roles** y **Dispositivos** (bloque Configuración del plan)
aún no están en el sidebar y hay que agregarlos al implementar. Renombres de la interfaz generada
respecto del plan: «Estaciones» → Estaciones e impresoras; «Caja y turnos» → Caja y turnos;
«Pagos» → Pagos y propinas.

| # | Módulo | Bloque | Rutas | Prioridad | RF (R5) | Documento |
|---|---|---|---|---|---|---|
| 01 | En vivo | Operación | `/en-vivo` | MVP | 01–05 | [01-en-vivo.md](./01-en-vivo.md) |
| 02 | Pedidos | Operación | `/pedidos`, `/pedidos/:id` | MVP | 50–56, 131–132 | [02-pedidos.md](./02-pedidos.md) |
| 03 | Reservas (+ bloqueos y festivos) | Operación | `/reservas`, `/reservas/calendario`, `/reservas/:id` | MVP | 40–47 | [03-reservas.md](./03-reservas.md) |
| 04 | Comandas | Operación | `/comandas`, `/comandas/:id` | MVP | 60–63 | [04-comandas.md](./04-comandas.md) |
| 05 | Salón | Operación | `/salon` | MVP | 20–23 | [05-salon.md](./05-salon.md) |
| 06 | Catálogo (+ disponibilidad + importación) | Negocio | `/catalogo`, `/catalogo/:id`, `/catalogo/disponibilidad`, `/catalogo/importar` | MVP | 10–15 | [06-catalogo.md](./06-catalogo.md) |
| 07 | Estaciones e impresoras | Negocio | `/estaciones` | MVP | 30–34 | [07-estaciones.md](./07-estaciones.md) |
| 08 | Promociones | Negocio | `/promociones` | V1 | 100–104 | [08-promociones.md](./08-promociones.md) |
| 09 | Domicilio y repartidores | Servicio | `/domicilio` | V1 | 110–113 | [09-domicilio.md](./09-domicilio.md) |
| 10 | Clientes | Servicio | `/clientes`, `/clientes/:id` | V1 (91 MVP) | 90–93 | [10-clientes.md](./10-clientes.md) |
| 11 | Caja y turnos | Dinero | `/caja`, `/caja/:turnoId` | MVP | 70–75 | [11-caja-turnos.md](./11-caja-turnos.md) |
| 12 | Pagos y propinas | Dinero | `/pagos` | MVP | 71, 75 | [12-pagos.md](./12-pagos.md) |
| 13 | Facturación | Dinero | `/facturacion` | V1 | 80–82 | [13-facturacion.md](./13-facturacion.md) |
| 14 | Reportes | Analítica | `/reportes` | MVP | 120–127 | [14-reportes.md](./14-reportes.md) |
| 15 | Tiempos y SLA | Analítica | `/tiempos` | MVP | 122, §5.3 | [15-tiempos-sla.md](./15-tiempos-sla.md) |
| 16 | Auditoría | Analítica | `/auditoria`, `/auditoria/:entidad/:id` | MVP | 130–134 | [16-auditoria.md](./16-auditoria.md) |
| 17 | Usuarios y roles | Configuración | `/usuarios`, `/roles` | MVP | 140–144 | [17-usuarios-roles.md](./17-usuarios-roles.md) |
| 18 | Dispositivos y versiones | Configuración | `/dispositivos` | MVP | 150–152 | [18-dispositivos.md](./18-dispositivos.md) |
| 19 | Sucursal y ajustes | Configuración | `/ajustes` | MVP | 160–164 | [19-sucursal-ajustes.md](./19-sucursal-ajustes.md) |

Fuera de esta serie: **Acceso** (`/entrar`: login, 2FA, `SessionGuard`) y el **shell** (búsqueda
global, sede activa, campana de alertas) ya quedaron especificados en el plan 05 §6.1–6.2 y
§14.1–14.2; se implementan como **Fase 0** (§5 de este documento). **Ayuda y soporte** es pantalla
auxiliar (atajos, contacto): se resuelve con enlaces y no tiene RF propio.

---

## 2. Punto de partida (estado real del repo)

- **`Interface web admin` es el export de Figma Make.** Todo vive en un solo `src/App.tsx`
  (~876 líneas): shell, sidebar, tablero «En vivo» con datos de ejemplo y un aviso «Vista previa
  del módulo X» para el resto de los ítems. No hay router ni navegación real.
- **Dependencias actuales:** `react` 19, `react-dom`, `lucide-react`, Tailwind v4 (Vite 8 + TS).
  No hay cliente HTTP, estado de servidor, gráficos ni WebSocket.
- **Backend:** esqueleto NestJS 11 en `backend/` (puerto **3001**, Swagger en `/api/docs`,
  `ValidationPipe` global, CORS por `CORS_ORIGIN`). Solo existen `app.module` y la capa
  `src/database` (Drizzle).
- **Base de datos: implementada.** Esquema Drizzle en `backend/drizzle/schema/*` (módulos 01–08),
  migraciones `0000`–`0008` y esquema **`analytics`** con vistas materializadas
  (`mv_ventas_diarias`, `mv_ventas_producto`, `mv_reservas_diarias`, `mv_tiempos_pedido`,
  `mv_tiempos_comanda`, `mv_sla_estacion`, `mv_ocupacion_mesa`, `mv_desempeno_mesero` y
  `fn_refrescar_analytics()`), en `backend/drizzle/migrate/0008_analytics.sql`.
  Los reportes y tiempos **solo** leen `analytics` (RN-R5-03).
- **Referencia del esquema:** [`../../esquema/`](../../esquema/README.md) (volúmenes 01–04)
  documenta cada tabla con sus columnas.

**Conclusión:** cada módulo de esta serie es, sobre todo, **API nueva + pantalla nueva** sobre una
base de datos que ya existe y un prototipo visual que hay que modularizar.

---

## 3. Estructura objetivo del front

Refactorizar el prototipo en módulos, sin romper el lenguaje visual ya definido (tokens del plan 05
§3):

```
Interface web admin/src/
  app/
    App.tsx            # providers + router
    shell/             # AppShell, SidebarNav, Topbar (GlobalSearch, SedeSelector, AlertBell, usuario)
    router.tsx         # rutas por módulo, cargadas por lazy()
    providers.tsx      # QueryClient, Auth, SedeActiva, Socket, Toasts
  components/
    ui/                # Button, Input, Select, Chip, Badge, Modal, Drawer, Skeleton, EmptyState…
    data/              # DataTable, FilterBar, SavedViewChip, DetailDrawer, EntityHeader,
                       # StatusBadge, MoneyCell, DurationCell, Timeline, BeforeAfterDiff,
                       # ConfirmDialog, ReasonSelect, Pagination, BulkActionBar
    charts/            # wrappers de recharts con tokens chart-1…8
  modules/
    en-vivo/ pedidos/ reservas/ comandas/ salon/ catalogo/ estaciones/ promociones/
    domicilio/ clientes/ caja/ pagos/ facturacion/ reportes/ tiempos/ auditoria/
    usuarios/ dispositivos/ ajustes/
      api.ts           # hooks react-query del módulo
      pages/           # pantallas (lista, detalle, subpáginas)
      components/      # componentes propios del módulo
      types.ts         # DTOs del módulo
  lib/
    api.ts             # fetch wrapper: baseURL, errores, paginación
    socket.ts          # socket.io-client, rooms y reconexión
    format.ts          # moneda/fecha/zona por sucursal, cifras tabulares
    permissions.ts     # <Can>, usePermiso, rutas protegidas
    saved-views.ts     # vistas guardadas (URL + usuario)
```

**Dependencias a añadir:** `react-router-dom`, `@tanstack/react-query`, `socket.io-client`,
`recharts`, `react-hook-form` (+ resolver), primitivas Radix/shadcn, `date-fns` si hace falta.
Tailwind v4 y `lucide-react` ya están.

---

## 4. Convenciones transversales (obligatorias en todos los módulos)

### 4.1 API (NestJS, 3001)

- REST JSON bajo **`/admin/…`** (prefijo propuesto; se fija con el plan de backend/API). Ej.:
  `GET /admin/pedidos`, `POST /admin/caja/turnos`, `PATCH /admin/usuarios/:id`.
- **Paginación** `?page=&pageSize=`; respuesta de listas `{ data, total, page, pageSize }`.
- **Filtros combinables por query** (sede, estado, fechas ISO, texto…). En el front viven en la
  **URL** (compartible) y se materializan como `SavedView`.
- **Orden** `?orden=campo:asc|desc`. Fechas siempre ISO 8601 con zona; se pintan en la zona de la
  sede (RNF-R5-08).
- **Errores** `{ statusCode, message, codigo? }`; conflictos → **409** con el detalle del conflicto
  (R5 §13). `class-validator` + `ValidationPipe` ya global.
- **Acciones sensibles** llevan `motivo` (obligatorio) y `Idempotency-Key` en POST/PATCH críticos;
  el servidor es idempotente.
- **Multi-tenant/sucursal:** el servidor filtra por el alcance del usuario (RNF-R5-01); el front
  nunca es la única defensa. La sede activa del shell acota todas las consultas.
- **Exportaciones:** crean registro en `exportacion`; si el volumen es alto, segundo plano con
  aviso al solicitante (RNF-R5-04, RN-R5-10).

### 4.2 Realtime (Socket.IO)

- Namespace **`/admin`**; room por sucursal `sucursal:{sucursalId}`.
- Eventos nombrados `dominio.accion` en pasado: `pedido.creado`, `pedido.estado`,
  `comanda.estado`, `mesa.estado`, `reserva.estado`, `alerta.creada`, `caja.turno`,
  `sync.pendiente`, `dispositivo.estado`. Cada módulo detalla los suyos.
- **Al reconectar:** refetch completo del segmento (los eventos no se reprocesan).
- Lo operativo es en vivo; lo analítico muestra «Actualizado hace {n} min» (≤ 1 min, RNF-R5-02).

### 4.3 Identidad, permisos y datos personales

- JWT + permisos por **módulo.acción** (`pedidos.ver`, `pedidos.anular`, `caja.reabrir`,
  `catalogo.precios`, `auditoria.ver`…); alcance por sucursal como parte del permiso.
- Sin permiso: ítem del sidebar **deshabilitado con explicación** y acciones ausentes o
  deshabilitadas con tooltip «Requiere permiso de {permiso}» (plan 05 §6.23).
- Acciones sensibles (RN-R5-06): reabrir caja, reembolsar, anular tras preparación, cambiar
  precios → permiso específico + confirmación con motivo + autorización (PIN/2FA según política).
- **Datos personales enmascarados** para roles que no los necesitan (RN-R5-07); toda consulta
  sensible deja registro de acceso (RNF-R5-09).

### 4.4 Trazabilidad y auditoría

- Toda mutación sensible escribe en **`evento_auditoria`** y, si corresponde, en
  **`bitacora_evento`** (entidad, entidad_id, evento, actor, canal, dispositivo, hora del servidor,
  antes/después, motivo) — RN-R5-01.
- Bitácoras y auditoría **inmutables**: la UI no ofrece editar ni borrar (RN-R5-02).
- Desde cualquier detalle se llega a la **bitácora en un clic**; desde la bitácora se vuelve a la
  entidad (plan 05 §8).

### 4.5 Tiempos

- Tramos calculados con **sellos del servidor** (RN-R5-08) y fórmulas de R5 §5.3, mostradas en
  tooltip («= pagado − por cobrar»).
- Sin evento de cierre: la celda muestra **«—»** y **no promedia** (R5 §5.3).
- Se pintan como duración (`04:12`, `1 h 12 m`) con semáforo contra SLA o promedio.

### 4.6 UI

- Componentes compartidos de la §3; densidad cómoda/compacta; tarjetas y tablas con los tokens del
  plan 05 §3.2 (`app-bg`, `panel`, `border-subtle`, `row-hover`…), series `chart-1…8`.
- Todo listado tiene **estados de vacío, cargando, error y sin permisos** explicados (R5 §8).
- Confirmaciones destructivas con `ConfirmDialog` + `/` como atajo a la búsqueda; accesibilidad AA
  y navegación por teclado (RNF-R5-07).
- Copy en español y con el vocabulario del negocio (plan 05 §10).

---

## 5. Fase 0 — fundaciones (previa a todos los módulos)

1. **Router + shell:** migrar `App.tsx` a `app/App.tsx` con `react-router-dom`; rutas por módulo con
   `lazy()`; `AppShell` con sidebar (nuevo bloque Configuración), topbar, `SedeSelector`,
   `AlertBell` y menú de usuario con rol/sede/salir.
2. **Sesión:** login `/entrar`, 2FA (V1), `SessionGuard` (aviso 25 min / cierre 30), guard de rutas
   por permiso.
3. **Cliente de datos:** `lib/api.ts` (fetch + errores + paginación) y `QueryClient` con
   `staleTime` por dominio; `lib/socket.ts` con reconexión y suscripción por sucursal.
4. **Kit compartido:** `DataTable`, `FilterBar`, `SavedViewChip`, `DetailDrawer`, `StatusBadge`,
   `MoneyCell`, `DurationCell`, `Timeline`, `ConfirmDialog`, `ReasonSelect`, `EmptyState`,
   `Skeleton`, `ErrorState`; `lib/format.ts` (moneda/fecha/zona por sucursal).
5. **Búsqueda global** `⌘K` (pedidos, reservas, clientes, productos, folios) y **alertas** en shell.
6. **Auditoría base:** helper de mutación que adjunta `motivo` y el registro de eventos.

---

## 6. Plantilla de cada documento de módulo

1. **Contexto y alcance** — qué resuelve, qué queda fuera, prioridad MVP/V1/V2.
2. **Requisitos cubiertos** — tabla RF-R5 (+ RN/RNF aplicables) con prioridad y criterio.
3. **Rutas y pantallas** — lista/calendario/detalle/subpáginas; acciones por pantalla.
4. **Datos** — tablas del esquema implicadas (nombre exacto) y campos clave; notas de snapshot,
   inmutabilidad o agregados (`analytics`) cuando aplique.
5. **API propuesta** — endpoints REST (método, ruta, para qué) y eventos Socket.IO.
6. **Frontend** — componentes compartidos y propios, layout, interacciones clave.
7. **Permisos y trazabilidad** — pares `modulo.accion` y qué se audita o va a bitácora.
8. **Estados y casos borde** — vacío/cargando/error/sin permisos y los casos de R5 §13 propios.
9. **Criterios de aceptación** — verificables, derivados de los criterios de R5.
10. **Plan de trabajo** — checklist por fases: (F1) API/datos, (F2) lectura/lista,
    (F3) detalle/acciones, (F4) en vivo/exportación, (F5) pruebas.
11. **Dependencias y pendientes** — módulos previos, preguntas de R5 §14 que lo afectan.

---

## 7. Orden de implementación sugerido

1. **Fase 0** (fundaciones) y **En vivo** + **Pedidos** + **Comandas** (el hilo operativo diario).
2. **Reservas** + **Salón** (y políticas/bloqueos) y **Caja** + **Pagos** (cierre del día).
3. **Catálogo** + **Estaciones** (sin esto no hay comandas reales) y **Usuarios** +
   **Dispositivos** + **Sucursal y ajustes** (gobierno y alta de sedes).
4. **Reportes** + **Tiempos y SLA** + **Auditoría** (analítica y trazabilidad).
5. **V1**: **Promociones**, **Domicilio**, **Clientes**, **Facturación** y las partes V1 de los
   módulos anteriores.

Dependencias críticas: Catálogo → Estaciones → Comandas/En vivo; Salón ↔ Reservas; Caja ← Pagos;
Usuarios/permisos ← todo lo demás; `analytics` ← Reportes/Tiempos.

---

## 8. Cómo mantener este directorio

- Un `.md` por módulo, numerado; los cambios de alcance se anotan en el propio módulo con
  **fecha y RF afectado**.
- Si R5 cambia, actualizar primero el requerimiento y después el módulo; nunca al revés.
- Estos planes asumen las **preguntas abiertas de R5 §14** con sus supuestos por defecto
  (2FA en V1, retención de auditoría 2 años, cierre diario por correo, etc.); si el cliente las
  cambia, revisar los módulos afectados.
