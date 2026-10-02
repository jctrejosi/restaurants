/**
 * Esquema — E1 «Fundamentos»: organización, acceso, personas y cocina.
 *
 * Materializa `docs/arquitectura/esquema/01-nucleo.md` (migración de
 * referencia 0010–0012). Convenciones y decisiones: D-BD-02…05 y D-BD-13 en
 * `docs/arquitectura/05-stack-tecnologico.md` y `docs/arquitectura/plans/`.
 *
 * - PK `uuid` con `gen_random_uuid()`; la aplicación puede generar UUIDv7 (D-BD-05).
 * - Dominios cerrados como `pgEnum` (D-BD-04); catálogos configurables, tablas.
 * - Sellos `creado_en` / `actualizado_en` en UTC; `actualizado_en` lo mantiene
 *   el trigger `fn_set_actualizado_en` creado en la migración (D-BD-13).
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  char,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

/* ------------------------------------------------------------------ */
/* Dominios cerrados                                                   */
/* ------------------------------------------------------------------ */

export const franjaServicioEnum = pgEnum('franja_servicio_enum', [
  'desayuno',
  'comida',
  'cena',
]);

export const comportamientoOfflineEnum = pgEnum('comportamiento_offline_enum', [
  'completo',
  'solo_lectura',
]);

export const tipoImpuestoEnum = pgEnum('tipo_impuesto_enum', [
  'incluido',
  'adicionado',
  'inc',
]);

export const tipoConsecutivoEnum = pgEnum('tipo_consecutivo_enum', [
  'pedido',
  'comanda',
  'factura',
]);

export const tipoMedioPagoEnum = pgEnum('tipo_medio_pago_enum', [
  'efectivo',
  'tarjeta',
  'transferencia',
  'pasarela',
  'otro',
]);

export const tipoEstacionEnum = pgEnum('tipo_estacion_enum', [
  'preparacion',
  'despacho',
]);

export const tipoConexionImpresoraEnum = pgEnum('tipo_conexion_impresora_enum', [
  'red',
  'usb',
  'bluetooth',
]);

export const tipoDispositivoEnum = pgEnum('tipo_dispositivo_enum', [
  'apk',
  'kds',
  'caja',
]);

export const estadoDispositivoEnum = pgEnum('estado_dispositivo_enum', [
  'vinculado',
  'revocado',
]);

export const estadoTurnoEnum = pgEnum('estado_turno_enum', ['abierto', 'cerrado']);

export const tipoConsentimientoEnum = pgEnum('tipo_consentimiento_enum', [
  'datos',
  'marketing',
  'cookies',
]);

export const estadoRepartidorEnum = pgEnum('estado_repartidor_enum', [
  'activo',
  'inactivo',
  'ocupado',
]);

export const estadoSolicitudEventoEnum = pgEnum('estado_solicitud_evento_enum', [
  'nueva',
  'en_revision',
  'contactada',
  'cerrada',
]);

/* ------------------------------------------------------------------ */
/* 1.1 Organización y configuración                                    */
/* ------------------------------------------------------------------ */

export const tenant = pgTable('tenant', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull(),
  activo: boolean('activo').notNull().default(true),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
});

export const sucursal = pgTable(
  'sucursal',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    nombre: text('nombre').notNull(),
    codigo: text('codigo').notNull(),
    direccion: text('direccion'),
    ciudad: text('ciudad'),
    telefono: text('telefono'),
    coordenadas: jsonb('coordenadas').$type<{ lat: number; lng: number }>(),
    zonaHoraria: text('zona_horaria').notNull().default('America/Bogota'),
    moneda: char('moneda', { length: 3 }).notNull().default('COP'),
    activa: boolean('activa').notNull().default(true),
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
      columns: [t.tenantId],
      foreignColumns: [tenant.id],
      name: 'fk_sucursal_tenant',
    }),
    unique('uq_sucursal_codigo').on(t.tenantId, t.codigo),
  ],
);

