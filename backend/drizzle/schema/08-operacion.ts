/**
 * Esquema — E8 «Operación, sincronización y trazabilidad».
 *
 * Materializa `docs/arquitectura/esquema/04-marketing-y-operacion.md` §4.3–4.5
 * (migración de referencia 0080–0083).
 *
 * SQL manual en la migración (D-BD-13):
 * - `evento_auditoria` se declara aquí como tabla normal y la migración la
 *   convierte en **particionada por mes** (`PARTITION BY RANGE (creado_en)`),
 *   con particiones iniciales, partición DEFAULT y la función
 *   `fn_crear_particion_auditoria` para el job de mantenimiento.
 * - La inmutabilidad se refuerza con el trigger
 *   `tg_evento_auditoria_inmutable` (bloquea `UPDATE`/`DELETE`).
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  inet,
  jsonb,
  numeric,
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
  dispositivo,
  impresora,
  rol,
  sucursal,
  tenant,
  usuario,
} from './01-nucleo';
import { comanda } from './04-pedidos';
import { factura } from './06-pagos';

/* ------------------------------------------------------------------ */
/* Dominios cerrados                                                   */
/* ------------------------------------------------------------------ */

export const estadoSyncEnum = pgEnum('estado_sync_enum', [
  'pendiente',
  'aplicada',
  'rechazada',
]);

export const entidadBitacoraEnum = pgEnum('entidad_bitacora_enum', [
  'reserva',
  'pedido',
  'comanda',
  'pago',
  'turno',
]);

export const actorBitacoraEnum = pgEnum('actor_bitacora_enum', [
  'cliente',
  'usuario',
  'sistema',
  'dispositivo',
]);

export const tipoAlertaEnum = pgEnum('tipo_alerta_enum', [
  'impresora',
  'dispositivo',
  'sync',
  'sla',
  'stock',
]);

export const severidadAlertaEnum = pgEnum('severidad_alerta_enum', [
  'baja',
  'media',
  'alta',
]);

export const estadoAlertaEnum = pgEnum('estado_alerta_enum', [
  'abierta',
  'atendida',
  'descartada',
]);

export const visibilidadReporteEnum = pgEnum('visibilidad_reporte_enum', [
  'privado',
  'equipo',
]);

export const periodicidadReporteEnum = pgEnum('periodicidad_reporte_enum', [
  'diario',
  'semanal',
  'mensual',
]);

export const formatoExportacionEnum = pgEnum('formato_exportacion_enum', [
  'csv',
  'xlsx',
  'pdf',
]);

export const estadoExportacionEnum = pgEnum('estado_exportacion_enum', [
  'pendiente',
  'procesando',
  'lista',
  'fallida',
]);

export const tipoImpresionEnum = pgEnum('tipo_impresion_enum', [
  'comanda',
  'precuenta',
  'recibo',
  'factura',
]);

export const estadoImpresionEnum = pgEnum('estado_impresion_enum', [
  'pendiente',
  'enviado',
  'impreso',
  'reintentando',
  'fallido',
]);

/* ------------------------------------------------------------------ */
/* 4.3 Sincronización offline                                          */
/* ------------------------------------------------------------------ */

export const syncOperacion = pgTable(
  'sync_operacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dispositivoId: uuid('dispositivo_id').notNull(),
    clientOpId: text('client_op_id').notNull(),
    tipo: text('tipo').notNull(),
    payload: jsonb('payload').notNull(),
    estado: estadoSyncEnum('estado').notNull().default('pendiente'),
    aplicadoEn: timestamp('aplicado_en', { withTimezone: true, mode: 'string' }),
    error: text('error'),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.dispositivoId],
      foreignColumns: [dispositivo.id],
      name: 'fk_sync_operacion_dispositivo',
    }),
    // Idempotencia del trabajo offline: un `client_op_id` se aplica una vez.
    unique('uq_sync_op').on(t.clientOpId),
    index('ix_sync_estado').on(t.estado),
  ],
);

/* ------------------------------------------------------------------ */
/* 4.4 Auditoría y bitácora                                            */
/* ------------------------------------------------------------------ */

// La migración añade `PARTITION BY RANGE (creado_en)` a esta tabla.
export const eventoAuditoria = pgTable(
  'evento_auditoria',
  {
    id: uuid('id').notNull().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    sucursalId: uuid('sucursal_id'),
    usuarioId: uuid('usuario_id'),
    dispositivoId: uuid('dispositivo_id'),
    entidad: text('entidad').notNull(),
    entidadId: uuid('entidad_id'),
    accion: text('accion').notNull(),
    motivo: text('motivo'),
    datosAntes: jsonb('datos_antes'),
    datosDespues: jsonb('datos_despues'),
    ip: inet('ip'),
    requestId: text('request_id'),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId],
      foreignColumns: [tenant.id],
      name: 'fk_evento_auditoria_tenant',
    }),
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_evento_auditoria_sucursal',
    }),
    foreignKey({
      columns: [t.usuarioId],
      foreignColumns: [usuario.id],
      name: 'fk_evento_auditoria_usuario',
    }),
    foreignKey({
      columns: [t.dispositivoId],
      foreignColumns: [dispositivo.id],
      name: 'fk_evento_auditoria_dispositivo',
    }),
    primaryKey({
      name: 'pk_evento_auditoria',
      columns: [t.id, t.creadoEn],
    }),
    index('ix_auditoria_entidad').on(t.entidad, t.entidadId, t.creadoEn),
    index('ix_auditoria_usuario').on(t.usuarioId, t.creadoEn),
  ],
);

