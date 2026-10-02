# 01 — Plan del front: web de reservas del cliente

**Entregable de este documento:** el brief de diseño y los **prompts listos para pegar en
Figma Make** que generan la interfaz completa de la web pública de reservas. La fuente de
requisitos es [`../../requerimientos/01-web-reservas-cliente.md`](../../requerimientos/01-web-reservas-cliente.md)
(en adelante «el documento R1»); este plan no cambia requisitos: los traduce a pantallas,
componentes, estados y textos.

**Serie:** este es el plan `01` de la serie de front ([`front/README.md`](./README.md)); las
fundaciones visuales (§3) y el inventario de componentes (§5) los **comparte** el plan
[`02-plan-web-pedidos.md`](./02-plan-web-pedidos.md), que no las repite.

**Estado:** propuesta v0.1 — sujeta a confirmación de marca del cliente (§3.1) y a las preguntas
abiertas de R1 §14.

---

## 1. Cómo usar este documento

El documento tiene dos partes:

1. **Contexto y especificación** (§2–§11): qué se diseña, con qué sistema visual, pantalla por
   pantalla, estados, textos y datos de ejemplo.
2. **Prompts para Figma Make** (§12–§14): cadenas de texto listas para pegar.

### 1.1 Flujo de trabajo recomendado con Figma Make

| Paso | Acción | Prompt |
|---|---|---|
| 1 | Crear el archivo «Web Reservas — Punto C» y pegar el **prompt maestro** (§12). Genera tokens, tipografía y componentes base. | §12 |
| 2 | Generar las **páginas públicas** (Inicio, Carta, Producto, Sedes, Nosotros, FAQ, Contacto, Legales) | §13.1–§13.3, §13.8–§13.10 |
| 3 | Generar el **flujo de reserva completo** y la confirmación | §13.4–§13.5 |
| 4 | Generar **gestionar reserva, lista de espera, eventos y cuenta** | §13.6–§13.7, §13.11 |
| 5 | Aplicar los **estados globales, el prototipo y las micro-interacciones** | §13.12–§13.13 |
| 6 | Revisar con la **lista de verificación** (§11.3) y ajustar por prompts cortos de corrección | — |

**Regla de oro:** un prompt por pantalla; si la generación desvía el estilo, repetir «mantén los
tokens y componentes ya definidos en el archivo». No pedir dos flujos nuevos en el mismo mensaje.

### 1.2 Convenciones en los prompts

- Todo el copy va **en español** (es-MX por defecto; moneda y formato se ajustan por sucursal).
- Nombre de trabajo del restaurante: **«Punto C»** — provisional hasta que el cliente confirme
  identidad de marca (§3.1).
- Productos, precios y sedes de ejemplo salen del seed real de la base
  (`backend/scripts/seed.ts`): coinciden con lo que la web mostrará en el piloto.
- Cada prompt indica los **tokens** por su nombre (`brand-600`, `ink-900`, `cream-50`) y los
  **componentes** por su nombre del inventario (§5).

---

## 2. Contexto del producto

### 2.1 Qué es

Web **pública** (sin login obligatorio) de un restaurante con una o varias sedes. Su trabajo es
**convertir visitas en reservas** (objetivo primario) y, en segundo plano, mostrar la carta y
captar clientes (suscripción, eventos, reseñas).

### 2.2 Público y dispositivos

| Perfil | Entrada típica | Necesita |
|---|---|---|
| Visitante móvil | Google, Instagram, QR, WhatsApp | Reservar en < 2 minutos, sin cuenta |
| Cliente recurrente | Enlace del correo, marcador | Repetir reserva, gestionarla, ver novedades |
| Grupo / evento | Búsqueda «cena para 12» | Derivación clara a solicitud, no reserva en línea |

Móvil primero (390 px de referencia); escritorio 1440 px; sin app nativa.

### 2.3 Objetivos medibles (de R1 §12)

- Reserva completa en **menos de 2 minutos** y pocos pasos (RNF-R1-01).
- Conversión y abandono medibles por paso (analítica con consentimiento).
- Core Web Vitals en verde en móvil 4G (RNF-R1-02) y WCAG 2.2 AA (RNF-R1-03).

### 2.4 Alcance de esta web

- **Dentro:** reserva multi-sucursal, carta digital, páginas de contenido, cuenta (V1), lista de
  espera (V1), solicitud de eventos (V1), marketing y captación.
- **Fuera:** pedidos/pago de comida (→ `02-web-pedidos-cliente.md`), operación de salón
  (→ `03-apk-mesero.md`), backoffice (documento propio).

---

## 3. Fundaciones visuales

### 3.1 Marca (pendientes que el cliente debe confirmar)

| Elemento | Valor provisional | Acción |
|---|---|---|
| Nombre | «Punto C» | Confirmar denominación comercial |
| Logo | Logotipo tipográfico provisional (Fraunces, versalitas) | Pedir logo vectorial; si no existe, diseñar en este proyecto |
| Fotos reales | Existen originales del negocio en `punto_c/01/IMAGENES` (formato BMP) | Curar, convertir a WebP/AVIF y usar en la web; mientras tanto, fotografía de marcador |
| Redes y contacto | Placeholders `@puntoc` , `+52 55 0000 0000` | Reemplazar con datos reales |

### 3.2 Dirección de arte

**«Cálida contemporánea»**: fondo crema, tipografía serif expresiva para títulos, fotografía
como protagonista, terracota como color de acción, detalles en oliva y dorado. Nada de
plantillas genéricas de comida rápida: se siente como una casa de comidas cuidada.

### 3.3 Design tokens

**Color** (contrastes verificados AA sobre los fondos indicados):

| Token | Hex | Uso |
|---|---|---|
| `brand-700` | `#8F3517` | Hover/pressed de acciones, texto de marca sobre claro |
| `brand-600` | `#B4451F` | Botón primario, enlaces, acentos |
| `brand-500` | `#C9603A` | Estados suaves, gráficos |
| `brand-100` | `#F6E3D9` | Fondos de chips y avisos de marca |
| `brand-50` | `#FBF1EB` | Secciones alternas |
| `ink-900` | `#1C1917` | Texto principal, cabecera oscura |
| `ink-700` | `#3F3B38` | Texto secundario |
| `ink-500` | `#6B6560` | Texto terciario, metadatos |
| `ink-300` | `#D6D0C9` | Bordes, divisores |
| `cream-50` | `#FAF7F2` | Fondo de página |
| `cream-100` | `#F3EDE4` | Tarjetas y bloques |
| `leaf-600` | `#4A6B3F` / `leaf-100` `#E8EFE4` | Éxito, etiqueta «vegetariano» |
| `amber-600` | `#B45309` / `amber-100` `#FCF0DC` | Advertencias, «últimas mesas» honesto, pendiente de pago |
| `red-600` | `#B3261E` / `red-100` `#F9E3E1` | Errores, «agotado», cancelaciones |
| `gold-500` | `#C99A2E` | Estrellas de reseñas, detalles de menú del día |
| `white` | `#FFFFFF` | Superficies de tarjeta sobre crema |