export const configuracionSucursal = pgTable(
  'configuracion_sucursal',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    propinaSugeridaPct: numeric('propina_sugerida_pct', {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default('0'),
    copiasComanda: smallint('copias_comanda').notNull().default(1),
    copiasFactura: smallint('copias_factura').notNull().default(1),
    borradoComandaImpresa: boolean('borrado_comanda_impresa')
      .notNull()
      .default(false),
    comportamientoOffline: comportamientoOfflineEnum('comportamiento_offline')
      .notNull()
      .default('completo'),
    ventanaProgramacionMin: integer('ventana_programacion_min')
      .notNull()
      .default(1440),
    limitePedidosFranja: integer('limite_pedidos_franja'),
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
      name: 'fk_configuracion_sucursal_sucursal',
    }),
    unique('uq_configuracion_sucursal').on(t.sucursalId),
    check(
      'ck_configuracion_propina',
      sql`propina_sugerida_pct BETWEEN 0 AND 100`,
    ),
    check('ck_configuracion_copias_comanda', sql`copias_comanda BETWEEN 1 AND 5`),
    check('ck_configuracion_copias_factura', sql`copias_factura BETWEEN 1 AND 5`),
    check('ck_configuracion_ventana', sql`ventana_programacion_min > 0`),
    check(
      'ck_configuracion_limite',
      sql`limite_pedidos_franja IS NULL OR limite_pedidos_franja > 0`,
    ),
  ],
);

export const horarioAtencion = pgTable(
  'horario_atencion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    diaSemana: smallint('dia_semana').notNull(),
    franja: franjaServicioEnum('franja').notNull(),
    horaApertura: time('hora_apertura').notNull(),
    horaCierre: time('hora_cierre').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_horario_atencion_sucursal',
    }),
    check('ck_horario_dia_semana', sql`dia_semana BETWEEN 0 AND 6`),
    check('ck_horario_rango', sql`hora_apertura < hora_cierre`),
    index('ix_horario_sucursal').on(t.sucursalId, t.diaSemana),
  ],
);

export const cierreTemporal = pgTable(
  'cierre_temporal',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    desde: timestamp('desde', { withTimezone: true, mode: 'string' }).notNull(),
    hasta: timestamp('hasta', { withTimezone: true, mode: 'string' }).notNull(),
    motivo: text('motivo'),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_cierre_temporal_sucursal',
    }),
    check('ck_cierre_rango', sql`desde < hasta`),
  ],
);

export const impuesto = pgTable(
  'impuesto',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    nombre: text('nombre').notNull(),
    tasaBps: integer('tasa_bps').notNull(),
    tipo: tipoImpuestoEnum('tipo').notNull(),
    activo: boolean('activo').notNull().default(true),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId],
      foreignColumns: [tenant.id],
      name: 'fk_impuesto_tenant',
    }),
    check('ck_impuesto_tasa', sql`tasa_bps BETWEEN 0 AND 100000`),
  ],
);

export const consecutivo = pgTable(
  'consecutivo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    tipo: tipoConsecutivoEnum('tipo').notNull(),
    prefijo: text('prefijo').notNull().default(''),
    siguiente: bigint('siguiente', { mode: 'number' }).notNull().default(1),
    resolucion: text('resolucion'),
    vigenciaHasta: date('vigencia_hasta'),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_consecutivo_sucursal',
    }),
    unique('uq_consecutivo').on(t.sucursalId, t.tipo, t.prefijo),
    check('ck_consecutivo_siguiente', sql`siguiente > 0`),
  ],
);

export const medioPago = pgTable(
  'medio_pago',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    nombre: text('nombre').notNull(),
    tipo: tipoMedioPagoEnum('tipo').notNull(),
    requiereReferencia: boolean('requiere_referencia').notNull().default(false),
    activo: boolean('activo').notNull().default(true),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_medio_pago_sucursal',
    }),
    unique('uq_medio_pago').on(t.sucursalId, t.nombre),
  ],
);

export const reglaCapacidad = pgTable(
  'regla_capacidad',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    franja: text('franja').notNull(),
    maximoPedidos: integer('maximo_pedidos').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_regla_capacidad_sucursal',
    }),
    unique('uq_regla_capacidad').on(t.sucursalId, t.franja),
    check('ck_regla_capacidad_maximo', sql`maximo_pedidos > 0`),
  ],
);

