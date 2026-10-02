# 01 — Plan de implementación de la base de datos

## 1. Objetivo

Llevar el modelo consolidado de [`../04-datos-y-persistencia.md`](../04-datos-y-persistencia.md)
a una **base de datos PostgreSQL real**, ejecutable y verificable: migraciones versionadas, seeds,
pruebas de restricciones, agregados de reportes y operación (usuarios, respaldos, CI).

Este plan es la guía de trabajo del diseño; cada etapa produce migraciones y se cierra con
criterios verificables. El esquema físico columna a columna está en
[`../esquema/`](../esquema/README.md).

> **Supuestos vigentes (a confirmar):** motor **PostgreSQL 16+** en contenedores (decisiones A1–A3
> del `README` de arquitectura). El stack propuesto es backend NestJS + web Next.js + móvil Flutter;
> la base de datos no depende de ese stack.

## 2. Decisiones propuestas (registrar como ADR al aprobar)

| # | Decisión | Propuesta | Motivo |
|---|---|---|---|
| D-BD-01 | Motor | PostgreSQL 16+ | tipado, `jsonb`, `tsrange`, exclusión GiST, ecosistema |
| D-BD-02 | Migraciones | **`drizzle-kit`** (`generate` + `migrate`), forward-only; SQL manual en la migración generada para lo que el toolkit no expresa | alineado con `ecommerce` (revisada 2026-10-02, ver [`../05-stack-tecnologico.md`](../05-stack-tecnologico.md)) |
| D-BD-03 | ORM / acceso | **Drizzle ORM**; esquema y relaciones en `backend/drizzle/` | fuente única esquema↔consultas; alineado con `ecommerce` (revisada) |
| D-BD-04 | Estados | **`pgEnum`** para dominios cerrados; catálogos configurables como tablas | alineado con `ecommerce` (revisada) |
| D-BD-05 | Claves | `id uuid` generado en la aplicación (UUIDv7); `gen_random_uuid()` como respaldo | localidad de índice y claves no adivinables |
| D-BD-06 | Aislamiento | `tenant_id` + `sucursal_id` en la aplicación; evaluar RLS como defensa en profundidad | simplicidad primero; RLS en la Fase 0 si se confirma SaaS |
| D-BD-07 | Esquemas | `public` (operativo), `analytics` (agregados), `legacy` (importado, solo lectura) | separar la operación de reportes e importación |
| D-BD-08 | Tiempo | `timestamptz` en UTC; conversión a zona de sucursal en la aplicación/reportes | evitar ambigüedad |
| D-BD-09 | Auditoría | `evento_auditoria` particionada por mes | volumen alto y retención |
| D-BD-10 | Extensiones | `btree_gist` (obligatoria), `pg_trgm` (búsqueda), `postgis` (opcional, D8) | soportar exclusión y búsqueda |
| D-BD-11 | Entorno local | contenedor `restaurants_postgres` (proyecto compose `restaurants`, puerto 5435) | evitar colisión con `ecommerce` (`db`/5432) |
| D-BD-12 | Backend | NestJS 11 + Drizzle + `pg`; yarn + dotenvx; API dev en 3001 | mismo patrón que `ecommerce` |
| D-BD-13 | SQL manual | exclusión de reservas, particionado, triggers y `UNIQUE NULLS NOT DISTINCT` se escriben a mano en la migración generada | `drizzle-kit` no los genera; el snapshot no siempre los diffea |

## 3. Estructura del repositorio de base de datos

```
db/
  docker/              # docker-compose.yml + init.sql (Postgres 16 + PostGIS + extensiones)
backend/
  drizzle/
    schema.ts          # esquema Drizzle (fuente única; materializa ../esquema/)
    relations.ts       # relaciones Drizzle
    migrate/           # SQL generado por drizzle-kit (journal + migraciones)
  scripts/             # utilidades (seed, check-db, migrate)
```

**Convenciones**

- Tablas en singular `snake_case` (`pedido`, `pedido_linea`); columnas en `snake_case`.
- PK `id`; FK `<entidad>_id`; sellos `*_en`.
- Nombres de objetos: `uq_` único, `ix_` índice, `ck_` check, `ex_` exclusión, `fk_` foránea.
- Migraciones (`drizzle-kit`): el SQL generado puede editarse **antes** de aplicarlo para añadir lo
  que el toolkit no expresa (D-BD-13); una vez aplicada, no se edita: todo cambio es una migración nueva.
- Seeds idempotentes (`ON CONFLICT DO NOTHING` o `DO UPDATE` controlado).

## 4. Etapas, entregables y criterios de salida

> Con `drizzle-kit` (D-BD-02 revisada) los archivos de migración son numerados por el toolkit
> (`0000_…`, `0001_…`) con el tag elegido al generar (`yarn db:generate --name organizacion`). Los
> nombres `0010_…`, `0031_…` de las etapas se conservan como **referencia del contenido**, no como
> nombre de archivo.

### E0 — Preparación