export const bitacoraEvento = pgTable(
  'bitacora_evento',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entidadTipo: entidadBitacoraEnum('entidad_tipo').notNull(),
    entidadId: uuid('entidad_id').notNull(),
    evento: text('evento').notNull(),
    actorTipo: actorBitacoraEnum('actor_tipo').notNull(),
    actorId: uuid('actor_id'),
    canal: text('canal'),
    dispositivoId: uuid('dispositivo_id'),
    datos: jsonb('datos'),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.dispositivoId],
      foreignColumns: [dispositivo.id],
      name: 'fk_bitacora_evento_dispositivo',
    }),
    index('ix_bitacora_entidad').on(t.entidadTipo, t.entidadId, t.creadoEn),
  ],
);

/* ------------------------------------------------------------------ */
/* 4.5 Alertas y reportes                                              */
/* ------------------------------------------------------------------ */

export const alertaOperativa = pgTable(
  'alerta_operativa',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    tipo: tipoAlertaEnum('tipo').notNull(),
    severidad: severidadAlertaEnum('severidad').notNull(),
    entidad: text('entidad'),
    entidadId: uuid('entidad_id'),
    estado: estadoAlertaEnum('estado').notNull().default('abierta'),
    atendidaPor: uuid('atendida_por'),
    atendidaEn: timestamp('atendida_en', { withTimezone: true, mode: 'string' }),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_alerta_operativa_sucursal',
    }),
    foreignKey({
      columns: [t.atendidaPor],
      foreignColumns: [usuario.id],
      name: 'fk_alerta_operativa_atendida_por',
    }),
    index('ix_alerta_abierta')
      .on(t.sucursalId)
      .where(sql`estado = 'abierta'`),
  ],
);

export const umbralAlerta = pgTable(
  'umbral_alerta',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    tipo: text('tipo').notNull(),
    valor: numeric('valor').notNull(),
    rolDestinatario: uuid('rol_destinatario'),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId],
      foreignColumns: [tenant.id],
      name: 'fk_umbral_alerta_tenant',
    }),
    foreignKey({
      columns: [t.rolDestinatario],
      foreignColumns: [rol.id],
      name: 'fk_umbral_alerta_rol',
    }),
    unique('uq_umbral').on(t.tenantId, t.tipo),
  ],
);

export const reporteGuardado = pgTable(
  'reporte_guardado',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id').notNull(),
    nombre: text('nombre').notNull(),
    tipo: text('tipo').notNull(),
    filtros: jsonb('filtros').notNull(),
    visibilidad: visibilidadReporteEnum('visibilidad')
      .notNull()
      .default('privado'),
  },
  (t) => [
    foreignKey({
      columns: [t.usuarioId],
      foreignColumns: [usuario.id],
      name: 'fk_reporte_guardado_usuario',
    }),
    unique('uq_reporte_guardado').on(t.usuarioId, t.nombre),
  ],
);

export const reporteProgramado = pgTable(
  'reporte_programado',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    tipo: text('tipo').notNull(),
    filtros: jsonb('filtros').notNull(),
    periodicidad: periodicidadReporteEnum('periodicidad').notNull(),
    destinatarios: text('destinatarios').array().notNull(),
    activo: boolean('activo').notNull().default(true),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId],
      foreignColumns: [tenant.id],
      name: 'fk_reporte_programado_tenant',
    }),
  ],
);

export const exportacion = pgTable(
  'exportacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id').notNull(),
    tipo: text('tipo').notNull(),
    filtros: jsonb('filtros'),
    formato: formatoExportacionEnum('formato').notNull(),
    estado: estadoExportacionEnum('estado').notNull().default('pendiente'),
    url: text('url'),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.usuarioId],
      foreignColumns: [usuario.id],
      name: 'fk_exportacion_usuario',
    }),
  ],
);

export const trabajoImpresion = pgTable(
  'trabajo_impresion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    comandaId: uuid('comanda_id'),
    facturaId: uuid('factura_id'),
    impresoraId: uuid('impresora_id').notNull(),
    tipo: tipoImpresionEnum('tipo').notNull(),
    estado: estadoImpresionEnum('estado').notNull().default('pendiente'),
    intentos: smallint('intentos').notNull().default(0),
    ultimoError: text('ultimo_error'),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    impresoEn: timestamp('impreso_en', { withTimezone: true, mode: 'string' }),
  },
  (t) => [
    foreignKey({
      columns: [t.comandaId],
      foreignColumns: [comanda.id],
      name: 'fk_trabajo_impresion_comanda',
    }),
    foreignKey({
      columns: [t.facturaId],
      foreignColumns: [factura.id],
      name: 'fk_trabajo_impresion_factura',
    }),
    foreignKey({
      columns: [t.impresoraId],
      foreignColumns: [impresora.id],
      name: 'fk_trabajo_impresion_impresora',
    }),
    check(
      'ck_impresion_origen',
      sql`(comanda_id IS NOT NULL) <> (factura_id IS NOT NULL)`,
    ),
    check('ck_impresion_intentos', sql`intentos >= 0`),
    index('ix_impresion_cola').on(t.estado, t.creadoEn),
  ],
);