/* ------------------------------------------------------------------ */
/* 1.2 Cocina: estaciones e impresoras                                 */
/* ------------------------------------------------------------------ */

export const estacion = pgTable(
  'estacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    nombre: text('nombre').notNull(),
    tipo: tipoEstacionEnum('tipo').notNull().default('preparacion'),
    activa: boolean('activa').notNull().default(true),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_estacion_sucursal',
    }),
    unique('uq_estacion').on(t.sucursalId, t.nombre),
  ],
);

export const impresora = pgTable(
  'impresora',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    nombre: text('nombre').notNull(),
    tipoConexion: tipoConexionImpresoraEnum('tipo_conexion').notNull(),
    direccion: text('direccion'),
    perfil: text('perfil'),
    activa: boolean('activa').notNull().default(true),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_impresora_sucursal',
    }),
    unique('uq_impresora').on(t.sucursalId, t.nombre),
  ],
);

/* ------------------------------------------------------------------ */
/* 1.3 Usuarios, roles y dispositivos                                  */
/* ------------------------------------------------------------------ */

export const usuario = pgTable(
  'usuario',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    nombre: text('nombre').notNull(),
    email: text('email'),
    pinHash: text('pin_hash'),
    pinSalt: text('pin_salt'),
    activo: boolean('activo').notNull().default(true),
    ultimoAccesoEn: timestamp('ultimo_acceso_en', {
      withTimezone: true,
      mode: 'string',
    }),
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
      columns: [t.tenantId],
      foreignColumns: [tenant.id],
      name: 'fk_usuario_tenant',
    }),
    unique('uq_usuario_email').on(t.tenantId, t.email),
    index('ix_usuario_activo')
      .on(t.tenantId)
      .where(sql`activo`),
  ],
);

export const rol = pgTable(
  'rol',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    nombre: text('nombre').notNull(),
    esSistema: boolean('es_sistema').notNull().default(false),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId],
      foreignColumns: [tenant.id],
      name: 'fk_rol_tenant',
    }),
    unique('uq_rol').on(t.tenantId, t.nombre),
  ],
);

export const permiso = pgTable('permiso', {
  codigo: text('codigo').primaryKey(),
  descripcion: text('descripcion').notNull(),
});

export const rolPermiso = pgTable(
  'rol_permiso',
  {
    rolId: uuid('rol_id').notNull(),
    permisoCodigo: text('permiso_codigo').notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.rolId],
      foreignColumns: [rol.id],
      name: 'fk_rol_permiso_rol',
    }),
    foreignKey({
      columns: [t.permisoCodigo],
      foreignColumns: [permiso.codigo],
      name: 'fk_rol_permiso_permiso',
    }),
    primaryKey({
      name: 'pk_rol_permiso',
      columns: [t.rolId, t.permisoCodigo],
    }),
  ],
);

export const usuarioRol = pgTable(
  'usuario_rol',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id').notNull(),
    rolId: uuid('rol_id').notNull(),
    sucursalId: uuid('sucursal_id'),
  },
  (t) => [
    foreignKey({
      columns: [t.usuarioId],
      foreignColumns: [usuario.id],
      name: 'fk_usuario_rol_usuario',
    }),
    foreignKey({
      columns: [t.rolId],
      foreignColumns: [rol.id],
      name: 'fk_usuario_rol_rol',
    }),
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_usuario_rol_sucursal',
    }),
    // `sucursal_id` nulo = todas las sucursales (esquema 01, nota).
    unique('uq_usuario_rol')
      .on(t.usuarioId, t.rolId, t.sucursalId)
      .nullsNotDistinct(),
  ],
);