- [ ] Confirmar A1–A3 (hosting, motor, stack) y registrar D-BD-01…13 como ADR.
- [x] Crear `db/docker/` (Postgres 16 + PostGIS + `btree_gist`, `pg_trgm`, `unaccent`) — 2026-10-02.
- [x] Inicializar `backend/` (NestJS 11 + Drizzle + `pg`, yarn) — 2026-10-02.
- [ ] Configurar CI: levantar Postgres, aplicar migraciones desde cero y ejecutar pruebas.
- [ ] Definir usuarios de base de datos: `migrator` (DDL), `app` (DML), `readonly` (reportes).
- [ ] Migración inicial de esquemas y convenciones (`organizacion`/`0000_…` con `drizzle-kit`).

**Salida:** CI en verde aplicando una base vacía; conexión de la app y de solo lectura funcionando.

### E1 — Fundamentos: organización, acceso y personas

Migraciones:

- `0010_organizacion.sql`: `tenant`, `sucursal`, `configuracion_sucursal`, `horario_atencion`,
  `cierre_temporal`, `impuesto`, `consecutivo`, `medio_pago`, `turno`.
- `0011_acceso.sql`: `usuario`, `rol`, `permiso`, `rol_permiso`, `usuario_rol`, `dispositivo`.
- `0012_personas.sql`: `cliente`, `consentimiento`, `repartidor`, `solicitud_evento`.

Entregables: migraciones + seeds de roles base (adm, gerente, capitán, cajero, mesero, cocina,
repartidor, marketing, contador) y permisos por código.

**Salida:** se puede crear tenant → sucursal → usuarios con roles y alcance por sucursal.

### E2 — Catálogo

Migraciones:

- `0020_catalogo.sql`: `categoria`, `producto`, `producto_precio`, `producto_foto`, `alergeno`,
  `producto_alergeno`.
- `0021_modificadores.sql`: `grupo_modificador`, `modificador`.
- `0022_disponibilidad.sql`: `disponibilidad_producto`, `promocion`, `cupon`.

**Salida:** carta completa por sede con precios vigentes, modificadores, alérgenos y agotados;
seed de una carta demo (10 categorías, 60 productos).

### E3 — Salón y reservas

Migraciones:

- `0030_salon.sql`: `zona`, `mesa`, `mesa_asignacion`, `sesion_mesa`.
- `0031_reservas.sql`: `politica_reserva`, `reserva` (**constraint de exclusión por rango**),
  `lista_espera`.

**Salida:** prueba de que dos reservas solapadas de la misma mesa son rechazadas por la base y que
una reserva en otra mesa entra sin problema.

### E4 — Pedidos y comandas

Migraciones:

- `0040_pedidos.sql`: `pedido`, `pedido_linea`, `pedido_linea_modificador`, `ajuste_pedido`.
- `0041_comandas.sql`: `comanda`, `comanda_linea`, `regla_sla`, `regla_capacidad`.
- `0042_indices_operativos.sql`: índices de KDS, pedidos activos y búsqueda.

**Salida:** un pedido con líneas de varias estaciones genera comandas por estación; los productos
con estación `99` o vacía no generan comanda (prueba automatizada).

### E5 — Domicilio

Migraciones:

- `0050_domicilio.sql`: `zona_cobertura`, `domicilio_asignacion`, `liquidacion_repartidor`.

**Salida:** una asignación de domicilio recorre sus estados y no permite dos asignaciones activas
para el mismo pedido.

### E6 — Pagos, caja y facturación

Migraciones:

- `0060_pagos.sql`: `pago`, `pago_linea`.
- `0061_caja.sql`: `cierre_caja`.
- `0062_facturacion.sql`: `factura`, `factura_linea`.

**Salida:** pruebas de **pago único** (la suma de pagos aprobados no supera el total y `pagado`
exige cubrirlo), división de cuenta que cuadra, y numeración fiscal por prefijo sin repetir.

### E7 — Notificaciones, marketing y CRM

Migraciones:

- `0070_notificaciones.sql`: `plantilla_notificacion`, `notificacion`,
  `configuracion_notificacion`.
- `0071_crm.sql`: `suscriptor`, `resena`, `encuesta`, `segmento_cliente`, `evento_analitica`.

**Salida:** plantillas base por evento (confirmación, listo, en camino, encuesta) y encuesta única
por pedido.

### E8 — Operación, sincronización y trazabilidad

Migraciones:

- `0080_sync.sql`: `sync_operacion` (idempotencia por `client_op_id`).
- `0081_auditoria.sql`: `evento_auditoria` **particionada por mes** + índices.
- `0082_bitacora.sql`: `bitacora_evento` (vista materializada o tabla alimentada por eventos).
- `0083_alertas_y_reportes.sql`: `alerta_operativa`, `umbral_alerta`, `reporte_guardado`,
  `reporte_programado`, `exportacion`, `trabajo_impresion`.

**Salida:** reenvío de la misma operación offline no duplica nada; la auditoría no admite
`UPDATE`/`DELETE` (permisos + trigger de bloqueo).

