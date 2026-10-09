# 05 — Módulo Chat interno (mensajería del mesero)

**Contexto.** El mesero necesita coordinarse en el turno **sin salir del flujo de operación**: avisar a
cocina/barra, pedir autorización al capitán, recibir avisos de administración o de caja. Hoy no existe
un canal interno: la coordinación se hace a gritos o por radio. Este módulo agrega una **mensajería
interna** accesible desde la cabecera del APK.

Está fuera de la barra inferior (es transversal, como el perfil); por eso **no** ocupa una pestaña: se
abre desde un **botón en la cabecera**, junto al botón de usuario, y con **badge de no leídos**.

> Alcance de esta serie: ver [`00-indice.md`](./00-indice.md). Aquí solo se aterriza el **cómo**.

---

## 1. Contexto y alcance

- **Qué resuelve:** comunicación interna del turno (mesero ↔ cocina, barra, caja, admin, capitán y
  entre meseros) integrada al contexto de pedidos.
- **Prioridad:** **V1** (no bloquea el MVP de Comandas/Avisos). El prototipo ya lo incluye en modo
  maqueta.
- **Fuera de alcance:** chat con el **cliente** (eso es el bot/web), adjuntos pesados, llamadas/voz,
  borrado de mensajes, edición.
- **No confundir** con `pedido_comentario` (módulo 03 Historial): esos son comentarios **del pedido**
  con autor cliente/cocina/mesero; el chat es **conversación libre**, no atada a un pedido (aunque
  puede referenciarlo).

## 2. Requisitos cubiertos

No hay RF-R3 específico de chat; se propone como **RF nuevo** y se apoya en transversales:

| Requisito | Tipo | Criterio |
|---|---|---|
| Mensajería interna mesero ↔ cocina/barra/caja/admin/capitán | RF nuevo (propuesto) | enviar y recibir en ≤ 1 s en línea; cola si offline |
| Aviso de mensaje nuevo | RF-R3-35 (analogía) | badge de no leídos + sonido/vibración configurables |
| Permiso y trazabilidad | RN-R3-04, RNF | canales por rol; toda acción auditada |
| Offline-first | RN-R3-13 | mensaje se encola (`sync_operacion`) y se marca «Enviado/Pendiente» |

## 3. Rutas y pantallas

- **Acceso:** botón `chat` en la cabecera (`/(app)` layout), junto al botón de usuario; badge con el
  total de no leídos.
- **Superficie:** pantalla completa sobre el layout (como el perfil), no una pestaña.
- **Pantallas / estados internos:**
  1. **Bandeja (lista de canales):** canales de estación/área + directos; cada fila con icono, nombre,
     último mensaje, hora y contador de no leídos.
  2. **Hilo:** burbujas (propias a la derecha, de otros a la izquierda, sistema centrado), autor, hora
     y estado (Enviado/Leído), separador de día, **respuestas rápidas** y campo de texto + enviar.
  3. **Referencia a pedido (V2):** insertar `Mesa NN · Pedido #N` como tarjeta dentro de un mensaje.

## 4. Datos

*Supuesto/pendiente* — el esquema no tiene chat todavía. Se propone:

| Tabla | Campos clave |
|---|---|
| `chat_canal` | `id`, `sucursal_id`, `nombre`, `tipo` (`estacion`/`area`/`directo`/`equipo`), `ref_id` (estación/área/usuario), `activo` |
| `chat_miembro` | `canal_id`, `usuario_id`, `rol` (`miembro`/`observador`), `ultimo_leido_en` |
| `chat_mensaje` | `id`, `canal_id`, `autor_id` (null si `sistema`), `sistema`, `texto`, `pedido_id?`, `client_op_id`, `enviado_en`, `leido_en` |

- **No leídos** = mensajes con `enviado_en > ultimo_leido_en` del miembro.
- El **KDS** puede publicar en el canal de su estación (`comanda.recibida`, `comanda.lista`).

## 5. API propuesta

