/**
 * Esquema — E4 «Pedidos y comandas».
 *
 * Materializa `docs/arquitectura/esquema/03-pedidos-y-dinero.md` §3.1
 * (migración de referencia 0040–0042) y `regla_sla` del §2.3 del volumen 02.
 *
 * Reglas del legado que se preservan:
 * - El enrutamiento de comandas usa `producto.estacion_id`; una línea sin
 *   estación (nulo o `'99'`) **no genera comanda** (se verifica en el backend).
 * - `pedido_linea.notas` se limita a 105 caracteres (3 bloques de 35 del ticket).
 * - `pedido_linea.cantidad` admite fracciones/peso (`es_fraccion`).
 * - Los precios viajan como snapshot; el pedido no depende del catálogo.
 */
import { desc, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { cliente, estacion, sucursal, turno, usuario } from './01-nucleo';
import { modificador, producto } from './02-catalogo';
import { mesa, sesionMesa } from './03-salon-reservas';

/* ------------------------------------------------------------------ */
/* Dominios cerrados                                                   */
/* ------------------------------------------------------------------ */

export const canalPedidoEnum = pgEnum('canal_pedido_enum', [
  'web',
  'mesero',
  'caja',
  'kiosco',
]);

export const modalidadPedidoEnum = pgEnum('modalidad_pedido_enum', [
  'mesa',
  'domicilio',
  'recoger',
]);

export const estadoPedidoEnum = pgEnum('estado_pedido_enum', [
  'borrador',
  'enviado',
  'en_preparacion',
  'listo',
  'en_camino',
  'entregado',
  'por_cobrar',
  'pagado',
  'cancelado',
]);

export const estadoPedidoLineaEnum = pgEnum('estado_pedido_linea_enum', [
  'pendiente',
  'enviada',
  'en_preparacion',
  'lista',
  'entregada',
  'anulada',
]);

export const tipoAjusteEnum = pgEnum('tipo_ajuste_enum', [
  'descuento',
  'cortesia',
  'recargo',
]);

export const estadoComandaEnum = pgEnum('estado_comanda_enum', [
  'pendiente',
  'impresa',
  'en_preparacion',
  'lista',
  'entregada',
  'anulada',
]);

export const estadoComandaLineaEnum = pgEnum('estado_comanda_linea_enum', [
  'pendiente',
  'en_preparacion',
  'lista',
  'entregada',
  'anulada',
]);

/* ------------------------------------------------------------------ */
/* 3.1 Pedidos                                                         */
/* ------------------------------------------------------------------ */

export const pedido = pgTable(
  'pedido',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    codigo: text('codigo').notNull(),
    canal: canalPedidoEnum('canal').notNull(),
    modalidad: modalidadPedidoEnum('modalidad').notNull(),
    clienteId: uuid('cliente_id'),
    nombreContacto: text('nombre_contacto'),
    telefonoContacto: text('telefono_contacto'),
    mesaId: uuid('mesa_id'),
    sesionMesaId: uuid('sesion_mesa_id'),
    meseroId: uuid('mesero_id'),
    turnoId: uuid('turno_id'),
    horaProgramada: timestamp('hora_programada', {
      withTimezone: true,
      mode: 'string',
    }),
    estado: estadoPedidoEnum('estado').notNull().default('borrador'),
    subtotalCentavos: bigint('subtotal_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    descuentosCentavos: bigint('descuentos_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    impuestosCentavos: bigint('impuestos_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    propinaCentavos: bigint('propina_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    recargosCentavos: bigint('recargos_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    totalCentavos: bigint('total_centavos', { mode: 'number' })
      .notNull()
      .default(0),
    notas: text('notas'),
    origenUtm: text('origen_utm'),
    clientOrderId: text('client_order_id'),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    enviadoEn: timestamp('enviado_en', { withTimezone: true, mode: 'string' }),
    listoEn: timestamp('listo_en', { withTimezone: true, mode: 'string' }),
    entregadoEn: timestamp('entregado_en', { withTimezone: true, mode: 'string' }),
    porCobrarEn: timestamp('por_cobrar_en', {
      withTimezone: true,
      mode: 'string',
    }),
    pagadoEn: timestamp('pagado_en', { withTimezone: true, mode: 'string' }),
    canceladoEn: timestamp('cancelado_en', { withTimezone: true, mode: 'string' }),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_pedido_sucursal',
    }),
    foreignKey({
      columns: [t.clienteId],
      foreignColumns: [cliente.id],
      name: 'fk_pedido_cliente',
    }),
    foreignKey({
      columns: [t.mesaId],
      foreignColumns: [mesa.id],
      name: 'fk_pedido_mesa',
    }),
    foreignKey({
      columns: [t.sesionMesaId],
      foreignColumns: [sesionMesa.id],
      name: 'fk_pedido_sesion_mesa',
    }),
    foreignKey({
      columns: [t.meseroId],
      foreignColumns: [usuario.id],
      name: 'fk_pedido_mesero',
    }),
    foreignKey({
      columns: [t.turnoId],
      foreignColumns: [turno.id],
      name: 'fk_pedido_turno',
    }),
    unique('uq_pedido_codigo').on(t.codigo),
    check(
      'ck_pedido_mesa',
      sql`modalidad <> 'mesa' OR mesa_id IS NOT NULL`,
    ),
    check(
      'ck_pedido_hora',
      sql`modalidad = 'mesa' OR hora_programada IS NOT NULL OR estado = 'borrador'`,
    ),
    check('ck_pedido_subtotal', sql`subtotal_centavos >= 0`),
    check('ck_pedido_descuentos', sql`descuentos_centavos >= 0`),
    check('ck_pedido_impuestos', sql`impuestos_centavos >= 0`),
    check('ck_pedido_propina', sql`propina_centavos >= 0`),
    check('ck_pedido_recargos', sql`recargos_centavos >= 0`),
    check('ck_pedido_total', sql`total_centavos >= 0`),
    index('ix_pedido_activo')
      .on(t.sucursalId, t.estado, t.creadoEn)
      .where(sql`estado NOT IN ('pagado', 'cancelado')`),
    index('ix_pedido_mesa')
      .on(t.mesaId)
      .where(sql`estado NOT IN ('pagado', 'cancelado')`),
    index('ix_pedido_contacto').on(
      t.sucursalId,
      t.telefonoContacto,
      desc(t.creadoEn),
    ),
  ],
);

export const pedidoLinea = pgTable(
  'pedido_linea',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pedidoId: uuid('pedido_id').notNull(),
    productoId: uuid('producto_id').notNull(),
    nombreSnapshot: text('nombre_snapshot').notNull(),
    precioSnapshotCentavos: bigint('precio_snapshot_centavos', {
      mode: 'number',
    }).notNull(),
    impuestoSnapshot: jsonb('impuesto_snapshot'),
    cantidad: numeric('cantidad', { precision: 10, scale: 3 }).notNull(),
    esFraccion: boolean('es_fraccion').notNull().default(false),
    cantidadFraccion: numeric('cantidad_fraccion', {
      precision: 10,
      scale: 3,
    }),
    notas: text('notas'),
    comensal: smallint('comensal'),
    estado: estadoPedidoLineaEnum('estado').notNull().default('pendiente'),
  },
  (t) => [
    foreignKey({
      columns: [t.pedidoId],
      foreignColumns: [pedido.id],
      name: 'fk_pedido_linea_pedido',
    }),
    foreignKey({
      columns: [t.productoId],
      foreignColumns: [producto.id],
      name: 'fk_pedido_linea_producto',
    }),
    check(
      'ck_pedido_linea_precio',
      sql`precio_snapshot_centavos >= 0`,
    ),
    check('ck_pedido_linea_cantidad', sql`cantidad > 0`),
    check(
      'ck_pedido_linea_cantidad_fraccion',
      sql`cantidad_fraccion IS NULL OR cantidad_fraccion > 0`,
    ),
    check(
      'ck_pedido_linea_notas',
      sql`notas IS NULL OR char_length(notas) <= 105`,
    ),
  ],
);

