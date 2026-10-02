/**
 * Esquema — E6 «Pagos, caja y facturación».
 *
 * Materializa `docs/arquitectura/esquema/03-pedidos-y-dinero.md` §3.3–3.4
 * (migración de referencia 0060–0062).
 *
 * Invariantes de dinero (D-BD-16, SQL manual en la migración):
 * - La suma de pagos `aprobado` de un pedido no supera `pedido.total_centavos`.
 * - Un pedido no pasa a `pagado` si los pagos aprobados no cubren el total.
 * - SUPUESTO: `pedido.total_centavos` es el monto a recaudar (incluida la
 *   propina) y `pago.propina_centavos` desglosa parte de `monto_centavos`
 *   (no lo aumenta). Confirmar con el cliente.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  foreignKey,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { impuesto, medioPago, sucursal, turno, usuario } from './01-nucleo';
import { reserva } from './03-salon-reservas';
import { pedido, pedidoLinea } from './04-pedidos';

/* ------------------------------------------------------------------ */
/* Dominios cerrados                                                   */
/* ------------------------------------------------------------------ */

export const estadoPagoEnum = pgEnum('estado_pago_enum', [
  'pendiente',
  'aprobado',
  'rechazado',
  'reembolsado',
]);

export const estadoDianEnum = pgEnum('estado_dian_enum', [
  'pendiente',
  'enviada',
  'aceptada',
  'rechazada',
  'anulada',
]);

/* ------------------------------------------------------------------ */
/* 3.3 Pagos y caja                                                    */
/* ------------------------------------------------------------------ */

export const pago = pgTable(
  'pago',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pedidoId: uuid('pedido_id'),
    reservaId: uuid('reserva_id'),
    medioPagoId: uuid('medio_pago_id').notNull(),
    montoCentavos: bigint('monto_centavos', { mode: 'number' }).notNull(),
    propinaCentavos: bigint('propina_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    referencia: text('referencia'),
    estado: estadoPagoEnum('estado').notNull().default('pendiente'),
    pasarelaPayload: jsonb('pasarela_payload'),
    usuarioId: uuid('usuario_id'),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    aprobadoEn: timestamp('aprobado_en', { withTimezone: true, mode: 'string' }),
    reembolsadoEn: timestamp('reembolsado_en', {
      withTimezone: true,
      mode: 'string',
    }),
  },
  (t) => [
    foreignKey({
      columns: [t.pedidoId],
      foreignColumns: [pedido.id],
      name: 'fk_pago_pedido',
    }),
    foreignKey({
      columns: [t.reservaId],
      foreignColumns: [reserva.id],
      name: 'fk_pago_reserva',
    }),
    foreignKey({
      columns: [t.medioPagoId],
      foreignColumns: [medioPago.id],
      name: 'fk_pago_medio_pago',
    }),
    foreignKey({
      columns: [t.usuarioId],
      foreignColumns: [usuario.id],
      name: 'fk_pago_usuario',
    }),
    check('ck_pago_monto', sql`monto_centavos > 0`),
    check('ck_pago_propina', sql`propina_centavos >= 0`),
    check(
      'ck_pago_origen',
      sql`(pedido_id IS NOT NULL) <> (reserva_id IS NOT NULL)`,
    ),
    index('ix_pago_pedido').on(t.pedidoId, t.estado),
    index('ix_pago_reserva').on(t.reservaId, t.estado),
  ],
);

export const pagoLinea = pgTable(
  'pago_linea',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pagoId: uuid('pago_id').notNull(),
    pedidoLineaId: uuid('pedido_linea_id').notNull(),
    montoCentavos: bigint('monto_centavos', { mode: 'number' }).notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.pagoId],
      foreignColumns: [pago.id],
      name: 'fk_pago_linea_pago',
    }),
    foreignKey({
      columns: [t.pedidoLineaId],
      foreignColumns: [pedidoLinea.id],
      name: 'fk_pago_linea_linea',
    }),
    check('ck_pago_linea_monto', sql`monto_centavos > 0`),
  ],
);