export const dispositivo = pgTable(
  'dispositivo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id'),
    sucursalId: uuid('sucursal_id').notNull(),
    tipo: tipoDispositivoEnum('tipo').notNull(),
    token: text('token').notNull(),
    estacionId: uuid('estacion_id'),
    versionApp: text('version_app'),
    ultimaConexionEn: timestamp('ultima_conexion_en', {
      withTimezone: true,
      mode: 'string',
    }),
    estado: estadoDispositivoEnum('estado').notNull().default('vinculado'),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.usuarioId],
      foreignColumns: [usuario.id],
      name: 'fk_dispositivo_usuario',
    }),
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_dispositivo_sucursal',
    }),
    foreignKey({
      columns: [t.estacionId],
      foreignColumns: [estacion.id],
      name: 'fk_dispositivo_estacion',
    }),
    unique('uq_dispositivo_token').on(t.token),
    index('ix_dispositivo_sucursal').on(t.sucursalId, t.tipo),
  ],
);

export const turno = pgTable(
  'turno',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    numero: integer('numero').notNull(),
    estado: estadoTurnoEnum('estado').notNull().default('abierto'),
    abiertoEn: timestamp('abierto_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    cerradoEn: timestamp('cerrado_en', { withTimezone: true, mode: 'string' }),
    usuarioAperturaId: uuid('usuario_apertura_id'),
    usuarioCierreId: uuid('usuario_cierre_id'),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_turno_sucursal',
    }),
    foreignKey({
      columns: [t.usuarioAperturaId],
      foreignColumns: [usuario.id],
      name: 'fk_turno_usuario_apertura',
    }),
    foreignKey({
      columns: [t.usuarioCierreId],
      foreignColumns: [usuario.id],
      name: 'fk_turno_usuario_cierre',
    }),
    unique('uq_turno').on(t.sucursalId, t.numero),
    index('ix_turno_abierto')
      .on(t.sucursalId)
      .where(sql`estado = 'abierto'`),
  ],
);

/* ------------------------------------------------------------------ */
/* 1.4 Clientes, consentimiento y reparto                              */
/* ------------------------------------------------------------------ */

export const cliente = pgTable(
  'cliente',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    nombre: text('nombre').notNull(),
    telefono: text('telefono'),
    correo: text('correo'),
    fechaNacimiento: date('fecha_nacimiento'),
    preferencias: jsonb('preferencias'),
    notas: text('notas'),
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
      columns: [t.tenantId],
      foreignColumns: [tenant.id],
      name: 'fk_cliente_tenant',
    }),
    index('ix_cliente_telefono').on(t.tenantId, t.telefono),
  ],
);

export const consentimiento = pgTable(
  'consentimiento',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clienteId: uuid('cliente_id').notNull(),
    tipo: tipoConsentimientoEnum('tipo').notNull(),
    canal: text('canal').notNull(),
    baseLegal: text('base_legal'),
    otorgadoEn: timestamp('otorgado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
    revocadoEn: timestamp('revocado_en', { withTimezone: true, mode: 'string' }),
  },
  (t) => [
    foreignKey({
      columns: [t.clienteId],
      foreignColumns: [cliente.id],
      name: 'fk_consentimiento_cliente',
    }),
    check(
      'ck_consentimiento_fechas',
      sql`revocado_en IS NULL OR revocado_en >= otorgado_en`,
    ),
  ],
);

export const repartidor = pgTable(
  'repartidor',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    nombre: text('nombre').notNull(),
    telefono: text('telefono'),
    vehiculo: text('vehiculo'),
    estado: estadoRepartidorEnum('estado').notNull().default('activo'),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_repartidor_sucursal',
    }),
  ],
);

export const solicitudEvento = pgTable(
  'solicitud_evento',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sucursalId: uuid('sucursal_id').notNull(),
    nombreContacto: text('nombre_contacto').notNull(),
    telefono: text('telefono'),
    correo: text('correo'),
    tipo: text('tipo').notNull(),
    fechaTentativa: date('fecha_tentativa'),
    personas: integer('personas'),
    mensaje: text('mensaje'),
    estado: estadoSolicitudEventoEnum('estado').notNull().default('nueva'),
    creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.sucursalId],
      foreignColumns: [sucursal.id],
      name: 'fk_solicitud_evento_sucursal',
    }),
    check('ck_solicitud_personas', sql`personas IS NULL OR personas > 0`),
  ],
);
