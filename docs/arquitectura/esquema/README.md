# Esquema de base de datos

Documentación del **esquema físico** que implementa el modelo consolidado de
[`../04-datos-y-persistencia.md`](../04-datos-y-persistencia.md) y que se construirá siguiendo
[`../plans/01-plan-implementacion-base-de-datos.md`](../plans/01-plan-implementacion-base-de-datos.md).

**Estado:** borrador v0.1 — sujeto a las decisiones D-BD-01…13 (E0 del plan); stack alineado con
`ecommerce` (ver [`../05-stack-tecnologico.md`](../05-stack-tecnologico.md)).

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
- **Mutabilidad:** `updated_at` se mantiene con trigger en las tablas mutables.
- **JSON:** `jsonb` solo para payloads y snapshots que no se consultan por campo.
- **Nombres de objetos:** `uq_` único, `ix_` índice, `ck_` check, `ex_` exclusión, `fk_` foránea.
- **Reservas:** el solape de mesa se bloquea con constraint de exclusión (`btree_gist` obligatoria).

> El DDL de estos documentos es la **especificación**; su materialización es
> `backend/drizzle/schema.ts` y las migraciones de `backend/drizzle/migrate/`. Los DDL de los
> volúmenes 01–04 usan `text` + `CHECK` como notación de especificación: al implementar `schema.ts`
> se convierten a `pgEnum` (pendiente registrado en
> [`../05-stack-tecnologico.md`](../05-stack-tecnologico.md) §7).
