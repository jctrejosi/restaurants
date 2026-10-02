/**
 * Suite de pruebas de base de datos (E10).
 *
 * Uso: yarn db:test
 *
 * Cubre: estructura (extensiones, tablas, dominios, vistas), restricciones
 * (exclusión de reservas, únicos, checks), triggers (sellos, auditoría
 * inmutable, cobertura de pago), idempotencia de sync y agregados.
 *
 * Todo corre dentro de una transacción con SAVEPOINTs y termina en ROLLBACK:
 * la base queda exactamente como estaba.
 */
import 'dotenv/config';
import { Client } from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL no está definida (backend/.env).');
  process.exit(1);
}

const id = (n: number) =>
  `'feed0000-0000-4000-8000-${String(n).padStart(12, '0')}'`;
const T = id(1); // tenant
const S = id(2); // sucursal
const MESA1 = id(10);
const USUARIO = id(13);
const ROL = id(14);
const DISPOSITIVO = id(16);
const MEDIO_PAGO = id(17);
const IMPRESORA = id(18);

let ok = 0;
const fallos: string[] = [];

async function test(nombre: string, sqlTexto: string, esperado: 'ok' | string) {
  await client.query('SAVEPOINT sp');
  try {
    await client.query(sqlTexto);
    if (esperado === 'ok') {
      ok++;
      console.log(`  ok    ${nombre}`);
    } else {
      fallos.push(`${nombre}: no falló (se esperaba "${esperado}")`);
      console.log(`  FALLO ${nombre}: no falló`);
    }
  } catch (error) {
    const mensaje = (error as Error).message;
    if (esperado !== 'ok' && mensaje.includes(esperado)) {
      ok++;
      console.log(`  ok    ${nombre}`);
    } else {
      fallos.push(`${nombre}: ${mensaje}`);
      console.log(`  FALLO ${nombre}: ${mensaje}`);
    }
  } finally {
    await client.query('ROLLBACK TO SAVEPOINT sp');
  }
}

const client = new Client({ connectionString: url });

