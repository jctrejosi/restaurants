/**
 * Esquema — E2 «Catálogo»: carta y precios, modificadores, disponibilidad,
 * promociones y cupones.
 *
 * Materializa `docs/arquitectura/esquema/02-catalogo-salon-reservas.md` §2.1–2.2
 * (migración de referencia 0020–0022). `regla_sla` (§2.3 del doc) se implementa
 * en E4 junto con las comandas, según el plan de BD.
 *
 * Reglas del legado que se preservan:
 * - `producto.estacion_id` nulo o estación sin comanda equivale a la estación
 *   `'99'` del punto de venta: no genera comanda.
 * - Los pedidos copian el precio (snapshot) y no dependen de `producto_precio`.
 */
import { desc, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  estacion,
  franjaServicioEnum,
  impuesto,
  sucursal,
  tenant,
} from './01-nucleo';

/* ------------------------------------------------------------------ */
/* Dominios cerrados                                                   */
/* ------------------------------------------------------------------ */

export const agotadoOrigenEnum = pgEnum('agotado_origen_enum', [
  'cocina',
  'salon',
  'backoffice',
]);

export const tipoPromocionEnum = pgEnum('tipo_promocion_enum', [
  'banner',
  'cupon',
  'destacado',
]);

export const tipoCuponEnum = pgEnum('tipo_cupon_enum', ['porcentaje', 'monto']);

/* ------------------------------------------------------------------ */
/* 2.1 Catálogo                                                        */
/* ------------------------------------------------------------------ */

export const categoria = pgTable(
  'categoria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    nombre: text('nombre').notNull(),
    orden: integer('orden').notNull().default(0),
    activa: boolean('activa').notNull().default(true),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId],
      foreignColumns: [tenant.id],
      name: 'fk_categoria_tenant',
    }),
  ],
);

export const producto = pgTable(
  'producto',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoriaId: uuid('categoria_id').notNull(),
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion'),
    impuestoId: uuid('impuesto_id').notNull(),
    estacionId: uuid('estacion_id'),
    sku: text('sku'),
    codigoBarras: text('codigo_barras'),
    tiempoObjetivoSeg: integer('tiempo_objetivo_seg'),
    etiquetas: text('etiquetas').array(),
    activo: boolean('activo').notNull().default(true),
    destacado: boolean('destacado').notNull().default(false),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    actualizadoEn: timestamp('actualizado_en', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.categoriaId],
      foreignColumns: [categoria.id],
      name: 'fk_producto_categoria',
    }),
    foreignKey({
      columns: [t.impuestoId],
      foreignColumns: [impuesto.id],
      name: 'fk_producto_impuesto',
    }),
    foreignKey({
      columns: [t.estacionId],
      foreignColumns: [estacion.id],
      name: 'fk_producto_estacion',
    }),
    check(
      'ck_producto_tiempo_objetivo',
      sql`tiempo_objetivo_seg IS NULL OR tiempo_objetivo_seg > 0`,
    ),
    index('ix_producto_categoria')
      .on(t.categoriaId)
      .where(sql`activo`),
  ],
);

export const productoPrecio = pgTable(
  'producto_precio',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productoId: uuid('producto_id').notNull(),
    sucursalId: uuid('sucursal_id').notNull(),
    precioCentavos: bigint('precio_centavos', { mode: 'number' }).notNull(),
    vigenteDesde: timestamp('vigente_desde', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.productoId],
      foreignColumns: [producto.id],
      name: 'fk_producto_precio_producto',
    }),
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_producto_precio_sucursal',
    }),
    unique('uq_producto_precio').on(
      t.productoId,
      t.sucursalId,
      t.vigenteDesde,
    ),
    check('ck_producto_precio_valor', sql`precio_centavos >= 0`),
    index('ix_producto_precio_vig').on(
      t.productoId,
      t.sucursalId,
      desc(t.vigenteDesde),
    ),
  ],
);

export const productoFoto = pgTable(
  'producto_foto',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productoId: uuid('producto_id').notNull(),
    url: text('url').notNull(),
    orden: smallint('orden').notNull().default(0),
    textoAlt: text('texto_alt'),
  },
  (t) => [
    foreignKey({
      columns: [t.productoId],
      foreignColumns: [producto.id],
      name: 'fk_producto_foto_producto',
    }),
  ],
);

export const alergeno = pgTable(
  'alergeno',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nombre: text('nombre').notNull(),
  },
  (t) => [unique('uq_alergeno_nombre').on(t.nombre)],
);

