# Esquema de base de datos

Documentación del **esquema físico** que implementa el modelo consolidado de
[`../04-datos-y-persistencia.md`](../04-datos-y-persistencia.md) y que se construirá siguiendo
[`../plans/01-plan-implementacion-base-de-datos.md`](../plans/01-plan-implementacion-base-de-datos.md).

**Estado:** implementado E1–E10 (2026-10-02) — migraciones `0000`–`0008` aplicadas, seed y suite
de aceptación completos (registro en
[`../plans/02-e10-aceptacion.md`](../plans/02-e10-aceptacion.md)). El detalle de avance vive en
[`../plans/01-plan-implementacion-base-de-datos.md`](../plans/01-plan-implementacion-base-de-datos.md);
el stack y su estado, en [`../05-stack-tecnologico.md`](../05-stack-tecnologico.md).

## Documentos

| # | Documento | Contenido |
|---|---|---|
| 01 | [Núcleo: organización, acceso y personas](./01-nucleo.md) | Tenant, sucursal, configuración, cocina, usuarios, dispositivos y clientes |
| 02 | [Catálogo, salón y reservas](./02-catalogo-salon-reservas.md) | Carta, precios, modificadores, zonas, mesas y reservas |
| 03 | [Pedidos, domicilio y dinero](./03-pedidos-y-dinero.md) | Pedidos, comandas, domicilio, pagos, caja y facturación |
| 04 | [Marketing, notificaciones y operación](./04-marketing-y-operacion.md) | CRM, mensajería, sincronización, auditoría, reportes y alertas |

## Convenciones físicas

- **Motor:** PostgreSQL 16+. Esquemas: `public` (operativo), `analytics` (agregados),
  `legacy` (importado, solo lectura).
- **Claves:** `id uuid PRIMARY KEY` (UUIDv7 generado por la aplicación; `gen_random_uuid()`
  como respaldo). FK `<entidad>_id` con `REFERENCES`; `ON DELETE RESTRICT` por defecto
  (nada se borra: se cancela o anonimiza).
- **Tiempo:** `timestamptz` en UTC; sellos `*_en`; conversión a la zona horaria de la sucursal en
  la aplicación.
- **Dinero:** `bigint` en centavos, sufijo `_centavos`; moneda por sucursal.
- **Estados:** `pgEnum` (enums nativos) para dominios cerrados; catálogos configurables como tablas
  (D-BD-04 revisada).
- **Mutabilidad:** `actualizado_en` se mantiene con trigger en las tablas mutables.
- **JSON:** `jsonb` solo para payloads y snapshots que no se consultan por campo.
- **Nombres de objetos:** `uq_` único, `ix_` índice, `ck_` check, `ex_` exclusión, `fk_` foránea.
- **Reservas:** el solape de mesa se bloquea con constraint de exclusión (`btree_gist` obligatoria).
- **Agregados:** el esquema `analytics` (8 vistas materializadas + `analytics.fn_refrescar_analytics()`)
  vive únicamente como SQL manual en `backend/drizzle/migrate/0008_analytics.sql`: Drizzle no modela
  vistas materializadas. Los reportes leen solo `analytics` (RNF-R5-03).

> El DDL de estos documentos es la **especificación**; su materialización es
> `backend/drizzle/schema.ts` (módulos `schema/01`–`08` + `relations.ts`) y las migraciones de
> `backend/drizzle/migrate/` (`0000`–`0008`). Los DDL de los volúmenes 01–04 usan `text` + `CHECK`
> como notación de especificación: en `schema.ts` se materializaron como `pgEnum` (D-BD-04 revisada).