/** [descripción, SQL, resultado esperado] */
const PRUEBAS: Array<[string, string, 'ok' | string]> = [
  // ------------------------------------------------------------ estructura
  [
    'extensiones requeridas instaladas (6)',
    `DO $$ BEGIN
       IF (SELECT count(*) FROM pg_extension WHERE extname IN
            ('postgis','citext','uuid-ossp','unaccent','pg_trgm','btree_gist')) <> 6 THEN
         RAISE EXCEPTION 'faltan extensiones requeridas';
       END IF;
     END $$;`,
    'ok',
  ],
  [
    '72 tablas base en public',
    `DO $$ BEGIN
       IF (SELECT count(*) FROM pg_tables WHERE schemaname = 'public'
             AND tablename NOT LIKE 'evento_auditoria_%'
             AND tablename NOT IN ('spatial_ref_sys','layer')) <> 72 THEN
         RAISE EXCEPTION 'el conteo de tablas base no es 72';
       END IF;
     END $$;`,
    'ok',
  ],
  [
    '5 particiones de auditoría creadas',
    `DO $$ BEGIN
       IF (SELECT count(*) FROM pg_tables WHERE schemaname = 'public'
             AND tablename LIKE 'evento_auditoria_%') <> 5 THEN
         RAISE EXCEPTION 'el conteo de particiones de auditoría no es 5';
       END IF;
     END $$;`,
    'ok',
  ],
  [
    '48 dominios pgEnum',
    `DO $$ BEGIN
       IF (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
             WHERE t.typtype = 'e' AND n.nspname = 'public') <> 48 THEN
         RAISE EXCEPTION 'el conteo de dominios no es 48';
       END IF;
     END $$;`,
    'ok',
  ],
  [
    '8 vistas materializadas en analytics',
    `DO $$ BEGIN
       IF (SELECT count(*) FROM pg_matviews WHERE schemaname = 'analytics') <> 8 THEN
         RAISE EXCEPTION 'el conteo de vistas materializadas no es 8';
       END IF;
     END $$;`,
    'ok',
  ],

  // ------------------------------------------------------ núcleo y personas
  [
    'usuario_rol duplicado rechazado (uq_usuario_rol)',
    `INSERT INTO usuario_rol (id, usuario_id, rol_id, sucursal_id) VALUES (${id(15)}, ${USUARIO}, ${ROL}, ${S});
     INSERT INTO usuario_rol (id, usuario_id, rol_id, sucursal_id) VALUES (${id(19)}, ${USUARIO}, ${ROL}, ${S});`,
    'uq_usuario_rol',
  ],
  [
    'trigger actualizado_en refresca el sello',
    `DO $$ DECLARE sello timestamptz; BEGIN
       UPDATE usuario SET nombre = 'Nombre A', actualizado_en = now() - interval '2 hours' WHERE id = ${USUARIO};
       SELECT actualizado_en INTO sello FROM usuario WHERE id = ${USUARIO};
       IF sello <= now() - interval '1 hour' THEN
         RAISE EXCEPTION 'el trigger no sobrescribió actualizado_en (quedó %)', sello;
       END IF;
     END $$;`,
    'ok',
  ],

  // -------------------------------------------------------- salón y reservas
  [
    'reserva solapada en la misma mesa rechazada (ex_reserva_mesa_solape)',
    `INSERT INTO reserva (id, sucursal_id, codigo, origen, nombre_contacto, fecha_hora, duracion_min, personas, mesa_id, estado)
       VALUES (${id(20)}, ${S}, 'RSV-A', 'web', 'Reserva A', now() + interval '2 hours', 90, 2, ${MESA1}, 'confirmada');
     INSERT INTO reserva (id, sucursal_id, codigo, origen, nombre_contacto, fecha_hora, duracion_min, personas, mesa_id, estado)
       VALUES (${id(21)}, ${S}, 'RSV-B', 'web', 'Reserva B', now() + interval '2 hours 30 minutes', 90, 2, ${MESA1}, 'confirmada');`,
    'ex_reserva_mesa_solape',
  ],
  [
    'reserva contigua en la misma mesa aceptada',
    `INSERT INTO reserva (id, sucursal_id, codigo, origen, nombre_contacto, fecha_hora, duracion_min, personas, mesa_id, estado)
       VALUES (${id(22)}, ${S}, 'RSV-C', 'web', 'Reserva C', now() + interval '4 hours', 60, 2, ${MESA1}, 'confirmada');
     INSERT INTO reserva (id, sucursal_id, codigo, origen, nombre_contacto, fecha_hora, duracion_min, personas, mesa_id, estado)
       VALUES (${id(23)}, ${S}, 'RSV-D', 'web', 'Reserva D', now() + interval '5 hours', 60, 2, ${MESA1}, 'confirmada');`,
    'ok',
  ],
  [
    'reserva cancelada no bloquea el horario',
    `INSERT INTO reserva (id, sucursal_id, codigo, origen, nombre_contacto, fecha_hora, duracion_min, personas, mesa_id, estado)
       VALUES (${id(24)}, ${S}, 'RSV-E', 'web', 'Reserva E', now() + interval '7 hours', 90, 2, ${MESA1}, 'cancelada');
     INSERT INTO reserva (id, sucursal_id, codigo, origen, nombre_contacto, fecha_hora, duracion_min, personas, mesa_id, estado)
       VALUES (${id(25)}, ${S}, 'RSV-F', 'web', 'Reserva F', now() + interval '7 hours 30 minutes', 90, 2, ${MESA1}, 'confirmada');`,
    'ok',
  ],
  [
    'periodo de reserva materializado por trigger',
    `DO $$ DECLARE esperado tstzrange; obtenido tstzrange; BEGIN
       INSERT INTO reserva (id, sucursal_id, codigo, origen, nombre_contacto, fecha_hora, duracion_min, personas, mesa_id, estado)
         VALUES (${id(26)}, ${S}, 'RSV-G', 'web', 'Reserva G', now() + interval '9 hours', 45, 3, ${MESA1}, 'confirmada');
       SELECT periodo,
              tstzrange(fecha_hora, fecha_hora + make_interval(mins => duracion_min))
         INTO obtenido, esperado
         FROM reserva WHERE id = ${id(26)};
       IF obtenido IS DISTINCT FROM esperado THEN
         RAISE EXCEPTION 'periodo % distinto de %', obtenido, esperado;
       END IF;
     END $$;`,
    'ok',
  ],

  // ------------------------------------------------------- pedidos y comandas
  [
    'notas de línea mayores a 105 caracteres rechazadas (ck_pedido_linea_notas)',
    `INSERT INTO pedido (id, sucursal_id, codigo, canal, modalidad, estado, hora_programada,
       subtotal_centavos, descuentos_centavos, impuestos_centavos, propina_centavos, recargos_centavos, total_centavos)
       VALUES (${id(31)}, ${S}, 'T-004', 'caja', 'recoger', 'enviado', now(), 10000, 0, 1600, 0, 0, 11600);
     INSERT INTO pedido_linea (id, pedido_id, producto_id, nombre_snapshot, precio_snapshot_centavos, cantidad, estado, notas)
       VALUES (${id(32)}, ${id(31)}, ${id(7)}, 'Producto', 10000, 1, 'pendiente', repeat('x', 106));`,
    'ck_pedido_linea_notas',
  ],
  [
    'comanda con número repetido rechazada (uq_comanda)',
    `INSERT INTO pedido (id, sucursal_id, codigo, canal, modalidad, estado, hora_programada,
       subtotal_centavos, descuentos_centavos, impuestos_centavos, propina_centavos, recargos_centavos, total_centavos)
       VALUES (${id(31)}, ${S}, 'T-004', 'caja', 'recoger', 'enviado', now(), 10000, 0, 1600, 0, 0, 11600);
     INSERT INTO comanda (id, pedido_id, sucursal_id, estacion_id, numero, estado, enviada_en)
       VALUES (${id(33)}, ${id(31)}, ${S}, ${id(5)}, 940001, 'pendiente', now());
     INSERT INTO comanda (id, pedido_id, sucursal_id, estacion_id, numero, estado, enviada_en)
       VALUES (${id(34)}, ${id(31)}, ${S}, ${id(5)}, 940001, 'pendiente', now());`,
    'uq_comanda',
  ],

  // --------------------------------------------------------------- domicilio
  [
    'segunda asignación activa de domicilio rechazada (uq_domicilio_activo)',
    `INSERT INTO pedido (id, sucursal_id, codigo, canal, modalidad, estado, hora_programada,
       subtotal_centavos, descuentos_centavos, impuestos_centavos, propina_centavos, recargos_centavos, total_centavos)
       VALUES (${id(35)}, ${S}, 'T-005', 'web', 'domicilio', 'enviado', now(), 10000, 0, 1600, 0, 0, 11600);
     INSERT INTO domicilio_asignacion (id, pedido_id, repartidor_id, asignado_en, estado)
       VALUES (${id(36)}, ${id(35)}, ${id(9)}, now(), 'asignado');
     INSERT INTO domicilio_asignacion (id, pedido_id, repartidor_id, asignado_en, estado)
       VALUES (${id(37)}, ${id(35)}, ${id(9)}, now(), 'asignado');`,
    'uq_domicilio_activo',
  ],

  // ------------------------------------------------------------ dinero
  [
    'pago aprobado que excede el total rechazado (fn_pago_limite_pedido)',
    `INSERT INTO pedido (id, sucursal_id, codigo, canal, modalidad, estado, hora_programada,
       subtotal_centavos, descuentos_centavos, impuestos_centavos, propina_centavos, recargos_centavos, total_centavos)
       VALUES (${id(38)}, ${S}, 'T-006', 'caja', 'recoger', 'enviado', now(), 10000, 0, 2100, 0, 0, 12100);
     INSERT INTO pago (id, pedido_id, medio_pago_id, monto_centavos, propina_centavos, estado, aprobado_en)
       VALUES (${id(39)}, ${id(38)}, ${MEDIO_PAGO}, 20000, 0, 'aprobado', now());`,
    'pagos aprobados superan el total del pedido',
  ],
  [
    'marcar pedido como pagado sin cobertura rechazado (fn_pedido_pagado_cubierto)',
    `INSERT INTO pedido (id, sucursal_id, codigo, canal, modalidad, estado, hora_programada,
       subtotal_centavos, descuentos_centavos, impuestos_centavos, propina_centavos, recargos_centavos, total_centavos)
       VALUES (${id(40)}, ${S}, 'T-007', 'caja', 'recoger', 'enviado', now(), 10000, 0, 2100, 0, 0, 12100);
     UPDATE pedido SET estado = 'pagado', pagado_en = now() WHERE id = ${id(40)};`,
    'no se puede marcar pagado',
  ],
  [
    'marcar pedido como pagado con cobertura aceptado',
    `INSERT INTO pedido (id, sucursal_id, codigo, canal, modalidad, estado, hora_programada,
       subtotal_centavos, descuentos_centavos, impuestos_centavos, propina_centavos, recargos_centavos, total_centavos)
       VALUES (${id(41)}, ${S}, 'T-008', 'caja', 'recoger', 'enviado', now(), 10000, 0, 2100, 0, 0, 12100);
     INSERT INTO pago (id, pedido_id, medio_pago_id, monto_centavos, propina_centavos, estado, aprobado_en)
       VALUES (${id(42)}, ${id(41)}, ${MEDIO_PAGO}, 12100, 0, 'aprobado', now());
     UPDATE pedido SET estado = 'pagado', pagado_en = now() WHERE id = ${id(41)};`,
    'ok',
  ],

  // ------------------------------------------------------------ marketing
  [
    'plantilla de notificación duplicada rechazada (uq_plantilla)',
    `INSERT INTO plantilla_notificacion (id, tenant_id, evento, canal, idioma, cuerpo)
       VALUES (${id(43)}, ${T}, 'prueba.evento', 'correo', 'es', 'Cuerpo uno');
     INSERT INTO plantilla_notificacion (id, tenant_id, evento, canal, idioma, cuerpo)
       VALUES (${id(44)}, ${T}, 'prueba.evento', 'correo', 'es', 'Cuerpo dos');`,
    'uq_plantilla',
  ],
  [
    'reseña con puntaje 6 rechazada (ck_resena_puntaje)',
    `INSERT INTO resena (id, sucursal_id, puntaje, fuente, fecha) VALUES (${id(45)}, ${S}, 6, 'web', current_date);`,
    'ck_resena_puntaje',
  ],
  [
    'encuesta duplicada por referencia rechazada (uq_encuesta)',
    `INSERT INTO encuesta (id, tipo, referencia_id, puntaje) VALUES (${id(46)}, 'pedido', ${id(31)}, 9);
     INSERT INTO encuesta (id, tipo, referencia_id, puntaje) VALUES (${id(47)}, 'pedido', ${id(31)}, 8);`,
    'uq_encuesta',
  ],

  // -------------------------------------------------- operación y trazabilidad
  [
    'operación offline duplicada rechazada (uq_sync_op)',
    `INSERT INTO sync_operacion (id, dispositivo_id, client_op_id, tipo, payload, estado)
       VALUES (${id(48)}, ${DISPOSITIVO}, 'op-test-1', 'pedido.sync', '{}'::jsonb, 'pendiente');
     INSERT INTO sync_operacion (id, dispositivo_id, client_op_id, tipo, payload, estado)
       VALUES (${id(49)}, ${DISPOSITIVO}, 'op-test-1', 'pedido.sync', '{}'::jsonb, 'pendiente');`,
    'uq_sync_op',
  ],
  [
    'auditoría no admite UPDATE (trigger inmutable)',
    `INSERT INTO evento_auditoria (id, tenant_id, entidad, accion)
       VALUES (${id(50)}, ${T}, 'pedido', 'creado');
     UPDATE evento_auditoria SET accion = 'alterado' WHERE id = ${id(50)};`,
    'evento_auditoria es inmutable',
  ],
  [
    'auditoría no admite DELETE (trigger inmutable)',
    `INSERT INTO evento_auditoria (id, tenant_id, entidad, accion)
       VALUES (${id(51)}, ${T}, 'pedido', 'creado');
     DELETE FROM evento_auditoria WHERE id = ${id(51)};`,
    'evento_auditoria es inmutable',
  ],
  [
    'fila de auditoría enrutada a la partición del mes',
    `DO $$ DECLARE destino text; esperada text; BEGIN
       INSERT INTO evento_auditoria (id, tenant_id, entidad, accion)
         VALUES (${id(52)}, ${T}, 'pedido', 'creado');
       SELECT tableoid::regclass::text INTO destino FROM evento_auditoria WHERE id = ${id(52)};
       esperada := 'evento_auditoria_' || to_char(now(), 'YYYY_MM');
       IF destino <> esperada THEN
         RAISE EXCEPTION 'la fila fue a % en lugar de %', destino, esperada;
       END IF;
     END $$;`,
    'ok',
  ],
  [
    'fn_crear_particion_auditoria es idempotente',
    `SELECT public.fn_crear_particion_auditoria('2027-03-01'::date);
     SELECT public.fn_crear_particion_auditoria('2027-03-01'::date);`,
    'ok',
  ],
  [
    'trabajo de impresión exige comanda o factura (ck_impresion_origen)',
    `INSERT INTO trabajo_impresion (id, impresora_id, tipo, estado)
       VALUES (${id(53)}, ${IMPRESORA}, 'comanda', 'pendiente');`,
    'ck_impresion_origen',
  ],

  // ------------------------------------------------------------- analytics
  ['refresco de agregados sin error', `SELECT analytics.fn_refrescar_analytics();`, 'ok'],
  [
    'mv_ventas_diarias refleja un pedido pagado',
    `DO $$ DECLARE filas int; BEGIN
       INSERT INTO pedido (id, sucursal_id, codigo, canal, modalidad, estado, hora_programada, pagado_en,
         subtotal_centavos, descuentos_centavos, impuestos_centavos, propina_centavos, recargos_centavos, total_centavos)
         VALUES (${id(54)}, ${S}, 'T-010', 'web', 'recoger', 'pagado', now(), now(), 10000, 0, 1600, 0, 0, 11600);
       INSERT INTO pago (id, pedido_id, medio_pago_id, monto_centavos, propina_centavos, estado, aprobado_en)
         VALUES (${id(55)}, ${id(54)}, ${MEDIO_PAGO}, 11600, 0, 'aprobado', now());
       PERFORM analytics.fn_refrescar_analytics();
       SELECT count(*) INTO filas FROM analytics.mv_ventas_diarias
         WHERE sucursal_id = ${S}
           AND fecha = (now() AT TIME ZONE 'America/Mexico_City')::date;
       IF filas < 1 THEN
         RAISE EXCEPTION 'el pedido pagado no aparece en mv_ventas_diarias';
       END IF;
     END $$;`,
    'ok',
  ],
];

