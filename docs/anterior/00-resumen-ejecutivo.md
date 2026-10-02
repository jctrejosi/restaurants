# 00 — Resumen ejecutivo

## 0.1 Contexto

El legado `punto_c` es un POS/ERP de restaurante escrito en **xHarbour + FiveWin**, sobre
tablas **DBF gestionadas por Advantage Database Server (ADS)**, con licenciamiento Sentinel y
compilación vía Borland BCC55. Es un sistema maduro en operación que cubre más que restaurante:
incluye hotel, inventario y contabilidad.

El cliente quiere un producto nuevo, desde 0, con tres frentes:

1. **Web para el cliente final**: reservas + pedidos en línea.
2. **APK para meseros**: toma de pedidos en mesa.
3. **Pedidos para la cocina**: gestión/despliegue de comandas (KDS).

## 0.2 Hallazgo principal

Los tres frentes son, en realidad, **un solo dominio con cuatro clientes** (web, APK, KDS, caja)
sobre una **API de pedidos con modelo único y tiempo real**.

El legado no se descarta: es la mejor fuente de reglas de negocio. Ya resuelve, en su lógica,
el enrutamiento de ítems a cocinas, el ciclo de vida de una comanda, observaciones por ítem,
venta por fracción/peso y configuración de copias y propina.

## 0.3 Recomendación

Construir un producto **standalone** (no atado al motor DBF/ADS) con:

- Un **modelo de pedido único** para todos los canales.
- **Enrutamiento a estaciones** de preparación.
- **API-first** con tiempo real por WebSocket.
- **Print agent** local para impresoras térmicas ESC/POS.
- Una **capa de importación** opcional para clientes existentes.

Stack sugerido (a validar con el equipo):

- Backend: Node.js + NestJS + TypeScript.
- Datos: PostgreSQL + Redis (colas y pub/sub).
- Tiempo real: WebSocket.
- Web cliente: Next.js como PWA.
- APK meseros: Flutter + SQLite local (offline-first).
- KDS: PWA web.

## 0.4 MVP y fases

El MVP corresponde a **F0 (descubrimiento, prerrequisito) + F1–F3 + piloto**. Alcance del MVP:
núcleo backend, backoffice mínimo, APK de meseros, KDS/cocina y caja/impresión. Corresponde al
mayor dolor operativo actual y no depende de pasarelas de pago ni facturación electrónica.

**V1 (F4+)**: web cliente de pedidos (EP-40), reservas, domicilio/reparto propio, pagos en
línea y facturación electrónica DIAN.

## 0.5 Objetivos de negocio

| # | Objetivo | Indicador propuesto |
|---|---|---|
| O1 | Captar pedidos por canal propio (sin comisión de terceros) | Porcentaje de ventas por canal web |
| O2 | Reducir errores de toma y despacho | Quejas por pedido incorrecto por cada 1.000 pedidos |
| O3 | Acelerar el servicio en salón | Tiempo medio de preparación y de entrega |
| O4 | Dar visibilidad en tiempo real a cocina y salón | Latencia comanda → KDS |
| O5 | Producto vendible a varios restaurantes | Número de sucursales activas |

## 0.6 Alcance en una tabla

| Módulo | MVP (F1–F3) | V1 (F4+) | Fuera de alcance |
|---|---|---|---|
| Núcleo backend (pedidos, catálogo, salón, estaciones) | Sí | — | — |
| Backoffice mínimo (catálogo, mesas, usuarios, configuración) | Sí | — | — |
| Caja y arqueo | Sí | — | — |
| Impresión térmica (print agent) | Sí | — | — |
| APK meseros | Sí | — | — |
| KDS cocina | Sí | Métricas | — |
| Web cliente: menú y pedidos (EP-40) | No | Sí | — |
| Web cliente: reservas | No | Sí | — |
| Domicilio / reparto propio | No | Sí | — |
| Pagos en línea | No | Sí | — |
| Facturación electrónica DIAN | No | Sí (si D3 = Sí) | — |
| Inventario / recetas | No | No | Fase futura |
| Contabilidad | No | No | Fase futura |
| Hotelería | No | No | Fase futura |

## 0.7 Supuestos del proyecto

Marcados como supuestos porque **no** provienen del legado ni de una decisión cerrada:

1. Un restaurante puede tener una o más sucursales bajo un mismo cliente.
2. Existe conectividad de red local (WiFi/LAN) en el restaurante, aunque pueda caer.
3. Las impresoras de comanda son térmicas ESC/POS de 58 mm u 80 mm.
4. Los dispositivos de meseros son Android 8 o superior.
5. La operación es principalmente en Colombia; el peso se maneja sin decimales.
6. El restaurante piloto aporta catálogo, mesas y usuarios reales para la puesta en marcha.

## 0.8 Top 3 riesgos

1. Subestimar la facturación electrónica DIAN.
2. Red poco confiable en salón (mitigado con APK offline-first).
3. Crecimiento de alcance hacia inventario, contabilidad u hotelería.
