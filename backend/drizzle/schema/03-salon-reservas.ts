/**
 * Esquema — E3 «Salón y reservas»: zonas, mesas, sesiones y reservas.
 *
 * Materializa `docs/arquitectura/esquema/02-catalogo-salon-reservas.md` §2.4–2.5
 * (migración de referencia 0030–0031).
 *
 * La restricción de exclusión anti-solape de `reserva` (`ex_reserva_mesa_solape`)
 * se añade como SQL manual en la migración (D-BD-13): `drizzle-kit` no expresa
 * `EXCLUDE USING gist`.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  customType,
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
import { cliente, sucursal, turno, usuario } from './01-nucleo';

/**
 * `tstzrange` no tiene tipo propio en `pg-core`; se declara uno mínimo.
 * El rango lo materializa el trigger `tg_reserva_periodo` (migración 0002).
 */
const tstzrange = customType<{ data: string }>({
  dataType() {
    return 'tstzrange';
  },
});

/* ------------------------------------------------------------------ */
/* Dominios cerrados                                                   */
/* ------------------------------------------------------------------ */

export const estadoMesaEnum = pgEnum('estado_mesa_enum', [
  'libre',
  'ocupada',
  'por_cobrar',
  'reservada',
  'fuera_servicio',
]);

export const depositoReglaEnum = pgEnum('deposito_regla_enum', [
  'no',
  'siempre',
  'grupos',
  'fechas_especiales',
]);

export const estadoReservaEnum = pgEnum('estado_reserva_enum', [
  'solicitada',
  'confirmada',
  'sentada',
  'no_show',
  'cancelada',
]);

export const origenReservaEnum = pgEnum('origen_reserva_enum', [
  'web',
  'telefono',
  'mostrador',
]);

export const estadoListaEsperaEnum = pgEnum('estado_lista_espera_enum', [
  'esperando',
  'ofrecida',
  'aceptada',
  'expirada',
  'cancelada',
]);

/* ------------------------------------------------------------------ */
/* 2.4 Salón                                                           */
/* ------------------------------------------------------------------ */

export const zona = pgTable(
  'zona',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    nombre: text('nombre').notNull(),
    aforo: integer('aforo'),
    orden: integer('orden').notNull().default(0),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_zona_sucursal',
    }),
    unique('uq_zona').on(t.sucursalId, t.nombre),
    check('ck_zona_aforo', sql`aforo IS NULL OR aforo > 0`),
  ],
);

export const mesa = pgTable(
  'mesa',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    zonaId: uuid('zona_id').notNull(),
    numero: text('numero').notNull(),
    capacidad: smallint('capacidad').notNull(),
    estado: estadoMesaEnum('estado').notNull().default('libre'),
    posX: numeric('pos_x', { precision: 6, scale: 2 }),
    posY: numeric('pos_y', { precision: 6, scale: 2 }),
    activa: boolean('activa').notNull().default(true),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_mesa_sucursal',
    }),
    foreignKey({
      columns: [t.zonaId],
      foreignColumns: [zona.id],
      name: 'fk_mesa_zona',
    }),
    unique('uq_mesa').on(t.sucursalId, t.numero),
    check('ck_mesa_capacidad', sql`capacidad > 0`),
    index('ix_mesa_zona').on(t.zonaId, t.estado),
  ],
);

export const mesaAsignacion = pgTable(
  'mesa_asignacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    turnoId: uuid('turno_id').notNull(),
    zonaId: uuid('zona_id'),
    mesaId: uuid('mesa_id'),
    usuarioId: uuid('usuario_id').notNull(),
    desde: timestamp('desde', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    hasta: timestamp('hasta', { withTimezone: true, mode: 'string' }),
  },
  (t) => [
    foreignKey({
      columns: [t.turnoId],
      foreignColumns: [turno.id],
      name: 'fk_mesa_asignacion_turno',
    }),
    foreignKey({
      columns: [t.zonaId],
      foreignColumns: [zona.id],
      name: 'fk_mesa_asignacion_zona',
    }),
    foreignKey({
      columns: [t.mesaId],
      foreignColumns: [mesa.id],
      name: 'fk_mesa_asignacion_mesa',
    }),
    foreignKey({
      columns: [t.usuarioId],
      foreignColumns: [usuario.id],
      name: 'fk_mesa_asignacion_usuario',
    }),
    check(
      'ck_asignacion_alcance',
      sql`(zona_id IS NOT NULL) <> (mesa_id IS NOT NULL)`,
    ),
  ],
);

