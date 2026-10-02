# 16 — Riesgos y preguntas

## 16.1 Matriz de riesgos ampliada

Columnas: probabilidad, impacto, fase en que se materializa (según `12-roadmap-y-estimacion.md`),
responsable sugerido y mitigación. Los riesgos R-01 a R-08 provienen de la versión anterior de este
documento (sección 7.1); R-09 a R-17 se agregan en esta revisión.

> **SUPUESTO:** probabilidad, impacto, fase y responsable son estimaciones preliminares del equipo,
> no datos confirmados por el cliente. Se validan y ajustan en la Fase 0 (descubrimiento).

| ID | Riesgo | Probabilidad | Impacto | Fase en que se materializa | Responsable sugerido | Mitigación |
|---|---|---|---|---|---|---|
| R-01 | Subestimar la facturación electrónica DIAN | Alta | Alto | Fase 6 (decisión en Fase 0) | PM + contador del cliente | Validar D3 en Fase 0; proveedor externo con sandbox temprano; encapsular la integración tras una interfaz propia; no bloquear el MVP (fases 1–3) |
| R-02 | WiFi inestable en salón | Alta | Alto | Fases 2–4 | Líder mobile + cliente (red) | APK offline-first con SQLite y cola idempotente; pruebas de caída de red en el piloto; recomendaciones de cobertura WiFi |
| R-03 | Impresión poco fiable por diversidad de impresoras | Alta | Alto | Fase 2 | Líder técnico (print agent) | Print agent con cola, reintentos y monitoreo; perfiles ESC/POS y Star probados; lista de impresoras homologadas |
| R-04 | Cambio de stack para el equipo actual (xHarbour + FiveWin) | Media | Medio | Fases 0–2 | Gerencia + líder técnico | Capacitación o contratación temprana; prototipo en Fase 0; documentación de patrones y revisiones de código |
| R-05 | Cliente con sistema legado que quiere coexistir | Media | Medio | Fases 0–1 (decisión D1) y piloto/corte (ejecución) | PM + arquitecto | Adaptador/importador por lotes con reconciliación; evitar migración big-bang; limitar en el tiempo la doble operación |
| R-06 | Crecimiento de alcance (inventario, hotel, contabilidad) | Alta | Alto | Todas las fases | PM + cliente | Congelar alcance del MVP por escrito; control de cambios con impacto en tiempo y costo; registrar nuevos requerimientos en el backlog futuro |
| R-07 | Concurrencia y consistencia de pedidos | Media | Medio | Fases 1–2 | Líder backend | Fuente única de verdad, transacciones e idempotencia; pruebas de concurrencia sobre mesas y comandas |
| R-08 | Multi-sede no previsto desde el inicio | Media | Alto | Fase 1 | Arquitecto de datos | `tenant_id` y `sucursal_id` desde la primera tabla (ADR-09); pruebas con más de una sucursal |
| R-09 | Dependencia del proveedor de facturación electrónica | Media | Alto | Fases 0 y 6 | PM + líder backend | Exigir SLA, API estable y plan de salida; interfaz propia para no acoplar el dominio; evaluar un segundo proveedor como contingencia |
| R-10 | Incumplimiento de protección de datos personales | Media | Alto | Fases 4–6 | PM + responsable de datos | Consentimiento y política de tratamiento; minimización; cifrado; retención y borrado; cláusulas con terceros (Ley 1581 de Colombia, a confirmar según D4) |
| R-11 | Rotación de personal del restaurante (meseros y cocina) | Alta | Medio | Fases 2–6 (operación) | Cliente + soporte | Onboarding dentro de las apps; roles y PIN simples; material de capacitación corto; modo entrenamiento; métricas de adopción |
| R-12 | Hardware no compatible (impresoras, tablets, lectores) | Media | Medio | Fases 2–3 | Líder técnico + cliente | Homologar equipos antes de comprar; pruebas en sitio; plan B de impresión; exigir Android 8+ (supuesto del proyecto) |
| R-13 | Crecimiento del costo de infraestructura | Media | Medio | Fases 4–6 y operación | DevOps + gerencia | Pruebas de carga para dimensionar; alertas de costo; arquitectura escalable por demanda; incluir costo de infraestructura en el precio por sucursal |
| R-14 | Dependencia de un único desarrollador con conocimiento del dominio | Media | Alto | Todas las fases | Gerencia + líder técnico | Documentación viva (esta serie), ADR, revisiones cruzadas, rotación de módulos; conservar acceso al código legado |
| R-15 | Cambios regulatorios (impuestos, facturación, datos) | Media | Alto | Todas las fases | PM + contador/asesor legal | Parametrizar impuestos, numeración y propina; integración fiscal desacoplada; seguimiento normativo y cláusula de actualización en el contrato |
| R-16 | Competencia de precio en el mercado de software para restaurantes | Alta | Medio | Fase 6 y etapa comercial | Gerencia/producto | Diferenciar por KDS + offline + impresión local; MVP acotado; control de costos; propuesta de valor centrada en el dolor operativo |
| R-17 | Falta de adopción por parte de meseros y cocina | Alta | Alto | Fases 2–4 | PM + cliente | Involucrar al personal desde el diseño; piloto por estación; capacitación; campeones internos; interfaz simple y rápida; medir adopción |