export const cierreCaja = pgTable(
  'cierre_caja',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    turnoId: uuid('turno_id').notNull(),
    baseInicialCentavos: bigint('base_inicial_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    ventasEfectivoCentavos: bigint('ventas_efectivo_centavos', {
      mode: 'number',
    })
      .notNull()
      .default(0),
    ventasOtrosCentavos: bigint('ventas_otros_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    propinasCentavos: bigint('propinas_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    retirosCentavos: bigint('retiros_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    gastosCentavos: bigint('gastos_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    contadoCentavos: bigint('contado_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    // Puede ser negativa (faltante de caja).
    diferenciaCentavos: bigint('diferencia_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    observaciones: text('observaciones'),
    reabiertoPor: uuid('reabierto_por'),
    reabiertoEn: timestamp('reabierto_en', { withTimezone: true, mode: 'string' }),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.turnoId],
      foreignColumns: [turno.id],
      name: 'fk_cierre_caja_turno',
    }),
    foreignKey({
      columns: [t.reabiertoPor],
      foreignColumns: [usuario.id],
      name: 'fk_cierre_caja_reabierto_por',
    }),
    unique('uq_cierre_caja_turno').on(t.turnoId),
    check('ck_cierre_caja_base', sql`base_inicial_centavos >= 0`),
    check('ck_cierre_caja_ventas_efectivo', sql`ventas_efectivo_centavos >= 0`),
    check('ck_cierre_caja_ventas_otros', sql`ventas_otros_centavos >= 0`),
    check('ck_cierre_caja_propinas', sql`propinas_centavos >= 0`),
    check('ck_cierre_caja_retiros', sql`retiros_centavos >= 0`),
    check('ck_cierre_caja_gastos', sql`gastos_centavos >= 0`),
    check('ck_cierre_caja_contado', sql`contado_centavos >= 0`),
  ],
);

/* ------------------------------------------------------------------ */
/* 3.4 Facturación                                                     */
/* ------------------------------------------------------------------ */

export const factura = pgTable(
  'factura',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    pedidoId: uuid('pedido_id').notNull(),
    numero: bigint('numero', { mode: 'number' }).notNull(),
    prefijo: text('prefijo').notNull().default(''),
    resolucion: text('resolucion'),
    cufe: text('cufe'),
    estadoDian: estadoDianEnum('estado_dian').notNull().default('pendiente'),
    xmlUrl: text('xml_url'),
    pdfUrl: text('pdf_url'),
    totalCentavos: bigint('total_centavos', { mode: 'number' }).notNull(),
    impuestosJson: jsonb('impuestos_json'),
    emitidaEn: timestamp('emitida_en', { withTimezone: true, mode: 'string' }),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_factura_sucursal',
    }),
    foreignKey({
      columns: [t.pedidoId],
      foreignColumns: [pedido.id],
      name: 'fk_factura_pedido',
    }),
    unique('uq_factura_numero').on(t.sucursalId, t.prefijo, t.numero),
    check('ck_factura_total', sql`total_centavos >= 0`),
    index('ix_factura_pedido').on(t.pedidoId),
  ],
);

export const facturaLinea = pgTable(
  'factura_linea',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    facturaId: uuid('factura_id').notNull(),
    descripcion: text('descripcion').notNull(),
    cantidad: numeric('cantidad', { precision: 10, scale: 3 }).notNull(),
    precioCentavos: bigint('precio_centavos', { mode: 'number' }).notNull(),
    impuestoId: uuid('impuesto_id'),
    totalCentavos: bigint('total_centavos', { mode: 'number' }).notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.facturaId],
      foreignColumns: [factura.id],
      name: 'fk_factura_linea_factura',
    }),
    foreignKey({
      columns: [t.impuestoId],
      foreignColumns: [impuesto.id],
      name: 'fk_factura_linea_impuesto',
    }),
    check('ck_factura_linea_cantidad', sql`cantidad > 0`),
    check('ck_factura_linea_precio', sql`precio_centavos >= 0`),
    check('ck_factura_linea_total', sql`total_centavos >= 0`),
  ],
);