async function main() {
  await client.connect();
  try {
    await client.query('BEGIN');

    console.log('Preparando datos de prueba…');
    await client.query(`
      INSERT INTO tenant (id, nombre) VALUES (${T}, 'Tenant de pruebas');
      INSERT INTO sucursal (id, tenant_id, nombre, codigo, zona_horaria, moneda)
        VALUES (${S}, ${T}, 'Sucursal de pruebas', 'SUC-T', 'America/Mexico_City', 'MXN');
      INSERT INTO zona (id, sucursal_id, nombre, orden) VALUES (${id(3)}, ${S}, 'Zona de pruebas', 1);
      INSERT INTO mesa (id, sucursal_id, zona_id, numero, capacidad) VALUES (${MESA1}, ${S}, ${id(3)}, 'M1', 4);
      INSERT INTO impuesto (id, tenant_id, nombre, tasa_bps, tipo) VALUES (${id(4)}, ${T}, 'IVA pruebas', 1600, 'adicionado');
      INSERT INTO estacion (id, sucursal_id, nombre, tipo) VALUES (${id(5)}, ${S}, 'Cocina pruebas', 'preparacion');
      INSERT INTO categoria (id, tenant_id, nombre, orden) VALUES (${id(6)}, ${T}, 'Categoría pruebas', 1);
      INSERT INTO producto (id, categoria_id, nombre, impuesto_id, estacion_id)
        VALUES (${id(7)}, ${id(6)}, 'Producto pruebas', ${id(4)}, ${id(5)});
      INSERT INTO cliente (id, tenant_id, nombre) VALUES (${id(8)}, ${T}, 'Cliente pruebas');
      INSERT INTO repartidor (id, sucursal_id, nombre) VALUES (${id(9)}, ${S}, 'Repartidor pruebas');
      INSERT INTO usuario (id, tenant_id, nombre, email) VALUES (${USUARIO}, ${T}, 'Usuario pruebas', 'pruebas@test.rest');
      INSERT INTO rol (id, tenant_id, nombre) VALUES (${ROL}, ${T}, 'Rol pruebas');
      INSERT INTO dispositivo (id, sucursal_id, tipo, token) VALUES (${DISPOSITIVO}, ${S}, 'kds', 'test-kds-0001');
      INSERT INTO medio_pago (id, sucursal_id, nombre, tipo) VALUES (${MEDIO_PAGO}, ${S}, 'Efectivo pruebas', 'efectivo');
      INSERT INTO impresora (id, sucursal_id, nombre, tipo_conexion) VALUES (${IMPRESORA}, ${S}, 'Impresora pruebas', 'red');
    `);

    console.log('Ejecutando pruebas…');
    for (const [nombre, sqlTexto, esperado] of PRUEBAS) {
      await test(nombre, sqlTexto, esperado);
    }

    await client.query('ROLLBACK');
    console.log('ROLLBACK: la base queda sin cambios.');
    console.log(`\nResultado: ${ok} pruebas ok, ${fallos.length} fallos.`);
    if (fallos.length > 0) {
      console.log('Fallos:');
      for (const fallo of fallos) console.log(`  - ${fallo}`);
      process.exitCode = 1;
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('La suite abortó:', (error as Error).message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

void main();