## 16.2 Preguntas para el cliente

Preguntas del levantamiento inicial (1–16) y preguntas adicionales (17–25).

1. ¿El producto es nuevo y vendible a varios restaurantes (SaaS), o instalación por cliente?
2. ¿Debe integrarse con clientes que hoy usan `punto_c` (ADS/DBF), o migrar datos?
3. ¿Facturación electrónica DIAN? ¿Ya tienen proveedor? Si ya facturan electrónicamente, ¿con qué proveedor y cómo se integra hoy con el POS?
4. ¿Solo Colombia o varios países/monedas?
5. ¿Pasarela de pagos preferida?
6. ¿Cocina con pantalla, impresora, o ambas? ¿Cuántas estaciones?
7. ¿Los meseros usarán celular propio, tablets o equipos rugged?
8. ¿Se requiere operar sin internet? ¿Cuánto tiempo máximo?
9. ¿Domicilio propio con seguimiento GPS o integración con apps de terceros? Posición preliminar revisada: reparto propio en V1 (sujeto a confirmación; D8).
10. ¿Inventario, recetas y descuento de insumos entran en el alcance?
11. ¿Reservas con depósito y política de no-show?
12. ¿Programa de fidelización/puntos desde el MVP?
13. ¿Hoy se maneja propina (voluntaria, sugerida u obligatoria) y cómo se distribuye entre el personal?
14. ¿Reportería y analítica que necesitan directivos?
15. ¿Marca propia o marca blanca para revender?
16. ¿Hay manuales, cartas, planos de mesas o fotos del menú que puedan compartir?

Preguntas adicionales:

17. ¿Cuántas sucursales tienen hoy y en qué ciudades? ¿Cuántas prevén abrir en los próximos 24 meses?
18. ¿Cuál es el volumen diario de pedidos y el pico en hora pico (pedidos por hora)?
19. ¿Quién configura y mantiene el catálogo (productos, precios, agotados) y con qué frecuencia?
20. ¿Se manejan impuestos especiales (INC, IVA diferenciado o impuesto al consumo por tipo de producto)?
21. ¿Hay contrato con apps de domicilio (Rappi u otras) o se prevé integrarlas en el mediano plazo? (Ampliación de D8.)
22. ¿Cuál es el presupuesto estimado y la fecha objetivo de lanzamiento?
23. ¿Existe soporte interno de TI en el restaurante o toda la operación técnica dependerá del proveedor?
24. ¿Se requiere algún idioma distinto al español (interfaz, carta, factura, notificaciones)?
25. ¿Qué equipos poseen hoy (marca y modelo de impresoras, tablets, routers) para la homologación de hardware? (Ampliación de D10.)

## 16.3 Siguientes pasos inmediatos

| # | Acción | Responsable sugerido | Horizonte |
|---|---|---|---|
| 1 | Enviar este set de documentos al cliente y resolver D1–D10 en una sesión de descubrimiento | PM | Semana 1 |
| 2 | Obtener los DDL/estructuras reales de `FADCON`, `FADMESA`, `FACOMAN`, `FACOCINA`, `FAESPERA` para mapear campos y validar las reglas inferidas | Líder técnico + cliente | Semanas 1–2 |
| 3 | Revisar los recursos gráficos (`01/IMAGENES`, `BMP`, `.RC`) con alguien que pueda verlos | PM + diseñador | Semanas 1–2 |
| 4 | Definir el MVP por escrito (fases 1–3) y congelar alcance | PM + cliente | Semana 2 |
| 5 | Prototipo de arquitectura: API + WebSocket + print agent + un KDS mínimo, para validar latencia real de comanda a cocina | Líder técnico | Semanas 2–4 |
| 6 | Evaluar y preseleccionar proveedor de facturación electrónica y pasarela de pagos (D3/D5) | PM + líder backend | Semanas 2–4 |
| 7 | Levantar requisitos de protección de datos y definir el contrato de tratamiento con el cliente | PM + asesor legal | Semanas 2–4 |
| 8 | Confirmar presupuesto, fecha objetivo y disponibilidad del equipo (interno o contratado) | Gerencia + cliente | Semana 1 |
| 9 | Homologar hardware del piloto: impresoras, dispositivos de meseros y red WiFi | Líder técnico + cliente | Semanas 3–5 |
| 10 | Validar con el contador el tratamiento de impuestos, propina y cierre de caja | PM + contador del cliente | Semanas 3–5 |

## 16.4 Nota de interpretación

Se tomó "resvar" como **reservar**. Si el cliente quiso decir otra cosa (por ejemplo "reservar
mesas" sin pedidos), el módulo web se simplifica. Confirmar antes de diseñar detalle.