export const productoAlergeno = pgTable(
  'producto_alergeno',
  {
    productoId: uuid('producto_id').notNull(),
    alergenoId: uuid('alergeno_id').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.productoId],
      foreignColumns: [producto.id],
      name: 'fk_producto_alergeno_producto',
    }),
    foreignKey({
      columns: [t.alergenoId],
      foreignColumns: [alergeno.id],
      name: 'fk_producto_alergeno_alergeno',
    }),
    primaryKey({
      name: 'pk_producto_alergeno',
      columns: [t.productoId, t.alergenoId],
    }),
  ],
);

/* ------------------------------------------------------------------ */
/* 2.1 Modificadores                                                   */
/* ------------------------------------------------------------------ */

export const grupoModificador = pgTable(
  'grupo_modificador',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productoId: uuid('producto_id'),
    categoriaId: uuid('categoria_id'),
    nombre: text('nombre').notNull(),
    minimo: smallint('minimo').notNull().default(0),
    maximo: smallint('maximo').notNull().default(1),
    obligatorio: boolean('obligatorio').notNull().default(false),
  },
  (t) => [
    foreignKey({
      columns: [t.productoId],
      foreignColumns: [producto.id],
      name: 'fk_grupo_modificador_producto',
    }),
    foreignKey({
      columns: [t.categoriaId],
      foreignColumns: [categoria.id],
      name: 'fk_grupo_modificador_categoria',
    }),
    check(
      'ck_grupo_padre',
      sql`(producto_id IS NOT NULL) <> (categoria_id IS NOT NULL)`,
    ),
    check('ck_grupo_modificador_minimo', sql`minimo >= 0`),
    check('ck_grupo_modificador_maximo', sql`maximo >= minimo`),
  ],
);

export const modificador = pgTable(
  'modificador',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    grupoId: uuid('grupo_id').notNull(),
    nombre: text('nombre').notNull(),
    precioCentavos: bigint('precio_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    activo: boolean('activo').notNull().default(true),
  },
  (t) => [
    foreignKey({
      columns: [t.grupoId],
      foreignColumns: [grupoModificador.id],
      name: 'fk_modificador_grupo',
    }),
    check('ck_modificador_precio', sql`precio_centavos >= 0`),
  ],
);

/* ------------------------------------------------------------------ */
/* 2.2 Disponibilidad, promociones y cupones                           */
/* ------------------------------------------------------------------ */

export const disponibilidadProducto = pgTable(
  'disponibilidad_producto',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productoId: uuid('producto_id').notNull(),
    sucursalId: uuid('sucursal_id').notNull(),
    franja: franjaServicioEnum('franja'),
    disponible: boolean('disponible').notNull().default(true),
    agotado: boolean('agotado').notNull().default(false),
    agotadoOrigen: agotadoOrigenEnum('agotado_origen'),
    actualizadoEn: timestamp('actualizado_en', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.productoId],
      foreignColumns: [producto.id],
      name: 'fk_disponibilidad_producto_producto',
    }),
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_disponibilidad_producto_sucursal',
    }),
    // `franja` nula = todo el día (esquema 02, nota).
    unique('uq_disponibilidad')
      .on(t.productoId, t.sucursalId, t.franja)
      .nullsNotDistinct(),
    index('ix_disponibilidad_agotado')
      .on(t.sucursalId)
      .where(sql`agotado`),
  ],
);

export const promocion = pgTable(
  'promocion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    titulo: text('titulo').notNull(),
    texto: text('texto'),
    imagenUrl: text('imagen_url'),
    tipo: tipoPromocionEnum('tipo').notNull(),
    desde: timestamp('desde', { withTimezone: true, mode: 'string' }).notNull(),
    hasta: timestamp('hasta', { withTimezone: true, mode: 'string' }).notNull(),
    sucursalId: uuid('sucursal_id'),
    activa: boolean('activa').notNull().default(true),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId],
      foreignColumns: [tenant.id],
      name: 'fk_promocion_tenant',
    }),
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_promocion_sucursal',
    }),
    check('ck_promocion_rango', sql`desde < hasta`),
  ],
);

export const cupon = pgTable(
  'cupon',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codigo: text('codigo').notNull(),
    tipo: tipoCuponEnum('tipo').notNull(),
    valor: bigint('valor', { mode: 'number' }).notNull(),
    desde: timestamp('desde', { withTimezone: true, mode: 'string' }).notNull(),
    hasta: timestamp('hasta', { withTimezone: true, mode: 'string' }).notNull(),
    usosMaximo: integer('usos_maximo'),
    usos: integer('usos').notNull().default(0),
    sucursalId: uuid('sucursal_id'),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_cupon_sucursal',
    }),
    unique('uq_cupon_codigo').on(t.codigo),
    check('ck_cupon_valor', sql`valor > 0`),
    check('ck_cupon_rango', sql`desde < hasta`),
    check(
      'ck_cupon_usos',
      sql`usos_maximo IS NULL OR usos <= usos_maximo`,
    ),
  ],
);
