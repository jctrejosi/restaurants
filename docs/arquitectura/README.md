# Arquitectura — nuevo software para restaurantes

## Estado

**Diseño en curso (nueva generación).** Este directorio reemplaza la arquitectura del set
previo, que queda archivado en [`../old-project/`](../old-project/README.md) como insumo histórico.
La arquitectura vigente es la que se documente aquí; `../old-project/03-arquitectura.md` deja de
ser autoridad.

## Producto a soportar

- Reservas y pedidos web para el cliente final.
- Pedidos y **APK para meseros**.
- Pedidos y **KDS para cocina**.
- Backoffice (carta, salón, caja, configuración) y operación de salón.

## Qué se conserva del análisis previo (como insumo, no como decisión)

- Alcance funcional y criterios de aceptación del MVP.
- Reglas de negocio (RN-01…RN-33) y vocabulario del dominio (nomenclatura en español).
- Restricciones reales del legado `punto_c` y su deuda documentada.
- Decisiones abiertas con el cliente: **D1–D10** (`../old-project/02-alcance-y-decisiones.md`).

## Qué se rediseña en esta fase

- Estilo arquitectónico, límites de módulos y contratos entre ellos.
- Stack de backend, web, móvil y de datos.
- Modelo de despliegue (SaaS multi-tenant / on-premise / híbrido), ambientes y operación.
- Estrategia de integración con el legado y con terceros (pagos, DIAN, mensajería).
- Seguridad, operación offline e impresión.

## Estructura prevista de estos documentos

| Documento | Contenido |
|---|---|
| `00-contexto-drivers-y-nfr.md` | Objetivos, drivers, restricciones y atributos de calidad medibles |
| `01-vista-de-contexto.md` | C4 nivel 1: sistema, actores y sistemas externos |
| `02-vista-de-contenedores.md` | C4 nivel 2: aplicaciones, servicios, almacenes y flujos |
| `03-vista-de-componentes.md` | C4 nivel 3 por módulo (pedidos, comandas, cobro, salón, catálogo…) |
| [`04-datos-y-persistencia.md`](./04-datos-y-persistencia.md) | Modelo consolidado, entidades, enums, relaciones y trazabilidad |
| [`05-stack-tecnologico.md`](./05-stack-tecnologico.md) | Stack objetivo y alineación con el proyecto `ecommerce` (D-BD-02/03/04 revisadas) |
| `06-integraciones-realtime-offline.md` | API, eventos/WebSocket, sincronización y print agent |
| `07-despliegue-operacion-y-costos.md` | Entornos, CI/CD, observabilidad, capacidad y costos |
| `08-seguridad-y-cumplimiento.md` | Identidad, autorización, auditoría, datos personales |
| `09-desempeno-y-escalabilidad.md` | Presupuestos de rendimiento, escalado y límites |
| `10-adr/` | Un ADR por decisión (ADR-001, ADR-002, …) |
| `anexos/` | Diagramas, matrices y material de apoyo |

## Requerimientos por interfaz

[`requerimientos/`](./requerimientos/README.md) reúne los documentos que definen qué ve y qué
puede hacer cada usuario (cliente, mesero, cocina y administración), y de dónde salen las entidades
y campos del modelo de datos:

| # | Documento | Estado |
|---|---|---|
| 01 | [Web de reservas del cliente](./requerimientos/01-web-reservas-cliente.md) | Borrador v0.1 |
| 02 | [Web de pedidos del cliente](./requerimientos/02-web-pedidos-cliente.md) | Borrador v0.1 |
| 03 | [APK del mesero](./requerimientos/03-apk-mesero.md) | Borrador v0.1 |
| 04 | [KDS de cocina](./requerimientos/04-kds-cocina.md) | Borrador v0.1 |
| 05 | [Panel de administración](./requerimientos/05-panel-administracion.md) | Borrador v0.1 |

## Esquema de base de datos

[`esquema/`](./esquema/README.md) documenta el esquema físico columna a columna (DDL), derivado
del modelo consolidado `04`:

| # | Volumen | Contenido |
|---|---|---|
| 01 | [Núcleo](./esquema/01-nucleo.md) | Organización, cocina, acceso y personas |
| 02 | [Catálogo, salón y reservas](./esquema/02-catalogo-salon-reservas.md) | Carta, precios, modificadores, salón y reservas |
| 03 | [Pedidos, domicilio y dinero](./esquema/03-pedidos-y-dinero.md) | Pedidos, comandas, reparto, pagos y facturación |
| 04 | [Marketing y operación](./esquema/04-marketing-y-operacion.md) | CRM, mensajería, sync, auditoría y reportes |

## Planes de implementación

[`plans/`](./plans/README.md) contiene los planes de ejecución por componente:

| # | Plan | Estado |
|---|---|---|
| 01 | [Base de datos](./plans/01-plan-implementacion-base-de-datos.md) | Borrador v0.1 |

## Decisiones necesarias para arrancar el diseño

Responde estas preguntas (o dime "usa los valores por defecto") y redacto `00`–`02` más los
ADR base.

| # | Pregunta | Default propuesto |
|---|---|---|
| A1 | Forma de despliegue: SaaS multi-tenant, on-premise por cliente o híbrido (D2) | SaaS multi-tenant |
| A2 | Infraestructura: nube administrada (AWS/GCP/Azure) o contenedores en VPS propio | Contenedores en VPS gestionado |
| A3 | Stack: reutilizar el propuesto antes (backend NestJS + PostgreSQL, web Next.js, móvil Flutter) o rediseñarlo | Reutilizar y validar |
| A4 | Modelo de dominio: reutilizar el del set previo o rediseñar entidades | Reutilizar y ajustar |
| A5 | Integración con `punto_c`: standalone con importación o convivencia con adaptador (D1) | Standalone + importación |
| A6 | Escala objetivo: número de sucursales/tenants y pedidos por hora en pico | 1 piloto → 10 sucursales; 200 pedidos/h |
| A7 | Equipo y plazo de construcción disponibles | 3–4 FTE, MVP en 5–6 meses |
| A8 | Cumplimiento y hardware: país/moneda, facturación electrónica (D3), pasarela (D5) e impresoras (D10) existentes | Colombia/COP; DIAN y pasarela por definir |

## Convenciones

- Idioma: español. Entidades en singular (`Pedido`, `Comanda`, `Estación`…).
- Los atributos de calidad deben ser medibles (objetivo, umbral y cómo se verifica).
- Todo dato no confirmado se marca **SUPUESTO**; toda decisión se registra como ADR con su estado.
