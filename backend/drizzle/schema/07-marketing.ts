/**
 * Esquema — E7 «Notificaciones y marketing» (CRM ligero del restaurante).
 *
 * Materializa `docs/arquitectura/esquema/04-marketing-y-operacion.md` §4.1–4.2
 * (migración de referencia 0070–0071). No es el proyecto CRM externo: son las
 * tablas propias del restaurante que exigen los requerimientos
 * (RF-R1-40/42 suscripción y reseñas; RF-R5-102/103 newsletter, reseñas y
 * encuestas).
 */
import { desc, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { cliente, sucursal, tenant } from './01-nucleo';

/* ------------------------------------------------------------------ */
/* Dominios cerrados                                                   */
/* ------------------------------------------------------------------ */

export const canalNotificacionEnum = pgEnum('canal_notificacion_enum', [
  'correo',
  'whatsapp',
  'sms',
  'push',
]);

export const destinatarioNotificacionEnum = pgEnum(
  'destinatario_notificacion_enum',
  ['cliente', 'usuario', 'contacto'],
);

export const estadoNotificacionEnum = pgEnum('estado_notificacion_enum', [
  'pendiente',
  'enviada',
  'fallida',
  'cancelada',
]);

export const fuenteResenaEnum = pgEnum('fuente_resena_enum', [
  'web',
  'google',
  'tripadvisor',
  'otra',
]);

export const tipoEncuestaEnum = pgEnum('tipo_encuesta_enum', [
  'pedido',
  'reserva',
  'visita',
]);

/* ------------------------------------------------------------------ */
/* 4.1 Notificaciones                                                  */
/* ------------------------------------------------------------------ */

export const plantillaNotificacion = pgTable(
  'plantilla_notificacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    evento: text('evento').notNull(),
    canal: canalNotificacionEnum('canal').notNull(),
    idioma: text('idioma').notNull().default('es'),
    asunto: text('asunto'),
    cuerpo: text('cuerpo').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId],
      foreignColumns: [tenant.id],
      name: 'fk_plantilla_notificacion_tenant',
    }),
    unique('uq_plantilla').on(t.tenantId, t.evento, t.canal, t.idioma),
  ],
);

export const notificacion = pgTable(
  'notificacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    destinatarioTipo: destinatarioNotificacionEnum('destinatario_tipo').notNull(),
    destinatarioId: uuid('destinatario_id'),
    canal: canalNotificacionEnum('canal').notNull(),
    plantillaId: uuid('plantilla_id'),
    payload: jsonb('payload'),
    estado: estadoNotificacionEnum('estado').notNull().default('pendiente'),
    enviadoEn: timestamp('enviado_en', { withTimezone: true, mode: 'string' }),
    error: text('error'),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.plantillaId],
      foreignColumns: [plantillaNotificacion.id],
      name: 'fk_notificacion_plantilla',
    }),
    index('ix_notificacion_envio').on(t.estado, t.creadoEn),
  ],
);

export const configuracionNotificacion = pgTable(
  'configuracion_notificacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    evento: text('evento').notNull(),
    canal: canalNotificacionEnum('canal').notNull(),
    plantillaId: uuid('plantilla_id'),
    activo: boolean('activo').notNull().default(true),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId],
      foreignColumns: [tenant.id],
      name: 'fk_configuracion_notificacion_tenant',
    }),
    foreignKey({
      columns: [t.plantillaId],
      foreignColumns: [plantillaNotificacion.id],
      name: 'fk_configuracion_notificacion_plantilla',
    }),
    unique('uq_config_notificacion').on(t.tenantId, t.evento, t.canal),
  ],
);

/* ------------------------------------------------------------------ */
/* 4.2 Marketing (CRM ligero)                                          */
/* ------------------------------------------------------------------ */

export const suscriptor = pgTable(
  'suscriptor',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    correo: text('correo').notNull(),
    consentimientoEn: timestamp('consentimiento_en', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    origen: text('origen'),
    activo: boolean('activo').notNull().default(true),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId],
      foreignColumns: [tenant.id],
      name: 'fk_suscriptor_tenant',
    }),
    unique('uq_suscriptor').on(t.tenantId, t.correo),
  ],
);

export const resena = pgTable(
  'resena',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    clienteId: uuid('cliente_id'),
    puntaje: smallint('puntaje').notNull(),
    comentario: text('comentario'),
    fuente: fuenteResenaEnum('fuente').notNull(),
    fecha: date('fecha')
      .notNull()
      .default(sql`current_date`),
    publicada: boolean('publicada').notNull().default(false),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_resena_sucursal',
    }),
    foreignKey({
      columns: [t.clienteId],
      foreignColumns: [cliente.id],
      name: 'fk_resena_cliente',
    }),
    check('ck_resena_puntaje', sql`puntaje BETWEEN 1 AND 5`),
  ],
);

export const encuesta = pgTable(
  'encuesta',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tipo: tipoEncuestaEnum('tipo').notNull(),
    referenciaId: uuid('referencia_id'),
    clienteId: uuid('cliente_id'),
    puntaje: smallint('puntaje').notNull(),
    comentario: text('comentario'),
    canal: text('canal'),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.clienteId],
      foreignColumns: [cliente.id],
      name: 'fk_encuesta_cliente',
    }),
    // Una sola encuesta por pedido/reserva/visita; los nulos no chocan.
    unique('uq_encuesta').on(t.tipo, t.referenciaId),
    check('ck_encuesta_puntaje', sql`puntaje BETWEEN 0 AND 10`),
    index('ix_encuesta_tipo').on(t.tipo, desc(t.creadoEn)),
  ],
);

export const segmentoCliente = pgTable(
  'segmento_cliente',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    nombre: text('nombre').notNull(),
    criterio: jsonb('criterio').notNull(),
    actualizadoEn: timestamp('actualizado_en', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId],
      foreignColumns: [tenant.id],
      name: 'fk_segmento_cliente_tenant',
    }),
    unique('uq_segmento').on(t.tenantId, t.nombre),
  ],
);

export const eventoAnalitica = pgTable(
  'evento_analitica',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    tipo: text('tipo').notNull(),
    origenUtm: jsonb('origen_utm'),
    consentimiento: boolean('consentimiento').notNull().default(false),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId],
      foreignColumns: [tenant.id],
      name: 'fk_evento_analitica_tenant',
    }),
  ],
);