export const pedidoLineaModificador = pgTable(
  'pedido_linea_modificador',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pedidoLineaId: uuid('pedido_linea_id').notNull(),
    modificadorId: uuid('modificador_id').notNull(),
    nombreSnapshot: text('nombre_snapshot').notNull(),
    precioSnapshotCentavos: bigint('precio_snapshot_centavos', { mode: 'number' })
      .notNull()
      .default(0),
  },
  (t) => [
    foreignKey({
      columns: [t.pedidoLineaId],
      foreignColumns: [pedidoLinea.id],
      name: 'fk_pedido_linea_modificador_linea',
    }),
    foreignKey({
      columns: [t.modificadorId],
      foreignColumns: [modificador.id],
      name: 'fk_pedido_linea_modificador_modificador',
    }),
    check(
      'ck_pedido_linea_modificador_precio',
      sql`precio_snapshot_centavos >= 0`,
    ),
  ],
);

export const ajustePedido = pgTable(
  'ajuste_pedido',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pedidoId: uuid('pedido_id').notNull(),
    pedidoLineaId: uuid('pedido_linea_id'),
    tipo: tipoAjusteEnum('tipo').notNull(),
    valorCentavos: bigint('valor_centavos', { mode: 'number' }),
    porcentaje: numeric('porcentaje', { precision: 5, scale: 2 }),
    motivo: text('motivo').notNull(),
    usuarioId: uuid('usuario_id').notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.pedidoId],
      foreignColumns: [pedido.id],
      name: 'fk_ajuste_pedido_pedido',
    }),
    foreignKey({
      columns: [t.pedidoLineaId],
      foreignColumns: [pedidoLinea.id],
      name: 'fk_ajuste_pedido_linea',
    }),
    foreignKey({
      columns: [t.usuarioId],
      foreignColumns: [usuario.id],
      name: 'fk_ajuste_pedido_usuario',
    }),
    check(
      'ck_ajuste_valor',
      sql`(valor_centavos IS NOT NULL) <> (porcentaje IS NOT NULL)`,
    ),
    check(
      'ck_ajuste_valor_centavos',
      sql`valor_centavos IS NULL OR valor_centavos >= 0`,
    ),
    check(
      'ck_ajuste_porcentaje',
      sql`porcentaje IS NULL OR porcentaje BETWEEN 0 AND 100`,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* 3.1 Comandas y SLA                                                  */
/* ------------------------------------------------------------------ */

export const comanda = pgTable(
  'comanda',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pedidoId: uuid('pedido_id').notNull(),
    sucursalId: uuid('sucursal_id').notNull(),
    estacionId: uuid('estacion_id').notNull(),
    numero: integer('numero').notNull(),
    turnoId: uuid('turno_id'),
    estado: estadoComandaEnum('estado').notNull().default('pendiente'),
    enviadaEn: timestamp('enviada_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    listaEn: timestamp('lista_en', { withTimezone: true, mode: 'string' }),
    entregadaEn: timestamp('entregada_en', {
      withTimezone: true,
      mode: 'string',
    }),
  },
  (t) => [
    foreignKey({
      columns: [t.pedidoId],
      foreignColumns: [pedido.id],
      name: 'fk_comanda_pedido',
    }),
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_comanda_sucursal',
    }),
    foreignKey({
      columns: [t.estacionId],
      foreignColumns: [estacion.id],
      name: 'fk_comanda_estacion',
    }),
    foreignKey({
      columns: [t.turnoId],
      foreignColumns: [turno.id],
      name: 'fk_comanda_turno',
    }),
    unique('uq_comanda').on(t.sucursalId, t.numero),
    check(
      'ck_comanda_sellos',
      sql`lista_en IS NULL OR lista_en >= enviada_en`,
    ),
    index('ix_comanda_kds').on(t.estacionId, t.estado),
  ],
);