**Tipografía**

- Títulos: **Fraunces** (600/700, con `opsz`), display y h1–h3.
- Texto: **Inter** (400/500/600).
- Escala móvil: display 36/40 · h1 32/36 · h2 26/32 · h3 21/28 · body 16/26 · small 14/20 ·
  caption 12/16. Escritorio: display 56/60 · h1 44/48 · h2 34/40 · body 17/28.
- Precios con cifras tabulares (`font-variant-numeric: tabular-nums`).

**Forma y espacio**

- Retícula de 4 pt; contenedor máximo 1200 px; gutter 16 px móvil / 24 px escritorio.
- Radios: `sm 8` · `md 12` (tarjetas) · `lg 16` (bloques grandes, imágenes) · `full` (chips).
- Sombras: `shadow-card 0 1px 2px rgba(28,25,23,.06), 0 8px 24px rgba(28,25,23,.08)`; sin sombras
  duras.
- Bordes de 1 px `ink-300` al 60 % cuando haga falta separar sin sombra.

**Iconografía e imágenes**

- Iconos: **Lucide** (trazo 1.75, 20/24 px).
- Fotografía: relación 4:3 en tarjetas de producto, 4:5 en hero móvil, 16:9 en hero escritorio;
  esquinas `lg`; siempre con `alt` descriptivo en español.
- Ilustraciones: no; solo fotos y patrones suaves de textura opcional (papel).

**Movimiento**

- Transiciones 180–240 ms `ease-out`; hover de tarjeta con elevación sutil; `prefers-reduced-motion`
  desactiva todo salvo fundidos.

---

## 4. Arquitectura de información

### 4.1 Mapa de páginas

| # | Página | Ruta | Objetivo | Prioridad |
|---|---|---|---|---|
| 1 | Inicio | `/` | Convertir: hero con CTA de reserva, destacados, sedes, prueba social | MVP |
| 2 | Carta | `/carta` | Explorar el menú por categorías y filtros | MVP |
| 3 | Producto | `/carta/:slug` (o panel lateral) | Detalle: fotos, descripción, alérgenos, precio | MVP |
| 4 | Reservar | `/reservar` (con estado en URL) | Flujo completo de reserva | MVP |
| 5 | Confirmación | `/reservar/confirmacion` | Código, resumen, `.ics`, compartir | MVP |
| 6 | Gestionar reserva | `/reserva/:codigo` | Ver, modificar (V1), cancelar | MVP cancelar |
| 7 | Lista de espera | `/lista-espera` | Capturar demanda sin disponibilidad | V1 |
| 8 | Sedes | `/sedes` y `/sedes/:sede` | Dirección, horarios, mapa, reservar en sede | MVP |
| 9 | Eventos | `/eventos` y `/eventos/solicitud` | Agenda (V2) y solicitud de grupos | V1 |
| 10 | Nosotros | `/nosotros` | Historia, equipo, confianza | MVP |
| 11 | FAQ | `/faq` | Políticas de reserva, depósito, grupos, alérgenos | MVP |
| 12 | Contacto | `/contacto` | Teléfono, WhatsApp, mapa, formulario | MVP |
| 13 | Legales | `/legales/terminos`, `/legales/privacidad`, `/legales/cookies` | Cumplimiento y confianza | MVP |
| 14 | Cuenta | `/cuenta`, `/cuenta/reservas` | Registro/login, mis reservas, preferencias | V1 |
| 15 | Recuperar flujo | `/reservar/recuperar` | Retomar reserva abandonada (enlace/OTP) | V1 |
| 16 | 404 / error | `*` | Salida elegante hacia reservar/contacto | MVP |

### 4.2 Navegación global

- **Cabecera (sticky, se compacta al hacer scroll):** logo a la izquierda; en escritorio: Carta ·
  Reservar · Sedes · Eventos · Nosotros · Más (FAQ, Contacto); a la derecha: teléfono/WhatsApp y
  botón primario **«Reservar»** siempre visible. En móvil: logo + botón «Reservar» + menú
  hamburguesa a pantalla completa con los mismos enlaces y datos de contacto al pie.
- **Selector de sede** en cabecera cuando hay más de una: cambia carta, disponibilidad y datos de
  contacto; la elección se recuerda (localStorage + cookie de preferencia).
- **Pie:** 4 columnas (Explorar · Sedes con horario · Contacto y redes · Legal), newsletter,
  aviso de cookies y créditos. En móvil se apila con acordeones.
- **Botón flotante de WhatsApp** (esquina inferior derecha, 56 px, no tapa el CTA de reserva).
- **Banner de cookies** (consentimiento granular, ver §7.5).

---

## 5. Inventario de componentes