- `GET /mesero/chat/canales` → canales del usuario con `noLeidos` y último mensaje.
- `GET /mesero/chat/canales/:id/mensajes?page=&pageSize=` (paginado, más recientes al final).
- `POST /mesero/chat/canales/:id/mensajes` `{ texto, pedidoId? }` + `Idempotency-Key` → mensaje creado.
- `POST /mesero/chat/canales/:id/leer` `{ hastaEn }` → marca leído.
- **Socket.IO** namespace `/mesero`: `chat.mensaje` (nuevo mensaje en un canal del usuario),
  `chat.leido`. Al reconectar, refetch del hilo abierto y del conteo de no leídos.

## 6. Frontend

- **Componentes compartidos** (Fase 0): `ScreenHeader`, `EmptyState`, `ConnectionPill`, marca
  Enviada/Pendiente.
- **Propios:** `ChatButton` (cabecera con badge), `ChatScreen` (bandeja + hilo),
  `ChatChannelRow`, `ChatBubble`, `ChatQuickReplies`, `ChatComposer`.
- **Interacciones clave:** abrir/cerrar; seleccionar canal (marca leído); enviar con Enter; respuestas
  rápidas (una pulsación); scroll automático al último mensaje; marcas de estado por mensaje propio.
- **Integración de operación:** al **enviar una comanda** a cocina se publica un mensaje de **sistema**
  en el canal de la estación; los **avisos** (módulo 02) pueden hacer deep-link al hilo.
- **Táctil ≥ 48 px**; input y botón enviar siempre visibles (teclado) — en React Native, `KeyboardAvoidingView`.

## 7. Permisos y trazabilidad

- `chat.ver`, `chat.enviar`; **canales por rol** (un mesero no entra al canal de admin si no
  corresponde). Envío a un canal restringido → 403.
- Cada mensaje escribe autor, dispositivo y `enviado_en` del **servidor**; no editable ni borrable.
- Mensajes de **sistema** (comanda enviada, KDS) llevan autor nulo y `sistema = true`.

## 8. Estados y casos borde

- **Vacío:** «Sin conversaciones» / hilo sin mensajes.
- **Cargando / error / sin permisos** explicados; reconexión con banner.
- **Offline:** el mensaje se encola y muestra «↻ Pendiente»; al reconectar se aplica (idempotente).
- **Canal con muchos no leídos** y mensajes muy largos (wrap, sin desbordes).
- **Rate limit** de envío (anti doble tap).

## 9. Criterios de aceptación

1. El botón `chat` de la cabecera abre la bandeja y su badge refleja los no leídos totales.
2. Enviar un mensaje lo agrega al hilo como propio con hora y estado.
3. Abrir un canal pone su contador de no leídos en 0.
4. Enviar una comanda genera un mensaje de **sistema** en el canal de la estación.
5. Offline, el mensaje queda «Pendiente» y no se pierde.

## 10. Plan de trabajo

- **F1 (API/datos):** tablas `chat_*`, endpoints REST, namespace Socket.IO, permisos por canal.
- **F2 (lectura):** `ChatButton` + banda de no leídos; `ChatScreen` bandeja con datos reales.
- **F3 (detalle/acciones):** hilo, composer, respuestas rápidas, marcar leído.
- **F4 (vivo/offline):** `chat.mensaje` en vivo, cola offline, marcas Enviada/Pendiente.
- **F5 (pruebas):** criterios 1–5, casos borde, permisos por rol.

## 11. Dependencias y pendientes

- **Fase 0** (navegación/estado permanente, cliente API, socket, offline, notificaciones).
- **Estaciones** (canales de cocina/barra) y **Comandas** (para el mensaje de sistema al enviar).
- **Pendientes/preguntas:** ¿los directos 1:1 con otros meseros entran en V1 o V2?; ¿retención de
  mensajes?; ¿el canal admin lo ven todos o solo capitán?; ¿push cuando la app está en segundo plano?

---

## Nota sobre este prototipo (React web)

En `Interface movil waiter` (export de Figma Make) el módulo se implementa **en memoria**, con datos de
ejemplo y sin backend: botón `chat` en la cabecera con badge, `ChatScreen` con bandeja de canales
(Cocina, Barra, Administración, Caja, Equipo, directo con capitán), hilo con burbujas, respuestas
rápidas, envío local y un mensaje de **sistema** cuando se manda una comanda a cocina. La lógica de
no leídos y de canales por rol es de presentación; la versión real sigue el plan de arriba.
