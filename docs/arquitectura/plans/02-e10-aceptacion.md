# E10 — Seeds, aceptación y desempeño (registro)

**Fecha:** 2026-10-02 · **Estado:** completada · **Alcance:** cierre de la implementación de la base
de datos (etapas E1–E10 del [plan](./01-plan-implementacion-base-de-datos.md)).

Este documento es el **registro de aceptación** de la base: qué se construyó, con qué comandos se
reproduce y qué resultados se obtuvieron. Los números son de un contenedor local (misma máquina);
sirven como línea base, no como SLA de producción.

## 1. Entregables

| Artefacto | Ruta | Descripción |
|---|---|---|
| Seed idempotente | `backend/scripts/seed.ts` (`yarn db:seed`) | Tenant + sucursal + 20 mesas + carta demo (12 productos) + 7 roles y 26 permisos + 8 usuarios demo (PIN 1234) + política de reserva + SLA + plantillas + umbrales + zonas de cobertura |
| Suite de pruebas | `backend/scripts/test-db.ts` (`yarn db:test`) | 28 pruebas: estructura, restricciones, triggers, idempotencia y agregados; corre en una transacción con `SAVEPOINT`s y termina en `ROLLBACK` |
| Benchmark | `backend/scripts/bench-db.ts` (`yarn db:bench`) | Datos sintéticos (600 pedidos pagados de 30 días, 200 comandas activas, 150 reservas) + `EXPLAIN ANALYZE` de 6 consultas críticas; termina en `ROLLBACK` |
| Usuarios de BD | `db/docker/roles.sql` | `migrator` (DDL), `app` (DML sin edición de auditoría), `readonly` (solo `analytics`); montado como `02_roles.sql` en el contenedor |
| Simulacro de restauración | `db/docker/restore-drill.sh` | `pg_dump -Fc` → restauración en base desechable → verificación de integridad → limpieza |
| CI | `.github/workflows/ci.yml` | Postgres+PostGIS efímero, extensiones, usuarios, migraciones desde cero, seed, build y suite |

## 2. Reproducción

```bash
# 1. Base local (una vez)
cd db/docker && docker compose up -d

# 2. Backend
cd ../../backend && yarn install
yarn db:migrate        # 0000–0008
yarn db:seed           # datos base y demo (idempotente: repetible)
yarn db:test           # 28 pruebas (no deja cambios)
yarn db:bench          # línea base de desempeño (no deja cambios)
yarn build

# 3. Restauración y usuarios de BD
cd ../db/docker
psql / docker exec -i restaurants_postgres psql -U postgres -d restaurants -f roles.sql  # si el volumen es previo a roles.sql
./restore-drill.sh
```

## 3. Resultados de la suite (28/28)

| Bloque | Pruebas |
|---|---|
| Estructura | 6 extensiones; 72 tablas base; 5 particiones de auditoría; 48 dominios `pgEnum`; 8 vistas materializadas |
| Núcleo | `uq_usuario_rol` (NULLS NOT DISTINCT) rechaza duplicados; trigger `actualizado_en` |
| Reservas | Solape rechazado (`ex_reserva_mesa_solape`); contigua aceptada; cancelada no bloquea; `periodo` materializado por trigger |
| Pedidos/comandas | Notas > 105 caracteres rechazadas; `uq_comanda` por sucursal y número |
| Domicilio | Segunda asignación activa rechazada (`uq_domicilio_activo`) |
| Dinero | Pago aprobado en exceso rechazado (`fn_pago_limite_pedido`); pedido a `pagado` sin cobertura rechazado y con cobertura aceptado (`fn_pedido_pagado_cubierto`) |
| Marketing | Plantilla duplicada rechazada; reseña puntaje 6 rechazada; encuesta única por referencia |
| Operación | `client_op_id` duplicado rechazado; auditoría inmutable (UPDATE/DELETE bloqueados); enrutado a partición del mes; partición idempotente; `ck_impresion_origen` |
| Analytics | Refresco sin error; pedido pagado visible en `mv_ventas_diarias` |

Resultado observado: `Resultado: 28 pruebas ok, 0 fallos.` con `ROLLBACK` final (la base queda
sin cambios).

**Máquinas de estado:** las transiciones de `estado_pedido`, `estado_reserva`, `estado_comanda`,
etc. se validan en la capa de dominio del backend (aún no implementada); la base garantiza las
invariantes de dinero (cobertura de pago), la inmutabilidad de auditoría, la idempotencia de
`sync_operacion` y la coherencia de sellos temporales (`ck_*_sellos`). Las pruebas de transiciones
se añadirán con los módulos de la API.

## 4. Desempeño (línea base local)

Datos sintéticos: 600 pedidos pagados (30 días), 1 800 líneas, 200 comandas activas con 600 líneas,
150 reservas, 20 mesas. `ANALYZE` previo; `EXPLAIN ANALYZE` ejecutado una vez por consulta.

| Consulta | Tiempo |
|---|---|
| `analytics.fn_refrescar_analytics()` (8 vistas) | 80 ms |
| KDS: comandas activas por estación | 0.094 ms |
| Pedidos activos de la sucursal | 0.021 ms |
| Comandas del día con líneas por estación | 0.404 ms |
| Cierre de caja: pagos aprobados del día por medio | 0.735 ms |
| Reservas de hoy | 0.208 ms |
| Reporte: ventas de 30 días (`mv_ventas_diarias`) | 0.140 ms |

Umbral de referencia del plan: consultas operativas p95 por debajo de 50 ms con un volumen 10× —
el benchmark queda holgadamente dentro; se repetirá con datos reales en el piloto.

## 5. Migración desde cero, restauración y usuarios

- **Desde cero:** base nueva + `init.sql` (extensiones y `immutable_unaccent`) + `db:migrate` +
  `db:seed` + `db:test` → 9 migraciones aplicadas y 28/28 pruebas. Repetible por CI.
- **Restauración:** `pg_dump -Fc` (624 KB), restaurado en `restaurants_restore_check` con
  `pg_restore --no-owner`; verificación: 9 migraciones, 72 tablas, 5 particiones, 8 vistas
  materializadas, 20 mesas y 12 productos del seed. La base desechable se elimina al final.
- **Usuarios:** verificado por conexión real — `app` recibe `permission denied` en
  `UPDATE`/`DELETE` de `evento_auditoria` y puede ejecutar el refresco de analytics;
  `readonly` no puede leer tablas operativas y sí `analytics.mv_*`; `migrator` puede crear tablas.

**PITR:** el simulacro local cubre respaldo lógico completo y su restauración. El PITR (archivado
WAL) es un procedimiento de producción: se configura al definir el hosting (E0/A1–A3) y se
documentará con el runbook de despliegue.

## 6. Pendientes que quedan fuera de E10

| Pendiente | Depende de |
|---|---|
| Job programado de refresco de `analytics` (RNF-R5-02, ≤ 1 min) | despliegue/scheduler |
| Job de mantenimiento de particiones de auditoría | operación |
| Pruebas de transiciones de estado y de API | módulos del backend (siguiente fase) |
| PITR y runbook de despliegue | hosting definitivo |
| Rotación de contraseñas de BD en producción | despliegue |