| Componente | Variantes | Usado en | Notas |
|---|---|---|---|
| `Header` | transparente sobre hero / sólido / compacto | todas | foco visible, `aria-expanded` en menú |
| `Footer` | completo / mini (legales) | todas | enlaces reales, datos de sede |
| `Button` | primary, secondary, ghost, danger, whatsapp; sm/md/lg; con icono | todas | 44 px mínimo táctil |
| `LinkCTA` | inline, con flecha | bloques de contenido | — |
| `SedeSelector` | dropdown (cabecera), cards (inicio/sedes) | inicio, reservar, sedes | muestra horario y estado «abierto/cerrado» |
| `DatePicker` | calendario mensual, con flechas y días deshabilitados | reservar | fechas fuera de política deshabilitadas con explicación |
| `PartySizeSelector` | stepper 1–8 + «Más de 8» | reservar | «Más de 8» abre solicitud de grupo |
| `SlotGrid` | franjas mañana/tarde/noche; estados libre/última/lleno | reservar | «Últimas mesas» solo si el dato es real |
| `ReservationStepper` | 4 pasos + confirmación; vertical móvil / horizontal escritorio | reservar | progreso accesible (`aria-current`) |
| `ContactForm` | reserva / evento / contacto / cuenta | varias | validación en vivo, mensajes en español |
| `PolicyCheckbox` | con enlace a política | reservar | obligatorio para confirmar (RF-R1-11) |
| `DepositSummary` | monto, desglose, temporizador de expiración | reservar paso 4 | estados pago: procesando/éxito/fallo/expirado |
| `ConfirmationCard` | con código, `.ics`, compartir | confirmación, gestionar | código legible y copiable |
| `ManageReservationPanel` | ver / modificar / cancelar | `/reserva/:codigo` | cancelación con política y confirmación |
| `WaitlistForm` | franja deseada, contacto | lista de espera | explica la ventana de respuesta |
| `EventRequestForm` | tipo, fecha tentativa, personas, mensaje | eventos | confirmación «solicitud recibida» |
| `MenuCategoryNav` | chips sticky + búsqueda | carta | scroll-spy sin recargar |
| `ProductCard` | con foto / sin foto / destacado / agotado | carta, inicio | precio y etiquetas dietéticas |
| `ProductSheet` | panel lateral (desktop) / página (móvil) | carta | galería, alérgenos, modificadores de solo lectura |
| `DietBadge` | vegetariano, vegano, sin gluten, picante | carta, producto | icono + texto, no solo color |
| `AllergenList` | chips con icono | producto | texto alternativo completo |
| `PriceTag` | simple / tachado con promoción | carta, promociones | cifras tabulares |
| `PromoBanner` | hero ancho / tarjeta / barra fina | inicio, carta | nunca mostrar vencidas |
| `ReviewCard`, `RatingSummary` | con foto / sin foto; nota media | inicio, nosotros | enlaza a reseñas externas |
| `NewsletterForm` | inline / bloque | pie, inicio, post-reserva | doble opt-in explicado |
| `CookieBanner` | primera capa / preferencias | global | aceptar/rechazar/configurar |
| `MapBlock` | estático con botón «Cómo llegar» | sedes, contacto | no cargar mapas sin consentimiento |
| `HoursTable` | por día y franja; estado «cerrado ahora» | sedes, pie, inicio | zona horaria del local aclarada |
| `Gallery` | mosaico 2/3/4 columnas | nosotros, producto | carga diferida |
| `EmptyState` | sin disponibilidad, sin resultados, sin reservas | varias | siempre ofrece una acción |
| `ErrorState` | red, pago, servidor | reservar, cuenta | con teléfono/WhatsApp de respaldo |
| `Skeleton` | card, línea, bloque | todas las cargas | evita saltos (CLS) |
| `Toast` | éxito, error, info | acciones | anunciado con `aria-live` |
| `StepperMini` | «1 de 4» | reservar móvil | — |

---

## 6. Especificación pantalla por pantalla

Leyenda: **M** = layout móvil (390 px), **D** = escritorio (1440 px), **RF** = requisitos que
cubre.

### 6.1 Inicio (`/`) — RF-R1-44, 50, 60, 61

- **Objetivo:** entender qué es el restaurante y reservar, en una pantalla.
- **M:** cabecera transparente sobre hero; hero 4:5 con foto apetitosa, nombre, línea de cocina,
  chips de confianza (★ 4,8 · 320 reseñas · «Cancelación flexible»), botón primario
  **«Reservar mesa»** y secundario «Ver la carta»; barra de datos de la sede elegida (hoy
  «Abierto hasta 23:00» + «Cómo llegar»); carrusel de destacados del chef; banner de promoción;
  bloque «Reserva en 3 pasos» ilustrado; reseñas; bloque de sede con mapa estático; newsletter;
  pie.
- **D:** hero 16:9 a pantalla completa con contenido a la izquierda sobre degradado; destacados en
  rejilla de 3; dos sedes en tarjetas lado a lado; reseñas en carrusel continuo.
- **Estados:** sede cerrada → chip ámbar «Hoy cerrado» y CTA cambia a «Reservar para otro día»;
  sin promociones activas → se omite el banner; carga → skeleton de hero y tarjetas.
- **Aceptación:** CTA de reserva alcanzable sin scroll en móvil; LCP con imagen hero optimizada;
  todos los enlaces del pie funcionales.

### 6.2 Carta (`/carta`) — RF-R1-20, 21, 22, 23, 24, 26

- **Objetivo:** explorar el menú y dar ganas; puente hacia reservar.
- **M:** título «Nuestra carta» + selector de sede; búsqueda; chips de categorías sticky con
  scroll-spy; secciones por categoría con tarjetas (foto 4:3, nombre, descripción corta, precio,
  `DietBadge`, estado «Agotado» en gris con rayado suave); tarjeta «Menú del día» destacada con
  borde dorado; CTA flotante «Reservar mesa».
- **D:** barra lateral con categorías y filtros (dietéticos, rango de precio, alérgenos a
  excluir), contenido en rejilla de 3 columnas; el detalle se abre en panel lateral.
- **Estados:** sin resultados → `EmptyState` con «limpiar filtros»; producto fuera de horario →
  tarjeta atenuada con «Disponible en {franja}»; sin conexión → carta cacheada + aviso.
- **Aceptación:** precio correcto por sede; alérgenos visibles en la tarjeta o a un toque; filtros
  combinables; compartir carta (enlace vigente y PDF, V2).

### 6.3 Producto (`/carta/:slug` o panel) — RF-R1-20…22

- **M:** página completa: galería deslizable, nombre, descripción apetitosa, precio con impuesto
  discriminado, `DietBadge`, tiempo de preparación aproximado, lista de alérgenos, modificadores
  en modo lectura («Opciones disponibles al pedir en mesa»), botón «Reservar mesa» y «Volver a la
  carta».
- **D:** panel lateral derecho (drawer) sin perder la posición en la carta.
- **Estados:** agotado → aviso superior y CTA de reserva; foto faltante → bloque de color con
  inicial del producto.

### 6.4 Reservar (`/reservar`) — RF-R1-01…05, 10, 11, 12, 13, RN-R1-01…12

Flujo de 4 pasos + confirmación. Estado navegable por URL (`?sede=centro&fecha=2026-10-18&personas=2&paso=2`)
para poder compartir o retomar. **Sin registro en ningún paso**; «crear cuenta» solo al final.

**Paso 1 — Sede, fecha y personas**
- Sede (si hay una sola, se muestra fija), calendario del mes con días fuera de política
  deshabilitados y motivo («Máximo 60 días de antelación»), personas 1–8 con «Más de 8» que deriva
  a eventos; preferencia de zona (V1, opcional, «sujeta a disponibilidad»).
- Errores en línea: fecha pasada, fuera de antelación, personas > máximo.

**Paso 2 — Franja disponible**
- Rejilla por mañana/tarde/noche con horas y duración estándar («19:30 · 90 min»); «Últimas
  mesas» en ámbar solo si es real; aviso de tolerancia («Te guardamos la mesa 15 min»).
- Sin disponibilidad: bloque con alternativas (otras horas del día, ±1 día, otra sede) y tarjeta
  de lista de espera; nunca un callejón sin salida.
- Sede cerrada ese día: mensaje claro y enlace a horarios.

**Paso 3 — Datos y política**
- Nombre, teléfono, correo, ocasión (chips: cumpleaños, aniversario, comida de negocios, otra) y
  notas (alergias, silla infantil, mascota); aviso «Las alergias se comunican al salón; no
  podemos garantizar ausencia total de trazas».
