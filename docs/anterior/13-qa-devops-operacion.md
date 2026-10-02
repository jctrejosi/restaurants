# 13 — QA, DevOps y operación

Los valores **SUPUESTO** no provienen del legado ni de decisiones cerradas; validarlos con el piloto.

## 13.1 Estrategia de pruebas

Pirámide: muchas unitarias, integración selectiva y pocos E2E (los flujos de 13.2). Todo merge a `main` exige pruebas en verde; E2E nocturnos y pre-release.

| Nivel | Cubre | Herramientas | Automatización |
|---|---|---|---|
| Unitarias | Precios, impuestos, propina, estados, consecutivos, fracción/peso, idempotencia | Jest (NestJS), Flutter Test, Vitest | 100%, con umbral |
| Integración | API + PostgreSQL + Redis, colas BullMQ, WebSocket, print agent simulado | Testcontainers, supertest | 100% en CI |
| Contrato | OpenAPI REST, AsyncAPI de eventos, compatibilidad APK/KDS/API | Schemathesis, Pact (SUPUESTO) | En CI por PR |
| E2E | Flujos de 13.2 en web, backoffice, KDS y APK | Playwright, integration_test/Patrol | Nocturna y pre-release |
| Exploratorias | Riesgos, dispositivos, hardware real, usabilidad de cocina | Sesiones con guion y matriz de dispositivos | Manual |
| No funcionales | Carga, red, seguridad básica, accesibilidad | k6, OWASP ZAP, axe | Periódica |

Cobertura mínima propuesta (SUPUESTO): ≥70% en dominio y ≥50% global.

## 13.2 Flujos E2E críticos a automatizar

| # | Flujo | Verificación principal |
|---|---|---|
| 1 | Tomar y enviar pedido a cocina | Comanda en KDS e impresa en la estación correcta |
| 2 | Enrutamiento a varias estaciones | 3 ítems en 2 estaciones generan 2 comandas; estación vacía o `99` no imprime |
| 3 | Modificar pedido ya enviado | Agregar líneas genera solo la comanda nueva; no duplica las anteriores |
| 4 | Marcar estados en KDS | `en_preparacion` → `lista` → `entregada` con horas y aviso al mesero |
| 5 | Anulación con permiso | Sin permiso rechaza; con permiso exige motivo y audita |
| 6 | Cobro con varios medios y propina | Los pagos suman el total; propina configurable |
| 7 | División de cuenta | Por líneas y partes iguales, con saldos correctos |
| 8 | Cierre de caja | Arqueo, diferencia y bloqueo del turno; no permite doble cierre |
| 9 | Reserva y no-show | Bloqueo de mesa, no-show manual y liberación por margen (recordatorios: V1) |
| 10 | Domicilio fuera de cobertura (V1) | Error con opción de cambiar a recoger |
| 11 | Offline y sincronización | 30 minutos sin red sin pérdida ni duplicados por `client_order_id` |
| 12 | Fallo de impresora | Reintentos con alerta sin bloquear; reimpresión manual |
| 13 | Reimpresión con auditoría | Evento con usuario, motivo y marca de reimpresión |

## 13.3 Pruebas de carga y objetivos

| Escenario | Supuesto | Objetivo |
|---|---|---|
| Pico viernes/noche | 200 pedidos/h y 500 dispositivos (a validar) | Sin errores 5xx; pérdida de eventos 0 |
| Realtime | Comanda → KDS | p95 < 1 s; p99 < 2 s |
| API de pedidos | Envío desde APK | p95 < 500 ms |
| Sync offline | 50 operaciones acumuladas | Aplicadas en < 10 s y una sola vez |
| Impresión | Impresora o agente caído | Al recuperar heartbeat de impresora/agente se adelanta el reintento y la cola drena en < 30 s; alerta a los 60 s; con el agente caído los trabajos se retienen (no pasan a DLQ) |

La cola de mensajes muertos (DLQ) aplica solo a trabajos fallidos tras agotar el backoff (`08` §8.5), no a la retención por agente caído.

