/**
 * Prueba de carga de las consultas críticas (E10).
 *
 * Uso: yarn db:bench
 *
 * Genera datos sintéticos (600 pedidos pagados de 30 días, 200 comandas
 * activas, 150 reservas, 20 mesas) dentro de una transacción, mide con
 * EXPLAIN ANALYZE las consultas del KDS, pedidos activos, comandas por
 * estación, cierre de caja, reservas y reportes, y termina en ROLLBACK:
 * la base queda sin cambios.
 *
 * Los tiempos son de referencia local (contenedor en la misma máquina);
 * sirven para detectar regresiones de plan/índice, no como SLA de producción.
 */
import 'dotenv/config';
import { Client } from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL no está definida (backend/.env).');
  process.exit(1);
}

const id = (n: number) =>
  `'beef0000-0000-4000-8000-${String(n).padStart(12, '0')}'`;
const T = id(1);
const S = id(2);
const ZONA = id(3);
const EST1 = id(4);
const EST2 = id(5);
const IMPUESTO = id(6);
const CATEGORIA = id(7);
const MEDIO1 = id(8);
const MEDIO2 = id(9);
const MEDIO3 = id(10);

const client = new Client({ connectionString: url });

async function medir(nombre: string, consulta: string) {
  const { rows } = await client.query(
    `EXPLAIN (ANALYZE, TIMING OFF, SUMMARY ON) ${consulta}`,
  );
  const texto = rows.map((r: { 'QUERY PLAN': string }) => r['QUERY PLAN']).join('\n');
  const coincidencia = texto.match(/Execution Time: ([\d.]+) ms/);
  const ms = coincidencia ? coincidencia[1] : '?';
  console.log(`  ${nombre.padEnd(46)} ${ms} ms`);
  return Number(ms);
}