- Resumen lateral (móvil: bloque plegable) con sede, fecha, hora, personas y política aplicada
  (duración, cancelación, no-show); checkbox obligatorio de política + consentimiento de datos.

**Paso 4 — Depósito (solo si la política lo exige)**
- Resumen del cargo, motivo («grupos de 8+» o fecha especial), métodos de pago, temporizador
  «Esta reserva expira en 14:32»; estados: procesando, pago rechazado (reintentar / cambiar medio),
  expirado (rehacer reserva), éxito.

**Paso 5 — Confirmación**
- Tarjeta grande con código (`PC-4F7K2`), resumen completo, botones «Añadir al calendario (.ics)»,
  «Compartir por WhatsApp», «Gestionar mi reserva» (enlace firmado), y oferta suave «Crea una
  cuenta para guardarla» (no bloquea). Instrucciones: llegar dentro de la tolerancia, cómo
  cancelar.

**Estados transversales:** doble envío/reintento no duplica (idempotencia, caso borde R1 §13);
error de red → reintento con backoff y opción de llamar; contenido de reserva cacheado si se cae
el motor (degradación elegante, RNF-R1-04).

### 6.5 Gestionar reserva (`/reserva/:codigo`) — RF-R1-07, 08

- Cabecera con estado (confirmada / pendiente de depósito / cancelada / no-show) y código.
- Resumen con sede, mapa, fecha, hora, personas, notas y política.
- Acciones: **Añadir al calendario**, **Modificar** (V1: fecha/hora/personas, sujeto a
  disponibilidad; muestra las nuevas condiciones), **Cancelar** (V1 con motivo; aviso de cargo si
  aplica según política), **Reenviar confirmación**, **WhatsApp con el restaurante**.
- Cancelación: diálogo de confirmación con consecuencias exactas («Cancelas sin cargo: faltan más
  de 2 h») y pantalla de despedida con opción a nueva reserva.
- Estados: enlace caducado o código inválido → `ErrorState` con «Buscar mi reserva» (correo + OTP,
  V1).

### 6.6 Lista de espera (`/lista-espera`) — RF-R1-09, RN-R1-11

- Explica cómo funciona («Si se libera una mesa te avisamos por WhatsApp; tendrás 15 minutos para
  confirmar»); formulario: sede, día/franja deseada, personas, contacto, notas; confirmación con
  posición estimada y qué esperar.

### 6.7 Sedes (`/sedes`, `/sedes/:sede`) — RF-R1-60, 61

- Lista: tarjetas por sede con foto, dirección, «Abierto ahora»/«Cierra a las 23:00», servicios
  (terraza, estacionamiento, accesible), botones «Reservar aquí» y «Cómo llegar».
- Detalle: mapa (con consentimiento), `HoursTable` por franja, teléfono y WhatsApp, transporte y
  estacionamiento, galería, reseñas de la sede y CTA de reserva con la sede preseleccionada.
- Estado «cerrado temporalmente» (vacaciones/evento) con fecha de reapertura.

### 6.8 Eventos (`/eventos`, `/eventos/solicitud`) — RF-R1-10, 45

- Agenda: tarjetas de evento (música en vivo, catas, temporadas) con fecha, sede, cupo y CTA
  (reservar mesa o apartar lugar según el caso).
- Solicitud: formulario de grupos/eventos privados (tipo de evento, fecha tentativa, personas,
  presupuesto opcional, mensaje); aclara «Esto es una solicitud, te contactamos para confirmar»;
  confirmación con tiempo de respuesta esperado (24 h hábiles).

### 6.9 Nosotros (`/nosotros`)

- Historia breve, cocina y valores, equipo (fotos), compromiso con proveedores locales, galería y
  enlaces a reseñas. CTA de reserva al final.

### 6.10 FAQ (`/faq`) — RF-R1-11

- Acordeón por temas: reservas y depósito, grupos y eventos, tolerancia y no-show, alérgenos y
  dietas, estacionamiento y accesibilidad, facturación, mascotas. Cada respuesta enlaza a la
  acción correspondiente (reservar, escribir por WhatsApp, política de reserva).

### 6.11 Contacto (`/contacto`) — RF-R1-44

- Teléfono, WhatsApp, correo, dirección por sede con mapa, horarios, formulario (motivo: reserva /
  grupo / proveedores / otro) y aviso de privacidad del formulario.

### 6.12 Legales (`/legales/*`)

- Términos, privacidad (con base legal y canal del consentimiento), cookies; texto legible con
  índice lateral; botón «Configurar cookies» reabre el banner en modo preferencias.

### 6.13 Cuenta (V1: `/cuenta`, `/cuenta/reservas`) — RF-R1-03, 30, 31

- **Acceso:** correo + código de un solo uso (magic link/OTP), sin contraseñas.
- **Mis reservas:** próximas (con acciones) e historial; «Repetir» precarga el flujo de reserva.
- **Preferencias:** mesa/zona preferida, ocasión, alergias; consentimientos de datos y marketing
  con fecha; cerrar sesión y eliminar cuenta.

### 6.14 Errores globales

- **404:** «No encontramos esta página» + buscador de la carta + CTA reservar.
- **Offline/red:** aviso persistente y contenido en caché cuando exista.
- **Motor de reservas caído:** el flujo degrada a «Llámanos o escríbenos» con datos grandes y
  claros (RNF-R1-04).

---

## 7. Estados, casos borde y errores

| Caso (R1 §13) | Tratamiento visual | Mensaje |
|---|---|---|
| Sin disponibilidad | Bloque alternativas (hora ±, día ±, otra sede) + lista de espera | «Ese horario se acaba de llenar. Esto es lo más cercano.» |
| Doble clic / reintento | Botón en estado «Reservando…» y bloqueo; si reenvía, mismo resultado | «Estamos confirmando tu reserva…» |
| Pago falla | Tarjeta roja con motivo y botón «Reintentar» / «Cambiar medio» | «No pudimos procesar el pago. Tu mesa sigue apartada {mm:ss}.» |
| Pago expira | Estado expirado y reinicio del paso 4 | «La reserva expiró y liberamos la mesa.» |
| Sede cerrada / aforo reducido | Aviso ámbar + reubicación o cancelación sin cargo | «El restaurante ajustó la disponibilidad de ese día.» |
| Zona horaria distinta | Nota bajo fecha/hora | «Hora local del restaurante (CDMX).» |
| Límite de reservas activas | Aviso con enlace a gestionar | «Ya tienes {n} reservas activas con este contacto.» |
| Grupo grande | Deriva al formulario de eventos | «Para más de 8 personas preparamos algo especial.» |
| Alergias | Aviso informativo, nunca promesa | «Lo comunicamos al salón; no podemos garantizar ausencia de trazas.» |
| Sin JavaScript | Carta y contacto servidos; el flujo avisa | «Activa JavaScript para reservar en línea o escríbenos.» |