Herramientas: k6 y simulador WebSocket en staging a escala; mensual y antes de cada release mayor.

## 13.4 Pruebas de hardware

| Elemento | Pruebas | Cobertura |
|---|---|---|
| Impresoras ESC/POS 58/80 mm | Acentos, corte, ancho 32/48, perfiles Epson/Star/genérico | 2 marcas reales en laboratorio |
| Gaveta | Secuencia `27,112,0,64,240` | 1 modelo |
| Dispositivos Android | Android 8–14, pantallas y cámara (QR) | 3 equipos (SUPUESTO) |
| Red | Roaming WiFi, caída de AP, LAN sin internet | Piloto y laboratorio |
| Print agent | Mini PC, reinicio, IP dinámica, UPS | 1 setup por sitio |

## 13.5 UAT y piloto en restaurante real

- Alcance: 1 restaurante, 3–4 semanas (1 en sombra, 2–3 reales con pico). SUPUESTO.
- Ingreso: fase 3 en verde, capacitación, soporte en sitio y rollback listo.
- Salida: criterios de `02` §2.5; cero P1 en 5 días; satisfacción ≥ 4/5 y métricas capturadas (SUPUESTO); acta firmada.

## 13.6 Criterios de salida de calidad del MVP

1. Flujos E2E de 13.2 en verde y cobertura mínima de 13.1. Los flujos marcados V1 (p. ej. domicilio) y los recordatorios de reserva quedan fuera del gate del MVP.
2. Cero defectos P1/P2 abiertos; los P3 con plan y responsable.
3. Carga de 13.3 cumplida y restauración de respaldo probada.
4. Sin vulnerabilidades críticas ni altas sin mitigar (SAST/DAST).
5. Documentación: API, runbooks, manuales de usuario y plan de rollback.
6. UAT y piloto de 13.5 firmados.

## 13.7 Ambientes y datos

| Ambiente | Uso | Datos | Despliegue |
|---|---|---|---|
| Desarrollo | Trabajo diario | Semilla sintética reproducible | Local con Docker Compose |
| Staging | QA, UAT y demos | Copia anonimizada del piloto | Automático desde `main` |
| Producción | Restaurantes reales | Datos reales con consentimiento | Manual aprobado y con ventana |

Regla: ninguna migración llega a producción sin pasar por staging.

## 13.8 CI/CD

| Aspecto | Propuesta |
|---|---|
| Repositorios | `api`, `web`, `kds`, `apk`, `infra` (SUPUESTO; alternativa monorepo) |
| Ramas | Trunk-based: `main` protegida, ramas cortas `feat/*` y `fix/*`, tags semver |
| Pipeline PR | Lint + unitarias + contrato + build + SAST + dry-run de migración |
| Pipeline main | Despliegue a staging + E2E; producción con aprobación manual |
| Migraciones | Hacia atrás (expand-contract); nunca destructivas en el mismo release; rollback probado |
| Feature flags | Por sucursal y por rol; liberar código desactivado; limpieza periódica (SUPUESTO) |
| APK | Build firmado en CI; `versionCode` automático; Play canal interno/cerrado |

## 13.9 Observabilidad

| Señal | Contenido | Herramienta |
|---|---|---|
| Logs | JSON estructurado con correlation-id, sin datos personales | Loki/CloudWatch |
| Métricas | RED (latencia, error, saturación) y negocio: comandas/hora y tiempo de preparación | Prometheus + Grafana |
| Trazas | Pedido → comanda → impresión | OpenTelemetry |
| Alertas | 5xx > 1% en 5 min; cola de impresión > 60 s; KDS desconectado > 2 min; sync pendiente > 100 | Alertmanager |
| Tableros | Operación, cocina, impresión y negocio | Grafana |

SLOs propuestos (SUPUESTO):

| SLO | MVP | V1 |
|---|---|---|
| Disponibilidad de API mensual | 99,5% | 99,9% |
| Latencia comanda → KDS p95 | < 1 s | < 1 s |
| Error de impresión (con reintento) | < 0,5% | < 0,2% |
| Sync aplicado una sola vez | 100% | 100% |

