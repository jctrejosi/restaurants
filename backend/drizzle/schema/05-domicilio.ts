/**
 * Esquema — E5 «Domicilio»: cobertura, asignación a repartidores y liquidación.
 *
 * Materializa `docs/arquitectura/esquema/03-pedidos-y-dinero.md` §3.2
 * (migración de referencia 0050). La regla «un pedido solo puede tener una
 * asignación activa» es un índice único parcial (`uq_domicilio_activo`).
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { repartidor, sucursal } from './01-nucleo';
import { pedido } from './04-pedidos';

/* ------------------------------------------------------------------ */
/* Dominios cerrados                                                   */
/* ------------------------------------------------------------------ */

export const estadoDomicilioEnum = pgEnum('estado_domicilio_enum', [
  'asignado',
  'recogido',
  'en_camino',
  'entregado',
  'entrega_fallida',
  'devuelto',
]);

/* ------------------------------------------------------------------ */
/* 3.2 Domicilio                                                       */
/* ------------------------------------------------------------------ */

export const zonaCobertura = pgTable(
  'zona_cobertura',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    nombre: text('nombre').notNull(),
    tarifaCentavos: bigint('tarifa_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    pedidoMinimoCentavos: bigint('pedido_minimo_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    tiempoEstimadoMin: integer('tiempo_estimado_min'),
    // GeoJSON (o `geometry` con PostGIS si se activa D8/D-BD-10).
    geometria: jsonb('geometria'),
    activa: boolean('activa').notNull().default(true),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_zona_cobertura_sucursal',
    }),
    unique('uq_zona_cobertura').on(t.sucursalId, t.nombre),
    check('ck_zona_cobertura_tarifa', sql`tarifa_centavos >= 0`),
    check('ck_zona_cobertura_minimo', sql`pedido_minimo_centavos >= 0`),
    check(
      'ck_zona_cobertura_tiempo',
      sql`tiempo_estimado_min IS NULL OR tiempo_estimado_min > 0`,
    ),
  ],
);

export const domicilioAsignacion = pgTable(
  'domicilio_asignacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pedidoId: uuid('pedido_id').notNull(),
    repartidorId: uuid('repartidor_id').notNull(),
    asignadoEn: timestamp('asignado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    recogidoEn: timestamp('recogido_en', { withTimezone: true, mode: 'string' }),
    entregadoEn: timestamp('entregado_en', {
      withTimezone: true,
      mode: 'string',
    }),
    estado: estadoDomicilioEnum('estado').notNull().default('asignado'),
    evidenciaUrl: text('evidencia_url'),
  },
  (t) => [
    foreignKey({
      columns: [t.pedidoId],
      foreignColumns: [pedido.id],
      name: 'fk_domicilio_asignacion_pedido',
    }),
    foreignKey({
      columns: [t.repartidorId],
      foreignColumns: [repartidor.id],
      name: 'fk_domicilio_asignacion_repartidor',
    }),
    check(
      'ck_domicilio_sellos',
      sql`(recogido_en IS NULL OR recogido_en >= asignado_en) AND
          (entregado_en IS NULL OR (recogido_en IS NOT NULL AND entregado_en >= recogido_en))`,
    ),
    // Un pedido solo puede tener una asignación activa (índice único parcial).
    uniqueIndex('uq_domicilio_activo')
      .on(t.pedidoId)
      .where(sql`estado IN ('asignado', 'recogido', 'en_camino')`),
    index('ix_domicilio_repart').on(t.repartidorId, t.estado),
  ],
);

export const liquidacionRepartidor = pgTable(
  'liquidacion_repartidor',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    repartidorId: uuid('repartidor_id').notNull(),
    periodoDesde: date('periodo_desde').notNull(),
    periodoHasta: date('periodo_hasta').notNull(),
    entregas: integer('entregas').notNull().default(0),
    tarifasCentavos: bigint('tarifas_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    propinasCentavos: bigint('propinas_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    totalCentavos: bigint('total_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.repartidorId],
      foreignColumns: [repartidor.id],
      name: 'fk_liquidacion_repartidor_repartidor',
    }),
    check('ck_liquidacion_rango', sql`periodo_desde <= periodo_hasta`),
    check('ck_liquidacion_entregas', sql`entregas >= 0`),
    check('ck_liquidacion_tarifas', sql`tarifas_centavos >= 0`),
    check('ck_liquidacion_propinas', sql`propinas_centavos >= 0`),
    check('ck_liquidacion_total', sql`total_centavos >= 0`),
  ],
);
