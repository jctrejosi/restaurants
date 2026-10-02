# 02 — Alcance y decisiones

## 2.1 Alcance interpretado de lo pedido por el cliente

| Frase del cliente | Interpretación | Nota |
|---|---|---|
| "resvar y pedidos web para el cliente" | Reservas (fecha/hora/personas/mesa) y pedidos en línea (domicilio, recoger, o en mesa vía QR) | Confirmar si "resvar" = reservar |
| "pedidos y apk para los meseros" | App Android para tomar/modificar pedidos en mesa, enviar a cocina, pre-cuenta | Requiere tolerancia a caídas de WiFi |
| "pedidos para la cocina" | KDS (pantalla) y/o impresión térmica de comanda por estación | Equivale a `IMPCOMAN` + `CTRCOMAN` modernizados |

Fuera de este alcance explícito quedan **hotel, inventario y contabilidad**, que sí existen en el
legado y podrían ser fases futuras.

## 2.2 Decisiones clave pendientes (bloqueantes de diseño)

| # | Decisión | Opciones | Posición preliminar |
|---|---|---|---|
| D1 | ¿Producto nuevo independiente o integración/migración del sistema actual? | Standalone / Adaptador ADS-DBF / Reemplazo total | Standalone con importación opcional |
| D2 | ¿Multi-sede y multi-tenant (SaaS) o instalación por cliente? | SaaS / On-premise / Híbrido | Multi-sede preparado para SaaS |
| D3 | ¿Facturación electrónica DIAN? | Sí / No | Muy probable en Colombia; definir proveedor |
| D4 | ¿País(es) y moneda(s)? | Colombia / Multi-país | Colombia primero, impuestos parametrizables |
| D5 | ¿Pasarela de pagos? | Wompi / PayU / MercadoPago / Ninguna | Definir según D3 |
| D6 | ¿Cocina por pantalla (KDS), impresión térmica, o ambas? | KDS / Impresión / Ambas | Ambas, con KDS como principal |
| D7 | ¿Modo offline en APK y por cuánto tiempo? | Online-only / Cola breve / Offline largo | Cola local con sync |
| D8 | ¿Domicilio propio con GPS o integración con terceros? | Propio / Terceros / Ambos | Reparto propio en V1 |
| D9 | ¿Inventario/recetas/descuento de insumos en el alcance? | Sí / No | Fase futura |
| D10 | ¿Hardware de meseros? | Celulares propios / Tablets / Rugged | Diseñar para celular y tablet |

## 2.3 Requerimientos no funcionales

- **Latencia de realtime** en cocina < 1 s.
- **Disponibilidad** del toma de pedidos incluso sin internet (APK offline-first).
- **Multi-sucursal** desde el modelo (sucursal → zona → mesa).
- **Idempotencia** en envío de pedidos y pagos.
- **Auditoría** completa de cambios.
- **Seguridad**: roles, PIN, expiración de sesión, cifrado en tránsito.
- **Escalabilidad** horizontal del backend y del bus realtime.
- **Observabilidad**: trazabilidad de tiempos de cocina y errores de impresión con reintentos.

## 2.4 Alcance explícito

### Dentro del MVP (F1–F3 + piloto; F0 es prerrequisito)

- Catálogo, estaciones, mesas, usuarios y roles.
- Backoffice mínimo (catálogo, salón, usuarios y configuración) y caja.
- Motor de pedidos con modelo único para todos los canales.
- APK de meseros con toma de pedido, envío a cocina y modo offline.
- KDS por estación con tiempos objetivo y alertas.
- Enrutamiento a estaciones e impresión térmica (print agent).
- Permisos básicos y auditoría de acciones sensibles.

### Fuera del MVP

- **V1 (F4+)**: web cliente de pedidos (EP-40), reservas, domicilio/reparto propio, pagos en línea y facturación electrónica DIAN.
- Inventario, recetas y descuento de insumos (fase futura).
- Contabilidad y conciliación contable (fase futura).
- Hotelería (fase futura).
- Fidelización y cupones (V2).
- Integración con apps de domicilio de terceros (fase futura).
- Analítica avanzada y tableros ejecutivos (fase futura).

## 2.5 Criterios de aceptación del MVP

El MVP se considera terminado cuando, en un restaurante piloto:

1. Un mesero puede abrir una mesa, tomar un pedido, enviarlo y modificarlo desde el APK.
2. La comanda llega al KDS correcto en menos de 1 segundo y se imprime en la impresora correcta.
3. La cocina puede marcar `en_preparacion` y `lista`, el mesero marca `entregada` y recibe el aviso.
4. El sistema opera con la red caída durante al menos 30 minutos sin perder pedidos ni duplicarlos.
5. El backoffice refleja los cambios de catálogo en APK y KDS sin reinstalar aplicaciones.
6. Toda acción sensible queda registrada en auditoría con usuario, dispositivo y hora.
7. Las pruebas automatizadas de los flujos críticos pasan en CI.
8. Existe documentación de instalación, operación y soporte para la sucursal piloto.

## 2.6 Supuestos

Ver la sección **Supuestos del proyecto** en `00-resumen-ejecutivo.md`. Cualquier cambio en esos
supuestos puede alterar el alcance, la estimación y el modelo de datos.