### E9 — Agregados y reportes (`analytics`)

- [ ] Vistas materializadas: ventas por período/sede/canal/modalidad/producto; reservas y no-show;
  tiempos de atención, preparación, despacho, ruta y cobro; cumplimiento de SLA; ocupación.
- [ ] Jobs de refresco (programados) y rol `readonly` para BI.
- [ ] Verificación de que los reportes no consultan la base operativa (RNF-R5-03).

**Salida:** un reporte de tiempos de un mes responde en segundos y cuadra con los sellos.

### E10 — Seeds, aceptación y desempeño

- [ ] Seed demo: tenant + 1 sucursal + 20 mesas + carta + usuarios por rol + SLA + plantillas.
- [ ] Suite de pruebas: migración desde cero, restricciones, máquinas de estado, idempotencia.
- [ ] Pruebas de carga de las consultas críticas: tablero KDS, pedidos activos, comandas por
  estación, cierre de caja, reportes.
- [ ] Simulacro de restauración (backup + PITR) documentado.

**Salida:** base reproducible desde cero con un solo comando y todas las pruebas en verde.

## 5. Plan de pruebas de la base de datos

| Tipo | Qué verifica | Herramienta propuesta |
|---|---|---|
| Migraciones | Aplicar desde cero y desde la versión anterior | CI + contenedor efímero |
| Restricciones | Exclusión de reservas, único de códigos, pago único, cuadre de división | pruebas SQL de integración |
| Máquinas de estado | Transiciones válidas e inválidas por entidad | pruebas de integración del backend |
| Idempotencia | Reenvío de `sync_operacion` y de cobros | pruebas de integración |
| Datos | Seeds idempotentes y consistentes | scripts `seed` en CI |
| Desempeño | Consultas críticas dentro de presupuesto (p95) | `pgbench` o k6 + `pg_stat_statements` |
| Auditoría | Inmutabilidad y particionado | pruebas SQL |

## 6. Operación

| Aspecto | Definición |
|---|---|
| Usuarios de BD | `migrator` (DDL), `app` (DML), `readonly` (reportes/BI), monitoreo |
| Respaldos | Copia completa diaria + WAL para PITR; retención según el cliente |
| Restauración | Simulacro obligatorio antes del piloto (E10) |
| Migración en producción | Ventana controlada, migración previa validada en staging, plan de reversa por restauración |
| Monitoreo | `pg_stat_statements`, consultas lentas, tamaño de particiones, bloqueos |
| Retención | Auditoría y bitácoras configurables (2 años por defecto, SUPUESTO); facturación según ley |

## 7. Cronograma y esfuerzo (SUPUESTO)

| Etapa | Esfuerzo (jornadas) | Depende de |
|---|---|---|
| E0 Preparación | 2–3 | A1–A3 |
| E1 Fundamentos | 3–4 | E0 |
| E2 Catálogo | 3–4 | E1 |
| E3 Salón y reservas | 4–5 | E1 |
| E4 Pedidos y comandas | 4–5 | E2, E3 |
| E5 Domicilio | 2–3 | E4 |
| E6 Pagos, caja y facturación | 4–5 | E4 |
| E7 Notificaciones, marketing y CRM | 2–3 | E1 |
| E8 Operación y trazabilidad | 3–4 | E4 |
| E9 Agregados y reportes | 3–4 | E6, E8 |
| E10 Seeds, aceptación y desempeño | 3–5 | todas |

**Total: 33–45 jornadas de una persona** (~5–6 semanas con dedicación parcial; se puede comprimir
paralelizando E2/E3 y E7/E8). A recalibrar al cerrar E0.

## 8. Riesgos de la implementación

| Riesgo | Impacto | Mitigación |
|---|---|---|
| A1–A3 sin cerrar (motor/hosting) | retrasa E0 | plan escrito para PostgreSQL; validar antes de E1 |
| Cambios de alcance tras el piloto | migraciones extra | modelo estable por etapas; forward-only |
| Volumen de auditoría | consultas lentas | particionado mensual desde E8 |
| RLS no adoptado y fuga entre tenants | seguridad | filtros obligatorios + pruebas de aislamiento; reevaluar RLS en E0 |
| Importación del legado (D1) | retrabajo en catálogo | esquema `legacy` y capa de importación en fase posterior |
| Zonas de cobertura con PostGIS | dependencia pesada | geometría opcional; lista de barrios como respaldo (D8) |
| Pago único mal modelado | doble cobro | pruebas de restricción e idempotencia en E6 |

## 9. Definición de terminado (DoD)

1. Todas las migraciones aplican desde cero en CI sin errores y sin pasos manuales.
2. Las restricciones críticas están probadas (reserva, pago único, idempotencia, códigos).
3. Los seeds cargan sin duplicar y dejan un ambiente demo operativo.
4. Las consultas críticas cumplen el presupuesto de desempeño acordado.
5. Respaldos y restauración probados; usuarios de BD con privilegios mínimos.
6. `../04-datos-y-persistencia.md` actualizado con lo implementado y sus desviaciones.