export const comandaLinea = pgTable(
  'comanda_linea',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    comandaId: uuid('comanda_id').notNull(),
    pedidoLineaId: uuid('pedido_linea_id').notNull(),
    estado: estadoComandaLineaEnum('estado').notNull().default('pendiente'),
  },
  (t) => [
    foreignKey({
      columns: [t.comandaId],
      foreignColumns: [comanda.id],
      name: 'fk_comanda_linea_comanda',
    }),
    foreignKey({
      columns: [t.pedidoLineaId],
      foreignColumns: [pedidoLinea.id],
      name: 'fk_comanda_linea_linea',
    }),
    unique('uq_comanda_linea').on(t.comandaId, t.pedidoLineaId),
  ],
);

export const reglaSla = pgTable(
  'regla_sla',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    estacionId: uuid('estacion_id'),
    productoId: uuid('producto_id'),
    objetivoSeg: integer('objetivo_seg').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_regla_sla_sucursal',
    }),
    foreignKey({
      columns: [t.estacionId],
      foreignColumns: [estacion.id],
      name: 'fk_regla_sla_estacion',
    }),
    foreignKey({
      columns: [t.productoId],
      foreignColumns: [producto.id],
      name: 'fk_regla_sla_producto',
    }),
    check('ck_regla_sla_objetivo', sql`objetivo_seg > 0`),
    check(
      'ck_regla_sla_alcance',
      sql`(estacion_id IS NOT NULL) <> (producto_id IS NOT NULL)`,
    ),
  ],
);