---

## 8. Accesibilidad, rendimiento y SEO

- **WCAG 2.2 AA:** contraste ≥ 4.5:1 en texto normal (los tokens ya lo cumplen sobre
  `cream-50`/blanco); foco visible de 2 px `brand-700` con offset; formularios con `<label>`
  explícito y errores asociados (`aria-describedby`); diálogos con trampa de foco y `Esc`;
  `aria-live` para toasts y confirmaciones; área táctil ≥ 44 px; todo funciona con teclado.
- **Rendimiento:** imágenes en WebP/AVIF con `srcset` y dimensiones reservadas (evitar CLS);
  hero con `fetchpriority=high`; fuentes con `display:swap` y subset; mapas y píxeles solo con
  consentimiento; lazy-loading del resto.
- **SEO por plantilla:** título y meta descripción (p. ej. Inicio: «Punto C — Cocina de casa ·
  Reserva tu mesa»; Carta: «Carta — Punto C»; Sede: «Punto C {sede} — Reservar mesa en {ciudad}»);
  URL legibles; `canonical`; Open Graph con imagen por página; datos estructurados `Restaurant`
  (con `openingHours`, `geo`, `telephone`), `Menu`/`MenuItem` (con `offers.price`,
  `suitableForDiet`) y `ReserveAction`; sitemap y `robots.txt`.
- **Analítica (con consentimiento):** eventos `reservation_start`, `step_view{step}`,
  `slot_selected`, `contact_submitted`, `deposit_started`, `reservation_confirmed`, `waitlist_join`,
  `newsletter_subscribe`; captura de UTM y canal al llegar (RNF-R1-10).

---

## 9. Copy deck (textos base)

| Clave | Texto |
|---|---|
| `hero.title` | Cocina de casa, hecha al momento |
| `hero.subtitle` | Reserva tu mesa en menos de un minuto. Te esperamos. |
| `cta.reserve` | Reservar mesa |
| `cta.menu` | Ver la carta |
| `trust.policy` | Cancelación flexible |
| `trust.rating` | 4,8 · 320 reseñas |
| `steps.title` | Reservar es así de simple |
| `steps.1` | Elige día, hora y cuántos son |
| `steps.2` | Déjanos tu contacto (sin crear cuenta) |
| `steps.3` | Recibe tu código y listo |
| `reserve.step1.title` | ¿Cuándo quieres venir? |
| `reserve.step2.title` | Elige tu horario |
| `reserve.step2.last` | Últimas mesas |
| `reserve.step2.none` | No hay mesas para esa combinación |
| `reserve.step2.noneHelp` | Prueba otra hora, otro día u otra sede. También puedes apuntarte a la lista de espera. |
| `reserve.step3.title` | Tus datos |
| `reserve.step3.notes` | ¿Algo que debamos saber? (alergias, silla infantil, mascota) |
| `reserve.policy.accept` | Acepto la política de reserva |
| `reserve.step4.title` | Confirma con un depósito |
| `reserve.step4.expires` | Esta reserva expira en |
| `reserve.confirm.title` | ¡Mesa confirmada! |
| `reserve.confirm.code` | Tu código de reserva |
| `reserve.confirm.calendar` | Añadir al calendario |
| `reserve.confirm.share` | Compartir por WhatsApp |
| `reserve.confirm.manage` | Gestionar mi reserva |
| `manage.cancel.free` | Cancelas sin cargo: faltan más de {h} horas |
| `manage.cancel.charge` | Según la política, el depósito no es reembolsable |
| `waitlist.help` | Si se libera una mesa te avisamos por WhatsApp. Tendrás 15 minutos para confirmar. |
| `events.help` | Para grupos de más de 8 o eventos privados, cuéntanos y te contactamos en menos de 24 h hábiles. |
| `allergy.notice` | Comunicamos tus alergias al salón. No podemos garantizar la ausencia total de trazas. |
| `tz.notice` | Horarios en la hora local del restaurante ({ciudad}). |
| `error.payment` | No pudimos procesar el pago. Tu mesa sigue apartada mientras reintentas. |
| `error.slots` | Ese horario se acaba de llenar. Esto es lo más cercano. |
| `empty.waitlist` | Sin mesas por ahora. Apúntate y te avisamos. |
| `footer.newsletter` | Novedades y menús de temporada, una vez al mes. Sin spam. |

---

## 10. Datos de ejemplo para el prototipo

```json
{
  "restaurante": { "nombre": "Punto C", "telefono": "+52 55 0000 0000", "whatsapp": "+52 55 0000 0001" },
  "sedes": [
    { "id": "centro", "nombre": "Sucursal Centro", "direccion": "Av. Principal 123, Ciudad de México",
      "horario": { "lun-jue": "08:00–23:00", "vie-sab": "08:00–00:00", "dom": "08:00–22:00" },
      "estado": "abierto", "cierra": "23:00" },
    { "id": "norte", "nombre": "Sucursal Norte", "direccion": "Calzada Norte 456, Ciudad de México",
      "horario": { "lun-dom": "12:00–22:00" }, "estado": "abierto", "cierra": "22:00" }
  ],
  "franjas": {
    "2026-10-18": { "manana": ["08:00", "08:30", "09:00", "09:30"],
                    "tarde": ["13:00", "13:30", "14:00", "14:30", "15:00"],
                    "noche": ["19:00", "19:30", "20:00", "20:30", "21:00"],
                    "ultimas": ["20:30", "21:00"] }
  },
  "categorias": [
    { "id": "entradas", "nombre": "Entradas" },
    { "id": "fuertes", "nombre": "Platos fuertes" },
    { "id": "postres", "nombre": "Postres" },
    { "id": "bebidas", "nombre": "Bebidas" }
  ],
  "productos": [
    { "nombre": "Guacamole", "categoria": "entradas", "precio": 89, "descripcion": "Aguacate, jitomate, cebolla, cilantro y chile serrano.", "etiquetas": ["vegetariano"], "alergenos": [], "destacado": true },
    { "nombre": "Sopa de tortilla", "categoria": "entradas", "precio": 75, "etiquetas": ["vegetariano"], "alergenos": ["lácteos"] },
    { "nombre": "Tacos al pastor", "categoria": "fuertes", "precio": 125, "descripcion": "Tres tacos con piña, cebolla y cilantro.", "destacado": true, "alergenos": [] },
    { "nombre": "Enchiladas verdes", "categoria": "fuertes", "precio": 115, "alergenos": ["lácteos"] },
    { "nombre": "Salmón a la plancha", "categoria": "fuertes", "precio": 215, "etiquetas": ["sin gluten"], "alergenos": ["pescado"], "destacado": true, "tiempoMin": 15 },
    { "nombre": "Hamburguesa de res", "categoria": "fuertes", "precio": 145, "alergenos": ["gluten", "lácteos"] },
    { "nombre": "Flan napolitano", "categoria": "postres", "precio": 65, "alergenos": ["huevo", "lácteos"] },
    { "nombre": "Pastel de chocolate", "categoria": "postres", "precio": 70, "alergenos": ["gluten", "huevo", "lácteos"] },
    { "nombre": "Agua de horchata", "categoria": "bebidas", "precio": 35, "etiquetas": ["vegetariano"] },
    { "nombre": "Limonada", "categoria": "bebidas", "precio": 35, "etiquetas": ["vegano"] },
    { "nombre": "Café americano", "categoria": "bebidas", "precio": 30, "etiquetas": ["vegano"] },
    { "nombre": "Cerveza artesanal", "categoria": "bebidas", "precio": 65, "destacado": true, "agotado": true }
  ],
  "promociones": [
    { "titulo": "Menú del día", "texto": "Entrada, plato fuerte y agua por $159.", "vigencia": "Lun–Vie 13:00–16:00", "tipo": "banner" },
    { "titulo": "Noches de música en vivo", "texto": "Jueves 20:30. Reserva sin costo.", "tipo": "tarjeta" }
  ],
  "resenas": [
    { "autor": "María G.", "puntaje": 5, "texto": "El salmón estaba perfecto y nos guardaron la mesa aunque llegamos 10 minutos tarde.", "fecha": "2026-09-20" },
    { "autor": "Carlos R.", "puntaje": 4.5, "texto": "Reservé desde el celular en un minuto. La terraza es lo mejor.", "fecha": "2026-09-12" }
  ]
}
```