async function main() {
  await client.connect();
  try {
    await client.query('BEGIN');
    console.log('Generando datos sintéticos…');

    await client.query(`
      INSERT INTO tenant (id, nombre) VALUES (${T}, 'Tenant benchmark');
      INSERT INTO sucursal (id, tenant_id, nombre, codigo, zona_horaria, moneda)
        VALUES (${S}, ${T}, 'Sucursal benchmark', 'SUC-B', 'America/Mexico_City', 'MXN');
      INSERT INTO zona (id, sucursal_id, nombre, orden) VALUES (${ZONA}, ${S}, 'Salón benchmark', 1);
      INSERT INTO impuesto (id, tenant_id, nombre, tasa_bps, tipo)
        VALUES (${IMPUESTO}, ${T}, 'IVA benchmark', 1600, 'adicionado');
      INSERT INTO estacion (id, sucursal_id, nombre, tipo) VALUES
        (${EST1}, ${S}, 'Cocina benchmark', 'preparacion'),
        (${EST2}, ${S}, 'Barra benchmark', 'preparacion');
      INSERT INTO categoria (id, tenant_id, nombre, orden) VALUES (${CATEGORIA}, ${T}, 'Carta benchmark', 1);
      INSERT INTO producto (id, categoria_id, nombre, impuesto_id, estacion_id)
        SELECT gen_random_uuid(), ${CATEGORIA}, 'Producto ' || g, ${IMPUESTO},
               CASE WHEN g % 2 = 0 THEN ${EST1}::uuid ELSE ${EST2}::uuid END
        FROM generate_series(1, 10) g;
      INSERT INTO mesa (id, sucursal_id, zona_id, numero, capacidad)
        SELECT gen_random_uuid(), ${S}, ${ZONA}, g::text, 4 FROM generate_series(1, 20) g;
      INSERT INTO usuario (id, tenant_id, nombre, email)
        SELECT gen_random_uuid(), ${T}, 'Mesero ' || g, 'mesero' || g || '@bench.rest'
        FROM generate_series(1, 5) g;
      INSERT INTO medio_pago (id, sucursal_id, nombre, tipo) VALUES
        (${MEDIO1}, ${S}, 'Efectivo', 'efectivo'),
        (${MEDIO2}, ${S}, 'Tarjeta', 'tarjeta'),
        (${MEDIO3}, ${S}, 'Transferencia', 'transferencia');

      -- 600 pedidos pagados repartidos en 30 días, 3 líneas cada uno
      INSERT INTO pedido (id, sucursal_id, codigo, canal, modalidad, estado,
        hora_programada, pagado_en, mesero_id,
        subtotal_centavos, descuentos_centavos, impuestos_centavos, propina_centavos, recargos_centavos, total_centavos)
      SELECT gen_random_uuid(), ${S}, 'BENCH-' || g, 'web', 'recoger', 'pagado',
        now() - make_interval(days => g % 30), now() - make_interval(days => g % 30),
        (SELECT id FROM usuario WHERE email LIKE 'mesero%@bench.rest' ORDER BY email LIMIT 1 OFFSET g % 5),
        10000, 0, 1600, 500, 0, 12100
      FROM generate_series(1, 600) g;

      INSERT INTO pedido_linea (id, pedido_id, producto_id, nombre_snapshot, precio_snapshot_centavos, cantidad, estado)
      SELECT gen_random_uuid(), p.id, pr.id, pr.nombre, 10000, 1, 'entregada'
      FROM pedido p
      JOIN LATERAL (
        SELECT id, nombre FROM producto WHERE categoria_id = ${CATEGORIA} ORDER BY nombre LIMIT 3
      ) pr ON true
      WHERE p.codigo LIKE 'BENCH-%';

      INSERT INTO pago (id, pedido_id, medio_pago_id, monto_centavos, propina_centavos, estado, aprobado_en)
      SELECT gen_random_uuid(), p.id,
             (ARRAY[${MEDIO1}::uuid, ${MEDIO2}::uuid, ${MEDIO3}::uuid])[1 + ((row_number() OVER ()) % 3)::int],
             12100, 0, 'aprobado', p.pagado_en
      FROM pedido p WHERE p.codigo LIKE 'BENCH-%';

      -- 200 comandas activas (KDS) con sus líneas
      INSERT INTO comanda (id, pedido_id, sucursal_id, estacion_id, numero, estado, enviada_en)
      SELECT gen_random_uuid(), sub.id, ${S},
             CASE WHEN sub.rn % 2 = 0 THEN ${EST1}::uuid ELSE ${EST2}::uuid END,
             sub.rn, 'en_preparacion', now() - make_interval(mins => (sub.rn % 5)::int)
      FROM (SELECT id, row_number() OVER (ORDER BY id) AS rn
            FROM pedido WHERE codigo LIKE 'BENCH-%' LIMIT 200) sub;

      INSERT INTO comanda_linea (id, comanda_id, pedido_linea_id, estado)
      SELECT gen_random_uuid(), c.id, pl.id, 'en_preparacion'
      FROM comanda c JOIN pedido_linea pl ON pl.pedido_id = c.pedido_id
      WHERE c.sucursal_id = ${S};

      -- 150 reservas en los próximos 30 días, sin solapes
      INSERT INTO reserva (id, sucursal_id, codigo, origen, nombre_contacto, fecha_hora, duracion_min, personas, mesa_id, estado)
      SELECT gen_random_uuid(), ${S}, 'BR-' || d || '-' || s, 'web', 'Cliente bench',
             (current_date + d) + make_interval(hours => 12 + s * 2), 90, 2,
             (SELECT id FROM mesa WHERE sucursal_id = ${S} ORDER BY numero LIMIT 1 OFFSET ((d + s) % 20)),
             'confirmada'
      FROM generate_series(0, 29) d, generate_series(1, 5) s;
    `);

    console.log('ANALYZE de las tablas…');
    await client.query(
      'ANALYZE pedido; ANALYZE pedido_linea; ANALYZE pago; ANALYZE comanda; ANALYZE comanda_linea; ANALYZE reserva; ANALYZE producto;',
    );

    console.log('Refrescando agregados…');
    const t0 = Date.now();
    await client.query('SELECT analytics.fn_refrescar_analytics();');
    console.log(`  analytics.fn_refrescar_analytics()           ${Date.now() - t0} ms`);

    console.log('Consultas críticas (EXPLAIN ANALYZE):');
    await medir(
      'KDS: comandas activas por estación',
      `SELECT c.estacion_id, count(*) FROM comanda c
        WHERE c.sucursal_id = ${S} AND c.estado IN ('pendiente','impresa','en_preparacion')
        GROUP BY 1`,
    );
    await medir(
      'Pedidos activos de la sucursal',
      `SELECT count(*) FROM pedido
        WHERE sucursal_id = ${S} AND estado NOT IN ('pagado','cancelado')`,
    );
    await medir(
      'Comandas del día con líneas por estación',
      `SELECT c.estacion_id, count(cl.id) FROM comanda c
        JOIN comanda_linea cl ON cl.comanda_id = c.id
        WHERE c.sucursal_id = ${S} AND c.enviada_en >= current_date
        GROUP BY 1`,
    );
    await medir(
      'Cierre de caja: pagos aprobados del día por medio',
      `SELECT p.medio_pago_id, sum(p.monto_centavos) FROM pago p
        JOIN pedido pe ON pe.id = p.pedido_id
        WHERE pe.sucursal_id = ${S} AND p.estado = 'aprobado' AND p.aprobado_en >= current_date
        GROUP BY 1`,
    );
    await medir(
      'Reservas de hoy',
      `SELECT count(*) FROM reserva
        WHERE sucursal_id = ${S}
          AND fecha_hora >= current_date AND fecha_hora < current_date + interval '1 day'`,
    );
    await medir(
      'Reporte: ventas de 30 días (mv_ventas_diarias)',
      `SELECT sum(total_centavos) FROM analytics.mv_ventas_diarias WHERE sucursal_id = ${S}`,
    );

    await client.query('ROLLBACK');
    console.log('ROLLBACK: los datos sintéticos no quedan en la base.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('El benchmark abortó:', (error as Error).message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

void main();