export const sesionMesa = pgTable(
  'sesion_mesa',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mesaId: uuid('mesa_id').notNull(),
    token: text('token').notNull(),
    abiertaEn: timestamp('abierta_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    cerradaEn: timestamp('cerrada_en', { withTimezone: true, mode: 'string' }),
  },
  (t) => [
    foreignKey({
      columns: [t.mesaId],
      foreignColumns: [mesa.id],
      name: 'fk_sesion_mesa_mesa',
    }),
    unique('uq_sesion_mesa_token').on(t.token),
    check(
      'ck_sesion_fechas',
      sql`cerrada_en IS NULL OR cerrada_en >= abierta_en`,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* 2.5 Reservas                                                        */
/* ------------------------------------------------------------------ */

export const politicaReserva = pgTable(
  'politica_reserva',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    antelacionMinHoras: integer('antelacion_min_horas').notNull().default(2),
    antelacionMaxDias: integer('antelacion_max_dias').notNull().default(30),
    duracionMin: integer('duracion_min').notNull().default(90),
    toleranciaMin: integer('tolerancia_min').notNull().default(15),
    cancelacionHoras: integer('cancelacion_horas').notNull().default(2),
    maximoPersonas: integer('maximo_personas').notNull().default(8),
    depositoRegla: depositoReglaEnum('deposito_regla').notNull().default('no'),
    depositoMontoCentavos: bigint('deposito_monto_centavos', { mode: 'number' }),
    noShowRegla: text('no_show_regla'),
    actualizadoEn: timestamp('actualizado_en', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_politica_reserva_sucursal',
    }),
    unique('uq_politica_reserva').on(t.sucursalId),
    check(
      'ck_politica_antelacion_min',
      sql`antelacion_min_horas >= 0`,
    ),
    check('ck_politica_antelacion_max', sql`antelacion_max_dias > 0`),
    check('ck_politica_duracion', sql`duracion_min > 0`),
    check('ck_politica_tolerancia', sql`tolerancia_min >= 0`),
    check('ck_politica_cancelacion', sql`cancelacion_horas >= 0`),
    check('ck_politica_maximo_personas', sql`maximo_personas > 0`),
    check(
      'ck_politica_deposito',
      sql`deposito_monto_centavos IS NULL OR deposito_monto_centavos > 0`,
    ),
    check(
      'ck_politica_rango',
      sql`antelacion_min_horas <= antelacion_max_dias * 24`,
    ),
  ],
);

export const reserva = pgTable(
  'reserva',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    clienteId: uuid('cliente_id'),
    nombreContacto: text('nombre_contacto').notNull(),
    telefonoContacto: text('telefono_contacto'),
    correoContacto: text('correo_contacto'),
    fechaHora: timestamp('fecha_hora', { withTimezone: true, mode: 'string' }).notNull(),
    duracionMin: integer('duracion_min').notNull(),
    // Rango [fecha_hora, fecha_hora + duracion_min): lo recalcula siempre el
    // trigger `tg_reserva_periodo`; el default solo evita exigirlo en INSERT.
    // La exclusión `ex_reserva_mesa_solape` opera sobre esta columna porque
    // `timestamptz + interval` es STABLE y no admite índices (D-BD-15).
    periodo: tstzrange('periodo')
      .notNull()
      .default(sql`tstzrange(now(), now())`),
    personas: smallint('personas').notNull(),
    zonaId: uuid('zona_id'),
    mesaId: uuid('mesa_id'),
    preferencia: text('preferencia'),
    estado: estadoReservaEnum('estado').notNull().default('solicitada'),
    codigo: text('codigo').notNull(),
    origen: origenReservaEnum('origen').notNull(),
    ocasion: text('ocasion'),
    notas: text('notas'),
    politicaSnapshot: jsonb('politica_snapshot'),
    depositoRequerido: boolean('deposito_requerido').notNull().default(false),
    depositoPagado: boolean('deposito_pagado').notNull().default(false),
    recordatorioEnviadoEn: timestamp('recordatorio_enviado_en', {
      withTimezone: true,
      mode: 'string',
    }),
    sentadaEn: timestamp('sentada_en', { withTimezone: true, mode: 'string' }),
    finalizadaEn: timestamp('finalizada_en', {
      withTimezone: true,
      mode: 'string',
    }),
    noShowEn: timestamp('no_show_en', { withTimezone: true, mode: 'string' }),
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
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_reserva_sucursal',
    }),
    foreignKey({
      columns: [t.clienteId],
      foreignColumns: [cliente.id],
      name: 'fk_reserva_cliente',
    }),
    foreignKey({
      columns: [t.zonaId],
      foreignColumns: [zona.id],
      name: 'fk_reserva_zona',
    }),
    foreignKey({
      columns: [t.mesaId],
      foreignColumns: [mesa.id],
      name: 'fk_reserva_mesa',
    }),
    unique('uq_reserva_codigo').on(t.codigo),
    check('ck_reserva_duracion', sql`duracion_min > 0`),
    check('ck_reserva_personas', sql`personas > 0`),
    index('ix_reserva_fecha').on(t.sucursalId, t.fechaHora, t.estado),
  ],
);

export const listaEspera = pgTable(
  'lista_espera',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    nombreContacto: text('nombre_contacto').notNull(),
    telefono: text('telefono'),
    personas: smallint('personas').notNull(),
    franjaDeseada: timestamp('franja_deseada', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    estado: estadoListaEsperaEnum('estado').notNull().default('esperando'),
    vigenciaHasta: timestamp('vigencia_hasta', {
      withTimezone: true,
      mode: 'string',
    }),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_lista_espera_sucursal',
    }),
    check('ck_lista_espera_personas', sql`personas > 0`),
    index('ix_lista_espera_estado').on(t.sucursalId, t.estado),
  ],
);