---

## 11. Entregables esperados de Figma Make

### 11.1 Del archivo de Figma

| # | Entregable | Criterio |
|---|---|---|
| 1 | Página **Foundations**: variables de color, tipografía, radios, sombras, espaciado | Nombres de tokens idénticos a §3.3 |
| 2 | Página **Componentes**: todos los del inventario (§5) con variantes y auto-layout | Estados hover/focus/disabled/pressed y variantes responsive |
| 3 | **Móvil (390)**: las 16 páginas de §4.1 | Navegables y con estados clave |
| 4 | **Escritorio (1440)**: inicio, carta, reservar, sede, gestionar, cuenta | Rejilla de 12 columnas |
| 5 | **Estados**: sin disponibilidad, pago fallido, expirado, cerrado, 404, offline, carga | Como mínimo los de §7 |
| 6 | **Prototipo** clickable: camino feliz de reserva + sin disponibilidad + cancelación + pago fallido | Enlaces internos reales |
| 7 | **Notas de diseño** en el archivo: decisiones, pendientes de marca y datos faltantes | Referencia a §3.1 y R1 §14 |

### 11.2 Del código (si Figma Make lo genera)

Si se exporta código, debe dirigirse al stack del proyecto (alineado con `ecommerce`):
**React 18 + TypeScript + Vite + Tailwind CSS v4 + Radix/shadcn + lucide-react +
react-hook-form + react-router**, componentes con nombres del inventario y tokens como variables
CSS (`--color-brand-600`, etc.). El código generado es **referencia visual**, no la implementación
final: la implementación real vivirá en `Interface web reservas/` con su propio proyecto Vite.

### 11.3 Lista de verificación de la revisión

- [ ] Reserva completa simulada de principio a fin sin registro y en ≤ 4 pantallas de captura.
- [ ] CTA «Reservar» visible en cabecera, hero, carta y pie (móvil y escritorio).
- [ ] Los casos borde de §7 tienen diseño.
- [ ] Todos los formularios muestran errores en español y con foco correcto.
- [ ] Contraste AA comprobado en botones, chips y textos sobre foto (usar velo).
- [ ] La carta muestra alérgenos y etiquetas; «Agotado» distinguible sin depender del color.
- [ ] Precios y horas con formato consistente; nota de zona horaria presente.
- [ ] Estados de carga con skeletons; sin saltos de layout.
- [ ] Textos legales y de cookies accesibles desde el pie en todas las páginas.
- [ ] Prototipo enlaza: inicio → reservar → confirmación → gestionar → cancelar → inicio.

---

## 12. Prompt maestro para Figma Make (pegar primero)

```text
Diseña la interfaz completa de la web pública de reservas de un restaurante llamado «Punto C».
Es una web real (no un dashboard), en español, mobile-first (referencia 390 px) con versión
escritorio (1440 px). Objetivo: que una persona reserve mesa en menos de 2 minutos sin crear
cuenta; la carta y el contenido acompañan.

ESTILO: «cálida contemporánea». Fondo crema #FAF7F2; superficies blancas y #F3EDE4; títulos en
Fraunces (serif, 600/700); texto en Inter; color de acción terracota #B4451F (hover #8F3517);
texto #1C1917/#3F3B38/#6B6560; bordes #D6D0C9; éxito #4A6B3F; aviso #B45309; error #B3261E;
estrellas #C99A2E. Tarjetas con radio 12, bloques con radio 16, chips tipo píldora, sombra suave
0 1px 2px rgba(28,25,23,.06), 0 8px 24px rgba(28,25,23,.08). Espaciado en múltiplos de 4,
contenedor máximo 1200. Iconos Lucide, trazo 1.75. Fotografía gastronómica real como protagonista
(usa imágenes de relleno de comida apetitosa con alt descriptivo en español).

CREA PRIMERO:
1) Variables de Figma con los colores, la escala tipográfica (display 36/56, h1 32/44, h2 26/34,
   h3 21, body 16/17, small 14, caption 12), radios (8/12/16/full), sombras y espaciado.
2) Componentes base con variantes y auto-layout: Button (primario, secundario, fantasma, peligro,
   WhatsApp; tamaños sm/md/lg; con icono), Input/Select/Textarea/Checkbox/Radio con estados
   normal/hover/focus/error/disabled, Chip, Badge, Card, Avatar, Accordion, Tabs, Modal, Drawer,
   Toast, Skeleton, Breadcrumb, Pagination (mínima), EmptyState y ErrorState.

REGLAS: mobile-first y responsive en cada pantalla; accesibilidad WCAG 2.2 AA (contraste, foco
visible, etiquetas, área táctil 44 px); nada de texto en inglés; precios con cifras tabulares;
todo componente debe reutilizarse, no duplicarse. No generes aún las pantallas: primero las
fundaciones y los componentes, y espera mi siguiente mensaje.
```

---

## 13. Prompts por pantalla

### 13.1 Inicio (`/`)

