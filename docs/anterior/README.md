# Documentación — Nuevo software para restaurantes

Producto nuevo **desde 0**, derivado del análisis del legado `punto_c`
(xHarbour + FiveWin + ADS/DBF).

Alcance solicitado por el cliente:

- Reservas y pedidos web para el cliente final.
- Pedidos y APK para los meseros.
- Pedidos / despliegue para la cocina (KDS).

## Índice

| # | Documento | Contenido |
|---|---|---|
| 00 | [Resumen ejecutivo](./00-resumen-ejecutivo.md) | Contexto, objetivos, alcance en una tabla, recomendación |
| 01 | [Análisis del legado](./01-analisis-legado.md) | Tecnología, apps, tablas, flujo as-is, reglas reutilizables, deuda |
| 02 | [Alcance y decisiones](./02-alcance-y-decisiones.md) | Alcance in/out, decisiones D1–D10, criterios de aceptación del MVP |
| 03 | [Arquitectura](./03-arquitectura.md) | Estilo, componentes, ADR, eventos, ambientes y escala |
| 04 | [Modelo de datos](./04-modelo-de-datos.md) | Tablas, campos, enums, índices y relaciones |
| 05 | [Reglas de negocio](./05-reglas-de-negocio.md) | Reglas formalizadas RN-01…RN-32 con criterio de aceptación |
| 06 | [Funcionalidades](./06-funcionalidades.md) | Detalle por módulo, pantallas, flujos y casos borde |
| 07 | [API, eventos y seguridad](./07-api-eventos-y-seguridad.md) | Contratos REST/WebSocket, RBAC, auditoría, cumplimiento |
| 08 | [Offline, impresión y hardware](./08-offline-impresion-hardware.md) | Sincronización, print agent, ESC/POS, equipos |
| 09 | [Pagos, impuestos y facturación](./09-pagos-impuestos-y-facturacion.md) | Cobro, propina, INC/IVA, DIAN, arqueo |
| 10 | [Reservas, domicilio y notificaciones](./10-reservas-domicilio-notificaciones.md) | Reglas de reserva, cobertura, reparto y mensajería |
| 11 | [Backlog de historias de usuario](./11-backlog-historias-de-usuario.md) | Épicas e historias por fase, con prioridad y estimación |
| 12 | [Roadmap y estimación](./12-roadmap-y-estimacion.md) | Fases, hitos, dependencias, equipo y esfuerzo |
| 13 | [QA, DevOps y operación](./13-qa-devops-operacion.md) | Pruebas, CI/CD, observabilidad, soporte y costos |
| 14 | [Migración del legado](./14-migracion-del-legado.md) | Mapeo de datos, convivencia, reconciliación y corte |
| 15 | [KPIs y métricas](./15-kpis-y-metricas.md) | Indicadores de producto, operación y técnicos |
| 16 | [Riesgos y preguntas](./16-riesgos-y-preguntas.md) | Riesgos, mitigaciones y preguntas para el cliente |
| 17 | [Glosario](./17-glosario.md) | Términos del negocio y del legado |

## Convenciones del proyecto

### Nomenclatura de entidades (español, singular)

`Pedido`, `Línea de pedido`, `Comanda`, `Estación`, `Producto`, `Categoría`, `Mesa`, `Zona`,
`Reserva`, `Pago`, `Factura`, `Sucursal`, `Turno`, `Usuario`, `Rol`, `Cliente`, `Repartidor`,
`Dispositivo`, `Impresora`.

### Estados del pedido

`borrador` → `enviado` → `en_preparacion` → `listo` → `entregado` → `por_cobrar` → `pagado`.
Terminal alterno: `cancelado`. El canal domicilio añade `en_camino` entre `listo` y `entregado`.

### Estados de la línea de pedido

`pendiente` → `enviada` → `en_preparacion` → `lista` → `entregada`. Terminal alterno: `anulada`.

### Canales y modalidades

- **Canales**: `web`, `mesero`, `caja`, `kiosco` (canal futuro reservado, sin cliente en MVP/V1).
- **Modalidades**: `mesa`, `domicilio`, `recoger`.

### Numeración de secciones

El documento 00 (resumen ejecutivo) usa secciones `0.x`; los documentos 01–17 usan `NN.x`.

## Estado de la documentación

Documento de planeación inicial. **No reemplaza** el levantamiento funcional con el cliente.
Las decisiones pendientes (D1–D10) deben cerrarse antes de construir.

## Nota de fuentes

Base del análisis: archivos de `punto_c/` (fuentes `.PRG`, `.AJM`, `.RC`).
Los recursos `.BMP/.bmp` (carpetas `01/IMAGENES`, `BMP/`, `IMAGENES/`, archivos sueltos)
no fueron legibles como texto, por lo que su contenido no está documentado.
Pendiente revisarlos para recuperar logos, botones y posibles fotos de productos.

## Regla de redacción

Cuando un dato no proviene del legado ni de una decisión cerrada, se marca explícitamente como
**supuesto**. Los campos del legado citados son únicamente los verificados en el código.