## 13.10 Respaldos y recuperación ante desastres

- PostgreSQL: PITR con WAL y full diario; MVP con RPO ≤ 5 min y RTO ≤ 2 h; V1 con ≤ 1 min y ≤ 1 h (SUPUESTO).
- Backups cifrados, en región distinta, retención de 30 días (SUPUESTO).
- Redis no es fuente de verdad: las colas se reconstruyen.
- Restauración trimestral en staging y simulacro anual de región.

## 13.11 Releases

| Componente | Versionado | Canal | Actualización |
|---|---|---|---|
| Backend | Semver | Staging continuo; producción con ventana | Rollback a N-1; feature flags |
| APK | `versionCode` + `versionName` | Play interno → cerrado → producción | Endpoint `min_version` fuerza upgrade; despliegue gradual |
| KDS | Semver por tag | PWA | Service worker; refresh controlado |
| Print agent | Semver e instalador firmado | Descarga desde backoffice | Auto-update y reversión remota |

Sin despliegues en picos (día de la madre, amor y amistad, fin de año) ni en el piloto. SUPUESTO.

## 13.12 Operación y soporte

Onboarding de un restaurante (checklist):

1. Datos fiscales, sucursal, zona horaria y moneda.
2. Zonas, mesas y capacidades.
3. Catálogo, categorías, modificadores, precios e impuestos.
4. Estaciones, impresoras, perfiles y pruebas de impresión.
5. Usuarios, roles, permisos y PIN.
6. Medios de pago, propina y consecutivos.
7. Zonas de cobertura, tarifas y repartidores (si aplica).
8. Horarios, franjas de reserva y política de no-show.
9. Instalación de APK, KDS y print agent en cada dispositivo.
10. Red WiFi, UPS y prueba de caída.
11. Capacitación por rol y guía rápida impresa.
12. Simulacro de contingencia (sin internet y sin impresora).
13. Carga de datos iniciales y reconciliación.
14. Firma de acta de puesta en marcha.

| Rol | Capacitación | Duración sugerida |
|---|---|---|
| Mesero | APK: mesa, pedido, anulación y cobro | 2 h + acompañamiento |
| Cocina | KDS: estados, SLA y reimpresión | 1 h |
| Caja | Turnos, pagos, cierre y reimpresión | 2 h |
| Administrador | Backoffice, catálogo, usuarios y reportes | 4 h |

Severidad: P1 caída o pérdida de pedidos; P2 degradación; P3 consulta. Soporte: N1 restaurante, N2 producto, N3 desarrollo. Canales: WhatsApp, teléfono y portal (SUPUESTO). SLA: P1 15 min/4 h; P2 4 h/2 días; P3 1 día/5 días (SUPUESTO). Escalamiento 30 min y 1 h (N1→N2→N3), con guardia.

## 13.13 Costos operativos estimados

Cifras a validar con cotizaciones; no son compromiso comercial.

| Concepto | Estimación | Nota |
|---|---|---|
| Infraestructura cloud (API, PostgreSQL gestionado, Redis, storage, balanceador) | USD 250–600/mes en MVP; USD 400–1.200/mes multi-cliente | SUPUESTO |
| Monitoreo, logs y trazas | USD 50–200/mes | Según retención |
| Dominio, TLS y correo transaccional | USD 10–40/mes | — |
| WhatsApp Business API | USD 0,01–0,08 por conversación (SUPUESTO) | Verificar tarifas vigentes |
| Pasarela de pagos | 2,5–3,5% más fijo por transacción (SUPUESTO) | Wompi/PayU/MercadoPago |
| Proveedor DIAN | USD 50–300/mes o por documento (SUPUESTO) | Validar con proveedor |
| Hardware por sucursal | USD 800–2.500 (impresoras, dispositivos, red, UPS, mini PC) | SUPUESTO |
| Soporte N2 | 1 persona por cada 25–40 restaurantes | SUPUESTO |

Revisar al cerrar la fase 0 y junto con D2 (SaaS u on-premise), que define quién paga la infraestructura.