```text
Con las fundaciones y componentes del archivo, diseña la página de INICIO (móvil 390 y escritorio
1440). Cabecera sticky: logo «Punto C», enlaces Carta · Reservar · Sedes · Eventos · Nosotros ·
Más, teléfono y botón primario «Reservar» siempre visible; en móvil logo + «Reservar» + menú
hamburguesa a pantalla completa con los enlaces y contacto.

Bloques: (1) Hero con foto apetitosa a sangre, velo degradado, título «Cocina de casa, hecha al
momento», subtítulo «Reserva tu mesa en menos de un minuto. Te esperamos.», botones «Reservar
mesa» (primario) y «Ver la carta» (secundario), y chips de confianza «★ 4,8 · 320 reseñas» y
«Cancelación flexible». (2) Barra de la sede elegida: «Abierto hasta 23:00», dirección corta y
«Cómo llegar». (3) «Reserva en 3 pasos» con tres tarjetas ilustradas. (4) Destacados del chef:
carrusel de 3 tarjetas de producto con foto, nombre, descripción corta y precio. (5) Banner de
promoción «Menú del día $159». (6) Reseñas: carrusel con estrellas. (7) Bloque de sede(s) con
mapa estático y botón reservar. (8) Newsletter «Novedades y menús de temporada, una vez al mes.
Sin spam.» con campo de correo y nota de doble confirmación. (9) Pie completo con 4 columnas.

Estados: sede cerrada muestra chip ámbar «Hoy cerrado» y el CTA cambia a «Reservar para otro
día»; carga con skeletons del hero y tarjetas.
```

### 13.2 Carta (`/carta`)

```text
Diseña la página CARTA (móvil y escritorio). Cabecera con título «Nuestra carta», selector de sede
y buscador. Chips de categorías sticky (Entradas · Platos fuertes · Postres · Bebidas) con
scroll-spy. Tarjetas de producto (foto 4:3, nombre, descripción corta de una línea, precio en
cifras tabulares, etiquetas dietéticas con icono y texto —vegetariano, vegano, sin gluten,
picante—, y «Agotado» en gris con rayado suave que no dependa solo del color). Tarjeta destacada
«Menú del día» con borde dorado. Botón flotante «Reservar mesa» en móvil.

Escritorio: barra lateral izquierda con categorías y filtros (dietéticos, rango de precio,
excluir alérgenos) y rejilla de 3 columnas; al pulsar un producto se abre un drawer lateral.

Incluye estados: sin resultados con «limpiar filtros», producto fuera de horario atenuado con
«Disponible en {franja}», y carga con skeletons. Usa los datos de ejemplo de productos de esta
lista: guacamole $89, sopa de tortilla $75, tacos al pastor $125, enchiladas verdes $115, salmón
a la plancha $215, hamburguesa $145, flan $65, pastel de chocolate $70, horchata $35, limonada
$35, café $30, cerveza artesanal $65 (agotada).
```

### 13.3 Detalle de producto

```text
Diseña el DETALLE DE PRODUCTO: en móvil como página completa y en escritorio como drawer lateral
derecho abierto sobre la carta. Contenido: galería deslizable (3 fotos), nombre, descripción
apetitosa de 2 líneas, precio con nota «impuestos incluidos», etiquetas dietéticas, tiempo de
preparación aproximado («Listo en ~15 min»), lista de alérgenos con iconos y el aviso «Comunicamos
tus alergias al salón. No podemos garantizar la ausencia total de trazas.», opciones/modificadores
en modo lectura con la nota «Disponibles al pedir en mesa», botón primario «Reservar mesa» y
enlace «Volver a la carta». Estado agotado: aviso superior y sin CTA de pedido; foto faltante:
bloque de color con la inicial del producto.
```

### 13.4 Flujo de reserva (5 pantallas)

```text
Diseña el FLUJO DE RESERVA completo como 5 pantallas conectadas, con stepper superior «1 de 4»
móvil / horizontal escritorio. Sin registro en ningún paso.

PASO 1 «¿Cuándo quieres venir?»: selector de sede (tarjetas si hay más sedes), calendario mensual
con días deshabilitados y su motivo («Máximo 60 días de antelación»), selector de personas 1–8 con
botón «Más de 8» que muestra «Para más de 8 personas preparamos algo especial» y enlaza a
solicitud de eventos, y preferencia de zona opcional («Terraza, sujeta a disponibilidad»).
PASO 2 «Elige tu horario»: rejilla por mañana/tarde/noche con horas y «· 90 min», etiqueta ámbar
«Últimas mesas» solo en dos horarios, aviso «Te guardamos la mesa 15 min». Estado SIN
DISPONIBILIDAD: bloque con alternativas (otras horas, día anterior/siguiente, otra sede) y tarjeta
«Lista de espera»; nunca un callejón sin salida.
PASO 3 «Tus datos»: nombre, teléfono, correo, chips de ocasión (cumpleaños, aniversario, comida
de negocios, otra), notas («¿Algo que debamos saber? (alergias, silla infantil, mascota)»), aviso
de alergias, resumen lateral con sede/fecha/hora/personas/política (duración 90 min, cancelación
hasta 2 h antes, tolerancia 15 min), checkbox obligatorio «Acepto la política de reserva» y
consentimiento de datos.
PASO 4 «Confirma con un depósito» (solo si la política lo exige): resumen del cargo, motivo,
temporizador «Esta reserva expira en 14:32», métodos de pago, botón «Pagar depósito»; estados:
procesando, rechazado («No pudimos procesar el pago. Tu mesa sigue apartada mientras reintentas.»
con «Reintentar» y «Cambiar medio») y expirado.
PASO 5 «¡Mesa confirmada!»: tarjeta grande con código «PC-4F7K2» copiable, resumen, botones
«Añadir al calendario (.ics)», «Compartir por WhatsApp», «Gestionar mi reserva», oferta suave
«Crea una cuenta para guardarla» y recordatorio de tolerancia de 15 minutos.
```

### 13.5 Confirmación (si se diseña como página aparte)

```text
Diseña la página de CONFIRMACIÓN como versión de escritorio centrada (además de la móvil del paso
5): tarjeta con check en oliva, código de reserva grande y copiable, resumen en dos columnas,
mapa estático de la sede, botones de calendario/WhatsApp/gestionar, bloque «Antes de tu visita»
(tolerancia, cómo llegar, estacionamiento) y carrusel «También te puede gustar» de la carta.
```

### 13.6 Gestionar reserva (`/reserva/:codigo`)

```text
Diseña GESTIONAR RESERVA. Cabecera con estado (confirmada, pendiente de depósito, cancelada) y
código. Resumen con sede, mapa, fecha, hora, personas, notas y política. Acciones: «Añadir al
calendario», «Modificar» (V1: cambiar fecha/hora/personas con búsqueda de nuevas franjas y aviso
de nuevas condiciones), «Cancelar», «Reenviar confirmación» y «WhatsApp». El diálogo de
cancelación muestra consecuencias exactas («Cancelas sin cargo: faltan más de 2 h» o «Según la
política, el depósito no es reembolsable»), pide motivo opcional y termina en una pantalla de
despedida con «Hacer otra reserva». Estado de enlace inválido/caducado: ErrorState con «Buscar mi
reserva» (correo + código).
```

### 13.7 Lista de espera y eventos

```text
Diseña dos formularios. LISTA DE ESPERA: explica «Si se libera una mesa te avisamos por WhatsApp.
Tendrás 15 minutos para confirmar.»; campos sede, día, franja deseada, personas, contacto y notas;
confirmación con posición estimada. EVENTOS PRIVADOS: cabecera «Celebraciones y grupos»,
formulario (tipo de evento, fecha tentativa, personas, presupuesto opcional, mensaje), nota «Esto
es una solicitud: te contactamos para confirmar» y confirmación «Recibimos tu solicitud,
respondemos en menos de 24 h hábiles.» Ambos con validación en español y estados de envío.
```

### 13.8 Sedes y detalle de sede

```text
Diseña SEDES (lista) y DETALLE DE SEDE. Lista: tarjetas con foto, nombre, dirección, estado
«Abierto ahora» o «Cierra a las 23:00», servicios (terraza, estacionamiento, accesible), botones
«Reservar aquí» y «Cómo llegar». Detalle: mapa con botón de consentimiento («Ver mapa»), tabla de
horarios por franja con el día actual resaltado, teléfono y WhatsApp, notas de transporte y
estacionamiento, galería y CTA «Reservar en {sede}». Estado «cerrado temporalmente» con fecha de
reapertura y alternativa de otra sede.
```

### 13.9 Nosotros, FAQ y Contacto

```text
Diseña tres páginas de contenido. NOSOTROS: historia breve con foto grande, valores en 3 bloques,
equipo con retratos, galería y CTA final de reserva. FAQ: acordeón por temas (reservas y
depósito, grupos y eventos, tolerancia y no-show, alérgenos y dietas, estacionamiento y
accesibilidad, facturación, mascotas) con enlaces de acción dentro de las respuestas. CONTACTO:
teléfono y WhatsApp grandes, correo, mapa con consentimiento, horarios por sede y formulario
(motivo: reserva, grupo, proveedores, otro) con aviso de privacidad.
```

### 13.10 Legales y cookies

```text
Diseña las páginas legales (Términos, Privacidad, Cookies) con índice lateral y texto legible, y
el BANNER DE COOKIES de dos capas: primera capa «Usamos cookies para que la web funcione y, si nos
das permiso, para analítica y anuncios.» con «Aceptar todo», «Rechazar todo» y «Configurar»;
preferencias con interruptores por categoría (necesarias siempre activas, analítica, marketing) y
enlace a la política. Incluye el botón «Configurar cookies» del pie que lo reabre.
```

### 13.11 Cuenta (V1)

```text
Diseña CUENTA (V1). Acceso sin contraseña: correo + código de 6 dígitos (OTP) en dos pantallas.
«Mis reservas»: próximas con tarjeta de acción (gestionar, añadir al calendario, cancelar) e
historial con «Repetir» que precarga el flujo de reserva. Preferencias: zona/mesa preferida,
ocasión habitual, alergias y consentimientos (datos y marketing) con fecha, más «Eliminar
cuenta». Estado vacío: «Aún no tienes reservas» con CTA.
```

### 13.12 Errores y estados globales

```text
Diseña el sistema de ESTADOS: skeleton de tarjeta/línea/hero; vacío genérico (ilustración simple +
título + acción); 404 «No encontramos esta página» con buscador de carta y CTA; sin conexión con
aviso persistente y reintento; motor de reservas caído que degrada el flujo a «Llámanos o
escríbenos» con teléfono y WhatsApp grandes; toasts de éxito/error/info (esquina inferior en
móvil, superior derecha en escritorio).
```

### 13.13 Prototipo e interacciones

```text
Convierte el archivo en un prototipo navegable. Camino feliz: Inicio → «Reservar» → paso 1 →
paso 2 → paso 3 → paso 5 (sin depósito) → gestionar. Camino con depósito: paso 3 → paso 4 (pago
rechazado → reintento → expirado). Camino sin disponibilidad: paso 2 vacío → lista de espera.
Además: carta → detalle → reservar; sede → reservar con sede preseleccionada; cancelación con
diálogo; menú móvil; banner de cookies. Añade micro-interacciones sutiles (180–240 ms, ease-out)
y un modo con «reducir movimiento». Documenta en notas la navegación y los enlaces firmados de
«gestionar reserva».
```

---

## 14. Trazabilidad RF → pantallas

| RF (R1) | Dónde se cubre |
|---|---|
| 01 disponibilidad | Reservar paso 1–2; alternativas en 2 |
| 02 reserva sin registro | Reservar pasos 1–3; confirmación |
| 03 cuenta | Cuenta (V1); oferta al final del paso 5 |
| 04 preferencia de ubicación | Reservar paso 1 |
| 05 depósito | Reservar paso 4 y estados |
| 06 código + `.ics` | Confirmación |
| 07 recordatorio | Correo/WhatsApp (plantillas); gestionar |
| 08 modificar/cancelar | Gestionar reserva |
| 09 lista de espera | Lista de espera; alternativas del paso 2 |
| 10 eventos/grupos | Eventos; «Más de 8» en paso 1 |
| 11 política | Paso 3 (checkbox) y FAQ |
| 12 anti-abuso | Estados de error del flujo; verificación de contacto |
| 13 ocasión/notas | Paso 3 |
| 20–24 carta | Carta, producto, inicio (destacados) |
| 25–26 idiomas y compartir | V2 (nota de diseño) |
| 30–31 cuenta y consentimiento | Cuenta; paso 3; banner de cookies |
| 40–44 marketing | Inicio (promos, reseñas), newsletter, WhatsApp/llamar/cómo llegar, cookies |
| 45 eventos | Eventos (V2 agenda) |
| 50–51 páginas y SEO | Todas (metadatos por plantilla, §8) |
| 60–61 sedes y horarios | Sedes, pie, barra de sede en inicio |

---

## 15. Siguientes pasos

1. **Confirmar marca y datos** (§3.1) con el cliente; reemplazar placeholders.
2. Curar las **fotos reales** de `punto_c/01/IMAGENES` (conversión a WebP/AVIF) e integrarlas.
3. Generar con Figma Make siguiendo §1.1 y validar con §11.3.
4. Con el diseño aprobado, crear el proyecto `Interface web reservas/` (React + Vite + Tailwind,
   alineado con `ecommerce`) y conectar contra la API; el **segundo entregable de front** es la
   web de pedidos (`02-web-pedidos-cliente.md`), que reutilizará estas fundaciones.
